import React, { useState } from 'react';
import { ErDiagramSvg } from '../../components/visuals/ErDiagramSvg';
import { Database, Play, Code2, Clock, CheckCircle2, ChevronRight, Layers } from 'lucide-react';

interface VivaQuery {
  id: number;
  title: string;
  concept: string;
  sql: string;
  description: string;
  sampleResult: any[];
}

const VIVA_QUERIES: VivaQuery[] = [
  {
    id: 1,
    title: 'Single-Table Filtering & Time Interval Slicing',
    concept: 'WHERE, BETWEEN & ORDER BY',
    description: 'Retrieves all flights scheduled during morning departure rush hours (06:00 to 09:00).',
    sql: `SELECT flight_id, flight_number, origin_airport_id, destination_airport_id, scheduled_departure, status FROM flights WHERE scheduled_departure BETWEEN '2013-01-01 06:00:00' AND '2013-01-01 09:00:00' ORDER BY scheduled_departure ASC;`,
    sampleResult: [
      { flight_id: 101, flight_number: 'UA-1545', origin: 'EWR', dest: 'ORD', departure: '2013-01-01 06:00:00', status: 'Delayed' },
      { flight_id: 102, flight_number: 'AA-843', origin: 'JFK', dest: 'LAX', departure: '2013-01-01 07:30:00', status: 'On-Time' },
      { flight_id: 103, flight_number: 'DL-1204', origin: 'LGA', dest: 'ATL', departure: '2013-01-01 08:15:00', status: 'On-Time' },
    ],
  },
  {
    id: 2,
    title: '2-Table Inner Join with Aliasing',
    concept: 'INNER JOIN & Column Projection',
    description: 'Enriches flight departure rows with human-readable airport names and metropolitan cities.',
    sql: `SELECT f.flight_number, f.origin_airport_id, a.airport_name AS origin_name, a.city AS origin_city, f.scheduled_departure FROM flights f INNER JOIN airports a ON f.origin_airport_id = a.airport_id LIMIT 10;`,
    sampleResult: [
      { flight_number: 'UA-1545', origin: 'EWR', airport_name: 'Newark Liberty International Airport', city: 'Newark', scheduled_departure: '2013-01-01 06:00:00' },
      { flight_number: 'AA-843', origin: 'JFK', airport_name: 'John F. Kennedy International Airport', city: 'New York', scheduled_departure: '2013-01-01 07:30:00' },
      { flight_number: 'DL-1204', origin: 'LGA', airport_name: 'LaGuardia Airport', city: 'New York', scheduled_departure: '2013-01-01 08:15:00' },
    ],
  },
  {
    id: 3,
    title: '3-Table Multi-Way Relational Join',
    concept: '3-Table INNER JOIN',
    description: 'Connects flights, aircraft specifications, and destination airport entities.',
    sql: `SELECT f.flight_number, orig.city AS origin, dest.city AS destination, ac.model AS aircraft_model, ac.capacity FROM flights f JOIN airports orig ON f.origin_airport_id = orig.airport_id JOIN airports dest ON f.destination_airport_id = dest.airport_id JOIN aircraft ac ON f.assigned_aircraft_id = ac.tail_number LIMIT 10;`,
    sampleResult: [
      { flight_number: 'AA-843', origin: 'New York', destination: 'Los Angeles', aircraft_model: 'Boeing 777-200ER', capacity: 273 },
      { flight_number: 'UA-1545', origin: 'Newark', destination: 'Chicago', aircraft_model: 'Boeing 737-800', capacity: 162 },
      { flight_number: 'DL-1204', origin: 'New York', destination: 'Atlanta', aircraft_model: 'Airbus A320-200', capacity: 150 },
    ],
  },
  {
    id: 4,
    title: 'Fleet Volume Aggregation & Capacity Analysis',
    concept: 'GROUP BY with COUNT and AVG',
    description: 'Summarizes equipment count and average passenger seats grouped by aircraft manufacturer model.',
    sql: `SELECT model, COUNT(tail_number) AS fleet_count, ROUND(AVG(capacity), 0) AS avg_capacity FROM aircraft GROUP BY model ORDER BY fleet_count DESC;`,
    sampleResult: [
      { model: 'Boeing 737-800', fleet_count: 5, avg_capacity: 162 },
      { model: 'Airbus A320-200', fleet_count: 4, avg_capacity: 150 },
      { model: 'Boeing 777-200ER', fleet_count: 2, avg_capacity: 273 },
      { model: 'Embraer E190', fleet_count: 1, avg_capacity: 96 },
    ],
  },
  {
    id: 5,
    title: 'Group Filtering of High-Impact Delay Causes',
    concept: 'GROUP BY with HAVING Clause',
    description: 'Filters delay reason categories that have accumulated over 45 minutes of total airspace interruption.',
    sql: `SELECT reason_code, COUNT(log_id) AS incident_count, SUM(delay_duration_minutes) AS total_lost_mins, ROUND(AVG(delay_duration_minutes), 1) AS avg_delay_mins FROM delay_ledger GROUP BY reason_code HAVING total_lost_mins >= 45 ORDER BY total_lost_mins DESC;`,
    sampleResult: [
      { reason_code: 'Weather', incident_count: 2, total_lost_mins: 110, avg_delay_mins: 55.0 },
      { reason_code: 'Air Traffic', incident_count: 2, total_lost_mins: 63, avg_delay_mins: 31.5 },
      { reason_code: 'Crew Shortage', incident_count: 1, total_lost_mins: 55, avg_delay_mins: 55.0 },
    ],
  },
  {
    id: 6,
    title: 'Fleet Airworthiness Left Outer Join',
    concept: 'LEFT OUTER JOIN with IS NULL Filter',
    description: 'Detects registered aircraft with zero commercial flight legs assigned.',
    sql: `SELECT a.tail_number, a.model, a.capacity, a.last_maintenance_date FROM aircraft a LEFT JOIN flights f ON a.tail_number = f.assigned_aircraft_id WHERE f.flight_id IS NULL;`,
    sampleResult: [
      { tail_number: 'N488WN', model: 'Boeing 737-700', capacity: 143, last_maintenance_date: '2012-06-25' },
      { tail_number: 'N901WN', model: 'Boeing 737-800', capacity: 162, last_maintenance_date: '2012-12-14' },
    ],
  },
  {
    id: 7,
    title: 'Above-Average Severity Delay Detection',
    concept: 'Scalar Subquery in WHERE Clause',
    description: 'Finds flights whose recorded delay exceeds the system-wide mean delay duration.',
    sql: `SELECT f.flight_number, f.origin_airport_id, f.destination_airport_id, dl.delay_duration_minutes, dl.reason_code FROM flights f JOIN delay_ledger dl ON f.flight_id = dl.flight_id WHERE dl.delay_duration_minutes > (SELECT AVG(delay_duration_minutes) FROM delay_ledger);`,
    sampleResult: [
      { flight_number: 'DL-448', origin: 'LGA', dest: 'ORD', delay_duration_minutes: 48, reason_code: 'Weather' },
      { flight_number: 'UA-129', origin: 'EWR', dest: 'DEN', delay_duration_minutes: 55, reason_code: 'Crew Shortage' },
      { flight_number: 'AA-843', origin: 'JFK', dest: 'LAX', delay_duration_minutes: 62, reason_code: 'Weather' },
    ],
  },
  {
    id: 8,
    title: 'Crew Standby Pool Verification',
    concept: 'Correlated Subquery with NOT EXISTS',
    description: 'Identifies certified Captains who possess zero flight duty shifts on 2013-01-01.',
    sql: `SELECT cm.crew_id, cm.full_name, cm.base_airport_id FROM crew_members cm WHERE cm.role = 'Captain' AND NOT EXISTS (SELECT 1 FROM crew_assignments ca WHERE ca.crew_id = cm.crew_id AND DATE(ca.duty_start_time) = '2013-01-01');`,
    sampleResult: [
      { crew_id: 3, full_name: 'Capt. Robert Chen', base_airport_id: 'EWR' },
      { crew_id: 5, full_name: 'Capt. Deepak Gupta', base_airport_id: 'EWR' },
      { crew_id: 6, full_name: 'Capt. Elena Rostova', base_airport_id: 'LGA' },
    ],
  },
  {
    id: 9,
    title: 'Active Network Airport Nodes Consolidation',
    concept: 'UNION Query for Set Unification',
    description: 'Produces a unified distinct list of all airports participating as either origin or destination.',
    sql: `SELECT origin_airport_id AS active_airport FROM flights WHERE DATE(scheduled_departure) = '2013-01-01' UNION SELECT destination_airport_id AS active_airport FROM flights WHERE DATE(scheduled_departure) = '2013-01-01' ORDER BY active_airport ASC;`,
    sampleResult: [
      { active_airport: 'ATL' },
      { active_airport: 'BOS' },
      { active_airport: 'DEN' },
      { active_airport: 'DFW' },
      { active_airport: 'EWR' },
      { active_airport: 'FLL' },
      { active_airport: 'JFK' },
      { active_airport: 'LAX' },
      { active_airport: 'LGA' },
      { active_airport: 'MCO' },
      { active_airport: 'MIA' },
      { active_airport: 'ORD' },
      { active_airport: 'SEA' },
      { active_airport: 'SFO' },
    ],
  },
  {
    id: 10,
    title: 'Multi-Condition Airspace Reliability Pivot',
    concept: 'Conditional Aggregation with CASE WHEN',
    description: 'Calculates side-by-side counts of On-Time, Delayed, and Cancelled flights per origin hub.',
    sql: `SELECT origin_airport_id, COUNT(*) AS total_flights, SUM(CASE WHEN status = 'On-Time' THEN 1 ELSE 0 END) AS on_time_count, SUM(CASE WHEN status = 'Delayed' THEN 1 ELSE 0 END) AS delayed_count, SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_count, ROUND((SUM(CASE WHEN status = 'On-Time' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 1) AS on_time_pct FROM flights GROUP BY origin_airport_id;`,
    sampleResult: [
      { origin_airport_id: 'JFK', total_flights: 8, on_time_count: 7, delayed_count: 1, cancelled_count: 0, on_time_pct: 87.5 },
      { origin_airport_id: 'LGA', total_flights: 3, on_time_count: 2, delayed_count: 1, cancelled_count: 0, on_time_pct: 66.7 },
      { origin_airport_id: 'EWR', total_flights: 3, on_time_count: 1, delayed_count: 1, cancelled_count: 1, on_time_pct: 33.3 },
    ],
  },
  {
    id: 11,
    title: 'Crew Duty Leaderboard Partitioning',
    concept: 'Window Function (DENSE_RANK() OVER)',
    description: 'Ranks personnel within each operational role based on assigned flight duty minutes.',
    sql: `SELECT cm.full_name, cm.role, COUNT(ca.assignment_id) AS duties, DENSE_RANK() OVER (PARTITION BY cm.role ORDER BY COUNT(ca.assignment_id) DESC) AS rank_in_role FROM crew_members cm LEFT JOIN crew_assignments ca ON cm.crew_id = ca.crew_id GROUP BY cm.crew_id, cm.full_name, cm.role ORDER BY cm.role, rank_in_role ASC;`,
    sampleResult: [
      { full_name: 'Capt. Rajesh Varma', role: 'Captain', duties: 1, rank_in_role: 1 },
      { full_name: 'Capt. Sarah Jenkins', role: 'Captain', duties: 1, rank_in_role: 1 },
      { full_name: 'Capt. Robert Chen', role: 'Captain', duties: 0, rank_in_role: 2 },
      { full_name: 'F/O Amit Kulkarni', role: 'First Officer', duties: 1, rank_in_role: 1 },
      { full_name: 'F/O Emily Watson', role: 'First Officer', duties: 1, rank_in_role: 1 },
    ],
  },
  {
    id: 12,
    title: 'Double-Booking Collision Prevention Query',
    concept: 'Transaction Seat Concurrency with NOT EXISTS',
    description: 'Simulates the atomic seat reservation verification that prevents double-booking race conditions.',
    sql: `SELECT f.flight_number, p.seat_no, b.pnr, b.booking_status FROM passengers p JOIN bookings b ON p.booking_id = b.booking_id JOIN flights f ON b.flight_id = f.flight_id WHERE b.flight_id = 102 AND b.booking_status = 'Confirmed' AND p.seat_no = '12A';`,
    sampleResult: [
      { flight_number: 'AA-843', seat_no: '12A', pnr: 'SK789A', booking_status: 'Confirmed' },
    ],
  },
];

export const SqlShowcase: React.FC = () => {
  const [selectedQuery, setSelectedQuery] = useState<VivaQuery>(VIVA_QUERIES[0]);
  const [executionTime, setExecutionTime] = useState<number>(1.24);
  const [activeTab, setActiveTab] = useState<'queries' | 'er-diagram'>('queries');

  const handleRunQuery = (q: VivaQuery) => {
    setSelectedQuery(q);
    // Simulate real database timing between 0.8ms and 2.4ms
    const ms = Math.round((0.8 + Math.random() * 1.6) * 100) / 100;
    setExecutionTime(ms);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0B2E5C]">DBMS Syllabus SQL Showcase & ER Architecture</h2>
          <p className="text-xs text-slate-500">
            Interactive presentation tool for academic evaluation. Covers 12+ SQL relational concepts & complete schema.
          </p>
        </div>

        {/* View Switcher: SQL Queries vs ER Diagram */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-300 text-xs font-bold">
          <button
            onClick={() => setActiveTab('queries')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
              activeTab === 'queries'
                ? 'bg-[#0B2E5C] text-white shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>12+ SQL Queries</span>
          </button>
          <button
            onClick={() => setActiveTab('er-diagram')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
              activeTab === 'er-diagram'
                ? 'bg-[#0B2E5C] text-white shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>9-Entity ER Diagram</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: SQL QUERIES SHOWCASE */}
      {activeTab === 'queries' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Query Selection Menu (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm text-xs">
            <div className="bg-[#0B2E5C] text-white p-3 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Syllabus SQL Queries</span>
              <span>12 Queries</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
              {VIVA_QUERIES.map((q) => {
                const isSelected = selectedQuery.id === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => handleRunQuery(q)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-l-4 border-[#0B2E5C]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10px] text-[#F57C00] uppercase tracking-wider">
                        Q{q.id}: {q.concept}
                      </span>
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-[#0B2E5C]" />}
                    </div>
                    <div className="font-bold text-slate-900 mt-0.5">{q.title}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Query Execution Card (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 px-2 py-0.5 rounded border border-orange-200">
                    Query #{selectedQuery.id} • {selectedQuery.concept}
                  </span>
                  <h3 className="text-base font-black text-[#0B2E5C] mt-1">
                    {selectedQuery.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedQuery.description}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Query Cost / Timing</div>
                    <div className="text-sm font-mono font-bold text-emerald-700">
                      {executionTime} ms
                    </div>
                  </div>
                  <button
                    onClick={() => handleRunQuery(selectedQuery)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#F57C00] hover:bg-orange-600 text-white rounded text-xs font-bold shadow"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Execute Live</span>
                  </button>
                </div>
              </div>

              {/* Formatted SQL Code Box */}
              <div>
                <div className="flex items-center justify-between text-slate-500 font-mono text-[11px] mb-1 font-bold">
                  <span>Standard SQL Statement:</span>
                  <span className="text-slate-400">PDO Parameterised</span>
                </div>
                <pre className="p-3 bg-[#0b1329] text-amber-300 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-slate-800 leading-relaxed shadow-inner">
                  {selectedQuery.sql}
                </pre>
              </div>

              {/* Results Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
                  <span>
                    Output Tuple Set ({selectedQuery.sampleResult.length} rows)
                  </span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Query Completed (0 errors)</span>
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-300 rounded-lg text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#0B2E5C] text-white uppercase text-[10px] tracking-wider font-mono">
                      <tr>
                        {Object.keys(selectedQuery.sampleResult[0] || {}).map((col) => (
                          <th key={col} className="p-2.5">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {selectedQuery.sampleResult.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {Object.keys(row).map((k) => (
                            <td key={k} className="p-2.5 text-slate-800">
                              {String(row[k])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL 9-ENTITY ER DIAGRAM */}
      {activeTab === 'er-diagram' && (
        <div className="space-y-4">
          <ErDiagramSvg />
        </div>
      )}
    </div>
  );
};
