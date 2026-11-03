import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { getAddonAsset } from '../constants/data';
import { openCustomerWhatsApp } from '../services/whatsappService';

export const FOUR_DOC_SERVICES = [
  {
    id: 'visa',
    matchKeys: ['visa', 'visa_on_arrival'],
    nameBn: 'অন অ্যারাইভাল ভিসা (Visa On Arrival)',
    nameEn: 'Visa On Arrival',
    descBn: '৪টি আবশ্যক ডকুমেন্ট যাচাই ও অন-অ্যারাইভাল ভিসা সহায়তা। সার্ভিস চার্জ ১৫০০ টাকা/জন। ($50 USD সরকারি ফি কাউন্টারে সরাসরি প্রদেয়)।',
    descEn: 'Document pre-verification & visa on arrival support. Service charge ৳1,500/passenger. ($50 USD Govt Fee is payable directly by passenger at the airport counter).',
    price: 1500,
    priceUnit: 'person',
    priceDisplayBn: '৳১,৫০০ / জন',
    priceDisplayEn: '৳1,500 / person',
    extraBadgeBn: '$50 সরকারি ফি',
    extraBadgeEn: '$50 Govt Fee',
    icon: '🛂',
  },
  {
    id: 'print',
    matchKeys: ['print', 'printer', 'print_docs'],
    nameBn: 'প্রিন্ট সেবা (Print)',
    nameEn: 'Print',
    descBn: 'বোর্ডিং পাস, ভিসা, টিকিট ও ভ্রমণ ডকুমেন্টস প্রিন্টিং সেবা।',
    descEn: 'Printing boarding passes, visas, tickets, and travel documents.',
    price: 100,
    priceUnit: 'request',
    priceDisplayBn: '৳১০০ / অনুরোধ',
    priceDisplayEn: '৳100 / request',
    extraBadgeBn: 'বোর্ডিং পাস ও ভিসা',
    extraBadgeEn: 'Boarding Pass & Visa',
    icon: '🖨️',
  },
  {
    id: 'photocopy',
    matchKeys: ['photocopy'],
    nameBn: 'ফটোকপি সেবা (PhotoCopy)',
    nameEn: 'PhotoCopy',
    descBn: 'পাসপোর্ট, ভিসা, টিকিট ও ভ্রমণ ডকুমেন্টস ফটোকপি সেবা।',
    descEn: 'Photocopying boarding passes, visas, tickets, and travel documents.',
    price: 50,
    priceUnit: 'request',
    priceDisplayBn: '৳৫০ / অনুরোধ',
    priceDisplayEn: '৳50 / request',
    extraBadgeBn: 'ডকুমেন্টস কপি',
    extraBadgeEn: 'Documents Copy',
    icon: '📄',
  },
  {
    id: 'form_fillup',
    matchKeys: ['form_fillup', 'form', 'formfillup'],
    nameBn: 'ফর্ম পূরণ (Form Fillup)',
    nameEn: 'Form Fillup',
    descBn: 'বিমানবন্দরে আগমন, বহির্গমন, কাস্টমস ও ইমিগ্রেশন ট্রাভেল ফর্ম নির্ভুলভাবে পূরণে সহায়তা।',
    descEn: 'Assistance with embarkation, disembarkation, customs declaration, and airport travel forms.',
    price: 0,
    priceUnit: 'quote',
    priceDisplayBn: 'অন রিকোয়েস্ট / কোটেশন',
    priceDisplayEn: 'On Request / Quote',
    extraBadgeBn: 'কাস্টমস ও ইমিগ্রেশন',
    extraBadgeEn: 'Customs & Immigration',
    icon: '📝',
  },
];

export default function DocServicesPermissionDashboard({
  allPlatformBookings = [],
  bookings = [],
  managerSession = null,
  isAdmin = true,
  lang = 1,
  onOpenBookingInvoice = null,
  onOpenBookingDetails = null,
  embedded = false,
}) {
  const isBn = Boolean(lang);

  // 1. Stored Permissions State
  const [permissions, setPermissions] = useState(() => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('flightcare_doc_service_permissions');
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {}
    return {};
  });

  // 2. Master Switch: Require Permission before Printing (Default: true)
  const [requirePermission, setRequirePermission] = useState(() => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('flightcare_require_print_perm');
        if (raw !== null) return JSON.parse(raw);
      }
    } catch (e) {}
    return true;
  });

  // 3. Walk-in Counter Requests State
  const [walkinRequests, setWalkinRequests] = useState(() => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('flightcare_walkin_doc_requests');
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {}
    return [];
  });

  // Active filter & search
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'print' | 'photocopy' | 'visa' | 'form_fillup'
  const [search, setSearch] = useState('');
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [notice, setNotice] = useState('');

  // Walk-in form state
  const [walkinForm, setWalkinForm] = useState({
    name: '',
    phone: '',
    flight: '',
    serviceId: 'print',
    copies: '1',
    autoGrant: true,
    notes: '',
  });

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  // Toggle master permission switch
  const handleToggleMasterRequirement = (val) => {
    setRequirePermission(val);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('flightcare_require_print_perm', JSON.stringify(val));
      }
    } catch (e) {}
    showToast(
      val
        ? (isBn ? 'ডকুমেন্ট প্রিন্টিংয়ে ড্যাশবোর্ড পারমিশন বাধ্যতামূলক করা হয়েছে।' : 'Dashboard permission is now mandatory before printing.')
        : (isBn ? 'প্রিন্ট অনুমতি বাধ্যবাধকতা বন্ধ করা হয়েছে।' : 'Mandatory print permission requirement disabled.')
    );
  };

  // Grant or Revoke Permission
  const handleTogglePermission = (bookingId, serviceId = 'print', grant = true) => {
    setPermissions(prev => {
      const key = `${bookingId}_${serviceId}`;
      const generalKey = `${bookingId}_print`;
      const updated = {
        ...prev,
        [key]: {
          granted: grant,
          grantedAt: new Date().toISOString(),
          grantedBy: managerSession?.name || (isAdmin ? 'Super Admin' : 'Duty Manager'),
          serviceId,
          bookingId,
        },
        [generalKey]: {
          granted: grant,
          grantedAt: new Date().toISOString(),
          grantedBy: managerSession?.name || (isAdmin ? 'Super Admin' : 'Duty Manager'),
          serviceId,
          bookingId,
        },
      };
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('flightcare_doc_service_permissions', JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });

    showToast(
      grant
        ? (isBn ? `বুকিং #${bookingId}-এর প্রিন্ট অনুমতি সফলভাবে অনুমোদন করা হয়েছে!` : `Print permission granted for #${bookingId}!`)
        : (isBn ? `বুকিং #${bookingId}-এর প্রিন্ট অনুমতি স্থগিত করা হয়েছে!` : `Print permission revoked for #${bookingId}!`)
    );
  };

  // Save new walk-in request
  const handleSaveWalkin = () => {
    if (!walkinForm.name.trim()) {
      Alert.alert(isBn ? 'যাত্রীর নাম আবশ্যক' : 'Passenger Name Required');
      return;
    }
    const reqId = 'DOC-' + Math.floor(10000 + Math.random() * 90000);
    const newReq = {
      id: reqId,
      bookingId: reqId,
      customer: walkinForm.name.trim(),
      phone: walkinForm.phone.trim() || 'Counter Walk-in',
      flight: (walkinForm.flight.trim() || 'HSIA-DAC').toUpperCase(),
      flightDate: new Date().toLocaleDateString('en-GB'),
      serviceId: walkinForm.serviceId,
      copies: Number(walkinForm.copies) || 1,
      notes: walkinForm.notes.trim(),
      createdAt: new Date().toISOString(),
      isWalkin: true,
      addons: [walkinForm.serviceId],
    };

    const updated = [newReq, ...walkinRequests];
    setWalkinRequests(updated);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('flightcare_walkin_doc_requests', JSON.stringify(updated));
      }
    } catch (e) {}

    if (walkinForm.autoGrant) {
      handleTogglePermission(reqId, walkinForm.serviceId, true);
    }

    setShowWalkinModal(false);
    setWalkinForm({
      name: '',
      phone: '',
      flight: '',
      serviceId: 'print',
      copies: '1',
      autoGrant: true,
      notes: '',
    });
    showToast(isBn ? 'নতুন কাউন্টার রিকোয়েস্ট সফলভাবে সেভ ও অনুমোদন করা হয়েছে!' : 'Walk-in document request recorded successfully!');
  };

  // Compile combined queue of bookings with these 4 services + walkin requests
  const queue = useMemo(() => {
    const list = [];
    const sourceBookings = allPlatformBookings && allPlatformBookings.length > 0 ? allPlatformBookings : bookings;

    (sourceBookings || []).forEach(b => {
      const bAddons = b.addons || [];
      FOUR_DOC_SERVICES.forEach(svc => {
        const isMatched = svc.matchKeys.some(k => bAddons.includes(k));
        if (isMatched) {
          const permKey = `${b.id}_${svc.id}`;
          const fallbackKey = `${b.id}_print`;
          const permInfo = permissions[permKey] || permissions[fallbackKey];
          const isGranted = Boolean(permInfo?.granted);

          list.push({
            id: `${b.id}_${svc.id}`,
            bookingId: b.id,
            booking: b,
            customer: b.customer || b.passengerName || b.name || (isBn ? 'যাত্রী' : 'Passenger'),
            phone: b.phone || b.passengerPhone || 'N/A',
            flight: (b.fno || b.flightNumber || b.flight?.number || 'BG-084').toUpperCase(),
            flightDate: b.date || b.flightDate || b.flight?.date || 'Today',
            serviceId: svc.id,
            serviceObj: svc,
            isGranted,
            grantedAt: permInfo?.grantedAt,
            grantedBy: permInfo?.grantedBy,
            isWalkin: false,
          });
        }
      });
    });

    (walkinRequests || []).forEach(w => {
      const svc = FOUR_DOC_SERVICES.find(s => s.id === w.serviceId) || FOUR_DOC_SERVICES[1];
      const permKey = `${w.id}_${w.serviceId}`;
      const permInfo = permissions[permKey];
      const isGranted = Boolean(permInfo?.granted ?? w.isGranted);

      list.push({
        id: `${w.id}_${w.serviceId}`,
        bookingId: w.id,
        booking: w,
        customer: w.customer,
        phone: w.phone,
        flight: w.flight,
        flightDate: w.flightDate,
        serviceId: w.serviceId,
        serviceObj: svc,
        isGranted,
        grantedAt: permInfo?.grantedAt || w.createdAt,
        grantedBy: permInfo?.grantedBy || (isBn ? 'কাউন্টার ম্যানেজার' : 'Counter Manager'),
        isWalkin: true,
      });
    });

    return list;
  }, [allPlatformBookings, bookings, permissions, walkinRequests, isBn]);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return queue.filter(item => {
      // 1. Category / Status filter
      if (filter === 'pending' && item.isGranted) return false;
      if (filter === 'approved' && !item.isGranted) return false;
      if (['print', 'photocopy', 'visa', 'form_fillup'].includes(filter) && item.serviceId !== filter) return false;

      // 2. Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const str = `${item.customer} ${item.phone} ${item.flight} ${item.bookingId} ${item.serviceObj.nameEn} ${item.serviceObj.nameBn}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [queue, filter, search]);

  const counts = useMemo(() => {
    const total = queue.length;
    const pending = queue.filter(q => !q.isGranted).length;
    const approved = queue.filter(q => q.isGranted).length;
    const print = queue.filter(q => q.serviceId === 'print').length;
    const photocopy = queue.filter(q => q.serviceId === 'photocopy').length;
    const visa = queue.filter(q => q.serviceId === 'visa').length;
    const form = queue.filter(q => q.serviceId === 'form_fillup').length;
    return { total, pending, approved, print, photocopy, visa, form };
  }, [queue]);

  const handleExecutePrint = (item) => {
    if (requirePermission && !item.isGranted) {
      Alert.alert(
        isBn ? '🔒 প্রিন্ট লকড!' : '🔒 Print Locked!',
        isBn
          ? 'এই সেবার জন্য ড্যাশবোর্ড থেকে অনুমতি অনুমোদন না করা পর্যন্ত প্রিন্ট করা সম্ভব নয়। দয়া করে আগে "অনুমতি দিন" বাটনে ক্লিক করুন।'
          : 'Permission approval from the Management Dashboard is required before printing. Please grant permission first.'
      );
      return;
    }

    if (onOpenBookingInvoice && item.booking) {
      onOpenBookingInvoice(item.booking);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    } else {
      Alert.alert(isBn ? 'প্রিন্ট' : 'Print', isBn ? 'ডকুমেন্ট প্রিন্টিং শুরু হয়েছে...' : 'Printing document...');
    }
  };

  return (
    <View style={{ width: '100%', marginBottom: embedded ? 20 : 0 }}>
      {/* Toast Notice */}
      {notice ? (
        <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 14 }}>
          <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700' }}>✓ {notice}</Text>
        </View>
      ) : null}

      {/* Main Header & Master Permission Toggle Card */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 18,
          borderWidth: 1.5,
          borderColor: '#E2E8F0',
          marginBottom: 16,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 260 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 24 }}>🖨️</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                {isBn ? 'ডকুমেন্ট ও কাউন্টার সেবা নিয়ন্ত্রণ ড্যাশবোর্ড' : 'Document & Additional Services Control Gate'}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 }}>
              {isBn
                ? 'অন-অ্যারাইভাল ভিসা, প্রিন্ট, ফটোকপি ও ফর্ম পূরণ সেবার ড্যাশবোর্ড অনুমোদন ও প্রিন্ট পারমিশন গেট।'
                : 'Centralized control for Visa On Arrival, Print, PhotoCopy, and Form Fillup. Unapproved prints are strictly locked.'}
            </Text>
          </View>

          {/* Master Permission Requirement Switch */}
          <View
            style={{
              backgroundColor: requirePermission ? '#FEF2F2' : '#F1F5F9',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1.5,
              borderColor: requirePermission ? '#FCA5A5' : '#CBD5E1',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: requirePermission ? '#991B1B' : '#475569' }}>
                {requirePermission
                  ? (isBn ? '🔒 প্রিন্ট পারমিশন: বাধ্যতামূলক' : '🔒 Print Permission: Mandatory')
                  : (isBn ? '🔓 পারমিশন: শিথিল' : '🔓 Permission: Optional')}
              </Text>
              <Text style={{ fontSize: 11, color: requirePermission ? '#DC2626' : '#64748B', marginTop: 1 }}>
                {requirePermission
                  ? (isBn ? 'ড্যাশবোর্ড অনুমতি ছাড়া প্রিন্ট লকড থাকবে' : 'Prints are locked until approved from dashboard')
                  : (isBn ? 'সরাসরি প্রিন্ট অনুমোদিত' : 'Direct printing without gate')}
              </Text>
            </View>
            <Switch
              value={requirePermission}
              onValueChange={handleToggleMasterRequirement}
              trackColor={{ false: '#94A3B8', true: '#DC2626' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* New Walkin Request Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowWalkinModal(true)}
            style={{
              backgroundColor: '#16A34A',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              shadowColor: '#16A34A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 14, color: '#FFFFFF' }}>➕</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
              {isBn ? 'নতুন কাউন্টার রিকোয়েস্ট' : '+ Walk-in Service'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4 Additional Services Overview Grid (Exact Match with Image) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        {FOUR_DOC_SERVICES.map(svc => {
          const asset = getAddonAsset(svc.id);
          const reqCount = queue.filter(q => q.serviceId === svc.id).length;
          const pendingCount = queue.filter(q => q.serviceId === svc.id && !q.isGranted).length;

          return (
            <View
              key={svc.id}
              style={{
                flex: 1,
                minWidth: 240,
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                padding: 14,
                borderWidth: 1.5,
                borderColor: pendingCount > 0 ? '#F59E0B' : '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {asset ? (
                    <Image source={asset} style={{ width: 26, height: 26, borderRadius: 5 }} resizeMode="contain" />
                  ) : (
                    <Text style={{ fontSize: 22 }}>{svc.icon}</Text>
                  )}
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                      {isBn ? svc.nameBn : svc.nameEn}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7' }}>
                      {isBn ? svc.priceDisplayBn : svc.priceDisplayEn}
                    </Text>
                  </View>
                </View>

                {pendingCount > 0 ? (
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                      {pendingCount} {isBn ? 'পেন্ডিং' : 'Pending'}
                    </Text>
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#DCFCE7' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                      ✓ {isBn ? 'সক্রিয়' : 'Active'}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 16, marginBottom: 10, minHeight: 48 }} numberOfLines={3}>
                {isBn ? svc.descBn : svc.descEn}
              </Text>

              <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  {isBn ? 'মোট রিকোয়েস্ট:' : 'Total requests:'} <Text style={{ fontWeight: '800', color: '#0F172A' }}>{reqCount}</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setFilter(svc.id)}
                  style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: filter === svc.id ? '#0284C7' : '#F1F5F9' }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: filter === svc.id ? '#FFFFFF' : '#0284C7' }}>
                    {filter === svc.id ? (isBn ? 'ফিল্টারড' : 'Filtered') : (isBn ? 'দেখুন →' : 'View →')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Queue Filter Tabs & Search Bar */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: 14,
          borderWidth: 1.5,
          borderColor: '#E2E8F0',
          marginBottom: 14,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 6 }}>
            {[
              ['all', isBn ? `সকল (${counts.total})` : `All (${counts.total})`],
              ['pending', isBn ? `⏳ অনুমতি অপেক্ষমাণ (${counts.pending})` : `⏳ Pending Approval (${counts.pending})`],
              ['approved', isBn ? `✓ অনুমোদিত (${counts.approved})` : `✓ Approved (${counts.approved})`],
              ['print', isBn ? `🖨️ প্রিন্ট (${counts.print})` : `🖨️ Print (${counts.print})`],
              ['photocopy', isBn ? `📄 ফটোকপি (${counts.photocopy})` : `📄 PhotoCopy (${counts.photocopy})`],
              ['visa', isBn ? `🛂 ভিসা (${counts.visa})` : `🛂 Visa (${counts.visa})`],
              ['form_fillup', isBn ? `📝 ফর্ম (${counts.form})` : `📝 Form (${counts.form})`],
            ].map(([fKey, fLabel]) => {
              const active = filter === fKey;
              return (
                <TouchableOpacity
                  key={fKey}
                  onPress={() => setFilter(fKey)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: active ? '#0284C7' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: active ? '#0284C7' : '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFFFFF' : '#475569' }}>
                    {fLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Reset filter */}
          {filter !== 'all' && (
            <TouchableOpacity onPress={() => setFilter('all')}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>
                ✕ {isBn ? 'ফিল্টার মুছুন' : 'Reset'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search input */}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={isBn ? 'যাত্রীর নাম, মোবাইল নম্বর, ফ্লাইট বা বুকিং আইডি দিয়ে সার্চ করুন...' : 'Search by passenger name, phone, flight, or booking ID...'}
          placeholderTextColor="#94A3B8"
          style={{
            backgroundColor: '#F8FAFC',
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: 13,
            color: '#0F172A',
          }}
        />
      </View>

      {/* Permission Requests Queue Table / Cards */}
      <View style={{ gap: 10 }}>
        {filteredQueue.length === 0 ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 24,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🖨️</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 4 }}>
              {isBn ? 'কোনো সার্ভিস রিকোয়েস্ট মেলেনি' : 'No document service requests found'}
            </Text>
            <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center', maxWidth: 450, marginBottom: 14 }}>
              {isBn
                ? 'যাত্রী যখন বুকিং করার সময় প্রিন্ট, ফটোকপি, ফর্ম পূরণ বা অন-অ্যারাইভাল ভিসা যুক্ত করবে, তখন এখানে অনুমতি অনুমোদনের জন্য দেখা যাবে।'
                : 'When passengers select Print, PhotoCopy, Form Fillup, or Visa On Arrival during booking, they will appear here for permission approval.'}
            </Text>
            <TouchableOpacity
              onPress={() => setShowWalkinModal(true)}
              style={{ backgroundColor: '#0284C7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>
                {isBn ? '➕ নতুন কাউন্টার রিকোয়েস্ট যুক্ত করুন' : '+ Add Counter Request'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredQueue.map(item => {
            const isApproved = item.isGranted;
            const asset = getAddonAsset(item.serviceId);

            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: isApproved ? '#86EFAC' : '#FDE68A',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 220 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>
                        #{item.bookingId}
                      </Text>
                      {item.isWalkin && (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: '#E0E7FF' }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#4338CA' }}>
                            {isBn ? 'কাউন্টার ওয়াক-ইন' : 'Counter Walk-in'}
                          </Text>
                        </View>
                      )}
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: isApproved ? '#DCFCE7' : '#FEF3C7',
                          borderWidth: 1,
                          borderColor: isApproved ? '#86EFAC' : '#FDE68A',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: isApproved ? '#15803D' : '#B45309' }}>
                          {isApproved
                            ? (isBn ? '✓ প্রিন্ট অনুমোদিত' : '✓ Print Permitted')
                            : (isBn ? '⏳ অনুমতি অপেক্ষমাণ (লকড)' : '⏳ Approval Pending (Locked)')}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#1E293B', marginTop: 4 }}>
                      👤 {item.customer} {item.phone ? `(${item.phone})` : ''}
                    </Text>

                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      ✈️ {item.flight} • 📅 {item.flightDate}
                    </Text>
                  </View>

                  {/* Requested Service Badge */}
                  <View style={{ backgroundColor: '#F8FAFC', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {asset ? (
                      <Image source={asset} style={{ width: 22, height: 22, borderRadius: 4 }} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: 18 }}>{item.serviceObj.icon}</Text>
                    )}
                    <View>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                        {isBn ? item.serviceObj.nameBn : item.serviceObj.nameEn}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>
                        {isBn ? item.serviceObj.priceDisplayBn : item.serviceObj.priceDisplayEn}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Approver Details */}
                {isApproved && item.grantedAt && (
                  <View style={{ marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F0FDF4', borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 11, color: '#166534', fontWeight: '700' }}>
                      ✓ {isBn ? 'অনুমোদন দিয়েছেন:' : 'Approved by:'} {item.grantedBy || 'Manager'} • {new Date(item.grantedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </Text>
                  </View>
                )}

                {/* Action Buttons Bar */}
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
                  {/* WhatsApp Notify */}
                  {item.phone && item.phone !== 'Counter Walk-in' && (
                    <TouchableOpacity
                      onPress={() => openCustomerWhatsApp(item.booking || item, lang)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: '#25D366',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: '#FFFFFF' }}>💬</Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                        {isBn ? 'WhatsApp' : 'WhatsApp'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Print Action */}
                  <TouchableOpacity
                    onPress={() => handleExecutePrint(item)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: isApproved ? '#0284C7' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: isApproved ? '#0284C7' : '#CBD5E1',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>{isApproved ? '🖨️' : '🔒'}</Text>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: isApproved ? '#FFFFFF' : '#64748B' }}>
                      {isApproved
                        ? (isBn ? 'ডকুমেন্ট প্রিন্ট' : 'Print Document')
                        : (isBn ? 'প্রিন্ট লকড (অনুমতি বাকি)' : 'Print Locked')}
                    </Text>
                  </TouchableOpacity>

                  {/* Permission Toggle Action */}
                  {isApproved ? (
                    <TouchableOpacity
                      onPress={() => handleTogglePermission(item.bookingId, item.serviceId, false)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: '#FEE2E2',
                        borderWidth: 1,
                        borderColor: '#FCA5A5',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#DC2626' }}>
                        ✕ {isBn ? 'অনুমতি প্রত্যাহার' : 'Revoke'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleTogglePermission(item.bookingId, item.serviceId, true)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: '#16A34A',
                        shadowColor: '#16A34A',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        elevation: 2,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#FFFFFF' }}>✓</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                        {isBn ? 'অনুমতি দিন (Approve)' : 'Grant Permission'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Walk-in Counter Document Modal */}
      <Modal visible={showWalkinModal} transparent animationType="fade" onRequestClose={() => setShowWalkinModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ width: '100%', maxWidth: 480, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>➕</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  {isBn ? 'নতুন কাউন্টার ডকুমেন্ট রিকোয়েস্ট' : 'New Walk-in Document Service'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowWalkinModal(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Passenger Name */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                {isBn ? 'যাত্রীর নাম *' : 'Passenger Name *'}
              </Text>
              <TextInput
                value={walkinForm.name}
                onChangeText={v => setWalkinForm(p => ({ ...p, name: v }))}
                placeholder={isBn ? 'যাত্রীর পুরো নাম লিখুন' : 'Enter passenger full name'}
                placeholderTextColor="#94A3B8"
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12, color: '#0F172A' }}
              />

              {/* Phone */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                {isBn ? 'মোবাইল নম্বর' : 'Phone Number'}
              </Text>
              <TextInput
                value={walkinForm.phone}
                onChangeText={v => setWalkinForm(p => ({ ...p, phone: v }))}
                placeholder="01XXXXXXXXX"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12, color: '#0F172A' }}
              />

              {/* Flight */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                {isBn ? 'ফ্লাইট নম্বর' : 'Flight Number'}
              </Text>
              <TextInput
                value={walkinForm.flight}
                onChangeText={v => setWalkinForm(p => ({ ...p, flight: v }))}
                placeholder="e.g. BG-084, EK-582"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 14, color: '#0F172A' }}
              />

              {/* Service Selection */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                {isBn ? 'সার্ভিস নির্বাচন করুন *' : 'Select Service *'}
              </Text>
              <View style={{ gap: 6, marginBottom: 14 }}>
                {FOUR_DOC_SERVICES.map(s => {
                  const sel = walkinForm.serviceId === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setWalkinForm(p => ({ ...p, serviceId: s.id }))}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: sel ? '#F0F9FF' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: sel ? '#0284C7' : '#E2E8F0',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 18 }}>{s.icon}</Text>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: sel ? '#0284C7' : '#0F172A' }}>
                            {isBn ? s.nameBn : s.nameEn}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748B' }}>
                            {isBn ? s.priceDisplayBn : s.priceDisplayEn}
                          </Text>
                        </View>
                      </View>
                      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: sel ? '#0284C7' : '#CBD5E1', alignItems: 'center', justifyContent: 'center' }}>
                        {sel && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0284C7' }} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Auto Grant Permission Checkbox */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setWalkinForm(p => ({ ...p, autoGrant: !p.autoGrant }))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}
              >
                <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: walkinForm.autoGrant ? '#16A34A' : '#94A3B8', backgroundColor: walkinForm.autoGrant ? '#16A34A' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                  {walkinForm.autoGrant && <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                </View>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>
                  {isBn ? 'সাথে সাথে প্রিন্ট পারমিশন অনুমোদন করুন' : 'Auto-grant print permission immediately'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => setShowWalkinModal(false)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveWalkin}
                style={{ flex: 1.5, paddingVertical: 10, borderRadius: 8, backgroundColor: '#16A34A', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {isBn ? 'সংরক্ষণ ও অনুমোদন' : 'Save & Authorize'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
