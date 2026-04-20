import json
import threading
import time
from dataclasses import dataclass

from openai import OpenAI

from app.core.config import get_settings
from app.models.enums import Category

settings = get_settings()


@dataclass
class VisionResult:
    category: Category
    confidence: float
    severity: int
    tags: list[str]
    summary: str
    top_3: list[tuple[Category, float]]


_circuit_lock = threading.Lock()
_preview_failures = 0
_preview_circuit_open_until = 0.0


def _fallback_result() -> VisionResult:
    return VisionResult(
        category=Category.OTHER,
        confidence=0.0,
        severity=0,
        tags=["uncertain", "manual_confirmation_needed", "ai_unavailable"],
        summary="Could not confidently classify this issue. Please confirm category.",
        top_3=[
            (Category.OTHER, 0.0),
            (Category.POTHOLE, 0.0),
            (Category.WATERLOGGING, 0.0),
        ],
    )


def _client() -> OpenAI | None:
    if not settings.openai_api_key:
        return None
    return OpenAI(api_key=settings.openai_api_key)


def _schema_prompt() -> str:
    categories = ", ".join(item.value for item in Category)
    return (
        f"You are a civic issue classifier for {settings.region_label}. "
        f"Return strict JSON with keys: category, confidence, severity, tags, summary, top_3. "
        f"category must be one of [{categories}]. "
        "confidence: float 0..1, severity: integer 0..5, tags: up to 8 short tags, "
        "summary: <=280 chars, top_3: array of exactly 3 objects {category, confidence}."
    )


def _sanitize_summary(text: str) -> str:
    banned = ["idiot", "criminal", "fraud", "corrupt"]
    sanitized = text
    for word in banned:
        sanitized = sanitized.replace(word, "[redacted]")
        sanitized = sanitized.replace(word.title(), "[redacted]")
    return sanitized


def _parse_result(text: str) -> VisionResult:
    data = json.loads(text)
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
        category=category,
        confidence=confidence,
        severity=severity,
        tags=tags,
        summary=summary,
        top_3=top_3[:3],
    )


def _preview_circuit_open() -> bool:
    with _circuit_lock:
        return time.time() < _preview_circuit_open_until


def _record_preview_failure() -> None:
    global _preview_failures, _preview_circuit_open_until
    with _circuit_lock:
        _preview_failures += 1
        if _preview_failures >= settings.ai_circuit_failures_before_open:
            _preview_circuit_open_until = time.time() + settings.ai_circuit_open_seconds
            _preview_failures = 0


def _record_preview_success() -> None:
    global _preview_failures, _preview_circuit_open_until
    with _circuit_lock:
        _preview_failures = 0
        _preview_circuit_open_until = 0.0


def classify_preview(image_base64: str) -> VisionResult:
    if _preview_circuit_open():
        return _fallback_result()

    client = _client()
    if client is None:
        return _fallback_result()

    try:
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
        _record_preview_success()
        return parsed
    except Exception:
        _record_preview_failure()
        return _fallback_result()


def classify_from_media_urls(media_urls: list[str]) -> VisionResult:
    client = _client()
    if client is None:
        return _fallback_result()

    images = media_urls[:3]
    content = [{"type": "input_text", "text": "Classify this civic issue from provided evidence."}]
    for url in images:
        content.append({"type": "input_image", "image_url": url})

    try:
        result = client.responses.create(
            model=settings.openai_vision_model,
            input=[
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": _schema_prompt()}],
                },
                {"role": "user", "content": content},
            ],
            temperature=0.1,
            max_output_tokens=400,
            timeout=settings.ai_preview_timeout_seconds + 4,
        )
        return _parse_result(result.output_text)
    except Exception:
        return _fallback_result()
