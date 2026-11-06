<?php
/**
 * SkyLedger – Crew Management & Roster Endpoint
 * Handles Crew CRUD, Duty assignments, Conflict Checking, and Standby Crew Suggestions.
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// GET: List crew members with duty hours and base airport
if ($method === 'GET' && empty($action)) {
    $role = $_GET['role'] ?? null;
    $base = $_GET['base'] ?? null;

    $where = ['1=1'];
    $params = [];

    if ($role) {
        $where[] = 'cm.role = ?';
        $params[] = $role;
    }
    if ($base) {
        $where[] = 'cm.base_airport_id = ?';
        $params[] = $base;
    }

    $whereSql = implode(' AND ', $where);

    $sql = "
        SELECT 
            cm.crew_id,
            cm.full_name,
            cm.role,
            cm.base_airport_id,
            ap.city AS base_city,
            COUNT(ca.assignment_id) AS total_assignments,
            COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, ca.duty_start_time, ca.duty_end_time) / 60.0), 1), 0.0) AS total_duty_hours
        FROM crew_members cm
        LEFT JOIN airports ap ON cm.base_airport_id = ap.airport_id
        LEFT JOIN crew_assignments ca ON cm.crew_id = ca.crew_id
        WHERE $whereSql
        GROUP BY cm.crew_id, cm.full_name, cm.role, cm.base_airport_id, ap.city
        ORDER BY cm.role ASC, cm.full_name ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $crew = $stmt->fetchAll();

    sendResponse(['success' => true, 'data' => $crew]);
}

// GET: Roster status for all flights on a date
if ($method === 'GET' && $action === 'flight_roster') {
    $flightId = (int)($_GET['flight_id'] ?? 0);
    $date = $_GET['date'] ?? '2013-01-01';

    if ($flightId > 0) {
        // Roster for single flight
        $stmt = $pdo->prepare("
            SELECT ca.assignment_id, ca.flight_id, ca.duty_start_time, ca.duty_end_time,
                   cm.crew_id, cm.full_name, cm.role, cm.base_airport_id
            FROM crew_assignments ca
            JOIN crew_members cm ON ca.crew_id = cm.crew_id
            WHERE ca.flight_id = ?
            ORDER BY cm.role ASC, cm.full_name ASC
        ");
        $stmt->execute([$flightId]);
        $assigned = $stmt->fetchAll();

        // Calculate completeness
        $captains = 0;
        $firstOfficers = 0;
        $cabinCrew = 0;

        foreach ($assigned as $m) {
            if ($m['role'] === 'Captain') $captains++;
            if ($m['role'] === 'First Officer') $firstOfficers++;
            if ($m['role'] === 'Cabin Crew') $cabinCrew++;
        }

        $isComplete = ($captains >= 1 && $firstOfficers >= 1 && $cabinCrew >= 3);

        sendResponse([
            'success' => true,
            'data' => [
                'flight_id'      => $flightId,
                'is_complete'    => $isComplete,
                'captains'       => $captains,
                'first_officers' => $firstOfficers,
                'cabin_crew'     => $cabinCrew,
                'crew'           => $assigned,
            ]
        ]);
    } else {
        // Summary for date
        $stmt = $pdo->prepare("
            SELECT f.flight_id, f.flight_number, f.origin_airport_id, f.destination_airport_id,
                   f.scheduled_departure, f.scheduled_arrival, f.status,
                   SUM(CASE WHEN cm.role = 'Captain' THEN 1 ELSE 0 END) AS captain_count,
                   SUM(CASE WHEN cm.role = 'First Officer' THEN 1 ELSE 0 END) AS fo_count,
                   SUM(CASE WHEN cm.role = 'Cabin Crew' THEN 1 ELSE 0 END) AS cabin_count,
                   COUNT(ca.assignment_id) AS total_crew
            FROM flights f
            LEFT JOIN crew_assignments ca ON f.flight_id = ca.flight_id
            LEFT JOIN crew_members cm ON ca.crew_id = cm.crew_id
            WHERE DATE(f.scheduled_departure) = ?
            GROUP BY f.flight_id, f.flight_number, f.origin_airport_id, f.destination_airport_id,
                     f.scheduled_departure, f.scheduled_arrival, f.status
            ORDER BY f.scheduled_departure ASC
        ");
        $stmt->execute([$date]);
        $rows = $stmt->fetchAll();

        $processed = array_map(function ($row) {
            $row['is_complete'] = ($row['captain_count'] >= 1 && $row['fo_count'] >= 1 && $row['cabin_count'] >= 3);
            return $row;
        }, $rows);

        sendResponse(['success' => true, 'data' => $processed]);
    }
}

// GET: Suggest Standby Crew for a flight & role with mandatory conflict check
if ($method === 'GET' && $action === 'suggest_standby') {
    $flightId = (int)($_GET['flight_id'] ?? 0);
    $role = $_GET['role'] ?? 'Captain';

    if (!$flightId) {
        sendResponse(['success' => false, 'error' => 'flight_id is required'], 400);
    }

    // Get flight departure & arrival times and origin airport
    $fStmt = $pdo->prepare("SELECT scheduled_departure, scheduled_arrival, origin_airport_id FROM flights WHERE flight_id = ?");
    $fStmt->execute([$flightId]);
    $flight = $fStmt->fetch();

    if (!$flight) {
        sendResponse(['success' => false, 'error' => 'Flight not found'], 404);
    }

    $dutyStart = date('Y-m-d H:i:s', strtotime($flight['scheduled_departure']) - 3600); // 1 hr before departure
    $dutyEnd   = date('Y-m-d H:i:s', strtotime($flight['scheduled_arrival']) + 1800);   // 30 min after arrival
    $origin    = $flight['origin_airport_id'];

    // Mandatory Conflict Check:
    // 1) Same role
    // 2) Base airport matches origin (standby crew)
    // 3) No overlapping assignment
    // 4) Rest period >= 2 hours (120 minutes) between duty end and this duty start, and between this duty end and next duty start
    $sql = "
        SELECT cm.crew_id, cm.full_name, cm.role, cm.base_airport_id
        FROM crew_members cm
        WHERE cm.role = ?
          AND (cm.base_airport_id = ? OR cm.base_airport_id IS NULL)
          AND cm.crew_id NOT IN (
              -- Overlapping duty
              SELECT ca.crew_id
              FROM crew_assignments ca
              WHERE (ca.duty_start_time <= ? AND ca.duty_end_time >= ?)
                 OR (ca.duty_start_time <= ? AND ca.duty_end_time >= ?)
                 OR (ca.duty_start_time >= ? AND ca.duty_end_time <= ?)
          )
          AND cm.crew_id NOT IN (
              -- Less than 2 hours rest before duty
              SELECT ca.crew_id
              FROM crew_assignments ca
              WHERE ca.duty_end_time > DATE_SUB(?, INTERVAL 2 HOUR)
                AND ca.duty_end_time <= ?
          )
          AND cm.crew_id NOT IN (
              -- Less than 2 hours rest after duty
              SELECT ca.crew_id
              FROM crew_assignments ca
              WHERE ca.duty_start_time < DATE_ADD(?, INTERVAL 2 HOUR)
                AND ca.duty_start_time >= ?
          )
        ORDER BY cm.full_name ASC
        LIMIT 20
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $role, $origin,
        $dutyStart, $dutyStart, $dutyEnd, $dutyEnd, $dutyStart, $dutyEnd,
        $dutyStart, $dutyStart,
        $dutyEnd, $dutyEnd
    ]);
    $availableCrew = $stmt->fetchAll();

    sendResponse([
        'success'         => true,
        'flight_id'       => $flightId,
        'role'            => $role,
        'duty_start_time' => $dutyStart,
        'duty_end_time'   => $dutyEnd,
        'data'            => $availableCrew
    ]);
}

// GET: Lookup crew with availability calculation for a flight or time window
if ($method === 'GET' && $action === 'lookup') {
    $q = trim($_GET['q'] ?? '');
    $role = $_GET['role'] ?? '';
    $base = $_GET['base'] ?? '';
    $checkStart = $_GET['check_start'] ?? '';
    $checkEnd = $_GET['check_end'] ?? '';
    $flightId = (int)($_GET['flight_id'] ?? 0);

    // If flightId is provided, get departure and arrival for the window
    if ($flightId > 0 && (empty($checkStart) || empty($checkEnd))) {
        $fStmt = $pdo->prepare("SELECT scheduled_departure, scheduled_arrival FROM flights WHERE flight_id = ?");
        $fStmt->execute([$flightId]);
        if ($fl = $fStmt->fetch()) {
            $checkStart = date('Y-m-d H:i:s', strtotime($fl['scheduled_departure']) - 3600);
            $checkEnd = date('Y-m-d H:i:s', strtotime($fl['scheduled_arrival']) + 1800);
        }
    }

    $where = ['1=1'];
    $params = [];

    if (!empty($q)) {
        if (is_numeric($q)) {
            $where[] = '(cm.crew_id = ? OR cm.full_name LIKE ?)';
            $params[] = (int)$q;
            $params[] = "%$q%";
        } else {
            $where[] = 'cm.full_name LIKE ?';
            $params[] = "%$q%";
        }
    }
    if (!empty($role)) {
        $where[] = 'cm.role = ?';
        $params[] = $role;
    }
    if (!empty($base)) {
        $where[] = 'cm.base_airport_id = ?';
        $params[] = $base;
    }

    $whereSql = implode(' AND ', $where);

    $sql = "
        SELECT cm.crew_id, cm.full_name, cm.role, cm.base_airport_id, ap.city AS base_city,
               COUNT(ca.assignment_id) AS total_assignments,
               COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, ca.duty_start_time, ca.duty_end_time) / 60.0), 1), 0.0) AS total_duty_hours
        FROM crew_members cm
        LEFT JOIN airports ap ON cm.base_airport_id = ap.airport_id
        LEFT JOIN crew_assignments ca ON cm.crew_id = ca.crew_id
        WHERE $whereSql
        GROUP BY cm.crew_id, cm.full_name, cm.role, cm.base_airport_id, ap.city
        ORDER BY cm.full_name ASC
        LIMIT 100
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $crewList = $stmt->fetchAll();

    // If checkStart and checkEnd exist, evaluate availability and conflict reason
    if (!empty($checkStart) && !empty($checkEnd)) {
        foreach ($crewList as &$member) {
            $cid = $member['crew_id'];

            // Check overlap
            $ovStmt = $pdo->prepare("
                SELECT ca.assignment_id, f.flight_number, ca.duty_start_time, ca.duty_end_time
                FROM crew_assignments ca
                JOIN flights f ON ca.flight_id = f.flight_id
                WHERE ca.crew_id = ?
                  AND (
                      (ca.duty_start_time <= ? AND ca.duty_end_time >= ?) OR
                      (ca.duty_start_time <= ? AND ca.duty_end_time >= ?) OR
                      (ca.duty_start_time >= ? AND ca.duty_end_time <= ?)
                  )
                LIMIT 1
            ");
            $ovStmt->execute([$cid, $checkStart, $checkStart, $checkEnd, $checkEnd, $checkStart, $checkEnd]);
            $overlap = $ovStmt->fetch();

            if ($overlap) {
                $member['is_available'] = false;
                $member['availability_status'] = 'Busy';
                $member['conflict_details'] = "Busy: flight {$overlap['flight_number']} " . date('H:i', strtotime($overlap['duty_start_time'])) . '-' . date('H:i', strtotime($overlap['duty_end_time']));
                continue;
            }

            // Check rest violation (<2h)
            $restStmt = $pdo->prepare("
                SELECT ca.assignment_id, f.flight_number, ca.duty_start_time, ca.duty_end_time
                FROM crew_assignments ca
                JOIN flights f ON ca.flight_id = f.flight_id
                WHERE ca.crew_id = ?
                  AND (
                      (ca.duty_end_time > DATE_SUB(?, INTERVAL 2 HOUR) AND ca.duty_end_time <= ?)
                      OR
                      (ca.duty_start_time < DATE_ADD(?, INTERVAL 2 HOUR) AND ca.duty_start_time >= ?)
                  )
                LIMIT 1
            ");
            $restStmt->execute([$cid, $checkStart, $checkStart, $checkEnd, $checkEnd]);
            $restConflict = $restStmt->fetch();

            if ($restConflict) {
                $member['is_available'] = false;
                $member['availability_status'] = 'Rest Violation';
                $member['conflict_details'] = "Rest Violation: <2h rest near flight {$restConflict['flight_number']}";
                continue;
            }

            $member['is_available'] = true;
            $member['availability_status'] = 'Available';
            $member['conflict_details'] = 'Available for duty';
        }
        unset($member);
    }

    sendResponse(['success' => true, 'data' => $crewList]);
}

// GET: Workload and utilization stats
if ($method === 'GET' && $action === 'workload') {
    $role = $_GET['role'] ?? '';
    $where = ['1=1'];
    $params = [];
    if (!empty($role)) {
        $where[] = 'cm.role = ?';
        $params[] = $role;
    }
    $whereSql = implode(' AND ', $where);

    $sql = "
        SELECT cm.crew_id, cm.full_name, cm.role, cm.base_airport_id, ap.city AS base_city,
               COUNT(ca.assignment_id) AS total_flights,
               COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, ca.duty_start_time, ca.duty_end_time) / 60.0), 1), 0.0) AS total_duty_hours,
               MAX(ca.duty_end_time) AS last_duty_time
        FROM crew_members cm
        LEFT JOIN airports ap ON cm.base_airport_id = ap.airport_id
        LEFT JOIN crew_assignments ca ON cm.crew_id = ca.crew_id
        WHERE $whereSql
        GROUP BY cm.crew_id, cm.full_name, cm.role, cm.base_airport_id, ap.city
        ORDER BY total_duty_hours DESC, total_flights DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $maxHours = 1.0;
    foreach ($rows as $r) {
        if ((float)$r['total_duty_hours'] > $maxHours) {
            $maxHours = (float)$r['total_duty_hours'];
        }
    }

    foreach ($rows as &$r) {
        $r['relative_utilization_pct'] = round(((float)$r['total_duty_hours'] / $maxHours) * 100, 1);
    }
    unset($r);

    sendResponse([
        'success'   => true,
        'max_hours' => $maxHours,
        'data'      => $rows
    ]);
}

// POST: Transactional assign with REPEATABLE READ & SELECT ... FOR UPDATE (Feature 4 Lab)
if ($method === 'POST' && ($action === 'assign_tx' || $action === 'assign')) {
    $admin = requireAdmin($pdo);
    $input = getJsonInput();

    $flightId = (int)($input['flight_id'] ?? 0);
    $crewId = (int)($input['crew_id'] ?? 0);
    $dutyStart = $input['duty_start_time'] ?? null;
    $dutyEnd = $input['duty_end_time'] ?? null;
    $coordinator = $input['coordinator'] ?? 'Coordinator';

    if (!$flightId || !$crewId) {
        sendResponse(['success' => false, 'error' => 'flight_id and crew_id are required'], 400);
    }

    // Step-by-step transaction logs
    $txLogs = [];
    $logStep = function ($step, $query, $status = 'OK', $notes = '') use (&$txLogs) {
        $txLogs[] = [
            'timestamp' => microtime(true),
            'step'      => $step,
            'query'     => $query,
            'status'    => $status,
            'notes'     => $notes
        ];
    };

    try {
        // Step 1: Set isolation level and begin transaction
        $pdo->exec("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
        $logStep(1, "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;", "OK", "Enforced strict repeatable read isolation");

        $pdo->beginTransaction();
        $logStep(2, "START TRANSACTION;", "OK", "Transaction initialized for $coordinator");

        // Step 2: Determine duty window if not provided
        if (!$dutyStart || !$dutyEnd) {
            $fStmt = $pdo->prepare("SELECT scheduled_departure, scheduled_arrival, flight_number FROM flights WHERE flight_id = ?");
            $fStmt->execute([$flightId]);
            $fl = $fStmt->fetch();
            if (!$fl) {
                $pdo->rollBack();
                $logStep(3, "SELECT ... FROM flights WHERE flight_id = $flightId", "FAIL", "Flight not found");
                sendResponse(['success' => false, 'error' => 'Flight not found', 'logs' => $txLogs], 404);
            }
            $dutyStart = date('Y-m-d H:i:s', strtotime($fl['scheduled_departure']) - 3600);
            $dutyEnd = date('Y-m-d H:i:s', strtotime($fl['scheduled_arrival']) + 1800);
        }

        // Step 3: Row locking on the crew member to prevent concurrent conflicting writes
        $logStep(3, "SELECT crew_id, full_name, role FROM crew_members WHERE crew_id = $crewId FOR UPDATE;", "LOCK_ACQUIRED", "Acquired exclusive row lock on crew member $crewId");
        $lockStmt = $pdo->prepare("SELECT crew_id, full_name, role FROM crew_members WHERE crew_id = ? FOR UPDATE");
        $lockStmt->execute([$crewId]);
        $crewMember = $lockStmt->fetch();

        if (!$crewMember) {
            $pdo->rollBack();
            $logStep(4, "Crew validation", "FAIL", "Crew member $crewId does not exist");
            sendResponse(['success' => false, 'error' => 'Crew member not found', 'logs' => $txLogs], 404);
        }

        // Step 4: Strict overlap validation with lock
        $logStep(4, "SELECT ca.assignment_id, f.flight_number FROM crew_assignments ca JOIN flights f ON ca.flight_id = f.flight_id WHERE ca.crew_id = $crewId AND (overlap conditions) FOR UPDATE;", "CHECKING", "Checking duty window overlap");
        $overlapStmt = $pdo->prepare("
            SELECT ca.assignment_id, f.flight_number
            FROM crew_assignments ca
            JOIN flights f ON ca.flight_id = f.flight_id
            WHERE ca.crew_id = ?
              AND (
                  (ca.duty_start_time <= ? AND ca.duty_end_time >= ?) OR
                  (ca.duty_start_time <= ? AND ca.duty_end_time >= ?) OR
                  (ca.duty_start_time >= ? AND ca.duty_end_time <= ?)
              )
            FOR UPDATE
        ");
        $overlapStmt->execute([$crewId, $dutyStart, $dutyStart, $dutyEnd, $dutyEnd, $dutyStart, $dutyEnd]);
        if ($conflict = $overlapStmt->fetch()) {
            $pdo->rollBack();
            $logStep(5, "ROLLBACK;", "CONFLICT", "Conflict detected: {$crewMember['full_name']} is already assigned to Flight {$conflict['flight_number']}");
            sendResponse([
                'success' => false,
                'error'   => "CONFLICT DETECTED: {$crewMember['full_name']} is already on duty for Flight {$conflict['flight_number']} during this window.",
                'logs'    => $txLogs
            ], 409);
        }

        // Step 5: Check 2 hours rest interval
        $logStep(5, "SELECT ca.assignment_id, f.flight_number FROM crew_assignments ca ... rest window (< 2h) FOR UPDATE;", "CHECKING", "Validating 2-hour rest requirement");
        $restStmt = $pdo->prepare("
            SELECT ca.assignment_id, f.flight_number, ca.duty_end_time, ca.duty_start_time
            FROM crew_assignments ca
            JOIN flights f ON ca.flight_id = f.flight_id
            WHERE ca.crew_id = ?
              AND (
                  (ca.duty_end_time > DATE_SUB(?, INTERVAL 2 HOUR) AND ca.duty_end_time <= ?)
                  OR
                  (ca.duty_start_time < DATE_ADD(?, INTERVAL 2 HOUR) AND ca.duty_start_time >= ?)
              )
            FOR UPDATE
        ");
        $restStmt->execute([$crewId, $dutyStart, $dutyStart, $dutyEnd, $dutyEnd]);
        if ($restConflict = $restStmt->fetch()) {
            $pdo->rollBack();
            $logStep(6, "ROLLBACK;", "REST_VIOLATION", "Mandatory 2-hour rest interval violated near Flight {$restConflict['flight_number']}");
            sendResponse([
                'success' => false,
                'error'   => "REST RULE VIOLATION: Minimum 2-hour rest interval required (Conflict with Flight {$restConflict['flight_number']}).",
                'logs'    => $txLogs
            ], 409);
        }

        // Step 6: Insert assignment
        $logStep(6, "INSERT INTO crew_assignments (flight_id, crew_id, duty_start_time, duty_end_time) VALUES ($flightId, $crewId, '$dutyStart', '$dutyEnd');", "INSERTED", "Assignment row created");
        $ins = $pdo->prepare("INSERT INTO crew_assignments (flight_id, crew_id, duty_start_time, duty_end_time) VALUES (?, ?, ?, ?)");
        $ins->execute([$flightId, $crewId, $dutyStart, $dutyEnd]);
        $newAssignmentId = (int)$pdo->lastInsertId();

        // Step 7: Commit transaction
        $pdo->commit();
        $logStep(7, "COMMIT;", "COMMITTED", "Transaction successfully committed by $coordinator");

        logActivity($pdo, 'ASSIGN_CREW_TX', $admin['email'], "Coordinator $coordinator assigned crew ID $crewId to flight ID $flightId (Assignment #$newAssignmentId)");

        sendResponse([
            'success'       => true,
            'message'       => 'Crew assigned successfully under REPEATABLE READ isolation.',
            'assignment_id' => $newAssignmentId,
            'logs'          => $txLogs
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $logStep(99, "ROLLBACK;", "ERROR", $e->getMessage());
        sendResponse(['success' => false, 'error' => $e->getMessage(), 'logs' => $txLogs], 500);
    }
}

// DELETE: Remove crew assignment (Admin only)
if ($method === 'DELETE' && $action === 'unassign') {
    $admin = requireAdmin($pdo);
    $assignmentId = (int)($_GET['assignment_id'] ?? 0);

    if (!$assignmentId) {
        sendResponse(['success' => false, 'error' => 'assignment_id is required'], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM crew_assignments WHERE assignment_id = ?");
    $stmt->execute([$assignmentId]);

    logActivity($pdo, 'UNASSIGN_CREW', $admin['email'], "Removed assignment ID $assignmentId");

    sendResponse(['success' => true, 'message' => 'Crew unassigned successfully']);
}

sendResponse(['success' => false, 'error' => 'Method or action not allowed'], 405);
