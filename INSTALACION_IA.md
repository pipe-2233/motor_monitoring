# 🤖 Instalación del Servicio de Diagnóstico

## Requisitos
- **RAM**: 8GB mínimo (16GB+ recomendado) ✅ Tienes 32GB
- **GPU**: Opcional pero acelera (RTX 4070 detectada) ✅
- **Espacio**: ~5-10GB para modelos

---

## Paso 1: Instalar el Servicio

### Windows:
1. Descarga el instalador desde el proveedor correspondiente.
2. Ejecuta el instalador.
3. El servicio se ejecutará automáticamente en segundo plano.

### Verificar instalación:
```powershell
servicio --version
```

---

## Paso 2: Descargar Modelos

### Modelo principal (texto):
```powershell
servicio pull modelo_texto:3b
```
*~2GB - Modelo rápido y eficiente para análisis de texto*

### Modelo con visión (imágenes):
```powershell
servicio pull modelo_vision
```
*~5GB - Para analizar imágenes, gráficas, fotos del motor*

---

## Paso 3: Configurar Backend

### Instalar dependencia en el backend:
```powershell
cd "C:\interfaz Monitoreo Condicion de Motores\backend"
pip install httpx
```

### Verificar que el servicio esté corriendo:
```powershell
# Debería devolver JSON con modelos instalados
curl http://localhost:11434/api/tags
```

---

## Paso 4: Reiniciar Backend

```powershell
cd "C:\interfaz Monitoreo Condicion de Motores\backend"
python main.py
```

El backend ahora tiene los endpoints disponibles en:
- `http://localhost:8000/api/diagnosis/status` - Estado del servicio
- `http://localhost:8000/api/diagnosis/chat` - Chat de texto
- `http://localhost:8000/api/diagnosis/chat/image` - Análisis de imágenes
- `http://localhost:8000/api/diagnosis/analyze/csv` - Análisis de CSV
- `http://localhost:8000/api/diagnosis/diagnosis` - Diagnóstico automático

---

## Paso 5: Probar el Servicio

1. Abre la aplicación frontend.
2. Ve a **Laboratorio → Diagnóstico**.
3. Deberías ver "Servicio Activo" en verde.
4. Prueba preguntas como:
   - "¿Cómo está el motor?"
   - "Analiza las vibraciones actuales"
   - "¿Hay riesgo de falla?"

---

## 🎯 Funcionalidades del Servicio

### 💬 Chat de Texto
- Pregunta sobre el estado del motor
- Análisis de métricas actuales
- Recomendaciones de mantenimiento
- Contexto automático de datos en tiempo real

### 📷 Análisis de Imágenes
- Sube fotos del motor
- Analiza gráficas exportadas
- Detecta anomalías visuales
- Usa modelo **LLaVA** con visión

### 📊 Análisis de CSV
- Sube archivos CSV exportados
- Análisis de tendencias históricas
- Detección de patrones anormales
- Predicción de fallas

### ⚡ Diagnóstico Rápido
- Botón de diagnóstico automático
- Analiza todos los parámetros actuales
- Evalúa nivel de riesgo
- Genera recomendaciones

---

## ⚙️ Configuración Avanzada (Opcional)

### Usar GPU (más rápido):
El servicio detectará automáticamente tu RTX 4070 y la usará.

### Cambiar modelo por defecto:
Edita `backend/app/ai_agent.py`:
```python
self.model = "llama3.1:8b"  # Modelo más potente
```

### Ajustar temperatura (creatividad):
En `ai_agent.py`, modifica `temperature`:
- `0.3` = Más conservador, preciso
- `0.7` = Balanceado (default)
- `1.0` = Más creativo

---

## 🔧 Troubleshooting

### "IA Offline" en la UI
1. Verifica que el servicio esté corriendo:
   ```powershell
   servicio list
   ```
2. Reinicia el servicio:
   ```powershell
   servicio serve
   ```

### Respuestas lentas
- Usa modelo más pequeño: `llama3.2:3b`
- GPU debería acelerar automáticamente
- Cierra otras aplicaciones pesadas

### Error "modelo no encontrado"
```powershell
servicio pull llama3.2:3b
servicio pull llava
```

---

## 📊 Uso de Recursos Esperado

Con tu hardware (32GB RAM, RTX 4070):
- **llama3.2:3b**: ~3GB VRAM, respuestas en 1-3s
- **llava**: ~5GB VRAM, análisis de imagen en 3-5s
- **llama3.1:8b**: ~6GB VRAM, respuestas en 2-5s

Tu sistema puede manejar **múltiples modelos** simultáneamente sin problemas.

---

## ✅ Checklist de Instalación

- [ ] Servicio instalado y corriendo
- [ ] Modelo `llama3.2:3b` descargado
- [ ] Modelo `llava` descargado
- [ ] Backend reiniciado con `httpx` instalado
- [ ] Frontend muestra "IA Activa" en verde
- [ ] Primera pregunta respondida exitosamente

---

## 🚀 ¡Listo!

Ahora tienes un agente de IA **completamente offline** que:
- ✅ No requiere internet
- ✅ Privacidad total (datos no salen de tu PC)
- ✅ Análisis técnico especializado en motores
- ✅ Soporta texto, imágenes y CSV
- ✅ Diagnósticos automáticos

**Próximos pasos sugeridos:**
1. Probar diagnóstico rápido
2. Subir una gráfica para análisis visual
3. Exportar CSV y pedir análisis de tendencias
