// ========================================
// CONFIGURACIÓN MQTT Y APLICACIÓN
// ========================================

// API Base URL - Cambiar cuando se use Cloudflare Tunnel
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://jpeg-tsunami-plug-inclusive.trycloudflare.com/';

export const CONFIG = {
  // MQTT Configuration - HiveMQ Cloud
  mqtt: {
    broker: 'wss://087ff76994dc4fd4b47546d2309632e3.s1.eu.hivemq.cloud:8884/mqtt',
    username: 'motor_moni',
    password: 'motor1234L',
    clientId: `web_${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 15000,
    keepalive: 60,
    qos: 0,
    protocolVersion: 4,
    resubscribe: true,
    
    topics: {
      // Topics JSON agrupados (nuevo formato)
      faseA_json: 'motor/fase_a',
      faseB_json: 'motor/fase_b',
      faseC_json: 'motor/fase_c',
      
      // Topics individuales (compatibilidad)
      faseA: {
        voltaje: 'motor/fase_a/voltaje',
        corriente: 'motor/fase_a/corriente',
        potencia: 'motor/fase_a/potencia',
        energia: 'motor/fase_a/energia',
        frecuencia: 'motor/fase_a/frecuencia',
        factorPotencia: 'motor/fase_a/factor_potencia',
      },
      faseB: {
        voltaje: 'motor/fase_b/voltaje',
        corriente: 'motor/fase_b/corriente',
        potencia: 'motor/fase_b/potencia',
        energia: 'motor/fase_b/energia',
        frecuencia: 'motor/fase_b/frecuencia',
        factorPotencia: 'motor/fase_b/factor_potencia',
      },
      faseC: {
        voltaje: 'motor/fase_c/voltaje',
        corriente: 'motor/fase_c/corriente',
        potencia: 'motor/fase_c/potencia',
        energia: 'motor/fase_c/energia',
        frecuencia: 'motor/fase_c/frecuencia',
        factorPotencia: 'motor/fase_c/factor_potencia',
      },
      general: {
        temperatura: 'motor/temperatura',
        rpm: 'motor/rpm',
        vibracion: 'motor/vibracion',
      },
    },
  },

  // App Configuration
  app: {
    chartMaxPoints: 20,
    updateInterval: 1000,
    
    thresholds: {
      voltaje: { min: 200, max: 240 },
      corriente: { min: 0, max: 15 },
      temperatura: { min: 0, max: 80 },
      rpm: { min: 0, max: 3000 },
    },
  },
};

// Helper functions - Usar wildcards para reducir suscripciones
export const getAllTopics = () => {
  // En lugar de 59 topics individuales, usar wildcards
  // Esto reduce la carga de suscripción de 59 a solo 5 topics
  const topics = [
    'motor/fase_a/#',      // Todos los topics de fase A (voltaje, corriente, etc)
    'motor/fase_b/#',      // Todos los topics de fase B
    'motor/fase_c/#',      // Todos los topics de fase C
    'motor/fase_a',        // JSON agrupado fase A
    'motor/fase_b',        // JSON agrupado fase B
    'motor/fase_c',        // JSON agrupado fase C
    'motor/temperatura',
    'motor/rpm',
    'motor/vibracion',
    'motor/humedad',
    'motor/status',
    'motor/thresholds/update',
    'motor/maintenance/#'  // Todos los topics de mantenimiento
  ];
  
  /* ANTIGUO - 59 topics individuales que saturaban la conexión
  Object.values(CONFIG.mqtt.topics).forEach((phase) => {
    Object.values(phase).forEach((topic) => {
      topics.push(topic);
    });
  });
  */
  
  return topics;
};

export const checkThreshold = (variable, value) => {
  const threshold = CONFIG.app.thresholds[variable];
  if (!threshold) return { status: 'ok', message: '' };
  
  if (value < threshold.min) {
    return {
      status: 'warning',
      message: `${variable} por debajo del mínimo (${threshold.min})`,
    };
  }
  
  if (value > threshold.max) {
    return {
      status: 'error',
      message: `${variable} por encima del máximo (${threshold.max})`,
    };
  }
  
  return { status: 'ok', message: '' };
};
