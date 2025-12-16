# Motor Monitoring

## Descripción
Este proyecto implementa un sistema de monitoreo de motores trifásicos industriales. Incluye análisis predictivo, diagnóstico automático, control remoto mediante MQTT, y una interfaz web moderna para visualización de métricas.

## Características
- **Análisis Predictivo**: Detecta anomalías en tiempo real.
- **Diagnóstico Automático**: Genera reportes detallados sobre el estado del motor.
- **Control Remoto**: Permite encender/apagar motores y ajustar parámetros mediante MQTT.
- **Interfaz Web**: Visualización de métricas y gráficos interactivos.

## Estructura del Proyecto
- **backend/**: Contiene la lógica del servidor, análisis de datos y control del motor.
- **motor-monitoring-app/**: Aplicación web para monitoreo y control.
- **esp32/**: Código para microcontroladores ESP32.

## Instalación
1. Clona este repositorio:
   ```bash
   git clone https://github.com/pipe-2233/motor_monitoring.git
   ```
2. Configura el entorno del backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. Inicia el servidor:
   ```bash
   python main.py
   ```
4. Configura la aplicación web:
   ```bash
   cd motor-monitoring-app
   npm install
   npm run dev
   ```

## Uso
- Accede a la aplicación web en `http://localhost:3000`.
- Monitorea métricas en tiempo real y ajusta parámetros según sea necesario.

## Contribución
¡Las contribuciones son bienvenidas! Por favor, abre un issue o envía un pull request.

## Licencia
Este proyecto está bajo la licencia MIT. Consulta el archivo LICENSE para más detalles.