"""
Simulador que guarda datos en la base de datos
Genera datos de motor y los almacena para análisis
"""
import asyncio
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session_maker, MotorReading, Alert
import sys
import os

# Agregar el directorio padre al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

async def generate_sample_data(hours=2):
    """Genera datos de muestra para las últimas N horas"""
    
    async with async_session_maker() as session:
        print(f"📊 Generando datos de prueba para las últimas {hours} horas...")
        
        # Calcular timestamps
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        # Generar 1 lectura cada 30 segundos
        interval_seconds = 30
        num_readings = int(hours * 3600 / interval_seconds)
        
        print(f"   Creando {num_readings} lecturas...")
        
        for i in range(num_readings):
            timestamp = start_time + timedelta(seconds=i * interval_seconds)
            
            # Generar valores base con variación
            temp_base = 45 + random.uniform(-10, 15)
            vibration_base = 3.5 + random.uniform(-1, 2)
            rpm_base = 1750 + random.uniform(-100, 100)
            
            # Simular algunos picos ocasionales
            if random.random() < 0.1:  # 10% de probabilidad
                temp_base += random.uniform(10, 20)
                
            if random.random() < 0.05:  # 5% de probabilidad
                vibration_base += random.uniform(3, 6)
            
            reading = MotorReading(
                timestamp=timestamp,
                # Fase A
                voltage_a=220 + random.uniform(-5, 5),
                current_a=10 + random.uniform(-1, 1),
                power_a=2200 + random.uniform(-200, 200),
                energy_a=1500 + random.uniform(-100, 100),
                frequency_a=60.0,
                pf_a=0.95 + random.uniform(-0.05, 0.05),
                # Fase B
                voltage_b=219 + random.uniform(-5, 5),
                current_b=10.5 + random.uniform(-1, 1),
                power_b=2300 + random.uniform(-200, 200),
                energy_b=1520 + random.uniform(-100, 100),
                frequency_b=60.0,
                pf_b=0.93 + random.uniform(-0.05, 0.05),
                # Fase C
                voltage_c=221 + random.uniform(-5, 5),
                current_c=10 + random.uniform(-1, 1),
                power_c=2210 + random.uniform(-200, 200),
                energy_c=1480 + random.uniform(-100, 100),
                frequency_c=60.0,
                pf_c=0.94 + random.uniform(-0.05, 0.05),
                # Generales
                temperature=temp_base,
                vibration=vibration_base,
                rpm=rpm_base,
                anomaly_score=random.uniform(0, 0.3),
                is_anomaly=False
            )
            
            session.add(reading)
            
            # Generar alertas para valores críticos
            if temp_base > 70:
                alert = Alert(
                    timestamp=timestamp,
                    severity="critical" if temp_base > 80 else "warning",
                    category="temperature",
                    message=f"Temperatura elevada: {temp_base:.1f}°C",
                    value=temp_base,
                    threshold=80 if temp_base > 80 else 70
                )
                session.add(alert)
            
            if vibration_base > 7:
                alert = Alert(
                    timestamp=timestamp,
                    severity="critical" if vibration_base > 10 else "warning",
                    category="vibration",
                    message=f"Vibración alta: {vibration_base:.1f} mm/s",
                    value=vibration_base,
                    threshold=10 if vibration_base > 10 else 7
                )
                session.add(alert)
            
            if i % 50 == 0:
                print(f"   Progreso: {i}/{num_readings} lecturas creadas...")
        
        await session.commit()
        print(f"✅ Datos generados exitosamente!")
        print(f"   Total de lecturas: {num_readings}")
        print(f"   Período: {start_time} a {end_time}")

if __name__ == "__main__":
    # Generar datos de las últimas 24 horas
    asyncio.run(generate_sample_data(hours=24))
