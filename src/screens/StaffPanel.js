import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { s } from '../styles/styles';
import { staffLogout, getStaffAssignments, isDemoLoginAllowed } from '../../api';
import {
  DEFAULT_ARRIVAL_MILESTONES,
  DEFAULT_DEPARTURE_MILESTONES,
  DEFAULT_STAFF_ROSTER,
  getAddonAsset,
} from '../constants/data';
import { calculateOfficerPoints } from '../services/officerService';
import LiveTrackingModal from '../components/LiveTrackingModal';
import ProtocolRanksModal from '../components/ProtocolRanksModal';
import VipPlacardModal from '../components/VipPlacardModal';
import AirportEmergencyDialModal from '../components/AirportEmergencyDialModal';
import FamilyMemberIdCardModal from '../components/FamilyMemberIdCardModal';
import { findFamilyMember } from '../services/flightCareFamilyService';
import { getShiftBriefing } from '../services/airportOperationsService';
import {
  dispatchStaffNotification,
  getStaffNotifications,
  markStaffNotificationAsRead,
  markAllStaffNotificationsAsRead,
  clearStaffNotifications,
  STAFF_NOTIFICATION_TYPES,
  dispatchBookingLifecycleNotifications,
} from '../services/communication';
import { listenToStaffNotifications } from '../services/firebaseSyncService';
import { sendLiveSms } from '../services/smsGateway';


export default function StaffPanel({
  pagePadding,
  lang,
  t,
  responsive,
  airport,
  staffSession,
  setStaffSession,
  staffEmail,
  setStaffEmail,
  staffPassword,
  setStaffPassword,
  staffLoginError,
  staffBusy,
  staffLoading,
  setStaffLoading,
  staffAssignments,
  setStaffAssignments,
  staffFilter,
  setStaffFilter,
  staffActionError,
  setStaffActionError,
  staffApiConfigured,
  submitStaffLogin,
  updateStaffWork,
  handleBack,
  bookings = [],
  onUpdateBooking,
  staffRoster = DEFAULT_STAFF_ROSTER,
  setStaffRoster,
  onToggleStaffDuty,
}) {
  // Local search filter with 300ms debounce for assigned bookings
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showStaffRanksModal, setShowStaffRanksModal] = useState(false);
  const [selectedPlacardBooking, setSelectedPlacardBooking] = useState(null);
  const [showSpeedDialModal, setShowSpeedDialModal] = useState(false);
  const [showStaffIdCardModal, setShowStaffIdCardModal] = useState(false);
  const [staffFamilyData, setStaffFamilyData] = useState(null);
  const [shiftBriefing, setShiftBriefing] = useState(null);

  useEffect(() => {
    getShiftBriefing().then(b => {
      if (b) setShiftBriefing(b);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (staffSession?.user) {
      const id = staffSession.user.id || staffSession.user.badgeNo || staffSession.user.name;
      findFamilyMember(id).then(res => {
        if (res) setStaffFamilyData(res);
      }).catch(() => {});
    }
  }, [staffSession?.user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [activeTabFilter, setActiveTabFilter] = useState('all'); // 'all' | 'action' | 'completed'
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  // Completion modal state & handover verification
  const [completingBooking, setCompletingBooking] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionNotice, setCompletionNotice] = useState('');
  const [completionError, setCompletionError] = useState('');
  const [handoverMode, setHandoverMode] = useState('signature'); // 'signature' | 'otp'
  const [handoverOtpInput, setHandoverOtpInput] = useState('');
  const [handoverOtpVerified, setHandoverOtpVerified] = useState(false);
  const [handoverOtpError, setHandoverOtpError] = useState('');
  const [sendingHandoverSms, setSendingHandoverSms] = useState(false);
  const [handoverSmsNotice, setHandoverSmsNotice] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [safetyLuggageChecked, setSafetyLuggageChecked] = useState(false);
  const [safetyEscortChecked, setSafetyEscortChecked] = useState(false);

  // 6-Second Undo Action Toast state for Accept / Start Service
  const [undoAction, setUndoAction] = useState(null); // { bookingId, previousState, actionType, label, secondsLeft }
  const undoTimerRef = useRef(null);

  // Final Confirmation Prompt modal state for Complete & Handover
  const [showCompleteConfirmPrompt, setShowCompleteConfirmPrompt] = useState(false);

  // Protocol Officer Real-Time Notifications state & subscription
  const [staffNotifications, setStaffNotifications] = useState([]);
  const [showStaffNotifsModal, setShowStaffNotifsModal] = useState(false);
  const [notifsTabFilter, setNotifsTabFilter] = useState('all'); // 'all' | 'assignment' | 'completed' | 'review'

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearInterval(undoTimerRef.current);
      }
    };
  }, []);

  // Listen to Staff Notifications in Real-Time
  useEffect(() => {
    if (!staffSession?.user?.id) return;
    const staffId = staffSession.user.id;
    let unsub = () => {};

    const loadNotifications = async () => {
      try {
        const notifs = await getStaffNotifications(staffId);
        setStaffNotifications(notifs || []);
      } catch {}

      try {
        unsub = listenToStaffNotifications(staffId, (cloudNotifs) => {
          if (Array.isArray(cloudNotifs) && cloudNotifs.length > 0) {
            setStaffNotifications(prev => {
              const map = new Map();
              cloudNotifs.forEach(item => map.set(item.id, item));
              (prev || []).forEach(item => map.set(item.id, { ...(map.get(item.id) || {}), ...item }));
              return Array.from(map.values()).sort(
                (a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)
              );
            });
          }
        });
      } catch {}
    };

    loadNotifications();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [staffSession?.user?.id]);


  // Canvas ref for signature pad
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Off-Duty Notice Modal state
  const [offDutyNotice, setOffDutyNotice] = useState(null); // { booking, action: 'accept' | 'start' } | null

  // Baggage Tags Inline Editing state
  const [editingBaggageBookingId, setEditingBaggageBookingId] = useState(null);
  const [baggageInputText, setBaggageInputText] = useState('');

  // Live mutual tracking radar modal state
  const [trackingAssignment, setTrackingAssignment] = useState(null);

  // Milestone note editing state
  const [activeMilestoneNoteId, setActiveMilestoneNoteId] = useState(null);
  const [milestoneNoteText, setMilestoneNoteText] = useState('');

  // Quick WhatsApp & Call helpers
  const handleCallPassenger = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/[\s-]/g, '')}`).catch(() => {});
  };

  const handleWhatsAppPassenger = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => {});
  };

  // Helper to construct service milestones progress
  const createMilestonesProgress = (direction = 'arrival', completedCount = 0) => {
    const list = direction === 'arrival' ? DEFAULT_ARRIVAL_MILESTONES : DEFAULT_DEPARTURE_MILESTONES;
    return list.map((m, idx) => {
      let st = 'pending';
      let compAt = null;
      if (idx < completedCount) {
        st = 'completed';
        compAt = `0${8 + idx}:15 AM`;
      } else if (idx === completedCount) {
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

  // 1. LOGIN SCREEN (When not authenticated)
  if (!staffSession?.user || !['staff', 'agent'].includes(staffSession.user.role)) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TouchableOpacity
          style={s.screenBackButton}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          onPress={handleBack}
        >
          <Text style={s.screenBackText}>{t('back')}</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 72, height: 72, resizeMode: 'contain', marginBottom: 10 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={[s.h2, { marginBottom: 0, textAlign: 'center' }]}>{lang ? 'প্রোটোকল স্টাফ অ্যাপ' : 'Protocol Staff Portal'}</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
            {lang
              ? 'বিমানবন্দরে প্রোটোকল ও কনসিয়ার্জ সেবা পরিচালনার জন্য অফিসিয়াল স্টাফ লগইন'
              : 'Official secure access portal for Flight Care airport protocol officers'}
          </Text>
        </View>

        {/* Secure Protocol Authentication Header */}
        <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>🛡️</Text>
          <Text style={{ color: '#475569', fontSize: 12.5, lineHeight: 18, flex: 1 }}>
            {lang
              ? 'এটি দায়িত্বপ্রাপ্ত বিমানবন্দর প্রোটোকল অফিসারদের পোর্টাল। অননুমোদিত প্রবেশ সম্পূর্ণ নিষিদ্ধ। আপনার প্রাতিষ্ঠানিক আইডি এবং সিক্রেট পিন/পাসওয়ার্ড দিয়ে প্রবেশ করুন।'
              : 'Official Airport Protocol Officer Portal. Unauthorized access prohibited. Authenticate with your assigned staff credentials and secret PIN.'}
          </Text>
        </View>

        {/* Standard Email/Password Login Form */}
        <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#334155', marginBottom: 12 }}>
            {lang ? 'প্রোটোকল অফিসার আইডি ও পিন' : 'Protocol Staff Credentials & PIN'}
          </Text>

          <TextInput
            style={[s.in, { backgroundColor: '#F8FAFC' }]}
            placeholder={lang ? 'অফিসিয়াল ইমেইল, আইডি বা ফোন' : 'Official Email, ID or Phone'}
            value={staffEmail}
            onChangeText={setStaffEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={{ position: 'relative', width: '100%' }}>
            <TextInput
              style={[s.in, { backgroundColor: '#F8FAFC', paddingRight: 45 }]}
              placeholder={lang ? 'সিক্রেট পিন / পাসওয়ার্ড' : 'Secret PIN / Password'}
              value={staffPassword}
              onChangeText={setStaffPassword}
              secureTextEntry={!showStaffPassword}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowStaffPassword(prev => !prev)}
              style={{
                position: 'absolute',
                right: 12,
                top: 13,
                padding: 4,
                zIndex: 10,
              }}
              accessibilityLabel={showStaffPassword ? 'Hide password' : 'Show password'}
            >
              <Text style={{ fontSize: 16 }}>{showStaffPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>

          {staffLoginError ? (
            <View style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#FECACA' }}>
              <Text style={{ color: '#DC2626', fontSize: 12.5, fontWeight: '700' }}>⚠️ {staffLoginError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.btn, staffBusy && s.managerDisabled, { backgroundColor: '#0284C7' }]}
            disabled={staffBusy}
            onPress={() => submitStaffLogin()}
          >
            <Text style={s.btnT}>{staffBusy ? '…' : (lang ? 'লগইন করুন' : 'Sign In as Protocol Staff')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Helper to extract booking details
  const getStatus = assignment =>
    String(assignment.status || assignment.booking?.status || 'assigned')
      .toLowerCase()
      .replace(/[ -]/g, '_');

  const statusLabel = status =>
    status === 'completed'
      ? (lang ? 'সম্পন্ন' : 'Completed')
      : status === 'in_progress'
      ? (lang ? 'চলমান' : 'In Progress')
      : status === 'accepted'
      ? (lang ? 'গৃহীত' : 'Accepted')
      : (lang ? 'বরাদ্দকৃত' : 'Assigned');

  // Look up current staff member from staffRoster
  const currentStaffUser = staffSession.user;
  const currentStaffInRoster = (staffRoster || []).find(
    s => s.id === currentStaffUser.id || s.email === currentStaffUser.email
  ) || currentStaffUser;

  // Retrieve assigned bookings for this logged-in staff member
  const myAssignedBookings = useMemo(() => {
    const staffId = currentStaffUser.id;
    const staffName = currentStaffUser.name;
    const staffEmail = currentStaffUser.email;

    return (bookings || []).filter(b => {
      return (
        String(b.staffId) === String(staffId) ||
        String(b.assignedStaffId) === String(staffId) ||
        String(b.leadStaffId) === String(staffId) ||
        String(b.supportStaffId) === String(staffId) ||
        b.staff === staffName ||
        b.leadStaffName === staffName ||
        b.supportStaffName === staffName
      );
    });
  }, [bookings, currentStaffUser]);

  // Combined assignments from API or local bookings
  const allAssignments = myAssignedBookings.length > 0 ? myAssignedBookings : staffAssignments;

  // Filtered assignments
  const visibleAssignments = allAssignments.filter(assignment => {
    const status = getStatus(assignment);
    if (activeTabFilter === 'completed') {
      if (status !== 'completed') return false;
    } else if (activeTabFilter === 'action') {
      if (status === 'completed' || status === 'cancelled') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const customer = (assignment.customer || assignment.passengerName || assignment.guest_name || '').toLowerCase();
      const id = String(assignment.id || assignment.reference || '').toLowerCase();
      const fno = String(assignment.fno || assignment.flight?.number || '').toLowerCase();
      const airline = String(assignment.airline || assignment.flight?.airline || '').toLowerCase();
      if (!customer.includes(q) && !id.includes(q) && !fno.includes(q) && !airline.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Digital Touch Signature & Drawing Handlers
  const startDrawing = (e) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);
    if (clientX == null || clientY == null) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);
    if (clientX == null || clientY == null) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasSignature(true);
    setCompletionError('');
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
  };

  // Handover OTP calculation & verification
  const getBookingExpectedOtp = (b) => {
    if (!b) return '2026';
    if (b.handoverOtp) return String(b.handoverOtp);
    const digits = String(b.id || '').replace(/\D/g, '');
    if (digits.length >= 4) return digits.slice(-4);
    const phoneDigits = String(b.phone || '').replace(/\D/g, '');
    if (phoneDigits.length >= 4) return phoneDigits.slice(-4);
    return '1234';
  };

  const handleVerifyOtp = () => {
    const expected = getBookingExpectedOtp(completingBooking);
    if (handoverOtpInput.trim() === expected) {
      setHandoverOtpVerified(true);
      setHandoverOtpError('');
      setCompletionError('');
    } else {
      setHandoverOtpError(
        lang
          ? `ভুল ওটিপি কোড! অনুগ্রহ করে সঠিক কোড দিন (পরীক্ষার কোড: ${expected})`
          : `Invalid OTP code! Please check voucher (Demo code: ${expected})`
      );
    }
  };

  // Dispatch Handover OTP directly to Passenger's mobile phone via SMS Gateway
  const handleSendHandoverOtpSms = async () => {
    if (!completingBooking) return;
    const targetPhone = completingBooking.phone || completingBooking.passengerPhone || completingBooking.contactNumber;
    if (!targetPhone) {
      setHandoverOtpError(lang ? 'যাত্রীর মোবাইল নম্বর পাওয়া যায়নি!' : 'Passenger phone number not found in booking record!');
      return;
    }
    const otpCode = getBookingExpectedOtp(completingBooking);
    setSendingHandoverSms(true);
    setHandoverOtpError('');
    try {
      const pName = completingBooking.passengerName || completingBooking.leadPassengerName || 'যাত্রী';
      const smsMsg = `[Flight Care] প্রিয় ${pName}, আপনার বিমানবন্দর প্রোটোকল সার্ভিস হ্যান্ডওভার সমাপ্তি ওটিপি কোড: ${otpCode}। অনুগ্রহ করে দায়িত্বপ্রাপ্ত অফিসারকে এই কোডটি বলুন।`;
      const res = await sendLiveSms({
        to: targetPhone,
        message: smsMsg,
        otp: otpCode,
        title: 'Service Handover OTP',
      });
      if (res.ok) {
        setHandoverSmsNotice(
          lang
            ? `✓ যাত্রীর নম্বরে (${targetPhone}) ওটিপি এসএমএস সফলভাবে পাঠানো হয়েছে!`
            : `✓ Handover OTP SMS sent to passenger (${targetPhone})!`
        );
        setTimeout(() => setHandoverSmsNotice(''), 7000);
      } else {
        setHandoverOtpError(res.error || (lang ? 'এসএমএস পাঠাতে সমস্যা হয়েছে' : 'Failed to send SMS'));
      }
    } catch (err) {
      setHandoverOtpError(err.message || 'SMS Error');
    } finally {
      setSendingHandoverSms(false);
    }
  };

  // Baggage claim tags save handler
  const handleSaveBaggageTags = (bookingId) => {
    if (onUpdateBooking) {
      onUpdateBooking(bookingId, {
        baggageTags: baggageInputText.trim(),
      });
    }
    setEditingBaggageBookingId(null);
    setCompletionNotice(lang ? 'ব্যাগেজ ট্যাগ নম্বর সফলভাবে সংরক্ষণ করা হয়েছে।' : 'Baggage claim tags saved successfully.');
    setTimeout(() => setCompletionNotice(''), 2500);
  };

  // 6-Second Undo Action Handlers
  const handleUndoAction = () => {
    if (!undoAction) return;
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    const { bookingId, previousState } = undoAction;
    if (onUpdateBooking && bookingId && previousState) {
      onUpdateBooking(bookingId, previousState);
    }
    setUndoAction(null);
    setCompletionNotice(lang ? 'অ্যাকশন সফলভাবে বাতিল (Undo) করা হয়েছে।' : 'Status reverted successfully via Undo.');
    setTimeout(() => setCompletionNotice(''), 3000);
  };

  const startUndoCountdown = (bookingId, previousState, actionType, label) => {
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoAction({
      bookingId,
      previousState,
      actionType,
      label,
      secondsLeft: 6,
    });
    undoTimerRef.current = setInterval(() => {
      setUndoAction((prev) => {
        if (!prev || prev.secondsLeft <= 1) {
          clearInterval(undoTimerRef.current);
          undoTimerRef.current = null;
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
  };

  // Action handlers with Off-Duty Lock
  const handleAcceptService = (booking) => {
    if (currentStaffInRoster.status === 'off_duty') {
      setOffDutyNotice({ booking, action: 'accept' });
      return;
    }
    executeAcceptService(booking);
  };

  const executeAcceptService = (booking) => {
    const previousState = {
      status: booking.status,
      staffStatus: booking.staffStatus,
      statusHistory: booking.statusHistory ? [...booking.statusHistory] : [],
      serviceProgress: booking.serviceProgress ? JSON.parse(JSON.stringify(booking.serviceProgress)) : undefined,
    };

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = {
      status: 'accepted',
      staffStatus: 'accepted',
      statusHistory: [
        ...(booking.statusHistory || []),
        {
          status: 'accepted',
          label: 'Assignment Accepted',
          time: 'Today, ' + timeString,
          note: `${currentStaffUser.name} accepted the protocol service assignment`,
        },
      ],
    };
    if (onUpdateBooking) {
      onUpdateBooking(booking.id, updated);
    }
    updateStaffWork(booking, 'accept', updated);
    startUndoCountdown(
      booking.id,
      previousState,
      'accept',
      lang ? 'অ্যাসাইনমেন্ট গ্রহণ করা হয়েছে' : 'Assignment Accepted'
    );
    setCompletionNotice(lang ? 'অ্যাসাইনমেন্ট সফলভাবে গ্রহণ করা হয়েছে!' : 'Assignment accepted successfully!');
    setTimeout(() => setCompletionNotice(''), 3000);
  };

  const handleStartService = (booking) => {
    if (currentStaffInRoster.status === 'off_duty') {
      setOffDutyNotice({ booking, action: 'start' });
      return;
    }
    executeStartService(booking);
  };

  const executeStartService = (booking) => {
    const previousState = {
      status: booking.status,
      staffStatus: booking.staffStatus,
      statusHistory: booking.statusHistory ? [...booking.statusHistory] : [],
      serviceProgress: booking.serviceProgress ? JSON.parse(JSON.stringify(booking.serviceProgress)) : undefined,
    };

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentMilestones = booking.serviceProgress || createMilestonesProgress(booking.direction, 0);

    // Mark step 1 completed and step 2 in-progress
    const updatedMilestones = currentMilestones.map((m, idx) => {
      if (idx === 0) {
        return { ...m, status: 'completed', completedAt: timeString };
      }
      if (idx === 1) {
        return { ...m, status: 'in_progress' };
      }
      return m;
    });

    const updated = {
      status: 'in_progress',
      staffStatus: 'in_progress',
      serviceProgress: updatedMilestones,
      statusHistory: [
        ...(booking.statusHistory || []),
        {
          status: 'in_progress',
          label: 'Service Started',
          time: 'Today, ' + timeString,
          note: `${currentStaffUser.name} stationed and initiated service`,
        },
      ],
    };

    if (onUpdateBooking) {
      onUpdateBooking(booking.id, updated);
    }
    dispatchBookingLifecycleNotifications({
      stage: 'in_progress',
      booking: updated,
      staff: currentStaffUser,
      lang,
    }).catch(() => {});
    updateStaffWork(booking, 'start', updated);
    startUndoCountdown(
      booking.id,
      previousState,
      'start',
      lang ? 'সার্ভিস শুরু করা হয়েছে' : 'Service Started'
    );
    setCompletionNotice(lang ? 'সার্ভিস শুরু হয়েছে! গেটে অবস্থান নিশ্চিত।' : 'Service started! Stationed at gate/curb.');
    setTimeout(() => setCompletionNotice(''), 3000);
  };

  const handleToggleMilestone = (booking, milestoneIndex) => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentMilestones = booking.serviceProgress || createMilestonesProgress(booking.direction, 0);

    const updatedMilestones = currentMilestones.map((m, idx) => {
      if (idx === milestoneIndex) {
        const isNowDone = m.status !== 'completed';
        return {
          ...m,
          status: isNowDone ? 'completed' : 'pending',
          completedAt: isNowDone ? timeString : null,
        };
      }
      return m;
    });

    // If next step is pending and this one was completed, mark next in-progress
    if (milestoneIndex + 1 < updatedMilestones.length && updatedMilestones[milestoneIndex].status === 'completed') {
      if (updatedMilestones[milestoneIndex + 1].status === 'pending') {
        updatedMilestones[milestoneIndex + 1] = {
          ...updatedMilestones[milestoneIndex + 1],
          status: 'in_progress',
        };
      }
    }

    const allDone = updatedMilestones.every(m => m.status === 'completed');
    const newStatus = allDone ? 'completed' : 'in_progress';

    const updated = {
      status: newStatus,
      staffStatus: newStatus,
      serviceProgress: updatedMilestones,
      statusHistory: [
        ...(booking.statusHistory || []),
        {
          status: newStatus,
          label: `Milestone: ${updatedMilestones[milestoneIndex].labelEn}`,
          time: 'Today, ' + timeString,
          note: `Updated by ${currentStaffUser.name}`,
        },
      ],
    };

    if (onUpdateBooking) {
      onUpdateBooking(booking.id, updated);
    }

    // Dispatch real-time 4-role notifications (Passenger, Assigned Officer, Manager, Super Admin)
    const toggledStep = updatedMilestones[milestoneIndex];
    if (toggledStep && toggledStep.status === 'completed') {
      dispatchBookingLifecycleNotifications({
        stage: toggledStep.key || toggledStep.id,
        booking: { ...booking, ...updated },
        staff: currentStaffUser,
        extra: {
          milestoneNameEn: toggledStep.labelEn,
          milestoneNameBn: toggledStep.labelBn,
        },
        lang,
      }).catch(err => console.warn('Milestone notification dispatch notice:', err));
    }

    setCompletionNotice(lang ? 'মাইলফলক অগ্রগতি আপডেট হয়েছে।' : 'Service progress milestone updated.');
    setTimeout(() => setCompletionNotice(''), 2500);
  };

  const handleOpenCompleteServiceModal = (booking) => {
    setCompletingBooking(booking);
    setCompletionNotes('');
    setCompletionError('');
    setHandoverMode('signature');
    setHandoverOtpInput('');
    setHandoverOtpVerified(false);
    setHandoverOtpError('');
    setSendingHandoverSms(false);
    setHandoverSmsNotice('');
    setHasSignature(false);
    setSafetyLuggageChecked(false);
    setSafetyEscortChecked(false);
    setShowCompleteConfirmPrompt(false);
    setTimeout(() => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }, 150);
  };

  const handleConfirmCompleteService = () => {
    if (!completingBooking) return;

    if (!safetyLuggageChecked || !safetyEscortChecked) {
      setCompletionError(
        lang
          ? 'অনুগ্রহ করে উভয় নিরাপত্তা চেক নিশ্চিত করুন (লাগেজ হস্তান্তর ও যাত্রী এস্কর্ট)।'
          : 'Please confirm both safety checklists (luggage handover and passenger escort).'
      );
      return;
    }

    if (handoverMode === 'signature' && !hasSignature) {
      setCompletionError(
        lang
          ? 'অনুগ্রহ করে যাত্রীর ডিজিটাল স্বাক্ষর গ্রহণ করুন, অথবা ওটিপি ভেরিফিকেশন মোড বেছে নিন।'
          : 'Please obtain passenger digital signature or switch to OTP verification.'
      );
      return;
    }

    if (handoverMode === 'otp' && !handoverOtpVerified) {
      setCompletionError(
        lang
          ? 'অনুগ্রহ করে যাত্রীর ৪-ডিজিটের হ্যান্ডওভার ওটিপি যাচাই (Verify) সম্পন্ন করুন।'
          : 'Please verify the 4-digit handover OTP code before completing.'
      );
      return;
    }

    setCompletionError('');
    setShowCompleteConfirmPrompt(true);
  };

  const finalizeCompleteService = () => {
    if (!completingBooking) return;
    setShowCompleteConfirmPrompt(false);

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentMilestones = completingBooking.serviceProgress || createMilestonesProgress(completingBooking.direction, 0);

    // Mark all milestones completed
    const allCompletedMilestones = currentMilestones.map(m => ({
      ...m,
      status: 'completed',
      completedAt: m.completedAt || timeString,
    }));

    let signatureData = null;
    if (hasSignature && canvasRef.current) {
      try {
        signatureData = canvasRef.current.toDataURL();
      } catch {}
    }

    const updated = {
      status: 'completed',
      staffStatus: 'completed',
      serviceProgress: allCompletedMilestones,
      handoverRecord: {
        method: handoverMode,
        timestamp: new Date().toISOString(),
        verified: true,
        signatureProvided: hasSignature,
        otpVerified: handoverOtpVerified,
        safetyLuggageConfirmed: safetyLuggageChecked,
        safetyEscortConfirmed: safetyEscortChecked,
      },
      statusHistory: [
        ...(completingBooking.statusHistory || []),
        {
          status: 'completed',
          label: 'Service Completed & Handover',
          time: 'Today, ' + timeString,
          note: `${completionNotes.trim() ? completionNotes.trim() + ' | ' : ''}Verified via ${handoverMode === 'signature' ? 'Passenger Digital Signature' : 'Handover OTP'}. Safe escort confirmed by ${currentStaffUser.name}`,
        },
      ],
    };

    if (onUpdateBooking) {
      onUpdateBooking(completingBooking.id, updated);
    }
    dispatchBookingLifecycleNotifications({
      stage: 'completed',
      booking: updated,
      staff: currentStaffUser,
      extra: { handoverMode },
      lang,
    }).catch(() => {});
    updateStaffWork(completingBooking, 'complete', updated);

    // Reset staff to available if was in_service
    if (onToggleStaffDuty && currentStaffInRoster.status === 'in_service') {
      onToggleStaffDuty(currentStaffInRoster.id);
    }

    // DISPATCH NOTIFICATION TO PROTOCOL OFFICER (User Request Trigger 2: Service Completed)
    try {
      const passengerName = completingBooking.passengerName || completingBooking.customer || 'Valued Passenger';
      const flightNo = completingBooking.flight?.number || completingBooking.flightNumber || completingBooking.fno || 'Flight';
      const terminal = completingBooking.flight?.terminal || completingBooking.terminal || 'Terminal 1';

      dispatchStaffNotification({
        staffId: currentStaffUser.id,
        staffName: currentStaffUser.name,
        type: STAFF_NOTIFICATION_TYPES.SERVICE_COMPLETED,
        title: lang
          ? `সার্ভিস সমাপ্তি ও হস্তান্তর নিশ্চিতকরণ (বুকিং #${completingBooking.id})`
          : `Service Completed & Handover Confirmed (Booking #${completingBooking.id})`,
        body: lang
          ? `বুকিং #${completingBooking.id} (${passengerName}, ${flightNo}) সফলভাবে সমাপ্ত ও হ্যান্ডওভার নিশ্চিত হয়েছে। আপনার প্রোফাইলে +১০ পয়েন্ট যোগ হয়েছে।`
          : `Booking #${completingBooking.id} (${passengerName}, ${flightNo}) concluded successfully. +10 protocol points awarded.`,
        bookingId: completingBooking.id,
        passengerName,
        flight: flightNo,
        terminal,
        handoverMode,
        pointsEarned: 10,
        lang,
      }).then(async () => {
        const updatedNotifs = await getStaffNotifications(currentStaffUser.id);
        setStaffNotifications(updatedNotifs);
      });
    } catch (notifErr) {
      console.warn('Error dispatching staff completion notification:', notifErr);
    }

    setCompletingBooking(null);
    setCompletionNotice(lang ? 'সার্ভিস সফলভাবে সমাপ্ত ও হস্তান্তর সম্পন্ন হয়েছে!' : 'Service marked as Completed & Handover concluded successfully!');
    setTimeout(() => setCompletionNotice(''), 3500);
  };

  // Helper to assign a demo test booking to current staff if they have 0
  const handleAssignDemoTestBooking = () => {
    const unassigned = (bookings || []).find(b => b.status !== 'completed' && b.status !== 'cancelled' && (!b.staff || b.staff === 'Unassigned'));
    if (unassigned) {
      onUpdateBooking(unassigned.id, {
        staffId: currentStaffUser.id,
        staff: currentStaffUser.name,
        leadStaffId: currentStaffUser.id,
        leadStaffName: currentStaffUser.name,
        status: 'confirmed',
      });
      // DISPATCH NOTIFICATION TO PROTOCOL OFFICER (User Request Trigger 1: Assigned)
      try {
        dispatchStaffNotification({
          staffId: currentStaffUser.id,
          staffName: currentStaffUser.name,
          type: STAFF_NOTIFICATION_TYPES.ASSIGNMENT,
          title: lang ? `নতুন প্রোটোকল সার্ভিস বরাদ্দ (বুকিং #${unassigned.id})` : `New Protocol Service Assignment (Booking #${unassigned.id})`,
          body: lang
            ? `যাত্রী: ${unassigned.passengerName || unassigned.customer || 'Guest'} | ফ্লাইট: ${unassigned.flight?.number || unassigned.flightNumber || unassigned.fno || 'Flight'} | টার্মিনাল: ${unassigned.flight?.terminal || unassigned.terminal || 'Terminal 1'} | দায়িত্ব গ্রহণের জন্য প্রস্তুত থাকুন।`
            : `Passenger: ${unassigned.passengerName || unassigned.customer || 'Guest'} | Flight: ${unassigned.flight?.number || unassigned.flightNumber || unassigned.fno || 'Flight'} | Terminal: ${unassigned.flight?.terminal || unassigned.terminal || 'Terminal 1'}. Assigned to your shift.`,
          bookingId: unassigned.id,
          passengerName: unassigned.passengerName || unassigned.customer || 'Guest',
          flight: unassigned.flight?.number || unassigned.flightNumber || unassigned.fno || 'Flight',
          terminal: unassigned.flight?.terminal || unassigned.terminal || 'Terminal 1',
          lang,
        }).then(async () => {
          const updatedNotifs = await getStaffNotifications(currentStaffUser.id);
          setStaffNotifications(updatedNotifs);
        });
      } catch {}
      setCompletionNotice(lang ? `বুকিং ${unassigned.id} আপনার নামে বরাদ্দ করা হয়েছে!` : `Assigned booking ${unassigned.id} to your shift!`);
    } else {
      // Create a test booking
      const newTestBooking = {
        id: `DAC-${Math.floor(2000 + Math.random() * 8000)}`,
        customer: 'Sheikh Farhan',
        phone: '+8801712998877',
        email: 'farhan@test.com',
        nationality: 'Bangladeshi',
        airport: currentStaffInRoster.airport || 'DAC',
        fno: 'BG-085',
        airline: 'Biman Bangladesh Airlines',
        origin: 'London Heathrow (LHR)',
        destination: 'Dhaka (DAC)',
        terminal: currentStaffInRoster.station || 'Terminal 1',
        meetingPoint: 'Boarding Bridge Gate 2',
        direction: 'arrival',
        date: 'Today',
        time: '15:30',
        package: 'VIP First Class Protocol',
        service: 'VIP Arrival Concierge',
        passengers: 2,
        passengerBreakdown: { adults: 2, children: 0, elderly: 0 },
        amount: 3500,
        paymentStatus: 'paid',
        status: 'confirmed',
        staff: currentStaffUser.name,
        staffId: currentStaffUser.id,
        leadStaffId: currentStaffUser.id,
        leadStaffName: currentStaffUser.name,
        serviceProgress: createMilestonesProgress('arrival', 0),
        statusHistory: [{ status: 'confirmed', label: 'Booking Assigned', time: 'Today', note: 'Assigned for testing' }],
      };
      if (onUpdateBooking) {
        onUpdateBooking(newTestBooking.id, newTestBooking);
      }
      setCompletionNotice(lang ? 'নতুন টেস্ট বুকিং আপনার নামে তৈরি করা হয়েছে!' : 'New demo booking assigned to you!');
    }
    setTimeout(() => setCompletionNotice(''), 3500);
  };

  const activeCount = allAssignments.filter(b => getStatus(b) !== 'completed' && getStatus(b) !== 'cancelled').length;
  const completedCount = allAssignments.filter(b => getStatus(b) === 'completed').length;

  return (
    <ScrollView contentContainerStyle={s.staffPage}>
      {/* Staff App Header */}
      <View style={s.staffHeader}>
        <TouchableOpacity
          style={s.screenBackButton}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          onPress={handleBack}
        >
          <Text style={s.screenBackText}>{t('back')}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 160 }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 42, height: 42, resizeMode: 'contain' }}
          />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.staffEyebrow}>{lang ? 'প্রোটোকল স্টাফ পোর্টাল' : 'Protocol Staff Portal'}</Text>
            </View>
            <Text style={s.staffTitle}>{currentStaffUser.name}</Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>
              {currentStaffInRoster.role || 'Protocol Officer'} • 📍 {currentStaffInRoster.station || currentStaffInRoster.airport || airport.code}
            </Text>
          </View>
        </View>

        <View style={s.staffHeaderActions}>
          {/* Officer Notifications Bell Button */}
          {(() => {
            const unreadCount = (staffNotifications || []).filter(n => !n.read).length;
            return (
              <TouchableOpacity
                onPress={() => setShowStaffNotifsModal(true)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: unreadCount > 0 ? '#EFF6FF' : '#F8FAFC',
                  borderWidth: 1.5,
                  borderColor: unreadCount > 0 ? '#3B82F6' : '#E2E8F0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Text style={{ fontSize: 13 }}>🔔</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: unreadCount > 0 ? '#1D4ED8' : '#475569' }}>
                  {lang ? 'নোটিফিকেশন' : 'Alerts'}
                </Text>
                {unreadCount > 0 ? (
                  <View style={{ backgroundColor: '#DC2626', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 10 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>
                      {unreadCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })()}

          {/* Official Officer QR ID & Badge Pass Modal Button */}
          <TouchableOpacity
            onPress={() => setShowStaffIdCardModal(true)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: '#0F2A4A',
              borderWidth: 1,
              borderColor: '#1E3A8A',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 12 }}>🪪</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
              {lang ? 'আমার কিউআর আইডি' : 'My QR ID'}
            </Text>
          </TouchableOpacity>

          {/* Airport Directory Speed Dial Button */}
          <TouchableOpacity
            onPress={() => setShowSpeedDialModal(true)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 12 }}>📞</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>
              {lang ? 'স্পিড ডায়াল' : 'Speed Dial'}
            </Text>
          </TouchableOpacity>

          {/* Duty Status Quick Toggle */}
          <TouchableOpacity
            onPress={() => onToggleStaffDuty && onToggleStaffDuty(currentStaffInRoster.id)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: currentStaffInRoster.status === 'in_service' ? '#FEF3C7' : currentStaffInRoster.status === 'available' ? '#ECFDF5' : '#F1F5F9',
              borderWidth: 1,
              borderColor: currentStaffInRoster.status === 'in_service' ? '#FDE68A' : currentStaffInRoster.status === 'available' ? '#A7F3D0' : '#E2E8F0',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: currentStaffInRoster.status === 'in_service' ? '#D97706' : currentStaffInRoster.status === 'available' ? '#059669' : '#64748B' }}>
              {currentStaffInRoster.status === 'in_service' ? (lang ? '🟡 সেবায় ব্যস্ত' : '🟡 In Service') : currentStaffInRoster.status === 'available' ? (lang ? '🟢 প্রাপ্যতা' : '🟢 Available') : (lang ? '⚪ অফ-ডিউটি' : '⚪ Off Duty')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              if (staffSession?.token && !staffSession.token.startsWith('demo-staff-token')) {
                try {
                  await staffLogout(staffSession.token);
                } catch {}
              }
              setStaffSession(null);
              setStaffAssignments([]);
              setStaffFilter('all');
            }}
            style={{ paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text style={[s.link, { color: '#DC2626' }]}>{t('signOut')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notice Banner */}
      {completionNotice ? (
        <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#A7F3D0' }}>
          <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700' }}>✓ {completionNotice}</Text>
        </View>
      ) : null}

      {/* Daily Shift Operations Bulletin */}
      {shiftBriefing && (shiftBriefing.priorityNoticeBn || shiftBriefing.priorityNoticeEn) ? (
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 14,
            padding: 12,
            marginBottom: 14,
            borderLeftWidth: 4,
            borderLeftColor: '#F59E0B',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>📢</Text>
              <Text style={{ color: '#FBBF24', fontSize: 11.5, fontWeight: '900', letterSpacing: 0.5 }}>
                {lang ? 'অপারেশনাল শিফট ব্রিফিং' : 'SHIFT OPERATIONS BRIEFING'}
              </Text>
            </View>
            <Text style={{ color: '#94A3B8', fontSize: 10 }}>
              {shiftBriefing.managerName || 'Operations Director'}
            </Text>
          </View>
          <Text style={{ color: '#E2E8F0', fontSize: 12, lineHeight: 17, fontWeight: '500' }}>
            {lang ? (shiftBriefing.priorityNoticeBn || shiftBriefing.priorityNoticeEn) : (shiftBriefing.priorityNoticeEn || shiftBriefing.priorityNoticeBn)}
          </Text>
        </View>
      ) : null}

      {/* Staff KPI Summary */}
      <View style={s.staffSummary}>
        <View style={s.staffSummaryCell}>
          <Text style={s.staffSummaryValue}>{allAssignments.length}</Text>
          <Text style={s.staffSummaryLabel}>{lang ? 'মোট বরাদ্দ' : 'Total Assigned'}</Text>
        </View>
        <View style={s.staffSummaryDivider} />
        <View style={s.staffSummaryCell}>
          <Text style={[s.staffSummaryValue, { color: '#0284C7' }]}>{activeCount}</Text>
          <Text style={s.staffSummaryLabel}>{lang ? 'সক্রিয় / অপেক্ষমাণ' : 'Active Tasks'}</Text>
        </View>
        <View style={s.staffSummaryDivider} />
        <View style={s.staffSummaryCell}>
          <Text style={[s.staffSummaryValue, { color: '#16A34A' }]}>{completedCount}</Text>
          <Text style={s.staffSummaryLabel}>{lang ? 'সম্পন্ন সার্ভিস' : 'Completed'}</Text>
        </View>
        <View style={s.staffSummaryDivider} />
        <View style={s.staffSummaryCell}>
          <Text style={[s.staffSummaryValue, { color: '#D97706' }]}>
            {calculateOfficerPoints(currentStaffInRoster).totalPoints.toLocaleString()}
          </Text>
          <Text style={s.staffSummaryLabel}>{lang ? 'অর্জিত পয়েন্ট' : 'Earned Points'}</Text>
        </View>
      </View>

      {/* Officer 10-Rank Level & Progression Card */}
      {(() => {
        const offPts = calculateOfficerPoints(currentStaffInRoster);
        return (
          <View
            style={{
              backgroundColor: offPts.tierBgColor || '#FEF3C7',
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: offPts.tierBadgeColor || '#FDE68A',
              padding: 12,
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24 }}>{offPts.rankIcon || '🎖️'}</Text>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ backgroundColor: offPts.tierBadgeColor || '#0284C7', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 5 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '900' }}>
                        {lang ? `র‍্যাংক ${offPts.rankLevel}` : `Rank ${offPts.rankLevel}`}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F2A4A' }}>
                      {lang ? offPts.tierBn : offPts.tier}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    {lang ? `মোট অর্জিত পয়েন্ট: ${offPts.totalPoints.toLocaleString()} পয়েন্ট` : `Earned: ${offPts.totalPoints.toLocaleString()} pts`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowStaffRanksModal(true)}
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
                <Text style={{ fontSize: 11.5 }}>🎖️</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                  {lang ? '১০টি র‍্যাংক কাঠামো' : 'View 10 Ranks'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Next Rank Progress */}
            {offPts.rank?.nextRank && (
              <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, color: '#78350F', fontWeight: '700' }}>
                    {lang
                      ? `পরবর্তী র‍্যাংক [${offPts.rank.nextRank.badgeIcon} ${offPts.rank.nextRank.nameBn}] পৌঁছাতে আর ${offPts.pointsToNextRank.toLocaleString()} পয়েন্ট প্রয়োজন`
                      : `${offPts.pointsToNextRank.toLocaleString()} pts to next: ${offPts.rank.nextRank.badgeIcon} ${offPts.rank.nextRank.nameEn}`}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: offPts.tierBadgeColor || '#D97706' }}>
                    {offPts.progressPercent}%
                  </Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#FFFFFF', borderRadius: 3, overflow: 'hidden' }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(5, offPts.progressPercent))}%`,
                      backgroundColor: offPts.tierBadgeColor || '#D97706',
                      borderRadius: 3,
                    }}
                  />
                </View>
              </View>
            )}
          </View>
        );
      })()}

      {/* Filter Tabs */}
      <View style={s.staffFilters}>
        {[
          ['all', lang ? `সকল কাজ (${allAssignments.length})` : `All (${allAssignments.length})`],
          ['action', lang ? `সক্রিয় কাজ (${activeCount})` : `Needs Action (${activeCount})`],
          ['completed', lang ? `সম্পন্ন (${completedCount})` : `Completed (${completedCount})`],
        ].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.staffFilter, activeTabFilter === key && s.staffFilterActive]}
            onPress={() => setActiveTabFilter(key)}
          >
            <Text style={[s.staffFilterText, activeTabFilter === key && s.staffFilterTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Input */}
      <View style={{ marginBottom: 14 }}>
        <TextInput
          style={[s.in, { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }]}
          placeholder={lang ? '🔍 যাত্রী, বুকিং আইডি বা ফ্লাইট নম্বর দিয়ে খুঁজুন...' : '🔍 Search by passenger name, booking ID, or flight...'}
          value={searchInput}
          onChangeText={setSearchInput}
        />
      </View>

      {/* Empty State */}
      {allAssignments.length === 0 ? (
        <View style={{ padding: 36, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginVertical: 10 }}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>📭</Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
            {lang ? 'বর্তমানে কোনো বুকিং বরাদ্দ নেই' : 'No bookings currently assigned'}
          </Text>
          <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 14 }}>
            {lang
              ? 'অ্যাডমিন প্যানেল থেকে আপনার নামে বুকিং বরাদ্দ দিলে এখানে তা দেখতে পাবেন।'
              : 'When the administrator assigns protocol services to your shift, they will appear here.'}
          </Text>
          <TouchableOpacity
            onPress={handleAssignDemoTestBooking}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: '#0284C7',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
              ⚡ {lang ? 'টেস্ট বুকিং যুক্ত করুন' : 'Assign Sample Test Booking to Me'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {allAssignments.length > 0 && visibleAssignments.length === 0 ? (
        <View style={{ padding: 24, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, marginVertical: 10 }}>
          <Text style={{ fontSize: 14, color: '#64748B' }}>
            {lang ? 'এই ফিল্টারে কোনো বুকিং পাওয়া যায়নি।' : 'No assignments found in this view.'}
          </Text>
        </View>
      ) : null}

      {/* Assigned Bookings List */}
      {visibleAssignments.map(assignment => {
        const rawStatus = getStatus(assignment);
        const bookingId = assignment.id || assignment.reference || 'FC-BOOKING';
        const direction = assignment.direction || (assignment.service_category === 'departure' ? 'departure' : 'arrival');
        const customerName = assignment.customer || assignment.passengerName || assignment.passenger_information?.name || 'Valued Passenger';
        const customerPhone = assignment.phone || assignment.passengerPhone || assignment.passenger_information?.phone || '+8801700000000';
        const customerEmail = assignment.email || assignment.passengerEmail || 'passenger@flightcare.com';
        const flightNo = assignment.fno || assignment.flight?.number || 'BG-001';
        const airlineName = assignment.airline || assignment.flight?.airline || 'Biman Bangladesh Airlines';
        const flightDate = assignment.date || assignment.flight?.date || 'Today';
        const flightTime = assignment.time || assignment.flight?.time || '14:00';
        const terminalName = assignment.terminal || assignment.flight?.terminal || 'Terminal 1';
        const meetingPoint = assignment.meetingPoint || (direction === 'arrival' ? 'Boarding Bridge Gate' : 'Departure Curb');
        const packageName = assignment.package || assignment.pkg?.t || 'VIP Airport Protocol';
        const passengersCount = assignment.passengers || assignment.passenger_count || 1;
        const addonsList = Array.isArray(assignment.addons) ? assignment.addons : [];

        // Milestones
        const milestones = assignment.serviceProgress || createMilestonesProgress(direction, 0);
        const completedMilestones = milestones.filter(m => m.status === 'completed').length;
        const milestonePercent = Math.round((completedMilestones / milestones.length) * 100);

        const isCompleted = rawStatus === 'completed';
        const isInProgress = rawStatus === 'in_progress';
        const isAccepted = rawStatus === 'accepted';
        const isAssigned = ['assigned', 'confirmed', 'upcoming', 'pending', 'new'].includes(rawStatus);

        return (
          <View key={bookingId} style={[s.staffAssignment, { borderRadius: 16, borderWidth: 1.5, borderColor: isCompleted ? '#BBF7D0' : isInProgress ? '#BAE6FD' : '#E2E8F0', padding: 16 }]}>
            {/* Card Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>{bookingId}</Text>
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: direction === 'arrival' ? '#EFF6FF' : '#FDF2F8' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: direction === 'arrival' ? '#0284C7' : '#DB2777' }}>
                      {direction === 'arrival' ? '🛬 Arrival' : '🛫 Departure'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0284C7', marginTop: 2 }}>
                  {packageName}
                </Text>
              </View>

              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: isCompleted ? '#DCFCE7' : isInProgress ? '#FEF3C7' : isAccepted ? '#F3E8FF' : '#E0F2FE' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: isCompleted ? '#16A34A' : isInProgress ? '#D97706' : isAccepted ? '#9333EA' : '#0284C7' }}>
                  {statusLabel(rawStatus)}
                </Text>
              </View>
            </View>

            {/* Payment & Bill Collection Status Banner */}
            {(assignment.paymentStatus === 'pay_after_service' || assignment.paidMethod === 'pay_after_service' || assignment.method === 'pay_after_service') && (
              <View
                style={{
                  backgroundColor: assignment.paymentStatus === 'paid' ? '#ECFDF5' : '#FEF3C7',
                  borderWidth: 1.5,
                  borderColor: assignment.paymentStatus === 'paid' ? '#A7F3D0' : '#F59E0B',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16 }}>🤝</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: assignment.paymentStatus === 'paid' ? '#065F46' : '#92400E' }}>
                      {assignment.paymentStatus === 'paid'
                        ? (lang ? 'বিল সংগ্রহ সম্পন্ন (Verified Paid)' : 'Bill Collected (Verified Paid)')
                        : (lang ? 'সার্ভিস সমাপ্তির পরে পেমেন্ট সংগ্রহ' : 'Payment Collection Due After Service')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, color: assignment.paymentStatus === 'paid' ? '#047857' : '#B45309', marginTop: 2 }}>
                    {assignment.paymentStatus === 'paid'
                      ? (lang ? `৳${assignment.amount || 0} ক্যাশ/ডিজিটাল মাধ্যমে সংগৃহীত হয়েছে` : `৳${assignment.amount || 0} collected successfully`)
                      : (lang ? `যাত্রীর নিকট থেকে ৳${assignment.amount || 0} ক্যাশ বা ডিজিটাল মাধ্যমে সংগ্রহ করুন` : `Collect ৳${assignment.amount || 0} in cash or digital payment after service`)}
                  </Text>
                </View>
                {assignment.paymentStatus !== 'paid' && (
                  <TouchableOpacity
                    onPress={() => {
                      if (onUpdateBooking) {
                        onUpdateBooking(assignment.id, {
                          ...assignment,
                          paymentStatus: 'paid',
                          paymentCollectedAt: new Date().toISOString(),
                          paymentCollectedBy: currentStaffUser.name,
                        });
                      }
                      setCompletionNotice(lang ? `বুকিং #${bookingId} এর বিল সংগ্রহ নিশ্চিত করা হয়েছে!` : `Payment collected for #${bookingId}!`);
                      setTimeout(() => setCompletionNotice(''), 3000);
                    }}
                    style={{
                      backgroundColor: '#D97706',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>
                      ✓ {lang ? 'পেমেন্ট সংগ্রহ সম্পন্ন' : 'Mark Collected'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* SECTION 1: Passenger Details (Requirement 27) */}
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  👤 {lang ? 'যাত্রীর বিবরণ' : 'Passenger Details'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedPlacardBooking(assignment)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: '#0F172A',
                      borderWidth: 1,
                      borderColor: '#D4AF37',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 11 }}>📱</Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FBBF24' }}>
                      {lang ? 'নেমবোর্ড' : 'Placard'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleCallPassenger(customerPhone)}
                    style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7' }}>📞 {lang ? 'কল' : 'Call'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleWhatsAppPassenger(customerPhone)}
                    style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                  {customerName} <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>({passengersCount} {lang ? 'জন যাত্রী' : 'passengers'})</Text>
                </Text>
                <Text style={{ fontSize: 12.5, color: '#334155' }}>
                  📞 {customerPhone} • ✉️ {customerEmail}
                </Text>
                {assignment.remarks || assignment.staffNotes ? (
                  <View style={{ backgroundColor: '#FFFBEB', padding: 8, borderRadius: 6, marginTop: 4, borderWidth: 1, borderColor: '#FDE68A' }}>
                    <Text style={{ fontSize: 11.5, color: '#92400E', fontWeight: '600' }}>
                      📝 {assignment.remarks || assignment.staffNotes}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* SECTION 2: Flight Details (Requirement 27) */}
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                ✈️ {lang ? 'ফ্লাইটের বিবরণ' : 'Flight Details'}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                    {airlineName} ({flightNo})
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                    📍 {terminalName} • Meeting: {meetingPoint}
                  </Text>
                  {assignment.gate ? (
                    <Text style={{ fontSize: 11.5, color: '#059669', fontWeight: '700', marginTop: 1 }}>
                      🚪 {lang ? 'বোর্ডিং গেট:' : 'Gate:'} {assignment.gate}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>
                    📅 {flightDate}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                    ⏰ {flightTime}
                  </Text>
                </View>
              </View>
              {assignment.flightStatus && assignment.flightStatus !== 'On Time' && (
                <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13 }}>⚠️</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>
                    {assignment.flightStatus} {assignment.gate ? `• Gate: ${assignment.gate}` : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* SECTION 3: Service Details (Requirement 27) */}
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                🛎️ {lang ? 'সার্ভিসের বিবরণ' : 'Service Details'}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                {packageName}
              </Text>
              {addonsList.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {addonsList.map(ad => {
                    const asset = getAddonAsset(ad);
                    return (
                      <View key={ad} style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, backgroundColor: '#E0F2FE', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        {asset ? (
                          <Image source={asset} style={{ width: 14, height: 14, borderRadius: 2 }} resizeMode="contain" />
                        ) : null}
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0284C7' }}>＋ {ad}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>

            {/* SECTION 3B: Baggage Claim Tags (Dedicated Tag Tracking) */}
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  🏷️ {lang ? 'ব্যাগেজ ক্লেইম ট্যাগ নম্বর' : 'Baggage Claim Tags'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (editingBaggageBookingId === assignment.id) {
                      setEditingBaggageBookingId(null);
                    } else {
                      setEditingBaggageBookingId(assignment.id);
                      setBaggageInputText(assignment.baggageTags || '');
                    }
                  }}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: '#EFF6FF',
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7' }}>
                    {editingBaggageBookingId === assignment.id ? (lang ? 'বাতিল' : 'Cancel') : (lang ? 'ট্যাগ সম্পাদনা' : 'Edit Tags')}
                  </Text>
                </TouchableOpacity>
              </View>

              {editingBaggageBookingId === assignment.id ? (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <TextInput
                    style={[s.in, { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#0284C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 }]}
                    placeholder={lang ? 'যেমন: BG-084-77281, BG-084-77282' : 'e.g., BG-084-77281, BG-084-77282'}
                    value={baggageInputText}
                    onChangeText={setBaggageInputText}
                    autoCapitalize="characters"
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => handleSaveBaggageTags(assignment.id)}
                      style={{
                        backgroundColor: '#0284C7',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                        💾 {lang ? 'ট্যাগ সংরক্ষণ করুন' : 'Save Tags'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 2 }}>
                  {assignment.baggageTags && assignment.baggageTags.trim() ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      {assignment.baggageTags
                        .split(/[,;\s]+/)
                        .filter(Boolean)
                        .map((tag, tagIdx) => (
                          <View
                            key={tagIdx}
                            style={{
                              backgroundColor: '#E0F2FE',
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: '#BAE6FD',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Text style={{ fontSize: 11 }}>🏷️</Text>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0369A1' }}>{tag}</Text>
                          </View>
                        ))}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                      {lang ? 'কোনো ব্যাগেজ ট্যাগ যুক্ত করা হয়নি (এয়ারপোর্টে লাগেজ ট্র্যাকিংয়ের জন্য ট্যাগ নম্বর যুক্ত করুন)' : 'No luggage tags recorded yet. Add tags for airport claim tracking.'}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* SECTION 4: Service Execution Milestones (Requirements 27: Accept, Start, Update Progress, Complete) */}
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                  ⚡ {lang ? 'সার্ভিস বাস্তবায়ন অগ্রগতি:' : 'Execution Milestones:'}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: milestonePercent === 100 ? '#16A34A' : '#0284C7' }}>
                  {completedMilestones} of {milestones.length} ({milestonePercent}%)
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                <View style={{ width: `${milestonePercent}%`, height: '100%', backgroundColor: milestonePercent === 100 ? '#16A34A' : '#0284C7', borderRadius: 4 }} />
              </View>

              {/* Step Status Badges */}
              <View style={s.staffProgressTrack}>
                {['assigned', 'accepted', 'in_progress', 'completed'].map((step, index) => {
                  const stepIndex = ['assigned', 'accepted', 'in_progress', 'completed'].indexOf(rawStatus);
                  const isPassed = stepIndex >= index;
                  return (
                    <View key={step} style={s.staffProgressStep}>
                      <View style={[s.staffProgressDot, isPassed && s.staffProgressDotOn]} />
                      <Text style={[s.staffProgressLabel, isPassed && s.staffProgressLabelOn]}>
                        {statusLabel(step)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Interactive Milestones Checklist (Shown when accepted or in-progress) */}
              {(isInProgress || isAccepted) && (
                <View style={{ marginTop: 10, gap: 6 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', marginBottom: 2 }}>
                    {lang ? 'ধাপগুলো সম্পন্ন হলে টিক দিন:' : 'Tap any step to mark as completed:'}
                  </Text>
                  {milestones.map((m, idx) => {
                    const isDone = m.status === 'completed';
                    const isStepCurrent = m.status === 'in_progress';
                    return (
                      <TouchableOpacity
                        key={m.id || idx}
                        onPress={() => handleToggleMilestone(assignment, idx)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          borderRadius: 10,
                          backgroundColor: isDone ? '#F0FDF4' : isStepCurrent ? '#FFFBEB' : '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: isDone ? '#BBF7D0' : isStepCurrent ? '#FDE68A' : '#E2E8F0',
                          gap: 10,
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: isDone ? '#16A34A' : '#FFFFFF',
                            borderWidth: 1.5,
                            borderColor: isDone ? '#16A34A' : '#CBD5E1',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isDone ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text> : null}
                        </View>
                        <Text style={{ fontSize: 16 }}>{m.icon || '📍'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12.5, fontWeight: isDone ? '800' : '600', color: isDone ? '#166534' : isStepCurrent ? '#92400E' : '#334155' }}>
                            {idx + 1}. {lang ? (m.labelBn || m.labelEn) : m.labelEn}
                          </Text>
                          {m.completedAt ? (
                            <Text style={{ fontSize: 10.5, color: '#16A34A', fontWeight: '700' }}>
                              Completed at {m.completedAt}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isDone ? '#16A34A' : '#0284C7' }}>
                          {isDone ? (lang ? 'সম্পন্ন ✓' : 'Done ✓') : (lang ? 'সম্পন্ন করুন' : 'Mark Done')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Mutual Real-time Tracking & Radar Button */}
            <View
              style={{
                marginBottom: 12,
                padding: 12,
                backgroundColor: '#F0F9FF',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#BAE6FD',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <View style={{ flex: 1, minWidth: 160 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0369A1' }}>
                    📍 {lang ? 'পারস্পরিক লাইভ লোকেশন ও রাডার' : 'Mutual Live Radar & GPS'}
                  </Text>
                  <View style={{ backgroundColor: '#0284C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>ACTIVE</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11.5, color: '#0284C7', marginTop: 2 }}>
                  {lang
                    ? 'যাত্রী ও আপনার টার্মিনাল লোকেশন, পারস্পরিক দূরত্ব ও ওয়াকিং ETA দেখুন'
                    : 'Track passenger location, mutual distance & walking ETA in real-time'}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setTrackingAssignment(assignment)}
                style={{
                  backgroundColor: '#0284C7',
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  shadowColor: '#0284C7',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                }}
              >
                <Text style={{ fontSize: 13 }}>📡</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                  {lang ? 'লাইভ রাডার খুলুন' : 'Open Live Radar'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Workflow Action Buttons */}

            {isAssigned && (
              <TouchableOpacity
                onPress={() => handleAcceptService(assignment)}
                style={{
                  backgroundColor: '#9333EA',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  shadowColor: '#9333EA',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                  🤝 {lang ? 'অ্যাসাইনমেন্ট গ্রহণ করুন (Accept)' : 'Accept Assigned Service'}
                </Text>
              </TouchableOpacity>
            )}

            {isAccepted && (
              <TouchableOpacity
                onPress={() => handleStartService(assignment)}
                style={{
                  backgroundColor: '#0284C7',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  shadowColor: '#0284C7',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                  🚀 {lang ? 'সার্ভিস শুরু করুন (গেটে অবস্থান)' : 'Start Service (Station at Gate)'}
                </Text>
              </TouchableOpacity>
            )}

            {isInProgress && (
              <TouchableOpacity
                onPress={() => handleOpenCompleteServiceModal(assignment)}
                style={{
                  backgroundColor: '#16A34A',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  shadowColor: '#16A34A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                  ✅ {lang ? 'সার্ভিস সমাপ্ত ও হস্তান্তর সম্পন্ন করুন' : 'Complete Service & Handover'}
                </Text>
              </TouchableOpacity>
            )}

            {isCompleted && (
              <View style={{ backgroundColor: '#F0FDF4', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'center' }}>
                <Text style={{ color: '#166534', fontSize: 13, fontWeight: '800' }}>
                  🎉 {lang ? 'এই প্রোটোকল সার্ভিসটি সফলভাবে সম্পন্ন হয়েছে।' : 'Service successfully executed and concluded!'}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Enhanced Completion & Handover Verification Modal */}
      <Modal
        visible={Boolean(completingBooking)}
        transparent
        animationType="fade"
        onRequestClose={() => setCompletingBooking(null)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxWidth: 540, width: '94%', padding: 22, maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {completingBooking && (
                <>
                  {/* Modal Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 22 }}>✅</Text>
                    <Text style={[s.h2, { fontSize: 18, marginBottom: 0 }]}>
                      {lang ? 'সার্ভিস সমাপ্তি ও হস্তান্তর নিশ্চিতকরণ' : 'Complete Service & Final Handover'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12.5, color: '#64748B', marginBottom: 14 }}>
                    {completingBooking.id} • {completingBooking.customer} ({completingBooking.airline} {completingBooking.fno})
                  </Text>

                  {/* 1. Mandatory Pre-Completion Safety Checklist (Requirement 27) */}
                  <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      🛡️ {lang ? 'বাধ্যতামূলক নিরাপত্তা চেকলিস্ট (Double Confirmation):' : 'Mandatory Safety Double Confirmation:'}
                    </Text>

                    {/* Luggage Checkbox */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setSafetyLuggageChecked(!safetyLuggageChecked);
                        setCompletionError('');
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          borderWidth: 2,
                          borderColor: safetyLuggageChecked ? '#16A34A' : '#94A3B8',
                          backgroundColor: safetyLuggageChecked ? '#16A34A' : '#FFFFFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {safetyLuggageChecked ? <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>✓</Text> : null}
                      </View>
                      <Text style={{ fontSize: 12.5, fontWeight: safetyLuggageChecked ? '700' : '500', color: '#1E293B', flex: 1 }}>
                        🧳 {lang ? 'সকল লাগেজ ও ব্যাগেজ ক্লেইম ট্যাগ হস্তান্তর সম্পন্ন হয়েছে' : 'All checked luggage accounted for and handed over'}
                      </Text>
                    </TouchableOpacity>

                    {/* Passenger Escort Checkbox */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setSafetyEscortChecked(!safetyEscortChecked);
                        setCompletionError('');
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          borderWidth: 2,
                          borderColor: safetyEscortChecked ? '#16A34A' : '#94A3B8',
                          backgroundColor: safetyEscortChecked ? '#16A34A' : '#FFFFFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {safetyEscortChecked ? <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>✓</Text> : null}
                      </View>
                      <Text style={{ fontSize: 12.5, fontWeight: safetyEscortChecked ? '700' : '500', color: '#1E293B', flex: 1 }}>
                        🚶 {lang ? 'যাত্রীকে নিরাপদে কার্বসাইড গাড়ি / টার্মিনাল গেট পর্যন্ত পৌঁছে দেওয়া হয়েছে' : 'Passenger safely escorted to vehicle curbside / boarding gate'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* 2. Passenger Handover Verification (Dual Mode: Signature Pad vs Handover OTP) */}
                  <View style={{ backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1.5, borderColor: '#BAE6FD' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        🔐 {lang ? 'যাত্রী হস্তান্তর যাচাইকরণ' : 'Passenger Handover Verification'}
                      </Text>

                      {/* Mode Switcher Tabs */}
                      <View style={{ flexDirection: 'row', backgroundColor: '#E0F2FE', borderRadius: 8, padding: 2 }}>
                        <TouchableOpacity
                          onPress={() => setHandoverMode('signature')}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: handoverMode === 'signature' ? '#FFFFFF' : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: handoverMode === 'signature' ? '#0284C7' : '#64748B' }}>
                            ✍️ {lang ? 'ডিজিটাল স্বাক্ষর' : 'Signature'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setHandoverMode('otp')}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: handoverMode === 'otp' ? '#FFFFFF' : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: handoverMode === 'otp' ? '#0284C7' : '#64748B' }}>
                            🔢 {lang ? 'ভাউচার ওটিপি' : 'OTP Code'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Mode A: Interactive Digital Touch Signature Pad */}
                    {handoverMode === 'signature' ? (
                      <View>
                        <Text style={{ fontSize: 11.5, color: '#0284C7', marginBottom: 6 }}>
                          {lang
                            ? 'যাত্রীকে অফিসারের ডিভাইসে আঙুল বা মাউস দিয়ে স্বাক্ষর প্রদান করতে বলুন:'
                            : 'Ask passenger to sign on screen directly using finger or mouse:'}
                        </Text>

                        {Platform.OS === 'web' ? (
                          React.createElement('canvas', {
                            ref: canvasRef,
                            width: 440,
                            height: 120,
                            style: {
                              width: '100%',
                              height: 120,
                              backgroundColor: '#FFFFFF',
                              borderRadius: 8,
                              border: hasSignature ? '2px solid #16A34A' : '1.5px dashed #94A3B8',
                              touchAction: 'none',
                              cursor: 'crosshair',
                              display: 'block',
                            },
                            onMouseDown: startDrawing,
                            onMouseMove: draw,
                            onMouseUp: stopDrawing,
                            onMouseLeave: stopDrawing,
                            onTouchStart: startDrawing,
                            onTouchMove: draw,
                            onTouchEnd: stopDrawing,
                          })
                        ) : (
                          <View style={{ height: 100, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1.5, borderColor: '#94A3B8', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 13, color: '#64748B' }}>
                              {lang ? 'মোবাইলে ওটিপি মোড ব্যবহার করুন' : 'Please use Handover OTP mode on mobile build'}
                            </Text>
                          </View>
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: hasSignature ? '#16A34A' : '#94A3B8' }} />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: hasSignature ? '#16A34A' : '#64748B' }}>
                              {hasSignature ? (lang ? 'স্বাক্ষর গৃহীত হয়েছে ✓' : 'Signature Captured ✓') : (lang ? 'স্বাক্ষরের অপেক্ষায়...' : 'Awaiting passenger signature...')}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={clearSignature}
                            style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#E2E8F0' }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                              🧹 {lang ? 'স্বাক্ষর মুছুন' : 'Clear Pad'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      /* Mode B: 4-Digit Handover OTP Verification */
                      <View>
                        {/* Instant SMS Dispatch Action */}
                        <TouchableOpacity
                          onPress={handleSendHandoverOtpSms}
                          disabled={sendingHandoverSms}
                          style={{
                            backgroundColor: '#F0F9FF',
                            borderWidth: 1.2,
                            borderColor: '#BAE6FD',
                            paddingVertical: 7,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            marginBottom: 10,
                          }}
                        >
                          <Text style={{ fontSize: 13 }}>📲</Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#0369A1' }}>
                            {sendingHandoverSms
                              ? (lang ? 'এসএমএস পাঠানো হচ্ছে...' : 'Sending SMS...')
                              : (lang
                                  ? `যাত্রীর মোবাইলে ওটিপি SMS পাঠান (${completingBooking?.phone || 'ফোন'})`
                                  : `Send OTP via SMS to Passenger (${completingBooking?.phone || 'Phone'})`)}
                          </Text>
                        </TouchableOpacity>

                        {handoverSmsNotice ? (
                          <View style={{ backgroundColor: '#F0FDF4', padding: 8, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#15803D' }}>
                              {handoverSmsNotice}
                            </Text>
                          </View>
                        ) : null}

                        <Text style={{ fontSize: 11.5, color: '#0284C7', marginBottom: 6 }}>
                          {lang
                            ? 'যাত্রীর বুকিং ভাউচার বা এসএমএস-এ পাঠানো ৪-ডিজিটের হ্যান্ডওভার কোড দিন:'
                            : 'Enter 4-digit handover code from passenger voucher or confirmation SMS:'}
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TextInput
                            style={[
                              s.in,
                              {
                                backgroundColor: '#FFFFFF',
                                flex: 1,
                                height: 42,
                                textAlign: 'center',
                                fontSize: 18,
                                fontWeight: '800',
                                letterSpacing: 4,
                                borderWidth: 1.5,
                                borderColor: handoverOtpVerified ? '#16A34A' : '#94A3B8',
                              },
                            ]}
                            placeholder="0000"
                            value={handoverOtpInput}
                            onChangeText={(val) => {
                              setHandoverOtpInput(val);
                              setHandoverOtpError('');
                            }}
                            keyboardType="number-pad"
                            maxLength={4}
                          />

                          <TouchableOpacity
                            onPress={handleVerifyOtp}
                            style={{
                              backgroundColor: handoverOtpVerified ? '#16A34A' : '#0284C7',
                              paddingHorizontal: 14,
                              height: 42,
                              borderRadius: 8,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                              {handoverOtpVerified ? '✓ ' + (lang ? 'যাচাইকৃত' : 'Verified') : (lang ? 'কোড যাচাই' : 'Verify Code')}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                          <Text style={{ fontSize: 11, color: '#64748B' }}>
                            {lang ? `(ডেমো টেস্ট কোড: ${getBookingExpectedOtp(completingBooking)})` : `(Demo Passenger Code: ${getBookingExpectedOtp(completingBooking)})`}
                          </Text>
                          {handoverOtpVerified ? (
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>
                              ✓ {lang ? 'কোড সফলভাবে মিলেছে' : 'Code Matched & Verified'}
                            </Text>
                          ) : null}
                        </View>

                        {handoverOtpError ? (
                          <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700', marginTop: 4 }}>
                            ⚠️ {handoverOtpError}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>

                  {/* 3. Handover Notes */}
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                    📝 {lang ? 'হস্তান্তর সংক্রান্ত নোট বা সমাপ্তি মন্তব্য:' : 'Handover Remarks / Service Notes:'}
                  </Text>
                  <TextInput
                    style={[s.in, { backgroundColor: '#F8FAFC', height: 70, textAlignVertical: 'top' }]}
                    placeholder={lang ? 'যেমন: যাত্রীকে নিরাপদে গাড়িতে তুলে দেওয়া হয়েছে, ৩টি লাগেজ বুঝিয়ে দেওয়া হয়েছে...' : 'e.g., Passenger safely escorted to vehicle, luggage loaded, driver received...'}
                    value={completionNotes}
                    onChangeText={setCompletionNotes}
                    multiline
                  />

                  {/* Warning Notice Banner */}
                  <View style={{ backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
                    <Text style={{ fontSize: 11.5, color: '#92400E', fontWeight: '600' }}>
                      ⚠️ {lang ? 'সতর্কতা: সমাপ্তি নিশ্চিত করলে অফিসারের এই সেবার সক্রিয় নজরদারি সম্পন্ন হিসেবে আর্কাইভ হবে।' : 'Notice: Confirming completion archives officer active duty and logs conclusive timestamps.'}
                    </Text>
                  </View>

                  {/* Error banner if incomplete */}
                  {completionError ? (
                    <View style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#FEE2E2' }}>
                      <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '700' }}>
                        ⚠️ {completionError}
                      </Text>
                    </View>
                  ) : null}

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                    <TouchableOpacity
                      onPress={() => setCompletingBooking(null)}
                      style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: '#E2E8F0' }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155' }}>{lang ? 'বাতিল' : 'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleConfirmCompleteService}
                      style={{ paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8, backgroundColor: '#16A34A' }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>✓ {lang ? 'সম্পন্ন ও হস্তান্তর নিশ্চিত করুন' : 'Confirm Complete & Handover'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Officer Off-Duty Warning Modal */}
      <Modal
        visible={Boolean(offDutyNotice)}
        transparent
        animationType="fade"
        onRequestClose={() => setOffDutyNotice(null)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxWidth: 440, width: '92%', padding: 22 }]}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#FEE2E2' }}>
                <Text style={{ fontSize: 28 }}>🛑</Text>
              </View>
              <Text style={[s.h2, { fontSize: 18, textAlign: 'center', marginBottom: 6, color: '#991B1B' }]}>
                {lang ? 'অফ-ডিউটি লক সক্রিয়' : 'Officer Off-Duty Lock'}
              </Text>
              <Text style={{ fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 18 }}>
                {lang
                  ? 'আপনি বর্তমানে "অফ-ডিউটি" অবস্থায় আছেন। এয়ারপোর্টে প্রোটোকল সার্ভিস গ্রহণ বা শুরু করতে হলে আপনার ডিউটি স্ট্যাটাস "অন-ডিউটি (Available)" হতে হবে।'
                  : 'You are currently marked as "Off Duty". To accept or start protocol duties at the airport, you must switch your shift status to "On Duty (Available)".'}
              </Text>
            </View>

            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                📋 {lang ? 'উদ্দিষ্ট বুকিং:' : 'Target Booking:'} {offDutyNotice?.booking?.id}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                {lang ? 'কর্মকাণ্ড:' : 'Action:'} {offDutyNotice?.action === 'accept' ? (lang ? 'সার্ভিস গ্রহণ' : 'Accept Assignment') : (lang ? 'সার্ভিস শুরু' : 'Start Service')}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setOffDutyNotice(null)}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                  {lang ? 'বাতিল' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (onToggleStaffDuty) {
                    onToggleStaffDuty(currentStaffInRoster.id);
                  }
                  const notice = offDutyNotice;
                  setOffDutyNotice(null);
                  if (notice) {
                    if (notice.action === 'accept') {
                      executeAcceptService(notice.booking);
                    } else if (notice.action === 'start') {
                      executeStartService(notice.booking);
                    }
                  }
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#059669', flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  🟢 {lang ? 'অন-ডিউটি করুন ও এগিয়ে যান' : 'Switch to On-Duty & Proceed'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete & Handover Final Confirmation Prompt Modal */}
      <Modal
        visible={showCompleteConfirmPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteConfirmPrompt(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxWidth: 440, width: '92%', padding: 22 }]}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#FEF3C7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: '#FDE68A',
                }}
              >
                <Text style={{ fontSize: 26 }}>⚠️</Text>
              </View>
              <Text style={[s.h2, { fontSize: 18, textAlign: 'center', marginBottom: 6, color: '#92400E' }]}>
                {lang ? 'সার্ভিস সমাপ্তি চূড়ান্তকরণ নিশ্চিত করুন' : 'Confirm Service Finalization'}
              </Text>
              <Text style={{ fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 18 }}>
                {lang
                  ? 'আপনি কি নিশ্চিত যে এই প্রোটোকল সার্ভিসটি চূড়ান্তভাবে সম্পন্ন ও হস্তান্তর করতে চান?'
                  : 'Are you sure you want to finalize and archive this protocol service handover?'}
              </Text>
            </View>

            {completingBooking && (
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                  📋 {lang ? 'বুকিং রেফারেন্স:' : 'Booking Ref:'} #{completingBooking.id}
                </Text>
                <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  👤 {lang ? 'যাত্রী:' : 'Passenger:'} {completingBooking.customer || completingBooking.passengerName || 'Guest'}
                </Text>
                <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  ✈️ {lang ? 'ফ্লাইট:' : 'Flight:'} {completingBooking.fno || completingBooking.flight?.number || 'TBD'}
                </Text>
                <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600', marginTop: 6 }}>
                  ⚠️ {lang ? 'চূড়ান্ত করার পর এই অ্যাসাইনমেন্ট সম্পন্ন হিসেবে আর্কাইভ হবে এবং অ্যাক্টিভ মনিটরিং শেষ হবে।' : 'Once finalized, active monitoring ends and conclusive timestamps are permanently archived.'}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowCompleteConfirmPrompt(false)}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                  {lang ? 'বাতিল' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={finalizeCompleteService}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#16A34A',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  ✓ {lang ? 'হ্যাঁ, চূড়ান্ত সম্পন্ন করুন' : 'Yes, Finalize Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 6-Second Undo Toast Notification */}
      {undoAction ? (
        <View
          style={{
            position: Platform.OS === 'web' ? 'fixed' : 'absolute',
            bottom: 24,
            left: 20,
            right: 20,
            maxWidth: 520,
            marginHorizontal: 'auto',
            backgroundColor: '#0F172A',
            borderRadius: 14,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
            borderWidth: 1,
            borderColor: '#334155',
            zIndex: 9999,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#1E293B',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#475569',
              }}
            >
              <Text style={{ fontSize: 16 }}>⏱️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  {undoAction.label}
                </Text>
                <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                    {undoAction.secondsLeft}s
                  </Text>
                </View>
              </View>
              <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
                {lang
                  ? 'ভুলবশত ক্লিক হয়ে থাকলে পূর্বের অবস্থায় ফিরিয়ে নিন।'
                  : 'Accidental click? You can revert to previous status.'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={handleUndoAction}
              style={{
                backgroundColor: '#DC2626',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                ↩️ {lang ? 'আনডু (Undo)' : 'Undo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (undoTimerRef.current) {
                  clearInterval(undoTimerRef.current);
                  undoTimerRef.current = null;
                }
                setUndoAction(null);
              }}
              style={{
                padding: 6,
                borderRadius: 6,
                backgroundColor: '#1E293B',
              }}
            >
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Officer Live Tracking Radar Modal */}
      {trackingAssignment ? (
        <LiveTrackingModal
          visible={!!trackingAssignment}
          onClose={() => setTrackingAssignment(null)}
          booking={trackingAssignment}
          mode="officer"
          lang={lang}
          staffOverride={currentStaffInRoster}
        />
      ) : null}

      {/* 10-Tier Protocol Officer Ranks Modal */}
      <ProtocolRanksModal
        visible={showStaffRanksModal}
        onClose={() => setShowStaffRanksModal(false)}
        lang={lang}
        currentOfficer={currentStaffInRoster}
      />

      {/* Full-Screen Digital VIP Welcome Placard (Nameboard) */}
      <VipPlacardModal
        visible={!!selectedPlacardBooking}
        onClose={() => setSelectedPlacardBooking(null)}
        booking={selectedPlacardBooking}
        lang={lang}
      />

      {/* Airport Station Intercom & Speed Dial Directory */}
      <AirportEmergencyDialModal
        visible={showSpeedDialModal}
        onClose={() => setShowSpeedDialModal(false)}
        lang={lang}
      />

      {/* Protocol Officer Notification Center Modal */}
      <Modal
        visible={showStaffNotifsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStaffNotifsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 14 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 660, maxHeight: '90%', overflow: 'hidden', borderWidth: 1.5, borderColor: '#CBD5E1', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 12 }}>
            {/* Modal Header */}
            <View style={{ backgroundColor: '#0F2A4A', paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 20 }}>🔔</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF' }}>
                    {lang ? 'প্রোটোকল অফিসার নোটিফিকেশন' : 'Protocol Officer Notifications'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#93C5FD', marginTop: 1 }}>
                    {currentStaffUser.name} • {currentStaffInRoster.role || 'Protocol Officer'} ({currentStaffUser.id})
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowStaffNotifsModal(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Tabs & Quick Actions Bar */}
            {(() => {
              const allList = staffNotifications || [];
              const assignmentCount = allList.filter(n => n.type === STAFF_NOTIFICATION_TYPES.ASSIGNMENT).length;
              const completedCount = allList.filter(n => n.type === STAFF_NOTIFICATION_TYPES.SERVICE_COMPLETED).length;
              const reviewCount = allList.filter(n => n.type === STAFF_NOTIFICATION_TYPES.CUSTOMER_REVIEW).length;
              const unreadTotal = allList.filter(n => !n.read).length;

              const filteredList = allList.filter(n => {
                if (notifsTabFilter === 'all') return true;
                return n.type === notifsTabFilter;
              });

              return (
                <View style={{ flex: 1 }}>
                  {/* Tabs Bar */}
                  <View style={{ backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        ['all', lang ? `সকল (${allList.length})` : `All (${allList.length})`],
                        [STAFF_NOTIFICATION_TYPES.ASSIGNMENT, lang ? `🚨 অ্যাসাইনমেন্ট (${assignmentCount})` : `🚨 Assignments (${assignmentCount})`],
                        [STAFF_NOTIFICATION_TYPES.SERVICE_COMPLETED, lang ? `✅ সমাপ্তি (${completedCount})` : `✅ Completed (${completedCount})`],
                        [STAFF_NOTIFICATION_TYPES.CUSTOMER_REVIEW, lang ? `⭐ কাস্টমার রিভিউ (${reviewCount})` : `⭐ Reviews (${reviewCount})`],
                      ].map(([tabKey, label]) => {
                        const isSel = notifsTabFilter === tabKey;
                        return (
                          <TouchableOpacity
                            key={tabKey}
                            onPress={() => setNotifsTabFilter(tabKey)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 20,
                              backgroundColor: isSel ? '#0284C7' : '#FFFFFF',
                              borderWidth: 1,
                              borderColor: isSel ? '#0284C7' : '#CBD5E1',
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: isSel ? '800' : '600', color: isSel ? '#FFFFFF' : '#475569' }}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Secondary Actions Bar */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600' }}>
                        {unreadTotal > 0
                          ? (lang ? `🔔 ${unreadTotal}টি অপঠিত নোটিফিকেশন রয়েছে` : `🔔 ${unreadTotal} unread notification(s)`)
                          : (lang ? '✓ সকল নোটিফিকেশন পড়া হয়েছে' : '✓ All notifications read')}
                      </Text>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {unreadTotal > 0 && (
                          <TouchableOpacity
                            onPress={async () => {
                              await markAllStaffNotificationsAsRead(currentStaffUser.id);
                              const updated = await getStaffNotifications(currentStaffUser.id);
                              setStaffNotifications(updated);
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0284C7' }}>
                              {lang ? '✓ সব পড়া হয়েছে' : 'Mark all read'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {allList.length > 0 && (
                          <TouchableOpacity
                            onPress={async () => {
                              await clearStaffNotifications(currentStaffUser.id);
                              setStaffNotifications([]);
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#DC2626' }}>
                              {lang ? 'মুছুন' : 'Clear all'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Notifications Scroll List */}
                  <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
                    {filteredList.length === 0 ? (
                      <View style={{ paddingVertical: 45, alignItems: 'center' }}>
                        <Text style={{ fontSize: 36, marginBottom: 8 }}>📭</Text>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                          {lang ? 'বর্তমানে কোনো নোটিফিকেশন নেই' : 'No notifications found'}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' }}>
                          {lang
                            ? 'নতুন সার্ভিস বরাদ্দ, সার্ভিস সমাপ্তি কিংবা কাস্টমার রিভিউ আসলে এখানে প্রদর্শিত হবে।'
                            : 'Service assignments, completions, and customer ratings will appear here instantly.'}
                        </Text>
                      </View>
                    ) : (
                      filteredList.map((notif) => {
                        const isUnread = !notif.read;
                        const isAssignment = notif.type === STAFF_NOTIFICATION_TYPES.ASSIGNMENT;
                        const isCompleted = notif.type === STAFF_NOTIFICATION_TYPES.SERVICE_COMPLETED;
                        const isReview = notif.type === STAFF_NOTIFICATION_TYPES.CUSTOMER_REVIEW;

                        const badgeColor = isAssignment ? '#0284C7' : isCompleted ? '#16A34A' : '#D97706';
                        const badgeBg = isAssignment ? '#E0F2FE' : isCompleted ? '#DCFCE7' : '#FEF3C7';
                        const badgeBorder = isAssignment ? '#BAE6FD' : isCompleted ? '#BBF7D0' : '#FDE68A';
                        const typeLabel = isAssignment
                          ? (lang ? '🚨 নতুন অ্যাসাইনমেন্ট' : '🚨 New Assignment')
                          : isCompleted
                          ? (lang ? '✅ সার্ভিস সমাপ্ত' : '✅ Service Concluded')
                          : (lang ? `⭐ কাস্টমার রিভিউ (${notif.rating}★)` : `⭐ Customer Review (${notif.rating}★)`);

                        const timeDisplay = notif.timestamp
                          ? new Date(notif.timestamp).toLocaleString(lang ? 'bn-BD' : 'en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recent';

                        return (
                          <View
                            key={notif.id}
                            style={{
                              backgroundColor: isUnread ? (isAssignment ? '#F0F9FF' : isCompleted ? '#F0FDF4' : '#FFFBEB') : '#FFFFFF',
                              borderRadius: 14,
                              padding: 14,
                              borderWidth: 1.5,
                              borderColor: isUnread ? badgeColor : '#E2E8F0',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.05,
                              shadowRadius: 3,
                              elevation: 2,
                            }}
                          >
                            {/* Card Top Header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ backgroundColor: badgeBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: badgeBorder }}>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: badgeColor }}>
                                    {typeLabel}
                                  </Text>
                                </View>
                                {isUnread && (
                                  <View style={{ backgroundColor: '#DC2626', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                                    <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#FFFFFF' }}>
                                      ● {lang ? 'নতুন' : 'NEW'}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>
                                🕒 {timeDisplay}
                              </Text>
                            </View>

                            {/* Title & Body */}
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                              {notif.title}
                            </Text>
                            <Text style={{ fontSize: 12.5, color: '#334155', lineHeight: 18, marginBottom: 8 }}>
                              {notif.body}
                            </Text>

                            {/* Specific Detail Chips */}
                            {isAssignment && (
                              <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#BAE6FD', marginTop: 4, gap: 4 }}>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                  {notif.bookingId ? (
                                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0369A1' }}>
                                      🎫 {lang ? 'বুকিং রেফারেন্স:' : 'Booking Ref:'} #{notif.bookingId}
                                    </Text>
                                  ) : null}
                                  {notif.flight ? (
                                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0F172A' }}>
                                      ✈️ {lang ? 'ফ্লাইট:' : 'Flight:'} {notif.flight}
                                    </Text>
                                  ) : null}
                                  {notif.terminal ? (
                                    <Text style={{ fontSize: 11.5, color: '#475569' }}>
                                      🏢 {notif.terminal} ({notif.airport || 'DAC'})
                                    </Text>
                                  ) : null}
                                </View>
                                {notif.meetingPoint ? (
                                  <Text style={{ fontSize: 11.5, color: '#0369A1', marginTop: 2 }}>
                                    📍 {lang ? 'সাক্ষাতের স্থান:' : 'Meeting Point:'} {notif.meetingPoint}
                                  </Text>
                                ) : null}
                              </View>
                            )}

                            {isReview && (
                              <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', marginTop: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={{ fontSize: 15 }}>
                                      {'⭐'.repeat(Math.min(5, Math.max(1, Math.round(notif.rating || 5))))}
                                    </Text>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>
                                      ({notif.rating}/5)
                                    </Text>
                                  </View>
                                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#B45309' }}>
                                      +{notif.pointsEarned || (notif.rating >= 5 ? 100 : 50)} {lang ? 'পয়েন্ট যোগ' : 'Rank Pts'}
                                    </Text>
                                  </View>
                                </View>
                                {notif.comment ? (
                                  <Text style={{ fontSize: 12, fontStyle: 'italic', color: '#78350F', marginTop: 2 }}>
                                    "{notif.comment}"
                                  </Text>
                                ) : null}
                              </View>
                            )}

                            {isCompleted && (
                              <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0', marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#15803D' }}>
                                  ✓ {lang ? 'হ্যান্ডওভার ও সার্ভিস সমাপ্তি নথিভুক্ত' : 'Concluded & Handover Archived'}
                                </Text>
                                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#15803D' }}>
                                    +10 {lang ? 'পয়েন্ট অর্জিত' : 'Points Earned'}
                                  </Text>
                                </View>
                              </View>
                            )}

                            {/* Card Footer Actions */}
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
                              {isAssignment && notif.bookingId && (
                                <TouchableOpacity
                                  onPress={() => {
                                    setShowStaffNotifsModal(false);
                                    setSearchInput(notif.bookingId);
                                  }}
                                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#0284C7' }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                                    👁️ {lang ? 'বুকিং দেখুন' : 'View Booking'}
                                  </Text>
                                </TouchableOpacity>
                              )}

                              {isUnread && (
                                <TouchableOpacity
                                  onPress={async () => {
                                    await markStaffNotificationAsRead(currentStaffUser.id, notif.id);
                                    const updated = await getStaffNotifications(currentStaffUser.id);
                                    setStaffNotifications(updated);
                                  }}
                                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                                    ✓ {lang ? 'পড়া হয়েছে' : 'Mark as read'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Official Officer ID Pass & QR Code Modal with Download Capability */}
      {showStaffIdCardModal && (
        <FamilyMemberIdCardModal
          visible={showStaffIdCardModal}
          onClose={() => setShowStaffIdCardModal(false)}
          member={
            staffFamilyData || {
              id: currentStaffUser.id || 'FC-PO-001',
              name: currentStaffUser.name,
              nameBn: currentStaffUser.name,
              rank: currentStaffInRoster.role || 'Protocol Officer',
              rankBn: currentStaffInRoster.roleBn || 'প্রোটোকল অফিসার',
              badgeNo: currentStaffInRoster.badgeId || currentStaffUser.id || 'FC-PO-001',
              licenseNo: 'CAAB-PASS-DAC-2026',
              station: currentStaffInRoster.station || `${airport.code} Terminal 1 & 2`,
              stationBn: currentStaffInRoster.station || `${airport.name} বিমানবন্দর`,
              department: 'VIP Protocol Operations',
              departmentBn: 'ভিআইপি প্রোটোকল অপারেশন্স',
              phone: currentStaffUser.phone || '+8801700000000',
              email: currentStaffUser.email || '',
              bloodGroup: currentStaffInRoster.bloodGroup || 'B+',
              serial: 1,
              status: 'active',
            }
          }
          lang={lang}
        />
      )}
    </ScrollView>
  );
}

