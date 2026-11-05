import React from 'react';

interface RouteArcProps {
  originCode: string;
  destCode: string;
  duration?: string;
  status?: string;
  className?: string;
}

export const RouteArc: React.FC<RouteArcProps> = ({
  originCode,
  destCode,
  duration,
  status = 'On-Time',
  className = '',
}) => {
  const isDelayed = status === 'Delayed';
  const isCancelled = status === 'Cancelled';

  const strokeColor = isCancelled
    ? '#ef4444'
    : isDelayed
    ? '#f59e0b'
    : '#0B2E5C';

  return (
    <div className={`flex flex-col items-center justify-center w-full max-w-[220px] select-none ${className}`}>
      {/* Route SVG */}
      <svg viewBox="0 0 200 48" className="w-full h-10 overflow-visible" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`routeGrad-${originCode}-${destCode}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0B2E5C" />
            <stop offset="50%" stopColor={strokeColor} />
            <stop offset="100%" stopColor={isCancelled ? '#ef4444' : '#2E7D32'} />
          </linearGradient>
        </defs>

        {/* Origin Circle */}
        <circle cx="10" cy="24" r="5" fill="#0B2E5C" />
        <circle cx="10" cy="24" r="8" fill="none" stroke="#0B2E5C" strokeWidth="1.5" strokeOpacity="0.4" />

        {/* Dashed Flight Curve */}
        <path
          d="M 16,24 Q 100,-2 184,24"
          fill="none"
          stroke={`url(#routeGrad-${originCode}-${destCode})`}
          strokeWidth="2.5"
          strokeDasharray={isCancelled ? '4 4' : '5 4'}
        />

        {/* Plane Icon at Apex pointing toward destination */}
        <g transform="translate(100, 11) rotate(6)">
          <path
            d="M -7,0 L -3,-4 L 3,-4 L 7,0 L 5,2 L 2,1 L 1,6 L -1,6 L -0.5,1 L -5,2 Z"
            fill={strokeColor}
            stroke="#ffffff"
            strokeWidth="0.8"
          />
        </g>

        {/* Destination Circle */}
        <circle cx="190" cy="24" r="5" fill={isCancelled ? '#ef4444' : '#2E7D32'} />
        <circle
          cx="190"
          cy="24"
          r="8"
          fill="none"
          stroke={isCancelled ? '#ef4444' : '#2E7D32'}
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />
      </svg>

      {/* Flight Duration Badge */}
      {duration && (
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider -mt-1">
          {duration}
        </span>
      )}
    </div>
  );
};
