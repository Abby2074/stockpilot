"""Auth + RBAC dependencies.

Used as FastAPI Depends() in route signatures to:
  * decode and validate the JWT
  * look up the corresponding User
  * gate access by role

Example:
    @router.post("/products", dependencies=[Depends(require_roles("OWNER", "MANAGER"))])
    def create_product(...): ...
"""

import os
from typing import Iterable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, RoleEnum

SECRET_KEY = os.getenv("SECRET_KEY", "stockpilot-secret-key")
ALGORITHM = "HS256"

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decode JWT and return the authenticated User row, or raise 401."""
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token payload")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return user


def require_roles(*roles: str):
    """Dependency factory that enforces RBAC.

    Accepts role names as strings ("OWNER", "MANAGER", "STOREKEEPER", "SALES").
    Returns the authenticated user if their role is in the allowed set.
    """
    allowed = {r.upper() for r in roles}

    def _checker(user: User = Depends(get_current_user)) -> User:
        role_value = user.role.value if isinstance(user.role, RoleEnum) else str(user.role)
        if role_value.upper() not in allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Access denied: requires one of {sorted(allowed)}",
            )
        return user

    return _checker
