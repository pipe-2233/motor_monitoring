import { Activity, Wifi, WifiOff, Calendar, Clock, Menu } from 'lucide-react';
import { useMQTT } from '../context/MQTTContext';
import { useState, useEffect } from 'react';

const Header = ({ onMenuClick }) => {
  const { isConnected, connectionStatus } = useMQTT();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <header className="glass-card sticky top-0 z-40 shadow-lg border-b-2 border-purple-main/30">
      <div className="px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Botón hamburguesa (móvil) */}
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          {/* Logo y Título */}
          <div className="flex items-center gap-2 md:gap-4">
            <Activity className="w-8 md:w-10 h-8 md:h-10 text-purple-light animate-pulse" />
            <div>
              <h1 className="text-lg md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-light to-blue-400 bg-clip-text text-transparent">
                Monitoreo de Motores
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(currentTime)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono">{formatTime(currentTime)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Estado de Conexión */}
          <div className="flex items-center gap-3 bg-primary-secondary/50 px-4 py-2 rounded-lg border border-purple-main/20">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-400 animate-pulse" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            <div className="hidden md:block">
              <p className="text-xs text-gray-400">Estado MQTT</p>
              <p className={`text-sm font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {connectionStatus}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
