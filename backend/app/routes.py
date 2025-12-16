from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import base64
import io
from app.database import get_db
from app.database import MotorReading, Alert, SystemLog, ThresholdSettings as ThresholdSettingsDB
from app.models import (
    MotorReading as MotorReadingSchema,
    Alert as AlertSchema,
    SystemLog as SystemLogSchema,
    ThresholdSettings as ThresholdSettingsSchema,
    ThresholdSettingsUpdate,
    HistoricalDataQuery,
    AlertQuery
)
from app.ai_agent import OllamaAgent
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["api"])

@router.get("/readings", response_model=List[MotorReadingSchema])
async def get_readings(
    limit: int = Query(100, ge=1, le=1000),
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get historical motor readings"""
    query = select(MotorReading).order_by(desc(MotorReading.timestamp))
    
    if start_time:
        query = query.where(MotorReading.timestamp >= start_time)
    if end_time:
        query = query.where(MotorReading.timestamp <= end_time)
    
    query = query.limit(limit)
    
    result = await db.execute(query)
    readings = result.scalars().all()
    
    return readings

@router.get("/readings/latest", response_model=MotorReadingSchema)
async def get_latest_reading(db: AsyncSession = Depends(get_db)):
    """Get the most recent motor reading"""
    query = select(MotorReading).order_by(desc(MotorReading.timestamp)).limit(1)
    result = await db.execute(query)
    reading = result.scalar_one_or_none()
    
    if not reading:
        raise HTTPException(status_code=404, detail="No readings found")
    
    return reading

@router.get("/alerts", response_model=List[AlertSchema])
async def get_alerts(
    limit: int = Query(50, ge=1, le=500),
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get alerts with optional filtering"""
    query = select(Alert).order_by(desc(Alert.timestamp))
    
    conditions = []
    if severity:
        conditions.append(Alert.severity == severity)
    if resolved is not None:
        conditions.append(Alert.resolved == resolved)
    if start_time:
        conditions.append(Alert.timestamp >= start_time)
    if end_time:
        conditions.append(Alert.timestamp <= end_time)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.limit(limit)
    
    result = await db.execute(query)
    alerts = result.scalars().all()
    
    return alerts

@router.get("/alerts/active", response_model=List[AlertSchema])
async def get_active_alerts(db: AsyncSession = Depends(get_db)):
    """Get all unresolved alerts"""
    query = select(Alert).where(Alert.resolved == False).order_by(desc(Alert.timestamp))
    result = await db.execute(query)
    alerts = result.scalars().all()
    
    print(f"📢 API /alerts/active devolvió {len(alerts)} alertas no resueltas")
    for alert in alerts[:5]:  # Solo imprimir las primeras 5
        print(f"   - ID: {alert.id} | Categoría: {alert.category} | Severidad: {alert.severity} | Resuelto: {alert.resolved} | Timestamp: {alert.timestamp}")
    
    return alerts

@router.post("/alerts/resolve-all")
async def resolve_all_alerts(db: AsyncSession = Depends(get_db)):
    """Resolve all unresolved alerts"""
    try:
        query = select(Alert).where(Alert.resolved == False)
        result = await db.execute(query)
        alerts = result.scalars().all()
        
        count = len(alerts)
        for alert in alerts:
            alert.resolved = True
            alert.resolved_at = datetime.now()
        
        await db.commit()
        print(f"✅ Resueltas {count} alertas manualmente")
        
        return {"message": f"Resolved {count} alerts", "count": count}
    except Exception as e:
        print(f"❌ Error al resolver alertas: {e}")
        await db.rollback()
        raise

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Mark an alert as resolved"""
    query = select(Alert).where(Alert.id == alert_id)
    result = await db.execute(query)
    alert = result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.resolved = True
    alert.resolved_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Alert resolved successfully"}

@router.get("/logs", response_model=List[SystemLogSchema])
async def get_logs(
    limit: int = Query(100, ge=1, le=500),
    level: Optional[str] = None,
    source: Optional[str] = None,
    start_time: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get system logs"""
    query = select(SystemLog).order_by(desc(SystemLog.timestamp))
    
    conditions = []
    if level:
        conditions.append(SystemLog.level == level)
    if source:
        conditions.append(SystemLog.source == source)
    if start_time:
        conditions.append(SystemLog.timestamp >= start_time)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.limit(limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return logs

@router.get("/stats/summary")
async def get_summary_stats(db: AsyncSession = Depends(get_db)):
    """Get summary statistics for dashboard"""
    # Get last 24 hours of data
    yesterday = datetime.utcnow() - timedelta(hours=24)
    
    # Count readings
    readings_query = select(MotorReading).where(MotorReading.timestamp >= yesterday)
    readings_result = await db.execute(readings_query)
    readings_count = len(readings_result.scalars().all())
    
    # Count active alerts
    alerts_query = select(Alert).where(Alert.resolved == False)
    alerts_result = await db.execute(alerts_query)
    active_alerts = len(alerts_result.scalars().all())
    
    # Count anomalies in last 24h
    anomalies_query = select(MotorReading).where(
        and_(
            MotorReading.timestamp >= yesterday,
            MotorReading.is_anomaly == True
        )
    )
    anomalies_result = await db.execute(anomalies_query)
    anomalies_count = len(anomalies_result.scalars().all())
    
    # Get latest reading for current values
    latest_query = select(MotorReading).order_by(desc(MotorReading.timestamp)).limit(1)
    latest_result = await db.execute(latest_query)
    latest_reading = latest_result.scalar_one_or_none()
    
    return {
        "readings_24h": readings_count,
        "active_alerts": active_alerts,
        "anomalies_24h": anomalies_count,
        "latest_reading": latest_reading,
        "timestamp": datetime.utcnow()
    }

@router.get("/stats/phase/{phase}")
async def get_phase_stats(
    phase: str,
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a specific phase (A, B, or C)"""
    if phase not in ["A", "B", "C"]:
        raise HTTPException(status_code=400, detail="Phase must be A, B, or C")
    
    start_time = datetime.utcnow() - timedelta(hours=hours)
    
    query = select(MotorReading).where(MotorReading.timestamp >= start_time).order_by(MotorReading.timestamp)
    result = await db.execute(query)
    readings = result.scalars().all()
    
    if not readings:
        return {"message": "No data available for the specified period"}
    
    phase_lower = phase.lower()
    
    # Extract phase-specific data
    voltages = [getattr(r, f"voltage_{phase_lower}") for r in readings]
    currents = [getattr(r, f"current_{phase_lower}") for r in readings]
    powers = [getattr(r, f"power_{phase_lower}") for r in readings]
    
    return {
        "phase": phase,
        "period_hours": hours,
        "data_points": len(readings),
        "voltage": {
            "min": min(voltages),
            "max": max(voltages),
            "avg": sum(voltages) / len(voltages)
        },
        "current": {
            "min": min(currents),
            "max": max(currents),
            "avg": sum(currents) / len(currents)
        },
        "power": {
            "min": min(powers),
            "max": max(powers),
            "avg": sum(powers) / len(powers)
        }
    }

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow()
    }

@router.get("/settings/thresholds", response_model=ThresholdSettingsSchema)
async def get_thresholds(db: AsyncSession = Depends(get_db)):
    """Get current threshold settings"""
    query = select(ThresholdSettingsDB).order_by(desc(ThresholdSettingsDB.id)).limit(1)
    result = await db.execute(query)
    thresholds = result.scalar_one_or_none()
    
    # If no thresholds exist, create default ones
    if not thresholds:
        thresholds = ThresholdSettingsDB()
        db.add(thresholds)
        await db.commit()
        await db.refresh(thresholds)
    
    return thresholds

@router.put("/settings/thresholds", response_model=ThresholdSettingsSchema)
async def update_thresholds(
    threshold_update: ThresholdSettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update threshold settings"""
    # Get current thresholds
    query = select(ThresholdSettingsDB).order_by(desc(ThresholdSettingsDB.id)).limit(1)
    result = await db.execute(query)
    thresholds = result.scalar_one_or_none()
    
    if not thresholds:
        # Create new if doesn't exist
        thresholds = ThresholdSettingsDB(**threshold_update.dict())
        db.add(thresholds)
    else:
        # Update existing
        for key, value in threshold_update.dict().items():
            setattr(thresholds, key, value)
        thresholds.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(thresholds)
    
    # Log the change
    log = SystemLog(
        level="info",
        source="api",
        message="Threshold settings updated",
        details=threshold_update.json()
    )
    db.add(log)
    await db.commit()
    
    return thresholds

# ============================================
# AI Agent Endpoints
# ============================================

# Modelos Pydantic para requests de IA
class ChatRequest(BaseModel):
    message: str
    motor_data: Optional[dict] = None
    conversation_history: Optional[List[dict]] = None

class DiagnosisRequest(BaseModel):
    motor_data: dict

# Instancia global del agente
ai_agent = OllamaAgent()

@router.get("/ai/status")
async def check_ai_status():
    """Verifica si Ollama está disponible"""
    is_connected = await ai_agent.check_connection()
    models = await ai_agent.list_models() if is_connected else []
    
    return {
        "connected": is_connected,
        "models": models,
        "default_model": ai_agent.model,
        "vision_model": ai_agent.vision_model
    }

@router.post("/ai/chat")
async def chat_with_ai(request: ChatRequest):
    """
    Chat con el agente de IA
    Soporta contexto del motor y historial de conversación
    CON CAPACIDAD DE EJECUTAR ACCIONES EN EL SISTEMA
    """
    print("\n" + "="*70)
    print("🤖 PETICIÓN DE CHAT RECIBIDA")
    print(f"📝 Mensaje: {request.message}")
    print(f"📊 Datos motor: {'Sí' if request.motor_data else 'No'}")
    print(f"💬 Historial: {len(request.conversation_history) if request.conversation_history else 0} msgs")
    print("="*70)
    
    try:
        response = await ai_agent.chat(
            message=request.message,
            motor_data=request.motor_data,
            conversation_history=request.conversation_history
        )
        
        print(f"\n✅ Respuesta generada ({len(response.get('response', ''))} chars)")
        
        # Verificar si la respuesta contiene una acción a ejecutar
        if response.get('success') and response.get('response'):
            print(f"🔍 Analizando respuesta IA: {response['response'][:200]}...")
            action = ai_agent.parse_action_from_response(response['response'])
            
            if action:
                print(f"✅ Acción detectada: {action}")
                # Ejecutar la acción
                action_result = await execute_ai_action(action)
                print(f"📊 Resultado de acción: {action_result}")
                response['action_executed'] = action_result
            else:
                print("❌ No se detectó ninguna acción en la respuesta")
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def execute_ai_action(action: Dict[str, str]):
    """
    Ejecuta una acción solicitada por la IA
    """
    action_type = action.get('action')
    print(f"\n🔧 Ejecutando acción: {action_type}")
    print(f"📋 Parámetros: {action}")
    
    try:
        if action_type == 'modificar_umbrales':
            # Modificar umbrales en la base de datos
            from app.database import async_session_maker, ThresholdSettings
            
            tipo = action.get('tipo')  # temperatura, vibration, rpm
            warning = float(action.get('warning', 0))
            critical = float(action.get('critical', 0))
            print(f"🎯 Modificando {tipo}: warning={warning}, critical={critical}")
            
            async with async_session_maker() as db:
                # Obtener configuración actual
                from sqlalchemy import select
                query = select(ThresholdSettings).limit(1)
                result = await db.execute(query)
                thresholds = result.scalar_one_or_none()
                
                if not thresholds:
                    thresholds = ThresholdSettings()
                    db.add(thresholds)
                
                # Actualizar umbrales según el tipo
                if tipo == 'temperatura':
                    thresholds.temp_warning = warning
                    thresholds.temp_critical = critical
                elif tipo in ['vibracion', 'vibration']:
                    thresholds.vibration_warning = warning
                    thresholds.vibration_critical = critical
                elif tipo == 'rpm':
                    thresholds.rpm_warning = int(warning)
                    thresholds.rpm_critical = int(critical)
                
                thresholds.updated_at = datetime.utcnow()
                await db.commit()
                
                # PUBLICAR A MQTT para que el frontend se actualice automáticamente
                from app.mqtt_client import mqtt_handler
                import json
                
                mqtt_payload = {
                    "tipo": tipo,
                    "warning": warning,
                    "critical": critical,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                if mqtt_handler and mqtt_handler.client:
                    mqtt_handler.client.publish(
                        'motor/thresholds/update',
                        json.dumps(mqtt_payload),
                        qos=1
                    )
                    print(f"📡 Umbrales publicados a MQTT: {mqtt_payload}")
            
            return {
                "success": True,
                "action": "modificar_umbrales",
                "tipo": tipo,
                "warning": warning,
                "critical": critical,
                "message": f"✅ Umbrales de {tipo} actualizados: Warning={warning}, Critical={critical}"
            }
        
        elif action_type == 'mqtt':
            # Enviar comando MQTT
            from app.mqtt_client import mqtt_handler
            
            topic = action.get('topic')
            value = action.get('value')
            
            if mqtt_handler and mqtt_handler.client:
                mqtt_handler.client.publish(topic, str(value), qos=1)
                
                return {
                    "success": True,
                    "action": "mqtt",
                    "topic": topic,
                    "value": value,
                    "message": f"📡 Comando enviado a {topic}: {value}"
                }
            else:
                return {
                    "success": False,
                    "error": "Cliente MQTT no disponible"
                }
        
        elif action_type == 'ejecutar_tecnica':
            # Ejecutar técnica de mantenimiento
            from app.mqtt_client import mqtt_handler
            import json
            
            tecnica = action.get('tecnica')
            
            # Publicar comando para que el frontend ejecute la técnica
            if mqtt_handler and mqtt_handler.client:
                comando = {
                    "action": "ejecutar_tecnica",
                    "tecnica": tecnica,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                mqtt_handler.client.publish(
                    'motor/maintenance/command',
                    json.dumps(comando),
                    qos=1
                )
                
                return {
                    "success": True,
                    "action": "ejecutar_tecnica",
                    "tecnica": tecnica,
                    "message": f"🔧 Técnica '{tecnica}' iniciada"
                }
            else:
                return {
                    "success": False,
                    "error": "Cliente MQTT no disponible"
                }
        
        else:
            return {
                "success": False,
                "error": f"Acción desconocida: {action_type}"
            }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/ai/execute-action")
async def execute_action_direct(action_data: dict):
    """
    Endpoint directo para ejecutar acciones (sin pasar por la IA)
    Usado por el panel de control de umbrales
    """
    print(f"\n⚡ EJECUCIÓN DIRECTA DE ACCIÓN: {action_data}")
    result = await execute_ai_action(action_data)
    print(f"✅ Resultado: {result}")
    return result

@router.get("/ai/test-mqtt")
async def test_mqtt_publish():
    """TEST: Publicar mensaje MQTT directamente"""
    from app.mqtt_client import mqtt_handler
    import json
    from datetime import datetime
    
    mqtt_payload = {
        "tipo": "temperatura",
        "warning": 75,
        "critical": 88,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if mqtt_handler and mqtt_handler.client and mqtt_handler.connected:
        result = mqtt_handler.client.publish(
            'motor/thresholds/update',
            json.dumps(mqtt_payload),
            qos=1
        )
        return {
            "success": True,
            "message": "Mensaje MQTT publicado",
            "payload": mqtt_payload,
            "result_code": result.rc
        }
    else:
        return {
            "success": False,
            "error": "MQTT no conectado",
            "connected": mqtt_handler.connected if mqtt_handler else False
        }

@router.post("/ai/chat/image")
async def chat_with_image(
    message: str = Form(...),
    image: UploadFile = File(...),
    motor_data: Optional[str] = Form(None)
):
    """
    Chat con imagen (gráficas, fotos del motor, etc)
    Usa modelo LLaVA para análisis visual
    """
    try:
        # Leer imagen y convertir a base64
        image_bytes = await image.read()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Parsear motor_data si viene como JSON string
        motor_dict = None
        if motor_data:
            import json
            motor_dict = json.loads(motor_data)
        
        response = await ai_agent.chat(
            message=message,
            image_base64=image_base64,
            motor_data=motor_dict
        )
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/analyze/csv")
async def analyze_csv(
    file: UploadFile = File(...),
    question: str = Form("Analiza estos datos y proporciona un resumen")
):
    """
    Analiza archivo CSV con datos históricos del motor
    """
    try:
        # Leer CSV
        csv_bytes = await file.read()
        csv_content = csv_bytes.decode('utf-8')
        
        response = await ai_agent.analyze_csv_data(csv_content, question)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/diagnosis")
async def generate_diagnosis(request: DiagnosisRequest):
    """
    Genera diagnóstico automático del motor basado en datos actuales
    """
    try:
        response = await ai_agent.generate_diagnosis(request.motor_data)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

