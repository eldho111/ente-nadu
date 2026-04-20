from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import (
    Category,
    JurisdictionType,
    Locale,
    NotificationChannel,
    NotificationStatus,
    OfficialRole,
    ReportStatus,
)
from app.schemas.common import PaginationMeta


class LocalesResponse(BaseModel):
    locales: list[Locale]


class BrandingResponse(BaseModel):
    app_name: str
    region_label: str
    locales: list[Locale]


class RuntimeMetaResponse(BaseModel):
    app_name: str
    env: str
    web_mode: str
    web_runtime_mode: str
    build_stamp: str
    worker_queues: str
    pwa_enabled: bool
    api_base_visible: str


class JurisdictionRead(BaseModel):
    id: UUID
    code: str
    name: str
    type: JurisdictionType
    parent_id: UUID | None
    state: str | None
    district: str | None
    city: str | None


class JurisdictionListResponse(BaseModel):
    items: list[JurisdictionRead]


class ReportSubscribeRequest(BaseModel):
    device_id: str | None = Field(default=None, max_length=128)
    email: str | None = Field(default=None, max_length=255)
    whatsapp_number: str | None = Field(default=None, max_length=32)
    channels: list[NotificationChannel] = Field(default_factory=lambda: [NotificationChannel.PUSH])
    locale: Locale = Locale.EN


class ReportSubscribeResponse(BaseModel):
    subscription_id: UUID
    channels: list[NotificationChannel]


class ReopenRequest(BaseModel):
    reason: str = Field(max_length=160)
    comment: str | None = Field(default=None, max_length=600)


class NotificationRead(BaseModel):
    id: UUID
    report_id: UUID
    channel: NotificationChannel
    status: NotificationStatus
    message: str | None
    created_at: datetime
    read_at: datetime | None


class NotificationListResponse(BaseModel):
    items: list[NotificationRead]
    pagination: PaginationMeta


class NotificationReadPatchResponse(BaseModel):
    id: UUID
    status: NotificationStatus


class OpsAuthLoginRequest(BaseModel):
    id_token: str = Field(min_length=6)


class OpsAuthLoginResponse(BaseModel):
    firebase_uid: str
    role: OfficialRole
    department_name: str | None
    display_name: str | None


class OpsReportCard(BaseModel):
    id: UUID
    public_id: str
    category: str
    status: ReportStatus
    severity_ai: int | None
    confidence: float | None
    jurisdiction_id: UUID | None
    ward_id: str | None
    zone_id: str | None
    locality: str | None
    created_at: datetime
    assigned_official_id: UUID | None


class OpsReportListResponse(BaseModel):
    items: list[OpsReportCard]
    pagination: PaginationMeta


class OpsClaimResponse(BaseModel):
    assignment_id: UUID
    report_id: UUID


class OpsStatusPatchRequest(BaseModel):
    status: ReportStatus
    note: str | None = Field(default=None, max_length=600)


class ResolutionProofCreateRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)
    media_url: str | None = Field(default=None, max_length=1024)


class ResolutionProofCreateResponse(BaseModel):
    proof_id: UUID
    report_id: UUID


class OpsMetricsItem(BaseModel):
    status: ReportStatus
    count: int


class OpsMetricsResponse(BaseModel):
    items: list[OpsMetricsItem]


class OpsRoutingChainContact(BaseModel):
    id: UUID
    name: str
    designation: str | None
    email: str | None
    phone: str | None
    is_escalation_contact: bool


class OpsRoutingChainResponse(BaseModel):
    jurisdiction_id: str | None
    category: Category
    department_name: str | None
    email_to: list[str]
    email_cc: list[str]
    contacts: list[OpsRoutingChainContact]


class OpsEscalateRequest(BaseModel):
    note: str | None = Field(default=None, max_length=600)


class OfficialUserUpsertRequest(BaseModel):
    firebase_uid: str = Field(min_length=4, max_length=128)
    email: str | None = Field(default=None, max_length=255)
    display_name: str | None = Field(default=None, max_length=255)
    department_name: str | None = Field(default=None, max_length=255)
    role: OfficialRole
    active: bool = True
