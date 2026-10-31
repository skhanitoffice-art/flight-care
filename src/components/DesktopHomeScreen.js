import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DesktopHeader from './DesktopHeader';
import DesktopFooter from './DesktopFooter';
import {
  ArrivalIcon,
  DepartureIcon,
  LocationPinIcon,
  CalendarIcon,
  UserIcon,
  StandardPkgIcon,
  PremiumPkgIcon,
  VipPkgIcon,
  StarCoinIcon,
  ChevronRight,
  GiftIcon,
  CheckCircleIcon,
  AdditionalServicesIcon,
} from './Icons';
import { SERVICES, getAddonAsset } from '../constants/data';
import DatePickerModal from './DatePickerModal';
import AdditionalServicesModal from './AdditionalServicesModal';
import AnimatedServiceCard from './AnimatedServiceCard';
import { isValidFlightNumber, isValidFlightDate, createAddonDetails } from '../utils/helpers';
import {
  searchFlightSuggestions,
  getLiveFlightStatus,
  isPastFlightDate,
  searchLiveFlightsFromAviationStack,
} from '../services/flightService';
import CustomerRewardsCard from './CustomerRewardsCard';

const getFeaturedAirportServices = (lang = 0) => [
  {
    id: 'bb2car',
    cat: 'arr',
    badge: lang ? '★ সর্বাধিক জনপ্রিয়' : '★ Most Popular',
    category: lang ? 'ভিআইপি অ্যারাইভাল' : 'VIP Arrival',
    image: require('../../assets/arrival_icon.png'),
    n: ['Boarding Bridge to Car', 'বোর্ডিং ব্রিজ থেকে গাড়ি পর্যন্ত'],
    d: [
      'Meet at the boarding bridge, assist through immigration and baggage collection, guide through customs, and escort to your vehicle.',
      'বোর্ডিং ব্রিজ গেটে প্রটোকল অফিসারের অভ্যর্থনা, দ্রুত ইমিগ্রেশন ও লাগেজ সংগ্রহ এবং গাড়ি পর্যন্ত সরাসরি পৌঁছে দেওয়া।'
    ],
    p: 1500,
    priceUnit: 'package',
    features: lang ? [
      'বোর্ডিং ব্রিজে ব্যক্তিগত অফিসারের অভ্যর্থনা',
      'ইমিগ্রেশন ও কাস্টমস ডেস্কে অগ্রাধিকার গাইডেন্স',
      'লাগেজ কালেকশন ও গাড়িতে নিরাপদে পৌঁছে দেওয়া',
    ] : [
      'Dedicated Protocol Officer at Boarding Bridge',
      'Priority Guidance at Immigration & Customs',
      'Baggage Carousel Porter & Escort to Vehicle',
    ]
  },
  {
    id: 'gate2bb',
    cat: 'dep',
    badge: lang ? 'ডিপার্চার স্পেশাল' : 'Departure Special',
    category: lang ? 'ভিআইপি ডিপার্চার' : 'VIP Departure',
    image: require('../../assets/departure_icon.png'),
    n: ['Entry Gate to Boarding Bridge', 'মেইন গেট থেকে বোর্ডিং ব্রিজ'],
    d: [
      'Meet at entry gate, baggage drop & check-in assistance, fast-track immigration escort up to the boarding bridge.',
      'বিমানবন্দর মেইন গেটে অভ্যর্থনা, লাগেজ ড্রপ ও বোর্ডিং পাস সহায়তা এবং ইমিগ্রেশন পার হয়ে ব্রিজ পর্যন্ত পৌঁছে দেওয়া।'
    ],
    p: 1500,
    priceUnit: 'package',
    features: lang ? [
      'বিমানবন্দর ১ নম্বর এন্ট্রি গেটে অফিসার অভ্যর্থনা',
      'এয়ারলাইন চেক-ইন ও বোর্ডিং পাস দ্রুত সংগ্রহ',
      'নিরাপত্তা ক্লিয়ারেন্স ও বোর্ডিং ব্রিজ পর্যন্ত এসকর্ট',
    ] : [
      'Terminal Entry Gate Protocol Reception',
      'Check-in & Priority Boarding Pass Assistance',
      'Security Check & Aerobridge Escort',
    ]
  },
  {
    id: 'wheel',
    cat: 'arr',
    badge: lang ? 'বিশেষ যত্ন' : 'Special Care',
    category: lang ? 'কেয়ার প্রটোকল' : 'Care Protocol',
    image: require('../../assets/wheelchair.webp'),
    n: ['Wheelchair Assistance', 'হুইলচেয়ার ও বয়োজ্যেষ্ঠ সহায়তা'],
    d: [
      'Mobility assistance with a dedicated wheelchair and trained helper throughout the airport.',
      'বিমানবন্দরে চলাচল সুবিধার জন্য প্রস্তুত হুইলচেয়ার এবং সার্বক্ষণিক ট্রেইন্ড হেল্পার দ্বারা বিশেষ যত্ন।'
    ],
    p: 300,
    priceUnit: 'person',
    features: lang ? [
      'গেটে প্রস্তুত আরামদায়ক হুইলচেয়ার ও হেল্পার',
      'ইমিগ্রেশন ও টার্মিনালে সার্বক্ষণিক চলাচল সহায়তা',
      'বয়োজ্যেষ্ঠ ও অসুস্থ যাত্রীদের বিশেষ কমফোর্ট',
    ] : [
      'Ready-to-use Wheelchair & Dedicated Helper',
      'Full Transit Assistance through Terminal',
      'Priority Comfort for Elderly & Patients',
    ]
  },
  {
    id: 'visa',
    cat: 'arr',
    badge: lang ? 'ডকুমেন্ট সাপোর্ট' : 'Document Support',
    category: lang ? 'অন-অ্যারাইভাল ভিসা' : 'Visa Assistance',
    image: require('../../assets/visa_immigration.webp'),
    n: ['Visa On Arrival Support', 'অন-অ্যারাইভাল ভিসা প্রটোকল'],
    d: [
      'Document pre-verification & visa on arrival support by experienced airport protocol officers.',
      'প্রয়োজনীয় কাগজপত্র প্রি-ভেরিফিকেশন, ইমিগ্রেশন ডেস্ক সহায়তা ও দ্রুত ভিসা ছাড়পত্রে অফিসার সাপোর্ট।'
    ],
    p: 1500,
    priceUnit: 'person',
    features: lang ? [
      'আগমনের পূর্বেই ট্রাভেল ডকুমেন্ট যাচাইকরণ',
      'অন-অ্যারাইভাল ভিসা ডেস্কে অফিসার গাইডেন্স',
      'ঝামেলাহীন ও দ্রুত সরকারি কাউন্টার ক্লিয়ারেন্স',
    ] : [
      'Pre-Arrival Document Verification Protocol',
      'Direct Visa Counter Officer Escort',
      'Fast Government Clearance without Delays',
    ]
  },
  {
    id: 'wrap',
    cat: 'dep',
    badge: lang ? 'নিরাপত্তা শিল্ড' : 'Luggage Shield',
    category: lang ? 'লাগেজ সুরক্ষা' : 'Luggage Wrap',
    image: require('../../assets/luggage_wrapping.webp'),
    n: ['Luggage Wrapping', 'লাগেজ সুরক্ষা ও র‍্যাপিং'],
    d: [
      'Secure multi-layer protective wrapping charged by the number of bags to prevent damage or theft.',
      'আন্তর্জাতিক মানের প্রিমিয়াম প্রটেকটিভ ফিল্ম র‍্যাপিং, লাগেজ চুরি ও ক্ষতি রোধ এবং ট্যাগিং সহায়তা।'
    ],
    p: 400,
    priceUnit: 'bag',
    features: lang ? [
      'প্রিমিয়াম কোয়ালিটি ডাবল ফিল্ম প্রটেকটিভ র‍্যাপ',
      'চুরি ও অনাকাঙ্ক্ষিত খোলা থেকে শতভাগ সুরক্ষা',
      'সহজ শনাক্তকরণ ও এয়ারপোর্ট ট্যাগিং সহায়তা',
    ] : [
      'High-Grade Double Protective Film Wrap',
      '100% Tamper, Scratch & Theft Protection',
      'Fast Bag Tagging & Identification Help',
    ]
  },
  {
    id: 'transfer',
    cat: 'arr',
    badge: lang ? '২৪/৭ অন-কল' : '24/7 Available',
    category: lang ? 'এয়ারপোর্ট গাড়ি' : 'Airport Car',
    image: require('../../assets/rent_car.webp'),
    n: ['Rent a Car / Airport Transfer', 'প্রাইভেট এয়ারপোর্ট গাড়ি ভাড়া'],
    d: [
      'Choose airport pickup, drop-off, and a private AC vehicle (Sedan, Noah, HiAce) with vetted driver.',
      'আধুনিক এসি সেডান কার, নোয়া ও হাইয়েস মাইক্রোবাস, বিশ্বস্ত ড্রাইভার এবং সারাদেশে ড্রপ-অফ।'
    ],
    p: null,
    priceUnit: 'quote',
    features: lang ? [
      'প্রিমিয়াম এসি সেডান, নোয়া ও হাইয়েস মাইক্রোবাস',
      'প্রশিক্ষিত ও পেশাদার এয়ারপোর্ট ড্রাইভার',
      'ঢাকা শহরসহ সারাদেশে অন-টাইম ড্রপ-অফ',
    ] : [
      'Executive Sedan, Noah & HiAce AC Fleet',
      'Vetted Professional Airport Chauffeurs',
      'On-Time Drop-off in Dhaka & Nationwide',
    ]
  },
  {
    id: 'print',
    cat: 'dep',
    badge: lang ? 'ইনস্ট্যান্ট প্রিন্ট' : 'Instant Print',
    category: lang ? 'জরুরি প্রিন্ট' : 'Document Print',
    image: require('../../assets/printer.webp'),
    n: ['Document Print & Photocopy', 'জরুরি প্রিন্ট ও ফটোকপি'],
    d: [
      'Printing & photocopying boarding passes, visas, tickets, and essential travel documents.',
      'বোর্ডিং পাস, ই-ভিসা, টিকিট ও ট্রাভেল ডকুমেন্টস বিমানবন্দরে তাৎক্ষণিক প্রিন্ট এবং ফটোকপি সুবিধা।'
    ],
    p: 100,
    priceUnit: 'request',
    features: lang ? [
      'বোর্ডিং পাস ও ই-ভিসা তাৎক্ষণিক কালার প্রিন্ট',
      'পাসপোর্ট ও জরুরি ডকুমেন্টস ফটোকপি সুবিধা',
      'ফ্লাইটের আগে কাউন্টারেই ডকুমেন্ট হ্যান্ডওভার',
    ] : [
      'Instant Color Print for Boarding Pass & Visa',
      'Quick Passport & Travel Document Photocopy',
      'Immediate Counter Delivery Before Flight',
    ]
  },
  {
    id: 'security',
    cat: 'dep',
    badge: lang ? 'ভিআইপি প্রটোকল' : 'VIP Protocol',
    category: lang ? 'কাস্টমস প্রটোকল' : 'Fast-Track',
    image: require('../../assets/security_protocol.webp'),
    n: ['Fast-Track Security Protocol', 'ফাস্ট-ট্র্যাক সিকিউরিটি ও কাস্টমস'],
    d: [
      'Request airport security protocol assistance and expedited clearance through customs channels.',
      'বিমানবন্দরে বিশেষ প্রটোকল ক্লিয়ারেন্স, কাস্টমস চ্যানেল দিয়ে দ্রুত প্রস্থান এবং অফিসিয়াল সঙ্গী।'
    ],
    p: null,
    priceUnit: 'quote',
    features: lang ? [
      'গ্রিন চ্যানেল কাস্টমস ক্লিয়ারেন্স সহায়তা',
      'স্পেশাল সিকিউরিটি প্রটোকল অফিসার এসকর্ট',
      'লম্বা লাইনের ঝামেলা ছাড়াই নিরবচ্ছিন্ন ছাড়পত্র',
    ] : [
      'Green Channel Fast-Track Clearance Support',
      'Dedicated Airport Protocol Officer Escort',
      'Zero Queue Hassle-Free Terminal Transition',
    ]
  },
];

export default function DesktopHomeScreen({
  lang = 0,
  setLang,
  airport,
  setAirport,
  serviceCatalog = [],
  addonCatalog = [],
  startBooking,
  customerSession,
  setTab,
  setWiz,
  setDetail,
  setShowAirportModal,
  profile,
  onPressOfficers,
  navigateToSubPage,
  notifications = [],
  openAuthView,
}) {
  const [direction, setDirection] = useState('arr'); // 'arr' | 'dep'
  const [flightNumber, setFlightNumber] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState('business'); // Default: 'business' (Premium 1000 Tk)
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [addonDetails, setAddonDetails] = useState(createAddonDetails());
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [hoveredPackage, setHoveredPackage] = useState(null);
  const [hoveredAddonCard, setHoveredAddonCard] = useState(false);
  const [flightSuggestions, setFlightSuggestions] = useState([]);
  const [showFlightSuggestions, setShowFlightSuggestions] = useState(false);
  const [selectedFlightData, setSelectedFlightData] = useState(null);
  const [isSearchingAviation, setIsSearchingAviation] = useState(false);
  const [errors, setErrors] = useState({});
  const searchDebounceTimer = useRef(null);

  const handleFlightInputChange = (rawVal, customDir = null) => {
    const dirToUse = customDir || direction;
    const upper = (rawVal || '').toUpperCase();
    setFlightNumber(upper);
    setSelectedFlightData(null);

    if (upper.trim()) {
      // 1. Instant local matches (0ms response) strictly for Dhaka
      const localMatches = searchFlightSuggestions(upper, dirToUse);
      setFlightSuggestions(localMatches);
      setShowFlightSuggestions(localMatches.length > 0);

      // 2. Debounced query to AviationStack Live API strictly for Dhaka
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
      searchDebounceTimer.current = setTimeout(async () => {
        try {
          setIsSearchingAviation(true);
          const liveResults = await searchLiveFlightsFromAviationStack(upper, dirToUse);
          if (liveResults && liveResults.length > 0) {
            const seen = new Set();
            const merged = [];
            for (const f of liveResults) {
              if (!seen.has(f.fno)) {
                seen.add(f.fno);
                merged.push(f);
              }
            }
            for (const f of localMatches) {
              if (!seen.has(f.fno)) {
                seen.add(f.fno);
                merged.push(f);
              }
            }
            setFlightSuggestions(merged.slice(0, 10));
            setShowFlightSuggestions(true);
          }
        } catch (e) {
          console.warn('AviationStack search error:', e);
        } finally {
          setIsSearchingAviation(false);
        }
      }, 350);

      if (isValidFlightNumber(upper)) {
        setErrors(e => ({ ...e, flightNumber: null }));
      } else if (errors.flightNumber || upper.trim().length >= 3) {
        setErrors(e => ({
          ...e,
          flightNumber: lang
            ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
            : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)',
        }));
      }
    } else {
      setFlightSuggestions([]);
      setShowFlightSuggestions(false);
      setErrors(e => ({ ...e, flightNumber: null }));
    }
  };

  const handleBookNow = () => {
    const newErrors = {};
    const trimmedFlight = (flightNumber || '').trim();
    const trimmedDate = (serviceDate || '').trim();

    if (!trimmedFlight) {
      newErrors.flightNumber = lang
        ? 'অনুগ্রহ করে ফ্লাইট নম্বর দিন (যেমন: BG-084, EK-582)'
        : 'Please enter flight number (e.g. BG-084, EK-582)';
    } else if (!isValidFlightNumber(trimmedFlight)) {
      newErrors.flightNumber = lang
        ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
        : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)';
    }

    if (!trimmedDate) {
      newErrors.serviceDate = lang
        ? 'অনুগ্রহ করে সেবার তারিখ নির্বাচন করুন'
        : 'Please select service date';
    } else if (!isValidFlightDate(trimmedDate)) {
      newErrors.serviceDate = lang
        ? 'সঠিক তারিখ দিন (DD-MM-YYYY)'
        : 'Enter a valid date (DD-MM-YYYY)';
    } else if (isPastFlightDate(trimmedDate)) {
      newErrors.serviceDate = lang
        ? 'অতীতের কোনো তারিখ নির্বাচন করা যাবে না'
        : 'Cannot select a past date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const matchedService =
      (serviceCatalog && serviceCatalog.length ? serviceCatalog : SERVICES).find(
        s => s.cat === direction
      ) || SERVICES[0];

    const liveInfo = (selectedFlightData && selectedFlightData.direction === direction)
      ? selectedFlightData
      : getLiveFlightStatus(trimmedFlight, direction);

    if (startBooking) {
      startBooking(
        matchedService,
        selectedAddons,
        selectedPackage,
        direction,
        {
          fno: liveInfo?.fno || trimmedFlight.toUpperCase(),
          airline: liveInfo?.airline || '',
          airlineBn: liveInfo?.airlineBn || '',
          route: liveInfo?.route || '',
          origin: liveInfo?.origin || '',
          originBn: liveInfo?.originBn || '',
          destination: liveInfo?.destination || '',
          destinationBn: liveInfo?.destinationBn || '',
          terminal: liveInfo?.terminal || '',
          terminalBn: liveInfo?.terminalBn || '',
          gate: liveInfo?.gate || '',
          time: liveInfo?.scheduled || '',
          scheduled: liveInfo?.scheduled || '',
          status: liveInfo?.status || '',
          liveRadar: !!liveInfo?.liveRadar,
          date: trimmedDate,
          passengers: passengerCount,
          name: '',
          phone: '',
          email: '',
          addonDetails,
        }
      );
    }
  };

  const handleProceedBookingFromModal = (customAddons = selectedAddons, customDetails = addonDetails, options = {}) => {
    const trimmedFlight = (flightNumber || '').trim();
    const trimmedDate = (serviceDate || '').trim();
    const matchedService =
      (serviceCatalog && serviceCatalog.length ? serviceCatalog : SERVICES).find(
        s => s.cat === direction
      ) || SERVICES[0];

    const liveInfo = (selectedFlightData && selectedFlightData.direction === direction)
      ? selectedFlightData
      : (trimmedFlight ? getLiveFlightStatus(trimmedFlight, direction) : null);

    const isOnlyAddons = Boolean(options?.onlyAddons);

    if (startBooking) {
      startBooking(
        matchedService,
        customAddons,
        isOnlyAddons ? 'addons_only' : selectedPackage,
        direction,
        {
          fno: liveInfo?.fno || (trimmedFlight ? trimmedFlight.toUpperCase() : ''),
          airline: liveInfo?.airline || '',
          airlineBn: liveInfo?.airlineBn || '',
          route: liveInfo?.route || '',
          origin: liveInfo?.origin || '',
          originBn: liveInfo?.originBn || '',
          destination: liveInfo?.destination || '',
          destinationBn: liveInfo?.destinationBn || '',
          terminal: liveInfo?.terminal || '',
          terminalBn: liveInfo?.terminalBn || '',
          gate: liveInfo?.gate || '',
          time: liveInfo?.scheduled || '',
          scheduled: liveInfo?.scheduled || '',
          status: liveInfo?.status || '',
          liveRadar: !!liveInfo?.liveRadar,
          date: trimmedDate,
          passengers: passengerCount,
          name: '',
          phone: '',
          email: '',
          addonDetails: customDetails,
          onlyAddons: isOnlyAddons,
        }
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* 1. Desktop Top Header */}
      <DesktopHeader
        lang={lang}
        setLang={setLang}
        customerSession={customerSession}
        setTab={setTab}
        tab="home"
        setWiz={setWiz}
        setDetail={setDetail}
        mode="home"
        onPressSignIn={() => {
          setTab('profile');
          if (!customerSession && openAuthView) openAuthView('login');
        }}
        setShowServicesModal={setShowServicesModal}
        airport={airport}
        setShowAirportModal={setShowAirportModal}
        onPressOfficers={onPressOfficers}
        navigateToSubPage={navigateToSubPage}
        notifications={notifications}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {/* 2. Main Hero Section (Image 1 Split Layout) */}
        <View
          style={{
            width: '100%',
            backgroundColor: '#F1F5F9',
            paddingVertical: 36,
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 1200,
              paddingHorizontal: 24,
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 36,
            }}
          >
            {/* Left Column: Headline & Concierge Photo */}
            <View style={{ flex: 1.1, paddingTop: 12 }}>
              {/* Official Brand Badge */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 24,
                  alignSelf: 'flex-start',
                  borderWidth: 1.5,
                  borderColor: '#E2E8F0',
                  marginBottom: 20,
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                  elevation: 2,
                }}
              >
                <Image
                  source={require('../../assets/hsia_logo.png')}
                  style={{ width: 32, height: 32, resizeMode: 'contain' }}
                />
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F2A4A' }}>
                  Flight Care <Text style={{ color: '#0284C7', fontWeight: '700' }}>• Approved by Hazrat Shahjalal International Airport (HSIA)</Text>
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 46,
                  fontWeight: '900',
                  color: '#0F172A',
                  lineHeight: 52,
                  letterSpacing: -1,
                }}
              >
                {lang ? 'আপনার যাত্রা।' : 'Your journey.'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                <Text
                  style={{
                    fontSize: 46,
                    fontWeight: '900',
                    color: '#0284C7',
                    lineHeight: 52,
                    letterSpacing: -1, 
                  }}
                >
                  {lang ? 'আমাদের যত্ন।' : 'Our care.'}
                </Text>
              </View>

              {/* Gold underline accent under "Our" */}
              <View
                style={{
                  width: 44,
                  height: 4,
                  backgroundColor: '#F59E0B',
                  borderRadius: 2,
                  marginTop: 6,
                  marginBottom: 12,
                }}
              />

              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#334155',
                  marginBottom: 20,
                  letterSpacing: -0.3,
                }}
              >
                {lang ? 'বিমানবন্দরে মিট অ্যান্ড গ্রিট সেবা - ঢাকা' : 'Airport Meet & Greet in Dhaka'}
              </Text>

              {/* Hostess and couple photograph */}
              <View
                style={{
                  width: '100%',
                  borderRadius: 18,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.08,
                  shadowRadius: 14,
                  backgroundColor: '#E2E8F0',
                }}
              >
                <Image
                  source={require('../../assets/concierge_couple.jpg')}
                  style={{ width: '100%', height: 320 }}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Right Column: Floating White Booking Card */}
            <View
              style={{
                flex: 0.95,
                maxWidth: 510,
                width: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 24,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.08,
                shadowRadius: 24,
                elevation: 6,
              }} 
            >
              {/* Card Title */}
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '800',
                  color: '#0F172A',
                  marginBottom: 16,
                  letterSpacing: -0.4,
                }}
              >
                {lang ? 'আপনার বিমানবন্দর সেবা বুক করুন' : 'Book your airport assistance'}
              </Text>

              {/* Customer Rewards / Loyalty Banner */}
              <CustomerRewardsCard
                customerSession={customerSession}
                lang={lang}
                setTab={setTab}
                compact={true}
              />

              {/* Direction Toggle: Arrival vs Departure */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#F1F5F9',
                  borderRadius: 12,
                  padding: 4,
                  marginBottom: 16,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 10,
                    borderRadius: 9,
                    backgroundColor: direction === 'arr' ? '#0284C7' : 'transparent',
                  }}
                  onPress={() => {
                    setDirection('arr');
                    setSelectedFlightData(null);
                    if (flightNumber.trim()) {
                      handleFlightInputChange(flightNumber, 'arr');
                    }
                  }}
                >
                  <ArrivalIcon size={24} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: direction === 'arr' ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {lang ? 'আগমন' : 'Arrival'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 10,
                    borderRadius: 9,
                    backgroundColor: direction === 'dep' ? '#0284C7' : 'transparent',
                  }}
                  onPress={() => {
                    setDirection('dep');
                    setSelectedFlightData(null);
                    if (flightNumber.trim()) {
                      handleFlightInputChange(flightNumber, 'dep');
                    }
                  }}
                >
                  <DepartureIcon size={24} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: direction === 'dep' ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {lang ? 'প্রস্থান' : 'Departure'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Airport Card - Fixed to Dhaka Hazrat Shahjalal International Airport */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#E2E8F0',
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  marginBottom: 14,
                  gap: 10,
                }}
              >
                <LocationPinIcon size={18} color="#0284C7" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13.5,
                      fontWeight: '700',
                      color: '#0F172A',
                    }}
                    numberOfLines={1}
                  >
                    {lang ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর' : 'Hazrat Shahjalal International Airport'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                    {lang ? 'ঢাকা • ডিএসি (DAC)' : 'Dhaka • DAC'}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: '#F0F9FF',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#BAE6FD',
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0284C7' }}>
                    DAC
                  </Text>
                </View>
              </View>

              {/* 3 Inputs in a Row: Flight number, Service date, Passengers */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16, zIndex: 50 }}>
                {/* Flight Number (EditText with validation & Auto-Complete) */}
                <View style={{ flex: 1.1, position: 'relative', zIndex: 100 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', marginBottom: 5 }}>
                    {lang ? 'ফ্লাইট নম্বর *' : 'Flight number *'}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: errors.flightNumber
                        ? '#EF4444'
                        : (flightNumber.trim() && isValidFlightNumber(flightNumber) ? '#10B981' : '#CBD5E1'),
                      borderRadius: 10,
                      backgroundColor: errors.flightNumber ? '#FEF2F2' : '#FFFFFF',
                      paddingHorizontal: 9,
                      height: 42,
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#0F172A' }}>✈</Text>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: '700',
                        color: '#0F172A',
                        padding: 0,
                        outlineStyle: 'none',
                      }}
                      value={flightNumber}
                      onFocus={() => {
                        if (flightNumber.trim()) {
                          handleFlightInputChange(flightNumber);
                        }
                      }}
                      onChangeText={handleFlightInputChange}
                      onBlur={() => {
                        if (flightNumber.trim() && !isValidFlightNumber(flightNumber)) {
                          setErrors(e => ({
                            ...e,
                            flightNumber: lang
                              ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
                              : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)',
                          }));
                        }
                        setTimeout(() => setShowFlightSuggestions(false), 250);
                      }}
                      placeholder={lang ? 'যেমন: BG-084, EK-582' : 'e.g. BG-084, EK-582'}
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                    />
                  </View>
                  {errors.flightNumber ? (
                    <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                      ⚠️ {errors.flightNumber}
                    </Text>
                  ) : flightNumber.trim() && isValidFlightNumber(flightNumber) ? (
                    <Text style={{ color: '#059669', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                      ✓ {lang ? 'বৈধ ফ্লাইট নম্বর' : 'Valid flight number'}
                    </Text>
                  ) : null}

                  {/* Floating Auto-Complete Suggestions Box */}
                  {showFlightSuggestions && flightSuggestions.length > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 66,
                        left: 0,
                        right: -160,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: '#0284C7',
                        shadowColor: '#0F172A',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.18,
                        shadowRadius: 12,
                        elevation: 10,
                        zIndex: 9999,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: '#F0F9FF',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderBottomWidth: 1,
                          borderBottomColor: '#BAE6FD',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#0369A1' }}>
                            {lang ? '✈️ লাইভ রাডার ও জনপ্রিয় সাজেশন' : '✈️ LIVE RADAR & FLIGHT SUGGESTIONS'}
                          </Text>
                          {isSearchingAviation && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <ActivityIndicator size="small" color="#0284C7" />
                              <Text style={{ fontSize: 9.5, color: '#0284C7', fontWeight: '700' }}>
                                {lang ? 'লাইভ স্ক্যান...' : 'Scanning...'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity onPress={() => setShowFlightSuggestions(false)}>
                          <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      {flightSuggestions.map((item, idx) => (
                        <TouchableOpacity
                          key={`${item.fno}_${idx}`}
                          activeOpacity={0.7}
                          onPress={() => {
                            setFlightNumber(item.fno);
                            setSelectedFlightData(item);
                            if (item.date && !serviceDate) {
                              setServiceDate(item.date);
                              setErrors(e => ({ ...e, serviceDate: null }));
                            }
                            setShowFlightSuggestions(false);
                            setErrors(e => ({ ...e, flightNumber: null }));
                          }}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderBottomWidth: idx === flightSuggestions.length - 1 ? 0 : 1,
                            borderBottomColor: '#F1F5F9',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: item.liveRadar ? '#F8FAFC' : '#FFFFFF',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 16 }}>{item.logo}</Text>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>{item.fno}</Text>
                                {item.liveRadar && (
                                  <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1, borderColor: '#86EFAC' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#15803D' }}>
                                      ● {lang ? 'লাইভ রাডার' : 'Live Radar'}
                                    </Text>
                                  </View>
                                )}
                                <Text style={{ fontSize: 11.5, color: '#475569', fontWeight: '600' }} numberOfLines={1}>
                                  {lang ? item.airlineBn : item.airline}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>
                                {lang ? `${item.originBn || item.origin} ➔ ${item.destinationBn || item.destination}` : `${item.origin} ➔ ${item.destination}`}
                                {item.scheduled ? ` • ⏱️ ${item.scheduled}` : ''}
                              </Text>
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 2 }}>
                            <View style={{ backgroundColor: '#F0F9FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#BAE6FD' }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#0369A1' }}>{item.terminal}</Text>
                            </View>
                            {item.status ? (
                              <Text style={{ fontSize: 9.5, color: '#10B981', fontWeight: '700' }}>
                                {lang ? item.statusBn || item.status : item.status}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Service Date (EditText + Date Picker Modal) */}
                <View style={{ flex: 1.1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', marginBottom: 5 }}>
                    {lang ? 'সেবার তারিখ *' : 'Service date *'}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowDateModal(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderWidth: 1.5,
                      borderColor: errors.serviceDate
                        ? '#EF4444'
                        : (serviceDate.trim() && isValidFlightDate(serviceDate) ? '#10B981' : '#CBD5E1'),
                      borderRadius: 10,
                      backgroundColor: errors.serviceDate ? '#FEF2F2' : '#FFFFFF',
                      paddingHorizontal: 9,
                      height: 42,
                      cursor: 'pointer',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <CalendarIcon size={16} color="#0284C7" />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: serviceDate ? '700' : '500',
                          color: serviceDate ? '#0F172A' : '#94A3B8',
                        }}
                        numberOfLines={1}
                      >
                        {serviceDate || (lang ? 'তারিখ নির্বাচন করুন' : 'Select service date')}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                        borderRadius: 4,
                        backgroundColor: '#F0F9FF',
                        borderWidth: 1,
                        borderColor: '#BAE6FD',
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>📅</Text>
                    </View>
                  </TouchableOpacity>
                  {errors.serviceDate ? (
                    <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                      ⚠️ {errors.serviceDate}
                    </Text>
                  ) : serviceDate.trim() && isValidFlightDate(serviceDate) ? (
                    <Text style={{ color: '#059669', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                      ✓ {lang ? 'বৈধ তারিখ' : 'Valid date'}
                    </Text>
                  ) : null}
                </View>

                {/* Passengers */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', marginBottom: 5 }}>
                    {lang ? 'যাত্রী সংখ্যা' : 'Passengers'}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setPassengerCount(c => (c >= 5 ? 1 : c + 1))}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 9,
                      height: 42,
                      gap: 5,
                    }}
                  >
                    <UserIcon size={14} color="#64748B" />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 12,
                        fontWeight: '600',
                        color: '#0F172A',
                      }}
                      numberOfLines={1}
                    >
                      {passengerCount} {lang ? 'জন যাত্রী' : passengerCount === 1 ? 'adult' : 'adults'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>▾</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Real-Time Live Flight Info Status Preview Card */}
              {flightNumber.trim() && isValidFlightNumber(flightNumber) ? (
                (() => {
                  const live = (selectedFlightData && selectedFlightData.direction === direction)
                    ? selectedFlightData
                    : getLiveFlightStatus(flightNumber, direction);
                  if (!live) return null;
                  return (
                    <View
                      style={{
                        backgroundColor: '#F0FDF4',
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1.5,
                        borderColor: '#86EFAC',
                        marginBottom: 14,
                        shadowColor: '#10B981',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 16 }}>{live.logo}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>
                            {live.fno} • {lang ? live.airlineBn : live.airline}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {live.liveRadar && (
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' }} />
                          )}
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#15803D' }}>
                            {lang ? live.statusBn : live.status}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '600' }}>
                          📍 {lang ? live.routeBn : live.route}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#166534', fontWeight: '700' }}>
                          🏢 {lang ? live.terminalBn : live.terminal}
                        </Text>
                      </View>
                      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#DCFCE7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, color: '#15803D' }}>
                          🤝 {lang ? `মিটিং: ${live.meetingPointBn}` : `Meeting: ${live.meetingPoint}`}
                        </Text>
                        {live.scheduled ? (
                          <Text style={{ fontSize: 10.5, color: '#166534', fontWeight: '700' }}>
                            ⏱️ {live.scheduled}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })()
              ) : null}

              {/* 3 Packages Selection Cards in a Row */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                {/* 1. Standard (500 Tk, +50 points) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedPackage('economy')}
                  // @ts-ignore
                  onMouseEnter={() => setHoveredPackage('economy')}
                  onMouseLeave={() => setHoveredPackage(null)}
                  style={{
                    flex: 1,
                    backgroundColor: selectedPackage === 'economy' ? '#F0F9FF' : '#FFFFFF',
                    borderWidth: 1.8,
                    borderColor: selectedPackage === 'economy' ? '#0284C7' : (hoveredPackage === 'economy' ? '#0284C7' : '#E2E8F0'),
                    borderRadius: 14,
                    padding: 10,
                    alignItems: 'center',
                    position: 'relative',
                    ...(Platform.OS === 'web'
                      ? {
                          cursor: 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          transform: hoveredPackage === 'economy' ? 'translateY(-4px) scale(1.04)' : 'translateY(0) scale(1)',
                          boxShadow: hoveredPackage === 'economy' ? '0 12px 20px -3px rgba(2, 132, 199, 0.2)' : 'none',
                        }
                      : {}),
                  }}
                >
                  <View style={{ position: 'absolute', top: 7, right: 7 }}>
                    <View
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor: selectedPackage === 'economy' ? '#0284C7' : '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      {selectedPackage === 'economy' && (
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#0284C7' }} />
                      )}
                    </View>
                  </View>

                  <View
                    style={
                      Platform.OS === 'web' && hoveredPackage === 'economy'
                        ? { transform: 'scale(1.18) rotate(-7deg)', transition: 'transform 0.25s ease' }
                        : { transition: 'transform 0.25s ease' }
                    }
                  >
                    <StandardPkgIcon size={30} color="#0284C7" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                    {lang ? 'স্ট্যান্ডার্ড' : 'Standard'}
                  </Text>
                  <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>
                    {lang ? '৫০০ টাকা' : '500 Tk'}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      backgroundColor: '#FEF3C7',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 8,
                      marginTop: 4,
                    }}
                  >
                    <StarCoinIcon size={10} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>
                      {lang ? '+৫০ পয়েন্ট' : '+50 points'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 2. Premium (1000 Tk, +100 points) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedPackage('business')}
                  // @ts-ignore
                  onMouseEnter={() => setHoveredPackage('business')}
                  onMouseLeave={() => setHoveredPackage(null)}
                  style={{
                    flex: 1,
                    backgroundColor: selectedPackage === 'business' ? '#F0F9FF' : '#FFFFFF',
                    borderWidth: 1.8,
                    borderColor: selectedPackage === 'business' ? '#0284C7' : (hoveredPackage === 'business' ? '#0284C7' : '#E2E8F0'),
                    borderRadius: 14,
                    padding: 10,
                    alignItems: 'center',
                    position: 'relative',
                    ...(Platform.OS === 'web'
                      ? {
                          cursor: 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          transform: hoveredPackage === 'business' ? 'translateY(-4px) scale(1.04)' : 'translateY(0) scale(1)',
                          boxShadow: hoveredPackage === 'business' ? '0 12px 20px -3px rgba(37, 99, 235, 0.2)' : 'none',
                        }
                      : {}),
                  }}
                >
                  <View style={{ position: 'absolute', top: 7, right: 7 }}>
                    <View
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor: selectedPackage === 'business' ? '#0284C7' : '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      {selectedPackage === 'business' && (
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#0284C7' }} />
                      )}
                    </View>
                  </View>

                  <View
                    style={
                      Platform.OS === 'web' && hoveredPackage === 'business'
                        ? { transform: 'scale(1.18) rotate(-7deg)', transition: 'transform 0.25s ease' }
                        : { transition: 'transform 0.25s ease' }
                    }
                  >
                    <PremiumPkgIcon size={30} color="#2563EB" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                    {lang ? 'প্রিমিয়াম' : 'Premium'}
                  </Text>
                  <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>
                    {lang ? '১০০০ টাকা' : '1000 Tk'}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      backgroundColor: '#FEF3C7',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 8,
                      marginTop: 4,
                    }}
                  >
                    <StarCoinIcon size={10} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>
                      {lang ? '+১০০ পয়েন্ট' : '+100 points'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 3. VIP (1500 Tk, +150 points) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedPackage('first')}
                  // @ts-ignore
                  onMouseEnter={() => setHoveredPackage('first')}
                  onMouseLeave={() => setHoveredPackage(null)}
                  style={{
                    flex: 1,
                    backgroundColor: selectedPackage === 'first' ? '#FFFBEB' : '#FFFFFF',
                    borderWidth: 1.8,
                    borderColor: selectedPackage === 'first' ? '#D97706' : (hoveredPackage === 'first' ? '#D97706' : '#E2E8F0'),
                    borderRadius: 14,
                    padding: 10,
                    alignItems: 'center',
                    position: 'relative',
                    ...(Platform.OS === 'web'
                      ? {
                          cursor: 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          transform: hoveredPackage === 'first' ? 'translateY(-4px) scale(1.04)' : 'translateY(0) scale(1)',
                          boxShadow: hoveredPackage === 'first' ? '0 12px 20px -3px rgba(217, 119, 6, 0.25)' : 'none',
                        }
                      : {}),
                  }}
                >
                  <View style={{ position: 'absolute', top: 7, right: 7 }}>
                    <View
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor: selectedPackage === 'first' ? '#D97706' : '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      {selectedPackage === 'first' && (
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#D97706' }} />
                      )}
                    </View>
                  </View>

                  <View
                    style={
                      Platform.OS === 'web' && hoveredPackage === 'first'
                        ? { transform: 'scale(1.18) rotate(-7deg)', transition: 'transform 0.25s ease' }
                        : { transition: 'transform 0.25s ease' }
                    }
                  >
                    <VipPkgIcon size={30} color="#D97706" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                    {lang ? 'ভিআইপি' : 'VIP'}
                  </Text>
                  <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>
                    {lang ? '১৫০০ টাকা' : '1500 Tk'}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      backgroundColor: '#FEF3C7',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 8,
                      marginTop: 4,
                    }}
                  >
                    <StarCoinIcon size={10} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>
                      {lang ? '+১৫০ পয়েন্ট' : '+150 points'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Footnote & Compare packages link */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  {lang ? 'প্রতি যাত্রী · নমুনা মূল্য ও পয়েন্ট' : 'Per passenger • Sample prices and points'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (navigateToSubPage) {
                      navigateToSubPage('compare_packages', {
                        selectedPackage,
                        onSelectPackage: setSelectedPackage,
                      });
                    } else {
                      setShowCompareModal(true);
                    }
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                    {lang ? 'প্যাকেজ তুলনা করুন →' : 'Compare packages →'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Additional Services Card (Above Book Now) */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (navigateToSubPage) {
                    navigateToSubPage('additional_services', {
                      selectedAddons,
                      setSelectedAddons,
                      addonDetails,
                      setAddonDetails,
                      onProceedBooking: handleProceedBookingFromModal,
                      flightNumber,
                      serviceDate,
                    });
                  } else {
                    setShowServicesModal(true);
                  }
                }}
                // @ts-ignore
                onMouseEnter={() => setHoveredAddonCard(true)}
                onMouseLeave={() => setHoveredAddonCard(false)}
                style={{
                  backgroundColor: selectedAddons.length > 0 ? '#F0F9FF' : (hoveredAddonCard ? '#F0F9FF' : '#F8FAFC'),
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: selectedAddons.length > 0 ? '#0284C7' : (hoveredAddonCard ? '#0284C7' : '#BAE6FD'),
                  padding: 11,
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                  ...(Platform.OS === 'web'
                    ? {
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: hoveredAddonCard ? 'translateY(-3px) scale(1.025)' : 'translateY(0) scale(1)',
                        boxShadow: hoveredAddonCard ? '0 10px 18px -3px rgba(2, 132, 199, 0.18)' : 'none',
                      }
                    : {}),
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: selectedAddons.length > 0 ? '#BAE6FD' : (hoveredAddonCard ? '#BAE6FD' : '#E0F2FE'),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    ...(Platform.OS === 'web'
                      ? {
                          transition: 'transform 0.25s ease',
                          transform: hoveredAddonCard ? 'scale(1.18) rotate(8deg)' : 'scale(1) rotate(0deg)',
                        }
                      : {}),
                  }}
                >
                  <Image
                    source={require('../../assets/pkg_additional.webp')}
                    style={{ width: 26, height: 26, resizeMode: 'contain' }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                      {lang ? 'অতিরিক্ত সার্ভিস' : 'Additional services'}
                    </Text>
                    {selectedAddons.length > 0 && (
                      <View style={{ backgroundColor: '#0284C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>
                          {lang ? `${selectedAddons.length}টি যুক্ত` : `${selectedAddons.length} added`}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 11.5, color: selectedAddons.length > 0 ? '#0284C7' : '#64748B', fontWeight: selectedAddons.length > 0 ? '600' : '400' }}>
                    {selectedAddons.length > 0
                      ? (lang ? 'সার্ভিস পরিবর্তন করতে ট্যাপ করুন' : 'Tap to customize services')
                      : (lang ? 'বিশেষ সহায়তা দেখুন ও বুক করুন' : 'Explore extra assistance & book')}
                  </Text>
                  {selectedAddons.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      {selectedAddons.slice(0, 5).map(addId => {
                        const asset = getAddonAsset(addId);
                        return asset ? (
                          <Image key={addId} source={asset} style={{ width: 16, height: 16, borderRadius: 3 }} resizeMode="contain" />
                        ) : null;
                      })}
                      {selectedAddons.length > 5 && (
                        <Text style={{ fontSize: 10, color: '#0284C7', fontWeight: '700' }}>+{selectedAddons.length - 5}</Text>
                      )}
                    </View>
                  )}
                </View>
                <ChevronRight size={16} color="#0284C7" />
              </TouchableOpacity>

              {/* Validation Alert Banner if inputs incomplete */}
              {Object.keys(errors).length > 0 && (
                <View
                  style={{
                    backgroundColor: '#FEF2F2',
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: '#EF4444',
                    padding: 10,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>
                    ⚠️ {lang ? 'বুকিং শুরু করার আগে প্রয়োজনীয় তথ্য পূরণ করুন:' : 'Please fill all required fields to proceed:'}
                  </Text>
                  {errors.flightNumber && (
                    <Text style={{ fontSize: 11.5, color: '#B91C1C', marginTop: 2 }}>
                      • {errors.flightNumber}
                    </Text>
                  )}
                  {errors.serviceDate && (
                    <Text style={{ fontSize: 11.5, color: '#B91C1C', marginTop: 2 }}>
                      • {errors.serviceDate}
                    </Text>
                  )}
                </View>
              )}

              {/* Book Now Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleBookNow}
                style={{
                  width: '100%',
                  backgroundColor: '#0284C7',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  shadowColor: '#0284C7',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 4,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? 'বুক করুন →' : 'Book Now →'}
                </Text>
              </TouchableOpacity>

              {/* Start booking without signing in subtext */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 14,
                  gap: 12,
                }}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
                <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '500' }}>
                  {lang ? 'সাইন ইন ছাড়াই সহজে বুকিং করুন' : 'Start booking without signing in'}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
              </View>
            </View>
          </View>
        </View>

        {/* 3. Feature Ribbon below Hero (4 Cards) */}
        <View
          style={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            paddingVertical: 20,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 1200,
              paddingHorizontal: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
            }}
          >
            {/* Feature 1: Easy booking */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#F0F9FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CalendarIcon size={20} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'সহজ বুকিং' : 'Easy booking'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {lang ? 'সরল ও নিরাপদ বুকিং প্রক্রিয়া' : 'Simple and secure booking process'}
                </Text>
              </View>
            </View>

            {/* Feature 2: Personal assistance */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#F0F9FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserIcon size={20} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'ব্যক্তিগত সহায়তা' : 'Personal assistance'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {lang ? 'বিমানবন্দরে নিয়োজিত টিম' : 'Dedicated team at the airport'}
                </Text>
              </View>
            </View>

            {/* Feature 3: Earn points */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#F0F9FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GiftIcon size={20} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'পয়েন্ট অর্জন' : 'Earn points with every service'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {lang ? 'যত ভ্রমণ, তত বেশি রিওয়ার্ড' : 'More journeys, more rewards'}
                </Text>
              </View>
            </View>

            {/* Feature 4: Your points: 250 */}
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: '#FFFBEB',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#FDE68A',
              }}
            >
              <StarCoinIcon size={32} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#92400E' }}>
                  {lang ? 'আপনার পয়েন্ট: ২৫০' : 'Your points: 250'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#B45309', marginTop: 1 }}>
                  {lang ? 'নমুনা অ্যাকাউন্ট' : 'Sample account'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* 3.1. FEATURED AIRPORT SERVICES GRID (Animated Service Cards) */}
        {/* ========================================================= */}
        <View
          style={{
            maxWidth: 1200,
            width: '100%',
            marginHorizontal: 'auto',
            paddingHorizontal: 24,
            marginTop: 48,
            marginBottom: 20,
          }}
        >
          {/* Section Header */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#F0F9FF',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#BAE6FD',
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 13 }}>✨</Text>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang ? 'সম্পূর্ণ এয়ারপোর্ট প্রটোকল সমাধান · ১০০% HSIA ভেরিফাইড' : 'Airport Protocol Solutions · 100% HSIA Verified'}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 26,
                fontWeight: '900',
                color: '#0F172A',
                letterSpacing: -0.3,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {lang ? 'আমাদের বিশেষ এয়ারপোর্ট সেবাসমূহ' : 'Our Specialized Airport Services'}
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: '#64748B',
                maxWidth: 620,
                lineHeight: 20,
                textAlign: 'center',
              }}
            >
              {lang
                ? 'যেকোনো সার্ভিসের ওপর মাউস নিয়ে বিস্তারিত দেখুন, সুবিধা জানুন এবং সরাসরি বুকিং সম্পন্ন করুন'
                : 'Hover over any service card to view inclusions, live perks and book with 1-click'}
            </Text>
          </View>

          {/* Responsive Grid of Animated Service Cards */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginHorizontal: -8,
              rowGap: 18,
            }}
          >
            {getFeaturedAirportServices(lang).map(srv => {
              const isSelected = selectedAddons.includes(srv.id) || (
                (srv.id === 'bb2car' && direction === 'arr' && selectedPackage === 'first') ||
                (srv.id === 'gate2bb' && direction === 'dep' && selectedPackage === 'first')
              );

              return (
                <View
                  key={srv.id}
                  style={{
                    width: '25%',
                    paddingHorizontal: 8,
                    minWidth: 260,
                  }}
                >
                  <AnimatedServiceCard
                    service={srv}
                    isSelected={isSelected}
                    lang={lang}
                    variant="grid"
                    onPress={() => {
                      if (srv.id === 'bb2car') {
                        setDirection('arr');
                        setSelectedPackage('first');
                        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else if (srv.id === 'gate2bb') {
                        setDirection('dep');
                        setSelectedPackage('first');
                        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        setSelectedAddons(prev => {
                          const exists = prev.includes(srv.id);
                          return exists ? prev.filter(x => x !== srv.id) : [...prev, srv.id];
                        });
                      }
                    }}
                    onBookNow={() => {
                      if (srv.id === 'bb2car') {
                        setDirection('arr');
                        setSelectedPackage('first');
                        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else if (srv.id === 'gate2bb') {
                        setDirection('dep');
                        setSelectedPackage('first');
                        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        if (!selectedAddons.includes(srv.id)) {
                          setSelectedAddons(prev => [...prev, srv.id]);
                        }
                        if (navigateToSubPage) {
                          navigateToSubPage('additional_services', {
                            selectedAddons: [...new Set([...selectedAddons, srv.id])],
                            setSelectedAddons,
                            addonDetails,
                            setAddonDetails,
                            onProceedBooking: handleProceedBookingFromModal,
                            flightNumber,
                            serviceDate,
                          });
                        } else {
                          setShowServicesModal(true);
                        }
                      }
                    }}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* 3.5. Corporate & Bank Partnerships (B2B Priority Section) */}
        <View
          style={{
            maxWidth: 1200,
            width: '100%',
            marginHorizontal: 'auto',
            paddingHorizontal: 24,
            marginTop: 40,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#071A2E',
              borderRadius: 20,
              padding: 32,
              borderWidth: 1,
              borderColor: '#1E3A5F',
              shadowColor: '#071A2E',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 24,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <View style={{ flex: 1, minWidth: 320 }}>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FCD34D', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    🤝 {lang ? 'ব্যাংক ও করপোরেট ক্লায়েন্ট পার্টনারশিপ' : 'Corporate & Bank Partnerships'}
                  </Text>
                </View>

                <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.3px', marginBottom: 8 }}>
                  {lang
                    ? 'ব্যাংক কার্ডহোল্ডার ও করপোরেট ক্লায়েন্টদের জন্য ভিআইপি এয়ারপোর্ট সল্যুশন'
                    : 'VIP Airport Protocol Solutions for Bank Cardholders & Corporate VIPs'}
                </Text>

                <Text style={{ fontSize: 13.5, color: '#94A3B8', lineHeight: 22, marginBottom: 20, maxWidth: 680 }}>
                  {lang
                    ? 'শীর্ষস্থানীয় ব্যাংক (BRAC Bank, IFIC, EBL, Mercantile Bank), GPStar ও বহুজাতিক কর্পোরেশনের প্রিমিয়াম কার্ডহোল্ডার, রেমিট্যান্স প্রেরক এবং এক্সিকিউটিভদের জন্য বিশেষায়িত মিট অ্যান্ড গ্রিট সুবিধা। ডেডিকেটেড অ্যাকাউন্ট ম্যানেজার ও মাসিক ইনভয়েসিং।'
                    : 'Exclusive Meet & Greet protocol tailored for premium bank cardholders (BRAC Bank, IFIC, EBL, Mercantile Bank), GPStar, and corporate executives. Dedicated account managers, customized billing, and prioritized boarding bridge assistance.'}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      if (typeof window !== 'undefined') {
                        window.open('https://wa.me/8801347570001?text=Hello%20Flight%20Care,%20we%20are%20interested%20in%20a%20Corporate/Bank%20Partnership%20agreement', '_blank');
                      }
                    }}
                    style={{
                      backgroundColor: '#25D366',
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>💬</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                      {lang ? 'করপোরেট WhatsApp ডেস্ক' : 'Corporate WhatsApp Desk'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      if (typeof window !== 'undefined') {
                        window.location.href = 'tel:+8801347570001';
                      }
                    }}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.2)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <Text style={{ fontSize: 15 }}>📞</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' }}>
                      01347-570001
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      if (typeof window !== 'undefined') {
                        window.location.href = 'mailto:corporate@flightcaresbd.com';
                      }
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>✉️</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#38BDF8' }}>
                      corporate@flightcaresbd.com
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* B2B Highlights Card */}
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 14,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  minWidth: 260,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>💳</Text>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                      {lang ? 'ব্যাংক কার্ড পার্টনারশিপ' : 'Bank Card Programs'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                      BRAC, IFIC, EBL, Mercantile
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>🌍</Text>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                      {lang ? 'প্রবাসী রেমিট্যান্স কেয়ার' : 'Expatriate Remittance Care'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                      {lang ? 'অগ্রাধিকারমূলক অভ্যর্থনা' : 'Priority Boarding Bridge Reception'}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>🏢</Text>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                      {lang ? 'করপোরেট ইনভয়েসিং' : 'Corporate Invoicing'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                      {lang ? 'মাসিক অ্যাকাউন্ট সেটেলমেন্ট' : 'Monthly B2B Account Settlement'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Desktop Dark Navy Footer */}
        <DesktopFooter
          lang={lang}
          setLang={setLang}
          setTab={setTab}
          setWiz={setWiz}
          setShowServicesModal={setShowServicesModal}
        />
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        onSelectDate={date => {
          setServiceDate(date);
          if (errors.serviceDate) setErrors(e => ({ ...e, serviceDate: null }));
        }}
        selectedDate={serviceDate}
        lang={lang}
      />

      {/* Package Comparison Modal */}
      <Modal visible={showCompareModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
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
              maxWidth: 580,
              width: '100%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'প্যাকেজ সুবিধাসমূহ তুলনা করুন' : 'Compare Packages'}
              </Text>
              <TouchableOpacity onPress={() => setShowCompareModal(false)}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0284C7' }}>
                  {lang ? 'স্ট্যান্ডার্ড (৫০০ টাকা)' : 'Standard (500 Tk)'}
                </Text>
                <Text style={{ fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 20 }}>
                  {lang
                    ? '• আগমন/প্রস্থান গেটে নিয়োজিত মিট অ্যান্ড গ্রিট সহকারী\n• লাগেজ গ্রহণ ও ট্রলি সহায়তা\n• ৫০ লয়ালটি পয়েন্ট যুক্ত হবে'
                    : '• Dedicated meet & greet assistant at arrival/departure gate\n• Luggage retrieval & trolley support\n• 50 loyalty points added'}
                </Text>
              </View>

              <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#6D28D9' }}>
                  {lang ? 'প্রিমিয়াম (১০০০ টাকা)' : 'Premium (1000 Tk)'}
                </Text>
                <Text style={{ fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 20 }}>
                  {lang
                    ? '• স্ট্যান্ডার্ড প্যাকেজের সকল সুবিধা\n• ফাস্ট-ট্র্যাক ইমিগ্রেশন ও কাস্টমস সহায়তা\n• ভারী ব্যাগেজের জন্য পোর্টার সুবিধা\n• ১০০ লয়ালটি পয়েন্ট যুক্ত হবে'
                    : '• All Standard features\n• Fast-track immigration & customs assistance\n• Porter service for all heavy luggage\n• 100 loyalty points added'}
                </Text>
              </View>

              <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#D97706' }}>
                  {lang ? 'ভিআইপি (১৫০০ টাকা)' : 'VIP (1500 Tk)'}
                </Text>
                <Text style={{ fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 20 }}>
                  {lang
                    ? '• প্রিমিয়াম প্যাকেজের সকল সুবিধা\n• রিফ্রেশমেন্ট ও ওয়াইফাইসহ ভিআইপি লাউঞ্জ অ্যাক্সেস\n• টার্মিনাল পর্যন্ত এক্সিকিউটিভ বাগি এসকর্ট\n• ১৫০ লয়ালটি পয়েন্ট যুক্ত হবে'
                    : '• All Premium features\n• VIP lounge access with refreshments & Wi-Fi\n• Executive curbside buggy escort\n• 150 loyalty points added'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Additional Services Modal */}
      <AdditionalServicesModal
        visible={showServicesModal}
        onClose={() => setShowServicesModal(false)}
        lang={lang}
        selectedAddons={selectedAddons}
        setSelectedAddons={setSelectedAddons}
        addonDetails={addonDetails}
        setAddonDetails={setAddonDetails}
        onProceedBooking={handleProceedBookingFromModal}
        flightNumber={flightNumber}
        serviceDate={serviceDate}
      />
    </View>
  );
}

