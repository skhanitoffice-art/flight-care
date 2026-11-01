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

$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true) ?: $_POST;

$email = trim(isset($data['email']) ? $data['email'] : '');
$phone = trim(isset($data['phone']) ? $data['phone'] : '');
$otp = trim(isset($data['otp']) ? $data['otp'] : '');
$name = trim(isset($data['name']) ? $data['name'] : 'Customer');
$type = trim(isset($data['type']) ? $data['type'] : 'REGISTRATION');

if (empty($otp)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'OTP code is required.']);
    exit;
}

$email_sent = false;
$mail_error = null;

if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $subject = "Flight Care Verification Code: " . $otp;
    
    $message = "Dear " . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . ",\n\n";
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
