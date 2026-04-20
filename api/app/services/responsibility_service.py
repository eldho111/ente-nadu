from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.department_contact import DepartmentContact
from app.models.jurisdiction import Jurisdiction
from app.models.official_user import OfficialUser
from app.models.report import Report
from app.models.report_assignment import ReportAssignment
from app.models.report_responsibility_snapshot import ReportResponsibilitySnapshot


def _resolve_jurisdiction_id(db: Session, report: Report) -> UUID | None:
    if report.jurisdiction_id:
        return report.jurisdiction_id
    if report.ward_id:
        match = db.scalar(
            select(Jurisdiction.id).where(
                or_(
                    Jurisdiction.code == report.ward_id,
                    Jurisdiction.code == f"ward:{report.ward_id}",
                )
            )
        )
        if match:
            return match
    if report.zone_id:
        match = db.scalar(
            select(Jurisdiction.id).where(
                or_(
                    Jurisdiction.code == report.zone_id,
                    Jurisdiction.code == f"zone:{report.zone_id}",
                )
            )
        )
        if match:
            return match
    return None


def _load_contacts(
    db: Session,
    *,
    department_name: str | None,
    jurisdiction_id: UUID | None,
) -> list[DepartmentContact]:
    if not department_name:
        return []
    query = select(DepartmentContact).where(
        DepartmentContact.department_name == department_name,
        DepartmentContact.active.is_(True),
    )
    if jurisdiction_id:
        query = query.where(
            or_(
                DepartmentContact.jurisdiction_id == jurisdiction_id,
                DepartmentContact.jurisdiction_id.is_(None),
            )
        )
    rows = db.scalars(
        query.order_by(DepartmentContact.is_escalation_contact.desc(), DepartmentContact.name.asc())
    ).all()
    if rows:
        return rows
    return db.scalars(
        select(DepartmentContact).where(
            DepartmentContact.department_name == department_name,
            DepartmentContact.active.is_(True),
            DepartmentContact.jurisdiction_id.is_(None),
        )
    ).all()


def upsert_report_responsibility_snapshot(
    db: Session,
    *,
    report: Report,
    department_name: str | None,
    owner_official_user_id: UUID | None = None,
) -> ReportResponsibilitySnapshot:
    snapshot = db.scalar(
        select(ReportResponsibilitySnapshot).where(ReportResponsibilitySnapshot.report_id == report.id)
    )
    jurisdiction_id = _resolve_jurisdiction_id(db, report)
    owner_id = owner_official_user_id
    if owner_id is None:
        owner_id = db.scalar(
            select(ReportAssignment.official_user_id).where(
                ReportAssignment.report_id == report.id,
                ReportAssignment.active.is_(True),
            )
        )

    contacts = _load_contacts(db, department_name=department_name, jurisdiction_id=jurisdiction_id)
    escalation_contact_ids = [str(contact.id) for contact in contacts if contact.is_escalation_contact]

    if snapshot is None:
        snapshot = ReportResponsibilitySnapshot(
            report_id=report.id,
            jurisdiction_id=jurisdiction_id,
            department_name=department_name,
            owner_official_user_id=owner_id,
            escalation_contact_ids=escalation_contact_ids,
            assigned_at=datetime.now(timezone.utc),
        )
        db.add(snapshot)
        db.flush()
        return snapshot

    snapshot.jurisdiction_id = jurisdiction_id
    snapshot.department_name = department_name
    snapshot.owner_official_user_id = owner_id
    snapshot.escalation_contact_ids = escalation_contact_ids
    snapshot.assigned_at = datetime.now(timezone.utc)
    db.flush()
    return snapshot


def get_report_responsible_chain(db: Session, *, report: Report) -> dict:
    snapshot = db.scalar(
        select(ReportResponsibilitySnapshot).where(ReportResponsibilitySnapshot.report_id == report.id)
    )
    jurisdiction_id = snapshot.jurisdiction_id if snapshot else _resolve_jurisdiction_id(db, report)
    department_name = snapshot.department_name if snapshot else None

    if not department_name:
        from app.services.routing_service import resolve_routing_rule

        routing = resolve_routing_rule(db, report.category_final, report.ward_id, report.zone_id)
        department_name = routing.department_name

    contacts = _load_contacts(db, department_name=department_name, jurisdiction_id=jurisdiction_id)
    owner_id = snapshot.owner_official_user_id if snapshot else None
    if owner_id is None:
        owner_id = db.scalar(
            select(ReportAssignment.official_user_id).where(
                ReportAssignment.report_id == report.id,
                ReportAssignment.active.is_(True),
            )
        )

    owner = db.scalar(select(OfficialUser).where(OfficialUser.id == owner_id)) if owner_id else None
    escalation_ids = set(snapshot.escalation_contact_ids or []) if snapshot else set()

    return {
        "department_name": department_name,
        "assigned_at": snapshot.assigned_at if snapshot else None,
        "owner": {
            "official_user_id": owner.id,
            "display_name": owner.display_name,
            "designation": owner.department_name,
            "role": owner.role.value,
        }
        if owner
        else None,
        "contacts": [
            {
                "id": contact.id,
                "name": contact.name,
                "designation": contact.designation,
                "email": contact.email,
                "phone": contact.phone,
                "is_escalation_contact": contact.is_escalation_contact or (str(contact.id) in escalation_ids),
            }
            for contact in contacts
        ],
    }
