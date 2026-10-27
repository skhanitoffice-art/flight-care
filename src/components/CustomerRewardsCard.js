// src/components/CustomerRewardsCard.js
// Flight Care Customer Rewards & Loyalty Points Card

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import {
  getCustomerRewards,
  claimWelcomeBonus,
  claimDailyBonus,
  REWARD_TIERS,
} from '../services/customerRewardsService';

export default function CustomerRewardsCard({
  customerSession,
  lang = 0,
  openAuthView,
  setTab,
  onPointsUpdated,
  compact = false,
}) {
  const isBn = Boolean(lang);
  const isLoggedIn = Boolean(customerSession?.user?.role === 'customer');
  const userId = customerSession?.user?.id || customerSession?.user?.email || null;

  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [notice, setNotice] = useState('');

  const loadRewardsData = async () => {
    setLoading(true);
    try {
      const data = await getCustomerRewards(userId);
      setRewards(data);
      if (onPointsUpdated) onPointsUpdated(data);
    } catch (err) {
      console.warn('Failed to load customer rewards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewardsData();
  }, [userId]);

  const handleClaimWelcome = async () => {
    if (!isLoggedIn) {
      // Must log in to claim!
      showLoginRequiredAlert(
        isBn
          ? '১০০ ওয়েলকাম রিওয়ার্ড পয়েন্ট ক্লেইম করতে অনুগ্রহ করে আপনার অ্যাকাউন্টে লগ ইন বা সাইন আপ করুন।'
          : 'Please log in or sign up to claim your 100 Welcome Reward Points!'
      );
      return;
    }

    setClaiming(true);
    try {
      const res = await claimWelcomeBonus(userId, customerSession?.user?.name);
      if (res.ok) {
        setNotice(res.messageBn && isBn ? res.messageBn : res.messageEn);
        setRewards(res.rewards);
        if (onPointsUpdated) onPointsUpdated(res.rewards);
      } else {
        setNotice(res.messageBn && isBn ? res.messageBn : res.messageEn);
      }
    } finally {
      setClaiming(false);
      setTimeout(() => setNotice(''), 4500);
    }
  };

  const handleClaimDaily = async () => {
    if (!isLoggedIn) {
      showLoginRequiredAlert(
        isBn
          ? 'দৈনিক রিওয়ার্ড পয়েন্ট ক্লেইম করতে আপনাকে প্রথমে লগ ইন করতে হবে।'
          : 'You must log in first to claim daily reward points!'
      );
      return;
    }

    setClaiming(true);
    try {
      const res = await claimDailyBonus(userId);
      if (res.ok) {
        setNotice(res.messageBn && isBn ? res.messageBn : res.messageEn);
        setRewards(res.rewards);
        if (onPointsUpdated) onPointsUpdated(res.rewards);
      } else {
        setNotice(res.messageBn && isBn ? res.messageBn : res.messageEn);
      }
    } finally {
      setClaiming(false);
      setTimeout(() => setNotice(''), 4500);
    }
  };

  const showLoginRequiredAlert = msg => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm(
        `${msg}\n\n${isBn ? 'আপনি কি এখন সাইন ইন পেজে যেতে চান?' : 'Would you like to go to the Sign In page now?'}`
      );
      if (ok) {
        if (openAuthView) openAuthView('login');
        if (setTab) setTab('profile');
      }
    } else {
      Alert.alert(
        isBn ? 'লগ ইন প্রয়োজন 🔒' : 'Login Required 🔒',
        msg,
        [
          { text: isBn ? 'পরে' : 'Later', style: 'cancel' },
          {
            text: isBn ? 'লগ ইন করুন' : 'Log In',
            onPress: () => {
              if (openAuthView) openAuthView('login');
              if (setTab) setTab('profile');
            },
          },
        ]
      );
    }
  };

  const currentPoints = rewards?.points || 0;
  const currentTier = rewards?.tier || REWARD_TIERS.BRONZE;

  // COMPACT HOME BANNER WIDGET
  if (compact) {
    if (!isLoggedIn) {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleClaimWelcome}
          style={{
            backgroundColor: '#FEF3C7',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 14,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: '#FDE68A',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={{ fontSize: 20 }}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
                {isBn ? '১০০ রিওয়ার্ড পয়েন্ট অপেক্ষা করছে!' : '100 Reward Points Waiting!'}
              </Text>
              <Text style={{ fontSize: 11.5, color: '#B45309' }}>
                {isBn ? 'পয়েন্ট ক্লেইম করতে লগ ইন করুন' : 'Log in to claim your gift'}
              </Text>
            </View>
          </View>
          <View
            style={{
              backgroundColor: '#D97706',
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
              {isBn ? 'লগ ইন ও ক্লেইম ›' : 'Log in & Claim ›'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (setTab) setTab('profile');
        }}
        style={{
          backgroundColor: '#F0FDF4',
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: '#BBF7D0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={{ fontSize: 20 }}>⭐</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#166534' }}>
                {currentPoints} {isBn ? 'পয়েন্ট' : 'pts'}
              </Text>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#15803D' }}>
                (৳{currentPoints} {isBn ? 'ছাড় সমমূল্য' : 'off'})
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#16A34A' }}>
              {isBn ? currentTier.nameBn : currentTier.nameEn} · {isBn ? 'ওয়ালেট দেখতে ট্যাপ করুন' : 'Tap to view wallet'}
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: '#16A34A',
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
            {isBn ? 'রিওয়ার্ড ওয়ালেট ›' : 'Rewards ›'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // FULL PROFILE WALLET CARD
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Notice alert */}
      {notice ? (
        <View
          style={{
            backgroundColor: '#ECFDF5',
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#A7F3D0',
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#065F46' }}>
            {notice}
          </Text>
        </View>
      ) : null}

      {/* Top Header Row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: currentTier.bgColor || '#FEF3C7',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22 }}>{currentTier.icon || '🎁'}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
              {isBn ? 'গ্রাহক রিওয়ার্ড ওয়ালেট' : 'Customer Rewards & Loyalty'}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>
              {isBn ? '১ পয়েন্ট = ১ টাকা ছাড় পরবর্তী বুকিংয়ে' : '1 point = 1 BDT discount on flights'}
            </Text>
          </View>
        </View>

        {/* Tier Badge */}
        <View
          style={{
            backgroundColor: currentTier.bgColor,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: currentTier.badgeColor,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 12 }}>{currentTier.icon}</Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: currentTier.badgeColor,
            }}
          >
            {isBn ? currentTier.nameBn : currentTier.nameEn}
          </Text>
        </View>
      </View>

      {/* Points Balance Banner */}
      <View
        style={{
          backgroundColor: '#0F172A',
          borderRadius: 14,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {isBn ? 'বর্তমান রিওয়ার্ড পয়েন্ট ব্যালেন্স' : 'Current Reward Balance'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <Text style={{ fontSize: 32, fontWeight: '900', color: '#F8FAFC' }}>
            {currentPoints}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#38BDF8' }}>
            {isBn ? 'পয়েন্ট' : 'Points'}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#94A3B8', marginLeft: 'auto' }}>
            ≈ ৳{currentPoints} {isBn ? 'ছাড় সমমূল্য' : 'BDT Value'}
          </Text>
        </View>
      </View>

      {/* ACTION 1: WELCOME BONUS CLAIM */}
      {!rewards?.welcomeClaimed && (
        <View
          style={{
            backgroundColor: '#FEF3C7',
            padding: 14,
            borderRadius: 12,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: '#FDE68A',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <View style={{ flex: 1, minWidth: 180 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>🎁</Text>
              <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#92400E' }}>
                {isBn ? '১০০ পয়েন্ট ওয়েলকাম গিফট!' : '100 Pts Welcome Gift!'}
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: '#B45309', marginTop: 2 }}>
              {isLoggedIn
                ? (isBn ? 'নতুন গ্রাহক হিসেবে এক ক্লিকে ক্লেইম করুন।' : 'Claim your free member bonus.')
                : (isBn ? '🔒 ক্লেইম করতে লগ ইন বা সাইন আপ করুন।' : '🔒 Must be logged in to claim.')}
            </Text>
          </View>

          <TouchableOpacity
            disabled={claiming}
            onPress={handleClaimWelcome}
            style={{
              backgroundColor: isLoggedIn ? '#D97706' : '#0F172A',
              paddingVertical: 9,
              paddingHorizontal: 14,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {claiming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: 12, color: '#FFFFFF' }}>
                {isLoggedIn ? '⚡' : '🔒'}
              </Text>
            )}
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
              {isLoggedIn
                ? (isBn ? 'ক্লেইম করুন (+১০০)' : 'Claim Now (+100)')
                : (isBn ? 'লগ ইন করে ক্লেইম করুন' : 'Log in to Claim')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* WELCOME BONUS ACTIVE BADGE */}
      {rewards?.welcomeClaimed && (
        <View
          style={{
            backgroundColor: '#F0FDF4',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#BBF7D0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={{ fontSize: 18 }}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>
                {isBn ? '১০০ ওয়েলকাম পয়েন্ট সফলভাবে যুক্ত রয়েছে!' : '100 Welcome Points Credited!'}
              </Text>
              <Text style={{ fontSize: 11, color: '#15803D' }}>
                {isBn ? 'একাউন্ট বোনাস আপনার ওয়ালেটে সংরক্ষিত আছে' : 'Signup bonus active in your wallet'}
              </Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC' }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#166534' }}>+100 pts ✔</Text>
          </View>
        </View>
      )}

      {/* ACTION 2: DAILY CHECK-IN BONUS */}
      <View
        style={{
          backgroundColor: '#F8FAFC',
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <View style={{ flex: 1, minWidth: 180 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>📅</Text>
            <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#1E293B' }}>
              {isBn ? 'দৈনিক অ্যাপ চেক-ইন বোনাস (+১৫)' : 'Daily Check-in Bonus (+15)'}
            </Text>
          </View>
          <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
            {isLoggedIn
              ? (rewards?.canClaimDaily
                  ? (isBn ? 'প্রতিদিন অ্যাপ ভিজিট করে বোনাস পয়েন্ট নিন।' : 'Claim 15 points every day.')
                  : (isBn ? '✓ আজকের বোনাস ক্লেইম করা হয়েছে!' : '✓ Claimed for today!'))
              : (isBn ? '🔒 পয়েন্ট ক্লেইম করতে লগ ইন করুন।' : '🔒 Log in required to claim.')}
          </Text>
        </View>

        <TouchableOpacity
          disabled={claiming || (isLoggedIn && !rewards?.canClaimDaily)}
          onPress={handleClaimDaily}
          style={{
            backgroundColor:
              isLoggedIn && !rewards?.canClaimDaily
                ? '#E2E8F0'
                : isLoggedIn
                ? '#0284C7'
                : '#0F172A',
            paddingVertical: 9,
            paddingHorizontal: 14,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {claiming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 12, color: isLoggedIn && !rewards?.canClaimDaily ? '#94A3B8' : '#FFFFFF' }}>
              {isLoggedIn ? (rewards?.canClaimDaily ? '✨' : '✓') : '🔒'}
            </Text>
          )}
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '800',
              color: isLoggedIn && !rewards?.canClaimDaily ? '#64748B' : '#FFFFFF',
            }}
          >
            {isLoggedIn
              ? (rewards?.canClaimDaily
                  ? (isBn ? 'দৈনিক বোনাস নিন' : 'Claim Daily')
                  : (isBn ? 'ক্লেইম করা হয়েছে' : 'Already Claimed'))
              : (isBn ? 'লগ ইন করে ক্লেইম করুন' : 'Log in to Claim')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Booking Points Note */}
      <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 11.5, color: '#64748B', lineHeight: 16 }}>
          ✈️ {isBn
            ? 'প্রতিটি সফল ফ্লাইট প্রটোকল বুকিংয়ে মোট বিলের ৫% রিওয়ার্ড পয়েন্ট সরাসরি আপনার অ্যাকাউন্টে জমা হবে।'
            : 'Earn 5% points-back automatically on every confirmed airport protocol booking.'}
        </Text>
      </View>
    </View>
  );
}

