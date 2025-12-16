import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import mqtt from 'mqtt';
import { CONFIG, getAllTopics, API_BASE_URL } from '../config/config';

const MQTTContext = createContext();

export const useMQTT = () => {
  const context = useContext(MQTTContext);
  if (!context) {
    throw new Error('useMQTT must be used within MQTTProvider');
  }
  return context;
};

export const MQTTProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');
  
  // Datos de las fases
  const [phaseData, setPhaseData] = useState({
    A: { voltaje: 0, corriente: 0, potencia: 0, energia: 0, frecuencia: 0, factorPotencia: 0 },
    B: { voltaje: 0, corriente: 0, potencia: 0, energia: 0, frecuencia: 0, factorPotencia: 0 },
    C: { voltaje: 0, corriente: 0, potencia: 0, energia: 0, frecuencia: 0, factorPotencia: 0 },
  });
  
  // Datos generales
  const [generalData, setGeneralData] = useState({
    temperatura: 0,
    rpm: 0,
    vibracion: 0,
  });

  // Datos de vibración detallados
  const [vibrationData, setVibrationData] = useState({
    vrms: 0,      // Velocidad RMS (mm/s)
    arms: 0,      // Aceleración RMS (g)
    apico: 0,     // Aceleración Pico (g)
    picoPico: 0,  // Pico a Pico (g)
  });

  // Historial de métricas (por clave), cada entrada: {ts, value}
  const [history, setHistory] = useState({});
  const MAX_HISTORY = 3600; // guardar hasta ~3600 samples por métrica

  const addHistory = (key, value) => {
    const ts = Date.now();
    setHistory(prev => {
      const arr = prev[key] ? prev[key].slice() : [];
      arr.push({ ts, value });
      if (arr.length > MAX_HISTORY) arr.splice(0, arr.length - MAX_HISTORY);
      return { ...prev, [key]: arr };
    });
  };

  const getHistory = (key, seconds = 300) => {
    const now = Date.now();
    const cutoff = now - (seconds * 1000);
    const arr = history[key] || [];
    return arr.filter(item => item.ts >= cutoff);
  };

  // Alertas del backend
  const [alerts, setAlerts] = useState([]);
  const [hasActiveAlerts, setHasActiveAlerts] = useState(false);
  const [hasWarnings, setHasWarnings] = useState(false);

  // Umbrales desde el backend
  const [thresholds, setThresholds] = useState({
    temp_warning: 60,
    temp_critical: 80,
    vibration_warning: 7,
    vibration_critical: 10,
    rpm_warning: 2500,
    rpm_critical: 3000
  });

  // Comando de mantenimiento recibido (para que MaintenanceTechniques lo escuche)
  const [maintenanceCommand, setMaintenanceCommand] = useState(null);

  // Función para obtener umbrales desde el backend
  const fetchThresholds = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}api/settings/thresholds`);
      if (response.ok) {
        const data = await response.json();
        setThresholds({
          temp_warning: data.temp_warning,
          temp_critical: data.temp_critical,
          vibration_warning: data.vibration_warning,
          vibration_critical: data.vibration_critical,
          rpm_warning: data.rpm_warning,
          rpm_critical: data.rpm_critical
        });
        console.log('✅ Umbrales actualizados desde backend:', data);
      }
    } catch (error) {
      console.error('Error al obtener umbrales:', error);
    }
  }, []);

  // Conectar a MQTT
  const connect = useCallback(() => {
    console.log('🔄 Conectando al broker MQTT...');
    console.log('🌐 Broker:', CONFIG.mqtt.broker);
    
    try {
      const mqttClient = mqtt.connect(CONFIG.mqtt.broker, CONFIG.mqtt);

      let reconnectAttempts = 0;
      const maxReconnectAttempts = 10;

      mqttClient.on('connect', () => {
        console.log('✅ Conectado a MQTT');
        reconnectAttempts = 0; // Reset contador
        setIsConnected(true);
        setConnectionStatus('Conectado');
        
        // Suscribirse a todos los topics (QoS 0 para estabilidad)
        const topics = getAllTopics();
        topics.forEach((topic) => {
          mqttClient.subscribe(topic, { qos: 0 }, (err) => {
            if (err) console.error(`❌ Error suscribiendo a ${topic}:`, err);
          });
        });
        console.log(`📥 Suscrito a ${topics.length} topics`);
      });

      mqttClient.on('reconnect', () => {
        reconnectAttempts++;
        console.log(`🔄 Reconectando... (intento ${reconnectAttempts}/${maxReconnectAttempts})`);
        
        if (reconnectAttempts >= maxReconnectAttempts) {
          console.warn('⚠️ Demasiados intentos de reconexión, esperando 30s...');
          mqttClient.end(true);
          setTimeout(() => {
            reconnectAttempts = 0;
            connect();
          }, 30000);
        } else {
          setConnectionStatus(`Reconectando (${reconnectAttempts})...`);
        }
      });

      mqttClient.on('message', (topic, message) => {
        handleMessage(topic, message);
      });

      mqttClient.on('error', (error) => {
        console.error('❌ Error MQTT:', error.message);
        setConnectionStatus(`Error: ${error.message}`);
        setIsConnected(false);
      });

      mqttClient.on('offline', () => {
        console.warn('📡 Cliente offline');
        setIsConnected(false);
        setConnectionStatus('Offline');
      });

      mqttClient.on('close', () => {
        console.warn('⚠️ Conexión cerrada');
        setIsConnected(false);
        setConnectionStatus('Desconectado');
      });

      mqttClient.on('disconnect', () => {
        console.warn('🔌 Desconectado del broker');
        setIsConnected(false);
      });

      setClient(mqttClient);
    } catch (error) {
      console.error('❌ Error al conectar:', error);
      setConnectionStatus('Error de conexión');
    }
  }, []);

  // Manejar mensajes MQTT
  const handleMessage = (topic, message) => {
    try {
      // Verificar si es un mensaje de actualización de umbrales
      if (topic === 'motor/thresholds/update') {
        const thresholdUpdate = JSON.parse(message.toString());
        console.log('🔔 Actualización de umbrales recibida:', thresholdUpdate);
        
        const { tipo, warning, critical } = thresholdUpdate;
        
        setThresholds(prev => {
          const updated = { ...prev };
          
          if (tipo === 'temperatura') {
            updated.temp_warning = warning;
            updated.temp_critical = critical;
          } else if (tipo === 'vibracion' || tipo === 'vibration') {
            updated.vibration_warning = warning;
            updated.vibration_critical = critical;
          } else if (tipo === 'rpm') {
            updated.rpm_warning = warning;
            updated.rpm_critical = critical;
          }
          
          console.log('✅ Umbrales actualizados en frontend:', updated);
          return updated;
        });
        
        return; // No procesar como dato de métrica
      }
      
      // Verificar si es un comando de mantenimiento
      if (topic === 'motor/maintenance/command') {
        const command = JSON.parse(message.toString());
        console.log('🔧 Comando de mantenimiento recibido:', command);
        setMaintenanceCommand(command);
        return;
      }

      // Mensaje de fallo crítico del motor
      if (topic === 'motor/failure') {
        try {
          const payload = JSON.parse(message.toString());
          console.error('⚠️ Motor failure received via MQTT:', payload);
          // Añadir a alertas en frontend para notificación instantánea
          setAlerts(prev => [
            {
              severity: 'critical',
              category: 'failure',
              message: payload.message || 'Motor failure detected',
              details: payload,
              timestamp: payload.timestamp || Date.now()
            },
            ...prev
          ]);
          setHasActiveAlerts(true);
        } catch (e) {
          console.error('Error parsing motor/failure payload:', e);
        }
        return;
      }
      
      // Verificar si es un mensaje JSON de fase (nuevo formato)
      if (topic === 'motor/fase_a' || topic === 'motor/fase_b' || topic === 'motor/fase_c') {
        const faseData = JSON.parse(message.toString());
        const fase = topic.split('/')[1]; // 'fase_a', 'fase_b', 'fase_c'
        
        // Distribuir los valores del JSON a los topics individuales
        Object.keys(faseData).forEach(key => {
          const value = faseData[key];
          const virtualTopic = `motor/${fase}/${key}`;
          const messageData = parseTopicData(virtualTopic, value);
          if (messageData) {
            updateData(messageData);
          }
        });
        return;
      }
      
      // Procesar como dato de métrica normal (formato antiguo)
      const value = parseFloat(message.toString());
      if (isNaN(value)) return;

      const messageData = parseTopicData(topic, value);
      if (messageData) {
        updateData(messageData);
      }
    } catch (error) {
      console.error('❌ Error al procesar mensaje:', error);
    }
  };

  // Parsear topic
  const parseTopicData = (topic, value) => {
    // Fase A (usando topic directo)
    if (topic === 'motor/fase_a/voltaje') return { phase: 'A', type: 'voltaje', value };
    if (topic === 'motor/fase_a/corriente') return { phase: 'A', type: 'corriente', value };
    if (topic === 'motor/fase_a/potencia') return { phase: 'A', type: 'potencia', value };
    if (topic === 'motor/fase_a/energia') return { phase: 'A', type: 'energia', value };
    if (topic === 'motor/fase_a/frecuencia') return { phase: 'A', type: 'frecuencia', value };
    if (topic === 'motor/fase_a/factor_potencia') return { phase: 'A', type: 'factorPotencia', value };

    // Fase B
    if (topic === 'motor/fase_b/voltaje') return { phase: 'B', type: 'voltaje', value };
    if (topic === 'motor/fase_b/corriente') return { phase: 'B', type: 'corriente', value };
    if (topic === 'motor/fase_b/potencia') return { phase: 'B', type: 'potencia', value };
    if (topic === 'motor/fase_b/energia') return { phase: 'B', type: 'energia', value };
    if (topic === 'motor/fase_b/frecuencia') return { phase: 'B', type: 'frecuencia', value };
    if (topic === 'motor/fase_b/factor_potencia') return { phase: 'B', type: 'factorPotencia', value };

    // Fase C
    if (topic === 'motor/fase_c/voltaje') return { phase: 'C', type: 'voltaje', value };
    if (topic === 'motor/fase_c/corriente') return { phase: 'C', type: 'corriente', value };
    if (topic === 'motor/fase_c/potencia') return { phase: 'C', type: 'potencia', value };
    if (topic === 'motor/fase_c/energia') return { phase: 'C', type: 'energia', value };
    if (topic === 'motor/fase_c/frecuencia') return { phase: 'C', type: 'frecuencia', value };
    if (topic === 'motor/fase_c/factor_potencia') return { phase: 'C', type: 'factorPotencia', value };

    // General (temperatura, rpm, vibración, humedad)
    if (topic === 'motor/temperatura') return { phase: 'general', type: 'temperatura', value };
    if (topic === 'motor/rpm') return { phase: 'general', type: 'rpm', value };
    if (topic === 'motor/vibracion') return { phase: 'general', type: 'vibracion', value };
    if (topic === 'motor/humedad') return { phase: 'general', type: 'humedad', value };

    // Vibración detallada
    if (topic === 'motor/vibracion/arms') return { phase: 'vibration', type: 'arms', value };
    if (topic === 'motor/vibracion/apico') return { phase: 'vibration', type: 'apico', value };
    if (topic === 'motor/vibracion/pico_pico') return { phase: 'vibration', type: 'picoPico', value };

    return null;
  };

  // Actualizar datos
  const updateData = ({ phase, type, value }) => {
    if (phase === 'A' || phase === 'B' || phase === 'C') {
      setPhaseData((prev) => ({
        ...prev,
        [phase]: { ...prev[phase], [type]: value },
      }));
      // registrar historial: clave como `A.type`
      try { addHistory(`${phase}.${type}`, value); } catch(e) { /* ignore */ }
    } else if (phase === 'general') {
      setGeneralData((prev) => ({ ...prev, [type]: value }));
      try { addHistory(type, value); } catch(e) { /* ignore */ }
    } else if (phase === 'vibration') {
      setVibrationData((prev) => ({ ...prev, [type]: value }));
      // También actualizar VRMS en general data
      if (type === 'arms') {
        setGeneralData((prev) => ({ ...prev, vibracion: value * 9806.65 / (2 * Math.PI * 80) }));
      }
      try { addHistory(`vibration.${type}`, value); } catch(e) { /* ignore */ }
    }
  };

  // Consultar alertas del backend cada 3 segundos
  const fetchAlerts = useCallback(async () => {
    try {
      // Consultar solo alertas activas (no resueltas)
      const response = await fetch(`${API_BASE_URL}api/alerts/active`);
      if (response.ok) {
        const data = await response.json();
        console.log('🚨 Alertas activas:', data);
        setAlerts(data);
        // Verificar si hay alertas críticas activas
        const hasCritical = data.some(alert => 
          alert.severity === 'critical' && !alert.resolved
        );
        console.log('🔴 ¿Hay críticas?', hasCritical, 'Total alertas:', data.length);
        setHasActiveAlerts(hasCritical);
        
        // Verificar si hay advertencias activas
        const hasWarning = data.some(alert => 
          alert.severity === 'warning' && !alert.resolved
        );
        setHasWarnings(hasWarning);
      }
    } catch (error) {
      console.error('Error al obtener alertas:', error);
    }
  }, []);

  // Polling de alertas
  useEffect(() => {
    fetchAlerts(); // Primera consulta
    const interval = setInterval(fetchAlerts, 3000); // Cada 3 segundos
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Cargar umbrales al inicio
  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  // Conectar al montar
  useEffect(() => {
    connect();
    
    return () => {
      if (client) {
        client.end();
      }
    };
  }, [connect]);

  const value = {
    client,
    isConnected,
    connectionStatus,
    phaseData,
    generalData,
    vibrationData,
    history,
    getHistory,
    alerts,
    hasActiveAlerts,
    hasWarnings,
    thresholds,
    maintenanceCommand,
    reconnect: connect,
    refreshAlerts: fetchAlerts,
    refreshThresholds: fetchThresholds,
    // Método para actualizar datos de prueba
    setTestData: (data) => {
      setGeneralData(prev => ({ ...prev, ...data }));
    },
    // Método para actualizar datos de fase
    setTestPhaseData: (phases) => {
      setPhaseData(phases);
    },
  };

  return <MQTTContext.Provider value={value}>{children}</MQTTContext.Provider>;
};
