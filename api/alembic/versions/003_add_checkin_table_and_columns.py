"""Add report_checkins table and checkin columns to reports

Revision ID: 003
Revises: 002
Create Date: 2026-03-03
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add checkin fields to reports table
    op.add_column("reports", sa.Column("checkin_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("reports", sa.Column("last_checkin_at", sa.DateTime(timezone=True), nullable=True))

    # Create report_checkins table
    op.create_table(
        "report_checkins",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", sa.String(length=128), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_report_checkins_report_id", "report_checkins", ["report_id"])
    op.create_index("ix_report_checkins_device_id", "report_checkins", ["device_id"])
    op.create_index("ix_report_checkins_created_at", "report_checkins", ["created_at"])
    op.create_index("ix_report_checkins_report_device", "report_checkins", ["report_id", "device_id"])


def downgrade() -> None:
    op.drop_table("report_checkins")
    op.drop_column("reports", "last_checkin_at")
    op.drop_column("reports", "checkin_count")
