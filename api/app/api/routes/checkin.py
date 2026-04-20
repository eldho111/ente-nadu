from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.checkin import ReportCheckin
from app.models.report import Report
from app.services.event_service import add_report_event
from app.services.sse_publisher import publish_report_event

router = APIRouter(tags=["checkin"])


# ── Request / Response schemas ────────────────────────────────────────

class CheckinRequest(BaseModel):
    device_id: str = Field(..., max_length=128)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)
    comment: str | None = Field(default=None, max_length=500)


class CheckinResponse(BaseModel):
    ok: bool
    checkin_count: int
    message: str


# ── Helpers ───────────────────────────────────────────────────────────

def _fetch_report_by_public_id(db: Session, public_id: str) -> Report:
    report = db.scalar(select(Report).where(Report.public_id == public_id))
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    return report


def _is_rate_limited(db: Session, report_id, device_id: str) -> bool:
    """Return True if this device already checked in on this report in the last 24 hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    count = db.scalar(
        select(func.count())
        .select_from(ReportCheckin)
        .where(
            ReportCheckin.report_id == report_id,
            ReportCheckin.device_id == device_id,
            ReportCheckin.created_at >= cutoff,
        )
    )
    return (count or 0) > 0


# ── Endpoint ──────────────────────────────────────────────────────────

@router.post("/reports/{public_id}/checkin", response_model=CheckinResponse, status_code=status.HTTP_201_CREATED)
def create_checkin(
    public_id: str,
    payload: CheckinRequest,
    db: Session = Depends(get_db),
) -> CheckinResponse:
    report = _fetch_report_by_public_id(db, public_id)

    if _is_rate_limited(db, report_id=report.id, device_id=payload.device_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="check-in limit: one per device per report every 24 hours",
        )

    checkin = ReportCheckin(
        report_id=report.id,
        device_id=payload.device_id,
        lat=payload.lat,
        lon=payload.lon,
        comment=payload.comment,
    )
    db.add(checkin)
    db.flush()

    # Update aggregated check-in fields on the report.
    new_count = db.scalar(
        select(func.count())
        .select_from(ReportCheckin)
        .where(ReportCheckin.report_id == report.id)
    ) or 0
    report.checkin_count = new_count
    report.last_checkin_at = checkin.created_at

    add_report_event(
        db,
        report_id=report.id,
        event_type="report.checkin",
        payload={
            "checkin_id": str(checkin.id),
            "device_id": payload.device_id,
            "lat": payload.lat,
            "lon": payload.lon,
            "comment": payload.comment,
        },
        actor="public",
    )
    db.commit()

    # Publish to SSE channel (non-blocking; silently no-ops if Redis is down).
    publish_report_event(
        public_id=public_id,
        event_type="checkin",
        data={
            "checkin_id": str(checkin.id),
            "checkin_count": new_count,
            "lat": payload.lat,
            "lon": payload.lon,
            "comment": payload.comment,
        },
    )

    return CheckinResponse(
        ok=True,
        checkin_count=new_count,
        message="Check-in recorded",
    )
