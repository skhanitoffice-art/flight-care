/**
 * Flight Care - Support Office WhatsApp Notification Service
 * Dispatches automated alerts to Support Office (+8801347570001)
 * via Server-to-Server GreenWeb BD / BulkSMSBD API and provides 1-Click WhatsApp Direct Links.
 */

import { Linking, Platform } from 'react-native';

export const SUPPORT_OFFICE_WHATSAPP = '8801347570001';
export const SUPPORT_OFFICE_PHONE_DISPLAY = '01347-570001';

/**
 * Format structured notification text for the Support Office
 */
export function formatSupportBookingMessage(booking = {}, lang = 1) {
  const isBn = Boolean(lang);
  const bookingCode = booking.id || booking.bookingId || booking.confirmedId || 'FC-PENDING';
  const passengerName =
    booking.passengerName ||
    booking.name ||
    booking.passengerInformation?.name ||
    (booking.passengers && booking.passengers[0]?.name) ||
    (isBn ? 'সম্মানিত যাত্রী' : 'Valued Passenger');
  const passengerPhone =
    booking.passengerPhone ||
    booking.phone ||
    booking.passengerInformation?.phone ||
    (isBn ? 'উল্লেখ নেই' : 'Not Provided');
  const serviceDate =
    booking.date ||
    booking.flight?.date ||
    (booking.serviceDate ? String(booking.serviceDate) : new Date().toLocaleDateString('en-GB').replace(/\//g, '-'));
  const serviceTime =
    booking.time ||
    booking.flight?.time ||
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const flightNumber = (
    booking.fno ||
    booking.flightNumber ||
    booking.flight?.number ||
    'BG-084'
  ).toUpperCase();
  const airport = booking.airport || booking.airport_code || 'DAC';
  const airportLabel = airport === 'DAC' 
    ? (isBn ? 'ঢাকা (HSIA - DAC)' : 'Dhaka (HSIA - DAC)') 
    : airport;
  const serviceName = booking.service || booking.package || (isBn ? 'ভিআইপি প্রোটোকল সার্ভিস' : 'VIP Protocol Service');
  const amount = booking.amount != null ? booking.amount : 0;
  const isPayAfter =
    booking.paymentStatus === 'pay_after_service' ||
    booking.paidMethod === 'pay_after_service' ||
    booking.method === 'pay_after_service' ||
    amount === 0;

  const paymentText = isPayAfter
    ? (isBn ? 'সার্ভিস সমাপ্তির পর পেমেন্ট (Pay After Service)' : 'Pay After Service')
    : (isBn ? 'পেমেন্ট সম্পন্ন (Paid)' : 'Paid Online');

  if (isBn) {
    return `🛫 *নতুন বুকিং অর্ডার — ফ্লাইট কেয়ার সাপোর্ট*
━━━━━━━━━━━━━━━━━━━━━
🎫 *বুকিং আইডি:* #${bookingCode}
👤 *যাত্রীর নাম:* ${passengerName}
📱 *মোবাইল নম্বর:* ${passengerPhone}
📅 *সার্ভিসের তারিখ:* ${serviceDate}
⏰ *ফ্লাইটের সময়:* ${serviceTime} BST
✈️ *ফ্লাইট নম্বর:* ${flightNumber}
📍 *বিমানবন্দর:* ${airportLabel}
🎯 *সার্ভিস প্যাকেজ:* ${serviceName}
💰 *মূল্য:* ৳${amount} (${paymentText})
━━━━━━━━━━━━━━━━━━━━━
📍 *ডিজিটাল প্ল্যাকার্ড ও ট্র্যাকিং:*
https://flightcaresbd.com/?trackBooking=${bookingCode}

অনুগ্রহ করে দ্রুত বুকিংটি গ্রহণ ও কনফার্ম করুন।`;
  }

  return `🛫 *New Booking Order — Flight Care Support*
━━━━━━━━━━━━━━━━━━━━━
🎫 *Booking ID:* #${bookingCode}
👤 *Passenger Name:* ${passengerName}
📱 *Passenger Phone:* ${passengerPhone}
📅 *Service Date:* ${serviceDate}
⏰ *Flight Time:* ${serviceTime} BST
✈️ *Flight Number:* ${flightNumber}
📍 *Airport:* ${airportLabel}
🎯 *Service Package:* ${serviceName}
💰 *Payable:* ৳${amount} (${paymentText})
━━━━━━━━━━━━━━━━━━━━━
📍 *Live Tracking & Placard:*
https://flightcaresbd.com/?trackBooking=${bookingCode}

Please confirm this booking immediately.`;
}

/**
 * Returns direct WhatsApp link pre-filled to Support Office (+8801347570001)
 */
export function getSupportWhatsAppUrl(booking = {}, lang = 1) {
  const text = formatSupportBookingMessage(booking, lang);
  return `https://wa.me/${SUPPORT_OFFICE_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

/**
 * Dispatches automated booking notification to Support Office via Server Proxy /api/whatsapp/send.php
 * Powered by GreenWeb BD / BulkSMSBD Gateway
 */
export async function dispatchSupportOfficeWhatsAppAlert(booking = {}) {
  try {
    const bookingCode = booking.id || booking.bookingId || booking.confirmedId || '';
    const passengerName = booking.passengerName || booking.name || '';
    const passengerPhone = booking.passengerPhone || booking.phone || '';
    const serviceDate = booking.date || booking.flight?.date || '';
    const serviceTime = booking.time || booking.flight?.time || '';
    const flightNumber = (booking.fno || booking.flightNumber || booking.flight?.number || 'BG-084').toUpperCase();
    const serviceName = booking.service || booking.package || 'VIP Protocol';
    const amount = booking.amount != null ? booking.amount : 0;
    const paymentStatus = booking.paymentStatus || booking.paidMethod || 'pay_after_service';

    const baseUrl = Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : 'https://flightcaresbd.com';

    const response = await fetch(`${baseUrl}/api/whatsapp/send.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingCode,
        passengerName,
        passengerPhone,
        serviceDate,
        serviceTime,
        flightNumber,
        serviceName,
        amount,
        paymentStatus,
        airport: booking.airport || 'DAC',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Support Office WhatsApp Alert Dispatched:', data);
      return data;
    }
  } catch (err) {
    console.warn('⚠️ Support Office WhatsApp dispatch warning:', err?.message || err);
  }
  return { ok: false };
}

/**
 * 1-Click Launch WhatsApp to Support Office (+8801347570001)
 */
export function openSupportOfficeWhatsApp(booking = {}, lang = 1) {
  const url = getSupportWhatsAppUrl(booking, lang);
  Linking.openURL(url).catch(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  });
}

export default {
  SUPPORT_OFFICE_WHATSAPP,
  SUPPORT_OFFICE_PHONE_DISPLAY,
  formatSupportBookingMessage,
  getSupportWhatsAppUrl,
  dispatchSupportOfficeWhatsAppAlert,
  openSupportOfficeWhatsApp,
};
