import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { CrewMember } from '../../types';
import { useApp } from '../../context/AppContext';
import { AIRPORTS } from '../../data/airportsData';
import { Users, Plus, Filter, Shield, Clock, Award } from 'lucide-react';

export const CrewAdmin: React.FC = () => {
  const { notify } = useApp();
  const [crewList, setCrewList] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [baseFilter, setBaseFilter] = useState('ALL');

  const loadData = () => {
    setLoading(true);
    apiClient.getCrewList().then((res) => {
      if (res.data) setCrewList(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = crewList.filter((c) => {
    if (roleFilter !== 'ALL' && c.role !== roleFilter) return false;
    if (baseFilter !== 'ALL' && c.base_airport_id !== baseFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0B2E5C]">Flight Crew Personnel Registry</h2>
          <p className="text-xs text-slate-500">
            Certified flight operations personnel: Captains, First Officers, and Cabin Crew with base assignments.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold"
            >
              <option value="ALL">All Roles</option>
              <option value="Captain">Captains</option>
              <option value="First Officer">First Officers</option>
              <option value="Cabin Crew">Cabin Crew</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Base Hub:</span>
            <select
              value={baseFilter}
              onChange={(e) => setBaseFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold"
            >
              <option value="ALL">All Base Airports</option>
              <option value="JFK">JFK — New York</option>
              <option value="LGA">LGA — New York</option>
              <option value="EWR">EWR — Newark</option>
            </select>
          </div>
        </div>

        <div className="text-slate-500 font-mono text-[11px]">
          Total Registered: <strong>{filtered.length}</strong> personnel
        </div>
      </div>

      {/* Crew Table */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0B2E5C] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Crew ID</th>
                <th className="p-3">Full Legal Name</th>
                <th className="p-3">Operational Role</th>
                <th className="p-3">Home Base Airport</th>
                <th className="p-3 text-center">Duty Shifts</th>
                <th className="p-3 text-center">Total Flight Hours</th>
                <th className="p-3 text-right">Airspace Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading crew members...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No crew records match filters.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.crew_id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-400">#{c.crew_id}</td>
                    <td className="p-3 font-bold text-slate-900">{c.full_name}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                          c.role === 'Captain'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : c.role === 'First Officer'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {c.role}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-[#0B2E5C]">
                      {c.base_airport_id ? `${c.base_airport_id} (${c.base_city || 'NYC'})` : 'Standby Pool'}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-slate-800">
                      {c.total_assignments || 0}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-slate-800">
                      {c.total_duty_hours || 0} hrs
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Award className="w-3 h-3" />
                        <span>Active Duty</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
