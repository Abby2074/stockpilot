from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BranchCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None


class BranchResponse(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
