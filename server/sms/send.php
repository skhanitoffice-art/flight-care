<?php
/**
 * Flight Care - Secure Server-Side SMS & OTP Dispatcher Proxy
 * Dispatches live SMS via Greenweb BD server-to-server.
 * Protects Greenweb API Token from client exposure.
 * Implements IP-based Rate Limiting & Bangaldesh Phone Format Sanitization.
 * Endpoint: POST /api/sms/send.php
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
    header("Access-Control-Allow-Methods: POST, OPTIONS");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed. Use POST.']);
    exit;
}

// 2. IP Rate Limiting (Max 6 SMS per minute per IP)
function fc_sms_get_client_ip() {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) return $_SERVER['HTTP_CF_CONNECTING_IP'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
}

$client_ip = fc_sms_get_client_ip();
$rl_dir = sys_get_temp_dir() . '/flightcare_sms_rl';
if (!is_dir($rl_dir)) {
    @mkdir($rl_dir, 0700, true);
}
$rl_file = $rl_dir . '/sms_' . md5($client_ip) . '.json';
$now = time();
$attempts = [];

if (file_exists($rl_file)) {
    $raw = @file_get_contents($rl_file);
    $parsed = json_decode($raw, true);
    if (is_array($parsed)) {
        foreach ($parsed as $t) {
            if (($now - $t) < 60) { // 1 minute window
                $attempts[] = $t;
            }
        }
    }
}

if (count($attempts) >= 6) {
    http_response_code(429);
    header('Retry-After: 60');
    echo json_encode([
        'ok' => false,
        'error' => 'Too many SMS requests. Please wait a minute before requesting another SMS/OTP.',
        'retryAfter' => 60
    ]);
    exit;
}

// 3. Input Validation & Phone Sanitization
$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true) ?: $_POST;

$to = isset($data['to']) ? trim($data['to']) : '';
$message = isset($data['message']) ? trim($data['message']) : '';

if (empty($to) || empty($message)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Phone number and message are required.']);
    exit;
}

// Normalize BD Phone Number: 8801XXXXXXXXX
$clean_phone = preg_replace('/[^0-9]/', '', $to);
if (strpos($clean_phone, '880') !== 0) {
    if (strpos($clean_phone, '01') === 0) {
        $clean_phone = '88' . $clean_phone;
    } elseif (strlen($clean_phone) === 10 && strpos($clean_phone, '1') === 0) {
        $clean_phone = '880' . $clean_phone;
    }
}

if (strlen($clean_phone) !== 13 || strpos($clean_phone, '8801') !== 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid Bangladeshi phone number. Must be 11 digits (01XXXXXXXXX).']);
    exit;
}

// 4. Load Secrets Server-Side
$secrets = require __DIR__ . '/../config/secrets.php';
$sms_config = isset($secrets['sms']) ? $secrets['sms'] : [];
$token = isset($sms_config['api_key']) ? $sms_config['api_key'] : '';

if (empty($token)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'SMS Gateway is not configured on the server.']);
    exit;
}

// 5. Dispatch via Greenweb BD API Server-to-Server
$gw_url = 'https://api.greenweb.com.bd/api.php?token=' . urlencode($token) 
        . '&to=' . urlencode($clean_phone) 
        . '&message=' . urlencode($message);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $gw_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$response_body = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_err = curl_error($ch);
curl_close($ch);

if ($curl_err) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Gateway connection failure: ' . $curl_err]);
    exit;
}

// Success check based on Greenweb response patterns
$resp_lower = strtolower((string)$response_body);
$is_success = strpos($resp_lower, 'ok') !== false ||
              strpos($resp_lower, 'success') !== false ||
              strpos($resp_lower, 'sent') !== false ||
              strpos($resp_lower, '100') !== false;

// Record successful request for rate limiting
$attempts[] = $now;
@file_put_contents($rl_file, json_encode($attempts));

echo json_encode([
    'ok' => $is_success,
    'delivered' => $is_success,
    'provider' => 'Greenweb BD Telecom',
    'phone' => substr($clean_phone, 0, 6) . '*****' . substr($clean_phone, -2), // Masked for privacy
    'gateway_code' => $http_code
]);
exit;

