/**
 * FlightCare - Dual-Vault Database & Dual Excel System
 * Architecture:
 * 1. Database 1 (Auditor / Showcase Database):
 *    - Curated, limited view intended for external auditors, partners, or inspectors.
 *    - Displays only admin-selected bookings and generates limited Excel/CSV sheets.
 *    - Statistics, metrics, and revenue compute ONLY from these selected bookings.
 * 2. Database 2 (Master Secret Vault Database):
 *    - Full, 100% real platform database with all customer bookings and sensitive financial records.
 *    - Protected by a Secret Master PIN (Default: 7860).
 *    - Admin can toggle which bookings are visible in Database 1 with 1 click.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashAuthSecret, verifyAuthSecret } from './securityVault';
import { triggerFileDownload } from './dataBackupService';

export const DUAL_VAULT_KEYS = {
  MODE: '@flightcare_dual_vault_mode',
  SHOWCASE_IDS: '@flightcare_showcase_booking_ids',
  PIN_HASH: '@flightcare_master_vault_pin_hash',
};

// Default Master Vault PIN: '7860'
const DEFAULT_PIN_HASH = '2e92b97cf20e7af7247dce07c22579b60892247c33ce3456edc1af19f26954eb';

// In-memory unlock state (resets on reload for maximum stealth & security)
let _inMemoryMasterUnlocked = false;
let _cachedShowcaseIds = null;

/**
 * Check if the Master Vault is currently unlocked in this active session
 */
export function isMasterVaultUnlocked() {
  return _inMemoryMasterUnlocked;
}

/**
 * Get current list of booking IDs exposed to Database 1 (Auditor / Showcase)
 */
export async function getShowcaseBookingIds() {
  if (_cachedShowcaseIds !== null) {
    return _cachedShowcaseIds;
  }
  try {
    const raw = await AsyncStorage.getItem(DUAL_VAULT_KEYS.SHOWCASE_IDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        _cachedShowcaseIds = parsed.map(String);
        return _cachedShowcaseIds;
      }
    }
  } catch (e) {
    console.warn('[DualVault] Error reading showcase IDs:', e);
  }
  _cachedShowcaseIds = [];
  return _cachedShowcaseIds;
}

/**
 * Save new list of booking IDs exposed to Database 1
 */
export async function setShowcaseBookingIds(ids = []) {
  const clean = Array.from(new Set(ids.map(String)));
  _cachedShowcaseIds = clean;
  try {
    await AsyncStorage.setItem(DUAL_VAULT_KEYS.SHOWCASE_IDS, JSON.stringify(clean));
  } catch (e) {
    console.warn('[DualVault] Error saving showcase IDs:', e);
  }
  return clean;
}

/**
 * Toggle a specific booking ID into or out of Database 1
 */
export async function toggleBookingShowcaseStatus(bookingId) {
  const idStr = String(bookingId);
  const current = await getShowcaseBookingIds();
  let updated;
  if (current.includes(idStr)) {
    updated = current.filter(id => id !== idStr);
  } else {
    updated = [...current, idStr];
  }
  await setShowcaseBookingIds(updated);
  return {
    isShowcase: updated.includes(idStr),
    totalShowcase: updated.length,
    showcaseIds: updated,
  };
}

/**
 * Unlock Master Vault using Master PIN
 */
export async function unlockMasterVault(pin) {
  if (!pin) {
    return { ok: false, message: 'PIN is required' };
  }
  const cleanPin = String(pin).trim();
  let targetHash = DEFAULT_PIN_HASH;
  try {
    const customHash = await AsyncStorage.getItem(DUAL_VAULT_KEYS.PIN_HASH);
    if (customHash) targetHash = customHash;
  } catch (e) {}

  const isValid = verifyAuthSecret(cleanPin, targetHash);
  if (isValid) {
    _inMemoryMasterUnlocked = true;
    return { ok: true };
  }
  return { ok: false, message: 'Invalid Master Secret PIN' };
}

/**
 * Lock Master Vault and return to safe Auditor Mode
 */
export function lockMasterVault() {
  _inMemoryMasterUnlocked = false;
  return { ok: true, mode: 'auditor' };
}

/**
 * Change Master Vault PIN
 */
export async function changeMasterVaultPin(oldPin, newPin) {
  const check = await unlockMasterVault(oldPin);
  if (!check.ok) {
    return { ok: false, message: 'Current PIN is incorrect' };
  }
  const cleanNew = String(newPin).trim();
  if (cleanNew.length < 4) {
    return { ok: false, message: 'New PIN must be at least 4 digits' };
  }
  const newHash = hashAuthSecret(cleanNew);
  await AsyncStorage.setItem(DUAL_VAULT_KEYS.PIN_HASH, newHash);
  return { ok: true };
}

/**
 * Filter bookings based on current vault status
 * - When locked (Auditor mode): returns only showcase bookings
 * - When unlocked (Master mode): returns 100% of master bookings
 */
export function filterBookingsByVaultMode(allBookings = [], isMaster = false, showcaseIds = []) {
  if (!Array.isArray(allBookings)) return [];
  if (isMaster) {
    return allBookings;
  }

  const idsSet = new Set((showcaseIds || []).map(String));

  // If specific showcase IDs are selected, return those
  const explicit = allBookings.filter(b => {
    const bId = String(b.id || b.bookingId || '');
    return idsSet.has(bId) || b.isShowcase === true;
  });

  if (explicit.length > 0) {
    return explicit;
  }

  // Fallback: If no bookings are explicitly flagged yet, pick the first 3-5 bookings
  // so the Auditor view looks genuine and active, rather than an empty screen
  return allBookings.slice(0, Math.min(4, allBookings.length));
}

/**
 * Helper to escape CSV cell values safely
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export Dual-Vault Bookings to CSV/Excel
 * - mode === 'auditor': Exports ONLY the showcase bookings (clean, non-suspicious filename)
 * - mode === 'master': Exports 100% of all master database bookings
 */
export function exportDualVaultBookingsCsv(bookings = [], mode = 'auditor') {
  const isMaster = mode === 'master';
  const headers = [
    'Booking ID',
    'Passenger Name',
    'Phone',
    'Email',
    'Airport',
    'Direction',
    'Flight Number',
    'Flight Date',
    'Flight Time',
    'Package',
    'Service',
    'Passengers',
    'Total Amount (BDT)',
    'Payment Status',
    'Payment Method',
    'Status',
    'Assigned Staff',
    'Remarks',
  ];

  const rows = (bookings || []).map(b => [
    escapeCsv(b.id || b.bookingId),
    escapeCsv(b.customer || b.passengerName || b.name),
    escapeCsv(b.phone || b.passengerPhone),
    escapeCsv(b.email),
    escapeCsv(b.airport?.code || b.airport),
    escapeCsv(b.direction || b.dir),
    escapeCsv(b.fno || b.flight?.number),
    escapeCsv(b.date || b.flight?.date),
    escapeCsv(b.time || b.flight?.time),
    escapeCsv(b.package || b.pkg?.t),
    escapeCsv(b.service || b.svc?.titleEn),
    escapeCsv(b.passengers || b.a || 1),
    escapeCsv(b.amount || 0),
    escapeCsv(b.paymentStatus || 'paid'),
    escapeCsv(b.paymentMethod || b.method),
    escapeCsv(b.status || 'upcoming'),
    escapeCsv(b.staff || b.leadStaffName || 'Unassigned'),
    escapeCsv(b.remarks || ''),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const filename = isMaster
    ? `FlightCare_Master_Vault_AllBookings_${dateStr}.csv`
    : `FlightCare_Bookings_Report_${dateStr}.csv`;

  triggerFileDownload(filename, csvContent, 'text/csv;charset=utf-8;');
  return {
    success: true,
    filename,
    count: bookings.length,
    isMaster,
  };
}

export default {
  isMasterVaultUnlocked,
  getShowcaseBookingIds,
  setShowcaseBookingIds,
  toggleBookingShowcaseStatus,
  unlockMasterVault,
  lockMasterVault,
  changeMasterVaultPin,
  filterBookingsByVaultMode,
  exportDualVaultBookingsCsv,
};
