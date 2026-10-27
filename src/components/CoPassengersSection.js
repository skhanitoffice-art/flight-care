import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { UserIcon } from './Icons';
import { isValidPassengerName } from '../utils/helpers';

export default function CoPassengersSection({
  passengerCount = 1,
  coPassengers = [],
  onChangeCoPassengers,
  lang = 0,
  errors = {},
  setErrors,
  onOpenOcr,
}) {
  const extraCount = Math.max(0, (passengerCount || 1) - 1);
  if (extraCount === 0) return null;

  const handleUpdate = (index, key, value) => {
    const updated = [...(coPassengers || [])];
    while (updated.length < extraCount) {
      updated.push({ name: '', passportNumber: '', nationality: '', notes: '' });
    }
    updated[index] = { ...updated[index], [key]: value };
    onChangeCoPassengers(updated);

    if (errors[`coPassenger_${index}_${key}`]) {
      setErrors && setErrors(e => ({ ...e, [`coPassenger_${index}_${key}`]: null }));
    }
  };

  return (
    <View
      style={{
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        borderColor: '#BAE6FD',
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18 }}>👥</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0369A1' }}>
            {lang ? `সহযাত্রীদের বিবরণ (যাত্রী ২ থেকে ${passengerCount})` : `Co-Passengers Details (Passengers 2 to ${passengerCount})`}
          </Text>
        </View>
        <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0284C7' }}>
            {extraCount} {lang ? 'জন সহযাত্রী' : 'Co-Passenger(s)'}
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>
        {lang
          ? 'বিমানবন্দরের প্রোটোকল ও বোর্ডিং তালিকার জন্য সকল সহযাত্রীর নাম ও পাসপোর্ট নম্বর পূরণ করুন।'
          : 'Please enter names and travel documents for all accompanying passengers.'}
      </Text>

      {Array.from({ length: extraCount }).map((_, idx) => {
        const item = (coPassengers && coPassengers[idx]) || { name: '', passportNumber: '', nationality: '', notes: '' };
        const passengerNum = idx + 2;
        const nameError = errors[`coPassenger_${idx}_name`];
        const isNameValid = (item.name || '').trim().length >= 2 && isValidPassengerName(item.name);

        return (
          <View
            key={`co_passenger_${idx}`}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: idx === extraCount - 1 ? 0 : 12,
            }}
          >
            {/* Header with Passenger Number & Quick OCR Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
                👤 {lang ? `সহযাত্রী #${passengerNum}` : `Passenger #${passengerNum} (Co-traveller)`}
              </Text>
              {onOpenOcr && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onOpenOcr(idx)}
                  style={{
                    backgroundColor: '#F0F9FF',
                    borderWidth: 1,
                    borderColor: '#BAE6FD',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>📷</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>
                    {lang ? 'পাসপোর্ট স্ক্যান' : 'Scan Passport'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Input 1: Co-passenger full name */}
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                {lang ? 'পূর্ণ নাম *' : 'Full Name *'}
              </Text>
              <TextInput
                style={{
                  height: 42,
                  borderWidth: 1.5,
                  borderColor: nameError ? '#EF4444' : isNameValid ? '#10B981' : '#CBD5E1',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#0F172A',
                  backgroundColor: nameError ? '#FEF2F2' : '#FFFFFF',
                }}
                value={item.name || ''}
                onChangeText={v => handleUpdate(idx, 'name', (v || '').replace(/[^a-zA-Z\u0980-\u09FF\s.'-]/g, ''))}
                placeholder={lang ? 'ট্রাভেল ডকুমেন্ট অনুযায়ী নাম' : 'Name as on passport / ID'}
                placeholderTextColor="#94A3B8"
              />
              {nameError ? (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 3, fontWeight: '600' }}>
                  ⚠️ {nameError}
                </Text>
              ) : isNameValid ? (
                <Text style={{ color: '#059669', fontSize: 11, marginTop: 3, fontWeight: '700' }}>
                  ✓ {lang ? 'সঠিক নাম' : 'Valid name'}
                </Text>
              ) : null}
            </View>

            {/* Input 2: Passport Number & Nationality Row */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                  {lang ? 'পাসপোর্ট নম্বর / এনআইডি' : 'Passport / National ID'}
                </Text>
                <TextInput
                  style={{
                    height: 42,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                  }}
                  value={item.passportNumber || ''}
                  onChangeText={v => handleUpdate(idx, 'passportNumber', v.toUpperCase())}
                  placeholder={lang ? 'যেমন: A04829104' : 'e.g. A04829104'}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                  {lang ? 'জাতীয়তা (ঐচ্ছিক)' : 'Nationality (optional)'}
                </Text>
                <TextInput
                  style={{
                    height: 42,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    fontSize: 13,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                  }}
                  value={item.nationality || ''}
                  onChangeText={v => handleUpdate(idx, 'nationality', v)}
                  placeholder={lang ? 'যেমন: বাংলাদেশী' : 'e.g. Bangladeshi'}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

