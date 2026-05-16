"""Role-based alert dispatcher.

The thesis (Section 3.5) specifies that StockPilot must emit role-appropriate
alerts via in-system notifications and SMS:

    * Owner       — significant stock discrepancies, unapproved movements.
    * Manager     — pending approvals, stock-threshold breaches in their branch.
    * Storekeeper — AI count completion, required actions.
    * Sales       — stock-availability updates.

This module is the single place where alert rows are written. Routes call the
small helper functions below; both the recipient resolution and the SMS-stub
integration live here so the call sites stay readable.
"""

from __future__ import annotations

import logging
import os
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.models import (
    AlertCategory,
    AlertNotification,
    RoleEnum,
    StatusEnum,
    User,
)

logger = logging.getLogger("stockpilot.alerts")

SMS_ENABLED = os.getenv("SMS_ENABLED", "false").lower() == "true"
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "hubtel")  # hubtel | arkesel


def _recipients_by_roles(db: Session, roles: Iterable[RoleEnum]) -> list[User]:
    return (
        db.query(User)
        .filter(User.role.in_(list(roles)), User.status == StatusEnum.ACTIVE)
        .all()
    )


def _dispatch_sms(user: User, message: str) -> None:
    """SMS gateway integration point.

    The thesis (Section 3.5) specifies Hubtel or Arkesel as the gateway. We
    keep this as a logged stub by default; toggle SMS_ENABLED=true and wire
    the real HTTP call here when a paid account is available.
    """
    if not SMS_ENABLED:
        return
    logger.info(
        "[SMS:%s] to=%s body=%s",
        SMS_PROVIDER,
        getattr(user, "phone", user.email),
        message,
    )


def emit(
    db: Session,
    user: User,
    *,
    category: AlertCategory,
    title: str,
    message: str,
    link: str | None = None,
    send_sms: bool = False,
    commit: bool = False,
) -> AlertNotification:
    notification = AlertNotification(
        user_id=user.id,
        role_target=user.role,
        category=category,
        title=title,
        message=message,
        link=link,
        delivery_method="IN_APP+SMS" if send_sms else "IN_APP",
    )
    db.add(notification)
    db.flush()
    if send_sms:
        _dispatch_sms(user, f"{title}: {message}")
    if commit:
        db.commit()
        db.refresh(notification)
    return notification


def fanout(
    db: Session,
    roles: Iterable[RoleEnum],
    *,
    category: AlertCategory,
    title: str,
    message: str,
    link: str | None = None,
    send_sms: bool = False,
    commit: bool = False,
) -> list[AlertNotification]:
    out: list[AlertNotification] = []
    for user in _recipients_by_roles(db, roles):
        out.append(
            emit(
                db,
                user,
                category=category,
                title=title,
                message=message,
                link=link,
                send_sms=send_sms,
            )
        )
    if commit:
        db.commit()
    return out


def pending_approval(db: Session, tx_id: int, summary: str) -> None:
    fanout(
        db,
        roles=[RoleEnum.OWNER, RoleEnum.MANAGER],
        category=AlertCategory.PENDING_APPROVAL,
        title="Pending approval",
        message=summary,
        link=f"/transactions?tx={tx_id}",
        send_sms=True,
    )


def approval_decided(db: Session, initiator: User, tx_id: int, outcome: str) -> None:
    emit(
        db,
        initiator,
        category=AlertCategory.APPROVAL_DECIDED,
        title=f"Transaction {outcome.lower()}",
        message=f"Your transaction #{tx_id} was {outcome.lower()}.",
        link=f"/transactions?tx={tx_id}",
    )


def ai_count_complete(db: Session, session_id: int, summary: str) -> None:
    fanout(
        db,
        roles=[RoleEnum.OWNER, RoleEnum.MANAGER],
        category=AlertCategory.AI_COUNT_COMPLETE,
        title="AI count ready for review",
        message=summary,
        link=f"/ai-count?session={session_id}",
        send_sms=True,
    )


def low_stock(db: Session, product_name: str, level: int, threshold: int) -> None:
    fanout(
        db,
        roles=[RoleEnum.OWNER, RoleEnum.MANAGER, RoleEnum.STOREKEEPER],
        category=AlertCategory.LOW_STOCK,
        title="Low stock",
        message=f"{product_name} is at {level} (threshold {threshold}).",
        link="/dashboard",
    )


def discrepancy(db: Session, product_name: str, expected: int, observed: int) -> None:
    fanout(
        db,
        roles=[RoleEnum.OWNER],
        category=AlertCategory.DISCREPANCY,
        title="Stock discrepancy",
        message=(
            f"{product_name}: expected {expected}, observed {observed} "
            f"(delta {observed - expected})."
        ),
        link="/dashboard",
        send_sms=True,
    )
