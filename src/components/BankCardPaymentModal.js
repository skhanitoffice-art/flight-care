import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import {
  processBankCardPayment,
  processDirectBankTransferPayment,
  BANK_CARD_CONFIG,
  OFFICIAL_BANK_ACCOUNT,
} from '../services/paymentGateway';
import { CheckCircleIcon, CardLogoIcon } from './Icons';
import { validateLuhnCardNumber, isCardExpiryValid } from '../utils/helpers';

export default function BankCardPaymentModal({
  visible,
  onClose,
  onSuccess,
  booking,
  lang = 0,
  initialMode = 'bank_transfer',
}) {
  const isBn = Boolean(lang);
  const amount = Number(booking?.amount) || 0;
  const bookingId = booking?.id || 'FC-PENDING';
  const passengerName = booking?.passengerName || booking?.name || (isBn ? 'যাত্রী' : 'Passenger');
  const flightNumber = booking?.flight?.number || booking?.fno || '';

  // Modes: 'bank_transfer' (EBL Direct Transfer) | 'card' (Debit/Credit Card)
  const [activeMode, setActiveMode] = useState(initialMode || 'bank_transfer');

  // Steps: 1 = Details Input, 2 = 3D Secure Bank OTP, 3 = Payment Success Receipt
  const [step, setStep] = useState(1);

  // Bank Transfer Form State (Eastern Bank PLC)
  const [bankTrxId, setBankTrxId] = useState('');
  const [senderBank, setSenderBank] = useState('');
  const [copiedField, setCopiedField] = useState('');

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(passengerName !== 'যাত্রী' && passengerName !== 'Passenger' ? passengerName.toUpperCase() : '');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [cardBrand, setCardBrand] = useState('Visa');

  // OTP State
  const [otp, setOtp] = useState('123456');
  const [otpCountdown, setOtpCountdown] = useState(60);

  // Processing & Error State
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [receiptData, setReceiptData] = useState(null);
  const lastClickRef = useRef(0);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setActiveMode(initialMode || 'bank_transfer');
      setBankTrxId('');
      setSenderBank('');
      setCopiedField('');
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setOtp('123456');
      setOtpCountdown(60);
      setIsProcessing(false);
      setError('');
      setReceiptData(null);
      if (passengerName && passengerName !== 'যাত্রী' && passengerName !== 'Passenger') {
        setCardHolder(passengerName.toUpperCase());
      }
    }
  }, [visible, passengerName, initialMode]);

  // Countdown timer for OTP
  useEffect(() => {
    let timer = null;
    if (step === 2 && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, otpCountdown]);

  // Format Card Number (XXXX XXXX XXXX XXXX) and detect brand
  const handleCardNumberChange = (text) => {
    const raw = text.replace(/\D/g, '').slice(0, 16);
    if (raw.startsWith('4')) setCardBrand('Visa');
    else if (raw.startsWith('5')) setCardBrand('Mastercard');
    else if (raw.startsWith('34') || raw.startsWith('37')) setCardBrand('American Express');
    else setCardBrand('Bank Card');

    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
    if (error) setError('');
  };

  // Format Expiration Date (MM/YY) and clamp months 01-12
  const handleExpiryChange = (text) => {
    let raw = text.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      let mm = parseInt(raw.slice(0, 2), 10);
      if (mm > 12) mm = 12;
      if (mm === 0) mm = 1;
      const mmStr = String(mm).padStart(2, '0');
      setExpiry(`${mmStr}/${raw.slice(2, 4)}`);
    } else {
      setExpiry(raw);
    }
    if (error) setError('');
  };

  const rawCardDigits = cardNumber.replace(/\D/g, '');
  const isLuhnInvalid = rawCardDigits.length >= 15 && !validateLuhnCardNumber(rawCardDigits);
  const isExpiryExpired = expiry.length === 5 && !isCardExpiryValid(expiry);

  // Step 1: Validate and proceed to 3D Secure OTP with Debounce
  const handleProceedToOtp = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 1500 || isProcessing) return; // 1.5s Debounce
    lastClickRef.current = now;

    const rawCard = cardNumber.replace(/\s+/g, '');
    if (rawCard.length < 15) {
      setError(isBn ? 'সঠিক ১৬ ডিজিটের কার্ড নম্বর লিখুন।' : 'Please enter a valid 16-digit card number.');
      return;
    }
    if (!validateLuhnCardNumber(rawCard)) {
      setError(
        isBn
          ? 'কার্ড নম্বরটি সঠিক নয় (Luhn অ্যালগরিদম ব্যর্থ)। কার্ডের ডিজিটগুলো পুনরায় পরীক্ষা করুন।'
          : 'Invalid card number (Luhn checksum failed). Please verify the digits.'
      );
      return;
    }
    if (!cardHolder.trim()) {
      setError(isBn ? 'কার্ডধারীর পূর্ণ নাম লিখুন।' : 'Please enter cardholder full name.');
      return;
    }
    if (expiry.length < 5 || !isCardExpiryValid(expiry)) {
      setError(
        isBn
          ? 'কার্ডের মেয়াদ উত্তীর্ণ বা সঠিক নয় (MM/YY)।'
          : 'Card has expired or invalid expiry date (MM/YY).'
      );
      return;
    }
    if (cvv.length < 3) {
      setError(isBn ? '৩ ডিজিটের সিভিভি (CVV) কোড লিখুন।' : 'Please enter 3-digit CVV code.');
      return;
    }

    setError('');
    setStep(2); // Move to 3D Secure OTP screen
    setOtpCountdown(60);
  };

  // Step 2: Confirm OTP & Process Payment with Debounce
  const handleConfirmOtp = async () => {
    const now = Date.now();
    if (now - lastClickRef.current < 1500 || isProcessing) return; // 1.5s Debounce
    lastClickRef.current = now;

    if (!otp || otp.length < 4) {
      setError(isBn ? 'অনুগ্রহ করে সঠিক ওটিপি কোড লিখুন।' : 'Please enter valid OTP code.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const res = await processBankCardPayment({
        bookingId,
        amount,
        cardHolder,
        cardNumber,
        expiry,
        cvv,
        brand: cardBrand,
      });

      if (!res.ok) {
        setError(res.message || (isBn ? 'পেমেন্ট ব্যর্থ হয়েছে।' : 'Payment failed.'));
        setIsProcessing(false);
        return;
      }

      setReceiptData(res);
      setIsProcessing(false);
      setStep(3); // Go to Receipt
    } catch {
      setError(isBn ? 'ব্যাংক গেটওয়ে যোগাযোগে ত্রুটি ঘটেছে।' : 'Bank gateway connection failed.');
      setIsProcessing(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text, fieldName) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2000);
    }
  };

  // Step 1B: Confirm Direct Bank Transfer to Eastern Bank PLC
  const handleConfirmBankTransfer = async () => {
    const now = Date.now();
    if (now - lastClickRef.current < 1500 || isProcessing) return; // 1.5s Debounce
    lastClickRef.current = now;

    if (!bankTrxId.trim()) {
      setError(
        isBn
          ? 'অনুগ্রহ করে ব্যাংকের ট্রানজেকশন আইডি (TrxID) বা রেফারেন্স নম্বরটি লিখুন।'
          : 'Please enter Bank Transaction ID or Reference Number.'
      );
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const res = await processDirectBankTransferPayment({
        bookingId,
        amount,
        trxId: bankTrxId.trim(),
        senderBankName: senderBank.trim(),
        depositorName: passengerName,
      });

      if (!res.ok) {
        setError(res.message || (isBn ? 'পেমেন্ট সাবমিট ব্যর্থ হয়েছে।' : 'Payment submission failed.'));
        setIsProcessing(false);
        return;
      }

      setReceiptData({
        ...res,
        isBankTransfer: true,
      });
      setIsProcessing(false);
      setStep(3); // Go to Receipt
    } catch {
      setError(isBn ? 'সার্ভার যোগাযোগে ত্রুটি ঘটেছে।' : 'Server communication failed.');
      setIsProcessing(false);
    }
  };

  // Step 3: Complete Flow
  const handleFinalSuccess = () => {
    if (typeof onSuccess === 'function' && receiptData) {
      if (receiptData.isBankTransfer) {
        onSuccess({
          trxId: receiptData.trxId,
          paymentId: receiptData.paymentId,
          amount: receiptData.amount,
          method: 'bank_transfer',
          wallet: `Eastern Bank PLC (A/C: ${OFFICIAL_BANK_ACCOUNT.ACCOUNT_NUMBER})`,
          channel: `Direct Bank Transfer - ${OFFICIAL_BANK_ACCOUNT.BANK_NAME}`,
          bankName: OFFICIAL_BANK_ACCOUNT.BANK_NAME,
          accountNumber: OFFICIAL_BANK_ACCOUNT.ACCOUNT_NUMBER,
          accountName: OFFICIAL_BANK_ACCOUNT.ACCOUNT_NAME,
          routingNumber: OFFICIAL_BANK_ACCOUNT.ROUTING_NUMBER,
          status: 'pending_verification',
        });
      } else {
        onSuccess({
          trxId: receiptData.trxId,
          paymentId: `PAY-${receiptData.trxId}`,
          amount: receiptData.amount,
          method: 'card',
          wallet: `Bank Card (${receiptData.brand})`,
          channel: `Bank Card (${receiptData.brand} •••• ${receiptData.last4})`,
        });
      }
    }
    onClose();
  };

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
      window.print();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 14,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 500,
            maxHeight: '94%',
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            elevation: 10,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: '#0F2A4A',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 3,
              borderBottomColor: '#0284C7',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>💳</Text>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>
                      {isBn ? 'ব্যাংকের কার্ড পেমেন্ট' : 'Bank Card Payment'}
                    </Text>
                    <View style={{ backgroundColor: '#0284C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFFFFF' }}>
                        3D SECURE
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#93C5FD', fontWeight: '600', marginTop: 1 }}>
                    {isBn ? 'ভিসা, মাস্টারকার্ড ও অ্যামেক্স • নিরাপদ অনলাইন পেমেন্ট' : 'Visa, Mastercard & AMEX • 256-bit SSL'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Booking & Amount Strip */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginTop: 14,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.12)',
              }}
            >
              <View>
                <Text style={{ fontSize: 11, color: '#93C5FD', fontWeight: '600' }}>
                  {isBn ? 'বুকিং রেফারেন্স:' : 'Booking Ref:'} <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>#{bookingId}</Text>
                </Text>
                <Text style={{ fontSize: 12, color: '#E2E8F0', fontWeight: '600', marginTop: 2 }}>
                  {passengerName} {flightNumber ? `• ${flightNumber}` : ''}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: '#93C5FD', fontWeight: '600' }}>
                  {isBn ? 'পরিশোধের পরিমাণ' : 'Payable Amount'}
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#38BDF8' }}>
                  ৳ {amount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* Error Banner */}
          {Boolean(error) && (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderLeftWidth: 4,
                borderLeftColor: '#EF4444',
                padding: 12,
                marginHorizontal: 18,
                marginTop: 14,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '700' }}>⚠️ {error}</Text>
            </View>
          )}

          {/* Mode Switcher: 1 = Direct Bank Transfer (EBL), 2 = Debit/Credit Card */}
          {step === 1 && (
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#F1F5F9',
                padding: 6,
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
              }}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setActiveMode('bank_transfer'); setError(''); }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: activeMode === 'bank_transfer' ? '#0F2A4A' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>🏛️</Text>
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '800',
                    color: activeMode === 'bank_transfer' ? '#FFFFFF' : '#475569',
                  }}
                >
                  {isBn ? 'ইস্টার্ন ব্যাংক ডিপোজিট ও ট্রান্সফার' : 'Direct Bank Transfer (EBL)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setActiveMode('card'); setError(''); }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: activeMode === 'card' ? '#0F2A4A' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>💳</Text>
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '800',
                    color: activeMode === 'card' ? '#FFFFFF' : '#475569',
                  }}
                >
                  {isBn ? 'ভিসা ও মাস্টারকার্ড' : 'Visa & Mastercard'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 1: FORM */}
          {step === 1 && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18 }}>
              {activeMode === 'bank_transfer' ? (
                /* =================================================== */
                /* 1. DIRECT BANK TRANSFER TO EASTERN BANK PLC         */
                /* =================================================== */
                <View style={{ gap: 14 }}>
                  {/* Official Corporate Bank Account Card */}
                  <View
                    style={{
                      background: 'linear-gradient(135deg, #072B56 0%, #0F3A6E 50%, #0284C7 100%)',
                      backgroundColor: '#072B56',
                      borderRadius: 18,
                      padding: 18,
                      borderWidth: 1.5,
                      borderColor: '#38BDF8',
                      boxShadow: '0 8px 24px rgba(7, 43, 86, 0.25)',
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 22 }}>🏛️</Text>
                        <View>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 }}>
                            EASTERN BANK PLC (EBL)
                          </Text>
                          <Text style={{ fontSize: 11, color: '#BAE6FD', fontWeight: '700' }}>
                            {isBn ? 'কর্পোরেট কারেন্ট অ্যাকাউন্ট • গুলশান নর্থ শাখা' : 'Corporate Account • Gulshan North Branch'}
                          </Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#000000' }}>
                          OFFICIAL
                        </Text>
                      </View>
                    </View>

                    {/* Account Name */}
                    <View style={{ marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.08)', padding: 10, borderRadius: 10 }}>
                      <Text style={{ fontSize: 10, color: '#93C5FD', fontWeight: '700', textTransform: 'uppercase' }}>
                        {isBn ? 'অ্যাকাউন্টের নাম (Account Title / Name)' : 'Account Title / Name'}
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFFFFF', marginTop: 2, letterSpacing: 0.5 }}>
                        SAIFULLAH KHAN ENTERPRISE
                      </Text>
                    </View>

                    {/* Account Number with 1-Click Copy */}
                    <View style={{ marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.12)', padding: 10, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontSize: 10, color: '#93C5FD', fontWeight: '700', textTransform: 'uppercase' }}>
                          {isBn ? 'অ্যাকাউন্ট নম্বর (Account Number)' : 'Account Number'}
                        </Text>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#FCD34D', marginTop: 2, letterSpacing: 1 }}>
                          1271350001371
                        </Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleCopy('1271350001371', 'acc')}
                        style={{
                          backgroundColor: copiedField === 'acc' ? '#10B981' : 'rgba(255,255,255,0.2)',
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: copiedField === 'acc' ? '#34D399' : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                          {copiedField === 'acc' ? (isBn ? 'কপি হয়েছে ✓' : 'Copied! ✓') : (isBn ? '📋 কপি' : '📋 Copy')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Routing & SWIFT Row */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ fontSize: 9.5, color: '#93C5FD', fontWeight: '700' }}>
                            ROUTING NO
                          </Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '900', color: '#FFFFFF', marginTop: 1 }}>
                            095261904
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => handleCopy('095261904', 'route')}
                          style={{ padding: 4 }}
                        >
                          <Text style={{ color: '#BAE6FD', fontSize: 11, fontWeight: '800' }}>
                            {copiedField === 'route' ? '✓' : '📋'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ fontSize: 9.5, color: '#93C5FD', fontWeight: '700' }}>
                            SWIFT / BIC
                          </Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '900', color: '#FFFFFF', marginTop: 1 }}>
                            EBLDBDDH
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => handleCopy('EBLDBDDH', 'swift')}
                          style={{ padding: 4 }}
                        >
                          <Text style={{ color: '#BAE6FD', fontSize: 11, fontWeight: '800' }}>
                            {copiedField === 'swift' ? '✓' : '📋'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Transfer Instructions Box */}
                  <View
                    style={{
                      backgroundColor: '#F0F9FF',
                      borderLeftWidth: 4,
                      borderLeftColor: '#0284C7',
                      padding: 12,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0369A1', marginBottom: 4 }}>
                      💡 {isBn ? 'টাকা পাঠানোর নিয়ম:' : 'How to Transfer:'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#334155', lineHeight: 17 }}>
                      {isBn
                        ? '১. যেকোনো ব্যাংকের মোবাইল অ্যাপ (EBL Skybanking, Citytouch, BRAC Astha, সেলফিন ইত্যাদি), নেট ব্যাংকিং বা ব্রাঞ্চ থেকে উপরের অ্যাকাউন্টে টাকা পাঠিয়ে দিন।\n২. পেমেন্ট সম্পন্ন হলে প্রাপ্ত TrxID বা রেফারেন্স নম্বরটি নিচে লিখে নিশ্চিত করুন।'
                        : '1. Transfer amount via any Banking App (EBL Skybanking, Citytouch, Astha, CellFin etc.), Internet Banking, or Bank Branch.\n2. Enter the TrxID or deposit reference below and confirm.'}
                    </Text>
                  </View>

                  {/* TrxID Input */}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                      {isBn ? 'ট্রানজেকশন আইডি / রেফারেন্স নম্বর (TrxID / Ref No)*' : 'Transaction ID / Reference Number*'}
                    </Text>
                    <TextInput
                      value={bankTrxId}
                      onChangeText={t => {
                        setBankTrxId(t.toUpperCase());
                        if (error) setError('');
                      }}
                      placeholder={isBn ? 'যেমন: EBL9827419 বা ব্যাংক রেফারেন্স' : 'e.g. EBL9827419 or Ref Number'}
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        height: 46,
                        fontSize: 15,
                        fontWeight: '800',
                        color: '#0F172A',
                      }}
                    />
                  </View>

                  {/* Sender Bank / Depositor Input */}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                      {isBn ? 'প্রেরকের ব্যাংকের নাম বা মন্তব্য (Sender Bank / Depositor)' : 'Sender Bank / Depositor (Optional)'}
                    </Text>
                    <TextInput
                      value={senderBank}
                      onChangeText={setSenderBank}
                      placeholder={isBn ? 'যে ব্যাংক থেকে পাঠিয়েছেন (যেমন: EBL, City, Brac)' : 'e.g. EBL, City Bank, Brac Bank'}
                      placeholderTextColor="#94A3B8"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        height: 46,
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#0F172A',
                      }}
                    />
                  </View>

                  {/* Submit Bank Transfer Button */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleConfirmBankTransfer}
                    disabled={isProcessing}
                    style={{
                      backgroundColor: '#0F2A4A',
                      borderRadius: 12,
                      height: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 4,
                      boxShadow: '0 4px 14px rgba(15, 42, 74, 0.3)',
                      opacity: isProcessing ? 0.7 : 1,
                    }}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                        ✓ {isBn ? `৳ ${amount.toLocaleString('en-IN')} ব্যাংক পেমেন্ট নিশ্চিত করুন` : `Confirm Bank Payment ৳ ${amount.toLocaleString('en-IN')}`}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                /* =================================================== */
                /* 2. BANK CARDS (VISA / MASTERCARD / AMEX)            */
                /* =================================================== */
                <View>
                  {/* Virtual Card Preview */}
                  <View
                    style={{
                      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0369A1 100%)',
                      backgroundColor: '#0F172A',
                      borderRadius: 16,
                      padding: 18,
                      marginBottom: 18,
                      boxShadow: '0 8px 20px rgba(15, 23, 42, 0.25)',
                      borderWidth: 1,
                      borderColor: '#334155',
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#38BDF8', letterSpacing: 1 }}>
                        FLIGHT CARE AVIATION
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF' }}>
                        {cardBrand.toUpperCase()}
                      </Text>
                    </View>

                {/* EMV Chip Simulation */}
                <View
                  style={{
                    width: 36,
                    height: 28,
                    borderRadius: 6,
                    backgroundColor: '#F59E0B',
                    borderWidth: 1,
                    borderColor: '#D97706',
                    marginBottom: 16,
                  }}
                />

                <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 2, marginBottom: 16 }}>
                  {cardNumber || '•••• •••• •••• ••••'}
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <View>
                    <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>
                      Cardholder Name
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>
                      {cardHolder || 'CARDHOLDER NAME'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>
                      Expires
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>
                      {expiry || 'MM/YY'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Form Inputs */}
              <View style={{ gap: 14 }}>
                {/* Card Number */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                      {isBn ? 'কার্ড নম্বর' : 'Card Number'}
                    </Text>
                    {cardNumber.length > 0 && (
                      <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: cardBrand === 'Visa' ? '#1D4ED8' : cardBrand === 'Mastercard' ? '#EA580C' : '#0F172A' }}>
                          💳 {cardBrand}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TextInput
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={19}
                    style={{
                      backgroundColor: isLuhnInvalid ? '#FEF2F2' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: isLuhnInvalid ? '#EF4444' : rawCardDigits.length >= 15 && validateLuhnCardNumber(rawCardDigits) ? '#10B981' : '#CBD5E1',
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      height: 46,
                      fontSize: 15,
                      fontWeight: '800',
                      color: '#0F172A',
                      letterSpacing: 1,
                    }}
                  />
                  {isLuhnInvalid && (
                    <Text style={{ color: '#EF4444', fontSize: 11.5, marginTop: 4, fontWeight: '700' }}>
                      ⚠️ {isBn ? 'ভুল কার্ড নম্বর (Luhn অ্যালগরিদম ব্যর্থ)' : 'Invalid card number (Luhn checksum failed)'}
                    </Text>
                  )}
                  {rawCardDigits.length >= 15 && validateLuhnCardNumber(rawCardDigits) && (
                    <Text style={{ color: '#059669', fontSize: 11.5, marginTop: 4, fontWeight: '700' }}>
                      ✓ {isBn ? 'বৈধ কার্ড নম্বর' : 'Valid card number'}
                    </Text>
                  )}
                </View>

                {/* Cardholder Name */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                    {isBn ? 'কার্ডধারীর নাম' : 'Cardholder Name'}
                  </Text>
                  <TextInput
                    value={cardHolder}
                    onChangeText={t => setCardHolder(t.toUpperCase())}
                    placeholder={isBn ? 'যেমন: MAHMUDUL HASSAN' : 'e.g. MAHMUDUL HASSAN'}
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      height: 46,
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#0F172A',
                    }}
                  />
                </View>

                {/* Expiry & CVV Row */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                      {isBn ? 'মেয়াদ (MM/YY)' : 'Expiry (MM/YY)'}
                    </Text>
                    <TextInput
                      value={expiry}
                      onChangeText={handleExpiryChange}
                      placeholder="MM/YY"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      maxLength={5}
                      style={{
                        backgroundColor: isExpiryExpired ? '#FEF2F2' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: isExpiryExpired ? '#EF4444' : expiry.length === 5 && isCardExpiryValid(expiry) ? '#10B981' : '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        height: 46,
                        fontSize: 15,
                        fontWeight: '800',
                        color: '#0F172A',
                      }}
                    />
                    {isExpiryExpired && (
                      <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                        ⚠️ {isBn ? 'কার্ডের মেয়াদ উত্তীর্ণ' : 'Card has expired'}
                      </Text>
                    )}
                    {expiry.length === 5 && isCardExpiryValid(expiry) && (
                      <Text style={{ color: '#059669', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                        ✓ {isBn ? 'বৈধ মেয়াদ' : 'Valid expiry'}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                        {isBn ? 'সিভিভি (CVV)' : 'CVV / CVC'}
                      </Text>
                      <TouchableOpacity onPress={() => setShowCvv(!showCvv)}>
                        <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '700' }}>
                          {showCvv ? (isBn ? 'লুকান' : 'Hide') : (isBn ? 'দেখান' : 'Show')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      value={cvv}
                      onChangeText={t => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      secureTextEntry={!showCvv}
                      maxLength={4}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        height: 46,
                        fontSize: 15,
                        fontWeight: '800',
                        color: '#0F172A',
                      }}
                    />
                    <Text style={{ color: '#64748B', fontSize: 10.5, marginTop: 4 }}>
                      ℹ️ {isBn ? 'কার্ডের পেছনের ৩ ডিজিট' : '3 digits on back of card'}
                    </Text>
                  </View>
                </View>

                {/* 1-Tap Fill Demo Card */}
                <TouchableOpacity
                  onPress={() => {
                    setCardNumber('4111 2222 3333 4444');
                    setCardHolder(passengerName || 'MAHMUDUL HASSAN');
                    setExpiry('12/28');
                    setCvv('789');
                    setCardBrand('Visa');
                  }}
                  style={{
                    backgroundColor: '#F0F9FF',
                    borderRadius: 8,
                    padding: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#BAE6FD',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                    ⚡ {isBn ? '১-ক্লিকে টেস্ট কার্ড তথ্য পূরণ করুন (Demo Fill)' : '1-Tap Fill Test Card Details'}
                  </Text>
                </TouchableOpacity>

                {/* Submit Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleProceedToOtp}
                  disabled={isProcessing}
                  style={{
                    backgroundColor: '#0284C7',
                    borderRadius: 12,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 6,
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                    opacity: isProcessing ? 0.7 : 1,
                  }}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                      🔒 {isBn ? `৳ ${amount.toLocaleString('en-IN')} পরিশোধে এগিয়ে যান` : `Proceed to Pay ৳ ${amount.toLocaleString('en-IN')}`}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

          {/* STEP 2: 3D SECURE OTP AUTHENTICATION */}
          {step === 2 && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#E0F2FE',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Text style={{ fontSize: 26 }}>🔐</Text>
              </View>

              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                {isBn ? '3D Secure ব্যাংক ওটিপি যাচাই' : '3D Secure Bank OTP Verification'}
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 18 }}>
                {isBn
                  ? `আপনার নিবন্ধিত মোবাইল নম্বরে প্রেরিত ৬ ডিজিটের ওটিপি লিখুন (বুকিং #${bookingId})`
                  : `Enter the 6-digit OTP sent to your registered mobile (Booking #${bookingId})`}
              </Text>

              {/* OTP Input Card */}
              <View
                style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 10 }}>
                  {isBn ? 'ওয়ান-টাইম পাসওয়ার্ড (OTP)' : 'One-Time Password (OTP)'}
                </Text>

                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                  maxLength={6}
                  style={{
                    width: 200,
                    height: 50,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 2,
                    borderColor: '#0284C7',
                    borderRadius: 12,
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: '900',
                    color: '#0F172A',
                    letterSpacing: 6,
                    marginBottom: 12,
                  }}
                />

                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  ⏱️ {isBn ? 'কোডের মেয়াদ বাকি:' : 'Code expires in:'} {otpCountdown} {isBn ? 'সেকেন্ড' : 'sec'}
                </Text>

                {/* Resend button */}
                <TouchableOpacity
                  onPress={() => setOtpCountdown(60)}
                  disabled={otpCountdown > 0}
                  style={{ marginTop: 8 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: otpCountdown > 0 ? '#94A3B8' : '#0284C7' }}>
                    {isBn ? 'পুনরায় ওটিপি পাঠান' : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={{ width: '100%', gap: 10, marginTop: 20 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleConfirmOtp}
                  disabled={isProcessing}
                  style={{
                    backgroundColor: '#059669',
                    borderRadius: 12,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                    opacity: isProcessing ? 0.7 : 1,
                  }}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                      ✓ {isBn ? 'পেমেন্ট নিশ্চিত করুন' : 'Confirm & Complete Payment'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setStep(1)}
                  style={{
                    borderRadius: 12,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F1F5F9',
                  }}
                >
                  <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700' }}>
                    ← {isBn ? 'কার্ড তথ্য পরিবর্তন করুন' : 'Change Card Details'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* STEP 3: OFFICIAL MONEY RECEIPT */}
          {step === 3 && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#ECFDF5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  borderWidth: 2,
                  borderColor: '#A7F3D0',
                }}
              >
                <CheckCircleIcon size={38} color="#059669" />
              </View>

              <Text style={{ fontSize: 20, fontWeight: '900', color: '#065F46', textAlign: 'center' }}>
                {receiptData?.isBankTransfer
                  ? (isBn ? 'ব্যাংক ট্রান্সফার সফলভাবে সম্পন্ন হয়েছে!' : 'Bank Transfer Received & Verified!')
                  : (isBn ? 'কার্ড পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!' : 'Card Payment Approved & Verified!')}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 18 }}>
                {receiptData?.isBankTransfer
                  ? (isBn
                    ? 'ইস্টার্ন ব্যাংকে পেমেন্ট ট্রানজেকশন সফলভাবে রেকর্ড করা হয়েছে ও বুকিং নিশ্চিত হয়েছে।'
                    : 'Transaction recorded for Eastern Bank PLC and booking confirmed.')
                  : (isBn
                    ? 'আপনার ব্যাংক কার্ড থেকে অর্থ সফলভাবে কর্তন ও বুকিং নিশ্চিত করা হয়েছে।'
                    : 'Transaction approved and booking officially confirmed.')}
              </Text>

              {/* Official Receipt Card */}
              <View
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: '#0284C7',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.1)',
                  marginBottom: 18,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10, marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {isBn ? 'মার্চেন্ট / হিসাবের নাম:' : 'Beneficiary / Merchant:'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                    SAIFULLAH KHAN ENTERPRISE
                  </Text>
                </View>

                {receiptData?.isBankTransfer && (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        {isBn ? 'ব্যাংক ও শাখা:' : 'Bank & Branch:'}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                        Eastern Bank PLC (Gulshan North)
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        {isBn ? 'হিসাব নম্বর:' : 'Account Number:'}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>
                        1271350001371
                      </Text>
                    </View>
                  </>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {isBn ? 'বুকিং রেফারেন্স:' : 'Booking Ref:'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>
                    #{bookingId}
                  </Text>
                </View>

                {!receiptData?.isBankTransfer && (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        {isBn ? 'কার্ড বিবরণ:' : 'Card Details:'}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                        {receiptData?.brand || 'Visa'} •••• {receiptData?.last4 || '4444'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        {isBn ? 'অথরাইজেশন কোড:' : 'Auth Code:'}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>
                        {receiptData?.authCode || 'AUTH-892144'}
                      </Text>
                    </View>
                  </>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {isBn ? 'ট্রানজেকশন আইডি (TrxID):' : 'Transaction ID (TrxID):'}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#059669', letterSpacing: 0.5 }}>
                    {receiptData?.trxId || 'CRD89210482'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {isBn ? 'পরিশোধিত টাকা:' : 'Amount Paid:'}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#059669' }}>
                    ৳ {amount.toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                    {isBn ? 'স্ট্যাটাস:' : 'Status:'}
                  </Text>
                  <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                      PAID / VERIFIED ✓
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={{ width: '100%', gap: 10 }}>
                {Platform.OS === 'web' && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handlePrint}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: '#F1F5F9',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 12,
                      height: 46,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155' }}>
                      🖨️ {isBn ? 'রশিদ প্রিন্ট / সংরক্ষণ করুন' : 'Print / Save Receipt'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleFinalSuccess}
                  style={{
                    backgroundColor: '#0284C7',
                    borderRadius: 12,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                    {isBn ? '✓ বুকিং নিশ্চিতকরণে এগিয়ে যান' : '✓ Proceed to Booking Confirmation'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

