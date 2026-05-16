"""Audit log router — Owner-only access to the immutable audit trail.

The audit log is written automatically by guarded routes (products,
transactions, users). This endpoint exposes it for the Owner UI.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models.models import AuditLog, User

router = APIRouter(prefix="/audit", tags=["Audit log"])


@router.get("", response_model=List[dict])
def list_audit_logs(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    action: Optional[str] = Query(None, description="Filter by action (CREATE/UPDATE/APPROVE/...)"),
    user_id: Optional[int] = Query(None, description="Filter by acting user id"),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("OWNER")),
):
    q = db.query(AuditLog, User).outerjoin(User, AuditLog.user_id == User.id)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if action:
        q = q.filter(AuditLog.action == action)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    rows = q.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": user.name if user else None,
            "user_email": user.email if user else None,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action,
            "before_data": log.before_data,
            "after_data": log.after_data,
            "created_at": log.created_at,
        }
        for log, user in rows
    ]
