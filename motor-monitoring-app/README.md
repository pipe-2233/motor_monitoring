# 🏭 Sistema de Monitoreo de Motores Trifásicos

Interfaz web profesional para monitoreo en tiempo real de motores eléctricos trifásicos con sensores PZEM-004T.

## ✨ Características

### 📊 Dashboard Principal

- **Motor 3D Animado**: Visualización en 3D con animaciones basadas en:
  - Vibración (sacudidas del motor)
  - Temperatura (cambio de color: amarillo > naranja > rojo)
  - RPM (velocidad de rotación)
  - Alertas visuales (luz pulsante en condiciones críticas)
- **Estadísticas en Tiempo Real**: Temperatura, RPM, Vibración
- **Gráficas Combinadas**: Voltaje y Corriente de las 3 fases en tiempo real
- **Paneles de Fase**: Métricas detalladas por fase (A, B, C):
  - Voltaje, Corriente, Potencia
  - Energía, Frecuencia, Factor de Potencia

### 🔍 Otras Vistas

- **Monitoring**: Gráficos históricos y tabla de datos trifásicos
- **Errors**: Monitoreo de alertas críticas y advertencias
- **Logs**: Registro completo de eventos del sistema
- **Settings**: Configuración de MQTT y umbrales de alerta

### 🎮 Panel de Pruebas

- Modo Test / Modo MQTT (conmutador)
- Control manual de variables generales y por fase
- 4 presets de prueba: Normal, Alta Carga, Sobrecarga, Crítico

### 🎨 Sistema de Alertas

- **Temperatura**: >60°C advertencia, >80°C crítico
- **Vibración**: >7 mm/s advertencia, >10 mm/s crítico
- **RPM**: >2500 advertencia, >3000 crítico
- **Voltaje**: <210V o >230V advertencia
- **Corriente**: >15A advertencia, >20A crítico
- **Factor de Potencia**: <0.85 advertencia, <0.7 crítico

## 🚀 Instalación

```bash
# Clonar el repositorio
cd motor-monitoring-app

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El servidor estará disponible en: `http://localhost:5173/` (o 5174 si el puerto está ocupado)

## 📋 Dependencias Principales

```json
{
  "react": "^18.3.1",
  "react-three/fiber": "^8.18.2",
  "chart.js": "^4.4.8",
  "mqtt": "^5.3.0",
  "tailwindcss": "^4.0.15",
  "lucide-react": "^0.469.0"
}
```

## 🔌 Configuración MQTT

### HiveMQ Cloud (Recomendado)

1. Ve a [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/)
2. Crea una cuenta gratuita
3. Configura las credenciales en `Settings`:
   - Broker URL: `wss://tu-cluster.s1.eu.hivemq.cloud:8884/mqtt`
   - Usuario: tu_usuario
   - Contraseña: tu_contraseña

### Topics MQTT Esperados

**Datos Generales:**

- `motor/temperatura` - Temperatura del motor (°C)
- `motor/rpm` - Revoluciones por minuto
- `motor/vibracion` - Vibración (mm/s)

**Fase A:**

- `motor/fase_a/voltaje` - Voltaje (V)
- `motor/fase_a/corriente` - Corriente (A)
- `motor/fase_a/potencia` - Potencia (W)
- `motor/fase_a/energia` - Energía (kWh)
- `motor/fase_a/frecuencia` - Frecuencia (Hz)
- `motor/fase_a/factor_potencia` - Factor de potencia

**Fase B:** (igual que Fase A, con `fase_b`)

**Fase C:** (igual que Fase A, con `fase_c`)

## 🎯 Uso

### Modo MQTT

1. Configura las credenciales MQTT en Settings
2. La interfaz se conectará automáticamente
3. Los datos se actualizarán en tiempo real

### Modo Test

1. Haz clic en el panel de pruebas (esquina inferior derecha)
2. Activa el switch "Test Mode"
3. Ajusta manualmente las variables con los sliders
4. Usa los botones de preset para escenarios predefinidos

## 📁 Estructura del Proyecto

```
motor-monitoring-app/
├── src/
│   ├── components/
│   │   ├── Header.jsx              # Encabezado
│   │   ├── Sidebar.jsx             # Barra lateral navegación
│   │   ├── Motor3D.jsx             # Motor 3D animado
│   │   ├── Stats.jsx               # Tarjetas de estadísticas
│   │   ├── PhasePanel.jsx          # Panel de datos por fase
│   │   ├── CombinedChart.jsx       # Gráficas de voltaje/corriente
│   │   └── TestControls.jsx        # Panel de pruebas
│   ├── views/
│   │   ├── DashboardView.jsx       # Vista principal
│   │   ├── MonitoringView.jsx      # Vista de monitoreo
│   │   ├── ErrorsView.jsx          # Vista de errores
│   │   ├── LogsView.jsx            # Vista de logs
│   │   └── SettingsView.jsx        # Vista de configuración
│   ├── context/
│   │   └── MQTTContext.jsx         # Estado global MQTT
│   ├── config/
│   │   └── config.js               # Configuración MQTT
│   └── App.jsx                     # Componente principal
├── public/
│   └── models/
│       └── motor.glb               # Modelo 3D del motor
└── package.json
```

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

## 🌐 Despliegue

### Vercel (Recomendado)

1. Push tu código a GitHub
2. Importa el proyecto en [Vercel](https://vercel.com)
3. Configura las variables de entorno si es necesario
4. Deploy automático en cada push

### Build Manual

```bash
npm run build
# Los archivos estarán en la carpeta dist/
```

## 🎨 Personalización

### Cambiar Colores de Fases

Edita `PhasePanel.jsx`:

```jsx
const colors = {
  A: "#ef4444", // Rojo
  B: "#eab308", // Amarillo
  C: "#3b82f6", // Azul
};
```

### Ajustar Umbrales de Alerta

Edita los valores en `Stats.jsx` y `PhasePanel.jsx`:

```jsx
const isTemperatureCritical = temp > 80;
const isTemperatureWarning = temp > 60;
```

## 🐛 Solución de Problemas

### El motor 3D no se muestra

- Verifica que `motor.glb` esté en `public/models/`
- Abre la consola del navegador para ver errores
- El sistema tiene un fallback a geometría básica

### No hay datos MQTT

1. Verifica las credenciales en Settings
2. Revisa la consola del navegador
3. Usa el Modo Test para verificar que la interfaz funciona
4. Comprueba que los topics MQTT sean correctos

### Puerto 5173 en uso

El servidor automáticamente usará el puerto 5174 o superior

## 📝 TODO

- [ ] Guardar configuración en localStorage
- [ ] Exportar datos a CSV/PDF
- [ ] Sistema de notificaciones push
- [ ] Histórico de datos en base de datos
- [ ] Autenticación de usuarios
- [ ] Dashboard multi-motor

## 👨‍💻 Autor

Interfaz desarrollada con React + Vite + Tailwind CSS

## 📄 Licencia

MIT License - Siéntete libre de usar este proyecto

```
src/
├── components/     # Componentes React
├── context/        # Context API (MQTT)
├── config/         # Configuración
├── App.jsx         # App principal
└── main.jsx        # Entry point
```

---

## ☁️ Deploy en Vercel

```bash
git init && git add . && git commit -m "Init"
vercel
```

---

**¡Listo para monitorear! 🎉**
