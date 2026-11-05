import React, { useMemo } from 'react';
import { TravelClass } from '../../types';

interface Seat {
  id: string; // e.g. "1A", "4C"
  row: number;
  col: string;
  isBusiness: boolean;
  status: 'available' | 'occupied' | 'selected';
  priceMultiplier: number;
}

interface FuselageSeatMapProps {
  flightId: number;
  capacity?: number;
  travelClass: TravelClass;
  selectedSeats: string[];
  maxSeats: number;
  onSelectSeat: (seatId: string) => void;
  occupiedFromBookings?: string[];
}

export const FuselageSeatMap: React.FC<FuselageSeatMapProps> = ({
  flightId,
  capacity = 150,
  travelClass,
  selectedSeats,
  maxSeats,
  onSelectSeat,
  occupiedFromBookings = [],
}) => {
  // Generate seats deterministically based on capacity and flightId
  const { businessSeats, economySeats } = useMemo(() => {
    // Deterministic pseudo-random seed
    const seed = (flightId * 9301 + 49297) % 233280;
    const isRegional = capacity < 100;

    const bCols = ['A', 'C', 'D', 'F'];
    const eCols = isRegional ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E', 'F'];

    const bRows = 2; // Rows 1-2 are Business
    const totalEcoRows = Math.min(Math.ceil((capacity - bRows * bCols.length) / eCols.length), 14);

    const bList: Seat[] = [];
    const eList: Seat[] = [];

    // Business Rows
    for (let r = 1; r <= bRows; r++) {
      for (const col of bCols) {
        const id = `${r}${col}`;
        const hash = (seed + r * 31 + col.charCodeAt(0) * 17) % 100;
        const isOccupied = hash < 35 || occupiedFromBookings.includes(id);

        bList.push({
          id,
          row: r,
          col,
          isBusiness: true,
          status: selectedSeats.includes(id)
            ? 'selected'
            : isOccupied
            ? 'occupied'
            : 'available',
          priceMultiplier: 2.2,
        });
      }
    }

    // Economy Rows (Start from row 3)
    for (let r = 3; r <= 2 + totalEcoRows; r++) {
      for (const col of eCols) {
        const id = `${r}${col}`;
        const hash = (seed + r * 37 + col.charCodeAt(0) * 13) % 100;
        const isOccupied = hash < 45 || occupiedFromBookings.includes(id);

        eList.push({
          id,
          row: r,
          col,
          isBusiness: false,
          status: selectedSeats.includes(id)
            ? 'selected'
            : isOccupied
            ? 'occupied'
            : 'available',
          priceMultiplier: 1.0,
        });
      }
    }

    return { businessSeats: bList, economySeats: eList };
  }, [flightId, capacity, selectedSeats, occupiedFromBookings]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === 'occupied') return;

    // Filter class mismatch warning
    if (travelClass === 'Business' && !seat.isBusiness) {
      alert('You have chosen Business Class. Please select a Business seat (Rows 1-2).');
      return;
    }
    if (travelClass === 'Economy' && seat.isBusiness) {
      alert('This seat is in the Business cabin. Please select an Economy seat (Rows 3+).');
      return;
    }

    onSelectSeat(seat.id);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto bg-slate-50 border border-slate-300 rounded-xl p-4 shadow-sm select-none">
      {/* Legend & Instructions */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-white border-2 border-slate-400 inline-block" />
            <span className="text-slate-600">Available</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#F57C00] border-2 border-[#ea580c] inline-block" />
            <span className="text-slate-800 font-semibold">Selected</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-300 border-2 border-slate-400 inline-block" />
            <span className="text-slate-400">Occupied</span>
          </span>
        </div>
        <div className="font-semibold text-[#0B2E5C]">
          Seats Chosen: {selectedSeats.length} / {maxSeats}
        </div>
      </div>

      {/* Fuselage Container */}
      <div className="relative w-full max-w-sm mt-6 flex flex-col items-center">
        {/* Fuselage Top Outline SVG (Nose + Cockpit + Wings) */}
        <svg
          viewBox="0 0 320 180"
          className="w-full h-auto drop-shadow-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Wings protruding left and right */}
          <path
            d="M 60,110 L 0,165 L 15,175 L 75,135 Z"
            fill="#cbd5e1"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <path
            d="M 260,110 L 320,165 L 305,175 L 245,135 Z"
            fill="#cbd5e1"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />

          {/* Fuselage Nose Cone Dome */}
          <path
            d="M 65,180 
               L 65,80 
               C 65,25 100,5 160,5 
               C 220,5 255,25 255,80 
               L 255,180 
               Z"
            fill="#ffffff"
            stroke="#0B2E5C"
            strokeWidth="3"
          />

          {/* Cockpit Windshield */}
          <path
            d="M 125,40 Q 160,32 195,40 L 190,52 Q 160,45 130,52 Z"
            fill="#0f172a"
          />

          {/* Forward Galley / Exit L1 & R1 Indicators */}
          <rect x="58" y="90" width="8" height="18" rx="2" fill="#ef4444" />
          <text x="40" y="103" fontSize="8" fontWeight="bold" fill="#ef4444">
            EXIT L1
          </text>
          <rect x="254" y="90" width="8" height="18" rx="2" fill="#ef4444" />
          <text x="268" y="103" fontSize="8" fontWeight="bold" fill="#ef4444">
            EXIT R1
          </text>
        </svg>

        {/* Interior Cabin Fuselage Content */}
        <div className="w-[190px] bg-white border-x-4 border-[#0B2E5C] px-3 py-2 flex flex-col items-center">
          {/* Business Class Section Banner */}
          <div className="w-full text-center py-1 my-1 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-800 tracking-wider uppercase">
            Business Class (2-2)
          </div>

          {/* Business Class Grid (Rows 1-2) */}
          <div className="space-y-2 mb-4 w-full">
            {[1, 2].map((r) => {
              const rowSeats = businessSeats.filter((s) => s.row === r);
              const leftSeats = rowSeats.filter((s) => s.col === 'A' || s.col === 'C');
              const rightSeats = rowSeats.filter((s) => s.col === 'D' || s.col === 'F');

              return (
                <div key={r} className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {leftSeats.map((seat) => (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.status === 'occupied'}
                        className={`w-7 h-8 rounded text-[11px] font-bold flex flex-col items-center justify-center transition-all ${
                          seat.status === 'selected'
                            ? 'bg-[#F57C00] text-white shadow-md scale-105 border-2 border-orange-600'
                            : seat.status === 'occupied'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                            : 'bg-white hover:bg-amber-100 text-slate-800 border-2 border-amber-400'
                        }`}
                        title={`${seat.id} (Business - $${seat.priceMultiplier}x)`}
                      >
                        {seat.id}
                      </button>
                    ))}
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 px-1">{r}</span>

                  <div className="flex gap-2">
                    {rightSeats.map((seat) => (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.status === 'occupied'}
                        className={`w-7 h-8 rounded text-[11px] font-bold flex flex-col items-center justify-center transition-all ${
                          seat.status === 'selected'
                            ? 'bg-[#F57C00] text-white shadow-md scale-105 border-2 border-orange-600'
                            : seat.status === 'occupied'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                            : 'bg-white hover:bg-amber-100 text-slate-800 border-2 border-amber-400'
                        }`}
                        title={`${seat.id} (Business - $${seat.priceMultiplier}x)`}
                      >
                        {seat.id}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Over-Wing Emergency Exit Doors */}
          <div className="w-full flex items-center justify-between py-1 my-1 px-1 bg-rose-50 border-y border-rose-200 text-[9px] font-bold text-rose-700">
            <span>◄ EXIT L2</span>
            <span>OVER-WING EXITS</span>
            <span>EXIT R2 ►</span>
          </div>

          {/* Economy Class Section Banner */}
          <div className="w-full text-center py-0.5 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Economy Class (3-3)
          </div>

          {/* Economy Class Grid (Rows 3+) */}
          <div className="space-y-1.5 w-full">
            {Array.from(new Set(economySeats.map((s) => s.row))).map((r) => {
              const rowSeats = economySeats.filter((s) => s.row === r);
              const leftSeats = rowSeats.filter((s) => ['A', 'B', 'C'].includes(s.col));
              const rightSeats = rowSeats.filter((s) => ['D', 'E', 'F'].includes(s.col));

              return (
                <div key={r} className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {leftSeats.map((seat) => (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.status === 'occupied'}
                        className={`w-5 h-6 rounded text-[10px] font-bold flex items-center justify-center transition-all ${
                          seat.status === 'selected'
                            ? 'bg-[#F57C00] text-white shadow scale-105 border border-orange-600'
                            : seat.status === 'occupied'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                            : 'bg-white hover:bg-blue-50 text-slate-800 border border-slate-400'
                        }`}
                        title={`${seat.id} (Economy)`}
                      >
                        {seat.id}
                      </button>
                    ))}
                  </div>

                  <span className="text-[9px] font-semibold text-slate-400 px-0.5">{r}</span>

                  <div className="flex gap-1">
                    {rightSeats.map((seat) => (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.status === 'occupied'}
                        className={`w-5 h-6 rounded text-[10px] font-bold flex items-center justify-center transition-all ${
                          seat.status === 'selected'
                            ? 'bg-[#F57C00] text-white shadow scale-105 border border-orange-600'
                            : seat.status === 'occupied'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                            : 'bg-white hover:bg-blue-50 text-slate-800 border border-slate-400'
                        }`}
                        title={`${seat.id} (Economy)`}
                      >
                        {seat.id}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tail Fuselage Bottom SVG */}
        <svg
          viewBox="0 0 320 80"
          className="w-full h-auto drop-shadow-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Horizontal Tail Stabilizers */}
          <polygon points="65,0 10,40 30,50 85,15" fill="#cbd5e1" stroke="#94a3b8" />
          <polygon points="255,0 310,40 290,50 235,15" fill="#cbd5e1" stroke="#94a3b8" />

          {/* Fuselage Tail Cone */}
          <path
            d="M 65,0 
               L 85,25 
               C 120,65 150,75 160,75 
               C 170,75 200,65 235,25 
               L 255,0 
               Z"
            fill="#ffffff"
            stroke="#0B2E5C"
            strokeWidth="3"
          />

          {/* Rear Galley & APU Exhaust */}
          <circle cx="160" cy="72" r="4" fill="#0B2E5C" />
          <rect x="75" y="5" width="8" height="15" rx="2" fill="#ef4444" />
          <text x="55" y="16" fontSize="7" fontWeight="bold" fill="#ef4444">
            EXIT L3
          </text>
          <rect x="237" y="5" width="8" height="15" rx="2" fill="#ef4444" />
          <text x="250" y="16" fontSize="7" fontWeight="bold" fill="#ef4444">
            EXIT R3
          </text>
        </svg>
      </div>

      {/* Selected Seat Notification Bar */}
      <div className="w-full mt-4 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs flex items-center justify-between">
        <div>
          <span className="font-semibold text-[#0B2E5C]">Selected Seats: </span>
          <span className="font-bold text-[#F57C00]">
            {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None selected yet'}
          </span>
        </div>
        {selectedSeats.length < maxSeats && (
          <span className="text-amber-800 text-[11px] font-medium">
            (Select {maxSeats - selectedSeats.length} more)
          </span>
        )}
      </div>
    </div>
  );
};
