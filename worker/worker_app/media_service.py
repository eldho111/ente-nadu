import io
import hashlib

import boto3
import cv2
import numpy as np
from botocore.client import Config
from PIL import Image

from worker_app.config import get_settings

settings = get_settings()

# OpenCV Haar cascade for face detection (bundled with opencv)
_FACE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
_face_cascade = cv2.CascadeClassifier(_FACE_CASCADE_PATH)

# Plate detection cascade (if available)
_PLATE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_russian_plate_number.xml"
_plate_cascade = cv2.CascadeClassifier(_PLATE_CASCADE_PATH)

_s3 = boto3.client(
    "s3",
    endpoint_url=settings.s3_endpoint,
    aws_access_key_id=settings.s3_access_key,
    aws_secret_access_key=settings.s3_secret_key,
    region_name=settings.s3_region,
    config=Config(signature_version="s3v4"),
)


def to_public_url(key: str) -> str:
    base = settings.s3_public_endpoint.rstrip("/")
    return f"{base}/{settings.s3_bucket_public}/{key}"


def _put_public_object(key: str, payload: bytes, *, content_type: str) -> None:
    _s3.put_object(
        Bucket=settings.s3_bucket_public,
        Key=key,
        Body=payload,
        ContentType=content_type,
        CacheControl="public,max-age=604800",
    )


def strip_exif(image_bytes: bytes) -> bytes:
    """Remove all EXIF metadata (GPS, device info, etc.) from an image."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        # Create a new image without EXIF data
        data = list(img.getdata())
        clean_img = Image.new(img.mode, img.size)
        clean_img.putdata(data)

        buf = io.BytesIO()
        fmt = img.format or "JPEG"
        clean_img.save(buf, format=fmt, quality=85)
        return buf.getvalue()
    except Exception:
        return image_bytes


def _blur_regions(img_array: np.ndarray, regions: list[tuple[int, int, int, int]], blur_strength: int = 51) -> np.ndarray:
    """Apply Gaussian blur to detected regions."""
    for (x, y, w, h) in regions:
        # Add padding around detection
        pad_x = int(w * 0.15)
        pad_y = int(h * 0.15)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(img_array.shape[1], x + w + pad_x)
        y2 = min(img_array.shape[0], y + h + pad_y)

        roi = img_array[y1:y2, x1:x2]
        blurred = cv2.GaussianBlur(roi, (blur_strength, blur_strength), 30)
        img_array[y1:y2, x1:x2] = blurred

    return img_array


def detect_and_blur_faces(image_bytes: bytes) -> bytes:
    """Detect faces in an image and blur them for privacy."""
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return image_bytes

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Detect faces
        faces = _face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=4,
            minSize=(30, 30),
            flags=cv2.CASCADE_SCALE_IMAGE,
        )

        # Detect license plates
        plates = _plate_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=4,
            minSize=(60, 20),
        )

        all_regions = list(faces) + list(plates)
        if len(all_regions) == 0:
            return image_bytes

        img = _blur_regions(img, all_regions)

        _, encoded = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return encoded.tobytes()
    except Exception:
        return image_bytes


def generate_thumbnail(image_bytes: bytes, max_width: int = 300) -> bytes | None:
    """Generate a thumbnail from image bytes."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=75)
        return buf.getvalue()
    except Exception:
        return None


def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def compute_perceptual_hash(image_bytes: bytes, hash_size: int = 8) -> str | None:
    """Compute a simple average-based perceptual hash for duplicate detection."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("L")
        img = img.resize((hash_size, hash_size), Image.Resampling.LANCZOS)
        pixels = list(img.getdata())
        avg = sum(pixels) / len(pixels)
        bits = "".join("1" if p > avg else "0" for p in pixels)
        return hex(int(bits, 2))[2:].zfill(hash_size * hash_size // 4)
    except Exception:
        return None


def process_image(raw_key: str, image_bytes: bytes) -> tuple[bytes, bytes | None, str, str | None]:
    """
    Full image processing pipeline:
    1. Strip EXIF metadata
    2. Detect and blur faces/plates
    3. Generate thumbnail

    Returns: (processed_bytes, thumbnail_bytes, sha256_hash, perceptual_hash)
    """
    # Strip EXIF
    clean = strip_exif(image_bytes)

    # Blur faces and plates
    blurred = detect_and_blur_faces(clean)

    # Generate thumbnail
    thumb = generate_thumbnail(blurred)

    # Compute hashes on original (pre-blur) for dedup
    sha256 = compute_sha256(image_bytes)
    phash = compute_perceptual_hash(image_bytes)

    return blurred, thumb, sha256, phash


def blur_and_publish(raw_key: str, image_bytes: bytes) -> tuple[str, str | None, str, str | None]:
    """
    Process an image and return URLs + hashes.
    Returns: (public_url, thumbnail_url, media_hash, perceptual_hash)
    """
    processed, thumb, sha256, phash = process_image(raw_key, image_bytes)

    # Persist processed media into the public bucket before returning URLs.
    _put_public_object(raw_key, processed, content_type="image/jpeg")
    thumb_key = f"thumb/{raw_key}"
    if thumb:
        _put_public_object(thumb_key, thumb, content_type="image/jpeg")

    public_url = to_public_url(raw_key)
    thumbnail_url = to_public_url(thumb_key) if thumb else None

    return public_url, thumbnail_url, sha256, phash


# Keep backward compat alias
def blur_and_publish_stub(raw_key: str) -> tuple[str, str | None]:
    """Legacy stub - use blur_and_publish() with actual image bytes instead."""
    public_url = to_public_url(raw_key)
    return public_url, None
