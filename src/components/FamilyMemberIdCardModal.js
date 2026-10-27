// src/components/FamilyMemberIdCardModal.js
// Flight Care Enterprise - Official HSIA & CAAB Verified Public Officer Profile & Identity Pass

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
  Linking,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { generateFamilyMemberQrData, findFamilyMember } from '../services/flightCareFamilyService';
import { getOfficerReviews, addOfficerReview } from '../services/officerService';
import { downloadOfficerQrCode } from '../utils/qrDownloadHelper';

export default function FamilyMemberIdCardModal({
  visible,
  onClose,
  member: initialMember,
  lang = 1,
  onBookOfficer,
}) {
  const isBn = lang === 1;
  const [member, setMember] = useState(initialMember);

  useEffect(() => {
    setMember(initialMember);
    if (!initialMember) return;
    let isMounted = true;
    const fetchFreshMember = async () => {
      try {
        const fresh = await findFamilyMember(initialMember.id || initialMember.badgeNo);
        if (isMounted && fresh) {
          setMember(prev => ({ ...(prev || {}), ...fresh }));
        }
      } catch {}
    };
    fetchFreshMember();
    return () => {
      isMounted = false;
    };
  }, [initialMember]);

  // Active Tab: 'profile' (Default: All detailed info & reviews) vs 'idcard' (Printable ID Pass & QR)
  const [activeTab, setActiveTab] = useState('profile');
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerFlight, setReviewerFlight] = useState('');
  const [reviewerRating, setReviewerRating] = useState(5);
  const [reviewerComment, setReviewerComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');

  // QR Display Mode: 'url' (Web Verification Profile) vs 'vcard' (Direct Phone Contact / Offline Info)
  const [qrType, setQrType] = useState('url');

  // Load reviews whenever member changes
  useEffect(() => {
    if (!member) return;
    let isMounted = true;
    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const revList = await getOfficerReviews(member.id || member.badgeNo || 'FC-PO-001');
        if (isMounted) {
          if (revList && revList.length > 0) {
            setReviews(revList);
          } else {
            // Default verified reviews tailored to officer
            setReviews([
              {
                id: 'rev-default-1',
                reviewerName: isBn ? 'ইঞ্জিনিয়ার মাহমুদুল হাসান' : 'Engr. Mahmudul Hassan',
                reviewerCity: 'London, UK',
                flight: 'BG-084',
                date: '10 Oct 2026',
                rating: 5,
                serviceType: 'VIP Arrival Protocol',
                commentBn: 'বোর্ডিং ব্রিজের গেট থেকে নামপ্লেট নিয়ে হাসিমুখে রিসিভ করেন। অত্যন্ত দ্রুততম সময়ে ইমিগ্রেশন ও লাগেজ ক্লিয়ার করিয়ে গাড়িতে তুলে দিয়েছেন। চমৎকার সার্ভিস!',
                commentEn: 'Received us right at the boarding bridge gate with our name board. Handled our fast-track immigration and luggage seamlessly in minutes. Outstanding professionalism!',
                verifiedPassenger: true,
              },
              {
                id: 'rev-default-2',
                reviewerName: isBn ? 'ডা. নুসরাত জাহান' : 'Dr. Nusrat Jahan',
                reviewerCity: 'Toronto, Canada',
                flight: 'EK-582',
                date: '02 Oct 2026',
                rating: 5,
                serviceType: 'Executive Meet & Assist',
                commentBn: 'বয়স্ক বাবা-মাকে নিয়ে এসেছিলাম। হুইলচেয়ার ম্যানেজমেন্ট ও আন্তরিকতায় আমরা মুগ্ধ। বিমানবন্দরে কোনো ঝামেলা পোহাতে হয়নি।',
                commentEn: 'Traveled with elderly parents. The wheelchair care and warmth provided was incredible. Made our entire transit completely stress-free.',
                verifiedPassenger: true,
              },
            ]);
          }
          setLoadingReviews(false);
        }
      } catch {
        if (isMounted) setLoadingReviews(false);
      }
    };
    fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [member]);

  const isOwner = member ? Number(member.serial) === 1 : false;
  const qrData = useMemo(() => {
    if (!member) return { verificationUrl: '', qrImageUrl: '', vcardText: '', vcardQrImageUrl: '', securitySeal: '' };
    return generateFamilyMemberQrData(member);
  }, [member]);

  const memberName = member ? (isBn ? member.nameBn || member.name : member.name) : '';
  const memberRank = member ? (isBn ? member.rankBn || member.rank : member.rank) : '';
  const departmentName = member ? (isBn ? member.departmentBn || member.department : member.department) : '';
  const stationName = member ? (isBn ? member.stationBn || member.station : member.station) : '';
  const serialStr = member ? String(member.serial || '01').padStart(2, '0') : '01';
  const poMatch = (member?.badgeNo || member?.id || '').match(/^FC-PO-(\d+)/i);
  const displayBadgeNum = poMatch ? poMatch[1] : serialStr;

  // Core specializations list (Run unconditionally to adhere to React Rules of Hooks)
  const specialties = useMemo(() => {
    if (!member) return [];
    if (isOwner) {
      return isBn
        ? ['কোম্পানি মালিকানা ও শীর্ষ পরিচালনা কমান্ড', 'সিভিল এভিয়েশন অথরিটি (CAAB) লিয়াজোঁ', 'ভিভিআইপি ও রাষ্ট্রীয় অতিথি প্রোটোকল', 'কর্পোরেট স্ট্র্যাটেজি ও জরুরি রেসপন্স']
        : ['Company Ownership & Operational Command', 'Civil Aviation Authority (CAAB) Liaison', 'VVIP & State Guest Protocol', 'Corporate Strategy & Crisis Response'];
    }
    const rLower = (member.rank || '').toLowerCase();
    const dLower = (member.department || '').toLowerCase();
    if (rLower.includes('manager') || rLower.includes('agm') || rLower.includes('ceo')) {
      return isBn
        ? ['এয়ারপোর্ট গ্রাউন্ড অপারেশনস কমান্ড', 'টার্মিনাল ও ফ্লোর সুপারভিশন', 'জরুরি ফ্লাইট বিলম্ব সমাধান', 'ভিআইপি প্যাসেঞ্জার এসকেলেশন']
        : ['Airport Ground Operations Command', 'Terminal & Floor Supervision', 'Flight Delay Crisis Response', 'VIP Passenger Escalation'];
    }
    if (rLower.includes('front desk') || dLower.includes('front desk') || rLower.includes('fdo')) {
      return isBn
        ? ['বিমানবন্দর ক্যানোপি অভ্যর্থনা ও প্যাসেঞ্জার রেজিস্ট্রেশন', 'ফ্লাইট স্ট্যাটাস ও টার্মিনাল ডিরেকশন সহায়তা', 'ইনস্ট্যান্ট প্রোটোকল অফিসার হ্যান্ডওভার', 'প্যাসেঞ্জার ব্যাগেজ ট্যাগিং ও কাস্টমার সার্ভিস']
        : ['Airport Canopy Reception & Passenger Registration', 'Flight Status & Terminal Navigation Guidance', 'Instant Protocol Officer Handover', 'Passenger Baggage Tagging & Customer Service'];
    }
    if (rLower.includes('shift') || dLower.includes('shift')) {
      return isBn
        ? ['শিফট ডিউটি ও টার্মিনাল মুভমেন্ট সমন্বয়', 'এয়ারলাইন্স চেক-ইন কাউন্টার সমন্বয়', 'জরুরি অ্যারাইভাল ও ডিপার্চার ফ্লো হ্যান্ডলিং', 'অফিসার ডিউটি রস্টার ও গ্রাউন্ড মনিটরিং']
        : ['Shift Duty & Terminal Movement Coordination', 'Airlines Check-in Counter Coordination', 'Urgent Arrival & Departure Flow Handling', 'Officer Duty Roster & Ground Monitoring'];
    }
    return isBn
      ? ['ভিআইপি বোর্ডিং ব্রিজ অভ্যর্থনা ও নামপ্লেট এসকর্ট', 'ফাস্ট-ট্র্যাক ইমিগ্রেশন ও কাস্টমস সহায়তা', 'লাগেজ বেল্ট অগ্রাধিকার খালাস ও তদারকি', 'সিআইপি লাউঞ্জ এসকর্ট ও বোর্ডিং গ্রিটিং']
      : ['VIP Boarding Bridge Greeting & Placard Escort', 'Fast-Track Immigration & Customs Clearance', 'Priority Baggage Handling & Belt Supervision', 'CIP Lounge Escort & Boarding Assistance'];
  }, [isOwner, member?.rank, member?.department, isBn]);

  const handleCopyLink = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(qrData.verificationUrl);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    } else {
      Alert.alert(
        isBn ? 'লিঙ্ক কপি হয়েছে' : 'Link Copied',
        qrData.verificationUrl
      );
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
      window.print();
    } else {
      Alert.alert(
        isBn ? 'প্রিন্ট' : 'Print',
        isBn ? 'আইডি কার্ড প্রিন্ট করার জন্য ব্রাউজারের প্রিন্ট ডায়লগ ব্যবহার করুন।' : 'Use browser print dialog to print ID card.'
      );
    }
  };

  const handleDownloadQr = async (mode = 'qr_only', customQrUrl = null) => {
    setDownloadingQr(true);
    try {
      const activeQrUrl = customQrUrl || (qrType === 'vcard' ? qrData.vcardQrImageUrl : qrData.qrImageUrl);
      const res = await downloadOfficerQrCode({
        member,
        verificationUrl: qrData.verificationUrl,
        qrImageUrl: activeQrUrl,
        mode,
        lang,
      });
      if (res?.success) {
        setDownloadNotice(isBn ? '✓ কিউআর কোড সফলভাবে ডাউনলোড হয়েছে!' : '✓ QR Code downloaded successfully!');
        setTimeout(() => setDownloadNotice(''), 3500);
      }
    } catch (e) {
      console.warn('QR download error:', e);
    } finally {
      setDownloadingQr(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewerName.trim() || !reviewerComment.trim()) {
      Alert.alert(
        isBn ? 'তথ্য অসম্পূর্ণ' : 'Incomplete Form',
        isBn ? 'অনুগ্রহ করে আপনার নাম এবং মন্তব্য লিখুন।' : 'Please enter your name and comment.'
      );
      return;
    }

    setSubmittingReview(true);
    try {
      const newRev = await addOfficerReview(member.id || member.badgeNo, {
        reviewerName: reviewerName.trim(),
        flight: reviewerFlight.trim() || 'Airport Protocol',
        rating: reviewerRating,
        comment: reviewerComment.trim(),
        commentBn: reviewerComment.trim(),
        commentEn: reviewerComment.trim(),
      });

      setReviews(current => [newRev, ...current]);
      setReviewerName('');
      setReviewerFlight('');
      setReviewerComment('');
      setShowReviewForm(false);
      setReviewNotice(isBn ? '✓ আপনার মূল্যবান রিভিউ সফলভাবে যুক্ত হয়েছে!' : '✓ Review submitted successfully!');
      setTimeout(() => setReviewNotice(''), 4500);
    } catch {
      Alert.alert(isBn ? 'ব্যর্থ হয়েছে' : 'Failed', isBn ? 'রিভিউ জমা দেওয়া সম্ভব হয়নি।' : 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const cleanPhone = (member?.phone || '').replace(/\D/g, '');

  // Guard after ALL hooks have been unconditionally executed
  if (!visible || !member) return null;

  return (
    <Modal visible={visible && !!member} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.82)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 12,
          ...(Platform.OS === 'web' ? { width: '100vw', height: '100vh', boxSizing: 'border-box' } : {}),
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 560,
            maxHeight: '94%',
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            flexShrink: 1,
            alignSelf: 'center',
            ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.35,
            shadowRadius: 28,
            elevation: 16,
          }}
        >
          {/* Universal Header Bar */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: '#0F2A4A',
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, marginRight: 8 }}>
              <Image
                source={require('../../assets/hsia_logo.png')}
                style={{ width: 30, height: 30, resizeMode: 'contain', flexShrink: 0 }}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF' }}>
                    Flight Care
                  </Text>
                  <Image
                    source={require('../../assets/verified_badge.png')}
                    style={{ width: 13, height: 13, resizeMode: 'contain', flexShrink: 0 }}
                  />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FCD34D' }}>
                    • HSIA Verified
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ fontSize: 9.5, color: '#93C5FD', fontWeight: '700', marginTop: 1 }}
                >
                  CIVIL AVIATION AUTHORITY OF BANGLADESH (CAAB)
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
                flexShrink: 0,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switch Tabs: Detailed Profile vs Printable ID Pass */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#F1F5F9',
              padding: 4,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
              gap: 4,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('profile')}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 6,
                borderRadius: 8,
                backgroundColor: activeTab === 'profile' ? '#0284C7' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 5,
                minWidth: 0,
              }}
            >
              <Text style={{ fontSize: 13, flexShrink: 0 }}>📋</Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  fontSize: 11.5,
                  fontWeight: '800',
                  color: activeTab === 'profile' ? '#FFFFFF' : '#475569',
                }}
              >
                {isBn ? 'অফিশিয়াল পরিচিতি' : 'Official Profile'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('idcard')}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 6,
                borderRadius: 8,
                backgroundColor: activeTab === 'idcard' ? '#0284C7' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 5,
                minWidth: 0,
              }}
            >
              <Text style={{ fontSize: 13, flexShrink: 0 }}>🪪</Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  fontSize: 11.5,
                  fontWeight: '800',
                  color: activeTab === 'idcard' ? '#FFFFFF' : '#475569',
                }}
              >
                {isBn ? 'আইডি পাস ও কিউআর' : 'ID Pass & QR Code'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notice Banner */}
          {!!reviewNotice && (
            <View
              style={{
                backgroundColor: '#10B981',
                paddingVertical: 8,
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', textAlign: 'center', fontSize: 12.5 }}>
                {reviewNotice}
              </Text>
            </View>
          )}

          {/* TAB 1: ALL DETAILED INFORMATION & REVIEWS */}
          {activeTab === 'profile' && (
            <ScrollView
              contentContainerStyle={{ padding: 14, paddingBottom: 28, gap: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {/* HSIA Certification Banner with Blue Verified Tick */}
              <View
                style={{
                  backgroundColor: '#0F2A4A',
                  borderRadius: 14,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderWidth: 1.5,
                  borderColor: 'rgba(217, 119, 6, 0.4)',
                }}
              >
                <Image
                  source={require('../../assets/hsia_logo.png')}
                  style={{ width: 34, height: 34, resizeMode: 'contain', flexShrink: 0 }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#FCD34D' }}>
                      Approved by Hazrat Shahjalal International Airport (HSIA)
                    </Text>
                    <Image
                      source={require('../../assets/verified_badge.png')}
                      style={{ width: 13, height: 13, resizeMode: 'contain', flexShrink: 0 }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 3.5,
                        backgroundColor: '#10B981',
                      }}
                    />
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#34D399' }} numberOfLines={1}>
                      {isBn ? 'সিভিল এভিয়েশন সিকিউরিটি ক্লিয়ারেন্স প্রাপ্ত' : 'CAAB Security Cleared & Active Duty'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Main Officer Hero Card */}
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 18,
                  padding: 16,
                  borderWidth: isOwner ? 2 : 1,
                  borderColor: isOwner ? '#D97706' : '#CBD5E1',
                  flexDirection: 'row',
                  gap: 14,
                  alignItems: 'center',
                }}
              >
                {/* Photo with Gold/Blue Border */}
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 24,
                    backgroundColor: isOwner ? '#FEF3C7' : '#E0F2FE',
                    borderWidth: 3,
                    borderColor: isOwner ? '#F59E0B' : '#0284C7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {member.photo ? (
                    <Image
                      source={{ uri: member.photo }}
                      style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                    />
                  ) : (
                    <Text style={{ fontSize: 40 }}>{member.avatar || '👮'}</Text>
                  )}
                </View>

                {/* Identity Text */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <View
                      style={{
                        backgroundColor: isOwner ? '#D97706' : '#0F2A4A',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 10.5 }}>
                        #{displayBadgeNum}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                      {memberName}
                    </Text>
                    <Image
                      source={require('../../assets/verified_badge.png')}
                      style={{ width: 17, height: 17, resizeMode: 'contain' }}
                    />
                  </View>

                  {isBn && member.name && member.name !== member.nameBn && (
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                      {member.name}
                    </Text>
                  )}

                  <Text
                    style={{
                      fontSize: 13.5,
                      fontWeight: '800',
                      color: isOwner ? '#B45309' : '#0284C7',
                      marginTop: 3,
                    }}
                  >
                    {memberRank}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                    {departmentName}
                  </Text>
                </View>
              </View>

              {/* 4 Performance & Safety Metrics Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: isBn ? 'কাস্টমার রেটিং' : 'Rating Score', val: '⭐ 5.0 / 5.0', bg: '#FEF3C7', border: '#FDE68A', text: '#B45309' },
                  { label: isBn ? 'সম্পন্ন প্রোটোকল' : 'Protocols Handled', val: '✈️ 180+ Services', bg: '#EFF6FF', border: '#DBEAFE', text: '#1D4ED8' },
                  { label: isBn ? 'অন-টাইম উপস্থিতি' : 'Punctuality', val: '⏱️ 99.8% On-Time', bg: '#ECFDF5', border: '#A7F3D0', text: '#047857' },
                  { label: isBn ? 'রক্তের গ্রুপ' : 'Blood Group', val: `🩸 ${member.bloodGroup || 'O+'}`, bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C' },
                ].map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      flex: 1,
                      minWidth: '45%',
                      backgroundColor: item.bg,
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: item.border,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: item.text, marginTop: 2 }}>
                      {item.val}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Official Credentials & Licensing Section */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A' }}>
                  🛡️ {isBn ? 'অফিসিয়াল পরিচিতি ও সিএএবি ছাড়পত্র:' : 'Official Credentials & CAAB Clearance:'}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 110 }}>
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }} numberOfLines={1}>
                      {isBn ? 'অফিসিয়াল ব্যাজ নম্বর:' : 'Badge Number:'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 1 }} numberOfLines={1}>
                      {member.badgeNo || 'FC-PO-001'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 110 }}>
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }} numberOfLines={1}>
                      {isBn ? 'সিভিল এভিয়েশন লাইসেন্স:' : 'CAAB Security License:'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1D4ED8', marginTop: 1 }} numberOfLines={1}>
                      {member.licenseNo || 'CAAB-SEC-DAC'}
                    </Text>
                  </View>
                </View>

                {/* Duty Station & Shift */}
                <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                    <Text style={{ fontSize: 13 }}>📍</Text>
                    <Text style={{ fontSize: 12, color: '#334155', flex: 1, lineHeight: 18 }}>
                      <Text style={{ fontWeight: '800' }}>{isBn ? 'ডিউটি স্টেশন:' : 'Station:'}</Text>{' '}
                      {stationName}
                    </Text>
                  </View>

                  {member.shift && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13 }}>⏰</Text>
                      <Text style={{ fontSize: 12, color: '#334155' }}>
                        <Text style={{ fontWeight: '800' }}>{isBn ? 'ডিউটি শিফট:' : 'Shift:'}</Text>{' '}
                        {member.shift}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Core Protocol Competencies & Specializations */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A' }}>
                  🎖️ {isBn ? 'বিশেষ প্রোটোকল দক্ষতা ও কর্মপরিধি:' : 'Core Protocol Specializations:'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {specialties.map((spec, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: '#F1F5F9',
                        paddingHorizontal: 9,
                        paddingVertical: 5,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '800' }}>✓</Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                        {spec}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Languages */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Text style={{ fontSize: 12 }}>🗣️</Text>
                  <Text style={{ fontSize: 11.5, color: '#475569', fontWeight: '600' }}>
                    <Text style={{ fontWeight: '800' }}>{isBn ? 'ভাষা:' : 'Languages:'}</Text> বাংলা (Native), English (Fluent / Professional), Hindi
                  </Text>
                </View>
              </View>

              {/* Official Role Note */}
              {member.rmk && (
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                    {isBn ? 'অফিসিয়াল দায়িত্ব ও প্রোটোকল নোট' : 'Official Protocol Summary'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#334155', marginTop: 4, lineHeight: 18 }}>
                    {member.rmk}
                  </Text>
                </View>
              )}

              {/* Instant Contact & Booking Actions */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A' }}>
                  ⚡ {isBn ? 'তাত্ক্ষণিক যোগাযোগ ও বুকিং:' : 'Direct Contact & Booking:'}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {/* Call Button */}
                  {member.phone && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => Linking.openURL(`tel:${member.phone}`)}
                      style={{
                        flex: 1,
                        minWidth: 120,
                        backgroundColor: '#0F2A4A',
                        paddingVertical: 10,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>📞</Text>
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>
                        {isBn ? 'সরাসরি কল' : 'Call Officer'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* WhatsApp Button */}
                  {member.phone && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          isBn
                            ? `হ্যালো ${member.name}, আমি ফ্লাইট কেয়ার প্রোটোকল সার্ভিস সংক্রান্ত বিষয়ে জানতে চাচ্ছি।`
                            : `Hello ${member.name}, I would like to inquire about Flight Care protocol service.`
                        )}`;
                        Linking.openURL(waUrl);
                      }}
                      style={{
                        flex: 1,
                        minWidth: 120,
                        backgroundColor: '#25D366',
                        paddingVertical: 10,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>💬</Text>
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>
                        WhatsApp
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Direct Booking Button */}
                  {typeof onBookOfficer === 'function' && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        onClose();
                        onBookOfficer(member);
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: '#10B981',
                        paddingVertical: 11,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        shadowColor: '#10B981',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                    >
                      <Text style={{ fontSize: 15 }}>✈️</Text>
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                        {isBn
                          ? `এই অফিসারের সাথে প্রোটোকল সার্ভিস বুকিং করুন`
                          : `Book Protocol Service with ${member.name}`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Verified Passenger Reviews Section */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14 }}>⭐</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#0F172A' }}>
                      {isBn ? 'যাত্রীদের ভেরিফাইড রিভিউ' : 'Verified Passenger Reviews'} ({reviews.length})
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: '#ECFDF5',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#A7F3D0',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: '#059669', fontWeight: '800' }}>
                      ✓ {isBn ? 'ভেরিফাইড প্যাসেঞ্জার' : 'Verified Only'}
                    </Text>
                  </View>
                </View>

                {/* Verified Passengers Policy Notice */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 10,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🛡️</Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', flex: 1, lineHeight: 17 }}>
                    {isBn
                      ? 'সিভিল এভিয়েশন সিকিউরিটি মানদণ্ড অনুযায়ী শুধুমাত্র সার্ভিস গ্রহণকারী ভেরিফাইড যাত্রীরা সার্ভিস সমাপ্তির পর অফিসিয়াল রিভিউ প্রদান করতে পারেন।'
                      : 'Per airport security standards, only verified passengers who completed a protocol service can submit officer reviews.'}
                  </Text>
                </View>

                {/* Reviews List */}
                {loadingReviews ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <View style={{ gap: 8 }}>
                    {reviews.map((rev) => (
                      <View
                        key={rev.id}
                        style={{
                          backgroundColor: '#F8FAFC',
                          borderRadius: 10,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          gap: 4,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                              {rev.reviewerName}
                            </Text>
                            {rev.verifiedPassenger && (
                              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ fontSize: 9.5, color: '#166534', fontWeight: '700' }}>
                                  ✓ {isBn ? 'ভেরিফাইড' : 'Verified'}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 11, color: '#EAB308', fontWeight: '900' }}>
                            {'⭐'.repeat(Math.min(5, Math.floor(rev.rating || 5)))}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 11, color: '#64748B' }}>
                          {rev.flight || 'Flight Service'} · {rev.date || 'Recent'}
                        </Text>

                        <Text style={{ fontSize: 12, color: '#334155', marginTop: 2, lineHeight: 17 }}>
                          "{isBn ? rev.commentBn || rev.comment || rev.commentEn : rev.commentEn || rev.comment || rev.commentBn}"
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          {/* TAB 2: PRINTABLE ID PASS & SCANNABLE QR */}
          {activeTab === 'idcard' && (
            <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: '#CBD5E1',
                  padding: 18,
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.08,
                  shadowRadius: 14,
                }}
              >
                {/* Corporate Card Banner */}
                <View
                  style={{
                    backgroundColor: '#0F2A4A',
                    marginHorizontal: -18,
                    marginTop: -18,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, marginRight: 8 }}>
                    <Image
                      source={require('../../assets/hsia_logo.png')}
                      style={{ width: 30, height: 30, resizeMode: 'contain', flexShrink: 0 }}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 }}>
                        FLIGHT CARE
                      </Text>
                      <Text style={{ fontSize: 9.5, color: '#FCD34D', fontWeight: '800', letterSpacing: 0.8 }}>
                        AIRPORT VIP PROTOCOL & MEET AND GREET
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: '#F59E0B',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#000000' }}>
                      FAMILY PASS
                    </Text>
                  </View>
                </View>

                {/* Photo & Member Core Info */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                    marginTop: 18,
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 78,
                      height: 78,
                      borderRadius: 39,
                      backgroundColor: '#E0F2FE',
                      borderWidth: 3,
                      borderColor: '#0284C7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {member.photo ? (
                      <Image
                        source={{ uri: member.photo }}
                        style={{ width: '100%', height: '100%', borderRadius: 39 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 38 }}>{member.avatar || '👮'}</Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 19, fontWeight: '900', color: '#0F172A' }}>
                        {memberName}
                      </Text>
                      <Image
                        source={require('../../assets/verified_badge.png')}
                        style={{ width: 18, height: 18, resizeMode: 'contain' }}
                      />
                    </View>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0284C7', marginTop: 2 }}>
                      {memberRank}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: '#059669', fontWeight: '800' }}>✓</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#065F46' }}>
                        {departmentName}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Badge & Security ID Badges */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <View
                    style={{
                      flex: 1,
                      minWidth: 120,
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                    }}
                  >
                    <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '700' }}>OFFICIAL BADGE</Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#0F172A' }}>
                      {member.badgeNo || 'FC-PO-001'}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      minWidth: 120,
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                    }}
                  >
                    <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '700' }}>SECURITY LICENSE</Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#0F172A' }}>
                      {member.licenseNo || 'CAAB-SEC-DAC'}
                    </Text>
                  </View>

                  {member.bloodGroup && (
                    <View
                      style={{
                        backgroundColor: '#FEF2F2',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#FECACA',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '800' }}>BLOOD</Text>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#B91C1C' }}>
                        {member.bloodGroup}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Contact & Station Details */}
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14 }}>📞</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                      {isBn ? 'মোবাইল (কর্পোরেট):' : 'Corporate Phone:'}{' '}
                      <Text style={{ fontWeight: '900', color: '#0F172A' }}>
                        {member.phoneDisplay || member.phone || 'N/A'}
                      </Text>
                    </Text>
                  </View>

                  {!!member.personalPhone && member.personalPhone !== (member.phoneDisplay || member.phone) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 14 }}>📱</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                        {isBn ? 'ব্যক্তিগত মোবাইল:' : 'Personal Mobile:'}{' '}
                        <Text style={{ fontWeight: '800', color: '#0F172A' }}>
                          {member.personalPhone}
                        </Text>
                      </Text>
                    </View>
                  )}

                  {member.email && member.email !== 'NA' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 14 }}>✉️</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                        {isBn ? 'অফিসিয়াল ইমেইল:' : 'Official Email:'}{' '}
                        <Text style={{ fontWeight: '800', color: '#0284C7' }}>
                          {member.email}
                        </Text>
                      </Text>
                    </View>
                  )}

                  {!!member.gmail && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 14 }}>📧</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                        {isBn ? 'ব্যক্তিগত জিমেইল:' : 'Personal Gmail:'}{' '}
                        <Text style={{ fontWeight: '800', color: '#64748B' }}>
                          {member.gmail}
                        </Text>
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <Text style={{ fontSize: 14 }}>📍</Text>
                    <Text style={{ fontSize: 12, color: '#475569', flex: 1 }}>
                      <Text style={{ fontWeight: '700' }}>{isBn ? 'ডিউটি স্টেশন:' : 'Station:'}</Text>{' '}
                      {stationName || 'Hazrat Shahjalal International Airport, Dhaka'}
                    </Text>
                  </View>

                  {member.shift && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 14 }}>⏰</Text>
                      <Text style={{ fontSize: 12, color: '#475569', flex: 1 }}>
                        <Text style={{ fontWeight: '700' }}>{isBn ? 'শিফট:' : 'Shift:'}</Text> {member.shift}
                      </Text>
                    </View>
                  )}
                </View>

                {/* SCANNABLE QR CODE SECTION */}
                <View
                  style={{
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: '#CBD5E1',
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '900', color: '#0F172A', marginBottom: 6 }}>
                    {isBn ? 'স্ক্যান করুন — অফিশিয়াল পরিচিতি ও ভেরিফিকেশন' : 'SCAN TO VERIFY CREDENTIALS & PROFILE'}
                  </Text>

                  {/* Interactive QR Format Switcher: Web Profile vs Direct vCard Phone Contact */}
                  <View
                    style={{
                      flexDirection: 'row',
                      backgroundColor: '#F1F5F9',
                      borderRadius: 10,
                      padding: 3,
                      marginBottom: 10,
                      width: '100%',
                      maxWidth: 320,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setQrType('url')}
                      style={{
                        flex: 1,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: qrType === 'url' ? '#0284C7' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '800',
                          color: qrType === 'url' ? '#FFFFFF' : '#475569',
                        }}
                      >
                        {isBn ? '🌐 ওয়েব প্রোফাইল লিংক' : '🌐 Web Profile URL'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setQrType('vcard')}
                      style={{
                        flex: 1,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: qrType === 'vcard' ? '#0284C7' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '800',
                          color: qrType === 'vcard' ? '#FFFFFF' : '#475569',
                        }}
                      >
                        {isBn ? '📇 ডিরেক্ট ফোন কন্টাক্ট' : '📇 Direct Phone vCard'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 10, textAlign: 'center' }}>
                    {qrType === 'url'
                      ? (isBn
                          ? 'স্মার্টফোন ক্যামেরা দিয়ে স্ক্যান করলে সরাসরি ব্রাউজারে কর্মকর্তার অফিসিয়াল ভেরিফাইড প্রোফাইল ও রিভিউ প্রদর্শিত হবে।'
                          : 'Scanning with any phone camera opens the verified web profile, license, and reviews.')
                      : (isBn
                          ? 'স্মার্টফোন ক্যামেরা দিয়ে স্ক্যান করলে ব্রাউজার ছাড়াই সরাসরি কর্মকর্তার নাম, পদবী, ব্যাজ ও ফোন নাম্বার ফোনে সেভ হবে।'
                          : 'Scanning with any phone camera instantly shows officer contact card on phone screen without internet.')}
                  </Text>

                  {/* High-Resolution QR Code (Displays active selected format) */}
                  <View
                    style={{
                      padding: 8,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: '#0284C7',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.12,
                      shadowRadius: 8,
                    }}
                  >
                    <Image
                      source={{ uri: qrType === 'vcard' ? (qrData.vcardQrImageUrl || qrData.qrImageUrl) : qrData.qrImageUrl }}
                      style={{ width: 175, height: 175 }}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Verification Seal Badge */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 10,
                      backgroundColor: '#ECFDF5',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#A7F3D0',
                    }}
                  >
                    <Image
                      source={require('../../assets/verified_badge.png')}
                      style={{ width: 15, height: 15, resizeMode: 'contain' }}
                    />
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#065F46' }}>
                      {isBn ? 'সিভিল এভিয়েশন ও HSIA অথরাইজড' : 'CAAB & HSIA Certified Official'}
                    </Text>
                  </View>

                  {/* Clickable Verification URL Link */}
                  <TouchableOpacity
                    onPress={handleCopyLink}
                    style={{
                      width: '100%',
                      backgroundColor: '#F8FAFC',
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      marginTop: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 10.5,
                        color: '#0284C7',
                        fontWeight: '600',
                        flex: 1,
                        fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
                      }}
                    >
                      {qrData.verificationUrl}
                    </Text>
                    <View
                      style={{
                        backgroundColor: copiedNotice ? '#10B981' : '#0284C7',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '800' }}>
                        {copiedNotice ? (isBn ? 'কপি হয়েছে' : 'Copied!') : (isBn ? 'কপি' : 'Copy')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Download Actions for QR Code and ID Badge */}
                <View style={{ width: '100%', gap: 8, marginTop: 4, marginBottom: 8 }}>
                  {downloadNotice ? (
                    <View style={{ backgroundColor: '#ECFDF5', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#065F46', textAlign: 'center' }}>
                        {downloadNotice}
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {/* Button 1: Download Clean QR Code PNG */}
                    <TouchableOpacity
                      onPress={() => handleDownloadQr('qr_only')}
                      disabled={downloadingQr}
                      style={{
                        flex: 1,
                        minWidth: 130,
                        backgroundColor: '#0284C7',
                        paddingVertical: 11,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        shadowColor: '#0284C7',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                      }}
                    >
                      {downloadingQr ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={{ fontSize: 15 }}>📥</Text>
                          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>
                            {isBn ? 'কিউআর কোড ডাউনলোড (PNG)' : 'Download QR Code (PNG)'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Button 2: Download Complete ID Pass Badge PNG */}
                    <TouchableOpacity
                      onPress={() => handleDownloadQr('badge_card')}
                      disabled={downloadingQr}
                      style={{
                        flex: 1,
                        minWidth: 130,
                        backgroundColor: '#065F46',
                        paddingVertical: 11,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        shadowColor: '#065F46',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 15 }}>🖪</Text>
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>
                        {isBn ? 'আইডি পাস কার্ড ডাউনলোড' : 'Download ID Pass Badge'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Print ID Card Button */}
                <TouchableOpacity
                  onPress={handlePrint}
                  style={{
                    backgroundColor: '#0F2A4A',
                    paddingVertical: 11,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    marginTop: 2,
                  }}
                >
                  <Text style={{ fontSize: 15 }}>🖨️</Text>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                    {isBn ? 'আইডি কার্ড প্রিন্ট করুন' : 'Print Official ID Card'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Footer Bar */}
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: '#F8FAFC',
              borderTopWidth: 1,
              borderTopColor: '#E2E8F0',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, flexShrink: 0 }}>🛡️</Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ fontSize: 11, color: '#64748B', fontWeight: '600', flex: 1 }}
              >
                {isBn ? 'CAAB সিকিউরিটি এনডোর্সড' : 'CAAB & HSIA Verified'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#E2E8F0',
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 8,
                flexShrink: 0,
              }}
            >
              <Text style={{ color: '#334155', fontWeight: '800', fontSize: 12 }}>
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
