from pydantic import BaseModel, EmailStr
from enum import Enum

class RoleEnum(str, Enum):
    OWNER = "OWNER"
    MANAGER = "MANAGER"
    STOREKEEPER = "STOREKEEPER"
    SALES = "SALES"

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: RoleEnum
    branch_id: int | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: RoleEnum
    branch_id: int | None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
    