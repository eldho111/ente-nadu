from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum, ForeignKey, String, func, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import MediaType


class Media(Base):
    __tablename__ = "media"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    report_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)

    media_type: Mapped[MediaType] = mapped_column(Enum(MediaType, name="media_type_enum", native_enum=False), nullable=False)
    raw_key: Mapped[str] = mapped_column(String(512), nullable=False)
    raw_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    public_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    public_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    media_hash: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    perceptual_hash: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


Index("ix_media_hash_combo", Media.media_hash, Media.perceptual_hash)
