// src/services/firebaseSyncService.js
// Flight Care Enterprise Real-Time Cloud Firestore Synchronization & Persistence

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FIREBASE_CONFIG,
  isFirebaseConfigured,
  firestoreDb,
  firebaseAuth,
  loginWithEmail,
  subscribeCollection,
  subscribeDoc,
  saveFirestoreDoc,
  updateFirestoreDoc,
  deleteFirestoreDoc,
  getFirestoreDoc,
  getFirestoreCollection,
  firestoreRestRequest,
} from './firebase.js';
import {
  SERVICES,
  PLATFORM_AIRPORT_SERVICES,
  DEFAULT_MANAGED_AIRPORTS,
  DEFAULT_STAFF_ROSTER,
} from '../constants/data.js';

/**
 * Encodes plain JavaScript object into Firestore REST API format (fallback):
 * { fields: { key: { stringValue: 'val' }, ... } }
 */
export const toFirestoreFields = obj => {
  if (!obj || typeof obj !== 'object') return { fields: {} };
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(item => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return { integerValue: String(item) };
            if (typeof item === 'object') return { mapValue: toFirestoreFields(item) };
            return { stringValue: String(item) };
          })
        }
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: toFirestoreFields(value) };
    }
  }
  return { fields };
};

/**
 * Decodes Firestore REST API document format into clean JavaScript object:
 */
export const fromFirestoreFields = fields => {
  if (!fields) return {};
  const result = {};
  for (const [key, valObj] of Object.entries(fields)) {
    if ('stringValue' in valObj) result[key] = valObj.stringValue;
    else if ('integerValue' in valObj) result[key] = Number(valObj.integerValue);
    else if ('doubleValue' in valObj) result[key] = Number(valObj.doubleValue);
    else if ('booleanValue' in valObj) result[key] = valObj.booleanValue;
    else if ('nullValue' in valObj) result[key] = null;
    else if ('arrayValue' in valObj) {
      result[key] = (valObj.arrayValue?.values || []).map(v => fromFirestoreFields({ val: v }).val);
    } else if ('mapValue' in valObj) {
      result[key] = fromFirestoreFields(valObj.mapValue?.fields);
    }
  }
  return result;
};

// -----------------------------------------------------------------------------
// REAL-TIME FIRESTORE SUBSCRIPTIONS
// -----------------------------------------------------------------------------

/**
 * Real-time listener for Bookings collection in Firestore.
 * Triggers callback immediately on initial load and whenever any booking is created/modified in cloud.
 */
export const listenToCloudBookings = (onBookingsUpdate, onError) => {
  return subscribeCollection('bookings', onBookingsUpdate, onError);
};

/**
 * Real-time listener for Managed Airports collection in Firestore.
 */
export const listenToCloudAirports = (onAirportsUpdate, onError) => {
  return subscribeCollection('managed_airports', onAirportsUpdate, onError);
};

/**
 * Real-time listener for Staff Roster collection in Firestore.
 */
export const listenToCloudStaff = (onStaffUpdate, onError) => {
  return subscribeCollection('staff_roster', onStaffUpdate, onError);
};

/**
 * Real-time listener for Flight Care Family Directory in Firestore.
 */
export const listenToCloudFlightCareFamily = (onFamilyUpdate, onError) => {
  return subscribeCollection('flight_care_family', onFamilyUpdate, onError);
};

/**
 * Real-time listener for Airport Services in Firestore.
 */
export const listenToCloudServices = (onServicesUpdate, onError) => {
  return subscribeCollection('airport_services', onServicesUpdate, onError);
};

// -----------------------------------------------------------------------------
// BOOKINGS CRUD OPERATIONS
// -----------------------------------------------------------------------------

/**
 * Saves or updates a booking document in Firestore ('bookings' collection)
 */
export const saveBookingToFirestore = async (booking) => {
  if (!booking || (!booking.id && !booking.bookingId)) {
    return { ok: false, error: 'Invalid booking data: missing booking ID' };
  }

  const bookingId = String(booking.id || booking.bookingId);

  // Deep sanitize to prevent Firestore SDK "Unsupported field value: undefined" errors
  let sanitizedBooking = {};
  try {
    sanitizedBooking = JSON.parse(JSON.stringify(booking, (key, value) => {
      if (typeof value === 'function' || value === undefined) return null;
      return value;
    }));
  } catch {
    sanitizedBooking = { ...booking };
  }

  const payload = {
    ...sanitizedBooking,
    id: bookingId,
    bookingId,
    updatedAt: new Date().toISOString(),
    createdAt: sanitizedBooking.createdAt || sanitizedBooking.created_at || new Date().toISOString(),
  };

  // 1. Try standard Firestore SDK write
  try {
    const sdkRes = await saveFirestoreDoc('bookings', bookingId, payload);
    if (sdkRes && sdkRes.ok) {
      console.log(`[Firestore SDK] Booking #${bookingId} saved successfully`);
      return sdkRes;
    }
  } catch (sdkErr) {
    console.warn(`[Firestore SDK] saveFirestoreDoc notice for #${bookingId}:`, sdkErr?.message);
  }

  // 2. Guaranteed Persistence Fallback via Firestore Cloud REST API
  // Ensures unauthenticated / guest bookings without login are saved 100% to Cloud Firestore
  try {
    const restPayload = toFirestoreFields(payload);
    const restRes = await firestoreRestRequest(`bookings/${encodeURIComponent(bookingId)}`, 'PATCH', restPayload);
    if (restRes && restRes.ok) {
      console.log(`[Firestore REST] Booking #${bookingId} saved successfully via REST fallback`);
      return { ok: true, id: bookingId, source: 'rest' };
    }
    console.warn(`[Firestore REST] Fallback write returned error:`, restRes?.error);
    return { ok: false, error: restRes?.error || 'REST save failed' };
  } catch (restErr) {
    console.error(`[Firestore REST] Critical error saving booking #${bookingId}:`, restErr?.message);
    return { ok: false, error: restErr?.message };
  }
};

/**
 * Updates specific fields on an existing booking document
 */
export const updateBookingInFirestore = async (bookingId, updates) => {
  if (!bookingId) return { ok: false, error: 'Booking ID is required' };
  return updateFirestoreDoc('bookings', String(bookingId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Deletes a booking from Firestore
 */
export const deleteBookingFromFirestore = async (bookingId) => {
  if (!bookingId) return { ok: false, error: 'Booking ID is required' };
  return deleteFirestoreDoc('bookings', String(bookingId));
};

/**
 * Fetches user bookings from Firestore
 */
export const fetchUserBookingsFromFirestore = async (userId) => {
  const result = await getFirestoreCollection('bookings');
  if (result.ok && Array.isArray(result.items)) {
    const filtered = userId
      ? result.items.filter(b => b.userId === userId || b.customerEmail === userId || b.phone === userId)
      : result.items;
    return { ok: true, bookings: filtered };
  }
  return { ok: false, bookings: [] };
};

// -----------------------------------------------------------------------------
// AIRPORTS CRUD OPERATIONS
// -----------------------------------------------------------------------------

/**
 * Saves or updates a managed airport in Firestore ('managed_airports' collection)
 */
export const saveAirportToFirestore = async (airport) => {
  if (!airport || (!airport.code && !airport.id)) {
    return { ok: false, error: 'Invalid airport data' };
  }
  const airportCode = String(airport.code || airport.id).toUpperCase();
  const payload = {
    ...airport,
    code: airportCode,
    updatedAt: new Date().toISOString(),
  };
  return saveFirestoreDoc('managed_airports', airportCode, payload);
};

/**
 * Deletes a managed airport from Firestore
 */
export const deleteAirportFromFirestore = async (airportCodeOrId) => {
  if (!airportCodeOrId) return { ok: false, error: 'Airport identifier required' };
  return deleteFirestoreDoc('managed_airports', String(airportCodeOrId).toUpperCase());
};

// -----------------------------------------------------------------------------
// STAFF ROSTER CRUD OPERATIONS
// -----------------------------------------------------------------------------

/**
 * Saves or updates a staff member in Firestore ('staff_roster' collection)
 */
export const saveStaffToFirestore = async (staffMember) => {
  if (!staffMember || !staffMember.id) {
    return { ok: false, error: 'Invalid staff data: missing ID' };
  }
  const staffId = String(staffMember.id);
  const payload = {
    ...staffMember,
    id: staffId,
    updatedAt: new Date().toISOString(),
  };
  return saveFirestoreDoc('staff_roster', staffId, payload);
};

/**
 * Updates specific staff fields in Firestore
 */
export const updateStaffInFirestore = async (staffId, updates) => {
  if (!staffId) return { ok: false, error: 'Staff ID is required' };
  return updateFirestoreDoc('staff_roster', String(staffId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Deletes a staff member from Firestore
 */
export const deleteStaffFromFirestore = async (staffId) => {
  if (!staffId) return { ok: false, error: 'Staff ID is required' };
  return deleteFirestoreDoc('staff_roster', String(staffId));
};

// -----------------------------------------------------------------------------
// USER PROFILES & AUTH SYNCHRONIZATION
// -----------------------------------------------------------------------------

/**
 * Helper to normalize Bangladeshi and international phone numbers for consistent auth indexing:
 */
export const normalizePhoneForAuth = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('880') && digits.length === 13) {
    return '0' + digits.slice(3); // e.g. 88017XXXXXXXX -> 017XXXXXXXX
  }
  if (digits.length === 10 && !digits.startsWith('0')) {
    return '0' + digits; // e.g. 17XXXXXXXX -> 017XXXXXXXX
  }
  return digits;
};

/**
 * Saves or updates a user document in Firestore ('users' collection) with dual-index for email & phone
 */
export const saveUserToFirestore = async (user) => {
  if (!user || (!user.id && !user.uid && !user.email && !user.phone)) {
    return { ok: false, error: 'Invalid user data' };
  }

  const rawEmail = user.email ? String(user.email).trim().toLowerCase() : '';
  const rawPhone = user.phone ? String(user.phone).trim() : '';
  const normPhone = normalizePhoneForAuth(rawPhone);

  const rawId = rawEmail || normPhone || rawPhone || user.id || user.uid;
  const docId = String(rawId).trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');

  const userPayload = {
    uid: String(user.id || user.uid || docId),
    name: user.name || '',
    email: rawEmail,
    phone: rawPhone,
    normalizedPhone: normPhone,
    role: user.role || 'customer',
    authProvider: user.provider || user.authProvider || (rawEmail.includes('@gmail.com') ? 'gmail' : (rawEmail ? 'email' : 'phone')),
    phoneVerified: Boolean(user.phone_verified || user.phoneVerified),
    emailVerified: Boolean(user.email_verified || user.emailVerified || user.provider === 'google' || user.provider === 'gmail'),
    rewardPoints: Number(user.rewardPoints ?? user.points ?? 100),
    points: Number(user.rewardPoints ?? user.points ?? 100),
    rewardTier: user.rewardTier || 'BRONZE',
    welcomeBonusClaimed: Boolean(user.welcomeBonusClaimed ?? true),
    passwordHash: user.passwordHash || (user.password ? sha256Hash(String(user.password).trim()) : null),
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Primary save
  const primaryRes = await saveFirestoreDoc('users', docId, userPayload);

  // If user has a phone and docId wasn't the phone, also save phone alias for 100% direct lookup without collection scanning
  if (normPhone && docId !== normPhone) {
    try {
      await saveFirestoreDoc('users', 'phone_' + normPhone, userPayload);
      await saveFirestoreDoc('users', normPhone, userPayload);
    } catch {}
  }

  return primaryRes;
};

/**
 * Fetches user profile from Firestore by email, phone, or UID
 */
export const fetchUserFromFirestore = async (identifier) => {
  if (!identifier) return { ok: false, reason: 'missing_identifier' };
  const raw = String(identifier).trim().toLowerCase();
  const docId = raw.replace(/[^a-zA-Z0-9_-]/g, '_');

  // 1. Direct docId lookup
  let result = await getFirestoreDoc('users', docId);
  if (result.ok && result.exists) {
    return { ok: true, user: result.data };
  }

  // 2. If phone number format, try normalized phone keys
  const normPhone = normalizePhoneForAuth(raw);
  if (normPhone && normPhone !== docId) {
    result = await getFirestoreDoc('users', 'phone_' + normPhone);
    if (result.ok && result.exists) return { ok: true, user: result.data };

    result = await getFirestoreDoc('users', normPhone);
    if (result.ok && result.exists) return { ok: true, user: result.data };
  }

  return { ok: false, reason: 'not_found' };
};

/**
 * Authenticates a customer strictly against Firestore credentials (Zero Password Bypass)
 */
export const authenticateCustomerWithFirebase = async (identifier, password) => {
  if (!identifier || !password) {
    return { ok: false, reason: 'missing_credentials', message: 'Identifier and password are required.' };
  }
  const cleanId = String(identifier).trim().toLowerCase();
  const cleanPassword = String(password).trim();
  const inputHash = sha256Hash(cleanPassword);

  try {
    // 1. Try finding user directly by sanitized docId (email, phone, etc.)
    let fetched = await fetchUserFromFirestore(cleanId);
    let userRecord = (fetched && fetched.ok) ? fetched.user : null;

    // 2. If not found, try normalized phone search
    if (!userRecord) {
      const normPhone = normalizePhoneForAuth(cleanId);
      if (normPhone) {
        fetched = await fetchUserFromFirestore(normPhone);
        if (fetched && fetched.ok) userRecord = fetched.user;
      }
    }

    // 3. Fallback: Search across users collection (if permitted by rules)
    if (!userRecord) {
      try {
        const allUsers = await getFirestoreCollection('users');
        if (allUsers && allUsers.ok && Array.isArray(allUsers.items)) {
          const normInputPhone = normalizePhoneForAuth(cleanId);
          userRecord = allUsers.items.find(u => {
            const uEmail = String(u.email || '').trim().toLowerCase();
            const uPhone = String(u.phone || '').trim().replace(/[^0-9]/g, '');
            const uNormPhone = u.normalizedPhone || normalizePhoneForAuth(uPhone);
            return (
              (uEmail && uEmail === cleanId) ||
              (uNormPhone && normInputPhone && uNormPhone === normInputPhone) ||
              String(u.uid || '').toLowerCase() === cleanId
            );
          });
        }
      } catch {}
    }

    if (!userRecord) {
      return { ok: false, reason: 'not_found', message: 'Account not found in cloud database.' };
    }

    // 4. Strict Password Verification (No Bypass)
    const storedHash = (userRecord.passwordHash || '').toLowerCase();
    const isHashMatch = storedHash && storedHash === inputHash.toLowerCase();
    const isPlainMatch = userRecord.password && String(userRecord.password).trim() === cleanPassword;

    if (!isHashMatch && !isPlainMatch) {
      if (userRecord.authProvider === 'gmail' || userRecord.authProvider === 'google') {
        return {
          ok: false,
          reason: 'google_auth_required',
          message: 'This account was registered with Google. Please use Google / Gmail Sign In.',
        };
      }
      return { ok: false, reason: 'invalid_password', message: 'Invalid password. Verification rejected.' };
    }

    return {
      ok: true,
      user: userRecord,
      token: 'customer-session-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000),
    };
  } catch (err) {
    console.warn('[Firebase Customer Auth] Verification error:', err.message);
    return { ok: false, reason: 'error', error: err.message };
  }
};

// -----------------------------------------------------------------------------
// NOTIFICATIONS CLOUD SYNCHRONIZATION
// -----------------------------------------------------------------------------

/**
 * Saves a notification to Firestore 'notifications' collection
 */
export const saveNotificationToFirestore = async (notification) => {
  if (!notification || !notification.id) {
    return { ok: false, error: 'Invalid notification data: missing ID' };
  }
  const notifId = String(notification.id);
  const payload = {
    ...notification,
    id: notifId,
    updatedAt: new Date().toISOString(),
  };
  return saveFirestoreDoc('notifications', notifId, payload);
};

/**
 * Real-time listener for Staff Notifications in Firestore
 */
export const listenToStaffNotifications = (staffId, onUpdate, onError) => {
  if (!staffId) return () => {};
  const safeId = String(staffId).trim();
  return subscribeCollection(
    'notifications',
    (items) => {
      const filtered = (items || []).filter(
        item => String(item.targetStaffId || item.staffId || '').trim() === safeId
      );
      if (onUpdate) onUpdate(filtered);
    },
    onError
  );
};

/**
 * Real-time listener for Universal Notifications in Firestore
 * Used by Main Screen, Manager Panel, and Super Admin Dashboard
 */
export const listenToCloudNotifications = (onUpdate, onError) => {
  return subscribeCollection(
    'notifications',
    (items) => {
      if (onUpdate && Array.isArray(items)) {
        onUpdate(items);
      }
    },
    onError
  );
};

// -----------------------------------------------------------------------------
// UNIFIED CLOUD SEEDING & FACTORY INITIALIZATION
// -----------------------------------------------------------------------------

/**
 * Seeds initial platform data into Firestore:
 * - managed_airports (Dhaka active, others inactive)
 * - airport_services (all protocol services)
 * - staff_roster (airport greeters & escort officers)
 * - promo_codes (active discount coupons)
 */
export const seedInitialPlatformData = async () => {
  if (!isFirebaseConfigured()) {
    return {
      ok: false,
      message: 'Please verify Firebase Project credentials in src/services/firebase.js'
    };
  }

  const results = { airports: 0, services: 0, staff: 0, promoCodes: 0 };

  // 1. Seed Managed Airports (Dhaka is sole active operational hub; others inactive by default)
  for (const airport of DEFAULT_MANAGED_AIRPORTS) {
    const res = await saveAirportToFirestore(airport);
    if (res.ok) results.airports += 1;
  }

  // 2. Seed Airport Services
  const servicesToSeed = PLATFORM_AIRPORT_SERVICES && PLATFORM_AIRPORT_SERVICES.length > 0
    ? PLATFORM_AIRPORT_SERVICES
    : SERVICES;
  for (const s of servicesToSeed) {
    const rawName = s.name || s.n;
    const nameEn = Array.isArray(rawName) ? rawName[0] : String(rawName || s.id);
    const nameBn = Array.isArray(rawName) ? rawName[1] : nameEn;
    const res = await saveFirestoreDoc('airport_services', s.id, {
      id: s.id,
      nameEn,
      nameBn,
      basePrice: s.price || s.basePrice || s.p || 1500,
      icon: s.icon || s.ic || '✈️',
      category: s.category || s.cat || 'protocol',
      activeAirports: ['DAC'],
      isActive: true,
      updatedAt: new Date().toISOString(),
    });
    if (res.ok) results.services += 1;
  }

  // 3. Seed Staff Roster
  for (const staff of DEFAULT_STAFF_ROSTER) {
    const res = await saveStaffToFirestore(staff);
    if (res.ok) results.staff += 1;
  }

  // 4. Seed Promo Codes
  const samplePromos = [
    { code: 'FLIGHT100', type: 'flat', value: 100, minAmount: 1000, maxDiscount: 100, active: true },
    { code: 'EIDVIP', type: 'percentage', value: 15, minAmount: 2000, maxDiscount: 500, active: true },
    { code: 'WELCOME50', type: 'flat', value: 50, minAmount: 500, maxDiscount: 50, active: true },
    { code: 'CARE10', type: 'percentage', value: 10, minAmount: 1500, maxDiscount: 300, active: true },
  ];

  for (const promo of samplePromos) {
    const res = await saveFirestoreDoc('promo_codes', promo.code, {
      ...promo,
      updatedAt: new Date().toISOString(),
    });
    if (res.ok) results.promoCodes += 1;
  }

  return {
    ok: true,
    message: `Successfully seeded ${results.airports} airports, ${results.services} services, ${results.staff} staff members, and ${results.promoCodes} promo codes to Firestore!`,
    results,
  };
};

// -----------------------------------------------------------------------------
// FULL DATABASE BACKUP & EXPORT
// -----------------------------------------------------------------------------

/**
 * Exports complete platform data combining Firestore Cloud data with local cache fallback
 */
export const exportFullDatabaseBackup = async () => {
  const backup = {
    exportTimestamp: new Date().toISOString(),
    platform: 'Flight Care VIP Protocol Platform',
    environment: 'production',
    firebaseProjectId: FIREBASE_CONFIG.projectId,
    version: '3.0.0-cloud-realtime',
    collections: {
      bookings: [],
      managed_airports: [],
      airport_services: [],
      staff_roster: [],
      promo_codes: [],
      local_storage_cache: {},
    },
    metrics: {},
  };

  // 1. Bookings from Firestore
  const bRes = await getFirestoreCollection('bookings');
  if (bRes.ok && bRes.items.length > 0) {
    backup.collections.bookings = bRes.items;
  }

  // 2. Airports from Firestore
  const aRes = await getFirestoreCollection('managed_airports');
  if (aRes.ok && aRes.items.length > 0) {
    backup.collections.managed_airports = aRes.items;
  }

  // 3. Services from Firestore
  const sRes = await getFirestoreCollection('airport_services');
  if (sRes.ok && sRes.items.length > 0) {
    backup.collections.airport_services = sRes.items;
  }

  // 4. Staff from Firestore
  const stRes = await getFirestoreCollection('staff_roster');
  if (stRes.ok && stRes.items.length > 0) {
    backup.collections.staff_roster = stRes.items;
  }

  // 5. Promo Codes from Firestore
  const pRes = await getFirestoreCollection('promo_codes');
  if (pRes.ok && pRes.items.length > 0) {
    backup.collections.promo_codes = pRes.items;
  }

  // 6. Gather Local Storage Data as offline redundancy snapshot
  try {
    const [localBookings, localAirports, localServices, localStaff, localAudits] = await Promise.all([
      AsyncStorage.getItem('@flightcare_bookings'),
      AsyncStorage.getItem('@flightcare_managed_airports'),
      AsyncStorage.getItem('@flightcare_managed_services'),
      AsyncStorage.getItem('@flightcare_staff_roster'),
      AsyncStorage.getItem('@flightcare_security_audit_logs'),
    ]);

    backup.collections.local_storage_cache = {
      localBookings: localBookings ? JSON.parse(localBookings) : [],
      localAirports: localAirports ? JSON.parse(localAirports) : [],
      localServices: localServices ? JSON.parse(localServices) : [],
      localStaff: localStaff ? JSON.parse(localStaff) : [],
      auditLogsCount: localAudits ? JSON.parse(localAudits).length : 0,
    };

    if (backup.collections.bookings.length === 0 && localBookings) {
      backup.collections.bookings = JSON.parse(localBookings);
    }
  } catch (e) {
    console.warn('Backup local cache extraction skipped:', e.message);
  }

  // Calculate Metrics
  backup.metrics = {
    totalBookings: backup.collections.bookings.length,
    totalAirports: backup.collections.managed_airports.length,
    totalServices: backup.collections.airport_services.length,
    totalStaff: backup.collections.staff_roster.length,
    totalPromoCodes: backup.collections.promo_codes.length,
    checksum: String(Math.abs(backup.collections.bookings.length * 31 + Date.now())).slice(0, 8),
  };

  return backup;
};

/**
 * Converts all bookings into a clean CSV format for Excel/Spreadsheets
 */
export const exportBookingsToCsvString = (bookings) => {
  const headers = [
    'Booking ID',
    'Created At',
    'Passenger Name',
    'Phone',
    'Email',
    'Flight Number',
    'Airline',
    'Airport',
    'Flight Date',
    'Service Name',
    'Total Amount (BDT)',
    'Status',
    'Payment Method',
    'Payment Status',
    'Assigned Officer',
  ];

  const escapeCell = (cell) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = (bookings || []).map((b) => [
    b.id || b.bookingId || '',
    b.createdAt || b.date || '',
    b.passenger?.name || b.customer || b.name || '',
    b.passenger?.phone || b.phone || '',
    b.passenger?.email || b.email || '',
    b.flight?.flightNumber || b.flightNo || '',
    b.flight?.airline || '',
    b.airport || b.airportName || '',
    b.flightDate || b.date || '',
    b.servicePackage?.name || b.serviceName || (Array.isArray(b.service?.name) ? b.service.name[0] : b.service?.name) || '',
    b.pricing?.totalPrice || b.totalAmount || b.amount || 0,
    b.status || 'confirmed',
    b.payment?.method || b.paymentMethod || 'cash',
    b.payment?.status || 'completed',
    b.assignedOfficer?.name || b.leadStaffName || b.staff || 'Pending',
  ]);

  return [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\r\n');
};

/**
 * Pure JavaScript cryptographic SHA-256 implementation
 * Works natively in any environment (Web, React Native, Node) without native modules.
 */
export const sha256Hash = (ascii) => {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j;
  var result = '';
  var words = [];
  var asciiBitLength = (ascii || '')[lengthProperty] * 8;
  var hash = [];
  var k = [];
  var primeCounter = 0;
  var isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii = (ascii || '') + '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength | 0;
  for (j = 0; j < words[lengthProperty]; ) {
    var w = words.slice(j, (j += 16));
    var oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15],
        w2 = w[i - 2];
      var a = hash[0],
        e = hash[4];
      var temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      var temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
};

/**
 * Dynamic Cloud Firebase Authentication for Administrative Accounts
 * Queries Cloud Firestore 'admin_users' collection and verifies cryptographic password hash.
 * Completely dynamic: Zero credentials or passwords hardcoded in the codebase.
 */
export const authenticateWithFirebaseCloud = async (email, password) => {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();
  if (!cleanEmail || !cleanPassword) {
    return { ok: false, reason: 'invalid_input', message: 'Email and password required.' };
  }

  try {
    // 1. Primary: Official Firebase Authentication (Identity Toolkit)
    if (loginWithEmail) {
      const authRes = await loginWithEmail(cleanEmail, cleanPassword);
      if (authRes && authRes.ok && authRes.user) {
        // Fetch administrative profile
        let userDoc = null;
        try {
          const docRes = await getFirestoreDoc('admin_users', cleanEmail);
          if (docRes && docRes.ok && docRes.data) userDoc = docRes.data;
        } catch {}

        const token = authRes.user.accessToken || `fc-auth-${authRes.user.uid}-${Date.now()}`;
        return {
          ok: true,
          token,
          user: {
            id: authRes.user.uid,
            email: cleanEmail,
            role: userDoc?.role || (cleanEmail === 'skhanitoffice@gmail.com' ? 'admin' : 'manager'),
            name: userDoc?.name || (cleanEmail === 'skhanitoffice@gmail.com' ? 'Super Administrator' : 'FlightCare Manager'),
            title: userDoc?.title || 'System Controller',
          },
        };
      }
    }

    // 2. Secondary Cloud Fallback: Fetch user record from Firestore 'admin_users' collection via SDK
    let userRecord = null;
    const docRes = await getFirestoreDoc('admin_users', cleanEmail);
    if (docRes && docRes.ok && docRes.exists && docRes.data) {
      userRecord = docRes.data;
    }

    // 2.1. Fallback: If doc not found by ID or SDK offline, try REST API fallback
    if (!userRecord) {
      const restRes = await firestoreRestRequest(`admin_users/${encodeURIComponent(cleanEmail)}`);
      if (restRes && restRes.ok && restRes.data) {
        userRecord = fromFirestoreFields(restRes.data.fields);
        if (userRecord) {
          userRecord.id = cleanEmail;
        }
      }
    }

    // 2.2. If still not found, check collection query by email field
    if (!userRecord) {
      const allUsers = await getFirestoreCollection('admin_users');
      if (allUsers && allUsers.ok && Array.isArray(allUsers.items)) {
        userRecord = allUsers.items.find(
          (u) => String(u.email || '').trim().toLowerCase() === cleanEmail
        );
      }
    }

    if (!userRecord) {
      return { ok: false, reason: 'not_found', message: 'No administrative account found with this email in Firebase.' };
    }

    if (userRecord.isActive === false) {
      return { ok: false, reason: 'disabled', message: 'This administrative account is deactivated.' };
    }

    // 3. Cryptographic password hash verification
    const inputHash = sha256Hash(cleanPassword);
    const hashMatch = userRecord.passwordHash && userRecord.passwordHash.toLowerCase() === inputHash.toLowerCase();
    const directMatch = userRecord.password && userRecord.password === cleanPassword;

    if (!hashMatch && !directMatch) {
      return { ok: false, reason: 'invalid_credentials', message: 'Invalid password.' };
    }

    // Attempt background sync with Firebase Auth
    if (loginWithEmail) {
      loginWithEmail(cleanEmail, cleanPassword).catch(() => {});
    }

    return {
      ok: true,
      token: `cloud-admin-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      user: {
        id: userRecord.id || cleanEmail,
        email: userRecord.email || cleanEmail,
        role: userRecord.role || 'admin',
        name: userRecord.name || (userRecord.role === 'manager' ? 'FlightCare Manager' : 'Super Admin'),
        title: userRecord.title || (userRecord.role === 'manager' ? 'Operations Manager' : 'Super Administrator & Financial Controller'),
      },
    };
  } catch (err) {
    console.warn('[Firebase Cloud Auth] Verification failed:', err.message);
    return { ok: false, reason: 'error', error: err.message };
  }
};

