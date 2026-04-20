import logging
from urllib.parse import quote

import requests

from app.core.config import get_settings
from app.models.report import Report
from app.services.routing_service import RoutingResult

logger = logging.getLogger(__name__)
settings = get_settings()


def build_share_url(web_base_url: str, public_id: str) -> str:
    return f"{web_base_url.rstrip('/')}/reports/{public_id}"


def build_email_payload(report: Report, routing: RoutingResult, share_url: str) -> dict:
    to = routing.email_to
    cc = routing.email_cc
    subject = f"Civic Issue Report {report.public_id} | {report.category_final.value.replace('_', ' ').title()}"

    lines = [
        "Dear Civic Department Team,",
        "",
        "Please find a citizen-reported civic issue below:",
        f"Report ID: {report.public_id}",
        f"Category: {report.category_final.value}",
        f"Severity (AI): {report.severity_ai if report.severity_ai is not None else 'N/A'}",
        f"Location: {report.address_text or f'{report.public_lat},{report.public_lon}'}",
        f"Ward/Zone: {report.ward_id or 'N/A'} / {report.zone_id or 'N/A'}",
        f"Summary: {report.description_ai or report.description_user or 'No summary available'}",
        "",
        f"Public Evidence Link: {share_url}",
        "",
        "Regards,",
        settings.app_name,
    ]

    return {
        "to": to,
        "cc": cc,
        "subject": subject,
        "body": "\n".join(lines),
    }


def build_whatsapp_payload(report: Report, share_url: str) -> dict:
    summary = report.description_ai or report.description_user or "Civic issue reported"
    message = (
        f"{report.category_final.value.replace('_', ' ').title()} reported in {settings.region_label}. "
        f"Report {report.public_id}. {summary[:140]}\n{share_url}"
    )
    deep_link = f"https://wa.me/?text={quote(message)}"
    return {"message": message, "deep_link": deep_link}


# ── Delivery Functions ──────────────────────────────────────────────


def send_email_sendgrid(to: list[str], cc: list[str], subject: str, body: str) -> bool:
    """Send email via SendGrid API. Returns True on success."""
    api_key = settings.sendgrid_api_key
    if not api_key:
        logger.warning("SendGrid API key not configured, skipping email delivery")
        return False

    personalizations = [{"to": [{"email": addr} for addr in to]}]
    if cc:
        personalizations[0]["cc"] = [{"email": addr} for addr in cc]

    payload = {
        "personalizations": personalizations,
        "from": {"email": settings.notify_from_email, "name": settings.notify_from_name},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body}],
    }

    try:
        resp = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        if resp.status_code in (200, 202):
            logger.info(f"Email sent to {to} via SendGrid")
            return True
        logger.error(f"SendGrid error {resp.status_code}: {resp.text[:200]}")
        return False
    except Exception as exc:
        logger.error(f"SendGrid delivery failed: {exc}")
        return False


def send_sms_twilio(to_phone: str, message: str) -> bool:
    """Send SMS via Twilio. Returns True on success."""
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.warning("Twilio credentials not configured, skipping SMS delivery")
        return False

    try:
        resp = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json",
            data={
                "To": to_phone,
                "From": settings.twilio_phone_number,
                "Body": message[:1600],
            },
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            timeout=10,
        )
        if resp.status_code == 201:
            logger.info(f"SMS sent to {to_phone} via Twilio")
            return True
        logger.error(f"Twilio SMS error {resp.status_code}: {resp.text[:200]}")
        return False
    except Exception as exc:
        logger.error(f"Twilio SMS delivery failed: {exc}")
        return False


def send_whatsapp_twilio(to_phone: str, message: str) -> bool:
    """Send WhatsApp message via Twilio. Returns True on success."""
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.warning("Twilio credentials not configured, skipping WhatsApp delivery")
        return False

    from_number = settings.whatsapp_from_number or settings.twilio_phone_number
    if not from_number:
        logger.warning("No WhatsApp from number configured")
        return False

    try:
        resp = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json",
            data={
                "To": f"whatsapp:{to_phone}",
                "From": f"whatsapp:{from_number}",
                "Body": message[:1600],
            },
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            timeout=10,
        )
        if resp.status_code == 201:
            logger.info(f"WhatsApp sent to {to_phone} via Twilio")
            return True
        logger.error(f"Twilio WhatsApp error {resp.status_code}: {resp.text[:200]}")
        return False
    except Exception as exc:
        logger.error(f"Twilio WhatsApp delivery failed: {exc}")
        return False


def deliver_email_notification(report: Report, routing: RoutingResult, share_url: str) -> bool:
    """Build and deliver an email notification. Returns True if sent."""
    payload = build_email_payload(report, routing, share_url)
    return send_email_sendgrid(
        to=payload["to"],
        cc=payload["cc"],
        subject=payload["subject"],
        body=payload["body"],
    )


def send_whatsapp_meta(to_phone: str, message: str) -> bool:
    """Send WhatsApp message via Meta Cloud API. Returns True on success."""
    if not settings.whatsapp_meta_phone_number_id or not settings.whatsapp_meta_api_token:
        return False
    from app.services.whatsapp_meta_api import send_text_message, send_template_message
    # Try regular text message first (works within 24h of user's last message)
    if send_text_message(to_phone, message):
        return True
    # Outside 24h window: use template message as fallback
    logger.info("Text message failed for %s, trying template", to_phone)
    return send_template_message(to_phone, "report_status_update", "en", [message[:1024]])


def send_whatsapp(to_phone: str, message: str) -> bool:
    """Send WhatsApp message. Prefers Meta Cloud API, falls back to Twilio."""
    if settings.whatsapp_meta_phone_number_id and settings.whatsapp_meta_api_token:
        return send_whatsapp_meta(to_phone, message)
    return send_whatsapp_twilio(to_phone, message)


def deliver_sms_notification(to_phone: str, report: Report, share_url: str) -> bool:
    """Send SMS status update to reporter."""
    message = (
        f"{settings.app_name}: Your report {report.public_id} "
        f"({report.category_final.value.replace('_', ' ')}) has been received. "
        f"Track: {share_url}"
    )
    return send_sms_twilio(to_phone, message)
