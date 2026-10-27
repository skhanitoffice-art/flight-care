<?php
/**
 * Flight Care - Secure Server-Side Payment Gateway Configuration
 * Stores sensitive merchant credentials strictly on the server.
 * Direct HTTP access blocked by .htaccess.
 */

// Prevent direct script access if not included
if (basename($_SERVER['PHP_SELF']) == 'config.php') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'Direct access forbidden']);
    exit;
}

// Allowed CORS Origin
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = [
    'https://flightcaresbd.com',
    'https://www.flightcaresbd.com',
    'https://flightcare.app',
    'http://localhost:8081',
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

// Load local secret configuration if present on server (ignored from Git)
$localConfig = __DIR__ . '/config.local.php';
if (file_exists($localConfig)) {
    require_once $localConfig;
}

// SSLCOMMERZ PRODUCTION LIVE CREDENTIALS
// Stored securely on the server side - never transmitted to client browsers or exposed in git
define('FC_STORE_ID', getenv('EXPO_PUBLIC_PAYMENT_STORE_ID') ?: 'flightcaresbd0live');
define('FC_STORE_PASSWD', getenv('EXPO_PUBLIC_PAYMENT_STORE_PASS') ?: (defined('FC_LOCAL_STORE_PASSWD') ? FC_LOCAL_STORE_PASSWD : ''));
define('FC_IS_SANDBOX', false);

define('FC_INITIATE_URL', FC_IS_SANDBOX 
    ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php' 
    : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php');

define('FC_VALIDATE_URL', FC_IS_SANDBOX 
    ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php' 
    : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php');

define('FC_APP_BASE_URL', 'https://flightcaresbd.com');

