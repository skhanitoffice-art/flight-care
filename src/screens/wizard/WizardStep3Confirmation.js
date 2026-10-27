import React, { useState } from 'react';
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
import { getCalendarEventData } from '../../utils/helpers';

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

  // Calculate Handover OTP for client completion verification
  const bookingDigits = String(bookingCode || '').replace(/\D/g, '');
  const passengerPhoneDigits = String(wiz.passengerPhone || wiz.phone || '').replace(/\D/g, '');
  const handoverOtp = wiz.handoverOtp || (bookingDigits.length >= 4 ? bookingDigits.slice(-4) : (passengerPhoneDigits.length >= 4 ? passengerPhoneDigits.slice(-4) : '2026'));

  // Booking Object for Modals & Tracking
  const currentBooking = {
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
      terminal: wiz.terminal || 'Terminal 1',
    },
    fno: flightNumber,
    date: serviceDate,
    amount: totalAmount,
    airport: wiz.airport || 'DAC',
    airportName: airport,
    dir: wiz.dir || 'arr',
    pkg: wiz.pkg,
    packageChoice: wiz.packageChoice,
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
