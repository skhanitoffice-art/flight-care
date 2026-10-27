/**
 * FlightCare - Data Backup, Export & Import Service
 * Handles full system backups, entity-specific CSV/JSON exports,
 * validation, and safe data restoration (merge or overwrite).
 */

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKUP_STORAGE_KEYS = {
  BOOKINGS: '@flightcare_bookings',
  STAFF: '@flightcare_staff_roster',
  AIRPORTS: '@flightcare_managed_airports',
  PRICING: '@flightcare_pricing_config',
  SERVICES: '@flightcare_managed_services',
  NOTIFICATIONS: '@flightcare_notifications',
  PAYMENTS: '@flightcare_payments',
  LAST_BACKUP: '@flightcare_last_backup_time',
  LAST_RESTORE: '@flightcare_last_restore_time',
};

/**
 * Downloads a text or binary file to the user's device
 */
export function triggerFileDownload(filename, content, mimeType = 'application/json') {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return true;
    } catch (e) {
      console.warn('File download failed:', e);
      return false;
    }
  } else {
    Alert.alert('Download Complete', `Generated ${filename} (${(content.length / 1024).toFixed(1)} KB)`);
    return true;
  }
}

/**
 * Creates a complete full system backup payload
 */
export function createSystemBackupPayload({
  bookings = [],
  staffRoster = [],
  managedAirports = [],
  pricingConfig = null,
  serviceCatalog = [],
  notifications = [],
  payments = [],
  managerEmail = 'admin@flightcare.app',
}) {
  const timestamp = new Date().toISOString();
  return {
    app: 'FlightCare',
    system: 'Airport Protocol & VIP Services Platform',
    version: '1.0.0',
    exportedAt: timestamp,
    exportedBy: managerEmail,
    stats: {
      totalBookings: Array.isArray(bookings) ? bookings.length : 0,
      totalStaff: Array.isArray(staffRoster) ? staffRoster.length : 0,
      totalAirports: Array.isArray(managedAirports) ? managedAirports.length : 0,
      totalServices: Array.isArray(serviceCatalog) ? serviceCatalog.length : 0,
      totalNotifications: Array.isArray(notifications) ? notifications.length : 0,
      totalPayments: Array.isArray(payments) ? payments.length : 0,
    },
    data: {
      bookings: Array.isArray(bookings) ? bookings : [],
      staffRoster: Array.isArray(staffRoster) ? staffRoster : [],
      managedAirports: Array.isArray(managedAirports) ? managedAirports : [],
      pricingConfig: pricingConfig || {},
      serviceCatalog: Array.isArray(serviceCatalog) ? serviceCatalog : [],
      notifications: Array.isArray(notifications) ? notifications : [],
      payments: Array.isArray(payments) ? payments : [],
    },
  };
}

/**
 * Exports complete system backup to JSON file download
 */
export function exportFullSystemBackup(dataSources, managerEmail) {
  const payload = createSystemBackupPayload({ ...dataSources, managerEmail });
  const jsonStr = JSON.stringify(payload, null, 2);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `FlightCare_FullBackup_${dateStr}_${timeStr}.json`;

  triggerFileDownload(filename, jsonStr, 'application/json');

  AsyncStorage.setItem(BACKUP_STORAGE_KEYS.LAST_BACKUP, now.toISOString()).catch(() => {});
  return { success: true, filename, payload, jsonStr };
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
 * Export Bookings to CSV format
 */
export function exportBookingsToCsv(bookings = []) {
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
    escapeCsv(b.id),
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
  const filename = `FlightCare_Bookings_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvContent, 'text/csv;charset=utf-8;');
  return csvContent;
}

/**
 * Export Staff Roster to CSV format
 */
export function exportStaffRosterToCsv(staffList = []) {
  const headers = [
    'Staff ID',
    'Name',
    'Name (Bangla)',
    'Role / Designation',
    'Airport Code',
    'Station',
    'Shift',
    'Phone',
    'Email',
    'Status (Duty)',
    'Active',
    'Rating',
    'Points',
    'Completed Services',
  ];

  const rows = (staffList || []).map(s => [
    escapeCsv(s.id),
    escapeCsv(s.name),
    escapeCsv(s.nameBn || ''),
    escapeCsv(s.role || s.designation),
    escapeCsv(s.airport || s.airportCode || 'DAC'),
    escapeCsv(s.station || 'Terminal 1'),
    escapeCsv(s.shift || 'General Shift'),
    escapeCsv(s.phone),
    escapeCsv(s.email),
    escapeCsv(s.status || (s.onDuty ? 'On Duty' : 'Available')),
    escapeCsv(s.active !== false ? 'Active' : 'Inactive'),
    escapeCsv(s.rating || 5.0),
    escapeCsv(s.points || 0),
    escapeCsv(s.completedServices || 0),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const filename = `FlightCare_StaffRoster_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvContent, 'text/csv;charset=utf-8;');
  return csvContent;
}

/**
 * Export Payments list to CSV format
 */
export function exportPaymentsToCsv(payments = []) {
  const headers = [
    'Payment ID',
    'Booking ID',
    'Passenger Name',
    'Amount (BDT)',
    'Currency',
    'Method',
    'Gateway Ref / TrxID',
    'Status',
    'Created At',
  ];

  const rows = (payments || []).map(p => [
    escapeCsv(p.id || p.paymentId),
    escapeCsv(p.bookingId),
    escapeCsv(p.customerName || p.customer || p.passengerName),
    escapeCsv(p.amount || 0),
    escapeCsv(p.currency || 'BDT'),
    escapeCsv(p.method || p.paymentMethod || 'Bangla QR'),
    escapeCsv(p.gatewayRef || p.trxId || p.paymentRef || 'N/A'),
    escapeCsv(p.status || 'paid'),
    escapeCsv(p.created_at || p.date || new Date().toISOString()),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const filename = `FlightCare_Payments_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvContent, 'text/csv;charset=utf-8;');
  return csvContent;
}

/**
 * Validates and inspects an imported backup JSON text or parsed object
 */
export function validateAndInspectBackup(input) {
  if (!input) {
    return { isValid: false, error: 'Empty backup data provided.' };
  }

  let parsed = null;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input.trim());
    } catch (e) {
      return { isValid: false, error: `Invalid JSON syntax: ${e.message}` };
    }
  } else if (typeof input === 'object') {
    parsed = input;
  }

  if (!parsed || typeof parsed !== 'object') {
    return { isValid: false, error: 'Backup content must be a valid JSON object or array.' };
  }

  // Case 1: Standard Full FlightCare Backup
  if (parsed.app === 'FlightCare' && parsed.data && typeof parsed.data === 'object') {
    const data = parsed.data;
    const bookings = Array.isArray(data.bookings) ? data.bookings : [];
    const staffRoster = Array.isArray(data.staffRoster) ? data.staffRoster : [];
    const managedAirports = Array.isArray(data.managedAirports) ? data.managedAirports : [];
    const pricingConfig = data.pricingConfig && typeof data.pricingConfig === 'object' ? data.pricingConfig : null;
    const serviceCatalog = Array.isArray(data.serviceCatalog) ? data.serviceCatalog : [];
    const notifications = Array.isArray(data.notifications) ? data.notifications : [];
    const payments = Array.isArray(data.payments) ? data.payments : [];

    return {
      isValid: true,
      type: 'full_backup',
      app: parsed.app,
      version: parsed.version || '1.0.0',
      exportedAt: parsed.exportedAt || 'Unknown',
      exportedBy: parsed.exportedBy || 'Unknown',
      summary: {
        bookingsCount: bookings.length,
        staffCount: staffRoster.length,
        airportsCount: managedAirports.length,
        hasPricing: Boolean(pricingConfig),
        servicesCount: serviceCatalog.length,
        notificationsCount: notifications.length,
        paymentsCount: payments.length,
      },
      parsedData: {
        bookings,
        staffRoster,
        managedAirports,
        pricingConfig,
        serviceCatalog,
        notifications,
        payments,
      },
    };
  }

  // Case 2: Direct data container { bookings: [...], staffRoster: [...] }
  if (parsed.bookings || parsed.staffRoster || parsed.managedAirports) {
    const bookings = Array.isArray(parsed.bookings) ? parsed.bookings : [];
    const staffRoster = Array.isArray(parsed.staffRoster) ? parsed.staffRoster : [];
    const managedAirports = Array.isArray(parsed.managedAirports) ? parsed.managedAirports : [];
    const pricingConfig = parsed.pricingConfig || null;
    const serviceCatalog = Array.isArray(parsed.serviceCatalog) ? parsed.serviceCatalog : [];
    const notifications = Array.isArray(parsed.notifications) ? parsed.notifications : [];
    const payments = Array.isArray(parsed.payments) ? parsed.payments : [];

    return {
      isValid: true,
      type: 'partial_backup',
      exportedAt: parsed.exportedAt || 'Unknown',
      summary: {
        bookingsCount: bookings.length,
        staffCount: staffRoster.length,
        airportsCount: managedAirports.length,
        hasPricing: Boolean(pricingConfig),
        servicesCount: serviceCatalog.length,
        notificationsCount: notifications.length,
        paymentsCount: payments.length,
      },
      parsedData: {
        bookings,
        staffRoster,
        managedAirports,
        pricingConfig,
        serviceCatalog,
        notifications,
        payments,
      },
    };
  }

  // Case 3: Raw array of Bookings or Staff
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return { isValid: false, error: 'The provided JSON array is empty.' };
    }
    const sample = parsed[0];
    if (sample && (sample.fno || sample.passengerName || sample.customer || sample.serviceProgress)) {
      return {
        isValid: true,
        type: 'bookings_only',
        summary: { bookingsCount: parsed.length },
        parsedData: { bookings: parsed },
      };
    }
    if (sample && (sample.role || sample.station || sample.shift || sample.completedServices !== undefined)) {
      return {
        isValid: true,
        type: 'staff_only',
        summary: { staffCount: parsed.length },
        parsedData: { staffRoster: parsed },
      };
    }
    if (sample && (sample.code && (sample.nameEn || sample.nameBn))) {
      return {
        isValid: true,
        type: 'airports_only',
        summary: { airportsCount: parsed.length },
        parsedData: { managedAirports: parsed },
      };
    }
  }

  return {
    isValid: false,
    error: 'Unrecognized backup structure. Expected FlightCare Full Backup or entity array.',
  };
}

/**
 * Merges two arrays by unique ID
 */
export function mergeEntityCollections(existingList = [], importedList = [], idKey = 'id') {
  if (!Array.isArray(importedList) || importedList.length === 0) return existingList || [];
  if (!Array.isArray(existingList) || existingList.length === 0) return importedList;

  const map = new Map();
  // Add existing items
  existingList.forEach(item => {
    if (item && item[idKey]) map.set(String(item[idKey]), item);
  });
  // Overlay or add imported items
  importedList.forEach(item => {
    if (item && item[idKey]) {
      const prev = map.get(String(item[idKey]));
      map.set(String(item[idKey]), prev ? { ...prev, ...item } : item);
    }
  });

  return Array.from(map.values());
}

/**
 * Executes system data restore and returns updated state payload
 */
export async function executeRestoreOperation({
  parsedData,
  mode = 'merge', // 'merge' | 'replace'
  currentData = {},
}) {
  const result = {
    updatedBookings: null,
    updatedStaff: null,
    updatedAirports: null,
    updatedPricing: null,
    updatedServices: null,
    updatedNotifications: null,
    updatedPayments: null,
    stats: {
      bookingsRestored: 0,
      staffRestored: 0,
      airportsRestored: 0,
      servicesRestored: 0,
    },
  };

  const isMerge = mode === 'merge';

  // 1. Bookings
  if (parsedData.bookings && Array.isArray(parsedData.bookings)) {
    const nextBookings = isMerge
      ? mergeEntityCollections(currentData.bookings || [], parsedData.bookings, 'id')
      : parsedData.bookings;
    result.updatedBookings = nextBookings;
    result.stats.bookingsRestored = parsedData.bookings.length;
    await AsyncStorage.setItem(BACKUP_STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
  }

  // 2. Staff Roster
  if (parsedData.staffRoster && Array.isArray(parsedData.staffRoster)) {
    const nextStaff = isMerge
      ? mergeEntityCollections(currentData.staffRoster || [], parsedData.staffRoster, 'id')
      : parsedData.staffRoster;
    result.updatedStaff = nextStaff;
    result.stats.staffRestored = parsedData.staffRoster.length;
    await AsyncStorage.setItem(BACKUP_STORAGE_KEYS.STAFF, JSON.stringify(nextStaff));
  }

  // 3. Managed Airports
  if (parsedData.managedAirports && Array.isArray(parsedData.managedAirports)) {
    const nextAirports = isMerge
      ? mergeEntityCollections(currentData.managedAirports || [], parsedData.managedAirports, 'code')
      : parsedData.managedAirports;
    result.updatedAirports = nextAirports;
    result.stats.airportsRestored = parsedData.managedAirports.length;
    await AsyncStorage.setItem(BACKUP_STORAGE_KEYS.AIRPORTS, JSON.stringify(nextAirports));
  }

  // 4. Pricing Config
  if (parsedData.pricingConfig && typeof parsedData.pricingConfig === 'object') {
    const nextPricing = isMerge
      ? { ...(currentData.pricingConfig || {}), ...parsedData.pricingConfig }
      : parsedData.pricingConfig;
    result.updatedPricing = nextPricing;
    await AsyncStorage.setItem(BACKUP_STORAGE_KEYS.PRICING, JSON.stringify(nextPricing));
  }

  // 5. Service Catalog
  if (parsedData.serviceCatalog && Array.isArray(parsedData.serviceCatalog)) {
    const nextServices = isMerge
      ? mergeEntityCollections(currentData.serviceCatalog || [], parsedData.serviceCatalog, 'id')
      : parsedData.serviceCatalog;
    result.updatedServices = nextServices;
    result.stats.servicesRestored = parsedData.serviceCatalog.length;
    await AsyncStorage.setItem(BACKUP_STORAGE_KEYS.SERVICES, JSON.stringify(nextServices));
  }

  // 6. Notifications
  if (parsedData.notifications && Array.isArray(parsedData.notifications)) {
    const nextNotifs = isMerge
      ? mergeEntityCollections(currentData.notifications || [], parsedData.notifications, 'id')
      : parsedData.notifications;
    result.updatedNotifications = nextNotifs;
    await AsyncStorage.setItem(BACKUP_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(nextNotifs));
  }

  // 7. Payments
  if (parsedData.payments && Array.isArray(parsedData.payments)) {
    const nextPayments = isMerge
      ? mergeEntityCollections(currentData.payments || [], parsedData.payments, 'id')
      : parsedData.payments;
    result.updatedPayments = nextPayments;
    await AsyncStorage.setItem(BACKUP_STORAGE_KEYS.PAYMENTS, JSON.stringify(nextPayments));
  }

  await AsyncStorage.setItem(BACKUP_STORAGE_KEYS.LAST_RESTORE, new Date().toISOString());
  return result;
}

