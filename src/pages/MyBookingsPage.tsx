import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../api/client';
import { Booking } from '../types';
import { BoardingPass } from '../components/visuals/BoardingPass';
import { Plane, Calendar, AlertCircle, XCircle, Printer, DollarSign, CheckCircle } from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const { user, setAuthModalOpen, notify } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [ticketToView, setTicketToView] = useState<Booking | null>(null);

  // Cancellation modal
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadBookings = () => {
    setLoading(true);
    apiClient.getUserBookings(user ? user.user_id : undefined).then((res) => {
      if (res.success && res.data) {
        setBookings(res.data);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadBookings();
  }, [user]);

  const handleCancelClick = (b: Booking) => {
    setCancellingBooking(b);
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingBooking) return;
    setCancelLoading(true);

    const res = await apiClient.cancelBooking(cancellingBooking.pnr);
    setCancelLoading(false);

    if (res.success) {
      notify(res.message || 'Booking cancelled successfully', 'success');
      setCancellingBooking(null);
      loadBookings();
    } else {
      notify(res.error || 'Cancellation failed', 'error');
    }
  };

  const filtered = bookings.filter((b) => {
    if (activeTab === 'confirmed') return b.booking_status === 'Confirmed';
    if (activeTab === 'cancelled') return b.booking_status === 'Cancelled';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B2E5C]">
            Manage Bookings & Electronic Ticket Portal
          </h2>
          <p className="text-xs text-slate-500">
            {user
              ? `Displaying bookings reserved under ${user.full_name} (${user.email})`
              : 'Sign in to access your linked reservations or view tickets.'}
          </p>
        </div>

        {!user && (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-4 py-2 bg-[#F57C00] text-white font-bold text-xs rounded shadow"
          >
            Sign In / Register
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-2 px-3 border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-[#0B2E5C] text-[#0B2E5C]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Reservations ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('confirmed')}
          className={`pb-2 px-3 border-b-2 transition-colors ${
            activeTab === 'confirmed'
              ? 'border-[#0B2E5C] text-[#0B2E5C]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Confirmed Only ({bookings.filter((b) => b.booking_status === 'Confirmed').length})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`pb-2 px-3 border-b-2 transition-colors ${
            activeTab === 'cancelled'
              ? 'border-[#0B2E5C] text-[#0B2E5C]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Cancelled ({bookings.filter((b) => b.booking_status === 'Cancelled').length})
        </button>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-28 bg-slate-200 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-2 text-xs">
          <Plane className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="font-bold text-slate-700">No booking records found</div>
          <p className="text-slate-500">
            Book a flight from the home page to test reservation and cancellation flows.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const isConfirmed = b.booking_status === 'Confirmed';

            return (
              <div
                key={b.booking_id}
                className="bg-white border-2 border-slate-300 rounded-xl p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-bold uppercase">PNR</span>
                    <span className="text-xl font-black font-mono text-[#0B2E5C]">{b.pnr}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isConfirmed
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {b.booking_status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTicketToView(b)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0B2E5C] border border-blue-200 rounded text-xs font-bold transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View E-Ticket</span>
                    </button>

                    {isConfirmed && (
                      <button
                        onClick={() => handleCancelClick(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-bold transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Flight Route</span>
                    <div className="font-bold text-slate-800 font-mono mt-0.5">
                      {b.flight_number} • {b.origin_airport_id} ➔ {b.destination_airport_id}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {b.origin_city} to {b.destination_city}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Departure</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {b.scheduled_departure?.slice(0, 16)}
                    </div>
                    <div className="text-slate-500 text-[11px]">Class: {b.travel_class}</div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Passengers</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {b.passengers?.map((p) => `${p.full_name} (${p.seat_no})`).join(', ') ||
                        `${b.passenger_count || 1} passenger(s)`}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Fare</span>
                    <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                      ${Number(b.total_fare).toFixed(2)}
                    </div>
                    <div className="text-slate-500 text-[10px]">5% GST Itemized</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal with Refund Calculator */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border-2 border-rose-300">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-base">Cancel Flight Reservation</h3>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                Are you sure you want to cancel booking <strong>{cancellingBooking.pnr}</strong> (Flight{' '}
                {cancellingBooking.flight_number})?
              </p>

              {/* Dynamic Refund Policy calculation */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                <div className="font-bold">Official Civil Aviation Refund Rules:</div>
                <div className="text-[11px] space-y-0.5">
                  <div>• &gt; 24h prior to departure: <strong>100% Refund</strong></div>
                  <div>• &le; 24h prior to departure: <strong>50% Refund</strong></div>
                  <div>• Departed / No-Show: <strong>0% Refund</strong></div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono flex items-center justify-between text-xs">
                <span>Original Fare Paid:</span>
                <span className="font-bold">${Number(cancellingBooking.total_fare).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={cancelLoading}
                onClick={() => setCancellingBooking(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleConfirmCancellation}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold shadow"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm & Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Ticket Modal */}
      {ticketToView && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-4 relative max-h-[95vh] overflow-y-auto">
            <BoardingPass
              booking={ticketToView}
              onClose={() => setTicketToView(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
