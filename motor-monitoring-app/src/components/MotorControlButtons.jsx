import { Power, PowerOff } from 'lucide-react';
import { useMQTT } from '../context/MQTTContext';
import { useState } from 'react';

const MotorControlButtons = () => {
  const { sendMQTTCommand } = useMQTT();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await sendMQTTCommand('motor/control/start', '1');
      console.log('✅ Comando START enviado');
    } catch (error) {
      console.error('❌ Error enviando START:', error);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const handleStop = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await sendMQTTCommand('motor/control/stop', '0');
      console.log('✅ Comando STOP enviado');
    } catch (error) {
      console.error('❌ Error enviando STOP:', error);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  return (
    <div className="lg:hidden fixed bottom-6 left-6 z-50 flex gap-3">
      {/* Botón START - Verde */}
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group relative"
        aria-label="Encender Motor"
      >
        <Power className="w-7 h-7" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
        {/* Tooltip */}
        <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Encender Motor
        </span>
      </button>

      {/* Botón STOP - Rojo */}
      <button
        onClick={handleStop}
        disabled={loading}
        className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group relative"
        aria-label="Apagar Motor"
      >
        <PowerOff className="w-7 h-7" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
        {/* Tooltip */}
        <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Apagar Motor
        </span>
      </button>
    </div>
  );
};

export default MotorControlButtons;
