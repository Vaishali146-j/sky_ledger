import React from 'react';

export const HeroPlane: React.FC = () => {
  return (
    <div className="relative w-full h-48 md:h-64 overflow-hidden bg-gradient-to-b from-[#0a2540] via-[#103a6b] to-[#1e528e] select-none">
      {/* Animated Clouds */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Cloud 1 */}
          <path
            d="M 50,70 Q 75,40 110,60 Q 140,30 180,60 Q 210,50 230,70 Q 240,90 210,100 L 60,100 Z"
            fill="url(#cloudGrad)"
            className="animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          {/* Cloud 2 */}
          <path
            d="M 450,40 Q 480,15 520,35 Q 560,10 600,35 Q 630,25 650,45 Q 660,70 630,80 L 460,80 Z"
            fill="url(#cloudGrad)"
            className="animate-pulse"
            style={{ animationDuration: '12s' }}
          />
          {/* Cloud 3 */}
          <path
            d="M 850,80 Q 880,50 930,75 Q 980,45 1020,75 Q 1060,65 1080,85 L 860,110 Z"
            fill="url(#cloudGrad)"
            className="animate-pulse"
            style={{ animationDuration: '10s' }}
          />
        </svg>
      </div>

      {/* Flight Path Contrail */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M -100,120 Q 400,110 1200,65"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="3"
          strokeDasharray="8 6"
        />
        <path
          d="M -100,123 Q 400,113 1200,68"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Large Side-View Commercial Airliner SVG */}
      <div className="absolute top-10 md:top-8 right-6 md:right-28 w-80 md:w-96 transform hover:scale-105 transition-transform duration-700">
        <svg
          viewBox="0 0 600 200"
          className="w-full h-auto drop-shadow-[0_15px_25px_rgba(0,0,0,0.5)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="fuselageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="tailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F57C00" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
            <linearGradient id="bellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0B2E5C" />
              <stop offset="100%" stopColor="#051833" />
            </linearGradient>
            <linearGradient id="engineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>

          {/* Vertical Stabilizer / Tail Fin */}
          <polygon points="80,105 130,22 175,22 145,105" fill="url(#tailGrad)" />
          {/* Saffron/Gold Trim on Tail */}
          <polygon points="120,38 135,22 170,22 165,38" fill="#F59E0B" />
          <circle cx="140" cy="55" r="10" fill="#ffffff" opacity="0.9" />
          <path d="M 136,55 L 144,55 M 140,51 L 140,59" stroke="#0B2E5C" strokeWidth="2.5" />

          {/* Horizontal Stabilizer */}
          <polygon points="65,100 110,75 135,75 105,105" fill="#cbd5e1" />

          {/* Main Fuselage Body */}
          <path
            d="M 90,105 
               L 480,105 
               C 530,105 570,118 585,128 
               C 565,138 520,145 470,145 
               L 110,145 
               C 95,145 80,135 70,125 
               Z"
            fill="url(#fuselageGrad)"
          />

          {/* Navy Blue Belly Livery Stripe */}
          <path
            d="M 110,140 L 480,140 C 510,140 535,136 550,132 C 530,138 490,145 450,145 L 110,145 Z"
            fill="url(#bellyGrad)"
          />

          {/* Saffron Cheatline */}
          <path
            d="M 120,123 L 530,123 C 545,123 555,126 565,128 C 555,129 545,127 530,127 L 120,127 Z"
            fill="#F57C00"
          />

          {/* Cockpit Windshield */}
          <path
            d="M 545,116 L 565,122 L 558,126 L 538,123 Z"
            fill="#0f172a"
          />

          {/* Cabin Passenger Windows (Dotted rows) */}
          <g fill="#1e293b" opacity="0.85">
            {Array.from({ length: 28 }).map((_, i) => (
              <rect
                key={i}
                x={160 + i * 11}
                y={114}
                width={5.5}
                height={6.5}
                rx={2.2}
              />
            ))}
          </g>

          {/* Passenger Entry Doors */}
          <rect x="180" y="110" width="12" height="26" rx="2" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
          <rect x="330" y="110" width="10" height="20" rx="1.5" fill="none" stroke="#94a3b8" strokeWidth="1" />
          <rect x="440" y="110" width="12" height="26" rx="2" fill="none" stroke="#94a3b8" strokeWidth="1.2" />

          {/* Airline Name on Fuselage */}
          <text
            x="225"
            y="100"
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
            fontSize="18"
            fill="#0B2E5C"
            letterSpacing="2"
          >
            SKYSYSTEMS
          </text>
          <text
            x="368"
            y="100"
            fontFamily="Arial, sans-serif"
            fontSize="11"
            fill="#F57C00"
            fontWeight="bold"
          >
            AIRLINE
          </text>

          {/* Swept Main Wing (Front & Under) */}
          <polygon points="280,135 375,135 320,185 240,185" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
          <polygon points="245,185 255,178 320,178 315,185" fill="#F57C00" /> {/* Winglet */}

          {/* Turbofan Jet Engine Under Wing */}
          <ellipse cx="310" cy="155" rx="26" ry="14" fill="url(#engineGrad)" />
          <ellipse cx="330" cy="155" rx="8" ry="13" fill="#0f172a" />
          <path d="M 290,150 L 315,150" stroke="#f8fafc" strokeWidth="2" />
        </svg>
      </div>

      {/* Decorative Government/Official Badge Tag */}
      <div className="absolute bottom-3 left-4 md:left-8 flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded border border-white/20 text-white/90 text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="font-semibold uppercase tracking-wider">Civil Aviation Airspace Ledger</span>
        <span className="hidden md:inline text-white/50">|</span>
        <span className="hidden md:inline text-white/70">JFK • LGA • EWR Hub Network</span>
      </div>
    </div>
  );
};
