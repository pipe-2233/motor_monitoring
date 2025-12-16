import { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch debe usarse dentro de SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = (term) => {
    setSearchTerm(term);
    setIsSearching(term.length > 0);
    
    if (term.length === 0) {
      setSearchResults([]);
      return;
    }

    // Base de datos completa de elementos buscables
    const searchableItems = [
      // === VISTAS PRINCIPALES ===
      { type: 'view', id: 'dashboard', view: 'dashboard', targetId: null, label: 'Dashboard - Vista Principal', keywords: ['inicio', 'principal', 'dashboard', 'home', 'overview', 'resumen', 'estadísticas'] },
      { type: 'view', id: 'monitoring', view: 'monitoring', targetId: null, label: 'Laboratorio - Análisis Avanzado', keywords: ['monitoreo', 'tiempo real', 'sensores', 'laboratorio', 'análisis', 'experimental', 'gráficas', 'datos'] },
      { type: 'view', id: 'ai-reports', view: 'ai-reports', targetId: null, label: 'Reportes IA - Inteligencia Artificial', keywords: ['ia', 'ai', 'inteligencia artificial', 'reportes', 'ollama', 'predicción', 'análisis ai'] },
      { type: 'view', id: 'errors', view: 'errors', targetId: null, label: 'Errores y Alertas', keywords: ['errores', 'alertas', 'problemas', 'crítico', 'warnings', 'anomalías', 'fallas'] },
      { type: 'view', id: 'logs', view: 'logs', targetId: null, label: 'Registros del Sistema', keywords: ['registros', 'logs', 'historial', 'eventos', 'actividad', 'bitácora'] },
      { type: 'view', id: 'settings', view: 'settings', targetId: null, label: 'Configuración y Ajustes', keywords: ['configuración', 'ajustes', 'mqtt', 'umbrales', 'settings', 'parámetros', 'opciones'] },
      
      // === MÉTRICAS ELÉCTRICAS TRIFÁSICAS (PZEM-004T) ===
      { type: 'metric', id: 'voltage', view: 'dashboard', targetId: 'phase-panels', label: 'Voltaje (V)', keywords: ['voltaje', 'voltage', 'v', 'tensión', 'volts', 'volt', 'pzem', 'fase', 'trifásico', 'eléctrico'] },
      { type: 'metric', id: 'current', view: 'dashboard', targetId: 'phase-panels', label: 'Corriente (A)', keywords: ['corriente', 'current', 'a', 'amperios', 'amperes', 'amp', 'intensidad', 'fase', 'pzem'] },
      { type: 'metric', id: 'power', view: 'dashboard', targetId: 'phase-panels', label: 'Potencia (W)', keywords: ['potencia', 'power', 'w', 'watts', 'watt', 'consumo', 'fase', 'pzem', 'energía'] },
      { type: 'metric', id: 'energy', view: 'dashboard', targetId: 'phase-panels', label: 'Energía (kWh)', keywords: ['energía', 'energy', 'kwh', 'kilowatt', 'consumo', 'acumulada', 'pzem', 'medidor'] },
      { type: 'metric', id: 'frequency', view: 'dashboard', targetId: 'phase-panels', label: 'Frecuencia (Hz)', keywords: ['frecuencia', 'frequency', 'hz', 'hertz', 'ciclos', 'red', 'pzem', '50hz', '60hz'] },
      { type: 'metric', id: 'pf', view: 'dashboard', targetId: 'phase-panels', label: 'Factor de Potencia (PF)', keywords: ['factor', 'potencia', 'pf', 'power factor', 'cos phi', 'eficiencia', 'pzem', 'fase'] },
      
      // === MÉTRICAS DE MOTOR ===
      { type: 'metric', id: 'temperature', view: 'dashboard', targetId: 'stats-section', label: 'Temperatura Motor (°C)', keywords: ['temperatura', 'temp', '°c', 'celsius', 'calor', 'térmico', 'sobrecalentamiento', 'ds18b20', 'sensor'] },
      { type: 'metric', id: 'rpm', view: 'dashboard', targetId: 'stats-section', label: 'Velocidad RPM', keywords: ['rpm', 'revoluciones', 'velocidad', 'rotación', 'giros', 'encoder', 'tacómetro', 'motor'] },
      { type: 'metric', id: 'vibration', view: 'dashboard', targetId: 'stats-section', label: 'Vibración (mm/s)', keywords: ['vibración', 'vibration', 'vibracion', 'oscilación', 'movimiento', 'sensor', 'acelerómetro', 'mpu6050'] },
      
      // === FASES ELÉCTRICAS ===
      { type: 'phase', id: 'phaseA', view: 'dashboard', targetId: 'phase-a', label: 'Fase A (R)', keywords: ['fase a', 'phase a', 'fase 1', 'r', 'línea 1', 'trifásica', 'voltaje a', 'corriente a'] },
      { type: 'phase', id: 'phaseB', view: 'dashboard', targetId: 'phase-b', label: 'Fase B (S)', keywords: ['fase b', 'phase b', 'fase 2', 's', 'línea 2', 'trifásica', 'voltaje b', 'corriente b'] },
      { type: 'phase', id: 'phaseC', view: 'dashboard', targetId: 'phase-c', label: 'Fase C (T)', keywords: ['fase c', 'phase c', 'fase 3', 't', 'línea 3', 'trifásica', 'voltaje c', 'corriente c'] },
      
      // === COMPONENTES Y GRÁFICAS ===
      { type: 'feature', id: 'motor3d', view: 'dashboard', targetId: 'motor-3d', label: 'Motor 3D Interactivo', keywords: ['motor', '3d', 'visualización', 'three.js', 'modelo', 'animación', 'render'] },
      { type: 'feature', id: 'combinedChart', view: 'dashboard', targetId: 'combined-chart', label: 'Gráfica Combinada', keywords: ['gráfica', 'chart', 'combinada', 'histórico', 'tiempo real', 'línea'] },
      { type: 'feature', id: 'phaseChart', view: 'dashboard', targetId: 'phase-chart', label: 'Gráfica de Fases', keywords: ['fases', 'trifásico', 'chart', 'comparación', 'eléctrico'] },
      { type: 'feature', id: 'stats', view: 'dashboard', targetId: 'stats-section', label: 'Estadísticas del Motor', keywords: ['stats', 'estadísticas', 'resumen', 'métricas', 'números'] },
      
      // === FUNCIONALIDAD IA ===
      { type: 'ai', id: 'aiStatus', view: 'dashboard', targetId: 'ai-status', label: 'Estado IA - Detección de Anomalías', keywords: ['ia', 'ai', 'status', 'estado', 'ollama', 'machine learning', 'detección', 'anomalías', 'ml'] },
      { type: 'ai', id: 'aiReports', view: 'ai-reports', targetId: 'ai-reports-section', label: 'Generador de Reportes IA', keywords: ['reportes', 'informes', 'ia', 'ollama', 'generador', 'pdf', 'markdown', 'llama'] },
      { type: 'ai', id: 'aiPrediction', view: 'monitoring', targetId: 'ai-prediction', label: 'Predicción IA', keywords: ['predicción', 'forecast', 'ia', 'futuro', 'tendencias', 'pronostico'] },
      { type: 'ai', id: 'aiThreshold', view: 'monitoring', targetId: 'ai-threshold', label: 'Control Inteligente de Umbrales', keywords: ['umbrales', 'thresholds', 'ia', 'límites', 'automático', 'ajuste'] },
      
      // === CONTROLES Y ACCIONES ===
      { type: 'action', id: 'motorStart', view: 'dashboard', targetId: 'motor-controls', label: 'Encender Motor (START)', keywords: ['encender', 'start', 'iniciar', 'arrancar', 'motor', 'on', 'activar', 'botón verde'] },
      { type: 'action', id: 'motorStop', view: 'dashboard', targetId: 'motor-controls', label: 'Apagar Motor (STOP)', keywords: ['apagar', 'stop', 'detener', 'parar', 'motor', 'off', 'desactivar', 'botón rojo'] },
      { type: 'action', id: 'testMode', view: 'monitoring', targetId: 'test-controls', label: 'Modo de Prueba', keywords: ['prueba', 'test', 'simulación', 'demo', 'modo'] },
      { type: 'action', id: 'resolveAlerts', view: 'errors', targetId: 'resolve-alerts', label: 'Resolver Alertas', keywords: ['resolver', 'limpiar', 'alertas', 'clear', 'borrar'] },
      
      // === MQTT Y CONECTIVIDAD ===
      { type: 'system', id: 'mqtt', view: 'settings', targetId: 'mqtt-config', label: 'MQTT - Protocolo de Comunicación', keywords: ['mqtt', 'conexión', 'broker', 'hivemq', 'websocket', 'mensajería', 'iot', 'conectividad'] },
      { type: 'system', id: 'cloudflare', view: 'settings', targetId: null, label: 'Cloudflare Tunnel - Acceso Web', keywords: ['cloudflare', 'tunnel', 'web', 'url', 'despliegue', 'nube', 'acceso remoto'] },
      { type: 'system', id: 'backend', view: 'settings', targetId: null, label: 'Backend FastAPI', keywords: ['backend', 'api', 'fastapi', 'servidor', 'python', 'endpoints'] },
      { type: 'system', id: 'database', view: 'logs', targetId: 'database-logs', label: 'Base de Datos SQLite', keywords: ['database', 'sqlite', 'base de datos', 'motor_data.db', 'registros', 'histórico'] },
      
      // === ANÁLISIS Y HERRAMIENTAS ===
      { type: 'tool', id: 'maintenance', view: 'monitoring', targetId: 'maintenance-section', label: 'Técnicas de Mantenimiento', keywords: ['mantenimiento', 'maintenance', 'predictivo', 'preventivo', 'rrms', 'vibración', 'técnicas'] },
      { type: 'tool', id: 'reportBuilder', view: 'monitoring', targetId: 'report-builder', label: 'Constructor de Reportes', keywords: ['reportes', 'builder', 'constructor', 'personalizado', 'pdf', 'exportar'] },
      { type: 'tool', id: 'thresholdConfig', view: 'settings', targetId: 'threshold-settings', label: 'Configuración de Umbrales', keywords: ['umbrales', 'límites', 'configuración', 'warning', 'critical', 'alertas'] },
      
      // === TÉRMINOS TÉCNICOS ===
      { type: 'term', id: 'anomaly', view: 'errors', targetId: 'anomaly-alerts', label: 'Anomalías Detectadas', keywords: ['anomalía', 'anomaly', 'anormal', 'irregular', 'problema', 'ml'] },
      { type: 'term', id: 'threshold', view: 'settings', targetId: 'threshold-settings', label: 'Umbrales de Operación', keywords: ['umbral', 'threshold', 'límite', 'warning', 'critical', 'normal'] },
      { type: 'term', id: 'realtime', view: 'monitoring', targetId: 'realtime-data', label: 'Monitoreo en Tiempo Real', keywords: ['tiempo real', 'real time', 'live', 'en vivo', 'instantáneo'] },
      { type: 'term', id: 'historical', view: 'logs', targetId: 'historical-logs', label: 'Datos Históricos', keywords: ['histórico', 'historical', 'pasado', 'registros', 'archivo'] },
    ];

    const lowerTerm = term.toLowerCase();
    const results = searchableItems.filter(item => 
      item.label.toLowerCase().includes(lowerTerm) ||
      item.keywords.some(keyword => keyword.includes(lowerTerm))
    );

    setSearchResults(results);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
  };

  return (
    <SearchContext.Provider value={{
      searchTerm,
      searchResults,
      isSearching,
      performSearch,
      clearSearch
    }}>
      {children}
    </SearchContext.Provider>
  );
};
