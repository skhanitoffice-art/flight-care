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
import {
  isEpsonL3250Locked,
  setEpsonL3250Lock,
  grantTemporaryUnlock,
  getTemporaryUnlockRemainingSecs,
  generateEpsonOneTimeOtp,
  getEpsonConfig,
  saveEpsonConfig,
  getEpsonAuditLogs,
  recordEpsonPrintSuccess,
  getEpsonTestPrintHtml,
  subscribeEpsonLock,
  ALL_DOC_PRINT_ADDON_KEYS,
  syncLockStateToBackend,
} from '../services/epsonL3250Service';

export const ALL_DOC_PRINT_SERVICES = [
  {
    id: 'visa',
    matchKeys: ['visa', 'visa_on_arrival', 'visa_immigration'],
    nameBn: 'অন অ্যারাইভাল ভিসা (Visa On Arrival)',
    nameEn: 'Visa On Arrival',
    descBn: '৪টি আবশ্যক ডকুমেন্ট যাচাই ও অন-অ্যারাইভাল ভিসা সহায়তা। সার্ভিস চার্জ ১৫০০ টাকা/জন। ($50 USD সরকারি ফি কাউন্টারে সরাসরি প্রদেয়)।',
    descEn: 'Document pre-verification & visa on arrival support. Service charge ৳1,500/passenger. ($50 USD Govt Fee is payable directly by passenger at the airport counter).',
    price: 1500,
    priceUnit: 'person',
    priceDisplayBn: '৳১,৫০০ / জন',
    priceDisplayEn: '৳1,500 / person',
    extraBadgeBn: '$50 সরকারি ফি • 🔒 অনুমোদন সাপেক্ষ',
    extraBadgeEn: '$50 Govt Fee • 🔒 Approval Required',
    icon: '🛂',
  },
  {
    id: 'print',
    matchKeys: ['print', 'printer', 'print_docs'],
    nameBn: 'প্রিন্ট সেবা (Print)',
    nameEn: 'Print',
    descBn: 'বোর্ডিং পাস, ভিসা, টিকিট ও ভ্রমণ ডকুমেন্টস প্রিন্টিং সেবা। কাউন্টার প্রিন্টার: EPSON EcoTank L3250।',
    descEn: 'Printing boarding passes, visas, tickets, and travel documents via EPSON EcoTank L3250.',
    price: 100,
    priceUnit: 'request',
    priceDisplayBn: '৳১০০ / অনুরোধ',
    priceDisplayEn: '৳100 / request',
    extraBadgeBn: 'বোর্ডিং পাস ও ভিসা • 🔒 অনুমোদন সাপেক্ষ',
    extraBadgeEn: 'Boarding Pass & Visa • 🔒 Approval Required',
    icon: '🖨️',
  },
  {
    id: 'air_suvidha',
    matchKeys: ['air_suvidha', 'suvidha', 'airsuvidha'],
    nameBn: 'এয়ার সুবিধা প্রিন্ট (Air Suvidha Print)',
    nameEn: 'Air Suvidha Print',
    descBn: 'ভারতগামী ও ট্রানজিট যাত্রীদের জন্য এয়ার সুবিধা সেলফ ডিক্লারেশন ফর্ম পূরণ ও প্রিন্ট সহায়তা।',
    descEn: 'Air Suvidha self-declaration form fillup & printout support for India-bound & transit passengers.',
    price: 150,
    priceUnit: 'request',
    priceDisplayBn: '৳১৫০ / অনুরোধ',
    priceDisplayEn: '৳150 / request',
    extraBadgeBn: 'ভারতগামী যাত্রী • 🔒 অনুমোদন সাপেক্ষ',
    extraBadgeEn: 'India Bound • 🔒 Approval Required',
    icon: '🇮🇳',
  },
  {
    id: 'bmet_clearance',
    matchKeys: ['bmet_clearance', 'bmet', 'smart_card'],
    nameBn: 'বিএমইটি ক্লিয়ারেন্স ও কার্ড প্রিন্ট',
    nameEn: 'BMET Clearance & Smart Card',
    descBn: 'প্রবাসী কর্মীদের বিএমইটি স্মার্ট কার্ড, ম্যানপাওয়ার সার্টিফিকেট ও ইমিগ্রেশন ছাড়পত্র প্রিন্ট সেবা।',
    descEn: 'BMET smart card, manpower certificate & immigration clearance printout for migrant workers.',
    price: 100,
    priceUnit: 'request',
    priceDisplayBn: '৳১০০ / অনুরোধ',
    priceDisplayEn: '৳100 / request',
    extraBadgeBn: 'প্রবাসী কর্মী • 🔒 অনুমোদন সাপেক্ষ',
    extraBadgeEn: 'Migrant Workers • 🔒 Approval Required',
    icon: '🛂',
  },
  {
    id: 'hotel_ticket_print',
    matchKeys: ['hotel_ticket_print', 'hotel_ticket'],
    nameBn: 'হোটেল বুকিং ও টিকিট প্রিন্ট',
    nameEn: 'Hotel & Return Ticket Print',
    descBn: 'ইমিগ্রেশন ও ভিসা চেকিংয়ের জন্য কনফার্মড হোটেল বুকিং ভাউচার ও রিটার্ন এয়ার টিকিট প্রিন্ট সেবা।',
    descEn: 'Confirmed hotel booking voucher and return air ticket printout for immigration clearance.',
    price: 100,
    priceUnit: 'request',
    priceDisplayBn: '৳১০০ / অনুরোধ',
    priceDisplayEn: '৳100 / request',
    extraBadgeBn: 'ভ্রমণকারী ও পর্যটক • 🔒 অনুমোদন সাপেক্ষ',
    extraBadgeEn: 'Tourists & Expatriates • 🔒 Approval Required',
    icon: '🏨',
  },
  {
    id: 'photocopy',
    matchKeys: ['photocopy'],
    nameBn: 'ফটোকপি সেবা (PhotoCopy)',
    nameEn: 'PhotoCopy',
    descBn: 'পাসপোর্ট, ভিসা, টিকিট ও ভ্রমণ ডকুমেন্টস ফটোকপি সেবা। কাউন্টার মাল্টিফাংশন: EPSON EcoTank L3250।',
    descEn: 'Photocopying boarding passes, visas, tickets, and travel documents via EPSON EcoTank L3250.',
    price: 50,
    priceUnit: 'request',
    priceDisplayBn: '৳৫০ / অনুরোধ',
    priceDisplayEn: '৳50 / request',
    extraBadgeBn: 'ডকুমেন্টস কপি • 🔒 অনুমোদন সাপেক্ষ',
    extraBadgeEn: 'Documents Copy • 🔒 Approval Required',
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
    priceDisplayBn: 'অনুরোধ সাপেক্ষে / উদ্ধৃতি',
    priceDisplayEn: 'On Request / Quote',
    extraBadgeBn: 'কাস্টমস ও ইমিগ্রেশন • 🔒 অনুমোদন সাপেক্ষ',
    extraBadgeEn: 'Customs & Immigration • 🔒 Approval Required',
    icon: '📝',
  },
  {
    id: 'health_cert_print',
    matchKeys: ['health_cert_print', 'vaccine_cert', 'health_cert'],
    nameBn: 'ভ্যাকসিন ও স্বাস্থ্য সনদ প্রিন্ট',
    nameEn: 'Vaccine & Health Cert Print',
    descBn: 'আন্তর্জাতিক ভ্রমণের জন্য কোভিড-১৯ টিকাদান সনদ, পোলিও ও জরুরি স্বাস্থ্য সার্টিফিকেট প্রিন্ট সেবা।',
    descEn: 'COVID-19 vaccination, yellow fever, or medical health certificate printout for international travel.',
    price: 100,
    priceUnit: 'request',
    priceDisplayBn: '৳১০০ / অনুরোধ',
    priceDisplayEn: '৳100 / request',
    extraBadgeBn: 'স্বাস্থ্য ও ভ্যাকসিন • 🔒 অনুমোদন সাপেক্ষ',
    extraBadgeEn: 'Health & Vaccine • 🔒 Approval Required',
    icon: '💉',
  },
  {
    id: 'other_print',
    matchKeys: ['other_print', 'customs_print'],
    nameBn: 'অন্যান্য ভ্রমণ ডকুমেন্ট প্রিন্ট',
    nameEn: 'Other Travel Documents Print',
    descBn: 'কাস্টমস ডিক্লারেশন, ব্যাংক স্টেটমেন্ট, ইনভিটেশন লেটার ও অন্যান্য জরুরি ভ্রমণ ডকুমেন্ট প্রিন্ট সেবা।',
    descEn: 'Customs declaration, bank statement, invitation letter & emergency travel documents printing.',
    price: 100,
    priceUnit: 'request',
    priceDisplayBn: '৳১০০ / অনুরোধ',
    priceDisplayEn: '৳100 / request',
    extraBadgeBn: 'জরুরি ডকুমেন্ট • 🔒 অনুমোদন সাপেক্ষ',
    extraBadgeEn: 'Emergency Prints • 🔒 Approval Required',
    icon: '📑',
  },
];

// Backwards compatibility alias
export const FOUR_DOC_SERVICES = ALL_DOC_PRINT_SERVICES;

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
  const managerName = managerSession?.name || (isAdmin ? 'Super Admin' : 'Duty Manager');

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

  // 3. Epson EcoTank L3250 Smart Lock State
  const [epsonLocked, setEpsonLocked] = useState(() => isEpsonL3250Locked());
  const [epsonConfig, setEpsonConfig] = useState(() => getEpsonConfig());
  const [unlockRemainingSecs, setUnlockRemainingSecs] = useState(() => getTemporaryUnlockRemainingSecs());

  // Modals for Epson L3250
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [configForm, setConfigForm] = useState(() => ({ ...getEpsonConfig() }));

  // 4. Walk-in Counter Requests State
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
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [notice, setNotice] = useState('');

  // Walk-in form state
  const [walkinForm, setWalkinForm] = useState({
    name: '',
    phone: '',
    flight: '',
    serviceId: 'air_suvidha',
    copies: '1',
    autoGrant: true,
    notes: '',
  });

  // Subscribe to Epson lock state updates & live countdown
  useEffect(() => {
    const unsubscribe = subscribeEpsonLock(({ locked, config }) => {
      setEpsonLocked(locked);
      if (config) setEpsonConfig(config);
    });

    const interval = setInterval(() => {
      const remaining = getTemporaryUnlockRemainingSecs();
      setUnlockRemainingSecs(remaining);
      const isCurrentlyLocked = isEpsonL3250Locked();
      setEpsonLocked(isCurrentlyLocked);
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  // Toggle master permission switch
  const handleToggleMasterRequirement = (val) => {
    setRequirePermission(val);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('flightcare_require_print_perm', JSON.stringify(val));
        syncLockStateToBackend(epsonLocked, managerName);
      }
    } catch (e) {}
    showToast(
      val
        ? (isBn ? 'ডকুমেন্ট ও এয়ার সুবিধা প্রিন্টিংয়ে ড্যাশবোর্ড পারমিশন বাধ্যতামূলক করা হয়েছে।' : 'Dashboard permission is now mandatory before printing.')
        : (isBn ? 'প্রিন্ট অনুমতি বাধ্যবাধকতা বন্ধ করা হয়েছে।' : 'Mandatory print permission requirement disabled.')
    );
  };

  // Epson L3250 Lock / Unlock Actions
  const handleToggleEpsonLock = (lockState) => {
    setEpsonL3250Lock(lockState, managerName);
    setEpsonLocked(lockState);
    if (lockState) {
      setUnlockRemainingSecs(0);
      showToast(isBn ? '🔒 EPSON EcoTank L3250 প্রিন্টার ওয়েবসাইট থেকে সফলভাবে লক করা হয়েছে!' : '🔒 EPSON L3250 has been locked from the website dashboard.');
    } else {
      showToast(isBn ? '🟢 EPSON EcoTank L3250 প্রিন্টার আনলক করা হয়েছে। কাউন্টারে প্রিন্ট অনুমোদিত।' : '🟢 EPSON L3250 unlocked. Printing authorized at counter.');
    }
  };

  const handleGrantTempUnlock = (minutes = 5) => {
    grantTemporaryUnlock(minutes, managerName);
    setEpsonLocked(false);
    setUnlockRemainingSecs(minutes * 60);
    showToast(isBn ? `⏱️ EPSON L3250 প্রিন্টার আগামী ${minutes} মিনিটের জন্য অস্থায়ীভাবে আনলক করা হয়েছে!` : `⏱️ EPSON L3250 temporarily unlocked for ${minutes} minutes.`);
  };

  const handleGenerateOtp = () => {
    const token = generateEpsonOneTimeOtp('Counter Walk-in / Document Print', managerName);
    setGeneratedOtp(token);
    setShowOtpModal(true);
  };

  const handleOpenAuditLogs = () => {
    const logs = getEpsonAuditLogs();
    setAuditLogs(logs);
    setShowAuditModal(true);
  };

  const handleSaveConfig = () => {
    saveEpsonConfig(configForm);
    setEpsonConfig(configForm);
    setShowConfigModal(false);
    showToast(isBn ? 'প্রিন্টার কনফিগারেশন সফলভাবে আপডেট হয়েছে!' : 'Printer configuration saved successfully!');
  };

  const handleRunTestPrint = () => {
    if (epsonLocked) {
      Alert.alert(
        isBn ? '🔒 টেস্ট প্রিন্ট লকড' : '🔒 Test Print Locked',
        isBn
          ? 'EPSON L3250 প্রিন্টারটি বর্তমানে লক করা আছে। টেস্ট প্রিন্ট পাঠাতে অনুগ্রহ করে প্রথমে প্রিন্টার আনলক করুন অথবা ৫ মিনিটের জন্য সাময়িক আনলক করুন।'
          : 'EPSON L3250 is currently locked. Please unlock or grant a temporary window before sending a test print.'
      );
      return;
    }

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const existing = document.getElementById('flightcare-epson-test-frame');
        if (existing && existing.parentNode) {
          existing.parentNode.removeChild(existing);
        }
        const iframe = document.createElement('iframe');
        iframe.id = 'flightcare-epson-test-frame';
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '794px';
        iframe.style.height = '1123px';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(getEpsonTestPrintHtml());
        doc.close();

        recordEpsonPrintSuccess({
          title: 'EPSON L3250 Calibration Test Page',
          bookingId: 'TEST-PAGE',
          passengerName: 'Epson Calibration & Alignment',
          actor: managerName,
        });

        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 5000);

        showToast(isBn ? 'EPSON L3250 টেস্ট প্রিন্ট সফলভাবে পাঠানো হয়েছে।' : 'Test print dispatched to EPSON L3250.');
      } catch (e) {
        window.print();
      }
    } else {
      Alert.alert('EPSON L3250', isBn ? 'টেস্ট প্রিন্ট চালু করা হয়েছে।' : 'Test print initiated.');
    }
  };

  // Grant or Revoke Individual Permission
  const handleTogglePermission = (bookingId, serviceId = 'print', grant = true) => {
    setPermissions(prev => {
      const key = `${bookingId}_${serviceId}`;
      const generalKey = `${bookingId}_print`;
      const updated = {
        ...prev,
        [key]: {
          granted: grant,
          grantedAt: new Date().toISOString(),
          grantedBy: managerName,
          serviceId,
          bookingId,
        },
        [generalKey]: {
          granted: grant,
          grantedAt: new Date().toISOString(),
          grantedBy: managerName,
          serviceId,
          bookingId,
        },
      };

      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('flightcare_doc_service_permissions', JSON.stringify(updated));
          syncLockStateToBackend(epsonLocked, managerName);
        }
      } catch (e) {}

      return updated;
    });

    showToast(
      grant
        ? (isBn ? `বুকিং #${bookingId}-এর প্রিন্ট অনুমতি অনুমোদন করা হয়েছে!` : `Print permission approved for #${bookingId}`)
        : (isBn ? `বুকিং #${bookingId}-এর অনুমতি প্রত্যাহার করা হয়েছে!` : `Permission revoked for #${bookingId}`)
    );
  };

  // Add Walk-in Counter Request
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
      serviceId: 'air_suvidha',
      copies: '1',
      autoGrant: true,
      notes: '',
    });
    showToast(isBn ? 'নতুন কাউন্টার সেবা রিকোয়েস্ট সফলভাবে সেভ ও অনুমোদন করা হয়েছে!' : 'Walk-in document request recorded successfully!');
  };

  // Compile combined queue of bookings with these services + walkin requests
  const queue = useMemo(() => {
    const list = [];
    const sourceBookings = allPlatformBookings && allPlatformBookings.length > 0 ? allPlatformBookings : bookings;

    (sourceBookings || []).forEach(b => {
      const bAddons = b.addons || [];
      ALL_DOC_PRINT_SERVICES.forEach(svc => {
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
      const svc = ALL_DOC_PRINT_SERVICES.find(s => s.id === w.serviceId) || ALL_DOC_PRINT_SERVICES[1];
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
      if (filter === 'pending' && item.isGranted) return false;
      if (filter === 'approved' && !item.isGranted) return false;
      const validServiceKeys = ALL_DOC_PRINT_SERVICES.map(s => s.id);
      if (validServiceKeys.includes(filter) && item.serviceId !== filter) return false;

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
    const serviceCounts = {};
    ALL_DOC_PRINT_SERVICES.forEach(s => {
      serviceCounts[s.id] = queue.filter(q => q.serviceId === s.id).length;
    });
    return { total, pending, approved, ...serviceCounts };
  }, [queue]);

  const handleExecutePrint = (item) => {
    // 1. Check Epson L3250 Hardware Lock
    if (epsonLocked && !item.isGranted) {
      Alert.alert(
        isBn ? '🔒 EPSON L3250 প্রিন্টার লকড!' : '🔒 EPSON L3250 Printer Locked!',
        isBn
          ? 'EPSON EcoTank L3250 প্রিন্টারটি ওয়েবসাইট ড্যাশবোর্ড থেকে লক অবস্থায় রাখা আছে। প্রিন্ট করতে অনুগ্রহ করে প্রথমে "অনুমতি দিন" বাটনে চাপুন অথবা ৫ মিনিটের জন্য প্রিন্টার আনলক করুন।'
          : 'EPSON L3250 is locked from the website dashboard. Please grant permission or temporarily unlock the printer first.'
      );
      return;
    }

    // 2. Check general permission requirement
    if (requirePermission && !item.isGranted) {
      Alert.alert(
        isBn ? '🔒 প্রিন্ট লকড!' : '🔒 Print Locked!',
        isBn
          ? 'এই সেবার জন্য ড্যাশবোর্ড থেকে অনুমতি অনুমোদন না করা পর্যন্ত প্রিন্ট করা সম্ভব নয়। দয়া করে আগে "অনুমতি দিন" বাটনে ক্লিক করুন।'
          : 'Permission approval from the Management Dashboard is required before printing. Please grant permission first.'
      );
      return;
    }

    // Record print in Epson audit log
    recordEpsonPrintSuccess({
      title: `${item.serviceObj?.nameEn || 'Document'} Print`,
      bookingId: item.bookingId,
      passengerName: item.customer,
      actor: managerName,
    });

    if (onOpenBookingInvoice && item.booking) {
      onOpenBookingInvoice(item.booking);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    } else {
      Alert.alert('Print', isBn ? 'প্রিন্ট প্রক্রিয়া চালু করা হয়েছে।' : 'Printing document...');
    }
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={{ width: '100%' }}>
      {/* Toast Alert Notification */}
      {notice ? (
        <View
          style={{
            backgroundColor: '#0F172A',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 10,
            marginBottom: 12,
            borderLeftWidth: 4,
            borderLeftColor: '#38BDF8',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: '#F8FAFC', fontSize: 13, fontWeight: '700' }}>{notice}</Text>
          <TouchableOpacity onPress={() => setNotice('')}>
            <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ============================================================== */}
      {/* 🖨️ EPSON EcoTank L3250 SMART HARDWARE & CLOUD LOCK CONTROL CENTER */}
      {/* ============================================================== */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          borderWidth: 2,
          borderColor: epsonLocked ? '#EF4444' : '#10B981',
          padding: 18,
          marginBottom: 18,
          shadowColor: epsonLocked ? '#EF4444' : '#10B981',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          {/* Left: Printer Identity & Status */}
          <View style={{ flex: 1, minWidth: 280 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: epsonLocked ? '#FEE2E2' : '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24 }}>🖨️</Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A' }}>
                    EPSON EcoTank L3250
                  </Text>
                  {/* Status Badge */}
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 12,
                      backgroundColor: epsonLocked ? '#FEF2F2' : '#F0FDF4',
                      borderWidth: 1.5,
                      borderColor: epsonLocked ? '#EF4444' : '#22C55E',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: epsonLocked ? '#DC2626' : '#16A34A',
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '900',
                        color: epsonLocked ? '#B91C1C' : '#15803D',
                      }}
                    >
                      {epsonLocked
                        ? (isBn ? '🔒 ওয়েবসাইট থেকে লক করা' : '🔒 LOCKED BY WEBSITE')
                        : (unlockRemainingSecs > 0
                            ? (isBn ? `🟢 আনলক (বাকি: ${formatCountdown(unlockRemainingSecs)})` : `🟢 UNLOCKED (${formatCountdown(unlockRemainingSecs)})`)
                            : (isBn ? '🟢 আনলক ও সক্রিয়' : '🟢 UNLOCKED & READY'))}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                  {isBn
                    ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর (HSIA) কাউন্টার মাল্টিফাংশন প্রিন্টার'
                    : 'HSIA Airport Terminal 1 & 2 Counter All-in-One Ink Tank Printer'}
                </Text>
              </View>
            </View>

            {/* Technical Hardware Specs Strip */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 12,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
              }}
            >
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                  স্পুলার: <strong style={{ color: '#0F172A' }}>{epsonConfig.spoolerName || 'EPSON L3250 Series'}</strong>
                </Text>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                  কানেকশন: <strong style={{ color: '#0F172A' }}>{epsonConfig.connectionType || 'Wi-Fi & USB'}</strong>
                </Text>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                  কাউন্টার নেটওয়ার্ক: <strong style={{ color: '#0F172A' }}>{epsonConfig.ipAddress || '192.168.1.150'}</strong>
                </Text>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                  লক মোড: <strong style={{ color: epsonLocked ? '#DC2626' : '#16A34A' }}>{epsonConfig.lockMode === 'strict' ? 'Strict (সম্পূর্ণ লক)' : 'Addons Only'}</strong>
                </Text>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' }}>
                <Text style={{ fontSize: 10.5, color: '#166534', fontWeight: 'bold' }}>
                  🛡️ উইন্ডোজ গার্ড: আন-বাইপাসযোগ্য
                </Text>
              </View>
            </View>
          </View>

          {/* Right: Quick Action Controls */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {/* Primary Toggle: Lock / Unlock */}
            {epsonLocked ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleToggleEpsonLock(false)}
                style={{
                  backgroundColor: '#16A34A',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  shadowColor: '#16A34A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 14, color: '#FFFFFF' }}>🟢</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {isBn ? 'Epson L3250 আনলক করুন' : 'Unlock Epson L3250'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleToggleEpsonLock(true)}
                style={{
                  backgroundColor: '#DC2626',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  shadowColor: '#DC2626',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 14, color: '#FFFFFF' }}>🔒</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {isBn ? 'Epson L3250 লক করুন' : 'Lock Epson L3250'}
                </Text>
              </TouchableOpacity>
            )}

            {/* 5-Min Temporary Unlock Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleGrantTempUnlock(5)}
              style={{
                backgroundColor: '#F59E0B',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 13 }}>⏱️</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                {isBn ? '৫ মিনিট আনলক' : '5-Min Temp Unlock'}
              </Text>
            </TouchableOpacity>

            {/* OTP Generator Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleGenerateOtp}
              style={{
                backgroundColor: '#0284C7',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 13 }}>🔑</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                {isBn ? 'ওটিপি পিন' : 'Generate PIN'}
              </Text>
            </TouchableOpacity>

            {/* Test Print Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRunTestPrint}
              style={{
                backgroundColor: '#F1F5F9',
                borderWidth: 1.5,
                borderColor: '#CBD5E1',
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 13 }}>📄</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155' }}>
                {isBn ? 'টেস্ট প্রিন্ট' : 'Test Print'}
              </Text>
            </TouchableOpacity>

            {/* Audit Logs Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenAuditLogs}
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1.5,
                borderColor: '#CBD5E1',
                paddingHorizontal: 10,
                paddingVertical: 9,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                📋 {isBn ? 'লগ' : 'Logs'}
              </Text>
            </TouchableOpacity>

            {/* Windows Hardware Guard Guide */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowGuardModal(true)}
              style={{
                backgroundColor: '#EDE9FE',
                borderWidth: 1.5,
                borderColor: '#C4B5FD',
                paddingHorizontal: 10,
                paddingVertical: 9,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#6D28D9' }}>
                🛡️ {isBn ? 'পিসি গার্ড' : 'PC Guard'}
              </Text>
            </TouchableOpacity>

            {/* Settings Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowConfigModal(true)}
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1.5,
                borderColor: '#CBD5E1',
                paddingHorizontal: 10,
                paddingVertical: 9,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                ⚙️ {isBn ? 'সেটিংস' : 'Config'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lock Security Notice Banner */}
        <View
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 8,
            backgroundColor: epsonLocked ? '#FEF2F2' : '#F0FDF4',
            borderWidth: 1,
            borderColor: epsonLocked ? '#FECACA' : '#BBF7D0',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 14 }}>{epsonLocked ? '🛡️' : '✓'}</Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: epsonLocked ? '#991B1B' : '#166534',
              flex: 1,
              lineHeight: 17,
            }}
          >
            {epsonLocked
              ? (isBn
                  ? 'কাউন্টার সুরক্ষা নীতি: ওয়েবসাইট থেকে EPSON L3250 লক সক্রিয় থাকায় অন-অ্যারাইভাল ভিসা, এয়ার সুবিধা, বিএমইটি ও অন্যান্য কোনো প্রিন্ট ড্যাশবোর্ড অনুমোদন বা ভেরিফাইড ওটিপি পিন ছাড়া বের করা যাবে না।'
                  : 'Counter Security Active: The Epson L3250 printer is locked from the website. Staff cannot print Visa on Arrival, Air Suvidha, BMET clearance, or other documents without manager approval.')
              : (isBn
                  ? 'কাউন্টার প্রিন্টার সক্রিয়: অনুমোদিত প্রতিটি প্রিন্ট জবে স্বয়ংক্রিয় ডিজিটাল সিকিউরিটি ওয়াটারমার্ক ও অথরাইজেশন কিউআর কোড যুক্ত হবে।'
                  : 'Counter printer is active. Authorized print jobs will include digital security verification watermarks.')}
          </Text>
        </View>
      </View>

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
              <Text style={{ fontSize: 24 }}>📑</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                {isBn ? 'ডকুমেন্ট ও এয়ার সুবিধা প্রিন্ট অনুমোদন গেট' : 'Document & Air Suvidha Print Approval Gate'}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 }}>
              {isBn
                ? 'অন-অ্যারাইভাল ভিসা, এয়ার সুবিধা, বিএমইটি ক্লিয়ারেন্স, বোর্ডিং পাস, টিকিট ও ফটোকপি সেবার ড্যাশবোর্ড অনুমোদন ও পারমিশন কন্ট্রোল।'
                : 'Centralized control for Visa On Arrival, Air Suvidha, BMET clearance, boarding pass, ticket, and photocopy printing. Unapproved prints are strictly locked.'}
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
              {isBn ? 'নতুন কাউন্টার সেবা রিকোয়েস্ট' : '+ Walk-in Service'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ALL Print & Document Services Overview Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        {ALL_DOC_PRINT_SERVICES.map(svc => {
          const asset = getAddonAsset(svc.id);
          const reqCount = queue.filter(q => q.serviceId === svc.id).length;
          const pendingCount = queue.filter(q => q.serviceId === svc.id && !q.isGranted).length;

          return (
            <View
              key={svc.id}
              style={{
                flex: 1,
                minWidth: 260,
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  {asset ? (
                    <Image source={asset} style={{ width: 32, height: 32, resizeMode: 'contain' }} />
                  ) : (
                    <Text style={{ fontSize: 24 }}>{svc.icon}</Text>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }} numberOfLines={1}>
                      {isBn ? svc.nameBn : svc.nameEn}
                    </Text>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#0284C7' }} numberOfLines={1}>
                      {isBn ? svc.extraBadgeBn : svc.extraBadgeEn}
                    </Text>
                  </View>
                </View>

                {pendingCount > 0 ? (
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#B45309' }}>
                      {pendingCount} {isBn ? 'অননুমোদিত' : 'Pending'}
                    </Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC' }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#166534' }}>
                      ✓ {isBn ? 'অনুমোদিত' : 'OK'}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16, marginBottom: 8 }}>
                {isBn ? svc.descBn : svc.descEn}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0B3B60' }}>
                  {isBn ? svc.priceDisplayBn : svc.priceDisplayEn}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  {reqCount} {isBn ? 'টি রিকোয়েস্ট' : 'requests'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Filter Tabs & Real-time Search */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: 12,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          marginBottom: 14,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {[
            { key: 'all', label: isBn ? `সব সেবা (${counts.total})` : `All (${counts.total})` },
            { key: 'pending', label: isBn ? `অনুমোদন বাকি (${counts.pending})` : `Pending (${counts.pending})`, alert: counts.pending > 0 },
            { key: 'approved', label: isBn ? `অনুমোদিত (${counts.approved})` : `Approved (${counts.approved})` },
            { key: 'air_suvidha', label: isBn ? `🇮🇳 এয়ার সুবিধা (${counts.air_suvidha || 0})` : `Air Suvidha (${counts.air_suvidha || 0})` },
            { key: 'print', label: isBn ? `🖨️ প্রিন্ট (${counts.print || 0})` : `Print (${counts.print || 0})` },
            { key: 'bmet_clearance', label: isBn ? `🛂 বিএমইটি (${counts.bmet_clearance || 0})` : `BMET (${counts.bmet_clearance || 0})` },
            { key: 'hotel_ticket_print', label: isBn ? `🏨 হোটেল/টিকিট (${counts.hotel_ticket_print || 0})` : `Hotel/Ticket (${counts.hotel_ticket_print || 0})` },
            { key: 'photocopy', label: isBn ? `📄 ফটোকপি (${counts.photocopy || 0})` : `PhotoCopy (${counts.photocopy || 0})` },
            { key: 'visa', label: isBn ? `🛂 অন-অ্যারাইভাল (${counts.visa || 0})` : `Visa (${counts.visa || 0})` },
            { key: 'form_fillup', label: isBn ? `📝 ফর্ম (${counts.form_fillup || 0})` : `Form (${counts.form_fillup || 0})` },
            { key: 'health_cert_print', label: isBn ? `💉 ভ্যাকসিন (${counts.health_cert_print || 0})` : `Vaccine (${counts.health_cert_print || 0})` },
            { key: 'other_print', label: isBn ? `📑 অন্যান্য (${counts.other_print || 0})` : `Other (${counts.other_print || 0})` },
          ].map(tab => {
            const active = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                onPress={() => setFilter(tab.key)}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 8,
                  backgroundColor: active ? '#0B3B60' : (tab.alert ? '#FEF2F2' : '#F1F5F9'),
                  borderWidth: 1,
                  borderColor: active ? '#0B3B60' : (tab.alert ? '#FCA5A5' : '#E2E8F0'),
                }}
              >
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: active ? '800' : '700',
                    color: active ? '#FFFFFF' : (tab.alert ? '#DC2626' : '#475569'),
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Input */}
        <View style={{ minWidth: 200, flex: 1, maxWidth: 300 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={isBn ? 'নাম, ফ্লাইট, ফোন বা আইডি দিয়ে খুঁজুন...' : 'Search passenger, flight, phone...'}
            placeholderTextColor="#94A3B8"
            style={{
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#CBD5E1',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 7,
              fontSize: 12.5,
              color: '#0F172A',
            }}
          />
        </View>
      </View>

      {/* Permission Control List / Table */}
      {filteredQueue.length === 0 ? (
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: 30,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}
        >
          <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
            {isBn ? 'কোনো রিকোয়েস্ট পাওয়া যায়নি' : 'No document service requests found'}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
            {isBn
              ? 'বর্তমানে এই ফিল্টারে কোনো পেন্ডিং অথবা অনুমোদিত ডকুমেন্ট সেবা নেই।'
              : 'There are no matching document or print service requests at the moment.'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filteredQueue.map(item => {
            const isApproved = item.isGranted;
            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: isApproved ? '#86EFAC' : '#FCA5A5',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  {/* Left: Passenger and Service Details */}
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 18 }}>{item.serviceObj?.icon || '📄'}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>
                        {item.customer}
                      </Text>
                      {item.isWalkin && (
                        <View style={{ backgroundColor: '#E0E7FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#3730A3' }}>
                            {isBn ? 'কাউন্টার ওয়াক-ইন' : 'Walk-in'}
                          </Text>
                        </View>
                      )}
                      <View style={{ backgroundColor: isApproved ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: isApproved ? '#166534' : '#991B1B' }}>
                          {isApproved ? (isBn ? '✓ অনুমোদিত' : 'Approved') : (isBn ? '⏳ অনুমতি বাকি' : 'Pending')}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>
                      <strong>{isBn ? item.serviceObj?.nameBn : item.serviceObj?.nameEn}</strong> • {item.flight} ({item.flightDate})
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>
                      আইডি: <strong style={{ color: '#0F172A' }}>#{item.bookingId}</strong> • ফোন: {item.phone} • ফি: {isBn ? item.serviceObj?.priceDisplayBn : item.serviceObj?.priceDisplayEn}
                    </Text>

                    {item.grantedAt && isApproved && (
                      <Text style={{ fontSize: 10, color: '#16A34A', marginTop: 4 }}>
                        ✓ {item.grantedBy} দ্বারা অনুমোদিত ({new Date(item.grantedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </Text>
                    )}
                  </View>

                  {/* Right: Actions (Permission Toggle, Print, WhatsApp) */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {/* Grant / Revoke Toggle */}
                    {isApproved ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleTogglePermission(item.bookingId, item.serviceId, false)}
                        style={{
                          backgroundColor: '#FEE2E2',
                          borderWidth: 1,
                          borderColor: '#FCA5A5',
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#991B1B' }}>
                          ✕ {isBn ? 'অনুমতি প্রত্যাহার' : 'Revoke'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleTogglePermission(item.bookingId, item.serviceId, true)}
                        style={{
                          backgroundColor: '#16A34A',
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          shadowColor: '#16A34A',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.2,
                          shadowRadius: 2,
                          elevation: 1,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                          ✓ {isBn ? 'অনুমতি দিন' : 'Grant Permission'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Execute Print Action */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleExecutePrint(item)}
                      style={{
                        backgroundColor: (requirePermission && !isApproved) ? '#F1F5F9' : '#0B3B60',
                        borderWidth: 1,
                        borderColor: (requirePermission && !isApproved) ? '#CBD5E1' : '#0B3B60',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>
                        {requirePermission && !isApproved ? '🔒' : '🖨️'}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '800',
                          color: (requirePermission && !isApproved) ? '#94A3B8' : '#FFFFFF',
                        }}
                      >
                        {isBn ? 'প্রিন্ট' : 'Print'}
                      </Text>
                    </TouchableOpacity>

                    {/* WhatsApp Alert Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        const msg = isBn
                          ? `আসসালামু আলাইকুম ${item.customer}, ফ্লাইট কেয়ার থেকে আপনার ${item.serviceObj.nameBn} সেবা সম্পর্কিত তথ্য। বুকিং #${item.bookingId}। কাউন্টার প্রিন্টার অনুমোদন স্ট্যাটাস: ${isApproved ? 'অনুমোদিত' : 'প্রক্রিয়াধীন'}।`
                          : `Hello ${item.customer}, update regarding your Flight Care service ${item.serviceObj.nameEn} (Booking #${item.bookingId}).`;
                        openCustomerWhatsApp(item.phone, msg);
                      }}
                      style={{
                        backgroundColor: '#25D366',
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                        💬 WhatsApp
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ONE-TIME OTP SECURITY PIN MODAL */}
      {/* ============================================================== */}
      <Modal visible={showOtpModal} transparent animationType="fade" onRequestClose={() => setShowOtpModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 22, width: '100%', maxWidth: 440, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>🔑</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                  {isBn ? 'EPSON L3250 এককালীন প্রিন্ট ওটিপি' : 'One-Time Print Security PIN'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowOtpModal(false)}>
                <Text style={{ fontSize: 18, color: '#64748B', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12.5, color: '#475569', marginBottom: 14, lineHeight: 18 }}>
              {isBn
                ? 'কাউন্টার স্টাফের জরুরি অফলাইন প্রিন্ট (এয়ার সুবিধা, ভিসা বা টিকিট)-এর জন্য এই ৬-ডিজিটের সিকিউরিটি পিনটি প্রদান করুন। এটি ১৫ মিনিট সক্রিয় থাকবে।'
                : 'Provide this 6-digit security PIN to counter staff to authorize an offline or walk-in print. Valid for 15 minutes.'}
            </Text>

            <View style={{ backgroundColor: '#F0F9FF', borderWidth: 2, borderColor: '#0284C7', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: '#0369A1', fontWeight: '700', marginBottom: 4 }}>
                {isBn ? 'প্রিন্ট অথরাইজেশন পিন' : 'Print Authorization PIN'}
              </Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#0B3B60', letterSpacing: 4, fontFamily: 'monospace' }}>
                {generatedOtp?.pin || '------'}
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                টোকেন কোড: {generatedOtp?.code}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  const pinText = generatedOtp?.pin;
                  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(pinText);
                    showToast(isBn ? 'পিন ক্লিপবোর্ডে কপি করা হয়েছে!' : 'PIN copied to clipboard!');
                  }
                }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155' }}>
                  📋 {isBn ? 'পিন কপি করুন' : 'Copy PIN'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const msg = isBn
                    ? `*Flight Care - EPSON L3250 প্রিন্ট ওটিপি:* ${generatedOtp?.pin} (কোড: ${generatedOtp?.code})। আগামী ১৫ মিনিট কার্যকর থাকবে।`
                    : `Flight Care EPSON L3250 Print PIN: ${generatedOtp?.pin}`;
                  openCustomerWhatsApp('01347570001', msg);
                }}
                style={{ flex: 1.5, paddingVertical: 10, borderRadius: 8, backgroundColor: '#25D366', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  💬 {isBn ? 'কাউন্টারে পাঠান' : 'Send via WhatsApp'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: PRINT AUDIT LOGS MODAL */}
      {/* ============================================================== */}
      <Modal visible={showAuditModal} transparent animationType="fade" onRequestClose={() => setShowAuditModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 650, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>📋</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                  {isBn ? 'EPSON L3250 প্রিন্ট ও লক অডিট লগ' : 'EPSON L3250 Print Audit Logs'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAuditModal(false)}>
                <Text style={{ fontSize: 18, color: '#64748B', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {auditLogs.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#94A3B8' }}>{isBn ? 'কোনো অডিট রেকর্ড নেই' : 'No audit records yet'}</Text>
                </View>
              ) : (
                auditLogs.map((log, idx) => (
                  <View
                    key={log.id || idx}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: '#F8FAFC',
                      borderBottomWidth: 1,
                      borderBottomColor: '#E2E8F0',
                      marginBottom: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                        {log.type}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                        {new Date(log.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: '#475569' }}>{log.details}</Text>
                    <Text style={{ fontSize: 10, color: '#0284C7', marginTop: 2 }}>
                      অ্যাক্টর: {log.actor}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowAuditModal(false)}
              style={{ marginTop: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#475569' }}>
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: PRINTER CONFIGURATION MODAL */}
      {/* ============================================================== */}
      <Modal visible={showConfigModal} transparent animationType="fade" onRequestClose={() => setShowConfigModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 480, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>⚙️</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                  {isBn ? 'EPSON L3250 প্রিন্টার সেটিংস' : 'EPSON L3250 Configuration'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowConfigModal(false)}>
                <Text style={{ fontSize: 18, color: '#64748B', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                {isBn ? 'উইন্ডোজ স্পুলার প্রিন্টার নাম' : 'Windows Spooler Name'}
              </Text>
              <TextInput
                value={configForm.spoolerName}
                onChangeText={v => setConfigForm(p => ({ ...p, spoolerName: v }))}
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12, color: '#0F172A' }}
              />

              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                {isBn ? 'কাউন্টার ওয়াই-ফাই / নেটওয়ার্ক আইপি' : 'Counter IP / Network'}
              </Text>
              <TextInput
                value={configForm.ipAddress}
                onChangeText={v => setConfigForm(p => ({ ...p, ipAddress: v }))}
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12, color: '#0F172A' }}
              />

              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                {isBn ? 'জরুরি ম্যানেজার ওভাররাইড পিন' : 'Emergency Override PIN'}
              </Text>
              <TextInput
                value={configForm.masterPin}
                onChangeText={v => setConfigForm(p => ({ ...p, masterPin: v }))}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12, color: '#0F172A' }}
              />

              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                {isBn ? 'কাউন্টার লোকেশন' : 'Counter Location'}
              </Text>
              <TextInput
                value={configForm.location}
                onChangeText={v => setConfigForm(p => ({ ...p, location: v }))}
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 14, color: '#0F172A' }}
              />
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => setShowConfigModal(false)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveConfig}
                style={{ flex: 1.5, paddingVertical: 10, borderRadius: 8, backgroundColor: '#0B3B60', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {isBn ? 'সংরক্ষণ করুন' : 'Save Settings'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: WINDOWS PC HARDWARE GUARD SETUP & TAMPER-PROOF LOCK */}
      {/* ============================================================== */}
      <Modal visible={showGuardModal} transparent animationType="fade" onRequestClose={() => setShowGuardModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 22, width: '100%', maxWidth: 540, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24 }}>🛡️</Text>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A' }}>
                  {isBn ? 'কাউন্টার পিসি টেম্পার-প্রুফ হার্ডওয়্যার গার্ড' : 'Counter PC Tamper-Proof Guard'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowGuardModal(false)}>
                <Text style={{ fontSize: 18, color: '#64748B', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', padding: 12, borderRadius: 10, marginBottom: 14 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#991B1B', lineHeight: 18 }}>
                🔒 উদ্দেশ্য: কাউন্টার স্টাফ যাতে ওয়েবসাইটের বাইরে গিয়েও (যেমন: ওয়ার্ড, এক্সেল, পিডিএফ বা অন্য ব্রাউজার থেকে) কোনোভাবেই প্রিন্টার চালু করতে না পারে।
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0B3B60', marginBottom: 6 }}>
                📌 কাউন্টার পিসিতে ১-ক্লিকে সেটআপ করার নিয়ম:
              </Text>

              <View style={{ gap: 10, marginBottom: 14 }}>
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>
                    ১. স্ক্রিপ্ট রান করুন (Run as Administrator):
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                    কাউন্টার পিসির ফোল্ডার থেকে <strong style={{ color: '#0B3B60' }}>INSTALL_COUNTER_LOCK_GUARD.bat</strong> ফাইলটিতে রাইট ক্লিক করে <strong>"Run as Administrator"</strong> দিন।
                  </Text>
                </View>

                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>
                    ২. সম্পূর্ণ ইনভিজিবল ব্যাকগ্রাউন্ডে চলবে:
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                    কোনো কালো উইন্ডো ওপেন থাকবে না। এটি উইন্ডোজের ভেতরে ব্যাকগ্রাউন্ড সার্ভিস হিসেবে গোপনে চলবে, তাই কাউন্টার স্টাফ এটি বন্ধ করতে পারবে না।
                  </Text>
                </View>

                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>
                    ৩. পিসি রিস্টার্ট হলেও স্বয়ংক্রিয় চালু:
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                    কাউন্টার স্টাফ পিসি রিস্টার্ট করলেও এটি উইন্ডোজ অন হওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে রান হয়ে ওয়েবসাইট থেকে ম্যানেজারের লাইভ লক কমান্ড টেনে নেবে।
                  </Text>
                </View>

                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>
                    ৪. বাইরের সব প্রিন্ট স্বয়ংক্রিয় ডিলিট:
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                    ম্যানেজার ওয়েবসাইট থেকে লক রাখলে বাইরে থেকে আসা যেকোনো প্রিন্ট জব ১ সেকেন্ডের মধ্যে স্বয়ংক্রিয়ভাবে ডিলিট হয়ে যাবে। ফলে কাগজ কখনো প্রিন্ট হবে না!
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowGuardModal(false)}
              style={{ marginTop: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#0B3B60', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                ✓ {isBn ? 'বুঝেছি / বন্ধ করুন' : 'Got it / Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: WALK-IN ENTRY MODAL WITH ALL SERVICES */}
      {/* ============================================================== */}
      <Modal visible={showWalkinModal} transparent animationType="fade" onRequestClose={() => setShowWalkinModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 22, width: '100%', maxWidth: 500, maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>🖨️</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                  {isBn ? 'নতুন কাউন্টার সেবা রিকোয়েস্ট' : 'New Counter Service Request'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowWalkinModal(false)}>
                <Text style={{ fontSize: 18, color: '#64748B', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {/* Passenger Name */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 }}>
                {isBn ? 'যাত্রীর নাম *' : 'Passenger Name *'}
              </Text>
              <TextInput
                value={walkinForm.name}
                onChangeText={v => setWalkinForm(p => ({ ...p, name: v }))}
                placeholder={isBn ? 'যাত্রীর পুরো নাম' : 'Full Name'}
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
                placeholder="e.g. BG-084, EK-582, 6E-1861"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 14, color: '#0F172A' }}
              />

              {/* Service Selection */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                {isBn ? 'সেবা নির্বাচন করুন (🔒 অনুমোদন সাপেক্ষ) *' : 'Select Service (🔒 Approval Required) *'}
              </Text>
              <View style={{ gap: 6, marginBottom: 14 }}>
                {ALL_DOC_PRINT_SERVICES.map(s => {
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Text style={{ fontSize: 18 }}>{s.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: sel ? '#0284C7' : '#0F172A' }} numberOfLines={1}>
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
