<?php
/**
 * SkyLedger – Flight Booking & Operations Portal
 * REST API Database & Common Helper Configuration
 * Language: PHP 8.x + PDO MySQL
 */

// Enable error reporting for development, log cleanly
error_reporting(E_ALL);
ini_set('display_errors', '0');

// Set CORS headers for local XAMPP and AI Studio cross-origin testing
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database Connection Settings
$DB_HOST = getenv('DB_HOST') ?: '127.0.0.1';
$DB_PORT = getenv('DB_PORT') ?: '3306';
$DB_NAME = getenv('DB_NAME') ?: 'skyledger_db';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASS = getenv('DB_PASS') ?: '';

try {
    $dsn = "mysql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_NAME};charset=utf8mb4";
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit();
}

/**
 * Send JSON response
 */
function sendResponse($data, int $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Read JSON request body
 */
function getJsonInput(): array {
    $input = file_get_contents('php://input');
    if (empty($input)) {
        return [];
    }
    $decoded = json_decode($input, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Simple Token Authenticator (Base64 JWT-style / Token for university demo)
 */
function getAuthenticatedUser(PDO $pdo): ?array {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (str_starts_with($authHeader, 'Bearer ')) {
        $token = substr($authHeader, 7);
        $payload = json_decode(base64_decode($token), true);
        if ($payload && isset($payload['user_id'])) {
            $stmt = $pdo->prepare("SELECT user_id, full_name, email, role FROM users WHERE user_id = ?");
            $stmt->execute([$payload['user_id']]);
            $user = $stmt->fetch();
            return $user ?: null;
        }
    }
    return null;
}

/**
 * Require Admin role guard
 */
function requireAdmin(PDO $pdo): array {
    $user = getAuthenticatedUser($pdo);
    if (!$user || $user['role'] !== 'admin') {
        sendResponse([
            'success' => false,
            'error'   => 'Forbidden: Administrator privileges required'
        ], 403);
    }
    return $user;
}

/**
 * Log Admin or System activity
 */
function logActivity(PDO $pdo, string $actionType, string $performedBy, string $details): void {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $stmt = $pdo->prepare("INSERT INTO activity_log (action_type, performed_by, details, ip_address) VALUES (?, ?, ?, ?)");
        $stmt->execute([$actionType, $performedBy, $details, $ip]);
    } catch (Exception $e) {
        // Silently continue if audit log fails
    }
}
