from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class ApiMessage(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str


class EventRead(BaseModel):
    id: UUID
    event_type: str
    payload: dict[str, Any] | None
    actor: str | None
    created_at: datetime


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int