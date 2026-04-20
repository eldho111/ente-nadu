from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum, Float, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import Category


class Cluster(Base):
    __tablename__ = "clusters"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    category: Mapped[Category] = mapped_column(Enum(Category, name="category_enum", native_enum=False), nullable=False, index=True)
    centroid_lat: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_lon: Mapped[float] = mapped_column(Float, nullable=False)
    open_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    last_reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)