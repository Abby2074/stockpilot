"""Alerts router — list, mark read, count unread, dispatch test alerts.

Alerts are role-targeted and persisted in the alert_notifications table.
Each authenticated user only sees their own row(s); marking-as-read is
idempotent. The optional /alerts/test endpoint exists to make demo
recordings reproducible.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.models import AlertNotification, User
from app.schemas.alert import AlertCountResponse, AlertResponse
from app.services import alerts as alert_service
from app.models.models import AlertCategory

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertResponse])
def list_alerts(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(AlertNotification).filter(AlertNotification.user_id == user.id)
    if unread_only:
        q = q.filter(AlertNotification.read_at.is_(None))
    return q.order_by(AlertNotification.created_at.desc()).limit(limit).all()


@router.get("/count", response_model=AlertCountResponse)
def count_alerts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(AlertNotification).filter(AlertNotification.user_id == user.id)
    total = q.count()
    unread = q.filter(AlertNotification.read_at.is_(None)).count()
    return AlertCountResponse(total=total, unread=unread)


@router.post("/{alert_id}/read", response_model=AlertResponse)
def mark_read(
    alert_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    alert = (
        db.query(AlertNotification)
        .filter(AlertNotification.id == alert_id, AlertNotification.user_id == user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alert not found")
    if alert.read_at is None:
        alert.read_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    updated = (
        db.query(AlertNotification)
        .filter(AlertNotification.user_id == user.id, AlertNotification.read_at.is_(None))
        .update({AlertNotification.read_at: now}, synchronize_session=False)
    )
    db.commit()
    return {"marked_read": updated}


@router.post("/test", response_model=AlertResponse)
def emit_test_alert(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Emit a self-targeted test alert. Useful for demos and bell-icon smoke tests."""
    alert = alert_service.emit(
        db,
        user,
        category=AlertCategory.SYSTEM,
        title="Test alert",
        message=f"This is a test alert issued at {datetime.utcnow().isoformat()}Z.",
        commit=True,
    )
    return alert
