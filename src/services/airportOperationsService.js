/**
 * Flight Care - Airport VIP Operations & Incident Management Service
 * Designed for Airport Meet & Greet Directors, Duty Managers, and Protocol Officers.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const OPERATIONS_STORAGE_KEYS = {
  SHIFT_BRIEFING: '@flightcare_shift_briefing',
  INCIDENT_LOGS: '@flightcare_incident_logs',
};

// 1. Terminal Emergency & Desk Intercom Speed Dial Directory
export const AIRPORT_SPEED_DIAL_DIRECTORY = [
  {
    id: 'duty_mgr',
    titleEn: 'Duty Manager Control Room',
    titleBn: 'ডিউটি ম্যানেজার কন্ট্রোল রুম',
    extension: 'Ext: 2201',
    phone: '+8801700000101',
    category: 'Operations',
    icon: '🏢',
    color: '#0284C7',
    available: '24/7 Live',
  },
  {
    id: 'lounge_reception',
    titleEn: 'VIP & CIP Lounge Front Desk',
    titleBn: 'ভিআইপি ও সিআইপি লাউঞ্জ ফ্রন্ট ডেস্ক',
    extension: 'Ext: 3305',
    phone: '+8801700000102',
    category: 'Lounge',
    icon: '🛋️',
    color: '#D97706',
    available: 'Terminal 1 & 2',
  },
  {
    id: 'fast_track_imm',
    titleEn: 'Fast-Track Immigration Desk',
    titleBn: 'ফাস্ট-ট্র্যাক ইমিগ্রেশন ডেস্ক',
    extension: 'Ext: 1102',
    phone: '+8801700000103',
    category: 'Immigration',
    icon: '🛂',
    color: '#7C3AED',
    available: 'Arrival & Departure',
  },
  {
    id: 'customs_coordinator',
    titleEn: 'Customs Baggage Coordinator',
    titleBn: 'কাস্টমস লাগেজ হেল্পডেস্ক',
    extension: 'Ext: 1108',
    phone: '+8801700000104',
    category: 'Customs',
    icon: '🧳',
    color: '#DC2626',
    available: 'Green / Red Channel',
  },
  {
    id: 'airport_clinic',
    titleEn: 'Airport Medical Emergency Center',
    titleBn: 'এয়ারপোর্ট জরুরি চিকিৎসা কেন্দ্র',
    extension: 'Ext: 999',
    phone: '+8801700000105',
    category: 'Medical',
    icon: '🩺',
    color: '#059669',
    available: '24/7 Ambulance',
  },
  {
    id: 'avsec_police',
    titleEn: 'Aviation Security (AVSEC) & Police',
    titleBn: 'বিমানবন্দর নিরাপত্তা (AVSEC) ও পুলিশ',
    extension: 'Ext: 100',
    phone: '+8801700000106',
    category: 'Security',
    icon: '👮',
    color: '#0F172A',
    available: 'Control Command',
  },
];

// 2. Default Shift Briefing
export const DEFAULT_SHIFT_BRIEFING = {
  shift: 'Morning & Afternoon Shift',
  date: new Date().toISOString().slice(0, 10),
  updatedAt: new Date().toISOString(),
  managerName: 'Sohel Tanvir (Operations Director)',
  priorityNoticeEn: 'Diplomatic delegation arriving on EK582 (17:30). VIP Suite 2 reserved at CIP Lounge. Expedited fast-track at Boarding Bridge 4.',
  priorityNoticeBn: 'বিকেল ৫:৩০ এ EK582 ফ্লাইটে কূটনৈতিক দলের আগমন। সিআইপি লাউঞ্জে স্যুট ২ সংরক্ষিত। অ্যারাইভাল বোর্ডিং ব্রিজ ৪ এ প্রায়োরিটি ফাস্ট-ট্র্যাক প্রোটোকল প্রস্তুত রাখুন।',
  stationAlerts: [
    'Terminal 1 Boarding Bridge 4 undergoing light maintenance; use Bridge 5 if redirected.',
    'Wheelchair escort team to position at Gate 7 by 14:15.',
  ],
};

// 3. Default Preset Incident & Lost Baggage Logs
export const DEFAULT_INCIDENT_LOGS = [
  {
    id: 'INC-2026-001',
    bookingId: 'FC-9901',
    passengerName: 'Ambassador K. Rahman',
    flightNumber: 'EK 582',
    date: new Date().toISOString().slice(0, 10),
    time: '14:20',
    type: 'lost_baggage',
    typeNameEn: 'Lost / Delayed Baggage',
    typeNameBn: 'হারানো / বিলম্বিত লাগেজ',
    priority: 'HIGH',
    status: 'in_progress', // 'open' | 'in_progress' | 'resolved'
    assignedOfficer: 'Officer Tanvir Ahmed (ST-01)',
    pirNumber: 'DAC-EK-88291',
    bagDescription: 'Black Samsonite hard-case trolley with red VIP ribbon',
    notes: 'Baggage tag registered with Emirates Lost & Found. Tracing in Dubai hub.',
    resolutionNotes: '',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'INC-2026-002',
    bookingId: 'FC-8812',
    passengerName: 'Dr. Nusrat Jahan',
    flightNumber: 'BG 001',
    date: new Date().toISOString().slice(0, 10),
    time: '11:15',
    type: 'medical_assist',
    typeNameEn: 'Special Medical Assistance',
    typeNameBn: 'জরুরি হুইলচেয়ার সহায়তা',
    priority: 'NORMAL',
    status: 'resolved',
    assignedOfficer: 'Officer Nusrat Jahan (ST-02)',
    pirNumber: 'MED-DAC-042',
    bagDescription: 'N/A',
    notes: 'Passenger requested immediate motorized wheelchair at boarding bridge exit.',
    resolutionNotes: 'Officer safely escorted passenger through immigration to waiting ambulance vehicle.',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

// Helper to load shift briefing
export async function getShiftBriefing() {
  try {
    const raw = await AsyncStorage.getItem(OPERATIONS_STORAGE_KEYS.SHIFT_BRIEFING);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading shift briefing:', e.message);
  }
  return DEFAULT_SHIFT_BRIEFING;
}

// Helper to save shift briefing
export async function saveShiftBriefing(briefingData) {
  try {
    await AsyncStorage.setItem(OPERATIONS_STORAGE_KEYS.SHIFT_BRIEFING, JSON.stringify(briefingData));
    return true;
  } catch (e) {
    console.warn('Error saving shift briefing:', e.message);
    return false;
  }
}

// Helper to load incident logs
export async function getIncidentLogs() {
  try {
    const raw = await AsyncStorage.getItem(OPERATIONS_STORAGE_KEYS.INCIDENT_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading incident logs:', e.message);
  }
  return DEFAULT_INCIDENT_LOGS;
}

// Helper to save incident logs
export async function saveIncidentLogs(incidentList) {
  try {
    await AsyncStorage.setItem(OPERATIONS_STORAGE_KEYS.INCIDENT_LOGS, JSON.stringify(incidentList));
    return true;
  } catch (e) {
    console.warn('Error saving incident logs:', e.message);
    return false;
  }
}

// Protocol VIP Tiers
export const VVIP_PROTOCOL_TIERS = {
  STANDARD: {
    key: 'standard',
    nameEn: 'Standard VIP',
    nameBn: 'স্ট্যান্ডার্ড ভিআইপি',
    color: '#0284C7',
    bg: '#E0F2FE',
    badge: '⭐ VIP',
  },
  CIP: {
    key: 'cip',
    nameEn: 'CIP Executive',
    nameBn: 'সিআইপি এক্সিকিউটিভ',
    color: '#D97706',
    bg: '#FEF3C7',
    badge: '💎 CIP',
  },
  VVIP_STATE: {
    key: 'vvip_state',
    nameEn: 'VVIP State / Diplomat',
    nameBn: 'ভিভিআইপি স্টেট / কূটনীতিবিদ',
    color: '#7C3AED',
    bg: '#EDE9FE',
    badge: '👑 VVIP STATE',
  },
};

