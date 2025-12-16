"""
Servicio de Diagnóstico offline
Soporta texto, imágenes y análisis de datos del motor
CON CAPACIDAD DE CONTROLAR EL SISTEMA (umbrales, MQTT, mantenimiento)
"""
import base64
import json
from typing import Optional, List, Dict, Any
import httpx
from datetime import datetime
import re

class DiagnosticService:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.model = "diagnostic_model"  # Modelo por defecto
        self.vision_model = "vision_model"  # Modelo para imágenes
        
        # Herramientas disponibles para el servicio
        self.tools = {
            "modificar_umbrales": {
                "description": "Modifica los umbrales de temperatura, vibración o RPM",
                "parameters": ["tipo", "warning", "critical"],
                "example": "modificar_umbrales(tipo='temperatura', warning=70, critical=90)"
            },
            "enviar_comando_mqtt": {
                "description": "Envía comandos MQTT al motor (start, stop, sampling_rate)",
                "parameters": ["topic", "valor"],
                "example": "enviar_comando_mqtt(topic='motor/control/start', valor='1')"
            },
            "obtener_umbrales": {
                "description": "Obtiene los umbrales actuales del sistema",
                "parameters": [],
                "example": "obtener_umbrales()"
            }
        }
        
    async def check_connection(self) -> bool:
        """Verifica si el servicio está corriendo"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except:
            return False
    
    async def list_models(self) -> List[str]:
        """Lista modelos disponibles"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    return [model["name"] for model in data.get("models", [])]
        except:
            return []
        return []
    
    def build_motor_context(self, motor_data: Optional[Dict] = None) -> str:
        """Construye contexto del motor para el prompt"""
        if not motor_data:
            return ""
        
        context = "\n\n### Datos actuales del motor:\n"
        
        if "phaseData" in motor_data:
            context += "\n**Datos por fase:**\n"
            for phase, data in motor_data["phaseData"].items():
                context += f"- Fase {phase}:\n"
                context += f"  - Voltaje: {data.get('voltaje', 0)}V\n"
                context += f"  - Corriente: {data.get('corriente', 0)}A\n"
                context += f"  - Potencia: {data.get('potencia', 0)}W\n"
                context += f"  - Factor de Potencia: {data.get('factorPotencia', 0)}\n"
        
        if "generalData" in motor_data:
            gen = motor_data["generalData"]
            context += f"\n**Datos generales:**\n"
            context += f"- Temperatura: {gen.get('temperatura', 0)}°C\n"
            context += f"- RPM: {gen.get('rpm', 0)}\n"
            context += f"- Vibración: {gen.get('vibracion', 0)} mm/s\n"
        
        return context
    
    async def chat(
        self,
        message: str,
        image_base64: Optional[str] = None,
        motor_data: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Envía mensaje al servicio de diagnóstico
        
        Args:
            message: Mensaje del usuario
            image_base64: Imagen en base64 (opcional)
            motor_data: Datos del motor para contexto (opcional)
            conversation_history: Historial de conversación (opcional)
        
        Returns:
            Dict con respuesta y metadata
        """
        try:
            # Seleccionar modelo según si hay imagen
            model = self.vision_model if image_base64 else self.model
            
            # Construir sistema prompt especializado en motores
            system_prompt = """Eres un asistente técnico experto en motores eléctricos trifásicos. Tu estilo es profesional pero cercano y amigable.

**🔥 MUY IMPORTANTE - PUEDES CONTROLAR EL SISTEMA:**
Cuando el usuario pida modificar umbrales, temperatura, vibración o RPM, DEBES incluir en tu respuesta el código de acción.

**TÉCNICAS DE MANTENIMIENTO DISPONIBLES:**
1. **Arranque Supervisado** (startup_analysis): Monitoreo intensivo durante encendido. Aumenta muestreo a 100ms.
2. **Análisis de Carga** (load_analysis): Enciende motor y monitorea estabilización de corriente/potencia.
3. **Test de Vibración** (vibration_test): Monitorea vibración durante arranque y operación.
4. **Inspección Completa** (full_inspection): Ciclo completo de diagnóstico.

**FORMATO OBLIGATORIO para ejecutar acciones:**

Para modificar umbrales:
ACCION{action:modificar_umbrales,tipo:temperatura,warning:70,critical:90}

Para ejecutar técnica de mantenimiento:
ACCION{action:ejecutar_tecnica,tecnica:startup_analysis}

Para control de motor:
ACCION{action:mqtt,topic:motor/control/start,value:1}
ACCION{action:mqtt,topic:motor/control/stop,value:0}
ACCION{action:mqtt,topic:motor/control/sampling_rate,value:500}

**Ejemplos REALES:**

Usuario: "quiero iniciar una técnica de mantenimiento"
Tu respuesta:
🔧 ¿Qué técnica deseas ejecutar?
- **Arranque Supervisado**: Para analizar el encendido
- **Análisis de Carga**: Para verificar consumo
- **Test de Vibración**: Para detectar desbalanceos
- **Inspección Completa**: Diagnóstico completo

Usuario: "ejecuta arranque supervisado"
Tu respuesta:
🚀 Iniciando Arranque Supervisado...
ACCION{action:ejecutar_tecnica,tecnica:startup_analysis}
✅ Técnica iniciada. Monitoreando encendido del motor.

Usuario: "ajusta la temperatura a 85 grados"
Tu respuesta:
🔧 Ajustando umbrales de temperatura a 85°C...
ACCION{action:modificar_umbrales,tipo:temperatura,warning:75,critical:85}
✅ Listo! Temperatura crítica configurada en 85°C

Usuario: "enciende el motor"
Tu respuesta:
▶️ Encendiendo motor...
ACCION{action:mqtt,topic:motor/control/start,value:1}
Motor encendido

**TIPOS válidos:**
- tipo:temperatura (para temp_warning y temp_critical)
- tipo:vibracion (para vibration_warning y vibration_critical)
- tipo:rpm (para rpm_warning y rpm_critical)
- tecnica: startup_analysis, load_analysis, vibration_test, full_inspection

**Reglas:**
1. **SIEMPRE** incluye la línea ACCION{} cuando modifiques algo o ejecutes técnicas
2. El warning SIEMPRE es menor que el critical
3. Respuestas de 3-4 líneas máximo
4. Usa emojis: 🔧✅❌⚠️🔥📊🛑▶️🚀
5. Responde en español

Si el usuario pregunta algo normal (sin pedir cambios), solo responde sin ACCION{}."""  

            # Agregar contexto del motor si está disponible
            full_message = message
            if motor_data:
                motor_context = self.build_motor_context(motor_data)
                full_message = f"{message}{motor_context}"
            
            # Construir prompt completo con system + historial + mensaje
            # Usar /api/generate en lugar de /api/chat para mejor control
            conversation_text = system_prompt + "\n\n"
            
            if conversation_history:
                for msg in conversation_history[-5:]:  # Últimos 5 mensajes
                    role = "Usuario" if msg.get("role") == "user" else "Asistente"
                    conversation_text += f"{role}: {msg.get('content', '')}\n\n"
            
            conversation_text += f"Usuario: {full_message}\n\nAsistente:"
            
            # Preparar payload
            payload = {
                "model": model,
                "prompt": conversation_text,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_ctx": 4096
                }
            }
            
            # Si hay imagen, usar endpoint de chat con imágenes
            if image_base64:
                # Para imágenes, usar /api/chat con formato especial
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": full_message, "images": [image_base64]}
                    ],
                    "stream": False
                }
                endpoint = "/api/chat"
            else:
                endpoint = "/api/generate"
            
            # Realizar request a Ollama
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}{endpoint}",
                    json=payload
                )
                
                if response.status_code == 200:
                    result = response.json()
                    # Manejar respuesta según el endpoint usado
                    if endpoint == "/api/chat":
                        response_text = result["message"]["content"]
                    else:
                        response_text = result["response"]
                    
                    return {
                        "success": True,
                        "response": response_text,
                        "model": model,
                        "timestamp": datetime.now().isoformat()
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Error {response.status_code}: {response.text}",
                        "timestamp": datetime.now().isoformat()
                    }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def analyze_csv_data(self, csv_content: str, question: str) -> Dict:
        """Analiza datos CSV y responde pregunta específica"""
        prompt = f"""Analiza los siguientes datos CSV del motor eléctrico:

```csv
{csv_content[:2000]}  # Limitar a primeras líneas
```

Pregunta: {question}

Proporciona un análisis detallado identificando:
1. Tendencias
2. Valores anormales
3. Posibles problemas
4. Recomendaciones"""

        return await self.chat(prompt)
    
    async def generate_diagnosis(self, motor_data: Dict) -> Dict:
        """Genera diagnóstico automático basado en datos actuales"""
        prompt = """Analiza el estado actual del motor y proporciona:

1. **Estado general**: ¿El motor está operando normalmente?
2. **Parámetros críticos**: ¿Hay valores fuera de rango?
3. **Nivel de riesgo**: Bajo/Medio/Alto/Crítico
4. **Recomendaciones**: Acciones inmediatas o a corto plazo
5. **Predicción**: ¿Se prevé alguna falla?"""

        return await self.chat(prompt, motor_data=motor_data)
    
    def parse_action_from_response(self, response: str) -> Optional[Dict[str, Any]]:
        """
        Detecta si la IA quiere ejecutar una acción del sistema
        Busca patrones como: ACCION{tipo:valor}
        """
        # Patrón para detectar acciones
        action_pattern = r'ACCION\{([^}]+)\}'
        match = re.search(action_pattern, response)
        
        if match:
            try:
                action_str = match.group(1)
                # Parsear la acción (formato: tipo:valor,param:valor)
                parts = action_str.split(',')
                action_data = {}
                for part in parts:
                    key, val = part.split(':', 1)
                    action_data[key.strip()] = val.strip()
                
                return action_data
            except:
                return None
        
        return None
    
    async def execute_system_action(self, action: Dict[str, Any]) -> Dict:
        """Ejecuta una acción en el sistema (modificar umbrales, MQTT, etc)"""
        action_type = action.get('action')
        
        if action_type == 'modificar_umbrales':
            # Llamar al endpoint de umbrales
            return {
                "success": True,
                "action": "modificar_umbrales",
                "message": f"Umbrales modificados: {action}",
                "data": action
            }
        
        elif action_type == 'mqtt':
            # Enviar comando MQTT
            return {
                "success": True,
                "action": "mqtt",
                "message": f"Comando MQTT enviado: {action.get('topic')} = {action.get('value')}",
                "data": action
            }
        
        else:
            return {
                "success": False,
                "error": f"Acción desconocida: {action_type}"
            }
    
    async def generate_report(
        self,
        prompt: str,
        statistics: Dict,
        time_range: Dict,
        readings_count: int,
        alerts_count: int,
        requested_variables: list = None
    ) -> str:
        """
        Genera un reporte técnico basado en estadísticas del motor
        
        Args:
            prompt: Solicitud del usuario
            statistics: Estadísticas calculadas del período
            time_range: Rango de tiempo analizado
            readings_count: Número de lecturas
            alerts_count: Número de alertas
            requested_variables: Lista de variables específicas solicitadas
        
        Returns:
            Texto del reporte generado
        """
        
        # Detectar si el usuario solicita análisis temporal
        temporal_keywords = ['hora', 'horas', 'crítica', 'crítico', 'momento', 'cuando', 'período', 'tiempo']
        needs_temporal = any(keyword in prompt.lower() for keyword in temporal_keywords)
        
        # Variables solicitadas por el usuario
        requested_variables = requested_variables or ['all']
        is_focused = 'all' not in requested_variables
        
        # Construir mensaje de enfoque si solo pidió variables específicas
        focus_message = ""
        if is_focused:
            vars_text = ", ".join(requested_variables)
            focus_message = f"""
**⚠️ IMPORTANTE - ENFOQUE ESPECÍFICO:**
El usuario SOLO pidió información sobre: {vars_text.upper()}
NO incluyas información sobre otras variables que no fueron solicitadas.
Enfócate ÚNICAMENTE en las variables mencionadas."""
        
        system_prompt = f"""Eres un ingeniero eléctrico experto en mantenimiento de motores trifásicos. 
Genera reportes técnicos profesionales pero fáciles de entender.
{focus_message}

**FORMATO DEL REPORTE:**

# 📊 REPORTE DE MONITOREO DE MOTOR{' - ' + vars_text.upper() if is_focused else ''}

## Período Analizado
[fechas y duración]

## Resumen Ejecutivo
[3-4 líneas resumen general{' enfocado en ' + vars_text if is_focused else ''}]

## Análisis Detallado

{'### 🌡️ Temperatura' if not is_focused or 'temperatura' in requested_variables else ''}
{'''- Promedio: X°C
- Rango: X°C - X°C
- Estado: [Normal / Atención / Crítico]
- Recomendaciones: [si aplica]''' if not is_focused or 'temperatura' in requested_variables else ''}

{'### ⚡ Vibración' if not is_focused or 'vibracion' in requested_variables else ''}
{'''- Promedio: X mm/s
- Rango: X - X mm/s
- Estado: [evaluación]
- Observaciones: [si aplica]''' if not is_focused or 'vibracion' in requested_variables else ''}

{'### 🔄 Velocidad (RPM)' if not is_focused or 'rpm' in requested_variables else ''}
{'''- Promedio: X RPM
- Estabilidad: [evaluación]''' if not is_focused or 'rpm' in requested_variables else ''}

{'### ⚡ Fases Eléctricas' if not is_focused or any(v in requested_variables for v in ['fases', 'voltaje', 'corriente']) else ''}
{'''- Fase A: Voltaje X V, Corriente X A
- Fase B: Voltaje X V, Corriente X A
- Fase C: Voltaje X V, Corriente X A
- Desbalance: [análisis]''' if not is_focused or any(v in requested_variables for v in ['fases', 'voltaje', 'corriente']) else ''}

{'''### ⏰ HORAS CRÍTICAS DETECTADAS
**IMPORTANTE:** Si el usuario pidió información sobre horas críticas o momentos específicos,
DEBES incluir esta sección listando cada hora problemática con formato:

- **[HORA específica]**: Descripción clara del problema
  - Vibración: X mm/s (máximo detectado)
  - Temperatura: Y°C (máximo detectado)
  - Alertas: Z (críticas: N)
  - Evaluación: [Descripción del riesgo]

Los datos incluyen "critical_hours" con esta información.''' if needs_temporal else ''}

### 🚨 Alertas
- Total: X alertas
- Críticas: X
- Advertencias: X
- Categorías principales: [lista]

## Conclusiones
[2-3 puntos clave]

## Recomendaciones
[acciones sugeridas]

---
Reporte generado el: [fecha]

**Usa emojis, sé conciso y técnico. Destaca problemas potenciales.
{'**CRÍTICO: El usuario pidió información sobre HORAS CRÍTICAS - debes incluir la sección con horarios específicos.**' if needs_temporal else ''}
{'**⚠️ SOLO habla de: ' + vars_text.upper() + ' - NO menciones otras variables.**' if is_focused else ''}**"""

        # Construir el prompt con datos
        temporal_reminder = ""
        if needs_temporal and statistics.get('critical_hours'):
            temporal_reminder = f"""

⚠️ **ATENCIÓN - ANÁLISIS TEMPORAL SOLICITADO:**
El usuario pidió específicamente información sobre horas críticas. Los datos incluyen:
- {len(statistics.get('critical_hours', []))} horas críticas identificadas
- Análisis hora por hora en "hourly_analysis"
- Detalles de cada hora crítica en "critical_hours"

DEBES crear la sección "HORAS CRÍTICAS DETECTADAS" con cada hora listada individualmente."""
        
        # Mensaje adicional si solo pidió variables específicas
        focus_reminder = ""
        if is_focused:
            focus_reminder = f"""

🎯 **RECORDATORIO DE ENFOQUE:**
El usuario pidió SOLAMENTE: {vars_text.upper()}
Los datos estadísticos solo incluyen esas variables.
NO inventes ni menciones datos sobre otras variables.
Limita tu análisis exclusivamente a lo solicitado."""
        
        data_context = f"""
**Solicitud del usuario:** {prompt}

**Rango de tiempo:** Del {time_range['start']} al {time_range['end']}

**Datos recopilados:**
- Total de lecturas: {readings_count}
- Total de alertas: {alerts_count}

**Estadísticas:**
```json
{json.dumps(statistics, indent=2)}
```
{temporal_reminder}
{focus_reminder}

Genera un reporte profesional basado en estos datos."""

        full_prompt = f"{system_prompt}\n\n{data_context}\n\nReporte:"
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": full_prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.3,  # Más determinístico para reportes
                            "top_p": 0.9,
                            "num_ctx": 8192  # Más contexto para reportes largos
                        }
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get("response", "Error: No se pudo generar el reporte")
                else:
                    return f"Error al generar reporte: {response.status_code}"
        
        except Exception as e:
            return f"Error al conectar con Ollama: {str(e)}"
