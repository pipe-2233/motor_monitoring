from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./motor_monitoring.db"
    
    # MQTT (HiveMQ Cloud - cluster personal)
    MQTT_BROKER: str = "087ff76994dc4fd4b47546d2309632e3.s1.eu.hivemq.cloud"
    MQTT_PORT: int = 8883
    MQTT_USERNAME: str = "motor_moni"
    MQTT_PASSWORD: str = "motor1234L"
    MQTT_TOPIC_PREFIX: str = "motor/"
    MQTT_USE_TLS: bool = True
    
    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    
    # ML
    ML_MODEL_PATH: str = "./models/anomaly_detector.joblib"
    ML_RETRAIN_INTERVAL: int = 3600
    
    # Thresholds
    TEMP_WARNING: float = 60.0
    TEMP_CRITICAL: float = 80.0
    VIBRATION_WARNING: float = 7.0
    VIBRATION_CRITICAL: float = 10.0
    RPM_WARNING: float = 2500.0
    RPM_CRITICAL: float = 3000.0
    
    # Ollama (AI)
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
