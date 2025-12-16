from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MotorReadingBase(BaseModel):
    # Phase A
    voltage_a: float
    current_a: float
    power_a: float
    energy_a: float
    frequency_a: float
    pf_a: float
    
    # Phase B
    voltage_b: float
    current_b: float
    power_b: float
    energy_b: float
    frequency_b: float
    pf_b: float
    
    # Phase C
    voltage_c: float
    current_c: float
    power_c: float
    energy_c: float
    frequency_c: float
    pf_c: float
    
    # Motor metrics
    temperature: float
    vibration: float
    rpm: float

class MotorReadingCreate(MotorReadingBase):
    pass

class MotorReading(MotorReadingBase):
    id: int
    timestamp: datetime
    anomaly_score: float
    is_anomaly: bool
    
    class Config:
        from_attributes = True

class AlertBase(BaseModel):
    severity: str
    category: str
    phase: Optional[str] = None
    message: str
    value: float
    threshold: float

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    id: int
    timestamp: datetime
    resolved: bool
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class SystemLogBase(BaseModel):
    level: str
    source: str
    message: str
    details: Optional[str] = None

class SystemLogCreate(SystemLogBase):
    pass

class SystemLog(SystemLogBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class HistoricalDataQuery(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    phase: Optional[str] = None
    limit: int = 100

class AlertQuery(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    severity: Optional[str] = None
    resolved: Optional[bool] = None
    limit: int = 50

class ThresholdSettingsBase(BaseModel):
    # Voltage thresholds (V)
    voltage_min: float = 200.0
    voltage_max: float = 240.0
    
    # Current thresholds (A)
    current_warning: float = 15.0
    current_critical: float = 20.0
    
    # Power thresholds (W)
    power_warning: float = 4000.0
    power_critical: float = 5000.0
    
    # Frequency thresholds (Hz)
    frequency_min: float = 59.0
    frequency_max: float = 61.0
    
    # Power Factor thresholds
    pf_min: float = 0.85
    
    # Temperature thresholds (°C)
    temp_warning: float = 60.0
    temp_critical: float = 80.0
    
    # Vibration thresholds (mm/s)
    vibration_warning: float = 7.0
    vibration_critical: float = 10.0
    
    # RPM thresholds
    rpm_warning: float = 2500.0
    rpm_critical: float = 3000.0
    
    # Energy thresholds (kWh)
    energy_warning: float = 100.0

class ThresholdSettingsUpdate(ThresholdSettingsBase):
    pass

class ThresholdSettings(ThresholdSettingsBase):
    id: int
    updated_at: datetime
    
    class Config:
        from_attributes = True

