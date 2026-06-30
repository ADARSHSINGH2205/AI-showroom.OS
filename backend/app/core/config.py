from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    app_name: str = "AI Showroom OS"
    environment: Literal["local", "test", "production"] = "local"
    database_url: str = "postgresql+psycopg://showroom:showroom@localhost:5432/ai_showroom_os"
    secret_key: str = Field(default="local-dev-secret-change-before-production", min_length=32)
    access_token_expire_minutes: int = Field(default=60, ge=5, le=480)
    jwt_issuer: str = "ai-showroom-os"
    jwt_audience: str = "ai-showroom-os-api"
    seed_owner_username: str = "owner"
    seed_owner_password: str = "owner123"
    owner_mobile_number: str | None = Field(
        default=None,
        validation_alias=AliasChoices("OWNER_MOBILE_NUMBER", "OWNER_WHATSAPP_NUMBER"),
    )
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
    allowed_hosts: list[str] = ["localhost", "127.0.0.1", "testserver"]
    login_max_attempts: int = Field(default=5, ge=3, le=20)
    login_window_seconds: int = Field(default=900, ge=60, le=3600)
    login_lockout_seconds: int = Field(default=900, ge=60, le=86400)
    max_bill_upload_bytes: int = Field(default=8 * 1024 * 1024, ge=1024, le=20 * 1024 * 1024)
    ai_provider: Literal["gemini"] = "gemini"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.5-flash"
    sms_provider: Literal["auto", "textbelt", "console"] = "console"
    textbelt_api_key: str | None = "textbelt"

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.environment != "production":
            return self
        unsafe_secret_keys = {
            "local-dev-secret-change-before-production",
            "local-docker-secret-change-before-production",
            "replace-with-a-long-random-secret",
        }
        if self.secret_key in unsafe_secret_keys:
            raise ValueError("SECRET_KEY must be changed before running in production")
        if len(self.secret_key) < 40 or len(set(self.secret_key)) < 12:
            raise ValueError("SECRET_KEY must be a strong random value of at least 40 characters")
        if self.seed_owner_password in {"owner123", "replace-this-password"} or len(self.seed_owner_password) < 12:
            raise ValueError("SEED_OWNER_PASSWORD must be a strong password of at least 12 characters")
        if self.database_url.startswith("sqlite"):
            raise ValueError("SQLite is not allowed for production; use PostgreSQL")
        if not self.cors_origins or any(origin == "*" or not origin.startswith("https://") for origin in self.cors_origins):
            raise ValueError("Production CORS_ORIGINS must contain only explicit HTTPS origins")
        if not self.allowed_hosts or "*" in self.allowed_hosts:
            raise ValueError("Production ALLOWED_HOSTS must list explicit hostnames")
        if self.sms_provider == "textbelt" and not self.textbelt_api_key:
            raise ValueError("Textbelt SMS requires TEXTBELT_API_KEY")
        return self

    model_config = SettingsConfigDict(env_file=ROOT_ENV_FILE, env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
