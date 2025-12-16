from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, Text
from datetime import datetime
from app.config import settings

Base = declarative_base()

class MotorReading(Base):
    __tablename__ = "motor_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Phase A
    voltage_a = Column(Float)
    current_a = Column(Float)
    power_a = Column(Float)
    energy_a = Column(Float)
    frequency_a = Column(Float)
    pf_a = Column(Float)
    
    # Phase B
    voltage_b = Column(Float)
    current_b = Column(Float)
    power_b = Column(Float)
    energy_b = Column(Float)
    frequency_b = Column(Float)
    pf_b = Column(Float)
    
    # Phase C
    voltage_c = Column(Float)
    current_c = Column(Float)
    power_c = Column(Float)
    energy_c = Column(Float)
    frequency_c = Column(Float)
    pf_c = Column(Float)
    
    # Motor metrics
    temperature = Column(Float)
    vibration = Column(Float)
    rpm = Column(Float)
    
    # ML predictions
    anomaly_score = Column(Float, default=0.0)
    is_anomaly = Column(Boolean, default=False)

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    severity = Column(String(20))  # warning, critical
    category = Column(String(50))  # voltage, current, temperature, vibration, rpm
    phase = Column(String(10), nullable=True)  # A, B, C, or None
    message = Column(Text)
    value = Column(Float)
    threshold = Column(Float)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)

class SystemLog(Base):
    __tablename__ = "system_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    level = Column(String(20))  # info, warning, error
    source = Column(String(50))  # mqtt, api, ml, database
    message = Column(Text)
    details = Column(Text, nullable=True)

class ThresholdSettings(Base):
    __tablename__ = "threshold_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Voltage thresholds (V) - Para sistema 127V fase-neutro
    voltage_min = Column(Float, default=110.0)
    voltage_max = Column(Float, default=135.0)
    
    # Current thresholds (A)
    current_warning = Column(Float, default=13.0)
    current_critical = Column(Float, default=14.0)
    
    # Power thresholds (W)
    power_warning = Column(Float, default=4000.0)
    power_critical = Column(Float, default=5000.0)
    
    # Frequency thresholds (Hz)
    frequency_min = Column(Float, default=59.0)
    frequency_max = Column(Float, default=61.0)
    
    # Power Factor thresholds
    pf_min = Column(Float, default=0.85)
    
    # Temperature thresholds (°C)
    temp_warning = Column(Float, default=60.0)
    temp_critical = Column(Float, default=80.0)
    
    # Vibration thresholds (mm/s)
    vibration_warning = Column(Float, default=10.0)
    vibration_critical = Column(Float, default=15.0)
    
    # RPM thresholds
    rpm_warning = Column(Float, default=2500.0)
    rpm_critical = Column(Float, default=3000.0)
    
    # Energy thresholds (kWh)
    energy_warning = Column(Float, default=100.0)

# Database engine and session
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    """Dependency for getting async database sessions"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
