"""Add ops, notifications, and jurisdictions tables

Revision ID: 002
Revises: 001
Create Date: 2026-02-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "jurisdictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "state",
                "district",
                "city",
                "ward",
                "zone",
                "lsg",
                name="jurisdiction_type_enum",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("state", sa.String(length=120), nullable=True),
        sa.Column("district", sa.String(length=120), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("geom", Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["jurisdictions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_jurisdictions_code", "jurisdictions", ["code"], unique=True)
    op.create_index("ix_jurisdictions_parent_id", "jurisdictions", ["parent_id"], unique=False)
    op.create_index("ix_jurisdictions_type", "jurisdictions", ["type"], unique=False)
    op.create_index("ix_jurisdictions_state", "jurisdictions", ["state"], unique=False)
    op.create_index("ix_jurisdictions_city", "jurisdictions", ["city"], unique=False)
    op.create_index("ix_jurisdictions_district", "jurisdictions", ["district"], unique=False)

    op.create_table(
        "official_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("firebase_uid", sa.String(length=128), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("department_name", sa.String(length=255), nullable=True),
        sa.Column(
            "role",
            sa.Enum(
                "super_admin",
                "dept_manager",
                "field_officer",
                "viewer",
                name="official_role_enum",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("jurisdiction_scope", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_official_users_firebase_uid", "official_users", ["firebase_uid"], unique=True)
    op.create_index("ix_official_users_role", "official_users", ["role"], unique=False)
    op.create_index("ix_official_users_active", "official_users", ["active"], unique=False)

    op.create_table(
        "report_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("official_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["official_user_id"], ["official_users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_report_assignments_report_id", "report_assignments", ["report_id"], unique=False)
    op.create_index("ix_report_assignments_official_user_id", "report_assignments", ["official_user_id"], unique=False)
    op.create_index("ix_report_assignments_active", "report_assignments", ["active"], unique=False)
    op.create_index("ix_report_assignments_report_active", "report_assignments", ["report_id", "active"], unique=False)

    op.create_table(
        "notification_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("device_id", sa.String(length=128), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("whatsapp_number", sa.String(length=32), nullable=True),
        sa.Column("channels", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_subscriptions_report_id", "notification_subscriptions", ["report_id"], unique=False)
    op.create_index("ix_notification_subscriptions_user_id", "notification_subscriptions", ["user_id"], unique=False)
    op.create_index("ix_notification_subscriptions_device_id", "notification_subscriptions", ["device_id"], unique=False)
    op.create_index("ix_notification_subscriptions_email", "notification_subscriptions", ["email"], unique=False)
    op.create_index("ix_notification_subscriptions_whatsapp_number", "notification_subscriptions", ["whatsapp_number"], unique=False)
    op.create_index("ix_notification_subscriptions_active", "notification_subscriptions", ["active"], unique=False)

    op.create_table(
        "notification_deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "channel",
            sa.Enum("push", "email", "whatsapp", name="notification_channel_enum", native_enum=False),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("queued", "sent", "failed", "read", name="notification_status_enum", native_enum=False),
            nullable=False,
            server_default="queued",
        ),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subscription_id"], ["notification_subscriptions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_deliveries_report_id", "notification_deliveries", ["report_id"], unique=False)
    op.create_index("ix_notification_deliveries_subscription_id", "notification_deliveries", ["subscription_id"], unique=False)
    op.create_index("ix_notification_deliveries_channel", "notification_deliveries", ["channel"], unique=False)
    op.create_index("ix_notification_deliveries_status", "notification_deliveries", ["status"], unique=False)
    op.create_index(
        "ix_notification_deliveries_report_created",
        "notification_deliveries",
        ["report_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "resolution_proofs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("official_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("media_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["official_user_id"], ["official_users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resolution_proofs_report_id", "resolution_proofs", ["report_id"], unique=False)
    op.create_index("ix_resolution_proofs_official_user_id", "resolution_proofs", ["official_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_resolution_proofs_official_user_id", table_name="resolution_proofs")
    op.drop_index("ix_resolution_proofs_report_id", table_name="resolution_proofs")
    op.drop_table("resolution_proofs")

    op.drop_index("ix_notification_deliveries_report_created", table_name="notification_deliveries")
    op.drop_index("ix_notification_deliveries_status", table_name="notification_deliveries")
    op.drop_index("ix_notification_deliveries_channel", table_name="notification_deliveries")
    op.drop_index("ix_notification_deliveries_subscription_id", table_name="notification_deliveries")
    op.drop_index("ix_notification_deliveries_report_id", table_name="notification_deliveries")
    op.drop_table("notification_deliveries")

    op.drop_index("ix_notification_subscriptions_active", table_name="notification_subscriptions")
    op.drop_index("ix_notification_subscriptions_whatsapp_number", table_name="notification_subscriptions")
    op.drop_index("ix_notification_subscriptions_email", table_name="notification_subscriptions")
    op.drop_index("ix_notification_subscriptions_device_id", table_name="notification_subscriptions")
    op.drop_index("ix_notification_subscriptions_user_id", table_name="notification_subscriptions")
    op.drop_index("ix_notification_subscriptions_report_id", table_name="notification_subscriptions")
    op.drop_table("notification_subscriptions")

    op.drop_index("ix_report_assignments_report_active", table_name="report_assignments")
    op.drop_index("ix_report_assignments_active", table_name="report_assignments")
    op.drop_index("ix_report_assignments_official_user_id", table_name="report_assignments")
    op.drop_index("ix_report_assignments_report_id", table_name="report_assignments")
    op.drop_table("report_assignments")

    op.drop_index("ix_official_users_active", table_name="official_users")
    op.drop_index("ix_official_users_role", table_name="official_users")
    op.drop_index("ix_official_users_firebase_uid", table_name="official_users")
    op.drop_table("official_users")

    op.drop_index("ix_jurisdictions_district", table_name="jurisdictions")
    op.drop_index("ix_jurisdictions_city", table_name="jurisdictions")
    op.drop_index("ix_jurisdictions_state", table_name="jurisdictions")
    op.drop_index("ix_jurisdictions_type", table_name="jurisdictions")
    op.drop_index("ix_jurisdictions_parent_id", table_name="jurisdictions")
    op.drop_index("ix_jurisdictions_code", table_name="jurisdictions")
    op.drop_table("jurisdictions")
