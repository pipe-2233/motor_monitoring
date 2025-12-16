import React from 'react';
import { useMQTT } from '../context/MQTTContext';
import { API_BASE_URL } from '../config/config';

const DebugAlerts = () => {
  const { alerts, hasActiveAlerts, hasWarnings, refreshAlerts } = useMQTT();

  const handleResolveAll = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}api/alerts/resolve-all`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}`);
        // Refrescar alertas
        refreshAlerts();
      } else {
        alert(`❌ Error: ${response.status}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md z-50 border-2 border-blue-500">
      <h3 className="font-bold mb-2 text-blue-400 flex items-center justify-between">
        <span>🔍 DEBUG - Estado de Alertas</span>
        <button 
          onClick={handleResolveAll}
          className="ml-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
        >
          Resolver Todas
        </button>
      </h3>
      
      <div className="mb-2">
        <strong>hasActiveAlerts:</strong> 
        <span className={hasActiveAlerts ? 'text-red-500 ml-2' : 'text-green-500 ml-2'}>
          {hasActiveAlerts ? '✅ TRUE' : '❌ FALSE'}
        </span>
      </div>
      
      <div className="mb-2">
        <strong>hasWarnings:</strong> 
        <span className={hasWarnings ? 'text-yellow-500 ml-2' : 'text-green-500 ml-2'}>
          {hasWarnings ? '✅ TRUE' : '❌ FALSE'}
        </span>
      </div>
      
      <div className="mb-2">
        <strong>Total Alertas:</strong> <span className="ml-2">{alerts.length}</span>
      </div>
      
      {alerts.length > 0 && (
        <div className="mt-3 max-h-40 overflow-y-auto">
          <strong className="text-sm">Últimas alertas:</strong>
          {alerts.slice(0, 5).map((alert, idx) => (
            <div 
              key={idx} 
              className={`text-xs mt-1 p-1 rounded ${
                alert.severity === 'critical' ? 'bg-red-900' : 'bg-yellow-900'
              }`}
            >
              <div>{alert.alert_type} - {alert.severity}</div>
              <div className="text-gray-400">
                {alert.message} | Resuelto: {alert.resolved ? 'Sí' : 'No'}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {alerts.length === 0 && (
        <div className="text-gray-400 text-sm mt-2">No hay alertas activas</div>
      )}
    </div>
  );
};

export default DebugAlerts;
