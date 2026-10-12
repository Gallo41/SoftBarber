from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SoftBarber"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database configuration (defaults to SQLite, configurable to MariaDB/MySQL)
    DATABASE_URL: str = "sqlite:///./softbarber.db"
    
    # Business settings
    BUSINESS_NAME: str = "SoftBarber"
    CANCELLATION_WINDOW_HOURS: int = 2
    DEFAULT_SLOT_INTERVAL_MINUTES: int = 30
    OPEN_TIME: str = "08:00:00"
    CLOSE_TIME: str = "20:00:00"

    # JWT & Authentication settings
    JWT_SECRET: str = "softbarber-dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ADMIN_TOKEN_EXPIRE_HOURS: int = 12
    CUSTOMER_TOKEN_EXPIRE_DAYS: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
