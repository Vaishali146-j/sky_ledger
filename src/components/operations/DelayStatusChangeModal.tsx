import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Flight, FlightStatus, DelayReasonCode } from '../../types';
import { apiClient } from '../../api/client';
import { SqlUsedPanel } from '../common/SqlUsedPanel';

interface DelayStatusChangeModalProps {
  flight: Flight;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REASON_CODES: Array<{ code: DelayReasonCode; label: string; description: string }> = [
  { code: 'Weather', label: 'Weather', description: 'Thunderstorms, winter freeze, low visibility' },
  { code: 'Mechanical', label: 'Mechanical', description: 'Avionics, engine inspection, hydraulics check' },
  { code: 'Air Traffic', label: 'Air Traffic', description: 'FAA ground stops, ATC en-route spacing hold' },
  { code: 'Crew Shortage', label: 'Crew Shortage', description: 'Duty hour limits, pilot sickness, standby call' },
];

export const DelayStatusChangeModal: React.FC<DelayStatusChangeModalProps> = ({
  flight,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [newStatus, setNewStatus] = useState<FlightStatus>(flight.status);
  const [reasonCode, setReasonCode] = useState<DelayReasonCode>('Weather');
  const [delayMinutes, setDelayMinutes] = useState<number>(flight.delay_duration_minutes || 45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSql, setLastSql] = useState<{ sql?: string; ms?: number } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (newStatus === 'Delayed' && (!delayMinutes || delayMinutes <= 0)) {
        throw new Error('Please enter a valid delay duration in minutes (greater than 0).');
      }

      const res = await apiClient.changeFlightStatus(
        flight.flight_id,
        newStatus,
        newStatus === 'Delayed' ? reasonCode : undefined,
        newStatus === 'Delayed' ? Number(delayMinutes) : undefined
      );

      if (!res.success) {
        throw new Error(res.message || 'Failed to update flight status');
      }

      setLastSql({ sql: res.sql_used, ms: res.execution_ms });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0B2E5C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold tracking-tight">Transactional Status Control</h3>
              <p className="text-xs text-sky-200">
                Flight #{flight.flight_number} ({flight.origin_airport_id} → {flight.destination_airport_id})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-sky-200 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* New Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Operational Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['On-Time', 'Delayed', 'Cancelled'] as FlightStatus[]).map((st) => {
                const isSelected = newStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setNewStatus(st)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                      isSelected
                        ? st === 'On-Time'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : st === 'Delayed'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Delay Details */}
          {newStatus === 'Delayed' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Mandatory Delay Ledger Entry (ACID Logged)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delay Reason Code <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {REASON_CODES.map((r) => (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => setReasonCode(r.code)}
                      className={`p-2.5 text-left rounded-md border text-xs transition-colors cursor-pointer ${
                        reasonCode === r.code
                          ? 'bg-white border-amber-500 text-slate-900 ring-1 ring-amber-500 shadow-xs'
                          : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <span className="font-bold block text-slate-800">{r.label}</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">{r.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delay Duration (Minutes) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
                    required
                    className="w-32 px-3 py-1.5 border border-slate-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  <span className="text-xs text-slate-600 font-medium">minutes</span>
                  <span className="text-[11px] text-slate-500 ml-auto tabular-nums">
                    ≈ {(delayMinutes / 60).toFixed(1)} hrs
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ACID Safety Note */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200 font-mono">
            Transaction Boundary: <code>UPDATE flights</code> + <code>INSERT delay_ledger</code> + <code>INSERT activity_log</code> committed under single unit of work.
          </div>

          {/* SQL Panel if executed */}
          {lastSql && (
            <SqlUsedPanel
              sql={lastSql.sql}
              executionMs={lastSql.ms}
              title="Transaction Commited"
              defaultExpanded={true}
            />
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-[#F57C00] hover:bg-[#E65100] active:scale-98 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              {loading ? (
                <>Updating...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Execute Transaction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
