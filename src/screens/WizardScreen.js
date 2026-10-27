import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import DesktopWizardScreen from '../components/DesktopWizardScreen';
import CountryCodeModal from '../components/CountryCodeModal';
import CancellationPolicyModal from '../components/CancellationPolicyModal';
import WebsiteComplianceModal from '../components/WebsiteComplianceModal';
import DatePickerModal from '../components/DatePickerModal';
import BookingOtpModal from '../components/BookingOtpModal';
import {
  isValidPassengerName,
  isValidMobileNumber,
  isValidEmailAddress,
  isValidFlightNumber,
  isValidFlightDate,
  validateVisaOnArrivalDocs,
  calculateBookingPricing,
  sanitizePhoneNumber,
  extractLocalPhoneDigits,
} from '../utils/helpers';
import { isPastFlightDate } from '../services/flightService';
import WizardStep1Details from './wizard/WizardStep1Details';
import WizardStep2Payment from './wizard/WizardStep2Payment';
import WizardStep3Confirmation from './wizard/WizardStep3Confirmation';

export default function WizardScreen({
  wiz,
  setWiz,
  pagePadding,
  lang = 0,
  setLang,
  customerSession,
  t,
  responsive,
  handleBack,
  advanceBooking,
  confirm,
  setTab,
  addonCatalog,
  pricingConfig,
  startBkashPayment,
  startCardPayment,
  startSslCommerzPayment,
}) {
  if (!wiz) return null;

  if (responsive?.isWide) {
    return (
      <DesktopWizardScreen
        wiz={wiz}
        setWiz={setWiz}
        lang={lang}
        setLang={setLang}
        customerSession={customerSession}
        setTab={setTab}
        confirm={confirm}
        advanceBooking={advanceBooking}
        addonCatalog={addonCatalog}
        pricingConfig={pricingConfig}
        startBkashPayment={startBkashPayment}
        startCardPayment={startCardPayment}
        startSslCommerzPayment={startSslCommerzPayment}
        handleBack={handleBack}
      />
    );
  }

  const [paymentMethod, setPaymentMethod] = useState(
    wiz.method === 'pay_after_service'
      ? 'pay_after_service'
      : 'sslcommerz'
  ); // 'sslcommerz' | 'pay_after_service'
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [agreedPolicy, setAgreedPolicy] = useState(false);
  const [complianceModalTab, setComplianceModalTab] = useState(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countryTarget, setCountryTarget] = useState('passenger'); // 'passenger' | 'lead'
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBookingOtpModal, setShowBookingOtpModal] = useState(false);
  const [pendingPostServiceData, setPendingPostServiceData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isPaying, setIsPaying] = useState(false);
  const lastPayClickRef = useRef(0);

  const isDep = wiz.dir === 'dep';
  const pricingData = calculateBookingPricing(wiz, addonCatalog, pricingConfig);
  const totalAmount = pricingData.total != null ? pricingData.total : pricingData.finalTotal;

  const handleContinueToPayment = () => {
    const newErrors = {};

    if (wiz.bookingForSomeoneElse) {
      // 1. Passenger Name
      const passName = (wiz.passengerName || '').trim();
      if (!passName) {
        newErrors.passengerName = lang
          ? 'অনুগ্রহ করে ট্রাভেল ডকুমেন্ট অনুযায়ী যাত্রীর পুরো নাম লিখুন।'
          : 'Please enter passenger full name as shown on travel document.';
      } else if (!isValidPassengerName(passName)) {
        newErrors.passengerName = lang
          ? 'সঠিক নাম লিখুন (কমপক্ষে ২ অক্ষর হতে হবে)।'
          : 'Please enter a valid name (at least 2 letters).';
      }

      // 2. Passenger Phone (if hasPhone !== false)
      if (wiz.hasPhone !== false) {
        const passPhoneRaw = extractLocalPhoneDigits(wiz.passengerPhone, wiz.passengerCountryCode || '+880');
        if (!passPhoneRaw) {
          newErrors.passengerPhone = lang
            ? 'অনুগ্রহ করে যাত্রীর মোবাইল নম্বর লিখুন।'
            : 'Please enter passenger mobile number.';
        } else if (!isValidMobileNumber(passPhoneRaw, wiz.passengerCountryCode || '+880')) {
          newErrors.passengerPhone = lang
            ? 'সঠিক মোবাইল নম্বর লিখুন (৭-১৫ ডিজিট)।'
            : 'Please enter a valid mobile number (7-15 digits).';
        }
      }

      // 3. Booker Name
      const bName = (wiz.name || '').trim();
      if (!bName) {
        newErrors.bookerName = lang
          ? 'বুকিং যোগাযোগের জন্য আপনার পুরো নাম লিখুন।'
          : 'Please enter your full name for booking contact.';
      } else if (!isValidPassengerName(bName)) {
        newErrors.bookerName = lang
          ? 'সঠিক নাম লিখুন (কমপক্ষে ২ অক্ষর হতে হবে)।'
          : 'Please enter a valid name (at least 2 letters).';
      }

      // 4. Booker Phone
      const bPhoneRaw = extractLocalPhoneDigits(wiz.phone, wiz.leadCountryCode || '+880');
      if (!bPhoneRaw) {
        newErrors.bookerPhone = lang
          ? 'আপনার মোবাইল নম্বর লিখুন।'
          : 'Please enter your mobile number.';
      } else if (!isValidMobileNumber(bPhoneRaw, wiz.leadCountryCode || '+880')) {
        newErrors.bookerPhone = lang
          ? 'সঠিক মোবাইল নম্বর লিখুন (৭-১৫ ডিজিট)।'
          : 'Please enter a valid mobile number (7-15 digits).';
      }

      // 5. Booker Email (optional)
      if (wiz.email && wiz.email.trim() && !isValidEmailAddress(wiz.email.trim())) {
        newErrors.bookerEmail = lang
          ? 'সঠিক ইমেইল ঠিকানা লিখুন (যেমন: name@example.com)।'
          : 'Please enter a valid email address (e.g. name@example.com).';
      }

      // 6. Permission Confirmed
      if (wiz.permissionConfirmed === false) {
        newErrors.permissionConfirmed = lang
          ? 'যাত্রীর তথ্য শেয়ারের অনুমতি নিশ্চিত করুন।'
          : 'Please confirm permission to share passenger details.';
      }
    } else {
      // Standard lead passenger flow
      // 1. Lead Passenger Name
      const leadName = (wiz.name || '').trim();
      if (!leadName) {
        newErrors.leadName = lang
          ? 'অনুগ্রহ করে আপনার পুরো নাম লিখুন।'
          : 'Please enter your full name.';
      } else if (!isValidPassengerName(leadName)) {
        newErrors.leadName = lang
          ? 'সঠিক নাম লিখুন (কমপক্ষে ২ অক্ষর হতে হবে)।'
          : 'Please enter a valid name (at least 2 letters).';
      }

      // 2. Lead Mobile Number
      const leadPhoneRaw = extractLocalPhoneDigits(wiz.phone, wiz.leadCountryCode || '+880');
      if (!leadPhoneRaw) {
        newErrors.leadPhone = lang
          ? 'অনুগ্রহ করে মোবাইল নম্বর লিখুন।'
          : 'Please enter mobile number.';
      } else if (!isValidMobileNumber(leadPhoneRaw, wiz.leadCountryCode || '+880')) {
        newErrors.leadPhone = lang
          ? 'সঠিক মোবাইল নম্বর লিখুন (৭-১৫ ডিজিট)।'
          : 'Please enter a valid mobile number (7-15 digits).';
      }

      // 3. Lead Email (optional)
      if (wiz.email && wiz.email.trim() && !isValidEmailAddress(wiz.email.trim())) {
        newErrors.leadEmail = lang
          ? 'সঠিক ইমেইল ঠিকানা লিখুন (যেমন: name@example.com)।'
          : 'Please enter a valid email address (e.g. name@example.com).';
      }
    }

    // Visa On Arrival Mandatory Documents Validation
    if ((wiz.addons || []).includes('visa') || (wiz.addons || []).includes('visa_on_arrival')) {
      const { isValid, missing } = validateVisaOnArrivalDocs(wiz.addonDetails);
      if (!isValid) {
        newErrors.visaDocuments = lang
          ? `অন-অ্যারাইভাল ভিসা সুবিধার জন্য ৪টি আবশ্যক ডকুমেন্ট সংযুক্ত করা বাধ্যতামূলক:\n\n• ${missing.map(m => m.labelBn).join('\n• ')}\n\nঅনুগ্রহ করে সবকটি ডকুমেন্ট আপলোড করে সম্পন্ন করুন।`
          : `All 4 mandatory documents are required for Visa On Arrival:\n\n• ${missing.map(m => m.labelEn).join('\n• ')}\n\nPlease attach all required documents to proceed.`;
      }
    }

    // Terms agreement
    if (!agreedPolicy) {
      newErrors.agreedPolicy = lang
        ? 'এগিয়ে যেতে শর্তাবলী ও বাতিলের নীতিমালায় সম্মতি দিন।'
        : 'Please agree to Terms & Conditions and Cancellation Policy.';
    }

    // Flight Number format validation (Strictly mandatory)
    if (!wiz.fno || !wiz.fno.trim()) {
      newErrors.flightNumber = lang
        ? 'অনুগ্রহ করে ফ্লাইট নম্বর দিন (যেমন: BG-084, EK-582)'
        : 'Please enter flight number (e.g. BG-084, EK-582)';
    } else if (!isValidFlightNumber(wiz.fno.trim())) {
      newErrors.flightNumber = lang
        ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
        : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)';
    }

    // Service Date format validation (Strictly mandatory & cannot be past)
    if (!wiz.date || !wiz.date.trim()) {
      newErrors.serviceDate = lang
        ? 'অনুগ্রহ করে সেবার তারিখ নির্বাচন করুন'
        : 'Please select service date';
    } else if (!isValidFlightDate(wiz.date.trim())) {
      newErrors.serviceDate = lang
        ? 'সঠিক তারিখ দিন (DD-MM-YYYY)'
        : 'Enter a valid date (DD-MM-YYYY)';
    } else if (isPastFlightDate(wiz.date.trim())) {
      newErrors.serviceDate = lang
        ? 'অতীতের কোনো তারিখ নির্বাচন করা যাবে না'
        : 'Cannot select a past date';
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
    setWiz(current => ({ ...current, step: 2 }));
  };

  const handlePayNow = async () => {
    const now = Date.now();
    if (now - lastPayClickRef.current < 1500 || isPaying) return;
    lastPayClickRef.current = now;
    setIsPaying(true);

    const bookingCode = `FC-${Math.floor(10000 + Math.random() * 90000)}`;
    setConfirmedBookingId(bookingCode);

    const leadPhone = (wiz.phone || '').trim();
    const passengerPhone = (wiz.passengerPhone || '').trim();
    const phoneToUse = passengerPhone || leadPhone || '01712345678';
    const bookingData = {
      id: bookingCode,
      amount: totalAmount,
      passengerName: wiz.bookingForSomeoneElse ? (wiz.passengerName || 'Passenger') : (wiz.name || 'Passenger'),
      phone: phoneToUse,
      passengerPhone: phoneToUse,
      passengerEmail: wiz.email,
      email: wiz.email,
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
        id: bookingCode,
        paidMethod: 'pay_after_service',
        method: 'pay_after_service',
        paymentStatus: 'pay_after_service',
        trxId: `PAS-${bookingCode}`,
      };

      // Payment After Service requires OTP verification first before confirming booking!
      setPendingPostServiceData(postServiceResult);
      setShowBookingOtpModal(true);
      return;
    } else if (paymentMethod === 'sslcommerz' && typeof startSslCommerzPayment === 'function') {
      startSslCommerzPayment(bookingData, async (paymentResult) => {
        setIsPaying(false);
        const sslBookingResult = {
          ...bookingData,
          ...paymentResult,
          id: bookingCode,
          paidMethod: 'sslcommerz',
          paymentStatus: 'paid',
          trxId: paymentResult.trxId,
        };
        if (confirm) {
          await confirm(sslBookingResult);
        }
        setWiz(current => ({
          ...current,
          ...sslBookingResult,
          step: 3,
          confirmedId: bookingCode,
          trxId: paymentResult.trxId,
          paidMethod: 'sslcommerz',
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
          id: bookingCode,
          paidMethod: paymentMethod,
          paymentStatus: paymentResult.status || 'paid',
          trxId: paymentResult.trxId,
        };
        if (confirm) {
          await confirm(cardBookingResult);
        }
        setWiz(current => ({
          ...current,
          ...cardBookingResult,
          step: 3,
          confirmedId: bookingCode,
          trxId: paymentResult.trxId,
          paidMethod: paymentMethod,
        }));
      });
      setTimeout(() => setIsPaying(false), 2000);
    } else if (typeof startBkashPayment === 'function') {
      startBkashPayment(bookingData, async (paymentResult) => {
        setIsPaying(false);
        const bkashBookingResult = {
          ...bookingData,
          ...paymentResult,
          id: bookingCode,
          paidMethod: 'banglaqr',
          paymentStatus: 'paid',
          trxId: paymentResult.trxId,
        };
        if (confirm) {
          await confirm(bkashBookingResult);
        }
        setWiz(current => ({
          ...current,
          ...bkashBookingResult,
          step: 3,
          confirmedId: bookingCode,
          trxId: paymentResult.trxId,
          paidMethod: 'banglaqr',
        }));
      });
      setTimeout(() => setIsPaying(false), 2000);
    } else {
      if (confirm) {
        await confirm({
          ...bookingData,
          id: bookingCode,
          paidMethod: paymentMethod,
          method: paymentMethod,
          paymentStatus: 'paid',
        });
      }
      setIsPaying(false);
      setWiz(current => ({ ...current, ...bookingData, step: 3, confirmedId: bookingCode, paidMethod: paymentMethod }));
    }
  };

  const handleBookingOtpVerified = async (verifyResult) => {
    if (!pendingPostServiceData) return;
    const finalBooking = {
      ...pendingPostServiceData,
      phone_verified: true,
      otpVerifiedAt: verifyResult?.verifiedAt || new Date().toISOString(),
    };
    if (confirm) {
      await confirm(finalBooking);
    }
    setWiz(current => ({
      ...current,
      ...finalBooking,
      step: 3,
      confirmedId: finalBooking.id,
      trxId: finalBooking.trxId,
      paidMethod: 'pay_after_service',
      paymentStatus: 'pay_after_service',
    }));
    setShowBookingOtpModal(false);
    setPendingPostServiceData(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Header */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (wiz.step === 1) {
              if (handleBack) handleBack();
              else {
                setWiz(null);
                if (setTab) setTab('home');
              }
            } else if (wiz.step === 2) {
              setWiz(c => ({ ...c, step: 1 }));
            } else {
              if (handleBack) handleBack();
              else {
                setWiz(null);
                if (setTab) setTab('home');
              }
            }
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#F1F5F9',
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#CBD5E1',
          }}
        >
          <Text style={{ fontSize: 16, color: '#0284C7', fontWeight: '900' }}>←</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
            {lang ? 'পেছনে' : 'Back'}
          </Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
            {wiz.step === 1
              ? (lang ? 'বুকিং তথ্য' : 'Booking details')
              : wiz.step === 2
              ? (lang ? 'পেমেন্ট' : 'Payment')
              : (lang ? 'নিশ্চিতকরণ' : 'Confirmed')}
          </Text>
          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
            Flight Care • <Text style={{ color: '#D97706', fontWeight: '700' }}>Fly VIP</Text>
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (setTab) setTab('home');
            setWiz(null);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#F1F5F9',
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#CBD5E1',
          }}
        >
          <Text style={{ fontSize: 13 }}>🏠</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
            {lang ? 'হোম' : 'Home'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stepper Progress Bar */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderBottomWidth: 1,
          borderBottomColor: '#F1F5F9',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Step 1: Details */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: wiz.step >= 1 ? '#0284C7' : '#CBD5E1',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {wiz.step > 1 ? (
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>✓</Text>
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>1</Text>
            )}
          </View>
          <Text
            style={{
              fontSize: 11,
              marginTop: 4,
              color: wiz.step === 1 ? '#0284C7' : wiz.step > 1 ? '#0284C7' : '#64748B',
              fontWeight: wiz.step === 1 ? '700' : '500',
            }}
          >
            {lang ? 'তথ্য' : 'Details'}
          </Text>
        </View>

        {/* Line 1 */}
        <View
          style={{
            flex: 1,
            height: 2,
            backgroundColor: wiz.step >= 2 ? '#0284C7' : '#E2E8F0',
            marginHorizontal: 8,
            marginBottom: 16,
          }}
        />

        {/* Step 2: Payment */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor:
                wiz.step === 2 ? '#0284C7' : wiz.step > 2 ? '#0284C7' : '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {wiz.step > 2 ? (
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>✓</Text>
            ) : (
              <Text
                style={{
                  color: wiz.step === 2 ? '#FFFFFF' : '#64748B',
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                2
              </Text>
            )}
          </View>
          <Text
            style={{
              fontSize: 11,
              marginTop: 4,
              color: wiz.step === 2 ? '#0284C7' : '#64748B',
              fontWeight: wiz.step === 2 ? '700' : '500',
            }}
          >
            {lang ? 'পেমেন্ট' : 'Payment'}
          </Text>
        </View>

        {/* Line 2 */}
        <View
          style={{
            flex: 1,
            height: 2,
            backgroundColor: wiz.step >= 3 ? '#0284C7' : '#E2E8F0',
            marginHorizontal: 8,
            marginBottom: 16,
          }}
        />

        {/* Step 3: Confirmed */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: wiz.step === 3 ? '#0284C7' : '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: wiz.step === 3 ? '#FFFFFF' : '#64748B',
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              3
            </Text>
          </View>
          <Text
            style={{
              fontSize: 11,
              marginTop: 4,
              color: wiz.step === 3 ? '#0284C7' : '#64748B',
              fontWeight: wiz.step === 3 ? '700' : '500',
            }}
          >
            {lang ? 'নিশ্চিতকরণ' : 'Confirmed'}
          </Text>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: responsive?.isPhone ? 16 : 24,
          paddingVertical: 16,
          alignItems: 'center',
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 460 }}>
          {/* STEP 1: DETAILS */}
          {wiz.step === 1 && (
            <WizardStep1Details
              wiz={wiz}
              setWiz={setWiz}
              lang={lang}
              isDep={isDep}
              errors={errors}
              setErrors={setErrors}
              pricingData={pricingData}
              totalAmount={totalAmount}
              agreedPolicy={agreedPolicy}
              setAgreedPolicy={setAgreedPolicy}
              setShowCancellationPolicy={setShowCancellationPolicy}
              setComplianceModalTab={setComplianceModalTab}
              setShowCountryModal={setShowCountryModal}
              setCountryTarget={setCountryTarget}
              setShowDateModal={setShowDateModal}
              handleContinueToPayment={handleContinueToPayment}
            />
          )}

          {/* STEP 2: PAYMENT */}
          {wiz.step === 2 && (
            <WizardStep2Payment
              wiz={wiz}
              setWiz={setWiz}
              lang={lang}
              isDep={isDep}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              totalAmount={totalAmount}
              setTab={setTab}
              handlePayNow={handlePayNow}
              isPaying={isPaying}
              customerSession={customerSession}
            />
          )}

          {/* STEP 3: CONFIRMED */}
          {wiz.step === 3 && (
            <WizardStep3Confirmation
              wiz={wiz}
              setWiz={setWiz}
              lang={lang}
              confirmedBookingId={confirmedBookingId}
              totalAmount={totalAmount}
              setTab={setTab}
            />
          )}
        </View>
      </ScrollView>

      {/* Cancellation Policy Modal */}
      <CancellationPolicyModal
        visible={showCancellationPolicy}
        onClose={() => setShowCancellationPolicy(false)}
        lang={lang}
        onPressHelp={() => {
          setWiz(null);
          if (setTab) setTab('help');
        }}
      />

      {/* Website Full Compliance Modal */}
      <WebsiteComplianceModal
        visible={!!complianceModalTab}
        initialTab={complianceModalTab || 'terms'}
        onClose={() => setComplianceModalTab(null)}
        lang={lang}
      />

      {/* World Country Code Selection Modal */}
      <CountryCodeModal
        visible={showCountryModal}
        selectedCode={countryTarget === 'passenger' ? (wiz.passengerCountryCode || '+880') : (wiz.leadCountryCode || '+880')}
        onClose={() => setShowCountryModal(false)}
        onSelect={country => {
          const dialCode = country.dial || country.dial_code || country.dialCode || '+880';
          if (countryTarget === 'passenger') {
            const rawPassDigits = extractLocalPhoneDigits(wiz.passengerPhone, wiz.passengerCountryCode || '+880');
            setWiz(c => ({
              ...c,
              passengerCountryCode: dialCode,
              passengerPhone: rawPassDigits ? `${dialCode} ${rawPassDigits}` : '',
            }));
            if (errors.passengerPhone) {
              setErrors(e => ({ ...e, passengerPhone: null }));
            }
          } else {
            const currentRaw = extractLocalPhoneDigits(wiz.phone, wiz.leadCountryCode || '+880');
            setWiz(c => ({
              ...c,
              leadCountryCode: dialCode,
              phone: currentRaw ? `${dialCode} ${currentRaw}` : '',
            }));
            if (errors.leadPhone) {
              setErrors(e => ({ ...e, leadPhone: null }));
            }
            if (errors.bookerPhone) {
              setErrors(e => ({ ...e, bookerPhone: null }));
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
