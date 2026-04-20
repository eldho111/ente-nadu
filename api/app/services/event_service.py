from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.report_event import ReportEvent


def add_report_event(
    db: Session,
    *,
    report_id: UUID,
    event_type: str,
    payload: dict[str, Any] | None = None,
    actor: str | None = None,
) -> ReportEvent:
    event = ReportEvent(
        report_id=report_id,
        event_type=event_type,
        payload=payload,
        actor=actor,
    )
    db.add(event)
    db.flush()
    return event