from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import Category


class SlaPolicy(Base):
    __tablename__ = "sla_policies"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    category: Mapped[Category] = mapped_column(
        Enum(Category, name="category_enum", native_enum=False), nullable=False, index=True
    )
    jurisdiction_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("jurisdictions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    target_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    escalation_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


Index("ix_sla_policies_lookup", SlaPolicy.category, SlaPolicy.jurisdiction_id, SlaPolicy.active)
