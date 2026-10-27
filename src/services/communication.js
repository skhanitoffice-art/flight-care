import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORT_PHONE, SUPPORT_EMAIL } from '../constants/theme';

export const COMM_LOGS_STORAGE = '@flightcare_comm_logs';

export const COMMUNICATION_EVENTS = {
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  STAFF_ASSIGNED: 'STAFF_ASSIGNED',
  SERVICE_MILESTONE: 'SERVICE_MILESTONE',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
};

// Retrieve all communication logs from persistent storage
export async function getCommunicationLogs() {
  try {
    const raw = await AsyncStorage.getItem(COMM_LOGS_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error reading communication logs:', err);
    return [];
  }
}

// Save a single log entry or append to communication logs
export async function saveCommunicationLog(logEntry) {
  try {
    const existing = await getCommunicationLogs();
    const entryWithId = {
      id: logEntry.id || `COMM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: logEntry.timestamp || new Date().toISOString(),
      status: 'delivered',
      ...logEntry,
    };
    const updated = [entryWithId, ...existing.slice(0, 199)]; // Keep latest 200 logs
    await AsyncStorage.setItem(COMM_LOGS_STORAGE, JSON.stringify(updated));
    return entryWithId;
  } catch (err) {
    console.warn('Error saving communication log:', err);
    return null;
  }
}

// Get communication logs specific to a booking
export async function getBookingCommunicationLogs(bookingId) {
  const allLogs = await getCommunicationLogs();
  if (!bookingId) return allLogs;
  return allLogs.filter(log => String(log.bookingId) === String(bookingId));
}

// Clear communication logs
export async function clearCommunicationLogs() {
  try {
    await AsyncStorage.removeItem(COMM_LOGS_STORAGE);
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// TEMPLATE GENERATORS (English & Bengali)
// ==========================================

export function buildTemplates({ eventType, booking = {}, payload = {}, lang = 0 }) {
  const isBn = Boolean(lang);
  const bookingId = booking.id || 'FC-PENDING';
  const flightNo = booking.flight?.number || booking.flightNumber || 'FLIGHT';
  const flightDate = booking.flight?.date || booking.flightDate || 'Scheduled Date';
  const airport = booking.airport || booking.airportCode || 'DAC';
  const terminal = booking.flight?.terminal || booking.terminal || 'Terminal 1';
  const passengerName =
    booking.passengerName ||
    booking.name ||
    (booking.passengers && booking.passengers[0]?.name) ||
    'Valued Passenger';
  const passengerPhone = booking.passengerPhone || booking.phone || '';
  const passengerEmail = booking.passengerEmail || booking.email || '';
  const amount = payload.amount || booking.amount || 0;
  const trxId = payload.trxId || booking.trxId || `BK9X${Math.floor(100000 + Math.random() * 900000)}`;

  switch (eventType) {
    case COMMUNICATION_EVENTS.BOOKING_CONFIRMED: {
      return {
        email: {
          recipient: passengerEmail,
          subject: isBn
            ? `[Flight Care] বুকিং নিশ্চিতকরণ - রেফারেন্স #${bookingId}`
            : `[Flight Care] Booking Confirmation - Ref #${bookingId}`,
          text: isBn
            ? `সম্মানিত ${passengerName},\n\nআপনার ফ্লাইট কেয়ার ভিআইপি প্রোটোকল সার্ভিস সফলভাবে বুকিং করা হয়েছে।\n\nবুকিং আইডি: ${bookingId}\nফ্লাইট: ${flightNo}\nতারিখ: ${flightDate}\nবিমানবন্দর: ${airport} (${terminal})\nমোট বিল: ৳${amount}\n\n🛡️ [বাধ্যতামূলক লাগেজ ও নিরাপত্তা ঘোষণা]:\nবুকিংয়ের শর্তানুযায়ী নিশ্চিত করা হয়েছে যে আপনার লাগেজে কোনো প্রকার জীবিত প্রাণী, অলংকার, দেশী-বিদেশী মুদ্রা, মাদকদ্রব্য, গোলাবারুদ, বিপজ্জনক দ্রব্য বা কোনো বেআইনি/নিষিদ্ধ পণ্য নেই।\n\nআমাদের টিম বিমানবন্দরে আপনার সেবায় প্রস্তুত থাকবে। যে কোনো সহায়তায় কল করুন: ${SUPPORT_PHONE}\n\nফ্লাইট কেয়ার বাংলাদেশ`
            : `Dear ${passengerName},\n\nYour Flight Care VIP protocol service booking has been confirmed.\n\nBooking Reference: ${bookingId}\nFlight: ${flightNo}\nDate: ${flightDate}\nAirport: ${airport} (${terminal})\nTotal Amount: ৳${amount}\n\n🛡️ [BAGGAGE & SECURITY COMPLIANCE]:\nPer confirmed terms, passenger luggage contains NO prohibited items including domestic/foreign currencies, jewelry, live animals, narcotics, weapons/ammunition, hazardous materials, or illegal goods.\n\nOur protocol team is on standby at the airport. For 24/7 assistance, call: ${SUPPORT_PHONE}\n\nFlight Care Bangladesh`,
        },
        sms: {
          recipient: passengerPhone,
          message: isBn
            ? `Flight Care: বুকিং #${bookingId} নিশ্চিত হয়েছে। ফ্লাইট: ${flightNo}, বিমানবন্দর: ${airport} (${terminal})। দ্রষ্টব্য: লাগেজে মুদ্রা, অলংকার, প্রাণী বা নিষিদ্ধ পণ্য বহন সম্পূর্ণ নিষেধ। হেল্পলাইন: ${SUPPORT_PHONE}`
            : `Flight Care: Booking #${bookingId} confirmed. Flight: ${flightNo}, Airport: ${airport} (${terminal}). Note: Luggage must not contain cash, jewelry, animals, or prohibited goods. Helpline: ${SUPPORT_PHONE}`,
        },
        inApp: {
          title: isBn ? 'বুকিং নিশ্চিত হয়েছে!' : 'Booking Confirmed!',
          body: isBn
            ? `বুকিং #${bookingId} সফলভাবে সম্পন্ন হয়েছে। বিমানবন্দর: ${airport}`
            : `Booking #${bookingId} confirmed successfully. Airport: ${airport}`,
          category: 'booking',
        },
      };
    }

    case COMMUNICATION_EVENTS.PAYMENT_SUCCESS: {
      return {
        email: {
          recipient: passengerEmail,
          subject: isBn
            ? `[Flight Care] বিকাশ পেমেন্ট রসিদ - TrxID: ${trxId}`
            : `[Flight Care] bKash Payment Receipt - TrxID: ${trxId}`,
          text: isBn
            ? `সম্মানিত ${passengerName},\n\nআপনার বিকাশ পেমেন্ট সফলভাবে গৃহীত হয়েছে।\n\nবুকিং আইডি: ${bookingId}\nপেমেন্ট মেথড: bKash PGW\nট্রানজেকশন আইডি (TrxID): ${trxId}\nপরিশোধিত অর্থ: ৳${amount}\nস্ট্যাটাস: পেইড (Paid)\nতারিখ: ${new Date().toLocaleString('bn-BD')}\n\nধন্যবাদ,\nফ্লাইট কেয়ার পেমেন্ট সিস্টেম`
            : `Dear ${passengerName},\n\nYour bKash payment has been successfully processed.\n\nBooking Reference: ${bookingId}\nPayment Method: bKash PGW\nTransaction ID (TrxID): ${trxId}\nAmount Paid: ৳${amount}\nPayment Status: Paid\nTimestamp: ${new Date().toLocaleString('en-GB')}\n\nThank you for choosing Flight Care!`,
        },
        sms: {
          recipient: passengerPhone,
          message: isBn
            ? `Flight Care: বিকাশ পেমেন্ট ৳${amount} সফলভাবে সম্পন্ন হয়েছে। TrxID: ${trxId}। বুকিং #${bookingId} সম্পূর্ণ পরিশোধিত। হেল্পলাইন: ${SUPPORT_PHONE}`
            : `Flight Care: Payment of BDT ${amount} received via bKash. TrxID: ${trxId}. Booking #${bookingId} is fully paid. Helpline: ${SUPPORT_PHONE}`,
        },
        inApp: {
          title: isBn ? 'বিকাশ পেমেন্ট সফল!' : 'bKash Payment Verified!',
          body: isBn
            ? `৳${amount} পরিশোধ সফল হয়েছে (TrxID: ${trxId})`
            : `Payment of ৳${amount} received (TrxID: ${trxId})`,
          category: 'payment',
        },
      };
    }

    case COMMUNICATION_EVENTS.STAFF_ASSIGNED: {
      const staffName = payload.staffName || payload.name || 'Protocol Officer';
      const staffPhone = payload.staffPhone || payload.phone || SUPPORT_PHONE;
      const meetingPoint = payload.meetingPoint || `${terminal} VIP Entrance / Arrival Gate`;

      return {
        email: {
          recipient: passengerEmail,
          subject: isBn
            ? `[Flight Care] প্রোটোকল কর্মকর্তা নিযুক্ত - বুকিং #${bookingId}`
            : `[Flight Care] Protocol Staff Assigned - Booking #${bookingId}`,
          text: isBn
            ? `সম্মানিত ${passengerName},\n\nআপনার বুকিং #${bookingId}-এর জন্য প্রোটোকল কর্মকর্তা নিযুক্ত করা হয়েছে।\n\nকর্মকর্তার নাম: ${staffName}\nমোবাইল নম্বর: ${staffPhone}\nসাক্ষাতের স্থান: ${meetingPoint}\nফ্লাইট: ${flightNo}\nবিমানবন্দর: ${airport}\n\nবিমানবন্দরে পৌঁছানোর পর প্রোটোকল কর্মকর্তার সাথে যোগাযোগ করুন।`
            : `Dear ${passengerName},\n\nA protocol officer has been assigned to your booking #${bookingId}.\n\nOfficer Name: ${staffName}\nContact Number: ${staffPhone}\nMeeting Point: ${meetingPoint}\nFlight: ${flightNo}\nAirport: ${airport}\n\nPlease contact the protocol officer upon arriving at the airport.`,
        },
        sms: {
          recipient: passengerPhone,
          message: isBn
            ? `Flight Care Protocol: কর্মকর্তা ${staffName} (${staffPhone}) আপনার ফ্লাইট ${flightNo}-এর জন্য নিযুক্ত। সাক্ষাতের স্থান: ${meetingPoint}`
            : `Flight Care Protocol: Officer ${staffName} (${staffPhone}) assigned to flight ${flightNo}. Meeting point: ${meetingPoint}`,
        },
        inApp: {
          title: isBn ? 'প্রোটোকল কর্মকর্তা নিযুক্ত' : 'Protocol Officer Assigned',
          body: isBn
            ? `${staffName} (${staffPhone}) আপনার সেবায় নিযুক্ত হয়েছেন।`
            : `${staffName} (${staffPhone}) is assigned for your assistance.`,
          category: 'service',
        },
      };
    }

    case COMMUNICATION_EVENTS.SERVICE_MILESTONE: {
      const stageName = payload.stageName || payload.stage || 'In Progress';
      const stageNameBn = payload.stageNameBn || stageName;
      const displayStage = isBn ? stageNameBn : stageName;

      return {
        email: {
          recipient: passengerEmail,
          subject: isBn
            ? `[Flight Care] সেবার অগ্রগতি আপডেট - বুকিং #${bookingId}`
            : `[Flight Care] Service Progress Update - Booking #${bookingId}`,
          text: isBn
            ? `সম্মানিত ${passengerName},\n\nআপনার বিমানবন্দর প্রোটোকল সেবার বর্তমান ধাপ: ${displayStage}।\nবুকিং আইডি: ${bookingId}\nফ্লাইট: ${flightNo}\n\nফ্লাইট কেয়ার সার্ভিস টিম`
            : `Dear ${passengerName},\n\nYour protocol service status has been updated: ${displayStage}.\nBooking Reference: ${bookingId}\nFlight: ${flightNo}\n\nFlight Care Service Team`,
        },
        sms: {
          recipient: passengerPhone,
          message: isBn
            ? `Flight Care আপডেট: বুকিং #${bookingId}-এর সেবা বর্তমানে '${displayStage}' ধাপে রয়েছে।`
            : `Flight Care Update: Booking #${bookingId} service milestone is now '${displayStage}'.`,
        },
        inApp: {
          title: isBn ? `সেবা আপডেট: ${displayStage}` : `Service Update: ${displayStage}`,
          body: isBn
            ? `বুকিং #${bookingId}-এর অগ্রগতি সফলভাবে আপডেট করা হয়েছে।`
            : `Progress updated for booking #${bookingId}.`,
          category: 'service',
        },
      };
    }

    case COMMUNICATION_EVENTS.BOOKING_CANCELLED: {
      const refundAmount = payload.refundAmount != null ? payload.refundAmount : amount;
      const cancellationFee = payload.cancellationFee || 0;

      return {
        email: {
          recipient: passengerEmail,
          subject: isBn
            ? `[Flight Care] বুকিং বাতিল ও রিফান্ড নোটিশ - #${bookingId}`
            : `[Flight Care] Cancellation & Refund Notice - #${bookingId}`,
          text: isBn
            ? `সম্মানিত ${passengerName},\n\nআপনার বুকিং #${bookingId} বাতিল করা হয়েছে।\n\nবাতিলকরণ ফি: ৳${cancellationFee}\nরিফান্ডযোগ্য অর্থ: ৳${refundAmount}\nরিফান্ড মাধ্যম: বিকাশ ওয়ালেট\n\nরিফান্ডের অর্থ ৩ কার্যদিবসের মধ্যে আপনার বিকাশ অ্যাকাউন্টে পৌঁছে যাবে। সহায়তায়: ${SUPPORT_PHONE}`
            : `Dear ${passengerName},\n\nYour booking #${bookingId} has been cancelled.\n\nCancellation Fee: ৳${cancellationFee}\nRefund Amount: ৳${refundAmount}\nRefund Channel: bKash Wallet\n\nRefunds are processed within 1-3 business days. Support: ${SUPPORT_PHONE}`,
        },
        sms: {
          recipient: passengerPhone,
          message: isBn
            ? `Flight Care: বুকিং #${bookingId} বাতিল করা হয়েছে। ৳${refundAmount} বিকাশ রিফান্ড প্রক্রিয়াধীন। হেল্পলাইন: ${SUPPORT_PHONE}`
            : `Flight Care: Booking #${bookingId} cancelled. Refund of BDT ${refundAmount} initiated to bKash wallet. Helpline: ${SUPPORT_PHONE}`,
        },
        inApp: {
          title: isBn ? 'বুকিং বাতিল ও রিফান্ড' : 'Booking Cancelled & Refunded',
          body: isBn
            ? `বুকিং #${bookingId} বাতিল। রিফান্ড: ৳${refundAmount}`
            : `Booking #${bookingId} cancelled. Refund: ৳${refundAmount}`,
          category: 'booking',
        },
      };
    }

    default:
      return null;
  }
}

// ==========================================
// MULTI-CHANNEL DISPATCHER
// ==========================================

export async function dispatchMultiChannelNotification({
  eventType,
  booking = {},
  payload = {},
  preferences = { in_app: true, email: true, sms: true },
  lang = 0,
  notifyFn = null,
}) {
  const templates = buildTemplates({ eventType, booking, payload, lang });
  if (!templates) return { ok: false, reason: 'unknown_event' };

  const results = {
    inApp: false,
    sms: false,
    email: false,
    logs: [],
  };

  const bookingId = booking.id || payload.bookingId || 'FC-SYSTEM';

  // 1. In-App Notification
  if (preferences.in_app !== false && templates.inApp) {
    if (typeof notifyFn === 'function') {
      notifyFn(templates.inApp.title, templates.inApp.body, templates.inApp.category);
    }
    const log = await saveCommunicationLog({
      bookingId,
      channel: 'push',
      type: eventType,
      recipient: booking.passengerName || booking.name || 'User',
      title: templates.inApp.title,
      message: templates.inApp.body,
    });
    results.inApp = true;
    if (log) results.logs.push(log);
  }

  // 2. SMS Notification
  const smsRecipient = templates.sms.recipient || booking.passengerPhone || booking.phone;
  if (preferences.sms !== false && smsRecipient) {
    const log = await saveCommunicationLog({
      bookingId,
      channel: 'sms',
      type: eventType,
      recipient: smsRecipient,
      title: 'SMS Alert',
      message: templates.sms.message,
    });
    results.sms = true;
    if (log) results.logs.push(log);
  }

  // 3. Email Notification
  const emailRecipient = templates.email.recipient || booking.passengerEmail || booking.email;
  if (preferences.email !== false && emailRecipient) {
    const log = await saveCommunicationLog({
      bookingId,
      channel: 'email',
      type: eventType,
      recipient: emailRecipient,
      title: templates.email.subject,
      message: templates.email.text,
    });
    results.email = true;
    if (log) results.logs.push(log);
  }

  return { ok: true, ...results };
}

// ==========================================
// PROTOCOL OFFICER NOTIFICATION ENGINE
// ==========================================

export const STAFF_NOTIFICATION_TYPES = {
  ASSIGNMENT: 'ASSIGNMENT',
  SERVICE_COMPLETED: 'SERVICE_COMPLETED',
  CUSTOMER_REVIEW: 'CUSTOMER_REVIEW',
};

export const STAFF_NOTIFS_STORAGE_PREFIX = '@flightcare_staff_notifications_';

/**
 * Dispatch a structured notification specifically to a protocol officer
 * Persists locally and synchronizes to Firebase Firestore 'notifications' collection.
 */
export async function dispatchStaffNotification({
  staffId,
  staffName = 'Protocol Officer',
  type = STAFF_NOTIFICATION_TYPES.ASSIGNMENT,
  title = '',
  body = '',
  bookingId = '',
  passengerName = '',
  passengerPhone = '',
  flight = '',
  airport = 'DAC',
  terminal = 'Terminal 1',
  date = '',
  time = '',
  meetingPoint = '',
  rating = 5,
  comment = '',
  handoverMode = 'signature',
  pointsEarned = 0,
  lang = 0,
}) {
  if (!staffId) {
    console.warn('[Staff Notifications] Missing staffId, cannot dispatch');
    return null;
  }

  const safeStaffId = String(staffId).trim();
  const isBn = Boolean(lang);
  const now = new Date();
  const timestamp = now.toISOString();
  const notifId = `st-notif-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Default localized titles & bodies based on event type if not provided
  let finalTitle = title;
  let finalBody = body;

  if (!finalTitle) {
    if (type === STAFF_NOTIFICATION_TYPES.ASSIGNMENT) {
      finalTitle = isBn
        ? `নতুন প্রোটোকল সার্ভিস বরাদ্দ (বুকিং #${bookingId})`
        : `New Protocol Service Assignment (Booking #${bookingId})`;
    } else if (type === STAFF_NOTIFICATION_TYPES.SERVICE_COMPLETED) {
      finalTitle = isBn
        ? `সার্ভিস সমাপ্তি ও হস্তান্তর নিশ্চিতকরণ (বুকিং #${bookingId})`
        : `Service Completed & Handover Confirmed (Booking #${bookingId})`;
    } else if (type === STAFF_NOTIFICATION_TYPES.CUSTOMER_REVIEW) {
      finalTitle = isBn
        ? `নতুন কাস্টমার রিভিউ ও রেটিং (${rating}★)`
        : `New Customer Review & Rating (${rating}★)`;
    } else {
      finalTitle = isBn ? 'নতুন নোটিফিকেশন' : 'New Notification';
    }
  }

  if (!finalBody) {
    if (type === STAFF_NOTIFICATION_TYPES.ASSIGNMENT) {
      finalBody = isBn
        ? `যাত্রী: ${passengerName || 'সম্মানিত অতিথি'} | ফ্লাইট: ${flight || 'N/A'} | টার্মিনাল: ${terminal} | সাক্ষাত: ${meetingPoint || 'VIP গেট'}। দায়িত্ব গ্রহণের জন্য প্রস্তুত থাকুন।`
        : `Passenger: ${passengerName || 'Guest'} | Flight: ${flight || 'N/A'} | Terminal: ${terminal} | Meeting: ${meetingPoint || 'VIP Gate'}. Please be on standby.`;
    } else if (type === STAFF_NOTIFICATION_TYPES.SERVICE_COMPLETED) {
      finalBody = isBn
        ? `বুকিং #${bookingId}-এর প্রোটোকল সার্ভিস সফলভাবে সম্পন্ন ও হ্যান্ডওভার নিশ্চিত করা হয়েছে। আপনার প্রোফাইলে +১০ পয়েন্ট যোগ হয়েছে।`
        : `Booking #${bookingId} service successfully concluded and handed over. +10 protocol points awarded.`;
    } else if (type === STAFF_NOTIFICATION_TYPES.CUSTOMER_REVIEW) {
      finalBody = isBn
        ? `যাত্রী ${passengerName || 'কাস্টমার'} আপনাকে ${rating}★ রেটিং দিয়েছেন${comment ? `: "${comment}"` : ''}। অর্জিত পয়েন্ট: +${rating >= 5 ? 100 : 50}!`
        : `Passenger ${passengerName || 'Customer'} rated your service ${rating}★${comment ? `: "${comment}"` : ''}. Earned points: +${rating >= 5 ? 100 : 50}!`;
    }
  }

  const notificationEntry = {
    id: notifId,
    staffId: safeStaffId,
    targetStaffId: safeStaffId,
    targetRole: 'staff',
    staffName,
    type,
    title: finalTitle,
    body: finalBody,
    bookingId: String(bookingId || ''),
    passengerName: String(passengerName || ''),
    passengerPhone: String(passengerPhone || ''),
    flight: String(flight || ''),
    airport: String(airport || 'DAC'),
    terminal: String(terminal || 'Terminal 1'),
    date: String(date || ''),
    time: String(time || ''),
    meetingPoint: String(meetingPoint || ''),
    rating: Number(rating) || 5,
    comment: String(comment || ''),
    handoverMode: String(handoverMode || 'signature'),
    pointsEarned: Number(pointsEarned) || (type === STAFF_NOTIFICATION_TYPES.CUSTOMER_REVIEW ? (rating >= 5 ? 100 : 50) : type === STAFF_NOTIFICATION_TYPES.SERVICE_COMPLETED ? 10 : 0),
    timestamp,
    createdAt: timestamp,
    read: false,
    status: 'delivered',
  };

  // 1. Save to Local Storage for this Staff Member
  try {
    const storageKey = `${STAFF_NOTIFS_STORAGE_PREFIX}${safeStaffId}`;
    const raw = await AsyncStorage.getItem(storageKey);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [notificationEntry, ...existing.slice(0, 99)]; // Keep latest 100
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Staff Notifications] Error saving to AsyncStorage:', err);
  }

  // 2. Also log into Universal Communication Logs for Audit
  try {
    await saveCommunicationLog({
      bookingId: bookingId || 'STAFF-ACTION',
      channel: 'staff_push',
      type: `STAFF_${type}`,
      recipient: `${staffName} (${safeStaffId})`,
      title: finalTitle,
      message: finalBody,
    });
  } catch {}

  // 3. Sync to Firebase Cloud Firestore ('notifications' collection)
  try {
    const { saveFirestoreDoc } = require('./firebase');
    if (typeof saveFirestoreDoc === 'function') {
      await saveFirestoreDoc('notifications', notifId, notificationEntry);
    }
  } catch (cloudErr) {
    // Non-blocking fallback
    console.log('[Staff Notifications] Cloud sync notice:', cloudErr?.message || cloudErr);
  }

  return notificationEntry;
}

/**
 * Retrieve all notifications for a specific protocol officer
 */
export async function getStaffNotifications(staffId) {
  if (!staffId) return [];
  const safeStaffId = String(staffId).trim();
  const storageKey = `${STAFF_NOTIFS_STORAGE_PREFIX}${safeStaffId}`;

  let localNotifs = [];
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) localNotifs = JSON.parse(raw);
  } catch (err) {
    console.warn('[Staff Notifications] Error reading from AsyncStorage:', err);
  }

  // Attempt to fetch latest from Firestore and merge
  try {
    const { getFirestoreCollection } = require('./firebase');
    if (typeof getFirestoreCollection === 'function') {
      const cloudRes = await getFirestoreCollection('notifications');
      if (cloudRes.ok && Array.isArray(cloudRes.items)) {
        const cloudForStaff = cloudRes.items.filter(
          item => String(item.targetStaffId || item.staffId || '').trim() === safeStaffId
        );
        if (cloudForStaff.length > 0) {
          const map = new Map();
          // Seed with cloud notifications first
          cloudForStaff.forEach(n => map.set(n.id, n));
          // Overlay local notifications (which might have updated `read` state)
          localNotifs.forEach(n => map.set(n.id, { ...(map.get(n.id) || {}), ...n }));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)
          );
          // Update local cache
          await AsyncStorage.setItem(storageKey, JSON.stringify(merged.slice(0, 99)));
          return merged;
        }
      }
    }
  } catch {}

  return localNotifs;
}

/**
 * Mark a single notification as read for a protocol officer
 */
export async function markStaffNotificationAsRead(staffId, notifId) {
  if (!staffId || !notifId) return false;
  const safeStaffId = String(staffId).trim();
  const storageKey = `${STAFF_NOTIFS_STORAGE_PREFIX}${safeStaffId}`;

  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map(item =>
        item.id === notifId ? { ...item, read: true, readAt: new Date().toISOString() } : item
      );
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    }
  } catch {}

  try {
    const { updateFirestoreDoc } = require('./firebase');
    if (typeof updateFirestoreDoc === 'function') {
      await updateFirestoreDoc('notifications', notifId, {
        read: true,
        readAt: new Date().toISOString(),
      });
    }
  } catch {}

  return true;
}

/**
 * Mark all notifications as read for a protocol officer
 */
export async function markAllStaffNotificationsAsRead(staffId) {
  if (!staffId) return false;
  const safeStaffId = String(staffId).trim();
  const storageKey = `${STAFF_NOTIFS_STORAGE_PREFIX}${safeStaffId}`;

  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map(item => ({ ...item, read: true, readAt: new Date().toISOString() }));
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    }
  } catch {}

  return true;
}

/**
 * Clear all notifications for a protocol officer
 */
export async function clearStaffNotifications(staffId) {
  if (!staffId) return false;
  const safeStaffId = String(staffId).trim();
  const storageKey = `${STAFF_NOTIFS_STORAGE_PREFIX}${safeStaffId}`;

  try {
    await AsyncStorage.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
}

export { dispatchBookingLifecycleNotifications } from './notificationService';



