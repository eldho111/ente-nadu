"""Media processing — runs INSIDE the API (no worker needed).

This replaces the separate RQ worker that was causing pipeline stalls.
Each submitted report now gets blurred + published to the public bucket
synchronously during the POST /v1/reports handler. The AI classification
also happens inline. Trade-off: submits take ~3-8 s end to end, but the
pipeline has zero async dependencies so it actually works reliably.

Public functions:
    fetch_raw_bytes(key)        -> bytes | None
    blur_and_publish(key, blob) -> (public_url, thumbnail_url) | (None, None)
"""

from __future__ import annotations

import hashlib
import io
import logging
from typing import Optional

import boto3
from botocore.client import Config
from PIL import Image, ImageFilter

from app.core.config import get_settings
from app.services.storage_service import public_object_url

settings = get_settings()
logger = logging.getLogger(__name__)


def _s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,  # internal R2 S3 API endpoint (not the public URL)
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )


def fetch_raw_bytes(key: str) -> Optional[bytes]:
    """Download a raw-bucket object as bytes. Returns None on any failure."""
    try:
        resp = _s3_client().get_object(Bucket=settings.s3_bucket_raw, Key=key)
        return resp["Body"].read()
    except Exception as exc:
        logger.warning("media_processing.fetch_raw_bytes failed for %s: %s", key, str(exc)[:160])
        return None


# Image size limits — prevent a 20 MB photo from pegging the API thread.
_MAX_LONG_EDGE = 1600          # px — downscale anything larger
_THUMB_LONG_EDGE = 400         # px — thumbnail size
_BLUR_RADIUS = 2.2             # gaussian blur, enough to anonymize plates/faces
_JPEG_QUALITY = 82


def _resize_with_cap(img: Image.Image, max_long_edge: int) -> Image.Image:
    w, h = img.size
    long_edge = max(w, h)
    if long_edge <= max_long_edge:
        return img
    scale = max_long_edge / float(long_edge)
    return img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)


def _blur_and_encode(img: Image.Image) -> bytes:
    blurred = img.filter(ImageFilter.GaussianBlur(radius=_BLUR_RADIUS))
    out = io.BytesIO()
    blurred.save(out, format="JPEG", quality=_JPEG_QUALITY, optimize=True)
    return out.getvalue()


def _encode_thumb(img: Image.Image) -> bytes:
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=72, optimize=True)
    return out.getvalue()


def blur_and_publish(raw_key: str, blob: bytes) -> tuple[Optional[str], Optional[str]]:
    """Blur + publish image to the PUBLIC bucket.

    Returns (public_url, thumbnail_url). On failure returns (None, None)
    and logs the reason. Never raises — the caller can decide to save the
    report without processed media.
    """
    try:
        img = Image.open(io.BytesIO(blob)).convert("RGB")
    except Exception as exc:
        logger.warning("blur_and_publish: not a valid image (%s): %s", raw_key, str(exc)[:120])
        return None, None

    # Downscale then blur (blur on a huge image is expensive).
    blurred_img = _resize_with_cap(img, _MAX_LONG_EDGE)
    blurred_bytes = _blur_and_encode(blurred_img)

    # Thumbnail (same blur applied, just smaller).
    thumb_img = _resize_with_cap(blurred_img, _THUMB_LONG_EDGE)
    thumb_bytes = _encode_thumb(thumb_img)

    client = _s3_client()
    try:
        client.put_object(
            Bucket=settings.s3_bucket_public,
            Key=raw_key,
            Body=blurred_bytes,
            ContentType="image/jpeg",
            CacheControl="public, max-age=31536000, immutable",
        )
    except Exception as exc:
        logger.warning("blur_and_publish: put_object failed for %s: %s", raw_key, str(exc)[:160])
        return None, None

    thumb_key = f"thumb/{raw_key}"
    try:
        client.put_object(
            Bucket=settings.s3_bucket_public,
            Key=thumb_key,
            Body=thumb_bytes,
            ContentType="image/jpeg",
            CacheControl="public, max-age=31536000, immutable",
        )
        thumbnail_url: Optional[str] = public_object_url(thumb_key)
    except Exception as exc:
        logger.warning("blur_and_publish: thumbnail upload failed for %s: %s", raw_key, str(exc)[:160])
        thumbnail_url = None

    return public_object_url(raw_key), thumbnail_url


def sha256_hex(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()
