import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const MONTHS_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTHS_SHORT_BN = [
  'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
];

const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

const toBnNum = num =>
  String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);

export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  lang = 0,
}) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [pickedYear, setPickedYear] = useState(today.getFullYear());
  const [pickedMonth, setPickedMonth] = useState(today.getMonth());
  const [pickedDay, setPickedDay] = useState(today.getDate());

  useEffect(() => {
    if (visible) {
      if (selectedDate) {
        const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(selectedDate).trim());
        if (match) {
          const d = Number(match[1]);
          const m = Number(match[2]) - 1;
          const y = Number(match[3]);
          setCurrentYear(y);
          setCurrentMonth(m);
          setPickedYear(y);
          setPickedMonth(m);
          setPickedDay(d);
          return;
        }
      }
      setCurrentYear(today.getFullYear());
      setCurrentMonth(today.getMonth());
      setPickedYear(today.getFullYear());
      setPickedMonth(today.getMonth());
      setPickedDay(today.getDate());
    }
  }, [visible, selectedDate, today]);

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayIndex = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  }, [currentYear, currentMonth]);

  const isCurrentOrPastMonth = useMemo(() => {
    return (
      currentYear < today.getFullYear() ||
      (currentYear === today.getFullYear() && currentMonth <= today.getMonth())
    );
  }, [currentYear, currentMonth, today]);

  const startOfToday = useMemo(() => {
    const t = new Date(today);
    t.setHours(0, 0, 0, 0);
    return t;
  }, [today]);

  const handlePrevMonth = () => {
    if (isCurrentOrPastMonth) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const formatDateOutput = (day, monthIdx, year) => {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(monthIdx + 1).padStart(2, '0');
    return `${dayStr}-${monthStr}-${year}`;
  };

  const handleSelectDay = (day) => {
    setPickedDay(day);
    setPickedMonth(currentMonth);
    setPickedYear(currentYear);
    const formatted = formatDateOutput(day, currentMonth, currentYear);
    onSelectDate(formatted);
    onClose();
  };

  const selectQuick = (daysToAdd) => {
    const target = new Date();
    target.setDate(today.getDate() + daysToAdd);
    const tYear = target.getFullYear();
    const tMonth = target.getMonth();
    const tDay = target.getDate();
    setCurrentYear(tYear);
    setCurrentMonth(tMonth);
    setPickedYear(tYear);
    setPickedMonth(tMonth);
    setPickedDay(tDay);
    const formatted = formatDateOutput(tDay, tMonth, tYear);
    onSelectDate(formatted);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            width: '100%',
            maxWidth: 390,
            overflow: 'hidden',
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                {lang === 1 ? 'সেবার তারিখ নির্বাচন করুন' : 'Select Service Date'}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                {lang === 1 ? 'ফ্লাইটের আগমন বা প্রস্থানের তারিখ' : 'Flight arrival or departure date'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748B' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Date Select Chips */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
              gap: 8,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => selectQuick(0)}
              style={{
                flex: 1,
                paddingVertical: 7,
                backgroundColor: '#F0F9FF',
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#BAE6FD',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                {lang === 1 ? 'আজ' : 'Today'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => selectQuick(1)}
              style={{
                flex: 1,
                paddingVertical: 7,
                backgroundColor: '#F0F9FF',
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#BAE6FD',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                {lang === 1 ? 'আগামীকাল' : 'Tomorrow'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => selectQuick(2)}
              style={{
                flex: 1,
                paddingVertical: 7,
                backgroundColor: '#F0F9FF',
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#BAE6FD',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                {lang === 1 ? 'পরশু' : 'In 2 Days'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 18,
              paddingVertical: 10,
            }}
          >
            <TouchableOpacity
              onPress={handlePrevMonth}
              disabled={isCurrentOrPastMonth}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: isCurrentOrPastMonth ? '#F8FAFC' : '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isCurrentOrPastMonth ? 0.4 : 1,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: isCurrentOrPastMonth ? '#94A3B8' : '#334155' }}>‹</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
              {lang === 1 ? MONTHS_BN[currentMonth] : MONTHS_EN[currentMonth]}{' '}
              {lang === 1 ? toBnNum(currentYear) : currentYear}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#334155' }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day of week headers */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: 16,
              paddingBottom: 6,
            }}
          >
            {(lang === 1 ? DAYS_BN : DAYS_EN).map((dayName, idx) => (
              <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '700',
                    color: idx === 5 ? '#D97706' : '#64748B', // Friday highlight
                  }}
                >
                  {dayName}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Day Grid */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 16,
              flexDirection: 'row',
              flexWrap: 'wrap',
            }}
          >
            {/* Empty offset spaces */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <View key={`empty-${idx}`} style={{ width: '14.28%', height: 40 }} />
            ))}

            {/* Days in current month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const isSelected =
                pickedDay === day &&
                pickedMonth === currentMonth &&
                pickedYear === currentYear;
              const isToday =
                day === today.getDate() &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear();

              const dayDate = new Date(currentYear, currentMonth, day, 23, 59, 59);
              const isPast = dayDate < startOfToday;

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  activeOpacity={isPast ? 1 : 0.7}
                  disabled={isPast}
                  onPress={() => !isPast && handleSelectDay(day)}
                  style={{
                    width: '14.28%',
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isPast ? 0.35 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: isSelected
                        ? '#0284C7'
                        : isToday
                        ? '#E0F2FE'
                        : 'transparent',
                      borderWidth: isToday && !isSelected ? 1 : 0,
                      borderColor: '#0284C7',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected || isToday ? '800' : '500',
                        color: isSelected
                          ? '#FFFFFF'
                          : isToday
                          ? '#0284C7'
                          : isPast
                          ? '#94A3B8'
                          : '#0F172A',
                        textDecorationLine: isPast ? 'line-through' : 'none',
                      }}
                    >
                      {lang === 1 ? toBnNum(day) : day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom Footer Action */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 14,
              borderTopWidth: 1,
              borderTopColor: '#F1F5F9',
              paddingTop: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                const formatted = formatDateOutput(pickedDay, pickedMonth, pickedYear);
                onSelectDate(formatted);
                onClose();
              }}
              style={{
                backgroundColor: '#0284C7',
                paddingVertical: 11,
                borderRadius: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                {lang === 1 ? 'তারিখ নিশ্চিত করুন' : 'Confirm Date'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

