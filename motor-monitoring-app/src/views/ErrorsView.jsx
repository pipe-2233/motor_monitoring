import { AlertTriangle, AlertCircle, XCircle, Clock } from 'lucide-react';
import { useMQTT } from '../context/MQTTContext';

const ErrorsView = () => {
  const { generalData, phaseData, thresholds } = useMQTT();

  // Generar errores basados en los datos actuales
  const errors = [];

  // Errores generales
  const tempWarning = thresholds?.temp_warning ?? 60;
  const tempCritical = thresholds?.temp_critical ?? 80;

  if (generalData.temperatura >= tempCritical) {
    errors.push({
      id: 1,
      severity: 'critical',
      type: 'Temperatura',
      message: `Temperatura crítica: ${generalData.temperatura.toFixed(1)}°C`,
      timestamp: new Date().toLocaleString('es-ES'),
      icon: XCircle,
    });
  } else if (generalData.temperatura >= tempWarning) {
    errors.push({
      id: 2,
      severity: 'warning',
      type: 'Temperatura',
      message: `Temperatura elevada: ${generalData.temperatura.toFixed(1)}°C`,
      timestamp: new Date().toLocaleString('es-ES'),
      icon: AlertTriangle,
    });
  }

  const vibWarning = thresholds?.vibration_warning ?? 7;
  const vibCritical = thresholds?.vibration_critical ?? 10;

  if (generalData.vibracion >= vibCritical) {
    errors.push({
      id: 3,
      severity: 'critical',
      type: 'Vibración',
      message: `Vibración crítica: ${generalData.vibracion.toFixed(1)} mm/s`,
      timestamp: new Date().toLocaleString('es-ES'),
      icon: XCircle,
    });
  } else if (generalData.vibracion >= vibWarning) {
    errors.push({
      id: 4,
      severity: 'warning',
      type: 'Vibración',
      message: `Vibración elevada: ${generalData.vibracion.toFixed(1)} mm/s`,
      timestamp: new Date().toLocaleString('es-ES'),
      icon: AlertTriangle,
    });
  }
  const rpmCritical = thresholds?.rpm_critical ?? 3000;

  if (generalData.rpm >= rpmCritical) {
    errors.push({
      id: 5,
      severity: 'critical',
      type: 'RPM',
      message: `Velocidad crítica: ${generalData.rpm} RPM`,
      timestamp: new Date().toLocaleString('es-ES'),
      icon: XCircle,
    });
  }

  // Errores de fase
  Object.entries(phaseData).forEach(([phase, data]) => {
    const vmin = thresholds?.voltage_min ?? 110;
    const vmax = thresholds?.voltage_max ?? 135;
    if (data.voltaje > vmax || data.voltaje < vmin) {
      const isCritical = data.voltaje > (vmax + 20) || data.voltaje < (vmin - 20);
      errors.push({
        id: `phase-${phase}-voltage`,
        severity: isCritical ? 'critical' : 'warning',
        type: `Fase ${phase}`,
        message: `Voltaje fuera de rango: ${data.voltaje.toFixed(1)}V`,
        timestamp: new Date().toLocaleString('es-ES'),
        icon: isCritical ? XCircle : AlertTriangle,
      });
    }

    const currWarning = thresholds?.current_warning ?? 13;
    const currCritical = thresholds?.current_critical ?? 14;
    if (data.corriente >= currWarning) {
      const isCritical = data.corriente >= currCritical;
      errors.push({
        id: `phase-${phase}-current`,
        severity: isCritical ? 'critical' : 'warning',
        type: `Fase ${phase}`,
        message: `Corriente elevada: ${data.corriente.toFixed(1)}A`,
        timestamp: new Date().toLocaleString('es-ES'),
        icon: isCritical ? XCircle : AlertTriangle,
      });
    }

    const pfMin = thresholds?.pf_min ?? 0.7;
    if (data.factorPotencia < pfMin) {
      const isCritical = data.factorPotencia < (pfMin - 0.1);
      errors.push({
        id: `phase-${phase}-pf`,
        severity: isCritical ? 'critical' : 'warning',
        type: `Fase ${phase}`,
        message: `Factor de potencia bajo: ${data.factorPotencia.toFixed(2)}`,
        timestamp: new Date().toLocaleString('es-ES'),
        icon: isCritical ? XCircle : AlertTriangle,
      });
    }
  });

  const criticalCount = errors.filter(e => e.severity === 'critical').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Registro de Errores</h1>
        <p className="text-gray-400">Monitoreo de alertas y errores del sistema</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Errores Críticos</p>
              <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Advertencias</p>
              <p className="text-2xl font-bold text-yellow-400">{warningCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <AlertCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Alertas</p>
              <p className="text-2xl font-bold text-green-400">{errors.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de errores */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-white mb-4">Alertas Activas</h2>
        
        {errors.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-xl text-green-400 font-semibold">✅ Sistema Operando Normalmente</p>
            <p className="text-gray-400 mt-2">No hay errores o advertencias activas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map((error) => {
              const Icon = error.icon;
              return (
                <div
                  key={error.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    error.severity === 'critical'
                      ? 'bg-red-500/10 border-red-500'
                      : 'bg-yellow-500/10 border-yellow-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      className={`w-5 h-5 mt-1 ${
                        error.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3
                          className={`font-semibold ${
                            error.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                          }`}
                        >
                          {error.type}
                        </h3>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {error.timestamp}
                        </span>
                      </div>
                      <p className="text-white mt-1">{error.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorsView;
