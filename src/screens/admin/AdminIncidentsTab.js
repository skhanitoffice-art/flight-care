import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {
  getIncidentLogs,
  saveIncidentLogs,
  getShiftBriefing,
  saveShiftBriefing,
  DEFAULT_INCIDENT_LOGS,
} from '../../services/airportOperationsService';

export default function AdminIncidentsTab({
  bookings = [],
  allPlatformBookings = [],
  staffRoster = [],
  onUpdateBooking,
  managerSession,
  lang = 0,
  s = {},
}) {
  const [activeSubTab, setActiveSubTab] = useState('incidents'); // 'incidents' | 'briefing' | 'flightradar'
  const [incidentList, setIncidentList] = useState([]);
  const [incidentFilter, setIncidentFilter] = useState('all'); // 'all' | 'open' | 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Incident Form state
  const [showAddIncidentModal, setShowAddIncidentModal] = useState(false);
  const [formPassengerName, setFormPassengerName] = useState('');
  const [formFlightNo, setFormFlightNo] = useState('');
  const [formType, setFormType] = useState('lost_baggage');
  const [formPriority, setFormPriority] = useState('HIGH');
  const [formPirNumber, setFormPirNumber] = useState('');
  const [formBagDescription, setFormBagDescription] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAssignedOfficer, setFormAssignedOfficer] = useState('');
  const [notice, setNotice] = useState('');

  // Shift Handover Briefing state
  const [briefing, setBriefing] = useState(null);
  const [briefingTextEn, setBriefingTextEn] = useState('');
  const [briefingTextBn, setBriefingTextBn] = useState('');
  const [isSavingBriefing, setIsSavingBriefing] = useState(false);

  // Flight Radar Broadcaster state
  const [selectedBookingForFlight, setSelectedBookingForFlight] = useState(null);
  const [updateGateInput, setUpdateGateInput] = useState('');
  const [updateDelayInput, setUpdateDelayInput] = useState('On Time');
  const [updateRemarksInput, setUpdateRemarksInput] = useState('');

  // Load data
  useEffect(() => {
    getIncidentLogs().then(data => setIncidentList(data || DEFAULT_INCIDENT_LOGS));
    getShiftBriefing().then(b => {
      if (b) {
        setBriefing(b);
        setBriefingTextEn(b.priorityNoticeEn || '');
        setBriefingTextBn(b.priorityNoticeBn || '');
      }
    });
  }, []);

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  // Add new incident
  const handleCreateIncident = async () => {
    if (!formPassengerName.trim() || !formFlightNo.trim()) {
      const err = lang ? 'অনুগ্রহ করে যাত্রীর নাম ও ফ্লাইট নম্বর প্রদান করুন।' : 'Please enter passenger name and flight number.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(err);
      else Alert.alert('Error', err);
      return;
    }

    const newInc = {
      id: `INC-2026-${String(Date.now()).slice(-4)}`,
      bookingId: `BK-${String(Date.now()).slice(-4)}`,
      passengerName: formPassengerName.trim(),
      flightNumber: formFlightNo.trim().toUpperCase(),
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: formType,
      typeNameEn: formType === 'lost_baggage' ? 'Lost / Delayed Baggage' : formType === 'customs_hold' ? 'Customs Inspection Hold' : formType === 'medical_assist' ? 'Medical Assistance' : 'Flight Disruption',
      typeNameBn: formType === 'lost_baggage' ? 'হারানো / বিলম্বিত লাগেজ' : formType === 'customs_hold' ? 'কাস্টমস ক্লিয়ারেন্স বিলম্ব' : formType === 'medical_assist' ? 'মেডিকেল ও হুইলচেয়ার সহায়তা' : 'ফ্লাইট সমস্যা',
      priority: formPriority,
      status: 'open',
      assignedOfficer: formAssignedOfficer || (staffRoster[0]?.name ? `${staffRoster[0].name} (${staffRoster[0].badgeId || 'ST-01'})` : 'Duty Officer'),
      pirNumber: formPirNumber.trim() || `DAC-PIR-${Math.floor(10000 + Math.random() * 90000)}`,
      bagDescription: formBagDescription.trim() || 'N/A',
      notes: formNotes.trim() || 'Logged by Operations Manager.',
      resolutionNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextList = [newInc, ...incidentList];
    setIncidentList(nextList);
    await saveIncidentLogs(nextList);

    // Reset Form
    setFormPassengerName('');
    setFormFlightNo('');
    setFormPirNumber('');
    setFormBagDescription('');
    setFormNotes('');
    setShowAddIncidentModal(false);
    showToast(lang ? `নতুন ইনসিডেন্ট #${newInc.id} সফলভাবে নথিভুক্ত হয়েছে!` : `Incident #${newInc.id} logged successfully!`);
  };

  // Resolve incident
  const handleResolveIncident = async (incId, resNote = 'Resolved by Duty Protocol Officer.') => {
    const nextList = incidentList.map(item => {
      if (item.id === incId) {
        return {
          ...item,
          status: 'resolved',
          resolutionNotes: resNote,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    setIncidentList(nextList);
    await saveIncidentLogs(nextList);
    showToast(lang ? `ইনসিডেন্ট #${incId} সফলভাবে সমাধান হিসেবে চিহ্নিত হয়েছে!` : `Incident #${incId} marked as resolved!`);
  };

  // Save Shift Briefing
  const handleSaveBriefing = async () => {
    setIsSavingBriefing(true);
    const updated = {
      ...(briefing || {}),
      date: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
      managerName: managerSession?.user?.name || 'Operations Director',
      priorityNoticeEn: briefingTextEn.trim(),
      priorityNoticeBn: briefingTextBn.trim(),
    };
    setBriefing(updated);
    await saveShiftBriefing(updated);
    setIsSavingBriefing(false);
    showToast(lang ? 'অপারেশনাল শিফট ব্রিফিং সকল অফিসারের প্যানেলে আপডেট করা হয়েছে!' : 'Shift briefing broadcasted to all active officers!');
  };

  // Flight Radar Broadcaster save
  const handleBroadcastFlightUpdate = () => {
    if (!selectedBookingForFlight) return;
    const bookingId = selectedBookingForFlight.id;
    const updates = {
      gate: updateGateInput.trim() || selectedBookingForFlight.gate || 'Gate 8',
      flightStatus: updateDelayInput,
      flightRemarks: updateRemarksInput.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateBooking) {
      onUpdateBooking(bookingId, updates);
    }
    setSelectedBookingForFlight(null);
    showToast(lang ? `ফ্লাইট স্ট্যাটাস ও গেট সফলভাবে ব্রডকাস্ট হয়েছে (${updates.gate} • ${updates.flightStatus})!` : `Flight & Gate broadcasted successfully (${updates.gate} • ${updates.flightStatus})!`);
  };

  // Filtered incidents
  const filteredIncidents = incidentList.filter(item => {
    if (incidentFilter === 'open' && item.status === 'resolved') return false;
    if (incidentFilter === 'resolved' && item.status !== 'resolved') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const p = (item.passengerName || '').toLowerCase();
      const f = (item.flightNumber || '').toLowerCase();
      const id = (item.id || '').toLowerCase();
      const pir = (item.pirNumber || '').toLowerCase();
      if (!p.includes(q) && !f.includes(q) && !id.includes(q) && !pir.includes(q)) return false;
    }
    return true;
  });

  const effectiveBookings = allPlatformBookings.length > 0 ? allPlatformBookings : bookings;

  return (
    <View style={{ flex: 1 }}>
      {/* Toast Notice */}
      {notice ? (
        <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#A7F3D0', padding: 12, borderRadius: 12, marginBottom: 14 }}>
          <Text style={{ color: '#065F46', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>
            ✓ {notice}
          </Text>
        </View>
      ) : null}

      {/* Header Banner */}
      <View
        style={{
          backgroundColor: '#0F172A',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 240 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 24 }}>🚨</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>
              {lang ? 'এয়ারপোর্ট ইনসিডেন্ট ও অপারেশনাল কন্ট্রোল রুম' : 'Airport Operations & Incident Command'}
            </Text>
          </View>
          <Text style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 4 }}>
            {lang
              ? 'হারানো লাগেজ ট্র্যাকিং (PIR), শিফট ব্রিফিং ও রিয়েল-টাইম ফ্লাইট গেট ব্রডকাস্টার।'
              : 'Lost baggage assistance, shift handover briefing, and real-time flight gate alerts.'}
          </Text>
        </View>

        {activeSubTab === 'incidents' && (
          <TouchableOpacity
            onPress={() => setShowAddIncidentModal(true)}
            style={{
              backgroundColor: '#DC2626',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              shadowColor: '#DC2626',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 14 }}>＋</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
              {lang ? 'নতুন ইনসিডেন্ট লগ করুন' : 'Log New Incident'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sub Tabs Selector */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#F1F5F9',
          padding: 4,
          borderRadius: 12,
          marginBottom: 16,
          gap: 6,
        }}
      >
        {[
          ['incidents', lang ? `🚨 হারানো লাগেজ ও ইনসিডেন্ট (${incidentList.filter(i => i.status !== 'resolved').length} চলমান)` : `🚨 Incidents & Bags (${incidentList.filter(i => i.status !== 'resolved').length})`],
          ['briefing', lang ? '📢 শিফট হ্যান্ডওভার ও ব্রিফিং ডায়েরি' : '📢 Shift Briefing Diary'],
          ['flightradar', lang ? '✈️ ফ্লাইট শিডিউল ও গেট ব্রডকাস্ট' : '✈️ Flight Gate Broadcaster'],
        ].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveSubTab(key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: activeSubTab === key ? '#FFFFFF' : 'transparent',
              alignItems: 'center',
              shadowColor: activeSubTab === key ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: activeSubTab === key ? 0.08 : 0,
              shadowRadius: 3,
              elevation: activeSubTab === key ? 2 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: '800',
                color: activeSubTab === key ? '#0284C7' : '#64748B',
                textAlign: 'center',
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TAB 1: INCIDENTS & LOST BAGGAGE */}
      {activeSubTab === 'incidents' && (
        <View>
          {/* Filters & Search */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                ['all', lang ? 'সকল' : 'All'],
                ['open', lang ? 'তদন্তাধীন' : 'Open / In Progress'],
                ['resolved', lang ? 'সমাধানকৃত' : 'Resolved'],
              ].map(([k, lbl]) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setIncidentFilter(k)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: incidentFilter === k ? '#0F172A' : '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: incidentFilter === k ? '#FFFFFF' : '#475569' }}>
                    {lbl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: '#CBD5E1',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                fontSize: 12.5,
                width: 220,
              }}
              placeholder={lang ? '🔍 যাত্রী বা PIR খুঁজুন...' : '🔍 Search passenger or PIR...'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Incidents List */}
          {filteredIncidents.length === 0 ? (
            <View style={{ padding: 36, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>🛡️</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'বর্তমানে কোনো অমীমাংসিত ইনসিডেন্ট নেই' : 'No incident logs found'}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                {lang ? 'সকল ভিআইপি লাগেজ ও প্রোটোকল সার্ভিস সুষ্ঠুভাবে চলমান রয়েছে।' : 'All VIP baggage and protocol operations running smoothly.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filteredIncidents.map(inc => {
                const isOpen = inc.status !== 'resolved';
                return (
                  <View
                    key={inc.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: isOpen ? '#FCA5A5' : '#BBF7D0',
                      padding: 16,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 5,
                      elevation: 2,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>
                            {inc.passengerName}
                          </Text>
                          <View style={{ backgroundColor: inc.priority === 'HIGH' ? '#FEE2E2' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 5 }}>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: inc.priority === 'HIGH' ? '#DC2626' : '#D97706' }}>
                              {inc.priority} PRIORITY
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                          ✈️ {inc.flightNumber} • {inc.date} ({inc.time}) • Ticket: #{inc.id}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <View style={{ backgroundColor: isOpen ? '#FEF2F2' : '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: isOpen ? '#FECACA' : '#BBF7D0' }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: isOpen ? '#DC2626' : '#16A34A' }}>
                            {isOpen ? (lang ? '🚨 তদন্তাধীন (Open)' : '🚨 Open') : (lang ? '✓ সমাধানকৃত (Resolved)' : '✓ Resolved')}
                          </Text>
                        </View>
                        {inc.pirNumber && (
                          <Text style={{ fontSize: 10.5, color: '#0284C7', fontWeight: '700', marginTop: 4 }}>
                            PIR: {inc.pirNumber}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Description Box */}
                    <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                        📌 {lang ? 'সমস্যার বিবরণ:' : 'Details:'} {inc.notes}
                      </Text>
                      {inc.bagDescription && inc.bagDescription !== 'N/A' && (
                        <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>
                          🧳 {lang ? 'লাগেজের বিবরণ:' : 'Baggage:'} {inc.bagDescription}
                        </Text>
                      )}
                      {inc.resolutionNotes ? (
                        <Text style={{ fontSize: 11.5, color: '#059669', fontWeight: '700', marginTop: 4 }}>
                          ✓ {lang ? 'সমাধান নোট:' : 'Resolution:'} {inc.resolutionNotes}
                        </Text>
                      ) : null}
                    </View>

                    {/* Bottom Action Footer */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        🧑‍✈️ {lang ? 'দায়িত্বরত অফিসার:' : 'Officer:'} <Text style={{ fontWeight: '700', color: '#0F172A' }}>{inc.assignedOfficer}</Text>
                      </Text>

                      {isOpen && (
                        <TouchableOpacity
                          onPress={() => handleResolveIncident(inc.id, 'লাগেজ উদ্ধার সম্পন্ন ও যাত্রীকে নিরাপদে হস্তান্তর করা হয়েছে।')}
                          style={{
                            backgroundColor: '#059669',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontSize: 11 }}>✓</Text>
                          <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>
                            {lang ? 'সমাধান নিশ্চিত করুন' : 'Mark as Resolved'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* TAB 2: SHIFT HANDOVER BRIEFING */}
      {activeSubTab === 'briefing' && (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>📢</Text>
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'দৈনিক শিফট ব্রিফিং ও অপারেশনাল হ্যান্ডওভার ডায়েরি' : 'Shift Briefing & Operational Diary'}
              </Text>
              <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                {lang ? 'এখানে সংরক্ষিত নির্দেশনা সরাসরি সকল প্রোটোকল অফিসারের প্যানেলে প্রদর্শিত হবে।' : 'Notes published here appear at the top of every active officer screen.'}
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
              {lang ? 'শিফট ব্রিফিং নোট (বাংলা)' : 'Shift Priority Notice (Bengali)'}
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1.5,
                borderColor: '#CBD5E1',
                borderRadius: 10,
                padding: 12,
                fontSize: 13,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              multiline
              value={briefingTextBn}
              onChangeText={setBriefingTextBn}
              placeholder="আজকের বিশেষ ভিআইপি আগমন ও নির্দেশনা লিখুন..."
            />
          </View>

          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
              {lang ? 'শিফট ব্রিফিং নোট (ইংরেজি)' : 'Shift Priority Notice (English)'}
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1.5,
                borderColor: '#CBD5E1',
                borderRadius: 10,
                padding: 12,
                fontSize: 13,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              multiline
              value={briefingTextEn}
              onChangeText={setBriefingTextEn}
              placeholder="Enter special VIP arrival notes and protocol directives for the shift..."
            />
          </View>

          <TouchableOpacity
            onPress={handleSaveBriefing}
            disabled={isSavingBriefing}
            style={{
              backgroundColor: '#0284C7',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
              {isSavingBriefing ? '…' : (lang ? '📢 শিফট ব্রিফিং প্রকাশ ও ব্রডকাস্ট করুন' : '📢 Publish & Broadcast Briefing')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TAB 3: FLIGHT RADAR & GATE BROADCASTER */}
      {activeSubTab === 'flightradar' && (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>✈️</Text>
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'রিয়েল-টাইম ফ্লাইট বিলম্ব ও গেট পরিবর্তন ব্রডকাস্টার' : 'Real-Time Flight & Gate Broadcaster'}
              </Text>
              <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                {lang ? 'ফ্লাইটের গেট পরিবর্তন বা বিলম্ব হলে এখান থেকে ১-ক্লিকে অফিসার ও যাত্রীকে অ্যালার্ট পাঠান।' : 'Instantly update aerobridge gate and flight delays for assigned protocol teams.'}
              </Text>
            </View>
          </View>

          {/* Active Bookings Selector */}
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
            {lang ? 'ফ্লাইট নির্বাচন করুন:' : 'Select Active Flight Booking:'}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {effectiveBookings.slice(0, 10).map(b => {
                const isSel = selectedBookingForFlight?.id === b.id;
                const fno = b.fno || b.flight?.number || 'FLIGHT';
                const pax = b.customer || b.passengerName || 'Pax';
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => {
                      setSelectedBookingForFlight(b);
                      setUpdateGateInput(b.gate || 'Gate 8');
                      setUpdateDelayInput(b.flightStatus || 'On Time');
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: isSel ? '#0284C7' : '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: isSel ? '#0369A1' : '#CBD5E1',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '900', color: isSel ? '#FFFFFF' : '#0F172A' }}>
                      ✈️ {fno}
                    </Text>
                    <Text style={{ fontSize: 11, color: isSel ? '#E0F2FE' : '#64748B', marginTop: 2 }}>
                      {pax}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {selectedBookingForFlight ? (
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>
                ✈️ {selectedBookingForFlight.fno || selectedBookingForFlight.flight?.number} · {selectedBookingForFlight.customer || selectedBookingForFlight.passengerName}
              </Text>

              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <View style={{ flex: 1, minWidth: 140 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                    {lang ? 'নতুন গেট বা বোর্ডিং ব্রিজ:' : 'Gate / Aerobridge:'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 8, padding: 8, fontSize: 13 }}
                    value={updateGateInput}
                    onChangeText={setUpdateGateInput}
                    placeholder="e.g. Gate 14 / Bridge 5"
                  />
                </View>

                <View style={{ flex: 1, minWidth: 140 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                    {lang ? 'ফ্লাইট স্ট্যাটাস / বিলম্ব:' : 'Flight Status / Delay:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {['On Time', 'Delayed +30m', 'Delayed +1h', 'Gate Changed'].map(st => (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setUpdateDelayInput(st)}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 7,
                          borderRadius: 6,
                          backgroundColor: updateDelayInput === st ? '#D97706' : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: updateDelayInput === st ? '#FFFFFF' : '#334155' }}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleBroadcastFlightUpdate}
                style={{
                  backgroundColor: '#D97706',
                  paddingVertical: 11,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  ⚡ {lang ? 'ফ্লাইট ও গেট আপডেট ব্রডকাস্ট করুন' : 'Broadcast Gate & Flight Update'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={{ fontSize: 12.5, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 14 }}>
              {lang ? 'অনুগ্রহ করে উপরের তালিকা থেকে একটি ফ্লাইট বুকিং নির্বাচন করুন।' : 'Please select a booking above to broadcast gate or schedule changes.'}
            </Text>
          )}
        </View>
      )}

      {/* MODAL: ADD INCIDENT */}
      {showAddIncidentModal && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
            zIndex: 100,
          }}
        >
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 500, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                🚨 {lang ? 'নতুন এয়ারপোর্ট ইনসিডেন্ট লগ' : 'Log New Incident'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddIncidentModal(false)}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                <View>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 2 }}>
                    {lang ? 'যাত্রীর নাম *' : 'Passenger Name *'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 8, padding: 8, fontSize: 12.5 }}
                    placeholder="e.g. Ambassador Rahman"
                    value={formPassengerName}
                    onChangeText={setFormPassengerName}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 2 }}>
                      {lang ? 'ফ্লাইট নম্বর *' : 'Flight No *'}
                    </Text>
                    <TextInput
                      style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 8, padding: 8, fontSize: 12.5 }}
                      placeholder="e.g. EK 582"
                      value={formFlightNo}
                      onChangeText={setFormFlightNo}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 2 }}>
                      {lang ? 'PIR ট্যাগ (যদি থাকে)' : 'PIR Tag No'}
                    </Text>
                    <TextInput
                      style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 8, padding: 8, fontSize: 12.5 }}
                      placeholder="DAC-EK-88291"
                      value={formPirNumber}
                      onChangeText={setFormPirNumber}
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 2 }}>
                    {lang ? 'ইনসিডেন্টের ধরন:' : 'Incident Type:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      ['lost_baggage', '🧳 হারানো লাগেজ'],
                      ['customs_hold', '🛂 কাস্টমস বিলম্ব'],
                      ['medical_assist', '🩺 মেডিকেল সহায়তা'],
                      ['flight_delay', '⏱️ ফ্লাইট বিলম্ব'],
                    ].map(([t, l]) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setFormType(t)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          backgroundColor: formType === t ? '#DC2626' : '#F1F5F9',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: formType === t ? '#FFFFFF' : '#334155' }}>
                          {l}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 2 }}>
                    {lang ? 'লাগেজের রঙ / বিবরণ:' : 'Baggage Description:'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 8, padding: 8, fontSize: 12.5 }}
                    placeholder="Black Samsonite trolley with red tag..."
                    value={formBagDescription}
                    onChangeText={setFormBagDescription}
                  />
                </View>

                <View>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 2 }}>
                    {lang ? 'অপারেশনাল বিবরণ ও নোট:' : 'Incident Notes:'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 8, padding: 8, fontSize: 12.5, minHeight: 60 }}
                    multiline
                    placeholder="Describe incident and immediate action taken..."
                    value={formNotes}
                    onChangeText={setFormNotes}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleCreateIncident}
                  style={{
                    backgroundColor: '#DC2626',
                    paddingVertical: 11,
                    borderRadius: 10,
                    alignItems: 'center',
                    marginTop: 6,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                    {lang ? 'ইনসিডেন্ট সংরক্ষণ ও লগ করুন' : 'Log Incident Ticket'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

