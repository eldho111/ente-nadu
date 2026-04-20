from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum, String, func, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import Category


class RoutingRule(Base):
    __tablename__ = "routing_rules"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    category: Mapped[Category] = mapped_column(Enum(Category, name="category_enum", native_enum=False), nullable=False, index=True)

    ward_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    zone_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    department_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email_to: Mapped[list] = mapped_column(JSONB, nullable=False)
    email_cc: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


Index("ix_routing_rules_lookup", RoutingRule.category, RoutingRule.ward_id, RoutingRule.zone_id)
