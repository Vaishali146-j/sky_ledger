import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { ActivityLog } from '../../types';
import { Shield, Clock, User, Terminal } from 'lucide-react';

export const ActivityLogAdmin: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getActivityLogs().then((res) => {
      if (res.data) setLogs(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0B2E5C]">System Operations Audit Trail</h2>
          <p className="text-xs text-slate-500">
            Immutable activity log for administrative actions, flight updates, maintenance overrides, and bookings.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0B2E5C] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Log ID</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">User / Operator</th>
                <th className="p-3">Details</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No activity logs recorded.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-400">#{log.log_id}</td>
                    <td className="p-3">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-[#0B2E5C] px-2 py-0.5 rounded border border-slate-200">
                        {log.action_type}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{log.performed_by}</td>
                    <td className="p-3 text-slate-700 font-sans">{log.details}</td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">{log.created_at}</td>
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
