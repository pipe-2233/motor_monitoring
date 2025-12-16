import React from 'react';
import { Activity, TrendingUp, Waves } from 'lucide-react';

export default function VibrationMetrics({ data }) {
  const { arms = 0, apico = 0, picoPico = 0, vrms = 0 } = data;

  const getVRMSStatus = (value) => {
    if (value < 2.8) return { color: 'text-green-400', bg: 'bg-green-500/20', status: 'Excelente' };
    if (value < 7.1) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', status: 'Aceptable' };
    return { color: 'text-red-400', bg: 'bg-red-500/20', status: 'Inaceptable' };
  };

  const vrmsStatus = getVRMSStatus(vrms);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* VRMS - ISO 10816 */}
      <div className={`p-4 rounded-lg border ${vrmsStatus.bg} border-gray-700`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className={vrmsStatus.color} size={20} />
            <h3 className="text-white font-semibold">VRMS (Velocidad)</h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${vrmsStatus.bg} ${vrmsStatus.color}`}>
            {vrmsStatus.status}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${vrmsStatus.color}`}>
            {vrms.toFixed(2)}
          </span>
          <span className="text-gray-400">mm/s</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Velocidad RMS según ISO 10816. Indica el nivel general de vibración del motor.
        </p>
        <div className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-green-400">● Excelente</span>
            <span className="text-gray-400">&lt; 2.8 mm/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-yellow-400">● Aceptable</span>
            <span className="text-gray-400">2.8 - 7.1 mm/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-red-400">● Inaceptable</span>
            <span className="text-gray-400">&gt; 7.1 mm/s</span>
          </div>
        </div>
      </div>

      {/* ARMS - Aceleración RMS */}
      <div className="p-4 rounded-lg border bg-blue-500/10 border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="text-blue-400" size={20} />
          <h3 className="text-white font-semibold">ARMS (Aceleración RMS)</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-blue-400">
            {arms.toFixed(4)}
          </span>
          <span className="text-gray-400">g</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Aceleración RMS (Root Mean Square). Representa la energía promedio de la vibración en unidades de gravedad.
        </p>
      </div>

      {/* APico - Aceleración Pico */}
      <div className="p-4 rounded-lg border bg-purple-500/10 border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <Waves className="text-purple-400" size={20} />
          <h3 className="text-white font-semibold">APico (Pico)</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-purple-400">
            {apico.toFixed(4)}
          </span>
          <span className="text-gray-400">g</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Aceleración pico máxima detectada. Útil para identificar impactos o eventos transitorios bruscos.
        </p>
      </div>

      {/* Pico a Pico */}
      <div className="p-4 rounded-lg border bg-orange-500/10 border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="text-orange-400" size={20} />
          <h3 className="text-white font-semibold">Pico a Pico</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-orange-400">
            {picoPico.toFixed(4)}
          </span>
          <span className="text-gray-400">g</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Amplitud total de vibración (2 × APico). Indica el rango completo de movimiento vibratorio del motor.
        </p>
      </div>
    </div>
  );
}
