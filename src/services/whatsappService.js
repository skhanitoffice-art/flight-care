/**
 * Flight Care - Support Office WhatsApp Notification Service
 * Dispatches automated alerts to Support Office WhatsApp (+8801347570001 and +8801347570002)
 * via Server-to-Server GreenWeb BD / Gateway API and provides 1-Click WhatsApp Direct Links.
 */

import { Linking, Platform, Alert } from 'react-native';

export const SUPPORT_OFFICE_WHATSAPP = '8801347570001';
export const SUPPORT_OFFICE_WHATSAPP_2 = '8801347570002';
export const SUPPORT_OFFICE_WHATSAPP_NUMBERS = ['8801347570001', '8801347570002'];
export const SUPPORT_OFFICE_PHONE_DISPLAY = '01347-570001, 01347-570002';

// In-memory 60-second anti-spam deduplication cache to prevent duplicate alerts
const dispatchedCache = new Map();

const ADDON_NAMES_MAP = {
  wheel: { bn: 'হুইলচেয়ার সেবা', en: 'Wheelchair Assistance' },
  wheelchair: { bn: 'হুইলচেয়ার সেবা', en: 'Wheelchair Assistance' },
  wrap: { bn: 'লাগেজ র‍্যাপিং', en: 'Luggage Wrapping' },
  wrapping: { bn: 'লাগেজ র‍্যাপিং', en: 'Luggage Wrapping' },
  transfer: { bn: 'গাড়ি ভাড়া গাইডেন্স', en: 'Rent a Car Guidance' },
  rent_car: { bn: 'গাড়ি ভাড়া গাইডেন্স', en: 'Rent a Car Guidance' },
  pickup: { bn: 'এয়ারপোর্ট পিকআপ', en: 'Airport Pickup' },
  visa: { bn: 'অন অ্যারাইভাল ভিসা', en: 'Visa On Arrival' },
  visa_on_arrival: { bn: 'অন অ্যারাইভাল ভিসা', en: 'Visa On Arrival' },
  print: { bn: 'প্রিন্ট সেবা', en: 'Document Print' },
  photocopy: { bn: 'ফটোকপি সেবা', en: 'PhotoCopy' },
  form_fillup: { bn: 'ফর্ম পূরণ', en: 'Form Fillup Assistance' },
  hotel: { bn: 'হোটেল বুকিং গাইডেন্স', en: 'Hotel Booking Guidance' },
  food: { bn: 'খাবার গাইডেন্স', en: 'Meal / Food Guidance' },
  medical: { bn: 'মেডিকেল গাইডেন্স ও অ্যাম্বুলেন্স', en: 'Medical Guidance' },
  tour: { bn: 'ট্যুর গাইডেন্স', en: 'Tour Guidance' },
  security: { bn: 'নিরাপত্তা প্রোটোকল', en: 'Security Protocol' },
};

/**
 * Format structured notification text for the Support Office (+8801347570001 & +8801347570002)
 * Explicitly includes:
 * 1. Client Info (Name, Phone, Email, Pax count)
 * 2. Services Purchased (Direction, Package, Addons list)
 * 3. Payment Details (Exact Amount, Status, Channel, TrxID)
 * 4. Date & Flight Details (Service date, Flight no, Time, Airport, Route, Terminal)
 */
export function formatSupportBookingMessage(booking = {}, lang = 1) {
  const isBn = Boolean(lang);
  const bookingCode = booking.id || booking.bookingId || booking.confirmedId || 'FC-PENDING';
  
  // 1. Client Information
  const passengerName =
    booking.passengerName ||
    booking.name ||
    booking.passenger_information?.name ||
    booking.passengerInformation?.name ||
    booking.leadPassenger?.name ||
    booking.bookerName ||
    (Array.isArray(booking.passengers) && booking.passengers[0]?.name) ||
    (isBn ? 'সম্মানিত যাত্রী' : 'Valued Passenger');

  const passengerPhone =
    booking.passengerPhone ||
    booking.phone ||
    booking.passenger_information?.phone ||
    booking.passengerInformation?.phone ||
    booking.leadPassenger?.phone ||
    booking.bookerPhone ||
    booking.contactPhone ||
    (isBn ? 'নম্বর উল্লেখ নেই' : 'Not Provided');

  const email =
    booking.email ||
    booking.passengerEmail ||
    booking.passenger_information?.email ||
    booking.passengerInformation?.email ||
    '';

  const paxCount =
    booking.a ||
    booking.passengers ||
    (Array.isArray(booking.passengerDetails) ? booking.passengerDetails.length + 1 : 1);

  let bookerInfo = '';
  if (booking.bookingForSomeoneElse) {
    const bName = booking.name || booking.bookerName || '';
    const bPhone = booking.phone || booking.bookerPhone || '';
    if (bName || bPhone) {
      bookerInfo = `${bName} (${bPhone})`.trim();
    }
  }

  // Exact Order Confirmation Time (BST)
  const orderTimestamp =
    booking.paidAt ||
    booking.confirmedAt ||
    booking.createdAt ||
    booking.timestamp ||
    new Date().toISOString();
  const orderDateObj = new Date(orderTimestamp);
  const isValidDate = !isNaN(orderDateObj.getTime());
  const finalOrderDate = isValidDate ? orderDateObj : new Date();

  const formattedOrderDate = finalOrderDate.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
    day: 'numeric',
    month: isBn ? 'long' : 'short',
    year: 'numeric',
  });
  const formattedOrderTime = finalOrderDate.toLocaleTimeString(isBn ? 'bn-BD' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const orderTimeDisplay = `${formattedOrderDate}, ${formattedOrderTime} BST`;

  // 2. Date & Flight Details
  const serviceDate =
    booking.date ||
    booking.flight?.date ||
    booking.serviceDate ||
    (isBn ? 'তারিখ উল্লেখ নেই' : 'Date Not Specified');

  const serviceTime =
    booking.time ||
    booking.flight?.time ||
    booking.serviceTime ||
    '12:00 PM';

  const flightNumber = (
    booking.fno ||
    booking.flightNumber ||
    booking.flight?.number ||
    'BG-084'
  ).toUpperCase();

  const airline = booking.airline || booking.flight?.airline || '';
  const route = booking.route || booking.flight?.route || '';
  const terminal = booking.terminal || booking.flight?.terminal || 'Terminal 1, HSIA';

  const airport = booking.airport || booking.airport_code || 'DAC';
  const airportLabel = airport === 'DAC' 
    ? (isBn ? 'ঢাকা (HSIA - DAC)' : 'Dhaka (HSIA - DAC)') 
    : airport;

  // 3. Services Purchased
  const direction = booking.dir || booking.direction || (booking.svc?.cat) || 'arr';
  const isDep = direction === 'dep' || String(direction).toLowerCase().includes('depart');
  const directionLabel = isDep
    ? (isBn ? 'প্রস্থান প্রোটোকল (Departure)' : 'Departure Protocol')
    : (isBn ? 'আগমন প্রোটোকল (Arrival)' : 'Arrival Protocol');

  let serviceName = booking.service || booking.package || '';
  if (!serviceName && booking.pkg) {
    serviceName = booking.pkg.n ? booking.pkg.n[isBn ? 1 : 0] : (booking.pkg.t || 'VIP Protocol');
  }
  if (!serviceName) {
    serviceName = isBn ? 'ভিআইপি প্রোটোকল সার্ভিস' : 'VIP Protocol Service';
  }

  // Format Additional Services
  const rawAddons = booking.addons || [];
  let addonsFormattedList = [];
  if (Array.isArray(rawAddons) && rawAddons.length > 0) {
    rawAddons.forEach(ad => {
      const key = typeof ad === 'string' ? ad.toLowerCase() : (ad?.id ? String(ad.id).toLowerCase() : '');
      const mapped = ADDON_NAMES_MAP[key];
      if (mapped) {
        addonsFormattedList.push(isBn ? mapped.bn : mapped.en);
      } else if (ad && typeof ad === 'object' && ad.name) {
        addonsFormattedList.push(ad.name);
      } else if (key) {
        addonsFormattedList.push(key);
      }
    });
  }
  const addonsDisplay = addonsFormattedList.length > 0
    ? addonsFormattedList.join(', ')
    : (isBn ? 'কোনো অতিরিক্ত সার্ভিস নেওয়া হয়নি' : 'None');

  const specialAssistance = booking.specialAssistance || '';

  // 4. Money & Payment Breakdown
  const amount = booking.amount != null ? Number(booking.amount) : 0;
  const formattedAmount = isNaN(amount) ? '0' : amount.toLocaleString('en-US');
  
  const isPayAfter =
    booking.paymentStatus === 'pay_after_service' ||
    booking.paidMethod === 'pay_after_service' ||
    booking.method === 'pay_after_service' ||
    amount === 0;

  const paymentStatusText = isPayAfter
    ? (isBn ? 'সার্ভিস সমাপ্তির পর প্রদেয় (Pay After Service)' : 'Pay After Service')
    : (isBn ? 'পেমেন্ট সম্পন্ন (Paid)' : 'Paid Online');

  const rawMethod = String(booking.paidMethod || booking.method || booking.paymentMethod || '').toLowerCase();
  let paymentMethodText = isBn ? 'অনলাইন পেমেন্ট' : 'Online Payment';
  if (rawMethod.includes('ssl')) {
    paymentMethodText = isBn ? 'এসএসএল কমার্স (SSLCOMMERZ)' : 'SSLCOMMERZ';
  } else if (rawMethod.includes('bkash')) {
    paymentMethodText = isBn ? 'বিকাশ (bKash)' : 'bKash';
  } else if (rawMethod.includes('nagad')) {
    paymentMethodText = isBn ? 'নগদ (Nagad)' : 'Nagad';
  } else if (rawMethod.includes('banglaqr') || rawMethod.includes('qr')) {
    paymentMethodText = isBn ? 'বাংলা কিউআর (Bangla QR)' : 'Bangla QR';
  } else if (rawMethod.includes('card') || rawMethod.includes('bank')) {
    paymentMethodText = isBn ? 'ব্যাংক কার্ড (Card)' : 'Card';
  } else if (isPayAfter) {
    paymentMethodText = isBn ? 'সার্ভিস সমাপ্তির পর পেমেন্ট' : 'Pay After Service';
  }

  const trxId = booking.trxId || booking.paymentId || '';

  if (isBn) {
    return `🛫 *নতুন বুকিং অর্ডার — ফ্লাইট কেয়ার সাপোর্ট অফিস*
━━━━━━━━━━━━━━━━━━━━━
🎫 *বুকিং রেফারেন্স আইডি:* #${bookingCode}

👤 *ক্লায়েন্ট বিবরণ:*
• নাম: ${passengerName}
• মোবাইল নম্বর: ${passengerPhone}${email ? `\n• ইমেইল: ${email}` : ''}
• যাত্রী সংখ্যা: ${paxCount} জন${bookerInfo ? `\n• বুকিং করেছেন: ${bookerInfo}` : ''}

🎯 *গৃহীত সার্ভিসসমূহ:*
• সেবার ধরন: ${directionLabel}
• মূল প্যাকেজ: ${serviceName}
• অতিরিক্ত সেবা: ${addonsDisplay}${specialAssistance ? `\n• বিশেষ অনুরোধ: ${specialAssistance}` : ''}

💰 *টাকার বিবরণ ও পেমেন্ট:*
• মোট ফি: ৳${formattedAmount}
• পেমেন্ট স্ট্যাটাস: ${paymentStatusText}
• পেমেন্ট মাধ্যম: ${paymentMethodText}${trxId ? `\n• ট্রানজেকশন আইডি: ${trxId}` : ''}

📅 *তারিখ ও ফ্লাইট বিবরণ:*
• সার্ভিসের তারিখ: ${serviceDate}
• ফ্লাইটের সময়: ${serviceTime} BST
• ফ্লাইট নম্বর: ${flightNumber}${airline ? `\n• এয়ারলাইন্স: ${airline}${route ? ` (${route})` : ''}` : ''}
• বিমানবন্দর: ${airportLabel} (${terminal})
• অর্ডার নিশ্চিতের সময়: ${orderTimeDisplay}
━━━━━━━━━━━━━━━━━━━━━
📍 *ডিজিটাল প্লেকার্ড ও ট্র্যাকিং লিংক:*
https://flightcaresbd.com/?trackBooking=${bookingCode}

অনুগ্রহ করে দ্রুত বুকিংটি গ্রহণ ও কনফার্ম করুন।`;
  }

  return `🛫 *New Booking Order — Flight Care Support Office*
━━━━━━━━━━━━━━━━━━━━━
🎫 *Booking Reference ID:* #${bookingCode}

👤 *Client Information:*
• Name: ${passengerName}
• Phone: ${passengerPhone}${email ? `\n• Email: ${email}` : ''}
• Passengers: ${paxCount} Pax${bookerInfo ? `\n• Booker: ${bookerInfo}` : ''}

🎯 *Services Purchased:*
• Direction: ${directionLabel}
• Main Package: ${serviceName}
• Additional Services: ${addonsDisplay}${specialAssistance ? `\n• Special Notes: ${specialAssistance}` : ''}

💰 *Payment Details:*
• Total Amount: BDT ${formattedAmount}
• Payment Status: ${paymentStatusText}
• Payment Method: ${paymentMethodText}${trxId ? `\n• TrxID: ${trxId}` : ''}

📅 *Date & Flight Details:*
• Service Date: ${serviceDate}
• Flight Time: ${serviceTime} BST
• Flight Number: ${flightNumber}${airline ? `\n• Airline: ${airline}${route ? ` (${route})` : ''}` : ''}
• Airport: ${airportLabel} (${terminal})
• Confirmation Time: ${orderTimeDisplay}
━━━━━━━━━━━━━━━━━━━━━
📍 *Live Tracking & Placard Link:*
https://flightcaresbd.com/?trackBooking=${bookingCode}

Please confirm this booking immediately.`;
}

/**
 * Returns direct WhatsApp link pre-filled to Support Office
 * Defaults to primary number 8801347570001, or accepts targetPhone ('8801347570001' / '8801347570002')
 */
export function getSupportWhatsAppUrl(booking = {}, lang = 1, targetPhone = SUPPORT_OFFICE_WHATSAPP) {
  const text = formatSupportBookingMessage(booking, lang);
  const cleanPhone = String(targetPhone).replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone || SUPPORT_OFFICE_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

/**
 * Dispatches automated booking notification to Support Office WhatsApp (+8801347570001 and +8801347570002)
 * via Server Proxy /api/whatsapp/send.php
 */
export async function dispatchSupportOfficeWhatsAppAlert(booking = {}) {
  try {
    const bookingCode = booking.id || booking.bookingId || booking.confirmedId || '';
    if (!bookingCode) return { ok: false };

    // 60-second anti-spam deduplication
    const now = Date.now();
    const lastDispatched = dispatchedCache.get(bookingCode);
    if (lastDispatched && (now - lastDispatched < 60000)) {
      return { ok: true, cached: true };
    }
    dispatchedCache.set(bookingCode, now);

    const passengerName =
      booking.passengerName ||
      booking.name ||
      booking.passenger_information?.name ||
      booking.passengerInformation?.name ||
      booking.leadPassenger?.name ||
      booking.bookerName ||
      '';

    const passengerPhone =
      booking.passengerPhone ||
      booking.phone ||
      booking.passenger_information?.phone ||
      booking.passengerInformation?.phone ||
      booking.leadPassenger?.phone ||
      booking.bookerPhone ||
      '';

    const email =
      booking.email ||
      booking.passengerEmail ||
      booking.passenger_information?.email ||
      booking.passengerInformation?.email ||
      '';

    const paxCount = booking.a || booking.passengers || 1;
    const serviceDate = booking.date || booking.flight?.date || booking.serviceDate || '';
    const serviceTime = booking.time || booking.flight?.time || booking.serviceTime || '';
    const flightNumber = (booking.fno || booking.flightNumber || booking.flight?.number || 'BG-084').toUpperCase();
    
    let serviceName = booking.service || booking.package || '';
    if (!serviceName && booking.pkg) {
      serviceName = booking.pkg.n ? booking.pkg.n[0] : (booking.pkg.t || 'VIP Protocol');
    }

    const direction = booking.dir || booking.direction || (booking.svc?.cat) || 'arr';
    const amount = booking.amount != null ? booking.amount : 0;
    const paymentStatus = booking.paymentStatus || booking.paidMethod || 'pay_after_service';
    const paymentMethod = booking.paidMethod || booking.method || booking.paymentMethod || '';
    const trxId = booking.trxId || booking.paymentId || '';

    const orderTimestamp =
      booking.paidAt ||
      booking.confirmedAt ||
      booking.createdAt ||
      booking.timestamp ||
      new Date().toISOString();
    const orderDateObj = new Date(orderTimestamp);
    const isValidDate = !isNaN(orderDateObj.getTime());
    const finalOrderDate = isValidDate ? orderDateObj : new Date();
    const formattedOrderTime = `${finalOrderDate.toLocaleDateString('en-GB')}, ${finalOrderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} BST`;

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
        email,
        passengers: paxCount,
        direction,
        serviceName,
        addons: booking.addons || [],
        specialAssistance: booking.specialAssistance || '',
        orderTime: formattedOrderTime,
        serviceDate,
        serviceTime,
        flightNumber,
        airline: booking.airline || booking.flight?.airline || '',
        route: booking.route || booking.flight?.route || '',
        terminal: booking.terminal || booking.flight?.terminal || 'Terminal 1',
        amount,
        paymentStatus,
        paymentMethod,
        trxId,
        airport: booking.airport || 'DAC',
        bookingForSomeoneElse: Boolean(booking.bookingForSomeoneElse),
        bookerName: booking.name || booking.bookerName || '',
        bookerPhone: booking.phone || booking.bookerPhone || '',
        supportPhones: SUPPORT_OFFICE_WHATSAPP_NUMBERS,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Support Office WhatsApp Alert Dispatched to 01347-570001 & 01347-570002:', data);
      return data;
    }
  } catch (err) {
    console.warn('⚠️ Support Office WhatsApp dispatch warning:', err?.message || err);
  }
  return { ok: false };
}

/**
 * 1-Click Launch WhatsApp to Support Office
 * Defaults to primary (+8801347570001) or opens given number (+8801347570002)
 */
export function openSupportOfficeWhatsApp(booking = {}, lang = 1, targetPhone = SUPPORT_OFFICE_WHATSAPP) {
  const url = getSupportWhatsAppUrl(booking, lang, targetPhone);
  Linking.openURL(url).catch(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  });
}


/**
 * Extract and normalize client phone for WhatsApp (e.g. 88017XXXXXXXX)
 */
export function extractClientWhatsAppNumber(booking = {}) {
  const raw =
    booking.phone ||
    booking.passengerPhone ||
    booking.customerPhone ||
    booking.contactPhone ||
    booking.contactNumber ||
    booking.passenger_information?.phone ||
    booking.passengerInformation?.phone ||
    booking.leadPassenger?.phone ||
    booking.bookerPhone ||
    (Array.isArray(booking.passengers) && booking.passengers[0]?.phone) ||
    '';
  let clean = String(raw).replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('01') && clean.length === 11) {
    clean = '88' + clean;
  } else if (clean.startsWith('1') && clean.length === 10) {
    clean = '880' + clean;
  }
  return clean;
}

/**
 * Format official customer booking confirmation / update message for WhatsApp
 */
export function formatCustomerBookingMessage(booking = {}, lang = 1) {
  const isBn = Boolean(lang);
  const bookingCode = booking.id || booking.bookingId || booking.confirmedId || 'FC-PENDING';

  const passengerName =
    booking.passengerName ||
    booking.name ||
    booking.passenger_information?.name ||
    booking.passengerInformation?.name ||
    booking.leadPassenger?.name ||
    booking.bookerName ||
    (Array.isArray(booking.passengers) && booking.passengers[0]?.name) ||
    (isBn ? 'সম্মানিত যাত্রী' : 'Valued Passenger');

  const flightNumber = (
    booking.fno ||
    booking.flightNumber ||
    booking.flight?.number ||
    'BG-084'
  ).toUpperCase();

  const serviceDate =
    booking.date ||
    booking.flight?.date ||
    booking.serviceDate ||
    '';

  const serviceTime =
    booking.time ||
    booking.flight?.time ||
    booking.serviceTime ||
    '';

  const airport = booking.airport || booking.airport_code || 'DAC';
  const airportLabel = airport === 'DAC' 
    ? (isBn ? 'ঢাকা বিমানবন্দর (HSIA)' : 'Dhaka Airport (HSIA)') 
    : airport;
  const terminal = booking.terminal || booking.flight?.terminal || 'Terminal 1';

  const direction = booking.dir || booking.direction || (booking.svc?.cat) || 'arr';
  const isDep = direction === 'dep' || String(direction).toLowerCase().includes('depart');
  const directionLabel = isDep
    ? (isBn ? 'প্রস্থান প্রোটোকল (Departure)' : 'Departure Protocol')
    : (isBn ? 'আগমন প্রোটোকল (Arrival)' : 'Arrival Protocol');

  let serviceName = booking.service || booking.package || '';
  if (!serviceName && booking.pkg) {
    serviceName = booking.pkg.n ? booking.pkg.n[isBn ? 1 : 0] : (booking.pkg.t || 'VIP Protocol');
  }
  if (!serviceName) {
    serviceName = isBn ? 'ভিআইপি প্রোটোকল সার্ভিস' : 'VIP Protocol Service';
  }

  const rawAddons = booking.addons || [];
  let addonsFormattedList = [];
  if (Array.isArray(rawAddons) && rawAddons.length > 0) {
    rawAddons.forEach(ad => {
      const key = typeof ad === 'string' ? ad.toLowerCase() : (ad?.id ? String(ad.id).toLowerCase() : '');
      const mapped = ADDON_NAMES_MAP[key];
      if (mapped) {
        addonsFormattedList.push(isBn ? mapped.bn : mapped.en);
      } else if (ad && typeof ad === 'object' && ad.name) {
        addonsFormattedList.push(ad.name);
      } else if (key) {
        addonsFormattedList.push(key);
      }
    });
  }
  const addonsDisplay = addonsFormattedList.length > 0 ? addonsFormattedList.join(', ') : '';

  const amount = booking.amount != null ? Number(booking.amount) : 0;
  const formattedAmount = isNaN(amount) ? '0' : amount.toLocaleString('en-US');

  const isPayAfter =
    booking.paymentStatus === 'pay_after_service' ||
    booking.paidMethod === 'pay_after_service' ||
    booking.method === 'pay_after_service';

  const paymentStatusText = isPayAfter
    ? (isBn ? 'সার্ভিস শেষে প্রদেয় (Pay After Service)' : 'Pay After Service')
    : (booking.paymentStatus === 'paid'
        ? (isBn ? 'পেমেন্ট সম্পন্ন (Paid)' : 'Paid Online')
        : (isBn ? 'বকেয়া (Pending)' : 'Pending'));

  const staffName = booking.staff || booking.leadStaffName || '';
  const staffPhone = booking.staffPhone || booking.leadStaffPhone || '';

  if (isBn) {
    return `🛫 *ফ্লাইট কেয়ার — এয়ারপোর্ট ভিআইপি প্রোটোকল সার্ভিস*
━━━━━━━━━━━━━━━━━━━━━
সম্মানিত *${passengerName}*,
ফ্লাইট কেয়ারে আপনার এয়ারপোর্ট মিট অ্যান্ড গ্রিট সার্ভিস সংক্রান্ত বিবরণ:

🎫 *বুকিং রেফারেন্স আইডি:* #${bookingCode}
✈️ *ফ্লাইট নম্বর:* ${flightNumber}
📅 *সার্ভিসের তারিখ:* ${serviceDate}${serviceTime ? ` (${serviceTime} BST)` : ''}
📍 *বিমানবন্দর:* ${airportLabel} (${terminal})
🎯 *সার্ভিস:* ${directionLabel} — ${serviceName}${addonsDisplay ? `\n📦 *অতিরিক্ত সেবা:* ${addonsDisplay}` : ''}
💰 *ফি ও পেমেন্ট স্ট্যাটাস:* ৳${formattedAmount} (${paymentStatusText})${staffName ? `\n👤 *নিযুক্ত প্রোটোকল কর্মকর্তা:* ${staffName}${staffPhone ? ` (${staffPhone})` : ''}` : ''}
━━━━━━━━━━━━━━━━━━━━━
📍 *আপনার লাইভ সার্ভিস ট্র্যাকিং ও প্লেকার্ড লিংক:*
https://flightcaresbd.com/?trackBooking=${bookingCode}

📞 যেকোনো সহায়তায় ফ্লাইট কেয়ার হেল্পলাইন:
01347-570001, 01347-570002

আপনার যাত্রা নিরাপদ ও আনন্দময় হোক!`;
  }

  return `🛫 *Flight Care — Airport VIP Protocol Service*
━━━━━━━━━━━━━━━━━━━━━
Dear *${passengerName}*,
Here are your Airport Meet & Greet service details with Flight Care:

🎫 *Booking ID:* #${bookingCode}
✈️ *Flight No:* ${flightNumber}
📅 *Service Date:* ${serviceDate}${serviceTime ? ` (${serviceTime} BST)` : ''}
📍 *Airport:* ${airportLabel} (${terminal})
🎯 *Service:* ${directionLabel} — ${serviceName}${addonsDisplay ? `\n📦 *Extra Addons:* ${addonsDisplay}` : ''}
💰 *Total Fee:* ৳${formattedAmount} (${paymentStatusText})${staffName ? `\n👤 *Assigned Protocol Officer:* ${staffName}${staffPhone ? ` (${staffPhone})` : ''}` : ''}
━━━━━━━━━━━━━━━━━━━━━
📍 *Live Status Tracking & Placard:*
https://flightcaresbd.com/?trackBooking=${bookingCode}

📞 Support Hotline: +880 1347-570001, +880 1347-570002

We look forward to welcoming you at the airport!`;
}

/**
 * Generate 1-Click WhatsApp URL for Client
 */
export function getCustomerWhatsAppUrl(booking = {}, lang = 1) {
  const phone = extractClientWhatsAppNumber(booking);
  const text = formatCustomerBookingMessage(booking, lang);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * 1-Click Launch WhatsApp directly chatting with Customer / Client
 */
export function openCustomerWhatsApp(booking = {}, lang = 1) {
  const phone = extractClientWhatsAppNumber(booking);
  if (!phone) {
    const errorTitle = lang ? 'ফোন নম্বর পাওয়া যায়নি' : 'No Phone Number';
    const errorMsg = lang
      ? 'এই বুকিংয়ে ক্লায়েন্টের কোনো মোবাইল নম্বর সংরক্ষিত নেই।'
      : 'No client mobile phone number found for this booking.';
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`${errorTitle}: ${errorMsg}`);
    } else {
      Alert.alert(errorTitle, errorMsg);
    }
    return false;
  }

  const url = getCustomerWhatsAppUrl(booking, lang);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank');
  } else {
    Linking.openURL(url).catch(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    });
  }
  return true;
}

export default {
  extractClientWhatsAppNumber,
  formatCustomerBookingMessage,
  getCustomerWhatsAppUrl,
  openCustomerWhatsApp,
  SUPPORT_OFFICE_WHATSAPP,
  SUPPORT_OFFICE_WHATSAPP_2,
  SUPPORT_OFFICE_WHATSAPP_NUMBERS,
  SUPPORT_OFFICE_PHONE_DISPLAY,
  formatSupportBookingMessage,
  getSupportWhatsAppUrl,
  dispatchSupportOfficeWhatsAppAlert,
  openSupportOfficeWhatsApp,
};
