<?php
/**
 * SkyLedger – Advanced DBMS Reports & SQL Showcase Endpoint
 * Demonstrates complex relational queries: JOINs, GROUP BY, HAVING, subqueries,
 * LEFT JOINs, window functions, and aggregates with CASE.
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$reportKey = $_GET['report_key'] ?? '';

// Pre-defined complex queries for academic DBMS evaluation
$reports = [
    'delay_bottlenecks' => [
        'title'       => 'Delay Bottlenecks by Reason & Origin Hub',
        'concept'     => 'GROUP BY with HAVING & Multiple Aggregates',
        'description' => 'Aggregates delay incidents across NYC hubs, filtering only categories with significant impact.',
        'sql'         => "
            SELECT 
                f.origin_airport_id AS origin_hub,
                dl.reason_code,
                COUNT(dl.log_id) AS incident_count,
                ROUND(AVG(dl.delay_duration_minutes), 1) AS avg_delay_mins,
                MAX(dl.delay_duration_minutes) AS max_delay_mins,
                SUM(dl.delay_duration_minutes) AS total_lost_mins
            FROM delay_ledger dl
            JOIN flights f ON dl.flight_id = f.flight_id
            GROUP BY f.origin_airport_id, dl.reason_code
            HAVING incident_count >= 1
            ORDER BY total_lost_mins DESC;
        "
    ],
    'unutilized_aircraft' => [
        'title'       => 'Aircraft Never Flown / Low Fleet Utilization',
        'concept'     => 'LEFT OUTER JOIN with IS NULL Filter',
        'description' => 'Identifies aircraft in the fleet that have zero assigned flights in the dataset.',
        'sql'         => "
            SELECT 
                a.tail_number,
                a.model,
                a.capacity,
                a.last_maintenance_date,
                COUNT(f.flight_id) AS flight_count
            FROM aircraft a
            LEFT JOIN flights f ON a.tail_number = f.assigned_aircraft_id
            GROUP BY a.tail_number, a.model, a.capacity, a.last_maintenance_date
            HAVING flight_count = 0
            ORDER BY a.last_maintenance_date ASC;
        "
    ],
    'busiest_crew_window' => [
        'title'       => 'Crew Duty Leaderboard & Ranking',
        'concept'     => 'Window Function (DENSE_RANK() OVER Partition/Order)',
        'description' => 'Ranks crew members within their respective role based on completed duty flight hours.',
        'sql'         => "
            SELECT 
                cm.full_name,
                cm.role,
                cm.base_airport_id,
                COUNT(ca.assignment_id) AS duty_shifts,
                COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, ca.duty_start_time, ca.duty_end_time) / 60.0), 1), 0.0) AS total_duty_hours,
                DENSE_RANK() OVER (PARTITION BY cm.role ORDER BY COALESCE(SUM(TIMESTAMPDIFF(MINUTE, ca.duty_start_time, ca.duty_end_time)), 0) DESC) AS role_rank
            FROM crew_members cm
            LEFT JOIN crew_assignments ca ON cm.crew_id = ca.crew_id
            GROUP BY cm.crew_id, cm.full_name, cm.role, cm.base_airport_id
            ORDER BY cm.role, role_rank ASC
            LIMIT 50;
        "
    ],
    'route_performance' => [
        'title'       => 'Route On-Time Performance & Reliability',
        'concept'     => 'Conditional Aggregation with CASE WHEN',
        'description' => 'Computes exact on-time, delayed, and cancellation percentages across all distinct city pairs.',
        'sql'         => "
            SELECT 
                f.origin_airport_id,
                f.destination_airport_id,
                dest.city AS destination_city,
                COUNT(f.flight_id) AS total_scheduled,
                SUM(CASE WHEN f.status = 'On-Time' THEN 1 ELSE 0 END) AS on_time_count,
                SUM(CASE WHEN f.status = 'Delayed' THEN 1 ELSE 0 END) AS delayed_count,
                SUM(CASE WHEN f.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_count,
                ROUND((SUM(CASE WHEN f.status = 'On-Time' THEN 1 ELSE 0 END) * 100.0) / COUNT(f.flight_id), 1) AS on_time_percentage
            FROM flights f
            JOIN airports dest ON f.destination_airport_id = dest.airport_id
            GROUP BY f.origin_airport_id, f.destination_airport_id, dest.city
            ORDER BY total_scheduled DESC, on_time_percentage DESC;
        "
    ],
    'peak_risk_hours' => [
        'title'       => 'High-Risk Departure Windows by Hour of Day',
        'concept'     => 'Date/Time Extraction & Aggregate Analysis',
        'description' => 'Analyzes which times of day experience the highest frequency and severity of delays.',
        'sql'         => "
            SELECT 
                HOUR(f.scheduled_departure) AS departure_hour,
                COUNT(f.flight_id) AS scheduled_flights,
                SUM(CASE WHEN f.status = 'Delayed' THEN 1 ELSE 0 END) AS delayed_flights,
                ROUND((SUM(CASE WHEN f.status = 'Delayed' THEN 1 ELSE 0 END) * 100.0) / COUNT(f.flight_id), 1) AS delay_risk_pct,
                COALESCE(ROUND(AVG(dl.delay_duration_minutes), 1), 0.0) AS avg_delay_mins
            FROM flights f
            LEFT JOIN delay_ledger dl ON f.flight_id = dl.flight_id
            GROUP BY HOUR(f.scheduled_departure)
            ORDER BY departure_hour ASC;
        "
    ],
    'revenue_by_class' => [
        'title'       => 'Revenue & Yield by Travel Class & Route',
        'concept'     => '3-Table Multi-Join with Currency Aggregation',
        'description' => 'Summarizes passenger bookings, ticket sales revenue, and average ticket yield.',
        'sql'         => "
            SELECT 
                b.travel_class,
                CONCAT(f.origin_airport_id, ' -> ', f.destination_airport_id) AS route,
                COUNT(b.booking_id) AS total_bookings,
                COUNT(p.passenger_id) AS total_passengers,
                SUM(b.total_fare) AS gross_revenue,
                ROUND(AVG(b.total_fare), 2) AS avg_ticket_price
            FROM bookings b
            JOIN flights f ON b.flight_id = f.flight_id
            LEFT JOIN passengers p ON b.booking_id = p.booking_id
            WHERE b.booking_status = 'Confirmed'
            GROUP BY b.travel_class, f.origin_airport_id, f.destination_airport_id
            ORDER BY gross_revenue DESC;
        "
    ]
];

if ($method === 'GET') {
    if (!empty($reportKey)) {
        if (!isset($reports[$reportKey])) {
            sendResponse(['success' => false, 'error' => "Report '$reportKey' not found"], 404);
        }

        $rep = $reports[$reportKey];
        $startTime = microtime(true);

        try {
            $stmt = $pdo->query($rep['sql']);
            $rows = $stmt->fetchAll();
            $executionMs = round((microtime(true) - $startTime) * 1000, 2);

            sendResponse([
                'success'        => true,
                'key'            => $reportKey,
                'title'          => $rep['title'],
                'concept'        => $rep['concept'],
                'description'    => $rep['description'],
                'sql'            => trim($rep['sql']),
                'execution_ms'   => $executionMs,
                'row_count'      => count($rows),
                'data'           => $rows,
            ]);
        } catch (Exception $e) {
            sendResponse([
                'success' => false,
                'error'   => 'Report execution failed: ' . $e->getMessage()
            ], 500);
        }
    }

    // Return list of available reports
    $list = [];
    foreach ($reports as $k => $v) {
        $list[] = [
            'key'         => $k,
            'title'       => $v['title'],
            'concept'     => $v['concept'],
            'description' => $v['description'],
            'sql'         => trim($v['sql']),
        ];
    }
    sendResponse(['success' => true, 'reports' => $list]);
}

sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
