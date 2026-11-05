import React, { useState } from 'react';
import { AIRPORTS } from '../../data/airportsData';

interface RouteMapSvgProps {
  selectedOrigin?: string;
  selectedDest?: string;
  onSelectAirport?: (code: string) => void;
  className?: string;
}

// Convert Lat/Lon to SVG canvas coordinates for contiguous United States
function project(lat: number = 38, lon: number = -97): { x: number; y: number } {
  // Approximate Albers / Equirectangular bounding box for continental US
  const minLon = -125.0;
  const maxLon = -67.0;
  const minLat = 24.5;
  const maxLat = 49.5;

  const width = 860;
  const height = 480;
  const paddingX = 50;
  const paddingY = 40;

  const clampedLon = Math.max(Math.min(lon, maxLon), minLon);
  const clampedLat = Math.max(Math.min(lat, maxLat), minLat);

  const x = paddingX + ((clampedLon - minLon) / (maxLon - minLon)) * width;
  const y = paddingY + ((maxLat - clampedLat) / (maxLat - minLat)) * height;

  return { x: Math.round(x), y: Math.round(y) };
}

export const RouteMapSvg: React.FC<RouteMapSvgProps> = ({
  selectedOrigin = 'JFK',
  selectedDest = 'LAX',
  onSelectAirport,
  className = '',
}) => {
  const [hoveredAirport, setHoveredAirport] = useState<string | null>(null);

  // Origin point
  const originAirport = AIRPORTS.find((a) => a.airport_id === selectedOrigin) || AIRPORTS[0];
  const destAirport = AIRPORTS.find((a) => a.airport_id === selectedDest) || AIRPORTS[5]; // LAX

  const pOrigin = project(originAirport.lat, originAirport.lon);
  const pDest = project(destAirport.lat, destAirport.lon);

  // Great-circle curved arc control point (arch upward in the middle)
  const midX = (pOrigin.x + pDest.x) / 2;
  const midY = (pOrigin.y + pDest.y) / 2 - Math.min(Math.abs(pOrigin.x - pDest.x) * 0.22, 90);

  // Curated prominent airports for clean visualization
  const prominentAirports = AIRPORTS.slice(0, 40);

  return (
    <div className={`relative w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg select-none ${className}`}>
      {/* Map Header & Controls */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-3">
        <span className="px-2.5 py-1 bg-black/60 backdrop-blur rounded text-xs font-bold text-white border border-white/20">
          US Route Network & Flight Arcs
        </span>
        <span className="text-xs text-amber-400 font-medium">
          Route: {selectedOrigin} ➔ {selectedDest}
        </span>
      </div>

      {hoveredAirport && (
        <div className="absolute top-3 right-4 z-10 px-3 py-1 bg-white/95 rounded shadow text-xs font-semibold text-slate-800 border border-slate-300">
          {hoveredAirport}
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 960 560"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0a192f" stopOpacity="1" />
          </radialGradient>

          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#F57C00" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Map Background Glow */}
        <rect width="960" height="560" fill="url(#mapGlow)" />

        {/* Stylized US Outline Geometry Placeholder */}
        <path
          d="M 120,80 Q 200,60 380,80 Q 560,90 740,70 Q 840,90 890,140 Q 920,240 860,340 Q 820,440 760,490 Q 640,460 520,440 Q 400,470 320,450 Q 180,410 100,280 Q 80,180 120,80 Z"
          fill="#172e48"
          stroke="#2d4a6f"
          strokeWidth="1.5"
          opacity="0.6"
        />

        {/* Minor Background Arcs from JFK to hubs */}
        {['ORD', 'MIA', 'ATL', 'SFO', 'DFW', 'SEA', 'DEN'].map((code) => {
          const ap = AIRPORTS.find((a) => a.airport_id === code);
          if (!ap) return null;
          const pt = project(ap.lat, ap.lon);
          const mx = (pOrigin.x + pt.x) / 2;
          const my = (pOrigin.y + pt.y) / 2 - 35;
          return (
            <path
              key={code}
              d={`M ${pOrigin.x},${pOrigin.y} Q ${mx},${my} ${pt.x},${pt.y}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.25"
            />
          );
        })}

        {/* Highlighted Selected Route Arc */}
        <path
          id="activeRoutePath"
          d={`M ${pOrigin.x},${pOrigin.y} Q ${midX},${midY} ${pDest.x},${pDest.y}`}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="3.5"
          filter="url(#glow)"
        />

        {/* Animated Airplane along activeRoutePath */}
        <g>
          <circle cx={midX} cy={midY + 5} r="9" fill="#F57C00" filter="url(#glow)">
            <animate
              attributeName="cx"
              values={`${pOrigin.x};${midX};${pDest.x}`}
              dur="6s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values={`${pOrigin.y};${midY};${pDest.y}`}
              dur="6s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Airplane glyph */}
          <text
            x={midX - 4}
            y={midY + 9}
            fill="#ffffff"
            fontSize="10"
            fontWeight="bold"
            pointerEvents="none"
          >
            ✈
            <animate
              attributeName="x"
              values={`${pOrigin.x - 4};${midX - 4};${pDest.x - 4}`}
              dur="6s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="y"
              values={`${pOrigin.y + 4};${midY + 4};${pDest.y + 4}`}
              dur="6s"
              repeatCount="indefinite"
            />
          </text>
        </g>

        {/* Airport Nodes */}
        {prominentAirports.map((ap) => {
          const pt = project(ap.lat, ap.lon);
          const isOrigin = ap.airport_id === selectedOrigin;
          const isDest = ap.airport_id === selectedDest;
          const isNYC = ['JFK', 'LGA', 'EWR'].includes(ap.airport_id);

          const r = isOrigin || isDest ? 6 : isNYC ? 5 : 3.5;
          const fill = isOrigin
            ? '#38bdf8'
            : isDest
            ? '#22c55e'
            : isNYC
            ? '#f59e0b'
            : '#94a3b8';

          return (
            <g
              key={ap.airport_id}
              className="cursor-pointer group"
              onClick={() => onSelectAirport && onSelectAirport(ap.airport_id)}
              onMouseEnter={() => setHoveredAirport(`${ap.city} (${ap.airport_id}) – ${ap.airport_name}`)}
              onMouseLeave={() => setHoveredAirport(null)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={r}
                fill={fill}
                stroke="#ffffff"
                strokeWidth={isOrigin || isDest ? 2 : 1}
                className="transition-transform hover:scale-150"
              />
              {(isOrigin || isDest || ['ORD', 'LAX', 'SFO', 'MIA', 'DFW', 'SEA'].includes(ap.airport_id)) && (
                <text
                  x={pt.x + 7}
                  y={pt.y + 4}
                  fontSize="10"
                  fontWeight={isOrigin || isDest ? 'bold' : 'normal'}
                  fill={isOrigin || isDest ? '#f8fafc' : '#cbd5e1'}
                  pointerEvents="none"
                >
                  {ap.airport_id}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Footer Instructions */}
      <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Click any airport node to instantly set flight search destination</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Origin
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Destination
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> NYC Hubs
          </span>
        </div>
      </div>
    </div>
  );
};
