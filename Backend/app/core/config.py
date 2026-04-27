from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    APP_NAME: str = "SehatAI Backend"
    APP_VERSION: str = "1.0.1"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # File Upload
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png"

    # ML Models
    TB_MODEL_PATH: str = "ml_models/tb_detection_model.h5"
    TB_MODEL_METADATA_PATH: str = "ml_models/tb_detection_metadata.json"
    PNEUMONIA_MODEL_PATH: str = "ml_models/pneumonia_efficientnetb3_94.keras"
    PNEUMONIA_MODEL_METADATA_PATH: str = "ml_models/pneumonia_detection_metadata.json"
    CHEST_XRAY_VALIDATOR_MODEL_PATH: str = "ml_models/chest_xray_validator_v2.h5"
    CHEST_XRAY_VALIDATOR_METADATA_PATH: str = "ml_models/chest_xray_validator_v2_metadata.json"
    TB_DEFAULT_THRESHOLD: float = 0.75
    PNEUMONIA_DEFAULT_THRESHOLD: float = 0.70
    CHEST_XRAY_VALIDATOR_THRESHOLD: float = 0.5

    # Storage
    UPLOAD_DIR: str = "uploads"
    REPORT_DIR: str = "reports"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:19006"

    # Email (SMTP) for password reset OTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Sehat AI"
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False

    @property
    def allowed_origins_list(self) -> List[str]:
        """Convert comma-separated CORS origins to list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def allowed_extensions_list(self) -> List[str]:
        """Convert comma-separated extensions to list"""
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
