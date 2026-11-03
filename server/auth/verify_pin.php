<?php
/**
 * Flight Care - Secure Server-Side Staff & Manager Authentication Endpoint
 * Verifies PIN and passwords server-to-server.
 * Implements:
 * 1. Server-Side Hashing & Verification (Zero Client-Side Hash Exposure)
 * 2. Brute-Force Rate Limiting (Max 5 attempts per 5 minutes per IP/Account)
 * 3. Cryptographically Signed Session Token Generation
 * Endpoint: POST /api/auth/verify_pin.php
 */

require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed. Use POST.']);
    exit;
}

// 1. IP & Rate Limiting Check
function fc_auth_get_client_ip() {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        return $_SERVER['HTTP_CF_CONNECTING_IP'];
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
}

$client_ip = fc_auth_get_client_ip();
$rl_dir = sys_get_temp_dir() . '/flightcare_auth_rl';
if (!is_dir($rl_dir)) {
    @mkdir($rl_dir, 0700, true);
}

$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true) ?: $_POST;

$identifier = trim(isset($data['identifier']) ? $data['identifier'] : (isset($data['officerId']) ? $data['officerId'] : ''));
$pin = trim(isset($data['pin']) ? $data['pin'] : (isset($data['password']) ? $data['password'] : ''));
$role = trim(isset($data['role']) ? $data['role'] : 'staff');

if (empty($identifier) || empty($pin)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Identifier and PIN/Password are required.']);
    exit;
}

// Check Rate Limit (Max 5 attempts per 5 mins per IP + account)
$rl_key = md5($client_ip . '_' . strtolower($identifier));
$rl_file = $rl_dir . '/auth_' . $rl_key . '.json';
$now = time();
$attempts = [];

if (file_exists($rl_file)) {
    $raw = @file_get_contents($rl_file);
    $parsed = json_decode($raw, true);
    if (is_array($parsed)) {
        foreach ($parsed as $t) {
            if (($now - $t) < 300) { // 5 minutes window
                $attempts[] = $t;
            }
        }
    }
}

if (count($attempts) >= 5) {
    http_response_code(429);
    header('Retry-After: 300');
    echo json_encode([
        'ok' => false,
        'error' => 'Too many failed login attempts. Account temporarily locked for 5 minutes.',
        'retryAfter' => 300
    ]);
    exit;
}

// 2. Load Protected Server-Side Credentials
$creds = require __DIR__ . '/credentials.php';
$input_hash = hash('sha256', $pin);

$authenticated = false;
$matched_id = $identifier;
$user_role = $role;

// Exact Identifier Matching Only (Prevents Substring Collision / Authentication Bypass)
$clean_id = trim(strtolower($identifier));

if ($role === 'manager' || $role === 'admin') {
    $managers = isset($creds['managers']) ? $creds['managers'] : [];
    foreach ($managers as $m_id => $m_hash) {
        $m_id_lower = strtolower($m_id);
        // Allow exact match OR clean phone match without substring bleed
        if ($m_id_lower === $clean_id || 
            preg_replace('/[^0-9]/', '', $m_id_lower) === preg_replace('/[^0-9]/', '', $clean_id)) {
            if (hash_equals($m_hash, $input_hash)) {
                $authenticated = true;
                $matched_id = $m_id;
                break;
            }
        }
    }
} else {
    $staff = isset($creds['staff']) ? $creds['staff'] : [];
    // Strict exact match by ID
    foreach ($staff as $s_id => $s_hash) {
        if (strtolower($s_id) === $clean_id) {
            if (hash_equals($s_hash, $input_hash)) {
                $authenticated = true;
                $matched_id = $s_id;
                break;
            }
        }
    }
}

if ($authenticated) {
    // Clear failed attempts on success
    @unlink($rl_file);

    // Generate signed HMAC token
    $payload = [
        'id' => $matched_id,
        'role' => $user_role,
        'issued_at' => $now,
        'expires_at' => $now + (86400 * 7), // 7 days
    ];
    $payload_json = json_encode($payload);
    $signature = hash_hmac('sha256', $payload_json, FC_AUTH_SECRET_KEY);
    $token = base64_encode($payload_json) . '.' . $signature;

    echo json_encode([
        'ok' => true,
        'token' => $token,
        'user' => [
            'id' => $matched_id,
            'role' => $user_role,
        ]
    ]);
    exit;
} else {
    // Record failed attempt
    $attempts[] = $now;
    @file_put_contents($rl_file, json_encode($attempts));

    http_response_code(401);
    echo json_encode([
        'ok' => false,
        'error' => 'ভুল পাসওয়ার্ড বা সিকিউরিটি পিন। সঠিক তথ্য দিন।',
        'remainingAttempts' => max(0, 5 - count($attempts))
    ]);
    exit;
}

