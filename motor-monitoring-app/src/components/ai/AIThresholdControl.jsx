import { useState } from 'react';
import { Settings, Save, Zap } from 'lucide-react';
import { API_BASE_URL } from '../../config/config';

const AI_API_BASE = `${API_BASE_URL}api/ai`;

const AIThresholdControl = () => {
  const [thresholds, setThresholds] = useState({
    temperatura: { warning: 70, critical: 80 },
    vibracion: { warning: 8, critical: 12 },
    rpm: { warning: 1400, critical: 1600 }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (tipo, level, value) => {
    setThresholds(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        [level]: parseFloat(value)
      }
    }));
  };

  const applyThreshold = async (tipo) => {
    setIsLoading(true);
    setResult(null);

    try {
      // Llamar directamente al endpoint de ejecución de acciones
      const response = await fetch(`${AI_API_BASE}/execute-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'modificar_umbrales',
          tipo: tipo,
          warning: thresholds[tipo].warning,
          critical: thresholds[tipo].critical
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({
          type: 'success',
          message: `✅ Umbrales de ${tipo} actualizados correctamente`
        });
      } else {
        setResult({
          type: 'error',
          message: `❌ Error: ${data.error || 'Error desconocido'}`
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: `❌ Error de conexión: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-bold text-white">Control Directo de Umbrales</h2>
      </div>

      {result && (
        <div className={`mb-4 p-4 rounded-lg ${
          result.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {result.message}
        </div>
      )}

      <div className="space-y-6">
        {/* Temperatura */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-orange-400">🌡️ Temperatura (°C)</h3>
            <button
              onClick={() => applyThreshold('temperatura')}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
              Aplicar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Warning</label>
              <input
                type="number"
                value={thresholds.temperatura.warning}
                onChange={(e) => handleChange('temperatura', 'warning', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Critical</label>
              <input
                type="number"
                value={thresholds.temperatura.critical}
                onChange={(e) => handleChange('temperatura', 'critical', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Vibración */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-purple-400">📊 Vibración (mm/s)</h3>
            <button
              onClick={() => applyThreshold('vibracion')}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
              Aplicar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Warning</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.vibracion.warning}
                onChange={(e) => handleChange('vibracion', 'warning', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Critical</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.vibracion.critical}
                onChange={(e) => handleChange('vibracion', 'critical', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* RPM */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-400">⚡ RPM</h3>
            <button
              onClick={() => applyThreshold('rpm')}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
              Aplicar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Warning</label>
              <input
                type="number"
                value={thresholds.rpm.warning}
                onChange={(e) => handleChange('rpm', 'warning', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Critical</label>
              <input
                type="number"
                value={thresholds.rpm.critical}
                onChange={(e) => handleChange('rpm', 'critical', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-900/30 rounded-lg text-sm text-blue-300">
        <p className="font-semibold mb-2">💡 Tip:</p>
        <p>También puedes usar el chat de IA diciendo: "ajusta temperatura a 85 grados" y el sistema lo aplicará automáticamente.</p>
      </div>
    </div>
  );
};

export default AIThresholdControl;
