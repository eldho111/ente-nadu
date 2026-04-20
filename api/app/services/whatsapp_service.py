"""Core WhatsApp bot logic: conversation state machine, report creation."""

import base64
import json
import logging
from datetime import datetime, timezone

from geoalchemy2 import WKTElement
from redis import Redis
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.enums import Category, MediaType, NotificationChannel
from app.models.media import Media
from app.models.report import Report
from app.schemas.whatsapp import WhatsAppContact, WhatsAppMessage, WhatsAppWebhookPayload
from app.services import ai_service
from app.services.event_service import add_report_event
from app.services.id_service import generate_public_id, generate_token_number
from app.services.location_service import apply_location_jitter, reverse_geocode_nominatim
from app.services.notification_service import upsert_subscription
from app.services.priority_service import compute_priority_score, nearby_duplicate_density
from app.services.queue_service import enqueue_report_classification
from app.services.responsibility_service import upsert_report_responsibility_snapshot
from app.services.routing_service import lookup_jurisdiction_id, lookup_ward_zone, resolve_routing_rule
from app.services.storage_service import upload_bytes_to_raw, raw_object_url
from app.services.whatsapp_meta_api import download_media, mark_as_read, send_text_message

settings = get_settings()
logger = logging.getLogger(__name__)

_redis: Redis | None = None


def _get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


# ── Multi-Language Bot Messages ──────────────────────────────────────

MESSAGES = {
    "welcome": {
        "en": (
            "Welcome to Civic Pulse!\n\n"
            "To report a civic issue:\n"
            "1. Send a photo of the problem\n"
            "2. Share your location when prompted\n\n"
            "Commands:\n"
            "- 'status RPT-XXXX' to check a report\n"
            "- 'en' / 'kn' / 'ml' to switch language"
        ),
        "kn": (
            "ಸಿವಿಕ್ ಪಲ್ಸ್‌ಗೆ ಸ್ವಾಗತ!\n\n"
            "ನಾಗರಿಕ ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಲು:\n"
            "1. ಸಮಸ್ಯೆಯ ಫೋಟೋ ಕಳುಹಿಸಿ\n"
            "2. ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಹಂಚಿಕೊಳ್ಳಿ\n\n"
            "ಆಜ್ಞೆಗಳು: 'status RPT-XXXX' / 'en' / 'kn' / 'ml'"
        ),
        "ml": (
            "സിവിക് പൾസിലേക്ക് സ്വാഗതം!\n\n"
            "ഒരു പ്രശ്നം റിപ്പോർട്ട് ചെയ്യാൻ:\n"
            "1. പ്രശ്നത്തിന്റെ ഫോട്ടോ അയക്കുക\n"
            "2. ലൊക്കേഷൻ പങ്കിടുക\n\n"
            "കമാൻഡുകൾ: 'status RPT-XXXX' / 'en' / 'kn' / 'ml'"
        ),
    },
    "photo_received": {
        "en": "Got your photo! Now please share your location:\n\nTap the attachment icon (📎) → Location → Send your current location",
        "kn": "ನಿಮ್ಮ ಫೋಟೋ ಸ್ವೀಕರಿಸಲಾಗಿದೆ!\n\nಈಗ ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಹಂಚಿಕೊಳ್ಳಿ:\nಅಟ್ಯಾಚ್‌ಮೆಂಟ್ (📎) → ಸ್ಥಳ → ಪ್ರಸ್ತುತ ಸ್ಥಳ ಕಳುಹಿಸಿ",
        "ml": "ഫോട്ടോ ലഭിച്ചു!\n\nഇപ്പോൾ ലൊക്കേഷൻ പങ്കിടുക:\nഅറ്റാച്ച്‌മെന്റ് (📎) → ലൊക്കേഷൻ → നിലവിലെ ലൊക്കേഷൻ അയക്കുക",
    },
    "report_created": {
        "en": "Report created!\n\nCategory: {category}\nID: {public_id}\nToken: {token_no}\nTrack: {share_url}\n\nWe'll send you updates here when the status changes.",
        "kn": "ವರದಿ ರಚಿಸಲಾಗಿದೆ!\n\nವರ್ಗ: {category}\nID: {public_id}\nಟೋಕನ್: {token_no}\nಟ್ರ್ಯಾಕ್: {share_url}\n\nಸ್ಥಿತಿ ಬದಲಾದಾಗ ನಾವು ನಿಮಗೆ ತಿಳಿಸುತ್ತೇವೆ.",
        "ml": "റിപ്പോർട്ട് സൃഷ്ടിച്ചു!\n\nവിഭാഗം: {category}\nID: {public_id}\nടോക്കൺ: {token_no}\nട്രാക്ക്: {share_url}\n\nസ്റ്റാറ്റസ് മാറുമ്പോൾ ഞങ്ങൾ അറിയിക്കും.",
    },
    "need_photo_first": {
        "en": "Please send a photo of the civic issue first, then share your location.",
        "kn": "ದಯವಿಟ್ಟು ಮೊದಲು ಸಮಸ್ಯೆಯ ಫೋಟೋ ಕಳುಹಿಸಿ, ನಂತರ ಸ್ಥಳ ಹಂಚಿಕೊಳ್ಳಿ.",
        "ml": "ആദ്യം പ്രശ്നത്തിന്റെ ഫോട്ടോ അയക്കുക, പിന്നെ ലൊക്കേഷൻ പങ്കിടുക.",
    },
    "rate_limited": {
        "en": "You've reached the daily reporting limit ({limit} reports). Please try again tomorrow.",
        "kn": "ನೀವು ದೈನಂದಿನ ವರದಿ ಮಿತಿಯನ್ನು ತಲುಪಿದ್ದೀರಿ ({limit}). ನಾಳೆ ಪ್ರಯತ್ನಿಸಿ.",
        "ml": "ദിവസ റിപ്പോർട്ട് പരിധി ({limit}) എത്തി. നാളെ ശ്രമിക്കുക.",
    },
    "error": {
        "en": "Sorry, something went wrong processing your report. Please try again.",
        "kn": "ಕ್ಷಮಿಸಿ, ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        "ml": "ക്ഷമിക്കണം, എന്തോ തെറ്റ് സംഭവിച്ചു. വീണ്ടും ശ്രമിക്കുക.",
    },
    "photo_download_failed": {
        "en": "Could not download your photo. Please try sending it again.",
        "kn": "ನಿಮ್ಮ ಫೋಟೋ ಡೌನ್‌ಲೋಡ್ ಆಗಲಿಲ್ಲ. ಮತ್ತೆ ಕಳುಹಿಸಿ.",
        "ml": "ഫോട്ടോ ഡൗൺലോഡ് ചെയ്യാനായില്ല. വീണ്ടും അയക്കുക.",
    },
    "lang_changed": {
        "en": "Language set to English.",
        "kn": "ಭಾಷೆ ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.",
        "ml": "ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി.",
    },
    "unsupported": {
        "en": "Please send a photo to report a civic issue.",
        "kn": "ನಾಗರಿಕ ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಲು ಫೋಟೋ ಕಳುಹಿಸಿ.",
        "ml": "ഒരു പ്രശ്നം റിപ്പോർട്ട് ചെയ്യാൻ ഫോട്ടോ അയക്കുക.",
    },
}

LANG_KEYWORDS = {
    "en": "en", "english": "en",
    "kn": "kn", "kannada": "kn",
    "ml": "ml", "malayalam": "ml",
}


def _msg(key: str, lang: str, **kwargs) -> str:
    templates = MESSAGES.get(key, {})
    template = templates.get(lang, templates.get("en", ""))
    return template.format(**kwargs) if kwargs else template


# ── Redis State Helpers ──────────────────────────────────────────────

def _conv_key(phone: str) -> str:
    return f"wa:conv:{phone}"


def _img_key(phone: str, msg_id: str) -> str:
    return f"wa:img:{phone}:{msg_id}"


def _seen_key(msg_id: str) -> str:
    return f"wa:seen:{msg_id}"


def _rate_key(phone: str) -> str:
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"wa:rate:{phone}:{date}"


def _lang_key(phone: str) -> str:
    return f"wa:lang:{phone}"


def _get_lang(phone: str) -> str:
    r = _get_redis()
    return r.get(_lang_key(phone)) or "en"


def _set_lang(phone: str, lang: str) -> None:
    _get_redis().set(_lang_key(phone), lang)


def _get_state(phone: str) -> dict | None:
    r = _get_redis()
    raw = r.get(_conv_key(phone))
    if raw:
        return json.loads(raw)
    return None


def _set_state(phone: str, state: dict) -> None:
    r = _get_redis()
    ttl = settings.whatsapp_conversation_ttl_seconds
    r.setex(_conv_key(phone), ttl, json.dumps(state))


def _clear_state(phone: str) -> None:
    _get_redis().delete(_conv_key(phone))


def _is_seen(msg_id: str) -> bool:
    r = _get_redis()
    return r.exists(_seen_key(msg_id)) > 0


def _mark_seen(msg_id: str) -> None:
    _get_redis().setex(_seen_key(msg_id), 86400, "1")


def _check_rate_limit(phone: str) -> bool:
    """Returns True if the user is within rate limits."""
    r = _get_redis()
    key = _rate_key(phone)
    count = r.get(key)
    return (int(count) if count else 0) < settings.whatsapp_daily_limit_per_number


def _increment_rate(phone: str) -> None:
    r = _get_redis()
    key = _rate_key(phone)
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, 86400)
    pipe.execute()


# ── Main Entry Point ─────────────────────────────────────────────────

def handle_incoming_webhook(payload: WhatsAppWebhookPayload, db: Session) -> None:
    """Process all messages in a webhook payload."""
    for entry in payload.entry:
        for change in entry.changes:
            if change.field != "messages":
                continue
            contacts = {c.wa_id: c for c in change.value.contacts}
            for message in change.value.messages:
                phone = message.from_
                contact = contacts.get(phone, WhatsAppContact(wa_id=phone))
                try:
                    _process_single_message(message, contact, db)
                except Exception:
                    logger.exception("Error processing WhatsApp message %s from %s", message.id, phone)


def _process_single_message(message: WhatsAppMessage, contact: WhatsAppContact, db: Session) -> None:
    phone = message.from_
    msg_id = message.id

    # Idempotency
    if _is_seen(msg_id):
        return
    _mark_seen(msg_id)

    lang = _get_lang(phone)
    state = _get_state(phone)

    if message.type == "image":
        _handle_image(phone, message, contact, lang)
    elif message.type == "location":
        _handle_location(phone, message, contact, lang, state, db)
    elif message.type == "text" and message.text:
        _handle_text(phone, message, lang, db)
    else:
        send_text_message(phone, _msg("unsupported", lang))

    mark_as_read(msg_id)


# ── Message Handlers ─────────────────────────────────────────────────

def _handle_image(phone: str, message: WhatsAppMessage, contact: WhatsAppContact, lang: str) -> None:
    if not message.image:
        return

    # Download image from Meta
    image_bytes = download_media(message.image.id)
    if not image_bytes:
        send_text_message(phone, _msg("photo_download_failed", lang))
        return

    # Store image in Redis for later use
    r = _get_redis()
    img_key = _img_key(phone, message.id)
    r.setex(img_key, settings.whatsapp_conversation_ttl_seconds, image_bytes)

    # Update conversation state
    _set_state(phone, {
        "state": "awaiting_location",
        "phone": phone,
        "sender_name": contact.profile.name,
        "image_redis_key": img_key,
        "media_message_id": message.id,
    })

    send_text_message(phone, _msg("photo_received", lang))


def _handle_location(
    phone: str,
    message: WhatsAppMessage,
    contact: WhatsAppContact,
    lang: str,
    state: dict | None,
    db: Session,
) -> None:
    if not message.location:
        return

    if not state or state.get("state") != "awaiting_location":
        send_text_message(phone, _msg("need_photo_first", lang))
        return

    # Rate limit check
    if not _check_rate_limit(phone):
        send_text_message(phone, _msg("rate_limited", lang, limit=settings.whatsapp_daily_limit_per_number))
        _clear_state(phone)
        return

    # Prevent double submission
    _set_state(phone, {**state, "state": "processing"})

    # Retrieve image from Redis
    r = _get_redis()
    image_bytes = r.get(state["image_redis_key"])
    if not image_bytes:
        send_text_message(phone, _msg("error", lang))
        _clear_state(phone)
        return
    if isinstance(image_bytes, str):
        image_bytes = image_bytes.encode("latin-1")

    lat = message.location.latitude
    lon = message.location.longitude
    sender_name = state.get("sender_name", "")

    try:
        report = _create_report_from_whatsapp(
            phone=phone,
            image_bytes=image_bytes,
            lat=lat,
            lon=lon,
            sender_name=sender_name,
            db=db,
        )
        _increment_rate(phone)

        share_url = f"{settings.web_base_url.rstrip('/')}/reports/{report.public_id}"
        category_label = report.category_final.value.replace("_", " ").title()

        send_text_message(phone, _msg("report_created", lang,
            category=category_label,
            public_id=report.public_id,
            token_no=report.token_no,
            share_url=share_url,
        ))
    except Exception:
        logger.exception("Failed to create report from WhatsApp for %s", phone)
        send_text_message(phone, _msg("error", lang))
    finally:
        _clear_state(phone)
        # Clean up image from Redis
        r.delete(state.get("image_redis_key", ""))


def _handle_text(phone: str, message: WhatsAppMessage, lang: str, db: Session) -> None:
    text = (message.text.body if message.text else "").strip().lower()

    # Language switch
    if text in LANG_KEYWORDS:
        new_lang = LANG_KEYWORDS[text]
        _set_lang(phone, new_lang)
        send_text_message(phone, _msg("lang_changed", new_lang))
        return

    # Status check
    if text.startswith("status "):
        report_id = text.split(" ", 1)[1].strip().upper()
        _handle_status_check(phone, report_id, lang, db)
        return

    # Default: welcome/help
    send_text_message(phone, _msg("welcome", lang))


def _handle_status_check(phone: str, public_id: str, lang: str, db: Session) -> None:
    report = db.scalar(select(Report).where(Report.public_id == public_id))
    if not report:
        send_text_message(phone, f"Report {public_id} not found.")
        return

    share_url = f"{settings.web_base_url.rstrip('/')}/reports/{report.public_id}"
    category = report.category_final.value.replace("_", " ").title()
    status = report.status.value.replace("_", " ").title()
    created = report.created_at.strftime("%Y-%m-%d %H:%M") if report.created_at else "N/A"

    msg = (
        f"Report {report.public_id}\n"
        f"Status: {status}\n"
        f"Category: {category}\n"
        f"Submitted: {created}\n"
        f"Track: {share_url}"
    )
    send_text_message(phone, msg)


# ── Report Creation (reuses existing service layer) ──────────────────

def _create_report_from_whatsapp(
    phone: str,
    image_bytes: bytes,
    lat: float,
    lon: float,
    sender_name: str,
    db: Session,
) -> Report:
    now_utc = datetime.now(timezone.utc)

    # AI classification
    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    ai_result = ai_service.classify_preview(image_b64)

    # Upload image to S3
    media_key, raw_url = upload_bytes_to_raw(image_bytes, "image", "jpg")

    # Geocode
    geocode = reverse_geocode_nominatim(lat, lon)
    public_lat, public_lon = apply_location_jitter(lat, lon, settings.public_location_jitter_meters)

    # Ward / jurisdiction lookup
    ward_lookup = lookup_ward_zone(db, lat=lat, lon=lon)
    jurisdiction_id = lookup_jurisdiction_id(db, lat=lat, lon=lon)

    # Priority
    duplicate_density = nearby_duplicate_density(db, lat=lat, lon=lon, category=ai_result.category)
    priority_score = compute_priority_score(
        category=ai_result.category,
        severity=ai_result.severity,
        created_at=now_utc,
        duplicate_density=duplicate_density,
    )

    # Generate IDs (with collision retry via existing helpers)
    public_id = generate_public_id()
    token_no = generate_token_number()

    # Check uniqueness (simple — collisions are astronomically rare)
    for _ in range(5):
        exists = db.scalar(select(func.count()).select_from(Report).where(Report.public_id == public_id))
        if not exists:
            break
        public_id = generate_public_id()

    report = Report(
        public_id=public_id,
        token_no=token_no,
        user_id=None,
        device_id=f"whatsapp:{phone}",
        ip_address=None,
        captured_at=now_utc,
        lat=lat,
        lon=lon,
        gps_accuracy_m=None,
        public_lat=public_lat,
        public_lon=public_lon,
        geom=WKTElement(f"POINT({lon} {lat})", srid=4326),
        capture_origin="whatsapp",
        address_text=geocode.address_text,
        locality=geocode.locality,
        ward_id=ward_lookup.ward_id,
        ward_name=ward_lookup.ward_name,
        zone_id=ward_lookup.zone_id,
        zone_name=ward_lookup.zone_name,
        jurisdiction_id=jurisdiction_id,
        category_ai=ai_result.category,
        category_final=ai_result.category,
        confidence=ai_result.confidence,
        severity_ai=ai_result.severity,
        tags=ai_result.tags,
        description_ai=ai_result.summary,
        description_user=f"Reported via WhatsApp by {sender_name}" if sender_name else "Reported via WhatsApp",
        manual_issue_label=None,
        priority_score=priority_score,
    )
    db.add(report)
    db.flush()

    # Create media record
    media = Media(
        report_id=report.id,
        media_type=MediaType.IMAGE,
        raw_key=media_key,
        raw_url=raw_url,
    )
    db.add(media)

    # Audit events
    add_report_event(db, report_id=report.id, event_type="report.created", payload={
        "category": report.category_final.value,
        "media_count": 1,
        "token_no": report.token_no,
        "capture_origin": "whatsapp",
        "whatsapp_phone": phone,
    }, actor="whatsapp_bot")

    # Routing
    routing = resolve_routing_rule(db, report.category_final, report.ward_id, report.zone_id)
    add_report_event(db, report_id=report.id, event_type="report.routed", payload={
        "department_name": routing.department_name,
    }, actor="whatsapp_bot")
    upsert_report_responsibility_snapshot(db, report=report, department_name=routing.department_name)

    # Auto-subscribe this WhatsApp number for status updates
    upsert_subscription(
        db,
        report_id=report.id,
        user=None,
        device_id=f"whatsapp:{phone}",
        email=None,
        whatsapp_number=phone,
        channels=[NotificationChannel.WHATSAPP],
    )

    # Enqueue background classification
    add_report_event(db, report_id=report.id, event_type="report.classification.requested", actor="whatsapp_bot")
    db.commit()

    try:
        enqueue_report_classification(str(report.id))
    except Exception:
        logger.error("Failed to enqueue classification for WhatsApp report %s", report.id)

    return report
