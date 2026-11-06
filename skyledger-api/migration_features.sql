-- ====================================================================
-- SkyLedger – Migration Script for Features 1-5 Performance & Indexes
-- Course: University DBMS Project
-- Safe to execute on existing database (MariaDB 10.4+ / MySQL 8.0)
-- ====================================================================

USE skyledger_db;

-- 1. Index on delay_ledger(reason_code) for fast incident aggregation
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
               WHERE table_schema = DATABASE() 
                 AND table_name = 'delay_ledger' 
                 AND index_name = 'idx_delay_ledger_reason');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Index idx_delay_ledger_reason already exists"', 
                   'CREATE INDEX idx_delay_ledger_reason ON delay_ledger (reason_code)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Index on flights(status, scheduled_departure) for operations dashboard & filters
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
               WHERE table_schema = DATABASE() 
                 AND table_name = 'flights' 
                 AND index_name = 'idx_flights_status_dep');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Index idx_flights_status_dep already exists"', 
                   'CREATE INDEX idx_flights_status_dep ON flights (status, scheduled_departure)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Index on flights(flight_number) for debounced partial lookups
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
               WHERE table_schema = DATABASE() 
                 AND table_name = 'flights' 
                 AND index_name = 'idx_flights_flight_number');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Index idx_flights_flight_number already exists"', 
                   'CREATE INDEX idx_flights_flight_number ON flights (flight_number)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Index on crew_assignments(flight_id) for rapid roster & junction lookups
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
               WHERE table_schema = DATABASE() 
                 AND table_name = 'crew_assignments' 
                 AND index_name = 'idx_crew_assignments_flight');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Index idx_crew_assignments_flight already exists"', 
                   'CREATE INDEX idx_crew_assignments_flight ON crew_assignments (flight_id)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Index on crew_members(role, base_airport_id) for availability lookup
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
               WHERE table_schema = DATABASE() 
                 AND table_name = 'crew_members' 
                 AND index_name = 'idx_crew_members_role_base');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Index idx_crew_members_role_base already exists"', 
                   'CREATE INDEX idx_crew_members_role_base ON crew_members (role, base_airport_id)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
