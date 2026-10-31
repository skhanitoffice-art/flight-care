import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Image,
  useWindowDimensions,
} from 'react-native';
import {
  CalendarIcon,
  UserIcon,
  StandardPkgIcon,
  PremiumPkgIcon,
  VipPkgIcon,
  StarCoinIcon,
  ArrivalIcon,
  DepartureIcon,
  CheckCircleIcon,
} from './Icons';
import { PKGS, SERVICES, ADDONS, getAddonAsset } from '../constants/data';
import { isValidFlightNumber, isValidFlightDate, isPastFlightDate } from '../utils/helpers';
import {
  searchFlightSuggestions,
  getLiveFlightStatus,
} from '../services/flightService';

export default function QuickBookingModal({
  visible,
  onClose,
  onSubmit,
  startBooking,
  initialData = {},
  lang = 1, // 1 = Bn, 0 = En
  airport = { code: 'DAC', name: ['Hazrat Shahjalal International Airport', 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর'] },
}) {
  const isBn = lang === 1;
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isMobile = winWidth < 680;

  // Animation values
  const animProgress = useRef(new Animated.Value(0)).current;

  // Form states
  const [nameTitle, setNameTitle] = useState('MR.');
  const [passengerName, setPassengerName] = useState('');
  const [phone, setPhone] = useState('');
  const [direction, setDirection] = useState('arr');
  const [flightNumber, setFlightNumber] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState('business'); // Standard | Premium | VIP
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [flightSuggestions, setFlightSuggestions] = useState([]);
  const [showFlightSuggestions, setShowFlightSuggestions] = useState(false);
  const [selectedFlightData, setSelectedFlightData] = useState(null);
  const [errors, setErrors] = useState({});

  // Sync initialData when modal opens
  useEffect(() => {
    if (visible) {
      setDirection(initialData.direction || 'arr');
      setFlightNumber((initialData.flightNumber || '').toUpperCase());
      setServiceDate(initialData.serviceDate || '');
      setPassengerCount(Number(initialData.passengerCount) || 1);
      setSelectedPackage(initialData.selectedPackage || 'business');
      setSelectedAddons(initialData.selectedAddons || []);
      setPassengerName(initialData.name || '');
      setPhone(initialData.phone || '');
      setErrors({});

      // Start spring opening animation
      animProgress.setValue(0);
      Animated.spring(animProgress, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, initialData]);

  const handleClose = () => {
    Animated.timing(animProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (onClose) onClose();
    });
  };

  // Helper date shortcuts (Today, Tomorrow, +2 Days)
  const getFormattedDate = daysAhead => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleFlightInputChange = text => {
    const upper = text.toUpperCase();
    setFlightNumber(upper);
    setSelectedFlightData(null);

    if (upper.trim()) {
      const suggestions = searchFlightSuggestions(upper, direction);
      setFlightSuggestions(suggestions);
      setShowFlightSuggestions(suggestions.length > 0);
      if (errors.flightNumber) {
        setErrors(e => ({ ...e, flightNumber: null }));
      }
    } else {
      setFlightSuggestions([]);
      setShowFlightSuggestions(false);
    }
  };

  const toggleAddon = id => {
    setSelectedAddons(prev => {
      const exists = prev.includes(id);
      return exists ? prev.filter(x => x !== id) : [...prev, id];
    });
  };

  // Calculate live estimate
  const pkgObj = PKGS.find(p => p.id === selectedPackage) || PKGS[1];
  const pkgRate = pkgObj?.p || 1000;
  const addonsTotal = selectedAddons.reduce((sum, addId) => {
    const ad = ADDONS.find(a => a.id === addId);
    return sum + (ad?.p || 0);
  }, 0);
  const totalEstimated = (pkgRate * passengerCount) + addonsTotal;
  const pointsEarned = selectedPackage === 'first' ? 150 : selectedPackage === 'business' ? 100 : 50;

  const handleSubmit = () => {
    const newErrors = {};
    const trimmedName = passengerName.trim();
    const trimmedFlight = flightNumber.trim();
    const trimmedDate = serviceDate.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      newErrors.passengerName = isBn
        ? 'অনুগ্রহ করে যাত্রীর নাম লিখুন'
        : 'Please enter passenger name';
    }

    if (!trimmedFlight) {
      newErrors.flightNumber = isBn
        ? 'অনুগ্রহ করে ফ্লাইট নম্বর দিন (যেমন: BG-084, EK-582)'
        : 'Please enter flight number (e.g. BG-084, EK-582)';
    } else if (!isValidFlightNumber(trimmedFlight)) {
      newErrors.flightNumber = isBn
        ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
        : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)';
    }

    if (!trimmedDate) {
      newErrors.serviceDate = isBn
        ? 'অনুগ্রহ করে সেবার তারিখ নির্বাচন করুন'
        : 'Please select service date';
    } else if (!isValidFlightDate(trimmedDate)) {
      newErrors.serviceDate = isBn
        ? 'সঠিক তারিখ ফরম্যাট দিন (DD-MM-YYYY)'
        : 'Enter a valid date (DD-MM-YYYY)';
    } else if (isPastFlightDate(trimmedDate)) {
      newErrors.serviceDate = isBn
        ? 'অতীতের কোনো তারিখ নির্বাচন করা যাবে না'
        : 'Cannot select a past date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const fullPassengerName = `${nameTitle} ${trimmedName}`.trim();
    const liveInfo = (selectedFlightData && selectedFlightData.direction === direction)
      ? selectedFlightData
      : getLiveFlightStatus(trimmedFlight, direction);

    const bookingPayload = {
      direction,
      fno: liveInfo?.fno || trimmedFlight,
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
      name: fullPassengerName,
      phone: trimmedPhone,
      selectedPackage,
      selectedAddons,
    };

    if (startBooking) {
      const matchedService = SERVICES.find(s => s.cat === direction) || SERVICES[0];
      startBooking(
        matchedService,
        selectedAddons,
        selectedPackage,
        direction,
        bookingPayload
      );
    } else if (onSubmit) {
      onSubmit(bookingPayload);
    }

    handleClose();
  };

  if (!visible) return null;

  // Animation interpolation
  const backdropOpacity = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const cardScale = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });

  const cardTranslateY = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
        />

        {/* Animated Modal Container */}
        <Animated.View
          style={[
            styles.modalCard,
            {
              width: isMobile ? winWidth * 0.95 : Math.min(winWidth * 0.9, 640),
              maxHeight: winHeight * 0.92,
              transform: [
                { scale: cardScale },
                { translateY: cardTranslateY },
              ],
            },
          ]}
        >
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={styles.headerIconDisc}>
                <Text style={{ fontSize: 22 }}>✈️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.titleText}>
                    {isBn ? 'ভিআইপি এয়ারপোর্ট বুকিং ফর্ম' : 'VIP Airport Booking Form'}
                  </Text>
                  <View style={styles.hsiaPill}>
                    <Text style={styles.hsiaPillText}>HSIA • DAC</Text>
                  </View>
                </View>
                <Text style={styles.subtitleText}>
                  {isBn
                    ? 'যাত্রীর নাম, ফ্লাইট নম্বর, তারিখ ও সার্ভিস নির্বাচন করে সরাসরি বুক করুন'
                    : 'Select passenger name, flight number, date & service to book'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form Scroll Area */}
          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ========================================================= */}
            {/* 1. DIRECTION TOGGLE (ARRIVAL vs DEPARTURE)                */}
            {/* ========================================================= */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionLabel}>
                {isBn ? '১. ভ্রমণের দিক নির্বাচন করুন *' : '1. Select Travel Direction *'}
              </Text>
              <View style={styles.directionToggleRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setDirection('arr');
                    if (flightNumber) handleFlightInputChange(flightNumber);
                  }}
                  style={[
                    styles.directionTab,
                    direction === 'arr' && styles.directionTabActive,
                  ]}
                >
                  <ArrivalIcon size={18} color={direction === 'arr' ? '#FFFFFF' : '#0284C7'} />
                  <Text
                    style={[
                      styles.directionTabText,
                      direction === 'arr' && styles.directionTabTextActive,
                    ]}
                  >
                    {isBn ? '🛬 আগমন (Arrival)' : '🛬 Arrival Meet & Greet'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setDirection('dep');
                    if (flightNumber) handleFlightInputChange(flightNumber);
                  }}
                  style={[
                    styles.directionTab,
                    direction === 'dep' && styles.directionTabActive,
                  ]}
                >
                  <DepartureIcon size={18} color={direction === 'dep' ? '#FFFFFF' : '#0284C7'} />
                  <Text
                    style={[
                      styles.directionTabText,
                      direction === 'dep' && styles.directionTabTextActive,
                    ]}
                  >
                    {isBn ? '🛫 প্রস্থান (Departure)' : '🛫 Departure Meet & Greet'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ========================================================= */}
            {/* 2. PASSENGER NAME (যাত্রীর নাম)                           */}
            {/* ========================================================= */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionLabel}>
                {isBn ? '২. যাত্রীর নাম (পাসপোর্ট/এনআইডি অনুযায়ী) *' : '2. Passenger Name (as on Passport/NID) *'}
              </Text>

              {/* Title Prefixes */}
              <View style={styles.prefixRow}>
                {['MR.', 'MRS.', 'MS.', 'DR.', 'ENGR.', 'BEGUM'].map(pfx => (
                  <TouchableOpacity
                    key={pfx}
                    activeOpacity={0.7}
                    onPress={() => setNameTitle(pfx)}
                    style={[
                      styles.prefixBtn,
                      nameTitle === pfx && styles.prefixBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.prefixBtnText,
                        nameTitle === pfx && styles.prefixBtnTextActive,
                      ]}
                    >
                      {pfx}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View
                style={[
                  styles.inputContainer,
                  errors.passengerName && styles.inputContainerError,
                ]}
              >
                <UserIcon size={18} color="#0284C7" />
                <TextInput
                  style={styles.textInput}
                  value={passengerName}
                  onChangeText={txt => {
                    setPassengerName(txt);
                    if (errors.passengerName) setErrors(e => ({ ...e, passengerName: null }));
                  }}
                  placeholder={isBn ? 'যেমন: MD. SHAWKAT ALI' : 'e.g. MD. SHAWKAT ALI'}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />
              </View>
              {errors.passengerName && (
                <Text style={styles.errorText}>⚠️ {errors.passengerName}</Text>
              )}

              {/* Optional Phone Number */}
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.sectionLabel, { fontSize: 12, marginBottom: 4 }]}>
                  {isBn ? 'যোগাযোগের ফোন নম্বর (হোয়াটসঅ্যাপ/মোবাইল)' : 'Contact Phone Number (WhatsApp/Mobile)'}
                </Text>
                <View style={styles.inputContainer}>
                  <View style={styles.bdBadge}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>🇧🇩 +880</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="01712-345678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            {/* ========================================================= */}
            {/* 3. FLIGHT NUMBER & DATE (ফ্লাইট নম্বর ও তারিখ)            */}
            {/* ========================================================= */}
            <View style={styles.sectionBox}>
              <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 12 }}>
                {/* Flight Number with Autocomplete */}
                <View style={{ flex: 1.2, position: 'relative', zIndex: 100 }}>
                  <Text style={styles.sectionLabel}>
                    {isBn ? '৩. ফ্লাইট নম্বর *' : '3. Flight Number *'}
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.flightNumber && styles.inputContainerError,
                    ]}
                  >
                    <Text style={{ fontSize: 14 }}>✈️</Text>
                    <TextInput
                      style={styles.textInput}
                      value={flightNumber}
                      onChangeText={handleFlightInputChange}
                      placeholder={isBn ? 'যেমন: BG-084, EK-582' : 'e.g. BG-084, EK-582'}
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                    />
                  </View>
                  {errors.flightNumber && (
                    <Text style={styles.errorText}>⚠️ {errors.flightNumber}</Text>
                  )}

                  {/* Flight Suggestions Dropdown */}
                  {showFlightSuggestions && flightSuggestions.length > 0 && (
                    <View style={styles.suggestionsDropdown}>
                      {flightSuggestions.slice(0, 5).map((item, idx) => (
                        <TouchableOpacity
                          key={`${item.fno}_${idx}`}
                          activeOpacity={0.7}
                          onPress={() => {
                            setFlightNumber(item.fno);
                            setSelectedFlightData(item);
                            if (item.date && !serviceDate) {
                              setServiceDate(item.date);
                            }
                            setShowFlightSuggestions(false);
                            setErrors(e => ({ ...e, flightNumber: null }));
                          }}
                          style={styles.suggestionItem}
                        >
                          <Text style={{ fontSize: 16 }}>{item.logo}</Text>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.sugFno}>{item.fno}</Text>
                              <Text style={styles.sugAirline}>
                                {isBn ? item.airlineBn || item.airline : item.airline}
                              </Text>
                            </View>
                            <Text style={styles.sugRoute}>
                              {isBn ? `${item.originBn || item.origin} ➔ ${item.destinationBn || item.destination}` : `${item.origin} ➔ ${item.destination}`}
                            </Text>
                          </View>
                          <View style={styles.terminalTag}>
                            <Text style={styles.terminalTagText}>{item.terminal}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Service Date with Quick Shortcuts */}
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.sectionLabel}>
                    {isBn ? '৪. সেবার তারিখ *' : '4. Service Date *'}
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.serviceDate && styles.inputContainerError,
                    ]}
                  >
                    <CalendarIcon size={18} color="#0284C7" />
                    <TextInput
                      style={styles.textInput}
                      value={serviceDate}
                      onChangeText={txt => {
                        setServiceDate(txt);
                        if (errors.serviceDate) setErrors(e => ({ ...e, serviceDate: null }));
                      }}
                      placeholder="DD-MM-YYYY"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  {errors.serviceDate && (
                    <Text style={styles.errorText}>⚠️ {errors.serviceDate}</Text>
                  )}

                  {/* Date Quick Shortcuts */}
                  <View style={styles.dateShortcutsRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        setServiceDate(getFormattedDate(0));
                        setErrors(e => ({ ...e, serviceDate: null }));
                      }}
                      style={styles.datePill}
                    >
                      <Text style={styles.datePillText}>{isBn ? 'আজ' : 'Today'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        setServiceDate(getFormattedDate(1));
                        setErrors(e => ({ ...e, serviceDate: null }));
                      }}
                      style={styles.datePill}
                    >
                      <Text style={styles.datePillText}>{isBn ? 'আগামীকাল' : 'Tomorrow'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        setServiceDate(getFormattedDate(2));
                        setErrors(e => ({ ...e, serviceDate: null }));
                      }}
                      style={styles.datePill}
                    >
                      <Text style={styles.datePillText}>+২ দিন</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* ========================================================= */}
            {/* 4. SERVICE SELECTION (সার্ভিস ও প্যাকেজ নির্বাচন)          */}
            {/* ========================================================= */}
            <View style={styles.sectionBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.sectionLabel}>
                  {isBn ? '৫. সার্ভিস প্যাকেজ নির্বাচন করুন *' : '5. Select Service Package *'}
                </Text>
                <View style={styles.passengersCounter}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginRight: 6 }}>
                    {isBn ? 'যাত্রী:' : 'Pass:'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                    style={styles.counterBtn}
                  >
                    <Text style={styles.counterBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterVal}>{passengerCount}</Text>
                  <TouchableOpacity
                    onPress={() => setPassengerCount(Math.min(10, passengerCount + 1))}
                    style={styles.counterBtn}
                  >
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3 Packages in a Row */}
              <View style={styles.packagesRow}>
                {/* Standard */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedPackage('economy')}
                  style={[
                    styles.packageCard,
                    selectedPackage === 'economy' && styles.packageCardActive,
                  ]}
                >
                  <StandardPkgIcon size={26} color="#0284C7" />
                  <Text style={styles.pkgTitle}>{isBn ? 'স্ট্যান্ডার্ড' : 'Standard'}</Text>
                  <Text style={styles.pkgPrice}>৳৫০০</Text>
                  <Text style={styles.pkgScope} numberOfLines={1}>
                    {isBn ? 'বোর্ডিং পাস পর্যন্ত' : 'Up to Boarding'}
                  </Text>
                  <View style={styles.pointPill}>
                    <Text style={styles.pointPillText}>+50 pts</Text>
                  </View>
                </TouchableOpacity>

                {/* Premium */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedPackage('business')}
                  style={[
                    styles.packageCard,
                    selectedPackage === 'business' && styles.packageCardActive,
                  ]}
                >
                  <PremiumPkgIcon size={26} color="#2563EB" />
                  <Text style={styles.pkgTitle}>{isBn ? 'প্রিমিয়াম' : 'Premium'}</Text>
                  <Text style={styles.pkgPrice}>৳১,০০০</Text>
                  <Text style={styles.pkgScope} numberOfLines={1}>
                    {isBn ? 'ইমিগ্রেশন পর্যন্ত' : 'Up to Immigration'}
                  </Text>
                  <View style={styles.pointPill}>
                    <Text style={styles.pointPillText}>+100 pts</Text>
                  </View>
                </TouchableOpacity>

                {/* VIP */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedPackage('first')}
                  style={[
                    styles.packageCard,
                    selectedPackage === 'first' && styles.packageCardActiveVip,
                  ]}
                >
                  <VipPkgIcon size={26} color="#D97706" />
                  <Text style={styles.pkgTitle}>{isBn ? 'ভিআইপি' : 'VIP'}</Text>
                  <Text style={[styles.pkgPrice, { color: '#B45309' }]}>৳১,৫০০</Text>
                  <Text style={styles.pkgScope} numberOfLines={1}>
                    {isBn ? 'বোর্ডিং ব্রিজ পর্যন্ত' : 'Aerobridge Escort'}
                  </Text>
                  <View style={[styles.pointPill, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.pointPillText, { color: '#B45309' }]}>+150 pts</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Optional Additional Services Quick Select Chips */}
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                  {isBn ? 'প্রয়োজনীয় অতিরিক্ত সেবা যুক্ত করুন (ঐচ্ছিক):' : 'Add Essential Assistance (Optional):'}
                </Text>
                <View style={styles.addonChipsWrap}>
                  {[
                    { id: 'wheel', label: isBn ? '♿ হুইলচেয়ার (+৳৩০০)' : '♿ Wheelchair (+৳300)' },
                    { id: 'wrap', label: isBn ? '🎒 লাগেজ র‍্যাপিং (+৳৪০০)' : '🎒 Luggage Wrap (+৳400)' },
                    { id: 'visa', label: isBn ? '🛂 অন-অ্যারাইভাল ভিসা' : '🛂 Visa On Arrival' },
                    { id: 'transfer', label: isBn ? '🚗 গাড়ি ভাড়া' : '🚗 Airport Car' },
                  ].map(item => {
                    const isAdded = selectedAddons.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.7}
                        onPress={() => toggleAddon(item.id)}
                        style={[
                          styles.addonChip,
                          isAdded && styles.addonChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.addonChipText,
                            isAdded && styles.addonChipTextActive,
                          ]}
                        >
                          {item.label} {isAdded ? '✓' : '+'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Bar with Price Total & Submit Button */}
          <View style={styles.footer}>
            <View style={styles.priceEstimateBox}>
              <Text style={styles.estLabel}>{isBn ? 'আনুমানিক মোট বিল:' : 'Estimated Total:'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={styles.estAmount}>৳{totalEstimated.toLocaleString()}</Text>
                <Text style={styles.estPoints}>
                  (+{pointsEarned * passengerCount} {isBn ? 'পয়েন্ট' : 'pts'})
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              style={styles.submitBtn}
            >
              <Text style={styles.submitBtnText}>
                {isBn ? 'বুকিং নিশ্চিত করুন ➔' : 'Confirm & Proceed ➔'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99999,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }
      : {}),
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1.2,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  hsiaPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  hsiaPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  subtitleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sectionBox: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  directionToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  directionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  directionTabActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  directionTabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  directionTabTextActive: {
    color: '#FFFFFF',
  },
  prefixRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  prefixBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  prefixBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  prefixBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  prefixBtnTextActive: {
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 44,
  },
  inputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    padding: 0,
    outlineStyle: 'none',
  },
  bdBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 4,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 9999,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sugFno: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  sugAirline: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  sugRoute: {
    fontSize: 11,
    color: '#64748B',
  },
  terminalTag: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  terminalTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  dateShortcutsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  datePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  datePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  passengersCounter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  counterVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0284C7',
    paddingHorizontal: 8,
  },
  packagesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  packageCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.8,
    borderColor: '#E2E8F0',
    padding: 10,
    alignItems: 'center',
  },
  packageCardActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  packageCardActiveVip: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  pkgTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  pkgPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0284C7',
    marginTop: 2,
  },
  pkgScope: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  pointPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginTop: 4,
  },
  pointPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
  },
  addonChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  addonChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  addonChipActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  addonChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  addonChipTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1.2,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  priceEstimateBox: {
    flex: 1,
  },
  estLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  estAmount: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0284C7',
  },
  estPoints: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#D97706',
  },
  submitBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
