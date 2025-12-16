import { Thermometer, Gauge, Zap, Battery, Activity, AlertTriangle, AlertCircle } from 'lucide-react';
import { useMQTT } from '../context/MQTTContext';
import { useState } from 'react';
import MetricModal from './MetricModal';

const StatCard = ({ icon: Icon, label, value, unit, color, isCritical, isWarning, onClick }) => {
  return (
    <div onClick={onClick} className={`glass-card p-2 relative cursor-pointer hover:border-purple-500 transition-all ${isCritical ? 'animate-pulse border-2 border-red-500' : isWarning ? 'border-2 border-yellow-500' : ''}`}>
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${color} relative flex-shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
          {isCritical && (
            <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 animate-bounce">
              <AlertCircle className="w-2 h-2 text-white" />
            </div>
          )}
          {isWarning && !isCritical && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5">
              <AlertTriangle className="w-2 h-2 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate">{label}</p>
          <p className={`text-base font-bold leading-tight ${isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-white'}`}>
            {typeof value === 'number' ? value.toFixed(1) : value}<span className="text-xs ml-0.5">{unit}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

const Stats = () => {
  const { generalData, thresholds } = useMQTT();
  const [modal, setModal] = useState({ open: false });
  const openMetric = (key, label, unit, anchorRect = null) => setModal({ open: true, key, label, unit, anchorRect, mode: 'popover' });

  // Determinar estados críticos y de advertencia usando umbrales dinámicos
  const temperaturaCritico = generalData.temperatura > thresholds.temp_critical;
  const temperaturaAlerta = generalData.temperatura > thresholds.temp_warning && !temperaturaCritico;
  
  const rpmCritico = generalData.rpm > thresholds.rpm_critical;
  const rpmAlerta = generalData.rpm > thresholds.rpm_warning && !rpmCritico;
  
  const vibracionCritico = generalData.vibracion > thresholds.vibration_critical;
  const vibracionAlerta = generalData.vibracion > thresholds.vibration_warning && !vibracionCritico;

  return (
    <>
      <StatCard
        icon={Thermometer}
        label="Temp"
        value={generalData.temperatura}
        unit="°C"
        color="from-red-500 to-orange-500"
        isCritical={temperaturaCritico}
        isWarning={temperaturaAlerta}
        onClick={(e) => openMetric('temperatura','Temperatura','°C', e.currentTarget.getBoundingClientRect())}
      />
      <StatCard
        icon={Gauge}
        label="RPM"
        value={generalData.rpm}
        unit=""
        color="from-purple-500 to-pink-500"
        isCritical={rpmCritico}
        isWarning={rpmAlerta}
        onClick={(e) => openMetric('rpm','Velocidad','RPM', e.currentTarget.getBoundingClientRect())}
      />
      <StatCard
        icon={Activity}
        label="Vib"
        value={generalData.vibracion || 0}
        unit="mm/s"
        color="from-cyan-500 to-blue-500"
        isCritical={vibracionCritico}
        isWarning={vibracionAlerta}
        onClick={(e) => openMetric('vibracion','Vibración','mm/s', e.currentTarget.getBoundingClientRect())}
      />

      <MetricModal
        open={!!modal?.open}
        onClose={() => setModal({ open: false })}
        phase={'General'}
        dataKey={modal?.key}
        unit={modal?.unit}
        phaseData={generalData}
        label={modal?.label}
        anchorRect={modal?.anchorRect}
        mode={modal?.mode}
      />
    </>
  );
};

export default Stats;
