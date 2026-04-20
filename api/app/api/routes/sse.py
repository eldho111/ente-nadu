import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.cache import _get_redis
from app.services.sse_publisher import SSE_CHANNEL_PREFIX

logger = logging.getLogger(__name__)
router = APIRouter(tags=["sse"])

HEARTBEAT_INTERVAL_S = 25
MAX_STREAM_DURATION_S = 600  # 10 minutes


@router.get("/reports/{public_id}/stream")
async def stream_report_events(public_id: str) -> StreamingResponse:
    """SSE endpoint for real-time report status and check-in events.

    Sends `event: status_change` when report status is updated and
    `event: checkin` when a citizen checks in.  A `: heartbeat` comment
    is emitted every 25 seconds to keep the connection alive.  The stream
    auto-closes after 10 minutes; clients should reconnect.
    """
    r = _get_redis()
    if r is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="real-time streaming is temporarily unavailable",
        )

    channel = f"{SSE_CHANNEL_PREFIX}{public_id}"

    async def _event_generator():
        """Yield SSE-formatted events from Redis pub/sub."""
        pubsub = r.pubsub()
        pubsub.subscribe(channel)

        stream_start = datetime.now(timezone.utc)
        try:
            while True:
                elapsed = (datetime.now(timezone.utc) - stream_start).total_seconds()
                if elapsed >= MAX_STREAM_DURATION_S:
                    yield ": stream timeout\n\n"
                    break

                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=HEARTBEAT_INTERVAL_S)

                if message is not None and message["type"] == "message":
                    try:
                        payload = json.loads(message["data"])
                        event_type = payload.get("event", "message")
                        data = json.dumps(payload.get("data", {}), default=str)
                        yield f"event: {event_type}\ndata: {data}\n\n"
                    except (json.JSONDecodeError, TypeError) as exc:
                        logger.debug("SSE decode error on %s: %s", channel, exc)
                        continue
                else:
                    # No message within heartbeat interval; send keepalive.
                    yield ": heartbeat\n\n"

                # Yield control to the event loop so other tasks can proceed.
                await asyncio.sleep(0)
        except asyncio.CancelledError:
            pass
        finally:
            try:
                pubsub.unsubscribe(channel)
                pubsub.close()
            except Exception:
                pass

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
