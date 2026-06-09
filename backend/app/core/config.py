from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./course_portal.db"
    turso_database_url: str = ""
    turso_auth_token: str = ""
    jwt_secret: str = "dev-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    backend_cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]

    @property
    def sqlalchemy_url(self) -> str:
        if self.turso_database_url:
            return f"sqlite+{self.turso_database_url}?secure=true"
        return self.database_url

    @property
    def sqlalchemy_connect_args(self) -> dict[str, str | bool]:
        if self.turso_database_url:
            return {"auth_token": self.turso_auth_token}
        if self.database_url.startswith("sqlite"):
            return {"check_same_thread": False}
        return {}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
