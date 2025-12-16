import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Line } from 'react-chartjs-2';
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
import { X } from 'lucide-react';

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

const MetricModal = ({ open, onClose, phase, dataKey, unit, phaseData, label, anchorRect = null, mode = 'modal' }) => {
  const chartRef = useRef(null);
  const historyRef = useRef({ labels: [], values: [] });
  const popoverRef = useRef(null);

  // When modal opens, initialize history and start a timer to append values periodically
  useEffect(() => {
    if (!open) return;
    const history = historyRef.current;
    const maxPoints = 60;
    const currentValue = phaseData?.[dataKey] ?? 0;

    // Initialize history with repeated current value so the chart isn't empty
    history.values = Array(10).fill(currentValue);
    history.labels = Array(10).fill().map(() => new Date().toLocaleTimeString('es-ES'));
    if (chartRef.current) chartRef.current.update('none');

    const interval = setInterval(() => {
      const val = phaseData?.[dataKey] ?? 0;
      history.values.push(val);
      history.labels.push(new Date().toLocaleTimeString('es-ES'));
      if (history.values.length > maxPoints) {
        history.values.shift();
        history.labels.shift();
      }
      if (chartRef.current) chartRef.current.update('none');
    }, 1000);

    // click-outside handler only while open and in popover mode
    function handleOutside(e) {
      if (mode !== 'popover') return;
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open, phaseData, dataKey, mode, onClose]);

  if (!open) return null;

  const data = {
    labels: historyRef.current.labels,
    datasets: [
      {
        label: `${label} ${phase}`,
        data: historyRef.current.values,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: `${label} - Fase ${phase}`, color: '#f3f4f6' },
      tooltip: { backgroundColor: 'rgba(17,24,39,0.95)' }
    },
    scales: {
      x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(139,92,246,0.06)' } },
      y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(139,92,246,0.06)' } },
    }
  };

  // If mode is 'popover', render a compact floating panel near the anchorRect
  if (mode === 'popover' && anchorRect) {
    const popWidth = 320;
    const popHeight = 200;
    // compute position: prefer above the anchor, otherwise below
    let left = anchorRect.left + window.scrollX;
    let top = anchorRect.top + window.scrollY - popHeight - 8; // above

    // clamp horizontal
    if (left + popWidth > window.innerWidth - 8) left = window.innerWidth - popWidth - 8;
    if (left < 8) left = 8;

    // if not enough space above, place below
    if (top < 8) top = anchorRect.bottom + window.scrollY + 8;
    // clamp vertical
    if (top + popHeight > window.innerHeight - 8) top = window.innerHeight - popHeight - 8;

    const style = { position: 'fixed', left: `${left}px`, top: `${top}px`, width: `${popWidth}px`, height: `${popHeight}px`, zIndex: 9999 };

    const pop = (
      <div ref={popoverRef} style={style} className="glass-card p-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-white">{label} - Fase {phase}</h4>
          <button onClick={onClose} className="p-1 rounded text-gray-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="h-[calc(100%-36px)]">
          <Line ref={chartRef} data={data} options={options} />
        </div>
      </div>
    );

    return createPortal(pop, document.body);
  }

  // Default: fullscreen modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[94%] lg:w-3/4 h-[78%] glass-card p-4 z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">{label} - Fase {phase}</h3>
          <button onClick={onClose} className="p-1 rounded text-gray-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="h-[calc(100%-48px)]">
          <Line ref={chartRef} data={data} options={options} />
        </div>
      </div>
    </div>
  );
};

export default MetricModal;
