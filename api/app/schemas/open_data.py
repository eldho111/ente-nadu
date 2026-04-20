"""Schemas for the public Open Data API."""

from datetime import datetime
from pydantic import BaseModel

from app.schemas.common import PaginationMeta


class OpenDataReportItem(BaseModel):
    public_id: str
    category: str
    status: str
    ward_id: str | None = None
    zone_id: str | None = None
    district: str | None = None
    locality: str | None = None
    public_lat: float
    public_lon: float
    created_at: datetime
    severity_ai: int | None = None


class OpenDataResponse(BaseModel):
    items: list[OpenDataReportItem]
    pagination: PaginationMeta
    data_license: str = "CC BY 4.0"
    generated_at: datetime
