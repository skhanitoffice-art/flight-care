<?php
/**
 * Flight Care - Server-Side Payment Status Verification Endpoint
 * Validates whether a payment was genuinely confirmed by SSLCommerz server.
 * Implements direct fallback query to SSLCommerz validation server if IPN was delayed.
 * Endpoint: GET /api/payment/verify.php?bookingId=...&valId=...
 */

require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=UTF-8');

$booking_id = isset($_GET['bookingId']) ? trim($_GET['bookingId']) : (isset($_POST['bookingId']) ? trim($_POST['bookingId']) : '');
$val_id = isset($_GET['valId']) ? trim($_GET['valId']) : (isset($_POST['valId']) ? trim($_POST['valId']) : (isset($_GET['val_id']) ? trim($_GET['val_id']) : ''));

if (empty($booking_id)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'isPaid' => false, 'error' => 'bookingId is required']);
    exit;
}

$sanitized_id = preg_replace('/[^a-zA-Z0-9_-]/', '', $booking_id);
$record_file = __DIR__ . '/logs/' . $sanitized_id . '.json';

// 1. Check local IPN verified log first
if (file_exists($record_file)) {
    $content = @file_get_contents($record_file);
    $record = json_decode($content, true);
    if ($record && !empty($record['is_verified']) && (isset($record['status']) && $record['status'] === 'PAID')) {
        echo json_encode([
            'ok' => true,
            'isPaid' => true,
            'bookingId' => $booking_id,
            'valId' => isset($record['val_id']) ? $record['val_id'] : '',
            'amount' => isset($record['amount']) ? $record['amount'] : '',
            'bankTranId' => isset($record['bank_tran_id']) ? $record['bank_tran_id'] : '',
            'cardType' => isset($record['card_type']) ? $record['card_type'] : '',
            'timestamp' => isset($record['timestamp']) ? $record['timestamp'] : date('c'),
            'verifiedVia' => 'ipn_cache'
        ]);
        exit;
    }
}

// 2. If not found in cache, but val_id is provided, verify directly with SSLCommerz live validation API
if (!empty($val_id)) {
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

    if (isset($val_data['status']) && in_array($val_data['status'], ['VALID', 'VALIDATED'])) {
        // Ensure tran_id matches requested booking
        $tran_matched = isset($val_data['tran_id']) && (
            $val_data['tran_id'] === $booking_id || 
            strcasecmp($val_data['tran_id'], $booking_id) === 0
        );

        if ($tran_matched) {
            $log_dir = __DIR__ . '/logs';
            if (!is_dir($log_dir)) {
                @mkdir($log_dir, 0750, true);
            }

            $record = [
                'timestamp' => date('c'),
                'booking_id' => $booking_id,
                'val_id' => $val_id,
                'amount' => isset($val_data['amount']) ? $val_data['amount'] : '',
                'bank_tran_id' => isset($val_data['bank_tran_id']) ? $val_data['bank_tran_id'] : '',
                'card_type' => isset($val_data['card_type']) ? $val_data['card_type'] : '',
                'is_verified' => true,
                'status' => 'PAID'
            ];
            @file_put_contents($record_file, json_encode($record, JSON_PRETTY_PRINT));

            echo json_encode([
                'ok' => true,
                'isPaid' => true,
                'bookingId' => $booking_id,
                'valId' => $val_id,
                'amount' => isset($val_data['amount']) ? $val_data['amount'] : '',
                'bankTranId' => isset($val_data['bank_tran_id']) ? $val_data['bank_tran_id'] : '',
                'cardType' => isset($val_data['card_type']) ? $val_data['card_type'] : '',
                'timestamp' => date('c'),
                'verifiedVia' => 'direct_sslcommerz_validation'
            ]);
            exit;
        }
    }
}

// 3. Fallback: Not genuine or not verified
echo json_encode([
    'ok' => true,
    'isPaid' => false,
    'bookingId' => $booking_id,
    'message' => 'No verified payment record found on SSLCommerz server for this booking ID'
]);
exit;
