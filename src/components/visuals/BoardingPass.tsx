import React from 'react';
import { Booking, Passenger } from '../../types';
import { Printer, Plane, CheckCircle2, QrCode } from 'lucide-react';

interface BoardingPassProps {
  booking: Booking;
  passenger?: Passenger;
  onClose?: () => void;
}

export const BoardingPass: React.FC<BoardingPassProps> = ({
  booking,
  passenger = booking.passengers?.[0] || {
    full_name: 'Passenger',
    age: 30,
    gender: 'M',
    seat_no: '12A',
  },
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isBusiness = booking.travel_class === 'Business';

  return (
    <div className="w-full max-w-4xl mx-auto my-4 print:m-0 print:p-0">
      {/* Top Action Bar (hidden when printing) */}
      <div className="flex items-center justify-between mb-3 px-2 print:hidden">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Official Electronic Boarding Pass & Travel Document
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2E5C] text-white text-xs font-semibold rounded hover:bg-blue-900 shadow transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-300"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main Boarding Pass Card */}
      <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-lg print:border-none print:shadow-none">
        {/* Header Ribbon */}
        <div className="bg-[#0B2E5C] text-white px-6 py-3.5 flex items-center justify-between border-b-4 border-[#F57C00]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-white/10 flex items-center justify-center border border-white/20">
              <Plane className="w-5 h-5 text-amber-400 rotate-45" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-wide uppercase">
                SkyLedger Commercial Airways
              </div>
              <div className="text-[11px] text-blue-200">
                Department of Civil Aviation – Boarding Pass
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-blue-200 uppercase tracking-widest font-bold">
              Booking Reference (PNR)
            </div>
            <div className="text-xl font-mono font-black text-amber-400 tracking-wider">
              {booking.pnr}
            </div>
          </div>
        </div>

        {/* Boarding Pass Body (Split into Main Body & Stub) */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Main Flight & Passenger Details (8 Cols) */}
          <div className="md:col-span-8 p-6 border-b md:border-b-0 md:border-r-2 border-dashed border-slate-300">
            {/* Passenger Name & Class */}
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Passenger Name
                </span>
                <div className="text-lg font-bold text-slate-900 uppercase">
                  {passenger.full_name}
                </div>
                <div className="text-xs text-slate-500">
                  Age: {passenger.age} | Gender: {passenger.gender}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Cabin Class
                </span>
                <div
                  className={`inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${
                    isBusiness
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-blue-100 text-blue-900 border border-blue-300'
                  }`}
                >
                  {booking.travel_class}
                </div>
              </div>
            </div>

            {/* Flight Route, Airports & Timings */}
            <div className="grid grid-cols-3 gap-4 items-center mb-6">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Origin</span>
                <div className="text-2xl font-black text-[#0B2E5C]">
                  {booking.origin_airport_id}
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  {booking.origin_city}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Dep: {booking.scheduled_departure?.slice(11, 16)} EST
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Flight No</span>
                <div className="text-sm font-black text-amber-600 font-mono">
                  {booking.flight_number || 'SK-102'}
                </div>
                <div className="w-full flex items-center justify-center my-1">
                  <div className="h-0.5 w-12 bg-slate-300" />
                  <Plane className="w-3.5 h-3.5 text-slate-400 mx-1" />
                  <div className="h-0.5 w-12 bg-slate-300" />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Non-Stop</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Destination</span>
                <div className="text-2xl font-black text-emerald-800">
                  {booking.destination_airport_id}
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  {booking.destination_city}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Arr: {booking.scheduled_arrival?.slice(11, 16)} EST
                </div>
              </div>
            </div>

            {/* Key Flight Boarding Metadata */}
            <div className="grid grid-cols-4 gap-3 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Date</span>
                <div className="text-xs font-bold text-slate-800 font-mono">
                  {booking.scheduled_departure?.slice(0, 10)}
                </div>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Boarding Time</span>
                <div className="text-xs font-bold text-amber-700 font-mono">
                  {/* Boarding 45 mins prior */}
                  {booking.scheduled_departure
                    ? new Date(new Date(booking.scheduled_departure).getTime() - 45 * 60000)
                        .toTimeString()
                        .slice(0, 5)
                    : '06:45'}
                </div>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Gate</span>
                <div className="text-xs font-bold text-[#0B2E5C] font-mono">B14</div>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Allocated Seat</span>
                <div className="text-base font-black text-[#F57C00] font-mono">
                  {passenger.seat_no}
                </div>
              </div>
            </div>

            {/* Simulated Barcode at bottom of main card */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-9 w-64 bg-slate-900 flex items-center justify-center p-1 rounded">
                  {/* SVG Barcode pattern */}
                  <svg className="w-full h-full" viewBox="0 0 200 30" preserveAspectRatio="none">
                    <rect x="0" y="0" width="3" height="30" fill="#fff" />
                    <rect x="5" y="0" width="2" height="30" fill="#fff" />
                    <rect x="10" y="0" width="4" height="30" fill="#fff" />
                    <rect x="16" y="0" width="1" height="30" fill="#fff" />
                    <rect x="20" y="0" width="5" height="30" fill="#fff" />
                    <rect x="28" y="0" width="2" height="30" fill="#fff" />
                    <rect x="33" y="0" width="3" height="30" fill="#fff" />
                    <rect x="40" y="0" width="4" height="30" fill="#fff" />
                    <rect x="47" y="0" width="2" height="30" fill="#fff" />
                    <rect x="52" y="0" width="6" height="30" fill="#fff" />
                    <rect x="62" y="0" width="2" height="30" fill="#fff" />
                    <rect x="67" y="0" width="4" height="30" fill="#fff" />
                    <rect x="74" y="0" width="3" height="30" fill="#fff" />
                    <rect x="80" y="0" width="2" height="30" fill="#fff" />
                    <rect x="85" y="0" width="5" height="30" fill="#fff" />
                    <rect x="93" y="0" width="1" height="30" fill="#fff" />
                    <rect x="97" y="0" width="4" height="30" fill="#fff" />
                    <rect x="104" y="0" width="2" height="30" fill="#fff" />
                    <rect x="109" y="0" width="6" height="30" fill="#fff" />
                    <rect x="118" y="0" width="2" height="30" fill="#fff" />
                    <rect x="123" y="0" width="4" height="30" fill="#fff" />
                    <rect x="130" y="0" width="1" height="30" fill="#fff" />
                    <rect x="134" y="0" width="5" height="30" fill="#fff" />
                    <rect x="142" y="0" width="3" height="30" fill="#fff" />
                    <rect x="148" y="0" width="2" height="30" fill="#fff" />
                    <rect x="153" y="0" width="4" height="30" fill="#fff" />
                    <rect x="160" y="0" width="5" height="30" fill="#fff" />
                    <rect x="168" y="0" width="2" height="30" fill="#fff" />
                    <rect x="173" y="0" width="3" height="30" fill="#fff" />
                    <rect x="180" y="0" width="5" height="30" fill="#fff" />
                    <rect x="188" y="0" width="2" height="30" fill="#fff" />
                    <rect x="193" y="0" width="4" height="30" fill="#fff" />
                  </svg>
                </div>
                <div className="text-[9px] font-mono text-slate-500 tracking-wider">
                  {booking.pnr} • {booking.flight_number} • TICKET CONFIRMED
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified E-Ticket</span>
              </div>
            </div>
          </div>

          {/* Passenger Stub / Tear-off (4 Cols) */}
          <div className="md:col-span-4 p-5 bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Passenger Stub</span>
                <span className="text-[10px] font-mono font-bold text-[#0B2E5C]">{booking.pnr}</span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Passenger</span>
                  <div className="font-bold text-slate-800 truncate">{passenger.full_name}</div>
                </div>

                <div className="flex justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Flight</span>
                    <div className="font-bold text-slate-800 font-mono">{booking.flight_number}</div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Class</span>
                    <div className="font-bold text-slate-800">{booking.travel_class}</div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Seat</span>
                    <div className="font-black text-[#F57C00] font-mono text-sm">{passenger.seat_no}</div>
                  </div>
                </div>

                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">From</span>
                    <div className="font-bold text-[#0B2E5C]">{booking.origin_airport_id}</div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">To</span>
                    <div className="font-bold text-emerald-800">{booking.destination_airport_id}</div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Gate</span>
                    <div className="font-bold text-slate-800">B14</div>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Placeholder and Fare Total */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between mt-4">
              <div className="p-1.5 bg-white border border-slate-300 rounded shadow-sm">
                <QrCode className="w-14 h-14 text-slate-800" />
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Paid Total</span>
                <div className="text-base font-black text-slate-900 font-mono">
                  ${booking.total_fare.toFixed(2)}
                </div>
                <span className="text-[9px] text-slate-500 font-medium">(Incl. 5% GST)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Airport Security Advisory Bar */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-2 text-[10px] text-slate-500 flex items-center justify-between">
          <span>* Valid government-issued photo ID required at check-in & TSA checkpoints.</span>
          <span>Security screening closes 20 minutes prior to scheduled departure.</span>
        </div>
      </div>
    </div>
  );
};
