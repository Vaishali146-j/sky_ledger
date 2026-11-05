<?php
/**
 * SkyLedger – Airports Endpoint
 */
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $search = $_GET['search'] ?? '';
    if (!empty($search)) {
        $stmt = $pdo->prepare("
            SELECT airport_id, airport_name, city, country 
            FROM airports 
            WHERE airport_id LIKE ? OR city LIKE ? OR airport_name LIKE ?
            ORDER BY city ASC
        ");
        $term = "%$search%";
        $stmt->execute([$term, $term, $term]);
    } else {
        $stmt = $pdo->query("SELECT airport_id, airport_name, city, country FROM airports ORDER BY city ASC");
    }
    $airports = $stmt->fetchAll();
    sendResponse(['success' => true, 'data' => $airports]);
}

sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
