import hashlib
import json
import os
from datetime import datetime, timedelta, timezone
from uuid import NAMESPACE_URL, UUID, uuid5

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from geoalchemy2 import WKTElement
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.core.cache import WARD_METRICS, cache_get, cache_set
from app.core.config import get_settings
from app.core.dependencies import get_current_user_optional
from app.db.session import get_db
from app.models.enums import (
    Category,
    JurisdictionType,
    Locale,
    MediaType,
    ModerationState,
    NotificationChannel,
    NotificationStatus,
    NotifyChannel,
    ReportStatus,
)
from app.models.flag import Flag
from app.models.jurisdiction import Jurisdiction
from app.models.media import Media
from app.models.notify_event import NotifyEvent
from app.models.notification_delivery import NotificationDelivery
from app.models.notification_subscription import NotificationSubscription
from app.models.report import Report
from app.models.report_event import ReportEvent
from app.models.user import User, UserRole
from app.schemas.common import ApiMessage, PaginationMeta
from app.schemas.ops import (
    BrandingResponse,
    JurisdictionListResponse,
    JurisdictionRead,
    LocalesResponse,
    NotificationListResponse,
    NotificationRead,
    NotificationReadPatchResponse,
    ReopenRequest,
    ReportSubscribeRequest,
    ReportSubscribeResponse,
    RuntimeMetaResponse,
)
from app.schemas.report import (
    AbuseRateLimitInfo,
    ClassifyPreviewRequest,
    ClassifyPreviewResponse,
    ClassifySuggestion,
    FlagCreateRequest,
    FlagCreateResponse,
    MediaRead,
    NotifyActions,
    NotifyEmailResponse,
    NotifyWhatsAppResponse,
    ReportCard,
    ReportCreateRequest,
    ReportCreateResponse,
    ReportDetailResponse,
    ReportListResponse,
    ReportResponsibleResponse,
    ReportTokenResponse,
    WardMetric,
    WardMetricsResponse,
    UploadUrlRequest,
    UploadUrlResponse,
)
from app.services import ai_service
from app.services.abuse_service import get_abuse_counts, is_allowed_by_limits, is_duplicate_cooldown_hit
from app.services.event_service import add_report_event
from app.services.id_service import generate_public_id, generate_token_number
from app.services.location_service import apply_location_jitter, reverse_geocode_nominatim
from app.services.notification_service import auto_subscribe_reporter, queue_status_notifications, upsert_subscription
from app.services.notify_service import build_email_payload, build_share_url, build_whatsapp_payload
from app.services.priority_service import compute_priority_score, nearby_duplicate_density
from app.services.media_processing import blur_and_publish, fetch_raw_bytes
from app.services.responsibility_service import get_report_responsible_chain, upsert_report_responsibility_snapshot
from app.services.routing_service import lookup_jurisdiction_id, lookup_ward_zone, resolve_routing_rule
from app.services.storage_service import create_presigned_upload, raw_object_url
from app.services.accountability_service import get_representatives_for_ward
from app.services.auth_service import verify_firebase_token

router = APIRouter()
settings = get_settings()
limiter = Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)


def _client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else None


def _parse_report_identifier(identifier: str) -> tuple[str, UUID | str]:
    try:
        return "uuid", UUID(identifier)
    except ValueError:
        return "public", identifier


def _fetch_report(db: Session, identifier: str) -> Report:
    mode, value = _parse_report_identifier(identifier)
    if mode == "uuid":
        report = db.scalar(select(Report).where(Report.id == value))
    else:
        report = db.scalar(select(Report).where(Report.public_id == value))
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    return report


def _new_public_id(db: Session) -> str:
    # Generate candidates without pre-checking; rely on DB unique constraint
    # to catch the rare collision, handled at insert time with retry.
    for _ in range(12):
        candidate = generate_public_id()
        exists = db.scalar(select(func.count()).select_from(Report).where(Report.public_id == candidate))
        if not exists:
            return candidate
    raise HTTPException(status_code=500, detail="failed to allocate public id")


def _new_token_no(db: Session) -> str:
    for _ in range(20):
        candidate = generate_token_number()
        exists = db.scalar(select(func.count()).select_from(Report).where(Report.token_no == candidate))
        if not exists:
            return candidate
    raise HTTPException(status_code=500, detail="failed to allocate token number")


def _run_inline_pipeline(db: Session, report: Report, media_rows: list["Media"]) -> None:
    """Synchronous classification + media publishing.

    Runs AFTER the report row has been committed. Everything in here is
    best-effort — failures are logged and swallowed. The submitted
    report remains valid even if AI or R2 has a bad moment.
    """
    import structlog

    log = structlog.get_logger("api.pipeline")

    # Download the first image so we can both classify AND blur-publish
    # with a single round-trip to R2.
    primary_blob: bytes | None = None
    for media in media_rows:
        if media.media_type == MediaType.IMAGE:
            blob = fetch_raw_bytes(media.raw_key)
            if blob is not None:
                primary_blob = blob
                break

    # ── AI classification (fills category_ai, confidence, severity_ai,
    # description_ai, tags) ─────────────────────────────────────────
    ai_result: dict | None = None
    if primary_blob is not None:
        try:
            ai_result = ai_service.classify_from_media_blobs([primary_blob])
        except Exception as exc:
            log.warning("inline_classify_failed", report_id=str(report.id), detail=str(exc)[:160])

    if ai_result:
        try:
            report.category_ai = Category(ai_result.get("category", "other"))
        except ValueError:
            report.category_ai = Category.OTHER
        report.confidence = float(ai_result.get("confidence", 0.0))
        report.severity_ai = int(ai_result.get("severity", 0))
        report.tags = list(ai_result.get("tags", [])) or None
        summary = str(ai_result.get("summary", "")).strip()[:280]
        if summary:
            report.description_ai = summary

        add_report_event(
            db,
            report_id=report.id,
            event_type="report.classified",
            payload={
                "category_ai": report.category_ai.value,
                "confidence": report.confidence,
                "severity_ai": report.severity_ai,
            },
            actor="system",
        )

    # ── Blur + publish each image to the public bucket ──────────────
    for media in media_rows:
        if media.media_type != MediaType.IMAGE:
            continue
        # Re-use the primary blob when possible; otherwise download per-media.
        blob = primary_blob if media is media_rows[0] else fetch_raw_bytes(media.raw_key)
        if blob is None:
            log.warning(
                "inline_media_fetch_failed",
                report_id=str(report.id),
                media_id=str(media.id),
            )
            continue
        public_url, thumbnail_url = blur_and_publish(media.raw_key, blob)
        if public_url:
            media.public_key = media.raw_key
            media.public_url = public_url
            media.thumbnail_url = thumbnail_url
        else:
            log.warning(
                "inline_media_publish_failed",
                report_id=str(report.id),
                media_id=str(media.id),
            )

    try:
        db.commit()
    except Exception as exc:
        log.warning("inline_pipeline_commit_failed", report_id=str(report.id), detail=str(exc)[:160])
        db.rollback()


@router.post("/reports/classify-preview", response_model=ClassifyPreviewResponse)
@limiter.limit("30/minute")
def classify_preview(request: Request, payload: ClassifyPreviewRequest) -> ClassifyPreviewResponse:
    result = ai_service.classify_preview(payload.image_base64)
    return ClassifyPreviewResponse(
        top_3_categories=[
            ClassifySuggestion(category=category, confidence=confidence)
            for category, confidence in result.top_3
        ],
        confidence=result.confidence,
        quick_summary=result.summary,
    )


@router.post("/media/upload-url", response_model=UploadUrlResponse)
def create_media_upload_url(payload: UploadUrlRequest) -> UploadUrlResponse:
    media_key, upload_url, public_url = create_presigned_upload(payload.media_type, payload.file_ext)
    return UploadUrlResponse(media_key=media_key, upload_url=upload_url, public_url=public_url)


@router.get("/reports/abuse-check", response_model=AbuseRateLimitInfo)
def abuse_check(device_id: str, request: Request, db: Session = Depends(get_db)) -> AbuseRateLimitInfo:
    counts = get_abuse_counts(db, device_id=device_id, ip_address=_client_ip(request))
    return AbuseRateLimitInfo(
        device_daily_count=counts.device_daily_count,
        ip_daily_count=counts.ip_daily_count,
        allowed=is_allowed_by_limits(counts),
    )


@router.post("/reports", response_model=ReportCreateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def create_report(
    request: Request,
    payload: ReportCreateRequest,
    current_user=Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> ReportCreateResponse:
    ip_address = _client_ip(request)
    user = current_user
    now_utc = datetime.now(timezone.utc)
    captured_at = payload.captured_at if payload.captured_at.tzinfo else payload.captured_at.replace(tzinfo=timezone.utc)

    if payload.capture_origin != "camera":
        raise HTTPException(status_code=400, detail="only camera-origin captures are accepted")
    if captured_at < now_utc - timedelta(minutes=settings.capture_max_age_minutes):
        raise HTTPException(status_code=400, detail="captured media is stale; please capture again")
    if captured_at > now_utc + timedelta(minutes=5):
        raise HTTPException(status_code=400, detail="captured_at is in the future")
    if payload.category_final == Category.OTHER and not payload.manual_issue_label:
        raise HTTPException(status_code=400, detail="manual_issue_label is required for category 'other'")

    # Backward-compatible optional auth path if token is provided in body.
    if user is None and payload.auth_token:
        try:
            verified = verify_firebase_token(payload.auth_token)
        except ValueError:
            verified = None
        if verified is not None:
            user = db.scalar(select(User).where(User.firebase_uid == verified.firebase_uid))
            if user is None:
                user = User(
                    firebase_uid=verified.firebase_uid,
                    phone=verified.phone,
                    email=verified.email,
                    role=UserRole.CITIZEN.value,
                )
                db.add(user)
                db.flush()

    counts = get_abuse_counts(db, device_id=payload.device_id, ip_address=ip_address)
    if not is_allowed_by_limits(counts):
        raise HTTPException(status_code=429, detail="daily reporting limit reached")

    if is_duplicate_cooldown_hit(
        db,
        device_id=payload.device_id,
        category=payload.category_final,
        lat=payload.lat,
        lon=payload.lon,
    ):
        raise HTTPException(status_code=409, detail="possible duplicate report in cooldown window")

    geocode = reverse_geocode_nominatim(payload.lat, payload.lon)
    public_lat, public_lon = apply_location_jitter(
        payload.lat,
        payload.lon,
        settings.public_location_jitter_meters,
    )

    ward_lookup = lookup_ward_zone(db, lat=payload.lat, lon=payload.lon)
    jurisdiction_id = lookup_jurisdiction_id(db, lat=payload.lat, lon=payload.lon)
    duplicate_density = nearby_duplicate_density(
        db,
        lat=payload.lat,
        lon=payload.lon,
        category=payload.category_final,
    )
    priority_score = compute_priority_score(
        category=payload.category_final,
        severity=None,
        created_at=now_utc,
        duplicate_density=duplicate_density,
    )

    report = Report(
        public_id=_new_public_id(db),
        token_no=_new_token_no(db),
        user_id=user.id if user else None,
        device_id=payload.device_id,
        ip_address=ip_address,
        captured_at=captured_at,
        lat=payload.lat,
        lon=payload.lon,
        gps_accuracy_m=payload.gps_accuracy_m,
        public_lat=public_lat,
        public_lon=public_lon,
        geom=WKTElement(f"POINT({payload.lon} {payload.lat})", srid=4326),
        capture_origin=payload.capture_origin,
        address_text=geocode.address_text,
        locality=geocode.locality,
        ward_id=ward_lookup.ward_id,
        ward_name=ward_lookup.ward_name,
        zone_id=ward_lookup.zone_id,
        zone_name=ward_lookup.zone_name,
        jurisdiction_id=jurisdiction_id,
        category_final=payload.category_final,
        description_user=payload.description_user,
        manual_issue_label=payload.manual_issue_label,
        priority_score=priority_score,
    )
    db.add(report)
    db.flush()

    media_rows: list[Media] = []
    for key in payload.media_keys:
        media_type = MediaType.VIDEO if key.lower().endswith(("mp4", "mov", "webm")) else MediaType.IMAGE
        media_row = Media(
            report_id=report.id,
            media_type=media_type,
            raw_key=key,
            raw_url=raw_object_url(key),
        )
        db.add(media_row)
        media_rows.append(media_row)

    add_report_event(
        db,
        report_id=report.id,
        event_type="report.created",
        payload={
            "category": report.category_final.value,
            "media_count": len(media_rows),
            "token_no": report.token_no,
            "capture_origin": report.capture_origin,
        },
        actor="system",
    )
    routing = resolve_routing_rule(db, report.category_final, report.ward_id, report.zone_id)
    add_report_event(
        db,
        report_id=report.id,
        event_type="report.routed",
        payload={"department_name": routing.department_name},
        actor="system",
    )
    upsert_report_responsibility_snapshot(
        db,
        report=report,
        department_name=routing.department_name,
    )
    add_report_event(db, report_id=report.id, event_type="report.classification.requested", actor="system")

    # Auto-subscribe the reporting device for status updates.
    auto_subscribe_reporter(db, report)
    db.commit()

    # ── Inline pipeline ────────────────────────────────────────────
    # Used to enqueue a Redis job for a separate worker service. That
    # turned into a Railway-deployment minefield. Everything the worker
    # did now runs inline: fetch raw image, AI classify, blur + publish
    # to public bucket, update media.public_url, emit classified event.
    #
    # Total added latency: ~3-8 s (depends on AI provider + image size).
    # Each failure path logs + continues — a broken R2 or AI provider
    # must NOT block the submit from succeeding. The report row itself
    # is already committed above; this is all enrichment.
    _run_inline_pipeline(db, report, media_rows)

    share_url = build_share_url(settings.web_base_url, report.public_id)
    notify_actions = NotifyActions(
        email=f"{settings.app_base_url.rstrip('/')}/v1/reports/{report.public_id}/notify/email",
        whatsapp=f"{settings.app_base_url.rstrip('/')}/v1/reports/{report.public_id}/notify/whatsapp",
    )

    return ReportCreateResponse(
        report_id=report.id,
        public_id=report.public_id,
        token_no=report.token_no,
        share_url=share_url,
        notify_actions=notify_actions,
        status=report.status,
    )


@router.get("/reports", response_model=ReportListResponse)
def list_reports(
    db: Session = Depends(get_db),
    bbox: str | None = None,
    category: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    ward_id: str | None = None,
    from_ts: datetime | None = Query(default=None, alias="from"),
    to_ts: datetime | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> ReportListResponse:
    query = select(Report).where(Report.moderation_state != ModerationState.HIDDEN)

    if bbox:
        try:
            min_lon, min_lat, max_lon, max_lat = [float(x.strip()) for x in bbox.split(",")]
        except Exception as exc:
            raise HTTPException(status_code=400, detail="bbox must be minLon,minLat,maxLon,maxLat") from exc
        query = query.where(
            Report.public_lon >= min_lon,
            Report.public_lon <= max_lon,
            Report.public_lat >= min_lat,
            Report.public_lat <= max_lat,
        )

    if category:
        try:
            category_filter = Category(category)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="invalid category filter") from exc
        query = query.where(Report.category_final == category_filter)
    if status_filter:
        try:
            status_value = ReportStatus(status_filter)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="invalid status filter") from exc
        query = query.where(Report.status == status_value)
    if ward_id:
        query = query.where(Report.ward_id == ward_id)
    if from_ts:
        query = query.where(Report.created_at >= from_ts)
    if to_ts:
        query = query.where(Report.created_at <= to_ts)

    total = int(db.scalar(select(func.count()).select_from(query.subquery())) or 0)
    rows = db.scalars(
        query.order_by(Report.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()

    items = [
        ReportCard(
            id=row.id,
            public_id=row.public_id,
            token_no=row.token_no,
            category=row.category_final,
            status=row.status,
            severity_ai=row.severity_ai,
            confidence=row.confidence,
            priority_score=row.priority_score,
            created_at=row.created_at,
            public_lat=row.public_lat,
            public_lon=row.public_lon,
            jurisdiction_id=row.jurisdiction_id,
            ward_id=row.ward_id,
            zone_id=row.zone_id,
        )
        for row in rows
    ]

    return ReportListResponse(
        items=items,
        pagination=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/reports/metrics/wards", response_model=WardMetricsResponse)
def ward_metrics(db: Session = Depends(get_db)) -> WardMetricsResponse:
    # Check cache first (5-minute TTL)
    cached = cache_get(WARD_METRICS)
    if cached is not None:
        return WardMetricsResponse(
            items=[WardMetric(**item) for item in cached]
        )

    rows = db.execute(
        text(
            """
            WITH report_counts AS (
              SELECT ward_id, zone_id,
                     COUNT(*) AS total_reports,
                     COUNT(*) FILTER (WHERE status = 'open') AS open_reports
              FROM reports
              WHERE moderation_state != 'hidden'
              GROUP BY ward_id, zone_id
            ),
            notify_counts AS (
              SELECT r.ward_id, r.zone_id, COUNT(ne.id) AS notify_events
              FROM notify_events ne
              JOIN reports r ON r.id = ne.report_id
              WHERE r.moderation_state != 'hidden'
              GROUP BY r.ward_id, r.zone_id
            )
            SELECT rc.ward_id, rc.zone_id, rc.open_reports, rc.total_reports, COALESCE(nc.notify_events, 0) AS notify_events
            FROM report_counts rc
            LEFT JOIN notify_counts nc
              ON rc.ward_id IS NOT DISTINCT FROM nc.ward_id
             AND rc.zone_id IS NOT DISTINCT FROM nc.zone_id
            ORDER BY rc.total_reports DESC
            """
        )
    ).mappings().all()

    items = [
        WardMetric(
            ward_id=row["ward_id"],
            zone_id=row["zone_id"],
            open_reports=int(row["open_reports"] or 0),
            total_reports=int(row["total_reports"] or 0),
            notify_events=int(row["notify_events"] or 0),
        )
        for row in rows
    ]

    # Cache for 5 minutes
    cache_set(WARD_METRICS, [item.model_dump() for item in items], ttl=300)

    return WardMetricsResponse(items=items)


@router.get("/reports/{report_id}", response_model=ReportDetailResponse)
def get_report(report_id: str, db: Session = Depends(get_db)) -> ReportDetailResponse:
    report = _fetch_report(db, report_id)

    media_rows = db.scalars(select(Media).where(Media.report_id == report.id)).all()
    event_rows = db.scalars(
        select(ReportEvent).where(ReportEvent.report_id == report.id).order_by(ReportEvent.created_at.asc())
    ).all()
    reps = get_representatives_for_ward(db, report.ward_id)

    return ReportDetailResponse(
        id=report.id,
        public_id=report.public_id,
        token_no=report.token_no,
        cluster_id=report.cluster_id,
        created_at=report.created_at,
        captured_at=report.captured_at,
        capture_origin=report.capture_origin,
        gps_accuracy_m=report.gps_accuracy_m,
        lat=report.public_lat,
        lon=report.public_lon,
        public_lat=report.public_lat,
        public_lon=report.public_lon,
        address_text=report.locality or report.address_text,
        locality=report.locality,
        ward_id=report.ward_id,
        ward_name=report.ward_name,
        zone_id=report.zone_id,
        zone_name=report.zone_name,
        jurisdiction_id=report.jurisdiction_id,
        category_ai=report.category_ai,
        category_final=report.category_final,
        confidence=report.confidence,
        severity_ai=report.severity_ai,
        tags=report.tags,
        description_ai=report.description_ai,
        description_user=report.description_user,
        manual_issue_label=report.manual_issue_label,
        priority_score=report.priority_score,
        status=report.status,
        moderation_state=report.moderation_state,
        media=[
            MediaRead(
                id=m.id,
                media_type=m.media_type.value,
                public_url=m.public_url,
                thumbnail_url=m.thumbnail_url,
                metadata=m.metadata_json,
            )
            for m in media_rows
        ],
        events=[
            {
                "id": e.id,
                "event_type": e.event_type,
                "payload": e.payload,
                "actor": e.actor,
                "created_at": e.created_at,
            }
            for e in event_rows
        ],
        elected_representatives=reps,
    )


@router.get("/reports/{report_id}/token", response_model=ReportTokenResponse)
def get_report_token(report_id: str, db: Session = Depends(get_db)) -> ReportTokenResponse:
    report = _fetch_report(db, report_id)
    return ReportTokenResponse(report_id=report.id, public_id=report.public_id, token_no=report.token_no)


@router.get("/reports/{report_id}/responsible", response_model=ReportResponsibleResponse)
def get_report_responsible(report_id: str, db: Session = Depends(get_db)) -> ReportResponsibleResponse:
    report = _fetch_report(db, report_id)
    chain = get_report_responsible_chain(db, report=report)
    return ReportResponsibleResponse(
        report_id=report.id,
        public_id=report.public_id,
        department_name=chain["department_name"],
        owner=chain["owner"],
        contacts=chain["contacts"],
        assigned_at=chain["assigned_at"],
    )


@router.post("/reports/{report_id}/flags", response_model=FlagCreateResponse)
def create_flag(report_id: str, payload: FlagCreateRequest, db: Session = Depends(get_db)) -> FlagCreateResponse:
    report = _fetch_report(db, report_id)

    flag = Flag(
        report_id=report.id,
        reason=payload.reason,
        comment=payload.comment,
        created_by="public",
    )
    db.add(flag)
    report.moderation_state = ModerationState.FLAGGED

    add_report_event(
        db,
        report_id=report.id,
        event_type="report.flagged",
        payload={"reason": payload.reason.value},
        actor="public",
    )
    db.commit()

    return FlagCreateResponse(ticket_id=flag.id, moderation_state=report.moderation_state)


@router.post("/reports/{report_id}/notify/email", response_model=NotifyEmailResponse)
def notify_email(report_id: str, db: Session = Depends(get_db)) -> NotifyEmailResponse:
    report = _fetch_report(db, report_id)
    routing = resolve_routing_rule(db, report.category_final, report.ward_id, report.zone_id)
    share_url = build_share_url(settings.web_base_url, report.public_id)
    payload = build_email_payload(report, routing, share_url)

    payload_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    db.add(
        NotifyEvent(
            report_id=report.id,
            channel=NotifyChannel.EMAIL,
            payload_hash=payload_hash,
            payload=payload,
        )
    )
    add_report_event(db, report_id=report.id, event_type="report.routed", payload={"channel": "email"}, actor="system")
    db.commit()

    links = [m.public_url for m in db.scalars(select(Media).where(Media.report_id == report.id)).all() if m.public_url]
    return NotifyEmailResponse(
        to=payload["to"],
        cc=payload["cc"],
        subject=payload["subject"],
        body=payload["body"],
        attachment_links=links,
    )


@router.post("/reports/{report_id}/notify/whatsapp", response_model=NotifyWhatsAppResponse)
def notify_whatsapp(report_id: str, db: Session = Depends(get_db)) -> NotifyWhatsAppResponse:
    report = _fetch_report(db, report_id)
    share_url = build_share_url(settings.web_base_url, report.public_id)
    payload = build_whatsapp_payload(report, share_url)

    payload_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    db.add(
        NotifyEvent(
            report_id=report.id,
            channel=NotifyChannel.WHATSAPP,
            payload_hash=payload_hash,
            payload=payload,
        )
    )
    add_report_event(
        db,
        report_id=report.id,
        event_type="report.routed",
        payload={"channel": "whatsapp"},
        actor="system",
    )
    db.commit()

    return NotifyWhatsAppResponse(message=payload["message"], deep_link=payload["deep_link"])


@router.post("/reports/{report_id}/subscribe", response_model=ReportSubscribeResponse)
def subscribe_report(
    report_id: str,
    payload: ReportSubscribeRequest,
    request: Request,
    user=Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> ReportSubscribeResponse:
    report = _fetch_report(db, report_id)
    device_id = payload.device_id or request.headers.get("X-Device-Id")

    if user is None and not device_id and not payload.email and not payload.whatsapp_number:
        raise HTTPException(status_code=400, detail="device_id, email, whatsapp_number, or auth is required")

    subscription = upsert_subscription(
        db,
        report_id=report.id,
        user=user,
        device_id=device_id,
        email=payload.email,
        whatsapp_number=payload.whatsapp_number,
        channels=payload.channels,
    )
    add_report_event(
        db,
        report_id=report.id,
        event_type="report.notification.subscribed",
        payload={
            "subscription_id": str(subscription.id),
            "channels": list(subscription.channels or []),
        },
        actor=f"user:{user.id}" if user else "public",
    )
    db.commit()
    channels: list[NotificationChannel] = []
    for value in subscription.channels or []:
        try:
            channels.append(NotificationChannel(str(value)))
        except ValueError:
            continue
    return ReportSubscribeResponse(subscription_id=subscription.id, channels=channels)


@router.get("/notifications", response_model=NotificationListResponse)
def list_notifications(
    request: Request,
    device_id: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    user=Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> NotificationListResponse:
    resolved_device_id = device_id or request.headers.get("X-Device-Id")
    if user is None and not resolved_device_id:
        raise HTTPException(status_code=400, detail="device_id or authenticated user is required")

    query = select(NotificationDelivery).join(
        NotificationSubscription,
        NotificationSubscription.id == NotificationDelivery.subscription_id,
    )
    if user is not None and resolved_device_id:
        query = query.where(
            or_(
                NotificationSubscription.user_id == user.id,
                NotificationSubscription.device_id == resolved_device_id,
            )
        )
    elif user is not None:
        query = query.where(NotificationSubscription.user_id == user.id)
    else:
        query = query.where(NotificationSubscription.device_id == resolved_device_id)

    total = int(db.scalar(select(func.count()).select_from(query.subquery())) or 0)
    rows = db.scalars(
        query.order_by(NotificationDelivery.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    items = [
        NotificationRead(
            id=row.id,
            report_id=row.report_id,
            channel=row.channel,
            status=row.status,
            message=row.message,
            created_at=row.created_at,
            read_at=row.read_at,
        )
        for row in rows
    ]
    return NotificationListResponse(
        items=items,
        pagination=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.patch("/notifications/{notification_id}/read", response_model=NotificationReadPatchResponse)
def mark_notification_read(
    notification_id: UUID,
    request: Request,
    device_id: str | None = None,
    user=Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> NotificationReadPatchResponse:
    resolved_device_id = device_id or request.headers.get("X-Device-Id")
    query = (
        select(NotificationDelivery)
        .join(NotificationSubscription, NotificationSubscription.id == NotificationDelivery.subscription_id)
        .where(NotificationDelivery.id == notification_id)
    )
    if user is not None and resolved_device_id:
        query = query.where(
            or_(
                NotificationSubscription.user_id == user.id,
                NotificationSubscription.device_id == resolved_device_id,
            )
        )
    elif user is not None:
        query = query.where(NotificationSubscription.user_id == user.id)
    elif resolved_device_id:
        query = query.where(NotificationSubscription.device_id == resolved_device_id)
    else:
        raise HTTPException(status_code=400, detail="device_id or authenticated user is required")

    row = db.scalar(query)
    if row is None:
        raise HTTPException(status_code=404, detail="notification not found")

    row.status = NotificationStatus.READ
    row.read_at = datetime.now(timezone.utc)
    db.commit()
    return NotificationReadPatchResponse(id=row.id, status=row.status)


@router.post("/reports/{report_id}/reopen-request", response_model=ApiMessage)
def reopen_request(
    report_id: str,
    payload: ReopenRequest,
    user=Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> ApiMessage:
    report = _fetch_report(db, report_id)
    if report.status not in {ReportStatus.FIXED, ReportStatus.REJECTED}:
        raise HTTPException(status_code=400, detail="reopen is allowed only for fixed or rejected reports")

    report.status = ReportStatus.OPEN
    actor = f"user:{user.id}" if user else "public"

    add_report_event(
        db,
        report_id=report.id,
        event_type="report.reopen_requested",
        payload={"reason": payload.reason, "comment": payload.comment},
        actor=actor,
    )
    add_report_event(
        db,
        report_id=report.id,
        event_type="report.status_changed",
        payload={"status": report.status.value},
        actor=actor,
    )
    queue_status_notifications(
        db,
        report=report,
        actor=actor,
        web_base_url=settings.web_base_url,
    )
    db.commit()
    return ApiMessage(message="reopen request submitted")


@router.get("/jurisdictions", response_model=JurisdictionListResponse)
def list_jurisdictions(
    state: str | None = None,
    city: str | None = None,
    type_filter: str | None = Query(default=None, alias="type"),
    db: Session = Depends(get_db),
) -> JurisdictionListResponse:
    query = select(Jurisdiction)
    if state:
        query = query.where(Jurisdiction.state == state)
    if city:
        query = query.where(Jurisdiction.city == city)
    if type_filter:
        try:
            enum_type = JurisdictionType(type_filter)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="invalid jurisdiction type") from exc
        query = query.where(Jurisdiction.type == enum_type)

    rows = db.scalars(query.order_by(Jurisdiction.type.asc(), Jurisdiction.name.asc())).all()
    if rows:
        return JurisdictionListResponse(
            items=[
                JurisdictionRead(
                    id=row.id,
                    code=row.code,
                    name=row.name,
                    type=row.type,
                    parent_id=row.parent_id,
                    state=row.state,
                    district=row.district,
                    city=row.city,
                )
                for row in rows
            ]
        )

    ward_rows = db.execute(
        text(
            """
            SELECT ward_id, ward_name, zone_id, zone_name
            FROM wards
            ORDER BY ward_name ASC
            """
        )
    ).mappings().all()
    if type_filter and type_filter != JurisdictionType.WARD.value:
        return JurisdictionListResponse(items=[])
    fallback = [
        JurisdictionRead(
            id=uuid5(NAMESPACE_URL, f"ward:{row['ward_id']}"),
            code=f"ward:{row['ward_id']}",
            name=row["ward_name"],
            type=JurisdictionType.WARD,
            parent_id=None,
            state=state or "Karnataka",
            district=None,
            city=city or settings.region_label,
        )
        for row in ward_rows
    ]
    return JurisdictionListResponse(items=fallback)


@router.get("/meta/locales", response_model=LocalesResponse)
def get_locales() -> LocalesResponse:
    return LocalesResponse(locales=[Locale.EN, Locale.KN, Locale.ML])


@router.get("/meta/branding", response_model=BrandingResponse)
def get_branding() -> BrandingResponse:
    return BrandingResponse(
        app_name=settings.app_name,
        region_label=settings.region_label,
        locales=[Locale.EN, Locale.KN, Locale.ML],
    )


@router.get("/meta/runtime", response_model=RuntimeMetaResponse)
def get_runtime_meta() -> RuntimeMetaResponse:
    web_mode = os.getenv("WEB_RUNTIME_MODE", "unknown")
    pwa_enabled_raw = os.getenv("NEXT_PUBLIC_ENABLE_PWA", "false").strip().lower()
    pwa_enabled = pwa_enabled_raw in {"1", "true", "yes", "on"}
    return RuntimeMetaResponse(
        app_name=settings.app_name,
        env=settings.env,
        web_mode=web_mode,
        web_runtime_mode=web_mode,
        build_stamp=os.getenv("APP_BUILD_STAMP", "local"),
        worker_queues=os.getenv("WORKER_QUEUES", "classification"),
        pwa_enabled=pwa_enabled,
        api_base_visible=settings.app_base_url,
    )
