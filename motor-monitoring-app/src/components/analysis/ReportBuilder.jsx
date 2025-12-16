import { useState, useEffect, useMemo, useRef } from 'react';
import { useMQTT } from '../../context/MQTTContext';
import { Line } from 'react-chartjs-2';
import { Download, FileText, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Chart } from 'chart.js';

// Simple helper to download text as file
function download(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const metricList = [
  { key: 'temperatura', label: 'Temperatura (General)' },
  { key: 'rpm', label: 'RPM (General)' },
  { key: 'vibracion', label: 'Vibración (General)' },

  { key: 'A.voltaje', label: 'Voltaje - Fase A' },
  { key: 'A.corriente', label: 'Corriente - Fase A' },
  { key: 'A.potencia', label: 'Potencia - Fase A' },

  { key: 'B.voltaje', label: 'Voltaje - Fase B' },
  { key: 'C.voltaje', label: 'Voltaje - Fase C' },
];

const ReportBuilder = () => {
  const { phaseData, generalData, getHistory } = useMQTT();
  const [operator, setOperator] = useState('');
  const [jobType, setJobType] = useState('Inspección');
  const [selected, setSelected] = useState([]);
  const [template, setTemplate] = useState('detailed');
  const [previewHtml, setPreviewHtml] = useState('');
  const [seconds, setSeconds] = useState(300);
  const [templates, setTemplates] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const previewRef = useRef(null);

  const toggle = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  // Templates & saved reports persistence (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('report_templates');
      const list = raw ? JSON.parse(raw) : [];
      setTemplates(list);
    } catch (e) { setTemplates([]); }

    try {
      const rawR = localStorage.getItem('saved_reports');
      const listR = rawR ? JSON.parse(rawR) : [];
      setSavedReports(listR);
    } catch (e) { setSavedReports([]); }
  }, []);

  const saveTemplate = () => {
    const name = prompt('Nombre de la plantilla');
    if (!name) return;
    const t = { name, template, selected, jobType, operator, seconds, createdAt: Date.now() };
    const next = [t, ...templates];
    setTemplates(next);
    localStorage.setItem('report_templates', JSON.stringify(next));
    alert('Plantilla guardada');
  };

  const loadTemplate = (t) => {
    setTemplate(t.template || 'detailed');
    setSelected(t.selected || []);
    setJobType(t.jobType || 'Inspección');
    setOperator(t.operator || '');
    setSeconds(t.seconds || 300);
  };

  const deleteTemplate = (idx) => {
    const next = templates.slice();
    next.splice(idx, 1);
    setTemplates(next);
    localStorage.setItem('report_templates', JSON.stringify(next));
  };

  const saveReport = () => {
    if (!previewHtml) generateTextReport();
    const r = { id: Date.now(), operator, jobType, template, previewHtml: previewHtml || '', selected, seconds, createdAt: Date.now() };
    const next = [r, ...savedReports];
    setSavedReports(next);
    localStorage.setItem('saved_reports', JSON.stringify(next));
    alert('Informe guardado');
  };

  const deleteReport = (id) => {
    const next = savedReports.filter(r => r.id !== id);
    setSavedReports(next);
    localStorage.setItem('saved_reports', JSON.stringify(next));
  };

  const downloadSavedReport = (r) => {
    download(`report_${r.id}.html`, r.previewHtml || '', 'text/html');
  };

  const exportPdf = async () => {
    if (!previewHtml) await generateTextReport();
    
    try {
      // Crear un elemento temporal fuera de la vista con el contenido completo
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '1200px'; // Ancho fijo para mejor rendering
      tempDiv.style.padding = '0';
      tempDiv.style.margin = '0';
      tempDiv.innerHTML = previewHtml;
      document.body.appendChild(tempDiv);
      
      // Esperar a que todas las imágenes se carguen completamente
      const images = tempDiv.getElementsByTagName('img');
      const imagePromises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });
      
      await Promise.all(imagePromises);
      
      // Esperar un momento adicional para que se renderice todo
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#1a1a2e',
        allowTaint: true,
        foreignObjectRendering: false,
        imageTimeout: 0,
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight
      });
      
      // Eliminar el elemento temporal
      document.body.removeChild(tempDiv);
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      
      pdf.save(`informe_${jobType}_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF: ' + error.message);
    }
  };

  const getValue = (key) => {
    if (!key) return '';
    if (key.includes('.')) {
      const [phase, field] = key.split('.');
      return phaseData?.[phase]?.[field] ?? '';
    }
    return generalData?.[key] ?? '';
  };

  // Generar gráfica de métrica como imagen base64
  const generateChartImage = async (key) => {
    const hist = getHistory ? getHistory(key, seconds) : [];
    const label = metricList.find(m => m.key === key)?.label ?? key;
    
    let labels, data;
    if (hist.length > 0) {
      labels = hist.map(h => new Date(h.ts).toLocaleTimeString());
      data = hist.map(h => Number(h.value));
    } else {
      const val = Number(getValue(key) || 0);
      labels = Array.from({ length: 20 }, (_, i) => i+1);
      data = Array(20).fill(val);
    }

    // Crear canvas temporal
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // Crear gráfica temporal
    const tempChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label,
          data,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          borderWidth: 3,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { font: { size: 14, weight: 'bold' } }
          },
          title: {
            display: true,
            text: label,
            font: { size: 16, weight: 'bold' },
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.1)' },
            ticks: { 
              maxRotation: 45,
              minRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10
            }
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.1)' },
            beginAtZero: false
          }
        }
      }
    });

    // Esperar a que se renderice
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const imageUrl = canvas.toDataURL('image/png');
    tempChart.destroy();
    
    return imageUrl;
  };

  const generateTextReport = async () => {
    const date = new Date().toLocaleString('es-ES');
    
    // Generar imágenes de gráficas para cada métrica seleccionada
    const chartImages = {};
    for (const key of selected) {
      try {
        chartImages[key] = await generateChartImage(key);
      } catch (e) {
        console.error('Error generando gráfica para', key, e);
      }
    }
    
    let html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#1a1a2e; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:40px; border-radius:12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #667eea; padding-bottom: 20px;">
            <h1 style="color:#2b0b6b; margin:0; font-size: 32px; font-weight: 700;">📋 Informe de ${jobType}</h1>
            <p style="color:#666; margin:10px 0 0 0; font-size: 16px;">Sistema de Monitoreo de Motores - MotorWatch</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <div>
              <p style="margin:0; color:#888; font-size:12px; text-transform: uppercase;">Fecha y Hora</p>
              <p style="margin:5px 0 0 0; color:#2b0b6b; font-weight:600; font-size:16px;">${date}</p>
            </div>
            <div>
              <p style="margin:0; color:#888; font-size:12px; text-transform: uppercase;">Operario Responsable</p>
              <p style="margin:5px 0 0 0; color:#2b0b6b; font-weight:600; font-size:16px;">${operator || 'No especificado'}</p>
            </div>
            <div>
              <p style="margin:0; color:#888; font-size:12px; text-transform: uppercase;">Tipo de Trabajo</p>
              <p style="margin:5px 0 0 0; color:#2b0b6b; font-weight:600; font-size:16px;">${jobType}</p>
            </div>
            <div>
              <p style="margin:0; color:#888; font-size:12px; text-transform: uppercase;">Ventana de Análisis</p>
              <p style="margin:5px 0 0 0; color:#2b0b6b; font-weight:600; font-size:16px;">${seconds} segundos</p>
            </div>
          </div>
    `;

    if (template === 'detailed') {
      html += `
        <div style="margin-bottom: 30px;">
          <h2 style="color:#2b0b6b; font-size:24px; margin-bottom:20px; border-left: 4px solid #667eea; padding-left: 15px;">📊 Métricas Monitoreadas</h2>
          <table style="width:100%; border-collapse: collapse; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <thead>
              <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white;">
                <th style="text-align:left; padding:15px; font-size:14px; text-transform: uppercase; letter-spacing: 1px;">Métrica</th>
                <th style="text-align:center; padding:15px; font-size:14px; text-transform: uppercase; letter-spacing: 1px;">Valor Actual</th>
                <th style="text-align:center; padding:15px; font-size:14px; text-transform: uppercase; letter-spacing: 1px;">Estado</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      selected.forEach((key, idx) => {
        const label = metricList.find(m => m.key === key)?.label ?? key;
        const value = getValue(key);
        const bgColor = idx % 2 === 0 ? '#f8f9fa' : '#ffffff';
        const status = '✅ Normal'; // Podrías agregar lógica para determinar el estado
        
        html += `
          <tr style="background:${bgColor}; border-bottom: 1px solid #e0e0e0;">
            <td style="padding:15px; font-weight:500; color:#2b0b6b;">${label}</td>
            <td style="padding:15px; text-align:center; font-weight:700; color:#667eea; font-size:18px;">${value}</td>
            <td style="padding:15px; text-align:center;">${status}</td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
      
      // Agregar gráficas históricas de cada métrica
      if (selected.length > 0) {
        html += `
          <div style="margin-bottom: 30px;">
            <h2 style="color:#2b0b6b; font-size:24px; margin-bottom:20px; border-left: 4px solid #667eea; padding-left: 15px;">📈 Gráficas Históricas</h2>
            <p style="color:#666; margin-bottom:20px; line-height: 1.8;">Comportamiento de las métricas durante una ventana de <strong>${seconds} segundos</strong></p>
        `;
        
        selected.forEach((key, idx) => {
          const label = metricList.find(m => m.key === key)?.label ?? key;
          const chartImage = chartImages[key];
          
          if (chartImage) {
            html += `
              <div style="margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h3 style="color:#667eea; font-size:18px; margin:0 0 15px 0; font-weight:600;">${label}</h3>
                <img src="${chartImage}" style="width:100%; height:auto; border-radius: 6px; border: 2px solid #e0e0e0;" alt="Gráfica ${label}" />
              </div>
            `;
          }
        });
        
        html += `
          </div>
        `;
      }
      
    } else {
      html += `
        <div style="margin-bottom: 30px;">
          <h2 style="color:#2b0b6b; font-size:24px; margin-bottom:20px; border-left: 4px solid #667eea; padding-left: 15px;">📝 Resumen Ejecutivo</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
            <ul style="list-style: none; padding:0; margin:0;">
      `;
      
      selected.forEach(k => {
        const label = metricList.find(m => m.key === k)?.label ?? k;
        const value = getValue(k);
        html += `<li style="padding:10px 0; border-bottom: 1px solid #e0e0e0; color:#444;">▪️ <strong style="color:#2b0b6b;">${label}:</strong> <span style="color:#667eea; font-weight:600;">${value}</span></li>`;
      });
      
      html += `
            </ul>
          </div>
        </div>
      `;
      
      // Agregar gráficas también en modo brief
      if (selected.length > 0) {
        html += `
          <div style="margin-bottom: 30px;">
            <h2 style="color:#2b0b6b; font-size:24px; margin-bottom:20px; border-left: 4px solid #667eea; padding-left: 15px;">📊 Visualización de Datos</h2>
        `;
        
        selected.forEach(key => {
          const label = metricList.find(m => m.key === key)?.label ?? key;
          const chartImage = chartImages[key];
          
          if (chartImage) {
            html += `
              <div style="margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <h4 style="color:#667eea; font-size:16px; margin:0 0 10px 0;">${label}</h4>
                <img src="${chartImage}" style="width:100%; height:auto; border-radius: 6px;" alt="${label}" />
              </div>
            `;
          }
        });
        
        html += `
          </div>
        `;
      }
    }
    
    html += `
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center;">
            <p style="margin:0; color:#888; font-size:12px;">Generado automáticamente por <strong style="color:#667eea;">MotorWatch</strong></p>
            <p style="margin:5px 0 0 0; color:#aaa; font-size:11px;">Sistema de Monitoreo de Condición de Motores Eléctricos</p>
          </div>
        </div>
      </div>
    `;

    setPreviewHtml(html);
  };

  const exportCsv = () => {
    // Export merged CSV of historical series for selected metrics
    const seriesMap = {};
    const allTimestamps = new Set();
    selected.forEach(key => {
      const hist = getHistory ? getHistory(key, seconds) : [];
      seriesMap[key] = hist.map(h => ({ ts: h.ts, v: h.value }));
      hist.forEach(h => allTimestamps.add(h.ts));
    });

    const tsArr = Array.from(allTimestamps).sort((a,b) => a - b);
    const rows = [];
    const header = ['Timestamp'].concat(selected.map(k => metricList.find(m => m.key === k)?.label ?? k));
    rows.push(header);

    tsArr.forEach(ts => {
      const row = [new Date(ts).toISOString()];
      selected.forEach(k => {
        const el = (seriesMap[k] || []).find(s => s.ts === ts);
        row.push(el ? el.v : '');
      });
      rows.push(row);
    });

    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
    download('report_history.csv', csv, 'text/csv');
  };

  const exportHtml = () => {
    if (!previewHtml) generateTextReport();
    download('report.html', previewHtml, 'text/html');
  };

  const comparatorData = (k) => {
    // use history data for the metric
    const hist = getHistory ? getHistory(k, seconds) : [];
    const labels = hist.map(h => new Date(h.ts).toLocaleTimeString());
    const data = hist.map(h => Number(h.value));
    return {
      labels: labels.length ? labels : Array.from({ length: 20 }, (_, i) => i+1),
      datasets: [{ label: metricList.find(m => m.key === k)?.label ?? k, data: data.length ? data : Array(20).fill(Number(getValue(k) ?? 0)), borderColor: '#8b5cf6', tension: 0.2 }]
    };
  };

  return (
    <div className="p-4">
      <div className="glass-card p-4">
        <h3 className="text-lg font-bold text-white mb-3"><FileText className="inline mr-2" />Generador de Reportes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-gray-300">Operario</label>
            <input value={operator} onChange={e => setOperator(e.target.value)} className="w-full p-2 rounded mt-1 bg-purple-900 text-white" />
          </div>
          <div>
            <label className="text-sm text-gray-300">Tipo de trabajo</label>
            <select value={jobType} onChange={e => setJobType(e.target.value)} className="w-full p-2 rounded mt-1 bg-purple-900 text-white">
              <option>Inspección</option>
              <option>Mantenimiento</option>
              <option>Análisis</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-300">Plantilla</label>
            <select value={template} onChange={e => setTemplate(e.target.value)} className="w-full p-2 rounded mt-1 bg-purple-900 text-white">
              <option value="detailed">Detallada</option>
              <option value="brief">Breve</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <h4 className="text-white mb-2">Plantillas guardadas</h4>
            <div className="glass-card p-3" style={{ maxHeight: 180, overflow: 'auto' }}>
              {templates.length === 0 && <div className="text-gray-400">No hay plantillas guardadas.</div>}
              {templates.map((t, idx) => (
                <div key={t.createdAt} className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-200">{t.name} <span className="text-xs text-gray-400">({new Date(t.createdAt).toLocaleString()})</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => loadTemplate(t)} className="px-2 py-1 bg-purple-600 rounded text-white text-sm">Cargar</button>
                    <button onClick={() => deleteTemplate(idx)} className="px-2 py-1 bg-red-600 rounded text-white text-sm">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white mb-2">Informes guardados</h4>
            <div className="glass-card p-3" style={{ maxHeight: 180, overflow: 'auto' }}>
              {savedReports.length === 0 && <div className="text-gray-400">No hay informes guardados.</div>}
              {savedReports.map(r => (
                <div key={r.id} className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-200">{r.jobType} - {r.operator || '---'} <span className="text-xs text-gray-400">({new Date(r.createdAt).toLocaleString()})</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => downloadSavedReport(r)} className="px-2 py-1 bg-emerald-600 rounded text-white text-sm">Descargar</button>
                    <button onClick={() => deleteReport(r.id)} className="px-2 py-1 bg-red-600 rounded text-white text-sm">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <h4 className="text-sm text-gray-300 mb-2">Selecciona métricas</h4>
            <div className="grid grid-cols-2 gap-2">
              {metricList.map(m => (
                <label key={m.key} className="text-sm text-gray-200">
                  <input type="checkbox" checked={selected.includes(m.key)} onChange={() => toggle(m.key)} className="mr-2" /> {m.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm text-gray-300 mb-2">Comparar métricas (grafica)</h4>
            <div className="mb-2 flex items-center gap-2">
              <label className="text-sm text-gray-300">Ventana (s)</label>
              <select value={seconds} onChange={e => setSeconds(Number(e.target.value))} className="p-2 bg-purple-900 text-white rounded">
                <option value={60}>60</option>
                <option value={120}>120</option>
                <option value={300}>300</option>
                <option value={600}>600</option>
                <option value={1800}>1800</option>
              </select>
            </div>
            <MetricComparator phaseData={phaseData} generalData={generalData} metricList={metricList} seconds={seconds} getHistory={getHistory} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={generateTextReport} className="px-3 py-2 bg-purple-600 rounded text-white hover:bg-purple-700 transition-colors">
            <FileText className="inline w-4 h-4 mr-1" />Generar preview
          </button>
          <button onClick={exportPdf} className="px-3 py-2 bg-red-600 rounded text-white flex items-center gap-2 hover:bg-red-700 transition-colors">
            <FileDown className="w-4 h-4" />Exportar PDF
          </button>
          <button onClick={exportHtml} className="px-3 py-2 bg-purple-700 rounded text-white flex items-center gap-2 hover:bg-purple-800 transition-colors">
            <Download className="w-4 h-4" />Exportar HTML
          </button>
          <button onClick={exportCsv} className="px-3 py-2 bg-purple-700 rounded text-white hover:bg-purple-800 transition-colors">
            <Download className="inline w-4 h-4 mr-1" />Exportar CSV
          </button>
          <button onClick={() => saveTemplate()} className="px-3 py-2 bg-purple-800 rounded text-white hover:bg-purple-900 transition-colors">Guardar plantilla</button>
          <button onClick={() => saveReport()} className="px-3 py-2 bg-emerald-600 rounded text-white hover:bg-emerald-700 transition-colors">Guardar informe</button>
        </div>

      </div>

      <div className="mt-4">
        <h4 className="text-white mb-2 font-bold text-lg">📄 Vista Previa del Informe</h4>
        <div ref={previewRef} className="glass-card p-4" style={{ minHeight: 200, maxHeight: 600, overflow: 'auto' }} dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-gray-400 text-center py-10">📝 No hay preview disponible. Haz clic en "Generar preview" arriba.</p>' }} />
      </div>
    </div>
  );
};

const MetricComparator = ({ phaseData, generalData, metricList, seconds = 300, getHistory }) => {
  const [selectedMetrics, setSelectedMetrics] = useState([metricList[0].key, metricList[1].key]);

  const buildSeries = (k) => {
    if (!k) return { labels: [], data: [] };
    if (getHistory) {
      const h = getHistory(k, seconds) || [];
      if (h.length > 0) {
        return { labels: h.map(x => new Date(x.ts).toLocaleTimeString()), data: h.map(x => Number(x.value)) };
      }
    }
    // fallback to latest value repeated
    let val = 0;
    if (k.includes('.')) {
      const [phase, field] = k.split('.');
      val = phaseData?.[phase]?.[field] ?? 0;
    } else {
      val = generalData?.[k] ?? 0;
    }
    return { labels: Array.from({ length: 20 }, (_, i) => i+1), data: Array(20).fill(Number(val)) };
  };

  const toggleMetric = (key) => {
    setSelectedMetrics(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      }
      if (prev.length >= 4) return prev; // máximo 4 métricas
      return [...prev, key];
    });
  };

  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  
  const allLabels = selectedMetrics.length > 0 ? buildSeries(selectedMetrics[0]).labels : [];
  
  const data = {
    labels: allLabels,
    datasets: selectedMetrics.map((key, idx) => {
      const series = buildSeries(key);
      return {
        label: metricList.find(m => m.key === key)?.label || key,
        data: series.data,
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length] + '20',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        fill: false
      };
    })
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#fff',
          padding: 10,
          font: { size: 11 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.1)' },
        ticks: { 
          color: '#999',
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10
        }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.1)' },
        ticks: { color: '#999' }
      }
    }
  };

  return (
    <div>
      <div className="mb-3 p-2 bg-purple-900/30 rounded">
        <p className="text-xs text-gray-300 mb-2">Selecciona hasta 4 métricas para comparar:</p>
        <div className="flex flex-wrap gap-2">
          {metricList.slice(0, 8).map(m => (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedMetrics.includes(m.key)
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 280, background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
        {selectedMetrics.length > 0 ? (
          <Line data={data} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Selecciona al menos una métrica
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportBuilder;
