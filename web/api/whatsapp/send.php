<?php
/**
 * Flight Care - Support Office WhatsApp & Automated Notification Gateway
 * Automatically dispatches booking alerts to Support Office WhatsApp (+8801347570001 and +8801347570002)
 * via GreenWeb BD / Gateway API and provides 1-Click WhatsApp Direct URLs.
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

// Support WhatsApp numbers: Both 01347570001 and 01347570002
$default_support_phones = ['8801347570001', '8801347570002'];
$support_phones = isset($wa_config['support_phones']) && is_array($wa_config['support_phones']) && !empty($wa_config['support_phones'])
    ? $wa_config['support_phones']
    : $default_support_phones;

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
$email = isset($data['email']) ? trim($data['email']) : (isset($data['passengerEmail']) ? trim($data['passengerEmail']) : '');
$passengerCount = isset($data['passengers']) ? (int)$data['passengers'] : (isset($data['a']) ? (int)$data['a'] : 1);
if ($passengerCount < 1) $passengerCount = 1;

$orderTime = isset($data['orderTime']) ? trim($data['orderTime']) : date('d-m-Y, h:i A') . ' BST';
$serviceDate = isset($data['serviceDate']) ? trim($data['serviceDate']) : (isset($data['date']) ? trim($data['date']) : date('d-m-Y'));
$serviceTime = isset($data['serviceTime']) ? trim($data['serviceTime']) : (isset($data['time']) ? trim($data['time']) : date('h:i A'));
$flightNumber = isset($data['flightNumber']) ? strtoupper(trim($data['flightNumber'])) : (isset($data['fno']) ? strtoupper(trim($data['fno'])) : 'BG-084');
$airline = isset($data['airline']) ? trim($data['airline']) : '';
$route = isset($data['route']) ? trim($data['route']) : '';
$terminal = isset($data['terminal']) ? trim($data['terminal']) : 'Terminal 1, HSIA';
$airport = isset($data['airport']) ? trim($data['airport']) : 'DAC (হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা)';

// Direction (Arrival / Departure)
$direction = isset($data['direction']) ? trim($data['direction']) : (isset($data['dir']) ? trim($data['dir']) : 'arr');
$directionBn = ($direction === 'dep' || strtolower($direction) === 'departure') ? 'প্রস্থান প্রোটোকল (Departure)' : 'আগমন প্রোটোকল (Arrival)';

// Service / Package Name
$serviceName = isset($data['serviceName']) ? trim($data['serviceName']) : (isset($data['package']) ? trim($data['package']) : 'VIP Meet & Greet');

// Additional Services (Addons)
$addonsList = [];
if (isset($data['addons']) && is_array($data['addons']) && !empty($data['addons'])) {
    $addonNameMap = [
        'wheel' => 'হুইলচেয়ার সেবা (Wheelchair)',
        'wheelchair' => 'হুইলচেয়ার সেবা (Wheelchair)',
        'wrap' => 'লাগেজ র‍্যাপিং (Luggage Wrapping)',
        'wrapping' => 'লাগেজ র‍্যাপিং (Luggage Wrapping)',
        'luggage' => 'লাগেজ র‍্যাপিং (Luggage Wrapping)',
        'transfer' => 'গাড়ি ভাড়া গাইডেন্স (Rent a Car)',
        'rent_car' => 'গাড়ি ভাড়া গাইডেন্স (Rent a Car)',
        'pickup' => 'এয়ারপোর্ট পিকআপ (Pickup)',
        'dropoff' => 'এয়ারপোর্ট ড্রপঅফ (Drop-off)',
        'visa' => 'অন অ্যারাইভাল ভিসা (Visa On Arrival)',
        'visa_on_arrival' => 'অন অ্যারাইভাল ভিসা (Visa On Arrival)',
        'print' => 'প্রিন্ট সেবা (Print)',
        'photocopy' => 'ফটোকপি সেবা (PhotoCopy)',
        'form_fillup' => 'ফর্ম পূরণ (Form Fillup)',
        'hotel' => 'হোটেল বুকিং গাইডেন্স (Hotel Guidance)',
        'food' => 'খাবার গাইডেন্স (Food Guidance)',
        'medical' => 'মেডিকেল গাইডেন্স ও অ্যাম্বুলেন্স (Medical)',
        'tour' => 'ট্যুর গাইডেন্স (Tour Guidance)',
        'security' => 'নিরাপত্তা প্রোটোকল (Security Protocol)',
    ];
    foreach ($data['addons'] as $ad) {
        $adKey = is_string($ad) ? strtolower(trim($ad)) : (isset($ad['id']) ? strtolower(trim($ad['id'])) : '');
        $adTitle = is_array($ad) && isset($ad['name']) ? $ad['name'] : (isset($addonNameMap[$adKey]) ? $addonNameMap[$adKey] : $adKey);
        if (!empty($adTitle)) {
            $addonsList[] = $adTitle;
        }
    }
}
if (isset($data['addonsText']) && !empty($data['addonsText'])) {
    $addonsList[] = trim($data['addonsText']);
}
$addonsDisplay = !empty($addonsList) ? implode(', ', array_unique($addonsList)) : 'কোনো অতিরিক্ত সার্ভিস নেওয়া হয়নি';

$specialAssistance = isset($data['specialAssistance']) ? trim($data['specialAssistance']) : '';
$bookerInfo = '';
if (!empty($data['bookingForSomeoneElse'])) {
    $bName = isset($data['bookerName']) ? trim($data['bookerName']) : '';
    $bPhone = isset($data['bookerPhone']) ? trim($data['bookerPhone']) : '';
    if ($bName || $bPhone) {
        $bookerInfo = trim("{$bName} ({$bPhone})");
    }
}

// Amount & Payment Status
$amount = isset($data['amount']) ? trim((string)$data['amount']) : '১০০০';
$paymentStatus = isset($data['paymentStatus']) ? trim($data['paymentStatus']) : (isset($data['method']) ? trim($data['method']) : 'pay_after_service');
$paymentMethod = isset($data['paymentMethod']) ? trim($data['paymentMethod']) : (isset($data['paidMethod']) ? trim($data['paidMethod']) : '');
$trxId = isset($data['trxId']) ? trim($data['trxId']) : '';

if (strtolower($paymentStatus) === 'paid') {
    $paymentStatusBn = 'পেমেন্ট সম্পন্ন (Paid)';
} elseif (in_array(strtolower($paymentStatus), ['pay_after_service', 'pending', 'quote_required'])) {
    $paymentStatusBn = 'সার্ভিস সমাপ্তির পর পেমেন্ট (Pay After Service)';
} else {
    $paymentStatusBn = $paymentStatus;
}

$methodLower = strtolower($paymentMethod);
if (strpos($methodLower, 'ssl') !== false) {
    $paymentMethodBn = 'এসএসএল কমার্স (SSLCOMMERZ)';
} elseif (strpos($methodLower, 'bkash') !== false) {
    $paymentMethodBn = 'বিকাশ (bKash)';
} elseif (strpos($methodLower, 'nagad') !== false) {
    $paymentMethodBn = 'নগদ (Nagad)';
} elseif (strpos($methodLower, 'card') !== false || strpos($methodLower, 'bank') !== false) {
    $paymentMethodBn = 'ব্যাংক কার্ড (Card)';
} elseif (strpos($methodLower, 'banglaqr') !== false || strpos($methodLower, 'qr') !== false) {
    $paymentMethodBn = 'বাংলা কিউআর (Bangla QR)';
} elseif (strpos($methodLower, 'pay_after') !== false || strpos($methodLower, 'service') !== false) {
    $paymentMethodBn = 'সার্ভিস পরবর্তী পেমেন্ট (Pay After Service)';
} else {
    $paymentMethodBn = !empty($paymentMethod) ? $paymentMethod : 'অনলাইন পেমেন্ট';
}

// 4. Construct Formatted WhatsApp Notification Text
$notificationMessage = "🛫 *নতুন বুকিং অর্ডার — ফ্লাইট কেয়ার সাপোর্ট অফিস*
━━━━━━━━━━━━━━━━━━━━━
🎫 *বুকিং আইডি:* #{$bookingCode}

👤 *ক্লায়েন্ট বিবরণ:*
• নাম: {$passengerName}
• মোবাইল নম্বর: {$passengerPhone}" . (!empty($email) ? "\n• ইমেইল: {$email}" : "") . "
• যাত্রী সংখ্যা: {$passengerCount} জন" . (!empty($bookerInfo) ? "\n• বুকিংকারী: {$bookerInfo}" : "") . "

🎯 *গৃহীত সার্ভিসসমূহ:*
• সেবার ধরন: {$directionBn}
• মূল প্যাকেজ: {$serviceName}
• অতিরিক্ত সেবা: {$addonsDisplay}" . (!empty($specialAssistance) ? "\n• বিশেষ নির্দেশনা: {$specialAssistance}" : "") . "

💰 *টাকার বিবরণ ও পেমেন্ট:*
• মোট ফি: ৳{$amount}
• পেমেন্ট স্ট্যাটাস: {$paymentStatusBn}
• পেমেন্ট মাধ্যম: {$paymentMethodBn}" . (!empty($trxId) ? "\n• ট্রানজেকশন আইডি (TrxID): {$trxId}" : "") . "

📅 *তারিখ ও ফ্লাইট বিবরণ:*
• সার্ভিসের তারিখ: {$serviceDate}
• ফ্লাইটের সময়: {$serviceTime} BST
• ফ্লাইট নম্বর: {$flightNumber}" . (!empty($airline) ? "\n• এয়ারলাইন্স: {$airline}" . (!empty($route) ? " ({$route})" : "") : "") . "
• বিমানবন্দর: {$airport}" . (!empty($terminal) ? " ({$terminal})" : "") . "
• অর্ডার নিশ্চিতের সময়: {$orderTime}
━━━━━━━━━━━━━━━━━━━━━
📍 *ডিজিটাল প্লেকার্ড ও ট্র্যাকিং লিংক:*
https://flightcaresbd.com/?trackBooking=" . urlencode($bookingCode) . "

অনুগ্রহ করে দ্রুত বুকিংটি গ্রহণ ও কনফার্ম করুন।";

// Direct WhatsApp URLs for both 01347570001 and 01347570002
$directUrls = [];
foreach ($support_phones as $sp) {
    $clean_sp = preg_replace('/[^0-9]/', '', $sp);
    $directUrls[$clean_sp] = "https://wa.me/{$clean_sp}?text=" . urlencode($notificationMessage);
}

// 5. Server-to-Server Gateway Dispatch via GreenWeb BD to BOTH numbers
$dispatched_results = [];
if (!empty($api_key)) {
    foreach ($support_phones as $phone) {
        $clean_phone = preg_replace('/[^0-9]/', '', $phone);
        $post_fields = [
            'token' => $api_key,
            'to' => $clean_phone,
            'message' => $notificationMessage,
        ];

        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_fields));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        $gateway_response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_err = curl_error($ch);
        curl_close($ch);

        $is_ok = false;
        if (!$curl_err && $http_code >= 200 && $http_code < 400) {
            $resp_lower = strtolower((string)$gateway_response);
            if (strpos($resp_lower, 'ok') !== false || strpos($resp_lower, 'success') !== false) {
                $is_ok = true;
            }
        }
        $dispatched_results[$clean_phone] = [
            'delivered' => $is_ok,
            'response' => $gateway_response,
        ];
    }
}

// 6. Return Clean Unified Response
echo json_encode([
    'ok' => true,
    'targets' => $support_phones,
    'target_display' => '01347-570001, 01347-570002',
    'delivered' => count(array_filter($dispatched_results, function($r) { return !empty($r['delivered']); })) > 0,
    'dispatched_results' => $dispatched_results,
    'bookingCode' => $bookingCode,
    'passengerName' => $passengerName,
    'passengerPhone' => $passengerPhone,
    'amount' => $amount,
    'serviceDate' => $serviceDate,
    'directWhatsAppUrls' => $directUrls,
    'directWhatsAppUrl' => isset($directUrls['8801347570001']) ? $directUrls['8801347570001'] : (reset($directUrls) ?: ''),
    'messageText' => $notificationMessage,
    'gatewayProvider' => 'GreenWeb BD / Gateway API'
]);
exit;
