<?php
/**
 * Flight Care - Epson EcoTank L3250 Smart Lock Cloud API
 * Synchronizes hardware/web lock status and service permissions between the
 * Flight Care Web Platform, Manager Devices, and Counter PC Print Bridges.
 * Endpoint: /api/printer/epson_lock.php
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
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
} else {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');

// Determine writable state file location
$stateFile = __DIR__ . '/lock_state.json';
if (!file_exists($stateFile) && !is_writable(__DIR__)) {
    $tempDir = sys_get_temp_dir();
    if (is_writable($tempDir)) {
        $stateFile = $tempDir . '/flightcare_epson_lock.json';
    }
}

// Default State (Locked by default for security)
$defaultState = [
    'locked' => true,
    'model' => 'EPSON EcoTank L3250',
    'spoolerName' => 'EPSON L3250 Series',
    'location' => 'HSIA Airport Terminal 1 & 2 Concierge Desk',
    'lastUpdated' => date('c'),
    'updatedBy' => 'System (Default Safety Lock)',
    'tempUnlockUntil' => null,
    'requirePermission' => true,
    'activeTokens' => [],
    'permissions' => []
];

function loadState($stateFile, $defaultState) {
    if (file_exists($stateFile)) {
        $content = @file_get_contents($stateFile);
        if ($content) {
            $data = json_decode($content, true);
            if (is_array($data)) {
                return array_merge($defaultState, $data);
            }
        }
    }
    return $defaultState;
}

function saveState($stateFile, $data) {
    @file_put_contents($stateFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

$state = loadState($stateFile, $defaultState);

// Check if temp unlock expired
if (!$state['locked'] && !empty($state['tempUnlockUntil'])) {
    if (time() * 1000 > (int)$state['tempUnlockUntil']) {
        $state['locked'] = true;
        $state['tempUnlockUntil'] = null;
        $state['lastUpdated'] = date('c');
        $state['updatedBy'] = 'Auto-Lock (Expired Window)';
        saveState($stateFile, $state);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'ok' => true,
        'state' => $state,
        'serverTime' => date('c'),
        'remainingSecs' => !empty($state['tempUnlockUntil']) ? max(0, round(((int)$state['tempUnlockUntil'] - (time() * 1000)) / 1000)) : 0
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);

    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid JSON payload.']);
        exit;
    }

    $isLocked = isset($input['locked']) ? (bool)$input['locked'] : $state['locked'];
    $actor = isset($input['actor']) ? preg_replace('/[^a-zA-Z0-9_\-\s\.]/', '', $input['actor']) : 'Duty Manager';
    $until = isset($input['until']) ? (int)$input['until'] : null;

    $state['locked'] = $isLocked;
    $state['updatedBy'] = $actor;
    $state['lastUpdated'] = date('c');
    $state['tempUnlockUntil'] = $until;

    if (isset($input['model'])) {
        $state['model'] = sanitize_text_field($input['model']);
    }

    if (isset($input['requirePermission'])) {
        $state['requirePermission'] = (bool)$input['requirePermission'];
    }

    if (isset($input['permissions']) && is_array($input['permissions'])) {
        $state['permissions'] = array_merge($state['permissions'], $input['permissions']);
    }

    saveState($stateFile, $state);

    echo json_encode([
        'ok' => true,
        'message' => $isLocked ? 'Epson L3250 locked successfully.' : 'Epson L3250 unlocked successfully.',
        'state' => $state
    ]);
    exit;
}

function sanitize_text_field($str) {
    return htmlspecialchars(strip_tags(trim($str)), ENT_QUOTES, 'UTF-8');
}
