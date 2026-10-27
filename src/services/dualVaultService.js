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
  EXCEL_CONFIG: '@flightcare_dual_vault_excel_config',
};

// Default Excel 1 (Auditor) stealth configuration
export const DEFAULT_EXCEL_CONFIG = {
  omitServiceColumns: true,         // Removes 'Package' and 'Service' columns completely from 1st Excel sheet
  excludeVipFromExcel1: true,       // Excludes VIP First Class services from 1st Excel sheet
  excludeBusinessFromExcel1: false, // Excludes Business Protocol from 1st Excel sheet
  maskServicesInExcel1: false,      // If columns are kept, masks name to 'Airport Concierge'
};

let _cachedExcelConfig = null;

/**
 * Get current 1st Excel stealth configuration
 */
export async function getAuditorExcelConfig() {
  if (_cachedExcelConfig !== null) {
    return _cachedExcelConfig;
  }
  try {
    const raw = await AsyncStorage.getItem(DUAL_VAULT_KEYS.EXCEL_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        _cachedExcelConfig = { ...DEFAULT_EXCEL_CONFIG, ...parsed };
        return _cachedExcelConfig;
      }
    }
  } catch (e) {
    console.warn('[DualVault] Error reading excel config:', e);
  }
  _cachedExcelConfig = { ...DEFAULT_EXCEL_CONFIG };
  return _cachedExcelConfig;
}

/**
 * Save new 1st Excel stealth configuration
 */
export async function setAuditorExcelConfig(updates = {}) {
  const current = await getAuditorExcelConfig();
  const nextConfig = { ...current, ...updates };
  _cachedExcelConfig = nextConfig;
  try {
    await AsyncStorage.setItem(DUAL_VAULT_KEYS.EXCEL_CONFIG, JSON.stringify(nextConfig));
  } catch (e) {
    console.warn('[DualVault] Error saving excel config:', e);
  }
  return nextConfig;
}

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
 * - mode === 'auditor': Exports ONLY the showcase bookings with stealth service stripping if configured
 * - mode === 'master': Exports 100% of all master database bookings with ALL services and ALL columns intact!
 */
export function exportDualVaultBookingsCsv(bookings = [], mode = 'auditor', customOptions = {}) {
  const isMaster = mode === 'master';

  // Master mode NEVER strips or removes anything - keeps 100% of all records and columns
  const effectiveConfig = isMaster
    ? { omitServiceColumns: false, excludeVipFromExcel1: false, excludeBusinessFromExcel1: false, maskServicesInExcel1: false }
    : { ...(_cachedExcelConfig || DEFAULT_EXCEL_CONFIG), ...customOptions };

  // Filter bookings for Auditor Mode if specific services are to be stripped
  let targetList = [...(bookings || [])];
  if (!isMaster) {
    targetList = targetList.filter(b => {
      // If booking was explicitly marked to be excluded from 1st Excel
      if (b.excludeFromAuditorExcel === true || b.includeInAuditor === false) {
        return false;
      }
      const pkg = String(b.package || b.pkg?.t || '').toLowerCase();
      const svc = String(b.service || b.svc?.titleEn || '').toLowerCase();

      if (effectiveConfig.excludeVipFromExcel1 && (pkg.includes('vip') || pkg.includes('first') || svc.includes('vip'))) {
        return false;
      }
      if (effectiveConfig.excludeBusinessFromExcel1 && (pkg.includes('business') || pkg.includes('premium') || svc.includes('business'))) {
        return false;
      }
      return true;
    });
  }

  // Base headers
  let headers = [
    'Booking ID',
    'Passenger Name',
    'Phone',
    'Email',
    'Airport',
    'Direction',
    'Flight Number',
    'Flight Date',
    'Flight Time',
  ];

  // In 1st Excel, if omitServiceColumns is active, completely omit 'Package' & 'Service'!
  const shouldOmitServiceCols = !isMaster && effectiveConfig.omitServiceColumns;
  if (!shouldOmitServiceCols) {
    headers.push('Package', 'Service');
  }

  headers.push(
    'Passengers',
    'Total Amount (BDT)',
    'Payment Status',
    'Payment Method',
    'Status',
    'Assigned Staff',
    'Remarks'
  );

  const rows = targetList.map(b => {
    const row = [
      escapeCsv(b.id || b.bookingId),
      escapeCsv(b.customer || b.passengerName || b.name),
      escapeCsv(b.phone || b.passengerPhone),
      escapeCsv(b.email),
      escapeCsv(b.airport?.code || b.airport),
      escapeCsv(b.direction || b.dir),
      escapeCsv(b.fno || b.flight?.number),
      escapeCsv(b.date || b.flight?.date),
      escapeCsv(b.time || b.flight?.time),
    ];

    if (!shouldOmitServiceCols) {
      let pkgVal = b.package || b.pkg?.t || 'Standard Economy Protocol';
      let svcVal = b.service || b.svc?.titleEn || 'Airport Meet & Greet';
      if (!isMaster && effectiveConfig.maskServicesInExcel1) {
        pkgVal = 'Standard Protocol';
        svcVal = 'Airport Assistance';
      }
      row.push(escapeCsv(pkgVal), escapeCsv(svcVal));
    }

    row.push(
      escapeCsv(b.passengers || b.a || 1),
      escapeCsv(b.amount || 0),
      escapeCsv(b.paymentStatus || 'paid'),
      escapeCsv(b.paymentMethod || b.method),
      escapeCsv(b.status || 'upcoming'),
      escapeCsv(b.staff || b.leadStaffName || 'Unassigned'),
      escapeCsv(b.remarks || '')
    );

    return row;
  });

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
    count: targetList.length,
    isMaster,
    servicesOmitted: shouldOmitServiceCols,
  };
}

let _vaultClickCounter = 0;
let _vaultClickTimer = null;

/**
 * 10-Click Steganographic Vault Trigger
 * Requires 10 consecutive clicks within 4.5 seconds to trigger Database 2 unlock
 */
export function registerVaultTriggerClick({
  isUnlocked = false,
  onTrigger,
  onNotice,
  lang = 0,
}) {
  // If already unlocked in Database 2, trigger action directly
  if (isUnlocked) {
    if (onTrigger) onTrigger();
    return;
  }

  _vaultClickCounter += 1;
  if (_vaultClickTimer) clearTimeout(_vaultClickTimer);
  _vaultClickTimer = setTimeout(() => {
    _vaultClickCounter = 0;
  }, 4500);

  const remaining = 10 - _vaultClickCounter;

  if (_vaultClickCounter >= 10) {
    _vaultClickCounter = 0;
    if (_vaultClickTimer) clearTimeout(_vaultClickTimer);
    if (onTrigger) onTrigger();
  } else if (_vaultClickCounter >= 6) {
    if (onNotice) {
      onNotice(
        lang
          ? `🔒 Database 2 (মাস্টার ভল্ট) খুলতে আর ${remaining} বার ক্লিক করুন...`
          : `🔒 ${remaining} clicks remaining to unlock Database 2 (Master Vault)...`
      );
    }
  } else if (_vaultClickCounter === 1) {
    if (onNotice) {
      onNotice(
        lang
          ? '✓ ডাটাবেজ অডিট স্ট্যাটাস: ভেরিফায়েড ও সক্রিয়'
          : '✓ Database Audit Status: Verified & Active'
      );
    }
  }
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
  registerVaultTriggerClick,
  getAuditorExcelConfig,
  setAuditorExcelConfig,
  DEFAULT_EXCEL_CONFIG,
};
