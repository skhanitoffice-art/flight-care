// src/services/notificationService.js
// Flight Care Universal Multi-Channel Notification Engine
// Supports Browser Push, Firestore Cloud Database, In-App Tray & SMS

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { firestoreRestRequest, isFirebaseConfigured } from './firebase.js';
import { toFirestoreFields } from './firebaseSyncService.js';
import { sendLiveSms } from './smsGateway.js';
import { SUPPORT_PHONE } from '../constants/theme';
import { STAFF_NOTIFICATION_TYPES } from './communication';

export const NOTIFICATIONS_STORAGE = '@flightcare_notifications';

/**
 * Requests browser push notification permission (Web / Mobile browser)
 */
export async function requestPushPermission() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const permission = await window.Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('Notification permission error:', e);
      return false;
    }
  }
  return false;
}

/**
 * Triggers native Browser / OS desktop or mobile push notification
 */
export function triggerBrowserPush(title, body, options = {}) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
    if (window.Notification.permission === 'granted') {
      try {
        const notif = new window.Notification(title, {
          body,
          icon: options.icon || 'https://cdn-icons-png.flaticon.com/512/784/784867.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/784/784867.png',
          tag: options.id || `notif-${Date.now()}`,
          requireInteraction: false,
          ...options,
        });
        notif.onclick = () => {
          window.focus();
          if (options.onClick) options.onClick();
        };
        return notif;
      } catch (e) {
        console.warn('Browser notification error:', e);
      }
    }
  }
  return null;
}

/**
 * Sends a notification across all enabled channels:
 * 1. In-App Notification Tray (AsyncStorage + UI)
 * 2. OS / Browser Push Notification Pop-up
 * 3. Google Cloud Firestore Database (notifications collection)
 * 4. SMS (if sendSms is enabled or category is urgent)
 */
export async function dispatchNotification({
  title,
  body,
  category = 'announcement',
  targetUserId = 'all',
  bookingId = null,
  sendSms = false,
  recipientPhone = null,
  icon = '🔔',
}) {
  const notifId = `NTF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const timestamp = new Date().toISOString();

  const notificationRecord = {
    id: notifId,
    title,
    body,
    category,
    targetUserId,
    bookingId: bookingId || '',
    read: false,
    source: 'system',
    createdAt: timestamp,
    created_at: timestamp,
  };

  // 1. Save to local AsyncStorage tray
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [notificationRecord, ...existing.slice(0, 99)];
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error saving local notification:', e);
  }

  // 2. Trigger Browser / Desktop Pop-up Notification
  triggerBrowserPush(title, body, { id: notifId });

  // 3. Persist to Cloud Firestore Database
  if (isFirebaseConfigured()) {
    try {
      const firestorePayload = toFirestoreFields({
        targetUserId: String(targetUserId || 'all'),
        title: String(title),
        body: String(body),
        category: String(category),
        read: false,
        bookingId: String(bookingId || ''),
        source: 'system',
        createdAt: timestamp,
      });
      await firestoreRestRequest(`notifications/${encodeURIComponent(notifId)}`, 'PATCH', firestorePayload);
    } catch (err) {
      console.warn('Firestore notification sync failed:', err);
    }
  }

  // 4. Send Live Telecom SMS if requested or recipient provided
  if (sendSms && recipientPhone) {
    try {
      await sendLiveSms({
        to: recipientPhone,
        message: `[Flight Care] ${title}: ${body}`,
        title: 'Notification SMS',
      });
    } catch (smsErr) {
      console.warn('SMS notification error:', smsErr);
    }
  }

  return {
    ok: true,
    notification: notificationRecord,
  };
}

/**
 * Fetch all notifications for a specific user from Firestore
 */
export async function fetchUserNotificationsFromFirestore(userId) {
  if (!isFirebaseConfigured()) return { ok: false, reason: 'not_configured' };
  try {
    const res = await firestoreRestRequest('notifications');
    if (res.ok && res.data?.documents) {
      const list = res.data.documents.map(d => {
        const id = d.name.split('/').pop();
        // Decode simple fields
        const fields = d.fields || {};
        return {
          id,
          title: fields.title?.stringValue || '',
          body: fields.body?.stringValue || '',
          category: fields.category?.stringValue || 'announcement',
          targetUserId: fields.targetUserId?.stringValue || 'all',
          read: fields.read?.booleanValue || false,
          bookingId: fields.bookingId?.stringValue || '',
          createdAt: fields.createdAt?.stringValue || new Date().toISOString(),
          created_at: fields.createdAt?.stringValue || new Date().toISOString(),
        };
      });
      const filtered = userId ? list.filter(n => n.targetUserId === 'all' || n.targetUserId === userId) : list;
      return { ok: true, notifications: filtered };
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
  return { ok: false, reason: 'empty' };
}

/**
 * Dispatches targeted multi-channel notifications to all 4 roles at each booking step:
 * 1. That Passenger (ঐ যাত্রী)
 * 2. Protocol Officer (প্রটোকল অফিসার)
 * 3. Manager (ম্যানেজার)
 * 4. Super Admin (সুপার এ্যাডমিন)
 */
export async function dispatchBookingLifecycleNotifications({
  stage, // 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  booking = {},
  previousStage = null,
  staff = null,
  extra = {},
  lang = 0,
}) {
  const isBn = lang === 1;
  const bookingId = booking.id || 'FC-PENDING';
  const flightNo = booking.flight?.number || booking.flightNumber || booking.fno || 'Flight';
  const flightDate = booking.flight?.date || booking.flightDate || booking.date || 'Scheduled Date';
  const flightTime = booking.flight?.time || booking.flightTime || booking.time || '';
  const airport = booking.airport || booking.airportCode || 'DAC';
  const terminal = booking.flight?.terminal || booking.terminal || 'Terminal 1';
  const passengerName =
    booking.passengerName ||
    booking.name ||
    booking.customer?.name ||
    (booking.passengers && booking.passengers[0]?.name) ||
    (isBn ? 'সম্মানিত যাত্রী' : 'Valued Passenger');
  const passengerPhone = booking.passengerPhone || booking.phone || '';
  const passengerEmail = booking.passengerEmail || booking.email || '';
  const amount = extra.amount != null ? extra.amount : (booking.amount || 0);
  const paymentStatus = booking.paymentStatus || 'pending';
  const paymentMethod = booking.paymentMethod || 'bKash';
  const assignedStaffName = staff?.name || booking.staff || booking.leadStaffName || (isBn ? 'প্রোটোকল কর্মকর্তা' : 'Protocol Officer');
  const assignedStaffPhone = staff?.phone || booking.staffPhone || booking.leadStaffPhone || SUPPORT_PHONE;
  const meetingPoint = extra.meetingPoint || booking.meetingPoint || `${terminal} VIP Arrival / Departure Gate`;
  const timestamp = new Date().toISOString();

  // Normalize stage string
  const normStage = String(stage || '').toLowerCase().replace(/[ -]/g, '_');

  let paxTitle = '', paxBody = '', paxCategory = 'booking';
  let officerTitle = '', officerBody = '', officerType = 'MILESTONE';
  let mgrTitle = '', mgrBody = '';
  let adminTitle = '', adminBody = '';

  switch (normStage) {
    case 'pending':
    case 'booked':
    case 'payment_pending':
      paxTitle = isBn
        ? `[Flight Care] নতুন বুকিং গ্রহণ করা হয়েছে #${bookingId}`
        : `[Flight Care] Booking Received #${bookingId}`;
      paxBody = isBn
        ? `সম্মানিত ${passengerName}, আপনার বুকিং #${bookingId} (ফ্লাইট: ${flightNo}) সিস্টেমে জমা হয়েছে। পেমেন্ট সম্পন্ন করে বুকিং চূড়ান্ত করুন।`
        : `Dear ${passengerName}, booking #${bookingId} for flight ${flightNo} is received. Please complete payment to confirm your service.`;

      officerTitle = isBn
        ? `[ডিউটি এলার্ট] নতুন বুকিং কিউ #${bookingId}`
        : `[Duty Alert] New Queued Booking #${bookingId}`;
      officerBody = isBn
        ? `ফ্লাইট: ${flightNo} | বিমানবন্দর: ${airport} (${terminal}) | তারিখ: ${flightDate} ${flightTime}। প্রস্তুতি বজায় রাখুন।`
        : `Flight: ${flightNo} | Airport: ${airport} (${terminal}) | Date: ${flightDate} ${flightTime}. Standby for duty.`;
      officerType = 'QUEUED_BOOKING';

      mgrTitle = isBn
        ? `[ম্যানেজার এলার্ট] নতুন বুকিং জমা পড়েছে #${bookingId}`
        : `[Manager Alert] New Booking Submitted #${bookingId}`;
      mgrBody = isBn
        ? `যাত্রী: ${passengerName} (${passengerPhone}) | ফ্লাইট: ${flightNo} | বিল: ৳${amount} (${paymentStatus})। প্রটোকল কর্মকর্তা বরাদ্দ করুন।`
        : `Pax: ${passengerName} (${passengerPhone}) | Flight: ${flightNo} | Amount: ৳${amount} (${paymentStatus}). Assign staff.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] নতুন বুকিং এন্ট্রি #${bookingId}`
        : `[Super Admin] New Booking Registered #${bookingId}`;
      adminBody = isBn
        ? `যাত্রী: ${passengerName} | ফ্লাইট: ${flightNo} | বিমানবন্দর: ${airport} | মোট: ৳${amount} (${paymentStatus})।`
        : `Pax: ${passengerName} | Flight: ${flightNo} | Airport: ${airport} | Amount: ৳${amount} (${paymentStatus}).`;
      break;

    case 'confirmed':
      paxTitle = isBn
        ? `[Flight Care] বুকিং নিশ্চিত করা হয়েছে! #${bookingId}`
        : `[Flight Care] Booking Confirmed! #${bookingId}`;
      paxBody = isBn
        ? `সম্মানিত ${passengerName}, আপনার বুকিং #${bookingId} সফলভাবে নিশ্চিত হয়েছে। ফ্লাইট: ${flightNo}, তারিখ: ${flightDate} ${flightTime} (${terminal})। আমাদের টিম প্রস্তুত রয়েছে।`
        : `Dear ${passengerName}, your booking #${bookingId} is confirmed for Flight: ${flightNo}, Date: ${flightDate} ${flightTime} (${terminal}). Our team is on standby.`;

      officerTitle = isBn
        ? `[অফিসার ডিউটি] বুকিং কনফার্মড #${bookingId}`
        : `[Officer Duty] Booking Confirmed #${bookingId}`;
      officerBody = isBn
        ? `যাত্রী: ${passengerName} | ফ্লাইট: ${flightNo} | বিমানবন্দর: ${airport} (${terminal})। ডিউটির জন্য প্রস্তুত থাকুন।`
        : `Pax: ${passengerName} | Flight: ${flightNo} | Airport: ${airport} (${terminal}). Be ready on duty.`;
      officerType = 'BOOKING_CONFIRMED';

      mgrTitle = isBn
        ? `[ম্যানেজার এলার্ট] বুকিং কনফার্মড #${bookingId}`
        : `[Manager Alert] Booking Confirmed #${bookingId}`;
      mgrBody = isBn
        ? `বুকিং #${bookingId} (${passengerName}) নিশ্চিত। পেমেন্ট: ৳${amount} (${paymentStatus})। প্রোটোকল কর্মকর্তা বরাদ্দ নিশ্চিত করুন।`
        : `Booking #${bookingId} (${passengerName}) confirmed. Paid: ৳${amount} (${paymentStatus}). Allocate protocol officer.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] বুকিং নিশ্চিতকরণ #${bookingId}`
        : `[Super Admin] Booking Confirmed #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId} কনফার্মড। রাজস্ব সংগৃহীত: ৳${amount} (${paymentMethod})। স্ট্যাটাস: কনফার্মড।`
        : `Booking #${bookingId} confirmed. Revenue collected: ৳${amount} (${paymentMethod}). Status: Confirmed.`;
      break;

    case 'assigned':
    case 'staff_assigned':
      paxTitle = isBn
        ? `[Flight Care] প্রোটোকল কর্মকর্তা নিযুক্ত #${bookingId}`
        : `[Flight Care] Protocol Officer Assigned #${bookingId}`;
      paxBody = isBn
        ? `কর্মকর্তা: ${assignedStaffName} (${assignedStaffPhone}) আপনার সেবায় নিযুক্ত হয়েছেন। সাক্ষাতের স্থান: ${meetingPoint}।`
        : `Officer: ${assignedStaffName} (${assignedStaffPhone}) is assigned for your service. Meeting Point: ${meetingPoint}.`;
      paxCategory = 'service';

      officerTitle = isBn
        ? `[🚨 নতুন দায়িত্ব বরাদ্দ] বুকিং #${bookingId}`
        : `[🚨 New Assignment] Protocol Duty #${bookingId}`;
      officerBody = isBn
        ? `আপনাকে বুকিং #${bookingId}-এ দায়িত্ব দেওয়া হয়েছে। যাত্রী: ${passengerName} (${passengerPhone}) | ফ্লাইট: ${flightNo} | টার্মিনাল: ${terminal} | সাক্ষাত: ${meetingPoint}।`
        : `Assigned to booking #${bookingId}. Pax: ${passengerName} (${passengerPhone}) | Flight: ${flightNo} | Terminal: ${terminal} | Meeting: ${meetingPoint}.`;
      officerType = STAFF_NOTIFICATION_TYPES?.ASSIGNMENT || 'assignment';

      mgrTitle = isBn
        ? `[ম্যানেজার] কর্মকর্তা নিয়োগ সম্পন্ন #${bookingId}`
        : `[Manager] Staff Assigned #${bookingId}`;
      mgrBody = isBn
        ? `বুকিং #${bookingId}-এ কর্মকর্তা ${assignedStaffName}-কে দায়িত্ব অর্পণ করা হয়েছে।`
        : `Booking #${bookingId} has been assigned to Officer ${assignedStaffName}.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] স্টাফ অ্যাসাইনমেন্ট #${bookingId}`
        : `[Super Admin] Staff Assigned #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}-এর দায়িত্বে রয়েছেন কর্মকর্তা ${assignedStaffName}। যাত্রী: ${passengerName}।`
        : `Booking #${bookingId} assigned to Officer ${assignedStaffName}. Pax: ${passengerName}.`;
      break;

    case 'accepted':
    case 'in_progress':
    case 'service_started':
      paxTitle = isBn
        ? `[Flight Care] আপনার প্রোটোকল সেবা শুরু হয়েছে #${bookingId}`
        : `[Flight Care] Protocol Service Started #${bookingId}`;
      paxBody = isBn
        ? `কর্মকর্তা ${assignedStaffName} বিমানবন্দরে আপনার সেবায় নিয়োজিত হয়েছেন। আপনার নিরাপদ ও স্বাচ্ছন্দ্যময় ভ্রমণ কামনা করছি।`
        : `Officer ${assignedStaffName} is now assisting you at the airport. Wishing you a comfortable journey!`;
      paxCategory = 'service';

      officerTitle = isBn
        ? `[অফিসার ডিউটি] প্রোটোকল সেবা চলমান #${bookingId}`
        : `[Officer Duty] Protocol Service In Progress #${bookingId}`;
      officerBody = isBn
        ? `বুকিং #${bookingId} (${passengerName})-এর সেবা কার্যক্রম চলমান। টার্মিনাল ও গেট এসকর্ট নিশ্চিত করুন।`
        : `Booking #${bookingId} (${passengerName}) active. Ensure terminal, gate & baggage escort.`;
      officerType = 'SERVICE_IN_PROGRESS';

      mgrTitle = isBn
        ? `[ম্যানেজার] প্রোটোকল সেবা শুরু হয়েছে #${bookingId}`
        : `[Manager] Service In Progress #${bookingId}`;
      mgrBody = isBn
        ? `কর্মকর্তা ${assignedStaffName} বুকিং #${bookingId} (${passengerName})-এর প্রোটোকল সেবা শুরু করেছেন।`
        : `Officer ${assignedStaffName} started service for booking #${bookingId} (${passengerName}).`;

      adminTitle = isBn
        ? `[সুপার এডমিন] লাইভ সার্ভিস চলমান #${bookingId}`
        : `[Super Admin] Live Service In Progress #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}-এর প্রোটোকল সার্ভিস বর্তমানে এয়ারপোর্টে সক্রিয়ভাবে চলমান।`
        : `Booking #${bookingId} protocol service is actively running on station.`;
      break;

    case 'completed':
      paxTitle = isBn
        ? `[Flight Care] সেবা সফলভাবে সম্পন্ন হয়েছে #${bookingId}`
        : `[Flight Care] Service Successfully Completed #${bookingId}`;
      paxBody = isBn
        ? `বুকিং #${bookingId}-এর প্রোটোকল সেবা সমাপ্ত হয়েছে। ফ্লাইট কেয়ারের সাথে থাকার জন্য আন্তরিক ধন্যবাদ! দয়া করে আপনার অভিজ্ঞতা রেটিং দিন।`
        : `Booking #${bookingId} protocol service concluded. Thank you for choosing Flight Care! Please rate your experience.`;
      paxCategory = 'service';

      officerTitle = isBn
        ? `[✅ সার্ভিস সমাপ্ত] হ্যান্ডওভার নিশ্চিতকরণ #${bookingId}`
        : `[✅ Service Concluded] Handover Verified #${bookingId}`;
      officerBody = isBn
        ? `বুকিং #${bookingId} (${passengerName}) সফলভাবে সমাপ্ত ও হ্যান্ডওভার নিশ্চিত হয়েছে। আপনার অ্যাকাউন্টে +১০ প্রোটোকল পয়েন্ট যোগ হয়েছে!`
        : `Booking #${bookingId} (${passengerName}) concluded successfully. +10 protocol points awarded!`;
      officerType = STAFF_NOTIFICATION_TYPES?.SERVICE_COMPLETED || 'service_completed';

      mgrTitle = isBn
        ? `[ম্যানেজার] সার্ভিস সম্পন্ন ও হ্যান্ডওভার #${bookingId}`
        : `[Manager] Service Completed #${bookingId}`;
      mgrBody = isBn
        ? `কর্মকর্তা ${assignedStaffName} বুকিং #${bookingId} (${passengerName})-এর সেবা সফলভাবে সম্পন্ন করেছেন।`
        : `Officer ${assignedStaffName} completed booking #${bookingId} (${passengerName}) successfully.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] বুকিং সমাপ্ত ও সংরক্ষিত #${bookingId}`
        : `[Super Admin] Booking Closed & Archived #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId} সফলভাবে সমাপ্ত। যাত্রী সন্তুষ্টি ও হ্যান্ডওভার রেকর্ড ডাটাবেজে সংরক্ষিত।`
        : `Booking #${bookingId} concluded. Passenger handover and audit logs archived.`;
      break;

    case 'cancelled':
      paxTitle = isBn
        ? `[Flight Care] বুকিং বাতিলকরণ নোটিশ #${bookingId}`
        : `[Flight Care] Booking Cancellation Notice #${bookingId}`;
      paxBody = isBn
        ? `আপনার বুকিং #${bookingId} বাতিল করা হয়েছে। রিফান্ড সংক্রান্ত বিস্তারিত তথ্যের জন্য আমাদের ২৪/৭ হেল্পলাইনে যোগাযোগ করুন।`
        : `Your booking #${bookingId} has been cancelled. For refund inquiries, contact our 24/7 helpline.`;

      officerTitle = isBn
        ? `[অফিসার নোটিশ] বুকিং বাতিল হয়েছে #${bookingId}`
        : `[Officer Notice] Booking Cancelled #${bookingId}`;
      officerBody = isBn
        ? `বুকিং #${bookingId} বাতিল করা হয়েছে। আপনার ডিউটি রোস্টার থেকে অব্যাহতি দেওয়া হয়েছে।`
        : `Booking #${bookingId} has been cancelled and unassigned from your shift.`;
      officerType = 'BOOKING_CANCELLED';

      mgrTitle = isBn
        ? `[ম্যানেজার এলার্ট] বুকিং বাতিল #${bookingId}`
        : `[Manager Alert] Booking Cancelled #${bookingId}`;
      mgrBody = isBn
        ? `বুকিং #${bookingId} (${passengerName}) বাতিল করা হয়েছে।`
        : `Booking #${bookingId} (${passengerName}) has been cancelled.`;

      adminTitle = isBn
        ? `[সুপার এডমিন এলার্ট] বুকিং বাতিল #${bookingId}`
        : `[Super Admin Alert] Booking Cancelled #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId} বাতিল করা হয়েছে। অডিট ট্রেইলে রেকর্ড সংরক্ষিত।`
        : `Booking #${bookingId} cancelled. Recorded in security audit trail.`;
      break;

    case 'dispatched':
    case 'flight_landed':
    case 'arr-1':
      paxTitle = isBn
        ? `[Flight Care] ফ্লাইট অবতরণ ও কর্মকর্তা প্রেরণ #${bookingId}`
        : `[Flight Care] Flight Landed & Staff Dispatched #${bookingId}`;
      paxBody = isBn
        ? `সম্মানিত ${passengerName}, আপনার ফ্লাইট অবতরণ করেছে এবং প্রোটোকল কর্মকর্তা ${assignedStaffName} নির্ধারিত পয়েন্টের দিকে রওনা হয়েছেন।`
        : `Dear ${passengerName}, your flight has landed and Officer ${assignedStaffName} is heading to the arrival gate.`;
      paxCategory = 'service';

      officerTitle = isBn
        ? `[অফিসার ডিউটি] ফ্লাইট অবতরণ করেছে #${bookingId}`
        : `[Officer Duty] Flight Landed #${bookingId}`;
      officerBody = isBn
        ? `ফ্লাইট: ${flightNo} | বিমানবন্দর: ${airport} (${terminal})। নির্ধারিত আগমন গেটে দ্রুত অবস্থান গ্রহণ করুন।`
        : `Flight: ${flightNo} | Airport: ${airport} (${terminal}). Take position at the assigned arrival gate.`;
      officerType = 'MILESTONE';

      mgrTitle = isBn
        ? `[ম্যানেজার] ফ্লাইট ল্যান্ড করেছে #${bookingId}`
        : `[Manager] Flight Landed #${bookingId}`;
      mgrBody = isBn
        ? `ফ্লাইট: ${flightNo} অবতরণ করেছে। কর্মকর্তা ${assignedStaffName} আগমন গেটের দিকে প্রেরণ করা হয়েছে।`
        : `Flight ${flightNo} landed. Officer ${assignedStaffName} dispatched to arrival gate.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] ল্যান্ডিং ও স্টাফ প্রেরণ #${bookingId}`
        : `[Super Admin] Landed & Staff Dispatched #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}: ফ্লাইট ${flightNo} ল্যান্ডিং ও কর্মকর্তা প্রেরণ সম্পন্ন।`
        : `Booking #${bookingId}: Flight ${flightNo} landed and officer dispatched.`;
      break;

    case 'gate_stationed':
    case 'curb_stationed':
    case 'arr-2':
    case 'dep-1':
      paxTitle = isBn
        ? `[Flight Care] কর্মকর্তা নির্ধারিত পয়েন্টে উপস্থিত #${bookingId}`
        : `[Flight Care] Officer Stationed at Meeting Point #${bookingId}`;
      paxBody = isBn
        ? `প্রোটোকল কর্মকর্তা ${assignedStaffName} (${assignedStaffPhone}) ${meetingPoint}-এ আপনার অপেক্ষায় উপস্থিত আছেন।`
        : `Officer ${assignedStaffName} (${assignedStaffPhone}) is stationed at ${meetingPoint} awaiting your arrival.`;
      paxCategory = 'service';

      officerTitle = isBn
        ? `[ডিউটি আপডেট] গেটে অবস্থান নিশ্চিত #${bookingId}`
        : `[Duty Checkpoint] Gate Stationing Logged #${bookingId}`;
      officerBody = isBn
        ? `বুকিং #${bookingId}: আপনি নির্ধারিত পয়েন্ট (${meetingPoint})-এ অবস্থান নিয়েছেন। যাত্রীকে অভ্যর্থনা জানানোর জন্য প্রস্তুত থাকুন।`
        : `Booking #${bookingId}: You are stationed at ${meetingPoint}. Stand by to receive passenger.`;
      officerType = 'MILESTONE';

      mgrTitle = isBn
        ? `[ম্যানেজার] কর্মকর্তা নির্ধারিত পয়েন্টে উপস্থিত #${bookingId}`
        : `[Manager] Officer Stationed #${bookingId}`;
      mgrBody = isBn
        ? `কর্মকর্তা ${assignedStaffName} বুকিং #${bookingId} (${passengerName})-এর জন্য ${meetingPoint}-এ উপস্থিত রয়েছেন।`
        : `Officer ${assignedStaffName} is stationed at ${meetingPoint} for booking #${bookingId} (${passengerName}).`;

      adminTitle = isBn
        ? `[সুপার এডমিন] গেট অবস্থান নিশ্চিত #${bookingId}`
        : `[Super Admin] Stationing Verified #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}: কর্মকর্তা ${assignedStaffName} নির্ধারিত স্থানে উপস্থিত।`
        : `Booking #${bookingId}: Officer ${assignedStaffName} in position on schedule.`;
      break;

    case 'passenger_met':
    case 'arr-3':
    case 'dep-2':
      paxTitle = isBn
        ? `[Flight Care] অভ্যর্থনা ও প্রোটোকল সাক্ষাত সম্পন্ন #${bookingId}`
        : `[Flight Care] Passenger Met & Welcomed #${bookingId}`;
      paxBody = isBn
        ? `আমাদের কর্মকর্তা ${assignedStaffName} আপনাকে বিমানবন্দরে স্বাগত জানিয়েছেন। আপনার স্বাচ্ছন্দ্যময় সেবা পরিচালনা করা হচ্ছে।`
        : `Officer ${assignedStaffName} has met you at the airport. Your protocol escort is underway.`;
      paxCategory = 'service';

      officerTitle = isBn
        ? `[অফিসার ডিউটি] যাত্রী অভ্যর্থনা সম্পন্ন #${bookingId}`
        : `[Officer Duty] Passenger Met Successfully #${bookingId}`;
      officerBody = isBn
        ? `যাত্রী ${passengerName}-কে সফলভাবে রিসিভ করা হয়েছে। লাগেজ ও ইমিগ্রেশন এস্কর্ট পরিচালনা করুন।`
        : `Passenger ${passengerName} met. Proceed with baggage and clearance escort.`;
      officerType = 'MILESTONE';

      mgrTitle = isBn
        ? `[ম্যানেজার] যাত্রী অভ্যর্থনা সম্পন্ন #${bookingId}`
        : `[Manager] Passenger Met #${bookingId}`;
      mgrBody = isBn
        ? `কর্মকর্তা ${assignedStaffName} যাত্রী ${passengerName}-এর সাথে সফলভাবে সাক্ষাত করেছেন।`
        : `Officer ${assignedStaffName} successfully met passenger ${passengerName}.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] যাত্রী সংযোগ সম্পন্ন #${bookingId}`
        : `[Super Admin] Passenger Connection Verified #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}: কর্মকর্তা ও যাত্রীর সংযোগ নিশ্চিত। সেবা সফলভাবে চলছে।`
        : `Booking #${bookingId}: Officer and passenger connection established.`;
      break;

    case 'screening':
    case 'checkin':
    case 'dep-3':
    case 'dep-4':
      paxTitle = isBn
        ? `[Flight Care] লাগেজ স্ক্যানিং ও চেক-ইন সম্পন্ন #${bookingId}`
        : `[Flight Care] Screening & Check-in Complete #${bookingId}`;
      paxBody = isBn
        ? `আপনার লাগেজ স্ক্যানিং ও এয়ারলাইন চেক-ইন সফলভাবে সম্পন্ন হয়েছে। বোর্ডিং পাস সংগ্রহ করা হয়েছে।`
        : `Luggage screening and airline check-in completed. Boarding pass secured.`;
      paxCategory = 'service';

      officerTitle = isBn
        ? `[অফিসার ডিউটি] চেক-ইন ধাপ সম্পন্ন #${bookingId}`
        : `[Officer Duty] Check-in Stage Complete #${bookingId}`;
      officerBody = isBn
        ? `বুকিং #${bookingId}: চেক-ইন ও বোর্ডিং পাস নিশ্চিত। এবার ইমিগ্রেশন ফাস্ট-ট্র্যাকের দিকে এস্কর্ট করুন।`
        : `Booking #${bookingId}: Check-in complete. Escort passenger to immigration fast-track.`;
      officerType = 'MILESTONE';

      mgrTitle = isBn
        ? `[ম্যানেজার] চেক-ইন ও লাগেজ সম্পন্ন #${bookingId}`
        : `[Manager] Check-in Complete #${bookingId}`;
      mgrBody = isBn
        ? `বুকিং #${bookingId} (${passengerName}): চেক-ইন ও স্ক্যানিং সম্পন্ন।`
        : `Booking #${bookingId} (${passengerName}): Check-in and screening concluded.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] কাউন্টার চেক-ইন ভেরিফাইড #${bookingId}`
        : `[Super Admin] Check-in Verified #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}: চেক-ইন ও বোর্ডিং পাস সংগ্রহ লগ সংরক্ষিত।`
        : `Booking #${bookingId}: Airline check-in milestone logged.`;
      break;

    case 'immigration':
    case 'security_cleared':
    case 'arr-4':
    case 'dep-5':
      paxTitle = isBn
        ? `[Flight Care] ইমিগ্রেশন ও সিকিউরিটি ফাস্ট-ট্র্যাক সম্পন্ন #${bookingId}`
        : `[Flight Care] Immigration & Fast-Track Cleared #${bookingId}`;
      paxBody = isBn
        ? `আপনার বিমানবন্দর ইমিগ্রেশন ও সিকিউরিটি ক্লিয়ারেন্স অগ্রাধিকার ভিত্তিতে সফলভাবে সম্পন্ন হয়েছে।`
        : `Your immigration and security clearance has been successfully expedited.`;
      paxCategory = 'service';

      officerTitle = isBn
        ? `[অফিসার ডিউটি] ইমিগ্রেশন সম্পন্ন #${bookingId}`
        : `[Officer Duty] Immigration Cleared #${bookingId}`;
      officerBody = isBn
        ? `বুকিং #${bookingId}: ইমিগ্রেশন ক্লিয়ারেন্স সম্পন্ন। পরবর্তী ধাপের দিকে এগিয়ে যান।`
        : `Booking #${bookingId}: Immigration cleared. Proceed to baggage/lounge.`;
      officerType = 'MILESTONE';

      mgrTitle = isBn
        ? `[ম্যানেজার] ইমিগ্রেশন ক্লিয়ারেন্স সম্পন্ন #${bookingId}`
        : `[Manager] Immigration Cleared #${bookingId}`;
      mgrBody = isBn
        ? `বুকিং #${bookingId} (${passengerName}): ইমিগ্রেশন ক্লিয়ারেন্স সফল।`
        : `Booking #${bookingId} (${passengerName}): Immigration cleared successfully.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] ইমিগ্রেশন ফাস্ট-ট্র্যাক সম্পন্ন #${bookingId}`
        : `[Super Admin] Immigration Fast-Track Cleared #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}: সিএএবি ইমিগ্রেশন ফাস্ট-ট্র্যাক সম্পন্ন।`
        : `Booking #${bookingId}: Immigration fast-track completed.`;
      break;

    case 'baggage':
    case 'porter_assisted':
    case 'arr-5':
      paxTitle = isBn
        ? `[Flight Care] লাগেজ সংগ্রহ ও পোর্টার সহায়তা সম্পন্ন #${bookingId}`
        : `[Flight Care] Luggage Porter Assistance Complete #${bookingId}`;
      paxBody = isBn
        ? `আপনার লাগেজ সংগ্রহ সম্পন্ন হয়েছে এবং ক্যানোপি/যানবাহনে পৌঁছে দেওয়ার ব্যবস্থা করা হচ্ছে।`
        : `Your baggage has been collected and porter assistance is underway to vehicle.`;
      paxCategory = 'service';

      officerTitle = isBn
        ? `[অফিসার ডিউটি] লাগেজ ক্লিয়ারেন্স সম্পন্ন #${bookingId}`
        : `[Officer Duty] Luggage Clearance Done #${bookingId}`;
      officerBody = isBn
        ? `বুকিং #${bookingId}: ব্যাগেজ সংগ্রহ সম্পন্ন। লাগেজ ট্যাগ নিশ্চিত করে ক্যানোপিতে হস্তান্তর করুন।`
        : `Booking #${bookingId}: Baggage collected. Verify baggage tags and escort to curb.`;
      officerType = 'MILESTONE';

      mgrTitle = isBn
        ? `[ম্যানেজার] লাগেজ হ্যান্ডলিং সম্পন্ন #${bookingId}`
        : `[Manager] Luggage Handling Complete #${bookingId}`;
      mgrBody = isBn
        ? `বুকিং #${bookingId} (${passengerName}): লাগেজ সংগ্রহ ও সহায়তা সম্পন্ন।`
        : `Booking #${bookingId} (${passengerName}): Luggage collected and assisted.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] লাগেজ সহায়তা সম্পন্ন #${bookingId}`
        : `[Super Admin] Baggage Assistance Verified #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}: লাগেজ পোর্টার সহায়তা সফলভাবে সমাপ্ত।`
        : `Booking #${bookingId}: Luggage porter assistance completed.`;
      break;

    case 'lounge_gate':
    case 'dep-6':
      paxTitle = isBn
        ? `[Flight Care] লাউঞ্জ ও বোর্ডিং গেট এস্কর্ট সম্পন্ন #${bookingId}`
        : `[Flight Care] Lounge & Gate Escort Complete #${bookingId}`;
      paxBody = isBn
        ? `আপনাকে ভিআইপি লাউঞ্জে/বোর্ডিং গেটে নিরাপদে পৌঁছে দেওয়া হয়েছে। আপনার নিরাপদ যাত্রা কামনা করছি!`
        : `You have been safely escorted to the VIP lounge/boarding gate. Safe travels!`;
      paxCategory = 'service';

      officerTitle = isBn
        ? `[অফিসার ডিউটি] লাউঞ্জ/গেট এস্কর্ট সমাপ্ত #${bookingId}`
        : `[Officer Duty] Lounge/Gate Escort Concluded #${bookingId}`;
      officerBody = isBn
        ? `বুকিং #${bookingId} (${passengerName}): লাউঞ্জ/গেট এস্কর্ট সম্পন্ন। হ্যান্ডওভার সাইন নিশ্চিত করুন।`
        : `Booking #${bookingId} (${passengerName}): Escorted to gate. Confirm handover.`;
      officerType = 'MILESTONE';

      mgrTitle = isBn
        ? `[ম্যানেজার] লাউঞ্জ/গেট এস্কর্ট সম্পন্ন #${bookingId}`
        : `[Manager] Lounge/Gate Escort Complete #${bookingId}`;
      mgrBody = isBn
        ? `বুকিং #${bookingId} (${passengerName}): যাত্রী লাউঞ্জ/গেটে নিরাপদে হস্তান্তরিত।`
        : `Booking #${bookingId} (${passengerName}): Safely escorted to lounge/gate.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] ডিপারচার প্রটোকল সম্পন্ন #${bookingId}`
        : `[Super Admin] Departure Protocol Complete #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}: ডিপারচার লাউঞ্জ ও বোর্ডিং প্রটোকল সমাপ্ত।`
        : `Booking #${bookingId}: Departure protocol concluded.`;
      break;

    case 'handover':
    case 'arr-6':
      paxTitle = isBn
        ? `[Flight Care] যানবাহনে হস্তান্তর ও সেবা সমাপ্ত #${bookingId}`
        : `[Flight Care] Handed to Vehicle & Service Concluded #${bookingId}`;
      paxBody = isBn
        ? `আপনার প্রোটোকল সার্ভিস সফলভাবে সম্পন্ন হয়েছে এবং যানবাহনে হস্তান্তর নিশ্চিত করা হয়েছে। ধন্যবাদ!`
        : `Your protocol service has concluded with safe handover to your vehicle. Thank you!`;
      paxCategory = 'service';

      officerTitle = isBn
        ? `[অফিসার ডিউটি] যানবাহন হস্তান্তর সম্পন্ন #${bookingId}`
        : `[Officer Duty] Vehicle Handover Completed #${bookingId}`;
      officerBody = isBn
        ? `বুকিং #${bookingId}: যাত্রীকে গাড়িতে তুলে দেওয়া হয়েছে। সার্ভিস সমাপ্ত করুন।`
        : `Booking #${bookingId}: Handed passenger to vehicle. Close service.`;
      officerType = 'MILESTONE';

      mgrTitle = isBn
        ? `[ম্যানেজার] যানবাহনে হস্তান্তর সম্পন্ন #${bookingId}`
        : `[Manager] Vehicle Handover Complete #${bookingId}`;
      mgrBody = isBn
        ? `বুকিং #${bookingId} (${passengerName}): ক্যানোপি ও গাড়িতে হস্তান্তর সম্পন্ন।`
        : `Booking #${bookingId} (${passengerName}): Handed over to vehicle at canopy.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] আগমনী প্রটোকল সমাপ্ত #${bookingId}`
        : `[Super Admin] Arrival Handover Complete #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}: আগমনী প্রটোকল ও যানবাহন হ্যান্ডওভার নিশ্চিত।`
        : `Booking #${bookingId}: Arrival protocol and handover verified.`;
      break;

    case 'customer_review':
    case 'feedback': {
      const rating = Number(extra.rating) || 5;
      const comment = String(extra.comment || '').trim();
      paxTitle = isBn
        ? `[Flight Care] রিভিউ জমা হয়েছে (${rating}★) #${bookingId}`
        : `[Flight Care] Review Submitted (${rating}★) #${bookingId}`;
      paxBody = isBn
        ? `আপনার মূল্যবান মতামত (${rating}★) সফলভাবে সিস্টেমে যুক্ত হয়েছে। ধন্যবাদ!`
        : `Your review (${rating}★) has been recorded. Thank you for your feedback!`;
      paxCategory = 'review';

      officerTitle = isBn
        ? `[নতুন কাস্টমার রিভিউ] যাত্রী আপনাকে ${rating}★ রেটিং দিয়েছেন!`
        : `[New Customer Review] Passenger Rated You ${rating}★!`;
      officerBody = isBn
        ? `যাত্রী ${passengerName} বুকিং #${bookingId}-এ আপনাকে ${rating}★ দিয়েছেন${comment ? `: "${comment}"` : ''}। অর্জিত পয়েন্ট: +${rating >= 5 ? 100 : 50}!`
        : `Passenger ${passengerName} gave you ${rating}★ on booking #${bookingId}${comment ? `: "${comment}"` : ''}. Points: +${rating >= 5 ? 100 : 50}!`;
      officerType = STAFF_NOTIFICATION_TYPES?.CUSTOMER_REVIEW || 'customer_review';

      mgrTitle = isBn
        ? `[ম্যানেজার] নতুন কাস্টমার রিভিউ (${rating}★) #${bookingId}`
        : `[Manager] New Review (${rating}★) #${bookingId}`;
      mgrBody = isBn
        ? `যাত্রী ${passengerName} কর্মকর্তা ${assignedStaffName}-কে ${rating}★ দিয়েছেন${comment ? `: "${comment}"` : ''}।`
        : `Pax ${passengerName} rated Officer ${assignedStaffName} ${rating}★${comment ? `: "${comment}"` : ''}.`;

      adminTitle = isBn
        ? `[সুপার এডমিন] কাস্টমার সন্তুষ্টি ফিডব্যাক (${rating}★) #${bookingId}`
        : `[Super Admin] Passenger Rating Logged (${rating}★) #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}: যাত্রী ${passengerName} রেটিং দিয়েছেন ${rating}★${comment ? `: "${comment}"` : ''}।`
        : `Booking #${bookingId}: Passenger ${passengerName} submitted ${rating}★ rating.`;
      break;
    }

    default: {
      const stepName = isBn ? (extra.milestoneNameBn || stage) : (extra.milestoneNameEn || stage);
      paxTitle = isBn
        ? `[Flight Care] সেবার অগ্রগতি: ${stepName} #${bookingId}`
        : `[Flight Care] Service Progress: ${stepName} #${bookingId}`;
      paxBody = isBn
        ? `সম্মানিত ${passengerName}, আপনার বুকিং #${bookingId}-এর '${stepName}' ধাপ সফলভাবে সম্পন্ন হয়েছে।`
        : `Dear ${passengerName}, stage '${stepName}' for booking #${bookingId} is completed.`;
      officerTitle = isBn
        ? `[ডিউটি ধাপ আপডেট] ${stepName} সম্পন্ন #${bookingId}`
        : `[Duty Update] ${stepName} Completed #${bookingId}`;
      officerBody = isBn
        ? `বুকিং #${bookingId} (${passengerName}): '${stepName}' সফলভাবে সম্পন্ন। পরবর্তী পদক্ষেপে অগ্রসর হোন।`
        : `Booking #${bookingId} (${passengerName}): '${stepName}' marked done. Proceed to next step.`;
      mgrTitle = isBn
        ? `[ম্যানেজার মনিটরিং] ধাপ সম্পন্ন: ${stepName} #${bookingId}`
        : `[Manager Monitoring] Stage Done: ${stepName} #${bookingId}`;
      mgrBody = isBn
        ? `ফ্লাইট: ${flightNo} | যাত্রী: ${passengerName} | কর্মকর্তা ${assignedStaffName} '${stepName}' ধাপ সম্পন্ন করেছেন।`
        : `Flight: ${flightNo} | Pax: ${passengerName} | Officer ${assignedStaffName} completed '${stepName}'.`;
      adminTitle = isBn
        ? `[সুপার এডমিন অডিট] সার্ভিস প্রগ্রেস: ${stepName} #${bookingId}`
        : `[Super Admin Audit] Service Progress: ${stepName} #${bookingId}`;
      adminBody = isBn
        ? `বুকিং #${bookingId}-এর '${stepName}' মাইলফলক নিশ্চিত করা হয়েছে। স্ট্যাটাস আপডেট ডাটাবেজে সংরক্ষিত।`
        : `Milestone '${stepName}' for booking #${bookingId} verified and logged in database.`;
      break;
    }
  }

  const staffTargetId = staff?.id || booking.staffId || booking.leadStaffId || booking.assignedStaff?.id;

  const notifPax = {
    id: `NTF-PAX-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    title: paxTitle,
    body: paxBody,
    category: paxCategory,
    targetRole: 'passenger',
    targetUserId: passengerPhone || passengerEmail || bookingId,
    bookingId,
    flightNo,
    step: normStage,
    read: false,
    source: 'system',
    createdAt: timestamp,
    created_at: timestamp,
  };

  const notifOfficer = {
    id: `NTF-STF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    title: officerTitle,
    body: officerBody,
    category: 'staff_duty',
    targetRole: 'staff',
    targetStaffId: staffTargetId || 'all_staff',
    staffId: staffTargetId,
    type: officerType,
    bookingId,
    flightNo,
    step: normStage,
    read: false,
    source: 'system',
    createdAt: timestamp,
    created_at: timestamp,
  };

  const notifMgr = {
    id: `NTF-MGR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    title: mgrTitle,
    body: mgrBody,
    category: 'manager_alert',
    targetRole: 'manager',
    targetUserId: 'manager',
    bookingId,
    flightNo,
    step: normStage,
    read: false,
    source: 'system',
    createdAt: timestamp,
    created_at: timestamp,
  };

  const notifAdmin = {
    id: `NTF-ADM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    title: adminTitle,
    body: adminBody,
    category: 'admin_alert',
    targetRole: 'super_admin',
    targetUserId: 'super_admin',
    bookingId,
    flightNo,
    step: normStage,
    read: false,
    source: 'system',
    createdAt: timestamp,
    created_at: timestamp,
  };

  // 1. Save all 4 records into local universal notifications tray
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [notifPax, notifOfficer, notifMgr, notifAdmin, ...existing.slice(0, 196)];
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error saving booking lifecycle notifications:', err);
  }

  // 2. Save officer notification to officer's dedicated tray
  if (staffTargetId) {
    try {
      const staffKey = `@flightcare_staff_notifs_${staffTargetId}`;
      const staffRaw = await AsyncStorage.getItem(staffKey);
      const staffExisting = staffRaw ? JSON.parse(staffRaw) : [];
      const staffUpdated = [notifOfficer, ...staffExisting.slice(0, 99)];
      await AsyncStorage.setItem(staffKey, JSON.stringify(staffUpdated));
    } catch (err) {
      console.warn('Error saving staff notification tray:', err);
    }
  }

  // 3. Trigger Browser / Desktop Pop-up Push Notifications
  try {
    triggerBrowserPush(paxTitle, paxBody, { id: notifPax.id, tag: `pax-${bookingId}-${normStage}` });
  } catch {}

  // 4. Send Live Telecom SMS to Passenger and Officer
  if (passengerPhone) {
    try {
      await sendLiveSms({
        to: passengerPhone,
        message: `[Flight Care] ${paxTitle}: ${paxBody}`,
        title: 'Passenger Alert',
      });
    } catch {}
  }
  if (assignedStaffPhone && assignedStaffPhone !== SUPPORT_PHONE) {
    try {
      await sendLiveSms({
        to: assignedStaffPhone,
        message: `[Flight Care Officer] ${officerTitle}: ${officerBody}`,
        title: 'Officer Alert',
      });
    } catch {}
  }

  // 5. Cloud Firestore persistence (Ensures Manager and Super Admin immediately receive guest bookings)
  if (isFirebaseConfigured()) {
    try {
      for (const notif of [notifPax, notifOfficer, notifMgr, notifAdmin]) {
        const payload = toFirestoreFields({
          id: notif.id,
          targetRole: notif.targetRole,
          targetUserId: String(notif.targetUserId || notif.targetStaffId || 'all'),
          targetStaffId: notif.targetStaffId || null,
          title: notif.title,
          body: notif.body,
          category: notif.category,
          step: notif.step,
          bookingId: notif.bookingId,
          flightNo: notif.flightNo,
          read: false,
          source: 'system',
          createdAt: timestamp,
          created_at: timestamp,
        });
        await firestoreRestRequest(`notifications/${encodeURIComponent(notif.id)}`, 'PATCH', payload);
      }
      console.log(`[Firestore] 4-party notifications synced to Cloud for Booking #${bookingId}`);
    } catch (cloudErr) {
      console.warn('Firestore multi-role notification sync notice:', cloudErr);
    }
  }

  return {
    ok: true,
    notifications: {
      passenger: notifPax,
      officer: notifOfficer,
      manager: notifMgr,
      superAdmin: notifAdmin,
    },
  };
}

/**
 * Role-Based Notification Filtering Engine (Strict Scoping)
 * Rule: "১. নোটিফিকেশন সবাই দেখতে পাবেনা। শুধু মাত্র যারা এটার সাথে রিলেটেড তারা দেকতে পাবে।"
 * - Passenger / Guest: sees ONLY their own booking alerts (or general passenger announcements).
 *   NEVER sees manager_alert, admin_alert, or staff_duty.
 * - Staff / Protocol Officer: sees ONLY tasks/duties assigned to their staffId / badgeNo.
 * - Manager: sees manager alerts, booking updates, passenger reviews, and manager announcements.
 * - Super Admin: sees executive audits, super_admin alerts, and managerial notices.
 */
export function filterNotificationsForRole(allNotifications, {
  userRole = 'guest', // 'guest' | 'customer' | 'staff' | 'manager' | 'super_admin'
  customerUser = null, // customerSession?.user or profile
  currentStaff = null, // staffUser
  localBookingIds = [], // Array of booking IDs in current device/browser state
} = {}) {
  if (!Array.isArray(allNotifications)) return [];

  const candidateBookingIds = new Set(
    (localBookingIds || []).map(id => String(id || '').trim().toUpperCase()).filter(Boolean)
  );

  const customerPhones = new Set();
  const customerEmails = new Set();
  if (customerUser?.phone) customerPhones.add(String(customerUser.phone).replace(/\D/g, ''));
  if (customerUser?.email) customerEmails.add(String(customerUser.email).trim().toLowerCase());

  return allNotifications.filter(item => {
    if (!item) return false;

    const targetRole = String(item.targetRole || '').toLowerCase();
    const category = String(item.category || '').toLowerCase();
    const targetUserId = String(item.targetUserId || '').trim();
    const itemBookingId = String(item.bookingId || '').trim().toUpperCase();

    // 1. Super Admin: full executive oversight across all platform notifications
    if (userRole === 'super_admin') {
      return true;
    }

    // 2. Manager: full operational oversight across all platform notifications
    if (userRole === 'manager') {
      return true;
    }

    // 3. Staff / Protocol Officer: ONLY duties assigned to their staffId / badge
    if (userRole === 'staff') {
      const staffId = String(currentStaff?.id || currentStaff?.badgeNo || '').trim();
      const targetStaffId = String(item.targetStaffId || item.staffId || '').trim();
      return (
        (targetRole === 'staff' || category === 'staff_duty') &&
        (targetStaffId === staffId || targetStaffId === 'all_staff')
      );
    }

    // 4. Passenger (Guest / Unauthenticated or Logged-in Customer):
    // STRICT PRIVACY RULE:
    // General public / ordinary visitors must NEVER see internal operational, staff, manager,
    // or IPN/webhook payment logs!
    const textToScan = `${item.title || ''} ${item.body || ''} ${item.description || ''}`;

    // Extract any booking reference from item or text
    let targetBookingId = itemBookingId;
    if (!targetBookingId) {
      const match = textToScan.match(/#?(FC-\d{4,8}|OFF-[A-Z]{3}-\d{4,8})/i);
      if (match) targetBookingId = match[1].toUpperCase();
    }

    // Check if item is an internal operational/technical/webhook notification
    const isInternalOrTechnical =
      category === 'manager_alert' ||
      category === 'admin_alert' ||
      category === 'staff_duty' ||
      category === 'system_alert' ||
      targetRole === 'manager' ||
      targetRole === 'super_admin' ||
      targetRole === 'staff' ||
      /\[IPN\s*Webhook\]|\[IPN\s*ওয়েবহুক\]|\bIPN\b|\bWebhook\b|ওয়েবহুক|confirmed on server|তাৎক্ষণিক নিশ্চিত|Gateway Settlement|NPSB Switch/i.test(textToScan);

    if (isInternalOrTechnical) {
      // NEVER show raw internal IPN/technical messages to general visitors or passengers!
      return false;
    }

    // If the notification is tied to a specific booking:
    if (targetBookingId) {
      // ONLY show if this passenger/guest actually owns this booking!
      if (candidateBookingIds.has(targetBookingId)) {
        return true;
      }
      // Check phone match
      const cleanTargetPhone = targetUserId.replace(/\D/g, '');
      if (cleanTargetPhone && customerPhones.has(cleanTargetPhone)) {
        return true;
      }
      // Check email match
      if (targetUserId && customerEmails.has(targetUserId.toLowerCase())) {
        return true;
      }
      // Belongs to someone else -> STRICTLY HIDE from general public!
      return false;
    }

    // Target role matches passenger directly
    if (targetRole === 'passenger') {
      if (targetUserId === 'all' || !targetUserId) return true;
      const cleanTargetPhone = targetUserId.replace(/\D/g, '');
      if (cleanTargetPhone && customerPhones.has(cleanTargetPhone)) return true;
      if (customerEmails.has(targetUserId.toLowerCase())) return true;
      return false;
    }

    // Platform announcements & promotions are ONLY public if they contain NO booking ID and are NOT internal
    if (category === 'announcement' || category === 'promotion') {
      if (!targetBookingId && !isInternalOrTechnical) {
        return true;
      }
    }

    // All other unverified items are STRICTLY HIDDEN from general public
    return false;
  });
}

