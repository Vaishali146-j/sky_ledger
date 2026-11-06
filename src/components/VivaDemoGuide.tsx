import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  CheckCircle,
  ArrowRight,
  Database,
  Shield,
  Plane,
  AlertTriangle,
  Users,
  Award,
  Zap,
  TrendingUp,
  Clock,
  Layers,
} from 'lucide-react';

interface VivaDemoGuideProps {
  onNavigateTab: (tab: string) => void;
}

export const VivaDemoGuide: React.FC<VivaDemoGuideProps> = ({ onNavigateTab }) => {
  const { vivaGuideOpen, setVivaGuideOpen } = useApp();

  if (!vivaGuideOpen) return null;

  const steps = [
    {
      num: 1,
      title: 'Home & Great-Circle Route Search',
      tab: 'search',
      concept: 'Haversine Great-Circle Formula & Fare Breakdown (5% GST)',
      desc: 'Deterministic fare computation between NYC hubs (JFK/LGA/EWR) and 102 airports with distance calculation, class multipliers, and 5% GST line item.',
    },
    {
      num: 2,
      title: 'Search Results & +/-3 Days Dynamic Fare Calendar',
      tab: 'results',
      concept: 'Multi-Criteria Relational Filter & Delay Prediction Hints',
      desc: 'Shows filtering by departure slots, status, sorting, sold-out seat detection, and aggregate-based delay risk hint (Low/Medium/High).',
    },
    {
      num: 3,
      title: 'Booking Stepper & Top-Down Fuselage SVG Seat Map',
      tab: 'search',
      concept: 'ACID Transaction & Double-Booking Collision Prevention',
      desc: 'Top-down aircraft fuselage seat selection (Business 2-2 vs Economy 3-3) with real-time seat lock ensuring no duplicate seat can be booked simultaneously.',
    },
    {
      num: 4,
      title: 'PNR Status & Printable Boarding Pass',
      tab: 'pnr-status',
      concept: 'Single-Row Parameterised Query & Ticket Rendering',
      desc: 'Look up any 6-character PNR (e.g., SK789A) to view passenger manifest, seat allocations, live delay status, and the official printable boarding pass.',
    },
    {
      num: 5,
      title: 'Manage Bookings & Dynamic Tiered Refund Calculation',
      tab: 'manage-booking',
      concept: 'Business Logic for Ticket Cancellation (>24h=100%, <24h=50%)',
      desc: 'View passenger bookings, compute cancellation fee policies, and execute transactional status changes that release seats back into the available pool.',
    },
    {
      num: 6,
      title: 'Airport Departures/Arrivals Live Board (FIDS)',
      tab: 'airport-board',
      concept: 'Real-time Airport FIDS Display & Multi-Condition Filtering',
      desc: 'Flight Information Display System for JFK, LGA, and EWR with live status badges and delay duration alerts.',
    },
    {
      num: 7,
      title: 'Interactive Flight Operations & Search Dashboard',
      tab: 'operations',
      concept: 'Indexed Server-Side Search, Quick Filter Matrix & Modal Profile',
      desc: 'Global debounced search, autocomplete airport lookups, Status Badge Matrix count tiles (All/On-Time/Delayed/Cancelled), and full modal profile with RouteArc.',
    },
    {
      num: 8,
      title: 'Transactional Status Control & ACID Delay Logging',
      tab: 'operations',
      concept: 'Single Unit-of-Work: UPDATE flights + INSERT delay_ledger + INSERT activity_log',
      desc: 'Change flight status from On-Time to Delayed with mandatory reason code from ENUM and duration in minutes, all logged in a single database transaction.',
    },
    {
      num: 9,
      title: 'Live Delay Ledger & Incident Root-Cause Analytics',
      tab: 'admin-delays',
      concept: 'Strict 4-Reason ENUM Governance & Recharts Visualization',
      desc: 'Filters incidents strictly by the 4 valid ENUM codes (Weather, Mechanical, Air Traffic, Crew Shortage), showcasing total airspace lost minutes and most impacted hub.',
    },
    {
      num: 10,
      title: 'Crew Personnel Lookup & Real-Time Availability Engine',
      tab: 'admin-crew',
      concept: 'Complex Date-Window Evaluation & Duty Overlap Detection',
      desc: 'Search crew members by name or ID and evaluate availability against a target flight window. Shows clear badges: "Available" vs "Busy: flight XX123 hh:mm-hh:mm" or "Rest Violation".',
    },
    {
      num: 11,
      title: 'Flight Roster Assignment Matrix & Standby Suggestions',
      tab: 'admin-roster',
      concept: 'Roster Completeness (≥1 Captain, ≥1 F/O, ≥3 Cabin) & project rest-period constraint (minimum 2 hours)',
      desc: 'Roster completeness checklist for flights, intelligent conflict-free standby suggestions, and project rest-period constraint (minimum 2 hours) enforcement.',
    },
    {
      num: 12,
      title: 'Crew Workload & Relative Utilization Viewer',
      tab: 'admin-crew',
      concept: 'Aggregate Metrics (Duty Hours, Shifts) & Relative Utilization Bar',
      desc: 'Calculates accumulated duty flight hours per personnel, renders normalized relative utilization bars against fleet maximum, and supports CSV export.',
    },
    {
      num: 13,
      title: 'Transaction Safety Lab (ACID Concurrency Controls)',
      tab: 'admin-concurrency',
      concept: 'REPEATABLE READ, SELECT ... FOR UPDATE, Row Locks & Promise.all Race',
      desc: 'Split-screen coordinator simulation where Coordinator Alpha and Beta concurrently attempt to book the same Captain. Demonstrates row locking and atomic rollback.',
    },
    {
      num: 14,
      title: 'Business Intelligence & Window Functions Hub',
      tab: 'admin-analytics',
      concept: 'Advanced Window Functions: RANK(), SUM() OVER, AVG() OVER, PERCENT_RANK()',
      desc: 'Route delay leaderboard (RANK), fleet airworthiness grouped by model, hub cumulative delays, trailing 7-day rolling totals, and crew percentile ranks.',
    },
    {
      num: 15,
      title: 'DBMS SQL Showcase & 9-Entity Relational Schema',
      tab: 'admin-sql-showcase',
      concept: 'Complete Academic Schema, Foreign Keys & 12+ Relational Queries',
      desc: 'Comprehensive DBMS presentation: live query timing in milliseconds, raw SQL inspection, copy-to-clipboard, and interactive ER Diagram.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border-2 border-[#0B2E5C]">
        {/* Modal Header */}
        <div className="bg-[#0B2E5C] text-white p-4 flex items-center justify-between border-b-4 border-[#F57C00]">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold">SkyLedger DBMS Viva Demo Guide (15 Steps)</h2>
              <p className="text-xs text-blue-200">
                Complete Academic Evaluation Path Covering All Database & Systems Concepts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVivaGuideOpen(false)}
            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
            <span>
              <strong>Tip for Viva:</strong> Use the <strong>"Jump to Step"</strong> button on each card to navigate directly to the relevant screen during your university evaluation!
            </span>
            <span className="font-mono font-bold bg-amber-200 px-2 py-0.5 rounded text-[11px]">
              Demo Date: 2013-01-01
            </span>
          </div>

          <div className="space-y-3">
            {steps.map((s) => (
              <div
                key={s.num}
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-[#0B2E5C] transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#0B2E5C] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {s.num}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2">
                      <span>{s.title}</span>
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {s.concept}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{s.desc}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab(s.tab);
                    setVivaGuideOpen(false);
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#F57C00] hover:bg-orange-600 text-white rounded text-xs font-bold shadow transition-colors cursor-pointer"
                >
                  <span>Jump to Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Demo Credentials: admin@demo.com / admin123 | user@demo.com / user123</span>
          <button
            type="button"
            onClick={() => setVivaGuideOpen(false)}
            className="px-4 py-1.5 bg-slate-800 text-white font-semibold rounded hover:bg-slate-700 cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
