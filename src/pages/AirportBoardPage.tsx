import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Flight } from '../types';
import { AIRPORTS } from '../data/airportsData';
import { Plane, Calendar, Clock, Filter, Radio } from 'lucide-react';

export const AirportBoardPage: React.FC = () => {
  const [selectedAirport, setSelectedAirport] = useState('JFK');
  const [boardType, setBoardType] = useState<'departures' | 'arrivals'>('departures');
  const [boardDate, setBoardDate] = useState('2013-01-01');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params =
      boardType === 'departures'
        ? { origin: selectedAirport, date: boardDate, limit: 50 }
        : { destination: selectedAirport, date: boardDate, limit: 50 };

    apiClient.searchFlights(params).then((res) => {
      if (res.success && res.data) {
        setFlights(res.data);
      }
      setLoading(false);
    });
  }, [selectedAirport, boardType, boardDate]);

  const filtered = flights.filter((f) => {
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Airport Board Control Strip */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0B2E5C] text-white flex items-center justify-center">
              <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#0B2E5C] uppercase tracking-wide">
                Airport Flight Information Display System (FIDS)
              </h2>
              <p className="text-xs text-slate-500">
                Official terminal arrivals & departures board. Live operational feeds.
              </p>
            </div>
          </div>

          {/* Departures vs Arrivals Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-300 text-xs font-bold">
            <button
              onClick={() => setBoardType('departures')}
              className={`px-4 py-1.5 rounded transition-all ${
                boardType === 'departures'
                  ? 'bg-[#0B2E5C] text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Departures
            </button>
            <button
              onClick={() => setBoardType('arrivals')}
              className={`px-4 py-1.5 rounded transition-all ${
                boardType === 'arrivals'
                  ? 'bg-[#0B2E5C] text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Arrivals
            </button>
          </div>
        </div>

        {/* Airport & Date Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          <div className="md:col-span-5">
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Select Airport Terminal
            </label>
            <select
              value={selectedAirport}
              onChange={(e) => setSelectedAirport(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-bold text-sm text-[#0B2E5C]"
            >
              <optgroup label="NYC Origin Hubs">
                <option value="JFK">JFK — John F. Kennedy Intl Airport</option>
                <option value="LGA">LGA — LaGuardia Airport</option>
                <option value="EWR">EWR — Newark Liberty Intl Airport</option>
              </optgroup>
              <optgroup label="Other National Airports">
                {AIRPORTS.filter((a) => !['JFK', 'LGA', 'EWR'].includes(a.airport_id)).map((a) => (
                  <option key={a.airport_id} value={a.airport_id}>
                    {a.airport_id} — {a.city} ({a.airport_name.slice(0, 28)})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block font-bold text-slate-700 uppercase mb-1">Date</label>
            <input
              type="date"
              min="2013-01-01"
              max="2013-12-31"
              value={boardDate}
              onChange={(e) => setBoardDate(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block font-bold text-slate-700 uppercase mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium"
            >
              <option value="ALL">All Flights</option>
              <option value="On-Time">On-Time Only</option>
              <option value="Delayed">Delayed Only</option>
              <option value="Cancelled">Cancelled Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Terminal Board Table (FIDS High-Contrast Style) */}
      <div className="bg-[#0b1329] border-2 border-slate-800 rounded-xl shadow-2xl overflow-hidden font-mono text-xs select-none">
        {/* Board Title Header with blinking live indicator */}
        <div className="bg-[#050b18] px-6 py-3.5 border-b border-slate-800 flex items-center justify-between text-yellow-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="font-bold text-sm tracking-widest uppercase">
              {selectedAirport} {boardType.toUpperCase()} BOARD
            </span>
          </div>
          <div className="text-xs text-slate-400 font-sans">
            Local Terminal Time: <strong>10:00 EST</strong> • Date: <strong>{boardDate}</strong>
          </div>
        </div>

        {/* Board Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#101b38] text-amber-300 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Flight</th>
                <th className="py-3 px-4">{boardType === 'departures' ? 'Destination' : 'Origin'}</th>
                <th className="py-3 px-4 text-center">Scheduled</th>
                <th className="py-3 px-4 text-center">Estimated</th>
                <th className="py-3 px-4 text-center">Gate</th>
                <th className="py-3 px-4 text-right">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Connecting to Airport Information Display Feeds...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No flights scheduled matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((f, i) => {
                  const targetCity =
                    boardType === 'departures'
                      ? `${f.destination_city || f.destination_airport_id} (${f.destination_airport_id})`
                      : `${f.origin_city || f.origin_airport_id} (${f.origin_airport_id})`;

                  const schedTime = (boardType === 'departures' ? f.scheduled_departure : f.scheduled_arrival).slice(11, 16);
                  
                  let estTime = schedTime;
                  if (f.status === 'Delayed' && f.delay_duration_minutes) {
                    const originalDate = new Date(boardType === 'departures' ? f.scheduled_departure : f.scheduled_arrival);
                    const revised = new Date(originalDate.getTime() + f.delay_duration_minutes * 60000);
                    estTime = revised.toTimeString().slice(0, 5);
                  }

                  const isCancelled = f.status === 'Cancelled';
                  const isDelayed = f.status === 'Delayed';

                  return (
                    <tr
                      key={f.flight_id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-amber-300">
                        {f.flight_number}
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold text-white">
                        {targetCity}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-300">
                        {schedTime}
                      </td>
                      <td
                        className={`py-3 px-4 text-center font-bold ${
                          isDelayed ? 'text-amber-400' : isCancelled ? 'text-rose-500' : 'text-emerald-400'
                        }`}
                      >
                        {isCancelled ? 'CANCELLED' : estTime}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-300">
                        {['A4', 'B12', 'C7', 'D2', 'B19', 'A11'][(f.flight_id + i) % 6]}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isCancelled
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : isDelayed
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {f.status}
                          {isDelayed && f.delay_duration_minutes ? ` (+${f.delay_duration_minutes}m)` : ''}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
