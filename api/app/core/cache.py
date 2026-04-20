"""Redis-based caching layer with cache-aside pattern.

Usage:
    from app.core.cache import cache_get, cache_set, cache_invalidate

    # Check cache first
    cached = cache_get("ward_metrics")
    if cached:
        return cached

    # Compute value, then cache it
    result = compute_expensive_query()
    cache_set("ward_metrics", result, ttl=300)

    # Invalidate on write
    cache_invalidate("ward_metrics")
"""

import json
import logging
from typing import Any

import redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None


def _get_redis() -> redis.Redis | None:
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    settings = get_settings()
    try:
        _redis_client = redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        _redis_client.ping()
        return _redis_client
    except Exception as exc:
        logger.warning("Redis cache unavailable: %s", exc)
        _redis_client = None
        return None


# ── Cache key prefixes ──────────────────────────────────────────────
PREFIX = "civic:cache:"


def _key(name: str) -> str:
    return f"{PREFIX}{name}"


def cache_get(name: str) -> Any | None:
    """Get a cached value by name. Returns None on miss or error."""
    r = _get_redis()
    if r is None:
        return None
    try:
        raw = r.get(_key(name))
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as exc:
        logger.debug("Cache get error for %s: %s", name, exc)
        return None


def cache_set(name: str, value: Any, ttl: int = 60) -> bool:
    """Store a value in cache with TTL in seconds. Returns True on success."""
    r = _get_redis()
    if r is None:
        return False
    try:
        r.setex(_key(name), ttl, json.dumps(value, default=str))
        return True
    except Exception as exc:
        logger.debug("Cache set error for %s: %s", name, exc)
        return False


def cache_invalidate(name: str) -> bool:
    """Delete a cached value. Returns True on success."""
    r = _get_redis()
    if r is None:
        return False
    try:
        r.delete(_key(name))
        return True
    except Exception as exc:
        logger.debug("Cache invalidate error for %s: %s", name, exc)
        return False


def cache_invalidate_pattern(pattern: str) -> int:
    """Delete all keys matching a glob pattern. Returns count deleted."""
    r = _get_redis()
    if r is None:
        return 0
    try:
        full_pattern = _key(pattern)
        keys = list(r.scan_iter(match=full_pattern, count=100))
        if keys:
            return r.delete(*keys)
        return 0
    except Exception as exc:
        logger.debug("Cache invalidate pattern error: %s", exc)
        return 0


# ── Pre-defined cache keys ──────────────────────────────────────────
WARD_METRICS = "ward_metrics"           # TTL: 300s (5 min)
REPORT_LIST = "report_list"             # TTL: 30s  (prefix: report_list:{hash})
WARD_LOOKUP = "ward_lookup"             # TTL: 3600s (1 hr, prefix: ward_lookup:{lat}:{lon})
