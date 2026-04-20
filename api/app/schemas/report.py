from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, conint, field_validator, model_validator

from app.models.enums import Category, FlagReason, ModerationState, ReportStatus
from app.schemas.accountability import RepresentativeBrief
from app.schemas.common import EventRead, PaginationMeta


class ClassifyPreviewRequest(BaseModel):
    image_base64: str = Field(description="Base64 encoded compressed image", max_length=10_000_000)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)


class ClassifySuggestion(BaseModel):
    category: Category
    confidence: float


class ClassifyPreviewResponse(BaseModel):
    top_3_categories: list[ClassifySuggestion]
    confidence: float
    quick_summary: str


class UploadUrlRequest(BaseModel):
    media_type: str = Field(pattern="^(image|video)$")
    file_ext: str = Field(default="jpg")


class UploadUrlResponse(BaseModel):
    media_key: str
    upload_url: str
    public_url: str


class ReportCreateRequest(BaseModel):
    lat: float = Field(ge=-90, le=90, description="Latitude in decimal degrees")
    lon: float = Field(ge=-180, le=180, description="Longitude in decimal degrees")
    category_final: Category
    capture_origin: str = Field(default="camera", description="Must be camera for live capture flow")
    captured_at: datetime
    gps_accuracy_m: float | None = Field(default=None, ge=0, le=5000)
    manual_issue_label: str | None = Field(default=None, max_length=120)
    description_user: str | None = Field(default=None, max_length=2000)
    media_keys: list[str] = Field(default_factory=list)
    device_id: str = Field(min_length=4, max_length=128)
    auth_token: str | None = None

    @field_validator("media_keys")
    @classmethod
    def validate_media_keys(cls, value: list[str]) -> list[str]:
        if len(value) == 0:
            raise ValueError("at least one media key is required")
        if len(value) > 5:
            raise ValueError("maximum 5 media items")
        return value

    @field_validator("capture_origin")
    @classmethod
    def validate_capture_origin(cls, value: str) -> str:
        if value.lower() != "camera":
            raise ValueError("capture_origin must be camera")
        return "camera"

    @model_validator(mode="after")
    def validate_manual_issue_label(self) -> "ReportCreateRequest":
        if self.category_final == Category.OTHER and not self.manual_issue_label:
            raise ValueError("manual_issue_label is required when category_final is other")
        if self.category_final != Category.OTHER and self.manual_issue_label:
            raise ValueError("manual_issue_label is allowed only when category_final is other")
        return self


class NotifyActions(BaseModel):
    email: str
    whatsapp: str


class ReportCreateResponse(BaseModel):
    report_id: UUID
    public_id: str
    token_no: str
    share_url: str
    notify_actions: NotifyActions
    status: ReportStatus


class ReportCard(BaseModel):
    id: UUID
    public_id: str
    token_no: str
    category: Category
    status: ReportStatus
    severity_ai: int | None
    confidence: float | None
    priority_score: float
    created_at: datetime
    public_lat: float
    public_lon: float
    jurisdiction_id: UUID | None
    ward_id: str | None
    zone_id: str | None


class ReportListResponse(BaseModel):
    items: list[ReportCard]
    pagination: PaginationMeta


class MediaRead(BaseModel):
    id: UUID
    media_type: str
    public_url: str | None
    thumbnail_url: str | None
    metadata: dict[str, Any] | None


class ReportDetailResponse(BaseModel):
    id: UUID
    public_id: str
    token_no: str
    cluster_id: UUID | None
    created_at: datetime
    captured_at: datetime
    capture_origin: str
    gps_accuracy_m: float | None
    lat: float
    lon: float
    public_lat: float
    public_lon: float
    address_text: str | None
    locality: str | None
    ward_id: str | None
    ward_name: str | None
    zone_id: str | None
    zone_name: str | None
    jurisdiction_id: UUID | None
    category_ai: Category | None
    category_final: Category
    confidence: float | None
    severity_ai: int | None
    tags: dict[str, Any] | None
    description_ai: str | None
    description_user: str | None
    manual_issue_label: str | None
    priority_score: float
    status: ReportStatus
    moderation_state: ModerationState
    media: list[MediaRead]
    events: list[EventRead]
    elected_representatives: list[RepresentativeBrief] = Field(default_factory=list)


class ResponsibleOwnerRead(BaseModel):
    official_user_id: UUID
    display_name: str | None
    designation: str | None
    role: str


class ResponsibleContactRead(BaseModel):
    id: UUID
    name: str
    designation: str | None
    email: str | None
    phone: str | None
    is_escalation_contact: bool


class ReportResponsibleResponse(BaseModel):
    report_id: UUID
    public_id: str
    department_name: str | None
    owner: ResponsibleOwnerRead | None
    contacts: list[ResponsibleContactRead]
    assigned_at: datetime | None


class ReportTokenResponse(BaseModel):
    report_id: UUID
    public_id: str
    token_no: str


class FlagCreateRequest(BaseModel):
    reason: FlagReason
    comment: str | None = Field(default=None, max_length=600)


class FlagCreateResponse(BaseModel):
    ticket_id: UUID
    moderation_state: ModerationState


class NotifyEmailResponse(BaseModel):
    to: list[str]
    cc: list[str]
    subject: str
    body: str
    attachment_links: list[str]


class NotifyWhatsAppResponse(BaseModel):
    message: str
    deep_link: str


class AdminStatusPatchRequest(BaseModel):
    status: ReportStatus


class AdminModerationPatchRequest(BaseModel):
    moderation_state: ModerationState


class RoutingRuleUpsertRequest(BaseModel):
    category: Category
    ward_id: str | None = None
    zone_id: str | None = None
    department_name: str
    email_to: list[str]
    email_cc: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] | None = None


class WardsImportRequest(BaseModel):
    features_geojson: dict[str, Any]


class AbuseRateLimitInfo(BaseModel):
    device_daily_count: conint(ge=0)
    ip_daily_count: conint(ge=0)
    allowed: bool


class WardMetric(BaseModel):
    ward_id: str | None
    zone_id: str | None
    open_reports: int
    total_reports: int
    notify_events: int


class WardMetricsResponse(BaseModel):
    items: list[WardMetric]
