import hmac
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User, UserRole
from app.services.auth_service import VerifiedUser, verify_firebase_token

settings = get_settings()


def _extract_bearer_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header[7:]


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> User | None:
    """Returns the authenticated user or None if no valid token is provided."""
    token = _extract_bearer_token(request)
    if not token:
        return None

    try:
        verified = verify_firebase_token(token)
    except ValueError:
        return None

    user = db.scalar(select(User).where(User.firebase_uid == verified.firebase_uid))
    if user is None:
        user = User(
            firebase_uid=verified.firebase_uid,
            phone=verified.phone,
            email=verified.email,
            role=UserRole.CITIZEN.value,
        )
        db.add(user)
        db.flush()

    return user


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Requires a valid authenticated user. Raises 401 if not authenticated."""
    token = _extract_bearer_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        verified = verify_firebase_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.scalar(select(User).where(User.firebase_uid == verified.firebase_uid))
    if user is None:
        user = User(
            firebase_uid=verified.firebase_uid,
            phone=verified.phone,
            email=verified.email,
            role=UserRole.CITIZEN.value,
        )
        db.add(user)
        db.flush()

    return user


def require_admin(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Requires admin role. Supports both Bearer token auth and API key auth."""
    # Check API key first (for scripts/automation)
    api_key = request.headers.get("X-Admin-Api-Key")
    if api_key and settings.admin_api_key and hmac.compare_digest(api_key, settings.admin_api_key):
        admin_user = db.scalar(select(User).where(User.role == UserRole.ADMIN.value))
        if not admin_user:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="No admin user exists. Create one via database seed first.",
            )
        return admin_user

    # Fall back to Bearer token auth
    user = get_current_user(request=request, db=db)
    if user.role not in {UserRole.ADMIN.value, UserRole.MODERATOR.value}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
