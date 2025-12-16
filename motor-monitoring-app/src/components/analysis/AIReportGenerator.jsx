import React, { useState } from 'react';
import { FileText, Download, Clock, AlertCircle, TrendingUp, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../../config/config';

export default function AIReportGenerator() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const quickReports = [
    { label: 'Última Hora', prompt: 'Genera un reporte de la última hora' },
    { label: 'Últimas 6 Horas', prompt: 'Reporte de las últimas 6 horas' },
    { label: 'Últimas 24 Horas', prompt: 'Reporte completo del último día' },
    { label: 'Última Semana', prompt: 'Análisis de la última semana de operación' },
  ];

  const generateReport = async (reportPrompt) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}api/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: reportPrompt || prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err.message);
      console.error('Error generando reporte:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const blob = new Blob([report.report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_motor_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    if (!report) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}api/reports/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt || 'Reporte del motor',
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_motor_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error descargando PDF:', err);
      alert('Error al generar PDF: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-2 sm:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4 lg:mb-8">
          <h1 className="text-2xl lg:text-4xl font-bold text-white mb-2 flex items-center gap-2 lg:gap-3">
            <Sparkles className="text-purple-400 w-7 h-7 lg:w-10 lg:h-10" size={28} />
            Reportes Inteligentes IA
          </h1>
          <p className="text-sm lg:text-base text-gray-400">
            Solicita reportes personalizados sobre el estado del motor en cualquier período de tiempo
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-gray-800 rounded-xl p-3 lg:p-6 mb-4 lg:mb-6 shadow-xl border border-gray-700">
          <h2 className="text-base lg:text-xl font-semibold text-white mb-3 lg:mb-4 flex items-center gap-2">
            <TrendingUp className="text-green-400 w-5 h-5 lg:w-6 lg:h-6" />
            Solicitar Reporte
          </h2>

          {/* Quick Report Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mb-3 lg:mb-4">
            {quickReports.map((report, idx) => (
              <button
                key={idx}
                onClick={() => generateReport(report.prompt)}
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 lg:py-3 px-2 lg:px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 lg:gap-2 text-xs lg:text-sm font-medium"
              >
                <Clock size={14} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="truncate">{report.label}</span>
              </button>
            ))}
          </div>

          {/* Custom Prompt */}
          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && generateReport()}
              placeholder="Ej: Reporte de las últimas 2 horas"
              className="flex-1 bg-gray-700 text-white px-3 py-2 lg:px-4 lg:py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-sm lg:text-base"
            />
            <button
              onClick={() => generateReport()}
              disabled={loading || !prompt}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 lg:px-6 lg:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm lg:text-base"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generando...
                </>
              ) : (
                <>
                  <FileText size={20} />
                  Generar
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}
        </div>

        {/* Report Display */}
        {report && (
          <div className="bg-gray-800 rounded-xl p-3 lg:p-6 shadow-xl border border-gray-700">
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 lg:mb-6 pb-3 lg:pb-4 border-b border-gray-700">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl lg:text-2xl font-bold text-white mb-1">Reporte Generado</h2>
                <p className="text-gray-400 text-xs lg:text-sm break-words">
                  Período: {new Date(report.time_range.start).toLocaleString()} - {new Date(report.time_range.end).toLocaleString()}
                </p>
                <p className="text-gray-400 text-xs lg:text-sm">
                  Duración: {report.time_range.duration_hours.toFixed(1)} horas
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={downloadPDF}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 lg:px-4 lg:py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm flex-1 sm:flex-initial"
                  title="Descargar como PDF"
                >
                  <Download size={16} className="w-4 h-4 lg:w-5 lg:h-5" />
                  PDF
                </button>
                <button
                  onClick={downloadReport}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 lg:px-4 lg:py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm flex-1 sm:flex-initial"
                  title="Descargar como Markdown"
                >
                  <Download size={16} className="w-4 h-4 lg:w-5 lg:h-5" />
                  MD
                </button>
              </div>
            </div>

            {/* Data Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-4 lg:mb-6">
              <div className="bg-gray-700 rounded-lg p-3 lg:p-4">
                <div className="text-gray-400 text-xs lg:text-sm mb-1">Lecturas</div>
                <div className="text-lg lg:text-2xl font-bold text-white">
                  {report.data_summary.total_readings}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3 lg:p-4">
                <div className="text-gray-400 text-xs lg:text-sm mb-1">Alertas</div>
                <div className="text-lg lg:text-2xl font-bold text-yellow-400">
                  {report.data_summary.alerts.total}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3 lg:p-4">
                <div className="text-gray-400 text-xs lg:text-sm mb-1 truncate">Temp. Prom.</div>
                <div className="text-lg lg:text-2xl font-bold text-orange-400">
                  {report.data_summary.temperature.avg}°C
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3 lg:p-4">
                <div className="text-gray-400 text-xs lg:text-sm mb-1 truncate">RPM Prom.</div>
                <div className="text-lg lg:text-2xl font-bold text-blue-400">
                  {report.data_summary.rpm.avg}
                </div>
              </div>
            </div>

            {/* Report Content */}
            <div className="bg-gray-900 rounded-lg p-3 lg:p-6 prose prose-invert max-w-none overflow-hidden">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-xl lg:text-3xl font-bold text-white mb-3 lg:mb-4 break-words" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-lg lg:text-2xl font-bold text-white mt-4 lg:mt-6 mb-2 lg:mb-3 break-words" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-base lg:text-xl font-bold text-blue-400 mt-3 lg:mt-4 mb-2 break-words" {...props} />,
                  p: ({ node, ...props }) => <p className="text-sm lg:text-base text-gray-300 mb-2 lg:mb-3 leading-relaxed break-words" {...props} />,
                  ul: ({ node, ...props }) => <ul className="text-sm lg:text-base text-gray-300 list-disc list-inside mb-2 lg:mb-3 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="text-sm lg:text-base text-gray-300 break-words" {...props} />,
                  strong: ({ node, ...props }) => <strong className="text-white font-semibold break-words" {...props} />,
                  hr: ({ node, ...props }) => <hr className="border-gray-700 my-4 lg:my-6" {...props} />,
                }}
              >
                {report.report}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
