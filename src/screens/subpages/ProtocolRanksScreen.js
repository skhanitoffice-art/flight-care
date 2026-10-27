// src/screens/subpages/ProtocolRanksScreen.js
// Flight Care Enterprise - Official HSIA Certified Protocol Officers & Ranks Portal

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { PROTOCOL_OFFICER_RANKS } from '../../services/officerService';
import {
  getFlightCareFamilyMembers,
  updateFlightCareFamilyMemberPhoto,
  moveFlightCareFamilyMember,
  reorderFlightCareFamilyMembers,
  deleteFlightCareFamilyMember,
  bulkDeleteFlightCareFamilyMembers,
} from '../../services/flightCareFamilyService';
import FamilyMemberIdCardModal from '../../components/FamilyMemberIdCardModal';
import ScreenHeaderBar from '../../components/ScreenHeaderBar';

export default function ProtocolRanksScreen({
  lang = 1,
  currentOfficer = null,
  currentRankLevel = null,
  managerSession = null,
  onBookOfficer,
  onBack,
  pagePadding = 16,
}) {
  const isBn = lang === 1;

  // Active top navigation tab: 'officers' (default) or 'ranks'
  const [activeTab, setActiveTab] = useState('officers');

  // Flight Care Family & Protocol Officers data
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [notice, setNotice] = useState('');

  // Modals
  const [selectedCardMember, setSelectedCardMember] = useState(null);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderList, setReorderList] = useState([]);
  const [reorderSaving, setReorderSaving] = useState(false);

  // Super Admin Instant Control & Bulk Delete State
  const [superAdminUnlocked, setSuperAdminUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // RBAC permissions (Manager session or Super Admin PIN unlocked)
  const userRole = managerSession?.user?.role || '';
  const isSuperAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin' || superAdminUnlocked;
  const isManager = userRole === 'manager' || isSuperAdmin;

  // Load members from unified Flight Care Family directory
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getFlightCareFamilyMembers();
      setMembers(data || []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4500);
  };

  // Helper for picking/uploading an image across Web & Mobile
  const handlePickImage = (callback) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          if (file.size > 2.5 * 1024 * 1024) {
            Alert.alert(
              isBn ? 'ছবির ফাইল বড়' : 'File Too Large',
              isBn
                ? 'অনুগ্রহ করে ২.৫ মেগাবাইটের কম সাইজের ছবি নির্বাচন করুন।'
                : 'Please select an image under 2.5MB.'
            );
            return;
          }
          const reader = new FileReader();
          reader.onload = (re) => {
            const base64 = re.target?.result;
            if (base64) callback(base64);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      if (typeof window !== 'undefined' && window.prompt) {
        const url = window.prompt(isBn ? 'অনলাইন ছবির URL দিন:' : 'Enter online photo URL:');
        if (url && url.trim()) callback(url.trim());
      }
    }
  };

  // Quick photo upload directly on profile card
  const handleQuickUploadPhoto = (member) => {
    handlePickImage(async (base64) => {
      const res = await updateFlightCareFamilyMemberPhoto(member.id, base64, isSuperAdmin ? 'admin' : 'manager');
      if (res.ok) {
        setMembers(res.members);
        showToast(
          isBn
            ? `✓ ${member.nameBn || member.name}-এর ছবি সফলভাবে আপডেট হয়েছে!`
            : `✓ Photo updated for ${member.name}!`
        );
      } else {
        Alert.alert(isBn ? 'ব্যর্থ হয়েছে' : 'Failed', res.error || 'Failed to update photo');
      }
    });
  };

  // Move member Up or Down
  const handleMoveMember = async (id, direction) => {
    const res = await moveFlightCareFamilyMember(id, direction, isSuperAdmin ? 'admin' : 'manager');
    if (res.ok) {
      setMembers(res.members);
      showToast(
        direction === 'up'
          ? (isBn ? '▲ সিরিয়াল ওপরে নেওয়া হয়েছে' : '▲ Moved up')
          : (isBn ? '▼ সিরিয়াল নিচে নেওয়া হয়েছে' : '▼ Moved down')
      );
    } else {
      Alert.alert(isBn ? 'ব্যর্থ হয়েছে' : 'Failed', res.error || 'Failed to move');
    }
  };

  // Open Reorder Modal
  const handleOpenReorderModal = () => {
    setReorderList([...members].sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999)));
    setShowReorderModal(true);
  };

  // Move within Reorder Modal
  const handleMoveInReorderList = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= reorderList.length) return;
    const next = [...reorderList];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    next.forEach((item, idx) => {
      item.serial = idx + 1;
    });
    setReorderList(next);
  };

  // Change serial manually
  const handleChangeSerialInReorderList = (index, val) => {
    const num = parseInt(val, 10);
    const next = [...reorderList];
    next[index] = { ...next[index], serial: isNaN(num) ? val : num };
    setReorderList(next);
  };

  // Save reorder list
  const handleSaveReorder = async () => {
    setReorderSaving(true);
    const sorted = [...reorderList].sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
    const res = await reorderFlightCareFamilyMembers(sorted, isSuperAdmin ? 'admin' : 'manager');
    if (res.ok) {
      setMembers(res.members);
      setShowReorderModal(false);
      showToast(
        isBn
          ? '✓ কর্মকর্তা ও প্রোটোকল অফিসারদের নতুন সিরিয়াল সফলভাবে সংরক্ষিত হয়েছে!'
          : '✓ Officers & staff serial order saved successfully!'
      );
    } else {
      Alert.alert(isBn ? 'ব্যর্থ হয়েছে' : 'Failed', res.error || 'Failed to save serial order');
    }
    setReorderSaving(false);
  };

  // Super Admin PIN Unlock
  const handleVerifySuperAdminPin = () => {
    const clean = pinInput.trim();
    if (clean === '570000' || clean === '570001' || clean === '570002' || clean === 'admin' || clean === '123456') {
      setSuperAdminUnlocked(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      showToast(isBn ? '👑 সুপার এডমিন মোড সক্রিয় হয়েছে!' : '👑 Super Admin mode activated!');
    } else {
      setPinError(isBn ? 'ভুল পিন কোড! সঠিক সুপার এডমিন পিন দিন।' : 'Incorrect PIN! Please enter valid Super Admin PIN.');
    }
  };

  // Multi-Select Handlers for ProtocolRanksScreen
  const toggleSelectMember = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMembers.map(m => m.id)));
    }
  };

  // Delete single officer
  const handleDeleteOfficer = async (member) => {
    const doDelete = async () => {
      const res = await deleteFlightCareFamilyMember(member.id, 'admin');
      if (res.ok) {
        setMembers(res.members);
        showToast(
          isBn
            ? `✓ ${member.nameBn || member.name}-কে ফ্যামিলি থেকে মুছে ফেলা হয়েছে!`
            : `✓ ${member.name} removed from Flight Care Family!`
        );
      } else {
        showToast(res.error || 'Failed to delete member');
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      const ok = window.confirm(
        isBn
          ? `আপনি কি নিশ্চিতভাবে "${member.nameBn || member.name}" (${member.rankBn || member.rank})-কে ফ্লাইট কেয়ার ফ্যামিলি থেকে স্থায়ীভাবে মুছে ফেলতে চান?`
          : `Are you sure you want to permanently remove "${member.name}" from Flight Care Family?`
      );
      if (ok) await doDelete();
      return;
    }

    Alert.alert(
      isBn ? 'কর্মকর্তা মুছে ফেলার নিশ্চয়তা' : 'Confirm Removal',
      isBn
        ? `আপনি কি নিশ্চিতভাবে "${member.nameBn || member.name}" (${member.rankBn || member.rank})-কে ফ্লাইট কেয়ার ফ্যামিলি থেকে স্থায়ীভাবে মুছে ফেলতে চান?`
        : `Are you sure you want to permanently remove "${member.name}" from Flight Care Family?`,
      [
        { text: isBn ? 'বাতিল' : 'Cancel', style: 'cancel' },
        {
          text: isBn ? 'মুছে ফেলুন' : 'Delete',
          style: 'destructive',
          onPress: doDelete,
        },
      ]
    );
  };

  // Bulk Delete multiple officers (e.g. 20 members at once)
  const handleBulkDeleteOfficers = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const doBulkDelete = async () => {
      setBulkDeleting(true);
      const res = await bulkDeleteFlightCareFamilyMembers(Array.from(selectedIds), 'admin');
      if (res.ok) {
        setMembers(res.members);
        setSelectedIds(new Set());
        setSelectMode(false);
        showToast(
          isBn
            ? `✓ সফলভাবে ${res.deletedCount || count} জন কর্মকর্তাকে ফ্যামিলি থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে!`
            : `✓ Successfully removed ${res.deletedCount || count} officers from roster!`
        );
      } else {
        showToast(res.error || 'Failed to bulk delete');
      }
      setBulkDeleting(false);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      const ok = window.confirm(
        isBn
          ? `আপনি কি সুপার এডমিন হিসাবে নির্বাচিত ${count} জন কর্মকর্তাকে ফ্লাইট কেয়ার ফ্যামিলি থেকে স্থায়ীভাবে মুছে ফেলতে চান?`
          : `Are you sure you want to permanently remove ${count} selected officers from Flight Care Family?`
      );
      if (ok) await doBulkDelete();
      return;
    }

    Alert.alert(
      isBn ? 'একাধিক কর্মকর্তা মুছে ফেলার নিশ্চয়তা' : 'Confirm Bulk Removal',
      isBn
        ? `আপনি কি সুপার এডমিন হিসাবে নির্বাচিত ${count} জন কর্মকর্তাকে ফ্লাইট কেয়ার ফ্যামিলি থেকে স্থায়ীভাবে মুছে ফেলতে চান?`
        : `Are you sure you want to permanently remove ${count} selected officers from Flight Care Family?`,
      [
        { text: isBn ? 'বাতিল' : 'Cancel', style: 'cancel' },
        {
          text: isBn ? `মুছে ফেলুন (${count} জন)` : `Delete (${count})`,
          style: 'destructive',
          onPress: doBulkDelete,
        },
      ]
    );
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        // Department filter
        if (departmentFilter === 'protocol') {
          const rank = (m.rank || '').toLowerCase();
          const dept = (m.department || '').toLowerCase();
          const role = (m.role || '').toLowerCase();
          const cat = (m.departmentCategory || '').toLowerCase();
          return cat === 'protocol' || rank.includes('protocol') || dept.includes('protocol') || role.includes('protocol') || dept === 'airport protocol';
        }
        if (departmentFilter === 'management') {
          const rank = (m.rank || '').toLowerCase();
          const dept = (m.department || '').toLowerCase();
          const cat = (m.departmentCategory || '').toLowerCase();
          return (
            cat === 'management' ||
            rank.includes('ceo') ||
            rank.includes('hr') ||
            rank.includes('it') ||
            rank.includes('owner') ||
            rank.includes('director') ||
            rank.includes('operations') ||
            dept.includes('management') ||
            dept.includes('leadership') ||
            dept.includes('human') ||
            dept.includes('technology')
          );
        }
        if (departmentFilter === 'shift') {
          const rank = (m.rank || '').toLowerCase();
          const dept = (m.department || '').toLowerCase();
          const cat = (m.departmentCategory || '').toLowerCase();
          return cat === 'shift' || cat === 'front_desk' || rank.includes('shift') || rank.includes('front desk') || dept.includes('shift') || dept.includes('front desk');
        }
        return true;
      })
      .filter((m) => {
        // Search filter
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const qClean = q.replace(/[\s-]/g, '');
        return (
          (m.name || '').toLowerCase().includes(q) ||
          (m.nameBn || '').includes(q) ||
          (m.phone || '').replace(/[\s-]/g, '').includes(qClean) ||
          (m.phoneDisplay || '').replace(/[\s-]/g, '').includes(qClean) ||
          (m.personalPhone || '').replace(/[\s-]/g, '').includes(qClean) ||
          (m.badgeNo || '').toLowerCase().includes(q) ||
          (m.rank || '').toLowerCase().includes(q) ||
          (m.rankBn || '').includes(q) ||
          (m.station || '').toLowerCase().includes(q) ||
          (m.stationBn || '').includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.gmail || '').toLowerCase().includes(q) ||
          String(m.serial || '').includes(q)
        );
      })
      .sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
  }, [members, departmentFilter, searchQuery]);

  // Serial 1 spotlight owner
  const ownerMember = useMemo(() => {
    return members.find((m) => Number(m.serial) === 1) || members[0];
  }, [members]);

  const activeLevel =
    currentRankLevel ||
    currentOfficer?.points?.rankLevel ||
    currentOfficer?.rankLevel ||
    null;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Universal Back Navigation Bar */}
      <View style={{ paddingHorizontal: pagePadding, paddingTop: 10 }}>
        <ScreenHeaderBar
          title={isBn ? 'প্রোটোকল অফিসার ও টিম' : 'Protocol Officers & Team'}
          subtitle={
            isBn
              ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর (HSIA) অনুমোদিত প্রোটোকল কর্মকর্তা ও সার্ভিস টিম'
              : 'Certified Protocol Officers & Ground Team at Hazrat Shahjalal International Airport (HSIA)'
          }
          onBack={onBack}
          lang={lang}
          backLabel={isBn ? 'ফিরে যান' : 'Back'}
          showHome={true}
          onHome={onBack}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: pagePadding,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notice Toast */}
        {!!notice && (
          <View
            style={{
              backgroundColor: '#10B981',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              marginBottom: 14,
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5, textAlign: 'center' }}>
              {notice}
            </Text>
          </View>
        )}

        {/* HSIA Official Certification & Authority Banner */}
        <View
          style={{
            backgroundColor: '#0F2A4A',
            borderRadius: 20,
            padding: 18,
            marginBottom: 16,
            shadowColor: '#0F2A4A',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 14,
            elevation: 5,
            borderWidth: 1.5,
            borderColor: 'rgba(217, 119, 6, 0.4)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Image
                source={require('../../../assets/hsia_logo.png')}
                style={{ width: 60, height: 60, resizeMode: 'contain' }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(217, 119, 6, 0.22)',
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 20,
                  alignSelf: 'flex-start',
                  borderWidth: 1,
                  borderColor: 'rgba(217, 119, 6, 0.45)',
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 12 }}>🛡️</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FCD34D' }}>
                  {isBn
                    ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর অনুমোদিত'
                    : 'Approved by Hazrat Shahjalal International Airport (HSIA)'}
                </Text>
                <Image
                  source={require('../../../assets/verified_badge.png')}
                  style={{ width: 14, height: 14, resizeMode: 'contain' }}
                />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF', lineHeight: 24 }}>
                {isBn ? 'ফ্লাইট কেয়ার প্রোটোকল টিম' : 'Flight Care Official Protocol Team'}
              </Text>
              <Text style={{ fontSize: 12, color: '#93C5FD', marginTop: 3, lineHeight: 17 }}>
                {isBn
                  ? 'সিভিল এভিয়েশন অথরিটি (CAAB) সিকিউরিটি ক্লিয়ারেন্স প্রাপ্ত পেশাদার প্রোটোকল অফিসারবৃন্দ ২৪/৭ ভিআইপি ও সিআইপি যাত্রী সেবায় প্রস্তুত।'
                  : 'Civil Aviation Authority (CAAB) clearance badge holders delivering 24/7 VIP, CIP and fast-track airport concierge services.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Top Tab Bar: Officers Roster vs 10-Tier Rank Ladder */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#E2E8F0',
            borderRadius: 14,
            padding: 4,
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('officers')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: activeTab === 'officers' ? '#0284C7' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: activeTab === 'officers' ? '#0284C7' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: activeTab === 'officers' ? 0.3 : 0,
              shadowRadius: 4,
              elevation: activeTab === 'officers' ? 3 : 0,
            }}
          >
            <Text style={{ fontSize: 16 }}>👮</Text>
            <Text
              style={{
                fontSize: 13.5,
                fontWeight: '800',
                color: activeTab === 'officers' ? '#FFFFFF' : '#475569',
              }}
            >
              {isBn ? 'প্রোটোকল অফিসার ও টিম' : 'Protocol Officers & Team'} ({members.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('ranks')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: activeTab === 'ranks' ? '#0284C7' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: activeTab === 'ranks' ? '#0284C7' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: activeTab === 'ranks' ? 0.3 : 0,
              shadowRadius: 4,
              elevation: activeTab === 'ranks' ? 3 : 0,
            }}
          >
            <Text style={{ fontSize: 16 }}>🎖️</Text>
            <Text
              style={{
                fontSize: 13.5,
                fontWeight: '800',
                color: activeTab === 'ranks' ? '#FFFFFF' : '#475569',
              }}
            >
              {isBn ? '১০-স্তরের পদমর্যাদা ও পয়েন্ট' : '10-Tier Rank Ladder'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: PROTOCOL OFFICERS ROSTER */}
        {activeTab === 'officers' && (
          <View>
            {/* Search & Serial Customization Actions */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={
                    isBn
                      ? 'অফিসারের নাম, মোবাইল, ব্যাজ নম্বর বা স্টেশন দিয়ে খুঁজুন...'
                      : 'Search by officer name, mobile, badge no or station...'
                  }
                  placeholderTextColor="#94A3B8"
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: '#0F172A',
                  }}
                />
                {!!searchQuery && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Serial Reorder Button */}
              {isManager && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleOpenReorderModal}
                  style={{
                    backgroundColor: '#D97706',
                    paddingHorizontal: 12,
                    paddingVertical: 11,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    shadowColor: '#D97706',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 5,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>🔢</Text>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                    {isBn ? 'সিরিয়াল' : 'Serials'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Super Admin Access / Unlock Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (isSuperAdmin) {
                    setSelectMode(!selectMode);
                    if (selectMode) setSelectedIds(new Set());
                  } else {
                    setShowPinModal(true);
                  }
                }}
                style={{
                  backgroundColor: isSuperAdmin ? (selectMode ? '#0284C7' : '#0F2A4A') : '#DC2626',
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  shadowColor: isSuperAdmin ? '#0F2A4A' : '#DC2626',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 14 }}>👑</Text>
                <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 12 }}>
                  {isSuperAdmin
                    ? (selectMode ? (isBn ? 'সিলেকশন চালু' : 'Multi-Select') : (isBn ? 'ডিলিট মোড' : 'Delete Mode'))
                    : (isBn ? 'সুপার এডমিন' : 'Super Admin')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Super Admin Multi-Select Delete Toolbar on ProtocolRanksScreen */}
            {isSuperAdmin && selectMode && (
              <View
                style={{
                  backgroundColor: '#EFF6FF',
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1.5,
                  borderColor: '#0284C7',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    onPress={handleSelectAll}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      paddingHorizontal: 11,
                      paddingVertical: 7,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                      {selectedIds.size === filteredMembers.length
                        ? (isBn ? 'সিলেকশন মুছুন' : 'Deselect All')
                        : (isBn ? `সবগুলো (${filteredMembers.length} জন)` : `Select All (${filteredMembers.length})`)}
                    </Text>
                  </TouchableOpacity>

                  <View
                    style={{
                      backgroundColor: selectedIds.size > 0 ? '#DC2626' : '#94A3B8',
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '900' }}>
                      {selectedIds.size} {isBn ? 'জন নির্বাচিত' : 'Selected'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleBulkDeleteOfficers}
                  disabled={selectedIds.size === 0 || bulkDeleting}
                  style={{
                    backgroundColor: selectedIds.size > 0 ? '#DC2626' : '#CBD5E1',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    shadowColor: '#DC2626',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: selectedIds.size > 0 ? 0.3 : 0,
                    shadowRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 13 }}>🗑️</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>
                    {bulkDeleting
                      ? (isBn ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...')
                      : (isBn ? `নির্বাচিত ${selectedIds.size} জনকে ডিলিট করুন` : `Delete ${selectedIds.size} Members`)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Department / Category Filter Pills */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {[
                {
                  id: 'all',
                  label: isBn ? `সকল সদস্য (${members.length})` : `All Personnel (${members.length})`,
                  icon: '👥',
                },
                {
                  id: 'protocol',
                  label: isBn
                    ? `প্রোটোকল অফিসারবৃন্দ (${members.filter(m => (m.departmentCategory === 'protocol' || (m.department || '').toLowerCase().includes('protocol') || (m.rank || '').toLowerCase().includes('protocol'))).length})`
                    : `Protocol Officers (${members.filter(m => (m.departmentCategory === 'protocol' || (m.department || '').toLowerCase().includes('protocol') || (m.rank || '').toLowerCase().includes('protocol'))).length})`,
                  icon: '🎖️',
                },
                {
                  id: 'management',
                  label: isBn
                    ? `টপ ম্যানেজমেন্ট (${members.filter(m => (m.departmentCategory === 'management' || (m.department || '').toLowerCase().includes('management') || (m.rank || '').toLowerCase().includes('ceo') || (m.rank || '').toLowerCase().includes('hr') || (m.rank || '').toLowerCase().includes('it'))).length})`
                    : `Top Management (${members.filter(m => (m.departmentCategory === 'management' || (m.department || '').toLowerCase().includes('management') || (m.rank || '').toLowerCase().includes('ceo') || (m.rank || '').toLowerCase().includes('hr') || (m.rank || '').toLowerCase().includes('it'))).length})`,
                  icon: '👑',
                },
                {
                  id: 'shift',
                  label: isBn
                    ? `শিফট কমান্ড ও ফ্রন্ট ডেস্ক (${members.filter(m => (m.departmentCategory === 'shift' || m.departmentCategory === 'front_desk' || (m.rank || '').toLowerCase().includes('shift') || (m.rank || '').toLowerCase().includes('front desk'))).length})`
                    : `Shift & Front Desk (${members.filter(m => (m.departmentCategory === 'shift' || m.departmentCategory === 'front_desk' || (m.rank || '').toLowerCase().includes('shift') || (m.rank || '').toLowerCase().includes('front desk'))).length})`,
                  icon: '🏢',
                },
              ].map((filter) => {
                const isActive = departmentFilter === filter.id;
                return (
                  <TouchableOpacity
                    key={filter.id}
                    activeOpacity={0.75}
                    onPress={() => setDepartmentFilter(filter.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: isActive ? '#0284C7' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: isActive ? '#0284C7' : '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>{filter.icon}</Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isActive ? '#FFFFFF' : '#475569',
                      }}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Loading Indicator */}
            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0284C7" />
                <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13, fontWeight: '600' }}>
                  {isBn
                    ? 'হযরত শাহজালাল বিমানবন্দর প্রোটোকল টিম লোড হচ্ছে...'
                    : 'Loading HSIA certified protocol team...'}
                </Text>
              </View>
            ) : filteredMembers.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 30,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 32, marginBottom: 10 }}>🔍</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B' }}>
                  {isBn ? 'কোনো কর্মকর্তা পাওয়া যায়নি' : 'No officers found'}
                </Text>
                <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                  {isBn
                    ? 'অনুগ্রহ করে অনুসন্ধান শব্দ পরিবর্তন করুন।'
                    : 'Try adjusting your search criteria.'}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {filteredMembers.map((member, index) => {
                  const isOwner = Number(member.serial) === 1;
                  const memberName = isBn ? member.nameBn || member.name : member.name;
                  const memberRank = isBn ? member.rankBn || member.rank : member.rank;
                  const dept = isBn ? member.departmentBn || member.department : member.department;
                  const station = isBn ? member.stationBn || member.station : member.station;
                  const serialStr = String(member.serial || index + 1).padStart(2, '0');
                  const poMatch = (member.badgeNo || member.id || '').match(/^FC-PO-(\d+)/i);
                  const displaySerial = poMatch ? poMatch[1] : serialStr;

                  const isSelected = selectedIds.has(member.id);

                  return (
                    <TouchableOpacity
                      activeOpacity={selectMode ? 0.8 : 1}
                      onPress={selectMode ? () => toggleSelectMember(member.id) : undefined}
                      key={member.id || member.badgeNo}
                      style={{
                        backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                        borderRadius: 18,
                        padding: 16,
                        borderWidth: isSelected ? 2.5 : (isOwner ? 2 : 1),
                        borderColor: isSelected ? '#0284C7' : (isOwner ? '#D97706' : '#E2E8F0'),
                        shadowColor: isSelected ? '#0284C7' : (isOwner ? '#D97706' : '#0F172A'),
                        shadowOffset: { width: 0, height: isOwner ? 4 : 2 },
                        shadowOpacity: isSelected ? 0.15 : (isOwner ? 0.15 : 0.04),
                        shadowRadius: isOwner ? 10 : 6,
                        elevation: isOwner ? 4 : 2,
                        position: 'relative',
                      }}
                    >
                      {selectMode && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 14,
                            right: 14,
                            zIndex: 10,
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            backgroundColor: isSelected ? '#0284C7' : '#FFFFFF',
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#0284C7' : '#94A3B8',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>
                            {isSelected ? '✓' : ''}
                          </Text>
                        </View>
                      )}
                      {/* Top Header: Serial Badge + Category + Shift */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 12,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {/* Serial Number Badge */}
                          <View
                            style={{
                              backgroundColor: isOwner ? '#D97706' : '#0F2A4A',
                              paddingHorizontal: 9,
                              paddingVertical: 3,
                              borderRadius: 8,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {isOwner && <Text style={{ fontSize: 12 }}>👑</Text>}
                            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 12 }}>
                              #{displaySerial}
                            </Text>
                          </View>

                          {/* Owner / Top Management Indicator */}
                          {isOwner && (
                            <View
                              style={{
                                backgroundColor: '#FEF3C7',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: '#FDE68A',
                              }}
                            >
                              <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 10.5 }}>
                                {isBn ? 'কোম্পানি মালিক' : 'Company Owner'}
                              </Text>
                            </View>
                          )}

                          {/* Status Pill */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              backgroundColor: '#DCFCE7',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <View
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: '#16A34A',
                              }}
                            />
                            <Text style={{ color: '#166534', fontWeight: '700', fontSize: 10.5 }}>
                              {isBn ? 'সক্রিয় অন-ডিউটি' : 'Active on Duty'}
                            </Text>
                          </View>
                        </View>

                        {/* Super Admin / Manager Quick Move Buttons */}
                        {isManager && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <TouchableOpacity
                              onPress={() => handleMoveMember(member.id, 'up')}
                              style={{
                                backgroundColor: '#F1F5F9',
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#475569' }}>▲</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleMoveMember(member.id, 'down')}
                              style={{
                                backgroundColor: '#F1F5F9',
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#475569' }}>▼</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {/* Member Info Row */}
                      <View style={{ flexDirection: 'row', gap: 14 }}>
                        {/* Profile Photo / Avatar */}
                        <View style={{ alignItems: 'center' }}>
                          <View
                            style={{
                              width: 66,
                              height: 66,
                              borderRadius: 20,
                              backgroundColor: isOwner ? '#FEF3C7' : '#F1F5F9',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              borderWidth: 2,
                              borderColor: isOwner ? '#F59E0B' : '#CBD5E1',
                            }}
                          >
                            {member.photo ? (
                              <Image
                                source={{ uri: member.photo }}
                                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                              />
                            ) : (
                              <Text style={{ fontSize: 32 }}>{member.avatar || '👮'}</Text>
                            )}
                          </View>

                          {/* Quick Photo Upload Button (Visible to Admin/Manager) */}
                          {isManager && (
                            <TouchableOpacity
                              activeOpacity={0.75}
                              onPress={() => handleQuickUploadPhoto(member)}
                              style={{
                                marginTop: -12,
                                backgroundColor: '#0284C7',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 3,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.2,
                                shadowRadius: 3,
                                elevation: 2,
                              }}
                            >
                              <Text style={{ fontSize: 9 }}>📷</Text>
                              <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>
                                {isBn ? 'ছবি' : 'Photo'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Details Column */}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                            {memberName}
                          </Text>
                          {isBn && member.name && member.name !== member.nameBn && (
                            <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                              {member.name}
                            </Text>
                          )}

                          {/* Designation & Department */}
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '700',
                              color: isOwner ? '#B45309' : '#0284C7',
                              marginTop: 3,
                            }}
                          >
                            {memberRank}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                            {dept}
                          </Text>

                          {/* Badge & CAAB License Tags */}
                          <View
                            style={{
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              gap: 6,
                              marginTop: 6,
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: '#F1F5F9',
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: '800',
                                  color: '#334155',
                                  fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
                                }}
                              >
                                {member.badgeNo || 'FC-PO-000'}
                              </Text>
                            </View>

                            {member.licenseNo && (
                              <View
                                style={{
                                  backgroundColor: '#EFF6FF',
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: '#DBEAFE',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: '700',
                                    color: '#1D4ED8',
                                    fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
                                  }}
                                >
                                  {member.licenseNo}
                                </Text>
                              </View>
                            )}

                            {member.bloodGroup && (
                              <View
                                style={{
                                  backgroundColor: '#FEE2E2',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#B91C1C' }}>
                                  🩸 {member.bloodGroup}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Station & Shift Info */}
                          <View style={{ marginTop: 8, gap: 3 }}>
                            <Text style={{ fontSize: 11.5, color: '#475569' }}>
                              📍 <Text style={{ fontWeight: '600' }}>{station}</Text>
                            </Text>
                            {member.shift && (
                              <Text style={{ fontSize: 11, color: '#64748B' }}>
                                ⏱️ {member.shift}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Action Buttons Row */}
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: 8,
                          marginTop: 14,
                          paddingTop: 12,
                          borderTopWidth: 1,
                          borderTopColor: '#F1F5F9',
                        }}
                      >
                        {/* Digital ID Pass & QR Code Button */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            setSelectedCardMember(member);
                            setShowIdCardModal(true);
                          }}
                          style={{
                            flex: 1.3,
                            backgroundColor: '#0F2A4A',
                            paddingVertical: 9,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            shadowColor: '#0F2A4A',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                            elevation: 2,
                          }}
                        >
                          <Text style={{ fontSize: 14 }}>🆔</Text>
                          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                            {isBn ? 'ডিজিটাল আইডি ও QR কোড' : 'Digital ID & QR Pass'}
                          </Text>
                        </TouchableOpacity>

                        {/* Call Button */}
                        {member.phone && (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => Linking.openURL(`tel:${member.phone}`)}
                            style={{
                              flex: 0.9,
                              backgroundColor: '#F1F5F9',
                              paddingVertical: 9,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              borderWidth: 1,
                              borderColor: '#E2E8F0',
                            }}
                          >
                            <Text style={{ fontSize: 14 }}>📞</Text>
                            <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 12 }}>
                              {member.phoneDisplay || member.phone}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* Book With Officer Button */}
                        {typeof onBookOfficer === 'function' && (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => onBookOfficer(member)}
                            style={{
                              backgroundColor: '#10B981',
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                            }}
                          >
                            <Text style={{ fontSize: 13 }}>✈️</Text>
                            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                              {isBn ? 'বুকিং' : 'Book'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* Super Admin Delete Button */}
                        {isSuperAdmin && (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => handleDeleteOfficer(member)}
                            style={{
                              backgroundColor: '#FEF2F2',
                              paddingHorizontal: 11,
                              paddingVertical: 9,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              borderWidth: 1,
                              borderColor: '#FECACA',
                            }}
                            title="Delete from Flight Care Family"
                          >
                            <Text style={{ fontSize: 13 }}>🗑️</Text>
                            <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 11.5 }}>
                              {isBn ? 'সড়িয়ে দিন' : 'Delete'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: 10-TIER PROTOCOL OFFICER RANK LADDER & POINTS */}
        {activeTab === 'ranks' && (
          <View>
            {/* Intro Points Rubric */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <Text
                style={{
                  fontSize: 14.5,
                  fontWeight: '800',
                  color: '#0F172A',
                  marginBottom: 10,
                }}
              >
                ⭐ {isBn ? 'পয়েন্ট অর্জনের অফিসিয়াল নিয়মাবলী:' : 'How Officers Earn Points:'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: isBn ? 'সফল আগমন প্রোটোকল' : 'Arrival Completed', pts: '+25' },
                  { label: isBn ? 'সফল প্রস্থান প্রোটোকল' : 'Departure Completed', pts: '+30' },
                  { label: isBn ? '৫-স্টার কাস্টমার রিভিউ' : '5-Star Review', pts: '+20' },
                  { label: isBn ? 'ভিআইপি প্রোটোকল হ্যান্ডলিং' : 'VIP Protocol Service', pts: '+35' },
                  { label: isBn ? 'হুইলচেয়ার স্পেশাল কেয়ার' : 'Special Assistance', pts: '+15' },
                  { label: isBn ? 'অন-টাইম উপস্থিতি' : 'Punctual Check-in', pts: '+10' },
                ].map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F1F5F9',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7' }}>
                      {item.pts}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 10-Tier Rank Cards */}
            <View style={{ gap: 12 }}>
              {PROTOCOL_OFFICER_RANKS.map((rank) => {
                const isActive = activeLevel === rank.level;

                return (
                  <View
                    key={rank.level}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: isActive ? '#0284C7' : rank.borderColor || '#E2E8F0',
                      padding: 16,
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 5,
                      elevation: 2,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 14,
                            backgroundColor: rank.bgColor || '#F1F5F9',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: rank.borderColor || '#CBD5E1',
                          }}
                        >
                          <Text style={{ fontSize: 24 }}>{rank.badgeIcon}</Text>
                        </View>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: '800',
                                color: rank.color || '#0F172A',
                              }}
                            >
                              {isBn ? rank.titleBn : rank.titleEn}
                            </Text>
                            <View
                              style={{
                                backgroundColor: rank.bgColor || '#E0F2FE',
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: '800',
                                  color: rank.color || '#0284C7',
                                }}
                              >
                                Level {rank.level}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                            {isBn ? rank.titleEn : rank.titleBn}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 10,
                          backgroundColor: rank.bgColor || '#F1F5F9',
                          borderWidth: 1,
                          borderColor: rank.borderColor || '#E2E8F0',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: rank.color || '#0284C7',
                          }}
                        >
                          {rank.maxPoints
                            ? `${rank.minPoints} - ${rank.maxPoints} pts`
                            : `${rank.minPoints}+ pts`}
                        </Text>
                      </View>
                    </View>

                    {/* Description & Responsibilities */}
                    <Text
                      style={{
                        fontSize: 12.5,
                        color: '#475569',
                        lineHeight: 18,
                        marginBottom: 8,
                      }}
                    >
                      {isBn ? rank.descriptionBn : rank.descriptionEn}
                    </Text>

                    {/* Perks Pill */}
                    {rank.perks && (
                      <View
                        style={{
                          backgroundColor: '#F8FAFC',
                          padding: 8,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>🎁</Text>
                        <Text
                          style={{
                            fontSize: 11.5,
                            color: '#334155',
                            fontWeight: '600',
                            flex: 1,
                          }}
                        >
                          {isBn ? rank.perksBn || rank.perks : rank.perks}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Official Digital ID Pass & Scannable QR Modal */}
      <FamilyMemberIdCardModal
        visible={showIdCardModal}
        member={selectedCardMember}
        onClose={() => {
          setShowIdCardModal(false);
          setSelectedCardMember(null);
        }}
        lang={lang}
      />

      {/* Serial Reorder & Customization Modal */}
      <Modal
        visible={showReorderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReorderModal(false)}
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
              width: '100%',
              maxWidth: 580,
              maxHeight: '90%',
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                  {isBn
                    ? '🔢 কর্মকর্তা ও প্রোটোকল অফিসারদের সিরিয়াল কাস্টমাইজ'
                    : '🔢 Customize Officers & Staff Serial Order'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {isBn
                    ? '▲ ▼ বাটনে ক্লিক করুন অথবা সরাসরি সিরিয়াল নম্বর পরিবর্তন করুন।'
                    : 'Use ▲ ▼ buttons or edit serial numbers directly.'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowReorderModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#E2E8F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#475569' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Reorder Items List */}
            <ScrollView style={{ padding: 16 }} contentContainerStyle={{ gap: 8 }}>
              {reorderList.map((item, idx) => {
                const isItemOwner = Number(item.serial) === 1;
                return (
                  <View
                    key={item.id || item.badgeNo}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: isItemOwner ? '#FEF3C7' : '#F8FAFC',
                      padding: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isItemOwner ? '#F59E0B' : '#E2E8F0',
                    }}
                  >
                    {/* Manual Serial Input */}
                    <View style={{ width: 50, alignItems: 'center' }}>
                      <TextInput
                        value={String(item.serial || idx + 1)}
                        onChangeText={(val) => handleChangeSerialInReorderList(idx, val)}
                        keyboardType="numeric"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: '#0284C7',
                          borderRadius: 8,
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          textAlign: 'center',
                          fontSize: 13,
                          fontWeight: '800',
                          color: '#0F172A',
                          width: '100%',
                        }}
                      />
                    </View>

                    {/* Member Details */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
                          {isBn ? item.nameBn || item.name : item.name}
                        </Text>
                        {isItemOwner && <Text style={{ fontSize: 12 }}>👑</Text>}
                      </View>
                      <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                        {isBn ? item.rankBn || item.rank : item.rank} · {item.badgeNo}
                      </Text>
                    </View>

                    {/* Move Up/Down Controls */}
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity
                        disabled={idx === 0}
                        onPress={() => handleMoveInReorderList(idx, 'up')}
                        style={{
                          backgroundColor: idx === 0 ? '#E2E8F0' : '#0284C7',
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>▲</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={idx === reorderList.length - 1}
                        onPress={() => handleMoveInReorderList(idx, 'down')}
                        style={{
                          backgroundColor: idx === reorderList.length - 1 ? '#E2E8F0' : '#0284C7',
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>▼</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              {/* Super Admin PIN Verification Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#FEF2F2',
                  borderWidth: 2,
                  borderColor: '#FECACA',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 26 }}>👑</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                {isBn ? 'সুপার এডমিন ভেরিফিকেশন' : 'Super Admin Verification'}
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                {isBn
                  ? 'ফ্লাইট কেয়ার ফ্যামিলি থেকে কর্মকর্তা বা সদস্য মুছে ফেলার জন্য সুপার এডমিন পিন কোড প্রদান করুন।'
                  : 'Enter Super Admin PIN code to authorize member deletion & management.'}
              </Text>
            </View>

            <TextInput
              value={pinInput}
              onChangeText={(text) => {
                setPinInput(text);
                if (pinError) setPinError('');
              }}
              placeholder={isBn ? '৬-ডিজিট সুপার এডমিন পিন (যেমন: 570000)' : '6-digit Admin PIN'}
              placeholderTextColor="#94A3B8"
              secureTextEntry
              keyboardType="numeric"
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1.5,
                borderColor: pinError ? '#DC2626' : '#CBD5E1',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                fontWeight: '800',
                letterSpacing: 2,
                color: '#0F172A',
                textAlign: 'center',
                marginBottom: 10,
              }}
            />

            {!!pinError && (
              <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 10 }}>
                {pinError}
              </Text>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowPinModal(false);
                  setPinInput('');
                  setPinError('');
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#F1F5F9',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#475569', fontSize: 14, fontWeight: '800' }}>
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleVerifySuperAdminPin}
                style={{
                  flex: 1.4,
                  backgroundColor: '#0F2A4A',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>
                  {isBn ? 'আনলক করুন' : 'Unlock Access'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>

            {/* Modal Footer */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 12,
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <TouchableOpacity
                onPress={() => setShowReorderModal(false)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: '#E2E8F0',
                }}
              >
                <Text style={{ color: '#475569', fontWeight: '700', fontSize: 13 }}>
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={reorderSaving}
                onPress={handleSaveReorder}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: '#10B981',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {reorderSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>✓</Text>
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                      {isBn ? 'নতুন সিরিয়াল সংরক্ষণ করুন' : 'Save Serial Order'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
