import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Download,
  Filter,
  Clock,
  BarChart2,
  PlusCircle,
  RotateCcw,
  Plane,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { apiClient } from '../../api/client';
import { DelayRecord, DelayReasonCode, DelaySummaryStats, Flight } from '../../types';
import { useApp } from '../../context/AppContext';
import { SqlUsedPanel } from '../../components/common/SqlUsedPanel';
import { DelayStatusChangeModal } from '../../components/operations/DelayStatusChangeModal';
import { AIRPORTS } from '../../data/airportsData';

export const DelayLedgerAdmin: React.FC = () => {
  const { notify } = useApp();

  // Filters
  const [reasonFilter, setReasonFilter] = useState<DelayReasonCode | 'ALL'>('ALL');
  const [airportFilter, setAirportFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minMinutes, setMinMinutes] = useState<number>(0);

  // Data
  const [logs, setLogs] = useState<DelayRecord[]>([]);
  const [summary, setSummary] = useState<DelaySummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sqlUsed, setSqlUsed] = useState<string | undefined>(undefined);
  const [executionMs, setExecutionMs] = useState<number | undefined>(undefined);

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedFlightForModal, setSelectedFlightForModal] = useState<Flight | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, summaryRes] = await Promise.all([
        apiClient.searchDelayRecords({
          reason: reasonFilter,
          airport: airportFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          min_minutes: minMinutes > 0 ? minMinutes : undefined,
        }),
        apiClient.getDelaySummary({
          airport: airportFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
      ]);

      setLogs(recordsRes.delays || []);
      setSummary(summaryRes);
      setSqlUsed(recordsRes.sql_used);
      setExecutionMs(recordsRes.execution_ms);
    } catch (err: any) {
      notify(err.message || 'Failed to load delay records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reasonFilter, airportFilter, dateFrom, dateTo, minMinutes]);

  const handleExportCsv = () => {
    if (logs.length === 0) {
      notify('No delay records to export', 'error');
      return;
    }
    const headers = [
      'Log ID',
      'Flight Number',
      'Origin Hub',
      'Destination',
      'Delay Minutes',
      'Reason Code',
      'Logged Timestamp',
    ];
    const rows = logs.map((l) => [
      l.log_id,
      l.flight_number || '',
      l.origin_airport_id || '',
      l.destination_airport_id || '',
      l.delay_duration_minutes,
      l.reason_code,
      l.logged_at,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `skyledger_delay_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Exported delay ledger to CSV', 'success');
  };

  const resetFilters = () => {
    setReasonFilter('ALL');
    setAirportFilter('');
    setDateFrom('');
    setDateTo('');
    setMinMinutes(0);
  };

  // Prepare chart data from reason_breakdown
  const chartData = summary?.reason_breakdown.map((r) => ({
    name: r.reason_code,
    incidents: r.incident_count,
    minutes: r.total_minutes,
    avg: r.avg_minutes,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Live Delay Ledger & Incident Tracking
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Civil aviation delay governance system. Audits incident durations, root-cause categorization, and airspace lost time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B2E5C] hover:bg-blue-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Aggregate Impact KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] uppercase font-bold text-slate-500">Total Incidents</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1 tabular-nums">
            {summary?.total_incidents.toLocaleString() ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Logged in delay_ledger</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] uppercase font-bold text-slate-500">Total Lost Time</span>
          <div className="text-2xl font-black text-[#0B2E5C] font-mono mt-1 tabular-nums">
            {summary ? `${summary.total_delay_minutes.toLocaleString()}m` : '0m'}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            ≈ {summary ? (summary.total_delay_minutes / 60).toFixed(0) : 0} flight hours lost
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] uppercase font-bold text-slate-500">Average Delay</span>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1 tabular-nums">
            {summary?.avg_delay_minutes ?? 0} min
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Per delayed departure</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] uppercase font-bold text-slate-500">Most Impacted Hub</span>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">
            {summary?.most_impacted_hub || 'JFK'}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Highest accumulated delay</span>
        </div>
      </div>

      {/* Live Recharts Analytics Visualizer */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#0B2E5C]" />
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              Incident Breakdown by Root Cause (ENUM Categories)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            4 Regulatory ENUM Reasons
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
              <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                labelStyle={{ fontWeight: 'bold', color: '#93c5fd' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar yAxisId="left" dataKey="incidents" name="Incidents Count" fill="#0B2E5C" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="minutes" name="Total Minutes" fill="#F57C00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Reason Code filter strictly for the 4 enum values */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason Code ENUM
            </label>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white font-medium"
            >
              <option value="ALL">All 4 Reason Codes</option>
              <option value="Weather">Weather</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Air Traffic">Air Traffic</option>
              <option value="Crew Shortage">Crew Shortage</option>
            </select>
          </div>

          {/* Airport */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Airport / Hub
            </label>
            <select
              value={airportFilter}
              onChange={(e) => setAirportFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white truncate"
            >
              <option value="">All Airports</option>
              {AIRPORTS.map((a) => (
                <option key={a.airport_id} value={a.airport_id}>
                  {a.airport_id} - {a.city}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white"
            />
          </div>

          {/* Min Minutes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Min Duration
            </label>
            <select
              value={minMinutes}
              onChange={(e) => setMinMinutes(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white font-mono"
            >
              <option value={0}>All Durations (≥ 0m)</option>
              <option value={30}>≥ 30 mins</option>
              <option value={60}>≥ 60 mins (1 hr)</option>
              <option value={120}>≥ 120 mins (2 hrs)</option>
              <option value={180}>≥ 180 mins (3 hrs)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs text-slate-600 font-medium">
            Showing <strong className="font-mono text-slate-900">{logs.length}</strong> logged incidents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Flight</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4 text-center">Delay Duration</th>
                <th className="py-3 px-4">Reason Code</th>
                <th className="py-3 px-4">Logged Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 animate-spin text-[#0B2E5C]" />
                      <span>Loading delay ledger incidents...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No delay incidents recorded matching the current filter.
                  </td>
                </tr>
              )}

              {!loading &&
                logs.map((dl) => (
                  <tr key={dl.log_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-400">#{dl.log_id}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-[#0B2E5C]">
                      {dl.flight_number || `FL-${dl.flight_id}`}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-bold text-slate-800">{dl.origin_airport_id}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-mono font-bold text-slate-800">{dl.destination_airport_id}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                        +{dl.delay_duration_minutes} min
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          dl.reason_code === 'Weather'
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : dl.reason_code === 'Mechanical'
                            ? 'bg-rose-100 text-rose-900 border border-rose-200'
                            : dl.reason_code === 'Air Traffic'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-purple-100 text-purple-900 border border-purple-200'
                        }`}
                      >
                        {dl.reason_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {dl.logged_at}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SQL Used Panel */}
      <SqlUsedPanel
        sql={sqlUsed}
        executionMs={executionMs}
        rowCount={logs.length}
        title="Delay Ledger & Analytics SQL Query"
        defaultExpanded={false}
      />

      {/* Modal if user opens flight status change */}
      {selectedFlightForModal && (
        <DelayStatusChangeModal
          flight={selectedFlightForModal}
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedFlightForModal(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
