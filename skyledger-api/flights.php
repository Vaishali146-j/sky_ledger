<?php
/**
 * SkyLedger – Flights Endpoint (Upgraded for Feature 1 & 2)
 * Handles global operations search, pagination, detailed flight modal profile,
 * and ACID status change triggers with delay ledger logging.
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// GET: Search / List Flights
if ($method === 'GET') {
    $startTime = microtime(true);

    // Detail Profile Action
    if ($action === 'detail' || isset($_GET['flight_id'])) {
        $flightId = (int)($_GET['id'] ?? $_GET['flight_id'] ?? 0);
        if (!$flightId) {
            sendResponse(['success' => false, 'error' => 'Flight ID is required'], 400);
        }

        $sql = "
            SELECT f.*, 
                   orig.airport_name AS origin_name, orig.city AS origin_city,
                   dest.airport_name AS destination_name, dest.city AS destination_city,
                   ac.tail_number, ac.model AS aircraft_model, ac.capacity AS aircraft_capacity,
                   ac.last_maintenance_date,
                   DATEDIFF('2013-01-01', ac.last_maintenance_date) AS days_since_maintenance,
                   CASE WHEN DATEDIFF('2013-01-01', ac.last_maintenance_date) > 180 THEN 1 ELSE 0 END AS is_maintenance_due
            FROM flights f
            JOIN airports orig ON f.origin_airport_id = orig.airport_id
            JOIN airports dest ON f.destination_airport_id = dest.airport_id
            LEFT JOIN aircraft ac ON f.assigned_aircraft_id = ac.tail_number
            WHERE f.flight_id = ?
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$flightId]);
        $flight = $stmt->fetch();

        if (!$flight) {
            sendResponse(['success' => false, 'error' => 'Flight not found'], 404);
        }

        // Delay history from delay_ledger
        $delayStmt = $pdo->prepare("
            SELECT log_id, delay_duration_minutes, reason_code, logged_at
            FROM delay_ledger
            WHERE flight_id = ?
            ORDER BY logged_at DESC, log_id DESC
        ");
        $delayStmt->execute([$flightId]);
        $flight['delay_history'] = $delayStmt->fetchAll();

        // Calculate on-time performance on route
        $perfStmt = $pdo->prepare("
            SELECT 
                COUNT(*) AS total_route_flights,
                SUM(CASE WHEN status = 'On-Time' THEN 1 ELSE 0 END) AS on_time_count
            FROM flights
            WHERE origin_airport_id = ? AND destination_airport_id = ?
        ");
        $perfStmt->execute([$flight['origin_airport_id'], $flight['destination_airport_id']]);
        $perf = $perfStmt->fetch();
        $flight['on_time_percentage'] = ($perf && $perf['total_route_flights'] > 0)
            ? round(($perf['on_time_count'] / $perf['total_route_flights']) * 100, 1)
            : 85.0;

        // Assigned Crew with duty details
        $crewStmt = $pdo->prepare("
            SELECT ca.assignment_id, ca.duty_start_time, ca.duty_end_time,
                   ROUND(TIMESTAMPDIFF(MINUTE, ca.duty_start_time, ca.duty_end_time) / 60.0, 1) AS duty_hours,
                   cm.crew_id, cm.full_name, cm.role, cm.base_airport_id
            FROM crew_assignments ca
            JOIN crew_members cm ON ca.crew_id = cm.crew_id
            WHERE ca.flight_id = ?
            ORDER BY FIELD(cm.role, 'Captain', 'First Officer', 'Cabin Crew'), cm.full_name ASC
        ");
        $crewStmt->execute([$flightId]);
        $flight['assigned_crew'] = $crewStmt->fetchAll();

        $executionMs = round((microtime(true) - $startTime) * 1000, 2);

        sendResponse([
            'success'      => true,
            'sql_used'     => trim($sql),
            'execution_ms' => $executionMs,
            'data'         => $flight,
        ]);
    }

    // Search Flights Action
    $q = trim($_GET['q'] ?? $_GET['search'] ?? '');
    $origin = trim($_GET['origin'] ?? '');
    $destination = trim($_GET['destination'] ?? '');
    $dateFrom = trim($_GET['date_from'] ?? $_GET['date'] ?? '');
    $dateTo = trim($_GET['date_to'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $aircraft = trim($_GET['aircraft'] ?? '');

    $page = max((int)($_GET['page'] ?? 1), 1);
    $pageSize = min(max((int)($_GET['page_size'] ?? $_GET['limit'] ?? 20), 1), 100);
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : ($page - 1) * $pageSize;

    $sort = $_GET['sort'] ?? $_GET['sort_by'] ?? 'scheduled_departure';
    $dir = strtoupper($_GET['dir'] ?? $_GET['sort_order'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';

    $whereClauses = ['1=1'];
    $params = [];

    if (!empty($q)) {
        $whereClauses[] = '(f.flight_number LIKE ? OR orig.city LIKE ? OR dest.city LIKE ? OR orig.airport_id LIKE ? OR dest.airport_id LIKE ?)';
        $wildcard = "%$q%";
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
    }
    if (!empty($origin)) {
        $whereClauses[] = 'f.origin_airport_id = ?';
        $params[] = $origin;
    }
    if (!empty($destination)) {
        $whereClauses[] = 'f.destination_airport_id = ?';
        $params[] = $destination;
    }
    if (!empty($dateFrom) && !empty($dateTo)) {
        $whereClauses[] = 'DATE(f.scheduled_departure) BETWEEN ? AND ?';
        $params[] = $dateFrom;
        $params[] = $dateTo;
    } elseif (!empty($dateFrom)) {
        $whereClauses[] = 'DATE(f.scheduled_departure) = ?';
        $params[] = $dateFrom;
    }
    if (!empty($status) && $status !== 'ALL') {
        $whereClauses[] = 'f.status = ?';
        $params[] = $status;
    }
    if (!empty($aircraft)) {
        $whereClauses[] = 'f.assigned_aircraft_id = ?';
        $params[] = $aircraft;
    }

    $whereSql = implode(' AND ', $whereClauses);

    // Compute Status Matrix Counts under current non-status filters
    $countWhere = ['1=1'];
    $countParams = [];
    if (!empty($q)) {
        $countWhere[] = '(f.flight_number LIKE ? OR orig.city LIKE ? OR dest.city LIKE ? OR orig.airport_id LIKE ? OR dest.airport_id LIKE ?)';
        $wildcard = "%$q%";
        $countParams[] = $wildcard; $countParams[] = $wildcard; $countParams[] = $wildcard; $countParams[] = $wildcard; $countParams[] = $wildcard;
    }
    if (!empty($origin)) {
        $countWhere[] = 'f.origin_airport_id = ?';
        $countParams[] = $origin;
    }
    if (!empty($destination)) {
        $countWhere[] = 'f.destination_airport_id = ?';
        $countParams[] = $destination;
    }
    if (!empty($dateFrom) && !empty($dateTo)) {
        $countWhere[] = 'DATE(f.scheduled_departure) BETWEEN ? AND ?';
        $countParams[] = $dateFrom; $countParams[] = $dateTo;
    } elseif (!empty($dateFrom)) {
        $countWhere[] = 'DATE(f.scheduled_departure) = ?';
        $countParams[] = $dateFrom;
    }
    $countWhereSql = implode(' AND ', $countWhere);

    $matrixSql = "
        SELECT 
            COUNT(*) AS total_filtered,
            SUM(CASE WHEN f.status = 'On-Time' THEN 1 ELSE 0 END) AS on_time_count,
            SUM(CASE WHEN f.status = 'Delayed' THEN 1 ELSE 0 END) AS delayed_count,
            SUM(CASE WHEN f.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_count
        FROM flights f
        JOIN airports orig ON f.origin_airport_id = orig.airport_id
        JOIN airports dest ON f.destination_airport_id = dest.airport_id
        WHERE $countWhereSql
    ";
    $matrixStmt = $pdo->prepare($matrixSql);
    $matrixStmt->execute($countParams);
    $matrix = $matrixStmt->fetch();

    // Query for total matching filtered rows
    $countSql = "
        SELECT COUNT(*) AS total
        FROM flights f
        JOIN airports orig ON f.origin_airport_id = orig.airport_id
        JOIN airports dest ON f.destination_airport_id = dest.airport_id
        WHERE $whereSql
    ";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalCount = (int)$countStmt->fetch()['total'];

    // Safe Column Sorting
    $sortMap = [
        'scheduled_departure' => 'f.scheduled_departure',
        'scheduled_arrival'   => 'f.scheduled_arrival',
        'flight_number'       => 'f.flight_number',
        'status'              => 'f.status',
        'origin'              => 'f.origin_airport_id',
        'destination'         => 'f.destination_airport_id',
    ];
    $sortCol = $sortMap[$sort] ?? 'f.scheduled_departure';

    $dataSql = "
        SELECT f.*,
               orig.airport_name AS origin_name, orig.city AS origin_city,
               dest.airport_name AS destination_name, dest.city AS destination_city,
               ac.model AS aircraft_model, ac.capacity AS aircraft_capacity,
               ac.last_maintenance_date,
               DATEDIFF('2013-01-01', ac.last_maintenance_date) AS days_since_maintenance,
               CASE WHEN DATEDIFF('2013-01-01', ac.last_maintenance_date) > 180 THEN 1 ELSE 0 END AS is_maintenance_due,
               dl.delay_duration_minutes, dl.reason_code AS delay_reason
        FROM flights f
        JOIN airports orig ON f.origin_airport_id = orig.airport_id
        JOIN airports dest ON f.destination_airport_id = dest.airport_id
        LEFT JOIN aircraft ac ON f.assigned_aircraft_id = ac.tail_number
        LEFT JOIN delay_ledger dl ON f.flight_id = dl.flight_id
        WHERE $whereSql
        ORDER BY $sortCol $dir
        LIMIT ? OFFSET ?
    ";

    $dataStmt = $pdo->prepare($dataSql);
    $idx = 1;
    foreach ($params as $p) {
        $dataStmt->bindValue($idx++, $p);
    }
    $dataStmt->bindValue($idx++, $pageSize, PDO::PARAM_INT);
    $dataStmt->bindValue($idx++, $offset, PDO::PARAM_INT);
    $dataStmt->execute();
    $flights = $dataStmt->fetchAll();

    $executionMs = round((microtime(true) - $startTime) * 1000, 2);

    sendResponse([
        'success'      => true,
        'sql_used'     => trim($dataSql),
        'execution_ms' => $executionMs,
        'total'        => $totalCount,
        'page'         => $page,
        'page_size'    => $pageSize,
        'offset'       => $offset,
        'counts'       => [
            'total'     => (int)($matrix['total_filtered'] ?? $totalCount),
            'on_time'   => (int)($matrix['on_time_count'] ?? 0),
            'delayed'   => (int)($matrix['delayed_count'] ?? 0),
            'cancelled' => (int)($matrix['cancelled_count'] ?? 0),
        ],
        'data'         => $flights,
    ]);
}

// POST: Change Status with ACID Transaction and Delay Ledger Logging (Feature 2)
if ($method === 'POST' && $action === 'change_status') {
    $admin = requireAdmin($pdo);
    $input = getJsonInput();

    $flightId = (int)($input['flight_id'] ?? 0);
    $newStatus = trim($input['status'] ?? '');
    $delayMinutes = isset($input['delay_duration_minutes']) ? (int)$input['delay_duration_minutes'] : 0;
    $reasonCode = trim($input['reason_code'] ?? '');

    // Validate enum
    $validStatuses = ['On-Time', 'Delayed', 'Cancelled'];
    if (!$flightId || !in_array($newStatus, $validStatuses, true)) {
        sendResponse(['success' => false, 'error' => 'Valid flight_id and status (On-Time, Delayed, Cancelled) required'], 400);
    }

    $validReasons = ['Weather', 'Mechanical', 'Air Traffic', 'Crew Shortage'];
    if ($newStatus === 'Delayed') {
        if ($delayMinutes <= 0) {
            sendResponse(['success' => false, 'error' => 'Delay duration must be greater than 0 minutes'], 400);
        }
        if (!in_array($reasonCode, $validReasons, true)) {
            sendResponse(['success' => false, 'error' => 'Invalid reason_code. Must be Weather, Mechanical, Air Traffic, or Crew Shortage'], 400);
        }
    }

    $pdo->beginTransaction();
    try {
        // Step 1: Update status on flights table
        $uStmt = $pdo->prepare("UPDATE flights SET status = ? WHERE flight_id = ?");
        $uStmt->execute([$newStatus, $flightId]);

        $logId = null;
        $loggedAt = date('Y-m-d H:i:s');

        // Step 2: If Delayed, insert immutable audit record into delay_ledger
        if ($newStatus === 'Delayed') {
            $insStmt = $pdo->prepare("
                INSERT INTO delay_ledger (flight_id, delay_duration_minutes, reason_code, logged_at)
                VALUES (?, ?, ?, NOW())
            ");
            $insStmt->execute([$flightId, $delayMinutes, $reasonCode]);
            $logId = (int)$pdo->lastInsertId();
        }

        // Step 3: Insert into activity_log audit trail
        $actStmt = $pdo->prepare("
            INSERT INTO activity_log (action_type, performed_by, details, ip_address)
            VALUES (?, ?, ?, ?)
        ");
        $details = "Flight ID $flightId changed to status '$newStatus'" .
            ($newStatus === 'Delayed' ? " (Delay: {$delayMinutes}m, Reason: $reasonCode, Log ID: $logId)" : "");
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $actStmt->execute(['STATUS_CHANGE', $admin['email'], $details, $ip]);

        $pdo->commit();

        sendResponse([
            'success'   => true,
            'message'   => "Status updated to $newStatus successfully",
            'flight_id' => $flightId,
            'status'    => $newStatus,
            'log_id'    => $logId,
            'logged_at' => $loggedAt,
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendResponse(['success' => false, 'error' => 'Transaction failed: ' . $e->getMessage()], 500);
    }
}

// POST: Standard Create Flight (Admin only)
if ($method === 'POST') {
    $admin = requireAdmin($pdo);
    $input = getJsonInput();

    $flightNumber = trim($input['flight_number'] ?? '');
    $origin = trim($input['origin_airport_id'] ?? '');
    $destination = trim($input['destination_airport_id'] ?? '');
    $departure = trim($input['scheduled_departure'] ?? '');
    $arrival = trim($input['scheduled_arrival'] ?? '');
    $status = $input['status'] ?? 'On-Time';
    $aircraftId = !empty($input['assigned_aircraft_id']) ? $input['assigned_aircraft_id'] : null;

    if (empty($flightNumber) || empty($origin) || empty($destination) || empty($departure) || empty($arrival)) {
        sendResponse(['success' => false, 'error' => 'Missing required flight fields'], 400);
    }
    if ($origin === $destination) {
        sendResponse(['success' => false, 'error' => 'Origin and destination cannot be identical'], 400);
    }
    if (strtotime($arrival) <= strtotime($departure)) {
        sendResponse(['success' => false, 'error' => 'Scheduled arrival must be after scheduled departure'], 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO flights (flight_number, origin_airport_id, destination_airport_id, scheduled_departure, scheduled_arrival, status, assigned_aircraft_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$flightNumber, $origin, $destination, $departure, $arrival, $status, $aircraftId]);
    $newId = (int)$pdo->lastInsertId();

    logActivity($pdo, 'CREATE_FLIGHT', $admin['email'], "Created flight $flightNumber (ID: $newId)");
    sendResponse(['success' => true, 'flight_id' => $newId, 'message' => 'Flight created successfully'], 201);
}

// PUT: Update Flight (Admin only)
if ($method === 'PUT') {
    $admin = requireAdmin($pdo);
    $input = getJsonInput();
    $flightId = (int)($input['flight_id'] ?? 0);

    if (!$flightId) {
        sendResponse(['success' => false, 'error' => 'flight_id is required'], 400);
    }

    if (array_key_exists('assigned_aircraft_id', $input)) {
        $aircraftId = !empty($input['assigned_aircraft_id']) ? $input['assigned_aircraft_id'] : null;
        $stmt = $pdo->prepare("UPDATE flights SET assigned_aircraft_id = ? WHERE flight_id = ?");
        $stmt->execute([$aircraftId, $flightId]);
    }

    logActivity($pdo, 'UPDATE_FLIGHT', $admin['email'], "Updated flight ID: $flightId");
    sendResponse(['success' => true, 'message' => 'Flight updated successfully']);
}

// DELETE: Remove Flight (Admin only)
if ($method === 'DELETE') {
    $admin = requireAdmin($pdo);
    $flightId = (int)($_GET['flight_id'] ?? 0);
    if (!$flightId) {
        sendResponse(['success' => false, 'error' => 'flight_id is required'], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM flights WHERE flight_id = ?");
    $stmt->execute([$flightId]);

    logActivity($pdo, 'DELETE_FLIGHT', $admin['email'], "Deleted flight ID: $flightId");
    sendResponse(['success' => true, 'message' => 'Flight deleted successfully']);
}

sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
