from pydantic import BaseModel, Field


class OtpStartRequest(BaseModel):
    phone_number: str = Field(min_length=10, max_length=20)


class OtpStartResponse(BaseModel):
    session_info: str
    provider: str


class OtpVerifyRequest(BaseModel):
    session_info: str
    code: str = Field(min_length=4, max_length=8)


class OtpVerifyResponse(BaseModel):
    firebase_uid: str
    id_token: str