import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import {
  COMPLAINT_CATEGORIES,
  URGENCY_LEVELS,
  submitPassengerComplaint,
  getPassengerComplaints,
  trackComplaintStatus,
} from '../services/complaintService';
import { AIRPORT_SPEED_DIAL_DIRECTORY } from '../services/airportOperationsService';

export default function PassengerComplaintModal({
  visible,
  onClose,
  initialBooking = null,
  lang = 1, // default Bengali (1)
}) {
  const isBn = Boolean(lang);

  // Tab: 'form' | 'success' | 'track' | 'history'
  const [activeTab, setActiveTab] = useState('form');

  // Form states
  const [passengerName, setPassengerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('officer_conduct');
  const [urgency, setUrgency] = useState('HIGH');
  const [officerName, setOfficerName] = useState('');
  const [baggageTag, setBaggageTag] = useState('');
  const [description, setDescription] = useState('');

  // Status & Success states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Tracking state
  const [searchTicketId, setSearchTicketId] = useState('');
  const [trackedResult, setTrackedResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [trackError, setTrackError] = useState('');

  // History list
  const [complaintHistory, setComplaintHistory] = useState([]);

  // Auto-fill from initialBooking if provided
  useEffect(() => {
    if (initialBooking) {
      setBookingId(initialBooking.id || '');
      setPassengerName(
        initialBooking.passengerName ||
        initialBooking.customer ||
        (initialBooking.passengers && initialBooking.passengers[0]?.name) ||
        ''
      );
      setPhone(initialBooking.phone || initialBooking.mobile || '');
      setEmail(initialBooking.email || '');
      setFlightNumber(
        initialBooking.flight?.number ||
        initialBooking.flightNumber ||
        initialBooking.fno ||
        ''
      );
      if (initialBooking.date) setTravelDate(initialBooking.date);
      if (initialBooking.staff || initialBooking.assignedStaff?.name) {
        setOfficerName(initialBooking.staff || initialBooking.assignedStaff?.name);
      }
    }
  }, [initialBooking]);

  // Load complaint history when modal opens
  useEffect(() => {
    if (visible) {
      getPassengerComplaints().then(list => setComplaintHistory(list));
      setErrorMessage('');
      setTrackError('');
    }
  }, [visible]);

  if (!visible) return null;

  // Handle Form Submission
  const handleSubmit = async () => {
    setErrorMessage('');
    if (!passengerName.trim()) {
      setErrorMessage(isBn ? 'অনুগ্রহ করে যাত্রীর নাম লিখুন।' : 'Please enter passenger name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setErrorMessage(isBn ? 'অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর প্রদান করুন।' : 'Please enter a valid contact phone number.');
      return;
    }
    if (!flightNumber.trim()) {
      setErrorMessage(isBn ? 'অনুগ্রহ করে ফ্লাইট নম্বর প্রদান করুন (যেমন: BG 001, EK 582)।' : 'Please provide flight number.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage(isBn ? 'অনুগ্রহ করে অভিযোগের বিস্তারিত বিবরণ লিখুন (কমপক্ষে ১০ অক্ষর)।' : 'Please provide detailed complaint description (at least 10 chars).');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitPassengerComplaint({
        passengerName,
        phone,
        email,
        bookingId,
        flightNumber,
        travelDate,
        category,
        urgency,
        officerName,
        baggageTag,
        description,
      });

      if (result.success) {
        setSubmittedTicket(result.ticket);
        setActiveTab('success');
        // Refresh local history
        const refreshed = await getPassengerComplaints();
        setComplaintHistory(refreshed);
      } else {
        setErrorMessage(isBn ? 'অভিযোগ জমা দিতে সমস্যা হয়েছে, অনুগ্রহ করে পুনরায় চেষ্টা করুন।' : 'Failed to submit complaint. Please try again.');
      }
    } catch (e) {
      setErrorMessage(e.message || (isBn ? 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।' : 'An unexpected error occurred.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Ticket Search Tracking
  const handleTrackSearch = async () => {
    setTrackError('');
    setTrackedResult(null);
    if (!searchTicketId.trim()) {
      setTrackError(isBn ? 'অনুগ্রহ করে টিকিট নম্বর লিখুন।' : 'Please enter a ticket ID.');
      return;
    }
    setIsSearching(true);
    try {
      const result = await trackComplaintStatus(searchTicketId.trim());
      if (result) {
        setTrackedResult(result);
      } else {
        setTrackError(isBn ? 'উক্ত টিকিট নম্বরের কোনো অভিযোগ খুঁজে পাওয়া যায়নি।' : 'No complaint ticket found with this ID.');
      }
    } catch (e) {
      setTrackError(isBn ? 'ট্র্যাকিং তথ্য লোড করতে ব্যর্থ হয়েছে।' : 'Failed to retrieve tracking info.');
    } finally {
      setIsSearching(false);
    }
  };

  // Copy Ticket ID to clipboard
  const handleCopyTicket = (ticketId) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ticketId);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 3000);
    } else {
      Alert.alert(isBn ? 'টিকিট আইডি' : 'Ticket ID', ticketId);
    }
  };

  // Direct Hotline dial
  const dutyManagerDial = AIRPORT_SPEED_DIAL_DIRECTORY[0]?.phone || '+8801700000101';
  const openCall = () => {
    Linking.openURL(`tel:${dutyManagerDial}`).catch(() => {});
  };
  const openWhatsApp = () => {
    const cleanDigits = dutyManagerDial.replace(/\D/g, '');
    const text = encodeURIComponent(
      isBn
        ? `আসসালামু আলাইকুম, আমি FlightCare প্যাসেঞ্জার গ্রিভেন্স সংক্রান্ত বিষয়ে যোগাযোগ করছি। টিকিট: ${submittedTicket?.id || searchTicketId || 'Emergency'}`
        : `Hello FlightCare Duty Manager, I am inquiring regarding passenger grievance ticket #${submittedTicket?.id || searchTicketId || 'Emergency'}`
    );
    Linking.openURL(`https://wa.me/${cleanDigits}?text=${text}`).catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(7, 26, 46, 0.78)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 12,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 680,
            maxHeight: '92%',
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 25,
            elevation: 15,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header Bar */}
          <View
            style={{
              backgroundColor: '#071A2E',
              paddingHorizontal: 22,
              paddingVertical: 18,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: '#F59E0B',
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>📋</Text>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.2 }}>
                  {isBn ? 'যাত্রী অভিযোগ ও প্রতিকার ফরম' : 'Passenger Grievance Redressal'}
                </Text>
                <View
                  style={{
                    backgroundColor: '#DC2626',
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>
                    VIP CARE
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                {isBn
                  ? 'সিভিল এভিয়েশন ও এয়ারপোর্ট ভিআইপি প্রোটোকল সার্ভিস সংক্রান্ত অভিযোগ কেন্দ্র'
                  : 'Civil Aviation & Airport VIP Protocol Grievance Cell'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Sub Navigation Tabs */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#F1F5F9',
              padding: 6,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
              gap: 6,
            }}
          >
            <TouchableOpacity
              onPress={() => setActiveTab('form')}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 8,
                backgroundColor: activeTab === 'form' || activeTab === 'success' ? '#FFFFFF' : 'transparent',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'form' ? 0.08 : 0,
                shadowRadius: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '800',
                  color: activeTab === 'form' || activeTab === 'success' ? '#0F172A' : '#64748B',
                }}
              >
                📝 {isBn ? 'নতুন অভিযোগ দাখিল' : 'Submit Complaint'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('track')}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 8,
                backgroundColor: activeTab === 'track' ? '#FFFFFF' : 'transparent',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'track' ? 0.08 : 0,
                shadowRadius: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '800',
                  color: activeTab === 'track' ? '#0284C7' : '#64748B',
                }}
              >
                🔍 {isBn ? 'টিকিট ট্র্যাক করুন' : 'Track Ticket'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('history')}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 8,
                backgroundColor: activeTab === 'history' ? '#FFFFFF' : 'transparent',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'history' ? 0.08 : 0,
                shadowRadius: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '800',
                  color: activeTab === 'history' ? '#0F172A' : '#64748B',
                }}
              >
                📜 {isBn ? `পূর্ববর্তী অভিযোগ (${complaintHistory.length})` : `History (${complaintHistory.length})`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Content Area */}
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* TAB 1: FORM */}
            {activeTab === 'form' && (
              <View>
                {/* Official Assurance Banner */}
                <View
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderLeftWidth: 4,
                    borderLeftColor: '#D97706',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 18,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
                    🛡️ {isBn ? 'নিরাপদ ও নিরপেক্ষ প্রতিকার সেল' : 'Impartial Grievance Redressal Cell'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#78350F', marginTop: 3, lineHeight: 17 }}>
                    {isBn
                      ? 'সম্মানিত যাত্রী, বিমানবন্দরে আপনার যেকোনো অসন্তোষ বা অনাকাঙ্ক্ষিত অভিজ্ঞতার দ্রুত সমাধানের জন্য এই ফরমটি পূরণ করুন। আপনার তথ্য গোপন রাখা হবে এবং সিনিয়র ডিউটি ম্যানেজার সরাসরি পর্যবেক্ষণ করবেন।'
                      : 'Valued passenger, please file this form for prompt redressal of any discomfort or service lapse. Your complaint will be directly handled by the Senior Duty Manager.'}
                  </Text>
                </View>

                {/* Error Banner */}
                {errorMessage ? (
                  <View
                    style={{
                      backgroundColor: '#FEE2E2',
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ color: '#DC2626', fontSize: 12.5, fontWeight: '700' }}>
                      ⚠️ {errorMessage}
                    </Text>
                  </View>
                ) : null}

                {/* Section 1: Passenger Details */}
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>
                  👤 {isBn ? 'যাত্রীর পরিচিতি ও যোগাযোগ' : 'Passenger Contact Details'}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? 'যাত্রীর পুরো নাম *' : 'Passenger Full Name *'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 13,
                        color: '#0F172A',
                      }}
                      placeholder={isBn ? 'যেমন: মোহাম্মদ তানভীর' : 'e.g. Mohammad Tanvir'}
                      value={passengerName}
                      onChangeText={setPassengerName}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? 'মোবাইল নম্বর *' : 'Mobile Phone Number *'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 13,
                        color: '#0F172A',
                      }}
                      placeholder="017XXXXXXXX"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? 'ইমেইল ঠিকানা (ঐচ্ছিক)' : 'Email Address (Optional)'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 13,
                        color: '#0F172A',
                      }}
                      placeholder="passenger@example.com"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? 'বুকিং রেফারেন্স আইডি (জানা থাকলে)' : 'Booking ID (If available)'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 13,
                        color: '#0F172A',
                      }}
                      placeholder="e.g. FC-9921"
                      value={bookingId}
                      onChangeText={setBookingId}
                    />
                  </View>
                </View>

                {/* Section 2: Flight & Service Details */}
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>
                  ✈️ {isBn ? 'ফ্লাইট ও ভ্রমণ সংক্রান্ত তথ্য' : 'Flight & Travel Information'}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? 'ফ্লাইট নম্বর *' : 'Flight Number *'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 13,
                        color: '#0F172A',
                      }}
                      placeholder={isBn ? 'যেমন: BG 001, EK 582, QR 639' : 'e.g. BG 001, EK 582'}
                      value={flightNumber}
                      onChangeText={setFlightNumber}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? 'ভ্রমণের তারিখ' : 'Travel Date'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 13,
                        color: '#0F172A',
                      }}
                      placeholder="YYYY-MM-DD"
                      value={travelDate}
                      onChangeText={setTravelDate}
                    />
                  </View>
                </View>

                {/* Section 3: Complaint Category */}
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                  🏷️ {isBn ? 'অভিযোগের বিষয়শ্রেণি নির্বাচন করুন *' : 'Select Grievance Category *'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  {COMPLAINT_CATEGORIES.map(cat => {
                    const isSelected = category === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        onPress={() => setCategory(cat.key)}
                        style={{
                          backgroundColor: isSelected ? '#071A2E' : '#F1F5F9',
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#071A2E' : '#E2E8F0',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: isSelected ? '#FFFFFF' : '#334155',
                          }}
                        >
                          {isBn ? cat.nameBn : cat.nameEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Section 4: Urgency Level */}
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                  ⚡ {isBn ? 'জরুরিতা / প্রায়োরিটি লেভেল *' : 'Urgency Level *'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  {URGENCY_LEVELS.map(urg => {
                    const isSelected = urgency === urg.key;
                    return (
                      <TouchableOpacity
                        key={urg.key}
                        onPress={() => setUrgency(urg.key)}
                        style={{
                          flex: 1,
                          minWidth: 160,
                          backgroundColor: isSelected ? urg.bg : '#F8FAFC',
                          borderWidth: 2,
                          borderColor: isSelected ? urg.color : '#E2E8F0',
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderRadius: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <View
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: urg.color,
                            }}
                          />
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: urg.color }}>
                            {isBn ? urg.badgeBn : urg.badgeEn}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                          {isBn ? urg.labelBn : urg.labelEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Section 5: Specific Officer / Baggage Tag */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? 'সংশ্লিষ্ট অফিসারের নাম / ব্যাজ (যদি জানা থাকে)' : 'Officer Name / Badge (If applicable)'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 13,
                        color: '#0F172A',
                      }}
                      placeholder={isBn ? 'যেমন: অফিসার তানভীর / ST-01' : 'e.g. Officer Tanvir (ST-01)'}
                      value={officerName}
                      onChangeText={setOfficerName}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      {isBn ? 'লাগেজ ট্যাগ / PIR / বিলিং রেফারেন্স (যদি থাকে)' : 'Baggage Tag / PIR / Reference (Optional)'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 13,
                        color: '#0F172A',
                      }}
                      placeholder="e.g. DAC-BG-10293"
                      value={baggageTag}
                      onChangeText={setBaggageTag}
                    />
                  </View>
                </View>

                {/* Section 6: Detailed Complaint Text */}
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                  ✍️ {isBn ? 'অভিযোগের বিস্তারিত বিবরণ লিখুন *' : 'Detailed Complaint Description *'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginBottom: 8 }}>
                  {isBn
                    ? 'বিমানবন্দরে ঠিক কী সমস্যা হয়েছে, কতক্ষণ অপেক্ষা করতে হয়েছে বা কোনো নির্দিষ্ট অদক্ষতা ঘটেছে কিনা তা স্পষ্টভাবে উল্লেখ করুন।'
                    : 'Please detail exactly what occurred, when, and any specific shortfall experienced.'}
                </Text>

                <TextInput
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1.5,
                    borderColor: '#CBD5E1',
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 13,
                    color: '#0F172A',
                    minHeight: 110,
                    textAlignVertical: 'top',
                    marginBottom: 20,
                  }}
                  multiline
                  numberOfLines={4}
                  placeholder={
                    isBn
                      ? 'এখানে বিস্তারিত লিখুন... (যেমন: ইমিগ্রেশনে দীর্ঘ লাইনে দাঁড়িয়ে থাকতে হয়েছিল এবং নির্ধারিত প্রোটোকল অফিসার সময়মতো গেটে পৌঁছায়নি...)'
                      : 'Provide complete details of the incident...'
                  }
                  value={description}
                  onChangeText={setDescription}
                />

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: '#DC2626',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    shadowColor: '#DC2626',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 16 }}>📩</Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '900', letterSpacing: 0.3 }}>
                        {isBn ? 'অভিযোগ জমা দিন ও টিকিট নম্বর সংগ্রহ করুন' : 'Submit Grievance & Get Ticket ID'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 2: SUCCESS VIEW */}
            {activeTab === 'success' && submittedTicket && (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                {/* Green VIP Checkmark Badge */}
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#DCFCE7',
                    borderWidth: 3,
                    borderColor: '#22C55E',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ fontSize: 28, color: '#16A34A', fontWeight: '900' }}>✓</Text>
                </View>

                <Text style={{ fontSize: 19, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                  {isBn ? 'আপনার অভিযোগটি সফলভাবে নথিভুক্ত হয়েছে!' : 'Grievance Ticket Successfully Registered!'}
                </Text>

                <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center', marginTop: 6, maxWidth: 480, lineHeight: 18 }}>
                  {isBn
                    ? 'বিমানবন্দর ডিউটি ম্যানেজার ও সিভিল এভিয়েশন প্রোটোকল ডেস্কে আপনার অভিযোগের রিয়েল-টাইম টিকিট পৌঁছেছে।'
                    : 'Your grievance ticket has been forwarded to the Airport Duty Manager Command Desk.'}
                </Text>

                {/* Prominent Ticket Box */}
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: '#0284C7',
                    borderRadius: 14,
                    padding: 16,
                    marginVertical: 18,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7', letterSpacing: 1 }}>
                    OFFICIAL TRACKING TICKET ID
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 4, letterSpacing: 0.8 }}>
                    {submittedTicket.id}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {isBn ? 'যাত্রী:' : 'Passenger:'} {submittedTicket.passengerName} • ✈️ {submittedTicket.flightNumber}
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleCopyTicket(submittedTicket.id)}
                    style={{
                      marginTop: 10,
                      backgroundColor: '#0284C7',
                      paddingHorizontal: 16,
                      paddingVertical: 7,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                      📋 {copiedNotice ? (isBn ? '✓ কপি করা হয়েছে' : '✓ Copied!') : (isBn ? 'টিকিট নম্বর কপি করুন' : 'Copy Ticket ID')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Escalation & Response SLA Notice */}
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#EFF6FF',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    padding: 14,
                    marginBottom: 18,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E40AF', marginBottom: 4 }}>
                    ⏱️ {isBn ? 'প্রতিকারের নির্ধারিত সময়সীমা (SLA):' : 'Response Resolution SLA:'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#1E3A8A', lineHeight: 18 }}>
                    {submittedTicket.urgency === 'URGENT'
                      ? (isBn ? '🔴 অতি জরুরি সংকট: ১৫ থেকে ৩০ মিনিটের মধ্যে এয়ারপোর্ট ডিউটি ম্যানেজার সরাসরি আপনার মোবাইলে ফোন করবেন।' : '🔴 Critical Issue: Duty Manager will contact your mobile within 15-30 minutes.')
                      : submittedTicket.urgency === 'HIGH'
                      ? (isBn ? '🟡 জরুরি ইস্যু: সর্বোচ্চ ০২ ঘণ্টার মধ্যে তদন্ত সম্পন্ন করে ব্যবস্থা গ্রহণ করা হবে।' : '🟡 High Priority: Investigation and resolution within 2 hours.')
                      : (isBn ? '🟢 সাধারণ অভিযোগ: ২৪ ঘণ্টার মধ্যে লিখিত প্রতিবেদন ও প্রতিকার নিশ্চিত করা হবে।' : '🟢 Normal: Addressed within 24 hours.')}
                  </Text>
                </View>

                {/* Direct Emergency Contact Actions */}
                <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                  <TouchableOpacity
                    onPress={openCall}
                    style={{
                      flex: 1,
                      minWidth: 160,
                      backgroundColor: '#0F172A',
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>📞</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                      {isBn ? 'ডিউটি ম্যানেজার হটলাইন' : 'Duty Hotline'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={openWhatsApp}
                    style={{
                      flex: 1,
                      minWidth: 160,
                      backgroundColor: '#16A34A',
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>💬</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                      {isBn ? 'হোয়াটসঅ্যাপ হেল্পডেস্ক' : 'WhatsApp Desk'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Close / Return Button */}
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                    backgroundColor: '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    {isBn ? 'বন্ধ করুন' : 'Done & Close'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 3: TRACK TICKET */}
            {activeTab === 'track' && (
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                  🔍 {isBn ? 'টিকিট নম্বর দিয়ে অগ্রগতি জানুন' : 'Track Grievance Ticket by ID'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>
                  {isBn
                    ? 'আপনার টিকিট নম্বরটি লিখুন (যেমন: FC-TKT-2026-XXXX)'
                    : 'Enter your Complaint Ticket ID to check real-time resolution status.'}
                </Text>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 13.5,
                      fontWeight: '700',
                      color: '#0F172A',
                    }}
                    placeholder="FC-TKT-2026-XXXX"
                    value={searchTicketId}
                    onChangeText={setSearchTicketId}
                    autoCapitalize="characters"
                  />

                  <TouchableOpacity
                    onPress={handleTrackSearch}
                    disabled={isSearching}
                    style={{
                      backgroundColor: '#0284C7',
                      paddingHorizontal: 18,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSearching ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                        {isBn ? 'অনুসন্ধান' : 'Search'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {trackError ? (
                  <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                    <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>⚠️ {trackError}</Text>
                  </View>
                ) : null}

                {/* Tracked Result Display */}
                {trackedResult && (
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: trackedResult.status === 'resolved' ? '#22C55E' : '#38BDF8',
                      padding: 16,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                          Ticket #{trackedResult.id || trackedResult.ticketId}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          {isBn ? 'যাত্রী:' : 'Passenger:'} {trackedResult.passengerName} • ✈️ {trackedResult.flightNumber}
                        </Text>
                      </View>

                      <View
                        style={{
                          backgroundColor:
                            trackedResult.status === 'resolved'
                              ? '#DCFCE7'
                              : trackedResult.status === 'in_progress'
                              ? '#FEF3C7'
                              : '#FEE2E2',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11.5,
                            fontWeight: '900',
                            color:
                              trackedResult.status === 'resolved'
                                ? '#16A34A'
                                : trackedResult.status === 'in_progress'
                                ? '#D97706'
                                : '#DC2626',
                          }}
                        >
                          {trackedResult.status === 'resolved'
                            ? (isBn ? '✓ সমাধানকৃত (Resolved)' : '✓ Resolved')
                            : trackedResult.status === 'in_progress'
                            ? (isBn ? '⚙️ তদন্তাধীন (In Progress)' : '⚙️ In Progress')
                            : (isBn ? '🚨 গৃহীত / অপেক্ষমাণ (Open)' : '🚨 Open')}
                        </Text>
                      </View>
                    </View>

                    {/* Category & Date */}
                    <Text style={{ fontSize: 12, color: '#334155', marginBottom: 8 }}>
                      📌 {isBn ? 'বিষয়শ্রেণি:' : 'Category:'} <Text style={{ fontWeight: '700' }}>{trackedResult.categoryNameBn || trackedResult.typeNameBn || trackedResult.category || 'General'}</Text>
                    </Text>

                    {/* Complaint text */}
                    <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 2 }}>
                        {isBn ? 'অভিযোগের বিবরণ:' : 'Grievance Description:'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#0F172A', lineHeight: 17 }}>
                        {trackedResult.description || trackedResult.notes || 'N/A'}
                      </Text>
                    </View>

                    {/* Manager Resolution Notes if any */}
                    {trackedResult.resolutionNotes ? (
                      <View style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', padding: 10, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '900', color: '#16A34A', marginBottom: 2 }}>
                          ✓ {isBn ? 'ডিউটি ম্যানেজারের প্রতিকার ও গৃহীত ব্যবস্থা:' : 'Duty Manager Resolution Notes:'}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#14532D', lineHeight: 17 }}>
                          {trackedResult.resolutionNotes}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11.5, color: '#B45309' }}>
                          ⏱️ {isBn ? 'ডিউটি অফিসার বর্তমানে ঘটনাটি পর্যালোচনা করছেন। খুব দ্রুত প্রতিকারমূলক ব্যবস্থা নেওয়া হবে।' : 'Duty Manager is reviewing the incident report.'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* TAB 4: MY COMPLAINTS HISTORY */}
            {activeTab === 'history' && (
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>
                  📜 {isBn ? 'আপনার দাখিলকৃত অভিযোগসমূহ' : 'Your Submitted Complaints'}
                </Text>

                {complaintHistory.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 30, backgroundColor: '#F8FAFC', borderRadius: 12 }}>
                    <Text style={{ fontSize: 26, marginBottom: 6 }}>📭</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>
                      {isBn ? 'আপনার কোনো অমীমাংসিত অভিযোগ নেই।' : 'No complaints recorded on this device.'}
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {complaintHistory.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          setSearchTicketId(item.id);
                          setTrackedResult(item);
                          setActiveTab('track');
                        }}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: '#E2E8F0',
                          borderRadius: 12,
                          padding: 12,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#0F172A' }}>
                              #{item.id}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>• {item.travelDate}</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: '#334155', marginTop: 2 }} numberOfLines={1}>
                            {item.categoryNameBn || item.category}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <View
                            style={{
                              backgroundColor: item.status === 'resolved' ? '#DCFCE7' : '#FEE2E2',
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10.5,
                                fontWeight: '800',
                                color: item.status === 'resolved' ? '#16A34A' : '#DC2626',
                              }}
                            >
                              {item.status === 'resolved' ? (isBn ? '✓ সমাধান' : 'Resolved') : (isBn ? '🚨 তদন্তাধীন' : 'Open')}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 10, color: '#0284C7', fontWeight: '700', marginTop: 4 }}>
                            {isBn ? 'বিস্তারিত দেখুন ›' : 'View details ›'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

