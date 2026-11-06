<?php
/**
 * SkyLedger – Delay Ledger & Incident Tracking Endpoint (Feature 2)
 * Handles filtered delay search, live Recharts analytics summary, and metrics.
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// GET: Filtered Delay Incidents Search or Live Analytics Summary
if ($method === 'GET') {
    $startTime = microtime(true);

    $reason = trim($_GET['reason'] ?? $_GET['reason_code'] ?? '');
    $airport = trim($_GET['airport'] ?? '');
    $dateFrom = trim($_GET['date_from'] ?? '');
    $dateTo = trim($_GET['date_to'] ?? '');
    $minMinutes = isset($_GET['min_minutes']) ? (int)$_GET['min_minutes'] : 0;

    $where = ['1=1'];
    $params = [];

    if (!empty($reason) && $reason !== 'ALL') {
        $where[] = 'dl.reason_code = ?';
        $params[] = $reason;
    }
    if (!empty($airport)) {
        $where[] = '(f.origin_airport_id = ? OR f.destination_airport_id = ?)';
        $params[] = $airport;
        $params[] = $airport;
    }
    if (!empty($dateFrom) && !empty($dateTo)) {
        $where[] = 'DATE(f.scheduled_departure) BETWEEN ? AND ?';
        $params[] = $dateFrom;
        $params[] = $dateTo;
    } elseif (!empty($dateFrom)) {
        $where[] = 'DATE(f.scheduled_departure) = ?';
        $params[] = $dateFrom;
    }
    if ($minMinutes > 0) {
        $where[] = 'dl.delay_duration_minutes >= ?';
        $params[] = $minMinutes;
    }

    $whereSql = implode(' AND ', $where);

    // Summary Action (Metrics + Chart Data)
    if ($action === 'summary') {
        // Overall Metrics
        $metricSql = "
            SELECT 
                COUNT(dl.log_id) AS total_incidents,
                COALESCE(SUM(dl.delay_duration_minutes), 0) AS total_delay_minutes,
                COALESCE(ROUND(SUM(dl.delay_duration_minutes) / 60.0, 1), 0.0) AS total_delay_hours,
                COALESCE(ROUND(AVG(dl.delay_duration_minutes), 1), 0.0) AS avg_delay_minutes,
                COALESCE(MAX(dl.delay_duration_minutes), 0) AS max_delay_minutes
            FROM delay_ledger dl
            JOIN flights f ON dl.flight_id = f.flight_id
            WHERE $whereSql
        ";
        $mStmt = $pdo->prepare($metricSql);
        $mStmt->execute($params);
        $metrics = $mStmt->fetch();

        // Top reason code
        $topReasonSql = "
            SELECT dl.reason_code, COUNT(dl.log_id) AS cnt
            FROM delay_ledger dl
            JOIN flights f ON dl.flight_id = f.flight_id
            WHERE $whereSql
            GROUP BY dl.reason_code
            ORDER BY cnt DESC
            LIMIT 1
        ";
        $topStmt = $pdo->prepare($topReasonSql);
        $topStmt->execute($params);
        $topReasonRow = $topStmt->fetch();
        $metrics['top_reason'] = $topReasonRow['reason_code'] ?? 'None';

        // Recharts Breakdown Series by Reason Code
        $chartSql = "
            SELECT 
                dl.reason_code,
                COUNT(dl.log_id) AS incident_count,
                COALESCE(SUM(dl.delay_duration_minutes), 0) AS total_minutes,
                COALESCE(ROUND(AVG(dl.delay_duration_minutes), 1), 0.0) AS avg_minutes
            FROM delay_ledger dl
            JOIN flights f ON dl.flight_id = f.flight_id
            WHERE $whereSql
            GROUP BY dl.reason_code
            ORDER BY incident_count DESC
        ";
        $cStmt = $pdo->prepare($chartSql);
        $cStmt->execute($params);
        $chartData = $cStmt->fetchAll();

        // Ensure all 4 enum reason codes exist in output
        $allReasons = ['Weather', 'Mechanical', 'Air Traffic', 'Crew Shortage'];
        $completeChart = [];
        foreach ($allReasons as $r) {
            $found = null;
            foreach ($chartData as $cd) {
                if ($cd['reason_code'] === $r) {
                    $found = $cd;
                    break;
                }
            }
            $completeChart[] = [
                'reason_code'    => $r,
                'incident_count' => (int)($found['incident_count'] ?? 0),
                'total_minutes'  => (int)($found['total_minutes'] ?? 0),
                'avg_minutes'    => (float)($found['avg_minutes'] ?? 0.0),
            ];
        }

        $executionMs = round((microtime(true) - $startTime) * 1000, 2);

        sendResponse([
            'success'      => true,
            'sql_used'     => trim($metricSql),
            'execution_ms' => $executionMs,
            'metrics'      => $metrics,
            'chart_data'   => $completeChart,
        ]);
    }

    // Default: List / Search Delay Ledger Records
    $page = max((int)($_GET['page'] ?? 1), 1);
    $pageSize = min(max((int)($_GET['page_size'] ?? $_GET['limit'] ?? 25), 1), 100);
    $offset = ($page - 1) * $pageSize;

    $countSql = "
        SELECT COUNT(dl.log_id) AS total
        FROM delay_ledger dl
        JOIN flights f ON dl.flight_id = f.flight_id
        WHERE $whereSql
    ";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalCount = (int)$countStmt->fetch()['total'];

    $dataSql = "
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
    $logs = $dataStmt->fetchAll();

    $executionMs = round((microtime(true) - $startTime) * 1000, 2);

    sendResponse([
        'success'      => true,
        'sql_used'     => trim($dataSql),
        'execution_ms' => $executionMs,
        'total'        => $totalCount,
        'page'         => $page,
        'page_size'    => $pageSize,
        'data'         => $logs,
    ]);
}

// POST: Add delay record directly
if ($method === 'POST') {
    $admin = requireAdmin($pdo);
    $input = getJsonInput();

    $flightId = (int)($input['flight_id'] ?? 0);
    $minutes = (int)($input['delay_duration_minutes'] ?? 0);
    $reason = trim($input['reason_code'] ?? '');

    $validReasons = ['Weather', 'Mechanical', 'Air Traffic', 'Crew Shortage'];
    if (!$flightId || $minutes <= 0 || !in_array($reason, $validReasons, true)) {
        sendResponse(['success' => false, 'error' => 'flight_id, positive duration, and valid reason_code (Weather, Mechanical, Air Traffic, Crew Shortage) required'], 400);
    }

    $pdo->beginTransaction();
    try {
        $uStmt = $pdo->prepare("UPDATE flights SET status = 'Delayed' WHERE flight_id = ?");
        $uStmt->execute([$flightId]);

        $stmt = $pdo->prepare("INSERT INTO delay_ledger (flight_id, delay_duration_minutes, reason_code, logged_at) VALUES (?, ?, ?, NOW())");
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
