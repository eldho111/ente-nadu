"""Schemas for elected representative accountability features."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import RepresentativeRole
from app.schemas.common import PaginationMeta


class RepresentativeBrief(BaseModel):
    id: UUID
    name: str
    name_ml: str | None = None
    role: str
    party: str | None = None
    photo_url: str | None = None


class RepresentativeDetail(BaseModel):
    id: UUID
    name: str
    name_ml: str | None = None
    role: str
    constituency_name: str
    constituency_name_ml: str | None = None
    district: str | None = None
    party: str | None = None
    photo_url: str | None = None
    email: str | None = None
    phone: str | None = None
    twitter_handle: str | None = None
    active: bool


class LeaderboardEntry(BaseModel):
    representative_id: UUID
    name: str
    name_ml: str | None = None
    role: str
    constituency_name: str
    constituency_name_ml: str | None = None
    district: str | None = None
    party: str | None = None
    photo_url: str | None = None
    open_issues: int = 0
    total_issues: int = 0
    resolved_issues: int = 0
    resolution_rate: float = 0.0
    performance_tier: str = "average"  # "good", "average", "poor"


class LeaderboardResponse(BaseModel):
    items: list[LeaderboardEntry]
    pagination: PaginationMeta
    generated_at: datetime


class RepresentativeListResponse(BaseModel):
    items: list[RepresentativeDetail]
    pagination: PaginationMeta


class RepresentativeImportItem(BaseModel):
    name: str
    name_ml: str | None = None
    role: RepresentativeRole
    constituency_name: str
    constituency_name_ml: str | None = None
    district: str | None = None
    party: str | None = None
    photo_url: str | None = None
    email: str | None = None
    phone: str | None = None
    twitter_handle: str | None = None
    ward_ids: list[str] = Field(default_factory=list)
    local_body_code: str | None = None


class RepresentativeImportRequest(BaseModel):
    representatives: list[RepresentativeImportItem]


class RepresentativeImportResponse(BaseModel):
    imported: int
    updated: int
    ward_links_created: int


class EscalateResponse(BaseModel):
    escalated_to: list[RepresentativeBrief]
    message: str
