import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  PlaneIcon,
  StandardPkgIcon,
  PremiumPkgIcon,
  VipPkgIcon,
  UserIcon,
  BanglaQrLogo,
  CardLogoIcon,
  SslCommerzLogo,
  ChevronRight,
  InfoCircleIcon,
  GiftIcon,
  HeadphonesIcon,
  LockIcon,
  CheckCircleIcon,
} from '../../components/Icons';
import { validatePromoCode } from '../../utils/helpers';
import { getCustomerRewards } from '../../services/customerRewardsService';
import CancellationPolicyModal from '../../components/CancellationPolicyModal';
import WebsiteComplianceModal from '../../components/WebsiteComplianceModal';

export default function WizardStep2Payment({
  wiz,
  setWiz,
  lang,
  isDep,
  paymentMethod,
  setPaymentMethod,
  totalAmount,
  setTab,
  handlePayNow,
  isPaying = false,
  customerSession,
}) {
  const isBn = Boolean(lang);
  const [userRewards, setUserRewards] = useState(null);
  const isLoggedIn = Boolean(customerSession?.user?.role === 'customer');
  const userId = customerSession?.user?.id || customerSession?.user?.email || null;

  useEffect(() => {
    if (userId) {
      getCustomerRewards(userId).then(setUserRewards).catch(() => {});
    }
  }, [userId]);

  // 15-Minute Countdown Timer (900 seconds)
  const [secondsLeft, setSecondsLeft] = useState(900);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const formatTimer = secs => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Luggage Declaration & Consent State (Mandatory)
  const [baggageConsent, setBaggageConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [complianceTab, setComplianceTab] = useState(null);

  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Debounce Protection for Pay Button
  const [localPaying, setLocalPaying] = useState(false);
  const lastClickRef = useRef(0);

  const handlePayClick = async () => {
    if (!baggageConsent) {
      setConsentError(true);
      return;
    }
    const now = Date.now();
    if (now - lastClickRef.current < 1500 || localPaying || isPaying) return;
    lastClickRef.current = now;
    setLocalPaying(true);
    try {
      if (typeof handlePayNow === 'function') {
        await handlePayNow();
      }
    } finally {
      setTimeout(() => setLocalPaying(false), 2000);
    }
  };

  const handleApplyPromo = () => {
    if (!promoInput.trim()) {
      setPromoStatus({
        type: 'error',
        message: isBn ? 'অনুগ্রহ করে প্রোমো কোড লিখুন' : 'Please enter a promo code',
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
          message: isBn
            ? `✓ '${result.code}' কোড সফলভাবে যোগ হয়েছে (-৳${result.discount} ছাড়)`
            : `✓ '${result.code}' applied successfully (-৳${result.discount} off)`,
        });
      } else {
        setPromoStatus({
          type: 'error',
          message: isBn
            ? (result.messageBn || '⚠️ সঠিক প্রোমো কোড দিন (যেমন: FLIGHT100, EIDVIP)')
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
      message: isBn ? 'প্রোমো কোড বাতিল করা হয়েছে' : 'Promo code removed',
    });
  };

  const hasDiscount = Boolean(wiz?.discount?.amount);
  const discountAmount = Number(wiz?.discount?.amount) || 0;
  const originalSubtotal = totalAmount + discountAmount;

  return (
    <>
      {/* 15-Minute Countdown Timer Banner */}
      <View
        style={{
          backgroundColor: secondsLeft < 180 ? '#FEF2F2' : '#EFF6FF',
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: secondsLeft < 180 ? '#FCA5A5' : '#BFDBFE',
          marginBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={{ fontSize: 16 }}>⏱️</Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: secondsLeft < 180 ? '#DC2626' : '#1E40AF',
            }}
          >
            {isBn ? 'পেমেন্ট সম্পন্ন করার সময় বাকি:' : 'Time remaining to pay:'}
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

      {/* Card 1: বুকিংয়ের সারাংশ */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          marginBottom: 14,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
            {lang ? 'বুকিংয়ের সারাংশ' : 'Booking Summary'}
          </Text>
          <TouchableOpacity
            onPress={() => setWiz(c => ({ ...c, step: 1 }))}
            style={{
              backgroundColor: '#F0F9FF',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#BAE6FD',
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0284C7' }}>
              {lang ? '✏️ সংশোধন করুন' : '✏️ Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: '#E0F2FE',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {wiz.onlyAddons ? (
              <Image source={require('../../../assets/pkg_additional.webp')} style={{ width: 32, height: 32, resizeMode: 'contain' }} />
            ) : (wiz.packageChoice === 'economy' || wiz.pkg?.id === 'economy') ? (
              <StandardPkgIcon size={30} color="#0284C7" />
            ) : (wiz.packageChoice === 'first' || wiz.pkg?.id === 'first') ? (
              <VipPkgIcon size={30} color="#D97706" />
            ) : (
              <PremiumPkgIcon size={30} color="#2563EB" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              {wiz.onlyAddons
                ? `${isDep ? (lang ? 'প্রস্থান' : 'Departure') : (lang ? 'আগমন' : 'Arrival')} • ${lang ? 'শুধুমাত্র অতিরিক্ত সেবা' : 'Additional Services Only'}`
                : (lang
                    ? `${isDep ? 'প্রস্থান' : 'আগমন'} • ${wiz.pkg?.n ? wiz.pkg.n[1] : 'স্ট্যান্ডার্ড'}`
                    : `${isDep ? 'Departure' : 'Arrival'} • ${wiz.pkg?.n ? wiz.pkg.n[0] : 'Standard'}`)}
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: '#0F172A',
                marginVertical: 2,
              }}
            >
              {wiz.airportName || (lang ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা' : 'Dhaka Airport (DAC)')}
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              {(wiz.fno ? wiz.fno : (lang ? 'ফ্লাইট নম্বর উল্লেখ নেই' : 'Not specified'))} • {(wiz.date ? wiz.date : (lang ? 'তারিখ উল্লেখ নেই' : 'Not specified'))}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <UserIcon size={14} color="#64748B" />
              <Text style={{ fontSize: 13, color: '#64748B' }}>
                {lang ? `${wiz.a || 1} জন যাত্রী` : `${wiz.a || 1} passenger`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Card 2B: রিওয়ার্ড পয়েন্ট ছাড় (Login Required) */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>⭐</Text>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
              {isBn ? 'গ্রাহক রিওয়ার্ড পয়েন্ট ছাড়' : 'Reward Points Discount'}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: isLoggedIn ? '#DCFCE7' : '#FEF3C7',
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '800',
                color: isLoggedIn ? '#15803D' : '#B45309',
              }}
            >
              {isLoggedIn
                ? `${userRewards?.points || 0} ${isBn ? 'পয়েন্ট আছে' : 'Pts'}`
                : `🔒 ${isBn ? 'লকড' : 'LOCKED'}`}
            </Text>
          </View>
        </View>

        {!isLoggedIn ? (
          <View>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10, lineHeight: 17 }}>
              {isBn
                ? '১০০ রিওয়ার্ড পয়েন্ট ক্লেইম করে এই বুকিংয়ে তাৎক্ষণিক ছাড় পেতে আপনার অ্যাকাউন্টে লগ ইন করুন।'
                : 'Log in to claim 100 welcome reward points and get instant discount on this booking.'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (setTab) setTab('profile');
              }}
              style={{
                backgroundColor: '#0F172A',
                borderRadius: 9,
                paddingVertical: 9,
                paddingHorizontal: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                🔑 {isBn ? 'পয়েন্ট ক্লেইম করতে লগ ইন করুন' : 'Log in to Claim Points'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
              {isBn
                ? `আপনার অ্যাকাউন্টে ${userRewards?.points || 0} পয়েন্ট রয়েছে (১ পয়েন্ট = ১ টাকা ছাড়)।`
                : `You have ${userRewards?.points || 0} reward points available (1 pt = 1 BDT).`}
            </Text>
            {(userRewards?.points || 0) > 0 ? (
              wiz.rewardPointsUsed ? (
                <View
                  style={{
                    backgroundColor: '#ECFDF5',
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#A7F3D0',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#065F46' }}>
                    ✓ {wiz.rewardPointsUsed} {isBn ? 'পয়েন্ট ছাড় প্রযুক্ত হয়েছে (-৳' + wiz.rewardPointsUsed + ')' : 'Points applied (-৳' + wiz.rewardPointsUsed + ')'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setWiz(prev => ({ ...prev, rewardPointsUsed: 0 }))}
                    style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#DC2626' }}>
                      {isBn ? 'মুছুন' : 'Remove'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    const maxPts = Math.min(userRewards?.points || 0, Math.floor(totalAmount * 0.5));
                    setWiz(prev => ({ ...prev, rewardPointsUsed: maxPts }));
                  }}
                  style={{
                    backgroundColor: '#0284C7',
                    borderRadius: 9,
                    paddingVertical: 9,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                    ⚡ {isBn ? `রিওয়ার্ড পয়েন্ট প্রয়োগ করুন (৳${Math.min(userRewards?.points || 0, Math.floor(totalAmount * 0.5))} ছাড়)` : 'Apply Reward Points'}
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                {isBn
                  ? 'আপনার প্রোফাইল থেকে ফ্রি ১০০ ওয়েলকাম রিওয়ার্ড পয়েন্ট ক্লেইম করুন!'
                  : 'Claim your free 100 Welcome Points from Profile to get discount!'}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Row: মোট পরিশোধযোগ্য / Price Breakdown */}
      <View
        style={{
          backgroundColor: '#F8FAFC',
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          marginBottom: 14,
        }}
      >
        {hasDiscount && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              {lang ? 'পূর্বমূল্য' : 'Original Subtotal'}
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B', textDecorationLine: 'line-through' }}>
              {originalSubtotal} {lang ? 'টাকা' : 'Tk'}
            </Text>
          </View>
        )}

        {hasDiscount && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, color: '#059669', fontWeight: '700' }}>
              {lang ? 'প্রোমো ডিসকাউন্ট' : 'Promo Discount'}
            </Text>
            <Text style={{ fontSize: 13, color: '#059669', fontWeight: '800' }}>
              - {discountAmount} {lang ? 'টাকা' : 'Tk'}
            </Text>
          </View>
        )}

        {Boolean(wiz.rewardPointsUsed) && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, color: '#0284C7', fontWeight: '700' }}>
              ⭐ {lang ? 'রিওয়ার্ড পয়েন্ট ছাড়' : 'Points Discount'}
            </Text>
            <Text style={{ fontSize: 13, color: '#0284C7', fontWeight: '800' }}>
              - {wiz.rewardPointsUsed} {lang ? 'টাকা' : 'Tk'}
            </Text>
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: hasDiscount || wiz.rewardPointsUsed ? 6 : 0,
            borderTopWidth: hasDiscount || wiz.rewardPointsUsed ? 1 : 0,
            borderTopColor: '#E2E8F0',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
            {lang ? 'মোট পরিশোধযোগ্য' : 'Total payable'}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#0284C7' }}>
            {Math.max(0, totalAmount - (wiz.rewardPointsUsed || 0))} {lang ? 'টাকা' : 'Tk'}
          </Text>
        </View>
      </View>

      {/* Card 2: প্রোমো কোড / ডিসকাউন্ট ভাউচার (Pay amount এর নীচে স্থানান্তরিত) */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
            🏷️ {lang ? 'প্রোমো কোড / ডিসকাউন্ট কুপন' : 'Promo Code / Discount Coupon'}
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

        {hasDiscount ? (
          <View
            style={{
              backgroundColor: '#ECFDF5',
              borderWidth: 1,
              borderColor: '#A7F3D0',
              borderRadius: 12,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircleIcon size={16} color="#059669" />
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#064E3B' }}>
                  {wiz.discount.code}
                </Text>
                <View style={{ backgroundColor: '#059669', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                    -৳{wiz.discount.amount}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 11.5, color: '#047857', marginTop: 2 }}>
                {wiz.discount.label || (isBn ? 'ডিসকাউন্ট প্রয়োগ করা হয়েছে' : 'Discount applied')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleRemovePromo}
              style={{
                backgroundColor: '#FEE2E2',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>
                {isBn ? 'মুছুন' : 'Remove'}
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
                placeholder={isBn ? 'প্রোমো কোড (যেমন: FLIGHT100)' : 'Promo Code (e.g. FLIGHT100)'}
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                style={{
                  flex: 1,
                  height: 44,
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1.5,
                  borderColor: promoStatus?.type === 'error' ? '#EF4444' : '#CBD5E1',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#0F172A',
                }}
              />
              <TouchableOpacity
                onPress={handleApplyPromo}
                disabled={isApplyingPromo}
                style={{
                  backgroundColor: '#0F172A',
                  paddingHorizontal: 18,
                  height: 44,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isApplyingPromo ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                    {isBn ? 'প্রয়োগ করুন' : 'Apply'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {promoStatus && (
              <Text
                style={{
                  fontSize: 12,
                  marginTop: 6,
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

      {/* Card 3: পেমেন্ট পদ্ধতি বেছে নিন */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          marginBottom: 14,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 14 }}>
          {lang ? 'পেমেন্ট পদ্ধতি বেছে নিন' : 'Choose payment method'}
        </Text>

        {/* 1. SSLCOMMERZ Gateway */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setPaymentMethod('sslcommerz')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: paymentMethod === 'sslcommerz' ? '#072B56' : '#E2E8F0',
            backgroundColor: paymentMethod === 'sslcommerz' ? '#F0F7FF' : '#FFFFFF',
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
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
              marginRight: 10,
            }}
          >
            {paymentMethod === 'sslcommerz' && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#072B56',
                }}
              />
            )}
          </View>

          <View style={{ marginRight: 10 }}>
            <SslCommerzLogo size={36} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#072B56' }}>
                {lang ? 'এসএসএল কমার্জ (SSLCOMMERZ)' : 'SSLCOMMERZ Payment Gateway'}
              </Text>
              <View style={{ backgroundColor: '#072B56', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF' }}>
                  ALL-IN-ONE
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11.5, color: '#1E40AF', fontWeight: '600', marginTop: 2 }}>
              {lang
                ? 'কার্ড (Visa/Mastercard/AMEX), বিকাশ, নগদ, রকেট ও ৩৬+ ব্যাংকের নেট ব্যাংকিং'
                : 'Cards (Visa/Mastercard/AMEX), bKash, Nagad, Rocket & 36+ Net Banking'}
            </Text>
          </View>
          <ChevronRight size={18} color={paymentMethod === 'sslcommerz' ? '#072B56' : '#94A3B8'} />
        </TouchableOpacity>

        {/* 2. Payment After Service */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setPaymentMethod('pay_after_service')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: paymentMethod === 'pay_after_service' ? '#0284C7' : '#E2E8F0',
            backgroundColor: paymentMethod === 'pay_after_service' ? '#F0F9FF' : '#FFFFFF',
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
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
              marginRight: 10,
            }}
          >
            {paymentMethod === 'pay_after_service' && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#0284C7',
                }}
              />
            )}
          </View>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              backgroundColor: '#0284C7',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 18 }}>🤝</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'সার্ভিস সমাপ্তির পরে পেমেন্ট' : 'Payment After Service (Pay Later)'}
              </Text>
              <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#BAE6FD' }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#0369A1' }}>
                  {lang ? 'সার্ভিসের পরে' : 'POST-SERVICE'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600', marginTop: 2 }}>
              {lang
                ? 'সার্ভিস সম্পন্ন হওয়ার পর প্রোটোকল অফিসারের নিকট ক্যাশ, বিকাশ বা কার্ডে পেমেন্ট করুন'
                : 'Pay in cash, bKash or card to Protocol Officer after service completion'}
            </Text>
          </View>
          <ChevronRight size={18} color={paymentMethod === 'pay_after_service' ? '#0284C7' : '#94A3B8'} />
        </TouchableOpacity>

        {/* অপশন নোট */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 10 }}>
          <InfoCircleIcon size={14} color="#64748B" />
          <Text style={{ fontSize: 11.5, color: '#64748B', flex: 1 }}>
            {lang
              ? 'SSLCOMMERZ-এ অনলাইন ডিজিটাল পেমেন্ট অথবা বিমানবন্দরে সার্ভিস গ্রহণের পরে পেমেন্টের সুবিধা।'
              : 'Pay online securely via SSLCOMMERZ, or pay directly after service completion.'}
          </Text>
        </View>

        {/* ডায়নামিক পেমেন্ট চ্যানেল ইনফো কার্ড */}
        <View
          style={{
            backgroundColor:
              paymentMethod === 'pay_after_service'
                ? '#F0F9FF'
                : '#F0F7FF',
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor:
              paymentMethod === 'pay_after_service'
                ? '#BAE6FD'
                : '#BFDBFE',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginTop: 4,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor:
                paymentMethod === 'pay_after_service'
                  ? '#0284C7'
                  : '#072B56',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {paymentMethod === 'pay_after_service' ? (
              <Text style={{ fontSize: 18 }}>🤝</Text>
            ) : (
              <SslCommerzLogo size={24} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13.5,
                fontWeight: '800',
                color:
                  paymentMethod === 'pay_after_service'
                    ? '#0369A1'
                    : '#072B56',
              }}
            >
              {paymentMethod === 'pay_after_service'
                ? (lang ? 'সার্ভিস সমাপ্তির পরে পেমেন্ট সুবিধা' : 'Payment After Service (Pay Later)')
                : (lang ? 'এসএসএল কমার্জ (SSLCOMMERZ) সিকিউর পেমেন্ট' : 'SSLCOMMERZ Official Secured Gateway')}
            </Text>
            <Text
              style={{
                fontSize: 11.5,
                color:
                  paymentMethod === 'pay_after_service'
                    ? '#0284C7'
                    : '#1E40AF',
                marginTop: 2,
                lineHeight: 16,
              }}
            >
              {paymentMethod === 'pay_after_service'
                ? (lang
                    ? 'বিমানবন্দরে প্রোটোকল সার্ভিস সম্পন্ন হওয়ার পর আমাদের অফিসারের কাছে ক্যাশ, বিকাশ বা কার্ডে বিল পরিশোধ করুন। অগ্রিম কোনো পেমেন্ট লাগবে না।'
                    : 'No advance payment needed. Pay in cash, bKash, or POS card to the officer after your VIP protocol service is completed.')
                : (lang
                    ? 'ভিসা, মাস্টারকার্ড, অ্যামেক্স, ডিবিবিএল নেক্সাস, বিকাশ, নগদ, রকেট ও দেশের যেকোনো ব্যাংকের নেট ব্যাংকিং দিয়ে তাৎক্ষণিক পরিশোধ করুন।'
                    : 'Pay instantly via Visa, Mastercard, AMEX, DBBL Nexus, bKash, Nagad, Rocket, and 36+ Internet Banking channels.')}
            </Text>
          </View>
        </View>

        {/* ৫০ পয়েন্ট পাবেন কার্ড */}
        <View
          style={{
            backgroundColor: '#FEF9C3',
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: '#FDE047',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginTop: 12,
          }}
        >
          <GiftIcon size={24} color="#B45309" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#854D0E' }}>
              {lang ? '৫০ পয়েন্ট পাবেন' : 'Earn 50 Points'}
            </Text>
            <Text style={{ fontSize: 12, color: '#A16207', marginTop: 2 }}>
              {lang
                ? 'সেবা সম্পন্ন হলে পয়েন্ট যোগ হবে।'
                : 'Points will be added after service is completed.'}
            </Text>
          </View>
        </View>

        {/* সহায়তা প্রয়োজন? */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 14,
            paddingTop: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <HeadphonesIcon size={18} color="#0284C7" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
              {lang ? 'সহায়তা প্রয়োজন?' : 'Need Help?'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setWiz(null);
              if (setTab) setTab('help');
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284C7' }}>
              {lang ? 'যোগাযোগ করুন ›' : 'Contact Us ›'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Card 4: লাগেজ ও নিষিদ্ধ পণ্য সংক্রান্ত বাধ্যতামূলক সম্মতি (Check-box / 'I Consent') */}
      <View
        style={{
          backgroundColor: consentError && !baggageConsent ? '#FEF2F2' : '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          borderWidth: 2,
          borderColor: consentError && !baggageConsent ? '#EF4444' : '#E2E8F0',
          marginTop: 6,
          marginBottom: 14,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18 }}>🛡️</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: consentError && !baggageConsent ? '#DC2626' : '#0F172A' }}>
              {isBn ? 'লাগেজ ও নিষিদ্ধ সামগ্রী সংক্রান্ত ঘোষণা' : 'Luggage & Prohibited Items Declaration'}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: consentError && !baggageConsent ? '#DC2626' : '#FEE2E2',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: consentError && !baggageConsent ? '#FFFFFF' : '#B91C1C' }}>
              {isBn ? 'বাধ্যতামূলক' : 'MANDATORY'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setBaggageConsent(!baggageConsent);
            if (consentError) setConsentError(false);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            backgroundColor: baggageConsent ? '#F0FDF4' : '#F8FAFC',
            padding: 12,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: baggageConsent ? '#86EFAC' : consentError ? '#FCA5A5' : '#CBD5E1',
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: baggageConsent ? '#059669' : consentError ? '#DC2626' : '#64748B',
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
                fontSize: 13,
                fontWeight: '700',
                color: consentError && !baggageConsent ? '#B91C1C' : '#1E293B',
                lineHeight: 20,
              }}
            >
              {isBn
                ? '“আমি নিশ্চিত ও সম্মতি প্রদান করছি যে আমার/যাত্রীর লাগেজে কোনো নিষিদ্ধ পণ্য যেমন: দেশী-বিদেশী মুদ্রা, অলংকার, জীবিত প্রাণী, মাদকদ্রব্য, গোলাবারুদ বা কোনো প্রকার বেআইনি/বিপজ্জনক দ্রব্য নেই।”'
                : '“I confirm and consent that the passenger luggage contains no prohibited items such as currency, live animals, jewelry, weapons, narcotics, hazardous materials, or illegal goods.”'}
            </Text>

            <TouchableOpacity
              onPress={() => setComplianceTab('terms')}
              style={{ marginTop: 6, alignSelf: 'flex-start' }}
            >
              <Text style={{ fontSize: 12, color: '#0284C7', fontWeight: '800', textDecorationLine: 'underline' }}>
                {isBn ? '📋 সম্পূর্ণ শর্তাবলি ও ব্যাগেজ নীতিমালা দেখুন ›' : '📋 Read full terms & luggage policy ›'}
              </Text>
            </TouchableOpacity>

            {/* Direct SSLCommerz Compliance Links */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                {isBn ? 'পেমেন্টের মাধ্যমে আপনি সম্মত হচ্ছেন:' : 'By proceeding, you agree to:'}
              </Text>
              <TouchableOpacity onPress={() => setComplianceTab('terms')}>
                <Text style={{ fontSize: 11.5, color: '#0284C7', fontWeight: '800', textDecorationLine: 'underline' }}>
                  {isBn ? 'শর্তাবলী' : 'Terms'}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: '#94A3B8' }}>•</Text>
              <TouchableOpacity onPress={() => setComplianceTab('privacy')}>
                <Text style={{ fontSize: 11.5, color: '#0284C7', fontWeight: '800', textDecorationLine: 'underline' }}>
                  {isBn ? 'প্রাইভেসি' : 'Privacy'}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: '#94A3B8' }}>•</Text>
              <TouchableOpacity onPress={() => setComplianceTab('refund')}>
                <Text style={{ fontSize: 11.5, color: '#0284C7', fontWeight: '800', textDecorationLine: 'underline' }}>
                  {isBn ? 'রিফান্ড পলিসি (৭-১০ দিন)' : 'Refund Policy (7-10 Days)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {consentError && !baggageConsent && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '700' }}>
              ⚠️ {isBn
                ? 'বুকিং বা পেমেন্ট সম্পন্ন করতে অবশ্যই উপরের বক্সে টিক চিহ্ন দিয়ে সম্মতি প্রদান করুন।'
                : 'You must check this box to confirm and consent before payment or booking can be completed.'}
            </Text>
          </View>
        )}
      </View>

      {/* Navigation Buttons: Back to Step 1 & Sticky Pay Button */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          marginTop: 6,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View>
            <Text style={{ fontSize: 12, color: '#64748B' }}>
              {lang ? 'পরিশোধের পরিমাণ' : 'Payable Amount'}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>
              {Math.max(0, totalAmount - (wiz?.rewardPointsUsed || 0))} {lang ? 'টাকা' : 'Tk'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePayClick}
            disabled={localPaying || isPaying}
            style={{
              flex: 1,
              backgroundColor: paymentMethod === 'pay_after_service' ? '#059669' : paymentMethod === 'sslcommerz' ? '#072B56' : '#0284C7',
              height: 48,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: localPaying || isPaying ? 0.7 : 1,
              shadowColor: paymentMethod === 'pay_after_service' ? '#059669' : paymentMethod === 'sslcommerz' ? '#072B56' : '#0284C7',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            {localPaying || isPaying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '800', textAlign: 'center', paddingHorizontal: 4 }}>
                {paymentMethod === 'pay_after_service'
                  ? (lang
                      ? `বুকিং নিশ্চিত করুন (পরে ৳${Math.max(0, totalAmount - (wiz?.rewardPointsUsed || 0))} পরিশোধ) ›`
                      : `Confirm Booking (Pay ${Math.max(0, totalAmount - (wiz?.rewardPointsUsed || 0))} Tk Later) ›`)
                  : (lang
                      ? `${Math.max(0, totalAmount - (wiz?.rewardPointsUsed || 0))} টাকা পরিশোধ করুন ›`
                      : `Pay ${Math.max(0, totalAmount - (wiz?.rewardPointsUsed || 0))} Tk ›`)}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Back to Step 1 Button */}
        <TouchableOpacity
          onPress={() => setWiz(c => ({ ...c, step: 1 }))}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            marginTop: 8,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284C7' }}>
            {lang ? '← আগের ধাপে ফিরে যান (তথ্য সংশোধন)' : '← Back to Step 1 (Edit booking details)'}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
          <LockIcon size={13} color="#64748B" />
          <Text style={{ fontSize: 12, color: '#64748B' }}>
            {paymentMethod === 'pay_after_service'
              ? (lang
                  ? 'সার্ভিস সম্পন্ন হলে প্রোটোকল অফিসারের নিকট বিল পরিশোধ করবেন।'
                  : 'Pay the protocol officer after your VIP service is completed.')
              : (lang
                  ? 'পেমেন্ট সফল হলে বুকিং নিশ্চিত হবে।'
                  : 'Booking will be confirmed once payment is successful.')}
          </Text>
        </View>
      </View>

      {/* Terms & Conditions Modal */}
      <CancellationPolicyModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        lang={lang}
      />

      {/* Website Full Compliance Modal */}
      <WebsiteComplianceModal
        visible={!!complianceTab}
        initialTab={complianceTab || 'terms'}
        onClose={() => setComplianceTab(null)}
        lang={lang}
      />
    </>
  );
}
