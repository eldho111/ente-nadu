from datetime import datetime
from uuid import UUID, uuid4

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import Category, ModerationState, ReportStatus


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    public_id: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    token_no: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)

    user_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    cluster_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("clusters.id"), nullable=True, index=True)
    device_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    gps_accuracy_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    public_lat: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    public_lon: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    geom: Mapped[str | None] = mapped_column(Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True)
    capture_origin: Mapped[str] = mapped_column(String(16), nullable=False, default="camera")

    address_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    locality: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ward_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    ward_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    zone_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    zone_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    jurisdiction_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("jurisdictions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    category_ai: Mapped[Category | None] = mapped_column(Enum(Category, name="category_enum", native_enum=False), nullable=True)
    category_final: Mapped[Category] = mapped_column(Enum(Category, name="category_enum", native_enum=False), nullable=False, index=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    severity_ai: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # AI-generated tag list (e.g. ["urgent", "road_hazard"]). JSONB stores
    # any structure; historical rows may contain dicts, but new writes use lists.
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    description_ai: Mapped[str | None] = mapped_column(String(280), nullable=True)
    description_user: Mapped[str | None] = mapped_column(Text, nullable=True)
    manual_issue_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    priority_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, index=True)

    checkin_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_checkin_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status_enum", native_enum=False),
        nullable=False,
        default=ReportStatus.OPEN,
        index=True,
    )
    moderation_state: Mapped[ModerationState] = mapped_column(
        Enum(ModerationState, name="moderation_state_enum", native_enum=False),
        nullable=False,
        default=ModerationState.CLEAN,
        index=True,
    )


Index("ix_reports_status_category", Report.status, Report.category_final)
Index("ix_reports_status_created", Report.status, Report.created_at.desc())
Index("ix_reports_ward_status", Report.ward_id, Report.status)
Index("ix_reports_device_created", Report.device_id, Report.created_at.desc())
Index("ix_reports_moderation_created", Report.moderation_state, Report.created_at)
Index("ix_reports_ward_zone_status", Report.ward_id, Report.zone_id, Report.status)
