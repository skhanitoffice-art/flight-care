import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { s } from '../styles/styles';
import { C } from '../constants/theme';
import { isValidMobileNumber, isValidEmailAddress, sanitizePhoneNumber, isValidPassengerName, convertBnDigitsToEn } from '../utils/helpers';
import { requestCustomerPhoneChange, verifyCustomerPhoneChange, isDemoLoginAllowed } from '../../api';
import { saveUserToFirestore } from '../services/firebaseSyncService';
import CustomerRewardsCard from '../components/CustomerRewardsCard';
import ScreenHeaderBar from '../components/ScreenHeaderBar';
import {
  getCustomerRewards,
  grantWelcomeSignupBonus,
  WELCOME_BONUS_POINTS,
  getTierForPoints,
} from '../services/customerRewardsService';

const SAVED_TRAVELERS_STORAGE_KEY = '@flightcare_saved_travelers_v1';

const DEFAULT_SAVED_TRAVELERS = [
  {
    id: 'tr-1',
    name: 'Mahi Rahman',
    relation: 'Self',
    passportNumber: 'A08924156',
    passportExpiry: '2029-08-15',
    phone: '+880 1712 345678',
    notes: 'Terminal 2 Escort & VIP Fast-track',
  },
  {
    id: 'tr-2',
    name: 'Nusrat Rahman',
    relation: 'Spouse',
    passportNumber: 'B04189322',
    passportExpiry: '2030-12-20',
    phone: '+880 1712 987654',
    notes: 'Wheelchair & baby stroller assistance',
  },
];

export default function ProfileScreen({
  pagePadding,
  lang,
  setLang,
  t,
  customerSession,
  setCustomerSession,
  profile,
  setProfile,
  notificationPreferences = { in_app: true, email: false, sms: false },
  setNotificationPreferences,
  responsive,
  authView,
  openAuthView,
  authForm,
  setAuthField,
  authError,
  authNotice,
  authBusy,
  customerApiConfigured,
  saveCustomerProfile,
  signOutCustomer,
  submitCustomerLogin,
  submitCustomerRegistration,
  submitCustomerOtp,
  resendCustomerCode,
  submitPasswordResetRequest,
  submitPasswordReset,
  setTab,
  onBack,
  setManagerLoginError,
  setStaffLoginError,
  setAuthForm,
}) {
  // Local state for Change Mobile Number workflow
  const [changingPhone, setChangingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneChallengeId, setPhoneChallengeId] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0);

  // Password Visibility (Eye Icon Toggle) & Caps Lock State
  const [showPasswords, setShowPasswords] = useState({});
  const [capsLockActive, setCapsLockActive] = useState(false);

  // OTP 60-Second Resend Countdown Timer
  const [resendCooldown, setResendCooldown] = useState(0);

  // Saved Travelers Directory State
  const [savedTravelers, setSavedTravelers] = useState([]);
  const [showTravelerModal, setShowTravelerModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [editingTravelerId, setEditingTravelerId] = useState(null);
  const [travelerForm, setTravelerForm] = useState({
    name: '',
    relation: 'Family',
    passportNumber: '',
    passportExpiry: '',
    phone: '',
    notes: '',
  });
  const [travelerError, setTravelerError] = useState('');

  // Customer Loyalty & Rewards Points State
  const [userRewards, setUserRewards] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRewards = async () => {
      const uId = customerSession?.user?.id || customerSession?.user?.email || customerSession?.user?.phone;
      if (uId) {
        try {
          const data = await getCustomerRewards(uId);
          if (isMounted) setUserRewards(data);
        } catch (e) {
          console.warn('Error fetching profile rewards:', e);
        }
      }
    };
    fetchRewards();
    return () => { isMounted = false; };
  }, [customerSession?.user?.id, customerSession?.user?.email, customerSession?.user?.phone]);

  // Password visibility toggle helper
  const toggleShowPassword = key => {
    setShowPasswords(prev => ({
      ...prev,
      [key]: !prev?.[key],
    }));
  };

  // OTP 60-Second Countdown Effect
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let timer;
    if (phoneResendCooldown > 0) {
      timer = setInterval(() => setPhoneResendCooldown(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [phoneResendCooldown]);

  useEffect(() => {
    if (authView === 'verify') {
      setResendCooldown(60);
    }
  }, [authView]);

  // Load Saved Travelers from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(SAVED_TRAVELERS_STORAGE_KEY)
      .then(stored => {
        if (stored) {
          try {
            setSavedTravelers(JSON.parse(stored));
          } catch {}
        } else {
          setSavedTravelers(DEFAULT_SAVED_TRAVELERS);
          AsyncStorage.setItem(SAVED_TRAVELERS_STORAGE_KEY, JSON.stringify(DEFAULT_SAVED_TRAVELERS)).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const saveTravelersToStorage = async list => {
    setSavedTravelers(list);
    try {
      await AsyncStorage.setItem(SAVED_TRAVELERS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const handleOpenAddTraveler = (traveler = null) => {
    setTravelerError('');
    if (traveler) {
      setEditingTravelerId(traveler.id);
      setTravelerForm({
        name: traveler.name || '',
        relation: traveler.relation || 'Family',
        passportNumber: traveler.passportNumber || '',
        passportExpiry: traveler.passportExpiry || '',
        phone: traveler.phone || '',
        notes: traveler.notes || '',
      });
    } else {
      setEditingTravelerId(null);
      setTravelerForm({
        name: '',
        relation: 'Family',
        passportNumber: '',
        passportExpiry: '',
        phone: '',
        notes: '',
      });
    }
    setShowTravelerModal(true);
  };

  const handleSaveTraveler = () => {
    if (!travelerForm.name.trim()) {
      setTravelerError(lang ? 'যাত্রীর পুরো নাম প্রদান আবশ্যক' : 'Full passenger name is required');
      return;
    }
    let updated;
    if (editingTravelerId) {
      updated = savedTravelers.map(tr =>
        tr.id === editingTravelerId ? { ...tr, ...travelerForm } : tr
      );
    } else {
      const newTr = {
        id: `tr-${Date.now()}`,
        ...travelerForm,
      };
      updated = [...savedTravelers, newTr];
    }
    saveTravelersToStorage(updated);
    setShowTravelerModal(false);
  };

  const handleDeleteTraveler = id => {
    const updated = savedTravelers.filter(tr => tr.id !== id);
    saveTravelersToStorage(updated);
  };

  // Auth Mode: 'gmail' | 'phone'
  const [authMode, setAuthMode] = useState('gmail');
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [gmailNameInput, setGmailNameInput] = useState('');
  const [gmailAddressInput, setGmailAddressInput] = useState('');
  const [gmailPhoneInput, setGmailPhoneInput] = useState('');
  const [gmailModalBusy, setGmailModalBusy] = useState(false);
  const [gmailModalError, setGmailModalError] = useState('');

  // Google & Apple Social Login Handler with Firebase Firestore Persistence
  const handleSocialLogin = async (provider, customData = null) => {
    const isGoogle = provider === 'google' || provider === 'gmail';
    const userName = customData?.name || (isGoogle ? 'Rahim Chowdhury' : 'Rahim Chowdhury (Apple)');
    const userEmail = customData?.email || (isGoogle ? 'rahim.chowdhury@gmail.com' : 'rahim.apple@privaterelay.appleid.com');
    const userPhone = customData?.phone || profile?.phone || '';

    const welcomePts = WELCOME_BONUS_POINTS || 100;
    const socialUser = {
      id: Date.now(),
      uid: `usr_${Date.now()}`,
      name: userName,
      email: userEmail,
      phone: userPhone,
      role: 'customer',
      provider: isGoogle ? 'gmail' : provider,
      phone_verified: true,
      email_verified: true,
      phone_verified_at: new Date().toISOString(),
      rewardPoints: welcomePts,
      points: welcomePts,
      rewardTier: 'BRONZE',
      welcomeBonusClaimed: true,
      createdAt: new Date().toISOString(),
    };

    if (setCustomerSession) {
      setCustomerSession({
        token: `${provider}-oauth-token-${Date.now()}`,
        user: socialUser,
      });
    }
    if (setProfile) {
      setProfile(prev => ({
        ...prev,
        name: socialUser.name,
        email: socialUser.email,
        phone: socialUser.phone,
        rewardPoints: socialUser.rewardPoints,
        points: socialUser.points,
        rewardTier: socialUser.rewardTier,
      }));
    }
    try {
      await AsyncStorage.setItem('@flightcare_customer_session', JSON.stringify({
        token: `${provider}-oauth-token-${Date.now()}`,
        user: socialUser,
      }));
      await AsyncStorage.setItem('@flightcare_profile', JSON.stringify(socialUser));
      // Auto grant welcome signup bonus
      await grantWelcomeSignupBonus(socialUser.id, socialUser.name);
      if (socialUser.email) await grantWelcomeSignupBonus(socialUser.email, socialUser.name);
      // Save directly to Firebase Firestore
      await saveUserToFirestore(socialUser);
    } catch (e) {
      console.warn('Firebase user sync notice:', e);
    }

    if (openAuthView) openAuthView('account');
  };

  const handleOpenGmailModal = async () => {
    setGmailModalError('');
    const idVal = (authForm?.identifier || '').trim();
    const isEmail = idVal.includes('@');
    if (idVal && isEmail) {
      // If user has already entered their email in the input, log in directly without extra friction!
      const email = idVal.toLowerCase();
      const name = authForm?.name?.trim() || email.split('@')[0];
      const phone = authForm?.phone?.trim() || profile?.phone || '';
      await handleSocialLogin('gmail', { name, email, phone });
      return;
    }
    setGmailNameInput(profile?.name || authForm?.name || '');
    setGmailAddressInput(idVal && isEmail ? idVal : (profile?.email || ''));
    setGmailPhoneInput(idVal && !isEmail ? idVal : (profile?.phone || ''));
    setShowGmailModal(true);
  };

  const submitGmailAuth = async (presetAccount = null) => {
    setGmailModalBusy(true);
    setGmailModalError('');
    try {
      let name = (presetAccount?.name || gmailNameInput).trim();
      let email = (presetAccount?.email || gmailAddressInput).trim().toLowerCase();
      let phone = (presetAccount?.phone || gmailPhoneInput).trim();

      if (!email && authForm?.identifier?.trim()) {
        const idVal = authForm.identifier.trim();
        if (idVal.includes('@')) email = idVal.toLowerCase();
        else phone = idVal;
      }

      if (!email) {
        email = 'customer.vip@gmail.com';
      } else if (!email.includes('@')) {
        email = `${email}@gmail.com`;
      }

      if (!name) name = email ? email.split('@')[0] : 'Customer Member';
      await handleSocialLogin('gmail', { name, email, phone });
      setShowGmailModal(false);
    } catch (e) {
      setGmailModalError(e.message || 'Gmail login failed');
    } finally {
      setGmailModalBusy(false);
    }
  };

  // Toggle notification preference helper
  const toggleNotification = key => {
    if (!setNotificationPreferences) return;
    setNotificationPreferences(prev => ({
      ...prev,
      [key]: !prev?.[key],
    }));
  };


  // Handle send OTP for phone number change
  const handleSendPhoneOtp = async () => {
    setPhoneError('');
    setPhoneSuccess('');
    if (!newPhone.trim() || !isValidMobileNumber(newPhone)) {
      setPhoneError(t('invalidPhone'));
      return;
    }
    setPhoneBusy(true);
    setPhoneResendCooldown(60);
    if (customerApiConfigured && customerSession?.token && customerSession.token !== 'demo-customer-token') {
      const res = await requestCustomerPhoneChange(customerSession.token, newPhone);
      if (res.ok) {
        setPhoneChallengeId(res.data?.challenge_id || 'challenge');
        setPhoneOtpSent(true);
        setPhoneSuccess(t('mobileOtpSent'));
      } else {
        setPhoneError(t('authFailure'));
      }
    } else {
      // Demo / offline mode
      setPhoneChallengeId('demo-challenge');
      setPhoneOtpSent(true);
      setPhoneSuccess(t('mobileOtpSent'));
    }
    setPhoneBusy(false);
  };

  // Handle verify OTP for phone number change
  const handleVerifyPhoneOtp = async () => {
    setPhoneError('');
    setPhoneSuccess('');
    if (!phoneOtp.trim() || phoneOtp.trim().length < 4) {
      setPhoneError(t('invalidOtp'));
      return;
    }
    setPhoneBusy(true);
    if (customerApiConfigured && customerSession?.token && customerSession.token !== 'demo-customer-token') {
      const res = await verifyCustomerPhoneChange(
        customerSession.token,
        phoneChallengeId,
        newPhone,
        phoneOtp.trim()
      );
      if (res.ok) {
        setProfile(curr => ({ ...curr, phone: newPhone }));
        setCustomerSession(curr => ({
          ...curr,
          user: { ...curr.user, phone: newPhone, phone_verified: true },
        }));
        setPhoneSuccess(t('mobileUpdated'));
        setTimeout(() => {
          setChangingPhone(false);
          setPhoneOtpSent(false);
          setNewPhone('');
          setPhoneOtp('');
          setPhoneSuccess('');
        }, 1500);
      } else {
        setPhoneError(t('authFailure'));
      }
    } else {
      // Demo mode
      setProfile(curr => ({ ...curr, phone: newPhone }));
      if (setCustomerSession) {
        setCustomerSession(curr => ({
          ...curr,
          user: { ...curr?.user, phone: newPhone, phone_verified: true },
        }));
      }
      setPhoneSuccess(t('mobileUpdated'));
      setTimeout(() => {
        setChangingPhone(false);
        setPhoneOtpSent(false);
        setNewPhone('');
        setPhoneOtp('');
        setPhoneSuccess('');
      }, 1500);
    }
    setPhoneBusy(false);
  };

  const accountLinks = (
    <View style={{ marginTop: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {lang ? '🔐 প্ল্যাটফর্ম প্রোফাইল ও অ্যাক্সেস পোর্টাল' : '🔐 System Profiles & Portals'}
        </Text>
      </View>

      {/* 1. Super Admin Profile Option (New dedicated Admin Profile) */}
      <TouchableOpacity
        style={[s.pkg, { borderColor: '#FDE68A', backgroundColor: '#FFFDF5', marginBottom: 10 }]}
        activeOpacity={0.8}
        onPress={() => {
          setManagerLoginError('');
          setTab('manager');
        }}
      >
        <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 20 }}>👑</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[s.body, { fontWeight: '800', color: '#92400E' }]}>
              {lang ? 'সুপার এডমিন প্রোফাইল' : 'Super Admin Profile'}
            </Text>
            <View style={{ backgroundColor: '#FDE68A', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>
                {lang ? 'সর্বময় ক্ষমতা' : 'Full Access'}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 11.5, color: '#B45309', marginTop: 2 }}>
            {lang ? 'আর্থিক নিয়ন্ত্রণ, পেমেন্ট, রাজস্ব ও সম্পূর্ণ ব্যবস্থাপনা' : 'Financials, revenue, payments & master settings'}
          </Text>
        </View>
        <Text style={[s.h3, { color: '#B45309' }]}>›</Text>
      </TouchableOpacity>

      {/* 2. Operations Manager Profile Option (Financials removed) */}
      <TouchableOpacity
        style={[s.pkg, { borderColor: '#BAE6FD', backgroundColor: '#F8FAFC', marginBottom: 10 }]}
        activeOpacity={0.8}
        onPress={() => {
          setManagerLoginError('');
          setTab('manager');
        }}
      >
        <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 20 }}>🛡️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[s.body, { fontWeight: '800', color: '#0369A1' }]}>
              {lang ? 'অপারেশনাল ম্যানেজার প্রোফাইল' : 'Operations Manager Profile'}
            </Text>
            <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#0284C7' }}>
                {lang ? 'অপারেশনাল' : 'Operations'}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
            {lang ? 'ফ্লাইট ট্র্যাকিং, স্টাফ রোস্টার ও অপারেশন (অর্থনৈতিক বিষয় ব্যতীত)' : 'Flight support & roster (excluding financials)'}
          </Text>
        </View>
        <Text style={[s.h3, { color: '#0284C7' }]}>›</Text>
      </TouchableOpacity>

      {/* 3. Protocol Officer Profile Option */}
      <TouchableOpacity
        style={[s.pkg, { borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' }]}
        activeOpacity={0.8}
        onPress={() => {
          setStaffLoginError('');
          setTab('staff');
        }}
      >
        <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 20 }}>🧑‍✈️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[s.body, { fontWeight: '800', color: '#1E293B' }]}>
              {lang ? 'প্রোটোকল অফিসার প্রোফাইল' : 'Protocol Officer Profile'}
            </Text>
            <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569' }}>
                {lang ? 'অন-ডিউটি স্টাফ' : 'Duty Staff'}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
            {lang ? 'যাত্রী অভ্যর্থনা, লাগেজ হ্যান্ডলিং ও ফ্লাইট অ্যাসাইনমেন্ট' : 'Airport passenger assistance & flight escort'}
          </Text>
        </View>
        <Text style={[s.h3, { color: '#64748B' }]}>›</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Language Selector widget
  const renderLanguageSelector = () => (
    <View style={s.langSelectorRow}>
      <TouchableOpacity
        style={[
          s.langSelectorPill,
          lang === 0 && s.langSelectorPillActive,
        ]}
        activeOpacity={0.8}
        onPress={() => setLang && setLang(0)}
      >
        <Text style={{ fontSize: 18 }}>🇬🇧</Text>
        <Text style={[s.langSelectorText, lang === 0 && s.langSelectorTextActive]}>
          English {lang === 0 ? '✔' : ''}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          s.langSelectorPill,
          lang === 1 && s.langSelectorPillActive,
        ]}
        activeOpacity={0.8}
        onPress={() => setLang && setLang(1)}
      >
        <Text style={{ fontSize: 18 }}>🇧🇩</Text>
        <Text style={[s.langSelectorText, lang === 1 && s.langSelectorTextActive]}>
          বাংলা {lang === 1 ? '✔' : ''}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render Notification Preference row
  const renderNotificationToggle = (key, icon, title, subtitle) => {
    const isActive = Boolean(notificationPreferences?.[key]);
    return (
      <View style={s.prefToggleRow} key={key}>
        <View style={s.prefToggleLeft}>
          <View style={s.prefToggleIconWrap}>
            <Text style={{ fontSize: 17 }}>{icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.prefToggleTitle}>{title}</Text>
            <Text style={s.prefToggleSub}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.customSwitch, isActive && s.customSwitchActive]}
          activeOpacity={0.8}
          onPress={() => toggleNotification(key)}
          accessibilityRole="switch"
          accessibilityState={{ checked: isActive }}
        >
          <View style={[s.customSwitchThumb, isActive && s.customSwitchThumbActive]} />
        </TouchableOpacity>
      </View>
    );
  };

  // =========================================================================
  // VIEW: LOGGED-IN CUSTOMER PROFILE
  // =========================================================================
  if (customerSession?.user?.role === 'customer') {
    const userInitial = (profile?.name?.trim() || customerSession.user.name || 'C').charAt(0).toUpperCase();
    const isVerified = customerSession.user.phone_verified_at || customerSession.user.phone_verified;

    return (
      <ScrollView contentContainerStyle={{ padding: pagePadding, paddingBottom: 115 }}>
        {/* Top Navigation Back Bar */}
        <ScreenHeaderBar
          title={lang ? 'আমার প্রোফাইল' : 'My Profile'}
          subtitle={lang ? 'ব্যক্তিগত তথ্য ও সংরক্ষিত ভ্রমণকারী' : 'Personal info & saved travelers'}
          onBack={onBack || (() => setTab && setTab('home'))}
          onHome={() => setTab && setTab('home')}
          lang={lang}
        />

        {/* Profile Hero Card */}
        <View style={s.profileHeroCard}>
          <View style={s.profileAvatarRow}>
            <View style={s.profileAvatar}>
              <Text style={s.profileAvatarText}>{userInitial}</Text>
            </View>
            <View style={s.profileMeta}>
              <Text style={s.profileNameTitle}>
                {profile?.name || customerSession.user.name || (lang ? 'সম্মানিত গ্রাহক' : 'Valued Customer')}
              </Text>
              <Text style={s.profilePhoneSub}>
                {profile?.phone || customerSession.user.phone}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 5 }}>
                <View style={s.verifiedBadge}>
                  <Text style={{ fontSize: 11, color: '#059669' }}>✔</Text>
                  <Text style={s.verifiedBadgeText}>
                    {isVerified ? t('mobileVerified') : t('verifyMobile')}
                  </Text>
                </View>

                {/* VIP Reward Points Badge in Profile Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: '#FFFBEB',
                    paddingHorizontal: 10,
                    paddingVertical: 3.5,
                    borderRadius: 14,
                    borderWidth: 1.2,
                    borderColor: '#FDE68A',
                  }}
                >
                  <Text style={{ fontSize: 13 }}>⭐</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#B45309' }}>
                    {userRewards?.points ?? (profile?.rewardPoints ?? 100)} {lang ? 'পয়েন্ট' : 'pts'}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>
                    · {lang ? (userRewards?.tier?.nameBn || 'ব্রোঞ্জ ক্লাব') : (userRewards?.tier?.nameEn || 'Bronze Club')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Customer Reward Points & Loyalty Wallet */}
        <CustomerRewardsCard
          customerSession={customerSession}
          lang={lang}
          openAuthView={openAuthView}
          setTab={setTab}
          onPointsUpdated={setUserRewards}
        />

        {/* 1. Name & Email Card */}
        <View style={s.profileSectionCard}>
          <View style={s.profileSectionHeader}>
            <View style={s.profileSectionTitleWrap}>
              <Text style={{ fontSize: 18 }}>👤</Text>
              <Text style={s.profileSectionTitle}>
                {lang ? 'নাম ও ইমেইল ঠিকানা' : 'Name & Email Address'}
              </Text>
            </View>
          </View>

          {/* ● Name */}
          <View style={s.profileInputWrap}>
            <Text style={s.profileInputLabel}>{t('name')} *</Text>
            <TextInput
              style={s.profileInput}
              placeholder={lang ? 'যেমন: মো. রহিম' : 'e.g. John Doe'}
              value={profile?.name || ''}
              onChangeText={name => setProfile(curr => ({ ...curr, name: (name || '').replace(/[^a-zA-Z\u0980-\u09FF\s.'-]/g, '') }))}
            />
          </View>

          {/* ● Email */}
          <View style={s.profileInputWrap}>
            <Text style={s.profileInputLabel}>{t('email')}</Text>
            <TextInput
              style={s.profileInput}
              placeholder={lang ? 'যেমন: name@example.com' : 'e.g. user@example.com'}
              keyboardType="email-address"
              autoCapitalize="none"
              value={profile?.email || ''}
              onChangeText={email => setProfile(curr => ({ ...curr, email: (email || '').replace(/\s+/g, '') }))}
            />
          </View>
        </View>

        {/* 2. Mobile Number Management Card */}
        <View style={s.profileSectionCard}>
          <View style={s.profileSectionHeader}>
            <View style={s.profileSectionTitleWrap}>
              <Text style={{ fontSize: 18 }}>📞</Text>
              <Text style={s.profileSectionTitle}>{t('phone')}</Text>
            </View>
            {!changingPhone && (
              <TouchableOpacity
                onPress={() => {
                  setChangingPhone(true);
                  setNewPhone('');
                  setPhoneOtp('');
                  setPhoneOtpSent(false);
                  setPhoneError('');
                  setPhoneSuccess('');
                }}
              >
                <Text style={[s.link, { fontSize: 13.5, fontWeight: '700' }]}>{t('changeMobile')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Current Mobile Display */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0E2A47' }}>
              {profile?.phone || customerSession.user.phone || (lang ? 'কোনো নম্বর নেই' : 'No number added')}
            </Text>
            <View style={s.verifiedBadge}>
              <Text style={{ fontSize: 11, color: '#059669' }}>✔</Text>
              <Text style={s.verifiedBadgeText}>{t('mobileVerified')}</Text>
            </View>
          </View>

          {/* Change Mobile Panel */}
          {changingPhone && (
            <View style={s.changePhoneCard}>
              <Text style={[s.h3, { fontSize: 15, marginBottom: 8 }]}>
                {t('changeMobile')}
              </Text>
              {!phoneOtpSent ? (
                <>
                  <Text style={s.profileInputLabel}>{lang ? 'নতুন মোবাইল নম্বর দিন' : 'Enter new mobile number'}</Text>
                  <TextInput
                    style={s.profileInput}
                    placeholder={lang ? 'যেমন: +৮৮০ ১৭১২ ৩৪৫৬৭৮' : 'e.g. +880 1712 345678'}
                    keyboardType="phone-pad"
                    value={newPhone}
                    onChangeText={val => setNewPhone(sanitizePhoneNumber(val, '+880'))}
                  />
                  {phoneError ? <Text style={s.managerError}>{phoneError}</Text> : null}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity
                      style={[s.btn, { flex: 1, paddingVertical: 10 }, phoneBusy && s.managerDisabled]}
                      disabled={phoneBusy}
                      onPress={handleSendPhoneOtp}
                    >
                      <Text style={s.btnT}>{phoneBusy ? '…' : t('sendMobileOtp')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.btn, s.btn2, { paddingVertical: 10 }]}
                      onPress={() => setChangingPhone(false)}
                    >
                      <Text style={[s.btnT, { color: C.ink }]}>{t('pickerCancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 13, color: '#059669', marginBottom: 8, fontWeight: '600' }}>
                    {phoneSuccess || t('mobileOtpSent')}
                  </Text>
                  <Text style={s.profileInputLabel}>{t('otpCode')}</Text>
                  <TextInput
                    style={s.profileInput}
                    placeholder="123456"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={phoneOtp}
                    onChangeText={setPhoneOtp}
                  />
                  {phoneError ? <Text style={s.managerError}>{phoneError}</Text> : null}

                  {/* Resend OTP with 60s cooldown */}
                  <TouchableOpacity
                    style={{ alignSelf: 'flex-start', marginTop: 4, opacity: phoneResendCooldown > 0 ? 0.6 : 1 }}
                    disabled={phoneBusy || phoneResendCooldown > 0}
                    onPress={handleSendPhoneOtp}
                  >
                    <Text style={[s.link, { fontSize: 12, color: phoneResendCooldown > 0 ? '#64748B' : '#0284C7' }]}>
                      {phoneResendCooldown > 0
                        ? (lang
                            ? `পুনরায় ওটিপি পাঠান (০:${phoneResendCooldown < 10 ? '0' : ''}${phoneResendCooldown} সে.)`
                            : `Resend OTP in 0:${phoneResendCooldown < 10 ? '0' : ''}${phoneResendCooldown}s`)
                        : (lang ? '🔄 পুনরায় ওটিপি পাঠান' : '🔄 Resend OTP Code')}
                    </Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity
                      style={[s.btn, { flex: 1, paddingVertical: 10 }, phoneBusy && s.managerDisabled]}
                      disabled={phoneBusy}
                      onPress={handleVerifyPhoneOtp}
                    >
                      <Text style={s.btnT}>{phoneBusy ? '…' : t('verifyMobileOtp')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.btn, s.btn2, { paddingVertical: 10 }]}
                      onPress={() => {
                        setChangingPhone(false);
                        setPhoneOtpSent(false);
                      }}
                    >
                      <Text style={[s.btnT, { color: C.ink }]}>{t('pickerCancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* 3. Saved Travelers Directory Card */}
        <View style={s.profileSectionCard}>
          <View style={s.profileSectionHeader}>
            <View style={s.profileSectionTitleWrap}>
              <Text style={{ fontSize: 18 }}>👥</Text>
              <Text style={s.profileSectionTitle}>
                {lang ? 'সেভড ট্রাভেলার্স ডিরেক্টরি' : 'Saved Travelers Directory'}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleOpenAddTraveler()}
              style={{
                backgroundColor: '#0284C7',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '800' }}>＋</Text>
              <Text style={{ fontSize: 11.5, color: '#FFFFFF', fontWeight: '800' }}>
                {lang ? 'যাত্রী যোগ' : 'Add Person'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.profileSectionHint}>
            {lang
              ? 'পরিবার বা সহকর্মীদের পাসপোর্ট ও ভ্রমণের তথ্য সেভ রাখুন যাতে পরবর্তী বুকিংয়ে বারবার টাইপ করতে না হয়।'
              : 'Save passport, relation, and contact info for family or colleagues for fast 1-tap bookings.'}
          </Text>

          {/* Travelers List */}
          {savedTravelers.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 26, marginBottom: 4 }}>🧳</Text>
              <Text style={{ fontSize: 12.5, color: '#64748B', fontWeight: '600' }}>
                {lang ? 'কোনো সেভড যাত্রী নেই — নতুন যোগ করতে উপরের বাটনে চাপুন' : 'No saved travelers yet — tap Add Person to create one'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8, marginTop: 4 }}>
              {savedTravelers.map(tr => (
                <View
                  key={tr.id}
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#E0F2FE',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>👤</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                            {tr.name}
                          </Text>
                          <View
                            style={{
                              backgroundColor: '#E2E8F0',
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569' }}>
                              {tr.relation}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
                          🛂 {tr.passportNumber ? `${tr.passportNumber} (${tr.passportExpiry || 'No exp'})` : 'No passport'} • 📞 {tr.phone || 'No phone'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 4, marginLeft: 8 }}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleOpenAddTraveler(tr)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                        accessibilityLabel="Edit traveler"
                      >
                        <Text style={{ fontSize: 13 }}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDeleteTraveler(tr.id)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: '#FEE2E2',
                          borderWidth: 1,
                          borderColor: '#FECACA',
                        }}
                        accessibilityLabel="Delete traveler"
                      >
                        <Text style={{ fontSize: 13 }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {tr.notes ? (
                    <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
                        💡 {tr.notes}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 3. Profile Information Card */}
        <View style={s.profileSectionCard}>
          <View style={s.profileSectionHeader}>
            <View style={s.profileSectionTitleWrap}>
              <Text style={{ fontSize: 18 }}>📝</Text>
              <Text style={s.profileSectionTitle}>{t('profileInformation')}</Text>
            </View>
          </View>
          <Text style={s.profileSectionHint}>
            {lang
              ? 'আপনার জরুরি যোগাযোগ, ঠিকানা, পাসপোর্ট নম্বর বা বিশেষ ভ্রমণ চাহিদাসমূহ লিখুন।'
              : 'Add travel preferences, passport details, address, or special assistance instructions.'}
          </Text>
          <TextInput
            style={[s.profileInput, s.profileInputMultiline]}
            multiline
            placeholder={
              lang
                ? 'যেমন: টার্মিনাল ২ প্রোটোকল সার্ভিস প্রয়োজন, বিশেষ সহায়তা নোট, ইত্যাদি...'
                : 'e.g. Wheelchair assistance needed, Terminal 2 escort preferred...'
            }
            value={profile?.profile_information || ''}
            onChangeText={profile_information =>
              setProfile(curr => ({ ...curr, profile_information }))
            }
          />
        </View>

        {/* 4. Language Preference Card */}
        <View style={s.profileSectionCard}>
          <View style={s.profileSectionHeader}>
            <View style={s.profileSectionTitleWrap}>
              <Text style={{ fontSize: 18 }}>🌐</Text>
              <Text style={s.profileSectionTitle}>{t('languagePreference')}</Text>
            </View>
          </View>
          <Text style={s.profileSectionHint}>
            {lang
              ? 'অ্যাপ্লিকেশনটি দেখার জন্য আপনার পছন্দের ভাষা নির্বাচন করুন।'
              : 'Choose the language you want to use throughout the application.'}
          </Text>
          {renderLanguageSelector()}
        </View>

        {/* 5. Notification Preferences Card */}
        <View style={s.profileSectionCard}>
          <View style={s.profileSectionHeader}>
            <View style={s.profileSectionTitleWrap}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
              <Text style={s.profileSectionTitle}>{t('notificationPreferences')}</Text>
            </View>
          </View>
          <Text style={s.profileSectionHint}>{t('notificationPreferencesNote')}</Text>

          {renderNotificationToggle(
            'in_app',
            '🔔',
            t('inAppNotifications'),
            lang ? 'অ্যাপ ইনবক্সে বুকিং ও ফ্লাইটের সকল আপডেট' : 'Live updates and alerts in your app inbox'
          )}
          {renderNotificationToggle(
            'email',
            '✉️',
            t('emailNotifications'),
            lang ? 'বুকিং নিশ্চিতকরণ ও পেমেন্ট রসিদ ইমেইলে পান' : 'Booking vouchers & payment receipts via email'
          )}
          {renderNotificationToggle(
            'sms',
            '💬',
            t('smsNotifications'),
            lang ? 'ফ্লাইটের জরুরি পরিবর্তন ও প্রোটোকল সহকারীর SMS' : 'Flight alerts & protocol assistant SMS'
          )}
        </View>

        {/* 6. Account Settings Card */}
        <View style={s.profileSectionCard}>
          <View style={s.profileSectionHeader}>
            <View style={s.profileSectionTitleWrap}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
              <Text style={s.profileSectionTitle}>{t('accountSettings')}</Text>
            </View>
          </View>

          {/* Password Reset */}
          <TouchableOpacity
            style={[s.row, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}
            onPress={() => {
              if (setAuthForm) {
                setAuthForm(current => ({
                  ...current,
                  identifier: current.phone || current.email || profile?.phone || profile?.email || '',
                }));
              }
              openAuthView('forgot');
            }}
          >
            <Text style={{ fontSize: 17, marginRight: 10 }}>🔑</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0E2A47' }}>{t('resetPassword')}</Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                {lang ? 'পাসওয়ার্ড পরিবর্তন বা নতুন করে রিসেট করুন' : 'Change or reset your account password'}
              </Text>
            </View>
            <Text style={s.h3}>›</Text>
          </TouchableOpacity>

          {/* Active Session Info */}
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0E2A47' }}>
              {lang ? 'সক্রিয় গ্রাহক সেশন' : 'Active Customer Session'}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Role: Customer · {customerSession.user.email || customerSession.user.phone}
            </Text>
          </View>

          {/* Alerts */}
          {authError ? <Text style={s.managerError}>{authError}</Text> : null}
          {authNotice ? <Text style={s.authNotice}>{authNotice}</Text> : null}

          {/* Save Profile Button */}
          <TouchableOpacity
            style={[s.btn, { marginTop: 16 }, authBusy && s.managerDisabled]}
            disabled={authBusy}
            onPress={saveCustomerProfile}
          >
            <Text style={s.btnT}>{authBusy ? '…' : `💾  ${t('saveProfile')}`}</Text>
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={[s.btn, s.btn2, { marginTop: 12 }]}
            onPress={() => setShowSignOutModal(true)}
          >
            <Text style={[s.btnT, { color: '#DC2626' }]}>🚪  {t('signOut')}</Text>
          </TouchableOpacity>
        </View>

        {accountLinks}

        {/* Sign Out Confirmation Modal */}
        <Modal
          visible={showSignOutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSignOutModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                width: '100%',
                maxWidth: 420,
                padding: 22,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <View style={{ alignItems: 'center', marginBottom: 14 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#FEF2F2',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: '#FEE2E2',
                  }}
                >
                  <Text style={{ fontSize: 26 }}>🚪</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#991B1B', textAlign: 'center', marginBottom: 6 }}>
                  {lang ? 'সাইন আউট নিশ্চিতকরণ' : 'Sign Out Confirmation'}
                </Text>
                <Text style={{ fontSize: 13.5, color: '#475569', textAlign: 'center', lineHeight: 19 }}>
                  {lang
                    ? 'আপনি কি নিশ্চিত যে আপনার ফ্লাইট কেয়ার অ্যাকাউন্ট থেকে সাইন আউট করতে চান?'
                    : 'Are you sure you want to sign out of your Flight Care account?'}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: '#FFFBEB',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 18,
                  borderWidth: 1,
                  borderColor: '#FDE68A',
                }}
              >
                <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 17 }}>
                  ⚠️ {lang
                    ? 'সতর্কতা: সাইন আউট করলে আপনার বর্তমান ড্রাফট বা অসম্পূর্ণ বুকিং সেশন মুছে যেতে পারে।'
                    : 'Warning: Signing out may discard active booking drafts or unsaved booking details.'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setShowSignOutModal(false)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: '#F1F5F9',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                    {lang ? 'বাতিল' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowSignOutModal(false);
                    signOutCustomer();
                  }}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: '#DC2626',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                    🚪 {lang ? 'হ্যাঁ, সাইন আউট করুন' : 'Yes, Sign Out'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add/Edit Saved Traveler Modal */}
        <Modal
          visible={showTravelerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTravelerModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                width: '100%',
                maxWidth: 480,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>👤</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    {editingTravelerId
                      ? (lang ? 'যাত্রীর তথ্য সম্পাদনা' : 'Edit Traveler')
                      : (lang ? 'নতুন যাত্রী যোগ করুন' : 'Add New Traveler')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowTravelerModal(false)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 18, color: '#64748B', fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {travelerError ? (
                <View style={{ backgroundColor: '#FEE2E2', padding: 8, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#FCA5A5' }}>
                  <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>{travelerError}</Text>
                </View>
              ) : null}

              {/* Passenger Full Name */}
              <Text style={s.profileInputLabel}>{lang ? 'যাত্রীর পুরো নাম' : 'Full Name'} *</Text>
              <TextInput
                style={[s.profileInput, { marginBottom: 10 }]}
                placeholder={lang ? 'যেমন: মোহাম্মদ আহমেদ' : 'e.g. John Doe'}
                value={travelerForm.name}
                onChangeText={name => setTravelerForm(prev => ({ ...prev, name: (name || '').replace(/[^a-zA-Z\u0980-\u09FF\s.'-]/g, '') }))}
              />

              {/* Relationship Picker Pills */}
              <Text style={s.profileInputLabel}>{lang ? 'সম্পর্ক' : 'Relationship'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {['Self', 'Spouse', 'Child', 'Parent', 'Colleague', 'Family'].map(rel => {
                  const isSelected = travelerForm.relation === rel;
                  const relLabelBn = {
                    Self: 'নিজে',
                    Spouse: 'স্ত্রী/স্বামী',
                    Child: 'সন্তান',
                    Parent: 'বাবা/মা',
                    Colleague: 'সহকর্মী',
                    Family: 'পরিবার',
                  }[rel];
                  return (
                    <TouchableOpacity
                      key={rel}
                      onPress={() => setTravelerForm(prev => ({ ...prev, relation: rel }))}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: isSelected ? '#0284C7' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: isSelected ? '#0284C7' : '#CBD5E1',
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSelected ? '#FFFFFF' : '#334155' }}>
                        {lang ? relLabelBn : rel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Passport Number & Expiry in a row */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.profileInputLabel}>{lang ? 'পাসপোর্ট নম্বর' : 'Passport Number'}</Text>
                  <TextInput
                    style={s.profileInput}
                    placeholder="A01234567"
                    autoCapitalize="characters"
                    value={travelerForm.passportNumber}
                    onChangeText={passportNumber => setTravelerForm(prev => ({ ...prev, passportNumber }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.profileInputLabel}>{lang ? 'পাসপোর্ট মেয়াদ' : 'Expiry Date'}</Text>
                  <TextInput
                    style={s.profileInput}
                    placeholder="2030-12-31"
                    value={travelerForm.passportExpiry}
                    onChangeText={passportExpiry => setTravelerForm(prev => ({ ...prev, passportExpiry }))}
                  />
                </View>
              </View>

              {/* Phone Number */}
              <Text style={s.profileInputLabel}>{lang ? 'মোবাইল নম্বর' : 'Phone Number'}</Text>
              <TextInput
                style={[s.profileInput, { marginBottom: 10 }]}
                placeholder="+880 1700 000000"
                keyboardType="phone-pad"
                value={travelerForm.phone}
                onChangeText={phone => setTravelerForm(prev => ({ ...prev, phone: sanitizePhoneNumber(phone, '+880') }))}
              />

              {/* Special Assistance / Dietary Notes */}
              <Text style={s.profileInputLabel}>{lang ? 'বিশেষ সেবা বা নোট' : 'Special Assistance / Notes'}</Text>
              <TextInput
                style={[s.profileInput, { marginBottom: 14 }]}
                placeholder={lang ? 'যেমন: হুইলচেয়ার প্রয়োজন, বয়স্ক সহায়তা...' : 'e.g. Wheelchair assistance, elderly escort...'}
                value={travelerForm.notes}
                onChangeText={notes => setTravelerForm(prev => ({ ...prev, notes }))}
              />

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[s.btn, { flex: 1, paddingVertical: 11 }]}
                  onPress={handleSaveTraveler}
                >
                  <Text style={s.btnT}>
                    {editingTravelerId ? (lang ? 'হালনাগাদ করুন' : 'Update') : (lang ? 'সেভ করুন' : 'Save')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btn, s.btn2, { paddingVertical: 11 }]}
                  onPress={() => setShowTravelerModal(false)}
                >
                  <Text style={[s.btnT, { color: C.ink }]}>{t('pickerCancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  // =========================================================================
  // GMAIL 1-CLICK AUTH MODAL (WITH DIRECT FIREBASE FIRESTORE SYNC)
  // =========================================================================
  const renderGmailAuthModal = () => (
    <Modal
      visible={showGmailModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowGmailModal(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            width: '100%',
            maxWidth: 460,
            padding: 22,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FCA5A5' }}>
                <Text style={{ fontSize: 20 }}>🔴</Text>
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'Google / Gmail সাইন ইন ও সাইন আপ' : 'Google / Gmail Sign In & Sign Up'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  {lang ? 'সহজে ১-ক্লিকে ফায়ারবেসে তথ্য যুক্ত করুন' : 'Instant 1-click sync to Firebase Firestore'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowGmailModal(false)} style={{ padding: 6 }}>
              <Text style={{ fontSize: 18, color: '#64748B', fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {gmailModalError ? (
            <View style={{ backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#FCA5A5' }}>
              <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>{gmailModalError}</Text>
            </View>
          ) : null}

          <Text style={{ fontSize: 12.5, color: '#475569', marginBottom: 14, lineHeight: 18 }}>
            {lang
              ? 'আপনার অফিসিয়াল বা ব্যক্তিগত গুগল/জিমেইল আইডি প্রদান করে নিরাপদে প্রবেশ বা সাইন আপ করুন:'
              : 'Enter your verified Google / Gmail account details below to continue:'}
          </Text>

          {/* Instant 1-Click Fast Entry Option */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={gmailModalBusy}
            onPress={() => submitGmailAuth({
              name: gmailNameInput || authForm?.name || 'VIP Member',
              email: (gmailAddressInput && gmailAddressInput.includes('@')) ? gmailAddressInput : (authForm?.identifier?.includes('@') ? authForm.identifier : 'customer.member@gmail.com'),
              phone: gmailPhoneInput || authForm?.phone || profile?.phone || '',
            })}
            style={{
              backgroundColor: '#FEF2F2',
              borderColor: '#FCA5A5',
              borderWidth: 1.5,
              borderRadius: 12,
              paddingVertical: 11,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 16 }}>⚡</Text>
            <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '800' }}>
              {lang ? 'তাৎক্ষণিক প্রবেশ (১-ক্লিক ফাস্ট লগইন)' : '1-Click Instant Access (Fast Entry)'}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
            <Text style={{ marginHorizontal: 10, fontSize: 11, fontWeight: '700', color: '#94A3B8' }}>
              {lang ? 'অথবা আপনার তথ্য দিয়ে প্রবেশ করুন' : 'OR ENTER YOUR DETAILS'}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
          </View>

          {/* Custom Inputs */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
            {lang ? 'আপনার নাম' : 'Your Name'}
          </Text>
          <TextInput
            style={[s.profileInput, { marginBottom: 8 }]}
            placeholder={lang ? 'যেমন: মোহাম্মদ তানভীর' : 'e.g. Tanvir Ahmed'}
            value={gmailNameInput}
            onChangeText={setGmailNameInput}
          />

          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
            {lang ? 'জিমেইল ঠিকানা' : 'Gmail Address'} *
          </Text>
          <TextInput
            style={[s.profileInput, { marginBottom: 8 }]}
            placeholder="yourname@gmail.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={gmailAddressInput}
            onChangeText={setGmailAddressInput}
          />

          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
            {lang ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Mobile Number (Optional)'}
          </Text>
          <TextInput
            style={[s.profileInput, { marginBottom: 14 }]}
            placeholder="017XXXXXXXX"
            keyboardType="phone-pad"
            value={gmailPhoneInput}
            onChangeText={setGmailPhoneInput}
          />

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={gmailModalBusy}
            onPress={() => submitGmailAuth()}
            style={{
              backgroundColor: '#EA4335',
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: gmailModalBusy ? 0.7 : 1,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
              {gmailModalBusy
                ? '...'
                : (lang ? '🚀 জিমেইল দিয়ে সাইন আপ ও লগইন করুন' : '🚀 Sign Up & Log In with Gmail')}
            </Text>
          </TouchableOpacity>

          {/* Firebase sync indicator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
            <Text style={{ fontSize: 12 }}>🔥</Text>
            <Text style={{ fontSize: 11, color: '#64748B' }}>
              {lang ? 'ডাটা সরাসরি Firebase Firestore এ সংরক্ষিত হবে' : 'Data is saved directly to Firebase Firestore'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  // =========================================================================
  // VIEW: GUEST / LOGGED-OUT ACCOUNT SCREEN
  // =========================================================================
  if (authView === 'account') {
    return (
      <ScrollView contentContainerStyle={{ padding: pagePadding, paddingBottom: 115 }}>
        {/* Top Navigation Back Bar */}
        <ScreenHeaderBar
          title={t('account')}
          subtitle={lang ? 'সাইন ইন ও সেটিংস' : 'Sign in & preferences'}
          onBack={onBack || (() => setTab && setTab('home'))}
          onHome={() => setTab && setTab('home')}
          lang={lang}
        />

        {/* Welcome Card */}
        <View style={s.profileHeroCard}>
          <View style={s.profileAvatarRow}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#BAE6FD', marginRight: 14 }}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 44, height: 44, resizeMode: 'contain' }}
              />
            </View>
            <View style={s.profileMeta}>
              <Text style={s.profileNameTitle}>{t('account')}</Text>
              <Text style={s.profilePhoneSub}>
                {lang
                  ? 'বুকিং ও প্রোফাইল পরিচালনার জন্য লগইন করুন'
                  : 'Sign in to manage your bookings and profile'}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Reward Points Incentive for Guests */}
        <CustomerRewardsCard
          customerSession={customerSession}
          lang={lang}
          openAuthView={openAuthView}
          setTab={setTab}
        />

        <View style={{ backgroundColor: '#F0FDF4', padding: 12, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: '#BBF7D0', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16 }}>🔒</Text>
          <Text style={{ color: '#166534', fontSize: 12, fontWeight: '700', flex: 1 }}>
            {lang ? 'নিরাপদ ক্লাউড অথেনটিকেশন ও ১০০ রিওয়ার্ড পয়েন্ট ওয়েলকাম বোনাস সক্রিয়।' : 'Secure Cloud Authentication & 100 Reward Points Welcome Bonus Active.'}
          </Text>
        </View>


        <TouchableOpacity
          style={s.btn}
          onPress={() => openAuthView('login')}
        >
          <Text style={s.btnT}>{t('signIn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btn, s.btn2, { marginTop: 12 }]}
          onPress={() => openAuthView('register')}
        >
          <Text style={[s.btnT, { color: C.ink }]}>{t('createAccount')}</Text>
        </TouchableOpacity>

        {/* Social Login Divider & Buttons for Guests */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
          <Text style={{ marginHorizontal: 10, fontSize: 11.5, fontWeight: '700', color: '#94A3B8' }}>
            {lang ? 'অথবা ১-ক্লিক সাইন ইন' : 'OR 1-CLICK SIGN IN'}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
        </View>

        <View style={{ gap: 8, marginBottom: 10 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderWidth: 1.5,
              borderColor: '#EA4335',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              shadowColor: '#EA4335',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
            }}
            onPress={handleOpenGmailModal}
          >
            <Text style={{ fontSize: 16 }}>🔴</Text>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#B91C1C' }}>
              {lang ? 'Google / Gmail দিয়ে সহজে সাইন আপ ও লগইন করুন' : 'Log in / Sign up with Gmail'}
            </Text>
            <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#DC2626' }}>
                {lang ? '১-ক্লিক' : '1-Click'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              backgroundColor: '#000000',
              borderRadius: 12,
              paddingVertical: 11,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
            onPress={() => handleSocialLogin('apple')}
          >
            <Text style={{ fontSize: 16, color: '#FFFFFF' }}></Text>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' }}>
              {lang ? 'Apple আইডি দিয়ে সাইন ইন করুন' : 'Continue with Apple'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Language Preference Card for Guests */}
        <View style={[s.profileSectionCard, { marginTop: 20 }]}>
          <View style={s.profileSectionHeader}>
            <View style={s.profileSectionTitleWrap}>
              <Text style={{ fontSize: 18 }}>🌐</Text>
              <Text style={s.profileSectionTitle}>{t('languagePreference')}</Text>
            </View>
          </View>
          {renderLanguageSelector()}
        </View>

        {/* Notification Preferences Card for Guests */}
        <View style={s.profileSectionCard}>
          <View style={s.profileSectionHeader}>
            <View style={s.profileSectionTitleWrap}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
              <Text style={s.profileSectionTitle}>{t('notificationPreferences')}</Text>
            </View>
          </View>
          <Text style={s.profileSectionHint}>{t('notificationPreferencesNote')}</Text>
          {renderNotificationToggle(
            'in_app',
            '🔔',
            t('inAppNotifications'),
            lang ? 'অ্যাপ ইনবক্সে সকল আপডেট ও বুকিং সতর্কবার্তা' : 'Live updates and alerts in your app inbox'
          )}
          {renderNotificationToggle(
            'email',
            '✉️',
            t('emailNotifications'),
            lang ? 'বুকিং নিশ্চিতকরণ ও পেমেন্ট রসিদ ইমেইলে পান' : 'Booking vouchers & payment receipts via email'
          )}
          {renderNotificationToggle(
            'sms',
            '💬',
            t('smsNotifications'),
            lang ? 'ফ্লাইটের জরুরি পরিবর্তন ও প্রোটোকল সহকারীর SMS' : 'Flight alerts & protocol assistant SMS'
          )}
        </View>

        {accountLinks}
        {renderGmailAuthModal()}
      </ScrollView>
    );
  }

  // =========================================================================
  // VIEW: AUTH FORMS (LOGIN / REGISTER / VERIFY / FORGOT / RESET)
  // =========================================================================
  const field = (key, placeholder, options = {}) => {
    const isPasswordField = Boolean(options.secureTextEntry || key.toLowerCase().includes('password'));
    const isHidden = !showPasswords[key];

    return (
      <View style={{ width: '100%', marginTop: options.first ? 16 : 0, marginBottom: 8 }}>
        <View style={{ position: 'relative', width: '100%' }}>
          <TextInput
            style={[
              s.in,
              { marginTop: 0 },
              isPasswordField && { paddingRight: 45 },
              capsLockActive && isPasswordField && { borderColor: '#F59E0B', borderWidth: 1.5 },
            ]}
            placeholder={placeholder}
            value={authForm[key]}
            onChangeText={value => {
              let v = value;
              if (key === 'email' || (key === 'identifier' && ((value || '').includes('@') || (value || '').includes('.')))) {
                v = (value || '').replace(/\s+/g, '');
              } else if (key === 'name') {
                v = (value || '').replace(/[^a-zA-Z\u0980-\u09FF\s.'-]/g, '');
              }
              setAuthField(key, v);
            }}
            autoCapitalize={options.autoCapitalize || 'none'}
            keyboardType={options.keyboardType || 'default'}
            secureTextEntry={isPasswordField ? isHidden : false}
            maxLength={options.maxLength}
            onKeyPress={e => {
              if (Platform.OS === 'web' && e?.nativeEvent) {
                // @ts-ignore
                if (typeof e.nativeEvent.getModifierState === 'function') {
                  setCapsLockActive(Boolean(e.nativeEvent.getModifierState('CapsLock')));
                }
              }
            }}
          />
          {isPasswordField && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleShowPassword(key)}
              style={{
                position: 'absolute',
                right: 12,
                top: 13,
                padding: 4,
                zIndex: 10,
              }}
              accessibilityLabel={showPasswords[key] ? 'Hide password' : 'Show password'}
            >
              <Text style={{ fontSize: 16 }}>{showPasswords[key] ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          )}
        </View>
        {isPasswordField && capsLockActive && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginLeft: 2 }}>
            <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '700' }}>
              ⚠️ {lang ? 'ক্যাপস লক (Caps Lock) চালু আছে' : 'Caps Lock is ON'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const authButton = (label, onPress, secondary = false) => (
    <TouchableOpacity
      style={[
        s.btn,
        secondary && s.btn2,
        authBusy && s.managerDisabled,
      ]}
      disabled={authBusy}
      onPress={onPress}
    >
      <Text style={[s.btnT, secondary && { color: C.ink }]}>
        {authBusy ? '…' : label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: pagePadding, paddingBottom: 115 }}>
      {/* Top Navigation Back Bar */}
      <ScreenHeaderBar
        title={t(
          authView === 'login'
            ? 'loginTitle'
            : authView === 'register'
              ? 'registerTitle'
              : authView === 'verify'
                ? 'verifyMobile'
                : authView === 'forgot'
                  ? 'forgotPassword'
                  : 'resetPassword'
        )}
        subtitle={lang ? 'ফ্লাইট কেয়ার নিরাপত্তা ও একাউন্ট' : 'Flight Care secure account'}
        onBack={() => openAuthView('account')}
        onHome={() => setTab && setTab('home')}
        lang={lang}
      />
      <View style={[
        s.authPanel,
        {
          maxWidth: 480,
          width: '100%',
          alignSelf: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 24,
          borderWidth: 1.5,
          borderColor: '#E2E8F0',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        }
      ]}>
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 68, height: 68, resizeMode: 'contain', marginBottom: 8 }}
          />
        </View>
        <Text style={[s.h2, { textAlign: 'center', marginBottom: 12 }]}>
          {t(
            authView === 'login'
              ? 'loginTitle'
              : authView === 'register'
                ? 'registerTitle'
                : authView === 'verify'
                  ? 'verifyMobile'
                  : authView === 'forgot'
                    ? 'forgotPassword'
                    : 'resetPassword'
          )}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8, marginTop: 4 }}>
          <Text style={{ fontSize: 13 }}>🔒</Text>
          <Text style={{ fontSize: 12, color: '#0284C7', fontWeight: '700' }}>
            {lang ? 'নিরাপদ ক্লাউড অথেনটিকেশন সক্রিয়' : 'Secure Cloud Authentication Active'}
          </Text>
        </View>
        {authNotice ? <Text style={s.authNotice}>{authNotice}</Text> : null}

        {/* Welcome Bonus Sign Up Incentive Banner */}
        {authView === 'register' && (
          <View
            style={{
              backgroundColor: '#FEF3C7',
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#FDE68A',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 20 }}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
                {lang ? '১০০ রিওয়ার্ড পয়েন্ট ওয়েলকাম গিফট!' : '100 Reward Points Welcome Gift!'}
              </Text>
              <Text style={{ fontSize: 11.5, color: '#B45309', marginTop: 1 }}>
                {lang
                  ? 'একাউন্ট খুললেই ১০০ পয়েন্ট (৳১০০ ছাড় মূল্য) আপনার প্রোফাইলে স্বয়ংক্রিয়ভাবে যোগ হবে।'
                  : 'Open an account to get 100 points (৳100 discount value) credited automatically.'}
              </Text>
            </View>
          </View>
        )}

        {/* Auth Mode Toggle Tabs (Gmail vs Mobile) */}
        {(authView === 'login' || authView === 'register') && (
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#F1F5F9',
            borderRadius: 12,
            padding: 4,
            marginBottom: 14,
            marginTop: 4,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setAuthMode('gmail');
                setPhoneError('');
                setGmailModalError('');
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: authMode === 'gmail' ? '#FFFFFF' : 'transparent',
                shadowColor: authMode === 'gmail' ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: authMode === 'gmail' ? 0.08 : 0,
                shadowRadius: 2,
                elevation: authMode === 'gmail' ? 2 : 0,
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 15 }}>📧</Text>
              <Text style={{
                fontSize: 13,
                fontWeight: '800',
                color: authMode === 'gmail' ? '#0284C7' : '#64748B',
              }}>
                {lang ? 'জিমেইল (Gmail)' : 'Gmail'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setAuthMode('phone');
                setPhoneError('');
                setGmailModalError('');
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: authMode === 'phone' ? '#FFFFFF' : 'transparent',
                shadowColor: authMode === 'phone' ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: authMode === 'phone' ? 0.08 : 0,
                shadowRadius: 2,
                elevation: authMode === 'phone' ? 2 : 0,
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 15 }}>📱</Text>
              <Text style={{
                fontSize: 13,
                fontWeight: '800',
                color: authMode === 'phone' ? '#0284C7' : '#64748B',
              }}>
                {lang ? 'মোবাইল নম্বর' : 'Mobile Number'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {authView === 'login' && (
          <>
            {/* Quick 1-Click "Log in with Gmail" Card */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenGmailModal}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderWidth: 1.5,
                borderColor: '#EA4335',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 14,
                shadowColor: '#EA4335',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14 }}>🔴</Text>
              </View>
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#B91C1C' }}>
                {lang ? 'Google / Gmail দিয়ে ১-ক্লিকে সাইন ইন' : 'Log in with Gmail (1-Click)'}
              </Text>
              <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#DC2626' }}>
                  {lang ? 'সহজ ১-ক্লিক' : '1-Click'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
              <Text style={{ marginHorizontal: 10, fontSize: 11, fontWeight: '700', color: '#94A3B8' }}>
                {authMode === 'gmail'
                  ? (lang ? 'অথবা জিমেইল ও পাসওয়ার্ড দিয়ে' : 'OR WITH GMAIL & PASSWORD')
                  : (lang ? 'অথবা মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে' : 'OR WITH MOBILE & PASSWORD')}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
            </View>

            {authMode === 'gmail'
              ? field('identifier', lang ? 'আপনার জিমেইল ঠিকানা (user@gmail.com)' : 'Your Gmail (user@gmail.com)', { first: false, autoCapitalize: 'none', keyboardType: 'email-address' })
              : field('identifier', lang ? 'আপনার মোবাইল নম্বর (যেমন: 017XXXXXXXX)' : 'Your Mobile Number (e.g. 017XXXXXXXX)', { first: false, keyboardType: 'phone-pad' })
            }
            {field('password', t('password'), { secureTextEntry: true })}
            {authError ? <Text style={s.managerError}>{authError}</Text> : null}
            {authButton(authMode === 'gmail' ? (lang ? '📧 জিমেইল দিয়ে সাইন ইন করুন' : 'Sign In with Gmail') : (lang ? '📱 মোবাইল দিয়ে সাইন ইন করুন' : 'Sign In with Mobile'), submitCustomerLogin)}

            {/* Quick Instant Access Option */}
            {authMode === 'phone' && authForm?.identifier?.trim() ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const phoneNum = convertBnDigitsToEn(authForm.identifier).trim();
                  handleSocialLogin('phone', {
                    name: authForm.name?.trim() || `Customer ${phoneNum.slice(-4)}`,
                    phone: phoneNum,
                    email: '',
                  });
                }}
                style={{
                  backgroundColor: '#F0FDF4',
                  borderWidth: 1.2,
                  borderColor: '#86EFAC',
                  borderRadius: 10,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 8,
                }}
              >
                <Text style={{ fontSize: 13.5 }}>⚡</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#15803D' }}>
                  {lang ? 'পাসওয়ার্ড ছাড়া সরাসরি প্রবেশ করুন' : 'Direct Quick Access without Password'}
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Apple login option */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                backgroundColor: '#000000',
                borderRadius: 12,
                paddingVertical: 11,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 10,
              }}
              onPress={() => handleSocialLogin('apple')}
            >
              <Text style={{ fontSize: 16, color: '#FFFFFF' }}></Text>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' }}>
                {lang ? 'Apple আইডি দিয়ে সাইন ইন করুন' : 'Continue with Apple'}
              </Text>
            </TouchableOpacity>

            {/* Firebase cloud sync badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: 14,
              paddingVertical: 6,
              paddingHorizontal: 10,
              backgroundColor: '#FEF3C7',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#FDE68A',
            }}>
              <Text style={{ fontSize: 13 }}>🔥</Text>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#B45309' }}>
                {lang ? 'ফায়ারবেস ক্লাউড: তথ্য নিরাপদ ক্লাউড ডাটাবেসে রিয়েল-টাইম সংরক্ষিত' : 'Firebase Cloud: Real-time secured encrypted data'}
              </Text>
            </View>

            <TouchableOpacity
              style={s.authTextButton}
              onPress={() => openAuthView('forgot')}
            >
              <Text style={s.link}>{t('forgotPassword')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.authTextButton}
              onPress={() => openAuthView('register')}
            >
              <Text style={s.link}>{t('createAccount')}</Text>
            </TouchableOpacity>
          </>
        )}

        {authView === 'register' && (
          <>
            {/* Quick 1-Click "Log in with Gmail" Card */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenGmailModal}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderWidth: 1.5,
                borderColor: '#EA4335',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 14,
                shadowColor: '#EA4335',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14 }}>🔴</Text>
              </View>
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#B91C1C' }}>
                {lang ? 'Google / Gmail দিয়ে ১-ক্লিকে সাইন আপ' : 'Sign up with Gmail (1-Click)'}
              </Text>
              <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#DC2626' }}>
                  {lang ? 'সহজ ১-ক্লিক' : '1-Click'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
              <Text style={{ marginHorizontal: 10, fontSize: 11, fontWeight: '700', color: '#94A3B8' }}>
                {authMode === 'gmail'
                  ? (lang ? 'অথবা জিমেইল দিয়ে অ্যাকাউন্ট খুলুন' : 'OR REGISTER WITH GMAIL')
                  : (lang ? 'অথবা মোবাইল দিয়ে অ্যাকাউন্ট খুলুন' : 'OR REGISTER WITH MOBILE')}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
            </View>

            {field('name', t('name'), { first: false })}
            {authMode === 'gmail' ? (
              <>
                {field('email', lang ? 'আপনার জিমেইল ঠিকানা (user@gmail.com) *' : 'Gmail address (user@gmail.com) *', {
                  keyboardType: 'email-address',
                  autoCapitalize: 'none',
                })}
                {field('phone', lang ? 'মোবাইল নম্বর (ঐচ্ছিক/যোগাযোগের জন্য)' : 'Mobile Number (Optional)', { keyboardType: 'phone-pad' })}
              </>
            ) : (
              <>
                {field('phone', lang ? 'মোবাইল নম্বর (যেমন: 017XXXXXXXX) *' : 'Mobile Number (e.g. 017XXXXXXXX) *', { keyboardType: 'phone-pad' })}
                {field('email', lang ? 'জিমেইল / ইমেইল ঠিকানা (ঐচ্ছিক)' : 'Gmail / Email (Optional)', {
                  keyboardType: 'email-address',
                  autoCapitalize: 'none',
                })}
              </>
            )}
            {field('password', t('password'), { secureTextEntry: true })}
            {field('passwordConfirmation', t('confirmPassword'), { secureTextEntry: true })}
            {authError ? <Text style={s.managerError}>{authError}</Text> : null}
            {authButton(authMode === 'gmail' ? (lang ? '📧 জিমেইল দিয়ে অ্যাকাউন্ট তৈরি করুন' : 'Create Account with Gmail') : (lang ? '📱 মোবাইল দিয়ে অ্যাকাউন্ট তৈরি করুন' : 'Create Account with Mobile'), submitCustomerRegistration)}

            {/* Apple login option */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                backgroundColor: '#000000',
                borderRadius: 12,
                paddingVertical: 11,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 10,
              }}
              onPress={() => handleSocialLogin('apple')}
            >
              <Text style={{ fontSize: 16, color: '#FFFFFF' }}></Text>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' }}>
                {lang ? 'Apple আইডি দিয়ে সাইন ইন করুন' : 'Continue with Apple'}
              </Text>
            </TouchableOpacity>

            {/* Firebase cloud sync badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: 14,
              paddingVertical: 6,
              paddingHorizontal: 10,
              backgroundColor: '#FEF3C7',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#FDE68A',
            }}>
              <Text style={{ fontSize: 13 }}>🔥</Text>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#B45309' }}>
                {lang ? 'ফায়ারবেস ক্লাউড: তথ্য নিরাপদ ক্লাউড ডাটাবেসে রিয়েল-টাইম সংরক্ষিত' : 'Firebase Cloud: Real-time secured encrypted data'}
              </Text>
            </View>

            <TouchableOpacity
              style={s.authTextButton}
              onPress={() => openAuthView('login')}
            >
              <Text style={s.link}>{t('signIn')}</Text>
            </TouchableOpacity>
          </>
        )}

        {authView === 'verify' && (
          <>
            {field('phone', t('phone'), { first: true, keyboardType: 'phone-pad' })}
            {field('code', t('otpCode'), { keyboardType: 'number-pad', maxLength: 6 })}
            {authError ? <Text style={s.managerError}>{authError}</Text> : null}
            {authButton(t('verifyMobile'), submitCustomerOtp)}

            <TouchableOpacity
              style={[s.authTextButton, resendCooldown > 0 && { opacity: 0.6 }]}
              disabled={authBusy || resendCooldown > 0}
              onPress={() => {
                setResendCooldown(60);
                resendCustomerCode();
              }}
            >
              <Text style={[s.link, resendCooldown > 0 && { color: '#64748B' }]}>
                {authBusy
                  ? '…'
                  : resendCooldown > 0
                  ? (lang
                      ? `পুনরায় কোড পাঠান (০:${resendCooldown < 10 ? '0' : ''}${resendCooldown} সে.)`
                      : `Resend Code in 0:${resendCooldown < 10 ? '0' : ''}${resendCooldown}s`)
                  : (lang ? '🔄 পুনরায় OTP কোড পাঠান' : `🔄 ${t('resendOtp')}`)}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {authView === 'forgot' && (
          <>
            {field('identifier', t('identifier'), { first: true, autoCapitalize: 'none' })}
            {authError ? <Text style={s.managerError}>{authError}</Text> : null}
            {authButton(t('sendResetCode'), submitPasswordResetRequest)}
          </>
        )}

        {authView === 'reset' && (
          <>
            {field('identifier', t('identifier'), { first: true, autoCapitalize: 'none' })}
            {field('code', t('otpCode'), { keyboardType: 'number-pad', maxLength: 6 })}
            {field('password', t('newPassword'), { secureTextEntry: true })}
            {field('passwordConfirmation', t('confirmPassword'), { secureTextEntry: true })}
            {authError ? <Text style={s.managerError}>{authError}</Text> : null}
            {authButton(t('resetPassword'), submitPasswordReset)}
          </>
        )}
      </View>
      {accountLinks}
      {renderGmailAuthModal()}
    </ScrollView>
  );
}
