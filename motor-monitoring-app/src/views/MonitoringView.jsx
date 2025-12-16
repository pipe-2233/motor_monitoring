import { Activity, Zap, Thermometer, Gauge } from 'lucide-react';
import { useMQTT } from '../context/MQTTContext';
import { Line } from 'react-chartjs-2';
import { useState, useEffect } from 'react';
import VibrationMetrics from '../components/VibrationMetrics';

const RealTimeTab = ({ phaseData, generalData, vibrationData }) => {
  const [historyData, setHistoryData] = useState({
    temperatura: [],
    vibracion: [],
    rpm: [],
    voltajeA: [],
    corrienteA: [],
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setHistoryData(prev => ({
        temperatura: [...prev.temperatura.slice(-19), generalData.temperatura],
        vibracion: [...prev.vibracion.slice(-19), generalData.vibracion],
        rpm: [...prev.rpm.slice(-19), generalData.rpm],
        voltajeA: [...prev.voltajeA.slice(-19), phaseData.A.voltaje],
        corrienteA: [...prev.corrienteA.slice(-19), phaseData.A.corriente],
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [generalData, phaseData]);

  const createChartData = (data, label, color) => ({
    labels: Array.from({ length: data.length }, (_, i) => `${i}s`),
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: `${color}33`,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { display: false },
      y: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(139, 92, 246, 0.1)' },
      },
    },
  };

  return (
    <div className="p-2 sm:p-4 lg:p-6 space-y-3 lg:space-y-6">
      <div className="hidden lg:block">
        <h1 className="text-3xl font-bold text-white mb-2">Monitoreo en Tiempo Real</h1>
        <p className="text-gray-400">Datos en vivo del sistema</p>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        <div className="glass-card p-3 lg:p-4">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <Thermometer className="w-5 h-5 lg:w-6 lg:h-6 text-orange-400" />
            <span className="text-[10px] lg:text-xs text-gray-400">TEMP</span>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{generalData.temperatura.toFixed(1)}</p>
          <p className="text-xs lg:text-sm text-gray-400">°C</p>
        </div>

        <div className="glass-card p-3 lg:p-4">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <Activity className="w-5 h-5 lg:w-6 lg:h-6 text-red-400" />
            <span className="text-[10px] lg:text-xs text-gray-400">VIB</span>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{generalData.vibracion.toFixed(2)}</p>
          <p className="text-xs lg:text-sm text-gray-400">mm/s</p>
        </div>

        <div className="glass-card p-3 lg:p-4">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <Gauge className="w-5 h-5 lg:w-6 lg:h-6 text-blue-400" />
            <span className="text-[10px] lg:text-xs text-gray-400">RPM</span>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{generalData.rpm}</p>
          <p className="text-xs lg:text-sm text-gray-400">rev/min</p>
        </div>

        <div className="glass-card p-3 lg:p-4">
          <div className="flex items-center justify-between mb-1 lg:mb-2">
            <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-400" />
            <span className="text-[10px] lg:text-xs text-gray-400">POT A</span>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-white">{phaseData.A.potencia.toFixed(1)}</p>
          <p className="text-xs lg:text-sm text-gray-400">W</p>
        </div>
      </div>

      {/* Gráficos en Tiempo Real */}
      <div className="grid grid-cols-1 gap-3 lg:gap-4">
        <div className="glass-card p-3 lg:p-4">
          <h3 className="text-base lg:text-lg font-bold text-white mb-2 lg:mb-3 flex items-center gap-2">
            <Thermometer className="w-4 h-4 lg:w-5 lg:h-5 text-orange-400" />
            Temperatura
          </h3>
          <div className="h-32 lg:h-48">
            <Line
              data={createChartData(historyData.temperatura, 'Temperatura', '#fb923c')}
              options={chartOptions}
            />
          </div>
        </div>

        <div className="glass-card p-3 lg:p-4">
          <h3 className="text-base lg:text-lg font-bold text-white mb-2 lg:mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" />
            Vibración - VRMS (ISO 10816)
          </h3>
          <div className="h-32 lg:h-48">
            <Line
              data={createChartData(historyData.vibracion, 'VRMS (mm/s)', '#ef4444')}
              options={chartOptions}
            />
          </div>
        </div>

        <div className="glass-card p-3 lg:p-4">
          <h3 className="text-base lg:text-lg font-bold text-white mb-2 lg:mb-3 flex items-center gap-2">
            <Gauge className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
            RPM
          </h3>
          <div className="h-32 lg:h-48">
            <Line
              data={createChartData(historyData.rpm, 'RPM', '#3b82f6')}
              options={chartOptions}
            />
          </div>
        </div>

        <div className="glass-card p-3 lg:p-4">
          <h3 className="text-base lg:text-lg font-bold text-white mb-2 lg:mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" />
            Voltaje Fase A
          </h3>
          <div className="h-32 lg:h-48">
            <Line
              data={createChartData(historyData.voltajeA, 'Voltaje', '#eab308')}
              options={chartOptions}
            />
          </div>
        </div>
      </div>

      {/* Métricas de Vibración Detalladas */}
      <div className="glass-card p-3 lg:p-6">
        <h3 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4">Análisis de Vibración (LIS2DHTR)</h3>
        <VibrationMetrics data={vibrationData} />
      </div>

      {/* Tabla de Datos de Fases */}
      <div className="glass-card p-3 lg:p-6">
        <h3 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4">Datos Trifásicos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs lg:text-sm">
            <thead>
              <tr className="border-b border-purple-main/30">
                <th className="text-left py-2 px-2 lg:py-3 lg:px-4 text-gray-400 font-medium">Fase</th>
                <th className="text-right py-2 px-2 lg:py-3 lg:px-4 text-gray-400 font-medium">Voltaje</th>
                <th className="text-right py-2 px-2 lg:py-3 lg:px-4 text-gray-400 font-medium">Corriente</th>
                <th className="text-right py-2 px-2 lg:py-3 lg:px-4 text-gray-400 font-medium hidden sm:table-cell">Potencia</th>
                <th className="text-right py-2 px-2 lg:py-3 lg:px-4 text-gray-400 font-medium hidden md:table-cell">Energía</th>
                <th className="text-right py-2 px-2 lg:py-3 lg:px-4 text-gray-400 font-medium hidden md:table-cell">Frecuencia</th>
                <th className="text-right py-2 px-2 lg:py-3 lg:px-4 text-gray-400 font-medium hidden lg:table-cell">FP</th>
              </tr>
            </thead>
            <tbody>
              {['A', 'B', 'C'].map((phase) => (
                <tr key={phase} className="border-b border-purple-main/10 hover:bg-purple-main/5 transition-colors">
                  <td className="py-2 px-2 lg:py-3 lg:px-4">
                    <span className={`font-bold text-sm lg:text-base ${
                      phase === 'A' ? 'text-red-400' :
                      phase === 'B' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`}>
                      {phase}
                    </span>
                  </td>
                  <td className="text-right py-2 px-2 lg:py-3 lg:px-4 text-white whitespace-nowrap">{phaseData[phase].voltaje.toFixed(1)} V</td>
                  <td className="text-right py-2 px-2 lg:py-3 lg:px-4 text-white whitespace-nowrap">{phaseData[phase].corriente.toFixed(2)} A</td>
                  <td className="text-right py-2 px-2 lg:py-3 lg:px-4 text-white whitespace-nowrap hidden sm:table-cell">{phaseData[phase].potencia.toFixed(1)} W</td>
                  <td className="text-right py-2 px-2 lg:py-3 lg:px-4 text-white whitespace-nowrap hidden md:table-cell">{phaseData[phase].energia.toFixed(2)} kWh</td>
                  <td className="text-right py-2 px-2 lg:py-3 lg:px-4 text-white whitespace-nowrap hidden md:table-cell">{phaseData[phase].frecuencia.toFixed(1)} Hz</td>
                  <td className="text-right py-2 px-2 lg:py-3 lg:px-4 text-white whitespace-nowrap hidden lg:table-cell">{phaseData[phase].factorPotencia.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import ReportBuilder from '../components/analysis/ReportBuilder';
import MaintenanceTechniques from '../components/maintenance/MaintenanceTechniques';
import AIPredictionAgent from '../components/ai/AIPredictionAgent';
import AIThresholdControl from '../components/ai/AIThresholdControl';

const AnalysisTab = () => (
  <div className="p-6">
    <h2 className="text-2xl text-white font-bold mb-3">Análisis</h2>
    <ReportBuilder />
  </div>
);

const PredictionTab = () => (
  <AIPredictionAgent />
);

const MaintenanceTab = () => (
  <MaintenanceTechniques />
);

const MonitoringView = () => {
  const { phaseData, generalData, vibrationData } = useMQTT();
  const [tab, setTab] = useState('real');

  return (
    <div className="p-2 sm:p-4">
      {/* Header - Responsive */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">Laboratorio</h1>
          <p className="text-sm lg:text-base text-gray-400">Herramientas experimentales y análisis</p>
        </div>
        
        {/* Tabs - Desktop: horizontal | Mobile: grid 2x2 */}
        <div className="flex lg:gap-2 overflow-x-auto lg:overflow-visible">
          <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-row w-full lg:w-auto">
            <button 
              onClick={() => setTab('real')} 
              className={`px-2 py-2 lg:px-3 rounded text-xs lg:text-sm whitespace-nowrap ${tab==='real' ? 'bg-purple-600 text-white' : 'bg-purple-900 text-purple-300'}`}>
              <span className="hidden lg:inline">Datos en Tiempo Real</span>
              <span className="lg:hidden">Tiempo Real</span>
            </button>
            <button 
              onClick={() => setTab('analysis')} 
              className={`px-2 py-2 lg:px-3 rounded text-xs lg:text-sm whitespace-nowrap ${tab==='analysis' ? 'bg-purple-600 text-white' : 'bg-purple-900 text-purple-300'}`}>
              Análisis
            </button>
            <button 
              onClick={() => setTab('prediction')} 
              className={`px-2 py-2 lg:px-3 rounded text-xs lg:text-sm whitespace-nowrap ${tab==='prediction' ? 'bg-purple-600 text-white' : 'bg-purple-900 text-purple-300'}`}>
              Predicción
            </button>
            <button 
              onClick={() => setTab('maintenance')} 
              className={`px-2 py-2 lg:px-3 rounded text-xs lg:text-sm whitespace-nowrap ${tab==='maintenance' ? 'bg-purple-600 text-white' : 'bg-purple-900 text-purple-300'}`}>
              Mantenimiento
            </button>
          </div>
        </div>
      </div>

      <div className="bg-transparent">
        {tab === 'real' && <RealTimeTab phaseData={phaseData} generalData={generalData} vibrationData={vibrationData} />}
        {tab === 'analysis' && <AnalysisTab />}
        {tab === 'prediction' && <PredictionTab />}
        {tab === 'maintenance' && <MaintenanceTab />}
      </div>
    </div>
  );
};

export default MonitoringView;
