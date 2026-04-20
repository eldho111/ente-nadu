from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReportResponsibilitySnapshot(Base):
    __tablename__ = "report_responsibility_snapshot"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    report_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    jurisdiction_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("jurisdictions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    department_name: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    owner_official_user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("official_users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    escalation_contact_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


Index(
    "ix_report_responsibility_snapshot_owner",
    ReportResponsibilitySnapshot.report_id,
    ReportResponsibilitySnapshot.owner_official_user_id,
)
