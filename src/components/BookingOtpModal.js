// src/components/BookingOtpModal.js
// Flight Care Payment-After-Service OTP Verification Modal
// Secures Pay-Later bookings via Greenweb Live SMS OTP delivery

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { verifyBookingOtpChallenge, createBookingOtpChallenge } from '../services/otpAuthService';

export default function BookingOtpModal({
  visible,
  onClose,
  onVerified,
  bookingData,
  lang = 0,
}) {
  const isBn = Boolean(lang);
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeChallengeId, setActiveChallengeId] = useState('');
  const inputRef = useRef(null);
  const hasDispatchedRef = useRef(false);
  const isVerifyingRef = useRef(false);

  const phone = bookingData?.phone || bookingData?.passengerPhone || '';
  const bookingId = bookingData?.id || 'FC-PENDING';
  const amount = Number(bookingData?.amount) || 0;
  const passengerName = bookingData?.passengerName || bookingData?.name || '';

  // Initialize or reset OTP on open - strictly guarded against duplicate SMS dispatches
  useEffect(() => {
    let timer = null;
    if (visible) {
      setOtpCode('');
      setError('');
      setSuccessMsg('');
      setCountdown(60);
      setIsVerifying(false);
      isVerifyingRef.current = false;

      // Prevent duplicate challenge creation on parent re-renders or Strict Mode
      if (!hasDispatchedRef.current) {
        hasDispatchedRef.current = true;

        if (bookingData?.challengeId) {
          setActiveChallengeId(bookingData.challengeId);
        } else if (phone) {
          createBookingOtpChallenge({
            bookingId,
            phone,
            passengerName,
            amount,
          }).then(res => {
            if (res.ok) {
              setActiveChallengeId(res.challengeId);
              setSuccessMsg(isBn ? 'আপনার মোবাইলে ওটিপি কোড পাঠানো হয়েছে।' : 'OTP code has been sent to your mobile phone.');
            }
          }).catch(err => {
            setError(isBn ? 'ওটিপি পাঠাতে ত্রুটি হয়েছে। আবার চেষ্টা করুন।' : 'Failed to dispatch OTP. Please retry.');
          });
        }
      }

      // Auto focus on web
      setTimeout(() => {
        if (inputRef.current) {
          try { inputRef.current.focus(); } catch {}
        }
      }, 250);
    } else {
      hasDispatchedRef.current = false;
      isVerifyingRef.current = false;
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible]);

  // Countdown timer
  useEffect(() => {
    let timer = null;
    if (visible && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible, countdown]);

  const handleVerify = async (manualCode) => {
    const raw = typeof manualCode === 'string' ? manualCode : otpCode;
    const cleanCode = String(raw || '').replace(/\D/g, '').trim();
    if (cleanCode.length < 4) {
      setError(isBn ? 'অনুগ্রহ করে মোবাইলে আসা ৬ ডিজিটের ওটিপি দিন।' : 'Please enter the 6-digit OTP code.');
      return;
    }

    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;
    setIsVerifying(true);
    setError('');

    try {
      const res = await verifyBookingOtpChallenge(activeChallengeId, cleanCode, phone);
      if (!res.ok) {
        setError(res.message || (isBn ? 'ভুল ওটিপি কোড! অনুগ্রহ করে সঠিক কোড দিন।' : 'Invalid OTP code. Please try again.'));
        setIsVerifying(false);
        isVerifyingRef.current = false;
        return;
      }

      setIsVerifying(false);
      isVerifyingRef.current = false;
      if (typeof onVerified === 'function') {
        onVerified({
          verified: true,
          otp: cleanCode,
          verifiedAt: new Date().toISOString(),
        });
      }
      onClose();
    } catch (err) {
      setError(isBn ? 'যাচাইকরণে ত্রুটি হয়েছে।' : 'Verification error occurred.');
      setIsVerifying(false);
      isVerifyingRef.current = false;
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await createBookingOtpChallenge({
        bookingId,
        phone,
        passengerName,
        amount,
      });

      if (res.ok) {
        setActiveChallengeId(res.challengeId);
        setCountdown(60);
        setOtpCode('');
        setSuccessMsg(isBn ? 'নতুন ওটিপি কোড পাঠানো হয়েছে!' : 'New OTP code dispatched!');
      } else {
        setError(isBn ? 'পুনরায় ওটিপি পাঠানো সম্ভব হয়নি।' : 'Failed to resend OTP.');
      }
    } catch {
      setError(isBn ? 'নেটওয়ার্ক ত্রুটি।' : 'Network error.');
    } finally {
      setIsResending(false);
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
          padding: 16,
          zIndex: 9999,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            width: '100%',
            maxWidth: 460,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35,
            shadowRadius: 28,
            elevation: 12,
          }}
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: '#005696',
              paddingHorizontal: 22,
              paddingVertical: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 3,
              borderBottomColor: '#00A859',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 22 }}>🔒</Text>
              </View>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.2 }}>
                  {isBn ? 'ওটিপি দিয়ে বুকিং নিশ্চিতকরণ' : 'Confirm Booking via OTP'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#93C5FD', marginTop: 2 }}>
                  {isBn ? 'Payment After Service ভেরিফিকেশন' : 'Payment After Service Security Check'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={{ padding: 22 }}>
            {/* Info Pill */}
            <View
              style={{
                backgroundColor: '#F0FDF4',
                borderRadius: 14,
                padding: 14,
                borderWidth: 1.5,
                borderColor: '#BBF7D0',
                marginBottom: 18,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 12, color: '#166534', fontWeight: '700' }}>
                  {isBn ? 'বুকিং রেফারেন্স:' : 'Booking Ref:'} #{bookingId}
                </Text>
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                    {isBn ? `৳${amount} সার্ভিসের পর` : `৳${amount} Pay Later`}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: '#15803D', fontWeight: '800' }}>
                📱 {phone ? (isBn ? `মোবাইল নম্বর: ${phone}` : `Sent to: ${phone}`) : (isBn ? 'আপনার মোবাইলে ওটিপি পাঠানো হয়েছে' : 'OTP dispatched')}
              </Text>
              <Text style={{ fontSize: 11, color: '#4ADE80', marginTop: 4 }}>
                {isBn
                  ? 'সার্ভিস সমাপ্তির পর পেমেন্ট করার জন্য ওটিপি দিয়ে বুকিং কনফার্ম করা বাধ্যতামূলক।'
                  : 'OTP verification is mandatory to confirm Payment After Service orders.'}
              </Text>
            </View>

            {/* Input Label */}
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
              {isBn ? '৬ ডিজিটের ওটিপি কোড লিখুন:' : 'Enter 6-Digit OTP Code:'}
            </Text>

            {/* OTP Input Box with 1-time Auto-Verification */}
            <TextInput
              ref={inputRef}
              value={otpCode}
              onChangeText={text => {
                const clean = text.replace(/\D/g, '').slice(0, 6);
                setOtpCode(clean);
                if (error) setError('');
                // Automatically verify immediately when user types 6 digits!
                if (clean.length === 6) {
                  handleVerify(clean);
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="• • • • • •"
              placeholderTextColor="#94A3B8"
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 2,
                borderColor: error ? '#EF4444' : '#0284C7',
                borderRadius: 14,
                height: 56,
                fontSize: 26,
                fontWeight: '900',
                textAlign: 'center',
                letterSpacing: 10,
                color: '#0F172A',
                marginBottom: 12,
              }}
              onSubmitEditing={handleVerify}
            />

            {/* Timer & Resend */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: countdown > 0 ? '#64748B' : '#DC2626', fontWeight: '600' }}>
                ⏳ {countdown > 0 ? (isBn ? `মেয়াদ: ${countdown} সেকেন্ড` : `Expires in ${countdown}s`) : (isBn ? 'মেয়াদ শেষ!' : 'Code expired')}
              </Text>

              <TouchableOpacity
                onPress={handleResend}
                disabled={countdown > 0 || isResending}
                style={{ opacity: countdown > 0 || isResending ? 0.4 : 1 }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0284C7' }}>
                  {isResending ? (isBn ? 'পাঠানো হচ্ছে...' : 'Sending...') : (isBn ? '🔄 পুনরায় ওটিপি পাঠান' : '🔄 Resend OTP')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error ? (
              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#FECACA',
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: '#DC2626', fontSize: 12.5, fontWeight: '700' }}>
                  ⚠️ {error}
                </Text>
              </View>
            ) : null}

            {/* Success Message */}
            {successMsg ? (
              <View
                style={{
                  backgroundColor: '#F0FDF4',
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#BBF7D0',
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: '#166534', fontSize: 12, fontWeight: '700' }}>
                  ✓ {successMsg}
                </Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleVerify}
              disabled={isVerifying}
              style={{
                backgroundColor: '#059669',
                height: 50,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
                opacity: isVerifying ? 0.7 : 1,
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 15.5, fontWeight: '900' }}>
                  ✓ {isBn ? 'ওটিপি যাচাই ও বুকিং নিশ্চিত করুন' : 'Verify & Confirm Booking'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={{ alignItems: 'center', paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '700' }}>
                {isBn ? 'বাতিল করে ব্যাকে যান' : 'Cancel & Go Back'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

