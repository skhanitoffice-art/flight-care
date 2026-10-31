import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  Modal,
  Platform,
  Linking,
  ScrollView,
  Image,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createBooking,
  getCustomerPaymentHistory,
  getCustomerBookings,
  cancelCustomerBooking,
  getCustomerNotifications,
  markCustomerNotificationRead,
  getBookingWorkflow,
  customerApiConfigured,
  registerCustomer,
  loginCustomer,
  verifyCustomerOtp,
  resendCustomerOtp,
  requestPasswordReset,
  resetCustomerPassword,
  updateCustomerProfile,
  logoutCustomer,
  getServiceCatalog,
  getAddonCatalog,
  quoteProtocolStaff,
  managerApiConfigured,
  managerLogin,
  getManagerStaffAllocationRules,
  saveManagerStaffAllocationRules,
  getManagerBookingWorkflow,
  saveManagerBookingWorkflow,
  getManagerServices,
  saveManagerServices,
  getManagerAddons,
  saveManagerAddons,
  getManagerPayments,
  refundManagerPayment,
  staffApiConfigured,
  staffLogin,
  getStaffAssignments,
  acceptStaffAssignment,
  updateStaffAssignment,
  completeStaffAssignment,
  verifyBkashPayment,
  verifyBanglaQrPayment,
  verifyBankCardPayment,
  verifySslCommerzPayment,
} from './api';
import { subscribeToPaymentWebhook } from './src/services/paymentGateway';
import {
  listenToCloudNotifications,
  saveBookingToFirestore,
  updateBookingInFirestore,
  saveUserToFirestore,
  listenToCloudBookings,
  listenToCloudAirports,
  listenToCloudStaff,
  listenToCloudFlightCareFamily,
  saveAirportToFirestore,
  deleteAirportFromFirestore,
  saveStaffToFirestore,
  updateStaffInFirestore,
  deleteStaffFromFirestore,
  seedInitialPlatformData,
  authenticateCustomerWithFirebase,
  authenticateWithFirebaseCloud,
  sha256Hash,
  fetchUserFromFirestore,
  normalizePhoneForAuth,
} from './src/services/firebaseSyncService';
import { isFirebaseConfigured } from './src/services/firebase';
import { awardBookingPoints, redeemPointsForBooking, grantWelcomeSignupBonus, WELCOME_BONUS_POINTS, getCustomerRewards } from './src/services/customerRewardsService';
import { isEntityBlacklisted, checkBookingRateLimit } from './src/services/blacklistService';
import ErrorBoundary from './src/components/ErrorBoundary';

import {
  injectWeb3DStyles,
  SETTINGS_STORAGE,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './src/constants/theme';
import {
  DEFAULT_MANAGED_AIRPORTS,
  SERVICES,
  ADDONS,
  PKGS,
  UI,
  DEFAULT_BOOKING_WORKFLOW,
  DEFAULT_PRICING_CONFIG,
  DEFAULT_STAFF_ROSTER,
} from './src/constants/data';
import {
  isValidMobileNumber,
  isValidEmailAddress,
  isValidPassengerName,
  normalizeService,
  normalizeManagerService,
  normalizeCustomerBooking,
  normalizeCustomerNotification,
  normalizeWorkflowStages,
  buildStaffingContext,
  normalizeAddon,
  normalizeManagerAddon,
  createAddonDetails,
  calculateBookingPricing,
  total,
  convertBnDigitsToEn,
} from './src/utils/helpers';
import { s } from './src/styles/styles';

import MobileTabs from './src/components/MobileTabs';
import DesktopHeader from './src/components/DesktopHeader';
import DesktopFooter from './src/components/DesktopFooter';

import HomeScreen from './src/screens/HomeScreen';
import DetailScreen from './src/screens/DetailScreen';
import WizardScreen from './src/screens/WizardScreen';
import BookingsScreen from './src/screens/BookingsScreen';
import HelpScreen from './src/screens/HelpScreen';
import InboxScreen from './src/screens/InboxScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ManagerPanel from './src/screens/ManagerPanel';
import StaffPanel from './src/screens/StaffPanel';
import AdditionalServicesScreen from './src/screens/subpages/AdditionalServicesScreen';
import ComparePackagesScreen from './src/screens/subpages/ComparePackagesScreen';
import ProtocolRanksScreen from './src/screens/subpages/ProtocolRanksScreen';
import OfficerProfileScreen from './src/screens/subpages/OfficerProfileScreen';
import BkashPaymentModal from './src/components/BkashPaymentModal';
import BanglaQrPaymentModal from './src/components/BanglaQrPaymentModal';
import BankCardPaymentModal from './src/components/BankCardPaymentModal';
import SslCommerzPaymentModal from './src/components/SslCommerzPaymentModal';
import OfficerProfileModal from './src/components/OfficerProfileModal';
import FamilyMemberIdCardModal from './src/components/FamilyMemberIdCardModal';
import BookingInvoiceModal from './src/components/BookingInvoiceModal';
import ServiceCompletionReviewModal from './src/components/ServiceCompletionReviewModal';
import {
  findFamilyMember,
  findFamilyMemberSync,
  isFlightCareFamilyMember,
  filterStaffRosterByFamily,
  syncStaffWithFamilyRoster,
} from './src/services/flightCareFamilyService';
import {
  dispatchMultiChannelNotification,
  COMMUNICATION_EVENTS,
  dispatchStaffNotification,
  STAFF_NOTIFICATION_TYPES,
} from './src/services/communication';
import {
  checkAccountLockout,
  recordFailedLogin,
  resetFailedLogins,
  logSecurityEvent,
  SECURITY_ACTIONS,
  isDemoLoginAllowed,
  verifyStaffPin,
} from './src/services/security';
import {
  dispatchNotification,
  requestPushPermission,
  dispatchBookingLifecycleNotifications,
  filterNotificationsForRole,
} from './src/services/notificationService.js';

// Inject 3D Web Styles when running in web browser
injectWeb3DStyles();

const getInitialWebRoute = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { tab: 'home', subPage: null };
  }
  try {
    let p = window.location.pathname || '';
    if ((!p || p === '/') && window.location.hash) {
      p = window.location.hash.replace(/^#\/?/, '');
    }
    const clean = p.replace(/^#?\/?/, '').replace(/\/+$/, '').toLowerCase();
    if (clean === 'manager' || clean === 'admin' || clean === 'admin-panel' || clean === 'adminpanel' || clean === 'platform-admin' || clean === 'dashboard') {
      return { tab: 'manager', subPage: null };
    }
    if (clean === 'booking' || clean === 'bookings') {
      return { tab: 'bookings', subPage: null };
    }
    if (clean === 'support' || clean === 'help') {
      return { tab: 'help', subPage: null };
    }
    if (clean === 'notification' || clean === 'notifications' || clean === 'inbox') {
      return { tab: 'inbox', subPage: null };
    }
    if (clean === 'profile' || clean === 'account') {
      return { tab: 'profile', subPage: null };
    }
    if (clean === 'staff' || clean === 'officer') {
      return { tab: 'staff', subPage: null };
    }
    if (clean === 'additional-services' || clean === 'additionalservices') {
      return { tab: 'home', subPage: 'additional_services' };
    }
    if (clean === 'compare-packages' || clean === 'comparepackages') {
      return { tab: 'home', subPage: 'compare_packages' };
    }
    if (clean === 'protocol-ranks' || clean === 'protocolranks') {
      return { tab: 'home', subPage: 'protocol_ranks' };
    }
    if (clean === 'officer-profile' || clean === 'officerprofile') {
      return { tab: 'home', subPage: 'officer_profile' };
    }
  } catch {}
  return { tab: 'home', subPage: null };
};

const getInitialWebFamilyParam = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const s = new URLSearchParams(window.location.search || '');
    const p = s.get('familyMember') || s.get('member') || s.get('family') || s.get('officer') || s.get('staff') || s.get('officerId');
    if (p) return p;
    if (window.location.hash) {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const hs = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : hash);
      return hs.get('familyMember') || hs.get('member') || hs.get('family') || hs.get('officer') || hs.get('staff') || hs.get('officerId') || null;
    }
  } catch {}
  return null;
};

const getInitialReceiptParamFromUrl = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const s = new URLSearchParams(window.location.search || '');
    const p = s.get('receipt') || s.get('receiptId') || s.get('invoice') || s.get('invoiceId') || s.get('voucher') || s.get('moneyReceipt');
    if (p) return p;
    if (window.location.hash) {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const hs = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : hash);
      return hs.get('receipt') || hs.get('receiptId') || hs.get('invoice') || hs.get('invoiceId') || hs.get('voucher') || hs.get('moneyReceipt') || null;
    }
  } catch {}
  return null;
};

export default function App() {
  const [lang, setLangState] = useState(0); // 0=en 1=bn (Default: English)
  const [userSelectedLang, setUserSelectedLang] = useState(false);

  const setLang = React.useCallback(nextLang => {
    setUserSelectedLang(true);
    setLangState(current => (typeof nextLang === 'function' ? nextLang(current) : nextLang));
  }, []);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [guidancePopup, setGuidancePopup] = useState(null);
  const [managedAirports, setManagedAirports] = useState(DEFAULT_MANAGED_AIRPORTS);
  const [airport, setAirport] = useState(DEFAULT_MANAGED_AIRPORTS[0]);
  const [showAirportModal, setShowAirportModal] = useState(false);
  const [serviceCatalog, setServiceCatalog] = useState(SERVICES);
  const [addonCatalog, setAddonCatalog] = useState(ADDONS);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);

  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isCompact = windowWidth < 360;
  const isPhone = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024 && windowWidth < 1536;
  const isLargeDesktop = windowWidth >= 1536;
  const isWide = isWeb ? windowWidth >= 768 : windowWidth >= 1024;

  const responsive = {
    isCompact,
    isPhone,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isWide,
    isWeb,
    iconSize: isLargeDesktop ? 116 : isDesktop ? 94 : isTablet ? 74 : isCompact ? 48 : 54,
    iconRadius: isLargeDesktop ? 32 : isDesktop ? 26 : isTablet ? 22 : 16,
    emojiSize: isLargeDesktop ? 56 : isDesktop ? 46 : isTablet ? 36 : isCompact ? 23 : 26,
    labelSize: isLargeDesktop ? 18 : isDesktop ? 15 : isTablet ? 14 : isCompact ? 11 : 12,
    labelHeight: isLargeDesktop ? 48 : isDesktop ? 40 : isTablet ? 36 : 30,
    bannerHeight: isLargeDesktop ? 380 : isDesktop ? 300 : isTablet ? 230 : 190,
    containerMaxWidth: '100%',
    scale: isLargeDesktop ? 1.45 : isDesktop ? 1.25 : isTablet ? 1.1 : isCompact ? 0.88 : 1.0,
  };

  const pagePadding = responsive.isLargeDesktop
    ? 40
    : responsive.isDesktop
      ? 28
      : responsive.isTablet
        ? 20
        : responsive.isCompact
          ? 12
          : 16;

  const t = k => UI[k]?.[lang] || '';

  const initialWebRoute = useMemo(() => getInitialWebRoute(), []);
  const [tab, setTab] = useState(() => initialWebRoute.tab || 'home');
  const [detail, setDetail] = useState(null);
  const [wiz, setWiz] = useState(null); // booking draft
  const [subPage, setSubPage] = useState(() => initialWebRoute.subPage || null); // 'additional_services' | 'compare_packages' | 'protocol_ranks' | 'officer_profile'
  const [subPageParams, setSubPageParams] = useState({});
  const [navHistory, setNavHistory] = useState([]);

  const navigateToSubPage = (pageName, params = {}) => {
    setNavHistory(curr => [...curr, { tab, subPage, subPageParams }]);
    setSubPage(pageName);
    setSubPageParams(params);
  };
  const [staffAllocation, setStaffAllocation] = useState(null);
  const [staffAllocationLoading, setStaffAllocationLoading] = useState(false);
  const [staffAllocationFailed, setStaffAllocationFailed] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [deviceCreatedBookingIds, setDeviceCreatedBookingIds] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [bookingActionId, setBookingActionId] = useState('');
  const [bookingFilter, setBookingFilter] = useState('upcoming');
  const [bookingView, setBookingView] = useState('bookings');
  const [bookingWorkflow, setBookingWorkflow] = useState(DEFAULT_BOOKING_WORKFLOW);
  const [customerPaymentHistory, setCustomerPaymentHistory] = useState([]);
  const [customerPaymentsLoading, setCustomerPaymentsLoading] = useState(false);
  const [customerPaymentsError, setCustomerPaymentsError] = useState('');
  const [paymentBusyId, setPaymentBusyId] = useState('');
  const [bkashModalVisible, setBkashModalVisible] = useState(false);
  const [activeBkashBooking, setActiveBkashBooking] = useState(null);
  const [bkashSuccessCallback, setBkashSuccessCallback] = useState(null);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [activeCardBooking, setActiveCardBooking] = useState(null);
  const [cardSuccessCallback, setCardSuccessCallback] = useState(null);
  const [sslModalVisible, setSslModalVisible] = useState(false);
  const [activeSslBooking, setActiveSslBooking] = useState(null);
  const [sslSuccessCallback, setSslSuccessCallback] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [notificationReadBusyIds, setNotificationReadBusyIds] = useState([]);
  const [markingAllNotificationsRead, setMarkingAllNotificationsRead] = useState(false);
  const [supportCategory, setSupportCategory] = useState('all');
  const [supportSearch, setSupportSearch] = useState('');
  const [openFaqId, setOpenFaqId] = useState('');
  const [profile, setProfile] = useState({ name: '', phone: '', email: '', profile_information: '' });
  const [notificationPreferences, setNotificationPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [customerSession, setCustomerSession] = useState(null);
  const [authView, setAuthView] = useState('account');
  const [authForm, setAuthForm] = useState({
    name: '',
    phone: '',
    email: '',
    identifier: '',
    password: '',
    passwordConfirmation: '',
    code: '',
  });
  const [authChallengeId, setAuthChallengeId] = useState('');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Manager state (Null by default: requires authenticated login with Firebase Cloud credentials)
  const [managerSession, setManagerSession] = useState(null);
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [managerLoginError, setManagerLoginError] = useState('');
  const [managerBusy, setManagerBusy] = useState(false);
  const [managerSection, setManagerSection] = useState('dashboard');
  const [managerWorkflow, setManagerWorkflow] = useState(DEFAULT_BOOKING_WORKFLOW);
  const [managerWorkflowLoading, setManagerWorkflowLoading] = useState(false);
  const [managerWorkflowSaving, setManagerWorkflowSaving] = useState(false);
  const [managerWorkflowError, setManagerWorkflowError] = useState('');
  const [managerWorkflowNotice, setManagerWorkflowNotice] = useState('');
  const [managerServices, setManagerServices] = useState([]);
  const [managerServicesAirport, setManagerServicesAirport] = useState(airport.code);
  const [managerServicesLoading, setManagerServicesLoading] = useState(false);
  const [managerServicesSaving, setManagerServicesSaving] = useState(false);
  const [managerServicesError, setManagerServicesError] = useState('');
  const [managerServicesNotice, setManagerServicesNotice] = useState('');
  const [managerAddons, setManagerAddons] = useState([]);
  const [managerAddonsAirport, setManagerAddonsAirport] = useState('DAC');
  const [managerAddonsLoading, setManagerAddonsLoading] = useState(false);
  const [managerAddonsSaving, setManagerAddonsSaving] = useState(false);
  const [managerAddonsError, setManagerAddonsError] = useState('');
  const [managerAddonsNotice, setManagerAddonsNotice] = useState('');
  const [managerStaffingRules, setManagerStaffingRules] = useState([]);
  const [managerRulesLoading, setManagerRulesLoading] = useState(false);
  const [managerRulesSaving, setManagerRulesSaving] = useState(false);
  const [managerRulesError, setManagerRulesError] = useState('');
  const [managerRulesNotice, setManagerRulesNotice] = useState('');
  const [managerPayments, setManagerPayments] = useState([]);
  const [managerPaymentsSummary, setManagerPaymentsSummary] = useState(null);
  const [managerPaymentsLoading, setManagerPaymentsLoading] = useState(false);
  const [managerPaymentsError, setManagerPaymentsError] = useState('');
  const [managerPaymentsNotice, setManagerPaymentsNotice] = useState('');
  const [managerPaymentFilter, setManagerPaymentFilter] = useState('all');
  const [managerPaymentSearch, setManagerPaymentSearch] = useState('');
  const [refundPaymentId, setRefundPaymentId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundSaving, setRefundSaving] = useState(false);

  // Staff state
  const [staffSession, setStaffSession] = useState(null);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffLoginError, setStaffLoginError] = useState('');
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [staffFilter, setStaffFilter] = useState('all');
  const [staffActionError, setStaffActionError] = useState('');
  const [staffRoster, setStaffRoster] = useState(DEFAULT_STAFF_ROSTER);

  // Synchronous extraction of deep link officer parameter for instant 1st frame render
  const initialDeepParam = useMemo(() => getInitialWebFamilyParam(), []);
  const initialFamilyMemberSync = useMemo(() => {
    if (!initialDeepParam) return null;
    return findFamilyMemberSync(initialDeepParam) || { id: initialDeepParam, name: initialDeepParam, badgeNo: initialDeepParam };
  }, [initialDeepParam]);

  // Officer Profile Modal & Scanned QR Deep Link State
  const [scannedOfficerId, setScannedOfficerId] = useState(null);
  const [showOfficerProfileModal, setShowOfficerProfileModal] = useState(false);

  // Flight Care Family Member Digital ID Pass Modal State (Instant synchronous boot)
  const [scannedFamilyMember, setScannedFamilyMember] = useState(() => initialFamilyMemberSync);
  const [showFamilyMemberIdCard, setShowFamilyMemberIdCard] = useState(() => Boolean(initialDeepParam));

  // Direct Money Receipt Modal (Deep Link / Standalone URL View)
  const initialReceiptId = getInitialReceiptParamFromUrl();
  const [showReceiptModal, setShowReceiptModal] = useState(() => Boolean(initialReceiptId));
  const [receiptModalBooking, setReceiptModalBooking] = useState(() => {
    if (initialReceiptId) {
      return {
        id: initialReceiptId,
        passengerName: 'Valued Passenger',
        passengerPhone: '+880 1XXXXXXXXX',
        fno: 'BG-084',
        date: new Date().toISOString().split('T')[0],
        time: '14:30',
        dir: 'arr',
        packageChoice: 'business',
        addons: ['lounge', 'luggage'],
        amount: 3500,
        paidMethod: 'cash',
      };
    }
    return null;
  });

  // Automatic Service Completion Review Popup State for Verified Passengers
  const [completionReviewBooking, setCompletionReviewBooking] = useState(null);
  const [dismissedReviewBookingIds, setDismissedReviewBookingIds] = useState({});

  useEffect(() => {
    if (!bookings || bookings.length === 0) return;
    const target = bookings.find(b => {
      const isCompleted =
        b.status === 'completed' ||
        (Array.isArray(b.serviceProgress) &&
          b.serviceProgress.length > 0 &&
          b.serviceProgress.every(m => m.status === 'completed'));
      const isUnrated = !b.customerRating && !dismissedReviewBookingIds[b.id];
      return isCompleted && isUnrated;
    });

    if (target && !completionReviewBooking) {
      const t = setTimeout(() => {
        setCompletionReviewBooking(target);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [bookings, dismissedReviewBookingIds, completionReviewBooking]);

  const handleReviewSubmitted = (bookingId, reviewData) => {
    setDismissedReviewBookingIds(prev => ({ ...prev, [bookingId]: true }));
    setBookings(prev =>
      prev.map(b =>
        b.id === bookingId
          ? {
              ...b,
              customerRating: reviewData.rating,
              customerFeedback: reviewData.comment,
            }
          : b
      )
    );
  };

  const handleCloseReviewModal = () => {
    if (completionReviewBooking) {
      setDismissedReviewBookingIds(prev => ({ ...prev, [completionReviewBooking.id]: true }));
    }
    setCompletionReviewBooking(null);
  };

  const handleOpenFamilyMemberUrl = member => {
    if (!member) return;
    setDetail(null);
    setWiz(null);
    setSubPage(null);
    setTab('home');
    setScannedFamilyMember(member);
    setShowFamilyMemberIdCard(true);
  };

  const handleOpenOfficerProfileUrl = officerParam => {
    if (!officerParam) return;
    setDetail(null);
    setWiz(null);
    setTab('home');
    setScannedOfficerId(officerParam);
    setShowOfficerProfileModal(true);
  };

  // Web SPA URL Routing & Browser Navigation State
  const isPopStateRef = useRef(false);
  const historyEntriesCountRef = useRef(0);

  const getCleanPath = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
    let p = window.location.pathname || '';
    if ((!p || p === '/') && window.location.hash) {
      p = window.location.hash.replace(/^#\/?/, '');
    }
    return p;
  };

  const getPathForAppState = (targetTab, targetWiz, targetSubPage, targetDetail) => {
    if (targetSubPage === 'additional_services') return '/Additional-Services';
    if (targetSubPage === 'compare_packages') return '/Compare-Packages';
    if (targetSubPage === 'protocol_ranks') return '/Protocol-Ranks';
    if (targetSubPage === 'officer_profile') return '/Officer-Profile';
    if (targetWiz) {
      if (targetWiz.step === 2) return '/Payment2';
      if (targetWiz.step === 3) return '/Payment3';
      return '/Payment1';
    }
    if (targetTab === 'bookings') return '/Booking';
    if (targetTab === 'help') return '/Support';
    if (targetTab === 'inbox') return '/Notification';
    if (targetTab === 'manager') return '/Manager';
    if (targetTab === 'profile') return '/Profile';
    if (targetTab === 'staff') return '/Staff';
    return '/Home';
  };

  const createDefaultBookingDraft = (targetStep = 1) => {
    const defaultPkg = PKGS.find(p => p.id === 'business') || PKGS[1] || PKGS[0];
    const defaultSvc = serviceCatalog?.find(s => s.cat === 'arr') || SERVICES.find(s => s.cat === 'arr') || SERVICES[0];
    return {
      step: targetStep,
      svc: defaultSvc,
      airport: airport?.code || 'DAC',
      dir: 'arr',
      pkg: defaultPkg,
      onlyAddons: false,
      showPackageFeatures: true,
      addons: [],
      addonDetails: createAddonDetails(),
      remarks: '',
      name: profile?.name || '',
      gender: '',
      nationality: '',
      phone: profile?.phone || '',
      email: profile?.email || '',
      dateOfBirth: '',
      passportNumber: '',
      airline: '',
      airlineBn: '',
      fno: '',
      ticketNumber: '',
      origin: '',
      originBn: '',
      destination: '',
      destinationBn: '',
      terminal: '',
      terminalBn: '',
      gate: '',
      date: '',
      time: '',
      scheduled: '',
      liveRadar: false,
      flightStatus: '',
      route: '',
      pnr: '',
      flightNotes: '',
      a: 1,
      c: 0,
      e: 0,
      passengerDetails: [],
      method: 'banglaqr',
      bookingForSomeoneElse: false,
      hasPhone: true,
      passengerName: '',
      passengerPhone: '',
      passengerCountryCode: '+880',
      leadCountryCode: '+880',
      specialAssistance: '',
      contactAtAirport: 'passenger',
      permissionConfirmed: true,
      agreedToPolicy: true,
    };
  };

  const applyRouteFromPath = (pathname) => {
    if (!pathname) return;
    const clean = pathname.replace(/^#?\/?/, '').replace(/\/+$/, '').toLowerCase();

    if (clean === 'payment1') {
      setSubPage(null);
      setDetail(null);
      setTab('home');
      setWiz(current => (current ? { ...current, step: 1 } : createDefaultBookingDraft(1)));
      return;
    }
    if (clean === 'payment2') {
      setSubPage(null);
      setDetail(null);
      setTab('home');
      setWiz(current => (current ? { ...current, step: 2 } : createDefaultBookingDraft(2)));
      return;
    }
    if (clean === 'payment3') {
      setSubPage(null);
      setDetail(null);
      setTab('home');
      setWiz(current => (current ? { ...current, step: 3 } : createDefaultBookingDraft(3)));
      return;
    }
    if (clean === 'booking' || clean === 'bookings') {
      setWiz(null);
      setSubPage(null);
      setDetail(null);
      setTab('bookings');
      return;
    }
    if (clean === 'support' || clean === 'help') {
      setWiz(null);
      setSubPage(null);
      setDetail(null);
      setTab('help');
      return;
    }
    if (clean === 'notification' || clean === 'notifications' || clean === 'inbox') {
      setWiz(null);
      setSubPage(null);
      setDetail(null);
      setTab('inbox');
      return;
    }
    if (clean === 'manager' || clean === 'admin') {
      setWiz(null);
      setSubPage(null);
      setDetail(null);
      setTab('manager');
      return;
    }
    if (clean === 'profile' || clean === 'account') {
      setWiz(null);
      setSubPage(null);
      setDetail(null);
      setTab('profile');
      return;
    }
    if (clean === 'staff' || clean === 'officer') {
      setWiz(null);
      setSubPage(null);
      setDetail(null);
      setTab('staff');
      return;
    }
    if (clean === 'additional-services' || clean === 'additionalservices') {
      setDetail(null);
      setSubPage('additional_services');
      return;
    }
    if (clean === 'compare-packages' || clean === 'comparepackages') {
      setDetail(null);
      setSubPage('compare_packages');
      return;
    }
    if (clean === 'protocol-ranks' || clean === 'protocolranks') {
      setDetail(null);
      setSubPage('protocol_ranks');
      return;
    }
    if (clean === 'officer-profile' || clean === 'officerprofile') {
      setDetail(null);
      setSubPage('officer_profile');
      return;
    }
    if (clean === 'home' || clean === '') {
      setWiz(null);
      setSubPage(null);
      setDetail(null);
      setTab('home');
      return;
    }
  };

  useEffect(() => {
    // 0. Extract Web URL query params & deep links FIRST before any history rewriting!
    let initialFamilyParam = null;
    let initialOfficerParam = null;
    let initialSearchStr = '';

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        initialSearchStr = window.location.search || '';
        const searchParams = new URLSearchParams(initialSearchStr);
        initialFamilyParam =
          searchParams.get('familyMember') ||
          searchParams.get('member') ||
          searchParams.get('family');
        initialOfficerParam =
          searchParams.get('officer') ||
          searchParams.get('staff') ||
          searchParams.get('officerId');

        if (!initialFamilyParam && !initialOfficerParam && window.location.hash) {
          const hash = window.location.hash.replace(/^#\/?/, '');
          const hashQuery = hash.includes('?') ? hash.split('?')[1] : hash;
          const hashParams = new URLSearchParams(hashQuery);
          initialFamilyParam =
            hashParams.get('familyMember') ||
            hashParams.get('member') ||
            hashParams.get('family');
          initialOfficerParam =
            hashParams.get('officer') ||
            hashParams.get('staff') ||
            hashParams.get('officerId');
          if (!initialFamilyParam && !initialOfficerParam) {
            if (hash.toLowerCase().startsWith('familymember=')) {
              initialFamilyParam = hash.split('=')[1];
            } else if (hash.toLowerCase().startsWith('officer=')) {
              initialOfficerParam = hash.split('=')[1];
            }
          }
        }
      } catch {}
    }

    // Initial Web SPA URL routing (Preserves query string so deep links never get wiped)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const initialPath = getCleanPath();
        const clean = initialPath.replace(/^#?\/?/, '').replace(/\/+$/, '').toLowerCase();
        const searchSuffix = initialSearchStr ? initialSearchStr : '';

        if (clean === 'payment1') {
          setTab('home');
          applyRouteFromPath('payment1');
          window.history.replaceState({ tab: 'home' }, '', `/Home${searchSuffix}`);
          window.history.pushState({ tab: 'home', wizStep: 1 }, '', `/Payment1${searchSuffix}`);
          historyEntriesCountRef.current = 1;
        } else if (clean === 'payment2') {
          setTab('home');
          applyRouteFromPath('payment2');
          window.history.replaceState({ tab: 'home' }, '', `/Home${searchSuffix}`);
          window.history.pushState({ tab: 'home', wizStep: 1 }, '', `/Payment1${searchSuffix}`);
          window.history.pushState({ tab: 'home', wizStep: 2 }, '', `/Payment2${searchSuffix}`);
          historyEntriesCountRef.current = 2;
        } else if (clean === 'payment3') {
          setTab('home');
          applyRouteFromPath('payment3');
          window.history.replaceState({ tab: 'home' }, '', `/Home${searchSuffix}`);
          window.history.pushState({ tab: 'home', wizStep: 1 }, '', `/Payment1${searchSuffix}`);
          window.history.pushState({ tab: 'home', wizStep: 2 }, '', `/Payment2${searchSuffix}`);
          window.history.pushState({ tab: 'home', wizStep: 3 }, '', `/Payment3${searchSuffix}`);
          historyEntriesCountRef.current = 3;
        } else if (clean && clean !== 'home') {
          applyRouteFromPath(clean);
          window.history.replaceState({ tab: 'home' }, '', `/Home${searchSuffix}`);
          const canonicalTarget = getPathForAppState(clean, null, null, null);
          window.history.pushState({ tab: clean }, '', (canonicalTarget || (initialPath.startsWith('/') ? initialPath : `/${initialPath}`)) + searchSuffix);
          historyEntriesCountRef.current = 1;
        } else if (clean === '' || clean === 'home') {
          // Keep current search params in URL so bookmarking/sharing preserves deep links
          window.history.replaceState({ tab: 'home' }, '', `/Home${searchSuffix}`);
        }
      } catch {}

      // Open deep link if query params exist
      if (initialFamilyParam) {
        (async () => {
          try {
            const familyMem = await findFamilyMember(initialFamilyParam);
            if (familyMem) {
              handleOpenFamilyMemberUrl(familyMem);
              return;
            }
          } catch (err) {
            console.warn('[App DeepLink] findFamilyMember notice:', err?.message);
          }
          handleOpenFamilyMemberUrl({ id: initialFamilyParam, name: initialFamilyParam });
        })();
      } else if (initialOfficerParam) {
        (async () => {
          try {
            const familyMem = await findFamilyMember(initialOfficerParam);
            if (familyMem) {
              handleOpenFamilyMemberUrl(familyMem);
              return;
            }
          } catch {}
          handleOpenOfficerProfileUrl(initialOfficerParam);
        })();
      }
    }

    // 2. Check React Native Deep Linking
    const checkInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const matchFam = initialUrl.match(/[?&](?:familyMember|member|family)=([^&]+)/i);
          const matchOff = initialUrl.match(/[?&](?:officer|staff|officerId)=([^&]+)/i);
          if (matchFam) {
            const target = decodeURIComponent(matchFam[1]);
            const familyMem = await findFamilyMember(target);
            handleOpenFamilyMemberUrl(familyMem || { id: target, name: target });
          } else if (matchOff) {
            const target = decodeURIComponent(matchOff[1]);
            const familyMem = await findFamilyMember(target);
            if (familyMem) {
              handleOpenFamilyMemberUrl(familyMem);
            } else {
              handleOpenOfficerProfileUrl(target);
            }
          }
        }
      } catch {}
    };
    checkInitialUrl();

    const linkSub = Linking.addEventListener('url', async event => {
      if (event && event.url) {
        const matchFam = event.url.match(/[?&](?:familyMember|member|family)=([^&]+)/i);
        const matchOff = event.url.match(/[?&](?:officer|staff|officerId)=([^&]+)/i);
        if (matchFam) {
          const target = decodeURIComponent(matchFam[1]);
          const familyMem = await findFamilyMember(target);
          handleOpenFamilyMemberUrl(familyMem || { id: target, name: target });
        } else if (matchOff) {
          const target = decodeURIComponent(matchOff[1]);
          const familyMem = await findFamilyMember(target);
          if (familyMem) {
            handleOpenFamilyMemberUrl(familyMem);
          } else {
            handleOpenOfficerProfileUrl(target);
          }
        }
      }
    });

    return () => {
      if (linkSub && typeof linkSub.remove === 'function') {
        linkSub.remove();
      }
    };
  }, []);

  // Web Browser URL & History Synchronization
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.history) return;

    const targetPath = getPathForAppState(tab, wiz, subPage, detail);
    const currentPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';

    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }

    if (currentPath === '/' && targetPath.toLowerCase() === '/home') {
      try {
        const curSearch = window.location.search || '';
        window.history.replaceState({ tab: 'home' }, '', `/Home${curSearch}`);
      } catch {}
      return;
    }

    if (currentPath.toLowerCase() !== targetPath.toLowerCase()) {
      try {
        window.history.pushState({ tab, wizStep: wiz?.step, subPage }, '', targetPath);
        historyEntriesCountRef.current += 1;
      } catch {}
    }

    // Dynamic SEO Title and Meta Description for Web
    if (typeof document !== 'undefined') {
      try {
        let seoTitle = 'Flight Care | #1 Airport Meet and Greet Service Bangladesh | VIP Protocol Dhaka (HSIA)';
        let seoDesc = 'Flight Care is Bangladesh\'s premier airport meet and greet and VIP protocol service at Hazrat Shahjalal International Airport (HSIA), Dhaka. Fast-track immigration, wheelchair assistance, luggage handling & lounge.';

        if (subPage === 'additional_services') {
          seoTitle = 'Additional Airport Services | Wheelchair, Baggage Wrapping & Lounge | Flight Care Bangladesh';
          seoDesc = 'Explore Flight Care additional airport services at Dhaka Airport (HSIA): wheelchair assistance, luggage wrapping, photocopy, rent-a-car, and executive lounge.';
        } else if (subPage === 'compare_packages') {
          seoTitle = 'VIP Protocol Packages & Pricing | Dhaka Airport Meet & Greet | Flight Care';
          seoDesc = 'Compare VIP airport protocol packages at Hazrat Shahjalal International Airport (HSIA). Transparent pricing, no hidden costs, pay online or pay after service.';
        } else if (subPage === 'protocol_ranks') {
          seoTitle = 'Certified Airport Protocol Officers & Team | Dhaka Airport VIP Concierge | Flight Care';
          seoDesc = 'Meet our dedicated Protocol Officers, Protocol Marshals, Supervisors, and Airport Attendants serving at Hazrat Shahjalal International Airport Dhaka (HSIA).';
        } else if (subPage === 'officer_profile') {
          seoTitle = 'Protocol Officer Profile | Dedicated Meet and Greet Escort | Flight Care';
        } else if (wiz?.step === 1) {
          seoTitle = 'Book Airport Meet & Greet Service | Dhaka Airport Protocol Booking | Flight Care';
          seoDesc = 'Book VIP Meet and Greet protocol service at Dhaka Airport in 2 minutes. Enter flight details and passenger information for instant protocol officer assignment.';
        } else if (wiz?.step === 2) {
          seoTitle = 'Payment & Settlement | Bank Cards, SSLCOMMERZ & Bangla QR | Flight Care';
        } else if (wiz?.step === 3) {
          seoTitle = 'Booking Confirmed | Flight Care VIP Protocol Service Bangladesh';
        } else if (tab === 'bookings') {
          seoTitle = 'My Airport Bookings & Live Protocol Tracking | Flight Care Bangladesh';
        } else if (tab === 'help') {
          seoTitle = '24/7 Airport Support & Helpline | Flight Care Dhaka Airport Protocol';
          seoDesc = 'Contact Flight Care 24/7 airport customer support hotline, WhatsApp concierge, and terminal assistance desk at Hazrat Shahjalal International Airport (HSIA).';
        } else if (tab === 'inbox') {
          seoTitle = 'Notifications & Flight Updates | Flight Care Airport Protocol';
        }

        document.title = seoTitle;

        let metaDescEl = document.querySelector('meta[name="description"]');
        if (metaDescEl) {
          metaDescEl.setAttribute('content', seoDesc);
        }
      } catch {}
    }
  }, [tab, wiz?.step, subPage, detail]);

  const handleBookOfficerFromProfile = officer => {
    setShowOfficerProfileModal(false);
    setSubPage(null);
    setWiz({
      step: 1,
      airport: officer.airport || 'DAC',
      airportName:
        (lang === 1 ? officer.airportFullNameBn : officer.airportFullNameEn) ||
        officer.airportFullNameEn ||
        officer.airportFullNameBn ||
        (lang === 1
          ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)'
          : 'Hazrat Shahjalal International Airport, Dhaka (DAC)'),
      leadStaffId: officer.id,
      leadStaffName: officer.name,
      requestedOfficer: officer.name,
      station: officer.station,
      a: 1,
      method: 'banglaqr',
    });
    setTab('wizard');
  };

  const [q, setQ] = useState('');

  const AIRPORTS_STORAGE = '@flightcare_managed_airports';
  const BOOKINGS_STORAGE = '@flightcare_bookings';
  const DEVICE_BOOKINGS_STORAGE = '@flightcare_device_booking_ids_v2';
  AsyncStorage.removeItem('@flightcare_device_booking_ids').catch(() => {});

  // Legacy false test booking filter
  const LEGACY_TEST_BOOKING_IDS = new Set([
    'DAC-1495', 'FC-23357', 'FC-23837', 'FC-28770', 'FC-33777', 'FC-45626',
    'FC-59641', 'FC-66575', 'FC-69880', 'FC-71488', 'FC-74425', 'FC-79649',
    'FC-89023', 'FC-95920', 'FC-99381', 'OFF-DAC-16959', 'OFF-DAC-39364',
    'OFF-DAC-41056', 'OFF-DAC-49872', 'OFF-DAC-59135', 'OFF-DAC-65578',
    'OFF-DAC-65986', 'OFF-DAC-83135', 'OFF-DAC-83852',
    'DAC-1498', 'CGP-2041', 'DAC-1502', 'DAC-1455', 'CGP-1994', 'ZYL-890'
  ]);

  const isFalseBooking = (b) => {
    if (!b) return true;
    const id = String(b.id || b.bookingId || '').trim();
    if (LEGACY_TEST_BOOKING_IDS.has(id)) return true;
    const cust = String(b.customer || b.passengerName || b.name || b.passenger_information?.name || '').toLowerCase().trim();
    if (['ishaujhyaods', 'fdhgf', 'teradstfyg', 'sohel', 'nazzim', 'somiya', 'tithi', 'taslima'].includes(cust)) {
      return true;
    }
    return false;
  };
  const NOTIFICATIONS_STORAGE = '@flightcare_notifications';
  const PROFILE_STORAGE = '@flightcare_profile';
  const SESSION_STORAGE = '@flightcare_customer_session';
  const CUSTOMERS_LIST_STORAGE = '@flightcare_registered_customers';
  const PAYMENTS_STORAGE = '@flightcare_payments';
  const SERVICES_STORAGE = '@flightcare_managed_services';
  const PRICING_STORAGE = '@flightcare_pricing_config';
  const STAFF_STORAGE = '@flightcare_staff_roster_v10';
  AsyncStorage.removeItem('@flightcare_staff_roster_v9').catch(() => {});
  AsyncStorage.removeItem('@flightcare_staff_roster_v8').catch(() => {});
  // Clear legacy obsolete staff roster caches so non-family mock staff are pruned
  AsyncStorage.removeItem('@flightcare_staff_roster_v7').catch(() => {});
  AsyncStorage.removeItem('@flightcare_staff_roster_v6').catch(() => {});
  AsyncStorage.removeItem('@flightcare_staff_roster_v5').catch(() => {});
  AsyncStorage.removeItem('@flightcare_staff_roster_v4').catch(() => {});
  AsyncStorage.removeItem('@flightcare_staff_roster_v3').catch(() => {});
  AsyncStorage.removeItem('@flightcare_staff_roster_v2').catch(() => {});
  AsyncStorage.removeItem('@flightcare_staff_roster').catch(() => {});

  const DEFAULT_WELCOME_NOTIFICATION = {
    id: 'welcome-001',
    title: 'Welcome to Flight Care! / স্বাগতম Flight Care-এ!',
    body: 'We are ready to provide you with seamless, VIP airport protocol services.',
    read: false,
    source: 'local',
    category: 'announcement',
    created_at: new Date().toISOString(),
  };

  const notify = (title, body, category = 'announcement', options = {}) => {
    const isPublicBroadcast = (category === 'announcement' || category === 'promotion') && !options.bookingId;
    const safeTargetUserId = options.targetUserId || customerSession?.user?.id || (isPublicBroadcast ? 'all' : null);
    const safeTargetRole = options.targetRole || (isPublicBroadcast ? 'passenger' : (currentRole === 'guest' ? 'passenger' : currentRole));

    const newNotif = {
      id: String(Date.now()),
      title,
      body,
      read: false,
      source: 'system',
      category,
      targetRole: safeTargetRole,
      targetUserId: safeTargetUserId,
      bookingId: options.bookingId || null,
      created_at: new Date().toISOString(),
      ...options,
    };
    setNotifications(current => {
      const updated = [newNotif, ...current];
      AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Cloud Firestore Sync & Browser Push Trigger (Only if target is valid and NOT an internal IPN or stray leak)
    if (safeTargetUserId) {
      dispatchNotification({
        title,
        body,
        category,
        targetRole: safeTargetRole,
        targetUserId: safeTargetUserId,
        bookingId: options.bookingId || null,
        ...options,
      }).catch(e => console.warn('Notification dispatch error:', e));
    }
  };

  const setAuthField = (key, value) =>
    setAuthForm(current => ({ ...current, [key]: value }));

  const openAuthView = view => {
    setAuthView(view);
    setAuthError('');
    setAuthNotice('');
  };

  const handleBack = (isFromPopState = false) => {
    if (!isFromPopState && Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
      if (historyEntriesCountRef.current > 0) {
        try {
          window.history.back();
          return;
        } catch {}
      }
    }

    if (subPage) {
      if (navHistory.length > 0) {
        const prev = navHistory[navHistory.length - 1];
        setNavHistory(curr => curr.slice(0, -1));
        setSubPage(prev.subPage || null);
        setSubPageParams(prev.subPageParams || {});
        if (prev.tab && prev.tab !== tab) setTab(prev.tab);
      } else {
        setSubPage(null);
        setSubPageParams({});
      }
      return;
    }
    if (tab === 'manager') {
      if ((managerSession?.user?.role === 'manager' || managerSession?.user?.role === 'admin') && managerSection !== 'dashboard') {
        setManagerSection('dashboard');
      } else {
        setTab('profile');
      }
      return;
    }
    if (tab === 'staff') {
      setTab('profile');
      return;
    }
    if (detail) {
      setDetail(null);
      return;
    }
    if (wiz) {
      if (wiz.step > 1) {
        setWiz(current => ({ ...current, step: current.step - 1 }));
      } else {
        setWiz(null);
        setSubPage(null);
        setDetail(null);
        setTab('home');
        if (!isFromPopState && Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
          try {
            window.history.pushState({ tab: 'home' }, '', '/Home');
          } catch {}
        }
      }
      return;
    }
    if (tab === 'profile' && authView !== 'account') {
      openAuthView('account');
      return;
    }
    if (tab !== 'home') {
      setTab('home');
      if (!isFromPopState && Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
        try {
          window.history.pushState({ tab: 'home' }, '', '/Home');
        } catch {}
      }
      return;
    }
  };

  // Hardware and Browser Back Navigation Support
  useEffect(() => {
    const onHardwareBack = () => {
      if (subPage || detail || wiz || (tab === 'manager' && managerSection !== 'dashboard') || (tab === 'profile' && authView !== 'account') || tab !== 'home') {
        handleBack();
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);

    const onPopState = () => {
      isPopStateRef.current = true;
      historyEntriesCountRef.current = Math.max(0, historyEntriesCountRef.current - 1);
      const cleanPath = getCleanPath();
      applyRouteFromPath(cleanPath);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('popstate', onPopState);
    }

    return () => {
      backSub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('popstate', onPopState);
      }
    };
  }, [subPage, detail, wiz, tab, managerSection, authView, navHistory]);

  useEffect(() => {
    let active = true;
    Promise.all([
      AsyncStorage.getItem(AIRPORTS_STORAGE),
      AsyncStorage.getItem(SETTINGS_STORAGE),
      AsyncStorage.getItem(BOOKINGS_STORAGE),
      AsyncStorage.getItem(DEVICE_BOOKINGS_STORAGE),
      AsyncStorage.getItem(NOTIFICATIONS_STORAGE),
      AsyncStorage.getItem(PROFILE_STORAGE),
      AsyncStorage.getItem(SESSION_STORAGE),
      AsyncStorage.getItem(PAYMENTS_STORAGE),
      AsyncStorage.getItem(PRICING_STORAGE),
      AsyncStorage.getItem(STAFF_STORAGE),
    ])
      .then(([airportsVal, settingsVal, bookingsVal, deviceBookingsVal, notificationsVal, profileVal, sessionVal, paymentsVal, pricingVal, staffVal]) => {
        if (!active) return;
        let loadedAirports = DEFAULT_MANAGED_AIRPORTS;
        if (airportsVal) {
          try {
            const parsed = JSON.parse(airportsVal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedAirports = parsed;
              setManagedAirports(parsed);
            }
          } catch {}
        }
        if (settingsVal) {
          try {
            const saved = JSON.parse(settingsVal);
            // Airport is permanently fixed to Hazrat Shahjalal International Airport (DAC)
            const dacAirport = loadedAirports.find(option => option.code === 'DAC') || DEFAULT_MANAGED_AIRPORTS[0];
            setAirport(dacAirport);
            // Default language is English (0)
            setLangState(0);
            setUserSelectedLang(false);
            if (saved.notificationPreferences && typeof saved.notificationPreferences === 'object') {
              setNotificationPreferences({
                ...DEFAULT_NOTIFICATION_PREFERENCES,
                ...saved.notificationPreferences,
              });
            }
          } catch {}
        }
        if (deviceBookingsVal) {
          try {
            const parsedDev = JSON.parse(deviceBookingsVal);
            if (Array.isArray(parsedDev)) {
              const cleanDev = parsedDev.filter(id => id && !LEGACY_TEST_BOOKING_IDS.has(String(id).trim()));
              setDeviceCreatedBookingIds(cleanDev);
              AsyncStorage.setItem(DEVICE_BOOKINGS_STORAGE, JSON.stringify(cleanDev)).catch(() => {});
            }
          } catch {}
        }
        if (bookingsVal) {
          try {
            const parsed = JSON.parse(bookingsVal);
            if (Array.isArray(parsed)) {
              const cleanParsed = parsed.filter(b => b && !isFalseBooking(b));
              if (cleanParsed.length !== parsed.length) {
                AsyncStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(cleanParsed)).catch(() => {});
              }
              setBookings(cleanParsed.map(normalizeCustomerBooking));
            }
          } catch {}
        }
        if (notificationsVal) {
          try {
            const parsed = JSON.parse(notificationsVal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Sanitize: Purge any raw IPN/webhook alerts or stray booking leaks from local visitor storage
              const sanitized = parsed.filter(n => {
                const text = `${n?.title || ''} ${n?.body || ''}`;
                return !/\[IPN\s*Webhook\]|\[IPN\s*ওয়েবহুক\]|\bIPN\b|confirmed on server|তাৎক্ষণিক নিশ্চিত/i.test(text);
              });
              const finalList = sanitized.length > 0 ? sanitized : [DEFAULT_WELCOME_NOTIFICATION];
              setNotifications(finalList);
              AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(finalList)).catch(() => {});
            } else {
              setNotifications([DEFAULT_WELCOME_NOTIFICATION]);
            }
          } catch {
            setNotifications([DEFAULT_WELCOME_NOTIFICATION]);
          }
        } else {
          setNotifications([DEFAULT_WELCOME_NOTIFICATION]);
        }
        if (profileVal) {
          try {
            const parsed = JSON.parse(profileVal);
            if (parsed && typeof parsed === 'object') {
              setProfile(current => ({ ...current, ...parsed }));
            }
          } catch {}
        }
        if (sessionVal) {
          try {
            const parsed = JSON.parse(sessionVal);
            if (parsed && typeof parsed === 'object') {
              setCustomerSession(parsed);
            }
          } catch {}
        }
        if (paymentsVal) {
          try {
            const parsed = JSON.parse(paymentsVal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCustomerPaymentHistory(parsed);
            }
          } catch {}
        }
        if (pricingVal) {
          try {
            const parsed = JSON.parse(pricingVal);
            if (parsed && typeof parsed === 'object') {
              setPricingConfig(parsed);
            }
          } catch {}
        }
        if (staffVal) {
          try {
            const parsed = JSON.parse(staffVal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // STRICT RULE: Only Flight Care Family members can be staff
              const cleaned = filterStaffRosterByFamily(parsed);
              const mapById = new Map();
              DEFAULT_STAFF_ROSTER.filter(isFlightCareFamilyMember).forEach(s => mapById.set(s.id, s));
              cleaned.forEach(s => {
                if (s && s.id && isFlightCareFamilyMember(s)) {
                  const existing = mapById.get(s.id);
                  mapById.set(s.id, { ...existing, ...s, pinHash: (existing && existing.pinHash) || s.pinHash });
                }
              });
              const synced = Array.from(mapById.values()).filter(isFlightCareFamilyMember).sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
              setStaffRoster(synced);
            } else {
              setStaffRoster(DEFAULT_STAFF_ROSTER.filter(isFlightCareFamilyMember));
            }
          } catch {
            setStaffRoster(DEFAULT_STAFF_ROSTER.filter(isFlightCareFamilyMember));
          }
        } else {
          setStaffRoster(DEFAULT_STAFF_ROSTER.filter(isFlightCareFamilyMember));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setSettingsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Real-Time Cloud Firestore Subscriptions (2-Way Live Sync)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    // 1. Cloud Bookings Real-time Listener
    const unsubBookings = listenToCloudBookings(
      cloudBookings => {
        if (!Array.isArray(cloudBookings)) return;
        setBookings(current => {
          const cloudMap = new Map();
          cloudBookings.forEach(cb => {
            if (cb && (cb.id || cb.bookingId) && !isFalseBooking(cb)) {
              const norm = normalizeCustomerBooking(cb);
              cloudMap.set(String(norm.id), norm);
            }
          });

          // Keep local draft or unsynced offline records only if real and recent (< 15 mins)
          (current || []).forEach(localB => {
            if (localB && localB.id && !isFalseBooking(localB) && !cloudMap.has(String(localB.id))) {
              const ageMinutes = (Date.now() - new Date(localB.createdAt || localB.date || 0).getTime()) / 60000;
              if (ageMinutes < 15) {
                cloudMap.set(String(localB.id), localB);
              }
            }
          });

          const merged = Array.from(cloudMap.values());
          merged.sort((a, b) => {
            const timeA = new Date(a.createdAt || a.date || 0).getTime();
            const timeB = new Date(b.createdAt || b.date || 0).getTime();
            return timeB - timeA;
          });

          AsyncStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(merged)).catch(() => {});
          return merged;
        });
      },
      err => console.warn('[Cloud Firestore] Real-time bookings sync notice:', err?.message)
    );

    // 2. Cloud Managed Airports Real-time Listener
    const unsubAirports = listenToCloudAirports(
      cloudAirports => {
        if (Array.isArray(cloudAirports) && cloudAirports.length > 0) {
          setManagedAirports(cloudAirports);
          AsyncStorage.setItem(AIRPORTS_STORAGE, JSON.stringify(cloudAirports)).catch(() => {});
        }
      },
      err => console.warn('[Cloud Firestore] Real-time airports sync notice:', err?.message)
    );

    // 3. Cloud Staff Roster Real-time Listener
    const unsubStaff = listenToCloudStaff(
      cloudStaff => {
        if (Array.isArray(cloudStaff) && cloudStaff.length > 0) {
          const cleaned = filterStaffRosterByFamily(cloudStaff);
          const mapById = new Map();
          DEFAULT_STAFF_ROSTER.filter(isFlightCareFamilyMember).forEach(s => mapById.set(s.id, s));
          cleaned.forEach(s => {
            if (s && s.id && isFlightCareFamilyMember(s)) {
              const existing = mapById.get(s.id);
              mapById.set(s.id, { ...existing, ...s });
            }
          });
          const merged = Array.from(mapById.values()).filter(isFlightCareFamilyMember).sort((a, b) => (Number(a.serial) || 999) - (Number(b.serial) || 999));
          setStaffRoster(merged);
          AsyncStorage.setItem(STAFF_STORAGE, JSON.stringify(merged)).catch(() => {});
        }
      },
      err => console.warn('[Cloud Firestore] Real-time staff sync notice:', err?.message)
    );

    // 5. Cloud Notifications Real-time Listener (Universal 4-Role Broadcast)
    const unsubNotifs = listenToCloudNotifications(
      cloudNotifs => {
        if (Array.isArray(cloudNotifs) && cloudNotifs.length > 0) {
          setNotifications(curr => {
            const map = new Map();
            curr.forEach(n => map.set(n.id, n));
            cloudNotifs.forEach(n => {
              // Strictly filter out any technical/IPN webhook raw announcements
              const text = `${n?.title || ''} ${n?.body || ''}`;
              if (/\[IPN\s*Webhook\]|\[IPN\s*ওয়েবহুক\]|\bIPN\b|confirmed on server|তাৎক্ষণিক নিশ্চিত/i.test(text)) {
                return;
              }
              const existing = map.get(n.id);
              map.set(n.id, { ...existing, ...n, read: existing?.read !== undefined ? existing.read : n.read });
            });
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0)
            );
          });
        }
      },
      err => console.warn('[Cloud Firestore] Real-time notifications notice:', err?.message)
    );

    // 4. Cloud Flight Care Family Directory Real-time Listener
    const unsubFamily = listenToCloudFlightCareFamily(
      cloudFamily => {
        if (Array.isArray(cloudFamily) && cloudFamily.length > 0) {
          // If modal is currently inspecting a family member, keep it updated dynamically
          setScannedFamilyMember(curr => {
            if (!curr || !curr.id) return curr;
            const updated = cloudFamily.find(m => m.id === curr.id || m.badgeNo === curr.badgeNo);
            return updated || curr;
          });

          // STRICT RULE: Staff Roster strictly derives from Flight Care Family!
          // No protocol officer can exist outside Flight Care Family
          setStaffRoster(() => {
            const familyStaffList = syncStaffWithFamilyRoster(cloudFamily);
            AsyncStorage.setItem(STAFF_STORAGE, JSON.stringify(familyStaffList)).catch(() => {});
            return familyStaffList;
          });
        }
      },
      err => console.warn('[Cloud Firestore] Real-time family sync notice:', err?.message)
    );

    return () => {
      if (typeof unsubBookings === 'function') unsubBookings();
      if (typeof unsubAirports === 'function') unsubAirports();
      if (typeof unsubStaff === 'function') unsubStaff();
      if (typeof unsubFamily === 'function') unsubFamily();
      if (typeof unsubNotifs === 'function') unsubNotifs();
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    AsyncStorage.setItem(
      SETTINGS_STORAGE,
      JSON.stringify({ airport: airport.code, lang, notificationPreferences, userSelectedLang })
    ).catch(() => {});
  }, [airport, lang, notificationPreferences, userSelectedLang, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (customerSession) {
      AsyncStorage.setItem(SESSION_STORAGE, JSON.stringify(customerSession)).catch(() => {});
    } else {
      AsyncStorage.removeItem(SESSION_STORAGE).catch(() => {});
    }
  }, [customerSession, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (profile && (profile.name || profile.phone || profile.email)) {
      AsyncStorage.setItem(PROFILE_STORAGE, JSON.stringify(profile)).catch(() => {});
    }
  }, [profile, settingsLoaded]);

  const addAirport = (newAirport) => {
    setManagedAirports(current => {
      const updated = [newAirport, ...current];
      AsyncStorage.setItem(AIRPORTS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    saveAirportToFirestore(newAirport).catch(e => console.warn('[Cloud Firestore] addAirport sync error:', e));
    logSecurityEvent({
      action: SECURITY_ACTIONS.AIRPORT_CREATED,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: `Added new airport: ${newAirport.code} (${newAirport.nameEn || (Array.isArray(newAirport.name) ? newAirport.name[0] : newAirport.name)})`,
      severity: 'INFO',
      status: 'SUCCESS',
    });
  };

  const updateAirport = (updatedAirport) => {
    setManagedAirports(current => {
      const updated = current.map(item => item.id === updatedAirport.id ? updatedAirport : item);
      AsyncStorage.setItem(AIRPORTS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    if (airport.id === updatedAirport.id || airport.code === updatedAirport.code) {
      setAirport(updatedAirport);
    }
    saveAirportToFirestore(updatedAirport).catch(e => console.warn('[Cloud Firestore] updateAirport sync error:', e));
    logSecurityEvent({
      action: SECURITY_ACTIONS.AIRPORT_UPDATED,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: `Updated airport configuration for code ${updatedAirport.code}`,
      severity: 'INFO',
      status: 'SUCCESS',
    });
  };

  const deleteAirport = (airportId) => {
    setManagedAirports(current => {
      const updated = current.filter(item => item.id !== airportId);
      AsyncStorage.setItem(AIRPORTS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    deleteAirportFromFirestore(airportId).catch(e => console.warn('[Cloud Firestore] deleteAirport sync error:', e));
    logSecurityEvent({
      action: SECURITY_ACTIONS.AIRPORT_DELETED,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: `Deleted airport record ID ${airportId}`,
      severity: 'WARNING',
      status: 'SUCCESS',
    });
  };

  const toggleAirportStatus = (airportId, targetStatus) => {
    let nextStatus = '';
    let updatedAirportObj = null;
    setManagedAirports(current => {
      const updated = current.map(item => {
        if (item.id === airportId) {
          nextStatus = targetStatus || (item.status === 'active' ? 'inactive' : 'active');
          updatedAirportObj = { ...item, status: nextStatus };
          return updatedAirportObj;
        }
        return item;
      });
      AsyncStorage.setItem(AIRPORTS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    if (updatedAirportObj) {
      saveAirportToFirestore(updatedAirportObj).catch(e => console.warn('[Cloud Firestore] toggleAirportStatus sync error:', e));
    }
    logSecurityEvent({
      action: SECURITY_ACTIONS.AIRPORT_STATUS_TOGGLED,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: `Toggled airport ID ${airportId} status to ${nextStatus}`,
      severity: 'INFO',
      status: 'SUCCESS',
    });
  };

  const resetAirports = () => {
    setManagedAirports(DEFAULT_MANAGED_AIRPORTS);
    AsyncStorage.setItem(AIRPORTS_STORAGE, JSON.stringify(DEFAULT_MANAGED_AIRPORTS)).catch(() => {});
    DEFAULT_MANAGED_AIRPORTS.forEach(a => {
      saveAirportToFirestore(a).catch(() => {});
    });
    logSecurityEvent({
      action: SECURITY_ACTIONS.AIRPORT_UPDATED,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: 'Restored managed airport configurations to system default',
      severity: 'WARNING',
      status: 'SUCCESS',
    });
  };

  const updatePricingConfig = (newConfig) => {
    setPricingConfig(newConfig);
    AsyncStorage.setItem(PRICING_STORAGE, JSON.stringify(newConfig)).catch(() => {});
    logSecurityEvent({
      action: SECURITY_ACTIONS.PRICING_UPDATED,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: 'Dynamic pricing engine matrix updated with new rates and multipliers',
      severity: 'WARNING',
      status: 'SUCCESS',
    });
  };

  const resetPricingConfig = () => {
    setPricingConfig(DEFAULT_PRICING_CONFIG);
    AsyncStorage.setItem(PRICING_STORAGE, JSON.stringify(DEFAULT_PRICING_CONFIG)).catch(() => {});
    logSecurityEvent({
      action: SECURITY_ACTIONS.PRICING_RESET,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: 'Reset pricing engine configuration to default baseline',
      severity: 'WARNING',
      status: 'SUCCESS',
    });
  };

  useEffect(() => {
    let active = true;
    if (!customerApiConfigured) {
      setBookingWorkflow(DEFAULT_BOOKING_WORKFLOW);
      return () => {
        active = false;
      };
    }
    getBookingWorkflow()
      .then(result => {
        if (!active) return;
        const stages = normalizeWorkflowStages(result.stages);
        setBookingWorkflow(result.ok && stages.length ? stages : DEFAULT_BOOKING_WORKFLOW);
      })
      .catch(() => {
        if (active) setBookingWorkflow(DEFAULT_BOOKING_WORKFLOW);
      });
    return () => {
      active = false;
    };
  }, []);

  // Real-time Webhook / IPN Listener (Bangla QR & Bank Cards)
  useEffect(() => {
    const unsubscribe = subscribeToPaymentWebhook(ipnEvent => {
      const { bookingId, trxId, amount, paymentId, channel } = ipnEvent;
      const isCard = String(channel || '').toLowerCase().includes('card');
      const methodTag = isCard ? 'card' : 'banglaqr';
      const channelLabel = channel || (isCard ? 'Bank Card (ভিসা/মাস্টারকার্ড)' : 'Bangla QR (বাংলা কিউআর)');

      setBookings(current => {
        const found = current.find(b => String(b.id) === String(bookingId));
        if (found) {
          const updated = current.map(b =>
            String(b.id) === String(bookingId)
              ? {
                  ...b,
                  paymentStatus: 'paid',
                  method: methodTag,
                  trxId,
                  paymentId,
                  paymentRecordId: paymentId,
                  status: b.status === 'pending' ? 'confirmed' : b.status,
                  paidAt: new Date().toISOString(),
                }
              : b
          );
          AsyncStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(updated)).catch(() => {});
          return updated;
        }
        return current;
      });

      // Dispatch internal notification to Managers/Super Admin ONLY
      // Strictly NEVER show to the general public or unauthenticated guests!
      dispatchNotification({
        title: lang
          ? `💳 [পেমেন্ট ভেরিফাইড] বুকিং #${bookingId}`
          : `💳 [Payment Verified] Booking #${bookingId}`,
        body: lang
          ? `পেমেন্ট চ্যানেল: ${channelLabel}, পরিমাণ: ৳${amount}। সার্ভারে নিশ্চিত হয়েছে।`
          : `Payment channel: ${channelLabel}, Amount: ৳${amount}. Verified on server.`,
        category: 'manager_alert',
        targetRole: 'manager',
        targetUserId: 'all_managers',
        bookingId,
      }).catch(() => {});

      // If THIS device actually booked this booking, show a friendly customer confirmation
      const isMyDeviceBooking = (deviceCreatedBookingIds || []).some(
        id => String(id).toUpperCase() === String(bookingId).toUpperCase()
      );
      if (isMyDeviceBooking) {
        notify(
          lang ? '🎉 পেমেন্ট সফল হয়েছে!' : '🎉 Payment Successful!',
          lang
            ? `আপনার বুকিং #${bookingId}-এর পেমেন্ট সফলভাবে গৃহীত হয়েছে।`
            : `Payment for your booking #${bookingId} was successfully received.`,
          'booking',
          { targetRole: 'passenger', bookingId }
        );
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [lang]);

  useEffect(() => {
    let active = true;
    const fetchServices = async () => {
      let loaded = null;
      try {
        const stored =
          (await AsyncStorage.getItem(`${SERVICES_STORAGE}_${airport.code}`)) ||
          (await AsyncStorage.getItem(SERVICES_STORAGE));
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loaded = parsed
              .filter(service => service.active !== false && service.is_active !== false)
              .map(normalizeService)
              .filter(Boolean);
          }
        }
      } catch {}

      if (customerApiConfigured) {
        try {
          const result = await getServiceCatalog(airport.code);
          if (result.ok) {
            const services = Array.isArray(result.data) ? result.data : result.data?.services || [];
            loaded = services
              .filter(service => service.active !== false && service.is_active !== false)
              .map(normalizeService)
              .filter(Boolean);
          }
        } catch {}
      }

      if (!active) return;
      if (loaded && loaded.length > 0) {
        setServiceCatalog(loaded);
      } else {
        setServiceCatalog(SERVICES);
      }
    };
    fetchServices();
    return () => {
      active = false;
    };
  }, [airport.code]);

  useEffect(() => {
    let active = true;
    if (!customerApiConfigured) {
      setAddonCatalog(ADDONS);
      return () => {
        active = false;
      };
    }
    getAddonCatalog(airport.code)
      .then(result => {
        if (!active) return;
        if (!result.ok) {
          setAddonCatalog(ADDONS);
          return;
        }
        const items = Array.isArray(result.data) ? result.data : result.data?.addons || [];
        setAddonCatalog(
          items
            .filter(addon => addon.active !== false && addon.is_active !== false)
            .map(normalizeAddon)
            .filter(Boolean)
        );
      })
      .catch(() => {
        if (active) setAddonCatalog(ADDONS);
      });
    return () => {
      active = false;
    };
  }, [airport.code]);

  useEffect(() => {
    let active = true;
    if (!customerSession?.token || customerSession.token === 'demo-customer-token' || !customerApiConfigured)
      return () => {
        active = false;
      };
    setBookingsLoading(true);
    setBookingsError('');
    getCustomerBookings(customerSession.token)
      .then(result => {
        if (!active) return;
        if (result.ok) {
          const remoteBookings = result.bookings.map(normalizeCustomerBooking);
          setBookings(current => {
            const combined = [...remoteBookings];
            current.forEach(loc => {
              if (!combined.some(rem => String(rem.id) === String(loc.id))) {
                combined.push(loc);
              }
            });
            AsyncStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(combined)).catch(() => {});
            return combined;
          });
        } else {
          setBookingsError(
            result.reason === 'not_configured'
              ? t('customerApiUnavailable')
              : result.message || t('bookingsLoadFailed')
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setBookingsLoading(false);
      });
    getCustomerNotifications(customerSession.token).then(result => {
      if (!active) return;
      if (result.ok) {
        const remoteNotifs = result.notifications.map(normalizeCustomerNotification);
        setNotifications(current => {
          const combined = [...remoteNotifs];
          current.forEach(loc => {
            if (!combined.some(rem => String(rem.id) === String(loc.id))) {
              combined.push(loc);
            }
          });
          AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(combined)).catch(() => {});
          return combined;
        });
      } else {
        setNotificationsError(
          result.reason === 'not_configured'
            ? t('customerApiUnavailable')
            : result.message || t('notificationsLoadFailed')
        );
      }
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [customerSession?.token]);

  const startBooking = (svc, addons = [], packageId = null, direction = svc?.cat || 'arr', initialData = {}) => {
    const isOnlyAddons = Boolean(initialData.onlyAddons || packageId === 'addons_only');
    const selectedPkg = isOnlyAddons
      ? {
          id: 'addons_only',
          n: ['Only Additional Services', 'শুধুমাত্র অতিরিক্ত সার্ভিস'],
          p: 0,
          desc: ['Standalone additional airport services without protocol package', 'প্রোটোকল প্যাকেজ ছাড়া শুধুমাত্র নির্বাচিত অতিরিক্ত সেবা'],
          features: ['Additional airport services only', 'শুধুমাত্র অতিরিক্ত সেবা'],
        }
      : (PKGS.find(pkg => pkg.id === packageId) || PKGS.find(p => p.id === 'business') || PKGS[1] || PKGS[0]);

    return setWiz({
      step: 1,
      svc: svc || serviceCatalog?.find(s => s.cat === direction) || SERVICES.find(s => s.cat === direction) || SERVICES[0],
      airport: airport.code,
      dir: direction,
      pkg: selectedPkg,
      onlyAddons: isOnlyAddons,
      showPackageFeatures: !isOnlyAddons && packageId !== null,
      addons,
      addonDetails: { ...createAddonDetails(), ...(initialData.addonDetails || {}) },
      remarks: '',
      name: initialData.name !== undefined ? initialData.name : (profile.name || ''),
      gender: '',
      nationality: '',
      phone: initialData.phone !== undefined ? initialData.phone : (profile.phone || ''),
      email: initialData.email !== undefined ? initialData.email : (profile.email || ''),
      dateOfBirth: '',
      passportNumber: '',
      airline: initialData.airline || '',
      airlineBn: initialData.airlineBn || '',
      fno: initialData.fno || '',
      ticketNumber: '',
      origin: initialData.origin || '',
      originBn: initialData.originBn || '',
      destination: initialData.destination || '',
      destinationBn: initialData.destinationBn || '',
      terminal: initialData.terminal || '',
      terminalBn: initialData.terminalBn || '',
      gate: initialData.gate || '',
      date: initialData.date || '',
      time: initialData.time || initialData.scheduled || '',
      scheduled: initialData.scheduled || initialData.time || '',
      liveRadar: initialData.liveRadar || false,
      flightStatus: initialData.status || '',
      route: initialData.route || '',
      pnr: '',
      flightNotes: '',
      a: initialData.passengers || initialData.a || 1,
      c: 0,
      e: 0,
      passengerDetails: [],
      method: 'banglaqr',
      bookingForSomeoneElse: initialData.bookingForSomeoneElse || false,
      hasPhone: initialData.hasPhone !== false,
      passengerName: initialData.passengerName || '',
      passengerPhone: initialData.passengerPhone || '',
      passengerCountryCode: initialData.passengerCountryCode || '+880',
      leadCountryCode: initialData.leadCountryCode || '+880',
      specialAssistance: initialData.specialAssistance || '',
      contactAtAirport: initialData.contactAtAirport || 'passenger',
      permissionConfirmed: true,
      agreedToPolicy: true,
    });
  };

  const submitManagerLogin = async () => {
    if (!managerEmail || !managerPassword) {
      setManagerLoginError(t('managerCredentialsRequired'));
      return;
    }
    const cleanEmail = managerEmail.trim().toLowerCase();
    const lockout = await checkAccountLockout(cleanEmail);
    if (lockout.locked) {
      setManagerLoginError(
        lang
          ? `অ্যাকাউন্ট সাময়িকভাবে লক রয়েছে। অনুগ্রহ করে ${lockout.remainingSec} সেকেন্ড পর আবার চেষ্টা করুন।`
          : `Account temporarily locked due to repeated failed logins. Please retry in ${lockout.remainingSec} seconds.`
      );
      return;
    }

    setManagerBusy(true);
    const result = await managerLogin(managerEmail.trim(), managerPassword);
    setManagerPassword('');
    if (result.ok && (result.user?.role === 'manager' || result.user?.role === 'admin')) {
      await resetFailedLogins(cleanEmail);
      await logSecurityEvent({
        action: SECURITY_ACTIONS.AUTH_LOGIN_SUCCESS,
        actor: { email: cleanEmail, role: result.user.role, name: result.user.name || 'Admin User' },
        details: `${result.user.role === 'admin' ? 'Super Admin' : 'Manager'} authenticated successfully with session encryption.`,
        severity: 'INFO',
        status: 'SUCCESS',
      });
      setManagerSession({ token: result.token, user: result.user });
      setManagerSection('dashboard');
      setManagerLoginError('');
    } else {
      await recordFailedLogin(cleanEmail);
      await logSecurityEvent({
        action: SECURITY_ACTIONS.AUTH_LOGIN_FAILED,
        actor: { email: cleanEmail, role: 'unknown', name: 'Anonymous' },
        details: 'Failed manager login attempt. Password verification rejected.',
        severity: 'WARNING',
        status: 'FAILED',
      });
      setManagerLoginError(
        lang
          ? 'ভুল ইমেইল/মোবাইল নম্বর বা পাসওয়ার্ড। অনুগ্রহ করে সঠিক তথ্য দিন।'
          : 'Invalid manager email/phone or password.'
      );
    }
    setManagerBusy(false);
  };

  const loadManagerServices = async airportCode => {
    if (!managerSession?.token || (managerSession.user?.role !== 'manager' && managerSession.user?.role !== 'admin')) return;
    setManagerServicesAirport(airportCode);
    setManagerServicesLoading(true);
    setManagerServicesError('');
    setManagerServicesNotice('');

    let loadedServices = null;
    try {
      const stored =
        (await AsyncStorage.getItem(`${SERVICES_STORAGE}_${airportCode}`)) ||
        (await AsyncStorage.getItem(SERVICES_STORAGE));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedServices = parsed.map(normalizeManagerService).filter(Boolean);
        }
      }
    } catch {}

    if (managerApiConfigured) {
      const result = await getManagerServices(managerSession.token, airportCode);
      if (result.ok && Array.isArray(result.services) && result.services.length > 0) {
        loadedServices = result.services.map(normalizeManagerService).filter(Boolean);
      }
    }

    if (!loadedServices || loadedServices.length === 0) {
      loadedServices = SERVICES.map((service, index) =>
        normalizeManagerService(service, index)
      ).filter(Boolean);
    }

    setManagerServices(loadedServices);
    setManagerServicesLoading(false);
  };

  const updateManagerService = (key, field, value) =>
    setManagerServices(current =>
      current.map(service => (service.key === key ? { ...service, [field]: value } : service))
    );

  const updateManagerServiceText = (key, field, languageIndex, value) =>
    setManagerServices(current =>
      current.map(service =>
        service.key === key
          ? {
              ...service,
              [field]: service[field].map((text, index) =>
                index === languageIndex ? value : text
              ),
            }
          : service
      )
    );

  const updateManagerServiceStep = (key, stepIndex, languageIndex, value) =>
    setManagerServices(current =>
      current.map(service =>
        service.key === key
          ? {
              ...service,
              s: service.s.map((step, index) =>
                index === stepIndex
                  ? step.map((text, locale) => (locale === languageIndex ? value : text))
                  : step
              ),
            }
          : service
      )
    );

  const addManagerService = category => {
    const id = `${category === 'arr' ? 'arrival' : 'departure'}-custom-${Date.now()}`;
    setManagerServices(current => [
      ...current,
      {
        key: id,
        id,
        cat: category,
        serviceCategory: 'meet_greet',
        ic: category === 'arr' ? '🛬' : '🛫',
        n: ['', ''],
        d: ['', ''],
        s: [['', '']],
        active: true,
        availability: { airports: ['ALL'], hours: '24/7', leadTime: 'Instant', terminals: ['ALL'] },
      },
    ]);
  };

  const addManagerServiceStep = key =>
    setManagerServices(current =>
      current.map(service =>
        service.key === key ? { ...service, s: [...service.s, ['', '']] } : service
      )
    );

  const removeManagerServiceStep = (key, stepIndex) =>
    setManagerServices(current =>
      current.map(service =>
        service.key === key
          ? { ...service, s: service.s.filter((step, index) => index !== stepIndex) }
          : service
      )
    );

  const removeManagerService = key =>
    setManagerServices(current => current.filter(service => service.key !== key));

  const saveManagerServiceCatalog = async customList => {
    if (!managerSession?.token || (managerSession.user?.role !== 'manager' && managerSession.user?.role !== 'admin')) return;
    const targetServices = customList || managerServices;
    const ids = targetServices.map(service => (service.id || '').trim().toLowerCase());
    const invalid =
      targetServices.some(
        service =>
          !service.id?.trim() ||
          !service.n?.[0]?.trim() ||
          !service.n?.[1]?.trim()
      ) || new Set(ids).size !== ids.length;
    if (invalid) {
      setManagerServicesError(t('serviceFieldsRequired') || 'সব ফিল্ড সঠিকভাবে পূরণ করুন');
      return;
    }
    setManagerServicesSaving(true);
    setManagerServicesError('');
    setManagerServicesNotice('');

    try {
      await AsyncStorage.setItem(`${SERVICES_STORAGE}_${managerServicesAirport}`, JSON.stringify(targetServices));
      await AsyncStorage.setItem(SERVICES_STORAGE, JSON.stringify(targetServices));
    } catch {}

    const services = targetServices.map(service => ({
      id: service.id.trim(),
      category: service.cat === 'arr' ? 'arrival' : (service.cat === 'transit' ? 'transit' : 'departure'),
      serviceCategory: service.serviceCategory || 'meet_greet',
      icon: service.ic,
      name: { en: service.n[0].trim(), bn: service.n[1].trim() },
      description: { en: (service.d?.[0] || '').trim(), bn: (service.d?.[1] || '').trim() },
      steps: (service.s || []).map(step => ({ en: (step[0] || '').trim(), bn: (step[1] || '').trim() })),
      active: service.active !== false,
      availability: service.availability || { airports: ['ALL'], hours: '24/7', leadTime: 'Instant', terminals: ['ALL'] },
    }));

    if (managerApiConfigured) {
      const result = await saveManagerServices(
        managerSession.token,
        managerServicesAirport,
        services
      );
      if (!result.ok) {
        setManagerServicesError(result.message || t('servicesLoadFailed'));
      }
    }

    setManagerServices(targetServices);
    setManagerServicesNotice(t('servicesSaved') || 'সার্ভিস সফলভাবে সংরক্ষণ করা হয়েছে!');

    setServiceCatalog(
      targetServices
        .filter(service => service.active !== false)
        .map(normalizeService)
        .filter(Boolean)
    );
    setManagerServicesSaving(false);
  };

  const addManagerServiceFull = async newService => {
    const updated = [newService, ...managerServices];
    setManagerServices(updated);
    await saveManagerServiceCatalog(updated);
  };

  const updateManagerServiceFull = async updatedService => {
    const updated = managerServices.map(s => (s.key === updatedService.key || s.id === updatedService.id ? updatedService : s));
    setManagerServices(updated);
    await saveManagerServiceCatalog(updated);
  };

  const deleteManagerServiceFull = async serviceKeyOrId => {
    const updated = managerServices.filter(s => s.key !== serviceKeyOrId && s.id !== serviceKeyOrId);
    setManagerServices(updated);
    await saveManagerServiceCatalog(updated);
  };

  const toggleManagerServiceStatus = async serviceKeyOrId => {
    const updated = managerServices.map(s => {
      if (s.key === serviceKeyOrId || s.id === serviceKeyOrId) {
        return { ...s, active: !s.active };
      }
      return s;
    });
    setManagerServices(updated);
    await saveManagerServiceCatalog(updated);
  };

  const resetManagerServicesToDefault = async () => {
    const defaultServices = SERVICES.map((service, index) =>
      normalizeManagerService(service, index)
    ).filter(Boolean);
    setManagerServices(defaultServices);
    await saveManagerServiceCatalog(defaultServices);
  };

  const loadManagerAddons = async airportCode => {
    if (!managerSession?.token || (managerSession.user?.role !== 'manager' && managerSession.user?.role !== 'admin')) return;
    setManagerAddonsAirport(airportCode);
    setManagerAddons([]);
    setManagerAddonsLoading(true);
    setManagerAddonsError('');
    setManagerAddonsNotice('');
    const result = await getManagerAddons(managerSession.token, airportCode);
    if (result.ok) setManagerAddons(result.addons.map(normalizeManagerAddon).filter(Boolean));
    else
      setManagerAddonsError(
        result.reason === 'not_configured'
          ? t('managerApiUnavailable')
          : result.message || t('addonCatalogLoadFailed')
      );
    setManagerAddonsLoading(false);
  };

  const updateManagerAddon = (key, field, value) =>
    setManagerAddons(current =>
      current.map(addon => (addon.key === key ? { ...addon, [field]: value } : addon))
    );

  const updateManagerAddonText = (key, field, languageIndex, value) =>
    setManagerAddons(current =>
      current.map(addon =>
        addon.key === key
          ? {
              ...addon,
              [field]: addon[field].map((text, index) =>
                index === languageIndex ? value : text
              ),
            }
          : addon
      )
    );

  const updateManagerAddonVehiclePrice = (key, category, value) =>
    setManagerAddons(current =>
      current.map(addon =>
        addon.key === key
          ? { ...addon, vehiclePrices: { ...addon.vehiclePrices, [category]: value } }
          : addon
      )
    );

  const toggleManagerAddonVehicle = (key, category) =>
    setManagerAddons(current =>
      current.map(addon =>
        addon.key === key
          ? {
              ...addon,
              vehicleCategories: addon.vehicleCategories.includes(category)
                ? addon.vehicleCategories.filter(item => item !== category)
                : [...addon.vehicleCategories, category],
            }
          : addon
      )
    );

  const toggleManagerMedicalOption = (key, option) =>
    setManagerAddons(current =>
      current.map(addon =>
        addon.key === key
          ? {
              ...addon,
              medicalServices: addon.medicalServices.includes(option)
                ? addon.medicalServices.filter(item => item !== option)
                : [...addon.medicalServices, option],
            }
          : addon
      )
    );

  const saveManagerAddonCatalog = async () => {
    if (!managerSession?.token || (managerSession.user?.role !== 'manager' && managerSession.user?.role !== 'admin')) return;
    const invalid = managerAddons.some(addon => {
      const invalidPrice = value =>
        value !== null &&
        value !== '' &&
        (!Number.isFinite(Number(value)) || Number(value) < 0);
      return (
        !addon.n[0].trim() ||
        !addon.n[1].trim() ||
        !addon.d[0].trim() ||
        !addon.d[1].trim() ||
        !['person', 'trip', 'bag', 'request', 'quote'].includes(addon.priceUnit) ||
        invalidPrice(addon.p) ||
        addon.vehicleCategories.some(category => invalidPrice(addon.vehiclePrices[category])) ||
        (addon.id === 'transfer' && addon.vehicleCategories.length === 0) ||
        (addon.id === 'medical' && addon.active && addon.medicalServices.length === 0)
      );
    });
    if (invalid) {
      setManagerAddonsError(t('addonCatalogInvalid'));
      return;
    }
    setManagerAddonsSaving(true);
    setManagerAddonsError('');
    setManagerAddonsNotice('');
    const addons = managerAddons.map(addon => ({
      id: addon.id,
      icon: addon.ic,
      name: { en: addon.n[0].trim(), bn: addon.n[1].trim() },
      description: { en: addon.d[0].trim(), bn: addon.d[1].trim() },
      active: addon.active,
      price: addon.p == null || addon.p === '' ? null : Number(addon.p),
      price_unit: addon.priceUnit,
      vehicle_categories: addon.vehicleCategories,
      vehicle_prices: Object.fromEntries(
        addon.vehicleCategories.map(category => [
          category,
          addon.vehiclePrices[category] == null || addon.vehiclePrices[category] === ''
            ? null
            : Number(addon.vehiclePrices[category]),
        ])
      ),
      medical_services: addon.medicalServices,
    }));
    const result = await saveManagerAddons(managerSession.token, managerAddonsAirport, addons);
    if (result.ok) {
      setManagerAddonsNotice(t('addonCatalogSaved'));
      if (managerAddonsAirport === airport.code)
        setAddonCatalog(
          managerAddons.filter(addon => addon.active).map(({ key, ...addon }) => addon)
        );
    } else {
      setManagerAddonsError(
        result.reason === 'not_configured'
          ? t('managerApiUnavailable')
          : result.message || t('addonCatalogLoadFailed')
      );
    }
    setManagerAddonsSaving(false);
  };

  const loadCustomerNotifications = async () => {
    if (!customerSession?.token) return;
    setNotificationsLoading(true);
    setNotificationsError('');
    const result = await getCustomerNotifications(customerSession.token);
    if (result.ok)
      setNotifications(current => [
        ...current.filter(item => item.source === 'local'),
        ...result.notifications.map(normalizeCustomerNotification),
      ]);
    else
      setNotificationsError(
        result.reason === 'not_configured'
          ? t('customerApiUnavailable')
          : result.message || t('notificationsLoadFailed')
      );
    setNotificationsLoading(false);
  };

  const markNotificationRead = async notification => {
    if (notification.read || notificationReadBusyIds.includes(notification.id)) return;
    if (!customerSession?.token || notification.source !== 'server' || customerSession.token === 'demo-customer-token' || !customerApiConfigured) {
      setNotifications(current => {
        const updated = current.map(item => (item.id === notification.id ? { ...item, read: true } : item));
        AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return;
    }
    setNotificationReadBusyIds(current => [...current, notification.id]);
    const result = await markCustomerNotificationRead(customerSession.token, notification.id);
    if (result.ok) {
      setNotifications(current => {
        const updated = current.map(item => (item.id === notification.id ? { ...item, read: true } : item));
        AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      setNotificationsError('');
    } else {
      setNotificationsError(
        result.reason === 'not_configured'
          ? t('customerApiUnavailable')
          : result.message || t('notificationReadFailed')
      );
    }
    setNotificationReadBusyIds(current => current.filter(id => id !== notification.id));
  };

  const markAllNotificationsRead = async () => {
    if (markingAllNotificationsRead) return;
    const unreadNotifications = notifications.filter(notification => !notification.read);
    if (!unreadNotifications.length) return;
    setNotifications(current => {
      const updated = current.map(item => ({ ...item, read: true }));
      AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    setNotificationsError('');
  };

  const loadCustomerPaymentHistory = async () => {
    if (!customerSession?.token || customerSession.token === 'demo-customer-token' || !customerApiConfigured) return;
    setCustomerPaymentsLoading(true);
    setCustomerPaymentsError('');
    const result = await getCustomerPaymentHistory(customerSession.token);
    if (result.ok) {
      setCustomerPaymentHistory(result.payments);
      AsyncStorage.setItem(PAYMENTS_STORAGE, JSON.stringify(result.payments)).catch(() => {});
    } else {
      setCustomerPaymentsError(
        result.reason === 'not_configured'
          ? t('customerApiUnavailable')
          : result.message || t('customerPaymentsLoadFailed')
      );
    }
    setCustomerPaymentsLoading(false);
  };

  const requestBookingCancellation = booking => {
    if (booking.status === 'cancelled') return;
    const policy = booking.cancellation_policy_summary || t('cancelConfirm');
    Alert.alert(t('cancelBooking'), policy, [
      { text: t('back'), style: 'cancel' },
      {
        text: t('cancelBooking'),
        style: 'destructive',
        onPress: async () => {
          setBookingActionId(String(booking.id));
          setBookingsError('');
          if (customerSession?.token && customerApiConfigured && customerSession.token !== 'demo-customer-token') {
            const result = await cancelCustomerBooking(customerSession.token, booking.id);
            if (result.ok) {
              const responseBooking = result.data?.booking || result.data;
              setBookings(current => {
                const updated = current.map(item =>
                  String(item.id) === String(booking.id)
                    ? normalizeCustomerBooking({
                        ...item,
                        ...(responseBooking && typeof responseBooking === 'object'
                          ? responseBooking
                          : {}),
                        status:
                          responseBooking?.status ||
                          responseBooking?.booking_status ||
                          'cancelled',
                        cancelled: true,
                        can_cancel: false,
                        cancellation_eligible: false,
                      })
                    : item
                );
                AsyncStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(updated)).catch(() => {});
                updateBookingInFirestore(booking.id, { status: 'cancelled', cancelled: true }).catch(() => {});
                return updated;
              });
              notify(t('bookingCancelled'), String(booking.id), 'booking');
              dispatchMultiChannelNotification({
                eventType: COMMUNICATION_EVENTS.BOOKING_CANCELLED,
                booking,
                payload: { refundAmount: booking.amount, cancellationFee: 0 },
                preferences: notificationPreferences,
                lang,
                notifyFn: notify,
              });
            } else {
              setBookingsError(
                result.reason === 'not_configured'
                  ? t('customerApiUnavailable')
                  : result.message || t('bookingCancelFailed')
              );
            }
          } else {
            // Local / Offline cancellation fallback
            setBookings(current => {
              const updated = current.map(item =>
                String(item.id) === String(booking.id)
                  ? {
                      ...item,
                      status: 'cancelled',
                      cancelled: true,
                      can_cancel: false,
                      cancellation_eligible: false,
                      statusHistory: [
                        ...(item.statusHistory || []),
                        { status: 'cancelled', label: 'Cancelled', created_at: new Date().toLocaleTimeString() },
                      ],
                    }
                  : item
              );
              AsyncStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(updated)).catch(() => {});
              updateBookingInFirestore(booking.id, { status: 'cancelled', cancelled: true }).catch(() => {});
              return updated;
            });
            notify(t('bookingCancelled'), String(booking.id), 'booking');
            dispatchMultiChannelNotification({
              eventType: COMMUNICATION_EVENTS.BOOKING_CANCELLED,
              booking,
              payload: { refundAmount: booking.amount, cancellationFee: 0 },
              preferences: notificationPreferences,
              lang,
              notifyFn: notify,
            });
            dispatchBookingLifecycleNotifications({
              stage: 'cancelled',
              booking,
              extra: { refundAmount: booking.amount },
              lang,
            }).then(res => {
              if (res?.notifications) {
                setNotifications(curr => [
                  res.notifications.passenger,
                  res.notifications.officer,
                  res.notifications.manager,
                  res.notifications.superAdmin,
                  ...curr,
                ]);
              }
            }).catch(() => {});
          }
          setBookingActionId('');
        },
      },
    ]);
  };

  const sendNotification = async (notificationData = {}) => {
    try {
      const newNotif = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: notificationData.title || 'Platform Notification',
        message: notificationData.message || notificationData.body || '',
        category: notificationData.category || 'general',
        timestamp: new Date().toISOString(),
        read: false,
        source: 'system',
        ...notificationData,
      };
      setNotifications(prev => [newNotif, ...(prev || [])]);
      await dispatchMultiChannelNotification({
        type: notificationData.category || 'general',
        title: notificationData.title,
        message: notificationData.message,
        recipient: notificationData.recipient || { name: 'Customer' },
        preferences: notificationPreferences,
      }).catch(err => console.warn('dispatchMultiChannelNotification warn:', err));
      return { ok: true, notification: newNotif };
    } catch (e) {
      console.warn('sendNotification error:', e);
      return { ok: false, error: e.message };
    }
  };

  const loadManagerPayments = async (
    status = managerPaymentFilter,
    search = managerPaymentSearch
  ) => {
    if (!managerSession?.token || (managerSession.user?.role !== 'manager' && managerSession.user?.role !== 'admin')) return;
    setManagerPaymentsLoading(true);
    setManagerPaymentsError('');
    const result = await getManagerPayments(managerSession.token, status, search);
    if (result.ok) {
      setManagerPayments(result.payments);
      setManagerPaymentsSummary(result.summary);
    } else {
      if (result.reason === 'not_configured' || result.reason === 'unavailable') {
        try {
          const stored = await AsyncStorage.getItem(PAYMENTS_STORAGE);
          const parsed = stored ? JSON.parse(stored) : [];
          setManagerPayments(parsed);
        } catch {
          setManagerPayments([]);
        }
      } else {
        setManagerPaymentsError(result.message || t('adminPaymentsLoadFailed'));
      }
    }
    setManagerPaymentsLoading(false);
  };

  const submitManagerRefund = async payment => {
    if (!managerSession?.token || (managerSession.user?.role !== 'manager' && managerSession.user?.role !== 'admin')) return;
    if (!refundReason.trim()) {
      setManagerPaymentsError(t('refundReasonRequired'));
      return;
    }
    const requestedAmount = refundAmount.trim() ? Number(refundAmount) : (Number(payment.refundable_amount ?? payment.amount) || 0);
    const refundableLimit = Number(payment.refundable_amount ?? payment.amount);
    if (
      requestedAmount !== null &&
      (!Number.isFinite(requestedAmount) ||
        requestedAmount <= 0 ||
        (Number.isFinite(refundableLimit) && requestedAmount > refundableLimit))
    ) {
      setManagerPaymentsError(t('refundAmountInvalid'));
      return;
    }
    setRefundSaving(true);
    setManagerPaymentsError('');

    let refundProcessed = false;
    let noticeMessage = '';

    const result = await refundManagerPayment(
      managerSession.token,
      payment.id ?? payment.payment_id,
      requestedAmount,
      refundReason.trim()
    );

    if (result.ok) {
      refundProcessed = true;
      noticeMessage = result.data?.message || t('refundSubmitted');
    } else if (result.reason === 'not_configured' || result.reason === 'unavailable') {
      refundProcessed = true;
      noticeMessage = lang
        ? `৳${requestedAmount} টাকা রিফান্ড সফলভাবে সম্পন্ন হয়েছে (বুকিং #${payment.booking_id || payment.id})`
        : `Refund of ৳${requestedAmount} processed successfully (Booking #${payment.booking_id || payment.id})`;
    } else {
      setManagerPaymentsError(result.message || t('refundRequestFailed'));
    }

    if (refundProcessed) {
      const paymentId = String(payment.id ?? payment.payment_id);
      const bookingId = String(payment.booking_id ?? payment.booking?.id ?? '');

      // Update manager payments in state & storage
      setManagerPayments(current => {
        const updated = current.map(p => {
          if (String(p.id ?? p.payment_id) === paymentId || (bookingId && String(p.booking_id) === bookingId)) {
            const currentRefunded = Number(p.refunded_amount || 0) + requestedAmount;
            const remaining = Math.max(0, Number(p.amount || 0) - currentRefunded);
            return {
              ...p,
              status: remaining === 0 ? 'refunded' : p.status,
              refund_status: remaining === 0 ? 'refunded' : 'partial_refund',
              refunded_amount: currentRefunded,
              refundable_amount: remaining,
              refund_reason: refundReason.trim(),
              refunded_at: new Date().toISOString(),
            };
          }
          return p;
        });
        AsyncStorage.setItem(PAYMENTS_STORAGE, JSON.stringify(updated)).catch(() => {});
        return updated;
      });

      // Update customer payment history in state & storage
      setCustomerPaymentHistory(current => {
        const updated = current.map(p => {
          if (String(p.id ?? p.payment_id) === paymentId || (bookingId && String(p.booking_id) === bookingId)) {
            return {
              ...p,
              status: 'refunded',
              refund_status: 'refunded',
              refunded_amount: requestedAmount,
              refundable_amount: 0,
              refund_reason: refundReason.trim(),
              refunded_at: new Date().toISOString(),
            };
          }
          return p;
        });
        AsyncStorage.setItem(PAYMENTS_STORAGE, JSON.stringify(updated)).catch(() => {});
        return updated;
      });

      // Update booking in platform bookings & Firestore
      if (bookingId) {
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const operator = {
          id: managerSession?.user?.id || 'manager',
          name: managerSession?.user?.name || (managerSession.user?.role === 'admin' ? 'Super Admin' : 'Manager'),
          email: managerSession?.user?.email || 'manager@flightcare.com',
          role: managerSession?.user?.role || 'manager',
        };
        const bookingUpdates = {
          paymentStatus: 'refunded',
          status: 'cancelled',
          cancellation: {
            isCancelled: true,
            reason: `Refund: ${refundReason.trim()}`,
            cancelledAt: 'Today, ' + timeString,
            cancelledBy: operator,
            refundAmount: requestedAmount,
            refundStatus: 'processed',
            refundRef: `REF-${bookingId}`,
          },
        };
        updateLocalBooking(bookingId, bookingUpdates);
      }

      logSecurityEvent({
        action: SECURITY_ACTIONS.REFUND_PROCESSED,
        actor: { email: managerSession?.user?.email || 'manager@flightcare.app', role: managerSession?.user?.role || 'manager' },
        details: `Processed refund of ৳${requestedAmount} for payment ${paymentId}. Reason: ${refundReason.trim()}`,
        severity: 'WARNING',
        status: 'SUCCESS',
      });

      setManagerPaymentsNotice(noticeMessage);
      setRefundPaymentId('');
      setRefundAmount('');
      setRefundReason('');
      await loadManagerPayments();
    }
    setRefundSaving(false);
  };

  const loadManagerWorkflow = async () => {
    if (!managerSession?.token || (managerSession.user?.role !== 'manager' && managerSession.user?.role !== 'admin')) return;
    setManagerWorkflowLoading(true);
    setManagerWorkflowError('');
    setManagerWorkflowNotice('');
    const result = await getManagerBookingWorkflow(managerSession.token);
    if (result.ok) {
      const stages = normalizeWorkflowStages(result.stages);
      setManagerWorkflow(stages.length ? stages : DEFAULT_BOOKING_WORKFLOW);
    } else {
      setManagerWorkflowError(
        result.reason === 'not_configured'
          ? t('managerApiUnavailable')
          : result.message || t('workflowLoadFailed')
      );
    }
    setManagerWorkflowLoading(false);
  };

  const updateManagerWorkflowStage = (key, field, value) =>
    setManagerWorkflow(current =>
      current.map(stage => (stage.key === key ? { ...stage, [field]: value } : stage))
    );

  const updateManagerWorkflowLabel = (key, languageIndex, value) =>
    setManagerWorkflow(current =>
      current.map(stage =>
        stage.key === key
          ? {
              ...stage,
              label: stage.label.map((label, index) =>
                index === languageIndex ? value : label
              ),
            }
          : stage
      )
    );

  const addManagerWorkflowStage = () =>
    setManagerWorkflow(current => [
      ...current,
      { key: `custom_stage_${Date.now()}`, label: ['', ''], bucket: 'upcoming' },
    ]);

  const removeManagerWorkflowStage = key =>
    setManagerWorkflow(current => current.filter(stage => stage.key !== key));

  const moveManagerWorkflowStage = (key, direction) =>
    setManagerWorkflow(current => {
      const index = current.findIndex(stage => stage.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered;
    });

  const saveManagerWorkflow = async () => {
    if (!managerSession?.token || (managerSession.user?.role !== 'manager' && managerSession.user?.role !== 'admin')) return;
    const keys = managerWorkflow.map(stage => stage.key.trim().toLowerCase());
    const invalid =
      managerWorkflow.length < 2 ||
      new Set(keys).size !== keys.length ||
      managerWorkflow.some(
        stage =>
          !/^[a-z0-9_]+$/.test(stage.key.trim()) ||
          !stage.label[0].trim() ||
          !stage.label[1].trim() ||
          !['upcoming', 'completed', 'cancelled'].includes(stage.bucket)
      ) ||
      !managerWorkflow.some(stage => stage.bucket === 'upcoming') ||
      !managerWorkflow.some(stage => stage.bucket === 'completed');
    if (invalid) {
      setManagerWorkflowError(t('workflowInvalid'));
      return;
    }
    setManagerWorkflowSaving(true);
    setManagerWorkflowError('');
    setManagerWorkflowNotice('');
    const stages = managerWorkflow.map((stage, order) => ({
      key: stage.key.trim().toLowerCase(),
      label: { en: stage.label[0].trim(), bn: stage.label[1].trim() },
      bucket: stage.bucket,
      order,
    }));
    const result = await saveManagerBookingWorkflow(managerSession.token, stages);
    if (result.ok) {
      const normalized = normalizeWorkflowStages(stages);
      setManagerWorkflow(normalized);
      setBookingWorkflow(normalized);
      setManagerWorkflowNotice(t('workflowSaved'));
    } else {
      setManagerWorkflowError(
        result.reason === 'not_configured'
          ? t('managerApiUnavailable')
          : result.message || t('workflowSaveFailed')
      );
    }
    setManagerWorkflowSaving(false);
  };

  const openManagerSection = async section => {
    const adminOnlySections = ['pricing', 'reports', 'backup', 'security'];
    if (adminOnlySections.includes(section) && managerSession?.user?.role !== 'admin') {
      setManagerSection('dashboard');
      return;
    }
    setManagerSection(section);
    if (section === 'services') {
      await loadManagerServices(airport.code);
      return;
    }
    if (section === 'addons') {
      await loadManagerAddons(airport.code);
      return;
    }
    if (section === 'payments') {
      await loadManagerPayments();
      return;
    }
    if (section === 'workflow') {
      await loadManagerWorkflow();
      return;
    }
    if (
      section !== 'allocation' ||
      !managerSession?.token ||
      (managerSession.user?.role !== 'manager' && managerSession.user?.role !== 'admin')
    )
      return;
    setManagerStaffingRules([]);
    setManagerRulesLoading(true);
    setManagerRulesError('');
    setManagerRulesNotice('');
    const result = await getManagerStaffAllocationRules(managerSession.token);
    if (result.ok) {
      setManagerStaffingRules(
        result.rules.map((rule, index) => ({
          key: String(rule.id ?? `rule-${index}`),
          ...rule,
          airport_code: rule.airport_code ?? '*',
          service_id: rule.service_id ?? '*',
          service_category: rule.service_category ?? 'arrival',
          min_passengers: String(rule.min_passengers ?? 1),
          max_passengers: rule.max_passengers == null ? '' : String(rule.max_passengers),
          special_assistance: rule.special_assistance ?? 'any',
          required_staff: String(rule.required_staff ?? 1),
        }))
      );
    } else {
      setManagerRulesError(
        result.reason === 'not_configured'
          ? t('managerApiUnavailable')
          : result.message || t('rulesLoadFailed')
      );
    }
    setManagerRulesLoading(false);
  };

  const updateManagerRule = (key, field, value) =>
    setManagerStaffingRules(current =>
      current.map(rule => (rule.key === key ? { ...rule, [field]: value } : rule))
    );

  const addManagerRule = () =>
    setManagerStaffingRules(current => [
      ...current,
      {
        key: `draft-${Date.now()}`,
        airport_code: '*',
        service_category: 'arrival',
        service_id: '*',
        min_passengers: '1',
        max_passengers: '',
        special_assistance: 'any',
        required_staff: '1',
      },
    ]);

  const removeManagerRule = key =>
    setManagerStaffingRules(current => current.filter(rule => rule.key !== key));

  const saveManagerRules = async () => {
    if (!managerSession?.token || (managerSession.user?.role !== 'manager' && managerSession.user?.role !== 'admin')) return;
    const invalidCriteria = managerStaffingRules.some(
      rule =>
        !['arrival', 'departure'].includes(rule.service_category) ||
        !['any', 'none', 'wheelchair', 'medical', 'other'].includes(rule.special_assistance)
    );
    if (invalidCriteria) {
      setManagerRulesError(t('ruleCriteriaInvalid'));
      return;
    }
    const invalid = managerStaffingRules.some(rule => {
      const minimum = Number(rule.min_passengers);
      const maximum = rule.max_passengers === '' ? null : Number(rule.max_passengers);
      const assistants = Number(rule.required_staff);
      return (
        !Number.isInteger(minimum) ||
        minimum < 1 ||
        (maximum !== null && (!Number.isInteger(maximum) || maximum < minimum)) ||
        !Number.isInteger(assistants) ||
        assistants < 1
      );
    });
    if (invalid) {
      setManagerRulesError(t('ruleValuesInvalid'));
      return;
    }
    setManagerRulesSaving(true);
    setManagerRulesError('');
    setManagerRulesNotice('');
    const rules = managerStaffingRules.map(({ key, id, ...rule }) => ({
      ...(id ? { id } : {}),
      airport_code: rule.airport_code.trim() || '*',
      service_category: rule.service_category,
      service_id: rule.service_id.trim() || '*',
      min_passengers: Number(rule.min_passengers) || 1,
      max_passengers: rule.max_passengers ? Number(rule.max_passengers) : null,
      special_assistance: rule.special_assistance,
      required_staff: Math.max(1, Number(rule.required_staff) || 1),
    }));
    const result = await saveManagerStaffAllocationRules(managerSession.token, rules);
    if (result.ok) setManagerRulesNotice(t('rulesSaved'));
    else
      setManagerRulesError(
        result.reason === 'not_configured'
          ? t('managerApiUnavailable')
          : result.message || t('rulesLoadFailed')
      );
    setManagerRulesSaving(false);
  };

  const acceptCustomerSession = async result => {
    if (!result.ok || result.user?.role !== 'customer') {
      setAuthError(
        result.message || (result.reason === 'not_configured' ? t('customerApiUnavailable') : t('authFailure'))
      );
      return false;
    }
    const welcomePts = WELCOME_BONUS_POINTS || 100;
    const userObj = {
      ...result.user,
      rewardPoints: Number(result.user.rewardPoints ?? result.user.points ?? welcomePts),
      points: Number(result.user.rewardPoints ?? result.user.points ?? welcomePts),
      rewardTier: result.user.rewardTier || 'BRONZE',
      welcomeBonusClaimed: true,
    };
    const session = { token: result.token, user: userObj };
    setCustomerSession(session);
    setProfile(curr => ({
      ...curr,
      name: userObj.name || '',
      phone: userObj.phone || '',
      email: userObj.email || '',
      rewardPoints: userObj.rewardPoints,
      points: userObj.points,
      rewardTier: userObj.rewardTier,
    }));
    AsyncStorage.setItem(SESSION_STORAGE, JSON.stringify(session)).catch(() => {});
    AsyncStorage.setItem(PROFILE_STORAGE, JSON.stringify(userObj)).catch(() => {});
    // Auto grant welcome bonus if not yet credited
    grantWelcomeSignupBonus(userObj.id || userObj.email || userObj.phone, userObj.name).catch(() => {});
    if (userObj.email) grantWelcomeSignupBonus(userObj.email, userObj.name).catch(() => {});
    // Sync customer user to Firebase Firestore
    saveUserToFirestore(userObj).catch(err => console.warn('Firebase user sync:', err));
    setAuthForm(current => ({
      ...current,
      password: '',
      passwordConfirmation: '',
      code: '',
    }));
    setAuthView('account');
    setAuthError('');
    setAuthNotice(lang ? 'ভেরিফিকেশন সফল হয়েছে! ফায়ারবেসে তথ্য সংরক্ষিত হয়েছে।' : 'Verified successfully! Saved to Firebase.');
    return true;
  };

  const submitCustomerLogin = async () => {
    const rawIdentifier = (authForm.identifier || '').trim();
    const rawPassword = String(authForm.password || '').trim();

    if (!rawIdentifier || !rawPassword)
      return setAuthError(t('authRequired'));
    setAuthBusy(true);
    setAuthError('');

    // Convert any Bengali digits to English digits
    const cleanIdentifier = convertBnDigitsToEn(rawIdentifier).trim().toLowerCase();
    const normPhone = normalizePhoneForAuth(cleanIdentifier);
    const inputHash = sha256Hash(rawPassword);

    // 1. Dynamic Cloud Check for Manager / Admin credentials in Customer Login Form
    try {
      const cloudCheck = await authenticateWithFirebaseCloud(cleanIdentifier, rawPassword);
      if (cloudCheck && cloudCheck.ok && (cloudCheck.user?.role === 'manager' || cloudCheck.user?.role === 'admin')) {
        const mgrUser = cloudCheck.user;
        const session = { token: cloudCheck.token, user: mgrUser };
        setCustomerSession(session);
        setManagerSession(session);
        setProfile(current => ({ ...current, ...mgrUser }));
        setAuthForm(current => ({ ...current, password: '' }));
        setAuthView('account');
        setAuthBusy(false);
        setTab('manager');
        return;
      }
    } catch {}

    // 2. Strict Authentication against Firebase Cloud (Checks by email, normalized phone, docId)
    const custAuth = await authenticateCustomerWithFirebase(cleanIdentifier, rawPassword);
    if (custAuth && custAuth.ok && custAuth.user) {
      const user = custAuth.user;
      const session = { token: custAuth.token, user };
      setCustomerSession(session);
      setProfile(current => ({ ...current, ...user }));
      AsyncStorage.setItem(SESSION_STORAGE, JSON.stringify(session)).catch(() => {});
      AsyncStorage.setItem(PROFILE_STORAGE, JSON.stringify(user)).catch(() => {});

      // Keep local customers cache updated
      try {
        const storedListStr = await AsyncStorage.getItem(CUSTOMERS_LIST_STORAGE);
        let list = storedListStr ? JSON.parse(storedListStr) : [];
        if (!Array.isArray(list)) list = [];
        const idx = list.findIndex(u => 
          (user.email && u.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
          (user.phone && u.phone && normalizePhoneForAuth(u.phone) === normalizePhoneForAuth(user.phone))
        );
        if (idx >= 0) list[idx] = { ...list[idx], ...user };
        else list.push(user);
        AsyncStorage.setItem(CUSTOMERS_LIST_STORAGE, JSON.stringify(list)).catch(() => {});
      } catch {}

      setAuthForm(current => ({ ...current, password: '' }));
      setAuthView('account');
      setAuthNotice(
        lang
          ? `স্বাগতম ${user.name || ''}! আপনি সফলভাবে লগইন হয়েছেন।`
          : `Welcome ${user.name || ''}! You are logged in successfully.`
      );
      setAuthBusy(false);
      return;
    }

    if (custAuth && !custAuth.ok) {
      if (custAuth.reason === 'invalid_password') {
        setAuthError(lang ? 'ভুল পাসওয়ার্ড। অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।' : 'Invalid password. Please enter the correct password.');
        setAuthBusy(false);
        return;
      }
      if (custAuth.reason === 'google_auth_required') {
        setAuthError(
          lang
            ? 'এই অ্যাকাউন্টটি গুগল দিয়ে খোলা হয়েছিল। অনুগ্রহ করে "Google / Gmail" দিয়ে সাইন ইন করুন।'
            : 'This account was created with Google. Please use Google / Gmail Sign In.'
        );
        setAuthBusy(false);
        return;
      }
    }

    // 3. Fallback: Verify against locally stored registered customer list & profile (Offline / Immediate Support)
    try {
      const storedListStr = await AsyncStorage.getItem(CUSTOMERS_LIST_STORAGE);
      const storedProfileStr = await AsyncStorage.getItem(PROFILE_STORAGE);
      let candidates = [];
      if (storedListStr) {
        const parsed = JSON.parse(storedListStr);
        if (Array.isArray(parsed)) candidates.push(...parsed);
      }
      if (storedProfileStr) {
        candidates.push(JSON.parse(storedProfileStr));
      }

      const matchedLocalUser = candidates.find(u => {
        if (!u) return false;
        const uEmail = (u.email || '').toLowerCase().trim();
        const uPhone = normalizePhoneForAuth(u.phone || '');
        return (
          (uEmail && uEmail === cleanIdentifier) ||
          (normPhone && uPhone && uPhone === normPhone) ||
          (u.phone && u.phone.replace(/[\s-]/g, '') === cleanIdentifier.replace(/[\s-]/g, ''))
        );
      });

      if (matchedLocalUser) {
        const storedHash = (matchedLocalUser.passwordHash || '').toLowerCase();
        const isMatch = (storedHash && storedHash === inputHash.toLowerCase()) ||
          (matchedLocalUser.password && String(matchedLocalUser.password).trim() === rawPassword);

        if (isMatch) {
          const session = { token: `customer-token-${Date.now()}`, user: matchedLocalUser };
          setCustomerSession(session);
          setProfile(current => ({ ...current, ...matchedLocalUser }));
          AsyncStorage.setItem(SESSION_STORAGE, JSON.stringify(session)).catch(() => {});
          AsyncStorage.setItem(PROFILE_STORAGE, JSON.stringify(matchedLocalUser)).catch(() => {});
          setAuthForm(current => ({ ...current, password: '' }));
          setAuthView('account');
          setAuthNotice(
            lang
              ? `স্বাগতম ${matchedLocalUser.name || ''}! আপনি সফলভাবে লগইন হয়েছেন।`
              : `Welcome ${matchedLocalUser.name || ''}! You are logged in successfully.`
          );
          setAuthBusy(false);
          return;
        } else {
          setAuthError(lang ? 'ভুল পাসওয়ার্ড। অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।' : 'Invalid password. Please enter the correct password.');
          setAuthBusy(false);
          return;
        }
      }
    } catch (localErr) {
      console.warn('Local customer auth fallback error:', localErr);
    }

    // 4. If account doesn't exist at all, give a clear, informative message
    setAuthError(
      lang
        ? 'এই মোবাইল নম্বর বা জিমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে নতুন একাউন্ট খুলুন (সাইন আপ)।'
        : 'No account found with this mobile or Gmail. Please create a new account (Sign Up).'
    );
    setAuthBusy(false);
  };

  const submitCustomerRegistration = async () => {
    const rawName = (authForm.name || '').trim();
    const rawPassword = String(authForm.password || '');
    const rawConfirm = String(authForm.passwordConfirmation || '');
    const rawPhone = convertBnDigitsToEn(String(authForm.phone || '')).trim();
    const rawEmail = String(authForm.email || '').trim().toLowerCase();

    if (!rawName || !rawPassword)
      return setAuthError(t('authRequired'));
    if (!rawPhone && !rawEmail) {
      return setAuthError(lang ? 'মোবাইল নম্বর অথবা জিমেইল ঠিকানা প্রদান করুন।' : 'Please provide either mobile number or Gmail.');
    }
    if (rawPhone && !isValidMobileNumber(rawPhone)) return setAuthError(t('invalidPhone'));
    if (rawEmail && !isValidEmailAddress(rawEmail))
      return setAuthError(t('invalidEmail'));
    if (rawPassword.length < 6) return setAuthError(t('passwordTooShort'));
    if (rawPassword !== rawConfirm)
      return setAuthError(t('passwordMismatch'));
    setAuthBusy(true);
    setAuthError('');

    const normPhone = rawPhone ? normalizePhoneForAuth(rawPhone) : '';

    // Step 1: Duplicate check - Pre-flight verification in Firebase Firestore & local storage
    try {
      if (rawEmail) {
        const checkEmail = await fetchUserFromFirestore(rawEmail);
        if (checkEmail && checkEmail.ok && checkEmail.user) {
          setAuthError(
            lang
              ? 'এই জিমেইল ঠিকানা দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে সাইন ইন করুন।'
              : 'An account with this Gmail already exists. Please Sign In.'
          );
          setAuthBusy(false);
          return;
        }
      }
      if (normPhone) {
        const checkPhone = await fetchUserFromFirestore(normPhone);
        if (checkPhone && checkPhone.ok && checkPhone.user) {
          setAuthError(
            lang
              ? 'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে সাইন ইন করুন।'
              : 'An account with this mobile number already exists. Please Sign In.'
          );
          setAuthBusy(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Pre-registration duplicate check:', err);
    }

    // Step 2: Create user object with 100 Reward Points
    const isGmail = rawEmail.includes('@gmail.com');
    const welcomePts = WELCOME_BONUS_POINTS || 100;
    const nowIso = new Date().toISOString();
    const newUser = {
      id: Date.now(),
      uid: `usr_${Date.now()}`,
      name: rawName,
      email: rawEmail || '',
      phone: rawPhone || '',
      normalizedPhone: normPhone,
      role: 'customer',
      authProvider: isGmail ? 'gmail' : (rawEmail ? 'email' : 'phone'),
      phone_verified: Boolean(rawPhone),
      phoneVerified: Boolean(rawPhone),
      email_verified: Boolean(rawEmail),
      emailVerified: Boolean(rawEmail),
      rewardPoints: welcomePts,
      points: welcomePts,
      rewardTier: 'BRONZE',
      welcomeBonusClaimed: true,
      passwordHash: sha256Hash(rawPassword.trim()),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const session = { token: `customer-session-${Date.now()}`, user: newUser };
    setCustomerSession(session);
    setProfile(current => ({ ...current, ...newUser }));
    AsyncStorage.setItem(SESSION_STORAGE, JSON.stringify(session)).catch(() => {});
    AsyncStorage.setItem(PROFILE_STORAGE, JSON.stringify(newUser)).catch(() => {});

    // Save to local registered customers array
    try {
      const storedListStr = await AsyncStorage.getItem(CUSTOMERS_LIST_STORAGE);
      let list = storedListStr ? JSON.parse(storedListStr) : [];
      if (!Array.isArray(list)) list = [];
      const idx = list.findIndex(u => 
        (rawEmail && u.email && u.email.toLowerCase() === rawEmail) ||
        (normPhone && u.phone && normalizePhoneForAuth(u.phone) === normPhone)
      );
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...newUser };
      } else {
        list.push(newUser);
      }
      await AsyncStorage.setItem(CUSTOMERS_LIST_STORAGE, JSON.stringify(list));
    } catch (err) {
      console.warn('Local customers list save error:', err);
    }

    // Grant welcome signup bonus points in ledger
    grantWelcomeSignupBonus(newUser.id, newUser.name).catch(() => {});
    if (newUser.email) grantWelcomeSignupBonus(newUser.email, newUser.name).catch(() => {});
    if (normPhone) grantWelcomeSignupBonus(normPhone, newUser.name).catch(() => {});

    // Sync directly to Firebase Firestore
    await saveUserToFirestore(newUser).catch(err => console.warn('Firebase user sync:', err));

    setAuthForm(current => ({ ...current, password: '', passwordConfirmation: '', code: '' }));
    setAuthView('account');
    setAuthNotice(
      lang
        ? `🎉 অভিনন্দন ${rawName}! আপনার একাউন্ট সফলভাবে খোলা হয়েছে এবং ${welcomePts} পয়েন্ট ওয়েলকাম বোনাস প্রোফাইলে যোগ হয়েছে!`
        : `🎉 Congratulations ${rawName}! Account created and ${welcomePts} Welcome Points added to your profile!`
    );
    setAuthBusy(false);
  };

  const submitCustomerOtp = async () => {
    if (!authChallengeId || !isValidMobileNumber(authForm.phone))
      return setAuthError(t('invalidPhone'));
    if (!/^\d{6}$/.test(authForm.code.trim())) return setAuthError(t('invalidOtp'));
    setAuthBusy(true);
    setAuthError('');
    const result = await verifyCustomerOtp(
      authChallengeId,
      authForm.phone.trim(),
      authForm.code.trim()
    );
    if (result.ok) {
      acceptCustomerSession(result);
    } else {
      setAuthError(result.message || t('authFailure'));
    }
    setAuthBusy(false);
  };

  const resendCustomerCode = async () => {
    if (!authChallengeId) return setAuthError(t('authFailure'));
    setAuthBusy(true);
    setAuthError('');
    const result = await resendCustomerOtp(authChallengeId, authForm.phone.trim());
    if (result.ok) {
      const testCodeMsg = result.data?.code ? ` (নতুন কোড: ${result.data.code})` : '';
      setAuthNotice((lang ? 'নতুন যাচাইকরণ OTP পাঠানো হয়েছে।' : t('otpSent')) + testCodeMsg);
    } else {
      setAuthNotice('');
      setAuthError(result.message || t('authFailure'));
    }
    setAuthBusy(false);
  };

  const submitPasswordResetRequest = async () => {
    if (!authForm.identifier.trim()) return setAuthError(t('authRequired'));
    setAuthBusy(true);
    setAuthError('');
    const result = await requestPasswordReset(authForm.identifier.trim());
    setAuthNotice(result.ok ? t('resetCodeSent') : '');
    setAuthError(
      result.reason === 'not_configured'
        ? t('customerApiUnavailable')
        : result.ok
          ? ''
          : t('authFailure')
    );
    if (result.ok) setAuthView('reset');
    setAuthBusy(false);
  };

  const submitPasswordReset = async () => {
    if (!authForm.identifier.trim()) return setAuthError(t('authRequired'));
    if (!/^\d{6}$/.test(authForm.code.trim())) return setAuthError(t('invalidOtp'));
    if (authForm.password.length < 8) return setAuthError(t('passwordTooShort'));
    if (authForm.password !== authForm.passwordConfirmation)
      return setAuthError(t('passwordMismatch'));
    setAuthBusy(true);
    setAuthError('');
    const result = await resetCustomerPassword(
      authForm.identifier.trim(),
      authForm.code.trim(),
      authForm.password,
      authForm.passwordConfirmation
    );
    setAuthForm(current => ({
      ...current,
      password: '',
      passwordConfirmation: '',
      code: '',
    }));
    setAuthError(
      result.ok
        ? ''
        : result.reason === 'not_configured'
          ? t('customerApiUnavailable')
          : t('authFailure')
    );
    if (result.ok) {
      setAuthView('login');
      setAuthNotice(t('resetComplete'));
    }
    setAuthBusy(false);
  };

  const saveCustomerProfile = async () => {
    if (!profile.name?.trim()) return setAuthError(t('authRequired'));
    if (profile.email && profile.email.trim() && !isValidEmailAddress(profile.email))
      return setAuthError(t('invalidEmail'));
    setAuthBusy(true);
    setAuthError('');
    AsyncStorage.setItem(PROFILE_STORAGE, JSON.stringify(profile)).catch(() => {});
    if (customerSession) {
      const updatedSession = { ...customerSession, user: { ...customerSession.user, ...profile } };
      setCustomerSession(updatedSession);
      AsyncStorage.setItem(SESSION_STORAGE, JSON.stringify(updatedSession)).catch(() => {});
    }
    if (!customerApiConfigured || customerSession?.token === 'demo-customer-token') {
      setAuthNotice(t('profileSaved'));
      setAuthError('');
      setAuthBusy(false);
      return;
    }
    const result = await updateCustomerProfile(customerSession.token, profile);
    if (result.ok) {
      const updatedUser = result.data?.user || result.data || profile;
      setCustomerSession(current => ({ ...current, user: { ...current.user, ...updatedUser } }));
      setProfile(current => ({ ...current, ...updatedUser }));
      AsyncStorage.setItem(PROFILE_STORAGE, JSON.stringify({ ...profile, ...updatedUser })).catch(() => {});
      setAuthNotice(t('profileSaved'));
      setAuthError('');
    } else {
      setAuthError(
        result.reason === 'not_configured' ? t('customerApiUnavailable') : t('authFailure')
      );
    }
    setAuthBusy(false);
  };

  const signOutCustomer = async () => {
    if (customerSession && customerApiConfigured && customerSession.token !== 'demo-customer-token') {
      try {
        await logoutCustomer(customerSession.token);
      } catch {}
    }
    setCustomerSession(null);
    AsyncStorage.removeItem(SESSION_STORAGE).catch(() => {});
    setAuthForm({
      name: '',
      phone: '',
      email: '',
      identifier: '',
      password: '',
      passwordConfirmation: '',
      code: '',
    });
    setAuthView('account');
    setAuthError('');
    setAuthNotice('');
  };

  const addStaffMember = (staffData) => {
    const newStaff = {
      id: `st-${Date.now()}`,
      rating: 5.0,
      completedServices: 0,
      joinedDate: 'Just added',
      active: true,
      status: 'available',
      ...staffData,
    };
    setStaffRoster(curr => {
      const updated = [newStaff, ...curr];
      AsyncStorage.setItem(STAFF_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    saveStaffToFirestore(newStaff).catch(e => console.warn('[Cloud Firestore] addStaff sync error:', e));
    logSecurityEvent({
      action: SECURITY_ACTIONS.STAFF_CREATED,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: `Created new protocol staff account: ${newStaff.name} (${newStaff.role || 'Staff'}) at airport ${newStaff.airport || 'DAC'}`,
      severity: 'INFO',
      status: 'SUCCESS',
    });
    return newStaff;
  };

  const updateStaffMember = (staffId, updates) => {
    setStaffRoster(curr => {
      const updated = curr.map(s => s.id === staffId ? { ...s, ...updates } : s);
      AsyncStorage.setItem(STAFF_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    updateStaffInFirestore(staffId, updates).catch(e => console.warn('[Cloud Firestore] updateStaff sync error:', e));
    logSecurityEvent({
      action: SECURITY_ACTIONS.STAFF_UPDATED,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: `Updated protocol staff information for ID ${staffId}: ${Object.keys(updates).join(', ')}`,
      severity: 'INFO',
      status: 'SUCCESS',
    });
  };

  const toggleStaffDutyStatus = (staffId) => {
    let nextStatus = '';
    setStaffRoster(curr => {
      const updated = curr.map(s => {
        if (s.id !== staffId) return s;
        nextStatus = s.status === 'available' ? 'in_service' : s.status === 'in_service' ? 'off_duty' : 'available';
        return { ...s, status: nextStatus };
      });
      AsyncStorage.setItem(STAFF_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    updateStaffInFirestore(staffId, { status: nextStatus }).catch(e => console.warn('[Cloud Firestore] toggleStaffDuty sync error:', e));
    logSecurityEvent({
      action: SECURITY_ACTIONS.STAFF_DUTY_TOGGLED,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: `Protocol staff ID ${staffId} duty status toggled to ${nextStatus}`,
      severity: 'INFO',
      status: 'SUCCESS',
    });
  };

  const toggleStaffActiveStatus = (staffId) => {
    let nextActive = true;
    setStaffRoster(curr => {
      const updated = curr.map(s => {
        if (s.id !== staffId) return s;
        nextActive = !s.active;
        return { ...s, active: nextActive };
      });
      AsyncStorage.setItem(STAFF_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    updateStaffInFirestore(staffId, { active: nextActive }).catch(e => console.warn('[Cloud Firestore] toggleStaffActive sync error:', e));
    logSecurityEvent({
      action: SECURITY_ACTIONS.STAFF_DEACTIVATED,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: `Protocol staff ID ${staffId} account ${nextActive ? 'activated' : 'deactivated'}`,
      severity: 'WARNING',
      status: 'SUCCESS',
    });
  };

  const deleteStaffMember = (staffId) => {
    setStaffRoster(curr => {
      const updated = curr.filter(s => s.id !== staffId);
      AsyncStorage.setItem(STAFF_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    deleteStaffFromFirestore(staffId).catch(e => console.warn('[Cloud Firestore] deleteStaff sync error:', e));
    logSecurityEvent({
      action: SECURITY_ACTIONS.STAFF_DEACTIVATED,
      actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
      details: `Protocol staff member ID ${staffId} removed from roster`,
      severity: 'WARNING',
      status: 'SUCCESS',
    });
  };

  const submitStaffLogin = async (overrideEmail = null, overridePassword = null) => {
    const emailToUse = (overrideEmail || staffEmail || '').trim();
    const passwordToUse = (overridePassword || staffPassword || '').trim();
    if (!emailToUse || !passwordToUse) {
      setStaffLoginError(
        lang
          ? 'স্টাফ আইডি/ইমেইল এবং সিক্রেট পিন/পাসওয়ার্ড উভয়ই প্রদান করা আবশ্যক।'
          : 'Staff Identifier and Secret PIN / Password are both required.'
      );
      return;
    }

    const cleanEmail = emailToUse.toLowerCase();
    const lockout = await checkAccountLockout(cleanEmail);
    if (lockout.locked) {
      setStaffLoginError(
        lang
          ? `স্টাফ অ্যাকাউন্ট সাময়িকভাবে লক রয়েছে। অনুগ্রহ করে ${lockout.remainingSec} সেকেন্ড পর আবার চেষ্টা করুন।`
          : `Staff account temporarily locked due to repeated failed logins. Please retry in ${lockout.remainingSec} seconds.`
      );
      return;
    }

    setStaffBusy(true);
    setStaffLoginError('');

    if (staffApiConfigured) {
      const result = await staffLogin(cleanEmail, passwordToUse);
      setStaffPassword('');
      if (result.ok && ['staff', 'agent'].includes(result.user?.role)) {
        await resetFailedLogins(cleanEmail);
        await logSecurityEvent({
          action: SECURITY_ACTIONS.AUTH_LOGIN_SUCCESS,
          actor: { id: result.user.id, name: result.user.name, email: cleanEmail, role: result.user.role },
          details: `Protocol staff ${result.user.name} authenticated via API.`,
          severity: 'INFO',
          status: 'SUCCESS',
        });
        setStaffSession({ token: result.token, user: result.user });
        setStaffLoginError('');
        setStaffLoading(true);
        try {
          setStaffAssignments(await getStaffAssignments(result.token));
        } catch {
          setStaffActionError(t('staffRequestFailed'));
        } finally {
          setStaffLoading(false);
        }
        setStaffBusy(false);
        return;
      }
    }

    // Strict Protocol Staff Roster Lookup (Email, ID, Phone, or Badge Number)
    const matchedStaff = (staffRoster || []).find(
      s => (s.email && s.email.toLowerCase() === cleanEmail) ||
           (s.id && s.id.toLowerCase() === cleanEmail) ||
           (s.phone && s.phone.replace(/[\s-]/g, '') === cleanEmail.replace(/[\s-]/g, '')) ||
           (s.badgeNo && s.badgeNo.toLowerCase() === cleanEmail) ||
           (s.badgeNo && s.badgeNo.replace(/[-\s]/g, '').toLowerCase() === cleanEmail.replace(/[-\s]/g, ''))
    );

    setStaffPassword('');
    if (!matchedStaff) {
      await recordFailedLogin(cleanEmail);
      await logSecurityEvent({
        action: SECURITY_ACTIONS.AUTH_LOGIN_FAILED,
        actor: { email: cleanEmail, role: 'staff', name: 'Unknown Staff' },
        details: `Rejected staff login: no staff record exists for ${cleanEmail}.`,
        severity: 'WARNING',
        status: 'FAILED',
      });
      setStaffLoginError(
        lang
          ? 'কোনো প্রোটোকল অফিসার অ্যাকাউন্ট খুঁজে পাওয়া যায়নি। সঠিক তথ্য দিন।'
          : 'No protocol officer account found. Please provide valid staff credentials.'
      );
      setStaffBusy(false);
      return;
    }

    if (!matchedStaff.active) {
      setStaffLoginError(
        lang
          ? 'এই স্টাফ অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় রয়েছে।'
          : 'This staff account is currently deactivated by administrator.'
      );
      setStaffBusy(false);
      return;
    }

    // Strict PIN / Password Enforcement (Cryptographically Salted Hash Verification)
    const isPinValid = verifyStaffPin(matchedStaff, passwordToUse);
    if (!isPinValid) {
      await recordFailedLogin(cleanEmail);
      await logSecurityEvent({
        action: SECURITY_ACTIONS.AUTH_LOGIN_FAILED,
        actor: { id: matchedStaff.id, name: matchedStaff.name, email: matchedStaff.email, role: 'staff' },
        details: `Rejected staff login: incorrect PIN/password entered for officer ${matchedStaff.name}.`,
        severity: 'WARNING',
        status: 'FAILED',
      });
      setStaffLoginError(
        lang
          ? 'ভুল পাসওয়ার্ড বা সিকিউরিটি পিন। সঠিক পিন দিন।'
          : 'Invalid PIN or password. Authentication rejected.'
      );
      setStaffBusy(false);
      return;
    }

    // Successfully Authenticated
    await resetFailedLogins(cleanEmail);
    await logSecurityEvent({
      action: SECURITY_ACTIONS.AUTH_LOGIN_SUCCESS,
      actor: { id: matchedStaff.id, name: matchedStaff.name, email: matchedStaff.email, role: 'staff' },
      details: `Protocol officer ${matchedStaff.name} verified and authenticated successfully with secure PIN.`,
      severity: 'INFO',
      status: 'SUCCESS',
    });

    const staffUser = {
      id: matchedStaff.id,
      name: matchedStaff.name,
      email: matchedStaff.email,
      phone: matchedStaff.phone,
      role: 'staff',
      station: matchedStaff.station,
      airport: matchedStaff.airport,
      shift: matchedStaff.shift,
      rating: matchedStaff.rating,
      status: matchedStaff.status,
    };
    setStaffSession({ token: `staff-token-${matchedStaff.id}-${Date.now()}`, user: staffUser });
    setStaffLoginError('');
    setStaffBusy(false);
    setStaffBusy(false);
  };

  const updateStaffWork = async (assignment, action, extraUpdates = {}) => {
    if (!staffSession || !['staff', 'agent'].includes(staffSession.user?.role)) return;
    setStaffBusy(true);
    setStaffActionError('');
    try {
      if (staffApiConfigured && staffSession.token && !staffSession.token.startsWith('demo-staff-token')) {
        if (action === 'accept') await acceptStaffAssignment(staffSession.token, assignment.id);
        if (action === 'start')
          await updateStaffAssignment(staffSession.token, assignment.id, 'in_progress');
        if (action === 'complete')
          await completeStaffAssignment(staffSession.token, assignment.id);
        setStaffAssignments(await getStaffAssignments(staffSession.token));
      }
      const bookingId = assignment.id || assignment.booking_id || assignment.bookingId;
      if (bookingId) {
        let status = 'in_progress';
        if (action === 'accept') status = 'accepted';
        if (action === 'complete') status = 'completed';
        handleAdminUpdateBooking(bookingId, {
          status,
          staffStatus: status,
          ...extraUpdates,
        });
      }
    } catch {
      setStaffActionError(t('staffRequestFailed'));
    } finally {
      setStaffBusy(false);
    }
  };

  const updateLocalBooking = (bookingId, updates) =>
    setBookings(current => {
      const updated = current.map(booking =>
        String(booking.id) === String(bookingId) ? { ...booking, ...updates } : booking
      );
      AsyncStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

  const handleAdminUpdateBooking = (bookingId, updates) => {
    setBookings(current => {
      const exists = current.some(b => String(b.id) === String(bookingId));
      let updated;
      const target = current.find(b => String(b.id) === String(bookingId)) || { id: bookingId };
      const merged = { ...target, ...updates };

      if (exists) {
        updated = current.map(b =>
          String(b.id) === String(bookingId) ? merged : b
        );
      } else {
        updated = [merged, ...current];
      }
      AsyncStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(updated)).catch(() => {});
      saveBookingToFirestore(merged).catch(err => {
        console.warn('[Cloud Firestore] Admin booking sync error:', err);
      });

      // Multi-channel Communication Triggers
      if (updates.staff && updates.staff !== 'Unassigned' && updates.staff !== target.staff) {
        const staffObj = (staffRoster || []).find(s => s.name === updates.staff || s.id === updates.staffId || s.id === updates.leadStaffId);
        const targetStaffId = updates.staffId || updates.leadStaffId || staffObj?.id;
        if (targetStaffId) {
          dispatchStaffNotification({
            staffId: targetStaffId,
            staffName: updates.staff,
            type: STAFF_NOTIFICATION_TYPES.ASSIGNMENT,
            bookingId: merged.id,
            passengerName: merged.passengerName || merged.customer || 'Guest',
            flight: merged.flight?.number || merged.flightNumber || merged.fno || 'Flight',
            airport: merged.airport || 'DAC',
            terminal: merged.flight?.terminal || merged.terminal || 'Terminal 1',
            date: merged.flight?.date || merged.flightDate || 'Scheduled Date',
            time: merged.flight?.time || merged.flightTime || 'Scheduled Time',
            meetingPoint: updates.meetingPoint || `${merged.terminal || 'Terminal 1'} VIP Arrival Gate`,
            lang,
          }).catch(() => {});
        }

        dispatchMultiChannelNotification({
          eventType: COMMUNICATION_EVENTS.STAFF_ASSIGNED,
          booking: merged,
          payload: {
            staffName: updates.staff,
            staffPhone: updates.staffPhone || updates.leadStaffPhone,
            meetingPoint: updates.meetingPoint || `${merged.terminal || 'Terminal 1'} VIP Arrival / Departure Gate`,
          },
          preferences: notificationPreferences,
          lang,
          notifyFn: notify,
        });

        // 4-Party Universal Step Notification (Passenger, Officer, Manager, Super Admin)
        dispatchBookingLifecycleNotifications({
          stage: 'assigned',
          booking: merged,
          staff: staffObj,
          extra: { meetingPoint: updates.meetingPoint },
          lang,
        }).then(res => {
          if (res?.notifications) {
            setNotifications(curr => [
              res.notifications.passenger,
              res.notifications.officer,
              res.notifications.manager,
              res.notifications.superAdmin,
              ...curr,
            ]);
          }
        }).catch(() => {});
      }

      // Status Change Notification to all 4 parties (Passenger, Officer, Manager, Super Admin)
      if (updates.status && updates.status !== target.status) {
        dispatchBookingLifecycleNotifications({
          stage: updates.status,
          booking: merged,
          previousStage: target.status,
          staff: (staffRoster || []).find(s => s.name === merged.staff || s.id === merged.staffId || s.id === merged.leadStaffId),
          extra: { refundAmount: updates.refundAmount || merged.amount },
          lang,
        }).then(res => {
          if (res?.notifications) {
            setNotifications(curr => [
              res.notifications.passenger,
              res.notifications.officer,
              res.notifications.manager,
              res.notifications.superAdmin,
              ...curr,
            ]);
          }
        }).catch(() => {});
      }

      if (updates.status === 'completed' && target.status !== 'completed') {
        const officerId = merged.staffId || merged.leadStaffId;
        if (officerId) {
          dispatchStaffNotification({
            staffId: officerId,
            staffName: merged.staff || 'Protocol Officer',
            type: STAFF_NOTIFICATION_TYPES.SERVICE_COMPLETED,
            bookingId: merged.id,
            passengerName: merged.passengerName || merged.customer || 'Guest',
            flight: merged.flight?.number || merged.flightNumber || merged.fno || 'Flight',
            terminal: merged.flight?.terminal || merged.terminal || 'Terminal 1',
            pointsEarned: 10,
            lang,
          }).catch(() => {});
        }
      }

      if (updates.serviceMilestones && Array.isArray(updates.serviceMilestones)) {
        const lastActive = updates.serviceMilestones.find(m => m.status === 'completed' || m.status === 'in_progress');
        if (lastActive) {
          dispatchMultiChannelNotification({
            eventType: COMMUNICATION_EVENTS.SERVICE_MILESTONE,
            booking: merged,
            payload: { stageName: lastActive.label, stageNameBn: lastActive.labelBn || lastActive.label },
            preferences: notificationPreferences,
            lang,
            notifyFn: notify,
          });
          // 4-Party Universal Milestone Notification
          dispatchBookingLifecycleNotifications({
            stage: lastActive.key || lastActive.id || 'milestone_update',
            booking: merged,
            staff: (staffRoster || []).find(s => s.name === merged.staff || s.id === merged.staffId || s.id === merged.leadStaffId),
            extra: { milestoneNameEn: lastActive.label, milestoneNameBn: lastActive.labelBn || lastActive.label },
            lang,
          }).then(res => {
            if (res?.notifications) {
              setNotifications(curr => [
                res.notifications.passenger,
                res.notifications.officer,
                res.notifications.manager,
                res.notifications.superAdmin,
                ...curr,
              ]);
            }
          }).catch(() => {});
        }
      }

      if (updates.serviceProgress && Array.isArray(updates.serviceProgress)) {
        const lastDone = [...updates.serviceProgress].reverse().find(m => m.status === 'completed');
        if (lastDone) {
          dispatchBookingLifecycleNotifications({
            stage: lastDone.key || lastDone.id || 'milestone_update',
            booking: merged,
            staff: (staffRoster || []).find(s => s.name === merged.staff || s.id === merged.staffId || s.id === merged.leadStaffId),
            extra: { milestoneNameEn: lastDone.labelEn, milestoneNameBn: lastDone.labelBn || lastDone.labelEn },
            lang,
          }).then(res => {
            if (res?.notifications) {
              setNotifications(curr => [
                res.notifications.passenger,
                res.notifications.officer,
                res.notifications.manager,
                res.notifications.superAdmin,
                ...curr,
              ]);
            }
          }).catch(() => {});
        }
      }

      if (updates.status === 'cancelled' && target.status !== 'cancelled') {
        logSecurityEvent({
          action: SECURITY_ACTIONS.BOOKING_CANCELLED_ADMIN,
          actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
          details: `Booking ID ${bookingId} cancelled by administrator.`,
          severity: 'WARNING',
          status: 'SUCCESS',
        });
        dispatchMultiChannelNotification({
          eventType: COMMUNICATION_EVENTS.BOOKING_CANCELLED,
          booking: merged,
          payload: { refundAmount: updates.refundAmount || merged.amount, cancellationFee: updates.cancellationFee || 0 },
          preferences: notificationPreferences,
          lang,
          notifyFn: notify,
        });
      }

      return updated;
    });
  };

  const openBkashPayment = async paymentUrl => {
    if (!paymentUrl) return;
    try {
      await Linking.openURL(paymentUrl);
    } catch {
      Alert.alert(t('paymentInitFailed'));
    }
  };

  const startBanglaQrPayment = (booking, onCompleted) => {
    if (!booking) return;
    setActiveBkashBooking(booking);
    setBkashSuccessCallback(() => (typeof onCompleted === 'function' ? onCompleted : null));
    setBkashModalVisible(true);
  };
  const startBkashPayment = startBanglaQrPayment;

  const handleBanglaQrPaymentSuccess = async ({ trxId, paymentId, amount, wallet, channel }) => {
    if (!activeBkashBooking) return;
    const bookingId = String(activeBkashBooking.id);
    const expectedAmount = Number(amount) || Number(activeBkashBooking.amount) || 0;
    const paymentChannel = channel || (wallet ? `${wallet} (বাংলা কিউআর)` : 'Bangla QR (বাংলা কিউআর)');

    // Requirement 3: Server-side Transaction & Amount Verification
    const verification = await verifyBanglaQrPayment(paymentId, trxId, bookingId, expectedAmount, paymentChannel);
    if (!verification.ok) {
      Alert.alert(
        lang ? 'পেমেন্ট যাচাই ব্যর্থ হয়েছে' : 'Payment Verification Failed',
        verification.message || (lang ? 'সার্ভার থেকে পেমেন্ট তথ্য সঠিক পাওয়া যায়নি।' : 'Gateway failed to verify transaction.')
      );
      return;
    }

    const isTrulyVerified = Boolean(verification.verified && !verification.requiresReview);
    const paidBookingUpdates = {
      paymentStatus: isTrulyVerified ? 'paid' : 'pending_verification',
      method: 'banglaqr',
      trxId,
      paymentId,
      paymentRecordId: paymentId,
      bkashWallet: wallet || 'Bangla QR',
      paidAt: new Date().toISOString(),
      status: isTrulyVerified ? 'confirmed' : 'pending',
      verificationNote: isTrulyVerified ? 'Verified by Gateway' : 'Audit Pending by Accounts',
    };

    updateLocalBooking(bookingId, paidBookingUpdates);

    const paymentRecord = {
      id: paymentId,
      booking_id: bookingId,
      amount: expectedAmount,
      status: 'paid',
      method: paymentChannel,
      trxId,
      wallet: wallet || 'Bangla QR',
      created_at: new Date().toISOString(),
    };

    setCustomerPaymentHistory(current => {
      const updated = [paymentRecord, ...current.filter(p => String(p.booking_id) !== String(bookingId))];
      AsyncStorage.setItem(PAYMENTS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    setManagerPayments(current => {
      const updated = [paymentRecord, ...current.filter(p => String(p.booking_id) !== String(bookingId))];
      AsyncStorage.setItem(PAYMENTS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Multi-channel Communication Dispatch (Email, SMS, Push Notification)
    await dispatchMultiChannelNotification({
      eventType: COMMUNICATION_EVENTS.PAYMENT_SUCCESS,
      booking: { ...activeBkashBooking, ...paidBookingUpdates },
      payload: { amount: expectedAmount, trxId, wallet: wallet || 'Bangla QR' },
      preferences: notificationPreferences,
      lang,
      notifyFn: notify,
    });

    if (typeof bkashSuccessCallback === 'function') {
      bkashSuccessCallback({ trxId, paymentId, amount: expectedAmount, wallet });
    }

    setBkashModalVisible(false);
    setActiveBkashBooking(null);
    setBkashSuccessCallback(null);
  };
  const handleBkashPaymentSuccess = handleBanglaQrPaymentSuccess;

  const startCardPayment = (booking, onCompleted) => {
    if (!booking) return;
    setActiveCardBooking(booking);
    setCardSuccessCallback(() => (typeof onCompleted === 'function' ? onCompleted : null));
    setCardModalVisible(true);
  };

  const handleCardPaymentSuccess = async ({ trxId, paymentId, amount, cardBrand, cardLast4, authCode, method, channel, wallet }) => {
    if (!activeCardBooking) return;
    const bookingId = String(activeCardBooking.id);
    const expectedAmount = Number(amount) || Number(activeCardBooking.amount) || 0;
    const isDirectBank = method === 'bank_transfer' || activeCardBooking?.method === 'bank_transfer';
    const paymentChannel = isDirectBank
      ? (channel || 'Direct Bank Transfer - Eastern Bank PLC (A/C: 1271350001371)')
      : `Bank Card (${cardBrand || 'Visa'})`;

    // Server-side Transaction & Amount Verification
    const verification = await verifyBankCardPayment(paymentId, trxId, bookingId, expectedAmount, paymentChannel);
    if (!verification.ok) {
      Alert.alert(
        lang ? 'পেমেন্ট যাচাই ব্যর্থ হয়েছে' : 'Payment Verification Failed',
        verification.message || (lang ? 'সার্ভার থেকে পেমেন্ট তথ্য সঠিক পাওয়া যায়নি।' : 'Gateway failed to verify transaction.')
      );
      return;
    }

    const isCardVerified = Boolean(verification.verified && !verification.requiresReview);
    const paidBookingUpdates = {
      paymentStatus: isDirectBank ? 'pending_verification' : (isCardVerified ? 'paid' : 'pending_verification'),
      method: isDirectBank ? 'bank_transfer' : 'card',
      paymentMethod: isDirectBank ? 'bank_transfer' : 'card',
      trxId,
      paymentId,
      paymentRecordId: paymentId,
      cardBrand: isDirectBank ? 'Eastern Bank PLC' : (cardBrand || 'Visa'),
      cardLast4: isDirectBank ? '1371' : (cardLast4 || '4242'),
      authCode: authCode || (isDirectBank ? `EBL-${trxId}` : ''),
      paidAt: new Date().toISOString(),
      status: isDirectBank ? 'confirmed' : (isCardVerified ? 'confirmed' : 'pending'),
      verificationNote: isDirectBank
        ? `Direct Bank Transfer to SAIFULLAH KHAN ENTERPRISE (Eastern Bank PLC A/C: 1271350001371). TrxID: ${trxId}`
        : (isCardVerified ? 'Verified by Card Gateway' : 'Audit Pending by Accounts'),
    };

    updateLocalBooking(bookingId, paidBookingUpdates);

    const paymentRecord = {
      id: paymentId,
      booking_id: bookingId,
      amount: expectedAmount,
      status: isDirectBank ? 'pending_verification' : 'paid',
      method: paymentChannel,
      trxId,
      cardBrand: isDirectBank ? 'Eastern Bank PLC' : (cardBrand || 'Visa'),
      cardLast4: isDirectBank ? '1371' : (cardLast4 || '4242'),
      authCode: authCode || (isDirectBank ? `EBL-${trxId}` : ''),
      created_at: new Date().toISOString(),
    };

    setCustomerPaymentHistory(current => {
      const updated = [paymentRecord, ...current.filter(p => String(p.booking_id) !== String(bookingId))];
      AsyncStorage.setItem(PAYMENTS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    setManagerPayments(current => {
      const updated = [paymentRecord, ...current.filter(p => String(p.booking_id) !== String(bookingId))];
      AsyncStorage.setItem(PAYMENTS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Multi-channel Communication Dispatch (Email, SMS, Push Notification)
    await dispatchMultiChannelNotification({
      eventType: COMMUNICATION_EVENTS.PAYMENT_SUCCESS,
      booking: { ...activeCardBooking, ...paidBookingUpdates },
      payload: {
        amount: expectedAmount,
        trxId,
        wallet: isDirectBank ? 'Eastern Bank PLC (1271350001371)' : `Bank Card (${cardBrand || 'Visa'})`,
      },
      preferences: notificationPreferences,
      lang,
      notifyFn: notify,
    });

    if (typeof cardSuccessCallback === 'function') {
      cardSuccessCallback({
        trxId,
        paymentId,
        amount: expectedAmount,
        cardBrand: isDirectBank ? 'Eastern Bank PLC' : cardBrand,
        cardLast4: isDirectBank ? '1371' : cardLast4,
        authCode,
        method: isDirectBank ? 'bank_transfer' : 'card',
        status: isDirectBank ? 'pending_verification' : 'paid',
      });
    }

    setCardModalVisible(false);
    setActiveCardBooking(null);
    setCardSuccessCallback(null);
  };

  const startSslCommerzPayment = (booking, onCompleted) => {
    if (!booking) return;
    setActiveSslBooking(booking);
    setSslSuccessCallback(() => (typeof onCompleted === 'function' ? onCompleted : null));
    setSslModalVisible(true);
  };

  const handleSslCommerzPaymentSuccess = async ({ trxId, paymentId, valId, amount, channel, cardType, bankTranId }) => {
    if (!activeSslBooking) return;
    const bookingId = String(activeSslBooking.id);
    const expectedAmount = Number(amount) || Number(activeSslBooking.amount) || 0;
    const paymentChannel = channel || 'SSLCOMMERZ Multi-Channel';

    // Server-side Transaction & Amount Verification
    const verification = await verifySslCommerzPayment(valId || paymentId, trxId, bookingId, expectedAmount, paymentChannel);
    if (!verification.ok) {
      Alert.alert(
        lang ? 'এসএসএল কমার্জ পেমেন্ট যাচাই ব্যর্থ হয়েছে' : 'SSLCOMMERZ Payment Verification Failed',
        verification.message || (lang ? 'সার্ভার থেকে পেমেন্ট তথ্য সঠিক পাওয়া যায়নি।' : 'Gateway failed to verify transaction.')
      );
      return;
    }

    const isSslVerified = Boolean(verification.verified && !verification.requiresReview);
    const paidBookingUpdates = {
      paymentStatus: isSslVerified ? 'paid' : 'pending_verification',
      method: 'sslcommerz',
      trxId,
      valId: valId || '',
      paymentId: paymentId || valId,
      paymentRecordId: paymentId || valId,
      cardType: cardType || '',
      bankTranId: bankTranId || '',
      paidAt: new Date().toISOString(),
      status: isSslVerified ? 'confirmed' : 'pending',
      verificationNote: isSslVerified ? 'Verified by SSLCOMMERZ Gateway' : 'Audit Pending by Accounts',
    };

    updateLocalBooking(bookingId, paidBookingUpdates);

    const paymentRecord = {
      id: paymentId || valId || `SSLC-${Date.now()}`,
      booking_id: bookingId,
      amount: expectedAmount,
      status: 'paid',
      method: `SSLCOMMERZ (${cardType || channel || 'Multi-Channel'})`,
      trxId,
      valId: valId || '',
      cardType: cardType || '',
      bankTranId: bankTranId || '',
      created_at: new Date().toISOString(),
    };

    setCustomerPaymentHistory(current => {
      const updated = [paymentRecord, ...current.filter(p => String(p.booking_id) !== String(bookingId))];
      AsyncStorage.setItem(PAYMENTS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    setManagerPayments(current => {
      const updated = [paymentRecord, ...current.filter(p => String(p.booking_id) !== String(bookingId))];
      AsyncStorage.setItem(PAYMENTS_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Multi-channel Communication Dispatch (Email, SMS, Push Notification)
    await dispatchMultiChannelNotification({
      eventType: COMMUNICATION_EVENTS.PAYMENT_SUCCESS,
      booking: { ...activeSslBooking, ...paidBookingUpdates },
      payload: { amount: expectedAmount, trxId, wallet: `SSLCOMMERZ (${channel || 'All-in-One'})` },
      preferences: notificationPreferences,
      lang,
      notifyFn: notify,
    });

    if (typeof sslSuccessCallback === 'function') {
      sslSuccessCallback({ trxId, paymentId, valId, amount: expectedAmount, channel, cardType, bankTranId });
    }

    setSslModalVisible(false);
    setActiveSslBooking(null);
    setSslSuccessCallback(null);
  };

  const verifyBookingPayment = async booking => {
    if (!booking) return;
    if (booking.paymentStatus === 'pay_after_service' || booking.paidMethod === 'pay_after_service' || booking.method === 'pay_after_service') {
      Alert.alert(
        lang ? 'সার্ভিস পরবর্তী পেমেন্ট' : 'Payment After Service',
        lang
          ? `বুকিং #${booking.id} এর পেমেন্ট মেথড: সার্ভিস সমাপ্তির পরে পেমেন্ট (Pay After Service)। প্রোটোকল সার্ভিস সম্পন্ন হওয়ার পর অফিসার গ্রাহকের নিকট থেকে বিল সংগ্রহ করবেন।`
          : `Booking #${booking.id} is set to 'Payment After Service'. Officer will collect payment upon protocol completion.`
      );
      return;
    }
    if (booking.paymentStatus !== 'paid') {
      if (booking.method === 'sslcommerz') {
        startSslCommerzPayment(booking);
      } else if (booking.method === 'card') {
        startCardPayment(booking);
      } else {
        startBanglaQrPayment(booking);
      }
      return;
    }
    const isSsl = String(booking.method || '').toLowerCase().includes('ssl');
    const isCard = String(booking.method || '').toLowerCase().includes('card');
    const verif = isSsl
      ? await verifySslCommerzPayment(
          booking.valId || booking.paymentId || booking.paymentRecordId,
          booking.trxId,
          booking.id,
          booking.amount
        )
      : isCard
      ? await verifyBankCardPayment(
          booking.paymentId || booking.paymentRecordId,
          booking.trxId,
          booking.id,
          booking.amount
        )
      : await verifyBanglaQrPayment(
          booking.paymentId || booking.paymentRecordId,
          booking.trxId,
          booking.id,
          booking.amount
        );
    Alert.alert(
      lang ? 'পেমেন্ট স্ট্যাটাস ও সার্ভার যাচাই' : 'Payment Status & Server Verification',
      verif.ok
        ? (lang
            ? `বুকিং #${booking.id} সার্ভার কর্তৃক যাচাইকৃত পেইড (Verified Paid)। TrxID: ${booking.trxId || booking.paymentRecordId || 'Verified'}`
            : `Booking #${booking.id} is verified as Paid by server. TrxID: ${booking.trxId || booking.paymentRecordId || 'Verified'}`)
        : (lang ? `যাচাইকরণে গরমিল: ${verif.message}` : `Verification Discrepancy: ${verif.message}`)
    );
  };

  const validateFlightDetails = (overrides = {}) => {
    if (!wiz) return false;
    const isOther = Boolean(wiz.bookingForSomeoneElse || overrides.bookingForSomeoneElse);
    const effectiveName = overrides.passengerName?.trim() || overrides.name?.trim() || (isOther ? (wiz.passengerName?.trim() || wiz.name?.trim()) : wiz.name?.trim());
    const effectivePhone = overrides.passengerPhone?.trim() || overrides.phone?.trim() || (isOther ? (wiz.passengerPhone?.trim() || wiz.phone?.trim()) : wiz.phone?.trim());
    const effectiveEmail = overrides.passengerEmail?.trim() || overrides.email?.trim() || wiz.email?.trim();

    if (effectiveName && !isValidPassengerName(effectiveName)) {
      setWiz(current => ({ ...current, step: 1 }));
      Alert.alert(lang ? 'ভুল নাম' : 'Invalid Name', lang ? 'সঠিক নাম লিখুন (কমপক্ষে ২ অক্ষর)' : 'Please enter a valid name (at least 2 letters)');
      return false;
    }
    if (effectivePhone && !isValidMobileNumber(effectivePhone)) {
      setWiz(current => ({ ...current, step: 1 }));
      Alert.alert(lang ? 'ভুল মোবাইল নম্বর' : 'Invalid Phone', lang ? 'সঠিক মোবাইল নম্বর দিন' : t('invalidPhone'));
      return false;
    }
    if (effectiveEmail && !isValidEmailAddress(effectiveEmail)) {
      setWiz(current => ({ ...current, step: 1 }));
      Alert.alert(lang ? 'ভুল ইমেইল' : 'Invalid Email', lang ? 'সঠিক ইমেইল অ্যাড্রেস দিন (যেমন: name@example.com)' : t('invalidEmail'));
      return false;
    }
    return true;
  };

  const confirm = async (customIdOrOverrides, extraOverrides = {}) => {
    const overrides = typeof customIdOrOverrides === 'object' && customIdOrOverrides !== null
      ? customIdOrOverrides
      : extraOverrides;
    const customId = typeof customIdOrOverrides === 'string'
      ? customIdOrOverrides
      : overrides.id || overrides.confirmedId || null;

    if (!validateFlightDetails(overrides)) return null;
    const pricingDetails = calculateBookingPricing(wiz, addonCatalog, pricingConfig);
    const amount = pricingDetails.total;
    const quoteRequired = amount == null;
    const flight = {
      airline: (overrides.flight?.airline || overrides.airline || wiz.airline || '').trim() || null,
      number: (overrides.flight?.number || overrides.fno || wiz.fno || '').trim().toUpperCase() || null,
      ticket_number: (wiz.ticketNumber || '').trim() || null,
      date: overrides.flight?.date || overrides.date || wiz.date || '',
      time: overrides.flight?.time || overrides.time || wiz.time || '',
      origin: (wiz.origin || '').trim() || null,
      destination: (wiz.destination || '').trim() || null,
      passport_number: (wiz.passportNumber || '').trim() || null,
      booking_reference: (wiz.pnr || '').trim() || null,
      additional_information: (wiz.flightNotes || '').trim() || null,
    };
    const passengers = {
      adults: wiz.a || 1,
      children: wiz.c || 0,
      elderly: wiz.e || 0,
      total: (wiz.a || 1) + (wiz.c || 0) + (wiz.e || 0),
    };
    const passengerDetails = (wiz.passengerDetails || []).map(
      ({ type, name, assistanceNotes }) => ({
        type,
        name: (name || '').trim(),
        assistance_notes: (assistanceNotes || '').trim() || null,
      })
    );
    const candidateName = (overrides.passengerName || overrides.name || wiz.passengerName || wiz.name || '').trim();
    const candidatePhone = (overrides.passengerPhone || overrides.phone || wiz.passengerPhone || wiz.phone || '').trim();
    const candidateEmail = (overrides.passengerEmail || overrides.email || wiz.passengerEmail || wiz.email || '').trim();

    const passengerInformation = {
      name: candidateName,
      gender: overrides.gender || wiz.gender || null,
      nationality: (overrides.nationality || wiz.nationality || '').trim() || null,
      phone: candidatePhone,
      email: candidateEmail || null,
      date_of_birth: (overrides.dateOfBirth || wiz.dateOfBirth || '').trim() || null,
      passport_number: (overrides.passportNumber || wiz.passportNumber || '').trim() || null,
      remarks: (overrides.remarks || wiz.remarks || '').trim() || null,
    };
    const addonDetails = Object.fromEntries(
      (wiz.addons || []).map(id => [id, wiz.addonDetails[id]])
    );

    // Anti-Fraud: Verify Phone Blacklist and Rate Limiting
    if (candidatePhone) {
      const blCheck = await isEntityBlacklisted({ phone: candidatePhone });
      if (blCheck.blocked) {
        const errMsg = lang
          ? `⚠️ দুঃখিত, (${candidatePhone}) এই মোবাইল নম্বরটি নিরাপত্তা নীতি লঙ্ঘনের কারণে সাময়িক স্থগিত রয়েছে। নতুন বুকিং নেওয়া সম্ভব নয়। (কারণ: ${blCheck.reason})`
          : `⚠️ Sorry, (${candidatePhone}) is suspended due to security violations. Booking cannot be processed. (Reason: ${blCheck.reason})`;
        if (Platform.OS === 'web') {
          window.alert(errMsg);
        } else {
          Alert.alert('Security Block', errMsg);
        }
        return;
      }

      const rateLimit = await checkBookingRateLimit(candidatePhone, 3, 30);
      if (!rateLimit.allowed) {
        const errMsg = lang ? rateLimit.message : 'Too many booking attempts. Please try again after 30 minutes.';
        if (Platform.OS === 'web') {
          window.alert(errMsg);
        } else {
          Alert.alert('Rate Limit Exceeded', errMsg);
        }
        return;
      }
    }

    const bookingCode = customId || wiz.confirmedId || `FC-${Math.floor(10000 + Math.random() * 90000)}`;
    let serverBooking = null;

    if (customerApiConfigured && customerSession?.token && customerSession.token !== 'demo-customer-token') {
      try {
        const result = await createBooking({
          ...wiz,
          remarks: (wiz.remarks || '').trim() || null,
          passenger_information: passengerInformation,
          flight,
          passengers,
          passenger_details: passengerDetails,
          addon_details: addonDetails,
          staffing_context: buildStaffingContext(wiz),
          service_id: wiz.svc?.id || null,
          service_category: wiz.dir === 'arr' ? 'arrival' : 'departure',
          amount,
          pricing_status: quoteRequired ? 'quote_required' : 'priced',
        });
        if (result.ok && result.booking) {
          serverBooking = result.booking;
        }
      } catch (err) {
        console.warn('Backend createBooking error, falling back locally', err);
      }
    }

    const payableAmount = serverBooking?.amount != null ? Number(serverBooking.amount) : amount;
    const bookingQuoteRequired =
      quoteRequired || payableAmount == null || serverBooking?.pricing_status === 'quote_required';

    const chosenPaymentMethod = overrides.paidMethod || overrides.method || wiz.paidMethod || wiz.method || 'banglaqr';
    const isPayAfterService = chosenPaymentMethod === 'pay_after_service' || overrides.paymentStatus === 'pay_after_service';
    const isPaid = !isPayAfterService && (overrides.paymentStatus === 'paid' || chosenPaymentMethod === 'banglaqr' || chosenPaymentMethod === 'bkash');
    const trxId = overrides.trxId || (isPayAfterService ? `PAS-${bookingCode}` : null);

    const booking = {
      ...wiz,
      ...overrides,
      ...(serverBooking || {}),
      id: serverBooking?.id ? String(serverBooking.id) : bookingCode,
      bookingId: serverBooking?.id ? String(serverBooking.id) : bookingCode,
      trxId: trxId || serverBooking?.trxId || null,
      customer: candidateName,
      passengerName: candidateName,
      name: candidateName,
      phone: candidatePhone,
      passengerPhone: candidatePhone,
      email: candidateEmail,
      passengerEmail: candidateEmail,
      flight,
      fno: flight.number,
      flightNumber: flight.number,
      airline: flight.airline,
      date: flight.date,
      time: flight.time,
      airport: wiz.airport || 'DAC',
      airport_code: wiz.airport || 'DAC',
      passengers,
      passenger_information: passengerInformation,
      passenger_details: passengerDetails,
      addon_details: addonDetails,
      remarks: (wiz.remarks || '').trim() || null,
      amount: payableAmount,
      pricingBreakdown: pricingDetails,
      pricingStatus: bookingQuoteRequired ? 'quote_required' : 'priced',
      status: serverBooking?.status || 'confirmed',
      paymentStatus: bookingQuoteRequired
        ? 'quote_required'
        : isPayAfterService
        ? 'pay_after_service'
        : isPaid
        ? 'paid'
        : 'pending',
      method: chosenPaymentMethod,
      source: 'website_online',
      sourceLabel: 'ওয়েবসাইট অনলাইন বুকিং',
      isOfflineManual: false,
      staff: 'Unassigned',
      paymentId: overrides.paymentId || serverBooking?.paymentId || `PAY-${bookingCode}`,
      paymentUrl: null,
      cancelled: false,
      can_cancel: true,
      cancellation_eligible: true,
      cancellation_policy_summary: lang ? 'ফ্লাইটের ২৪ ঘণ্টা পূর্ব পর্যন্ত বাতিলযোগ্য।' : 'Cancellable up to 24 hours before flight.',
      created_at: new Date().toISOString(),
      workflow: DEFAULT_BOOKING_WORKFLOW,
      statusHistory: [
        { status: 'booked', label: 'Booked', created_at: new Date().toLocaleTimeString() },
        { status: 'confirmed', label: 'Confirmed', created_at: new Date().toLocaleTimeString() },
      ],
    };

    setBookings(current => {
      const updated = [booking, ...current.filter(b => String(b.id) !== String(booking.id))];
      AsyncStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(updated)).catch(() => {});
      if (customerSession?.user?.id || profile?.phone || profile?.email) {
        const cId = customerSession?.user?.id || customerSession?.user?.email || profile?.phone || profile?.email;
        if (wiz?.rewardPointsUsed) {
          redeemPointsForBooking(cId, wiz.rewardPointsUsed, booking.id).catch(() => {});
        }
        awardBookingPoints(cId, booking.id, payableAmount).catch(() => {});
      }
      return updated;
    });

    setDeviceCreatedBookingIds(prev => {
      const next = Array.from(new Set([...(prev || []), String(booking.id)]));
      AsyncStorage.setItem(DEVICE_BOOKINGS_STORAGE, JSON.stringify(next)).catch(() => {});
      return next;
    });

    // 1. Guaranteed Cloud Firestore Persistence (Works for Guest and Authenticated Bookings)
    try {
      const cloudRes = await saveBookingToFirestore(booking);
      console.log(`[Cloud Firestore] Booking #${booking.id} saved to Cloud:`, cloudRes);
    } catch (saveErr) {
      console.warn('[Cloud Firestore] Booking save warning:', saveErr);
    }

    if (payableAmount != null) {
      const paymentRecord = {
        id: booking.paymentId || `PAY-${booking.id}`,
        booking_id: booking.id,
        amount: payableAmount,
        status: isPayAfterService ? 'pay_after_service' : (booking.paymentStatus || 'paid'),
        method: chosenPaymentMethod === 'pay_after_service'
          ? (lang ? 'সার্ভিস সমাপ্তির পরে পেমেন্ট' : 'Payment After Service')
          : chosenPaymentMethod === 'banglaqr'
          ? 'Bangla QR (বাংলা কিউআর)'
          : chosenPaymentMethod === 'bkash'
          ? 'bKash'
          : chosenPaymentMethod === 'nagad'
          ? 'Nagad'
          : 'Card',
        trxId: booking.trxId || null,
        created_at: new Date().toISOString(),
      };
      setCustomerPaymentHistory(current => {
        const updated = [paymentRecord, ...current.filter(p => String(p.booking_id) !== String(booking.id))];
        AsyncStorage.setItem(PAYMENTS_STORAGE, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    }

    const bookerName = wiz.bookingForSomeoneElse ? wiz.name : (wiz.passengerName || wiz.name);
    const bookerPhone = wiz.phone || wiz.passengerPhone;
    const bookerEmail = wiz.email;
    setProfile(current => {
      const updated = {
        ...current,
        name: current.name || bookerName || '',
        phone: current.phone || bookerPhone || '',
        email: current.email || bookerEmail || '',
      };
      AsyncStorage.setItem(PROFILE_STORAGE, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    notify(
      lang ? 'বুকিং নিশ্চিত হয়েছে!' : 'Booking Confirmed!',
      `${booking.id}${flight.number ? ` · ${flight.number}` : ''}`,
      'booking'
    );

    // Multi-channel Communication Dispatch (Email, SMS, Push Notification)
    dispatchMultiChannelNotification({
      eventType: COMMUNICATION_EVENTS.BOOKING_CONFIRMED,
      booking,
      payload: { amount: payableAmount },
      preferences: notificationPreferences,
      lang,
      notifyFn: notify,
    });

    if (booking.paymentStatus === 'paid') {
      dispatchMultiChannelNotification({
        eventType: COMMUNICATION_EVENTS.PAYMENT_SUCCESS,
        booking,
        payload: { amount: payableAmount, trxId: booking.trxId || `BK9X${bookingCode}` },
        preferences: notificationPreferences,
        lang,
        notifyFn: notify,
      });
    }

    // 4-Party Universal Step Notification (Passenger, Officer, Manager, Super Admin)
    // Cloud Firestore REST broadcast guarantees Manager & Admin receive notifications immediately
    try {
      const res = await dispatchBookingLifecycleNotifications({
        stage: isPayAfterService ? 'pending' : (booking.paymentStatus === 'paid' ? 'confirmed' : 'pending'),
        booking,
        extra: { amount: payableAmount },
        lang,
      });
      if (res?.notifications) {
        setNotifications(curr => [
          res.notifications.passenger,
          res.notifications.officer,
          res.notifications.manager,
          res.notifications.superAdmin,
          ...curr,
        ]);
      }
    } catch (notifErr) {
      console.warn('Booking lifecycle notification dispatch notice:', notifErr);
    }

    return booking;
  };

  const advanceBooking = () => {
    if (wiz.step === 1) {
      if (!validateFlightDetails()) return;
      setWiz(current => ({ ...current, step: 2 }));
      return;
    }
    if (wiz.step === 2) {
      setStaffAllocation(null);
      setStaffAllocationFailed(false);
      if (customerApiConfigured) {
        setStaffAllocationLoading(true);
        quoteProtocolStaff(buildStaffingContext(wiz))
          .then(result => {
            if (result.ok) setStaffAllocation(result.data);
            else setStaffAllocationFailed(true);
          })
          .catch(() => setStaffAllocationFailed(true))
          .finally(() => setStaffAllocationLoading(false));
      }
      setWiz(current => ({ ...current, step: 3 }));
      return;
    }
    confirm();
  };

  // ---------------------------------------------------------------------------
  // ROLE-BASED NOTIFICATION PRIVACY & SCOPING
  // Rule: "সাধারন মানুষরা এসব নোটিফিকেশন দেখতে পবেনা। শুধু মাত্র ম্যানেজার ও সুপার এডমিন এটা দেখতে পাবে। সাধারন মানুষরা শুধুমাত্র তারটা দেখতে পাবে"
  // ---------------------------------------------------------------------------
  const currentRole = tab === 'admin'
    ? 'super_admin'
    : tab === 'manager'
    ? (managerSession?.user?.role === 'admin' ? 'super_admin' : 'manager')
    : tab === 'staff'
    ? 'staff'
    : customerSession?.user?.role === 'admin'
    ? 'super_admin'
    : customerSession?.user?.role === 'manager'
    ? 'manager'
    : customerSession?.user?.role === 'staff'
    ? 'staff'
    : customerSession?.user
    ? 'customer'
    : 'guest';

  // Candidate booking IDs strictly belonging to THIS user/guest (NOT everyone else's bookings!)
  const myCandidateBookingIds = useMemo(() => {
    // If Manager or Super Admin, they have full oversight of all bookings
    if (currentRole === 'manager' || currentRole === 'super_admin') {
      return (bookings || []).map(b => String(b.id || b.bookingId || '')).filter(Boolean);
    }

    const ids = new Set((deviceCreatedBookingIds || []).map(id => String(id).trim().toUpperCase()));

    if (customerSession?.user) {
      const uId = String(customerSession.user.id || customerSession.user.uid || '').trim();
      const uEmail = String(customerSession.user.email || '').trim().toLowerCase();
      const uPhone = String(customerSession.user.phone || '').replace(/\D/g, '');

      (bookings || []).forEach(b => {
        const bUid = String(b.customerId || b.userId || '').trim();
        const bEmail = String(b.email || b.contactEmail || b.customer?.email || '').trim().toLowerCase();
        const bPhone = String(b.phone || b.contactPhone || b.customer?.phone || '').replace(/\D/g, '');
        const bId = String(b.id || b.bookingId || '').trim().toUpperCase();

        if (
          (uId && bUid && bUid === uId) ||
          (uEmail && bEmail && bEmail === uEmail) ||
          (uPhone && bPhone && bPhone === uPhone)
        ) {
          if (bId) ids.add(bId);
        }
      });
    }

    return Array.from(ids);
  }, [bookings, customerSession, currentRole, deviceCreatedBookingIds]);

  const scopedNotifications = useMemo(() => {
    return filterNotificationsForRole(notifications, {
      userRole: currentRole,
      customerUser: customerSession?.user || profile,
      currentStaff: null,
      localBookingIds: myCandidateBookingIds,
    });
  }, [notifications, currentRole, customerSession, profile, myCandidateBookingIds]);

  const managerNotifications = useMemo(() => {
    return filterNotificationsForRole(notifications, {
      userRole: 'manager',
      localBookingIds: (bookings || []).map(b => String(b.id || b.bookingId || '')).filter(Boolean),
    });
  }, [notifications, bookings]);

  // Bookings belonging specifically to this user (for My Bookings tab)
  const myUserBookings = useMemo(() => {
    if (currentRole === 'manager' || currentRole === 'super_admin') {
      return bookings || [];
    }

    const myIds = new Set((deviceCreatedBookingIds || []).map(id => String(id).trim().toUpperCase()));

    if (customerSession?.user) {
      const uId = String(customerSession.user.id || customerSession.user.uid || '').trim();
      const uEmail = String(customerSession.user.email || '').trim().toLowerCase();
      const uPhone = String(customerSession.user.phone || '').replace(/\D/g, '');

      return (bookings || []).filter(b => {
        const bUid = String(b.customerId || b.userId || '').trim();
        const bEmail = String(b.email || b.contactEmail || b.customer?.email || '').trim().toLowerCase();
        const bPhone = String(b.phone || b.contactPhone || b.customer?.phone || '').replace(/\D/g, '');
        const bId = String(b.id || b.bookingId || '').trim().toUpperCase();

        return (
          myIds.has(bId) ||
          (uId && bUid && bUid === uId) ||
          (uEmail && bEmail && bEmail === uEmail) ||
          (uPhone && bPhone && bPhone === uPhone)
        );
      });
    }

    // Unauthenticated guest: only show bookings created on this device
    return (bookings || []).filter(b => myIds.has(String(b.id || b.bookingId || '').trim().toUpperCase()));
  }, [bookings, customerSession, currentRole, deviceCreatedBookingIds]);

  if (subPage === 'additional_services') {
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={[s.frame, s.frame3D, { maxWidth: '100%', width: '100%', marginVertical: 0 }]}>
          <AdditionalServicesScreen
            lang={lang}
            t={t}
            pagePadding={pagePadding}
            responsive={responsive}
            selectedAddons={subPageParams.selectedAddons || []}
            setSelectedAddons={subPageParams.setSelectedAddons}
            addonDetails={subPageParams.addonDetails || {}}
            setAddonDetails={subPageParams.setAddonDetails}
            onProceedBooking={(selectedAddons, addonDetails, options = {}) => {
              setSubPage(null);
              if (subPageParams.onProceedBooking) {
                subPageParams.onProceedBooking(selectedAddons, addonDetails, options);
              } else {
                const isOnly = Boolean(options?.onlyAddons);
                startBooking(
                  null,
                  selectedAddons,
                  isOnly ? 'addons_only' : null,
                  'arr',
                  { addonDetails, onlyAddons: isOnly }
                );
              }
            }}
            flightNumber={subPageParams.flightNumber || ''}
            serviceDate={subPageParams.serviceDate || ''}
            onBack={handleBack}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (subPage === 'compare_packages') {
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={[s.frame, s.frame3D, { maxWidth: '100%', width: '100%', marginVertical: 0 }]}>
          <ComparePackagesScreen
            lang={lang}
            selectedPackage={subPageParams.selectedPackage || 'business'}
            onSelectPackage={pkgId => {
              if (subPageParams.onSelectPackage) {
                subPageParams.onSelectPackage(pkgId);
              }
              handleBack();
            }}
            onBack={handleBack}
            pagePadding={pagePadding}
            navigateToSubPage={navigateToSubPage}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (subPage === 'protocol_ranks') {
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={[s.frame, s.frame3D, { maxWidth: '100%', width: '100%', marginVertical: 0 }]}>
          <ProtocolRanksScreen
            lang={lang}
            currentOfficer={subPageParams.currentOfficer}
            currentRankLevel={subPageParams.currentRankLevel}
            managerSession={managerSession}
            onBookOfficer={handleBookOfficerFromProfile}
            onBack={handleBack}
            pagePadding={pagePadding}
            navigateToSubPage={navigateToSubPage}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (subPage === 'officer_profile') {
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={[s.frame, s.frame3D, { maxWidth: '100%', width: '100%', marginVertical: 0 }]}>
          <OfficerProfileScreen
            lang={lang}
            officerId={subPageParams.officerId || scannedOfficerId || 'st-1'}
            onBookOfficer={handleBookOfficerFromProfile}
            onBack={handleBack}
            pagePadding={pagePadding}
            navigateToSubPage={navigateToSubPage}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (tab === 'manager') {
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={[s.frame, s.frame3D, { maxWidth: '100%', width: '100%', marginVertical: 0 }]}>
          <ErrorBoundary
            lang={lang}
            onReset={() => setManagerSection('dashboard')}
            onHome={() => setTab('home')}
          >
            <ManagerPanel
            staffRoster={staffRoster}
            setStaffRoster={setStaffRoster}
            pagePadding={pagePadding}
            lang={lang}
            t={t}
            responsive={responsive}
            bookings={bookings}
            setBookings={setBookings}
            notifications={managerNotifications}
            setNotifications={setNotifications}
            sendNotification={sendNotification}
            customerPaymentHistory={customerPaymentHistory}
            setCustomerPaymentHistory={setCustomerPaymentHistory}
            managerSession={managerSession}
            setManagerSession={setManagerSession}
            managerEmail={managerEmail}
            setManagerEmail={setManagerEmail}
            managerPassword={managerPassword}
            setManagerPassword={setManagerPassword}
            managerLoginError={managerLoginError}
            managerBusy={managerBusy}
            managerSection={managerSection}
            setManagerSection={setManagerSection}
            managerWorkflow={managerWorkflow}
            managerWorkflowLoading={managerWorkflowLoading}
            managerWorkflowSaving={managerWorkflowSaving}
            managerWorkflowError={managerWorkflowError}
            managerWorkflowNotice={managerWorkflowNotice}
            managerServices={managerServices}
            managerServicesAirport={managerServicesAirport}
            managerServicesLoading={managerServicesLoading}
            managerServicesSaving={managerServicesSaving}
            managerServicesError={managerServicesError}
            managerServicesNotice={managerServicesNotice}
            managerAddons={managerAddons}
            managerAddonsAirport={managerAddonsAirport}
            managerAddonsLoading={managerAddonsLoading}
            managerAddonsSaving={managerAddonsSaving}
            managerAddonsError={managerAddonsError}
            managerAddonsNotice={managerAddonsNotice}
            managerStaffingRules={managerStaffingRules}
            managerRulesLoading={managerRulesLoading}
            managerRulesSaving={managerRulesSaving}
            managerRulesError={managerRulesError}
            managerRulesNotice={managerRulesNotice}
            managerPayments={managerPayments}
            managerPaymentsSummary={managerPaymentsSummary}
            managerPaymentsLoading={managerPaymentsLoading}
            managerPaymentsError={managerPaymentsError}
            managerPaymentsNotice={managerPaymentsNotice}
            managerPaymentFilter={managerPaymentFilter}
            setManagerPaymentFilter={setManagerPaymentFilter}
            managerPaymentSearch={managerPaymentSearch}
            setManagerPaymentSearch={setManagerPaymentSearch}
            refundPaymentId={refundPaymentId}
            setRefundPaymentId={setRefundPaymentId}
            refundAmount={refundAmount}
            setRefundAmount={setRefundAmount}
            refundReason={refundReason}
            setRefundReason={setRefundReason}
            refundSaving={refundSaving}
            managerApiConfigured={managerApiConfigured}
            submitManagerLogin={submitManagerLogin}
            loadManagerServices={loadManagerServices}
            updateManagerService={updateManagerService}
            updateManagerServiceText={updateManagerServiceText}
            updateManagerServiceStep={updateManagerServiceStep}
            addManagerService={addManagerService}
            addManagerServiceStep={addManagerServiceStep}
            removeManagerServiceStep={removeManagerServiceStep}
            removeManagerService={removeManagerService}
            saveManagerServiceCatalog={saveManagerServiceCatalog}
            setManagerServices={setManagerServices}
            serviceCatalog={serviceCatalog}
            setServiceCatalog={setServiceCatalog}
            addManagerServiceFull={addManagerServiceFull}
            updateManagerServiceFull={updateManagerServiceFull}
            deleteManagerServiceFull={deleteManagerServiceFull}
            toggleManagerServiceStatus={toggleManagerServiceStatus}
            resetManagerServicesToDefault={resetManagerServicesToDefault}
            loadManagerAddons={loadManagerAddons}
            updateManagerAddon={updateManagerAddon}
            updateManagerAddonText={updateManagerAddonText}
            updateManagerAddonVehiclePrice={updateManagerAddonVehiclePrice}
            toggleManagerAddonVehicle={toggleManagerAddonVehicle}
            toggleManagerMedicalOption={toggleManagerMedicalOption}
            saveManagerAddonCatalog={saveManagerAddonCatalog}
            loadManagerPayments={loadManagerPayments}
            submitManagerRefund={submitManagerRefund}
            updateManagerWorkflowStage={updateManagerWorkflowStage}
            updateManagerWorkflowLabel={updateManagerWorkflowLabel}
            addManagerWorkflowStage={addManagerWorkflowStage}
            removeManagerWorkflowStage={removeManagerWorkflowStage}
            moveManagerWorkflowStage={moveManagerWorkflowStage}
            saveManagerWorkflow={saveManagerWorkflow}
            updateManagerRule={updateManagerRule}
            addManagerRule={addManagerRule}
            removeManagerRule={removeManagerRule}
            saveManagerRules={saveManagerRules}
            openManagerSection={openManagerSection}
            handleBack={handleBack}
            managedAirports={managedAirports}
            setManagedAirports={setManagedAirports}
            addAirport={addAirport}
            updateAirport={updateAirport}
            deleteAirport={deleteAirport}
            toggleAirportStatus={toggleAirportStatus}
            resetAirports={resetAirports}
            pricingConfig={pricingConfig}
            setPricingConfig={setPricingConfig}
            updatePricingConfig={updatePricingConfig}
            resetPricingConfig={resetPricingConfig}
            onUpdateBooking={handleAdminUpdateBooking}
            staffRoster={staffRoster}
            setStaffRoster={setStaffRoster}
            onAddStaff={addStaffMember}
            onUpdateStaff={updateStaffMember}
            onToggleStaffDuty={toggleStaffDutyStatus}
            onToggleStaffActive={toggleStaffActiveStatus}
            onDeleteStaff={deleteStaffMember}
          />
        </ErrorBoundary>
      </View>
      </SafeAreaView>
    );
  }

  if (tab === 'staff') {
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={[s.frame, s.frame3D, { maxWidth: '100%', width: '100%', marginVertical: 0 }]}>
          <ErrorBoundary
            lang={lang}
            onReset={() => setTab('staff')}
            onHome={() => setTab('home')}
          >
            <StaffPanel
              pagePadding={pagePadding}
              lang={lang}
              t={t}
              responsive={responsive}
              airport={airport}
              staffSession={staffSession}
              setStaffSession={setStaffSession}
              staffEmail={staffEmail}
              setStaffEmail={setStaffEmail}
              staffPassword={staffPassword}
              setStaffPassword={setStaffPassword}
              staffLoginError={staffLoginError}
              staffBusy={staffBusy}
              staffLoading={staffLoading}
              setStaffLoading={setStaffLoading}
              staffAssignments={staffAssignments}
              setStaffAssignments={setStaffAssignments}
              staffFilter={staffFilter}
              setStaffFilter={setStaffFilter}
              staffActionError={staffActionError}
              setStaffActionError={setStaffActionError}
              staffApiConfigured={staffApiConfigured}
              submitStaffLogin={submitStaffLogin}
              updateStaffWork={updateStaffWork}
              handleBack={handleBack}
              bookings={bookings}
              onUpdateBooking={handleAdminUpdateBooking}
              staffRoster={staffRoster}
              setStaffRoster={setStaffRoster}
              onToggleStaffDuty={toggleStaffDutyStatus}
            />
          </ErrorBoundary>
        </View>
      </SafeAreaView>
    );
  }

  if (detail) {
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={[s.frame, s.frame3D, { maxWidth: '100%', width: '100%', marginVertical: 0 }]}>
          <DetailScreen
            detail={detail}
            setDetail={setDetail}
            pagePadding={pagePadding}
            lang={lang}
            t={t}
            startBooking={startBooking}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (wiz) {
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={[s.frame, s.frame3D, { maxWidth: '100%', width: '100%', marginVertical: 0 }]}>
          <WizardScreen
            wiz={wiz}
            setWiz={setWiz}
            pagePadding={pagePadding}
            lang={lang}
            setLang={setLang}
            customerSession={customerSession}
            t={t}
            responsive={responsive}
            addonCatalog={addonCatalog}
            pricingConfig={pricingConfig}
            staffAllocation={staffAllocation}
            staffAllocationLoading={staffAllocationLoading}
            staffAllocationFailed={staffAllocationFailed}
            handleBack={handleBack}
            advanceBooking={advanceBooking}
            confirm={confirm}
            setTab={setTab}
            startBkashPayment={startBkashPayment}
            startCardPayment={startCardPayment}
            startSslCommerzPayment={startSslCommerzPayment}
          />
        </View>
        <BanglaQrPaymentModal
          visible={bkashModalVisible}
          booking={activeBkashBooking}
          onClose={() => {
            setBkashModalVisible(false);
            setActiveBkashBooking(null);
            setBkashSuccessCallback(null);
          }}
          onSuccess={handleBanglaQrPaymentSuccess}
          lang={lang}
        />
        <BankCardPaymentModal
          visible={cardModalVisible}
          booking={activeCardBooking}
          initialMode={activeCardBooking?.method === 'card' ? 'card' : 'bank_transfer'}
          onClose={() => {
            setCardModalVisible(false);
            setActiveCardBooking(null);
            setCardSuccessCallback(null);
          }}
          onSuccess={handleCardPaymentSuccess}
          lang={lang}
        />
        <SslCommerzPaymentModal
          visible={sslModalVisible}
          booking={activeSslBooking}
          onClose={() => {
            setSslModalVisible(false);
            setActiveSslBooking(null);
            setSslSuccessCallback(null);
          }}
          onSuccess={handleSslCommerzPaymentSuccess}
          lang={lang}
        />
        <OfficerProfileModal
          visible={showOfficerProfileModal}
          officerId={scannedOfficerId || 'st-1'}
          lang={lang}
          onClose={() => {
            setShowOfficerProfileModal(false);
            setScannedOfficerId(null);
          }}
          onBookOfficer={handleBookOfficerFromProfile}
        />
        {/* Flight Care Family Member Digital ID Pass Modal (QR Scanned / Web View) */}
        <FamilyMemberIdCardModal
          visible={showFamilyMemberIdCard}
          member={scannedFamilyMember}
          onClose={() => {
            setShowFamilyMemberIdCard(false);
            setScannedFamilyMember(null);
          }}
          lang={lang}
        />

        {/* Official Money Receipt Modal (Deep Link & Passenger Voucher) */}
        <BookingInvoiceModal
          visible={showReceiptModal}
          booking={receiptModalBooking}
          onClose={() => setShowReceiptModal(false)}
          lang={lang}
        />
        {/* Verified Passenger Service Completion Review Popup (Auto-Prompt) */}
        <ServiceCompletionReviewModal
          visible={!!completionReviewBooking}
          booking={completionReviewBooking}
          onClose={handleCloseReviewModal}
          onReviewSubmitted={handleReviewSubmitted}
          lang={lang}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View
        style={[
          s.frame,
          s.frame3D,
          {
            maxWidth: '100%',
            width: '100%',
            paddingHorizontal: 0,
            marginVertical: 0,
          },
        ]}
      >
        {/* Desktop Top Header for other tabs (when not on home tab, since HomeScreen handles its own) */}
        {responsive.isWide && tab !== 'home' && (
          <DesktopHeader
            lang={lang}
            setLang={setLang}
            customerSession={customerSession}
            setTab={setTab}
            tab={tab}
            setWiz={setWiz}
            setDetail={setDetail}
            mode="nav"
            onPressSignIn={() => {
              setTab('profile');
              if (!customerSession) openAuthView('login');
            }}
            onPressOfficers={() => {
              navigateToSubPage('protocol_ranks');
            }}
            navigateToSubPage={navigateToSubPage}
            notifications={scopedNotifications}
          />
        )}

        {tab === 'home' && (
          <HomeScreen
            lang={lang}
            setLang={setLang}
            t={t}
            airport={airport}
            setAirport={setAirport}
            serviceCatalog={serviceCatalog}
            addonCatalog={addonCatalog}
            startBooking={startBooking}
            setDetail={setDetail}
            setGuidancePopup={setGuidancePopup}
            q={q}
            setQ={setQ}
            responsive={responsive}
            windowWidth={windowWidth}
            pagePadding={pagePadding}
            bannerIndex={bannerIndex}
            setBannerIndex={setBannerIndex}
            profile={profile}
            setShowAirportModal={setShowAirportModal}
            setTab={setTab}
            setWiz={setWiz}
            customerSession={customerSession}
            notifications={scopedNotifications}
            onPressOfficers={() => {
              navigateToSubPage('protocol_ranks');
            }}
            navigateToSubPage={navigateToSubPage}
            openAuthView={openAuthView}
          />
        )}
        {tab === 'bookings' && (
          <BookingsScreen
            bookings={myUserBookings}
            customerSession={customerSession}
            customerPaymentHistory={customerPaymentHistory}
            customerPaymentsLoading={customerPaymentsLoading}
            customerPaymentsError={customerPaymentsError}
            loadCustomerPaymentHistory={loadCustomerPaymentHistory}
            bookingsLoading={bookingsLoading}
            bookingsError={bookingsError}
            bookingFilter={bookingFilter}
            setBookingFilter={setBookingFilter}
            bookingView={bookingView}
            setBookingView={setBookingView}
            bookingWorkflow={bookingWorkflow}
            paymentBusyId={paymentBusyId}
            bookingActionId={bookingActionId}
            verifyBookingPayment={verifyBookingPayment}
            startBkashPayment={startBkashPayment}
            startCardPayment={startCardPayment}
            startSslCommerzPayment={startSslCommerzPayment}
            openBkashPayment={openBkashPayment}
            requestBookingCancellation={requestBookingCancellation}
            pagePadding={pagePadding}
            lang={lang}
            t={t}
            setTab={setTab}
            onBack={() => setTab('home')}
          />
        )}
        {tab === 'inbox' && (
          <InboxScreen
            pagePadding={pagePadding}
            lang={lang}
            t={t}
            notifications={scopedNotifications}
            userRole={currentRole}
            notificationFilter={notificationFilter}
            setNotificationFilter={setNotificationFilter}
            notificationsLoading={notificationsLoading}
            notificationsError={notificationsError}
            notificationReadBusyIds={notificationReadBusyIds}
            markingAllNotificationsRead={markingAllNotificationsRead}
            markNotificationRead={markNotificationRead}
            markAllNotificationsRead={markAllNotificationsRead}
            customerSession={customerSession}
            loadCustomerNotifications={loadCustomerNotifications}
            notify={notify}
            requestPushPermission={requestPushPermission}
            setTab={setTab}
            onBack={() => setTab('home')}
          />
        )}
        {tab === 'help' && (
          <HelpScreen
            pagePadding={pagePadding}
            lang={lang}
            t={t}
            supportCategory={supportCategory}
            setSupportCategory={setSupportCategory}
            supportSearch={supportSearch}
            setSupportSearch={setSupportSearch}
            openFaqId={openFaqId}
            setOpenFaqId={setOpenFaqId}
            setTab={setTab}
            onBack={() => setTab('home')}
          />
        )}
        {tab === 'profile' && (
          <ProfileScreen
            pagePadding={pagePadding}
            lang={lang}
            setLang={setLang}
            t={t}
            customerSession={customerSession}
            setCustomerSession={setCustomerSession}
            profile={profile}
            setProfile={setProfile}
            notificationPreferences={notificationPreferences}
            setNotificationPreferences={setNotificationPreferences}
            responsive={responsive}
            authView={authView}
            openAuthView={openAuthView}
            authForm={authForm}
            setAuthField={setAuthField}
            authError={authError}
            authNotice={authNotice}
            authBusy={authBusy}
            customerApiConfigured={customerApiConfigured}
            saveCustomerProfile={saveCustomerProfile}
            signOutCustomer={signOutCustomer}
            submitCustomerLogin={submitCustomerLogin}
            submitCustomerRegistration={submitCustomerRegistration}
            submitCustomerOtp={submitCustomerOtp}
            resendCustomerCode={resendCustomerCode}
            submitPasswordResetRequest={submitPasswordResetRequest}
            submitPasswordReset={submitPasswordReset}
            setTab={setTab}
            onBack={() => setTab('home')}
            setManagerLoginError={setManagerLoginError}
            setStaffLoginError={setStaffLoginError}
            setAuthForm={setAuthForm}
          />
        )}
        {responsive.isWide && tab !== 'home' && (
          <DesktopFooter lang={lang} setTab={setTab} />
        )}
        {!responsive.isWide && (
          <MobileTabs
            tab={tab}
            setTab={setTab}
            setDetail={setDetail}
            setWiz={setWiz}
            t={t}
            responsive={responsive}
            customerSession={customerSession}
            loadCustomerNotifications={loadCustomerNotifications}
            lang={lang}
          />
        )}
      </View>
      <Modal
        transparent
        animationType="fade"
        visible={Boolean(guidancePopup)}
        onRequestClose={() => setGuidancePopup(null)}
      >
        <View style={s.addonPopupOverlay}>
          <TouchableOpacity
            style={s.addonPopupBackdrop}
            activeOpacity={1}
            onPress={() => setGuidancePopup(null)}
            accessibilityLabel={t('back')}
          />
          {guidancePopup && (
            <View
              style={[
                s.addonPopupCard,
                responsive.isWide
                  ? {
                      borderRadius: 24,
                      padding: 24,
                      alignItems: 'center',
                      maxWidth: 440,
                      width: '90%',
                      maxHeight: '90%',
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      borderBottomWidth: 5,
                      borderBottomColor: '#CBD5E1',
                    }
                  : {
                      borderRadius: 22,
                      paddingVertical: 20,
                      paddingHorizontal: 16,
                      alignItems: 'center',
                      maxWidth: 380,
                      width: '92%',
                      maxHeight: '88%',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    },
              ]}
              {...(responsive.isWide && Platform.OS === 'web' ? { className: 'flightcare-card-3d' } : {})}
            >
              <ScrollView
                style={{ width: '100%' }}
                contentContainerStyle={{ alignItems: 'center', paddingBottom: 4 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Icon Badge */}
                <View
                  style={[
                    s.packageCardIconWrap,
                    {
                      backgroundColor: guidancePopup.bg || '#E0F2FE',
                      borderColor: guidancePopup.border || '#38BDF8',
                      shadowColor: guidancePopup.shadow || '#0284C7',
                      width: responsive.isWide ? 70 : 60,
                      height: responsive.isWide ? 70 : 60,
                      borderRadius: responsive.isWide ? 22 : 18,
                      marginBottom: 10,
                      marginTop: 4,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {guidancePopup.image ? (
                    <Image
                      source={guidancePopup.image}
                      style={{
                        width: '94%',
                        height: '94%',
                      }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={{ fontSize: responsive.isWide ? 34 : 28 }}>{guidancePopup.icon}</Text>
                  )}
                </View>

                {/* Service Name */}
                <Text
                  style={[
                    s.h2,
                    { textAlign: 'center', marginBottom: 4, fontSize: responsive.isWide ? 22 : 19 },
                  ]}
                >
                  {guidancePopup.name}
                </Text>

                {/* Price / Category Pill */}
                {guidancePopup.price ? (
                  <View
                    style={{
                      backgroundColor: '#FEF3C7',
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#B45309' }}>
                      {guidancePopup.price}
                    </Text>
                  </View>
                ) : null}

                {/* 4 Feature Points List */}
                {guidancePopup.points && guidancePopup.points.length > 0 ? (
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 16,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      marginBottom: 6,
                      gap: 10,
                    }}
                  >
                    {guidancePopup.points.map((pt, idx) => {
                      const pointText = Array.isArray(pt) ? (lang ? pt[1] || pt[0] : pt[0]) : pt;
                      return (
                        <View
                          key={idx}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: '#DCFCE7',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginTop: 2,
                              flexShrink: 0,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>✓</Text>
                          </View>
                          <Text
                            style={{
                              flex: 1,
                              fontSize: 13.5,
                              color: '#1E293B',
                              lineHeight: 19,
                              fontWeight: '600',
                            }}
                          >
                            {pointText}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text
                    style={[
                      s.body,
                      { textAlign: 'center', color: '#475569', marginBottom: 6, lineHeight: 22 },
                    ]}
                  >
                    {guidancePopup.desc ||
                      (lang
                        ? 'বিমানবন্দরের বিশেষ প্রোটোকল ও যাত্রী সহায়তা সেবা।'
                        : 'Specialized airport protocol & passenger concierge assistance.')}
                  </Text>
                )}
              </ScrollView>

              {/* Close Button Top Right (Rendered after ScrollView with high zIndex to always receive touches) */}
              <TouchableOpacity
                style={s.addonPopupClose}
                onPress={() => setGuidancePopup(null)}
                accessibilityRole="button"
                accessibilityLabel={t('back')}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Text style={s.addonPopupCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Airport Selection Modal */}
      <Modal
        visible={showAirportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAirportModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxWidth: 540, width: '92%', maxHeight: '82%', padding: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={[s.h2, { fontSize: 20, marginBottom: 2 }]}>
                  {lang ? 'বিমানবন্দর নির্বাচন করুন' : 'Select Airport'}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B' }}>
                  {lang ? 'প্রোটোকল ও কনসিয়ার্জ সেবার বিমানবন্দর বেছে নিন' : 'Choose airport for protocol concierge services'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAirportModal(false)}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
                {lang ? 'সক্রিয় বিমানবন্দরসমূহ' : 'Operational Airports'}
              </Text>

              {managedAirports
                .filter(a => a.status === 'active')
                .map(item => {
                  const isSelected = item.code === airport.code;
                  return (
                    <TouchableOpacity
                      key={item.id || item.code}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#0284C7' : '#E2E8F0',
                        backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                        marginBottom: 10,
                        gap: 12,
                      }}
                      onPress={() => {
                        setAirport(item);
                        setShowAirportModal(false);
                      }}
                    >
                      <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: isSelected ? '#0284C7' : '#0E2A47' }}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>{item.code}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0E2A47' }}>
                          {(item.name || [])[lang] || item.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          📍 {item.location || item.city} · {item.city}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0284C7', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

              {/* Maintenance or other airports */}
              {managedAirports.some(a => a.status !== 'active') && (
                <>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginTop: 10, marginBottom: 8, letterSpacing: 0.5 }}>
                    {lang ? 'অন্যান্য হাব (রক্ষণাবেক্ষণাধীন/স্থগিত)' : 'Other Hubs (Maintenance/Pending)'}
                  </Text>
                  {managedAirports
                    .filter(a => a.status !== 'active')
                    .map(item => (
                      <View
                        key={item.id || item.code}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          borderRadius: 12,
                          backgroundColor: '#F8FAFC',
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          marginBottom: 8,
                          opacity: 0.75,
                          gap: 10,
                        }}
                      >
                        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#94A3B8' }}>
                          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>{item.code}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>
                            {(item.name || [])[lang] || item.name}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                            {item.city} · {item.status === 'maintenance' ? (lang ? 'রক্ষণাবেক্ষণ চলছে' : 'Maintenance') : (lang ? 'বর্তমানে বন্ধ' : 'Temporarily Closed')}
                          </Text>
                        </View>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: item.status === 'maintenance' ? '#FEF3C7' : '#F1F5F9' }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: item.status === 'maintenance' ? '#D97706' : '#64748B' }}>
                            {item.status === 'maintenance' ? 'Maintenance' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bangla QR (বাংলা কিউআর) Interoperable Payment Modal */}
      <BanglaQrPaymentModal
        visible={bkashModalVisible}
        booking={activeBkashBooking}
        onClose={() => {
          setBkashModalVisible(false);
          setActiveBkashBooking(null);
          setBkashSuccessCallback(null);
        }}
        onSuccess={handleBanglaQrPaymentSuccess}
        lang={lang}
      />

      {/* Bank Card (Visa / Mastercard / AMEX) & Direct Bank Transfer Payment Modal */}
      <BankCardPaymentModal
        visible={cardModalVisible}
        booking={activeCardBooking}
        initialMode={activeCardBooking?.method === 'card' ? 'card' : 'bank_transfer'}
        onClose={() => {
          setCardModalVisible(false);
          setActiveCardBooking(null);
          setCardSuccessCallback(null);
        }}
        onSuccess={handleCardPaymentSuccess}
        lang={lang}
      />

      {/* SSLCOMMERZ All-in-One Multi-Channel Gateway Modal */}
      <SslCommerzPaymentModal
        visible={sslModalVisible}
        booking={activeSslBooking}
        onClose={() => {
          setSslModalVisible(false);
          setActiveSslBooking(null);
          setSslSuccessCallback(null);
        }}
        onSuccess={handleSslCommerzPaymentSuccess}
        lang={lang}
      />

      {/* Protocol Officer Public Verification Profile & Reviews Modal (QR Scanned / Web View) */}
      <OfficerProfileModal
        visible={showOfficerProfileModal}
        officerId={scannedOfficerId || 'st-1'}
        lang={lang}
        onClose={() => {
          setShowOfficerProfileModal(false);
          setScannedOfficerId(null);
        }}
        onBookOfficer={handleBookOfficerFromProfile}
      />

      {/* Flight Care Family Member Digital ID Pass Modal (QR Scanned / Web View) */}
      <FamilyMemberIdCardModal
        visible={showFamilyMemberIdCard}
        member={scannedFamilyMember}
        onClose={() => {
          setShowFamilyMemberIdCard(false);
          setScannedFamilyMember(null);
        }}
        lang={lang}
      />

      {/* Official Money Receipt Modal (Deep Link & Passenger Voucher on Mobile) */}
      <BookingInvoiceModal
        visible={showReceiptModal}
        booking={receiptModalBooking}
        onClose={() => setShowReceiptModal(false)}
        lang={lang}
      />

      {/* Verified Passenger Service Completion Review Popup (Auto-Prompt) */}
      <ServiceCompletionReviewModal
        visible={!!completionReviewBooking}
        booking={completionReviewBooking}
        onClose={handleCloseReviewModal}
        onReviewSubmitted={handleReviewSubmitted}
        lang={lang}
      />
    </SafeAreaView>
  );
}
