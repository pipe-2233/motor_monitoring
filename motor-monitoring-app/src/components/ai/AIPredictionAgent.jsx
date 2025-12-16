import { useState, useEffect, useRef } from 'react';
import { useMQTT } from '../../context/MQTTContext';
import { Send, Image, FileText, Cpu, Zap, AlertCircle, CheckCircle, Loader, Thermometer, Activity, Gauge, Power, PowerOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL, CONFIG } from '../../config/config';
import mqtt from 'mqtt';

const AI_API_BASE = `${API_BASE_URL}api/ai`;

const AIPredictionAgent = () => {
  const { phaseData, generalData, vibrationData, client: mqttClient, thresholds } = useMQTT();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState({ connected: false, models: [] });
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Verificar estado del servicio de IA al cargar
  useEffect(() => {
    checkAIStatus();
    const interval = setInterval(checkAIStatus, 10000); // Cada 10s
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAIStatus = async () => {
    try {
      const response = await fetch(`${AI_API_BASE}/status`);
      const data = await response.json();
      setAiStatus(data);
    } catch (error) {
      setAiStatus({ connected: false, models: [] });
    }
  };

  // Calcular estado general del motor
  const calculateMotorHealth = () => {
    let health = 100;
    const issues = [];

    // Temperatura (peso: 20%) - usar umbrales del backend si están disponibles
    const tempWarning = thresholds?.temp_warning ?? 70;
    const tempCritical = thresholds?.temp_critical ?? 80;
    if (generalData.temperatura >= tempCritical) {
      health -= 20;
      issues.push('Temperatura crítica');
    } else if (generalData.temperatura >= tempWarning) {
      health -= 10;
      issues.push('Temperatura elevada');
    }

    // Vibración VRMS (peso: 25%) - usar umbrales del backend
    const vibWarning = thresholds?.vibration_warning ?? 2.8;
    const vibCritical = thresholds?.vibration_critical ?? 7.1;
    if (generalData.vibracion >= vibCritical) {
      health -= 25;
      issues.push('Vibración inaceptable');
    } else if (generalData.vibracion >= vibWarning) {
      health -= 12;
      issues.push('Vibración elevada');
    }

    // RPM (peso: 15%) - usar umbrales del backend
    const rpmWarning = thresholds?.rpm_warning ?? 2500;
    const rpmCritical = thresholds?.rpm_critical ?? 3000;
    // Considerar fuera de rango cuando supera crítico o está muy bajo (< 1000)
    if (generalData.rpm >= rpmCritical || generalData.rpm < 1000) {
      health -= 15;
      issues.push('RPM fuera de rango');
    }

    // Fases - Voltaje y Corriente (peso: 40% total)
    ['A', 'B', 'C'].forEach(phase => {
      const data = phaseData[phase];
      
      // Voltaje (10% por fase) - usar umbrales del backend
      const vmin = thresholds?.voltage_min ?? 200;
      const vmax = thresholds?.voltage_max ?? 240;
      // margen óptimo: rango intermedio (por ejemplo, 5% dentro del rango)
      const optimalMin = vmin;
      const optimalMax = vmax;

      if (data.voltaje < vmin || data.voltaje > vmax) {
        health -= 10;
        issues.push(`Fase ${phase}: Voltaje anormal`);
      } else if (data.voltaje < optimalMin || data.voltaje > optimalMax) {
        // no reducir más si está dentro del rango definido
      }
      
      // Corriente (3.33% por fase) - usar umbrales del backend
      const currentWarning = thresholds?.current_warning ?? 15;
      const currentCritical = thresholds?.current_critical ?? 20;
      if (data.corriente >= currentCritical) {
        health -= 6.66;
        issues.push(`Fase ${phase}: Corriente crítica`);
      } else if (data.corriente >= currentWarning) {
        health -= 3.33;
        issues.push(`Fase ${phase}: Sobrecorriente`);
      }
    });

    return {
      percentage: Math.max(0, Math.round(health)),
      status: health >= 80 ? 'Excelente' : health >= 60 ? 'Bueno' : health >= 40 ? 'Regular' : 'Crítico',
      color: health >= 80 ? 'text-green-400' : health >= 60 ? 'text-blue-400' : health >= 40 ? 'text-yellow-400' : 'text-red-400',
      issues
    };
  };

  const buildMotorData = () => {
    const health = calculateMotorHealth();
    
    return {
      phaseData,
      generalData,
      vibrationData,
      motorHealth: health,
      timestamp: new Date().toISOString()
    };
  };

  // Ejecutar comandos del motor
  const executeMotorCommand = async (command, duration = null) => {
    if (!mqttClient || !mqttClient.connected) {
      return { success: false, message: 'MQTT no conectado' };
    }

    try {
      if (command === 'start') {
        mqttClient.publish('motor/control/start', '1', { qos: 1 });
        
        if (duration) {
          setTimeout(() => {
            mqttClient.publish('motor/control/stop', '0', { qos: 1 });
          }, duration * 1000);
          return { success: true, message: `Motor encendido por ${duration} segundos` };
        }
        return { success: true, message: 'Motor encendido' };
      } else if (command === 'stop') {
        mqttClient.publish('motor/control/stop', '0', { qos: 1 });
        return { success: true, message: 'Motor apagado' };
      }
    } catch (error) {
      return { success: false, message: `Error: ${error.message}` };
    }
  };

  // Detectar comandos en el mensaje del usuario
  const detectAndExecuteCommand = async (userInput) => {
    const input = userInput.toLowerCase();
    
    // Detectar "enciende/encender motor durante X segundos/minutos"
    const encenderMatch = input.match(/(?:enciende|encender|inicia|iniciar).*motor.*(?:durante|por)\s+(\d+)\s*(segundo|minuto|seg|min)/);
    if (encenderMatch) {
      const duration = parseInt(encenderMatch[1]);
      const unit = encenderMatch[2];
      const seconds = unit.startsWith('min') ? duration * 60 : duration;
      return await executeMotorCommand('start', seconds);
    }
    
    // Detectar "enciende/encender motor" (sin duración)
    if (input.match(/(?:enciende|encender|inicia|iniciar).*motor/)) {
      return await executeMotorCommand('start');
    }
    
    // Detectar "apaga/apagar motor"
    if (input.match(/(?:apaga|apagar|detén|detener|para|parar).*motor/)) {
      return await executeMotorCommand('stop');
    }
    
    return null;
  };

  // Construir prompt mejorado y específico
  const buildEnhancedPrompt = (userInput, motorData) => {
    const input = userInput.toLowerCase();
    const { phaseData, generalData, vibrationData, motorHealth } = motorData;
    
    let context = `Eres un experto en motores trifásicos industriales. 

ESTADO GENERAL DEL MOTOR:
- Salud del Motor: ${motorHealth.percentage}% (${motorHealth.status})
${motorHealth.issues.length > 0 ? `- Problemas detectados: ${motorHealth.issues.join(', ')}` : '- Sin problemas detectados'}

DATOS ACTUALES:
`;

    // Detectar si pregunta por una fase específica
    if (input.match(/fase\s*[abc]/i)) {
      const faseMatch = input.match(/fase\s*([abc])/i);
      if (faseMatch) {
        const fase = faseMatch[1].toUpperCase();
        const data = phaseData[fase];
        context += `
FASE ${fase}:
- Voltaje: ${data.voltaje.toFixed(2)} V
- Corriente: ${data.corriente.toFixed(2)} A
- Potencia: ${data.potencia.toFixed(2)} W
- Energía: ${data.energia.toFixed(3)} kWh
- Frecuencia: ${data.frecuencia.toFixed(2)} Hz
- Factor de Potencia: ${data.factorPotencia.toFixed(2)}

Nota: Responde ÚNICAMENTE sobre la Fase ${fase}. No menciones otras fases ni datos generales a menos que sea estrictamente necesario para el contexto.
`;
        return `${context}\n\nPregunta del usuario: ${userInput}`;
      }
    }
    
    // Detectar si pregunta por temperatura
    if (input.match(/temperatura/i)) {
      context += `
TEMPERATURA:
- Actual: ${generalData.temperatura.toFixed(1)}°C
- Estado: ${generalData.temperatura > 80 ? 'CRÍTICO' : generalData.temperatura > 70 ? 'ELEVADO' : 'NORMAL'}

Nota: Enfócate específicamente en la temperatura del motor y sus implicaciones.
`;
      return `${context}\n\nPregunta del usuario: ${userInput}`;
    }
    
    // Detectar si pregunta por vibración
    if (input.match(/vibra/i)) {
      context += `
VIBRACIÓN (ISO 10816):
- VRMS: ${generalData.vibracion.toFixed(2)} mm/s (${generalData.vibracion > 7.1 ? 'INACEPTABLE' : generalData.vibracion > 2.8 ? 'ACEPTABLE' : 'EXCELENTE'})
- ARMS: ${vibrationData.arms.toFixed(4)} g
- APico: ${vibrationData.apico.toFixed(4)} g
- Pico a Pico: ${vibrationData.picoPico.toFixed(4)} g

Nota: Enfócate específicamente en el análisis de vibración según norma ISO 10816.
`;
      return `${context}\n\nPregunta del usuario: ${userInput}`;
    }
    
    // Detectar si pregunta por RPM
    if (input.match(/rpm|velocidad|revoluciones/i)) {
      context += `
RPM:
- Actual: ${generalData.rpm.toFixed(0)} RPM
- Estado: ${generalData.rpm < 1000 || generalData.rpm > 5000 ? 'FUERA DE RANGO' : 'NORMAL'}

Nota: Enfócate específicamente en la velocidad de rotación del motor.
`;
      return `${context}\n\nPregunta del usuario: ${userInput}`;
    }
    
    // Si pregunta por estado general o porcentaje
    if (input.match(/estado|salud|condición|porcentaje|cómo está/i)) {
      context += `
RESUMEN COMPLETO:

FASES TRIFÁSICAS:
Fase A: ${phaseData.A.voltaje.toFixed(1)}V, ${phaseData.A.corriente.toFixed(2)}A, ${phaseData.A.potencia.toFixed(1)}W
Fase B: ${phaseData.B.voltaje.toFixed(1)}V, ${phaseData.B.corriente.toFixed(2)}A, ${phaseData.B.potencia.toFixed(1)}W
Fase C: ${phaseData.C.voltaje.toFixed(1)}V, ${phaseData.C.corriente.toFixed(2)}A, ${phaseData.C.potencia.toFixed(1)}W

PARÁMETROS GENERALES:
- Temperatura: ${generalData.temperatura.toFixed(1)}°C
- RPM: ${generalData.rpm.toFixed(0)}
- Vibración: ${generalData.vibracion.toFixed(2)} mm/s

Nota: Proporciona un análisis completo del estado del motor, incluyendo el porcentaje de salud (${motorHealth.percentage}%) y recomendaciones específicas basadas en TODOS los parámetros.
`;
      return `${context}\n\nPregunta del usuario: ${userInput}`;
    }
    
    // Pregunta general - dar contexto completo pero resumido
    context += `
DATOS GENERALES:
- Temperatura: ${generalData.temperatura.toFixed(1)}°C
- RPM: ${generalData.rpm.toFixed(0)}
- Vibración: ${generalData.vibracion.toFixed(2)} mm/s

FASES:
- Fase A: ${phaseData.A.voltaje.toFixed(1)}V, ${phaseData.A.corriente.toFixed(2)}A
- Fase B: ${phaseData.B.voltaje.toFixed(1)}V, ${phaseData.B.corriente.toFixed(2)}A
- Fase C: ${phaseData.C.voltaje.toFixed(1)}V, ${phaseData.C.corriente.toFixed(2)}A

Nota: Responde de forma precisa y específica a la pregunta del usuario. Si la pregunta es sobre algo específico, enfócate solo en eso.
`;
    
    return `${context}\n\nPregunta del usuario: ${userInput}`;
  };

  const sendMessage = async () => {
    if (!input.trim() && !selectedImage && !selectedFile) return;
    
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      image: selectedImage,
      file: selectedFile?.name
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    const originalInput = input;
    setInput('');

    try {
      // Primero detectar si hay comandos de motor
      const commandResult = await detectAndExecuteCommand(originalInput);
      if (commandResult) {
        const actionMsg = {
          role: 'system',
          content: commandResult.success ? `✅ ${commandResult.message}` : `❌ ${commandResult.message}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, actionMsg]);
        
        // Si fue exitoso, también enviar a la IA para que explique lo que hizo
        if (!commandResult.success) {
          setIsLoading(false);
          return;
        }
      }

      if (!aiStatus.connected) {
        const offlineMsg = {
          role: 'system',
          content: '⚠️ El servicio no está disponible. Asegúrate de que el servicio de diagnóstico esté ejecutándose.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, offlineMsg]);
        setIsLoading(false);
        return;
      }

      let response;

      // Si hay imagen, usar endpoint de imagen
      if (selectedImage) {
        const formData = new FormData();
        formData.append('message', input || 'Analiza esta imagen del motor');
        formData.append('image', selectedImage);
        formData.append('motor_data', JSON.stringify(buildMotorData()));

        const res = await fetch(`${AI_API_BASE}/chat/image`, {
          method: 'POST',
          body: formData
        });
        response = await res.json();
      }
      // Si hay CSV, usar endpoint de CSV
      else if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('question', input || 'Analiza estos datos');

        const res = await fetch(`${AI_API_BASE}/analyze/csv`, {
          method: 'POST',
          body: formData
        });
        response = await res.json();
      }
      // Mensaje de texto normal
      else {
        const motorData = buildMotorData();
        
        // Crear prompt mejorado y específico
        const enhancedPrompt = buildEnhancedPrompt(originalInput, motorData);
        
        const res = await fetch(`${AI_API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: enhancedPrompt,
            motor_data: motorData,
            conversation_history: messages.slice(-5).map(m => ({ role: m.role, content: m.content }))
          })
        });
        response = await res.json();
      }

      if (response.success) {
        const aiMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: response.timestamp,
          model: response.model
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Si la IA ejecutó una acción, mostrar confirmación
        if (response.action_executed) {
          const actionMsg = {
            role: 'system',
            content: `✅ Acción ejecutada: ${response.action_executed.message || 'Completado'}`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, actionMsg]);
        }
      } else {
        throw new Error(response.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'system',
        content: `❌ Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
      setSelectedFile(null);
    }
  };

  const generateDiagnosis = async () => {
    if (!aiStatus.connected) {
      alert('El servicio no está disponible.');
      return;
    }

    setIsLoading(true);
    const diagnosisMsg = {
      role: 'user',
      content: '🔍 Solicitar diagnóstico automático',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, diagnosisMsg]);

    try {
      const res = await fetch(`${AI_API_BASE}/diagnosis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motor_data: buildMotorData() })
      });
      const response = await res.json();

      if (response.success) {
        const aiMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: response.timestamp,
          model: response.model
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
    }
  };

  // Ejecutar acción directa sin IA
  const executeDirectAction = async (tipo, warning, critical) => {
    try {
      const res = await fetch(`${AI_API_BASE}/execute-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'modificar_umbrales',
          tipo,
          warning,
          critical
        })
      });
      
      const result = await res.json();
      
      if (result.success) {
        const successMsg = {
          role: 'system',
          content: `✅ Umbrales de ${tipo} actualizados: Warning=${warning}, Critical=${critical}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, successMsg]);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      const errorMsg = {
        role: 'system',
        content: `❌ Error al actualizar umbrales: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const quickPrompts = [
    '¿Cuál es el estado general del motor con porcentaje?',
    'Analiza solo la fase A',
    '¿Cómo está la temperatura del motor?',
    '¿Cuál es el nivel de vibración actual?',
    'Enciende el motor durante 30 segundos',
    'Apaga el motor',
    '¿Hay problemas en alguna fase?',
    'Dame un diagnóstico completo'
  ];

  const motorHealth = calculateMotorHealth();

  return (
    <div className="h-full flex flex-col">
      {/* Panel de Salud del Motor */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-semibold">Estado General del Motor</h4>
          <div className="flex items-center gap-2">
            <Activity className={`w-5 h-5 ${motorHealth.color}`} />
            <span className={`text-2xl font-bold ${motorHealth.color}`}>
              {motorHealth.percentage}%
            </span>
          </div>
        </div>
        <div className="mb-2">
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                motorHealth.percentage >= 80 ? 'bg-green-500' : 
                motorHealth.percentage >= 60 ? 'bg-blue-500' : 
                motorHealth.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${motorHealth.percentage}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={`font-semibold ${motorHealth.color}`}>{motorHealth.status}</span>
          {motorHealth.issues.length > 0 && (
            <span className="text-gray-400">{motorHealth.issues.length} problema(s) detectado(s)</span>
          )}
        </div>
        {motorHealth.issues.length > 0 && (
          <div className="mt-2 space-y-1">
            {motorHealth.issues.slice(0, 3).map((issue, idx) => (
              <div key={idx} className="text-xs text-yellow-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {issue}
              </div>
            ))}
            {motorHealth.issues.length > 3 && (
              <span className="text-xs text-gray-400">+ {motorHealth.issues.length - 3} más...</span>
            )}
          </div>
        )}
      </div>

      {/* Header con estado */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-6 h-6" />
              Diagnóstico Predictivo
            </h3>
            <p className="text-gray-300 text-sm mt-1">
              Pregunta sobre cualquier aspecto del motor
            </p>
          </div>
          <div className="flex items-center gap-2">
            {aiStatus.connected ? (
              <div className="flex items-center gap-2 bg-green-900/50 px-3 py-2 rounded">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-sm">Servicio Activo</span>
                <span className="text-xs text-green-400">({aiStatus.models.length} modelos)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-900/50 px-3 py-2 rounded">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-300 text-sm">Servicio Offline</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={generateDiagnosis}
            disabled={!aiStatus.connected || isLoading}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded text-sm flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Diagnóstico Rápido
          </button>
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={!aiStatus.connected || isLoading}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded text-sm flex items-center gap-2"
          >
            <Image className="w-4 h-4" />
            Analizar Imagen
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!aiStatus.connected || isLoading}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 text-white rounded text-sm flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Analizar CSV
          </button>
        </div>

        {/* Acciones Directas de Umbrales */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Acciones Rápidas de Umbrales:</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => executeDirectAction('temperatura', 75, 90)}
              className="px-2 py-1 bg-orange-700 hover:bg-orange-600 text-white rounded text-xs flex items-center gap-1"
            >
              <Thermometer className="w-3 h-3" />
              Temp 90°C
            </button>
            <button
              onClick={() => executeDirectAction('temperatura', 70, 85)}
              className="px-2 py-1 bg-orange-700 hover:bg-orange-600 text-white rounded text-xs flex items-center gap-1"
            >
              <Thermometer className="w-3 h-3" />
              Temp 85°C
            </button>
            <button
              onClick={() => executeDirectAction('vibracion', 10, 15)}
              className="px-2 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs flex items-center gap-1"
            >
              <Activity className="w-3 h-3" />
              Vib 15mm/s
            </button>
            <button
              onClick={() => executeDirectAction('rpm', 1500, 1800)}
              className="px-2 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs flex items-center gap-1"
            >
              <Gauge className="w-3 h-3" />
              RPM 1800
            </button>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="glass-card flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto mb-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <Cpu className="w-16 h-16 text-purple-500 mx-auto mb-4" />
              <h4 className="text-white font-bold text-lg mb-2">Bienvenido al Diagnóstico Predictivo</h4>
              <p className="text-gray-400 text-sm mb-4">
                Pregunta sobre el estado del motor, sube imágenes o archivos CSV para análisis
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(prompt)}
                    className="px-3 py-1 bg-purple-900/50 hover:bg-purple-800 text-purple-200 rounded text-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : msg.role === 'system'
                    ? 'bg-red-900/50 text-red-200'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                {msg.image && (
                  <div className="mb-2">
                    <span className="text-xs opacity-75">📷 Imagen adjunta</span>
                  </div>
                )}
                {msg.file && (
                  <div className="mb-2">
                    <span className="text-xs opacity-75">📄 {msg.file}</span>
                  </div>
                )}
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                      em: ({node, ...props}) => <em className="italic" {...props} />,
                      code: ({node, ...props}) => <code className="bg-black/30 px-1 rounded" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-bold mb-1" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
                <div className="text-xs opacity-60 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                  {msg.model && ` • ${msg.model}`}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg p-3 flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-gray-300">Analizando...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-purple-900/50 pt-3">
          {(selectedImage || selectedFile) && (
            <div className="mb-2 flex items-center gap-2 bg-purple-900/30 p-2 rounded">
              {selectedImage && (
                <span className="text-sm text-purple-200">📷 {selectedImage.name}</span>
              )}
              {selectedFile && (
                <span className="text-sm text-purple-200">📄 {selectedFile.name}</span>
              )}
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setSelectedFile(null);
                }}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Escribe tu pregunta..."
              disabled={!aiStatus.connected || isLoading}
              className="flex-1 bg-purple-900/30 text-white px-4 py-3 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!aiStatus.connected || isLoading || (!input.trim() && !selectedImage && !selectedFile)}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default AIPredictionAgent;
