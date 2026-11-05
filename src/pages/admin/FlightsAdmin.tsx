import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Flight, Aircraft, DelayReasonCode } from '../../types';
import { useApp } from '../../context/AppContext';
import { AIRPORTS } from '../../data/airportsData';
import { Plus, Edit2, Trash2, AlertTriangle, Check, Search, Filter, Plane } from 'lucide-react';

export const FlightsAdmin: React.FC = () => {
  const { notify } = useApp();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [formData, setFormData] = useState({
    flight_number: '',
    origin_airport_id: 'JFK',
    destination_airport_id: 'ORD',
    scheduled_departure: '2013-01-01 08:00:00',
    scheduled_arrival: '2013-01-01 10:30:00',
    status: 'On-Time' as Flight['status'],
    assigned_aircraft_id: '',
  });

  // Delay Logger Modal (when status set to Delayed)
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [delayFlightId, setDelayFlightId] = useState<number | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [delayReason, setDelayReason] = useState<DelayReasonCode>('Mechanical');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      apiClient.searchFlights({ limit: 100 }),
      apiClient.getAircraftList(),
    ]).then(([fRes, aRes]) => {
      if (fRes.data) setFlights(fRes.data);
      if (aRes.data) setAircraftList(aRes.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingFlight(null);
    setFormData({
      flight_number: `SK-${Math.floor(100 + Math.random() * 900)}`,
      origin_airport_id: 'JFK',
      destination_airport_id: 'ORD',
      scheduled_departure: '2013-01-01 08:00:00',
      scheduled_arrival: '2013-01-01 10:30:00',
      status: 'On-Time',
      assigned_aircraft_id: aircraftList[0]?.tail_number || '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (f: Flight) => {
    setEditingFlight(f);
    setFormData({
      flight_number: f.flight_number,
      origin_airport_id: f.origin_airport_id,
      destination_airport_id: f.destination_airport_id,
      scheduled_departure: f.scheduled_departure,
      scheduled_arrival: f.scheduled_arrival,
      status: f.status,
      assigned_aircraft_id: f.assigned_aircraft_id || '',
    });
    setModalOpen(true);
  };

  const handleSaveFlight = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.origin_airport_id === formData.destination_airport_id) {
      notify('Origin and Destination cannot be identical', 'error');
      return;
    }
    if (new Date(formData.scheduled_arrival) <= new Date(formData.scheduled_departure)) {
      notify('Scheduled arrival must be after scheduled departure', 'error');
      return;
    }

    if (editingFlight) {
      const res = await apiClient.updateFlight(editingFlight.flight_id, {
        status: formData.status,
        assigned_aircraft_id: formData.assigned_aircraft_id || null,
      });
      if (res.success) {
        notify('Flight updated successfully', 'success');
        setModalOpen(false);
        loadData();

        // If status changed to Delayed, trigger delay logger modal
        if (formData.status === 'Delayed' && editingFlight.status !== 'Delayed') {
          setDelayFlightId(editingFlight.flight_id);
          setDelayModalOpen(true);
        }
      } else {
        notify(res.error || 'Failed to update flight', 'error');
      }
    } else {
      const res = await apiClient.createFlight({
        ...formData,
        assigned_aircraft_id: formData.assigned_aircraft_id || null,
      });
      if (res.success) {
        notify('Flight created successfully', 'success');
        setModalOpen(false);
        loadData();
      } else {
        notify(res.error || 'Failed to create flight', 'error');
      }
    }
  };

  const handleDelete = async (flightId: number) => {
    if (window.confirm('Delete this flight from system? Cascading crew and delay records will be removed.')) {
      const res = await apiClient.deleteFlight(flightId);
      if (res.success) {
        notify('Flight deleted successfully', 'success');
        loadData();
      } else {
        notify(res.error || 'Delete failed', 'error');
      }
    }
  };

  const handleStatusChangeQuick = async (flightId: number, newStatus: Flight['status']) => {
    if (newStatus === 'Delayed') {
      setDelayFlightId(flightId);
      setDelayModalOpen(true);
      return;
    }

    const res = await apiClient.updateFlight(flightId, { status: newStatus });
    if (res.success) {
      notify(`Flight status updated to ${newStatus}`, 'success');
      loadData();
    }
  };

  const handleSaveDelayEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delayFlightId) return;

    const res = await apiClient.logDelay(delayFlightId, delayMinutes, delayReason);
    if (res.success) {
      notify(`Delay logged (${delayMinutes}m – ${delayReason})`, 'success');
      setDelayModalOpen(false);
      loadData();
    } else {
      notify(res.error || 'Failed to log delay', 'error');
    }
  };

  const filtered = flights.filter((f) => {
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
    if (
      searchTerm &&
      !f.flight_number.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !f.origin_airport_id.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !f.destination_airport_id.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {/* Top Header & Add Action */}
      <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0B2E5C]">Flights Operations Management</h2>
          <p className="text-xs text-slate-500">
            Full relational CRUD for flights, equipment tail assignments, and delay tracking.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#F57C00] hover:bg-orange-600 text-white rounded text-xs font-bold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Flight</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search by flight number, origin, dest..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="p-1.5 bg-slate-50 border border-slate-300 rounded font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="On-Time">On-Time</option>
            <option value="Delayed">Delayed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Flights Table */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0B2E5C] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Flight No</th>
                <th className="p-3">Route</th>
                <th className="p-3">Scheduled Departure</th>
                <th className="p-3">Scheduled Arrival</th>
                <th className="p-3">Assigned Aircraft</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Loading flights from database...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No flight records found.
                  </td>
                </tr>
              ) : (
                paginated.map((f) => (
                  <tr key={f.flight_id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-400 font-mono">{f.flight_id}</td>
                    <td className="p-3 font-bold text-[#0B2E5C] font-mono">{f.flight_number}</td>
                    <td className="p-3 font-semibold text-slate-800">
                      {f.origin_airport_id} ➔ {f.destination_airport_id}
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {f.scheduled_departure.slice(0, 16)}
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {f.scheduled_arrival.slice(0, 16)}
                    </td>
                    <td className="p-3 text-slate-700">
                      {f.assigned_aircraft_id ? (
                        <span className="font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {f.assigned_aircraft_id} ({f.aircraft_model || 'B737'})
                        </span>
                      ) : (
                        <span className="text-rose-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={f.status}
                        onChange={(e) => handleStatusChangeQuick(f.flight_id, e.target.value as any)}
                        className={`text-[11px] font-bold rounded px-2 py-1 border ${
                          f.status === 'On-Time'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : f.status === 'Delayed'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="On-Time">On-Time</option>
                        <option value="Delayed">Delayed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(f)}
                          className="p-1 hover:bg-slate-200 text-slate-600 rounded"
                          title="Edit Flight"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(f.flight_id)}
                          className="p-1 hover:bg-rose-100 text-rose-600 rounded"
                          title="Delete Flight"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} of {filtered.length} flights
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 font-bold text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Flight Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveFlight}
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border-2 border-[#0B2E5C] text-xs"
          >
            <h3 className="text-base font-bold text-[#0B2E5C] pb-2 border-b">
              {editingFlight ? 'Edit Flight Record' : 'Schedule New Commercial Flight'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Flight Number</label>
                <input
                  type="text"
                  required
                  value={formData.flight_number}
                  onChange={(e) => setFormData({ ...formData, flight_number: e.target.value.toUpperCase() })}
                  className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Aircraft</label>
                <select
                  value={formData.assigned_aircraft_id}
                  onChange={(e) => setFormData({ ...formData, assigned_aircraft_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded font-mono"
                >
                  <option value="">-- No Aircraft --</option>
                  {aircraftList.map((a) => (
                    <option key={a.tail_number} value={a.tail_number}>
                      {a.tail_number} ({a.model} - Cap {a.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Origin Airport (NYC Hub)</label>
                <select
                  value={formData.origin_airport_id}
                  onChange={(e) => setFormData({ ...formData, origin_airport_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded font-bold"
                >
                  <option value="JFK">JFK — John F. Kennedy</option>
                  <option value="LGA">LGA — LaGuardia</option>
                  <option value="EWR">EWR — Newark Liberty</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination Airport</label>
                <select
                  value={formData.destination_airport_id}
                  onChange={(e) => setFormData({ ...formData, destination_airport_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded font-bold"
                >
                  {AIRPORTS.map((a) => (
                    <option key={a.airport_id} value={a.airport_id}>
                      {a.airport_id} ({a.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Scheduled Departure</label>
                <input
                  type="text"
                  required
                  value={formData.scheduled_departure}
                  onChange={(e) => setFormData({ ...formData, scheduled_departure: e.target.value })}
                  placeholder="YYYY-MM-DD HH:MM:SS"
                  className="w-full p-2 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Scheduled Arrival</label>
                <input
                  type="text"
                  required
                  value={formData.scheduled_arrival}
                  onChange={(e) => setFormData({ ...formData, scheduled_arrival: e.target.value })}
                  placeholder="YYYY-MM-DD HH:MM:SS"
                  className="w-full p-2 border border-slate-300 rounded font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Operational Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded font-bold"
                >
                  <option value="On-Time">On-Time</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
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
                Save Flight
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delay Logger Modal (when status set to Delayed) */}
      {delayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDelayEntry}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border-2 border-amber-400 text-xs"
          >
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-extrabold text-base">Log Delay Incident into delay_ledger</h3>
            </div>
            <p className="text-slate-600">
              Flight status has been changed to <strong>Delayed</strong>. Mandatory audit entry required into <code>delay_ledger</code>.
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Delay Duration (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={600}
                required
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Reason Code (ENUM)
              </label>
              <select
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded font-bold"
              >
                <option value="Weather">Weather</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Air Traffic">Air Traffic</option>
                <option value="Crew Shortage">Crew Shortage</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setDelayModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold shadow"
              >
                Commit Delay to Ledger
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
