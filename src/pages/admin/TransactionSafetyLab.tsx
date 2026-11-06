import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  RotateCcw,
  Clock,
  Lock,
  Database,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Info,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Flight, CrewMember, TransactionStepLog, TransactionAssignResult } from '../../types';
import { useApp } from '../../context/AppContext';
import { SqlUsedPanel } from '../../components/common/SqlUsedPanel';

export const TransactionSafetyLab: React.FC = () => {
  const { notify } = useApp();

  // Selected flights for coordinators
  const [flights, setFlights] = useState<Flight[]>([]);
  const [captains, setCaptains] = useState<CrewMember[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  // Simulation Parameters
  const [flightAId, setFlightAId] = useState<number>(1);
  const [flightBId, setFlightBId] = useState<number>(2);
  const [selectedCaptainId, setSelectedCaptainId] = useState<number>(1);

  // Simulation State
  const [isRunning, setIsRunning] = useState(false);
  const [resultA, setResultA] = useState<TransactionAssignResult | null>(null);
  const [resultB, setResultB] = useState<TransactionAssignResult | null>(null);

  // Initialize data
  useEffect(() => {
    const init = async () => {
      setLoadingInit(true);
      try {
        const [fRes, cRes] = await Promise.all([
          apiClient.searchOperationsFlights({ page: 1, page_size: 10 }),
          apiClient.lookupCrewAvailability({ role: 'Captain' }),
        ]);

        if (fRes.flights.length >= 2) {
          setFlights(fRes.flights);
          setFlightAId(fRes.flights[0].flight_id);
          setFlightBId(fRes.flights[1].flight_id);
        }
        if (cRes.crew && cRes.crew.length > 0) {
          setCaptains(cRes.crew);
          setSelectedCaptainId(cRes.crew[0].crew_id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInit(false);
      }
    };
    init();
  }, []);

  // Run Race Simulation using Promise.all
  const handleRunRaceSimulation = async () => {
    setIsRunning(true);
    setResultA(null);
    setResultB(null);

    try {
      // Fire simultaneous requests
      const [resA, resB] = await Promise.all([
        apiClient.assignCrewTransactional(flightAId, selectedCaptainId, 'Coordinator Alpha (JFK)'),
        apiClient.assignCrewTransactional(flightBId, selectedCaptainId, 'Coordinator Beta (LGA)'),
      ]);

      setResultA(resA);
      setResultB(resB);

      if ((resA.success && !resB.success) || (!resA.success && resB.success)) {
        notify('ACID Race Condition Resolved: Exactly 1 Coordinator succeeded, 1 safely rolled back (409 Conflict).', 'success');
      } else if (resA.success && resB.success) {
        notify('Both assigned successfully (windows did not conflict).', 'info');
      } else {
        notify('Both coordinators encountered conflicting duty constraints.', 'info');
      }
    } catch (err: any) {
      notify(err.message || 'Simulation execution failed', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetSimulation = async () => {
    await apiClient.resetConcurrencyDemo();
    setResultA(null);
    setResultB(null);
    notify('Simulation state reset. Test assignments cleared.', 'info');
  };

  const selectedFlightA = flights.find((f) => f.flight_id === flightAId);
  const selectedFlightB = flights.find((f) => f.flight_id === flightBId);
  const targetCaptain = captains.find((c) => c.crew_id === selectedCaptainId);

  const labSql = `-- Concurrency Control & Row Locking Pattern
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;

-- Step 1: Exclusive Row Lock on Crew Member
SELECT crew_id, full_name, role 
FROM crew_members 
WHERE crew_id = ${selectedCaptainId} 
FOR UPDATE;

-- Step 2: Strict Overlap Conflict Verification under Lock
SELECT assignment_id, flight_id 
FROM crew_assignments 
WHERE crew_id = ${selectedCaptainId} 
  AND ((duty_start_time <= :end AND duty_end_time >= :start) OR ...) 
FOR UPDATE;

-- Step 3: Branch Decision
-- IF Conflict Found -> ROLLBACK (HTTP 409 Conflict)
-- ELSE -> INSERT INTO crew_assignments ... COMMIT (HTTP 200 OK)`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#0B2E5C]" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Transaction Safety & Concurrency Control Lab
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulates simultaneous race conditions between distributed dispatchers. Proves mathematical impossibility of double-booking under <code className="font-mono text-[#0B2E5C] font-bold">REPEATABLE READ</code> and <code className="font-mono text-[#0B2E5C] font-bold">SELECT ... FOR UPDATE</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo State</span>
          </button>
        </div>
      </div>

      {/* Target Captain & Race Setup Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0B2E5C]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-[11px] uppercase font-bold text-slate-500">
                Shared Contended Resource (Pilot in High Demand)
              </label>
              <select
                value={selectedCaptainId}
                onChange={(e) => setSelectedCaptainId(Number(e.target.value))}
                className="font-bold text-sm text-[#0B2E5C] bg-transparent border-b border-slate-300 focus:outline-none focus:border-[#0B2E5C] cursor-pointer"
              >
                {captains.map((c) => (
                  <option key={c.crew_id} value={c.crew_id}>
                    {c.full_name} ({c.role} — Base: {c.base_airport_id || 'NYC'}) [ID #{c.crew_id}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={isRunning || loadingInit}
            onClick={handleRunRaceSimulation}
            className="px-6 py-2.5 bg-[#F57C00] hover:bg-[#E65100] active:scale-98 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isRunning ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Simulating Race (Promise.all)...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Simulate Race Condition (Promise.all)</span>
              </>
            )}
          </button>
        </div>

        {/* Info Strip */}
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-sky-50/60 p-2.5 rounded-lg border border-sky-100">
          <Info className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            Both coordinators will simultaneously invoke <code>apiClient.assignCrewTransactional()</code> on <strong>{targetCaptain?.full_name || 'the selected Captain'}</strong> using <code>Promise.all</code>. Watch the row-level lock and transaction rollback unfold in real time.
          </span>
        </div>
      </div>

      {/* Split-Screen Simulation View (Coordinators A & B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Pane: Coordinator Alpha */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Pane Header */}
          <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Coordinator Alpha (JFK Hub Dispatch)
              </h2>
            </div>
            {resultA && (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  resultA.success
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                }`}
              >
                {resultA.success ? '200 OK (COMMITTED)' : '409 CONFLICT (ROLLED BACK)'}
              </span>
            )}
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            {/* Target Flight Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Requested Flight Assignment:
              </label>
              <select
                value={flightAId}
                onChange={(e) => setFlightAId(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
              >
                {flights.map((f) => (
                  <option key={f.flight_id} value={f.flight_id}>
                    Flight #{f.flight_number} ({f.origin_airport_id} → {f.destination_airport_id}) @ {f.scheduled_departure.slice(11, 16)}
                  </option>
                ))}
              </select>
              {selectedFlightA && (
                <div className="mt-1 text-[11px] text-slate-500 font-mono">
                  Duty Window: {selectedFlightA.scheduled_departure.slice(11, 16)} - {selectedFlightA.scheduled_arrival.slice(11, 16)}
                </div>
              )}
            </div>

            {/* Step-by-Step Transaction Logs */}
            <div className="bg-slate-950 rounded-lg p-3 text-[11px] font-mono text-slate-200 min-h-[220px] max-h-[300px] overflow-y-auto space-y-1.5 border border-slate-800">
              <div className="text-slate-500 pb-1 border-b border-slate-800 font-sans text-[10px] font-bold uppercase tracking-wider flex justify-between">
                <span>Transaction Step Logs</span>
                <span>Thread #1</span>
              </div>

              {!resultA && !isRunning && (
                <div className="py-12 text-center text-slate-600 italic">
                  Awaiting race condition trigger...
                </div>
              )}

              {isRunning && (
                <div className="py-12 text-center text-sky-400 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Locking row and evaluating schedule...</span>
                </div>
              )}

              {resultA &&
                resultA.logs.map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-1.5 rounded transition-all ${
                      step.status === 'COMMITTED'
                        ? 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-300'
                        : step.status === 'CONFLICT' || step.status === 'REST_VIOLATION'
                        ? 'bg-rose-950/70 border border-rose-800/60 text-rose-300'
                        : step.status === 'LOCK_ACQUIRED'
                        ? 'bg-amber-950/70 border border-amber-800/60 text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>STEP {step.step}</span>
                      <span className="font-bold">{step.status}</span>
                    </div>
                    <div className="text-sky-300 break-all">{step.query}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{step.notes}</div>
                  </div>
                ))}
            </div>

            {resultA && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  resultA.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {resultA.success ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Transaction committed. Assignment #{resultA.assignment_id} locked into database.</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{resultA.error}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Coordinator Beta */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Pane Header */}
          <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Coordinator Beta (LGA Hub Dispatch)
              </h2>
            </div>
            {resultB && (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  resultB.success
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                }`}
              >
                {resultB.success ? '200 OK (COMMITTED)' : '409 CONFLICT (ROLLED BACK)'}
              </span>
            )}
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            {/* Target Flight Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Requested Flight Assignment:
              </label>
              <select
                value={flightBId}
                onChange={(e) => setFlightBId(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
              >
                {flights.map((f) => (
                  <option key={f.flight_id} value={f.flight_id}>
                    Flight #{f.flight_number} ({f.origin_airport_id} → {f.destination_airport_id}) @ {f.scheduled_departure.slice(11, 16)}
                  </option>
                ))}
              </select>
              {selectedFlightB && (
                <div className="mt-1 text-[11px] text-slate-500 font-mono">
                  Duty Window: {selectedFlightB.scheduled_departure.slice(11, 16)} - {selectedFlightB.scheduled_arrival.slice(11, 16)}
                </div>
              )}
            </div>

            {/* Step-by-Step Transaction Logs */}
            <div className="bg-slate-950 rounded-lg p-3 text-[11px] font-mono text-slate-200 min-h-[220px] max-h-[300px] overflow-y-auto space-y-1.5 border border-slate-800">
              <div className="text-slate-500 pb-1 border-b border-slate-800 font-sans text-[10px] font-bold uppercase tracking-wider flex justify-between">
                <span>Transaction Step Logs</span>
                <span>Thread #2</span>
              </div>

              {!resultB && !isRunning && (
                <div className="py-12 text-center text-slate-600 italic">
                  Awaiting race condition trigger...
                </div>
              )}

              {isRunning && (
                <div className="py-12 text-center text-amber-400 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Locking row and evaluating schedule...</span>
                </div>
              )}

              {resultB &&
                resultB.logs.map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-1.5 rounded transition-all ${
                      step.status === 'COMMITTED'
                        ? 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-300'
                        : step.status === 'CONFLICT' || step.status === 'REST_VIOLATION'
                        ? 'bg-rose-950/70 border border-rose-800/60 text-rose-300'
                        : step.status === 'LOCK_ACQUIRED'
                        ? 'bg-amber-950/70 border border-amber-800/60 text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>STEP {step.step}</span>
                      <span className="font-bold">{step.status}</span>
                    </div>
                    <div className="text-sky-300 break-all">{step.query}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{step.notes}</div>
                  </div>
                ))}
            </div>

            {resultB && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  resultB.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {resultB.success ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Transaction committed. Assignment #{resultB.assignment_id} locked into database.</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{resultB.error}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Academic Viva DBMS Rationale Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[#0B2E5C]" />
          <h3 className="text-sm font-bold text-slate-900">
            University DBMS Project Evaluation: Concurrency Control Under ACID
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-800 block mb-1">1. REPEATABLE READ Isolation</strong>
            Ensures that any data read during the transaction remains identical on subsequent reads. In InnoDB/MariaDB, multi-version concurrency control (MVCC) + Next-Key locking prevents non-repeatable reads and phantom inserts.
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-800 block mb-1">2. SELECT ... FOR UPDATE (Row Locking)</strong>
            Acquires an exclusive write lock (X-Lock) on the target crew member row in <code>crew_members</code> and conflicting range in <code>crew_assignments</code>. Concurrent transactions are serialized and forced to wait.
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-800 block mb-1">3. Rollback & Serialization Anomaly</strong>
            When the second coordinator evaluates the locked table, the conflicting assignment committed by the first transaction is visible. The constraint check fails and triggers an atomic <code>ROLLBACK</code> with HTTP 409 Conflict.
          </div>
        </div>
      </div>

      {/* SQL Panel */}
      <SqlUsedPanel
        sql={labSql}
        executionMs={resultA?.execution_ms || resultB?.execution_ms || 8.4}
        title="ACID Row-Locking & Repeatable Read SQL Flow"
        defaultExpanded={true}
      />
    </div>
  );
};
