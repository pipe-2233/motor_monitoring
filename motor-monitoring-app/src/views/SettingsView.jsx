import { useState, useEffect } from 'react';
import { Settings, Wifi, Bell, Save, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { useMQTT } from '../context/MQTTContext';
import { API_BASE_URL } from '../config/config';

const API_URL = `${API_BASE_URL}api`;

const SettingsView = () => {
  const { client, refreshThresholds } = useMQTT();
  
  const [config, setConfig] = useState({
    mqttBroker: 'wss://tu-cluster.s1.eu.hivemq.cloud:8884/mqtt',
    mqttUsername: '',
    mqttPassword: '',
    updateInterval: 1000,
    enableNotifications: true,
    enableSounds: false,
  });

  const [thresholds, setThresholds] = useState({
    voltage_min: 110,
    voltage_max: 135,
    current_warning: 13,
    current_critical: 14,
    power_warning: 4000,
    power_critical: 5000,
    frequency_min: 59,
    frequency_max: 61,
    pf_min: 0.85,
    temp_warning: 60,
    temp_critical: 80,
    vibration_warning: 10,
    vibration_critical: 15,
    rpm_warning: 2500,
    rpm_critical: 3000,
    energy_warning: 100,
  });

  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Cargar umbrales desde el backend al montar
  useEffect(() => {
    loadThresholds();
  }, []);

  const loadThresholds = async () => {
    try {
      const response = await fetch(`${API_URL}/settings/thresholds`);
      if (response.ok) {
        const data = await response.json();
        setThresholds(data);
      }
    } catch (error) {
      console.error('Error cargando umbrales:', error);
    }
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleThresholdChange = (key, value) => {
    setThresholds(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleSaveThresholds = async () => {
    setLoading(true);
    setSaveMessage('');
    
    try {
      // 1. Guardar en backend via API REST
      const response = await fetch(`${API_URL}/settings/thresholds`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(thresholds),
      });

      if (response.ok) {
        // 2. Publicar por MQTT para que el backend también se actualice en tiempo real
        if (client && client.connected) {
          client.publish(
            'motor/thresholds/update',
            JSON.stringify(thresholds),
            { qos: 1 },
            (err) => {
              if (err) {
                console.error('Error publicando umbrales por MQTT:', err);
              } else {
                console.log('✅ Umbrales publicados por MQTT');
              }
            }
          );
        }
        
        // 3. Refrescar umbrales en el context para actualizar Stats.jsx
        if (refreshThresholds) {
          refreshThresholds();
        }
        
        setSaveMessage('success');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('error');
      }
    } catch (error) {
      console.error('Error guardando umbrales:', error);
      setSaveMessage('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    console.log('Guardando configuración MQTT:', config);
    alert('✅ Configuración MQTT guardada (solo local por ahora)');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
        <p className="text-gray-400">Ajusta los parámetros del sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración MQTT */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wifi className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Conexión MQTT</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Broker URL
              </label>
              <input
                type="text"
                value={config.mqttBroker}
                onChange={(e) => handleChange('mqttBroker', e.target.value)}
                className="w-full bg-primary-secondary/50 border border-purple-main/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-main"
                placeholder="wss://broker.hivemq.com:8884/mqtt"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={config.mqttUsername}
                onChange={(e) => handleChange('mqttUsername', e.target.value)}
                className="w-full bg-primary-secondary/50 border border-purple-main/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-main"
                placeholder="usuario_mqtt"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={config.mqttPassword}
                onChange={(e) => handleChange('mqttPassword', e.target.value)}
                className="w-full bg-primary-secondary/50 border border-purple-main/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-main"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Intervalo de Actualización (ms)
              </label>
              <input
                type="number"
                value={config.updateInterval}
                onChange={(e) => handleChange('updateInterval', parseInt(e.target.value))}
                className="w-full bg-primary-secondary/50 border border-purple-main/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-main"
                min="100"
                max="10000"
                step="100"
              />
            </div>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Notificaciones</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Activar Notificaciones</p>
                <p className="text-sm text-gray-400">Recibir alertas del sistema</p>
              </div>
              <button
                onClick={() => handleChange('enableNotifications', !config.enableNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enableNotifications ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.enableNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Sonidos</p>
                <p className="text-sm text-gray-400">Alertas sonoras</p>
              </div>
              <button
                onClick={() => handleChange('enableSounds', !config.enableSounds)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enableSounds ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.enableSounds ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Umbrales de Alerta */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Corrección de Umbrales</h2>
            </div>
            <button
              onClick={handleSaveThresholds}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : saveMessage === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Guardado!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Umbrales
                </>
              )}
            </button>
          </div>

          {/* Nota informativa */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200">
              Los umbrales se guardan en la base de datos y se aplican automáticamente al sistema de alertas.
              Los cambios se sincronizan con el backend en tiempo real.
            </p>
          </div>

          {saveMessage === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-200">Error al guardar umbrales. Verifica la conexión con el backend.</p>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Voltaje */}
            <div className="bg-primary-secondary/30 rounded-lg p-3 border border-yellow-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                <h3 className="font-semibold text-white text-xs">Voltaje (V)</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Mín</label>
                  <input
                    type="number"
                    value={thresholds.voltage_min}
                    onChange={(e) => handleThresholdChange('voltage_min', e.target.value)}
                    className="w-full bg-slate-800/50 border border-yellow-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Máx</label>
                  <input
                    type="number"
                    value={thresholds.voltage_max}
                    onChange={(e) => handleThresholdChange('voltage_max', e.target.value)}
                    className="w-full bg-slate-800/50 border border-red-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">220V ±5%</p>
            </div>

            {/* Corriente */}
            <div className="bg-primary-secondary/30 rounded-lg p-3 border border-red-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <h3 className="font-semibold text-white text-xs">Corriente (A)</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Warning</label>
                  <input
                    type="number"
                    value={thresholds.current_warning}
                    onChange={(e) => handleThresholdChange('current_warning', e.target.value)}
                    className="w-full bg-slate-800/50 border border-yellow-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Critical</label>
                  <input
                    type="number"
                    value={thresholds.current_critical}
                    onChange={(e) => handleThresholdChange('current_critical', e.target.value)}
                    className="w-full bg-slate-800/50 border border-red-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Sobrecarga &gt;20A</p>
            </div>

            {/* Potencia */}
            <div className="bg-primary-secondary/30 rounded-lg p-3 border border-orange-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                <h3 className="font-semibold text-white text-xs">Potencia (W)</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Warning</label>
                  <input
                    type="number"
                    value={thresholds.power_warning}
                    onChange={(e) => handleThresholdChange('power_warning', e.target.value)}
                    className="w-full bg-slate-800/50 border border-yellow-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Critical</label>
                  <input
                    type="number"
                    value={thresholds.power_critical}
                    onChange={(e) => handleThresholdChange('power_critical', e.target.value)}
                    className="w-full bg-slate-800/50 border border-red-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Nominal: 4kW</p>
            </div>

            {/* Frecuencia */}
            <div className="bg-primary-secondary/30 rounded-lg p-3 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
                <h3 className="font-semibold text-white text-xs">Frecuencia (Hz)</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Mín</label>
                  <input
                    type="number"
                    step="0.1"
                    value={thresholds.frequency_min}
                    onChange={(e) => handleThresholdChange('frequency_min', e.target.value)}
                    className="w-full bg-slate-800/50 border border-yellow-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Máx</label>
                  <input
                    type="number"
                    step="0.1"
                    value={thresholds.frequency_max}
                    onChange={(e) => handleThresholdChange('frequency_max', e.target.value)}
                    className="w-full bg-slate-800/50 border border-red-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">60Hz ±1Hz</p>
            </div>

            {/* Factor de Potencia */}
            <div className="bg-primary-secondary/30 rounded-lg p-3 border border-purple-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-purple-400" />
                <h3 className="font-semibold text-white text-xs">Factor Pot.</h3>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mínimo</label>
                <input
                  type="number"
                  step="0.01"
                  value={thresholds.pf_min}
                  onChange={(e) => handleThresholdChange('pf_min', e.target.value)}
                  className="w-full bg-slate-800/50 border border-yellow-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Ideal: &lt;4.5</p>
            </div>

            {/* Temperatura */}
            <div className="bg-primary-secondary/30 rounded-lg p-3 border border-red-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <h3 className="font-semibold text-white text-xs">Temperatura (°C)</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Warning</label>
                  <input
                    type="number"
                    value={thresholds.temp_warning}
                    onChange={(e) => handleThresholdChange('temp_warning', e.target.value)}
                    className="w-full bg-slate-800/50 border border-yellow-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Critical</label>
                  <input
                    type="number"
                    value={thresholds.temp_critical}
                    onChange={(e) => handleThresholdChange('temp_critical', e.target.value)}
                    className="w-full bg-slate-800/50 border border-red-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Normal: 40-60°C</p>
            </div>

            {/* Vibración */}
            <div className="bg-primary-secondary/30 rounded-lg p-3 border border-yellow-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                <h3 className="font-semibold text-white text-xs">Vibración (mm/s)</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Warning</label>
                  <input
                    type="number"
                    value={thresholds.vibration_warning}
                    onChange={(e) => handleThresholdChange('vibration_warning', e.target.value)}
                    className="w-full bg-slate-800/50 border border-yellow-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Critical</label>
                  <input
                    type="number"
                    value={thresholds.vibration_critical}
                    onChange={(e) => handleThresholdChange('vibration_critical', e.target.value)}
                    className="w-full bg-slate-800/50 border border-red-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Normal: &lt;4.5 mm/s</p>
            </div>

            {/* RPM */}
            <div className="bg-primary-secondary/30 rounded-lg p-3 border border-green-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-green-400" />
                <h3 className="font-semibold text-white text-xs">RPM</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Warning</label>
                  <input
                    type="number"
                    value={thresholds.rpm_warning}
                    onChange={(e) => handleThresholdChange('rpm_warning', e.target.value)}
                    className="w-full bg-slate-800/50 border border-yellow-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Critical</label>
                  <input
                    type="number"
                    value={thresholds.rpm_critical}
                    onChange={(e) => handleThresholdChange('rpm_critical', e.target.value)}
                    className="w-full bg-slate-800/50 border border-red-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Nominal: 1800 RPM</p>
            </div>

            {/* Energía */}
            <div className="bg-primary-secondary/30 rounded-lg p-3 border border-blue-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
                <h3 className="font-semibold text-white text-xs">Energía (kWh)</h3>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Warning</label>
                <input
                  type="number"
                  value={thresholds.energy_warning}
                  onChange={(e) => handleThresholdChange('energy_warning', e.target.value)}
                  className="w-full bg-slate-800/50 border border-yellow-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Consumo acumulado</p>
            </div>
          </div>
        </div>

        {/* Botón guardar MQTT config */}
        <div className="lg:col-span-2 flex justify-end">
          <button
            onClick={handleSaveConfig}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all transform hover:scale-105 font-medium"
          >
            <Save className="w-5 h-5" />
            Guardar Configuración MQTT
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
