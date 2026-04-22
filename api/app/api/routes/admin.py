import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.official_user import OfficialUser
from app.models.report import Report
from app.models.resolution_proof import ResolutionProof
from app.models.routing_rule import RoutingRule
from app.models.user import User
from app.schemas.common import ApiMessage
from app.schemas.ops import OfficialUserUpsertRequest
from app.schemas.report import (
    AdminModerationPatchRequest,
    AdminStatusPatchRequest,
    RoutingRuleUpsertRequest,
    WardsImportRequest,
)
from app.services.event_service import add_report_event
from app.services.notification_service import queue_status_notifications
from app.services.notify_service import send_email_sendgrid

router = APIRouter()
settings = get_settings()


def _find_report(db: Session, report_id: str) -> Report | None:
    report = db.scalar(select(Report).where(Report.public_id == report_id))
    if report is not None:
        return report
    try:
        report_uuid = UUID(report_id)
    except ValueError:
        return None
    return db.scalar(select(Report).where(Report.id == report_uuid))


def _valid_status_transition(current: str, target: str) -> bool:
    allowed = {
        "open": {"acknowledged", "in_progress", "fixed", "rejected"},
        "acknowledged": {"in_progress", "fixed", "rejected"},
        "in_progress": {"fixed", "rejected"},
        "fixed": {"open"},
        "rejected": {"open"},
    }
    return target in allowed.get(current, set())


@router.patch("/reports/{report_id}/status", response_model=ApiMessage)
def patch_report_status(
    report_id: str,
    payload: AdminStatusPatchRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiMessage:
    report = _find_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="report not found")
    if not _valid_status_transition(report.status.value, payload.status.value):
        raise HTTPException(status_code=400, detail="invalid status transition")
    if payload.status.value == "fixed":
        proof_count = db.scalar(
            select(func.count()).select_from(ResolutionProof).where(ResolutionProof.report_id == report.id)
        )
        if int(proof_count or 0) == 0:
            raise HTTPException(status_code=400, detail="resolution proof is required before marking fixed")

    report.status = payload.status
    add_report_event(
        db,
        report_id=report.id,
        event_type="report.status_changed",
        payload={"status": payload.status.value},
        actor=f"admin:{admin.id}",
    )
    queue_status_notifications(
        db,
        report=report,
        actor=f"admin:{admin.id}",
        web_base_url=settings.web_base_url,
    )
    db.commit()
    return ApiMessage(message="status updated")


@router.patch("/reports/{report_id}/moderation", response_model=ApiMessage)
def patch_report_moderation(
    report_id: str,
    payload: AdminModerationPatchRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiMessage:
    report = _find_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="report not found")

    report.moderation_state = payload.moderation_state
    add_report_event(
        db,
        report_id=report.id,
        event_type="report.moderation_changed",
        payload={"moderation_state": payload.moderation_state.value},
        actor=f"admin:{admin.id}",
    )
    db.commit()
    return ApiMessage(message="moderation updated")


@router.post("/wards/import", response_model=ApiMessage)
def import_wards(
    payload: WardsImportRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiMessage:
    features = payload.features_geojson.get("features", [])
    if not isinstance(features, list):
        raise HTTPException(status_code=400, detail="invalid geojson: features must be array")
    if not features:
        raise HTTPException(status_code=400, detail="no ward features provided")

    inserted = 0
    for feature in features:
        properties = feature.get("properties", {})
        geometry = feature.get("geometry")
        if not geometry:
            continue

        ward_id = str(properties.get("ward_id") or properties.get("WARD_ID") or properties.get("id") or "")
        ward_name = str(properties.get("ward_name") or properties.get("WARD_NAME") or properties.get("name") or "")
        zone_id = str(properties.get("zone_id") or properties.get("ZONE_ID") or "unknown")
        zone_name = str(properties.get("zone_name") or properties.get("ZONE_NAME") or "Unknown")
        if not ward_id or not ward_name:
            continue

        db.execute(
            text(
                """
                INSERT INTO wards (id, ward_id, ward_name, zone_id, zone_name, geom, created_at)
                VALUES (
                  gen_random_uuid(),
                  :ward_id,
                  :ward_name,
                  :zone_id,
                  :zone_name,
                  ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326),
                  now()
                )
                ON CONFLICT (ward_id)
                DO UPDATE SET
                  ward_name = EXCLUDED.ward_name,
                  zone_id = EXCLUDED.zone_id,
                  zone_name = EXCLUDED.zone_name,
                  geom = EXCLUDED.geom
                """
            ),
            {
                "ward_id": ward_id,
                "ward_name": ward_name,
                "zone_id": zone_id,
                "zone_name": zone_name,
                "geom_json": json.dumps(geometry),
            },
        )
        inserted += 1

    db.commit()
    return ApiMessage(message=f"imported/updated {inserted} wards")


@router.post("/routing-rules/upsert", response_model=ApiMessage)
def upsert_routing_rule(
    payload: RoutingRuleUpsertRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiMessage:
    existing = db.scalar(
        select(RoutingRule).where(
            RoutingRule.category == payload.category,
            RoutingRule.ward_id == payload.ward_id,
            RoutingRule.zone_id == payload.zone_id,
        )
    )

    if existing is None:
        existing = RoutingRule(
            category=payload.category,
            ward_id=payload.ward_id,
            zone_id=payload.zone_id,
            department_name=payload.department_name,
            email_to=payload.email_to,
            email_cc=payload.email_cc,
            metadata_json=payload.metadata,
        )
        db.add(existing)
    else:
        existing.department_name = payload.department_name
        existing.email_to = payload.email_to
        existing.email_cc = payload.email_cc
        existing.metadata_json = payload.metadata

    db.commit()
    return ApiMessage(message="routing rule upserted")


@router.post("/official-users/upsert", response_model=ApiMessage)
def upsert_official_user(
    payload: OfficialUserUpsertRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiMessage:
    existing = db.scalar(select(OfficialUser).where(OfficialUser.firebase_uid == payload.firebase_uid))
    if existing is None:
        existing = OfficialUser(
            firebase_uid=payload.firebase_uid,
            email=payload.email,
            display_name=payload.display_name,
            department_name=payload.department_name,
            role=payload.role,
            active=payload.active,
        )
        db.add(existing)
    else:
        existing.email = payload.email
        existing.display_name = payload.display_name
        existing.department_name = payload.department_name
        existing.role = payload.role
        existing.active = payload.active

    db.commit()
    return ApiMessage(message="official user upserted")


# ── Trial email ───────────────────────────────────────────────────────
# Sends a sample civic-report escalation email to any address, using the
# production SendGrid credentials. Used to verify the email pipeline end
# to end without creating a real report. Subject + body mimic what a
# Kerala department would actually receive.


class TrialEmailRequest(BaseModel):
    # NOTE: EmailStr validators are constructed at MODEL IMPORT TIME (not at
    # request time). That means the `email-validator` package must be in
    # api/requirements.txt — without it, this module fails to import and the
    # WHOLE API crashes on boot. See: https://docs.pydantic.dev/latest/api/networks/#pydantic.networks.EmailStr
    to: EmailStr = Field(..., description="Recipient address")
    category: str = Field(default="pothole", description="Civic category slug")
    location: str = Field(default="Kadavanthra, Ernakulam", description="Report location label")
    note: str | None = Field(default=None, description="Optional extra note shown in body")


class TrialEmailResponse(BaseModel):
    sent: bool
    to: str
    subject: str
    note: str


def _build_trial_email(payload: TrialEmailRequest) -> tuple[str, str]:
    """Return (subject, body) matching the real escalation template."""
    now_ist = datetime.now(timezone.utc).strftime("%d %b %Y %H:%M UTC")
    public_id = f"TRIAL-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    category_label = payload.category.replace("_", " ").title()

    subject = f"[TRIAL] Civic Issue Report {public_id} | {category_label}"

    lines = [
        "Dear Recipient,",
        "",
        "This is a TRIAL email from the Ente Nadu civic platform.",
        "It mirrors the exact format your department would receive when a",
        "citizen report is routed to you. No real report was filed.",
        "",
        f"Report ID    : {public_id}",
        f"Category     : {payload.category}",
        "Severity (AI): 3 / 5",
        f"Location     : {payload.location}",
        "Ward/Zone    : KL-EKM-W042 / KOCHI",
        (
            "Summary      : A sample civic issue — large pothole on main road, "
            "affecting traffic. AI confidence 0.87."
        ),
        "",
        "Public Evidence Link: https://www.ente-nadu.in/reports/" + public_id,
        "",
        (payload.note or "If you received this by mistake, please disregard."),
        "",
        f"Generated at : {now_ist}",
        "Regards,",
        f"{settings.app_name} — Civic Ops Platform",
    ]
    return subject, "\n".join(lines)


@router.post("/notify/test-email", response_model=TrialEmailResponse)
def send_trial_email(
    payload: TrialEmailRequest,
    admin: User = Depends(require_admin),
) -> TrialEmailResponse:
    """Send a representative trial civic-report email via SendGrid.

    Requires SENDGRID_API_KEY + NOTIFY_FROM_EMAIL in the API environment.
    Returns the outcome so callers know whether delivery was accepted.
    """
    if not settings.sendgrid_api_key:
        raise HTTPException(
            status_code=503,
            detail="SENDGRID_API_KEY not configured on the API.",
        )

    subject, body = _build_trial_email(payload)
    sent = send_email_sendgrid(to=[payload.to], cc=[], subject=subject, body=body)

    if not sent:
        raise HTTPException(
            status_code=502,
            detail="SendGrid returned an error — check API logs.",
        )

    return TrialEmailResponse(
        sent=True,
        to=str(payload.to),
        subject=subject,
        note="Accepted by SendGrid. Check inbox (and spam folder).",
    )
