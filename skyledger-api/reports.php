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
    ],
    'route_leaderboard' => [
        'title'       => 'Route Delay Leaderboard & Ranking',
        'concept'     => 'Window Function: DENSE_RANK() OVER (ORDER BY Avg Delay DESC)',
        'description' => 'Ranks all origin-destination routes by average delay severity with on-time and delay percentages.',
        'sql'         => "
            SELECT 
                CONCAT(f.origin_airport_id, ' -> ', f.destination_airport_id) AS route,
                f.origin_airport_id,
                f.destination_airport_id,
                dest.city AS destination_city,
                COUNT(f.flight_id) AS total_flights,
                SUM(CASE WHEN f.status = 'Delayed' THEN 1 ELSE 0 END) AS delayed_flights,
                ROUND((SUM(CASE WHEN f.status = 'Delayed' THEN 1 ELSE 0 END) * 100.0) / COUNT(f.flight_id), 1) AS delay_percentage,
                COALESCE(ROUND(AVG(dl.delay_duration_minutes), 1), 0.0) AS avg_delay_minutes,
                DENSE_RANK() OVER (ORDER BY COALESCE(AVG(dl.delay_duration_minutes), 0) DESC) AS delay_rank
            FROM flights f
            JOIN airports dest ON f.destination_airport_id = dest.airport_id
            LEFT JOIN delay_ledger dl ON f.flight_id = dl.flight_id
            GROUP BY f.origin_airport_id, f.destination_airport_id, dest.city
            ORDER BY delay_rank ASC
            LIMIT 50;
        "
    ],
    'aircraft_utilization' => [
        'title'       => 'Fleet Aircraft Utilization & Airworthiness',
        'concept'     => 'Conditional Aggregates & DATEDIFF Airworthiness Status',
        'description' => 'Evaluates flight hours and flags maintenance overdue (>180 days) or approaching (>120 days).',
        'sql'         => "
            SELECT 
                a.tail_number,
                a.model,
                a.capacity,
                a.last_maintenance_date,
                DATEDIFF('2013-12-31', a.last_maintenance_date) AS days_since_maintenance,
                COUNT(f.flight_id) AS total_flights,
                COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, f.scheduled_departure, f.scheduled_arrival) / 60.0), 1), 0.0) AS total_flight_hours,
                CASE 
                    WHEN DATEDIFF('2013-12-31', a.last_maintenance_date) > 180 THEN 'Overdue'
                    WHEN DATEDIFF('2013-12-31', a.last_maintenance_date) > 120 THEN 'Upcoming'
                    ELSE 'Airworthy'
                END AS maintenance_status
            FROM aircraft a
            LEFT JOIN flights f ON a.tail_number = f.assigned_aircraft_id
            GROUP BY a.tail_number, a.model, a.capacity, a.last_maintenance_date
            ORDER BY total_flight_hours DESC
            LIMIT 100;
        "
    ],
    'window_monthly' => [
        'title'       => 'Monthly Cumulative Delay Trend',
        'concept'     => 'Window Function: SUM() OVER (ORDER BY Month) Running Total',
        'description' => 'Calculates monthly total delay minutes and continuous year-to-date cumulative delay progression.',
        'sql'         => "
            WITH MonthlyDelays AS (
                SELECT 
                    MONTH(f.scheduled_departure) AS month_num,
                    DATE_FORMAT(f.scheduled_departure, '%M') AS month_name,
                    COUNT(dl.log_id) AS incident_count,
                    COALESCE(SUM(dl.delay_duration_minutes), 0) AS monthly_delay_mins
                FROM flights f
                JOIN delay_ledger dl ON f.flight_id = dl.flight_id
                GROUP BY MONTH(f.scheduled_departure), DATE_FORMAT(f.scheduled_departure, '%M')
            )
            SELECT 
                month_num,
                month_name,
                incident_count,
                monthly_delay_mins,
                SUM(monthly_delay_mins) OVER (ORDER BY month_num) AS cumulative_delay_mins,
                ROUND(AVG(monthly_delay_mins) OVER (ORDER BY month_num ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS moving_avg_3m
            FROM MonthlyDelays
            ORDER BY month_num ASC;
        "
    ],
    'window_daily' => [
        'title'       => 'Daily Flight Frequency & 7-Day Centered Moving Average',
        'concept'     => 'Window Function: AVG() OVER (ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING)',
        'description' => 'Smooths seasonal daily flight fluctuations using a centered 7-day moving average frame.',
        'sql'         => "
            WITH DailyCounts AS (
                SELECT 
                    DATE(scheduled_departure) AS flight_date,
                    COUNT(flight_id) AS daily_flights
                FROM flights
                WHERE scheduled_departure >= '2013-01-01' AND scheduled_departure <= '2013-01-31'
                GROUP BY DATE(scheduled_departure)
            )
            SELECT 
                flight_date,
                daily_flights,
                ROUND(AVG(daily_flights) OVER (ORDER BY flight_date ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING), 1) AS moving_avg_7day
            FROM DailyCounts
            ORDER BY flight_date ASC;
        "
    ],
    'window_airport' => [
        'title'       => 'NYC Hub Running Total Departures',
        'concept'     => 'Window Function: SUM() OVER (PARTITION BY Hub ORDER BY Month)',
        'description' => 'Tracks month-by-month departure volume and running totals partitioned separately by origin hub (JFK, LGA, EWR).',
        'sql'         => "
            WITH HubMonthly AS (
                SELECT 
                    origin_airport_id,
                    MONTH(scheduled_departure) AS month_num,
                    COUNT(flight_id) AS departures
                FROM flights
                GROUP BY origin_airport_id, MONTH(scheduled_departure)
            )
            SELECT 
                origin_airport_id,
                month_num,
                departures,
                SUM(departures) OVER (PARTITION BY origin_airport_id ORDER BY month_num) AS hub_running_total
            FROM HubMonthly
            ORDER BY origin_airport_id, month_num ASC;
        "
    ],
    'window_crew' => [
        'title'       => 'Crew Percentile Rank by Total Duty Hours',
        'concept'     => 'Window Function: PERCENT_RANK() OVER (ORDER BY Duty Hours DESC)',
        'description' => 'Computes the relative percentile rank for each crew member based on accumulated duty hours.',
        'sql'         => "
            WITH CrewHours AS (
                SELECT 
                    cm.crew_id,
                    cm.full_name,
                    cm.role,
                    cm.base_airport_id,
                    COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, ca.duty_start_time, ca.duty_end_time) / 60.0), 1), 0.0) AS total_duty_hours
                FROM crew_members cm
                LEFT JOIN crew_assignments ca ON cm.crew_id = ca.crew_id
                GROUP BY cm.crew_id, cm.full_name, cm.role, cm.base_airport_id
            )
            SELECT 
                crew_id,
                full_name,
                role,
                base_airport_id,
                total_duty_hours,
                ROUND(PERCENT_RANK() OVER (ORDER BY total_duty_hours DESC) * 100, 1) AS duty_percentile_rank
            FROM CrewHours
            ORDER BY total_duty_hours DESC
            LIMIT 50;
        "
    ]
];

$reportKey = $_GET['report_key'] ?? $_GET['action'] ?? '';

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
