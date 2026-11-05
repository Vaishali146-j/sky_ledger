import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminDashboard } from './AdminDashboard';
import { FlightsAdmin } from './FlightsAdmin';
import { AircraftAdmin } from './AircraftAdmin';
import { CrewAdmin } from './CrewAdmin';
import { CrewRosterAdmin } from './CrewRosterAdmin';
import { DelayLedgerAdmin } from './DelayLedgerAdmin';
import { BookingsAdmin } from './BookingsAdmin';
import { ReportsAdmin } from './ReportsAdmin';
import { SqlShowcase } from './SqlShowcase';
import { ActivityLogAdmin } from './ActivityLogAdmin';
import { apiClient } from '../../api/client';
import {
  LayoutDashboard,
  Plane,
  Wrench,
  Users,
  CalendarDays,
  AlertTriangle,
  Ticket,
  FileSpreadsheet,
  Database,
  History,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export const AdminPortalPage: React.FC<{ initialSubTab?: string }> = ({ initialSubTab = 'dashboard' }) => {
  const { user, setUser, notify } = useApp();
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  const isAdmin = user && user.role === 'admin';

  const handleAdminQuickLogin = async () => {
    const res = await apiClient.login('admin@demo.com', 'admin123');
    if (res.success && res.user) {
      setUser(res.user);
      notify('Signed in as Operations Administrator (admin@demo.com)', 'success');
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { id: 'flights', label: 'Flights Management', icon: Plane },
    { id: 'aircraft', label: 'Aircraft & Maintenance', icon: Wrench },
    { id: 'crew', label: 'Crew Personnel', icon: Users },
    { id: 'roster', label: 'Crew Roster & Conflict Checker', icon: CalendarDays },
    { id: 'delays', label: 'Delay Ledger', icon: AlertTriangle },
    { id: 'bookings', label: 'Bookings & Manifest', icon: Ticket },
    { id: 'reports', label: 'DBMS Reports (SQL)', icon: FileSpreadsheet },
    { id: 'sql-showcase', label: 'SQL Showcase & ER Diagram', icon: Database },
    { id: 'audit', label: 'Activity Audit Log', icon: History },
  ];

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border-2 border-amber-300">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-[#0B2E5C]">
          Operations Admin Portal Access Restricted
        </h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          The Operations Management portal is reserved for certified civil aviation staff and flight controllers.
        </p>

        <div className="p-4 bg-slate-100 rounded-xl border border-slate-300 max-w-sm mx-auto text-xs space-y-3">
          <div className="font-bold text-slate-800">Evaluator / Demo Credentials:</div>
          <div className="font-mono text-slate-600">admin@demo.com / admin123</div>
          <button
            onClick={handleAdminQuickLogin}
            className="w-full py-2 bg-[#0B2E5C] hover:bg-blue-900 text-white font-bold rounded shadow transition-colors text-xs"
          >
            1-Click Login as Operations Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Sub-Navigation Strip */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-2 shadow-sm overflow-x-auto select-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#0B2E5C] text-white shadow'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Admin Sub-Page Body */}
      <div>
        {activeSubTab === 'dashboard' && <AdminDashboard />}
        {activeSubTab === 'flights' && <FlightsAdmin />}
        {activeSubTab === 'aircraft' && <AircraftAdmin />}
        {activeSubTab === 'crew' && <CrewAdmin />}
        {activeSubTab === 'roster' && <CrewRosterAdmin />}
        {activeSubTab === 'delays' && <DelayLedgerAdmin />}
        {activeSubTab === 'bookings' && <BookingsAdmin />}
        {activeSubTab === 'reports' && <ReportsAdmin />}
        {activeSubTab === 'sql-showcase' && <SqlShowcase />}
        {activeSubTab === 'audit' && <ActivityLogAdmin />}
      </div>
    </div>
  );
};
