import React, { useState, useEffect, useMemo } from 'react';
import { Flight, FlightSearchParams, TravelClass } from '../types';
import { apiClient } from '../api/client';
import { RouteArc } from '../components/visuals/RouteArc';
import { calculateFare, calculateDelayPrediction } from '../utils/fareCalculator';
import { getAirport } from '../data/airportsData';
import {
  Filter,
  ArrowUpDown,
  Calendar,
  AlertCircle,
  Clock,
  Plane,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle,
} from 'lucide-react';

interface SearchResultsPageProps {
  searchParams: FlightSearchParams;
  onSelectFlightToBook: (flight: Flight, travelClass: TravelClass, passengersCount: number) => void;
  onModifySearch: () => void;
}

export const SearchResultsPage: React.FC<SearchResultsPageProps> = ({
  searchParams,
  onSelectFlightToBook,
  onModifySearch,
}) => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlightDetail, setSelectedFlightDetail] = useState<Flight | null>(null);

  // Filters & Sorting state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [timeSlotFilter, setTimeSlotFilter] = useState<string>('ALL');
  const [aircraftFilter, setAircraftFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'departure' | 'arrival' | 'duration' | 'price'>('departure');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Selected date in the +/- 3 days calendar
  const [activeDate, setActiveDate] = useState<string>(searchParams.departureDate);

  useEffect(() => {
    setLoading(true);
    apiClient
      .searchFlights({
        origin: searchParams.origin,
        destination: searchParams.destination,
        date: activeDate,
        limit: 50,
      })
      .then((res) => {
        if (res.success && res.data) {
          setFlights(res.data);
        }
        setLoading(false);
      });
  }, [searchParams.origin, searchParams.destination, activeDate]);

  // +/- 3 Days Date Ribbon Generation
  const calendarDates = useMemo(() => {
    const list: Array<{ dateStr: string; label: string; fare: number; isSelected: boolean }> = [];
    const base = new Date(searchParams.departureDate);

    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);

      // Only within 2013
      if (d.getFullYear() === 2013) {
        const dateStr = d.toISOString().slice(0, 10);
        const fare = calculateFare(searchParams.origin, searchParams.destination, searchParams.travelClass).totalFare;
        // Minor dynamic day variation for realistic price calendar feel
        const dayVariance = (offset * 12 + 100) % 35;
        const finalFare = Math.round((fare + dayVariance) * 100) / 100;

        const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        list.push({
          dateStr,
          label: dayName,
          fare: finalFare,
          isSelected: dateStr === activeDate,
        });
      }
    }
    return list;
  }, [searchParams, activeDate]);

  // Unique aircraft models for filter
  const aircraftModels = useMemo(() => {
    const set = new Set<string>();
    flights.forEach((f) => {
      if (f.aircraft_model) set.add(f.aircraft_model);
    });
    return Array.from(set);
  }, [flights]);

  // Filtered & Sorted Flights
  const processedFlights = useMemo(() => {
    let result = [...flights];

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((f) => f.status === statusFilter);
    }

    // Departure time slots
    if (timeSlotFilter !== 'ALL') {
      result = result.filter((f) => {
        const hour = new Date(f.scheduled_departure).getHours();
        if (timeSlotFilter === 'MORNING') return hour >= 6 && hour < 12;
        if (timeSlotFilter === 'AFTERNOON') return hour >= 12 && hour < 18;
        if (timeSlotFilter === 'EVENING') return hour >= 18 && hour < 24;
        if (timeSlotFilter === 'NIGHT') return hour >= 0 && hour < 6;
        return true;
      });
    }

    // Aircraft filter
    if (aircraftFilter !== 'ALL') {
      result = result.filter((f) => f.aircraft_model === aircraftFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'departure') {
        comp = new Date(a.scheduled_departure).getTime() - new Date(b.scheduled_departure).getTime();
      } else if (sortBy === 'arrival') {
        comp = new Date(a.scheduled_arrival).getTime() - new Date(b.scheduled_arrival).getTime();
      } else if (sortBy === 'duration') {
        const durA = new Date(a.scheduled_arrival).getTime() - new Date(a.scheduled_departure).getTime();
        const durB = new Date(b.scheduled_arrival).getTime() - new Date(b.scheduled_departure).getTime();
        comp = durA - durB;
      } else if (sortBy === 'price') {
        const fareA = calculateFare(a.origin_airport_id, a.destination_airport_id, searchParams.travelClass).totalFare;
        const fareB = calculateFare(b.origin_airport_id, b.destination_airport_id, searchParams.travelClass).totalFare;
        comp = fareA - fareB;
      }
      return sortOrder === 'ASC' ? comp : -comp;
    });

    return result;
  }, [flights, statusFilter, timeSlotFilter, aircraftFilter, sortBy, sortOrder, searchParams.travelClass]);

  const originAirport = getAirport(searchParams.origin);
  const destAirport = getAirport(searchParams.destination);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Route & Search Summary Bar */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-[#0B2E5C]">
              {searchParams.origin} ➔ {searchParams.destination}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0B2E5C] font-bold">
              {searchParams.travelClass} Class
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
              {searchParams.passengers} Passenger{searchParams.passengers > 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {originAirport.city} ({searchParams.origin}) to {destAirport.city} ({searchParams.destination}) • Date: {activeDate}
          </div>
        </div>

        <button
          onClick={onModifySearch}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#0B2E5C] border border-slate-300 rounded font-bold text-xs transition-colors"
        >
          Modify Search
        </button>
      </div>

      {/* +/- 3 Days Price Calendar Ribbon */}
      <div className="bg-slate-100 p-2 rounded-xl border border-slate-300 overflow-x-auto">
        <div className="text-[11px] font-bold text-slate-500 uppercase px-2 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Fare Calendar (±3 Days Lowest Fares)</span>
          </span>
          <span className="text-slate-400 font-normal">Click to switch flight dates</span>
        </div>
        <div className="flex items-center gap-2 min-w-max">
          {calendarDates.map((cd) => (
            <button
              key={cd.dateStr}
              type="button"
              onClick={() => setActiveDate(cd.dateStr)}
              className={`flex-1 min-w-[120px] p-2 rounded-lg text-center border transition-all ${
                cd.isSelected
                  ? 'bg-[#0B2E5C] text-white border-[#0B2E5C] shadow-md scale-102'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50'
              }`}
            >
              <div className="text-[11px] font-semibold">{cd.label}</div>
              <div
                className={`text-sm font-bold font-mono mt-0.5 ${
                  cd.isSelected ? 'text-amber-300' : 'text-emerald-700'
                }`}
              >
                ${cd.fare}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Grid: Filters Sidebar + Flight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Filters Sidebar (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-bold text-[#0B2E5C] flex items-center gap-1.5 uppercase tracking-wider text-xs">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters & Sorting</span>
            </span>
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setTimeSlotFilter('ALL');
                setAircraftFilter('ALL');
                setSortBy('departure');
              }}
              className="text-[11px] text-[#F57C00] font-bold hover:underline"
            >
              Reset
            </button>
          </div>

          {/* Sort By */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">
              Sort Results By
            </label>
            <div className="space-y-1">
              {[
                { id: 'departure', label: 'Departure Time' },
                { id: 'arrival', label: 'Arrival Time' },
                { id: 'duration', label: 'Flight Duration' },
                { id: 'price', label: 'Total Price' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    if (sortBy === s.id) {
                      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    } else {
                      setSortBy(s.id as any);
                      setSortOrder('ASC');
                    }
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                    sortBy === s.id
                      ? 'bg-blue-50 text-[#0B2E5C] font-bold border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{s.label}</span>
                  {sortBy === s.id && (
                    <span className="text-[10px] font-mono text-slate-500">
                      {sortOrder === 'ASC' ? '▲ Low-High' : '▼ High-Low'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Flight Status Filter */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">
              Flight Status
            </label>
            <div className="space-y-1">
              {[
                { id: 'ALL', label: 'All Statuses' },
                { id: 'On-Time', label: 'On-Time Only' },
                { id: 'Delayed', label: 'Delayed Flights' },
                { id: 'Cancelled', label: 'Cancelled Flights' },
              ].map((st) => (
                <label key={st.id} className="flex items-center gap-2 cursor-pointer text-slate-700 py-0.5">
                  <input
                    type="radio"
                    name="statusFilter"
                    checked={statusFilter === st.id}
                    onChange={() => setStatusFilter(st.id)}
                    className="accent-[#0B2E5C]"
                  />
                  <span>{st.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Departure Time Slots */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">
              Departure Slot
            </label>
            <div className="space-y-1">
              {[
                { id: 'ALL', label: 'Any Time' },
                { id: 'MORNING', label: 'Morning (06:00 - 12:00)' },
                { id: 'AFTERNOON', label: 'Afternoon (12:00 - 18:00)' },
                { id: 'EVENING', label: 'Evening (18:00 - 24:00)' },
                { id: 'NIGHT', label: 'Night (00:00 - 06:00)' },
              ].map((slot) => (
                <label key={slot.id} className="flex items-center gap-2 cursor-pointer text-slate-700 py-0.5">
                  <input
                    type="radio"
                    name="slotFilter"
                    checked={timeSlotFilter === slot.id}
                    onChange={() => setTimeSlotFilter(slot.id)}
                    className="accent-[#0B2E5C]"
                  />
                  <span>{slot.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Aircraft Model Filter */}
          {aircraftModels.length > 0 && (
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">
                Aircraft Fleet Model
              </label>
              <select
                value={aircraftFilter}
                onChange={(e) => setAircraftFilter(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded font-medium"
              >
                <option value="ALL">All Aircraft Types</option>
                {aircraftModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Flight Cards Stream (9 cols) */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600 pb-1">
            <span>
              Showing <strong>{processedFlights.length}</strong> scheduled flights on <strong>{activeDate}</strong>
            </span>
            <span className="font-semibold text-emerald-700">
              Prices include all airport charges + 5% Aviation GST
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-36 bg-slate-200 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : processedFlights.length === 0 ? (
            <div className="p-8 bg-white border border-slate-300 rounded-xl text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <div className="text-base font-bold text-slate-800">
                No flights matched your filter criteria
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try selecting a different date in the ±3 days calendar above, or reset your filters. In the Jan 2013 dataset, flights operate daily to major hubs.
              </p>
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setTimeSlotFilter('ALL');
                  setAircraftFilter('ALL');
                }}
                className="px-4 py-2 bg-[#0B2E5C] text-white rounded text-xs font-bold"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            processedFlights.map((flight) => {
              const depDate = new Date(flight.scheduled_departure);
              const arrDate = new Date(flight.scheduled_arrival);
              const diffMs = arrDate.getTime() - depDate.getTime();
              const hours = Math.floor(diffMs / (1000 * 60 * 60));
              const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              const durationStr = `${hours}h ${mins}m`;

              const fareBreakdown = calculateFare(
                flight.origin_airport_id,
                flight.destination_airport_id,
                searchParams.travelClass
              );
              const totalFareForParty = Math.round(fareBreakdown.totalFare * searchParams.passengers * 100) / 100;

              const isCancelled = flight.status === 'Cancelled';
              const isDelayed = flight.status === 'Delayed';
              const capacity = flight.aircraft_capacity || 150;
              const booked = flight.booked_seats_count || 0;
              const seatsLeft = Math.max(capacity - booked, 0);
              const isSoldOut = seatsLeft < searchParams.passengers;

              // Delay Risk Assessment
              const delayRisk = calculateDelayPrediction(
                flight.origin_airport_id,
                flight.scheduled_departure,
                flight.on_time_percentage || 82
              );

              return (
                <div
                  key={flight.flight_id}
                  className={`bg-white border rounded-xl shadow-sm transition-all overflow-hidden ${
                    isCancelled
                      ? 'opacity-60 border-rose-200 bg-rose-50/20'
                      : 'border-slate-300 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      {/* Left: Flight Number & Equipment */}
                      <div className="w-full md:w-44 shrink-0">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-[#0B2E5C]" />
                          <span className="text-base font-black text-[#0B2E5C] font-mono">
                            {flight.flight_number}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {flight.aircraft_model || 'Boeing 737'} • Cap: {capacity}
                        </div>

                        {/* Status Badge */}
                        <div className="mt-2 flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                              isCancelled
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : isDelayed
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {flight.status}
                            {isDelayed && flight.delay_duration_minutes
                              ? ` (+${flight.delay_duration_minutes}m)`
                              : ''}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Route & Times with RouteArc SVG */}
                      <div className="flex-1 flex items-center justify-between w-full max-w-md px-2">
                        {/* Origin */}
                        <div className="text-left">
                          <div className="text-xl font-black text-slate-900 font-mono">
                            {flight.scheduled_departure.slice(11, 16)}
                          </div>
                          <div className="text-xs font-bold text-[#0B2E5C]">
                            {flight.origin_airport_id}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[90px]">
                            {flight.origin_city}
                          </div>
                        </div>

                        {/* Directional Curved Route Visual */}
                        <RouteArc
                          originCode={flight.origin_airport_id}
                          destCode={flight.destination_airport_id}
                          duration={durationStr}
                          status={flight.status}
                        />

                        {/* Destination */}
                        <div className="text-right">
                          <div className="text-xl font-black text-slate-900 font-mono">
                            {flight.scheduled_arrival.slice(11, 16)}
                          </div>
                          <div className="text-xs font-bold text-emerald-800">
                            {flight.destination_airport_id}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[90px]">
                            {flight.destination_city}
                          </div>
                        </div>
                      </div>

                      {/* Right: Fare, Seats & Booking Action */}
                      <div className="w-full md:w-48 text-left md:text-right shrink-0 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-5">
                        <div className="text-xl font-black text-slate-900 font-mono">
                          ${fareBreakdown.totalFare}
                          <span className="text-[10px] text-slate-500 font-normal"> / person</span>
                        </div>
                        {searchParams.passengers > 1 && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            Total: ${totalFareForParty} ({searchParams.passengers} pax)
                          </div>
                        )}

                        <div className="mt-1 text-[11px]">
                          {isSoldOut ? (
                            <span className="text-rose-600 font-bold">Sold Out</span>
                          ) : (
                            <span className="text-slate-500">
                              <strong className="text-slate-800 font-bold">{seatsLeft}</strong> seats left
                            </span>
                          )}
                        </div>

                        {/* Book Flight CTA */}
                        <div className="mt-3">
                          {isCancelled ? (
                            <button
                              disabled
                              className="w-full py-2 bg-slate-200 text-slate-500 font-bold rounded text-xs cursor-not-allowed"
                            >
                              Flight Cancelled
                            </button>
                          ) : isSoldOut ? (
                            <button
                              disabled
                              className="w-full py-2 bg-slate-200 text-slate-500 font-bold rounded text-xs cursor-not-allowed"
                            >
                              No Seats Left
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                onSelectFlightToBook(flight, searchParams.travelClass, searchParams.passengers)
                              }
                              className="w-full py-2 px-3 bg-[#F57C00] hover:bg-orange-600 text-white font-extrabold rounded shadow text-xs uppercase tracking-wider transition-colors"
                            >
                              Book Flight
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Lower Info & Delay Prediction Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-3">
                        {/* Delay Prediction Hint */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500">Delay Risk:</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              delayRisk.riskLevel === 'Low'
                                ? 'bg-emerald-100 text-emerald-800'
                                : delayRisk.riskLevel === 'Medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                            title={delayRisk.explanation}
                          >
                            {delayRisk.riskLevel} Risk ({delayRisk.riskScorePercent}%)
                          </span>
                        </div>

                        <span className="text-slate-300">|</span>

                        {/* Route Historical On-Time Performance */}
                        <span className="text-slate-500">
                          Route Reliability:{' '}
                          <strong className="text-slate-700">
                            {flight.on_time_percentage || 84}% On-Time
                          </strong>
                        </span>
                      </div>

                      {/* Expand Details Trigger */}
                      <button
                        onClick={() =>
                          setSelectedFlightDetail(
                            selectedFlightDetail?.flight_id === flight.flight_id ? null : flight
                          )
                        }
                        className="text-[#0B2E5C] hover:underline font-bold flex items-center gap-1"
                      >
                        <span>Flight Details & Delay Ledger</span>
                        {selectedFlightDetail?.flight_id === flight.flight_id ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Expandable Flight Details Drawer */}
                    {selectedFlightDetail?.flight_id === flight.flight_id && (
                      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="font-bold text-slate-700 block mb-1">
                              Deterministic Fare Breakdown
                            </span>
                            <div className="space-y-0.5 text-slate-600 font-mono text-[11px]">
                              <div>Base Distance: {fareBreakdown.distanceMiles} miles</div>
                              <div>Base Fare: ${fareBreakdown.baseFare.toFixed(2)}</div>
                              <div>Class Multiplier: {fareBreakdown.classMultiplier}x</div>
                              <div>Fuel & Airport Fees: ${fareBreakdown.fuelAndAirportCharges.toFixed(2)}</div>
                              <div className="text-emerald-700 font-bold">5% Aviation GST: ${fareBreakdown.gstAmount.toFixed(2)}</div>
                              <div className="font-bold text-slate-900 border-t pt-0.5">
                                Total Fare: ${fareBreakdown.totalFare.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div>
                            <span className="font-bold text-slate-700 block mb-1">
                              Delay Prediction Rationale
                            </span>
                            <p className="text-slate-600 text-[11px] leading-relaxed">
                              {delayRisk.explanation}
                            </p>
                            <ul className="list-disc pl-4 mt-1 text-[10px] text-slate-500">
                              {delayRisk.factors.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="font-bold text-slate-700 block mb-1">
                              Equipment & Maintenance Log
                            </span>
                            <div className="text-slate-600 text-[11px] space-y-1">
                              <div>Aircraft: {flight.aircraft_model}</div>
                              <div>Tail Number: {flight.assigned_aircraft_id || 'N/A'}</div>
                              <div>Total Capacity: {capacity} passengers</div>
                              {flight.delay_reason && (
                                <div className="text-amber-800 font-semibold bg-amber-50 p-1.5 rounded border border-amber-200">
                                  Delay Ledger: {flight.delay_duration_minutes}m due to {flight.delay_reason}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
