import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { DelayRecord, DelayReasonCode } from '../../types';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, Plus, Download, Filter, Clock, BarChart } from 'lucide-react';

export const DelayLedgerAdmin: React.FC = () => {
  const { notify } = useApp();
  const [logs, setLogs] = useState<DelayRecord[]>([]);
  const [stats, setStats] = useState({
    total_delays: 0,
    avg_delay_minutes: 0,
    max_delay_minutes: 0,
    total_delay_minutes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [reasonFilter, setReasonFilter] = useState('ALL');

  const loadData = () => {
    setLoading(true);
    apiClient
      .getDelayLogs({
        reason: reasonFilter !== 'ALL' ? reasonFilter : undefined,
      })
      .then((res) => {
        if (res.data) setLogs(res.data);
        if (res.stats) setStats(res.stats);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [reasonFilter]);

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = ['Log ID', 'Flight Number', 'Origin', 'Destination', 'Delay Mins', 'Reason Code', 'Logged At'];
    const rows = logs.map((l) => [
      l.log_id,
      l.flight_number || '',
      l.origin_airport_id || '',
      l.destination_airport_id || '',
      l.delay_duration_minutes,
      l.reason_code,
      l.logged_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `skyledger_delay_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Exported delay ledger to CSV', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0B2E5C]">Civil Aviation Delay Ledger & Incident Registry</h2>
          <p className="text-xs text-slate-500">
            Mandatory operational incident logs from <code>delay_ledger</code> table categorized by reason code.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0B2E5C] hover:bg-blue-900 text-white rounded text-xs font-bold shadow transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Delay CSV</span>
        </button>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Delays</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">{stats.total_delays}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Avg Delay Duration</span>
          <div className="text-xl font-black text-amber-600 font-mono mt-1">
            {stats.avg_delay_minutes} min
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Max Single Delay</span>
          <div className="text-xl font-black text-rose-600 font-mono mt-1">
            {stats.max_delay_minutes} min
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Airspace Lost Time</span>
          <div className="text-xl font-black text-[#0B2E5C] font-mono mt-1">
            {stats.total_delay_minutes} min
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-700">Filter by Reason Code:</span>
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold"
          >
            <option value="ALL">All Reason Codes</option>
            <option value="Weather">Weather</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Air Traffic">Air Traffic</option>
            <option value="Crew Shortage">Crew Shortage</option>
          </select>
        </div>
        <span className="text-slate-400 text-[11px]">
          Showing {logs.length} logged incidents
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0B2E5C] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Log ID</th>
                <th className="p-3">Flight No</th>
                <th className="p-3">Route</th>
                <th className="p-3 text-center">Duration</th>
                <th className="p-3">Reason Code</th>
                <th className="p-3">Logged Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading delay ledger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No delay logs recorded under this category.
                  </td>
                </tr>
              ) : (
                logs.map((dl) => (
                  <tr key={dl.log_id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-400">#{dl.log_id}</td>
                    <td className="p-3 font-bold text-[#0B2E5C] font-mono">{dl.flight_number}</td>
                    <td className="p-3 font-semibold text-slate-800">
                      {dl.origin_airport_id} ➔ {dl.destination_airport_id}
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        +{dl.delay_duration_minutes} min
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                          dl.reason_code === 'Weather'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : dl.reason_code === 'Mechanical'
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : dl.reason_code === 'Air Traffic'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-purple-100 text-purple-900 border border-purple-300'
                        }`}
                      >
                        {dl.reason_code}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{dl.logged_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
