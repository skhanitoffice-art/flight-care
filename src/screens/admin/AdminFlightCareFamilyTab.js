// src/screens/admin/AdminFlightCareFamilyTab.js
// Flight Care Enterprise - Flight Care Family Official Roster & Directory Management

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
} from 'react-native';
import {
  getFlightCareFamilyMembers,
  addFlightCareFamilyMember,
  updateFlightCareFamilyMember,
  deleteFlightCareFamilyMember,
  bulkDeleteFlightCareFamilyMembers,
  moveFlightCareFamilyMember,
  reorderFlightCareFamilyMembers,
  updateFlightCareFamilyMemberPhoto,
  generateFamilyMemberQrData,
  listenToFlightCareFamily,
} from '../../services/flightCareFamilyService';
import { compressImage } from '../../utils/imageCompressor';
import FamilyMemberIdCardModal from '../../components/FamilyMemberIdCardModal';
import { downloadOfficerQrCode } from '../../utils/qrDownloadHelper';

export default function AdminFlightCareFamilyTab({
  managerSession,
  lang = 0,
  s = {},
  staffRoster,
  setStaffRoster,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  // Modals
  const [selectedCardMember, setSelectedCardMember] = useState(null);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Super Admin Bulk Delete & Multi-Select State
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Super Admin Single Member Deletion State
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  // Serial Customization Modal State
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderList, setReorderList] = useState([]);
  const [reorderSaving, setReorderSaving] = useState(false);

  // Form State
  const [formRank, setFormRank] = useState('Protocol Officer');
  const [formRankBn, setFormRankBn] = useState('প্রোটোকল অফিসার');
  const [formName, setFormName] = useState('');
  const [formNameBn, setFormNameBn] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDepartment, setFormDepartment] = useState('VIP Protocol Operations');
  const [formStation, setFormStation] = useState('Hazrat Shahjalal International Airport, Dhaka');
  const [formShift, setFormShift] = useState('08:00 AM - 04:00 PM');
  const [formBloodGroup, setFormBloodGroup] = useState('A+');
  const [formBadgeNo, setFormBadgeNo] = useState('');
  const [formLicenseNo, setFormLicenseNo] = useState('');
  const [formRmk, setFormRmk] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // RBAC Permission Check
  // Super Admin: edit, add, update, delete, reorder, photo upload
  // Manager: read-only view, view ID card & QR code
  const userRole = managerSession?.user?.role || 'admin';
  const isSuperAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin' || !managerSession || managerSession?.role === 'admin';

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
    let active = true;
    loadData();

    // Subscribe to real-time changes from Firestore cloud collection
    const unsub = listenToFlightCareFamily(
      cloudMembers => {
        if (active && Array.isArray(cloudMembers) && cloudMembers.length > 0) {
          setMembers(cloudMembers);
        }
      },
      err => console.warn('[AdminFamilyTab] Firestore subscription notice:', err?.message)
    );

    return () => {
      active = false;
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4500);
  };

  // Direct QR Code Download for a single member
  const handleDirectDownloadQr = async (member, mode = 'qr_only') => {
    setDownloadingId(member.id);
    const qrData = generateFamilyMemberQrData(member.badgeNo || member.id);
    try {
      const res = await downloadOfficerQrCode({
        member,
        verificationUrl: qrData.verificationUrl,
        qrImageUrl: qrData.qrImageUrl,
        mode,
        lang,
      });
      if (res?.success) {
        showToast(
          lang
            ? `✓ ${member.nameBn || member.name}-এর কিউআর কোড ডাউনলোড হয়েছে!`
            : `✓ QR Code downloaded for ${member.name}!`
        );
      }
    } catch {
      showToast(lang ? 'কিউআর ডাউনলোড ব্যর্থ হয়েছে।' : 'QR download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Batch QR Code Download for all roster members
  const handleDownloadAllQrCodes = async () => {
    if (!members || members.length === 0) return;
    showToast(
      lang
        ? 'সকল কর্মকর্তার কিউআর কোড ডাউনলোড শুরু হচ্ছে...'
        : 'Starting download of all officer QR codes...'
    );
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const qrData = generateFamilyMemberQrData(m.badgeNo || m.id);
      await downloadOfficerQrCode({
        member: m,
        verificationUrl: qrData.verificationUrl,
        qrImageUrl: qrData.qrImageUrl,
        mode: 'qr_only',
        lang,
      });
      await new Promise(r => setTimeout(r, 250));
    }
    showToast(
      lang
        ? '✓ সকল কর্মকর্তার কিউআর কোড সফলভাবে ডাউনলোড হয়েছে!'
        : '✓ All officer QR codes downloaded successfully!'
    );
  };

  // Helper for picking/uploading an image across Web / Browser with auto-compression
  const handlePickImage = (callback) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          showToast(lang ? 'ছবি অপ্টিমাইজ ও কম্প্রেস হচ্ছে...' : 'Optimizing and compressing photo...');
          try {
            const compressed = await compressImage(file, { maxWidth: 480, maxHeight: 480, quality: 0.82 });
            if (compressed) {
              callback(compressed);
            }
          } catch (err) {
            console.error('Image compression error:', err);
            Alert.alert(lang ? 'ছবি প্রসেসিং ত্রুটি' : 'Image Error', err.message);
          }
        }
      };
      input.click();
    } else {
      if (typeof window !== 'undefined' && window.prompt) {
        const url = window.prompt(lang ? 'অনলাইন ছবির URL বা লিংক দিন:' : 'Enter online photo URL:');
        if (url && url.trim()) callback(url.trim());
      }
    }
  };

  // Quick photo upload directly from member card
  const handleQuickUploadPhoto = (member) => {
    if (!isSuperAdmin) {
      Alert.alert(
        lang ? 'অনুমতি নেই' : 'Restricted',
        lang ? 'ছবি আপলোড করার ক্ষমতা শুধু সুপার অ্যাডমিনের হাতে সংরক্ষিত।' : 'Only Super Administrator has permission to upload photos.'
      );
      return;
    }
    handlePickImage(async (base64) => {
      const res = await updateFlightCareFamilyMemberPhoto(member.id, base64, userRole);
      if (res.ok) {
        setMembers(res.members);
        showToast(lang ? `✓ ${member.name}-এর ছবি সফলভাবে আপডেট হয়েছে!` : `✓ Photo updated for ${member.name}!`);
      } else {
        Alert.alert(lang ? 'ব্যর্থ হয়েছে' : 'Failed', res.error || 'Failed to update photo');
      }
    });
  };

  // Move member Up or Down directly from card
  const handleMoveMember = async (id, direction) => {
    if (!isSuperAdmin) return;
    const res = await moveFlightCareFamilyMember(id, direction, userRole);
    if (res.ok) {
      setMembers(res.members);
      showToast(direction === 'up' ? (lang ? '▲ ওপরে নেওয়া হয়েছে' : '▲ Moved up') : (lang ? '▼ নিচে নেওয়া হয়েছে' : '▼ Moved down'));
    } else {
      showToast(res.error || 'Cannot move');
    }
  };

  // Open Reorder Modal
  const handleOpenReorderModal = () => {
    if (!isSuperAdmin) {
      Alert.alert(
        lang ? 'অনুমতি নেই' : 'Restricted',
        lang ? 'সিরিয়াল কাস্টমাইজ করার ক্ষমতা শুধু সুপার অ্যাডমিনের হাতে সংরক্ষিত।' : 'Only Super Administrator has permission to customize serials.'
      );
      return;
    }
    setReorderList([...members].sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999)));
    setShowReorderModal(true);
  };

  // Move member within reorder modal list
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

  // Change serial manually in reorder modal
  const handleChangeSerialInReorderList = (index, val) => {
    const num = parseInt(val, 10);
    const next = [...reorderList];
    next[index] = { ...next[index], serial: isNaN(num) ? val : num };
    setReorderList(next);
  };

  // Save new serial ordering
  const handleSaveReorder = async () => {
    setReorderSaving(true);
    // Sort reorderList by the typed serial numbers
    const sorted = [...reorderList].sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
    const res = await reorderFlightCareFamilyMembers(sorted, userRole);
    if (res.ok) {
      setMembers(res.members);
      setShowReorderModal(false);
      showToast(lang ? '✓ নতুন সিরিয়াল ক্রম সফলভাবে সংরক্ষিত হয়েছে!' : '✓ Serial order saved successfully!');
    } else {
      Alert.alert(lang ? 'ব্যর্থ হয়েছে' : 'Failed', res.error || 'Failed to save serial order');
    }
    setReorderSaving(false);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    if (!isSuperAdmin) {
      Alert.alert(
        lang ? 'অনুমতি নেই' : 'Restricted',
        lang ? 'সদস্য যোগ করার ক্ষমতা শুধু সুপার অ্যাডমিনের হাতে সংরক্ষিত।' : 'Only Super Administrator has permission to add family members.'
      );
      return;
    }
    setEditingMember(null);
    setFormRank('Protocol Officer');
    setFormRankBn('প্রোটোকল অফিসার');
    setFormName('');
    setFormNameBn('');
    setFormEmail('');
    setFormPhone('');
    setFormDepartment('VIP Protocol Operations');
    setFormStation('Hazrat Shahjalal International Airport, Dhaka');
    setFormShift('08:00 AM - 04:00 PM');
    setFormBloodGroup('A+');
    setFormBadgeNo(`FC-PO-${String(members.length + 1).padStart(3, '0')}`);
    setFormLicenseNo(`CAAB-SEC-DAC-${8940 + members.length}`);
    setFormRmk('');
    setFormPhoto('');
    setFormSerial(String(members.length + 1));
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (member) => {
    if (!isSuperAdmin) {
      Alert.alert(
        lang ? 'অনুমতি নেই' : 'Restricted',
        lang ? 'সদস্য সম্পাদনা করার ক্ষমতা শুধু সুপার অ্যাডমিনের হাতে সংরক্ষিত।' : 'Only Super Administrator has permission to edit family members.'
      );
      return;
    }
    setEditingMember(member);
    setFormRank(member.rank || '');
    setFormRankBn(member.rankBn || '');
    setFormName(member.name || '');
    setFormNameBn(member.nameBn || '');
    setFormEmail(member.email || '');
    setFormPhone(member.phoneDisplay || member.phone || '');
    setFormDepartment(member.department || 'VIP Protocol Operations');
    setFormStation(member.station || '');
    setFormShift(member.shift || '');
    setFormBloodGroup(member.bloodGroup || 'A+');
    setFormBadgeNo(member.badgeNo || '');
    setFormLicenseNo(member.licenseNo || '');
    setFormRmk(member.rmk || '');
    setFormPhoto(member.photo || (typeof member.avatar === 'string' && (member.avatar.startsWith('http') || member.avatar.startsWith('data:image')) ? member.avatar : ''));
    setFormSerial(String(member.serial || ''));
    setShowFormModal(true);
  };

  // Handle Save (Add or Update)
  const handleSaveForm = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      Alert.alert(
        lang ? 'অসম্পূর্ণ তথ্য' : 'Incomplete Form',
        lang ? 'কর্মকর্তার নাম এবং মোবাইল নম্বর আবশ্যক।' : 'Name and mobile number are required.'
      );
      return;
    }

    setFormSaving(true);
    const parsedSerial = parseInt(formSerial, 10);
    const payload = {
      rank: formRank.trim(),
      rankBn: formRankBn.trim() || formRank.trim(),
      name: formName.trim(),
      nameBn: formNameBn.trim() || formName.trim(),
      email: formEmail.trim() || 'NA',
      phone: formPhone.trim(),
      phoneDisplay: formPhone.trim(),
      department: formDepartment,
      station: formStation.trim(),
      shift: formShift.trim(),
      bloodGroup: formBloodGroup.trim(),
      badgeNo: formBadgeNo.trim(),
      licenseNo: formLicenseNo.trim(),
      rmk: formRmk.trim(),
      photo: formPhoto || null,
      avatar: formPhoto || undefined,
      ...(isNaN(parsedSerial) ? {} : { serial: parsedSerial }),
    };

    if (editingMember) {
      const res = await updateFlightCareFamilyMember(editingMember.id, payload, userRole);
      if (res.ok) {
        setMembers(res.members);
        setShowFormModal(false);
        showToast(lang ? '✓ সদস্য তথ্য সফলভাবে আপডেট হয়েছে!' : '✓ Member profile updated successfully!');
      } else {
        Alert.alert(lang ? 'ব্যর্থ হয়েছে' : 'Failed', res.error || 'Update failed');
      }
    } else {
      const res = await addFlightCareFamilyMember(payload, userRole);
      if (res.ok) {
        setMembers(res.members);
        setShowFormModal(false);
        showToast(lang ? '✓ নতুন সদস্য সফলভাবে যুক্ত হয়েছে!' : '✓ New family member added successfully!');
      } else {
        Alert.alert(lang ? 'ব্যর্থ হয়েছে' : 'Failed', res.error || 'Add failed');
      }
    }
    setFormSaving(false);
  };

  // Super Admin Bulk Selection Handlers
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

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await bulkDeleteFlightCareFamilyMembers(ids, userRole);
      if (res.ok) {
        setMembers(res.members);
        // Also immediately synchronize Protocol Officers / Staff Roster
        if (typeof setStaffRoster === 'function') {
          const idSet = new Set(ids.map(id => String(id).toUpperCase().trim()));
          setStaffRoster(curr => (curr || []).filter(s => {
            const sid = (s.id || '').toUpperCase().trim();
            const sbadge = (s.badgeNo || '').toUpperCase().trim();
            return !idSet.has(sid) && !idSet.has(sbadge);
          }));
        }
        const count = res.deletedCount || ids.length;
        setSelectedIds(new Set());
        setSelectMode(false);
        setShowBulkDeleteModal(false);
        showToast(
          lang
            ? `✓ সফলভাবে ${count} জন সদস্যকে ফ্যামিলি থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে!`
            : `✓ Successfully removed ${count} members!`
        );
      } else {
        showToast(res.error || (lang ? 'ব্যর্থ হয়েছে' : 'Failed to delete'));
      }
    } catch (err) {
      showToast(err.message || 'Error deleting members');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Handle Delete
  const handleDeleteMember = (member) => {
    if (!isSuperAdmin) {
      showToast(
        lang ? 'সদস্য মুছে ফেলার ক্ষমতা শুধু সুপার অ্যাডমিনের হাতে সংরক্ষিত।' : 'Only Super Administrator can delete members.'
      );
      return;
    }
    setMemberToDelete(member);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeletingMember(true);
    try {
      const res = await deleteFlightCareFamilyMember(memberToDelete.id, userRole);
      if (res.ok) {
        setMembers(res.members);
        // Also immediately remove from Protocol Officers / Staff Roster
        if (typeof setStaffRoster === 'function') {
          const delUpper = String(memberToDelete.id || '').toUpperCase().trim();
          const delBadge = String(memberToDelete.badgeNo || '').toUpperCase().trim();
          setStaffRoster(curr => (curr || []).filter(s => {
            const sid = (s.id || '').toUpperCase().trim();
            const sbadge = (s.badgeNo || '').toUpperCase().trim();
            return sid !== delUpper && sbadge !== delBadge && sid !== delBadge && sbadge !== delUpper;
          }));
        }
        showToast(
          lang
            ? `✓ "${memberToDelete.name}" (${memberToDelete.rank})-কে ফ্যামিলি থেকে মুছে ফেলা হয়েছে!`
            : `✓ "${memberToDelete.name}" deleted successfully!`
        );
        setMemberToDelete(null);
      } else {
        showToast(res.error || (lang ? 'মুছে ফেলতে ব্যর্থ হয়েছে' : 'Failed to delete'));
      }
    } catch (err) {
      showToast(err.message || 'Error deleting member');
    } finally {
      setIsDeletingMember(false);
    }
  };

  // Open Scannable QR ID Card Modal
  const handleOpenIdCard = (member) => {
    setSelectedCardMember(member);
    setShowIdCardModal(true);
  };

  // Comprehensive department matching helper
  const matchesDepartment = (m, deptKey) => {
    if (!deptKey || deptKey === 'all') return true;
    const d = (m.department || '').toLowerCase();
    const r = (m.rank || '').toLowerCase();
    const role = (m.role || '').toLowerCase();
    const cat = (m.departmentCategory || '').toLowerCase();

    if (deptKey === 'VIP Protocol Operations' || deptKey === 'protocol') {
      return cat === 'protocol' || d.includes('protocol') || r.includes('protocol') || role.includes('protocol') || d === 'airport protocol';
    }
    if (deptKey === 'Top Management' || deptKey === 'management') {
      return cat === 'management' || d.includes('management') || d.includes('leadership') || d.includes('human') || d.includes('technology') || d.includes('operations') || r.includes('ceo') || r.includes('hr') || r.includes('it') || r.includes('lead');
    }
    if (deptKey === 'Terminal Shift Command' || deptKey === 'shift') {
      return cat === 'shift' || d.includes('shift') || r.includes('shift') || role.includes('shift');
    }
    if (deptKey === 'Front Desk & Reception' || deptKey === 'front_desk') {
      return cat === 'front_desk' || d.includes('front desk') || r.includes('front desk') || role.includes('front desk');
    }
    return m.department === deptKey;
  };

  // Department Filters & Counts
  const departments = useMemo(() => {
    const list = [
      { key: 'all', label: lang ? 'সকল সদস্য' : 'All Members' },
      { key: 'VIP Protocol Operations', label: lang ? 'প্রোটোকল অফিসারবৃন্দ' : 'Protocol Officers' },
      { key: 'Top Management', label: lang ? 'শীর্ষ ব্যবস্থাপনা' : 'Top Management' },
      { key: 'Terminal Shift Command', label: lang ? 'শিফট কমান্ড' : 'Shift Command' },
      { key: 'Front Desk & Reception', label: lang ? 'ফ্রন্ট ডেস্ক' : 'Front Desk' },
    ];
    return list;
  }, [lang]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (departmentFilter !== 'all' && !matchesDepartment(m, departmentFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const qClean = q.replace(/[\s-]/g, '');
        const matchName = (m.name || '').toLowerCase().includes(q) || (m.nameBn || '').includes(q);
        const matchRank = (m.rank || '').toLowerCase().includes(q) || (m.rankBn || '').includes(q);
        const matchPhone = (m.phone || '').replace(/[\s-]/g, '').includes(qClean) ||
                           (m.phoneDisplay || '').replace(/[\s-]/g, '').includes(qClean) ||
                           (m.personalPhone || '').replace(/[\s-]/g, '').includes(qClean);
        const matchEmail = (m.email || '').toLowerCase().includes(q) || (m.gmail || '').toLowerCase().includes(q);
        const matchBadge = (m.badgeNo || '').toLowerCase().includes(q);
        const matchStation = (m.station || '').toLowerCase().includes(q) || (m.stationBn || '').includes(q);
        const matchSerial = String(m.serial || '').includes(q);
        if (!matchName && !matchRank && !matchPhone && !matchEmail && !matchBadge && !matchStation && !matchSerial) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
  }, [members, departmentFilter, searchQuery]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Banner Header */}
      <View
        style={{
          backgroundColor: '#0A192F',
          paddingVertical: 20,
          paddingHorizontal: 22,
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B',
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
          {/* Title & Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#1E3A8A',
                borderWidth: 2,
                borderColor: '#38BDF8',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 26 }}>👨‍👩‍👧‍👦</Text>
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#F8FAFC' }}>
                  Flight Care Family
                </Text>
                <View
                  style={{
                    backgroundColor: '#1E3A8A',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#38BDF8',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#BAE6FD' }}>
                    {members.length} {lang ? 'জন সদস্য' : 'Members'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 2 }}>
                {lang
                  ? 'সংযুক্ত ডকুমেন্ট অনুযায়ী সকল কর্মকর্তা ও প্রোটোকল অফিসারবৃন্দের অফিসিয়াল পরিচয়পত্র ও কিউআর সিস্টেম'
                  : 'Official Directory, Credentials & Scannable QR ID Passes of all Officers and Executives'}
              </Text>
            </View>
          </View>

          {/* Super Admin Top Buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {isSuperAdmin && (
              <TouchableOpacity
                onPress={handleOpenReorderModal}
                style={{
                  backgroundColor: '#0F2A4A',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                  borderWidth: 1.5,
                  borderColor: '#38BDF8',
                  shadowColor: '#38BDF8',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 14 }}>🔢</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? 'সিরিয়াল কাস্টমাইজ' : 'Customize Serials'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Batch Download All QR Codes Button */}
            <TouchableOpacity
              onPress={handleDownloadAllQrCodes}
              style={{
                backgroundColor: '#065F46',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                borderWidth: 1.5,
                borderColor: '#10B981',
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
              }}
            >
              <Text style={{ fontSize: 14 }}>📥</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                {lang ? 'সকল কিউআর ডাউনলোড' : 'Download All QRs'}
              </Text>
            </TouchableOpacity>

            {isSuperAdmin && (
              <TouchableOpacity
                onPress={handleOpenAdd}
                style={{
                  backgroundColor: '#0284C7',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  shadowColor: '#0284C7',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '900' }}>＋</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? 'নতুন সদস্য যোগ করুন' : 'Add New Member'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Role Notice Pill */}
        <View style={{ marginTop: 14 }}>
          {isSuperAdmin ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(16, 185, 129, 0.3)',
              }}
            >
              <Text style={{ fontSize: 13 }}>👑</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#34D399' }}>
                {lang
                  ? 'সুপার অ্যাডমিন মোড: আপনার কাছে সকল সদস্যের তথ্য এডিট, অ্যাড এবং পরিবর্তনের পূর্ণ ক্ষমতা রয়েছে।'
                  : 'Super Admin Mode: Full authorization to add, edit, and update family roster.'}
              </Text>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(56, 189, 248, 0.3)',
              }}
            >
              <Text style={{ fontSize: 13 }}>👁️</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#38BDF8' }}>
                {lang
                  ? 'ম্যানেজার ভিউ-অনলি মোড: আপনি সকল কর্মকর্তার তালিকা, প্রোফাইল ও কিউআর আইডি কার্ড দেখতে ও প্রিন্ট করতে পারবেন। এডিট করার ক্ষমতা শুধুমাত্র সুপার অ্যাডমিনের হাতে।'
                  : 'Manager View-Only Mode: You can view profiles & print scannable QR passes. Editing is restricted to Super Admin.'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Toast Notice */}
      {notice ? (
        <View
          style={{
            backgroundColor: '#ECFDF5',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#A7F3D0',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#065F46', textAlign: 'center' }}>
            {notice}
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 18 }}>
        {/* Search & Department Filters */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 16,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
          }}
        >
          {/* Search Input */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#CBD5E1',
              paddingHorizontal: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                lang
                  ? 'নাম, পদবী, মোবাইল, ইমেইল বা ব্যাজ আইডি দিয়ে খুঁজুন...'
                  : 'Search by name, rank, phone, email or badge ID...'
              }
              style={{
                flex: 1,
                paddingVertical: 9,
                fontSize: 13,
                color: '#0F172A',
              }}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Department Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {departments.map((dept) => {
                const isSelected = departmentFilter === dept.key;
                const count =
                  dept.key === 'all'
                    ? members.length
                    : members.filter((m) => matchesDepartment(m, dept.key)).length;

                return (
                  <TouchableOpacity
                    key={dept.key}
                    onPress={() => setDepartmentFilter(dept.key)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: isSelected ? '#0F2A4A' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: isSelected ? '#0F2A4A' : '#E2E8F0',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? '800' : '700',
                        color: isSelected ? '#FFFFFF' : '#475569',
                      }}
                    >
                      {dept.label}
                    </Text>
                    <View
                      style={{
                        backgroundColor: isSelected ? '#38BDF8' : '#CBD5E1',
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '900',
                          color: isSelected ? '#0F172A' : '#334155',
                        }}
                      >
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 12, fontWeight: '700' }}>
              {lang ? 'ফ্লাইট কেয়ার ফ্যামিলি ডাটা লোড হচ্ছে...' : 'Loading Flight Care Family roster...'}
            </Text>
          </View>
        ) : filteredMembers.length === 0 ? (
          <View
            style={{
              paddingVertical: 50,
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            <Text style={{ fontSize: 36 }}>🔍</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 10 }}>
              {lang ? 'কোনো কর্মকর্তা বা সদস্য পাওয়া যায়নি' : 'No members found'}
            </Text>
            <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
              {lang ? 'অনুসন্ধানের কীওয়ার্ড পরিবর্তন করে আবার চেষ্টা করুন।' : 'Try adjusting your search query or filters.'}
            </Text>
          </View>
        ) : (
          <View>
            {/* Super Admin Bulk Selection & Delete Action Bar */}
            {isSuperAdmin && (
              <View
                style={{
                  backgroundColor: selectMode ? '#EFF6FF' : '#F8FAFC',
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 14,
                  borderWidth: 1.5,
                  borderColor: selectMode ? '#0284C7' : '#E2E8F0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectMode(!selectMode);
                      if (selectMode) setSelectedIds(new Set());
                    }}
                    style={{
                      backgroundColor: selectMode ? '#0284C7' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: selectMode ? '#0284C7' : '#CBD5E1',
                      paddingHorizontal: 13,
                      paddingVertical: 8,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>{selectMode ? '☑️' : '◻️'}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: selectMode ? '#FFFFFF' : '#0F172A' }}>
                      {selectMode
                        ? (lang ? 'সিলেকশন মোড চালু' : 'Multi-Select Active')
                        : (lang ? '☑️ একাধিক সিলেক্ট করুন (Bulk Delete)' : '☑️ Multi-Select (Bulk Delete)')}
                    </Text>
                  </TouchableOpacity>

                  {selectMode && (
                    <TouchableOpacity
                      onPress={handleSelectAll}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        paddingHorizontal: 11,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#475569' }}>
                        {selectedIds.size === filteredMembers.length
                          ? (lang ? 'সিলেকশন মুছুন' : 'Deselect All')
                          : (lang ? `সবগুলো (${filteredMembers.length} জন)` : `Select All (${filteredMembers.length})`)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {selectMode && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        backgroundColor: selectedIds.size > 0 ? '#DC2626' : '#94A3B8',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '900' }}>
                        {selectedIds.size} {lang ? 'জন নির্বাচিত' : 'Selected'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={handleBulkDelete}
                      disabled={selectedIds.size === 0 || bulkDeleting}
                      style={{
                        backgroundColor: selectedIds.size > 0 ? '#DC2626' : '#CBD5E1',
                        paddingHorizontal: 15,
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
                      <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '900' }}>
                        {bulkDeleting
                          ? (lang ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...')
                          : (lang ? `নির্বাচিত ${selectedIds.size} জনকে ডিলিট করুন` : `Delete ${selectedIds.size} Members`)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Members Cards Grid */}
            <View style={{ gap: 14 }}>
            {filteredMembers.map((member) => {
              const memberName = lang ? (member.nameBn || member.name) : member.name;
              const memberRank = lang ? (member.rankBn || member.rank) : member.rank;
              const departmentName = lang ? (member.departmentBn || member.department) : member.department;
              const isSelected = selectedIds.has(member.id);

              return (
                <TouchableOpacity
                  activeOpacity={selectMode ? 0.75 : 1}
                  onPress={selectMode ? () => toggleSelectMember(member.id) : undefined}
                  key={member.id}
                  style={{
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? '#0284C7' : '#E2E8F0',
                    shadowColor: isSelected ? '#0284C7' : '#0F172A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.12 : 0.04,
                    shadowRadius: 8,
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
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: isSelected ? '#0284C7' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#0284C7' : '#94A3B8',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>
                        {isSelected ? '✓' : ''}
                      </Text>
                    </View>
                  )}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Left: Avatar & Identity Details */}
                    <View style={{ flexDirection: 'row', gap: 14, flex: 1, minWidth: 260 }}>
                      <View
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: 29,
                          backgroundColor: '#E0F2FE',
                          borderWidth: 2,
                          borderColor: '#0284C7',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {(member.photo || (typeof member.avatar === 'string' && (member.avatar.startsWith('http') || member.avatar.startsWith('data:image')))) ? (
                          <Image
                            source={{ uri: member.photo || member.avatar }}
                            style={{ width: '100%', height: '100%', borderRadius: 29 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={{ fontSize: 28 }}>
                            {member.avatar || (member.rank.includes('CEO') ? '👔' : member.rank.includes('Manager') ? '💼' : member.rank.includes('HR') ? '🎖️' : '🧑‍✈️')}
                          </Text>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View
                              style={{
                                backgroundColor: '#0F2A4A',
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{ fontSize: 10.5, fontWeight: '900', color: '#FCD34D' }}>
                                #{member.serial}
                              </Text>
                            </View>
                            {isSuperAdmin && (
                              <View style={{ flexDirection: 'row', gap: 2 }}>
                                <TouchableOpacity
                                  onPress={() => handleMoveMember(member.id, 'up')}
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    backgroundColor: '#E2E8F0',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Move Up"
                                >
                                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#0F172A' }}>▲</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleMoveMember(member.id, 'down')}
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    backgroundColor: '#E2E8F0',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Move Down"
                                >
                                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#0F172A' }}>▼</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                            {memberName}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7', marginTop: 2 }}>
                          {memberRank}
                        </Text>

                        <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                          🏢 {departmentName}
                        </Text>

                        {/* Badges / License */}
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#334155' }}>
                              ID: {member.badgeNo || 'N/A'}
                            </Text>
                          </View>
                          {member.bloodGroup && (
                            <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#DC2626' }}>
                                Blood: {member.bloodGroup}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Right: Contact & Action Buttons */}
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      {/* Mobile & Gmail */}
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                          📞 {member.phoneDisplay || member.phone}
                        </Text>
                        {!!member.personalPhone && member.personalPhone !== (member.phoneDisplay || member.phone) && (
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                            📱 {member.personalPhone}
                          </Text>
                        )}
                        {member.email && member.email !== 'NA' && (
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0284C7' }}>
                            ✉️ {member.email}
                          </Text>
                        )}
                        {!!member.gmail && (
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>
                            📧 {member.gmail}
                          </Text>
                        )}
                      </View>

                      {/* Action Buttons Row */}
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {/* ID Card & QR Code Button (Accessible to both Super Admin and Manager) */}
                        <TouchableOpacity
                          onPress={() => handleOpenIdCard(member)}
                          style={{
                            backgroundColor: '#0F2A4A',
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <Text style={{ fontSize: 13 }}>🪪</Text>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                            {lang ? 'আইডি ও কিউআর' : 'ID & QR Pass'}
                          </Text>
                        </TouchableOpacity>

                        {/* Direct QR Code Download Button */}
                        <TouchableOpacity
                          onPress={() => handleDirectDownloadQr(member, 'qr_only')}
                          disabled={downloadingId === member.id}
                          style={{
                            backgroundColor: '#0284C7',
                            paddingHorizontal: 11,
                            paddingVertical: 7,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontSize: 12 }}>📥</Text>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                            {downloadingId === member.id ? '…' : (lang ? 'কিউআর ডাউনলোড' : 'QR Download')}
                          </Text>
                        </TouchableOpacity>

                        {/* Super Admin Quick Photo Upload Action */}
                        {isSuperAdmin && (
                          <TouchableOpacity
                            onPress={() => handleQuickUploadPhoto(member)}
                            style={{
                              backgroundColor: '#F8FAFC',
                              paddingHorizontal: 9,
                              paddingVertical: 7,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#CBD5E1',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Text style={{ fontSize: 12 }}>📷</Text>
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#334155' }}>
                              {lang ? 'ছবি' : 'Photo'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* Super Admin Edit Action */}
                        {isSuperAdmin && (
                          <TouchableOpacity
                            onPress={() => handleOpenEdit(member)}
                            style={{
                              backgroundColor: '#E0F2FE',
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#BAE6FD',
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0284C7' }}>
                              ✏️ {lang ? 'এডিট' : 'Edit'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* Super Admin Delete Action */}
                        {isSuperAdmin && (
                          <TouchableOpacity
                            onPress={() => handleDeleteMember(member)}
                            style={{
                              backgroundColor: '#FEF2F2',
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#FECACA',
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#DC2626' }}>
                              🗑️
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          </View>
        )}
      </ScrollView>

      {/* Official ID Card & Scannable QR Code Modal */}
      {selectedCardMember && (
        <FamilyMemberIdCardModal
          visible={showIdCardModal}
          onClose={() => {
            setShowIdCardModal(false);
            setSelectedCardMember(null);
          }}
          member={selectedCardMember}
          lang={lang}
        />
      )}

      {/* Super Admin Add / Edit Form Modal */}
      {showFormModal && (
        <Modal
          visible={showFormModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFormModal(false)}
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
                maxWidth: 540,
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                overflow: 'hidden',
                maxHeight: '90%',
              }}
            >
              {/* Form Header */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  backgroundColor: '#0A192F',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF' }}>
                  {editingMember
                    ? (lang ? '✏️ সদস্য তথ্য সম্পাদনা (সুপার এডমিন)' : '✏️ Edit Member (Super Admin)')
                    : (lang ? '＋ নতুন সদস্য যোগ করুন (সুপার এডমিন)' : '＋ Add New Member (Super Admin)')}
                </Text>
                <TouchableOpacity onPress={() => setShowFormModal(false)}>
                  <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
                {/* Photo & Serial Header Row */}
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 16,
                    alignItems: 'center',
                    backgroundColor: '#F1F5F9',
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                  }}
                >
                  {/* Photo Preview Circle */}
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: '#E0F2FE',
                      borderWidth: 2,
                      borderColor: '#0284C7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {formPhoto ? (
                      <Image
                        source={{ uri: formPhoto }}
                        style={{ width: '100%', height: '100%', borderRadius: 32 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 28 }}>🧑‍✈️</Text>
                    )}
                  </View>

                  {/* Photo Controls */}
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                      {lang ? 'প্রোফাইল ছবি (Profile Photo):' : 'Profile Photo:'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <TouchableOpacity
                        onPress={() => handlePickImage((base64) => setFormPhoto(base64))}
                        style={{
                          backgroundColor: '#0284C7',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Text style={{ fontSize: 12 }}>📁</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                          {lang ? 'ফাইল আপলোড' : 'Upload File'}
                        </Text>
                      </TouchableOpacity>

                      {formPhoto ? (
                        <TouchableOpacity
                          onPress={() => setFormPhoto('')}
                          style={{
                            backgroundColor: '#FEE2E2',
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#FECACA',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>
                            {lang ? 'রিমুভ' : 'Remove'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <TextInput
                      value={formPhoto}
                      onChangeText={setFormPhoto}
                      placeholder={lang ? 'বা ছবির সরাসরি URL পেস্ট করুন...' : 'Or paste direct image URL...'}
                      style={{
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        fontSize: 11,
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </View>
                </View>

                {/* Serial Number & Rank Row */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 90 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'ক্রমিক (Serial):' : 'Serial #:'}
                    </Text>
                    <TextInput
                      value={formSerial}
                      onChangeText={setFormSerial}
                      keyboardType="number-pad"
                      placeholder="1"
                      style={{
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 13,
                        fontWeight: '800',
                        textAlign: 'center',
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'পদবী (Rank / Designation):' : 'Rank / Designation:'}
                    </Text>
                    <TextInput
                      value={formRank}
                      onChangeText={(val) => {
                        setFormRank(val);
                        if (!formRankBn || formRankBn === formRank) setFormRankBn(val);
                      }}
                      placeholder="e.g. Protocol Officer, Shift In-Charge, HR Head"
                      style={{
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 13,
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                  </View>
                </View>

                {/* Name */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'নাম (ইংরেজি):' : 'Full Name (English):'}
                  </Text>
                  <TextInput
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="e.g. Md Anamul Haq"
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 13,
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                </View>

                {/* Name Bengali */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'নাম (বাংলা):' : 'Full Name (Bengali):'}
                  </Text>
                  <TextInput
                    value={formNameBn}
                    onChangeText={setFormNameBn}
                    placeholder="e.g. মোঃ এনামুল হক"
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 13,
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                </View>

                {/* Mobile */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'মোবাইল নম্বর:' : 'Mobile Number:'}
                  </Text>
                  <TextInput
                    value={formPhone}
                    onChangeText={setFormPhone}
                    placeholder="01685-358448"
                    keyboardType="phone-pad"
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 13,
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                </View>

                {/* Gmail / Email */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'ইমেইল / Gmail:' : 'Gmail / Email:'}
                  </Text>
                  <TextInput
                    value={formEmail}
                    onChangeText={setFormEmail}
                    placeholder="officer@gmail.com (বা NA)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 13,
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                </View>

                {/* Department Selection */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'ডিপার্টমেন্ট / বিভাগ:' : 'Department:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      'Top Management',
                      'Operations Management',
                      'Human Resources',
                      'Front Desk & Reception',
                      'Terminal Shift Command',
                      'VIP Protocol Operations',
                    ].map((d) => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setFormDepartment(d)}
                        style={{
                          backgroundColor: formDepartment === d ? '#0F2A4A' : '#F1F5F9',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: formDepartment === d ? '#0F2A4A' : '#CBD5E1',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: formDepartment === d ? '#FFFFFF' : '#334155',
                          }}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Badge & License Row */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'অফিসিয়াল ব্যাজ নং:' : 'Official Badge No:'}
                    </Text>
                    <TextInput
                      value={formBadgeNo}
                      onChangeText={setFormBadgeNo}
                      placeholder="FC-PO-001"
                      style={{
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 13,
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'লাইসেন্স / পাস নং:' : 'CAAB License / Pass:'}
                    </Text>
                    <TextInput
                      value={formLicenseNo}
                      onChangeText={setFormLicenseNo}
                      placeholder="CAAB-SEC-DAC-8941"
                      style={{
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 13,
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                  </View>
                </View>

                {/* Blood Group & Shift */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 100 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'রক্তের গ্রুপ:' : 'Blood Group:'}
                    </Text>
                    <TextInput
                      value={formBloodGroup}
                      onChangeText={setFormBloodGroup}
                      placeholder="A+"
                      style={{
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 13,
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'ডিউটি শিফট:' : 'Duty Shift:'}
                    </Text>
                    <TextInput
                      value={formShift}
                      onChangeText={setFormShift}
                      placeholder="08:00 AM - 04:00 PM"
                      style={{
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 13,
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                  </View>
                </View>

                {/* Remarks */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'বিশেষ দায়িত্ব / মন্তব্য:' : 'Remarks & Responsibilities:'}
                  </Text>
                  <TextInput
                    value={formRmk}
                    onChangeText={setFormRmk}
                    placeholder="e.g. VIP aerobridge greeting, consular liaison..."
                    multiline
                    numberOfLines={2}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 13,
                      backgroundColor: '#F8FAFC',
                      minHeight: 50,
                    }}
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSaveForm}
                  disabled={formSaving}
                  style={{
                    backgroundColor: '#0284C7',
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    marginTop: 10,
                  }}
                >
                  {formSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF' }}>
                      {editingMember
                        ? (lang ? 'সদস্য তথ্য আপডেট করুন' : 'Update Member')
                        : (lang ? 'নতুন সদস্য সংরক্ষণ করুন' : 'Save New Member')}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Super Admin Reorder & Serial Customization Modal */}
      {showReorderModal && (
        <Modal
          visible={showReorderModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReorderModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.78)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 640,
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                overflow: 'hidden',
                maxHeight: '92%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {/* Header */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  backgroundColor: '#0A192F',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: '#1E293B',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>🔢</Text>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#F8FAFC' }}>
                      {lang ? 'ফ্লাইট কেয়ার ফ্যামিলি সিরিয়াল কাস্টমাইজ' : 'Customize Flight Care Family Serials'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#38BDF8', fontWeight: '700' }}>
                      {lang ? 'সদস্যদের ক্রম সাজান (▲ ▼ বা সরাসরি সিরিয়াল নম্বর লিখুন)' : 'Reorder members via ▲ ▼ arrows or type custom serial numbers'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowReorderModal(false)}>
                  <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Members List */}
              <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
                {reorderList.map((item, idx) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#F8FAFC',
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      gap: 10,
                    }}
                  >
                    {/* Reorder Arrows */}
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity
                        disabled={idx === 0}
                        onPress={() => handleMoveInReorderList(idx, 'up')}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          backgroundColor: idx === 0 ? '#F1F5F9' : '#0284C7',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '900', color: idx === 0 ? '#94A3B8' : '#FFFFFF' }}>▲</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={idx === reorderList.length - 1}
                        onPress={() => handleMoveInReorderList(idx, 'down')}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          backgroundColor: idx === reorderList.length - 1 ? '#F1F5F9' : '#0284C7',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '900', color: idx === reorderList.length - 1 ? '#94A3B8' : '#FFFFFF' }}>▼</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Serial Input */}
                    <View style={{ width: 54 }}>
                      <TextInput
                        value={String(item.serial ?? (idx + 1))}
                        onChangeText={(val) => handleChangeSerialInReorderList(idx, val)}
                        keyboardType="number-pad"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: '#38BDF8',
                          borderRadius: 6,
                          paddingVertical: 4,
                          paddingHorizontal: 6,
                          textAlign: 'center',
                          fontWeight: '900',
                          fontSize: 13,
                          color: '#0F2A4A',
                        }}
                      />
                    </View>

                    {/* Member Photo/Avatar + Details */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: '#E0F2FE',
                          borderWidth: 1.5,
                          borderColor: '#0284C7',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {(item.photo || (typeof item.avatar === 'string' && (item.avatar.startsWith('http') || item.avatar.startsWith('data:image')))) ? (
                          <Image
                            source={{ uri: item.photo || item.avatar }}
                            style={{ width: '100%', height: '100%', borderRadius: 19 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={{ fontSize: 17 }}>{item.avatar || '🧑‍✈️'}</Text>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                          {lang ? (item.nameBn || item.name) : item.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '700' }} numberOfLines={1}>
                          {lang ? (item.rankBn || item.rank) : item.rank} • {item.badgeNo || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Bottom Action Footer */}
              <View
                style={{
                  padding: 16,
                  backgroundColor: '#F8FAFC',
                  borderTopWidth: 1,
                  borderTopColor: '#E2E8F0',
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <TouchableOpacity
                  onPress={() => setShowReorderModal(false)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#475569' }}>
                    {lang ? 'বাতিল' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveReorder}
                  disabled={reorderSaving}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: '#0284C7',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {reorderSaving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF' }}>
                        ✓ {lang ? 'নতুন সিরিয়াল সংরক্ষণ করুন' : 'Save Serial Order'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Super Admin Single Member Deletion Confirmation Modal */}
      {!!memberToDelete && (
        <Modal
          visible={!!memberToDelete}
          transparent={true}
          animationType="fade"
          onRequestClose={() => !isDeletingMember && setMemberToDelete(null)}
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
                padding: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
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
                    backgroundColor: '#FEE2E2',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>🗑️</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}>
                  {lang ? 'সদস্য মুছে ফেলার নিশ্চয়তা' : 'Confirm Member Deletion'}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                  {lang
                    ? 'সুপার এডমিন হিসাবে আপনি এই সদস্যকে ফ্লাইট কেয়ার ফ্যামিলি থেকে স্থায়ীভাবে মুছে ফেলতে যাচ্ছেন।'
                    : 'As Super Admin, you are about to permanently remove this member from Flight Care Family.'}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#E0F2FE',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {memberToDelete.photo ? (
                    <Image source={{ uri: memberToDelete.photo }} style={{ width: 48, height: 48 }} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 24 }}>{memberToDelete.avatar || '🧑‍✈️'}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                    {lang ? (memberToDelete.nameBn || memberToDelete.name) : memberToDelete.name}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0284C7' }}>
                    #{memberToDelete.serial} • {lang ? (memberToDelete.rankBn || memberToDelete.rank) : memberToDelete.rank}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    ID: {memberToDelete.badgeNo || memberToDelete.id} • {memberToDelete.phone || memberToDelete.personalPhone || 'N/A'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: '#EFF6FF',
                  padding: 10,
                  borderRadius: 10,
                  marginBottom: 20,
                  borderLeftWidth: 4,
                  borderLeftColor: '#0284C7',
                }}
              >
                <Text style={{ fontSize: 11.5, color: '#1E40AF', lineHeight: 16 }}>
                  ℹ️ {lang
                    ? 'এই সদস্যকে মুছে ফেললে অবশিষ্ট সকল কর্মকর্তার ক্রমিক নম্বর (সিরিয়াল ১, ২, ৩...) স্বয়ংক্রিয়ভাবে পুনর্গঠিত হবে।'
                    : 'Removing this member will automatically renumber all remaining members cleanly starting from #1.'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
                <TouchableOpacity
                  onPress={() => setMemberToDelete(null)}
                  disabled={isDeletingMember}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#475569' }}>
                    {lang ? 'বাতিল' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={confirmDeleteMember}
                  disabled={isDeletingMember}
                  style={{
                    flex: 1.5,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: '#DC2626',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    shadowColor: '#DC2626',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  {isDeletingMember ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 15 }}>🗑️</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                        {lang ? 'স্থায়ীভাবে মুছে ফেলুন' : 'Permanently Delete'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Super Admin Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <Modal
          visible={showBulkDeleteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => !bulkDeleting && setShowBulkDeleteModal(false)}
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
                maxWidth: 500,
                padding: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: '#FEE2E2',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>⚠️</Text>
                </View>
                <Text style={{ fontSize: 19, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                  {lang ? `নির্বাচিত ${selectedIds.size} জন সদস্য মুছে ফেলার নিশ্চয়তা` : `Confirm Bulk Delete (${selectedIds.size} Members)`}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                  {lang
                    ? `সুপার এডমিন হিসাবে আপনি নির্বাচিত ${selectedIds.size} জন সদস্যকে ফ্যামিলি রোস্টার থেকে স্থায়ীভাবে মুছে ফেলতে যাচ্ছেন।`
                    : `As Super Admin, you are about to permanently remove ${selectedIds.size} selected members at once.`}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#FECACA',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 18 }}>🗑️</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#991B1B', flex: 1 }}>
                  {lang
                    ? `মোট ${selectedIds.size} জন অতিরিক্ত সদস্য স্থায়ীভাবে মুছে ফেলা হবে।`
                    : `Total ${selectedIds.size} members selected for permanent deletion.`}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: '#F0FDF4',
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 20,
                  borderLeftWidth: 4,
                  borderLeftColor: '#16A34A',
                }}
              >
                <Text style={{ fontSize: 12, color: '#166534', lineHeight: 17 }}>
                  ✓ {lang
                    ? 'মুছে ফেলার পর অবশিষ্ট সকল সদস্যের ক্রমিক নম্বর (সিরিয়াল) ১ থেকে স্বয়ংক্রিয়ভাবে সাজানো হবে।'
                    : 'Remaining members will be cleanly renumbered starting from #1.'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
                <TouchableOpacity
                  onPress={() => setShowBulkDeleteModal(false)}
                  disabled={bulkDeleting}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#475569' }}>
                    {lang ? 'বাতিল' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={confirmBulkDelete}
                  disabled={bulkDeleting}
                  style={{
                    flex: 1.8,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: '#DC2626',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    shadowColor: '#DC2626',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  {bulkDeleting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 15 }}>🗑️</Text>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF' }}>
                        {lang ? `এক ক্লিকে ${selectedIds.size} জন মুছে ফেলুন` : `Delete ${selectedIds.size} Members`}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

