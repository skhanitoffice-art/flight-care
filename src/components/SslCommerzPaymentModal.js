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
import { processSslCommerzPayment, SSLCOMMERZ_CONFIG } from '../services/paymentGateway';
import { CheckCircleIcon, SslCommerzLogo, CardLogoIcon, LockIcon } from './Icons';
import { validateLuhnCardNumber, isCardExpiryValid } from '../utils/helpers';

export default function SslCommerzPaymentModal({
  visible,
  onClose,
  onSuccess,
  booking,
  lang = 0,
}) {
  const isBn = Boolean(lang);
  const amount = Number(booking?.amount) || 0;
  const bookingId = booking?.id || 'FC-PENDING';
  const passengerName = booking?.passengerName || booking?.name || (isBn ? 'সম্মানিত যাত্রী' : 'Passenger');
  const flightNumber = booking?.flight?.number || booking?.fno || '';
  const serviceDate = booking?.flight?.date || booking?.date || '';

  // Steps: 1 = Payment Channel & Details, 2 = 3D Secure / OTP Verification, 3 = SSLCOMMERZ Official Receipt
  const [step, setStep] = useState(1);

  // Selected Channel: 'cards' | 'mfs' | 'net_banking'
  const [selectedChannel, setSelectedChannel] = useState('cards');

  // Sub-channel Brand Selections
  const [cardBrand, setCardBrand] = useState('Visa');
  const [mfsBrand, setMfsBrand] = useState('bKash');
  const [bankBrand, setBankBrand] = useState('City Touch');

  // Form Fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(
    passengerName !== 'সম্মানিত যাত্রী' && passengerName !== 'Passenger' ? passengerName.toUpperCase() : ''
  );
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [mfsNumber, setMfsNumber] = useState(booking?.phone || '');
  const [bankAccount, setBankAccount] = useState('');

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
      setSelectedChannel('cards');
      setCardBrand('Visa');
      setMfsBrand('bKash');
      setBankBrand('City Touch');
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setMfsNumber(booking?.phone || '');
      setBankAccount('');
      setOtp('123456');
      setOtpCountdown(60);
      setIsProcessing(false);
      setError('');
      setReceiptData(null);
      if (passengerName && passengerName !== 'সম্মানিত যাত্রী' && passengerName !== 'Passenger') {
        setCardHolder(passengerName.toUpperCase());
      }
    }
  }, [visible, passengerName, booking]);

  // Countdown timer for 3D Secure OTP
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

  // Format Card Number (XXXX XXXX XXXX XXXX) and auto-detect brand
  const handleCardNumberChange = (text) => {
    const raw = text.replace(/\D/g, '').slice(0, 16);
    if (raw.startsWith('4')) setCardBrand('Visa');
    else if (raw.startsWith('5')) setCardBrand('Mastercard');
    else if (raw.startsWith('34') || raw.startsWith('37')) setCardBrand('American Express');
    else if (raw.startsWith('60') || raw.startsWith('62')) setCardBrand('DBBL Nexus');
    else setCardBrand('Bank Card');

    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
    if (error) setError('');
  };

  // Format Expiration Date (MM/YY)
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

  // Step 1: Validate channel input and proceed to 3D Secure OTP
  const handleProceedToOtp = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 1500 || isProcessing) return;
    lastClickRef.current = now;

    if (selectedChannel === 'cards') {
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
    } else if (selectedChannel === 'mfs') {
      const cleanPhone = mfsNumber.replace(/\D/g, '');
      if (cleanPhone.length < 11) {
        setError(isBn ? `সঠিক ১১ ডিজিটের ${mfsBrand} নম্বর লিখুন।` : `Please enter valid 11-digit ${mfsBrand} wallet number.`);
        return;
      }
    } else if (selectedChannel === 'net_banking') {
      if (!bankAccount.trim()) {
        setError(isBn ? `${bankBrand} এর ইউজার আইডি বা অ্যাকাউন্ট নম্বর লিখুন।` : `Please enter ${bankBrand} User ID or Account Number.`);
        return;
      }
    }

    setError('');
    setStep(2);
    setOtpCountdown(60);
  };

  // Step 2: Confirm OTP & Authorize Payment via SSLCOMMERZ
  const handleConfirmOtp = async () => {
    const now = Date.now();
    if (now - lastClickRef.current < 1500 || isProcessing) return;
    lastClickRef.current = now;

    if (!otp || otp.length < 4) {
      setError(isBn ? 'অনুগ্রহ করে সঠিক ওটিপি কোড লিখুন।' : 'Please enter valid OTP code.');
      return;
    }

    setIsProcessing(true);
    setError('');

    const channelBrand =
      selectedChannel === 'cards'
        ? cardBrand
        : selectedChannel === 'mfs'
        ? mfsBrand
        : bankBrand;

    const rawCard = cardNumber.replace(/\D/g, '');
    const cardLast4 = rawCard.length >= 4 ? rawCard.slice(-4) : '4242';

    try {
      const res = await processSslCommerzPayment({
        bookingId,
        amount,
        customerName: passengerName,
        customerEmail: booking?.passengerEmail || booking?.email || '',
        customerPhone: booking?.passengerPhone || booking?.phone || '',
        selectedChannel,
        channelBrand,
        accountNumber: selectedChannel === 'mfs' ? mfsNumber : selectedChannel === 'net_banking' ? bankAccount : cardNumber,
        cardLast4,
      });

      if (!res.ok) {
        setError(res.message || (isBn ? 'এসএসএল কমার্জ পেমেন্ট ব্যর্থ হয়েছে।' : 'SSLCOMMERZ payment failed.'));
        setIsProcessing(false);
        return;
      }

      setReceiptData(res);
      setIsProcessing(false);
      setStep(3); // Receipt
    } catch {
      setError(isBn ? 'এসএসএল কমার্জ সার্ভারের সাথে যোগাযোগে ত্রুটি ঘটেছে।' : 'SSLCOMMERZ gateway connection failed.');
      setIsProcessing(false);
    }
  };

  // Step 3: Complete & callback
  const handleFinalSuccess = () => {
    if (typeof onSuccess === 'function' && receiptData) {
      onSuccess({
        trxId: receiptData.trxId,
        paymentId: `PAY-${receiptData.trxId}`,
        valId: receiptData.valId,
        bankTranId: receiptData.bankTranId,
        amount: receiptData.amount,
        cardBrand: receiptData.channelBrand,
        channel: receiptData.channel,
      });
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
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            width: '100%',
            maxWidth: 520,
            maxHeight: '92%',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          {/* Header Bar: SSLCOMMERZ Official Theme */}
          <View
            style={{
              backgroundColor: '#072B56',
              paddingHorizontal: 20,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 3,
              borderBottomColor: '#2563EB',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SslCommerzLogo size={34} />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.3 }}>
                    SSLCOMMERZ
                  </Text>
                  <View style={{ backgroundColor: '#059669', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#ECFDF5' }}>
                      LIVE
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#93C5FD', marginTop: 1 }}>
                  Store: {SSLCOMMERZ_CONFIG.STORE_NAME || 'flightcaresbd'} • ID: {SSLCOMMERZ_CONFIG.STORE_ID || 'flightcaresbd0live'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Amount Summary Strip */}
          <View
            style={{
              backgroundColor: '#F1F5F9',
              paddingHorizontal: 20,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
            }}
          >
            <View>
              <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600' }}>
                {isBn ? 'বুকিং রেফারেন্স' : 'Booking Reference'}: #{bookingId}
              </Text>
              {flightNumber ? (
                <Text style={{ fontSize: 11, color: '#0F172A', fontWeight: '700' }}>
                  ✈️ {flightNumber} {serviceDate ? `• ${serviceDate}` : ''}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: '#64748B' }}>
                {isBn ? 'পরিশোধযোগ্য টাকা' : 'Payable Amount'}
              </Text>
              <Text style={{ fontSize: 19, fontWeight: '900', color: '#0F172A' }}>
                ৳ {amount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <ScrollView style={{ padding: 18 }} showsVerticalScrollIndicator={false}>
            {/* STEP 1: CHANNEL SELECTION & DETAILS */}
            {step === 1 && (
              <View>
                {/* Channel Selector Tabs */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: '#F1F5F9',
                    borderRadius: 12,
                    padding: 3,
                    marginBottom: 16,
                  }}
                >
                  {[
                    { id: 'cards', label: isBn ? 'কার্ড' : 'Cards', icon: '💳' },
                    { id: 'mfs', label: isBn ? 'মোবাইল ব্যাংকিং' : 'Mobile Banking', icon: '📱' },
                    { id: 'net_banking', label: isBn ? 'নেট ব্যাংকিং' : 'Net Banking', icon: '🏛️' },
                  ].map(tab => {
                    const isActive = selectedChannel === tab.id;
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        onPress={() => {
                          setSelectedChannel(tab.id);
                          setError('');
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          alignItems: 'center',
                          borderRadius: 9,
                          backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                          shadowColor: isActive ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: isActive ? 2 : 0,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12.5,
                            fontWeight: isActive ? '800' : '600',
                            color: isActive ? '#0F172A' : '#64748B',
                          }}
                        >
                          {tab.icon} {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Sub-form 1: CARDS */}
                {selectedChannel === 'cards' && (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                        {isBn ? 'কার্ডের তথ্য প্রদান করুন' : 'Enter Card Details'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {['Visa', 'Mastercard', 'AMEX', 'Nexus'].map(b => (
                          <View
                            key={b}
                            style={{
                              backgroundColor: cardBrand === b ? '#EFF6FF' : '#F8FAFC',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              borderWidth: 1,
                              borderColor: cardBrand === b ? '#2563EB' : '#E2E8F0',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 9.5,
                                fontWeight: '800',
                                color: cardBrand === b ? '#1D4ED8' : '#64748B',
                              }}
                            >
                              {b}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Card Number Input */}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? 'কার্ড নম্বর (১৬ ডিজিট)' : 'Card Number (16 Digits)'}
                    </Text>
                    <TextInput
                      value={cardNumber}
                      onChangeText={handleCardNumberChange}
                      placeholder="4123 4567 8901 2345"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      maxLength={19}
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#0F172A',
                        marginBottom: 10,
                      }}
                    />

                    {/* Cardholder Name */}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? 'কার্ডধারীর পূর্ণ নাম' : 'Cardholder Name'}
                    </Text>
                    <TextInput
                      value={cardHolder}
                      onChangeText={setCardHolder}
                      placeholder="NAME ON CARD"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#0F172A',
                        marginBottom: 10,
                      }}
                    />

                    {/* Expiry & CVV Row */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                          {isBn ? 'মেয়াদ (MM/YY)' : 'Expiry (MM/YY)'}
                        </Text>
                        <TextInput
                          value={expiry}
                          onChangeText={handleExpiryChange}
                          placeholder="12/28"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          maxLength={5}
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1.5,
                            borderColor: '#CBD5E1',
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            fontSize: 14,
                            fontWeight: '700',
                            color: '#0F172A',
                          }}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                          {isBn ? 'সিভিভি (CVV)' : 'CVV / CVC'}
                        </Text>
                        <TextInput
                          value={cvv}
                          onChangeText={setCvv}
                          placeholder="123"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          secureTextEntry
                          maxLength={4}
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1.5,
                            borderColor: '#CBD5E1',
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            fontSize: 14,
                            fontWeight: '700',
                            color: '#0F172A',
                          }}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Sub-form 2: MOBILE BANKING */}
                {selectedChannel === 'mfs' && (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                      {isBn ? 'মোবাইল ওয়ালেট নির্বাচন করুন' : 'Select Mobile Wallet'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                      {[
                        { id: 'bKash', nameBn: 'বিকাশ', color: '#E2136E', bg: '#FDF2F8' },
                        { id: 'Nagad', nameBn: 'নগদ', color: '#F97316', bg: '#FFF7ED' },
                        { id: 'Rocket', nameBn: 'রকেট', color: '#8B5CF6', bg: '#F5F3FF' },
                        { id: 'Upay', nameBn: 'উপায়', color: '#0284C7', bg: '#F0F9FF' },
                        { id: 'CellFin', nameBn: 'সেলফিন', color: '#059669', bg: '#ECFDF5' },
                      ].map(w => {
                        const isChosen = mfsBrand === w.id;
                        return (
                          <TouchableOpacity
                            key={w.id}
                            onPress={() => setMfsBrand(w.id)}
                            style={{
                              backgroundColor: isChosen ? w.color : w.bg,
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 8,
                              borderWidth: 1.5,
                              borderColor: w.color,
                            }}
                          >
                            <Text
                              style={{
                                color: isChosen ? '#FFFFFF' : w.color,
                                fontSize: 12,
                                fontWeight: '800',
                              }}
                            >
                              {isBn ? w.nameBn : w.id}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? `${mfsBrand} ওয়ালেট মোবাইল নম্বর` : `${mfsBrand} Wallet Mobile Number`}
                    </Text>
                    <TextInput
                      value={mfsNumber}
                      onChangeText={setMfsNumber}
                      placeholder="01712345678"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={14}
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#0F172A',
                        marginBottom: 10,
                      }}
                    />
                    <Text style={{ fontSize: 11.5, color: '#64748B', lineHeight: 16 }}>
                      ℹ️ {isBn ? `পরবর্তী ধাপে আপনার ${mfsBrand} নম্বরে একটি ওটিপি ভেরিফিকেশন পাঠানো হবে।` : `You will receive a secure OTP on your ${mfsBrand} number in the next step.`}
                    </Text>
                  </View>
                )}

                {/* Sub-form 3: NET BANKING */}
                {selectedChannel === 'net_banking' && (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                      {isBn ? 'আপনার ব্যাংক নির্বাচন করুন' : 'Select Your Bank'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                      {[
                        'City Touch',
                        'BRAC Astha',
                        'IBBL iBanking',
                        'EBL SKYBANKING',
                        'MTB Internet Banking',
                        'Dhaka Bank Go',
                      ].map(bank => {
                        const isChosen = bankBrand === bank;
                        return (
                          <TouchableOpacity
                            key={bank}
                            onPress={() => setBankBrand(bank)}
                            style={{
                              backgroundColor: isChosen ? '#0F172A' : '#F1F5F9',
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: isChosen ? '#0F172A' : '#CBD5E1',
                            }}
                          >
                            <Text
                              style={{
                                color: isChosen ? '#FFFFFF' : '#334155',
                                fontSize: 11.5,
                                fontWeight: '700',
                              }}
                            >
                              {bank}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? `${bankBrand} ইউজার আইডি বা অ্যাকাউন্ট নম্বর` : `${bankBrand} User ID / Account`}
                    </Text>
                    <TextInput
                      value={bankAccount}
                      onChangeText={setBankAccount}
                      placeholder={isBn ? 'ইউজার আইডি বা ক্লায়েন্ট আইডি' : 'User ID / Customer ID'}
                      placeholderTextColor="#94A3B8"
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#0F172A',
                        marginBottom: 10,
                      }}
                    />
                  </View>
                )}

                {/* Error Banner */}
                {error ? (
                  <View
                    style={{
                      backgroundColor: '#FEF2F2',
                      padding: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      marginTop: 4,
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>
                      ⚠️ {error}
                    </Text>
                  </View>
                ) : null}

                {/* Security Seal Strip */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 8,
                  }}
                >
                  <LockIcon size={13} color="#059669" />
                  <Text style={{ fontSize: 11.5, color: '#059669', fontWeight: '700' }}>
                    {isBn ? '২৫৬-বিট এসএসএল ও ৩ডি সিকিউর এনক্রিপশন সক্রিয়' : '256-Bit SSL & 3D Secure Protection Active'}
                  </Text>
                </View>

                {/* Continue to OTP Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleProceedToOtp}
                  style={{
                    backgroundColor: '#072B56',
                    height: 46,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 6,
                    shadowColor: '#072B56',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' }}>
                    {isBn
                      ? `৳ ${amount.toLocaleString('en-IN')} পে করতে এগিয়ে যান ›`
                      : `Pay ৳ ${amount.toLocaleString('en-IN')} with SSLCOMMERZ ›`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: 3D SECURE OTP VERIFICATION */}
            {step === 2 && (
              <View>
                <View
                  style={{
                    backgroundColor: '#EFF6FF',
                    padding: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E40AF', marginBottom: 4 }}>
                    🛡️ {isBn ? '৩ডি সিকিউর ওটিপি ভেরিফিকেশন' : '3D Secure OTP Verification'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                    {isBn
                      ? `আপনার ${selectedChannel === 'cards' ? cardBrand : selectedChannel === 'mfs' ? mfsBrand : bankBrand} সিকিউরিটি গেটওয়ে থেকে একটি এককালীন পাসওয়ার্ড (OTP) তৈরি করা হয়েছে।`
                      : `A one-time verification passcode (OTP) has been generated for your ${selectedChannel === 'cards' ? cardBrand : selectedChannel === 'mfs' ? mfsBrand : bankBrand} account.`}
                  </Text>
                </View>

                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                  {isBn ? 'ওটিপি (OTP) কোড লিখুন' : 'Enter One-Time Password (OTP)'}
                </Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="123456"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={6}
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 2,
                    borderColor: '#2563EB',
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 20,
                    fontWeight: '900',
                    color: '#0F172A',
                    letterSpacing: 4,
                    textAlign: 'center',
                    marginBottom: 12,
                  }}
                />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {isBn ? `মেয়াদ: ${otpCountdown} সেকেন্ড বাকি` : `Expires in: ${otpCountdown}s`}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setOtpCountdown(60);
                      setOtp('123456');
                    }}
                    disabled={otpCountdown > 45}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: otpCountdown > 45 ? '#94A3B8' : '#2563EB' }}>
                      {isBn ? 'পুনরায় কোড পাঠান' : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {error ? (
                  <View
                    style={{
                      backgroundColor: '#FEF2F2',
                      padding: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>
                      ⚠️ {error}
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleConfirmOtp}
                  disabled={isProcessing}
                  style={{
                    backgroundColor: '#059669',
                    height: 48,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                    opacity: isProcessing ? 0.7 : 1,
                  }}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                      ✓ {isBn ? 'পেমেন্ট নিশ্চিত করুন' : 'Authorize & Complete Payment'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setStep(1)}
                  style={{ alignItems: 'center', paddingVertical: 8 }}
                >
                  <Text style={{ fontSize: 12.5, color: '#64748B', fontWeight: '700' }}>
                    ← {isBn ? 'আগের ধাপে ফিরে যান' : 'Back to Payment Details'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: OFFICIAL SSLCOMMERZ TRANSACTION RECEIPT */}
            {step === 3 && receiptData && (
              <View>
                <View style={{ alignItems: 'center', marginVertical: 8 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#ECFDF5',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: '#10B981',
                      marginBottom: 10,
                    }}
                  >
                    <CheckCircleIcon size={32} color="#059669" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#065F46' }}>
                    {isBn ? 'পেমেন্ট সফল হয়েছে!' : 'Payment Verified & Successful!'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    SSLCOMMERZ Transaction Authorization ID: {receiptData.trxId}
                  </Text>
                </View>

                {/* Printable Receipt Box */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginVertical: 12,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>{isBn ? 'মার্চেন্ট স্টোর' : 'Merchant Store'}:</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>{SSLCOMMERZ_CONFIG.STORE_NAME || 'flightcaresbd'} ({SSLCOMMERZ_CONFIG.STORE_ID || 'flightcaresbd0live'})</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>{isBn ? 'পরিশোধিত টাকা' : 'Amount Paid'}:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#059669' }}>
                      ৳ {receiptData.amount?.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>{isBn ? 'ট্রানজেকশন আইডি' : 'Tran ID'}:</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>{receiptData.trxId}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>{isBn ? 'ভ্যালিডেশন আইডি' : 'Val ID'}:</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>{receiptData.valId}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>{isBn ? 'ব্যাংক রেফারেন্স' : 'Bank Tran ID'}:</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>{receiptData.bankTranId}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>{isBn ? 'পেমেন্ট চ্যানেল' : 'Channel'}:</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7' }}>{receiptData.channel}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>{isBn ? 'তারিখ ও সময়' : 'Timestamp'}:</Text>
                    <Text style={{ fontSize: 11.5, color: '#64748B' }}>{new Date().toLocaleString()}</Text>
                  </View>
                </View>

                {/* Print Receipt Button */}
                <TouchableOpacity
                  onPress={handlePrint}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: '#CBD5E1',
                    borderRadius: 10,
                    paddingVertical: 10,
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155' }}>
                    🖨️ {isBn ? 'রিসিপ্ট প্রিন্ট বা সেভ করুন' : 'Print / Save Official Receipt'}
                  </Text>
                </TouchableOpacity>

                {/* Final Booking Confirm Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleFinalSuccess}
                  style={{
                    backgroundColor: '#0F172A',
                    height: 48,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                    ✓ {isBn ? 'বুকিং কনফার্মেশন সম্পন্ন করুন ›' : 'Complete & View Confirmation ›'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

