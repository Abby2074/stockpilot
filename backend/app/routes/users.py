"""User-management router — Owner-only endpoints to list and create accounts.

The public POST /auth/register endpoint remains available as a bootstrap path
for the very first Owner, but in deployed use the Owner manages all subsequent
user accounts through this protected router.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, AuditLog, StatusEnum
from app.schemas.user import UserCreate, UserResponse
from app.deps import require_roles
from app.routes.auth import hash_password

router = APIRouter(prefix="/users", tags=["Users"])


def _user_to_dict(u: User) -> dict:
    role = u.role.value if hasattr(u.role, "value") else u.role
    status_v = u.status.value if hasattr(u.status, "value") else u.status
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": role,
        "branch_id": u.branch_id,
        "status": status_v,
    }


@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _owner: User = Depends(require_roles("OWNER")),
):
    return db.query(User).order_by(User.id.asc()).all()


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_roles("OWNER")),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "A user with that email already exists")
    new_user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        branch_id=payload.branch_id,
    )
    db.add(new_user)
    db.flush()
    db.add(
        AuditLog(
            user_id=owner.id,
            entity_type="User",
            entity_id=new_user.id,
            action="CREATE",
            before_data=None,
            after_data=_user_to_dict(new_user),
        )
    )
    db.commit()
    db.refresh(new_user)
    return new_user


@router.delete("/{user_id}", response_model=UserResponse)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    owner: User = Depends(require_roles("OWNER")),
):
    """Soft-delete (deactivate) a user. Sets status=INACTIVE.

    We never hard-delete because AuditLog rows reference user_id and we want
    the historical record preserved. Reactivation is via POST /users/{id}/activate.
    """
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if target.id == owner.id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "You cannot deactivate your own account.",
        )
    if target.status == StatusEnum.INACTIVE:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"User {target.email} is already inactive.",
        )
    before = _user_to_dict(target)
    target.status = StatusEnum.INACTIVE
    db.add(
        AuditLog(
            user_id=owner.id,
            entity_type="User",
            entity_id=target.id,
            action="DEACTIVATE",
            before_data=before,
            after_data=_user_to_dict(target),
        )
    )
    db.commit()
    db.refresh(target)
    return target


@router.post("/{user_id}/activate", response_model=UserResponse)
def reactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    owner: User = Depends(require_roles("OWNER")),
):
    """Reactivate a previously deactivated user."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if target.status == StatusEnum.ACTIVE:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"User {target.email} is already active.",
        )
    before = _user_to_dict(target)
    target.status = StatusEnum.ACTIVE
    db.add(
        AuditLog(
            user_id=owner.id,
            entity_type="User",
            entity_id=target.id,
            action="REACTIVATE",
            before_data=before,
            after_data=_user_to_dict(target),
        )
    )
    db.commit()
    db.refresh(target)
    return target
