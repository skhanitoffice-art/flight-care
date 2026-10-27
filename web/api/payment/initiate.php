<?php
/**
 * Flight Care - Secure Server-Side Payment Initiation Endpoint
 * Calls SSLCommerz v4 API server-to-server.
 * Endpoint: POST /api/payment/initiate.php
 */

require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed. Use POST.']);
    exit;
}

// Read JSON input
$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true) ?: $_POST;

$booking_id = trim(isset($data['bookingId']) ? $data['bookingId'] : '');
$amount = floatval(isset($data['amount']) ? $data['amount'] : 0);
$cus_name = trim(isset($data['customerName']) ? $data['customerName'] : 'Flight Care Passenger');
$cus_email = trim(isset($data['customerEmail']) ? $data['customerEmail'] : 'book@flightcaresbd.com');
$cus_phone = trim(isset($data['customerPhone']) ? $data['customerPhone'] : '');
$service_pkg = trim(isset($data['packageName']) ? $data['packageName'] : 'Standard Protocol');

// Input validation
if (empty($booking_id) || $amount <= 0 || empty($cus_phone)) {
    http_response_code(400);
    echo json_encode([
        'ok' => false, 
        'error' => 'Invalid payment payload. Required: bookingId, amount > 0, customerPhone.'
    ]);
    exit;
}

// Format phone for BD
$clean_phone = preg_replace('/[^0-9]/', '', $cus_phone);
if (strlen($clean_phone) == 10 && substr($clean_phone, 0, 1) == '1') {
    $clean_phone = '0' . $clean_phone;
}

$post_data = [
    'store_id' => FC_STORE_ID,
    'store_passwd' => FC_STORE_PASSWD,
    'total_amount' => number_format($amount, 2, '.', ''),
    'currency' => 'BDT',
    'tran_id' => $booking_id,
    'success_url' => FC_APP_BASE_URL . '/api/payment/ipn.php?action=success',
    'fail_url' => FC_APP_BASE_URL . '/api/payment/ipn.php?action=fail',
    'cancel_url' => FC_APP_BASE_URL . '/api/payment/ipn.php?action=cancel',
    'ipn_url' => FC_APP_BASE_URL . '/api/payment/ipn.php?action=ipn',
    
    // Customer Info
    'cus_name' => substr($cus_name, 0, 50),
    'cus_email' => filter_var($cus_email, FILTER_VALIDATE_EMAIL) ? $cus_email : 'support@flightcaresbd.com',
    'cus_add1' => 'Hazrat Shahjalal International Airport, Dhaka',
    'cus_city' => 'Dhaka',
    'cus_postcode' => '1229',
    'cus_country' => 'Bangladesh',
    'cus_phone' => $clean_phone,
    
    // Product details
    'product_name' => 'Flight Care Airport Protocol: ' . substr($service_pkg, 0, 30),
    'product_category' => 'Aviation Protocol & Meet and Greet Service',
    'product_profile' => 'non-physical-goods',
    'shipping_method' => 'NO',
    'num_of_item' => 1,
    
    'value_a' => $booking_id,
    'value_b' => $service_pkg,
    'value_c' => time()
];

// Perform cURL POST to SSLCommerz
$handle = curl_init();
curl_setopt($handle, CURLOPT_URL, FC_INITIATE_URL);
curl_setopt($handle, CURLOPT_TIMEOUT, 30);
curl_setopt($handle, CURLOPT_CONNECTTIMEOUT, 15);
curl_setopt($handle, CURLOPT_POST, 1);
curl_setopt($handle, CURLOPT_POSTFIELDS, http_build_query($post_data));
curl_setopt($handle, CURLOPT_RETURNTRANSFER, true);
curl_setopt($handle, CURLOPT_SSL_VERIFYPEER, true);

$content = curl_exec($handle);
$http_code = curl_getinfo($handle, CURLINFO_HTTP_CODE);
$curl_error = curl_error($handle);
curl_close($handle);

if ($curl_error) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'Failed to connect to SSLCommerz payment gateway: ' . $curl_error
    ]);
    exit;
}

$sslcz = json_decode($content, true);

if (isset($sslcz['status']) && $sslcz['status'] === 'SUCCESS') {
    echo json_encode([
        'ok' => true,
        'gatewayUrl' => $sslcz['GatewayPageURL'],
        'sessionKey' => isset($sslcz['sessionkey']) ? $sslcz['sessionkey'] : '',
        'bookingId' => $booking_id,
        'amount' => $amount
    ]);
} else {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => isset($sslcz['failedreason']) ? $sslcz['failedreason'] : 'Payment gateway session generation failed',
        'raw' => $sslcz
    ]);
}

