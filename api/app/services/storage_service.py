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
    base = settings.s3_endpoint.rstrip("/")
    return f"{base}/{settings.s3_bucket_raw}/{key}"


def raw_public_object_url(key: str) -> str:
    base = settings.s3_public_endpoint.rstrip("/")
    return f"{base}/{settings.s3_bucket_raw}/{key}"


def public_object_url(key: str) -> str:
    base = settings.s3_public_endpoint.rstrip("/")
    return f"{base}/{settings.s3_bucket_public}/{key}"


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
