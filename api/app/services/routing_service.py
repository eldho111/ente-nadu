from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.enums import Category


@dataclass
class WardLookupResult:
    ward_id: str | None
    ward_name: str | None
    zone_id: str | None
    zone_name: str | None


@dataclass
class RoutingResult:
    department_name: str | None
    email_to: list[str]
    email_cc: list[str]


def lookup_jurisdiction_id(db: Session, lat: float, lon: float) -> UUID | None:
    query = text(
        """
        SELECT id
        FROM jurisdictions
        WHERE geom IS NOT NULL
          AND ST_Within(
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
            geom
          )
        ORDER BY
          CASE type
            WHEN 'ward' THEN 1
            WHEN 'zone' THEN 2
            WHEN 'city' THEN 3
            WHEN 'district' THEN 4
            WHEN 'state' THEN 5
            ELSE 6
          END
        LIMIT 1
        """
    )
    row = db.execute(query, {"lat": lat, "lon": lon}).first()
    if not row:
        return None
    return row[0]


def lookup_ward_zone(db: Session, lat: float, lon: float) -> WardLookupResult:
    query = text(
        """
        SELECT ward_id, ward_name, zone_id, zone_name
        FROM wards
        WHERE ST_Within(
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
            geom
        )
        LIMIT 1
        """
    )
    row = db.execute(query, {"lat": lat, "lon": lon}).mappings().first()
    if not row:
        return WardLookupResult(None, None, None, None)
    return WardLookupResult(
        ward_id=row["ward_id"],
        ward_name=row["ward_name"],
        zone_id=row["zone_id"],
        zone_name=row["zone_name"],
    )


def resolve_routing_rule(db: Session, category: Category, ward_id: str | None, zone_id: str | None) -> RoutingResult:
    rule_query = text(
        """
        SELECT department_name, email_to, email_cc
        FROM routing_rules
        WHERE category = :category
          AND (
            (ward_id IS NOT NULL AND ward_id = :ward_id)
            OR (ward_id IS NULL AND zone_id IS NOT NULL AND zone_id = :zone_id)
            OR (ward_id IS NULL AND zone_id IS NULL)
          )
        ORDER BY
          CASE
            WHEN ward_id = :ward_id THEN 1
            WHEN zone_id = :zone_id THEN 2
            ELSE 3
          END
        LIMIT 1
        """
    )
    row = db.execute(
        rule_query,
        {"category": category.value, "ward_id": ward_id, "zone_id": zone_id},
    ).mappings().first()

    if not row:
        return RoutingResult(department_name=None, email_to=[], email_cc=[])

    def _safe_list(value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item) for item in value]
        return []

    return RoutingResult(
        department_name=row["department_name"],
        email_to=_safe_list(row["email_to"]),
        email_cc=_safe_list(row.get("email_cc")),
    )
