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
  const defaultApiKey = getVaultSecret('SMS_API_KEY', 'EXPO_PUBLIC_SMS_API_KEY') || '140382043261792939406bc2932aa5e0375dcef66e98d5df11f8b';
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
    provider: 'Greenweb BD',
    delivered: false,
    simulated: true,
    message,
    phone: cleanPhone,
  };

  // 1. Primary: Dispatch via Secure Server-Side SMS Proxy (/api/sms/send.php)
  // Keeps API tokens completely hidden on the server away from browser inspect
  try {
    const baseUrl = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://flightcaresbd.com';
    const serverRes = await fetch(`${baseUrl}/api/sms/send.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: cleanPhone,
        message,
        otp,
      }),
    });
    if (serverRes.ok) {
      const serverJson = await serverRes.json();
      if (serverJson.ok) {
        deliveryResult = {
          ok: true,
          provider: serverJson.provider || 'Greenweb BD',
          delivered: true,
          simulated: false,
          gatewayResponse: 'Dispatched via Server Shield Proxy',
        };
        // Log & return
        await saveCommunicationLog({
          type: 'sms',
          to: cleanPhone,
          message,
          delivered: true,
          provider: deliveryResult.provider,
          title,
          timestamp: new Date().toISOString(),
          status: 'success',
        }).catch(() => {});
        return deliveryResult;
      }
    }
  } catch (serverErr) {
    console.warn('[SMS Gateway] Server proxy dispatch notice:', serverErr?.message);
  }

  // 2. Direct fallback if running in standalone test environment with local API key
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

// In-memory deduplication cache for recently sent payment confirmation SMS
const sentPaymentSmsCache = new Map();

/**
 * Dispatches an instant payment confirmation SMS to the passenger
 * explicitly stating the exact amount deducted/charged.
 * Incorporates deduplication to avoid double SMS on re-renders or multiple payment callbacks.
 * 
 * @param {Object} params
 * @param {Object} params.booking - Full or partial booking object
 * @param {number|string} [params.amount] - Total amount charged/deducted
 * @param {string} [params.trxId] - Payment transaction ID / reference
 * @param {string} [params.method] - Payment method used
 * @param {number|boolean} [params.lang] - 1 for Bengali, 0 for English
 */
export async function sendPaymentConfirmationSms({
  booking = {},
  amount = null,
  trxId = null,
  method = '',
  lang = 1,
}) {
  try {
    const isBn = Boolean(lang);
    const bookingId = booking.id || booking.bookingId || booking.confirmedId || 'FC-PENDING';
    const finalTrxId = trxId || booking.trxId || booking.paymentId || booking.valId || `PAY-${bookingId}`;
    
    // Deduplication check: Avoid sending identical SMS within 2 minutes (120 seconds)
    const dedupeKey = `${bookingId}_${finalTrxId}`;
    const now = Date.now();
    const lastSent = sentPaymentSmsCache.get(dedupeKey);
    if (lastSent && (now - lastSent) < 120000) {
      console.log(`[Payment SMS] Duplicate SMS blocked for booking #${bookingId} (TrxID: ${finalTrxId})`);
      return { ok: true, duplicate: true };
    }
    sentPaymentSmsCache.set(dedupeKey, now);
    // Cleanup old cache entries
    if (sentPaymentSmsCache.size > 100) {
      for (const [k, v] of sentPaymentSmsCache.entries()) {
        if (now - v > 300000) sentPaymentSmsCache.delete(k);
      }
    }

    const passengerPhone =
      booking.passengerPhone ||
      booking.phone ||
      booking.customer?.phone ||
      booking.passengerInformation?.phone ||
      (booking.passengers && booking.passengers[0]?.phone) ||
      '';

    if (!passengerPhone) {
      console.warn(`[Payment SMS] No phone number found for booking #${bookingId}`);
      return { ok: false, error: 'no_recipient_phone' };
    }

    const passengerName =
      booking.passengerName ||
      booking.name ||
      booking.customer?.name ||
      booking.passengerInformation?.name ||
      (booking.passengers && booking.passengers[0]?.name) ||
      (isBn ? 'সম্মানিত যাত্রী' : 'Valued Passenger');

    const flightNo = (
      booking.flight?.number ||
      booking.flightNumber ||
      booking.fno ||
      'BG-001'
    ).toUpperCase();

    const flightDate =
      booking.flight?.date ||
      booking.flightDate ||
      booking.date ||
      '';

    const rawAmount = amount != null ? Number(amount) : Number(booking.amount || 0);
    const formattedAmount = isNaN(rawAmount) ? '0' : rawAmount.toLocaleString('en-US');

    // Identify human-friendly payment channel
    const rawMethod = String(method || booking.paidMethod || booking.method || '').toLowerCase();
    const isPayAfter =
      booking.paymentStatus === 'pay_after_service' ||
      booking.paidMethod === 'pay_after_service' ||
      rawMethod.includes('pay_after') ||
      rawMethod.includes('service') ||
      method === 'pay_after_service' ||
      booking.method === 'pay_after_service' ||
      rawAmount === 0;

    let methodLabelBn = 'অনলাইন পেমেন্ট';
    let methodLabelEn = 'Online Payment';

    if (rawMethod.includes('ssl')) {
      methodLabelBn = 'এসএসএল কমার্স';
      methodLabelEn = 'SSLCOMMERZ';
    } else if (rawMethod.includes('banglaqr') || rawMethod.includes('qr')) {
      methodLabelBn = 'বাংলা কিউআর';
      methodLabelEn = 'Bangla QR';
    } else if (rawMethod.includes('bkash')) {
      methodLabelBn = 'বিকাশ';
      methodLabelEn = 'bKash';
    } else if (rawMethod.includes('nagad')) {
      methodLabelBn = 'নগদ';
      methodLabelEn = 'Nagad';
    } else if (rawMethod.includes('card') || rawMethod.includes('bank')) {
      methodLabelBn = 'ব্যাংক কার্ড';
      methodLabelEn = 'Bank Card';
    } else if (isPayAfter) {
      methodLabelBn = 'সার্ভিস সমাপ্তির পর পেমেন্ট';
      methodLabelEn = 'Pay After Service';
    }

    const helpline = '01347-570001, 01347-570002';
    const trackingUrl = `https://flightcaresbd.com/?trackBooking=${bookingId}`;

    let messageBn = '';
    let messageEn = '';

    if (isPayAfter) {
      messageBn = `Flight Care: প্রিয় ${passengerName}, আপনার বুকিং #${bookingId} সফলভাবে নিশ্চিত হয়েছে! মোট ফি: ৳${formattedAmount} (সার্ভিস সমাপ্তির পর প্রদেয়)। ফ্লাইট: ${flightNo}${flightDate ? `, তারিখ: ${flightDate}` : ''}। ই-টিকেট ও ট্র্যাক: ${trackingUrl}। হেল্পলাইন: ${helpline}`;
      messageEn = `Flight Care: Dear ${passengerName}, your Booking #${bookingId} is confirmed! Total Fee: BDT ${formattedAmount} (Pay after service). Flight: ${flightNo}${flightDate ? `, Date: ${flightDate}` : ''}. E-Ticket: ${trackingUrl}. Helpline: ${helpline}`;
    } else {
      // Structured SMS text stating the exact deducted amount
      messageBn = `Flight Care: প্রিয় ${passengerName}, আপনার পেমেন্ট নিশ্চিত হয়েছে! বুকিং #${bookingId}-এর জন্য আপনার অ্যাকাউন্ট থেকে মোট ৳${formattedAmount} কেটে নেওয়া হয়েছে (${methodLabelBn})। TrxID: ${finalTrxId}। ফ্লাইট: ${flightNo}${flightDate ? `, তারিখ: ${flightDate}` : ''}। ট্র্যাকিং: ${trackingUrl}। হেল্পলাইন: ${helpline}`;
      messageEn = `Flight Care: Dear ${passengerName}, your payment for Booking #${bookingId} is confirmed! BDT ${formattedAmount} has been deducted via ${methodLabelEn}. TrxID: ${finalTrxId}. Flight: ${flightNo}${flightDate ? `, Date: ${flightDate}` : ''}. Tracking: ${trackingUrl}. Helpline: ${helpline}`;
    }

    const message = isBn ? messageBn : messageEn;

    console.log(`[Payment SMS] Sending confirmation to ${passengerPhone} (Amount: ৳${formattedAmount}, PayAfter: ${isPayAfter})`);

    const result = await sendLiveSms({
      to: passengerPhone,
      message,
      title: isPayAfter ? 'Booking Confirmation SMS' : 'Payment Confirmation SMS',
    });

    // Also notify booker if booking was made for someone else and booker phone differs
    const bookerPhone = booking.phone || booking.customerPhone;
    if (booking.bookingForSomeoneElse && bookerPhone && bookerPhone !== passengerPhone) {
      sendLiveSms({
        to: bookerPhone,
        message,
        title: 'Payment Confirmation SMS (Booker)',
      }).catch(err => console.warn('[Payment SMS] Booker SMS notice:', err));
    }

    return result;
  } catch (err) {
    console.error('[Payment SMS] Error sending payment confirmation SMS:', err);
    return { ok: false, error: err?.message };
  }
}

export const sendBookingConfirmationSms = sendPaymentConfirmationSms;



