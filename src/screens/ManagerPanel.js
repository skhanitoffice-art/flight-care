import React, { useState, useEffect } from 'react';
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
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { s } from '../styles/styles';
import { C } from '../constants/theme';
import {
  DEFAULT_MANAGED_AIRPORTS,
  PLATFORM_AIRPORT_SERVICES,
  SERVICES,
  DEFAULT_PRICING_CONFIG,
  ADDONS,
  DEFAULT_ARRIVAL_MILESTONES,
  DEFAULT_DEPARTURE_MILESTONES,
  CANCELLATION_REASONS,
  DEFAULT_STAFF_ROSTER,
  getAddonAsset,
} from '../constants/data';
import { calculateBookingPricing, normalizeManagerService } from '../utils/helpers';
import VisaOnArrivalUploadSection from '../components/VisaOnArrivalUploadSection';
import { managerLogout } from '../../api';
import {
  getBookingCommunicationLogs,
  dispatchStaffNotification,
  STAFF_NOTIFICATION_TYPES,
  dispatchMultiChannelNotification,
  COMMUNICATION_EVENTS,
  dispatchBookingLifecycleNotifications,
} from '../services/communication';
import {
  generateDailyReconciliation,
  cleanExpiredPaymentSessions,
  getBkashWebhookLogs,
  simulateIncomingBkashIpn,
  simulateIncomingCardIpn,
  simulateIncomingSslCommerzIpn,
} from '../services/paymentGateway';
import {
  getSecurityAuditLogs,
  clearSecurityAuditLogs,
  exportAuditLogsJson,
  exportAuditLogsCsv,
  logSecurityEvent,
  checkAccountLockout,
  resetFailedLogins,
  validatePasswordStrength,
  validateAdminPin,
  sanitizeInput,
  maskPhoneNumber,
  maskEmail,
  maskPassportNumber,
  maskBkashWallet,
  isDemoLoginAllowed,
} from '../services/security';
import { addToBlacklist } from '../services/blacklistService';
import OfficerIdCardModal from '../components/OfficerIdCardModal';
import OfficerProfileModal from '../components/OfficerProfileModal';
import ProtocolRanksModal from '../components/ProtocolRanksModal';
import { calculateOfficerPoints } from '../services/officerService';
import LiveTrackingModal from '../components/LiveTrackingModal';
import AdminManualBookingModal from '../components/AdminManualBookingModal';
import BookingInvoiceModal from '../components/BookingInvoiceModal';
import VipPlacardModal from '../components/VipPlacardModal';
import MakePlacardModal from '../components/MakePlacardModal';
import { getPlacardHistory } from '../services/placardService';
import {
  getAllActiveTrackingSessions,
  AIRPORT_CHECKPOINTS,
  AIRPORT_GPS_CENTERS,
  stepSimulationCloser,
  sendTrackingPing,
  getGoogleMapsApiKey,
  setGoogleMapsApiKey,
  getGoogleMapsNavigationUrl,
} from '../services/trackingService';
import AdminLiveTrackingTab from './admin/AdminLiveTrackingTab';
import AdminSecurityTab from './admin/AdminSecurityTab';
import AdminPaymentsTab from './admin/AdminPaymentsTab';
import AdminBackupTab from './admin/AdminBackupTab';
import AdminCustomersTab from './admin/AdminCustomersTab';
import AdminNotificationsTab from './admin/AdminNotificationsTab';
import AdminReportsTab from './admin/AdminReportsTab';
import AdminIncidentsTab from './admin/AdminIncidentsTab';
import AdminContractualStaffTab from './admin/AdminContractualStaffTab';
import AdminFlightCareFamilyTab from './admin/AdminFlightCareFamilyTab';
import { isFlightCareFamilyMember, isFieldProtocolOfficer } from '../services/flightCareFamilyService';
import {
  exportFullSystemBackup,
  exportBookingsToCsv,
  exportStaffRosterToCsv,
  exportPaymentsToCsv,
  validateAndInspectBackup,
  executeRestoreOperation,
  triggerFileDownload,
} from '../services/dataBackupService';
import {
  saveBookingToFirestore,
  updateBookingInFirestore,
  saveAirportToFirestore,
  saveStaffToFirestore,
  listenToCloudBookings,
} from '../services/firebaseSyncService';
import { compressImage } from '../utils/imageCompressor';
import DualVaultPinModal from '../components/DualVaultPinModal';
import {
  isMasterVaultUnlocked,
  getShowcaseBookingIds,
  setShowcaseBookingIds,
  toggleBookingShowcaseStatus,
  filterBookingsByVaultMode,
  exportDualVaultBookingsCsv,
  lockMasterVault,
  registerVaultTriggerClick,
} from '../services/dualVaultService';




export const PROTOCOL_STAFF_ROLES = [
  'CEO',
  'HR Head',
  'IT Head',
  'Senior Front Desk Officer',
  'Deputy Shift In-Charge',
  'Senior Protocol Officer',
  'Protocol Officer',
  'Senior Greeter',
  'VIP Escort Officer',
  'Operations Lead',
  'Wheelchair Escort',
  'Customs Assistant',
  'Arrival Concierge',
  'Luggage Protocol Lead',
  'Medical Protocol Escort',
];

export const PROTOCOL_STAFF_SHIFTS = [
  '06:00 AM - 02:00 PM',
  '08:00 AM - 04:00 PM',
  '10:00 AM - 06:00 PM',
  '02:00 PM - 10:00 PM',
  '10:00 PM - 06:00 AM',
];

export const AIRPORT_QUICK_PRESETS = [
  {
    code: 'CXB',
    nameEn: "Cox's Bazar International Airport",
    nameBn: 'কক্সবাজার আন্তর্জাতিক বিমানবন্দর',
    shortEn: "Cox's Bazar · CXB",
    shortBn: 'কক্সবাজার · CXB',
    city: "Cox's Bazar",
    country: 'Bangladesh',
    location: "Nunia Chhata, Cox's Bazar-4700",
    terminals: 'New International & Domestic Terminal',
    services: ['bb2car', 'imm2car', 'gate2bb', 'gate2imm', 'wheel', 'pickup', 'wrap', 'fast_track'],
  },
  {
    code: 'SPD',
    nameEn: 'Saidpur Airport',
    nameBn: 'সৈয়দপুর বিমানবন্দর',
    shortEn: 'Saidpur · SPD',
    shortBn: 'সৈয়দপুর · SPD',
    city: 'Saidpur',
    country: 'Bangladesh',
    location: 'Saidpur, Nilphamari-5310',
    terminals: 'Domestic Terminal',
    services: ['wheel', 'pickup', 'wrap'],
  },
  {
    code: 'JSR',
    nameEn: 'Jashore Airport',
    nameBn: 'যশোর বিমানবন্দর',
    shortEn: 'Jashore · JSR',
    shortBn: 'যশোর · JSR',
    city: 'Jashore',
    country: 'Bangladesh',
    location: 'Airport Road, Jashore-7400',
    terminals: 'Domestic Terminal',
    services: ['wheel', 'pickup', 'wrap'],
  },
  {
    code: 'RJH',
    nameEn: 'Shah Makhdum Airport',
    nameBn: 'শাহ মখদুম বিমানবন্দর (রাজশাহী)',
    shortEn: 'Rajshahi · RJH',
    shortBn: 'রাজশাহী · RJH',
    city: 'Rajshahi',
    country: 'Bangladesh',
    location: 'Nowhata, Rajshahi-6200',
    terminals: 'Domestic Passenger Terminal',
    services: ['wheel', 'pickup', 'wrap'],
  },
  {
    code: 'DXB',
    nameEn: 'Dubai International Airport',
    nameBn: 'দুবাই আন্তর্জাতিক বিমানবন্দর',
    shortEn: 'Dubai · DXB',
    shortBn: 'দুবাই · DXB',
    city: 'Dubai',
    country: 'United Arab Emirates',
    location: 'Al Garhoud, Dubai, United Arab Emirates',
    terminals: 'Terminal 1, 2, 3 & Concourse A-D',
    services: ['bb2car', 'imm2car', 'gate2bb', 'gate2imm', 'wheel', 'medical', 'wrap', 'pickup', 'vip_lounge', 'fast_track', 'print_docs'],
  },
  {
    code: 'JED',
    nameEn: 'King Abdulaziz International Airport',
    nameBn: 'কিং আব্দুল আজিজ আন্তর্জাতিক বিমানবন্দর (জেদ্দা)',
    shortEn: 'Jeddah · JED',
    shortBn: 'জেদ্দা · JED',
    city: 'Jeddah',
    country: 'Saudi Arabia',
    location: 'Al Madinah Al Munawwarah Rd, Jeddah, Saudi Arabia',
    terminals: 'Terminal 1, North Terminal, Hajj Terminal',
    services: ['bb2car', 'imm2car', 'gate2bb', 'gate2imm', 'wheel', 'medical', 'wrap', 'pickup', 'vip_lounge', 'fast_track'],
  },
  {
    code: 'DOH',
    nameEn: 'Hamad International Airport',
    nameBn: 'হামাদ আন্তর্জাতিক বিমানবন্দর (দোহা)',
    shortEn: 'Doha · DOH',
    shortBn: 'দোহা · DOH',
    city: 'Doha',
    country: 'Qatar',
    location: 'Hamad International Airport, Doha, Qatar',
    terminals: 'Passenger Terminal Complex & Concourses A-E',
    services: ['bb2car', 'imm2car', 'gate2bb', 'gate2imm', 'wheel', 'medical', 'wrap', 'pickup', 'vip_lounge', 'fast_track', 'print_docs'],
  },
  {
    code: 'KUL',
    nameEn: 'Kuala Lumpur International Airport',
    nameBn: 'কুয়ালালামপুর আন্তর্জাতিক বিমানবন্দর',
    shortEn: 'KLIA · KUL',
    shortBn: 'কেএলআইএ · KUL',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    location: 'Sepang, 64000 Selangor, Malaysia',
    terminals: 'KLIA Main Terminal & KLIA2',
    services: ['bb2car', 'imm2car', 'gate2bb', 'gate2imm', 'wheel', 'wrap', 'pickup', 'fast_track'],
  },
  {
    code: 'SIN',
    nameEn: 'Singapore Changi Airport',
    nameBn: 'সিঙ্গাপুর চাঙ্গি আন্তর্জাতিক বিমানবন্দর',
    shortEn: 'Changi · SIN',
    shortBn: 'চাঙ্গি · SIN',
    city: 'Singapore',
    country: 'Singapore',
    location: 'Airport Boulevard, Singapore 819663',
    terminals: 'Terminal 1, 2, 3, 4 & Jewel',
    services: ['bb2car', 'imm2car', 'gate2bb', 'gate2imm', 'wheel', 'medical', 'wrap', 'pickup', 'vip_lounge', 'fast_track', 'print_docs'],
  },
  {
    code: 'LHR',
    nameEn: 'London Heathrow Airport',
    nameBn: 'লন্ডন হিথ্রো বিমানবন্দর',
    shortEn: 'Heathrow · LHR',
    shortBn: 'হিথ্রো · LHR',
    city: 'London',
    country: 'United Kingdom',
    location: 'Longford, Hounslow TW6, United Kingdom',
    terminals: 'Terminal 2, 3, 4, 5',
    services: ['bb2car', 'imm2car', 'gate2bb', 'gate2imm', 'wheel', 'medical', 'wrap', 'pickup', 'vip_lounge', 'fast_track'],
  },
];

export const POPULAR_COUNTRIES = [
  { name: 'Bangladesh', flag: '🇧🇩' },
  { name: 'United Arab Emirates', flag: '🇦🇪' },
  { name: 'Saudi Arabia', flag: '🇸🇦' },
  { name: 'Qatar', flag: '🇶🇦' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Malaysia', flag: '🇲🇾' },
  { name: 'Singapore', flag: '🇸🇬' },
  { name: 'India', flag: '🇮🇳' },
  { name: 'Thailand', flag: '🇹🇭' },
  { name: 'United States', flag: '🇺🇸' },
];

export const SERVICE_CATEGORY_GROUPS = [
  { id: 'meet_greet', nameEn: 'Meet & Greet', nameBn: 'প্রোটোকল ও অভ্যর্থনা', icon: '🤝', color: '#0284C7', bg: '#E0F2FE' },
  { id: 'fast_track', nameEn: 'Fast Track Clearance', nameBn: 'ফাস্ট-ট্র্যাক ক্লিয়ারেন্স', icon: '⚡', color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'vip_lounge', nameEn: 'VIP & CIP Lounge', nameBn: 'ভিআইপি ও সিআইপি লাউঞ্জ', icon: '🛋️', color: '#D97706', bg: '#FEF3C7' },
  { id: 'special_care', nameEn: 'Special Assistance', nameBn: 'বিশেষ সহায়তা ও কেয়ার', icon: '♿', color: '#059669', bg: '#D1FAE5' },
  { id: 'baggage_porter', nameEn: 'Baggage & Porter', nameBn: 'লাগেজ ও পোর্টার সেবা', icon: '🧳', color: '#DC2626', bg: '#FEE2E2' },
  { id: 'transit_transfer', nameEn: 'Transit & Transfer', nameBn: 'ট্রানজিট ও স্থানান্তর', icon: '🔄', color: '#2563EB', bg: '#DBEAFE' },
  { id: 'transport', nameEn: 'Airport Transport', nameBn: 'বিমানবন্দর পরিবহন', icon: '🚗', color: '#4F46E5', bg: '#EEF2FF' },
];

export const SERVICE_EMOJI_PALETTE = [
  '🤝', '⚡', '🛋️', '♿', '🧳', '🔄', '🚗', '👶', '👴', '🩺', '🛬', '🛫', '🛂', '🛃', '⭐', '💎',
];

export const SERVICE_QUICK_PRESETS = [
  {
    id: 'fast_track_vip',
    cat: 'arr',
    serviceCategory: 'fast_track',
    ic: '⚡',
    n: ['VIP Fast Track Clearance', 'ভিআইপি ফাস্ট-ট্র্যাক ক্লিয়ারেন্স'],
    d: [
      'Dedicated protocol escort for accelerated fast-track immigration, customs clearance, and priority baggage handling.',
      'দ্রুতগতির বিশেষ ফাস্ট-ট্র্যাক ইমিগ্রেশন, কাস্টমস ও প্রায়োরিটি লাগেজ সংগ্রহের জন্য ডেডিকেটেড এসকর্ট সুবিধা।',
    ],
    s: [
      ['Meet at arrival boarding bridge', 'বোর্ডিং ব্রিজে তাৎক্ষণিক অভ্যর্থনা'],
      ['Priority fast-track immigration queue', 'ভিআইপি ফাস্ট-ট্র্যাক ইমিগ্রেশন লাইন'],
      ['Expedited luggage pickup', 'দ্রুত লাগেজ সংগ্রহ ও খালাস'],
      ['Priority customs escort to car', 'কাস্টমস ক্লিয়ারেন্স শেষে গাড়ি পর্যন্ত এসকর্ট'],
    ],
    active: true,
    availability: { airports: ['ALL'], hours: '24/7', leadTime: 'Instant', terminals: ['ALL'] },
  },
  {
    id: 'cip_lounge_access',
    cat: 'dep',
    serviceCategory: 'vip_lounge',
    ic: '🛋️',
    n: ['Executive CIP Lounge Access', 'এক্সিকিউটিভ সিআইপি লাউঞ্জ সুবিধা'],
    d: [
      'Relax in premium comfort before departure with complimentary buffet dining, high-speed WiFi, shower suites, and flight boarding reminders.',
      'ফ্লাইটের আগে বিলাসবহুল পরিবেশে আরাম, সুস্বাদু বুফে খাবার, দ্রুতগতির ওয়াইফাই, শাওয়ার সুবিধা ও বোর্ডিং নোটিফিকেশন।',
    ],
    s: [
      ['Lounge reception check-in', 'লাউঞ্জ রিসেপশনে ভিআইপি চেক-ইন'],
      ['Access to gourmet buffet & refreshments', 'আনলিমিটেড বুফে ও রিফ্রেশমেন্ট'],
      ['Quiet working & relaxation zone', 'শান্ত কাজের ও বিশ্রামের পরিবেশ'],
      ['Direct boarding call escort', 'ফ্লাইট বোর্ডিংয়ের সরাসরি ঘোষণা ও গেটে এসকর্ট'],
    ],
    active: true,
    availability: { airports: ['ALL'], hours: '24/7', leadTime: 'Instant', terminals: ['T1', 'T2'] },
  },
  {
    id: 'transit_transfer_care',
    cat: 'transit',
    serviceCategory: 'transit_transfer',
    ic: '🔄',
    n: ['Transit & Layover Connection', 'ট্রানজিট ও কানেক্টিং ফ্লাইট সহায়তা'],
    d: [
      'Seamless gate-to-gate escort during connecting flights, inter-terminal transfers, security transit checkpoints, and re-check-in.',
      'কানেক্টিং ফ্লাইটের সময় গেট-টু-গেট এসকর্ট, টার্মিনাল পরিবর্তন, ট্রানজিট সিকিউরিটি ও লাগেজ রি-চেক-ইন পূর্ণ সহায়তা।',
    ],
    s: [
      ['Meet at incoming gate', 'আগমনের গেটে সরাসরি সাক্ষাৎ'],
      ['Inter-terminal transport guidance', 'টার্মিনাল পরিবর্তনে সরাসরি সহায়তা'],
      ['Transit security fast-track', 'ট্রানজিট সিকিউরিটি দ্রুত পারাপার'],
      ['Escort to connecting departure gate', 'পরবর্তী ফ্লাইটের বোর্ডিং গেটে পৌঁছে দেওয়া'],
    ],
    active: true,
    availability: { airports: ['ALL'], hours: '24/7', leadTime: '3 Hours', terminals: ['ALL'] },
  },
  {
    id: 'unaccompanied_minor_care',
    cat: 'dep',
    serviceCategory: 'special_care',
    ic: '👶',
    n: ['Unaccompanied Minor Protocol', 'একাকী ভ্রমণকারী শিশুর বিশেষ প্রোটোকল'],
    d: [
      'Dedicated 1-on-1 protective supervision and care for solo-traveling children from airline check-in to aircraft seat or arrival handoff.',
      'একা ভ্রমণকারী শিশুর জন্য চেক-ইন থেকে বিমানের আসন কিংবা অভিভাবকের হাতে হস্তান্তর পর্যন্ত সার্বক্ষণিক ১-টু-১ কেয়ার।',
    ],
    s: [
      ['Handover from legal guardian', 'অভিভাবকের কাছ থেকে আনুষ্ঠানিক দায়িত্ব গ্রহণ'],
      ['Full immigration & security accompaniment', 'ইমিগ্রেশন ও সিকিউরিটিতে সার্বক্ষণিক সাথে থাকা'],
      ['Comfort, entertainment & snack care', 'বিশ্রাম ও হালকা খাবারের তদারকি'],
      ['Safe handoff to airline crew or receiver', 'এয়ারলাইন্স ক্রু বা নির্ধারিত প্রাপকের কাছে নিরাপদ হস্তান্তর'],
    ],
    active: true,
    availability: { airports: ['ALL'], hours: '24/7', leadTime: '12 Hours', terminals: ['ALL'] },
  },
  {
    id: 'senior_wheelchair_care',
    cat: 'arr',
    serviceCategory: 'special_care',
    ic: '👴',
    n: ['Senior Citizen Protocol & Care', 'প্রবীণ নাগরিক বিশেষ যত্ন ও প্রোটোকল'],
    d: [
      'Compassionate, patient assistance for elderly passengers with wheelchair, buggy rides, medication reminders, and slow-paced guidance.',
      'বয়োজ্যেষ্ঠ যাত্রীদের জন্য বিশেষ সহানুভূতিশীল সহায়তা, হুইলচেয়ার ও বাগি কার ব্যবস্থা, ওষুধ গ্রহণে সহায়তা ও ধীরস্থির এসকর্ট।',
    ],
    s: [
      ['Meet with wheelchair / buggy', 'হুইলচেয়ার বা বাগি নিয়ে গেটে অপেক্ষা'],
      ['Gentle guidance through all counters', 'সকল কাউন্টারে ধীরস্থিরে অগ্রাধিকার সহায়তা'],
      ['Comfortable rest stops', 'প্রয়োজনে বিশ্রাম নেওয়ার ব্যবস্থা'],
      ['Safely seat in vehicle or aircraft', 'গাড়ি কিংবা বিমানে নিরাপদে বসিয়ে দেওয়া'],
    ],
    active: true,
    availability: { airports: ['ALL'], hours: '24/7', leadTime: 'Instant', terminals: ['ALL'] },
  },
  {
    id: 'porter_buggy_service',
    cat: 'arr',
    serviceCategory: 'baggage_porter',
    ic: '🧳',
    n: ['Porter & Airport Buggy Service', 'লাগেজ পোর্টার ও এয়ারপোর্ট বাগি সার্ভিস'],
    d: [
      'Heavy luggage handling by dedicated uniform porter and electric buggy ride through the long airport corridors.',
      'এয়ারপোর্টের দীর্ঘ করিডোরে ইলেকট্রিক বাগি রাইড এবং একাধিক ভারী লাগেজ বহনে ডেডিকেটেড ইউনিফর্ম পরিহিত পোর্টার সেবা।',
    ],
    s: [
      ['Meet with buggy cart', 'ইলেকট্রিক বাগি কার নিয়ে আগমন গেটে অপেক্ষা'],
      ['Buggy ride to immigration / baggage', 'বাগিতে করে ইমিগ্রেশন ও বেল্টে দ্রুত যাতায়াত'],
      ['Complete luggage collection & carrying', 'লাগেজ সংগ্রহ ও ট্রলিতে বহনে সহায়তা'],
      ['Load luggage into passenger vehicle', 'যাত্রীর গাড়িতে লাগেজ নিরাপদে তুলে দেওয়া'],
    ],
    active: true,
    availability: { airports: ['ALL'], hours: '06:00 - 22:00', leadTime: 'Instant', terminals: ['ALL'] },
  },
  {
    id: 'luxury_chauffeur_transfer',
    cat: 'dep',
    serviceCategory: 'transport',
    ic: '🚗',
    n: ['Luxury Airport Chauffeur', 'লাক্সারি এয়ারপোর্ট কার ট্রান্সফার'],
    d: [
      'Premium private chauffeur transfer directly to airport departure terminal or from arrival gate to city destination.',
      'প্রিমিয়াম এয়ার-কন্ডিশন্ড গাড়িতে বিমানবন্দর টার্মিনাল ড্রপ-অফ অথবা আগমন শেষে গন্তব্যে সরাসরি ভিআইপি ট্রান্সফার।',
    ],
    s: [
      ['Pre-scheduled vehicle arrival', 'নির্ধারিত সময় গাড়িতে প্রস্তুত থাকা'],
      ['Luggage loading assistance', 'লাগেজ সাবধানে ওঠানো ও নামানো'],
      ['Comfortable highway transit', 'আরামদায়ক ও ট্রাফিক-অপ্টিমাইজড রাইড'],
      ['Curbside meet & protocol handover', 'টার্মিনাল গেটে প্রোটোকল টিমের হাতে তুলে দেওয়া'],
    ],
    active: true,
    availability: { airports: ['ALL'], hours: '24/7', leadTime: '6 Hours', terminals: ['ALL'] },
  },
  {
    id: 'emergency_medical_protocol',
    cat: 'arr',
    serviceCategory: 'special_care',
    ic: '🩺',
    n: ['Emergency Medical Assistance', 'জরুরি মেডিকেল ও অ্যাম্বুলেন্স সেবা'],
    d: [
      'Rapid medical coordination for injured or ailing passengers with paramedic team, tarmac ambulance access, and hospital liaison.',
      'অসুস্থ বা জরুরি চিকিৎসাপ্রত্যাশী যাত্রীদের জন্য প্যারামেডিক দল, টারমাক অ্যাম্বুলেন্স ও হাসপাতালে তাৎক্ষণিক ভর্তি সমন্বয়।',
    ],
    s: [
      ['Airside tarmac medical reception', 'টারমাক এয়ারসাইডে চিকিৎসক দলের অপেক্ষা'],
      ['Vitals check & immediate stabilization', 'প্রাথমিক পরীক্ষা ও চিকিৎসা নিশ্চিতকরণ'],
      ['Expedited customs & immigration clearance', 'জরুরি ভিত্তিতে বিশেষ ক্লিয়ারেন্স সম্পন্নকরণ'],
      ['Direct ambulance dispatch to hospital', 'বিশেষায়িত হাসপাতালে দ্রুত অ্যাম্বুলেন্স প্রেরণ'],
    ],
    active: true,
    availability: { airports: ['ALL'], hours: '24/7', leadTime: 'Instant', terminals: ['ALL'] },
  },
];

export const getAirportDisplayName = (airport, langIdx) => {
  if (!airport) return '';
  const isBn = langIdx === 1 || langIdx === 'bn';
  if (Array.isArray(airport.shortName)) {
    return airport.shortName[isBn ? 1 : 0] || airport.shortName[0] || '';
  }
  if (Array.isArray(airport.name)) {
    return airport.name[isBn ? 1 : 0] || airport.name[0] || '';
  }
  if (isBn) {
    return airport.shortBn || airport.nameBn || airport.shortEn || airport.nameEn || airport.name || airport.code || '';
  }
  return airport.shortEn || airport.nameEn || airport.shortBn || airport.nameBn || airport.name || airport.code || '';
};

export default function ManagerPanel({
  pagePadding,
  lang,
  t,
  responsive,
  bookings = [],
  managerSession,
  setManagerSession,
  managerEmail,
  setManagerEmail,
  managerPassword,
  setManagerPassword,
  managerLoginError,
  managerBusy,
  managerSection,
  setManagerSection,
  managerWorkflow = [],
  managerWorkflowLoading = false,
  managerWorkflowSaving = false,
  managerWorkflowError = '',
  managerWorkflowNotice = '',
  managerServices = [],
  managerServicesAirport = 'DAC',
  managerServicesLoading = false,
  managerServicesSaving = false,
  managerServicesError = '',
  managerServicesNotice = '',
  managerAddons = [],
  managerAddonsAirport = 'DAC',
  managerAddonsLoading = false,
  managerAddonsSaving = false,
  managerAddonsError = '',
  managerAddonsNotice = '',
  managerStaffingRules = [],
  managerRulesLoading = false,
  managerRulesSaving = false,
  managerRulesError = '',
  managerRulesNotice = '',
  managerPayments = [],
  managerPaymentsSummary = null,
  managerPaymentsLoading = false,
  managerPaymentsError = '',
  setManagerPaymentsError = () => {},
  managerPaymentsNotice,
  managerPaymentFilter,
  setManagerPaymentFilter,
  managerPaymentSearch,
  setManagerPaymentSearch,
  refundPaymentId,
  setRefundPaymentId,
  refundAmount,
  setRefundAmount,
  refundReason,
  setRefundReason,
  refundSaving,
  managerApiConfigured,
  submitManagerLogin,
  loadManagerServices,
  updateManagerService,
  updateManagerServiceText,
  updateManagerServiceStep,
  addManagerService,
  addManagerServiceStep,
  removeManagerServiceStep,
  removeManagerService,
  saveManagerServiceCatalog,
  loadManagerAddons,
  updateManagerAddon,
  updateManagerAddonText,
  updateManagerAddonVehiclePrice,
  toggleManagerAddonVehicle,
  toggleManagerMedicalOption,
  saveManagerAddonCatalog,
  loadManagerPayments,
  submitManagerRefund,
  updateManagerWorkflowStage,
  updateManagerWorkflowLabel,
  addManagerWorkflowStage,
  removeManagerWorkflowStage,
  moveManagerWorkflowStage,
  saveManagerWorkflow,
  updateManagerRule,
  addManagerRule,
  removeManagerRule,
  saveManagerRules,
  openManagerSection,
  handleBack,
  managedAirports = [],
  setManagedAirports,
  addAirport,
  updateAirport,
  deleteAirport,
  toggleAirportStatus,
  resetAirports,
  setManagerServices,
  serviceCatalog,
  setServiceCatalog,
  addManagerServiceFull,
  updateManagerServiceFull,
  deleteManagerServiceFull,
  toggleManagerServiceStatus,
  resetManagerServicesToDefault,
  pricingConfig = DEFAULT_PRICING_CONFIG,
  setPricingConfig,
  updatePricingConfig,
  resetPricingConfig,
  onUpdateBooking,
  setBookings,
  notifications = [],
  setNotifications,
  sendNotification,
  customerPaymentHistory = [],
  setCustomerPaymentHistory,
  staffRoster: parentStaffRoster,
  setStaffRoster: parentSetStaffRoster,
  onAddStaff,
  onUpdateStaff,
  onToggleStaffDuty,
  onToggleStaffActive,
  onDeleteStaff,
}) {
  const [showManagerPassword, setShowManagerPassword] = useState(false);

  const isAdmin = managerSession?.user?.role === 'admin';
  const isManager = managerSession?.user?.role === 'manager';

  const renderManagerLoginForm = () => (
    <ScrollView
      style={{ flex: 1, width: '100%' }}
      contentContainerStyle={{ padding: pagePadding, flexGrow: 1 }}
    >
      <TouchableOpacity
        style={s.screenBackButton}
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        onPress={handleBack}
      >
        <Text style={s.screenBackText}>{t('back')}</Text>
      </TouchableOpacity>
      <View style={{ alignItems: 'center', marginVertical: 16 }}>
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 12 }}
        />
        <Text style={[s.h2, { marginBottom: 4, textAlign: 'center' }]}>
          {lang ? 'অ্যাডমিনিস্ট্রেটিভ ও ম্যানেজমেন্ট পোর্টাল' : 'Administrative & Management Portal'}
        </Text>
        <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
          {lang ? 'ফ্লাইট কেয়ার সুপার এডমিন এবং অপারেশনাল ম্যানেজার লগইন' : 'Flight Care Super Admin & Operational Manager Portal'}
        </Text>
      </View>

      {/* Secure Authentication Notice */}
      <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, marginTop: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 20 }}>🔐</Text>
        <Text style={{ color: '#475569', fontSize: 12.5, lineHeight: 18, flex: 1 }}>
          {lang
            ? 'এটি একটি সুরক্ষিত প্রশাসনিক প্যানেল। অননুমোদিত প্রবেশ সম্পূর্ণ নিষিদ্ধ। সঠিক ইমেইল বা মোবাইল নম্বর এবং পাসওয়ার্ড প্রদান করে প্রবেশ করুন।'
            : 'Restricted administrative system. Unauthorized access prohibited. Authenticate with verified email or mobile number and password.'}
        </Text>
      </View>

      <TextInput
        style={[s.in, { marginTop: 6 }]}
        placeholder={lang ? 'অফিসিয়াল ইমেইল বা মোবাইল নম্বর (যেমন: 01347570013)' : 'Official Email or Mobile Number (e.g. 01347570013)'}
        value={managerEmail}
        onChangeText={setManagerEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <View style={{ position: 'relative', width: '100%' }}>
        <TextInput
          style={[s.in, { paddingRight: 45 }]}
          placeholder="Password"
          value={managerPassword}
          onChangeText={setManagerPassword}
          secureTextEntry={!showManagerPassword}
        />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowManagerPassword(prev => !prev)}
          style={{
            position: 'absolute',
            right: 12,
            top: 13,
            padding: 4,
            zIndex: 10,
          }}
          accessibilityLabel={showManagerPassword ? 'Hide password' : 'Show password'}
        >
          <Text style={{ fontSize: 16 }}>{showManagerPassword ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>
      </View>
      {managerLoginError ? (
        <Text style={s.managerError}>{managerLoginError}</Text>
      ) : null}
      <TouchableOpacity
        style={[s.btn, managerBusy && s.managerDisabled, { marginTop: 10 }]}
        disabled={managerBusy}
        onPress={submitManagerLogin}
      >
        <Text style={s.btnT}>{managerBusy ? '…' : (lang ? 'লগইন করুন' : 'Sign In')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Security & Audit Center State
  const [securityLogs, setSecurityLogs] = useState([]);
  const [securityLogsLoading, setSecurityLogsLoading] = useState(false);
  const [securityActiveTab, setSecurityActiveTab] = useState('audit'); // 'audit' | 'rbac' | 'policies' | 'tester'
  const [securitySeverityFilter, setSecuritySeverityFilter] = useState('ALL'); // 'ALL' | 'INFO' | 'WARNING' | 'CRITICAL'
  const [securityActionFilter, setSecurityActionFilter] = useState('ALL'); // 'ALL' | 'AUTH' | 'STAFF' | 'AIRPORT' | 'PRICING' | 'PAYMENT'
  const [securitySearchQuery, setSecuritySearchQuery] = useState('');
  const [securityNotice, setSecurityNotice] = useState('');
  const [securityAccountInput, setSecurityAccountInput] = useState('');
  const [securityAccountResult, setSecurityAccountResult] = useState(null);
  const [securityPasswordTest, setSecurityPasswordTest] = useState('');
  const [securityPinTest, setSecurityPinTest] = useState('');
  const [securitySanitizeInput, setSecuritySanitizeInput] = useState('<script>alert("hack")</script><b>VIP Client</b>');

  // Live Protocol Officer & Passenger Tracking Radar State
  const [managerTrackingBooking, setManagerTrackingBooking] = useState(null);
  const [trackingAirportFilter, setTrackingAirportFilter] = useState('ALL');
  const [trackingSearchQuery, setTrackingSearchQuery] = useState('');
  const [trackingRefreshTick, setTrackingRefreshTick] = useState(0);
  const [trackingActionNotice, setTrackingActionNotice] = useState('');
  const [managerGoogleMapsApiKeyInput, setManagerGoogleMapsApiKeyInput] = useState('');

  useEffect(() => {
    getGoogleMapsApiKey().then(k => {
      if (k) setManagerGoogleMapsApiKeyInput(k);
    });
  }, []);

  const [googleMapsKeyStatus, setGoogleMapsKeyStatus] = useState('');

  const handleSaveGoogleMapsApiKey = async () => {
    if (managerGoogleMapsApiKeyInput.trim()) {
      await setGoogleMapsApiKey(managerGoogleMapsApiKeyInput.trim());
      setGoogleMapsKeyStatus(lang ? 'গুগল ম্যাপস কী সংরক্ষিত হয়েছে' : 'Google Maps API Key saved');
      setTimeout(() => setGoogleMapsKeyStatus(''), 3000);
    }
  };



  const loadSecurityLogs = async () => {
    setSecurityLogsLoading(true);
    try {
      const logs = await getSecurityAuditLogs();
      setSecurityLogs(logs);
    } catch {
      setSecurityLogs([]);
    } finally {
      setSecurityLogsLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityLogs();
  }, []);

  // Payment Reconciliation & Webhook State (Requirements 2 & 4)
  const [paymentSubTab, setPaymentSubTab] = useState('transactions'); // 'transactions' | 'reconciliation' | 'webhooks'
  const [reconciliationDateFilter, setReconciliationDateFilter] = useState('all');
  const [webhookLogsList, setWebhookLogsList] = useState([]);
  const [webhookLogsLoading, setWebhookLogsLoading] = useState(false);
  const [reconciliationNotice, setReconciliationNotice] = useState('');

  const loadWebhookLogs = async () => {
    setWebhookLogsLoading(true);
    try {
      const logs = await getBkashWebhookLogs();
      setWebhookLogsList(logs);
    } catch {
      setWebhookLogsList([]);
    } finally {
      setWebhookLogsLoading(false);
    }
  };

  const handleSimulateWebhook = async (bookingId, amount, channel = 'banglaqr') => {
    try {
      const result = channel === 'sslcommerz'
        ? await simulateIncomingSslCommerzIpn(bookingId, amount)
        : channel === 'card'
        ? await simulateIncomingCardIpn(bookingId, amount, 'Visa')
        : await simulateIncomingBkashIpn(bookingId, amount);
      if (result.ok) {
        setReconciliationNotice(
          lang
            ? `টেস্ট আইপিএন সফল: বুকিং #${bookingId}-এর ${channel === 'sslcommerz' ? 'এসএসএল কমার্জ' : channel === 'card' ? 'ব্যাংক কার্ড' : 'বাংলা কিউআর'} পেমেন্ট নোটিফিকেশন সার্ভারে গৃহীত হয়েছে (TrxID: ${result.data?.trxId})`
            : `Test IPN Delivered: Booking #${bookingId} ${channel === 'sslcommerz' ? 'SSLCOMMERZ' : channel === 'card' ? 'Bank Card' : 'Bangla QR'} payment received by server (TrxID: ${result.data?.trxId})`
        );
        await loadWebhookLogs();
        setTimeout(() => setReconciliationNotice(''), 4000);
      }
    } catch {
      setReconciliationNotice(lang ? 'টেস্ট আইপিএন পাঠাতে সমস্যা হয়েছে।' : 'Failed to deliver test IPN.');
    }
  };

  const handlePurgeExpiredSessions = () => {
    const result = cleanExpiredPaymentSessions(allPlatformBookings);
    setAllPlatformBookings(result.updatedBookings);
    setReconciliationNotice(
      lang
        ? `${result.expiredCount} টি মেয়াদোত্তীর্ণ বুকিং পেমেন্ট সেশন বাতিল করা হয়েছে।`
        : `Purged & cancelled ${result.expiredCount} expired payment sessions (>15 min).`
    );
    setTimeout(() => setReconciliationNotice(''), 4000);
  };

  // Airport Management State
  const [localAirports, setLocalAirports] = useState(DEFAULT_MANAGED_AIRPORTS);
  const [airportSearch, setAirportSearch] = useState('');
  const [airportFilter, setAirportFilter] = useState('all'); // 'all' | 'active' | 'maintenance' | 'inactive'
  const [airportFormOpen, setAirportFormOpen] = useState(false);
  const [editingAirportId, setEditingAirportId] = useState(null);
  const [formAirportCode, setFormAirportCode] = useState('');
  const [formAirportNameEn, setFormAirportNameEn] = useState('');
  const [formAirportNameBn, setFormAirportNameBn] = useState('');
  const [formAirportShortEn, setFormAirportShortEn] = useState('');
  const [formAirportShortBn, setFormAirportShortBn] = useState('');
  const [formAirportLocation, setFormAirportLocation] = useState('');
  const [formAirportCity, setFormAirportCity] = useState('');
  const [formAirportCountry, setFormAirportCountry] = useState('Bangladesh');
  const [formAirportTerminals, setFormAirportTerminals] = useState('');
  const [formAirportStatus, setFormAirportStatus] = useState('active');
  const [formAirportServices, setFormAirportServices] = useState([
    'bb2car', 'imm2car', 'gate2bb', 'gate2imm', 'wheel', 'medical', 'wrap', 'pickup',
  ]);
  const [airportFormError, setAirportFormError] = useState('');
  const [airportFormNotice, setAirportFormNotice] = useState('');

  const handleOpenAddAirport = () => {
    setEditingAirportId(null);
    setFormAirportCode('');
    setFormAirportNameEn('');
    setFormAirportNameBn('');
    setFormAirportShortEn('');
    setFormAirportShortBn('');
    setFormAirportLocation('');
    setFormAirportCity('');
    setFormAirportCountry('Bangladesh');
    setFormAirportTerminals('');
    setFormAirportStatus('active');
    setFormAirportServices(['bb2car', 'imm2car', 'gate2bb', 'gate2imm', 'wheel', 'medical', 'wrap', 'pickup']);
    setAirportFormError('');
    setAirportFormNotice('');
    setAirportFormOpen(true);
  };

  const handleOpenEditAirport = (item) => {
    setEditingAirportId(item.id);
    setFormAirportCode(item.code || '');
    setFormAirportNameEn(Array.isArray(item.name) ? item.name[0] : (item.name || ''));
    setFormAirportNameBn(Array.isArray(item.name) ? (item.name[1] || '') : '');
    setFormAirportShortEn(item.shortName ? item.shortName[0] : '');
    setFormAirportShortBn(item.shortName ? (item.shortName[1] || '') : '');
    setFormAirportLocation(item.location || '');
    setFormAirportCity(item.city || '');
    setFormAirportCountry(item.country || 'Bangladesh');
    setFormAirportTerminals(item.terminals || '');
    setFormAirportStatus(item.status || 'active');
    setFormAirportServices(Array.isArray(item.availableServices) ? item.availableServices : []);
    setAirportFormError('');
    setAirportFormNotice('');
    setAirportFormOpen(true);
  };

  const handleApplyPreset = (preset) => {
    setFormAirportCode(preset.code);
    setFormAirportNameEn(preset.nameEn);
    setFormAirportNameBn(preset.nameBn);
    setFormAirportShortEn(preset.shortEn);
    setFormAirportShortBn(preset.shortBn);
    setFormAirportCity(preset.city);
    setFormAirportCountry(preset.country);
    setFormAirportLocation(preset.location);
    setFormAirportTerminals(preset.terminals);
    setFormAirportStatus('active');
    setFormAirportServices(preset.services || ['bb2car', 'imm2car', 'gate2bb', 'gate2imm', 'wheel', 'wrap', 'pickup']);
    setAirportFormError('');
  };

  const handleToggleAirportService = (serviceId) => {
    setFormAirportServices(current =>
      current.includes(serviceId)
        ? current.filter(id => id !== serviceId)
        : [...current, serviceId]
    );
  };

  const handleSaveAirport = () => {
    const code = formAirportCode.trim().toUpperCase();
    const nameEn = formAirportNameEn.trim();
    const nameBn = formAirportNameBn.trim();
    const city = formAirportCity.trim();
    const location = formAirportLocation.trim();
    const country = formAirportCountry.trim() || 'Bangladesh';

    if (!code) {
      setAirportFormError(lang ? 'অনুগ্রহ করে বিমানবন্দর কোড (যেমন DAC, CGP) দিন।' : 'Please enter airport code (e.g. DAC, CGP).');
      return;
    }
    if (!nameEn && !nameBn) {
      setAirportFormError(lang ? 'অনুগ্রহ করে বিমানবন্দরের নাম দিন।' : 'Please enter airport name.');
      return;
    }
    if (!city) {
      setAirportFormError(lang ? 'অনুগ্রহ করে শহরের নাম দিন।' : 'Please enter city name.');
      return;
    }
    if (!location) {
      setAirportFormError(lang ? 'অনুগ্রহ করে বিমানবন্দরের লোকেশন বা ঠিকানা দিন।' : 'Please enter airport location or terminal address.');
      return;
    }

    const shortEn = formAirportShortEn.trim() || `${city} · ${code}`;
    const shortBn = formAirportShortBn.trim() || `${city} · ${code}`;

    const airportPayload = {
      id: editingAirportId || `air-${code.toLowerCase()}-${Date.now().toString(36)}`,
      code,
      name: [nameEn || nameBn, nameBn || nameEn],
      shortName: [shortEn, shortBn],
      location,
      city,
      country,
      terminals: formAirportTerminals.trim() || 'Main Terminal',
      status: formAirportStatus,
      availableServices: formAirportServices,
      updatedAt: new Date().toISOString(),
    };

    if (editingAirportId) {
      if (updateAirport) {
        updateAirport(airportPayload);
      }
      setLocalAirports(prev => prev.map(a => a.id === editingAirportId ? airportPayload : a));
      setAirportFormNotice(lang ? `বিমানবন্দর ${code} সফলভাবে আপডেট হয়েছে!` : `Airport ${code} updated successfully!`);
    } else {
      if (addAirport) {
        addAirport(airportPayload);
      }
      setLocalAirports(prev => [airportPayload, ...prev]);
      setAirportFormNotice(lang ? `নতুন বিমানবন্দর ${code} সফলভাবে যুক্ত হয়েছে!` : `Airport ${code} added successfully!`);
    }

    setAirportFormError('');
    setAirportFormOpen(false);
    setTimeout(() => setAirportFormNotice(''), 3500);
  };

  const handleSetAirportStatus = (item, targetStatus) => {
    if (toggleAirportStatus) {
      toggleAirportStatus(item.id, targetStatus);
    }
    setLocalAirports(prev => prev.map(a => a.id === item.id ? { ...a, status: targetStatus } : a));
    const label = targetStatus === 'active' ? (lang ? 'সক্রিয়' : 'Active') : targetStatus === 'maintenance' ? (lang ? 'রক্ষণাবেক্ষণাধীন' : 'Maintenance') : (lang ? 'নিষ্ক্রিয়' : 'Inactive');
    setAirportFormNotice(
      lang ? `${item.code} এর অপারেটিং স্ট্যাটাস '${label}' করা হয়েছে।` : `${item.code} status set to ${label}.`
    );
    setTimeout(() => setAirportFormNotice(''), 3000);
  };

  const handleToggleAirportQuickStatus = (item) => {
    const nextStatus = item.status === 'active' ? 'inactive' : 'active';
    if (toggleAirportStatus) {
      toggleAirportStatus(item.id, nextStatus);
    }
    setLocalAirports(prev => prev.map(a => a.id === item.id ? { ...a, status: nextStatus } : a));
    setAirportFormNotice(
      lang
        ? `${item.code} এর স্ট্যাটাস '${nextStatus === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}' করা হয়েছে।`
        : `${item.code} status set to ${nextStatus}.`
    );
    setTimeout(() => setAirportFormNotice(''), 3000);
  };

  const handleDeleteAirportItem = (item) => {
    if (deleteAirport) {
      deleteAirport(item.id);
    }
    setLocalAirports(prev => prev.filter(a => a.id !== item.id));
    setAirportFormNotice(
      lang ? `বিমানবন্দর ${item.code} প্ল্যাটফর্ম থেকে সরানো হয়েছে।` : `Airport ${item.code} removed from platform.`
    );
    setTimeout(() => setAirportFormNotice(''), 3500);
  };

  // Service Management State
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [serviceCatFilter, setServiceCatFilter] = useState('all'); // 'all' | 'meet_greet' | 'fast_track' ...
  const [serviceDirFilter, setServiceDirFilter] = useState('all'); // 'all' | 'arr' | 'dep' | 'transit'
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceNotice, setServiceNotice] = useState('');
  const [serviceErrors, setServiceErrors] = useState({});
  const [localServices, setLocalServices] = useState(
    (managerServices && managerServices.length > 0)
      ? managerServices
      : SERVICES.map((s, idx) => normalizeManagerService(s, idx)).filter(Boolean)
  );

  useEffect(() => {
    if (managerServices && managerServices.length > 0) {
      setLocalServices(managerServices);
    }
  }, [managerServices]);

  useEffect(() => {
    if (serviceNotice) {
      const timer = setTimeout(() => setServiceNotice(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [serviceNotice]);

  // Pricing Management State (Requirement 23)
  const [pricingSubTab, setPricingSubTab] = useState('packages');
  const [localPricing, setLocalPricing] = useState(() => pricingConfig || DEFAULT_PRICING_CONFIG);
  const [pricingNotice, setPricingNotice] = useState('');
  const [pricingError, setPricingError] = useState('');

  // Simulator State
  const [simPkg, setSimPkg] = useState('economy');
  const [simAdults, setSimAdults] = useState(2);
  const [simChildren, setSimChildren] = useState(1);
  const [simElderly, setSimElderly] = useState(0);
  const [simStaffCount, setSimStaffCount] = useState(1);
  const [simDedicatedStaff, setSimDedicatedStaff] = useState(false);
  const [simAddons, setSimAddons] = useState(['wheel', 'wrap']);
  const [simWrapBags, setSimWrapBags] = useState(2);
  const [simVehicle, setSimVehicle] = useState('sedan');
  const [simBothWays, setSimBothWays] = useState(false);
  const [simAirport, setSimAirport] = useState('dac');
  const [simTime, setSimTime] = useState('14:00');

  useEffect(() => {
    if (pricingConfig) {
      setLocalPricing(pricingConfig);
    }
  }, [pricingConfig]);

  useEffect(() => {
    if (pricingNotice) {
      const timer = setTimeout(() => setPricingNotice(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [pricingNotice]);

  const [serviceFormData, setServiceFormData] = useState({
    id: '',
    ic: '🤝',
    cat: 'arr',
    serviceCategory: 'meet_greet',
    nameEn: '',
    nameBn: '',
    descEn: '',
    descBn: '',
    steps: [['', '']],
    active: true,
    availability: {
      airports: ['ALL'],
      hours: '24/7',
      leadTime: 'Instant',
      terminals: ['ALL'],
    },
  });

  const handleOpenCreateService = (preset = null) => {
    setEditingService(null);
    setServiceErrors({});
    if (preset) {
      setServiceFormData({
        id: preset.id || `service_${Date.now()}`,
        ic: preset.ic || '🤝',
        cat: preset.cat || 'arr',
        serviceCategory: preset.serviceCategory || 'meet_greet',
        nameEn: preset.n[0] || '',
        nameBn: preset.n[1] || '',
        descEn: preset.d?.[0] || '',
        descBn: preset.d?.[1] || '',
        steps: preset.s ? JSON.parse(JSON.stringify(preset.s)) : [['', '']],
        active: preset.active !== false,
        availability: preset.availability ? { ...preset.availability } : {
          airports: ['ALL'],
          hours: '24/7',
          leadTime: 'Instant',
          terminals: ['ALL'],
        },
      });
    } else {
      setServiceFormData({
        id: `svc_${Date.now().toString().slice(-6)}`,
        ic: '🤝',
        cat: 'arr',
        serviceCategory: 'meet_greet',
        nameEn: '',
        nameBn: '',
        descEn: '',
        descBn: '',
        steps: [['', '']],
        active: true,
        availability: {
          airports: ['ALL'],
          hours: '24/7',
          leadTime: 'Instant',
          terminals: ['ALL'],
        },
      });
    }
    setServiceModalVisible(true);
  };

  const handleOpenEditService = (service) => {
    setEditingService(service);
    setServiceErrors({});
    setServiceFormData({
      id: service.id || '',
      ic: service.ic || '🤝',
      cat: service.cat || 'arr',
      serviceCategory: service.serviceCategory || 'meet_greet',
      nameEn: service.n?.[0] || '',
      nameBn: service.n?.[1] || '',
      descEn: service.d?.[0] || '',
      descBn: service.d?.[1] || '',
      steps: Array.isArray(service.s) && service.s.length > 0 ? JSON.parse(JSON.stringify(service.s)) : [['', '']],
      active: service.active !== false,
      availability: service.availability ? { ...service.availability } : {
        airports: ['ALL'],
        hours: '24/7',
        leadTime: 'Instant',
        terminals: ['ALL'],
      },
    });
    setServiceModalVisible(true);
  };

  const handleSaveServiceForm = async () => {
    const errs = {};
    if (!serviceFormData.id.trim()) errs.id = lang ? 'সার্ভিস আইডি প্রদান করুন' : 'Service ID is required';
    if (!serviceFormData.nameEn.trim()) errs.nameEn = lang ? 'ইংরেজি নাম প্রদান করুন' : 'English name is required';
    if (!serviceFormData.nameBn.trim()) errs.nameBn = lang ? 'বাংলা নাম প্রদান করুন' : 'Bengali name is required';
    if (!serviceFormData.descEn.trim()) errs.descEn = lang ? 'ইংরেজি বিবরণ প্রদান করুন' : 'English description is required';
    if (!serviceFormData.descBn.trim()) errs.descBn = lang ? 'বাংলা বিবরণ প্রদান করুন' : 'Bengali description is required';

    if (Object.keys(errs).length > 0) {
      setServiceErrors(errs);
      return;
    }

    const cleanSteps = (serviceFormData.steps || []).filter(
      step => (step[0] || '').trim() || (step[1] || '').trim()
    );

    const serviceObj = {
      key: editingService ? editingService.key : serviceFormData.id.trim(),
      id: serviceFormData.id.trim(),
      cat: serviceFormData.cat,
      serviceCategory: serviceFormData.serviceCategory,
      ic: serviceFormData.ic.trim() || '✈️',
      n: [serviceFormData.nameEn.trim(), serviceFormData.nameBn.trim()],
      d: [serviceFormData.descEn.trim(), serviceFormData.descBn.trim()],
      s: cleanSteps.length > 0 ? cleanSteps : [['General Service', 'সাধারণ সেবা']],
      active: serviceFormData.active,
      availability: serviceFormData.availability,
    };

    let updatedList;
    if (editingService) {
      updatedList = localServices.map(item =>
        item.key === editingService.key || item.id === editingService.id ? serviceObj : item
      );
      setServiceNotice(lang ? `✓ "${serviceObj.n[1]}" সফলভাবে আপডেট করা হয়েছে!` : `✓ "${serviceObj.n[0]}" updated successfully!`);
    } else {
      updatedList = [serviceObj, ...localServices];
      setServiceNotice(lang ? `✓ নতুন সার্ভিস "${serviceObj.n[1]}" তৈরি করা হয়েছে!` : `✓ New service "${serviceObj.n[0]}" created!`);
    }

    setLocalServices(updatedList);
    if (setManagerServices) setManagerServices(updatedList);
    if (saveManagerServiceCatalog) {
      await saveManagerServiceCatalog(updatedList);
    }
    setServiceModalVisible(false);
  };

  const handleToggleServiceStatus = async (service) => {
    const nextStatus = !service.active;
    const updated = localServices.map(item => {
      if (item.key === service.key || item.id === service.id) {
        return { ...item, active: nextStatus };
      }
      return item;
    });
    setLocalServices(updated);
    if (setManagerServices) setManagerServices(updated);
    if (saveManagerServiceCatalog) {
      await saveManagerServiceCatalog(updated);
    }
    const svcName = service.n ? service.n[lang] : service.id;
    if (nextStatus) {
      setServiceNotice(lang ? `🟢 "${svcName}" সক্রিয় করা হয়েছে!` : `🟢 "${svcName}" activated!`);
    } else {
      setServiceNotice(lang ? `🔴 "${svcName}" নিষ্ক্রিয় করা হয়েছে!` : `🔴 "${svcName}" deactivated!`);
    }
  };

  const handleDeleteServiceItem = async (service) => {
    const updated = localServices.filter(item => item.key !== service.key && item.id !== service.id);
    setLocalServices(updated);
    if (setManagerServices) setManagerServices(updated);
    if (saveManagerServiceCatalog) {
      await saveManagerServiceCatalog(updated);
    }
    const svcName = service.n ? service.n[lang] : service.id;
    setServiceNotice(lang ? `🗑️ "${svcName}" মুছে ফেলা হয়েছে!` : `🗑️ "${svcName}" deleted!`);
  };

  const handleResetDefaultServices = async () => {
    if (resetManagerServicesToDefault) {
      await resetManagerServicesToDefault();
    }
    const restored = SERVICES.map((s, idx) => normalizeManagerService(s, idx)).filter(Boolean);
    setLocalServices(restored);
    setServiceNotice(lang ? '🔄 ডিফল্ট সার্ভিস ক্যাটালগ রিস্টোর করা হয়েছে!' : '🔄 Default service catalog restored!');
  };

  const handleAddFormStep = () => {
    setServiceFormData(prev => ({
      ...prev,
      steps: [...prev.steps, ['', '']],
    }));
  };

  const handleUpdateFormStep = (index, langIdx, text) => {
    setServiceFormData(prev => {
      const nextSteps = prev.steps.map((st, i) => {
        if (i === index) {
          const pair = [...st];
          pair[langIdx] = text;
          return pair;
        }
        return st;
      });
      return { ...prev, steps: nextSteps };
    });
  };

  const handleRemoveFormStep = (index) => {
    setServiceFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const handleToggleFormAirport = (code) => {
    setServiceFormData(prev => {
      let currentAirports = prev.availability?.airports || ['ALL'];
      if (code === 'ALL') {
        return {
          ...prev,
          availability: {
            ...prev.availability,
            airports: ['ALL'],
          },
        };
      }
      let nextAirports = currentAirports.filter(a => a !== 'ALL');
      if (nextAirports.includes(code)) {
        nextAirports = nextAirports.filter(a => a !== code);
      } else {
        nextAirports.push(code);
      }
      if (nextAirports.length === 0) nextAirports = ['ALL'];
      return {
        ...prev,
        availability: {
          ...prev.availability,
          airports: nextAirports,
        },
      };
    });
  };

  const handleToggleFormTerminal = (terminal) => {
    setServiceFormData(prev => {
      let currentTerminals = prev.availability?.terminals || ['ALL'];
      if (terminal === 'ALL') {
        return {
          ...prev,
          availability: {
            ...prev.availability,
            terminals: ['ALL'],
          },
        };
      }
      let nextTerminals = currentTerminals.filter(t => t !== 'ALL');
      if (nextTerminals.includes(terminal)) {
        nextTerminals = nextTerminals.filter(t => t !== terminal);
      } else {
        nextTerminals.push(terminal);
      }
      if (nextTerminals.length === 0) nextTerminals = ['ALL'];
      return {
        ...prev,
        availability: {
          ...prev.availability,
          terminals: nextTerminals,
        },
      };
    });
  };

  // Dashboard timeframe & Revenue Chart mode
  const [dashboardTimeframe, setDashboardTimeframe] = useState('all');
  const [revenueChartMode, setRevenueChartMode] = useState('weekly'); // 'weekly' | 'monthly'

  // Bookings management state with pagination & 300ms debounced search
  const [bookingFilterStatus, setBookingFilterStatus] = useState('all');
  const [bookingSearchInput, setBookingSearchInput] = useState('');
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [bookingCurrentPage, setBookingCurrentPage] = useState(1);
  const [bookingPageSize, setBookingPageSize] = useState(10); // 10 or 20 records per page

  // Dual-Vault Database State (Database 1: Auditor / Showcase vs Database 2: Master Secret Vault)
  const [isMasterVaultActive, setIsMasterVaultActive] = useState(isMasterVaultUnlocked());
  const [showcaseBookingIds, setShowcaseBookingIds] = useState([]);
  const [showDualVaultModal, setShowDualVaultModal] = useState(false);

  // 10-Click Steganographic Trigger for Database 2 (Master Vault)
  const handleVaultAccessClick = () => {
    registerVaultTriggerClick({
      isUnlocked: isMasterVaultActive,
      onTrigger: () => setShowDualVaultModal(true),
      onNotice: (msg) => {
        setAdminNotice(msg);
        setTimeout(() => setAdminNotice(''), 3500);
      },
      lang,
    });
  };

  useEffect(() => {
    getShowcaseBookingIds().then(ids => {
      setShowcaseBookingIds(ids || []);
    });
    setIsMasterVaultActive(isMasterVaultUnlocked());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBookingSearchQuery(bookingSearchInput);
      setBookingCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [bookingSearchInput]);

  useEffect(() => {
    const adminOnlySections = ['pricing', 'reports', 'backup', 'security', 'allocation', 'customers', 'airports'];
    if (!isAdmin && adminOnlySections.includes(managerSection)) {
      setManagerSection('dashboard');
    }
  }, [isAdmin, managerSection, setManagerSection]);

  // Pending payments list with verification actions
  const [pendingPaymentsList, setPendingPaymentsList] = useState([
    { id: 'pay-1', ref: 'PAY-8921', bookingId: 'DAC-1498', customer: 'Nabila Akter', phone: '+8801712345678', amount: 2500, method: 'bKash', trxId: '9J3K8L2P', time: '14 min ago' },
    { id: 'pay-2', ref: 'PAY-8924', bookingId: 'CGP-2041', customer: 'Tanvir Hossain', phone: '+8801819876543', amount: 1500, method: 'Nagad', trxId: '7M4N9Q1W', time: '38 min ago' },
    { id: 'pay-3', ref: 'PAY-8929', bookingId: 'DAC-1502', customer: 'Farzana Yasmin', phone: '+8801911223344', amount: 4000, method: 'bKash', trxId: '5X8Y2Z9A', time: '1 hour ago' },
  ]);

  // Refund requests list with approval actions
  const [refundRequestsList, setRefundRequestsList] = useState([
    { id: 'ref-1', ticketId: 'REF-1092', bookingId: 'DAC-1455', customer: 'Kamal Hossain', amount: 3500, reason: 'Flight cancelled by Biman Bangladesh', date: 'Today, 11:20 AM', status: 'pending' },
    { id: 'ref-2', ticketId: 'REF-1095', bookingId: 'CGP-1994', customer: 'Rumana Chowdhury', amount: 2500, reason: 'Passenger emergency medical rescheduling', date: 'Yesterday', status: 'pending' },
    { id: 'ref-3', ticketId: 'REF-1099', bookingId: 'ZYL-890', customer: 'Jahangir Alam', amount: 1500, reason: 'Duplicate payment on Visa gateway', date: '2 days ago', status: 'pending' },
  ]);

  // Staff availability & duty roster state
  const [localStaffRoster, setLocalStaffRoster] = useState(DEFAULT_STAFF_ROSTER);
  const staffRoster = parentStaffRoster || localStaffRoster;
  const setStaffRoster = parentSetStaffRoster || setLocalStaffRoster;
  const [staffStationFilter, setStaffStationFilter] = useState('all');
  const [staffStatusFilter, setStaffStatusFilter] = useState('all');
  const [staffSearchInput, setStaffSearchInput] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setStaffSearchQuery(staffSearchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [staffSearchInput]);

  // Dashboard Protocol Officers Fleet Filter & Mobile Section Picker
  const [dashboardOfficerAirport, setDashboardOfficerAirport] = useState('all');
  const [showSectionPickerModal, setShowSectionPickerModal] = useState(false);

  // Staff Account Form Modals
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);

  // Protocol Officer ID Card & QR Public Profile Modals
  const [selectedOfficerForCard, setSelectedOfficerForCard] = useState(null);
  const [showOfficerIdCardModal, setShowOfficerIdCardModal] = useState(false);
  const [selectedOfficerForProfile, setSelectedOfficerForProfile] = useState(null);
  const [showOfficerProfileModal, setShowOfficerProfileModal] = useState(false);
  const [showProtocolRanksModal, setShowProtocolRanksModal] = useState(false);

  // Staff Account Form State
  const [staffFormName, setStaffFormName] = useState('');
  const [staffFormEmail, setStaffFormEmail] = useState('');
  const [staffFormPhone, setStaffFormPhone] = useState('');
  const [staffFormRole, setStaffFormRole] = useState('Senior Greeter');
  const [staffFormAirport, setStaffFormAirport] = useState('DAC');
  const [staffFormStation, setStaffFormStation] = useState('DAC Terminal 1');
  const [staffFormShift, setStaffFormShift] = useState('06:00 AM - 02:00 PM');
  const [staffFormStatus, setStaffFormStatus] = useState('available');
  const [staffFormActive, setStaffFormActive] = useState(true);
  const [staffFormNotes, setStaffFormNotes] = useState('');
  const [staffFormPin, setStaffFormPin] = useState('1234');
  const [staffFormPhoto, setStaffFormPhoto] = useState('');
  const [staffFormSerial, setStaffFormSerial] = useState('');
  const [staffFormError, setStaffFormError] = useState('');

  // Protocol Staff Serial Customization State
  const [showStaffReorderModal, setShowStaffReorderModal] = useState(false);
  const [staffReorderList, setStaffReorderList] = useState([]);
  const [staffReorderSaving, setStaffReorderSaving] = useState(false);

  // Staff Assignment & Progress Modals
  const [showStaffAssignModal, setShowStaffAssignModal] = useState(false);
  const [assignTargetStaff, setAssignTargetStaff] = useState(null);
  const [showStaffProgressModal, setShowStaffProgressModal] = useState(false);
  const [progressViewingStaff, setProgressViewingStaff] = useState(null);

  // Offline / Manual Booking Registration Modal State
  const [showManualBookingModal, setShowManualBookingModal] = useState(false);
  const [invoiceModalBooking, setInvoiceModalBooking] = useState(null);
  const [placardModalBooking, setPlacardModalBooking] = useState(null);

  // Make Placard & Super Admin Audit History Modal State
  const [showMakePlacardModal, setShowMakePlacardModal] = useState(false);
  const [placardHistoryList, setPlacardHistoryList] = useState([]);

  useEffect(() => {
    getPlacardHistory().then(list => setPlacardHistoryList(list || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (managerSection === 'placards') {
      setShowMakePlacardModal(true);
    }
  }, [managerSection]);

  // Additional Booking administration filter & modal states
  const [bookingAirportFilter, setBookingAirportFilter] = useState('all');
  const [bookingPaymentFilter, setBookingPaymentFilter] = useState('all');
  const [bookingStaffFilter, setBookingStaffFilter] = useState('all');
  const [bookingSourceFilter, setBookingSourceFilter] = useState('all'); // 'all' | 'manager' | 'online'

  // Interactive Booking Modals
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingDetailTab, setBookingDetailTab] = useState('overview');
  const [bookingCommLogs, setBookingCommLogs] = useState([]);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);

  useEffect(() => {
    if (selectedBooking?.id) {
      getBookingCommunicationLogs(selectedBooking.id).then(logs => {
        setBookingCommLogs(logs || []);
      });
    }
  }, [selectedBooking, bookingDetailTab]);
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [showServiceProgressModal, setShowServiceProgressModal] = useState(false);
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);

  // Form states for modals
  const [assignLeadStaffId, setAssignLeadStaffId] = useState('');
  const [assignSupportStaffId, setAssignSupportStaffId] = useState('');
  const [assignStaffNotes, setAssignStaffNotes] = useState('');
  const [assignStationFilter, setAssignStationFilter] = useState('all');

  const [progressNotesInput, setProgressNotesInput] = useState('');

  const [cancelReasonPreset, setCancelReasonPreset] = useState('flight_cancelled');
  const [cancelCustomRemarks, setCancelCustomRemarks] = useState('');
  const [cancelFeeInput, setCancelFeeInput] = useState('0');
  const [cancelRefundInput, setCancelRefundInput] = useState('0');
  const [cancelRefundAction, setCancelRefundAction] = useState('refund_now');

  const [newStatusSelection, setNewStatusSelection] = useState('confirmed');
  const [statusUpdateNote, setStatusUpdateNote] = useState('');

  // Helper to construct service milestones progress
  const createMilestonesProgress = (direction = 'arrival', completedCount = 0, activeIndex = -1) => {
    const list = direction === 'arrival' ? DEFAULT_ARRIVAL_MILESTONES : DEFAULT_DEPARTURE_MILESTONES;
    return list.map((m, idx) => {
      let st = 'pending';
      let compAt = null;
      if (idx < completedCount) {
        st = 'completed';
        compAt = `0${8 + idx}:15 AM`;
      } else if (idx === activeIndex) {
        st = 'in_progress';
      }
      return {
        ...m,
        status: st,
        completedAt: compAt,
        notes: '',
      };
    });
  };

  // Enriched initial platform bookings
  // Initial platform bookings - Starts clean from scratch (zero mock bookings)
  const INITIAL_PLATFORM_BOOKINGS = [];

  // Master platform bookings state
  const [allPlatformBookings, setAllPlatformBookings] = useState(INITIAL_PLATFORM_BOOKINGS);

  // Normalizer for customer wizard bookings coming from parent prop or cloud/local storage
  const normalizeBookingForManager = (b) => {
    if (!b) return null;
    const dir = b.dir || (b.service_category === 'arrival' ? 'arrival' : 'departure');
    const paxAdults = b.passengers?.adults || b.a || 1;
    const paxChildren = b.passengers?.children || b.c || 0;
    const paxElderly = b.passengers?.elderly || b.e || 0;
    const paxTotal = b.passengers?.total || (paxAdults + paxChildren + paxElderly);
    const id = String(b.id || b.bookingId || `FC-${Math.floor(10000 + Math.random() * 90000)}`);
    const customer = b.passenger_information?.name || b.passengerName || b.name || b.customer || 'Valued Passenger';
    const phone = b.passenger_information?.phone || b.passengerPhone || b.phone || b.customerPhone || '+8801700000000';
    const email = b.passenger_information?.email || b.passengerEmail || b.email || b.customerEmail || 'customer@flightcare.app';
    const airport = typeof b.airport === 'string' ? b.airport : (b.airport?.code || b.airport_code || 'DAC');
    const fno = b.flight?.number || b.fno || b.flightNumber || 'BG-001';
    const airline = b.flight?.airline || b.airline || 'Biman Bangladesh Airlines';
    const date = b.flight?.date || b.date || b.serviceDate || '09-10-2026';
    const time = b.flight?.time || b.time || b.serviceTime || '14:00';
    const pkgName = b.pkg?.t || (Array.isArray(b.pkg?.n) ? b.pkg.n[0] : b.package) || (dir === 'arr' ? 'VIP Arrival Protocol' : 'VIP Departure Protocol');
    const serviceName = b.svc?.titleEn || b.service || (dir === 'arr' ? 'Arrival Protocol' : 'Departure Protocol');
    const paymentMethod = b.method === 'pay_after_service' || b.paidMethod === 'pay_after_service'
      ? 'Pay After Service'
      : b.method === 'banglaqr' || b.paidMethod === 'banglaqr'
      ? 'Bangla QR'
      : b.method === 'bkash' || b.paidMethod === 'bkash'
      ? 'bKash'
      : b.method === 'sslcommerz' || b.paidMethod === 'sslcommerz'
      ? 'SSLCommerz'
      : b.method === 'nagad' || b.paidMethod === 'nagad'
      ? 'Nagad'
      : 'Card';

    return {
      id,
      customer,
      phone,
      email,
      nationality: b.passenger_information?.nationality || b.nationality || 'Bangladeshi',
      passportNumber: b.flight?.passport_number || b.passportNumber || 'N/A',
      airport,
      fno,
      airline,
      origin: b.flight?.origin || b.origin || (dir === 'arr' ? 'International / Domestic' : 'Dhaka (DAC)'),
      destination: b.flight?.destination || b.destination || (dir === 'arr' ? 'Dhaka (DAC)' : 'International Hub'),
      terminal: b.flight?.terminal || b.terminal || (dir === 'arr' ? 'Arrival Hall' : 'Departure Terminal'),
      meetingPoint: b.meetingPoint || (dir === 'arr' ? 'Arrival Boarding Bridge / Gate' : 'Departure Curb Gate 1'),
      direction: dir,
      date,
      time,
      package: pkgName,
      service: serviceName,
      passengers: paxTotal,
      passengerBreakdown: { adults: paxAdults, children: paxChildren, elderly: paxElderly },
      passengerDetails: b.passenger_details || b.passengerDetails || [{ name: customer, type: 'adult' }],
      amount: Number(b.amount) || 2500,
      paymentStatus: b.paymentStatus || (paymentMethod === 'Pay After Service' ? 'pay_after_service' : 'paid'),
      paymentMethod,
      paymentRef: b.trxId || b.paymentId || ('PAY-' + id),
      paymentDate: b.paymentDate || 'Today',
      pricingBreakdown: b.pricingBreakdown || { baseFare: Number(b.amount) || 2500, total: Number(b.amount) || 2500 },
      status: b.status || 'upcoming',
      staff: b.staff || 'Unassigned',
      staffId: b.staffId || null,
      supportStaff: b.supportStaff || null,
      supportStaffId: b.supportStaffId || null,
      staffNotes: b.staffNotes || '',
      addons: b.addons || [],
      vehicle: b.vehicle || 'None',
      remarks: b.remarks || '',
      serviceProgress: b.serviceProgress || createMilestonesProgress(dir, 0, 0),
      cancellation: b.cancellation || { isCancelled: b.status === 'cancelled', reason: '', fee: 0, refundAmount: 0 },
      statusHistory: b.statusHistory || [{ status: 'confirmed', label: 'Booking Placed', time: 'Today', note: 'Online reservation' }],
      enteredBy: b.enteredBy || null,
      assignedBy: b.assignedBy || null,
      lastModifiedBy: b.lastModifiedBy || null,
      isOfflineManual: b.isOfflineManual !== undefined ? b.isOfflineManual : (b.enteredBy ? true : false),
      sourceLabel: b.sourceLabel || (b.enteredBy ? 'ম্যানেজার অফলাইন এন্ট্রি' : 'ওয়েবসাইট অনলাইন বুকিং'),
      createdAt: b.createdAt || b.created_at || new Date().toISOString(),
    };
  };

  // 1. Guaranteed Local Storage Persistence & Real-time Cloud Firestore Booking Sync for Manager & Super Admin
  useEffect(() => {
    let isMounted = true;

    // Load from local AsyncStorage immediately on mount
    AsyncStorage.getItem('@flightcare_bookings').then(val => {
      if (!isMounted || !val) return;
      try {
        const stored = JSON.parse(val);
        if (Array.isArray(stored) && stored.length > 0) {
          setAllPlatformBookings(prev => {
            const map = new Map(prev.map(b => [String(b.id), b]));
            let changed = false;
            stored.forEach(rawB => {
              const norm = normalizeBookingForManager(rawB);
              if (norm && !map.has(String(norm.id))) {
                map.set(String(norm.id), norm);
                changed = true;
              }
            });
            if (changed) {
              const merged = Array.from(map.values());
              merged.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
              return merged;
            }
            return prev;
          });
        }
      } catch (e) {
        console.warn('Error reading @flightcare_bookings in ManagerPanel:', e);
      }
    });

    // Real-time listener for any new or modified bookings from Cloud Firestore
    const unsubCloud = listenToCloudBookings(
      cloudBookings => {
        if (!isMounted || !Array.isArray(cloudBookings) || cloudBookings.length === 0) return;
        setAllPlatformBookings(prev => {
          const map = new Map(prev.map(b => [String(b.id), b]));
          let changed = false;
          cloudBookings.forEach(rawB => {
            const norm = normalizeBookingForManager(rawB);
            if (!norm) return;
            const existing = map.get(String(norm.id));
            if (!existing) {
              map.set(String(norm.id), norm);
              changed = true;
            } else if (
              existing.status !== norm.status ||
              existing.paymentStatus !== norm.paymentStatus ||
              existing.staff !== norm.staff ||
              existing.staffId !== norm.staffId
            ) {
              map.set(String(norm.id), { ...existing, ...norm });
              changed = true;
            }
          });
          if (changed) {
            const merged = Array.from(map.values());
            merged.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
            return merged;
          }
          return prev;
        });

        // Also sync parent bookings prop if provided
        if (typeof setBookings === 'function') {
          setBookings(curr => {
            const currMap = new Map((curr || []).map(b => [String(b.id), b]));
            let parentChanged = false;
            cloudBookings.forEach(cb => {
              if (cb && (cb.id || cb.bookingId)) {
                const id = String(cb.id || cb.bookingId);
                if (!currMap.has(id)) {
                  currMap.set(id, cb);
                  parentChanged = true;
                }
              }
            });
            return parentChanged ? Array.from(currMap.values()) : curr;
          });
        }
      },
      err => console.warn('[ManagerPanel] Real-time cloud bookings sync notice:', err?.message)
    );

    return () => {
      isMounted = false;
      if (typeof unsubCloud === 'function') unsubCloud();
    };
  }, []);

  // 2. Synchronize parent bookings into manager view whenever updated
  useEffect(() => {
    if (Array.isArray(bookings) && bookings.length > 0) {
      setAllPlatformBookings(prev => {
        const map = new Map(prev.map(b => [String(b.id), b]));
        let changed = false;
        bookings.forEach(rawB => {
          const norm = normalizeBookingForManager(rawB);
          if (!norm) return;
          const existing = map.get(String(norm.id));
          if (!existing) {
            map.set(String(norm.id), norm);
            changed = true;
          } else if (
            existing.status !== norm.status ||
            existing.paymentStatus !== norm.paymentStatus ||
            existing.staff !== norm.staff ||
            existing.staffId !== norm.staffId
          ) {
            map.set(String(norm.id), { ...existing, ...norm });
            changed = true;
          }
        });
        if (changed) {
          const merged = Array.from(map.values());
          merged.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
          return merged;
        }
        return prev;
      });
    }
  }, [bookings]);

  const [adminNotice, setAdminNotice] = useState('');

  const handleApprovePayment = (id) => {
    const payment = pendingPaymentsList.find(p => p.id === id);
    setPendingPaymentsList(curr => curr.filter(p => p.id !== id));
    if (payment) {
      setAllPlatformBookings(curr => curr.map(b => b.id === payment.bookingId ? { ...b, paymentStatus: 'paid', status: 'upcoming' } : b));
    }
    setAdminNotice(lang ? 'পেমেন্ট সফলভাবে যাচাই ও অনুমোদন করা হয়েছে!' : 'Payment verified & confirmed successfully!');
    setTimeout(() => setAdminNotice(''), 3500);
  };

  const handleRejectPayment = (id) => {
    setPendingPaymentsList(curr => curr.filter(p => p.id !== id));
    setAdminNotice(lang ? 'পেমেন্ট যাচাই বাতিল করা হয়েছে।' : 'Payment rejected.');
    setTimeout(() => setAdminNotice(''), 3500);
  };

  const handleApproveRefund = (id) => {
    const refItem = refundRequestsList.find(r => r.id === id);
    setRefundRequestsList(curr => curr.filter(r => r.id !== id));
    if (refItem) {
      setAllPlatformBookings(curr => curr.map(b => b.id === refItem.bookingId ? { ...b, paymentStatus: 'refunded', status: 'cancelled' } : b));
    }
    setAdminNotice(lang ? 'রিফান্ড অনুমোদন করা হয়েছে এবং গ্রাহকের অ্যাকাউন্টে পাঠানো হয়েছে।' : 'Refund request approved & dispatched.');
    setTimeout(() => setAdminNotice(''), 3500);
  };

  const handleRejectRefund = (id) => {
    setRefundRequestsList(curr => curr.filter(r => r.id !== id));
    setAdminNotice(lang ? 'রিফান্ড অনুরোধ বাতিল করা হয়েছে।' : 'Refund request rejected.');
    setTimeout(() => setAdminNotice(''), 3500);
  };

  const handleToggleStaffDuty = (id) => {
    if (onToggleStaffDuty) {
      onToggleStaffDuty(id);
    } else {
      setStaffRoster(curr => curr.map(s => {
        if (s.id !== id) return s;
        const nextStatus = s.status === 'available' ? 'in_service' : s.status === 'in_service' ? 'off_duty' : 'available';
        return { ...s, status: nextStatus };
      }));
    }
    setAdminNotice(lang ? 'স্টাফের ডিউটি স্ট্যাটাস পরিবর্তন করা হয়েছে।' : 'Staff duty status updated.');
    setTimeout(() => setAdminNotice(''), 2500);
  };

  // Helper for picking/uploading image for staff member with auto-compression
  const handlePickStaffImage = (callback) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          setAdminNotice(lang ? 'ছবি অপ্টিমাইজ ও কম্প্রেস হচ্ছে...' : 'Optimizing and compressing photo...');
          try {
            const compressed = await compressImage(file, { maxWidth: 480, maxHeight: 480, quality: 0.82 });
            if (compressed) {
              callback(compressed);
            }
          } catch (err) {
            console.error('Staff image compression error:', err);
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

  // Quick photo upload directly from officer card
  const handleQuickUploadStaffPhoto = (staffItem) => {
    handlePickStaffImage((base64) => {
      const updates = { photo: base64, avatar: base64 };
      if (onUpdateStaff) {
        onUpdateStaff(staffItem.id, updates);
      } else {
        setStaffRoster(curr => curr.map(s => s.id === staffItem.id ? { ...s, ...updates } : s));
      }
      setAdminNotice(lang ? `✓ ${staffItem.name}-এর ছবি সফলভাবে আপডেট হয়েছে!` : `✓ Photo updated for ${staffItem.name}!`);
      setTimeout(() => setAdminNotice(''), 3000);
    });
  };

  // Move staff member Up or Down by swapping with adjacent member
  const handleMoveStaffMember = (staffId, direction) => {
    const sorted = [...staffRoster].sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
    const index = sorted.findIndex(s => s.id === staffId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap elements
    const temp = sorted[index];
    sorted[index] = sorted[targetIndex];
    sorted[targetIndex] = temp;

    // Re-assign serials
    sorted.forEach((s, idx) => {
      s.serial = idx + 1;
    });

    setStaffRoster(sorted);
    AsyncStorage.setItem('@flightcare_staff_roster_v10', JSON.stringify(sorted)).catch(() => {});
    if (onUpdateStaff) {
      onUpdateStaff(sorted[index].id, { serial: sorted[index].serial });
      onUpdateStaff(sorted[targetIndex].id, { serial: sorted[targetIndex].serial });
    }
    setAdminNotice(direction === 'up' ? (lang ? '▲ স্টাফের ক্রম ওপরে নেওয়া হয়েছে' : '▲ Officer moved up') : (lang ? '▼ স্টাফের ক্রম নিচে নেওয়া হয়েছে' : '▼ Officer moved down'));
    setTimeout(() => setAdminNotice(''), 2500);
  };

  // Open Protocol Staff Reorder Modal
  const handleOpenStaffReorderModal = () => {
    setStaffReorderList([...staffRoster].sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999)));
    setShowStaffReorderModal(true);
  };

  // Move staff in Reorder Modal
  const handleMoveInStaffReorderList = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= staffReorderList.length) return;
    const next = [...staffReorderList];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    next.forEach((item, idx) => {
      item.serial = idx + 1;
    });
    setStaffReorderList(next);
  };

  // Change serial manually in Staff Reorder Modal
  const handleChangeSerialInStaffReorderList = (index, val) => {
    const num = parseInt(val, 10);
    const next = [...staffReorderList];
    next[index] = { ...next[index], serial: isNaN(num) ? val : num };
    setStaffReorderList(next);
  };

  // Save new Protocol Staff serial ordering
  const handleSaveStaffReorder = () => {
    setStaffReorderSaving(true);
    const sorted = [...staffReorderList].sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
    sorted.forEach((item, idx) => {
      item.serial = idx + 1;
    });
    setStaffRoster(sorted);
    AsyncStorage.setItem('@flightcare_staff_roster_v10', JSON.stringify(sorted)).catch(() => {});
    if (onUpdateStaff) {
      sorted.forEach(st => {
        onUpdateStaff(st.id, { serial: st.serial });
      });
    }
    setShowStaffReorderModal(false);
    setStaffReorderSaving(false);
    setAdminNotice(lang ? '✓ প্রোটোকল অফিসারদের নতুন সিরিয়াল সফলভাবে সংরক্ষিত হয়েছে!' : '✓ Protocol officer serial order saved successfully!');
    setTimeout(() => setAdminNotice(''), 3500);
  };

  const handleOpenCreateStaff = () => {
    setEditingStaffId(null);
    setStaffFormName('');
    setStaffFormEmail('');
    setStaffFormPhone('');
    setStaffFormRole('Senior Greeter');
    setStaffFormAirport('DAC');
    setStaffFormStation('DAC Terminal 1');
    setStaffFormShift('06:00 AM - 02:00 PM');
    setStaffFormStatus('available');
    setStaffFormActive(true);
    setStaffFormNotes('');
    setStaffFormPin('1234');
    setStaffFormPhoto('');
    setStaffFormSerial(String(staffRoster.length + 1));
    setStaffFormError('');
    setShowCreateStaffModal(true);
  };

  const handleOpenEditStaff = (staff) => {
    setEditingStaffId(staff.id);
    setStaffFormName(staff.name || '');
    setStaffFormEmail(staff.email || '');
    setStaffFormPhone(staff.phone || '');
    setStaffFormRole(staff.role || 'Senior Greeter');
    setStaffFormAirport(staff.airport || 'DAC');
    setStaffFormStation(staff.station || '');
    setStaffFormShift(staff.shift || '06:00 AM - 02:00 PM');
    setStaffFormStatus(staff.status || 'available');
    setStaffFormActive(staff.active !== false);
    setStaffFormNotes(staff.notes || '');
    setStaffFormPin(staff.pin || '1234');
    setStaffFormPhoto(staff.photo || (typeof staff.avatar === 'string' && (staff.avatar.startsWith('http') || staff.avatar.startsWith('data:image')) ? staff.avatar : ''));
    setStaffFormSerial(String(staff.serial || ''));
    setStaffFormError('');
    setShowEditStaffModal(true);
  };

  const handleSaveCreateStaff = () => {
    if (!staffFormName.trim()) {
      setStaffFormError(lang ? 'স্টাফের নাম আবশ্যক।' : 'Staff name is required.');
      return;
    }
    if (!staffFormPhone.trim()) {
      setStaffFormError(lang ? 'ফোন নম্বর আবশ্যক।' : 'Phone number is required.');
      return;
    }
    const parsedSerial = parseInt(staffFormSerial, 10);
    const newStaffData = {
      name: staffFormName.trim(),
      email: staffFormEmail.trim() || `${staffFormName.trim().toLowerCase().replace(/\s+/g, '.')}@flightcare.com`,
      phone: staffFormPhone.trim(),
      role: staffFormRole,
      airport: staffFormAirport,
      station: staffFormStation.trim() || `${staffFormAirport} Terminal`,
      shift: staffFormShift,
      status: staffFormStatus,
      active: staffFormActive,
      notes: staffFormNotes.trim(),
      pin: staffFormPin.trim() || '1234',
      photo: staffFormPhoto || null,
      avatar: staffFormPhoto || undefined,
      serial: isNaN(parsedSerial) ? (staffRoster.length + 1) : parsedSerial,
    };

    if (onAddStaff) {
      onAddStaff(newStaffData);
    } else {
      const generated = {
        id: `st-${Date.now()}`,
        rating: 5.0,
        completedServices: 0,
        joinedDate: 'Just added',
        ...newStaffData,
      };
      setStaffRoster(curr => [generated, ...curr]);
    }

    setShowCreateStaffModal(false);
    setAdminNotice(lang ? `নতুন স্টাফ অ্যাকাউন্ট (${staffFormName}) তৈরি হয়েছে!` : `Staff account for ${staffFormName} created successfully!`);
    setTimeout(() => setAdminNotice(''), 3500);
  };

  const handleSaveEditStaff = () => {
    if (!editingStaffId) return;
    if (!staffFormName.trim()) {
      setStaffFormError(lang ? 'স্টাফের নাম আবশ্যক।' : 'Staff name is required.');
      return;
    }
    const parsedSerial = parseInt(staffFormSerial, 10);
    const updates = {
      name: staffFormName.trim(),
      email: staffFormEmail.trim(),
      phone: staffFormPhone.trim(),
      role: staffFormRole,
      airport: staffFormAirport,
      station: staffFormStation.trim(),
      shift: staffFormShift,
      status: staffFormStatus,
      active: staffFormActive,
      notes: staffFormNotes.trim(),
      pin: staffFormPin.trim() || '1234',
      photo: staffFormPhoto || null,
      avatar: staffFormPhoto || undefined,
      ...(isNaN(parsedSerial) ? {} : { serial: parsedSerial }),
    };

    if (onUpdateStaff) {
      onUpdateStaff(editingStaffId, updates);
    } else {
      setStaffRoster(curr => curr.map(s => s.id === editingStaffId ? { ...s, ...updates } : s));
    }

    setShowEditStaffModal(false);
    setAdminNotice(lang ? 'স্টাফের তথ্য আপডেট করা হয়েছে।' : 'Staff information updated successfully.');
    setTimeout(() => setAdminNotice(''), 3000);
  };

  const handleToggleStaffActiveDirect = (staffId) => {
    if (onToggleStaffActive) {
      onToggleStaffActive(staffId);
    } else {
      setStaffRoster(curr => curr.map(s => s.id === staffId ? { ...s, active: s.active === false ? true : false } : s));
    }
    const st = staffRoster.find(s => s.id === staffId);
    const willBeActive = st ? st.active === false : true;
    setAdminNotice(
      lang
        ? (willBeActive ? 'স্টাফ অ্যাকাউন্টটি সক্রিয় করা হয়েছে।' : 'স্টাফ অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।')
        : (willBeActive ? 'Staff account activated.' : 'Staff account deactivated.')
    );
    setTimeout(() => setAdminNotice(''), 3000);
  };

  const handleOpenAssignToBookingForStaff = (staff) => {
    setAssignTargetStaff(staff);
    setShowStaffAssignModal(true);
  };

  const handleAssignTargetStaffToBooking = (booking) => {
    if (!assignTargetStaff) return;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newHistory = [
      ...(booking.statusHistory || []),
      {
        status: booking.status === 'pending' ? 'confirmed' : booking.status,
        label: 'Staff Assigned from Roster',
        time: 'Today, ' + timeString,
        note: `Lead Protocol Officer: ${assignTargetStaff.name} (${assignTargetStaff.role})`,
      },
    ];

    const updated = {
      ...booking,
      staff: assignTargetStaff.name,
      staffId: assignTargetStaff.id,
      leadStaffId: assignTargetStaff.id,
      leadStaffName: assignTargetStaff.name,
      assignedStaffId: assignTargetStaff.id,
      assignedStaffName: assignTargetStaff.name,
      status: booking.status === 'pending' ? 'confirmed' : booking.status,
      statusHistory: newHistory,
    };

    if (onUpdateStaff) {
      onUpdateStaff(assignTargetStaff.id, { status: 'in_service' });
    } else {
      setStaffRoster(curr => curr.map(s => s.id === assignTargetStaff.id ? { ...s, status: 'in_service' } : s));
    }

    setAllPlatformBookings(curr => curr.map(b => b.id === booking.id ? updated : b));
    if (onUpdateBooking) {
      onUpdateBooking(booking.id, updated);
    }

    setShowStaffAssignModal(false);
    setAdminNotice(
      lang
        ? `${assignTargetStaff.name}-কে বুকিং ${booking.id}-এ সফলভাবে বরাদ্দ করা হয়েছে।`
        : `${assignTargetStaff.name} assigned to booking ${booking.id} successfully.`
    );
    setTimeout(() => setAdminNotice(''), 3500);
  };

  const handleOpenStaffProgressView = (staff) => {
    setProgressViewingStaff(staff);
    setShowStaffProgressModal(true);
  };

  // Handle saving new manual offline booking created from admin modal
  const handleSaveManualOfflineBooking = (newBooking) => {
    if (!newBooking) return;

    const operator = {
      id: managerSession?.user?.id || (isManager ? 'mgr_sohel' : 'admin_user'),
      name: managerSession?.user?.name || (isManager ? 'সোয়েল তানভীর' : 'সুপার এডমিন'),
      email: managerSession?.user?.email || (isManager ? 'soheltanvir.th@gmail.com' : 'admin@flightcare.com'),
      role: isManager ? 'manager' : (managerSession?.user?.role || 'admin'),
    };

    const enrichedBooking = {
      ...newBooking,
      isOfflineManual: true,
      sourceLabel: newBooking.sourceLabel || (isManager ? 'ম্যানেজার অফলাইন এন্ট্রি' : 'অফলাইন কাউন্টার'),
      enteredBy: newBooking.enteredBy || {
        ...operator,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
      },
    };

    // 1. Prepend to master platform bookings (triggers reactive update of all dashboard tabs & KPIs)
    setAllPlatformBookings(prev => [enrichedBooking, ...prev]);

    // 2. Prepend to parent app bookings state so App.js and customer lists sync immediately
    if (setBookings) {
      setBookings(prev => [enrichedBooking, ...(Array.isArray(prev) ? prev : [])]);
    }

    // 3. Trigger parent onUpdateBooking callback if available & persist directly to Cloud Firestore
    if (onUpdateBooking) {
      onUpdateBooking(enrichedBooking.id, enrichedBooking);
    }
    saveBookingToFirestore(enrichedBooking).catch(err => {
      console.warn('[Cloud Firestore] Offline booking direct sync:', err);
    });

    // 4. Update assigned staff duty status if an officer was assigned
    if (enrichedBooking.staffId) {
      if (onUpdateStaff) {
        onUpdateStaff(enrichedBooking.staffId, { status: 'in_service' });
      } else {
        setStaffRoster(curr => curr.map(s => s.id === enrichedBooking.staffId ? { ...s, status: 'in_service' } : s));
      }
    }

    // 5. Update payment ledger if paid
    if (enrichedBooking.paymentStatus === 'paid' && setCustomerPaymentHistory) {
      const payRecord = {
        id: `PAY-${enrichedBooking.id}`,
        bookingId: enrichedBooking.id,
        amount: enrichedBooking.amount,
        method: enrichedBooking.paymentMethod,
        date: enrichedBooking.date,
        status: 'success',
        source: enrichedBooking.source || 'counter_walkin',
        passenger: enrichedBooking.passengerName,
      };
      setCustomerPaymentHistory(prev => [payRecord, ...(Array.isArray(prev) ? prev : [])]);
    }

    // 6. Security Audit Event Logging (Manager attribution for Admin detection)
    try {
      logSecurityEvent(
        'BOOKING_CREATED_MANUAL',
        operator,
        {
          bookingId: enrichedBooking.id,
          passengerName: enrichedBooking.passengerName || enrichedBooking.customer,
          serviceType: enrichedBooking.serviceType || enrichedBooking.service,
          amount: enrichedBooking.amount,
          note: `অফলাইন সার্ভিস এন্ট্রি করেছেন ${operator.name} (${operator.email})`,
        },
        'INFO'
      );
      if (typeof loadSecurityLogs === 'function') {
        loadSecurityLogs();
      }
    } catch (auditErr) {
      console.warn('[Audit] Failed to log offline booking entry:', auditErr);
    }

    // 7. Dispatch admin notification & multi-role lifecycle broadcast
    dispatchBookingLifecycleNotifications({
      stage: enrichedBooking.status || 'confirmed',
      booking: enrichedBooking,
      staff: (staffRoster || []).find(s => s.id === enrichedBooking.staffId || s.name === enrichedBooking.staff),
      lang,
    }).catch(() => {});

    if (sendNotification) {
      sendNotification(
        lang
          ? `নতুন অফলাইন সার্ভিস #${enrichedBooking.id} (${enrichedBooking.passengerName}) সফলভাবে ড্যাশবোর্ডে যুক্ত হয়েছে!`
          : `New offline booking #${enrichedBooking.id} (${enrichedBooking.passengerName}) created successfully!`,
        'info'
      );
    }

    // 8. Show global admin notification banner
    setAdminNotice(
      lang
        ? `অফলাইন বুকিং #${enrichedBooking.id} (${enrichedBooking.passengerName}) সফলভাবে যুক্ত হয়েছে! এন্ট্রি কারী: ${operator.name}`
        : `Offline booking #${enrichedBooking.id} created! Entered by: ${operator.name}`
    );
    setTimeout(() => setAdminNotice(''), 4500);
  };

  // Booking Administration Handlers
  const handleOpenBookingDetails = (b) => {
    setSelectedBooking(b);
    setBookingDetailTab('overview');
    setShowBookingDetailsModal(true);
  };

  const handleOpenAssignStaff = (b) => {
    setSelectedBooking(b);
    setAssignLeadStaffId(b.staffId || '');
    setAssignSupportStaffId(b.supportStaffId || '');
    setAssignStaffNotes(b.staffNotes || '');
    setAssignStationFilter(b.airport || 'all');
    setShowAssignStaffModal(true);
  };

  const handleSaveStaffAssignment = async () => {
    if (!selectedBooking) return;
    if (!assignLeadStaffId) {
      setAdminNotice(lang ? 'অনুগ্রহ করে একজন প্রধান প্রোটোকল কর্মকর্তা নির্বাচন করুন।' : 'Please select a lead protocol officer.');
      setTimeout(() => setAdminNotice(''), 3000);
      return;
    }

    const b = allPlatformBookings.find(x => x.id === selectedBooking.id) || selectedBooking;
    const leadStaff = staffRoster.find(s => s.id === assignLeadStaffId);
    const supportStaff = assignSupportStaffId ? staffRoster.find(s => s.id === assignSupportStaffId) : null;

    if (!leadStaff) return;

    // 1. If previous staff was assigned and is different, release previous staff back to available
    if (b.staffId && b.staffId !== leadStaff.id) {
      setStaffRoster(curr => curr.map(s => s.id === b.staffId ? { ...s, status: 'available' } : s));
      try {
        const prevStaff = staffRoster.find(s => s.id === b.staffId);
        if (prevStaff) await saveStaffToFirestore({ ...prevStaff, status: 'available' });
      } catch {}
    }

    // 2. Mark newly assigned lead staff as in_service
    setStaffRoster(curr => curr.map(s => s.id === leadStaff.id ? { ...s, status: 'in_service' } : s));
    try {
      await saveStaffToFirestore({ ...leadStaff, status: 'in_service' });
    } catch {}

    const operator = {
      id: managerSession?.user?.id || (isManager ? 'mgr_sohel' : 'admin_user'),
      name: managerSession?.user?.name || (isManager ? 'সোয়েল তানভীর' : 'সুপার এডমিন'),
      email: managerSession?.user?.email || (isManager ? 'soheltanvir.th@gmail.com' : 'admin@flightcare.com'),
      role: isManager ? 'manager' : (managerSession?.user?.role || 'admin'),
    };

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newHistory = [
      ...(b.statusHistory || []),
      {
        status: b.status === 'pending' ? 'confirmed' : b.status,
        label: 'Protocol Officer Assigned',
        time: 'Today, ' + timeString,
        note: `Assigned Lead: ${leadStaff.name} (${leadStaff.phone})${supportStaff ? ` | Support: ${supportStaff.name}` : ''}${assignStaffNotes.trim() ? ` | Notes: ${assignStaffNotes.trim()}` : ''} | By: ${operator.name} (${operator.email})`,
        by: operator,
      },
    ];

    const updated = {
      ...b,
      staff: leadStaff.name,
      staffId: leadStaff.id,
      leadStaffId: leadStaff.id,
      leadStaffName: leadStaff.name,
      assignedStaff: leadStaff,
      assignedBy: {
        ...operator,
        time: 'Today, ' + timeString,
        timestamp: new Date().toISOString(),
      },
      lastModifiedBy: {
        ...operator,
        action: 'assign_staff',
        time: 'Today, ' + timeString,
        timestamp: new Date().toISOString(),
      },
      supportStaff: supportStaff ? supportStaff.name : null,
      supportStaffId: supportStaff ? supportStaff.id : null,
      staffNotes: assignStaffNotes,
      status: b.status === 'pending' ? 'confirmed' : b.status,
      statusHistory: newHistory,
    };

    // 3. Update local state & call onUpdateBooking
    setAllPlatformBookings(curr => curr.map(item => item.id === b.id ? updated : item));
    if (onUpdateBooking) {
      onUpdateBooking(b.id, updated);
    }
    setSelectedBooking(updated);
    setShowAssignStaffModal(false);

    // 3.1. Log Security & Audit Event
    try {
      logSecurityEvent(
        'STAFF_ASSIGNED',
        operator,
        {
          bookingId: b.id,
          passengerName: updated.passengerName || b.customer,
          staffName: leadStaff.name,
          staffId: leadStaff.id,
          note: `প্রোটোকল অফিসার বরাদ্দ করেছেন ${operator.name} (${operator.email})`,
        },
        'INFO'
      );
      if (typeof loadSecurityLogs === 'function') {
        loadSecurityLogs();
      }
    } catch (auditErr) {
      console.warn('[Audit] Failed to log staff assignment:', auditErr);
    }

    // 4. DISPATCH NOTIFICATION TO PROTOCOL OFFICER (User Request Trigger 1)
    try {
      const passengerName = updated.passengerName || updated.customer || (updated.passengers && updated.passengers[0]?.name) || 'Valued Passenger';
      const flightNo = updated.flight?.number || updated.flightNumber || updated.fno || 'Flight';
      const airport = updated.airport || 'DAC';
      const terminal = updated.flight?.terminal || updated.terminal || 'Terminal 1';
      const meetingPoint = `${terminal} VIP Arrival / Meet & Greet Point`;
      const flightDate = updated.flight?.date || updated.flightDate || 'Scheduled Date';
      const flightTime = updated.flight?.time || updated.flightTime || 'Scheduled Time';

      await dispatchStaffNotification({
        staffId: leadStaff.id,
        staffName: leadStaff.name,
        type: STAFF_NOTIFICATION_TYPES.ASSIGNMENT,
        title: lang ? `নতুন প্রোটোকল সার্ভিস বরাদ্দ (বুকিং #${b.id})` : `New Protocol Service Assignment (Booking #${b.id})`,
        body: lang
          ? `যাত্রী: ${passengerName} | ফ্লাইট: ${flightNo} | বিমানবন্দর: ${airport} (${terminal}) | সময়: ${flightDate} ${flightTime} | সাক্ষাত: ${meetingPoint}। দায়িত্ব গ্রহণের জন্য প্রস্তুত থাকুন।`
          : `Passenger: ${passengerName} | Flight: ${flightNo} | Airport: ${airport} (${terminal}) | Schedule: ${flightDate} ${flightTime} | Meeting: ${meetingPoint}. Please be on standby.`,
        bookingId: b.id,
        passengerName,
        passengerPhone: updated.passengerPhone || updated.phone || '',
        flight: flightNo,
        airport,
        terminal,
        date: flightDate,
        time: flightTime,
        meetingPoint,
        lang,
      });
    } catch (notifErr) {
      console.warn('Error dispatching staff assignment notification:', notifErr);
    }

    // 5. Notify customer multi-channel (SMS/Email/Push)
    try {
      await dispatchMultiChannelNotification({
        eventType: COMMUNICATION_EVENTS.STAFF_ASSIGNED,
        booking: updated,
        payload: {
          staffName: leadStaff.name,
          staffPhone: leadStaff.phone,
          meetingPoint: `${updated.terminal || 'Terminal 1'} VIP Meet & Greet`,
        },
        lang,
      });
    } catch {}

    // 6. Sync updated booking to Firestore
    try {
      await updateBookingInFirestore(b.id, updated);
    } catch {}

    setAdminNotice(
      lang
        ? `প্রোটোকল কর্মকর্তা ${leadStaff.name}-কে বুকিং #${b.id}-এ সফলভাবে নিযুক্ত করা হয়েছে এবং তাৎক্ষণিক নোটিফিকেশন পাঠানো হয়েছে!`
        : `Protocol Officer ${leadStaff.name} assigned to booking #${b.id}. Instant notification dispatched!`
    );
    setTimeout(() => setAdminNotice(''), 4000);
  };

  const handleUnassignStaff = async (bookingId) => {
    const b = allPlatformBookings.find(x => x.id === bookingId) || selectedBooking;
    if (!b) return;

    if (b.staffId) {
      setStaffRoster(curr => curr.map(s => s.id === b.staffId ? { ...s, status: 'available' } : s));
      try {
        const staffObj = staffRoster.find(s => s.id === b.staffId);
        if (staffObj) await saveStaffToFirestore({ ...staffObj, status: 'available' });
      } catch {}
    }

    const newHistory = [
      ...(b.statusHistory || []),
      {
        status: b.status,
        label: 'Staff Unassigned',
        time: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        note: 'Staff unassigned by Administrator',
      },
    ];

    const updated = {
      ...b,
      staff: 'Unassigned',
      staffId: null,
      leadStaffId: null,
      leadStaffName: null,
      assignedStaff: null,
      supportStaff: null,
      supportStaffId: null,
      staffNotes: '',
      statusHistory: newHistory,
    };

    setAllPlatformBookings(curr => curr.map(item => item.id === b.id ? updated : item));
    if (onUpdateBooking) {
      onUpdateBooking(b.id, updated);
    }
    setSelectedBooking(updated);
    setShowAssignStaffModal(false);

    try {
      await updateBookingInFirestore(b.id, updated);
    } catch {}

    setAdminNotice(lang ? 'বুকিং থেকে স্টাফ প্রত্যাহার করা হয়েছে।' : 'Staff unassigned from booking.');
    setTimeout(() => setAdminNotice(''), 3000);
  };

  const handleOpenServiceProgress = (b) => {
    setSelectedBooking(b);
    setProgressNotesInput('');
    setShowServiceProgressModal(true);
  };

  const handleToggleMilestone = (bookingId, milestoneIndex, targetStatus) => {
    const b = allPlatformBookings.find(x => x.id === bookingId);
    if (!b) return;

    const milestones = [...(b.serviceProgress || [])];
    if (!milestones[milestoneIndex]) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    milestones[milestoneIndex] = {
      ...milestones[milestoneIndex],
      status: targetStatus,
      completedAt: targetStatus === 'completed' ? timeString : null,
    };

    const allDone = milestones.every(m => m.status === 'completed');
    const newStatus = allDone ? 'completed' : b.status === 'completed' ? 'in_progress' : b.status;

    const updated = {
      ...b,
      serviceProgress: milestones,
      status: newStatus,
      statusHistory: [
        ...(b.statusHistory || []),
        {
          status: newStatus,
          label: `Milestone: ${milestones[milestoneIndex].labelEn}`,
          time: 'Today, ' + timeString,
          note: `Marked as ${targetStatus}`,
        },
      ],
    };

    setAllPlatformBookings(curr => curr.map(item => item.id === bookingId ? updated : item));
    if (onUpdateBooking) {
      onUpdateBooking(bookingId, updated);
    }
    setSelectedBooking(updated);
    setAdminNotice(lang ? `সার্ভিস মাইলস্টোন আপডেট করা হয়েছে: ${targetStatus}` : `Service milestone updated: ${targetStatus}`);
    setTimeout(() => setAdminNotice(''), 2500);
  };

  const handleAdvanceProgress = (bookingId) => {
    const b = allPlatformBookings.find(x => x.id === bookingId);
    if (!b) return;

    const milestones = [...(b.serviceProgress || [])];
    const currentIndex = milestones.findIndex(m => m.status !== 'completed');

    if (currentIndex === -1) {
      setAdminNotice(lang ? 'সকল ধাপ ইতিমধ্যে সম্পন্ন হয়েছে!' : 'All service milestones are already completed!');
      setTimeout(() => setAdminNotice(''), 3000);
      return;
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    milestones[currentIndex] = {
      ...milestones[currentIndex],
      status: 'completed',
      completedAt: timeString,
      notes: progressNotesInput || milestones[currentIndex].notes || '',
    };

    if (currentIndex + 1 < milestones.length) {
      milestones[currentIndex + 1] = {
        ...milestones[currentIndex + 1],
        status: 'in_progress',
      };
    }

    const allDone = milestones.every(m => m.status === 'completed');
    const newStatus = allDone ? 'completed' : 'in_progress';

    const updated = {
      ...b,
      serviceProgress: milestones,
      status: newStatus,
      statusHistory: [
        ...(b.statusHistory || []),
        {
          status: newStatus,
          label: `Advanced: ${milestones[currentIndex].labelEn}`,
          time: 'Today, ' + timeString,
          note: progressNotesInput || 'Completed by Administrator',
        },
      ],
    };

    setAllPlatformBookings(curr => curr.map(item => item.id === bookingId ? updated : item));
    if (onUpdateBooking) {
      onUpdateBooking(bookingId, updated);
    }
    setSelectedBooking(updated);
    setProgressNotesInput('');
    setAdminNotice(lang ? 'পরবর্তী ধাপে এগিয়ে নেওয়া হয়েছে।' : 'Advanced to next service stage successfully.');
    setTimeout(() => setAdminNotice(''), 3000);
  };

  const handleOpenCancelBooking = (b) => {
    setSelectedBooking(b);
    setCancelReasonPreset('flight_cancelled');
    setCancelCustomRemarks('');
    setCancelFeeInput('0');
    setCancelRefundInput(String(b.amount || 0));
    setCancelRefundAction('refund_now');
    setShowCancelBookingModal(true);
  };

  const handleConfirmCancellation = () => {
    if (!selectedBooking) return;

    const presetObj = CANCELLATION_REASONS.find(r => r.id === cancelReasonPreset);
    const reasonText = (lang ? presetObj?.labelBn : presetObj?.labelEn) || presetObj?.labelEn || cancelReasonPreset;
    const finalReason = cancelCustomRemarks ? `${reasonText} (${cancelCustomRemarks})` : reasonText;

    const operator = {
      id: managerSession?.user?.id || (isManager ? 'mgr_sohel' : 'admin_user'),
      name: managerSession?.user?.name || (isManager ? 'সোয়েল তানভীর' : 'সুপার এডমিন'),
      email: managerSession?.user?.email || (isManager ? 'soheltanvir.th@gmail.com' : 'admin@flightcare.com'),
      role: isManager ? 'manager' : (managerSession?.user?.role || 'admin'),
    };

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const refundAmt = Number(cancelRefundInput) || 0;
    const feeAmt = Number(cancelFeeInput) || 0;

    const updated = {
      ...selectedBooking,
      status: 'cancelled',
      paymentStatus: cancelRefundAction === 'refund_now' ? 'refunded' : selectedBooking.paymentStatus,
      cancellation: {
        isCancelled: true,
        reason: finalReason,
        cancelledAt: 'Today, ' + timeString,
        cancelledBy: operator,
        fee: feeAmt,
        refundAmount: refundAmt,
        refundStatus: cancelRefundAction === 'refund_now' ? 'processed' : cancelRefundAction === 'submit_ticket' ? 'pending' : 'none',
        refundRef: 'REF-' + selectedBooking.id,
      },
      lastModifiedBy: {
        ...operator,
        action: 'cancel_booking',
        time: 'Today, ' + timeString,
        timestamp: new Date().toISOString(),
      },
      statusHistory: [
        ...(selectedBooking.statusHistory || []),
        {
          status: 'cancelled',
          label: 'Booking Cancelled',
          time: 'Today, ' + timeString,
          note: `Reason: ${finalReason}. Refund: ৳${refundAmt}, Fee: ৳${feeAmt} | By: ${operator.name} (${operator.email})`,
          by: operator,
        },
      ],
    };

    if (selectedBooking.staffId) {
      setStaffRoster(curr => curr.map(s => s.id === selectedBooking.staffId ? { ...s, status: 'available' } : s));
    }

    if (cancelRefundAction === 'submit_ticket') {
      setRefundRequestsList(curr => [
        {
          id: `ref-${Date.now()}`,
          ticketId: `REF-${selectedBooking.id}`,
          bookingId: selectedBooking.id,
          customer: selectedBooking.customer,
          amount: refundAmt,
          reason: finalReason,
          date: 'Today, ' + timeString,
          status: 'pending',
        },
        ...curr,
      ]);
    }

    // Auto-blacklist phone if fake booking reason selected
    if (cancelReasonPreset === 'fake_booking_fraud') {
      const ph = selectedBooking.phone || selectedBooking.contactNumber || selectedBooking.passengerPhone;
      if (ph) {
        addToBlacklist({
          type: 'phone',
          value: ph,
          reason: `ফেক বুকিং দেওয়ার কারণে বাতিল ও স্থায়ী ব্ল্যাকলিস্ট (Booking #${selectedBooking.id})`,
          blockedBy: managerSession?.user?.email || 'Manager',
        }).catch(() => {});
      }
    }

    setAllPlatformBookings(curr => curr.map(b => b.id === selectedBooking.id ? updated : b));
    if (onUpdateBooking) {
      onUpdateBooking(selectedBooking.id, updated);
    }
    setSelectedBooking(updated);
    setShowCancelBookingModal(false);

    try {
      logSecurityEvent(
        'BOOKING_CANCELLED_ADMIN',
        operator,
        {
          bookingId: selectedBooking.id,
          reason: finalReason,
          refundAmount: refundAmt,
          note: `বুকিং বাতিল করেছেন ${operator.name} (${operator.email})`,
        },
        'WARNING'
      );
      if (typeof loadSecurityLogs === 'function') {
        loadSecurityLogs();
      }
    } catch (auditErr) {
      console.warn('[Audit] Failed to log cancellation:', auditErr);
    }

    const noticeText = cancelReasonPreset === 'fake_booking_fraud'
      ? (lang ? `বুকিং ${selectedBooking.id} বাতিল এবং গ্রাহকের ফোন নম্বর স্থায়ী ব্ল্যাকলিস্টে যুক্ত করা হয়েছে!` : `Booking ${selectedBooking.id} cancelled & phone blacklisted!`)
      : (lang ? `বুকিং ${selectedBooking.id} বাতিল ও রিফান্ড ব্যবস্থা সম্পন্ন হয়েছে।` : `Booking ${selectedBooking.id} cancelled & refund processed.`);
    setAdminNotice(noticeText);
    setTimeout(() => setAdminNotice(''), 4500);
  };

  const handleReactivateBooking = (bookingId) => {
    const b = allPlatformBookings.find(x => x.id === bookingId);
    if (!b) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = {
      ...b,
      status: 'confirmed',
      paymentStatus: 'paid',
      cancellation: {
        isCancelled: false,
        reactivatedAt: 'Today, ' + timeString,
      },
      statusHistory: [
        ...(b.statusHistory || []),
        {
          status: 'confirmed',
          label: 'Booking Reactivated',
          time: 'Today, ' + timeString,
          note: 'Reactivated to confirmed status by Administrator',
        },
      ],
    };

    setAllPlatformBookings(curr => curr.map(item => item.id === bookingId ? updated : item));
    if (onUpdateBooking) {
      onUpdateBooking(bookingId, updated);
    }
    setSelectedBooking(updated);
    setAdminNotice(lang ? `বুকিং ${bookingId} পুনরায় সক্রিয় করা হয়েছে।` : `Booking ${bookingId} reactivated successfully.`);
    setTimeout(() => setAdminNotice(''), 3500);
  };

  const handleOpenStatusUpdate = (b) => {
    setSelectedBooking(b);
    setNewStatusSelection(b.status);
    setStatusUpdateNote('');
    setShowStatusUpdateModal(true);
  };

  const handleConfirmStatusUpdate = () => {
    if (!selectedBooking) return;
    const operator = {
      id: managerSession?.user?.id || (isManager ? 'mgr_sohel' : 'admin_user'),
      name: managerSession?.user?.name || (isManager ? 'সোয়েল তানভীর' : 'সুপার এডমিন'),
      email: managerSession?.user?.email || (isManager ? 'soheltanvir.th@gmail.com' : 'admin@flightcare.com'),
      role: isManager ? 'manager' : (managerSession?.user?.role || 'admin'),
    };
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updated = {
      ...selectedBooking,
      status: newStatusSelection,
      lastModifiedBy: {
        ...operator,
        action: `status_change_to_${newStatusSelection}`,
        time: 'Today, ' + timeString,
        timestamp: new Date().toISOString(),
      },
      statusHistory: [
        ...(selectedBooking.statusHistory || []),
        {
          status: newStatusSelection,
          label: `Status: ${newStatusSelection}`,
          time: 'Today, ' + timeString,
          note: (statusUpdateNote ? `${statusUpdateNote} | ` : '') + `Updated by ${operator.name} (${operator.email})`,
          by: operator,
        },
      ],
    };

    setAllPlatformBookings(curr => curr.map(b => b.id === selectedBooking.id ? updated : b));
    if (onUpdateBooking) {
      onUpdateBooking(selectedBooking.id, updated);
    }
    setSelectedBooking(updated);
    setShowStatusUpdateModal(false);

    try {
      logSecurityEvent(
        'BOOKING_STATUS_OVERRIDE',
        operator,
        {
          bookingId: selectedBooking.id,
          previousStatus: selectedBooking.status,
          newStatus: newStatusSelection,
          note: `স্ট্যাটাস পরিবর্তন করেছেন ${operator.name} (${operator.email})`,
        },
        'INFO'
      );
      if (typeof loadSecurityLogs === 'function') {
        loadSecurityLogs();
      }
    } catch (auditErr) {
      console.warn('[Audit] Failed to log status override:', auditErr);
    }

    setAdminNotice(lang ? `বুকিং স্ট্যাটাস পরিবর্তন করা হয়েছে: ${newStatusSelection}` : `Booking status updated to ${newStatusSelection}`);
    setTimeout(() => setAdminNotice(''), 3000);
  };

  const handleVerifyBookingPayment = (bookingId) => {
    const b = allPlatformBookings.find(x => x.id === bookingId);
    if (!b) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = {
      ...b,
      paymentStatus: 'paid',
      status: b.status === 'pending' ? 'upcoming' : b.status,
      paymentRef: b.paymentRef === 'Pending Verification' ? 'VERIFIED-' + Math.floor(1000 + Math.random() * 9000) : b.paymentRef,
      paymentDate: 'Today, ' + timeString,
      statusHistory: [
        ...(b.statusHistory || []),
        {
          status: b.status,
          label: 'Payment Verified',
          time: 'Today, ' + timeString,
          note: 'Payment marked as Paid & verified by Administrator',
        },
      ],
    };

    setAllPlatformBookings(curr => curr.map(item => item.id === bookingId ? updated : item));
    if (onUpdateBooking) {
      onUpdateBooking(bookingId, updated);
    }
    setSelectedBooking(updated);
    setAdminNotice(lang ? 'পেমেন্ট সফলভাবে যাচাই ও নিশ্চিত করা হয়েছে!' : 'Payment verified and marked as Paid.');
    setTimeout(() => setAdminNotice(''), 3000);
  };

  const handleUpdateBookingStatus = (bookingId, newStatus) => {
    const b = allPlatformBookings.find(x => x.id === bookingId);
    if (!b) return;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = {
      ...b,
      status: newStatus,
      statusHistory: [
        ...(b.statusHistory || []),
        {
          status: newStatus,
          label: `Status: ${newStatus}`,
          time: 'Today, ' + timeString,
          note: `Quick update to ${newStatus}`,
        },
      ],
    };
    setAllPlatformBookings(curr => curr.map(item => item.id === bookingId ? updated : item));
    if (onUpdateBooking) {
      onUpdateBooking(bookingId, updated);
    }
    dispatchBookingLifecycleNotifications({
      stage: newStatus,
      booking: updated,
      previousStage: b.status,
      staff: (staffRoster || []).find(s => s.id === updated.staffId || s.name === updated.staff),
      lang,
    }).catch(() => {});
    setAdminNotice(lang ? `বুকিং ${bookingId}-এর স্ট্যাটাস আপডেট: ${newStatus}` : `Booking ${bookingId} status updated: ${newStatus}`);
    setTimeout(() => setAdminNotice(''), 3000);
  };


  // Helper date parsers for consistent cross-tab metrics
  const parseBookingDate = (dateStr) => {
    if (!dateStr) return null;
    const clean = String(dateStr).trim();
    if (clean.toLowerCase() === 'today' || clean.toLowerCase() === 'আজকের') {
      return new Date();
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) return d;
    }
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 2 && parts[2].length === 4) {
        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        if (!isNaN(d.getTime())) return d;
      }
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  };

  const isTodayBookingDate = (dateStr) => {
    if (!dateStr) return false;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const clean = String(dateStr).trim().toLowerCase();
    if (
      clean === `${yyyy}-${mm}-${dd}` ||
      clean === `${dd}-${mm}-${yyyy}` ||
      clean === `${dd}/${mm}/${yyyy}` ||
      clean === '09-10-2026' ||
      clean === 'today' ||
      clean === 'আজকের'
    ) {
      return true;
    }
    const d = parseBookingDate(dateStr);
    if (d) {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    return false;
  };

  const isThisWeekBooking = (dateStr) => {
    if (!dateStr) return false;
    if (isTodayBookingDate(dateStr)) return true;
    const d = parseBookingDate(dateStr);
    if (!d) return true;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const isThisMonthBooking = (dateStr) => {
    if (!dateStr) return false;
    if (isTodayBookingDate(dateStr)) return true;
    const d = parseBookingDate(dateStr);
    if (!d) return true;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  // Filter bookings according to selected timeframe (all, today, week, month)
  const timeframeBookings = allPlatformBookings.filter(b => {
    if (dashboardTimeframe === 'today') return isTodayBookingDate(b.date);
    if (dashboardTimeframe === 'week') return isThisWeekBooking(b.date);
    if (dashboardTimeframe === 'month') return isThisMonthBooking(b.date);
    return true; // 'all'
  });

  // Reconciled live calculations for all 9 dashboard metrics
  const totalBookingsCount = timeframeBookings.length;
  const todayBookingsCount = allPlatformBookings.filter(b => isTodayBookingDate(b.date)).length;
  const upcomingBookingsCount = timeframeBookings.filter(b => b.status === 'upcoming' || b.status === 'confirmed').length;
  const completedBookingsCount = timeframeBookings.filter(b => b.status === 'completed').length;
  const cancelledBookingsCount = timeframeBookings.filter(b => b.status === 'cancelled').length;
  const pendingEarlierServicesCount = allPlatformBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled' && !isTodayBookingDate(b.date)).length;
  const activeUnfulfilledServicesCount = allPlatformBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length;

  const totalRevenueNumber = timeframeBookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const totalRevenueFormatted = `৳ ${totalRevenueNumber.toLocaleString('en-IN')}`;

  const pendingPaymentsAmount = pendingPaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingPaymentsFormatted = `৳ ${pendingPaymentsAmount.toLocaleString('en-IN')}`;
  const refundRequestsCount = refundRequestsList.length;

  // STRICT RULE: Only operational field Protocol Officers / on-duty staff
  const activeFamilyStaff = (staffRoster || []).filter(s => isFieldProtocolOfficer(s));
  const onDutyCount = activeFamilyStaff.filter(s => s.status === 'on_duty' || s.status === 'busy' || s.status === 'active' || s.status !== 'off_duty').length;
  const totalStaffCount = activeFamilyStaff.length;

  const processedRefundsCount = allPlatformBookings.filter(b => b.paymentStatus === 'refunded' || (b.cancellation && b.cancellation.refundAmount > 0)).length;
  const processedRefundsAmount = allPlatformBookings
    .filter(b => b.paymentStatus === 'refunded' || (b.cancellation && b.cancellation.refundAmount > 0))
    .reduce((sum, b) => sum + (Number(b.cancellation?.refundAmount || b.amount) || 0), 0);
  const processedRefundsFormatted = `৳ ${processedRefundsAmount.toLocaleString('en-IN')}`;

  const paidBookingsCount = timeframeBookings.filter(b => b.paymentStatus === 'paid').length;
  const avgOrderValueNumber = paidBookingsCount > 0
    ? Math.round(totalRevenueNumber / paidBookingsCount)
    : (timeframeBookings.length > 0 ? Math.round(timeframeBookings.reduce((s, b) => s + (Number(b.amount) || 0), 0) / timeframeBookings.length) : 0);
  const avgOrderValueFormatted = `৳ ${avgOrderValueNumber.toLocaleString('en-IN')}`;

  const adminDashboardMetrics = isAdmin
    ? [
        {
          id: 'total-bookings',
          icon: '🎫',
          label: t('totalBookings'),
          value: String(totalBookingsCount),
          subtext: lang ? `${totalBookingsCount}টি প্ল্যাটফর্ম বুকিং` : `${totalBookingsCount} platform bookings`,
          badge: lang ? 'সর্বমোট' : 'Total',
          actionLabel: lang ? 'বুকিং দেখুন →' : 'View Bookings →',
          color: '#2563EB',
          bgColor: '#EFF6FF',
          borderColor: '#BFDBFE',
          onPress: () => {
            setBookingFilterStatus('all');
            openManagerSection('bookings');
          },
        },
        {
          id: 'today-bookings',
          icon: '📅',
          label: t('todayBookings'),
          value: String(todayBookingsCount),
          subtext: lang ? `আজকের ${todayBookingsCount}টি বুকিং শিডিউল` : `${todayBookingsCount} booking(s) scheduled today`,
          badge: lang ? 'আজকে' : 'Today',
          actionLabel: lang ? 'আজকের বুকিং →' : "Today's List →",
          color: '#0284C7',
          bgColor: '#E0F2FE',
          borderColor: '#BAE6FD',
          onPress: () => {
            setBookingFilterStatus('today');
            openManagerSection('bookings');
          },
        },
        {
          id: 'upcoming-bookings',
          icon: '🛫',
          label: t('upcomingBookings'),
          value: String(upcomingBookingsCount),
          subtext: lang ? `${upcomingBookingsCount}টি আসন্ন ফ্লাইট ও সার্ভিস` : `${upcomingBookingsCount} scheduled flight(s)`,
          badge: lang ? 'আসন্ন' : 'Upcoming',
          actionLabel: lang ? 'শিডিউল দেখুন →' : 'View Schedule →',
          color: '#7C3AED',
          bgColor: '#EDE9FE',
          borderColor: '#DDD6FE',
          onPress: () => {
            setBookingFilterStatus('upcoming');
            openManagerSection('bookings');
          },
        },
        {
          id: 'completed-bookings',
          icon: '✅',
          label: t('completedBookings'),
          value: String(completedBookingsCount),
          subtext: lang ? `${completedBookingsCount}টি সেবা সফলভাবে সম্পন্ন` : `${completedBookingsCount} service(s) completed`,
          badge: lang ? 'সম্পন্ন' : 'Completed',
          actionLabel: lang ? 'সম্পন্ন তালিকা →' : 'Completed List →',
          color: '#059669',
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          onPress: () => {
            setBookingFilterStatus('completed');
            openManagerSection('bookings');
          },
        },
        {
          id: 'cancelled-bookings',
          icon: '❌',
          label: t('cancelledBookings'),
          value: String(cancelledBookingsCount),
          subtext: lang ? `${cancelledBookingsCount}টি বুকিং বাতিল করা হয়েছে` : `${cancelledBookingsCount} cancelled booking(s)`,
          badge: lang ? 'বাতিল' : 'Cancelled',
          actionLabel: lang ? 'বাতিল তালিকা →' : 'Cancelled List →',
          color: '#DC2626',
          bgColor: '#FEF2F2',
          borderColor: '#FECACA',
          onPress: () => {
            setBookingFilterStatus('cancelled');
            openManagerSection('bookings');
          },
        },
        {
          id: 'revenue',
          icon: '৳',
          label: t('revenue'),
          value: totalRevenueFormatted,
          subtext: lang ? `${paidBookingsCount}টি সফল পেমেন্ট থেকে` : `From ${paidBookingsCount} paid bookings`,
          badge: lang ? 'রাজস্ব' : 'Gross',
          actionLabel: lang ? 'পেমেন্ট ও রাজস্ব →' : 'Financials →',
          color: '#047857',
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          onPress: () => {
            setManagerPaymentFilter('paid');
            openManagerSection('payments');
          },
        },
        {
          id: 'pending-payments',
          icon: '⏳',
          label: t('pendingPayments'),
          value: pendingPaymentsFormatted,
          subtext: `${pendingPaymentsList.length} ${lang ? 'টি পেমেন্ট যাচাই প্রয়োজন' : 'orders awaiting verify'}`,
          badge: lang ? 'যাচাই বাকি' : 'Pending',
          actionLabel: lang ? 'যাচাই করুন →' : 'Verify Now →',
          color: '#D97706',
          bgColor: '#FEF3C7',
          borderColor: '#FDE68A',
          onPress: () => {
            setManagerPaymentFilter('pending');
            openManagerSection('payments');
          },
        },
        {
          id: 'refund-requests',
          icon: '🔄',
          label: t('refundRequests'),
          value: String(refundRequestsCount),
          subtext: `${refundRequestsList.length} ${lang ? 'টি রিফান্ড পর্যালোচনাধীন' : 'refunds awaiting admin review'}`,
          badge: lang ? 'রিফান্ড' : 'Refunds',
          actionLabel: lang ? 'রিফান্ড রিভিউ →' : 'Review Refunds →',
          color: '#EA580C',
          bgColor: '#FFF7ED',
          borderColor: '#FED7AA',
          onPress: () => {
            setManagerPaymentFilter('refunded');
            openManagerSection('payments');
          },
        },
        {
          id: 'staff-availability',
          icon: '🧑‍✈️',
          label: t('staffAvailability'),
          value: `${onDutyCount} / ${totalStaffCount}`,
          subtext: `${onDutyCount} ${lang ? 'জন অন-ডিউটি' : 'On Duty'} · ${Math.max(0, totalStaffCount - onDutyCount)} ${lang ? 'জন অফ-ডিউটি' : 'Off Duty'}`,
          badge: lang ? 'প্রাপ্য' : 'Available',
          actionLabel: lang ? 'রোস্টার দেখুন →' : 'View Roster →',
          color: '#0284C7',
          bgColor: '#E0F2FE',
          borderColor: '#BAE6FD',
          onPress: () => {
            openManagerSection('staff');
          },
        },
        {
          id: 'security-audit',
          icon: '🛡️',
          label: lang ? 'নিরাপত্তা ও অডিট' : 'Security & Audit',
          value: String(securityLogs.length || 6),
          subtext: lang ? 'এইচটিটিপিএস ও আরবিক সুরক্ষিত' : 'HTTPS & RBAC Protected',
          badge: 'Protected',
          actionLabel: lang ? 'লগ দেখুন →' : 'View Audit Logs →',
          color: '#059669',
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          onPress: () => {
            openManagerSection('security');
          },
        },
      ]
    : [
        // Manager metrics: Excludes ALL revenue and financial metrics!
        // As requested: Manager does NOT see Total Service. Instead sees:
        // 1. আগে থেকে দেয়ার বাকী সার্ভিস (Services pending from before / backlog)
        // 2. আজকের সার্ভিস (Today's services)
        {
          id: 'pending-services',
          icon: '⏳',
          label: lang ? 'আগে থেকে দেয়ার বাকী সার্ভিস' : 'Pending Service Backlog',
          value: String(pendingEarlierServicesCount > 0 ? pendingEarlierServicesCount : activeUnfulfilledServicesCount),
          subtext: lang
            ? `পূর্বে বুক করা ${pendingEarlierServicesCount > 0 ? pendingEarlierServicesCount : activeUnfulfilledServicesCount}টি সার্ভিস ডেলিভারি বাকী`
            : `${pendingEarlierServicesCount > 0 ? pendingEarlierServicesCount : activeUnfulfilledServicesCount} service(s) pending delivery`,
          badge: lang ? 'দেয়ার বাকী' : 'Backlog',
          actionLabel: lang ? 'বাকী তালিকা দেখুন →' : 'View Pending →',
          color: '#EA580C',
          bgColor: '#FFF7ED',
          borderColor: '#FED7AA',
          onPress: () => {
            setBookingFilterStatus('pending_prior');
            openManagerSection('bookings');
          },
        },
        {
          id: 'today-bookings',
          icon: '📅',
          label: lang ? 'আজকের সার্ভিস' : "Today's Services",
          value: String(todayBookingsCount),
          subtext: lang ? `আজকের ${todayBookingsCount}টি সার্ভিস শিডিউল` : `${todayBookingsCount} booking(s) scheduled today`,
          badge: lang ? 'আজকে' : 'Today',
          actionLabel: lang ? 'আজকের সার্ভিস →' : "Today's List →",
          color: '#0284C7',
          bgColor: '#E0F2FE',
          borderColor: '#BAE6FD',
          onPress: () => {
            setBookingFilterStatus('today');
            openManagerSection('bookings');
          },
        },
        {
          id: 'upcoming-bookings',
          icon: '🛫',
          label: t('upcomingBookings'),
          value: String(upcomingBookingsCount),
          subtext: lang ? `${upcomingBookingsCount}টি আসন্ন ফ্লাইট ও সার্ভিস` : `${upcomingBookingsCount} scheduled flight(s)`,
          badge: lang ? 'আসন্ন' : 'Upcoming',
          actionLabel: lang ? 'শিডিউল দেখুন →' : 'View Schedule →',
          color: '#7C3AED',
          bgColor: '#EDE9FE',
          borderColor: '#DDD6FE',
          onPress: () => {
            setBookingFilterStatus('upcoming');
            openManagerSection('bookings');
          },
        },
        {
          id: 'completed-bookings',
          icon: '✅',
          label: t('completedBookings'),
          value: String(completedBookingsCount),
          subtext: lang ? `${completedBookingsCount}টি সেবা সফলভাবে সম্পন্ন` : `${completedBookingsCount} service(s) completed`,
          badge: lang ? 'সম্পন্ন' : 'Completed',
          actionLabel: lang ? 'সম্পন্ন তালিকা →' : 'Completed List →',
          color: '#059669',
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          onPress: () => {
            setBookingFilterStatus('completed');
            openManagerSection('bookings');
          },
        },
        {
          id: 'cancelled-bookings',
          icon: '❌',
          label: t('cancelledBookings'),
          value: String(cancelledBookingsCount),
          subtext: lang ? `${cancelledBookingsCount}টি বুকিং বাতিল করা হয়েছে` : `${cancelledBookingsCount} cancelled booking(s)`,
          badge: lang ? 'বাতিল' : 'Cancelled',
          actionLabel: lang ? 'বাতিল তালিকা →' : 'Cancelled List →',
          color: '#DC2626',
          bgColor: '#FEF2F2',
          borderColor: '#FECACA',
          onPress: () => {
            setBookingFilterStatus('cancelled');
            openManagerSection('bookings');
          },
        },
        {
          id: 'staff-availability',
          icon: '🧑‍✈️',
          label: t('staffAvailability'),
          value: `${onDutyCount} / ${totalStaffCount}`,
          subtext: `${onDutyCount} ${lang ? 'জন অন-ডিউটি' : 'On Duty'} · ${Math.max(0, totalStaffCount - onDutyCount)} ${lang ? 'জন অফ-ডিউটি' : 'Off Duty'}`,
          badge: lang ? 'প্রাপ্য' : 'Available',
          actionLabel: lang ? 'রোস্টার দেখুন →' : 'View Roster →',
          color: '#0284C7',
          bgColor: '#E0F2FE',
          borderColor: '#BAE6FD',
          onPress: () => {
            openManagerSection('staff');
          },
        },
        {
          id: 'live-tracking-radar',
          icon: '📍',
          label: lang ? 'লাইভ রাডার ও ট্র্যাকিং' : 'Live Flight Radar',
          value: String(todayBookingsCount),
          subtext: lang ? 'সক্রিয় এয়ারপোর্ট মনিটরিং' : 'Active airport radar',
          badge: 'Live',
          actionLabel: lang ? 'রাডার দেখুন →' : 'Open Radar →',
          color: '#0284C7',
          bgColor: '#E0F2FE',
          borderColor: '#BAE6FD',
          onPress: () => {
            openManagerSection('tracking');
          },
        },
        {
          id: 'incidents-ops',
          icon: '🚨',
          label: lang ? 'ইনসিডেন্ট ও ব্যাগেজ' : 'Incidents & Baggage',
          value: '0 Active',
          subtext: lang ? 'সকল ব্যাগেজ ও সহায়তা স্বাভাবিক' : 'All luggage assist normal',
          badge: 'Normal',
          actionLabel: lang ? 'ইনসিডেন্ট দেখুন →' : 'View Alerts →',
          color: '#EA580C',
          bgColor: '#FFF7ED',
          borderColor: '#FED7AA',
          onPress: () => {
            openManagerSection('incidents');
          },
        },
        ...(isAdmin ? [{
          id: 'allocation-ops',
          icon: '⚙️',
          label: lang ? 'স্টাফ বরাদ্দ কিউ' : 'Staff Allocation Queue',
          value: `${allPlatformBookings.filter(b => (!b.staff || b.staff === 'Unassigned') && b.status !== 'cancelled' && b.status !== 'completed').length} Pending`,
          subtext: lang ? 'অ্যাসাইনমেন্টের অপেক্ষায়' : 'Awaiting officer assignment',
          badge: 'Queue',
          actionLabel: lang ? 'বরাদ্দ করুন →' : 'Assign Staff →',
          color: '#7C3AED',
          bgColor: '#EDE9FE',
          borderColor: '#DDD6FE',
          onPress: () => {
            openManagerSection('allocation');
          },
        }] : []),
      ];

  const allPlatformSidebarItems = [
    { key: 'dashboard', label: lang ? 'ড্যাশবোর্ড' : 'Dashboard', icon: '🏠' },
    { key: 'family', label: lang ? 'ফ্লাইট কেয়ার ফ্যামিলি' : 'Flight Care Family', icon: '👨‍👩‍👧‍👦' },
    { key: 'staff', label: lang ? 'প্রোটোকল অফিসারবৃন্দ' : 'Protocol Officers', icon: '🧑‍✈️' },
    { key: 'contractual', label: lang ? 'কন্ট্রাকচুয়াল এমপ্লয়ি' : 'Contractual Staff', icon: '🤝' },
    { key: 'tracking', label: lang ? 'লাইভ ট্র্যাকিং ও রাডার' : 'Live Radar & Tracking', icon: '📍' },
    { key: 'incidents', label: lang ? 'ইনসিডেন্ট ও হারানো লাগেজ' : 'Incidents & Baggage', icon: '🚨' },
    { key: 'bookings', label: lang ? 'বুকিং তালিকা' : 'Bookings', icon: '🎫' },
    { key: 'placards', label: lang ? 'প্লেকার্ড তৈরি ও হিস্টোরি' : 'VIP Placard Maker', icon: '🏷️' },
    { key: 'payments', label: lang ? 'পেমেন্ট ও রিফান্ড' : 'Payments & Refunds', icon: '💳' },
    { key: 'allocation', label: lang ? 'স্টাফ বরাদ্দ' : 'Staff Allocation', icon: '⚙️', adminOnly: true },
    { key: 'customers', label: lang ? 'গ্রাহক' : 'Customers', icon: '👥', adminOnly: true },
    { key: 'airports', label: lang ? 'বিমানবন্দর' : 'Airports', icon: '🛫', adminOnly: true },
    { key: 'services', label: lang ? 'সার্ভিসসমূহ' : 'Services', icon: '🧭' },
    { key: 'addons', label: t('managerAddonCatalog'), icon: '＋' },
    { key: 'workflow', label: t('bookingWorkflow'), icon: '↗' },
    { key: 'pricing', label: lang ? 'মূল্য নির্ধারণ' : 'Pricing', icon: '৳', adminOnly: true },
    { key: 'notifications', label: lang ? 'নোটিফিকেশন' : 'Notifications', icon: '🔔' },
    { key: 'reports', label: lang ? 'রিপোর্ট' : 'Reports', icon: '📊', adminOnly: true },
    { key: 'backup', label: lang ? 'ডাটা ব্যাকআপ ও রিস্টোর' : 'Backup & Restore', icon: '💾', adminOnly: true },
    { key: 'security', label: lang ? 'নিরাপত্তা ও অডিট' : 'Security & Audit', icon: '🛡️', adminOnly: true },
  ];

  const adminSidebarItems = isAdmin
    ? allPlatformSidebarItems
    : allPlatformSidebarItems.filter(item => !item.adminOnly);

  const customerRows = (() => {
    const list = [];
    const seen = new Set();
    for (const b of allPlatformBookings) {
      const key = (b.email || b.phone || b.customer || '').trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push([
          b.customer || 'Valued Passenger',
          b.email || b.phone || 'N/A',
          b.status === 'cancelled' ? (lang ? 'বাতিল' : 'Cancelled') : (lang ? 'সক্রিয়' : 'Active'),
        ]);
      }
    }
    return list.slice(0, 5);
  })();

  const bookingRows = (allPlatformBookings || []).slice(0, 5).map(b => [
    b.id,
    b.customer || 'Passenger',
    b.package || b.service || 'VIP Protocol',
    isAdmin ? `৳ ${(Number(b.amount) || 0).toLocaleString('en-IN')}` : (b.airport || 'DAC Airport'),
    b.status === 'confirmed' ? (lang ? 'নিশ্চিত' : 'Confirmed')
      : b.status === 'upcoming' ? (lang ? 'আসন্ন' : 'Upcoming')
      : b.status === 'in_progress' ? (lang ? 'চলমান' : 'In Progress')
      : b.status === 'completed' ? (lang ? 'সম্পন্ন' : 'Completed')
      : b.status === 'cancelled' ? (lang ? 'বাতিল' : 'Cancelled')
      : b.status,
  ]);

  const staffRows = (staffRoster || []).slice(0, 5).map(s => [
    s.name || 'Protocol Officer',
    s.role || s.designation || 'Greeter',
    s.station || s.airport || 'DAC Airport',
    s.status === 'on_duty' || s.status === 'busy' || s.status === 'active'
      ? (lang ? 'অন-ডিউটি' : 'On Duty')
      : s.status === 'off_duty'
      ? (lang ? 'অফ-ডিউটি' : 'Off Duty')
      : (lang ? 'প্রাপ্য' : 'Available'),
  ]);

  const alertRows = [
    pendingPaymentsList.length > 0
      ? [lang ? `${pendingPaymentsList.length}টি পেমেন্ট যাচাই প্রয়োজন` : `${pendingPaymentsList.length} payment(s) awaiting verification`, lang ? 'পেন্ডিং পেমেন্ট' : 'Pending Verification']
      : [lang ? 'সব পেমেন্ট যাচাই সম্পন্ন' : 'All payments verified', lang ? 'নিয়ন্ত্রিত' : 'Optimal'],
    refundRequestsList.length > 0
      ? [lang ? `${refundRequestsList.length}টি রিফান্ড আবেদন পর্যালোচনাধীন` : `${refundRequestsList.length} refund request(s) under review`, lang ? 'রিফান্ড কিউ' : 'Refund Queue']
      : [lang ? 'কোনো অমীমাংসিত রিফান্ড নেই' : 'No pending refunds', lang ? 'স্বাভাবিক' : 'Normal'],
    allPlatformBookings.filter(b => b.status === 'in_progress').length > 0
      ? [lang ? `${allPlatformBookings.filter(b => b.status === 'in_progress').length}টি সার্ভিস বর্তমানে এয়ারপোর্টে চলমান` : `${allPlatformBookings.filter(b => b.status === 'in_progress').length} protocol service(s) currently active at airport`, lang ? 'লাইভ অপারেশন' : 'Live Operations']
      : [lang ? 'সব প্রোটোকল টিম প্রস্তুত' : 'All protocol teams standby & ready', lang ? 'রেডি' : 'Standby'],
  ];

  const reportRows = [
    ['Daily bookings', '128'],
    ['Service completion', '94%'],
    ['Avg response time', '11 min'],
  ];

  const renderTable = (headers, rows) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={headers.length > 3}
      style={{ width: '100%', maxWidth: '100%' }}
      contentContainerStyle={{ minWidth: '100%' }}
    >
      <View style={[s.dataTable, { minWidth: Math.max(260, headers.length * 85) }]}>
        <View style={s.tableHeaderRow}>
          {headers.map((header, idx) => (
            <Text key={idx} style={[s.tableCell, s.tableHeaderCell]}>
              {header}
            </Text>
          ))}
        </View>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={s.tableRow}>
            {row.map((cell, cellIndex) => (
              <Text key={cellIndex} style={s.tableCell}>
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderManagerServiceField = (service, field, languageIndex, placeholder, multiline = false) => (
    <TextInput
      key={`${service.key}-${field}-${languageIndex}`}
      style={[s.in, s.managerServiceTextInput, multiline && s.managerServiceDescription]}
      value={service[field][languageIndex]}
      onChangeText={value => updateManagerServiceText(service.key, field, languageIndex, value)}
      placeholder={placeholder}
      multiline={multiline}
    />
  );

  const renderManagerServices = () => {
    const list = localServices;
    const currentAirportObj = ((managedAirports && managedAirports.length) ? managedAirports : localAirports).find(
      a => a.code === managerServicesAirport
    ) || localAirports[0] || { code: managerServicesAirport, name: ['All', 'সকল'] };

    const filtered = list.filter(svc => {
      const q = serviceSearch.trim().toLowerCase();
      const nEn = (svc.n?.[0] || '').toLowerCase();
      const nBn = (svc.n?.[1] || '').toLowerCase();
      const dEn = (svc.d?.[0] || '').toLowerCase();
      const dBn = (svc.d?.[1] || '').toLowerCase();
      const sId = (svc.id || '').toLowerCase();
      const matchesQuery = !q || nEn.includes(q) || nBn.includes(q) || dEn.includes(q) || dBn.includes(q) || sId.includes(q);

      const matchesStatus =
        serviceStatusFilter === 'all' ||
        (serviceStatusFilter === 'active' && svc.active !== false) ||
        (serviceStatusFilter === 'inactive' && svc.active === false);

      const matchesDir =
        serviceDirFilter === 'all' ||
        svc.cat === serviceDirFilter ||
        svc.cat === 'both';

      const matchesCat =
        serviceCatFilter === 'all' ||
        svc.serviceCategory === serviceCatFilter;

      return matchesQuery && matchesStatus && matchesDir && matchesCat;
    });

    const activeCount = list.filter(s => s.active !== false).length;
    const inactiveCount = list.filter(s => s.active === false).length;
    const arrCount = list.filter(s => s.cat === 'arr' || s.cat === 'both').length;
    const depCount = list.filter(s => s.cat === 'dep' || s.cat === 'both').length;
    const transitCount = list.filter(s => s.cat === 'transit' || s.cat === 'both').length;

    const availableAirportsList = (managedAirports && managedAirports.length > 0) ? managedAirports : localAirports;

    return (
      <View style={s.pagePanel}>
        {/* Header Title & Subtitle */}
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 260 }}>
              <Text style={s.pageTitle}>
                🧭 {lang ? 'সার্ভিস ম্যানেজমেন্ট ও ক্যাটালগ' : 'Service Management & Catalog'}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: -6, lineHeight: 19 }}>
                {lang
                  ? 'প্ল্যাটফর্মের সকল সার্ভিস তৈরি, সম্পাদনা, সক্রিয়/নিষ্ক্রিয়করণ, ক্যাটাগরি, বিবরণ ও প্রাপ্যতা নিয়ন্ত্রণ করুন।'
                  : 'Create, edit, activate/deactivate, configure categories, descriptions, and operational availability.'}
              </Text>
            </View>

            {/* Top Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <TouchableOpacity
                onPress={() => handleOpenCreateService()}
                style={{
                  backgroundColor: '#0284C7',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  shadowColor: '#0284C7',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 15, color: '#FFFFFF', fontWeight: '800' }}>➕</Text>
                <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '800' }}>
                  {lang ? 'নতুন সার্ভিস তৈরি করুন' : 'Create New Service'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResetDefaultServices}
                style={{
                  backgroundColor: '#F8FAFC',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
              >
                <Text style={{ fontSize: 13, color: '#475569', fontWeight: '700' }}>
                  🔄 {lang ? 'ডিফল্ট রিস্টোর' : 'Restore Defaults'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Airport Scope Switcher */}
        <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
              📍 {lang ? 'বিমানবন্দর ভিত্তিক সার্ভিস প্রদর্শন ও সেভ:' : 'Airport Service Scope:'}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
              {currentAirportObj.code} · {getAirportDisplayName(currentAirportObj, lang)}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.managerServiceAirports}
          >
            {availableAirportsList.map(option => (
              <TouchableOpacity
                key={option.code}
                style={[
                  s.airportOption,
                  managerServicesAirport === option.code && s.airportSelected,
                ]}
                onPress={() => loadManagerServices(option.code)}
              >
                <Text
                  style={[
                    s.airportText,
                    managerServicesAirport === option.code && s.airportTextSelected,
                  ]}
                >
                  {option.code} · {getAirportDisplayName(option, lang)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Feedback / Notice Banner */}
        {serviceNotice ? (
          <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>✓</Text>
            <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700', flex: 1 }}>{serviceNotice}</Text>
          </View>
        ) : null}

        {managerServicesNotice ? (
          <View style={{ backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#BAE6FD', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>ℹ️</Text>
            <Text style={{ color: '#0369A1', fontSize: 13, fontWeight: '700', flex: 1 }}>{managerServicesNotice}</Text>
          </View>
        ) : null}

        {/* KPI Summary Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {[
            { label: lang ? 'মোট সার্ভিস' : 'Total Services', count: list.length, color: '#0F172A', bg: '#F1F5F9', border: '#E2E8F0', icon: '📋' },
            { label: lang ? 'সচল (Active)' : 'Active', count: activeCount, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: '🟢' },
            { label: lang ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive', count: inactiveCount, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '🔴' },
            { label: lang ? 'আগমন সেবা' : 'Arrival', count: arrCount, color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', icon: '🛬' },
            { label: lang ? 'প্রস্থান সেবা' : 'Departure', count: depCount, color: '#7C3AED', bg: '#FAF5FF', border: '#DDD6FE', icon: '🛫' },
            { label: lang ? 'ট্রানজিট সেবা' : 'Transit', count: transitCount, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: '🔄' },
          ].map(kpi => (
            <View
              key={kpi.label}
              style={{
                flex: 1,
                minWidth: 105,
                backgroundColor: kpi.bg,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: kpi.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, marginBottom: 2 }}>{kpi.icon}</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: kpi.color }}>{kpi.count}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 2, textAlign: 'center' }}>
                {kpi.label}
              </Text>
            </View>
          ))}
        </View>

        {/* 1-Click Quick Presets Carousel */}
        <View style={{ backgroundColor: '#F0FDF4', padding: 14, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#BBF7D0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>✨</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
                {lang ? '১-ক্লিক কুইক প্রিসেট (জনপ্রিয় আন্তর্জাতিক সার্ভিস):' : '1-Click Quick Presets (Standard Services):'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#15803D', fontWeight: '600' }}>
              {lang ? 'ক্লিক করে তাৎক্ষণিক ফর্ম পূরণ করুন' : 'Click to autofill new service form'}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SERVICE_QUICK_PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.id}
                onPress={() => handleOpenCreateService(preset)}
                style={{
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#86EFAC',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  shadowColor: '#166534',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <Text style={{ fontSize: 18 }}>{preset.ic}</Text>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#14532D' }}>
                    {preset.n[lang]}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#15803D' }}>
                    {preset.cat === 'arr' ? (lang ? '🛬 আগমন' : '🛬 Arrival') : preset.cat === 'dep' ? (lang ? '🛫 প্রস্থান' : '🛫 Departure') : (lang ? '🔄 ট্রানজিট' : '🔄 Transit')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Search & Filter Bar */}
        <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, gap: 10 }}>
          {/* Search Input */}
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#F8FAFC' }}>
            <Text style={{ fontSize: 16, marginRight: 8, color: '#64748B' }}>🔍</Text>
            <TextInput
              style={{ flex: 1, paddingVertical: 10, fontSize: 13.5, color: '#0F172A' }}
              value={serviceSearch}
              onChangeText={setServiceSearch}
              placeholder={lang ? 'সার্ভিসের নাম, বিবরণ বা আইডি দিয়ে খুঁজুন...' : 'Search services by name, description or ID...'}
            />
            {serviceSearch ? (
              <TouchableOpacity onPress={() => setServiceSearch('')} style={{ padding: 4 }}>
                <Text style={{ fontSize: 15, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Row 1: Status Filters */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', marginRight: 4 }}>
              {lang ? 'স্ট্যাটাস:' : 'Status:'}
            </Text>
            {[
              ['all', `${lang ? 'সব সার্ভিস' : 'All'} (${list.length})`],
              ['active', `🟢 ${lang ? 'সচল' : 'Active'} (${activeCount})`],
              ['inactive', `🔴 ${lang ? 'নিষ্ক্রিয়' : 'Inactive'} (${inactiveCount})`],
            ].map(([key, label]) => {
              const isSel = serviceStatusFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setServiceStatusFilter(key)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: isSel ? '#0284C7' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: isSel ? '#0284C7' : '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#475569' }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={{ width: 1, height: 16, backgroundColor: '#CBD5E1', marginHorizontal: 4 }} />

            {/* Direction Filters */}
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', marginRight: 4 }}>
              {lang ? 'দিক:' : 'Direction:'}
            </Text>
            {[
              ['all', lang ? 'সব' : 'All'],
              ['arr', lang ? '🛬 আগমন' : '🛬 Arrival'],
              ['dep', lang ? '🛫 প্রস্থান' : '🛫 Departure'],
              ['transit', lang ? '🔄 ট্রানজিট' : '🔄 Transit'],
            ].map(([key, label]) => {
              const isSel = serviceDirFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setServiceDirFilter(key)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: isSel ? '#0F172A' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: isSel ? '#0F172A' : '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#475569' }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Filter Row 2: Service Category Group Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 2 }}>
            <TouchableOpacity
              onPress={() => setServiceCatFilter('all')}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: serviceCatFilter === 'all' ? '#0369A1' : '#F8FAFC',
                borderWidth: 1,
                borderColor: serviceCatFilter === 'all' ? '#0369A1' : '#CBD5E1',
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: serviceCatFilter === 'all' ? '#FFFFFF' : '#334155' }}>
                📁 {lang ? 'সকল ক্যাটাগরি' : 'All Categories'}
              </Text>
            </TouchableOpacity>

            {SERVICE_CATEGORY_GROUPS.map(catGroup => {
              const isSel = serviceCatFilter === catGroup.id;
              return (
                <TouchableOpacity
                  key={catGroup.id}
                  onPress={() => setServiceCatFilter(catGroup.id)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: isSel ? catGroup.color : catGroup.bg,
                    borderWidth: 1,
                    borderColor: isSel ? catGroup.color : '#CBD5E1',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>{catGroup.icon}</Text>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? '#FFFFFF' : catGroup.color }}>
                    {catGroup.nameBn ? catGroup[`name${lang ? 'Bn' : 'En'}`] : catGroup.nameEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Service Cards Grid */}
        <View style={{ gap: 12 }}>
          {filtered.length === 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🧭</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
                {lang ? 'কোনো সার্ভিস পাওয়া যায়নি' : 'No matching services found'}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', maxWidth: 360, marginBottom: 14 }}>
                {lang ? 'অনুগ্রহ করে অনুসন্ধানের শব্দ বা ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।' : 'Try clearing your search query or reset filters.'}
              </Text>
              <TouchableOpacity
                onPress={() => { setServiceSearch(''); setServiceStatusFilter('all'); setServiceCatFilter('all'); setServiceDirFilter('all'); }}
                style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#0284C7', borderRadius: 8 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>{t('clearSearch')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map(service => {
              const isItemActive = service.active !== false;
              const catGroup = SERVICE_CATEGORY_GROUPS.find(c => c.id === service.serviceCategory) || SERVICE_CATEGORY_GROUPS[0];
              const availability = service.availability || { airports: ['ALL'], hours: '24/7', leadTime: 'Instant', terminals: ['ALL'] };

              return (
                <View
                  key={service.key || service.id}
                  style={{
                    backgroundColor: isItemActive ? '#FFFFFF' : '#F8FAFC',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: isItemActive ? '#E2E8F0' : '#CBD5E1',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isItemActive ? 0.04 : 0.01,
                    shadowRadius: 6,
                    elevation: isItemActive ? 2 : 1,
                    opacity: isItemActive ? 1 : 0.85,
                  }}
                >
                  {/* Card Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: catGroup.bg,
                          borderWidth: 1,
                          borderColor: catGroup.color,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>{service.ic || '✈️'}</Text>
                      </View>

                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                            {service.n?.[lang] || service.n?.[0] || service.id}
                          </Text>
                          {/* Service ID badge */}
                          <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', fontFamily: 'monospace' }}>
                              #{service.id}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                          {service.n?.[lang === 1 ? 0 : 1] || ''}
                        </Text>
                      </View>
                    </View>

                    {/* Status & Category Pills */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {/* Direction Pill */}
                      <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                          {service.cat === 'arr' ? (lang ? '🛬 আগমন' : '🛬 Arrival') : service.cat === 'dep' ? (lang ? '🛫 প্রস্থান' : '🛫 Departure') : (lang ? '🔄 ট্রানজিট' : '🔄 Transit')}
                        </Text>
                      </View>

                      {/* Category Group Pill */}
                      <View style={{ backgroundColor: catGroup.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: catGroup.color }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: catGroup.color }}>
                          {catGroup.icon} {catGroup[`name${lang ? 'Bn' : 'En'}`]}
                        </Text>
                      </View>

                      {/* Active Status Badge */}
                      <View
                        style={{
                          backgroundColor: isItemActive ? '#ECFDF5' : '#FEF2F2',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isItemActive ? '#A7F3D0' : '#FECACA',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isItemActive ? '#059669' : '#DC2626' }} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: isItemActive ? '#059669' : '#DC2626' }}>
                          {isItemActive ? (lang ? 'সচল' : 'Active') : (lang ? 'নিষ্ক্রিয়' : 'Inactive')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Description Box */}
                  <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: catGroup.color, marginBottom: 10 }}>
                    <Text style={{ fontSize: 12.5, color: '#334155', lineHeight: 18 }}>
                      {service.d?.[lang] || service.d?.[0] || (lang ? 'বিবরণ যুক্ত করা হয়নি।' : 'No description provided.')}
                    </Text>
                  </View>

                  {/* Availability Row */}
                  <View style={{ backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 12 }}>🌐</Text>
                      <Text style={{ fontSize: 11.5, color: '#475569' }}>
                        <Text style={{ fontWeight: '700' }}>{lang ? 'এয়ারপোর্ট:' : 'Airports:'}</Text>{' '}
                        {Array.isArray(availability.airports) && availability.airports.includes('ALL')
                          ? (lang ? 'সকল বিমানবন্দর' : 'All Airports')
                          : (availability.airports || []).join(', ')}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 12 }}>🕒</Text>
                      <Text style={{ fontSize: 11.5, color: '#475569' }}>
                        <Text style={{ fontWeight: '700' }}>{lang ? 'সময়:' : 'Hours:'}</Text> {availability.hours || '24/7'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 12 }}>⏳</Text>
                      <Text style={{ fontSize: 11.5, color: '#475569' }}>
                        <Text style={{ fontWeight: '700' }}>{lang ? 'নোটিশ:' : 'Lead Time:'}</Text> {availability.leadTime || 'Instant'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 12 }}>🏢</Text>
                      <Text style={{ fontSize: 11.5, color: '#475569' }}>
                        <Text style={{ fontWeight: '700' }}>{lang ? 'টার্মিনাল:' : 'Terminals:'}</Text>{' '}
                        {Array.isArray(availability.terminals) && availability.terminals.includes('ALL')
                          ? (lang ? 'সকল টার্মিনাল' : 'All')
                          : (availability.terminals || []).join(', ')}
                      </Text>
                    </View>
                  </View>

                  {/* Operational Steps List */}
                  {Array.isArray(service.s) && service.s.length > 0 ? (
                    <View style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                          📋 {lang ? 'কার্যক্রমের ধাপসমূহ' : 'Operational Steps'} ({service.s.length}):
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {service.s.map((step, sIdx) => (
                          <View
                            key={sIdx}
                            style={{
                              backgroundColor: '#F1F5F9',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#0284C7' }}>{sIdx + 1}.</Text>
                            <Text style={{ fontSize: 11, color: '#334155' }}>
                              {step[lang] || step[0]}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {/* Card Bottom: 1-Click Status Toggle & Actions */}
                  <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    {/* 1-Click Status Switcher */}
                    <TouchableOpacity
                      onPress={() => handleToggleServiceStatus(service)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: isItemActive ? '#FEF2F2' : '#ECFDF5',
                        borderWidth: 1,
                        borderColor: isItemActive ? '#FECACA' : '#A7F3D0',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{isItemActive ? '🔴' : '🟢'}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isItemActive ? '#DC2626' : '#059669' }}>
                        {isItemActive
                          ? (lang ? 'নিষ্ক্রিয় করুন (Deactivate)' : 'Deactivate Service')
                          : (lang ? 'সক্রিয় করুন (Activate)' : 'Activate Service')}
                      </Text>
                    </TouchableOpacity>

                    {/* Edit & Delete Actions */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleOpenEditService(service)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: '#F0F9FF',
                          borderWidth: 1,
                          borderColor: '#BAE6FD',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Text style={{ fontSize: 12 }}>✏️</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                          {lang ? 'সম্পাদনা' : 'Edit'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteServiceItem(service)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: '#FFF5F5',
                          borderWidth: 1,
                          borderColor: '#FECACA',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Text style={{ fontSize: 12 }}>🗑️</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>
                          {lang ? 'মুছুন' : 'Delete'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ============================================================ */}
        {/* SERVICE CONFIGURATOR MODAL (Create / Edit Full Properties)   */}
        {/* ============================================================ */}
        <Modal
          visible={serviceModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setServiceModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
                maxWidth: 680,
                maxHeight: '90%',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
                elevation: 10,
                overflow: 'hidden',
              }}
            >
              {/* Modal Top Header */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F1F5F9',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                    {editingService
                      ? (lang ? '✏️ সার্ভিস তথ্য সম্পাদনা করুন' : '✏️ Edit Service Properties')
                      : (lang ? '➕ নতুন সার্ভিস তৈরি করুন' : '➕ Create New Service')}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {lang ? 'সার্ভিসের বিবরণ, ক্যাটাগরি, প্রাপ্যতা ও কার্যক্রমের ধাপ কনফিগার করুন' : 'Configure descriptions, categories, availability & steps'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setServiceModalVisible(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#E2E8F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#475569' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Scrollable Form Body */}
              <ScrollView
                style={{ paddingHorizontal: 20, paddingVertical: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Section 1: Basic Identity (ID, Icon, Name EN/BN) */}
                <View style={{ marginBottom: 18 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', marginBottom: 10 }}>
                    ১. {lang ? 'মৌলিক পরিচিতি ও নাম' : 'Basic Identity & Names'}
                  </Text>

                  {/* ID Input */}
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'সার্ভিস আইডি / ইউনিক স্লাগ (Service ID):' : 'Service ID / Unique Slug:'}
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: serviceErrors.id ? '#EF4444' : '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13,
                        backgroundColor: '#F8FAFC',
                        fontFamily: 'monospace',
                      }}
                      value={serviceFormData.id}
                      onChangeText={v => setServiceFormData(p => ({ ...p, id: v }))}
                      placeholder="e.g. vip_fast_track"
                      autoCapitalize="none"
                    />
                    {serviceErrors.id ? (
                      <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>{serviceErrors.id}</Text>
                    ) : null}
                  </View>

                  {/* Icon & Emoji Palette */}
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'সার্ভিস আইকন / ইমোজি:' : 'Service Icon / Emoji:'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#38BDF8' }}>
                        <Text style={{ fontSize: 24 }}>{serviceFormData.ic || '✈️'}</Text>
                      </View>
                      <TextInput
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 14,
                        }}
                        value={serviceFormData.ic}
                        onChangeText={v => setServiceFormData(p => ({ ...p, ic: v }))}
                        placeholder="Emoji or text icon (e.g. ⚡, 🤝)"
                      />
                    </View>
                    {/* Quick Emoji Pick Palette */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {SERVICE_EMOJI_PALETTE.map(emoji => (
                        <TouchableOpacity
                          key={emoji}
                          onPress={() => setServiceFormData(p => ({ ...p, ic: emoji }))}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            backgroundColor: serviceFormData.ic === emoji ? '#BAE6FD' : '#F1F5F9',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: serviceFormData.ic === emoji ? '#0284C7' : '#E2E8F0',
                          }}
                        >
                          <Text style={{ fontSize: 16 }}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Bilingual Names */}
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <View style={{ flex: 1, minWidth: 220 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                        {lang ? 'নাম (English):' : 'Name (English):'}
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: serviceErrors.nameEn ? '#EF4444' : '#CBD5E1',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 13,
                        }}
                        value={serviceFormData.nameEn}
                        onChangeText={v => setServiceFormData(p => ({ ...p, nameEn: v }))}
                        placeholder="e.g. VIP Fast Track Clearance"
                      />
                      {serviceErrors.nameEn ? (
                        <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>{serviceErrors.nameEn}</Text>
                      ) : null}
                    </View>

                    <View style={{ flex: 1, minWidth: 220 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                        {lang ? 'নাম (বাংলা):' : 'Name (Bangla):'}
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: serviceErrors.nameBn ? '#EF4444' : '#CBD5E1',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 13,
                        }}
                        value={serviceFormData.nameBn}
                        onChangeText={v => setServiceFormData(p => ({ ...p, nameBn: v }))}
                        placeholder="যেমন: ভিআইপি ফাস্ট-ট্র্যাক ক্লিয়ারেন্স"
                      />
                      {serviceErrors.nameBn ? (
                        <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>{serviceErrors.nameBn}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Section 2: Service Category Configuration */}
                <View style={{ marginBottom: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', marginBottom: 10 }}>
                    ২. {lang ? 'সার্ভিস ক্যাটাগরি কনফিগারেশন' : 'Configure Service Categories'}
                  </Text>

                  {/* Flight Direction / Type */}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    {lang ? 'ফ্লাইটের ধরন / অভিমুখ (Direction):' : 'Flight Direction / Type:'}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {[
                      ['arr', lang ? '🛬 আগমন (Arrival)' : '🛬 Arrival'],
                      ['dep', lang ? '🛫 প্রস্থান (Departure)' : '🛫 Departure'],
                      ['transit', lang ? '🔄 ট্রানজিট (Transit)' : '🔄 Transit'],
                      ['both', lang ? '🌐 উভমুখী (Both / Universal)' : '🌐 Both / Universal'],
                    ].map(([dirKey, dirLabel]) => {
                      const isSel = serviceFormData.cat === dirKey;
                      return (
                        <TouchableOpacity
                          key={dirKey}
                          onPress={() => setServiceFormData(p => ({ ...p, cat: dirKey }))}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 10,
                            backgroundColor: isSel ? '#0284C7' : '#F8FAFC',
                            borderWidth: 1.5,
                            borderColor: isSel ? '#0284C7' : '#E2E8F0',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#FFFFFF' : '#475569' }}>
                            {dirLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Service Category Group */}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    {lang ? 'সার্ভিস গ্রুপ / ধরণ (Service Group):' : 'Service Category Group:'}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {SERVICE_CATEGORY_GROUPS.map(catGroup => {
                      const isSel = serviceFormData.serviceCategory === catGroup.id;
                      return (
                        <TouchableOpacity
                          key={catGroup.id}
                          onPress={() => setServiceFormData(p => ({ ...p, serviceCategory: catGroup.id }))}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 10,
                            backgroundColor: isSel ? catGroup.color : catGroup.bg,
                            borderWidth: 1.5,
                            borderColor: isSel ? catGroup.color : '#CBD5E1',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Text style={{ fontSize: 13 }}>{catGroup.icon}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#FFFFFF' : catGroup.color }}>
                            {catGroup[`name${lang ? 'Bn' : 'En'}`]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Section 3: Service Descriptions */}
                <View style={{ marginBottom: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', marginBottom: 10 }}>
                    ৩. {lang ? 'সার্ভিস বিবরণ কনফিগারেশন' : 'Configure Service Descriptions'}
                  </Text>

                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'বিস্তারিত বিবরণ (English):' : 'Description (English):'}
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: serviceErrors.descEn ? '#EF4444' : '#CBD5E1',
                        borderRadius: 10,
                        padding: 10,
                        fontSize: 13,
                        minHeight: 60,
                        textAlignVertical: 'top',
                      }}
                      multiline
                      value={serviceFormData.descEn}
                      onChangeText={v => setServiceFormData(p => ({ ...p, descEn: v }))}
                      placeholder="Detailed scope of services for international and domestic travelers..."
                    />
                    {serviceErrors.descEn ? (
                      <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>{serviceErrors.descEn}</Text>
                    ) : null}
                  </View>

                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'বিস্তারিত বিবরণ (বাংলা):' : 'Description (Bangla):'}
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: serviceErrors.descBn ? '#EF4444' : '#CBD5E1',
                        borderRadius: 10,
                        padding: 10,
                        fontSize: 13,
                        minHeight: 60,
                        textAlignVertical: 'top',
                      }}
                      multiline
                      value={serviceFormData.descBn}
                      onChangeText={v => setServiceFormData(p => ({ ...p, descBn: v }))}
                      placeholder="যাত্রীদের জন্য সেবার পূর্ণাঙ্গ কার্যপরিধি ও সুবিধাসমূহ..."
                    />
                    {serviceErrors.descBn ? (
                      <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>{serviceErrors.descBn}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Section 4: Operational Steps */}
                <View style={{ marginBottom: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7', textTransform: 'uppercase' }}>
                      ৪. {lang ? 'কার্যক্রমের ধাপসমূহ' : 'Operational Steps'} ({serviceFormData.steps.length})
                    </Text>
                    <TouchableOpacity
                      onPress={handleAddFormStep}
                      style={{
                        backgroundColor: '#E0F2FE',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#BAE6FD',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7' }}>
                        + {lang ? 'ধাপ যোগ করুন' : 'Add Step'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {serviceFormData.steps.map((st, stepIdx) => (
                    <View
                      key={stepIdx}
                      style={{
                        backgroundColor: '#F8FAFC',
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7' }}>
                          {lang ? `ধাপ ${stepIdx + 1}` : `Step ${stepIdx + 1}`}
                        </Text>
                        {serviceFormData.steps.length > 1 ? (
                          <TouchableOpacity onPress={() => handleRemoveFormStep(stepIdx)}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                              🗑️ {lang ? 'মুছুন' : 'Remove'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        <TextInput
                          style={{
                            flex: 1,
                            minWidth: 160,
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            fontSize: 12.5,
                            backgroundColor: '#FFFFFF',
                          }}
                          value={st[0]}
                          onChangeText={v => handleUpdateFormStep(stepIdx, 0, v)}
                          placeholder={`Step ${stepIdx + 1} (English)`}
                        />
                        <TextInput
                          style={{
                            flex: 1,
                            minWidth: 160,
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            fontSize: 12.5,
                            backgroundColor: '#FFFFFF',
                          }}
                          value={st[1]}
                          onChangeText={v => handleUpdateFormStep(stepIdx, 1, v)}
                          placeholder={`ধাপ ${stepIdx + 1} (বাংলা)`}
                        />
                      </View>
                    </View>
                  ))}
                </View>

                {/* Section 5: Service Availability Configuration */}
                <View style={{ marginBottom: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', marginBottom: 10 }}>
                    ৫. {lang ? 'সার্ভিস প্রাপ্যতা কনফিগারেশন' : 'Configure Service Availability'}
                  </Text>

                  {/* Airport Availability */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      🌐 {lang ? 'উপলব্ধ বিমানবন্দরসমূহ (Airport Availability):' : 'Available Airports:'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleToggleFormAirport('ALL')}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: (serviceFormData.availability?.airports || []).includes('ALL') ? '#0284C7' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: (serviceFormData.availability?.airports || []).includes('ALL') ? '#0284C7' : '#CBD5E1',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: (serviceFormData.availability?.airports || []).includes('ALL') ? '#FFFFFF' : '#475569' }}>
                          🌐 {lang ? 'সকল বিমানবন্দর (All Airports)' : 'All Airports'}
                        </Text>
                      </TouchableOpacity>

                      {availableAirportsList.map(ap => {
                        const isAirportSel = (serviceFormData.availability?.airports || []).includes(ap.code);
                        return (
                          <TouchableOpacity
                            key={ap.code}
                            onPress={() => handleToggleFormAirport(ap.code)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: isAirportSel ? '#0284C7' : '#F1F5F9',
                              borderWidth: 1,
                              borderColor: isAirportSel ? '#0284C7' : '#CBD5E1',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: isAirportSel ? '#FFFFFF' : '#475569' }}>
                              📍 {ap.code}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Operating Hours */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      🕒 {lang ? 'অপারেটিং সময় (Operating Hours):' : 'Operating Hours:'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        ['24/7', '24/7 (সার্বক্ষণিক)'],
                        ['06:00 - 22:00', lang ? 'দিনের শিফট (০৬:০০ - ২২:০০)' : 'Daytime (06:00 - 22:00)'],
                        ['22:00 - 06:00', lang ? 'রাতের শিফট (২২:০০ - ০৬:০০)' : 'Night Shift (22:00 - 06:00)'],
                        ['Flight Schedule', lang ? 'ফ্লাইটের শিডিউল অনুযায়ী' : 'Flight Schedule Dependent'],
                      ].map(([hVal, hLabel]) => {
                        const isSel = serviceFormData.availability?.hours === hVal;
                        return (
                          <TouchableOpacity
                            key={hVal}
                            onPress={() => setServiceFormData(p => ({ ...p, availability: { ...p.availability, hours: hVal } }))}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: isSel ? '#0F172A' : '#F1F5F9',
                              borderWidth: 1,
                              borderColor: isSel ? '#0F172A' : '#CBD5E1',
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#475569' }}>
                              {hLabel}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Lead Time */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      ⏳ {lang ? 'অগ্রিম বুকিংয়ের সময় (Advance Lead Time):' : 'Advance Notice Required:'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        ['Instant', lang ? 'তাৎক্ষণিক (Instant)' : 'Instant'],
                        ['3 Hours', lang ? 'কমপক্ষে ৩ ঘণ্টা আগে' : 'Min 3 Hours'],
                        ['6 Hours', lang ? 'কমপক্ষে ৬ ঘণ্টা আগে' : 'Min 6 Hours'],
                        ['12 Hours', lang ? 'কমপক্ষে ১২ ঘণ্টা আগে' : 'Min 12 Hours'],
                        ['24 Hours', lang ? 'কমপক্ষে ২৪ ঘণ্টা আগে' : 'Min 24 Hours'],
                      ].map(([ltVal, ltLabel]) => {
                        const isSel = serviceFormData.availability?.leadTime === ltVal;
                        return (
                          <TouchableOpacity
                            key={ltVal}
                            onPress={() => setServiceFormData(p => ({ ...p, availability: { ...p.availability, leadTime: ltVal } }))}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: isSel ? '#0284C7' : '#F1F5F9',
                              borderWidth: 1,
                              borderColor: isSel ? '#0284C7' : '#CBD5E1',
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#475569' }}>
                              {ltLabel}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Terminal Availability */}
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      🏢 {lang ? 'টার্মিনাল প্রাপ্যতা (Terminal Availability):' : 'Terminal Availability:'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        ['ALL', lang ? 'সকল টার্মিনাল' : 'All Terminals'],
                        ['T1', 'Terminal 1'],
                        ['T2', 'Terminal 2'],
                        ['Domestic', lang ? 'অভ্যন্তরীণ টার্মিনাল' : 'Domestic'],
                        ['VIP', lang ? 'ভিআইপি / সিআইপি টার্মিনাল' : 'VIP Terminal'],
                      ].map(([termVal, termLabel]) => {
                        const isTermSel = (serviceFormData.availability?.terminals || []).includes(termVal);
                        return (
                          <TouchableOpacity
                            key={termVal}
                            onPress={() => handleToggleFormTerminal(termVal)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: isTermSel ? '#0F172A' : '#F1F5F9',
                              borderWidth: 1,
                              borderColor: isTermSel ? '#0F172A' : '#CBD5E1',
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: isTermSel ? '#FFFFFF' : '#475569' }}>
                              {termLabel}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* Section 6: Active / Deactivate Status */}
                <View style={{ marginBottom: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', marginBottom: 10 }}>
                    ৬. {lang ? 'সক্রিয়তা স্ট্যাটাস (Activate / Deactivate)' : 'Operating Active Status'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setServiceFormData(p => ({ ...p, active: true }))}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: serviceFormData.active ? '#ECFDF5' : '#F8FAFC',
                        borderWidth: 2,
                        borderColor: serviceFormData.active ? '#059669' : '#E2E8F0',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 18, marginBottom: 2 }}>🟢</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: serviceFormData.active ? '#059669' : '#475569' }}>
                        {lang ? 'সচল (Active)' : 'Active (Available)'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' }}>
                        {lang ? 'গ্রাহকদের জন্য প্রদর্শিত ও বুকিংযোগ্য' : 'Visible & bookable for passengers'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setServiceFormData(p => ({ ...p, active: false }))}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: !serviceFormData.active ? '#FEF2F2' : '#F8FAFC',
                        borderWidth: 2,
                        borderColor: !serviceFormData.active ? '#DC2626' : '#E2E8F0',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 18, marginBottom: 2 }}>🔴</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: !serviceFormData.active ? '#DC2626' : '#475569' }}>
                        {lang ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive (Deactivated)'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' }}>
                        {lang ? 'গ্রাহক তালিকা থেকে লুকানো থাকবে' : 'Hidden from customer booking'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Footer Controls */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: '#F1F5F9',
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 10,
                  backgroundColor: '#F8FAFC',
                }}
              >
                <TouchableOpacity
                  onPress={() => setServiceModalVisible(false)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                    {lang ? 'বাতিল করুন' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveServiceForm}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: '#0284C7',
                    shadowColor: '#0284C7',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                    💾 {lang ? 'সার্ভিস সংরক্ষণ করুন' : 'Save Service'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderManagerAddonField = (addon, field, languageIndex, placeholder, multiline = false) => (
    <TextInput
      key={`${addon.key}-${field}-${languageIndex}`}
      style={[s.in, s.managerServiceTextInput, multiline && s.managerServiceDescription]}
      value={addon[field][languageIndex]}
      onChangeText={value => updateManagerAddonText(addon.key, field, languageIndex, value)}
      placeholder={placeholder}
      multiline={multiline}
    />
  );

  const renderManagerAddons = () => {
    const priceUnits = [
      ['person', t('perPerson')],
      ['trip', t('pricePerTrip')],
      ['bag', t('perBag')],
      ['request', t('pricePerRequest')],
      ['quote', t('priceOnRequest')],
    ];
    const medicalOptions = [
      ['medical', t('medicalCare')],
      ['ambulance', t('ambulance')],
      ['emergency_transport', t('emergencyTransport')],
    ];
    const vehicleOptions = [
      ['sedan', t('sedan')],
      ['suv', t('suv')],
      ['microbus', t('microbus')],
      ...(managerAddons || []).flatMap(addon =>
        addon.id === 'transfer'
          ? (addon.vehicleCategories || [])
              .filter(category => !['sedan', 'suv', 'microbus'].includes(category))
              .map(category => [category, category])
          : []
      ),
    ];
    return (
      <View style={s.pagePanel}>
        <Text style={s.pageTitle}>{t('managerAddonCatalog')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.managerServiceAirports}
        >
          {((managedAirports && managedAirports.length) ? managedAirports : localAirports).map(option => (
            <TouchableOpacity
              key={option.code}
              style={[
                s.airportOption,
                managerAddonsAirport === option.code && s.airportSelected,
              ]}
              onPress={() => loadManagerAddons(option.code)}
            >
              <Text
                style={[
                  s.airportText,
                  managerAddonsAirport === option.code && s.airportTextSelected,
                ]}
              >
                {option.code} · {getAirportDisplayName(option, lang)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {managerAddonsLoading ? <Text style={s.muted}>{t('managerBackendPending')}</Text> : null}
        {managerAddonsError ? <Text style={s.managerError}>{managerAddonsError}</Text> : null}
        {managerAddonsNotice ? <Text style={s.managerNotice}>{managerAddonsNotice}</Text> : null}
        {!managerAddonsLoading && !managerAddonsError && (!managerAddons || managerAddons.length === 0) ? (
          <Text style={s.muted}>{t('noConfiguredAddons')}</Text>
        ) : null}
        {(managerAddons || []).map(addon => (
          <View key={addon.key} style={s.ruleCard}>
            <View style={s.managerServiceHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {getAddonAsset(addon.id) ? (
                  <Image source={getAddonAsset(addon.id)} style={{ width: 22, height: 22, borderRadius: 4 }} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 18 }}>{addon.ic || '✨'}</Text>
                )}
                <Text style={s.h3}>
                  {addon.n?.[lang] || addon.n?.[0] || addon.id}
                </Text>
              </View>
              <View style={s.row}>
                <Text style={s.muted}>{t('activeService')}</Text>
                <Switch
                  value={addon.active}
                  onValueChange={value => updateManagerAddon(addon.key, 'active', value)}
                />
              </View>
            </View>
            <View style={s.managerServiceLocaleRow}>
              {renderManagerAddonField(addon, 'n', 0, 'Service name (English)')}
              {renderManagerAddonField(addon, 'n', 1, 'সার্ভিসের নাম (বাংলা)')}
            </View>
            <View style={s.managerServiceLocaleRow}>
              {renderManagerAddonField(addon, 'd', 0, 'Description / operational handling (English)', true)}
              {renderManagerAddonField(addon, 'd', 1, 'বিবরণ / কার্যপদ্ধতি (বাংলা)', true)}
            </View>
            <Text style={s.lbl}>{t('addonPriceUnit')}</Text>
            <View style={s.ruleChoices}>
              {priceUnits.map(([unit, label]) => (
                <TouchableOpacity
                  key={unit}
                  style={[s.addonChoice, addon.priceUnit === unit && s.ruleChoiceOn]}
                  onPress={() => {
                    updateManagerAddon(addon.key, 'priceUnit', unit);
                    if (unit === 'quote') updateManagerAddon(addon.key, 'p', null);
                  }}
                >
                  <Text style={s.body}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={s.in}
              value={addon.p == null ? '' : String(addon.p)}
              onChangeText={value => updateManagerAddon(addon.key, 'p', value === '' ? null : value)}
              keyboardType="decimal-pad"
              placeholder={t('addonAmount')}
            />
            {addon.id === 'transfer' ? (
              <>
                <Text style={s.lbl}>{t('vehicleCategoryRates')}</Text>
                {vehicleOptions.map(([category, label]) => (
                  <View key={category} style={s.managerAddonVehicleRow}>
                    <TouchableOpacity
                      style={[
                        s.addonChoice,
                        (addon.vehicleCategories || []).includes(category) && s.ruleChoiceOn,
                      ]}
                      onPress={() => toggleManagerAddonVehicle(addon.key, category)}
                    >
                      <Text style={s.body}>{label}</Text>
                    </TouchableOpacity>
                    {(addon.vehicleCategories || []).includes(category) && (
                      <TextInput
                        style={[s.in, s.managerAddonVehiclePrice]}
                        value={
                          addon.vehiclePrices?.[category] == null
                            ? ''
                            : String(addon.vehiclePrices[category])
                        }
                        onChangeText={value =>
                          updateManagerAddonVehiclePrice(addon.key, category, value)
                        }
                        keyboardType="decimal-pad"
                        placeholder={t('addonAmount')}
                      />
                    )}
                  </View>
                ))}
              </>
            ) : null}
            {addon.id === 'medical' ? (
              <>
                <Text style={s.lbl}>{t('medicalOptionConfiguration')}</Text>
                <View style={s.ruleChoices}>
                  {medicalOptions.map(([option, label]) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        s.addonChoice,
                        (addon.medicalServices || []).includes(option) && s.ruleChoiceOn,
                      ]}
                      onPress={() => toggleManagerMedicalOption(addon.key, option)}
                    >
                      <Text style={s.body}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ))}
        <TouchableOpacity
          style={[s.btn, managerAddonsSaving && s.managerDisabled]}
          disabled={managerAddonsSaving || managerAddonsLoading}
          onPress={saveManagerAddonCatalog}
        >
          <Text style={s.btnT}>{managerAddonsSaving ? '…' : t('saveAddons')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderManagerPayments = () => (
    <AdminPaymentsTab
      t={t}
      lang={lang}
      s={s}
      managerPaymentsSummary={managerPaymentsSummary}
      managerPayments={managerPayments}
      allPlatformBookings={allPlatformBookings}
      reconciliationDateFilter={reconciliationDateFilter}
      setReconciliationDateFilter={setReconciliationDateFilter}
      reconciliationNotice={reconciliationNotice}
      setReconciliationNotice={setReconciliationNotice}
      paymentSubTab={paymentSubTab}
      setPaymentSubTab={setPaymentSubTab}
      loadWebhookLogs={loadWebhookLogs}
      managerPaymentFilter={managerPaymentFilter}
      setManagerPaymentFilter={setManagerPaymentFilter}
      managerPaymentSearch={managerPaymentSearch}
      setManagerPaymentSearch={setManagerPaymentSearch}
      loadManagerPayments={loadManagerPayments}
      managerPaymentsLoading={managerPaymentsLoading}
      managerPaymentsError={managerPaymentsError}
      setManagerPaymentsError={setManagerPaymentsError}
      managerPaymentsNotice={managerPaymentsNotice}
      refundPaymentId={refundPaymentId}
      setRefundPaymentId={setRefundPaymentId}
      refundAmount={refundAmount}
      setRefundAmount={setRefundAmount}
      refundReason={refundReason}
      setRefundReason={setRefundReason}
      refundSaving={refundSaving}
      submitManagerRefund={submitManagerRefund}
      handleSimulateWebhook={handleSimulateWebhook}
      webhookLogsList={webhookLogsList}
      handlePurgeExpiredSessions={handlePurgeExpiredSessions}
    />
  );

  const renderBookingWorkflow = () => (
    <View style={s.pagePanel}>
      <Text style={s.pageTitle}>{t('bookingWorkflow')}</Text>
      {managerWorkflowLoading ? <Text style={s.muted}>…</Text> : null}
      {managerWorkflowError ? <Text style={s.managerError}>{managerWorkflowError}</Text> : null}
      {managerWorkflowNotice ? <Text style={s.managerNotice}>{managerWorkflowNotice}</Text> : null}
      {managerWorkflow.map((stage, index) => (
        <View key={stage.key} style={s.ruleCard}>
          <View style={s.workflowStageHeader}>
            <Text style={s.h3}>
              {index + 1}. {stage.label[lang] || stage.key}
            </Text>
            <View style={s.row}>
              <TouchableOpacity
                disabled={index === 0}
                style={s.workflowOrderButton}
                accessibilityLabel={t('moveStageUp')}
                onPress={() => moveManagerWorkflowStage(stage.key, -1)}
              >
                <Text style={s.workflowOrderText}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={index === managerWorkflow.length - 1}
                style={s.workflowOrderButton}
                accessibilityLabel={t('moveStageDown')}
                onPress={() => moveManagerWorkflowStage(stage.key, 1)}
              >
                <Text style={s.workflowOrderText}>↓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.destroyButton}
                onPress={() => removeManagerWorkflowStage(stage.key)}
              >
                <Text style={s.destroyButtonText}>{t('removeWorkflowStage')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={s.in}
            value={stage.key}
            onChangeText={value => updateManagerWorkflowStage(stage.key, 'key', value)}
            placeholder={t('stageKey')}
            autoCapitalize="none"
          />
          <View style={s.managerServiceLocaleRow}>
            <TextInput
              style={[s.in, s.managerServiceTextInput]}
              value={stage.label[0]}
              onChangeText={value => updateManagerWorkflowLabel(stage.key, 0, value)}
              placeholder={t('stageNameEnglish')}
            />
            <TextInput
              style={[s.in, s.managerServiceTextInput]}
              value={stage.label[1]}
              onChangeText={value => updateManagerWorkflowLabel(stage.key, 1, value)}
              placeholder={t('stageNameBangla')}
            />
          </View>
          <Text style={s.lbl}>{t('stageBucket')}</Text>
          <View style={s.ruleChoices}>
            {[
              ['upcoming', t('stageUpcoming')],
              ['completed', t('stageCompleted')],
              ['cancelled', t('stageCancelled')],
            ].map(([bucket, label]) => (
              <TouchableOpacity
                key={bucket}
                style={[s.addonChoice, stage.bucket === bucket && s.ruleChoiceOn]}
                onPress={() => updateManagerWorkflowStage(stage.key, 'bucket', bucket)}
              >
                <Text style={s.body}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      <TouchableOpacity style={[s.btn, s.btn2]} onPress={addManagerWorkflowStage}>
        <Text style={[s.btnT, { color: C.ink }]}>+ {t('addWorkflowStage')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.btn, managerWorkflowSaving && s.managerDisabled]}
        disabled={managerWorkflowSaving || managerWorkflowLoading}
        onPress={saveManagerWorkflow}
      >
        <Text style={s.btnT}>{managerWorkflowSaving ? '…' : t('saveWorkflow')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAirportsManagement = () => {
    const list = (managedAirports && managedAirports.length > 0) ? managedAirports : localAirports;

    const filtered = list.filter(item => {
      const q = airportSearch.trim().toLowerCase();
      const nameEn = Array.isArray(item.name) ? item.name[0] : (item.name || '');
      const nameBn = Array.isArray(item.name) ? (item.name[1] || '') : '';
      const shortEn = item.shortName ? item.shortName[0] : '';
      const shortBn = item.shortName ? item.shortName[1] : '';
      const matchesQuery = !q ||
        (item.code || '').toLowerCase().includes(q) ||
        nameEn.toLowerCase().includes(q) ||
        nameBn.toLowerCase().includes(q) ||
        shortEn.toLowerCase().includes(q) ||
        shortBn.toLowerCase().includes(q) ||
        (item.city || '').toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q) ||
        (item.country || '').toLowerCase().includes(q);

      const matchesFilter =
        airportFilter === 'all' ||
        item.status === airportFilter;

      return matchesQuery && matchesFilter;
    });

    const activeCount = list.filter(a => a.status === 'active').length;
    const maintenanceCount = list.filter(a => a.status === 'maintenance').length;
    const inactiveCount = list.filter(a => a.status === 'inactive').length;

    return (
      <View style={s.pagePanel}>
        {/* Header */}
        <View style={s.airportAdminHeader}>
          <View style={{ flex: 1, minWidth: 260 }}>
            <Text style={s.pageTitle}>{t('airportManagement')}</Text>
            <Text style={{ fontSize: 13.5, color: '#64748B', marginTop: -6 }}>
              {t('airportManagementSubtitle')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: '#0284C7', minHeight: 40, paddingHorizontal: 16 }]}
              onPress={handleOpenAddAirport}
            >
              <Text style={s.btnT}>＋ {t('addAirport')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.airportActionBtn, { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }]}
              onPress={() => {
                if (resetAirports) resetAirports();
                else setLocalAirports(DEFAULT_MANAGED_AIRPORTS);
                setAirportFormNotice(lang ? 'বিমানবন্দর তালিকা ডিফল্ট অবস্থায় রিসেট করা হয়েছে।' : 'Airports reset to factory defaults.');
              }}
            >
              <Text style={[s.airportActionBtnText, { color: '#64748B' }]}>↺ {t('resetAirportsToDefaults')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notice/Feedback */}
        {airportFormNotice ? (
          <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '600' }}>✓ {airportFormNotice}</Text>
            <TouchableOpacity onPress={() => setAirportFormNotice('')}>
              <Text style={{ color: '#065F46', fontWeight: '800', fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 4 Summary Stats */}
        <View style={s.airportAdminStatsRow}>
          <View style={s.airportAdminStatCard}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#0E2A47' }}>{list.length}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 2 }}>
              {lang ? 'সর্বমোট বিমানবন্দর' : 'Total Airports'}
            </Text>
          </View>
          <View style={[s.airportAdminStatCard, { borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' }]}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#059669' }}>{activeCount}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669', marginTop: 2 }}>
              {lang ? 'সক্রিয় হাব' : 'Active Hubs'}
            </Text>
          </View>
          <View style={[s.airportAdminStatCard, { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' }]}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#EA580C' }}>{maintenanceCount}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#EA580C', marginTop: 2 }}>
              {lang ? 'রক্ষণাবেক্ষণাধীন' : 'Under Maintenance'}
            </Text>
          </View>
          <View style={[s.airportAdminStatCard, { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }]}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#64748B' }}>{inactiveCount}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 2 }}>
              {lang ? 'নিষ্ক্রিয় হাব' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Add/Edit Airport Form */}
        {airportFormOpen && (
          <View style={s.airportFormCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0E2A47' }}>
                {editingAirportId ? `✏️ ${t('editAirport')} (${formAirportCode})` : `＋ ${t('addAirport')}`}
              </Text>
              <TouchableOpacity onPress={() => setAirportFormOpen(false)}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {airportFormError ? (
              <View style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                <Text style={{ color: '#DC2626', fontSize: 12.5, fontWeight: '600' }}>⚠️ {airportFormError}</Text>
              </View>
            ) : null}

            {/* Quick Preset Templates for Fast Expansion */}
            {!editingAirportId && (
              <View style={{ marginBottom: 14, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', marginBottom: 8 }}>
                  ⚡ {lang ? 'দ্রুত বিমানবন্দর যুক্ত করার টেমপ্লেট (Quick Airport Presets):' : 'Quick Airport Presets (Click to Auto-fill):'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {AIRPORT_QUICK_PRESETS.map(preset => (
                    <TouchableOpacity
                      key={preset.code}
                      onPress={() => handleApplyPreset(preset)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: formAirportCode === preset.code ? '#0284C7' : '#CBD5E1',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7' }}>{preset.code}</Text>
                      <Text style={{ fontSize: 12, color: '#334155' }}>
                        {preset.city} · {preset.country}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Row 1: Code, City, Country */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={s.label}>{t('airportCode')} *</Text>
                <TextInput
                  style={[s.in, { textTransform: 'uppercase', fontWeight: '700' }]}
                  placeholder="e.g. DAC, CGP"
                  value={formAirportCode}
                  onChangeText={v => setFormAirportCode(v.toUpperCase())}
                  maxLength={5}
                  autoCapitalize="characters"
                />
              </View>
              <View style={{ flex: 1.5, minWidth: 150 }}>
                <Text style={s.label}>{t('airportCity')} *</Text>
                <TextInput
                  style={s.in}
                  placeholder="e.g. Dhaka, Chattogram"
                  value={formAirportCity}
                  onChangeText={setFormAirportCity}
                />
              </View>
              <View style={{ flex: 1.5, minWidth: 150 }}>
                <Text style={s.label}>{t('airportCountry')}</Text>
                <TextInput
                  style={s.in}
                  placeholder="e.g. Bangladesh"
                  value={formAirportCountry}
                  onChangeText={setFormAirportCountry}
                />
              </View>
            </View>

            {/* Quick Country Pills */}
            <View style={{ width: '100%', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 5 }}>
                {lang ? 'জনপ্রিয় দেশসমূহ (ক্লিক করে নির্বাচন করুন):' : 'Popular Countries (Click to Select):'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {POPULAR_COUNTRIES.map(c => {
                  const isMatch = (formAirportCountry || '').toLowerCase() === c.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={c.name}
                      onPress={() => setFormAirportCountry(c.name)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: isMatch ? '#E0F2FE' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: isMatch ? '#0284C7' : '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>{c.flag}</Text>
                      <Text style={{ fontSize: 11, fontWeight: isMatch ? '800' : '600', color: isMatch ? '#0284C7' : '#475569' }}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Row 2: Full Name (English & Bangla) */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={s.label}>{t('airportNameEn')} *</Text>
                <TextInput
                  style={s.in}
                  placeholder="e.g. Hazrat Shahjalal International Airport"
                  value={formAirportNameEn}
                  onChangeText={setFormAirportNameEn}
                />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={s.label}>{t('airportNameBn')}</Text>
                <TextInput
                  style={s.in}
                  placeholder="e.g. হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর"
                  value={formAirportNameBn}
                  onChangeText={setFormAirportNameBn}
                />
              </View>
            </View>

            {/* Row 3: Short Name (English & Bangla) */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={s.label}>{lang ? 'সংক্ষিপ্ত নাম (English)' : 'Short Display Name (English)'}</Text>
                <TextInput
                  style={s.in}
                  placeholder="e.g. Dhaka · HSIA"
                  value={formAirportShortEn}
                  onChangeText={setFormAirportShortEn}
                />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={s.label}>{lang ? 'সংক্ষিপ্ত নাম (বাংলা)' : 'Short Display Name (Bangla)'}</Text>
                <TextInput
                  style={s.in}
                  placeholder="e.g. ঢাকা · HSIA"
                  value={formAirportShortBn}
                  onChangeText={setFormAirportShortBn}
                />
              </View>
            </View>

            {/* Row 4: Location & Terminals */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flex: 2, minWidth: 220 }}>
                <Text style={s.label}>{t('airportLocation')} *</Text>
                <TextInput
                  style={s.in}
                  placeholder="e.g. Kurmitola, Airport Road, Dhaka-1229"
                  value={formAirportLocation}
                  onChangeText={setFormAirportLocation}
                />
              </View>
              <View style={{ flex: 1.5, minWidth: 180 }}>
                <Text style={s.label}>{t('airportTerminals')}</Text>
                <TextInput
                  style={s.in}
                  placeholder="e.g. Terminal 1, 2, Domestic"
                  value={formAirportTerminals}
                  onChangeText={setFormAirportTerminals}
                />
              </View>
            </View>

            {/* Row 5: Operating Status */}
            <View style={{ marginTop: 8, marginBottom: 12 }}>
              <Text style={[s.label, { marginBottom: 6 }]}>{t('operatingStatus')}</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { key: 'active', label: t('statusActive'), color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
                  { key: 'maintenance', label: t('statusMaintenance'), color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
                  { key: 'inactive', label: t('statusInactive'), color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                ].map(stat => {
                  const isSel = formAirportStatus === stat.key;
                  return (
                    <TouchableOpacity
                      key={stat.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: isSel ? stat.color : '#CBD5E1',
                        backgroundColor: isSel ? stat.bg : '#F8FAFC',
                      }}
                      onPress={() => setFormAirportStatus(stat.key)}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: stat.color }} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isSel ? stat.color : '#475569' }}>
                        {stat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Row 6: Available Services Multi-select */}
            <View style={{ marginTop: 8, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[s.label, { marginBottom: 0 }]}>
                  {t('availableServices')} ({formAirportServices.length} {lang ? 'টি নির্বাচিত' : 'selected'})
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setFormAirportServices(PLATFORM_AIRPORT_SERVICES.map(svc => svc.id))}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                      {lang ? 'সব নির্বাচন করুন' : 'Select all'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setFormAirportServices([])}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                      {lang ? 'সব মুছুন' : 'Clear all'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.airportServiceToggleGrid}>
                {PLATFORM_AIRPORT_SERVICES.map(svc => {
                  const isChecked = formAirportServices.includes(svc.id);
                  return (
                    <TouchableOpacity
                      key={svc.id}
                      style={[
                        s.airportServiceToggleItem,
                        isChecked && s.airportServiceToggleItemActive,
                      ]}
                      onPress={() => handleToggleAirportService(svc.id)}
                    >
                      {getAddonAsset(svc.id) || svc.image ? (
                        <Image source={getAddonAsset(svc.id) || svc.image} style={{ width: 18, height: 18, borderRadius: 3 }} resizeMode="contain" />
                      ) : (
                        <Text style={{ fontSize: 14 }}>{svc.icon}</Text>
                      )}
                      <Text
                        style={[
                          s.airportServiceToggleItemText,
                          isChecked && s.airportServiceToggleItemTextActive,
                        ]}
                      >
                        {svc.name[lang]}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isChecked ? '#0284C7' : '#CBD5E1' }}>
                        {isChecked ? '✓' : '＋'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Form Actions */}
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: '#F1F5F9', minWidth: 100 }]}
                onPress={() => setAirportFormOpen(false)}
              >
                <Text style={[s.btnT, { color: '#475569' }]}>{t('pickerCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: '#0284C7', minWidth: 140 }]}
                onPress={handleSaveAirport}
              >
                <Text style={s.btnT}>💾 {t('saveAirport')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Search and Filters Bar */}
        <View style={s.airportAdminSearchRow}>
          <TextInput
            style={[s.in, { flex: 1, minWidth: 200, marginBottom: 0 }]}
            placeholder={t('searchAirportsPlaceholder')}
            value={airportSearch}
            onChangeText={setAirportSearch}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {[
              { key: 'all', label: `${t('allAirports')} (${list.length})` },
              { key: 'active', label: `${t('statusActive')} (${activeCount})` },
              { key: 'maintenance', label: `${t('statusMaintenance')} (${maintenanceCount})` },
              { key: 'inactive', label: `${t('statusInactive')} (${inactiveCount})` },
            ].map(tabItem => (
              <TouchableOpacity
                key={tabItem.key}
                style={[
                  s.airportFilterChip,
                  airportFilter === tabItem.key && s.airportFilterChipActive,
                ]}
                onPress={() => setAirportFilter(tabItem.key)}
              >
                <Text
                  style={[
                    s.airportFilterChipText,
                    airportFilter === tabItem.key && s.airportFilterChipTextActive,
                  ]}
                >
                  {tabItem.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Airport Cards List */}
        {filtered.length === 0 ? (
          <View style={{ padding: 30, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🛫</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0E2A47' }}>{t('noAirportsFound')}</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              {lang ? 'অনুসন্ধানের শব্দ পরিবর্তন করুন অথবা ফিল্টার সরিয়ে নিন।' : 'Try adjusting search term or status filter.'}
            </Text>
            {airportSearch ? (
              <TouchableOpacity
                style={[s.btn, { marginTop: 12, backgroundColor: '#0E2A47', minHeight: 36, paddingHorizontal: 16 }]}
                onPress={() => setAirportSearch('')}
              >
                <Text style={s.btnT}>{t('clearSearch')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          filtered.map(item => {
            const isItemActive = item.status === 'active';
            const isItemMaintenance = item.status === 'maintenance';
            const statusColor = isItemActive ? '#059669' : isItemMaintenance ? '#D97706' : '#DC2626';
            const statusBg = isItemActive ? '#ECFDF5' : isItemMaintenance ? '#FEF3C7' : '#FEF2F2';
            const statusBorder = isItemActive ? '#A7F3D0' : isItemMaintenance ? '#FDE68A' : '#FECACA';
            const statusLabel = isItemActive ? t('statusActive') : isItemMaintenance ? t('statusMaintenance') : t('statusInactive');
            const itemServices = Array.isArray(item.availableServices) ? item.availableServices : [];
            const countryPreset = POPULAR_COUNTRIES.find(c => c.name.toLowerCase() === (item.country || '').toLowerCase());
            const flagEmoji = countryPreset ? countryPreset.flag : '🌐';

            return (
              <View key={item.id || item.code} style={s.airportCard}>
                {/* Card Top: Code badge, Status pill, Country */}
                <View style={s.airportCardTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={s.airportCodeBadge}>
                      <Text style={s.airportCodeBadgeText}>{item.code}</Text>
                    </View>
                    <View style={[s.airportStatusPill, { backgroundColor: statusBg, borderColor: statusBorder }]}>
                      <View style={[s.airportStatusDot, { backgroundColor: statusColor }]} />
                      <Text style={[s.airportStatusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                      {flagEmoji} {item.country || 'Bangladesh'}
                    </Text>
                  </View>
                </View>

                {/* Airport Full Name & City */}
                <Text style={s.airportNameText}>
                  {getAirportDisplayName(item, lang) || (lang ? item.nameBn : item.nameEn) || (typeof item.name === 'string' ? item.name : '') || item.code}
                </Text>
                <Text style={s.airportSubnameText}>
                  {item.city ? `${item.city}${item.country ? ', ' + item.country : ''}` : ''}
                </Text>

                {/* Location & Terminals */}
                <View style={s.airportLocationRow}>
                  <Text style={{ fontSize: 14 }}>📍</Text>
                  <Text style={s.airportLocationText}>
                    {item.location || (lang ? 'টার্মিনাল লোকেশন সেট করা হয়নি' : 'Terminal location not configured')}
                  </Text>
                </View>
                {item.terminals ? (
                  <View style={[s.airportLocationRow, { marginTop: 4 }]}>
                    <Text style={{ fontSize: 13 }}>🏢</Text>
                    <Text style={[s.airportLocationText, { color: '#64748B', fontSize: 12.5 }]}>
                      {item.terminals}
                    </Text>
                  </View>
                ) : null}

                {/* Available Services Chips */}
                <View style={s.airportServicesWrap}>
                  <Text style={{ width: '100%', fontSize: 11.5, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                    {t('availableServices')} ({itemServices.length}):
                  </Text>
                  {itemServices.length === 0 ? (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                      {lang ? 'কোনো সার্ভিস কনফিগার করা নেই' : 'No services configured for this airport'}
                    </Text>
                  ) : (
                    itemServices.map(svcId => {
                      const svcObj = PLATFORM_AIRPORT_SERVICES.find(s => s.id === svcId);
                      return (
                        <View key={svcId} style={s.airportServiceChip}>
                          {getAddonAsset(svcId) || svcObj?.image ? (
                            <Image source={getAddonAsset(svcId) || svcObj?.image} style={{ width: 14, height: 14, borderRadius: 2 }} resizeMode="contain" />
                          ) : (
                            <Text style={{ fontSize: 12 }}>{svcObj?.icon || '✈'}</Text>
                          )}
                          <Text style={s.airportServiceChipText}>
                            {svcObj ? svcObj.name[lang] : svcId}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* 1-Click Operating Status Switcher */}
                <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                    {lang ? 'অপারেটিং স্ট্যাটাস পরিবর্তন:' : 'Change Operating Status:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => handleSetAirportStatus(item, 'active')}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: isItemActive ? '#059669' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: isItemActive ? '#059669' : '#CBD5E1',
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: isItemActive ? '#FFFFFF' : '#475569' }}>
                        🟢 {lang ? 'সক্রিয়' : 'Active'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleSetAirportStatus(item, 'maintenance')}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: isItemMaintenance ? '#D97706' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: isItemMaintenance ? '#D97706' : '#CBD5E1',
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: isItemMaintenance ? '#FFFFFF' : '#475569' }}>
                        🟡 {lang ? 'রক্ষণাবেক্ষণ' : 'Maint.'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleSetAirportStatus(item, 'inactive')}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: (!isItemActive && !isItemMaintenance) ? '#DC2626' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: (!isItemActive && !isItemMaintenance) ? '#DC2626' : '#CBD5E1',
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: (!isItemActive && !isItemMaintenance) ? '#FFFFFF' : '#475569' }}>
                        🔴 {lang ? 'নিষ্ক্রিয়' : 'Inactive'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Actions Toolbar */}
                <View style={s.airportCardActions}>
                  <TouchableOpacity
                    style={s.airportActionBtn}
                    onPress={() => handleOpenEditAirport(item)}
                  >
                    <Text style={s.airportActionBtnText}>✏️ {t('editAirport')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.airportActionBtn, { borderColor: '#FECACA', backgroundColor: '#FFF5F5' }]}
                    onPress={() => handleDeleteAirportItem(item)}
                  >
                    <Text style={[s.airportActionBtnText, { color: '#DC2626' }]}>🗑️ {t('deleteAirport')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  };

  const renderBookingsManagement = () => {
    // Dual-Vault Filtering: In Auditor Mode (locked), only show curated showcase bookings!
    const effectiveAllPlatformBookings = filterBookingsByVaultMode(
      allPlatformBookings,
      isMasterVaultActive,
      showcaseBookingIds
    );

    const isTodayBookingDate = (dateStr) => {
      if (!dateStr) return false;
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const clean = String(dateStr).trim().toLowerCase();
      return (
        clean === `${yyyy}-${mm}-${dd}` ||
        clean === `${dd}-${mm}-${yyyy}` ||
        clean === `${dd}/${mm}/${yyyy}` ||
        clean === '09-10-2026' ||
        clean === 'today' ||
        clean === 'আজকের'
      );
    };

    // Status Filter definitions
    const pendingEarlierCount = effectiveAllPlatformBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled' && !isTodayBookingDate(b.date)).length;
    const statusFilters = isAdmin
      ? [
          ['all', lang ? 'সব বুকিং' : 'All Bookings', effectiveAllPlatformBookings.length],
          ['today', lang ? 'আজকের' : 'Today', effectiveAllPlatformBookings.filter(b => isTodayBookingDate(b.date)).length],
          ['upcoming', lang ? 'আসন্ন' : 'Upcoming', effectiveAllPlatformBookings.filter(b => b.status === 'upcoming' || b.status === 'confirmed').length],
          ['in_progress', lang ? 'চলমান' : 'In Progress', effectiveAllPlatformBookings.filter(b => b.status === 'in_progress').length],
          ['completed', lang ? 'সম্পন্ন' : 'Completed', effectiveAllPlatformBookings.filter(b => b.status === 'completed').length],
          ['cancelled', lang ? 'বাতিল' : 'Cancelled', effectiveAllPlatformBookings.filter(b => b.status === 'cancelled').length],
        ]
      : [
          ['pending_prior', lang ? 'আগে থেকে দেয়ার বাকী' : 'Pending Prior', pendingEarlierCount],
          ['today', lang ? 'আজকের সার্ভিস' : "Today's Services", effectiveAllPlatformBookings.filter(b => isTodayBookingDate(b.date)).length],
          ['in_progress', lang ? 'চলমান সেবা' : 'In Progress', effectiveAllPlatformBookings.filter(b => b.status === 'in_progress').length],
          ['upcoming', lang ? 'আসন্ন শিডিউল' : 'Upcoming', effectiveAllPlatformBookings.filter(b => b.status === 'upcoming' || b.status === 'confirmed').length],
          ['completed', lang ? 'সম্পন্ন সেবা' : 'Completed', effectiveAllPlatformBookings.filter(b => b.status === 'completed').length],
          ['cancelled', lang ? 'বাতিলকৃত' : 'Cancelled', effectiveAllPlatformBookings.filter(b => b.status === 'cancelled').length],
          ['all', lang ? 'সব তালিকা' : 'All List', effectiveAllPlatformBookings.length],
        ];

    // Airport filter options
    const airportFilterOptions = [
      ['all', lang ? 'সকল বিমানবন্দর' : 'All Airports'],
      ['DAC', 'Dhaka (DAC)'],
      ['CGP', 'Chittagong (CGP)'],
      ['ZYL', 'Sylhet (ZYL)'],
      ['CXB', "Cox's Bazar (CXB)"],
      ['JSR', 'Jashore (JSR)'],
      ['SPD', 'Saidpur (SPD)'],
      ['RJH', 'Rajshahi (RJH)'],
    ];

    // Payment filter options
    const paymentFilterOptions = [
      ['all', lang ? 'সব পেমেন্ট' : 'All Payments'],
      ['paid', lang ? 'পরিশোধিত (Paid)' : 'Paid'],
      ['pending', lang ? 'অপেক্ষমাণ (Pending)' : 'Pending'],
      ['refunded', lang ? 'রিফান্ডকৃত (Refunded)' : 'Refunded'],
    ];

    // Staff allocation filter options
    const staffFilterOptions = [
      ['all', lang ? 'সব স্টাফ অবস্থা' : 'All Staff'],
      ['assigned', lang ? 'স্টাফ বরাদ্দকৃত' : 'Staff Assigned'],
      ['unassigned', lang ? 'স্টাফ অবরাদ্দকৃত' : 'Unassigned'],
    ];

    // Multi-dimensional filtering logic
    const filtered = effectiveAllPlatformBookings.filter(b => {
      // Status filter
      if (bookingFilterStatus === 'pending_prior' && (b.status === 'completed' || b.status === 'cancelled' || isTodayBookingDate(b.date))) return false;
      if (bookingFilterStatus === 'today' && !isTodayBookingDate(b.date)) return false;
      if (bookingFilterStatus === 'upcoming' && b.status !== 'upcoming' && b.status !== 'confirmed') return false;
      if (bookingFilterStatus === 'in_progress' && b.status !== 'in_progress') return false;
      if (bookingFilterStatus === 'completed' && b.status !== 'completed') return false;
      if (bookingFilterStatus === 'cancelled' && b.status !== 'cancelled') return false;

      // Airport filter
      if (bookingAirportFilter !== 'all' && b.airport !== bookingAirportFilter) return false;

      // Payment filter
      if (bookingPaymentFilter !== 'all' && b.paymentStatus !== bookingPaymentFilter) return false;

      // Staff filter
      if (bookingStaffFilter === 'assigned' && (!b.staff || b.staff === 'Unassigned' || b.staff === 'None')) return false;
      if (bookingStaffFilter === 'unassigned' && (b.staff && b.staff !== 'Unassigned' && b.staff !== 'None')) return false;

      // Source / Entry Attribution filter
      if (bookingSourceFilter === 'manager' && !b.enteredBy) return false;
      if (bookingSourceFilter === 'online' && b.enteredBy) return false;

      // Search Query
      if (bookingSearchQuery.trim()) {
        const q = bookingSearchQuery.toLowerCase();
        const idMatch = (b.id || '').toLowerCase().includes(q);
        const customerMatch = (b.customer || '').toLowerCase().includes(q);
        const fnoMatch = (b.fno || '').toLowerCase().includes(q);
        const phoneMatch = (b.phone || '').includes(q);
        const emailMatch = (b.email || '').toLowerCase().includes(q);
        const airportMatch = (b.airport || '').toLowerCase().includes(q);
        const staffMatch = (b.staff || '').toLowerCase().includes(q);
        const serviceMatch = (b.service || '').toLowerCase().includes(q);
        const enteredByNameMatch = b.enteredBy ? (b.enteredBy.name || '').toLowerCase().includes(q) : false;
        const enteredByEmailMatch = b.enteredBy ? (b.enteredBy.email || '').toLowerCase().includes(q) : false;
        const assignedByNameMatch = b.assignedBy ? (b.assignedBy.name || '').toLowerCase().includes(q) : false;
        const assignedByEmailMatch = b.assignedBy ? (b.assignedBy.email || '').toLowerCase().includes(q) : false;
        return (
          idMatch ||
          customerMatch ||
          fnoMatch ||
          phoneMatch ||
          emailMatch ||
          airportMatch ||
          staffMatch ||
          serviceMatch ||
          enteredByNameMatch ||
          enteredByEmailMatch ||
          assignedByNameMatch ||
          assignedByEmailMatch
        );
      }

      return true;
    });

    const isFilteredActive = bookingFilterStatus !== 'all' || bookingAirportFilter !== 'all' || bookingPaymentFilter !== 'all' || bookingStaffFilter !== 'all' || bookingSourceFilter !== 'all' || (bookingSearchInput || '').trim().length > 0 || bookingSearchQuery.trim().length > 0;

    return (
      <View style={s.pagePanel}>
        {/* Header Title & Subtitle */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <View>
              <Text style={s.pageTitle}>{lang ? 'বুকিং প্রশাসন ও নিয়ন্ত্রণ' : 'Booking Administration'}</Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: -6 }}>
                {lang
                  ? 'সকল বুকিং পর্যবেক্ষণ, সার্চ, ফিল্টারিং, স্টাফ অ্যাসাইন এবং সার্ভিস অগ্রগতি নিয়ন্ত্রণ করুন'
                  : 'Search, filter, assign protocol staff, manage cancellations, and track service progress'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Make Placard Button in Bookings Management */}
              <TouchableOpacity
                onPress={() => setShowMakePlacardModal(true)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: '#0E2A47',
                  borderWidth: 1.5,
                  borderColor: '#D97706',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  shadowColor: '#0E2A47',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 13, color: '#FBBF24' }}>🏷️</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? 'প্লেকার্ড তৈরি' : 'Make Placard'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowManualBookingModal(true)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: '#16A34A',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  shadowColor: '#16A34A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 13, color: '#FFFFFF' }}>➕</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? 'ম্যানুয়াল বুকিং যোগ করুন' : '+ Offline Booking'}
                </Text>
              </TouchableOpacity>
              {/* Dual-Vault aware CSV Export */}
              {isMasterVaultActive ? (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      const list = filterBookingsByVaultMode(allPlatformBookings, false, showcaseBookingIds);
                      exportDualVaultBookingsCsv(list, 'auditor');
                      setAdminNotice(lang ? `পরিদর্শক এক্সেল (DB-1) ডাউনলোড হয়েছে (${list.length} বুকিং)` : `Exported ${list.length} bookings (Auditor DB-1)`);
                      setTimeout(() => setAdminNotice(''), 3500);
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: '#0284C7',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#FFFFFF' }}>👁️</Text>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
                      {lang ? '১. দর্শক এক্সেল' : '1. Auditor CSV'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      exportDualVaultBookingsCsv(allPlatformBookings, 'master');
                      setAdminNotice(lang ? `মাস্টার এক্সেল (DB-2) ডাউনলোড হয়েছে (${allPlatformBookings.length} আসল বুকিং)` : `Exported ${allPlatformBookings.length} master bookings`);
                      setTimeout(() => setAdminNotice(''), 3500);
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: '#BE123C',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#FFFFFF' }}>🔐</Text>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
                      {lang ? '২. মাস্টার এক্সেল' : '2. Master CSV'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    const list = effectiveAllPlatformBookings;
                    exportDualVaultBookingsCsv(list, 'auditor');
                    setAdminNotice(lang ? `বুকিং তালিকা CSV সফলভাবে ডাউনলোড হয়েছে (${list.length} বুকিং)` : `Exported ${list.length} bookings to CSV`);
                    setTimeout(() => setAdminNotice(''), 3500);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: '#0284C7',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#FFFFFF' }}>⬇</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                    {lang ? 'CSV এক্সপোর্ট' : 'Export CSV'}
                  </Text>
                </TouchableOpacity>
              )}
              {/* Top Prominent Notification Bell Button */}
              <TouchableOpacity
                onPress={() => setManagerSection('notifications')}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: managerSection === 'notifications' ? '#0F172A' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: (notifications || []).filter(n => !n.read).length > 0 ? '#38BDF8' : '#CBD5E1',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                }}
              >
                <Text style={{ fontSize: 13 }}>🔔</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: managerSection === 'notifications' ? '#FFFFFF' : '#0F172A' }}>
                  {lang ? 'নোটিফিকেশন' : 'Alerts'}
                </Text>
                {(notifications || []).filter(n => !n.read).length > 0 ? (
                  <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>
                      {(notifications || []).filter(n => !n.read).length}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#BAE6FD' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0369A1' }}>
                  {isAdmin
                    ? (lang ? `মোট বুকিং: ${effectiveAllPlatformBookings.length}টি` : `Total Bookings: ${effectiveAllPlatformBookings.length}`)
                    : (lang
                        ? `বাকী ও আজকের সার্ভিস: ${allPlatformBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length}টি`
                        : `Pending & Today's: ${allPlatformBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length}`)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Global Admin Alert Notification */}
        {adminNotice ? (
          <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>✅</Text>
            <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700', flex: 1 }}>{adminNotice}</Text>
          </View>
        ) : null}

        {/* Quick KPI Metric Counters */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {[
            ...(isAdmin
              ? [
                  { label: lang ? 'আজকের বুকিং' : "Today's Bookings", count: allPlatformBookings.filter(b => isTodayBookingDate(b.date)).length, color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', icon: '📅' },
                  { label: lang ? 'চলমান সেবা' : 'In Progress', count: allPlatformBookings.filter(b => b.status === 'in_progress').length, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '⚡' },
                  { label: lang ? 'আসন্ন ফ্লাইট' : 'Upcoming', count: allPlatformBookings.filter(b => b.status === 'upcoming' || b.status === 'confirmed').length, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: '🛫' },
                  { label: lang ? 'সম্পন্ন সার্ভিস' : 'Completed', count: allPlatformBookings.filter(b => b.status === 'completed').length, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: '✅' },
                  { label: lang ? 'বাতিলকৃত' : 'Cancelled', count: allPlatformBookings.filter(b => b.status === 'cancelled').length, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '❌' },
                  { label: lang ? 'মোট সংগৃহীত' : 'Paid Revenue', count: `৳ ${(allPlatformBookings.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + (b.amount || 0), 0)).toLocaleString()}`, color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4', icon: '💰' },
                ]
              : [
                  { label: lang ? 'আগে থেকে দেয়ার বাকী' : 'Pending Backlog', count: allPlatformBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled' && !isTodayBookingDate(b.date)).length, color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', icon: '⏳' },
                  { label: lang ? 'আজকের সার্ভিস' : "Today's Services", count: allPlatformBookings.filter(b => isTodayBookingDate(b.date)).length, color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', icon: '📅' },
                  { label: lang ? 'চলমান সেবা' : 'In Progress', count: allPlatformBookings.filter(b => b.status === 'in_progress').length, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '⚡' },
                  { label: lang ? 'আসন্ন ফ্লাইট' : 'Upcoming', count: allPlatformBookings.filter(b => b.status === 'upcoming' || b.status === 'confirmed').length, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: '🛫' },
                  { label: lang ? 'সম্পন্ন সার্ভিস' : 'Completed', count: allPlatformBookings.filter(b => b.status === 'completed').length, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: '✅' },
                  { label: lang ? 'বাতিলকৃত' : 'Cancelled', count: allPlatformBookings.filter(b => b.status === 'cancelled').length, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '❌' },
                ]),
          ].map((metric, idx) => (
            <View
              key={idx}
              style={{
                flex: 1,
                minWidth: 130,
                backgroundColor: metric.bg,
                borderColor: metric.border,
                borderWidth: 1.5,
                borderRadius: 12,
                padding: 10,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{metric.icon} {metric.label}</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: metric.color, marginTop: 4 }}>{metric.count}</Text>
            </View>
          ))}
        </View>

        {/* Dual-Vault Controller Bar (Master Vault Banner vs Auditor Status) */}
        {isMasterVaultActive ? (
          <View
            style={{
              backgroundColor: '#FFF1F2',
              borderColor: '#FECDD3',
              borderWidth: 1.5,
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 240 }}>
              <Text style={{ fontSize: 20 }}>🔐</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#9F1239' }}>
                  {lang ? 'মাস্টার ভল্ট আনলকড (ডাটাবেজ ২: ১০০% আসল ডাটা)' : 'MASTER VAULT ACTIVE (Database 2: 100% Real Records)'}
                </Text>
                <Text style={{ fontSize: 11, color: '#BE123C', marginTop: 1 }}>
                  {lang
                    ? `মোট ${allPlatformBookings.length} টি আসল বুকিং দেখা যাচ্ছে। কার্ডের সবুজ 'DB-1: দৃশ্যমান' চিহ্নিত বুকিংগুলোই দর্শক ডাটাবেজে যাবে।`
                    : `Showing all ${allPlatformBookings.length} real bookings. Green 'DB-1: Visible' badges appear in Auditor DB-1.`}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => setShowDualVaultModal(true)}
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FDA4AF' }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#BE123C' }}>
                  {lang ? '⚙️ পিন সেটিংস' : '⚙️ Vault Settings'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  lockMasterVault();
                  setIsMasterVaultActive(false);
                  setAdminNotice(lang ? '🔒 সাধারণ দর্শক মোডে (DB-1) লক করা হয়েছে।' : '🔒 Locked to Auditor Mode (DB-1).');
                  setTimeout(() => setAdminNotice(''), 3500);
                }}
                style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#E11D48' }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? '🔒 নিরাপদ লক করুন' : '🔒 Lock Vault'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Search Bar with clear query button */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 6, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, paddingHorizontal: 8 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, fontSize: 13.5, color: '#0F172A', paddingVertical: 6 }}
            placeholder={lang ? 'বুকিং আইডি, যাত্রী, ফ্লাইট নম্বর, এয়ারপোর্ট, স্টাফ দিয়ে সার্চ করুন...' : 'Search by Booking ID, passenger, flight no, airport, staff, phone...'}
            value={bookingSearchInput}
            onChangeText={setBookingSearchInput}
          />
          {(bookingSearchInput.length > 0 || bookingSearchQuery.length > 0) && (
            <TouchableOpacity onPress={() => { setBookingSearchInput(''); setBookingSearchQuery(''); }} style={{ paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Primary Status Filters (Horizontal Pills) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
          {statusFilters.map(([key, label, count]) => {
            const isSel = bookingFilterStatus === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setBookingFilterStatus(key)}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: isSel ? '#0284C7' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSel ? '#0284C7' : '#CBD5E1',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#334155' }}>
                  {label}
                </Text>
                <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: isSel ? 'rgba(255,255,255,0.25)' : '#F1F5F9' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isSel ? '#FFFFFF' : '#64748B' }}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Secondary Filter Row: Airport, Payment, Staff */}
        <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8, marginBottom: 14, gap: 8 }}>
          {/* Airport Filter Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', width: 68 }}>🛫 {lang ? 'হাব:' : 'Hub:'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {airportFilterOptions.map(([code, label]) => {
                const isSel = bookingAirportFilter === code;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => setBookingAirportFilter(code)}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: isSel ? '#0F172A' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: isSel ? '#0F172A' : '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isSel ? '#FFFFFF' : '#475569' }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Payment Filter Row - Admin Only */}
          {isAdmin && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', width: 68 }}>💳 {lang ? 'পেমেন্ট:' : 'Pay:'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {paymentFilterOptions.map(([val, label]) => {
                  const isSel = bookingPaymentFilter === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setBookingPaymentFilter(val)}
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: isSel ? '#0F172A' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: isSel ? '#0F172A' : '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isSel ? '#FFFFFF' : '#475569' }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Staff Allocation Filter */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', width: 68 }}>🧑‍✈️ {lang ? 'স্টাফ:' : 'Staff:'}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {staffFilterOptions.map(([val, label]) => {
                  const isSel = bookingStaffFilter === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setBookingStaffFilter(val)}
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: isSel ? '#0284C7' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: isSel ? '#0284C7' : '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isSel ? '#FFFFFF' : '#475569' }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {isFilteredActive && (
              <TouchableOpacity
                onPress={() => {
                  setBookingFilterStatus('all');
                  setBookingAirportFilter('all');
                  setBookingPaymentFilter('all');
                  setBookingStaffFilter('all');
                  setBookingSourceFilter('all');
                  setBookingSearchInput('');
                  setBookingSearchQuery('');
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>
                  ✕ {lang ? 'সব ফিল্টার মুছুন' : 'Reset Filters'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Entry Source Filter - All / Manager Entry / Online Booking */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 4, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', width: 68 }}>👤 {lang ? 'এন্ট্রি সোর্স:' : 'Source:'}</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {[
                ['all', lang ? 'সকল' : 'All'],
                ['manager', lang ? '✍️ ম্যানেজার এন্ট্রি' : '✍️ Manager Entry'],
                ['online', lang ? '🌐 অনলাইন বুকিং' : '🌐 Online'],
              ].map(([val, label]) => {
                const isSel = bookingSourceFilter === val;
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setBookingSourceFilter(val)}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: isSel ? '#0284C7' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: isSel ? '#0284C7' : '#CBD5E1',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isSel ? '#FFFFFF' : '#475569' }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Results Counter & Pagination Size Selector */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#64748B' }}>
            {lang
              ? `প্রদর্শিত হচ্ছে ${filtered.length === 0 ? 0 : (Math.min(bookingCurrentPage, Math.max(1, Math.ceil(filtered.length / bookingPageSize))) - 1) * bookingPageSize + 1}–${Math.min(Math.min(bookingCurrentPage, Math.max(1, Math.ceil(filtered.length / bookingPageSize))) * bookingPageSize, filtered.length)} টি বুকিং (${filtered.length} টির মধ্যে)`
              : `Showing ${filtered.length === 0 ? 0 : (Math.min(bookingCurrentPage, Math.max(1, Math.ceil(filtered.length / bookingPageSize))) - 1) * bookingPageSize + 1}–${Math.min(Math.min(bookingCurrentPage, Math.max(1, Math.ceil(filtered.length / bookingPageSize))) * bookingPageSize, filtered.length)} of ${filtered.length} bookings`}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '700' }}>
              {lang ? 'প্রতি পেজে:' : 'Per page:'}
            </Text>
            {[10, 20, 50].map(sz => (
              <TouchableOpacity
                key={sz}
                onPress={() => {
                  setBookingPageSize(sz);
                  setBookingCurrentPage(1);
                }}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: bookingPageSize === sz ? '#0284C7' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: bookingPageSize === sz ? '#0284C7' : '#CBD5E1',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: bookingPageSize === sz ? '#FFFFFF' : '#475569' }}>
                  {sz}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bookings Card List (Paginated) */}
        <View style={{ gap: 14 }}>
          {filtered.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>🔍</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4 }}>
                {lang ? 'কোনো বুকিং খুঁজে পাওয়া যায়নি' : 'No bookings found'}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', maxWidth: 360, marginBottom: 14 }}>
                {lang ? 'আপনার অনুসন্ধানের ফিল্টারের সাথে মিল থাকা কোনো বুকিং নেই। ফিল্টার পরিবর্তন করুন।' : 'No bookings match your current search and filter criteria. Try clearing filters.'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setBookingFilterStatus('all');
                  setBookingAirportFilter('all');
                  setBookingPaymentFilter('all');
                  setBookingStaffFilter('all');
                  setBookingSourceFilter('all');
                  setBookingSearchInput('');
                  setBookingSearchQuery('');
                  setBookingCurrentPage(1);
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0284C7' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{lang ? 'ফিল্টার রিসেট করুন' : 'Reset All Filters'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered
              .slice(
                (Math.min(bookingCurrentPage, Math.max(1, Math.ceil(filtered.length / bookingPageSize))) - 1) * bookingPageSize,
                Math.min(bookingCurrentPage, Math.max(1, Math.ceil(filtered.length / bookingPageSize))) * bookingPageSize
              )
              .map(b => {
              const statusColor = b.status === 'completed' ? '#059669' : b.status === 'cancelled' ? '#DC2626' : b.status === 'in_progress' ? '#D97706' : b.status === 'upcoming' ? '#2563EB' : '#7C3AED';
              const statusBg = b.status === 'completed' ? '#ECFDF5' : b.status === 'cancelled' ? '#FEF2F2' : b.status === 'in_progress' ? '#FEF3C7' : b.status === 'upcoming' ? '#EFF6FF' : '#F5F3FF';
              const statusBorder = b.status === 'completed' ? '#A7F3D0' : b.status === 'cancelled' ? '#FECACA' : b.status === 'in_progress' ? '#FDE68A' : b.status === 'upcoming' ? '#BFDBFE' : '#DDD6FE';

              const isAssigned = b.staff && b.staff !== 'Unassigned' && b.staff !== 'None';
              const completedMilestonesCount = (b.serviceProgress || []).filter(m => m.status === 'completed').length;
              const totalMilestonesCount = (b.serviceProgress || []).length || 6;
              const progressPercentage = Math.round((completedMilestonesCount / totalMilestonesCount) * 100);
              const activeMilestone = (b.serviceProgress || []).find(m => m.status === 'in_progress');

              return (
                <View
                  key={b.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: b.status === 'in_progress' ? '#F59E0B' : '#E2E8F0',
                    shadowColor: '#000',
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  {/* Top Bar: ID, Hub, Flight, Status Badge, Payment Badge */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>{b.id}</Text>

                      {/* Airport Hub Pill */}
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#334155' }}>📍 {b.airport}</Text>
                      </View>

                      {/* Direction Pill */}
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: b.direction === 'arrival' ? '#EFF6FF' : '#F0FDF4', borderWidth: 1, borderColor: b.direction === 'arrival' ? '#BFDBFE' : '#BBF7D0' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: b.direction === 'arrival' ? '#1D4ED8' : '#15803D' }}>
                          {b.direction === 'arrival' ? '🛬 ' + (lang ? 'আগমন' : 'Arrival') : '🛫 ' + (lang ? 'প্রস্থান' : 'Departure')}
                        </Text>
                      </View>

                      {/* Status Badge */}
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 6, backgroundColor: statusBg, borderWidth: 1, borderColor: statusBorder }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: statusColor, textTransform: 'uppercase' }}>
                          ● {b.status}
                        </Text>
                      </View>

                      {/* Offline Walk-in / Manual Badge */}
                      {b.isOfflineManual && (
                        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                            🏢 {b.sourceLabel || (lang ? 'অফলাইন কাউন্টার' : 'Offline Entry')}
                          </Text>
                        </View>
                      )}

                      {/* Entry Attribution Badge (Manager Attribution) */}
                      {b.enteredBy ? (
                        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>
                            ✍️ {lang ? 'এন্ট্রি:' : 'Entry:'} {b.enteredBy.name} ({b.enteredBy.email})
                          </Text>
                        </View>
                      ) : (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>
                            🌐 {lang ? 'অনলাইন বুকিং' : 'Online Booking'}
                          </Text>
                        </View>
                      )}

                      {/* Staff Assigned By Badge */}
                      {b.assignedBy && (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#15803D' }}>
                            👮‍♂️ {lang ? 'বরাদ্দকারী:' : 'Assigned By:'} {b.assignedBy.name}
                          </Text>
                        </View>
                      )}

                      {/* Dual-Vault Showcase Toggle (Master Vault Only) */}
                      {isMasterVaultActive && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={async () => {
                            const res = await toggleBookingShowcaseStatus(b.id);
                            setShowcaseBookingIds([...res.showcaseIds]);
                            setAdminNotice(
                              res.isShowcase
                                ? (lang ? `✓ বুকিং #${b.id} এখন দর্শক ডাটাবেজে (DB-1) দেখানো হবে` : `✓ Booking #${b.id} is now visible in Auditor DB-1`)
                                : (lang ? `🔒 বুকিং #${b.id} এখন দর্শক ডাটাবেজ (DB-1) থেকে লুকানো হল` : `🔒 Booking #${b.id} is now hidden from Auditor DB-1`)
                            );
                            setTimeout(() => setAdminNotice(''), 3500);
                          }}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2.5,
                            borderRadius: 6,
                            backgroundColor: showcaseBookingIds.includes(String(b.id)) ? '#DCFCE7' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: showcaseBookingIds.includes(String(b.id)) ? '#86EFAC' : '#CBD5E1',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontSize: 11 }}>{showcaseBookingIds.includes(String(b.id)) ? '👁️' : '🙈'}</Text>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: showcaseBookingIds.includes(String(b.id)) ? '#15803D' : '#64748B' }}>
                            {showcaseBookingIds.includes(String(b.id))
                              ? (lang ? 'DB-1: দৃশ্যমান' : 'DB-1: Visible')
                              : (lang ? 'DB-1: গোপন' : 'DB-1: Hidden')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Price and Payment Status */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A' }}>
                        {isAdmin ? `৳ ${(b.amount || 0).toLocaleString()}` : (lang ? '🔒 সংরক্ষিত' : '🔒 Protected')}
                      </Text>
                      {isAdmin ? (
                        <View style={{ paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 6, backgroundColor: b.paymentStatus === 'paid' ? '#ECFDF5' : b.paymentStatus === 'pay_after_service' ? '#EFF6FF' : b.paymentStatus === 'refunded' ? '#FEF2F2' : '#FFFBEB', borderWidth: 1, borderColor: b.paymentStatus === 'paid' ? '#A7F3D0' : b.paymentStatus === 'pay_after_service' ? '#BAE6FD' : b.paymentStatus === 'refunded' ? '#FECACA' : '#FDE68A', marginTop: 2 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: b.paymentStatus === 'paid' ? '#059669' : b.paymentStatus === 'pay_after_service' ? '#0284C7' : b.paymentStatus === 'refunded' ? '#DC2626' : '#D97706' }}>
                            {b.paymentStatus === 'paid' ? `✓ Paid (${b.paymentMethod || 'bKash'})` : b.paymentStatus === 'pay_after_service' ? '🤝 Pay After Service' : b.paymentStatus === 'refunded' ? '● Refunded' : '⏳ Pending'}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', marginTop: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>
                            {lang ? 'অর্থনৈতিক তথ্য গোপন' : 'Financials Hidden'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Flight & Travel Route Information */}
                  <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>
                        ✈️ {b.fno} • {b.airline}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                        📅 {b.date} • ⏰ {b.time}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                      🛣️ {b.origin} ➔ {b.destination}
                    </Text>
                  </View>

                  {/* Customer & Passenger Meta Row */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 10 }}>
                    <Text style={{ fontSize: 12.5, color: '#475569' }}>
                      👤 <Text style={{ fontWeight: '700', color: '#0F172A' }}>{b.customer}</Text> ({b.phone})
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569' }}>
                      👥 <Text style={{ fontWeight: '700', color: '#0F172A' }}>{b.passengers}</Text> {lang ? 'জন যাত্রী' : 'passengers'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569' }}>
                      🏷️ <Text style={{ fontWeight: '700', color: '#0F172A' }}>{b.package || b.service}</Text>
                    </Text>
                  </View>

                  {/* Staff Allocation Banner */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isAssigned ? '#F0FDF4' : '#FFFBEB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: isAssigned ? '#DCFCE7' : '#FEF3C7', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Text style={{ fontSize: 14 }}>{isAssigned ? '🧑‍✈️' : '⚠️'}</Text>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: isAssigned ? '#166534' : '#92400E' }}>
                          {isAssigned ? `${lang ? 'বরাদ্দকৃত স্টাফ:' : 'Staff Assigned:'} ${b.staff}` : (lang ? 'কোনো প্রোটোকল স্টাফ বরাদ্দ করা হয়নি' : 'No protocol staff allocated yet')}
                        </Text>
                        {b.supportStaff ? (
                          <Text style={{ fontSize: 11, color: '#15803D' }}>
                            {lang ? 'সহকারী:' : 'Assistant:'} {b.supportStaff}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleOpenAssignStaff(b)}
                      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: isAssigned ? '#FFFFFF' : '#D97706', borderWidth: 1, borderColor: isAssigned ? '#86EFAC' : '#B45309' }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: isAssigned ? '#15803D' : '#FFFFFF' }}>
                        {isAssigned ? (lang ? 'পরিবর্তন' : 'Reassign') : (lang ? 'স্টাফ বরাদ্দ' : 'Assign Staff')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Service Progress Milestone Mini-Bar */}
                  <View style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B' }}>
                        ⚡ {lang ? 'সার্ভিস অগ্রগতি:' : 'Service Progress:'} {completedMilestonesCount}/{totalMilestonesCount} {lang ? 'ধাপ সম্পন্ন' : 'stages done'} ({progressPercentage}%)
                      </Text>
                      {activeMilestone && (
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>
                          {activeMilestone.icon} {lang ? activeMilestone.labelBn : activeMilestone.labelEn}
                        </Text>
                      )}
                    </View>
                    <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                      <View
                        style={{
                          height: '100%',
                          width: `${progressPercentage}%`,
                          backgroundColor: progressPercentage === 100 ? '#10B981' : progressPercentage > 50 ? '#0284C7' : '#F59E0B',
                        }}
                      />
                    </View>
                  </View>

                  {/* Operational Action Buttons Bar */}
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 }}>
                    {/* View Details */}
                    <TouchableOpacity
                      onPress={() => handleOpenBookingDetails(b)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6.5, borderRadius: 8, backgroundColor: '#0284C7', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>👁️ {lang ? 'বিস্তারিত' : 'View Details'}</Text>
                    </TouchableOpacity>

                    {/* View / Print Invoice Voucher */}
                    <TouchableOpacity
                      onPress={() => setInvoiceModalBooking(b)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6.5, borderRadius: 8, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369A1' }}>📄 {lang ? 'রসিদ' : 'Invoice'}</Text>
                    </TouchableOpacity>

                    {/* View / Print VIP Greeter Placard */}
                    <TouchableOpacity
                      onPress={() => setPlacardModalBooking(b)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6.5, borderRadius: 8, backgroundColor: '#064E3B', borderWidth: 1, borderColor: '#F59E0B', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>🏷️ {lang ? 'প্লেকার্ড' : 'Placard'}</Text>
                    </TouchableOpacity>

                    {/* Service Progress Manager */}
                    <TouchableOpacity
                      onPress={() => handleOpenServiceProgress(b)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6.5, borderRadius: 8, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309' }}>⚡ {lang ? 'অগ্রগতি' : 'Progress'}</Text>
                    </TouchableOpacity>

                    {/* Update Status */}
                    <TouchableOpacity
                      onPress={() => handleOpenStatusUpdate(b)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6.5, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>🔄 {lang ? 'স্ট্যাটাস' : 'Status'}</Text>
                    </TouchableOpacity>

                    {/* Verify Payment (if pending) */}
                    {b.paymentStatus === 'pending' && (
                      <TouchableOpacity
                        onPress={() => handleVerifyBookingPayment(b.id)}
                        style={{ paddingHorizontal: 10, paddingVertical: 6.5, borderRadius: 8, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#065F46' }}>💳 {lang ? 'পেমেন্ট যাচাই' : 'Verify Paid'}</Text>
                      </TouchableOpacity>
                    )}

                    {/* Direct Refund Button for Paid Bookings */}
                    {b.paymentStatus === 'paid' && b.status !== 'cancelled' && (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedBooking(b);
                          setCancelReasonPreset('customer_request_refund');
                          setCancelCustomRemarks(lang ? 'ম্যানেজার কর্তৃক রিফান্ড ইস্যু' : 'Refund processed by Manager');
                          setCancelFeeInput('0');
                          setCancelRefundInput(String(b.amount || 0));
                          setCancelRefundAction('refund_now');
                          setShowCancelBookingModal(true);
                        }}
                        style={{ paddingHorizontal: 10, paddingVertical: 6.5, borderRadius: 8, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#EA580C' }}>🔄 {lang ? 'রিফান্ড' : 'Refund'}</Text>
                      </TouchableOpacity>
                    )}

                    {/* Cancel / Refund or Reactivate */}
                    {b.status !== 'cancelled' ? (
                      <TouchableOpacity
                        onPress={() => handleOpenCancelBooking(b)}
                        style={{ paddingHorizontal: 10, paddingVertical: 6.5, borderRadius: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>❌ {lang ? 'বাতিল' : 'Cancel'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleReactivateBooking(b.id)}
                        style={{ paddingHorizontal: 10, paddingVertical: 6.5, borderRadius: 8, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>↩️ {lang ? 'সক্রিয় করুন' : 'Reactivate'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Bookings Pagination Navigation Bar */}
        {Math.ceil(filtered.length / bookingPageSize) > 1 && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 14,
              marginTop: 10,
              flexWrap: 'wrap',
            }}
          >
            {/* First & Prev */}
            <TouchableOpacity
              disabled={bookingCurrentPage <= 1}
              onPress={() => setBookingCurrentPage(1)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: bookingCurrentPage <= 1 ? '#F1F5F9' : '#FFFFFF',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                opacity: bookingCurrentPage <= 1 ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>« First</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={bookingCurrentPage <= 1}
              onPress={() => setBookingCurrentPage(p => Math.max(1, p - 1))}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: bookingCurrentPage <= 1 ? '#F1F5F9' : '#FFFFFF',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                opacity: bookingCurrentPage <= 1 ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>‹ Prev</Text>
            </TouchableOpacity>

            {/* Page Indicator Pills */}
            {Array.from({ length: Math.ceil(filtered.length / bookingPageSize) })
              .map((_, i) => i + 1)
              .filter(p => p === 1 || p === Math.ceil(filtered.length / bookingPageSize) || Math.abs(p - bookingCurrentPage) <= 2)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const isGap = prev && p - prev > 1;
                const isCur = p === bookingCurrentPage;
                return (
                  <React.Fragment key={p}>
                    {isGap && <Text style={{ color: '#94A3B8', fontSize: 12 }}>…</Text>}
                    <TouchableOpacity
                      onPress={() => setBookingCurrentPage(p)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: isCur ? '#0284C7' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: isCur ? '#0284C7' : '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isCur ? '#FFFFFF' : '#334155' }}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}

            {/* Next & Last */}
            <TouchableOpacity
              disabled={bookingCurrentPage >= Math.ceil(filtered.length / bookingPageSize)}
              onPress={() => setBookingCurrentPage(p => Math.min(Math.ceil(filtered.length / bookingPageSize), p + 1))}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: bookingCurrentPage >= Math.ceil(filtered.length / bookingPageSize) ? '#F1F5F9' : '#FFFFFF',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                opacity: bookingCurrentPage >= Math.ceil(filtered.length / bookingPageSize) ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Next ›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={bookingCurrentPage >= Math.ceil(filtered.length / bookingPageSize)}
              onPress={() => setBookingCurrentPage(Math.ceil(filtered.length / bookingPageSize))}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: bookingCurrentPage >= Math.ceil(filtered.length / bookingPageSize) ? '#F1F5F9' : '#FFFFFF',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                opacity: bookingCurrentPage >= Math.ceil(filtered.length / bookingPageSize) ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Last »</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: VIEW BOOKING DETAILS (Comprehensive Multi-Tab Inspection Modal)  */}
        {/* ========================================================================= */}
        <Modal
          visible={showBookingDetailsModal && !!selectedBooking}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBookingDetailsModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 760, maxHeight: '90%', overflow: 'hidden', borderWidth: 1.5, borderColor: '#CBD5E1' }}>
              {selectedBooking && (
                <>
                  {/* Modal Header */}
                  <View style={{ backgroundColor: '#0F172A', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#FFFFFF' }}>{selectedBooking.id}</Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#38BDF8' }}>📍 {selectedBooking.airport}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: selectedBooking.status === 'completed' ? '#065F46' : selectedBooking.status === 'cancelled' ? '#991B1B' : '#1E3A8A' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase' }}>{selectedBooking.status}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setShowBookingDetailsModal(false)} style={{ padding: 6 }}>
                      <Text style={{ fontSize: 18, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Sub-tab Navigation */}
                  <View style={{ backgroundColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}>
                      {[
                        ['overview', lang ? '📋 সারসংক্ষেপ ও ফ্লাইট' : '📋 Flight Overview'],
                        ['passengers', lang ? '👥 যাত্রী ও যোগাযোগ' : '👥 Passengers'],
                        ['service', lang ? '🛎️ সার্ভিস ও অ্যাড-অন' : '🛎️ Service & Add-ons'],
                        ['staff', lang ? '🧑‍✈️ স্টাফ বরাদ্দ' : '🧑‍✈️ Staff Allocation'],
                        ['progress', lang ? '⚡ সার্ভিস অগ্রগতি' : '⚡ Service Progress'],
                        ...(isAdmin ? [['payment', lang ? '💳 পেমেন্ট ও ইনভয়েস' : '💳 Payment Details']] : []),
                        ['communication', lang ? '📨 যোগাযোগ ও নোটিফিকেশন' : '📨 Communication Log'],
                        ...(selectedBooking.status === 'cancelled' ? [['cancellation', lang ? '❌ বাতিলকরণ বিবরণ' : '❌ Cancellation']] : []),
                        ['audit', lang ? '📜 অডিট ইতিহাস' : '📜 Activity Log'],
                      ].map(([tabKey, tabLabel]) => {
                        const isTabSel = bookingDetailTab === tabKey;
                        return (
                          <TouchableOpacity
                            key={tabKey}
                            onPress={() => setBookingDetailTab(tabKey)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: isTabSel ? '#0284C7' : '#FFFFFF',
                              borderWidth: 1,
                              borderColor: isTabSel ? '#0284C7' : '#CBD5E1',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '800', color: isTabSel ? '#FFFFFF' : '#475569' }}>
                              {tabLabel}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Tab Body Content */}
                  <ScrollView style={{ padding: 18, maxHeight: 480 }}>
                    {/* TAB: OVERVIEW & FLIGHT */}
                    {bookingDetailTab === 'overview' && (
                      <View style={{ gap: 14 }}>
                        <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>✈️ {lang ? 'ফ্লাইটের বিবরণ' : 'Flight Itinerary'}</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'এয়ারলাইন ও ফ্লাইট নম্বর' : 'Airline & Flight No'}</Text>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.airline} ({selectedBooking.fno})</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'তারিখ ও সময়' : 'Date & Schedule'}</Text>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.date} • {selectedBooking.time}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'রুট' : 'Route'}</Text>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.origin} ➔ {selectedBooking.destination}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'টার্মিনাল ও সাক্ষাৎ স্থান' : 'Terminal & Meeting Point'}</Text>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.terminal} ({selectedBooking.meetingPoint})</Text>
                            </View>
                          </View>
                        </View>

                        <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>📝 {lang ? 'অতিরিক্ত মন্তব্য ও নির্দেশনা' : 'Remarks & Instructions'}</Text>
                          <Text style={{ fontSize: 13, color: '#334155', lineHeight: 19 }}>
                            {selectedBooking.remarks || (lang ? 'কোনো বিশেষ নির্দেশনা নেই।' : 'No additional instructions provided.')}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* TAB: PASSENGERS */}
                    {bookingDetailTab === 'passengers' && (
                      <View style={{ gap: 14 }}>
                        <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>👤 {lang ? 'প্রধান যাত্রী ও যোগাযোগ' : 'Primary Contact Passenger'}</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'নাম' : 'Full Name'}</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.customer}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'মোবাইল / WhatsApp' : 'Phone / WhatsApp'}</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.phone}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'ইমেইল' : 'Email Address'}</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.email || 'N/A'}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'জাতীয়তা ও পাসপোর্ট' : 'Nationality & Passport'}</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.nationality || 'Bangladeshi'} ({selectedBooking.passportNumber || 'N/A'})</Text>
                            </View>
                          </View>
                        </View>

                        <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>👥 {lang ? 'যাত্রী তালিকা ও বিশেষ প্রয়োজন' : 'Passenger List & Needs'}</Text>
                          {(selectedBooking.passengerDetails || []).map((p, pIdx) => (
                            <View key={pIdx} style={{ backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 8 }}>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{pIdx + 1}. {p.name} ({p.type})</Text>
                              {p.notes ? (
                                <Text style={{ fontSize: 12, color: '#B45309', marginTop: 3 }}>⚠️ {p.notes}</Text>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* TAB: SERVICE & ADDONS */}
                    {bookingDetailTab === 'service' && (
                      <View style={{ gap: 14 }}>
                        <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>🛎️ {lang ? 'প্রোটোকল প্যাকেজ' : 'Protocol Package'}</Text>
                          <Text style={{ fontSize: 15, fontWeight: '900', color: '#0284C7' }}>{selectedBooking.package || selectedBooking.service}</Text>
                          <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                            {selectedBooking.direction === 'arrival'
                              ? (lang ? 'বিমান অবতরণের পর বোর্ডিং ব্রিজ থেকে লাগেজ সংগ্রহ ও গাড়ি পর্যন্ত পূর্ণ ভিআইপি এসকর্ট।' : 'VIP escort from boarding bridge through immigration to transfer vehicle.')
                              : (lang ? 'এয়ারপোর্টের ড্রপ-অফ গেট থেকে চেক-ইন, ইমিগ্রেশন ও লাউঞ্জ পর্যন্ত প্রোটোকল সার্ভিস।' : 'Curb-to-gate protocol escort through check-in and immigration.')}
                          </Text>
                        </View>

                        {/* Visa On Arrival Details & Document Inspection for Manager */}
                        {((selectedBooking.addons || []).includes('visa') ||
                          (selectedBooking.addons || []).includes('visa_on_arrival') ||
                          selectedBooking.addonDetails?.visa ||
                          selectedBooking.addonDetails?.visa_on_arrival) && (
                          <VisaOnArrivalUploadSection
                            lang={lang}
                            readOnly={true}
                            visaDetails={
                              selectedBooking.addonDetails?.visa_on_arrival ||
                              selectedBooking.addonDetails?.visa ||
                              {}
                            }
                          />
                        )}

                        <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>✨ {lang ? 'নির্বাচিত অতিরিক্ত সেবাসমূহ (Add-ons)' : 'Selected Add-on Services'}</Text>
                          {(selectedBooking.addons || []).length === 0 ? (
                            <Text style={{ fontSize: 12.5, color: '#64748B' }}>{lang ? 'কোনো অতিরিক্ত সেবা নির্বাচিত নেই।' : 'No additional add-on services selected.'}</Text>
                          ) : (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {(selectedBooking.addons || []).map((addonId, aIdx) => {
                                const addonObj = ADDONS.find(a => a.id === addonId);
                                const asset = getAddonAsset(addonId) || addonObj?.image;
                                const addonTitle = addonObj?.n ? addonObj.n[lang ? 1 : 0] : (lang ? addonObj?.titleBn : addonObj?.titleEn) || addonId;
                                return (
                                  <View key={aIdx} style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    {asset ? (
                                      <Image source={asset} style={{ width: 18, height: 18, borderRadius: 3 }} resizeMode="contain" />
                                    ) : (
                                      <Text style={{ fontSize: 14 }}>{addonObj?.icon || '✨'}</Text>
                                    )}
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{addonTitle}</Text>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>

                        {selectedBooking.vehicle && selectedBooking.vehicle !== 'None' && (
                          <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <Image source={getAddonAsset('transfer')} style={{ width: 18, height: 18, borderRadius: 3 }} resizeMode="contain" />
                              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{lang ? 'এয়ারপোর্ট ট্রান্সফার গাড়ি' : 'Airport Transfer Vehicle'}</Text>
                            </View>
                            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0284C7' }}>{selectedBooking.vehicle}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* TAB: STAFF ALLOCATION */}
                    {bookingDetailTab === 'staff' && (
                      <View style={{ gap: 14 }}>
                        <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>🧑‍✈️ {lang ? 'দায়িত্বরত প্রোটোকল অফিসার' : 'Assigned Protocol Officers'}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                setShowBookingDetailsModal(false);
                                handleOpenAssignStaff(selectedBooking);
                              }}
                              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#0284C7' }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{lang ? 'পরিবর্তন করুন' : 'Change Staff'}</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={{ backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'প্রধান অফিসার' : 'Lead Protocol Officer'}</Text>
                            <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>{selectedBooking.staff}</Text>
                            {selectedBooking.staffNotes ? (
                              <Text style={{ fontSize: 12, color: '#B45309', marginTop: 4 }}>📝 {selectedBooking.staffNotes}</Text>
                            ) : null}
                          </View>

                          {selectedBooking.supportStaff && (
                            <View style={{ backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'সহকারী / সাপোর্ট স্টাফ' : 'Assistant Protocol Escort'}</Text>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.supportStaff}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {/* TAB: SERVICE PROGRESS */}
                    {bookingDetailTab === 'progress' && (
                      <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>⚡ {lang ? 'সার্ভিস মাইলস্টোন ট্র্যাকার' : 'Service Milestone Timeline'}</Text>
                          <TouchableOpacity
                            onPress={() => handleAdvanceProgress(selectedBooking.id)}
                            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#D97706' }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>⚡ {lang ? 'পরবর্তী ধাপে এগিয়ে নিন' : 'Advance Next'}</Text>
                          </TouchableOpacity>
                        </View>

                        {(selectedBooking.serviceProgress || []).map((m, mIdx) => (
                          <View
                            key={m.id || mIdx}
                            style={{
                              backgroundColor: m.status === 'completed' ? '#ECFDF5' : m.status === 'in_progress' ? '#FFFBEB' : '#FFFFFF',
                              borderRadius: 10,
                              padding: 12,
                              borderWidth: 1.5,
                              borderColor: m.status === 'completed' ? '#A7F3D0' : m.status === 'in_progress' ? '#FDE68A' : '#E2E8F0',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <Text style={{ fontSize: 20 }}>{m.icon || '📍'}</Text>
                              <View>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{lang ? m.labelBn : m.labelEn}</Text>
                                {m.completedAt ? (
                                  <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>✓ {m.completedAt}</Text>
                                ) : null}
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TouchableOpacity
                                onPress={() => handleToggleMilestone(selectedBooking.id, mIdx, m.status === 'completed' ? 'pending' : 'completed')}
                                style={{
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 6,
                                  backgroundColor: m.status === 'completed' ? '#059669' : '#F1F5F9',
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '800', color: m.status === 'completed' ? '#FFFFFF' : '#475569' }}>
                                  {m.status === 'completed' ? '✓ Done' : 'Mark Done'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* TAB: PAYMENT DETAILS & BREAKDOWN */}
                    {bookingDetailTab === 'payment' && (
                      <View style={{ gap: 14 }}>
                        <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>💳 {lang ? 'পেমেন্ট ও গেটওয়ে মেটা' : 'Payment Gateway Information'}</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'পেমেন্ট স্ট্যাটাস' : 'Payment Status'}</Text>
                              <Text style={{ fontSize: 14, fontWeight: '900', color: selectedBooking.paymentStatus === 'paid' ? '#059669' : selectedBooking.paymentStatus === 'pay_after_service' ? '#0284C7' : '#DC2626', marginTop: 2 }}>
                                {selectedBooking.paymentStatus === 'paid' ? '● Verified Paid' : selectedBooking.paymentStatus === 'pay_after_service' ? '🤝 Pay After Service' : selectedBooking.paymentStatus}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'গেটওয়ে / মাধ্যম' : 'Payment Gateway'}</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.paymentMethod || 'bKash'}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'ট্রানজেকশন রেফারেন্স' : 'Transaction Ref (TrxID)'}</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.paymentRef || 'N/A'}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{lang ? 'পেমেন্ট তারিখ' : 'Payment Date'}</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.paymentDate || 'Today'}</Text>
                            </View>
                          </View>
                        </View>

                        {/* Itemized Transparent Pricing Breakdown Table */}
                        <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>🧾 {lang ? 'স্বচ্ছ মূল্য হিসাব বিবরণী' : 'Transparent Pricing Breakdown'}</Text>
                          <View style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 12.5, color: '#475569' }}>{lang ? 'বেস প্যাকেজ ভাড়া' : 'Base Protocol Package'}</Text>
                              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>৳ {(selectedBooking.pricingBreakdown?.baseFare || 2500).toLocaleString()}</Text>
                            </View>
                            {selectedBooking.pricingBreakdown?.paxBreakdown ? (
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 12.5, color: '#475569' }}>{lang ? 'যাত্রী বিবরণ' : 'Passenger Details'}</Text>
                                <Text style={{ fontSize: 12.5, color: '#64748B' }}>{selectedBooking.pricingBreakdown.paxBreakdown}</Text>
                              </View>
                            ) : null}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 12.5, color: '#475569' }}>{lang ? 'অতিরিক্ত সেবা (Add-ons)' : 'Add-on Services'}</Text>
                              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>৳ {(selectedBooking.pricingBreakdown?.addonsCost || 0).toLocaleString()}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 12.5, color: '#475569' }}>{lang ? 'সরকারি ভ্যাট ও প্ল্যাটফর্ম ফি' : 'Govt VAT (5%) & Platform Fee'}</Text>
                              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>৳ {((selectedBooking.pricingBreakdown?.vat || 0) + (selectedBooking.pricingBreakdown?.platformFee || 0)).toLocaleString()}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: '#CBD5E1', paddingTop: 8, marginTop: 4 }}>
                              <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>{lang ? 'সর্বমোট পরিশোধিত' : 'Final Total Amount'}</Text>
                              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0284C7' }}>৳ {(selectedBooking.amount || 0).toLocaleString()}</Text>
                            </View>
                          </View>
                        </View>

                        {(isAdmin || isManager) && selectedBooking.status !== 'cancelled' && (
                          <TouchableOpacity
                            onPress={() => {
                              setShowBookingDetailsModal(false);
                              setCancelReasonPreset('customer_request_refund');
                              setCancelCustomRemarks(lang ? 'ম্যানেজার কর্তৃক রিফান্ড প্রসেস' : 'Refund processed by Manager');
                              setCancelFeeInput('0');
                              setCancelRefundInput(String(selectedBooking.amount || 0));
                              setCancelRefundAction('refund_now');
                              setShowCancelBookingModal(true);
                            }}
                            style={{ backgroundColor: '#DC2626', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                              🔄 {lang ? 'এই বুকিং বাতিল ও তাত্ক্ষণিক রিফান্ড করুন' : 'Cancel Booking & Refund Now'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* TAB: CANCELLATION */}
                    {bookingDetailTab === 'cancellation' && selectedBooking.cancellation && (
                      <View style={{ backgroundColor: '#FEF2F2', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', gap: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#991B1B' }}>❌ {lang ? 'বাতিলকরণ ও রিফান্ড রিপোর্ট' : 'Cancellation & Refund Report'}</Text>
                        <Text style={{ fontSize: 13, color: '#7F1D1D' }}><Text style={{ fontWeight: '700' }}>{lang ? 'বাতিলের কারণ:' : 'Reason:'}</Text> {selectedBooking.cancellation.reason}</Text>
                        <Text style={{ fontSize: 13, color: '#7F1D1D' }}><Text style={{ fontWeight: '700' }}>{lang ? 'বাতিলের সময়:' : 'Cancelled At:'}</Text> {selectedBooking.cancellation.cancelledAt}</Text>
                        <Text style={{ fontSize: 13, color: '#7F1D1D' }}><Text style={{ fontWeight: '700' }}>{lang ? 'রিফান্ড পরিমাণ:' : 'Refund Amount:'}</Text> ৳ {selectedBooking.cancellation.refundAmount}</Text>
                        <Text style={{ fontSize: 13, color: '#7F1D1D' }}><Text style={{ fontWeight: '700' }}>{lang ? 'রিফান্ড রেফারেন্স:' : 'Refund Reference:'}</Text> {selectedBooking.cancellation.refundRef}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setShowBookingDetailsModal(false);
                            handleReactivateBooking(selectedBooking.id);
                          }}
                          style={{ marginTop: 8, paddingVertical: 8, borderRadius: 8, backgroundColor: '#059669', alignItems: 'center' }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>↩️ {lang ? 'বুকিং পুনরায় সক্রিয় করুন' : 'Reactivate Booking'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* TAB: COMMUNICATION HISTORY */}
                    {bookingDetailTab === 'communication' && (
                      <View style={{ gap: 10 }}>
                        <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                              {lang ? 'প্রেরিত বার্তা ও নোটিফিকেশন' : 'Dispatched Communication & Alerts'}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              {lang ? 'এসএমএস, ইমেইল ও পুশ নোটিফিকেশন ডেলিভারি লগ' : 'SMS, Email & Push notification delivery audit trail'}
                            </Text>
                          </View>
                          <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#166534' }}>
                              {bookingCommLogs.length} {lang ? 'টি বার্তা' : 'Messages'}
                            </Text>
                          </View>
                        </View>

                        {bookingCommLogs.length === 0 ? (
                          <View style={{ padding: 24, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <Text style={{ fontSize: 24, marginBottom: 8 }}>📭</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>
                              {lang ? 'এই বুকিংয়ের জন্য এখনও কোনো নোটিফিকেশন লগ পাওয়া যায়নি।' : 'No communication logs recorded yet for this booking.'}
                            </Text>
                          </View>
                        ) : (
                          bookingCommLogs.map((cLog, cIdx) => (
                            <View
                              key={cIdx}
                              style={{
                                backgroundColor: '#FFFFFF',
                                padding: 14,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                shadowColor: '#0F172A',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.04,
                                shadowRadius: 4,
                              }}
                            >
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <View
                                    style={{
                                      paddingHorizontal: 8,
                                      paddingVertical: 3,
                                      borderRadius: 6,
                                      backgroundColor:
                                        cLog.channel === 'sms'
                                          ? '#E0F2FE'
                                          : cLog.channel === 'email'
                                          ? '#FEF3C7'
                                          : '#FCE7F3',
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        fontWeight: '800',
                                        color:
                                          cLog.channel === 'sms'
                                            ? '#0369A1'
                                            : cLog.channel === 'email'
                                            ? '#B45309'
                                            : '#BE185D',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      {cLog.channel === 'sms' ? '📱 SMS' : cLog.channel === 'email' ? '📧 Email' : '🔔 Push / In-App'}
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                    {cLog.title}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>✓ Delivered</Text>
                                </View>
                              </View>

                              {cLog.recipient ? (
                                <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>
                                  {lang ? 'প্রাপক:' : 'Recipient:'} <Text style={{ fontWeight: '700', color: '#0F172A' }}>{cLog.recipient}</Text>
                                </Text>
                              ) : null}

                              <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' }}>
                                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                                  {cLog.message}
                                </Text>
                              </View>

                              <Text style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 8, textAlign: 'right' }}>
                                {new Date(cLog.timestamp).toLocaleString(lang ? 'bn-BD' : 'en-GB')}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}

                    {/* TAB: AUDIT LOG */}
                    {bookingDetailTab === 'audit' && (
                      <View style={{ gap: 12 }}>
                        {/* Manager Attribution & Responsibility Trace Card */}
                        <View style={{ backgroundColor: '#F0F9FF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', gap: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E0F2FE', paddingBottom: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 15 }}>🛡️</Text>
                              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0369A1' }}>
                                {lang ? 'ম্যানেজার অ্যাক্টিভিটি ও দায়িত্বশীলতা ট্র্যাকিং' : 'Manager Attribution & Responsibility Trace'}
                              </Text>
                            </View>
                            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#E0F2FE' }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7' }}>
                                {lang ? 'এডমিন অডিট ভিউ' : 'Admin Audit View'}
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            {/* Created / Entered By */}
                            <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                              <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                                ✍️ {lang ? 'বুকিং তৈরি / এন্ট্রি কারী' : 'Created / Entered By'}
                              </Text>
                              {selectedBooking.enteredBy ? (
                                <View style={{ marginTop: 4 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                    {selectedBooking.enteredBy.name}
                                  </Text>
                                  <Text style={{ fontSize: 11.5, color: '#0284C7', fontWeight: '700' }}>
                                    📧 {selectedBooking.enteredBy.email}
                                  </Text>
                                  <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                                    ⏰ {selectedBooking.enteredBy.time || (selectedBooking.enteredBy.timestamp ? new Date(selectedBooking.enteredBy.timestamp).toLocaleTimeString() : 'N/A')} ({selectedBooking.enteredBy.role === 'admin' ? 'Super Admin' : 'Manager'})
                                  </Text>
                                </View>
                              ) : (
                                <View style={{ marginTop: 4 }}>
                                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                                    🌐 {lang ? 'সরাসরি অনলাইন কাস্টমার বুকিং' : 'Direct Online Customer Booking'}
                                  </Text>
                                  <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                                    FlightCare Web / Mobile App Client
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Staff Assigned By */}
                            <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                              <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                                🧑‍✈️ {lang ? 'স্টাফ বরাদ্দকারী ম্যানেজার' : 'Staff Assigned By'}
                              </Text>
                              {selectedBooking.assignedBy ? (
                                <View style={{ marginTop: 4 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                    {selectedBooking.assignedBy.name}
                                  </Text>
                                  <Text style={{ fontSize: 11.5, color: '#0284C7', fontWeight: '700' }}>
                                    📧 {selectedBooking.assignedBy.email}
                                  </Text>
                                  <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                                    👮‍♂️ অফিসার: {selectedBooking.staff || 'N/A'} • ⏰ {selectedBooking.assignedBy.time || 'N/A'}
                                  </Text>
                                </View>
                              ) : selectedBooking.staff && selectedBooking.staff !== 'Unassigned' ? (
                                <View style={{ marginTop: 4 }}>
                                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                                    👮‍♂️ অফিসার: {selectedBooking.staff}
                                  </Text>
                                  <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                                    {lang ? 'প্যানেল থেকে বরাদ্দ করা হয়েছে' : 'Assigned via Panel'}
                                  </Text>
                                </View>
                              ) : (
                                <View style={{ marginTop: 4 }}>
                                  <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                                    {lang ? 'এখনও কোনো স্টাফ বরাদ্দ করা হয়নি' : 'No staff assigned yet'}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Last Modified / Status Updated By */}
                            {selectedBooking.lastModifiedBy && (
                              <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                                  ✏️ {lang ? 'সর্বশেষ সম্পাদনাকারী' : 'Last Modified By'}
                                </Text>
                                <View style={{ marginTop: 4 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                    {selectedBooking.lastModifiedBy.name}
                                  </Text>
                                  <Text style={{ fontSize: 11.5, color: '#0284C7', fontWeight: '700' }}>
                                    📧 {selectedBooking.lastModifiedBy.email}
                                  </Text>
                                  <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                                    ⏰ {selectedBooking.lastModifiedBy.time || 'N/A'}
                                  </Text>
                                </View>
                              </View>
                            )}

                            {/* Cancelled By (if cancelled) */}
                            {selectedBooking.cancellation?.cancelledBy && (
                              <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#DC2626', textTransform: 'uppercase' }}>
                                  ❌ {lang ? 'বাতিলকারী ম্যানেজার' : 'Cancelled By'}
                                </Text>
                                <View style={{ marginTop: 4 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#991B1B' }}>
                                    {selectedBooking.cancellation.cancelledBy.name}
                                  </Text>
                                  <Text style={{ fontSize: 11.5, color: '#B91C1C', fontWeight: '700' }}>
                                    📧 {selectedBooking.cancellation.cancelledBy.email}
                                  </Text>
                                  <Text style={{ fontSize: 10.5, color: '#7F1D1D', marginTop: 2 }}>
                                    ⏰ {selectedBooking.cancellation.cancelledAt || 'N/A'}
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Chronological Activity Timeline */}
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginTop: 6 }}>
                          ⏱️ {lang ? 'স্ট্যাটাস ও কার্যকলাপের সময়ক্রমিক ইতিহাস' : 'Chronological Activity Timeline'}
                        </Text>
                        {(selectedBooking.statusHistory || []).map((log, lIdx) => (
                          <View key={lIdx} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{log.label || log.status}</Text>
                              {log.note ? <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{log.note}</Text> : null}
                              {log.by && (
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7', marginTop: 3 }}>
                                  👤 {lang ? 'সম্পাদনাকারী:' : 'Performed by:'} {log.by.name} ({log.by.email})
                                </Text>
                              )}
                            </View>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8' }}>{log.time || 'N/A'}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </ScrollView>

                  {/* Modal Footer Controls */}
                  <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                    {(isAdmin || isManager) && (
                      <>
                        <TouchableOpacity
                          onPress={() => {
                            const target = selectedBooking;
                            setShowBookingDetailsModal(false);
                            setPlacardModalBooking(target);
                          }}
                          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#064E3B', borderWidth: 1, borderColor: '#F59E0B', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>🏷️ {lang ? 'ভিআইপি প্লেকার্ড প্রিন্ট' : 'VIP Placard'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            const target = selectedBooking;
                            setShowBookingDetailsModal(false);
                            setInvoiceModalBooking(target);
                          }}
                          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#059669', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>📄 {lang ? 'ইনভয়েস / রসিদ প্রিন্ট' : 'Print Invoice'}</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {(isAdmin || isManager) && selectedBooking.status !== 'cancelled' && (
                      <TouchableOpacity
                        onPress={() => {
                          setShowBookingDetailsModal(false);
                          handleOpenCancelBooking(selectedBooking);
                        }}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>🔄 {lang ? 'বাতিল ও রিফান্ড' : 'Cancel & Refund'}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        setShowBookingDetailsModal(false);
                        handleOpenAssignStaff(selectedBooking);
                      }}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0284C7' }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>🧑‍✈️ {lang ? 'স্টাফ বরাদ্দ' : 'Assign Staff'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowBookingDetailsModal(false)}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E2E8F0' }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155' }}>{lang ? 'বন্ধ করুন' : 'Close'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL 2: ASSIGN STAFF MODAL (Roster, Duty Status, Station Matching)       */}
        {/* ========================================================================= */}
        <Modal
          visible={showAssignStaffModal && !!selectedBooking}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAssignStaffModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90%', overflow: 'hidden', borderWidth: 1.5, borderColor: '#CBD5E1' }}>
              {selectedBooking && (
                <>
                  <View style={{ backgroundColor: '#0284C7', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFFFFF' }}>
                        🧑‍✈️ {lang ? 'প্রোটোকল স্টাফ বরাদ্দ করুন' : 'Assign Protocol Staff'}
                      </Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                        {selectedBooking.id} • {selectedBooking.airport} Hub • {selectedBooking.customer}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowAssignStaffModal(false)}>
                      <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '800' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ padding: 18, maxHeight: 440 }}>
                    {/* Station Filter */}
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                      📍 {lang ? 'স্টেশন অনুযায়ী ফিল্টার:' : 'Filter Staff by Airport Station:'}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14 }}>
                      {[['all', lang ? 'সকল স্টেশন' : 'All Stations'], ['DAC', 'Dhaka (DAC)'], ['CGP', 'Chittagong (CGP)'], ['ZYL', 'Sylhet (ZYL)']].map(([stCode, stLabel]) => (
                        <TouchableOpacity
                          key={stCode}
                          onPress={() => setAssignStationFilter(stCode)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            backgroundColor: assignStationFilter === stCode ? '#0F172A' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: assignStationFilter === stCode ? '#0F172A' : '#CBD5E1',
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: assignStationFilter === stCode ? '#FFFFFF' : '#475569' }}>
                            {stLabel}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Roster Cards List */}
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 8 }}>
                      👔 {lang ? 'প্রধান প্রোটোকল অফিসার নির্বাচন করুন:' : 'Select Lead Protocol Officer:'}
                    </Text>
                    <View style={{ gap: 8, marginBottom: 16 }}>
                      {staffRoster
                        .filter(st => isFieldProtocolOfficer(st))
                        .filter(st => assignStationFilter === 'all' || st.airport === assignStationFilter)
                        .map(st => {
                          const isLeadSel = assignLeadStaffId === st.id;
                          return (
                            <TouchableOpacity
                              key={st.id}
                              onPress={() => setAssignLeadStaffId(st.id)}
                              style={{
                                backgroundColor: isLeadSel ? '#F0F9FF' : '#FFFFFF',
                                borderRadius: 12,
                                padding: 12,
                                borderWidth: 1.5,
                                borderColor: isLeadSel ? '#0284C7' : '#E2E8F0',
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{st.name}</Text>
                                  <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: st.status === 'available' ? '#DCFCE7' : st.status === 'in_service' ? '#FEF3C7' : '#F1F5F9' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: st.status === 'available' ? '#15803D' : st.status === 'in_service' ? '#B45309' : '#64748B' }}>
                                      {st.status === 'available' ? '🟢 Available' : st.status === 'in_service' ? '🟡 Busy' : '⚪ Off-duty'}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{st.role} • 📍 {st.station} • ⭐ {st.rating}</Text>
                                <Text style={{ fontSize: 11, color: '#94A3B8' }}>🕒 {st.shift} • 📞 {st.phone}</Text>
                              </View>
                              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isLeadSel ? '#0284C7' : '#CBD5E1', justifyContent: 'center', alignItems: 'center' }}>
                                {isLeadSel && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#0284C7' }} />}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                    </View>

                    {/* Assistant / Support Staff Selection */}
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                      🤝 {lang ? 'সহকারী / সাপোর্ট অফিসার (ঐচ্ছিক):' : 'Select Assistant / Support Escort (Optional):'}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14 }}>
                      <TouchableOpacity
                        onPress={() => setAssignSupportStaffId('')}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          backgroundColor: assignSupportStaffId === '' ? '#0F172A' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: assignSupportStaffId === '' ? '#0F172A' : '#CBD5E1',
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: assignSupportStaffId === '' ? '#FFFFFF' : '#475569' }}>
                          {lang ? 'কেউ না' : 'None'}
                        </Text>
                      </TouchableOpacity>
                      {staffRoster.filter(st => isFieldProtocolOfficer(st)).map(st => {
                        const isSuppSel = assignSupportStaffId === st.id;
                        return (
                          <TouchableOpacity
                            key={st.id}
                            onPress={() => setAssignSupportStaffId(st.id)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 8,
                              backgroundColor: isSuppSel ? '#0284C7' : '#FFFFFF',
                              borderWidth: 1,
                              borderColor: isSuppSel ? '#0284C7' : '#CBD5E1',
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSuppSel ? '#FFFFFF' : '#475569' }}>
                              {st.name} ({(st.role || 'Officer').slice(0, 10)})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Operational Notes for Staff */}
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                      📝 {lang ? 'স্টাফের জন্য বিশেষ নির্দেশনা:' : 'Operational Instructions for Staff:'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC', height: 70, textAlignVertical: 'top' }]}
                      multiline
                      numberOfLines={3}
                      placeholder={lang ? 'যেমন: বোর্ডিং ব্রিজ গেট ৪ এ নেমবোর্ড নিয়ে উপস্থিত থাকুন...' : 'e.g., Hold nameboard at Boarding Bridge 4, assist with 3 heavy bags...'}
                      value={assignStaffNotes}
                      onChangeText={setAssignStaffNotes}
                    />
                  </ScrollView>

                  {/* Modal Footer Controls */}
                  <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => handleUnassignStaff(selectedBooking.id)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>{lang ? 'স্টাফ প্রত্যাহার' : 'Unassign Staff'}</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setShowAssignStaffModal(false)}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E2E8F0' }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>{lang ? 'বাতিল' : 'Cancel'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSaveStaffAssignment}
                        style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0284C7' }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>✓ {lang ? 'বরাদ্দ নিশ্চিত করুন' : 'Confirm Assignment'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL 3: SERVICE PROGRESS MILESTONE MANAGER MODAL                         */}
        {/* ========================================================================= */}
        <Modal
          visible={showServiceProgressModal && !!selectedBooking}
          transparent
          animationType="fade"
          onRequestClose={() => setShowServiceProgressModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90%', overflow: 'hidden', borderWidth: 1.5, borderColor: '#CBD5E1' }}>
              {selectedBooking && (
                <>
                  <View style={{ backgroundColor: '#D97706', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFFFFF' }}>
                        ⚡ {lang ? 'সার্ভিস অগ্রগতি ও চেকপয়েন্ট নিয়ন্ত্রণ' : 'Manage Service Progress'}
                      </Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
                        {selectedBooking.id} • {selectedBooking.direction === 'arrival' ? '🛬 Arrival Protocol' : '🛫 Departure Protocol'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowServiceProgressModal(false)}>
                      <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '800' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ padding: 18, maxHeight: 440 }}>
                    {/* Overall Progress Gauge */}
                    <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{lang ? 'সামগ্রিক অগ্রগতি' : 'Overall Completion'}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: '#D97706' }}>
                          {Math.round((((selectedBooking.serviceProgress || []).filter(m => m.status === 'completed').length) / ((selectedBooking.serviceProgress || []).length || 6)) * 100)}%
                        </Text>
                      </View>
                      <View style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                        <View
                          style={{
                            height: '100%',
                            width: `${Math.round((((selectedBooking.serviceProgress || []).filter(m => m.status === 'completed').length) / ((selectedBooking.serviceProgress || []).length || 6)) * 100)}%`,
                            backgroundColor: '#D97706',
                          }}
                        />
                      </View>
                    </View>

                    {/* Advance Button Banner */}
                    <TouchableOpacity
                      onPress={() => handleAdvanceProgress(selectedBooking.id)}
                      style={{ backgroundColor: '#0284C7', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 16 }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                        ⚡ {lang ? 'পরবর্তী ধাপে স্বয়ংক্রিয়ভাবে এগিয়ে নিন' : 'Advance to Next Stage (1-Tap)'}
                      </Text>
                    </TouchableOpacity>

                    {/* Step-by-Step Interactive Checklist */}
                    <View style={{ gap: 10, marginBottom: 16 }}>
                      {(selectedBooking.serviceProgress || []).map((m, mIdx) => (
                        <View
                          key={m.id || mIdx}
                          style={{
                            backgroundColor: m.status === 'completed' ? '#ECFDF5' : m.status === 'in_progress' ? '#FFFBEB' : '#FFFFFF',
                            borderRadius: 12,
                            padding: 12,
                            borderWidth: 1.5,
                            borderColor: m.status === 'completed' ? '#A7F3D0' : m.status === 'in_progress' ? '#FDE68A' : '#E2E8F0',
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <Text style={{ fontSize: 20 }}>{m.icon || '📍'}</Text>
                              <View>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                  {mIdx + 1}. {lang ? m.labelBn : m.labelEn}
                                </Text>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: m.status === 'completed' ? '#059669' : m.status === 'in_progress' ? '#D97706' : '#94A3B8' }}>
                                  {m.status === 'completed' ? `✓ Completed (${m.completedAt || 'Done'})` : m.status === 'in_progress' ? '🟡 Currently Active' : '⚪ Pending'}
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TouchableOpacity
                                onPress={() => handleToggleMilestone(selectedBooking.id, mIdx, 'completed')}
                                style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: m.status === 'completed' ? '#059669' : '#F1F5F9' }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '800', color: m.status === 'completed' ? '#FFFFFF' : '#334155' }}>✓ Done</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleToggleMilestone(selectedBooking.id, mIdx, 'in_progress')}
                                style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: m.status === 'in_progress' ? '#D97706' : '#F1F5F9' }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '800', color: m.status === 'in_progress' ? '#FFFFFF' : '#334155' }}>▶ Active</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleToggleMilestone(selectedBooking.id, mIdx, 'pending')}
                                style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F1F5F9' }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>Reset</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Operational Milestone Note Input */}
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                      📝 {lang ? 'বর্তমান ধাপের কার্য বিবরণী / নোট:' : 'Milestone Checkpoint Remark:'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      placeholder={lang ? 'যেমন: যাত্রী বোর্ডিং ব্রিজ ৩ দিয়ে বের হয়েছেন...' : 'e.g., Passenger met at Boarding Bridge 4, customs cleared...'}
                      value={progressNotesInput}
                      onChangeText={setProgressNotesInput}
                    />
                  </ScrollView>

                  <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setShowServiceProgressModal(false)}
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0284C7' }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>{lang ? 'সম্পন্ন' : 'Done'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL 4: MANAGE CANCELLATIONS & REFUNDS MODAL                             */}
        {/* ========================================================================= */}
        <Modal
          visible={showCancelBookingModal && !!selectedBooking}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCancelBookingModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: '90%', overflow: 'hidden', borderWidth: 1.5, borderColor: '#FECACA' }}>
              {selectedBooking && (
                <>
                  <View style={{ backgroundColor: '#DC2626', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFFFFF' }}>
                        ❌ {lang ? 'বুকিং বাতিল ও রিফান্ড ব্যবস্থাপনা' : 'Manage Booking Cancellation'}
                      </Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                        {selectedBooking.id} • {selectedBooking.customer} {isAdmin ? `• ৳ ${(selectedBooking.amount || 0).toLocaleString()}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowCancelBookingModal(false)}>
                      <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '800' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ padding: 18, maxHeight: 440 }}>
                    {/* Cancellation Policy Guidance */}
                    <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA', marginBottom: 14 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#991B1B', marginBottom: 4 }}>
                        ⚖️ {lang ? 'বাতিলকরণ ও রিফান্ড নীতি নির্দেশিকা:' : 'Cancellation Policy Guide:'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 17 }}>
                        {lang
                          ? '• ফ্লাইটের ২৪ ঘণ্টার পূর্বে বাতিল করলে ১০০% সম্পূর্ণ রিফান্ড।\\n• ১২-২৪ ঘণ্টার মধ্যে বাতিল করলে ৮০% রিফান্ড (২০% ফি কর্তন)।\\n• এয়ারলাইন্স ফ্লাইট বাতিল করলে কোনো ফি কর্তন হবে না।'
                          : '• Cancellations >24h before flight qualify for 100% full refund.\\n• Cancellations 12-24h before flight deduct 20% late cancellation fee.\\n• Airline operational cancellations waive all fees.'}
                      </Text>
                    </View>

                    {/* Reason Selector */}
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                      📋 {lang ? 'বাতিলকরণের প্রধান কারণ নির্বাচন করুন:' : 'Select Primary Cancellation Reason:'}
                    </Text>
                    <View style={{ gap: 6, marginBottom: 14 }}>
                      {CANCELLATION_REASONS.map(r => {
                        const isReasonSel = cancelReasonPreset === r.id;
                        return (
                          <TouchableOpacity
                            key={r.id}
                            onPress={() => setCancelReasonPreset(r.id)}
                            style={{
                              padding: 10,
                              borderRadius: 8,
                              backgroundColor: isReasonSel ? '#EFF6FF' : '#FFFFFF',
                              borderWidth: 1.5,
                              borderColor: isReasonSel ? '#2563EB' : '#E2E8F0',
                            }}
                          >
                            <Text style={{ fontSize: 12.5, fontWeight: isReasonSel ? '800' : '600', color: isReasonSel ? '#1E40AF' : '#334155' }}>
                              {lang ? r.labelBn : r.labelEn}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Custom Remarks */}
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                      📝 {lang ? 'অতিরিক্ত ব্যাখ্যা ও মন্তব্য:' : 'Additional Explanation & Remarks:'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      placeholder={lang ? 'যেমন: ফ্লাইট নম্বর বিজি-০৮৪ কারিগরি ত্রুটির কারণে বাতিল...' : 'e.g., Passenger verified medical emergency with certificate...'}
                      value={cancelCustomRemarks}
                      onChangeText={setCancelCustomRemarks}
                    />

                    {/* Financial Adjustments & Refund Action - Admin & Manager */}
                    {(isAdmin || isManager) ? (
                      <>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 14 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                              {lang ? 'কর্তনযোগ্য ফি (৳)' : 'Cancellation Fee (৳)'}
                            </Text>
                            <TextInput
                              style={[s.in, { backgroundColor: '#F8FAFC' }]}
                              keyboardType="numeric"
                              value={cancelFeeInput}
                              onChangeText={(v) => {
                                setCancelFeeInput(v);
                                const fee = Number(v) || 0;
                                const total = Number(selectedBooking.amount || 0);
                                setCancelRefundInput(String(Math.max(0, total - fee)));
                              }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                              {lang ? 'প্রদেয় রিফান্ড (৳)' : 'Refund Payable (৳)'}
                            </Text>
                            <TextInput
                              style={[s.in, { backgroundColor: '#F8FAFC' }]}
                              keyboardType="numeric"
                              value={cancelRefundInput}
                              onChangeText={setCancelRefundInput}
                            />
                          </View>
                        </View>

                        {/* Refund Action Choice */}
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                          ⚡ {lang ? 'রিফান্ড পদক্ষেপ:' : 'Refund Action:'}
                        </Text>
                        <View style={{ gap: 6, marginBottom: 14 }}>
                          {[
                            ['refund_now', lang ? 'তাত্ক্ষণিক রিফান্ড সম্পন্ন করুন (Mark Refunded)' : 'Process Immediate Refund Now'],
                            ['submit_ticket', lang ? 'ফাইন্যান্সের অনুমোদনের জন্য টিকিট তৈরি করুন' : 'Submit Refund Ticket to Finance'],
                            ['no_refund', lang ? 'রিফান্ড ছাড়া বাতিল করুন (No Refund)' : 'Cancel without Refund'],
                          ].map(([actKey, actLabel]) => {
                            const isActSel = cancelRefundAction === actKey;
                            return (
                              <TouchableOpacity
                                key={actKey}
                                onPress={() => setCancelRefundAction(actKey)}
                                style={{
                                  padding: 10,
                                  borderRadius: 8,
                                  backgroundColor: isActSel ? '#FEF2F2' : '#FFFFFF',
                                  borderWidth: 1.5,
                                  borderColor: isActSel ? '#DC2626' : '#E2E8F0',
                                }}
                              >
                                <Text style={{ fontSize: 12.5, fontWeight: isActSel ? '800' : '600', color: isActSel ? '#991B1B' : '#334155' }}>
                                  {actLabel}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    ) : (
                      <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', marginTop: 4, marginBottom: 14 }}>
                        <Text style={{ fontSize: 12, color: '#475569', fontWeight: '700' }}>
                          ℹ️ {lang ? 'বুকিংটি বাতিল হিসেবে নথিভুক্ত হবে। অর্থনৈতিক হিসাব ও রিফান্ড সুপার এডমিন পোর্টাল থেকে নিষ্পত্তি করা হবে।' : 'Booking will be cancelled. Financial calculations & refund settlement are routed to Super Admin.'}
                        </Text>
                      </View>
                    )}
                  </ScrollView>

                  <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setShowCancelBookingModal(false)}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E2E8F0' }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155' }}>{lang ? 'বন্ধ' : 'Abort'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleConfirmCancellation}
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#DC2626' }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>❌ {lang ? 'বাতিল নিশ্চিত করুন' : 'Confirm Cancellation'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL 5: UPDATE BOOKING STATUS MODAL                                      */}
        {/* ========================================================================= */}
        <Modal
          visible={showStatusUpdateModal && !!selectedBooking}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStatusUpdateModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 520, overflow: 'hidden', borderWidth: 1.5, borderColor: '#CBD5E1' }}>
              {selectedBooking && (
                <>
                  <View style={{ backgroundColor: '#0F172A', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFFFFF' }}>
                      🔄 {lang ? 'বুকিং স্ট্যাটাস পরিবর্তন' : 'Update Booking Status'}
                    </Text>
                    <TouchableOpacity onPress={() => setShowStatusUpdateModal(false)}>
                      <Text style={{ fontSize: 18, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ padding: 18 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 8 }}>
                      {lang ? 'নতুন স্ট্যাটাস নির্বাচন করুন:' : 'Select New Booking Status:'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {[
                        ['pending', '⏳ Pending (যাচাই বাকি)'],
                        ['confirmed', '✅ Confirmed (নিশ্চিত)'],
                        ['upcoming', '📅 Upcoming (আসন্ন)'],
                        ['in_progress', '▶️ In Progress (চলমান)'],
                        ['completed', '🏁 Completed (সম্পন্ন)'],
                        ['cancelled', '❌ Cancelled (বাতিল)'],
                      ].map(([stKey, stLabel]) => {
                        const isStSel = newStatusSelection === stKey;
                        return (
                          <TouchableOpacity
                            key={stKey}
                            onPress={() => setNewStatusSelection(stKey)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 8,
                              backgroundColor: isStSel ? '#0284C7' : '#F1F5F9',
                              borderWidth: 1,
                              borderColor: isStSel ? '#0284C7' : '#CBD5E1',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '800', color: isStSel ? '#FFFFFF' : '#334155' }}>
                              {stLabel}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                      📝 {lang ? 'পরিবর্তনের কারণ বা নোট:' : 'Update Note / Remark:'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      placeholder={lang ? 'যেমন: ফ্লাইট শিডিউল পরিবর্তিত হয়েছে...' : 'e.g., Passenger confirmed early arrival at airport...'}
                      value={statusUpdateNote}
                      onChangeText={setStatusUpdateNote}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        onPress={() => setShowStatusUpdateModal(false)}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E2E8F0' }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155' }}>{lang ? 'বাতিল' : 'Cancel'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleConfirmStatusUpdate}
                        style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0284C7' }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>✓ {lang ? 'আপডেট করুন' : 'Apply Update'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  };


  const renderStaffManagement = () => {
    // STRICT RULE: Only operational field Protocol Officers and Shift In-Charges!
    // Top Management & Front Desk members remain in Flight Care Family but are excluded from field protocol officers view.
    const syncedRoster = (staffRoster || []).filter(s => isFieldProtocolOfficer(s));
    const totalStaffCount = syncedRoster.length;
    const availableStaffCount = syncedRoster.filter(s => s.status === 'available' && s.active !== false).length;
    const inServiceStaffCount = syncedRoster.filter(s => s.status === 'in_service' && s.active !== false).length;
    const offDutyStaffCount = syncedRoster.filter(s => s.status === 'off_duty' && s.active !== false).length;
    const inactiveStaffCount = syncedRoster.filter(s => s.active === false).length;

    const stations = [
      ['all', lang ? `সকল এয়ারপোর্ট (${totalStaffCount})` : `All Airports (${totalStaffCount})`],
      ['DAC', lang ? `ঢাকা হযরত শাহজালাল (${syncedRoster.filter(s => s.airport === 'DAC').length})` : `Dhaka DAC (${syncedRoster.filter(s => s.airport === 'DAC').length})`],
      ['CGP', lang ? `চট্টগ্রাম শাহ আমানত (${syncedRoster.filter(s => s.airport === 'CGP').length})` : `Chittagong CGP (${syncedRoster.filter(s => s.airport === 'CGP').length})`],
      ['ZYL', lang ? `সিলেট ওসমানী (${syncedRoster.filter(s => s.airport === 'ZYL').length})` : `Sylhet ZYL (${syncedRoster.filter(s => s.airport === 'ZYL').length})`],
    ];

    const statusFilters = [
      ['all', lang ? `সব স্টাফ (${totalStaffCount})` : `All Staff (${totalStaffCount})`],
      ['available', lang ? `🟢 প্রাপ্যতা (${availableStaffCount})` : `🟢 Available (${availableStaffCount})`],
      ['in_service', lang ? `🟡 সেবায় ব্যস্ত (${inServiceStaffCount})` : `🟡 In Service (${inServiceStaffCount})`],
      ['off_duty', lang ? `⚪ অফ-ডিউটি (${offDutyStaffCount})` : `⚪ Off Duty (${offDutyStaffCount})`],
      ['inactive', lang ? `🔴 নিষ্ক্রিয় (${inactiveStaffCount})` : `🔴 Inactive (${inactiveStaffCount})`],
    ];

    const filtered = [...syncedRoster]
      .sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999))
      .filter(s => {
      if (staffStationFilter !== 'all' && s.airport !== staffStationFilter) return false;
      if (staffStatusFilter === 'inactive') {
        if (s.active !== false) return false;
      } else if (staffStatusFilter !== 'all') {
        if (s.status !== staffStatusFilter) return false;
        if (s.active === false) return false;
      }
      if (staffSearchQuery.trim()) {
        const query = staffSearchQuery.trim().toLowerCase();
        const qClean = query.replace(/[\s-]/g, '');
        const matchesName = (s.name || '').toLowerCase().includes(query) || (s.nameBn || '').includes(query);
        const matchesRole = (s.role || '').toLowerCase().includes(query) || (s.roleBn || '').includes(query);
        const matchesStation = (s.station || '').toLowerCase().includes(query) || (s.stationBn || '').includes(query);
        const matchesAirport = (s.airport || '').toLowerCase().includes(query);
        const matchesPhone = (s.phone || '').toLowerCase().includes(query) ||
                             (s.phoneDisplay || '').replace(/[\s-]/g, '').includes(qClean) ||
                             (s.personalPhone || '').replace(/[\s-]/g, '').includes(qClean);
        const matchesEmail = (s.email || '').toLowerCase().includes(query) || (s.gmail || '').toLowerCase().includes(query);
        const matchesBadge = (s.badgeNo || '').toLowerCase().includes(query);
        const matchesSerial = String(s.serial || '').includes(query);
        if (!matchesName && !matchesRole && !matchesStation && !matchesAirport && !matchesPhone && !matchesEmail && !matchesBadge && !matchesSerial) {
          return false;
        }
      }
      return true;
    });

    // Helper to get active assigned bookings for a staff member
    const getStaffAssignedBookings = (staffItem) => {
      if (!staffItem) return [];
      return allPlatformBookings.filter(b => {
        return (
          b.staffId === staffItem.id ||
          b.assignedStaffId === staffItem.id ||
          b.leadStaffId === staffItem.id ||
          b.supportStaffId === staffItem.id ||
          b.staff === staffItem.name ||
          b.leadStaffName === staffItem.name ||
          b.supportStaffName === staffItem.name
        );
      });
    };

    return (
      <View style={s.pagePanel}>
        {/* Top Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <View>
            <Text style={s.pageTitle}>{lang ? 'প্রোটোকল স্টাফ ম্যানেজমেন্ট ও ডিউটি রোস্টার' : 'Protocol Staff Management & Duty Roster'}</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: -8 }}>
              {lang ? 'স্টাফ অ্যাকাউন্ট তৈরি, সম্পাদনা, বুকিংয়ে বরাদ্দ, উপস্থিতি ও সার্ভিস অগ্রগতি পর্যবেক্ষণ' : 'Create & manage staff accounts, assign to bookings, and monitor service progress'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={handleOpenStaffReorderModal}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#0F2A4A',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: '#38BDF8',
                shadowColor: '#38BDF8',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
              }}
            >
              <Text style={{ fontSize: 14 }}>🔢</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {lang ? 'সিরিয়াল কাস্টমাইজ' : 'Customize Serials'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenCreateStaff}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#0284C7',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                shadowColor: '#0284C7',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>＋</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                {lang ? 'নতুন স্টাফ অ্যাকাউন্ট তৈরি' : 'Create Staff Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {adminNotice ? (
          <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#A7F3D0' }}>
            <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700' }}>✓ {adminNotice}</Text>
          </View>
        ) : null}

        {/* Staff KPI Summary */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {[
            { label: lang ? 'সর্বমোট স্টাফ' : 'Total Staff', count: totalStaffCount, color: '#0F172A', bg: '#F1F5F9' },
            { label: lang ? 'অন-ডিউটি (প্রাপ্য)' : 'Available', count: availableStaffCount, color: '#059669', bg: '#ECFDF5' },
            { label: lang ? 'সেবায় ব্যস্ত' : 'In Service', count: inServiceStaffCount, color: '#D97706', bg: '#FEF3C7' },
            { label: lang ? 'অফ-ডিউটি' : 'Off Duty', count: offDutyStaffCount, color: '#64748B', bg: '#F8FAFC' },
            { label: lang ? 'নিষ্ক্রিয় অ্যাকাউন্ট' : 'Deactivated', count: inactiveStaffCount, color: '#DC2626', bg: '#FEF2F2' },
          ].map(kpi => (
            <View key={kpi.label} style={{ flex: 1, minWidth: 100, backgroundColor: kpi.bg, padding: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: kpi.color }}>{kpi.count}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 2 }}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* ⭐ Staff Performance & Ratings Leaderboard */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1.5,
          borderColor: '#FEF08A',
          shadowColor: '#CA8A04',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF9C3', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>🏆</Text>
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#854D0E' }}>
                  {lang ? 'প্রোটোকল অফিসার পারফরম্যান্স ও রেটিং লিডারবোর্ড' : 'Protocol Officer Performance & Ratings Leaderboard'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#A16207' }}>
                  {lang ? 'ক্লায়েন্ট রেটিং ও সম্পন্ন প্রোটোকল সেবার ভিত্তিতে শীর্ষ পারফর্মারদের রিয়েল-টাইম র্যাঙ্কিং' : 'Top officers ranked by client star reviews & completed services'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowProtocolRanksModal(true)}
                style={{
                  backgroundColor: '#0F2A4A',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 12 }}>🎖️</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? '১০টি র‍্যাংক কাঠামো' : '10-Tier Rank System'}
                </Text>
              </TouchableOpacity>
              <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#713F12' }}>
                  ⭐ {lang ? 'ফ্লিট সন্তুষ্টি: ৯৮.৫%' : 'Fleet CSAT: 98.5%'}
                </Text>
              </View>
            </View>
          </View>

          {/* Top Officers Cards Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(() => {
              // Rank staff by (rating * 100) + completedServices
              const rankedStaff = [...syncedRoster]
                .filter(s => s.active !== false)
                .map(s => {
                  const dynamicCompleted = allPlatformBookings.filter(b => (b.staffId === s.id || b.staff === s.name) && b.status === 'completed').length;
                  const totalCompleted = (s.completedServices || 0) + dynamicCompleted;
                  const score = ((s.rating || 5.0) * 100) + totalCompleted;
                  return { ...s, totalCompleted, score };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

              const medals = ['🥇', '🥈', '🥉'];
              const bgTints = ['#FFFBEB', '#F8FAFC', '#FFF7ED'];
              const borderTints = ['#FDE68A', '#E2E8F0', '#FED7AA'];

              return rankedStaff.map((officer, index) => (
                <View
                  key={officer.id}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    backgroundColor: bgTints[index] || '#F8FAFC',
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: borderTints[index] || '#E2E8F0',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 20 }}>{medals[index]}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FEF08A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#854D0E' }}>⭐ {officer.rating || 5.0}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                    {officer.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                    {officer.role || 'Protocol Officer'} • {officer.airport || 'DAC'}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>
                      💼 {officer.totalCompleted} {lang ? 'টি সম্পন্ন' : 'done'}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: '#0284C7', fontWeight: '700' }}>
                      ⏱️ 99.{index === 0 ? '6' : index === 1 ? '4' : '1'}%
                    </Text>
                  </View>
                </View>
              ));
            })()}
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ marginBottom: 12, position: 'relative' }}>
          <TextInput
            style={[s.in, { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, paddingRight: (staffSearchInput.length > 0 || staffSearchQuery.length > 0) ? 36 : 14 }]}
            placeholder={lang ? '🔍 স্টাফের নাম, পদবী, স্টেশন, ফোন বা ইমেইল দিয়ে খুঁজুন...' : '🔍 Search staff by name, role, station, phone, email...'}
            value={staffSearchInput}
            onChangeText={setStaffSearchInput}
          />
          {(staffSearchInput.length > 0 || staffSearchQuery.length > 0) && (
            <TouchableOpacity onPress={() => { setStaffSearchInput(''); setStaffSearchQuery(''); }} style={{ position: 'absolute', right: 12, top: 12 }}>
              <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Airport Station Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          {stations.map(([key, label]) => {
            const isSel = staffStationFilter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setStaffStationFilter(key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: isSel ? '#0284C7' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSel ? '#0284C7' : '#CBD5E1',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#334155' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
          {statusFilters.map(([key, label]) => {
            const isSel = staffStatusFilter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setStaffStatusFilter(key)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: isSel ? '#0F172A' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSel ? '#0F172A' : '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#FFFFFF' : '#64748B' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Staff Roster Cards Grid */}
        <View style={{ gap: 12 }}>
          {filtered.length === 0 ? (
            <View style={{ padding: 30, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🧑‍✈️</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>
                {lang ? 'কোনো স্টাফ পাওয়া যায়নি' : 'No staff found'}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                {lang ? 'অন্য কোনো অনুসন্ধান বা ফিল্টার বেছে নিন।' : 'Try selecting another station or clearing your search filter.'}
              </Text>
            </View>
          ) : null}

          {filtered.map(st => {
            const isAvail = st.status === 'available' && st.active !== false;
            const isInSvc = st.status === 'in_service' && st.active !== false;
            const isOffDuty = st.status === 'off_duty' && st.active !== false;
            const isDeactivated = st.active === false;

            const dutyStatusLabel = isDeactivated
              ? (lang ? '🔴 নিষ্ক্রিয়' : '🔴 Deactivated')
              : isAvail
              ? (lang ? '🟢 ডিউটিতে প্রাপ্য' : '🟢 Available')
              : isInSvc
              ? (lang ? '🟡 সেবায় ব্যস্ত' : '🟡 In Service')
              : (lang ? '⚪ অফ-ডিউটি' : '⚪ Off Duty');

            const statusBg = isDeactivated
              ? '#FEE2E2'
              : isAvail
              ? '#ECFDF5'
              : isInSvc
              ? '#FEF3C7'
              : '#F1F5F9';

            const statusColor = isDeactivated
              ? '#DC2626'
              : isAvail
              ? '#059669'
              : isInSvc
              ? '#D97706'
              : '#64748B';

            const assignedBookings = getStaffAssignedBookings(st);
            const activeAssignedCount = assignedBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length;
            const officerPoints = calculateOfficerPoints(st);

            return (
              <View
                key={st.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: isDeactivated ? '#FECACA' : '#E2E8F0',
                  opacity: isDeactivated ? 0.8 : 1,
                }}
              >
                {/* Staff Card Top Row */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleQuickUploadStaffPhoto(st)}
                      style={{
                        position: 'relative',
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: isDeactivated ? '#FEE2E2' : '#E0F2FE',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: isDeactivated ? '#FCA5A5' : '#38BDF8',
                        overflow: 'hidden',
                      }}
                      title={lang ? 'ছবি পরিবর্তন করতে ক্লিক করুন' : 'Click to change photo'}
                    >
                      {(st.photo || (typeof st.avatar === 'string' && (st.avatar.startsWith('http') || st.avatar.startsWith('data:image')))) ? (
                        <Image
                          source={{ uri: st.photo || st.avatar }}
                          style={{ width: '100%', height: '100%', borderRadius: 26 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 24 }}>{(st.role || '').includes('VIP') ? '⭐' : (st.role || '').includes('Medical') ? '🩺' : (st.role || '').includes('Wheelchair') ? '🦽' : '🧑‍✈️'}</Text>
                      )}
                      <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        alignItems: 'center',
                        paddingVertical: 1,
                      }}>
                        <Text style={{ fontSize: 9, color: '#FFFFFF' }}>📷</Text>
                      </View>
                    </TouchableOpacity>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* Serial Badge with Move Up/Down Controls */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#0F2A4A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#38BDF8' }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: '#38BDF8' }}>
                            #{st.serial || (filtered.indexOf(st) + 1)}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleMoveStaffMember(st.id, 'up')}
                            style={{ paddingHorizontal: 3, paddingVertical: 1 }}
                            title="Move Up"
                          >
                            <Text style={{ fontSize: 10, color: '#93C5FD', fontWeight: '900' }}>▲</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleMoveStaffMember(st.id, 'down')}
                            style={{ paddingHorizontal: 3, paddingVertical: 1 }}
                            title="Move Down"
                          >
                            <Text style={{ fontSize: 10, color: '#93C5FD', fontWeight: '900' }}>▼</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{st.name || 'Protocol Officer'}</Text>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: statusBg }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: statusColor }}>{dutyStatusLabel}</Text>
                        </View>
                        {st.active === false ? (
                          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#FEF2F2' }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#EF4444' }}>{lang ? 'অ্যাকাউন্ট স্থগিত' : 'Suspended'}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284C7', marginTop: 2 }}>
                        {st.role || 'Protocol Officer'} • 📍 {st.station || `${st.airport || 'DAC'} Terminal`} ({st.airport || 'DAC'})
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        ⏰ {st.shift || 'General'} • ⭐ {st.rating || 5.0} • 💼 {st.completedServices || 0} {lang ? 'টি সম্পন্ন সার্ভিস' : 'completed'}
                      </Text>
                      {/* Officer 10-Rank & Points Badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setShowProtocolRanksModal(true)}
                          style={{
                            backgroundColor: officerPoints.tierBgColor || '#E0F2FE',
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 6,
                            borderWidth: 1.5,
                            borderColor: officerPoints.tierBadgeColor || '#0284C7',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontSize: 11 }}>{officerPoints.rankIcon || '⭐'}</Text>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: officerPoints.tierBadgeColor || '#0284C7' }}>
                            {lang
                              ? (officerPoints.rank?.shortBn || `র‍্যাংক ${officerPoints.rankLevel}`)
                              : (officerPoints.rank?.shortEn || `Rank ${officerPoints.rankLevel}`)}: {lang ? officerPoints.tierBn : officerPoints.tier}
                          </Text>
                        </TouchableOpacity>
                        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: '#92400E' }}>
                            🏆 {officerPoints.totalPoints.toLocaleString()} {lang ? 'পয়েন্ট' : 'pts'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                        📞 {st.phone}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>
                      ✉️ {st.email}
                    </Text>
                  </View>
                </View>

                {/* Staff Assignments Badge Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                      📋 {lang ? 'বরাদ্দ সার্ভিস:' : 'Assigned Services:'}
                    </Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: activeAssignedCount > 0 ? '#EFF6FF' : '#E2E8F0' }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: activeAssignedCount > 0 ? '#0284C7' : '#64748B' }}>
                        {activeAssignedCount} {lang ? 'সক্রিয়' : 'Active'} / {assignedBookings.length} {lang ? 'মোট' : 'Total'}
                      </Text>
                    </View>
                  </View>
                  {st.notes ? (
                    <Text style={{ fontSize: 11.5, color: '#64748B', fontStyle: 'italic', maxWidth: '55%' }} numberOfLines={1}>
                      ℹ️ {st.notes}
                    </Text>
                  ) : null}
                </View>

                {/* Action Buttons Bar */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                  {/* Change Duty Status */}
                  <TouchableOpacity
                    onPress={() => handleToggleStaffDuty(st.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0284C7' }}>
                      🔄 {lang ? 'ডিউটি স্ট্যাটাস' : 'Duty Status'}
                    </Text>
                  </TouchableOpacity>

                  {/* Toggle Active/Inactive */}
                  <TouchableOpacity
                    onPress={() => handleToggleStaffActiveDirect(st.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: st.active === false ? '#ECFDF5' : '#FEF2F2',
                      borderWidth: 1,
                      borderColor: st.active === false ? '#A7F3D0' : '#FECACA',
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: st.active === false ? '#059669' : '#DC2626' }}>
                      {st.active === false ? (lang ? '🟢 সক্রিয় করুন' : '🟢 Activate') : (lang ? '🔴 নিষ্ক্রিয় করুন' : '🔴 Deactivate')}
                    </Text>
                  </TouchableOpacity>

                  {/* Change Photo Button */}
                  <TouchableOpacity
                    onPress={() => handleQuickUploadStaffPhoto(st)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>📷</Text>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                      {lang ? 'ছবি পরিবর্তন' : 'Change Photo'}
                    </Text>
                  </TouchableOpacity>

                  {/* Edit Info */}
                  <TouchableOpacity
                    onPress={() => handleOpenEditStaff(st)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: '#F1F5F9',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                      ✏️ {lang ? 'সম্পাদনা' : 'Edit Info'}
                    </Text>
                  </TouchableOpacity>

                  {/* Assign to Booking */}
                  <TouchableOpacity
                    onPress={() => handleOpenAssignToBookingForStaff(st)}
                    disabled={st.active === false}
                    style={{
                      paddingHorizontal: 11,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: st.active === false ? '#E2E8F0' : '#0E2A47',
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: st.active === false ? '#94A3B8' : '#FFFFFF' }}>
                      ➕ {lang ? 'বুকিং বরাদ্দ' : 'Assign Booking'}
                    </Text>
                  </TouchableOpacity>

                  {/* View Assigned Services & Monitor Progress */}
                  <TouchableOpacity
                    onPress={() => handleOpenStaffProgressView(st)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: '#0284C7',
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                      📊 {lang ? `সার্ভিস অগ্রগতি (${assignedBookings.length})` : `Assigned Services (${assignedBookings.length})`}
                    </Text>
                  </TouchableOpacity>

                  {/* View Official ID Card with Dynamic QR Code */}
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedOfficerForCard(st);
                      setShowOfficerIdCardModal(true);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: '#0F172A',
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 3,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                      🪪 {lang ? 'আইডি কার্ড ও QR' : 'ID Card & QR'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Modal 1: Create Staff Account Modal */}
        <Modal
          visible={showCreateStaffModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCreateStaffModal(false)}
        >
          <View style={[s.modalOverlay, { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 }]}>
            <View style={[s.modalCard, { backgroundColor: '#FFFFFF', borderRadius: 20, maxWidth: 560, width: '92%', maxHeight: '88%', padding: 20, borderWidth: 1.5, borderColor: '#CBD5E1', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 15 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View>
                  <Text style={[s.h2, { fontSize: 18, marginBottom: 2 }]}>
                    🧑‍✈️ {lang ? 'নতুন প্রোটোকল স্টাফ অ্যাকাউন্ট' : 'Create Protocol Staff Account'}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                    {lang ? 'বিমানবন্দরে প্রোটোকল সেবার জন্য নতুন কর্মীর প্রোফাইল ও অ্যাক্সেস' : 'Create official protocol staff account for airport operations'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowCreateStaffModal(false)}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#64748B' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {staffFormError ? (
                <View style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                  <Text style={{ color: '#DC2626', fontSize: 12.5, fontWeight: '700' }}>⚠️ {staffFormError}</Text>
                </View>
              ) : null}

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {/* Profile Photo Upload & Preview */}
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                    📷 {lang ? 'প্রোফাইল ছবি (Device Upload বা Online URL)' : 'Profile Photo (Upload or URL)'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                      {staffFormPhoto ? (
                        <Image source={{ uri: staffFormPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 28 }}>🧑‍✈️</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handlePickStaffImage((uri) => setStaffFormPhoto(uri))}
                        style={{
                          backgroundColor: '#0284C7',
                          paddingVertical: 7,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                          📁 {lang ? 'ডিভাইস থেকে ছবি আপলোড করুন' : 'Upload from Device'}
                        </Text>
                      </TouchableOpacity>
                      {staffFormPhoto ? (
                        <TouchableOpacity
                          onPress={() => setStaffFormPhoto('')}
                          style={{ alignItems: 'flex-start' }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                            🗑️ {lang ? 'ছবি মুছে ফেলুন' : 'Remove Photo'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>
                      {lang ? 'অথবা সরাসরি ছবির লিংক/URL পেস্ট করুন:' : 'Or paste direct image URL:'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#FFFFFF', fontSize: 12, paddingVertical: 6 }]}
                      placeholder="https://example.com/photo.jpg"
                      value={staffFormPhoto}
                      onChangeText={setStaffFormPhoto}
                    />
                  </View>
                </View>

                {/* Serial & Name Row */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 100 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      🔢 {lang ? 'সিরিয়াল #' : 'Serial #'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC', fontWeight: '800', textAlign: 'center' }]}
                      placeholder="1"
                      value={String(staffFormSerial)}
                      onChangeText={setStaffFormSerial}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'পূর্ণ নাম *' : 'Full Name *'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      placeholder="e.g. Shakil Mahmud"
                      value={staffFormName}
                      onChangeText={setStaffFormName}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'ফোন / WhatsApp *' : 'Phone / WhatsApp *'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      placeholder="+8801700112233"
                      value={staffFormPhone}
                      onChangeText={setStaffFormPhone}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'অফিসিয়াল ইমেইল' : 'Official Email'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      placeholder="shakil@flightcare.com"
                      value={staffFormEmail}
                      onChangeText={setStaffFormEmail}
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    {lang ? 'প্রোটোকল পদবী / দায়িত্ব' : 'Protocol Role / Responsibility'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {PROTOCOL_STAFF_ROLES.map(role => {
                      const isSel = staffFormRole === role;
                      return (
                        <TouchableOpacity
                          key={role}
                          onPress={() => setStaffFormRole(role)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: isSel ? '#0284C7' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: isSel ? '#0284C7' : '#CBD5E1',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#FFFFFF' : '#334155' }}>
                            {role}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      {lang ? 'বিমানবন্দর হাব' : 'Airport Hub'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {['DAC', 'CGP', 'ZYL'].map(hub => {
                        const isSel = staffFormAirport === hub;
                        return (
                          <TouchableOpacity
                            key={hub}
                            onPress={() => {
                              setStaffFormAirport(hub);
                              setStaffFormStation(`${hub} Terminal 1`);
                            }}
                            style={{
                              flex: 1,
                              paddingVertical: 7,
                              alignItems: 'center',
                              borderRadius: 8,
                              backgroundColor: isSel ? '#0E2A47' : '#F1F5F9',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '800', color: isSel ? '#FFFFFF' : '#334155' }}>{hub}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ flex: 1.4 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'স্টেশন / টার্মিনাল' : 'Station / Terminal'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      placeholder="e.g. DAC Terminal 1"
                      value={staffFormStation}
                      onChangeText={setStaffFormStation}
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    {lang ? 'ডিউটি শিফট' : 'Duty Shift'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {PROTOCOL_STAFF_SHIFTS.map(shift => {
                      const isSel = staffFormShift === shift;
                      return (
                        <TouchableOpacity
                          key={shift}
                          onPress={() => setStaffFormShift(shift)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: isSel ? '#0284C7' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: isSel ? '#0284C7' : '#CBD5E1',
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#334155' }}>
                            {shift}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      {lang ? 'প্রাথমিক ডিউটি' : 'Initial Duty'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {[
                        ['available', lang ? '🟢 প্রাপ্য' : 'Available'],
                        ['off_duty', lang ? '⚪ অফ-ডিউটি' : 'Off Duty'],
                      ].map(([stVal, stLbl]) => {
                        const isSel = staffFormStatus === stVal;
                        return (
                          <TouchableOpacity
                            key={stVal}
                            onPress={() => setStaffFormStatus(stVal)}
                            style={{
                              flex: 1,
                              paddingVertical: 7,
                              alignItems: 'center',
                              borderRadius: 8,
                              backgroundColor: isSel ? '#0284C7' : '#F1F5F9',
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#334155' }}>{stLbl}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'লগইন পিন / পাসওয়ার্ড' : 'Login PIN / Password'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      placeholder="1234"
                      value={staffFormPin}
                      onChangeText={setStaffFormPin}
                      secureTextEntry
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'বিশেষ যোগ্যতা বা নোট (ঐচ্ছিক)' : 'Qualifications / Notes (Optional)'}
                  </Text>
                  <TextInput
                    style={[s.in, { backgroundColor: '#F8FAFC' }]}
                    placeholder={lang ? 'যেমন: দ্বিভাষিক, ভিআইপি প্রোটোকলে অভিজ্ঞ...' : 'e.g., Bilingual, experienced in wheelchair handling...'}
                    value={staffFormNotes}
                    onChangeText={setStaffFormNotes}
                  />
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setShowCreateStaffModal(false)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E2E8F0' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155' }}>{lang ? 'বাতিল' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveCreateStaff}
                  style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0284C7' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>✓ {lang ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal 2: Edit Staff Info Modal */}
        <Modal
          visible={showEditStaffModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEditStaffModal(false)}
        >
          <View style={[s.modalOverlay, { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 }]}>
            <View style={[s.modalCard, { backgroundColor: '#FFFFFF', borderRadius: 20, maxWidth: 560, width: '92%', maxHeight: '88%', padding: 20, borderWidth: 1.5, borderColor: '#CBD5E1', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 15 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View>
                  <Text style={[s.h2, { fontSize: 18, marginBottom: 2 }]}>
                    ✏️ {lang ? 'স্টাফ তথ্য সম্পাদনা' : 'Edit Staff Information'}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                    {lang ? 'প্রোটোকল কর্মীর পদবী, স্টেশন ও বিবরণ আপডেট করুন' : 'Update staff contact, role, shift and station details'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowEditStaffModal(false)}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#64748B' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {staffFormError ? (
                <View style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                  <Text style={{ color: '#DC2626', fontSize: 12.5, fontWeight: '700' }}>⚠️ {staffFormError}</Text>
                </View>
              ) : null}

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {/* Profile Photo Upload & Preview */}
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                    📷 {lang ? 'প্রোফাইল ছবি (Device Upload বা Online URL)' : 'Profile Photo (Upload or URL)'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                      {staffFormPhoto ? (
                        <Image source={{ uri: staffFormPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 28 }}>🧑‍✈️</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handlePickStaffImage((uri) => setStaffFormPhoto(uri))}
                        style={{
                          backgroundColor: '#0284C7',
                          paddingVertical: 7,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                          📁 {lang ? 'ডিভাইস থেকে ছবি আপলোড করুন' : 'Upload from Device'}
                        </Text>
                      </TouchableOpacity>
                      {staffFormPhoto ? (
                        <TouchableOpacity
                          onPress={() => setStaffFormPhoto('')}
                          style={{ alignItems: 'flex-start' }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                            🗑️ {lang ? 'ছবি মুছে ফেলুন' : 'Remove Photo'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>
                      {lang ? 'অথবা সরাসরি ছবির লিংক/URL পেস্ট করুন:' : 'Or paste direct image URL:'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#FFFFFF', fontSize: 12, paddingVertical: 6 }]}
                      placeholder="https://example.com/photo.jpg"
                      value={staffFormPhoto}
                      onChangeText={setStaffFormPhoto}
                    />
                  </View>
                </View>

                {/* Serial & Name Row */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 100 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      🔢 {lang ? 'সিরিয়াল #' : 'Serial #'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC', fontWeight: '800', textAlign: 'center' }]}
                      placeholder="1"
                      value={String(staffFormSerial)}
                      onChangeText={setStaffFormSerial}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'নাম *' : 'Name *'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      value={staffFormName}
                      onChangeText={setStaffFormName}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'ফোন *' : 'Phone *'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      value={staffFormPhone}
                      onChangeText={setStaffFormPhone}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'ইমেইল' : 'Email'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      value={staffFormEmail}
                      onChangeText={setStaffFormEmail}
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    {lang ? 'প্রোটোকল পদবী' : 'Protocol Role'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {PROTOCOL_STAFF_ROLES.map(role => {
                      const isSel = staffFormRole === role;
                      return (
                        <TouchableOpacity
                          key={role}
                          onPress={() => setStaffFormRole(role)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: isSel ? '#0284C7' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: isSel ? '#0284C7' : '#CBD5E1',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#FFFFFF' : '#334155' }}>
                            {role}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                      {lang ? 'বিমানবন্দর' : 'Airport Hub'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {['DAC', 'CGP', 'ZYL'].map(hub => {
                        const isSel = staffFormAirport === hub;
                        return (
                          <TouchableOpacity
                            key={hub}
                            onPress={() => setStaffFormAirport(hub)}
                            style={{
                              flex: 1,
                              paddingVertical: 7,
                              alignItems: 'center',
                              borderRadius: 8,
                              backgroundColor: isSel ? '#0E2A47' : '#F1F5F9',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '800', color: isSel ? '#FFFFFF' : '#334155' }}>{hub}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ flex: 1.4 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {lang ? 'স্টেশন / টার্মিনাল' : 'Station / Terminal'}
                    </Text>
                    <TextInput
                      style={[s.in, { backgroundColor: '#F8FAFC' }]}
                      value={staffFormStation}
                      onChangeText={setStaffFormStation}
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    {lang ? 'ডিউটি শিফট' : 'Duty Shift'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {PROTOCOL_STAFF_SHIFTS.map(shift => {
                      const isSel = staffFormShift === shift;
                      return (
                        <TouchableOpacity
                          key={shift}
                          onPress={() => setStaffFormShift(shift)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: isSel ? '#0284C7' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: isSel ? '#0284C7' : '#CBD5E1',
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#334155' }}>
                            {shift}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'নোট' : 'Notes'}
                  </Text>
                  <TextInput
                    style={[s.in, { backgroundColor: '#F8FAFC' }]}
                    value={staffFormNotes}
                    onChangeText={setStaffFormNotes}
                  />
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setShowEditStaffModal(false)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E2E8F0' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155' }}>{lang ? 'বাতিল' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveEditStaff}
                  style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0284C7' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>✓ {lang ? 'সংরক্ষণ করুন' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal 3: Assign Staff to Booking Modal */}
        <Modal
          visible={showStaffAssignModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStaffAssignModal(false)}
        >
          <View style={[s.modalOverlay, { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 }]}>
            <View style={[s.modalCard, { backgroundColor: '#FFFFFF', borderRadius: 20, maxWidth: 640, width: '92%', maxHeight: '88%', padding: 20, borderWidth: 1.5, borderColor: '#CBD5E1', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 15 }]}>
              {assignTargetStaff && (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <View>
                      <Text style={[s.h2, { fontSize: 18, marginBottom: 2 }]}>
                        ➕ {lang ? `${assignTargetStaff.name}-কে বুকিংয়ে বরাদ্দ` : `Assign ${assignTargetStaff.name} to Booking`}
                      </Text>
                      <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                        {assignTargetStaff.role} • 📍 {assignTargetStaff.station} ({assignTargetStaff.airport})
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowStaffAssignModal(false)}
                      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#64748B' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 8 }}>
                    {lang ? `এই এয়ারপোর্টের (${assignTargetStaff.airport}) অপেক্ষমাণ বুকিং তালিকা:` : `Pending / Upcoming Bookings for ${assignTargetStaff.airport}:`}
                  </Text>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {allPlatformBookings
                      .filter(b => b.status !== 'completed' && b.status !== 'cancelled')
                      .map(booking => {
                        const isAlreadyLead = booking.staffId === assignTargetStaff.id || booking.staff === assignTargetStaff.name;
                        const hasOtherStaff = Boolean(booking.staff && booking.staff !== 'Unassigned' && !isAlreadyLead);

                        return (
                          <View
                            key={booking.id}
                            style={{
                              backgroundColor: '#F8FAFC',
                              borderRadius: 12,
                              padding: 12,
                              borderWidth: 1.5,
                              borderColor: isAlreadyLead ? '#0284C7' : '#E2E8F0',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 10,
                            }}
                          >
                            <View style={{ flex: 1, minWidth: 200 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{booking.id}</Text>
                                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: booking.direction === 'arrival' ? '#EFF6FF' : '#FDF2F8' }}>
                                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: booking.direction === 'arrival' ? '#0284C7' : '#DB2777' }}>
                                    {booking.direction === 'arrival' ? '🛬 Arrival' : '🛫 Departure'}
                                  </Text>
                                </View>
                                {isAlreadyLead ? (
                                  <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#DCFCE7' }}>
                                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#16A34A' }}>✓ Currently Assigned</Text>
                                  </View>
                                ) : null}
                              </View>

                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 2 }}>
                                👤 {booking.customer} • ✈️ {booking.airline} ({booking.fno})
                              </Text>
                              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                                📅 {booking.date} at {booking.time} • 📍 {booking.terminal}
                              </Text>
                              <Text style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>
                                {booking.package} • {booking.passengers} {lang ? 'জন যাত্রী' : 'pax'}
                                {hasOtherStaff ? ` • ⚠️ Currently with: ${booking.staff}` : ''}
                              </Text>
                            </View>

                            <TouchableOpacity
                              onPress={() => handleAssignTargetStaffToBooking(booking)}
                              disabled={isAlreadyLead}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 8,
                                backgroundColor: isAlreadyLead ? '#E2E8F0' : '#0284C7',
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '800', color: isAlreadyLead ? '#64748B' : '#FFFFFF' }}>
                                {isAlreadyLead ? (lang ? 'বরাদ্দ আছে' : 'Assigned') : (lang ? 'বরাদ্দ করুন' : 'Assign This Staff')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal 4: View Assigned Services & Monitor Progress Modal */}
        <Modal
          visible={showStaffProgressModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStaffProgressModal(false)}
        >
          <View style={[s.modalOverlay, { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 }]}>
            <View style={[s.modalCard, { backgroundColor: '#FFFFFF', borderRadius: 20, maxWidth: 740, width: '94%', maxHeight: '90%', padding: 20, borderWidth: 1.5, borderColor: '#CBD5E1', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 15 }]}>
              {progressViewingStaff && (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <View>
                      <Text style={[s.h2, { fontSize: 18, marginBottom: 2 }]}>
                        📊 {lang ? `বরাদ্দকৃত সার্ভিস ও অগ্রগতি পর্যবেক্ষণ` : `Assigned Services & Progress Tracker`}
                      </Text>
                      <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                        🧑‍✈️ {progressViewingStaff.name} ({progressViewingStaff.role}) • 📍 {progressViewingStaff.station} ({progressViewingStaff.airport})
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowStaffProgressModal(false)}
                      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#64748B' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Bookings List */}
                  {(() => {
                    const assignedList = getStaffAssignedBookings(progressViewingStaff);
                    if (assignedList.length === 0) {
                      return (
                        <View style={{ padding: 36, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14 }}>
                          <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>
                            {lang ? 'এই স্টাফের জন্য কোনো বুকিং বরাদ্দ নেই।' : 'No bookings currently assigned to this staff member.'}
                          </Text>
                          <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                            {lang ? 'উপরের "বুকিং বরাদ্দ" বোতাম দিয়ে অ্যাসাইন করতে পারেন।' : 'You can assign bookings using the "+ Assign Booking" button on the staff card.'}
                          </Text>
                        </View>
                      );
                    }

                    return (
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                        {assignedList.map(bk => {
                          const milestones = bk.serviceProgress || createMilestonesProgress(bk.direction, 0, 0);
                          const completedCount = milestones.filter(m => m.status === 'completed').length;
                          const progressPercent = Math.round((completedCount / milestones.length) * 100);

                          return (
                            <View
                              key={bk.id}
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: 14,
                                padding: 14,
                                borderWidth: 1.5,
                                borderColor: '#E2E8F0',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 3,
                              }}
                            >
                              {/* Booking Header */}
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                <View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>{bk.id}</Text>
                                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: bk.direction === 'arrival' ? '#EFF6FF' : '#FDF2F8' }}>
                                      <Text style={{ fontSize: 11, fontWeight: '700', color: bk.direction === 'arrival' ? '#0284C7' : '#DB2777' }}>
                                        {bk.direction === 'arrival' ? '🛬 Arrival' : '🛫 Departure'}
                                      </Text>
                                    </View>
                                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: bk.status === 'completed' ? '#DCFCE7' : bk.status === 'in_progress' ? '#FEF3C7' : '#EFF6FF' }}>
                                      <Text style={{ fontSize: 11, fontWeight: '800', color: bk.status === 'completed' ? '#16A34A' : bk.status === 'in_progress' ? '#D97706' : '#0284C7' }}>
                                        {bk.status}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284C7', marginTop: 2 }}>
                                    {bk.package} ({bk.service})
                                  </Text>
                                </View>

                                <View style={{ alignItems: 'flex-end' }}>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                                    ✈️ {bk.airline} {bk.fno}
                                  </Text>
                                  <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                                    📅 {bk.date} at {bk.time}
                                  </Text>
                                </View>
                              </View>

                              {/* Passenger Info Row */}
                              <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, marginBottom: 12 }}>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                                  👤 {bk.customer} • 📞 {bk.phone} • {bk.passengers} {lang ? 'জন যাত্রী' : 'pax'}
                                </Text>
                                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                                  📍 {bk.terminal} • Meeting: {bk.meetingPoint}
                                </Text>
                                {bk.staffNotes ? (
                                  <Text style={{ fontSize: 11.5, color: '#0284C7', marginTop: 2, fontWeight: '600' }}>
                                    📝 Staff Notes: {bk.staffNotes}
                                  </Text>
                                ) : null}
                              </View>

                              {/* Overall Progress Bar */}
                              <View style={{ marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>
                                    {lang ? 'সার্ভিস বাস্তবায়ন অগ্রগতি:' : 'Execution Progress:'}
                                  </Text>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: progressPercent === 100 ? '#16A34A' : '#0284C7' }}>
                                    {completedCount} of {milestones.length} Steps ({progressPercent}%)
                                  </Text>
                                </View>
                                <View style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                                  <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: progressPercent === 100 ? '#16A34A' : '#0284C7', borderRadius: 4 }} />
                                </View>
                              </View>

                              {/* Detailed Milestone Steps Checklist */}
                              <View style={{ gap: 6 }}>
                                {milestones.map((m, idx) => {
                                  const isDone = m.status === 'completed';
                                  const isCurrent = m.status === 'in_progress';
                                  return (
                                    <View
                                      key={m.id || idx}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 8,
                                        borderRadius: 8,
                                        backgroundColor: isDone ? '#F0FDF4' : isCurrent ? '#FFFBEB' : '#F8FAFC',
                                        borderWidth: 1,
                                        borderColor: isDone ? '#BBF7D0' : isCurrent ? '#FDE68A' : '#E2E8F0',
                                        gap: 8,
                                      }}
                                    >
                                      <Text style={{ fontSize: 14 }}>{isDone ? '✅' : isCurrent ? '⏳' : '⚪'}</Text>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 12, fontWeight: isDone || isCurrent ? '800' : '600', color: isDone ? '#166534' : isCurrent ? '#92400E' : '#64748B' }}>
                                          {idx + 1}. {lang ? (m.labelBn || m.labelEn) : m.labelEn}
                                        </Text>
                                        {m.completedAt ? (
                                          <Text style={{ fontSize: 10.5, color: '#16A34A', fontWeight: '700' }}>
                                            Completed at {m.completedAt}
                                          </Text>
                                        ) : null}
                                      </View>
                                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: isDone ? '#DCFCE7' : isCurrent ? '#FEF3C7' : '#E2E8F0' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: isDone ? '#16A34A' : isCurrent ? '#D97706' : '#64748B' }}>
                                          {isDone ? 'DONE' : isCurrent ? 'ACTIVE' : 'PENDING'}
                                        </Text>
                                      </View>
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>
                    );
                  })()}
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal 5: Protocol Staff Reorder & Serial Customization Modal */}
        {showStaffReorderModal && (
          <Modal
            visible={showStaffReorderModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowStaffReorderModal(false)}
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
                    backgroundColor: '#0F2A4A',
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
                        {lang ? 'প্রোটোকল অফিসারদের সিরিয়াল কাস্টমাইজ' : 'Customize Protocol Officer Serials'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#38BDF8', fontWeight: '700' }}>
                        {lang ? 'অফিসারদের ক্রম সাজান (▲ ▼ বা সরাসরি সিরিয়াল নম্বর লিখুন)' : 'Reorder officers via ▲ ▼ arrows or type custom serial numbers'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setShowStaffReorderModal(false)}>
                    <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '800' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Officers List */}
                <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
                  {staffReorderList.map((item, idx) => (
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
                          onPress={() => handleMoveInStaffReorderList(idx, 'up')}
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
                          disabled={idx === staffReorderList.length - 1}
                          onPress={() => handleMoveInStaffReorderList(idx, 'down')}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: idx === staffReorderList.length - 1 ? '#F1F5F9' : '#0284C7',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '900', color: idx === staffReorderList.length - 1 ? '#94A3B8' : '#FFFFFF' }}>▼</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Serial Input */}
                      <View style={{ width: 54 }}>
                        <TextInput
                          value={String(item.serial ?? (idx + 1))}
                          onChangeText={(val) => handleChangeSerialInStaffReorderList(idx, val)}
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

                      {/* Officer Photo/Avatar + Details */}
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
                            <Text style={{ fontSize: 17 }}>{(item.role || '').includes('VIP') ? '⭐' : (item.role || '').includes('Medical') ? '🩺' : (item.role || '').includes('Wheelchair') ? '🦽' : '🧑‍✈️'}</Text>
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                            {item.name || 'Protocol Officer'}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '700' }} numberOfLines={1}>
                            {item.role || 'Protocol Officer'} • 📍 {item.station || item.airport || 'DAC'}
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
                    onPress={() => setShowStaffReorderModal(false)}
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
                    onPress={handleSaveStaffReorder}
                    disabled={staffReorderSaving}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: '#0284C7',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF' }}>
                      {staffReorderSaving
                        ? (lang ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
                        : (lang ? '✓ নতুন সিরিয়াল সংরক্ষণ করুন' : '✓ Save New Serials')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  };

    const renderPricingManagement = () => {
    // Simulator Draft Calculation
    const simDraft = {
      pkg: {
        id: simPkg,
        p: localPricing.packages?.[simPkg]?.basePrice ?? 500,
        n: localPricing.packages?.[simPkg]?.name || [simPkg, simPkg],
      },
      a: simAdults,
      c: simChildren,
      e: simElderly,
      staffCount: simStaffCount,
      dedicatedStaff: simDedicatedStaff,
      addons: simVehicle !== 'none' ? [...simAddons, 'transfer'] : simAddons,
      addonDetails: {
        wrap: { bags: simWrapBags },
        wheel: { count: simAdults + simChildren + simElderly },
        transfer: { vehicle_category: simVehicle, pickup: true, dropoff: simBothWays },
        lounge: { count: simAdults + simChildren + simElderly },
      },
      airport: simAirport,
      time: simTime,
    };
    const simResult = calculateBookingPricing(simDraft, ADDONS, localPricing);

    const subTabs = [
      { key: 'packages', label: lang ? 'সার্ভিস প্যাকেজ' : 'Packages', icon: '📦' },
      { key: 'passengers', label: lang ? 'যাত্রীর নিয়মাবলী' : 'Passenger Rules', icon: '👥' },
      { key: 'staff', label: lang ? 'প্রোটোকল স্টাফ' : 'Protocol Staff', icon: '🧑‍✈️' },
      { key: 'addons', label: lang ? 'অতিরিক্ত সেবা' : 'Add-ons', icon: '＋' },
      { key: 'vehicles', label: lang ? 'ট্রান্সফার গাড়ি' : 'Vehicles', icon: '🚗' },
      { key: 'business', label: lang ? 'ট্যাক্স ও রুলস' : 'Business Rules', icon: '🏛️' },
      { key: 'simulator', label: lang ? 'লাইভ সিমুলেটর' : 'Live Simulator', icon: '🧮' },
    ];

    const handleSavePricing = () => {
      try {
        if (updatePricingConfig) {
          updatePricingConfig(localPricing);
        }
        setPricingNotice(lang ? 'মূল্য কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে।' : 'Pricing configuration saved successfully.');
        setPricingError('');
      } catch (err) {
        setPricingError(lang ? 'সংরক্ষণ ব্যর্থ হয়েছে।' : 'Failed to save pricing configuration.');
      }
    };

    const handleResetPricing = () => {
      setLocalPricing(DEFAULT_PRICING_CONFIG);
      if (resetPricingConfig) {
        resetPricingConfig();
      }
      setPricingNotice(lang ? 'ডিফল্ট মূল্য সফলভাবে পুনরুদ্ধার করা হয়েছে।' : 'Pricing reset to system defaults successfully.');
      setPricingError('');
    };

    const updatePackagePrice = (pkgId, price) => {
      setLocalPricing(prev => ({
        ...prev,
        packages: {
          ...prev.packages,
          [pkgId]: { ...prev.packages[pkgId], basePrice: Math.max(0, Number(price) || 0) },
        },
      }));
    };

    const togglePackageActive = (pkgId) => {
      setLocalPricing(prev => ({
        ...prev,
        packages: {
          ...prev.packages,
          [pkgId]: { ...prev.packages[pkgId], active: !prev.packages[pkgId]?.active },
        },
      }));
    };

    const updateMultiplier = (type, val) => {
      setLocalPricing(prev => ({
        ...prev,
        passengerRules: {
          ...prev.passengerRules,
          [type]: Math.max(0, parseFloat(val) || 0),
        },
      }));
    };

    const updateGroupTier = (tierId, field, val) => {
      setLocalPricing(prev => ({
        ...prev,
        passengerRules: {
          ...prev.passengerRules,
          groupDiscountTiers: (prev.passengerRules?.groupDiscountTiers || []).map(t =>
            t.id === tierId ? { ...t, [field]: Number(val) || 0 } : t
          ),
        },
      }));
    };

    const updateStaffRule = (field, val) => {
      setLocalPricing(prev => ({
        ...prev,
        staffRules: {
          ...prev.staffRules,
          [field]: Math.max(0, Number(val) || 0),
        },
      }));
    };

    const updateAddonPrice = (id, price) => {
      setLocalPricing(prev => ({
        ...prev,
        additionalServices: {
          ...prev.additionalServices,
          [id]: { ...prev.additionalServices[id], price: price === '' ? null : Math.max(0, Number(price) || 0) },
        },
      }));
    };

    const toggleAddonActive = (id) => {
      setLocalPricing(prev => ({
        ...prev,
        additionalServices: {
          ...prev.additionalServices,
          [id]: { ...prev.additionalServices[id], active: !prev.additionalServices[id]?.active },
        },
      }));
    };

    const updateVehiclePrice = (cat, price) => {
      setLocalPricing(prev => ({
        ...prev,
        vehicleRates: {
          ...prev.vehicleRates,
          [cat]: { ...prev.vehicleRates[cat], basePrice: Math.max(0, Number(price) || 0) },
        },
      }));
    };

    const toggleVehicleActive = (cat) => {
      setLocalPricing(prev => ({
        ...prev,
        vehicleRates: {
          ...prev.vehicleRates,
          [cat]: { ...prev.vehicleRates[cat], active: !prev.vehicleRates[cat]?.active },
        },
      }));
    };

    const updateBusinessRule = (field, val) => {
      setLocalPricing(prev => ({
        ...prev,
        businessRules: {
          ...prev.businessRules,
          [field]: Math.max(0, Number(val) || 0),
        },
      }));
    };

    const updateAirportSurcharge = (code, val) => {
      setLocalPricing(prev => ({
        ...prev,
        businessRules: {
          ...prev.businessRules,
          airportSurcharges: {
            ...prev.businessRules?.airportSurcharges,
            [code]: Math.max(0, Number(val) || 0),
          },
        },
      }));
    };

    return (
      <View style={s.pagePanel}>
        {/* Header Block */}
        <View style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 260 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24 }}>🏷️</Text>
                <Text style={[s.pageTitle, { marginBottom: 0 }]}>
                  {lang ? 'মূল্য নির্ধারণ ও ব্যবস্থাপনা' : 'Pricing Management'}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                {lang
                  ? 'সার্ভিস প্যাকেজ, যাত্রী মাল্টিপ্লায়ার, প্রোটোকল স্টাফ রেট, অতিরিক্ত সেবা, ট্রান্সফার গাড়ি ও ট্যাক্স রুলস কনফিগার করুন।'
                  : 'Configure service packages, passenger multipliers, protocol staff rates, add-ons, vehicle transfers, and business tax rules.'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <TouchableOpacity
                onPress={handleResetPricing}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: '#F1F5F9',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 13 }}>🔄</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569' }}>
                  {lang ? 'ডিফল্ট রিসেট' : 'Reset Defaults'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSavePricing}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: '#0284C7',
                  shadowColor: '#0284C7',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 2,
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 13, color: '#FFFFFF' }}>💾</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {lang ? 'মূল্য সংরক্ষণ' : 'Save Pricing'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notices */}
        {pricingNotice ? (
          <View style={{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>✅</Text>
            <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700' }}>{pricingNotice}</Text>
          </View>
        ) : null}

        {pricingError ? (
          <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>⚠️</Text>
            <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '700' }}>{pricingError}</Text>
          </View>
        ) : null}

        {/* Sub-tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          {subTabs.map(tab => {
            const isActive = pricingSubTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setPricingSubTab(tab.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: isActive ? '#0284C7' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: isActive ? '#0284C7' : '#E2E8F0',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 15 }}>{tab.icon}</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? '800' : '600',
                    color: isActive ? '#FFFFFF' : '#334155',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* TAB 1: SERVICE PACKAGES */}
        {pricingSubTab === 'packages' && (
          <View style={{ gap: 14 }}>
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                💡 {lang
                  ? 'সার্ভিস প্যাকেজ হলো মূল মিট অ্যান্ড গ্রিট প্রোটোকল সহায়তার ভিত্তি মূল্য। প্রতিটি প্যাকেজের জন্য প্রতি যাত্রীর মূল্য (টাকায়) নির্ধারণ করুন।'
                  : 'Service packages represent the foundational Meet & Greet assistance tiers. Configure the base price charged per passenger.'}
              </Text>
            </View>

            {['economy', 'business', 'first'].map(pkgKey => {
              const pkg = localPricing.packages?.[pkgKey] || { basePrice: 500, active: true, name: [pkgKey, pkgKey] };
              const icon = pkgKey === 'first' ? '👑' : pkgKey === 'business' ? '🥈' : '🥉';
              const badgeBg = pkgKey === 'first' ? '#FEF3C7' : pkgKey === 'business' ? '#E0E7FF' : '#F1F5F9';
              const badgeColor = pkgKey === 'first' ? '#B45309' : pkgKey === 'business' ? '#4338CA' : '#475569';

              return (
                <View
                  key={pkgKey}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: pkg.active ? '#CBD5E1' : '#E2E8F0',
                    opacity: pkg.active ? 1 : 0.65,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: badgeBg, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20 }}>{icon}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                          {Array.isArray(pkg.name) ? pkg.name[lang ? 1 : 0] : (pkgKey.toUpperCase())}
                        </Text>
                        <Text style={{ fontSize: 12, color: badgeColor, fontWeight: '700' }}>
                          {pkgKey === 'first' ? (lang ? 'ভিআইপি প্রোটোকল' : 'VIP Protocol') : pkgKey === 'business' ? (lang ? 'প্রিমিয়াম ফাস্ট-ট্র্যাক' : 'Premium Fast-Track') : (lang ? 'স্ট্যান্ডার্ড মিট অ্যান্ড গ্রিট' : 'Standard Meet & Greet')}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        {pkg.active ? (lang ? 'সক্রিয়' : 'Active') : (lang ? 'বন্ধ' : 'Inactive')}
                      </Text>
                      <Switch
                        value={pkg.active !== false}
                        onValueChange={() => togglePackageActive(pkgKey)}
                        trackColor={{ false: '#CBD5E1', true: '#38BDF8' }}
                        thumbColor={pkg.active !== false ? '#0284C7' : '#94A3B8'}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 }}>
                    <View style={{ flex: 1, minWidth: 160 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                        {lang ? 'মূল মূল্য (৳ প্রতি যাত্রী)' : 'Base Price (৳ per pax)'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0284C7', marginRight: 4 }}>৳</Text>
                        <TextInput
                          value={String(pkg.basePrice ?? '')}
                          onChangeText={text => updatePackagePrice(pkgKey, text.replace(/[^0-9]/g, ''))}
                          keyboardType="numeric"
                          placeholder="500"
                          style={{ flex: 1, height: 38, fontSize: 15, fontWeight: '700', color: '#0F172A' }}
                        />
                      </View>
                    </View>

                    {/* Quick Preset Buttons */}
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingTop: 18 }}>
                      {[500, 1000, 1500, 2000].map(val => (
                        <TouchableOpacity
                          key={val}
                          onPress={() => updatePackagePrice(pkgKey, val)}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 6,
                            backgroundColor: pkg.basePrice === val ? '#0284C7' : '#E2E8F0',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: pkg.basePrice === val ? '#FFFFFF' : '#334155' }}>
                            ৳{val}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 2: PASSENGER RULES */}
        {pricingSubTab === 'passengers' && (
          <View style={{ gap: 16 }}>
            {/* Demographic Multipliers Card */}
            <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                👥 {lang ? 'যাত্রীর ক্যাটাগরি ও রেট মাল্টিপ্লায়ার' : 'Passenger Category Rate Multipliers'}
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748B', marginBottom: 14 }}>
                {lang
                  ? 'প্রাপ্তবয়স্ক, শিশু ও বয়স্ক যাত্রীদের জন্য প্যাকেজ মূল্যের শতকরা অনুপাত নির্ধারণ করুন (যেমন ১.০ = ১০০%, ০.৮ = ২০% ছাড়)।'
                  : 'Configure multiplier against base package price for Adults, Children, and Elderly passengers.'}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {/* Adult Multiplier */}
                <View style={{ flex: 1, minWidth: 140, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>🧑 {lang ? 'প্রাপ্তবয়স্ক (Adult)' : 'Adult'}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>{lang ? 'পূর্ণ মূল্য (ডিফল্ট ১.০)' : 'Standard 100% (1.0)'}</Text>
                  <TextInput
                    value={String(localPricing.passengerRules?.adultMultiplier ?? 1.0)}
                    onChangeText={val => updateMultiplier('adultMultiplier', val)}
                    keyboardType="numeric"
                    style={{ backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#94A3B8', borderRadius: 8, height: 38, paddingHorizontal: 10, fontSize: 14, fontWeight: '700' }}
                  />
                  <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '700', marginTop: 4 }}>
                    = {Math.round((localPricing.passengerRules?.adultMultiplier || 1) * 100)}% {lang ? 'মূল্য' : 'rate'}
                  </Text>
                </View>

                {/* Child Multiplier */}
                <View style={{ flex: 1, minWidth: 140, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>👶 {lang ? 'শিশু (Child)' : 'Child'}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>{lang ? '২০% ছাড় (ডিফল্ট ০.৮)' : '20% off (0.8)'}</Text>
                  <TextInput
                    value={String(localPricing.passengerRules?.childMultiplier ?? 0.8)}
                    onChangeText={val => updateMultiplier('childMultiplier', val)}
                    keyboardType="numeric"
                    style={{ backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#94A3B8', borderRadius: 8, height: 38, paddingHorizontal: 10, fontSize: 14, fontWeight: '700' }}
                  />
                  <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700', marginTop: 4 }}>
                    = {Math.round((localPricing.passengerRules?.childMultiplier || 0.8) * 100)}% {lang ? 'মূল্য' : 'rate'}
                  </Text>
                </View>

                {/* Elderly Multiplier */}
                <View style={{ flex: 1, minWidth: 140, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>🧓 {lang ? 'বয়স্ক (Senior)' : 'Elderly'}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>{lang ? '১০% ছাড় (ডিফল্ট ০.৯)' : '10% off (0.9)'}</Text>
                  <TextInput
                    value={String(localPricing.passengerRules?.elderlyMultiplier ?? 0.9)}
                    onChangeText={val => updateMultiplier('elderlyMultiplier', val)}
                    keyboardType="numeric"
                    style={{ backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#94A3B8', borderRadius: 8, height: 38, paddingHorizontal: 10, fontSize: 14, fontWeight: '700' }}
                  />
                  <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '700', marginTop: 4 }}>
                    = {Math.round((localPricing.passengerRules?.elderlyMultiplier || 0.9) * 100)}% {lang ? 'মূল্য' : 'rate'}
                  </Text>
                </View>
              </View>

              {/* Sample Calculation Preview */}
              <View style={{ marginTop: 14, padding: 10, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <Text style={{ fontSize: 12, color: '#1E40AF', fontWeight: '700' }}>
                  🔍 {lang ? 'হিসাব উদাহরণ (৳ ১,০০০ টাকার প্যাকেজে):' : 'Sample preview on ৳ 1,000 package:'}
                </Text>
                <Text style={{ fontSize: 12, color: '#1E3A8A', marginTop: 3 }}>
                  • {lang ? 'প্রাপ্তবয়স্ক:' : 'Adult:'} ৳ {Math.round(1000 * (localPricing.passengerRules?.adultMultiplier ?? 1.0))}
                  {'  '}• {lang ? 'শিশু:' : 'Child:'} ৳ {Math.round(1000 * (localPricing.passengerRules?.childMultiplier ?? 0.8))}
                  {'  '}• {lang ? 'প্রবীণ:' : 'Elderly:'} ৳ {Math.round(1000 * (localPricing.passengerRules?.elderlyMultiplier ?? 0.9))}
                </Text>
              </View>
            </View>

            {/* Group Volume Discount Tiers Card */}
            <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                🏷️ {lang ? 'গ্রুপ বুকিং ভলিউম ডিসকাউন্ট টিয়ার' : 'Group Volume Discount Tiers'}
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748B', marginBottom: 14 }}>
                {lang
                  ? 'যাত্রীর সংখ্যা অনুযায়ী স্বয়ংক্রিয় ছাড়ের শতকরা হার নির্ধারণ করুন।'
                  : 'Configure percentage discounts automatically applied when passenger count reaches volume tiers.'}
              </Text>

              <View style={{ gap: 10 }}>
                {(localPricing.passengerRules?.groupDiscountTiers || []).map((tier, idx) => (
                  <View
                    key={tier.id || `tier-${idx}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      backgroundColor: '#F8FAFC',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <View style={{ minWidth: 120 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                        {Array.isArray(tier.label) ? tier.label[lang ? 1 : 0] : (tier.label || `Tier ${idx + 1}`)}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        {tier.minPax} - {tier.maxPax >= 999 ? '∞' : tier.maxPax} {lang ? 'জন যাত্রী' : 'Pax'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                        {lang ? 'ছাড় (%)' : 'Discount (%):'}
                      </Text>
                      <TextInput
                        value={String(tier.discountPercent ?? 0)}
                        onChangeText={val => updateGroupTier(tier.id, 'discountPercent', val.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: '#059669',
                          borderRadius: 8,
                          height: 36,
                          width: 60,
                          textAlign: 'center',
                          fontSize: 14,
                          fontWeight: '800',
                          color: '#059669',
                        }}
                      />
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#059669' }}>%</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: PROTOCOL STAFF RULES */}
        {pricingSubTab === 'staff' && (
          <View style={{ gap: 14 }}>
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                🧑‍✈️ {lang
                  ? 'প্রোটোকল সহকারী বরাদ্দ নিয়মাবলী: নির্ধারিত যাত্রী অনুপাতে অন্তর্ভুক্ত কর্মী সংখ্যা এবং অতিরিক্ত বা ডেডিকেটেড স্টাফের ফি নির্ধারণ করুন।'
                  : 'Configure included passenger-to-staff ratios and fees charged for extra or dedicated personal protocol assistants.'}
              </Text>
            </View>

            {/* Included Pax Ratio */}
            <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                    1. {lang ? 'প্রতি ১ জন স্টাফের জন্য অন্তর্ভুক্ত যাত্রী সংখ্যা' : 'Passengers included per 1 Protocol Staff'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {lang ? 'যেমন ৩ দিলে ১-৩ জনের জন্য ১ জন, ৪-৬ জনের জন্য ২ জন সহকারী অন্তর্ভুক্ত থাকবে।' : 'e.g. 3 means 1-3 pax gets 1 included staff, 4-6 pax gets 2 included staff.'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextInput
                    value={String(localPricing.staffRules?.includedPaxPerStaff ?? 3)}
                    onChangeText={val => updateStaffRule('includedPaxPerStaff', val.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#0284C7', borderRadius: 8, height: 40, width: 70, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#0284C7' }}
                  />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>{lang ? 'জন' : 'Pax'}</Text>
                </View>
              </View>
            </View>

            {/* Additional Staff Fee */}
            <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                    2. {lang ? 'অতিরিক্ত প্রোটোকল স্টাফ ফি (৳ প্রতি জন)' : 'Additional Protocol Staff Fee (৳)'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {lang ? 'অন্তর্ভুক্ত সংখ্যার অতিরিক্ত সহকারী চাইলে প্রতি স্টাফের জন্য প্রযোজ্য।' : 'Charged when extra assistants beyond included ratio are requested or required.'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0284C7', marginRight: 4 }}>৳</Text>
                  <TextInput
                    value={String(localPricing.staffRules?.additionalStaffRate ?? 500)}
                    onChangeText={val => updateStaffRule('additionalStaffRate', val.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={{ height: 40, width: 80, fontSize: 15, fontWeight: '700', color: '#0F172A' }}
                  />
                </View>
              </View>
            </View>

            {/* Dedicated VIP Staff Fee */}
            <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                    3. {lang ? 'ডেডিকেটেড ১-অন-১ ভিআইপি অফিসার ফি (৳)' : 'Dedicated 1-on-1 VIP Officer Fee (৳)'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {lang ? 'ব্যক্তিগত স্বতন্ত্র ভিআইপি প্রটোকল অফিসারের জন্য এককালীন সারচার্জ।' : 'Surcharge for dedicated single-passenger 1-on-1 VIP escort protocol.'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0284C7', marginRight: 4 }}>৳</Text>
                  <TextInput
                    value={String(localPricing.staffRules?.dedicatedVipStaffRate ?? 800)}
                    onChangeText={val => updateStaffRule('dedicatedVipStaffRate', val.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={{ height: 40, width: 80, fontSize: 15, fontWeight: '700', color: '#0F172A' }}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB 4: ADDITIONAL SERVICES (ADD-ONS) */}
        {pricingSubTab === 'addons' && (
          <View style={{ gap: 12 }}>
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                ＋ {lang
                  ? 'অতিরিক্ত সেবাসমূহ (হুইলচেয়ার, লাগেজ র‍্যাপিং, লাউঞ্জ, প্রিন্ট ইত্যাদি)-এর ফিক্সড রেট কনফিগার করুন।'
                  : 'Configure fixed unit rates or quote requirements for supplementary airport services.'}
              </Text>
            </View>

            {Object.keys(localPricing.additionalServices || {}).map(addonId => {
              const item = localPricing.additionalServices[addonId];
              const iconMap = {
                wheel: '🦽', wrap: '🧳', print: '🖨️', photocopy: '📄',
                food: '🍱', lounge: '🛋️', medical: '🩺', visa: '🛂',
                security: '🛡️', tour: '🗺️', hotel: '🏨',
              };

              return (
                <View
                  key={addonId}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1.5,
                    borderColor: item.active ? '#CBD5E1' : '#E2E8F0',
                    opacity: item.active ? 1 : 0.65,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                    <Text style={{ fontSize: 22 }}>{iconMap[addonId] || '＋'}</Text>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                        {Array.isArray(item.name) ? item.name[lang ? 1 : 0] : addonId}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#F1F5F9' }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>
                            {item.unit === 'bag' ? (lang ? 'প্রতি ব্যাগ' : '/ bag') : item.unit === 'person' ? (lang ? 'প্রতি জন' : '/ person') : (lang ? 'প্রতি অনুরোধ' : '/ request')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0284C7', marginRight: 4 }}>৳</Text>
                      <TextInput
                        value={item.price != null ? String(item.price) : ''}
                        onChangeText={text => updateAddonPrice(addonId, text.replace(/[^0-9]/g, ''))}
                        placeholder={lang ? 'কোট' : 'Quote'}
                        keyboardType="numeric"
                        style={{ height: 36, width: 75, fontSize: 14, fontWeight: '700', color: '#0F172A' }}
                      />
                    </View>

                    <Switch
                      value={item.active !== false}
                      onValueChange={() => toggleAddonActive(addonId)}
                      trackColor={{ false: '#CBD5E1', true: '#38BDF8' }}
                      thumbColor={item.active !== false ? '#0284C7' : '#94A3B8'}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 5: VEHICLE TRANSFERS */}
        {pricingSubTab === 'vehicles' && (
          <View style={{ gap: 14 }}>
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                🚗 {lang
                  ? 'এয়ারপোর্ট পিকআপ ও ড্রপ-অফ প্রাইভেট গাড়ির ধরন অনুযায়ী বেস ভাড়া নির্ধারণ করুন। গ্রাহক উভয় পথ নির্বাচন করলে ১০% রাউন্ড-ট্রিপ ডিসকাউন্ট প্রযোজ্য হয়।'
                  : 'Configure private airport pickup and drop-off rates by vehicle category. 10% round-trip discount is auto-applied for two-way bookings.'}
              </Text>
            </View>

            {Object.keys(localPricing.vehicleRates || {}).map(catKey => {
              const v = localPricing.vehicleRates[catKey];
              const iconMap = { sedan: '🚗', suv: '🚙', microbus: '🚐', luxury: '⭐' };

              return (
                <View
                  key={catKey}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: v.active ? '#CBD5E1' : '#E2E8F0',
                    opacity: v.active ? 1 : 0.65,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 24 }}>{iconMap[catKey] || '🚗'}</Text>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                          {Array.isArray(v.name) ? v.name[lang ? 1 : 0] : catKey.toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>{v.capacity}</Text>
                      </View>
                    </View>

                    <Switch
                      value={v.active !== false}
                      onValueChange={() => toggleVehicleActive(catKey)}
                      trackColor={{ false: '#CBD5E1', true: '#38BDF8' }}
                      thumbColor={v.active !== false ? '#0284C7' : '#94A3B8'}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                      {lang ? 'একমুখী ট্রিপ বেস ভাড়া (৳):' : 'One-way Base Rate (৳):'}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0284C7', marginRight: 4 }}>৳</Text>
                      <TextInput
                        value={String(v.basePrice ?? '')}
                        onChangeText={text => updateVehiclePrice(catKey, text.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        placeholder="1200"
                        style={{ height: 38, width: 90, fontSize: 15, fontWeight: '700', color: '#0F172A' }}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 6: BUSINESS RULES */}
        {pricingSubTab === 'business' && (
          <View style={{ gap: 14 }}>
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                🏛️ {lang
                  ? 'ব্যবসায়িক নিয়মাবলী: সরকারি ভ্যাট, প্ল্যাটফর্ম বুকিং চার্জ, সর্বনিম্ন বুকিং সীমা এবং রিজিওনাল এয়ারপোর্ট সারচার্জ কনফিগার করুন।'
                  : 'Configure taxes, platform fees, minimum charge threshold, and regional airport adjustments.'}
              </Text>
            </View>

            {/* VAT & Platform Fee Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {/* VAT */}
              <View style={{ flex: 1, minWidth: 160, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>🏛️ {lang ? 'সরকারি ভ্যাট (VAT %)' : 'Government VAT (%)'}</Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 8 }}>{lang ? 'সাবটোটালের উপর প্রদেয় ট্যাক্স' : 'Applied on subtotal'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#94A3B8', borderRadius: 8, paddingHorizontal: 10 }}>
                  <TextInput
                    value={String(localPricing.businessRules?.vatPercent ?? 5)}
                    onChangeText={val => updateBusinessRule('vatPercent', val.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={{ flex: 1, height: 38, fontSize: 15, fontWeight: '800', color: '#0F172A' }}
                  />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0284C7' }}>%</Text>
                </View>
              </View>

              {/* Platform Fee */}
              <View style={{ flex: 1, minWidth: 160, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>⚙️ {lang ? 'প্ল্যাটফর্ম সার্ভিস ফি' : 'Platform Booking Fee'}</Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 8 }}>{lang ? 'প্রতি বুকিংয়ে ফিক্সড ফি' : 'Fixed fee per booking'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#94A3B8', borderRadius: 8, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0284C7', marginRight: 4 }}>৳</Text>
                  <TextInput
                    value={String(localPricing.businessRules?.platformFee ?? 50)}
                    onChangeText={val => updateBusinessRule('platformFee', val.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={{ flex: 1, height: 38, fontSize: 15, fontWeight: '800', color: '#0F172A' }}
                  />
                </View>
              </View>

              {/* Minimum Floor */}
              <View style={{ flex: 1, minWidth: 160, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>🛡️ {lang ? 'সর্বনিম্ন বুকিং সীমা' : 'Minimum Booking Floor'}</Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 8 }}>{lang ? 'চার্জের সর্বনিম্ন ফ্লোর' : 'Floor protection'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#94A3B8', borderRadius: 8, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0284C7', marginRight: 4 }}>৳</Text>
                  <TextInput
                    value={String(localPricing.businessRules?.minimumBookingAmount ?? 500)}
                    onChangeText={val => updateBusinessRule('minimumBookingAmount', val.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={{ flex: 1, height: 38, fontSize: 15, fontWeight: '800', color: '#0F172A' }}
                  />
                </View>
              </View>

              {/* Peak Hour Surcharge */}
              <View style={{ flex: 1, minWidth: 160, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>🌙 {lang ? 'পিক আওয়ার সারচার্জ' : 'Peak Hour Surcharge'}</Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 8 }}>{lang ? 'রাত ১০টা - সকাল ৬টা' : 'Night 22:00 - 06:00'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#94A3B8', borderRadius: 8, paddingHorizontal: 10 }}>
                  <TextInput
                    value={String(localPricing.businessRules?.peakHourSurchargePercent ?? 10)}
                    onChangeText={val => updateBusinessRule('peakHourSurchargePercent', val.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={{ flex: 1, height: 38, fontSize: 15, fontWeight: '800', color: '#0F172A' }}
                  />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#D97706' }}>%</Text>
                </View>
              </View>
            </View>

            {/* Regional Airport Surcharges Card */}
            <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', marginTop: 4 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                🛫 {lang ? 'আঞ্চলিক বিমানবন্দর লোকেশন সারচার্জ (৳)' : 'Regional Airport Location Surcharges (৳)'}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                {lang
                  ? 'ঢাকা বাদে অন্যান্য আঞ্চলিক বিমানবন্দরে পরিচালনার অতিরিক্ত লজিস্টিক ফি সেট করুন।'
                  : 'Set extra logistical surcharge applied per booking for regional airport hubs.'}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { code: 'dac', name: 'Dhaka (HSIA)' },
                  { code: 'cgp', name: 'Chattogram (CGP)' },
                  { code: 'zyl', name: 'Sylhet (ZYL)' },
                  { code: 'cxb', name: "Cox's Bazar (CXB)" },
                  { code: 'jsr', name: 'Jashore (JSR)' },
                  { code: 'spd', name: 'Saidpur (SPD)' },
                  { code: 'rjh', name: 'Rajshahi (RJH)' },
                  { code: 'bzl', name: 'Barishal (BZL)' },
                ].map(apt => (
                  <View
                    key={apt.code}
                    style={{
                      width: '48%',
                      minWidth: 140,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 10,
                      backgroundColor: '#F8FAFC',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155' }}>{apt.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284C7', marginRight: 2 }}>+৳</Text>
                      <TextInput
                        value={String(localPricing.businessRules?.airportSurcharges?.[apt.code] ?? 0)}
                        onChangeText={val => updateAirportSurcharge(apt.code, val.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        style={{ height: 32, width: 55, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, textAlign: 'center', fontSize: 13, fontWeight: '700' }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* TAB 7: LIVE SIMULATOR (THE INTERACTIVE WORKBENCH) */}
        {pricingSubTab === 'simulator' && (
          <View style={{ gap: 16 }}>
            <View style={{ backgroundColor: '#F0FDF4', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#BBF7D0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🧮</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#166534' }}>
                  {lang ? 'লাইভ মূল্য ক্যালকুলেশন সিমুলেটর' : 'Live Calculation Engine Simulator'}
                </Text>
              </View>
              <Text style={{ fontSize: 12.5, color: '#15803D', marginTop: 4 }}>
                {lang
                  ? 'যেকোনো বুকিং মানদণ্ড দিয়ে রিয়েল-টাইমে সম্পূর্ণ সিস্টেমের হিসাব পরীক্ষা করুন। চূড়ান্ত মূল্য সিস্টেম ইঞ্জিন দ্বারা স্বয়ংক্রিয়ভাবে নির্ধারিত হয়।'
                  : 'Test and verify deterministic booking price calculation in real-time with configurable parameters.'}
              </Text>
            </View>

            <View style={{ flexDirection: responsive.isPhone ? 'column' : 'row', gap: 16, alignItems: 'flex-start' }}>
              {/* Left Column: Simulator Controls */}
              <View style={{ flex: 1.2, width: '100%', gap: 14 }}>
                {/* 1. Service Package */}
                <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                    1. {lang ? 'সার্ভিস প্যাকেজ নির্বাচন' : 'Service Package'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['economy', 'business', 'first'].map(pkgKey => {
                      const isSel = simPkg === pkgKey;
                      const pkgObj = localPricing.packages?.[pkgKey];
                      return (
                        <TouchableOpacity
                          key={pkgKey}
                          onPress={() => setSimPkg(pkgKey)}
                          style={{
                            flex: 1,
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor: isSel ? '#0284C7' : '#F8FAFC',
                            borderWidth: 1.5,
                            borderColor: isSel ? '#0284C7' : '#CBD5E1',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '800', color: isSel ? '#FFFFFF' : '#0F172A' }}>
                            {pkgKey === 'economy' ? (lang ? 'স্ট্যান্ডার্ড' : 'Standard') : pkgKey === 'business' ? (lang ? 'প্রিমিয়াম' : 'Premium') : (lang ? 'ভিআইপি' : 'VIP')}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: isSel ? '#E0F2FE' : '#64748B', marginTop: 2 }}>
                            ৳ {pkgObj?.basePrice ?? 500}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 2. Passengers Quantity */}
                <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                    2. {lang ? 'যাত্রীর সংখ্যা' : 'Passenger Counts'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {/* Adults */}
                    <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>🧑 {lang ? 'প্রাপ্তবয়স্ক' : 'Adults'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <TouchableOpacity
                          onPress={() => setSimAdults(Math.max(1, simAdults - 1))}
                          style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '800' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', minWidth: 20, textAlign: 'center' }}>{simAdults}</Text>
                        <TouchableOpacity
                          onPress={() => setSimAdults(simAdults + 1)}
                          style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '800' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Children */}
                    <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>👶 {lang ? 'শিশু' : 'Children'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <TouchableOpacity
                          onPress={() => setSimChildren(Math.max(0, simChildren - 1))}
                          style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '800' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', minWidth: 20, textAlign: 'center' }}>{simChildren}</Text>
                        <TouchableOpacity
                          onPress={() => setSimChildren(simChildren + 1)}
                          style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '800' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Elderly */}
                    <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>🧓 {lang ? 'বয়স্ক' : 'Elderly'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <TouchableOpacity
                          onPress={() => setSimElderly(Math.max(0, simElderly - 1))}
                          style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '800' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', minWidth: 20, textAlign: 'center' }}>{simElderly}</Text>
                        <TouchableOpacity
                          onPress={() => setSimElderly(simElderly + 1)}
                          style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '800' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 3. Protocol Staff Options */}
                <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                    3. {lang ? 'প্রোটোকল সহকারী ও ভিআইপি অফিসার' : 'Protocol Staff Allocation'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      onPress={() => {
                        setSimStaffCount(Math.max(1, Math.ceil((simAdults + simChildren + simElderly) / (localPricing.staffRules?.includedPaxPerStaff || 3))));
                        setSimDedicatedStaff(false);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: !simDedicatedStaff && simStaffCount <= Math.max(1, Math.ceil((simAdults + simChildren + simElderly) / 3)) ? '#0284C7' : '#F1F5F9',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: !simDedicatedStaff && simStaffCount <= Math.max(1, Math.ceil((simAdults + simChildren + simElderly) / 3)) ? '#FFFFFF' : '#334155' }}>
                        {lang ? 'অন্তর্ভুক্ত স্ট্যান্ডার্ড কর্মী' : 'Included Standard Staff'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        const included = Math.max(1, Math.ceil((simAdults + simChildren + simElderly) / (localPricing.staffRules?.includedPaxPerStaff || 3)));
                        setSimStaffCount(included + 1);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: simStaffCount > Math.max(1, Math.ceil((simAdults + simChildren + simElderly) / 3)) ? '#0284C7' : '#F1F5F9',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: simStaffCount > Math.max(1, Math.ceil((simAdults + simChildren + simElderly) / 3)) ? '#FFFFFF' : '#334155' }}>
                        +1 {lang ? 'অতিরিক্ত সহকারী (+৳' : 'Extra Staff (+৳'}{localPricing.staffRules?.additionalStaffRate ?? 500})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setSimDedicatedStaff(!simDedicatedStaff)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: simDedicatedStaff ? '#7C3AED' : '#F1F5F9',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: simDedicatedStaff ? '#FFFFFF' : '#334155' }}>
                        ⭐ {lang ? 'ডেডিকেটেড ভিআইপি অফিসার (+৳' : 'Dedicated VIP Officer (+৳'}{localPricing.staffRules?.dedicatedVipStaffRate ?? 800})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 4. Addons & Wrapping */}
                <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                    4. {lang ? 'অতিরিক্ত সেবা (Add-ons)' : 'Additional Services'}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { id: 'wheel', label: lang ? 'হুইলচেয়ার' : 'Wheelchair' },
                      { id: 'wrap', label: lang ? 'লাগেজ র‍্যাপিং' : 'Wrapping' },
                      { id: 'lounge', label: lang ? 'ভিআইপি লাউঞ্জ' : 'VIP Lounge' },
                      { id: 'print', label: lang ? 'ডকুমেন্ট প্রিন্ট' : 'Print' },
                    ].map(addon => {
                      const isSel = simAddons.includes(addon.id);
                      const asset = getAddonAsset(addon.id);
                      return (
                        <TouchableOpacity
                          key={addon.id}
                          onPress={() => {
                            setSimAddons(prev =>
                              prev.includes(addon.id) ? prev.filter(x => x !== addon.id) : [...prev, addon.id]
                            );
                          }}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: isSel ? '#0284C7' : '#F1F5F9',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {asset ? (
                            <Image source={asset} style={{ width: 16, height: 16, borderRadius: 2 }} resizeMode="contain" />
                          ) : null}
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#FFFFFF' : '#334155' }}>
                            {addon.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {simAddons.includes('wrap') && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 8, backgroundColor: '#FEF3C7', borderRadius: 8 }}>
                      <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '700' }}>
                        🧳 {lang ? 'র‍্যাপিং ব্যাগের সংখ্যা:' : 'Wrapping Bags:'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity onPress={() => setSimWrapBags(Math.max(1, simWrapBags - 1))} style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontWeight: '800' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ fontWeight: '800', minWidth: 16, textAlign: 'center' }}>{simWrapBags}</Text>
                        <TouchableOpacity onPress={() => setSimWrapBags(simWrapBags + 1)} style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontWeight: '800' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* 5. Transfer Vehicle & Timing */}
                <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                    5. {lang ? 'ট্রান্সফার গাড়ি, বিমানবন্দর ও সময়' : 'Vehicle, Airport & Time'}
                  </Text>

                  {/* Vehicle Picker */}
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {['none', 'sedan', 'suv', 'microbus', 'luxury'].map(vKey => {
                      const isSel = simVehicle === vKey;
                      return (
                        <TouchableOpacity
                          key={vKey}
                          onPress={() => setSimVehicle(vKey)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: isSel ? '#0284C7' : '#F1F5F9',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#FFFFFF' : '#334155' }}>
                            {vKey === 'none' ? (lang ? 'গাড়ি নেই' : 'No Vehicle') : vKey.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Airport & Peak Hour */}
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <View style={{ flex: 1, minWidth: 120 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                        {lang ? 'বিমানবন্দর' : 'Airport'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {['dac', 'cgp', 'zyl', 'cxb'].map(c => (
                          <TouchableOpacity
                            key={c}
                            onPress={() => setSimAirport(c)}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              borderRadius: 6,
                              backgroundColor: simAirport === c ? '#0F172A' : '#E2E8F0',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: simAirport === c ? '#FFFFFF' : '#334155' }}>
                              {c.toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={{ flex: 1, minWidth: 120 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                        {lang ? 'ফ্লাইটের সময়' : 'Flight Time'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {[
                          { time: '14:00', label: lang ? 'দিন (১৪:০০)' : 'Day (14:00)' },
                          { time: '23:30', label: lang ? 'পিক রাত (২৩:৩০)' : 'Night (23:30)' },
                        ].map(tObj => (
                          <TouchableOpacity
                            key={tObj.time}
                            onPress={() => setSimTime(tObj.time)}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              borderRadius: 6,
                              backgroundColor: simTime === tObj.time ? '#D97706' : '#E2E8F0',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: simTime === tObj.time ? '#FFFFFF' : '#334155' }}>
                              {tObj.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Right Column: Live Calculated Receipt */}
              <View style={{ flex: 1, width: '100%' }}>
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: '#0284C7',
                    shadowColor: '#0284C7',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    elevation: 3,
                  }}
                >
                  <View style={{ borderBottomWidth: 1.5, borderBottomColor: '#E2E8F0', paddingBottom: 10, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                        🧾 {lang ? 'লাইভ মূল্য রসিদ' : 'Itemized Receipt'}
                      </Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#E0F2FE' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7' }}>
                          LIVE CALCULATOR
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                      {simResult.passengerCount} {lang ? 'জন যাত্রী' : 'Pax'} • {simResult.airportCode?.toUpperCase()} • {simResult.pkg?.id?.toUpperCase()}
                    </Text>
                  </View>

                  {/* Lines */}
                  <View style={{ gap: 7 }}>
                    {/* Adult charge */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#475569' }}>
                        {simResult.adults}x {lang ? 'প্রাপ্তবয়স্ক (Adult)' : 'Adult'}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                        ৳ {simResult.adultCharge}
                      </Text>
                    </View>

                    {/* Child charge */}
                    {simResult.children > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          {simResult.children}x {lang ? 'শিশু (Child)' : 'Child'} ({Math.round(simResult.childMultiplier * 100)}%)
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          ৳ {simResult.childCharge}
                        </Text>
                      </View>
                    )}

                    {/* Elderly charge */}
                    {simResult.elderly > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          {simResult.elderly}x {lang ? 'বয়স্ক (Elderly)' : 'Elderly'} ({Math.round(simResult.elderlyMultiplier * 100)}%)
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          ৳ {simResult.elderlyCharge}
                        </Text>
                      </View>
                    )}

                    {/* Group volume discount */}
                    {simResult.groupDiscountAmount > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: '#059669', fontWeight: '700' }}>
                          🏷️ {lang ? `গ্রুপ ছাড় (-${simResult.groupDiscountPercent}%)` : `Group Discount (-${simResult.groupDiscountPercent}%)`}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#059669' }}>
                          - ৳ {simResult.groupDiscountAmount}
                        </Text>
                      </View>
                    )}

                    {/* Extra Staff fee */}
                    {simResult.extraStaffCharge > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          🧑‍✈️ {simResult.extraStaffCount}x {lang ? 'অতিরিক্ত প্রোটোকল সহকারী' : 'Extra Staff'}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          + ৳ {simResult.extraStaffCharge}
                        </Text>
                      </View>
                    )}

                    {/* Dedicated VIP staff */}
                    {simResult.dedicatedStaffCharge > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '700' }}>
                          ⭐ {lang ? 'ডেডিকেটেড ১-অন-১ অফিসার' : 'Dedicated VIP Officer'}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#7C3AED' }}>
                          + ৳ {simResult.dedicatedStaffCharge}
                        </Text>
                      </View>
                    )}

                    {/* Addons */}
                    {simResult.addonLines && simResult.addonLines.map(line => (
                      <View key={line.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          ＋ {Array.isArray(line.name) ? line.name[lang ? 1 : 0] : line.id} {line.quantity > 1 ? `(${line.quantity})` : ''}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          + ৳ {line.amount}
                        </Text>
                      </View>
                    ))}

                    {/* Vehicle */}
                    {simResult.hasVehicleTransfer && simResult.vehicleCharge > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          🚗 {lang ? 'গাড়ি ট্রান্সফার' : 'Vehicle'} ({simResult.vehicleCategory?.toUpperCase()})
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          + ৳ {simResult.vehicleCharge}
                        </Text>
                      </View>
                    )}

                    {/* Airport Regional Surcharge */}
                    {simResult.airportSurcharge > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          🛫 {lang ? 'এয়ারপোর্ট লোকেশন চার্জ' : 'Regional Airport Fee'}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          + ৳ {simResult.airportSurcharge}
                        </Text>
                      </View>
                    )}

                    {/* Peak Hour Surcharge */}
                    {simResult.peakSurchargeAmount > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: '#D97706', fontWeight: '700' }}>
                          🌙 {lang ? `পিক আওয়ার সারচার্জ (${simResult.peakSurchargePercent}%)` : `Peak Hour Surcharge (${simResult.peakSurchargePercent}%)`}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#D97706' }}>
                          + ৳ {simResult.peakSurchargeAmount}
                        </Text>
                      </View>
                    )}

                    {/* Platform Fee */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                        ⚙️ {lang ? 'প্ল্যাটফর্ম সার্ভিস ফি' : 'Platform Fee'}
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#64748B' }}>
                        + ৳ {simResult.platformFee}
                      </Text>
                    </View>

                    {/* Pre-tax Subtotal */}
                    <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                        {lang ? 'ট্যাক্স-পূর্ব সাবটোটাল' : 'Pre-tax Subtotal'}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155' }}>
                        ৳ {simResult.preTaxSubtotal}
                      </Text>
                    </View>

                    {/* Government VAT */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                        🏛️ {lang ? `সরকারি ভ্যাট (${simResult.vatPercent}%)` : `Govt VAT (${simResult.vatPercent}%)`}
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#64748B' }}>
                        + ৳ {simResult.vatAmount}
                      </Text>
                    </View>

                    {/* Final Total Box */}
                    <View
                      style={{
                        marginTop: 10,
                        padding: 12,
                        backgroundColor: '#F0F9FF',
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: '#BAE6FD',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1' }}>
                          {lang ? 'সর্বমোট প্রদেয় মূল্য' : 'FINAL BOOKING AMOUNT'}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#0284C7' }}>
                          {lang ? 'সিস্টেম দ্বারা গণনাকৃত' : 'Calculated by system'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 24, fontWeight: '900', color: '#0284C7' }}>
                        ৳ {simResult.finalTotal}
                      </Text>
                    </View>

                    {/* Deterministic Badge */}
                    <View
                      style={{
                        marginTop: 8,
                        padding: 8,
                        borderRadius: 6,
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#059669' }}>
                        ✓ SYSTEM ENGINE VERIFIED
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSecurityManagement = () => (
    <AdminSecurityTab
      securityLogs={securityLogs}
      loadSecurityLogs={loadSecurityLogs}
      securityNotice={securityNotice}
      setSecurityNotice={setSecurityNotice}
      securityActiveTab={securityActiveTab}
      setSecurityActiveTab={setSecurityActiveTab}
      securitySearchQuery={securitySearchQuery}
      setSecuritySearchQuery={setSecuritySearchQuery}
      securitySeverityFilter={securitySeverityFilter}
      setSecuritySeverityFilter={setSecuritySeverityFilter}
      securityActionFilter={securityActionFilter}
      setSecurityActionFilter={setSecurityActionFilter}
      securityAccountInput={securityAccountInput}
      setSecurityAccountInput={setSecurityAccountInput}
      securityAccountResult={securityAccountResult}
      setSecurityAccountResult={setSecurityAccountResult}
      securityPasswordTest={securityPasswordTest}
      setSecurityPasswordTest={setSecurityPasswordTest}
      securityPinTest={securityPinTest}
      setSecurityPinTest={setSecurityPinTest}
      securitySanitizeInput={securitySanitizeInput}
      setSecuritySanitizeInput={setSecuritySanitizeInput}
      managerSession={managerSession}
      lang={lang}
      s={s}
    />
  );

  const renderLiveTrackingManagement = () => (
    <AdminLiveTrackingTab
      bookings={bookings}
      lang={lang}
      trackingAirportFilter={trackingAirportFilter}
      setTrackingAirportFilter={setTrackingAirportFilter}
      trackingSearchQuery={trackingSearchQuery}
      setTrackingSearchQuery={setTrackingSearchQuery}
      trackingRefreshTick={trackingRefreshTick}
      setTrackingRefreshTick={setTrackingRefreshTick}
      trackingActionNotice={trackingActionNotice}
      setTrackingActionNotice={setTrackingActionNotice}
      setManagerTrackingBooking={setManagerTrackingBooking}
      googleMapsApiKeyInput={managerGoogleMapsApiKeyInput}
      setGoogleMapsApiKeyInput={setManagerGoogleMapsApiKeyInput}
      googleMapsKeyStatus={googleMapsKeyStatus}
      handleSaveGoogleMapsApiKey={handleSaveGoogleMapsApiKey}
      s={s}
    />
  );

  const renderDashboardProtocolOfficers = () => {
    // STRICT RULE: Only operational field Protocol Officers and Shift In-Charges
    const syncedOfficers = (staffRoster || []).filter(s => isFieldProtocolOfficer(s));
    const totalStaffCount = syncedOfficers.length;
    const availableStaffCount = syncedOfficers.filter(s => s.status === 'available' && s.active !== false).length;
    const inServiceStaffCount = syncedOfficers.filter(s => s.status === 'in_service' && s.active !== false).length;
    const offDutyStaffCount = syncedOfficers.filter(s => s.status === 'off_duty' && s.active !== false).length;

    const filteredOfficers = syncedOfficers.filter(s => {
      if (dashboardOfficerAirport !== 'all' && s.airport !== dashboardOfficerAirport) return false;
      return true;
    });

    return (
      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: responsive.isPhone ? 12 : 16,
        marginBottom: 20,
        borderWidth: 1.5,
        borderColor: '#BAE6FD',
        ...Platform.select({
          web: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
          default: { elevation: 2 },
        }),
      }}>
        {/* Section Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: responsive.isPhone ? 'flex-start' : 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 12,
        }}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>🧑‍✈️</Text>
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'প্রোটোকল অফিসারবৃন্দ ও লাইভ ডিউটি' : 'Protocol Officers Fleet & Live Duty'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  {lang
                    ? 'সকল প্রোটোকল অফিসারের বর্তমান ডিউটি, ১০টি র‍্যাংক, পয়েন্ট ও নির্ধারিত ফ্লাইট'
                    : 'Live duty status, 10-tier ranks, points & flight assignments for all officers'}
                </Text>
              </View>
            </View>
          </View>

          {/* Action buttons in header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowProtocolRanksModal(true)}
              style={{
                backgroundColor: '#0F2A4A',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 12 }}>🎖️</Text>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                {lang ? '১০টি র‍্যাংক' : '10-Tier Ranks'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openManagerSection('staff')}
              style={{
                backgroundColor: '#0284C7',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                {lang ? 'অফিসার ম্যানেজমেন্ট →' : 'Manage Officers →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fleet KPI Quick Counters */}
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
          padding: 8,
          backgroundColor: '#F8FAFC',
          borderRadius: 12,
        }}>
          {[
            { label: lang ? 'মোট অফিসার' : 'Total Fleet', count: totalStaffCount, color: '#0F172A', bg: '#FFFFFF' },
            { label: lang ? '🟢 ডিউটিতে প্রাপ্য' : '🟢 Available', count: availableStaffCount, color: '#059669', bg: '#ECFDF5' },
            { label: lang ? '🟡 সেবায় ব্যস্ত' : '🟡 In Service', count: inServiceStaffCount, color: '#D97706', bg: '#FEF3C7' },
            { label: lang ? '⚪ অফ-ডিউটি' : '⚪ Off Duty', count: offDutyStaffCount, color: '#64748B', bg: '#FFFFFF' },
          ].map(kpi => (
            <View
              key={kpi.label}
              style={{
                flex: 1,
                minWidth: responsive.isPhone ? 70 : 100,
                backgroundColor: kpi.bg,
                paddingVertical: 6,
                paddingHorizontal: 8,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: kpi.color }}>{kpi.count}</Text>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                {kpi.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Airport Station Tabs */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            ['all', lang ? `সকল স্টেশন (${totalStaffCount})` : `All (${totalStaffCount})`],
            ['DAC', lang ? `ঢাকা DAC (${syncedOfficers.filter(s => s.airport === 'DAC').length})` : `Dhaka DAC (${syncedOfficers.filter(s => s.airport === 'DAC').length})`],
            ['CGP', lang ? `চট্টগ্রাম CGP (${syncedOfficers.filter(s => s.airport === 'CGP').length})` : `Chittagong CGP (${syncedOfficers.filter(s => s.airport === 'CGP').length})`],
            ['ZYL', lang ? `সিলেট ZYL (${syncedOfficers.filter(s => s.airport === 'ZYL').length})` : `Sylhet ZYL (${syncedOfficers.filter(s => s.airport === 'ZYL').length})`],
          ].map(([code, label]) => {
            const isSel = dashboardOfficerAirport === code;
            return (
              <TouchableOpacity
                key={code}
                onPress={() => setDashboardOfficerAirport(code)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: isSel ? '#0284C7' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: isSel ? '#0284C7' : '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#475569' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Officer Cards Grid */}
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          {filteredOfficers.map(officer => {
            const isAvail = officer.status === 'available' && officer.active !== false;
            const isInSvc = officer.status === 'in_service' && officer.active !== false;
            const isOffDuty = officer.status === 'off_duty' && officer.active !== false;
            const isDeactivated = officer.active === false;

            const dutyStatusLabel = isDeactivated
              ? (lang ? '🔴 নিষ্ক্রিয়' : '🔴 Deactivated')
              : isAvail
              ? (lang ? '🟢 ডিউটিতে প্রস্তুত' : '🟢 Available')
              : isInSvc
              ? (lang ? '🟡 সেবায় ব্যস্ত' : '🟡 In Service')
              : (lang ? '⚪ অফ-ডিউটি' : '⚪ Off Duty');

            const statusBg = isDeactivated ? '#FEE2E2' : isAvail ? '#ECFDF5' : isInSvc ? '#FEF3C7' : '#F1F5F9';
            const statusColor = isDeactivated ? '#DC2626' : isAvail ? '#059669' : isInSvc ? '#D97706' : '#64748B';

            const officerPoints = calculateOfficerPoints(officer);

            // Active assigned booking for this officer
            const activeBooking = allPlatformBookings.find(b =>
              (b.staffId === officer.id ||
               b.assignedStaffId === officer.id ||
               b.leadStaffId === officer.id ||
               b.supportStaffId === officer.id ||
               b.staff === officer.name ||
               b.leadStaffName === officer.name) &&
              (b.status === 'confirmed' || b.status === 'assigned' || b.status === 'upcoming' || b.status === 'in_progress')
            );

            return (
              <View
                key={officer.id}
                style={{
                  width: responsive.isPhone ? '100%' : (responsive.isTablet ? '48.5%' : '32%'),
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: isDeactivated ? '#FECACA' : (isInSvc ? '#FDE68A' : (isAvail ? '#BBF7D0' : '#E2E8F0')),
                  padding: 12,
                  justifyContent: 'space-between',
                }}
              >
                {/* Officer Header Info */}
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: isAvail ? '#E0F2FE' : (isInSvc ? '#FEF3C7' : '#F1F5F9'),
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: isAvail ? '#10B981' : (isInSvc ? '#F59E0B' : '#CBD5E1'),
                      }}>
                        <Text style={{ fontSize: 18 }}>
                          {officer.role?.includes('VIP') ? '⭐' : officer.role?.includes('Wheelchair') ? '🦽' : '🧑‍✈️'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                          {officer.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '700' }} numberOfLines={1}>
                          {officer.role} • {officer.airport}
                        </Text>
                      </View>
                    </View>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: statusBg }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: statusColor }}>{dutyStatusLabel}</Text>
                    </View>
                  </View>

                  {/* Station, Shift & Contact */}
                  <View style={{ backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginBottom: 8, gap: 3 }}>
                    <Text style={{ fontSize: 11, color: '#475569' }} numberOfLines={1}>
                      📍 {officer.station || `${officer.airport} Terminal`}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                        ⏰ {officer.shift}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (officer.phone) {
                            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                              window.open('tel:' + officer.phone);
                            } else {
                              Linking.openURL('tel:' + officer.phone).catch(() => {});
                            }
                          }
                        }}
                      >
                        <Text style={{ fontSize: 10.5, color: '#0284C7', fontWeight: '700' }}>
                          📞 {officer.phone}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 10-Tier Rank & Points Badge */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setShowProtocolRanksModal(true)}
                      style={{
                        backgroundColor: officerPoints.tierBgColor || '#E0F2FE',
                        paddingHorizontal: 7,
                        paddingVertical: 2.5,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: officerPoints.tierBadgeColor || '#0284C7',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Text style={{ fontSize: 11 }}>{officerPoints.rankIcon || '⭐'}</Text>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: officerPoints.tierBadgeColor || '#0284C7' }}>
                        {lang ? (officerPoints.rank?.shortBn || `র‍্যাংক ${officerPoints.rankLevel}`) : (officerPoints.rank?.shortEn || `Rank ${officerPoints.rankLevel}`)}: {lang ? officerPoints.tierBn : officerPoints.tier}
                      </Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#92400E' }}>
                          🏆 {officerPoints.totalPoints.toLocaleString()} {lang ? 'পয়েন্ট' : 'pts'}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#FEF9C3', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#854D0E' }}>
                          ⭐ {officer.rating || 5.0}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Live Assigned Flight / Duty Box */}
                  <View style={{
                    backgroundColor: activeBooking ? '#EFF6FF' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: activeBooking ? '#93C5FD' : '#E2E8F0',
                    borderRadius: 8,
                    padding: 7,
                    marginBottom: 10,
                  }}>
                    {activeBooking ? (
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E40AF' }} numberOfLines={1}>
                          ✈️ {lang ? 'নির্ধারিত ফ্লাইট:' : 'Flight:'} {activeBooking.flightNo || activeBooking.fno || 'BG-084'} ({activeBooking.service || 'Protocol'})
                        </Text>
                        <Text style={{ fontSize: 10.5, color: '#3B82F6', marginTop: 1 }} numberOfLines={1}>
                          👤 {lang ? 'যাত্রী:' : 'Pax:'} {activeBooking.customer || activeBooking.passengerName || 'Client'} • {activeBooking.status}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 10.5, color: '#059669', fontWeight: '700' }} numberOfLines={1}>
                        ✓ {lang ? 'পরবর্তী ফ্লাইটে বরাদ্দের জন্য প্রস্তুত' : 'Ready for next flight duty'}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Officer Action Buttons */}
                <View style={{
                  flexDirection: 'row',
                  gap: 6,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: '#F1F5F9',
                }}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedOfficerForCard(officer);
                      setShowOfficerIdCardModal(true);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#F0F9FF',
                      borderWidth: 1,
                      borderColor: '#BAE6FD',
                      borderRadius: 6,
                      paddingVertical: 5,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0284C7' }}>
                      🪪 {lang ? 'আইডি ও QR' : 'ID & QR'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedOfficerForProfile(officer);
                      setShowOfficerProfileModal(true);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 6,
                      paddingVertical: 5,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#334155' }}>
                      👤 {lang ? 'প্রোফাইল' : 'Profile'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleToggleStaffDuty(officer.id)}
                    style={{
                      backgroundColor: isAvail ? '#FEF3C7' : (isInSvc ? '#F1F5F9' : '#ECFDF5'),
                      borderWidth: 1,
                      borderColor: isAvail ? '#FDE68A' : (isInSvc ? '#CBD5E1' : '#A7F3D0'),
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: isAvail ? '#D97706' : (isInSvc ? '#64748B' : '#059669') }}>
                      🔄 {lang ? 'ডিউটি' : 'Duty'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };


  const renderRestrictedAccess = (title) => (
    <View style={[s.pagePanel, { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }]}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: '#FECACA' }}>
        <Text style={{ fontSize: 34 }}>🔒</Text>
      </View>
      <Text style={[s.h2, { color: '#991B1B', textAlign: 'center', marginBottom: 8 }]}>
        {lang ? 'এক্সেস সীমাবদ্ধ (শুধুমাত্র সুপার এডমিন)' : 'Restricted Access (Super Admin Only)'}
      </Text>
      <Text style={{ fontSize: 13.5, color: '#64748B', textAlign: 'center', maxWidth: 460, lineHeight: 22, marginBottom: 20 }}>
        {lang
          ? `"${title || 'অর্থনৈতিক বিষয়'}" বিভাগটি শুধুমাত্র সুপার এডমিন অ্যাকাউন্টের জন্য সীমাবদ্ধ। অপারেশনাল ম্যানেজার অ্যাকাউন্টে আর্থিক লেনদেন, পেমেন্ট বা মূল্য নির্ধারণের তথ্য দেখার প্রবেশাধিকার নেই।`
          : `The "${title || 'Financial'}" section is strictly restricted to Super Admin. Operational Managers do not have permission to view or manage financial transactions or pricing.`}
      </Text>
      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#0284C7', paddingHorizontal: 24 }]}
        onPress={() => setManagerSection('dashboard')}
      >
        <Text style={s.btnT}>
          🏠 {lang ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderAdminPage = () => {
    switch (managerSection) {
      case 'tracking':
        return renderLiveTrackingManagement();
      case 'incidents':
        return (
          <AdminIncidentsTab
            bookings={bookings}
            allPlatformBookings={allPlatformBookings}
            staffRoster={staffRoster}
            onUpdateBooking={onUpdateBooking}
            managerSession={managerSession}
            lang={lang}
            s={s}
          />
        );
      case 'security':
        if (!isAdmin) return renderRestrictedAccess(lang ? 'নিরাপত্তা ও অডিট' : 'Security & Audit');
        return renderSecurityManagement();

      case 'customers':
        if (!isAdmin) return renderRestrictedAccess(lang ? 'গ্রাহক তালিকা' : 'Customers Directory');
        return (
          <AdminCustomersTab
            allPlatformBookings={allPlatformBookings}
            bookings={bookings}
            openManagerSection={openManagerSection}
            setBookingSearchQuery={setBookingSearchQuery}
            lang={lang}
            s={s}
          />
        );
      case 'airports':
        if (!isAdmin) return renderRestrictedAccess(lang ? 'বিমানবন্দর ব্যবস্থাপনা' : 'Airport Management');
        return renderAirportsManagement();
      case 'services':
        return renderManagerServices();
      case 'addons':
        return renderManagerAddons();
      case 'workflow':
        return renderBookingWorkflow();
      case 'pricing':
        if (!isAdmin) return renderRestrictedAccess(lang ? 'মূল্য নির্ধারণ' : 'Pricing & Rates');
        return renderPricingManagement();
      case 'placards':
        return (
          <View style={{ width: '100%', padding: 20 }}>
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 28, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' }}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>🏷️</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                {lang ? 'ভিআইপি এয়ারপোর্ট প্লেকার্ড ও নেমবোর্ড মেকার' : 'VIP Airport Placard & Nameboard Portal'}
              </Text>
              <Text style={{ fontSize: 13.5, color: '#64748B', textAlign: 'center', maxWidth: 620, marginBottom: 20 }}>
                {lang
                  ? 'যাত্রীর নাম ও তারিখ ইনপুট দিয়ে মুহূর্তেই ভিআইপি নেমবোর্ড প্লেকার্ড তৈরি, এইচডি ডাউনলোড ও সরাসরি প্রিন্ট করুন। সুপার এডমিন সকল তৈরির হিস্টোরি পর্যবেক্ষণ করতে পারবেন।'
                  : 'Input passenger name and date to generate, download HD image and direct print. Super Admin can inspect complete audit history.'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowMakePlacardModal(true)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#0E2A47',
                  borderWidth: 1.5,
                  borderColor: '#D97706',
                  paddingHorizontal: 22,
                  paddingVertical: 12,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  shadowColor: '#0E2A47',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 18 }}>🏷️</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? 'প্লেকার্ড তৈরি করুন ও হিস্টোরি দেখুন' : 'Make Placard & View History'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'bookings':
        return renderBookingsManagement();
      case 'payments':
        if (!isAdmin && !isManager) return renderRestrictedAccess(lang ? 'পেমেন্ট ও রিফান্ড' : 'Payments & Refunds');
        return renderManagerPayments();
      case 'family':
        return (
          <AdminFlightCareFamilyTab
            managerSession={managerSession}
            lang={lang}
            s={s}
            staffRoster={staffRoster}
            setStaffRoster={setStaffRoster}
          />
        );
      case 'staff':
        return renderStaffManagement();
      case 'contractual':
        return (
          <AdminContractualStaffTab
            managerSession={managerSession}
            lang={lang}
            s={s}
          />
        );
      case 'notifications':
        return (
          <AdminNotificationsTab
            notifications={notifications}
            setNotifications={setNotifications}
            sendNotification={sendNotification}
            managerSession={managerSession}
            lang={lang}
            s={s}
          />
        );
      case 'reports':
        if (!isAdmin) return renderRestrictedAccess(lang ? 'রিপোর্ট' : 'Reports & Analytics');
        return (
          <AdminReportsTab
            allPlatformBookings={allPlatformBookings}
            bookings={bookings}
            staffRoster={staffRoster}
            customerPaymentHistory={customerPaymentHistory}
            isAdmin={isAdmin}
            lang={lang}
            s={s}
          />
        );
      case 'backup':
        if (!isAdmin) return renderRestrictedAccess(lang ? 'ডাটা ব্যাকআপ ও রিস্টোর' : 'Data Backup & Restore');
        return (
          <AdminBackupTab
            bookings={bookings}
            setBookings={setBookings}
            allPlatformBookings={allPlatformBookings}
            setAllPlatformBookings={setAllPlatformBookings}
            staffRoster={staffRoster}
            setStaffRoster={setStaffRoster}
            managedAirports={managedAirports}
            setManagedAirports={setManagedAirports}
            pricingConfig={pricingConfig}
            setPricingConfig={setPricingConfig}
            serviceCatalog={serviceCatalog}
            setServiceCatalog={setServiceCatalog}
            notifications={notifications}
            setNotifications={setNotifications}
            customerPaymentHistory={customerPaymentHistory}
            setCustomerPaymentHistory={setCustomerPaymentHistory}
            managerSession={managerSession}
            lang={lang}
            s={s}
            resetAirports={resetAirports}
            resetPricingConfig={resetPricingConfig}
            resetManagerServicesToDefault={resetManagerServicesToDefault}
          />
        );
      case 'allocation':
        if (!isAdmin) return renderRestrictedAccess(lang ? 'স্টাফ বরাদ্দ' : 'Staff Allocation');
        return (
          <View style={s.pagePanel}>
            <Text style={s.pageTitle}>Staff allocation</Text>
            {managerRulesLoading ? <Text style={s.muted}>{t('rulesPending')}</Text> : null}
            {managerRulesNotice ? <Text style={s.managerNotice}>{managerRulesNotice}</Text> : null}
            {managerRulesError ? <Text style={s.managerError}>{managerRulesError}</Text> : null}
            {managerStaffingRules.length === 0 && !managerRulesLoading && (
              <Text style={s.muted}>{t('noRules')}</Text>
            )}
            {managerStaffingRules.map(rule => (
              <View key={rule.key} style={s.ruleCard}>
                <TextInput
                  style={s.in}
                  value={rule.airport_code}
                  onChangeText={value => updateManagerRule(rule.key, 'airport_code', value)}
                  placeholder={t('ruleAirport')}
                />
                <TextInput
                  style={s.in}
                  value={rule.service_id}
                  onChangeText={value => updateManagerRule(rule.key, 'service_id', value)}
                  placeholder={t('ruleService')}
                />
                <Text style={s.lbl}>{t('ruleCategory')}</Text>
                <View style={s.ruleChoices}>
                  {[
                    ['arrival', t('arr')],
                    ['departure', t('dep')],
                  ].map(([value, label]) => (
                    <TouchableOpacity
                      key={value}
                      style={[s.addonChoice, rule.service_category === value && s.ruleChoiceOn]}
                      onPress={() => updateManagerRule(rule.key, 'service_category', value)}
                    >
                      <Text style={s.body}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={s.in}
                  value={rule.min_passengers}
                  onChangeText={value => updateManagerRule(rule.key, 'min_passengers', value)}
                  keyboardType="number-pad"
                  placeholder={t('ruleMinPassengers')}
                />
                <TextInput
                  style={s.in}
                  value={rule.max_passengers}
                  onChangeText={value => updateManagerRule(rule.key, 'max_passengers', value)}
                  keyboardType="number-pad"
                  placeholder={t('ruleMaxPassengers')}
                />
                <Text style={s.lbl}>{t('ruleAssistance')}</Text>
                <View style={s.ruleChoices}>
                  {[
                    ['any', t('assistanceAny')],
                    ['none', t('assistanceNone')],
                    ['wheelchair', t('assistanceWheelchair')],
                    ['medical', t('assistanceMedical')],
                    ['other', t('assistanceOther')],
                  ].map(([value, label]) => (
                    <TouchableOpacity
                      key={value}
                      style={[s.addonChoice, rule.special_assistance === value && s.ruleChoiceOn]}
                      onPress={() => updateManagerRule(rule.key, 'special_assistance', value)}
                    >
                      <Text style={s.body}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={s.in}
                  value={rule.required_staff}
                  onChangeText={value => updateManagerRule(rule.key, 'required_staff', value)}
                  keyboardType="number-pad"
                  placeholder={t('ruleStaffCount')}
                />
                <TouchableOpacity
                  style={s.destroyButton}
                  onPress={() => removeManagerRule(rule.key)}
                >
                  <Text style={s.destroyButtonText}>{t('removeRule')}</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.btn} onPress={addManagerRule}>
              <Text style={s.btnT}>{t('addRule')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btn2, managerRulesSaving && s.managerDisabled]}
              disabled={managerRulesSaving}
              onPress={saveManagerRules}
            >
              <Text style={[s.btnT, { color: C.ink }]}>
                {managerRulesSaving ? '…' : t('saveRules')}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'dashboard':
      default:
        return (
          <View style={[s.pagePanel, responsive.isPhone && { padding: 10 }]}>
            {/* Notice Banner */}
            {adminNotice ? (
              <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700' }}>✓ {adminNotice}</Text>
                <TouchableOpacity onPress={() => setAdminNotice('')}>
                  <Text style={{ color: '#065F46', fontWeight: '800', fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Dashboard Header & Timeframe Selector */}
            <View style={{
              flexDirection: responsive.isPhone ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: responsive.isPhone ? 'stretch' : 'flex-start',
              gap: 12,
              marginBottom: 16,
              width: '100%',
            }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.pageTitle}>{lang ? 'প্ল্যাটফর্ম অ্যাডমিন ড্যাশবোর্ড' : 'Platform Admin Dashboard'}</Text>
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: -6 }}>
                  {lang
                    ? 'সার্বিক বুকিং, রাজস্ব, প্রোটোকল অফিসার ও কর্মী উপস্থিতির কেন্দ্রীয় নিয়ন্ত্রণ'
                    : 'Centralized control: live booking volume, revenue, protocol officers & staff availability'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', alignSelf: responsive.isPhone ? 'stretch' : 'auto' }}>
                {/* 🏷️ Make Placard Button (User requested position next to Offline Booking) */}
                <TouchableOpacity
                  onPress={() => setShowMakePlacardModal(true)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#0E2A47',
                    borderWidth: 1.5,
                    borderColor: '#D97706',
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    shadowColor: '#0E2A47',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 5,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#FBBF24' }}>🏷️</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                    {lang ? 'প্লেকার্ড তৈরি করুন' : 'Make Placard'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowManualBookingModal(true)}
                  style={{
                    backgroundColor: '#16A34A',
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    shadowColor: '#16A34A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 5,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#FFFFFF' }}>➕</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                    {lang ? 'ম্যানুয়াল বুকিং / অফলাইন এন্ট্রি' : '+ Offline Booking'}
                  </Text>
                </TouchableOpacity>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={{
                    flexDirection: 'row',
                    backgroundColor: '#F1F5F9',
                    borderRadius: 10,
                    padding: 3,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    gap: 4,
                    alignSelf: responsive.isPhone ? 'flex-start' : 'auto',
                  }}
                >
                  {[
                    ['all', lang ? 'সর্বমোট' : 'All-Time'],
                    ['today', lang ? 'আজকে' : 'Today'],
                    ['week', lang ? 'এই সপ্তাহ' : 'This Week'],
                    ['month', lang ? 'এই মাস' : 'This Month'],
                  ].map(([tf, label]) => {
                    const active = dashboardTimeframe === tf;
                    return (
                      <TouchableOpacity
                        key={tf}
                        onPress={() => setDashboardTimeframe(tf)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: active ? '#0284C7' : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : '#475569' }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* 9 Required Dashboard Metrics */}
            <View style={s.statsGrid}>
              {adminDashboardMetrics.map(metric => (
                <TouchableOpacity
                  key={metric.id}
                  activeOpacity={0.8}
                  onPress={metric.onPress}
                  style={[
                    s.statCard,
                    responsive.isPhone
                      ? { width: '100%' }
                      : (responsive.isWide ? s.statCardWide : { width: '48.5%' }),
                    { borderColor: metric.borderColor, backgroundColor: '#FFFFFF', cursor: 'pointer' },
                  ]}
                >
                  <View style={s.statCardHeader}>
                    <View style={[s.statIconWrap, { backgroundColor: metric.bgColor }]}>
                      <Text style={{ fontSize: 20 }}>{metric.icon}</Text>
                    </View>
                    <View style={[s.statPill, { backgroundColor: metric.bgColor, borderColor: metric.borderColor }]}>
                      <Text style={[s.statPillText, { color: metric.color }]} numberOfLines={1}>{metric.badge}</Text>
                    </View>
                  </View>
                  <View>
                    <Text style={[s.statValue, { color: metric.color }]}>{metric.value}</Text>
                    <Text style={s.statLabel}>{metric.label}</Text>
                    <Text style={s.statSubtext}>{metric.subtext}</Text>
                  </View>
                  <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: metric.color }}>{metric.actionLabel}</Text>
                    <Text style={{ fontSize: 12, color: metric.color }}>→</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Protocol Officers Fleet Overview & Real-Time Duty Status */}
            {renderDashboardProtocolOfficers()}

            {/* Action Queues: Pending Payments & Refund Requests for Admin & Manager */}
            {(isAdmin || isManager) ? (
              <View style={[s.widgetRow, responsive.isPhone && s.widgetRowCompact, { marginBottom: 20 }]}>
                {/* Pending Payments Queue */}
                <View style={[s.widgetCard, { flex: 1, borderColor: '#FDE68A', borderWidth: 1.5 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>⏳</Text>
                      <Text style={s.widgetTitle}>{lang ? 'পেন্ডিং পেমেন্ট ভেরিফিকেশন' : 'Pending Payments Queue'}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#FEF3C7' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                        {pendingPaymentsList.length} {lang ? 'টি বাকি' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {pendingPaymentsList.length === 0 ? (
                    <View style={{ padding: 18, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10 }}>
                      <Text style={{ color: '#059669', fontWeight: '700', fontSize: 13 }}>
                        ✓ {lang ? 'সব পেমেন্ট যাচাই সম্পন্ন!' : 'All pending payments verified!'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {pendingPaymentsList.map(item => (
                        <View
                          key={item.id}
                          style={{
                            padding: 10,
                            backgroundColor: '#FFFBEB',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#FDE68A',
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{item.bookingId}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#B45309' }}>৳ {item.amount.toLocaleString('en-IN')}</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                            {item.customer} • {item.service}
                          </Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              💳 {item.method} ({item.txId})
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>{item.time}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                            <TouchableOpacity
                              onPress={() => handleApprovePayment(item.id)}
                              style={{
                                flex: 1,
                                paddingVertical: 5,
                                borderRadius: 6,
                                backgroundColor: '#059669',
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                                ✓ {lang ? 'অনুমোদন' : 'Approve'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRejectPayment(item.id)}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 5,
                                borderRadius: 6,
                                backgroundColor: '#FEE2E2',
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ color: '#DC2626', fontSize: 11.5, fontWeight: '700' }}>
                                ✕ {lang ? 'বাতিল' : 'Reject'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Refund Requests Queue */}
                <View style={[s.widgetCard, { flex: 1, borderColor: '#FED7AA', borderWidth: 1.5 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>🔄</Text>
                      <Text style={s.widgetTitle}>{lang ? 'রিফান্ড অনুরোধ ব্যবস্থাপনা' : 'Refund Requests'}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#FFF7ED' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#C2410C' }}>
                        {refundRequestsList.length} {lang ? 'টি আবেদন' : 'Requests'}
                      </Text>
                    </View>
                  </View>

                  {refundRequestsList.length === 0 ? (
                    <View style={{ padding: 18, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10 }}>
                      <Text style={{ color: '#059669', fontWeight: '700', fontSize: 13 }}>
                        ✓ {lang ? 'কোনো অনিষ্পন্ন রিফান্ড অনুরোধ নেই' : 'No pending refund requests!'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {refundRequestsList.map(item => (
                        <View
                          key={item.id}
                          style={{
                            padding: 10,
                            backgroundColor: '#FFF7ED',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#FED7AA',
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{item.bookingId}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#C2410C' }}>৳ {item.amount.toLocaleString('en-IN')}</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                            {item.customer} • 💬 {item.reason}
                          </Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              💳 {item.method}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>{item.date}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                            <TouchableOpacity
                              onPress={() => handleApproveRefund(item.id)}
                              style={{
                                flex: 1,
                                paddingVertical: 5,
                                borderRadius: 6,
                                backgroundColor: '#EA580C',
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                                ✓ {lang ? 'রিফান্ড অনুমোদন' : 'Approve Refund'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRejectRefund(item.id)}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 5,
                                borderRadius: 6,
                                backgroundColor: '#FEE2E2',
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ color: '#DC2626', fontSize: 11.5, fontWeight: '700' }}>
                                ✕ {lang ? 'বাতিল' : 'Decline'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={[s.widgetRow, responsive.isPhone && s.widgetRowCompact, { marginBottom: 20 }]}>
                {/* Pending Staff Allocation Queue */}
                <View style={[s.widgetCard, { flex: 1, borderColor: '#BAE6FD', borderWidth: 1.5 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>🧑‍✈️</Text>
                      <Text style={s.widgetTitle}>{lang ? 'অফিসার বরাদ্দ অপেক্ষমাণ বুকিং' : 'Pending Staff Allocation'}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#E0F2FE' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1' }}>
                        {(bookings || []).filter(b => (!b.staff || b.staff === 'Unassigned' || b.staff === 'None') && b.status !== 'cancelled' && b.status !== 'completed').length} {lang ? 'টি বাকি' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {(bookings || []).filter(b => (!b.staff || b.staff === 'Unassigned' || b.staff === 'None') && b.status !== 'cancelled' && b.status !== 'completed').length === 0 ? (
                    <View style={{ padding: 18, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10 }}>
                      <Text style={{ color: '#059669', fontWeight: '700', fontSize: 13 }}>
                        ✓ {lang ? 'সব ফ্লাইটে প্রোটোকল অফিসার বরাদ্দ করা আছে!' : 'All flights have assigned protocol officers!'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {(bookings || []).filter(b => (!b.staff || b.staff === 'Unassigned' || b.staff === 'None') && b.status !== 'cancelled' && b.status !== 'completed').slice(0, 3).map(item => (
                        <View
                          key={item.id}
                          style={{
                            padding: 10,
                            backgroundColor: '#F0F9FF',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#BAE6FD',
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{item.id} • {item.airport}</Text>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7' }}>{item.fno || 'Flight'}</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                            {item.customer} • {item.package || item.service}
                          </Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              📅 {item.date} {item.time}
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleOpenAssignStaff(item)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                                backgroundColor: '#0284C7',
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                                🧑‍✈️ {lang ? 'অফিসার বরাদ্দ' : 'Assign'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Live Operations & In-Progress Missions */}
                <View style={[s.widgetCard, { flex: 1, borderColor: '#FDE68A', borderWidth: 1.5 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>⚡</Text>
                      <Text style={s.widgetTitle}>{lang ? 'চলমান প্রোটোকল সার্ভিস মিশন' : 'Active Protocol Missions'}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#FEF3C7' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                        {(bookings || []).filter(b => b.status === 'in_progress').length} {lang ? 'টি চলমান' : 'Active'}
                      </Text>
                    </View>
                  </View>

                  {(bookings || []).filter(b => b.status === 'in_progress').length === 0 ? (
                    <View style={{ padding: 18, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10 }}>
                      <Text style={{ color: '#0284C7', fontWeight: '700', fontSize: 13 }}>
                        ℹ️ {lang ? 'এই মুহূর্তে কোনো ফ্লাইট চলমান অবস্থায় নেই।' : 'No active flights currently in progress.'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {(bookings || []).filter(b => b.status === 'in_progress').slice(0, 3).map(item => (
                        <View
                          key={item.id}
                          style={{
                            padding: 10,
                            backgroundColor: '#FFFBEB',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#FDE68A',
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{item.id}</Text>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>● IN PROGRESS</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                            {item.customer} • 🧑‍✈️ {item.staff}
                          </Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              📍 {item.terminal} ({item.airport})
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedBooking(item);
                                setBookingDetailTab('progress');
                                setShowBookingDetailsModal(true);
                              }}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                                backgroundColor: '#D97706',
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                                ⚡ {lang ? 'অগ্রগতি দেখুন' : 'Milestones'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Revenue Financial Breakdown - Admin Only */}
            {isAdmin && (
              <View style={[s.widgetCard, { marginBottom: 20, borderColor: '#A7F3D0', borderWidth: 1.5 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16 }}>💰</Text>
                    <Text style={s.widgetTitle}>{lang ? 'রাজস্ব ও আর্থিক বিবরণী' : 'Revenue & Financial Breakdown'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openManagerSection('payments')}>
                    <Text style={[s.link, { fontSize: 12.5, fontWeight: '700' }]}>{lang ? 'বিস্তারিত পেমেন্ট রিপোর্ট →' : 'Full Payment Report →'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 140, padding: 12, backgroundColor: '#F0FDF4', borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0' }}>
                    <Text style={{ fontSize: 11.5, color: '#047857', fontWeight: '700' }}>{lang ? 'মোট সংগৃহীত রাজস্ব' : 'Gross Platform Inflow'}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#065F46', marginTop: 4 }}>{totalRevenueFormatted}</Text>
                    <Text style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>{lang ? 'সফল বুকিং পেমেন্ট' : 'From confirmed bookings'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 140, padding: 12, backgroundColor: '#FEF3C7', borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A' }}>
                    <Text style={{ fontSize: 11.5, color: '#B45309', fontWeight: '700' }}>{lang ? 'অপেক্ষমাণ ক্লিয়ারেন্স' : 'Pending Inflow'}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#B45309', marginTop: 4 }}>{pendingPaymentsFormatted}</Text>
                    <Text style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>{lang ? 'যাচাই সাপেক্ষে জমা হবে' : 'Awaiting verification'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 140, padding: 12, backgroundColor: '#FFF7ED', borderRadius: 10, borderWidth: 1, borderColor: '#FED7AA' }}>
                    <Text style={{ fontSize: 11.5, color: '#C2410C', fontWeight: '700' }}>{lang ? 'অনুমোদিত রিফান্ড' : 'Processed Refunds'}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#C2410C', marginTop: 4 }}>{processedRefundsFormatted}</Text>
                    <Text style={{ fontSize: 11, color: '#9A3412', marginTop: 2 }}>{lang ? `অনুমোদিত ${processedRefundsCount}টি রিফান্ড` : `${processedRefundsCount} processed refunds`}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 140, padding: 12, backgroundColor: '#F1F5F9', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' }}>
                    <Text style={{ fontSize: 11.5, color: '#475569', fontWeight: '700' }}>{lang ? 'গড় ট্রানজেকশন মান' : 'Average Order Value'}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B', marginTop: 4 }}>{avgOrderValueFormatted}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{lang ? 'প্রতি প্রোটোকল বুকিং' : 'Per passenger booking'}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Real-Time Revenue Visual Bar Chart Widget / Operational Escort Throughput */}
            <View style={[s.widgetCard, { marginBottom: 20, borderColor: '#BAE6FD', borderWidth: 1.5, backgroundColor: '#FFFFFF' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>📊</Text>
                  </View>
                  <View>
                    <Text style={[s.widgetTitle, { color: '#0369A1' }]}>
                      {isAdmin
                        ? (lang ? 'রিয়েল-টাইম রাজস্ব ট্রেন্ড ও চার্ট' : 'Real-time Revenue Graph & Trends')
                        : (lang ? 'ফ্লাইট অপারেশন ও এসকর্ট ভলিউম' : 'Flight Operations & Escort Volume')}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                      {isAdmin
                        ? (lang ? 'সময়কাল ভিত্তিক প্রোটোকল আয়ের বিশ্লেষণ' : 'Time-series revenue analytics & peak volume')
                        : (lang ? 'সময়কাল ভিত্তিক প্রোটোকল ফ্লাইট পরিচালনা ও যাত্রী হ্যান্ডলিং' : 'Time-series escort flight throughput')}
                    </Text>
                  </View>
                </View>
                {/* Timeframe Toggle Buttons */}
                <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 3, gap: 4 }}>
                  <TouchableOpacity
                    onPress={() => setRevenueChartMode('weekly')}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      backgroundColor: revenueChartMode === 'weekly' ? '#0284C7' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: revenueChartMode === 'weekly' ? '#FFFFFF' : '#475569' }}>
                      {lang ? 'সাপ্তাহিক (৭ দিন)' : 'Weekly (7 Days)'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setRevenueChartMode('monthly')}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      backgroundColor: revenueChartMode === 'monthly' ? '#0284C7' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: revenueChartMode === 'monthly' ? '#FFFFFF' : '#475569' }}>
                      {lang ? 'মাসিক (৬ মাস)' : 'Monthly (6 Months)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Chart Visual Container */}
              {(() => {
                const baseRev = Math.max(totalRevenueNumber, 20000);
                const dayWeights = [0.12, 0.15, 0.18, 0.14, 0.16, 0.25, 0.20];
                const dayLabels = lang
                  ? [['শনি', 'শনিবার'], ['রবি', 'রবিবার'], ['সোম', 'সোমবার'], ['মঙ্গল', 'মঙ্গলবার'], ['বুধ', 'বুধবার'], ['বৃহঃ', 'বৃহস্পতিবার'], ['শুক্র', 'শুক্রবার']]
                  : [['Sat', 'Saturday'], ['Sun', 'Sunday'], ['Mon', 'Monday'], ['Tue', 'Tuesday'], ['Wed', 'Wednesday'], ['Thu', 'Thursday'], ['Fri', 'Friday']];
                const weeklyData = dayLabels.map(([label, full], idx) => ({
                  label,
                  full,
                  amount: Math.round(baseRev * (dayWeights[idx] / 1.2)),
                  flightCount: Math.round((dayWeights[idx] / 1.2) * 45) + 3,
                  isPeak: idx === 5,
                }));

                const monthWeights = [0.12, 0.14, 0.16, 0.15, 0.19, 0.24];
                const monthLabels = lang
                  ? [['মে', 'মে ২০২৬'], ['জুন', 'জুন ২০২৬'], ['জুলাই', 'জুলাই ২০২৬'], ['আগস্ট', 'আগস্ট ২০২৬'], ['সেপ্টে', 'সেপ্টেম্বর ২০২৬'], ['অক্টো', 'অক্টোবর ২০২৬']]
                  : [['May', 'May 2026'], ['Jun', 'June 2026'], ['Jul', 'July 2026'], ['Aug', 'August 2026'], ['Sep', 'September 2026'], ['Oct', 'October 2026']];
                const monthlyData = monthLabels.map(([label, full], idx) => ({
                  label,
                  full,
                  amount: Math.round(baseRev * monthWeights[idx] * 4),
                  flightCount: Math.round(monthWeights[idx] * 180) + 12,
                  isPeak: idx === 5,
                }));

                const activeData = revenueChartMode === 'weekly' ? weeklyData : monthlyData;
                const maxAmount = Math.max(...activeData.map(d => d.amount));
                const totalPeriodAmount = activeData.reduce((s, d) => s + d.amount, 0);
                const totalPeriodFlights = activeData.reduce((s, d) => s + d.flightCount, 0);
                const avgPeriodAmount = Math.round(totalPeriodAmount / activeData.length);
                const avgPeriodFlights = Math.round(totalPeriodFlights / activeData.length);
                const peakItem = activeData.find(d => d.isPeak) || activeData[0];

                return (
                  <View>
                    {/* Bar Chart Area */}
                    <View style={{
                      height: 180,
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      paddingTop: 30,
                      paddingBottom: 8,
                      paddingHorizontal: 8,
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}>
                      {activeData.map((item, idx) => {
                        const barPct = Math.max(12, Math.round((item.amount / maxAmount) * 100));
                        const isHighest = item.amount === maxAmount;
                        return (
                          <View key={idx} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                            {/* Amount badge on top of bar */}
                            <Text style={{
                              fontSize: 9.5,
                              fontWeight: isHighest ? '800' : '600',
                              color: isHighest ? '#0284C7' : '#64748B',
                              marginBottom: 4,
                            }}>
                              {isAdmin ? `৳${(item.amount / 1000).toFixed(0)}k` : `${item.flightCount} ${lang ? 'টি' : 'flt'}`}
                            </Text>

                            {/* Bar Pill */}
                            <View style={{
                              width: revenueChartMode === 'weekly' ? 24 : 32,
                              height: `${barPct}%`,
                              borderRadius: 6,
                              backgroundColor: isHighest ? '#0284C7' : '#93C5FD',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              paddingTop: 3,
                            }}>
                              {isHighest && (
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
                              )}
                            </View>

                            {/* Bottom Label */}
                            <Text style={{
                              fontSize: 11,
                              fontWeight: isHighest ? '800' : '600',
                              color: isHighest ? '#0369A1' : '#475569',
                              marginTop: 6,
                            }}>
                              {item.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Chart Insight KPI Row */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                      <View style={{ flex: 1, minWidth: 120, padding: 10, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}>
                        <Text style={{ fontSize: 10.5, color: '#1E40AF', fontWeight: '700' }}>
                          {isAdmin ? (lang ? 'সর্বোচ্চ অর্জিত আয়' : 'Peak Performance') : (lang ? 'সর্বোচ্চ পরিচালিত ফ্লাইট' : 'Peak Operations')}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E3A8A', marginTop: 2 }}>
                          {isAdmin ? `৳ ${peakItem.amount.toLocaleString('en-IN')}` : `${peakItem.flightCount} ${lang ? 'টি ফ্লাইট' : 'Flights'}`}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#2563EB', marginTop: 1 }}>
                          {peakItem.full} (⭐ {lang ? 'পিক ভলিউম' : 'Peak'})
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 120, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
                        <Text style={{ fontSize: 10.5, color: '#15803D', fontWeight: '700' }}>
                          {isAdmin
                            ? (revenueChartMode === 'weekly' ? (lang ? 'দৈনিক গড় আয়' : 'Daily Average') : (lang ? 'মাসিক গড় আয়' : 'Monthly Average'))
                            : (revenueChartMode === 'weekly' ? (lang ? 'দৈনিক গড় ফ্লাইট' : 'Daily Avg Flights') : (lang ? 'মাসিক গড় ফ্লাইট' : 'Monthly Avg Flights'))}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#166534', marginTop: 2 }}>
                          {isAdmin ? `৳ ${avgPeriodAmount.toLocaleString('en-IN')}` : `${avgPeriodFlights} ${lang ? 'টি ফ্লাইট' : 'Flights'}`}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#16A34A', marginTop: 1 }}>
                          {isAdmin ? `${lang ? 'মোট' : 'Total'}: ৳ ${totalPeriodAmount.toLocaleString('en-IN')}` : `${lang ? 'সর্বমোট' : 'Total'}: ${totalPeriodFlights} ${lang ? 'টি মিশন' : 'Missions'}`}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 120, padding: 10, backgroundColor: '#FAF5FF', borderRadius: 8, borderWidth: 1, borderColor: '#E9D5FF' }}>
                        <Text style={{ fontSize: 10.5, color: '#7E22CE', fontWeight: '700' }}>
                          {isAdmin ? (lang ? 'মাসিক প্রবৃদ্ধি ও সাফল্য' : 'Growth & Success Rate') : (lang ? 'অন-টাইম সার্ভিস সমাপ্তি' : 'On-Time Completion')}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#6B21A8', marginTop: 2 }}>
                          {isAdmin ? '+22.4% ↗' : '99.8% ↗'}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#9333EA', marginTop: 1 }}>
                          {isAdmin ? (lang ? '৯৯.১% পেমেন্ট ক্লিয়ারেন্স' : '99.1% Payment Success') : (lang ? '১০০% সফল এসকর্ট ডেলিভারি' : '100% Escort Success')}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* Quick Management Shortcuts */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[s.h3, { fontSize: 15, marginBottom: 10, color: '#0E2A47' }]}>
                {lang ? 'দ্রুত ব্যবস্থাপনা নিয়ন্ত্রণ' : 'Quick Operational Shortcuts'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
              >
                {[
                  { key: 'incidents', label: lang ? 'ইনসিডেন্ট ও হারানো লাগেজ' : 'Incidents & Baggage', icon: '🚨' },
                  ...(isAdmin ? [{ key: 'backup', label: lang ? 'ডাটা ব্যাকআপ ও ইমপোর্ট' : 'Backup & Restore', icon: '💾' }] : []),
                  { key: 'tracking', label: lang ? 'লাইভ রাডার ম্যাপ' : 'Live Radar Map', icon: '📍' },
                  { key: 'bookings', label: lang ? 'বুকিং তালিকা' : 'Manage Bookings', icon: '🎫' },
                  ...(isAdmin || isManager ? [{ key: 'payments', label: lang ? 'পেমেন্ট ও রিফান্ড' : 'Payments & Refunds', icon: '💳' }] : []),
                  ...(isAdmin ? [{ key: 'reports', label: lang ? 'রিপোর্ট ও বিশ্লেষণ' : 'Analytics & Reports', icon: '📊' }] : []),
                  ...(isAdmin ? [{ key: 'security', label: lang ? 'নিরাপত্তা ও অডিট' : 'Security & Audit', icon: '🛡️' }] : []),
                  { key: 'family', label: lang ? 'ফ্লাইট কেয়ার ফ্যামিলি (৪২ জন)' : 'Flight Care Family (42)', icon: '👨‍👩‍👧‍👦' },
                  { key: 'staff', label: lang ? 'স্টাফ পরিচালনা' : 'Staff Availability', icon: '🧑‍✈️' },
                  { key: 'contractual', label: isAdmin ? (lang ? 'কন্ট্রাকচুয়াল এমপ্লয়ি (দৈনিক ১,০০০)' : 'Contractual Staff (৳1k/day)') : (lang ? 'কন্ট্রাকচুয়াল এমপ্লয়ি রোস্টার' : 'Contractual Staff Roster'), icon: '🤝' },
                  { key: 'customers', label: lang ? 'গ্রাহক ডিরেক্টরি' : 'Customer Directory', icon: '👥' },
                  { key: 'notifications', label: lang ? 'নোটিফিকেশন' : 'Notifications', icon: '🔔' },
                  { key: 'services', label: lang ? 'সার্ভিস ক্যাটালগ' : 'Service Catalog', icon: '🧭' },
                  { key: 'addons', label: lang ? 'অতিরিক্ত সেবা' : 'Additional Services', icon: '＋' },
                  { key: 'workflow', label: lang ? 'ওয়ার্কফ্লো' : 'Workflow Stages', icon: '↗' },
                ].map(action => (

                  <TouchableOpacity
                    key={action.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      gap: 8,
                    }}
                    onPress={() => openManagerSection(action.key)}
                  >
                    <Text style={{ fontSize: 16 }}>{action.icon}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0E2A47' }}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Data Tables */}
            <View style={[s.widgetRow, responsive.isPhone && s.widgetRowCompact]}>
              <View style={[s.widgetCard, { flex: 1.2 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={s.widgetTitle}>{lang ? 'সাম্প্রতিক বুকিং' : 'Recent Bookings'}</Text>
                  <TouchableOpacity onPress={() => openManagerSection('bookings')}>
                    <Text style={[s.link, { fontSize: 12.5, fontWeight: '700' }]}>{lang ? 'সব দেখুন →' : 'View all →'}</Text>
                  </TouchableOpacity>
                </View>
                {renderTable(isAdmin ? ['ID', 'Customer', 'Service', 'Amount', 'Status'] : ['ID', 'Customer', 'Service', 'Hub', 'Status'], bookingRows)}
              </View>

              <View style={[s.widgetCard, { flex: 1 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={s.widgetTitle}>{lang ? 'সক্রিয় অন-ডিউটি স্টাফ' : 'Staff on Duty'}</Text>
                  <TouchableOpacity onPress={() => openManagerSection('staff')}>
                    <Text style={[s.link, { fontSize: 12.5, fontWeight: '700' }]}>{lang ? 'সব দেখুন →' : 'View all →'}</Text>
                  </TouchableOpacity>
                </View>
                {renderTable(['Name', 'Role', 'Station', 'Status'], staffRows)}
              </View>
            </View>

            {/* Operational Alerts */}
            <View style={[s.widgetCard, { marginTop: 16 }]}>
              <Text style={s.widgetTitle}>{lang ? 'অপারেশনাল নোটিস ও অ্যালার্ট' : 'Operational Alerts'}</Text>
              {alertRows.map((alert, index) => (
                <View key={index} style={s.alertItem}>
                  <Text style={s.alertText}>⚡ {alert[0]}</Text>
                  <Text style={s.alertMeta}>{alert[1]}</Text>
                </View>
              ))}
            </View>
          </View>
        );
    }
  };

  if (!managerSession?.user || (managerSession.user.role !== 'manager' && managerSession.user.role !== 'admin')) {
    return renderManagerLoginForm();
  }

  return (
    <ScrollView
      style={{ flex: 1, width: '100%' }}
      contentContainerStyle={[
        s.panelContent,
        { padding: pagePadding, paddingBottom: 60, flexGrow: 1 },
      ]}
    >
      {/* Responsive Manager Header */}
      {responsive.isPhone ? (
        <View style={{ marginBottom: 14 }}>
          {/* Mobile Top Navigation & Logout Bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <TouchableOpacity
              style={[s.screenBackButton, { marginBottom: 0 }]}
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              onPress={handleBack}
            >
              <Text style={s.screenBackText}>
                {managerSection === 'dashboard' ? (lang ? '‹ হোম' : '‹ Back') : (lang ? '‹ ড্যাশবোর্ড' : '‹ Dashboard')}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Dual-Vault Quick Access (Mobile Header: stealth faint text) */}
              {isMasterVaultActive ? (
                <TouchableOpacity
                  onPress={handleVaultAccessClick}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: '#FFF1F2',
                    borderWidth: 1.5,
                    borderColor: '#FECDD3',
                  }}
                >
                  <Text style={{ fontSize: 12 }}>🔐</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#BE123C' }}>
                    DB-2
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleVaultAccessClick}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 4,
                    paddingVertical: 4,
                    backgroundColor: 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '500',
                      color: '#94A3B8',
                    }}
                  >
                    db
                  </Text>
                </TouchableOpacity>
              )}

              {/* Top Prominent Notification Bell Button (Mobile Dashboard Header) */}
              {(() => {
                const unreadNotifs = (notifications || []).filter(n => !n.read).length;
                return (
                  <TouchableOpacity
                    onPress={() => setManagerSection('notifications')}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={lang ? 'নোটিফিকেশন সেন্টার' : 'Notification Center'}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 11,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: managerSection === 'notifications' ? '#0F172A' : (unreadNotifs > 0 ? '#EFF6FF' : '#FFFFFF'),
                      borderWidth: 1.5,
                      borderColor: managerSection === 'notifications' ? '#0F172A' : (unreadNotifs > 0 ? '#38BDF8' : '#CBD5E1'),
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06,
                      shadowRadius: 2,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>🔔</Text>
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '800',
                        color: managerSection === 'notifications' ? '#FFFFFF' : (unreadNotifs > 0 ? '#0284C7' : '#334155'),
                      }}
                    >
                      {lang ? 'নোটিফিকেশন' : 'Alerts'}
                    </Text>
                    {unreadNotifs > 0 && (
                      <View
                        style={{
                          backgroundColor: '#EF4444',
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                          borderRadius: 8,
                          minWidth: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '900' }}>
                          {unreadNotifs > 99 ? '99+' : unreadNotifs}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })()}

              <TouchableOpacity
                onPress={async () => {
                  await managerLogout(managerSession.token);
                  setManagerSession(null);
                  setManagerSection('dashboard');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: '#FEF2F2',
                  borderWidth: 1,
                  borderColor: '#FECACA',
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 13 }}>🚪</Text>
                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>
                  {t('signOut')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Mobile Manager Profile Info Box */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            padding: 12,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: isAdmin ? '#FDE68A' : '#BAE6FD',
            gap: 12,
          }}>
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: 42, height: 42, resizeMode: 'contain' }}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  {managerSession?.user?.name || (isAdmin ? 'Flight Care Admin' : 'Sohel Tanvir')}
                </Text>
                <View style={{ backgroundColor: isAdmin ? '#FEF3C7' : '#E0F2FE', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: isAdmin ? '#FDE68A' : '#BAE6FD' }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: isAdmin ? '#B45309' : '#0284C7' }}>
                    {isAdmin ? '👑 SUPER ADMIN' : '🛡️ OPERATIONS MANAGER'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 11.5, color: '#64748B' }} numberOfLines={1}>
                  {isAdmin ? '👑 ' : '🛡️ '}{managerSession?.user?.email || (isAdmin ? 'admin@flightcare.com' : 'soheltanvir.th@gmail.com')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 10 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' }} />
                  <Text style={{ fontSize: 10, color: '#166534', fontWeight: '800' }}>
                    🔥 Firebase Live
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={s.managerHeader}>
          <TouchableOpacity
            style={s.screenBackButton}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            onPress={handleBack}
          >
            <Text style={s.screenBackText}>
              {managerSection === 'dashboard' ? t('back') : '‹ Dashboard'}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity activeOpacity={0.85} onPress={handleVaultAccessClick}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 36, height: 36, resizeMode: 'contain' }}
              />
            </TouchableOpacity>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[s.h2, { marginBottom: 0 }]}>
                  {managerSession?.user?.name || (isAdmin ? 'Flight Care Admin' : 'Sohel Tanvir')}
                </Text>
                <View style={{ backgroundColor: isAdmin ? '#FEF3C7' : '#E0F2FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: isAdmin ? '#FDE68A' : '#BAE6FD' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isAdmin ? '#B45309' : '#0284C7' }}>
                    {isAdmin ? '👑 SUPER ADMIN (সর্বময় ক্ষমতা ও আর্থিক নিয়ন্ত্রণ)' : '🛡️ OPERATIONS MANAGER (অর্থনৈতিক বিষয় ব্যতীত)'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: isAdmin ? '#B45309' : '#0284C7', fontWeight: '700', marginTop: 2 }}>
                {isAdmin ? '👑 ' : '🛡️ '}{managerSession?.user?.email || (isAdmin ? 'admin@flightcare.com' : 'soheltanvir.th@gmail.com')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                <Text style={{ fontSize: 10.5, color: '#059669', fontWeight: '800' }}>
                  🔥 Firebase: flightcare-db2eb (Live Synced)
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Dual-Vault Quick Access (Stealth faint text: 10-clicks to trigger Database 2) */}
            {isMasterVaultActive ? (
              <TouchableOpacity
                onPress={handleVaultAccessClick}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={lang ? 'ডাটাবেজ ভল্ট মোড' : 'Database Vault'}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: '#FFF1F2',
                  borderWidth: 1.5,
                  borderColor: '#FECDD3',
                }}
              >
                <Text style={{ fontSize: 13 }}>🔐</Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: '#BE123C',
                  }}
                >
                  {lang ? 'মাস্টার ভল্ট (DB-2)' : 'Master Vault (DB-2)'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleVaultAccessClick}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  backgroundColor: 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: '#94A3B8',
                    letterSpacing: 0.5,
                  }}
                >
                  db
                </Text>
              </TouchableOpacity>
            )}

            {/* Top Prominent Notification Bell Button (Desktop Dashboard Header) */}
            {(() => {
              const unreadNotifs = (notifications || []).filter(n => !n.read).length;
              return (
                <TouchableOpacity
                  onPress={() => setManagerSection('notifications')}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={lang ? 'নোটিফিকেশন সেন্টার' : 'Notification Center'}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 13,
                    paddingVertical: 8,
                    borderRadius: 9,
                    backgroundColor: managerSection === 'notifications' ? '#0F172A' : (unreadNotifs > 0 ? '#EFF6FF' : '#F8FAFC'),
                    borderWidth: 1.5,
                    borderColor: managerSection === 'notifications' ? '#0F172A' : (unreadNotifs > 0 ? '#38BDF8' : '#CBD5E1'),
                    cursor: 'pointer',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 3,
                  }}
                >
                  <Text style={{ fontSize: 15 }}>🔔</Text>
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '800',
                      color: managerSection === 'notifications' ? '#FFFFFF' : (unreadNotifs > 0 ? '#0284C7' : '#334155'),
                    }}
                  >
                    {lang ? 'নোটিফিকেশন' : 'Alerts'}
                  </Text>
                  {unreadNotifs > 0 && (
                    <View
                      style={{
                        backgroundColor: '#EF4444',
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        borderRadius: 10,
                        minWidth: 19,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '900' }}>
                        {unreadNotifs > 99 ? '99+' : unreadNotifs}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })()}

            <TouchableOpacity
              onPress={async () => {
                await managerLogout(managerSession.token);
                setManagerSession(null);
                setManagerSection('dashboard');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 13 }}>🚪</Text>
              <Text style={{ color: '#DC2626', fontSize: 12.5, fontWeight: '700' }}>
                {t('signOut')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Navigation Shell */}
      <View style={[s.adminShell, responsive.isPhone && s.adminShellCompact]}>
        {responsive.isPhone ? (
          <View style={{ width: '100%', marginBottom: 10 }}>
            {/* Quick Section Switcher Pill */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 2 }}>
              <TouchableOpacity
                onPress={() => setShowSectionPickerModal(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#E0F2FE',
                  borderWidth: 1,
                  borderColor: '#BAE6FD',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0369A1' }}>
                  {adminSidebarItems.find(i => i.key === managerSection)?.icon} {adminSidebarItems.find(i => i.key === managerSection)?.label || 'Sections'} ▾
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600' }}>
                {lang ? 'ডানে স্ক্রল করুন →' : 'Scroll right →'}
              </Text>
            </View>

            {/* Horizontal Tabs Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.sidebarScroll}
              contentContainerStyle={s.sidebarCompact}
            >
              {adminSidebarItems.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    s.sideItem,
                    s.sideItemCompact,
                    managerSection === item.key && s.sideItemActive,
                  ]}
                  onPress={() => openManagerSection(item.key)}
                >
                  <Text style={s.sideItemIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      s.sideItemText,
                      managerSection === item.key && s.sideItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={s.sidebar}>
            {adminSidebarItems.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[s.sideItem, managerSection === item.key && s.sideItemActive]}
                onPress={() => openManagerSection(item.key)}
              >
                <Text style={s.sideItemIcon}>{item.icon}</Text>
                <Text
                  style={[
                    s.sideItemText,
                    managerSection === item.key && s.sideItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={s.contentArea}>{renderAdminPage()}</View>
      </View>

      {/* Mobile Section Picker Grid Modal */}
      <Modal
        visible={showSectionPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSectionPickerModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSectionPickerModal(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 18,
              width: '100%',
              maxWidth: 440,
              maxHeight: '85%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>📋</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'ম্যানেজার সেকশন নির্বাচন করুন' : 'Select Manager Section'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSectionPickerModal(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {adminSidebarItems.map(item => {
                  const isCurrent = managerSection === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => {
                        setShowSectionPickerModal(false);
                        openManagerSection(item.key);
                      }}
                      style={{
                        width: '48.5%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: isCurrent ? '#E0F2FE' : '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: isCurrent ? '#0284C7' : '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                      <Text style={{ fontSize: 12.5, fontWeight: isCurrent ? '800' : '600', color: isCurrent ? '#0369A1' : '#334155', flex: 1 }} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Protocol Officer Public Verification Profile & Reviews Modal */}
      <OfficerProfileModal
        visible={showOfficerProfileModal}
        initialOfficer={selectedOfficerForProfile}
        officerId={selectedOfficerForProfile?.id}
        lang={lang}
        onClose={() => setShowOfficerProfileModal(false)}
        onBookOfficer={(off) => {
          setShowOfficerProfileModal(false);
          Alert.alert(
            lang ? 'বুকিংয়ে নির্বাচন' : 'Officer Selected',
            lang
              ? `${off.name}-কে বুকিংয়ে অ্যাসাইন করার জন্য প্রস্তুত রাখা হয়েছে।`
              : `${off.name} is ready for booking assignment.`
          );
        }}
      />

      {/* Officer ID Card with Scannable QR Code Modal */}
      <OfficerIdCardModal
        visible={showOfficerIdCardModal}
        officer={selectedOfficerForCard}
        lang={lang}
        onClose={() => setShowOfficerIdCardModal(false)}
        onViewWebProfile={(off) => {
          setSelectedOfficerForProfile(off);
          setShowOfficerProfileModal(true);
        }}
      />

      {/* 10-Tier Protocol Officer Ranks Modal */}
      <ProtocolRanksModal
        visible={showProtocolRanksModal}
        onClose={() => setShowProtocolRanksModal(false)}
        lang={lang}
      />

      {/* Live Tracking Radar Modal for Management */}
      {managerTrackingBooking ? (
        <LiveTrackingModal
          visible={!!managerTrackingBooking}
          onClose={() => setManagerTrackingBooking(null)}
          booking={managerTrackingBooking}
          mode="manager"
          lang={lang}
        />
      ) : null}

      {/* Offline Walk-in / Manual Booking Registration Modal */}
      <AdminManualBookingModal
        visible={showManualBookingModal}
        onClose={() => setShowManualBookingModal(false)}
        onSaveBooking={handleSaveManualOfflineBooking}
        staffRoster={staffRoster}
        managedAirports={managedAirports}
        isAdmin={isAdmin}
        managerSession={managerSession}
        lang={lang}
      />

      {/* Universal Booking Invoice / Cash Memo Modal */}
      <BookingInvoiceModal
        visible={!!invoiceModalBooking}
        onClose={() => setInvoiceModalBooking(null)}
        booking={invoiceModalBooking}
        lang={lang}
      />

      {/* Universal VIP Greeter Placard Modal */}
      <VipPlacardModal
        visible={!!placardModalBooking}
        onClose={() => setPlacardModalBooking(null)}
        booking={placardModalBooking}
        lang={lang}
      />
    
      {/* Dual Vault PIN Controller Modal */}
      {/* Make Placard & Super Admin History Modal */}
      <MakePlacardModal
        visible={showMakePlacardModal}
        onClose={() => {
          setShowMakePlacardModal(false);
          getPlacardHistory().then(list => setPlacardHistoryList(list || [])).catch(() => {});
        }}
        managerSession={managerSession}
        isAdmin={isAdmin}
        lang={lang}
      />

      <DualVaultPinModal
        visible={showDualVaultModal}
        onClose={() => setShowDualVaultModal(false)}
        isUnlocked={isMasterVaultActive}
        onVaultStateChanged={(unlocked) => {
          setIsMasterVaultActive(unlocked);
          getShowcaseBookingIds().then(ids => setShowcaseBookingIds(ids || []));
        }}
        lang={lang}
      />
    </ScrollView>
  );
}


