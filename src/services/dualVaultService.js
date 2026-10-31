/**
 * FlightCare - Dual-Vault Database & Dual Excel System
 * Architecture:
 * 1. Database 1 (Auditor / Showcase Database):
 *    - Curated, limited view intended for external auditors, partners, or inspectors.
 *    - Displays only admin-selected bookings and generates limited Excel/CSV sheets.
 *    - Statistics, metrics, and revenue compute ONLY from these selected bookings.
 * 2. Manager Vault (Database 2A - ম্যানেজার ভল্ট):
 *    - Designed for Operations Managers with 2-Day Rolling visibility.
 *    - Stores and displays all bookings of the last 2 days (today, yesterday, within 48h).
 *    - Protected by Manager Secret PIN (Default: 2440).
 * 3. Super Admin Master Vault (Database 2B - সুপার এডমিন ভল্ট):
 *    - Full, 100% lifetime real platform database with all customer bookings across all time.
 *    - Protected by Super Admin Master PIN (Default: 7860).
 *    - Full administrative controls, unmasked exports, and stealth configuration.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashAuthSecret, verifyAuthSecret } from './securityVault';
import { triggerFileDownload } from './dataBackupService';

export const VAULT_ROLES = {
  AUDITOR: 'auditor',   // Locked / Public showcase mode
  MANAGER: 'manager',   // Operations Manager (Last 2 days records)
  ADMIN: 'admin',       // Super Admin (100% all-time lifetime records)
};

export const DUAL_VAULT_KEYS = {
  MODE: '@flightcare_dual_vault_mode',
  SHOWCASE_IDS: '@flightcare_showcase_booking_ids',
  PIN_HASH: '@flightcare_master_vault_pin_hash', // Super Admin PIN Hash
  MANAGER_PIN_HASH: '@flightcare_manager_vault_pin_hash', // Manager PIN Hash
  EXCEL_CONFIG: '@flightcare_dual_vault_excel_config',
};

// Default PINs & Precomputed SHA-256 Hashes (Salt: FC_SEC_VAULT_2026_@94a19!)
export const DEFAULT_ADMIN_PIN = '7860';
export const DEFAULT_ADMIN_PIN_HASH = '2e92b97cf20e7af7247dce07c22579b60892247c33ce3456edc1af19f26954eb';

export const DEFAULT_MANAGER_PIN = '2440';
export const DEFAULT_MANAGER_PIN_HASH = 'cd0ceaec6c93bbad9e8154467b62de809f8cdc7972132064dba41c48fc709999';

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

// In-memory active vault role (resets to 'auditor' on page reload for stealth & security)
let _inMemoryVaultRole = VAULT_ROLES.AUDITOR; // 'auditor' | 'manager' | 'admin'
let _cachedShowcaseIds = null;

/**
 * Get current active vault role ('auditor' | 'manager' | 'admin')
 */
export function getActiveVaultRole() {
  return _inMemoryVaultRole;
}

/**
 * Check if the Super Admin Master Vault is currently unlocked
 */
export function isMasterVaultUnlocked() {
  return _inMemoryVaultRole === VAULT_ROLES.ADMIN;
}

/**
 * Check if the Manager Vault is currently unlocked
 */
export function isManagerVaultUnlocked() {
  return _inMemoryVaultRole === VAULT_ROLES.MANAGER;
}

/**
 * Check if any authorized vault is unlocked (either Manager or Super Admin)
 */
export function isVaultUnlocked() {
  return _inMemoryVaultRole !== VAULT_ROLES.AUDITOR;
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
 * Unlock either Manager Vault or Super Admin Vault by PIN.
 * If requestedRole is specified, checks against that role's PIN.
 * If requestedRole is null, auto-detects based on PIN:
 * - 7860 -> Super Admin Master Vault (100% all-time records)
 * - 2440 -> Manager Vault (Last 2 days records)
 */
export async function unlockVault(pin, requestedRole = null) {
  if (!pin) {
    return { ok: false, message: 'PIN is required' };
  }
  const cleanPin = String(pin).trim();

  let adminTargetHash = DEFAULT_ADMIN_PIN_HASH;
  let managerTargetHash = DEFAULT_MANAGER_PIN_HASH;

  try {
    const customAdmin = await AsyncStorage.getItem(DUAL_VAULT_KEYS.PIN_HASH);
    if (customAdmin) adminTargetHash = customAdmin;
  } catch (e) {}

  try {
    const customMgr = await AsyncStorage.getItem(DUAL_VAULT_KEYS.MANAGER_PIN_HASH);
    if (customMgr) managerTargetHash = customMgr;
  } catch (e) {}

  // Explicit role checks
  if (requestedRole === VAULT_ROLES.ADMIN) {
    if (verifyAuthSecret(cleanPin, adminTargetHash)) {
      _inMemoryVaultRole = VAULT_ROLES.ADMIN;
      return { ok: true, role: VAULT_ROLES.ADMIN, message: 'Super Admin Master Vault Unlocked' };
    }
    return { ok: false, message: 'ভুল সুপার এডমিন পিন কোড' };
  }

  if (requestedRole === VAULT_ROLES.MANAGER) {
    if (verifyAuthSecret(cleanPin, managerTargetHash)) {
      _inMemoryVaultRole = VAULT_ROLES.MANAGER;
      return { ok: true, role: VAULT_ROLES.MANAGER, message: 'Manager Vault Unlocked (Last 2 Days Data)' };
    }
    return { ok: false, message: 'ভুল ম্যানেজার পিন কোড' };
  }

  // Auto-detection based on entered PIN
  if (verifyAuthSecret(cleanPin, adminTargetHash)) {
    _inMemoryVaultRole = VAULT_ROLES.ADMIN;
    return { ok: true, role: VAULT_ROLES.ADMIN, message: 'Super Admin Master Vault Unlocked' };
  }

  if (verifyAuthSecret(cleanPin, managerTargetHash)) {
    _inMemoryVaultRole = VAULT_ROLES.MANAGER;
    return { ok: true, role: VAULT_ROLES.MANAGER, message: 'Manager Vault Unlocked (Last 2 Days Data)' };
  }

  return { ok: false, message: 'ভুল পিন কোড! সঠিক পিন দিন।' };
}

/**
 * Backward-compatible unlockMasterVault
 */
export async function unlockMasterVault(pin) {
  return unlockVault(pin);
}

/**
 * Directly set vault role in memory
 */
export function setVaultRoleDirectly(role) {
  if (Object.values(VAULT_ROLES).includes(role)) {
    _inMemoryVaultRole = role;
    return { ok: true, role };
  }
  return { ok: false };
}

/**
 * Lock Vault and return to safe Auditor Mode
 */
export function lockMasterVault() {
  _inMemoryVaultRole = VAULT_ROLES.AUDITOR;
  return { ok: true, mode: VAULT_ROLES.AUDITOR };
}

/**
 * Change Vault PIN for either Manager or Super Admin
 */
export async function changeVaultPin({ role = VAULT_ROLES.ADMIN, oldPin, newPin }) {
  const check = await unlockVault(oldPin, role);
  if (!check.ok) {
    return { ok: false, message: 'বর্তমান পিন কোড সঠিক নয়' };
  }
  const cleanNew = String(newPin).trim();
  if (cleanNew.length < 4) {
    return { ok: false, message: 'নতুন পিন কমপক্ষে ৪ সংখ্যার হতে হবে' };
  }
  const newHash = hashAuthSecret(cleanNew);
  const storageKey = role === VAULT_ROLES.MANAGER
    ? DUAL_VAULT_KEYS.MANAGER_PIN_HASH
    : DUAL_VAULT_KEYS.PIN_HASH;

  await AsyncStorage.setItem(storageKey, newHash);
  return { ok: true, message: 'পিন সফলভাবে আপডেট করা হয়েছে' };
}

export async function changeMasterVaultPin(oldPin, newPin) {
  return changeVaultPin({ role: VAULT_ROLES.ADMIN, oldPin, newPin });
}

export async function changeManagerVaultPin(oldPin, newPin) {
  return changeVaultPin({ role: VAULT_ROLES.MANAGER, oldPin, newPin });
}

/**
 * Helper to parse various date formats for bookings
 */
export function parseBookingDateObject(dateStr) {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();
  const lower = clean.toLowerCase();
  if (lower === 'today' || lower === 'আজকের') return new Date();
  if (lower === 'tomorrow' || lower === 'আগামীকালের') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (lower === 'yesterday' || lower === 'গতকালের') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }
  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(clean)) {
    const parts = clean.split(/[-/]/);
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!isNaN(d.getTime())) return d;
  }
  // DD-MM-YYYY or DD/MM/YYYY
  const parts = clean.split(/[-/]/);
  if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Determine if a booking belongs within the last 2 days (rolling 48h / today + yesterday + within 2 days).
 * Used specifically for the Manager Vault.
 */
export function isBookingWithinLast2Days(b) {
  if (!b) return false;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // 1. Check createdAt timestamp (if recorded in Firestore)
  const createdRaw = b.createdAt || b.created_at || b.timestamp;
  if (createdRaw) {
    let createdDate = null;
    if (typeof createdRaw === 'object' && createdRaw.seconds) {
      createdDate = new Date(createdRaw.seconds * 1000);
    } else if (typeof createdRaw === 'number') {
      createdDate = new Date(createdRaw);
    } else if (typeof createdRaw === 'string') {
      createdDate = new Date(createdRaw);
    }
    if (createdDate && !isNaN(createdDate.getTime())) {
      const createdMidnight = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate()).getTime();
      const dayDiff = (todayMidnight - createdMidnight) / oneDayMs;
      // Last 2 days: dayDiff between -1 (tomorrow) and 2 (2 days ago)
      if (dayDiff >= -1 && dayDiff <= 2) {
        return true;
      }
    }
  }

  // 2. Check flight date / service date
  const dateStr = b.flight?.date || b.date || b.serviceDate;
  if (dateStr) {
    const parsed = parseBookingDateObject(dateStr);
    if (parsed && !isNaN(parsed.getTime())) {
      const parsedMidnight = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
      const dayDiff = (todayMidnight - parsedMidnight) / oneDayMs;
      if (dayDiff >= -1 && dayDiff <= 2) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filter bookings based on current vault status:
 * - 'admin' (or true): returns 100% of all platform bookings across all time (Super Admin Vault).
 * - 'manager': returns only bookings of the last 2 days (Manager Vault).
 * - 'auditor' (or false): returns only curated showcase bookings (Database 1).
 */
export function filterBookingsByVaultMode(allBookings = [], roleOrMaster = VAULT_ROLES.AUDITOR, showcaseIds = []) {
  if (!Array.isArray(allBookings)) return [];

  // Super Admin: 100% all bookings across all time
  if (
    roleOrMaster === true ||
    roleOrMaster === VAULT_ROLES.ADMIN ||
    roleOrMaster === 'super_admin' ||
    roleOrMaster === 'master'
  ) {
    return allBookings;
  }

  // Manager: Bookings of the last 2 days
  if (roleOrMaster === VAULT_ROLES.MANAGER || roleOrMaster === 'manager') {
    return allBookings.filter(b => isBookingWithinLast2Days(b));
  }

  // Auditor / Showcase (Locked mode): Curated showcase bookings
  const idsSet = new Set((showcaseIds || []).map(String));
  const explicit = allBookings.filter(b => {
    const bId = String(b.id || b.bookingId || '');
    return idsSet.has(bId) || b.isShowcase === true;
  });

  if (explicit.length > 0) {
    return explicit;
  }

  // Fallback: Pick first 3-4 bookings if none explicitly flagged
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
 * Export Dual-Vault Bookings to CSV/Excel:
 * - mode === 'admin' | 'master': Exports 100% of all master database bookings across all time.
 * - mode === 'manager': Exports bookings of the last 2 days.
 * - mode === 'auditor': Exports only showcase bookings with stealth service stripping if configured.
 */
export function exportDualVaultBookingsCsv(bookings = [], mode = VAULT_ROLES.AUDITOR, customOptions = {}) {
  const isMaster = mode === 'master' || mode === 'admin' || mode === VAULT_ROLES.ADMIN;
  const isManager = mode === 'manager' || mode === VAULT_ROLES.MANAGER;

  const effectiveConfig = (isMaster || isManager)
    ? { omitServiceColumns: false, excludeVipFromExcel1: false, excludeBusinessFromExcel1: false, maskServicesInExcel1: false }
    : { ...(_cachedExcelConfig || DEFAULT_EXCEL_CONFIG), ...customOptions };

  let targetList = [...(bookings || [])];
  if (!isMaster && !isManager) {
    targetList = targetList.filter(b => {
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

  const shouldOmitServiceCols = !isMaster && !isManager && effectiveConfig.omitServiceColumns;
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
      if (!isMaster && !isManager && effectiveConfig.maskServicesInExcel1) {
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

  let filename = `FlightCare_Auditor_Report_${dateStr}.csv`;
  if (isMaster) {
    filename = `FlightCare_SuperAdmin_Vault_AllBookings_${dateStr}.csv`;
  } else if (isManager) {
    filename = `FlightCare_Manager_Vault_Last2Days_${dateStr}.csv`;
  }

  triggerFileDownload(filename, csvContent, 'text/csv;charset=utf-8;');
  return {
    success: true,
    filename,
    count: targetList.length,
    isMaster,
    isManager,
    servicesOmitted: shouldOmitServiceCols,
  };
}

let _vaultClickCounter = 0;
let _vaultClickTimer = null;

/**
 * 10-Click Steganographic Vault Trigger
 * Requires 10 consecutive clicks within 4.5 seconds to open the Dual-Vault Controller
 */
export function registerVaultTriggerClick({
  isUnlocked = false,
  onTrigger,
  onNotice,
  lang = 0,
}) {
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
          ? `🔒 সিক্রেট ভল্ট খুলতে আর ${remaining} বার ক্লিক করুন...`
          : `🔒 ${remaining} clicks remaining to unlock Secret Vault...`
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
  VAULT_ROLES,
  DEFAULT_ADMIN_PIN,
  DEFAULT_MANAGER_PIN,
  getActiveVaultRole,
  isMasterVaultUnlocked,
  isManagerVaultUnlocked,
  isVaultUnlocked,
  getShowcaseBookingIds,
  setShowcaseBookingIds,
  toggleBookingShowcaseStatus,
  unlockVault,
  unlockMasterVault,
  setVaultRoleDirectly,
  lockMasterVault,
  changeVaultPin,
  changeMasterVaultPin,
  changeManagerVaultPin,
  isBookingWithinLast2Days,
  filterBookingsByVaultMode,
  exportDualVaultBookingsCsv,
  registerVaultTriggerClick,
  getAuditorExcelConfig,
  setAuditorExcelConfig,
  DEFAULT_EXCEL_CONFIG,
};
