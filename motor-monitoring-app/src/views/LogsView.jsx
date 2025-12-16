import { useState, useEffect } from 'react';
import { FileText, AlertCircle, CheckCircle, Info, Clock, Filter } from 'lucide-react';
import { useMQTT } from '../context/MQTTContext';

const LogsView = () => {
  const { phaseData, generalData } = useMQTT();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      type: 'info',
      message: 'Sistema de monitoreo iniciado',
      data: null,
    };

    if (logs.length === 0) {
      setLogs([newLog]);
    }
  }, []);

  useEffect(() => {
    const temp = generalData.temperatura;
    const vib = generalData.vibracion;
    const rpm = generalData.rpm;

    let logType = 'info';
    let message = '';

    if (temp > 80) {
      logType = 'error';
      message = `🔥 Temperatura crítica detectada: ${temp.toFixed(1)}°C`;
    } else if (temp > 60) {
      logType = 'warning';
      message = `⚠️ Temperatura elevada: ${temp.toFixed(1)}°C`;
    }

    if (vib > 10) {
      logType = 'error';
      message = `⚡ Vibración crítica: ${vib.toFixed(2)} mm/s`;
    } else if (vib > 7) {
      logType = 'warning';
      message = message || `⚠️ Vibración alta: ${vib.toFixed(2)} mm/s`;
    }

    if (rpm > 3000) {
      logType = 'error';
      message = message || `🔴 RPM crítico: ${rpm} RPM`;
    } else if (rpm > 2500) {
      logType = 'warning';
      message = message || `⚠️ RPM elevado: ${rpm} RPM`;
    }

    if (message) {
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        type: logType,
        message,
        data: { temperatura: temp, vibracion: vib, rpm },
      };

      setLogs((prev) => [newLog, ...prev].slice(0, 100));
    }
  }, [generalData]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const getLogIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error':
        return 'border-red-500/50 bg-red-500/10';
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/10';
      case 'success':
        return 'border-green-500/50 bg-green-500/10';
      default:
        return 'border-blue-500/50 bg-blue-500/10';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Registro de Eventos</h1>
          <p className="text-gray-400">{logs.length} eventos registrados</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-primary-secondary/50 border border-purple-main/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-main"
          >
            <option value="all">Todos</option>
            <option value="error">Errores</option>
            <option value="warning">Advertencias</option>
            <option value="info">Información</option>
            <option value="success">Éxitos</option>
          </select>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total</p>
              <p className="text-2xl font-bold text-white">{logs.length}</p>
            </div>
            <FileText className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Errores</p>
              <p className="text-2xl font-bold text-red-500">
                {logs.filter(l => l.type === 'error').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Advertencias</p>
              <p className="text-2xl font-bold text-yellow-500">
                {logs.filter(l => l.type === 'warning').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Info</p>
              <p className="text-2xl font-bold text-blue-500">
                {logs.filter(l => l.type === 'info').length}
              </p>
            </div>
            <Info className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="glass-card p-6">
        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No hay eventos para mostrar</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`border-l-4 ${getLogColor(log.type)} rounded-lg p-4 transition-all hover:translate-x-1`}
              >
                <div className="flex items-start gap-3">
                  {getLogIcon(log.type)}
                  <div className="flex-1">
                    <p className="text-white font-medium">{log.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{log.timestamp}</span>
                    </div>
                    {log.data && (
                      <div className="mt-2 text-xs text-gray-500 font-mono bg-black/30 p-2 rounded">
                        {JSON.stringify(log.data, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsView;
