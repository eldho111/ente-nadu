from datetime import datetime, timedelta, timezone
from uuid import uuid4

import boto3
from botocore.client import Config

from app.core.config import get_settings

settings = get_settings()


def _s3_client(endpoint_url: str):
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )


def raw_object_url(key: str) -> str:
    """Server-side URL for the raw bucket. Used internally; never served to browsers."""
    base = settings.s3_endpoint.rstrip("/")
    return f"{base}/{settings.s3_bucket_raw}/{key}"


def _public_read_base() -> str:
    """Base URL the browser will hit when fetching publicly-readable media.
    Prefers S3_PUBLIC_READ_BASE_URL (e.g. https://pub-xxx.r2.dev). Falls back to
    S3_PUBLIC_ENDPOINT for backward compatibility with setups that never enabled
    a public-read CDN (reads in that case will 401 unless the bucket itself is
    world-readable on the S3 API endpoint — rare).
    """
    if settings.s3_public_read_base_url:
        return settings.s3_public_read_base_url.rstrip("/")
    return settings.s3_public_endpoint.rstrip("/")


def raw_public_object_url(key: str) -> str:
    """URL used by presigned-upload callers to preview the upload location.

    NOTE: This is NOT a publicly readable URL — the raw bucket is private.
    We return the read base just for API response shape compatibility.
    """
    return f"{_public_read_base()}/{settings.s3_bucket_raw}/{key}"


def public_object_url(key: str) -> str:
    """Browser-readable URL for a processed image in the public bucket.

    If S3_PUBLIC_READ_BASE_URL is set (e.g. https://pub-xxx.r2.dev), the
    returned URL does NOT include the bucket name in the path (r2.dev URLs
    are already bucket-scoped by their subdomain). If only S3_PUBLIC_ENDPOINT
    is set (a shared S3 API endpoint), the bucket name is included.
    """
    if settings.s3_public_read_base_url:
        # r2.dev public URLs are bucket-scoped by subdomain → no bucket in path.
        return f"{_public_read_base()}/{key}"
    # Shared S3 API endpoint → include bucket in path.
    return f"{_public_read_base()}/{settings.s3_bucket_public}/{key}"


def create_presigned_upload(media_type: str, file_ext: str) -> tuple[str, str, str]:
    now = datetime.now(timezone.utc).strftime("%Y%m%d")
    media_key = f"uploads/{now}/{media_type}/{uuid4().hex}.{file_ext.lower()}"
    # Presigned URL must be generated using the endpoint the client will call.
    client = _s3_client(settings.s3_public_endpoint)
    upload_url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.s3_bucket_raw,
            "Key": media_key,
            "ContentType": "image/jpeg" if media_type == "image" else "video/mp4",
        },
        ExpiresIn=int(timedelta(minutes=15).total_seconds()),
    )
    return media_key, upload_url, raw_public_object_url(media_key)


def upload_bytes_to_raw(data: bytes, media_type: str, file_ext: str) -> tuple[str, str]:
    """Upload raw bytes directly to S3 (server-side, no presigned URL).

    Returns (media_key, raw_url).
    """
    now = datetime.now(timezone.utc).strftime("%Y%m%d")
    media_key = f"uploads/{now}/{media_type}/{uuid4().hex}.{file_ext.lower()}"
    content_type = "image/jpeg" if media_type == "image" else "video/mp4"
    client = _s3_client(settings.s3_endpoint)
    client.put_object(
        Bucket=settings.s3_bucket_raw,
        Key=media_key,
        Body=data,
        ContentType=content_type,
    )
    return media_key, raw_object_url(media_key)
