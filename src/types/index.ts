/**
 * SkyLedger – Core TypeScript Types & Entity Interfaces
 */

export type ApiMode = 'MOCK' | 'LIVE';

export interface Airport {
  airport_id: string; // e.g., 'JFK', 'ORD', 'LAX'
  airport_name: string;
  city: string;
  country: string;
  lat?: number;
  lon?: number;
  state?: string;
}

export interface Aircraft {
  tail_number: string;
  model: string;
  capacity: number;
  last_maintenance_date: string; // YYYY-MM-DD
  days_since_maintenance?: number;
  is_maintenance_due?: boolean;
  total_flights?: number;
  total_hours?: number;
}

export type CrewRole = 'Captain' | 'First Officer' | 'Cabin Crew';

export interface CrewMember {
  crew_id: number;
  full_name: string;
  role: CrewRole;
  base_airport_id: string | null;
  base_city?: string;
  total_assignments?: number;
  total_duty_hours?: number;
}

export type FlightStatus = 'On-Time' | 'Delayed' | 'Cancelled';

export interface Flight {
  flight_id: number;
  flight_number: string;
  origin_airport_id: string;
  destination_airport_id: string;
  scheduled_departure: string; // ISO / YYYY-MM-DD HH:MM:SS
  scheduled_arrival: string;
  status: FlightStatus;
  assigned_aircraft_id: string | null;
  
  // Enriched Join fields
  origin_name?: string;
  origin_city?: string;
  destination_name?: string;
  destination_city?: string;
  aircraft_model?: string;
  aircraft_capacity?: number;
  delay_duration_minutes?: number | null;
  delay_reason?: DelayReasonCode | null;
  on_time_percentage?: number;
  assigned_crew?: CrewAssignmentEnriched[];
  booked_seats_count?: number;
  fare?: FareBreakdown;
}

export interface CrewAssignment {
  assignment_id: number;
  flight_id: number;
  crew_id: number;
  duty_start_time: string;
  duty_end_time: string;
}

export interface CrewAssignmentEnriched extends CrewAssignment {
  full_name?: string;
  role?: CrewRole;
  base_airport_id?: string | null;
}

export type DelayReasonCode = 'Weather' | 'Mechanical' | 'Air Traffic' | 'Crew Shortage';

export interface DelayRecord {
  log_id: number;
  flight_id: number;
  delay_duration_minutes: number;
  reason_code: DelayReasonCode;
  logged_at: string;
  flight_number?: string;
  origin_airport_id?: string;
  destination_airport_id?: string;
  scheduled_departure?: string;
  origin_city?: string;
  destination_city?: string;
}

export type UserRole = 'passenger' | 'admin';

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  created_at?: string;
}

export type TravelClass = 'Economy' | 'Business';
export type BookingStatus = 'Confirmed' | 'Cancelled';

export interface Passenger {
  passenger_id?: number;
  booking_id?: number;
  full_name: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  seat_no: string;
}

export interface Booking {
  booking_id: number;
  pnr: string;
  user_id: number | null;
  flight_id: number;
  travel_class: TravelClass;
  total_fare: number;
  booking_status: BookingStatus;
  booked_at: string;
  passengers?: Passenger[];

  // Enriched flight details
  flight_number?: string;
  scheduled_departure?: string;
  scheduled_arrival?: string;
  flight_status?: FlightStatus;
  origin_airport_id?: string;
  origin_name?: string;
  origin_city?: string;
  destination_airport_id?: string;
  destination_name?: string;
  destination_city?: string;
  aircraft_model?: string;
  delay_duration_minutes?: number | null;
  delay_reason?: DelayReasonCode | null;
  passenger_count?: number;
}

export interface FareBreakdown {
  distanceMiles: number;
  baseRatePerMile: number;
  baseFare: number;
  classMultiplier: number;
  classFare: number;
  fuelAndAirportCharges: number;
  subtotal: number;
  gstAmount: number; // 5% GST
  totalFare: number;
}

export interface ActivityLog {
  log_id: number;
  action_type: string;
  performed_by: string;
  details: string;
  ip_address?: string;
  created_at: string;
}

export interface ReportMeta {
  key: string;
  title: string;
  concept: string;
  description: string;
  sql: string;
  execution_ms?: number;
  row_count?: number;
  data?: any[];
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  passengers: number;
  travelClass: TravelClass;
  isRoundTrip: boolean;
}

export interface StatusMatrixCounts {
  all: number;
  onTime: number;
  delayed: number;
  cancelled: number;
}

export interface FlightOperationsSearchParams {
  q?: string;
  origin?: string;
  destination?: string;
  date_from?: string;
  date_to?: string;
  status?: FlightStatus | 'ALL';
  sort?: string;
  dir?: 'ASC' | 'DESC';
  page?: number;
  page_size?: number;
}

export interface FlightOperationsResponse {
  flights: Flight[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  status_counts: StatusMatrixCounts;
  sql_used?: string;
  execution_ms?: number;
}

export interface FlightDetailEnriched extends Flight {
  aircraft_details?: Aircraft | null;
  airworthiness_status?: 'Airworthy' | 'Upcoming' | 'Overdue';
  days_since_maintenance?: number | null;
  delay_history?: DelayRecord[];
  assigned_crew?: CrewAssignmentEnriched[];
  total_delay_minutes?: number;
  sql_used?: string;
  execution_ms?: number;
}

export interface DelaySummaryStats {
  total_incidents: number;
  total_delay_minutes: number;
  avg_delay_minutes: number;
  most_impacted_hub: string;
  reason_breakdown: Array<{
    reason_code: DelayReasonCode;
    incident_count: number;
    total_minutes: number;
    avg_minutes: number;
  }>;
  sql_used?: string;
  execution_ms?: number;
}

export interface CrewAvailabilityItem extends CrewMember {
  is_available: boolean;
  availability_status: 'Available' | 'Busy' | 'Rest Violation';
  conflict_details?: string;
}

export interface CrewWorkloadItem {
  crew_id: number;
  full_name: string;
  role: CrewRole;
  base_airport_id: string | null;
  base_city?: string;
  total_flights: number;
  total_duty_hours: number;
  last_duty_time?: string;
  relative_utilization_pct: number;
}

export interface TransactionStepLog {
  timestamp: number;
  step: number;
  query: string;
  status: 'OK' | 'LOCK_ACQUIRED' | 'CHECKING' | 'INSERTED' | 'COMMITTED' | 'CONFLICT' | 'REST_VIOLATION' | 'FAIL' | 'ERROR';
  notes: string;
}

export interface TransactionAssignResult {
  success: boolean;
  message?: string;
  error?: string;
  assignment_id?: number;
  logs: TransactionStepLog[];
  execution_ms?: number;
}

export interface RouteLeaderboardItem {
  route: string;
  origin_airport_id: string;
  destination_airport_id: string;
  destination_city: string;
  total_flights: number;
  delayed_count: number;
  delayed_flights?: number;
  delay_rate: number;
  delay_percentage?: number;
  avg_delay_minutes: number;
  delay_rank: number;
}

export interface AircraftUtilizationItem {
  model: string;
  aircraft_count: number;
  total_flights: number;
  avg_flights_per_aircraft: number;
  avg_days_since_maintenance: number;
  count_overdue: number;
  tail_number?: string;
  capacity?: number;
  last_maintenance_date?: string;
  days_since_maintenance?: number;
  total_flight_hours?: number;
  maintenance_status?: 'Airworthy' | 'Upcoming' | 'Overdue';
}

export interface WindowMonthlyItem {
  month_num: number;
  month_name: string;
  incident_count: number;
  monthly_delay_mins: number;
  cumulative_delay_mins: number;
  moving_avg_3m: number;
}

export interface WindowDailyItem {
  flight_date: string;
  daily_flights: number;
  moving_avg_7day: number;
}

export interface WindowAirportItem {
  origin_airport_id: string;
  month_num: number;
  departures: number;
  hub_running_total: number;
}

export interface WindowAirportCumulativeDelayItem {
  origin_airport_id: string;
  month_num: number;
  month_name: string;
  monthly_delay_minutes: number;
  cumulative_delay_minutes: number;
}

export interface WindowTrailingDailyDelayItem {
  flight_date: string;
  daily_delay_minutes: number;
  trailing_7day_delay_minutes: number;
}

export interface WindowCrewItem {
  crew_id: number;
  full_name: string;
  role: CrewRole;
  base_airport_id: string | null;
  total_duty_hours: number;
  duty_percentile_rank: number;
}

