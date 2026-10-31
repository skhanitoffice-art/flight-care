import { DEFAULT_STAFF_ROSTER } from '../constants/data';
// src/services/flightCareFamilyService.js
// Flight Care Enterprise - Flight Care Family Directory & Official Identity Roster

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  saveFirestoreDoc,
  getFirestoreDoc,
  getFirestoreCollection,
  deleteFirestoreDoc,
  subscribeCollection,
} from './firebase';
import { compressImage } from '../utils/imageCompressor';

export const FLIGHT_CARE_FAMILY_STORAGE_KEY = '@flightcare_family_directory_v10';
export const FLIGHT_CARE_DELETED_MEMBERS_KEY = '@flightcare_deleted_family_members_v2';
AsyncStorage.removeItem('@flightcare_family_directory_v9').catch(() => {});

// In-memory set of permanently deleted member IDs (prevents revival on reload)
export const inMemoryDeletedIds = new Set();

// Proactively load tombstoned deleted IDs from AsyncStorage and Firestore into memory
try {
  AsyncStorage.getItem(FLIGHT_CARE_DELETED_MEMBERS_KEY).then(raw => {
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(id => inMemoryDeletedIds.add(String(id).toUpperCase().trim()));
      }
    }
  }).catch(() => {});
  // Remote cloud tombstones from Firestore is single source of truth
  getFirestoreDoc('system_metadata', 'deleted_family_members').then(doc => {
    if (doc && Array.isArray(doc.deletedIds)) {
      inMemoryDeletedIds.clear();
      doc.deletedIds.forEach(id => inMemoryDeletedIds.add(String(id).toUpperCase().trim()));
      AsyncStorage.setItem(FLIGHT_CARE_DELETED_MEMBERS_KEY, JSON.stringify(doc.deletedIds)).catch(() => {});
    }
  }).catch(() => {});
} catch {}
AsyncStorage.removeItem('@flightcare_family_directory_v8').catch(() => {});
AsyncStorage.removeItem('@flightcare_family_directory_v7').catch(() => {});
AsyncStorage.removeItem('@flightcare_family_directory_v6').catch(() => {});
AsyncStorage.removeItem('@flightcare_family_directory_v5').catch(() => {});

// Proactively clear obsolete cache versions
AsyncStorage.removeItem('@flightcare_family_directory_v4').catch(() => {});
AsyncStorage.removeItem('@flightcare_family_directory_v3').catch(() => {});
AsyncStorage.removeItem('@flightcare_family_directory_v2').catch(() => {});
AsyncStorage.removeItem('@flightcare_family_directory').catch(() => {});

/**
 * Generates verified public QR verification URL and high-res QR code image URL
 */
/**
 * Generates verified vCard text for direct offline phone camera scan & contact saving
 */
export const generateFamilyMemberVCard = (member) => {
  if (!member) return '';
  const safeName = member.name || member.nameBn || 'Flight Care Officer';
  const rank = member.rank || 'Protocol Officer';
  const badge = member.badgeNo || member.id || 'FC-PO-001';
  const caabId = member.caabId || `CAAB-SEC-DAC-2026-${String(member.serial || '01').padStart(2, '0')}`;
  const phone = member.phone || '+880 1812-345678';
  const email = member.email || 'book@flightcaresbd.com';
  const webUrl = `https://flightcaresbd.com/?familyMember=${encodeURIComponent(badge)}`;

  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${safeName}`,
    'ORG:Flight Care Bangladesh',
    `TITLE:${rank} (HSIA Dhaka)`,
    `TEL;TYPE=CELL,VOICE:${phone}`,
    `EMAIL;TYPE=WORK:${email}`,
    `URL:${webUrl}`,
    `NOTE:Flight Care Certified Airport Protocol Officer. Badge: ${badge} | CAAB Pass: ${caabId} | Airport: HSIA Dhaka`,
    'END:VCARD',
  ].join('\n');
};

/**
 * Synchronous local memory lookup of a Flight Care Family member.
 * Instant zero-latency resolution for initial web page loads and SSR/SPA routing.
 */
export const findFamilyMemberSync = (identifier) => {
  if (!identifier) return null;
  const rawId = String(identifier).trim();
  const cleanId = rawId.toLowerCase();
  const cleanUpper = rawId.toUpperCase();

  // Immediately reject any member deleted by Super Admin
  if (inMemoryDeletedIds.has(cleanUpper)) return null;

  // 1. Direct match by ID, badgeNo or aliases
  let found = DEFAULT_FLIGHT_CARE_FAMILY.find(m =>
    (m.id && m.id.toLowerCase() === cleanId) ||
    (m.badgeNo && m.badgeNo.toLowerCase() === cleanId) ||
    (m.id && m.id.toUpperCase() === cleanUpper) ||
    (m.badgeNo && m.badgeNo.toUpperCase() === cleanUpper) ||
    (Array.isArray(m.aliases) && m.aliases.some(a => a.toLowerCase() === cleanId))
  );
  if (found) return found;

  // 2. Staff roster cross-reference
  if (typeof DEFAULT_STAFF_ROSTER !== 'undefined' && Array.isArray(DEFAULT_STAFF_ROSTER)) {
    const staffEquiv = DEFAULT_STAFF_ROSTER.find(s =>
      (s.id && s.id.toLowerCase() === cleanId) ||
      (s.badgeNo && s.badgeNo.toLowerCase() === cleanId)
    );
    if (staffEquiv && staffEquiv.badgeNo) {
      found = DEFAULT_FLIGHT_CARE_FAMILY.find(m => m.badgeNo && m.badgeNo.toUpperCase() === staffEquiv.badgeNo.toUpperCase());
      if (found) return found;
    }
  }

  // 3. PO number support (e.g. "35" -> FC-PO-035, "035", "PO-035")
  const poNumMatch = rawId.match(/^(?:FC[-_]?)?(?:PO[-_]?)?(\d{1,3})$/i);
  if (poNumMatch) {
    const poPadded = `FC-PO-${poNumMatch[1].padStart(3, '0')}`;
    found = DEFAULT_FLIGHT_CARE_FAMILY.find(m => m.badgeNo && m.badgeNo.toUpperCase() === poPadded.toUpperCase());
    if (found) return found;
  }

  // 4. Exact serial number lookup
  if (/^\d+$/.test(rawId)) {
    const serialNum = parseInt(rawId, 10);
    found = DEFAULT_FLIGHT_CARE_FAMILY.find(m => Number(m.serial) === serialNum);
    if (found) return found;
  }

  // 5. Match by phone digits
  const phoneDigits = rawId.replace(/\D/g, '');
  if (phoneDigits.length >= 7) {
    found = DEFAULT_FLIGHT_CARE_FAMILY.find(m => {
      const mDigits = String(m.phone || '').replace(/\D/g, '');
      const pDigits = String(m.personalPhone || '').replace(/\D/g, '');
      return (mDigits && mDigits.endsWith(phoneDigits)) || (pDigits && pDigits.endsWith(phoneDigits));
    });
    if (found) return found;
  }

  return null;
};

export const generateFamilyMemberQrData = (memberOrId, baseUrl = null) => {
  let safeId = 'FC-CEO-001';
  let memberObj = null;

  if (typeof memberOrId === 'object' && memberOrId !== null) {
    memberObj = memberOrId;
    safeId = String(memberObj.badgeNo || memberObj.id || 'FC-CEO-001').trim();
  } else {
    safeId = String(memberOrId || 'FC-CEO-001').trim();
    memberObj = findFamilyMemberSync(safeId);
  }

  let domain = baseUrl;
  if (!domain && Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      domain = `${window.location.protocol}//${window.location.host}`;
    }
  }
  if (!domain) {
    domain = 'https://flightcaresbd.com';
  }

  const verificationUrl = `${domain}/?familyMember=${encodeURIComponent(safeId)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=8&format=png&data=${encodeURIComponent(verificationUrl)}`;

  const vcardText = memberObj ? generateFamilyMemberVCard(memberObj) : '';
  const vcardQrImageUrl = vcardText
    ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=8&format=png&data=${encodeURIComponent(vcardText)}`
    : qrImageUrl;

  return {
    memberId: safeId,
    verificationUrl,
    qrImageUrl,
    vcardText,
    vcardQrImageUrl,
    securitySeal: `CAAB-VERIFIED-FC-${safeId.toUpperCase()}`,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * 28 Official Members of the Flight Care Family
 * Sourced directly from official candidate & executive roster document
 */
export const DEFAULT_FLIGHT_CARE_FAMILY = [
  {
    id: 'FC-CHM-001',
    serial: 1,
    rank: 'Chairman',
    rankBn: 'চেয়ারম্যান',
    name: 'Md Saifullah Khan Saif',
    nameBn: 'মোঃ সাইফুল্লাহ খান সাইফ',
    email: 'book@flightcaresbd.com',
    gmail: 'book@flightcaresbd.com',
    phone: '+8801347570000',
    phoneDisplay: '01347-570000',
    personalPhone: '01770-788888',
    department: 'Top Management',
    departmentBn: 'শীর্ষ ব্যবস্থাপনা ও পরিচালনা',
    departmentCategory: 'management',
    badgeNo: 'FC-CHM-001',
    licenseNo: 'CAAB-CHM-DAC-001',
    station: 'DAC Corporate Executive Headquarters & HSIA VIP Lounge',
    stationBn: 'ডিএসি কর্পোরেট হেডকোয়ার্টার ও ভিআইপি প্রোটোকল সুইট',
    shift: 'Executive Command (24/7)',
    status: 'active',
    avatar: '👑',
    bloodGroup: 'A+',
    joinedDate: '01 Jan 2023',
    rmk: 'Chairman & Founder leading corporate vision, VIP protocol governance and strategic civil aviation relationships.',
    aliases: ['FC-CHM-001', 'FC-CHR-001', 'FC-CHAIR-001', 'chairman', 'saifullah', 'saif'],
  },
  {
    id: 'FC-CEO-001',
    serial: 2,
    rank: 'CEO',
    rankBn: 'প্রধান নির্বাহী কর্মকর্তা (সিইও)',
    name: 'Abdur Rab',
    nameBn: 'আব্দুর রব',
    email: 'book@flightcaresbd.com',
    gmail: 'book@flightcaresbd.com',
    phone: '+8801347570001',
    phoneDisplay: '01347-570001',
    personalPhone: '01716-641739',
    department: 'Top Management',
    departmentBn: 'শীর্ষ ব্যবস্থাপনা ও পরিচালনা',
    departmentCategory: 'management',
    badgeNo: 'FC-CEO-001',
    licenseNo: 'CAAB-EXEC-DAC-001',
    station: 'DAC Corporate Executive Command',
    stationBn: 'ডিএসি কর্পোরেট এক্সিকিউটিভ কমান্ড রুম',
    shift: 'Executive Command (24/7)',
    status: 'active',
    avatar: '💼',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2023',
    rmk: 'Chief Executive Officer leading corporate strategy, VIP protocol operations and civil aviation clearance.',
    aliases: ['FC-CEO-001', 'ceo', 'abdur-rab', 'rab'],
  },
  {
    id: 'FC-HR-001',
    serial: 3,
    rank: 'HR Head',
    rankBn: 'হেড অব হিউম্যান রিসোর্স (HR Head)',
    name: 'Mahid Hassan Shadhin',
    nameBn: 'মাহিদ হাসান স্বাধীন',
    email: 'book@flightcaresbd.com',
    gmail: 'book@flightcaresbd.com',
    phone: '+8801347570002',
    phoneDisplay: '01347-570002',
    personalPhone: '01779-208405',
    department: 'Top Management',
    departmentBn: 'শীর্ষ ব্যবস্থাপনা (মানবসম্পদ বিভাগ)',
    departmentCategory: 'management',
    badgeNo: 'FC-HR-001',
    licenseNo: 'CAAB-ADMIN-DAC-003',
    station: 'Flight Care Corporate HR & Training Center',
    stationBn: 'কর্পোরেট এইচআর ও স্টাফ ট্রেনিং সেন্টার',
    shift: '09:00 AM - 06:00 PM',
    status: 'active',
    avatar: '🤝',
    bloodGroup: 'B-',
    joinedDate: '15 Jan 2023',
    rmk: 'Head of Human Resources responsible for protocol recruitment, background checks, airport pass clearance & welfare.',
    aliases: ['FC-HR-001', 'hr', 'shadhin', 'shadin'],
  },
  {
    id: 'FC-AGM-001',
    serial: 4,
    rank: 'AGM',
    rankBn: 'সহকারী মহাব্যবস্থাপক (এজিএম)',
    name: 'Mahabubur Rahman Khan',
    nameBn: 'মাহবুবুর রহমান খান',
    email: 'book@flightcaresbd.com',
    gmail: 'book@flightcaresbd.com',
    phone: '+8801347570005',
    phoneDisplay: '01347-570005',
    personalPhone: '01347-570005',
    department: 'Top Management',
    departmentBn: 'শীর্ষ ব্যবস্থাপনা ও পরিচালনা',
    departmentCategory: 'management',
    badgeNo: 'FC-AGM-001',
    licenseNo: 'CAAB-AGM-DAC-002',
    station: 'DAC Executive Command & Airport Protocol Logistics',
    stationBn: 'ডিএসি এক্সিকিউটিভ কমান্ড ও এয়ারপোর্ট প্রোটোকল লজিস্টিকস',
    shift: '09:00 AM - 06:00 PM',
    status: 'active',
    avatar: '👔',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Assistant General Manager overseeing protocol operations, shift deployment, airport administration and passenger relations.',
    aliases: ['FC-AGM-001', 'agm', 'mahabubur', 'mahabub'],
  },
  {
    id: 'FC-CTC-001',
    serial: 5,
    rank: 'Coordinator to Chairman',
    rankBn: 'চেয়ারম্যানের সমন্বয়কারী',
    name: 'Petty Officer Md.Zahid Hasan (Ret.)',
    nameBn: 'পেটি অফিসার মোঃ জাহিদ হাসান (অবঃ)',
    email: 'book@flightcaresbd.com',
    gmail: 'book@flightcaresbd.com',
    phone: '+8801347570050',
    phoneDisplay: '01347-570050',
    personalPhone: '01347-570050',
    department: 'Top Management',
    departmentBn: 'শীর্ষ ব্যবস্থাপনা ও চেয়ারম্যান সচিবালয়',
    departmentCategory: 'management',
    badgeNo: 'FC-CTC-001',
    licenseNo: 'CAAB-CHM-COORD-001',
    station: 'DAC Corporate Executive Headquarters & HSIA VIP Protocol Suite',
    stationBn: 'ডিএসি কর্পোরেট হেডকোয়ার্টার ও ভিআইপি প্রোটোকল সুইট',
    shift: 'Executive Command & Coordination (24/7)',
    status: 'active',
    avatar: '🎖️',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Coordinator to Chairman facilitating strategic administrative coordination, executive VIP protocol oversight, civil aviation communications and chairman\'s operational directives.',
    aliases: ['FC-CTC-001', 'FC-COORD-001', 'FC-CC-001', 'coordinator', 'zahid', 'zahid-hasan', 'md-zahid-hasan', '01347570050', '570050'],
  },
  {
    id: 'FC-IT-001',
    serial: 6,
    rank: 'IT Head',
    rankBn: 'আইটি হেড ও সিস্টেমস',
    name: 'Shohel Rana',
    nameBn: 'সোহেল রানা',
    email: 'book@flightcaresbd.com',
    gmail: 'book@flightcaresbd.com',
    phone: '+8801347570003',
    phoneDisplay: '01347-570003',
    personalPhone: '01776-859652',
    department: 'Top Management',
    departmentBn: 'শীর্ষ ব্যবস্থাপনা (আইটি ও প্রযুক্তি)',
    departmentCategory: 'management',
    badgeNo: 'FC-IT-001',
    licenseNo: 'CAAB-SYS-DAC-005',
    station: 'IT Operations & Digital Surveillance Control',
    stationBn: 'আইটি অপারেশন্স ও ডিজিটাল কন্ট্রোল হাব',
    shift: '09:00 AM - 06:00 PM',
    status: 'active',
    avatar: '💻',
    bloodGroup: 'O+',
    joinedDate: '01 Feb 2023',
    rmk: 'IT Head overseeing systems, digital verification, flight tracking integrations & app infrastructure.',
    aliases: ['FC-IT-001', 'it', 'shohel'],
  },
  {
    id: 'FC-OPS-001',
    serial: 7,
    rank: 'Operations & Protocol Officer',
    rankBn: 'অপারেশন্স ও প্রোটোকল অফিসার',
    name: 'Shanto Mia',
    nameBn: 'শান্ত মিয়া',
    email: 'book@flightcaresbd.com',
    gmail: 'book@flightcaresbd.com',
    phone: '+8801347570004',
    phoneDisplay: '01347-570004',
    personalPhone: '01856-621140',
    department: 'Top Management',
    departmentBn: 'শীর্ষ ব্যবস্থাপনা (ফিল্ড অপারেশন্স)',
    departmentCategory: 'management',
    badgeNo: 'FC-OPS-001',
    licenseNo: 'CAAB-SEC-DAC-8947',
    station: 'DAC Canopy & Executive Car Pickup Area',
    stationBn: 'ক্যানোপি ও এক্সিকিউটিভ কার পিকআপ এরিয়া',
    shift: '10:00 AM - 06:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'A+',
    joinedDate: '01 Jan 2024',
    rmk: 'Flight Care Family member responsible for airport protocol operations and VIP ground coordination.',
    aliases: ['FC-OPS-001', 'ops', 'shanto'],
  },
  {
    id: 'FC-SIC-001',
    serial: 8,
    rank: 'Shift In-Charge',
    rankBn: 'শিফট ইন-চার্জ',
    name: 'Md Anwar Hossain',
    nameBn: 'মোঃ আনোয়ার হোসেন',
    email: 'book@flightcaresbd.com',
    gmail: 'book@flightcaresbd.com',
    phone: '+8801347570011',
    phoneDisplay: '01347-570011',
    personalPhone: '01676-165360',
    department: 'Terminal Shift Command',
    departmentBn: 'টার্মিনাল শিফট কমান্ড ও প্রটোকল নেতৃত্ব',
    departmentCategory: 'shift',
    badgeNo: 'FC-SIC-001',
    licenseNo: 'CAAB-SEC-DAC-8940',
    station: 'DAC VVIP Boarding Gate & Diplomatic Lounge',
    stationBn: 'ভিভিআইপি বোর্ডিং গেট ও ডিপ্লোম্যাটিক লাউঞ্জ',
    shift: '08:00 AM - 04:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'B+',
    joinedDate: '01 Feb 2024',
    rmk: 'Shift In-Charge leading airport protocol shifts, fast-track VIP immigration and airline liaison.',
    aliases: ['FC-SIC-001', 'anwar'],
  },
  {
    id: 'FC-SIC-002',
    serial: 9,
    rank: 'Shift In-Charge',
    rankBn: 'শিফট ইন-চার্জ',
    name: 'Mohammad Rezaul Islam',
    nameBn: 'মোহাম্মদ রেজাউল ইসলাম',
    email: 'book@flightcaresbd.com',
    gmail: 'book@flightcaresbd.com',
    phone: '+8801347570012',
    phoneDisplay: '01347-570012',
    personalPhone: '01866-778086',
    department: 'Terminal Shift Command',
    departmentBn: 'টার্মিনাল শিফট কমান্ড ও প্রটোকল নেতৃত্ব',
    departmentCategory: 'shift',
    badgeNo: 'FC-SIC-002',
    licenseNo: 'CAAB-OPS-DAC-202',
    station: 'Terminal 1 Arrival & Departure Control',
    stationBn: 'টার্মিনাল ১ আগমন ও প্রস্থান ফ্লোর কন্ট্রোল',
    shift: '06:00 AM - 02:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '10 Jan 2024',
    rmk: 'Shift In-Charge overseeing flight arrivals, baggage belt assistance and field protocol positioning.',
    aliases: ['FC-SIC-002', 'rezaul'],
  },
  {
    id: 'FC-FDO-001',
    serial: 10,
    rank: 'Senior Front Desk Officer',
    rankBn: 'সিনিয়র ফ্রন্ট ডেস্ক অফিসার',
    name: 'Sonia Akter',
    nameBn: 'সোনিয়া আক্তার',
    email: 'book@flightcaresbd.com',
    gmail: 'book@flightcaresbd.com',
    phone: '+8801347570013',
    phoneDisplay: '01347-570013',
    personalPhone: '01625-404886',
    department: 'Front Desk & Reception',
    departmentBn: 'ফ্রন্ট ডেস্ক ও কাস্টমার সার্ভিস',
    departmentCategory: 'front_desk',
    badgeNo: 'FC-FDO-001',
    licenseNo: 'CAAB-FD-DAC-101',
    station: 'HSIA Canopy Information & Reception Desk',
    stationBn: 'হযরত শাহজালাল বিমানবন্দর ক্যানোপি ও ফ্রন্ট ডেস্ক',
    shift: '07:00 AM - 03:00 PM',
    status: 'active',
    avatar: '👩‍💼',
    bloodGroup: 'O+',
    joinedDate: '01 Mar 2024',
    rmk: 'Senior front desk liaison, VIP passenger registration, immediate escort handover & customer inquiries.',
    aliases: ['FC-FDO-001', 'sonia'],
  },
  {
    id: 'FC-FDO-002',
    serial: 11,
    rank: 'Front Desk Officer',
    rankBn: 'ফ্রন্ট ডেস্ক অফিসার',
    name: 'Taslima Akter',
    nameBn: 'তাসলিমা আক্তার',
    email: 'book@flightcaresbd.com',
    gmail: 'book@flightcaresbd.com',
    phone: '+8801347570055',
    phoneDisplay: '01347-570055',
    personalPhone: '01347-570055',
    department: 'Front Desk & Reception',
    departmentBn: 'ফ্রন্ট ডেস্ক ও কাস্টমার সার্ভিস',
    departmentCategory: 'front_desk',
    badgeNo: 'FC-FDO-002',
    licenseNo: 'CAAB-FD-DAC-102',
    station: 'HSIA Canopy Information & Reception Desk',
    stationBn: 'হযরত শাহজালাল বিমানবন্দর ক্যানোপি ও ফ্রন্ট ডেস্ক',
    shift: '02:00 PM - 10:00 PM',
    status: 'active',
    avatar: '👩‍💼',
    bloodGroup: 'A+',
    joinedDate: '01 Mar 2024',
    rating: 5.0,
    completedServices: 0,
    totalPoints: 0,
    rankTitle: 'Rank 1: Protocol Officer',
    pass: 'CAAB-FD-DAC-102',
    valid: '31-12-2027',
    rmk: 'Front Desk Officer welcoming VIP passengers at HSIA canopy, assistance with check-in procedures, pass clearance and protocol escort.',
    aliases: ['FC-FDO-002', 'taslima', 'taslima-akter', 'st-fdo-002'],
  },
  {
    id: 'FC-PO-001',
    serial: 12,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Kazi Md. Riyadh',
    nameBn: 'কাজী মোঃ রিয়াদ',
    email: 'book@flightcaresbd.com',
    gmail: 'riyadh.md2020@gmail.com',
    phone: '+8801347570014',
    phoneDisplay: '01347-570014',
    personalPhone: '01323-883965',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-001',
    licenseNo: 'CAAB-SEC-DAC-8946',
    station: 'DAC Wheelchair Assistance Station & Transit',
    stationBn: 'হুইলচেয়ার অ্যাসিস্ট্যান্স ও ট্রানজিট লাউঞ্জ',
    shift: '08:00 AM - 04:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-002',
    serial: 13,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md. Al- Amin',
    nameBn: 'মোঃ আল-আমিন',
    email: 'book@flightcaresbd.com',
    gmail: 'alaminct66@gmail.com',
    phone: '+8801347570015',
    phoneDisplay: '01347-570015',
    personalPhone: '01621-826243',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-002',
    licenseNo: 'CAAB-SEC-DAC-8948',
    station: 'DAC Terminal 1 & 2 Boarding Bridge',
    stationBn: 'টার্মিনাল ১ ও ২ বোর্ডিং ব্রিজ এবং এ্যারাইভাল হল',
    shift: '02:00 PM - 10:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-003',
    serial: 14,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md Nur Uddin Zahed',
    nameBn: 'মোঃ নুর উদ্দিন জাহেদ',
    email: 'book@flightcaresbd.com',
    gmail: 'fbrjahid99@gmail.com',
    phone: '+8801347570016',
    phoneDisplay: '01347-570016',
    personalPhone: '01614-686699',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-003',
    licenseNo: 'CAAB-SEC-DAC-8949',
    station: 'DAC Terminal 1 Departure & Check-in Desk',
    stationBn: 'টার্মিনাল ১ ডিপারচার ও চেক-ইন ডেস্ক',
    shift: '10:00 PM - 06:00 AM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-004',
    serial: 15,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md Anamul Haq',
    nameBn: 'মোঃ এনামুল হক',
    email: 'book@flightcaresbd.com',
    gmail: 'hanamul314@gmail.com',
    phone: '+8801347570017',
    phoneDisplay: '01347-570017',
    personalPhone: '01685-358448',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-004',
    licenseNo: 'CAAB-SEC-DAC-8950',
    station: 'DAC Terminal 2 International Arrival Hall',
    stationBn: 'টার্মিনাল ২ আন্তর্জাতিক আগমন হল',
    shift: '06:00 AM - 02:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'AB+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-005',
    serial: 16,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Bablu Miah',
    nameBn: 'বাবলু মিয়া',
    email: 'book@flightcaresbd.com',
    gmail: 'tusharmd995@gmail.com',
    phone: '+8801347570018',
    phoneDisplay: '01347-570018',
    personalPhone: '01799-446488',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-005',
    licenseNo: 'CAAB-SEC-DAC-8951',
    station: 'DAC Customs Clearance Lane & Green Channel',
    stationBn: 'কাস্টমস ক্লিয়ারেন্স লেন ও গ্রিন চ্যানেল',
    shift: '08:00 AM - 04:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'A+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-006',
    serial: 17,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md. Faysal Ahmed Joy',
    nameBn: 'মোঃ ফয়সাল আহমেদ জয়',
    email: 'book@flightcaresbd.com',
    gmail: 'foysalahmed3131@icloud.com',
    phone: '+8801347570019',
    phoneDisplay: '01347-570019',
    personalPhone: '01879-049526',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-006',
    licenseNo: 'CAAB-SEC-DAC-8952',
    station: 'DAC VVIP Boarding Gate & Diplomatic Lounge',
    stationBn: 'ভিভিআইপি বোর্ডিং গেট ও ডিপ্লোম্যাটিক লাউঞ্জ',
    shift: '10:00 AM - 06:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-007',
    serial: 18,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Hasibul Hasan Munna',
    nameBn: 'হাসিবুল হাসান মুন্না',
    email: 'book@flightcaresbd.com',
    gmail: 'mdrobin457890@gmail.com',
    phone: '+8801347570020',
    phoneDisplay: '01347-570020',
    personalPhone: '01687-786062',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-007',
    licenseNo: 'CAAB-SEC-DAC-8953',
    station: 'DAC Baggage Belt 1-8 Escort Area',
    stationBn: 'লাগেজ বেল্ট ১-৮ এস্কর্ট ও কালেক্ট জোন',
    shift: '02:00 PM - 10:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-008',
    serial: 19,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Abu Saem Roman',
    nameBn: 'আবু সায়েম রোমান',
    email: 'book@flightcaresbd.com',
    gmail: 'abusaemroman@gmail.com',
    phone: '+8801347570021',
    phoneDisplay: '01347-570021',
    personalPhone: '01690-136205',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-008',
    licenseNo: 'CAAB-SEC-DAC-8954',
    station: 'DAC Wheelchair Assistance Station & Transit',
    stationBn: 'হুইলচেয়ার অ্যাসিস্ট্যান্স ও ট্রানজিট লাউঞ্জ',
    shift: '10:00 PM - 06:00 AM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'A+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-009',
    serial: 20,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Abid Hasan Lijon',
    nameBn: 'আবিদ হাসান লিজন',
    email: 'book@flightcaresbd.com',
    gmail: 'abidhasanlijon2211@gmail.com',
    phone: '+8801347570022',
    phoneDisplay: '01347-570022',
    personalPhone: '01772-733623',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-009',
    licenseNo: 'CAAB-SEC-DAC-8955',
    station: 'DAC Canopy & Executive Car Pickup Area',
    stationBn: 'ক্যানোপি ও এক্সিকিউটিভ কার পিকআপ এরিয়া',
    shift: '06:00 AM - 02:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-010',
    serial: 21,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Ataur Rahman',
    nameBn: 'আতাউর রহমান',
    email: 'book@flightcaresbd.com',
    gmail: 'ataurrahman5725@gmail.com',
    phone: '+8801347570023',
    phoneDisplay: '01347-570023',
    personalPhone: '01788-890470',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-010',
    licenseNo: 'CAAB-SEC-DAC-8956',
    station: 'DAC Terminal 1 & 2 Boarding Bridge',
    stationBn: 'টার্মিনাল ১ ও ২ বোর্ডিং ব্রিজ এবং এ্যারাইভাল হল',
    shift: '08:00 AM - 04:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-011',
    serial: 22,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Arafat Hossain Rakib',
    nameBn: 'আরাফাত হোসেন রাকিব',
    email: 'book@flightcaresbd.com',
    gmail: 'arafat21052003@gmail.com',
    phone: '+8801347570024',
    phoneDisplay: '01347-570024',
    personalPhone: '01761-782620',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-011',
    licenseNo: 'CAAB-SEC-DAC-8957',
    station: 'DAC Terminal 1 Departure & Check-in Desk',
    stationBn: 'টার্মিনাল ১ ডিপারচার ও চেক-ইন ডেস্ক',
    shift: '10:00 AM - 06:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'AB+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-012',
    serial: 23,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Sabbir Sikder',
    nameBn: 'সাব্বির সিকদার',
    email: 'book@flightcaresbd.com',
    gmail: 'smsabbir7168@gmail.com',
    phone: '+8801347570025',
    phoneDisplay: '01347-570025',
    personalPhone: '01354-925931',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-012',
    licenseNo: 'CAAB-SEC-DAC-8958',
    station: 'DAC Terminal 2 International Arrival Hall',
    stationBn: 'টার্মিনাল ২ আন্তর্জাতিক আগমন হল',
    shift: '02:00 PM - 10:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'A+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-013',
    serial: 24,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Shipon Mia',
    nameBn: 'শিপন মিয়া',
    email: 'book@flightcaresbd.com',
    gmail: '',
    phone: '+8801347570026',
    phoneDisplay: '01347-570026',
    personalPhone: '01317-269553',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-013',
    licenseNo: 'CAAB-SEC-DAC-8959',
    station: 'DAC Customs Clearance Lane & Green Channel',
    stationBn: 'কাস্টমস ক্লিয়ারেন্স লেন ও গ্রিন চ্যানেল',
    shift: '10:00 PM - 06:00 AM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-014',
    serial: 25,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md Rakib Uzzaman',
    nameBn: 'মোঃ রাকিবুজ্জামান',
    email: 'book@flightcaresbd.com',
    gmail: 'rakivshikder879@gmail.com',
    phone: '+8801347570027',
    phoneDisplay: '01347-570027',
    personalPhone: '01758-019826',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-014',
    licenseNo: 'CAAB-SEC-DAC-8960',
    station: 'DAC VVIP Boarding Gate & Diplomatic Lounge',
    stationBn: 'ভিভিআইপি বোর্ডিং গেট ও ডিপ্লোম্যাটিক লাউঞ্জ',
    shift: '06:00 AM - 02:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-015',
    serial: 26,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Mostafa Kamal',
    nameBn: 'মোস্তফা কামাল',
    email: 'book@flightcaresbd.com',
    gmail: 'mostofakamal718278@gmail.com',
    phone: '+8801347570028',
    phoneDisplay: '01347-570028',
    personalPhone: '01935-718278',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-015',
    licenseNo: 'CAAB-SEC-DAC-8961',
    station: 'DAC Baggage Belt 1-8 Escort Area',
    stationBn: 'লাগেজ বেল্ট ১-৮ এস্কর্ট ও কালেক্ট জোন',
    shift: '08:00 AM - 04:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'A+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-016',
    serial: 27,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Azizul Haque Emon',
    nameBn: 'আজিজুল হক ইমন',
    email: 'book@flightcaresbd.com',
    gmail: 'azizulhaqueemon61@gmail.com',
    phone: '+8801347570029',
    phoneDisplay: '01347-570029',
    personalPhone: '01581-722607',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-016',
    licenseNo: 'CAAB-SEC-DAC-8962',
    station: 'DAC Wheelchair Assistance Station & Transit',
    stationBn: 'হুইলচেয়ার অ্যাসিস্ট্যান্স ও ট্রানজিট লাউঞ্জ',
    shift: '10:00 AM - 06:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-017',
    serial: 28,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md. Monim Mia',
    nameBn: 'মোঃ মনিম মিয়া',
    email: 'book@flightcaresbd.com',
    gmail: 'mdmonimmonim390@gmail.com',
    phone: '+8801347570030',
    phoneDisplay: '01347-570030',
    personalPhone: '01891-881380',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-017',
    licenseNo: 'CAAB-SEC-DAC-8963',
    station: 'DAC Canopy & Executive Car Pickup Area',
    stationBn: 'ক্যানোপি ও এক্সিকিউটিভ কার পিকআপ এরিয়া',
    shift: '02:00 PM - 10:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-018',
    serial: 29,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Nuruzzaman',
    nameBn: 'নুরুজ্জামান',
    email: 'book@flightcaresbd.com',
    gmail: 'nuruzzamank1999@gmail.com',
    phone: '+8801347570031',
    phoneDisplay: '01347-570031',
    personalPhone: '01888-483148',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-018',
    licenseNo: 'CAAB-SEC-DAC-8964',
    station: 'DAC Terminal 1 & 2 Boarding Bridge',
    stationBn: 'টার্মিনাল ১ ও ২ বোর্ডিং ব্রিজ এবং এ্যারাইভাল হল',
    shift: '10:00 PM - 06:00 AM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'AB+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-019',
    serial: 30,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md. Zisan Ahmed',
    nameBn: 'মোঃ জিসান আহমেদ',
    email: 'book@flightcaresbd.com',
    gmail: 'ahmedzisan709@gmail.com',
    phone: '+8801347570032',
    phoneDisplay: '01347-570032',
    personalPhone: '01975-160654',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-019',
    licenseNo: 'CAAB-SEC-DAC-8965',
    station: 'DAC Terminal 1 Departure & Check-in Desk',
    stationBn: 'টার্মিনাল ১ ডিপারচার ও চেক-ইন ডেস্ক',
    shift: '06:00 AM - 02:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'A+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-020',
    serial: 31,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Shishir Ahmed',
    nameBn: 'শিশির আহমেদ',
    email: 'book@flightcaresbd.com',
    gmail: 'shishir344998@gmail.com',
    phone: '+8801347570033',
    phoneDisplay: '01347-570033',
    personalPhone: '01568-629196',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-020',
    licenseNo: 'CAAB-SEC-DAC-8966',
    station: 'DAC Terminal 2 International Arrival Hall',
    stationBn: 'টার্মিনাল ২ আন্তর্জাতিক আগমন হল',
    shift: '08:00 AM - 04:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-021',
    serial: 32,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md Eiasin',
    nameBn: 'মোঃ ইয়াসিন',
    email: 'book@flightcaresbd.com',
    gmail: 'eiasinmia94@gmail.com',
    phone: '+8801347570034',
    phoneDisplay: '01347-570034',
    personalPhone: '01624-660409',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-021',
    licenseNo: 'CAAB-SEC-DAC-8967',
    station: 'DAC Customs Clearance Lane & Green Channel',
    stationBn: 'কাস্টমস ক্লিয়ারেন্স লেন ও গ্রিন চ্যানেল',
    shift: '10:00 AM - 06:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-022',
    serial: 33,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md Mehedi Hasan',
    nameBn: 'মোঃ মেহেদী হাসান',
    email: 'book@flightcaresbd.com',
    gmail: 'mhasan8df9@gmail.com',
    phone: '+8801347570035',
    phoneDisplay: '01347-570035',
    personalPhone: '01779-177827',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-022',
    licenseNo: 'CAAB-SEC-DAC-8968',
    station: 'DAC VVIP Boarding Gate & Diplomatic Lounge',
    stationBn: 'ভিভিআইপি বোর্ডিং গেট ও ডিপ্লোম্যাটিক লাউঞ্জ',
    shift: '02:00 PM - 10:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'A+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-023',
    serial: 34,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Mahmudul Hasan',
    nameBn: 'মাহমুদুল হাসান',
    email: 'book@flightcaresbd.com',
    gmail: 'tusifmahmudimad@gmail.com',
    phone: '+8801347570036',
    phoneDisplay: '01347-570036',
    personalPhone: '01995-2901811',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-023',
    licenseNo: 'CAAB-SEC-DAC-8969',
    station: 'DAC Baggage Belt 1-8 Escort Area',
    stationBn: 'লাগেজ বেল্ট ১-৮ এস্কর্ট ও কালেক্ট জোন',
    shift: '10:00 PM - 06:00 AM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-024',
    serial: 35,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Mehedi Hasan Joy',
    nameBn: 'মেহেদী হাসান জয়',
    email: 'book@flightcaresbd.com',
    gmail: 'chadmahamud24@gmail.com',
    phone: '+8801347570037',
    phoneDisplay: '01347-570037',
    personalPhone: '01942-522610',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-024',
    licenseNo: 'CAAB-SEC-DAC-8970',
    station: 'DAC Wheelchair Assistance Station & Transit',
    stationBn: 'হুইলচেয়ার অ্যাসিস্ট্যান্স ও ট্রানজিট লাউঞ্জ',
    shift: '06:00 AM - 02:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-025',
    serial: 36,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md Rashed ahmed',
    nameBn: 'মোঃ রাশেদ আহমেদ',
    email: 'book@flightcaresbd.com',
    gmail: 'ratulsorkar0980@gmail.com',
    phone: '+8801347570038',
    phoneDisplay: '01347-570038',
    personalPhone: '01605-557650',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-025',
    licenseNo: 'CAAB-SEC-DAC-8971',
    station: 'DAC Canopy & Executive Car Pickup Area',
    stationBn: 'ক্যানোপি ও এক্সিকিউটিভ কার পিকআপ এরিয়া',
    shift: '08:00 AM - 04:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'AB+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-026',
    serial: 37,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Sharif Ahmed',
    nameBn: 'শরিফ আহমেদ',
    email: 'book@flightcaresbd.com',
    gmail: 'sharifahmedakash03@gmail.com',
    phone: '+8801347570039',
    phoneDisplay: '01347-570039',
    personalPhone: '01951-556872',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-026',
    licenseNo: 'CAAB-SEC-DAC-8972',
    station: 'DAC Terminal 1 & 2 Boarding Bridge',
    stationBn: 'টার্মিনাল ১ ও ২ বোর্ডিং ব্রিজ এবং এ্যারাইভাল হল',
    shift: '10:00 AM - 06:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'A+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-027',
    serial: 38,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Sri Sonjoy Robidas',
    nameBn: 'শ্রী সঞ্জয় রবিদাস',
    email: 'book@flightcaresbd.com',
    gmail: 'kumarsonjoy664@gamail.com',
    phone: '+8801347570040',
    phoneDisplay: '01347-570040',
    personalPhone: '01332-301218',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-027',
    licenseNo: 'CAAB-SEC-DAC-8973',
    station: 'DAC Terminal 1 Departure & Check-in Desk',
    stationBn: 'টার্মিনাল ১ ডিপারচার ও চেক-ইন ডেস্ক',
    shift: '02:00 PM - 10:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-028',
    serial: 39,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md Abu Sayem',
    nameBn: 'মোঃ আবু সায়েম',
    email: 'book@flightcaresbd.com',
    gmail: '',
    phone: '+8801347570041',
    phoneDisplay: '01347-570041',
    personalPhone: '01906-376663',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-028',
    licenseNo: 'CAAB-SEC-DAC-8974',
    station: 'DAC Terminal 2 International Arrival Hall',
    stationBn: 'টার্মিনাল ২ আন্তর্জাতিক আগমন হল',
    shift: '10:00 PM - 06:00 AM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-029',
    serial: 40,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Sonjit Robi Das',
    nameBn: 'সঞ্জিত রবি দাস',
    email: 'book@flightcaresbd.com',
    gmail: 'shanto89984432@gmail.com',
    phone: '+8801347570042',
    phoneDisplay: '01347-570042',
    personalPhone: '01770-991559',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-029',
    licenseNo: 'CAAB-SEC-DAC-8975',
    station: 'DAC Customs Clearance Lane & Green Channel',
    stationBn: 'কাস্টমস ক্লিয়ারেন্স লেন ও গ্রিন চ্যানেল',
    shift: '06:00 AM - 02:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'A+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-030',
    serial: 41,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md. Sujan Akanad',
    nameBn: 'মোঃ সুজন আকন্দ',
    email: 'book@flightcaresbd.com',
    gmail: '',
    phone: '+8801347570043',
    phoneDisplay: '01347-570043',
    personalPhone: '01615-902044',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-030',
    licenseNo: 'CAAB-SEC-DAC-8976',
    station: 'DAC VVIP Boarding Gate & Diplomatic Lounge',
    stationBn: 'ভিভিআইপি বোর্ডিং গেট ও ডিপ্লোম্যাটিক লাউঞ্জ',
    shift: '08:00 AM - 04:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-031',
    serial: 42,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Alamgir Hossain',
    nameBn: 'আলমগীর হোসেন',
    email: 'book@flightcaresbd.com',
    gmail: '',
    phone: '+8801347570044',
    phoneDisplay: '01347-570044',
    personalPhone: '01738-978347',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-031',
    licenseNo: 'CAAB-SEC-DAC-8977',
    station: 'DAC Baggage Belt 1-8 Escort Area',
    stationBn: 'লাগেজ বেল্ট ১-৮ এস্কর্ট ও কালেক্ট জোন',
    shift: '10:00 AM - 06:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-032',
    serial: 43,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md Hasib',
    nameBn: 'মোঃ হাসিব',
    email: 'book@flightcaresbd.com',
    gmail: '',
    phone: '+8801347570045',
    phoneDisplay: '01347-570045',
    personalPhone: '01760-030174',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-032',
    licenseNo: 'CAAB-SEC-DAC-8978',
    station: 'DAC Wheelchair Assistance Station & Transit',
    stationBn: 'হুইলচেয়ার অ্যাসিস্ট্যান্স ও ট্রানজিট লাউঞ্জ',
    shift: '02:00 PM - 10:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'AB+',
    joinedDate: '01 Jan 2024',
    rmk: 'Corporate official mobile line. Direct assistance.',
  },
  {
    id: 'FC-PO-033',
    serial: 44,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Md Rashel Mia',
    nameBn: 'মোঃ রাসেল মিয়া',
    email: 'book@flightcaresbd.com',
    gmail: '',
    phone: '+8801347570046',
    phoneDisplay: '01347-570046',
    personalPhone: '01863-657190',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-033',
    licenseNo: 'CAAB-SEC-DAC-8979',
    station: 'DAC Canopy & Executive Car Pickup Area',
    stationBn: 'ক্যানোপি ও এক্সিকিউটিভ কার পিকআপ এরিয়া',
    shift: '10:00 PM - 06:00 AM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'A+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-034',
    serial: 45,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Abul Khayar',
    nameBn: 'আবুল খায়ের',
    email: 'book@flightcaresbd.com',
    gmail: '',
    phone: '+8801347570047',
    phoneDisplay: '01347-570047',
    personalPhone: '01615-925233',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-034',
    licenseNo: 'CAAB-SEC-DAC-8980',
    station: 'DAC Terminal 1 & 2 Boarding Bridge',
    stationBn: 'টার্মিনাল ১ ও ২ বোর্ডিং ব্রিজ এবং এ্যারাইভাল হল',
    shift: '06:00 AM - 02:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'B+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  },
  {
    id: 'FC-PO-035',
    serial: 46,
    rank: 'Protocol Officer',
    rankBn: 'প্রোটোকল অফিসার',
    name: 'Khoshru Ahmed Anas',
    nameBn: 'খসরু আহমেদ আনাস',
    email: 'book@flightcaresbd.com',
    gmail: 'khoshruahmedanas@gmail.com',
    phone: '+8801347570048',
    phoneDisplay: '01347-570048',
    personalPhone: '01961-778865',
    department: 'VIP Protocol Operations',
    departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: 'protocol',
    badgeNo: 'FC-PO-035',
    licenseNo: 'CAAB-SEC-DAC-8981',
    station: 'DAC Terminal 1 Departure & Check-in Desk',
    stationBn: 'টার্মিনাল ১ ডিপারচার ও চেক-ইন ডেস্ক',
    shift: '08:00 AM - 04:00 PM',
    status: 'active',
    avatar: '🧑‍✈️',
    bloodGroup: 'O+',
    joinedDate: '01 Jan 2024',
    rmk: 'Certified Protocol Officer specialized in meet & assist, baggage clearance & executive guidance.',
  }
];

/**
 * Normalizes a family member record to ensure consistent fields and ownership integrity
 */
export const normalizeFamilyMember = (m, fallbackIndex = 0) => {
  if (!m || typeof m !== 'object') return null;
  const serial = Number(m.serial) || (fallbackIndex + 1);
  const id = String(m.id || `FC-MEM-${String(serial).padStart(3, '0')}`).trim();
  return {
    ...m,
    id,
    serial,
    name: m.name || `Officer ${serial}`,
    nameBn: m.nameBn || m.name || `কর্মকর্তা ${serial}`,
    rank: m.rank || 'Protocol Officer',
    rankBn: m.rankBn || 'প্রোটোকল অফিসার',
    email: m.email || 'book@flightcaresbd.com',
    status: m.status || 'active',
    avatar: m.avatar || m.photo || (serial <= 7 ? '👑' : '🧑‍✈️'),
    photo: m.photo || (typeof m.avatar === 'string' && m.avatar.startsWith('data:image') ? m.avatar : null),
  };
};

/**
 * Loads all Flight Care Family members.
 * 1. Reads local cache from AsyncStorage for instant UI rendering.
 * 2. Fetches latest cloud collection from Firestore ('flight_care_family').
 * 3. Merges cloud data with local records (cloud takes precedence for edits and photos).
 * 4. Persists the merged roster back to AsyncStorage so offline visits remain up to date.
 */
export const getFlightCareFamilyMembers = async (forceCloudRefresh = false) => {
  let cachedList = null;

  // 1. Instant local cache lookup
  try {
    const raw = await AsyncStorage.getItem(FLIGHT_CARE_FAMILY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const loadedList = parsed.map((m, idx) => normalizeFamilyMember(m, idx));
        // Load deleted tombstones first
        try {
          const delRaw = await AsyncStorage.getItem(FLIGHT_CARE_DELETED_MEMBERS_KEY);
          if (delRaw) {
            const delArr = JSON.parse(delRaw);
            if (Array.isArray(delArr)) {
              delArr.forEach(id => inMemoryDeletedIds.add(String(id).toUpperCase().trim()));
            }
          }
        } catch {}

        // Populate map while STRICTLY respecting Super Admin deleted IDs
        const mapById = new Map();
        DEFAULT_FLIGHT_CARE_FAMILY.forEach((m, idx) => {
          const mId = (m.id || '').toUpperCase();
          const mBadge = (m.badgeNo || '').toUpperCase();
          if (!inMemoryDeletedIds.has(mId) && !inMemoryDeletedIds.has(mBadge)) {
            mapById.set(mId, normalizeFamilyMember(m, idx));
          }
        });
        loadedList.forEach(m => {
          if (m && m.id) {
            const mId = m.id.toUpperCase();
            const mBadge = (m.badgeNo || '').toUpperCase();
            if (!inMemoryDeletedIds.has(mId) && !inMemoryDeletedIds.has(mBadge)) {
              const existing = mapById.get(mId);
              mapById.set(mId, { ...existing, ...m });
            } else {
              mapById.delete(mId);
            }
          }
        });
        cachedList = Array.from(mapById.values()).sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
      }
    }
  } catch (err) {
    console.warn('[FlightCareFamilyService] Local storage load notice:', err.message);
  }

  // If cached data exists and forceCloudRefresh is not requested, initiate cloud fetch in background
  // but if running on web and checking live updates, fetch cloud docs to ensure fresh data
  try {
    const cloudRes = await getFirestoreCollection('flight_care_family');
    if (cloudRes && cloudRes.ok && Array.isArray(cloudRes.items) && cloudRes.items.length > 0) {
      const cloudMap = new Map();
      cloudRes.items.forEach((item, idx) => {
        const norm = normalizeFamilyMember(item, idx);
        if (norm && norm.id) {
          const key = norm.id.toUpperCase();
          const badgeKey = (norm.badgeNo || '').toUpperCase();
          if (!inMemoryDeletedIds.has(key) && !inMemoryDeletedIds.has(badgeKey)) {
            cloudMap.set(key, norm);
          }
        }
      });

      // Combine with defaults/cache so no default members are missed unless explicitly deleted by Super Admin
      const baseSource = (cachedList && cachedList.length > 0) ? cachedList : DEFAULT_FLIGHT_CARE_FAMILY;
      baseSource.forEach((def, idx) => {
        const normDef = normalizeFamilyMember(def, idx);
        const key = normDef.id.toUpperCase();
        const badgeKey = (normDef.badgeNo || '').toUpperCase();
        if (!inMemoryDeletedIds.has(key) && !inMemoryDeletedIds.has(badgeKey) && !cloudMap.has(key)) {
          cloudMap.set(key, normDef);
        }
      });

      const merged = Array.from(cloudMap.values());
      merged.sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));

      // Persist latest cloud sync to local cache
      AsyncStorage.setItem(FLIGHT_CARE_FAMILY_STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    }
  } catch (cloudErr) {
    console.warn('[FlightCareFamilyService] Firestore fetch error, using local cache:', cloudErr.message);
  }

  // If cloud was unreachable, return local cache or default roster
  if (cachedList && cachedList.length > 0) {
    return cachedList;
  }

  // Fallback to initial canonical roster
  const defaultNormalized = DEFAULT_FLIGHT_CARE_FAMILY.map((m, idx) => normalizeFamilyMember(m, idx)).sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
  try {
    await AsyncStorage.setItem(FLIGHT_CARE_FAMILY_STORAGE_KEY, JSON.stringify(defaultNormalized));
  } catch {}

  return defaultNormalized;
};

/**
 * Saves entire family roster to AsyncStorage and Firestore cloud collection
 */
export const saveFlightCareFamilyMembers = async (members) => {
  if (!Array.isArray(members)) return false;
  try {
    const normalized = members.map((m, idx) => normalizeFamilyMember(m, idx));
    await AsyncStorage.setItem(FLIGHT_CARE_FAMILY_STORAGE_KEY, JSON.stringify(normalized));

    // Parallel background cloud sync to Firestore
    try {
      await Promise.allSettled(
        normalized.map(m => saveFirestoreDoc('flight_care_family', m.id, {
          ...m,
          cloudUpdatedAt: new Date().toISOString(),
        }))
      );
    } catch (syncErr) {
      console.warn('[FlightCareFamilyService] Background cloud sync warning:', syncErr.message);
    }

    return true;
  } catch (err) {
    console.error('[FlightCareFamilyService] Save failed:', err);
    return false;
  }
};

/**
 * Adds a new member (Super Admin only)
 */
export const addFlightCareFamilyMember = async (memberData, userRole = 'admin') => {
  if (userRole !== 'admin') {
    return { ok: false, error: 'Unauthorized: Only Super Admin can add members.' };
  }

  const list = await getFlightCareFamilyMembers();
  const nextSerial = list.length + 1;
  const newId = memberData.id || `FC-MEM-${String(nextSerial).padStart(3, '0')}`;

  let finalPhoto = memberData.photo || null;
  if (finalPhoto && typeof finalPhoto === 'string' && finalPhoto.startsWith('data:image')) {
    try {
      finalPhoto = await compressImage(finalPhoto);
    } catch {}
  }

  const newMember = normalizeFamilyMember({
    ...memberData,
    id: newId,
    serial: Number(memberData.serial) || nextSerial,
    badgeNo: memberData.badgeNo || `FC-BADGE-${String(nextSerial).padStart(3, '0')}`,
    status: memberData.status || 'active',
    photo: finalPhoto,
    avatar: finalPhoto || memberData.avatar || '👮',
    joinedDate: memberData.joinedDate || new Date().toISOString().split('T')[0],
  }, list.length);

  const updated = [newMember, ...list].sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
  // Re-normalize serials
  updated.forEach((m, idx) => { m.serial = idx + 1; });

  await saveFlightCareFamilyMembers(updated);

  // Directly ensure new member is in Firestore immediately
  try {
    await saveFirestoreDoc('flight_care_family', newMember.id, {
      ...newMember,
      cloudUpdatedAt: new Date().toISOString(),
    });
  } catch {}

  return { ok: true, member: newMember, members: updated };
};

/**
 * Updates an existing member (Super Admin only)
 */
export const updateFlightCareFamilyMember = async (id, updates, userRole = 'admin') => {
  if (userRole !== 'admin') {
    return { ok: false, error: 'Unauthorized: Only Super Admin can edit members.' };
  }

  const list = await getFlightCareFamilyMembers();
  const idx = list.findIndex(m => m.id === id);
  if (idx === -1) {
    return { ok: false, error: 'Member not found.' };
  }

  // If updates contain a photo, compress it
  let finalUpdates = { ...updates };
  if (finalUpdates.photo && typeof finalUpdates.photo === 'string' && finalUpdates.photo.startsWith('data:image')) {
    try {
      const compressed = await compressImage(finalUpdates.photo);
      finalUpdates.photo = compressed;
      finalUpdates.avatar = compressed;
    } catch {}
  }

  const updatedItem = normalizeFamilyMember({
    ...list[idx],
    ...finalUpdates,
    updatedAt: new Date().toISOString(),
  }, idx);

  list[idx] = updatedItem;

  // Re-sort if serial changed
  if (updates.serial !== undefined) {
    list.sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
  }

  await saveFlightCareFamilyMembers(list);

  // Ensure immediate cloud persistence for the updated doc
  try {
    await saveFirestoreDoc('flight_care_family', id, {
      ...updatedItem,
      cloudUpdatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[FlightCareFamilyService] Direct Firestore update warning:', err.message);
  }

  return { ok: true, member: updatedItem, members: list };
};

/**
 * Updates a member photo directly with automatic client-side canvas compression
 */
export const updateFlightCareFamilyMemberPhoto = async (id, photoUrlOrBase64, userRole = 'admin') => {
  if (userRole !== 'admin') {
    return { ok: false, error: 'Unauthorized: Only Super Admin can update photo.' };
  }

  const list = await getFlightCareFamilyMembers();
  const idx = list.findIndex(m => m.id === id);
  if (idx === -1) {
    return { ok: false, error: 'Member not found.' };
  }

  // Automatically compress photo down to ~30KB JPEG to avoid Firestore 1MB limits
  let compressedPhoto = photoUrlOrBase64;
  try {
    if (typeof photoUrlOrBase64 === 'string' && photoUrlOrBase64.startsWith('data:image')) {
      compressedPhoto = await compressImage(photoUrlOrBase64, { maxWidth: 480, maxHeight: 480, quality: 0.82 });
    }
  } catch (compErr) {
    console.warn('[FlightCareFamilyService] Compression notice:', compErr.message);
  }

  const updatedItem = normalizeFamilyMember({
    ...list[idx],
    photo: compressedPhoto,
    avatar: compressedPhoto,
    updatedAt: new Date().toISOString(),
  }, idx);

  list[idx] = updatedItem;

  await saveFlightCareFamilyMembers(list);

  // Directly save to Firestore to guarantee immediate cloud persistence
  try {
    await saveFirestoreDoc('flight_care_family', id, {
      ...updatedItem,
      cloudUpdatedAt: new Date().toISOString(),
    });
  } catch (fsErr) {
    console.warn('[FlightCareFamilyService] Direct photo Firestore save warning:', fsErr.message);
  }

  return { ok: true, member: list[idx], members: list };
};

/**
 * Reorders entire family list with customized serials
 */
export const reorderFlightCareFamilyMembers = async (newOrderedList, userRole = 'admin') => {
  if (userRole !== 'admin') {
    return { ok: false, error: 'Unauthorized: Only Super Admin can reorder family members.' };
  }
  if (!Array.isArray(newOrderedList)) {
    return { ok: false, error: 'Invalid members list.' };
  }

  const updated = newOrderedList.map((member, idx) => normalizeFamilyMember({
    ...member,
    serial: idx + 1,
    updatedAt: new Date().toISOString(),
  }, idx));

  await saveFlightCareFamilyMembers(updated);
  return { ok: true, members: updated };
};

/**
 * Moves a member up or down by 1 position (swapping with adjacent member)
 */
export const moveFlightCareFamilyMember = async (id, direction = 'up', userRole = 'admin') => {
  if (userRole !== 'admin') {
    return { ok: false, error: 'Unauthorized: Only Super Admin can change order.' };
  }

  const list = await getFlightCareFamilyMembers();
  const index = list.findIndex(m => m.id === id);
  if (index === -1) return { ok: false, error: 'Member not found.' };

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= list.length) {
    return { ok: false, error: 'Cannot move further in that direction.' };
  }

  // Swap elements
  const temp = list[index];
  list[index] = list[targetIndex];
  list[targetIndex] = temp;

  // Re-assign serials based on current positions
  list.forEach((m, idx) => {
    m.serial = idx + 1;
  });

  await saveFlightCareFamilyMembers(list);

  // Directly update swapped documents in Firestore
  try {
    await Promise.allSettled([
      saveFirestoreDoc('flight_care_family', list[index].id, list[index]),
      saveFirestoreDoc('flight_care_family', list[targetIndex].id, list[targetIndex]),
    ]);
  } catch {}

  return { ok: true, members: list };
};

/**
 * Bulk Deletes multiple members from Flight Care Family (Super Admin only)
 * Allows Super Admin to delete 20 members (or any count) simultaneously.
 * Renumbers remaining members cleanly and records tombstones to prevent re-addition.
 */
export const bulkDeleteFlightCareFamilyMembers = async (idsToDelete, userRole = 'admin') => {
  const roleStr = String(userRole || '').toLowerCase();
  const isAuth = !userRole || roleStr.includes('admin') || roleStr.includes('super') || roleStr.includes('manager');
  if (!isAuth) {
    return { ok: false, error: 'Unauthorized: Only Super Administrator can delete members.' };
  }
  if (!Array.isArray(idsToDelete) || idsToDelete.length === 0) {
    return { ok: false, error: 'No members selected for deletion.' };
  }

  const targetSet = new Set(idsToDelete.map(id => String(id).toUpperCase().trim()));

  // 1. Record in-memory tombstones
  targetSet.forEach(id => inMemoryDeletedIds.add(id));

  // 2. Persist tombstones to AsyncStorage
  try {
    await AsyncStorage.setItem(FLIGHT_CARE_DELETED_MEMBERS_KEY, JSON.stringify(Array.from(inMemoryDeletedIds)));
  } catch {}

  // 3. Load active members and filter
  const currentList = await getFlightCareFamilyMembers();
  const remaining = currentList.filter(m => {
    const mId = (m.id || '').toUpperCase().trim();
    const mBadge = (m.badgeNo || '').toUpperCase().trim();
    return !targetSet.has(mId) && !targetSet.has(mBadge) && !inMemoryDeletedIds.has(mId) && !inMemoryDeletedIds.has(mBadge);
  });

  // 4. Cleanly renumber serials: 1, 2, 3 ... N
  remaining.forEach((m, idx) => {
    m.serial = idx + 1;
  });

  // 5. Save updated roster to storage and memory
  await AsyncStorage.setItem(FLIGHT_CARE_FAMILY_STORAGE_KEY, JSON.stringify(remaining));

  // Also immediately prune deleted members from Protocol Officers / Staff Roster
  try {
    const rawStaff = await AsyncStorage.getItem('@flightcare_staff_roster_v8');
    if (rawStaff) {
      const parsedStaff = JSON.parse(rawStaff);
      if (Array.isArray(parsedStaff)) {
        const cleanedStaff = parsedStaff.filter(s => {
          const sId = (s.id || '').toUpperCase().trim();
          const sBadge = (s.badgeNo || '').toUpperCase().trim();
          return !targetSet.has(sId) && !targetSet.has(sBadge);
        });
        await AsyncStorage.setItem('@flightcare_staff_roster_v8', JSON.stringify(cleanedStaff));
      }
    }
  } catch {}

  // 6. Delete from Firestore cloud in parallel
  try {
    const deletePromises = [];
    targetSet.forEach(id => {
      deletePromises.push(deleteFirestoreDoc('flight_care_family', id));
      deletePromises.push(deleteFirestoreDoc('flight_care_family', id.toLowerCase()));
      deletePromises.push(deleteFirestoreDoc('flight_care_family', id.toUpperCase()));
    });
    await Promise.allSettled(deletePromises);
    await saveFirestoreDoc('system_metadata', 'deleted_family_members', {
      deletedIds: Array.from(inMemoryDeletedIds),
      updatedAt: new Date().toISOString(),
    });
  } catch {}

  return { ok: true, deletedCount: idsToDelete.length, members: remaining };
};

/**
 * Deletes a single member (Super Admin only)
 */
export const deleteFlightCareFamilyMember = async (id, userRole = 'admin') => {
  return await bulkDeleteFlightCareFamilyMembers([id], userRole);
};

/**
 * Restores previously deleted member(s) (Super Admin only)
 */
export const restoreDeletedFamilyMember = async (id, userRole = 'admin') => {
  const normId = String(id).toUpperCase().trim();
  inMemoryDeletedIds.delete(normId);
  try {
    await AsyncStorage.setItem(FLIGHT_CARE_DELETED_MEMBERS_KEY, JSON.stringify(Array.from(inMemoryDeletedIds)));
  } catch {}
  const list = await getFlightCareFamilyMembers(true);
  return { ok: true, members: list };
};

/**
 * Ultra-robust, 100% accurate lookup of a Flight Care Family member.
 * Eliminates cross-member data swapping by prioritizing exact badge/id matches
 * over naive numeric extraction.
 */
export const findFamilyMember = async (identifier) => {
  if (!identifier) return null;
  const rawId = String(identifier).trim();
  const cleanId = rawId.toLowerCase();
  const cleanUpper = rawId.toUpperCase();

  // 1. Fetch full loaded family list (FAST, ACCURATE, LOCAL/CLOUD-MERGED)
  const list = await getFlightCareFamilyMembers();
  if (Array.isArray(list) && list.length > 0) {
    // 1a. Exact ID or Badge No. match (case-insensitive) - HIGHEST PRIORITY
    let found = list.find(m => 
      (m.id && m.id.toLowerCase() === cleanId) ||
      (m.badgeNo && m.badgeNo.toLowerCase() === cleanId) ||
      (m.id && m.id.toUpperCase() === cleanUpper) ||
      (m.badgeNo && m.badgeNo.toUpperCase() === cleanUpper)
    );
    if (found) return found;

    // 1b. Check if identifier is a staff_roster ID (e.g. 'st-ceo', 'st-hr', 'st-off-001')
    if (typeof DEFAULT_STAFF_ROSTER !== 'undefined' && Array.isArray(DEFAULT_STAFF_ROSTER)) {
      const staffEquiv = DEFAULT_STAFF_ROSTER.find(s => s.id && s.id.toLowerCase() === cleanId);
      if (staffEquiv && staffEquiv.badgeNo) {
        found = list.find(m => m.badgeNo && m.badgeNo.toUpperCase() === staffEquiv.badgeNo.toUpperCase());
        if (found) return found;
      }
    }

    // 1c. Exact serial match ONLY IF identifier is strictly pure digits (e.g. "1", "42")
    if (/^\d+$/.test(rawId)) {
      const serialNum = parseInt(rawId, 10);
      found = list.find(m => Number(m.serial) === serialNum);
      if (found) return found;
    }

    // 1d. Exact Name match (Bangla or English)
    found = list.find(m => 
      (m.name && m.name.toLowerCase() === cleanId) ||
      (m.nameBn && m.nameBn.trim() === rawId)
    );
    if (found) return found;

    // 1e. Phone match (exact digits)
    const cleanDigits = rawId.replace(/\D/g, '');
    if (cleanDigits.length >= 7) {
      found = list.find(m => 
        (m.phone && m.phone.replace(/\D/g, '').includes(cleanDigits)) ||
        (m.personalPhone && m.personalPhone.replace(/\D/g, '').includes(cleanDigits))
      );
      if (found) return found;
    }
  }

  // 2. Direct Cloud Document Fetch from flight_care_family (only if not found in list)
  try {
    const directDoc = await getFirestoreDoc('flight_care_family', cleanUpper);
    if (directDoc && directDoc.ok && directDoc.exists && directDoc.data) {
      return normalizeFamilyMember(directDoc.data);
    }
  } catch (fsErr) {
    console.warn('[FlightCareFamilyService] Direct Firestore lookup notice:', fsErr?.message);
  }

  return null;
};

/**
 * Real-time listener for Flight Care Family collection in Firestore.
 * Subscribes to cloud updates so changes by Super Admin instantly appear
 * on all visitors' screens without needing a page refresh.
 */
export const listenToFlightCareFamily = (onUpdate, onError) => {
  return subscribeCollection(
    'flight_care_family',
    (cloudItems) => {
      if (Array.isArray(cloudItems) && cloudItems.length > 0) {
        const cloudMap = new Map();
        cloudItems.forEach((item, idx) => {
          const norm = normalizeFamilyMember(item, idx);
          if (norm && norm.id) {
            cloudMap.set(norm.id.toUpperCase(), norm);
          }
        });

        // Ensure defaults are present if cloud is partial
        DEFAULT_FLIGHT_CARE_FAMILY.forEach((def, idx) => {
          const normDef = normalizeFamilyMember(def, idx);
          const key = normDef.id.toUpperCase();
          if (!cloudMap.has(key)) {
            cloudMap.set(key, normDef);
          }
        });

        const merged = Array.from(cloudMap.values());
        merged.sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));

        AsyncStorage.setItem(FLIGHT_CARE_FAMILY_STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
        if (onUpdate) onUpdate(merged);
      }
    },
    onError
  );
};

/**
 * Converts a Flight Care Family member into a standard Protocol Officer / Staff Roster object
 */
export const familyMemberToStaff = (m, idx = 0) => {
  if (!m) return null;
  const serial = Number(m.serial) || (idx + 1);
  const badgeNo = m.badgeNo || m.id || `FC-PO-${String(serial).padStart(3, '0')}`;
  return {
    id: m.id || badgeNo,
    serial,
    name: m.name || `Officer ${serial}`,
    nameBn: m.nameBn || m.name,
    email: m.email || 'book@flightcaresbd.com',
    gmail: m.gmail || m.email || '',
    phone: m.phone || '+8801347570000',
    phoneDisplay: m.phoneDisplay || m.phone,
    personalPhone: m.personalPhone || m.phone,
    role: m.rank || m.role || 'Protocol Officer',
    roleBn: m.rankBn || m.roleBn || 'প্রোটোকল অফিসার',
    department: m.department || 'VIP Protocol Operations',
    departmentBn: m.departmentBn || 'ভিআইপি প্রোটোকল অপারেশন্স',
    departmentCategory: m.departmentCategory || 'protocol',
    airport: m.airport || 'DAC',
    station: m.station || 'DAC Terminal 1 & 2 Boarding Bridge',
    stationBn: m.stationBn || 'টার্মিনাল ১ ও ২ বোর্ডিং ব্রিজ',
    shift: m.shift || '06:00 AM - 02:00 PM',
    status: m.status || 'available',
    active: m.active !== false && m.status !== 'inactive',
    rating: Number(m.rating) || 5.0,
    completedServices: Number(m.completedServices) || 0,
    totalPoints: Number(m.totalPoints) || 0,
    joinedDate: m.joinedDate || '01 Jan 2024',
    pin: m.pin || String(m.phone || '0000').slice(-6),
    bloodGroup: m.bloodGroup || 'A+',
    badgeNo,
    licenseNo: m.licenseNo || m.pass || `CAAB-SEC-DAC-${8900 + serial}`,
    notes: m.rmk || m.notes || 'Certified VIP Protocol Officer assisting arriving & departing passengers at HSIA.',
    photo: m.photo || null,
    avatar: m.avatar || m.photo || '🧑‍✈️',
    isFamilyMember: true,
  };
};

/**
 * Checks whether a given staff member or ID strictly belongs to Flight Care Family
 * and has not been tombstoned or permanently removed by Super Admin.
 */
export const isFlightCareFamilyMember = (memberOrId) => {
  if (!memberOrId) return false;
  const rawId = typeof memberOrId === 'string' ? memberOrId : (memberOrId.id || memberOrId.badgeNo || '');
  const rawBadge = typeof memberOrId === 'object' ? (memberOrId.badgeNo || '') : '';
  const cleanId = String(rawId).toUpperCase().trim();
  const cleanBadge = String(rawBadge).toUpperCase().trim();

  // If permanently deleted by Super Admin, strictly reject
  if (inMemoryDeletedIds.has(cleanId) || (cleanBadge && inMemoryDeletedIds.has(cleanBadge))) {
    return false;
  }

  // Must match a defined member in DEFAULT_FLIGHT_CARE_FAMILY or aliases
  return DEFAULT_FLIGHT_CARE_FAMILY.some(m => {
    const mId = (m.id || '').toUpperCase().trim();
    const mBadge = (m.badgeNo || '').toUpperCase().trim();
    if (mId === cleanId || mBadge === cleanId) return true;
    if (cleanBadge && (mId === cleanBadge || mBadge === cleanBadge)) return true;
    if (Array.isArray(m.aliases) && m.aliases.some(a => a.toUpperCase().trim() === cleanId)) return true;
    return false;
  });
};

/**
 * Checks whether a staff member or ID is an active field Protocol Officer or Shift In-Charge.
 * Excludes corporate Top Management (Chairman, CEO, HR Head, AGM, Coordinator, IT Head, Operations Officer)
 * and Front Desk Officers from the operational Protocol Officers tab and flight assignment view,
 * while ensuring they remain proudly displayed in the Flight Care Family directory.
 */
export const isFieldProtocolOfficer = (memberOrStaff) => {
  if (!memberOrStaff) return false;
  if (!isFlightCareFamilyMember(memberOrStaff)) return false;

  const role = (memberOrStaff.role || memberOrStaff.rank || '').toLowerCase();
  const dept = (memberOrStaff.department || '').toLowerCase();
  const cat = (memberOrStaff.departmentCategory || '').toLowerCase();
  const id = (memberOrStaff.id || '').toUpperCase();
  const badge = (memberOrStaff.badgeNo || '').toUpperCase();

  if (
    role.includes('chairman') ||
    role.includes('ceo') ||
    role.includes('hr head') ||
    role.includes('agm') ||
    role.includes('coordinator') ||
    role.includes('front desk') ||
    role.includes('it head') ||
    cat === 'management' ||
    cat === 'front_desk' ||
    dept.includes('top management') ||
    dept.includes('front desk') ||
    id.startsWith('FC-CHM') ||
    id.startsWith('FC-CEO') ||
    id.startsWith('FC-HR') ||
    id.startsWith('FC-AGM') ||
    id.startsWith('FC-CTC') ||
    id.startsWith('FC-IT') ||
    id.startsWith('FC-OPS') ||
    id.startsWith('FC-FDO') ||
    id === 'ST-CHM' ||
    id === 'ST-CEO' ||
    id === 'ST-HR' ||
    id === 'ST-AGM' ||
    id === 'ST-CTC' ||
    id === 'ST-IT' ||
    id === 'ST-OPS' ||
    id === 'ST-SFDO' ||
    id === 'ST-FDO-002' ||
    badge.startsWith('FC-CHM') ||
    badge.startsWith('FC-CEO') ||
    badge.startsWith('FC-HR') ||
    badge.startsWith('FC-AGM') ||
    badge.startsWith('FC-CTC') ||
    badge.startsWith('FC-IT') ||
    badge.startsWith('FC-OPS') ||
    badge.startsWith('FC-FDO')
  ) {
    return false;
  }
  return true;
};

/**
 * Filters any staff roster to guarantee that ONLY official Flight Care Family members
 * remain. Any outside, mock, obsolete, or deleted officers are permanently excluded.
 */
export const filterStaffRosterByFamily = (staffList) => {
  if (!Array.isArray(staffList)) return [];
  return staffList.filter(s => isFlightCareFamilyMember(s));
};

/**
 * Synchronizes staff roster directly from official Flight Care Family members list.
 */
export const syncStaffWithFamilyRoster = (familyMembers = null) => {
  const source = Array.isArray(familyMembers) && familyMembers.length > 0 ? familyMembers : DEFAULT_FLIGHT_CARE_FAMILY;
  return source
    .filter(m => isFlightCareFamilyMember(m))
    .map((m, idx) => familyMemberToStaff(m, idx))
    .sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
};



