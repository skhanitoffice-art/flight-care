// src/services/blacklistService.js
// Flight Care Anti-Fraud, Rate-Limiting & Security Blacklist Engine
// Automatically blocks fraudulent phone numbers, spammers & malicious IP addresses

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseConfigured, getFirestoreDoc, saveFirestoreDoc } from './firebase.js';
import { logSecurityEvent, SECURITY_ACTIONS } from './security.js';

export const BLACKLIST_STORAGE_KEY = '@flightcare_security_blacklist_v1';
export const RATE_LIMIT_STORAGE_KEY = '@flightcare_booking_rate_limits';

// Standard demo seed list (empty by default)
const DEFAULT_BLACKLIST = [
  {
    id: 'blk-demo-1',
    type: 'phone',
    value: '+8801999999999',
    normalized: '8801999999999',
    reason: 'বার বার ফেক বুকিং ও ভুয়া তথ্য প্রদান (Fake Booking Spam)',
    blockedBy: 'Security System',
    blockedAt: '2026-10-10T12:00:00.000Z',
  },
];

/**
 * Normalizes phone numbers for accurate blacklist comparison
 */
export function normalizePhoneForCheck(phone) {
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

/**
 * Fetch all active blacklisted phone numbers and IPs
 */
export async function getBlacklist() {
  try {
    const raw = await AsyncStorage.getItem(BLACKLIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading local blacklist:', e);
  }

  // Sync from Cloud Firestore if available
  if (isFirebaseConfigured()) {
    try {
      const cloudRes = await getFirestoreDoc('settings', 'blacklist');
      if (cloudRes.ok && cloudRes.exists && Array.isArray(cloudRes.data?.items)) {
        AsyncStorage.setItem(BLACKLIST_STORAGE_KEY, JSON.stringify(cloudRes.data.items)).catch(() => {});
        return cloudRes.data.items;
      }
    } catch (e) {
      console.warn('Error fetching cloud blacklist:', e);
    }
  }

  return DEFAULT_BLACKLIST;
}

/**
 * Save blacklist to local storage and Cloud Firestore
 */
export async function saveBlacklist(list) {
  try {
    await AsyncStorage.setItem(BLACKLIST_STORAGE_KEY, JSON.stringify(list));
    if (isFirebaseConfigured()) {
      await saveFirestoreDoc('settings', 'blacklist', {
        items: list,
        updatedAt: new Date().toISOString(),
      });
    }
    return true;
  } catch (e) {
    console.warn('Error saving blacklist:', e);
    return false;
  }
}

/**
 * Add a phone number or IP to the blacklist
 */
export async function addToBlacklist({ type = 'phone', value, reason = 'Fake Booking / Abuse', blockedBy = 'Admin' }) {
  if (!value || !value.trim()) return { ok: false, message: 'Invalid value' };

  const cleanVal = value.trim();
  const normalized = type === 'phone' ? normalizePhoneForCheck(cleanVal) : cleanVal.toLowerCase();
  const currentList = await getBlacklist();

  // Check if already blacklisted
  const exists = currentList.find(b => b.normalized === normalized);
  if (exists) {
    return { ok: true, message: 'Already blacklisted', entry: exists };
  }

  const newEntry = {
    id: `BLK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    type,
    value: cleanVal,
    normalized,
    reason: reason.trim() || 'Suspicious Fake Bookings',
    blockedBy,
    blockedAt: new Date().toISOString(),
  };

  const updated = [newEntry, ...currentList];
  await saveBlacklist(updated);

  // Record audit log
  await logSecurityEvent({
    action: SECURITY_ACTIONS.ADMIN_ACTION || 'BLACKLIST_ENTITY_ADDED',
    actor: { name: blockedBy, role: 'manager' },
    details: `Blacklisted ${type.toUpperCase()}: ${cleanVal}. Reason: ${reason}`,
    severity: 'HIGH',
    status: 'SUCCESS',
  });

  return { ok: true, entry: newEntry };
}

/**
 * Remove an entry from the blacklist
 */
export async function removeFromBlacklist(idOrValue) {
  const currentList = await getBlacklist();
  const normalizedVal = normalizePhoneForCheck(idOrValue);
  const updated = currentList.filter(b => b.id !== idOrValue && b.value !== idOrValue && b.normalized !== normalizedVal);
  await saveBlacklist(updated);
  return { ok: true };
}

/**
 * Fast synchronous/asynchronous verification if a phone or IP is blacklisted
 */
export async function isEntityBlacklisted({ phone = null, ip = null }) {
  const list = await getBlacklist();

  if (phone) {
    const cleanP = normalizePhoneForCheck(phone);
    const match = list.find(b => b.type === 'phone' && (b.normalized === cleanP || b.value === phone));
    if (match) {
      return {
        blocked: true,
        type: 'phone',
        value: phone,
        reason: match.reason,
        blockedAt: match.blockedAt,
      };
    }
  }

  if (ip) {
    const cleanIp = String(ip).toLowerCase().trim();
    const match = list.find(b => b.type === 'ip' && b.value.toLowerCase() === cleanIp);
    if (match) {
      return {
        blocked: true,
        type: 'ip',
        value: ip,
        reason: match.reason,
        blockedAt: match.blockedAt,
      };
    }
  }

  return { blocked: false };
}

/**
 * Rate Limiter: Allows maximum N bookings per phone/IP in time window (e.g., 3 bookings per 30 minutes)
 */
export async function checkBookingRateLimit(identifier, maxAllowed = 3, windowMinutes = 30) {
  const cleanId = normalizePhoneForCheck(identifier);
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  try {
    const raw = await AsyncStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    const records = Array.isArray(cache[cleanId]) ? cache[cleanId] : [];
    // Filter active timestamps in window
    const validTimestamps = records.filter(ts => now - ts < windowMs);

    if (validTimestamps.length >= maxAllowed) {
      const oldestTs = Math.min(...validTimestamps);
      const remainingSeconds = Math.ceil((windowMs - (now - oldestTs)) / 1000);
      return {
        allowed: false,
        count: validTimestamps.length,
        remainingSeconds,
        message: `অতিরিক্ত বুকিং প্রচেষ্টা শনাক্ত হয়েছে। অনুগ্রহ করে ${Math.ceil(remainingSeconds / 60)} মিনিট পর আবার চেষ্টা করুন।`,
      };
    }

    // Record new attempt
    validTimestamps.push(now);
    cache[cleanId] = validTimestamps;
    await AsyncStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(cache));

    return { allowed: true, count: validTimestamps.length };
  } catch (e) {
    return { allowed: true, count: 1 };
  }
}
