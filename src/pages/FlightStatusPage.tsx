import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Flight } from '../types';
import { FlightProgress } from '../components/visuals/FlightProgress';
import { Search, Plane, AlertTriangle, Calendar, Clock, CheckCircle } from 'lucide-react';

export const FlightStatusPage: React.FC = () => {
  const [searchType, setSearchType] = useState<'number' | 'route'>('number');
  const [flightNumber, setFlightNumber] = useState('UA-1545');
  const [origin, setOrigin] = useState('EWR');
  const [destination, setDestination] = useState('ORD');
  const [flightDate, setFlightDate] = useState('2013-01-01');

  const [flight, setFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (quickNum?: string) => {
    setLoading(true);
    setError(null);
    setFlight(null);

    const numToSearch = quickNum || flightNumber;

    if (searchType === 'number' || quickNum) {
      const res = await apiClient.searchFlights({
        search: numToSearch.trim(),
        date: flightDate,
        limit: 1,
      });
      setLoading(false);

      if (res.success && res.data && res.data.length > 0) {
        setFlight(res.data[0]);
      } else {
        setError(`No flight records found for "${numToSearch}" on ${flightDate}`);
      }
    } else {
      const res = await apiClient.searchFlights({
        origin,
        destination,
        date: flightDate,
        limit: 1,
      });
      setLoading(false);

      if (res.success && res.data && res.data.length > 0) {
        setFlight(res.data[0]);
      } else {
        setError(`No flights found between ${origin} and ${destination} on ${flightDate}`);
      }
    }
  };

  useEffect(() => {
    // Initial auto-lookup of default flight UA-1545
    handleSearch('UA-1545');
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Search Header Card */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0B2E5C] mb-1">
          Live Flight Status & Airspace Progress Tracking
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Query current flight operational status, scheduled progress, and official delay logs.
        </p>

        {/* Tab switch: By Flight Number vs By Route */}
        <div className="flex gap-4 border-b border-slate-200 pb-3 mb-4 text-xs font-bold">
          <button
            onClick={() => setSearchType('number')}
            className={`pb-1 border-b-2 transition-colors ${
              searchType === 'number'
                ? 'border-[#0B2E5C] text-[#0B2E5C]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Search by Flight Number
          </button>
          <button
            onClick={() => setSearchType('route')}
            className={`pb-1 border-b-2 transition-colors ${
              searchType === 'route'
                ? 'border-[#0B2E5C] text-[#0B2E5C]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Search by Route
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {searchType === 'number' ? (
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Flight Number
              </label>
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                placeholder="e.g. UA-1545 or 1545"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none"
              />
            </div>
          ) : (
            <>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  From (NYC Hub)
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-bold text-sm"
                >
                  <option value="JFK">JFK — New York</option>
                  <option value="LGA">LGA — LaGuardia</option>
                  <option value="EWR">EWR — Newark</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  To (Destination)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value.toUpperCase())}
                  placeholder="e.g. ORD"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-bold text-sm uppercase"
                />
              </div>
            </>
          )}

          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Date (Year 2013)
            </label>
            <input
              type="date"
              min="2013-01-01"
              max="2013-12-31"
              value={flightDate}
              onChange={(e) => setFlightDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-mono text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#F57C00] hover:bg-orange-600 text-white font-extrabold rounded shadow text-xs uppercase tracking-wider transition-colors"
            >
              {loading ? 'Tracking...' : 'Search Status'}
            </button>
          </div>
        </div>

        {/* Quick Demo Flights */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Quick Samples:</span>
          {[
            { num: 'UA-1545', desc: 'Delayed (Mechanical)' },
            { num: 'AA-843', desc: 'On-Time (JFK->LAX)' },
            { num: 'DL-1204', desc: 'On-Time (LGA->ATL)' },
            { num: 'UA-382', desc: 'Cancelled' },
          ].map((item) => (
            <button
              key={item.num}
              onClick={() => {
                setFlightNumber(item.num);
                handleSearch(item.num);
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-[#0B2E5C] border border-slate-300 rounded text-[11px] font-semibold"
            >
              <strong>{item.num}</strong> ({item.desc})
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Flight Status Results Card */}
      {flight && (
        <div className="space-y-6">
          {/* Progress Visual Tracker */}
          <FlightProgress flight={flight} currentTimeStr={`${flightDate} 10:00:00`} />

          {/* Delay Details Card if Delayed */}
          {flight.status === 'Delayed' && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-3 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-amber-950 text-sm">
                  Operations Advisory: Flight Delayed
                </h4>
                <p className="text-amber-900 mt-0.5 leading-relaxed">
                  Flight {flight.flight_number} is operating behind published schedule by{' '}
                  <strong>{flight.delay_duration_minutes || 33} minutes</strong>. Primary logged cause:{' '}
                  <strong className="underline">{flight.delay_reason || 'Air Traffic Congestion'}</strong>.
                </p>
                <div className="mt-2 text-[11px] text-amber-800 font-mono">
                  delay_ledger log recorded • Gate B14 Departure queue revised
                </div>
              </div>
            </div>
          )}

          {/* Cancelled Notice */}
          {flight.status === 'Cancelled' && (
            <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-xl text-xs text-rose-900">
              <h4 className="font-bold text-sm text-rose-950 mb-1">Flight Operation Cancelled</h4>
              <p>
                Passengers are entitled to full refund under civil aviation regulations or automated rebooking.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
