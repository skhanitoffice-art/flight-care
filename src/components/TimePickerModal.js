import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';

const toBnNum = num =>
  String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);

// Common Airport Flight Time Slots for Fast Selection
const QUICK_TIME_SLOTS = [
  { labelEn: 'Morning 06:00', labelBn: 'সকাল ০৬:০০', time: '06:00' },
  { labelEn: 'Morning 08:30', labelBn: 'সকাল ০৮:৩০', time: '08:30' },
  { labelEn: 'Morning 10:15', labelBn: 'সকাল ১০:১৫', time: '10:15' },
  { labelEn: 'Noon 12:00', labelBn: 'দুপুর ১২:০০', time: '12:00' },
  { labelEn: 'Noon 13:45', labelBn: 'দুপুর ০১:৪৫', time: '13:45' },
  { labelEn: 'Afternoon 15:30', labelBn: 'বিকাল ০৩:৩০', time: '15:30' },
  { labelEn: 'Evening 17:00', labelBn: 'বিকাল ০৫:০০', time: '17:00' },
  { labelEn: 'Evening 19:30', labelBn: 'সন্ধ্যা ০৭:৩০', time: '19:30' },
  { labelEn: 'Night 21:00', labelBn: 'রাত ০৯:০০', time: '21:00' },
  { labelEn: 'Night 22:45', labelBn: 'রাত ১০:৪৫', time: '22:45' },
  { labelEn: 'Midnight 00:30', labelBn: 'মধ্যরাত ১২:৩০', time: '00:30' },
  { labelEn: 'Early Flight 03:30', labelBn: 'ভোর ০৩:৩০', time: '03:30' },
];

const HOURS_12 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export default function TimePickerModal({
  visible,
  onClose,
  onSelectTime,
  selectedTime,
  lang = 0,
}) {
  const isBn = Boolean(lang);

  // Parse initial 24h time 'HH:mm'
  const parseInitialTime = (timeStr) => {
    if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr.trim())) {
      const [hStr, mStr] = timeStr.trim().split(':');
      let h = parseInt(hStr, 10);
      let m = parseInt(mStr, 10);
      const isPm = h >= 12;
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      return {
        hour: String(h12).padStart(2, '0'),
        minute: String(m).padStart(2, '0'),
        period: isPm ? 'PM' : 'AM',
      };
    }
    // Default to current local time rounded to nearest 5 mins
    const now = new Date();
    let curH = now.getHours();
    let curM = Math.round(now.getMinutes() / 5) * 5;
    if (curM >= 60) {
      curM = 0;
      curH = (curH + 1) % 24;
    }
    const isPm = curH >= 12;
    let h12 = curH % 12;
    if (h12 === 0) h12 = 12;
    return {
      hour: String(h12).padStart(2, '0'),
      minute: String(curM).padStart(2, '0'),
      period: isPm ? 'PM' : 'AM',
    };
  };

  const initial = useMemo(() => parseInitialTime(selectedTime), [selectedTime, visible]);

  const [selectedHour, setSelectedHour] = useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(initial.period);

  useEffect(() => {
    if (visible) {
      const init = parseInitialTime(selectedTime);
      setSelectedHour(init.hour);
      setSelectedMinute(init.minute);
      setSelectedPeriod(init.period);
    }
  }, [visible, selectedTime]);

  // Convert 12h + AM/PM back to standard 24h 'HH:mm'
  const computed24HourTime = useMemo(() => {
    let h = parseInt(selectedHour, 10);
    if (selectedPeriod === 'PM' && h < 12) h += 12;
    if (selectedPeriod === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${selectedMinute}`;
  }, [selectedHour, selectedMinute, selectedPeriod]);

  const handleConfirm = () => {
    if (onSelectTime) {
      onSelectTime(computed24HourTime);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleSelectQuickSlot = (time24) => {
    const parsed = parseInitialTime(time24);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period);
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    const h24 = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    handleSelectQuickSlot(`${h24}:${m}`);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
          zIndex: 99999,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            width: '100%',
            maxWidth: 440,
            maxHeight: '92%',
            overflow: 'hidden',
            boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.35)',
            elevation: 12,
          }}
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: '#0F172A',
              paddingVertical: 14,
              paddingHorizontal: 18,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: '#1E293B',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#0284C7',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18 }}>⏰</Text>
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                  {isBn ? 'সেবার সময় নির্বাচন করুন' : 'Pick Service Time'}
                </Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '500' }}>
                  {isBn ? 'ফ্লাইটের আগমন বা প্রস্থান সময়' : 'Flight arrival or departure schedule'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 18 }}>
            {/* Big Digital Clock Display */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 2,
                borderColor: '#0284C7',
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
                alignItems: 'center',
                marginBottom: 16,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                {isBn ? 'নির্বাচিত সময় (২৪-ঘণ্টা / ১২-ঘণ্টা)' : 'Selected Time (24h / 12h Format)'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontSize: 36, fontWeight: '900', color: '#0F172A', letterSpacing: 1 }}>
                  {selectedHour}:{selectedMinute}
                </Text>
                <View
                  style={{
                    backgroundColor: selectedPeriod === 'AM' ? '#E0F2FE' : '#FEF3C7',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: selectedPeriod === 'AM' ? '#BAE6FD' : '#FDE68A',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '900', color: selectedPeriod === 'AM' ? '#0369A1' : '#B45309' }}>
                    {selectedPeriod}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0284C7', marginLeft: 8 }}>
                  ({computed24HourTime})
                </Text>
              </View>

              {/* Set Current Time Pill Button */}
              <TouchableOpacity
                onPress={handleSetCurrentTime}
                activeOpacity={0.7}
                style={{
                  marginTop: 10,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Text style={{ fontSize: 12 }}>⚡</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                  {isBn ? 'বর্তমান সময় সেট করুন' : 'Set to Current Time'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* AM / PM Toggle */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6 }}>
                {isBn ? 'বেলার অংশ (AM / PM):' : 'Period (AM / PM):'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {['AM', 'PM'].map(p => {
                  const isSelected = selectedPeriod === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setSelectedPeriod(p)}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: isSelected ? '#0284C7' : '#F1F5F9',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#0284C7' : '#E2E8F0',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '800',
                          color: isSelected ? '#FFFFFF' : '#475569',
                        }}
                      >
                        {p === 'AM' ? (isBn ? 'AM (সকাল/ভোর)' : 'AM (Morning)') : (isBn ? 'PM (দুপুর/রাত)' : 'PM (Afternoon/Night)')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Hour Selector (01 - 12) */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6 }}>
                {isBn ? 'ঘণ্টা নির্বাচন (Hour):' : 'Select Hour (01 - 12):'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {HOURS_12.map(h => {
                  const isSelected = selectedHour === h;
                  return (
                    <TouchableOpacity
                      key={h}
                      onPress={() => setSelectedHour(h)}
                      activeOpacity={0.7}
                      style={{
                        width: '14.5%',
                        aspectRatio: 1.1,
                        borderRadius: 8,
                        backgroundColor: isSelected ? '#0284C7' : '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#0284C7' : '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected ? '900' : '700',
                          color: isSelected ? '#FFFFFF' : '#1E293B',
                        }}
                      >
                        {isBn ? toBnNum(h) : h}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Minute Selector (00 - 55 in 5 min intervals) */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6 }}>
                {isBn ? 'মিনিট নির্বাচন (Minute):' : 'Select Minute:'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {MINUTES.map(m => {
                  const isSelected = selectedMinute === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setSelectedMinute(m)}
                      activeOpacity={0.7}
                      style={{
                        width: '14.5%',
                        aspectRatio: 1.1,
                        borderRadius: 8,
                        backgroundColor: isSelected ? '#0D9488' : '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#0D9488' : '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected ? '900' : '700',
                          color: isSelected ? '#FFFFFF' : '#1E293B',
                        }}
                      >
                        {isBn ? toBnNum(m) : m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Quick Presets (Airport Flight Timetable Slots) */}
            <View style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#64748B', marginBottom: 6 }}>
                ⚡ {isBn ? 'বিমানবন্দরের জনপ্রিয় ফ্লাইট সময়সমূহ (দ্রুত নির্বাচন):' : 'Popular Flight Times (Quick Pick):'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_TIME_SLOTS.map(slot => (
                  <TouchableOpacity
                    key={slot.time}
                    onPress={() => handleSelectQuickSlot(slot.time)}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: computed24HourTime === slot.time ? '#0284C7' : '#F1F5F9',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderWidth: 1,
                      borderColor: computed24HourTime === slot.time ? '#0284C7' : '#CBD5E1',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: computed24HourTime === slot.time ? '#FFFFFF' : '#334155',
                      }}
                    >
                      {isBn ? slot.labelBn : slot.labelEn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View
            style={{
              padding: 14,
              backgroundColor: '#F8FAFC',
              borderTopWidth: 1,
              borderTopColor: '#E2E8F0',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: 10,
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: '#CBD5E1',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                {isBn ? 'বাতিল' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.85}
              style={{
                flex: 2,
                paddingVertical: 11,
                borderRadius: 10,
                backgroundColor: '#0284C7',
                alignItems: 'center',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                ✓ {isBn ? `সময় নিশ্চিত করুন (${computed24HourTime})` : `Confirm Time (${computed24HourTime})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

