<?php
/**
 * SkyLedger – Bookings & Manifest Endpoint
 * Handles transactions, double-booking prevention, PNR generation, cancellation refunds, and flight manifests.
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Helper: Generate Unique 6-character PNR (e.g. SK8492)
function generateUniquePNR(PDO $pdo): string {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $maxTries = 10;
    while ($maxTries-- > 0) {
        $pnr = 'SK' . substr(str_shuffle($chars), 0, 4);
        $stmt = $pdo->prepare("SELECT booking_id FROM bookings WHERE pnr = ?");
        $stmt->execute([$pnr]);
        if (!$stmt->fetch()) {
            return $pnr;
        }
    }
    return 'SK' . rand(1000, 9999);
}

// POST: Create Booking with strict Transaction & Seat Conflict Prevention
if ($method === 'POST' && empty($action)) {
    $user = getAuthenticatedUser($pdo);
    $userId = $user ? $user['user_id'] : null;

    $input = getJsonInput();
    $flightId = (int)($input['flight_id'] ?? 0);
    $travelClass = $input['travel_class'] ?? 'Economy';
    $totalFare = (float)($input['total_fare'] ?? 0.0);
    $passengers = $input['passengers'] ?? [];

    if (!$flightId || empty($passengers) || $totalFare <= 0) {
        sendResponse(['success' => false, 'error' => 'Flight ID, valid passengers list, and total fare are required'], 400);
    }

    // Extract requested seat numbers
    $requestedSeats = [];
    foreach ($passengers as $p) {
        $seat = trim($p['seat_no'] ?? '');
        if (empty($seat)) {
            sendResponse(['success' => false, 'error' => 'Every passenger must have an assigned seat'], 400);
        }
        if (in_array($seat, $requestedSeats)) {
            sendResponse(['success' => false, 'error' => "Duplicate seat $seat selected in the same booking"], 400);
        }
        $requestedSeats[] = $seat;
    }

    // BEGIN TRANSACTION FOR DOUBLE-BOOKING PREVENTION
    $pdo->beginTransaction();
    try {
        // Lock existing confirmed bookings for this flight to prevent race conditions
        $placeholders = implode(',', array_fill(0, count($requestedSeats), '?'));
        $checkSql = "
            SELECT p.seat_no 
            FROM passengers p
            JOIN bookings b ON p.booking_id = b.booking_id
            WHERE b.flight_id = ? 
              AND b.booking_status = 'Confirmed'
              AND p.seat_no IN ($placeholders)
            FOR UPDATE
        ";

        $checkStmt = $pdo->prepare($checkSql);
        $bindValues = array_merge([$flightId], $requestedSeats);
        $checkStmt->execute($bindValues);
        $conflicts = $checkStmt->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($conflicts)) {
            $pdo->rollBack();
            $conflictList = implode(', ', $conflicts);
            sendResponse([
                'success' => false,
                'error'   => "DOUBLE-BOOKING PREVENTED: Seat(s) $conflictList have already been reserved by another passenger."
            ], 409);
        }

        // Verify flight capacity has not been exceeded
        $capStmt = $pdo->prepare("
            SELECT COALESCE(ac.capacity, 150) AS capacity,
                   (SELECT COUNT(p.passenger_id) 
                    FROM passengers p 
                    JOIN bookings b ON p.booking_id = b.booking_id 
                    WHERE b.flight_id = f.flight_id AND b.booking_status = 'Confirmed') AS booked_count
            FROM flights f
            LEFT JOIN aircraft ac ON f.assigned_aircraft_id = ac.tail_number
            WHERE f.flight_id = ?
        ");
        $capStmt->execute([$flightId]);
        $capData = $capStmt->fetch();

        if ($capData && ($capData['booked_count'] + count($passengers) > $capData['capacity'])) {
            $pdo->rollBack();
            sendResponse(['success' => false, 'error' => 'This flight is sold out or has insufficient seats remaining.'], 409);
        }

        // Generate Unique PNR
        $pnr = generateUniquePNR($pdo);

        // Insert Booking record
        $insBooking = $pdo->prepare("
            INSERT INTO bookings (pnr, user_id, flight_id, travel_class, total_fare, booking_status)
            VALUES (?, ?, ?, ?, ?, 'Confirmed')
        ");
        $insBooking->execute([$pnr, $userId, $flightId, $travelClass, $totalFare]);
        $bookingId = (int)$pdo->lastInsertId();

        // Insert Passengers
        $insPassenger = $pdo->prepare("
            INSERT INTO passengers (booking_id, full_name, age, gender, seat_no)
            VALUES (?, ?, ?, ?, ?)
        ");

        foreach ($passengers as $p) {
            $insPassenger->execute([
                $bookingId,
                trim($p['full_name']),
                (int)$p['age'],
                $p['gender'],
                trim($p['seat_no'])
            ]);
        }

        $pdo->commit();
        logActivity($pdo, 'CREATE_BOOKING', $user['email'] ?? 'guest', "Booking created PNR: $pnr for flight ID: $flightId");

        sendResponse([
            'success'    => true,
            'pnr'        => $pnr,
            'booking_id' => $bookingId,
            'message'    => 'Booking confirmed successfully'
        ], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendResponse(['success' => false, 'error' => 'Booking failed: ' . $e->getMessage()], 500);
    }
}

// GET: Lookup by PNR
if ($method === 'GET' && $action === 'pnr') {
    $pnr = strtoupper(trim($_GET['pnr'] ?? ''));
    if (empty($pnr)) {
        sendResponse(['success' => false, 'error' => 'PNR is required'], 400);
    }

    $stmt = $pdo->prepare("
        SELECT b.*,
               f.flight_number, f.scheduled_departure, f.scheduled_arrival, f.status AS flight_status,
               orig.airport_name AS origin_name, orig.city AS origin_city, orig.airport_id AS origin_airport_id,
               dest.airport_name AS destination_name, dest.city AS destination_city, dest.airport_id AS destination_airport_id,
               ac.model AS aircraft_model,
               dl.delay_duration_minutes, dl.reason_code AS delay_reason
        FROM bookings b
        JOIN flights f ON b.flight_id = f.flight_id
        JOIN airports orig ON f.origin_airport_id = orig.airport_id
        JOIN airports dest ON f.destination_airport_id = dest.airport_id
        LEFT JOIN aircraft ac ON f.assigned_aircraft_id = ac.tail_number
        LEFT JOIN delay_ledger dl ON f.flight_id = dl.flight_id
        WHERE b.pnr = ?
    ");
    $stmt->execute([$pnr]);
    $booking = $stmt->fetch();

    if (!$booking) {
        sendResponse(['success' => false, 'error' => 'No booking found with this PNR'], 404);
    }

    // Get passengers
    $pStmt = $pdo->prepare("SELECT * FROM passengers WHERE booking_id = ? ORDER BY seat_no ASC");
    $pStmt->execute([$booking['booking_id']]);
    $booking['passengers'] = $pStmt->fetchAll();

    sendResponse(['success' => true, 'data' => $booking]);
}

// GET: User Bookings / All bookings (Admin)
if ($method === 'GET' && empty($action)) {
    $user = getAuthenticatedUser($pdo);
    $isAdmin = $user && $user['role'] === 'admin';
    $pnrFilter = $_GET['pnr'] ?? null;

    $where = ['1=1'];
    $params = [];

    if (!$isAdmin) {
        if (!$user) {
            sendResponse(['success' => false, 'error' => 'Authentication required'], 401);
        }
        $where[] = 'b.user_id = ?';
        $params[] = $user['user_id'];
    }

    if ($pnrFilter) {
        $where[] = 'b.pnr LIKE ?';
        $params[] = "%$pnrFilter%";
    }

    $whereSql = implode(' AND ', $where);

    $sql = "
        SELECT b.*,
               f.flight_number, f.scheduled_departure, f.scheduled_arrival, f.status AS flight_status,
               orig.city AS origin_city, dest.city AS destination_city,
               COUNT(p.passenger_id) AS passenger_count
        FROM bookings b
        JOIN flights f ON b.flight_id = f.flight_id
        JOIN airports orig ON f.origin_airport_id = orig.airport_id
        JOIN airports dest ON f.destination_airport_id = dest.airport_id
        LEFT JOIN passengers p ON b.booking_id = p.booking_id
        WHERE $whereSql
        GROUP BY b.booking_id
        ORDER BY b.booked_at DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $bookings = $stmt->fetchAll();

    sendResponse(['success' => true, 'data' => $bookings]);
}

// GET: Passenger Manifest for a Flight (Admin only)
if ($method === 'GET' && $action === 'manifest') {
    requireAdmin($pdo);
    $flightId = (int)($_GET['flight_id'] ?? 0);

    if (!$flightId) {
        sendResponse(['success' => false, 'error' => 'flight_id is required'], 400);
    }

    // Flight info
    $fStmt = $pdo->prepare("
        SELECT f.*, 
               orig.airport_name AS origin_name, orig.city AS origin_city,
               dest.airport_name AS destination_name, dest.city AS destination_city,
               ac.model AS aircraft_model, ac.capacity
        FROM flights f
        JOIN airports orig ON f.origin_airport_id = orig.airport_id
        JOIN airports dest ON f.destination_airport_id = dest.airport_id
        LEFT JOIN aircraft ac ON f.assigned_aircraft_id = ac.tail_number
        WHERE f.flight_id = ?
    ");
    $fStmt->execute([$flightId]);
    $flight = $fStmt->fetch();

    if (!$flight) {
        sendResponse(['success' => false, 'error' => 'Flight not found'], 404);
    }

    // Manifest passengers
    $pStmt = $pdo->prepare("
        SELECT p.passenger_id, p.full_name, p.age, p.gender, p.seat_no,
               b.pnr, b.travel_class, b.booking_status
        FROM passengers p
        JOIN bookings b ON p.booking_id = b.booking_id
        WHERE b.flight_id = ? AND b.booking_status = 'Confirmed'
        ORDER BY p.seat_no ASC
    ");
    $pStmt->execute([$flightId]);
    $manifest = $pStmt->fetchAll();

    sendResponse([
        'success'  => true,
        'flight'   => $flight,
        'manifest' => $manifest,
    ]);
}

// POST: Cancel Booking with Refund Policy
if ($method === 'POST' && $action === 'cancel') {
    $user = getAuthenticatedUser($pdo);
    $input = getJsonInput();
    $pnr = strtoupper(trim($input['pnr'] ?? ''));

    if (empty($pnr)) {
        sendResponse(['success' => false, 'error' => 'PNR is required'], 400);
    }

    $stmt = $pdo->prepare("
        SELECT b.*, f.scheduled_departure 
        FROM bookings b
        JOIN flights f ON b.flight_id = f.flight_id
        WHERE b.pnr = ?
    ");
    $stmt->execute([$pnr]);
    $booking = $stmt->fetch();

    if (!$booking) {
        sendResponse(['success' => false, 'error' => 'Booking not found'], 404);
    }

    if ($booking['booking_status'] === 'Cancelled') {
        sendResponse(['success' => false, 'error' => 'Booking is already cancelled'], 400);
    }

    // Refund policy calculation relative to demo reference date (2013-01-01 00:00:00 or current time)
    // If > 24 hours before departure: 100% refund
    // If <= 24 hours but before departure: 50% refund
    // If departed: 0% refund
    $now = strtotime('2013-01-01 00:00:00'); // Demo epoch
    $departureTime = strtotime($booking['scheduled_departure']);
    $diffHours = ($departureTime - $now) / 3600;

    $refundPercent = 0;
    if ($diffHours > 24) {
        $refundPercent = 100;
    } elseif ($diffHours > 0) {
        $refundPercent = 50;
    } else {
        $refundPercent = 0;
    }

    $refundAmount = round(($booking['total_fare'] * $refundPercent) / 100, 2);

    $pdo->beginTransaction();
    try {
        $uStmt = $pdo->prepare("UPDATE bookings SET booking_status = 'Cancelled' WHERE booking_id = ?");
        $uStmt->execute([$booking['booking_id']]);

        $pdo->commit();
        logActivity($pdo, 'CANCEL_BOOKING', $user['email'] ?? 'guest', "Cancelled PNR $pnr, Refund: $$refundAmount ($refundPercent%)");

        sendResponse([
            'success'         => true,
            'message'         => 'Booking cancelled successfully. Seats have been released.',
            'pnr'             => $pnr,
            'refund_percent'  => $refundPercent,
            'refund_amount'   => $refundAmount,
            'total_fare'      => (float)$booking['total_fare']
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendResponse(['success' => false, 'error' => 'Cancellation failed: ' . $e->getMessage()], 500);
    }
}

sendResponse(['success' => false, 'error' => 'Method or action not allowed'], 405);
