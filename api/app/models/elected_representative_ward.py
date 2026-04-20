from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, func, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ElectedRepresentativeWard(Base):
    __tablename__ = "elected_representative_wards"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    representative_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("elected_representatives.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ward_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    local_body_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


Index("ix_erw_unique", ElectedRepresentativeWard.representative_id, ElectedRepresentativeWard.ward_id, unique=True)
