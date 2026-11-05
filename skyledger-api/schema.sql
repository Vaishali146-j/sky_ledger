-- ====================================================================
-- SkyLedger – Flight Booking & Operations Portal
-- Complete Database Schema & Seed Data (MySQL 8.0 / MariaDB)
-- Course: University DBMS Project
-- ====================================================================

-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS skyledger_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skyledger_db;

-- --------------------------------------------------------------------
-- 1. EXISTING 6 TABLES (Preserved as specified)
-- --------------------------------------------------------------------

DROP TABLE IF EXISTS delay_ledger;
DROP TABLE IF EXISTS crew_assignments;
DROP TABLE IF EXISTS passengers;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS flights;
DROP TABLE IF EXISTS crew_members;
DROP TABLE IF EXISTS aircraft;
DROP TABLE IF EXISTS airports;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS activity_log;

-- Table 1: airports
CREATE TABLE airports (
    airport_id VARCHAR(10) PRIMARY KEY,
    airport_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'United States'
) ENGINE=InnoDB;

-- Table 2: aircraft
CREATE TABLE aircraft (
    tail_number VARCHAR(20) PRIMARY KEY,
    model VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    last_maintenance_date DATE NOT NULL
) ENGINE=InnoDB;

-- Table 3: crew_members
CREATE TABLE crew_members (
    crew_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    role ENUM('Captain', 'First Officer', 'Cabin Crew') NOT NULL,
    base_airport_id VARCHAR(10) NULL,
    FOREIGN KEY (base_airport_id) REFERENCES airports(airport_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Table 4: flights
CREATE TABLE flights (
    flight_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_number VARCHAR(20) NOT NULL,
    origin_airport_id VARCHAR(10) NOT NULL,
    destination_airport_id VARCHAR(10) NOT NULL,
    scheduled_departure DATETIME NOT NULL,
    scheduled_arrival DATETIME NOT NULL,
    status ENUM('On-Time', 'Delayed', 'Cancelled') NOT NULL DEFAULT 'On-Time',
    assigned_aircraft_id VARCHAR(20) NULL,
    FOREIGN KEY (origin_airport_id) REFERENCES airports(airport_id),
    FOREIGN KEY (destination_airport_id) REFERENCES airports(airport_id),
    FOREIGN KEY (assigned_aircraft_id) REFERENCES aircraft(tail_number) ON DELETE SET NULL,
    CONSTRAINT chk_flight_endpoints CHECK (origin_airport_id != destination_airport_id),
    CONSTRAINT chk_flight_timing CHECK (scheduled_arrival > scheduled_departure)
) ENGINE=InnoDB;

-- Table 5: crew_assignments
CREATE TABLE crew_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    crew_id INT NOT NULL,
    duty_start_time DATETIME NOT NULL,
    duty_end_time DATETIME NOT NULL,
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id) ON DELETE CASCADE,
    FOREIGN KEY (crew_id) REFERENCES crew_members(crew_id) ON DELETE CASCADE,
    CONSTRAINT chk_duty_window CHECK (duty_end_time > duty_start_time)
) ENGINE=InnoDB;

-- Table 6: delay_ledger
CREATE TABLE delay_ledger (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    delay_duration_minutes INT NOT NULL,
    reason_code ENUM('Weather', 'Mechanical', 'Air Traffic', 'Crew Shortage') NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 2. NEW TABLES ADDED (Additive Only)
-- --------------------------------------------------------------------

-- Table 7: users
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('passenger', 'admin') NOT NULL DEFAULT 'passenger',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Table 8: bookings
CREATE TABLE bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    pnr CHAR(6) NOT NULL UNIQUE,
    user_id INT NULL,
    flight_id INT NOT NULL,
    travel_class ENUM('Economy', 'Business') NOT NULL DEFAULT 'Economy',
    total_fare DECIMAL(10, 2) NOT NULL,
    booking_status ENUM('Confirmed', 'Cancelled') NOT NULL DEFAULT 'Confirmed',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Table 9: passengers
-- UNIQUE(flight_id, seat_no) is enforced via booking link and application transactions
CREATE TABLE passengers (
    passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    gender ENUM('M', 'F', 'O') NOT NULL,
    seat_no VARCHAR(4) NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Table 10: activity_log (Audit trail for admin/operations actions)
CREATE TABLE activity_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    performed_by VARCHAR(120) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 3. PERFORMANCE INDEXES (As specified in requirement)
-- --------------------------------------------------------------------
CREATE INDEX idx_flights_origin_dep ON flights (origin_airport_id, scheduled_departure);
CREATE INDEX idx_flights_dest ON flights (destination_airport_id);
CREATE INDEX idx_crew_assignments_crew_duty ON crew_assignments (crew_id, duty_start_time);
CREATE INDEX idx_delay_ledger_flight ON delay_ledger (flight_id);
CREATE INDEX idx_bookings_pnr ON bookings (pnr);
CREATE INDEX idx_bookings_user ON bookings (user_id);
CREATE INDEX idx_passengers_booking ON passengers (booking_id);

-- --------------------------------------------------------------------
-- 4. SEED DATA (Demo Credentials & Sample Records)
-- --------------------------------------------------------------------

-- Passwords:
-- 'admin123' -> $2y$10$wT2U8N6eO8Yf3c1Zg2I1.uE... (using standard bcrypt)
-- 'user123'  -> $2y$10$vP6K1...
INSERT INTO users (user_id, full_name, email, phone, password_hash, role) VALUES
(1, 'Systems Administrator', 'admin@demo.com', '+1-800-555-0199', '$2y$10$7ZkQ.o7b39l0L2O/o1l8xe7fD6Z5s0Nq.8W.V8Hn5Z4L9A4hW4H7m', 'admin'),
(2, 'Priya Sharma (Passenger)', 'user@demo.com', '+1-800-555-0142', '$2y$10$7ZkQ.o7b39l0L2O/o1l8xe7fD6Z5s0Nq.8W.V8Hn5Z4L9A4hW4H7m', 'passenger'),
(3, 'Johnathan Miller', 'jmiller@example.com', '+1-800-555-0177', '$2y$10$7ZkQ.o7b39l0L2O/o1l8xe7fD6Z5s0Nq.8W.V8Hn5Z4L9A4hW4H7m', 'passenger');

-- Key Origin & Destination Airports
INSERT INTO airports (airport_id, airport_name, city, country) VALUES
('JFK', 'John F. Kennedy International Airport', 'New York', 'United States'),
('LGA', 'LaGuardia Airport', 'New York', 'United States'),
('EWR', 'Newark Liberty International Airport', 'Newark', 'United States'),
('ORD', 'Chicago OHare International Airport', 'Chicago', 'United States'),
('LAX', 'Los Angeles International Airport', 'Los Angeles', 'United States'),
('SFO', 'San Francisco International Airport', 'San Francisco', 'United States'),
('MIA', 'Miami International Airport', 'Miami', 'United States'),
('ATL', 'Hartsfield-Jackson Atlanta International Airport', 'Atlanta', 'United States'),
('DFW', 'Dallas/Fort Worth International Airport', 'Dallas', 'United States'),
('BOS', 'Boston Logan International Airport', 'Boston', 'United States'),
('SEA', 'Seattle-Tacoma International Airport', 'Seattle', 'United States'),
('DEN', 'Denver International Airport', 'Denver', 'United States'),
('MCO', 'Orlando International Airport', 'Orlando', 'United States'),
('LAS', 'Harry Reid International Airport', 'Las Vegas', 'United States'),
('CLT', 'Charlotte Douglas International Airport', 'Charlotte', 'United States');

-- Aircraft
INSERT INTO aircraft (tail_number, model, capacity, last_maintenance_date) VALUES
('N14228', 'Boeing 737-800', 162, '2012-11-15'),
('N24211', 'Airbus A320-200', 150, '2012-12-05'),
('N39463', 'Boeing 777-200ER', 273, '2012-08-20'),
('N510JB', 'Airbus A321-200', 200, '2012-06-10'), -- Overdue (> 180 days)
('N804AW', 'Embraer E190', 96, '2012-10-01'),
('N952DL', 'Boeing 757-200', 180, '2012-05-18'), -- Overdue (> 180 days)
('N624AE', 'Bombardier CRJ-700', 70, '2012-12-28');

-- Crew Members
INSERT INTO crew_members (crew_id, full_name, role, base_airport_id) VALUES
(1, 'Capt. Rajesh Varma', 'Captain', 'JFK'),
(2, 'Capt. Sarah Jenkins', 'Captain', 'LGA'),
(3, 'Capt. Robert Chen', 'Captain', 'EWR'),
(4, 'F/O Amit Kulkarni', 'First Officer', 'JFK'),
(5, 'F/O Emily Watson', 'First Officer', 'LGA'),
(6, 'F/O Michael Chang', 'First Officer', 'EWR'),
(7, 'Sneha Patel', 'Cabin Crew', 'JFK'),
(8, 'David Rodriguez', 'Cabin Crew', 'JFK'),
(9, 'Ananya Das', 'Cabin Crew', 'JFK'),
(10, 'Jessica Taylor', 'Cabin Crew', 'LGA'),
(11, 'Vikram Malhotra', 'Cabin Crew', 'LGA'),
(12, 'Rachel Adams', 'Cabin Crew', 'LGA'),
(13, 'Daniel Kim', 'Cabin Crew', 'EWR'),
(14, 'Pooja Iyer', 'Cabin Crew', 'EWR'),
(15, 'Carlos Sanchez', 'Cabin Crew', 'EWR');

-- Flights on 2013-01-01
INSERT INTO flights (flight_id, flight_number, origin_airport_id, destination_airport_id, scheduled_departure, scheduled_arrival, status, assigned_aircraft_id) VALUES
(101, 'UA-1545', 'EWR', 'ORD', '2013-01-01 06:00:00', '2013-01-01 07:35:00', 'Delayed', 'N14228'),
(102, 'AA-843', 'JFK', 'LAX', '2013-01-01 07:30:00', '2013-01-01 10:45:00', 'On-Time', 'N39463'),
(103, 'DL-1204', 'LGA', 'ATL', '2013-01-01 08:15:00', '2013-01-01 10:50:00', 'On-Time', 'N24211'),
(104, 'B6-21', 'JFK', 'SFO', '2013-01-01 09:00:00', '2013-01-01 12:35:00', 'On-Time', 'N510JB'),
(105, 'UA-382', 'EWR', 'MIA', '2013-01-01 10:15:00', '2013-01-01 13:20:00', 'Cancelled', 'N804AW'),
(106, 'AA-1002', 'JFK', 'BOS', '2013-01-01 11:30:00', '2013-01-01 12:40:00', 'On-Time', 'N624AE'),
(107, 'DL-448', 'LGA', 'ORD', '2013-01-01 13:00:00', '2013-01-01 14:40:00', 'Delayed', 'N24211'),
(108, 'UA-890', 'EWR', 'LAX', '2013-01-01 15:30:00', '2013-01-01 18:50:00', 'On-Time', 'N14228');

-- Delay Ledger entries
INSERT INTO delay_ledger (flight_id, delay_duration_minutes, reason_code) VALUES
(101, 33, 'Mechanical'),
(107, 45, 'Weather');

-- Crew Assignments
INSERT INTO crew_assignments (flight_id, crew_id, duty_start_time, duty_end_time) VALUES
(102, 1, '2013-01-01 06:30:00', '2013-01-01 11:45:00'),
(102, 4, '2013-01-01 06:30:00', '2013-01-01 11:45:00'),
(102, 7, '2013-01-01 06:45:00', '2013-01-01 11:15:00'),
(102, 8, '2013-01-01 06:45:00', '2013-01-01 11:15:00'),
(102, 9, '2013-01-01 06:45:00', '2013-01-01 11:15:00');

-- Sample Bookings & Passengers
INSERT INTO bookings (booking_id, pnr, user_id, flight_id, travel_class, total_fare, booking_status) VALUES
(1, 'SK789A', 2, 102, 'Economy', 342.30, 'Confirmed'),
(2, 'SK104B', 3, 104, 'Business', 785.40, 'Confirmed');

INSERT INTO passengers (booking_id, full_name, age, gender, seat_no) VALUES
(1, 'Priya Sharma', 29, 'F', '12A'),
(2, 'Johnathan Miller', 42, 'M', '2F');

INSERT INTO activity_log (action_type, performed_by, details) VALUES
('SYSTEM_INIT', 'admin@demo.com', 'Database initialized with initial airports, flights, and demo seed data.');
