"""Stock transactions router — initiate, approve, reject, list.

Encodes the core governance rule of StockPilot:
    * Storekeeper / Owner / Manager may initiate a transaction.
    * Only Manager or Owner may approve / reject.
    * Non-Owner users may NOT approve their own initiations (separation of duties).
    * Owner may approve own initiations (apex authority), still audited.
    * Approval mutates the linked stock_level row.
    * Every state transition writes an AuditLog row.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    StockTransaction,
    StockLevel,
    Product,
    User,
    AuditLog,
    TransactionStatus,
    TransactionType,
)
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionReject,
)
from app.deps import get_current_user, require_roles
from app.services import alerts as alert_service

router = APIRouter(prefix="/transactions", tags=["Stock transactions"])


def _audit(db: Session, user: User, entity_id: int, action: str, before=None, after=None):
    db.add(
        AuditLog(
            user_id=user.id,
            entity_type="StockTransaction",
            entity_id=entity_id,
            action=action,
            before_data=before,
            after_data=after,
        )
    )


def _tx_to_dict(t: StockTransaction) -> dict:
    return {
        "id": t.id,
        "type": t.type.value if t.type else None,
        "product_id": t.product_id,
        "from_branch_id": t.from_branch_id,
        "to_branch_id": t.to_branch_id,
        "requested_by": t.requested_by,
        "approved_by": t.approved_by,
        "requested_quantity": t.requested_quantity,
        "approved_quantity": t.approved_quantity,
        "status": t.status.value if t.status else None,
    }


def _apply_to_stock_levels(db: Session, tx: StockTransaction):
    """Mutate the relevant StockLevel rows when a transaction is approved.

    IN          -> add to to_branch
    OUT / SALE  -> subtract from from_branch
    TRANSFER    -> subtract from from_branch, add to to_branch
    ADJUSTMENT  -> set to_branch quantity to requested_quantity (absolute)
    COUNT       -> same as ADJUSTMENT (AI-derived absolute value)
    """
    qty = tx.approved_quantity if tx.approved_quantity is not None else tx.requested_quantity

    def _get_or_create_level(branch_id: int) -> StockLevel:
        level = (
            db.query(StockLevel)
            .filter(
                StockLevel.product_id == tx.product_id,
                StockLevel.branch_id == branch_id,
            )
            .first()
        )
        if level is None:
            level = StockLevel(product_id=tx.product_id, branch_id=branch_id, quantity_on_hand=0)
            db.add(level)
        return level

    if tx.type == TransactionType.IN and tx.to_branch_id:
        level = _get_or_create_level(tx.to_branch_id)
        level.quantity_on_hand += qty
    elif tx.type == TransactionType.OUT and tx.from_branch_id:
        level = _get_or_create_level(tx.from_branch_id)
        level.quantity_on_hand -= qty
    elif tx.type == TransactionType.TRANSFER and tx.from_branch_id and tx.to_branch_id:
        _get_or_create_level(tx.from_branch_id).quantity_on_hand -= qty
        _get_or_create_level(tx.to_branch_id).quantity_on_hand += qty
    elif tx.type in (TransactionType.ADJUSTMENT, TransactionType.COUNT):
        branch_id = tx.to_branch_id or tx.from_branch_id
        if branch_id:
            level = _get_or_create_level(branch_id)
            level.quantity_on_hand = qty


@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(StockTransaction).order_by(StockTransaction.id.desc()).all()


@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("OWNER", "MANAGER", "STOREKEEPER")),
):
    # Sanity-check the product exists
    if not db.query(Product).filter(Product.id == payload.product_id).first():
        raise HTTPException(404, "Product not found")
    if payload.requested_quantity <= 0:
        raise HTTPException(400, "requested_quantity must be positive")

    tx = StockTransaction(
        type=payload.type,
        product_id=payload.product_id,
        from_branch_id=payload.from_branch_id,
        to_branch_id=payload.to_branch_id,
        requested_by=user.id,
        requested_quantity=payload.requested_quantity,
        notes=payload.notes,
        status=TransactionStatus.PENDING,
    )
    db.add(tx)
    db.flush()
    _audit(db, user, tx.id, "INITIATE", after=_tx_to_dict(tx))
    alert_service.pending_approval(
        db,
        tx_id=tx.id,
        summary=f"{payload.type.value} of {payload.requested_quantity} units awaiting approval.",
    )
    db.commit()
    db.refresh(tx)
    return tx


@router.post("/{tx_id}/approve", response_model=TransactionResponse)
def approve_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("OWNER", "MANAGER")),
):
    tx = db.query(StockTransaction).filter(StockTransaction.id == tx_id).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    if tx.status != TransactionStatus.PENDING:
        raise HTTPException(400, f"Cannot approve a transaction with status {tx.status.value}")

    # Separation of duties — non-Owner cannot approve own initiation
    is_owner = str(user.role.value if hasattr(user.role, "value") else user.role).upper() == "OWNER"
    if not is_owner and tx.requested_by == user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Separation of duties: you cannot approve a transaction you initiated. "
            "Only the Owner may bypass this restriction (and the action will still be audited).",
        )

    before = _tx_to_dict(tx)
    tx.status = TransactionStatus.APPROVED
    tx.approved_by = user.id
    tx.approved_at = datetime.utcnow()
    tx.approved_quantity = tx.requested_quantity
    _apply_to_stock_levels(db, tx)
    _audit(db, user, tx.id, "APPROVE", before=before, after=_tx_to_dict(tx))
    db.commit()
    db.refresh(tx)
    return tx


@router.post("/{tx_id}/reject", response_model=TransactionResponse)
def reject_transaction(
    tx_id: int,
    payload: TransactionReject = TransactionReject(),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("OWNER", "MANAGER")),
):
    tx = db.query(StockTransaction).filter(StockTransaction.id == tx_id).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    if tx.status != TransactionStatus.PENDING:
        raise HTTPException(400, f"Cannot reject a transaction with status {tx.status.value}")

    before = _tx_to_dict(tx)
    tx.status = TransactionStatus.REJECTED
    tx.approved_by = user.id
    tx.approved_at = datetime.utcnow()
    if payload.reason:
        tx.notes = (tx.notes or "") + f"\nRejection: {payload.reason}"
    _audit(db, user, tx.id, "REJECT", before=before, after=_tx_to_dict(tx))
    db.commit()
    db.refresh(tx)
    return tx
