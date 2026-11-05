import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { Booking } from '../types';
import { BoardingPass } from '../components/visuals/BoardingPass';
import { Search, Plane, AlertCircle, Printer, CheckCircle, Clock } from 'lucide-react';

export const PnrStatusPage: React.FC = () => {
  const [pnrInput, setPnrInput] = useState('SK789A');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBoardingPass, setShowBoardingPass] = useState(false);

  const handleLookup = async (pnrToSearch?: string) => {
    const target = pnrToSearch || pnrInput;
    if (!target.trim()) return;

    setLoading(true);
    setError(null);
    setBooking(null);

    const res = await apiClient.getBookingByPnr(target);
    setLoading(false);

    if (res.success && res.data) {
      setBooking(res.data);
    } else {
      setError(res.error || 'No booking found with this PNR');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Search Header */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0B2E5C] mb-1">
          PNR Enquiry & Electronic Ticket Retrieval
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Enter your 6-character Passenger Name Record (PNR) code to view status, seat allocation and print boarding passes.
        </p>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              maxLength={6}
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value.toUpperCase())}
              placeholder="e.g. SK789A"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-base uppercase text-slate-900 focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none"
            />
          </div>
          <button
            onClick={() => handleLookup()}
            disabled={loading}
            className="px-6 py-2.5 bg-[#F57C00] hover:bg-orange-600 text-white font-extrabold rounded shadow text-xs uppercase tracking-wider transition-colors"
          >
            {loading ? 'Searching...' : 'Check Status'}
          </button>
        </div>

        {/* Quick Demo PNR Suggestions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Quick Demo PNRs:</span>
          {['SK789A', 'SK104B', 'SK229C'].map((pnr) => (
            <button
              key={pnr}
              onClick={() => {
                setPnrInput(pnr);
                handleLookup(pnr);
              }}
              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#0B2E5C] border border-blue-200 rounded font-mono font-bold text-[11px]"
            >
              {pnr}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Booking Details Found */}
      {booking && (
        <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm space-y-6">
          {/* Header Strip */}
          <div className="bg-[#0B2E5C] text-white p-4 flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#F57C00]">
            <div>
              <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">
                PNR Reference
              </span>
              <div className="text-2xl font-black font-mono text-amber-400">
                {booking.pnr}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  booking.booking_status === 'Confirmed'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {booking.booking_status}
              </span>

              <button
                onClick={() => setShowBoardingPass(!showBoardingPass)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0B2E5C] hover:bg-slate-100 text-xs font-bold rounded shadow transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{showBoardingPass ? 'Hide Boarding Pass' : 'View Boarding Pass'}</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Flight Route & Timings */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">From</span>
                <div className="text-lg font-bold text-[#0B2E5C]">{booking.origin_airport_id}</div>
                <div className="text-xs text-slate-600">{booking.origin_city}</div>
                <div className="text-xs font-mono text-slate-500 mt-1">
                  Dep: {booking.scheduled_departure?.slice(0, 16)}
                </div>
              </div>

              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Flight</span>
                <div className="text-base font-black text-amber-600 font-mono">
                  {booking.flight_number}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Class: <strong>{booking.travel_class}</strong>
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      booking.flight_status === 'On-Time'
                        ? 'bg-emerald-100 text-emerald-800'
                        : booking.flight_status === 'Delayed'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Flight Status: {booking.flight_status}
                    {booking.delay_duration_minutes ? ` (+${booking.delay_duration_minutes}m)` : ''}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">To</span>
                <div className="text-lg font-bold text-emerald-800">{booking.destination_airport_id}</div>
                <div className="text-xs text-slate-600">{booking.destination_city}</div>
                <div className="text-xs font-mono text-slate-500 mt-1">
                  Arr: {booking.scheduled_arrival?.slice(0, 16)}
                </div>
              </div>
            </div>

            {/* Passenger Manifest for this PNR */}
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider mb-2">
                Passenger & Seat Allocation Manifest
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200">
                  <thead className="bg-[#0B2E5C] text-white">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Passenger Legal Name</th>
                      <th className="p-2 text-center">Age</th>
                      <th className="p-2 text-center">Gender</th>
                      <th className="p-2 text-center">Assigned Seat</th>
                      <th className="p-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {booking.passengers?.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900 uppercase">{p.full_name}</td>
                        <td className="p-2 text-center text-slate-600">{p.age}</td>
                        <td className="p-2 text-center text-slate-600">{p.gender}</td>
                        <td className="p-2 text-center font-mono font-black text-[#F57C00] text-sm">
                          {p.seat_no}
                        </td>
                        <td className="p-2 text-right font-semibold text-emerald-700">
                          Confirmed
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Booked On: </span>
                <span className="font-mono text-slate-700">{booking.booked_at}</span>
              </div>
              <div>
                <span className="text-slate-500">Total Fare Paid: </span>
                <span className="text-base font-black text-slate-900 font-mono">
                  ${Number(booking.total_fare).toFixed(2)}
                </span>
                <span className="text-slate-500 text-[10px]"> (Incl. 5% GST)</span>
              </div>
            </div>

            {/* Printable Boarding Pass Display */}
            {showBoardingPass && (
              <div className="pt-4 border-t border-slate-200">
                <BoardingPass
                  booking={booking}
                  onClose={() => setShowBoardingPass(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
