<?php
/**
 * SkyLedger – Flights Endpoint
 * Handles search, filters, pagination, CRUD, status updates, and delay logging.
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET: Search / List Flights
if ($method === 'GET') {
    $flightId = $_GET['flight_id'] ?? null;

    // Single flight detail
    if ($flightId) {
        $stmt = $pdo->prepare("
            SELECT f.*, 
                   orig.airport_name AS origin_name, orig.city AS origin_city,
                   dest.airport_name AS destination_name, dest.city AS destination_city,
                   ac.model AS aircraft_model, ac.capacity AS aircraft_capacity,
                   dl.delay_duration_minutes, dl.reason_code AS delay_reason
            FROM flights f
            JOIN airports orig ON f.origin_airport_id = orig.airport_id
            JOIN airports dest ON f.destination_airport_id = dest.airport_id
            LEFT JOIN aircraft ac ON f.assigned_aircraft_id = ac.tail_number
            LEFT JOIN delay_ledger dl ON f.flight_id = dl.flight_id
            WHERE f.flight_id = ?
        ");
        $stmt->execute([$flightId]);
        $flight = $stmt->fetch();

        if (!$flight) {
            sendResponse(['success' => false, 'error' => 'Flight not found'], 404);
        }

        // Calculate historical on-time performance on this route
        $perfStmt = $pdo->prepare("
            SELECT 
                COUNT(*) AS total_route_flights,
                SUM(CASE WHEN status = 'On-Time' THEN 1 ELSE 0 END) AS on_time_count
            FROM flights
            WHERE origin_airport_id = ? AND destination_airport_id = ?
        ");
        $perfStmt->execute([$flight['origin_airport_id'], $flight['destination_airport_id']]);
        $perf = $perfStmt->fetch();
        $onTimeRate = ($perf && $perf['total_route_flights'] > 0)
            ? round(($perf['on_time_count'] / $perf['total_route_flights']) * 100, 1)
            : 85.0;

        $flight['on_time_percentage'] = $onTimeRate;

        // Fetch crew assigned
        $crewStmt = $pdo->prepare("
            SELECT cm.crew_id, cm.full_name, cm.role, ca.duty_start_time, ca.duty_end_time
            FROM crew_assignments ca
            JOIN crew_members cm ON ca.crew_id = cm.crew_id
            WHERE ca.flight_id = ?
        ");
        $crewStmt->execute([$flightId]);
        $flight['assigned_crew'] = $crewStmt->fetchAll();

        sendResponse(['success' => true, 'data' => $flight]);
    }

    // Search query params
    $origin = $_GET['origin'] ?? null;
    $destination = $_GET['destination'] ?? null;
    $date = $_GET['date'] ?? null; // YYYY-MM-DD
    $status = $_GET['status'] ?? null;
    $aircraft = $_GET['aircraft'] ?? null;
    $search = $_GET['search'] ?? null;
    $sortBy = $_GET['sort_by'] ?? 'scheduled_departure';
    $sortOrder = strtoupper($_GET['sort_order'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';
    $limit = min(max((int)($_GET['limit'] ?? 20), 1), 100);
    $offset = max((int)($_GET['offset'] ?? 0), 0);

    $whereClauses = ['1=1'];
    $params = [];

    if (!empty($origin)) {
        $whereClauses[] = 'f.origin_airport_id = ?';
        $params[] = $origin;
    }
    if (!empty($destination)) {
        $whereClauses[] = 'f.destination_airport_id = ?';
        $params[] = $destination;
    }
    if (!empty($date)) {
        $whereClauses[] = 'DATE(f.scheduled_departure) = ?';
        $params[] = $date;
    }
    if (!empty($status)) {
        $whereClauses[] = 'f.status = ?';
        $params[] = $status;
    }
    if (!empty($aircraft)) {
        $whereClauses[] = 'f.assigned_aircraft_id = ?';
        $params[] = $aircraft;
    }
    if (!empty($search)) {
        $whereClauses[] = '(f.flight_number LIKE ? OR orig.city LIKE ? OR dest.city LIKE ?)';
        $searchWild = "%$search%";
        $params[] = $searchWild;
        $params[] = $searchWild;
        $params[] = $searchWild;
    }

    $whereSql = implode(' AND ', $whereClauses);

    // Total Count
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

    // Allowed sort columns to prevent SQL injection
    $allowedSorts = [
        'scheduled_departure' => 'f.scheduled_departure',
        'scheduled_arrival'   => 'f.scheduled_arrival',
        'flight_number'       => 'f.flight_number',
        'status'              => 'f.status',
    ];
    $sortColumn = $allowedSorts[$sortBy] ?? 'f.scheduled_departure';

    $dataSql = "
        SELECT f.*,
               orig.airport_name AS origin_name, orig.city AS origin_city,
               dest.airport_name AS destination_name, dest.city AS destination_city,
               ac.model AS aircraft_model, ac.capacity AS aircraft_capacity,
               dl.delay_duration_minutes, dl.reason_code AS delay_reason
        FROM flights f
        JOIN airports orig ON f.origin_airport_id = orig.airport_id
        JOIN airports dest ON f.destination_airport_id = dest.airport_id
        LEFT JOIN aircraft ac ON f.assigned_aircraft_id = ac.tail_number
        LEFT JOIN delay_ledger dl ON f.flight_id = dl.flight_id
        WHERE $whereSql
        ORDER BY $sortColumn $sortOrder
        LIMIT ? OFFSET ?
    ";

    $dataStmt = $pdo->prepare($dataSql);
    $bindIdx = 1;
    foreach ($params as $p) {
        $dataStmt->bindValue($bindIdx++, $p);
    }
    $dataStmt->bindValue($bindIdx++, $limit, PDO::PARAM_INT);
    $dataStmt->bindValue($bindIdx++, $offset, PDO::PARAM_INT);
    $dataStmt->execute();
    $flights = $dataStmt->fetchAll();

    sendResponse([
        'success'    => true,
        'total'      => $totalCount,
        'limit'      => $limit,
        'offset'     => $offset,
        'data'       => $flights,
    ]);
}

// POST: Create Flight (Admin only)
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
        sendResponse(['success' => false, 'error' => 'Origin and destination cannot be the same airport'], 400);
    }

    if (strtotime($arrival) <= strtotime($departure)) {
        sendResponse(['success' => false, 'error' => 'Scheduled arrival must be after scheduled departure'], 400);
    }

    // Overlap check for aircraft
    if ($aircraftId) {
        $overlapStmt = $pdo->prepare("
            SELECT flight_id, flight_number 
            FROM flights 
            WHERE assigned_aircraft_id = ? 
              AND status != 'Cancelled'
              AND (
                  (scheduled_departure <= ? AND scheduled_arrival >= ?) OR
                  (scheduled_departure <= ? AND scheduled_arrival >= ?) OR
                  (scheduled_departure >= ? AND scheduled_arrival <= ?)
              )
        ");
        $overlapStmt->execute([$aircraftId, $departure, $departure, $arrival, $arrival, $departure, $arrival]);
        if ($overlap = $overlapStmt->fetch()) {
            sendResponse([
                'success' => false, 
                'error'   => "Aircraft $aircraftId has a scheduling conflict with Flight {$overlap['flight_number']}"
            ], 409);
        }
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

// PUT: Update Flight or Status (Admin only)
if ($method === 'PUT') {
    $admin = requireAdmin($pdo);
    $input = getJsonInput();
    $flightId = (int)($input['flight_id'] ?? 0);

    if (!$flightId) {
        sendResponse(['success' => false, 'error' => 'flight_id is required'], 400);
    }

    $status = $input['status'] ?? null;
    $delayMinutes = isset($input['delay_minutes']) ? (int)$input['delay_minutes'] : null;
    $delayReason = $input['delay_reason'] ?? null;

    $pdo->beginTransaction();
    try {
        if ($status) {
            $stmt = $pdo->prepare("UPDATE flights SET status = ? WHERE flight_id = ?");
            $stmt->execute([$status, $flightId]);

            // If status is Delayed and reason provided, record in delay_ledger
            if ($status === 'Delayed' && $delayMinutes !== null && $delayReason) {
                // Delete existing entry if any
                $delStmt = $pdo->prepare("DELETE FROM delay_ledger WHERE flight_id = ?");
                $delStmt->execute([$flightId]);

                $insStmt = $pdo->prepare("INSERT INTO delay_ledger (flight_id, delay_duration_minutes, reason_code) VALUES (?, ?, ?)");
                $insStmt->execute([$flightId, $delayMinutes, $delayReason]);
            }
        }

        // Aircraft assignment update if provided
        if (array_key_exists('assigned_aircraft_id', $input)) {
            $aircraftId = !empty($input['assigned_aircraft_id']) ? $input['assigned_aircraft_id'] : null;
            $stmt = $pdo->prepare("UPDATE flights SET assigned_aircraft_id = ? WHERE flight_id = ?");
            $stmt->execute([$aircraftId, $flightId]);
        }

        $pdo->commit();
        logActivity($pdo, 'UPDATE_FLIGHT', $admin['email'], "Updated flight ID: $flightId, Status: $status");

        sendResponse(['success' => true, 'message' => 'Flight updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendResponse(['success' => false, 'error' => 'Update failed: ' . $e->getMessage()], 500);
    }
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
