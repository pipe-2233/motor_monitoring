import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config/config';

const AlertToast = ({ alert, onClose }) => {
  const isCritical = alert.severity === 'critical';
  const isML = alert.category === 'ml_anomaly';

  const getIcon = () => {
    if (isML) return <Zap className="w-6 h-6" />;
    if (isCritical) return <AlertCircle className="w-6 h-6" />;
    return <AlertTriangle className="w-6 h-6" />;
  };

  const getColors = () => {
    if (isCritical) return {
      bg: 'bg-red-600',
      border: 'border-red-400',
      icon: 'text-red-100',
      text: 'text-red-50'
    };
    if (isML) return {
      bg: 'bg-purple-600',
      border: 'border-purple-400',
      icon: 'text-purple-100',
      text: 'text-purple-50'
    };
    return {
      bg: 'bg-yellow-600',
      border: 'border-yellow-400',
      icon: 'text-yellow-100',
      text: 'text-yellow-50'
    };
  };

  const colors = getColors();

  return (
    <div 
      className={`${colors.bg} ${colors.border} border-2 rounded-lg shadow-2xl p-4 mb-3 animate-slide-in-right max-w-md backdrop-blur-sm bg-opacity-95`}
      style={{
        animation: isCritical ? 'pulse 2s infinite, slide-in-right 0.5s ease-out' : 'slide-in-right 0.5s ease-out'
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`${colors.icon} flex-shrink-0 ${isCritical ? 'animate-bounce' : ''}`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`font-bold ${colors.text} text-sm uppercase tracking-wide`}>
                {isCritical ? '🚨 ALERTA CRÍTICA' : isML ? '🤖 ANOMALÍA IA' : '⚠️ ADVERTENCIA'}
              </p>
              <p className={`${colors.text} text-base font-semibold mt-1`}>
                {alert.message}
              </p>
              <p className="text-white text-opacity-80 text-xs mt-1">
                {alert.category.replace('_', ' ').toUpperCase()} | Valor: {alert.value?.toFixed(2)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FloatingAlerts = () => {
  const [activeToasts, setActiveToasts] = useState([]);
  const [lastAlertIds, setLastAlertIds] = useState(new Set());

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}api/alerts/active`);
        if (response.ok) {
          const alerts = await response.json();
          
          // Detectar nuevas alertas
          const newAlerts = alerts.filter(alert => !lastAlertIds.has(alert.id));
          
          if (newAlerts.length > 0) {
            // Agregar nuevas alertas como toasts
            const newToasts = newAlerts.map(alert => ({
              ...alert,
              toastId: Date.now() + Math.random()
            }));
            
            setActiveToasts(prev => [...newToasts, ...prev].slice(0, 5)); // Max 5 toasts
            
            // Actualizar IDs conocidos
            setLastAlertIds(new Set(alerts.map(a => a.id)));
            
            // Auto-cerrar después de 8 segundos
            newToasts.forEach(toast => {
              setTimeout(() => {
                setActiveToasts(prev => prev.filter(t => t.toastId !== toast.toastId));
              }, 8000);
            });
          }
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2000); // Check cada 2 segundos
    return () => clearInterval(interval);
  }, [lastAlertIds]);

  const handleClose = (toastId) => {
    setActiveToasts(prev => prev.filter(t => t.toastId !== toastId));
  };

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        {activeToasts.map((toast) => (
          <AlertToast
            key={toast.toastId}
            alert={toast}
            onClose={() => handleClose(toast.toastId)}
          />
        ))}
      </div>
    </div>
  );
};

export default FloatingAlerts;
