import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import {
  DEFAULT_MANAGED_AIRPORTS,
  ADDONS,
  ADDON_ASSETS,
  getAddonAsset,
  DEFAULT_STAFF_ROSTER,
} from '../constants/data';
import DatePickerModal from './DatePickerModal';
import TimePickerModal from './TimePickerModal';
import {
  searchFlightSuggestions,
  getLiveFlightStatus,
} from '../services/flightService';
import { isValidFlightNumber } from '../utils/helpers';
import { StandardPkgIcon, PremiumPkgIcon, VipPkgIcon } from './Icons';

export const OFFLINE_BOOKING_SOURCES = [
  { id: 'counter_walkin', labelEn: 'Airport Counter Walk-in', labelBn: 'কাউন্টার ওয়াক-ইন (সরাসরি আগমন)', icon: '🏢' },
  { id: 'phone_hotline', labelEn: 'Phone Hotline / Call', labelBn: 'হটলাইন / টেলিফোন বুকিং', icon: '📞' },
  { id: 'corporate_desk', labelEn: 'Corporate VIP Desk', labelBn: 'কর্পোরেট ভিআইপি ডেস্ক', icon: '🏛️' },
  { id: 'airline_referral', labelEn: 'Airline / Agency Referral', labelBn: 'এয়ারলাইন্স / ট্রাভেল এজেন্সি রেফারেল', icon: '✈️' },
  { id: 'emergency_onspot', labelEn: 'Emergency On-Spot Escort', labelBn: 'জরুরি অন-স্পট প্রোটোকল', icon: '🚨' },
];

export const AIRLINE_PRESETS = [
  'Biman Bangladesh',
  'Saudia',
  'Emirates',
  'Qatar Airways',
  'US-Bangla Airlines',
  'Air Arabia',
  'Kuwait Airways',
  'Singapore Airlines',
  'Gulf Air',
  'Novoair',
];

export const SERVICE_PACKAGES = [
  { id: 'first', code: 'VIP', labelEn: 'VIP First Class Protocol', labelBn: 'ভিআইপি ফার্স্ট ক্লাস প্রোটোকল', baseRate: 1500, icon: '👑', color: '#D97706', bg: '#FEF3C7' },
  { id: 'business', code: 'PREMIUM', labelEn: 'Business / Premium Protocol', labelBn: 'বিজনেস / প্রিমিয়াম প্রোটোকল', baseRate: 1000, icon: '⭐', color: '#0284C7', bg: '#E0F2FE' },
  { id: 'economy', code: 'STANDARD', labelEn: 'Standard Economy Protocol', labelBn: 'স্ট্যান্ডার্ড ইকোনমি প্রোটোকল', baseRate: 500, icon: '🛫', color: '#059669', bg: '#D1FAE5' },
];

export const AVAILABLE_ADDONS = [
  { id: 'wheel', labelEn: 'Wheel Chair', labelBn: 'হুইলচেয়ার', price: 300, icon: '🦽', image: ADDON_ASSETS.wheel, priceUnit: 'person' },
  { id: 'wrap', labelEn: 'Luggage Wrapping', labelBn: 'লাগেজ র‍্যাপিং', price: 400, icon: '🧳', image: ADDON_ASSETS.wrap, priceUnit: 'bag' },
  { id: 'transfer', labelEn: 'Rent a Car', labelBn: 'গাড়ি ভাড়া', price: 1200, icon: '🚘', image: ADDON_ASSETS.transfer, priceUnit: 'quote' },
  { id: 'visa', labelEn: 'Visa On Arrival', labelBn: 'অন অ্যারাইভাল ভিসা', price: 1500, icon: '🛂', image: ADDON_ASSETS.visa, priceUnit: 'person' },
  { id: 'print', labelEn: 'Print', labelBn: 'প্রিন্ট সেবা', price: 100, icon: '🖨️', image: ADDON_ASSETS.print, priceUnit: 'request' },
  { id: 'photocopy', labelEn: 'PhotoCopy', labelBn: 'ফটোকপি সেবা', price: 50, icon: '📄', image: ADDON_ASSETS.photocopy, priceUnit: 'request' },
  { id: 'money', labelEn: 'Money Exchange', labelBn: 'মানি এক্সচেঞ্জ', price: 0, icon: '💱', image: ADDON_ASSETS.money, priceUnit: 'quote' },
  { id: 'hotel', labelEn: 'Hotel Services', labelBn: 'হোটেল সার্ভিসেস', price: 0, icon: '🏨', image: ADDON_ASSETS.hotel, priceUnit: 'quote' },
  { id: 'food', labelEn: 'Food', labelBn: 'খাবার', price: 500, icon: '🍱', image: ADDON_ASSETS.food, priceUnit: 'request' },
  { id: 'medical', labelEn: 'Medical Assistance', labelBn: 'মেডিকেল সহায়তা', price: 0, icon: '🩺', image: ADDON_ASSETS.medical, priceUnit: 'quote' },
  { id: 'tour', labelEn: 'Tour Guide', labelBn: 'ট্যুর গাইড', price: 0, icon: '🗺️', image: ADDON_ASSETS.tour, priceUnit: 'quote' },
  { id: 'security', labelEn: 'Security Protocol', labelBn: 'নিরাপত্তা প্রোটোকল', price: 0, icon: '🛡️', image: ADDON_ASSETS.security, priceUnit: 'quote' },
];

export default function AdminManualBookingModal({
  visible,
  onClose,
  onSaveBooking,
  staffRoster = [],
  managedAirports = DEFAULT_MANAGED_AIRPORTS,
  isAdmin = true,
  managerSession = null,
  lang = 0,
}) {
  const isBn = Boolean(lang);

  // Form State
  const [source, setSource] = useState('counter_walkin');
  const [passengerName, setPassengerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationality, setNationality] = useState('Bangladeshi');
  const [passportNumber, setPassportNumber] = useState('');

  // Passengers count
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [elderly, setElderly] = useState(0);

  // Flight & Location
  const [airportCode, setAirportCode] = useState('DAC');
  const [direction, setDirection] = useState('arrival'); // 'arrival' | 'departure'
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [flightSuggestions, setFlightSuggestions] = useState([]);
  const [showFlightSuggestions, setShowFlightSuggestions] = useState(false);
  const [airline, setAirline] = useState('Biman Bangladesh');
  const [customAirline, setCustomAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [serviceDate, setServiceDate] = useState(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  });
  const [serviceTime, setServiceTime] = useState(() => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  });
  const [terminal, setTerminal] = useState('Terminal 2');
  const [meetingPoint, setMeetingPoint] = useState('Boarding Bridge / Gate');

  // Package & Addons
  const [selectedPackageId, setSelectedPackageId] = useState('business');
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [isManualPriceOverride, setIsManualPriceOverride] = useState(false);
  const [overridePriceInput, setOverridePriceInput] = useState('');

  // Staff Assignment
  const effectiveStaffRoster = useMemo(() => {
    return (staffRoster && staffRoster.length > 0) ? staffRoster : DEFAULT_STAFF_ROSTER;
  }, [staffRoster]);

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffInstructions, setStaffInstructions] = useState('');

  const filteredStaff = useMemo(() => {
    let list = (effectiveStaffRoster || []).filter(s => s.active !== false);
    if (staffSearchQuery.trim()) {
      const q = staffSearchQuery.trim().toLowerCase();
      list = list.filter(s => {
        const name = (s.name || '').toLowerCase();
        const nameBn = (s.nameBn || '').toLowerCase();
        const role = (s.role || '').toLowerCase();
        const roleBn = (s.roleBn || '').toLowerCase();
        const badge = (s.badgeNo || '').toLowerCase();
        const id = String(s.id || '').toLowerCase();
        const phone = String(s.phone || '') + String(s.phoneDisplay || '') + String(s.personalPhone || '');
        return (
          name.includes(q) ||
          nameBn.includes(q) ||
          role.includes(q) ||
          roleBn.includes(q) ||
          badge.includes(q) ||
          id.includes(q) ||
          phone.includes(q)
        );
      });
    }
    return list;
  }, [effectiveStaffRoster, staffSearchQuery]);

  const selectedStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return (effectiveStaffRoster || []).find(s => s.id === selectedStaffId) || null;
  }, [effectiveStaffRoster, selectedStaffId]);

  // Billing & Payment
  const [paymentStatus, setPaymentStatus] = useState('paid'); // 'paid' | 'pay_after_service' | 'pending' | 'complimentary'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'pos_card' | 'bkash' | 'nagad' | 'pay_after_service' | 'corporate'
  const [receiptNumber, setReceiptNumber] = useState(() => `RCP-${Math.floor(100000 + Math.random() * 900000)}`);

  // Remarks
  const [remarks, setRemarks] = useState('');

  // Submission / Success State
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessBooking, setSavedSuccessBooking] = useState(null);

  // Available airports: strictly Dhaka (DAC) as requested (all other airports removed)
  const displayAirports = useMemo(() => {
    const list = (managedAirports && managedAirports.length > 0) ? managedAirports : DEFAULT_MANAGED_AIRPORTS;
    const dhakaOnly = list.filter(a => (a.code || '').toUpperCase() === 'DAC');
    if (dhakaOnly.length > 0) return dhakaOnly;
    return [{
      id: 'dac',
      code: 'DAC',
      name: ['Hazrat Shahjalal International Airport', 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর'],
      shortName: ['Dhaka · HSIA', 'ঢাকা · HSIA'],
      location: 'Kurmitola, Airport Road, Dhaka-1229',
      city: 'Dhaka',
      country: 'Bangladesh',
      status: 'active',
      terminals: 'Terminal 1, Terminal 2, Domestic Terminal',
    }];
  }, [managedAirports]);

  // Active Airport Meta
  const activeAirport = useMemo(() => {
    const found = displayAirports.find(a => (a.code || '').toUpperCase() === airportCode.toUpperCase()) || displayAirports[0];
    return found || {
      id: 'dac',
      code: 'DAC',
      name: ['Hazrat Shahjalal International Airport', 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর'],
      shortName: ['Dhaka · HSIA', 'ঢাকা · HSIA'],
    };
  }, [displayAirports, airportCode]);

  // Price Calculation
  const selectedPkg = SERVICE_PACKAGES.find(p => p.id === selectedPackageId) || SERVICE_PACKAGES[1];
  const totalPax = adults + children + elderly;
  const computedBasePrice = (selectedPkg.baseRate || 2500) * (adults + (children * 0.7) + (elderly * 0.9));
  const addonsTotal = selectedAddons.reduce((sum, addId) => {
    const add = AVAILABLE_ADDONS.find(a => a.id === addId);
    return sum + (add ? add.price : 0);
  }, 0);
  const autoCalculatedTotal = Math.round(computedBasePrice + addonsTotal);
  const finalPrice = isManualPriceOverride && overridePriceInput !== ''
    ? Number(overridePriceInput) || 0
    : paymentStatus === 'complimentary' ? 0 : autoCalculatedTotal;

  // Toggle Addon
  const toggleAddon = (addId) => {
    setSelectedAddons(prev => {
      if (prev.includes(addId)) {
        return prev.filter(x => x !== addId);
      }
      return [...prev, addId];
    });
  };

  // Popular Flights and Selection Helpers (like starting/home page)
  const popularFlights = direction === 'departure'
    ? ['BG-085', 'EK-583', 'QR-639', 'SQ-447', 'BS-315', 'SV-805']
    : ['BG-084', 'EK-582', 'QR-638', 'SQ-446', 'BS-314', 'SV-804'];

  const handleSelectFlight = (fno) => {
    const clean = (fno || '').trim().toUpperCase();
    setFlightNumber(clean);
    setShowFlightSuggestions(false);
    const info = getLiveFlightStatus(clean, direction === 'departure' ? 'dep' : 'arr');
    if (info) {
      if (info.airline) {
        setAirline(info.airline);
        setCustomAirline('');
      }
      if (info.terminal) {
        setTerminal(info.terminal);
      }
      if (info.scheduled) {
        const m = info.scheduled.match(/(\d{1,2}:\d{2})/);
        if (m) setServiceTime(m[1]);
      }
    }
  };

  const handleFlightInputChange = (val) => {
    const upper = (val || '').toUpperCase();
    setFlightNumber(upper);
    if (upper.trim().length >= 1) {
      const matches = searchFlightSuggestions(upper, direction === 'departure' ? 'dep' : 'arr');
      setFlightSuggestions(matches || []);
      setShowFlightSuggestions((matches || []).length > 0);
    } else {
      setShowFlightSuggestions(false);
    }
    const info = getLiveFlightStatus(upper, direction === 'departure' ? 'dep' : 'arr');
    if (info && info.airline) {
      setAirline(info.airline);
      if (info.terminal) setTerminal(info.terminal);
      if (info.scheduled) {
        const m = info.scheduled.match(/(\d{1,2}:\d{2})/);
        if (m) setServiceTime(m[1]);
      }
    }
  };

  // Quick Date Helpers (Today, Tomorrow, +2 Days)
  const setQuickDate = (type) => {
    const d = new Date();
    if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (type === 'dayAfter') {
      d.setDate(d.getDate() + 2);
    }
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    setServiceDate(`${dd}-${mm}-${yyyy}`);
  };

  // Reset Form
  const resetForm = () => {
    setPassengerName('');
    setPhone('');
    setEmail('');
    setNationality('Bangladeshi');
    setPassportNumber('');
    setAdults(1);
    setChildren(0);
    setElderly(0);
    setFlightNumber('');
    setCustomAirline('');
    setSelectedAddons([]);
    setIsManualPriceOverride(false);
    setOverridePriceInput('');
    setSelectedStaffId('');
    setStaffSearchQuery('');
    setStaffInstructions('');
    setPaymentStatus('paid');
    setPaymentMethod('cash');
    setReceiptNumber(`RCP-${Math.floor(100000 + Math.random() * 900000)}`);
    setAirportCode('DAC');
    setRemarks('');
    setSavedSuccessBooking(null);
  };

  // Handle Form Submit
  const handleSave = () => {
    if (!passengerName.trim()) {
      Alert.alert(isBn ? 'নাম প্রয়োজন' : 'Name Required', isBn ? 'দয়া করে প্রধান যাত্রীর নাম লিখুন।' : 'Please enter passenger name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert(isBn ? 'ফোন নম্বর প্রয়োজন' : 'Phone Required', isBn ? 'দয়া করে ক্লায়েন্টের মোবাইল নম্বর লিখুন।' : 'Please enter contact phone number.');
      return;
    }

    setIsSaving(true);

    const generatedId = `OFF-${airportCode}-${Math.floor(10000 + Math.random() * 90000)}`;
    const effectiveAirline = airline === 'Other' && customAirline ? customAirline : airline;
    const effectiveFlightNo = flightNumber.trim() ? flightNumber.trim().toUpperCase() : 'WALK-IN';

    // Staff details
    const assignedStaff = (effectiveStaffRoster || []).find(s => s.id === selectedStaffId);

    // Direction labels
    const dirCode = direction === 'arrival' ? 'arr' : 'dep';

    // Build unified booking object compatible with ManagerPanel, App.js, and BookingInvoiceModal
    const newBooking = {
      id: generatedId,
      confirmedId: generatedId,
      customer: passengerName.trim(),
      passengerName: passengerName.trim(),
      name: passengerName.trim(),
      phone: phone.trim(),
      passengerPhone: phone.trim(),
      email: email.trim() || `${phone.replace(/\D/g, '') || 'offline'}@flightcare.app`,
      passengerEmail: email.trim() || `${phone.replace(/\D/g, '') || 'offline'}@flightcare.app`,
      nationality: nationality.trim() || 'Bangladeshi',
      passportNumber: passportNumber.trim() || 'N/A',
      airport: airportCode,
      airport_code: airportCode,
      airportName: isBn ? (activeAirport.name?.[1] || `${airportCode} বিমানবন্দর`) : (activeAirport.name?.[0] || `${airportCode} Airport`),
      direction: direction,
      dir: dirCode,
      service_category: direction,
      fno: effectiveFlightNo,
      flight: {
        airline: effectiveAirline,
        number: effectiveFlightNo,
        date: serviceDate,
        time: serviceTime,
        terminal: terminal,
        meeting_point: meetingPoint,
        passport_number: passportNumber.trim() || 'N/A',
        origin: direction === 'arrival' ? 'International / Domestic' : (isBn ? 'ঢাকা (DAC)' : 'Dhaka (DAC)'),
        destination: direction === 'arrival' ? (isBn ? 'ঢাকা (DAC)' : 'Dhaka (DAC)') : 'Destination Hub',
      },
      airline: effectiveAirline,
      origin: direction === 'arrival' ? 'Incoming Station' : `${airportCode} Airport`,
      destination: direction === 'arrival' ? `${airportCode} Airport` : 'Outgoing Hub',
      terminal: terminal,
      meetingPoint: meetingPoint,
      date: serviceDate,
      time: serviceTime,
      passengers: totalPax,
      passengerBreakdown: { adults, children, elderly },
      passengerDetails: [{ name: passengerName.trim(), type: 'adult' }],
      pkg: {
        id: selectedPkg.id,
        code: selectedPkg.code,
        t: isBn ? selectedPkg.labelBn : selectedPkg.labelEn,
        n: [selectedPkg.labelEn, selectedPkg.labelBn],
        p: selectedPkg.baseRate,
      },
      package: isBn ? selectedPkg.labelBn : selectedPkg.labelEn,
      packageChoice: selectedPkg.id,
      service: isBn ? `${selectedPkg.labelBn} (${direction === 'arrival' ? 'আগমন' : 'প্রস্থান'})` : `${selectedPkg.labelEn} (${direction === 'arrival' ? 'Arrival' : 'Departure'})`,
      addons: selectedAddons,
      amount: finalPrice,
      paymentStatus: paymentStatus,
      paidMethod: paymentMethod,
      method: paymentMethod,
      paymentMethod: paymentMethod === 'cash' ? (isBn ? 'কাউন্টার ক্যাশ' : 'Cash') :
                     paymentMethod === 'pos_card' ? (isBn ? 'পিওএস কার্ড' : 'POS Card') :
                     paymentMethod === 'bkash' ? 'bKash' :
                     paymentMethod === 'nagad' ? 'Nagad' :
                     paymentMethod === 'pay_after_service' ? (isBn ? 'সার্ভিস সমাপ্তির পরে পেমেন্ট' : 'Pay After Service') : 'Corporate',
      paymentRef: receiptNumber,
      trxId: receiptNumber,
      paymentDate: 'Today',
      pricingBreakdown: {
        baseFare: Math.round(computedBasePrice),
        addonsCost: addonsTotal,
        total: finalPrice,
      },
      status: paymentStatus === 'pending' ? 'pending' : (assignedStaff ? 'upcoming' : 'confirmed'),
      staff: assignedStaff ? assignedStaff.name : 'Unassigned',
      staffId: assignedStaff ? assignedStaff.id : null,
      staffRole: assignedStaff ? (isBn ? (assignedStaff.roleBn || assignedStaff.role) : assignedStaff.role) : null,
      staffPhone: assignedStaff ? (assignedStaff.phoneDisplay || assignedStaff.phone) : null,
      staffBadge: assignedStaff ? (assignedStaff.badgeNo || assignedStaff.id) : null,
      assignedStaff: assignedStaff ? {
        id: assignedStaff.id,
        name: assignedStaff.name,
        nameBn: assignedStaff.nameBn || assignedStaff.name,
        role: assignedStaff.role,
        roleBn: assignedStaff.roleBn || assignedStaff.role,
        phone: assignedStaff.phoneDisplay || assignedStaff.phone,
        badgeNo: assignedStaff.badgeNo || assignedStaff.id,
        assignedAt: new Date().toISOString(),
        assignedBy: managerSession?.user?.name || (isAdmin ? 'Admin' : 'Manager'),
      } : null,
      assignedStaffId: assignedStaff ? assignedStaff.id : null,
      assignedStaffName: assignedStaff ? assignedStaff.name : 'Unassigned',
      staffNotes: staffInstructions.trim() || '',
      remarks: remarks.trim() || '',
      isOfflineManual: true,
      source: source,
      sourceLabel: OFFLINE_BOOKING_SOURCES.find(s => s.id === source)?.[isBn ? 'labelBn' : 'labelEn'] || 'Offline Manual',
      enteredBy: {
        id: managerSession?.user?.id || 'mgr-1',
        name: managerSession?.user?.name || (isAdmin ? 'Super Admin' : 'সোয়েল তানভীর (ম্যানেজার)'),
        email: managerSession?.user?.email || (isAdmin ? 'admin@flightcare.com' : 'soheltanvir.th@gmail.com'),
        role: managerSession?.user?.role || (isAdmin ? 'admin' : 'manager'),
        time: `${serviceDate}, ${serviceTime}`,
        timestamp: new Date().toISOString(),
      },
      statusHistory: [
        {
          status: 'confirmed',
          label: isBn ? 'ম্যানুয়াল অফলাইন এন্ট্রি' : 'Manual Offline Entry',
          time: `${serviceDate}, ${serviceTime}`,
          by: `${managerSession?.user?.name || (isAdmin ? 'Admin' : 'সোয়েল তানভীর')} (${managerSession?.user?.email || (isAdmin ? 'admin@flightcare.com' : 'soheltanvir.th@gmail.com')})`,
          note: isBn
            ? `বুকিং এন্ট্রি করেছেন: ${managerSession?.user?.name || (isAdmin ? 'এডমিন' : 'সোয়েল তানভীর')} (${managerSession?.user?.email || (isAdmin ? 'admin@flightcare.com' : 'soheltanvir.th@gmail.com')}) [রসিদ: ${receiptNumber}]`
            : `Offline manual entry created by: ${managerSession?.user?.name || (isAdmin ? 'Admin' : 'Manager')} (${managerSession?.user?.email || (isAdmin ? 'admin@flightcare.com' : 'soheltanvir.th@gmail.com')}) [Receipt: ${receiptNumber}]`,
        },
      ],
      created_at: new Date().toISOString(),
    };

    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccessBooking(newBooking);
      if (onSaveBooking) {
        onSaveBooking(newBooking);
      }
    }, 300);
  };

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Platform.OS === 'web' ? 16 : 8,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            width: '100%',
            maxWidth: 880,
            maxHeight: '92%',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 25,
            elevation: 15,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: '#0F172A',
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: '#1E293B',
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View
                  style={{
                    backgroundColor: '#0284C7',
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                    {isBn ? 'অফলাইন সার্ভিস এন্ট্রি' : 'OFFLINE COUNTER DESK'}
                  </Text>
                </View>
                <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '800' }}>
                  {isBn ? '+ নতুন ম্যানুয়াল সার্ভিস ও ক্লায়েন্ট যোগ করুন' : '+ New Manual / Offline Booking Entry'}
                </Text>
              </View>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
                {isBn
                  ? 'কাউন্টার ওয়াক-ইন, হটলাইন ও অফলাইন ক্লায়েন্টদের সেবা সরাসরি ড্যাশবোর্ডে অন্তর্ভুক্ত করুন'
                  : 'Register airport walk-in, phone & VIP desk clients directly into dashboard'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#1E293B',
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 12,
              }}
            >
              <Text style={{ color: '#CBD5E1', fontSize: 18, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Success Screen If Just Saved */}
          {savedSuccessBooking ? (
            <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: '#DCFCE7',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 36 }}>✅</Text>
              </View>

              <Text style={{ fontSize: 20, fontWeight: '800', color: '#065F46', textAlign: 'center' }}>
                {isBn ? 'অফলাইন বুকিং সফলভাবে যুক্ত ও ড্যাশবোর্ডে আপডেট হয়েছে!' : 'Offline Booking Created & Dashboard Synced!'}
              </Text>

              <Text style={{ fontSize: 13, color: '#475569', textAlign: 'center', marginTop: 6, maxWidth: 500 }}>
                {isBn
                  ? `বুকিং আইডি #${savedSuccessBooking.id} প্ল্যাটফর্মের সার্বিক বুকিং তালিকা, রাজস্ব, স্টাফ ডিউটি ও নোটিফিকেশনে রিয়েল-টাইমে যুক্ত হয়েছে।`
                  : `Booking ID #${savedSuccessBooking.id} has been added to operational metrics, staff workload & billing records.`}
              </Text>

              {/* Booking Summary Box */}
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 14,
                  padding: 18,
                  width: '100%',
                  maxWidth: 520,
                  marginTop: 20,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>{isBn ? 'বুকিং রেফারেন্স:' : 'Booking ID:'}</Text>
                  <Text style={{ fontWeight: '800', color: '#0284C7', fontSize: 14 }}>{savedSuccessBooking.id}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>{isBn ? 'যাত্রীর নাম:' : 'Passenger:'}</Text>
                  <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 13 }}>{savedSuccessBooking.passengerName}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>{isBn ? 'মোবাইল নম্বর:' : 'Phone:'}</Text>
                  <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 13 }}>{savedSuccessBooking.phone}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>{isBn ? 'বিমানবন্দর ও ফ্লাইট:' : 'Airport & Flight:'}</Text>
                  <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 13 }}>
                    {savedSuccessBooking.airport} · {savedSuccessBooking.airline} ({savedSuccessBooking.fno})
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>{isBn ? 'সার্ভিস প্যাকেজ:' : 'Package:'}</Text>
                  <Text style={{ fontWeight: '700', color: '#D97706', fontSize: 13 }}>{savedSuccessBooking.package}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>{isBn ? 'বরাদ্দকৃত অফিসার:' : 'Duty Officer:'}</Text>
                  <Text style={{ fontWeight: '700', color: '#059669', fontSize: 13 }}>{savedSuccessBooking.staff}</Text>
                </View>
                {isAdmin ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                    <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '700' }}>{isBn ? 'মোট পরিশোধযোগ্য:' : 'Total Amount:'}</Text>
                    <Text style={{ fontWeight: '800', color: '#0284C7', fontSize: 16 }}>৳ {savedSuccessBooking.amount.toLocaleString('en-IN')}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                    <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>{isBn ? 'স্ট্যাটাস:' : 'Booking Status:'}</Text>
                    <Text style={{ fontWeight: '800', color: '#059669', fontSize: 13 }}>✓ {isBn ? 'নিশ্চিত' : 'Confirmed'}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                <TouchableOpacity
                  onPress={() => {
                    resetForm();
                  }}
                  style={{
                    backgroundColor: '#0284C7',
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                    {isBn ? '+ আরেকটি অফলাইন বুকিং করুন' : '+ Add Another Booking'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    backgroundColor: '#0F172A',
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                    {isBn ? 'ড্যাশবোর্ডে ফিরে যান' : 'Return to Dashboard'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* Scrollable Form Body */
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, gap: 20 }}
              showsVerticalScrollIndicator={true}
            >
              {/* SECTION 1: সোর্স ও ক্লায়েন্ট তথ্য */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 16,
                  gap: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>👤</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                    {isBn ? '১. ক্লায়েন্ট ও বুকিং চ্যানেল তথ্য' : '1. Client & Channel Source'}
                  </Text>
                </View>

                {/* Source Selection */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 }}>
                    {isBn ? 'ক্লায়েন্ট সোর্স / চ্যানেল:' : 'Booking Channel Source:'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {OFFLINE_BOOKING_SOURCES.map(item => {
                      const active = source === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setSource(item.id)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 10,
                            backgroundColor: active ? '#0284C7' : '#F8FAFC',
                            borderWidth: 1,
                            borderColor: active ? '#0284C7' : '#E2E8F0',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                          <Text style={{ fontSize: 12, fontWeight: active ? '700' : '600', color: active ? '#FFFFFF' : '#334155' }}>
                            {isBn ? item.labelBn : item.labelEn}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Passenger Inputs Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {/* Passenger Name */}
                  <View style={{ flex: 1, minWidth: 220 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                      {isBn ? 'প্রধান যাত্রীর পুরো নাম *' : 'Primary Passenger Full Name *'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 14,
                        color: '#0F172A',
                      }}
                      placeholder={isBn ? 'যেমন: মোহাম্মদ আলমগীর' : 'e.g. Mohammad Alamgir'}
                      placeholderTextColor="#94A3B8"
                      value={passengerName}
                      onChangeText={setPassengerName}
                    />
                  </View>

                  {/* Phone */}
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                      {isBn ? 'মোবাইল নম্বর *' : 'Phone Number *'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 14,
                        color: '#0F172A',
                      }}
                      placeholder={isBn ? 'যেমন: 01712345678' : 'e.g. +8801712345678'}
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </View>

                {/* Email (Optional) */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                    {isBn ? 'ইমেইল (ঐচ্ছিক):' : 'Email (Optional):'}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 14,
                      color: '#0F172A',
                    }}
                    placeholder={isBn ? 'client@flightcare.app' : 'client@flightcare.app'}
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                {/* Passenger Breakdown Steppers */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8 }}>
                    {isBn ? `যাত্রী সংখ্যা বিবরণ (মোট: ${totalPax} জন):` : `Passenger Count Breakdown (Total: ${totalPax}):`}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                    {/* Adults */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 12, color: '#475569' }}>{isBn ? 'প্রাপ্তবয়স্ক:' : 'Adults:'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}>
                        <TouchableOpacity
                          onPress={() => setAdults(Math.max(1, adults - 1))}
                          style={{ paddingHorizontal: 10, paddingVertical: 4 }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ paddingHorizontal: 8, fontWeight: '700', fontSize: 13, color: '#0F172A' }}>{adults}</Text>
                        <TouchableOpacity
                          onPress={() => setAdults(adults + 1)}
                          style={{ paddingHorizontal: 10, paddingVertical: 4 }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Children */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 12, color: '#475569' }}>{isBn ? 'শিশু (২-১২):' : 'Children:'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}>
                        <TouchableOpacity
                          onPress={() => setChildren(Math.max(0, children - 1))}
                          style={{ paddingHorizontal: 10, paddingVertical: 4 }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ paddingHorizontal: 8, fontWeight: '700', fontSize: 13, color: '#0F172A' }}>{children}</Text>
                        <TouchableOpacity
                          onPress={() => setChildren(children + 1)}
                          style={{ paddingHorizontal: 10, paddingVertical: 4 }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Elderly */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 12, color: '#475569' }}>{isBn ? 'প্রবীণ / বিশেষ চাহিদা:' : 'Elderly / Special:'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}>
                        <TouchableOpacity
                          onPress={() => setElderly(Math.max(0, elderly - 1))}
                          style={{ paddingHorizontal: 10, paddingVertical: 4 }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ paddingHorizontal: 8, fontWeight: '700', fontSize: 13, color: '#0F172A' }}>{elderly}</Text>
                        <TouchableOpacity
                          onPress={() => setElderly(elderly + 1)}
                          style={{ paddingHorizontal: 10, paddingVertical: 4 }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* SECTION 2: বিমানবন্দর, দিক ও ফ্লাইট তথ্য */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 16,
                  gap: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>✈️</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                    {isBn ? '২. বিমানবন্দর ও ফ্লাইট শিডিউল' : '2. Airport Hub & Flight Schedule'}
                  </Text>
                </View>

                {/* Airport Hub Selector - Dhaka (DAC) Only */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                    {isBn ? 'বিমানবন্দর হাব:' : 'Airport Hub:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {displayAirports.map(apt => (
                      <View
                        key={apt.code}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: '#0284C7',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                          {apt.code}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#E0F2FE', fontWeight: '700' }}>
                          {isBn ? (apt.shortName?.[1] || 'ঢাকা · HSIA') : (apt.shortName?.[0] || 'Dhaka · HSIA')}
                        </Text>
                        <View style={{ backgroundColor: '#38BDF8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#0C4A6E' }}>
                            {isBn ? 'সক্রিয় হাব' : 'Active Hub'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Service Direction: Arrival & Departure ONLY (Transit removed as requested) */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                    {isBn ? 'সার্ভিসের ধরন / দিক:' : 'Service Direction:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                      { id: 'arrival', labelEn: 'Arrival Protocol (আগমন)', labelBn: 'আগমন প্রোটোকল (Arrival)', icon: '🛬', color: '#059669', activeBg: '#059669' },
                      { id: 'departure', labelEn: 'Departure Protocol (প্রস্থান)', labelBn: 'প্রস্থান প্রোটোকল (Departure)', icon: '🛫', color: '#2563EB', activeBg: '#2563EB' },
                    ].map(d => {
                      const active = direction === d.id;
                      return (
                        <TouchableOpacity
                          key={d.id}
                          activeOpacity={0.8}
                          onPress={() => {
                            setDirection(d.id);
                            setShowFlightSuggestions(false);
                            setMeetingPoint(d.id === 'arrival' ? 'Canopy / Boarding Bridge' : 'Departure Gate');
                          }}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            paddingHorizontal: 14,
                            borderRadius: 10,
                            backgroundColor: active ? d.activeBg : '#F8FAFC',
                            borderWidth: 1.5,
                            borderColor: active ? d.color : '#CBD5E1',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          }}
                        >
                          <Text style={{ fontSize: 18 }}>{d.icon}</Text>
                          <Text style={{ fontSize: 13, fontWeight: active ? '800' : '600', color: active ? '#FFFFFF' : '#334155' }}>
                            {isBn ? d.labelBn : d.labelEn}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Flight Number (Easy to fill with Popular Chips & Autocomplete like Starting Page) */}
                <View style={{ position: 'relative', zIndex: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                      {isBn ? 'ফ্লাইট নম্বর:' : 'Flight Number:'}
                    </Text>
                    {/* Quick Popular Flight Chips */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                        {isBn ? 'জনপ্রিয়:' : 'Popular:'}
                      </Text>
                      {popularFlights.slice(0, 5).map(fno => (
                        <TouchableOpacity
                          key={fno}
                          onPress={() => handleSelectFlight(fno)}
                          style={{
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 6,
                            backgroundColor: flightNumber === fno ? '#0284C7' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: flightNumber === fno ? '#0284C7' : '#CBD5E1',
                          }}
                        >
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: flightNumber === fno ? '#FFFFFF' : '#334155' }}>
                            {fno}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: flightNumber.trim() && isValidFlightNumber(flightNumber) ? '#10B981' : '#CBD5E1',
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      height: 44,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>✈️</Text>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: '#0F172A',
                        fontWeight: '700',
                      }}
                      placeholder="e.g. BG-084, EK-582, SV-804"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                      value={flightNumber}
                      onChangeText={handleFlightInputChange}
                    />
                    {flightNumber.length > 0 && (
                      <TouchableOpacity onPress={() => { setFlightNumber(''); setShowFlightSuggestions(false); }}>
                        <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Autocomplete Flight Suggestions Dropdown */}
                  {showFlightSuggestions && flightSuggestions.length > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 72,
                        left: 0,
                        right: 0,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: '#0284C7',
                        shadowColor: '#000000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 10,
                        elevation: 10,
                        zIndex: 999,
                        maxHeight: 180,
                        overflow: 'hidden',
                      }}
                    >
                      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {flightSuggestions.map(sug => (
                          <TouchableOpacity
                            key={sug.fno}
                            onPress={() => handleSelectFlight(sug.fno)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                              borderBottomWidth: 1,
                              borderBottomColor: '#F1F5F9',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 14 }}>{sug.logo || '✈️'}</Text>
                              <View>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>
                                  {sug.fno}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#64748B' }}>
                                  {isBn ? sug.airlineBn : sug.airline} • {sug.route}
                                </Text>
                              </View>
                            </View>
                            {sug.scheduled ? (
                              <View style={{ backgroundColor: '#F0F9FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369A1' }}>
                                  ⏱️ {sug.scheduled}
                                </Text>
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Verified Flight Info Banner */}
                  {flightNumber.trim() && isValidFlightNumber(flightNumber) ? (
                    (() => {
                      const live = getLiveFlightStatus(flightNumber, direction === 'departure' ? 'dep' : 'arr');
                      return (
                        <View
                          style={{
                            marginTop: 8,
                            backgroundColor: '#F0FDF4',
                            borderRadius: 8,
                            padding: 8,
                            borderWidth: 1,
                            borderColor: '#DCFCE7',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 12 }}>✓</Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>
                              {live?.airline || airline || 'Verified Airline'} ({flightNumber})
                            </Text>
                            {live?.route ? (
                              <Text style={{ fontSize: 11, color: '#166534' }}>• {live.route}</Text>
                            ) : null}
                          </View>
                          <Text style={{ fontSize: 11, color: '#059669', fontWeight: '800' }}>
                            🏢 {live?.terminal || terminal}
                          </Text>
                        </View>
                      );
                    })()
                  ) : null}
                </View>

                {/* Date & Time Grid (Easy date picker & quick buttons like Starting Page) */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {/* Service Date with Quick Chips and Calendar Picker */}
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                        {isBn ? 'সার্ভিস তারিখ:' : 'Service Date:'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity onPress={() => setQuickDate('today')}>
                          <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '700' }}>
                            {isBn ? 'আজকে' : 'Today'}
                          </Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>·</Text>
                        <TouchableOpacity onPress={() => setQuickDate('tomorrow')}>
                          <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '700' }}>
                            {isBn ? 'আগামীকাল' : 'Tmrw'}
                          </Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>·</Text>
                        <TouchableOpacity onPress={() => setQuickDate('dayAfter')}>
                          <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '700' }}>
                            {isBn ? 'পরশু' : '+2 Days'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setShowDateModal(true)}
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        height: 44,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16 }}>📅</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                          {serviceDate || (isBn ? 'তারিখ নির্বাচন করুন' : 'Select Date')}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7' }}>
                          {isBn ? 'ক্যালেন্ডার' : 'Pick Date'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Service Time with Interactive Easy Time Picker */}
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                        {isBn ? 'সময় (ঘণ্টা:মিনিট):' : 'Service Time:'}
                      </Text>
                      <TouchableOpacity onPress={() => setShowTimeModal(true)}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>
                          {isBn ? '⏰ সময় বাছাই' : '⏰ Pick Time'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setShowTimeModal(true)}
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        height: 44,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16 }}>⏰</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                          {serviceTime || (isBn ? 'সময় নির্বাচন করুন' : 'Select Time')}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                          {isBn ? 'সময় পিকার ▾' : 'Pick Time ▾'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Optional Airline selection (auto-detected from flight, but editable) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Text style={{ fontSize: 14 }}>🏷️</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                      {isBn ? 'চিহ্নিত এয়ারলাইন্স:' : 'Airline:'}
                    </Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                      {customAirline || airline || 'Biman Bangladesh'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const next = airline === 'Biman Bangladesh' ? 'Saudia' :
                                   airline === 'Saudia' ? 'Emirates' :
                                   airline === 'Emirates' ? 'Qatar Airways' :
                                   airline === 'Qatar Airways' ? 'US-Bangla Airlines' : 'Biman Bangladesh';
                      setAirline(next);
                      setCustomAirline('');
                    }}
                    style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                      {isBn ? 'অন্যান্য এয়ারলাইন্স ▾' : 'Switch Airline ▾'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* SECTION 3: সার্ভিস প্যাকেজ ও অ্যাড-অন */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 16,
                  gap: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>⭐</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                    {isBn ? '৩. সার্ভিস প্যাকেজ ও অতিরিক্ত অ্যাড-অন' : '3. Service Package & Add-ons'}
                  </Text>
                </View>

                {/* Packages Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {SERVICE_PACKAGES.map(pkg => {
                    const active = selectedPackageId === pkg.id;
                    return (
                      <TouchableOpacity
                        key={pkg.id}
                        onPress={() => setSelectedPackageId(pkg.id)}
                        style={{
                          flex: 1,
                          minWidth: 150,
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: active ? pkg.bg : '#F8FAFC',
                          borderWidth: 2,
                          borderColor: active ? pkg.color : '#E2E8F0',
                          gap: 4,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                            {pkg.id === 'economy' && <StandardPkgIcon size={22} color={pkg.color} />}
                            {pkg.id === 'business' && <PremiumPkgIcon size={22} color={pkg.color} />}
                            {pkg.id === 'first' && <VipPkgIcon size={22} color={pkg.color} />}
                          </View>
                          {isAdmin ? (
                            <Text style={{ fontSize: 12, fontWeight: '800', color: pkg.color }}>
                              ৳ {pkg.baseRate.toLocaleString('en-IN')}
                            </Text>
                          ) : (
                            <Text style={{ fontSize: 11, fontWeight: '800', color: pkg.color }}>
                              {pkg.code}
                            </Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                          {isBn ? pkg.labelBn : pkg.labelEn}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>
                          {pkg.code} Class Protocol
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Add-ons Checklist */}
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155' }}>
                      {isBn ? 'প্রথম পাতার সব অতিরিক্ত সেবা / অ্যাড-অন:' : 'All Frontpage Additional Services & Add-ons:'}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: selectedAddons.length > 0 ? '#16A34A' : '#64748B' }}>
                      {isBn ? `${selectedAddons.length}টি নির্বাচিত` : `${selectedAddons.length} selected`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {AVAILABLE_ADDONS.map(addon => {
                      const checked = selectedAddons.includes(addon.id);
                      const asset = addon.image || getAddonAsset(addon.id);
                      return (
                        <TouchableOpacity
                          key={addon.id}
                          onPress={() => toggleAddon(addon.id)}
                          activeOpacity={0.75}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderRadius: 10,
                            backgroundColor: checked ? '#F0FDF4' : '#F8FAFC',
                            borderWidth: 1.5,
                            borderColor: checked ? '#16A34A' : '#E2E8F0',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            minWidth: Platform.OS === 'web' ? 170 : 150,
                            flexGrow: 1,
                            shadowColor: checked ? '#16A34A' : '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: checked ? 0.12 : 0.03,
                            shadowRadius: 2,
                            elevation: checked ? 2 : 1,
                          }}
                        >
                          {asset ? (
                            <Image
                              source={asset}
                              style={{ width: 24, height: 24, borderRadius: 5 }}
                              resizeMode="contain"
                            />
                          ) : (
                            <Text style={{ fontSize: 18 }}>{addon.icon}</Text>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: checked ? '800' : '600',
                                color: checked ? '#15803D' : '#1E293B',
                              }}
                              numberOfLines={1}
                            >
                              {isBn ? addon.labelBn : addon.labelEn}
                            </Text>
                            {addon.price > 0 ? (
                              <Text style={{ fontSize: 10, fontWeight: '800', color: checked ? '#16A34A' : '#0284C7' }}>
                                +৳{addon.price.toLocaleString('en-IN')}
                              </Text>
                            ) : (
                              <Text style={{ fontSize: 9.5, fontWeight: '600', color: '#64748B' }}>
                                {isBn ? 'কোটেশন / সহায়তা' : 'On Quote'}
                              </Text>
                            )}
                          </View>
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: checked ? '#16A34A' : '#E2E8F0',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '900', color: checked ? '#FFFFFF' : '#94A3B8', lineHeight: 12 }}>
                              {checked ? '✓' : '+'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* SECTION 4: প্রোটোকল অফিসার বরাদ্দ */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 16,
                  gap: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>👮</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                      {isBn ? '৪. অন-ডিউটি প্রোটোকল অফিসার বরাদ্দ' : '4. Duty Protocol Officer Assignment'}
                    </Text>
                  </View>
                  {selectedStaff && (
                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#86EFAC' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                        ✓ {isBn ? 'অফিসার নির্ধারিত' : 'Officer Assigned'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Search Officer Input */}
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    {isBn ? 'প্রোটোকল অফিসার সার্চ ও নির্বাচন করুন:' : 'Search & Assign Duty Protocol Officer:'}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: staffSearchQuery ? '#0284C7' : '#CBD5E1',
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: Platform.OS === 'web' ? 8 : 4,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 15 }}>🔍</Text>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: '#0F172A',
                        padding: 0,
                      }}
                      placeholder={isBn ? 'ডিউটি করা প্রোটোকল অফিসারের নাম, পদবী, ফোন বা আইডি দিয়ে খুঁজুন...' : 'Search by officer name, role, phone or ID...'}
                      placeholderTextColor="#94A3B8"
                      value={staffSearchQuery}
                      onChangeText={setStaffSearchQuery}
                    />
                    {staffSearchQuery.trim() !== '' && (
                      <TouchableOpacity onPress={() => setStaffSearchQuery('')} style={{ padding: 4 }}>
                        <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '800' }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Selected Officer Highlight Banner */}
                {selectedStaff ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#F0FDF4',
                      borderWidth: 1.5,
                      borderColor: '#16A34A',
                      borderRadius: 12,
                      padding: 12,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: '#DCFCE7',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 20 }}>👮‍♂️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#14532D' }}>
                            {isBn ? (selectedStaff.nameBn || selectedStaff.name) : selectedStaff.name}
                          </Text>
                          <View style={{ backgroundColor: '#16A34A', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FFFFFF' }}>
                              {isBn ? 'ডিউটিতে নিয়োজিত' : 'On-Duty Assigned'}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                          {isBn ? (selectedStaff.roleBn || selectedStaff.role || 'প্রোটোকল অফিসার') : (selectedStaff.role || 'Protocol Officer')}
                          {selectedStaff.phoneDisplay || selectedStaff.phone ? ` • 📞 ${selectedStaff.phoneDisplay || selectedStaff.phone}` : ''}
                          {selectedStaff.badgeNo || selectedStaff.id ? ` • 🆔 ${selectedStaff.badgeNo || selectedStaff.id}` : ''}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedStaffId('')}
                      style={{
                        backgroundColor: '#FEE2E2',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#FCA5A5',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                        {isBn ? 'বাতিল' : 'Remove'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Staff Selection Cards */}
                <View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                    {/* Unassigned Option */}
                    <TouchableOpacity
                      onPress={() => setSelectedStaffId('')}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: selectedStaffId === '' ? '#0F172A' : '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: selectedStaffId === '' ? '#0F172A' : '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 130,
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>⏳</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: selectedStaffId === '' ? '#FFFFFF' : '#334155', marginTop: 2 }}>
                        {isBn ? 'পরে বরাদ্দ করুন' : 'Unassigned'}
                      </Text>
                      <Text style={{ fontSize: 10, color: selectedStaffId === '' ? '#94A3B8' : '#64748B' }}>
                        {isBn ? 'অপেক্ষমাণ থাকবে' : 'Assign Later'}
                      </Text>
                    </TouchableOpacity>

                    {/* Staff List */}
                    {filteredStaff.map(st => {
                      const active = selectedStaffId === st.id;
                      const isBusy = st.status === 'in_service' || st.status === 'busy';
                      return (
                        <TouchableOpacity
                          key={st.id}
                          onPress={() => setSelectedStaffId(st.id)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: active ? '#E0F2FE' : '#FFFFFF',
                            borderWidth: 2,
                            borderColor: active ? '#0284C7' : '#E2E8F0',
                            minWidth: 165,
                            gap: 2,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.04,
                            shadowRadius: 2,
                            elevation: 1,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 4 }} numberOfLines={1}>
                              {isBn ? (st.nameBn || st.name) : st.name}
                            </Text>
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: isBusy ? '#F59E0B' : '#10B981',
                              }}
                            />
                          </View>
                          <Text style={{ fontSize: 10.5, color: '#64748B' }} numberOfLines={1}>
                            {isBn ? (st.roleBn || st.role || 'প্রোটোকল অফিসার') : (st.role || 'Protocol Officer')}
                          </Text>
                          {(st.phoneDisplay || st.phone) ? (
                            <Text style={{ fontSize: 9.5, color: '#0284C7', fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                              📞 {st.phoneDisplay || st.phone}
                            </Text>
                          ) : null}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: '#475569' }}>
                              {st.badgeNo || st.id}
                            </Text>
                            <View
                              style={{
                                backgroundColor: isBusy ? '#FEF3C7' : '#DCFCE7',
                                paddingHorizontal: 5,
                                paddingVertical: 1.5,
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{ fontSize: 8.5, color: isBusy ? '#B45309' : '#15803D', fontWeight: '800' }}>
                                {isBusy ? (isBn ? 'সেবায় যুক্ত' : 'In Service') : (isBn ? 'উপলব্ধ' : 'Available')}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Empty Search Result */}
                  {filteredStaff.length === 0 && (
                    <View style={{ padding: 12, backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', marginTop: 8 }}>
                      <Text style={{ fontSize: 12, color: '#B45309', textAlign: 'center' }}>
                        {isBn
                          ? `"${staffSearchQuery}" দিয়ে কোনো প্রোটোকল অফিসার পাওয়া যায়নি। অন্য নাম বা ফোন নম্বর দিয়ে খুঁজুন।`
                          : `No protocol officer found matching "${staffSearchQuery}". Try another name or phone number.`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Staff Instructions */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                    {isBn ? 'ডিউটি অফিসারকে বিশেষ নির্দেশনা / ব্রিফিং:' : 'Staff Briefing / Duty Instructions:'}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: '#0F172A',
                    }}
                    placeholder={isBn ? 'যেমন: যাত্রী প্রবীণ ও হুইলচেয়ার ব্যবহার করবেন। লাগেজ ৩টি বেল্ট ৪ এ আসবে।' : 'e.g. Passenger needs wheelchair at gate. 3 bags arriving at belt 4.'}
                    placeholderTextColor="#94A3B8"
                    value={staffInstructions}
                    onChangeText={setStaffInstructions}
                  />
                </View>
              </View>

              {/* SECTION 5: বিলিং ও পেমেন্ট সেটেলমেন্ট */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 16,
                  gap: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>💳</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                    {isAdmin ? (isBn ? '৫. রেট, বিলিং ও পেমেন্ট সেটেলমেন্ট' : '5. Pricing, Billing & Payment Settlement') : (isBn ? '৫. বুকিং নিশ্চিতকরণ ও সার্ভিস স্ট্যাটাস' : '5. Booking Confirmation & Service Status')}
                  </Text>
                </View>

                {/* Price Display & Custom Override Toggle */}
                {isAdmin ? (
                  <View
                    style={{
                      backgroundColor: '#F0F9FF',
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#BAE6FD',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 11, color: '#0369A1', fontWeight: '700' }}>
                        {isBn ? 'মোট হিসাবকৃত মূল্য:' : 'Total Calculated Amount:'}
                      </Text>
                      <Text style={{ fontSize: 24, fontWeight: '900', color: '#0284C7' }}>
                        ৳ {finalPrice.toLocaleString('en-IN')}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        {isBn
                          ? `(প্যাকেজ: ৳${Math.round(computedBasePrice)} + অ্যাড-অন: ৳${addonsTotal})`
                          : `(Base: ৳${Math.round(computedBasePrice)} + Addons: ৳${addonsTotal})`}
                      </Text>
                    </View>

                    {/* Manual Override Action */}
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setIsManualPriceOverride(!isManualPriceOverride);
                          if (!isManualPriceOverride) {
                            setOverridePriceInput(String(autoCalculatedTotal));
                          }
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          backgroundColor: isManualPriceOverride ? '#0284C7' : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#0284C7',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isManualPriceOverride ? '#FFFFFF' : '#0284C7' }}>
                          {isBn ? (isManualPriceOverride ? '✓ কাস্টম রেট সক্রিয়' : '✏️ কাস্টম রেট লিখুন') : (isManualPriceOverride ? '✓ Custom Rate Active' : '✏️ Override Price')}
                        </Text>
                      </TouchableOpacity>

                      {isManualPriceOverride && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>৳</Text>
                          <TextInput
                            style={{
                              backgroundColor: '#FFFFFF',
                              borderWidth: 1,
                              borderColor: '#0284C7',
                              borderRadius: 8,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              fontSize: 14,
                              fontWeight: '800',
                              color: '#0F172A',
                              width: 100,
                              textAlign: 'right',
                            }}
                            keyboardType="numeric"
                            value={overridePriceInput}
                            onChangeText={setOverridePriceInput}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' }}>
                    <Text style={{ fontSize: 12.5, color: '#047857', fontWeight: '700' }}>
                      ✓ {isBn ? 'অফলাইন প্রোটোকল সার্ভিস স্বয়ংক্রিয় অনুমোদিত রেট অনুযায়ী বুক করা হচ্ছে।' : 'Standard protocol rates applied automatically by Super Admin.'}
                    </Text>
                  </View>
                )}

                {/* Payment Status Selection */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                    {isBn ? 'পেমেন্ট স্ট্যাটাস:' : 'Payment Status:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { id: 'paid', labelEn: 'Paid (পরিশোধিত)', color: '#059669', bg: '#D1FAE5', icon: '✅' },
                      { id: 'pay_after_service', labelEn: 'Pay After Service (সার্ভিস শেষে)', color: '#D97706', bg: '#FEF3C7', icon: '⏳' },
                      { id: 'pending', labelEn: 'Pending (বকেয়া)', color: '#DC2626', bg: '#FEE2E2', icon: '⚠️' },
                      { id: 'complimentary', labelEn: 'Complimentary (সৌজন্যমূলক ফ্রি)', color: '#7C3AED', bg: '#EDE9FE', icon: '🎁' },
                    ].map(st => {
                      const active = paymentStatus === st.id;
                      return (
                        <TouchableOpacity
                          key={st.id}
                          onPress={() => setPaymentStatus(st.id)}
                          style={{
                            flex: 1,
                            minWidth: 140,
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderRadius: 10,
                            backgroundColor: active ? st.bg : '#F8FAFC',
                            borderWidth: 1.5,
                            borderColor: active ? st.color : '#CBD5E1',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Text style={{ fontSize: 13 }}>{st.icon}</Text>
                          <Text style={{ fontSize: 11, fontWeight: active ? '800' : '600', color: active ? st.color : '#334155' }}>
                            {st.labelEn}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Payment Method Selection */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                    {isBn ? 'পেমেন্ট মাধ্যম / চ্যানেল:' : 'Payment Method / Instrument:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { id: 'cash', labelEn: 'Counter Cash (কাউন্টার ক্যাশ)', icon: '💵' },
                      { id: 'pos_card', labelEn: 'POS Card Machine (কার্ড)', icon: '💳' },
                      { id: 'bkash', labelEn: 'bKash Merchant (বিকাশ)', icon: '📱' },
                      { id: 'nagad', labelEn: 'Nagad (নগদ)', icon: '📲' },
                      { id: 'pay_after_service', labelEn: 'Pay After Service (পরে পরিশোধ)', icon: '🤝' },
                      { id: 'corporate', labelEn: 'Corporate Bill (কর্পোরেট ইনভয়েস)', icon: '🏢' },
                    ].map(pm => {
                      const active = paymentMethod === pm.id;
                      return (
                        <TouchableOpacity
                          key={pm.id}
                          onPress={() => setPaymentMethod(pm.id)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 10,
                            backgroundColor: active ? '#0F172A' : '#F8FAFC',
                            borderWidth: 1,
                            borderColor: active ? '#0F172A' : '#CBD5E1',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Text style={{ fontSize: 14 }}>{pm.icon}</Text>
                          <Text style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? '#FFFFFF' : '#334155' }}>
                            {pm.labelEn}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Receipt Number Input */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    {isBn ? 'মানি রিসিট / মেমো নম্বর:' : 'Receipt / TrxID:'}
                  </Text>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      fontSize: 13,
                      fontWeight: '700',
                      color: '#0F172A',
                    }}
                    value={receiptNumber}
                    onChangeText={setReceiptNumber}
                  />
                </View>
              </View>

              {/* SECTION 6: বিশেষ মন্তব্য */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 16,
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                  {isBn ? '৬. বিশেষ মন্তব্য ও নোট (ঐচ্ছিক)' : '6. Remarks & Special Notes (Optional)'}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#0F172A',
                    minHeight: 50,
                  }}
                  placeholder={isBn ? 'যেমন: পরিবারের সদস্যরা কার পার্কে অপেক্ষা করবেন। লাগেজ ৪টি।' : 'e.g. Family awaiting at car park. 4 bags total.'}
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={remarks}
                  onChangeText={setRemarks}
                />
              </View>
            </ScrollView>
          )}

          {/* Footer Actions (When Form is Active) */}
          {!savedSuccessBooking && (
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
                paddingHorizontal: 20,
                paddingVertical: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <TouchableOpacity
                onPress={onClose}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                  {isBn ? 'বাতিল করুন' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 11,
                  borderRadius: 10,
                  backgroundColor: isSaving ? '#94A3B8' : '#0284C7',
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
                <Text style={{ fontSize: 16 }}>💾</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                  {isSaving
                    ? (isBn ? 'সংরক্ষণ করা হচ্ছে...' : 'Saving Booking...')
                    : (isBn ? '✓ সার্ভিস সেভ ও ড্যাশবোর্ডে নিশ্চিত করুন' : '✓ Save & Confirm Offline Booking')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>

      {/* Date Picker Modal for Quick Easy Date Selection */}
      <DatePickerModal
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        onSelectDate={(date) => {
          setServiceDate(date);
          setShowDateModal(false);
        }}
        selectedDate={serviceDate}
        lang={lang}
      />

      {/* Time Picker Modal for Easy, Interactive Time Selection */}
      <TimePickerModal
        visible={showTimeModal}
        onClose={() => setShowTimeModal(false)}
        onSelectTime={(time) => {
          setServiceTime(time);
          setShowTimeModal(false);
        }}
        selectedTime={serviceTime}
        lang={lang}
      />
    </>
  );
}

