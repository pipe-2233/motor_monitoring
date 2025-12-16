import React, { useState, useEffect } from 'react';
import { Brain, Activity, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { API_BASE_URL } from '../config/config';

const AIStatus = () => {
  const [mlAlerts, setMlAlerts] = useState([]);
  const [hasMLAnomaly, setHasMLAnomaly] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchMLAlerts = async () => {
      try {
        console.log('AIStatus: Consultando backend en:', `${API_BASE_URL}api/alerts/active`);
        const response = await fetch(`${API_BASE_URL}api/alerts/active`);
        if (response.ok) {
          const data = await response.json();
          // Filtrar solo alertas de ML
          const mlAlertsFiltered = data.filter(alert => 
            alert.category === 'ml_anomaly' && !alert.resolved
          );
          setMlAlerts(mlAlertsFiltered);
          setHasMLAnomaly(mlAlertsFiltered.length > 0);
        }
      } catch (error) {
        console.error('Error al obtener alertas de IA:', error);
      }
    };

    fetchMLAlerts();
    const interval = setInterval(fetchMLAlerts, 3000); // Actualizar cada 3 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Círculo flotante */}
      <div 
        className={`fixed bottom-24 md:bottom-6 right-6 z-50 cursor-pointer transition-all duration-300 ${showDetails ? 'scale-0' : 'scale-100'}`}
        onClick={() => setShowDetails(true)}
      >
        <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl ${
          hasMLAnomaly 
            ? 'bg-red-500 animate-pulse' 
            : 'bg-green-500'
        }`}>
          <Brain className="w-7 h-7 text-white" />
        </div>
        {hasMLAnomaly && (
          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
            <span className="text-white text-xs font-bold">{mlAlerts.length}</span>
          </div>
        )}
      </div>

      {/* Modal de detalles */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowDetails(false)}>
          <div className="bg-primary-dark rounded-xl p-6 max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowDetails(false)}
              className="absolute top-4 right-4 p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-lg ${hasMLAnomaly ? 'bg-red-500' : 'bg-green-500'}`}>
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Inteligencia Artificial
                </h3>
                <p className="text-sm text-gray-400">
                  {hasMLAnomaly ? (
                    <span className="text-red-400 font-semibold">⚡ Anomalía detectada</span>
                  ) : (
                    <span className="text-green-400">✓ Operación normal</span>
                  )}
                </p>
              </div>
            </div>

            {hasMLAnomaly && mlAlerts.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-yellow-400">Alertas activas:</p>
                {mlAlerts.slice(0, 3).map((alert, idx) => (
                  <div key={idx} className="p-2 bg-red-900/30 rounded-lg border border-red-500/30">
                    <p className="text-sm text-white">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(alert.timestamp).toLocaleString('es-ES')}
                    </p>
                  </div>
                ))}
                {mlAlerts.length > 3 && (
                  <p className="text-xs text-gray-400 text-center">
                    +{mlAlerts.length - 3} alertas más
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Modelo</p>
                  <p className="text-purple-light font-semibold">Isolation Forest</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Estado</p>
                  <p className="text-green-400 font-semibold">● Activo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIStatus;
