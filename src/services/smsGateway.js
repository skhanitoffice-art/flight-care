import { getVaultSecret } from './securityVault.js';
// src/services/smsGateway.js
// Flight Care Universal SMS & OTP Gateway Dispatcher
// Supports Bangladesh Telecom Gateways (Greenweb BD, SSL Wireless, BulkSMS BD) and Offline Simulation

import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveCommunicationLog } from './communication.js';
import { isFirebaseConfigured, getFirestoreDoc, saveFirestoreDoc } from './firebase.js';

export const SMS_GATEWAY_CONFIG_KEY = '@flightcare_sms_gateway_config';

// Active configuration with environment fallbacks
export const SMS_PROVIDERS = {
  SIMULATED: 'simulated',
  GREENWEB_BD: 'greenweb_bd',
  SSL_WIRELESS: 'ssl_wireless',
  BULKSMS_BD: 'bulksms_bd',
};

/**
 * Format phone number for Bangladesh SMS Gateways
 * Standardizes to format: 8801XXXXXXXXX or 01XXXXXXXXX depending on gateway
 */
export function normalizeBdPhoneNumber(phone) {
  let cleaned = String(phone || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('880')) {
    return cleaned;
  }
  if (cleaned.startsWith('01')) {
    return '88' + cleaned;
  }
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    return '880' + cleaned;
  }
  return cleaned;
}

// Retrieve SMS Gateway config
export async function getSmsGatewayConfig() {
  const defaultApiKey = getVaultSecret('SMS_API_KEY', 'EXPO_PUBLIC_SMS_API_KEY');
  const defaultProvider = process.env.EXPO_PUBLIC_SMS_PROVIDER || SMS_PROVIDERS.GREENWEB_BD;
  const defaultSenderId = process.env.EXPO_PUBLIC_SMS_SENDER_ID || 'FlightCare';

  try {
    const raw = await AsyncStorage.getItem(SMS_GATEWAY_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local SMS config:', e);
  }

  // Fallback to Firestore cloud settings if available
  if (isFirebaseConfigured()) {
    try {
      const cloudRes = await getFirestoreDoc('settings', 'sms_gateway');
      if (cloudRes.ok && cloudRes.exists && cloudRes.data && cloudRes.data.apiKey) {
        const cloudConfig = {
          provider: cloudRes.data.provider || defaultProvider,
          apiKey: cloudRes.data.apiKey || defaultApiKey,
          senderId: cloudRes.data.senderId || defaultSenderId,
        };
        AsyncStorage.setItem(SMS_GATEWAY_CONFIG_KEY, JSON.stringify(cloudConfig)).catch(() => {});
        return cloudConfig;
      }
    } catch (e) {
      console.warn('Error reading cloud SMS config:', e);
    }
  }

  return {
    provider: defaultProvider,
    apiKey: defaultApiKey,
    senderId: defaultSenderId,
  };
}

// Save SMS Gateway config
export async function saveSmsGatewayConfig(config) {
  try {
    await AsyncStorage.setItem(SMS_GATEWAY_CONFIG_KEY, JSON.stringify(config));
    if (isFirebaseConfigured()) {
      await saveFirestoreDoc('settings', 'sms_gateway', {
        provider: config.provider || SMS_PROVIDERS.SIMULATED,
        apiKey: config.apiKey || '',
        senderId: config.senderId || 'FlightCare',
        updatedAt: new Date().toISOString(),
      });
    }
    return true;
  } catch (e) {
    console.warn('Error saving SMS config:', e);
    return false;
  }
}

/**
 * Universal SMS Dispatcher
 * Sends live SMS via BD telecom gateways if configured,
 * otherwise runs high-fidelity simulator for instant zero-cost testing.
 */
export async function sendLiveSms({ to, message, otp = null, title = 'SMS Alert' }) {
  const cleanPhone = normalizeBdPhoneNumber(to);
  const localPhone01 = cleanPhone.startsWith('880') ? cleanPhone.slice(2) : cleanPhone;
  const config = await getSmsGatewayConfig();

  let deliveryResult = {
    ok: true,
    provider: config.provider,
    delivered: false,
    simulated: true,
    message,
    phone: cleanPhone,
  };

  // 1. Live Greenweb BD Gateway (api.greenweb.com.bd)
  if (config.apiKey && config.provider === SMS_PROVIDERS.GREENWEB_BD) {
    try {
      const url = `https://api.greenweb.com.bd/api.php?token=${encodeURIComponent(config.apiKey)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(message)}`;
      const res = await fetch(url);
      const text = await res.text();
      const isSuccess = text.toLowerCase().includes('ok') ||
        text.toLowerCase().includes('success') ||
        text.toLowerCase().includes('sent') ||
        text.toLowerCase().includes('100');
      deliveryResult = {
        ok: isSuccess || res.ok,
        provider: 'Greenweb BD',
        delivered: isSuccess || res.ok,
        simulated: false,
        gatewayResponse: text,
      };
    } catch (err) {
      deliveryResult = { ok: false, provider: 'Greenweb BD', error: err.message, simulated: false };
    }
  }

  // 2. Live BulkSMS BD Gateway (bulksmsbd.net)
  else if (config.apiKey && config.provider === SMS_PROVIDERS.BULKSMS_BD) {
    try {
      const sender = config.senderId || '8809612443880';
      const url = `https://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(config.apiKey)}&type=text&number=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(sender)}&message=${encodeURIComponent(message)}`;
      const res = await fetch(url);
      const text = await res.text();
      let isSuccess = false;
      try {
        const json = JSON.parse(text);
        isSuccess = json.response_code === 202 || json.success === true;
      } catch (e) {
        isSuccess = res.ok;
      }
      deliveryResult = {
        ok: isSuccess,
        provider: 'BulkSMS BD',
        delivered: isSuccess,
        simulated: false,
        gatewayResponse: text,
      };
    } catch (err) {
      deliveryResult = { ok: false, provider: 'BulkSMS BD', error: err.message, simulated: false };
    }
  }

  // 3. Live SSL Wireless Gateway (smsplus.sslwireless.com)
  else if (config.apiKey && config.provider === SMS_PROVIDERS.SSL_WIRELESS) {
    try {
      const res = await fetch('https://smsplus.sslwireless.com/api/v3/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          api_token: config.apiKey,
          sid: config.senderId || 'FlightCare',
          msisdn: cleanPhone,
          sms: message,
          csms_id: `FC-${Date.now()}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const isSuccess = res.ok && (data.status === 'SUCCESS' || data.status_code === 200 || data.status_code === 202);
      deliveryResult = {
        ok: isSuccess,
        provider: 'SSL Wireless',
        delivered: isSuccess,
        simulated: false,
        gatewayResponse: data,
      };
    } catch (err) {
      deliveryResult = { ok: false, provider: 'SSL Wireless', error: err.message, simulated: false };
    }
  }

  // 4. Fallback / Test Simulation Mode
  else {
    deliveryResult = {
      ok: true,
      provider: 'Flight Care Instant Simulator',
      delivered: true,
      simulated: true,
      otpCode: otp,
      phone: cleanPhone,
    };
  }

  // Record into communication audit logs
  await saveCommunicationLog({
    bookingId: 'AUTH-OTP',
    channel: 'sms',
    type: otp ? 'OTP_VERIFICATION' : 'SMS_DISPATCH',
    recipient: cleanPhone,
    title,
    message,
    meta: {
      provider: deliveryResult.provider,
      simulated: deliveryResult.simulated,
    },
  });

  return deliveryResult;
}

