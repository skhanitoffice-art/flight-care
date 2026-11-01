<?php
/**
 * Flight Care - Secure Server-Side Vault PIN Verification Endpoint
 * Validates Operations Manager Vault and Super Admin Master Vault PINs server-side.
 * Eliminates plaintext PIN and hash exposure from browser JavaScript bundles.
 * Endpoint: POST /api/auth/verify_vault.php
 */

require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed. Use POST.']);
    exit;
}

// 1. IP & Rate Limiting Check
function fc_vault_get_client_ip() {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) return $_SERVER['HTTP_CF_CONNECTING_IP'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
}

$client_ip = fc_vault_get_client_ip();
$rl_dir = sys_get_temp_dir() . '/flightcare_vault_rl';
if (!is_dir($rl_dir)) {
    @mkdir($rl_dir, 0700, true);
}
$rl_file = $rl_dir . '/vault_' . md5($client_ip) . '.json';
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
        'error' => 'Too many failed vault PIN attempts. Vault locked for 5 minutes for security.',
        'retryAfter' => 300
    ]);
    exit;
}

// 2. Read Request
$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true) ?: $_POST;
$pin = trim(isset($data['pin']) ? $data['pin'] : '');
$requested_role = isset($data['requestedRole']) ? trim($data['requestedRole']) : null;

if (empty($pin)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'PIN is required.']);
    exit;
}

// 3. Load Server Vault Secrets
$secrets = require __DIR__ . '/../config/secrets.php';
$vault_secrets = isset($secrets['vault']) ? $secrets['vault'] : [];
$admin_hash = isset($vault_secrets['admin_hash']) ? $vault_secrets['admin_hash'] : '2e92b97cf20e7af7247dce07c22579b60892247c33ce3456edc1af19f26954eb';
$manager_hash = isset($vault_secrets['manager_hash']) ? $vault_secrets['manager_hash'] : 'cd0ceaec6c93bbad9e8154467b62de809f8cdc7972132064dba41c48fc709999';

// Salted SHA-256 Hash Calculation (Salt: FC_SEC_VAULT_2026_@94a19!)
$salt = 'FC_SEC_VAULT_2026_@94a19!';
$input_hash = hash('sha256', $salt . $pin);

$authenticated = false;
$unlocked_role = null;

if ($requested_role === 'admin') {
    if (hash_equals($admin_hash, $input_hash)) {
        $authenticated = true;
        $unlocked_role = 'admin';
    }
} elseif ($requested_role === 'manager') {
    if (hash_equals($manager_hash, $input_hash)) {
        $authenticated = true;
        $unlocked_role = 'manager';
    }
} else {
    // Auto-detect role by matching hash
    if (hash_equals($admin_hash, $input_hash)) {
        $authenticated = true;
        $unlocked_role = 'admin';
    } elseif (hash_equals($manager_hash, $input_hash)) {
        $authenticated = true;
        $unlocked_role = 'manager';
    }
}

if ($authenticated) {
    // Clear failed attempts
    @unlink($rl_file);

    // Cryptographic Session Token
    $payload = [
        'vault' => true,
        'role' => $unlocked_role,
        'issued_at' => $now,
        'expires_at' => $now + 86400, // 24 hours
    ];
    $payload_json = json_encode($payload);
    $signature = hash_hmac('sha256', $payload_json, FC_AUTH_SECRET_KEY);
    $token = base64_encode($payload_json) . '.' . $signature;

    echo json_encode([
        'ok' => true,
        'role' => $unlocked_role,
        'token' => $token,
        'message' => $unlocked_role === 'admin' ? 'Super Admin Master Vault Unlocked' : 'Manager Vault Unlocked'
    ]);
    exit;
} else {
    // Record failed attempt
    $attempts[] = $now;
    @file_put_contents($rl_file, json_encode($attempts));

    http_response_code(401);
    echo json_encode([
        'ok' => false,
        'error' => 'ভুল সিক্রেট পিন কোড। সঠিক পিন দিন।',
        'remainingAttempts' => max(0, 5 - count($attempts))
    ]);
    exit;
}
