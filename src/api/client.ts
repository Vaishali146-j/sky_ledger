/**
 * SkyLedger – Unified Data Access Layer (Client API)
 * Supports MOCK Mode (in-memory + localStorage + PapaParse CSVs)
 * and LIVE Mode (REST calls to PHP PDO backend at http://localhost/skyledger-api)
 * Both modes guarantee identical JSON return shapes.
 */

import Papa from 'papaparse';
import {
  Airport,
  Aircraft,
  CrewMember,
  Flight,
  FlightStatus,
  CrewAssignment,
  CrewAssignmentEnriched,
  DelayRecord,
  User,
  Booking,
  Passenger,
  ReportMeta,
  ActivityLog,
  TravelClass,
  DelayReasonCode,
  StatusMatrixCounts,
  FlightOperationsSearchParams,
  FlightOperationsResponse,
  FlightDetailEnriched,
  DelaySummaryStats,
  CrewAvailabilityItem,
  CrewWorkloadItem,
  TransactionStepLog,
  TransactionAssignResult,
  RouteLeaderboardItem,
  AircraftUtilizationItem,
  WindowMonthlyItem,
  WindowDailyItem,
  WindowAirportItem,
  WindowCrewItem,
} from '../types';
import { AIRPORTS, getAirport } from '../data/airportsData';
import {
  SEED_AIRCRAFT,
  SEED_CREW,
  SEED_FLIGHTS,
  SEED_DELAYS,
  SEED_CREW_ASSIGNMENTS,
  SEED_BOOKINGS,
  SEED_USERS,
} from '../data/seedData';
import { calculateFare } from '../utils/fareCalculator';

// DATA ACCESS MODE TOGGLE
export type ApiMode = 'MOCK' | 'LIVE';
export const DEFAULT_MODE: ApiMode = 'MOCK';

const STORAGE_KEY_MODE = 'skyledger_api_mode';
export function getApiMode(): ApiMode {
  const saved = localStorage.getItem(STORAGE_KEY_MODE);
  return (saved === 'LIVE' ? 'LIVE' : 'MOCK');
}

export function setApiMode(mode: ApiMode) {
  localStorage.setItem(STORAGE_KEY_MODE, mode);
  window.dispatchEvent(new Event('skyledger-mode-change'));
}

export const API_BASE = 'http://localhost/skyledger-api';

// STORAGE KEYS FOR MOCK PERSISTENCE
const KEYS = {
  USERS: 'skyledger_users_v1',
  BOOKINGS: 'skyledger_bookings_v1',
  FLIGHTS: 'skyledger_flights_v1',
  AIRCRAFT: 'skyledger_aircraft_v1',
  CREW: 'skyledger_crew_v1',
  ASSIGNMENTS: 'skyledger_crew_assignments_v1',
  DELAYS: 'skyledger_delays_v1',
  ACTIVITY: 'skyledger_activity_log_v1',
  AUTH_TOKEN: 'skyledger_auth_token_v1',
  CURRENT_USER: 'skyledger_current_user_v1',
};

// In-Memory / LocalStorage State Initialize
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

// Initialize mock store from Seed Data or CSVs
let mockAirports: Airport[] = [...AIRPORTS];
let mockAircraft: Aircraft[] = getStored(KEYS.AIRCRAFT, [...SEED_AIRCRAFT]);
let mockCrew: CrewMember[] = getStored(KEYS.CREW, [...SEED_CREW]);
let mockFlights: Flight[] = getStored(KEYS.FLIGHTS, [...SEED_FLIGHTS]);
let mockDelays: DelayRecord[] = getStored(KEYS.DELAYS, [...SEED_DELAYS]);
let mockAssignments: CrewAssignment[] = getStored(KEYS.ASSIGNMENTS, [...SEED_CREW_ASSIGNMENTS]);
let mockBookings: Booking[] = getStored(KEYS.BOOKINGS, [...SEED_BOOKINGS]);
let mockUsers: User[] = getStored(KEYS.USERS, [...SEED_USERS]);
let mockActivity: ActivityLog[] = getStored(KEYS.ACTIVITY, [
  {
    log_id: 1,
    action_type: 'SYSTEM_BOOT',
    performed_by: 'system',
    details: 'SkyLedger initialized with default January 2013 operational dataset.',
    created_at: '2013-01-01 00:00:00',
  },
]);

// Attempt to load CSV files if present in /public/data
let csvLoaded = false;
export async function tryLoadCsvs(): Promise<boolean> {
  if (csvLoaded) return true;
  try {
    const loadCsv = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();
      return new Promise<any[]>((resolve) => {
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: () => resolve([]),
        });
      });
    };

    const [airportsCsv, aircraftCsv, crewCsv, flightsCsv, assignmentsCsv, delaysCsv] =
      await Promise.all([
        loadCsv('/data/airports.csv'),
        loadCsv('/data/aircraft.csv'),
        loadCsv('/data/crew_members.csv'),
        loadCsv('/data/flights.csv'),
        loadCsv('/data/crew_assignments.csv'),
        loadCsv('/data/delay_ledger.csv'),
      ]);

    if (airportsCsv && airportsCsv.length > 0) {
      mockAirports = airportsCsv.map((a: any) => ({
        airport_id: String(a.airport_id || a.faa || '').toUpperCase(),
        airport_name: String(a.airport_name || a.name || ''),
        city: String(a.city || ''),
        country: String(a.country || 'United States'),
        lat: Number(a.lat || a.latitude || 40.64),
        lon: Number(a.lon || a.longitude || -73.78),
      }));
    }

    if (aircraftCsv && aircraftCsv.length > 0) {
      mockAircraft = aircraftCsv.map((ac: any) => ({
        tail_number: String(ac.tail_number || ac.tailnum || ''),
        model: String(ac.model || ''),
        capacity: Number(ac.capacity || 150),
        last_maintenance_date: String(ac.last_maintenance_date || '2012-12-01'),
      }));
      setStored(KEYS.AIRCRAFT, mockAircraft);
    }

    if (crewCsv && crewCsv.length > 0) {
      mockCrew = crewCsv.map((c: any, idx: number) => ({
        crew_id: Number(c.crew_id || idx + 1),
        full_name: String(c.full_name || c.name || ''),
        role: (c.role as any) || 'Cabin Crew',
        base_airport_id: c.base_airport_id ? String(c.base_airport_id).toUpperCase() : null,
      }));
      setStored(KEYS.CREW, mockCrew);
    }

    if (flightsCsv && flightsCsv.length > 0) {
      mockFlights = flightsCsv.map((f: any, idx: number) => ({
        flight_id: Number(f.flight_id || idx + 1),
        flight_number: String(f.flight_number || `FL-${idx + 100}`),
        origin_airport_id: String(f.origin_airport_id || f.origin || 'JFK').toUpperCase(),
        destination_airport_id: String(f.destination_airport_id || f.dest || 'ORD').toUpperCase(),
        scheduled_departure: String(f.scheduled_departure || '2013-01-01 08:00:00'),
        scheduled_arrival: String(f.scheduled_arrival || '2013-01-01 11:00:00'),
        status: (f.status as any) || 'On-Time',
        assigned_aircraft_id: f.assigned_aircraft_id ? String(f.assigned_aircraft_id) : null,
      }));
      setStored(KEYS.FLIGHTS, mockFlights);
    }

    if (assignmentsCsv && assignmentsCsv.length > 0) {
      mockAssignments = assignmentsCsv.map((ca: any, idx: number) => ({
        assignment_id: Number(ca.assignment_id || idx + 1),
        flight_id: Number(ca.flight_id),
        crew_id: Number(ca.crew_id),
        duty_start_time: String(ca.duty_start_time),
        duty_end_time: String(ca.duty_end_time),
      }));
      setStored(KEYS.ASSIGNMENTS, mockAssignments);
    }

    if (delaysCsv && delaysCsv.length > 0) {
      mockDelays = delaysCsv.map((dl: any, idx: number) => ({
        log_id: Number(dl.log_id || idx + 1),
        flight_id: Number(dl.flight_id),
        delay_duration_minutes: Number(dl.delay_duration_minutes || dl.arr_delay || 15),
        reason_code: (dl.reason_code as any) || 'Air Traffic',
        logged_at: String(dl.logged_at || '2013-01-01 00:00:00'),
      }));
      setStored(KEYS.DELAYS, mockDelays);
    }

    csvLoaded = true;
    return true;
  } catch (e) {
    // Graceful fallback to rich built-in seed dataset
    return false;
  }
}

// Reset everything to pristine demo state
export function resetDemoData(): void {
  localStorage.removeItem(KEYS.BOOKINGS);
  localStorage.removeItem(KEYS.FLIGHTS);
  localStorage.removeItem(KEYS.AIRCRAFT);
  localStorage.removeItem(KEYS.CREW);
  localStorage.removeItem(KEYS.ASSIGNMENTS);
  localStorage.removeItem(KEYS.DELAYS);
  localStorage.removeItem(KEYS.USERS);
  localStorage.removeItem(KEYS.ACTIVITY);

  mockAircraft = [...SEED_AIRCRAFT];
  mockCrew = [...SEED_CREW];
  mockFlights = [...SEED_FLIGHTS];
  mockDelays = [...SEED_DELAYS];
  mockAssignments = [...SEED_CREW_ASSIGNMENTS];
  mockBookings = [...SEED_BOOKINGS];
  mockUsers = [...SEED_USERS];
  mockActivity = [
    {
      log_id: 1,
      action_type: 'SYSTEM_RESET',
      performed_by: 'admin@demo.com',
      details: 'All data reset to factory demo values.',
      created_at: '2013-01-01 00:00:00',
    },
  ];

  setStored(KEYS.AIRCRAFT, mockAircraft);
  setStored(KEYS.CREW, mockCrew);
  setStored(KEYS.FLIGHTS, mockFlights);
  setStored(KEYS.DELAYS, mockDelays);
  setStored(KEYS.ASSIGNMENTS, mockAssignments);
  setStored(KEYS.BOOKINGS, mockBookings);
  setStored(KEYS.USERS, mockUsers);
  setStored(KEYS.ACTIVITY, mockActivity);
}

// Helper: Enrich a flight object with Airport, Aircraft, Delay & Fare details
function enrichFlight(f: Flight): Flight {
  const origin = getAirport(f.origin_airport_id);
  const dest = getAirport(f.destination_airport_id);
  const ac = mockAircraft.find((a) => a.tail_number === f.assigned_aircraft_id);
  const delay = mockDelays.find((d) => d.flight_id === f.flight_id);

  // Compute on-time performance on this route
  const routeFlights = mockFlights.filter(
    (x) => x.origin_airport_id === f.origin_airport_id && x.destination_airport_id === f.destination_airport_id
  );
  const onTimeCount = routeFlights.filter((x) => x.status === 'On-Time').length;
  const onTimePercentage = routeFlights.length > 0 ? Math.round((onTimeCount / routeFlights.length) * 100) : 84;

  // Booked seats count
  const bookedPassengers = mockBookings
    .filter((b) => b.flight_id === f.flight_id && b.booking_status === 'Confirmed')
    .reduce((acc, b) => acc + (b.passengers?.length || 0), 0);

  // Deterministic Fare
  const fare = calculateFare(f.origin_airport_id, f.destination_airport_id, 'Economy');

  return {
    ...f,
    origin_name: origin.airport_name,
    origin_city: origin.city,
    destination_name: dest.airport_name,
    destination_city: dest.city,
    aircraft_model: ac?.model,
    aircraft_capacity: ac?.capacity || 150,
    delay_duration_minutes: delay?.delay_duration_minutes ?? null,
    delay_reason: delay?.reason_code ?? null,
    on_time_percentage: onTimePercentage,
    booked_seats_count: bookedPassengers,
    fare,
  };
}

// Helper: Log Admin Activity
function recordActivity(actionType: string, performedBy: string, details: string) {
  const newLog: ActivityLog = {
    log_id: mockActivity.length + 1,
    action_type: actionType,
    performed_by: performedBy,
    details,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  mockActivity.unshift(newLog);
  setStored(KEYS.ACTIVITY, mockActivity);
}

// In-Memory Mutex Simulation for Concurrency & Transaction Safety Lab
let mockCrewMutex = false;
const mockMutexQueue: Array<() => void> = [];

async function acquireCrewMutex(): Promise<void> {
  if (!mockCrewMutex) {
    mockCrewMutex = true;
    return;
  }
  return new Promise<void>((resolve) => {
    mockMutexQueue.push(() => {
      mockCrewMutex = true;
      resolve();
    });
  });
}

function releaseCrewMutex(): void {
  if (mockMutexQueue.length > 0) {
    const next = mockMutexQueue.shift()!;
    next();
  } else {
    mockCrewMutex = false;
  }
}

// ===================================================================
// PUBLIC API IMPLEMENTATION (MOCK vs LIVE)
// ===================================================================

export const apiClient = {
  // -----------------------------------------------------------------
  // AUTHENTICATION
  // -----------------------------------------------------------------
  async login(email: string, pass: string): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/auth.php?action=login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass }),
        });
        const data = await res.json();
        if (data.success && data.token) {
          localStorage.setItem(KEYS.AUTH_TOKEN, data.token);
          localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(data.user));
        }
        return data;
      } catch (err: any) {
        return { success: false, error: err.message || 'LIVE API request failed' };
      }
    }

    // MOCK MODE
    const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, error: 'User with this email not found' };
    }

    // Accept valid demo passwords
    if (
      (user.role === 'admin' && pass !== 'admin123') ||
      (user.role === 'passenger' && pass !== 'user123' && pass.length < 4)
    ) {
      return { success: false, error: 'Invalid password (use demo credentials)' };
    }

    const token = btoa(JSON.stringify({ user_id: user.user_id, email: user.email, role: user.role }));
    localStorage.setItem(KEYS.AUTH_TOKEN, token);
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    recordActivity('USER_LOGIN', user.email, `Logged in as ${user.role}`);

    return { success: true, token, user };
  },

  async register(fullName: string, email: string, phone: string, pass: string): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/auth.php?action=register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: fullName, email, phone, password: pass }),
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, error: err.message || 'LIVE API request failed' };
      }
    }

    // MOCK MODE
    if (mockUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const newUser: User = {
      user_id: mockUsers.length + 1,
      full_name: fullName,
      email,
      phone,
      role: 'passenger',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    mockUsers.push(newUser);
    setStored(KEYS.USERS, mockUsers);

    const token = btoa(JSON.stringify({ user_id: newUser.user_id, email: newUser.email, role: newUser.role }));
    localStorage.setItem(KEYS.AUTH_TOKEN, token);
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(newUser));
    recordActivity('USER_REGISTER', email, `New passenger registered: ${fullName}`);

    return { success: true, token, user: newUser };
  },

  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(KEYS.CURRENT_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  logout(): void {
    const user = this.getCurrentUser();
    if (user) {
      recordActivity('USER_LOGOUT', user.email, 'Logged out');
    }
    localStorage.removeItem(KEYS.AUTH_TOKEN);
    localStorage.removeItem(KEYS.CURRENT_USER);
  },

  // -----------------------------------------------------------------
  // FLIGHTS SEARCH & CRUD
  // -----------------------------------------------------------------
  async searchFlights(params: {
    origin?: string;
    destination?: string;
    date?: string; // YYYY-MM-DD
    status?: string;
    aircraft?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; total: number; data: Flight[] }> {
    if (getApiMode() === 'LIVE') {
      try {
        const query = new URLSearchParams();
        if (params.origin) query.set('origin', params.origin);
        if (params.destination) query.set('destination', params.destination);
        if (params.date) query.set('date', params.date);
        if (params.status) query.set('status', params.status);
        if (params.aircraft) query.set('aircraft', params.aircraft);
        if (params.search) query.set('search', params.search);
        if (params.sortBy) query.set('sort_by', params.sortBy);
        if (params.sortOrder) query.set('sort_order', params.sortOrder);
        if (params.limit) query.set('limit', String(params.limit));
        if (params.offset) query.set('offset', String(params.offset));

        const res = await fetch(`${API_BASE}/flights.php?${query.toString()}`);
        return await res.json();
      } catch (err: any) {
        console.warn('LIVE search failed, falling back to mock:', err);
      }
    }

    // MOCK MODE
    let filtered = [...mockFlights];

    if (params.origin) {
      filtered = filtered.filter((f) => f.origin_airport_id === params.origin);
    }
    if (params.destination) {
      filtered = filtered.filter((f) => f.destination_airport_id === params.destination);
    }
    if (params.date) {
      filtered = filtered.filter((f) => f.scheduled_departure.startsWith(params.date!));
    }
    if (params.status) {
      filtered = filtered.filter((f) => f.status === params.status);
    }
    if (params.aircraft) {
      filtered = filtered.filter((f) => f.assigned_aircraft_id === params.aircraft);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.flight_number.toLowerCase().includes(q) ||
          f.origin_airport_id.toLowerCase().includes(q) ||
          f.destination_airport_id.toLowerCase().includes(q) ||
          getAirport(f.destination_airport_id).city.toLowerCase().includes(q)
      );
    }

    // Sorting
    const sortBy = params.sortBy || 'scheduled_departure';
    const isDesc = params.sortOrder === 'DESC';

    filtered.sort((a, b) => {
      let valA: any = (a as any)[sortBy] ?? '';
      let valB: any = (b as any)[sortBy] ?? '';
      if (sortBy === 'price') {
        valA = calculateFare(a.origin_airport_id, a.destination_airport_id).totalFare;
        valB = calculateFare(b.origin_airport_id, b.destination_airport_id).totalFare;
      }
      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });

    const total = filtered.length;
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    const paginated = filtered.slice(offset, offset + limit).map(enrichFlight);

    return { success: true, total, data: paginated };
  },

  async getFlight(flightId: number): Promise<{ success: boolean; data?: Flight; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/flights.php?flight_id=${flightId}`);
        return await res.json();
      } catch (err: any) {
        console.warn('LIVE getFlight failed, falling back:', err);
      }
    }

    const flight = mockFlights.find((f) => f.flight_id === flightId);
    if (!flight) return { success: false, error: 'Flight not found' };

    const enriched = enrichFlight(flight);

    // Attach crew
    const assignedCrew = mockAssignments
      .filter((ca) => ca.flight_id === flightId)
      .map((ca) => {
        const cm = mockCrew.find((c) => c.crew_id === ca.crew_id);
        return {
          ...ca,
          full_name: cm?.full_name,
          role: cm?.role,
          base_airport_id: cm?.base_airport_id,
        };
      });

    enriched.assigned_crew = assignedCrew;
    return { success: true, data: enriched };
  },

  async createFlight(flightData: Partial<Flight>): Promise<{ success: boolean; flight_id?: number; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/flights.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}`,
          },
          body: JSON.stringify(flightData),
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Validation
    if (flightData.origin_airport_id === flightData.destination_airport_id) {
      return { success: false, error: 'Origin and destination cannot be the same airport' };
    }
    if (
      new Date(flightData.scheduled_arrival!).getTime() <=
      new Date(flightData.scheduled_departure!).getTime()
    ) {
      return { success: false, error: 'Arrival time must be later than departure time' };
    }

    // Overlap check for aircraft
    if (flightData.assigned_aircraft_id) {
      const depTime = new Date(flightData.scheduled_departure!).getTime();
      const arrTime = new Date(flightData.scheduled_arrival!).getTime();
      const conflict = mockFlights.find(
        (f) =>
          f.assigned_aircraft_id === flightData.assigned_aircraft_id &&
          f.status !== 'Cancelled' &&
          ((depTime <= new Date(f.scheduled_departure).getTime() && arrTime >= new Date(f.scheduled_departure).getTime()) ||
            (depTime <= new Date(f.scheduled_arrival).getTime() && arrTime >= new Date(f.scheduled_arrival).getTime()) ||
            (depTime >= new Date(f.scheduled_departure).getTime() && arrTime <= new Date(f.scheduled_arrival).getTime()))
      );
      if (conflict) {
        return {
          success: false,
          error: `Aircraft conflict: Tail ${flightData.assigned_aircraft_id} is already operating flight ${conflict.flight_number} during this period.`,
        };
      }
    }

    const newId = Math.max(...mockFlights.map((f) => f.flight_id), 100) + 1;
    const newFlight: Flight = {
      flight_id: newId,
      flight_number: flightData.flight_number || `SK-${newId}`,
      origin_airport_id: flightData.origin_airport_id!,
      destination_airport_id: flightData.destination_airport_id!,
      scheduled_departure: flightData.scheduled_departure!,
      scheduled_arrival: flightData.scheduled_arrival!,
      status: flightData.status || 'On-Time',
      assigned_aircraft_id: flightData.assigned_aircraft_id || null,
    };

    mockFlights.unshift(newFlight);
    setStored(KEYS.FLIGHTS, mockFlights);

    const user = this.getCurrentUser();
    recordActivity('CREATE_FLIGHT', user?.email || 'admin', `Created flight ${newFlight.flight_number} (${newFlight.origin_airport_id} -> ${newFlight.destination_airport_id})`);

    return { success: true, flight_id: newId };
  },

  async updateFlight(
    flightId: number,
    updates: {
      status?: Flight['status'];
      assigned_aircraft_id?: string | null;
      delay_minutes?: number;
      delay_reason?: DelayReasonCode;
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/flights.php`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}`,
          },
          body: JSON.stringify({ flight_id: flightId, ...updates }),
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    const idx = mockFlights.findIndex((f) => f.flight_id === flightId);
    if (idx === -1) return { success: false, error: 'Flight not found' };

    if (updates.status) {
      mockFlights[idx].status = updates.status;

      // Log in delay ledger if Delayed
      if (updates.status === 'Delayed' && updates.delay_minutes && updates.delay_reason) {
        // Remove existing
        mockDelays = mockDelays.filter((d) => d.flight_id !== flightId);
        const newDelay: DelayRecord = {
          log_id: mockDelays.length + 1,
          flight_id: flightId,
          delay_duration_minutes: updates.delay_minutes,
          reason_code: updates.delay_reason,
          logged_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
          flight_number: mockFlights[idx].flight_number,
          origin_airport_id: mockFlights[idx].origin_airport_id,
          destination_airport_id: mockFlights[idx].destination_airport_id,
          scheduled_departure: mockFlights[idx].scheduled_departure,
        };
        mockDelays.unshift(newDelay);
        setStored(KEYS.DELAYS, mockDelays);
      }
    }

    if (updates.assigned_aircraft_id !== undefined) {
      mockFlights[idx].assigned_aircraft_id = updates.assigned_aircraft_id;
    }

    setStored(KEYS.FLIGHTS, mockFlights);

    const user = this.getCurrentUser();
    recordActivity('UPDATE_FLIGHT', user?.email || 'admin', `Updated flight ID ${flightId} status to ${updates.status || 'modified'}`);

    return { success: true };
  },

  async deleteFlight(flightId: number): Promise<{ success: boolean; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/flights.php?flight_id=${flightId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}` },
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    mockFlights = mockFlights.filter((f) => f.flight_id !== flightId);
    mockAssignments = mockAssignments.filter((a) => a.flight_id !== flightId);
    mockDelays = mockDelays.filter((d) => d.flight_id !== flightId);

    setStored(KEYS.FLIGHTS, mockFlights);
    setStored(KEYS.ASSIGNMENTS, mockAssignments);
    setStored(KEYS.DELAYS, mockDelays);

    const user = this.getCurrentUser();
    recordActivity('DELETE_FLIGHT', user?.email || 'admin', `Deleted flight ID ${flightId}`);

    return { success: true };
  },

  // -----------------------------------------------------------------
  // AIRPORTS
  // -----------------------------------------------------------------
  async getAirports(search?: string): Promise<{ success: boolean; data: Airport[] }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/airports.php${search ? `?search=${encodeURIComponent(search)}` : ''}`);
        return await res.json();
      } catch {
        // Fallback to memory
      }
    }

    let list = mockAirports;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.airport_id.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.airport_name.toLowerCase().includes(q)
      );
    }
    return { success: true, data: list };
  },

  // -----------------------------------------------------------------
  // AIRCRAFT FLEET & MAINTENANCE
  // -----------------------------------------------------------------
  async getAircraftList(): Promise<{ success: boolean; data: Aircraft[] }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/aircraft.php`);
        return await res.json();
      } catch {
        // Fallback
      }
    }

    // Enrich with days since maintenance relative to demo reference 2013-01-01
    const demoRefTime = new Date('2013-01-01').getTime();
    const list = mockAircraft.map((a) => {
      const maintTime = new Date(a.last_maintenance_date).getTime();
      const days = Math.round((demoRefTime - maintTime) / (1000 * 60 * 60 * 24));
      const flightCount = mockFlights.filter((f) => f.assigned_aircraft_id === a.tail_number).length;
      return {
        ...a,
        days_since_maintenance: Math.max(days, 0),
        is_maintenance_due: days > 180,
        total_flights: flightCount,
        total_hours: Math.round(flightCount * 2.8 * 10) / 10,
      };
    });

    list.sort((a, b) => (b.days_since_maintenance || 0) - (a.days_since_maintenance || 0));
    return { success: true, data: list };
  },

  async addAircraft(aircraft: Partial<Aircraft>): Promise<{ success: boolean; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/aircraft.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}`,
          },
          body: JSON.stringify(aircraft),
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (!aircraft.tail_number || !aircraft.model || !aircraft.capacity) {
      return { success: false, error: 'Tail number, model, and capacity are required' };
    }

    if (mockAircraft.some((a) => a.tail_number === aircraft.tail_number)) {
      return { success: false, error: 'An aircraft with this tail number already exists' };
    }

    const newAc: Aircraft = {
      tail_number: aircraft.tail_number.toUpperCase(),
      model: aircraft.model,
      capacity: aircraft.capacity,
      last_maintenance_date: aircraft.last_maintenance_date || '2012-12-01',
    };

    mockAircraft.push(newAc);
    setStored(KEYS.AIRCRAFT, mockAircraft);

    const user = this.getCurrentUser();
    recordActivity('ADD_AIRCRAFT', user?.email || 'admin', `Registered aircraft ${newAc.tail_number} (${newAc.model})`);

    return { success: true };
  },

  async markAircraftServiced(tailNumber: string, dateStr: string = '2013-01-01'): Promise<{ success: boolean; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/aircraft.php`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}`,
          },
          body: JSON.stringify({ tail_number: tailNumber, service_date: dateStr }),
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    const ac = mockAircraft.find((a) => a.tail_number === tailNumber);
    if (!ac) return { success: false, error: 'Aircraft not found' };

    ac.last_maintenance_date = dateStr;
    setStored(KEYS.AIRCRAFT, mockAircraft);

    const user = this.getCurrentUser();
    recordActivity('MAINTENANCE_SERVICE', user?.email || 'admin', `Marked ${tailNumber} as serviced on ${dateStr}`);

    return { success: true };
  },

  // -----------------------------------------------------------------
  // CREW MANAGEMENT & CONFLICT CHECKER
  // -----------------------------------------------------------------
  async getCrewList(role?: string, baseAirport?: string): Promise<{ success: boolean; data: CrewMember[] }> {
    if (getApiMode() === 'LIVE') {
      try {
        const query = new URLSearchParams();
        if (role) query.set('role', role);
        if (baseAirport) query.set('base', baseAirport);
        const res = await fetch(`${API_BASE}/crew.php?${query.toString()}`);
        return await res.json();
      } catch {
        // Fallback
      }
    }

    let list = mockCrew.map((c) => {
      const assignments = mockAssignments.filter((a) => a.crew_id === c.crew_id);
      const totalDutyMinutes = assignments.reduce((acc, a) => {
        const dur = (new Date(a.duty_end_time).getTime() - new Date(a.duty_start_time).getTime()) / 60000;
        return acc + Math.max(dur, 0);
      }, 0);
      const baseAp = c.base_airport_id ? getAirport(c.base_airport_id) : null;
      return {
        ...c,
        base_city: baseAp?.city,
        total_assignments: assignments.length,
        total_duty_hours: Math.round((totalDutyMinutes / 60) * 10) / 10,
      };
    });

    if (role) list = list.filter((c) => c.role === role);
    if (baseAirport) list = list.filter((c) => c.base_airport_id === baseAirport);

    return { success: true, data: list };
  },

  async getFlightRoster(flightId: number): Promise<{
    success: boolean;
    data: {
      flight_id: number;
      is_complete: boolean;
      captains: number;
      first_officers: number;
      cabin_crew: number;
      crew: CrewAssignmentEnriched[];
    };
  }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/crew.php?action=flight_roster&flight_id=${flightId}`);
        return await res.json();
      } catch {
        // Fallback
      }
    }

    const assigned = mockAssignments
      .filter((a) => a.flight_id === flightId)
      .map((a) => {
        const cm = mockCrew.find((c) => c.crew_id === a.crew_id);
        return {
          ...a,
          full_name: cm?.full_name,
          role: cm?.role,
          base_airport_id: cm?.base_airport_id,
        };
      });

    const captains = assigned.filter((a) => a.role === 'Captain').length;
    const firstOfficers = assigned.filter((a) => a.role === 'First Officer').length;
    const cabinCrew = assigned.filter((a) => a.role === 'Cabin Crew').length;
    const isComplete = captains >= 1 && firstOfficers >= 1 && cabinCrew >= 3;

    return {
      success: true,
      data: {
        flight_id: flightId,
        is_complete: isComplete,
        captains,
        first_officers: firstOfficers,
        cabin_crew: cabinCrew,
        crew: assigned,
      },
    };
  },

  /**
   * MANDATORY CONFLICT CHECKER:
   * Blocks:
   * (a) Overlapping duty windows for same crew member
   * (b) Less than 2 hours rest between duties
   */
  async checkCrewConflicts(
    crewId: number,
    dutyStartStr: string,
    dutyEndStr: string
  ): Promise<{ hasConflict: boolean; reason?: string }> {
    const startMs = new Date(dutyStartStr).getTime();
    const endMs = new Date(dutyEndStr).getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    const crewAssignments = mockAssignments.filter((a) => a.crew_id === crewId);

    for (const a of crewAssignments) {
      const aStartMs = new Date(a.duty_start_time).getTime();
      const aEndMs = new Date(a.duty_end_time).getTime();
      const f = mockFlights.find((fl) => fl.flight_id === a.flight_id);
      const flightLabel = f ? f.flight_number : `Flight #${a.flight_id}`;

      // Check 1: Direct Overlap
      if (
        (startMs <= aStartMs && endMs >= aStartMs) ||
        (startMs <= aEndMs && endMs >= aEndMs) ||
        (startMs >= aStartMs && endMs <= aEndMs)
      ) {
        return {
          hasConflict: true,
          reason: `OVERLAPPING DUTY CONFLICT: Crew member is already on duty for ${flightLabel} (${a.duty_start_time.slice(11, 16)} - ${a.duty_end_time.slice(11, 16)})`,
        };
      }

      // Check 2: Minimum 2 hours rest before duty
      if (aEndMs <= startMs && startMs - aEndMs < twoHoursMs) {
        const restMins = Math.round((startMs - aEndMs) / 60000);
        return {
          hasConflict: true,
          reason: `REST RULE VIOLATION: Only ${restMins} minutes rest after ${flightLabel}. Minimum mandatory 2 hours (120 min) rest required.`,
        };
      }

      // Check 3: Minimum 2 hours rest after duty
      if (endMs <= aStartMs && aStartMs - endMs < twoHoursMs) {
        const restMins = Math.round((aStartMs - endMs) / 60000);
        return {
          hasConflict: true,
          reason: `REST RULE VIOLATION: Next duty on ${flightLabel} begins in ${restMins} minutes. Minimum mandatory 2 hours (120 min) rest required.`,
        };
      }
    }

    return { hasConflict: false };
  },

  async suggestStandbyCrew(
    flightId: number,
    role: CrewMember['role']
  ): Promise<{ success: boolean; data: CrewMember[]; duty_start: string; duty_end: string; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/crew.php?action=suggest_standby&flight_id=${flightId}&role=${role}`);
        return await res.json();
      } catch {
        // Fallback
      }
    }

    const flight = mockFlights.find((f) => f.flight_id === flightId);
    if (!flight) return { success: false, data: [], duty_start: '', duty_end: '', error: 'Flight not found' };

    // Standard duty window: 1 hr before departure to 30 mins after arrival
    const depTime = new Date(flight.scheduled_departure).getTime();
    const arrTime = new Date(flight.scheduled_arrival).getTime();
    const dutyStart = new Date(depTime - 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const dutyEnd = new Date(arrTime + 30 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    const eligible: CrewMember[] = [];

    for (const c of mockCrew) {
      if (c.role !== role) continue;
      // Preference: base airport matches origin or null
      if (c.base_airport_id && c.base_airport_id !== flight.origin_airport_id) continue;

      const conflictCheck = await this.checkCrewConflicts(c.crew_id, dutyStart, dutyEnd);
      if (!conflictCheck.hasConflict) {
        eligible.push(c);
      }
    }

    return {
      success: true,
      data: eligible,
      duty_start: dutyStart,
      duty_end: dutyEnd,
    };
  },

  async assignCrew(flightId: number, crewId: number): Promise<{ success: boolean; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/crew.php?action=assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}`,
          },
          body: JSON.stringify({ flight_id: flightId, crew_id: crewId }),
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    const flight = mockFlights.find((f) => f.flight_id === flightId);
    if (!flight) return { success: false, error: 'Flight not found' };

    const depTime = new Date(flight.scheduled_departure).getTime();
    const arrTime = new Date(flight.scheduled_arrival).getTime();
    const dutyStart = new Date(depTime - 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const dutyEnd = new Date(arrTime + 30 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // Conflict Check
    const check = await this.checkCrewConflicts(crewId, dutyStart, dutyEnd);
    if (check.hasConflict) {
      return { success: false, error: check.reason };
    }

    const newAssignment: CrewAssignment = {
      assignment_id: Math.max(...mockAssignments.map((a) => a.assignment_id), 0) + 1,
      flight_id: flightId,
      crew_id: crewId,
      duty_start_time: dutyStart,
      duty_end_time: dutyEnd,
    };

    mockAssignments.push(newAssignment);
    setStored(KEYS.ASSIGNMENTS, mockAssignments);

    const user = this.getCurrentUser();
    const cm = mockCrew.find((c) => c.crew_id === crewId);
    recordActivity('ASSIGN_CREW', user?.email || 'admin', `Assigned ${cm?.full_name} (${cm?.role}) to Flight ${flight.flight_number}`);

    return { success: true };
  },

  async unassignCrew(assignmentId: number): Promise<{ success: boolean; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/crew.php?action=unassign&assignment_id=${assignmentId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}` },
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    mockAssignments = mockAssignments.filter((a) => a.assignment_id !== assignmentId);
    setStored(KEYS.ASSIGNMENTS, mockAssignments);

    const user = this.getCurrentUser();
    recordActivity('UNASSIGN_CREW', user?.email || 'admin', `Removed assignment ID ${assignmentId}`);

    return { success: true };
  },

  // -----------------------------------------------------------------
  // DELAY LEDGER
  // -----------------------------------------------------------------
  async getDelayLogs(params?: { reason?: string; airport?: string }): Promise<{
    success: boolean;
    stats: { total_delays: number; avg_delay_minutes: number; max_delay_minutes: number; total_delay_minutes: number };
    data: DelayRecord[];
  }> {
    if (getApiMode() === 'LIVE') {
      try {
        const query = new URLSearchParams();
        if (params?.reason) query.set('reason', params.reason);
        if (params?.airport) query.set('airport', params.airport);
        const res = await fetch(`${API_BASE}/delays.php?${query.toString()}`);
        return await res.json();
      } catch {
        // Fallback
      }
    }

    let list = mockDelays.map((dl) => {
      const f = mockFlights.find((fl) => fl.flight_id === dl.flight_id);
      return {
        ...dl,
        flight_number: f?.flight_number,
        origin_airport_id: f?.origin_airport_id,
        destination_airport_id: f?.destination_airport_id,
        scheduled_departure: f?.scheduled_departure,
        origin_city: f ? getAirport(f.origin_airport_id).city : '',
        destination_city: f ? getAirport(f.destination_airport_id).city : '',
      };
    });

    if (params?.reason) {
      list = list.filter((d) => d.reason_code === params.reason);
    }
    if (params?.airport) {
      list = list.filter((d) => d.origin_airport_id === params.airport || d.destination_airport_id === params.airport);
    }

    const totalMinutes = list.reduce((acc, d) => acc + d.delay_duration_minutes, 0);
    const avgMinutes = list.length > 0 ? Math.round((totalMinutes / list.length) * 10) / 10 : 0;
    const maxMinutes = list.length > 0 ? Math.max(...list.map((d) => d.delay_duration_minutes)) : 0;

    return {
      success: true,
      stats: {
        total_delays: list.length,
        avg_delay_minutes: avgMinutes,
        max_delay_minutes: maxMinutes,
        total_delay_minutes: totalMinutes,
      },
      data: list,
    };
  },

  async logDelay(flightId: number, minutes: number, reason: DelayReasonCode): Promise<{ success: boolean; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/delays.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}`,
          },
          body: JSON.stringify({ flight_id: flightId, delay_duration_minutes: minutes, reason_code: reason }),
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return await this.updateFlight(flightId, {
      status: 'Delayed',
      delay_minutes: minutes,
      delay_reason: reason,
    });
  },

  // -----------------------------------------------------------------
  // BOOKINGS, PNR, TICKETS & CANCELLATION
  // -----------------------------------------------------------------
  async createBooking(bookingData: {
    flight_id: number;
    travel_class: TravelClass;
    total_fare: number;
    passengers: Passenger[];
  }): Promise<{ success: boolean; pnr?: string; booking_id?: number; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/bookings.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}`,
          },
          body: JSON.stringify(bookingData),
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // MOCK TRANSACTION & CONFLICT CHECK:
    // Check if any seat is already booked on this flight for confirmed bookings
    const flightBookings = mockBookings.filter(
      (b) => b.flight_id === bookingData.flight_id && b.booking_status === 'Confirmed'
    );
    const existingSeats = new Set<string>();
    flightBookings.forEach((b) => {
      b.passengers?.forEach((p) => existingSeats.add(p.seat_no));
    });

    for (const p of bookingData.passengers) {
      if (existingSeats.has(p.seat_no)) {
        return {
          success: false,
          error: `DOUBLE-BOOKING PREVENTED: Seat ${p.seat_no} has already been reserved by another passenger. Please select another seat.`,
        };
      }
    }

    // Generate unique 6-character PNR
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pnr = '';
    do {
      pnr = 'SK' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (mockBookings.some((b) => b.pnr === pnr));

    const currentUser = this.getCurrentUser();
    const newBookingId = Math.max(...mockBookings.map((b) => b.booking_id), 0) + 1;

    const newBooking: Booking = {
      booking_id: newBookingId,
      pnr,
      user_id: currentUser ? currentUser.user_id : null,
      flight_id: bookingData.flight_id,
      travel_class: bookingData.travel_class,
      total_fare: bookingData.total_fare,
      booking_status: 'Confirmed',
      booked_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      passengers: bookingData.passengers.map((p, idx) => ({
        passenger_id: idx + 1,
        booking_id: newBookingId,
        full_name: p.full_name,
        age: p.age,
        gender: p.gender,
        seat_no: p.seat_no,
      })),
    };

    mockBookings.unshift(newBooking);
    setStored(KEYS.BOOKINGS, mockBookings);

    recordActivity('CREATE_BOOKING', currentUser?.email || 'guest', `Generated PNR: ${pnr} for Flight #${bookingData.flight_id}`);

    return { success: true, pnr, booking_id: newBookingId };
  },

  async getBookingByPnr(pnr: string): Promise<{ success: boolean; data?: Booking; error?: string }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/bookings.php?action=pnr&pnr=${encodeURIComponent(pnr)}`);
        return await res.json();
      } catch {
        // Fallback
      }
    }

    const cleanPnr = pnr.trim().toUpperCase();
    const b = mockBookings.find((x) => x.pnr === cleanPnr);
    if (!b) return { success: false, error: 'No booking found with this PNR' };

    const f = mockFlights.find((fl) => fl.flight_id === b.flight_id);
    const delay = mockDelays.find((d) => d.flight_id === b.flight_id);
    const origin = f ? getAirport(f.origin_airport_id) : null;
    const dest = f ? getAirport(f.destination_airport_id) : null;
    const ac = f ? mockAircraft.find((a) => a.tail_number === f.assigned_aircraft_id) : null;

    const enriched: Booking = {
      ...b,
      flight_number: f?.flight_number,
      scheduled_departure: f?.scheduled_departure,
      scheduled_arrival: f?.scheduled_arrival,
      flight_status: f?.status,
      origin_airport_id: f?.origin_airport_id,
      origin_name: origin?.airport_name,
      origin_city: origin?.city,
      destination_airport_id: f?.destination_airport_id,
      destination_name: dest?.airport_name,
      destination_city: dest?.city,
      aircraft_model: ac?.model,
      delay_duration_minutes: delay?.delay_duration_minutes ?? null,
      delay_reason: delay?.reason_code ?? null,
      passenger_count: b.passengers?.length || 1,
    };

    return { success: true, data: enriched };
  },

  async getUserBookings(userId?: number): Promise<{ success: boolean; data: Booking[] }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/bookings.php`, {
          headers: { Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}` },
        });
        return await res.json();
      } catch {
        // Fallback
      }
    }

    let list = mockBookings;
    if (userId) {
      list = list.filter((b) => b.user_id === userId);
    }

    const enriched = list.map((b) => {
      const f = mockFlights.find((fl) => fl.flight_id === b.flight_id);
      const origin = f ? getAirport(f.origin_airport_id) : null;
      const dest = f ? getAirport(f.destination_airport_id) : null;
      return {
        ...b,
        flight_number: f?.flight_number,
        scheduled_departure: f?.scheduled_departure,
        scheduled_arrival: f?.scheduled_arrival,
        flight_status: f?.status,
        origin_city: origin?.city,
        destination_city: dest?.city,
        passenger_count: b.passengers?.length || 1,
      };
    });

    return { success: true, data: enriched };
  },

  async cancelBooking(pnr: string): Promise<{
    success: boolean;
    refund_percent?: number;
    refund_amount?: number;
    message?: string;
    error?: string;
  }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/bookings.php?action=cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}`,
          },
          body: JSON.stringify({ pnr }),
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    const cleanPnr = pnr.trim().toUpperCase();
    const booking = mockBookings.find((b) => b.pnr === cleanPnr);
    if (!booking) return { success: false, error: 'Booking not found' };

    if (booking.booking_status === 'Cancelled') {
      return { success: false, error: 'Booking is already cancelled' };
    }

    // Refund Policy:
    // Reference date for demo: 2013-01-01 00:00:00
    const flight = mockFlights.find((f) => f.flight_id === booking.flight_id);
    const depTime = flight ? new Date(flight.scheduled_departure).getTime() : Date.now();
    const demoNow = new Date('2013-01-01 00:00:00').getTime();
    const diffHours = (depTime - demoNow) / (1000 * 60 * 60);

    let refundPercent = 0;
    if (diffHours > 24) {
      refundPercent = 100;
    } else if (diffHours > 0) {
      refundPercent = 50;
    } else {
      refundPercent = 0;
    }

    const refundAmount = Math.round((booking.total_fare * (refundPercent / 100)) * 100) / 100;

    booking.booking_status = 'Cancelled';
    setStored(KEYS.BOOKINGS, mockBookings);

    const user = this.getCurrentUser();
    recordActivity('CANCEL_BOOKING', user?.email || 'guest', `Cancelled PNR ${cleanPnr}. Refund: $${refundAmount} (${refundPercent}%)`);

    return {
      success: true,
      refund_percent: refundPercent,
      refund_amount: refundAmount,
      message: `Booking cancelled successfully. Seats have been freed. Eligible refund: $${refundAmount} (${refundPercent}%).`,
    };
  },

  async getFlightManifest(flightId: number): Promise<{
    success: boolean;
    flight?: Flight;
    manifest?: Array<{
      passenger_id: number;
      full_name: string;
      age: number;
      gender: string;
      seat_no: string;
      pnr: string;
      travel_class: TravelClass;
      booking_status: string;
    }>;
    error?: string;
  }> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/bookings.php?action=manifest&flight_id=${flightId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem(KEYS.AUTH_TOKEN) || ''}` },
        });
        return await res.json();
      } catch {
        // Fallback
      }
    }

    const flightRes = await this.getFlight(flightId);
    if (!flightRes.data) return { success: false, error: 'Flight not found' };

    const manifest: any[] = [];
    mockBookings
      .filter((b) => b.flight_id === flightId && b.booking_status === 'Confirmed')
      .forEach((b) => {
        b.passengers?.forEach((p) => {
          manifest.push({
            passenger_id: p.passenger_id || 1,
            full_name: p.full_name,
            age: p.age,
            gender: p.gender,
            seat_no: p.seat_no,
            pnr: b.pnr,
            travel_class: b.travel_class,
            booking_status: b.booking_status,
          });
        });
      });

    manifest.sort((a, b) => a.seat_no.localeCompare(b.seat_no, undefined, { numeric: true }));

    return {
      success: true,
      flight: flightRes.data,
      manifest,
    };
  },

  // -----------------------------------------------------------------
  // DBMS REPORTS & VIVA SQL
  // -----------------------------------------------------------------
  async getReportsList(): Promise<ReportMeta[]> {
    return [
      {
        key: 'delay_bottlenecks',
        title: 'Delay Bottlenecks by Reason & Origin Hub',
        concept: 'GROUP BY with HAVING & Multiple Aggregates',
        description: 'Aggregates delay incidents across NYC hubs, filtering only categories with significant impact.',
        sql: `SELECT f.origin_airport_id AS origin_hub, dl.reason_code, COUNT(dl.log_id) AS incident_count, ROUND(AVG(dl.delay_duration_minutes), 1) AS avg_delay_mins, MAX(dl.delay_duration_minutes) AS max_delay_mins, SUM(dl.delay_duration_minutes) AS total_lost_mins FROM delay_ledger dl JOIN flights f ON dl.flight_id = f.flight_id GROUP BY f.origin_airport_id, dl.reason_code HAVING incident_count >= 1 ORDER BY total_lost_mins DESC;`,
      },
      {
        key: 'unutilized_aircraft',
        title: 'Aircraft Never Flown / Low Fleet Utilization',
        concept: 'LEFT OUTER JOIN with IS NULL Filter',
        description: 'Identifies aircraft in the fleet that have zero assigned flights in the dataset.',
        sql: `SELECT a.tail_number, a.model, a.capacity, a.last_maintenance_date, COUNT(f.flight_id) AS flight_count FROM aircraft a LEFT JOIN flights f ON a.tail_number = f.assigned_aircraft_id GROUP BY a.tail_number, a.model, a.capacity, a.last_maintenance_date HAVING flight_count = 0 ORDER BY a.last_maintenance_date ASC;`,
      },
      {
        key: 'busiest_crew_window',
        title: 'Crew Duty Leaderboard & Ranking',
        concept: 'Window Function (DENSE_RANK() OVER Partition/Order)',
        description: 'Ranks crew members within their respective role based on completed duty flight hours.',
        sql: `SELECT cm.full_name, cm.role, cm.base_airport_id, COUNT(ca.assignment_id) AS duty_shifts, COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, ca.duty_start_time, ca.duty_end_time) / 60.0), 1), 0.0) AS total_duty_hours, DENSE_RANK() OVER (PARTITION BY cm.role ORDER BY COALESCE(SUM(TIMESTAMPDIFF(MINUTE, ca.duty_start_time, ca.duty_end_time)), 0) DESC) AS role_rank FROM crew_members cm LEFT JOIN crew_assignments ca ON cm.crew_id = ca.crew_id GROUP BY cm.crew_id, cm.full_name, cm.role, cm.base_airport_id ORDER BY cm.role, role_rank ASC LIMIT 50;`,
      },
      {
        key: 'route_performance',
        title: 'Route On-Time Performance & Reliability',
        concept: 'Conditional Aggregation with CASE WHEN',
        description: 'Computes exact on-time, delayed, and cancellation percentages across all distinct city pairs.',
        sql: `SELECT f.origin_airport_id, f.destination_airport_id, dest.city AS destination_city, COUNT(f.flight_id) AS total_scheduled, SUM(CASE WHEN f.status = 'On-Time' THEN 1 ELSE 0 END) AS on_time_count, SUM(CASE WHEN f.status = 'Delayed' THEN 1 ELSE 0 END) AS delayed_count, SUM(CASE WHEN f.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_count, ROUND((SUM(CASE WHEN f.status = 'On-Time' THEN 1 ELSE 0 END) * 100.0) / COUNT(f.flight_id), 1) AS on_time_percentage FROM flights f JOIN airports dest ON f.destination_airport_id = dest.airport_id GROUP BY f.origin_airport_id, f.destination_airport_id, dest.city ORDER BY total_scheduled DESC, on_time_percentage DESC;`,
      },
      {
        key: 'peak_risk_hours',
        title: 'High-Risk Departure Windows by Hour of Day',
        concept: 'Date/Time Extraction & Aggregate Analysis',
        description: 'Analyzes which times of day experience the highest frequency and severity of delays.',
        sql: `SELECT HOUR(f.scheduled_departure) AS departure_hour, COUNT(f.flight_id) AS scheduled_flights, SUM(CASE WHEN f.status = 'Delayed' THEN 1 ELSE 0 END) AS delayed_flights, ROUND((SUM(CASE WHEN f.status = 'Delayed' THEN 1 ELSE 0 END) * 100.0) / COUNT(f.flight_id), 1) AS delay_risk_pct, COALESCE(ROUND(AVG(dl.delay_duration_minutes), 1), 0.0) AS avg_delay_mins FROM flights f LEFT JOIN delay_ledger dl ON f.flight_id = dl.flight_id GROUP BY HOUR(f.scheduled_departure) ORDER BY departure_hour ASC;`,
      },
      {
        key: 'revenue_by_class',
        title: 'Revenue & Yield by Travel Class & Route',
        concept: '3-Table Multi-Join with Currency Aggregation',
        description: 'Summarizes passenger bookings, ticket sales revenue, and average ticket yield.',
        sql: `SELECT b.travel_class, CONCAT(f.origin_airport_id, ' -> ', f.destination_airport_id) AS route, COUNT(b.booking_id) AS total_bookings, COUNT(p.passenger_id) AS total_passengers, SUM(b.total_fare) AS gross_revenue, ROUND(AVG(b.total_fare), 2) AS avg_ticket_price FROM bookings b JOIN flights f ON b.flight_id = f.flight_id LEFT JOIN passengers p ON b.booking_id = p.booking_id WHERE b.booking_status = 'Confirmed' GROUP BY b.travel_class, f.origin_airport_id, f.destination_airport_id ORDER BY gross_revenue DESC;`,
      },
      {
        key: 'route_leaderboard',
        title: 'Route Delay Leaderboard & Ranking',
        concept: 'Window Function: DENSE_RANK() OVER (ORDER BY Avg Delay DESC)',
        description: 'Ranks all origin-destination routes by average delay severity with on-time and delay percentages.',
        sql: `SELECT CONCAT(f.origin_airport_id, ' -> ', f.destination_airport_id) AS route, f.origin_airport_id, f.destination_airport_id, dest.city AS destination_city, COUNT(f.flight_id) AS total_flights, SUM(CASE WHEN f.status = 'Delayed' THEN 1 ELSE 0 END) AS delayed_flights, ROUND((SUM(CASE WHEN f.status = 'Delayed' THEN 1 ELSE 0 END) * 100.0) / COUNT(f.flight_id), 1) AS delay_percentage, COALESCE(ROUND(AVG(dl.delay_duration_minutes), 1), 0.0) AS avg_delay_minutes, DENSE_RANK() OVER (ORDER BY COALESCE(AVG(dl.delay_duration_minutes), 0) DESC) AS delay_rank FROM flights f JOIN airports dest ON f.destination_airport_id = dest.airport_id LEFT JOIN delay_ledger dl ON f.flight_id = dl.flight_id GROUP BY f.origin_airport_id, f.destination_airport_id, dest.city ORDER BY delay_rank ASC LIMIT 50;`,
      },
      {
        key: 'aircraft_utilization',
        title: 'Fleet Aircraft Utilization & Airworthiness',
        concept: 'Conditional Aggregates & DATEDIFF Airworthiness Status',
        description: 'Evaluates flight hours and flags maintenance overdue (>180 days) or approaching (>120 days).',
        sql: `SELECT a.tail_number, a.model, a.capacity, a.last_maintenance_date, DATEDIFF('2013-12-31', a.last_maintenance_date) AS days_since_maintenance, COUNT(f.flight_id) AS total_flights, COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, f.scheduled_departure, f.scheduled_arrival) / 60.0), 1), 0.0) AS total_flight_hours, CASE WHEN DATEDIFF('2013-12-31', a.last_maintenance_date) > 180 THEN 'Overdue' WHEN DATEDIFF('2013-12-31', a.last_maintenance_date) > 120 THEN 'Upcoming' ELSE 'Airworthy' END AS maintenance_status FROM aircraft a LEFT JOIN flights f ON a.tail_number = f.assigned_aircraft_id GROUP BY a.tail_number, a.model, a.capacity, a.last_maintenance_date ORDER BY total_flight_hours DESC LIMIT 100;`,
      },
      {
        key: 'window_monthly',
        title: 'Monthly Cumulative Delay Trend',
        concept: 'Window Function: SUM() OVER (ORDER BY Month) Running Total',
        description: 'Calculates monthly total delay minutes and continuous year-to-date cumulative delay progression.',
        sql: `WITH MonthlyDelays AS (SELECT MONTH(f.scheduled_departure) AS month_num, DATE_FORMAT(f.scheduled_departure, '%M') AS month_name, COUNT(dl.log_id) AS incident_count, COALESCE(SUM(dl.delay_duration_minutes), 0) AS monthly_delay_mins FROM flights f JOIN delay_ledger dl ON f.flight_id = dl.flight_id GROUP BY MONTH(f.scheduled_departure), DATE_FORMAT(f.scheduled_departure, '%M')) SELECT month_num, month_name, incident_count, monthly_delay_mins, SUM(monthly_delay_mins) OVER (ORDER BY month_num) AS cumulative_delay_mins, ROUND(AVG(monthly_delay_mins) OVER (ORDER BY month_num ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS moving_avg_3m FROM MonthlyDelays ORDER BY month_num ASC;`,
      },
      {
        key: 'window_daily',
        title: 'Daily Flight Frequency & 7-Day Centered Moving Average',
        concept: 'Window Function: AVG() OVER (ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING)',
        description: 'Smooths seasonal daily flight fluctuations using a centered 7-day moving average frame.',
        sql: `WITH DailyCounts AS (SELECT DATE(scheduled_departure) AS flight_date, COUNT(flight_id) AS daily_flights FROM flights WHERE scheduled_departure >= '2013-01-01' AND scheduled_departure <= '2013-01-31' GROUP BY DATE(scheduled_departure)) SELECT flight_date, daily_flights, ROUND(AVG(daily_flights) OVER (ORDER BY flight_date ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING), 1) AS moving_avg_7day FROM DailyCounts ORDER BY flight_date ASC;`,
      },
      {
        key: 'window_airport',
        title: 'NYC Hub Running Total Departures',
        concept: 'Window Function: SUM() OVER (PARTITION BY Hub ORDER BY Month)',
        description: 'Tracks month-by-month departure volume and running totals partitioned separately by origin hub (JFK, LGA, EWR).',
        sql: `WITH HubMonthly AS (SELECT origin_airport_id, MONTH(scheduled_departure) AS month_num, COUNT(flight_id) AS departures FROM flights GROUP BY origin_airport_id, MONTH(scheduled_departure)) SELECT origin_airport_id, month_num, departures, SUM(departures) OVER (PARTITION BY origin_airport_id ORDER BY month_num) AS hub_running_total FROM HubMonthly ORDER BY origin_airport_id, month_num ASC;`,
      },
      {
        key: 'window_crew',
        title: 'Crew Percentile Rank by Total Duty Hours',
        concept: 'Window Function: PERCENT_RANK() OVER (ORDER BY Duty Hours DESC)',
        description: 'Computes the relative percentile rank for each crew member based on accumulated duty hours.',
        sql: `WITH CrewHours AS (SELECT cm.crew_id, cm.full_name, cm.role, cm.base_airport_id, COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, ca.duty_start_time, ca.duty_end_time) / 60.0), 1), 0.0) AS total_duty_hours FROM crew_members cm LEFT JOIN crew_assignments ca ON cm.crew_id = ca.crew_id GROUP BY cm.crew_id, cm.full_name, cm.role, cm.base_airport_id) SELECT crew_id, full_name, role, base_airport_id, total_duty_hours, ROUND(PERCENT_RANK() OVER (ORDER BY total_duty_hours DESC) * 100, 1) AS duty_percentile_rank FROM CrewHours ORDER BY total_duty_hours DESC LIMIT 50;`,
      },
    ];
  },

  async runReport(reportKey: string): Promise<ReportMeta> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/reports.php?report_key=${reportKey}`);
        return await res.json();
      } catch {
        // Fallback
      }
    }

    const t0 = performance.now();
    const reportsList = await this.getReportsList();
    const meta = reportsList.find((r) => r.key === reportKey) || reportsList[0];

    let data: any[] = [];

    switch (reportKey) {
      case 'delay_bottlenecks': {
        const map = new Map<string, any>();
        mockDelays.forEach((dl) => {
          const f = mockFlights.find((fl) => fl.flight_id === dl.flight_id);
          if (!f) return;
          const k = `${f.origin_airport_id}_${dl.reason_code}`;
          if (!map.has(k)) {
            map.set(k, {
              origin_hub: f.origin_airport_id,
              reason_code: dl.reason_code,
              incident_count: 0,
              total_lost_mins: 0,
              max_delay_mins: 0,
            });
          }
          const item = map.get(k);
          item.incident_count += 1;
          item.total_lost_mins += dl.delay_duration_minutes;
          item.max_delay_mins = Math.max(item.max_delay_mins, dl.delay_duration_minutes);
        });
        data = Array.from(map.values()).map((v) => ({
          ...v,
          avg_delay_mins: Math.round((v.total_lost_mins / v.incident_count) * 10) / 10,
        }));
        data.sort((a, b) => b.total_lost_mins - a.total_lost_mins);
        break;
      }

      case 'unutilized_aircraft': {
        data = mockAircraft
          .filter((a) => !mockFlights.some((f) => f.assigned_aircraft_id === a.tail_number))
          .map((a) => ({
            tail_number: a.tail_number,
            model: a.model,
            capacity: a.capacity,
            last_maintenance_date: a.last_maintenance_date,
            flight_count: 0,
          }));
        break;
      }

      case 'busiest_crew_window': {
        const crewStats = mockCrew.map((c) => {
          const assignments = mockAssignments.filter((a) => a.crew_id === c.crew_id);
          const totalDutyMinutes = assignments.reduce((acc, a) => {
            const diff = (new Date(a.duty_end_time).getTime() - new Date(a.duty_start_time).getTime()) / 60000;
            return acc + Math.max(diff, 0);
          }, 0);
          return {
            full_name: c.full_name,
            role: c.role,
            base_airport_id: c.base_airport_id || 'UNASSIGNED',
            duty_shifts: assignments.length,
            total_duty_hours: Math.round((totalDutyMinutes / 60) * 10) / 10,
            raw_minutes: totalDutyMinutes,
          };
        });

        // Compute DENSE_RANK() per role
        const roles = ['Captain', 'First Officer', 'Cabin Crew'];
        data = [];
        roles.forEach((r) => {
          const inRole = crewStats.filter((c) => c.role === r).sort((a, b) => b.raw_minutes - a.raw_minutes);
          let currentRank = 1;
          inRole.forEach((item, idx) => {
            if (idx > 0 && item.raw_minutes < inRole[idx - 1].raw_minutes) {
              currentRank++;
            }
            data.push({
              full_name: item.full_name,
              role: item.role,
              base_airport_id: item.base_airport_id,
              duty_shifts: item.duty_shifts,
              total_duty_hours: item.total_duty_hours,
              role_rank: currentRank,
            });
          });
        });
        break;
      }

      case 'route_performance': {
        const routeMap = new Map<string, any>();
        mockFlights.forEach((f) => {
          const k = `${f.origin_airport_id}->${f.destination_airport_id}`;
          if (!routeMap.has(k)) {
            routeMap.set(k, {
              origin_airport_id: f.origin_airport_id,
              destination_airport_id: f.destination_airport_id,
              destination_city: getAirport(f.destination_airport_id).city,
              total_scheduled: 0,
              on_time_count: 0,
              delayed_count: 0,
              cancelled_count: 0,
            });
          }
          const item = routeMap.get(k);
          item.total_scheduled += 1;
          if (f.status === 'On-Time') item.on_time_count += 1;
          if (f.status === 'Delayed') item.delayed_count += 1;
          if (f.status === 'Cancelled') item.cancelled_count += 1;
        });

        data = Array.from(routeMap.values()).map((v) => ({
          ...v,
          on_time_percentage: Math.round((v.on_time_count / v.total_scheduled) * 1000) / 10,
        }));
        data.sort((a, b) => b.total_scheduled - a.total_scheduled);
        break;
      }

      case 'peak_risk_hours': {
        const hourMap = new Map<number, any>();
        for (let h = 5; h <= 23; h++) {
          hourMap.set(h, {
            departure_hour: `${h.toString().padStart(2, '0')}:00`,
            scheduled_flights: 0,
            delayed_flights: 0,
            total_delay_mins: 0,
          });
        }

        mockFlights.forEach((f) => {
          const h = new Date(f.scheduled_departure).getHours();
          const item = hourMap.get(h) || {
            departure_hour: `${h.toString().padStart(2, '0')}:00`,
            scheduled_flights: 0,
            delayed_flights: 0,
            total_delay_mins: 0,
          };
          item.scheduled_flights += 1;
          if (f.status === 'Delayed') {
            item.delayed_flights += 1;
            const delay = mockDelays.find((d) => d.flight_id === f.flight_id);
            if (delay) item.total_delay_mins += delay.delay_duration_minutes;
          }
          hourMap.set(h, item);
        });

        data = Array.from(hourMap.values())
          .filter((v) => v.scheduled_flights > 0)
          .map((v) => ({
            ...v,
            delay_risk_pct: Math.round((v.delayed_flights / v.scheduled_flights) * 100),
            avg_delay_mins: v.delayed_flights > 0 ? Math.round(v.total_delay_mins / v.delayed_flights) : 0,
          }));
        break;
      }

      case 'revenue_by_class': {
        const revMap = new Map<string, any>();
        mockBookings.forEach((b) => {
          if (b.booking_status !== 'Confirmed') return;
          const f = mockFlights.find((fl) => fl.flight_id === b.flight_id);
          const route = f ? `${f.origin_airport_id} -> ${f.destination_airport_id}` : 'General Route';
          const k = `${b.travel_class}_${route}`;
          if (!revMap.has(k)) {
            revMap.set(k, {
              travel_class: b.travel_class,
              route,
              total_bookings: 0,
              total_passengers: 0,
              gross_revenue: 0,
            });
          }
          const item = revMap.get(k);
          item.total_bookings += 1;
          item.total_passengers += b.passengers?.length || 1;
          item.gross_revenue += b.total_fare;
        });

        data = Array.from(revMap.values()).map((v) => ({
          ...v,
          gross_revenue: Math.round(v.gross_revenue * 100) / 100,
          avg_ticket_price: Math.round((v.gross_revenue / v.total_bookings) * 100) / 100,
        }));
        data.sort((a, b) => b.gross_revenue - a.gross_revenue);
        break;
      }

      case 'route_leaderboard': {
        const routeMap = new Map<string, any>();
        mockFlights.forEach((f) => {
          const k = `${f.origin_airport_id} -> ${f.destination_airport_id}`;
          if (!routeMap.has(k)) {
            routeMap.set(k, {
              route: k,
              origin_airport_id: f.origin_airport_id,
              destination_airport_id: f.destination_airport_id,
              destination_city: getAirport(f.destination_airport_id).city,
              total_flights: 0,
              delayed_flights: 0,
              total_delay_mins: 0,
            });
          }
          const item = routeMap.get(k);
          item.total_flights += 1;
          if (f.status === 'Delayed') {
            item.delayed_flights += 1;
            const delay = mockDelays.find((d) => d.flight_id === f.flight_id);
            if (delay) item.total_delay_mins += delay.delay_duration_minutes;
          }
        });

        const list = Array.from(routeMap.values()).map((v) => ({
          ...v,
          delay_percentage: v.total_flights > 0 ? Math.round((v.delayed_flights / v.total_flights) * 1000) / 10 : 0,
          avg_delay_minutes: v.delayed_flights > 0 ? Math.round((v.total_delay_mins / v.delayed_flights) * 10) / 10 : 0,
        }));

        list.sort((a, b) => b.avg_delay_minutes - a.avg_delay_minutes);
        let currRank = 1;
        data = list.map((item, idx) => {
          if (idx > 0 && item.avg_delay_minutes < list[idx - 1].avg_delay_minutes) {
            currRank++;
          }
          return { ...item, delay_rank: currRank };
        }).slice(0, 50);
        break;
      }

      case 'aircraft_utilization': {
        data = mockAircraft.map((a) => {
          const assignedFlights = mockFlights.filter((f) => f.assigned_aircraft_id === a.tail_number);
          let totalMinutes = 0;
          assignedFlights.forEach((f) => {
            const dep = new Date(f.scheduled_departure).getTime();
            const arr = new Date(f.scheduled_arrival).getTime();
            if (!isNaN(dep) && !isNaN(arr) && arr > dep) {
              totalMinutes += (arr - dep) / 60000;
            }
          });

          const daysSince = a.last_maintenance_date
            ? Math.floor((new Date('2013-12-31').getTime() - new Date(a.last_maintenance_date).getTime()) / 86400000)
            : 200;

          const maintStatus: 'Airworthy' | 'Upcoming' | 'Overdue' =
            daysSince > 180 ? 'Overdue' : daysSince > 120 ? 'Upcoming' : 'Airworthy';

          return {
            tail_number: a.tail_number,
            model: a.model,
            capacity: a.capacity,
            last_maintenance_date: a.last_maintenance_date,
            days_since_maintenance: daysSince,
            total_flights: assignedFlights.length,
            total_flight_hours: Math.round((totalMinutes / 60) * 10) / 10,
            maintenance_status: maintStatus,
          };
        });
        data.sort((a, b) => b.total_flight_hours - a.total_flight_hours);
        data = data.slice(0, 100);
        break;
      }

      case 'window_monthly': {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December',
        ];
        const monthlyStats = monthNames.map((name, i) => {
          const monthNum = i + 1;
          const monthDelays = mockDelays.filter((d) => {
            const f = mockFlights.find((fl) => fl.flight_id === d.flight_id);
            if (!f) return false;
            return new Date(f.scheduled_departure).getMonth() + 1 === monthNum;
          });
          const totalMins = monthDelays.reduce((sum, d) => sum + d.delay_duration_minutes, 0);
          return {
            month_num: monthNum,
            month_name: name,
            incident_count: monthDelays.length,
            monthly_delay_mins: totalMins,
          };
        });

        let cumulative = 0;
        data = monthlyStats.map((item, idx) => {
          cumulative += item.monthly_delay_mins;
          // 3-month moving average (current and up to 2 preceding)
          const start = Math.max(0, idx - 2);
          const slice = monthlyStats.slice(start, idx + 1);
          const avg3m = Math.round(slice.reduce((s, x) => s + x.monthly_delay_mins, 0) / slice.length);
          return {
            ...item,
            cumulative_delay_mins: cumulative,
            moving_avg_3m: avg3m,
          };
        });
        break;
      }

      case 'window_daily': {
        const daysMap = new Map<string, number>();
        for (let d = 1; d <= 31; d++) {
          const dayStr = `2013-01-${d.toString().padStart(2, '0')}`;
          daysMap.set(dayStr, 0);
        }
        mockFlights.forEach((f) => {
          const day = f.scheduled_departure.slice(0, 10);
          if (daysMap.has(day)) {
            daysMap.set(day, (daysMap.get(day) || 0) + 1);
          }
        });

        const dailyList = Array.from(daysMap.entries()).map(([date, count]) => ({
          flight_date: date,
          daily_flights: count,
        }));

        data = dailyList.map((item, idx) => {
          const start = Math.max(0, idx - 3);
          const end = Math.min(dailyList.length, idx + 4);
          const window = dailyList.slice(start, end);
          const avg = Math.round((window.reduce((sum, w) => sum + w.daily_flights, 0) / window.length) * 10) / 10;
          return {
            ...item,
            moving_avg_7day: avg,
          };
        });
        break;
      }

      case 'window_airport': {
        const hubs = ['JFK', 'LGA', 'EWR'];
        const rows: any[] = [];
        hubs.forEach((hub) => {
          let running = 0;
          for (let m = 1; m <= 12; m++) {
            const deps = mockFlights.filter((f) => {
              if (f.origin_airport_id !== hub) return false;
              return new Date(f.scheduled_departure).getMonth() + 1 === m;
            }).length;
            running += deps;
            rows.push({
              origin_airport_id: hub,
              month_num: m,
              departures: deps,
              hub_running_total: running,
            });
          }
        });
        data = rows;
        break;
      }

      case 'window_crew': {
        const crewHours = mockCrew.map((c) => {
          const assigns = mockAssignments.filter((ca) => ca.crew_id === c.crew_id);
          let totalMinutes = 0;
          assigns.forEach((ca) => {
            const start = new Date(ca.duty_start_time).getTime();
            const end = new Date(ca.duty_end_time).getTime();
            if (!isNaN(start) && !isNaN(end) && end > start) {
              totalMinutes += (end - start) / 60000;
            }
          });
          return {
            crew_id: c.crew_id,
            full_name: c.full_name,
            role: c.role,
            base_airport_id: c.base_airport_id,
            total_duty_hours: Math.round((totalMinutes / 60) * 10) / 10,
          };
        });

        crewHours.sort((a, b) => b.total_duty_hours - a.total_duty_hours);
        const N = crewHours.length;
        data = crewHours.slice(0, 50).map((c, idx) => ({
          ...c,
          duty_percentile_rank: N > 1 ? Math.round(((N - 1 - idx) / (N - 1)) * 1000) / 10 : 100,
        }));
        break;
      }

      default:
        data = [];
    }

    const t1 = performance.now();

    return {
      ...meta,
      execution_ms: Math.round((t1 - t0) * 100) / 100,
      row_count: data.length,
      data,
    };
  },

  // -----------------------------------------------------------------
  // AUDIT ACTIVITY LOG
  // -----------------------------------------------------------------
  async getActivityLogs(): Promise<{ success: boolean; data: ActivityLog[] }> {
    return { success: true, data: mockActivity };
  },

  // =================================================================
  // FEATURE 1: FLIGHT OPERATIONS & ADVANCED SEARCH
  // =================================================================
  async searchOperationsFlights(params: FlightOperationsSearchParams): Promise<FlightOperationsResponse> {
    if (getApiMode() === 'LIVE') {
      try {
        const qParams = new URLSearchParams();
        if (params.q) qParams.set('q', params.q);
        if (params.origin) qParams.set('origin', params.origin);
        if (params.destination) qParams.set('destination', params.destination);
        if (params.date_from) qParams.set('date_from', params.date_from);
        if (params.date_to) qParams.set('date_to', params.date_to);
        if (params.status && params.status !== 'ALL') qParams.set('status', params.status);
        if (params.sort) qParams.set('sort', params.sort);
        if (params.dir) qParams.set('dir', params.dir);
        qParams.set('page', String(params.page || 1));
        qParams.set('page_size', String(params.page_size || 15));

        const res = await fetch(`${API_BASE}/flights.php?action=search&${qParams.toString()}`);
        return await res.json();
      } catch (err: any) {
        console.warn('LIVE flight search failed, falling back to mock:', err);
      }
    }

    // MOCK MODE
    const t0 = performance.now();
    let filtered = [...mockFlights];

    if (params.q) {
      const qLower = params.q.trim().toLowerCase();
      filtered = filtered.filter((f) => f.flight_number.toLowerCase().includes(qLower));
    }
    if (params.origin) {
      filtered = filtered.filter((f) => f.origin_airport_id === params.origin);
    }
    if (params.destination) {
      filtered = filtered.filter((f) => f.destination_airport_id === params.destination);
    }
    if (params.date_from) {
      filtered = filtered.filter((f) => f.scheduled_departure.slice(0, 10) >= params.date_from!);
    }
    if (params.date_to) {
      filtered = filtered.filter((f) => f.scheduled_departure.slice(0, 10) <= params.date_to!);
    }

    // Calculate status counts on the filtered set (pre-status filter)
    const status_counts: StatusMatrixCounts = {
      all: filtered.length,
      onTime: filtered.filter((f) => f.status === 'On-Time').length,
      delayed: filtered.filter((f) => f.status === 'Delayed').length,
      cancelled: filtered.filter((f) => f.status === 'Cancelled').length,
    };

    // Apply status filter if active
    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter((f) => f.status === params.status);
    }

    // Sort
    const sortField = params.sort || 'scheduled_departure';
    const sortDir = params.dir === 'DESC' ? -1 : 1;
    filtered.sort((a: any, b: any) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (valA < valB) return -1 * sortDir;
      if (valA > valB) return 1 * sortDir;
      return 0;
    });

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.page_size || 15);
    const total = filtered.length;
    const total_pages = Math.ceil(total / pageSize) || 1;
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize).map((f) => enrichFlight(f));

    const t1 = performance.now();

    const sqlUsed = `SELECT f.*, orig.city AS origin_city, dest.city AS destination_city, ac.model AS aircraft_model, dl.delay_duration_minutes, dl.reason_code FROM flights f JOIN airports orig ON f.origin_airport_id = orig.airport_id JOIN airports dest ON f.destination_airport_id = dest.airport_id LEFT JOIN aircraft ac ON f.assigned_aircraft_id = ac.tail_number LEFT JOIN delay_ledger dl ON f.flight_id = dl.flight_id WHERE 1=1 ${params.q ? `AND f.flight_number LIKE '%${params.q}%'` : ''} ${params.origin ? `AND f.origin_airport_id = '${params.origin}'` : ''} ${params.destination ? `AND f.destination_airport_id = '${params.destination}'` : ''} ${params.status && params.status !== 'ALL' ? `AND f.status = '${params.status}'` : ''} ORDER BY ${sortField} ${params.dir || 'ASC'} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize};`;

    return {
      flights: paged,
      total,
      page,
      page_size: pageSize,
      total_pages,
      status_counts,
      sql_used: sqlUsed,
      execution_ms: Math.round((t1 - t0) * 100) / 100,
    };
  },

  async getFlightDetail(flightId: number): Promise<FlightDetailEnriched> {
    if (getApiMode() === 'LIVE') {
      try {
        const res = await fetch(`${API_BASE}/flights.php?action=detail&id=${flightId}`);
        const json = await res.json();
        if (json.success && json.data) return json.data;
      } catch (err: any) {
        console.warn('LIVE flight detail failed:', err);
      }
    }

    // MOCK MODE
    const t0 = performance.now();
    const flight = mockFlights.find((f) => f.flight_id === flightId);
    if (!flight) throw new Error(`Flight ${flightId} not found`);

    const enriched = enrichFlight(flight);

    // Aircraft details & airworthiness check (>180 days warning)
    let acDetails: Aircraft | null = null;
    let airworthiness: 'Airworthy' | 'Upcoming' | 'Overdue' = 'Airworthy';
    let daysSinceMaint: number | null = null;

    if (flight.assigned_aircraft_id) {
      const ac = mockAircraft.find((a) => a.tail_number === flight.assigned_aircraft_id);
      if (ac) {
        acDetails = ac;
        if (ac.last_maintenance_date) {
          daysSinceMaint = Math.floor(
            (new Date('2013-12-31').getTime() - new Date(ac.last_maintenance_date).getTime()) / 86400000
          );
          airworthiness = daysSinceMaint > 180 ? 'Overdue' : daysSinceMaint > 120 ? 'Upcoming' : 'Airworthy';
        }
      }
    }

    // Delay records
    const delays = mockDelays.filter((d) => d.flight_id === flightId);
    const totalDelayMins = delays.reduce((sum, d) => sum + d.delay_duration_minutes, 0);

    // Assigned crew
    const assignedCrew: CrewAssignmentEnriched[] = mockAssignments
      .filter((ca) => ca.flight_id === flightId)
      .map((ca) => {
        const cm = mockCrew.find((c) => c.crew_id === ca.crew_id);
        return {
          ...ca,
          full_name: cm?.full_name,
          role: cm?.role,
          base_airport_id: cm?.base_airport_id,
        };
      });

    const t1 = performance.now();
    const sqlUsed = `SELECT f.*, ac.*, DATEDIFF('2013-12-31', ac.last_maintenance_date) AS days_since_maintenance FROM flights f LEFT JOIN aircraft ac ON f.assigned_aircraft_id = ac.tail_number WHERE f.flight_id = ${flightId};\nSELECT * FROM delay_ledger WHERE flight_id = ${flightId};\nSELECT ca.*, cm.full_name, cm.role FROM crew_assignments ca JOIN crew_members cm ON ca.crew_id = cm.crew_id WHERE ca.flight_id = ${flightId};`;

    return {
      ...enriched,
      aircraft_details: acDetails,
      airworthiness_status: airworthiness,
      days_since_maintenance: daysSinceMaint,
      delay_history: delays,
      assigned_crew: assignedCrew,
      total_delay_minutes: totalDelayMins,
      sql_used: sqlUsed,
      execution_ms: Math.round((t1 - t0) * 100) / 100,
    };
  },

  // =================================================================
  // FEATURE 2: LIVE DELAY LEDGER & INCIDENT TRACKING
  // =================================================================
  async changeFlightStatus(
    flightId: number,
    newStatus: FlightStatus,
    reasonCode?: DelayReasonCode,
    delayMinutes?: number
  ): Promise<{ success: boolean; message: string; sql_used?: string; execution_ms?: number }> {
    if (getApiMode() === 'LIVE') {
      try {
        const user = JSON.parse(localStorage.getItem(KEYS.CURRENT_USER) || '{}');
        const res = await fetch(`${API_BASE}/flights.php?action=change_status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': user.email || 'admin@skyledger.aero',
            'X-User-Role': 'admin',
          },
          body: JSON.stringify({
            flight_id: flightId,
            new_status: newStatus,
            reason_code: reasonCode,
            delay_minutes: delayMinutes,
          }),
        });
        return await res.json();
      } catch (err: any) {
        return { success: false, message: err.message || 'LIVE status change failed' };
      }
    }

    // MOCK MODE
    const t0 = performance.now();
    const flight = mockFlights.find((f) => f.flight_id === flightId);
    if (!flight) return { success: false, message: 'Flight not found' };

    flight.status = newStatus;
    setStored(KEYS.FLIGHTS, mockFlights);

    if (newStatus === 'Delayed') {
      // Validate reason code: strictly one of the 4 enum values
      const validReasons: DelayReasonCode[] = ['Weather', 'Mechanical', 'Air Traffic', 'Crew Shortage'];
      const chosenReason = validReasons.includes(reasonCode as any) ? (reasonCode as DelayReasonCode) : 'Weather';
      const duration = Math.max(1, delayMinutes || 30);

      const existingDelay = mockDelays.find((d) => d.flight_id === flightId);
      if (existingDelay) {
        existingDelay.delay_duration_minutes = duration;
        existingDelay.reason_code = chosenReason;
        existingDelay.logged_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
      } else {
        const newDelay: DelayRecord = {
          log_id: mockDelays.length + 1,
          flight_id: flightId,
          delay_duration_minutes: duration,
          reason_code: chosenReason,
          logged_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
          flight_number: flight.flight_number,
          origin_airport_id: flight.origin_airport_id,
          destination_airport_id: flight.destination_airport_id,
          scheduled_departure: flight.scheduled_departure,
        };
        mockDelays.unshift(newDelay);
      }
      setStored(KEYS.DELAYS, mockDelays);
    }

    recordActivity(
      'FLIGHT_STATUS_UPDATE',
      'admin@skyledger.aero',
      `Updated flight #${flight.flight_number} to ${newStatus}${newStatus === 'Delayed' ? ` (${reasonCode}, ${delayMinutes}m)` : ''}`
    );

    const t1 = performance.now();
    const sqlUsed = `START TRANSACTION;\nUPDATE flights SET status = '${newStatus}' WHERE flight_id = ${flightId};\n${newStatus === 'Delayed' ? `INSERT INTO delay_ledger (flight_id, delay_duration_minutes, reason_code, logged_at) VALUES (${flightId}, ${delayMinutes || 30}, '${reasonCode || 'Weather'}', NOW());\n` : ''}INSERT INTO activity_log (action_type, performed_by, details) VALUES ('FLIGHT_STATUS_UPDATE', 'admin@skyledger.aero', 'Flight #${flight.flight_number} -> ${newStatus}');\nCOMMIT;`;

    return {
      success: true,
      message: `Flight #${flight.flight_number} status updated to ${newStatus}`,
      sql_used: sqlUsed,
      execution_ms: Math.round((t1 - t0) * 100) / 100,
    };
  },

  async searchDelayRecords(params: {
    reason?: DelayReasonCode | 'ALL';
    airport?: string;
    date_from?: string;
    date_to?: string;
    min_minutes?: number;
  }): Promise<{ delays: DelayRecord[]; sql_used?: string; execution_ms?: number }> {
    if (getApiMode() === 'LIVE') {
      try {
        const qParams = new URLSearchParams();
        if (params.reason && params.reason !== 'ALL') qParams.set('reason', params.reason);
        if (params.airport) qParams.set('airport', params.airport);
        if (params.date_from) qParams.set('date_from', params.date_from);
        if (params.date_to) qParams.set('date_to', params.date_to);
        if (params.min_minutes) qParams.set('min_minutes', String(params.min_minutes));

        const res = await fetch(`${API_BASE}/delays.php?action=search&${qParams.toString()}`);
        const json = await res.json();
        if (json.success) return { delays: json.data, sql_used: json.sql_used, execution_ms: json.execution_ms };
      } catch (err: any) {
        console.warn('LIVE delay search failed:', err);
      }
    }

    // MOCK MODE
    const t0 = performance.now();
    let records = mockDelays.map((d) => {
      const fl = mockFlights.find((f) => f.flight_id === d.flight_id);
      return {
        ...d,
        flight_number: fl?.flight_number || d.flight_number,
        origin_airport_id: fl?.origin_airport_id || d.origin_airport_id,
        destination_airport_id: fl?.destination_airport_id || d.destination_airport_id,
        scheduled_departure: fl?.scheduled_departure || d.scheduled_departure,
        origin_city: fl ? getAirport(fl.origin_airport_id).city : undefined,
        destination_city: fl ? getAirport(fl.destination_airport_id).city : undefined,
      };
    });

    if (params.reason && params.reason !== 'ALL') {
      records = records.filter((r) => r.reason_code === params.reason);
    }
    if (params.airport) {
      records = records.filter(
        (r) => r.origin_airport_id === params.airport || r.destination_airport_id === params.airport
      );
    }
    if (params.date_from) {
      records = records.filter((r) => (r.scheduled_departure || '').slice(0, 10) >= params.date_from!);
    }
    if (params.date_to) {
      records = records.filter((r) => (r.scheduled_departure || '').slice(0, 10) <= params.date_to!);
    }
    if (params.min_minutes && params.min_minutes > 0) {
      records = records.filter((r) => r.delay_duration_minutes >= params.min_minutes!);
    }

    records.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());

    const t1 = performance.now();
    const sqlUsed = `SELECT dl.*, f.flight_number, f.origin_airport_id, f.destination_airport_id, f.scheduled_departure FROM delay_ledger dl JOIN flights f ON dl.flight_id = f.flight_id WHERE 1=1 ${params.reason && params.reason !== 'ALL' ? `AND dl.reason_code = '${params.reason}'` : ''} ${params.airport ? `AND (f.origin_airport_id = '${params.airport}' OR f.destination_airport_id = '${params.airport}')` : ''} ${params.min_minutes ? `AND dl.delay_duration_minutes >= ${params.min_minutes}` : ''} ORDER BY dl.logged_at DESC LIMIT 100;`;

    return {
      delays: records,
      sql_used: sqlUsed,
      execution_ms: Math.round((t1 - t0) * 100) / 100,
    };
  },

  async getDelaySummary(params?: {
    airport?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<DelaySummaryStats> {
    if (getApiMode() === 'LIVE') {
      try {
        const qParams = new URLSearchParams();
        if (params?.airport) qParams.set('airport', params.airport);
        if (params?.date_from) qParams.set('date_from', params.date_from);
        if (params?.date_to) qParams.set('date_to', params.date_to);

        const res = await fetch(`${API_BASE}/delays.php?action=summary&${qParams.toString()}`);
        const json = await res.json();
        if (json.success && json.data) return json.data;
      } catch (err: any) {
        console.warn('LIVE delay summary failed:', err);
      }
    }

    // MOCK MODE
    const t0 = performance.now();
    let records = mockDelays.map((d) => {
      const fl = mockFlights.find((f) => f.flight_id === d.flight_id);
      return {
        ...d,
        origin_airport_id: fl?.origin_airport_id,
        scheduled_departure: fl?.scheduled_departure,
      };
    });

    if (params?.airport) {
      records = records.filter((r) => r.origin_airport_id === params.airport);
    }
    if (params?.date_from) {
      records = records.filter((r) => (r.scheduled_departure || '').slice(0, 10) >= params.date_from!);
    }
    if (params?.date_to) {
      records = records.filter((r) => (r.scheduled_departure || '').slice(0, 10) <= params.date_to!);
    }

    const totalIncidents = records.length;
    const totalMinutes = records.reduce((sum, r) => sum + r.delay_duration_minutes, 0);
    const avgMinutes = totalIncidents > 0 ? Math.round((totalMinutes / totalIncidents) * 10) / 10 : 0;

    // Hub impact
    const hubMap = new Map<string, number>();
    records.forEach((r) => {
      if (r.origin_airport_id) {
        hubMap.set(r.origin_airport_id, (hubMap.get(r.origin_airport_id) || 0) + r.delay_duration_minutes);
      }
    });
    let mostImpactedHub = 'JFK';
    let maxHubMins = -1;
    hubMap.forEach((mins, hub) => {
      if (mins > maxHubMins) {
        maxHubMins = mins;
        mostImpactedHub = hub;
      }
    });

    // Breakdown strictly for the 4 enum reasons
    const reasons: DelayReasonCode[] = ['Weather', 'Mechanical', 'Air Traffic', 'Crew Shortage'];
    const reasonBreakdown = reasons.map((rc) => {
      const matches = records.filter((r) => r.reason_code === rc);
      const incCount = matches.length;
      const mins = matches.reduce((sum, r) => sum + r.delay_duration_minutes, 0);
      return {
        reason_code: rc,
        incident_count: incCount,
        total_minutes: mins,
        avg_minutes: incCount > 0 ? Math.round((mins / incCount) * 10) / 10 : 0,
      };
    });

    const t1 = performance.now();
    const sqlUsed = `SELECT COUNT(dl.log_id) AS total_incidents, SUM(dl.delay_duration_minutes) AS total_delay_minutes, ROUND(AVG(dl.delay_duration_minutes), 1) AS avg_delay_minutes FROM delay_ledger dl JOIN flights f ON dl.flight_id = f.flight_id WHERE 1=1;\nSELECT dl.reason_code, COUNT(dl.log_id) AS incident_count, SUM(dl.delay_duration_minutes) AS total_minutes FROM delay_ledger dl GROUP BY dl.reason_code ORDER BY total_minutes DESC;`;

    return {
      total_incidents: totalIncidents,
      total_delay_minutes: totalMinutes,
      avg_delay_minutes: avgMinutes,
      most_impacted_hub: mostImpactedHub,
      reason_breakdown: reasonBreakdown,
      sql_used: sqlUsed,
      execution_ms: Math.round((t1 - t0) * 100) / 100,
    };
  },

  // =================================================================
  // FEATURE 3: CREW ROSTER & AVAILABILITY LOOKUP
  // =================================================================
  async lookupCrewAvailability(params: {
    q?: string;
    role?: string;
    base?: string;
    check_start?: string;
    check_end?: string;
    flight_id?: number;
  }): Promise<{ crew: CrewAvailabilityItem[]; sql_used?: string; execution_ms?: number }> {
    if (getApiMode() === 'LIVE') {
      try {
        const qParams = new URLSearchParams();
        if (params.q) qParams.set('q', params.q);
        if (params.role) qParams.set('role', params.role);
        if (params.base) qParams.set('base', params.base);
        if (params.check_start) qParams.set('check_start', params.check_start);
        if (params.check_end) qParams.set('check_end', params.check_end);
        if (params.flight_id) qParams.set('flight_id', String(params.flight_id));

        const res = await fetch(`${API_BASE}/crew.php?action=lookup&${qParams.toString()}`);
        const json = await res.json();
        if (json.success && json.data) return { crew: json.data, sql_used: json.sql_used, execution_ms: json.execution_ms };
      } catch (err: any) {
        console.warn('LIVE crew lookup failed:', err);
      }
    }

    // MOCK MODE
    const t0 = performance.now();
    let windowStart = params.check_start;
    let windowEnd = params.check_end;

    if (params.flight_id && (!windowStart || !windowEnd)) {
      const fl = mockFlights.find((f) => f.flight_id === params.flight_id);
      if (fl) {
        const depMs = new Date(fl.scheduled_departure).getTime();
        const arrMs = new Date(fl.scheduled_arrival).getTime();
        windowStart = new Date(depMs - 3600000).toISOString().replace('T', ' ').slice(0, 19);
        windowEnd = new Date(arrMs + 1800000).toISOString().replace('T', ' ').slice(0, 19);
      }
    }

    let list = [...mockCrew];
    if (params.q) {
      const qLower = params.q.trim().toLowerCase();
      list = list.filter(
        (c) => c.full_name.toLowerCase().includes(qLower) || String(c.crew_id) === params.q?.trim()
      );
    }
    if (params.role) {
      list = list.filter((c) => c.role === params.role);
    }
    if (params.base) {
      list = list.filter((c) => c.base_airport_id === params.base);
    }

    const results: CrewAvailabilityItem[] = list.map((c) => {
      const assignments = mockAssignments.filter((ca) => ca.crew_id === c.crew_id);
      let totalMinutes = 0;
      assignments.forEach((ca) => {
        const s = new Date(ca.duty_start_time).getTime();
        const e = new Date(ca.duty_end_time).getTime();
        if (!isNaN(s) && !isNaN(e) && e > s) totalMinutes += (e - s) / 60000;
      });

      let isAvail = true;
      let status: 'Available' | 'Busy' | 'Rest Violation' = 'Available';
      let conflictDetails = 'Available for duty';

      if (windowStart && windowEnd) {
        const wStartMs = new Date(windowStart).getTime();
        const wEndMs = new Date(windowEnd).getTime();

        // 1. Direct overlap
        for (const ca of assignments) {
          const s = new Date(ca.duty_start_time).getTime();
          const e = new Date(ca.duty_end_time).getTime();
          if ((s <= wStartMs && e >= wStartMs) || (s <= wEndMs && e >= wEndMs) || (s >= wStartMs && e <= wEndMs)) {
            const fl = mockFlights.find((f) => f.flight_id === ca.flight_id);
            isAvail = false;
            status = 'Busy';
            conflictDetails = `Busy: flight ${fl?.flight_number || ca.flight_id} ${ca.duty_start_time.slice(11, 16)}-${ca.duty_end_time.slice(11, 16)}`;
            break;
          }
        }

        // 2. Rest rule (< 2 hours before or after)
        if (isAvail) {
          const twoHoursMs = 2 * 3600000;
          for (const ca of assignments) {
            const s = new Date(ca.duty_start_time).getTime();
            const e = new Date(ca.duty_end_time).getTime();
            if ((e > wStartMs - twoHoursMs && e <= wStartMs) || (s < wEndMs + twoHoursMs && s >= wEndMs)) {
              const fl = mockFlights.find((f) => f.flight_id === ca.flight_id);
              isAvail = false;
              status = 'Rest Violation';
              conflictDetails = `Rest Violation: <2h rest near flight ${fl?.flight_number || ca.flight_id}`;
              break;
            }
          }
        }
      }

      return {
        ...c,
        base_city: c.base_airport_id ? getAirport(c.base_airport_id).city : undefined,
        total_assignments: assignments.length,
        total_duty_hours: Math.round((totalMinutes / 60) * 10) / 10,
        is_available: isAvail,
        availability_status: status,
        conflict_details: conflictDetails,
      };
    });

    const t1 = performance.now();
    const sqlUsed = `SELECT cm.crew_id, cm.full_name, cm.role, cm.base_airport_id, COUNT(ca.assignment_id) AS total_assignments FROM crew_members cm LEFT JOIN crew_assignments ca ON cm.crew_id = ca.crew_id WHERE 1=1 ${params.q ? `AND cm.full_name LIKE '%${params.q}%'` : ''} ${params.role ? `AND cm.role = '${params.role}'` : ''} GROUP BY cm.crew_id;\n-- Evaluated conflict window against crew_assignments [${windowStart || 'N/A'} to ${windowEnd || 'N/A'}] with 2h rest rule.`;

    return {
      crew: results,
      sql_used: sqlUsed,
      execution_ms: Math.round((t1 - t0) * 100) / 100,
    };
  },

  async getCrewWorkload(role?: string): Promise<{ max_hours: number; data: CrewWorkloadItem[]; sql_used?: string; execution_ms?: number }> {
    if (getApiMode() === 'LIVE') {
      try {
        const qParams = new URLSearchParams();
        if (role) qParams.set('role', role);
        const res = await fetch(`${API_BASE}/crew.php?action=workload&${qParams.toString()}`);
        const json = await res.json();
        if (json.success && json.data) return { max_hours: json.max_hours, data: json.data, sql_used: json.sql_used, execution_ms: json.execution_ms };
      } catch (err: any) {
        console.warn('LIVE crew workload failed:', err);
      }
    }

    // MOCK MODE
    const t0 = performance.now();
    let list = [...mockCrew];
    if (role) {
      list = list.filter((c) => c.role === role);
    }

    const items: CrewWorkloadItem[] = list.map((c) => {
      const assigns = mockAssignments.filter((ca) => ca.crew_id === c.crew_id);
      let totalMinutes = 0;
      let lastEnd = '';
      assigns.forEach((ca) => {
        const s = new Date(ca.duty_start_time).getTime();
        const e = new Date(ca.duty_end_time).getTime();
        if (!isNaN(s) && !isNaN(e) && e > s) {
          totalMinutes += (e - s) / 60000;
        }
        if (!lastEnd || ca.duty_end_time > lastEnd) {
          lastEnd = ca.duty_end_time;
        }
      });
      return {
        crew_id: c.crew_id,
        full_name: c.full_name,
        role: c.role,
        base_airport_id: c.base_airport_id,
        base_city: c.base_airport_id ? getAirport(c.base_airport_id).city : undefined,
        total_flights: assigns.length,
        total_duty_hours: Math.round((totalMinutes / 60) * 10) / 10,
        last_duty_time: lastEnd || undefined,
        relative_utilization_pct: 0,
      };
    });

    let maxHours = 1.0;
    items.forEach((item) => {
      if (item.total_duty_hours > maxHours) maxHours = item.total_duty_hours;
    });

    items.forEach((item) => {
      item.relative_utilization_pct = Math.round((item.total_duty_hours / maxHours) * 1000) / 10;
    });

    items.sort((a, b) => b.total_duty_hours - a.total_duty_hours);

    const t1 = performance.now();
    const sqlUsed = `SELECT cm.crew_id, cm.full_name, cm.role, cm.base_airport_id, COUNT(ca.assignment_id) AS total_flights, COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, ca.duty_start_time, ca.duty_end_time) / 60.0), 1), 0.0) AS total_duty_hours FROM crew_members cm LEFT JOIN crew_assignments ca ON cm.crew_id = ca.crew_id WHERE 1=1 ${role ? `AND cm.role = '${role}'` : ''} GROUP BY cm.crew_id ORDER BY total_duty_hours DESC;`;

    return {
      max_hours: maxHours,
      data: items,
      sql_used: sqlUsed,
      execution_ms: Math.round((t1 - t0) * 100) / 100,
    };
  },

  // =================================================================
  // FEATURE 4: CONCURRENCY & TRANSACTION SAFETY LAB
  // =================================================================
  async assignCrewTransactional(
    flightId: number,
    crewId: number,
    coordinator = 'Coordinator',
    dutyStart?: string,
    dutyEnd?: string
  ): Promise<TransactionAssignResult> {
    if (getApiMode() === 'LIVE') {
      try {
        const user = JSON.parse(localStorage.getItem(KEYS.CURRENT_USER) || '{}');
        const res = await fetch(`${API_BASE}/crew.php?action=assign_tx`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': user.email || 'admin@skyledger.aero',
            'X-User-Role': 'admin',
          },
          body: JSON.stringify({
            flight_id: flightId,
            crew_id: crewId,
            duty_start_time: dutyStart,
            duty_end_time: dutyEnd,
            coordinator,
          }),
        });
        return await res.json();
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'LIVE transactional assign failed',
          logs: [],
        };
      }
    }

    // MOCK MODE: Emulate database isolation & SELECT ... FOR UPDATE
    const t0 = performance.now();
    const logs: TransactionStepLog[] = [];
    const logStep = (step: number, query: string, status: any, notes: string) => {
      logs.push({
        timestamp: Date.now(),
        step,
        query,
        status,
        notes,
      });
    };

    // Step 1: Isolation Level
    logStep(1, 'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;', 'OK', 'Enforced strict repeatable read isolation');

    // Step 2: Start Transaction
    logStep(2, 'START TRANSACTION;', 'OK', `Transaction initialized for ${coordinator}`);

    // Acquire simulated mutex with slight artificial processing jitter (50ms) to model real-world database concurrency
    await acquireCrewMutex();
    await new Promise((r) => setTimeout(r, 60));

    try {
      // Determine duty window
      let wStart = dutyStart;
      let wEnd = dutyEnd;
      const fl = mockFlights.find((f) => f.flight_id === flightId);
      if (!fl) {
        logStep(3, `SELECT * FROM flights WHERE flight_id = ${flightId};`, 'FAIL', 'Target flight not found');
        releaseCrewMutex();
        return { success: false, error: 'Flight not found', logs };
      }

      if (!wStart || !wEnd) {
        const depMs = new Date(fl.scheduled_departure).getTime();
        const arrMs = new Date(fl.scheduled_arrival).getTime();
        wStart = new Date(depMs - 3600000).toISOString().replace('T', ' ').slice(0, 19);
        wEnd = new Date(arrMs + 1800000).toISOString().replace('T', ' ').slice(0, 19);
      }

      // Step 3: Row Lock on Crew Member
      const crewMember = mockCrew.find((c) => c.crew_id === crewId);
      if (!crewMember) {
        logStep(3, `SELECT * FROM crew_members WHERE crew_id = ${crewId} FOR UPDATE;`, 'FAIL', 'Crew member does not exist');
        releaseCrewMutex();
        return { success: false, error: 'Crew member not found', logs };
      }
      logStep(3, `SELECT crew_id, full_name, role FROM crew_members WHERE crew_id = ${crewId} FOR UPDATE;`, 'LOCK_ACQUIRED', `Acquired exclusive row lock on ${crewMember.full_name} (${crewMember.role})`);

      // Step 4: Strict Overlap Validation
      const wStartMs = new Date(wStart).getTime();
      const wEndMs = new Date(wEnd).getTime();

      const overlap = mockAssignments.find((ca) => {
        if (ca.crew_id !== crewId) return false;
        const s = new Date(ca.duty_start_time).getTime();
        const e = new Date(ca.duty_end_time).getTime();
        return (s <= wStartMs && e >= wStartMs) || (s <= wEndMs && e >= wEndMs) || (s >= wStartMs && e <= wEndMs);
      });

      if (overlap) {
        const conflictFl = mockFlights.find((f) => f.flight_id === overlap.flight_id);
        logStep(4, `SELECT ca.assignment_id, f.flight_number FROM crew_assignments ca JOIN flights f ON ca.flight_id = f.flight_id WHERE ca.crew_id = ${crewId} AND overlap FOR UPDATE;`, 'CONFLICT', `Conflict detected: ${crewMember.full_name} is already assigned to Flight #${conflictFl?.flight_number || overlap.flight_id}`);
        logStep(5, 'ROLLBACK;', 'FAIL', `Transaction rolled back for ${coordinator} due to schedule collision`);
        releaseCrewMutex();
        return {
          success: false,
          error: `CONFLICT DETECTED: ${crewMember.full_name} is already on duty for Flight #${conflictFl?.flight_number || overlap.flight_id} during this window.`,
          logs,
        };
      }

      logStep(4, `SELECT ca.assignment_id FROM crew_assignments ca WHERE ca.crew_id = ${crewId} AND overlap FOR UPDATE;`, 'CHECKING', 'No direct window overlap found');

      // Step 5: Check 2-Hour Rest Rule
      const twoHoursMs = 2 * 3600000;
      const restConflict = mockAssignments.find((ca) => {
        if (ca.crew_id !== crewId) return false;
        const s = new Date(ca.duty_start_time).getTime();
        const e = new Date(ca.duty_end_time).getTime();
        return (e > wStartMs - twoHoursMs && e <= wStartMs) || (s < wEndMs + twoHoursMs && s >= wEndMs);
      });

      if (restConflict) {
        const restFl = mockFlights.find((f) => f.flight_id === restConflict.flight_id);
        logStep(5, `SELECT ca.assignment_id FROM crew_assignments ca ... rest window (<2h) FOR UPDATE;`, 'REST_VIOLATION', `Rest interval rule violated near Flight #${restFl?.flight_number || restConflict.flight_id}`);
        logStep(6, 'ROLLBACK;', 'FAIL', `Transaction rolled back for ${coordinator} (FAA mandatory 2-hour rest rule)`);
        releaseCrewMutex();
        return {
          success: false,
          error: `REST RULE VIOLATION: Minimum 2-hour rest interval required (Conflict with Flight #${restFl?.flight_number || restConflict.flight_id}).`,
          logs,
        };
      }

      logStep(5, `SELECT ca.assignment_id FROM crew_assignments ca ... rest window (<2h) FOR UPDATE;`, 'CHECKING', 'FAA 2-hour rest interval verified');

      // Step 6: Insert into crew_assignments
      const nextId = (mockAssignments.reduce((max, ca) => Math.max(max, ca.assignment_id), 0) || 0) + 1;
      const newAssignment: CrewAssignment = {
        assignment_id: nextId,
        flight_id: flightId,
        crew_id: crewId,
        duty_start_time: wStart,
        duty_end_time: wEnd,
      };
      mockAssignments.push(newAssignment);
      setStored(KEYS.ASSIGNMENTS, mockAssignments);

      logStep(6, `INSERT INTO crew_assignments (flight_id, crew_id, duty_start_time, duty_end_time) VALUES (${flightId}, ${crewId}, '${wStart}', '${wEnd}');`, 'INSERTED', `Created assignment #${nextId}`);

      // Step 7: Commit Transaction
      logStep(7, 'COMMIT;', 'COMMITTED', `Transaction committed successfully by ${coordinator}`);

      recordActivity(
        'ASSIGN_CREW_TX',
        'coordinator',
        `Coordinator ${coordinator} assigned ${crewMember.full_name} (${crewMember.role}) to Flight #${fl.flight_number} (Assignment #${nextId})`
      );

      releaseCrewMutex();
      const t1 = performance.now();

      return {
        success: true,
        message: `Crew assigned successfully under REPEATABLE READ isolation.`,
        assignment_id: nextId,
        logs,
        execution_ms: Math.round((t1 - t0) * 100) / 100,
      };
    } catch (err: any) {
      releaseCrewMutex();
      logStep(99, 'ROLLBACK;', 'ERROR', err.message || 'Unexpected transaction error');
      return { success: false, error: err.message, logs };
    }
  },

  async resetConcurrencyDemo(): Promise<void> {
    // Reset assignments to initial seed or remove assignments for demo test flights (flights 1 & 2)
    mockAssignments = mockAssignments.filter((ca) => ca.assignment_id <= 1000);
    setStored(KEYS.ASSIGNMENTS, mockAssignments);
    recordActivity('CONCURRENCY_DEMO_RESET', 'admin@skyledger.aero', 'Reset Concurrency Lab test assignments');
  },
};

