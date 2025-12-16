import { MQTTProvider, useMQTT } from './context/MQTTContext';
import { SearchProvider } from './context/SearchContext';
import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import TestControls from './components/TestControls';
import FloatingAlerts from './components/FloatingAlerts';
import DashboardView from './views/DashboardView';
import MonitoringView from './views/MonitoringView';
import ErrorsView from './views/ErrorsView';
import LogsView from './views/LogsView';
import SettingsView from './views/SettingsView';
import AIReportGenerator from './components/analysis/AIReportGenerator';

const Dashboard = () => {
  const { setTestData, setTestPhaseData } = useMQTT();
  const [isTestMode, setIsTestMode] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'monitoring':
        return <MonitoringView />;
      case 'errors':
        return <ErrorsView />;
      case 'logs':
        return <LogsView />;
      case 'settings':
        return <SettingsView />;
      case 'ai-reports':
        return <AIReportGenerator />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Notificaciones flotantes */}
      <FloatingAlerts />
      
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <div className={`flex flex-col flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'} ml-0`}>
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <main className="flex-1 overflow-auto">
          {renderView()}
        </main>

        {/* Footer */}
        <footer className="glass-card py-1 text-center text-xs text-gray-400">
          <p>Sistema de Monitoreo | {new Date().toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
        </footer>
      </div>

      {/* Panel de pruebas */}
      <TestControls 
        onDataChange={setTestData} 
        onPhaseDataChange={setTestPhaseData}
        isTestMode={isTestMode}
        setIsTestMode={setIsTestMode}
      />
    </div>
  );
};

function App() {
  return (
    <MQTTProvider>
      <SearchProvider>
        <Dashboard />
      </SearchProvider>
    </MQTTProvider>
  );
}

export default App;

