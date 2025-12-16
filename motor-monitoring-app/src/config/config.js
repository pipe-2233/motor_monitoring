// ========================================
// CONFIGURACIÓN MQTT Y APLICACIÓN
// ========================================

// API Base URL
// Default to local backend for development. Override with `VITE_API_URL` in production/.env.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/';

export const CONFIG = {
  mqtt: {
    broker: 'wss://087ff76994dc4fd4b47546d2309632e3.s1.eu.hivemq.cloud:8884/mqtt',
    username: 'motor_admin',
    password: 'motor1234L',
    clientId: `motor_web_${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 15000,
    keepalive: 60,
    qos: 0,
    protocolVersion: 4,
    resubscribe: true,
    
    topics: {
      general: {
        temperatura: 'motor/temperatura',
        rpm: 'motor/rpm',
        vibracion: 'motor/vibracion',
      },
    },
  },

  app: {
    chartMaxPoints: 20,
    updateInterval: 1000,
  },
};

// Helper - Usar wildcards
export const getAllTopics = () => {
  return [
    'motor/fase_a/#',
    'motor/fase_b/#',
    'motor/fase_c/#',
    'motor/fase_a',
    'motor/fase_b',
    'motor/fase_c',
    'motor/temperatura',
    'motor/rpm',
    'motor/vibracion',
    'motor/vibracion/#',
    'motor/humedad',
    'motor/status',
    'motor/thresholds/update',
    'motor/maintenance/#'
  ];
};
