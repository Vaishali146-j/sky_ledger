# SkyLedger – Flight Booking & Operations Portal
**University DBMS Project: Production-Grade Airline Operations & Reservation System**

SkyLedger is a comprehensive, production-grade flight reservation, dispatch, and operations portal designed for academic DBMS evaluation. It features dual execution modes:
- **MOCK Mode (In-Memory Browser Engine)**: Instant offline demonstration with pre-seeded datasets, simulated ACID transaction isolation, and row-level mutex emulation.
- **LIVE Mode (PHP 8 + PDO MySQL / MariaDB 10.4+)**: Production backend using parameterised queries, transactions with `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;`, exclusive row locks (`SELECT ... FOR UPDATE`), and advanced window functions.

---

## 1. Relational Database Architecture

SkyLedger manages a 9-table schema comprising 6 foundational tables (~10,000 flights, 102 airports, 2,806 aircraft, 840 crew members, 48,385 assignments, and 2,366 delay entries) and 3 transactional tables:

1. **`airports`**: `(airport_id PK, airport_name, city, country)`
2. **`aircraft`**: `(tail_number PK, model, capacity, last_maintenance_date)`
3. **`crew_members`**: `(crew_id PK, full_name, role ENUM('Captain','First Officer','Cabin Crew'), base_airport_id FK NULL)`
4. **`flights`**: `(flight_id PK, flight_number, origin_airport_id FK, destination_airport_id FK, scheduled_departure, scheduled_arrival, status ENUM('On-Time','Delayed','Cancelled'), assigned_aircraft_id FK NULL)`
5. **`crew_assignments`**: `(assignment_id PK, flight_id FK CASCADE, crew_id FK CASCADE, duty_start_time, duty_end_time)`
6. **`delay_ledger`**: `(log_id PK, flight_id FK CASCADE, delay_duration_minutes, reason_code ENUM('Weather','Mechanical','Air Traffic','Crew Shortage'), logged_at)`
7. **`users`**: `(user_id PK, full_name, email UNIQUE, phone, password_hash, role ENUM('passenger','admin'), created_at)`
8. **`bookings`**: `(booking_id PK, pnr CHAR(6) UNIQUE, user_id FK, flight_id FK, travel_class ENUM('Economy','Business'), total_fare, booking_status ENUM('Confirmed','Cancelled'), booked_at)`
9. **`passengers`**: `(passenger_id PK, booking_id FK CASCADE, full_name, age, gender ENUM('M','F','O'), seat_no)`

*Integrity Constraint*: Unique seats per flight enforced inside serializable/repeatable read transactions: double-booking is impossible.

---

## 2. API Endpoints Reference

### Flight Operations & Tactical Dispatch:
- `GET /skyledger-api/flights.php?action=search` – Indexed multi-criteria search (`q`, `origin`, `destination`, `date_from`, `date_to`, `status`, `sort`, `dir`, `page`, `page_size`) and status badge matrix counts.
- `GET /skyledger-api/flights.php?action=detail&id={id}` – Relational flight profile, assigned aircraft airworthiness status (>180d check), delay ledger history, and assigned crew roster.
- `POST /skyledger-api/flights.php?action=change_status` – Transactional status update (`On-Time`, `Delayed`, `Cancelled`) with automatic `delay_ledger` entry insertion and activity logging.

### Delay Ledger & Civil Aviation Analytics:
- `GET /skyledger-api/delays.php?action=search` – Filter delays by the 4 strict ENUM reasons (`Weather`, `Mechanical`, `Air Traffic`, `Crew Shortage`), hub, date, and minimum duration.
- `GET /skyledger-api/delays.php?action=summary` – System-wide delay metrics (total minutes, average duration, most impacted origin hub, and reason breakdown series).

### Crew Scheduling & Roster Management:
- `GET /skyledger-api/crew.php?action=lookup` – Personnel search and availability evaluation (`Available`, `Busy`, `Rest Violation`) against flight duty windows.
- `GET /skyledger-api/crew.php?action=flight_roster` – Flight roster completeness audit (≥1 Captain, ≥1 First Officer, ≥3 Cabin Crew).
- `GET /skyledger-api/crew.php?action=suggest_standby` – Conflict-free standby suggestions respecting zero overlap and project rest-period constraint (minimum 2 hours).
- `GET /skyledger-api/crew.php?action=workload` – Aggregated duty flight hours, shift counts, and normalized relative fleet utilization.
- `POST /skyledger-api/crew.php?action=assign_tx` – Transactional crew assignment with `REPEATABLE READ` and `SELECT ... FOR UPDATE` row locking.

### Business Intelligence & Window Functions Hub:
- `GET /skyledger-api/reports.php?report_key=route_leaderboard` – `RANK() OVER (ORDER BY delayed_count DESC)` with `HAVING total_flights >= 20`, returning `delayed_count` and `delay_rate`.
- `GET /skyledger-api/reports.php?report_key=aircraft_utilization` – Grouped by `a.model`, with `aircraft_count`, `total_flights`, `avg_flights_per_aircraft`, `avg_days_since_maintenance`, and `count_overdue` (>180d).
- `GET /skyledger-api/reports.php?report_key=window_monthly` – `SUM(monthly_delay_mins) OVER (ORDER BY month_num)` running totals and 3-month moving averages.
- `GET /skyledger-api/reports.php?report_key=window_daily` – `AVG(daily_flights) OVER (ORDER BY flight_date ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING)` 7-day centered moving averages.
- `GET /skyledger-api/reports.php?report_key=window_airport` – `SUM(departures) OVER (PARTITION BY origin_airport_id ORDER BY month_num)` NYC Hub cumulative departures.
- `GET /skyledger-api/reports.php?report_key=window_airport_delay` – `SUM(delay_minutes) OVER (PARTITION BY origin_airport_id ORDER BY month)` Cumulative delay minutes per origin hub.
- `GET /skyledger-api/reports.php?report_key=window_trailing_daily_delay` – `SUM(delay_minutes) OVER (ORDER BY flight_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` Trailing 7-day rolling delays.
- `GET /skyledger-api/reports.php?report_key=window_crew` – `PERCENT_RANK() OVER (PARTITION BY role ORDER BY total_duty_hours DESC)` Normalized percentile ranking within role.

---

## 3. How to Test the Concurrency Lab in LIVE Mode

SkyLedger includes a dedicated Concurrency & Transaction Safety Lab demonstrating how relational database engines resolve race conditions and enforce atomicity under high-concurrency booking demands.

### Method 1: Web Portal Simulation (One-Click Live Demo)
1. In the top navigation bar, toggle the operational mode from **MOCK** to **LIVE (PHP 8 + MySQL)**.
2. Ensure your local MySQL/MariaDB database (`skyledger_db`) and Apache server are active via XAMPP.
3. In the navigation bar, go to **Admin Portal** &rarr; **Concurrency Lab** (`/admin/concurrency`).
4. Select a test flight (e.g., Flight #101 departing JFK) and target crew member (`Capt. Rajesh Varma`, Crew ID 1).
5. Click **"Simulate Race Condition (Promise.all)"**.
6. The frontend issues two concurrent HTTP POST requests to `/skyledger-api/crew.php?action=assign_tx` at the exact same millisecond:
   - **Coordinator Alpha** initiates transaction with `REPEATABLE READ`, acquires an exclusive row lock on Capt. Rajesh Varma (`SELECT ... FOR UPDATE`), validates no existing overlap, creates assignment record, and executes `COMMIT;` &rarr; returns **HTTP 200 OK**.
   - **Coordinator Beta** concurrently attempts to assign the same Captain to Flight #102 with an overlapping window. Beta's query is blocked at the database level until Alpha's lock releases. Once unlocked, Beta detects the newly committed assignment, triggers an immediate `ROLLBACK;`, and returns **HTTP 409 Conflict**.
7. The portal displays side-by-side terminal consoles detailing the exact SQL statements executed, lock wait duration, and rollback diagnostics.

### Method 2: Terminal / cURL Parallel Testing
You can verify concurrent locking directly from your terminal using parallel cURL commands:

```bash
# Coordinator Alpha:
curl -i -X POST "http://localhost/skyledger-api/crew.php?action=assign_tx" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: alpha@skyledger.aero" \
  -H "X-User-Role: admin" \
  -d '{"flight_id":1,"crew_id":1,"coordinator":"Coordinator Alpha","duty_start_time":"2013-01-01 05:00:00","duty_end_time":"2013-01-01 10:00:00"}' &

# Coordinator Beta (same crew_id 1, conflicting duty window):
curl -i -X POST "http://localhost/skyledger-api/crew.php?action=assign_tx" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: beta@skyledger.aero" \
  -H "X-User-Role: admin" \
  -d '{"flight_id":2,"crew_id":1,"coordinator":"Coordinator Beta","duty_start_time":"2013-01-01 05:30:00","duty_end_time":"2013-01-01 10:30:00"}' &

wait
```

#### Results:
- **Winner (Alpha)**: `HTTP/1.1 200 OK` with JSON `{ "success": true, "message": "Crew assigned successfully under REPEATABLE READ isolation.", "assignment_id": 48386 }`.
- **Loser (Beta)**: `HTTP/1.1 409 Conflict` with JSON `{ "success": false, "error": "CONFLICT DETECTED: Capt. Rajesh Varma is already on duty during this window." }`.

### Method 3: Testing the Project Rest-Period Constraint (Minimum 2 Hours)
If an assignment is scheduled less than 2 hours after a previous assignment finishes, the transaction rejects the booking under the project rest-period constraint (minimum 2 hours):
```bash
curl -i -X POST "http://localhost/skyledger-api/crew.php?action=assign_tx" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: alpha@skyledger.aero" \
  -H "X-User-Role: admin" \
  -d '{"flight_id":3,"crew_id":1,"coordinator":"Coordinator Gamma","duty_start_time":"2013-01-01 11:00:00","duty_end_time":"2013-01-01 15:00:00"}'
```
Returns `HTTP/1.1 409 Conflict`:
```json
{
  "success": false,
  "error": "REST PERIOD VIOLATION: Minimum 2-hour rest interval required before next duty (Conflict with Flight #101 duty ending at 10:00:00)."
}
```

---

## 4. XAMPP Deployment & Database Setup

1. Copy the `skyledger-api/` directory into your XAMPP `htdocs` folder:
   - Windows: `C:\xampp\htdocs\skyledger-api`
   - macOS: `/Applications/XAMPP/htdocs/skyledger-api`
   - Linux: `/opt/lampp/htdocs/skyledger-api`
2. Open phpMyAdmin (`http://localhost/phpmyadmin`) and execute `skyledger-api/schema.sql`.
3. Execute `skyledger-api/migration_features.sql` to apply performance indexes:
   - `idx_delay_ledger_reason (reason_code)`
   - `idx_flights_status_dep (status, scheduled_departure)`
   - `idx_flights_flight_number (flight_number)`
   - `idx_crew_assignments_flight (flight_id)`
   - `idx_crew_members_role_base (role, base_airport_id)`
4. Import dataset CSV files in the strict relational dependency order:
   `airports.csv` &rarr; `aircraft.csv` &rarr; `crew_members.csv` &rarr; `flights.csv` &rarr; `crew_assignments.csv` &rarr; `delay_ledger.csv`.

---

## 5. Demo Credentials

- **Administrator**: `admin@skyledger.aero` (or `admin@demo.com`) / `admin123`
- **Passenger**: `user@demo.com` / `user123`
