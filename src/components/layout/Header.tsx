import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Plane, AlertTriangle, ShieldCheck, User as UserIcon, LogOut, Database, HelpCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { DelayRecord } from '../../types';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab }) => {
  const {
    user,
    setUser,
    lang,
    setLang,
    t,
    textSize,
    setTextSize,
    highContrast,
    setHighContrast,
    apiMode,
    toggleApiMode,
    setAuthModalOpen,
    setVivaGuideOpen,
    notify,
  } = useApp();

  const [delays, setDelays] = useState<DelayRecord[]>([]);
  const [showDemoCreds, setShowDemoCreds] = useState(false);

  useEffect(() => {
    // Fetch live delays for marquee
    apiClient.getDelayLogs().then((res) => {
      if (res.success && res.data) {
        setDelays(res.data.slice(0, 8));
      }
    });
  }, []);

  const handleLogout = () => {
    apiClient.logout();
    setUser(null);
    notify('Logged out successfully', 'info');
  };

  const handleQuickLogin = async (role: 'admin' | 'passenger') => {
    const email = role === 'admin' ? 'admin@demo.com' : 'user@demo.com';
    const pass = role === 'admin' ? 'admin123' : 'user123';
    const res = await apiClient.login(email, pass);
    if (res.success && res.user) {
      setUser(res.user);
      setShowDemoCreds(false);
      notify(`Logged in as ${res.user.full_name} (${role})`, 'success');
    }
  };

  return (
    <header className="w-full select-none">
      {/* Top Accessibility & Utility Bar */}
      <div className="bg-[#05172e] text-slate-300 text-xs py-1.5 px-4 border-b border-slate-700/80">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Skip to Main Content & Tagline */}
          <div className="flex items-center gap-3">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:px-2 focus:py-1 focus:bg-amber-400 focus:text-black rounded"
            >
              {t('a11y.skip')}
            </a>
            <span className="hidden sm:inline text-slate-400">
              {t('portal.tagline')}
            </span>
          </div>

          {/* Right: Accessibility Controls & Mode Toggles */}
          <div className="flex items-center gap-3 ml-auto">
            {/* API Mode Indicator & Switcher */}
            <button
              onClick={toggleApiMode}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                apiMode === 'MOCK'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
              title="Click to toggle between MOCK (In-Browser PapaParse) and LIVE (PHP XAMPP)"
            >
              <Database className="w-3 h-3" />
              <span>DATA: {apiMode}</span>
            </button>

            {/* Viva Script Modal Trigger */}
            <button
              onClick={() => setVivaGuideOpen(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-400/40 text-[11px] font-bold"
            >
              <HelpCircle className="w-3 h-3 text-amber-300" />
              <span>{t('nav.vivaGuide')}</span>
            </button>

            {/* High Contrast Toggle */}
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                highContrast
                  ? 'bg-yellow-400 text-black border-yellow-500'
                  : 'bg-slate-800 text-slate-300 border-slate-600 hover:text-white'
              }`}
            >
              {t('a11y.contrast')}
            </button>

            {/* Font Size Adjusters: A- A A+ */}
            <div className="flex items-center bg-slate-800 border border-slate-600 rounded overflow-hidden text-[11px]">
              <button
                onClick={() => setTextSize('sm')}
                className={`px-1.5 py-0.5 ${textSize === 'sm' ? 'bg-[#0B2E5C] text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                title="Smaller text"
              >
                A-
              </button>
              <button
                onClick={() => setTextSize('md')}
                className={`px-1.5 py-0.5 ${textSize === 'md' ? 'bg-[#0B2E5C] text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                title="Default text"
              >
                A
              </button>
              <button
                onClick={() => setTextSize('lg')}
                className={`px-1.5 py-0.5 ${textSize === 'lg' ? 'bg-[#0B2E5C] text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                title="Larger text"
              >
                A+
              </button>
            </div>

            {/* Language Switcher (EN / हिन्दी) */}
            <div className="flex items-center bg-slate-800 border border-slate-600 rounded overflow-hidden text-[11px]">
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 ${lang === 'en' ? 'bg-[#0B2E5C] text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                English
              </button>
              <button
                onClick={() => setLang('hi')}
                className={`px-2 py-0.5 ${lang === 'hi' ? 'bg-[#0B2E5C] text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                हिन्दी
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Government / Airline Portal Header */}
      <div className="bg-[#0B2E5C] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Portal Identity */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onSelectTab('search')}
          >
            <div className="w-11 h-11 rounded-lg bg-gradient-to-tr from-[#F57C00] to-amber-400 flex items-center justify-center shadow-md">
              <Plane className="w-7 h-7 text-[#0B2E5C] -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl md:text-2xl font-black tracking-tight text-white uppercase font-sans">
                  SkyLedger
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#F57C00] text-white px-2 py-0.5 rounded">
                  Portal
                </span>
              </div>
              <div className="text-[11px] text-blue-200 tracking-wide">
                Flight Reservation & Operations Management
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center flex-wrap gap-1 md:gap-2 text-xs md:text-sm font-semibold">
            <button
              onClick={() => onSelectTab('search')}
              className={`px-3 py-2 rounded transition-colors ${
                currentTab === 'search' || currentTab === 'results'
                  ? 'bg-white/20 text-white font-bold border-b-2 border-[#F57C00]'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              {t('nav.bookFlight')}
            </button>

            <button
              onClick={() => onSelectTab('flight-status')}
              className={`px-3 py-2 rounded transition-colors ${
                currentTab === 'flight-status'
                  ? 'bg-white/20 text-white font-bold border-b-2 border-[#F57C00]'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              {t('nav.flightStatus')}
            </button>

            <button
              onClick={() => onSelectTab('pnr-status')}
              className={`px-3 py-2 rounded transition-colors ${
                currentTab === 'pnr-status'
                  ? 'bg-white/20 text-white font-bold border-b-2 border-[#F57C00]'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              {t('nav.pnrStatus')}
            </button>

            <button
              onClick={() => onSelectTab('manage-booking')}
              className={`px-3 py-2 rounded transition-colors ${
                currentTab === 'manage-booking'
                  ? 'bg-white/20 text-white font-bold border-b-2 border-[#F57C00]'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              {t('nav.manageBooking')}
            </button>

            <button
              onClick={() => onSelectTab('airport-board')}
              className={`px-3 py-2 rounded transition-colors ${
                currentTab === 'airport-board'
                  ? 'bg-white/20 text-white font-bold border-b-2 border-[#F57C00]'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              {t('nav.airportBoard')}
            </button>

            {/* Admin Portal Tab (Accessible or locked to admin) */}
            <button
              onClick={() => onSelectTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded transition-colors ${
                currentTab.startsWith('admin')
                  ? 'bg-[#F57C00] text-white font-bold shadow'
                  : 'text-amber-300 hover:bg-white/10'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t('nav.adminPortal')}</span>
            </button>
          </nav>

          {/* User Auth & Demo Credentials */}
          <div className="flex items-center gap-2">
            {/* Demo Accounts Quick Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDemoCreds(!showDemoCreds)}
                className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold"
              >
                Demo Accounts ▾
              </button>

              {showDemoCreds && (
                <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-300 p-3 z-50 text-xs">
                  <div className="font-bold text-[#0B2E5C] pb-1.5 border-b border-slate-200">
                    Instant Demo Credentials:
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <div className="font-bold text-slate-900">Operations Admin:</div>
                      <div className="font-mono text-[11px] text-slate-600">admin@demo.com / admin123</div>
                      <button
                        onClick={() => handleQuickLogin('admin')}
                        className="mt-1.5 w-full py-1 bg-[#0B2E5C] text-white rounded font-bold hover:bg-blue-900"
                      >
                        Sign in as Admin
                      </button>
                    </div>

                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <div className="font-bold text-slate-900">Passenger Account:</div>
                      <div className="font-mono text-[11px] text-slate-600">user@demo.com / user123</div>
                      <button
                        onClick={() => handleQuickLogin('passenger')}
                        className="mt-1.5 w-full py-1 bg-[#F57C00] text-white rounded font-bold hover:bg-orange-600"
                      >
                        Sign in as Passenger
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Login */}
            {user ? (
              <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                <UserIcon className="w-4 h-4 text-amber-400" />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold leading-tight">{user.full_name}</div>
                  <div className="text-[10px] text-blue-200 uppercase">{user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 hover:text-amber-400 text-slate-300 ml-1"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-3 py-1.5 bg-[#F57C00] hover:bg-orange-600 text-white font-bold text-xs rounded shadow transition-colors"
              >
                {t('nav.login')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrolling Delay Notices Marquee */}
      <div className="bg-[#FFFBEB] text-[#92400E] border-b border-amber-300 px-4 py-1.5 text-xs overflow-hidden flex items-center">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-900 shrink-0 mr-3 border-r border-amber-300 pr-3">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span>Operations Notice:</span>
        </div>

        <div className="overflow-hidden whitespace-nowrap w-full group">
          <div className="inline-block animate-marquee group-hover:[animation-play-state:paused]">
            {delays.length > 0 ? (
              delays.map((d, i) => (
                <span key={d.log_id || i} className="mx-4 font-medium">
                  • Flight <strong className="text-amber-950 font-bold">{d.flight_number}</strong> from {d.origin_airport_id} delayed{' '}
                  <strong className="text-red-700">{d.delay_duration_minutes} min</strong> – Reason: {d.reason_code}
                </span>
              ))
            ) : (
              <span className="mx-4 font-medium">
                • Flight UA-1545 from EWR delayed 33 min – Mechanical • Flight DL-448 from LGA delayed 48 min – Weather • All other Jan 2013 flights operating to published schedules.
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
