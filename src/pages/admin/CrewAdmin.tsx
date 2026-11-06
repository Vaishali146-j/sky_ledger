import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Award,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  RotateCcw,
  BarChart2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import {
  CrewMember,
  CrewAvailabilityItem,
  CrewWorkloadItem,
  Flight,
  CrewAssignmentEnriched,
} from '../../types';
import { useApp } from '../../context/AppContext';
import { SqlUsedPanel } from '../../components/common/SqlUsedPanel';

export const CrewAdmin: React.FC = () => {
  const { notify } = useApp();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<'lookup' | 'matrix' | 'workload'>('lookup');

  // Tab 1: Member Lookup & Availability State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [baseFilter, setBaseFilter] = useState('');
  const [checkFlightId, setCheckFlightId] = useState<number | ''>('');
  const [lookupCrew, setLookupCrew] = useState<CrewAvailabilityItem[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSql, setLookupSql] = useState<{ sql?: string; ms?: number }>({});

  // Tab 2: Assignment Matrix & Roster State
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [rosterData, setRosterData] = useState<{
    flight_id: number;
    is_complete: boolean;
    captains: number;
    first_officers: number;
    cabin_crew: number;
    crew: CrewAssignmentEnriched[];
  } | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [standbyList, setStandbyList] = useState<CrewMember[]>([]);
  const [standbyLoading, setStandbyLoading] = useState(false);
  const [standbyRole, setStandbyRole] = useState<'Captain' | 'First Officer' | 'Cabin Crew'>('Captain');

  // Tab 3: Workload & Utilization State
  const [workloadRole, setWorkloadRole] = useState('');
  const [workloadData, setWorkloadData] = useState<CrewWorkloadItem[]>([]);
  const [maxHours, setMaxHours] = useState(1);
  const [workloadLoading, setWorkloadLoading] = useState(false);
  const [workloadSql, setWorkloadSql] = useState<{ sql?: string; ms?: number }>({});

  // -------------------------------------------------------------
  // TAB 1: LOOKUP
  // -------------------------------------------------------------
  const loadLookupData = async () => {
    setLookupLoading(true);
    try {
      const res = await apiClient.lookupCrewAvailability({
        q: searchQuery || undefined,
        role: roleFilter || undefined,
        base: baseFilter || undefined,
        flight_id: checkFlightId ? Number(checkFlightId) : undefined,
      });
      setLookupCrew(res.crew || []);
      setLookupSql({ sql: res.sql_used, ms: res.execution_ms });
    } catch (err: any) {
      notify(err.message || 'Lookup failed', 'error');
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'lookup') {
      loadLookupData();
    }
  }, [activeTab, roleFilter, baseFilter, checkFlightId]);

  const handleLookupSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLookupData();
  };

  // -------------------------------------------------------------
  // TAB 2: FLIGHT MATRIX & ROSTER
  // -------------------------------------------------------------
  const loadFlightsForMatrix = async () => {
    setMatrixLoading(true);
    try {
      const res = await apiClient.searchOperationsFlights({ page: 1, page_size: 20 });
      setFlights(res.flights);
      if (res.flights.length > 0 && !selectedFlight) {
        handleSelectFlight(res.flights[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMatrixLoading(false);
    }
  };

  const handleSelectFlight = async (fl: Flight) => {
    setSelectedFlight(fl);
    setStandbyList([]);
    try {
      const res = await apiClient.getFlightRoster(fl.flight_id);
      if (res.data) setRosterData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'matrix') {
      loadFlightsForMatrix();
    }
  }, [activeTab]);

  const handleSuggestStandby = async (role: 'Captain' | 'First Officer' | 'Cabin Crew') => {
    if (!selectedFlight) return;
    setStandbyRole(role);
    setStandbyLoading(true);
    try {
      const res = await apiClient.suggestStandbyCrew(selectedFlight.flight_id, role);
      if (res.success && res.data) {
        setStandbyList(res.data);
        notify(`Found ${res.data.length} conflict-free ${role}(s)`, 'info');
      } else {
        notify(res.error || 'Failed to find standby crew', 'error');
      }
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setStandbyLoading(false);
    }
  };

  const handleAssignCrew = async (crewId: number) => {
    if (!selectedFlight) return;
    try {
      const res = await apiClient.assignCrewTransactional(
        selectedFlight.flight_id,
        crewId,
        'Roster Coordinator'
      );
      if (res.success) {
        notify('Crew assigned successfully with transactional conflict check.', 'success');
        handleSelectFlight(selectedFlight);
        setStandbyList((prev) => prev.filter((c) => c.crew_id !== crewId));
      } else {
        notify(res.error || 'Conflict detected', 'error');
      }
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleUnassignCrew = async (assignmentId: number) => {
    if (!selectedFlight) return;
    try {
      const res = await apiClient.unassignCrew(assignmentId);
      if (res.success) {
        notify('Crew assignment removed.', 'info');
        handleSelectFlight(selectedFlight);
      }
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // -------------------------------------------------------------
  // TAB 3: WORKLOAD & UTILIZATION
  // -------------------------------------------------------------
  const loadWorkload = async () => {
    setWorkloadLoading(true);
    try {
      const res = await apiClient.getCrewWorkload(workloadRole || undefined);
      setWorkloadData(res.data || []);
      setMaxHours(res.max_hours || 1);
      setWorkloadSql({ sql: res.sql_used, ms: res.execution_ms });
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setWorkloadLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'workload') {
      loadWorkload();
    }
  }, [activeTab, workloadRole]);

  const handleExportWorkloadCsv = () => {
    if (workloadData.length === 0) return;
    const headers = [
      'Crew ID',
      'Full Name',
      'Role',
      'Base Hub',
      'Total Flights',
      'Total Duty Hours',
      'Relative Utilization %',
      'Last Duty Timestamp',
    ];
    const rows = workloadData.map((w) => [
      w.crew_id,
      w.full_name,
      w.role,
      w.base_airport_id || 'NYC Hub',
      w.total_flights,
      w.total_duty_hours,
      `${w.relative_utilization_pct}%`,
      w.last_duty_time || 'N/A',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `skyledger_crew_workload_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Exported crew workload to CSV', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0B2E5C]" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Crew Scheduling & Roster Management Portal
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Civil aviation flight personnel operations: availability evaluation, conflict checking, roster completeness, and relative workload telemetry.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg self-start md:self-auto border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('lookup')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'lookup'
                ? 'bg-white text-[#0B2E5C] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Personnel Lookup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-white text-[#0B2E5C] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Flight Roster Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workload')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'workload'
                ? 'bg-white text-[#0B2E5C] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Workload & Utilization
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: PERSONNEL LOOKUP & AVAILABILITY CHECKER */}
      {/* =================================================================== */}
      {activeTab === 'lookup' && (
        <div className="space-y-4">
          {/* Lookup Filter Bar */}
          <form
            onSubmit={handleLookupSearchSubmit}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3 text-xs"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Name or ID Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. John, Smith, or #45"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role Filter
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white font-medium"
              >
                <option value="">All Roles (Captains, F/O, Cabin)</option>
                <option value="Captain">Captains</option>
                <option value="First Officer">First Officers</option>
                <option value="Cabin Crew">Cabin Crew</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Home Base
              </label>
              <select
                value={baseFilter}
                onChange={(e) => setBaseFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white font-medium"
              >
                <option value="">All Base Airports</option>
                <option value="JFK">JFK — John F. Kennedy</option>
                <option value="LGA">LGA — LaGuardia</option>
                <option value="EWR">EWR — Newark Liberty</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Evaluate Against Flight Window
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Flight ID (e.g. 1)"
                  value={checkFlightId}
                  onChange={(e) => setCheckFlightId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#0B2E5C] text-white rounded-lg font-bold text-xs hover:bg-blue-900 transition-colors"
                >
                  Check
                </button>
              </div>
            </div>
          </form>

          {/* Results Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Found <strong className="font-mono text-slate-900">{lookupCrew.length}</strong> personnel matching criteria
              </span>
              {checkFlightId && (
                <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Testing against Flight #{checkFlightId} window
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-4">ID</th>
                    <th className="py-2.5 px-4">Full Legal Name</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Home Base</th>
                    <th className="py-2.5 px-4 text-center">Duty Shifts</th>
                    <th className="py-2.5 px-4 text-center">Total Flight Hours</th>
                    <th className="py-2.5 px-4 text-right">Availability Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lookupLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Loading crew availability...
                      </td>
                    </tr>
                  ) : lookupCrew.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No crew members match the specified query.
                      </td>
                    </tr>
                  ) : (
                    lookupCrew.map((c) => (
                      <tr key={c.crew_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-400">#{c.crew_id}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{c.full_name}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              c.role === 'Captain'
                                ? 'bg-sky-100 text-sky-900'
                                : c.role === 'First Officer'
                                ? 'bg-indigo-100 text-indigo-900'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {c.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-[#0B2E5C]">
                          {c.base_airport_id ? `${c.base_airport_id} (${c.base_city || 'NYC'})` : 'Standby Pool'}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">{c.total_assignments || 0}</td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">
                          {c.total_duty_hours || 0}h
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              c.availability_status === 'Available'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : c.availability_status === 'Busy'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                            title={c.conflict_details}
                          >
                            {c.availability_status === 'Available' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                            {c.availability_status === 'Busy' && <Clock className="w-3 h-3 text-amber-600" />}
                            {c.availability_status === 'Rest Violation' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                            <span>{c.conflict_details || c.availability_status}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <SqlUsedPanel
            sql={lookupSql.sql}
            executionMs={lookupSql.ms}
            rowCount={lookupCrew.length}
            title="Crew Availability Query"
            defaultExpanded={false}
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: FLIGHT ROSTER ASSIGNMENT MATRIX */}
      {/* =================================================================== */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Flight Selector (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs text-xs">
            <div className="bg-[#0B2E5C] text-white p-3 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Scheduled Flights</span>
              <span>Roster State</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
              {matrixLoading ? (
                <div className="p-6 text-center text-slate-400">Loading flights...</div>
              ) : (
                flights.map((f) => {
                  const isSelected = selectedFlight?.flight_id === f.flight_id;
                  return (
                    <div
                      key={f.flight_id}
                      onClick={() => handleSelectFlight(f)}
                      className={`p-3 cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-sky-50 border-l-4 border-[#0B2E5C]'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-[#0B2E5C] font-mono text-sm">
                          {f.flight_number}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {f.origin_airport_id} → {f.destination_airport_id} • {f.scheduled_departure.slice(11, 16)}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        #{f.flight_id}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Flight Crew Roster & Standby Selector (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedFlight && rosterData ? (
              <>
                {/* Completeness Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="text-base font-extrabold text-[#0B2E5C]">
                        Flight {selectedFlight.flight_number} Crew Roster
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedFlight.origin_city} ({selectedFlight.origin_airport_id}) →{' '}
                        {selectedFlight.destination_city} ({selectedFlight.destination_airport_id}) • {selectedFlight.scheduled_departure}
                      </div>
                    </div>

                    <div>
                      {rosterData.is_complete ? (
                        <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" />
                          <span>ROSTER COMPLETE</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 animate-pulse">
                          <ShieldAlert className="w-4 h-4" />
                          <span>UNDERSTAFFED</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quotas checklist */}
                  <div className="grid grid-cols-3 gap-3 text-xs text-center">
                    <div
                      className={`p-3 rounded-lg border ${
                        rosterData.captains >= 1
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="font-bold uppercase text-[10px]">Captain (Min 1)</div>
                      <div className="text-xl font-black font-mono mt-1">
                        {rosterData.captains} / 1
                      </div>
                      <div className="text-[10px] mt-0.5">
                        {rosterData.captains >= 1 ? '✓ Compliant' : '⚠ Required'}
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-lg border ${
                        rosterData.first_officers >= 1
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="font-bold uppercase text-[10px]">First Officer (Min 1)</div>
                      <div className="text-xl font-black font-mono mt-1">
                        {rosterData.first_officers} / 1
                      </div>
                      <div className="text-[10px] mt-0.5">
                        {rosterData.first_officers >= 1 ? '✓ Compliant' : '⚠ Required'}
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-lg border ${
                        rosterData.cabin_crew >= 3
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="font-bold uppercase text-[10px]">Cabin Crew (Min 3)</div>
                      <div className="text-xl font-black font-mono mt-1">
                        {rosterData.cabin_crew} / 3
                      </div>
                      <div className="text-[10px] mt-0.5">
                        {rosterData.cabin_crew >= 3 ? '✓ Compliant' : '⚠ Required'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assigned Crew List */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs text-xs">
                  <div className="bg-slate-50 p-3 font-bold text-slate-800 uppercase text-[10px] tracking-wider flex items-center justify-between border-b border-slate-200">
                    <span>Currently Assigned Crew ({rosterData.crew.length})</span>
                    <span className="font-mono text-slate-500">
                      Window: 1h before dep to 30m after arr
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#0B2E5C] text-white uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Role</th>
                          <th className="p-2.5">Base</th>
                          <th className="p-2.5">Duty Period</th>
                          <th className="p-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rosterData.crew.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              No crew assigned yet. Use Standby Suggestions below to assign eligible crew.
                            </td>
                          </tr>
                        ) : (
                          rosterData.crew.map((cm) => (
                            <tr key={cm.assignment_id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{cm.full_name}</td>
                              <td className="p-2.5 font-semibold text-[#0B2E5C]">{cm.role}</td>
                              <td className="p-2.5 font-mono text-slate-600">{cm.base_airport_id || 'NYC'}</td>
                              <td className="p-2.5 font-mono text-slate-500">
                                {cm.duty_start_time.slice(11, 16)} - {cm.duty_end_time.slice(11, 16)}
                              </td>
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleUnassignCrew(cm.assignment_id)}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Remove Assignment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Intelligent Standby Suggestion Box */}
                <div className="bg-white border-2 border-amber-300 rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <h3 className="font-bold text-sm">
                          Automated Conflict Checker & Standby Suggestions
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Intelligently queries personnel based at {selectedFlight.origin_airport_id} with zero schedule overlap and &ge;2-hour rest rule compliance.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => handleSuggestStandby('Captain')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          standbyRole === 'Captain'
                            ? 'bg-[#0B2E5C] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Find Captain
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSuggestStandby('First Officer')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          standbyRole === 'First Officer'
                            ? 'bg-[#0B2E5C] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Find F/O
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSuggestStandby('Cabin Crew')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          standbyRole === 'Cabin Crew'
                            ? 'bg-[#0B2E5C] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Find Cabin Crew
                      </button>
                    </div>
                  </div>

                  {standbyLoading ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Running conflict checking queries...
                    </div>
                  ) : standbyList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
                      {standbyList.map((c) => (
                        <div
                          key={c.crew_id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{c.full_name}</div>
                            <div className="text-[11px] text-slate-500">
                              Base: {c.base_airport_id || 'NYC Hub'} • Zero Overlap
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAssignCrew(c.crew_id)}
                            className="px-3 py-1 bg-[#F57C00] hover:bg-orange-600 text-white rounded-md font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Click one of the buttons above to query eligible standby personnel for this flight.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                Select a scheduled flight from the left list to view or assign crew.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: WORKLOAD & RELATIVE UTILIZATION VIEWER */}
      {/* =================================================================== */}
      {activeTab === 'workload' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Filter by Operational Role:</span>
              <select
                value={workloadRole}
                onChange={(e) => setWorkloadRole(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2E5C] bg-white font-medium"
              >
                <option value="">All Roles</option>
                <option value="Captain">Captains</option>
                <option value="First Officer">First Officers</option>
                <option value="Cabin Crew">Cabin Crew</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportWorkloadCsv}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B2E5C] hover:bg-blue-900 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Workload CSV</span>
            </button>
          </div>

          {/* Workload Table with Relative Bars */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Total Tracked Crew: <strong className="font-mono text-slate-900">{workloadData.length}</strong> personnel
              </span>
              <span className="text-slate-500 text-[11px] font-mono">
                Fleet Max: <strong>{maxHours} hrs</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-4">Crew Member</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Base</th>
                    <th className="py-2.5 px-4 text-center">Flights</th>
                    <th className="py-2.5 px-4 text-center">Duty Hours</th>
                    <th className="py-2.5 px-4">Relative Utilization</th>
                    <th className="py-2.5 px-4 text-right">Last Duty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workloadLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Calculating aggregated workload...
                      </td>
                    </tr>
                  ) : workloadData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No crew workload data available.
                      </td>
                    </tr>
                  ) : (
                    workloadData.map((w) => (
                      <tr key={w.crew_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          {w.full_name}
                          <span className="text-[10px] text-slate-400 font-mono block">#{w.crew_id}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              w.role === 'Captain'
                                ? 'bg-sky-100 text-sky-900'
                                : w.role === 'First Officer'
                                ? 'bg-indigo-100 text-indigo-900'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {w.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[#0B2E5C] font-semibold">
                          {w.base_airport_id || 'NYC Hub'}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700">
                          {w.total_flights}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">
                          {w.total_duty_hours} hrs
                        </td>
                        <td className="py-2.5 px-4 min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  w.relative_utilization_pct > 80
                                    ? 'bg-amber-500'
                                    : w.relative_utilization_pct > 50
                                    ? 'bg-[#0B2E5C]'
                                    : 'bg-sky-500'
                                }`}
                                style={{ width: `${Math.min(100, w.relative_utilization_pct)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono font-bold text-slate-600 w-12 text-right">
                              {w.relative_utilization_pct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                          {w.last_duty_time ? w.last_duty_time.slice(0, 16) : 'None'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <SqlUsedPanel
            sql={workloadSql.sql}
            executionMs={workloadSql.ms}
            rowCount={workloadData.length}
            title="Crew Workload Aggregate Query"
            defaultExpanded={false}
          />
        </div>
      )}
    </div>
  );
};
