"""AI classification — delegates to the API service over HTTP.

This eliminates the duplicated OpenAI integration that previously existed
in both the API and worker.  The worker now calls the API's classify
endpoint, keeping the OpenAI client config in one place.
"""

import base64
import json
import logging

import requests

from worker_app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# The API is reachable inside the Docker network at this URL
_API_URL = settings.api_internal_base_url.rstrip("/") if hasattr(settings, "api_internal_base_url") else "http://api:8000"


def _fallback() -> dict:
    return {
        "category": "pothole",
        "confidence": 0.4,
        "severity": 2,
        "tags": ["uncertain"],
        "summary": "Automatic classification uncertain. User confirmation retained.",
    }


def classify_from_media_blobs(media_blobs: list[bytes]) -> dict:
    """Classify civic issue from media blobs by calling the API service.

    Falls back to the first blob as a base64 preview request to the API.
    If the API is unreachable, returns a safe fallback result.
    """
    if not media_blobs:
        return _fallback()

    # Send the first image as base64 to the API classify-preview endpoint
    image_b64 = base64.b64encode(media_blobs[0]).decode("utf-8")

    try:
        resp = requests.post(
            f"{_API_URL}/v1/reports/classify-preview",
            json={"image_base64": image_b64},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        # Map the API response format to the flat dict the worker expects
        top_3 = data.get("top_3_categories", [])
        category = top_3[0]["category"] if top_3 else "pothole"
        confidence = data.get("confidence", 0.4)

        return {
            "category": category,
            "confidence": confidence,
            "severity": 2,  # API preview doesn't return severity; default to moderate
            "tags": [],
            "summary": data.get("quick_summary", ""),
        }
    except Exception as exc:
        logger.warning("AI classification via API failed, using fallback: %s", exc)
        return _fallback()
