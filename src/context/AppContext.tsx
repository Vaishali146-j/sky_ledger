import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ApiMode } from '../types';
import { apiClient, getApiMode, setApiMode, tryLoadCsvs } from '../api/client';

export type Language = 'en' | 'hi';
export type TextSize = 'sm' | 'md' | 'lg';

export interface AppContextType {
  user: User | null;
  setUser: (u: User | null) => void;
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
  textSize: TextSize;
  setTextSize: (s: TextSize) => void;
  highContrast: boolean;
  setHighContrast: (c: boolean) => void;
  apiMode: ApiMode;
  toggleApiMode: () => void;
  authModalOpen: boolean;
  setAuthModalOpen: (o: boolean) => void;
  vivaGuideOpen: boolean;
  setVivaGuideOpen: (o: boolean) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
}

const DICTIONARY: Record<string, { en: string; hi: string }> = {
  // Navigation & Headers
  'nav.bookFlight': { en: 'Book Flight', hi: 'उड़ान बुक करें' },
  'nav.flightStatus': { en: 'Flight Status', hi: 'उड़ान स्थिति' },
  'nav.pnrStatus': { en: 'PNR Status', hi: 'पीएनआर स्थिति' },
  'nav.manageBooking': { en: 'Manage Booking', hi: 'बुकिंग प्रबंधन' },
  'nav.airportBoard': { en: 'Airport Board', hi: 'हवाई अड्डा बोर्ड' },
  'nav.adminPortal': { en: 'Operations Admin', hi: 'प्रशासन पोर्टल' },
  'nav.login': { en: 'Sign In / Register', hi: 'लॉग इन / पंजीकरण' },
  'nav.logout': { en: 'Sign Out', hi: 'लॉग आउट' },
  'nav.demoCreds': { en: 'Demo Accounts', hi: 'डेमो खाते' },
  'nav.vivaGuide': { en: 'DBMS Viva Guide', hi: 'वायवा गाइड' },

  // Home Search Card
  'search.title': { en: 'Search Flights', hi: 'उड़ानें खोजें' },
  'search.subtitle': { en: 'Serving flights departing NYC Hubs (JFK, LGA, EWR)', hi: 'न्यूयॉर्क हवाई अड्डों (JFK, LGA, EWR) से प्रस्थान' },
  'search.from': { en: 'From (NYC Hub)', hi: 'कहाँ से (मूल)' },
  'search.to': { en: 'To (Destination)', hi: 'कहाँ तक (गंतव्य)' },
  'search.departure': { en: 'Departure Date', hi: 'प्रस्थान तिथि' },
  'search.return': { en: 'Return Date', hi: 'वापसी तिथि' },
  'search.passengers': { en: 'Passengers', hi: 'यात्री' },
  'search.class': { en: 'Travel Class', hi: 'यात्रा श्रेणी' },
  'search.oneWay': { en: 'One Way', hi: 'एक तरफ' },
  'search.roundTrip': { en: 'Round Trip', hi: 'आना-जाना' },
  'search.searchBtn': { en: 'Find Flights', hi: 'उड़ानें खोजें' },
  'search.selectDestination': { en: 'Select Destination Airport...', hi: 'गंतव्य हवाई अड्डा चुनें...' },

  // Statuses
  'status.onTime': { en: 'On-Time', hi: 'समय पर' },
  'status.delayed': { en: 'Delayed', hi: 'विलंबित' },
  'status.cancelled': { en: 'Cancelled', hi: 'रद्द' },
  'status.confirmed': { en: 'Confirmed', hi: 'पुष्ट' },

  // Flight Details & Badges
  'flight.economy': { en: 'Economy Class', hi: 'इकोनॉमी श्रेणी' },
  'flight.business': { en: 'Business Class', hi: 'बिजनेस श्रेणी' },
  'flight.nonStop': { en: 'Non-Stop', hi: 'सीधी उड़ान' },
  'flight.seatsLeft': { en: 'seats left', hi: 'सीटें शेष' },
  'flight.soldOut': { en: 'Sold Out', hi: 'पूर्ण बुक' },
  'flight.bookNow': { en: 'Book Now', hi: 'अभी बुक करें' },
  'flight.viewDetails': { en: 'View Details', hi: 'विवरण देखें' },

  // Booking Flow
  'book.step1': { en: 'Select Flight', hi: 'उड़ान चयन' },
  'book.step2': { en: 'Passenger Details', hi: 'यात्री विवरण' },
  'book.step3': { en: 'Seat Selection', hi: 'सीट चयन' },
  'book.step4': { en: 'Review & Fare', hi: 'समीक्षा एवं किराया' },
  'book.step5': { en: 'Simulated Payment', hi: 'भुगतान सिमुलेशन' },
  'book.step6': { en: 'E-Ticket Issued', hi: 'ई-टिकट जारी' },

  // Accessibility
  'a11y.skip': { en: 'Skip to main content', hi: 'मुख्य सामग्री पर जाएं' },
  'a11y.contrast': { en: 'High Contrast', hi: 'उच्च कंट्रास्ट' },
  'a11y.textSize': { en: 'Text Size', hi: 'पाठ आकार' },
  'portal.tagline': { en: 'Official Civil Aviation & Operations System – Year 2013 Dataset', hi: 'आधिकारिक नागरिक उड्डयन एवं संचालन प्रणाली – वर्ष 2013' },
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => apiClient.getCurrentUser());
  const [lang, setLang] = useState<Language>('en');
  const [textSize, setTextSize] = useState<TextSize>('md');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [apiMode, setModeState] = useState<ApiMode>(getApiMode());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [vivaGuideOpen, setVivaGuideOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    // Attempt loading CSVs in background if user uploads them
    tryLoadCsvs();

    const handleModeChange = () => {
      setModeState(getApiMode());
    };
    window.addEventListener('skyledger-mode-change', handleModeChange);
    return () => window.removeEventListener('skyledger-mode-change', handleModeChange);
  }, []);

  const toggleApiMode = () => {
    const next = apiMode === 'MOCK' ? 'LIVE' : 'MOCK';
    setApiMode(next);
    setModeState(next);
    notify(`Switched data layer to ${next} mode`, 'info');
  };

  const t = (key: string): string => {
    if (DICTIONARY[key]) {
      return DICTIONARY[key][lang] || DICTIONARY[key].en;
    }
    return key;
  };

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  return (
    <AppContext.Provider
      value={{
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
        authModalOpen,
        setAuthModalOpen,
        vivaGuideOpen,
        setVivaGuideOpen,
        notify,
        notification,
      }}
    >
      <div
        className={`min-h-screen ${
          textSize === 'sm' ? 'text-xs' : textSize === 'lg' ? 'text-base' : 'text-sm'
        } ${highContrast ? 'contrast-high bg-black text-white' : 'bg-[#F4F6F9] text-slate-800'}`}
      >
        {children}

        {/* Global Toast Notification */}
        {notification && (
          <div
            className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-md shadow-xl border text-sm font-medium transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-900 border-emerald-500 text-white'
                : notification.type === 'error'
                ? 'bg-rose-900 border-rose-500 text-white'
                : 'bg-[#0B2E5C] border-blue-400 text-white'
            }`}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-white/70 hover:text-white font-bold ml-2"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
