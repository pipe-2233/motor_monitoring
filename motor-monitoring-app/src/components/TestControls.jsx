import { useState } from 'react';
import { X, TestTube, Zap } from 'lucide-react';

const TestControls = ({ onDataChange, onPhaseDataChange, isTestMode, setIsTestMode }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [testData, setTestData] = useState({
    temperatura: 25,
    rpm: 1500,
    vibracion: 3,
  });

  const [phaseTestData, setPhaseTestData] = useState({
    A: { voltaje: 220, corriente: 10, potencia: 2200, energia: 50, frecuencia: 60, factorPotencia: 0.95 },
    B: { voltaje: 220, corriente: 10, potencia: 2200, energia: 50, frecuencia: 60, factorPotencia: 0.95 },
    C: { voltaje: 220, corriente: 10, potencia: 2200, energia: 50, frecuencia: 60, factorPotencia: 0.95 },
  });

  const handleChange = (key, value) => {
    if (!isTestMode) return;
    const newData = { ...testData, [key]: parseFloat(value) };
    setTestData(newData);
    onDataChange(newData);
  };

  const handlePhaseChange = (phase, key, value) => {
    if (!isTestMode) return;
    const newPhaseData = {
      ...phaseTestData,
      [phase]: {
        ...phaseTestData[phase],
        [key]: parseFloat(value)
      }
    };
    setPhaseTestData(newPhaseData);
    onPhaseDataChange(newPhaseData);
  };

  const presets = {
    normal: { 
      temperatura: 30, 
      rpm: 1500, 
      vibracion: 2,
      phases: {
        A: { voltaje: 220, corriente: 10, potencia: 2200, energia: 50, frecuencia: 60, factorPotencia: 0.95 },
        B: { voltaje: 220, corriente: 10, potencia: 2200, energia: 50, frecuencia: 60, factorPotencia: 0.95 },
        C: { voltaje: 220, corriente: 10, potencia: 2200, energia: 50, frecuencia: 60, factorPotencia: 0.95 },
      }
    },
    precaucion: { 
      temperatura: 50, 
      rpm: 2000, 
      vibracion: 6,
      phases: {
        A: { voltaje: 230, corriente: 15, potencia: 3450, energia: 200, frecuencia: 62, factorPotencia: 0.80 },
        B: { voltaje: 228, corriente: 16, potencia: 3500, energia: 220, frecuencia: 61, factorPotencia: 0.82 },
        C: { voltaje: 232, corriente: 15.5, potencia: 3400, energia: 210, frecuencia: 62, factorPotencia: 0.81 },
      }
    },
    advertencia: { 
      temperatura: 70, 
      rpm: 2500, 
      vibracion: 9,
      phases: {
        A: { voltaje: 245, corriente: 18, potencia: 4200, energia: 600, frecuencia: 64, factorPotencia: 0.72 },
        B: { voltaje: 198, corriente: 19, potencia: 4300, energia: 650, frecuencia: 46, factorPotencia: 0.70 },
        C: { voltaje: 242, corriente: 18.5, potencia: 4100, energia: 620, frecuencia: 65, factorPotencia: 0.73 },
      }
    },
    critico: { 
      temperatura: 90, 
      rpm: 3000, 
      vibracion: 15,
      phases: {
        A: { voltaje: 250, corriente: 22, potencia: 5000, energia: 1100, frecuencia: 68, factorPotencia: 0.65 },
        B: { voltaje: 195, corriente: 24, potencia: 5200, energia: 1200, frecuencia: 42, factorPotencia: 0.60 },
        C: { voltaje: 248, corriente: 23, potencia: 5100, energia: 1150, frecuencia: 67, factorPotencia: 0.63 },
      }
    },
  };

  const applyPreset = (preset) => {
    if (!isTestMode) return;
    setTestData(presets[preset]);
    onDataChange(presets[preset]);
    if (onPhaseDataChange && presets[preset].phases) {
      setPhaseTestData(presets[preset].phases);
      onPhaseDataChange(presets[preset].phases);
    }
  };

  const toggleTestMode = () => {
    const newMode = !isTestMode;
    setIsTestMode(newMode);
    if (newMode) {
      // Aplicar preset normal al activar
      applyPreset('normal');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 glass-card p-3 z-50 hover:scale-110 transition-transform"
        title="Abrir Panel de Pruebas"
      >
        <TestTube className="w-6 h-6 text-purple-light" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 glass-card p-4 w-96 max-h-[90vh] overflow-y-auto z-50">
      {/* Header con switch y cerrar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TestTube className="w-5 h-5 text-purple-light" />
          <h3 className="text-lg font-bold text-purple-light">Panel de Pruebas</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Switch Modo Prueba / MQTT */}
      <div className="mb-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isTestMode ? (
              <TestTube className="w-4 h-4 text-green-400" />
            ) : (
              <Zap className="w-4 h-4 text-blue-400" />
            )}
            <span className="text-sm font-semibold">
              {isTestMode ? 'Modo Prueba' : 'Modo MQTT'}
            </span>
          </div>
          <button
            onClick={toggleTestMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isTestMode ? 'bg-green-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isTestMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-gray-400">
          {isTestMode 
            ? '✅ Usando datos de simulación' 
            : '📡 Recibiendo datos de MQTT'}
        </p>
      </div>

      {/* Controles solo activos en modo prueba */}
      <div className={`space-y-4 ${!isTestMode ? 'opacity-50 pointer-events-none' : ''}`}>
        
        {/* Datos Generales */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white border-b border-purple-500/30 pb-1">
            Datos Generales
          </h4>
          
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Temperatura: {testData.temperatura}°C
            </label>
            <input
              type="range"
              min="0"
              max="120"
              value={testData.temperatura}
              onChange={(e) => handleChange('temperatura', e.target.value)}
              className="w-full"
              disabled={!isTestMode}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              RPM: {testData.rpm}
            </label>
            <input
              type="range"
              min="0"
              max="3600"
              step="100"
              value={testData.rpm}
              onChange={(e) => handleChange('rpm', e.target.value)}
              className="w-full"
              disabled={!isTestMode}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Vibración: {testData.vibracion} mm/s
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={testData.vibracion}
              onChange={(e) => handleChange('vibracion', e.target.value)}
              className="w-full"
              disabled={!isTestMode}
            />
          </div>
        </div>

        {/* Controles de Fases */}
        {['A', 'B', 'C'].map((phase) => (
          <div key={phase} className="space-y-2">
            <h4 className={`text-sm font-bold border-b pb-1 ${
              phase === 'A' ? 'text-red-400 border-red-500/30' :
              phase === 'B' ? 'text-yellow-400 border-yellow-500/30' :
              'text-blue-400 border-blue-500/30'
            }`}>
              Fase {phase}
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Voltaje: {phaseTestData[phase].voltaje}V
                </label>
                <input
                  type="range"
                  min="180"
                  max="260"
                  value={phaseTestData[phase].voltaje}
                  onChange={(e) => handlePhaseChange(phase, 'voltaje', e.target.value)}
                  className="w-full h-1"
                  disabled={!isTestMode}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Corriente: {phaseTestData[phase].corriente}A
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={phaseTestData[phase].corriente}
                  onChange={(e) => handlePhaseChange(phase, 'corriente', e.target.value)}
                  className="w-full h-1"
                  disabled={!isTestMode}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Frecuencia: {phaseTestData[phase].frecuencia}Hz
                </label>
                <input
                  type="range"
                  min="40"
                  max="70"
                  step="0.1"
                  value={phaseTestData[phase].frecuencia}
                  onChange={(e) => handlePhaseChange(phase, 'frecuencia', e.target.value)}
                  className="w-full h-1"
                  disabled={!isTestMode}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Factor P.: {phaseTestData[phase].factorPotencia}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.01"
                  value={phaseTestData[phase].factorPotencia}
                  onChange={(e) => handlePhaseChange(phase, 'factorPotencia', e.target.value)}
                  className="w-full h-1"
                  disabled={!isTestMode}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Presets rápidos */}
        <div className="space-y-2">
          <p className="text-xs text-gray-400 border-b border-purple-500/30 pb-1">Presets Rápidos:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => applyPreset('normal')}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-xs font-semibold transition-colors disabled:opacity-50"
              disabled={!isTestMode}
            >
              ✅ Normal
            </button>
            <button
              onClick={() => applyPreset('precaucion')}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-xs font-semibold transition-colors disabled:opacity-50"
              disabled={!isTestMode}
            >
              ⚠️ Precaución
            </button>
            <button
              onClick={() => applyPreset('advertencia')}
              className="px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded text-xs font-semibold transition-colors disabled:opacity-50"
              disabled={!isTestMode}
            >
              🔶 Advertencia
            </button>
            <button
              onClick={() => applyPreset('critico')}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-xs font-semibold transition-colors disabled:opacity-50"
              disabled={!isTestMode}
            >
              🔥 Crítico
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestControls;
