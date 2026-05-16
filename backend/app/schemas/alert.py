from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.models import AlertCategory, RoleEnum


class AlertResponse(BaseModel):
    id: int
    category: AlertCategory
    role_target: Optional[RoleEnum] = None
    title: str
    message: str
    link: Optional[str] = None
    delivery_method: str
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AlertCountResponse(BaseModel):
    unread: int
    total: int
