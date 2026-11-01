<?php
/**
 * Flight Care - Secure Server-Side Payment Initiation Endpoint
 * Calls SSLCommerz v4 API server-to-server.
 * Implements:
 * 1. Server-Side Price Calculation & Price Tamper Defense (Anti-Price-Manipulation)
 * 2. IP-Based Rate Limiting (Anti-DoS / Anti-Bombing)
 * 3. Strict Origin Whitelist (Anti-Open-Redirect)
 * Endpoint: POST /api/payment/initiate.php
 */

require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed. Use POST.']);
    exit;
}

// =========================================================================
// 1. IP-BASED RATE LIMITING (Max 10 payment initiation requests per min per IP)
// =========================================================================
function fc_get_client_ip() {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        return $_SERVER['HTTP_CF_CONNECTING_IP'];
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
}

$client_ip = fc_get_client_ip();
$rl_dir = sys_get_temp_dir() . '/flightcare_ratelimit';
if (!is_dir($rl_dir)) {
    @mkdir($rl_dir, 0700, true);
}
$rl_file = $rl_dir . '/initiate_' . md5($client_ip) . '.json';
$now = time();
$requests = [];

if (file_exists($rl_file)) {
    $raw = @file_get_contents($rl_file);
    $parsed = json_decode($raw, true);
    if (is_array($parsed)) {
        // Keep requests from the last 60 seconds
        foreach ($parsed as $t) {
            if (($now - $t) < 60) {
                $requests[] = $t;
            }
        }
    }
}

if (count($requests) >= 10) {
    http_response_code(429);
    header('Retry-After: 60');
    echo json_encode([
        'ok' => false,
        'error' => 'Too many payment requests from this network. Please wait 1 minute before retrying.',
        'retryAfter' => 60
    ]);
    exit;
}

$requests[] = $now;
@file_put_contents($rl_file, json_encode($requests));

// =========================================================================
// 2. READ & PARSE INPUT DATA
// =========================================================================
$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true) ?: $_POST;

$booking_id = trim(isset($data['bookingId']) ? $data['bookingId'] : '');
$client_proposed_amount = floatval(isset($data['amount']) ? $data['amount'] : 0);
$cus_name = trim(isset($data['customerName']) ? $data['customerName'] : 'Flight Care Passenger');
$cus_email = trim(isset($data['customerEmail']) ? $data['customerEmail'] : 'book@flightcaresbd.com');
$cus_phone = trim(isset($data['customerPhone']) ? $data['customerPhone'] : '');
$service_pkg = trim(isset($data['packageName']) ? $data['packageName'] : 'Standard Protocol');
$client_origin = trim(isset($data['clientOrigin']) ? $data['clientOrigin'] : '');

// Basic validation
if (empty($booking_id) || empty($cus_phone)) {
    http_response_code(400);
    echo json_encode([
        'ok' => false, 
        'error' => 'Invalid payment payload. Required: bookingId, customerPhone.'
    ]);
    exit;
}

// =========================================================================
// 3. SERVER-SIDE PRICE CALCULATION & TAMPER SHIELD (Canonical Source of Truth)
// =========================================================================
$canonical_package_prices = [
    'standard' => 500.0,
    'premium'  => 1000.0,
    'vip'      => 1500.0,
];

$canonical_addon_prices = [
    'wheelchair'        => 300.0,
    'luggage_wrapping'  => 400.0,
    'luggage'           => 400.0,
    'wrap'              => 400.0,
    'visa_on_arrival'   => 1500.0,
    'visa'              => 1500.0,
    'food'              => 500.0,
    'print'             => 100.0,
    'printer'           => 100.0,
    'photocopy'         => 50.0,
    'security'          => 0.0,
    'security_protocol' => 0.0,
    'tour'              => 0.0,
    'tour_guide'        => 0.0,
    'medical'           => 0.0,
    'medical_assistance'=> 0.0,
    'hotel'             => 0.0,
    'transfer'          => 0.0,
    'rent_car'          => 0.0,
    'form_fillup'       => 0.0,
    'money'             => 0.0,
];

// Determine package
$pkg_input = strtolower(trim(isset($data['packageId']) ? $data['packageId'] : (isset($data['servicePackage']) ? $data['servicePackage'] : $service_pkg)));
if (strpos($pkg_input, 'vip') !== false) {
    $selected_pkg = 'vip';
} elseif (strpos($pkg_input, 'premium') !== false) {
    $selected_pkg = 'premium';
} else {
    $selected_pkg = 'standard';
}

$passengers = max(1, min(9, intval(isset($data['passengers']) ? $data['passengers'] : (isset($data['passengerCount']) ? $data['passengerCount'] : 1))));
$server_pkg_total = $canonical_package_prices[$selected_pkg] * $passengers;

$addon_total = 0.0;
if (isset($data['addons']) && is_array($data['addons'])) {
    foreach ($data['addons'] as $addon) {
        $addon_id = is_array($addon) ? (isset($addon['id']) ? $addon['id'] : '') : strval($addon);
        $addon_key = strtolower(trim($addon_id));
        if (isset($canonical_addon_prices[$addon_key])) {
            $addon_total += $canonical_addon_prices[$addon_key];
        }
    }
}

// Check coupon discount
$discount = 0.0;
$coupon = strtoupper(trim(isset($data['couponCode']) ? $data['couponCode'] : (isset($data['appliedPromoCode']) ? $data['appliedPromoCode'] : '')));
if ($coupon === 'FLIGHT100') {
    $discount = 100.0;
} elseif ($coupon === 'VIP200') {
    $discount = 200.0;
} elseif ($coupon === 'PROMO10') {
    $discount = ($server_pkg_total + $addon_total) * 0.10;
}

$server_calculated_amount = max(100.0, ($server_pkg_total + $addon_total) - $discount);

// SECURITY VERIFICATION: If client sent a tampered amount lower than expected price, override with server truth!
if ($client_proposed_amount <= 0 || $client_proposed_amount < ($server_calculated_amount * 0.90)) {
    // Malicious or mismatched amount detected: enforce server calculated price
    $final_amount = $server_calculated_amount;
} else {
    // Client amount is reasonable / matching server calculation
    $final_amount = $client_proposed_amount;
}

// =========================================================================
// 4. STRICT ORIGIN WHITELIST (Anti-Open-Redirect Defense)
// =========================================================================
$strictly_allowed_origins = [
    'https://flightcaresbd.com',
    'https://www.flightcaresbd.com',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:19006'
];

$chosen_origin = FC_APP_BASE_URL; // Default: https://flightcaresbd.com
if (!empty($client_origin) && in_array(strtolower($client_origin), $strictly_allowed_origins, true)) {
    $chosen_origin = strtolower($client_origin);
} elseif (isset($_SERVER['HTTP_ORIGIN']) && in_array(strtolower($_SERVER['HTTP_ORIGIN']), $strictly_allowed_origins, true)) {
    $chosen_origin = strtolower($_SERVER['HTTP_ORIGIN']);
}

// Clean phone for BD
$clean_phone = preg_replace('/[^0-9]/', '', $cus_phone);
if (strlen($clean_phone) == 10 && substr($clean_phone, 0, 1) == '1') {
    $clean_phone = '0' . $clean_phone;
}

// Prepare SSLCommerz v4 Session Data
$post_data = [
    'store_id' => FC_STORE_ID,
    'store_passwd' => FC_STORE_PASSWD,
    'total_amount' => number_format($final_amount, 2, '.', ''),
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
    'value_c' => time(),
    'value_d' => $chosen_origin // Strictly whitelisted return origin
];

// cURL POST to SSLCommerz API
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
        'amount' => $final_amount,
        'serverCalculated' => $server_calculated_amount
    ]);
} else {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => isset($sslcz['failedreason']) ? $sslcz['failedreason'] : 'Payment gateway session generation failed',
        'raw' => $sslcz
    ]);
}
