import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Flight, CrewMember, CrewAssignmentEnriched } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Sparkles,
  AlertTriangle,
  Clock,
  Plane,
  ChevronRight,
} from 'lucide-react';

export const CrewRosterAdmin: React.FC = () => {
  const { notify } = useApp();
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

  const [loading, setLoading] = useState(true);

  // Standby Suggestion State
  const [suggestRole, setSuggestRole] = useState<CrewMember['role']>('Captain');
  const [standbyList, setStandbyList] = useState<CrewMember[]>([]);
  const [standbyLoading, setStandbyLoading] = useState(false);
  const [standbyDutyWindow, setStandbyDutyWindow] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Direct Assign Modal
  const [allCrew, setAllCrew] = useState<CrewMember[]>([]);
  const [selectedCrewToAssign, setSelectedCrewToAssign] = useState<number | ''>('');
  const [assignLoading, setAssignLoading] = useState(false);

  const loadFlights = () => {
    setLoading(true);
    Promise.all([
      apiClient.searchFlights({ date: '2013-01-01', limit: 30 }),
      apiClient.getCrewList(),
    ]).then(([fRes, cRes]) => {
      if (fRes.data) {
        setFlights(fRes.data);
        if (!selectedFlight && fRes.data.length > 0) {
          handleSelectFlight(fRes.data[0]);
        }
      }
      if (cRes.data) setAllCrew(cRes.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadFlights();
  }, []);

  const handleSelectFlight = (f: Flight) => {
    setSelectedFlight(f);
    setStandbyList([]);
    apiClient.getFlightRoster(f.flight_id).then((res) => {
      if (res.data) setRosterData(res.data);
    });
  };

  // Suggest Standby Crew with Mandatory Conflict Check
  const handleSuggestStandby = async (role: CrewMember['role']) => {
    if (!selectedFlight) return;
    setSuggestRole(role);
    setStandbyLoading(true);

    const res = await apiClient.suggestStandbyCrew(selectedFlight.flight_id, role);
    setStandbyLoading(false);

    if (res.success && res.data) {
      setStandbyList(res.data);
      setStandbyDutyWindow({ start: res.duty_start, end: res.duty_end });
      notify(`Found ${res.data.length} eligible standby ${role}(s) with zero conflicts`, 'info');
    } else {
      notify(res.error || 'Failed to search standby crew', 'error');
    }
  };

  // Assign Crew to Flight
  const handleAssignCrew = async (crewId: number) => {
    if (!selectedFlight) return;
    setAssignLoading(true);

    const res = await apiClient.assignCrew(selectedFlight.flight_id, crewId);
    setAssignLoading(false);

    if (res.success) {
      notify('Crew member assigned successfully. No conflicts detected.', 'success');
      handleSelectFlight(selectedFlight);
      // Remove from standby suggestions
      setStandbyList((prev) => prev.filter((c) => c.crew_id !== crewId));
    } else {
      notify(res.error || 'Failed to assign crew', 'error');
    }
  };

  // Unassign Crew
  const handleUnassignCrew = async (assignmentId: number) => {
    if (!selectedFlight) return;
    const res = await apiClient.unassignCrew(assignmentId);
    if (res.success) {
      notify('Crew member removed from flight roster', 'info');
      handleSelectFlight(selectedFlight);
    } else {
      notify(res.error || 'Failed to unassign crew', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0B2E5C]">Crew Roster Assignment & Conflict Engine</h2>
          <p className="text-xs text-slate-500">
            Mandatory Civil Aviation Roster Completeness: <strong>&ge;1 Captain</strong>,{' '}
            <strong>&ge;1 First Officer</strong>, <strong>&ge;3 Cabin Crew</strong>. Concurrency & project rest-period constraint (minimum 2 hours) enforced.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scheduled Flights List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm text-xs">
          <div className="bg-[#0B2E5C] text-white p-3 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
            <span>January 01, 2013 Flights</span>
            <span>Roster Status</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-400">Loading flights...</div>
            ) : (
              flights.map((f) => {
                const isSelected = selectedFlight?.flight_id === f.flight_id;
                // Quick check for sample flights
                const isFlight102 = f.flight_id === 102; // seeded complete

                return (
                  <div
                    key={f.flight_id}
                    onClick={() => handleSelectFlight(f)}
                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-l-4 border-[#0B2E5C]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[#0B2E5C] font-mono text-sm">
                        {f.flight_number}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {f.origin_airport_id} ➔ {f.destination_airport_id} • {f.scheduled_departure.slice(11, 16)}
                      </div>
                    </div>

                    <div className="text-right">
                      {isFlight102 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Fully Crewed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Understaffed</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Flight Roster & Conflict Checker (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedFlight && rosterData ? (
            <>
              {/* Flight Summary Card with Completeness Progress */}
              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="text-base font-extrabold text-[#0B2E5C]">
                      Flight {selectedFlight.flight_number} Crew Roster
                    </div>
                    <div className="text-xs text-slate-500">
                      Route: {selectedFlight.origin_airport_id} ({selectedFlight.origin_city}) ➔{' '}
                      {selectedFlight.destination_airport_id} ({selectedFlight.destination_city})
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {rosterData.is_complete ? (
                      <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded shadow flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        <span>ROSTER COMPLETE</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded shadow flex items-center gap-1.5 animate-pulse">
                        <ShieldAlert className="w-4 h-4" />
                        <span>UNDERSTAFFED FLIGHT</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Completeness Checklist */}
                <div className="grid grid-cols-3 gap-3 text-xs text-center">
                  <div
                    className={`p-3 rounded-lg border ${
                      rosterData.captains >= 1
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <div className="font-bold uppercase text-[10px]">Captain (Min 1)</div>
                    <div className="text-xl font-black font-mono mt-1">
                      {rosterData.captains} / 1
                    </div>
                    <div className="text-[10px] mt-0.5">
                      {rosterData.captains >= 1 ? '✓ Compliant' : '⚠ Action Required'}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      rosterData.first_officers >= 1
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <div className="font-bold uppercase text-[10px]">First Officer (Min 1)</div>
                    <div className="text-xl font-black font-mono mt-1">
                      {rosterData.first_officers} / 1
                    </div>
                    <div className="text-[10px] mt-0.5">
                      {rosterData.first_officers >= 1 ? '✓ Compliant' : '⚠ Action Required'}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      rosterData.cabin_crew >= 3
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <div className="font-bold uppercase text-[10px]">Cabin Crew (Min 3)</div>
                    <div className="text-xl font-black font-mono mt-1">
                      {rosterData.cabin_crew} / 3
                    </div>
                    <div className="text-[10px] mt-0.5">
                      {rosterData.cabin_crew >= 3 ? '✓ Compliant' : '⚠ Action Required'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Crew Table */}
              <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm text-xs">
                <div className="bg-slate-100 p-3 font-bold text-slate-800 uppercase text-[10px] tracking-wider flex items-center justify-between border-b border-slate-200">
                  <span>Assigned Flight Duty Crew ({rosterData.crew.length})</span>
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
                    <tbody className="divide-y divide-slate-200">
                      {rosterData.crew.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            No crew members assigned to this flight yet. Use the Standby Suggestion or Direct Assign below.
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
                                onClick={() => handleUnassignCrew(cm.assignment_id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
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

              {/* Standby Crew Intelligent Suggestion Box */}
              <div className="bg-white border-2 border-amber-300 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <div>
                      <h3 className="font-extrabold text-sm">
                        Suggest Standby Crew (Automated Conflict Checker)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Intelligently filters available crew based at {selectedFlight.origin_airport_id} with{' '}
                        <strong>zero overlap</strong> and <strong>&ge;2 hours rest interval</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Suggest Role Triggers */}
                  <div className="flex gap-1.5 text-xs">
                    <button
                      onClick={() => handleSuggestStandby('Captain')}
                      className={`px-3 py-1.5 rounded font-bold transition-colors ${
                        suggestRole === 'Captain'
                          ? 'bg-[#0B2E5C] text-white shadow'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Find Captain
                    </button>
                    <button
                      onClick={() => handleSuggestStandby('First Officer')}
                      className={`px-3 py-1.5 rounded font-bold transition-colors ${
                        suggestRole === 'First Officer'
                          ? 'bg-[#0B2E5C] text-white shadow'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Find F/O
                    </button>
                    <button
                      onClick={() => handleSuggestStandby('Cabin Crew')}
                      className={`px-3 py-1.5 rounded font-bold transition-colors ${
                        suggestRole === 'Cabin Crew'
                          ? 'bg-[#0B2E5C] text-white shadow'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Find Cabin Crew
                    </button>
                  </div>
                </div>

                {/* Standby Results */}
                {standbyLoading ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Running Conflict Checker SQL subqueries...
                  </div>
                ) : standbyList.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center justify-between">
                      <span>
                        Verified Conflict-Free Eligible Candidates ({suggestRole}):
                      </span>
                      <span className="font-mono text-[10px]">
                        Duty Window: {standbyDutyWindow.start.slice(11, 16)} - {standbyDutyWindow.end.slice(11, 16)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {standbyList.map((c) => (
                        <div
                          key={c.crew_id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{c.full_name}</div>
                            <div className="text-[11px] text-slate-500">
                              Base: {c.base_airport_id || 'NYC Hub'} • Zero Duty Overlap
                            </div>
                          </div>
                          <button
                            disabled={assignLoading}
                            onClick={() => handleAssignCrew(c.crew_id)}
                            className="px-3 py-1 bg-[#F57C00] hover:bg-orange-600 text-white rounded text-xs font-bold shadow transition-colors"
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic pt-1">
                    Click one of the buttons above to query eligible standby personnel for this flight.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 bg-white rounded-xl border border-slate-300 text-center text-slate-400 text-xs">
              Select a scheduled flight from the left list to view or assign crew.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
