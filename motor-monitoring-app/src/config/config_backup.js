// BACKUP - Configuración funcional simple

export const API_BASE_URL = 'https://jpeg-tsunami-plug-inclusive.trycloudflare.com/';

export const CONFIG = {
  mqtt: {
    broker: 'wss://087ff76994dc4fd4b47546d2309632e3.s1.eu.hivemq.cloud:8884/mqtt',
    username: 'motor_moni',
    password: 'motor1234L',
    clientId: `motor_web_${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 15000,
    keepalive: 60
  }
};
