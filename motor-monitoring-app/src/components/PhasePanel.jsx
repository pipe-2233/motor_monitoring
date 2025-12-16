import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import MetricModal from './MetricModal';

const MetricItem = ({ label, value, unit, isCritical, isWarning, onClick }) => {
  return (
    <div onClick={onClick} className={`bg-primary-secondary/50 p-2 rounded-lg border transition-colors relative cursor-pointer ${
      isCritical ? 'border-red-500 animate-pulse' : 
      isWarning ? 'border-yellow-500' : 
      'border-purple-main/10 hover:border-purple-main/30'
    }`}>
      <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-tight md:tracking-wide mb-1 truncate">{label}</p>
      <p className={`text-sm md:text-base font-bold leading-tight ${isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-white'}`}>
        {typeof value === 'number' ? value.toFixed(2) : value} <span className="text-[10px] md:text-xs text-gray-400">{unit}</span>
      </p>
      {(isCritical || isWarning) && (
        <div className="absolute top-1 right-1">
          <AlertTriangle className={`w-3 h-3 ${isCritical ? 'text-red-500 animate-bounce' : 'text-yellow-500'}`} />
        </div>
      )}
    </div>
  );
};

const PhasePanel = ({ phase, data, color }) => {
  const [modal, setModal] = useState({ open: false });
  const openMetric = (key, label, unit, anchorRect = null, mode = 'modal') => setModal({ open: true, key, label, unit, anchorRect, mode });
  const colorClasses = {
    A: 'from-red-500/20 to-red-600/20 border-red-500/30',
    B: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    C: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  };

  const indicatorColors = {
    A: 'bg-red-500 shadow-red-500/50',
    B: 'bg-yellow-500 shadow-yellow-500/50',
    C: 'bg-blue-500 shadow-blue-500/50',
  };

  // Determinar valores críticos y de advertencia
  const voltajeCritico = data.voltaje > 240 || data.voltaje < 200;
  const voltajeAlerta = (data.voltaje > 230 && data.voltaje <= 240) || (data.voltaje >= 200 && data.voltaje < 210);
  
  const corrienteCritico = data.corriente > 20;
  const corrienteAlerta = data.corriente > 15 && !corrienteCritico;
  
  const potenciaCritico = data.potencia > 4000;
  const potenciaAlerta = data.potencia > 3000 && !potenciaCritico;
  
  const energiaCritico = data.energia > 1000;
  const energiaAlerta = data.energia > 500 && !energiaCritico;
  
  const frecuenciaCritico = data.frecuencia > 65 || data.frecuencia < 45;
  const frecuenciaAlerta = (data.frecuencia > 62 && data.frecuencia <= 65) || (data.frecuencia >= 45 && data.frecuencia < 48);
  
  const factorPotenciaCritico = data.factorPotencia < 0.7;
  const factorPotenciaAlerta = data.factorPotencia >= 0.7 && data.factorPotencia < 0.85;

  // Contar alertas críticas
  const criticalCount = [
    voltajeCritico, corrienteCritico, potenciaCritico, 
    energiaCritico, frecuenciaCritico, factorPotenciaCritico
  ].filter(Boolean).length;

  const warningCount = [
    voltajeAlerta, corrienteAlerta, potenciaAlerta,
    energiaAlerta, frecuenciaAlerta, factorPotenciaAlerta
  ].filter(Boolean).length;

  return (
    <div className={`glass-card p-2 sm:p-3 bg-gradient-to-br ${colorClasses[phase]} ${criticalCount > 0 ? 'border-2 border-red-500' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">FASE {phase}</h3>
          {criticalCount > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
              {criticalCount} CRÍTICO{criticalCount > 1 ? 'S' : ''}
            </span>
          )}
          {warningCount > 0 && criticalCount === 0 && (
            <span className="bg-yellow-600 text-white text-xs font-bold px-2 py-1 rounded">
              {warningCount} ALERTA{warningCount > 1 ? 'S' : ''}
            </span>
          )}
        </div>
        <div className={`phase-indicator ${indicatorColors[phase]} ${criticalCount > 0 ? 'animate-ping' : ''}`} />
      </div>

      {/* Métricas en una sola fila */}
      <div className="grid grid-cols-6 gap-2">
        <MetricItem label="Voltaje" value={data.voltaje} unit="V" isCritical={voltajeCritico} isWarning={voltajeAlerta} onClick={(e) => openMetric('voltaje','Voltaje','V', e.currentTarget.getBoundingClientRect(), 'popover')} />
        <MetricItem label="Corriente" value={data.corriente} unit="A" isCritical={corrienteCritico} isWarning={corrienteAlerta} onClick={(e) => openMetric('corriente','Corriente','A', e.currentTarget.getBoundingClientRect(), 'popover')} />
        <MetricItem label="Potencia" value={data.potencia} unit="W" isCritical={potenciaCritico} isWarning={potenciaAlerta} onClick={(e) => openMetric('potencia','Potencia','W', e.currentTarget.getBoundingClientRect(), 'popover')} />
        <MetricItem label="Energía" value={data.energia} unit="kWh" isCritical={energiaCritico} isWarning={energiaAlerta} onClick={(e) => openMetric('energia','Energía','kWh', e.currentTarget.getBoundingClientRect(), 'popover')} />
        <MetricItem label="Frecuencia" value={data.frecuencia} unit="Hz" isCritical={frecuenciaCritico} isWarning={frecuenciaAlerta} onClick={(e) => openMetric('frecuencia','Frecuencia','Hz', e.currentTarget.getBoundingClientRect(), 'popover')} />
        <MetricItem label="Factor P." value={data.factorPotencia} unit="" isCritical={factorPotenciaCritico} isWarning={factorPotenciaAlerta} onClick={(e) => openMetric('factorPotencia','Factor P.','', e.currentTarget.getBoundingClientRect(), 'popover')} />
      </div>

      {/* Metric modal state and renderer */}
      <MetricModal
        open={!!modal?.open}
        onClose={() => setModal({ open: false })}
        phase={phase}
        dataKey={modal?.key}
        unit={modal?.unit}
        phaseData={data}
        label={modal?.label}
        anchorRect={modal?.anchorRect}
        mode={modal?.mode}
      />
    </div>
  );
};

export default PhasePanel;
