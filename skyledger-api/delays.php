<?php
/**
 * SkyLedger – Delay Ledger Endpoint
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// GET: List delay logs with filters and summary stats
if ($method === 'GET' && empty($action)) {
    $reason = $_GET['reason'] ?? null;
    $airport = $_GET['airport'] ?? null;
    $date = $_GET['date'] ?? null;

    $where = ['1=1'];
    $params = [];

    if ($reason) {
        $where[] = 'dl.reason_code = ?';
        $params[] = $reason;
    }
    if ($airport) {
        $where[] = '(f.origin_airport_id = ? OR f.destination_airport_id = ?)';
        $params[] = $airport;
        $params[] = $airport;
    }
    if ($date) {
        $where[] = 'DATE(f.scheduled_departure) = ?';
        $params[] = $date;
    }

    $whereSql = implode(' AND ', $where);

    $sql = "
        SELECT 
            dl.log_id,
            dl.flight_id,
            dl.delay_duration_minutes,
            dl.reason_code,
            dl.logged_at,
            f.flight_number,
            f.origin_airport_id,
            f.destination_airport_id,
            f.scheduled_departure,
            f.scheduled_arrival,
            orig.city AS origin_city,
            dest.city AS destination_city
        FROM delay_ledger dl
        JOIN flights f ON dl.flight_id = f.flight_id
        JOIN airports orig ON f.origin_airport_id = orig.airport_id
        JOIN airports dest ON f.destination_airport_id = dest.airport_id
        WHERE $whereSql
        ORDER BY dl.logged_at DESC, dl.log_id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll();

    // Stats
    $statsSql = "
        SELECT 
            COUNT(dl.log_id) AS total_delays,
            COALESCE(ROUND(AVG(dl.delay_duration_minutes), 1), 0.0) AS avg_delay_minutes,
            COALESCE(MAX(dl.delay_duration_minutes), 0) AS max_delay_minutes,
            COALESCE(SUM(dl.delay_duration_minutes), 0) AS total_delay_minutes
        FROM delay_ledger dl
        JOIN flights f ON dl.flight_id = f.flight_id
        WHERE $whereSql
    ";
    $statsStmt = $pdo->prepare($statsSql);
    $statsStmt->execute($params);
    $stats = $statsStmt->fetch();

    sendResponse([
        'success' => true,
        'stats'   => $stats,
        'data'    => $logs
    ]);
}

// GET: Delay aggregation reports by reason
if ($method === 'GET' && $action === 'reasons_summary') {
    $sql = "
        SELECT 
            reason_code,
            COUNT(*) AS incident_count,
            ROUND(AVG(delay_duration_minutes), 1) AS avg_duration,
            SUM(delay_duration_minutes) AS total_duration
        FROM delay_ledger
        GROUP BY reason_code
        ORDER BY incident_count DESC
    ";
    $stmt = $pdo->query($sql);
    sendResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

// POST: Log new delay entry (Admin only)
if ($method === 'POST') {
    $admin = requireAdmin($pdo);
    $input = getJsonInput();

    $flightId = (int)($input['flight_id'] ?? 0);
    $minutes = (int)($input['delay_duration_minutes'] ?? 0);
    $reason = $input['reason_code'] ?? '';

    if (!$flightId || $minutes <= 0 || empty($reason)) {
        sendResponse(['success' => false, 'error' => 'flight_id, positive delay_duration_minutes, and valid reason_code required'], 400);
    }

    $pdo->beginTransaction();
    try {
        // Update flight status to 'Delayed'
        $uStmt = $pdo->prepare("UPDATE flights SET status = 'Delayed' WHERE flight_id = ?");
        $uStmt->execute([$flightId]);

        $stmt = $pdo->prepare("INSERT INTO delay_ledger (flight_id, delay_duration_minutes, reason_code) VALUES (?, ?, ?)");
        $stmt->execute([$flightId, $minutes, $reason]);
        $logId = (int)$pdo->lastInsertId();

        $pdo->commit();
        logActivity($pdo, 'LOG_DELAY', $admin['email'], "Logged $minutes min delay for flight $flightId (Reason: $reason)");

        sendResponse(['success' => true, 'log_id' => $logId, 'message' => 'Delay logged successfully'], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
