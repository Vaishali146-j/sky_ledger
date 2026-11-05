import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Flight, DelayRecord, Aircraft, Booking, CrewMember } from '../../types';
import {
  Plane,
  AlertTriangle,
  XCircle,
  Ticket,
  DollarSign,
  Users,
  Wrench,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [delays, setDelays] = useState<DelayRecord[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.searchFlights({ limit: 100 }),
      apiClient.getDelayLogs(),
      apiClient.getAircraftList(),
      apiClient.getUserBookings(),
      apiClient.getCrewList(),
    ]).then(([fRes, dRes, aRes, bRes, cRes]) => {
      if (fRes.data) setFlights(fRes.data);
      if (dRes.data) setDelays(dRes.data);
      if (aRes.data) setAircraft(aRes.data);
      if (bRes.data) setBookings(bRes.data);
      if (cRes.data) setCrew(cRes.data);
      setLoading(false);
    });
  }, []);

  // Compute KPI metrics
  const totalFlights = flights.length;
  const delayedFlights = flights.filter((f) => f.status === 'Delayed').length;
  const cancelledFlights = flights.filter((f) => f.status === 'Cancelled').length;
  const onTimeFlights = flights.filter((f) => f.status === 'On-Time').length;

  const delayedPct = totalFlights > 0 ? Math.round((delayedFlights / totalFlights) * 100) : 0;
  const cancelledPct = totalFlights > 0 ? Math.round((cancelledFlights / totalFlights) * 100) : 0;

  const totalBookings = bookings.length;
  const grossRevenue = bookings.reduce((acc, b) => acc + (b.booking_status === 'Confirmed' ? Number(b.total_fare) : 0), 0);
  const maintenanceDueCount = aircraft.filter((a) => (a.days_since_maintenance || 0) > 180).length;

  // Chart 1: Delay Reasons Distribution
  const delayReasonsData = [
    { name: 'Weather', count: delays.filter((d) => d.reason_code === 'Weather').length, color: '#0284c7' },
    { name: 'Mechanical', count: delays.filter((d) => d.reason_code === 'Mechanical').length, color: '#dc2626' },
    { name: 'Air Traffic', count: delays.filter((d) => d.reason_code === 'Air Traffic').length, color: '#d97706' },
    { name: 'Crew Shortage', count: delays.filter((d) => d.reason_code === 'Crew Shortage').length, color: '#7c3aed' },
  ];

  // Chart 2: NYC Hub Volume Comparison
  const hubVolumeData = [
    {
      hub: 'JFK',
      onTime: flights.filter((f) => f.origin_airport_id === 'JFK' && f.status === 'On-Time').length,
      delayed: flights.filter((f) => f.origin_airport_id === 'JFK' && f.status === 'Delayed').length,
      cancelled: flights.filter((f) => f.origin_airport_id === 'JFK' && f.status === 'Cancelled').length,
    },
    {
      hub: 'LGA',
      onTime: flights.filter((f) => f.origin_airport_id === 'LGA' && f.status === 'On-Time').length,
      delayed: flights.filter((f) => f.origin_airport_id === 'LGA' && f.status === 'Delayed').length,
      cancelled: flights.filter((f) => f.origin_airport_id === 'LGA' && f.status === 'Cancelled').length,
    },
    {
      hub: 'EWR',
      onTime: flights.filter((f) => f.origin_airport_id === 'EWR' && f.status === 'On-Time').length,
      delayed: flights.filter((f) => f.origin_airport_id === 'EWR' && f.status === 'Delayed').length,
      cancelled: flights.filter((f) => f.origin_airport_id === 'EWR' && f.status === 'Cancelled').length,
    },
  ];

  // Chart 3: Top Destinations
  const topDestsMap = new Map<string, number>();
  flights.forEach((f) => {
    topDestsMap.set(f.destination_airport_id, (topDestsMap.get(f.destination_airport_id) || 0) + 1);
  });
  const topDestsData = Array.from(topDestsMap.entries())
    .map(([dest, count]) => ({ dest, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Chart 4: Daily Flights trend (Jan 1-7)
  const dailyFlightsData = [
    { day: '01 Jan', flights: 14, delays: 4 },
    { day: '02 Jan', flights: 5, delays: 1 },
    { day: '03 Jan', flights: 3, delays: 1 },
    { day: '04 Jan', flights: 2, delays: 0 },
    { day: '05 Jan', flights: 2, delays: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* 7 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <Plane className="w-5 h-5 text-[#0B2E5C] mx-auto mb-1" />
          <div className="text-xl font-black text-slate-900 font-mono">{totalFlights}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Flights</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <div className="text-xl font-black text-amber-600 font-mono">{delayedPct}%</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">% Delayed</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <XCircle className="w-5 h-5 text-rose-500 mx-auto mb-1" />
          <div className="text-xl font-black text-rose-600 font-mono">{cancelledPct}%</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">% Cancelled</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <Ticket className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <div className="text-xl font-black text-slate-900 font-mono">{totalBookings}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bookings</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <div className="text-xl font-black text-emerald-700 font-mono">
            ${grossRevenue.toFixed(0)}
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gross Rev.</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <Users className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
          <div className="text-xl font-black text-slate-900 font-mono">{crew.length}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Crew Force</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <Wrench className="w-5 h-5 text-rose-600 mx-auto mb-1" />
          <div className="text-xl font-black text-rose-700 font-mono">{maintenanceDueCount}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Maint. Due</div>
        </div>
      </div>

      {/* Recharts Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Delay Reasons Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm">
          <h3 className="font-bold text-sm text-[#0B2E5C] mb-3 flex items-center justify-between pb-2 border-b">
            <span>Delay Reasons Ledger Distribution</span>
            <span className="text-[10px] text-slate-500 font-normal">delay_ledger GROUP BY</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={delayReasonsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  label={(entry: any) => `${entry.name}: ${entry.value}`}
                >
                  {delayReasonsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: NYC Hub Volume & Reliability */}
        <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm">
          <h3 className="font-bold text-sm text-[#0B2E5C] mb-3 flex items-center justify-between pb-2 border-b">
            <span>NYC Hub Volume & Status Comparison</span>
            <span className="text-[10px] text-slate-500 font-normal">JFK vs LGA vs EWR</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hubVolumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hub" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="onTime" name="On-Time" fill="#16a34a" />
                <Bar dataKey="delayed" name="Delayed" fill="#f59e0b" />
                <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Top Destination Airports */}
        <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm">
          <h3 className="font-bold text-sm text-[#0B2E5C] mb-3 flex items-center justify-between pb-2 border-b">
            <span>Top Scheduled Destinations</span>
            <span className="text-[10px] text-slate-500 font-normal">Flight Frequencies</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDestsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="dest" type="category" />
                <Tooltip />
                <Bar dataKey="count" name="Flights" fill="#0B2E5C" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Daily Flights & Delay Frequency */}
        <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm">
          <h3 className="font-bold text-sm text-[#0B2E5C] mb-3 flex items-center justify-between pb-2 border-b">
            <span>January 2013 Flights vs Delays Trend</span>
            <span className="text-[10px] text-slate-500 font-normal">Timeline</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyFlightsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="flights" name="Scheduled" stroke="#0B2E5C" strokeWidth={2} />
                <Line type="monotone" dataKey="delays" name="Delayed" stroke="#ea580c" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
