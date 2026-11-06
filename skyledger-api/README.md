# SkyLedger – Backend REST API (PHP 8 + PDO MySQL)
**University DBMS Project Documentation & Setup Guide**

SkyLedger backend is a pure PHP 8 + PDO MySQL REST API with parameterised queries, ACID transaction controls, and token-based role authentication.

---

## 1. XAMPP Local Deployment Setup

### Step A: Place the API in XAMPP
Copy the entire `skyledger-api/` directory into your XAMPP web root:
- **Windows**: `C:\xampp\htdocs\skyledger-api\`
- **macOS**: `/Applications/XAMPP/htdocs/skyledger-api/`
- **Linux**: `/opt/lampp/htdocs/skyledger-api/`

Ensure Apache and MySQL services are started in the XAMPP Control Panel.

### Step B: Database Initialization in phpMyAdmin
1. Open `http://localhost/phpmyadmin` in your browser.
2. Click on the **SQL** tab or create database `skyledger_db`.
3. Open `skyledger-api/schema.sql` and execute the entire script.
   This script creates all 6 foundational tables, the 3 new portal tables (`users`, `bookings`, `passengers`), the audit log table, and required indexes.

---

## 2. CSV Import Order (Mandatory for Foreign Key Constraints)

To prevent foreign key constraint violations (`FOREIGN KEY ... REFERENCES`), CSV files must be imported into phpMyAdmin or via `LOAD DATA INFILE` in this **exact order**:

1. **`airports.csv`** (Parent table for flights and crew base locations)
2. **`aircraft.csv`** (Parent table for flight equipment assignments)
3. **`crew_members.csv`** (Depends on `airports.airport_id`)
4. **`flights.csv`** (Depends on `airports` and `aircraft`)
5. **`crew_assignments.csv`** (Depends on `flights.flight_id` and `crew_members.crew_id`)
6. **`delay_ledger.csv`** (Depends on `flights.flight_id`)

### CSV Import Command Examples (MySQL CLI):
```sql
LOAD DATA LOCAL INFILE 'airports.csv' INTO TABLE airports FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 ROWS;
LOAD DATA LOCAL INFILE 'aircraft.csv' INTO TABLE aircraft FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 ROWS;
LOAD DATA LOCAL INFILE 'crew_members.csv' INTO TABLE crew_members FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 ROWS;
LOAD DATA LOCAL INFILE 'flights.csv' INTO TABLE flights FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 ROWS;
LOAD DATA LOCAL INFILE 'crew_assignments.csv' INTO TABLE crew_assignments FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 ROWS;
LOAD DATA LOCAL INFILE 'delay_ledger.csv' INTO TABLE delay_ledger FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 ROWS;
```

---

## 3. Schema Alterations & Integrity Constraints

### Required Status ENUM in `flights`:
```sql
ALTER TABLE flights MODIFY COLUMN status ENUM('On-Time', 'Delayed', 'Cancelled') NOT NULL DEFAULT 'On-Time';
```

### Table Structure Summary:
1. `airports`: `(airport_id PK, airport_name, city, country)`
2. `aircraft`: `(tail_number PK, model, capacity, last_maintenance_date)`
3. `crew_members`: `(crew_id PK auto, full_name, role ENUM, base_airport_id FK NULL)`
4. `flights`: `(flight_id PK auto, flight_number, origin_airport_id FK, destination_airport_id FK, scheduled_departure, scheduled_arrival, status ENUM, assigned_aircraft_id FK NULL)`
5. `crew_assignments`: `(assignment_id PK auto, flight_id FK CASCADE, crew_id FK CASCADE, duty_start_time, duty_end_time)`
6. `delay_ledger`: `(log_id PK auto, flight_id FK CASCADE, delay_duration_minutes, reason_code ENUM, logged_at)`
7. `users`: `(user_id PK auto, full_name, email UNIQUE, phone, password_hash, role ENUM, created_at)`
8. `bookings`: `(booking_id PK auto, pnr CHAR(6) UNIQUE, user_id FK, flight_id FK, travel_class ENUM, total_fare, booking_status ENUM, booked_at)`
9. `passengers`: `(passenger_id PK auto, booking_id FK CASCADE, full_name, age, gender ENUM, seat_no)`

---

---

## 4. REST API Endpoints Overview

### Core & Feature 1 (Flight Operations & Tactical Dispatch):
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/flights.php?action=search` | Indexed multi-criteria search (`q`, `origin`, `destination`, `date_from`, `date_to`, `status`, `sort`, `dir`, `page`, `page_size`) + status badge matrix counts |
| `GET` | `/flights.php?action=detail&id={id}` | Full relational flight profile, airworthiness check (>180d), delay history, assigned crew |
| `POST` | `/flights.php?action=change_status` | ACID Transaction: updates status + inserts into `delay_ledger` + inserts into `activity_log` |

### Feature 2 (Civil Aviation Delay Ledger & Analytics):
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/delays.php?action=search` | Filter delays by 4 strict ENUM reasons (`Weather`, `Mechanical`, `Air Traffic`, `Crew Shortage`), hub, date, min duration |
| `GET` | `/delays.php?action=summary` | Impact metrics (total minutes, avg delay, most impacted hub, reason breakdown series) |

### Feature 3 (Crew Scheduling & Roster Management):
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/crew.php?action=lookup` | Member lookup with live availability status (`Available`, `Busy`, `Rest Violation`) against flight window |
| `GET` | `/crew.php?action=flight_roster` | Flight roster completeness check (≥1 Captain, ≥1 F/O, ≥3 Cabin Crew) |
| `GET` | `/crew.php?action=suggest_standby` | Conflict-free standby suggestions with zero overlap and project rest-period constraint (minimum 2 hours) |
| `GET` | `/crew.php?action=workload` | Aggregated duty hours, flight counts, and relative fleet utilization |
| `POST` | `/crew.php?action=assign_tx` | Transactional crew assignment with `REPEATABLE READ` & `SELECT ... FOR UPDATE` |

### Feature 4 (Transaction Safety Lab & Concurrency Controls):
Demonstrates race condition mitigation when two flight coordinators simultaneously attempt to assign the same Captain for overlapping duty windows:
1. `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;`
2. `START TRANSACTION;`
3. `SELECT ... FROM crew_members WHERE crew_id = ? FOR UPDATE;` (Row-level exclusive mutex lock)
4. Checks duty window overlaps and project rest-period constraint (minimum 2 hours) under row lock.
5. If conflict detected: `ROLLBACK;` (returns HTTP 409 Conflict).
6. If clear: `INSERT INTO crew_assignments ...; COMMIT;` (returns HTTP 200 OK).

### Feature 5 (Business Intelligence & Window Functions Hub):
| Method | Endpoint | Concept & Requirements |
|---|---|---|
| `GET` | `/reports.php?report_key=route_leaderboard` | `RANK() OVER (ORDER BY delayed_count DESC)` with `delayed_count`, `delay_rate`, and `HAVING total_flights >= 20` |
| `GET` | `/reports.php?report_key=aircraft_utilization` | Grouped by `a.model`, with `aircraft_count`, `total_flights`, `avg_flights_per_aircraft`, `avg_days_since_maintenance`, `count_overdue` (>180d) |
| `GET` | `/reports.php?report_key=window_monthly` | `SUM(monthly_delay_mins) OVER (ORDER BY month_num)` Running Total & 3-month moving average |
| `GET` | `/reports.php?report_key=window_daily` | `AVG(daily_flights) OVER (ORDER BY flight_date ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING)` 7-day centered moving average |
| `GET` | `/reports.php?report_key=window_airport` | `SUM(departures) OVER (PARTITION BY origin_airport_id ORDER BY month_num)` NYC Hub cumulative departures |
| `GET` | `/reports.php?report_key=window_airport_delay` | `SUM(delay_minutes) OVER (PARTITION BY origin_airport_id ORDER BY month)` Cumulative delay minutes per hub |
| `GET` | `/reports.php?report_key=window_trailing_daily_delay` | `SUM(delay_minutes) OVER (ORDER BY flight_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` Trailing 7-day rolling delays |
| `GET` | `/reports.php?report_key=window_crew` | `PERCENT_RANK() OVER (PARTITION BY role ORDER BY total_duty_hours DESC)` Normalized percentile ranking within role |

### Authentication & Passenger Bookings:
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth.php?action=login` | User/Admin authentication returning base64 session token |
| `POST` | `/auth.php?action=register` | New passenger account registration with `password_hash` |
| `POST` | `/bookings.php` | Create booking inside transaction with seat conflict check |
| `GET` | `/bookings.php?action=pnr&pnr={PNR}` | Retrieve confirmed booking, passenger tickets, and flight status |
| `POST` | `/bookings.php?action=cancel` | Cancel booking with dynamic tiered refund calculation (>24h=100%, <24h=50%) |

---

## 5. How to Test the Concurrency Lab in LIVE Mode

SkyLedger includes a real-time Concurrency & Transaction Safety Lab designed to demonstrate ACID transaction isolation (`REPEATABLE READ`) and row-level locking (`SELECT ... FOR UPDATE`) under simultaneous booking race conditions.

### Option A: Testing via the Web Portal UI (Recommended for Demos)
1. In the top navigation bar, toggle the operational mode from **MOCK** to **LIVE (PHP 8 + MySQL)**.
2. Ensure XAMPP Apache and MySQL are running and `skyledger_db` is imported.
3. Open the main navigation menu and click **Admin Portal** &rarr; **Concurrency Lab** (`/admin/concurrency`).
4. Select a test flight (e.g., Flight #101 departing JFK) and a target crew member (e.g., `Capt. Rajesh Varma`, Crew ID 1).
5. Click the red button: **"Simulate Race Condition (Promise.all)"**.
6. The client fires two simultaneous HTTP POST requests to `/skyledger-api/crew.php?action=assign_tx` using `Promise.allSettled`:
   - **Request 1 (Coordinator Alpha)**: attempts to book Capt. Rajesh Varma for Flight #101 (Window: 05:00 - 10:00).
   - **Request 2 (Coordinator Beta)**: concurrently attempts to book the same Capt. Rajesh Varma for Flight #102 (Window: 05:30 - 10:30).
7. **Observed Result**:
   - **Coordinator Alpha**: Returns `HTTP 200 OK` &rarr; `COMMIT;` executed successfully, assigning Crew Member to Flight #101.
   - **Coordinator Beta**: Waits on the row lock, detects the overlap collision upon reading `crew_assignments`, and executes `ROLLBACK;` &rarr; returns `HTTP 409 Conflict`.
   - The UI displays side-by-side terminal logs showing the exact SQL statements executed (`START TRANSACTION`, `SELECT ... FOR UPDATE`, `COMMIT`, `ROLLBACK`) with execution timestamps.

### Option B: Testing via Terminal (Parallel cURL Commands)
Open two terminal windows or run this bash command to fire simultaneous requests against the PHP API:

```bash
# Terminal 1 - Coordinator Alpha
curl -i -X POST "http://localhost/skyledger-api/crew.php?action=assign_tx" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: alpha@skyledger.aero" \
  -H "X-User-Role: admin" \
  -d '{"flight_id":1,"crew_id":1,"coordinator":"Coordinator Alpha","duty_start_time":"2013-01-01 05:00:00","duty_end_time":"2013-01-01 10:00:00"}' &

# Terminal 2 - Coordinator Beta (same crew_id, overlapping window)
curl -i -X POST "http://localhost/skyledger-api/crew.php?action=assign_tx" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: beta@skyledger.aero" \
  -H "X-User-Role: admin" \
  -d '{"flight_id":2,"crew_id":1,"coordinator":"Coordinator Beta","duty_start_time":"2013-01-01 05:30:00","duty_end_time":"2013-01-01 10:30:00"}' &

wait
```

#### Expected Responses:
- **Winner Response (HTTP 200 OK)**:
```json
{
  "success": true,
  "message": "Crew assigned successfully under REPEATABLE READ isolation.",
  "assignment_id": 48386,
  "logs": [
    { "step": 1, "query": "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;", "status": "OK" },
    { "step": 2, "query": "START TRANSACTION;", "status": "OK" },
    { "step": 3, "query": "SELECT crew_id, full_name, role FROM crew_members WHERE crew_id = 1 FOR UPDATE;", "status": "LOCK_ACQUIRED" },
    { "step": 4, "query": "SELECT ca.assignment_id ... FOR UPDATE;", "status": "CHECKING" },
    { "step": 5, "query": "INSERT INTO crew_assignments ...;", "status": "INSERTED" },
    { "step": 6, "query": "COMMIT;", "status": "COMMITTED" }
  ]
}
```
- **Loser Response (HTTP 409 Conflict)**:
```json
{
  "success": false,
  "error": "CONFLICT DETECTED: Capt. Rajesh Varma is already assigned to a flight during this duty window.",
  "logs": [
    { "step": 1, "query": "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;", "status": "OK" },
    { "step": 2, "query": "START TRANSACTION;", "status": "OK" },
    { "step": 3, "query": "SELECT crew_id, full_name, role FROM crew_members WHERE crew_id = 1 FOR UPDATE;", "status": "LOCK_ACQUIRED" },
    { "step": 4, "query": "SELECT ca.assignment_id ... FOR UPDATE;", "status": "CONFLICT" },
    { "step": 5, "query": "ROLLBACK;", "status": "FAIL" }
  ]
}
```

### Option C: Testing the Rest-Period Constraint (Minimum 2 Hours)
If an assignment duty window is scheduled within 2 hours of a previous duty shift (even if the flights don't directly overlap in time), the transaction validates the project rest-period constraint (minimum 2 hours):
```bash
curl -i -X POST "http://localhost/skyledger-api/crew.php?action=assign_tx" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: alpha@skyledger.aero" \
  -H "X-User-Role: admin" \
  -d '{"flight_id":3,"crew_id":1,"coordinator":"Coordinator Gamma","duty_start_time":"2013-01-01 11:00:00","duty_end_time":"2013-01-01 15:00:00"}'
```
Returns:
```json
{
  "success": false,
  "error": "REST PERIOD VIOLATION: Minimum 2-hour rest interval required before next duty (Conflict with Flight #101 duty ending at 10:00:00).",
  "logs": [
    { "step": 5, "query": "SELECT ca.assignment_id ... rest window (<2h) FOR UPDATE;", "status": "REST_VIOLATION" },
    { "step": 6, "query": "ROLLBACK;", "status": "FAIL" }
  ]
}
```

---

## 6. Performance Indexes Migration
Run `/skyledger-api/migration_features.sql` to apply the recommended indexes for fast pagination and grouping:
- `idx_delay_ledger_reason (reason_code)`
- `idx_flights_status_dep (status, scheduled_departure)`
- `idx_flights_flight_number (flight_number)`
- `idx_crew_assignments_flight (flight_id)`
- `idx_crew_members_role_base (role, base_airport_id)`

---

## 7. Demo Credentials

- **Admin Account**: `admin@skyledger.aero` (or `admin@demo.com`) / Password: `admin123`
- **Passenger Account**: `user@demo.com` / Password: `user123`


