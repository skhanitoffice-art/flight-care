<?php
/**
 * Flight Care - Central Server-Side Secrets & Credential Vault
 * STRICTLY CONFIDENTIAL. Never exposed to browser bundles, git, or client HTTP requests.
 * Protected by Apache .htaccess (Direct access blocked).
 */

if (basename($_SERVER['PHP_SELF']) === 'secrets.php') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'Direct access forbidden']);
    exit;
}

return [
    // 1. SSLCommerz Production Live Merchant Credentials
    'sslcommerz' => [
        'store_id' => getenv('FC_STORE_ID') ?: 'flightcaresbd0live',
        'store_passwd' => getenv('FC_STORE_PASSWD') ?: '6ADDE1ACF03A664127',
        'is_sandbox' => false,
        'init_url' => 'https://securepay.sslcommerz.com/gwprocess/v4/api.php',
        'val_url' => 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php',
    ],

    // 2. Telecom SMS & OTP Gateway (Greenweb BD)
    'sms' => [
        'provider' => getenv('FC_SMS_PROVIDER') ?: 'greenweb_bd',
        'api_key' => getenv('FC_SMS_API_KEY') ?: '140382043261792939406bc2932aa5e0375dcef66e98d5df11f8b',
        'sender_id' => getenv('FC_SMS_SENDER_ID') ?: 'FlightCare',
    ],

    // 2.5 Support Office WhatsApp & Automated Notification Gateway
    'whatsapp' => [
        'support_phones' => ['8801347570001', '8801347570002'],
        'support_phone' => '8801347570001',
        'support_phone_2' => '8801347570002',
        'support_phone_display' => '01347-570001, 01347-570002',
        'provider' => getenv('FC_WHATSAPP_PROVIDER') ?: 'greenweb_bd',
        'api_key' => getenv('FC_WHATSAPP_API_KEY') ?: (getenv('FC_SMS_API_KEY') ?: '140382043261792939406bc2932aa5e0375dcef66e98d5df11f8b'),
        'api_url' => getenv('FC_WHATSAPP_API_URL') ?: 'https://api.greenweb.com.bd/api.php',
        'instance_id' => getenv('FC_WHATSAPP_INSTANCE_ID') ?: '',
    ],

    // 3. Aviation Live Flight Radar (AviationStack)
    'aviation' => [
        'api_key' => getenv('FC_AVIATION_API_KEY') ?: '8d8516477e2f13b46ad8faccbefb3083',
        'base_url' => 'https://api.aviationstack.com/v1/flights',
    ],

    // 4. Server-Side HMAC Token Signing Secret
    'auth_signing' => [
        'secret_key' => getenv('FC_AUTH_SECRET_KEY') ?: 'FC_SECURE_AUTH_KEY_2026_HSIA_PROTOCOL_SIGNING',
    ],

    // 5. Dual-Vault Secret PIN Hashes (Salted with FC_SEC_VAULT_2026_@94a19!)
    'vault' => [
        'admin_hash' => '2e92b97cf20e7af7247dce07c22579b60892247c33ce3456edc1af19f26954eb',
        'manager_hash' => 'cd0ceaec6c93bbad9e8154467b62de809f8cdc7972132064dba41c48fc709999',
    ]
];

