import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Aircraft } from '../../types';
import { useApp } from '../../context/AppContext';
import { Wrench, Plus, CheckCircle2, AlertTriangle, Plane, Clock } from 'lucide-react';

export const AircraftAdmin: React.FC = () => {
  const { notify } = useApp();
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);

  // Add aircraft modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newTail, setNewTail] = useState('');
  const [newModel, setNewModel] = useState('Boeing 737-800');
  const [newCap, setNewCap] = useState(162);
  const [newMaintDate, setNewMaintDate] = useState('2012-12-01');

  const loadData = () => {
    setLoading(true);
    apiClient.getAircraftList().then((res) => {
      if (res.data) setAircraftList(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkServiced = async (tailNumber: string) => {
    const res = await apiClient.markAircraftServiced(tailNumber, '2013-01-01');
    if (res.success) {
      notify(`Aircraft ${tailNumber} marked as serviced on 2013-01-01`, 'success');
      loadData();
    } else {
      notify(res.error || 'Failed to update maintenance date', 'error');
    }
  };

  const handleAddAircraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTail.trim()) return;

    const res = await apiClient.addAircraft({
      tail_number: newTail.trim().toUpperCase(),
      model: newModel,
      capacity: newCap,
      last_maintenance_date: newMaintDate,
    });

    if (res.success) {
      notify(`Aircraft ${newTail.toUpperCase()} added to fleet`, 'success');
      setModalOpen(false);
      setNewTail('');
      loadData();
    } else {
      notify(res.error || 'Failed to add aircraft', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0B2E5C]">Commercial Fleet & Airworthiness Management</h2>
          <p className="text-xs text-slate-500">
            Monitor airworthiness cycles, flight hours utilization, and mandatory 180-day C-Check inspections.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#F57C00] hover:bg-orange-600 text-white rounded text-xs font-bold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register Aircraft</span>
        </button>
      </div>

      {/* Fleet Table */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0B2E5C] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Tail Number</th>
                <th className="p-3">Aircraft Model</th>
                <th className="p-3 text-center">Capacity</th>
                <th className="p-3">Last Maintenance Date</th>
                <th className="p-3 text-center">Days Since Service</th>
                <th className="p-3 text-center">Flight Count</th>
                <th className="p-3 text-center">Utilisation Hours</th>
                <th className="p-3 text-right">Airworthiness Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Loading aircraft fleet registry...
                  </td>
                </tr>
              ) : aircraftList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No aircraft found.
                  </td>
                </tr>
              ) : (
                aircraftList.map((ac) => {
                  const isDue = (ac.days_since_maintenance || 0) > 180;

                  return (
                    <tr
                      key={ac.tail_number}
                      className={`hover:bg-slate-50 transition-colors ${
                        isDue ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-[#0B2E5C]">
                        {ac.tail_number}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {ac.model}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-700">
                        {ac.capacity}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {ac.last_maintenance_date}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded font-mono font-bold text-[11px] ${
                            isDue
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {ac.days_since_maintenance} days
                          {isDue ? ' (DUE)' : ''}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-slate-800">
                        {ac.total_flights || 0}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-slate-800">
                        {ac.total_hours || 0} hrs
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleMarkServiced(ac.tail_number)}
                          className={`px-3 py-1 rounded text-[11px] font-bold shadow-sm transition-all ${
                            isDue
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          Mark Serviced Today
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Aircraft Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddAircraft}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border-2 border-[#0B2E5C] text-xs"
          >
            <h3 className="text-base font-bold text-[#0B2E5C] pb-2 border-b">
              Register New Aircraft to Fleet
            </h3>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tail Number (PK)</label>
              <input
                type="text"
                required
                value={newTail}
                onChange={(e) => setNewTail(e.target.value.toUpperCase())}
                placeholder="e.g. N104SK"
                className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Aircraft Model</label>
              <select
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded font-medium"
              >
                <option>Boeing 737-800</option>
                <option>Airbus A320-200</option>
                <option>Boeing 777-200ER</option>
                <option>Airbus A321-200</option>
                <option>Embraer E190</option>
                <option>Bombardier CRJ-700</option>
                <option>Boeing 757-200</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Passenger Capacity</label>
              <input
                type="number"
                min={20}
                max={500}
                required
                value={newCap}
                onChange={(e) => setNewCap(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Last Maintenance Date</label>
              <input
                type="date"
                required
                value={newMaintDate}
                onChange={(e) => setNewMaintDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0B2E5C] text-white rounded font-bold shadow hover:bg-blue-900"
              >
                Register Aircraft
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
