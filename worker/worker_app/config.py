from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(default="postgresql+psycopg://civic:civic@postgres:5432/civic", alias="DATABASE_URL")
    redis_url: str = Field(default="redis://redis:6379/0", alias="REDIS_URL")

    api_internal_base_url: str = Field(default="http://api:8000", alias="API_INTERNAL_BASE_URL")

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_vision_model: str = Field(default="gpt-4.1-mini", alias="OPENAI_VISION_MODEL")
    ai_confidence_threshold: float = Field(default=0.72, alias="AI_CONFIDENCE_THRESHOLD")

    s3_endpoint: str = Field(default="http://minio:9000", alias="S3_ENDPOINT")
    s3_public_endpoint: str = Field(default="http://localhost:9000", alias="S3_PUBLIC_ENDPOINT")
    s3_access_key: str = Field(default="minioadmin", alias="S3_ACCESS_KEY")
    s3_secret_key: str = Field(default="minioadmin", alias="S3_SECRET_KEY")
    s3_bucket_raw: str = Field(default="civic-raw", alias="S3_BUCKET_RAW")
    s3_bucket_public: str = Field(default="civic-public", alias="S3_BUCKET_PUBLIC")
    s3_region: str = Field(default="us-east-1", alias="S3_REGION")
    media_retention_days: int = Field(default=180, alias="MEDIA_RETENTION_DAYS")


@lru_cache
def get_settings() -> Settings:
    return Settings()
