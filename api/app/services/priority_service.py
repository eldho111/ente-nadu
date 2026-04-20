from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.enums import Category, ReportStatus
from app.models.report import Report

settings = get_settings()


_SAFETY_CATEGORIES = {Category.OPEN_MANHOLE, Category.SIGNAL_MALFUNCTION}


def nearby_duplicate_density(db: Session, *, lat: float, lon: float, category: Category) -> int:
    row = db.scalar(
        select(func.count()).where(
            Report.category_final == category,
            Report.status.in_((ReportStatus.OPEN, ReportStatus.ACKNOWLEDGED, ReportStatus.IN_PROGRESS)),
            func.abs(Report.lat - lat) <= 0.001,
            func.abs(Report.lon - lon) <= 0.001,
        )
    )
    return int(row or 0)


def compute_priority_score(
    *,
    category: Category,
    severity: int | None,
    created_at: datetime,
    duplicate_density: int,
    now: datetime | None = None,
) -> float:
    reference = now or datetime.now(timezone.utc)
    age_minutes = max((reference - created_at).total_seconds() / 60.0, 0.0)

    severity_score = max(0.0, min(5.0, float(severity or 0)))
    age_score = max(0.0, min(5.0, age_minutes / 60.0))
    duplicate_score = max(0.0, min(5.0, float(duplicate_density)))
    safety_flag_score = 5.0 if category in _SAFETY_CATEGORIES else 0.0

    weighted = (
        settings.priority_weight_severity * severity_score
        + settings.priority_weight_age * age_score
        + settings.priority_weight_duplicate_density * duplicate_score
        + settings.priority_weight_safety_flag * safety_flag_score
    )
    return round(weighted, 3)
