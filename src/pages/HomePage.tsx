import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { HeroPlane } from '../components/visuals/HeroPlane';
import { RouteMapSvg } from '../components/visuals/RouteMapSvg';
import { AIRPORTS } from '../data/airportsData';
import { FlightSearchParams, TravelClass } from '../types';
import { Calendar, Users, Plane, ArrowRightLeft, Search, Clock, Compass } from 'lucide-react';

interface HomePageProps {
  onSearch: (params: FlightSearchParams) => void;
  onQuickRouteSelect: (origin: string, dest: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSearch, onQuickRouteSelect }) => {
  const { t } = useApp();

  const [origin, setOrigin] = useState('JFK');
  const [destination, setDestination] = useState('LAX');
  const [departureDate, setDepartureDate] = useState('2013-01-01');
  const [returnDate, setReturnDate] = useState('2013-01-05');
  const [passengers, setPassengers] = useState(1);
  const [travelClass, setTravelClass] = useState<TravelClass>('Economy');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSwapAirports = () => {
    // Only swap if dest is an NYC hub
    if (['JFK', 'LGA', 'EWR'].includes(destination)) {
      const temp = origin;
      setOrigin(destination);
      setDestination(temp);
    } else {
      alert('In this 2013 dataset, all scheduled flights originate from NYC hubs (JFK, LGA, EWR).');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin === destination) {
      alert('Origin and destination cannot be the same airport');
      return;
    }
    if (isRoundTrip && new Date(returnDate) < new Date(departureDate)) {
      alert('Return date must be on or after departure date');
      return;
    }

    onSearch({
      origin,
      destination,
      departureDate,
      returnDate: isRoundTrip ? returnDate : undefined,
      passengers,
      travelClass,
      isRoundTrip,
    });
  };

  // Quick route presets
  const quickRoutes = [
    { from: 'JFK', to: 'LAX', label: 'JFK ➔ Los Angeles (LAX)' },
    { from: 'LGA', to: 'ORD', label: 'LGA ➔ Chicago (ORD)' },
    { from: 'EWR', to: 'SFO', label: 'EWR ➔ San Francisco (SFO)' },
    { from: 'JFK', to: 'MIA', label: 'JFK ➔ Miami (MIA)' },
    { from: 'EWR', to: 'MCO', label: 'EWR ➔ Orlando (MCO)' },
    { from: 'JFK', to: 'BOS', label: 'JFK ➔ Boston (BOS)' },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Hero Airliner Visual Banner */}
      <div className="relative">
        <HeroPlane />

        {/* Floating Search Container */}
        <div className="max-w-6xl mx-auto px-4 -mt-16 md:-mt-20 relative z-20">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-slate-200 overflow-hidden">
            {/* Search Header Bar */}
            <div className="bg-[#0B2E5C] text-white px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#F57C00]">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-amber-400 rotate-45" />
                <h2 className="text-base font-extrabold uppercase tracking-wide">
                  {t('search.title')}
                </h2>
                <span className="text-xs text-blue-200 hidden sm:inline">
                  — {t('search.subtitle')}
                </span>
              </div>

              {/* Trip Type Selector */}
              <div className="flex items-center gap-4 text-xs font-bold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tripType"
                    checked={!isRoundTrip}
                    onChange={() => setIsRoundTrip(false)}
                    className="accent-[#F57C00]"
                  />
                  <span>{t('search.oneWay')}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tripType"
                    checked={isRoundTrip}
                    onChange={() => setIsRoundTrip(true)}
                    className="accent-[#F57C00]"
                  />
                  <span>{t('search.roundTrip')}</span>
                </label>
              </div>
            </div>

            {/* Main Flight Search Form */}
            <form onSubmit={handleFormSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Origin Dropdown (JFK, LGA, EWR) */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    {t('search.from')}
                  </label>
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-bold text-sm text-[#0B2E5C] focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none"
                  >
                    <option value="JFK">New York JFK — Kennedy Intl</option>
                    <option value="LGA">New York LGA — LaGuardia</option>
                    <option value="EWR">Newark EWR — Liberty Intl</option>
                  </select>
                </div>

                {/* Swap Button */}
                <div className="hidden md:flex md:col-span-1 justify-center pb-2">
                  <button
                    type="button"
                    onClick={handleSwapAirports}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500 border border-slate-300 transition-colors"
                    title="Swap Airports"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Destination Dropdown (102 Airports) */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    {t('search.to')}
                  </label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-semibold text-sm text-slate-900 focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none"
                  >
                    {AIRPORTS.map((a) => (
                      <option key={a.airport_id} value={a.airport_id}>
                        {a.city} ({a.airport_id}) — {a.airport_name.slice(0, 32)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Departure Date (Limited to 2013) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    {t('search.departure')}
                  </label>
                  <input
                    type="date"
                    min="2013-01-01"
                    max="2013-12-31"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-mono text-sm text-slate-900 focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none"
                  />
                </div>

                {/* Return Date (if roundtrip) */}
                {isRoundTrip && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      {t('search.return')}
                    </label>
                    <input
                      type="date"
                      min={departureDate}
                      max="2013-12-31"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-mono text-sm text-slate-900 focus:ring-2 focus:ring-[#0B2E5C] focus:outline-none"
                    />
                  </div>
                )}

                {/* Submit Search Button */}
                <div className={isRoundTrip ? 'md:col-span-12 mt-2' : 'md:col-span-2'}>
                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-[#F57C00] hover:bg-orange-600 text-white font-extrabold text-sm rounded shadow-md uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    <Search className="w-4 h-4" />
                    <span>{t('search.searchBtn')}</span>
                  </button>
                </div>
              </div>

              {/* Lower Passenger & Class Options Bar */}
              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-6">
                  {/* Passengers Count */}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-700">Passengers:</span>
                    <select
                      value={passengers}
                      onChange={(e) => setPassengers(Number(e.target.value))}
                      className="p-1 border border-slate-300 rounded font-bold text-slate-800"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Adult' : 'Passengers'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Travel Class */}
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-700">Cabin Class:</span>
                    <select
                      value={travelClass}
                      onChange={(e) => setTravelClass(e.target.value as TravelClass)}
                      className="p-1 border border-slate-300 rounded font-bold text-slate-800"
                    >
                      <option value="Economy">Economy Class (Standard)</option>
                      <option value="Business">Business Class (2.2x multiplier)</option>
                    </select>
                  </div>
                </div>

                {/* Demo Default Notice */}
                <div className="text-slate-500 font-mono text-[11px] bg-slate-100 px-2 py-1 rounded">
                  Dataset Default: <strong>2013-01-01</strong> (~10,000 flights)
                </div>
              </div>
            </form>

            {/* Quick Popular Route Chips */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                Popular Routes:
              </span>
              {quickRoutes.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setOrigin(r.from);
                    setDestination(r.to);
                    onQuickRouteSelect(r.from, r.to);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-300 rounded-full text-slate-700 text-[11px] font-semibold transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive US Route Map & Hub Summary */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SVG Map (8 cols) */}
          <div className="lg:col-span-8">
            <RouteMapSvg
              selectedOrigin={origin}
              selectedDest={destination}
              onSelectAirport={(code) => setDestination(code)}
            />
          </div>

          {/* Quick Hub Statistics & Civil Portal Highlights (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-[#0B2E5C] text-sm mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
                <span>NYC Airspace Hubs</span>
                <span className="text-[10px] text-slate-500 font-normal">Year 2013</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-2.5 bg-blue-50 border-l-4 border-blue-600 rounded">
                  <div className="font-bold text-blue-900">John F. Kennedy Intl (JFK)</div>
                  <div className="text-slate-600 text-[11px]">
                    Major transcontinental & international terminal. Low ground delay index.
                  </div>
                </div>
                <div className="p-2.5 bg-emerald-50 border-l-4 border-emerald-600 rounded">
                  <div className="font-bold text-emerald-900">LaGuardia Airport (LGA)</div>
                  <div className="text-slate-600 text-[11px]">
                    Regional corridor & shuttle routes. Perimeter rule enforced (1,500 mi).
                  </div>
                </div>
                <div className="p-2.5 bg-amber-50 border-l-4 border-amber-600 rounded">
                  <div className="font-bold text-amber-900">Newark Liberty Intl (EWR)</div>
                  <div className="text-slate-600 text-[11px]">
                    Dense multi-carrier hub. Historical delay rate elevated in peak hours.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#0B2E5C] to-[#05172e] text-white p-5 rounded-xl shadow-md space-y-2">
              <div className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                Fare Calculation Engine
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Deterministic Great-Circle distance fares with class multipliers and exact 5% GST itemization.
              </p>
              <div className="text-[11px] font-mono text-slate-300 pt-1">
                Distance × Rate + Class Surcharge + 5% GST
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
