"""Publish SSE events to Redis pub/sub for real-time report streaming.

Usage:
    from app.services.sse_publisher import publish_report_event

    publish_report_event(
        public_id="abc123",
        event_type="status_change",
        data={"status": "in_progress"},
    )
"""

import json
import logging
from datetime import datetime, timezone

from app.core.cache import _get_redis

logger = logging.getLogger(__name__)

SSE_CHANNEL_PREFIX = "civic:sse:report:"


def publish_report_event(public_id: str, event_type: str, data: dict) -> bool:
    """Publish an SSE event to the Redis channel for a report.

    Silently no-ops if Redis is unavailable.
    Returns True if the message was published, False otherwise.
    """
    r = _get_redis()
    if r is None:
        return False

    channel = f"{SSE_CHANNEL_PREFIX}{public_id}"
    payload = json.dumps(
        {
            "event": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        default=str,
    )

    try:
        r.publish(channel, payload)
        return True
    except Exception as exc:
        logger.warning("SSE publish failed for %s: %s", channel, exc)
        return False
