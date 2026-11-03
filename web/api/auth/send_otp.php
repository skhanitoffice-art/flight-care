<?php
/**
 * Flight Care - Secure Server-Side OTP Mailer & Notification Gateway
 * Dispatches OTP emails for customer account registration and verification.
 * Endpoint: POST /api/auth/send_otp.php
 */

require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed. Use POST.']);
    exit;
}

// 1. IP-Based Rate Limiting (Max 5 OTP dispatches per 5 minutes per IP)
function fc_otp_get_client_ip() {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) return $_SERVER['HTTP_CF_CONNECTING_IP'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
}

$client_ip = fc_otp_get_client_ip();
$rl_dir = sys_get_temp_dir() . '/flightcare_otp_rl';
if (!is_dir($rl_dir)) {
    @mkdir($rl_dir, 0700, true);
}
$rl_file = $rl_dir . '/otp_' . md5($client_ip) . '.json';
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
        'error' => 'Too many OTP requests from this network. Please wait 5 minutes before retrying.',
        'retryAfter' => 300
    ]);
    exit;
}

$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true) ?: $_POST;

$email = trim(isset($data['email']) ? $data['email'] : '');
$phone = trim(isset($data['phone']) ? $data['phone'] : '');
$otp = trim(isset($data['otp']) ? $data['otp'] : '');
$name = trim(isset($data['name']) ? $data['name'] : 'Customer');
$type = trim(isset($data['type']) ? $data['type'] : 'REGISTRATION');

// Strict OTP Format Validation (4 to 6 numeric digits only)
if (empty($otp) || !preg_match('/^\d{4,6}$/', $otp)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid OTP code format. Must be 4 to 6 digits.']);
    exit;
}

// Sanitize name to prevent newline / CRLF header injection
$clean_name = preg_replace('/[\r\n\t]/', '', $name);
$clean_name = mb_substr(trim($clean_name), 0, 50, 'UTF-8');

// Record IP attempt
$attempts[] = $now;
@file_put_contents($rl_file, json_encode($attempts));

$email_sent = false;
$mail_error = null;

if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $subject = "Flight Care Verification Code: " . $otp;
    
    $message = "Dear " . htmlspecialchars($clean_name, ENT_QUOTES, 'UTF-8') . ",\n\n";
    $message .= "Your Flight Care verification code is:\n\n";
    $message .= "  ================================\n";
    $message .= "             " . $otp . "\n";
    $message .= "  ================================\n\n";
    $message .= "This OTP code is valid for 5 minutes. Do not share this OTP with anyone.\n\n";
    $message .= "Flight Care Bangladesh\n";
    $message .= "VIP Airport Protocol & Passenger Assistance\n";
    $message .= "Hotline: +880 1347-570001 / +880 1347-570002\n";
    $message .= "Website: https://flightcaresbd.com\n";

    $headers = "From: Flight Care BD <noreply@flightcaresbd.com>\r\n" .
               "Reply-To: support@flightcaresbd.com\r\n" .
               "X-Mailer: PHP/" . phpversion() . "\r\n" .
               "Content-Type: text/plain; charset=UTF-8\r\n";

    // Attempt PHP mail dispatch
    try {
        $email_sent = @mail($email, $subject, $message, $headers);
    } catch (Exception $e) {
        $mail_error = $e->getMessage();
    }
}

echo json_encode([
    'ok' => true,
    'email_sent' => $email_sent,
    'email' => $email,
    'phone' => $phone,
    'message' => $email_sent ? 'OTP email dispatched successfully.' : 'OTP processed.',
    'mail_error' => $mail_error,
]);
exit;

