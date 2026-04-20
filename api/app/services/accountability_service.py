"""Accountability service: leaderboard aggregation, representative lookup, escalation."""

import json
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.cache import cache_get, cache_set
from app.core.config import get_settings
from app.models.elected_representative import ElectedRepresentative
from app.models.elected_representative_ward import ElectedRepresentativeWard
from app.schemas.accountability import LeaderboardEntry, RepresentativeBrief

settings = get_settings()
logger = logging.getLogger(__name__)

LEADERBOARD_CACHE_KEY = "accountability:leaderboard"
LEADERBOARD_CACHE_TTL = 300  # 5 minutes


def _performance_tier(resolution_rate: float) -> str:
    if resolution_rate >= 0.6:
        return "good"
    if resolution_rate >= 0.3:
        return "average"
    return "poor"


def get_leaderboard(
    db: Session,
    role_filter: str | None = None,
    district_filter: str | None = None,
    sort_by: str = "resolution_rate",
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[LeaderboardEntry], int]:
    """Compute the accountability leaderboard by aggregating reports per representative."""

    # Build cache key based on filters
    cache_key = f"{LEADERBOARD_CACHE_KEY}:{role_filter}:{district_filter}:{sort_by}:{page}:{page_size}"
    cached = cache_get(cache_key)
    if cached:
        items = [LeaderboardEntry(**item) for item in cached["items"]]
        return items, cached["total"]

    # Build WHERE clauses
    where_clauses = ["er.active = TRUE"]
    params: dict = {}
    if role_filter:
        where_clauses.append("er.role = :role_filter")
        params["role_filter"] = role_filter
    if district_filter:
        where_clauses.append("er.district = :district_filter")
        params["district_filter"] = district_filter

    where_sql = " AND ".join(where_clauses)

    # Sort mapping
    sort_map = {
        "resolution_rate": "resolution_rate DESC, total_issues DESC",
        "open_issues": "open_issues DESC",
        "total_issues": "total_issues DESC",
        "name": "er.name ASC",
    }
    order_sql = sort_map.get(sort_by, sort_map["resolution_rate"])

    query = text(f"""
        WITH rep_stats AS (
            SELECT
                er.id AS representative_id,
                er.name,
                er.name_ml,
                er.role,
                er.constituency_name,
                er.constituency_name_ml,
                er.district,
                er.party,
                er.photo_url,
                COUNT(r.id) AS total_issues,
                COUNT(r.id) FILTER (WHERE r.status IN ('open', 'acknowledged')) AS open_issues,
                COUNT(r.id) FILTER (WHERE r.status = 'fixed') AS resolved_issues
            FROM elected_representatives er
            LEFT JOIN elected_representative_wards erw ON erw.representative_id = er.id
            LEFT JOIN reports r ON r.ward_id = erw.ward_id AND r.moderation_state != 'hidden'
            WHERE {where_sql}
            GROUP BY er.id, er.name, er.name_ml, er.role, er.constituency_name,
                     er.constituency_name_ml, er.district, er.party, er.photo_url
        )
        SELECT *,
            CASE WHEN total_issues > 0
                THEN resolved_issues::FLOAT / total_issues
                ELSE 0.0
            END AS resolution_rate
        FROM rep_stats
        ORDER BY {order_sql}
    """)

    rows = db.execute(query, params).mappings().all()
    total = len(rows)

    # Paginate
    offset = (page - 1) * page_size
    page_rows = rows[offset:offset + page_size]

    items = []
    for row in page_rows:
        rate = float(row["resolution_rate"])
        items.append(LeaderboardEntry(
            representative_id=row["representative_id"],
            name=row["name"],
            name_ml=row["name_ml"],
            role=row["role"],
            constituency_name=row["constituency_name"],
            constituency_name_ml=row["constituency_name_ml"],
            district=row["district"],
            party=row["party"],
            photo_url=row["photo_url"],
            open_issues=int(row["open_issues"]),
            total_issues=int(row["total_issues"]),
            resolved_issues=int(row["resolved_issues"]),
            resolution_rate=round(rate, 3),
            performance_tier=_performance_tier(rate),
        ))

    # Cache result
    cache_set(cache_key, {
        "items": [item.model_dump() for item in items],
        "total": total,
    }, ttl=LEADERBOARD_CACHE_TTL)

    return items, total


def get_representatives_for_ward(db: Session, ward_id: str | None) -> list[RepresentativeBrief]:
    """Return all active elected representatives covering a given ward."""
    if not ward_id:
        return []

    query = text("""
        SELECT er.id, er.name, er.name_ml, er.role, er.party, er.photo_url
        FROM elected_representatives er
        JOIN elected_representative_wards erw ON erw.representative_id = er.id
        WHERE erw.ward_id = :ward_id AND er.active = TRUE
        ORDER BY
            CASE er.role
                WHEN 'mp' THEN 1
                WHEN 'mla' THEN 2
                WHEN 'corporation_councillor' THEN 3
                WHEN 'municipal_councillor' THEN 3
                WHEN 'panchayat_president' THEN 4
                ELSE 5
            END
    """)
    rows = db.execute(query, {"ward_id": ward_id}).mappings().all()

    return [
        RepresentativeBrief(
            id=row["id"],
            name=row["name"],
            name_ml=row["name_ml"],
            role=row["role"],
            party=row["party"],
            photo_url=row["photo_url"],
        )
        for row in rows
    ]


def get_districts(db: Session) -> list[str]:
    """Return distinct district names for filter dropdown."""
    query = text("""
        SELECT DISTINCT district FROM elected_representatives
        WHERE active = TRUE AND district IS NOT NULL
        ORDER BY district
    """)
    rows = db.execute(query).scalars().all()
    return list(rows)
