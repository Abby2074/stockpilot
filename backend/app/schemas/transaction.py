from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from enum import Enum


class TransactionType(str, Enum):
    IN = "IN"
    OUT = "OUT"
    TRANSFER = "TRANSFER"
    ADJUSTMENT = "ADJUSTMENT"
    COUNT = "COUNT"


class TransactionStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class TransactionCreate(BaseModel):
    type: TransactionType
    product_id: int
    requested_quantity: int
    from_branch_id: Optional[int] = None
    to_branch_id: Optional[int] = None
    notes: Optional[str] = None


class TransactionReject(BaseModel):
    reason: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    type: TransactionType
    product_id: int
    from_branch_id: Optional[int] = None
    to_branch_id: Optional[int] = None
    requested_by: int
    approved_by: Optional[int] = None
    requested_quantity: int
    approved_quantity: Optional[int] = None
    status: TransactionStatus
    notes: Optional[str] = None
    created_at: datetime
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
