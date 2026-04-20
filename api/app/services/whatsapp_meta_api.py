"""Thin HTTP client for Meta WhatsApp Cloud API v21.0."""

import hashlib
import hmac
import logging

import requests

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v21.0"


def verify_webhook_signature(request_body: bytes, signature_header: str) -> bool:
    """Verify HMAC-SHA256 signature from Meta webhook."""
    if not settings.whatsapp_meta_app_secret:
        return True  # skip in dev when secret is not configured
    expected = hmac.new(
        settings.whatsapp_meta_app_secret.encode(),
        request_body,
        hashlib.sha256,
    ).hexdigest()
    received = signature_header.removeprefix("sha256=")
    return hmac.compare_digest(expected, received)


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.whatsapp_meta_api_token}",
        "Content-Type": "application/json",
    }


def download_media(media_id: str) -> bytes | None:
    """Download media from WhatsApp. Returns raw bytes or None on failure."""
    try:
        # Step 1: get the download URL
        resp = requests.get(f"{GRAPH_API_BASE}/{media_id}", headers=_headers(), timeout=10)
        resp.raise_for_status()
        media_url = resp.json().get("url")
        if not media_url:
            logger.error("No URL in media response for %s", media_id)
            return None

        # Step 2: download the actual file
        file_resp = requests.get(
            media_url,
            headers={"Authorization": f"Bearer {settings.whatsapp_meta_api_token}"},
            timeout=30,
        )
        file_resp.raise_for_status()
        return file_resp.content
    except Exception:
        logger.exception("Failed to download WhatsApp media %s", media_id)
        return None


def send_text_message(to_phone: str, text: str) -> bool:
    """Send a text message via WhatsApp Cloud API."""
    url = f"{GRAPH_API_BASE}/{settings.whatsapp_meta_phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": text},
    }
    try:
        resp = requests.post(url, json=payload, headers=_headers(), timeout=10)
        if resp.status_code in (200, 201):
            logger.info("WhatsApp text sent to %s", to_phone)
            return True
        logger.error("WhatsApp send error %d: %s", resp.status_code, resp.text[:300])
        return False
    except Exception:
        logger.exception("WhatsApp send failed to %s", to_phone)
        return False


def send_template_message(
    to_phone: str,
    template_name: str,
    language_code: str,
    parameters: list[str],
) -> bool:
    """Send a pre-approved template message (works outside 24h window)."""
    url = f"{GRAPH_API_BASE}/{settings.whatsapp_meta_phone_number_id}/messages"
    components = []
    if parameters:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": p} for p in parameters],
        })
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
            "components": components,
        },
    }
    try:
        resp = requests.post(url, json=payload, headers=_headers(), timeout=10)
        if resp.status_code in (200, 201):
            logger.info("WhatsApp template '%s' sent to %s", template_name, to_phone)
            return True
        logger.error("WhatsApp template error %d: %s", resp.status_code, resp.text[:300])
        return False
    except Exception:
        logger.exception("WhatsApp template send failed to %s", to_phone)
        return False


def mark_as_read(message_id: str) -> None:
    """Mark a message as read (blue checkmarks)."""
    url = f"{GRAPH_API_BASE}/{settings.whatsapp_meta_phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "status": "read",
        "message_id": message_id,
    }
    try:
        requests.post(url, json=payload, headers=_headers(), timeout=5)
    except Exception:
        pass  # best-effort, don't fail on read receipts
