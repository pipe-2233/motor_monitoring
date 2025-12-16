# Motor Monitoring Backend

Backend API para el sistema de monitoreo de motores trifásicos con detección de anomalías mediante Machine Learning.

## Características

- **FastAPI**: Framework moderno y rápido para APIs
- **SQLite + SQLAlchemy**: Base de datos para almacenamiento histórico
- **MQTT Client**: Suscripción a datos de sensores ESP32
- **Machine Learning**: Detección de anomalías con Isolation Forest (scikit-learn)
- **WebSocket**: Actualizaciones en tiempo real
- **REST API**: Endpoints para consulta de datos históricos

## Estructura del Proyecto

```
backend/
├── app/
│   ├── __init__.py          # Inicializador del módulo
│   ├── config.py            # Configuración y variables de entorno
│   ├── database.py          # Modelos SQLAlchemy y sesiones
│   ├── models.py            # Schemas Pydantic para validación
│   ├── mqtt_client.py       # Cliente MQTT para recibir datos
│   ├── ml_detector.py       # Detector de anomalías con ML
│   └── routes.py            # Endpoints de la API REST
├── models/                  # Modelos ML guardados
├── .env                     # Variables de entorno (crear desde .env.example)
├── .env.example             # Template de configuración
├── requirements.txt         # Dependencias Python
└── main.py                  # Punto de entrada de la aplicación
```

## Instalación

### 1. Requisitos Previos

- Python 3.11 o superior
- pip (gestor de paquetes Python)

### 2. Instalar Dependencias

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configurar Variables de Entorno

Copia el archivo de ejemplo y edita con tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con tus datos de HiveMQ Cloud:

```env
# MQTT Configuration
MQTT_BROKER=your-cluster.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
MQTT_TOPIC_PREFIX=motor/

# Database
DATABASE_URL=sqlite+aiosqlite:///./motor_monitoring.db

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
```

## Uso

### Iniciar el Servidor

```bash
python main.py
```

O usando uvicorn directamente:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

El servidor estará disponible en:

- API: http://localhost:8000
- Documentación interactiva: http://localhost:8000/docs
- WebSocket: ws://localhost:8000/ws

### Endpoints Principales

#### GET /

- Información del estado del sistema

#### GET /api/readings

- Obtener lecturas históricas de sensores
- Parámetros: `limit`, `start_time`, `end_time`

#### GET /api/readings/latest

- Obtener la última lectura registrada

#### GET /api/alerts

- Obtener alertas del sistema
- Parámetros: `limit`, `severity`, `resolved`, `start_time`, `end_time`

#### GET /api/alerts/active

- Obtener alertas activas (no resueltas)

#### POST /api/alerts/{alert_id}/resolve

- Marcar una alerta como resuelta

#### GET /api/logs

- Obtener logs del sistema
- Parámetros: `limit`, `level`, `source`, `start_time`

#### GET /api/stats/summary

- Estadísticas resumidas del dashboard

#### GET /api/stats/phase/{phase}

- Estadísticas por fase (A, B, o C)
- Parámetros: `hours` (período de análisis)

#### GET /api/health

- Health check del servidor

## Modelo de Machine Learning

El sistema utiliza **Isolation Forest** para detectar anomalías en los datos de los motores.

### Características Monitoreadas

- Voltaje promedio (3 fases)
- Corriente promedio (3 fases)
- Potencia promedio (3 fases)
- Frecuencia promedio (3 fases)
- Factor de potencia promedio (3 fases)
- Temperatura del motor
- Vibración
- RPM
- Desbalance de voltaje entre fases
- Desbalance de corriente entre fases

### Entrenamiento Automático

El modelo se entrena automáticamente cuando:

1. Se acumulan al menos 100 muestras
2. El sistema recibe datos continuos del MQTT

El modelo entrenado se guarda en `models/anomaly_detector.joblib` y se recarga automáticamente al reiniciar.

## Integración con MQTT

El backend se suscribe automáticamente a los siguientes topics:

- `motor/phase_a` - Datos de la fase A
- `motor/phase_b` - Datos de la fase B
- `motor/phase_c` - Datos de la fase C
- `motor/motor_metrics` - Métricas del motor

### Formato de Mensaje Esperado

```json
{
  "complete_reading": true,
  "voltage_a": 220.5,
  "current_a": 5.2,
  "power_a": 1146.6,
  "energy_a": 10.5,
  "frequency_a": 60.0,
  "pf_a": 0.85,
  "voltage_b": 221.0,
  "current_b": 5.3,
  ...
  "temperature": 65.0,
  "vibration": 5.2,
  "rpm": 1800
}
```

## Base de Datos

El sistema crea automáticamente 3 tablas en SQLite:

1. **motor_readings**: Lecturas de sensores con timestamps
2. **alerts**: Alertas generadas por umbrales excedidos
3. **system_logs**: Logs de eventos del sistema

## Umbrales de Alerta

Configurables en `.env`:

```env
TEMP_WARNING=60.0
TEMP_CRITICAL=80.0
VIBRATION_WARNING=7.0
VIBRATION_CRITICAL=10.0
RPM_WARNING=2500.0
RPM_CRITICAL=3000.0
```

## Exponer el Backend a Internet (ngrok)

Para que el ESP32 pueda conectarse desde fuera de tu red local:

1. Instalar ngrok: https://ngrok.com/download
2. Crear cuenta y obtener authtoken
3. Ejecutar:

```bash
ngrok http 8000
```

4. Usar la URL pública generada (ej: https://abc123.ngrok.io)

## Desarrollo

### Agregar Nuevos Endpoints

Edita `app/routes.py` y agrega tus endpoints:

```python
@router.get("/my-endpoint")
async def my_endpoint(db: AsyncSession = Depends(get_db)):
    # Tu código aquí
    return {"message": "Hello"}
```

### Modificar Modelos de Base de Datos

Edita `app/database.py` y agrega columnas o tablas:

```python
class NewTable(Base):
    __tablename__ = "new_table"
    id = Column(Integer, primary_key=True)
    # Más columnas...
```

## Troubleshooting

### Error: "Import pydantic_settings could not be resolved"

Esto es normal antes de instalar dependencias. Ejecuta:

```bash
pip install -r requirements.txt
```

### MQTT no se conecta

Verifica que:

1. Las credenciales en `.env` sean correctas
2. El broker MQTT esté accesible
3. El puerto sea correcto (8883 para TLS, 1883 para no-TLS)

### Base de datos bloqueada

SQLite no soporta alta concurrencia. Para producción considera usar PostgreSQL.

## Licencia

MIT
