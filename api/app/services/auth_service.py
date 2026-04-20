from dataclasses import dataclass
from uuid import uuid4

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

from app.core.config import get_settings

settings = get_settings()


# ── OTP dataclasses ──


@dataclass
class OtpStartResult:
    session_info: str
    provider: str


@dataclass
class OtpVerifyResult:
    firebase_uid: str
    id_token: str


def start_otp(phone_number: str) -> OtpStartResult:
    """Initiate OTP flow. Scaffolded — returns a test session in dev mode."""
    if settings.allow_test_otp:
        return OtpStartResult(
            session_info=f"test_session_{uuid4().hex[:12]}",
            provider="test",
        )
    # TODO: integrate with Firebase Phone Auth REST API
    raise ValueError("OTP flow not configured. Set ALLOW_TEST_OTP=true for development.")


def verify_otp(session_info: str, code: str) -> OtpVerifyResult:
    """Verify OTP code. Scaffolded — accepts any code in dev/test mode."""
    if settings.allow_test_otp and session_info.startswith("test_session_"):
        return OtpVerifyResult(
            firebase_uid=f"test_{uuid4().hex[:12]}",
            id_token=f"test_{uuid4().hex}",
        )
    # TODO: integrate with Firebase Phone Auth REST API
    raise ValueError("OTP verification not configured.")

_firebase_app: firebase_admin.App | None = None


def _init_firebase() -> firebase_admin.App | None:
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    if not settings.firebase_project_id:
        return None

    try:
        if settings.firebase_credentials_path:
            cred = credentials.Certificate(settings.firebase_credentials_path)
        else:
            cred = credentials.ApplicationDefault()
        _firebase_app = firebase_admin.initialize_app(
            cred, {"projectId": settings.firebase_project_id}
        )
        return _firebase_app
    except Exception:
        return None


@dataclass
class VerifiedUser:
    firebase_uid: str
    phone: str | None
    email: str | None


def verify_firebase_token(id_token: str) -> VerifiedUser:
    """Verify a Firebase ID token and return the decoded user info."""
    app = _init_firebase()

    # Development mode: accept test tokens when ALLOW_TEST_OTP is true
    if app is None and settings.allow_test_otp and id_token.startswith("test_"):
        stable_suffix = id_token[5:] or "dev"
        stable_suffix = stable_suffix[:48]
        return VerifiedUser(
            firebase_uid=f"test_{stable_suffix}",
            phone="+919999999999",
            email=None,
        )

    if app is None:
        raise ValueError("Firebase not configured. Set FIREBASE_PROJECT_ID and credentials.")

    try:
        decoded = firebase_auth.verify_id_token(id_token, app=app)
        return VerifiedUser(
            firebase_uid=decoded["uid"],
            phone=decoded.get("phone_number"),
            email=decoded.get("email"),
        )
    except firebase_auth.InvalidIdTokenError:
        raise ValueError("Invalid or expired Firebase token")
    except firebase_auth.ExpiredIdTokenError:
        raise ValueError("Firebase token has expired")
    except Exception as exc:
        raise ValueError(f"Token verification failed: {exc}")
