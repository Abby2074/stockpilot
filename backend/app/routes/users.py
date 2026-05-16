"""User-management router — Owner-only endpoints to list and create accounts.

The public POST /auth/register endpoint remains available as a bootstrap path
for the very first Owner, but in deployed use the Owner manages all subsequent
user accounts through this protected router.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, AuditLog
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
