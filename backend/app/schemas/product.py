from typing import Optional
from pydantic import BaseModel
from enum import Enum


class StatusEnum(str, Enum):
    active = "active"
    inactive = "inactive"


class ProductCreate(BaseModel):
    sku: str
    name: str
    category: Optional[str] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[StatusEnum] = None


class ProductResponse(BaseModel):
    id: int
    sku: str
    name: str
    category: Optional[str] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None
    status: StatusEnum

    class Config:
        from_attributes = True
