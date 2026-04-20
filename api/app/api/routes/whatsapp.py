"""WhatsApp Cloud API webhook endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse, Response
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.whatsapp import WhatsAppWebhookPayload
from app.services.whatsapp_meta_api import verify_webhook_signature
from app.services.whatsapp_service import handle_incoming_webhook

router = APIRouter(tags=["whatsapp"])
settings = get_settings()
logger = logging.getLogger(__name__)


@router.get("/whatsapp/webhook")
def verify_webhook(
    hub_mode: str = Query(alias="hub.mode", default=""),
    hub_verify_token: str = Query(alias="hub.verify_token", default=""),
    hub_challenge: str = Query(alias="hub.challenge", default=""),
) -> PlainTextResponse:
    """Meta sends a GET request to verify the webhook URL during setup."""
    if (
        hub_mode == "subscribe"
        and settings.whatsapp_meta_webhook_verify_token
        and hub_verify_token == settings.whatsapp_meta_webhook_verify_token
    ):
        logger.info("WhatsApp webhook verified successfully")
        return PlainTextResponse(content=hub_challenge)
    raise HTTPException(status_code=403, detail="webhook verification failed")


@router.post("/whatsapp/webhook")
async def incoming_webhook(request: Request, db: Session = Depends(get_db)) -> Response:
    """Receive incoming WhatsApp messages from Meta Cloud API."""
    body = await request.body()

    # Verify webhook signature
    signature = request.headers.get("X-Hub-Signature-256", "")
    if settings.whatsapp_meta_app_secret and not verify_webhook_signature(body, signature):
        logger.warning("WhatsApp webhook signature verification failed")
        raise HTTPException(status_code=403, detail="invalid signature")

    # Parse payload
    try:
        payload = WhatsAppWebhookPayload.model_validate_json(body)
    except ValidationError:
        logger.warning("WhatsApp webhook payload parse error")
        return Response(status_code=200)

    # Process messages
    try:
        handle_incoming_webhook(payload, db)
    except Exception:
        logger.exception("WhatsApp webhook processing error")

    # Always return 200 — Meta retries on non-200 for up to 7 days
    return Response(status_code=200)
