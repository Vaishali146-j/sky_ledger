<?php
/**
 * SkyLedger – Auth Endpoint (Login, Register, Profile)
 */
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $input = getJsonInput();
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (empty($email) || empty($password)) {
        sendResponse(['success' => false, 'error' => 'Email and password are required'], 400);
    }

    $stmt = $pdo->prepare("SELECT user_id, full_name, email, password_hash, role FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        // Special demo fallback: allow demo passwords if not hashed with local salt
        if (($email === 'admin@demo.com' && $password === 'admin123') ||
            ($email === 'user@demo.com' && $password === 'user123')) {
            // Demo credentials matched directly
        } else {
            sendResponse(['success' => false, 'error' => 'Invalid email or password'], 401);
        }
    }

    // Build JWT-like demo token
    $tokenPayload = [
        'user_id'   => $user['user_id'],
        'email'     => $user['email'],
        'role'      => $user['role'],
        'exp'       => time() + (86400 * 7),
    ];
    $token = base64_encode(json_encode($tokenPayload));

    sendResponse([
        'success' => true,
        'token'   => $token,
        'user'    => [
            'user_id'   => $user['user_id'],
            'full_name' => $user['full_name'],
            'email'     => $user['email'],
            'role'      => $user['role'],
        ]
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'register') {
    $input = getJsonInput();
    $fullName = trim($input['full_name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $password = $input['password'] ?? '';

    if (empty($fullName) || empty($email) || empty($password)) {
        sendResponse(['success' => false, 'error' => 'Full name, email and password are required'], 400);
    }

    // Check duplicate email
    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        sendResponse(['success' => false, 'error' => 'Email is already registered'], 409);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'passenger')");
    $stmt->execute([$fullName, $email, $phone, $passwordHash]);
    $userId = (int)$pdo->lastInsertId();

    $tokenPayload = [
        'user_id'   => $userId,
        'email'     => $email,
        'role'      => 'passenger',
        'exp'       => time() + (86400 * 7),
    ];
    $token = base64_encode(json_encode($tokenPayload));

    sendResponse([
        'success' => true,
        'token'   => $token,
        'user'    => [
            'user_id'   => $userId,
            'full_name' => $fullName,
            'email'     => $email,
            'role'      => 'passenger',
        ]
    ], 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'me') {
    $user = getAuthenticatedUser($pdo);
    if (!$user) {
        sendResponse(['success' => false, 'error' => 'Unauthorized'], 401);
    }
    sendResponse(['success' => true, 'user' => $user]);
}

sendResponse(['success' => false, 'error' => 'Invalid action or method'], 404);
