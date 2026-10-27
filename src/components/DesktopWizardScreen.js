import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import DesktopHeader from './DesktopHeader';
import DesktopFooter from './DesktopFooter';
import {
  UserIcon,
  PhoneIcon,
  MailIcon,
  PencilIcon,
  PlaneIcon,
  CalendarIcon,
  LocationPinIcon,
  StarCoinIcon,
  HeadphonesIcon,
  InfoCircleIcon,
  BKashLogo,
  NagadLogo,
  VisaMastercardBadges,
  WheelchairIcon,
  DownloadIcon,
  CheckCircleIcon,
  ChevronRight,
  ArrivalIcon,
  DepartureIcon,
  ServiceBadgeIcon,
  StandardPkgIcon,
  PremiumPkgIcon,
  VipPkgIcon,
  BanglaQrLogo,
  BanglaQrBadge,
  SslCommerzLogo,
  SslCommerzBadge,
} from './Icons';
import CountryCodeModal from './CountryCodeModal';
import CancellationPolicyModal from './CancellationPolicyModal';
import WebsiteComplianceModal from './WebsiteComplianceModal';
import DatePickerModal from './DatePickerModal';
import PassportOcrModal from './PassportOcrModal';
import CoPassengersSection from './CoPassengersSection';
import LiveTrackingModal from './LiveTrackingModal';
import BookingInvoiceModal from './BookingInvoiceModal';
import VipPlacardModal from './VipPlacardModal';
import BookingOtpModal from './BookingOtpModal';
import {
  isValidPassengerName,
  isValidMobileNumber,
  isValidEmailAddress,
  isValidFlightNumber,
  isValidFlightDate,
  isPastFlightDate,
  sanitizePhoneNumber,
  extractLocalPhoneDigits,
  calculateBookingPricing,
  validatePromoCode,
  getCalendarEventData,
} from '../utils/helpers';
import { getLiveFlightStatus } from '../services/flightService';
import { getAddonAsset } from '../constants/data';

export default function DesktopWizardScreen({
  wiz,
  setWiz,
  lang = 0,
  setLang,
  customerSession,
  setTab,
  confirm,
  advanceBooking,
  addonCatalog,
  pricingConfig,
  startBkashPayment,
  startCardPayment,
  startSslCommerzPayment,
  handleBack,
}) {
  if (!wiz) return null;

  const [paymentMethod, setPaymentMethod] = useState(
    wiz.method === 'pay_after_service'
      ? 'pay_after_service'
      : 'sslcommerz'
  ); // 'sslcommerz' | 'pay_after_service'
  const [passengerName, setPassengerName] = useState(wiz.passengerName || (wiz.bookingForSomeoneElse ? '' : (wiz.name || '')));
  const [passengerCountryCode, setPassengerCountryCode] = useState(wiz.passengerCountryCode || '+880');
  const [passengerPhone, setPassengerPhone] = useState(
    wiz.passengerPhone
      ? extractLocalPhoneDigits(wiz.passengerPhone, wiz.passengerCountryCode || '+880')
      : (!wiz.bookingForSomeoneElse ? extractLocalPhoneDigits(wiz.phone, wiz.leadCountryCode || '+880') : '')
  );
  const [passengerEmail, setPassengerEmail] = useState(wiz.email || '');
  const [specialAssistance, setSpecialAssistance] = useState(wiz.specialAssistance || 'none');
  const [bookingForSomeoneElse, setBookingForSomeoneElse] = useState(wiz.bookingForSomeoneElse || false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [complianceModalTab, setComplianceModalTab] = useState(null);
  const [baggageConsent, setBaggageConsent] = useState(false);
  const [baggageConsentError, setBaggageConsentError] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState(wiz.confirmedId || 'FC-DEMO-001');
  const [errors, setErrors] = useState({});

  const [bookerName, setBookerName] = useState(wiz.name || '');
  const [bookerCountryCode, setBookerCountryCode] = useState(wiz.leadCountryCode || '+880');
  const [bookerPhone, setBookerPhone] = useState(
    extractLocalPhoneDigits(wiz.phone, wiz.leadCountryCode || '+880')
  );
  const [bookerEmail, setBookerEmail] = useState(wiz.email || '');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countryTarget, setCountryTarget] = useState('passenger'); // 'passenger' | 'booker'

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showPassportOcr, setShowPassportOcr] = useState(false);
  const [ocrTarget, setOcrTarget] = useState('lead');
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPlacardModal, setShowPlacardModal] = useState(false);
  const [showBookingOtpModal, setShowBookingOtpModal] = useState(false);
  const [pendingPostServiceData, setPendingPostServiceData] = useState(null);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [calendarSaved, setCalendarSaved] = useState(false);

  useEffect(() => {
    if (wiz) {
      const pcc = wiz.passengerCountryCode || '+880';
      const lcc = wiz.leadCountryCode || '+880';
      setPassengerCountryCode(pcc);
      setBookerCountryCode(lcc);
      setPassengerName(wiz.passengerName || (wiz.bookingForSomeoneElse ? '' : (wiz.name || '')));
      setPassengerPhone(
        wiz.passengerPhone
          ? extractLocalPhoneDigits(wiz.passengerPhone, pcc)
          : (!wiz.bookingForSomeoneElse ? extractLocalPhoneDigits(wiz.phone, lcc) : '')
      );
      setPassengerEmail(wiz.passengerEmail || wiz.email || '');
      setBookerName(wiz.name || '');
      setBookerPhone(extractLocalPhoneDigits(wiz.phone, lcc));
      setBookerEmail(wiz.email || '');
      setBookingForSomeoneElse(wiz.bookingForSomeoneElse || false);
      setSpecialAssistance(wiz.specialAssistance || 'none');
    }
  }, [
    wiz?.fno,
    wiz?.date,
    wiz?.name,
    wiz?.phone,
    wiz?.email,
    wiz?.passengerName,
    wiz?.passengerPhone,
    wiz?.bookingForSomeoneElse,
    wiz?.leadCountryCode,
    wiz?.passengerCountryCode,
  ]);

  const step = wiz.step || 1;
  const isDep = wiz.dir === 'dep';
  const pricingData = calculateBookingPricing(wiz, addonCatalog, pricingConfig);
  const totalAmount = pricingData.total != null ? pricingData.total : pricingData.finalTotal;
  const pkgPrice = pricingData.basePrice != null ? pricingData.basePrice : (wiz.pkg?.p != null ? wiz.pkg.p : 500);
  const passengers = pricingData.passengerCount || 1;
  const pointsEarned = wiz.onlyAddons
    ? Math.max(10, Math.round(Number(totalAmount) * 0.05))
    : (pkgPrice === 1500 ? 150 : pkgPrice === 1000 ? 100 : 50);

  // 15-Minute Countdown Timer for Step 2
  const [secondsLeft, setSecondsLeft] = useState(900);
  useEffect(() => {
    if (step !== 2 || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, secondsLeft]);

  const formatTimer = secs => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Debounce Protection for Pay Button
  const lastPayClickRef = useRef(0);
  const [isPaying, setIsPaying] = useState(false);

  const handleApplyPromo = () => {
    if (!promoInput.trim()) {
      setPromoStatus({
        type: 'error',
        message: lang ? 'অনুগ্রহ করে প্রোমো কোড লিখুন' : 'Please enter a promo code',
      });
      return;
    }
    setIsApplyingPromo(true);
    setTimeout(() => {
      const result = validatePromoCode(promoInput, totalAmount + (wiz?.discount?.amount || 0));
      setIsApplyingPromo(false);
      if (result.valid) {
        setWiz(prev => ({
          ...prev,
          discount: {
            code: result.code,
            amount: result.discount,
            label: result.label,
          },
        }));
        setPromoStatus({
          type: 'success',
          message: lang
            ? `✓ '${result.code}' সফলভাবে প্রয়োগ করা হয়েছে (-৳${result.discount} ছাড়)`
            : `✓ '${result.code}' applied successfully (-৳${result.discount} off)`,
        });
      } else {
        setPromoStatus({
          type: 'error',
          message: lang
            ? '⚠️ সঠিক প্রোমো কোড দিন (যেমন: FLIGHT100, EIDVIP)'
            : `⚠️ ${result.message || 'Invalid promo code'}`,
        });
      }
    }, 300);
  };

  const handleRemovePromo = () => {
    setWiz(prev => {
      const updated = { ...prev };
      delete updated.discount;
      return updated;
    });
    setPromoInput('');
    setPromoStatus({
      type: 'info',
      message: lang ? 'প্রোমো কোড বাতিল করা হয়েছে' : 'Promo code removed',
    });
  };

  const bookingCode = confirmedBookingId || wiz.confirmedId || 'FC-DEMO-001';

  const handleCopyBookingId = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(bookingCode);
      }
    } catch {}
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const pkgName =
    wiz.pkg?.n
      ? wiz.pkg.n[lang ? 1 : 0]
      : wiz.pkg?.t ||
        (wiz.packageChoice === 'first'
          ? (lang ? 'ভিআইপি' : 'VIP')
          : wiz.packageChoice === 'business'
          ? (lang ? 'প্রিমিয়াম' : 'Premium')
          : (lang ? 'স্ট্যান্ডার্ড' : 'Standard'));

  const serviceLabel = `${isDep ? (lang ? 'প্রস্থান' : 'Departure') : (lang ? 'আগমন' : 'Arrival')} • ${pkgName}`;
  const airportLabel = wiz.airportName || (lang ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)' : 'Dhaka • DAC');
  const flightLabel = wiz.fno || (lang ? 'ফ্লাইট নম্বর দিন' : 'Enter flight number');
  const dateLabel = wiz.date || (lang ? 'তারিখ নির্বাচন করুন' : 'Select service date');

  const bookingDigits = String(bookingCode || '').replace(/\D/g, '');
  const phoneDigits = String(passengerPhone || wiz.passengerPhone || wiz.phone || '').replace(/\D/g, '');
  const handoverOtp = wiz.handoverOtp || (bookingDigits.length >= 4 ? bookingDigits.slice(-4) : (phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '2026'));

  const currentBooking = {
    id: bookingCode,
    confirmedId: bookingCode,
    name: passengerName || wiz.passengerName || wiz.name || 'Passenger',
    passengerName: passengerName || wiz.passengerName || wiz.name || 'Passenger',
    phone: passengerPhone || wiz.passengerPhone || wiz.phone || '01712345678',
    passengerPhone: passengerPhone || wiz.passengerPhone || wiz.phone || '01712345678',
    email: passengerEmail || wiz.email,
    flight: {
      number: (wiz.fno || 'BG-084').toUpperCase(),
      date: wiz.date,
      terminal: wiz.terminal || 'Terminal 1',
    },
    fno: (wiz.fno || 'BG-084').toUpperCase(),
    date: wiz.date,
    amount: totalAmount,
    airport: wiz.airport || 'DAC',
    airportName: airportLabel,
    dir: wiz.dir || 'arr',
    pkg: wiz.pkg,
    packageChoice: wiz.packageChoice,
    trxId: wiz.trxId,
    paidMethod: paymentMethod,
    paymentStatus: 'paid',
    bookingForSomeoneElse,
    handoverOtp,
  };

  const handleShareWhatsApp = () => {
    const sDir = isDep
      ? (lang ? 'প্রস্থান (Departure)' : 'Departure')
      : (lang ? 'আগমন (Arrival)' : 'Arrival');
    const trxTxt = wiz.trxId ? `\n💳 TrxID: ${wiz.trxId}` : '';

    const messageText = lang
      ? `🛫 *ফ্লাইট কেয়ার — বিমানবন্দর প্রোটোকল বুকিং ভাউচার*
━━━━━━━━━━━━━━━━━━
🎫 *বুকিং রেফারেন্স:* #${bookingCode}
👤 *যাত্রীর নাম:* ${passengerName || 'যাত্রী'}
✈️ *ফ্লাইট:* ${(wiz.fno || 'BG-084').toUpperCase()}
📅 *তারিখ:* ${wiz.date || 'তারিখ উল্লেখ নেই'}
📍 *বিমানবন্দর:* ${airportLabel}
🎯 *সার্ভিস:* ${sDir} • ${pkgName}
💰 *পরিশোধিত অর্থ:* ৳${totalAmount} ${paymentMethod === 'pay_after_service' ? '(সার্ভিস পরবর্তী পেমেন্ট)' : '(পেমেন্ট সম্পন্ন)'}${trxTxt}

📍 *প্রোটোকল অফিসার লাইভ ট্র্যাকিং:*
https://flightcare.app/track/${bookingCode}
━━━━━━━━━━━━━━━━━━
📞 ২৪/৭ হেল্পলাইন: +880 1712-345678`
      : `🛫 *Flight Care — Airport Protocol Booking Voucher*
━━━━━━━━━━━━━━━━━━
🎫 *Booking Reference:* #${bookingCode}
👤 *Passenger:* ${passengerName || 'Passenger'}
✈️ *Flight:* ${(wiz.fno || 'BG-084').toUpperCase()}
📅 *Date:* ${wiz.date || 'Not specified'}
📍 *Airport:* ${airportLabel}
🎯 *Service:* ${sDir} • ${pkgName}
💰 *Amount Paid:* ৳${totalAmount} ${paymentMethod === 'pay_after_service' ? '(Pay After Service)' : '(Confirmed)'}${trxTxt}

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

  const calendarData = getCalendarEventData(currentBooking, Boolean(lang));

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
        lang ? 'ক্যালেন্ডার ফাইল' : 'Calendar File',
        lang ? 'ক্যালেন্ডার ইভেন্ট (.ics) ফাইল ডাউনলোড হয়েছে।' : 'Calendar event file downloaded.'
      );
    }
  };

  const handleContinueToPayment = () => {
    const newErrors = {};

    // 1. Passenger Name validation
    if (!passengerName.trim()) {
      newErrors.passengerName = lang
        ? 'অনুগ্রহ করে যাত্রীর পুরো নাম লিখুন।'
        : 'Please enter passenger full name.';
    } else if (!isValidPassengerName(passengerName)) {
      newErrors.passengerName = lang
        ? 'সঠিক নাম লিখুন (কমপক্ষে ২ অক্ষর হতে হবে)।'
        : 'Please enter a valid name (at least 2 letters).';
    }

    // 2. Passenger Phone validation
    if (!bookingForSomeoneElse) {
      if (!passengerPhone.trim()) {
        newErrors.passengerPhone = lang
          ? 'অনুগ্রহ করে মোবাইল নম্বর লিখুন।'
          : 'Please enter mobile number.';
      } else if (!isValidMobileNumber(passengerPhone, passengerCountryCode)) {
        newErrors.passengerPhone = lang
          ? 'সঠিক মোবাইল নম্বর লিখুন (৭-১৫ ডিজিট)।'
          : 'Please enter a valid mobile number (7-15 digits).';
      }
    } else {
      if (passengerPhone.trim() && !isValidMobileNumber(passengerPhone, passengerCountryCode)) {
        newErrors.passengerPhone = lang
          ? 'যাত্রীর সঠিক মোবাইল নম্বর লিখুন (৭-১৫ ডিজিট)।'
          : 'Please enter a valid passenger mobile number (7-15 digits).';
      }
    }

    // 3. Passenger Email validation (optional but validated if provided)
    if (passengerEmail.trim() && !isValidEmailAddress(passengerEmail)) {
      newErrors.passengerEmail = lang
        ? 'সঠিক ইমেইল ঠিকানা লিখুন (যেমন: name@example.com)।'
        : 'Please enter a valid email address (e.g. name@example.com).';
    }

    // 4. Booker details validation when booking for someone else
    if (bookingForSomeoneElse) {
      if (!bookerName.trim()) {
        newErrors.bookerName = lang
          ? 'বুকিং যোগাযোগের জন্য আপনার পুরো নাম লিখুন।'
          : 'Please enter your full name for booking contact.';
      } else if (!isValidPassengerName(bookerName)) {
        newErrors.bookerName = lang
          ? 'সঠিক নাম লিখুন (কমপক্ষে ২ অক্ষর হতে হবে)।'
          : 'Please enter a valid name (at least 2 letters).';
      }

      if (!bookerPhone.trim()) {
        newErrors.bookerPhone = lang
          ? 'আপনার মোবাইল নম্বর লিখুন।'
          : 'Please enter your mobile number.';
      } else if (!isValidMobileNumber(bookerPhone, bookerCountryCode)) {
        newErrors.bookerPhone = lang
          ? 'সঠিক মোবাইল নম্বর লিখুন (৭-১৫ ডিজিট)।'
          : 'Please enter a valid mobile number (7-15 digits).';
      }

      if (bookerEmail.trim() && !isValidEmailAddress(bookerEmail)) {
        newErrors.bookerEmail = lang
          ? 'সঠিক ইমেইল ঠিকানা লিখুন (যেমন: name@example.com)।'
          : 'Please enter a valid email address (e.g. name@example.com).';
      }
    }

    // 5. Terms & Policy agreement validation
    if (!agreeTerms) {
      newErrors.agreeTerms = lang
        ? 'এগিয়ে যেতে শর্তাবলী ও বাতিলের নীতিমালায় সম্মতি দিন।'
        : 'Please agree to Terms & Conditions and Cancellation Policy.';
    }

    // 6. Flight number validation (Strictly mandatory)
    if (!wiz.fno || !wiz.fno.trim()) {
      newErrors.flightNumber = lang
        ? 'অনুগ্রহ করে ফ্লাইট নম্বর দিন (যেমন: BG-084, EK-582)'
        : 'Please enter flight number (e.g. BG-084, EK-582)';
    } else if (!isValidFlightNumber(wiz.fno.trim())) {
      newErrors.flightNumber = lang
        ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
        : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)';
    }

    // 8. Visa On Arrival Mandatory Documents Validation
    if ((wiz.addons || []).includes('visa') || (wiz.addons || []).includes('visa_on_arrival')) {
      const { isValid, missing } = validateVisaOnArrivalDocs(wiz.addonDetails);
      if (!isValid) {
        newErrors.visaDocuments = lang
          ? `অন-অ্যারাইভাল ভিসা সুবিধার জন্য ৪টি আবশ্যক ডকুমেন্ট সংযুক্ত করা বাধ্যতামূলক:\n\n• ${missing.map(m => m.labelBn).join('\n• ')}\n\nঅনুগ্রহ করে সবকটি ডকুমেন্ট আপলোড করে সম্পন্ন করুন।`
          : `All 4 mandatory documents are required for Visa On Arrival:\n\n• ${missing.map(m => m.labelEn).join('\n• ')}\n\nPlease attach all required documents to proceed.`;
      }
    }

    // 7. Service date validation (Strictly mandatory & cannot be past)
    if (!wiz.date || !wiz.date.trim()) {
      newErrors.serviceDate = lang
        ? 'অনুগ্রহ করে সেবার তারিখ নির্বাচন করুন'
        : 'Please select service date';
    } else if (!isValidFlightDate(wiz.date.trim()) || isPastFlightDate(wiz.date.trim())) {
      newErrors.serviceDate = lang
        ? 'অতীতের কোনো তারিখ নির্বাচন করা যাবে না। বর্তমান বা ভবিষ্যতের তারিখ দিন।'
        : 'Past flight dates are not allowed. Please select today or a future date.';
    }


    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorMessage = Object.values(newErrors)[0];
      Alert.alert(
        lang ? 'তথ্যে ভুল বা অসম্পূর্ণতা রয়েছে' : 'Validation Error',
        firstErrorMessage
      );
      return;
    }

    setErrors({});
    setWiz(curr => ({
      ...curr,
      step: 2,
      passengerName,
      passengerPhone,
      passengerCountryCode,
      phone: bookingForSomeoneElse
        ? `${bookerCountryCode} ${bookerPhone}`.trim()
        : `${passengerCountryCode} ${passengerPhone}`.trim(),
      leadCountryCode: bookingForSomeoneElse ? bookerCountryCode : passengerCountryCode,
      name: bookingForSomeoneElse ? (bookerName || curr.name) : passengerName,
      email: bookingForSomeoneElse ? (bookerEmail || curr.email) : passengerEmail,
      specialAssistance,
      bookingForSomeoneElse,
    }));
  };

  const handlePayNow = async () => {
    if (!baggageConsent) {
      setBaggageConsentError(true);
      Alert.alert(
        lang ? 'লাগেজ ঘোষণা বাধ্যতামূলক' : 'Baggage Declaration Required',
        lang
          ? 'বুকিং বা পেমেন্ট সম্পন্ন করতে অবশ্যই লাগেজ ও নিষিদ্ধ সামগ্রী সংক্রান্ত ঘোষণায় টিক চিহ্ন দিয়ে সম্মতি প্রদান করুন।'
          : 'Please confirm and consent that the passenger luggage contains no prohibited items before proceeding.'
      );
      return;
    }

    const now = Date.now();
    if (now - lastPayClickRef.current < 1500 || isPaying) return;
    lastPayClickRef.current = now;
    setIsPaying(true);

    const newCode = `FC-${Math.floor(10000 + Math.random() * 90000)}`;
    setConfirmedBookingId(newCode);

    const phoneToUse = passengerPhone || (wiz.passengerPhone || wiz.phone || '01712345678');
    const bookingData = {
      id: newCode,
      amount: totalAmount,
      passengerName: passengerName || wiz.passengerName || wiz.name || 'Passenger',
      phone: phoneToUse,
      passengerPhone: phoneToUse,
      passengerEmail: passengerEmail || wiz.email,
      email: passengerEmail || wiz.email,
      flight: {
        number: (wiz.fno || '').toUpperCase(),
        date: wiz.date,
        terminal: wiz.terminal || 'Terminal 1',
      },
      airport: wiz.airport || 'DAC',
    };

    if (paymentMethod === 'pay_after_service') {
      setIsPaying(false);
      const postServiceResult = {
        ...bookingData,
        id: newCode,
        paidMethod: 'pay_after_service',
        method: 'pay_after_service',
        paymentStatus: 'pay_after_service',
        trxId: `PAS-${newCode}`,
        passengerName: passengerName || wiz.passengerName || wiz.name || 'Passenger',
        passengerPhone: phoneToUse,
        passengerEmail: passengerEmail || wiz.email || '',
        name: passengerName || wiz.passengerName || wiz.name || 'Passenger',
        phone: phoneToUse,
        email: passengerEmail || wiz.email || '',
        bookingForSomeoneElse,
        specialAssistance,
      };

      // User Requirement: Payment After Service must verify OTP before confirming booking!
      setPendingPostServiceData(postServiceResult);
      setShowBookingOtpModal(true);
      return;
    } else if (paymentMethod === 'sslcommerz' && typeof startSslCommerzPayment === 'function') {
      startSslCommerzPayment(bookingData, async (paymentResult) => {
        setIsPaying(false);
        const sslBookingResult = {
          ...bookingData,
          ...paymentResult,
          id: newCode,
          paidMethod: 'sslcommerz',
          paymentStatus: 'paid',
          trxId: paymentResult.trxId,
          passengerName: passengerName || wiz.passengerName || wiz.name || 'Passenger',
          passengerPhone: phoneToUse,
          passengerEmail: passengerEmail || wiz.email || '',
          name: passengerName || wiz.passengerName || wiz.name || 'Passenger',
          phone: phoneToUse,
          email: passengerEmail || wiz.email || '',
          bookingForSomeoneElse,
          specialAssistance,
        };
        if (confirm) {
          await confirm(sslBookingResult);
        }
        setWiz(curr => ({
          ...curr,
          ...sslBookingResult,
          step: 3,
          confirmedId: newCode,
          paidMethod: 'sslcommerz',
          trxId: paymentResult.trxId,
        }));
      });
      setTimeout(() => setIsPaying(false), 2000);
    } else if ((paymentMethod === 'card' || paymentMethod === 'bank_transfer') && typeof startCardPayment === 'function') {
      startCardPayment({
        ...bookingData,
        method: paymentMethod,
      }, async (paymentResult) => {
        setIsPaying(false);
        const cardBookingResult = {
          ...bookingData,
          ...paymentResult,
          id: newCode,
          paidMethod: paymentMethod,
          paymentStatus: paymentResult.status || 'paid',
          trxId: paymentResult.trxId,
          passengerName: passengerName || wiz.passengerName || wiz.name || 'Passenger',
          passengerPhone: phoneToUse,
          passengerEmail: passengerEmail || wiz.email || '',
          name: passengerName || wiz.passengerName || wiz.name || 'Passenger',
          phone: phoneToUse,
          email: passengerEmail || wiz.email || '',
          bookingForSomeoneElse,
          specialAssistance,
        };
        if (confirm) {
          await confirm(cardBookingResult);
        }
        setWiz(curr => ({
          ...curr,
          ...cardBookingResult,
          step: 3,
          confirmedId: newCode,
          paidMethod: paymentMethod,
          trxId: paymentResult.trxId,
        }));
      });
      setTimeout(() => setIsPaying(false), 2000);
    } else if (typeof startBkashPayment === 'function') {
      startBkashPayment(bookingData, async (paymentResult) => {
        setIsPaying(false);
        const bkashBookingResult = {
          ...bookingData,
          ...paymentResult,
          id: newCode,
          paidMethod: 'banglaqr',
          paymentStatus: 'paid',
          trxId: paymentResult.trxId,
          passengerName: passengerName || wiz.passengerName || wiz.name || 'Passenger',
          passengerPhone: phoneToUse,
          passengerEmail: passengerEmail || wiz.email || '',
          name: passengerName || wiz.passengerName || wiz.name || 'Passenger',
          phone: phoneToUse,
          email: passengerEmail || wiz.email || '',
          bookingForSomeoneElse,
          specialAssistance,
        };
        if (confirm) {
          await confirm(bkashBookingResult);
        }
        setWiz(curr => ({
          ...curr,
          ...bkashBookingResult,
          step: 3,
          confirmedId: newCode,
          paidMethod: 'banglaqr',
          trxId: paymentResult.trxId,
        }));
      });
      setTimeout(() => setIsPaying(false), 2000);
    } else {
      const fallbackBookingResult = {
        ...bookingData,
        id: newCode,
        bookingId: newCode,
        paidMethod: paymentMethod,
        method: paymentMethod,
        paymentStatus: paymentMethod === 'pay_after_service' ? 'pay_after_service' : 'paid',
        trxId: `TXN-${newCode}`,
        passengerName: passengerName || wiz.passengerName || wiz.name || 'Passenger',
        passengerPhone: phoneToUse,
        passengerEmail: passengerEmail || wiz.email || '',
        name: passengerName || wiz.passengerName || wiz.name || 'Passenger',
        phone: phoneToUse,
        email: passengerEmail || wiz.email || '',
        bookingForSomeoneElse,
        specialAssistance,
        source: 'website_online',
        sourceLabel: 'ওয়েবসাইট অনলাইন বুকিং',
        isOfflineManual: false,
      };
      if (confirm) {
        await confirm(fallbackBookingResult);
      }
      setIsPaying(false);
      setWiz(curr => ({
        ...curr,
        ...fallbackBookingResult,
        step: 3,
        confirmedId: newCode,
        paidMethod: paymentMethod,
      }));
    }
  };

  const handleBookingOtpVerified = async (verifyResult) => {
    if (!pendingPostServiceData) return;
    const finalBooking = {
      ...pendingPostServiceData,
      phone_verified: true,
      otpVerifiedAt: verifyResult?.verifiedAt || new Date().toISOString(),
      source: 'website_online',
      sourceLabel: 'ওয়েবসাইট অনলাইন বুকিং',
      isOfflineManual: false,
    };

    if (confirm) {
      await confirm(finalBooking);
    }

    setWiz(curr => ({
      ...curr,
      ...finalBooking,
      step: 3,
      confirmedId: finalBooking.id,
      paidMethod: 'pay_after_service',
      paymentStatus: 'pay_after_service',
      trxId: finalBooking.trxId,
    }));

    setShowBookingOtpModal(false);
    setPendingPostServiceData(null);
  };

  const assistanceOptions = [
    { key: 'none', label: lang ? 'কোনো সহায়তার প্রয়োজন নেই' : 'No extra assistance needed' },
    { key: 'wheelchair', label: lang ? 'হুইলচেয়ার সহায়তা' : 'Wheelchair assistance' },
    { key: 'senior', label: lang ? 'বয়োজ্যেষ্ঠ যাত্রী সহায়তা' : 'Senior citizen assistance' },
    { key: 'child', label: lang ? 'শিশু ও পরিবার সহায়তা' : 'Child & family care escort' },
    { key: 'language', label: lang ? 'দোভাষী / ভাষা অনুবাদক' : 'Language / translation support' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* 1. Desktop Top Header */}
      <DesktopHeader
        lang={lang}
        setLang={setLang}
        customerSession={customerSession}
        setTab={setTab}
        setWiz={setWiz}
        mode={step === 3 ? 'confirmation' : 'wizard'}
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* 2. Stepper Progress Bar */}
        <View
          style={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            paddingVertical: 18,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 580,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Step 1: Booking details */}
            <TouchableOpacity
              onPress={() => step > 1 && setWiz(c => ({ ...c, step: 1 }))}
              style={{ alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: step >= 1 ? '#0284C7' : '#E2E8F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {step > 1 ? (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>✓</Text>
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>1</Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: step === 1 ? '800' : '600',
                  color: step >= 1 ? '#0284C7' : '#64748B',
                }}
              >
                {lang ? 'বুকিং তথ্য' : 'Booking details'}
              </Text>
            </TouchableOpacity>

            {/* Connecting Line 1 */}
            <View
              style={{
                flex: 1,
                height: 2,
                backgroundColor: step >= 2 ? '#0284C7' : '#E2E8F0',
                marginHorizontal: 12,
                marginBottom: 20,
              }}
            />

            {/* Step 2: Payment */}
            <TouchableOpacity
              onPress={() => step > 2 && setWiz(c => ({ ...c, step: 2 }))}
              style={{ alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: step === 2 ? '#0284C7' : step > 2 ? '#0284C7' : '#F1F5F9',
                  borderWidth: step >= 2 ? 0 : 1.5,
                  borderColor: '#CBD5E1',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {step > 2 ? (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>✓</Text>
                ) : (
                  <Text
                    style={{
                      color: step === 2 ? '#FFFFFF' : '#64748B',
                      fontSize: 13,
                      fontWeight: '800',
                    }}
                  >
                    2
                  </Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: step === 2 ? '800' : '600',
                  color: step >= 2 ? '#0284C7' : '#64748B',
                }}
              >
                {lang ? 'পেমেন্ট' : 'Payment'}
              </Text>
            </TouchableOpacity>

            {/* Connecting Line 2 */}
            <View
              style={{
                flex: 1,
                height: 2,
                backgroundColor: step === 3 ? '#16A34A' : '#E2E8F0',
                marginHorizontal: 12,
                marginBottom: 20,
              }}
            />

            {/* Step 3: Confirmation */}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: step === 3 ? '#16A34A' : '#F1F5F9',
                  borderWidth: step === 3 ? 0 : 1.5,
                  borderColor: '#CBD5E1',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {step === 3 ? (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>✓</Text>
                ) : (
                  <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '800' }}>3</Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: step === 3 ? '800' : '600',
                  color: step === 3 ? '#16A34A' : '#64748B',
                }}
              >
                {lang ? 'নিশ্চিতকরণ' : 'Confirmation'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Heading & Subheading */}
        <View style={{ width: '100%', alignItems: 'center', paddingTop: 28, paddingBottom: 16 }}>
          {step === 1 && (
            <>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: '-0.5px' }}>
                {lang ? 'আপনার বুকিং সম্পূর্ণ করুন' : 'Complete your booking'}
              </Text>
              <Text style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>
                {lang ? 'আপনাকে প্রস্তুত করতে সামান্য কিছু তথ্য প্রয়োজন।' : 'Just a few details to get you ready.'}
              </Text>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: '-0.5px' }}>
                {lang ? 'আপনার পেমেন্ট সম্পন্ন করুন' : 'Complete your payment'}
              </Text>
              <Text style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>
                {lang ? 'আপনার সুবিধাজনক পেমেন্ট মাধ্যম বেছে নিন।' : 'Choose your preferred payment method.'}
              </Text>
            </>
          )}

          {step === 3 && (
            <View style={{ alignItems: 'center' }}>
              {/* Glowing Green Checkmark Badge */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#10B981',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  shadowColor: '#10B981',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '900' }}>✓</Text>
              </View>

              <Text style={{ fontSize: 30, fontWeight: '900', color: '#0F172A', letterSpacing: '-0.5px' }}>
                {lang ? 'আপনার বুকিং নিশ্চিত হয়েছে!' : 'Your booking is confirmed!'}
              </Text>
              <Text style={{ fontSize: 15, color: '#64748B', marginTop: 4 }}>
                {lang ? 'Flight Care বেছে নেওয়ার জন্য আপনাকে ধন্যবাদ।' : 'Thank you for choosing Flight Care.'}
              </Text>
              <View
                style={{
                  backgroundColor: '#E0F2FE',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginTop: 10,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369A1' }}>
                  {lang ? 'নমুনা নিশ্চিতকরণ' : 'Demo confirmation'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 4. Two-Column Main Content Container */}
        <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 24, marginTop: 8 }}>
          <View
            style={{
              width: '100%',
              maxWidth: 1080,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 28,
            }}
          >
            {/* ======================================================== */}
            {/* STEP 1: LEFT COLUMN (Passenger Details Form)              */}
            {/* ======================================================== */}
            {step === 1 && (
              <View
                style={{
                  flex: 1.25,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <UserIcon size={20} color="#0F172A" />
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                      {bookingForSomeoneElse
                        ? (lang ? 'যাত্রীর বিবরণ' : 'Passenger details')
                        : (lang ? 'যাত্রী ও যোগাযোগের বিবরণ' : 'Passenger & contact details')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setOcrTarget('lead');
                      setShowPassportOcr(true);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: '#EFF6FF',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                      cursor: 'pointer',
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>📷</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                      {lang ? 'পাসপোর্ট স্ক্যান' : 'Scan Passport'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Standalone Additional Services Banner */}
                {wiz.onlyAddons && (
                  <View
                    style={{
                      backgroundColor: '#ECFDF5',
                      borderColor: '#A7F3D0',
                      borderWidth: 1.5,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>✨</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#065F46' }}>
                        {lang ? 'শুধুমাত্র অতিরিক্ত সার্ভিস বুকিং' : 'Standalone Additional Services Booking'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#047857', marginTop: 2, lineHeight: 17 }}>
                        {lang
                          ? 'এই বুকিংয়ে কোনো প্রোটোকল প্যাকেজ ফি যুক্ত হবে না। আপনি শুধুমাত্র নির্বাচিত অতিরিক্ত সেবাগুলোর বিল দিয়ে এগিয়ে যাচ্ছেন।'
                          : 'No protocol package fee is applied. You are only proceeding with the bill of your selected additional services.'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Passenger full name */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    {bookingForSomeoneElse
                      ? (lang ? 'যাত্রীর পুরো নাম *' : 'Passenger full name *')
                      : (lang ? 'প্রধান যাত্রীর নাম *' : 'Lead passenger name *')}
                  </Text>
                  <View
                    style={{
                      height: 46,
                      backgroundColor: errors.passengerName ? '#FEF2F2' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: errors.passengerName ? '#EF4444' : (passengerName.trim().length >= 2 && isValidPassengerName(passengerName) ? '#10B981' : '#CBD5E1'),
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#0F172A',
                        outlineStyle: 'none',
                      }}
                      value={passengerName}
                      onChangeText={v => {
                        const cleaned = (v || '').replace(/[^a-zA-Z\u0980-\u09FF\s.'-]/g, '');
                        setPassengerName(cleaned);
                        if (errors.passengerName) setErrors(e => ({ ...e, passengerName: null }));
                      }}
                      placeholder={
                        bookingForSomeoneElse
                          ? (lang ? 'যাত্রীর পুরো নাম লিখুন (শুধুমাত্র অক্ষর)' : 'Enter passenger full name (letters only)')
                          : (lang ? 'আপনার পুরো নাম লিখুন (শুধুমাত্র অক্ষর)' : 'Enter your full name (letters only)')
                      }
                      placeholderTextColor="#94A3B8"
                    />
                    {passengerName.trim().length >= 2 && isValidPassengerName(passengerName) && (
                      <Text style={{ color: '#10B981', fontWeight: '800' }}>✓</Text>
                    )}
                  </View>
                  {errors.passengerName ? (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                      {errors.passengerName}
                    </Text>
                  ) : passengerName.trim().length > 0 && !isValidPassengerName(passengerName) ? (
                    <Text style={{ color: '#EF4444', fontSize: 11.5, marginTop: 4, fontWeight: '600' }}>
                      ⚠️ {lang ? 'নামে কোনো সংখ্যা বা বিশেষ চিহ্ন থাকা যাবে না' : 'Names cannot contain numbers or special characters'}
                    </Text>
                  ) : null}
                </View>

                {/* Mobile number & Email Row for Passenger */}
                <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
                  {/* Mobile Number */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      {bookingForSomeoneElse
                        ? (lang ? 'যাত্রীর মোবাইল নম্বর' : 'মোবাইল নম্বর *')
                        : (lang ? 'মোবাইল নম্বর *' : 'Mobile number *')}
                    </Text>
                    <View
                      style={{
                        height: 46,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: errors.passengerPhone ? '#FEF2F2' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: errors.passengerPhone
                          ? '#EF4444'
                          : (isValidMobileNumber(passengerPhone, passengerCountryCode) ? '#10B981' : '#CBD5E1'),
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          setCountryTarget('passenger');
                          setShowCountryModal(true);
                        }}
                        style={{
                          backgroundColor: '#F1F5F9',
                          paddingHorizontal: 12,
                          height: '100%',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRightWidth: 1,
                          borderRightColor: errors.passengerPhone ? '#EF4444' : '#CBD5E1',
                          gap: 4,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          {passengerCountryCode}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>▾</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={{
                          flex: 1,
                          paddingHorizontal: 12,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0F172A',
                          outlineStyle: 'none',
                        }}
                        keyboardType="phone-pad"
                        value={passengerPhone}
                        onChangeText={v => {
                          const sanitized = sanitizePhoneNumber(v, passengerCountryCode);
                          setPassengerPhone(sanitized);
                          if (errors.passengerPhone) setErrors(e => ({ ...e, passengerPhone: null }));
                        }}
                        placeholder={lang ? 'মোবাইল নম্বর লিখুন (যেমন: 1712...)' : 'Enter mobile number (e.g. 1712...)'}
                        placeholderTextColor="#94A3B8"
                      />
                      {passengerPhone.trim().length >= 7 && (
                        <Text style={{ color: '#10B981', fontWeight: '800', marginRight: 10 }}>✓</Text>
                      )}
                    </View>
                    {errors.passengerPhone ? (
                      <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                        {errors.passengerPhone}
                      </Text>
                    ) : null}
                  </View>

                  {/* Email */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      {lang ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)'}
                    </Text>
                    <View
                      style={{
                        height: 46,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: errors.passengerEmail ? '#FEF2F2' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: errors.passengerEmail ? '#EF4444' : (passengerEmail.trim().length > 0 && isValidEmailAddress(passengerEmail) ? '#10B981' : '#CBD5E1'),
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        gap: 8,
                      }}
                    >
                      <MailIcon size={16} color={errors.passengerEmail ? '#EF4444' : '#64748B'} />
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0F172A',
                          outlineStyle: 'none',
                        }}
                        keyboardType="email-address"
                        value={passengerEmail}
                        onChangeText={v => {
                          const cleaned = (v || '').replace(/\s+/g, '');
                          setPassengerEmail(cleaned);
                          if (errors.passengerEmail) setErrors(e => ({ ...e, passengerEmail: null }));
                        }}
                        placeholder={lang ? 'আপনার ইমেইল অ্যাড্রেস লিখুন' : 'For booking updates'}
                        placeholderTextColor="#94A3B8"
                      />
                      {passengerEmail.trim().length > 0 && isValidEmailAddress(passengerEmail) && (
                        <Text style={{ color: '#10B981', fontWeight: '800' }}>✓</Text>
                      )}
                    </View>
                    {errors.passengerEmail ? (
                      <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                        {errors.passengerEmail}
                      </Text>
                    ) : passengerEmail.trim().length > 0 && !isValidEmailAddress(passengerEmail) ? (
                      <Text style={{ color: '#EF4444', fontSize: 11.5, marginTop: 4, fontWeight: '600' }}>
                        ⚠️ {lang ? 'সঠিক ইমেইল ফরম্যাট দিন' : 'Invalid email format'}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Airport & Service Direction Row (EditText inputs) */}
                <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
                  {/* Airport */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      {lang ? 'বিমানবন্দর *' : 'Airport *'}
                    </Text>
                    <View
                      style={{
                        height: 46,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        gap: 8,
                      }}
                    >
                      <LocationPinIcon size={18} color="#0284C7" />
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0F172A',
                          outlineStyle: 'none',
                        }}
                        value={wiz.airportName !== undefined ? wiz.airportName : (lang ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)' : 'Hazrat Shahjalal International Airport, Dhaka (DAC)')}
                        onChangeText={v => setWiz(c => ({ ...c, airportName: v }))}
                        placeholder={lang ? 'বিমানবন্দরের নাম লিখুন' : 'Enter airport name'}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
                      <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>
                        ● {lang ? 'বর্তমানে শুধুমাত্র ঢাকা বিমানবন্দরে (DAC) সেবা চালু রয়েছে' : 'Currently operating exclusively at Dhaka Airport (DAC)'}
                      </Text>
                    </View>
                  </View>

                  {/* Service Direction */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      {lang ? 'সেবার ধরন (ডিরেকশন) *' : 'Service direction *'}
                    </Text>
                    <View
                      style={{
                        height: 46,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        gap: 8,
                      }}
                    >
                      {isDep ? <DepartureIcon size={18} /> : <ArrivalIcon size={18} />}
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0F172A',
                          outlineStyle: 'none',
                        }}
                        value={wiz.serviceDirectionText !== undefined ? wiz.serviceDirectionText : (isDep ? (lang ? 'প্রস্থান প্রোটোকল (Departure)' : 'Departure Protocol') : (lang ? 'আগমন প্রোটোকল (Arrival)' : 'Arrival Protocol'))}
                        onChangeText={v => {
                          setWiz(c => ({
                            ...c,
                            serviceDirectionText: v,
                            dir: v.toLowerCase().includes('dep') || v.includes('প্রস্থান') ? 'dep' : 'arr',
                          }));
                        }}
                        placeholder={lang ? 'আগমন বা প্রস্থান প্রোটোকল লিখুন' : 'Arrival or Departure Protocol'}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                </View>

                {/* Package & Passengers Row (EditText inputs) */}
                <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
                  {/* Package */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      {lang ? 'প্যাকেজ *' : 'Package *'}
                    </Text>
                    <View
                      style={{
                        height: 46,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        gap: 8,
                      }}
                    >
                      <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                        {wiz.onlyAddons ? (
                          <Image
                            source={require('../../assets/pkg_additional.webp')}
                            style={{ width: 20, height: 20, resizeMode: 'contain' }}
                          />
                        ) : wiz.packageChoice === 'economy' ? (
                          <StandardPkgIcon size={20} color="#0284C7" />
                        ) : wiz.packageChoice === 'first' ? (
                          <VipPkgIcon size={20} color="#D97706" />
                        ) : (
                          <PremiumPkgIcon size={20} color="#2563EB" />
                        )}
                      </View>
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0F172A',
                          outlineStyle: 'none',
                        }}
                        value={
                          wiz.onlyAddons
                            ? (lang ? 'শুধুমাত্র অতিরিক্ত সার্ভিস (ফি: ৳০)' : 'Only Additional Services (Fee: ৳0)')
                            : (wiz.packageText !== undefined ? wiz.packageText : (wiz.pkg?.n ? wiz.pkg.n[lang ? 1 : 0] : (wiz.pkg?.t || (lang ? 'প্রিমিয়াম (১০০০৳)' : 'Premium (1000 Tk)'))))
                        }
                        editable={!wiz.onlyAddons}
                        onChangeText={v => setWiz(c => ({ ...c, packageText: v }))}
                        placeholder={lang ? 'প্যাকেজের নাম লিখুন' : 'Enter package name'}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  {/* Passengers */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      {lang ? 'যাত্রী সংখ্যা *' : 'Passengers *'}
                    </Text>
                    <View
                      style={{
                        height: 46,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        gap: 8,
                      }}
                    >
                      <UserIcon size={18} color="#0284C7" />
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0F172A',
                          outlineStyle: 'none',
                        }}
                        keyboardType="numeric"
                        maxLength={1}
                        value={wiz.passengersText !== undefined ? String(wiz.passengersText) : String(wiz.a || 1)}
                        onChangeText={v => {
                          const digitsOnly = v.replace(/\D/g, '');
                          const parsed = parseInt(digitsOnly, 10);
                          const clamped = isNaN(parsed) || parsed < 1 ? 1 : Math.min(9, parsed);
                          setWiz(c => ({
                            ...c,
                            passengersText: clamped > 0 ? String(clamped) : '',
                            a: clamped,
                          }));
                        }}
                        placeholder={lang ? 'যাত্রী সংখ্যা (যেমন: 1)' : 'Number of passengers (e.g. 1)'}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    {Number(wiz.a) >= 9 && (
                      <View style={{ marginTop: 6, padding: 8, backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                        <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '700' }}>
                          ⚠️ {lang ? 'অনলাইনে সর্বোচ্চ ৯ জন যাত্রী বুক করা যাবে। গ্রুপ বুকিংয়ের জন্য সাপোর্টে যোগাযোগ করুন।' : 'Maximum 9 passengers allowed per booking. Contact support for group bookings.'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Flight Number & Service Date Row (EditText inputs) */}
                <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
                  {/* Flight Number */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      {lang ? 'ফ্লাইট নম্বর *' : 'Flight number *'}
                    </Text>
                    <View
                      style={{
                        height: 46,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: errors.flightNumber ? '#FEF2F2' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: errors.flightNumber
                          ? '#EF4444'
                          : ((wiz.fno || '').trim() && isValidFlightNumber(wiz.fno) ? '#10B981' : '#CBD5E1'),
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        gap: 8,
                      }}
                    >
                      <PlaneIcon size={18} color={errors.flightNumber ? '#EF4444' : '#64748B'} />
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: '700',
                          color: '#0F172A',
                          outlineStyle: 'none',
                        }}
                        value={wiz.fno || ''}
                        onChangeText={v => {
                          const upper = (v || '').toUpperCase();
                          setWiz(c => ({ ...c, fno: upper }));
                          if (upper.trim()) {
                            if (isValidFlightNumber(upper)) {
                              setErrors(e => ({ ...e, flightNumber: null }));
                            } else if (errors.flightNumber || upper.trim().length >= 3) {
                              setErrors(e => ({
                                ...e,
                                flightNumber: lang
                                  ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
                                  : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)',
                              }));
                            }
                          } else {
                            setErrors(e => ({ ...e, flightNumber: null }));
                          }
                        }}
                        onBlur={() => {
                          if ((wiz.fno || '').trim() && !isValidFlightNumber(wiz.fno)) {
                            setErrors(e => ({
                              ...e,
                              flightNumber: lang
                                ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
                                : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)',
                            }));
                          }
                        }}
                        placeholder={lang ? 'যেমন: BG-084, EK-582' : 'e.g. BG-084, EK-582'}
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="characters"
                      />
                    </View>
                    {errors.flightNumber ? (
                      <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                        ⚠️ {errors.flightNumber}
                      </Text>
                    ) : (wiz.fno || '').trim() && isValidFlightNumber(wiz.fno) ? (
                      (() => {
                        const flightInfo = getLiveFlightStatus(wiz.fno, isDep ? 'dep' : 'arr');
                        return (
                          <View style={{ marginTop: 6, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#DCFCE7' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ color: '#15803D', fontSize: 11.5, fontWeight: '800' }}>
                                  ✓ {lang ? 'শনাক্তকৃত ফ্লাইট' : 'Verified Flight'}: {wiz.fno}
                                </Text>
                                {(flightInfo?.liveRadar || wiz.liveRadar) && (
                                  <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#86EFAC' }}>
                                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#15803D' }}>
                                      ● {lang ? 'লাইভ রাডার' : 'Live Radar'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#166534' }}>
                                  🏢 {flightInfo?.terminal || wiz.terminal || 'Terminal 1, HSIA'}
                                </Text>
                              </View>
                            </View>
                            {(flightInfo?.airline || wiz.airline) && (
                              <Text style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                                ✈️ {lang ? flightInfo?.airlineBn || flightInfo?.airline || wiz.airlineBn || wiz.airline : flightInfo?.airline || wiz.airline} • {flightInfo?.route || wiz.route || ''}
                              </Text>
                            )}
                          </View>
                        );
                      })()
                    ) : null}

                    {/* Popular Flight Suggestion Chips */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                        {lang ? 'জনপ্রিয়:' : 'Popular:'}
                      </Text>
                      {(isDep
                        ? ['BG-085', 'EK-583', 'QR-639', 'SQ-447', 'BS-315', 'SV-805']
                        : ['BG-084', 'EK-582', 'QR-638', 'SQ-446', 'BS-314', 'SV-804']
                      ).map(fn => (
                        <TouchableOpacity
                          key={fn}
                          activeOpacity={0.7}
                          onPress={() => {
                            const fi = getLiveFlightStatus(fn, isDep ? 'dep' : 'arr');
                            setWiz(c => ({
                              ...c,
                              fno: fn,
                              terminal: fi?.terminal || 'Terminal 1',
                              airline: fi?.airline,
                            }));
                            setErrors(e => ({ ...e, flightNumber: null }));
                          }}
                          style={{
                            backgroundColor: wiz.fno === fn ? '#E0F2FE' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: wiz.fno === fn ? '#0284C7' : '#E2E8F0',
                            borderRadius: 6,
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            cursor: 'pointer',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: wiz.fno === fn ? '#0284C7' : '#475569' }}>
                            {fn}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Service Date (Date Picker) */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      {lang ? 'সেবার তারিখ *' : 'Service date *'}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setShowDateModal(true)}
                      style={{
                        height: 46,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: errors.serviceDate ? '#FEF2F2' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: errors.serviceDate
                          ? '#EF4444'
                          : ((wiz.date || '').trim() && isValidFlightDate(wiz.date) ? '#10B981' : '#CBD5E1'),
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <CalendarIcon size={18} color="#0284C7" />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: wiz.date ? '700' : '500',
                            color: wiz.date ? '#0F172A' : '#94A3B8',
                          }}
                          numberOfLines={1}
                        >
                          {wiz.date || (lang ? 'তারিখ নির্বাচন করুন' : 'Select service date')}
                        </Text>
                      </View>
                      <View
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor: '#F0F9FF',
                          borderWidth: 1,
                          borderColor: '#BAE6FD',
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>📅</Text>
                      </View>
                    </TouchableOpacity>
                    {errors.serviceDate ? (
                      <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                        ⚠️ {errors.serviceDate}
                      </Text>
                    ) : (wiz.date || '').trim() && isValidFlightDate(wiz.date) ? (
                      <Text style={{ color: '#059669', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                        ✓ {lang ? 'বৈধ তারিখ' : 'Valid date'}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* If booking for someone else, show your details card */}
                {bookingForSomeoneElse && (
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 14,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>
                      {lang ? 'আপনার বিবরণ — বুকিং যোগাযোগ' : 'Your details — booking contact'}
                    </Text>

                    {/* Booker name */}
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                        {lang ? 'আপনার পুরো নাম *' : 'Your full name *'}
                      </Text>
                      <View
                        style={{
                          height: 44,
                          backgroundColor: errors.bookerName ? '#FEF2F2' : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: errors.bookerName ? '#EF4444' : (bookerName.trim().length >= 2 && isValidPassengerName(bookerName) ? '#10B981' : '#CBD5E1'),
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <TextInput
                          style={{
                            flex: 1,
                            fontSize: 14,
                            fontWeight: '600',
                            color: '#0F172A',
                            outlineStyle: 'none',
                          }}
                          value={bookerName}
                          onChangeText={v => {
                            const cleaned = (v || '').replace(/[^a-zA-Z\u0980-\u09FF\s.'-]/g, '');
                            setBookerName(cleaned);
                            if (errors.bookerName) setErrors(e => ({ ...e, bookerName: null }));
                          }}
                          placeholder={lang ? 'আপনার পুরো নাম লিখুন (শুধুমাত্র অক্ষর)' : 'Enter your full name (letters only)'}
                          placeholderTextColor="#94A3B8"
                        />
                        {bookerName.trim().length >= 2 && isValidPassengerName(bookerName) && (
                          <Text style={{ color: '#10B981', fontWeight: '800' }}>✓</Text>
                        )}
                      </View>
                      {errors.bookerName ? (
                        <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                          {errors.bookerName}
                        </Text>
                      ) : bookerName.trim().length > 0 && !isValidPassengerName(bookerName) ? (
                        <Text style={{ color: '#EF4444', fontSize: 11.5, marginTop: 4, fontWeight: '600' }}>
                          ⚠️ {lang ? 'নামে কোনো সংখ্যা বা বিশেষ চিহ্ন থাকা যাবে না' : 'Names cannot contain numbers or special characters'}
                        </Text>
                      ) : null}
                    </View>

                    {/* Booker phone & email row */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                          {lang ? 'আপনার মোবাইল নম্বর *' : 'Your mobile number *'}
                        </Text>
                        <View
                          style={{
                            height: 44,
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: errors.bookerPhone ? '#FEF2F2' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: errors.bookerPhone
                              ? '#EF4444'
                              : (isValidMobileNumber(bookerPhone, bookerCountryCode) ? '#10B981' : '#CBD5E1'),
                            borderRadius: 8,
                            overflow: 'hidden',
                          }}
                        >
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                              setCountryTarget('booker');
                              setShowCountryModal(true);
                            }}
                            style={{
                              backgroundColor: '#F1F5F9',
                              paddingHorizontal: 10,
                              height: '100%',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRightWidth: 1,
                              borderRightColor: errors.bookerPhone ? '#EF4444' : '#CBD5E1',
                              gap: 4,
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                              {bookerCountryCode}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>▾</Text>
                          </TouchableOpacity>
                          <TextInput
                            style={{
                              flex: 1,
                              paddingHorizontal: 10,
                              fontSize: 14,
                              fontWeight: '600',
                              color: '#0F172A',
                              outlineStyle: 'none',
                            }}
                            keyboardType="phone-pad"
                            value={bookerPhone}
                            onChangeText={v => {
                              const sanitized = sanitizePhoneNumber(v, bookerCountryCode);
                              setBookerPhone(sanitized);
                              if (errors.bookerPhone) setErrors(e => ({ ...e, bookerPhone: null }));
                            }}
                            placeholder={lang ? 'মোবাইল নম্বর লিখুন (যেমন: 1712...)' : 'Enter mobile number (e.g. 1712...)'}
                            placeholderTextColor="#94A3B8"
                          />
                          {bookerPhone.trim().length >= 7 && (
                            <Text style={{ color: '#10B981', fontWeight: '800', marginRight: 10 }}>✓</Text>
                          )}
                        </View>
                        {errors.bookerPhone ? (
                          <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                            {errors.bookerPhone}
                          </Text>
                        ) : null}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                          {lang ? 'আপনার ইমেইল (ঐচ্ছিক)' : 'Your email (optional)'}
                        </Text>
                        <View
                          style={{
                            height: 44,
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: errors.bookerEmail ? '#FEF2F2' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: errors.bookerEmail ? '#EF4444' : (bookerEmail.trim().length > 0 && isValidEmailAddress(bookerEmail) ? '#10B981' : '#CBD5E1'),
                            borderRadius: 8,
                            paddingHorizontal: 12,
                          }}
                        >
                          <TextInput
                            style={{
                              flex: 1,
                              fontSize: 14,
                              fontWeight: '600',
                              color: '#0F172A',
                              outlineStyle: 'none',
                            }}
                            keyboardType="email-address"
                            value={bookerEmail}
                            onChangeText={v => {
                              const cleaned = (v || '').replace(/\s+/g, '');
                              setBookerEmail(cleaned);
                              if (errors.bookerEmail) setErrors(e => ({ ...e, bookerEmail: null }));
                            }}
                            placeholder={lang ? 'আপনার ইমেইল অ্যাড্রেস লিখুন' : 'For booking updates'}
                            placeholderTextColor="#94A3B8"
                          />
                          {bookerEmail.trim().length > 0 && isValidEmailAddress(bookerEmail) && (
                            <Text style={{ color: '#10B981', fontWeight: '800' }}>✓</Text>
                          )}
                        </View>
                        {errors.bookerEmail ? (
                          <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                            {errors.bookerEmail}
                          </Text>
                        ) : bookerEmail.trim().length > 0 && !isValidEmailAddress(bookerEmail) ? (
                          <Text style={{ color: '#EF4444', fontSize: 11.5, marginTop: 4, fontWeight: '600' }}>
                            ⚠️ {lang ? 'সঠিক ইমেইল ফরম্যাট দিন' : 'Invalid email format'}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                )}

                {/* Visa On Arrival Mandatory Documents & Guidelines Section */}
                {((wiz.addons || []).includes('visa') || (wiz.addons || []).includes('visa_on_arrival')) && (
                  <View style={{ marginBottom: 18 }}>
                    <VisaOnArrivalUploadSection
                      lang={lang}
                      visaDetails={wiz.addonDetails?.visa_on_arrival || wiz.addonDetails?.visa || {}}
                      onUpdateVisaDetails={updated =>
                        setWiz(prev => ({
                          ...prev,
                          addonDetails: {
                            ...prev.addonDetails,
                            visa: updated,
                            visa_on_arrival: updated,
                          },
                        }))
                      }
                    />
                  </View>
                )}

                {/* Special Assistance Dropdown */}
                <View style={{ marginBottom: 18 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    {lang ? 'বিশেষ সহায়তা (ঐচ্ছিক)' : 'Special assistance (optional)'}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowSpecialModal(true)}
                    style={{
                      height: 46,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      gap: 8,
                    }}
                  >
                    <WheelchairIcon size={18} color="#64748B" />
                    <Text style={{ fontSize: 13.5, color: '#334155', flex: 1 }}>
                      {assistanceOptions.find(o => o.key === specialAssistance)?.label ||
                        (lang ? 'কোনো সহায়তার প্রয়োজন হলে জানান' : 'Tell us if you need extra assistance')}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>▾</Text>
                  </TouchableOpacity>
                </View>

                {/* Checkbox: Booking for someone else */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setBookingForSomeoneElse(!bookingForSomeoneElse)}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      borderWidth: 1.5,
                      borderColor: bookingForSomeoneElse ? '#0284C7' : '#94A3B8',
                      backgroundColor: bookingForSomeoneElse ? '#0284C7' : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                    }}
                  >
                    {bookingForSomeoneElse && <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#1E293B' }}>
                      {lang ? 'আমি অন্য কারো জন্য বুক করছি' : 'I am booking for someone else'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                      {lang
                        ? 'আলাদা যাত্রী এবং বুকিং যোগাযোগ তথ্য যোগ করুন।'
                        : 'Add separate passenger and booking contact details.'}
                    </Text>
                  </View>
                </TouchableOpacity>


                {/* Mandatory SSLCommerz Policies Checkbox (Blank by default) */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setAgreeTerms(!agreeTerms);
                    if (errors.agreeTerms) setErrors(e => ({ ...e, agreeTerms: null }));
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginBottom: errors.agreeTerms ? 6 : 18,
                    backgroundColor: errors.agreeTerms ? '#FEF2F2' : '#F8FAFC',
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: errors.agreeTerms ? '#EF4444' : agreeTerms ? '#059669' : '#CBD5E1',
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: errors.agreeTerms ? '#EF4444' : agreeTerms ? '#059669' : '#64748B',
                      backgroundColor: agreeTerms ? '#059669' : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                    }}
                  >
                    {agreeTerms && <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, color: errors.agreeTerms ? '#DC2626' : '#1E293B', lineHeight: 18 }}>
                      {lang ? 'আমি ওয়েবসাইটের ' : 'I have read and agree to the website\'s '}
                      <Text
                        style={{ color: '#0284C7', fontWeight: '800', textDecorationLine: 'underline' }}
                        onPress={() => setComplianceModalTab('terms')}
                      >
                        {lang ? 'সেবার শর্তাবলী (Terms & Conditions)' : 'Terms & Conditions'}
                      </Text>
                      {lang ? ', ' : ', '}
                      <Text
                        style={{ color: '#0284C7', fontWeight: '800', textDecorationLine: 'underline' }}
                        onPress={() => setComplianceModalTab('privacy')}
                      >
                        {lang ? 'গোপনীয়তা নীতি (Privacy Policy)' : 'Privacy Policy'}
                      </Text>
                      {lang ? ' এবং ' : ', and '}
                      <Text
                        style={{ color: '#0284C7', fontWeight: '800', textDecorationLine: 'underline' }}
                        onPress={() => setComplianceModalTab('refund')}
                      >
                        {lang ? 'রিফান্ড নীতিমালা (Return & Refund Policy)' : 'Return & Refund Policy'}
                      </Text>
                      {lang ? ' পড়েছি এবং সম্মত আছি।*' : '.*'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {errors.agreeTerms ? (
                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 0, marginBottom: 16, fontWeight: '600' }}>
                    {errors.agreeTerms}
                  </Text>
                ) : null}

                {/* Validation Summary Alert if errors exist */}
                {Object.keys(errors).length > 0 && (
                  <View
                    style={{
                      backgroundColor: '#FEF2F2',
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: '#EF4444',
                      padding: 12,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626' }}>
                      ⚠️ {lang ? 'পেমেন্টে এগিয়ে যাওয়ার আগে লাল চিহ্নিত তথ্যগুলো সঠিক করুন:' : 'Please complete all required fields marked in red:'}
                    </Text>
                    {errors.flightNumber && (
                      <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 3 }}>
                        • {lang ? 'ফ্লাইট নম্বর: ' : 'Flight number: '}{errors.flightNumber}
                      </Text>
                    )}
                    {errors.serviceDate && (
                      <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                        • {lang ? 'সেবার তারিখ: ' : 'Service date: '}{errors.serviceDate}
                      </Text>
                    )}
                    {errors.passengerName && (
                      <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                        • {lang ? 'যাত্রীর নাম: ' : 'Passenger name: '}{errors.passengerName}
                      </Text>
                    )}
                    {errors.passengerPhone && (
                      <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                        • {lang ? 'মোবাইল নম্বর: ' : 'Mobile number: '}{errors.passengerPhone}
                      </Text>
                    )}
                    {errors.bookerName && (
                      <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                        • {lang ? 'বুকারের নাম: ' : 'Booker name: '}{errors.bookerName}
                      </Text>
                    )}
                    {errors.bookerPhone && (
                      <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                        • {lang ? 'বুকারের ফোন: ' : 'Booker phone: '}{errors.bookerPhone}
                      </Text>
                    )}
                    {errors.agreeTerms && (
                      <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                        • {errors.agreeTerms}
                      </Text>
                    )}
                  </View>
                )}

                {/* Footnote & Action Buttons */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      if (handleBack) {
                        handleBack();
                      } else {
                        setWiz(null);
                        if (setTab) setTab('home');
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#F1F5F9',
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                    }}
                  >
                    <Text style={{ fontSize: 16, color: '#0284C7', fontWeight: '900' }}>←</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#334155' }}>
                      {lang ? 'ফিরে যান' : 'Back to Home'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleContinueToPayment}
                    style={{
                      backgroundColor: '#0284C7',
                      paddingVertical: 13,
                      paddingHorizontal: 28,
                      borderRadius: 12,
                      shadowColor: '#0284C7',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                      {lang ? 'পেমেন্টে এগিয়ে যান →' : 'Continue to Payment →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ======================================================== */}
            {/* STEP 2: LEFT COLUMN (Payment Method Options)              */}
            {/* ======================================================== */}
            {step === 2 && (
              <View
                style={{
                  flex: 1.25,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                }}
              >
                {/* 15-Minute Countdown Timer Banner */}
                <View
                  style={{
                    backgroundColor: secondsLeft < 180 ? '#FEF2F2' : '#EFF6FF',
                    borderRadius: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: secondsLeft < 180 ? '#FCA5A5' : '#BFDBFE',
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>⏱️</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: secondsLeft < 180 ? '#DC2626' : '#1E40AF',
                      }}
                    >
                      {lang ? 'পেমেন্ট সম্পন্ন করার সময় বাকি:' : 'Time remaining to pay:'}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: secondsLeft < 180 ? '#DC2626' : '#0284C7',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>
                      {formatTimer(secondsLeft)}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'পেমেন্ট মাধ্যম' : 'Payment method'}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2, marginBottom: 18 }}>
                  {lang ? 'অনলাইন গেটওয়ে অথবা সার্ভিস সমাপ্তির পরে পেমেন্ট' : 'Online payment gateway or payment after service'}
                </Text>

                {/* 1. SSLCOMMERZ Payment Gateway */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPaymentMethod('sslcommerz')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: paymentMethod === 'sslcommerz' ? '#072B56' : '#E2E8F0',
                    backgroundColor: paymentMethod === 'sslcommerz' ? '#F0F7FF' : '#FFFFFF',
                    marginBottom: 12,
                    gap: 14,
                    boxShadow: paymentMethod === 'sslcommerz' ? '0 4px 14px rgba(7, 43, 86, 0.15)' : 'none',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: paymentMethod === 'sslcommerz' ? '#072B56' : '#CBD5E1',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {paymentMethod === 'sslcommerz' && (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#072B56' }} />
                    )}
                  </View>
                  <SslCommerzLogo size={36} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#072B56' }}>
                        {lang ? 'এসএসএল কমার্জ (SSLCOMMERZ)' : 'SSLCOMMERZ Payment Gateway'}
                      </Text>
                      <View style={{ backgroundColor: '#072B56', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFFFFF' }}>
                          {lang ? 'কার্ড ও মোবাইল ব্যাংকিং' : 'MULTI-CHANNEL'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#1E3A8A', fontWeight: '600', marginTop: 2 }}>
                      {lang
                        ? 'ভিসা, মাস্টারকার্ড, অ্যামেক্স, বিকাশ, নগদ, রকেট, উপায় ও ৩০+ ইন্টারনেট ব্যাংকিং'
                        : 'Visa, Mastercard, AMEX, bKash, Nagad, Rocket, Upay & 30+ Banks'}
                    </Text>
                  </View>
                  <SslCommerzBadge />
                </TouchableOpacity>

                {/* 2. Payment After Service (সার্ভিস সমাপ্তির পরে পেমেন্ট) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPaymentMethod('pay_after_service')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: paymentMethod === 'pay_after_service' ? '#0284C7' : '#E2E8F0',
                    backgroundColor: paymentMethod === 'pay_after_service' ? '#F0F9FF' : '#FFFFFF',
                    marginBottom: 18,
                    gap: 14,
                    boxShadow: paymentMethod === 'pay_after_service' ? '0 4px 14px rgba(2, 132, 199, 0.15)' : 'none',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: paymentMethod === 'pay_after_service' ? '#0284C7' : '#CBD5E1',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {paymentMethod === 'pay_after_service' && (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0284C7' }} />
                    )}
                  </View>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: '#0284C7',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>🤝</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                        {lang ? 'সার্ভিস সমাপ্তির পরে পেমেন্ট (Pay After Service)' : 'Payment After Service (Pay Later)'}
                      </Text>
                      <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#BAE6FD' }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#0369A1' }}>
                          {lang ? 'সার্ভিসের পরে' : 'POST-SERVICE'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 2 }}>
                      {lang
                        ? 'বিমানবন্দরে প্রোটোকল সার্ভিস সম্পন্ন হওয়ার পর অফিসারের নিকট ক্যাশ, বিকাশ বা কার্ডে পেমেন্ট করুন'
                        : 'Pay in cash, bKash, or card directly to the Protocol Officer after your VIP service is complete'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Promo Code Box */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginBottom: 18,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                      🏷️ {lang ? 'প্রোমো কোড / ডিসকাউন্ট কুপন' : 'Promo Code / Coupon'}
                    </Text>
                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#B45309' }}>
                        {lang ? 'অফার' : 'OFFER'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
                    {lang
                      ? 'ডিসকাউন্ট পেতে আপনার কোড লিখুন (যেমন: FLIGHT100, EIDVIP, WELCOME50, CARE10)'
                      : 'Enter code for discount (e.g. FLIGHT100, EIDVIP, WELCOME50, CARE10)'}
                  </Text>

                  {wiz?.discount?.amount ? (
                    <View
                      style={{
                        backgroundColor: '#ECFDF5',
                        borderWidth: 1,
                        borderColor: '#A7F3D0',
                        borderRadius: 10,
                        padding: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <CheckCircleIcon size={16} color="#059669" />
                        <Text style={{ fontSize: 14, fontWeight: '900', color: '#064E3B' }}>
                          {wiz.discount.code}
                        </Text>
                        <View style={{ backgroundColor: '#059669', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                            -৳{wiz.discount.amount}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#047857' }}>
                          {wiz.discount.label}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={handleRemovePromo}
                        style={{
                          backgroundColor: '#FEE2E2',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#DC2626' }}>
                          {lang ? 'মুছুন' : 'Remove'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          value={promoInput}
                          onChangeText={text => {
                            setPromoInput(text.toUpperCase());
                            if (promoStatus) setPromoStatus(null);
                          }}
                          placeholder={lang ? 'প্রোমো কোড (যেমন: FLIGHT100)' : 'Promo Code (e.g. FLIGHT100)'}
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="characters"
                          style={{
                            flex: 1,
                            height: 40,
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1.5,
                            borderColor: promoStatus?.type === 'error' ? '#EF4444' : '#CBD5E1',
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            fontSize: 13,
                            fontWeight: '700',
                            color: '#0F172A',
                          }}
                        />
                        <TouchableOpacity
                          onPress={handleApplyPromo}
                          disabled={isApplyingPromo}
                          style={{
                            backgroundColor: '#0F172A',
                            paddingHorizontal: 16,
                            height: 40,
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isApplyingPromo ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                              {lang ? 'প্রয়োগ' : 'Apply'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                      {promoStatus && (
                        <Text
                          style={{
                            fontSize: 11.5,
                            marginTop: 5,
                            fontWeight: '700',
                            color: promoStatus.type === 'error' ? '#EF4444' : '#059669',
                          }}
                        >
                          {promoStatus.message}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Callout Info Banner */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    backgroundColor: paymentMethod === 'pay_after_service' ? '#ECFDF5' : paymentMethod === 'sslcommerz' ? '#F0F7FF' : '#F0F9FF',
                    borderWidth: 1,
                    borderColor: paymentMethod === 'pay_after_service' ? '#A7F3D0' : paymentMethod === 'sslcommerz' ? '#BAE6FD' : '#BAE6FD',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 20,
                  }}
                >
                  <InfoCircleIcon size={18} color={paymentMethod === 'pay_after_service' ? '#059669' : paymentMethod === 'sslcommerz' ? '#072B56' : '#0284C7'} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: paymentMethod === 'pay_after_service' ? '#065F46' : paymentMethod === 'sslcommerz' ? '#072B56' : '#0369A1', lineHeight: 18 }}>
                      {paymentMethod === 'pay_after_service'
                        ? (lang ? 'কোনো অগ্রিম পেমেন্টের প্রয়োজন নেই।' : 'Zero advance payment required.')
                        : paymentMethod === 'sslcommerz'
                        ? (lang ? 'এসএসএল কমার্জ সিকিউর গেটওয়েতে ৩ডি সিকিউর পেমেন্ট।' : 'SSLCOMMERZ 3D Secure Multi-Channel Gateway.')
                        : (lang ? 'পরবর্তী ধাপে পেমেন্ট গেটওয়েতে নিয়ে যাওয়া হবে।' : 'Continue to the payment gateway in the next step.')}
                    </Text>
                    <Text style={{ fontSize: 12, color: paymentMethod === 'pay_after_service' ? '#047857' : paymentMethod === 'sslcommerz' ? '#1E3A8A' : '#0284C7', marginTop: 2 }}>
                      {paymentMethod === 'pay_after_service'
                        ? (lang ? 'বুকিং এখনই নিশ্চিত হবে এবং সার্ভিস গ্রহণের পর প্রোটোকল অফিসারকে বিল পরিশোধ করবেন।' : 'Booking is confirmed instantly and bill will be collected by officer after service completion.')
                        : paymentMethod === 'sslcommerz'
                        ? (lang ? 'কার্ড, বিকাশ, নগদ, রকেট ও ব্যাংক ট্রান্সফারে ২৪/৭ অটোমেটিক ইনস্ট্যান্ট কনফার্মেশন।' : 'Instant booking confirmation via cards, MFS, and internet banking.')
                        : (lang ? 'সফল পেমেন্টের পর আপনার বুকিং নিশ্চিত করা হবে।' : 'Your booking is confirmed after successful payment.')}
                    </Text>
                  </View>
                </View>

                {/* Mandatory Luggage & Prohibited Items Consent Checkbox (চূড়ান্ত ধাপ) */}
                <View
                  style={{
                    backgroundColor: baggageConsentError && !baggageConsent ? '#FEF2F2' : '#F8FAFC',
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: baggageConsentError && !baggageConsent ? '#EF4444' : baggageConsent ? '#86EFAC' : '#E2E8F0',
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 18 }}>🛡️</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: baggageConsentError && !baggageConsent ? '#DC2626' : '#0F172A' }}>
                        {lang ? 'লাগেজ ও নিষিদ্ধ সামগ্রী সংক্রান্ত ঘোষণা' : 'Luggage & Prohibited Items Declaration'}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: baggageConsentError && !baggageConsent ? '#DC2626' : '#FEE2E2',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: baggageConsentError && !baggageConsent ? '#FFFFFF' : '#B91C1C' }}>
                        {lang ? 'বাধ্যতামূলক' : 'MANDATORY'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setBaggageConsent(!baggageConsent);
                      if (baggageConsentError) setBaggageConsentError(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 12,
                      backgroundColor: baggageConsent ? '#F0FDF4' : '#FFFFFF',
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: baggageConsent ? '#059669' : baggageConsentError ? '#FCA5A5' : '#CBD5E1',
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: baggageConsent ? '#059669' : baggageConsentError ? '#DC2626' : '#64748B',
                        backgroundColor: baggageConsent ? '#059669' : '#FFFFFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                      }}
                    >
                      {baggageConsent && (
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>✓</Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13.5,
                          fontWeight: '700',
                          color: baggageConsentError && !baggageConsent ? '#B91C1C' : '#1E293B',
                          lineHeight: 20,
                        }}
                      >
                        {lang
                          ? '“আমি নিশ্চিত ও সম্মতি প্রদান করছি যে আমার/যাত্রীর লাগেজে কোনো নিষিদ্ধ পণ্য যেমন: দেশী-বিদেশী মুদ্রা, অলংকার, জীবিত প্রাণী, মাদকদ্রব্য, গোলাবারুদ বা কোনো প্রকার বেআইনি/বিপজ্জনক দ্রব্য নেই।”'
                          : '“I confirm and consent that the passenger luggage contains no prohibited items such as currency, live animals, jewelry, weapons, narcotics, hazardous materials, or illegal goods.”'}
                      </Text>

                      <TouchableOpacity
                        onPress={() => setShowTermsModal(true)}
                        style={{ marginTop: 6, alignSelf: 'flex-start' }}
                      >
                        <Text style={{ fontSize: 12, color: '#0284C7', fontWeight: '800', textDecorationLine: 'underline' }}>
                          {lang ? '📋 সম্পূর্ণ শর্তাবলি ও ব্যাগেজ নীতিমালা দেখুন ›' : '📋 Read full terms & luggage policy ›'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>

                  {baggageConsentError && !baggageConsent && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '700' }}>
                        ⚠️ {lang
                          ? 'বুকিং বা পেমেন্ট সম্পন্ন করতে অবশ্যই উপরের বক্সে টিক চিহ্ন দিয়ে সম্মতি প্রদান করতে হবে।'
                          : 'You must check this box to confirm and consent before payment or booking can be completed.'}
                      </Text>
                    </View>
                  )}

                  {/* SSLCommerz Direct Policy Links */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                      {lang ? 'পেমেন্ট সম্পন্ন করার মাধ্যমে আপনি আমাদের ' : 'By proceeding with payment, you agree to: '}
                    </Text>
                    <TouchableOpacity onPress={() => setComplianceModalTab('terms')}>
                      <Text style={{ fontSize: 11.5, color: '#0284C7', fontWeight: '800', textDecorationLine: 'underline' }}>
                        {lang ? 'শর্তাবলী' : 'Terms'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>•</Text>
                    <TouchableOpacity onPress={() => setComplianceModalTab('privacy')}>
                      <Text style={{ fontSize: 11.5, color: '#0284C7', fontWeight: '800', textDecorationLine: 'underline' }}>
                        {lang ? 'প্রাইভেসি' : 'Privacy'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>•</Text>
                    <TouchableOpacity onPress={() => setComplianceModalTab('refund')}>
                      <Text style={{ fontSize: 11.5, color: '#0284C7', fontWeight: '800', textDecorationLine: 'underline' }}>
                        {lang ? 'রিফান্ড পলিসি (৭-১০ দিন)' : 'Refund Policy (7-10 Days)'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Pay Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handlePayNow}
                  disabled={isPaying}
                  style={{
                    backgroundColor: paymentMethod === 'pay_after_service' ? '#059669' : paymentMethod === 'sslcommerz' ? '#072B56' : '#0284C7',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isPaying ? 0.7 : 1,
                    shadowColor: paymentMethod === 'pay_after_service' ? '#059669' : paymentMethod === 'sslcommerz' ? '#072B56' : '#0284C7',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                    marginBottom: 14,
                  }}
                >
                  {isPaying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>
                      {paymentMethod === 'pay_after_service'
                        ? (lang ? `বুকিং নিশ্চিত করুন (সার্ভিসের পরে ${totalAmount} Tk পরিশোধ) →` : `Confirm Booking (Pay ${totalAmount} Tk Later) →`)
                        : paymentMethod === 'sslcommerz'
                        ? (lang ? `SSLCOMMERZ এ পরিশোধ করুন ${totalAmount} Tk →` : `Pay ${totalAmount} Tk via SSLCOMMERZ →`)
                        : (lang ? `পরিশোধ করুন ${totalAmount} Tk →` : `Pay ${totalAmount} Tk →`)}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Back to Edit Details Link */}
                <TouchableOpacity
                  onPress={() => setWiz(c => ({ ...c, step: 1 }))}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0284C7' }}>
                    {lang ? '← বুকিং তথ্য পরিবর্তন করুন' : '← Edit booking details'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ======================================================== */}
            {/* STEP 3: LEFT COLUMN (Booking Reference Card)              */}
            {/* ======================================================== */}
            {step === 3 && (
              <View
                style={{
                  flex: 1.25,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                }}
              >
                {/* Header Row: Reference + Payment Status Badge */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F1F5F9',
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: '#F0F9FF',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>🎫</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                        {lang ? 'বুকিং রেফারেন্স' : 'Booking reference'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#0284C7' }}>
                          #{bookingCode}
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={handleCopyBookingId}
                          style={{
                            backgroundColor: copiedId ? '#DCFCE7' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: copiedId ? '#86EFAC' : '#E2E8F0',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontSize: 11 }}>{copiedId ? '✓' : '📋'}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: copiedId ? '#15803D' : '#0284C7' }}>
                            {copiedId ? (lang ? 'কপি হয়েছে' : 'Copied!') : (lang ? 'কপি' : 'Copy')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: paymentMethod === 'pay_after_service' ? '#FEF3C7' : '#DCFCE7',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 10,
                    }}
                  >
                    <CheckCircleIcon size={14} color={paymentMethod === 'pay_after_service' ? '#B45309' : '#15803D'} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: paymentMethod === 'pay_after_service' ? '#B45309' : '#15803D' }}>
                      {paymentMethod === 'pay_after_service'
                        ? (lang ? 'বুকিং নিশ্চিত (পে লেটার)' : 'Booking Confirmed (Pay Later)')
                        : (lang ? 'পেমেন্ট সফল' : 'Payment successful')}
                    </Text>
                  </View>
                </View>

                {/* Details List */}
                <View style={{ gap: 12, marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <UserIcon size={16} color="#64748B" />
                    <Text style={{ fontSize: 13, color: '#64748B', width: 90 }}>
                      {lang ? 'যাত্রী' : 'Passenger'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                      {passengerName}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <PlaneIcon size={16} color="#64748B" />
                    <Text style={{ fontSize: 13, color: '#64748B', width: 90 }}>
                      {lang ? 'সেবা' : 'Service'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                      {serviceLabel}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <LocationPinIcon size={16} color="#64748B" />
                    <Text style={{ fontSize: 13, color: '#64748B', width: 90 }}>
                      {lang ? 'বিমানবন্দর' : 'Airport'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                      {airportLabel}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <PlaneIcon size={16} color="#64748B" />
                    <Text style={{ fontSize: 13, color: '#64748B', width: 90 }}>
                      {lang ? 'ফ্লাইট' : 'Flight'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                      {flightLabel}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CalendarIcon size={16} color="#64748B" />
                    <Text style={{ fontSize: 13, color: '#64748B', width: 90 }}>
                      {lang ? 'তারিখ' : 'Date'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                      {dateLabel}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <UserIcon size={16} color="#64748B" />
                    <Text style={{ fontSize: 13, color: '#64748B', width: 90 }}>
                      {lang ? 'যাত্রী সংখ্যা' : 'Passengers'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                      {passengers} {lang ? 'জন যাত্রী' : passengers === 1 ? 'adult' : 'adults'}
                    </Text>
                  </View>
                </View>

                {/* Multi-channel dispatch notice */}
                <View
                  style={{
                    backgroundColor: '#F0FDF4',
                    borderRadius: 10,
                    padding: 12,
                    marginTop: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    borderWidth: 1,
                    borderColor: '#DCFCE7',
                  }}
                >
                  <Text style={{ fontSize: 16 }}>📨</Text>
                  <Text style={{ fontSize: 12, color: '#166534', flex: 1, fontWeight: '600' }}>
                    {lang
                      ? 'ই-টিকেট ও বিমানবন্দরে সাক্ষাতের স্থান সংক্রান্ত পূর্ণ বিবরণ এসএমএস এবং ইমেইলে সফলভাবে প্রেরণ করা হয়েছে।'
                      : 'Full booking e-ticket and meeting spot directions have been sent to your Email and SMS.'}
                  </Text>
                </View>
              </View>
            )}

            {/* ======================================================== */}
            {/* RIGHT COLUMN (Summary Card + Support Cards)              */}
            {/* ======================================================== */}
            <View style={{ flex: 0.95, gap: 18 }}>
              {/* Step 1 & 2 Summary Card */}
              {step < 3 ? (
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 18,
                    padding: 22,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.04,
                    shadowRadius: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 18 }}>📋</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                        {step === 1
                          ? lang
                            ? 'আপনার বুকিং'
                            : 'Your booking'
                          : lang
                          ? 'বুকিং সারাংশ'
                          : 'Booking summary'}
                      </Text>
                    </View>

                    {step === 1 && (
                      <TouchableOpacity
                        onPress={() => {
                          if (handleBack) {
                            handleBack();
                          } else {
                            setWiz(null);
                            if (setTab) setTab('home');
                          }
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <PencilIcon size={13} color="#0284C7" />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284C7' }}>
                          {lang ? 'এডিট' : 'Edit'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ gap: 10, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>✈ {lang ? 'সেবা' : 'Service'}</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                        {serviceLabel}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>📍 {lang ? 'বিমানবন্দর' : 'Airport'}</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                        {airportLabel}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>✈ {lang ? 'ফ্লাইট' : 'Flight'}</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                        {flightLabel}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>📅 {lang ? 'তারিখ' : 'Date'}</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                        {dateLabel}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>👤 {lang ? 'যাত্রী সংখ্যা' : 'Passengers'}</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                        {passengers} {lang ? 'জন যাত্রী' : passengers === 1 ? 'adult' : 'adults'}
                      </Text>
                    </View>

                    {/* Add-on services */}
                    {pricingData.addonLines && pricingData.addonLines.map(addon => {
                      const asset = getAddonAsset(addon.id);
                      return (
                        <View key={addon.id} style={{ marginTop: 6 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                              {asset ? (
                                <Image source={asset} style={{ width: 18, height: 18, borderRadius: 4, marginRight: 6 }} resizeMode="contain" />
                              ) : (
                                <Text style={{ fontSize: 13, color: '#64748B', marginRight: 4 }}>+</Text>
                              )}
                              <Text style={{ fontSize: 13, color: '#64748B' }}>
                                {Array.isArray(addon.name) ? addon.name[lang ? 1 : 0] : addon.id} {addon.quantity > 1 ? `(${addon.quantity})` : ''}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                              {addon.amount != null ? `${addon.amount} Tk` : (lang ? 'অনুরোধ সাপেক্ষে' : 'On Request')}
                            </Text>
                          </View>
                        {(addon.id === 'visa' || addon.id === 'visa_on_arrival') && (
                          <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4, borderWidth: 1, borderColor: '#FDE68A' }}>
                            <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '700' }}>
                              💵 {lang ? 'সরকারি ভিসা ফি: $50 USD/জন বিমানবন্দরে সরাসরি প্রদেয়' : 'Govt Visa Fee: $50 USD/pax payable directly at airport'}
                            </Text>
                            <Text style={{ fontSize: 10.5, color: '#15803D', fontWeight: '700', marginTop: 1 }}>
                              ✓ {lang ? '৪টি আবশ্যক ডকুমেন্ট সংযুক্ত' : '4 Mandatory Documents Attached'}
                            </Text>
                          </View>
                        )}
                        </View>
                      );
                    })}
                  </View>

                  <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 }} />

                  {/* Price Breakdown with Discount if applied */}
                  {wiz?.discount?.amount ? (
                    <>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <Text style={{ fontSize: 13, color: '#64748B' }}>
                          {lang ? 'পূর্বমূল্য' : 'Original Subtotal'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#64748B', textDecorationLine: 'line-through' }}>
                          {totalAmount + Number(wiz.discount.amount)} Tk
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ fontSize: 13, color: '#059669', fontWeight: '700' }}>
                          {lang ? 'প্রোমো ডিসকাউন্ট' : 'Promo Discount'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#059669', fontWeight: '800' }}>
                          - {wiz.discount.amount} Tk
                        </Text>
                      </View>
                    </>
                  ) : null}

                  {/* Total Payable */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                      {lang ? 'মোট প্রদেয়' : 'Total payable'}
                    </Text>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#0284C7' }}>
                      {totalAmount} Tk
                    </Text>
                  </View>

                  {/* Earn Points Gold Banner */}
                  <View
                    style={{
                      backgroundColor: '#FFFBEB',
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <StarCoinIcon size={26} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
                        {lang ? `অর্জন করুন ${pointsEarned} পয়েন্ট` : `Earn ${pointsEarned} points`}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#B45309', marginTop: 1 }}>
                        {lang ? 'সেবা সম্পন্ন হওয়ার পর যোগ হবে।' : 'Added after your service is completed.'}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
                    🏷 {step === 1 ? (lang ? 'নমুনা বুকিং' : 'Sample booking') : (lang ? 'নমুনা মূল্য ও পয়েন্ট' : 'Sample prices and points')}
                  </Text>
                </View>
              ) : (
                /* Step 3: What happens next? Card */
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 18,
                    padding: 22,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.04,
                    shadowRadius: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Text style={{ fontSize: 18 }}>📋</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                      {lang ? 'পরবর্তী ধাপসমূহ' : 'What happens next?'}
                    </Text>
                  </View>

                  <View style={{ gap: 12, marginBottom: 18 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: '#E0F2FE',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 1,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7' }}>1</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: '#334155', flex: 1, lineHeight: 18 }}>
                        {lang
                          ? 'আপনার বুকিংয়ের তথ্যে মিট অ্যান্ড গ্রিট সংক্রান্ত নির্দেশনা দেখুন।'
                          : 'View meeting instructions in your booking details.'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: '#E0F2FE',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 1,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7' }}>2</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: '#334155', flex: 1, lineHeight: 18 }}>
                        {lang
                          ? 'সহকারী কর্মকর্তা নির্ধারিত হলে তার নাম ও ফোন নম্বর দেখতে পাবেন।'
                          : 'Officer details appear once assigned.'}
                      </Text>
                    </View>
                  </View>

                  {/* Contact Support Link Box */}
                  <TouchableOpacity
                    onPress={() => setShowSupportModal(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: '#BAE6FD',
                      backgroundColor: '#F0F9FF',
                      marginBottom: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <HeadphonesIcon size={18} color="#0284C7" />
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0369A1' }}>
                        {lang ? 'সাপোর্টের সাথে যোগাযোগ' : 'Contact support'}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#0284C7" />
                  </TouchableOpacity>

                  {/* 50 points pending banner */}
                  <View
                    style={{
                      backgroundColor: '#FFFBEB',
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <StarCoinIcon size={26} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
                        {lang ? `${pointsEarned} পয়েন্ট পেন্ডিং` : `${pointsEarned} points pending`}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#B45309', marginTop: 1 }}>
                        {lang ? 'সেবা সম্পন্ন হওয়ার পর যোগ হবে।' : 'Added to your account after service completion.'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Support Card (Step 1 & 2) */}
              {step < 3 && (
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 18,
                    padding: 18,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <HeadphonesIcon size={20} color="#0284C7" />
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#1E293B' }}>
                      {step === 1
                        ? lang
                          ? 'আমরা আপনাকে সাহায্য করতে প্রস্তুত'
                          : "We're here to help."
                        : lang
                        ? 'সাহায্য প্রয়োজন?'
                        : 'Need help?'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setShowSupportModal(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: '#CBD5E1',
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    <HeadphonesIcon size={14} color="#0F172A" />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                      {lang ? 'সাপোর্ট' : 'Contact support'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Step 3 Action Buttons Below Columns */}
          {step === 3 && (
            <View style={{ width: '100%', maxWidth: 1080, marginTop: 24, alignItems: 'center' }}>
              {/* Row 1: Primary Service & Document Actions */}
              <View style={{ flexDirection: 'row', gap: 14, width: '100%', marginBottom: 14 }}>
                {/* 1. Live Track Officer */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowLiveTracking(true)}
                  style={{
                    flex: 1,
                    backgroundColor: '#059669',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    shadowColor: '#059669',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>📍</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                    {lang ? 'প্রোটোকল অফিসার ট্র্যাক করুন' : 'Live Track Officer'}
                  </Text>
                </TouchableOpacity>

                {/* 2. View & Download Invoice */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowInvoiceModal(true)}
                  style={{
                    flex: 1,
                    backgroundColor: '#0F172A',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🧾</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                    {lang ? 'ভাউচার দেখুন ও ডাউনলোড' : 'View & Download Invoice'}
                  </Text>
                </TouchableOpacity>

                {/* 2.1. View & Download VIP Greeter Placard */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowPlacardModal(true)}
                  style={{
                    flex: 1,
                    backgroundColor: '#064E3B',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    borderWidth: 1.5,
                    borderColor: '#F59E0B',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🏷️</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                    {lang ? 'ভিআইপি প্লেকার্ড দেখুন' : 'View VIP Placard'}
                  </Text>
                </TouchableOpacity>

                {/* 3. Share on WhatsApp */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleShareWhatsApp}
                  style={{
                    flex: 1,
                    backgroundColor: '#25D366',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>💬</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                    {lang ? 'হোয়াটসঅ্যাপে শেয়ার' : 'Share on WhatsApp'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Row 2: Calendar Reminder & Booking Navigation */}
              <View style={{ flexDirection: 'row', gap: 14, width: '100%', marginBottom: 12 }}>
                {/* 4. Calendar Reminder Sync */}
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setShowCalendarOptions(!showCalendarOptions)}
                    style={{
                      width: '100%',
                      backgroundColor: '#FEF3C7',
                      borderWidth: 1.5,
                      borderColor: '#FDE68A',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>📅</Text>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#92400E' }}>
                      {lang ? 'ক্যালেন্ডার ও মিটিং রিমাইন্ডার ▾' : 'Add to Calendar / Wallet ▾'}
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
                        marginTop: 8,
                        gap: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#854D0E', fontWeight: '700' }}>
                        ⏱️ {lang ? 'সাক্ষাতের নির্ধারিত সময়:' : 'Scheduled meeting time:'} {calendarData.meetingTimeStr}
                      </Text>

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={handleOpenGoogleCalendar}
                          style={{
                            flex: 1,
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            paddingVertical: 8,
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E293B' }}>
                            Google Calendar
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleDownloadIcsFile}
                          style={{
                            flex: 1,
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            paddingVertical: 8,
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E293B' }}>
                            Apple / iCal (.ics)
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {calendarSaved && (
                    <Text style={{ color: '#059669', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
                      ✓ {lang ? 'ক্যালেন্ডার রিমাইন্ডার সফলভাবে সেট হয়েছে!' : 'Calendar reminder set successfully!'}
                    </Text>
                  )}
                </View>

                {/* 5. View my bookings */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setWiz(null);
                    setTab('bookings');
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#0284C7',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    shadowColor: '#0284C7',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#FFFFFF' }}>📋</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                    {lang ? 'আমার বুকিং সমূহ দেখুন →' : 'View My Bookings →'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Back to Home Link */}
              <TouchableOpacity
                onPress={() => {
                  if (handleBack) {
                    handleBack();
                  } else {
                    setWiz(null);
                    setTab('home');
                  }
                }}
                style={{ marginTop: 14 }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0284C7' }}>
                  {lang ? '← হোম পেজে ফিরে যান' : '← Back to Home'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 5. Desktop Dark Navy Footer */}
        <DesktopFooter
          lang={lang}
          setLang={setLang}
          setTab={setTab}
          setWiz={setWiz}
        />
      </ScrollView>

      {/* Support Helpline Modal */}
      <Modal visible={showSupportModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, maxWidth: 440, width: '100%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'কাস্টমার সাপোর্ট হেল্পলাইন' : 'Customer Support Helpline'}
              </Text>
              <TouchableOpacity onPress={() => setShowSupportModal(false)}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13.5, color: '#475569', marginBottom: 16 }}>
              {lang
                ? 'বিমানবন্দরের মিট অ্যান্ড গ্রিট সংক্রান্ত যেকোনো জরুরি তথ্যের জন্য যোগাযোগ করুন:'
                : 'Contact our dedicated airport concierge team for any assistance:'}
            </Text>

            <View style={{ gap: 10 }}>
              <View style={{ padding: 12, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>{lang ? 'হটলাইন' : 'Hotline'}</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0284C7' }}>+880 1712 345678</Text>
              </View>
              <View style={{ padding: 12, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>{lang ? 'ইমেইল' : 'Email'}</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>support@flightcare.com</Text>
              </View>
              <View style={{ padding: 12, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>{lang ? 'এয়ারপোর্ট ডেস্ক' : 'Airport Desk'}</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#334155' }}>
                  {lang ? 'টার্মিনাল ১, লেভেল ২ (আগমন এলাকা)' : 'Terminal 1, Level 2 (Arrivals Area)'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Special Assistance Modal */}
      <Modal visible={showSpecialModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22, maxWidth: 420, width: '100%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'বিশেষ সহায়তা বেছে নিন' : 'Select Special Assistance'}
              </Text>
              <TouchableOpacity onPress={() => setShowSpecialModal(false)}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {assistanceOptions.map(opt => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => {
                  setSpecialAssistance(opt.key);
                  setShowSpecialModal(false);
                }}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: specialAssistance === opt.key ? '#F0F9FF' : '#F8FAFC',
                  borderWidth: 1,
                  borderColor: specialAssistance === opt.key ? '#0284C7' : '#E2E8F0',
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: specialAssistance === opt.key ? '700' : '500',
                    color: specialAssistance === opt.key ? '#0284C7' : '#0F172A',
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Terms & Cancellation Policy Modal */}
      <CancellationPolicyModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        lang={lang}
        onPressHelp={() => {
          if (setWiz) setWiz(null);
          if (setTab) setTab('help');
        }}
      />

      {/* Website Full Compliance Modal (Terms, Privacy, Refund 7-10 Days, About Us, Contact) */}
      <WebsiteComplianceModal
        visible={!!complianceModalTab}
        initialTab={complianceModalTab || 'terms'}
        onClose={() => setComplianceModalTab(null)}
        lang={lang}
      />

      {/* World Country Code Selection Modal */}
      <CountryCodeModal
        visible={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        selectedCode={countryTarget === 'passenger' ? passengerCountryCode : bookerCountryCode}
        onSelect={country => {
          const dialCode = country.dial || country.dial_code || '+880';
          if (countryTarget === 'passenger') {
            setPassengerCountryCode(dialCode);
            if (setWiz) setWiz(c => ({ ...c, passengerCountryCode: dialCode }));
          } else {
            setBookerCountryCode(dialCode);
            if (setWiz) {
              setWiz(c => {
                const rawDigits = extractLocalPhoneDigits(c.phone, c.leadCountryCode || '+880');
                return {
                  ...c,
                  leadCountryCode: dialCode,
                  phone: rawDigits ? `${dialCode} ${rawDigits}` : '',
                };
              });
            }
          }
          setShowCountryModal(false);
        }}
        lang={lang}
      />

      {/* Interactive Date Picker Modal */}
      <DatePickerModal
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        onSelectDate={d => {
          setWiz(c => ({ ...c, date: d }));
          setShowDateModal(false);
          if (errors.serviceDate) setErrors(e => ({ ...e, serviceDate: null }));
        }}
        selectedDate={wiz.date}
        lang={lang}
      />

      {/* Passport Scan / OCR Modal */}
      <PassportOcrModal
        visible={showPassportOcr}
        onClose={() => setShowPassportOcr(false)}
        lang={lang}
        onScanComplete={data => {
          if (ocrTarget === 'lead') {
            setPassengerName(data.name);
            setWiz(c => ({
              ...c,
              ...(bookingForSomeoneElse
                ? { passengerName: data.name, passportNumber: data.passportNumber, nationality: data.nationality }
                : { name: data.name, passengerName: data.name, passportNumber: data.passportNumber, nationality: data.nationality }),
            }));
            if (errors.passengerName) setErrors(e => ({ ...e, passengerName: null }));
          } else {
            const idx = typeof ocrTarget === 'number' ? ocrTarget : parseInt(String(ocrTarget).replace('copax_', ''), 10);
            if (!isNaN(idx)) {
              const updated = [...(wiz.coPassengers || [])];
              while (updated.length <= idx) {
                updated.push({ name: '', passportNumber: '', nationality: '', notes: '' });
              }
              updated[idx] = {
                ...updated[idx],
                name: data.name,
                passportNumber: data.passportNumber,
                nationality: data.nationality,
              };
              setWiz(c => ({ ...c, coPassengers: updated }));
              if (errors[`coPassenger_${idx}_name`]) {
                setErrors(e => ({ ...e, [`coPassenger_${idx}_name`]: null }));
              }
            }
          }
        }}
      />

      {/* Official Printable & Downloadable Invoice Modal */}
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

      {/* Payment After Service SMS OTP Verification Modal */}
      <BookingOtpModal
        visible={showBookingOtpModal}
        onClose={() => {
          setShowBookingOtpModal(false);
          setPendingPostServiceData(null);
        }}
        onVerified={handleBookingOtpVerified}
        bookingData={pendingPostServiceData}
        lang={lang}
      />
    </View>
  );
}

