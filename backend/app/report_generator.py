"""
Endpoint para generar reportes inteligentes usando IA
Analiza datos históricos y genera reportes personalizados
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import json
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import re

from app.database import get_db, MotorReading, Alert
from app.ai_agent import OllamaAgent

router = APIRouter(prefix="/api/reports", tags=["reports"])

class ReportRequest(BaseModel):
    prompt: str  # Solicitud del usuario: "reporte de las últimas 24 horas"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

def detect_requested_variables(prompt: str) -> list:
    """
    Detecta qué variables específicas pidió el usuario
    """
    prompt_lower = prompt.lower()
    variables = []
    
    # Mapeo de palabras clave a variables
    variable_keywords = {
        'temperatura': ['temperatura', 'temp', 'calor', 'calentamiento', 'térmico'],
        'vibracion': ['vibración', 'vibracion', 'vibra', 'oscilación'],
        'rpm': ['rpm', 'velocidad', 'revoluciones', 'rotación'],
        'voltaje': ['voltaje', 'voltage', 'voltios', 'tensión', 'volt'],
        'corriente': ['corriente', 'amperaje', 'amperes', 'amp'],
        'potencia': ['potencia', 'power', 'watts'],
        'fases': ['fase', 'fases', 'trifásico', 'fase a', 'fase b', 'fase c'],
        'alertas': ['alerta', 'alertas', 'problema', 'falla', 'error']
    }
    
    for variable, keywords in variable_keywords.items():
        if any(keyword in prompt_lower for keyword in keywords):
            variables.append(variable)
    
    # Si no se detectó ninguna variable específica, incluir todas
    if not variables:
        variables = ['all']
    
    return variables

class ReportResponse(BaseModel):
    report: str
    data_summary: dict
    time_range: dict
    generated_at: datetime

@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    request: ReportRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Genera un reporte usando IA basado en datos históricos
    """
    
    # Determinar rango de tiempo si no está especificado
    end_time = request.end_time or datetime.now()
    
    if not request.start_time:
        # Intentar extraer rango de tiempo del prompt
        start_time = extract_time_range(request.prompt, end_time)
    else:
        start_time = request.start_time
    
    # Consultar datos históricos
    query = select(MotorReading).where(
        MotorReading.timestamp >= start_time,
        MotorReading.timestamp <= end_time
    ).order_by(MotorReading.timestamp)
    
    result = await db.execute(query)
    readings = result.scalars().all()
    
    if not readings:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontraron datos entre {start_time} y {end_time}"
        )
    
    # Consultar alertas del período
    alert_query = select(Alert).where(
        Alert.timestamp >= start_time,
        Alert.timestamp <= end_time
    ).order_by(Alert.timestamp)
    
    alert_result = await db.execute(alert_query)
    alerts = alert_result.scalars().all()
    
    # Detectar variables específicas solicitadas
    requested_vars = detect_requested_variables(request.prompt)
    
    # Calcular estadísticas
    stats = calculate_statistics(readings, alerts)
    
    # Filtrar estadísticas según variables solicitadas
    if 'all' not in requested_vars:
        filtered_stats = filter_statistics(stats, requested_vars)
    else:
        filtered_stats = stats
    
    # Generar reporte con IA
    ai_agent = OllamaAgent()
    report_text = await ai_agent.generate_report(
        prompt=request.prompt,
        statistics=filtered_stats,
        time_range={"start": start_time.isoformat(), "end": end_time.isoformat()},
        readings_count=len(readings),
        alerts_count=len(alerts),
        requested_variables=requested_vars
    )
    
    return ReportResponse(
        report=report_text,
        data_summary=stats,
        time_range={
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "duration_hours": (end_time - start_time).total_seconds() / 3600
        },
        generated_at=datetime.now()
    )

def extract_time_range(prompt: str, end_time: datetime) -> datetime:
    """
    Extrae el rango de tiempo del prompt del usuario
    """
    prompt_lower = prompt.lower()
    
    # Detectar patrones comunes
    if "última hora" in prompt_lower or "last hour" in prompt_lower:
        return end_time - timedelta(hours=1)
    
    elif "últimas 2 horas" in prompt_lower or "2 horas" in prompt_lower:
        return end_time - timedelta(hours=2)
    
    elif "últimas 6 horas" in prompt_lower or "6 horas" in prompt_lower:
        return end_time - timedelta(hours=6)
    
    elif "últimas 12 horas" in prompt_lower or "12 horas" in prompt_lower:
        return end_time - timedelta(hours=12)
    
    elif "últimas 24 horas" in prompt_lower or "último día" in prompt_lower or "hoy" in prompt_lower:
        return end_time - timedelta(hours=24)
    
    elif "última semana" in prompt_lower or "7 días" in prompt_lower:
        return end_time - timedelta(days=7)
    
    elif "último mes" in prompt_lower or "30 días" in prompt_lower:
        return end_time - timedelta(days=30)
    
    # Por defecto: últimas 24 horas
    return end_time - timedelta(hours=24)

def calculate_statistics(readings: list, alerts: list) -> dict:
    """
    Calcula estadísticas del período incluyendo análisis temporal por hora
    """
    if not readings:
        return {}
    
    from collections import defaultdict
    
    # Calcular promedios y rangos
    temperatures = [r.temperature for r in readings if r.temperature is not None]
    vibrations = [r.vibration for r in readings if r.vibration is not None]
    rpms = [r.rpm for r in readings if r.rpm is not None]
    
    # Voltajes por fase
    voltage_a = [r.voltage_a for r in readings if r.voltage_a is not None]
    voltage_b = [r.voltage_b for r in readings if r.voltage_b is not None]
    voltage_c = [r.voltage_c for r in readings if r.voltage_c is not None]
    
    # Corrientes por fase
    current_a = [r.current_a for r in readings if r.current_a is not None]
    current_b = [r.current_b for r in readings if r.current_b is not None]
    current_c = [r.current_c for r in readings if r.current_c is not None]
    
    # Alertas por severidad
    alerts_by_severity = {
        "critical": len([a for a in alerts if a.severity == "critical"]),
        "warning": len([a for a in alerts if a.severity == "warning"]),
        "info": len([a for a in alerts if a.severity == "info"])
    }
    
    # Alertas por categoría
    alerts_by_category = {}
    for alert in alerts:
        category = alert.category
        alerts_by_category[category] = alerts_by_category.get(category, 0) + 1
    
    # ===== ANÁLISIS TEMPORAL POR HORA =====
    hourly_data = defaultdict(lambda: {
        'temperatures': [], 'vibrations': [], 'rpms': [],
        'alerts': 0, 'critical_alerts': 0
    })
    
    # Agrupar datos por hora
    for r in readings:
        hour_key = r.timestamp.replace(minute=0, second=0, microsecond=0)
        if r.temperature: hourly_data[hour_key]['temperatures'].append(r.temperature)
        if r.vibration: hourly_data[hour_key]['vibrations'].append(r.vibration)
        if r.rpm: hourly_data[hour_key]['rpms'].append(r.rpm)
    
    # Agrupar alertas por hora
    for alert in alerts:
        hour_key = alert.timestamp.replace(minute=0, second=0, microsecond=0)
        if hour_key in hourly_data:
            hourly_data[hour_key]['alerts'] += 1
            if alert.severity == 'critical':
                hourly_data[hour_key]['critical_alerts'] += 1
    
    # Calcular estadísticas por hora
    hourly_stats = []
    for hour, data in sorted(hourly_data.items()):
        if data['vibrations'] or data['temperatures']:
            hourly_stats.append({
                'hour': hour.strftime('%Y-%m-%d %H:%M'),
                'temperature_avg': round(sum(data['temperatures']) / len(data['temperatures']), 2) if data['temperatures'] else 0,
                'temperature_max': round(max(data['temperatures']), 2) if data['temperatures'] else 0,
                'vibration_avg': round(sum(data['vibrations']) / len(data['vibrations']), 2) if data['vibrations'] else 0,
                'vibration_max': round(max(data['vibrations']), 2) if data['vibrations'] else 0,
                'rpm_avg': round(sum(data['rpms']) / len(data['rpms']), 0) if data['rpms'] else 0,
                'alerts': data['alerts'],
                'critical_alerts': data['critical_alerts']
            })
    
    # Identificar horas críticas (vibración > 8 o temperatura > 70 o alertas críticas > 0)
    critical_hours = [
        h for h in hourly_stats 
        if h['vibration_max'] > 8 or h['temperature_max'] > 70 or h['critical_alerts'] > 0
    ]
    
    stats = {
        "total_readings": len(readings),
        "temperature": {
            "avg": round(sum(temperatures) / len(temperatures), 2) if temperatures else 0,
            "min": round(min(temperatures), 2) if temperatures else 0,
            "max": round(max(temperatures), 2) if temperatures else 0
        },
        "vibration": {
            "avg": round(sum(vibrations) / len(vibrations), 2) if vibrations else 0,
            "min": round(min(vibrations), 2) if vibrations else 0,
            "max": round(max(vibrations), 2) if vibrations else 0
        },
        "rpm": {
            "avg": round(sum(rpms) / len(rpms), 0) if rpms else 0,
            "min": round(min(rpms), 0) if rpms else 0,
            "max": round(max(rpms), 0) if rpms else 0
        },
        "phase_a": {
            "voltage_avg": round(sum(voltage_a) / len(voltage_a), 2) if voltage_a else 0,
            "current_avg": round(sum(current_a) / len(current_a), 2) if current_a else 0
        },
        "phase_b": {
            "voltage_avg": round(sum(voltage_b) / len(voltage_b), 2) if voltage_b else 0,
            "current_avg": round(sum(current_b) / len(current_b), 2) if current_b else 0
        },
        "phase_c": {
            "voltage_avg": round(sum(voltage_c) / len(voltage_c), 2) if voltage_c else 0,
            "current_avg": round(sum(current_c) / len(current_c), 2) if current_c else 0
        },
        "alerts": {
            "total": len(alerts),
            "by_severity": alerts_by_severity,
            "by_category": alerts_by_category
        },
        "hourly_analysis": hourly_stats,
        "critical_hours": critical_hours
    }
    
    return stats
def filter_statistics(stats: dict, requested_vars: list) -> dict:
    """
    Filtra las estadísticas para incluir solo las variables solicitadas
    """
    filtered = {
        "total_readings": stats.get("total_readings", 0)
    }
    
    # Mapeo de variables a sus claves en stats
    var_mapping = {
        'temperatura': ['temperature', 'hourly_analysis'],
        'vibracion': ['vibration', 'hourly_analysis', 'critical_hours'],
        'rpm': ['rpm'],
        'voltaje': ['phase_a', 'phase_b', 'phase_c'],
        'corriente': ['phase_a', 'phase_b', 'phase_c'],
        'fases': ['phase_a', 'phase_b', 'phase_c'],
        'alertas': ['alerts']
    }
    
    # Incluir solo las estadísticas solicitadas
    for var in requested_vars:
        if var in var_mapping:
            for key in var_mapping[var]:
                if key in stats:
                    filtered[key] = stats[key]
    
    # Si pide vibración o temperatura, incluir análisis temporal
    if any(v in requested_vars for v in ['vibracion', 'temperatura']):
        if 'hourly_analysis' in stats:
            # Filtrar solo las columnas relevantes del análisis por hora
            filtered['hourly_analysis'] = []
            for hour_data in stats.get('hourly_analysis', []):
                hour_filtered = {'hour': hour_data['hour']}
                if 'temperatura' in requested_vars:
                    hour_filtered['temperature_avg'] = hour_data.get('temperature_avg')
                    hour_filtered['temperature_max'] = hour_data.get('temperature_max')
                if 'vibracion' in requested_vars:
                    hour_filtered['vibration_avg'] = hour_data.get('vibration_avg')
                    hour_filtered['vibration_max'] = hour_data.get('vibration_max')
                hour_filtered['alerts'] = hour_data.get('alerts', 0)
                hour_filtered['critical_alerts'] = hour_data.get('critical_alerts', 0)
                filtered['hourly_analysis'].append(hour_filtered)
        
        if 'critical_hours' in stats:
            filtered['critical_hours'] = stats['critical_hours']
    
    return filtered

def markdown_to_pdf(markdown_text: str, title: str = "Reporte de Motor") -> io.BytesIO:
    """
    Convierte texto markdown a PDF
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                          rightMargin=72, leftMargin=72,
                          topMargin=72, bottomMargin=18)
    
    # Estilos
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Justify', alignment=TA_JUSTIFY))
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading2_style = ParagraphStyle(
        'CustomHeading2',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    heading3_style = ParagraphStyle(
        'CustomHeading3',
        parent=styles['Heading3'],
        fontSize=14,
        textColor=colors.HexColor('#3b82f6'),
        spaceAfter=10,
        spaceBefore=10
    )
    
    # Contenido
    story = []
    
    # Procesar el markdown línea por línea
    lines = markdown_text.split('\n')
    
    for line in lines:
        line = line.strip()
        
        if not line:
            story.append(Spacer(1, 12))
            continue
        
        # Título principal (# )
        if line.startswith('# '):
            text = line[2:].replace('📊', '').strip()
            story.append(Paragraph(text, title_style))
            story.append(Spacer(1, 12))
        
        # Subtítulo (## )
        elif line.startswith('## '):
            text = line[3:].strip()
            story.append(Paragraph(text, heading2_style))
            story.append(Spacer(1, 6))
        
        # Subsección (### )
        elif line.startswith('### '):
            text = line[4:].replace('🌡️', '').replace('⚡', '').replace('🔄', '').replace('🚨', '').replace('⏰', '').strip()
            story.append(Paragraph(text, heading3_style))
            story.append(Spacer(1, 6))
        
        # Lista (- )
        elif line.startswith('- '):
            text = line[2:].replace('**', '<b>').replace('**', '</b>')
            text = f"• {text}"
            story.append(Paragraph(text, styles['Normal']))
            story.append(Spacer(1, 3))
        
        # Lista con + 
        elif line.startswith(' + '):
            text = line[3:].strip()
            text = f"  ◦ {text}"
            story.append(Paragraph(text, styles['Normal']))
            story.append(Spacer(1, 3))
        
        # Separador (---)
        elif line.startswith('---'):
            story.append(Spacer(1, 20))
        
        # Texto normal
        else:
            if line:
                text = line.replace('**', '<b>').replace('**', '</b>')
                story.append(Paragraph(text, styles['Normal']))
                story.append(Spacer(1, 6))
    
    # Generar PDF
    doc.build(story)
    buffer.seek(0)
    return buffer

@router.post("/generate-pdf")
async def generate_pdf_report(
    request: ReportRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Genera un reporte en formato PDF
    """
    # Generar el reporte en texto primero
    end_time = request.end_time or datetime.now()
    
    if not request.start_time:
        start_time = extract_time_range(request.prompt, end_time)
    else:
        start_time = request.start_time
    
    # Consultar datos históricos
    query = select(MotorReading).where(
        MotorReading.timestamp >= start_time,
        MotorReading.timestamp <= end_time
    ).order_by(MotorReading.timestamp)
    
    result = await db.execute(query)
    readings = result.scalars().all()
    
    if not readings:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontraron datos entre {start_time} y {end_time}"
        )
    
    # Consultar alertas
    alert_query = select(Alert).where(
        Alert.timestamp >= start_time,
        Alert.timestamp <= end_time
    ).order_by(Alert.timestamp)
    
    alert_result = await db.execute(alert_query)
    alerts = alert_result.scalars().all()
    
    # Detectar variables solicitadas
    requested_vars = detect_requested_variables(request.prompt)
    
    # Calcular estadísticas
    stats = calculate_statistics(readings, alerts)
    
    # Filtrar estadísticas según variables solicitadas
    if 'all' not in requested_vars:
        filtered_stats = filter_statistics(stats, requested_vars)
    else:
        filtered_stats = stats
    
    # Generar reporte con IA
    ai_agent = OllamaAgent()
    report_text = await ai_agent.generate_report(
        prompt=request.prompt,
        statistics=filtered_stats,
        time_range={"start": start_time.isoformat(), "end": end_time.isoformat()},
        readings_count=len(readings),
        alerts_count=len(alerts),
        requested_variables=requested_vars
    )
    
    # Convertir a PDF
    pdf_buffer = markdown_to_pdf(report_text, "Reporte de Motor")
    
    # Nombre del archivo
    filename = f"reporte_motor_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )