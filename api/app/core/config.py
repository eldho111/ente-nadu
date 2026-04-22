from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = Field(default="development", alias="ENV")
    app_name: str = Field(default="Civic Pulse", alias="APP_NAME")
    region_label: str = Field(default="Bengaluru", alias="REGION_LABEL")

    app_base_url: str = Field(default="http://localhost:8000", alias="APP_BASE_URL")
    web_base_url: str = Field(default="http://localhost:3000", alias="WEB_BASE_URL")

    database_url: str = Field(default="postgresql+psycopg://civic:civic@postgres:5432/civic", alias="DATABASE_URL")
    database_pool_size: int = Field(default=20, alias="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=40, alias="DATABASE_MAX_OVERFLOW")
    database_pool_timeout_seconds: int = Field(default=30, alias="DATABASE_POOL_TIMEOUT_SECONDS")
    database_pool_recycle_seconds: int = Field(default=1800, alias="DATABASE_POOL_RECYCLE_SECONDS")
    redis_url: str = Field(default="redis://redis:6379/0", alias="REDIS_URL")

    # S3_ENDPOINT       — server-side S3 API endpoint (used by API/worker for GET/PUT object).
    # S3_PUBLIC_ENDPOINT — browser-facing S3 API endpoint for PRESIGNED UPLOADS.
    #                     On R2 this is the SAME as S3_ENDPOINT (…r2.cloudflarestorage.com).
    # S3_PUBLIC_READ_BASE_URL — browser-facing READ URL (e.g. R2.dev domain or custom CDN).
    #                           Used ONLY to construct public_url fields saved into media rows.
    # Conflating presigned-PUT endpoint with public-read URL is a classic R2 foot-gun:
    # r2.dev is read-only and rejects signed PUTs with 401.
    s3_endpoint: str = Field(default="http://minio:9000", alias="S3_ENDPOINT")
    s3_public_endpoint: str = Field(default="http://localhost:9000", alias="S3_PUBLIC_ENDPOINT")
    s3_public_read_base_url: str | None = Field(default=None, alias="S3_PUBLIC_READ_BASE_URL")
    s3_access_key: str = Field(default="minioadmin", alias="S3_ACCESS_KEY")
    s3_secret_key: str = Field(default="minioadmin", alias="S3_SECRET_KEY")
    s3_bucket_raw: str = Field(default="civic-raw", alias="S3_BUCKET_RAW")
    s3_bucket_public: str = Field(default="civic-public", alias="S3_BUCKET_PUBLIC")
    s3_region: str = Field(default="us-east-1", alias="S3_REGION")

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4.1-mini", alias="OPENAI_MODEL")
    openai_vision_model: str = Field(default="gpt-4.1-mini", alias="OPENAI_VISION_MODEL")

    # Google Gemini (FREE — 1,500 requests/day)
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.0-flash-lite", alias="GEMINI_MODEL")

    # Groq (FREE — 14,400 requests/day, fastest inference)
    groq_api_key: str | None = Field(default=None, alias="GROQ_API_KEY")
    groq_model: str = Field(default="meta-llama/llama-4-scout-17b-16e-instruct", alias="GROQ_MODEL")

    ai_confidence_threshold: float = Field(default=0.72, alias="AI_CONFIDENCE_THRESHOLD")
    ai_preview_timeout_seconds: float = Field(default=8.0, alias="AI_PREVIEW_TIMEOUT_SECONDS")
    ai_circuit_failures_before_open: int = Field(default=5, alias="AI_CIRCUIT_FAILURES_BEFORE_OPEN")
    ai_circuit_open_seconds: int = Field(default=30, alias="AI_CIRCUIT_OPEN_SECONDS")

    public_location_jitter_meters: float = Field(default=75.0, alias="PUBLIC_LOCATION_JITTER_METERS")
    media_retention_days: int = Field(default=180, alias="MEDIA_RETENTION_DAYS")
    geocode_timeout_seconds: float = Field(default=3.5, alias="GEOCODE_TIMEOUT_SECONDS")
    geocode_cache_ttl_seconds: int = Field(default=1800, alias="GEOCODE_CACHE_TTL_SECONDS")
    geocode_circuit_failures_before_open: int = Field(default=5, alias="GEOCODE_CIRCUIT_FAILURES_BEFORE_OPEN")
    geocode_circuit_open_seconds: int = Field(default=20, alias="GEOCODE_CIRCUIT_OPEN_SECONDS")

    anon_device_daily_limit: int = Field(default=5, alias="ANON_DEVICE_DAILY_LIMIT")
    anon_ip_daily_limit: int = Field(default=20, alias="ANON_IP_DAILY_LIMIT")
    duplicate_cooldown_minutes: int = Field(default=10, alias="DUPLICATE_COOLDOWN_MINUTES")
    capture_max_age_minutes: int = Field(default=10, alias="CAPTURE_MAX_AGE_MINUTES")

    priority_weight_severity: float = Field(default=0.4, alias="PRIORITY_WEIGHT_SEVERITY")
    priority_weight_age: float = Field(default=0.25, alias="PRIORITY_WEIGHT_AGE")
    priority_weight_duplicate_density: float = Field(default=0.2, alias="PRIORITY_WEIGHT_DUPLICATE_DENSITY")
    priority_weight_safety_flag: float = Field(default=0.15, alias="PRIORITY_WEIGHT_SAFETY_FLAG")

    firebase_project_id: str | None = Field(default=None, alias="FIREBASE_PROJECT_ID")
    firebase_api_key: str | None = Field(default=None, alias="FIREBASE_API_KEY")
    firebase_credentials_path: str | None = Field(default=None, alias="FIREBASE_CREDENTIALS_PATH")
    allow_test_otp: bool = Field(default=False, alias="ALLOW_TEST_OTP")

    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    notify_from_name: str = Field(default="Civic Pulse", alias="NOTIFY_FROM_NAME")
    notify_from_email: str = Field(default="noreply@example.org", alias="NOTIFY_FROM_EMAIL")

    sendgrid_api_key: str | None = Field(default=None, alias="SENDGRID_API_KEY")
    twilio_account_sid: str | None = Field(default=None, alias="TWILIO_ACCOUNT_SID")
    twilio_auth_token: str | None = Field(default=None, alias="TWILIO_AUTH_TOKEN")
    twilio_phone_number: str | None = Field(default=None, alias="TWILIO_PHONE_NUMBER")
    whatsapp_from_number: str | None = Field(default=None, alias="WHATSAPP_FROM_NUMBER")

    admin_api_key: str | None = Field(default=None, alias="ADMIN_API_KEY")

    # WhatsApp Meta Cloud API
    whatsapp_meta_phone_number_id: str | None = Field(default=None, alias="WHATSAPP_META_PHONE_NUMBER_ID")
    whatsapp_meta_api_token: str | None = Field(default=None, alias="WHATSAPP_META_API_TOKEN")
    whatsapp_meta_webhook_verify_token: str | None = Field(default=None, alias="WHATSAPP_META_WEBHOOK_VERIFY_TOKEN")
    whatsapp_meta_app_secret: str | None = Field(default=None, alias="WHATSAPP_META_APP_SECRET")
    whatsapp_conversation_ttl_seconds: int = Field(default=1800, alias="WHATSAPP_CONVERSATION_TTL_SECONDS")
    whatsapp_daily_limit_per_number: int = Field(default=5, alias="WHATSAPP_DAILY_LIMIT_PER_NUMBER")

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        """Ensure critical secrets are set in production."""
        if self.env == "production":
            if not self.admin_api_key:
                raise ValueError("ADMIN_API_KEY must be set in production environment")
            if not self.database_url or "civic:civic@" in self.database_url:
                raise ValueError("DATABASE_URL must use non-default credentials in production")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
