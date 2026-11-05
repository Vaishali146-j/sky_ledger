import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { ReportMeta } from '../../types';
import { useApp } from '../../context/AppContext';
import { Database, Play, Download, Printer, Code2, Clock, CheckCircle } from 'lucide-react';

export const ReportsAdmin: React.FC = () => {
  const { notify } = useApp();
  const [reportsList, setReportsList] = useState<ReportMeta[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('delay_bottlenecks');
  const [activeReport, setActiveReport] = useState<ReportMeta | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    apiClient.getReportsList().then((list) => {
      setReportsList(list);
      executeReport(selectedKey);
    });
  }, []);

  const executeReport = async (key: string) => {
    setRunning(true);
    setSelectedKey(key);
    const res = await apiClient.runReport(key);
    setRunning(false);
    setActiveReport(res);
  };

  const handleExportCsv = () => {
    if (!activeReport || !activeReport.data || activeReport.data.length === 0) return;
    const data = activeReport.data;
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `skyledger_report_${selectedKey}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(`Exported "${activeReport.title}" to CSV`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0B2E5C]">DBMS Analytical Reports & SQL Queries</h2>
          <p className="text-xs text-slate-500">
            Advanced SQL queries showcasing JOINs, GROUP BY, HAVING, subqueries, LEFT JOINs, and window functions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={!activeReport?.data?.length}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2E5C] hover:bg-blue-900 text-white rounded text-xs font-bold shadow transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-bold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Reports Selection Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {reportsList.map((r) => {
          const isSelected = selectedKey === r.key;
          return (
            <button
              key={r.key}
              onClick={() => executeReport(r.key)}
              className={`p-3 rounded-lg text-left border transition-all ${
                isSelected
                  ? 'bg-[#0B2E5C] text-white border-[#0B2E5C] shadow-md scale-102'
                  : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-300'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                {r.concept}
              </div>
              <div className="text-xs font-bold mt-1 line-clamp-2 leading-tight">
                {r.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Report Execution Card & SQL Display */}
      {activeReport && (
        <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm space-y-4">
          <div className="p-5 border-b border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#F57C00] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  {activeReport.concept}
                </span>
                <h3 className="text-lg font-black text-[#0B2E5C] mt-1">{activeReport.title}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{activeReport.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Execution Time</div>
                  <div className="text-sm font-mono font-bold text-emerald-700">
                    {activeReport.execution_ms ?? 1.4} ms
                  </div>
                </div>
                <button
                  onClick={() => executeReport(selectedKey)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#F57C00] hover:bg-orange-600 text-white rounded text-xs font-bold shadow"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Re-Execute Query</span>
                </button>
              </div>
            </div>

            {/* SQL Code Block */}
            <div className="mt-3">
              <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] mb-1 font-bold">
                <Code2 className="w-3.5 h-3.5" />
                <span>SQL Query Executed (MySQL 8.0 Engine):</span>
              </div>
              <pre className="p-3 bg-[#0b1329] text-amber-300 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-slate-800 leading-relaxed shadow-inner">
                {activeReport.sql}
              </pre>
            </div>
          </div>

          {/* Result Table */}
          <div className="p-5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
              <span>
                Query Result Set (<strong>{activeReport.row_count || 0}</strong> rows returned)
              </span>
              <span className="text-emerald-700 font-semibold">
                ✓ Query Completed Successfully
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-lg text-xs">
              {running ? (
                <div className="p-8 text-center text-slate-400">Executing relational query...</div>
              ) : (!activeReport.data || activeReport.data.length === 0) ? (
                <div className="p-8 text-center text-slate-400">Query returned zero rows.</div>
              ) : (
                (() => {
                  const reportData = activeReport.data;
                  const firstRow = reportData[0] || {};
                  const headers = Object.keys(firstRow);
                  return (
                    <table className="w-full text-left">
                      <thead className="bg-[#0B2E5C] text-white uppercase text-[10px] tracking-wider font-mono">
                        <tr>
                          {headers.map((h) => (
                            <th key={h} className="p-2.5">
                              {h.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono">
                        {reportData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {headers.map((h) => (
                              <td key={h} className="p-2.5 text-slate-800">
                                {row[h] !== null && row[h] !== undefined ? String(row[h]) : 'NULL'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
