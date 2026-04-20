import hashlib
import json
import logging
from datetime import datetime, timezone

import requests
from sqlalchemy import text

from worker_app.ai_service import classify_from_media_blobs
from worker_app.config import get_settings
from worker_app.db import db_session
from worker_app.media_service import blur_and_publish, blur_and_publish_stub

settings = get_settings()
logger = logging.getLogger("worker.jobs")

ALLOWED_CATEGORIES = {
    "pothole",
    "waterlogging",
    "garbage_dumping",
    "streetlight_outage",
    "traffic_hotspot",
    "illegal_parking",
    "footpath_obstruction",
    "signal_malfunction",
    "open_manhole",
    "construction_debris",
    "other",
}


def _download_media(raw_url: str) -> bytes | None:
    try:
        response = requests.get(raw_url, timeout=8)
        response.raise_for_status()
        return response.content
    except Exception:
        return None


def _hash_blob(blob: bytes) -> tuple[str, str]:
    sha = hashlib.sha256(blob).hexdigest()
    # Lightweight perceptual-hash stand-in for MVP foundation.
    phash = sha[:16]
    return sha, phash


def process_report_classification(report_id: str) -> None:
    logger.info("Processing classification for report %s", report_id)
    try:
        _process_report_classification_inner(report_id)
        logger.info("Successfully classified report %s", report_id)
    except Exception:
        logger.exception("FAILED to classify report %s — will be retried by sweep job", report_id)
        # Mark the report as failed so a sweep job can retry it later
        try:
            with db_session() as db:
                db.execute(
                    text(
                        """
                        INSERT INTO report_events (id, report_id, event_type, payload, actor, created_at)
                        VALUES (gen_random_uuid(), :report_id, :event_type, CAST(:payload AS jsonb), :actor, :created_at)
                        """
                    ),
                    {
                        "report_id": report_id,
                        "event_type": "report.classification.failed",
                        "payload": json.dumps({"error": "classification job failed"}),
                        "actor": "worker",
                        "created_at": datetime.now(timezone.utc),
                    },
                )
        except Exception:
            logger.exception("Failed to record classification failure event for report %s", report_id)
        raise  # Re-raise so RQ moves it to the failed queue


def _process_report_classification_inner(report_id: str) -> None:
    with db_session() as db:
        report = db.execute(
            text("SELECT id, lat, lon, public_lat, public_lon, category_final FROM reports WHERE id = :report_id"),
            {"report_id": report_id},
        ).mappings().first()
        if not report:
            logger.warning("Report %s not found, skipping classification", report_id)
            return

        media_rows = db.execute(
            text("SELECT id, raw_key, raw_url FROM media WHERE report_id = :report_id"),
            {"report_id": report_id},
        ).mappings().all()

        media_blob_map: dict[str, bytes | None] = {}
        media_blobs: list[bytes] = []
        for row in media_rows:
            blob = _download_media(row["raw_url"])
            media_blob_map[str(row["id"])] = blob
            if blob is not None:
                media_blobs.append(blob)

        result = classify_from_media_blobs(media_blobs)
        category_ai = str(result.get("category", "other"))
        if category_ai not in ALLOWED_CATEGORIES:
            category_ai = "other"

        db.execute(
            text(
                """
                UPDATE reports
                SET
                  category_ai = :category_ai,
                  confidence = :confidence,
                  severity_ai = :severity_ai,
                  tags = CAST(:tags AS jsonb),
                  description_ai = :description_ai,
                  updated_at = now()
                WHERE id = :report_id
                """
            ),
            {
                "report_id": report_id,
                "category_ai": category_ai,
                "confidence": float(result.get("confidence", 0.0)),
                "severity_ai": int(result.get("severity", 0)),
                "tags": json.dumps(result.get("tags", [])),
                "description_ai": str(result.get("summary", ""))[:280],
            },
        )

        for media in media_rows:
            blob = media_blob_map.get(str(media["id"]))
            if blob is not None:
                public_url, thumbnail_url, media_hash, perceptual_hash = blur_and_publish(
                    media["raw_key"], blob
                )
            else:
                public_url, thumbnail_url = blur_and_publish_stub(media["raw_key"])
                media_hash, perceptual_hash = None, None

            db.execute(
                text(
                    """
                    UPDATE media
                    SET public_key = :public_key,
                        public_url = :public_url,
                        thumbnail_url = :thumbnail_url,
                        media_hash = :media_hash,
                        perceptual_hash = :perceptual_hash
                    WHERE id = :media_id
                    """
                ),
                {
                    "media_id": media["id"],
                    "public_key": media["raw_key"],
                    "public_url": public_url,
                    "thumbnail_url": thumbnail_url,
                    "media_hash": media_hash,
                    "perceptual_hash": perceptual_hash,
                },
            )

        db.execute(
            text(
                """
                INSERT INTO report_events (id, report_id, event_type, payload, actor, created_at)
                VALUES (
                  gen_random_uuid(),
                  :report_id,
                  :event_type,
                  CAST(:payload AS jsonb),
                  :actor,
                  :created_at
                )
                """
            ),
            {
                "report_id": report_id,
                "event_type": "report.classified",
                "payload": json.dumps(
                    {
                        "category_ai": category_ai,
                        "confidence": float(result.get("confidence", 0.0)),
                        "severity_ai": int(result.get("severity", 0)),
                    }
                ),
                "actor": "worker",
                "created_at": datetime.now(timezone.utc),
            },
        )

        # Use jittered (public) coordinates for clustering to protect privacy.
        # Exact lat/lon must never leak through cluster centroids.
        cluster_lat = float(report["public_lat"]) if report["public_lat"] else float(report["lat"])
        cluster_lon = float(report["public_lon"]) if report["public_lon"] else float(report["lon"])

        cluster = db.execute(
            text(
                """
                SELECT id, centroid_lat, centroid_lon, open_count
                FROM clusters
                WHERE category = :category
                  AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint(centroid_lon, centroid_lat), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                    100
                  )
                ORDER BY last_reported_at DESC
                LIMIT 1
                """
            ),
            {
                "category": report["category_final"],
                "lat": cluster_lat,
                "lon": cluster_lon,
            },
        ).mappings().first()

        cluster_id = None
        if cluster:
            existing_count = int(cluster["open_count"])
            new_count = existing_count + 1
            new_centroid_lat = ((float(cluster["centroid_lat"]) * existing_count) + cluster_lat) / new_count
            new_centroid_lon = ((float(cluster["centroid_lon"]) * existing_count) + cluster_lon) / new_count
            cluster_id = cluster["id"]
            db.execute(
                text(
                    """
                    UPDATE clusters
                    SET centroid_lat = :centroid_lat,
                        centroid_lon = :centroid_lon,
                        open_count = :open_count,
                        last_reported_at = now()
                    WHERE id = :cluster_id
                    """
                ),
                {
                    "cluster_id": cluster_id,
                    "centroid_lat": new_centroid_lat,
                    "centroid_lon": new_centroid_lon,
                    "open_count": new_count,
                },
            )
        else:
            cluster_id = db.execute(
                text(
                    """
                    INSERT INTO clusters (
                      id, category, centroid_lat, centroid_lon, open_count, last_reported_at, created_at, title
                    )
                    VALUES (
                      gen_random_uuid(), :category, :centroid_lat, :centroid_lon, 1, now(), now(), :title
                    )
                    RETURNING id
                    """
                ),
                {
                    "category": report["category_final"],
                    "centroid_lat": cluster_lat,
                    "centroid_lon": cluster_lon,
                    "title": f"{report['category_final']} cluster",
                },
            ).scalar_one()

        db.execute(
            text("UPDATE reports SET cluster_id = :cluster_id WHERE id = :report_id"),
            {"cluster_id": cluster_id, "report_id": report_id},
        )
        db.execute(
            text(
                """
                INSERT INTO report_events (id, report_id, event_type, payload, actor, created_at)
                VALUES (
                  gen_random_uuid(),
                  :report_id,
                  :event_type,
                  CAST(:payload AS jsonb),
                  :actor,
                  :created_at
                )
                """
            ),
            {
                "report_id": report_id,
                "event_type": "report.clustered",
                "payload": json.dumps({"cluster_id": str(cluster_id)}),
                "actor": "worker",
                "created_at": datetime.now(timezone.utc),
            },
        )


def cleanup_stale_ip_addresses(retention_days: int = 30) -> int:
    """Null out IP addresses older than retention window to protect privacy.

    IP addresses are only needed for short-term abuse detection.
    After the retention period, they should be removed.
    """
    with db_session() as db:
        result = db.execute(
            text(
                """
                UPDATE reports
                SET ip_address = NULL
                WHERE ip_address IS NOT NULL
                  AND created_at < (now() - (:retention_days || ' days')::interval)
                """
            ),
            {"retention_days": retention_days},
        )
        return result.rowcount or 0


def cleanup_expired_media() -> int:
    with db_session() as db:
        deleted = db.execute(
            text(
                """
                DELETE FROM media
                WHERE created_at < (now() - (:retention_days || ' days')::interval)
                RETURNING id
                """
            ),
            {"retention_days": settings.media_retention_days},
        ).fetchall()
        return len(deleted)
