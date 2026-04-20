from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.enums import Category

settings = get_settings()


@dataclass
class AbuseCounts:
    device_daily_count: int
    ip_daily_count: int


def get_abuse_counts(db: Session, device_id: str, ip_address: str | None) -> AbuseCounts:
    since = datetime.now(timezone.utc) - timedelta(days=1)

    device_query = text(
        "SELECT COUNT(*) FROM reports WHERE device_id = :device_id AND created_at >= :since"
    )
    device_count = int(db.execute(device_query, {"device_id": device_id, "since": since}).scalar_one())

    ip_count = 0
    if ip_address:
        ip_query = text(
            "SELECT COUNT(*) FROM reports WHERE ip_address = :ip_address AND created_at >= :since"
        )
        ip_count = int(db.execute(ip_query, {"ip_address": ip_address, "since": since}).scalar_one())

    return AbuseCounts(device_daily_count=device_count, ip_daily_count=ip_count)


def is_allowed_by_limits(counts: AbuseCounts) -> bool:
    if counts.device_daily_count >= settings.anon_device_daily_limit:
        return False
    if counts.ip_daily_count >= settings.anon_ip_daily_limit:
        return False
    return True


def is_duplicate_cooldown_hit(
    db: Session,
    *,
    device_id: str,
    category: Category,
    lat: float,
    lon: float,
) -> bool:
    since = datetime.now(timezone.utc) - timedelta(minutes=settings.duplicate_cooldown_minutes)
    query = text(
        """
        SELECT EXISTS (
          SELECT 1
          FROM reports
          WHERE device_id = :device_id
            AND category_final = :category
            AND created_at >= :since
            AND ST_DWithin(
              geom::geography,
              ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
              80
            )
        )
        """
    )
    return bool(
        db.execute(
            query,
            {
                "device_id": device_id,
                "category": category.value,
                "since": since,
                "lat": lat,
                "lon": lon,
            },
        ).scalar_one()
    )