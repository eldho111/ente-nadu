"""Open Data API: public, anonymized civic report data for journalists and researchers."""

import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.enums import Category, ReportStatus
from app.models.report import Report
from app.schemas.common import PaginationMeta
from app.schemas.open_data import OpenDataReportItem, OpenDataResponse

router = APIRouter()
settings = get_settings()
limiter = Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)


@router.get("/reports", response_model=OpenDataResponse)
@limiter.limit("100/hour")
def open_data_reports(
    request: Request,
    db: Session = Depends(get_db),
    category: str | None = Query(default=None),
    district: str | None = Query(default=None),
    ward_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    date_from: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    date_to: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    format: str = Query(default="json", description="json or csv"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=1000),
) -> OpenDataResponse | StreamingResponse:
    """Public endpoint returning anonymized civic report data."""

    query = select(Report).where(Report.moderation_state != "hidden")

    if category:
        query = query.where(Report.category_final == category)
    if ward_id:
        query = query.where(Report.ward_id == ward_id)
    if status:
        query = query.where(Report.status == status)
    if date_from:
        query = query.where(Report.created_at >= date_from)
    if date_to:
        query = query.where(Report.created_at <= date_to)

    query = query.order_by(Report.created_at.desc())

    # For CSV, fetch all (up to 10000)
    if format == "csv":
        all_rows = db.scalars(query.limit(10000)).all()
        return _build_csv_response(all_rows)

    # JSON pagination
    all_rows = db.scalars(query).all()
    total = len(all_rows)
    offset = (page - 1) * page_size
    page_rows = all_rows[offset:offset + page_size]

    items = [_to_open_data_item(r) for r in page_rows]

    return OpenDataResponse(
        items=items,
        pagination=PaginationMeta(page=page, page_size=page_size, total=total),
        generated_at=datetime.now(timezone.utc),
    )


def _to_open_data_item(report: Report) -> OpenDataReportItem:
    return OpenDataReportItem(
        public_id=report.public_id,
        category=report.category_final.value,
        status=report.status.value,
        ward_id=report.ward_id,
        zone_id=report.zone_id,
        locality=report.locality,
        public_lat=report.public_lat,
        public_lon=report.public_lon,
        created_at=report.created_at,
        severity_ai=report.severity_ai,
    )


def _build_csv_response(reports: list[Report]) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "public_id", "category", "status", "ward_id", "zone_id",
        "locality", "public_lat", "public_lon", "created_at", "severity_ai",
    ])
    for r in reports:
        writer.writerow([
            r.public_id, r.category_final.value, r.status.value,
            r.ward_id or "", r.zone_id or "", r.locality or "",
            r.public_lat, r.public_lon,
            r.created_at.isoformat() if r.created_at else "",
            r.severity_ai if r.severity_ai is not None else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ente-keralam-reports.csv"},
    )
