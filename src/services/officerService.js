import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { DEFAULT_STAFF_ROSTER } from '../constants/data';
import { getFirestoreDoc, getFirestoreCollection } from './firebase';
import { findFamilyMember } from './flightCareFamilyService';

const OFFICER_REVIEWS_STORAGE = '@flightcare_officer_reviews_v2';
const STAFF_STORAGE = '@flightcare_staff_roster_v10';
AsyncStorage.removeItem('@flightcare_staff_roster_v9').catch(() => {});
AsyncStorage.removeItem('@flightcare_officer_reviews_v1').catch(() => {});
AsyncStorage.removeItem('@flightcare_staff_roster_v8').catch(() => {});

// Initial verified reviews database for protocol officers (starts clean from scratch)
const DEFAULT_OFFICER_REVIEWS = {};

// Expanded detailed officer records (18 Protocol Officers + Operations Lead)
const OFFICER_METADATA = {
  'st-0': {
    badgeNo: 'FC-LEAD-001',
    nameBn: 'সোহেল তানভীর',
    roleBn: 'অপারেশনস ম্যানেজার ও প্রোটোকল হেড',
    bloodGroup: 'A+',
    licenseNo: 'CAAB-MGR-DAC-001',
    emergencyContact: '+8801700000000',
    experienceYears: 7,
    punctualityRate: '100%',
    satisfactionRate: '99.9%',
    specialtiesEn: ['Airport Operations Command', 'Crisis Management', 'VIP Protocol Oversight', 'Terminal Security Liaison'],
    specialtiesBn: ['এয়ারপোর্ট অপারেশনস কমান্ড', 'জরুরি পরিস্থিতি হ্যান্ডলিং', 'ভিআইপি প্রোটোকল ওভারসাইট', 'টার্মিনাল নিরাপত্তা লিয়াজোঁ'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'সেন্ট্রাল অপারেশন্স কমান্ড ডেস্ক ও টার্মিনাল ১-২',
  },
  'st-spo': {
    badgeNo: 'FC-SPO-001',
    nameBn: 'মোঃ নুর উদ্দিন জাহেদ',
    roleBn: 'সিনিয়র প্রোটোকল অফিসার',
    bloodGroup: 'AB+',
    licenseNo: 'CAAB-SEC-DAC-8940',
    emergencyContact: '+8801614686699',
    experienceYears: 6,
    punctualityRate: '99.9%',
    satisfactionRate: '99.8%',
    specialtiesEn: ['VVIP Diplomatic Reception', 'Boarding Bridge Fast Escort', 'Executive Lounge Care', 'VIP Delegation Coordination'],
    specialtiesBn: ['ভিভিআইপি ডিপ্লোম্যাটিক অভ্যর্থনা', 'বোর্ডিং ব্রিজ দ্রুত এসকর্ট', 'এক্সিকিউটিভ লাউঞ্জ কেয়ার', 'ভিআইপি ডেলিগেশন কো-অর্ডিনেশন'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'ভিভিআইপি বোর্ডিং গেট ও ডিপ্লোম্যাটিক লাউঞ্জ',
  },
  'st-1': {
    badgeNo: 'FC-PO-001',
    nameBn: 'মোঃ এনামুল হক',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'B+',
    licenseNo: 'CAAB-SEC-DAC-8941',
    emergencyContact: '+8801685358448',
    experienceYears: 5,
    punctualityRate: '99.8%',
    satisfactionRate: '99.6%',
    specialtiesEn: ['Boarding Bridge Meet & Greet', 'VIP Transit Escort', 'Fast-Track Immigration', 'Baggage Priority'],
    specialtiesBn: ['বোর্ডিং ব্রিজ অভ্যর্থনা', 'ভিআইপি ট্রানজিট এসকর্ট', 'ফাস্ট-ট্র্যাক ইমিগ্রেশন', 'লাগেজ অগ্রাধিকার খালাস'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ১ ও ২ বোর্ডিং ব্রিজ এবং এ্যারাইভাল হল',
  },
  'st-2': {
    badgeNo: 'FC-PO-002',
    nameBn: 'বাবলু মিয়া',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'O+',
    licenseNo: 'CAAB-SEC-DAC-8942',
    emergencyContact: '+8801799446488',
    experienceYears: 4,
    punctualityRate: '99.7%',
    satisfactionRate: '99.5%',
    specialtiesEn: ['VIP Meet & Greet', 'Fast-Track Customs', 'Terminal Navigation', 'Special Assistance'],
    specialtiesBn: ['ভিআইপি মিট অ্যান্ড গ্রিট', 'ফাস্ট-ট্র্যাক কাস্টমস', 'টার্মিনাল দিকনির্দেশনা', 'বিশেষ যাত্রী সহায়তা'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ১ ভিআইপি লাউঞ্জ ও বোর্ডিং এরিয়া',
  },
  'st-3': {
    badgeNo: 'FC-PO-003',
    nameBn: 'মোঃ ফয়সাল আহমেদ জয়',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'A+',
    licenseNo: 'CAAB-SEC-DAC-8943',
    emergencyContact: '+8801879049526',
    experienceYears: 4,
    punctualityRate: '99.6%',
    satisfactionRate: '99.4%',
    specialtiesEn: ['Boarding Bridge Reception', 'Wheelchair Support', 'Boarding Assistance', 'Immigration Fast-Track'],
    specialtiesBn: ['বোর্ডিং ব্রিজ অভ্যর্থনা', 'হুইলচেয়ার সাপোর্ট', 'বোর্ডিং সহায়তা', 'ইমিগ্রেশন ফাস্ট-ট্র্যাক'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ২ বোর্ডিং গেট ও এ্যারাইভাল লাউঞ্জ',
  },
  'st-4': {
    badgeNo: 'FC-PO-004',
    nameBn: 'হাসিবুল হাসান মুন্না',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'AB+',
    licenseNo: 'CAAB-SEC-DAC-8944',
    emergencyContact: '+8801687786062',
    experienceYears: 4,
    punctualityRate: '99.5%',
    satisfactionRate: '99.3%',
    specialtiesEn: ['Diplomatic Escort', 'CIP Lounge Protocol', 'Baggage Priority', 'Transit Facilitation'],
    specialtiesBn: ['কূটনৈতিক প্রোটোকল', 'সিআইপি লাউঞ্জ এসকর্ট', 'লাগেজ অগ্রাধিকার খালাস', 'ট্রানজিট সহায়তা'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'ভিআইপি ও সিআইপি প্রটোকল লাউঞ্জ, টার্মিনাল ১',
  },
  'st-5': {
    badgeNo: 'FC-PO-005',
    nameBn: 'আবু সায়েম রোমান',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'B+',
    licenseNo: 'CAAB-SEC-DAC-8945',
    emergencyContact: '+8801690136205',
    experienceYears: 3,
    punctualityRate: '99.4%',
    satisfactionRate: '99.2%',
    specialtiesEn: ['Terminal Coordination', 'Luggage Reclamation', 'Elderly Passenger Care', 'Canopy Greeting'],
    specialtiesBn: ['টার্মিনাল সমন্বয়', 'লাগেজ খালাস সহায়তা', 'বয়োজ্যেষ্ঠ যাত্রী সেবা', 'ক্যানোপি অভ্যর্থনা'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ২ হুইলচেয়ার লাউঞ্জ ও এ্যারাইভাল হল',
  },
  'st-6': {
    badgeNo: 'FC-PO-006',
    nameBn: 'আবিদ হাসান লিজন',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'O+',
    licenseNo: 'CAAB-SEC-DAC-8946',
    emergencyContact: '+8801772733623',
    experienceYears: 3,
    punctualityRate: '99.4%',
    satisfactionRate: '99.1%',
    specialtiesEn: ['Arrival Escort', 'Forex & SIM Support', 'Immigration Assistance', 'Buggy Transit'],
    specialtiesBn: ['এ্যারাইভাল কনসিয়ার্জ', 'লোকাল সিম ও মানি এক্সচেঞ্জ', 'ইমিগ্রেশন সহায়তা', 'টার্মিনাল বাগি সার্ভিস'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ১ ক্যানোপি ও কনসিয়ার্জ ডেস্ক',
  },
  'st-7': {
    badgeNo: 'FC-PO-007',
    nameBn: 'আতাউর রহমান',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'A+',
    licenseNo: 'CAAB-SEC-CGP-5421',
    emergencyContact: '+8801788890470',
    experienceYears: 3,
    punctualityRate: '99.3%',
    satisfactionRate: '99.0%',
    specialtiesEn: ['Porter Coordination', 'Customs Liaison', 'Boarding Gate Escort', 'VIP Lounge Service'],
    specialtiesBn: ['পোর্টার সমন্বয়', 'কাস্টমস লিয়াজোঁ', 'বোর্ডিং গেট এসকর্ট', 'ভিআইপি লাউঞ্জ সার্ভিস'],
    airportFullNameEn: 'Shah Amanat International Airport, Chittagong (CGP)',
    airportFullNameBn: 'শাহ আমানত আন্তর্জাতিক বিমানবন্দর, চট্টগ্রাম (CGP)',
    stationBn: 'শাহ আমানত এ্যারাইভাল ও ডিপার্চার হল',
  },
  'st-8': {
    badgeNo: 'FC-PO-008',
    nameBn: 'আরাফাত হোসেন রাকিব',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'B+',
    licenseNo: 'CAAB-SEC-CGP-5422',
    emergencyContact: '+8801761782620',
    experienceYears: 3,
    punctualityRate: '99.2%',
    satisfactionRate: '98.9%',
    specialtiesEn: ['Medical Passenger Transit', 'Wheelchair Escort', 'Baggage Belt Handling', 'Express Immigration'],
    specialtiesBn: ['মেডিকেল যাত্রী ট্রানজিট', 'হুইলচেয়ার এসকর্ট', 'ব্যাগেজ বেল্ট হ্যান্ডলিং', 'এক্সপ্রেস ইমিগ্রেশন'],
    airportFullNameEn: 'Shah Amanat International Airport, Chittagong (CGP)',
    airportFullNameBn: 'শাহ আমানত আন্তর্জাতিক বিমানবন্দর, চট্টগ্রাম (CGP)',
    stationBn: 'শাহ আমানত টার্মিনাল ১ স্পেশাল কেয়ার ডেস্ক',
  },
  'st-9': {
    badgeNo: 'FC-PO-009',
    nameBn: 'সাব্বির শিকদার',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'O+',
    licenseNo: 'CAAB-SEC-DAC-8949',
    emergencyContact: '+8801354925931',
    experienceYears: 2,
    punctualityRate: '99.1%',
    satisfactionRate: '98.8%',
    specialtiesEn: ['Boarding Bridge Meet & Greet', 'Check-in Counter Support', 'Luggage Assistance', 'Passenger Care'],
    specialtiesBn: ['বোর্ডিং ব্রিজ অভ্যর্থনা', 'চেক-ইন কাউন্টার সহায়তা', 'লাগেজ সহায়তা', 'প্যাসেঞ্জার কেয়ার'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ১ বোর্ডিং জোন ও ডিপার্চার কনকোর্স',
  },
  'st-10': {
    badgeNo: 'FC-PO-010',
    nameBn: 'শিপন মিয়া',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'A+',
    licenseNo: 'CAAB-SEC-DAC-8950',
    emergencyContact: '+8801317269553',
    experienceYears: 2,
    punctualityRate: '99.0%',
    satisfactionRate: '98.7%',
    specialtiesEn: ['Arrival Concierge', 'Flight Connection Guide', 'Baggage Delivery Escort', 'Priority Handling'],
    specialtiesBn: ['এ্যারাইভাল কনসিয়ার্জ', 'ফ্লাইট কানেকশন গাইড', 'লাগেজ ডেলিভারি এসকর্ট', 'প্রায়োরিটি হ্যান্ডলিং'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ২ এ্যারাইভাল বেল্ট ও পার্কিং জোন',
  },
  'st-11': {
    badgeNo: 'FC-PO-011',
    nameBn: 'মোঃ রাকিব উজ্জামান',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'B+',
    licenseNo: 'CAAB-SEC-DAC-8951',
    emergencyContact: '+8801758019826',
    experienceYears: 2,
    punctualityRate: '98.9%',
    satisfactionRate: '98.6%',
    specialtiesEn: ['Transit Corridor Escort', 'Boarding Gate Assistance', 'Elderly Care', 'Fast-Track Queue'],
    specialtiesBn: ['ট্রানজিট করিডোর এসকর্ট', 'বোর্ডিং গেট সহায়তা', 'বয়োজ্যেষ্ঠ যাত্রী সেবা', 'ফাস্ট-ট্র্যাক কিউ'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ১ ট্রানজিট এরিয়া ও গেট ৫-১২',
  },
  'st-12': {
    badgeNo: 'FC-PO-012',
    nameBn: 'মোস্তফা কামাল',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'O+',
    licenseNo: 'CAAB-SEC-DAC-8952',
    emergencyContact: '+8801935718278',
    experienceYears: 2,
    punctualityRate: '98.8%',
    satisfactionRate: '98.5%',
    specialtiesEn: ['Check-in Verification', 'Security Line Guidance', 'Luggage Drop Support', 'Terminal Escort'],
    specialtiesBn: ['চেক-ইন ভেরিফিকেশন', 'নিরাপত্তা তল্লাশি গাইড', 'লাগেজ ড্রপ সহায়তা', 'টার্মিনাল এসকর্ট'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ২ চেক-ইন আইল্যান্ড সি ও ডি',
  },
  'st-13': {
    badgeNo: 'FC-PO-013',
    nameBn: 'আজিজুল হক ইমন',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'AB+',
    licenseNo: 'CAAB-SEC-ZYL-3131',
    emergencyContact: '+8801581722607',
    experienceYears: 2,
    punctualityRate: '98.7%',
    satisfactionRate: '98.4%',
    specialtiesEn: ['Departure Meet & Greet', 'Baggage Trolley Management', 'Immigration Assistance', 'Family Escort'],
    specialtiesBn: ['ডিপার্চার অভ্যর্থনা', 'ব্যাগেজ ট্রলি ব্যবস্থাপনা', 'ইমিগ্রেশন সহায়তা', 'পারিবারিক এসকর্ট'],
    airportFullNameEn: 'Osmani International Airport, Sylhet (ZYL)',
    airportFullNameBn: 'ওসমানী আন্তর্জাতিক বিমানবন্দর, সিলেট (ZYL)',
    stationBn: 'ওসমানী আন্তর্জাতিক ডিপার্চার হল ও ইমিগ্রেশন',
  },
  'st-14': {
    badgeNo: 'FC-PO-014',
    nameBn: 'মোঃ মনিব মিয়া',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'B+',
    licenseNo: 'CAAB-SEC-ZYL-3132',
    emergencyContact: '+8801891881380',
    experienceYears: 1,
    punctualityRate: '98.6%',
    satisfactionRate: '98.3%',
    specialtiesEn: ['Terminal Lobby Navigation', 'Arrival Hall Guide', 'Luggage Tag Check', 'Queue Navigation'],
    specialtiesBn: ['টার্মিনাল লবি দিকনির্দেশনা', 'এ্যারাইভাল হল গাইড', 'লাগেজ ট্যাগ যাচাই', 'কিউ নেভিগেশন'],
    airportFullNameEn: 'Osmani International Airport, Sylhet (ZYL)',
    airportFullNameBn: 'ওসমানী আন্তর্জাতিক বিমানবন্দর, সিলেট (ZYL)',
    stationBn: 'ওসমানী আন্তর্জাতিক এ্যারাইভাল বেল্ট ও ক্যানোপি',
  },
  'st-15': {
    badgeNo: 'FC-PO-015',
    nameBn: 'নুরুজ্জামান',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'O+',
    licenseNo: 'CAAB-SEC-DAC-8955',
    emergencyContact: '+8801888483148',
    experienceYears: 1,
    punctualityRate: '98.5%',
    satisfactionRate: '98.2%',
    specialtiesEn: ['Boarding Pass Check', 'Trolley Support', 'Passenger Escort', 'Arrival Meet & Greet'],
    specialtiesBn: ['বোর্ডিং পাস চেক', 'ট্রলি সহায়তা', 'যাত্রী এসকর্ট', 'এ্যারাইভাল অভ্যর্থনা'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ১ ক্যানোপি ও এ্যারাইভাল ১ গেট',
  },
  'st-16': {
    badgeNo: 'FC-PO-016',
    nameBn: 'মোঃ জিসান আহমেদ',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'A+',
    licenseNo: 'CAAB-SEC-DAC-8956',
    emergencyContact: '+8801975160654',
    experienceYears: 1,
    punctualityRate: '98.4%',
    satisfactionRate: '98.1%',
    specialtiesEn: ['Airport Canopy Reception', 'Luggage Loading Support', 'Check-in Area Guide', 'Transit Guidance'],
    specialtiesBn: ['এয়ারপোর্ট ক্যানোপি রিসেপশন', 'লাগেজ লোডিং সাপোর্ট', 'চেক-ইন এরিয়া গাইড', 'ট্রানজিট গাইডেন্স'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ২ ক্যানোপি ও চেক-ইন জোন',
  },
  'st-17': {
    badgeNo: 'FC-PO-017',
    nameBn: 'শিশির আহমেদ',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'B+',
    licenseNo: 'CAAB-SEC-DAC-8957',
    emergencyContact: '+8801568629196',
    experienceYears: 1,
    punctualityRate: '98.3%',
    satisfactionRate: '98.0%',
    specialtiesEn: ['Initial Protocol Assistance', 'Baggage Belt Supervision', 'Gate Guidance', 'Arrival Escort'],
    specialtiesBn: ['প্রাথমিক প্রোটোকল সহায়তা', 'লাগেজ বেল্ট তদারকি', 'গেট গাইডেন্স', 'এ্যারাইভাল এসকর্ট'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ১ ব্যাগেজ ক্লেইম বেল্ট ৩ ও ৪',
  },
  'st-18': {
    badgeNo: 'FC-PO-018',
    nameBn: 'মোঃ ইয়াসিন',
    roleBn: 'প্রোটোকল অফিসার',
    bloodGroup: 'O+',
    licenseNo: 'CAAB-SEC-DAC-8958',
    emergencyContact: '+8801624660409',
    experienceYears: 1,
    punctualityRate: '98.0%',
    satisfactionRate: '97.8%',
    specialtiesEn: ['Supervised Protocol Duties', 'Airport Terminal Orientation', 'Passenger Information', 'Escort Assistance'],
    specialtiesBn: ['সুপারভাইজড প্রোটোকল দায়িত্ব', 'এয়ারপোর্ট টার্মিনাল ওরিয়েন্টেশন', 'যাত্রী তথ্য সহায়তা', 'এসকর্ট সার্ভিস'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
    stationBn: 'টার্মিনাল ২ তথ্য ও সহায়তা কেন্দ্র',
  },
};

const PUBLIC_DOMAIN_STORAGE = '@flightcare_public_domain_config';
let cachedPublicDomain = null;

export const setConfiguredPublicDomain = async (domain) => {
  cachedPublicDomain = domain ? domain.trim().replace(/\/+$/, '') : null;
  if (cachedPublicDomain) {
    try {
      await AsyncStorage.setItem(PUBLIC_DOMAIN_STORAGE, cachedPublicDomain);
    } catch {}
  } else {
    try {
      await AsyncStorage.removeItem(PUBLIC_DOMAIN_STORAGE);
    } catch {}
  }
};

export const getConfiguredPublicDomain = async () => {
  if (cachedPublicDomain) return cachedPublicDomain;
  try {
    const stored = await AsyncStorage.getItem(PUBLIC_DOMAIN_STORAGE);
    if (stored) {
      cachedPublicDomain = stored;
      return stored;
    }
  } catch {}
  return null;
};

/**
 * Get the public website base URL for QR codes.
 * - If a custom production domain is configured, uses that (e.g. https://flightcare.com)
 * - If running on web in local development, uses the machine's local Wi-Fi IP (192.168.0.106:8081)
 *   so smartphones on the same network scanning QR codes connect immediately instead of failing on localhost!
 */
export const getPublicWebsiteBaseUrl = (customDomain = null) => {
  if (customDomain) return customDomain.trim().replace(/\/+$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${window.location.host}`;
    }
  }
  return 'https://flightcaresbd.com';
};

/**
 * Generate QR code data and public verification link for an Officer ID Card
 */
export const generateOfficerQrData = (officerId, baseUrl = null) => {
  const safeId = String(officerId || 'FC-PO-001').trim();
  const domain = baseUrl || getPublicWebsiteBaseUrl();
  const verificationUrl = `${domain}/?familyMember=${encodeURIComponent(safeId)}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=8&format=png&data=${encodeURIComponent(verificationUrl)}`;

  return {
    officerId: safeId,
    verificationUrl,
    qrImageUrl,
    generatedAt: new Date().toISOString(),
    securitySeal: `CAAB-VERIFIED-FC-${safeId.toUpperCase()}`,
  };
};

// ==========================================
// 10-TIER PROTOCOL OFFICER RANK SYSTEM (পয়েন্টের ভিত্তিতে ১০টি র‍্যাংক)
// ==========================================

export const PROTOCOL_OFFICER_RANKS = [
  {
    rankLevel: 10,
    level: 10,
    rankId: 'rank-10',
    nameEn: 'Chief Protocol Commander',
    nameBn: 'চিফ প্রোটোকল কমান্ডার',
    titleEn: 'Chief Protocol Commander',
    titleBn: 'চিফ প্রোটোকল কমান্ডার',
    shortEn: 'Rank 10 · Commander',
    shortBn: '১০ম র‍্যাংক · কমান্ডার',
    minPoints: 5000,
    maxPoints: null,
    badgeIcon: '👑',
    color: '#4C1D95',
    bgColor: '#EDE9FE',
    borderColor: '#8B5CF6',
    stars: 5,
    perksEn: 'VVIP & State Guest Escort, Full Operations Command Authority',
    perksBn: 'ভিভিআইপি ও রাষ্ট্রীয় অতিথি প্রোটোকল, অপারেশন্স কমান্ড ও সুপারভিশন কর্তৃত্ব',
    perks: 'VVIP & State Guest Escort, Full Operations Command Authority',
    descriptionEn: 'Supreme protocol operational authority, heading VVIP & state guest transit operations and terminal teams.',
    descriptionBn: 'সর্বোচ্চ প্রোটোকল কমান্ড কর্তৃত্ব, ভিভিআইপি ও রাষ্ট্রীয় অতিথিদের সর্বোচ্চ নিরাপত্তা প্রোটোকল ও টিম পরিচালনা।',
  },
  {
    rankLevel: 9,
    level: 9,
    rankId: 'rank-09',
    nameEn: 'Master Protocol Marshal',
    nameBn: 'মাস্টার প্রোটোকল মার্শাল',
    titleEn: 'Master Protocol Marshal',
    titleBn: 'মাস্টার প্রোটোকল মার্শাল',
    shortEn: 'Rank 9 · Marshal',
    shortBn: '৯ম র‍্যাংক · মার্শাল',
    minPoints: 4500,
    maxPoints: 4999,
    badgeIcon: '🎖️',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#A78BFA',
    stars: 4.5,
    perksEn: 'CIP Lounge Protocol, Diplomatic Fast-Track, Senior Mentorship',
    perksBn: 'সিআইপি লাউঞ্জ প্রোটোকল, কূটনৈতিক ফাস্ট-ট্র্যাক ও ট্রেইনার মেন্টরশিপ',
    perks: 'CIP Lounge Protocol, Diplomatic Fast-Track, Senior Mentorship',
    descriptionEn: 'Master mentor leading foreign diplomatic delegations, CIP protocols, and high-stakes terminal transits.',
    descriptionBn: 'কূটনৈতিক ডেলিগেশন, সিআইপি লাউঞ্জ প্রোটোকল ও জটিল ট্রানজিট অপারেশনসের অভিজ্ঞ তত্ত্বাবধায়ক।',
  },
  {
    rankLevel: 8,
    level: 8,
    rankId: 'rank-08',
    nameEn: 'Elite Platinum Lead',
    nameBn: 'এলিট প্লাটিনাম লিড',
    titleEn: 'Elite Platinum Lead',
    titleBn: 'এলিট প্লাটিনাম লিড',
    shortEn: 'Rank 8 · Platinum Lead',
    shortBn: '৮ম র‍্যাংক · প্লাটিনাম লিড',
    minPoints: 4000,
    maxPoints: 4499,
    badgeIcon: '💎',
    color: '#6D28D9',
    bgColor: '#F3E8FF',
    borderColor: '#C084FC',
    stars: 4,
    perksEn: 'Boarding Bridge Priority Greeting, High-Priority Flight Assignments',
    perksBn: 'বোর্ডিং ব্রিজ প্রায়োরিটি গ্রিটিং ও শীর্ষ অগ্রাধিকার ফ্লাইট অ্যাসাইনমেন্ট',
    perks: 'Boarding Bridge Priority Greeting, High-Priority Flight Assignments',
    descriptionEn: 'Leads high-value passenger arrivals, boarding bridge greeting, and seamless terminal handovers.',
    descriptionBn: 'বোর্ডিং ব্রিজে শীর্ষ যাত্রীদের অভ্যর্থনা এবং দ্রুততম টার্মিনাল হ্যান্ডওভারে দক্ষ কর্মকর্তা।',
  },
  {
    rankLevel: 7,
    level: 7,
    rankId: 'rank-07',
    nameEn: 'Executive Diamond Officer',
    nameBn: 'এক্সিকিউটিভ ডায়মন্ড অফিসার',
    titleEn: 'Executive Diamond Officer',
    titleBn: 'এক্সিকিউটিভ ডায়মন্ড অফিসার',
    shortEn: 'Rank 7 · Diamond Officer',
    shortBn: '৭ম র‍্যাংক · ডায়মন্ড অফিসার',
    minPoints: 3500,
    maxPoints: 3999,
    badgeIcon: '💠',
    color: '#0284C7',
    bgColor: '#E0F2FE',
    borderColor: '#38BDF8',
    stars: 3.5,
    perksEn: 'Executive Passenger Handling, Wheelchair Care Leadership',
    perksBn: 'এক্সিকিউটিভ যাত্রী হ্যান্ডলিং ও স্পেশাল কেয়ার লিডারশিপ',
    perks: 'Executive Passenger Handling, Wheelchair Care Leadership',
    descriptionEn: 'Dedicated to executive business passengers and complex medical transit coordination.',
    descriptionBn: 'বিজনেস ক্লাস যাত্রী ও জটিল মেডিকেল হুইলচেয়ার সহায়তা প্রদানকারী সিনিয়র প্রোটোকল অফিসার।',
  },
  {
    rankLevel: 6,
    level: 6,
    rankId: 'rank-06',
    nameEn: 'Senior Gold Officer',
    nameBn: 'সিনিয়র গোল্ড অফিসার',
    titleEn: 'Senior Gold Officer',
    titleBn: 'সিনিয়র গোল্ড অফিসার',
    shortEn: 'Rank 6 · Gold Officer',
    shortBn: '৬ষ্ঠ র‍্যাংক · গোল্ড অফিসার',
    minPoints: 3000,
    maxPoints: 3499,
    badgeIcon: '🥇',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FBBF24',
    stars: 3,
    perksEn: 'Customs & Baggage Expediting, Terminal Transit Coordination',
    perksBn: 'কাস্টমস ও ব্যাগেজ এক্সপেডাইটিং, টার্মিনাল ট্রানজিট সমন্বয়',
    perks: 'Customs & Baggage Expediting, Terminal Transit Coordination',
    descriptionEn: 'Proven track record in expediting baggage clearance, customs formalities, and gate routing.',
    descriptionBn: 'লাগেজ অগ্রাধিকার খালাস, কাস্টমস সহায়তা ও টার্মিনাল ট্রানজিটে দক্ষ অভিজ্ঞ কর্মকর্তা।',
  },
  {
    rankLevel: 5,
    level: 5,
    rankId: 'rank-05',
    nameEn: 'Distinguished Silver Officer',
    nameBn: 'ডিস্টিংগুইশড সিলভার অফিসার',
    titleEn: 'Distinguished Silver Officer',
    titleBn: 'ডিস্টিংগুইশড সিলভার অফিসার',
    shortEn: 'Rank 5 · Silver Officer',
    shortBn: '৫ম র‍্যাংক · সিলভার অফিসার',
    minPoints: 2500,
    maxPoints: 2999,
    badgeIcon: '🥈',
    color: '#0D9488',
    bgColor: '#CCFBF1',
    borderColor: '#2DD4BF',
    stars: 2.5,
    perksEn: 'Arrival Concierge, Transit Support, Priority Porter Dispatch',
    perksBn: 'অ্যারাইভাল কনসিয়ার্জ ও ট্রানজিট সহায়তা প্রদান',
    perks: 'Arrival Concierge, Transit Support, Priority Porter Dispatch',
    descriptionEn: 'Consistently high satisfaction in arrival concierge services, SIM/forex facilitation, and porter dispatch.',
    descriptionBn: 'এ্যারাইভাল কনসিয়ার্জ, লোকাল সিম ও কারেন্সি এক্সচেঞ্জ এবং পোর্টার সমন্বয়ে সুনামের অধিকারী।',
  },
  {
    rankLevel: 4,
    level: 4,
    rankId: 'rank-04',
    nameEn: 'Premier Bronze Officer',
    nameBn: 'প্রিমিয়ার ব্রোঞ্জ অফিসার',
    titleEn: 'Premier Bronze Officer',
    titleBn: 'প্রিমিয়ার ব্রোঞ্জ অফিসার',
    shortEn: 'Rank 4 · Bronze Officer',
    shortBn: '৪র্থ র‍্যাংক · ব্রোঞ্জ অফিসার',
    minPoints: 2000,
    maxPoints: 2499,
    badgeIcon: '🥉',
    color: '#B45309',
    bgColor: '#FFEDD5',
    borderColor: '#FB923C',
    stars: 2,
    perksEn: 'Standard VIP Meet & Assist, Boarding Escort Services',
    perksBn: 'স্ট্যান্ডার্ড মিট অ্যান্ড অ্যাসিস্ট ও বোর্ডিং এসকর্ট সার্ভিস',
    perks: 'Standard VIP Meet & Assist, Boarding Escort Services',
    descriptionEn: 'Skilled in standard Meet & Assist, departure canopy reception, and boarding gate escorts.',
    descriptionBn: 'স্ট্যান্ডার্ড মিট অ্যান্ড অ্যাসিস্ট, ক্যানোপি অভ্যর্থনা ও ডিপার্চার গেট এসকর্টে দক্ষ কর্মকর্তা।',
  },
  {
    rankLevel: 3,
    level: 3,
    rankId: 'rank-03',
    nameEn: 'Certified Protocol Specialist',
    nameBn: 'সার্টিফাইড প্রোটোকল স্পেশালিস্ট',
    titleEn: 'Certified Protocol Specialist',
    titleBn: 'সার্টিফাইড প্রোটোকল স্পেশালিস্ট',
    shortEn: 'Rank 3 · Specialist',
    shortBn: '৩য় র‍্যাংক · স্পেশালিস্ট',
    minPoints: 1500,
    maxPoints: 1999,
    badgeIcon: '🔰',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#60A5FA',
    stars: 1.5,
    perksEn: 'Airport Fast-Track Verification, Certified Passenger Guidance',
    perksBn: 'এয়ারপোর্ট ভেরিফাইড প্যাসেঞ্জার গাইডেন্স ও সাধারণ এসকর্ট',
    perks: 'Airport Fast-Track Verification, Certified Passenger Guidance',
    descriptionEn: 'Certified in airport protocol procedures, check-in queue management, and passenger navigation.',
    descriptionBn: 'প্রোটোকল প্রসিডিউরে সার্টিফাইড, চেক-ইন সহায়তা ও সুশৃঙ্খল প্যাসেঞ্জার গাইডেন্স প্রদানকারী।',
  },
  {
    rankLevel: 2,
    level: 2,
    rankId: 'rank-02',
    nameEn: 'Associate Protocol Officer',
    nameBn: 'অ্যাসোসিয়েট প্রোটোকল অফিসার',
    titleEn: 'Associate Protocol Officer',
    titleBn: 'অ্যাসোসিয়েট প্রোটোকল অফিসার',
    shortEn: 'Rank 2 · Associate',
    shortBn: '২য় র‍্যাংক · অ্যাসোসিয়েট',
    minPoints: 1000,
    maxPoints: 1499,
    badgeIcon: '✈️',
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#34D399',
    stars: 1,
    perksEn: 'General Terminal Protocol, Directional & Check-in Support',
    perksBn: 'টার্মিনাল দিকনির্দেশনা ও সাধারণ চেক-ইন সহায়তা',
    perks: 'General Terminal Protocol, Directional & Check-in Support',
    descriptionEn: 'Experienced associate assisting passengers through security gates and terminal check-in halls.',
    descriptionBn: 'টার্মিনাল চেক-ইন হল, লাগেজ ড্রপ ও ডিপার্চার ফ্লোতে অভিজ্ঞ সহযোগী অফিসার।',
  },
  {
    rankLevel: 1,
    level: 1,
    rankId: 'rank-01',
    nameEn: 'Protocol Officer',
    nameBn: 'প্রোটোকল অফিসার',
    titleEn: 'Protocol Officer',
    titleBn: 'প্রোটোকল অফিসার',
    shortEn: 'Rank 1 · Officer',
    shortBn: '১ম র‍্যাংক · প্রোটোকল অফিসার',
    minPoints: 0,
    maxPoints: 999,
    badgeIcon: '📋',
    color: '#475569',
    bgColor: '#F1F5F9',
    borderColor: '#94A3B8',
    stars: 0.5,
    perksEn: 'Standard Protocol Orientation, Initial Meet & Greet, Fast-track airport transit assistance',
    perksBn: 'বেসিক মিট অ্যান্ড গ্রিট, যাত্রী প্রোটোকল সহায়তা ও প্রাথমিক এয়ারপোর্ট ট্রানজিট সেবা',
    perks: 'Standard Protocol Orientation, Initial Meet & Greet, Fast-track airport transit assistance',
    descriptionEn: 'Foundation protocol tier. Every officer starts here, providing verified meet & greet and terminal guidance.',
    descriptionBn: 'প্রারম্ভিক ভিত্তি স্তর। প্রত্যেক অফিসার এখান থেকে কার্যক্রম শুরু করেন এবং যাত্রী সহায়তা প্রদান করেন।',
  },
];

/**
 * Determine rank based on points from the 10-tier hierarchy
 */
export const getOfficerRankByPoints = (totalPoints = 0) => {
  const pts = Math.max(0, Number(totalPoints) || 0);
  for (let i = 0; i < PROTOCOL_OFFICER_RANKS.length; i++) {
    const r = PROTOCOL_OFFICER_RANKS[i];
    if (pts >= r.minPoints) {
      const nextRank = i > 0 ? PROTOCOL_OFFICER_RANKS[i - 1] : null;
      const pointsToNextRank = nextRank ? Math.max(0, nextRank.minPoints - pts) : 0;
      let progressPercent = 100;
      if (nextRank) {
        const range = nextRank.minPoints - r.minPoints;
        const currentProgress = pts - r.minPoints;
        progressPercent = Math.min(100, Math.max(0, Math.round((currentProgress / range) * 100)));
      }
      return {
        ...r,
        currentPoints: pts,
        nextRank: nextRank
          ? {
              rankLevel: nextRank.rankLevel,
              nameEn: nextRank.nameEn,
              nameBn: nextRank.nameBn,
              minPoints: nextRank.minPoints,
              badgeIcon: nextRank.badgeIcon,
            }
          : null,
        pointsToNextRank,
        progressPercent,
      };
    }
  }
  const lowest = PROTOCOL_OFFICER_RANKS[PROTOCOL_OFFICER_RANKS.length - 1];
  return {
    ...lowest,
    currentPoints: pts,
    nextRank: PROTOCOL_OFFICER_RANKS[PROTOCOL_OFFICER_RANKS.length - 2] || null,
    pointsToNextRank: 1000 - pts,
    progressPercent: Math.round((pts / 1000) * 100),
  };
};

/**
 * Calculate an officer's aggregate Earned Points (অর্জিত পয়েন্ট)
 * Combined sum of all 6 criteria:
 * 1. Services Completed (× 10 pts)
 * 2. Customer Rating (× 100 pts)
 * 3. Punctuality Rate (% × 10 pts)
 * 4. Satisfaction Rate (% × 10 pts)
 * 5. Verified Reviews (× 50 pts)
 * 6. Core Competencies & Certifications (× 50 pts)
 */
export const calculateOfficerPoints = (officer, reviews = []) => {
  if (!officer) {
    const defaultRank = PROTOCOL_OFFICER_RANKS[PROTOCOL_OFFICER_RANKS.length - 1];
    return {
      totalPoints: 0,
      rank: defaultRank,
      rankLevel: 1,
      rankTitle: defaultRank.nameEn,
      rankTitleBn: defaultRank.nameBn,
      rankIcon: defaultRank.badgeIcon,
      pointsToNextRank: 1000,
      progressPercent: 0,
      tier: defaultRank.nameEn,
      tierBn: defaultRank.nameBn,
      tierBadgeColor: defaultRank.color,
      tierBgColor: defaultRank.bgColor,
      breakdown: [],
    };
  }

  const servicesCount = Number(officer.completedServices) || 0;
  const servicesPoints = servicesCount * 10;

  const revList = Array.isArray(reviews) && reviews.length > 0 ? reviews : (officer.reviews || []);
  const reviewCount = revList.length;
  const ratingValue = Number(officer.rating) || (
    reviewCount > 0 ? (revList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviewCount) : 5.0
  );
  const ratingPoints = servicesCount > 0 ? Math.round(ratingValue * 100) : 0;

  const punctualityNum = parseFloat(String(officer.punctualityRate || '100%').replace('%', '')) || 100;
  const punctualityPoints = servicesCount > 0 ? Math.round(punctualityNum * 10) : 0;

  const satisfactionNum = parseFloat(String(officer.satisfactionRate || '100%').replace('%', '')) || 100;
  const satisfactionPoints = servicesCount > 0 ? Math.round(satisfactionNum * 10) : 0;

  const reviewsPoints = reviewCount * 50;

  const specialtiesCount = Array.isArray(officer.specialtiesEn) ? officer.specialtiesEn.length : 0;
  const competenciesPoints = servicesCount > 0 ? Math.min(200, specialtiesCount * 50) : 0;

  const calculatedPoints =
    servicesPoints +
    ratingPoints +
    punctualityPoints +
    satisfactionPoints +
    reviewsPoints +
    competenciesPoints;

  const totalPoints =
    officer.totalPoints !== undefined && officer.totalPoints !== null
      ? Number(officer.totalPoints)
      : calculatedPoints;

  // Determine 10-tier Rank from Points
  const rank = getOfficerRankByPoints(totalPoints);

  const tier = rank.nameEn;
  const tierBn = rank.nameBn;
  const tierBadgeColor = rank.color;
  const tierBgColor = rank.bgColor;

  const breakdown = [
    {
      id: 'services',
      titleEn: 'Services Completed',
      titleBn: 'সম্পন্ন প্রোটোকল সার্ভিস',
      formula: `${servicesCount} × 10`,
      points: servicesPoints,
      unitEn: 'Protocols',
      unitBn: 'টি সার্ভিস',
      value: servicesCount,
      icon: '✈️',
      color: '#0284C7',
    },
    {
      id: 'rating',
      titleEn: 'Customer Rating Score',
      titleBn: 'যাত্রীদের রেটিং স্কোর',
      formula: `${ratingValue.toFixed(1)} ★ × 100`,
      points: ratingPoints,
      unitEn: 'Stars',
      unitBn: 'স্টার',
      value: `${ratingValue.toFixed(1)} ★`,
      icon: '⭐',
      color: '#EAB308',
    },
    {
      id: 'punctuality',
      titleEn: 'On-Time Punctuality',
      titleBn: 'সময়নিষ্ঠতা ও অন-টাইম উপস্থিতি',
      formula: `${punctualityNum}% × 10`,
      points: punctualityPoints,
      unitEn: 'Punctuality',
      unitBn: 'পাংচুয়ালিটি',
      value: `${punctualityNum}%`,
      icon: '⏱️',
      color: '#059669',
    },
    {
      id: 'satisfaction',
      titleEn: 'Passenger Satisfaction',
      titleBn: 'যাত্রী সন্তুষ্টি ও পজিটিভ ফিডব্যাক',
      formula: `${satisfactionNum}% × 10`,
      points: satisfactionPoints,
      unitEn: 'Satisfaction',
      unitBn: 'সন্তুষ্টি',
      value: `${satisfactionNum}%`,
      icon: '💖',
      color: '#A21CAF',
    },
    {
      id: 'reviews',
      titleEn: 'Verified Customer Reviews',
      titleBn: 'ভেরিফাইড যাত্রীদের রিভিউ',
      formula: `${reviewCount} × 50`,
      points: reviewsPoints,
      unitEn: 'Reviews',
      unitBn: 'টি রিভিউ',
      value: reviewCount,
      icon: '📝',
      color: '#EA580C',
    },
    {
      id: 'competencies',
      titleEn: 'Core Protocol Skills',
      titleBn: 'বিশেষ দক্ষতা ও প্রশিক্ষণ',
      formula: `${specialtiesCount} × 50`,
      points: competenciesPoints,
      unitEn: 'Competencies',
      unitBn: 'টি দক্ষতা',
      value: specialtiesCount,
      icon: '🎖️',
      color: '#0D9488',
    },
  ];

  return {
    totalPoints,
    rank,
    rankLevel: rank.rankLevel,
    rankTitle: `Rank ${rank.rankLevel}: ${rank.nameEn}`,
    rankTitleBn: `${rank.shortBn}: ${rank.nameBn}`,
    rankIcon: rank.badgeIcon,
    pointsToNextRank: rank.pointsToNextRank,
    progressPercent: rank.progressPercent,
    tier,
    tierBn,
    tierBadgeColor,
    tierBgColor,
    breakdown,
  };
};

/**
 * Fetch full profile of an officer by ID with flexible matching
 */
export const getOfficerProfile = async (officerId, customRoster = null) => {
  let roster = customRoster;
  if (!roster) {
    try {
      const raw = await AsyncStorage.getItem(STAFF_STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) roster = parsed;
      }
    } catch {}
  }
  if (!roster) roster = DEFAULT_STAFF_ROSTER;
  const rawId = String(officerId || 'st-ceo').trim();
  const lowerId = rawId.toLowerCase();
  const upperId = rawId.toUpperCase();

  // 1. Fetch matching family member directly (accurate by ID or Badge)
  let cloudFam = null;
  try {
    cloudFam = await findFamilyMember(rawId);
  } catch (err) {
    console.warn('[officerService] findFamilyMember notice:', err?.message);
  }

  // 2. Match staff accurately from roster
  let matchedStaff = roster.find(s => 
    (s.id && s.id.toLowerCase() === lowerId) ||
    (s.badgeNo && s.badgeNo.toUpperCase() === upperId) ||
    (cloudFam && s.badgeNo && s.badgeNo.toUpperCase() === cloudFam.badgeNo?.toUpperCase()) ||
    (cloudFam && s.serial === cloudFam.serial) ||
    (/^\d+$/.test(rawId) && Number(s.serial) === parseInt(rawId, 10))
  );

  if (!matchedStaff) {
    matchedStaff = roster.find(s => 
      s.name && s.name.toLowerCase() === lowerId
    ) || (cloudFam ? {
      id: cloudFam.id,
      serial: cloudFam.serial,
      badgeNo: cloudFam.badgeNo,
      name: cloudFam.name,
      nameBn: cloudFam.nameBn,
      phone: cloudFam.phone,
      phoneDisplay: cloudFam.phoneDisplay,
      personalPhone: cloudFam.personalPhone,
      email: cloudFam.email,
      gmail: cloudFam.gmail,
      role: cloudFam.rank,
      roleBn: cloudFam.rankBn,
      station: cloudFam.station,
      stationBn: cloudFam.stationBn,
      bloodGroup: cloudFam.bloodGroup,
    } : roster[0]);
  }

  // 3. Build unified officer profile:
  // baseStaff MUST be the authoritative source of truth for identity fields!
  const baseStaff = {
    ...matchedStaff,
    ...(cloudFam ? {
      name: cloudFam.name || matchedStaff.name,
      nameBn: cloudFam.nameBn || matchedStaff.nameBn,
      phone: cloudFam.phone || matchedStaff.phone,
      phoneDisplay: cloudFam.phoneDisplay || matchedStaff.phoneDisplay,
      personalPhone: cloudFam.personalPhone || matchedStaff.personalPhone,
      email: cloudFam.email || matchedStaff.email,
      gmail: cloudFam.gmail || matchedStaff.gmail,
      role: cloudFam.rank || cloudFam.role || matchedStaff.role,
      roleBn: cloudFam.rankBn || cloudFam.roleBn || matchedStaff.roleBn,
      department: cloudFam.department || matchedStaff.department,
      departmentBn: cloudFam.departmentBn || matchedStaff.departmentBn,
      station: cloudFam.station || matchedStaff.station,
      stationBn: cloudFam.stationBn || matchedStaff.stationBn,
      bloodGroup: cloudFam.bloodGroup || matchedStaff.bloodGroup,
      badgeNo: cloudFam.badgeNo || matchedStaff.badgeNo,
      licenseNo: cloudFam.licenseNo || matchedStaff.licenseNo,
    } : {}),
    photo: cloudFam?.photo || matchedStaff.photo || null,
    avatar: cloudFam?.photo || matchedStaff.photo || cloudFam?.avatar || matchedStaff.avatar || '🧑‍✈️',
  };

  const badgeTarget = baseStaff.badgeNo || baseStaff.id;

  // Safe supplementary metadata (do NOT overwrite name, badge, or emergency contact!)
  const meta = {
    experienceYears: 4,
    punctualityRate: '99.8%',
    satisfactionRate: '99.5%',
    specialtiesEn: ['Airport Protocol', 'Passenger Meet & Greet', 'Fast-Track Escort'],
    specialtiesBn: ['বিমানবন্দর প্রোটোকল', 'যাত্রী অভ্যর্থনা ও সেবা', 'ফাস্ট-ট্র্যাক এসকর্ট'],
    airportFullNameEn: 'Hazrat Shahjalal International Airport, Dhaka (DAC)',
    airportFullNameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)',
  };

  const reviews = await getOfficerReviews(badgeTarget);
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1)
    : (baseStaff.rating || 4.9).toFixed(1);

  const qrData = generateOfficerQrData(badgeTarget);

  const officerBase = {
    ...meta,
    ...baseStaff,
    badgeNo: badgeTarget,
    emergencyContact: baseStaff.personalPhone || baseStaff.phone,
    reviews,
    reviewCount: totalReviews,
    rating: Number(avgRating),
    qrData,
  };

  const pointsData = calculateOfficerPoints(officerBase, reviews);

  return {
    ...officerBase,
    points: pointsData,
    totalPoints: pointsData.totalPoints,
    rank: pointsData.rank,
    rankLevel: pointsData.rankLevel,
    rankTitle: pointsData.rankTitle,
    rankTitleBn: pointsData.rankTitleBn,
    tier: pointsData.tier,
    tierBn: pointsData.tierBn,
    tierBadgeColor: pointsData.tierBadgeColor,
    tierBgColor: pointsData.tierBgColor,
  };
};

/**
 * Get all reviews for a specific officer
 */
export const getOfficerReviews = async (officerId) => {
  const safeId = String(officerId || 'st-1').trim();
  let stored = {};
  try {
    const raw = await AsyncStorage.getItem(OFFICER_REVIEWS_STORAGE);
    if (raw) stored = JSON.parse(raw);
  } catch {}

  const dynamicReviews = stored[safeId] || [];
  const defaultReviews = DEFAULT_OFFICER_REVIEWS[safeId] || [];

  // Merge dynamic reviews on top of defaults (deduplicating by id)
  const combined = [...dynamicReviews];
  defaultReviews.forEach(def => {
    if (!combined.some(r => r.id === def.id)) {
      combined.push(def);
    }
  });

  return combined;
};

/**
 * Add a new customer review for a protocol officer
 */
export const addOfficerReview = async (officerId, reviewData) => {
  const safeId = String(officerId || 'st-1').trim();
  let stored = {};
  try {
    const raw = await AsyncStorage.getItem(OFFICER_REVIEWS_STORAGE);
    if (raw) stored = JSON.parse(raw);
  } catch {}

  const currentList = stored[safeId] || [];
  const newReview = {
    id: `rev-${Date.now()}`,
    reviewerName: reviewData.reviewerName || 'Valued Passenger',
    reviewerCity: reviewData.reviewerCity || 'Dhaka, Bangladesh',
    flight: reviewData.flight ? reviewData.flight.toUpperCase() : 'Commercial Flight',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    rating: Number(reviewData.rating) || 5,
    serviceType: reviewData.serviceType || 'Airport Protocol Service',
    commentEn: reviewData.commentEn || reviewData.comment || 'Excellent airport protocol service!',
    commentBn: reviewData.commentBn || reviewData.comment || 'অত্যন্ত চমৎকার ও আন্তরিক প্রোটোকল সেবা!',
    verifiedPassenger: true,
  };

  stored[safeId] = [newReview, ...currentList];

  try {
    await AsyncStorage.setItem(OFFICER_REVIEWS_STORAGE, JSON.stringify(stored));
  } catch {}

  return newReview;
};

