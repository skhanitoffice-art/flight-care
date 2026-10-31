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
  Linking,
  Keyboard,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { s } from '../styles/styles';
import { PKGS, PACKAGE_FEATURES, SERVICES, ADDONS, getAddonAsset } from '../constants/data';
import {
  ArrivalIcon,
  DepartureIcon,
  LocationPinIcon,
  CalendarIcon,
  StandardPkgIcon,
  CheckBadge,
  PremiumPkgIcon,
  VipPkgIcon,
  AdditionalServicesIcon,
  HeadphonesIcon,
  ChevronRight,
  BellIcon,
  MenuIcon,
} from '../components/Icons';
import DesktopHomeScreen from '../components/DesktopHomeScreen';
import DesktopFooter from '../components/DesktopFooter';
import DatePickerModal from '../components/DatePickerModal';
import AdditionalServicesModal from '../components/AdditionalServicesModal';
import Parallax3DAtmosphere from '../components/Parallax3DAtmosphere';
import { isValidFlightNumber, isValidFlightDate, createAddonDetails } from '../utils/helpers';
import {
  searchFlightSuggestions,
  getLiveFlightStatus,
  normalizeFlightNumberInput,
  isPastFlightDate,
  searchLiveFlightsFromAviationStack,
} from '../services/flightService';
import CustomerRewardsCard from '../components/CustomerRewardsCard';

export default function HomeScreen({
  lang,
  setLang,
  t,
  airport,
  setAirport,
  serviceCatalog = [],
  addonCatalog = [],
  startBooking,
  setDetail,
  setGuidancePopup,
  q,
  setQ,
  responsive,
  windowWidth,
  pagePadding,
  bannerIndex,
  setBannerIndex,
  profile,
  setShowAirportModal,
  setTab,
  setWiz,
  customerSession,
  onPressOfficers,
  notifications = [],
  navigateToSubPage,
  openAuthView,
}) {
  if (responsive?.isWide) {
    return (
      <DesktopHomeScreen
        lang={lang}
        setLang={setLang}
        airport={airport}
        setAirport={setAirport}
        serviceCatalog={serviceCatalog}
        addonCatalog={addonCatalog}
        startBooking={startBooking}
        customerSession={customerSession}
        setTab={setTab}
        setWiz={setWiz}
        setDetail={setDetail}
        setShowAirportModal={setShowAirportModal}
        profile={profile}
        onPressOfficers={onPressOfficers}
        navigateToSubPage={navigateToSubPage}
        notifications={notifications}
        openAuthView={openAuthView}
      />
    );
  }

  const [direction, setDirection] = useState('arr'); // 'arr' | 'dep'
  const [flightNumber, setFlightNumber] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState('business'); // Default: 'business' (Premium 1000 Tk)
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [addonDetails, setAddonDetails] = useState(createAddonDetails());
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [flightSuggestions, setFlightSuggestions] = useState([]);
  const [showFlightSuggestions, setShowFlightSuggestions] = useState(false);
  const [selectedFlightData, setSelectedFlightData] = useState(null);
  const [isSearchingAviation, setIsSearchingAviation] = useState(false);
  const searchDebounceTimer = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showNavMenu, setShowNavMenu] = useState(false);
  const unreadCount = (notifications || []).filter(n => !n.read).length;

  const handleFlightInputChange = (rawVal, customDir = null) => {
    const dirToUse = customDir || direction;
    const upper = (rawVal || '').toUpperCase();
    setFlightNumber(upper);
    setSelectedFlightData(null);

    if (upper.trim()) {
      // 1. Instant local matches strictly for Dhaka
      const localMatches = searchFlightSuggestions(upper, dirToUse);
      setFlightSuggestions(localMatches);
      setShowFlightSuggestions(localMatches.length > 0);

      // 2. Debounced AviationStack API call strictly for Dhaka
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
      } else if (errors.flightNumber) {
        setErrors(e => ({ ...e, flightNumber: null }));
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
      newErrors.flightNumber = lang === 1
        ? 'অনুগ্রহ করে ফ্লাইট নম্বর দিন (যেমন: BG-084, EK-582)'
        : 'Please enter flight number (e.g. BG-084, EK-582)';
    } else if (!isValidFlightNumber(trimmedFlight)) {
      newErrors.flightNumber = lang === 1
        ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
        : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)';
    }

    if (!trimmedDate) {
      newErrors.serviceDate = lang === 1
        ? 'অনুগ্রহ করে সেবার তারিখ নির্বাচন করুন'
        : 'Please select service date';
    } else if (!isValidFlightDate(trimmedDate)) {
      newErrors.serviceDate = isPastFlightDate(trimmedDate)
        ? (lang === 1 ? 'অতীতের তারিখ গ্রহণযোগ্য নয়। আজকের বা ভবিষ্যতের তারিখ দিন।' : 'Past dates are not allowed. Please choose today or a future date.')
        : (lang === 1 ? 'সঠিক তারিখ দিন (DD-MM-YYYY)' : 'Enter a valid date (DD-MM-YYYY)');
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
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC', position: 'relative' }}>
      <Parallax3DAtmosphere scrollY={scrollY} isMobile={true} />
      <ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: responsive.isPhone ? 16 : 24,
          paddingTop: 18,
          paddingBottom: 115,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={{ flex: 1, backgroundColor: 'transparent', zIndex: 1 }}
      >
      <View style={{ width: '100%', maxWidth: 460 }}>
          {/* Mobile FlightCare Brand Header Bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              paddingHorizontal: 4,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (setWiz) setWiz(null);
                if (setDetail) setDetail(null);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 44, height: 44, resizeMode: 'contain' }}
              />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ fontSize: 19, fontWeight: '900', color: '#0F2A4A', letterSpacing: -0.5 }}>
                    Flight
                  </Text>
                  <Text style={{ fontSize: 19, fontWeight: '900', color: '#F97316', letterSpacing: -0.5 }}>
                    Care
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#0284C7' }}>
                  Your Journey Our Care
                </Text>
              </View>
            </TouchableOpacity>

            {/* Right: Notification Icon (🔔) & Hamburger Menu (☰) for Bottom Navigation */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Notification Button */}
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={lang === 1 ? 'নোটিফিকেশন' : 'Notifications'}
                onPress={() => {
                  if (setTab) setTab('inbox');
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: unreadCount > 0 ? '#EFF6FF' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: unreadCount > 0 ? '#38BDF8' : '#E2E8F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <BellIcon size={20} color={unreadCount > 0 ? '#0284C7' : '#0F2A4A'} />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: '#EF4444',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                      borderWidth: 2,
                      borderColor: '#FFFFFF',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Hamburger Menu Button */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setShowNavMenu(!showNavMenu)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  backgroundColor: showNavMenu ? '#0284C7' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: showNavMenu ? '#0284C7' : '#E2E8F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <MenuIcon size={19} color={showNavMenu ? '#FFFFFF' : '#0F2A4A'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* HSIA Certification Badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 20,
              width: '100%',
              borderWidth: 1.5,
              borderColor: '#E2E8F0',
              marginTop: 8,
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Image
              source={require('../../assets/hsia_logo.png')}
              style={{ width: 38, height: 38, resizeMode: 'contain' }}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '900', color: '#0F172A' }}>
                  Flight Care
                </Text>
                <Image
                  source={require('../../assets/verified_badge.png')}
                  style={{ width: 14, height: 14, resizeMode: 'contain' }}
                />
              </View>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0284C7', marginTop: 3.5, lineHeight: 15 }}>
                Approved by Hazrat Shahjalal International Airport (HSIA)
              </Text>
            </View>
          </View>

          {/* Main Card (Image 1) */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              padding: 20,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 3,
              marginBottom: 16,
            }}
          >
          {/* Title & Language Toggle (Mobile) */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              gap: 8,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: '#0F172A',
                letterSpacing: -0.3,
                flex: 1,
              }}
            >
              {lang === 1 ? 'এয়ারপোর্ট সহায়তা বুক করুন' : 'Book airport assistance'}
            </Text>

            {/* Language Switcher: EN | বাংলা */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F1F5F9',
                borderRadius: 20,
                padding: 3,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                gap: 2,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setLang && setLang(0)}
                style={{
                  backgroundColor: lang === 0 ? '#0284C7' : 'transparent',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: lang === 0 ? '800' : '600',
                    color: lang === 0 ? '#FFFFFF' : '#64748B',
                  }}
                >
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setLang && setLang(1)}
                style={{
                  backgroundColor: lang === 1 ? '#0284C7' : 'transparent',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: lang === 1 ? '800' : '600',
                    color: lang === 1 ? '#FFFFFF' : '#64748B',
                  }}
                >
                  বাংলা
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Customer Rewards / Loyalty Banner */}
          <CustomerRewardsCard
            customerSession={customerSession}
            lang={lang}
            setTab={setTab}
            compact={true}
          />

          {/* Segmented Direction Toggle */}
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
                height: 44,
                borderRadius: 10,
                backgroundColor: direction === 'arr' ? '#0284C7' : 'transparent',
                gap: 8,
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
                  fontSize: 15,
                  fontWeight: '700',
                  color: direction === 'arr' ? '#FFFFFF' : '#1E293B',
                }}
              >
                {lang === 1 ? 'আগমন' : 'Arrival'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: 44,
                borderRadius: 10,
                backgroundColor: direction === 'dep' ? '#0284C7' : 'transparent',
                gap: 8,
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
                  fontSize: 15,
                  fontWeight: '700',
                  color: direction === 'dep' ? '#FFFFFF' : '#1E293B',
                }}
              >
                {lang === 1 ? 'প্রস্থান' : 'Departure'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Airport Card - Fixed to Dhaka Hazrat Shahjalal International Airport */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 14,
              marginBottom: 16,
            }}
          >
            <View style={{ marginRight: 12 }}>
              <LocationPinIcon size={24} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: '#0F172A',
                }}
                numberOfLines={1}
              >
                {lang === 1 ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর' : 'Hazrat Shahjalal International Airport'}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                {lang === 1 ? 'ঢাকা • ডিএসি (DAC)' : 'Dhaka • DAC'}
              </Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#F0F9FF', borderRadius: 6, borderWidth: 1, borderColor: '#BAE6FD', flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284C7' }}>DAC</Text>
            </View>
          </View>

          {/* Inputs Row: Flight number & Service date */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14, zIndex: 50 }}>
            {/* Flight number (EditText with format validation & Auto-Complete) */}
            <View style={{ flex: 1, position: 'relative', zIndex: 100 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: 6,
                }}
              >
                {lang === 1 ? 'ফ্লাইট নম্বর *' : 'Flight number *'}
              </Text>
              <TextInput
                style={{
                  height: 46,
                  borderWidth: 1.5,
                  borderColor: errors.flightNumber ? '#EF4444' : (flightNumber.trim() && isValidFlightNumber(flightNumber) ? '#10B981' : '#CBD5E1'),
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#0F172A',
                  backgroundColor: errors.flightNumber ? '#FEF2F2' : '#FFFFFF',
                  textTransform: 'uppercase',
                  ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
                }}
                placeholder={lang === 1 ? 'যেমন: BG-084, EK-582, TK-712' : 'e.g. BG-084, EK-582, TK-712'}
                placeholderTextColor="#94A3B8"
                value={flightNumber}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
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
                      flightNumber: lang === 1
                        ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
                        : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)',
                    }));
                  }
                  setTimeout(() => setShowFlightSuggestions(false), 300);
                }}
              />
              {errors.flightNumber ? (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                  ⚠️ {errors.flightNumber}
                </Text>
              ) : flightNumber.trim() && isValidFlightNumber(flightNumber) ? (
                <Text style={{ color: '#059669', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                  ✓ {lang === 1 ? 'বৈধ ফ্লাইট নম্বর' : 'Valid flight number'}
                </Text>
              ) : null}

              {/* Floating Worldwide Auto-Complete Suggestions Box */}
              {showFlightSuggestions && flightSuggestions.length > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 74,
                    left: 0,
                    right: -130, // allow wider display across both columns
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
                      paddingVertical: 6,
                      borderBottomWidth: 1,
                      borderBottomColor: '#BAE6FD',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#0369A1' }}>
                        {lang === 1 ? '✈️ লাইভ রাডার ও ফ্লাইট সাজেশন' : '✈️ LIVE RADAR & FLIGHT SUGGESTIONS'}
                      </Text>
                      {isSearchingAviation && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <ActivityIndicator size="small" color="#0284C7" />
                          <Text style={{ fontSize: 9.5, color: '#0284C7', fontWeight: '700' }}>
                            {lang === 1 ? 'স্ক্যান...' : 'Scanning...'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setShowFlightSuggestions(false)}>
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    style={{ maxHeight: 240 }}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
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
                          Keyboard.dismiss();
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
                                    ● {lang === 1 ? 'লাইভ রাডার' : 'Live Radar'}
                                  </Text>
                                </View>
                              )}
                              <Text style={{ fontSize: 11.5, color: '#475569', fontWeight: '600' }} numberOfLines={1}>
                                {lang === 1 ? item.airlineBn : item.airline}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>
                              {lang === 1 ? `${item.originBn || item.origin} ➔ ${item.destinationBn || item.destination}` : `${item.origin} ➔ ${item.destination}`}
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
                              {lang === 1 ? item.statusBn || item.status : item.status}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Service date (EditText + Calendar Picker Button) */}
            <View style={{ flex: 1, zIndex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: 6,
                }}
              >
                {lang === 1 ? 'সেবার তারিখ *' : 'Service date *'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowDateModal(true)}
                style={{
                  height: 46,
                  borderWidth: 1.5,
                  borderColor: errors.serviceDate
                    ? '#EF4444'
                    : (serviceDate.trim() && isValidFlightDate(serviceDate) ? '#10B981' : '#CBD5E1'),
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  backgroundColor: errors.serviceDate ? '#FEF2F2' : '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <CalendarIcon size={18} color="#0284C7" />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: serviceDate ? '700' : '500',
                      color: serviceDate ? '#0F172A' : '#94A3B8',
                    }}
                    numberOfLines={1}
                  >
                    {serviceDate || (lang === 1 ? 'তারিখ নির্বাচন করুন' : 'Select service date')}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: '#F0F9FF',
                    borderWidth: 1,
                    borderColor: '#BAE6FD',
                    marginLeft: 6,
                  }}
                >
                  <Text style={{ fontSize: 13 }}>📅</Text>
                </View>
              </TouchableOpacity>
              {errors.serviceDate ? (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                  ⚠️ {errors.serviceDate}
                </Text>
              ) : serviceDate.trim() && isValidFlightDate(serviceDate) ? (
                <Text style={{ color: '#059669', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                  ✓ {lang === 1 ? 'বৈধ তারিখ' : 'Valid date'}
                </Text>
              ) : null}
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
                        {live.fno} • {lang === 1 ? live.airlineBn : live.airline}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {live.liveRadar && (
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' }} />
                      )}
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#15803D' }}>
                        {lang === 1 ? live.statusBn : live.status}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '600' }}>
                      📍 {lang === 1 ? live.routeBn : live.route}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#166534', fontWeight: '700' }}>
                      🏢 {lang === 1 ? live.terminalBn : live.terminal}
                    </Text>
                  </View>
                  <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#DCFCE7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: '#15803D' }}>
                      🤝 {lang === 1 ? `মিটিং: ${live.meetingPointBn}` : `Meeting: ${live.meetingPoint}`}
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

          {/* Passengers Row */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#475569',
                marginBottom: 6,
              }}
            >
              {lang === 1 ? 'যাত্রী সংখ্যা' : 'Passengers'}
            </Text>
            <View
              style={{
                width: 140,
                height: 44,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 10,
                backgroundColor: '#FFFFFF',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 8,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18, color: '#334155', fontWeight: '800' }}>−</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                {passengerCount}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (passengerCount < 9) {
                    setPassengerCount(passengerCount + 1);
                  }
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: passengerCount >= 9 ? '#E2E8F0' : '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: passengerCount >= 9 ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 18, color: '#334155', fontWeight: '800' }}>+</Text>
              </TouchableOpacity>
            </View>
            {passengerCount >= 9 && (
              <Text style={{ color: '#D97706', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                ⚠️ {lang === 1 ? 'সর্বোচ্চ ৯ জন যাত্রী। ১০+ এর জন্য গ্রুপ বুকিংয়ে যোগাযোগ করুন।' : 'Max 9 passengers. Contact group protocol for 10+.'}
              </Text>
            )}
          </View>

          {/* Choose your package */}
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: '#0F172A',
                marginBottom: 10,
              }}
            >
              {lang === 1 ? 'প্যাকেজ নির্বাচন করুন' : 'Choose your package'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Standard */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedPackage('economy')}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  alignItems: 'center',
                  position: 'relative',
                  borderWidth: selectedPackage === 'economy' ? 2 : 1.5,
                  borderColor: selectedPackage === 'economy' ? '#0284C7' : '#E2E8F0',
                  backgroundColor: selectedPackage === 'economy' ? '#F0F9FF' : '#FFFFFF',
                }}
              >
                {selectedPackage === 'economy' && (
                  <View style={{ position: 'absolute', top: 6, right: 6 }}>
                    <CheckBadge size={18} />
                  </View>
                )}
                <View style={{ height: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <StandardPkgIcon size={38} color="#0284C7" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                  {lang === 1 ? 'স্ট্যান্ডার্ড' : 'Standard'}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0284C7', marginTop: 3 }}>
                  {lang === 1 ? '৫০০ টাকা' : '500 Tk'}
                </Text>
              </TouchableOpacity>

              {/* Premium */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedPackage('business')}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  alignItems: 'center',
                  position: 'relative',
                  borderWidth: selectedPackage === 'business' ? 2 : 1.5,
                  borderColor: selectedPackage === 'business' ? '#7C3AED' : '#D8B4FE',
                  backgroundColor: '#FAF5FF',
                }}
              >
                {selectedPackage === 'business' && (
                  <View style={{ position: 'absolute', top: 6, right: 6 }}>
                    <CheckBadge size={18} />
                  </View>
                )}
                <View style={{ height: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <PremiumPkgIcon size={38} color="#7C3AED" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                  {lang === 1 ? 'প্রিমিয়াম' : 'Premium'}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#7C3AED', marginTop: 3 }}>
                  {lang === 1 ? '১০০০ টাকা' : '1000 Tk'}
                </Text>
              </TouchableOpacity>

              {/* VIP */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedPackage('first')}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  alignItems: 'center',
                  position: 'relative',
                  borderWidth: selectedPackage === 'first' ? 2 : 1.5,
                  borderColor: selectedPackage === 'first' ? '#D97706' : '#FDE68A',
                  backgroundColor: '#FFFBEB',
                }}
              >
                {selectedPackage === 'first' && (
                  <View style={{ position: 'absolute', top: 6, right: 6 }}>
                    <CheckBadge size={18} />
                  </View>
                )}
                <View style={{ height: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <VipPkgIcon size={38} color="#D97706" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                  {lang === 1 ? 'ভিআইপি' : 'VIP'}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#D97706', marginTop: 3 }}>
                  {lang === 1 ? '১৫০০ টাকা' : '1500 Tk'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Compare packages link */}
            <TouchableOpacity
              activeOpacity={0.7}
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
              style={{ marginTop: 10, alignSelf: 'flex-start' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#0284C7' }}>
                {lang === 1 ? 'প্যাকেজের তুলনা দেখুন →' : 'Compare packages →'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Additional Services Card (Moved above Book Now) */}
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
            style={{
              backgroundColor: selectedAddons.length > 0 ? '#F0F9FF' : '#F8FAFC',
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: selectedAddons.length > 0 ? '#0284C7' : '#BAE6FD',
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 14,
              marginBottom: 6,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor: selectedAddons.length > 0 ? '#BAE6FD' : '#E0F2FE',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Image
                source={require('../../assets/pkg_additional.webp')}
                style={{ width: 28, height: 28, resizeMode: 'contain' }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#0F172A' }}>
                  {lang === 1 ? 'অতিরিক্ত সার্ভিস' : 'Additional services'}
                </Text>
                {selectedAddons.length > 0 && (
                  <View style={{ backgroundColor: '#0284C7', paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 10 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                      {lang === 1 ? `${selectedAddons.length}টি যুক্ত` : `${selectedAddons.length} added`}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 12, color: selectedAddons.length > 0 ? '#0284C7' : '#64748B', marginTop: 1, fontWeight: selectedAddons.length > 0 ? '600' : '400' }}>
                {selectedAddons.length > 0
                  ? (lang === 1 ? 'সার্ভিস পরিবর্তন করতে ট্যাপ করুন' : 'Tap to customize services')
                  : (lang === 1 ? 'বিশেষ সহায়তা দেখুন ও বুক করুন' : 'Explore extra assistance & book')}
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
            <ChevronRight size={18} color="#0284C7" />
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
                marginTop: 6,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>
                ⚠️ {lang === 1 ? 'বুকিং শুরু করার আগে প্রয়োজনীয় তথ্য পূরণ করুন:' : 'Please fill all required fields to proceed:'}
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
              backgroundColor: '#0284C7',
              height: 50,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 10,
              shadowColor: '#0284C7',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
              {lang === 1 ? 'এখনই বুক করুন →' : 'Book Now →'}
            </Text>
          </TouchableOpacity>

          {/* Continue as guest */}
          <Text
            style={{
              fontSize: 12,
              color: '#64748B',
              textAlign: 'center',
              marginTop: 10,
            }}
          >
            {lang === 1 ? 'গেস্ট হিসেবে বুকিং করুন • লগইন প্রয়োজন নেই' : 'Continue as guest • No login needed'}
          </Text>
        </View>

        {/* Need Help Booking? Card */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <HeadphonesIcon size={24} color="#0284C7" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>
              {lang === 1 ? 'বুকিং করতে সাহায্য চান?' : 'Need help booking?'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTab && setTab('help')}
            style={{
              backgroundColor: '#E0F2FE',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <HeadphonesIcon size={16} color="#0284C7" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284C7' }}>
              {lang === 1 ? 'যোগাযোগ করুন' : 'Chat with us'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mobile Corporate & Bank Partnerships (B2B Priority Section) */}
        <View
          style={{
            backgroundColor: '#071A2E',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#1E3A5F',
            padding: 18,
            marginBottom: 24,
            shadowColor: '#071A2E',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.35)',
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FCD34D', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              🤝 {lang === 1 ? 'ব্যাংক ও করপোরেট ক্লায়েন্ট সেবা' : 'Corporate & Bank Partnerships'}
            </Text>
          </View>

          <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 }}>
            {lang === 1
              ? 'ব্যাংক কার্ডহোল্ডার ও প্রবাসীদের জন্য বিশেষ প্রোটোকল'
              : 'VIP Protocol for Bank Cardholders & Expats'}
          </Text>

          <Text style={{ fontSize: 12, color: '#94A3B8', lineHeight: 18, marginBottom: 14 }}>
            {lang === 1
              ? 'BRAC Bank, IFIC, EBL, Mercantile Bank, GPStar ও রেমিট্যান্স প্রেরকদের জন্য ডেডিকেটেড এয়ারপোর্ট মিট অ্যান্ড গ্রিট সল্যুশন।'
              : 'Dedicated airport Meet & Greet solutions for BRAC Bank, IFIC, EBL, Mercantile Bank cardholders and remittance expatriates.'}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (typeof window !== 'undefined') {
                  window.open('https://wa.me/8801347570001?text=Hello%20Flight%20Care,%20Corporate/Bank%20Partnership%20inquiry', '_blank');
                }
              }}
              style={{
                backgroundColor: '#25D366',
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 14 }}>💬</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                {lang === 1 ? 'WhatsApp ডেস্ক' : 'B2B WhatsApp'}
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
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 13 }}>📞</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                01347-570001
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Website Footer & Compliance Bar (SSLCommerz Requirement) */}
      <View style={{ width: '100%', marginTop: 24 }}>
        <DesktopFooter
          lang={lang}
          setLang={setLang}
          setTab={setTab}
          setWiz={setWiz}
          setShowServicesModal={setShowServicesModal}
        />
      </View>

      {/* Package Comparison Modal */}
      <Modal
        visible={showCompareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompareModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              width: '100%',
              maxWidth: 480,
              maxHeight: '85%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                {lang === 1 ? 'প্যাকেজ সুবিধাসমূহ তুলনা করুন' : 'Compare Packages'}
              </Text>
              <TouchableOpacity onPress={() => setShowCompareModal(false)}>
                <Text style={{ fontSize: 20, color: '#64748B', fontWeight: '800' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {PKGS.map(pkg => (
                <View
                  key={pkg.id}
                  style={{
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 12,
                    backgroundColor:
                      pkg.id === 'economy'
                        ? '#F0F9FF'
                        : pkg.id === 'business'
                        ? '#FAF5FF'
                        : '#FFFBEB',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                      {pkg.n[lang] || pkg.n[0]}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '800',
                        color:
                          pkg.id === 'economy'
                            ? '#0284C7'
                            : pkg.id === 'business'
                            ? '#7C3AED'
                            : '#D97706',
                      }}
                    >
                      {pkg.p} {lang === 1 ? 'টাকা' : 'Tk'}
                    </Text>
                  </View>
                  {(PACKAGE_FEATURES[pkg.id] || []).map((feat, idx) => (
                    <Text
                      key={idx}
                      style={{
                        fontSize: 13,
                        color: '#334155',
                        marginBottom: 4,
                        lineHeight: 18,
                      }}
                    >
                      • {feat[lang] || feat[0]}
                    </Text>
                  ))}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowCompareModal(false)}
              style={{
                backgroundColor: '#0284C7',
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
                marginTop: 10,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                {lang === 1 ? 'বন্ধ করুন' : 'Close'}
              </Text>
            </TouchableOpacity>
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

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        onSelectDate={date => {
          setServiceDate(date);
          if (errors.serviceDate) setErrors(e => ({ ...e, serviceDate: null }));
        }}
        selectedDate={serviceDate}
      />

      {/* Top Header Navigation Dropdown / Drawer Modal */}
      <Modal
        visible={showNavMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNavMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowNavMenu(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: Platform.OS === 'web' ? 64 : 50,
            paddingHorizontal: 16,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e?.stopPropagation?.()}
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1.5,
              borderColor: '#BAE6FD',
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.18,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>🧭</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F2A4A' }}>
                  {lang === 1 ? 'ন্যাভিগেশন অপশনসমূহ' : 'Navigation Menu'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowNavMenu(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Menu List of Bottom Navigation Items */}
            <View style={{ gap: 8 }}>
              {[
                {
                  key: 'home',
                  label: lang === 1 ? 'হোম' : 'Home',
                  sub: lang === 1 ? 'ফ্লাইট প্রোটোকল ও কনসিয়ার্জ সেবা' : 'Airport Protocol & Booking',
                  icon: '🏠',
                  isCurrent: true,
                },
                {
                  key: 'bookings',
                  label: lang === 1 ? 'বুকিংস' : 'Bookings',
                  sub: lang === 1 ? 'আপনার সমস্ত বুকিং তালিকা ও ট্র্যাকিং' : 'Your Bookings & Live Milestones',
                  icon: '📅',
                },
                {
                  key: 'help',
                  label: lang === 1 ? 'সাপোর্ট' : 'Support',
                  sub: lang === 1 ? '২৪/৭ গ্রাহক সেবা ও হেল্পডেস্ক' : 'Customer Support & Live Helpdesk',
                  icon: '🎧',
                },
                {
                  key: 'profile',
                  label: lang === 1 ? 'প্রোফাইল' : 'Profile',
                  sub: lang === 1 ? 'পাসপোর্ট ডেটা, রিওয়ার্ড ও সেটিংস' : 'Profile, Saved Passengers & Settings',
                  icon: '👤',
                },
                {
                  key: 'inbox',
                  label: lang === 1 ? 'নোটিফিকেশন' : 'Notifications',
                  sub: lang === 1 ? 'ফ্লাইট আপডেট ও সার্ভিস অ্যালার্ট' : 'Flight Alerts & Announcements',
                  icon: '🔔',
                  badge: unreadCount,
                },
                {
                  key: 'sub_services',
                  label: lang === 1 ? 'অতিরিক্ত সার্ভিসসমূহ' : 'Additional Services',
                  sub: lang === 1 ? 'র‍্যাপিং, হুইলচেয়ার, কার ড্রপ ও বিশেষ সেবা' : 'Luggage wrap, wheelchair, VIP car, etc.',
                  icon: '✨',
                  isSubPage: 'additional_services',
                },
                {
                  key: 'sub_compare',
                  label: lang === 1 ? 'প্যাকেজের তুলনা' : 'Compare Packages',
                  sub: lang === 1 ? 'স্ট্যান্ডার্ড, প্রিমিয়াম ও ভিআইপি ফিচার' : 'Standard, Premium & VIP Comparison',
                  icon: '⚖️',
                  isSubPage: 'compare_packages',
                },
                {
                  key: 'sub_ranks',
                  label: lang === 1 ? 'প্রোটোকল অফিসার র‌্যাংক' : 'Protocol Officer Ranks',
                  sub: lang === 1 ? '১০-স্তরের পয়েন্ট ও পদোন্নতি ব্যবস্থা' : '10-Tier points & promotions ladder',
                  icon: '🎖️',
                  isSubPage: 'protocol_ranks',
                },
                {
                  key: 'manager',
                  label: lang === 1 ? 'ম্যানেজার পোর্টাল' : 'Manager Portal',
                  sub: lang === 1 ? 'সোয়েল তানভীর (অপারেশনস ও অ্যাডমিন)' : 'Sohel Tanvir (Operations & Admin)',
                  icon: '🛡️',
                },
              ].map(item => (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.75}
                  onPress={() => {
                    setShowNavMenu(false);
                    if (item.isSubPage && navigateToSubPage) {
                      if (item.isSubPage === 'additional_services') {
                        navigateToSubPage('additional_services', {
                          selectedAddons,
                          setSelectedAddons,
                          addonDetails,
                          setAddonDetails,
                          onProceedBooking: handleProceedBookingFromModal,
                          flightNumber,
                          serviceDate,
                        });
                      } else if (item.isSubPage === 'compare_packages') {
                        navigateToSubPage('compare_packages', {
                          selectedPackage,
                          onSelectPackage: setSelectedPackage,
                        });
                      } else if (item.isSubPage === 'protocol_ranks') {
                        navigateToSubPage('protocol_ranks');
                      }
                      return;
                    }
                    if (setTab) setTab(item.key);
                    if (setWiz) setWiz(null);
                    if (setDetail) setDetail(null);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: item.isCurrent ? '#F0F9FF' : '#F8FAFC',
                    borderWidth: 1.2,
                    borderColor: item.isCurrent ? '#38BDF8' : '#E2E8F0',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: item.isCurrent ? '#E0F2FE' : '#FFFFFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: item.isCurrent ? '#BAE6FD' : '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F2A4A' }}>
                          {item.label}
                        </Text>
                        {item.isCurrent && (
                          <View style={{ backgroundColor: '#0284C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                              {lang === 1 ? 'বর্তমান' : 'Active'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                        {item.sub}
                      </Text>
                    </View>
                  </View>

                  {item.badge > 0 ? (
                    <View
                      style={{
                        backgroundColor: '#EF4444',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                        {item.badge}
                      </Text>
                    </View>
                  ) : (
                    <ChevronRight size={16} color="#94A3B8" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  </View>
  );
}
