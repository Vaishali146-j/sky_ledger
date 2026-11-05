import React from 'react';
import { useApp } from '../context/AppContext';
import { X, CheckCircle, ArrowRight, Database, Shield, Plane, AlertTriangle, Users, Award } from 'lucide-react';

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
      desc: 'Demonstrates deterministic fare calculation between NYC hubs (JFK/LGA/EWR) and 102 airports with 5% GST line item and interactive US route map.',
    },
    {
      num: 2,
      title: 'Search Results, +/-3 Days Price Calendar & Delay Risk',
      tab: 'results',
      concept: 'Complex Filtering, Sold-out Detection & Delay Prediction',
      desc: 'Shows filtering by departure slots, status, sorting, sold-out seat checks, and the SQL aggregate-based delay risk hint (Low/Medium/High).',
    },
    {
      num: 3,
      title: 'Booking Stepper & Top-Down Fuselage SVG Seat Map',
      tab: 'search',
      concept: 'ACID Transaction & Double-Booking Collision Prevention',
      desc: 'Walk through passenger form validation, top-down fuselage seat selection (Business 2-2 vs Economy 3-3), and simulated payment generating unique 6-character PNR.',
    },
    {
      num: 4,
      title: 'PNR Status & Printable E-Ticket / Boarding Pass',
      tab: 'pnr-status',
      concept: 'Single-Row Parameterised Query & Ticket Rendering',
      desc: 'Search PNR (e.g., SK789A) to view passenger manifest, seat allocations, live delay status, and the official printable boarding pass with barcode.',
    },
    {
      num: 5,
      title: 'Manage Bookings & Dynamic Tiered Refund Calculation',
      tab: 'manage-booking',
      concept: 'Business Logic for Ticket Cancellation (>24h=100%, <24h=50%)',
      desc: 'Login as user@demo.com, view past and upcoming bookings, and execute a cancellation that updates booking_status to Cancelled and frees allocated seats.',
    },
    {
      num: 6,
      title: 'Airport Departures/Arrivals Live Board',
      tab: 'airport-board',
      concept: 'Real-time Airport FIDS Display & Multi-Condition Filtering',
      desc: 'Select JFK, LGA, or EWR and toggle between departures and arrivals with status badges and delay duration alerts.',
    },
    {
      num: 7,
      title: 'Operations Dashboard & KPI Analytics (Recharts)',
      tab: 'admin-dashboard',
      concept: 'Aggregations (SUM, AVG, COUNT, GROUP BY)',
      desc: 'View KPI tiles (total flights, % delayed, % cancelled, revenue) and interactive charts for delay reasons, busiest hubs, and revenue trends.',
    },
    {
      num: 8,
      title: 'Aircraft Fleet & Maintenance Due Alert (>180 Days)',
      tab: 'admin-aircraft',
      concept: 'DATEDIFF Date Arithmetic & Overlap Prevention',
      desc: 'Inspect aircraft fleet, highlight tail numbers with maintenance > 180 days in red, click "Mark Serviced Today", and test flight assignment conflict prevention.',
    },
    {
      num: 9,
      title: 'Crew Scheduling, Conflict Checker & Standby Suggestion',
      tab: 'admin-crew-roster',
      concept: 'Concurrency, Overlap Checking & 2-Hour Mandatory Rest Rule',
      desc: 'Open Crew Roster. The conflict checker enforces: (a) zero overlap, and (b) minimum 2 hours rest. Test the "Suggest Standby Crew" intelligent helper.',
    },
    {
      num: 10,
      title: 'DBMS SQL Showcase & 9-Entity Relational ER Diagram',
      tab: 'admin-sql-showcase',
      concept: '12+ Core SQL Queries (JOIN, Window, HAVING, Subqueries)',
      desc: 'The master viva centerpiece: 12 pre-loaded queries with live execution times (ms), result tables, and the full interactive SVG ER Diagram of all 9 tables.',
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
              <h2 className="text-lg font-bold">SkyLedger DBMS Viva Demo Script</h2>
              <p className="text-xs text-blue-200">
                10-Step Interactive Click-Path covering all Database Syllabus Concepts
              </p>
            </div>
          </div>
          <button
            onClick={() => setVivaGuideOpen(false)}
            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
            <span>
              <strong>Tip for Viva:</strong> Use the <strong>"Jump to Step"</strong> button on each card to navigate directly to the relevant screen during your evaluation!
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
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{s.title}</span>
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {s.concept}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{s.desc}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onNavigateTab(s.tab);
                    setVivaGuideOpen(false);
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#F57C00] hover:bg-orange-600 text-white rounded text-xs font-bold shadow transition-colors"
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
            onClick={() => setVivaGuideOpen(false)}
            className="px-4 py-1.5 bg-slate-800 text-white font-semibold rounded hover:bg-slate-700"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
