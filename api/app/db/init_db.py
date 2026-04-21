from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine
from app.models import (
    cluster,
    department_contact,
    elected_representative,
    elected_representative_ward,
    flag,
    jurisdiction,
    media,
    notify_event,
    notification_delivery,
    notification_subscription,
    official_user,
    report,
    report_assignment,
    report_event,
    report_responsibility_snapshot,
    resolution_proof,
    routing_rule,
    sla_policy,
    user,
    ward,
)


def init_db() -> None:
    import logging
    log = logging.getLogger(__name__)

    # Try to install extensions, but don't fail if unavailable
    # (Railway's default Postgres doesn't have PostGIS)
    with engine.begin() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            log.info("PostGIS extension enabled")
        except Exception as e:
            log.warning("PostGIS not available: %s - geo queries will be limited", str(e)[:100])
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        except Exception as e:
            log.warning("pgcrypto not available: %s", str(e)[:100])

    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS token_no VARCHAR(32)"))
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ"))
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS capture_origin VARCHAR(16)"))
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS gps_accuracy_m DOUBLE PRECISION"))
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS manual_issue_label VARCHAR(120)"))
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority_score DOUBLE PRECISION"))
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS jurisdiction_id UUID"))
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'reports_jurisdiction_id_fkey'
                  ) THEN
                    ALTER TABLE reports
                    ADD CONSTRAINT reports_jurisdiction_id_fkey
                    FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE SET NULL;
                  END IF;
                END$$;
                """
            )
        )

        conn.execute(
            text(
                """
                UPDATE reports
                SET token_no = 'CP-' || to_char(coalesce(created_at, now()), 'YYYYMMDD') || '-' || upper(substr(md5(id::text), 1, 6))
                WHERE token_no IS NULL
                """
            )
        )
        conn.execute(text("UPDATE reports SET captured_at = coalesce(created_at, now()) WHERE captured_at IS NULL"))
        conn.execute(text("UPDATE reports SET capture_origin = 'camera' WHERE capture_origin IS NULL"))
        conn.execute(text("UPDATE reports SET priority_score = 0 WHERE priority_score IS NULL"))

        conn.execute(text("ALTER TABLE reports ALTER COLUMN token_no SET NOT NULL"))
        conn.execute(text("ALTER TABLE reports ALTER COLUMN captured_at SET NOT NULL"))
        conn.execute(text("ALTER TABLE reports ALTER COLUMN capture_origin SET NOT NULL"))
        conn.execute(text("ALTER TABLE reports ALTER COLUMN priority_score SET NOT NULL"))

        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_reports_token_no ON reports(token_no)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reports_jurisdiction_status_created ON reports(jurisdiction_id, status, created_at DESC)"))
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS department_contacts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    department_name VARCHAR(255) NOT NULL,
                    jurisdiction_id UUID NULL REFERENCES jurisdictions(id) ON DELETE SET NULL,
                    name VARCHAR(255) NOT NULL,
                    designation VARCHAR(255) NULL,
                    email VARCHAR(255) NULL,
                    phone VARCHAR(32) NULL,
                    is_escalation_contact BOOLEAN NOT NULL DEFAULT FALSE,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS report_responsibility_snapshot (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    report_id UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
                    jurisdiction_id UUID NULL REFERENCES jurisdictions(id) ON DELETE SET NULL,
                    department_name VARCHAR(255) NULL,
                    owner_official_user_id UUID NULL REFERENCES official_users(id) ON DELETE SET NULL,
                    escalation_contact_ids JSONB NULL,
                    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS sla_policies (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    category VARCHAR(64) NOT NULL,
                    jurisdiction_id UUID NULL REFERENCES jurisdictions(id) ON DELETE SET NULL,
                    target_minutes INTEGER NOT NULL,
                    escalation_minutes INTEGER NOT NULL,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )


if __name__ == "__main__":
    init_db()
    print("Database initialized")
