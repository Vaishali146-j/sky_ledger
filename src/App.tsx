import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { BookingFlowPage } from './pages/BookingFlowPage';
import { PnrStatusPage } from './pages/PnrStatusPage';
import { FlightStatusPage } from './pages/FlightStatusPage';
import { AirportBoardPage } from './pages/AirportBoardPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { FlightOperationsPage } from './pages/FlightOperationsPage';
import { AdminPortalPage } from './pages/admin/AdminPortalPage';
import { AuthModal } from './pages/AuthModal';
import { VivaDemoGuide } from './components/VivaDemoGuide';
import { Flight, FlightSearchParams, TravelClass } from './types';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<string>('search');
  const [searchParams, setSearchParams] = useState<FlightSearchParams>({
    origin: 'JFK',
    destination: 'LAX',
    departureDate: '2013-01-01',
    passengers: 1,
    travelClass: 'Economy',
    isRoundTrip: false,
  });

  const [bookingFlight, setBookingFlight] = useState<Flight | null>(null);
  const [bookingClass, setBookingClass] = useState<TravelClass>('Economy');
  const [bookingPassengers, setBookingPassengers] = useState<number>(1);
  const [adminInitialSubTab, setAdminInitialSubTab] = useState<string>('dashboard');

  const handleSearchSubmit = (params: FlightSearchParams) => {
    setSearchParams(params);
    setCurrentTab('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickRoute = (origin: string, dest: string) => {
    setSearchParams((prev) => ({
      ...prev,
      origin,
      destination: dest,
    }));
    setCurrentTab('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectFlightToBook = (flight: Flight, travelClass: TravelClass, passengersCount: number) => {
    setBookingFlight(flight);
    setBookingClass(travelClass);
    setBookingPassengers(passengersCount);
    setCurrentTab('book');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabNavigation = (tab: string) => {
    if (tab.startsWith('admin-')) {
      const sub = tab.replace('admin-', '');
      setAdminInitialSubTab(sub === 'crew-roster' ? 'roster' : sub);
      setCurrentTab('admin');
    } else {
      setCurrentTab(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header currentTab={currentTab} onSelectTab={handleTabNavigation} />

      <main id="main-content" className="flex-1">
        {currentTab === 'search' && (
          <HomePage
            onSearch={handleSearchSubmit}
            onQuickRouteSelect={handleQuickRoute}
          />
        )}

        {currentTab === 'results' && (
          <SearchResultsPage
            searchParams={searchParams}
            onSelectFlightToBook={handleSelectFlightToBook}
            onModifySearch={() => setCurrentTab('search')}
          />
        )}

        {currentTab === 'book' && bookingFlight && (
          <BookingFlowPage
            flight={bookingFlight}
            travelClass={bookingClass}
            passengersCount={bookingPassengers}
            onFinishBooking={() => setCurrentTab('search')}
          />
        )}

        {currentTab === 'operations' && (
          <div className="max-w-7xl mx-auto px-4 py-6">
            <FlightOperationsPage />
          </div>
        )}
        {currentTab === 'flight-status' && <FlightStatusPage />}
        {currentTab === 'pnr-status' && <PnrStatusPage />}
        {currentTab === 'manage-booking' && <MyBookingsPage />}
        {currentTab === 'airport-board' && <AirportBoardPage />}
        {currentTab === 'admin' && <AdminPortalPage initialSubTab={adminInitialSubTab} />}
      </main>

      <Footer />
      <AuthModal />
      <VivaDemoGuide onNavigateTab={handleTabNavigation} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
