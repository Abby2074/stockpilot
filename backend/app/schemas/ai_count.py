from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class AIDetectionIn(BaseModel):
    product: str                       # the AI's raw class label (e.g. "iron rod", "person")
    product_id: Optional[int] = None   # frontend's best guess after fuzzy-matching the catalogue
    count: int
    confidence: float


class AICountSessionCreate(BaseModel):
    detections: List[AIDetectionIn]
    branch_id: Optional[int] = None
    location_id: Optional[int] = None
    notes: Optional[str] = None
    model: Optional[str] = None        # e.g. "google/gemini-flash-latest" — informational only


class AIDetectionOut(BaseModel):
    id: int
    product_id: Optional[int] = None
    count: int
    confidence_avg: float
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class AICountSessionOut(BaseModel):
    id: int
    branch_id: Optional[int] = None
    location_id: Optional[int] = None
    initiated_by: int
    status: str
    created_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    detections: List[AIDetectionOut] = []

    class Config:
        from_attributes = True
