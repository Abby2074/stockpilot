from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Float, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class RoleEnum(str, enum.Enum):
    OWNER = "OWNER"
    MANAGER = "MANAGER"
    STOREKEEPER = "STOREKEEPER"
    SALES = "SALES"

class StatusEnum(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class TransactionType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"
    TRANSFER = "TRANSFER"
    ADJUSTMENT = "ADJUSTMENT"
    COUNT = "COUNT"

class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String)
    city = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    users = relationship("User", back_populates="branch")
    locations = relationship("Location", back_populates="branch")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    status = Column(Enum(StatusEnum), default=StatusEnum.ACTIVE)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    branch = relationship("Branch", back_populates="users")

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    name = Column(String, nullable=False)
    description = Column(String)

    branch = relationship("Branch", back_populates="locations")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String)
    unit = Column(String)
    image_url = Column(String)
    status = Column(Enum(StatusEnum), default=StatusEnum.ACTIVE)

class StockLevel(Base):
    __tablename__ = "stock_levels"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    branch_id = Column(Integer, ForeignKey("branches.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    quantity_on_hand = Column(Integer, default=0)
    last_updated = Column(DateTime, server_default=func.now())

class StockTransaction(Base):
    __tablename__ = "stock_transactions"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(TransactionType), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"))
    from_branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    to_branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    requested_by = Column(Integer, ForeignKey("users.id"))
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    requested_quantity = Column(Integer, nullable=False)
    approved_quantity = Column(Integer, nullable=True)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    approved_at = Column(DateTime, nullable=True)

class AICountSession(Base):
    __tablename__ = "ai_count_sessions"
    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    initiated_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, server_default=func.now())
    reviewed_at = Column(DateTime, nullable=True)

    detections = relationship("AIDetection", back_populates="session")

class AIDetection(Base):
    __tablename__ = "ai_detections"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("ai_count_sessions.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    count = Column(Integer)
    confidence_avg = Column(Float)
    image_url = Column(String)

    session = relationship("AICountSession", back_populates="detections")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    entity_type = Column(String)
    entity_id = Column(Integer)
    action = Column(String)
    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class AlertCategory(str, enum.Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVAL_DECIDED = "APPROVAL_DECIDED"
    AI_COUNT_COMPLETE = "AI_COUNT_COMPLETE"
    LOW_STOCK = "LOW_STOCK"
    DISCREPANCY = "DISCREPANCY"
    STOCK_AVAILABILITY = "STOCK_AVAILABILITY"
    SYSTEM = "SYSTEM"


class AlertNotification(Base):
    __tablename__ = "alert_notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_target = Column(Enum(RoleEnum), nullable=True)
    category = Column(Enum(AlertCategory), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    link = Column(String, nullable=True)
    delivery_method = Column(String, default="IN_APP")
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())