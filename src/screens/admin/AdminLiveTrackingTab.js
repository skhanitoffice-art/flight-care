import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import {
  getAllActiveTrackingSessions,
  AIRPORT_CHECKPOINTS,
  stepSimulationCloser,
  sendTrackingPing,
  getGoogleMapsNavigationUrl,
} from '../../services/trackingService';

export default function AdminLiveTrackingTab({
  bookings = [],
  lang = 0,
  trackingAirportFilter,
  setTrackingAirportFilter,
  trackingSearchQuery,
  setTrackingSearchQuery,
  trackingRefreshTick,
  setTrackingRefreshTick,
  trackingActionNotice,
  setTrackingActionNotice,
  setManagerTrackingBooking,
  googleMapsApiKeyInput,
  setGoogleMapsApiKeyInput,
  googleMapsKeyStatus,
  handleSaveGoogleMapsApiKey,
  s,
}) {
  const rawSessions = getAllActiveTrackingSessions(bookings);
  const activeSessions = rawSessions.filter(session => {
    if (trackingAirportFilter !== 'ALL' && session.airportCode !== trackingAirportFilter) {
      return false;
    }
    if (trackingSearchQuery.trim()) {
      const q = trackingSearchQuery.trim().toLowerCase();
      const bId = String(session.bookingId || '').toLowerCase();
      const oName = String(session.officer?.name || '').toLowerCase();
      const pName = String(session.passenger?.name || '').toLowerCase();
      const fNo = String(session.flightNumber || '').toLowerCase();
      if (!bId.includes(q) && !oName.includes(q) && !pName.includes(q) && !fNo.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const totalOfficersOnline = activeSessions.filter(s => s.officer?.isOnline !== false).length;
  const totalPassengersSharing = activeSessions.filter(s => s.passenger?.isSharingLocation !== false).length;
  const avgDistance = activeSessions.length > 0
    ? Math.round(activeSessions.reduce((acc, curr) => acc + (curr.distanceMeters || 0), 0) / activeSessions.length)
    : 0;

  const handleOpenRadarForSession = (session) => {
    const originalBooking = (bookings || []).find(b => String(b.id) === String(session.bookingId));
    if (originalBooking) {
      setManagerTrackingBooking(originalBooking);
    } else {
      setManagerTrackingBooking({
        id: session.bookingId,
        fno: session.flightNumber,
        date: session.flightDate || 'Today',
        customer: session.passenger?.name,
        phone: session.passenger?.phone,
        dir: session.direction,
        status: 'service_started',
        assignedStaff: {
          id: session.officer?.id,
          name: session.officer?.name,
          role: session.officer?.role,
          phone: session.officer?.phone,
        },
      });
    }
  };

  const handleSimulateStepForSession = (session) => {
    stepSimulationCloser(session.bookingId);
    setTrackingRefreshTick(t => t + 1);
    setTrackingActionNotice(
      lang
        ? `বুকিং ${session.bookingId}-এর জন্য অফিসার পদচিহ্ন অগ্রসর করা হয়েছে!`
        : `Simulated 1 step closer for booking ${session.bookingId}`
    );
    setTimeout(() => setTrackingActionNotice(''), 3000);
  };

  const handleSendDispatchPing = (session) => {
    sendTrackingPing(
      session.bookingId,
      'manager',
      'HQ Operations: Please confirm passenger & officer visual meetup at designated meeting point'
    );
    setTrackingRefreshTick(t => t + 1);
    setTrackingActionNotice(
      lang
        ? `বুকিং ${session.bookingId}-এ হেডকোয়ার্টার ডিসপ্যাচ পিং পাঠানো হয়েছে!`
        : `HQ Operations broadcast ping sent to ${session.bookingId}`
    );
    setTimeout(() => setTrackingActionNotice(''), 3000);
  };

  return (
    <View style={s.pagePanel}>
      {/* Title & Banner */}
      <View style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: 24 }}>📍</Text>
          <Text style={[s.h2, { marginBottom: 0 }]}>
            {lang ? 'লাইভ টার্মিনাল রাডার ও প্রোটোকল ট্র্যাকিং' : 'Live Terminal Radar & Protocol Tracking'}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: '#64748B' }}>
          {lang
            ? 'বিমানবন্দরে নিযুক্ত প্রোটোকল অফিসার এবং যাত্রীদের রিয়েল-টাইম অবস্থান, পারস্পরিক দূরত্ব, ওয়াকিং ETA এবং চেকপয়েন্ট পর্যবেক্ষণ'
            : 'Real-time mutual tracking between protocol officers and passengers, walking distance, ETA, and airport checkpoint telemetry'}
        </Text>
      </View>

      {/* Action Notice Banner */}
      {trackingActionNotice ? (
        <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 14 }}>
          <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700' }}>✓ {trackingActionNotice}</Text>
        </View>
      ) : null}

      {/* KPI Counter Cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <View style={{ flex: 1, minWidth: 150, backgroundColor: '#EFF6FF', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#BFDBFE' }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E40AF', textTransform: 'uppercase' }}>
            📡 {lang ? 'সক্রিয় ট্র্যাকিং সেশন' : 'Active Radar Sessions'}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#1E3A8A', marginTop: 4 }}>
            {activeSessions.length}
          </Text>
          <Text style={{ fontSize: 11, color: '#3B82F6', marginTop: 2 }}>
            {lang ? 'টার্মিনালে যুক্ত সেবা' : 'Airport live tracking pairs'}
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 150, backgroundColor: '#F0FDF4', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#BBF7D0' }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
            🧑‍✈️ {lang ? 'অন-টার্মিনাল অফিসার' : 'Officers Connected'}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#14532D', marginTop: 4 }}>
            {totalOfficersOnline}
          </Text>
          <Text style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>
            {lang ? 'সক্রিয় জিপিএস সংযোগ' : 'Broadcasting terminal GPS'}
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 150, backgroundColor: '#FAF5FF', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E9D5FF' }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#7E22CE', textTransform: 'uppercase' }}>
            👤 {lang ? 'সংযুক্ত যাত্রী/ক্লায়েন্ট' : 'Connected Clients'}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#581C87', marginTop: 4 }}>
            {totalPassengersSharing}
          </Text>
          <Text style={{ fontSize: 11, color: '#9333EA', marginTop: 2 }}>
            {lang ? 'লাইভ লোকেশন শেয়ারিং' : 'Mutual live sharing enabled'}
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 150, backgroundColor: '#FFFBEB', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#FDE68A' }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E', textTransform: 'uppercase' }}>
            🎯 {lang ? 'গড় পারস্পরিক দূরত্ব' : 'Average Mutual Proximity'}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#78350F', marginTop: 4 }}>
            {avgDistance} m
          </Text>
          <Text style={{ fontSize: 11, color: '#D97706', marginTop: 2 }}>
            {lang ? 'প্রায় ১-২ মিনিট হাঁটার পথ' : '~1-2 min walking reach'}
          </Text>
        </View>
      </View>

      {/* Filter and Search Bar */}
      <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {/* Airport Chips */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[
              { code: 'ALL', label: lang ? 'সকল বিমানবন্দর' : 'All Airports' },
              { code: 'DAC', label: 'DAC (Dhaka HSIA)' },
              { code: 'CGP', label: 'CGP (Chattogram)' },
              { code: 'ZYL', label: 'ZYL (Sylhet)' },
              { code: 'CXB', label: 'CXB (Cox’s Bazar)' },
            ].map(chip => (
              <TouchableOpacity
                key={chip.code}
                onPress={() => setTrackingAirportFilter(chip.code)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: trackingAirportFilter === chip.code ? '#0284C7' : '#F1F5F9',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: trackingAirportFilter === chip.code ? '#FFFFFF' : '#475569',
                  }}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Refresh Button */}
          <TouchableOpacity
            onPress={() => {
              setTrackingRefreshTick(t => t + 1);
              setTrackingActionNotice(lang ? 'রাডার ডেটা রিফ্রেশ করা হয়েছে!' : 'Radar telemetry refreshed!');
              setTimeout(() => setTrackingActionNotice(''), 2000);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: '#F8FAFC',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#CBD5E1',
            }}
          >
            <Text style={{ fontSize: 13 }}>🔄</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
              {lang ? 'রিফ্রেশ রাডার' : 'Refresh Telemetry'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Box */}
        <TextInput
          style={[s.in, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }]}
          placeholder={lang ? '🔍 বুকিং আইডি, অফিসার, যাত্রী বা ফ্লাইট নম্বর দিয়ে খুঁজুন...' : '🔍 Search by Booking ID, Officer, Guest Name or Flight...'}
          value={trackingSearchQuery}
          onChangeText={setTrackingSearchQuery}
        />
      </View>

      {/* Active Sessions List */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
            📡 {lang ? `সক্রিয় ট্র্যাকিং পেয়ারসমূহ (${activeSessions.length})` : `Active Tracking Pairs (${activeSessions.length})`}
          </Text>
        </View>

        {activeSessions.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📡</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
              {lang ? 'বর্তমানে কোনো সক্রিয় ট্র্যাকিং পেয়ার পাওয়া যায়নি' : 'No active tracking pairs currently found'}
            </Text>
            <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
              {lang
                ? 'বুকিংয়ে প্রোটোকল অফিসার নিযুক্ত থাকলে এবং সার্ভিস শুরু হলে এখানে রিয়েল-টাইম লাইভ রাডার দৃশ্যমান হবে।'
                : 'Active flights and protocol escort bookings will broadcast live terminal telemetry here.'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {activeSessions.map(session => {
              const dist = session.distanceMeters || 0;
              const eta = session.etaMinutes || 1;
              const isVeryClose = dist <= 35;
              const isInReach = dist <= 15;

              return (
                <View
                  key={session.bookingId}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: isVeryClose ? '#7DD3FC' : '#E2E8F0',
                    padding: 16,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 5,
                  }}
                >
                  {/* Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                          {session.bookingId}
                        </Text>
                        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#EFF6FF' }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7' }}>
                            📍 {session.airportCode}
                          </Text>
                        </View>
                        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: session.direction === 'arrival' ? '#ECFDF5' : '#FDF2F8' }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: session.direction === 'arrival' ? '#059669' : '#DB2777' }}>
                            {session.direction === 'arrival' ? '🛬 Arrival' : '🛫 Departure'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                        ✈️ {session.flightNumber || 'Flight'} • {session.flightDate || 'Today'}
                      </Text>
                    </View>

                    {/* Distance & ETA Badge */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          backgroundColor: isInReach ? '#DCFCE7' : isVeryClose ? '#E0F2FE' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: isInReach ? '#86EFAC' : isVeryClose ? '#BAE6FD' : '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{isInReach ? '🤝' : isVeryClose ? '🎯' : '🚶'}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: isInReach ? '#166534' : isVeryClose ? '#0369A1' : '#334155' }}>
                          {dist} m ({eta} min walk)
                        </Text>
                      </View>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: isInReach ? '#15803D' : isVeryClose ? '#0284C7' : '#64748B', marginTop: 3 }}>
                        {isInReach
                          ? (lang ? 'দৃষ্টিগোচর সীমার মধ্যে' : 'Handshake Reach')
                          : isVeryClose
                          ? (lang ? 'নিকটবর্তী সাক্ষাৎ বিন্দু' : 'Imminent Meetup')
                          : (lang ? 'চেকপয়েন্টের দিকে পদচারণা' : 'In Terminal Transit')}
                      </Text>
                    </View>
                  </View>

                  {/* Dual Cards: Officer vs Passenger */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    {/* Officer Info Box */}
                    <View style={{ flex: 1, minWidth: 220, backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={{ fontSize: 14 }}>🧑‍✈️</Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#0369A1', textTransform: 'uppercase' }}>
                            {lang ? 'প্রোটোকল অফিসার' : 'Protocol Officer'}
                          </Text>
                        </View>
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#0284C7' }}>
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FFFFFF' }}>ONLINE</Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                        {session.officer?.name || 'Protocol Officer'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#475569', marginBottom: 6 }}>
                        {session.officer?.role || 'Senior Concierge'} • 📞 {session.officer?.phone || '—'}
                      </Text>

                      <View style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E0F2FE' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>
                          📍 {lang ? 'বর্তমান অবস্থান / চেকপয়েন্ট:' : 'Current Checkpoint:'}
                        </Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                          {lang ? session.officer?.location?.checkpointNameBn : session.officer?.location?.checkpointNameEn}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                          🔋 92% • 📶 5G High Precision (±3m)
                        </Text>
                      </View>
                    </View>

                    {/* Passenger Info Box */}
                    <View style={{ flex: 1, minWidth: 220, backgroundColor: '#FAF5FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E9D5FF' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={{ fontSize: 14 }}>👤</Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#7E22CE', textTransform: 'uppercase' }}>
                            {lang ? 'যাত্রী / ক্লায়েন্ট' : 'Passenger / Client'}
                          </Text>
                        </View>
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#10B981' }}>
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FFFFFF' }}>SHARING GPS</Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                        {session.passenger?.name || 'Guest Passenger'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#475569', marginBottom: 6 }}>
                        📞 {session.passenger?.phone || '—'}
                      </Text>

                      <View style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F3E8FF' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#7E22CE' }}>
                          📍 {lang ? 'যাত্রীর অবস্থান / এলাকা:' : 'Passenger Spot:'}
                        </Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                          {lang ? session.passenger?.location?.checkpointNameBn : session.passenger?.location?.checkpointNameEn}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                          📡 {session.passenger?.location?.accuracy || 'GPS High Precision'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons Toolbar */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <TouchableOpacity
                      onPress={() => handleSimulateStepForSession(session)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: '#F8FAFC',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>🚶</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                        {lang ? 'হাঁটার সিমুলেশন' : 'Step Simulation'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleSendDispatchPing(session)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: '#FEF3C7',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>📢</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>
                        {lang ? 'এইচকিউ ডিসপ্যাচ পিং' : 'HQ Alert Ping'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(
                          getGoogleMapsNavigationUrl(
                            session.officer?.location?.lat,
                            session.officer?.location?.lng,
                            session.passenger?.location?.lat,
                            session.passenger?.location?.lng,
                            'walking'
                          )
                        ).catch(() => {})
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: '#EFF6FF',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#BFDBFE',
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>🗺️</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#1D4ED8' }}>
                        {lang ? 'গুগল ম্যাপে রুট' : 'Google Maps Route'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleOpenRadarForSession(session)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#0284C7',
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 8,
                        shadowColor: '#0284C7',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 3,
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>📡</Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                        {lang ? 'লাইভ টার্মিনাল রাডার ও ম্যাপ' : 'Open Radar & Map'}
                      </Text>
                    </TouchableOpacity>

                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Airport Checkpoints Directory & Zone Reference */}
      <View style={{ backgroundColor: '#FFFFFF', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
              🗺️ {lang ? 'ঢাকা হযরত শাহজালাল বিমানবন্দর (HSIA DAC) টার্মিনাল চেকপয়েন্ট তালিকা' : 'HSIA Dhaka Terminal Checkpoint Directory'}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              {lang ? 'প্রোটোকল অফিসার ও যাত্রীদের অবস্থান নির্ধারণের অফিশিয়াল ইনডোর জোন্স' : 'Official zones and indoor checkpoints for real-time terminal positioning'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {AIRPORT_CHECKPOINTS.map(cp => (
            <View
              key={cp.id}
              style={{
                flex: 1,
                minWidth: 200,
                backgroundColor: cp.isMeetingPoint ? '#F0FDF4' : '#F8FAFC',
                padding: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: cp.isMeetingPoint ? '#BBF7D0' : '#E2E8F0',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 16 }}>{cp.icon}</Text>
                {cp.isMeetingPoint && (
                  <View style={{ backgroundColor: '#16A34A', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>MEET POINT</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                {lang ? cp.labelBn : cp.labelEn}
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                {cp.zone} • {cp.lat.toFixed(4)}, {cp.lng.toFixed(4)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Google Maps Platform Configuration & API Key Panel */}
      <View style={{ backgroundColor: '#FFFFFF', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>🗺️</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
              {lang ? 'Google Maps Platform ইন্টিগ্রেশন ও এপিআই কি কনফিগারেশন' : 'Google Maps Platform API Configuration'}
            </Text>
          </View>
          <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1' }}>PRO & DEMO KEY READY</Text>
          </View>
        </View>

        <Text style={{ fontSize: 12.5, color: '#64748B', lineHeight: 18, marginBottom: 12 }}>
          {lang
            ? 'লাইভ টার্মিনাল ট্র্যাকিং এবং ইন্টারঅ্যাক্টিভ স্যাটেলাইট ভিউ চালু রাখতে আপনার নিজস্ব Google Maps API Key বা Google Maps Demo Key প্রদান করুন।'
            : 'Provide your Google Maps API Key to enable native satellite/roadmap satellite tiles, real-time walking route directions and interactive radar overlays.'}
        </Text>

        {googleMapsKeyStatus ? (
          <View style={{ backgroundColor: '#ECFDF5', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 10 }}>
            <Text style={{ color: '#065F46', fontSize: 12.5, fontWeight: '700' }}>✓ {googleMapsKeyStatus}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <TextInput
            style={[s.in, { flex: 1, minWidth: 240, marginBottom: 0, backgroundColor: '#F8FAFC' }]}
            placeholder="Enter Google Maps API Key"
            value={googleMapsApiKeyInput}
            onChangeText={setGoogleMapsApiKeyInput}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={handleSaveGoogleMapsApiKey}
            style={[s.btn, { width: 'auto', paddingHorizontal: 20, marginBottom: 0 }]}
          >
            <Text style={s.btnT}>{lang ? 'কি সংরক্ষণ করুন' : 'Save Key'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => {
              setGoogleMapsApiKeyInput('');
              handleSaveGoogleMapsApiKey();
            }}
            style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
          >
            <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>
              🔄 {lang ? 'ফ্লাইট কেয়ার ডিফল্ট ব্যবহার করুন' : 'Use App Default Key'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://developers.google.com/maps/documentation/javascript/get-api-key').catch(() => {})}
            style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
          >
            <Text style={{ color: '#334155', fontSize: 12.5, fontWeight: '700' }}>
              ✨ {lang ? 'ফ্রি ডেমো কি সংগ্রহ করুন ↗' : 'Get Free Demo Key ↗'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: '#F0F9FF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BAE6FD' }}>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0369A1' }}>
            💡 {lang ? 'নিরাপত্তা ও রেস্ট্রিকশন পরামর্শ (Security Best Practices):' : 'Security & Terms Best Practices:'}
          </Text>
          <Text style={{ fontSize: 11, color: '#0284C7', marginTop: 4, lineHeight: 16 }}>
            • {lang ? 'প্রোডাকশন ব্যবহারের জন্য আপনার কি-টিকে HTTP Referrer (Web) অথবা Android Package Name দিয়ে সীমাবদ্ধ (Restrict) করুন।' : 'Restrict production API keys by HTTP referrer or Android package name in Google Cloud Console.'}
            {'\n'}• {lang ? 'প্রয়োজনীয় সার্ভিসসমূহ: Maps JavaScript API, Routes API, Maps Embed API।' : 'Required APIs to enable: Maps JavaScript API, Routes API, Maps Embed API.'}
            {'\n'}• {lang ? 'গুগল ম্যাপস প্ল্যাটফর্ম টার্মস অফ সার্ভিস মেনে ব্যবহার করুন।' : 'Subject to Google Maps Platform Terms of Service: https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentskills_v1'}
          </Text>
        </View>
      </View>
    </View>
  );
}

