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

## 4. REST API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth.php?action=login` | User/Admin authentication returning base64 session token |
| `POST` | `/auth.php?action=register` | New passenger account registration with `password_hash` |
| `GET` | `/flights.php` | Search and filter flights with pagination (`limit`, `offset`) |
| `GET` | `/flights.php?flight_id={id}` | Detailed flight information, route on-time performance & delay logs |
| `POST` | `/flights.php` | Create new flight with aircraft overlap validation (Admin) |
| `PUT` | `/flights.php` | Update flight status & log delay in transaction (Admin) |
| `GET` | `/airports.php` | Retrieve all active airports with city/code lookup |
| `GET` | `/aircraft.php` | Fleet list, utilization hours, and maintenance due alert (>180 days) |
| `PUT` | `/aircraft.php` | Mark aircraft serviced today (`last_maintenance_date = CURDATE()`) |
| `GET` | `/crew.php` | Crew members list, duty hours, filter by role/base |
| `GET` | `/crew.php?action=suggest_standby` | Standby crew suggestions with 2-hour rest and overlap conflict checker |
| `POST` | `/crew.php?action=assign` | Assign crew to flight with strict concurrency and rest check |
| `GET` | `/delays.php` | Filterable delay ledger, incidents, and reasons summary |
| `POST` | `/delays.php` | Log delay with duration and reason code (`Weather`, `Mechanical`, etc.) |
| `POST` | `/bookings.php` | Create booking inside transaction with seat conflict check |
| `GET` | `/bookings.php?action=pnr&pnr={PNR}` | Retrieve confirmed booking, passenger tickets, and flight status |
| `POST` | `/bookings.php?action=cancel` | Cancel booking with dynamic tiered refund calculation (>24h=100%, <24h=50%) |
| `GET` | `/bookings.php?action=manifest&flight_id={id}` | Printable passenger manifest per flight (Admin) |
| `GET` | `/reports.php?report_key={key}` | Execute DBMS complex relational queries and return timing |

---

## 5. Demo Credentials

- **Admin Account**: `admin@demo.com` / Password: `admin123`
- **Passenger Account**: `user@demo.com` / Password: `user123`
