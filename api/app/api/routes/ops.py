from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.department_contact import DepartmentContact
from app.models.enums import Category, OfficialRole, ReportStatus
from app.models.official_user import OfficialUser
from app.models.report import Report
from app.models.report_assignment import ReportAssignment
from app.models.resolution_proof import ResolutionProof
from app.schemas.common import ApiMessage, PaginationMeta
from app.schemas.ops import (
    OpsAuthLoginRequest,
    OpsAuthLoginResponse,
    OpsClaimResponse,
    OpsEscalateRequest,
    OpsMetricsItem,
    OpsMetricsResponse,
    OpsReportCard,
    OpsReportListResponse,
    OpsRoutingChainContact,
    OpsRoutingChainResponse,
    OpsStatusPatchRequest,
    ResolutionProofCreateRequest,
    ResolutionProofCreateResponse,
)
from app.services.event_service import add_report_event
from app.services.notification_service import queue_status_notifications
from app.services.notify_service import send_email_sendgrid
from app.services.responsibility_service import get_report_responsible_chain, upsert_report_responsibility_snapshot
from app.services.routing_service import resolve_routing_rule
from app.services.auth_service import verify_firebase_token

router = APIRouter(prefix="/ops")
settings = get_settings()


def _extract_bearer_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header[7:]


def _require_official(request: Request, db: Session) -> OfficialUser:
    token = _extract_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Authorization token is required")

    try:
        verified = verify_firebase_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    official = db.scalar(
        select(OfficialUser).where(
            OfficialUser.firebase_uid == verified.firebase_uid,
            OfficialUser.active.is_(True),
        )
    )
    if official is None:
        raise HTTPException(status_code=403, detail="Official account is not provisioned")
    return official


def _valid_status_transition(current: ReportStatus, target: ReportStatus) -> bool:
    allowed = {
        ReportStatus.OPEN: {ReportStatus.ACKNOWLEDGED, ReportStatus.IN_PROGRESS, ReportStatus.FIXED, ReportStatus.REJECTED},
        ReportStatus.ACKNOWLEDGED: {ReportStatus.IN_PROGRESS, ReportStatus.FIXED, ReportStatus.REJECTED},
        ReportStatus.IN_PROGRESS: {ReportStatus.FIXED, ReportStatus.REJECTED},
        ReportStatus.FIXED: {ReportStatus.OPEN},
        ReportStatus.REJECTED: {ReportStatus.OPEN},
    }
    return target in allowed.get(current, set())


def _find_report(db: Session, identifier: str) -> Report | None:
    by_public = db.scalar(select(Report).where(Report.public_id == identifier))
    if by_public is not None:
        return by_public
    try:
        report_uuid = UUID(identifier)
    except ValueError:
        return None
    return db.scalar(select(Report).where(Report.id == report_uuid))


@router.post("/auth/login", response_model=OpsAuthLoginResponse)
def ops_login(payload: OpsAuthLoginRequest, db: Session = Depends(get_db)) -> OpsAuthLoginResponse:
    try:
        verified = verify_firebase_token(payload.id_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    official = db.scalar(
        select(OfficialUser).where(
            OfficialUser.firebase_uid == verified.firebase_uid,
            OfficialUser.active.is_(True),
        )
    )
    if official is None:
        raise HTTPException(status_code=403, detail="Official account is not provisioned")

    return OpsAuthLoginResponse(
        firebase_uid=official.firebase_uid,
        role=official.role,
        department_name=official.department_name,
        display_name=official.display_name,
    )


@router.get("/reports", response_model=OpsReportListResponse)
def list_ops_reports(
    request: Request,
    jurisdiction_id: str | None = None,
    category: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    assignee: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> OpsReportListResponse:
    official = _require_official(request, db)

    assignment_join = and_(
        ReportAssignment.report_id == Report.id,
        ReportAssignment.active.is_(True),
    )
    query = select(Report, ReportAssignment.official_user_id).outerjoin(ReportAssignment, assignment_join)

    if category:
        try:
            category_enum = Category(category)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="invalid category filter") from exc
        query = query.where(Report.category_final == category_enum)

    if status_filter:
        try:
            status_enum = ReportStatus(status_filter)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="invalid status filter") from exc
        query = query.where(Report.status == status_enum)

    if assignee == "unassigned":
        query = query.where(ReportAssignment.official_user_id.is_(None))
    elif assignee:
        try:
            assignee_uuid = UUID(assignee)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="invalid assignee id") from exc
        query = query.where(ReportAssignment.official_user_id == assignee_uuid)

    if official.role == OfficialRole.FIELD_OFFICER:
        query = query.where(
            ReportAssignment.official_user_id == official.id
        )

    # Placeholder until reports are fully linked to jurisdiction records.
    if jurisdiction_id:
        try:
            jurisdiction_uuid = UUID(jurisdiction_id)
            query = query.where(Report.jurisdiction_id == jurisdiction_uuid)
        except ValueError:
            query = query.where(
                or_(
                    Report.ward_id == jurisdiction_id,
                    Report.zone_id == jurisdiction_id,
                )
            )

    total = int(db.scalar(select(func.count()).select_from(query.subquery())) or 0)
    rows = db.execute(
        query.order_by(Report.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = [
        OpsReportCard(
            id=report.id,
            public_id=report.public_id,
            category=report.category_final.value,
            status=report.status,
            severity_ai=report.severity_ai,
            confidence=report.confidence,
            jurisdiction_id=report.jurisdiction_id,
            ward_id=report.ward_id,
            zone_id=report.zone_id,
            locality=report.locality,
            created_at=report.created_at,
            assigned_official_id=assigned_official_id,
        )
        for report, assigned_official_id in rows
    ]
    return OpsReportListResponse(
        items=items,
        pagination=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/routing-chain", response_model=OpsRoutingChainResponse)
def get_routing_chain(
    request: Request,
    jurisdiction_id: str | None = None,
    category: str = Query(...),
    db: Session = Depends(get_db),
) -> OpsRoutingChainResponse:
    _require_official(request, db)
    try:
        category_enum = Category(category)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="invalid category") from exc

    routing = resolve_routing_rule(db, category_enum, jurisdiction_id, jurisdiction_id)
    if routing.department_name:
        contacts_query = select(DepartmentContact).where(
            DepartmentContact.department_name == routing.department_name,
            DepartmentContact.active.is_(True),
        )
        if jurisdiction_id:
            try:
                jurisdiction_uuid = UUID(jurisdiction_id)
                contacts_query = contacts_query.where(
                    or_(
                        DepartmentContact.jurisdiction_id == jurisdiction_uuid,
                        DepartmentContact.jurisdiction_id.is_(None),
                    )
                )
            except ValueError:
                contacts_query = contacts_query.where(DepartmentContact.jurisdiction_id.is_(None))
        contacts = db.scalars(contacts_query.order_by(DepartmentContact.name.asc())).all()
    else:
        contacts = []

    return OpsRoutingChainResponse(
        jurisdiction_id=jurisdiction_id,
        category=category_enum,
        department_name=routing.department_name,
        email_to=routing.email_to,
        email_cc=routing.email_cc,
        contacts=[
            OpsRoutingChainContact(
                id=row.id,
                name=row.name,
                designation=row.designation,
                email=row.email,
                phone=row.phone,
                is_escalation_contact=row.is_escalation_contact,
            )
            for row in contacts
        ],
    )


@router.post("/reports/{report_id}/claim", response_model=OpsClaimResponse)
def claim_report(
    report_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> OpsClaimResponse:
    official = _require_official(request, db)
    report = _find_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="report not found")

    active_assignment = db.scalar(
        select(ReportAssignment).where(
            ReportAssignment.report_id == report.id,
            ReportAssignment.active.is_(True),
        )
    )
    if active_assignment and active_assignment.official_user_id != official.id:
        raise HTTPException(status_code=409, detail="report is already assigned")
    if active_assignment and active_assignment.official_user_id == official.id:
        return OpsClaimResponse(assignment_id=active_assignment.id, report_id=report.id)

    old_assignments = db.scalars(select(ReportAssignment).where(ReportAssignment.report_id == report.id)).all()
    for old in old_assignments:
        old.active = False
        old.released_at = datetime.now(timezone.utc)

    assignment = ReportAssignment(
        report_id=report.id,
        official_user_id=official.id,
        active=True,
    )
    db.add(assignment)
    db.flush()
    add_report_event(
        db,
        report_id=report.id,
        event_type="report.assigned",
        payload={"official_user_id": str(official.id)},
        actor=f"official:{official.id}",
    )
    upsert_report_responsibility_snapshot(
        db,
        report=report,
        department_name=official.department_name,
        owner_official_user_id=official.id,
    )
    db.commit()
    return OpsClaimResponse(assignment_id=assignment.id, report_id=report.id)


@router.patch("/reports/{report_id}/status", response_model=ApiMessage)
def patch_report_status(
    report_id: str,
    payload: OpsStatusPatchRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ApiMessage:
    official = _require_official(request, db)
    if official.role == OfficialRole.VIEWER:
        raise HTTPException(status_code=403, detail="viewer role cannot update status")

    report = _find_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="report not found")
    if not _valid_status_transition(report.status, payload.status):
        raise HTTPException(status_code=400, detail="invalid status transition")

    if payload.status == ReportStatus.FIXED:
        proof_exists = db.scalar(
            select(func.count()).select_from(ResolutionProof).where(ResolutionProof.report_id == report.id)
        )
        if int(proof_exists or 0) == 0:
            raise HTTPException(status_code=400, detail="resolution proof is required before marking fixed")

    report.status = payload.status
    add_report_event(
        db,
        report_id=report.id,
        event_type="report.status_changed",
        payload={"status": payload.status.value, "note": payload.note},
        actor=f"official:{official.id}",
    )
    queue_status_notifications(
        db,
        report=report,
        actor=f"official:{official.id}",
        web_base_url=settings.web_base_url,
    )
    db.commit()
    return ApiMessage(message="status updated")


@router.post("/reports/{report_id}/resolution-proof", response_model=ResolutionProofCreateResponse)
def add_resolution_proof(
    report_id: str,
    payload: ResolutionProofCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ResolutionProofCreateResponse:
    official = _require_official(request, db)
    if official.role == OfficialRole.VIEWER:
        raise HTTPException(status_code=403, detail="viewer role cannot add resolution proof")

    report = _find_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="report not found")

    proof = ResolutionProof(
        report_id=report.id,
        official_user_id=official.id,
        note=payload.note,
        media_url=payload.media_url,
    )
    db.add(proof)
    db.flush()

    add_report_event(
        db,
        report_id=report.id,
        event_type="report.resolution_proof_added",
        payload={"proof_id": str(proof.id), "media_url": payload.media_url},
        actor=f"official:{official.id}",
    )
    db.commit()
    return ResolutionProofCreateResponse(proof_id=proof.id, report_id=report.id)


@router.post("/reports/{report_id}/escalate", response_model=ApiMessage)
def escalate_report(
    report_id: str,
    payload: OpsEscalateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ApiMessage:
    official = _require_official(request, db)
    if official.role == OfficialRole.VIEWER:
        raise HTTPException(status_code=403, detail="viewer role cannot escalate reports")

    report = _find_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="report not found")

    chain = get_report_responsible_chain(db, report=report)
    escalation_emails = [
        contact["email"]
        for contact in chain["contacts"]
        if contact.get("is_escalation_contact") and contact.get("email")
    ]
    if not escalation_emails:
        routing = resolve_routing_rule(db, report.category_final, report.ward_id, report.zone_id)
        escalation_emails = [*routing.email_to, *routing.email_cc]

    escalation_emails = sorted({email for email in escalation_emails if email})

    share_url = f"{settings.web_base_url.rstrip('/')}/reports/{report.public_id}"
    note = payload.note or "SLA threshold exceeded; escalation required."
    subject = f"[Escalation] {report.public_id} requires action"
    body = (
        f"Report {report.public_id} ({report.category_final.value}) has been escalated.\n"
        f"Current status: {report.status.value}\n"
        f"Location: {report.locality or report.address_text or f'{report.public_lat},{report.public_lon}'}\n"
        f"Note: {note}\n"
        f"Timeline: {share_url}"
    )

    sent_count = 0
    for email in escalation_emails:
        if send_email_sendgrid([email], [], subject, body):
            sent_count += 1

    add_report_event(
        db,
        report_id=report.id,
        event_type="report.escalated",
        payload={
            "note": note,
            "recipient_count": len(escalation_emails),
            "delivered_count": sent_count,
        },
        actor=f"official:{official.id}",
    )
    queue_status_notifications(
        db,
        report=report,
        actor=f"official:{official.id}",
        web_base_url=settings.web_base_url,
    )
    db.commit()
    return ApiMessage(message="escalation triggered")


@router.get("/metrics", response_model=OpsMetricsResponse)
def ops_metrics(
    request: Request,
    jurisdiction_id: str | None = None,
    from_ts: datetime | None = Query(default=None, alias="from"),
    to_ts: datetime | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
) -> OpsMetricsResponse:
    _require_official(request, db)

    query = select(Report.status, func.count()).group_by(Report.status)
    if jurisdiction_id:
        query = query.where(or_(Report.ward_id == jurisdiction_id, Report.zone_id == jurisdiction_id))
    if from_ts:
        query = query.where(Report.created_at >= from_ts)
    if to_ts:
        query = query.where(Report.created_at <= to_ts)

    rows = db.execute(query).all()
    items = [OpsMetricsItem(status=status, count=int(count)) for status, count in rows]
    return OpsMetricsResponse(items=items)
