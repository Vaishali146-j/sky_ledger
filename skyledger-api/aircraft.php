<?php
/**
 * SkyLedger – Aircraft Management Endpoint
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET: List all aircraft with maintenance status and utilization
if ($method === 'GET') {
    $sql = "
        SELECT 
            a.tail_number,
            a.model,
            a.capacity,
            a.last_maintenance_date,
            DATEDIFF('2013-01-01', a.last_maintenance_date) AS days_since_maintenance,
            CASE WHEN DATEDIFF('2013-01-01', a.last_maintenance_date) > 180 THEN 1 ELSE 0 END AS is_maintenance_due,
            COUNT(f.flight_id) AS total_flights,
            COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, f.scheduled_departure, f.scheduled_arrival) / 60.0), 1), 0.0) AS total_hours
        FROM aircraft a
        LEFT JOIN flights f ON a.tail_number = f.assigned_aircraft_id
        GROUP BY a.tail_number, a.model, a.capacity, a.last_maintenance_date
        ORDER BY days_since_maintenance DESC
    ";
    $stmt = $pdo->query($sql);
    $aircraft = $stmt->fetchAll();
    sendResponse(['success' => true, 'data' => $aircraft]);
}

// POST: Add new aircraft (Admin only)
if ($method === 'POST') {
    $admin = requireAdmin($pdo);
    $input = getJsonInput();

    $tailNumber = strtoupper(trim($input['tail_number'] ?? ''));
    $model = trim($input['model'] ?? '');
    $capacity = (int)($input['capacity'] ?? 0);
    $maintenanceDate = $input['last_maintenance_date'] ?? '2012-12-01';

    if (empty($tailNumber) || empty($model) || $capacity <= 0) {
        sendResponse(['success' => false, 'error' => 'Tail number, model and valid capacity are required'], 400);
    }

    $stmt = $pdo->prepare("INSERT INTO aircraft (tail_number, model, capacity, last_maintenance_date) VALUES (?, ?, ?, ?)");
    $stmt->execute([$tailNumber, $model, $capacity, $maintenanceDate]);

    logActivity($pdo, 'ADD_AIRCRAFT', $admin['email'], "Added aircraft $tailNumber ($model, capacity $capacity)");

    sendResponse(['success' => true, 'message' => "Aircraft $tailNumber registered successfully"], 201);
}

// PUT: Mark Serviced Today (Admin only)
if ($method === 'PUT') {
    $admin = requireAdmin($pdo);
    $input = getJsonInput();
    $tailNumber = trim($input['tail_number'] ?? '');
    $serviceDate = $input['service_date'] ?? '2013-01-01';

    if (empty($tailNumber)) {
        sendResponse(['success' => false, 'error' => 'tail_number is required'], 400);
    }

    $stmt = $pdo->prepare("UPDATE aircraft SET last_maintenance_date = ? WHERE tail_number = ?");
    $stmt->execute([$serviceDate, $tailNumber]);

    logActivity($pdo, 'MAINTENANCE_SERVICE', $admin['email'], "Serviced aircraft $tailNumber on $serviceDate");

    sendResponse(['success' => true, 'message' => "Aircraft $tailNumber marked as serviced on $serviceDate"]);
}

sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
