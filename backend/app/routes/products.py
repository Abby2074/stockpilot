"""Products router — full CRUD with role-based enforcement and audit logging."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Product, User, AuditLog, StatusEnum
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.deps import get_current_user, require_roles

router = APIRouter(prefix="/products", tags=["Products"])


def _audit(db: Session, user: User, entity_id: int, action: str, before=None, after=None):
    """Write an audit log entry. Every guarded action calls this."""
    log = AuditLog(
        user_id=user.id,
        entity_type="Product",
        entity_id=entity_id,
        action=action,
        before_data=before,
        after_data=after,
    )
    db.add(log)


def _product_to_dict(p: Product) -> dict:
    return {
        "id": p.id,
        "sku": p.sku,
        "name": p.name,
        "category": p.category,
        "unit": p.unit,
        "image_url": p.image_url,
        "status": p.status.value if p.status else None,
    }


@router.get("", response_model=List[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),  # any authenticated role
):
    return db.query(Product).order_by(Product.id.desc()).all()


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("OWNER", "MANAGER")),
):
    if db.query(Product).filter(Product.sku == payload.sku).first():
        raise HTTPException(400, "A product with that SKU already exists")
    product = Product(**payload.dict())
    db.add(product)
    db.flush()  # assign id before audit
    _audit(db, user, product.id, "CREATE", before=None, after=_product_to_dict(product))
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("OWNER", "MANAGER")),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    before = _product_to_dict(product)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(product, field, value)
    _audit(db, user, product.id, "UPDATE", before=before, after=_product_to_dict(product))
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("OWNER")),
):
    """Soft-delete via status flag. Only Owner may deactivate."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    before = _product_to_dict(product)
    product.status = StatusEnum.INACTIVE
    _audit(db, user, product.id, "DEACTIVATE", before=before, after=_product_to_dict(product))
    db.commit()
    return None
