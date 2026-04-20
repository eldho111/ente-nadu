"""Pydantic models for Meta WhatsApp Cloud API webhook payloads."""

from __future__ import annotations

from pydantic import BaseModel, Field


class WhatsAppTextPayload(BaseModel):
    body: str


class WhatsAppImagePayload(BaseModel):
    id: str
    mime_type: str = ""
    sha256: str = ""


class WhatsAppLocationPayload(BaseModel):
    latitude: float
    longitude: float
    name: str | None = None
    address: str | None = None


class WhatsAppContext(BaseModel):
    """Present when the message is a reply (e.g. in a group)."""
    from_: str | None = Field(default=None, alias="from")
    id: str | None = None


class WhatsAppMessage(BaseModel):
    from_: str = Field(alias="from")
    id: str
    timestamp: str
    type: str  # text, image, location, sticker, audio, video, document, ...

    text: WhatsAppTextPayload | None = None
    image: WhatsAppImagePayload | None = None
    location: WhatsAppLocationPayload | None = None
    context: WhatsAppContext | None = None

    model_config = {"populate_by_name": True}


class WhatsAppProfile(BaseModel):
    name: str = ""


class WhatsAppContact(BaseModel):
    profile: WhatsAppProfile = WhatsAppProfile()
    wa_id: str = ""


class WhatsAppMetadata(BaseModel):
    display_phone_number: str = ""
    phone_number_id: str = ""


class WhatsAppValue(BaseModel):
    messaging_product: str = ""
    metadata: WhatsAppMetadata = WhatsAppMetadata()
    contacts: list[WhatsAppContact] = []
    messages: list[WhatsAppMessage] = []


class WhatsAppChange(BaseModel):
    value: WhatsAppValue = WhatsAppValue()
    field: str = ""


class WhatsAppEntry(BaseModel):
    id: str = ""
    changes: list[WhatsAppChange] = []


class WhatsAppWebhookPayload(BaseModel):
    object: str = ""
    entry: list[WhatsAppEntry] = []
