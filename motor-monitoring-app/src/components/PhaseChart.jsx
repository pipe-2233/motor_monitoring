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
  Filler,
} from 'chart.js';
import { useEffect, useState } from 'react';

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

const PhaseChart = ({ title, data, color, unit, maxPoints = 20 }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: title,
        data: [],
        borderColor: color,
        backgroundColor: `${color}20`,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  });

  useEffect(() => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setChartData((prev) => {
      const newLabels = [...prev.labels, timeLabel];
      const newData = [...prev.datasets[0].data, data];

      // Limitar puntos
      if (newLabels.length > maxPoints) {
        newLabels.shift();
        newData.shift();
      }

      return {
        labels: newLabels,
        datasets: [
          {
            ...prev.datasets[0],
            data: newData,
          },
        ],
      };
    });
  }, [data, maxPoints]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#f1f5f9',
          font: { size: 11, family: 'system-ui' },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 31, 58, 0.9)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: color,
        borderWidth: 1,
        callbacks: {
          label: (context) => `${context.parsed.y.toFixed(2)} ${unit}`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: { color: 'rgba(139, 92, 246, 0.1)' },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
        },
      },
      y: {
        display: true,
        grid: { color: 'rgba(139, 92, 246, 0.1)' },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 },
          callback: (value) => `${value.toFixed(0)} ${unit}`,
        },
      },
    },
  };

  return (
    <div className="h-[220px] bg-primary-secondary/50 rounded-lg p-3 border border-purple-main/10">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default PhaseChart;
