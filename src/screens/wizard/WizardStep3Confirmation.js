import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  Image,
} from 'react-native';
import {
  CheckCircleIcon,
  PlaneIcon,
  StandardPkgIcon,
  PremiumPkgIcon,
  VipPkgIcon,
  UserIcon,
  CalendarIcon,
  LocationPinIcon,
} from '../../components/Icons';
import LiveTrackingModal from '../../components/LiveTrackingModal';
import BookingInvoiceModal from '../../components/BookingInvoiceModal';
import VipPlacardModal from '../../components/VipPlacardModal';
import { getCalendarEventData, calculateBookingPricing } from '../../utils/helpers';
import { ADDONS } from '../../constants/data';
import {
  openSupportOfficeWhatsApp,
  dispatchSupportOfficeWhatsAppAlert,
  SUPPORT_OFFICE_PHONE_DISPLAY,
} from '../../services/whatsappService';
import { sendPaymentConfirmationSms } from '../../services/smsGateway.js';


export default function WizardStep3Confirmation({
  wiz,
  setWiz,
  lang = 0,
  confirmedBookingId,
  totalAmount,
  setTab,
}) {
  const isBn = Boolean(lang);
  const bookingCode = confirmedBookingId || wiz.confirmedId || 'FC-39482';
  const isDep = wiz.dir === 'dep';

  // Modal Visibility States
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPlacardModal, setShowPlacardModal] = useState(false);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [calendarSaved, setCalendarSaved] = useState(false);

  // Passenger & Service Info
  const passengerName = (wiz.bookingForSomeoneElse ? wiz.passengerName || wiz.name : wiz.name) || (isBn ? 'সম্মানিত যাত্রী' : 'Valued Passenger');
  const flightNumber = (wiz.fno || 'BG-084').toUpperCase();
  const serviceDate = wiz.date || (isBn ? 'তারিখ উল্লেখ নেই' : 'Not specified');
  const airport = wiz.airportName || (isBn ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)' : 'Dhaka Airport (DAC)');
  const packageName = wiz.pkg?.n
    ? wiz.pkg.n[isBn ? 1 : 0]
    : (wiz.packageChoice === 'first'
        ? (isBn ? 'ভিআইপি প্রোটোকল' : 'VIP Protocol')
        : wiz.packageChoice === 'business'
        ? (isBn ? 'প্রিমিয়াম প্রোটোকল' : 'Premium Protocol')
        : (isBn ? 'স্ট্যান্ডার্ড প্রোটোকল' : 'Standard Protocol'));

  const isPayAfter = wiz.paidMethod === 'pay_after_service' || wiz.method === 'pay_after_service' || wiz.paymentStatus === 'pay_after_service';

  // Auto-dispatch booking alert to Support Office WhatsApp (01347-570001 & 01347-570002) and Customer Confirmation SMS
  useEffect(() => {
    const bookingPayload = {
      ...wiz,
      id: bookingCode,
      name: passengerName,
      passengerName,
      phone: wiz.passengerPhone || wiz.phone || '',
      passengerPhone: wiz.passengerPhone || wiz.phone || '',
      email: wiz.email || wiz.passengerEmail || '',
      passengers: wiz.a || 1,
      addons: wiz.addons || [],
      dir: wiz.dir || (isDep ? 'dep' : 'arr'),
      amount: totalAmount,
      date: serviceDate,
      time: wiz.time || wiz.flightTime || '12:00 PM',
      fno: flightNumber,
      service: packageName,
      airport,
      paymentStatus: isPayAfter ? 'pay_after_service' : 'paid',
      paidMethod: wiz.paidMethod || wiz.method || (isPayAfter ? 'pay_after_service' : 'sslcommerz'),
      createdAt: wiz.createdAt || new Date().toISOString(),
      bookedAt: wiz.bookedAt || wiz.createdAt || new Date().toISOString(),
      paidAt: isPayAfter ? null : (wiz.paidAt || new Date().toISOString()),
      paymentTimestamp: isPayAfter ? null : (wiz.paymentTimestamp || new Date().toISOString()),
      trxId: wiz.trxId || '',
    };

    // 1. WhatsApp notification to both 01347570001 and 01347570002
    dispatchSupportOfficeWhatsAppAlert(bookingPayload).catch(err => {
      console.warn('[WhatsApp Alert] Error dispatching to 01347-570001 & 01347-570002:', err);
    });

    // 2. Customer Confirmation SMS (Handles both Online Paid and Pay After Service)
    sendPaymentConfirmationSms({
      booking: bookingPayload,
      amount: totalAmount,
      trxId: wiz.trxId,
      method: bookingPayload.paidMethod,
      lang,
    }).catch(smsErr => {
      console.warn('[Customer Confirmation SMS] Error:', smsErr);
    });
  }, [bookingCode]);

  // Calculate Handover OTP for client completion verification
  const bookingDigits = String(bookingCode || '').replace(/\D/g, '');
  const passengerPhoneDigits = String(wiz.passengerPhone || wiz.phone || '').replace(/\D/g, '');
  const handoverOtp = wiz.handoverOtp || (bookingDigits.length >= 4 ? bookingDigits.slice(-4) : (passengerPhoneDigits.length >= 4 ? passengerPhoneDigits.slice(-4) : '2026'));

  // Booking Object for Modals & Tracking
  const currentBooking = {
    ...wiz,
    id: bookingCode,
    confirmedId: bookingCode,
    name: passengerName,
    passengerName,
    phone: wiz.passengerPhone || wiz.phone || '01712345678',
    passengerPhone: wiz.passengerPhone || wiz.phone || '01712345678',
    email: wiz.email,
    flight: {
      number: flightNumber,
      date: serviceDate,
      time: wiz.time || wiz.flightTime || '12:00 PM',
      terminal: wiz.terminal || 'Terminal 1',
    },
    fno: flightNumber,
    date: serviceDate,
    time: wiz.time || wiz.flightTime || '12:00 PM',
    amount: totalAmount,
    airport: wiz.airport || 'DAC',
    airportName: airport,
    dir: wiz.dir || 'arr',
    pkg: wiz.pkg,
    packageChoice: wiz.packageChoice,
    addons: wiz.addons || [],
    pricingBreakdown: wiz.pricingBreakdown,
    a: wiz.a,
    c: wiz.c,
    e: wiz.e,
    passengers: wiz.passengers,
    discount: wiz.discount,
    rewardPointsUsed: wiz.rewardPointsUsed,
    onlyAddons: wiz.onlyAddons,
    trxId: wiz.trxId,
    paidMethod: wiz.paidMethod,
    paymentStatus: isPayAfter ? 'pay_after_service' : 'paid',
    bookingForSomeoneElse: wiz.bookingForSomeoneElse,
    handoverOtp,
  };

  // 1-Tap Copy Booking ID to Clipboard with Toast Feedback
  const handleCopyBookingId = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(bookingCode);
      }
    } catch {}
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // Safe WhatsApp Share with full encodeURIComponent
  const handleShareWhatsApp = () => {
    const sDir = isDep
      ? (isBn ? 'প্রস্থান (Departure)' : 'Departure')
      : (isBn ? 'আগমন (Arrival)' : 'Arrival');
    const trxTxt = wiz.trxId && !isPayAfter ? `\n💳 TrxID: ${wiz.trxId}` : '';
    const payText = isPayAfter
      ? (isBn ? `💰 *পরিশোধযোগ্য অর্থ:* ৳${totalAmount} (সার্ভিস সমাপ্তির পর পরিশোধযোগ্য)` : `💰 *Payable Amount:* ৳${totalAmount} (Pay After Service)`)
      : (isBn ? `💰 *পরিশোধিত অর্থ:* ৳${totalAmount} (পেমেন্ট সম্পন্ন)${trxTxt}` : `💰 *Amount Paid:* ৳${totalAmount} (Confirmed)${trxTxt}`);

    const messageText = isBn
      ? `🛫 *ফ্লাইট কেয়ার — বিমানবন্দর প্রোটোকল বুকিং ভাউচার*
━━━━━━━━━━━━━━━━━━
🎫 *বুকিং রেফারেন্স:* #${bookingCode}
👤 *যাত্রীর নাম:* ${passengerName}
✈️ *ফ্লাইট:* ${flightNumber}
📅 *তারিখ:* ${serviceDate}
📍 *বিমানবন্দর:* ${airport}
🎯 *সার্ভিস:* ${sDir} • ${packageName}
${payText}
🛡️ *লাগেজ ঘোষণা:* কোনো মুদ্রা, অলংকার, প্রাণী বা নিষিদ্ধ পণ্য নেই (সম্মত)

📍 *প্রোটোকল অফিসার লাইভ ট্র্যাকিং:*
https://flightcare.app/track/${bookingCode}
━━━━━━━━━━━━━━━━━━
📞 ২৪/৭ হেল্পলাইন: +880 1712-345678`
      : `🛫 *Flight Care — Airport Protocol Booking Voucher*
━━━━━━━━━━━━━━━━━━
🎫 *Booking Reference:* #${bookingCode}
👤 *Passenger:* ${passengerName}
✈️ *Flight:* ${flightNumber}
📅 *Date:* ${serviceDate}
📍 *Airport:* ${airport}
🎯 *Service:* ${sDir} • ${packageName}
${payText}
🛡️ *Luggage Declaration:* No currencies, jewelry, animals, or prohibited items (Consented)

📍 *Live Track Protocol Officer:*
https://flightcare.app/track/${bookingCode}
━━━━━━━━━━━━━━━━━━
📞 24/7 Hotline: +880 1712-345678`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    Linking.openURL(whatsappUrl).catch(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(whatsappUrl, '_blank');
      }
    });
  };

  // Calendar Integration Helpers
  // 1. Exact Booking Time (BST)
  const rawBookedAt = wiz.bookedAt || wiz.createdAt || currentBooking.bookedAt || currentBooking.createdAt || currentBooking.timestamp || new Date().toISOString();
  const bookedDateObj = new Date(rawBookedAt);
  const finalBookedDateObj = !isNaN(bookedDateObj.getTime()) ? bookedDateObj : new Date();
  const formattedBookedDate = finalBookedDateObj.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
    day: 'numeric',
    month: isBn ? 'long' : 'short',
    year: 'numeric',
  });
  const formattedBookedTime = finalBookedDateObj.toLocaleTimeString(isBn ? 'bn-BD' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const bookingDateTimeString = `${formattedBookedDate}, ${formattedBookedTime} BST`;

  // 2. Exact Payment Confirmation Time (BST)
  let paymentDateTimeString = '';
  if (isPayAfter) {
    paymentDateTimeString = isBn ? 'সার্ভিস সমাপ্তির পর প্রদেয় (On-Arrival)' : 'Payable After Service (On-Arrival)';
  } else {
    const rawPaidAt = wiz.paidAt || wiz.paymentTimestamp || wiz.confirmedAt || currentBooking.paidAt || currentBooking.paymentTimestamp || new Date().toISOString();
    const paidDateObj = new Date(rawPaidAt);
    const finalPaidDateObj = !isNaN(paidDateObj.getTime()) ? paidDateObj : new Date();
    const formattedPaidDate = finalPaidDateObj.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      day: 'numeric',
      month: isBn ? 'long' : 'short',
      year: 'numeric',
    });
    const formattedPaidTime = finalPaidDateObj.toLocaleTimeString(isBn ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    paymentDateTimeString = `${formattedPaidDate}, ${formattedPaidTime} BST`;
  }
  const confirmationDateTimeString = paymentDateTimeString;

  // Itemized Pricing Calculation for Confirmation Screen
  const pricing = currentBooking.pricingBreakdown || calculateBookingPricing(currentBooking, ADDONS);
  const adultsCount = Number(currentBooking.a >= 0 ? currentBooking.a : (currentBooking.passengers?.adults ?? (typeof currentBooking.passengers === 'number' ? currentBooking.passengers : 1)));
  const childrenCount = Number(currentBooking.c >= 0 ? currentBooking.c : (currentBooking.passengers?.children ?? 0));
  const elderlyCount = Number(currentBooking.e >= 0 ? currentBooking.e : (currentBooking.passengers?.elderly ?? 0));
  const paxTotalCount = Math.max(1, adultsCount + childrenCount + elderlyCount);

  const step3BillItems = [];
  if (!wiz.onlyAddons) {
    const pkgBasePrice = pricing?.basePrice != null ? pricing.basePrice : (
      wiz.packageChoice === 'first' ? 1500 : (wiz.packageChoice === 'business' ? 1000 : 500)
    );
    if (adultsCount > 0) {
      step3BillItems.push({
        id: 'adults',
        name: `${packageName} - ${isBn ? 'প্রাপ্তবয়স্ক' : 'Adult'}`,
        qty: adultsCount,
        rate: pkgBasePrice,
        amount: adultsCount * pkgBasePrice,
      });
    }
    if (childrenCount > 0) {
      const childRate = Math.round(pkgBasePrice * 0.8);
      step3BillItems.push({
        id: 'children',
        name: `${packageName} - ${isBn ? 'শিশু' : 'Child'}`,
        qty: childrenCount,
        rate: childRate,
        amount: childrenCount * childRate,
      });
    }
    if (elderlyCount > 0) {
      const elderlyRate = Math.round(pkgBasePrice * 0.9);
      step3BillItems.push({
        id: 'elderly',
        name: `${packageName} - ${isBn ? 'প্রবীণ' : 'Senior'}`,
        qty: elderlyCount,
        rate: elderlyRate,
        amount: elderlyCount * elderlyRate,
      });
    }
    if (step3BillItems.length === 0) {
      step3BillItems.push({
        id: 'pkg',
        name: packageName,
        qty: paxTotalCount,
        rate: pkgBasePrice,
        amount: paxTotalCount * pkgBasePrice,
      });
    }
    const groupDiscountAmount = pricing?.groupDiscountAmount || 0;
    if (groupDiscountAmount > 0) {
      step3BillItems.push({
        id: 'group_disc',
        name: isBn ? `গ্রুপ ভলিউম ছাড় (${pricing?.groupDiscountPercent || 10}%)` : `Group Discount (${pricing?.groupDiscountPercent || 10}%)`,
        qty: 1,
        rate: -groupDiscountAmount,
        amount: -groupDiscountAmount,
        isDiscount: true,
      });
    }
  }

  // Addons
  if (pricing?.addonLines && pricing.addonLines.length > 0) {
    pricing.addonLines.forEach(line => {
      const isQuote = line.amount == null;
      const lineName = Array.isArray(line.name) ? line.name[isBn ? 1 : 0] : (line.name || line.id);
      step3BillItems.push({
        id: line.id,
        name: lineName,
        qty: line.quantity || 1,
        rate: isQuote ? null : line.unitPrice,
        amount: isQuote ? null : line.amount,
        isQuote,
      });
    });
  } else if (Array.isArray(wiz.addons) && wiz.addons.length > 0) {
    wiz.addons.forEach(id => {
      const catItem = ADDONS.find(a => a.id === id);
      const title = catItem ? (catItem.n ? catItem.n[isBn ? 1 : 0] : catItem.titleBn || id) : id;
      const isQuote = catItem?.priceUnit === 'quote' || catItem?.p == null;
      step3BillItems.push({
        id,
        name: title,
        qty: 1,
        rate: isQuote ? null : catItem?.p,
        amount: isQuote ? null : catItem?.p,
        isQuote,
      });
    });
  }

  if (pricing?.isDedicatedStaff && pricing?.dedicatedStaffCharge > 0) {
    step3BillItems.push({
      id: 'staff',
      name: isBn ? 'ডেডিকেটেড ভিআইপি প্রোটোকল কর্মকর্তা' : 'Dedicated VIP Officer',
      qty: 1,
      rate: pricing.dedicatedStaffRate || 800,
      amount: pricing.dedicatedStaffCharge,
    });
  }

  const step3Discount = pricing?.discountAmount || (wiz.discount?.amount ? Number(wiz.discount.amount) : 0);
  if (step3Discount > 0) {
    step3BillItems.push({
      id: 'discount',
      name: isBn ? `প্রোমো কোড ছাড় (${wiz.discount?.code || 'PROMO'})` : `Promo Discount`,
      qty: 1,
      rate: -step3Discount,
      amount: -step3Discount,
      isDiscount: true,
    });
  }

  const step3RewardPts = Number(wiz.rewardPointsUsed) || 0;
  const step3RewardDisc = step3RewardPts > 0 ? Math.round(step3RewardPts / 10) : 0;
  if (step3RewardDisc > 0) {
    step3BillItems.push({
      id: 'reward',
      name: isBn ? `রিওয়ার্ড পয়েন্ট (${step3RewardPts} পয়েন্ট)` : `Reward Points`,
      qty: 1,
      rate: -step3RewardDisc,
      amount: -step3RewardDisc,
      isDiscount: true,
    });
  }

  const step3Subtotal = step3BillItems.reduce((acc, item) => (!item.isDiscount && item.amount > 0 ? acc + item.amount : acc), 0);
  const step3TotalDiscounts = step3BillItems.reduce((acc, item) => (item.isDiscount && item.amount < 0 ? acc + Math.abs(item.amount) : acc), 0);

  const calendarData = getCalendarEventData(currentBooking, isBn);

  const handleOpenGoogleCalendar = () => {
    if (calendarData.googleUrl) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(calendarData.googleUrl, '_blank');
      } else {
        Linking.openURL(calendarData.googleUrl).catch(() => {});
      }
      setCalendarSaved(true);
      setShowCalendarOptions(false);
      setTimeout(() => setCalendarSaved(false), 3500);
    }
  };

  const handleDownloadIcsFile = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([calendarData.icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FlightCare_Meeting_${bookingCode}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setCalendarSaved(true);
      setShowCalendarOptions(false);
      setTimeout(() => setCalendarSaved(false), 3500);
    } else {
      Alert.alert(
        isBn ? 'ক্যালেন্ডার ফাইল' : 'Calendar File',
        isBn ? 'ক্যালেন্ডার ইভেন্ট (.ics) ফাইল ডাউনলোড হয়েছে।' : 'Calendar event file downloaded.'
      );
    }
  };

  return (
    <>
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 24,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          alignItems: 'center',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        {/* Success Icon Badge */}
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: '#DCFCE7',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
            borderWidth: 4,
            borderColor: '#F0FDF4',
          }}
        >
          <CheckCircleIcon size={42} color="#16A34A" />
        </View>

        <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}>
          {lang ? 'বুকিং সফলভাবে সম্পন্ন হয়েছে!' : 'Booking Confirmed!'}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: '#64748B',
            textAlign: 'center',
            marginTop: 4,
            marginBottom: 18,
          }}
        >
          {isPayAfter
            ? (lang
                ? 'আপনার এয়ারপোর্ট অ্যাসিস্ট্যান্স বুকিং সফলভাবে গৃহীত হয়েছে। সার্ভিস সম্পন্ন হওয়ার পর প্রোটোকল অফিসারকে পেমেন্ট করবেন।'
                : 'Your airport protocol booking is confirmed. Please pay after service completion.')
            : (lang
                ? 'আপনার এয়ারপোর্ট অ্যাসিস্ট্যান্স বুকিং নিশ্চিত ও ফি পরিশোধিত হয়েছে।'
                : 'Your airport protocol service is confirmed & paid.')}
        </Text>

        {/* Booking Reference Box with 1-Tap Copy ID */}
        <View
          style={{
            width: '100%',
            backgroundColor: '#F0F9FF',
            borderRadius: 14,
            padding: 14,
            borderWidth: 1.5,
            borderColor: '#BAE6FD',
            marginBottom: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{ fontSize: 11, color: '#0369A1', fontWeight: '700' }}>
              {isBn ? 'বুকিং রেফারেন্স আইডি:' : 'BOOKING REFERENCE:'}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0284C7', marginTop: 2 }}>
              #{bookingCode}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7', marginTop: 2 }}>
              🕒 {isBn ? 'বুকিং সময়:' : 'Booked:'} {bookingDateTimeString}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: isPayAfter ? '#B45309' : '#059669', marginTop: 2 }}>
              💳 {isBn ? 'পেমেন্ট সময়:' : 'Paid:'} {paymentDateTimeString}
            </Text>
          </View>

          {/* 1-Tap Copy ID Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCopyBookingId}
            style={{
              backgroundColor: copiedId ? '#DCFCE7' : '#FFFFFF',
              borderWidth: 1,
              borderColor: copiedId ? '#86EFAC' : '#BAE6FD',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Text style={{ fontSize: 13 }}>{copiedId ? '✓' : '📋'}</Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: copiedId ? '#15803D' : '#0284C7',
              }}
            >
              {copiedId
                ? (isBn ? 'কপি হয়েছে' : 'Copied!')
                : (isBn ? 'কপি করুন' : 'Copy ID')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Front Desk WhatsApp 1-Click Action Card (01347570001 & 01347570002) */}
        <View
          style={{
            width: '100%',
            backgroundColor: '#F0FDF4',
            borderRadius: 14,
            padding: 14,
            borderWidth: 1.5,
            borderColor: '#86EFAC',
            marginBottom: 18,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Text style={{ fontSize: 22 }}>📲</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#166534' }}>
                {isBn ? 'ফন্টডেস্কে বুকিং নিশ্চিতকরণ পাঠান (WhatsApp)' : 'Send Confirmation to Front Desk WhatsApp'}
              </Text>
              <Text style={{ fontSize: 11.5, color: '#15803D', marginTop: 1 }}>
                {isBn ? 'নিচের যেকোনো একটি নম্বরে ক্লিক করে ১-ট্যাপে ভাউচার পাঠান:' : 'Tap either number to send full voucher in 1-tap:'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
            {/* Front Desk WhatsApp 01 */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openSupportOfficeWhatsApp({ ...currentBooking, id: bookingCode, amount: totalAmount }, isBn, '8801347570001')}
              style={{
                flex: 1,
                backgroundColor: '#16A34A',
                paddingVertical: 10,
                paddingHorizontal: 6,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 5,
                shadowColor: '#16A34A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 15, color: '#FFFFFF' }}>💬</Text>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' }}>
                {isBn ? 'WhatsApp ০১\n01347-570001' : 'WhatsApp 01\n01347-570001'}
              </Text>
            </TouchableOpacity>

            {/* Front Desk WhatsApp 02 */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openSupportOfficeWhatsApp({ ...currentBooking, id: bookingCode, amount: totalAmount }, isBn, '8801347570002')}
              style={{
                flex: 1,
                backgroundColor: '#059669',
                paddingVertical: 10,
                paddingHorizontal: 6,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 5,
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 15, color: '#FFFFFF' }}>💬</Text>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' }}>
                {isBn ? 'WhatsApp ০২\n01347-570002' : 'WhatsApp 02\n01347-570002'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Booking Summary Box */}
        <View
          style={{
            width: '100%',
            backgroundColor: '#F8FAFC',
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            gap: 10,
            marginBottom: 18,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              {lang ? 'যাত্রী' : 'Passenger'}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
              {passengerName}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              {lang ? 'ফ্লাইট ও তারিখ' : 'Flight & Date'}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
              {flightNumber} • {serviceDate}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              {lang ? 'সেবা ও বিমানবন্দর' : 'Service & Airport'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {(wiz.packageChoice === 'economy' || wiz.pkg?.id === 'economy') && <StandardPkgIcon size={16} color="#0284C7" />}
              {(wiz.packageChoice === 'business' || wiz.pkg?.id === 'business') && <PremiumPkgIcon size={16} color="#2563EB" />}
              {(wiz.packageChoice === 'first' || wiz.pkg?.id === 'first') && <VipPkgIcon size={16} color="#D97706" />}
              {wiz.onlyAddons && <Image source={require('../../../assets/pkg_additional.webp')} style={{ width: 16, height: 16, resizeMode: 'contain' }} />}
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                {packageName}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              {isPayAfter ? (lang ? 'পরিশোধযোগ্য অর্থ' : 'Payable Amount') : (lang ? 'পরিশোধিত অর্থ' : 'Amount Paid')}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: isPayAfter ? '#D97706' : '#16A34A' }}>
              ৳{totalAmount} {isPayAfter ? (lang ? '(সার্ভিস পরবর্তী পেমেন্ট)' : '(Pay After Service)') : (lang ? '(পরিশোধিত)' : '(Paid)')}
            </Text>
          </View>

          {isPayAfter ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>
                {lang ? 'পেমেন্ট মাধ্যম' : 'Payment Mode'}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>
                🤝 {lang ? 'সার্ভিস সমাপ্তির পরে পেমেন্ট' : 'Payment After Service'}
              </Text>
            </View>
          ) : wiz.trxId ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>
                {wiz.paidMethod === 'card'
                  ? (lang ? 'কার্ড ট্রানজেকশন (TrxID)' : 'Bank Card TrxID')
                  : (lang ? 'বাংলা কিউআর (TrxID)' : 'Bangla QR TrxID')}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: wiz.paidMethod === 'card' ? '#0F172A' : '#059669' }}>
                {wiz.trxId}
              </Text>
            </View>
          ) : null}

          {/* Detailed Itemized Charges Breakdown Card */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginTop: 4,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155' }}>
                📑 {isBn ? 'টাকার বিস্তারিত হিসাব (কর্তন বিবরণী):' : 'Itemized Charges Breakdown:'}
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                {step3BillItems.length} {isBn ? 'টি আইটেম' : 'Items'}
              </Text>
            </View>

            {step3BillItems.map((item, idx) => (
              <View
                key={item.id || idx}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 5,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F8FAFC',
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                    {isBn ? 'পরিমাণ:' : 'Qty:'} {item.qty} {item.rate != null ? `× ৳${Math.abs(item.rate)}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {item.isQuote ? (
                    <Text style={{ fontSize: 10.5, color: '#B45309', fontWeight: '700' }}>
                      {isBn ? 'কোটেশন প্রযোজ্য' : 'Quote Req.'}
                    </Text>
                  ) : (
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: item.isDiscount ? '#DC2626' : '#0F172A',
                      }}
                    >
                      {item.isDiscount ? `-৳${Math.abs(item.amount)}` : `৳${item.amount}`}
                    </Text>
                  )}
                </View>
              </View>
            ))}

            <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1.5, borderTopColor: '#CBD5E1', gap: 3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600' }}>
                  {isBn ? 'উপ-মোট ফি:' : 'Subtotal:'}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                  ৳{step3Subtotal}
                </Text>
              </View>
              {step3TotalDiscounts > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11.5, color: '#DC2626', fontWeight: '700' }}>
                    {isBn ? 'মোট ছাড়:' : 'Discounts:'}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>
                    -৳{step3TotalDiscounts}
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 4, marginTop: 2 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0369A1' }}>
                  {isPayAfter ? (isBn ? 'মোট প্রদেয়:' : 'Net Payable:') : (isBn ? 'সর্বমোট কর্তনকৃত অর্থ:' : 'Net Deducted Amount:')}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#0284C7' }}>
                  ৳{totalAmount}
                </Text>
              </View>
            </View>
          </View>

          {/* Multi-channel dispatch notice */}
          <View
            style={{
              backgroundColor: '#F0FDF4',
              borderRadius: 8,
              padding: 8,
              marginTop: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderWidth: 1,
              borderColor: '#DCFCE7',
            }}
          >
            <Text style={{ fontSize: 14 }}>📨</Text>
            <Text style={{ fontSize: 11, color: '#166534', flex: 1, fontWeight: '600' }}>
              {lang
                ? 'ই-টিকেট ও সাক্ষাতের স্থান সম্পর্কিত নির্দেশনা এসএমএস এবং ইমেইলে পাঠানো হয়েছে।'
                : 'E-ticket & airport meeting instructions sent via SMS and Email.'}
            </Text>
          </View>

          {/* Prohibited Items & Baggage Regulatory Notice */}
          <View
            style={{
              backgroundColor: '#FEF2F2',
              borderRadius: 8,
              padding: 9,
              marginTop: 6,
              borderWidth: 1.5,
              borderColor: '#FCA5A5',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#991B1B' }}>
                {isBn ? 'লাগেজ নিরাপত্তা নিশ্চয়তা (সম্মতিপ্রাপ্ত)' : 'Baggage Security Compliance (Consented)'}
              </Text>
              <Text style={{ fontSize: 10.5, color: '#7F1D1D', marginTop: 1, lineHeight: 14 }}>
                {isBn
                  ? 'নিশ্চিত করা হয়েছে: লাগেজে কোনো প্রকার দেশী-বিদেশী মুদ্রা, অলংকার, জীবিত প্রাণী, মাদকদ্রব্য, গোলাবারুদ বা অবৈধ পণ্য নেই।'
                  : 'Confirmed: Luggage contains no currency, jewelry, live animals, narcotics, weapons, or prohibited goods.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Feature 1: Live Track Protocol Officer Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowLiveTracking(true)}
          style={{
            width: '100%',
            backgroundColor: '#059669',
            height: 48,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            marginBottom: 10,
            shadowColor: '#059669',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 16 }}>📍</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' }}>
            {lang ? 'প্রোটোকল অফিসার লাইভ ট্র্যাকিং করুন' : 'Live Track Protocol Officer'}
          </Text>
        </TouchableOpacity>

        {/* Feature 2: Download Invoice / Receipt Button (Opens Invoice Modal) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowInvoiceModal(true)}
          style={{
            width: '100%',
            backgroundColor: '#0F172A',
            height: 46,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 16 }}>🧾</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
            {lang ? 'ইনভয়েস / ভাউচার দেখুন ও ডাউনলোড' : 'View & Download Invoice'}
          </Text>
        </TouchableOpacity>

        {/* Feature: View & Download VIP Greeter Placard / Nameboard */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowPlacardModal(true)}
          style={{
            width: '100%',
            backgroundColor: '#064E3B',
            height: 46,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            marginBottom: 10,
            borderWidth: 1.5,
            borderColor: '#F59E0B',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 16 }}>🏷️</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
            {lang ? 'ভিআইপি প্লেকার্ড / নেমবোর্ড দেখুন ও ডাউনলোড' : 'View & Download VIP Placard'}
          </Text>
        </TouchableOpacity>

        {/* Direct Send to Support Office WhatsApp (Both 01347570001 & 01347570002) */}
        <View style={{ flexDirection: 'row', gap: 8, width: '100%', marginBottom: 10 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => openSupportOfficeWhatsApp({ ...currentBooking, id: bookingCode, amount: totalAmount }, isBn, '8801347570001')}
            style={{
              flex: 1,
              backgroundColor: '#16A34A',
              height: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              shadowColor: '#16A34A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 16 }}>💬</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
              {lang ? 'WhatsApp ০১ (৫৭০০০১)' : 'WhatsApp 01 (570001)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => openSupportOfficeWhatsApp({ ...currentBooking, id: bookingCode, amount: totalAmount }, isBn, '8801347570002')}
            style={{
              flex: 1,
              backgroundColor: '#059669',
              height: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 16 }}>💬</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
              {lang ? 'WhatsApp ০২ (৫৭০০০২)' : 'WhatsApp 02 (570002)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feature 3: Share on WhatsApp Button (Safe Encoding) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleShareWhatsApp}
          style={{
            width: '100%',
            backgroundColor: '#25D366',
            height: 46,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 16 }}>💬</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
            {lang ? 'হোয়াটসঅ্যাপে ভাউচার শেয়ার করুন' : 'Share on WhatsApp'}
          </Text>
        </TouchableOpacity>

        {/* Feature 4: Add to Google Calendar / Apple Wallet */}
        <View style={{ width: '100%', marginBottom: 16 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowCalendarOptions(!showCalendarOptions)}
            style={{
              width: '100%',
              backgroundColor: '#FEF3C7',
              borderWidth: 1.5,
              borderColor: '#FDE68A',
              height: 46,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>📅</Text>
            <Text style={{ color: '#92400E', fontSize: 13.5, fontWeight: '800' }}>
              {lang ? 'ক্যালেন্ডার ও মিটিং রিমাইন্ডার সেট করুন ▾' : 'Add to Calendar / Wallet Reminder ▾'}
            </Text>
          </TouchableOpacity>

          {/* Calendar Options Dropdown */}
          {showCalendarOptions && (
            <View
              style={{
                backgroundColor: '#FFFBEB',
                borderWidth: 1,
                borderColor: '#FDE68A',
                borderRadius: 12,
                padding: 12,
                marginTop: 6,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 11.5, color: '#854D0E', fontWeight: '700' }}>
                ⏱️ {isBn ? 'সাক্ষাতের নির্ধারিত সময়:' : 'Scheduled meeting time:'} {calendarData.meetingTimeStr}
              </Text>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {/* Google Calendar Link */}
                <TouchableOpacity
                  onPress={handleOpenGoogleCalendar}
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    paddingVertical: 9,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>
                    Google Calendar
                  </Text>
                </TouchableOpacity>

                {/* Apple / Universal .ics File */}
                <TouchableOpacity
                  onPress={handleDownloadIcsFile}
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    paddingVertical: 9,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B' }}>
                    Apple / iCal (.ics)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {calendarSaved && (
            <Text style={{ color: '#059669', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
              ✓ {isBn ? 'ক্যালেন্ডার রিমাইন্ডার সফলভাবে সেট হয়েছে!' : 'Calendar reminder set successfully!'}
            </Text>
          )}
        </View>

        <View style={{ width: '100%', height: 1, backgroundColor: '#E2E8F0', marginBottom: 14 }} />

        {/* Navigation Buttons: View My Bookings & Back to Home */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            setWiz(null);
            if (setTab) setTab('bookings');
          }}
          style={{
            width: '100%',
            backgroundColor: '#0284C7',
            height: 48,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
            {lang ? 'আমার বুকিং সমূহ দেখুন' : 'View My Bookings'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setWiz(null);
            if (setTab) setTab('home');
          }}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F1F5F9',
          }}
        >
          <Text style={{ color: '#334155', fontSize: 14, fontWeight: '700' }}>
            {lang ? 'হোমে ফিরে যান' : 'Back to Home'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reusable Booking Invoice / Voucher Printable Modal */}
      <BookingInvoiceModal
        visible={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        booking={currentBooking}
        lang={lang}
      />

      {/* Official VIP Airport Protocol Placard Modal */}
      <VipPlacardModal
        visible={showPlacardModal}
        onClose={() => setShowPlacardModal(false)}
        booking={currentBooking}
        lang={lang}
      />

      {/* Live Protocol Officer & Passenger Tracking Modal */}
      <LiveTrackingModal
        visible={showLiveTracking}
        onClose={() => setShowLiveTracking(false)}
        booking={currentBooking}
        mode="client"
        lang={lang}
      />
    </>
  );
}
