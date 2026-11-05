import React from 'react';
import { Plane, Shield, Database, Award, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resetDemoData } from '../../api/client';

export const Footer: React.FC = () => {
  const { setVivaGuideOpen, notify } = useApp();

  const handleReset = () => {
    if (window.confirm('Reset all bookings, delays, aircraft, and crew to original factory demo data?')) {
      resetDemoData();
      notify('Demo data has been reset to defaults', 'success');
      window.location.reload();
    }
  };

  return (
    <footer className="w-full bg-[#05172e] text-slate-400 text-xs mt-12 border-t-4 border-[#0B2E5C] select-none print:hidden">
      {/* Top Banner with Government & University Badges */}
      <div className="bg-[#082040] py-6 border-b border-slate-700/60">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Plane className="w-4 h-4 text-amber-400" />
              <span>SkyLedger Portal</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Official Flight Booking, Airspace Scheduling & Civil Operations Portal. Historical flight dataset (~10,000 flights, 2013).
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="text-white font-bold text-xs uppercase tracking-wider">
              DBMS Project Architecture
            </div>
            <ul className="space-y-1 text-[11px]">
              <li>• Course: University Database Management Systems</li>
              <li>• Relational Engine: MySQL 8.0 / MariaDB (XAMPP PDO)</li>
              <li>• Client: React + TypeScript + Tailwind CSS</li>
              <li>• Integrity: ACID Transactions & Seat Conflict Locking</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <div className="text-white font-bold text-xs uppercase tracking-wider">
              Academic Deliverables
            </div>
            <ul className="space-y-1 text-[11px]">
              <li>
                <button
                  onClick={() => setVivaGuideOpen(true)}
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>10-Step Viva Demo Click-Path</span>
                </button>
              </li>
              <li>• 12+ Relational Queries (JOIN, Window, Subqueries)</li>
              <li>• Interactive 9-Entity Relational ER Diagram</li>
              <li>• Great-Circle Deterministic Fare Engine (5% GST)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-white font-bold text-xs uppercase tracking-wider">
              System Operations
            </div>
            <button
              onClick={handleReset}
              className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded font-semibold text-[11px] transition-colors"
            >
              Reset to Factory Demo Data
            </button>
            <p className="text-[10px] text-slate-400">
              Clear local storage overrides & restore 2013-01-01 baseline state.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Copyright & Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Department of Civil Aviation & University DBMS Laboratory</span>
        </div>
        <div>
          Designed for academic demonstration & evaluation. All passenger data is simulated.
        </div>
      </div>
    </footer>
  );
};
