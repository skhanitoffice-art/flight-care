// src/components/MakePlacardModal.js
// Flight Care Enterprise - VIP Airport Protocol Placard Maker & Super Admin History Portal

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  formatPlacardName,
  formatPlacardFlight,
  formatPlacardDate,
  getPlacardHistory,
  savePlacardRecord,
  deletePlacardRecord,
  clearAllPlacardHistory,
  exportPlacardHistoryCsv,
  downloadPlacardImage,
  printPlacardDirect,
} from '../services/placardService';

const PLACARD_TEMPLATE_IMAGE = require('../../assets/placard_template.png');
const PLACARD_PLANE_ICON = require('../../assets/placard_plane_icon.png');
const PLACARD_CAL_ICON = require('../../assets/placard_cal_icon.png');

export default function MakePlacardModal({
  visible,
  onClose,
  managerSession,
  isAdmin = false,
  lang = 0,
}) {
  const isBn = Boolean(lang);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 840;

  // Tabs: 'create' | 'history'
  const [activeTab, setActiveTab] = useState('create');

  // Input states (Defaulting to today's date formatted as DD-MM-YYYY)
  const getTodayDdmmyyyy = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const [passengerName, setPassengerName] = useState('');
  const [serviceDate, setServiceDate] = useState(getTodayDdmmyyyy());
  const [flightNumber, setFlightNumber] = useState('XY-312');

  // Placard History State
  const [historyList, setHistoryList] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Status feedback
  const [statusNotice, setStatusNotice] = useState('');
  const [lastSavedId, setLastSavedId] = useState(null);

  // Load history on mount or when opening modal
  useEffect(() => {
    if (visible) {
      loadHistory();
      if (!serviceDate) setServiceDate(getTodayDdmmyyyy());
    }
  }, [visible]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const list = await getPlacardHistory();
      setHistoryList(list || []);
    } catch {
      setHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!visible) return null;

  // Formatted preview values matching exact official artwork
  const formattedName = formatPlacardName(passengerName || (isBn ? 'যাত্রীর নাম লিখুন' : 'ENTER PASSENGER NAME'));
  const cleanFlight = formatPlacardFlight(flightNumber);
  const formattedDate = formatPlacardDate(serviceDate);

  // Responsive Placard Card Preview calculations (1024 x 724 A4 landscape)
  const previewMaxWidth = isMobile ? Math.min(windowWidth - 40, 480) : 560;
  const previewMaxHeight = isMobile ? 340 : 396;
  let previewWidth = previewMaxWidth;
  let previewHeight = previewWidth * (724 / 1024);
  if (previewHeight > previewMaxHeight) {
    previewHeight = previewMaxHeight;
    previewWidth = previewHeight * (1024 / 724);
  }

  // Dynamic Font Sizing for Live Preview (scaled from 128px base on 1024w)
  const scaleRatio = previewWidth / 1024;
  let baseNameSize = Math.round(128 * scaleRatio);
  if (formattedName.length > 25) {
    baseNameSize = Math.round(baseNameSize * 0.58);
  } else if (formattedName.length > 20) {
    baseNameSize = Math.round(baseNameSize * 0.70);
  } else if (formattedName.length > 15) {
    baseNameSize = Math.round(baseNameSize * 0.84);
  }
  const nameFontSize = Math.max(16, baseNameSize);
  const flightFontSize = Math.max(11, Math.min(18, Math.round(previewWidth * 0.029)));

  // Handle Quick Prefix
  const applyPrefix = (prefix) => {
    const raw = (passengerName || '').trim();
    const cleaned = raw.replace(/^(mr\.|mrs\.|ms\.|dr\.|engr\.|prof\.|begum|barrister)\s+/i, '');
    if (prefix === 'CLEAR') {
      setPassengerName(cleaned);
    } else {
      setPassengerName(`${prefix} ${cleaned}`.trim());
    }
  };

  // Handle Quick Date Chips (DD-MM-YYYY)
  const applyQuickDate = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    setServiceDate(`${dd}-${mm}-${yyyy}`);
  };

  // Handle Generate & Save Placard
  const handleSaveToHistory = async () => {
    if (!passengerName || !passengerName.trim()) {
      setStatusNotice(isBn ? '⚠️ অনুগ্রহ করে যাত্রীর নাম ইনপুট দিন' : '⚠️ Please enter passenger name');
      setTimeout(() => setStatusNotice(''), 3000);
      return null;
    }

    const saved = await savePlacardRecord({
      passengerName: passengerName.trim(),
      serviceDate,
      flightNumber,
      managerSession,
    });

    if (saved) {
      setLastSavedId(saved.id);
      loadHistory();
      return saved;
    }
    return null;
  };

  // Handle Download HD Placard (Synchronous trigger to prevent browser blockers)
  const handleDownload = () => {
    const effectiveName = (passengerName && passengerName.trim()) ? passengerName.trim() : 'MR. ISHAUJHYAODS';
    if (!passengerName || !passengerName.trim()) {
      setPassengerName('MR. ISHAUJHYAODS');
    }

    // Save to history asynchronously in background
    savePlacardRecord({
      passengerName: effectiveName,
      serviceDate,
      flightNumber,
      managerSession,
    }).then(saved => {
      if (saved) {
        setLastSavedId(saved.id);
        loadHistory();
      }
    }).catch(() => {});

    // Instant HD Download
    downloadPlacardImage({
      passengerName: effectiveName,
      flightNumber,
      serviceDate,
      onSuccess: () => {
        setStatusNotice(isBn ? '✓ এইচডি প্লেকার্ড ডাউনলোড হয়েছে!' : '✓ HD Placard downloaded successfully!');
        setTimeout(() => setStatusNotice(''), 4000);
      },
    });
  };

  // Handle Direct Print A4 Placard (Synchronous trigger with iframe print)
  const handlePrint = () => {
    const effectiveName = (passengerName && passengerName.trim()) ? passengerName.trim() : 'MR. ISHAUJHYAODS';
    if (!passengerName || !passengerName.trim()) {
      setPassengerName('MR. ISHAUJHYAODS');
    }

    // Save to history asynchronously in background
    savePlacardRecord({
      passengerName: effectiveName,
      serviceDate,
      flightNumber,
      managerSession,
    }).then(saved => {
      if (saved) {
        setLastSavedId(saved.id);
        loadHistory();
      }
    }).catch(() => {});

    // Instant Direct Print
    printPlacardDirect({
      passengerName: effectiveName,
      flightNumber,
      serviceDate,
      onSuccess: () => {
        setStatusNotice(isBn ? '✓ প্রিন্ট প্রস্তুত করা হয়েছে' : '✓ Print dialog ready');
        setTimeout(() => setStatusNotice(''), 4000);
      },
    });
  };

  // Handle Reset Form
  const handleResetForm = () => {
    setPassengerName('');
    setServiceDate(getTodayDdmmyyyy());
    setFlightNumber('XY-312');
    setLastSavedId(null);
    setStatusNotice('');
  };

  // Filter History List
  const filteredHistory = historyList.filter(item => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return (
      (item.passengerName || '').toLowerCase().includes(q) ||
      (item.flightNumber || '').toLowerCase().includes(q) ||
      (item.createdBy?.name || '').toLowerCase().includes(q) ||
      (item.serviceDate || '').toLowerCase().includes(q)
    );
  });

  // Handle Single Item Delete (Super Admin only)
  const handleDeleteHistoryItem = async (id) => {
    if (!isAdmin) return;
    const updated = await deletePlacardRecord(id);
    setHistoryList(updated || []);
    setStatusNotice(isBn ? '✓ রেকর্ড মুছে ফেলা হয়েছে' : '✓ Placard record deleted');
    setTimeout(() => setStatusNotice(''), 2500);
  };

  // Handle Clear All History
  const handleClearAllHistory = async () => {
    if (!isAdmin) return;
    const confirmed = Platform.OS === 'web'
      ? window.confirm(isBn ? 'আপনি কি নিশ্চিত যে সম্পূর্ণ প্লেকার্ড তৈরির হিস্টোরি মুছে ফেলবেন?' : 'Are you sure you want to clear all placard history?')
      : true;
    if (confirmed) {
      await clearAllPlacardHistory();
      setHistoryList([]);
      setStatusNotice(isBn ? '✓ সম্পূর্ণ হিস্টোরি ক্লিয়ার করা হয়েছে' : '✓ All history cleared');
      setTimeout(() => setStatusNotice(''), 2500);
    }
  };

  // Quick Load From History Item into Generator
  const handleLoadFromHistory = (item) => {
    setPassengerName(item.passengerName || '');
    setFlightNumber(item.flightNumber || 'XY-312');
    if (item.serviceDate) setServiceDate(item.serviceDate);
    setActiveTab('create');
    setStatusNotice(isBn ? `✓ ${item.passengerName} প্লেকার্ড লোড হয়েছে` : `✓ Loaded ${item.passengerName}`);
    setTimeout(() => setStatusNotice(''), 3000);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: isMobile ? 8 : 20,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 1100,
            maxHeight: windowHeight * 0.94,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            overflow: 'hidden',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            elevation: 10,
          }}
        >
          {/* Top Modal Header */}
          <View
            style={{
              backgroundColor: '#0E2A47',
              paddingHorizontal: isMobile ? 14 : 22,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: '#1E3A5F',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: '#D97706',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 20 }}>🏷️</Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: '800', color: '#FFFFFF' }}>
                    {isBn ? 'ভিআইপি এয়ারপোর্ট প্লেকার্ড মেকার' : 'VIP Airport Placard Maker'}
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#1E3A5F',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#D97706',
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FBBF24' }}>
                      {isAdmin ? '👑 SUPER ADMIN' : '🛡️ OPERATIONS MANAGER'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11.5, color: '#94A3B8' }}>
                  {isBn
                    ? 'শুধু নাম ও তারিখ দিলে তাৎক্ষণিক প্লেকার্ড তৈরি, এইচডি ডাউনলোড ও সরাসরি প্রিন্ট'
                    : 'Enter Name & Date to generate, download HD image & direct print'}
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Sub Navigation Bar: [🏷️ Make Placard] vs [📜 Placard History (Super Admin)] */}
          <View
            style={{
              backgroundColor: '#F8FAFC',
              paddingHorizontal: isMobile ? 12 : 20,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setActiveTab('create')}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 8,
                  backgroundColor: activeTab === 'create' ? '#0E2A47' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: activeTab === 'create' ? '#0E2A47' : '#CBD5E1',
                }}
              >
                <Text style={{ fontSize: 13 }}>🏷️</Text>
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '800',
                    color: activeTab === 'create' ? '#FFFFFF' : '#334155',
                  }}
                >
                  {isBn ? 'প্লেকার্ড তৈরি করুন' : 'Make Placard'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setActiveTab('history');
                  loadHistory();
                }}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 8,
                  backgroundColor: activeTab === 'history' ? '#0E2A47' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: activeTab === 'history' ? '#0E2A47' : '#CBD5E1',
                }}
              >
                <Text style={{ fontSize: 13 }}>📜</Text>
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '800',
                    color: activeTab === 'history' ? '#FFFFFF' : '#334155',
                  }}
                >
                  {isBn ? 'তৈরির হিস্টোরি' : 'Placard History'}
                </Text>
                <View
                  style={{
                    backgroundColor: activeTab === 'history' ? '#D97706' : '#E2E8F0',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: activeTab === 'history' ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {historyList.length}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Quick Status Notice */}
            {statusNotice ? (
              <View
                style={{
                  backgroundColor: '#FEF3C7',
                  borderWidth: 1,
                  borderColor: '#F59E0B',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#92400E' }}>
                  {statusNotice}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Modal Main Content Body */}
          <ScrollView
            style={{ flex: 1, backgroundColor: '#FFFFFF' }}
            contentContainerStyle={{ padding: isMobile ? 12 : 20 }}
          >
            {activeTab === 'create' ? (
              /* TAB 1: MAKE PLACARD (INPUTS & LIVE OUTPUT) */
              <View
                style={{
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: 20,
                  alignItems: 'flex-start',
                }}
              >
                {/* LEFT COLUMN: SIMPLE INPUT FORM (Name & Date) */}
                <View
                  style={{
                    flex: isMobile ? 1 : 0.9,
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 14,
                    padding: isMobile ? 14 : 18,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View style={{ marginBottom: 14 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                      📝 {isBn ? 'প্লেকার্ড তথ্য ইনপুট' : 'Placard Quick Inputs'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                      {isBn
                        ? 'শুধুমাত্র নাম ও তারিখ লিখে সরাসরি প্লেকার্ড আউটপুট তৈরি করুন'
                        : 'Input passenger name & date to generate instant placard'}
                    </Text>
                  </View>

                  {/* 1. PASSENGER NAME (Required) */}
                  <View style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E293B' }}>
                        👤 {isBn ? 'যাত্রীর নাম (Passenger Name):' : 'Passenger Name:'}
                        <Text style={{ color: '#EF4444' }}> *</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        {isBn ? 'ইংরেজি বড় অক্ষরে লিখুন' : 'Capital letters'}
                      </Text>
                    </View>

                    {/* Quick Honorific Chips */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {['MR.', 'MRS.', 'MS.', 'DR.', 'ENGR.', 'BEGUM', 'CLEAR'].map(p => (
                        <TouchableOpacity
                          key={p}
                          onPress={() => applyPrefix(p)}
                          activeOpacity={0.7}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            backgroundColor: p === 'CLEAR' ? '#FEE2E2' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: p === 'CLEAR' ? '#FCA5A5' : '#CBD5E1',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10.5,
                              fontWeight: '700',
                              color: p === 'CLEAR' ? '#B91C1C' : '#1E293B',
                            }}
                          >
                            {p}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TextInput
                      value={passengerName}
                      onChangeText={setPassengerName}
                      placeholder={isBn ? 'যেমন: MR. ISHAUJHYAODS বা DR. RAHMAN' : 'e.g. MR. ISHAUJHYAODS or DR. RAHMAN'}
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: passengerName.trim() ? '#0284C7' : '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#0F172A',
                      }}
                    />
                    <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 4 }}>
                      💡 {isBn ? 'কোনো টাইটেল না দিলে শুরুতে স্বয়ংক্রিয়ভাবে MR. যুক্ত হবে' : 'Auto prepends MR. if no title is present'}
                    </Text>
                  </View>

                  {/* 2. SERVICE DATE (Required, format DD-MM-YYYY) */}
                  <View style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E293B' }}>
                        📅 {isBn ? 'সার্ভিস তারিখ (DD-MM-YYYY):' : 'Service Date (DD-MM-YYYY):'}
                        <Text style={{ color: '#EF4444' }}> *</Text>
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#012B14' }}>
                        {formattedDate}
                      </Text>
                    </View>

                    {/* Quick Date Shortcuts */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                      <TouchableOpacity
                        onPress={() => applyQuickDate(0)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor: '#E0F2FE',
                          borderWidth: 1,
                          borderColor: '#BAE6FD',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1' }}>
                          📅 {isBn ? 'আজ (Today)' : 'Today'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => applyQuickDate(1)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                          {isBn ? 'আগামীকাল' : 'Tomorrow'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => applyQuickDate(2)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                          {isBn ? '+২ দিন' : '+2 Days'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      value={serviceDate}
                      onChangeText={setServiceDate}
                      placeholder="DD-MM-YYYY (e.g. 29-10-2026)"
                      placeholderTextColor="#94A3B8"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 13.5,
                        fontWeight: '700',
                        color: '#0F172A',
                      }}
                    />
                  </View>

                  {/* 3. FLIGHT NUMBER (Optional) */}
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E293B' }}>
                        ✈️ {isBn ? 'ফ্লাইট নম্বর (ঐচ্ছিক):' : 'Flight Number (Optional):'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        {isBn ? 'যেমন: XY-312, BG-084' : 'e.g. XY-312, BG-084'}
                      </Text>
                    </View>

                    {/* Quick Flight Chips */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {['XY-312', 'BG-084', 'EK-582', 'QR-638', 'SV-804', 'VIP ESCORT'].map(f => (
                        <TouchableOpacity
                          key={f}
                          onPress={() => setFlightNumber(f)}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            backgroundColor: flightNumber === f ? '#EFF6FF' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: flightNumber === f ? '#3B82F6' : '#CBD5E1',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10.5,
                              fontWeight: '700',
                              color: flightNumber === f ? '#1D4ED8' : '#334155',
                            }}
                          >
                            {f}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TextInput
                      value={flightNumber}
                      onChangeText={setFlightNumber}
                      placeholder="e.g. XY-312 or BG-084"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 13.5,
                        fontWeight: '700',
                        color: '#0F172A',
                      }}
                    />
                  </View>

                  {/* Action Buttons: Save & Reset */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={handleSaveToHistory}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        backgroundColor: '#0E2A47',
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#D97706',
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                        💾 {isBn ? 'হিস্টোরিতে সংরক্ষণ' : 'Save to History'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleResetForm}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                        🔄 {isBn ? 'রিসেট' : 'Reset'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* RIGHT COLUMN: LIVE PLACARD OUTPUT & ACTIONS */}
                <View
                  style={{
                    flex: isMobile ? 1 : 1.1,
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: '100%',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                        🖼️ {isBn ? 'লাইভ প্লেকার্ড আউটপুট' : 'Live Placard Output'}
                      </Text>
                      <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>
                          A4 LANDSCAPE
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>
                      {isBn ? 'অফিশিয়াল ডিজাইন সাইন' : 'Official HSIA Airport Sign'}
                    </Text>
                  </View>

                  {/* The Live Placard Card Container */}
                  <View
                    style={{
                      width: previewWidth,
                      height: previewHeight,
                      position: 'relative',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 10,
                      overflow: 'hidden',
                      boxShadow: '0 15px 30px -8px rgba(0, 0, 0, 0.3)',
                      elevation: 8,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                  >
                    {/* Background template artwork */}
                    <Image
                      source={PLACARD_TEMPLATE_IMAGE}
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                      }}
                      resizeMode="contain"
                    />

                    {/* Passenger Name Overlay (Bold condensed dark green #012B14) */}
                    <View
                      style={{
                        position: 'absolute',
                        top: '52.5%',
                        left: '4%',
                        right: '4%',
                        transform: [{ translateY: -nameFontSize * 0.5 }],
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: nameFontSize,
                          fontWeight: '900',
                          color: '#012B14',
                          textAlign: 'center',
                          letterSpacing: 0.5,
                          fontFamily: Platform.OS === 'web' ? "'Impact', 'Montserrat', 'Arial Black', sans-serif" : undefined,
                        }}
                      >
                        {formattedName}
                      </Text>
                    </View>

                    {/* Center Gold Line at x=511, y=460..514 */}
                    <View
                      style={{
                        position: 'absolute',
                        top: '67.2%',
                        left: '50%',
                        width: 2,
                        height: Math.max(16, previewHeight * 0.075),
                        backgroundColor: '#CAA048',
                        transform: [{ translateX: -1 }, { translateY: -Math.max(8, previewHeight * 0.037) }],
                      }}
                    />

                    {/* Flight & Date Overlay */}
                    <View
                      style={{
                        position: 'absolute',
                        top: '67.2%',
                        left: '5%',
                        right: '5%',
                        transform: [{ translateY: -flightFontSize * 0.85 }],
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* Left: Plane Icon + FLIGHT */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 24 }}>
                        <Image
                          source={PLACARD_PLANE_ICON}
                          style={{
                            width: Math.max(16, previewWidth * 0.041),
                            height: Math.max(12, previewHeight * 0.043),
                          }}
                          resizeMode="contain"
                        />
                        <View>
                          <Text style={{ fontSize: Math.max(7, previewWidth * 0.012), fontWeight: '800', color: '#012B14' }}>
                            FLIGHT:
                          </Text>
                          <Text
                            style={{
                              fontSize: flightFontSize,
                              fontWeight: '900',
                              color: '#012B14',
                              letterSpacing: 0.3,
                              fontFamily: Platform.OS === 'web' ? "'Impact', 'Arial Black', sans-serif" : undefined,
                            }}
                          >
                            {cleanFlight}
                          </Text>
                        </View>
                      </View>

                      {/* Right: Calendar Icon + DATE */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 24 }}>
                        <Image
                          source={PLACARD_CAL_ICON}
                          style={{
                            width: Math.max(12, previewWidth * 0.029),
                            height: Math.max(14, previewHeight * 0.047),
                          }}
                          resizeMode="contain"
                        />
                        <View>
                          <Text style={{ fontSize: Math.max(7, previewWidth * 0.012), fontWeight: '800', color: '#012B14' }}>
                            DATE:
                          </Text>
                          <Text
                            style={{
                              fontSize: flightFontSize,
                              fontWeight: '900',
                              color: '#012B14',
                              letterSpacing: 0.3,
                              fontFamily: Platform.OS === 'web' ? "'Impact', 'Arial Black', sans-serif" : undefined,
                            }}
                          >
                            {formattedDate}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Output Action Toolbar (Download & Print) */}
                  <View
                    style={{
                      width: previewWidth,
                      flexDirection: 'row',
                      gap: 10,
                      marginTop: 16,
                    }}
                  >
                    {/* DOWNLOAD HD PLACARD */}
                    <TouchableOpacity
                      onPress={handleDownload}
                      activeOpacity={0.85}
                      style={{
                        flex: 1,
                        backgroundColor: '#0284C7',
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        shadowColor: '#0284C7',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 5,
                        elevation: 4,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>📥</Text>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                          {isBn ? 'এইচডি প্লেকার্ড ডাউনলোড' : 'Download HD Placard'}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#BAE6FD' }}>
                          1024x724 High-Res PNG
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* DIRECT PRINT A4 */}
                    <TouchableOpacity
                      onPress={handlePrint}
                      activeOpacity={0.85}
                      style={{
                        flex: 1,
                        backgroundColor: '#16A34A',
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        shadowColor: '#16A34A',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 5,
                        elevation: 4,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>🖨️</Text>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                          {isBn ? 'সরাসরি প্রিন্ট করুন' : 'Direct Print Placard'}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#DCFCE7' }}>
                          A4 Landscape Print
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginTop: 10, width: previewWidth, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>
                      🔒 {isBn ? 'ডাউনলোড বা প্রিন্ট করলেই এটি সুপার এডমিন অডিট হিস্টোরিতে সংরক্ষিত হয়' : 'Saved to Super Admin Audit History upon download or print'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              /* TAB 2: PLACARD HISTORY & AUDIT LOG (SUPER ADMIN) */
              <View>
                {/* Audit Header Banner */}
                <View
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderColor: '#F59E0B',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: 10,
                  }}
                >
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>👑</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#78350F' }}>
                        {isBn ? 'সুপার এডমিন প্লেকার্ড অডিট হিস্টোরি' : 'Super Admin Placard Generation Audit History'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: '#92400E', marginTop: 2 }}>
                      {isBn
                        ? 'ম্যানেজার ও এডমিনদের দ্বারা প্রস্তুতকৃত সকল ভিআইপি নেমবোর্ডের বিস্তারিত রেকর্ড'
                        : 'Complete history of all VIP placards generated across management'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Export CSV */}
                    <TouchableOpacity
                      onPress={() => exportPlacardHistoryCsv(historyList, lang)}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#D97706',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>📥</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>
                        {isBn ? 'এক্সেল / CSV ডাউনলোড' : 'Export CSV'}
                      </Text>
                    </TouchableOpacity>

                    {/* Clear All (Super Admin only) */}
                    {isAdmin ? (
                      <TouchableOpacity
                        onPress={handleClearAllHistory}
                        activeOpacity={0.8}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: '#FEE2E2',
                          borderWidth: 1,
                          borderColor: '#FCA5A5',
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#DC2626' }}>
                          🗑️ {isBn ? 'ক্লিয়ার' : 'Clear All'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Search & Filter Bar */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F1F5F9',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
                  <TextInput
                    value={historySearch}
                    onChangeText={setHistorySearch}
                    placeholder={isBn ? 'যাত্রীর নাম, ফ্লাইট বা অফিসারের নাম দিয়ে ফিল্টার করুন...' : 'Search by passenger name, flight or officer...'}
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, fontSize: 13, color: '#0F172A' }}
                  />
                  {historySearch ? (
                    <TouchableOpacity onPress={() => setHistorySearch('')}>
                      <Text style={{ fontSize: 13, color: '#64748B', fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* History List Items */}
                {filteredHistory.length === 0 ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>🏷️</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>
                      {isBn ? 'কোনো প্লেকার্ড রেকর্ড পাওয়া যায়নি' : 'No placard history found'}
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {filteredHistory.map((item, idx) => (
                      <View
                        key={item.id || idx}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          borderRadius: 12,
                          padding: 14,
                          flexDirection: isMobile ? 'column' : 'row',
                          justifyContent: 'space-between',
                          alignItems: isMobile ? 'flex-start' : 'center',
                          gap: 12,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        {/* Passenger & Flight Info */}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>
                              {item.passengerName}
                            </Text>
                            <View
                              style={{
                                backgroundColor: '#EFF6FF',
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: '#BFDBFE',
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>
                                ✈️ {item.flightNumber}
                              </Text>
                            </View>
                            <View
                              style={{
                                backgroundColor: '#FEF3C7',
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: '#FDE68A',
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                                📅 {item.serviceDate}
                              </Text>
                            </View>
                          </View>

                          {/* Created By & Timestamp */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 11.5, color: '#475569' }}>
                              🧑‍💼 {isBn ? 'তৈরি করেছেন:' : 'Created by:'}{' '}
                              <Text style={{ fontWeight: '800', color: '#0F172A' }}>
                                {item.createdBy?.name || 'Officer'}
                              </Text>{' '}
                              ({item.createdBy?.roleTitle || item.createdBy?.role || 'Staff'})
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>•</Text>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              ⏱️ {item.createdAtFormatted || item.createdAt}
                            </Text>
                          </View>
                        </View>

                        {/* Action Buttons for this item */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {/* Preview in Maker */}
                          <TouchableOpacity
                            onPress={() => handleLoadFromHistory(item)}
                            activeOpacity={0.8}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: '#F1F5F9',
                              borderWidth: 1,
                              borderColor: '#CBD5E1',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Text style={{ fontSize: 12 }}>👁️</Text>
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                              {isBn ? 'প্রিভিউ' : 'Preview'}
                            </Text>
                          </TouchableOpacity>

                          {/* Download HD */}
                          <TouchableOpacity
                            onPress={() => {
                              downloadPlacardImage({
                                passengerName: item.passengerName,
                                flightNumber: item.flightNumber,
                                serviceDate: item.serviceDate,
                                onSuccess: () => {
                                  setStatusNotice(isBn ? `✓ ${item.passengerName} প্লেকার্ড ডাউনলোড হয়েছে` : `✓ Downloaded ${item.passengerName}`);
                                  setTimeout(() => setStatusNotice(''), 3000);
                                },
                              });
                            }}
                            activeOpacity={0.8}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: '#0284C7',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: '#FFFFFF' }}>📥</Text>
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                              {isBn ? 'ডাউনলোড' : 'Download'}
                            </Text>
                          </TouchableOpacity>

                          {/* Print Direct */}
                          <TouchableOpacity
                            onPress={() => {
                              printPlacardDirect({
                                passengerName: item.passengerName,
                                flightNumber: item.flightNumber,
                                serviceDate: item.serviceDate,
                              });
                            }}
                            activeOpacity={0.8}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: '#16A34A',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: '#FFFFFF' }}>🖨️</Text>
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                              {isBn ? 'প্রিন্ট' : 'Print'}
                            </Text>
                          </TouchableOpacity>

                          {/* Delete Item (Super Admin only) */}
                          {isAdmin ? (
                            <TouchableOpacity
                              onPress={() => handleDeleteHistoryItem(item.id)}
                              activeOpacity={0.8}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 6,
                                borderRadius: 8,
                                backgroundColor: '#FFF1F2',
                                borderWidth: 1,
                                borderColor: '#FECDD3',
                              }}
                            >
                              <Text style={{ fontSize: 12 }}>🗑️</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
