import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Clock,
  Plane,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import {
  Flight,
  FlightStatus,
  FlightOperationsSearchParams,
  StatusMatrixCounts,
} from '../types';
import { apiClient } from '../api/client';
import { AIRPORTS } from '../data/airportsData';
import { FlightDetailModal } from '../components/operations/FlightDetailModal';
import { SqlUsedPanel } from '../components/common/SqlUsedPanel';

export const FlightOperationsPage: React.FC = () => {
  // Search and filter state
  const [flightQuery, setFlightQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<FlightStatus | 'ALL'>('ALL');

  // Pagination & sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortField, setSortField] = useState('scheduled_departure');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');

  // Data state
  const [flights, setFlights] = useState<Flight[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<StatusMatrixCounts>({
    all: 0,
    onTime: 0,
    delayed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(false);
  const [sqlUsed, setSqlUsed] = useState<string | undefined>(undefined);
  const [executionMs, setExecutionMs] = useState<number | undefined>(undefined);

  // Modal state
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);

  // Debounce flight number input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(flightQuery);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [flightQuery]);

  // Airport autocomplete list
  const airportOptions = useMemo(() => {
    return AIRPORTS.map((a) => ({
      code: a.airport_id,
      label: `${a.city} (${a.airport_id}) - ${a.airport_name}`,
    }));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: FlightOperationsSearchParams = {
        q: debouncedQuery || undefined,
        origin: origin || undefined,
        destination: destination || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        status: statusFilter,
        sort: sortField,
        dir: sortDir,
        page,
        page_size: pageSize,
      };

      const res = await apiClient.searchOperationsFlights(params);
      setFlights(res.flights);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setStatusCounts(res.status_counts);
      setSqlUsed(res.sql_used);
      setExecutionMs(res.execution_ms);
    } catch (err) {
      console.error('Failed to load operations flights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [debouncedQuery, origin, destination, dateFrom, dateTo, statusFilter, sortField, sortDir, page, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDir('ASC');
    }
    setPage(1);
  };

  const resetFilters = () => {
    setFlightQuery('');
    setDebouncedQuery('');
    setOrigin('');
    setDestination('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('ALL');
    setSortField('scheduled_departure');
    setSortDir('ASC');
    setPage(1);
  };

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-[#0B2E5C]" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Flight Operations & Tactical Dispatch
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-criteria flight lookup with indexed server-side pagination, aircraft airworthiness check, and transactional status modification.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Status Badge Matrix Count Tiles (Quick Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* All Flights */}
        <button
          type="button"
          onClick={() => { setStatusFilter('ALL'); setPage(1); }}
          className={`p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-[#0B2E5C] text-white border-[#0B2E5C] shadow-md ring-2 ring-[#0B2E5C]/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'ALL' ? 'text-sky-200' : 'text-slate-500'}`}>
              All Active Filtered
            </span>
            <Plane className={`w-4 h-4 ${statusFilter === 'ALL' ? 'text-sky-300' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 text-2xl font-black font-mono tabular-nums">
            {statusCounts.all.toLocaleString()}
          </div>
          <span className={`text-[11px] block mt-0.5 ${statusFilter === 'ALL' ? 'text-sky-200' : 'text-slate-400'}`}>
            Matching base parameters
          </span>
        </button>

        {/* On-Time Flights */}
        <button
          type="button"
          onClick={() => { setStatusFilter('On-Time'); setPage(1); }}
          className={`p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
            statusFilter === 'On-Time'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'On-Time' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              On-Time
            </span>
            <CheckCircle className={`w-4 h-4 ${statusFilter === 'On-Time' ? 'text-emerald-200' : 'text-emerald-600'}`} />
          </div>
          <div className="mt-2 text-2xl font-black font-mono tabular-nums text-emerald-600 group-hover:text-emerald-700">
            <span className={statusFilter === 'On-Time' ? 'text-white' : 'text-emerald-600'}>
              {statusCounts.onTime.toLocaleString()}
            </span>
          </div>
          <span className={`text-[11px] block mt-0.5 ${statusFilter === 'On-Time' ? 'text-emerald-200' : 'text-slate-400'}`}>
            {statusCounts.all > 0 ? `${Math.round((statusCounts.onTime / statusCounts.all) * 100)}% of flights` : '0%'}
          </span>
        </button>

        {/* Delayed Flights */}
        <button
          type="button"
          onClick={() => { setStatusFilter('Delayed'); setPage(1); }}
          className={`p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
            statusFilter === 'Delayed'
              ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'Delayed' ? 'text-amber-100' : 'text-amber-700'}`}>
              Delayed
            </span>
            <AlertTriangle className={`w-4 h-4 ${statusFilter === 'Delayed' ? 'text-amber-200' : 'text-amber-600'}`} />
          </div>
          <div className="mt-2 text-2xl font-black font-mono tabular-nums">
            <span className={statusFilter === 'Delayed' ? 'text-white' : 'text-amber-600'}>
              {statusCounts.delayed.toLocaleString()}
            </span>
          </div>
          <span className={`text-[11px] block mt-0.5 ${statusFilter === 'Delayed' ? 'text-amber-200' : 'text-slate-400'}`}>
            Requires delay ledger review
          </span>
        </button>

        {/* Cancelled Flights */}
        <button
          type="button"
          onClick={() => { setStatusFilter('Cancelled'); setPage(1); }}
          className={`p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
            statusFilter === 'Cancelled'
              ? 'bg-red-700 text-white border-red-800 shadow-md ring-2 ring-red-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-red-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'Cancelled' ? 'text-red-100' : 'text-red-700'}`}>
              Cancelled
            </span>
            <XCircle className={`w-4 h-4 ${statusFilter === 'Cancelled' ? 'text-red-200' : 'text-red-600'}`} />
          </div>
          <div className="mt-2 text-2xl font-black font-mono tabular-nums">
            <span className={statusFilter === 'Cancelled' ? 'text-white' : 'text-red-600'}>
              {statusCounts.cancelled.toLocaleString()}
            </span>
          </div>
          <span className={`text-[11px] block mt-0.5 ${statusFilter === 'Cancelled' ? 'text-red-200' : 'text-slate-400'}`}>
            Ground stop / aircraft outage
          </span>
        </button>
      </div>

      {/* Global Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Flight Number Search */}
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Flight Number
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="e.g. DL123, UA456"
                value={flightQuery}
                onChange={(e) => setFlightQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white font-mono"
              />
            </div>
          </div>

          {/* Origin Airport */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Origin Hub
            </label>
            <select
              value={origin}
              onChange={(e) => { setOrigin(e.target.value); setPage(1); }}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white truncate"
            >
              <option value="">All Origins (JFK / LGA / EWR)</option>
              {airportOptions.filter((a) => ['JFK', 'LGA', 'EWR'].includes(a.code)).map((a) => (
                <option key={a.code} value={a.code}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Destination Airport */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Destination Airport
            </label>
            <select
              value={destination}
              onChange={(e) => { setDestination(e.target.value); setPage(1); }}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white truncate"
            >
              <option value="">All Destinations (102 Airports)</option>
              {airportOptions.map((a) => (
                <option key={a.code} value={a.code}>{a.label}</option>
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
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
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
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white"
            />
          </div>
        </div>
      </div>

      {/* Results Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="text-xs text-slate-600 font-medium">
            Showing <strong className="font-mono text-slate-900">{startIdx}</strong>–<strong className="font-mono text-slate-900">{endIdx}</strong> of <strong className="font-mono text-slate-900">{total.toLocaleString()}</strong> flights
            {statusFilter !== 'ALL' && (
              <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200 text-slate-800">
                Filter: {statusFilter}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white focus:outline-none"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Dense Responsive Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200 select-none">
                <th
                  onClick={() => handleSort('flight_number')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Flight</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('origin_airport_id')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Origin Hub</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('destination_airport_id')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Destination</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('scheduled_departure')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Departure</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">
                  Arrival
                </th>
                <th className="py-3 px-4">
                  Assigned Aircraft
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 animate-spin text-[#0B2E5C]" />
                      <span>Loading operations records...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && flights.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No flights found matching the specified operational parameters.
                  </td>
                </tr>
              )}

              {!loading &&
                flights.map((f) => {
                  return (
                    <tr
                      key={f.flight_id}
                      onClick={() => setSelectedFlightId(f.flight_id)}
                      className="hover:bg-sky-50/50 transition-colors cursor-pointer group"
                    >
                      {/* Flight Number */}
                      <td className="py-2.5 px-4 font-mono font-bold text-[#0B2E5C] whitespace-nowrap">
                        {f.flight_number}
                      </td>

                      {/* Origin */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800">{f.origin_airport_id}</span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[100px]">{f.origin_city}</span>
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800">{f.destination_airport_id}</span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[120px]">{f.destination_city}</span>
                        </div>
                      </td>

                      {/* Departure */}
                      <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {f.scheduled_departure.slice(0, 16)}
                      </td>

                      {/* Arrival */}
                      <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {f.scheduled_arrival.slice(0, 16)}
                      </td>

                      {/* Aircraft */}
                      <td className="py-2.5 px-4">
                        {f.assigned_aircraft_id ? (
                          <div className="font-mono text-slate-800">
                            <span>{f.assigned_aircraft_id}</span>
                            {f.aircraft_model && (
                              <span className="text-[10px] text-slate-500 block">{f.aircraft_model}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            f.status === 'On-Time'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : f.status === 'Delayed'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          {f.status === 'On-Time' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                          {f.status === 'Delayed' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          {f.status === 'Cancelled' && <XCircle className="w-3 h-3 text-red-600" />}
                          <span>{f.status}</span>
                        </span>
                        {f.status === 'Delayed' && f.delay_duration_minutes ? (
                          <span className="text-[10px] text-amber-700 block font-mono font-medium mt-0.5">
                            +{f.delay_duration_minutes}m ({f.delay_reason || 'Weather'})
                          </span>
                        ) : null}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFlightId(f.flight_id);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-[#0B2E5C] hover:text-white bg-slate-100 hover:bg-[#0B2E5C] rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profile</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="text-xs text-slate-500 font-mono">
            Page {page} of {totalPages}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Numeric page buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = page - 2 + i;
              if (pNum < 1) pNum = i + 1;
              if (pNum > totalPages) return null;
              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    pNum === page
                      ? 'bg-[#0B2E5C] text-white'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SQL Used Panel */}
      <SqlUsedPanel
        sql={sqlUsed}
        executionMs={executionMs}
        rowCount={flights.length}
        title="Flight Operations Server-Side Search Query"
        defaultExpanded={false}
      />

      {/* Detailed Flight Modal */}
      {selectedFlightId && (
        <FlightDetailModal
          flightId={selectedFlightId}
          isOpen={!!selectedFlightId}
          onClose={() => setSelectedFlightId(null)}
          onStatusUpdated={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
