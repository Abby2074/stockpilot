"""Branch management — list (any auth user) and create (Owner only)."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models.models import AuditLog, Branch, User
from app.schemas.branch import BranchCreate, BranchResponse

router = APIRouter(prefix="/branches", tags=["Branches"])


def _branch_to_dict(b: Branch) -> dict:
    return {"id": b.id, "name": b.name, "address": b.address, "city": b.city}


@router.get("", response_model=List[BranchResponse])
def list_branches(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Every authenticated user can list branches (needed for dropdowns).
    Only the Owner can create or modify them.
    """
    return db.query(Branch).order_by(Branch.id.asc()).all()


@router.post(
    "",
    response_model=BranchResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_branch(
    payload: BranchCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_roles("OWNER")),
):
    if db.query(Branch).filter(Branch.name == payload.name).first():
        raise HTTPException(400, "A branch with that name already exists")
    branch = Branch(name=payload.name, address=payload.address, city=payload.city)
    db.add(branch)
    db.flush()
    db.add(
        AuditLog(
            user_id=owner.id,
            entity_type="Branch",
            entity_id=branch.id,
            action="CREATE",
            before_data=None,
            after_data=_branch_to_dict(branch),
        )
    )
    db.commit()
    db.refresh(branch)
    return branch
