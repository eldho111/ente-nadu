"""Accountability routes: leaderboard, representative CRUD, escalation."""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.elected_representative import ElectedRepresentative
from app.models.elected_representative_ward import ElectedRepresentativeWard
from app.models.report import Report
from app.models.user import User
from app.schemas.accountability import (
    EscalateResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    RepresentativeBrief,
    RepresentativeDetail,
    RepresentativeImportRequest,
    RepresentativeImportResponse,
    RepresentativeListResponse,
)
from app.schemas.common import PaginationMeta
from app.services.accountability_service import (
    get_districts,
    get_leaderboard,
    get_representatives_for_ward,
)
from app.services.event_service import add_report_event
from app.services.notify_service import send_whatsapp, send_email_sendgrid, build_share_url

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ── Public Endpoints ────────────���────────────────────────────────────


@router.get("/accountability/leaderboard", response_model=LeaderboardResponse)
def leaderboard(
    db: Session = Depends(get_db),
    role: str | None = Query(default=None, description="Filter by role: mp, mla, corporation_councillor, etc."),
    district: str | None = Query(default=None, description="Filter by district name"),
    sort_by: str = Query(default="resolution_rate", description="Sort: resolution_rate, open_issues, total_issues, name"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> LeaderboardResponse:
    items, total = get_leaderboard(
        db, role_filter=role, district_filter=district,
        sort_by=sort_by, page=page, page_size=page_size,
    )
    return LeaderboardResponse(
        items=items,
        pagination=PaginationMeta(page=page, page_size=page_size, total=total),
        generated_at=datetime.now(timezone.utc),
    )


@router.get("/accountability/districts", response_model=list[str])
def list_districts(db: Session = Depends(get_db)) -> list[str]:
    return get_districts(db)


@router.get("/elected-representatives", response_model=RepresentativeListResponse)
def list_representatives(
    db: Session = Depends(get_db),
    role: str | None = None,
    district: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> RepresentativeListResponse:
    query = select(ElectedRepresentative).where(ElectedRepresentative.active.is_(True))
    if role:
        query = query.where(ElectedRepresentative.role == role)
    if district:
        query = query.where(ElectedRepresentative.district == district)
    query = query.order_by(ElectedRepresentative.name)

    all_rows = db.scalars(query).all()
    total = len(all_rows)
    offset = (page - 1) * page_size
    page_rows = all_rows[offset:offset + page_size]

    items = [
        RepresentativeDetail(
            id=r.id, name=r.name, name_ml=r.name_ml, role=r.role.value,
            constituency_name=r.constituency_name, constituency_name_ml=r.constituency_name_ml,
            district=r.district, party=r.party, photo_url=r.photo_url,
            email=r.email, phone=r.phone, twitter_handle=r.twitter_handle, active=r.active,
        )
        for r in page_rows
    ]
    return RepresentativeListResponse(
        items=items,
        pagination=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/elected-representatives/by-ward/{ward_id}", response_model=list[RepresentativeBrief])
def representatives_by_ward(ward_id: str, db: Session = Depends(get_db)) -> list[RepresentativeBrief]:
    return get_representatives_for_ward(db, ward_id)


@router.get("/elected-representatives/{rep_id}", response_model=RepresentativeDetail)
def get_representative(rep_id: UUID, db: Session = Depends(get_db)) -> RepresentativeDetail:
    rep = db.scalar(select(ElectedRepresentative).where(ElectedRepresentative.id == rep_id))
    if not rep:
        raise HTTPException(status_code=404, detail="Representative not found")
    return RepresentativeDetail(
        id=rep.id, name=rep.name, name_ml=rep.name_ml, role=rep.role.value,
        constituency_name=rep.constituency_name, constituency_name_ml=rep.constituency_name_ml,
        district=rep.district, party=rep.party, photo_url=rep.photo_url,
        email=rep.email, phone=rep.phone, twitter_handle=rep.twitter_handle, active=rep.active,
    )


# ── Escalation ────────────────────���──────────────────────────────────


@router.post("/reports/{report_id}/escalate-to-representative", response_model=EscalateResponse)
def escalate_to_representative(report_id: str, db: Session = Depends(get_db)) -> EscalateResponse:
    # Fetch report
    report = db.scalar(select(Report).where(Report.public_id == report_id))
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    reps = get_representatives_for_ward(db, report.ward_id)
    if not reps:
        raise HTTPException(status_code=404, detail="No elected representatives found for this ward")

    share_url = build_share_url(settings.web_base_url, report.public_id)
    category = report.category_final.value.replace("_", " ").title()
    location = report.locality or report.address_text or f"{report.public_lat},{report.public_lon}"

    escalated_to: list[RepresentativeBrief] = []
    for rep in reps:
        # Look up full rep for email
        full_rep = db.scalar(select(ElectedRepresentative).where(ElectedRepresentative.id == rep.id))
        if full_rep and full_rep.email:
            subject = f"Civic Issue Escalation: {category} in {full_rep.constituency_name} [{report.public_id}]"
            body = (
                f"Dear {full_rep.name},\n\n"
                f"A civic issue in your constituency requires attention:\n\n"
                f"Report ID: {report.public_id}\n"
                f"Category: {category}\n"
                f"Location: {location}\n"
                f"Ward: {report.ward_id or 'N/A'}\n"
                f"Status: {report.status.value}\n"
                f"Evidence & Details: {share_url}\n\n"
                f"This issue was reported by a citizen via Ente Nadu.\n\n"
                f"Regards,\n{settings.app_name}"
            )
            send_email_sendgrid([full_rep.email], [], subject, body)
            escalated_to.append(rep)

    add_report_event(
        db, report_id=report.id,
        event_type="report.escalated_to_representative",
        payload={"representatives": [str(r.id) for r in escalated_to]},
        actor="citizen",
    )
    db.commit()

    return EscalateResponse(
        escalated_to=escalated_to,
        message=f"Escalated to {len(escalated_to)} representative(s)",
    )


# ── Admin: Import ────────────────────────────────────────────────────


@router.post("/admin/elected-representatives/import", response_model=RepresentativeImportResponse)
def import_representatives(
    payload: RepresentativeImportRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> RepresentativeImportResponse:
    imported = 0
    updated = 0
    ward_links = 0

    for item in payload.representatives:
        # Check if exists by name + role + constituency
        existing = db.scalar(
            select(ElectedRepresentative).where(
                ElectedRepresentative.name == item.name,
                ElectedRepresentative.role == item.role,
                ElectedRepresentative.constituency_name == item.constituency_name,
            )
        )
        if existing:
            # Update fields
            existing.name_ml = item.name_ml or existing.name_ml
            existing.party = item.party or existing.party
            existing.district = item.district or existing.district
            existing.photo_url = item.photo_url or existing.photo_url
            existing.email = item.email or existing.email
            existing.phone = item.phone or existing.phone
            existing.twitter_handle = item.twitter_handle or existing.twitter_handle
            existing.constituency_name_ml = item.constituency_name_ml or existing.constituency_name_ml
            rep = existing
            updated += 1
        else:
            rep = ElectedRepresentative(
                name=item.name,
                name_ml=item.name_ml,
                role=item.role,
                constituency_name=item.constituency_name,
                constituency_name_ml=item.constituency_name_ml,
                district=item.district,
                party=item.party,
                photo_url=item.photo_url,
                email=item.email,
                phone=item.phone,
                twitter_handle=item.twitter_handle,
            )
            db.add(rep)
            db.flush()
            imported += 1

        # Create ward links
        for ward_id in item.ward_ids:
            existing_link = db.scalar(
                select(ElectedRepresentativeWard).where(
                    ElectedRepresentativeWard.representative_id == rep.id,
                    ElectedRepresentativeWard.ward_id == ward_id,
                )
            )
            if not existing_link:
                link = ElectedRepresentativeWard(
                    representative_id=rep.id,
                    ward_id=ward_id,
                    local_body_code=item.local_body_code,
                )
                db.add(link)
                ward_links += 1

    db.commit()
    logger.info("Elected rep import: %d imported, %d updated, %d ward links", imported, updated, ward_links)

    return RepresentativeImportResponse(
        imported=imported, updated=updated, ward_links_created=ward_links,
    )
