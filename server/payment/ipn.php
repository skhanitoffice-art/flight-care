<?php
/**
 * Flight Care - Secure Server-Side Instant Payment Notification (IPN) & Webhook Handler
 * Verifies transaction validity directly with SSLCommerz Validation Server.
 * Endpoint: POST /api/payment/ipn.php
 */

require_once __DIR__ . '/config.php';

$action = isset($_GET['action']) ? $_GET['action'] : 'ipn';
$val_id = isset($_POST['val_id']) ? trim($_POST['val_id']) : (isset($_GET['val_id']) ? trim($_GET['val_id']) : '');
$tran_id = isset($_POST['tran_id']) ? trim($_POST['tran_id']) : (isset($_GET['tran_id']) ? trim($_GET['tran_id']) : '');
$amount = isset($_POST['amount']) ? trim($_POST['amount']) : (isset($_GET['amount']) ? trim($_GET['amount']) : '');
$card_type = isset($_POST['card_type']) ? trim($_POST['card_type']) : '';
$bank_tran_id = isset($_POST['bank_tran_id']) ? trim($_POST['bank_tran_id']) : '';

// 1. Direct IPN / Webhook from SSLCommerz Server
if (!empty($val_id)) {
    // Perform Server-to-Server Validation with SSLCommerz
    $validate_url = FC_VALIDATE_URL . '?val_id=' . urlencode($val_id) 
        . '&store_id=' . urlencode(FC_STORE_ID) 
        . '&store_passwd=' . urlencode(FC_STORE_PASSWD) 
        . '&v=1&format=json';

    $handle = curl_init();
    curl_setopt($handle, CURLOPT_URL, $validate_url);
    curl_setopt($handle, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($handle, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($handle, CURLOPT_TIMEOUT, 30);
    $val_result = curl_exec($handle);
    curl_close($handle);

    $val_data = json_decode($val_result, true);

    $is_valid = false;
    if (isset($val_data['status']) && in_array($val_data['status'], ['VALID', 'VALIDATED'])) {
        $is_valid = true;
    }

    // Save verification record to server-side cache/log
    $log_dir = __DIR__ . '/logs';
    if (!is_dir($log_dir)) {
        @mkdir($log_dir, 0750, true);
    }
    
    $record = [
        'timestamp' => date('c'),
        'booking_id' => $tran_id,
        'val_id' => $val_id,
        'amount' => $amount,
        'bank_tran_id' => $bank_tran_id,
        'card_type' => $card_type,
        'is_verified' => $is_valid,
        'status' => $is_valid ? 'PAID' : 'FAILED'
    ];

    @file_put_contents($log_dir . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $tran_id) . '.json', json_encode($record, JSON_PRETTY_PRINT));
}

// 2. Redirect User to App with verified parameters
if ($action === 'success') {
    $redirect_url = FC_APP_BASE_URL . '/?payment_status=success&bookingId=' . urlencode($tran_id) . '&valId=' . urlencode($val_id);
    header("Location: $redirect_url");
    exit;
} elseif ($action === 'fail') {
    $redirect_url = FC_APP_BASE_URL . '/?payment_status=failed&bookingId=' . urlencode($tran_id);
    header("Location: $redirect_url");
    exit;
} elseif ($action === 'cancel') {
    $redirect_url = FC_APP_BASE_URL . '/?payment_status=cancelled&bookingId=' . urlencode($tran_id);
    header("Location: $redirect_url");
    exit;
}

// Background IPN Webhook Response for SSLCommerz
header('Content-Type: application/json');
echo json_encode(['ok' => true, 'status' => 'IPN_PROCESSED', 'booking_id' => $tran_id]);
exit;

