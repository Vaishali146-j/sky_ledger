import React, { useState } from 'react';

interface TableMeta {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'core' | 'new' | 'log';
  columns: Array<{ name: string; type: string; isPk?: boolean; isFk?: boolean; note?: string }>;
}

const TABLES: TableMeta[] = [
  {
    id: 'airports',
    name: 'airports',
    x: 40,
    y: 40,
    width: 220,
    height: 140,
    type: 'core',
    columns: [
      { name: 'airport_id', type: 'VARCHAR(10)', isPk: true },
      { name: 'airport_name', type: 'VARCHAR(150)' },
      { name: 'city', type: 'VARCHAR(100)' },
      { name: 'country', type: 'VARCHAR(100)' },
    ],
  },
  {
    id: 'aircraft',
    name: 'aircraft',
    x: 40,
    y: 240,
    width: 220,
    height: 140,
    type: 'core',
    columns: [
      { name: 'tail_number', type: 'VARCHAR(20)', isPk: true },
      { name: 'model', type: 'VARCHAR(50)' },
      { name: 'capacity', type: 'INT' },
      { name: 'last_maintenance_date', type: 'DATE' },
    ],
  },
  {
    id: 'crew_members',
    name: 'crew_members',
    x: 40,
    y: 430,
    width: 220,
    height: 145,
    type: 'core',
    columns: [
      { name: 'crew_id', type: 'INT (AUTO)', isPk: true },
      { name: 'full_name', type: 'VARCHAR(120)' },
      { name: 'role', type: 'ENUM(...)' },
      { name: 'base_airport_id', type: 'VARCHAR(10)', isFk: true, note: 'FK -> airports' },
    ],
  },
  {
    id: 'flights',
    name: 'flights',
    x: 370,
    y: 130,
    width: 240,
    height: 220,
    type: 'core',
    columns: [
      { name: 'flight_id', type: 'INT (AUTO)', isPk: true },
      { name: 'flight_number', type: 'VARCHAR(20)' },
      { name: 'origin_airport_id', type: 'VARCHAR(10)', isFk: true, note: 'FK -> airports' },
      { name: 'destination_airport_id', type: 'VARCHAR(10)', isFk: true, note: 'FK -> airports' },
      { name: 'scheduled_departure', type: 'DATETIME' },
      { name: 'scheduled_arrival', type: 'DATETIME' },
      { name: 'status', type: 'ENUM(On-Time,Delayed,Cancelled)' },
      { name: 'assigned_aircraft_id', type: 'VARCHAR(20)', isFk: true, note: 'FK -> aircraft' },
    ],
  },
  {
    id: 'delay_ledger',
    name: 'delay_ledger',
    x: 370,
    y: 420,
    width: 240,
    height: 155,
    type: 'core',
    columns: [
      { name: 'log_id', type: 'INT (AUTO)', isPk: true },
      { name: 'flight_id', type: 'INT', isFk: true, note: 'FK -> flights (CASCADE)' },
      { name: 'delay_duration_minutes', type: 'INT' },
      { name: 'reason_code', type: 'ENUM(...)' },
      { name: 'logged_at', type: 'TIMESTAMP' },
    ],
  },
  {
    id: 'crew_assignments',
    name: 'crew_assignments',
    x: 180,
    y: 620,
    width: 240,
    height: 155,
    type: 'core',
    columns: [
      { name: 'assignment_id', type: 'INT (AUTO)', isPk: true },
      { name: 'flight_id', type: 'INT', isFk: true, note: 'FK -> flights' },
      { name: 'crew_id', type: 'INT', isFk: true, note: 'FK -> crew_members' },
      { name: 'duty_start_time', type: 'DATETIME' },
      { name: 'duty_end_time', type: 'DATETIME' },
    ],
  },
  {
    id: 'users',
    name: 'users (NEW)',
    x: 720,
    y: 40,
    width: 220,
    height: 175,
    type: 'new',
    columns: [
      { name: 'user_id', type: 'INT (AUTO)', isPk: true },
      { name: 'full_name', type: 'VARCHAR(100)' },
      { name: 'email', type: 'VARCHAR(120)', note: 'UNIQUE' },
      { name: 'phone', type: 'VARCHAR(20)' },
      { name: 'password_hash', type: 'VARCHAR(255)' },
      { name: 'role', type: 'ENUM(passenger,admin)' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    id: 'bookings',
    name: 'bookings (NEW)',
    x: 720,
    y: 280,
    width: 230,
    height: 205,
    type: 'new',
    columns: [
      { name: 'booking_id', type: 'INT (AUTO)', isPk: true },
      { name: 'pnr', type: 'CHAR(6)', note: 'UNIQUE' },
      { name: 'user_id', type: 'INT', isFk: true, note: 'FK -> users' },
      { name: 'flight_id', type: 'INT', isFk: true, note: 'FK -> flights' },
      { name: 'travel_class', type: 'ENUM(Economy,Business)' },
      { name: 'total_fare', type: 'DECIMAL(10,2)' },
      { name: 'booking_status', type: 'ENUM(Confirmed,Cancelled)' },
      { name: 'booked_at', type: 'TIMESTAMP' },
    ],
  },
  {
    id: 'passengers',
    name: 'passengers (NEW)',
    x: 720,
    y: 550,
    width: 220,
    height: 165,
    type: 'new',
    columns: [
      { name: 'passenger_id', type: 'INT (AUTO)', isPk: true },
      { name: 'booking_id', type: 'INT', isFk: true, note: 'FK -> bookings (CASCADE)' },
      { name: 'full_name', type: 'VARCHAR(100)' },
      { name: 'age', type: 'INT' },
      { name: 'gender', type: 'ENUM(M,F,O)' },
      { name: 'seat_no', type: 'VARCHAR(4)' },
    ],
  },
];

export const ErDiagramSvg: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl select-none">
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
        <div>
          <span className="font-bold text-white text-sm">
            SkyLedger Relational ER Diagram (9 Entities)
          </span>
          <span className="ml-2 text-slate-400">
            6 Original DBMS Tables + 3 Additive Portal Tables
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-blue-300">
            <span className="w-3 h-3 bg-blue-700 rounded-sm" /> 6 Original Core Tables
          </span>
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-3 h-3 bg-emerald-700 rounded-sm" /> 3 New Tables
          </span>
          <span className="text-amber-400 font-semibold">PK = Primary Key | FK = Foreign Key</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 1020 820"
          className="w-full min-w-[900px] h-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Relationship Arrow Markers */}
            <marker
              id="crowsFoot"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#F57C00" />
            </marker>
          </defs>

          {/* Relationship Connection Paths */}
          <g stroke="#F57C00" strokeWidth="1.8" fill="none" opacity="0.85">
            {/* airports -> flights (origin & dest) */}
            <path d="M 260,100 L 370,170" markerEnd="url(#crowsFoot)" />
            {/* aircraft -> flights */}
            <path d="M 260,300 L 370,250" markerEnd="url(#crowsFoot)" />
            {/* airports -> crew_members (base) */}
            <path d="M 150,180 L 150,430" strokeDasharray="3 3" />
            {/* flights -> delay_ledger */}
            <path d="M 490,350 L 490,420" markerEnd="url(#crowsFoot)" />
            {/* flights -> crew_assignments */}
            <path d="M 430,350 L 370,620" markerEnd="url(#crowsFoot)" />
            {/* crew_members -> crew_assignments */}
            <path d="M 180,575 L 230,620" markerEnd="url(#crowsFoot)" />
            {/* flights -> bookings */}
            <path d="M 610,240 L 720,340" markerEnd="url(#crowsFoot)" />
            {/* users -> bookings */}
            <path d="M 830,215 L 830,280" markerEnd="url(#crowsFoot)" />
            {/* bookings -> passengers */}
            <path d="M 830,485 L 830,550" markerEnd="url(#crowsFoot)" />
          </g>

          {/* Tables Rendering */}
          {TABLES.map((t) => {
            const isSelected = selectedTable === t.id;
            const headerColor = t.type === 'core' ? '#0B2E5C' : '#047857';

            return (
              <g
                key={t.id}
                transform={`translate(${t.x}, ${t.y})`}
                className="cursor-pointer"
                onClick={() => setSelectedTable(isSelected ? null : t.id)}
              >
                {/* Table Body Card */}
                <rect
                  width={t.width}
                  height={t.height}
                  rx="6"
                  fill="#1e293b"
                  stroke={isSelected ? '#F57C00' : '#475569'}
                  strokeWidth={isSelected ? '2.5' : '1.2'}
                  filter="drop-shadow(0 4px 6px rgba(0,0,0,0.4))"
                />

                {/* Table Header */}
                <path
                  d={`M 0,6 Q 0,0 6,0 L ${t.width - 6},0 Q ${t.width},0 ${t.width},6 L ${t.width},28 L 0,28 Z`}
                  fill={headerColor}
                />
                <text
                  x="12"
                  y="19"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {t.name}
                </text>

                {/* Columns List */}
                {t.columns.map((col, idx) => {
                  const cy = 48 + idx * 21;
                  return (
                    <g key={col.name}>
                      {/* PK / FK Badge */}
                      {col.isPk && (
                        <rect x="10" y={cy - 10} width="22" height="12" rx="2" fill="#d97706" />
                      )}
                      {col.isPk && (
                        <text x="13" y={cy - 1} fill="#fff" fontSize="8" fontWeight="bold">
                          PK
                        </text>
                      )}
                      {col.isFk && (
                        <rect x="10" y={cy - 10} width="22" height="12" rx="2" fill="#2563eb" />
                      )}
                      {col.isFk && (
                        <text x="13" y={cy - 1} fill="#fff" fontSize="8" fontWeight="bold">
                          FK
                        </text>
                      )}

                      {/* Column Name */}
                      <text
                        x={col.isPk || col.isFk ? 36 : 12}
                        y={cy}
                        fill={col.isPk ? '#fbbf24' : '#e2e8f0'}
                        fontSize="11"
                        fontWeight={col.isPk ? 'bold' : 'normal'}
                        fontFamily="monospace"
                      >
                        {col.name}
                      </text>

                      {/* Data Type */}
                      <text
                        x={t.width - 10}
                        y={cy}
                        fill="#94a3b8"
                        fontSize="9"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {col.type.length > 15 ? col.type.slice(0, 14) + '…' : col.type}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 p-2 bg-slate-950 rounded text-xs text-slate-400 flex items-center justify-between">
        <span>Click on any table in the diagram to highlight relationships</span>
        <span className="text-amber-400 font-mono">
          UNIQUE(flight_id, seat_no) enforced in application transactions
        </span>
      </div>
    </div>
  );
};
