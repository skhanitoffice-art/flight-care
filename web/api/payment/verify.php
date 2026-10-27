<?php
/**
 * Flight Care - Server-Side Payment Status Verification Endpoint
 * Validates whether a payment was genuinely confirmed by SSLCommerz server.
 * Endpoint: GET /api/payment/verify.php?bookingId=...
 */

require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=UTF-8');

$booking_id = isset($_GET['bookingId']) ? trim($_GET['bookingId']) : (isset($_POST['bookingId']) ? trim($_POST['bookingId']) : '');

if (empty($booking_id)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'bookingId is required']);
    exit;
}

$sanitized_id = preg_replace('/[^a-zA-Z0-9_-]/', '', $booking_id);
$record_file = __DIR__ . '/logs/' . $sanitized_id . '.json';

if (file_exists($record_file)) {
    $content = file_get_contents($record_file);
    $record = json_decode($content, true);
    if ($record && !empty($record['is_verified'])) {
        echo json_encode([
            'ok' => true,
            'isPaid' => true,
            'bookingId' => $booking_id,
            'valId' => $record['val_id'],
            'amount' => $record['amount'],
            'bankTranId' => $record['bank_tran_id'],
            'timestamp' => $record['timestamp']
        ]);
        exit;
    }
}

echo json_encode([
    'ok' => true,
    'isPaid' => false,
    'bookingId' => $booking_id,
    'message' => 'No verified payment record found on server yet'
]);
exit;

