import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
  Alert,
} from 'react-native';
import {
  getOfficerProfile,
  addOfficerReview,
  generateOfficerQrData,
  calculateOfficerPoints,
  PROTOCOL_OFFICER_RANKS,
} from '../services/officerService';
import ProtocolRanksModal from './ProtocolRanksModal';

export default function OfficerProfileModal({
  visible,
  onClose,
  officerId,
  initialOfficer = null,
  lang: initialLang = 0,
  onBookOfficer,
  isInline = false,
}) {
  const [lang, setLang] = useState(initialLang);
  const [officer, setOfficer] = useState(initialOfficer);
  const [loading, setLoading] = useState(!initialOfficer);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'reviews' | 'add_review'
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);
  const [showRanksModal, setShowRanksModal] = useState(false);
  
  // New review form state
  const [reviewName, setReviewName] = useState('');
  const [reviewFlight, setReviewFlight] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      const idToUse = officerId || (initialOfficer ? initialOfficer.id : 'st-1');
      try {
        const fullProfile = await getOfficerProfile(idToUse);
        if (isMounted) {
          setOfficer(fullProfile);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };

    if (visible) {
      loadProfile();
    }

    return () => {
      isMounted = false;
    };
  }, [visible, officerId, initialOfficer]);

  if (!visible) return null;

  const handleSubmitReview = async () => {
    if (!reviewName.trim() || !reviewComment.trim()) {
      Alert.alert(
        lang ? 'তথ্য অসম্পূর্ণ' : 'Incomplete Review',
        lang ? 'দয়া করে আপনার নাম এবং মতামত লিখুন।' : 'Please enter your name and comment.'
      );
      return;
    }

    setReviewSubmitting(true);
    try {
      await addOfficerReview(officer.id, {
        reviewerName: reviewName.trim(),
        flight: reviewFlight.trim(),
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

      // Reload profile to refresh stats and review list
      const refreshed = await getOfficerProfile(officer.id);
      setOfficer(refreshed);
      setReviewSubmitting(false);
      setReviewSuccess(true);
      setReviewName('');
      setReviewFlight('');
      setReviewComment('');
      setTimeout(() => {
        setReviewSuccess(false);
        setActiveTab('reviews');
      }, 1500);
    } catch {
      setReviewSubmitting(false);
    }
  };

  const handleShare = () => {
    const qrData = generateOfficerQrData(officer ? (officer.badgeNo || officer.id) : 'FC-CEO-001');
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(qrData.verificationUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      Alert.alert(
        lang ? 'প্রোফাইল লিঙ্ক' : 'Profile Link',
        qrData.verificationUrl
      );
    }
  };

  const officerName = officer
    ? (lang ? (officer.nameBn || officer.name) : officer.name)
    : '';
  const officerRole = officer
    ? (lang ? (officer.roleBn || officer.role) : officer.role)
    : '';
  const airportName = officer
    ? (lang ? (officer.airportFullNameBn || `${officer.airport} বিমানবন্দর`) : (officer.airportFullNameEn || `${officer.airport} Airport`))
    : '';
  const stationName = officer
    ? (lang ? (officer.stationBn || officer.station) : (officer.station || `${officer.airport} Terminal`))
    : '';
  const specialties = officer
    ? (lang ? (officer.specialtiesBn || []) : (officer.specialtiesEn || []))
    : [];

  const reviews = (officer && officer.reviews) ? officer.reviews : [];
  const pointsData = officer?.points || calculateOfficerPoints(officer, reviews);
  const pointsBreakdown = pointsData?.breakdown || [];
  const totalPoints = pointsData?.totalPoints || 0;

  const cardContent = (
    <View
      style={{
        width: '100%',
        maxWidth: 680,
        maxHeight: isInline ? undefined : '92%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: isInline ? 4 : 12 },
        shadowOpacity: isInline ? 0.08 : 0.3,
        shadowRadius: isInline ? 12 : 24,
        elevation: isInline ? 4 : 12,
        display: 'flex',
        flexDirection: 'column',
        borderWidth: isInline ? 1 : 0,
        borderColor: '#E2E8F0',
      }}
    >
          {/* TOP VERIFICATION BAR */}
          <View
            style={{
              backgroundColor: '#0F172A',
              paddingHorizontal: 20,
              paddingVertical: 14,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: '#1E293B',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 36, height: 36, resizeMode: 'contain' }}
              />
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? 'ফ্লাইট কেয়ার ভেরিফাইড প্রোটোকল অফিসার' : 'Verified Protocol Officer Profile'}
                </Text>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                  {lang ? 'সিভিল এভিয়েশন সিকিউরিটি ও সার্ভিস রেজিস্ট্রি' : 'Civil Aviation Security & Service Registry'}
                </Text>
              </View>
            </View>

            {/* Language Switcher & Close Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setLang(l => (l === 1 ? 0 : 1))}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: '#1E293B',
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
              >
                <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '800' }}>
                  {lang === 1 ? 'English' : 'বাংলা'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#334155',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* MAIN SCROLLABLE CONTENT */}
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
          >
            {loading || !officer ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, color: '#64748B' }}>
                  {lang ? 'অফিসার তথ্য লোড হচ্ছে...' : 'Loading officer profile...'}
                </Text>
              </View>
            ) : (
              <>
                {/* 1. OFFICER HERO PROFILE CARD */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 18,
                    padding: 20,
                    borderWidth: 1.5,
                    borderColor: '#E2E8F0',
                    marginBottom: 18,
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.04,
                    shadowRadius: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
                    {/* Avatar with Verified Ring */}
                    <View
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: 44,
                        borderWidth: 3,
                        borderColor: '#0284C7',
                        backgroundColor: '#E0F2FE',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#0284C7',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        overflow: 'hidden',
                      }}
                    >
                      {(officer.photo || (typeof officer.avatar === 'string' && (officer.avatar.startsWith('http') || officer.avatar.startsWith('data:image')))) ? (
                        <Image
                          source={{ uri: officer.photo || officer.avatar }}
                          style={{ width: '100%', height: '100%', borderRadius: 44 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 44 }}>
                          {officer.role?.includes('VIP') ? '⭐' : officer.role?.includes('Medical') ? '🩺' : officer.role?.includes('Wheelchair') ? '🦽' : '🧑‍✈️'}
                        </Text>
                      )}
                    </View>

                    {/* Officer Identity Details */}
                    <View style={{ flex: 1, minWidth: 220 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A' }}>
                          {officerName}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: '#ECFDF5',
                            paddingHorizontal: 8,
                            paddingVertical: 2.5,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#A7F3D0',
                          }}
                        >
                          <Text style={{ fontSize: 11, color: '#059669', fontWeight: '800' }}>✓</Text>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#065F46' }}>
                            {lang ? 'অন-ডিউটি ও অনুমোদিত' : 'Verified & Active'}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0284C7', marginTop: 4 }}>
                        {officerRole}
                      </Text>

                      <Text style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                        📍 {airportName}
                      </Text>
                      <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                        🚪 {stationName}
                      </Text>

                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                            ID: <Text style={{ color: '#0F172A', fontWeight: '900' }}>{officer.badgeNo || 'FC-PO-001'}</Text>
                          </Text>
                        </View>
                        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                            Pass: <Text style={{ color: '#0F172A', fontWeight: '900' }}>{officer.licenseNo || 'CAAB-SEC-8941'}</Text>
                          </Text>
                        </View>
                        {officer.bloodGroup && (
                          <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#DC2626' }}>
                              Blood: {officer.bloodGroup}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                {/* MASTER EARNED POINTS SHOWCASE CARD (সম্মিলিত যোগফল) */}
                <View
                  style={{
                    backgroundColor: '#FFFBEB',
                    borderRadius: 18,
                    padding: 18,
                    borderWidth: 1.5,
                    borderColor: '#FDE68A',
                    marginBottom: 16,
                    shadowColor: '#D97706',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.12,
                    shadowRadius: 10,
                    elevation: 4,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    {/* Left: Trophy + Title */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
                      <View
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 26,
                          backgroundColor: '#FEF3C7',
                          borderWidth: 2,
                          borderColor: '#F59E0B',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#F59E0B',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 28 }}>{pointsData.rankIcon || '🏆'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#92400E' }}>
                            {lang ? 'অফিসার অর্জিত পয়েন্ট' : 'Total Earned Points'}
                          </Text>
                          {/* 10-Rank Badge */}
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setShowRanksModal(true)}
                            style={{
                              backgroundColor: pointsData.tierBgColor || '#FEF3C7',
                              paddingHorizontal: 8,
                              paddingVertical: 2.5,
                              borderRadius: 6,
                              borderWidth: 1.5,
                              borderColor: pointsData.tierBadgeColor || '#D97706',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Text style={{ fontSize: 11 }}>{pointsData.rankIcon || '⭐'}</Text>
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '900',
                                color: pointsData.tierBadgeColor || '#D97706',
                              }}
                            >
                              {lang
                                ? (pointsData.rank?.shortBn || `র‍্যাংক ${pointsData.rankLevel}`)
                                : (pointsData.rank?.shortEn || `Rank ${pointsData.rankLevel}`)}: {lang ? pointsData.tierBn : pointsData.tier}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 11.5, color: '#B45309', marginTop: 2, fontWeight: '600' }}>
                          {lang ? '৬টি পারফরম্যান্স ফ্যাক্টরের ভিত্তিতে ১০টি র‍্যাংকে বিভাজিত' : 'Ranked in 10-tier hierarchy across 6 performance factors'}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Big Points Number */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                        <Text style={{ fontSize: 32, fontWeight: '900', color: '#B45309' }}>
                          {totalPoints.toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#D97706' }}>
                          {lang ? 'পয়েন্ট' : 'pts'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#78350F', fontWeight: '700' }}>
                        {lang ? '১০০% ভেরিফাইড স্কোর' : '100% Verified Score'}
                      </Text>
                    </View>
                  </View>

                  {/* Rank Level Progression Bar */}
                  {pointsData.rank?.nextRank && (
                    <View
                      style={{
                        marginTop: 12,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#78350F' }}>
                          {lang
                            ? `পরবর্তী র‍্যাংক [${pointsData.rank.nextRank.badgeIcon} ${pointsData.rank.nextRank.nameBn}] পৌঁছাতে আর ${pointsData.pointsToNextRank.toLocaleString()} পয়েন্ট প্রয়োজন`
                            : `${pointsData.pointsToNextRank.toLocaleString()} pts to next rank: ${pointsData.rank.nextRank.badgeIcon} ${pointsData.rank.nextRank.nameEn}`}
                        </Text>
                        <Text style={{ fontSize: 11.5, fontWeight: '900', color: pointsData.tierBadgeColor || '#D97706' }}>
                          {pointsData.progressPercent}%
                        </Text>
                      </View>
                      {/* Progress Track */}
                      <View
                        style={{
                          height: 7,
                          backgroundColor: '#FEF3C7',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(5, pointsData.progressPercent))}%`,
                            backgroundColor: pointsData.tierBadgeColor || '#D97706',
                            borderRadius: 4,
                          }}
                        />
                      </View>
                    </View>
                  )}

                  {/* Quick Factor Points Chips */}
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginTop: 14,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: '#FDE68A',
                    }}
                  >
                    {pointsBreakdown.map(item => (
                      <View
                        key={item.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: '#FFFFFF',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#FEF08A',
                        }}
                      >
                        <Text style={{ fontSize: 12 }}>{item.icon}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                          {lang ? item.titleBn.split(' ')[0] : item.titleEn.split(' ')[0]}:
                        </Text>
                        <Text style={{ fontSize: 11.5, fontWeight: '900', color: item.color || '#B45309' }}>
                          +{item.points}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Actions: View 10 Ranks & Toggle Formula */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      onPress={() => setShowRanksModal(true)}
                      style={{
                        flex: 1,
                        minWidth: 170,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        backgroundColor: '#0F2A4A',
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>🎖️</Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                        {lang ? '১০টি র‍্যাংক তালিকা দেখুন' : 'View 10 Ranks Ladder'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShowPointsBreakdown(!showPointsBreakdown)}
                      style={{
                        flex: 1,
                        minWidth: 170,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        backgroundColor: '#FEF3C7',
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                        flexDirection: 'row',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#92400E' }}>
                        {showPointsBreakdown
                          ? (lang ? '▲ পয়েন্ট সূত্র লুকান' : '▲ Hide Points Formula')
                          : (lang ? '▼ পয়েন্ট গণনার সূত্র' : '▼ Points Calculation Details')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Expandable Points Breakdown & Mathematical Sum Table */}
                  {showPointsBreakdown && (
                    <View
                      style={{
                        marginTop: 12,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#78350F', marginBottom: 8 }}>
                        {lang ? '📊 প্রতিটি বিষয়ের অর্জিত পয়েন্ট ও হিসাব পদ্ধতি:' : '📊 Itemized Points Breakdown & Formula:'}
                      </Text>

                      <View style={{ gap: 8 }}>
                        {pointsBreakdown.map((item, idx) => (
                          <View
                            key={item.id}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 6,
                              paddingHorizontal: 8,
                              backgroundColor: idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF',
                              borderRadius: 8,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <Text style={{ fontSize: 15 }}>{item.icon}</Text>
                              <View>
                                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E293B' }}>
                                  {lang ? item.titleBn : item.titleEn}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#64748B' }}>
                                  {lang ? 'সূত্র:' : 'Formula:'} {item.formula} ({item.value} {lang ? item.unitBn : item.unitEn})
                                </Text>
                              </View>
                            </View>
                            <View
                              style={{
                                backgroundColor: item.color ? `${item.color}15` : '#FEF3C7',
                                paddingHorizontal: 9,
                                paddingVertical: 4,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: item.color ? `${item.color}40` : '#FDE68A',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: '900',
                                  color: item.color || '#92400E',
                                }}
                              >
                                +{item.points} {lang ? 'পয়েন্ট' : 'pts'}
                              </Text>
                            </View>
                          </View>
                        ))}

                        {/* Grand Total Row */}
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 10,
                            marginTop: 4,
                            borderTopWidth: 1.5,
                            borderTopColor: '#CBD5E1',
                            paddingHorizontal: 8,
                          }}
                        >
                          <View>
                            <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#0F172A' }}>
                              {lang ? '∑ সর্বমোট সম্মিলিত যোগফল:' : '∑ Grand Combined Total:'}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              {pointsBreakdown.map(p => p.points).join(' + ')}
                            </Text>
                          </View>
                          <View
                            style={{
                              backgroundColor: '#FEF3C7',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              borderWidth: 1.5,
                              borderColor: '#F59E0B',
                            }}
                          >
                            <Text style={{ fontSize: 15, fontWeight: '900', color: '#92400E' }}>
                              = {totalPoints.toLocaleString()} {lang ? 'পয়েন্ট' : 'pts'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* 2. STATS KPI COUNTER GRID */}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {/* KPI 1: Completed Services */}
                  <View
                    style={{
                      flex: 1,
                      minWidth: 130,
                      backgroundColor: '#F0F9FF',
                      borderRadius: 14,
                      padding: 14,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#BAE6FD',
                    }}
                  >
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#0284C7' }}>
                      {officer.completedServices || 142}+
                    </Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0369A1', marginTop: 4, textAlign: 'center' }}>
                      {lang ? 'সম্পন্ন সার্ভিস' : 'Services Completed'}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                      {lang ? 'সফল প্রোটোকল প্রদান' : 'Verified protocols'}
                    </Text>
                    <View style={{ marginTop: 6, backgroundColor: '#E0F2FE', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#BAE6FD' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7' }}>
                        +{pointsBreakdown[0]?.points || ((officer.completedServices || 142) * 10)} {lang ? 'পয়েন্ট' : 'pts'}
                      </Text>
                    </View>
                  </View>

                  {/* KPI 2: Overall Rating */}
                  <View
                    style={{
                      flex: 1,
                      minWidth: 130,
                      backgroundColor: '#FEFCE8',
                      borderRadius: 14,
                      padding: 14,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#FEF08A',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 24, fontWeight: '900', color: '#CA8A04' }}>
                        {officer.rating || 4.9}
                      </Text>
                      <Text style={{ fontSize: 18, color: '#EAB308' }}>★</Text>
                    </View>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#854D0E', marginTop: 4, textAlign: 'center' }}>
                      {lang ? 'যাত্রীদের রেটিং' : 'Customer Rating'}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                      {officer.reviewCount || reviews.length} {lang ? 'টি রিভিউ' : 'reviews'}
                    </Text>
                    <View style={{ marginTop: 6, backgroundColor: '#FEF9C3', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FEF08A' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#A16207' }}>
                        +{pointsBreakdown[1]?.points || 500} {lang ? 'পয়েন্ট' : 'pts'}
                      </Text>
                    </View>
                  </View>

                  {/* KPI 3: Punctuality */}
                  <View
                    style={{
                      flex: 1,
                      minWidth: 130,
                      backgroundColor: '#ECFDF5',
                      borderRadius: 14,
                      padding: 14,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#A7F3D0',
                    }}
                  >
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#059669' }}>
                      {officer.punctualityRate || '99.8%'}
                    </Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#065F46', marginTop: 4, textAlign: 'center' }}>
                      {lang ? 'সময়নিষ্ঠতা' : 'Punctuality'}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                      {lang ? 'বোর্ডিং গেটে উপস্থিতি' : 'On-time arrival'}
                    </Text>
                    <View style={{ marginTop: 6, backgroundColor: '#ECFDF5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>
                        +{pointsBreakdown[2]?.points || 998} {lang ? 'পয়েন্ট' : 'pts'}
                      </Text>
                    </View>
                  </View>

                  {/* KPI 4: Passenger Satisfaction */}
                  <View
                    style={{
                      flex: 1,
                      minWidth: 130,
                      backgroundColor: '#FDF4FF',
                      borderRadius: 14,
                      padding: 14,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#F0ABFC',
                    }}
                  >
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#A21CAF' }}>
                      {officer.satisfactionRate || '99.4%'}
                    </Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#86198F', marginTop: 4, textAlign: 'center' }}>
                      {lang ? 'যাত্রী সন্তুষ্টি' : 'Satisfaction'}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                      {lang ? 'পজিটিভ ফিডব্যাক' : 'Positive ratings'}
                    </Text>
                    <View style={{ marginTop: 6, backgroundColor: '#FDF4FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#F0ABFC' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#A21CAF' }}>
                        +{pointsBreakdown[3]?.points || 994} {lang ? 'পয়েন্ট' : 'pts'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3. TABS NAVIGATION: Overview / Reviews / Add Review */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: '#F1F5F9',
                    borderRadius: 12,
                    padding: 4,
                    marginBottom: 18,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setActiveTab('overview')}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 9,
                      backgroundColor: activeTab === 'overview' ? '#FFFFFF' : 'transparent',
                      alignItems: 'center',
                      shadowColor: activeTab === 'overview' ? '#000' : 'transparent',
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: activeTab === 'overview' ? 2 : 0,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'overview' ? '#0284C7' : '#64748B' }}>
                      {lang ? 'সার্ভিস ও বিবরণ' : 'Overview & Skills'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab('reviews')}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 9,
                      backgroundColor: activeTab === 'reviews' ? '#FFFFFF' : 'transparent',
                      alignItems: 'center',
                      shadowColor: activeTab === 'reviews' ? '#000' : 'transparent',
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: activeTab === 'reviews' ? 2 : 0,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'reviews' ? '#0284C7' : '#64748B' }}>
                      {lang ? `যাত্রীদের রিভিউ (${reviews.length})` : `Reviews (${reviews.length})`}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab('add_review')}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 9,
                      backgroundColor: activeTab === 'add_review' ? '#FFFFFF' : 'transparent',
                      alignItems: 'center',
                      shadowColor: activeTab === 'add_review' ? '#000' : 'transparent',
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: activeTab === 'add_review' ? 2 : 0,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'add_review' ? '#0284C7' : '#64748B' }}>
                      {lang ? '✍️ রিভিউ লিখুন' : '✍️ Write Review'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* TAB 1: OVERVIEW & SPECIALTIES */}
                {activeTab === 'overview' && (
                  <View style={{ gap: 16 }}>
                    {/* Specializations Tags */}
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 14,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>
                        {lang ? 'প্রোটোকল দক্ষতা ও বিশেষজ্ঞ সেবা:' : 'Core Protocol Competencies:'}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {specialties.map((spec, idx) => (
                          <View
                            key={idx}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#F0F9FF',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#BAE6FD',
                            }}
                          >
                            <Text style={{ color: '#0284C7', fontSize: 12 }}>✓</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0369A1' }}>
                              {spec}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Officer Notes & Bio */}
                    {officer.notes && (
                      <View
                        style={{
                          backgroundColor: '#F8FAFC',
                          borderRadius: 14,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                          {lang ? 'প্রোটোকল প্রোফাইল বিবরণ' : 'Officer Profile Notes'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20 }}>
                          {officer.notes}
                        </Text>
                      </View>
                    )}

                    {/* Detailed Earned Points Scorecard Section (সম্মিলিত যোগফল) */}
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 14,
                        padding: 16,
                        borderWidth: 1.5,
                        borderColor: '#FDE68A',
                        shadowColor: '#F59E0B',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 18 }}>🏆</Text>
                          <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#0F172A' }}>
                            {lang ? 'অর্জিত পারফরম্যান্স পয়েন্ট স্কোরকার্ড' : 'Earned Points Scorecard'}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: '#FEF3C7',
                            paddingHorizontal: 10,
                            paddingVertical: 3.5,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#F59E0B',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '900', color: '#92400E' }}>
                            {lang ? 'সম্মিলিত মোট:' : 'Combined Total:'} {totalPoints.toLocaleString()} {lang ? 'পয়েন্ট' : 'pts'}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                        {lang
                          ? 'প্রতিটি বিষয়ের (সার্ভিস, রেটিং, সময়নিষ্ঠতা, সন্তুষ্টি, রিভিউ ও দক্ষতা) সম্মিলিত যোগফলের মাধ্যমে নির্ধারিত পয়েন্ট:'
                          : 'Points determined as the combined mathematical sum of each performance factor:'}
                      </Text>

                      <View style={{ gap: 8 }}>
                        {pointsBreakdown.map((item, index) => {
                          const percent = Math.min(100, Math.round((item.points / (item.id === 'services' ? 2000 : 1000)) * 100));
                          return (
                            <View
                              key={item.id}
                              style={{
                                backgroundColor: '#F8FAFC',
                                borderRadius: 10,
                                padding: 10,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                              }}
                            >
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E293B' }}>
                                    {lang ? item.titleBn : item.titleEn}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 12.5, fontWeight: '900', color: item.color || '#0284C7' }}>
                                  +{item.points} {lang ? 'পয়েন্ট' : 'pts'}
                                </Text>
                              </View>

                              {/* Progress bar visual indicator */}
                              <View style={{ height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginVertical: 3 }}>
                                <View style={{ height: 5, width: `${percent}%`, backgroundColor: item.color || '#0284C7', borderRadius: 3 }} />
                              </View>

                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 11, color: '#64748B' }}>
                                  {lang ? 'মূল্য:' : 'Value:'} {item.value} {lang ? item.unitBn : item.unitEn}
                                </Text>
                                <Text style={{ fontSize: 10.5, color: '#94A3B8' }}>
                                  {lang ? 'সূত্র:' : 'Formula:'} {item.formula}
                                </Text>
                              </View>
                            </View>
                          );
                        })}

                        {/* Combined Total Footer */}
                        <View
                          style={{
                            backgroundColor: '#FFFBEB',
                            borderRadius: 10,
                            padding: 12,
                            marginTop: 4,
                            borderWidth: 1.5,
                            borderColor: '#FDE68A',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <View>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#78350F' }}>
                              {lang ? 'সম্মিলিত সর্বমোট অর্জিত পয়েন্ট:' : 'Total Combined Earned Points:'}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#92400E' }}>
                              ⭐ {lang ? pointsData.tierBn : pointsData.tier}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: '#B45309' }}>
                            {totalPoints.toLocaleString()} {lang ? 'পয়েন্ট' : 'pts'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Official Verification Seal Banner */}
                    <View
                      style={{
                        backgroundColor: '#ECFDF5',
                        borderRadius: 14,
                        padding: 16,
                        borderWidth: 1.5,
                        borderColor: '#A7F3D0',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 14,
                      }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: '#10B981',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 24, color: '#FFFFFF' }}>🛡️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#065F46' }}>
                          {lang ? 'সিভিল এভিয়েশন অথরাইজেশন ও ভেরিফিকেশন সিল' : 'Civil Aviation Authority Official Verification Seal'}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                          {lang
                            ? 'এই অফিসার ফ্লাইট কেয়ার এবং বিমানবন্দর নিরাপত্তা কর্তৃপক্ষ কর্তৃক বৈধ পাসধারী ও দায়িত্বপ্রাপ্ত।'
                            : 'This protocol escort is officially badged and approved by Civil Aviation & Flight Care management.'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* TAB 2: REVIEWS LIST */}
                {activeTab === 'reviews' && (
                  <View style={{ gap: 12 }}>
                    {reviews.length === 0 ? (
                      <View style={{ padding: 30, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14 }}>
                        <Text style={{ fontSize: 14, color: '#64748B' }}>
                          {lang ? 'এখনো কোনো রিভিউ প্রদান করা হয়নি।' : 'No reviews submitted yet.'}
                        </Text>
                      </View>
                    ) : (
                      reviews.map((rev, index) => (
                        <View
                          key={rev.id || index}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 14,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.03,
                            shadowRadius: 4,
                          }}
                        >
                          {/* Review Top Row */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                                  {rev.reviewerName}
                                </Text>
                                {rev.verifiedPassenger && (
                                  <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>
                                      {lang ? 'ভেরিফাইড যাত্রী' : 'Verified Passenger'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                ✈️ {rev.flight || 'Flight'} • 📅 {rev.date} • {rev.serviceType || 'Protocol'}
                              </Text>
                            </View>

                            {/* Stars */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              {[1, 2, 3, 4, 5].map(st => (
                                <Text
                                  key={st}
                                  style={{
                                    fontSize: 14,
                                    color: st <= rev.rating ? '#F59E0B' : '#E2E8F0',
                                  }}
                                >
                                  ★
                                </Text>
                              ))}
                            </View>
                          </View>

                          {/* Review Feedback Text */}
                          <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20 }}>
                            "{lang ? (rev.commentBn || rev.commentEn || rev.comment) : (rev.commentEn || rev.commentBn || rev.comment)}"
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* TAB 3: WRITE A REVIEW */}
                {activeTab === 'add_review' && (
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 16,
                      padding: 18,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      {lang ? 'আপনার অভিজ্ঞতা ও মতামত জানান' : 'Rate & Review This Officer'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>
                      {lang
                        ? 'আপনার দেওয়া রিভিউ ভবিষ্যৎ যাত্রীদের সিদ্ধান্ত নিতে সহায়তা করবে।'
                        : 'Your verified feedback helps maintain highest airport protocol service standards.'}
                    </Text>

                    {reviewSuccess && (
                      <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#A7F3D0' }}>
                        <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '800' }}>
                          ✓ {lang ? 'আপনার রিভিউ সফলভাবে প্রকাশ করা হয়েছে!' : 'Thank you! Your review has been published.'}
                        </Text>
                      </View>
                    )}

                    {/* Star Rating Selector */}
                    <View style={{ marginBottom: 14 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                        {lang ? 'রেটিং প্রদান করুন *' : 'Select Star Rating *'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => setReviewRating(star)}
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 8,
                              backgroundColor: star <= reviewRating ? '#FEF3C7' : '#FFFFFF',
                              borderWidth: 1.5,
                              borderColor: star <= reviewRating ? '#F59E0B' : '#CBD5E1',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 20, color: star <= reviewRating ? '#D97706' : '#94A3B8' }}>
                              ★
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Passenger Name */}
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                        {lang ? 'আপনার নাম *' : 'Your Name *'}
                      </Text>
                      <TextInput
                        style={{
                          height: 44,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: '#CBD5E1',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          fontSize: 14,
                          color: '#0F172A',
                        }}
                        placeholder={lang ? 'যেমন: ড. তানভীর আহমেদ' : 'e.g. Dr. Tanvir Ahmed'}
                        placeholderTextColor="#94A3B8"
                        value={reviewName}
                        onChangeText={setReviewName}
                      />
                    </View>

                    {/* Flight Number */}
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                        {lang ? 'ফ্লাইট নম্বর (ঐচ্ছিক)' : 'Flight Number (optional)'}
                      </Text>
                      <TextInput
                        style={{
                          height: 44,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: '#CBD5E1',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          fontSize: 14,
                          color: '#0F172A',
                        }}
                        placeholder={lang ? 'যেমন: BG-084, EK-582' : 'e.g. BG-084, EK-582'}
                        placeholderTextColor="#94A3B8"
                        value={reviewFlight}
                        onChangeText={setReviewFlight}
                        autoCapitalize="characters"
                      />
                    </View>

                    {/* Review Feedback Comment */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                        {lang ? 'আপনার অভিজ্ঞতা ও মতামত *' : 'Your Review & Comments *'}
                      </Text>
                      <TextInput
                        style={{
                          height: 80,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: '#CBD5E1',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          fontSize: 14,
                          color: '#0F172A',
                          textAlignVertical: 'top',
                        }}
                        placeholder={lang ? 'অফিসারের সেবা কেমন ছিল বিস্তারিত লিখুন...' : 'Describe your experience with this protocol officer...'}
                        placeholderTextColor="#94A3B8"
                        multiline
                        value={reviewComment}
                        onChangeText={setReviewComment}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleSubmitReview}
                      disabled={reviewSubmitting}
                      style={{
                        backgroundColor: '#0284C7',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        shadowColor: '#0284C7',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                        {reviewSubmitting
                          ? (lang ? 'রিভিউ জমা হচ্ছে...' : 'Submitting Review...')
                          : (lang ? 'রিভিউ প্রকাশ করুন' : 'Submit Verified Review')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 4. BOTTOM ACTION BUTTONS */}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginTop: 22,
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: '#E2E8F0',
                  }}
                >
                  {/* Button 1: Book This Officer */}
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      if (typeof onBookOfficer === 'function') {
                        onBookOfficer(officer);
                      }
                    }}
                    style={{
                      flex: 1.5,
                      minWidth: 160,
                      backgroundColor: '#0284C7',
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                      shadowColor: '#0284C7',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>🎫</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                      {lang ? 'এই অফিসারকে বুক করুন' : 'Book This Officer'}
                    </Text>
                  </TouchableOpacity>

                  {/* Button 2: Share / Copy Link */}
                  <TouchableOpacity
                    onPress={handleShare}
                    style={{
                      flex: 1,
                      minWidth: 130,
                      backgroundColor: copiedLink ? '#ECFDF5' : '#F1F5F9',
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: copiedLink ? '#A7F3D0' : '#CBD5E1',
                    }}
                  >
                    <Text style={{ fontSize: 15 }}>{copiedLink ? '✓' : '🔗'}</Text>
                    <Text
                      style={{
                        color: copiedLink ? '#059669' : '#334155',
                        fontSize: 13,
                        fontWeight: '800',
                      }}
                    >
                      {copiedLink ? (lang ? 'লিঙ্ক কপি হয়েছে' : 'Copied!') : (lang ? 'শেয়ার লিঙ্ক' : 'Share Profile')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
  );

  if (isInline) {
    return (
      <View style={{ width: '100%', alignItems: 'center' }}>
        {cardContent}
        <ProtocolRanksModal
          visible={showRanksModal}
          onClose={() => setShowRanksModal(false)}
          lang={lang}
          currentOfficer={officer}
        />
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 12,
        }}
      >
        {cardContent}
      </View>

      {/* 10-Tier Protocol Ranks Hierarchy Modal */}
      <ProtocolRanksModal
        visible={showRanksModal}
        onClose={() => setShowRanksModal(false)}
        lang={lang}
        currentOfficer={officer}
      />
    </Modal>
  );
}

