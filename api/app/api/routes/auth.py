from fastapi import APIRouter, HTTPException

from app.schemas.auth import OtpStartRequest, OtpStartResponse, OtpVerifyRequest, OtpVerifyResponse
from app.services.auth_service import start_otp, verify_otp

router = APIRouter(prefix="/auth")


@router.post("/otp/start", response_model=OtpStartResponse)
def otp_start(payload: OtpStartRequest) -> OtpStartResponse:
    result = start_otp(payload.phone_number)
    return OtpStartResponse(session_info=result.session_info, provider=result.provider)


@router.post("/otp/verify", response_model=OtpVerifyResponse)
def otp_verify(payload: OtpVerifyRequest) -> OtpVerifyResponse:
    try:
        result = verify_otp(payload.session_info, payload.code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return OtpVerifyResponse(firebase_uid=result.firebase_uid, id_token=result.id_token)
