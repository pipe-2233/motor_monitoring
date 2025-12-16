import { useState, useEffect, useRef } from 'react';
import { useMQTT } from '../../context/MQTTContext';
import { Play, Square, Zap, Activity, Gauge, CheckCircle, AlertCircle, Clock, Power, PowerOff, Settings } from 'lucide-react';

// Técnicas de mantenimiento predeterminadas
const TECHNIQUES = [
  {
    id: 'startup_analysis',
    name: 'Arranque Supervisado',
    icon: Zap,
    color: 'bg-yellow-600',
    description: 'Monitoreo intensivo durante el encendido del motor. Aumenta frecuencia de muestreo a 100ms para capturar picos de voltaje y corriente durante arranque.',
    duration: 30,
    steps: [
      { action: 'sampling_rate', value: 100, delay: 0 },
      { action: 'motor_start', delay: 2000 },
      { action: 'wait', delay: 25000 },
      { action: 'sampling_rate', value: 1000, delay: 0 },
    ]
  },
  {
    id: 'load_analysis',
    name: 'Análisis de Carga',
    icon: Gauge,
    color: 'bg-blue-600',
    description: 'Enciende el motor y monitorea la estabilización de corriente y potencia. Detecta anomalías en el consumo durante los primeros segundos de operación.',
    duration: 45,
    steps: [
      { action: 'motor_start', delay: 0 },
      { action: 'sampling_rate', value: 500, delay: 1000 },
      { action: 'wait', delay: 35000 },
      { action: 'sampling_rate', value: 1000, delay: 0 },
      { action: 'motor_stop', delay: 2000 },
    ]
  },
  {
    id: 'vibration_test',
    name: 'Test de Vibración',
    icon: Activity,
    color: 'bg-purple-600',
    description: 'Monitorea niveles de vibración durante arranque y operación. Identifica desbalanceos, rodamientos defectuosos o desalineación.',
    duration: 40,
    steps: [
      { action: 'sampling_rate', value: 200, delay: 0 },
      { action: 'motor_start', delay: 2000 },
      { action: 'wait', delay: 30000 },
      { action: 'motor_stop', delay: 0 },
      { action: 'sampling_rate', value: 1000, delay: 2000 },
    ]
  },
  {
    id: 'complete_cycle',
    name: 'Ciclo de Inspección Completo',
    icon: CheckCircle,
    color: 'bg-emerald-600',
    description: 'Ciclo completo: Apagado → Reposo → Arranque supervisado → Operación → Apagado. Monitoreo completo de todas las fases.',
    duration: 60,
    steps: [
      { action: 'motor_stop', delay: 0 },
      { action: 'wait', delay: 5000 },
      { action: 'sampling_rate', value: 100, delay: 0 },
      { action: 'motor_start', delay: 2000 },
      { action: 'wait', delay: 20000 },
      { action: 'sampling_rate', value: 500, delay: 0 },
      { action: 'wait', delay: 25000 },
      { action: 'motor_stop', delay: 0 },
      { action: 'sampling_rate', value: 1000, delay: 2000 },
    ]
  }
];

const MaintenanceTechniques = () => {
  const { client, isConnected, phaseData, generalData, maintenanceCommand } = useMQTT();
  const [activeTechnique, setActiveTechnique] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({ peaks: [], avgCurrent: 0, avgVibration: 0 });
  const [samplingRate, setSamplingRate] = useState(1000);
  const intervalRef = useRef(null);
  const stepIndexRef = useRef(0);
  const metricsRef = useRef({ voltages: [], currents: [], vibrations: [], startTime: 0 });

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const sendMQTTCommand = (topic, message) => {
    if (client && isConnected) {
      client.publish(topic, message, { qos: 1 });
      addLog(`📡 Comando enviado: ${topic} = ${message}`, 'command');
    } else {
      addLog('❌ Error: MQTT no conectado', 'error');
    }
  };

  const executeStep = async (step, technique) => {
    switch (step.action) {
      case 'motor_start':
        setCurrentStep('🚀 Encendiendo motor...');
        sendMQTTCommand('motor/control/start', '1');
        addLog('Motor encendido', 'success');
        break;
      
      case 'motor_stop':
        setCurrentStep('🛑 Deteniendo motor...');
        sendMQTTCommand('motor/control/stop', '0');
        addLog('Motor detenido', 'success');
        break;
      
      case 'sampling_rate':
        setCurrentStep(`⚡ Ajustando frecuencia de muestreo: ${step.value}ms`);
        sendMQTTCommand('motor/control/sampling_rate', String(step.value));
        addLog(`Frecuencia de muestreo: ${step.value}ms`, 'info');
        break;
      
      case 'wait':
        setCurrentStep('⏳ Recolectando datos...');
        break;
    }

    await new Promise(resolve => setTimeout(resolve, step.delay));
  };

  const runTechnique = async (technique) => {
    if (activeTechnique) return;

    setActiveTechnique(technique);
    setProgress(0);
    setLogs([]);
    setCurrentStep('Iniciando técnica...');
    stepIndexRef.current = 0;
    metricsRef.current = { voltages: [], currents: [], vibrations: [], startTime: Date.now() };

    addLog(`🔧 Iniciando: ${technique.name}`, 'info');
    addLog(technique.description, 'info');

    const totalSteps = technique.steps.length;
    
    for (let i = 0; i < technique.steps.length; i++) {
      stepIndexRef.current = i;
      const step = technique.steps[i];
      
      await executeStep(step, technique);
      
      setProgress(((i + 1) / totalSteps) * 100);
    }

    // Finalizar
    setCurrentStep('✅ Técnica completada');
    addLog(`✅ Técnica ${technique.name} completada exitosamente`, 'success');
    
    // Calcular métricas finales
    const duration = ((Date.now() - metricsRef.current.startTime) / 1000).toFixed(1);
    addLog(`⏱️ Duración total: ${duration}s`, 'info');
    
    setTimeout(() => {
      setActiveTechnique(null);
      setProgress(0);
      setCurrentStep('');
    }, 3000);
  };

  const stopTechnique = () => {
    if (activeTechnique) {
      addLog('⚠️ Técnica detenida manualmente', 'warning');
      sendMQTTCommand('motor/control/sampling_rate', '1000'); // Restaurar frecuencia normal
      setActiveTechnique(null);
      setProgress(0);
      setCurrentStep('');
    }
  };

  // Monitoreo de métricas en tiempo real durante técnica activa
  useEffect(() => {
    if (activeTechnique) {
      const interval = setInterval(() => {
        // Capturar datos de fases
        const avgVoltage = (phaseData.A.voltaje + phaseData.B.voltaje + phaseData.C.voltaje) / 3;
        const avgCurrent = (phaseData.A.corriente + phaseData.B.corriente + phaseData.C.corriente) / 3;
        const vibration = generalData.vibracion;

        metricsRef.current.voltages.push(avgVoltage);
        metricsRef.current.currents.push(avgCurrent);
        metricsRef.current.vibrations.push(vibration);

        // Detectar picos (incremento mayor a 20% del promedio)
        if (metricsRef.current.currents.length > 5) {
          const recent = metricsRef.current.currents.slice(-5);
          const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
          if (avgCurrent > avg * 1.2) {
            addLog(`⚡ Pico de corriente detectado: ${avgCurrent.toFixed(2)}A`, 'warning');
          }
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [activeTechnique, phaseData, generalData]);

  // Escuchar comandos de mantenimiento desde MQTT (enviados por la IA)
  useEffect(() => {
    console.log('🔍 Comando de mantenimiento:', maintenanceCommand);
    
    if (maintenanceCommand && maintenanceCommand.action === 'ejecutar_tecnica') {
      const tecnicaId = maintenanceCommand.tecnica;
      const tecnica = TECHNIQUES.find(t => t.id === tecnicaId);
      
      console.log(`🔎 Técnica encontrada:`, tecnica);
      console.log(`⚙️ Técnica activa actual:`, activeTechnique);
      
      if (tecnica && !activeTechnique) {
        console.log(`🤖 Ejecutando técnica solicitada por IA: ${tecnica.name}`);
        addLog(`🤖 IA solicitó: ${tecnica.name}`, 'info');
        runTechnique(tecnica);
      } else if (activeTechnique) {
        console.log('⚠️ Ya hay una técnica activa, ignorando comando');
      }
    }
  }, [maintenanceCommand, activeTechnique]);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="glass-card p-4 mb-4">
        <h3 className="text-xl font-bold text-white mb-2">🔧 Mantenimiento y Control del Motor</h3>
        <p className="text-gray-300 text-sm">
          Controla el motor manualmente o ejecuta procedimientos automatizados de diagnóstico.
        </p>
      </div>

      {/* Estado de conexión */}
      {!isConnected && (
        <div className="bg-red-900/50 border border-red-500 rounded p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-200">MQTT no conectado. Conecta para usar los controles.</span>
        </div>
      )}

      {/* Controles Manuales */}
      <div className="glass-card p-4 mb-4">
        <h4 className="text-white font-bold mb-3 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Controles Manuales
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Botón Encender */}
          <button
            onClick={() => {
              sendMQTTCommand('motor/control/start', '1');
              addLog('▶️ Motor encendido manualmente', 'success');
            }}
            disabled={!isConnected || activeTechnique}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Power className="w-5 h-5" />
            Encender
          </button>

          {/* Botón Apagar */}
          <button
            onClick={() => {
              sendMQTTCommand('motor/control/stop', '0');
              addLog('⏹️ Motor apagado manualmente', 'warning');
            }}
            disabled={!isConnected || activeTechnique}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <PowerOff className="w-5 h-5" />
            Apagar
          </button>

          {/* Control de Sampling Rate */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-300 font-semibold">Frecuencia (ms)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={samplingRate}
                onChange={(e) => setSamplingRate(parseInt(e.target.value))}
                min="100"
                max="5000"
                step="100"
                disabled={!isConnected || activeTechnique}
                className="flex-1 bg-gray-700 text-white px-2 py-2 text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none disabled:bg-gray-800"
              />
              <button
                onClick={() => {
                  sendMQTTCommand('motor/control/sampling_rate', String(samplingRate));
                  addLog(`⚡ Frecuencia: ${samplingRate}ms`, 'info');
                }}
                disabled={!isConnected || activeTechnique}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 text-sm rounded transition-colors"
              >
                ✓
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Técnicas Automatizadas */}
      <div className="glass-card p-4 mb-4">
        <h4 className="text-white font-bold mb-3">Técnicas Automatizadas</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TECHNIQUES.map(tech => {
          const Icon = tech.icon;
          const isActive = activeTechnique?.id === tech.id;
          const isDisabled = activeTechnique !== null || !isConnected;

          return (
            <div key={tech.id} className={`glass-card p-4 ${isActive ? 'ring-2 ring-purple-500' : ''}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`${tech.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-lg">{tech.name}</h4>
                  <p className="text-gray-300 text-xs mt-1">{tech.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-900/50">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>~{tech.duration}s</span>
                </div>
                <button
                  onClick={() => runTechnique(tech)}
                  disabled={isDisabled && !isActive}
                  className={`px-4 py-2 rounded font-medium flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : isDisabled
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isActive ? (
                    <>
                      <Square className="w-4 h-4" />
                      Ejecutando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Ejecutar
                    </>
                  )}
                </button>
              </div>

              {/* Barra de progreso */}
              {isActive && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                    <span>{currentStep}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* Botón de detener técnica activa */}
      {activeTechnique && (
        <div className="mb-4">
          <button
            onClick={stopTechnique}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded flex items-center justify-center gap-2"
          >
            <Square className="w-5 h-5" />
            Detener Técnica
          </button>
        </div>
      )}

      {/* Log de eventos */}
      {logs.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
            📋 Registro de Eventos
            <span className="text-xs text-gray-400">({logs.length})</span>
          </h4>
          <div className="bg-black/30 rounded p-3 max-h-64 overflow-y-auto font-mono text-xs">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`py-1 ${
                  log.type === 'error'
                    ? 'text-red-400'
                    : log.type === 'success'
                    ? 'text-green-400'
                    : log.type === 'warning'
                    ? 'text-yellow-400'
                    : log.type === 'command'
                    ? 'text-blue-400'
                    : 'text-gray-300'
                }`}
              >
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceTechniques;
