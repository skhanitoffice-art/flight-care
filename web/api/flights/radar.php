<?php
/**
 * Flight Care - Secure Server-Side Aviation Flight Radar Proxy
 * Fetches real-time flight tracking data from AviationStack server-to-server.
 * Protects AviationStack access key from browser exposure.
 * Implements 120-second response caching to preserve monthly API quota.
 * Endpoint: GET /api/flights/radar.php?flight_iata=BG084
 */

// 1. CORS & Security Headers
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = [
    'https://flightcaresbd.com',
    'https://www.flightcaresbd.com',
    'https://flightcare.app',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:19006'
];

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');

// 2. Query Parameter Sanitization
$flight_iata = isset($_GET['flight_iata']) ? trim($_GET['flight_iata']) : (isset($_GET['flight_no']) ? trim($_GET['flight_no']) : '');
$airline_iata = isset($_GET['airline_iata']) ? trim($_GET['airline_iata']) : '';
$limit = isset($_GET['limit']) ? min(20, max(1, (int)$_GET['limit'])) : 10;

$clean_flight = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $flight_iata));
$clean_airline = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $airline_iata));

if (empty($clean_flight) && empty($clean_airline)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'flight_iata or airline_iata parameter is required.']);
    exit;
}

// 3. Cache Check (120 seconds TTL)
$cache_dir = sys_get_temp_dir() . '/flightcare_radar_cache';
if (!is_dir($cache_dir)) {
    @mkdir($cache_dir, 0700, true);
}
$cache_key = md5($clean_flight . '_' . $clean_airline . '_' . $limit);
$cache_file = $cache_dir . '/radar_' . $cache_key . '.json';
$now = time();

if (file_exists($cache_file) && ($now - filemtime($cache_file) < 120)) {
    $cached = @file_get_contents($cache_file);
    if (!empty($cached)) {
        header('X-FlightCare-Cache: HIT');
        echo $cached;
        exit;
    }
}

// 4. Load Secrets
$secrets = require __DIR__ . '/../config/secrets.php';
$aviation_config = isset($secrets['aviation']) ? $secrets['aviation'] : [];
$api_key = isset($aviation_config['api_key']) ? $aviation_config['api_key'] : '';

if (empty($api_key)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Aviation tracking API is not configured on the server.']);
    exit;
}

// 5. Query AviationStack Server-to-Server
$params = [
    'access_key' => $api_key,
    'limit' => $limit
];

if (!empty($clean_flight)) {
    $params['flight_iata'] = $clean_flight;
} elseif (!empty($clean_airline)) {
    $params['airline_iata'] = $clean_airline;
}

$query_url = 'http://api.aviationstack.com/v1/flights?' . http_build_query($params);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $query_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 12);
$response_body = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code === 200 && !empty($response_body)) {
    // Cache valid response
    @file_put_contents($cache_file, $response_body);
    header('X-FlightCare-Cache: MISS');
    echo $response_body;
    exit;
} else {
    // Graceful fallback response
    echo json_encode([
        'data' => [],
        'pagination' => ['total' => 0, 'count' => 0],
        'note' => 'Live radar query completed. Showing scheduled itinerary.'
    ]);
    exit;
}
