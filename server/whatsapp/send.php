<?php
/**
 * Flight Care - Support Office WhatsApp & Automated Notification Gateway
 * Automatically dispatches booking alerts to Support Office (+8801347570001)
 * via GreenWeb BD / BulkSMSBD API and provides 1-Click WhatsApp Direct URL.
 * Endpoint: POST /api/whatsapp/send.php
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
    header("Access-Control-Allow-Methods: POST, OPTIONS");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed. Use POST.']);
    exit;
}

// 2. Load Secrets Server-Side
$secrets_path = __DIR__ . '/../config/secrets.php';
if (!file_exists($secrets_path)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Configuration file missing.']);
    exit;
}
$secrets = require $secrets_path;
$wa_config = isset($secrets['whatsapp']) ? $secrets['whatsapp'] : [];
$sms_config = isset($secrets['sms']) ? $secrets['sms'] : [];

$support_phone = isset($wa_config['support_phone']) ? $wa_config['support_phone'] : '8801347570001';
$api_key = isset($wa_config['api_key']) && !empty($wa_config['api_key']) 
    ? $wa_config['api_key'] 
    : (isset($sms_config['api_key']) ? $sms_config['api_key'] : '');
$api_url = isset($wa_config['api_url']) ? $wa_config['api_url'] : 'https://api.greenweb.com.bd/api.php';

// 3. Parse Input Payload
$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true) ?: $_POST;

$bookingCode = isset($data['bookingCode']) ? trim($data['bookingCode']) : (isset($data['id']) ? trim($data['id']) : 'FC-' . rand(10000, 99999));
$passengerName = isset($data['passengerName']) ? trim($data['passengerName']) : (isset($data['name']) ? trim($data['name']) : 'সম্মানিত যাত্রী');
$passengerPhone = isset($data['passengerPhone']) ? trim($data['passengerPhone']) : (isset($data['phone']) ? trim($data['phone']) : 'উল্লেখ নেই');
$serviceDate = isset($data['serviceDate']) ? trim($data['serviceDate']) : (isset($data['date']) ? trim($data['date']) : date('d-m-Y'));
$serviceTime = isset($data['serviceTime']) ? trim($data['serviceTime']) : (isset($data['time']) ? trim($data['time']) : date('h:i A'));
$flightNumber = isset($data['flightNumber']) ? strtoupper(trim($data['flightNumber'])) : (isset($data['fno']) ? strtoupper(trim($data['fno'])) : 'BG-084');
$airport = isset($data['airport']) ? trim($data['airport']) : 'DAC (হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর)';
$serviceName = isset($data['serviceName']) ? trim($data['serviceName']) : (isset($data['package']) ? trim($data['package']) : 'VIP Meet & Greet');
$amount = isset($data['amount']) ? trim((string)$data['amount']) : '১০০০';
$paymentStatus = isset($data['paymentStatus']) ? trim($data['paymentStatus']) : (isset($data['method']) ? trim($data['method']) : 'কাজের পর পেমেন্ট (Pay After Service)');

// Convert English payment status to clear Bengali terms
if (strtolower($paymentStatus) === 'paid') {
    $paymentStatusBn = 'পেমেন্ট সম্পন্ন (Paid)';
} elseif (in_array(strtolower($paymentStatus), ['pay_after_service', 'pending', 'quote_required'])) {
    $paymentStatusBn = 'সার্ভিস সমাপ্তির পর পেমেন্ট (Pay After Service)';
} else {
    $paymentStatusBn = $paymentStatus;
}

// 4. Construct Formatted WhatsApp & SMS Notification Text
$notificationMessage = "🛫 নতুন বুকিং অর্ডার — ফ্লাইট কেয়ার সাপোর্ট\n"
    . "━━━━━━━━━━━━━━━━━━━━━\n"
    . "🎫 বুকিং আইডি: #{$bookingCode}\n"
    . "👤 যাত্রীর নাম: {$passengerName}\n"
    . "📱 যাত্রীর নম্বর: {$passengerPhone}\n"
    . "📅 সার্ভিসের তারিখ: {$serviceDate}\n"
    . "⏰ ফ্লাইটের সময়: {$serviceTime} BST\n"
    . "✈️ ফ্লাইট নম্বর: {$flightNumber}\n"
    . "📍 বিমানবন্দর: {$airport}\n"
    . "🎯 সার্ভিস প্যাকেজ: {$serviceName}\n"
    . "💰 মূল্য: ৳{$amount} ({$paymentStatusBn})\n"
    . "━━━━━━━━━━━━━━━━━━━━━\n"
    . "📍 লাইভ ট্র্যাকিং ও প্ল্যাকার্ড:\n"
    . "https://flightcaresbd.com/?trackBooking=" . urlencode($bookingCode);

// Direct WhatsApp URL (Opens directly to +8801347570001 chat)
$directWhatsAppUrl = "https://wa.me/" . preg_replace('/[^0-9]/', '', $support_phone) . "?text=" . urlencode($notificationMessage);

// 5. Server-to-Server Gateway Dispatch via GreenWeb BD / BulkSMSBD
$gateway_dispatched = false;
$gateway_response = '';

if (!empty($api_key)) {
    // Greenweb BD SMS/Gateway parameter structure
    $dispatch_url = $api_url . '?token=' . urlencode($api_key)
        . '&to=' . urlencode($support_phone)
        . '&message=' . urlencode($notificationMessage);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $dispatch_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    $gateway_response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_err = curl_error($ch);
    curl_close($ch);

    if (!$curl_err && $http_code >= 200 && $http_code < 400) {
        $gateway_dispatched = true;
    }
}

// 6. Return Clean Unified Response
echo json_encode([
    'ok' => true,
    'delivered' => $gateway_dispatched,
    'target' => $support_phone,
    'target_display' => '01347-570001',
    'bookingCode' => $bookingCode,
    'directWhatsAppUrl' => $directWhatsAppUrl,
    'messageText' => $notificationMessage,
    'gatewayProvider' => 'GreenWeb BD / BulkSMSBD Gateway',
    'gatewayDispatched' => $gateway_dispatched
]);
exit;

