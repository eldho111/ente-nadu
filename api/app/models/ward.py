from datetime import datetime
from uuid import UUID, uuid4

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Ward(Base):
    __tablename__ = "wards"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    ward_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    ward_name: Mapped[str] = mapped_column(String(255), nullable=False)
    zone_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    zone_name: Mapped[str] = mapped_column(String(255), nullable=False)
    geom: Mapped[str] = mapped_column(Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)