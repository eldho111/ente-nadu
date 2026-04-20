from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum, String, Text, func, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import RepresentativeRole


class ElectedRepresentative(Base):
    __tablename__ = "elected_representatives"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ml: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[RepresentativeRole] = mapped_column(
        Enum(RepresentativeRole, name="representative_role_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    constituency_name: Mapped[str] = mapped_column(String(255), nullable=False)
    constituency_name_ml: Mapped[str | None] = mapped_column(String(255), nullable=True)
    district: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    party: Mapped[str | None] = mapped_column(String(120), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    twitter_handle: Mapped[str | None] = mapped_column(String(64), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


Index("ix_elected_reps_role_active", ElectedRepresentative.role, ElectedRepresentative.active)
Index("ix_elected_reps_district_role", ElectedRepresentative.district, ElectedRepresentative.role)
