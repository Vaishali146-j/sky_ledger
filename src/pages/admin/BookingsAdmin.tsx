import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Booking, Flight } from '../../types';
import { useApp } from '../../context/AppContext';
import { Search, Printer, XCircle, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const BookingsAdmin: React.FC = () => {
  const { notify } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [pnrFilter, setPnrFilter] = useState('');

  // Flight Manifest Modal
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [manifestFlight, setManifestFlight] = useState<Flight | null>(null);
  const [manifestPassengers, setManifestPassengers] = useState<any[]>([]);
  const [manifestLoading, setManifestLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      apiClient.getUserBookings(),
      apiClient.searchFlights({ limit: 50 }),
    ]).then(([bRes, fRes]) => {
      if (bRes.data) setBookings(bRes.data);
      if (fRes.data) setFlights(fRes.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenManifest = async (flightId: number) => {
    setManifestLoading(true);
    setManifestModalOpen(true);
    const res = await apiClient.getFlightManifest(flightId);
    setManifestLoading(false);

    if (res.success && res.flight && res.manifest) {
      setManifestFlight(res.flight);
      setManifestPassengers(res.manifest);
    } else {
      notify('Failed to load passenger manifest', 'error');
    }
  };

  const handleCancelBooking = async (pnr: string) => {
    if (window.confirm(`Cancel reservation for PNR ${pnr}? Allocated seats will be freed immediately.`)) {
      const res = await apiClient.cancelBooking(pnr);
      if (res.success) {
        notify(`Booking ${pnr} cancelled and seats released`, 'success');
        loadData();
      } else {
        notify(res.error || 'Cancellation failed', 'error');
      }
    }
  };

  const handlePrintManifest = () => {
    window.print();
  };

  const filtered = bookings.filter((b) => {
    if (pnrFilter && !b.pnr.toLowerCase().includes(pnrFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0B2E5C]">Reservations & Flight Manifest Administration</h2>
          <p className="text-xs text-slate-500">
            View all confirmed customer bookings, execute administrator cancellations, and generate flight passenger manifests.
          </p>
        </div>
      </div>

      {/* Manifest Quick Generator Bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#0B2E5C]" />
          <span className="font-bold text-[#0B2E5C]">
            Generate Official Flight Passenger Manifest:
          </span>
          <select
            onChange={(e) => {
              if (e.target.value) handleOpenManifest(Number(e.target.value));
            }}
            className="p-1.5 bg-white border border-slate-300 rounded font-bold"
            defaultValue=""
          >
            <option value="" disabled>-- Select Flight to View Manifest --</option>
            {flights.map((f) => (
              <option key={f.flight_id} value={f.flight_id}>
                {f.flight_number} ({f.origin_airport_id} ➔ {f.destination_airport_id})
              </option>
            ))}
          </select>
        </div>
        <span className="text-slate-500 text-[11px]">Printable legal manifest for airline gate agents</span>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex items-center justify-between text-xs">
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={pnrFilter}
            onChange={(e) => setPnrFilter(e.target.value)}
            placeholder="Search by 6-char PNR..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold uppercase focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none"
          />
        </div>
        <div className="text-slate-500 font-mono text-[11px]">
          Total Bookings: <strong>{filtered.length}</strong>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0B2E5C] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">PNR</th>
                <th className="p-3">Flight No</th>
                <th className="p-3">Route</th>
                <th className="p-3">Class</th>
                <th className="p-3 text-center">Pax Count</th>
                <th className="p-3 text-right">Total Fare</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Booked At</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Loading reservation ledger...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.booking_id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-black text-[#0B2E5C] text-sm">{b.pnr}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{b.flight_number}</td>
                    <td className="p-3 font-semibold text-slate-700">
                      {b.origin_city} ➔ {b.destination_city}
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{b.travel_class}</td>
                    <td className="p-3 text-center font-bold text-slate-800">
                      {b.passenger_count || 1}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      ${Number(b.total_fare).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          b.booking_status === 'Confirmed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {b.booking_status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">{b.booked_at}</td>
                    <td className="p-3 text-right">
                      {b.booking_status === 'Confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(b.pnr)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-bold text-[11px]"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flight Passenger Manifest Modal */}
      {manifestModalOpen && manifestFlight && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border-2 border-[#0B2E5C]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-base text-[#0B2E5C] uppercase tracking-wide">
                  Official Flight Passenger Manifest & Boarding Roster
                </h3>
                <p className="text-xs text-slate-500">
                  Flight {manifestFlight.flight_number} ({manifestFlight.origin_airport_id} ➔{' '}
                  {manifestFlight.destination_airport_id}) • Departure:{' '}
                  {manifestFlight.scheduled_departure}
                </p>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handlePrintManifest}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2E5C] text-white rounded text-xs font-bold shadow hover:bg-blue-900"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Manifest</span>
                </button>
                <button
                  onClick={() => setManifestModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-300"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Manifest Table */}
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border border-slate-300">
                <thead className="bg-[#0B2E5C] text-white uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Seat</th>
                    <th className="p-2.5">Passenger Legal Name</th>
                    <th className="p-2.5 text-center">Age</th>
                    <th className="p-2.5 text-center">Gender</th>
                    <th className="p-2.5">Class</th>
                    <th className="p-2.5">PNR Reference</th>
                    <th className="p-2.5 text-right">Manifest Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {manifestLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Compiling manifest from database...
                      </td>
                    </tr>
                  ) : manifestPassengers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No confirmed passengers booked on this flight.
                      </td>
                    </tr>
                  ) : (
                    manifestPassengers.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-black text-amber-700 text-sm">
                          {p.seat_no}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900 uppercase">
                          {p.full_name}
                        </td>
                        <td className="p-2.5 text-center text-slate-600">{p.age}</td>
                        <td className="p-2.5 text-center text-slate-600">{p.gender}</td>
                        <td className="p-2.5 font-semibold text-slate-700">{p.travel_class}</td>
                        <td className="p-2.5 font-mono font-bold text-[#0B2E5C]">{p.pnr}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">
                          Verified Confirmed
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-[11px] text-slate-500 pt-2 border-t flex justify-between">
              <span>Total Boarded: {manifestPassengers.length} passengers</span>
              <span>Aircraft Capacity: {manifestFlight.aircraft_capacity || 150} seats</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
