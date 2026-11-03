/**
 * Flight Care - Epson EcoTank L3250 Hardware & Cloud Smart Lock Service
 * Controls and enforces hardware/web lock for the counter printer: EPSON EcoTank L3250.
 * Ensures no boarding pass, visa, invoice, travel form, or photocopy document can be
 * printed or sent to the counter printer without explicit manager permission from the website.
 */

import { Platform } from 'react-native';

const STORAGE_KEY_LOCKED = 'flightcare_epson_l3250_locked';
const STORAGE_KEY_CONFIG = 'flightcare_epson_l3250_config';
const STORAGE_KEY_TOKENS = 'flightcare_epson_l3250_tokens';
const STORAGE_KEY_AUDIT = 'flightcare_epson_l3250_audit_log';
const STORAGE_KEY_TEMP_UNLOCK = 'flightcare_epson_temp_unlock_until';

export const EPSON_PRINTER_DEFAULT_CONFIG = {
  model: 'EPSON EcoTank L3250',
  brand: 'EPSON',
  spoolerName: 'EPSON L3250 Series',
  deviceType: 'All-in-One Ink Tank (Print, Scan, Copy)',
  location: 'HSIA Airport Terminal 1 & 2 Concierge Desk',
  connectionType: 'Wi-Fi & USB Multi-Channel',
  ipAddress: '192.168.1.150',
  rawPort: 9100,
  paperFormat: 'A4 (210 x 297 mm)',
  lockMode: 'strict', // 'strict' = All prints blocked without dashboard auth | 'addons_only' = Blocks only 4 doc services
  masterPin: '2026', // Emergency Manager Override PIN
};

// In-memory subscribers for live UI updates
const subscribers = new Set();

export const subscribeEpsonLock = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

const notifySubscribers = (locked, config) => {
  subscribers.forEach((cb) => {
    try {
      cb({ locked, config });
    } catch (e) {
      console.warn('[EpsonL3250] Subscriber error:', e);
    }
  });
};

/**
 * Check whether the Epson L3250 is currently LOCKED from the website.
 * Default is TRUE (Locked) for safety until unlocked by Manager.
 */
export const isEpsonL3250Locked = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) {
    return true;
  }

  try {
    // 1. Check temporary unlock window
    const tempUnlockRaw = window.localStorage.getItem(STORAGE_KEY_TEMP_UNLOCK);
    if (tempUnlockRaw) {
      const until = parseInt(tempUnlockRaw, 10);
      if (!isNaN(until) && Date.now() < until) {
        return false; // Active temporary unlock window
      }
    }

    // 2. Check main lock state (defaults to true)
    const lockedRaw = window.localStorage.getItem(STORAGE_KEY_LOCKED);
    if (lockedRaw === null) {
      // First time initialization: Lock is ON by default!
      window.localStorage.setItem(STORAGE_KEY_LOCKED, 'true');
      return true;
    }
    return lockedRaw === 'true';
  } catch (e) {
    return true;
  }
};

/**
 * Get remaining temporary unlock seconds (0 if not temporarily unlocked)
 */
export const getTemporaryUnlockRemainingSecs = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_TEMP_UNLOCK);
    if (!raw) return 0;
    const until = parseInt(raw, 10);
    const diff = Math.max(0, Math.floor((until - Date.now()) / 1000));
    return diff;
  } catch (e) {
    return 0;
  }
};

/**
 * Get current printer configuration
 */
export const getEpsonConfig = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) {
    return EPSON_PRINTER_DEFAULT_CONFIG;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) return { ...EPSON_PRINTER_DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (e) {}
  return EPSON_PRINTER_DEFAULT_CONFIG;
};

/**
 * Save updated printer configuration
 */
export const saveEpsonConfig = (newConfig) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) return;
  try {
    const merged = { ...getEpsonConfig(), ...newConfig };
    window.localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
    notifySubscribers(isEpsonL3250Locked(), merged);
  } catch (e) {}
};

/**
 * Set the Epson L3250 Lock State from the Website
 * @param {boolean} locked - true to lock, false to unlock
 * @param {string} actor - Name or role of the person changing state
 */
export const setEpsonL3250Lock = (locked, actor = 'Duty Manager') => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY_LOCKED, locked ? 'true' : 'false');
    if (locked) {
      window.localStorage.removeItem(STORAGE_KEY_TEMP_UNLOCK); // Clear any temp unlock
    }

    // Sync to local bridge file/API if possible
    syncLockStateToBackend(locked, actor);

    // Audit Log
    logEpsonAudit({
      type: locked ? 'LOCK_ENABLED' : 'LOCK_RELEASED',
      actor,
      timestamp: new Date().toISOString(),
      details: locked
        ? 'Epson L3250 printer locked from Flight Care website dashboard.'
        : 'Epson L3250 printer unlocked from Flight Care website dashboard.',
    });

    notifySubscribers(locked, getEpsonConfig());
  } catch (e) {
    console.error('[EpsonL3250] Failed to set lock:', e);
  }
};

/**
 * Grant a temporary unlock window (e.g. 5 or 15 minutes)
 */
export const grantTemporaryUnlock = (minutes = 5, actor = 'Duty Manager') => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) return;
  try {
    const until = Date.now() + minutes * 60 * 1000;
    window.localStorage.setItem(STORAGE_KEY_TEMP_UNLOCK, until.toString());

    syncLockStateToBackend(false, actor, until);

    logEpsonAudit({
      type: 'TEMP_UNLOCK_GRANTED',
      actor,
      timestamp: new Date().toISOString(),
      details: `Temporary print unlock window granted for ${minutes} minutes.`,
    });

    notifySubscribers(false, getEpsonConfig());
  } catch (e) {}
};

/**
 * Generate a 6-digit One-Time Print Authorization Token (OTP)
 */
export const generateEpsonOneTimeOtp = (reason = 'Counter Document Print', actor = 'Duty Manager') => {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const token = {
    code: `EP-${pin}`,
    pin,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins validity
    used: false,
    reason,
    actor,
  };

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY_TOKENS);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(token);
      // Keep only last 20
      window.localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(list.slice(0, 20)));
    }
  } catch (e) {}

  logEpsonAudit({
    type: 'OTP_GENERATED',
    actor,
    timestamp: new Date().toISOString(),
    details: `Generated One-Time Print PIN: ${pin} (${reason})`,
  });

  return token;
};

/**
 * Verify and consume a one-time PIN or check Master PIN
 */
export const verifyEpsonUnlockPin = (inputPin) => {
  if (!inputPin) return { success: false, message: 'পিন প্রবেশ করান' };
  const cleanPin = String(inputPin).trim().replace('EP-', '');

  const config = getEpsonConfig();
  if (cleanPin === config.masterPin) {
    grantTemporaryUnlock(10, 'Master PIN Override');
    return { success: true, message: 'ম্যানেজার মাস্টার পিন দ্বারা ১০ মিনিটের জন্য আনলক করা হয়েছে।' };
  }

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY_TOKENS);
      const list = raw ? JSON.parse(raw) : [];
      const matchIndex = list.findIndex(
        (t) => t.pin === cleanPin && !t.used && new Date(t.expiresAt) > new Date()
      );

      if (matchIndex >= 0) {
        list[matchIndex].used = true;
        list[matchIndex].usedAt = new Date().toISOString();
        window.localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(list));

        grantTemporaryUnlock(5, `OTP: ${cleanPin}`);
        return { success: true, message: 'ওয়ান-টাইম সিকিউরিটি পিন সফলভাবে ভেরিফাই হয়েছে। ৫ মিনিটের জন্য প্রিন্ট আনলক।' };
      }
    }
  } catch (e) {}

  return { success: false, message: 'অবৈধ অথবা মেয়াদোত্তীর্ণ পিন। সঠিক পিন দিন অথবা ড্যাশবোর্ড থেকে আনলক করুন।' };
};

/**
 * Check if printing is authorized for a specific booking / service
 */
export const canPrintOnEpsonL3250 = (booking = {}) => {
  // If master printer is unlocked, permission is clear
  if (!isEpsonL3250Locked()) {
    return { allowed: true, reason: 'Printer unlocked on website.' };
  }

  // If strict mode, printer is locked for everything
  const config = getEpsonConfig();
  const targetAddons = ['print', 'photocopy', 'form_fillup', 'visa', 'visa_on_arrival'];
  const bookingAddons = booking.addons || [];
  const hasDocAddon = targetAddons.some((t) => bookingAddons.includes(t));

  if (config.lockMode === 'strict') {
    // In strict mode, check individual booking permission
    const bookingCode = booking.id || booking.bookingId;
    if (bookingCode && checkIndividualBookingPermission(bookingCode)) {
      return { allowed: true, reason: 'Approved for this specific booking.' };
    }
    return {
      allowed: false,
      reason: 'Epson L3250 is LOCKED from the website dashboard. Manager clearance required.',
    };
  }

  // If addons_only mode
  if (hasDocAddon) {
    const bookingCode = booking.id || booking.bookingId;
    if (bookingCode && checkIndividualBookingPermission(bookingCode)) {
      return { allowed: true, reason: 'Approved for this specific booking.' };
    }
    return {
      allowed: false,
      reason: 'Additional document service requires manager print approval.',
    };
  }

  return { allowed: true, reason: 'Standard booking allowed.' };
};

const checkIndividualBookingPermission = (bookingCode) => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const permsRaw = window.localStorage.getItem('flightcare_doc_service_permissions');
      if (!permsRaw) return false;
      const perms = JSON.parse(permsRaw);
      const targetAddons = ['print', 'photocopy', 'form_fillup', 'visa', 'visa_on_arrival'];
      return targetAddons.some(
        (t) => perms[bookingCode + '_' + t]?.granted || perms[bookingCode + '_print']?.granted
      );
    }
  } catch (e) {}
  return false;
};

/**
 * Log an audit record
 */
export const logEpsonAudit = (entry) => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY_AUDIT);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({
        id: 'LOG-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        ...entry,
      });
      window.localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(list.slice(0, 50)));
    }
  } catch (e) {}
};

/**
 * Retrieve Audit Logs
 */
export const getEpsonAuditLogs = () => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY_AUDIT);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  return [];
};

/**
 * Record a successful print job
 */
export const recordEpsonPrintSuccess = (job = {}) => {
  const authCode = 'AUTH-' + Math.floor(100000 + Math.random() * 900000);
  logEpsonAudit({
    type: 'PRINT_COMPLETED',
    actor: job.actor || 'Counter Staff',
    timestamp: new Date().toISOString(),
    details: `Printed ${job.title || 'Voucher'} (Booking: ${job.bookingId || 'Walk-in'}, Pax: ${job.passengerName || 'N/A'}). Auth: ${authCode}`,
  });
  return authCode;
};

/**
 * Sync lock state to backend PHP endpoint or local bridge
 */
const syncLockStateToBackend = async (locked, actor, until = null) => {
  try {
    const payload = {
      locked,
      actor,
      until,
      model: 'EPSON EcoTank L3250',
      timestamp: new Date().toISOString(),
    };

    // Attempt to update backend API if online
    if (typeof fetch === 'function') {
      fetch('/api/printer/epson_lock.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  } catch (e) {}
};

/**
 * Generates an official Epson L3250 authorized footer snippet for HTML print documents
 */
export const getEpsonWatermarkHtml = (authCode = 'AUTH-VERIFIED', approver = 'Flight Care Manager') => {
  return `
    <div style="margin-top: 18px; border-top: 1.5px dashed #0B3B60; padding-top: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10px; color: #374151; display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; padding: 8px 12px; border-radius: 6px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
        <span><strong>EPSON EcoTank L3250</strong> &bull; Flight Care Airport Counter Verified Print</span>
      </div>
      <div>
        <span>Security Token: <strong style="color: #0B3B60; font-family: monospace; font-size: 11px;">${authCode}</strong></span>
      </div>
      <div style="font-size: 9.5px; color: #64748B;">
        <span>Approved By: <strong>${approver}</strong></span>
      </div>
    </div>
  `;
};

/**
 * Generates a full test calibration page for Epson L3250
 */
export const getEpsonTestPrintHtml = () => {
  const dateStr = new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' });
  const authCode = 'TEST-' + Math.floor(100000 + Math.random() * 900000);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>EPSON EcoTank L3250 - Alignment & Lock Test</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
    .box { border: 2px solid #0B3B60; border-radius: 12px; padding: 24px; }
    .header { text-align: center; border-bottom: 2px solid #E2E8F0; padding-bottom: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 4px 12px; background: #DCFCE7; color: #166534; font-weight: bold; border-radius: 20px; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; font-size: 13px; }
    .row { display: flex; justify-content: space-between; border-bottom: 1px solid #F1F5F9; padding: 6px 0; }
    .colors { display: flex; gap: 10px; margin: 20px 0; }
    .color-box { flex: 1; height: 35px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
  </style>
</head>
<body>
  <div class="box">
    <div class="header">
      <h1 style="color: #0B3B60; margin: 0 0 6px 0; font-size: 24px;">FLIGHT CARE AIRPORT SERVICES</h1>
      <p style="color: #64748B; margin: 0 0 10px 0; font-size: 14px;">Hazrat Shahjalal International Airport (HSIA), Dhaka, Bangladesh</p>
      <span class="badge">&#10004; EPSON EcoTank L3250 Hardware Calibration & Security Lock Pass</span>
    </div>

    <div class="grid">
      <div class="row"><strong>Printer Model:</strong><span>EPSON EcoTank L3250</span></div>
      <div class="row"><strong>Device Status:</strong><span style="color:#10B981;font-weight:bold;">WEBSITE UNLOCKED & READY</span></div>
      <div class="row"><strong>Counter Location:</strong><span>HSIA Terminal 1 & 2 Departure / Arrival Desk</span></div>
      <div class="row"><strong>Spooler Driver:</strong><span>EPSON L3250 Series</span></div>
      <div class="row"><strong>Security Token:</strong><span style="font-family:monospace;font-weight:bold;">${authCode}</span></div>
      <div class="row"><strong>Calibration Timestamp:</strong><span>${dateStr} BST</span></div>
    </div>

    <div style="margin: 20px 0;">
      <strong>EcoTank 4-Color Quality Band (CMYK Test):</strong>
      <div class="colors">
        <div class="color-box" style="background:#000000;">Black (BK)</div>
        <div class="color-box" style="background:#00AEEF;">Cyan (C)</div>
        <div class="color-box" style="background:#EC008C;">Magenta (M)</div>
        <div class="color-box" style="background:#FFF200; color:#000; text-shadow:none;">Yellow (Y)</div>
      </div>
    </div>

    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 8px; font-size: 12px; color: #475569; line-height: 1.6;">
      <strong>সতর্কবার্তা ও নিরাপত্তা নীতিমালা:</strong><br>
      এই প্রিন্টারটি ফ্লাইট কেয়ার ক্লাউড ড্যাশবোর্ডের সাথে স্মার্ট লক সিস্টেমে যুক্ত। ড্যাশবোর্ড থেকে ম্যানেজার পারমিশন ব্যতিরেকে কোনো বোর্ডিং পাস, ভিসা কিংবা ট্রাভেল ডকুমেন্টস প্রিন্ট নেওয়া নিষিদ্ধ ও সংরক্ষিত।
    </div>

    <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; color: #64748B;">
      <div>Counter Operator: ___________________</div>
      <div>Duty Manager Signature: ___________________</div>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;
};
