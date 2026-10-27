import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { s } from '../styles/styles';
import {
  isBookingCancelled,
  isBookingCompleted,
  normalizeWorkflowStages,
  canonicalBookingStatus,
} from '../utils/helpers';
import LiveTrackingModal from '../components/LiveTrackingModal';
import BookingInvoiceModal from '../components/BookingInvoiceModal';
import VipPlacardModal from '../components/VipPlacardModal';
import ScreenHeaderBar from '../components/ScreenHeaderBar';
import ServiceCompletionReviewModal from '../components/ServiceCompletionReviewModal';
import { addOfficerReview } from '../services/officerService';
import { dispatchStaffNotification, STAFF_NOTIFICATION_TYPES } from '../services/communication';
import { saveBookingToFirestore } from '../services/firebaseSyncService';

export default function BookingsScreen({
  bookings = [],
  customerSession,
  customerPaymentHistory = [],
  customerPaymentsLoading,
  customerPaymentsError,
  loadCustomerPaymentHistory,
  bookingsLoading,
  bookingsError,
  bookingFilter,
  setBookingFilter,
  bookingView,
  setBookingView,
  bookingWorkflow,
  paymentBusyId,
  bookingActionId,
  verifyBookingPayment,
  startBkashPayment,
  startCardPayment,
  startSslCommerzPayment,
  openBkashPayment,
  requestBookingCancellation,
  pagePadding,
  lang,
  t,
  onOpenLiveTracking,
  setTab,
  onBack,
}) {
  const [localTrackingBooking, setLocalTrackingBooking] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState(null);
  const [selectedPlacardBooking, setSelectedPlacardBooking] = useState(null);
  const [ratingModalBooking, setRatingModalBooking] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [ratingSubmittedId, setRatingSubmittedId] = useState({});
  const [cancellationModalBooking, setCancellationModalBooking] = useState(null);

  // Auto-prompt review popup if passenger has a completed service that is unrated
  useEffect(() => {
    const unrated = (bookings || []).find(b => {
      const isCompleted = b.status === 'completed' || isBookingCompleted(b, bookingWorkflow);
      return isCompleted && !b.customerRating && !ratingSubmittedId[b.id];
    });
    if (unrated && !ratingModalBooking) {
      const t = setTimeout(() => {
        setRatingModalBooking(unrated);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [bookings, ratingSubmittedId, ratingModalBooking, bookingWorkflow]);

  const localPayments = bookings
    .filter(
      booking =>
        booking.paymentId ||
        booking.paymentRecordId ||
        ['paid', 'pending', 'failed', 'initiation_failed'].includes(booking.paymentStatus)
    )
    .map(booking => ({
      id: booking.paymentRecordId || booking.paymentId || `booking-${booking.id}`,
      booking_id: booking.id,
      amount: booking.amount,
      status: booking.paymentStatus,
      method: booking.method === 'bkash' ? 'bKash' : 'Pay after service',
      created_at: booking.created_at || booking.confirmedAt,
    }));

  const paymentRecords = customerSession ? customerPaymentHistory : localPayments;

  const paymentStatusLabel = status => {
    const normalized = String(status || '').toLowerCase();
    if (['pay_after_service', 'pay_after', 'after_service'].includes(normalized)) {
      return lang ? 'সার্ভিস সমাপ্তির পরে পেমেন্ট' : 'Pay After Service';
    }
    if (['paid', 'success', 'completed'].includes(normalized)) return t('paymentVerified');
    if (['refunded', 'partially_refunded'].includes(normalized))
      return normalized === 'refunded' ? t('refundedPayments') : t('partiallyRefunded');
    if (['failed', 'cancelled', 'canceled', 'reversed', 'initiation_failed'].includes(normalized))
      return t('paymentFailed');
    if (normalized === 'quote_required') return t('quotePending');
    return t('paymentPending');
  };

  const visibleBookings = bookings
    .filter(booking =>
      bookingFilter === 'cancelled'
        ? isBookingCancelled(booking)
        : bookingFilter === 'completed'
          ? !isBookingCancelled(booking) && isBookingCompleted(booking, bookingWorkflow)
          : !isBookingCancelled(booking) && !isBookingCompleted(booking, bookingWorkflow)
    )
    .filter(booking => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const idMatch = String(booking.id || '').toLowerCase().includes(q);
      const nameMatch = String(booking.name || booking.customer?.name || booking.passenger_name || '').toLowerCase().includes(q);
      const flightMatch = String(booking.flight?.number || booking.fno || booking.flight_number || '').toLowerCase().includes(q);
      return idMatch || nameMatch || flightMatch;
    });

  return (
    <ScrollView contentContainerStyle={{ padding: pagePadding, paddingBottom: 115 }}>
      {/* Top Navigation Back Bar */}
      <ScreenHeaderBar
        title={lang === 1 ? 'আমার বুকিংস' : 'My Bookings'}
        subtitle={lang === 1 ? 'বুকিং স্থিতি ও পেমেন্ট হিস্ট্রি' : 'Track bookings & payments'}
        onBack={onBack || (() => setTab && setTab('home'))}
        onHome={() => setTab && setTab('home')}
        lang={lang}
      />

      {/* View Toggle: Bookings vs Payments */}
      <View style={s.bookingViews}>
        {['bookings', 'payments'].map(view => (
          <TouchableOpacity
            key={view}
            style={[s.managerTab, bookingView === view && s.managerTabOn]}
            onPress={() => {
              setBookingView(view);
              if (view === 'payments' && customerSession && loadCustomerPaymentHistory) {
                loadCustomerPaymentHistory();
              }
            }}
          >
            <Text style={[s.bookingTabText, bookingView === view && s.bookingTabTextOn]}>
              {view === 'payments' ? t('paymentHistory') : t('bookings')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PAYMENTS VIEW */}
      {bookingView === 'payments' ? (
        <>
          {!customerSession && (
            <Text style={[s.muted, { marginBottom: 10 }]}>{t('localPaymentHistoryNote')}</Text>
          )}
          {customerPaymentsLoading ? <Text style={s.muted}>…</Text> : null}
          {customerPaymentsError ? (
            <Text style={s.managerError}>{customerPaymentsError}</Text>
          ) : null}
          {!customerPaymentsLoading && paymentRecords.length === 0 ? (
            <Text style={s.muted}>{t('noPaymentHistory')}</Text>
          ) : (
            paymentRecords.map((payment, index) => (
              <View key={String(payment.id ?? payment.payment_id ?? index)} style={s.card}>
                <Text style={s.h3}>
                  {t('paymentReference')}: {payment.id ?? payment.payment_id ?? '—'}
                </Text>
                <Text style={s.muted}>
                  {t('bookingReference')}: {payment.booking_id ?? payment.booking?.id ?? payment.booking_reference ?? '—'}
                </Text>
                <Text style={s.muted}>
                  {t('paymentMethod')}: {payment.method ?? payment.payment_method ?? 'bKash'}
                </Text>
                <Text style={s.muted}>
                  {t('totalPayable')}: {payment.amount == null ? '—' : `৳${payment.amount}`}
                </Text>
                <Text style={s.muted}>
                  {t('paymentState')}: {paymentStatusLabel(payment.status ?? payment.payment_status)}
                </Text>
                {payment.refund_status ? (
                  <Text style={s.muted}>
                    {t('refundStatus')}: {paymentStatusLabel(payment.refund_status)}
                  </Text>
                ) : null}
                {payment.created_at ? (
                  <Text style={s.muted}>
                    {t('paymentDate')}: {payment.created_at}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </>
      ) : (
        /* BOOKINGS VIEW */
        <>
          {bookingsLoading ? <Text style={s.muted}>…</Text> : null}
          {bookingsError ? <Text style={s.managerError}>{bookingsError}</Text> : null}
          {!customerSession && bookings.length > 0 && (
            <Text style={[s.muted, { marginBottom: 8 }]}>{t('signInToManage')}</Text>
          )}

          {/* Search Input Bar */}
          <View style={{ marginBottom: 12 }}>
            <TextInput
              style={[
                s.in,
                {
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 13,
                },
              ]}
              placeholder={
                lang
                  ? '🔍 বুকিং আইডি, ফ্লাইট নম্বর বা যাত্রী দিয়ে খুঁজুন...'
                  : '🔍 Search by Booking ID, Flight #, or Passenger...'
              }
              value={searchInput}
              onChangeText={setSearchInput}
            />
          </View>

          {/* Filter tabs */}
          <View style={[s.row, { marginBottom: 8 }]}>
            {['upcoming', 'completed', 'cancelled'].map(filter => (
              <TouchableOpacity
                key={filter}
                style={[s.bookingTab, bookingFilter === filter && s.bookingTabOn]}
                onPress={() => setBookingFilter(filter)}
              >
                <Text
                  style={[s.bookingTabText, bookingFilter === filter && s.bookingTabTextOn]}
                >
                  {t(filter)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!visibleBookings.length && !bookingsLoading ? (
            <Text style={s.muted}>{t('none')}</Text>
          ) : (
            visibleBookings.map(booking => {
              const customStages = normalizeWorkflowStages(booking.workflow);
              const stages = customStages.length ? customStages : bookingWorkflow;
              const statusKey = canonicalBookingStatus(booking.status);
              const matchingStageIndex = stages.findIndex(item => item.key === statusKey);
              const stageIndex =
                matchingStageIndex >= 0
                  ? matchingStageIndex
                  : Math.max(
                      0,
                      stages.findIndex(item =>
                        item.bucket ===
                        (isBookingCancelled(booking)
                          ? 'cancelled'
                          : isBookingCompleted(booking, stages)
                            ? 'completed'
                            : 'upcoming')
                      )
                    );
              const currentStage = stages[stageIndex];
              const history = Array.isArray(booking.statusHistory) ? booking.statusHistory : [];
              const paymentStatus = booking.refundStatus || booking.paymentStatus;

              return (
                <View key={booking.id} style={s.card}>
                  <Text style={s.h3}>
                    {booking.id} · {booking.amount == null ? t('quotePending') : `৳${booking.amount}`}
                  </Text>
                  <Text style={s.muted}>
                    {booking.name || booking.customer?.name || booking.passenger_name || '—'} ·{' '}
                    {booking.flight?.number || booking.fno || booking.flight_number || '—'} ·{' '}
                    {booking.flight?.date || booking.date || booking.flight_date || '—'}
                  </Text>
                  <Text style={s.muted}>
                    {t('bookingStatus')}:{' '}
                    {currentStage?.label[lang] ||
                      String(booking.status || 'pending').replace(/_/g, ' ')}
                  </Text>
                  <Text style={s.muted}>
                    {t('paymentState')}: {paymentStatusLabel(paymentStatus)}
                  </Text>
                  {booking.paymentRecordId ? (
                    <Text style={s.muted}>
                      {t('paymentReference')}: {booking.paymentRecordId}
                    </Text>
                  ) : null}

                  {/* Horizontal workflow steps */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={s.bookingWorkflowTrack}
                    contentContainerStyle={s.bookingWorkflowSteps}
                  >
                    {stages.map((stage, index) => {
                      const reached = index <= stageIndex;
                      const timestamp = history.find(
                        item => canonicalBookingStatus(item.status || item.key) === stage.key
                      )?.created_at;
                      return (
                        <View key={stage.key} style={s.bookingWorkflowStep}>
                          <View
                            style={[
                              s.bookingWorkflowDot,
                              reached && s.bookingWorkflowDotReached,
                              index === stageIndex && s.bookingWorkflowDotCurrent,
                            ]}
                          />
                          <Text
                            style={[
                              s.bookingWorkflowLabel,
                              index === stageIndex && s.bookingWorkflowLabelCurrent,
                            ]}
                          >
                            {stage.label[lang]}
                          </Text>
                          {timestamp ? (
                            <Text style={s.bookingWorkflowTime}>{timestamp}</Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </ScrollView>

                  {/* Mutual Live Location Tracking / Assigned Officer Info */}
                  {Boolean(booking.assignedStaff && typeof booking.assignedStaff === 'object' && (booking.assignedStaff.name?.trim() || booking.assignedStaff.phone?.trim())) ? (
                    <View
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTopWidth: 1,
                        borderTopColor: '#E2E8F0',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                        backgroundColor: '#F0F9FF',
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#BAE6FD',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: '#E0F2FE',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 1.5,
                            borderColor: '#0284C7',
                          }}
                        >
                          <Text style={{ fontSize: 20 }}>🧑‍✈️</Text>
                        </View>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
                              {booking.assignedStaff.name}
                            </Text>
                            <View style={{ backgroundColor: '#0284C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FFFFFF' }}>
                                {lang ? 'লাইভ রাডার' : 'LIVE RADAR'}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 11.5, color: '#0369A1', fontWeight: '600' }}>
                            {booking.assignedStaff.phone ? `📞 ${booking.assignedStaff.phone}` : (lang ? 'নিযুক্ত প্রোটোকল অফিসার' : 'Assigned Protocol Officer')}
                            {booking.assignedStaff.badgeNo ? ` • ID: ${booking.assignedStaff.badgeNo}` : ''}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          if (typeof onOpenLiveTracking === 'function') {
                            onOpenLiveTracking(booking, 'client');
                          } else {
                            setLocalTrackingBooking(booking);
                          }
                        }}
                        style={{
                          backgroundColor: '#0284C7',
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          shadowColor: '#0284C7',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>📍</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                          {lang ? 'অফিসার ও আমার লাইভ লোকেশন' : 'Live Track Officer & Me'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTopWidth: 1,
                        borderTopColor: '#E2E8F0',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                        backgroundColor: '#F8FAFC',
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 240 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: '#FEF3C7',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 18 }}>⏳</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155' }}>
                            {lang ? 'প্রোটোকল অফিসার নির্ধারণ প্রক্রিয়াধীন' : 'Protocol Officer Assignment in Progress'}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                            {lang
                              ? 'ফ্লাইটের পূর্বে অফিসার নির্ধারিত হলে এসএমএস ও লাইভ ট্র্যাকিং সক্রিয় হবে'
                              : 'Assigned officer details & live radar tracking will activate before flight'}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{
                          backgroundColor: '#FFFFFF',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                          📞 24/7 Helpline: 01347-570001
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Booking Card Quick Action Bar (Invoice, WhatsApp Share, Rating) */}
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginTop: 10,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: '#F1F5F9',
                      alignItems: 'center',
                    }}
                  >
                    {/* View/Download Invoice Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setSelectedInvoiceBooking(booking)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>📄</Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#1E293B' }}>
                        {lang ? 'ইনভয়েস / রশিদ' : 'View Invoice'}
                      </Text>
                    </TouchableOpacity>

                    {/* View/Download VIP Placard Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setSelectedPlacardBooking(booking)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: '#064E3B',
                        borderWidth: 1,
                        borderColor: '#F59E0B',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>🏷️</Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
                        {lang ? 'ভিআইপি প্লেকার্ড' : 'VIP Placard'}
                      </Text>
                    </TouchableOpacity>

                    {/* Star Rating Button for Completed Bookings */}
                    {isBookingCompleted(booking, stages) && !isBookingCancelled(booking) && (
                      ratingSubmittedId[booking.id] ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: '#FEF9C3',
                            borderWidth: 1,
                            borderColor: '#FDE047',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ fontSize: 12 }}>⭐</Text>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#854D0E' }}>
                            {lang ? `রেট করা হয়েছে: ${ratingSubmittedId[booking.id]}/৫ ✓` : `Rated: ${ratingSubmittedId[booking.id]}/5 ✓`}
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            setRatingModalBooking(booking);
                            setRatingScore(5);
                            setRatingFeedback('');
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: '#FFFBEB',
                            borderWidth: 1,
                            borderColor: '#FCD34D',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ fontSize: 12 }}>⭐</Text>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#B45309' }}>
                            {lang ? 'অফিসারকে রেটিং দিন' : 'Rate Officer'}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>

                  {/* Action links */}
                  {booking.paymentStatus === 'pending' && (
                    <View style={[s.row, { flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }]}>
                      {booking.method === 'sslcommerz' ? (
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#072B56',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            marginRight: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                          onPress={() => (typeof startSslCommerzPayment === 'function' ? startSslCommerzPayment(booking) : startBkashPayment(booking))}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                            🛡️ {lang ? 'SSLCOMMERZ এ পরিশোধ ›' : 'Pay via SSLCOMMERZ ›'}
                          </Text>
                        </TouchableOpacity>
                      ) : booking.method === 'card' ? (
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#0F172A',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            marginRight: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                          onPress={() => (typeof startCardPayment === 'function' ? startCardPayment(booking) : startBkashPayment(booking))}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                            💳 {lang ? 'কার্ড দিয়ে পরিশোধ করুন ›' : 'Pay with Card ›'}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#059669',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            marginRight: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                          onPress={() => startBkashPayment(booking)}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                            🇧🇩 {lang ? 'বাংলা কিউআরে পরিশোধ করুন ›' : 'Pay with Bangla QR ›'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        disabled={paymentBusyId === String(booking.id)}
                        onPress={() => verifyBookingPayment(booking)}
                      >
                        <Text style={s.link}>
                          {paymentBusyId === String(booking.id) ? '…' : (lang ? 'সার্ভার ভেরিফিকেশন' : t('checkPayment'))}
                        </Text>
                      </TouchableOpacity>
                      {booking.paymentUrl ? (
                        <TouchableOpacity
                          style={{ marginLeft: 14 }}
                          onPress={() => openBkashPayment(booking.paymentUrl)}
                        >
                          <Text style={s.link}>{t('openBkash')}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}

                  {['failed', 'initiation_failed'].includes(booking.paymentStatus) && (
                    <TouchableOpacity
                      disabled={paymentBusyId === String(booking.id)}
                      style={s.authTextButton}
                      onPress={() => {
                        if (booking.method === 'sslcommerz' && typeof startSslCommerzPayment === 'function') {
                          startSslCommerzPayment(booking);
                        } else if (booking.method === 'card' && typeof startCardPayment === 'function') {
                          startCardPayment(booking);
                        } else {
                          startBkashPayment(booking);
                        }
                      }}
                    >
                      <Text style={s.link}>
                        {paymentBusyId === String(booking.id) ? '…' : t('retryPayment')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {bookingFilter === 'upcoming' &&
                    customerSession &&
                    (booking.cancellation_eligible === true || booking.can_cancel === true) && (
                      <TouchableOpacity
                        disabled={bookingActionId === String(booking.id)}
                        style={s.authTextButton}
                        onPress={() => setCancellationModalBooking(booking)}
                      >
                        <Text style={[s.link, { color: '#A52A2A' }]}>
                          {bookingActionId === String(booking.id) ? '…' : t('cancelBooking')}
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>
              );
            })
          )}
        </>
      )}

      {/* Live Officer & Client Tracking Modal */}
      {localTrackingBooking ? (
        <LiveTrackingModal
          visible={!!localTrackingBooking}
          onClose={() => setLocalTrackingBooking(null)}
          booking={localTrackingBooking}
          mode="client"
          lang={lang}
          onTriggerReview={b => setRatingModalBooking(b)}
        />
      ) : null}

      {/* Reusable Booking Invoice / Receipt Printable Modal */}
      {selectedInvoiceBooking ? (
        <BookingInvoiceModal
          visible={!!selectedInvoiceBooking}
          onClose={() => setSelectedInvoiceBooking(null)}
          booking={selectedInvoiceBooking}
          lang={lang}
        />
      ) : null}

      {/* Reusable VIP Greeter Placard Modal */}
      {selectedPlacardBooking ? (
        <VipPlacardModal
          visible={!!selectedPlacardBooking}
          onClose={() => setSelectedPlacardBooking(null)}
          booking={selectedPlacardBooking}
          lang={lang}
        />
      ) : null}

      {/* Officer Rating & Feedback Modal */}
      {ratingModalBooking ? (
        <ServiceCompletionReviewModal
          visible={!!ratingModalBooking}
          booking={ratingModalBooking}
          onClose={() => setRatingModalBooking(null)}
          onReviewSubmitted={(bookingId, reviewData) => {
            setRatingSubmittedId(prev => ({ ...prev, [bookingId]: reviewData.rating }));
            setRatingModalBooking(null);
          }}
          lang={lang}
        />
      ) : null}

      {/* Cancellation Confirmation Modal */}
      {cancellationModalBooking ? (
        <Modal
          visible={!!cancellationModalBooking}
          transparent
          animationType="fade"
          onRequestClose={() => setCancellationModalBooking(null)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
            <View style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1.5,
              borderColor: '#FECACA',
            }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#DC2626', textAlign: 'center' }}>
                ⚠️ {lang ? 'বুকিং বাতিলের নিশ্চিতকরণ' : 'Confirm Booking Cancellation'}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                {lang ? 'বুকিং আইডি:' : 'Booking ID:'} #{cancellationModalBooking.id}
              </Text>

              <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, marginVertical: 14, borderWidth: 1, borderColor: '#FCA5A5' }}>
                <Text style={{ fontSize: 12, color: '#991B1B', lineHeight: 18 }}>
                  {cancellationModalBooking.cancellation_policy_summary || (lang
                    ? '• সার্ভিসের ২৪ ঘণ্টার বেশি পূর্বে বাতিল করলে পূর্ণ রিফান্ড প্রযোজ্য।\n• ২৪ ঘণ্টার মধ্যে বাতিল করলে নামমাত্র প্রশাসনিক ফি কর্তন হতে পারে।'
                    : '• Free cancellation up to 24 hours before flight.\n• Late cancellations may incur standard airport processing fee.')}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setCancellationModalBooking(null)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                    {lang ? 'ফিরে যান' : 'Keep Booking'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    const target = cancellationModalBooking;
                    setCancellationModalBooking(null);
                    requestBookingCancellation(target);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: '#DC2626',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                    ✕ {lang ? 'হ্যাঁ, বাতিল করুন' : 'Confirm Cancel'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </ScrollView>
  );
}


