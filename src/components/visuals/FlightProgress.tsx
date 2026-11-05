import React, { useMemo } from 'react';
import { Flight } from '../../types';

interface FlightProgressProps {
  flight: Flight;
  currentTimeStr?: string; // Optional test timestamp
}

export const FlightProgress: React.FC<FlightProgressProps> = ({
  flight,
  currentTimeStr = '2013-01-01 10:00:00',
}) => {
  const { progressPercent, isArrived, isDeparted, remainingMinutes } = useMemo(() => {
    const depTime = new Date(flight.scheduled_departure).getTime();
    const arrTime = new Date(flight.scheduled_arrival).getTime();
    const nowTime = new Date(currentTimeStr).getTime();

    const totalDuration = arrTime - depTime;
    if (totalDuration <= 0) return { progressPercent: 100, isArrived: true, isDeparted: true, remainingMinutes: 0 };

    if (nowTime <= depTime) {
      return { progressPercent: 0, isArrived: false, isDeparted: false, remainingMinutes: Math.round(totalDuration / 60000) };
    }
    if (nowTime >= arrTime) {
      return { progressPercent: 100, isArrived: true, isDeparted: true, remainingMinutes: 0 };
    }

    const elapsed = nowTime - depTime;
    const pct = Math.min(Math.max(Math.round((elapsed / totalDuration) * 100), 2), 98);
    const rem = Math.round((arrTime - nowTime) / 60000);

    return {
      progressPercent: pct,
      isArrived: false,
      isDeparted: true,
      remainingMinutes: rem,
    };
  }, [flight, currentTimeStr]);

  const isDelayed = flight.status === 'Delayed';
  const isCancelled = flight.status === 'Cancelled';

  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <div>
          <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
            Flight Progress Tracker
          </span>
          <span className="ml-2 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Historical Data Position (Demo Epoch: 10:00 EST)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 text-xs font-bold rounded-full ${
              isCancelled
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : isDelayed
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {flight.status}
            {isDelayed && flight.delay_duration_minutes ? ` (+${flight.delay_duration_minutes}m)` : ''}
          </span>
        </div>
      </div>

      {/* Origin, Progress Track, Destination */}
      <div className="relative pt-6 pb-4">
        {/* Track Line */}
        <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isCancelled
                ? 'bg-rose-500'
                : isDelayed
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-[#0B2E5C] to-emerald-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Origin Marker */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-4 h-4 rounded-full bg-[#0B2E5C] border-2 border-white shadow ring-2 ring-blue-300" />
        </div>

        {/* Animated Airplane along the track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -ml-4 transition-all duration-1000 flex flex-col items-center select-none"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="bg-[#0B2E5C] text-white p-1 rounded-full shadow-lg ring-2 ring-amber-400 rotate-90">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-blue-900 bg-white px-1 rounded shadow -mt-6 border border-slate-200">
            {progressPercent}%
          </span>
        </div>

        {/* Destination Marker */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow ring-2 ring-emerald-300" />
        </div>
      </div>

      {/* Terminal & Timings Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
        <div>
          <div className="text-slate-400 font-semibold uppercase text-[10px]">Origin</div>
          <div className="text-lg font-bold text-[#0B2E5C]">{flight.origin_airport_id}</div>
          <div className="text-slate-600 font-medium">{flight.origin_city}</div>
          <div className="text-slate-500 font-mono mt-0.5">
            Dep: {flight.scheduled_departure.slice(11, 16)} EST
          </div>
        </div>

        <div className="text-center hidden md:block">
          <div className="text-slate-400 font-semibold uppercase text-[10px]">Status Information</div>
          <div className="text-sm font-bold text-slate-700 mt-1">
            {isCancelled
              ? 'Flight Cancelled'
              : isArrived
              ? 'Arrived at Destination'
              : isDeparted
              ? `In Flight (~${remainingMinutes} min remaining)`
              : 'Scheduled on Ground'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Equipment: {flight.aircraft_model || 'Boeing 737'}
          </div>
        </div>

        <div className="text-right">
          <div className="text-slate-400 font-semibold uppercase text-[10px]">Destination</div>
          <div className="text-lg font-bold text-emerald-800">{flight.destination_airport_id}</div>
          <div className="text-slate-600 font-medium">{flight.destination_city}</div>
          <div className="text-slate-500 font-mono mt-0.5">
            Arr: {flight.scheduled_arrival.slice(11, 16)} EST
          </div>
        </div>
      </div>
    </div>
  );
};
