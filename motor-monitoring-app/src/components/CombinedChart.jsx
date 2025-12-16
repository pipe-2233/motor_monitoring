import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CombinedChart = ({ title, phaseData, dataKey, unit }) => {
  const chartRef = useRef(null);
  const dataHistoryRef = useRef({
    A: [],
    B: [],
    C: [],
    labels: []
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const history = dataHistoryRef.current;
    const maxPoints = 20;

    // Agregar nuevos datos
    history.A.push(phaseData.A[dataKey]);
    history.B.push(phaseData.B[dataKey]);
    history.C.push(phaseData.C[dataKey]);
    history.labels.push(new Date().toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }));

    // Limitar puntos
    if (history.A.length > maxPoints) {
      history.A.shift();
      history.B.shift();
      history.C.shift();
      history.labels.shift();
    }

    // Actualizar gráfica
    if (chartRef.current) {
      chartRef.current.update('none');
    }
  }, [phaseData, dataKey]);

  const data = {
    labels: dataHistoryRef.current.labels,
    datasets: [
      {
        label: 'Fase A',
        data: dataHistoryRef.current.A,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Fase B',
        data: dataHistoryRef.current.B,
        borderColor: '#eab308',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Fase C',
        data: dataHistoryRef.current.C,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#e5e7eb',
          font: { size: 11 },
          padding: 10,
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: title,
        color: '#f3f4f6',
        font: { size: 14, weight: 'bold' },
        padding: { bottom: 10 },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#f3f4f6',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} ${unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(139, 92, 246, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(139, 92, 246, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: { size: 10 },
          callback: (value) => `${value} ${unit}`,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    animation: {
      duration: 0,
    },
  };

  return (
    <div className={`glass-card p-3 h-full transition-all ${expanded ? 'lg:col-span-3 z-40' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-gray-300 hover:text-white p-1 rounded focus:outline-none"
          aria-label={expanded ? 'Contraer' : 'Expandir'}
        >
          {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div className={`${expanded ? 'h-[56vh]' : 'h-[220px]'}`}>
        <Line ref={chartRef} data={data} options={options} />
      </div>
    </div>
  );
};

export default CombinedChart;
