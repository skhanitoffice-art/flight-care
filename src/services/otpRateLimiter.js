/**
 * Flight Care - Anti-Bot & OTP Rate Limiting Defense Engine
 * Protects SMS Gateway from toll fraud, automated bots, and SMS flooding.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashAuthSecret } from './securityVault.js';

const OTP_RATE_STORE_KEY = '@flightcare_otp_rate_store';
const DEVICE_QUOTA_STORE_KEY = '@flightcare_otp_device_quota';
const OTP_LOCKOUT_STORE_KEY = '@flightcare_otp_lockout';

const COOLDOWN_SECONDS = 60; // 60 seconds cooldown between OTP requests
const MAX_PER_HOUR = 3;      // Maximum 3 OTPs per phone per hour
const MAX_PER_DEVICE_DAY = 5; // Maximum 5 OTPs per device per 24 hours
const MAX_VERIFICATION_ATTEMPTS = 5; // Lockout after 5 wrong OTP entries

/**
 * Check if a phone number is permitted to request an SMS OTP
 */
export async function checkOtpRateLimit(rawPhone) {
  const cleanPhone = String(rawPhone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length < 8) {
    return { allowed: false, reason: 'invalid_phone', message: 'Invalid phone number format.' };
  }

  const now = Date.now();

  try {
    // 1. Check if number is under security lockout
    const lockoutRaw = await AsyncStorage.getItem(`${OTP_LOCKOUT_STORE_KEY}_${cleanPhone}`);
    if (lockoutRaw) {
      const lockoutData = JSON.parse(lockoutRaw);
      if (lockoutData.lockedUntil && lockoutData.lockedUntil > now) {
        const remainingMin = Math.ceil((lockoutData.lockedUntil - now) / 60000);
        return {
          allowed: false,
          reason: 'locked_out',
          message: `Too many attempts. This number is temporarily locked for ${remainingMin} minutes.`,
          remainingMin,
        };
      }
    }

    // 2. Check Device / Session 24-Hour Quota
    const deviceRaw = await AsyncStorage.getItem(DEVICE_QUOTA_STORE_KEY);
    let deviceRecords = deviceRaw ? JSON.parse(deviceRaw) : [];
    deviceRecords = deviceRecords.filter(t => now - t < 86400000); // last 24h
    if (deviceRecords.length >= MAX_PER_DEVICE_DAY) {
      return {
        allowed: false,
        reason: 'device_quota_exceeded',
        message: 'Daily SMS verification limit reached on this device. Please try again tomorrow or contact support.',
      };
    }

    // 3. Check Phone-Specific History (Cooldown & Hourly Limit)
    const storeRaw = await AsyncStorage.getItem(`${OTP_RATE_STORE_KEY}_${cleanPhone}`);
    let history = storeRaw ? JSON.parse(storeRaw) : [];
    // Keep records within the last 1 hour
    history = history.filter(t => now - t < 3600000);

    if (history.length > 0) {
      const lastRequest = history[history.length - 1];
      const elapsedSec = Math.floor((now - lastRequest) / 1000);
      if (elapsedSec < COOLDOWN_SECONDS) {
        const remainingSec = COOLDOWN_SECONDS - elapsedSec;
        return {
          allowed: false,
          reason: 'cooldown',
          message: `Please wait ${remainingSec} seconds before requesting another code.`,
          remainingSec,
        };
      }

      if (history.length >= MAX_PER_HOUR) {
        const oldestInWindow = history[0];
        const waitMin = Math.ceil((3600000 - (now - oldestInWindow)) / 60000);
        return {
          allowed: false,
          reason: 'hourly_limit_exceeded',
          message: `Hourly SMS limit reached (max 3/hr). Please try again in ${waitMin} minutes.`,
          waitMin,
        };
      }
    }

    return { allowed: true };
  } catch (err) {
    // Fail-safe open on storage error
    return { allowed: true };
  }
}

/**
 * Record a successfully dispatched OTP timestamp
 */
export async function recordOtpDispatch(rawPhone) {
  const cleanPhone = String(rawPhone || '').replace(/[^0-9]/g, '');
  const now = Date.now();

  try {
    // Update phone rate store
    const storeRaw = await AsyncStorage.getItem(`${OTP_RATE_STORE_KEY}_${cleanPhone}`);
    let history = storeRaw ? JSON.parse(storeRaw) : [];
    history = history.filter(t => now - t < 3600000);
    history.push(now);
    await AsyncStorage.setItem(`${OTP_RATE_STORE_KEY}_${cleanPhone}`, JSON.stringify(history));

    // Update device daily quota
    const deviceRaw = await AsyncStorage.getItem(DEVICE_QUOTA_STORE_KEY);
    let deviceRecords = deviceRaw ? JSON.parse(deviceRaw) : [];
    deviceRecords = deviceRecords.filter(t => now - t < 86400000);
    deviceRecords.push(now);
    await AsyncStorage.setItem(DEVICE_QUOTA_STORE_KEY, JSON.stringify(deviceRecords));
  } catch (err) {}
}

/**
 * Record a failed verification attempt and lock out if threshold exceeded
 */
export async function recordFailedOtpAttempt(rawPhone) {
  const cleanPhone = String(rawPhone || '').replace(/[^0-9]/g, '');
  const key = `@flightcare_otp_fails_${cleanPhone}`;

  try {
    const raw = await AsyncStorage.getItem(key);
    const count = (Number(raw) || 0) + 1;
    if (count >= MAX_VERIFICATION_ATTEMPTS) {
      // Lock for 30 minutes
      const lockData = {
        lockedUntil: Date.now() + 30 * 60 * 1000,
        reason: 'max_failed_otp_attempts',
      };
      await AsyncStorage.setItem(`${OTP_LOCKOUT_STORE_KEY}_${cleanPhone}`, JSON.stringify(lockData));
      await AsyncStorage.removeItem(key);
      return { locked: true, remainingMin: 30 };
    } else {
      await AsyncStorage.setItem(key, String(count));
      return { locked: false, remainingAttempts: MAX_VERIFICATION_ATTEMPTS - count };
    }
  } catch (e) {
    return { locked: false };
  }
}

/**
 * Reset failed attempts upon successful verification
 */
export async function resetFailedOtpAttempts(rawPhone) {
  const cleanPhone = String(rawPhone || '').replace(/[^0-9]/g, '');
  try {
    await AsyncStorage.removeItem(`@flightcare_otp_fails_${cleanPhone}`);
    await AsyncStorage.removeItem(`${OTP_LOCKOUT_STORE_KEY}_${cleanPhone}`);
  } catch (e) {}
}

/**
 * Generate a client Anti-Bot Proof token for form submission
 */
export function generateAntiBotToken(action = 'otp') {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 8);
  const signature = hashAuthSecret(`${action}_${timestamp}_${nonce}`);
  return `${timestamp}.${nonce}.${signature}`;
}

/**
 * Validate anti-bot proof token
 */
export function verifyAntiBotToken(token, action = 'otp') {
  if (!token) return false;
  const parts = String(token).split('.');
  if (parts.length !== 3) return false;
  const [tStr, nonce, sig] = parts;
  const timestamp = Number(tStr);
  if (!timestamp || isNaN(timestamp)) return false;

  // Token expires in 5 minutes
  if (Date.now() - timestamp > 300000 || timestamp > Date.now() + 10000) {
    return false;
  }

  const expectedSig = hashAuthSecret(`${action}_${timestamp}_${nonce}`);
  return sig === expectedSig;
}

export default {
  checkOtpRateLimit,
  recordOtpDispatch,
  recordFailedOtpAttempt,
  resetFailedOtpAttempts,
  generateAntiBotToken,
  verifyAntiBotToken,
};

