import React, { useEffect, useState } from 'react';
import {
  X,
  Plane,
  Clock,
  Users,
  AlertTriangle,
  Wrench,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import { FlightDetailEnriched } from '../../types';
import { apiClient } from '../../api/client';
import { RouteArc } from '../visuals/RouteArc';
import { SqlUsedPanel } from '../common/SqlUsedPanel';
import { DelayStatusChangeModal } from './DelayStatusChangeModal';

interface FlightDetailModalProps {
  flightId: number;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const FlightDetailModal: React.FC<FlightDetailModalProps> = ({
  flightId,
  isOpen,
  onClose,
  onStatusUpdated,
}) => {
  const [data, setData] = useState<FlightDetailEnriched | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getFlightDetail(flightId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load flight profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && flightId > 0) {
      fetchDetail();
    }
  }, [isOpen, flightId]);

  if (!isOpen) return null;

  const durationStr = () => {
    if (!data) return '';
    const dep = new Date(data.scheduled_departure).getTime();
    const arr = new Date(data.scheduled_arrival).getTime();
    if (isNaN(dep) || isNaN(arr)) return '2h 30m';
    const mins = Math.max(0, Math.floor((arr - dep) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B2E5C] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Plane className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  Flight #{data?.flight_number || `FL-${flightId}`}
                </h2>
                {data?.status && (
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      data.status === 'On-Time'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : data.status === 'Delayed'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                        : 'bg-red-500/20 text-red-300 border border-red-400/30'
                    }`}
                  >
                    {data.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-sky-200">
                {data ? `${data.origin_city} (${data.origin_airport_id}) → ${data.destination_city} (${data.destination_airport_id})` : 'Loading profile...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowStatusModal(true)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#F57C00] hover:bg-[#E65100] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Update Status</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-sky-200 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-[#0B2E5C] animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-500">Querying relational profile and delay ledger...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Route & Times Card */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Origin */}
                <div className="text-center md:text-left min-w-[120px]">
                  <span className="text-2xl font-black font-mono text-[#0B2E5C] tracking-tight">
                    {data.origin_airport_id}
                  </span>
                  <div className="text-xs font-bold text-slate-800">{data.origin_city}</div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{data.origin_name}</div>
                  <div className="text-xs font-mono font-semibold text-slate-700 mt-2">
                    {data.scheduled_departure}
                  </div>
                </div>

                {/* Route graphic */}
                <div className="flex-1 flex justify-center">
                  <RouteArc
                    originCode={data.origin_airport_id}
                    destCode={data.destination_airport_id}
                    duration={durationStr()}
                    status={data.status}
                    className="w-full max-w-[260px]"
                  />
                </div>

                {/* Destination */}
                <div className="text-center md:text-right min-w-[120px]">
                  <span className="text-2xl font-black font-mono text-emerald-800 tracking-tight">
                    {data.destination_airport_id}
                  </span>
                  <div className="text-xs font-bold text-slate-800">{data.destination_city}</div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{data.destination_name}</div>
                  <div className="text-xs font-mono font-semibold text-slate-700 mt-2">
                    {data.scheduled_arrival}
                  </div>
                </div>
              </div>

              {/* Grid: Aircraft & Airworthiness & Delay Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Aircraft Profile */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-[#0B2E5C]" />
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Assigned Aircraft & Maintenance
                      </h4>
                    </div>
                    {data.assigned_aircraft_id && data.airworthiness_status && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          data.airworthiness_status === 'Overdue'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : data.airworthiness_status === 'Upcoming'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {data.airworthiness_status}
                      </span>
                    )}
                  </div>

                  {data.assigned_aircraft_id ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Tail Number:</span>
                        <span className="font-mono font-bold text-slate-800">{data.assigned_aircraft_id}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Model:</span>
                        <span className="font-medium text-slate-800">{data.aircraft_details?.model || data.aircraft_model || 'Boeing 737'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Seating Capacity:</span>
                        <span className="font-mono text-slate-800">{data.aircraft_details?.capacity || data.aircraft_capacity || 180} seats</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Last Maintenance:</span>
                        <span className="font-mono text-slate-800">{data.aircraft_details?.last_maintenance_date || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Days Since Service:</span>
                        <span className={`font-mono font-bold ${data.days_since_maintenance && data.days_since_maintenance > 180 ? 'text-red-600' : 'text-slate-800'}`}>
                          {data.days_since_maintenance ?? 'N/A'} days
                        </span>
                      </div>

                      {data.days_since_maintenance && data.days_since_maintenance > 180 && (
                        <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-[11px] flex items-start gap-1.5">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                          <span>
                            <strong>Maintenance Overdue Warning:</strong> Elapsed days exceed the 180-day FAA airworthiness limit. Inspection logged in maintenance registry required.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs italic">
                      Aircraft: Unassigned
                    </div>
                  )}
                </div>

                {/* Delay Ledger History */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Delay Ledger Records
                      </h4>
                    </div>
                    {data.total_delay_minutes ? (
                      <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        +{data.total_delay_minutes} mins total
                      </span>
                    ) : null}
                  </div>

                  {data.delay_history && data.delay_history.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {data.delay_history.map((dl) => (
                        <div
                          key={dl.log_id}
                          className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-amber-900">{dl.reason_code}</span>
                            <span className="text-[10px] text-slate-500 block">Logged: {dl.logged_at}</span>
                          </div>
                          <span className="font-mono font-bold text-amber-800 bg-white px-2 py-1 rounded border border-amber-200">
                            +{dl.delay_duration_minutes} min
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No delay incidents recorded for this flight.
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Crew Section */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0B2E5C]" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Assigned Flight Crew
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {data.assigned_crew?.length || 0} crew members
                  </span>
                </div>

                {data.assigned_crew && data.assigned_crew.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {data.assigned_crew.map((cm) => (
                      <div
                        key={cm.assignment_id}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">{cm.full_name}</div>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block mt-1 ${
                              cm.role === 'Captain'
                                ? 'bg-sky-100 text-sky-800'
                                : cm.role === 'First Officer'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {cm.role}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                          <span>Duty:</span>
                          <span>{cm.duty_start_time.slice(11, 16)} - {cm.duty_end_time.slice(11, 16)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs italic">
                    No crew members currently assigned to this flight.
                  </div>
                )}
              </div>

              {/* SQL Panel */}
              <SqlUsedPanel
                sql={data.sql_used}
                executionMs={data.execution_ms}
                title="Relational Flight Profile Query"
                defaultExpanded={false}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Internal Flight ID: <span className="font-mono font-bold text-slate-700">#{flightId}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>

      {/* Transactional Status Change Modal */}
      {data && showStatusModal && (
        <DelayStatusChangeModal
          flight={data}
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          onSuccess={() => {
            fetchDetail();
            if (onStatusUpdated) onStatusUpdated();
          }}
        />
      )}
    </div>
  );
};
