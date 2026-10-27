// src/services/customerRewardsService.js
// Flight Care VIP Customer Reward Points & Loyalty Program

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseConfigured, firestoreRestRequest } from './firebase';
import { toFirestoreFields, fromFirestoreFields } from './firebaseSyncService';

export const REWARDS_STORAGE_PREFIX = '@flightcare_customer_rewards_';
export const WELCOME_BONUS_POINTS = 100;
export const DAILY_BONUS_POINTS = 15;
export const POINT_VALUE_BDT = 1.0; // 1 Point = 1 BDT Discount

export const REWARD_TIERS = {
  BRONZE: {
    min: 0,
    max: 199,
    key: 'BRONZE',
    nameEn: 'Bronze Club',
    nameBn: 'ব্রোঞ্জ ক্লাব',
    badgeColor: '#CD7F32',
    bgColor: '#FFF7ED',
    icon: '🥉',
    multiplier: 1.0,
  },
  SILVER: {
    min: 200,
    max: 499,
    key: 'SILVER',
    nameEn: 'Silver VIP',
    nameBn: 'সিলভার ভিআইপি',
    badgeColor: '#64748B',
    bgColor: '#F1F5F9',
    icon: '🥈',
    multiplier: 1.2,
  },
  GOLD: {
    min: 500,
    max: 999,
    key: 'GOLD',
    nameEn: 'Gold Elite',
    nameBn: 'গোল্ড এলিট',
    badgeColor: '#D97706',
    bgColor: '#FEF3C7',
    icon: '🥇',
    multiplier: 1.5,
  },
  PLATINUM: {
    min: 1000,
    max: Infinity,
    key: 'PLATINUM',
    nameEn: 'Platinum Royal',
    nameBn: 'প্লাটিনাম রয়্যাল',
    badgeColor: '#7C3AED',
    bgColor: '#F3E8FF',
    icon: '👑',
    multiplier: 2.0,
  },
};

export const getTierForPoints = points => {
  const p = Math.max(0, points || 0);
  if (p >= 1000) return REWARD_TIERS.PLATINUM;
  if (p >= 500) return REWARD_TIERS.GOLD;
  if (p >= 200) return REWARD_TIERS.SILVER;
  return REWARD_TIERS.BRONZE;
};

const getStorageKey = userId => `${REWARDS_STORAGE_PREFIX}${userId || 'guest'}`;

/**
 * Loads reward wallet for customer (with local storage & optional Firestore fallback)
 */
export const getCustomerRewards = async (userId = null) => {
  if (!userId) {
    // Unauthenticated guest preview state
    return {
      isGuest: true,
      points: 0,
      tier: REWARD_TIERS.BRONZE,
      welcomeClaimed: false,
      canClaimDaily: false,
      history: [],
      pendingBonus: WELCOME_BONUS_POINTS,
      messageEn: 'Log in to claim your 100 Welcome Points!',
      messageBn: 'আপনার ১০০ ওয়েলকাম রিওয়ার্ড পয়েন্ট ক্লেইম করতে লগ ইন করুন!',
    };
  }

  const key = getStorageKey(userId);
  let localData = null;

  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) localData = JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading rewards from local storage:', e.message);
  }

  // If already loaded locally
  if (localData) {
    let points = Number(localData.points ?? 0);
    let welcomeClaimed = Boolean(localData.welcomeClaimed);
    let history = Array.isArray(localData.history) ? localData.history : [];

    // If an existing registered customer never got welcome bonus, auto-credit it!
    if (!welcomeClaimed && points === 0) {
      points = WELCOME_BONUS_POINTS;
      welcomeClaimed = true;
      history = [
        {
          id: `rw-welcome-${Date.now()}`,
          type: 'WELCOME_BONUS',
          points: WELCOME_BONUS_POINTS,
          titleEn: 'VIP Welcome Signup Bonus',
          titleBn: 'একাউন্ট খোলার স্পেশাল ওয়েলকাম বোনাস',
          date: new Date().toISOString(),
        },
        ...history,
      ];
      localData = {
        ...localData,
        points,
        welcomeClaimed,
        totalEarned: (localData.totalEarned || 0) + WELCOME_BONUS_POINTS,
        history,
      };
      saveCustomerRewards(userId, localData).catch(() => {});
    }

    const tier = getTierForPoints(points);
    const canClaimDaily = checkCanClaimDaily(localData.lastDailyClaim);
    return {
      isGuest: false,
      ...localData,
      points,
      welcomeClaimed,
      tier,
      canClaimDaily,
      pendingBonus: welcomeClaimed ? 0 : WELCOME_BONUS_POINTS,
    };
  }

  // Initialize fresh rewards object for this user with automatic Welcome Signup Bonus
  const initial = {
    userId,
    isGuest: false,
    points: WELCOME_BONUS_POINTS,
    welcomeClaimed: true,
    lastDailyClaim: null,
    totalEarned: WELCOME_BONUS_POINTS,
    totalRedeemed: 0,
    history: [
      {
        id: `rw-welcome-${Date.now()}`,
        type: 'WELCOME_BONUS',
        points: WELCOME_BONUS_POINTS,
        titleEn: 'VIP Welcome Signup Bonus',
        titleBn: 'একাউন্ট খোলার স্পেশাল ওয়েলকাম বোনাস',
        date: new Date().toISOString(),
      },
    ],
  };

  await saveCustomerRewards(userId, initial);
  return {
    ...initial,
    tier: getTierForPoints(WELCOME_BONUS_POINTS),
    canClaimDaily: true,
    pendingBonus: 0,
  };
};

/**
 * Checks if 24 hours have elapsed since last daily claim
 */
const checkCanClaimDaily = lastClaimTimestamp => {
  if (!lastClaimTimestamp) return true;
  const last = new Date(lastClaimTimestamp).getTime();
  const now = Date.now();
  const hoursSince = (now - last) / (1000 * 60 * 60);
  return hoursSince >= 20; // Allow once every 20 hours for friendly timezone handling
};

/**
 * Saves customer rewards to local AsyncStorage & attempts Firestore sync
 */
export const saveCustomerRewards = async (userId, rewardsData) => {
  if (!userId) return;
  const key = getStorageKey(userId);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(rewardsData));
  } catch (e) {
    console.warn('Failed to save rewards to storage:', e.message);
  }

  // Attempt Firestore users/{uid} update in background
  if (isFirebaseConfigured()) {
    try {
      const payload = toFirestoreFields({
        rewardPoints: rewardsData.points,
        rewardTier: getTierForPoints(rewardsData.points).key,
        updatedAt: new Date().toISOString(),
      });
      firestoreRestRequest(`users/${encodeURIComponent(userId)}`, 'PATCH', payload).catch(() => {});
    } catch {}
  }
};

/**
 * Claims Welcome Bonus (Requires logged in user)
 */
export const claimWelcomeBonus = async (userId, userName = '') => {
  if (!userId) {
    return {
      ok: false,
      requiresLogin: true,
      messageEn: 'Please log in to claim your Welcome Points!',
      messageBn: 'ওয়েলকাম পয়েন্ট ক্লেইম করতে অনুগ্রহ করে আপনার অ্যাকাউন্টে লগ ইন করুন!',
    };
  }

  const current = await getCustomerRewards(userId);
  if (current.welcomeClaimed) {
    return {
      ok: false,
      alreadyClaimed: true,
      messageEn: 'Welcome bonus has already been claimed.',
      messageBn: 'ওয়েলকাম বোনাস ইতিমধ্যে গ্রহণ করা হয়েছে।',
      current,
    };
  }

  const newPoints = current.points + WELCOME_BONUS_POINTS;
  const historyItem = {
    id: `rw-welcome-${Date.now()}`,
    type: 'WELCOME_BONUS',
    points: WELCOME_BONUS_POINTS,
    titleEn: 'VIP Welcome Gift Bonus',
    titleBn: 'ভিআইপি ওয়েলকাম উপহার বোনাস',
    date: new Date().toISOString(),
  };

  const updated = {
    ...current,
    points: newPoints,
    welcomeClaimed: true,
    totalEarned: (current.totalEarned || 0) + WELCOME_BONUS_POINTS,
    history: [historyItem, ...(current.history || [])],
  };

  await saveCustomerRewards(userId, updated);
  return {
    ok: true,
    pointsAdded: WELCOME_BONUS_POINTS,
    newBalance: newPoints,
    tier: getTierForPoints(newPoints),
    messageEn: `🎉 Successfully claimed ${WELCOME_BONUS_POINTS} Welcome Reward Points!`,
    messageBn: `🎉 অভিনন্দন! সফলভাবে ${WELCOME_BONUS_POINTS} ওয়েলকাম রিওয়ার্ড পয়েন্ট ক্লেইম করা হয়েছে!`,
    rewards: updated,
  };
};

/**
 * Grants Welcome Signup Bonus immediately upon user account registration or social login
 */
export const grantWelcomeSignupBonus = async (userId, userName = '') => {
  if (!userId) return null;
  const key = getStorageKey(userId);
  let current = null;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) current = JSON.parse(raw);
  } catch {}

  if (current && current.welcomeClaimed && current.points >= WELCOME_BONUS_POINTS) {
    return {
      ok: true,
      alreadyGranted: true,
      points: current.points,
      tier: getTierForPoints(current.points),
      rewards: current,
    };
  }

  const basePoints = current ? (Number(current.points) || 0) : 0;
  const newPoints = current?.welcomeClaimed ? Math.max(basePoints, WELCOME_BONUS_POINTS) : basePoints + WELCOME_BONUS_POINTS;
  const historyItem = {
    id: `rw-welcome-${Date.now()}`,
    type: 'WELCOME_BONUS',
    points: WELCOME_BONUS_POINTS,
    titleEn: 'VIP Welcome Signup Bonus',
    titleBn: 'একাউন্ট খোলার স্পেশাল ওয়েলকাম বোনাস',
    date: new Date().toISOString(),
  };

  const updated = {
    userId,
    isGuest: false,
    points: newPoints,
    welcomeClaimed: true,
    lastDailyClaim: current?.lastDailyClaim || null,
    totalEarned: (current?.totalEarned || 0) + WELCOME_BONUS_POINTS,
    totalRedeemed: current?.totalRedeemed || 0,
    history: [historyItem, ...(current?.history || [])],
  };

  await saveCustomerRewards(userId, updated);
  return {
    ok: true,
    pointsAdded: WELCOME_BONUS_POINTS,
    newBalance: newPoints,
    tier: getTierForPoints(newPoints),
    rewards: updated,
  };
};

/**
 * Claims Daily Check-in Bonus (Requires logged in user)
 */
export const claimDailyBonus = async userId => {
  if (!userId) {
    return {
      ok: false,
      requiresLogin: true,
      messageEn: 'Please log in to claim your Daily Bonus!',
      messageBn: 'দৈনিক বোনাস ক্লেইম করতে লগ ইন করুন!',
    };
  }

  const current = await getCustomerRewards(userId);
  if (!checkCanClaimDaily(current.lastDailyClaim)) {
    return {
      ok: false,
      cooldown: true,
      messageEn: 'Daily bonus already claimed today. Come back tomorrow!',
      messageBn: 'আজকের দৈনিক বোনাস ক্লেইম করা হয়েছে। আগামীকাল আবার চেষ্টা করুন!',
      current,
    };
  }

  const newPoints = current.points + DAILY_BONUS_POINTS;
  const historyItem = {
    id: `rw-daily-${Date.now()}`,
    type: 'DAILY_CHECKIN',
    points: DAILY_BONUS_POINTS,
    titleEn: 'Daily App Check-In Bonus',
    titleBn: 'দৈনিক অ্যাপ চেক-ইন বোনাস',
    date: new Date().toISOString(),
  };

  const updated = {
    ...current,
    points: newPoints,
    lastDailyClaim: new Date().toISOString(),
    totalEarned: (current.totalEarned || 0) + DAILY_BONUS_POINTS,
    history: [historyItem, ...(current.history || [])],
  };

  await saveCustomerRewards(userId, updated);
  return {
    ok: true,
    pointsAdded: DAILY_BONUS_POINTS,
    newBalance: newPoints,
    tier: getTierForPoints(newPoints),
    messageEn: `✨ Claimed +${DAILY_BONUS_POINTS} Daily Reward Points!`,
    messageBn: `✨ আজকের +${DAILY_BONUS_POINTS} দৈনিক রিওয়ার্ড পয়েন্ট যুক্ত হয়েছে!`,
    rewards: updated,
  };
};

/**
 * Awards Points for a Confirmed Booking (5% points-back)
 */
export const awardBookingPoints = async (userId, bookingId, bookingAmount = 1000) => {
  if (!userId) return { ok: false, reason: 'guest_user' };

  const current = await getCustomerRewards(userId);
  const tier = getTierForPoints(current.points);
  // Calculate points: 5% of amount * tier multiplier (min 25 pts)
  const basePoints = Math.max(25, Math.round((Number(bookingAmount) || 1000) * 0.05));
  const awardedPoints = Math.round(basePoints * (tier.multiplier || 1.0));

  const historyItem = {
    id: `rw-book-${Date.now()}`,
    type: 'BOOKING_CASHBACK',
    points: awardedPoints,
    bookingId,
    titleEn: `Flight Protocol Booking Reward (#${bookingId})`,
    titleBn: `ফ্লাইট বুকিং ক্যাশব্যাক রিওয়ার্ড (#${bookingId})`,
    date: new Date().toISOString(),
  };

  const updated = {
    ...current,
    points: current.points + awardedPoints,
    totalEarned: (current.totalEarned || 0) + awardedPoints,
    history: [historyItem, ...(current.history || [])],
  };

  await saveCustomerRewards(userId, updated);
  return {
    ok: true,
    pointsAdded: awardedPoints,
    newBalance: updated.points,
    rewards: updated,
  };
};

/**
 * Redeems points for instant discount at checkout
 */
export const redeemPointsForBooking = async (userId, pointsToUse, bookingId) => {
  if (!userId) return { ok: false, reason: 'guest' };
  const current = await getCustomerRewards(userId);
  const pts = Math.min(current.points, Math.max(0, Number(pointsToUse) || 0));

  if (pts <= 0) return { ok: true, discountBdt: 0 };

  const discountBdt = Math.round(pts * POINT_VALUE_BDT);
  const newBalance = Math.max(0, current.points - pts);

  const historyItem = {
    id: `rw-redeem-${Date.now()}`,
    type: 'REDEEM_DISCOUNT',
    points: -pts,
    bookingId,
    titleEn: `Used points for discount on Booking #${bookingId}`,
    titleBn: `বুকিংয়ে ৳${discountBdt} ছাড়ের জন্য পয়েন্ট ব্যবহার (#${bookingId})`,
    date: new Date().toISOString(),
  };

  const updated = {
    ...current,
    points: newBalance,
    totalRedeemed: (current.totalRedeemed || 0) + pts,
    history: [historyItem, ...(current.history || [])],
  };

  await saveCustomerRewards(userId, updated);
  return {
    ok: true,
    discountBdt,
    pointsDeducted: pts,
    newBalance,
    rewards: updated,
  };
};

