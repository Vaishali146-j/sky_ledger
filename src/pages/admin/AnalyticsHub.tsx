import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  Plane,
  Clock,
  Download,
  Database,
  Layers,
  Award,
  Calendar,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { apiClient } from '../../api/client';
import {
  RouteLeaderboardItem,
  AircraftUtilizationItem,
  WindowMonthlyItem,
  WindowDailyItem,
  WindowAirportItem,
  WindowCrewItem,
  ReportMeta,
} from '../../types';
import { useApp } from '../../context/AppContext';
import { SqlUsedPanel } from '../../components/common/SqlUsedPanel';

export const AnalyticsHub: React.FC = () => {
  const { notify } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'routes' | 'aircraft' | 'window'>('routes');

  // Sub-tab for Window Functions
  const [windowSubTab, setWindowSubTab] = useState<'monthly' | 'daily' | 'airport' | 'crew'>('monthly');

  // Data states
  const [routeReport, setRouteReport] = useState<ReportMeta | null>(null);
  const [aircraftReport, setAircraftReport] = useState<ReportMeta | null>(null);
  const [windowReport, setWindowReport] = useState<ReportMeta | null>(null);
  const [loading, setLoading] = useState(false);

  // Load Route Leaderboard
  const loadRouteReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.runReport('route_leaderboard');
      setRouteReport(res);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Aircraft Utilization
  const loadAircraftReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.runReport('aircraft_utilization');
      setAircraftReport(res);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Window Functions
  const loadWindowReport = async (sub: 'monthly' | 'daily' | 'airport' | 'crew') => {
    setLoading(true);
    try {
      const key = `window_${sub}`;
      const res = await apiClient.runReport(key);
      setWindowReport(res);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'routes') loadRouteReport();
    if (activeTab === 'aircraft') loadAircraftReport();
    if (activeTab === 'window') loadWindowReport(windowSubTab);
  }, [activeTab, windowSubTab]);

  // Export generic CSV
  const handleExportCsv = (title: string, headers: string[], rows: any[][]) => {
    if (rows.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `skyledger_${title}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(`Exported ${title} to CSV`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#0B2E5C]" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Business Intelligence & Analytics Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Advanced relational analytical reporting powered by MariaDB/MySQL 8 window functions (<code className="font-mono text-[#0B2E5C] font-semibold">DENSE_RANK()</code>, <code className="font-mono text-[#0B2E5C] font-semibold">SUM() OVER</code>, <code className="font-mono text-[#0B2E5C] font-semibold">AVG() OVER</code>, <code className="font-mono text-[#0B2E5C] font-semibold">PERCENT_RANK()</code>).
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('routes')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'routes'
                ? 'bg-white text-[#0B2E5C] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Route Leaderboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('aircraft')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'aircraft'
                ? 'bg-white text-[#0B2E5C] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fleet Airworthiness
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('window')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'window'
                ? 'bg-white text-[#0B2E5C] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Window Analytics
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 1: ROUTE DELAY LEADERBOARD */}
      {/* =================================================================== */}
      {activeTab === 'routes' && routeReport && (
        <div className="space-y-5">
          {/* Action strip */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-mono">
              Window Function: <strong className="text-slate-800">DENSE_RANK() OVER (ORDER BY Avg Delay DESC)</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                const data: RouteLeaderboardItem[] = routeReport.data || [];
                handleExportCsv(
                  'route_leaderboard',
                  ['Rank', 'Route', 'Destination City', 'Total Flights', 'Delayed Flights', 'Delay Pct', 'Avg Delay Mins'],
                  data.map((r) => [r.delay_rank, r.route, r.destination_city, r.total_flights, r.delayed_flights, `${r.delay_percentage}%`, r.avg_delay_minutes])
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2E5C] text-white rounded-lg text-xs font-bold shadow-xs transition-colors hover:bg-blue-900 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Top 10 Most Delayed NYC Routes (Average Minutes Delay)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(routeReport.data || []).slice(0, 10)}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="route" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#93c5fd' }}
                  />
                  <Bar dataKey="avg_delay_minutes" name="Avg Delay (Mins)" fill="#F57C00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-4 text-center">Rank</th>
                    <th className="py-2.5 px-4">Route</th>
                    <th className="py-2.5 px-4">Destination City</th>
                    <th className="py-2.5 px-4 text-center">Total Flights</th>
                    <th className="py-2.5 px-4 text-center">Delayed Flights</th>
                    <th className="py-2.5 px-4 text-center">Delay %</th>
                    <th className="py-2.5 px-4 text-right">Avg Delay Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {(routeReport.data || []).map((item: RouteLeaderboardItem, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-[#0B2E5C]">
                        #{item.delay_rank}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {item.route}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 font-medium">
                        {item.destination_city}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                        {item.total_flights}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-700">
                        {item.delayed_flights}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">
                        {item.delay_percentage}%
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {item.avg_delay_minutes} min
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <SqlUsedPanel
            sql={routeReport.sql}
            executionMs={routeReport.execution_ms}
            rowCount={routeReport.row_count}
            title="Route Leaderboard SQL (DENSE_RANK)"
            defaultExpanded={false}
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION 2: FLEET AIRCRAFT UTILIZATION & AIRWORTHINESS */}
      {/* =================================================================== */}
      {activeTab === 'aircraft' && aircraftReport && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-mono">
              Airworthiness Rule: <strong className="text-slate-800">&gt;180 Days Overdue, &gt;120 Days Upcoming</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                const data: AircraftUtilizationItem[] = aircraftReport.data || [];
                handleExportCsv(
                  'aircraft_utilization',
                  ['Tail Number', 'Model', 'Capacity', 'Last Maintenance', 'Days Since Service', 'Flights', 'Total Hours', 'Airworthiness Status'],
                  data.map((a) => [a.tail_number, a.model, a.capacity, a.last_maintenance_date, a.days_since_maintenance, a.total_flights, a.total_flight_hours, a.maintenance_status])
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2E5C] text-white rounded-lg text-xs font-bold shadow-xs transition-colors hover:bg-blue-900 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-4">Tail Number</th>
                    <th className="py-2.5 px-4">Model</th>
                    <th className="py-2.5 px-4 text-center">Capacity</th>
                    <th className="py-2.5 px-4 text-center">Flights Flown</th>
                    <th className="py-2.5 px-4 text-center">Flight Hours</th>
                    <th className="py-2.5 px-4">Last Maintenance</th>
                    <th className="py-2.5 px-4 text-right">Airworthiness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {(aircraftReport.data || []).map((ac: AircraftUtilizationItem) => (
                    <tr key={ac.tail_number} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#0B2E5C]">
                        {ac.tail_number}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">
                        {ac.model}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                        {ac.capacity}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700">
                        {ac.total_flights}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">
                        {ac.total_flight_hours} hrs
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {ac.last_maintenance_date} ({ac.days_since_maintenance}d ago)
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            ac.maintenance_status === 'Overdue'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : ac.maintenance_status === 'Upcoming'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {ac.maintenance_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <SqlUsedPanel
            sql={aircraftReport.sql}
            executionMs={aircraftReport.execution_ms}
            rowCount={aircraftReport.row_count}
            title="Aircraft Utilization & Maintenance Airworthiness Query"
            defaultExpanded={false}
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION 3: ADVANCED WINDOW FUNCTIONS */}
      {/* =================================================================== */}
      {activeTab === 'window' && windowReport && (
        <div className="space-y-5">
          {/* Sub-Tabs for the 4 window queries */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg shadow-xs">
              <button
                type="button"
                onClick={() => setWindowSubTab('monthly')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  windowSubTab === 'monthly'
                    ? 'bg-[#0B2E5C] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Monthly Cumulative Trend
              </button>
              <button
                type="button"
                onClick={() => setWindowSubTab('daily')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  windowSubTab === 'daily'
                    ? 'bg-[#0B2E5C] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. 7-Day Moving Average
              </button>
              <button
                type="button"
                onClick={() => setWindowSubTab('airport')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  windowSubTab === 'airport'
                    ? 'bg-[#0B2E5C] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Hub Running Totals
              </button>
              <button
                type="button"
                onClick={() => setWindowSubTab('crew')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  windowSubTab === 'crew'
                    ? 'bg-[#0B2E5C] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                4. Crew Percentile Rank
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const data = windowReport.data || [];
                handleExportCsv(`window_${windowSubTab}`, Object.keys(data[0] || {}), data.map((d) => Object.values(d)));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2E5C] text-white rounded-lg text-xs font-bold shadow-xs transition-colors hover:bg-blue-900 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Sub-tab 1: Monthly Cumulative Delay Trend Chart */}
          {windowSubTab === 'monthly' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Year-To-Date Cumulative Delay Progression vs 3-Month Moving Average
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={windowReport.data || []} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month_name" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                      labelStyle={{ fontWeight: 'bold', color: '#93c5fd' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Area type="monotone" dataKey="cumulative_delay_mins" name="Cumulative Total (Mins)" stroke="#0B2E5C" fill="#0B2E5C" fillOpacity={0.15} />
                    <Line type="monotone" dataKey="monthly_delay_mins" name="Monthly Delay (Mins)" stroke="#F57C00" strokeWidth={2} />
                    <Line type="monotone" dataKey="moving_avg_3m" name="3-Month Moving Avg" stroke="#10B981" strokeDasharray="4 4" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Daily 7-Day Centered Moving Average */}
          {windowSubTab === 'daily' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                January 2013 Daily Flight Departures & 7-Day Centered Moving Average
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={windowReport.data || []} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="flight_date" tick={{ fontSize: 10, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                      labelStyle={{ fontWeight: 'bold', color: '#93c5fd' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="daily_flights" name="Daily Flight Count" stroke="#94A3B8" strokeWidth={1} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="moving_avg_7day" name="7-Day Centered Moving Avg" stroke="#0B2E5C" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Window Dataset: <strong className="font-mono text-slate-900">{windowReport.title}</strong>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {windowReport.concept}
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0">
                    {Object.keys(windowReport.data?.[0] || {}).map((col) => (
                      <th key={col} className="py-2.5 px-4 font-mono">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(windowReport.data || []).map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      {Object.values(row).map((val: any, cIdx: number) => (
                        <td key={cIdx} className="py-2 px-4 text-slate-800">
                          {typeof val === 'number' ? val.toLocaleString() : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <SqlUsedPanel
            sql={windowReport.sql}
            executionMs={windowReport.execution_ms}
            rowCount={windowReport.row_count}
            title={`Window Query: ${windowReport.concept}`}
            defaultExpanded={false}
          />
        </div>
      )}
    </div>
  );
};
