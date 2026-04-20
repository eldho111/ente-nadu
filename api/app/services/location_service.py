import math
import random
import threading
import time
from dataclasses import dataclass

import requests

from app.core.cache import cache_get, cache_set
from app.core.config import get_settings

settings = get_settings()


@dataclass
class ReverseGeocodeResult:
    address_text: str | None
    locality: str | None


_circuit_lock = threading.Lock()
_geocode_failures = 0
_geocode_circuit_open_until = 0.0


def _cache_key(lat: float, lon: float) -> str:
    # ~11m precision; enough for locality-level reverse geocode reuse.
    rounded_lat = round(lat, 4)
    rounded_lon = round(lon, 4)
    return f"reverse_geocode:{rounded_lat}:{rounded_lon}"


def _circuit_open() -> bool:
    with _circuit_lock:
        return time.time() < _geocode_circuit_open_until


def _record_failure() -> None:
    global _geocode_failures, _geocode_circuit_open_until
    with _circuit_lock:
        _geocode_failures += 1
        if _geocode_failures >= settings.geocode_circuit_failures_before_open:
            _geocode_circuit_open_until = time.time() + settings.geocode_circuit_open_seconds
            _geocode_failures = 0


def _record_success() -> None:
    global _geocode_failures, _geocode_circuit_open_until
    with _circuit_lock:
        _geocode_failures = 0
        _geocode_circuit_open_until = 0.0


def apply_location_jitter(lat: float, lon: float, meters: float) -> tuple[float, float]:
    # Uniform random bearing and bounded radius for privacy-safe public coordinates.
    bearing = random.uniform(0, 2 * math.pi)
    radius = random.uniform(0, meters)
    delta_lat = (radius * math.cos(bearing)) / 111_320
    delta_lon = (radius * math.sin(bearing)) / (111_320 * math.cos(math.radians(lat)))
    return lat + delta_lat, lon + delta_lon


def reverse_geocode_nominatim(lat: float, lon: float) -> ReverseGeocodeResult:
    key = _cache_key(lat, lon)
    cached = cache_get(key)
    if isinstance(cached, dict):
        return ReverseGeocodeResult(
            address_text=cached.get("address_text"),
            locality=cached.get("locality"),
        )

    if _circuit_open():
        return ReverseGeocodeResult(address_text=None, locality=None)

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "jsonv2"},
            headers={"User-Agent": "civic-pulse/1.0"},
            timeout=settings.geocode_timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception:
        _record_failure()
        return ReverseGeocodeResult(address_text=None, locality=None)

    _record_success()
    address = payload.get("display_name")
    addr_fields = payload.get("address", {})
    locality = (
        addr_fields.get("suburb")
        or addr_fields.get("neighbourhood")
        or addr_fields.get("city_district")
        or addr_fields.get("city")
    )
    result = ReverseGeocodeResult(address_text=address, locality=locality)
    cache_set(
        key,
        {"address_text": result.address_text, "locality": result.locality},
        ttl=settings.geocode_cache_ttl_seconds,
    )
    return result
