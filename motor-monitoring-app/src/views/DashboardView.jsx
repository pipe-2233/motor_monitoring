import Motor3D from '../components/Motor3D';
import Stats from '../components/Stats';
import CombinedChart from '../components/CombinedChart';
import PhasePanel from '../components/PhasePanel';
import AIStatus from '../components/AIStatus';
import MotorControlButtons from '../components/MotorControlButtons';
import { useMQTT } from '../context/MQTTContext';
import { useState } from 'react';
import { X } from 'lucide-react';

const DashboardView = () => {
  const { phaseData } = useMQTT();
  const [chartModal, setChartModal] = useState({ open: false, type: null });

  const openChart = (type) => setChartModal({ open: true, type });
  const closeChart = () => setChartModal({ open: false, type: null });

  return (
    <div className="container mx-auto px-2 sm:px-4 py-2 flex-1 overflow-hidden">
      {/* Modal de Gráficas */}
      {chartModal.open && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={closeChart}>
          <div className="bg-primary-dark rounded-xl p-4 max-w-2xl w-full relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeChart}
              className="absolute top-2 right-2 p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            {chartModal.type === 'voltaje' && (
              <CombinedChart 
                title="Voltaje por Fase"
                phaseData={phaseData}
                dataKey="voltaje"
                unit="V"
              />
            )}
            {chartModal.type === 'corriente' && (
              <CombinedChart 
                title="Corriente por Fase"
                phaseData={phaseData}
                dataKey="corriente"
                unit="A"
              />
            )}
          </div>
        </div>
      )}

      {/* Vista Desktop - Layout como imagen */}
      <div className="hidden lg:grid lg:grid-cols-[320px_1fr] gap-3 h-[calc(100vh-120px)] overflow-hidden">
        
        {/* COLUMNA IZQUIERDA - Motor 3D + Métricas */}
        <div className="flex flex-col gap-3 h-full overflow-hidden">
          {/* Motor 3D - Reducido para dar espacio a métricas */}
          <div id="motor-3d" className="flex-shrink-0" style={{ height: '440px' }}>
            <Motor3D />
          </div>

          {/* Métricas - Vertical sin scroll */}
          <div id="stats-section" className="flex flex-col gap-3 flex-1 min-h-0">
            <Stats />
          </div>
        </div>

        {/* COLUMNA DERECHA - Gráficas + Paneles */}
        <div className="flex flex-col gap-5 h-full overflow-hidden">
          {/* Gráficas - 42% con mejor separación */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0" style={{ height: '42%' }}>
            <div id="combined-chart" className="h-full">
              <CombinedChart 
                title="Voltaje por Fase"
                phaseData={phaseData}
                dataKey="voltaje"
                unit="V"
              />
            </div>
            <div id="phase-chart" className="h-full">
              <CombinedChart 
                title="Corriente por Fase"
                phaseData={phaseData}
                dataKey="corriente"
                unit="A"
              />
            </div>
          </div>

          {/* Paneles de Fase - con buena separación */}
          <div id="phase-panels" className="flex-1 flex flex-col gap-3 overflow-auto min-h-0">
            <div id="phase-a">
              <PhasePanel phase="A" data={phaseData.A} color="#ef4444" />
            </div>
            <div id="phase-b">
              <PhasePanel phase="B" data={phaseData.B} color="#eab308" />
            </div>
            <div id="phase-c">
              <PhasePanel phase="C" data={phaseData.C} color="#3b82f6" />
            </div>
          </div>
        </div>
      </div>

      {/* Vista Móvil - Compacta */}
      <div className="lg:hidden h-[calc(100vh-140px)] flex flex-col gap-2 overflow-hidden">
        {/* Gráficas - Móvil (MÁS GRANDES) */}
        <div className="flex-shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Gráfica de Voltaje */}
            <div className="glass-card p-3 cursor-pointer hover:border-purple-500 transition-all" onClick={() => openChart('voltaje')}>
              <div className="h-60 sm:h-64">
                <CombinedChart 
                  title="⚡ Voltaje 3Φ"
                  phaseData={phaseData}
                  dataKey="voltaje"
                  unit="V"
                />
              </div>
            </div>

            {/* Gráfica de Corriente */}
            <div className="glass-card p-3 cursor-pointer hover:border-purple-500 transition-all" onClick={() => openChart('corriente')}>
              <div className="h-60 sm:h-64">
                <CombinedChart 
                  title="🔌 Corriente 3Φ"
                  phaseData={phaseData}
                  dataKey="corriente"
                  unit="A"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Métricas Principales - Horizontal */}
        <div className="flex-shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <Stats />
          </div>
        </div>

        {/* Paneles de Fases - Más espacio disponible */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-2">
          <PhasePanel phase="A" data={phaseData.A} color="#ef4444" />
          <PhasePanel phase="B" data={phaseData.B} color="#eab308" />
          <PhasePanel phase="C" data={phaseData.C} color="#3b82f6" />
        </div>

      </div>
      
      {/* AI Status - Círculo flotante */}
      <AIStatus />
      
      {/* Botones de control del motor - Solo móvil */}
      <MotorControlButtons />
    </div>
  );
};

export default DashboardView;
