"""AI classification service — tries Gemini (free) → OpenAI → fallback."""

import base64
import json
import logging
import threading
import time
from dataclasses import dataclass

import requests

from app.core.config import get_settings
from app.models.enums import Category

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class VisionResult:
    category: Category
    confidence: float
    severity: int
    tags: list[str]
    summary: str
    top_3: list[tuple[Category, float]]


_circuit_lock = threading.Lock()
_failures = 0
_circuit_open_until = 0.0


def _fallback_result() -> VisionResult:
    return VisionResult(
        category=Category.OTHER,
        confidence=0.0,
        severity=0,
        tags=["uncertain", "manual_confirmation_needed", "ai_unavailable"],
        summary="Could not classify. Please select category manually.",
        top_3=[
            (Category.OTHER, 0.0),
            (Category.POTHOLE, 0.0),
            (Category.WATERLOGGING, 0.0),
        ],
    )


def _circuit_open() -> bool:
    with _circuit_lock:
        return time.time() < _circuit_open_until


def _record_failure() -> None:
    global _failures, _circuit_open_until
    with _circuit_lock:
        _failures += 1
        if _failures >= settings.ai_circuit_failures_before_open:
            _circuit_open_until = time.time() + settings.ai_circuit_open_seconds
            _failures = 0


def _record_success() -> None:
    global _failures, _circuit_open_until
    with _circuit_lock:
        _failures = 0
        _circuit_open_until = 0.0


def _schema_prompt() -> str:
    categories = ", ".join(item.value for item in Category)
    return (
        f"You are a civic issue classifier for {settings.region_label}. "
        f"Analyze this image and return strict JSON with these keys: "
        f"category, confidence, severity, tags, summary, top_3. "
        f"category must be one of [{categories}]. "
        "confidence: float 0..1, severity: integer 0..5, tags: up to 8 short tags, "
        "summary: <=280 chars describing the issue, "
        "top_3: array of exactly 3 objects {{category, confidence}}."
    )


def _sanitize_summary(text: str) -> str:
    banned = ["idiot", "criminal", "fraud", "corrupt"]
    sanitized = text
    for word in banned:
        sanitized = sanitized.replace(word, "[redacted]")
        sanitized = sanitized.replace(word.title(), "[redacted]")
    return sanitized


def _parse_result(text: str) -> VisionResult:
    # Strip markdown code fences if present
    clean = text.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    clean = clean.strip()

    data = json.loads(clean)
    category = Category(data["category"])
    confidence = float(data["confidence"])
    severity = max(0, min(5, int(data.get("severity", 0))))
    tags = [str(x) for x in data.get("tags", [])][:8]
    summary = _sanitize_summary(str(data.get("summary", ""))[:280])
    top_3_raw = data.get("top_3", [])
    top_3: list[tuple[Category, float]] = []
    for item in top_3_raw[:3]:
        top_3.append((Category(item["category"]), float(item["confidence"])))
    if len(top_3) < 3:
        top_3 = [(category, confidence), (Category.POTHOLE, 0.2), (Category.WATERLOGGING, 0.1)]
    return VisionResult(
        category=category, confidence=confidence, severity=severity,
        tags=tags, summary=summary, top_3=top_3[:3],
    )


# ── Gemini (Google) — FREE 1,500/day ────────────────────────────────

def _classify_gemini(image_base64: str) -> VisionResult | None:
    """Classify using Google Gemini Flash (free tier)."""
    if not settings.gemini_api_key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"

    payload = {
        "contents": [{
            "parts": [
                {"text": _schema_prompt() + "\n\nClassify this civic issue image. Return ONLY valid JSON."},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": image_base64,
                    }
                },
            ]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 400,
        },
    }

    try:
        resp = requests.post(url, json=payload, timeout=12)
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        result = _parse_result(text)
        logger.info("Gemini classified: %s (%.2f)", result.category.value, result.confidence)
        return result
    except Exception as e:
        logger.warning("Gemini classification failed: %s", str(e)[:200])
        return None


# ── OpenAI — paid fallback ──────────────────────────────────────────

def _classify_openai(image_base64: str) -> VisionResult | None:
    """Classify using OpenAI Vision (paid)."""
    if not settings.openai_api_key:
        return None

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        result = client.responses.create(
            model=settings.openai_vision_model,
            input=[
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": _schema_prompt()}],
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "Classify this civic issue image."},
                        {
                            "type": "input_image",
                            "image_url": f"data:image/jpeg;base64,{image_base64}",
                        },
                    ],
                },
            ],
            temperature=0.1,
            max_output_tokens=300,
            timeout=settings.ai_preview_timeout_seconds,
        )
        parsed = _parse_result(result.output_text)
        logger.info("OpenAI classified: %s (%.2f)", parsed.category.value, parsed.confidence)
        return parsed
    except Exception as e:
        logger.warning("OpenAI classification failed: %s", str(e)[:200])
        return None


# ── Public API ──────────────────────────────────────────────────────

def classify_preview(image_base64: str) -> VisionResult:
    """Classify an image. Tries: Gemini (free) → OpenAI (paid) → fallback."""
    if _circuit_open():
        return _fallback_result()

    # Try Gemini first (FREE)
    result = _classify_gemini(image_base64)
    if result:
        _record_success()
        return result

    # Try OpenAI (paid fallback)
    result = _classify_openai(image_base64)
    if result:
        _record_success()
        return result

    # Both failed
    _record_failure()
    return _fallback_result()


def classify_from_media_urls(media_urls: list[str]) -> VisionResult:
    """Classify from media URLs (used by background worker)."""
    # Download first image and convert to base64
    for url in media_urls[:3]:
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            image_b64 = base64.b64encode(resp.content).decode("ascii")
            return classify_preview(image_b64)
        except Exception:
            continue
    return _fallback_result()


def classify_from_media_blobs(media_blobs: list[bytes]) -> dict:
    """Classify from raw image bytes (used by worker)."""
    for blob in media_blobs[:3]:
        try:
            image_b64 = base64.b64encode(blob).decode("ascii")
            result = classify_preview(image_b64)
            return {
                "category": result.category.value,
                "confidence": result.confidence,
                "severity": result.severity,
                "tags": result.tags,
                "summary": result.summary,
            }
        except Exception:
            continue
    return {
        "category": "other",
        "confidence": 0.0,
        "severity": 0,
        "tags": ["ai_unavailable"],
        "summary": "Classification unavailable",
    }
