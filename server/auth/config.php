<?php
/**
 * Flight Care - Secure Server-Side Auth Configuration
 * Direct HTTP access blocked by .htaccess.
 */

if (basename($_SERVER['PHP_SELF']) == 'config.php' || basename($_SERVER['PHP_SELF']) == 'credentials.php') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'Direct access forbidden']);
    exit;
}

// Allowed CORS Origins
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = [
    'https://flightcaresbd.com',
    'https://www.flightcaresbd.com',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:19006'
];

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

define('FC_AUTH_SECRET_KEY', getenv('FC_AUTH_SECRET_KEY') ?: 'FC_SECURE_AUTH_KEY_2026_HSIA_PROTOCOL_SIGNING');
