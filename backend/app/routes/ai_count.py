"""AI Count session router — backend wiring for §4.8 of the thesis.

Flow:
  1. Storekeeper (or anyone with create-tx permission) submits a session via
     POST /ai-count-sessions with the per-class detections returned by the AI
     microservice. The session is recorded as PENDING and an alert is
     dispatched to all Owners + Managers.
  2. A Manager or Owner reviews and either approves or rejects via
     POST /ai-count-sessions/{id}/approve or /reject.
     - Approval: for every detection that has a resolved product_id, a
       StockTransaction(type=COUNT) is created with the AI-derived absolute
       quantity, and the corresponding StockLevel is updated. Each transaction
       writes its own AuditLog row; an additional AuditLog row records the
       session-level APPROVE action.
     - Rejection: the session moves to REJECTED, an AuditLog row is written,
       and the initiator is alerted.

Separation of duties: a non-Owner cannot approve a session they initiated.
The Owner may approve their own (apex authority), and the action is still
audited.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models.models import (
    AICountSession,
    AIDetection,
    AlertCategory,
    AuditLog,
    Product,
    StockLevel,
    StockTransaction,
    TransactionStatus,
    TransactionType,
    User,
)
from app.schemas.ai_count import (
    AICountSessionCreate,
    AICountSessionOut,
)
from app.services import alerts as alert_service

router = APIRouter(prefix="/ai-count-sessions", tags=["AI Count Sessions"])


def _session_to_dict(s: AICountSession) -> dict:
    return {
        "id": s.id,
        "branch_id": s.branch_id,
        "location_id": s.location_id,
        "initiated_by": s.initiated_by,
        "status": s.status,
    }


def _audit(db: Session, user: User, entity_id: int, action: str, before=None, after=None):
    db.add(
        AuditLog(
            user_id=user.id,
            entity_type="AICountSession",
            entity_id=entity_id,
            action=action,
            before_data=before,
            after_data=after,
        )
    )


@router.get("", response_model=List[AICountSessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(AICountSession).order_by(AICountSession.id.desc()).all()


@router.get("/{session_id}", response_model=AICountSessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    s = db.query(AICountSession).filter(AICountSession.id == session_id).first()
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    return s


@router.post(
    "",
    response_model=AICountSessionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    payload: AICountSessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("OWNER", "MANAGER", "STOREKEEPER")),
):
    if not payload.detections:
        raise HTTPException(400, "detections must not be empty")

    branch_id = payload.branch_id or user.branch_id
    session = AICountSession(
        branch_id=branch_id,
        location_id=payload.location_id,
        initiated_by=user.id,
        status="PENDING",
    )
    db.add(session)
    db.flush()

    matched = 0
    unmatched = 0
    for d in payload.detections:
        # If frontend resolved to a product_id, verify it exists. If not, store the row
        # with product_id=NULL so the row is still auditable but not applied to stock.
        pid = None
        if d.product_id is not None:
            if db.query(Product).filter(Product.id == d.product_id).first():
                pid = d.product_id
                matched += 1
            else:
                unmatched += 1
        else:
            unmatched += 1
        det = AIDetection(
            session_id=session.id,
            product_id=pid,
            count=max(0, int(d.count)),
            confidence_avg=float(d.confidence),
        )
        db.add(det)

    _audit(
        db,
        user,
        session.id,
        "INITIATE",
        after={
            **_session_to_dict(session),
            "matched_detections": matched,
            "unmatched_detections": unmatched,
            "model": payload.model,
        },
    )

    alert_service.ai_count_complete(
        db,
        session_id=session.id,
        summary=(
            f"AI count session #{session.id} ready for review · "
            f"{matched} matched, {unmatched} unmatched detections."
        ),
    )

    db.commit()
    db.refresh(session)
    return session


def _apply_session_to_stock(db: Session, session: AICountSession, approver: User):
    """For each detection on this session that has a resolved product_id,
    create an approved StockTransaction of type COUNT and update the matching
    StockLevel to the AI-derived absolute quantity."""
    target_branch = session.branch_id or approver.branch_id
    for det in session.detections:
        if det.product_id is None:
            continue
        tx = StockTransaction(
            type=TransactionType.COUNT,
            product_id=det.product_id,
            from_branch_id=None,
            to_branch_id=target_branch,
            requested_by=session.initiated_by,
            approved_by=approver.id,
            requested_quantity=det.count,
            approved_quantity=det.count,
            status=TransactionStatus.APPROVED,
            approved_at=datetime.utcnow(),
            notes=f"From AI Count session #{session.id} (conf {int(det.confidence_avg * 100)}%)",
        )
        db.add(tx)
        db.flush()
        # Update stock level (absolute set, mirroring the apply logic in transactions.py)
        if target_branch:
            level = (
                db.query(StockLevel)
                .filter(
                    StockLevel.product_id == det.product_id,
                    StockLevel.branch_id == target_branch,
                )
                .first()
            )
            if level is None:
                level = StockLevel(
                    product_id=det.product_id,
                    branch_id=target_branch,
                    quantity_on_hand=0,
                )
                db.add(level)
            level.quantity_on_hand = det.count
        db.add(
            AuditLog(
                user_id=approver.id,
                entity_type="StockTransaction",
                entity_id=tx.id,
                action="APPROVE",
                before_data=None,
                after_data={
                    "type": "COUNT",
                    "product_id": det.product_id,
                    "approved_quantity": det.count,
                    "source": f"AICountSession#{session.id}",
                },
            )
        )


@router.post("/{session_id}/approve", response_model=AICountSessionOut)
def approve_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("OWNER", "MANAGER")),
):
    s = db.query(AICountSession).filter(AICountSession.id == session_id).first()
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    if s.status != "PENDING":
        raise HTTPException(400, f"Cannot approve session with status {s.status}")

    is_owner = str(user.role.value if hasattr(user.role, "value") else user.role).upper() == "OWNER"
    if not is_owner and s.initiated_by == user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Separation of duties: you cannot approve an AI Count session you initiated. "
            "Only the Owner may bypass this restriction (action will still be audited).",
        )

    before = _session_to_dict(s)
    s.status = "APPROVED"
    s.reviewed_at = datetime.utcnow()
    _apply_session_to_stock(db, s, user)
    _audit(db, user, s.id, "APPROVE", before=before, after=_session_to_dict(s))

    # Alert the initiator
    initiator = db.query(User).filter(User.id == s.initiated_by).first()
    if initiator:
        alert_service.emit(
            db,
            initiator,
            category=AlertCategory.APPROVAL_DECIDED,
            title="AI Count approved",
            message=f"Your AI count session #{s.id} was approved and applied to stock levels.",
            link=f"/ai-count?session={s.id}",
        )

    db.commit()
    db.refresh(s)
    return s


@router.post("/{session_id}/reject", response_model=AICountSessionOut)
def reject_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("OWNER", "MANAGER")),
):
    s = db.query(AICountSession).filter(AICountSession.id == session_id).first()
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    if s.status != "PENDING":
        raise HTTPException(400, f"Cannot reject session with status {s.status}")

    before = _session_to_dict(s)
    s.status = "REJECTED"
    s.reviewed_at = datetime.utcnow()
    _audit(db, user, s.id, "REJECT", before=before, after=_session_to_dict(s))

    initiator = db.query(User).filter(User.id == s.initiated_by).first()
    if initiator:
        alert_service.emit(
            db,
            initiator,
            category=AlertCategory.APPROVAL_DECIDED,
            title="AI Count rejected",
            message=f"Your AI count session #{s.id} was rejected. No stock levels were changed.",
            link=f"/ai-count?session={s.id}",
        )

    db.commit()
    db.refresh(s)
    return s
