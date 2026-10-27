import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { ADDONS, getAddonAsset } from '../../constants/data';
import VisaOnArrivalUploadSection from '../../components/VisaOnArrivalUploadSection';
import {
  UserIcon,
  PhoneIcon,
  MailIcon,
  ServiceBadgeIcon,
  StandardPkgIcon,
  PremiumPkgIcon,
  VipPkgIcon,
  LocationPinIcon,
  PlaneIcon,
  CalendarIcon,
  GiftIcon,
  DocumentIcon,
  ChevronRight,
  ArrivalIcon,
  DepartureIcon,
} from '../../components/Icons';
import {
  isValidFlightNumber,
  isValidFlightDate,
  isValidPassengerName,
  isValidMobileNumber,
  isValidEmailAddress,
  sanitizePhoneNumber,
  extractLocalPhoneDigits,
} from '../../utils/helpers';
import PassportOcrModal from '../../components/PassportOcrModal';
import CoPassengersSection from '../../components/CoPassengersSection';
import { getLiveFlightStatus } from '../../services/flightService';

export default function WizardStep1Details({
  wiz,
  setWiz,
  lang,
  isDep,
  errors,
  setErrors,
  pricingData,
  totalAmount,
  agreedPolicy,
  setAgreedPolicy,
  setShowCancellationPolicy,
  setComplianceModalTab,
  setShowCountryModal,
  setCountryTarget,
  setShowDateModal,
  handleContinueToPayment,
}) {
  const [showPassportOcr, setShowPassportOcr] = useState(false);
  const [ocrTarget, setOcrTarget] = useState('lead');
  return (
    <>
      {/* If "I am booking for someone else" is CHECKED */}
      {wiz.bookingForSomeoneElse ? (
        <>
          {/* Alert Banner */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setWiz(c => ({ ...c, bookingForSomeoneElse: false }))}
            style={{
              backgroundColor: '#E0F2FE',
              borderRadius: 12,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: '#BAE6FD',
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                backgroundColor: '#0284C7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>✓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0369A1' }}>
                {lang ? 'আমি অন্য কারো জন্য বুক করছি' : 'I am booking for someone else'}
              </Text>
              <Text style={{ fontSize: 12, color: '#0284C7', marginTop: 2 }}>
                {lang ? 'নিচে যাত্রীর বিবরণ যোগ করুন।' : "Add the traveller's details below."}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Passenger Details Card */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <UserIcon size={20} color="#0284C7" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'যাত্রীর বিবরণ' : 'Passenger details'}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setOcrTarget('lead');
                  setShowPassportOcr(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#F0F9FF',
                  borderWidth: 1.5,
                  borderColor: '#BAE6FD',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 13 }}>📷</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0284C7' }}>
                  {lang ? 'পাসপোর্ট স্ক্যান' : 'Scan Passport'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Passenger full name * */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
              {lang ? 'যাত্রীর পুরো নাম *' : 'Passenger full name *'}
            </Text>
            <TextInput
              style={{
                height: 46,
                borderWidth: 1.5,
                borderColor: errors.passengerName ? '#EF4444' : ((wiz.passengerName || '').trim() && isValidPassengerName(wiz.passengerName) ? '#10B981' : '#CBD5E1'),
                borderRadius: 10,
                paddingHorizontal: 12,
                fontSize: 14,
                color: '#0F172A',
                backgroundColor: errors.passengerName ? '#FEF2F2' : '#FFFFFF',
                marginBottom: 4,
              }}
              placeholder={lang ? 'ট্রাভেল ডকুমেন্ট অনুযায়ী নাম লিখুন' : 'Name as shown on travel document'}
              placeholderTextColor="#94A3B8"
              value={wiz.passengerName || ''}
              onChangeText={v => {
                const cleaned = (v || '').replace(/[^a-zA-Z\u0980-\u09FF\s.'-]/g, '');
                setWiz(c => ({ ...c, passengerName: cleaned }));
                if (cleaned.trim()) {
                  if (isValidPassengerName(cleaned)) {
                    setErrors(e => ({ ...e, passengerName: null }));
                  } else if (errors.passengerName || cleaned.trim().length >= 2) {
                    setErrors(e => ({
                      ...e,
                      passengerName: lang
                        ? 'সঠিক নাম লিখুন (সংখ্যা বা বিশেষ চিহ্ন গ্রহণযোগ্য নয়)'
                        : 'Please enter a valid name (letters only, no numbers)',
                    }));
                  }
                } else {
                  setErrors(e => ({ ...e, passengerName: null }));
                }
              }}
            />
            {errors.passengerName ? (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 12, fontWeight: '600' }}>
                ⚠️ {errors.passengerName}
              </Text>
            ) : (wiz.passengerName || '').trim() && isValidPassengerName(wiz.passengerName) ? (
              <Text style={{ color: '#059669', fontSize: 12, marginBottom: 12, fontWeight: '700' }}>
                ✓ {lang ? 'সঠিক নাম' : 'Valid name'}
              </Text>
            ) : null}

            {/* Passenger contact toggle */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
              {lang ? 'যাত্রীর যোগাযোগ' : 'Passenger contact'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setWiz(c => ({ ...c, hasPhone: true }))}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 8,
                  backgroundColor: wiz.hasPhone !== false ? '#E0F2FE' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: wiz.hasPhone !== false ? '#0284C7' : '#CBD5E1',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <PhoneIcon size={16} color={wiz.hasPhone !== false ? '#0284C7' : '#64748B'} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: wiz.hasPhone !== false ? '#0284C7' : '#64748B',
                  }}
                >
                  {lang ? 'ফোন আছে' : 'Has a phone'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setWiz(c => ({ ...c, hasPhone: false }))}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 8,
                  backgroundColor: wiz.hasPhone === false ? '#E0F2FE' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: wiz.hasPhone === false ? '#0284C7' : '#CBD5E1',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <PhoneIcon size={16} color={wiz.hasPhone === false ? '#0284C7' : '#64748B'} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: wiz.hasPhone === false ? '#0284C7' : '#64748B',
                  }}
                >
                  {lang ? 'ফোন নেই' : 'No phone'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Passenger mobile number * (if hasPhone) */}
            {wiz.hasPhone !== false && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
                  {lang ? 'যাত্রীর মোবাইল নম্বর *' : 'Passenger mobile number *'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: errors.passengerPhone ? 4 : 14 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setCountryTarget('passenger');
                      setShowCountryModal(true);
                    }}
                    style={{
                      width: 85,
                      height: 46,
                      borderWidth: 1.5,
                      borderColor: errors.passengerPhone ? '#EF4444' : '#CBD5E1',
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                      {wiz.passengerCountryCode || '+880'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#94A3B8' }}>▾</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={{
                      flex: 1,
                      height: 46,
                      borderWidth: 1.5,
                      borderColor: errors.passengerPhone
                        ? '#EF4444'
                        : (isValidMobileNumber(extractLocalPhoneDigits(wiz.passengerPhone, wiz.passengerCountryCode || '+880'), wiz.passengerCountryCode || '+880')
                          ? '#10B981'
                          : '#CBD5E1'),
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      fontSize: 14,
                      color: '#0F172A',
                      backgroundColor: errors.passengerPhone ? '#FEF2F2' : '#FFFFFF',
                    }}
                    placeholder={lang ? 'মোবাইল নম্বর লিখুন' : 'Enter mobile number'}
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={extractLocalPhoneDigits(wiz.passengerPhone, wiz.passengerCountryCode || '+880')}
                    onChangeText={v => {
                      const clean = sanitizePhoneNumber(v, wiz.passengerCountryCode || '+880');
                      setWiz(c => ({
                        ...c,
                        passengerPhone: clean ? `${c.passengerCountryCode || '+880'} ${clean}` : '',
                      }));
                      if (isValidMobileNumber(clean, wiz.passengerCountryCode || '+880')) {
                        setErrors(e => ({ ...e, passengerPhone: null }));
                      }
                    }}
                  />
                </View>
                {errors.passengerPhone ? (
                  <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 12, fontWeight: '600' }}>
                    ⚠️ {errors.passengerPhone}
                  </Text>
                ) : isValidMobileNumber(extractLocalPhoneDigits(wiz.passengerPhone, wiz.passengerCountryCode || '+880'), wiz.passengerCountryCode || '+880') ? (
                  <Text style={{ color: '#059669', fontSize: 12, marginBottom: 12, fontWeight: '700' }}>
                    ✓ {lang ? 'বৈধ মোবাইল নম্বর' : 'Valid mobile number'}
                  </Text>
                ) : null}
              </>
            )}

            {/* Special assistance (optional) */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
              {lang ? 'বিশেষ সহায়তা (ঐচ্ছিক)' : 'Special assistance (optional)'}
            </Text>
            <TextInput
              style={{
                height: 46,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 10,
                paddingHorizontal: 12,
                fontSize: 14,
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
                marginBottom: 4,
              }}
              placeholder={lang ? 'কোনো সহায়তার প্রয়োজন থাকলে লিখুন' : 'Any assistance needs?'}
              placeholderTextColor="#94A3B8"
              value={wiz.specialAssistance || ''}
              onChangeText={v => setWiz(c => ({ ...c, specialAssistance: v }))}
            />
            <Text style={{ fontSize: 12, color: '#64748B' }}>
              {lang ? 'সার্ভিসের জন্য প্রয়োজনীয় তথ্য শেয়ার করুন।' : 'Share only what is needed for the service.'}
            </Text>
          </View>

          {/* Your details — booking contact */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <UserIcon size={20} color="#0284C7" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'আপনার বিবরণ — বুকিং যোগাযোগ' : 'Your details — booking contact'}
              </Text>
            </View>

            {/* Your full name * */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
              {lang ? 'আপনার পুরো নাম *' : 'Your full name *'}
            </Text>
            <TextInput
              style={{
                height: 46,
                borderWidth: 1.5,
                borderColor: errors.bookerName ? '#EF4444' : ((wiz.name || '').trim() && isValidPassengerName(wiz.name) ? '#10B981' : '#CBD5E1'),
                borderRadius: 10,
                paddingHorizontal: 12,
                fontSize: 14,
                color: '#0F172A',
                backgroundColor: errors.bookerName ? '#FEF2F2' : '#FFFFFF',
                marginBottom: 4,
              }}
              placeholder={lang ? 'আপনার পুরো নাম লিখুন' : 'Enter your full name'}
              placeholderTextColor="#94A3B8"
              value={wiz.name || ''}
              onChangeText={v => {
                const cleaned = (v || '').replace(/[^a-zA-Z\u0980-\u09FF\s.'-]/g, '');
                setWiz(c => ({ ...c, name: cleaned }));
                if (cleaned.trim()) {
                  if (isValidPassengerName(cleaned)) {
                    setErrors(e => ({ ...e, bookerName: null }));
                  } else if (errors.bookerName || cleaned.trim().length >= 2) {
                    setErrors(e => ({
                      ...e,
                      bookerName: lang
                        ? 'সঠিক নাম লিখুন (সংখ্যা বা বিশেষ চিহ্ন গ্রহণযোগ্য নয়)'
                        : 'Please enter a valid name (letters only, no numbers)',
                    }));
                  }
                } else {
                  setErrors(e => ({ ...e, bookerName: null }));
                }
              }}
            />
            {errors.bookerName ? (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 12, fontWeight: '600' }}>
                ⚠️ {errors.bookerName}
              </Text>
            ) : (wiz.name || '').trim() && isValidPassengerName(wiz.name) ? (
              <Text style={{ color: '#059669', fontSize: 12, marginBottom: 12, fontWeight: '700' }}>
                ✓ {lang ? 'সঠিক নাম' : 'Valid name'}
              </Text>
            ) : null}

            {/* Your mobile number * */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
              {lang ? 'আপনার মোবাইল নম্বর *' : 'Your mobile number *'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setCountryTarget('lead');
                  setShowCountryModal(true);
                }}
                style={{
                  width: 85,
                  height: 46,
                  borderWidth: 1.5,
                  borderColor: errors.bookerPhone ? '#EF4444' : '#CBD5E1',
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                  {wiz.leadCountryCode || '+880'}
                </Text>
                <Text style={{ fontSize: 12, color: '#94A3B8' }}>▾</Text>
              </TouchableOpacity>
              <TextInput
                style={{
                  flex: 1,
                  height: 46,
                  borderWidth: 1.5,
                  borderColor: errors.bookerPhone
                    ? '#EF4444'
                    : (isValidMobileNumber(extractLocalPhoneDigits(wiz.phone, wiz.leadCountryCode || '+880'), wiz.leadCountryCode || '+880')
                      ? '#10B981'
                      : '#CBD5E1'),
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  fontSize: 14,
                  color: '#0F172A',
                  backgroundColor: errors.bookerPhone ? '#FEF2F2' : '#FFFFFF',
                }}
                placeholder={lang ? 'মোবাইল নম্বর লিখুন' : 'Enter mobile number'}
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={extractLocalPhoneDigits(wiz.phone, wiz.leadCountryCode || '+880')}
                onChangeText={v => {
                  const clean = sanitizePhoneNumber(v, wiz.leadCountryCode || '+880');
                  setWiz(c => ({
                    ...c,
                    phone: clean ? `${c.leadCountryCode || '+880'} ${clean}` : '',
                  }));
                  if (isValidMobileNumber(clean, wiz.leadCountryCode || '+880')) {
                    setErrors(e => ({ ...e, bookerPhone: null }));
                  }
                }}
              />
            </View>
            {errors.bookerPhone ? (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 12, fontWeight: '600' }}>
                ⚠️ {errors.bookerPhone}
              </Text>
            ) : isValidMobileNumber(extractLocalPhoneDigits(wiz.phone, wiz.leadCountryCode || '+880'), wiz.leadCountryCode || '+880') ? (
              <Text style={{ color: '#059669', fontSize: 12, marginBottom: 12, fontWeight: '700' }}>
                ✓ {lang ? 'বৈধ মোবাইল নম্বর' : 'Valid mobile number'}
              </Text>
            ) : null}

            {/* Your email (optional) */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
              {lang ? 'আপনার ইমেইল (ঐচ্ছিক)' : 'Your email (optional)'}
            </Text>
            <TextInput
              style={{
                height: 46,
                borderWidth: 1.5,
                borderColor: errors.bookerEmail ? '#EF4444' : ((wiz.email || '').trim() && isValidEmailAddress(wiz.email) ? '#10B981' : '#CBD5E1'),
                borderRadius: 10,
                paddingHorizontal: 12,
                fontSize: 14,
                color: '#0F172A',
                backgroundColor: errors.bookerEmail ? '#FEF2F2' : '#FFFFFF',
                marginBottom: 4,
              }}
              placeholder={lang ? 'বুকিং আপডেটের জন্য' : 'For booking updates'}
              placeholderTextColor="#94A3B8"
              value={wiz.email || ''}
              onChangeText={v => {
                const cleaned = (v || '').replace(/\s+/g, '');
                setWiz(c => ({ ...c, email: cleaned }));
                if (cleaned.trim()) {
                  if (isValidEmailAddress(cleaned)) {
                    setErrors(e => ({ ...e, bookerEmail: null }));
                  }
                } else {
                  setErrors(e => ({ ...e, bookerEmail: null }));
                }
              }}
              autoCapitalize="none"
            />
            {errors.bookerEmail ? (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                ⚠️ {errors.bookerEmail}
              </Text>
            ) : (wiz.email || '').trim() && isValidEmailAddress(wiz.email) ? (
              <Text style={{ color: '#059669', fontSize: 12, marginTop: 4, fontWeight: '700' }}>
                ✓ {lang ? 'বৈধ ইমেইল' : 'Valid email'}
              </Text>
            ) : null}
          </View>

          {/* Who should we contact at the airport? */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <PlaneIcon size={20} color="#0284C7" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'এয়ারপোর্টে কার সাথে যোগাযোগ করবো?' : 'Who should we contact at the airport?'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 6 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setWiz(c => ({ ...c, contactAtAirport: 'passenger' }))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: wiz.contactAtAirport === 'passenger' ? '#0284C7' : '#CBD5E1',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {wiz.contactAtAirport === 'passenger' && (
                    <View
                      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0284C7' }}
                    />
                  )}
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                  {lang ? 'যাত্রী' : 'Passenger'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setWiz(c => ({ ...c, contactAtAirport: 'me' }))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: wiz.contactAtAirport === 'me' ? '#0284C7' : '#CBD5E1',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {wiz.contactAtAirport === 'me' && (
                    <View
                      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0284C7' }}
                    />
                  )}
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                  {lang ? 'আমি — বুকিং যোগাযোগ' : 'Me — booking contact'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              {lang
                ? 'যাত্রীর ফোন না থাকলে বুকিং যোগাযোগ বেছে নিন।'
                : 'If the passenger has no phone, choose the booking contact.'}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setWiz(c => ({ ...c, permissionConfirmed: !c.permissionConfirmed }));
                if (errors.permissionConfirmed) setErrors(e => ({ ...e, permissionConfirmed: null }));
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  backgroundColor: wiz.permissionConfirmed !== false ? '#0284C7' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: errors.permissionConfirmed ? '#EF4444' : wiz.permissionConfirmed !== false ? '#0284C7' : '#94A3B8',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {wiz.permissionConfirmed !== false && (
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>✓</Text>
                )}
              </View>
              <Text style={{ fontSize: 13, color: errors.permissionConfirmed ? '#DC2626' : '#334155' }}>
                {lang
                  ? 'এই যাত্রীর তথ্য শেয়ার করার অনুমতি আমার আছে।'
                  : 'I have permission to share these passenger details.'}
              </Text>
            </TouchableOpacity>
            {errors.permissionConfirmed ? (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                {errors.permissionConfirmed}
              </Text>
            ) : null}
          </View>


          {/* Cancellation policy link & checkbox in someone else flow */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAgreedPolicy(!agreedPolicy);
              if (errors.agreedPolicy) setErrors(e => ({ ...e, agreedPolicy: null }));
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: errors.agreedPolicy ? 6 : 14,
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: errors.agreedPolicy ? '#EF4444' : '#E2E8F0',
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                backgroundColor: agreedPolicy ? '#0284C7' : '#FFFFFF',
                borderWidth: 1.5,
                borderColor: errors.agreedPolicy ? '#EF4444' : agreedPolicy ? '#0284C7' : '#94A3B8',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {agreedPolicy && (
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>✓</Text>
              )}
            </View>
            <Text style={{ fontSize: 13, color: errors.agreedPolicy ? '#DC2626' : '#334155', flex: 1, flexWrap: 'wrap' }}>
              {lang ? 'আমি ' : 'I agree to the '}
              <Text
                style={{ color: '#0284C7', textDecorationLine: 'underline', fontWeight: '700' }}
                onPress={() => (setComplianceModalTab ? setComplianceModalTab('terms') : setShowCancellationPolicy(true))}
              >
                {lang ? 'শর্তাবলী' : 'Terms & Conditions'}
              </Text>
              {lang ? ', ' : ', '}
              <Text
                style={{ color: '#0284C7', textDecorationLine: 'underline', fontWeight: '700' }}
                onPress={() => (setComplianceModalTab ? setComplianceModalTab('privacy') : null)}
              >
                {lang ? 'প্রাইভেসি' : 'Privacy Policy'}
              </Text>
              {lang ? ' ও ' : ' & '}
              <Text
                style={{ color: '#0284C7', textDecorationLine: 'underline', fontWeight: '700' }}
                onPress={() => (setComplianceModalTab ? setComplianceModalTab('refund') : setShowCancellationPolicy(true))}
              >
                {lang ? 'রিফান্ড নীতিমালায় (৭-১০ দিন)' : 'Refund Policy (7-10 Days)'}
              </Text>
              {lang ? ' সম্মত।' : '.'}
            </Text>
          </TouchableOpacity>
          {errors.agreedPolicy ? (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 12, fontWeight: '600' }}>
              {errors.agreedPolicy}
            </Text>
          ) : null}

          {/* Compact Booking Ticket Card */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                {wiz.onlyAddons ? (
                  <Image source={require('../../../assets/pkg_additional.webp')} style={{ width: 28, height: 28, resizeMode: 'contain' }} />
                ) : (wiz.packageChoice === 'economy' || wiz.pkg?.id === 'economy') ? (
                  <StandardPkgIcon size={28} color="#0284C7" />
                ) : (wiz.packageChoice === 'first' || wiz.pkg?.id === 'first') ? (
                  <VipPkgIcon size={28} color="#D97706" />
                ) : (
                  <PremiumPkgIcon size={28} color="#2563EB" />
                )}
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  {isDep ? (lang ? 'প্রস্থান' : 'Departure') : (lang ? 'আগমন' : 'Arrival')} • {wiz.onlyAddons ? (lang ? 'শুধুমাত্র অতিরিক্ত সেবা' : 'Additional Services Only') : (wiz.pkg?.n ? wiz.pkg.n[lang ? 1 : 0] : (lang ? 'স্ট্যান্ডার্ড' : 'Standard'))}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {(wiz.fno ? wiz.fno : (lang ? 'ফ্লাইট নম্বর' : 'Flight'))} • {(wiz.date ? wiz.date : (lang ? 'তারিখ' : 'Date'))} • {wiz.a} {lang ? 'জন যাত্রী' : 'passenger'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
              {totalAmount} {lang ? 'টাকা' : 'Tk'}
            </Text>
          </View>

          {/* Standalone Additional Services Banner */}
          {wiz.onlyAddons && (
            <View
              style={{
                backgroundColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                borderWidth: 1.5,
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Image source={require('../../../assets/pkg_additional.webp')} style={{ width: 26, height: 26, resizeMode: 'contain' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#065F46' }}>
                  {lang ? 'শুধুমাত্র অতিরিক্ত সার্ভিস বুকিং' : 'Standalone Additional Services Booking'}
                </Text>
                <Text style={{ fontSize: 12, color: '#047857', marginTop: 2, lineHeight: 17 }}>
                  {lang
                    ? 'এই বুকিংয়ে কোনো প্রোটোকল প্যাকেজ চার্জ নেই। শুধুমাত্র নির্বাচিত অতিরিক্ত সার্ভিসের বিল প্রযোজ্য।'
                    : 'No protocol package charge. You are only paying for the selected additional services.'}
                </Text>
              </View>
            </View>
          )}

          {/* Validation Summary Alert */}
          {Object.keys(errors).length > 0 && (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#EF4444',
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626' }}>
                ⚠️ {lang ? 'পেমেন্টে এগিয়ে যাওয়ার আগে লাল চিহ্নিত তথ্যগুলো দিন:' : 'Please fill all required fields marked in red:'}
              </Text>
              {errors.flightNumber && (
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 3 }}>
                  • {lang ? 'ফ্লাইট নম্বর: ' : 'Flight: '}{errors.flightNumber}
                </Text>
              )}
              {errors.serviceDate && (
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                  • {lang ? 'সেবার তারিখ: ' : 'Date: '}{errors.serviceDate}
                </Text>
              )}
              {errors.passengerName && (
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                  • {lang ? 'যাত্রীর নাম: ' : 'Passenger: '}{errors.passengerName}
                </Text>
              )}
              {errors.passengerPhone && (
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                  • {lang ? 'যাত্রীর ফোন: ' : 'Passenger Phone: '}{errors.passengerPhone}
                </Text>
              )}
              {errors.bookerName && (
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                  • {lang ? 'আপনার নাম: ' : 'Booker Name: '}{errors.bookerName}
                </Text>
              )}
              {errors.bookerPhone && (
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                  • {lang ? 'আপনার ফোন: ' : 'Booker Phone: '}{errors.bookerPhone}
                </Text>
              )}
            </View>
          )}

          {/* Continue to Payment button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContinueToPayment}
            style={{
              backgroundColor: '#0284C7',
              height: 50,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 6,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
              {lang ? 'পেমেন্টে এগিয়ে যান →' : 'Continue to Payment →'}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
            {lang ? '* আবশ্যক ক্ষেত্র' : '* Required fields'}
          </Text>
        </>
      ) : (
        /* Standard Lead Passenger Flow */
        <>
          {/* Card 1: Passenger & contact details */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'যাত্রী ও যোগাযোগের বিবরণ' : 'Passenger & contact details'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setOcrTarget('lead');
                  setShowPassportOcr(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  backgroundColor: '#EFF6FF',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                }}
              >
                <Text style={{ fontSize: 13 }}>📷</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0284C7' }}>
                  {lang ? 'পাসপোর্ট স্ক্যান' : 'Scan Passport'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Lead passenger name */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
              {lang ? 'প্রধান যাত্রীর নাম *' : 'Lead passenger name *'}
            </Text>
            <View
              style={{
                height: 46,
                borderWidth: 1.5,
                borderColor: errors.leadName ? '#EF4444' : ((wiz.name || '').trim().length >= 2 && isValidPassengerName(wiz.name) ? '#10B981' : '#CBD5E1'),
                borderRadius: 10,
                paddingHorizontal: 12,
                backgroundColor: errors.leadName ? '#FEF2F2' : '#FFFFFF',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: errors.leadName ? 4 : 8,
              }}
            >
              <UserIcon size={18} color={errors.leadName ? '#EF4444' : '#64748B'} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: '#0F172A' }}
                value={wiz.name || ''}
                onChangeText={v => {
                  const cleaned = (v || '').replace(/[^a-zA-Z\u0980-\u09FF\s.'-]/g, '');
                  setWiz(c => ({ ...c, name: cleaned }));
                  if (errors.leadName) setErrors(e => ({ ...e, leadName: null }));
                }}
                placeholder={lang ? 'আপনার পুরো নাম লিখুন (শুধুমাত্র অক্ষর)' : 'Enter full name (letters only)'}
                placeholderTextColor="#94A3B8"
              />
              {(wiz.name || '').trim().length >= 2 && isValidPassengerName(wiz.name) && (
                <Text style={{ color: '#10B981', fontWeight: '800' }}>✓</Text>
              )}
            </View>
            {errors.leadName ? (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 8, fontWeight: '600' }}>
                {errors.leadName}
              </Text>
            ) : (wiz.name || '').trim().length > 0 && !isValidPassengerName(wiz.name) ? (
              <Text style={{ color: '#EF4444', fontSize: 11.5, marginBottom: 8, fontWeight: '600' }}>
                ⚠️ {lang ? 'নামে কোনো সংখ্যা বা বিশেষ চিহ্ন থাকা যাবে না' : 'Names cannot contain numbers or special characters'}
              </Text>
            ) : null}

            {/* Mobile number */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
              {lang ? 'মোবাইল নম্বর *' : 'Mobile number *'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: errors.leadPhone ? 4 : 6 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setCountryTarget('lead');
                  setShowCountryModal(true);
                }}
                style={{
                  width: 85,
                  height: 46,
                  borderWidth: 1.5,
                  borderColor: errors.leadPhone ? '#EF4444' : '#CBD5E1',
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                  {wiz.leadCountryCode || '+880'}
                </Text>
                <Text style={{ fontSize: 12, color: '#94A3B8' }}>▾</Text>
              </TouchableOpacity>
              <View
                style={{
                  flex: 1,
                  height: 46,
                  borderWidth: 1.5,
                  borderColor: errors.leadPhone
                    ? '#EF4444'
                    : (isValidMobileNumber(extractLocalPhoneDigits(wiz.phone, wiz.leadCountryCode || '+880'), wiz.leadCountryCode || '+880')
                      ? '#10B981'
                      : '#CBD5E1'),
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  backgroundColor: errors.leadPhone ? '#FEF2F2' : '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <PhoneIcon size={18} color={errors.leadPhone ? '#EF4444' : '#64748B'} />
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: '#0F172A' }}
                  value={extractLocalPhoneDigits(wiz.phone, wiz.leadCountryCode || '+880')}
                  onChangeText={v => {
                    const cc = wiz.leadCountryCode || '+880';
                    const sanitized = sanitizePhoneNumber(v, cc);
                    setWiz(c => ({
                      ...c,
                      phone: sanitized ? `${cc} ${sanitized}` : '',
                    }));
                    if (isValidMobileNumber(sanitized, cc) && errors.leadPhone) {
                      setErrors(e => ({ ...e, leadPhone: null }));
                    }
                  }}
                  placeholder={lang ? 'মোবাইল নম্বর লিখুন (যেমন: 1712...)' : 'Enter mobile number (e.g. 1712...)'}
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
                {isValidMobileNumber(extractLocalPhoneDigits(wiz.phone, wiz.leadCountryCode || '+880'), wiz.leadCountryCode || '+880') && (
                  <Text style={{ color: '#10B981', fontWeight: '800' }}>✓</Text>
                )}
              </View>
            </View>
            {errors.leadPhone ? (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 8, fontWeight: '600' }}>
                {errors.leadPhone}
              </Text>
            ) : null}
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 14 }}>
              {lang
                ? 'বিমানবন্দরে আপনার সহায়তার জন্য এই নম্বরটি ব্যবহার করা হবে।'
                : "We'll use this number to coordinate your airport assistance."}
            </Text>

            {/* Email (optional) */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
              {lang ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)'}
            </Text>
            <View
              style={{
                height: 46,
                borderWidth: 1.5,
                borderColor: errors.leadEmail ? '#EF4444' : ((wiz.email || '').trim().length > 0 && isValidEmailAddress(wiz.email) ? '#10B981' : '#CBD5E1'),
                borderRadius: 10,
                paddingHorizontal: 12,
                backgroundColor: errors.leadEmail ? '#FEF2F2' : '#FFFFFF',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: errors.leadEmail ? 4 : 8,
              }}
            >
              <MailIcon size={18} color={errors.leadEmail ? '#EF4444' : '#64748B'} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: '#0F172A' }}
                value={wiz.email || ''}
                onChangeText={v => {
                  const cleaned = (v || '').replace(/\s+/g, '');
                  setWiz(c => ({ ...c, email: cleaned }));
                  if (errors.leadEmail) setErrors(e => ({ ...e, leadEmail: null }));
                }}
                placeholder={lang ? 'আপনার ইমেইল অ্যাড্রেস লিখুন' : 'For booking updates'}
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {(wiz.email || '').trim().length > 0 && isValidEmailAddress(wiz.email) && (
                <Text style={{ color: '#10B981', fontWeight: '800' }}>✓</Text>
              )}
            </View>
            {errors.leadEmail ? (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 12, fontWeight: '600' }}>
                {errors.leadEmail}
              </Text>
            ) : (wiz.email || '').trim().length > 0 && !isValidEmailAddress(wiz.email) ? (
              <Text style={{ color: '#EF4444', fontSize: 11.5, marginBottom: 12, fontWeight: '600' }}>
                ⚠️ {lang ? 'সঠিক ইমেইল ফরম্যাট দিন' : 'Invalid email format'}
              </Text>
            ) : null}

            {/* Checkbox: I am booking for someone else */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setWiz(c => ({ ...c, bookingForSomeoneElse: true }))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 1.5,
                  borderColor: '#94A3B8',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                }}
              />
              <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '500' }}>
                {lang ? 'আমি অন্য কারো জন্য বুক করছি' : 'I am booking for someone else'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Your booking details - all in EditText format */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 14,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16 }}>✈</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'আপনার বুকিং ও ফ্লাইট বিবরণ' : 'Your booking & flight details'}
                </Text>
              </View>
            </View>

            {/* 1. Airport (EditText input) */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                {lang ? 'বিমানবন্দর *' : 'Airport *'}
              </Text>
              <View
                style={{
                  height: 48,
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <LocationPinIcon size={18} color="#0284C7" />
                <TextInput
                  style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' }}
                  value={wiz.airportName !== undefined ? wiz.airportName : (lang ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)' : 'Hazrat Shahjalal International Airport, Dhaka (DAC)')}
                  onChangeText={v => setWiz(c => ({ ...c, airportName: v }))}
                  placeholder={lang ? 'বিমানবন্দরের নাম লিখুন' : 'Enter airport name'}
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
                <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>
                  ● {lang ? 'বর্তমানে শুধুমাত্র ঢাকা বিমানবন্দরে (DAC) সেবা চালু রয়েছে' : 'Currently operating exclusively at Dhaka Airport (DAC)'}
                </Text>
              </View>
            </View>

            {/* 2. Service direction (EditText input) */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                {lang ? 'সেবার ধরন (ডিরেকশন) *' : 'Service direction *'}
              </Text>
              <View
                style={{
                  height: 48,
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {isDep ? <DepartureIcon size={18} /> : <ArrivalIcon size={18} />}
                <TextInput
                  style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' }}
                  value={wiz.serviceDirectionText !== undefined ? wiz.serviceDirectionText : (isDep ? (lang ? 'প্রস্থান প্রোটোকল (Departure)' : 'Departure Protocol') : (lang ? 'আগমন প্রোটোকল (Arrival)' : 'Arrival Protocol'))}
                  onChangeText={v => {
                    setWiz(c => ({
                      ...c,
                      serviceDirectionText: v,
                      dir: v.toLowerCase().includes('dep') || v.includes('প্রস্থান') ? 'dep' : 'arr'
                    }));
                  }}
                  placeholder={lang ? 'আগমন বা প্রস্থান প্রোটোকল লিখুন' : 'Arrival or Departure Protocol'}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* 3. Package (EditText input) */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                {lang ? 'প্যাকেজ *' : 'Package *'}
              </Text>
              <View
                style={{
                  height: 48,
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                  {wiz.onlyAddons ? (
                    <Image source={require('../../../assets/pkg_additional.webp')} style={{ width: 18, height: 18, resizeMode: 'contain' }} />
                  ) : (wiz.packageChoice === 'economy' || wiz.pkg?.id === 'economy') ? (
                    <StandardPkgIcon size={18} color="#0284C7" />
                  ) : (wiz.packageChoice === 'first' || wiz.pkg?.id === 'first') ? (
                    <VipPkgIcon size={18} color="#D97706" />
                  ) : (
                    <PremiumPkgIcon size={18} color="#2563EB" />
                  )}
                </View>
                <TextInput
                  style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' }}
                  value={
                    wiz.onlyAddons
                      ? (lang ? 'শুধুমাত্র অতিরিক্ত সার্ভিস (ফি: ৳০)' : 'Only Additional Services (Fee: ৳0)')
                      : (wiz.packageText !== undefined ? wiz.packageText : (wiz.pkg?.n ? wiz.pkg.n[lang] || wiz.pkg.n[0] : (wiz.pkg?.t || (lang ? 'প্রিমিয়াম (১০০০৳)' : 'Premium (1000 Tk)'))))
                  }
                  editable={!wiz.onlyAddons}
                  onChangeText={v => {
                    setWiz(c => ({ ...c, packageText: v }));
                  }}
                  placeholder={lang ? 'প্যাকেজের নাম লিখুন (যেমন: প্রিমিয়াম ১০০০৳)' : 'Enter package name (e.g. Premium 1000 Tk)'}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* 4. Flight Number (EditText input with Validation) */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                {lang ? 'ফ্লাইট নম্বর *' : 'Flight number *'}
              </Text>
              <View
                style={{
                  height: 48,
                  borderWidth: 1.5,
                  borderColor: errors.flightNumber
                    ? '#EF4444'
                    : ((wiz.fno || '').trim() && isValidFlightNumber(wiz.fno) ? '#10B981' : '#CBD5E1'),
                  borderRadius: 10,
                  backgroundColor: errors.flightNumber ? '#FEF2F2' : '#FFFFFF',
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <PlaneIcon size={18} color={errors.flightNumber ? '#EF4444' : '#64748B'} />
                <TextInput
                  style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A', outlineStyle: 'none' }}
                  value={wiz.fno || ''}
                  onChangeText={v => {
                    const upper = (v || '').toUpperCase();
                    setWiz(c => ({ ...c, fno: upper }));
                    if (upper.trim()) {
                      if (isValidFlightNumber(upper)) {
                        setErrors(e => ({ ...e, flightNumber: null }));
                      } else if (errors.flightNumber || upper.trim().length >= 3) {
                        setErrors(e => ({
                          ...e,
                          flightNumber: lang
                            ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
                            : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)',
                        }));
                      }
                    } else {
                      setErrors(e => ({ ...e, flightNumber: null }));
                    }
                  }}
                  onBlur={() => {
                    if ((wiz.fno || '').trim() && !isValidFlightNumber(wiz.fno)) {
                      setErrors(e => ({
                        ...e,
                        flightNumber: lang
                          ? 'সঠিক ফ্লাইট নম্বর ফরম্যাট দিন (যেমন: BG-084, EK-582, BS-101)'
                          : 'Invalid flight number format (e.g. BG-084, EK-582, BS-101)',
                      }));
                    }
                  }}
                  placeholder={lang ? 'যেমন: BG-084, EK-582' : 'e.g. BG-084, EK-582'}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />
              </View>
              {errors.flightNumber ? (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                  ⚠️ {errors.flightNumber}
                </Text>
              ) : (wiz.fno || '').trim() && isValidFlightNumber(wiz.fno) ? (
                (() => {
                  const flightInfo = getLiveFlightStatus(wiz.fno, wiz.dir || 'arr');
                  return (
                    <View style={{ marginTop: 6, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#DCFCE7' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: '#15803D', fontSize: 11.5, fontWeight: '800' }}>
                            ✓ {lang ? 'শনাক্তকৃত ফ্লাইট' : 'Verified Flight'}: {wiz.fno}
                          </Text>
                          {(flightInfo?.liveRadar || wiz.liveRadar) && (
                            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#86EFAC' }}>
                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#15803D' }}>
                                ● {lang ? 'লাইভ রাডার' : 'Live Radar'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#166534' }}>
                            🏢 {flightInfo?.terminal || wiz.terminal || 'Terminal 1, HSIA'}
                          </Text>
                        </View>
                      </View>
                      {(flightInfo?.airline || wiz.airline) && (
                        <Text style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                          ✈️ {lang ? flightInfo?.airlineBn || flightInfo?.airline || wiz.airlineBn || wiz.airline : flightInfo?.airline || wiz.airline} • {flightInfo?.route || wiz.route || ''}
                        </Text>
                      )}
                    </View>
                  );
                })()
              ) : null}

              {/* Popular Flight Suggestions */}
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                  {lang ? 'জনপ্রিয় ফ্লাইট:' : 'Popular:'}
                </Text>
                {['BG-084', 'EK-582', 'QR-638', 'SQ-446', 'BS-314', 'SV-804'].map(fn => (
                  <TouchableOpacity
                    key={fn}
                    activeOpacity={0.7}
                    onPress={() => {
                      const fi = getLiveFlightStatus(fn, wiz.dir || 'arr');
                      setWiz(c => ({
                        ...c,
                        fno: fn,
                        terminal: fi?.terminal || 'Terminal 1',
                        airline: fi?.airline,
                      }));
                      setErrors(e => ({ ...e, flightNumber: null }));
                    }}
                    style={{
                      backgroundColor: wiz.fno === fn ? '#E0F2FE' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: wiz.fno === fn ? '#0284C7' : '#E2E8F0',
                      borderRadius: 6,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: wiz.fno === fn ? '#0284C7' : '#475569' }}>
                      {fn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 5. Service Date (Date Picker) */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                {lang ? 'সেবার তারিখ *' : 'Service date *'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowDateModal(true)}
                style={{
                  height: 48,
                  borderWidth: 1.5,
                  borderColor: errors.serviceDate ? '#EF4444' : (wiz.date && isValidFlightDate(wiz.date) ? '#10B981' : '#CBD5E1'),
                  borderRadius: 10,
                  backgroundColor: errors.serviceDate ? '#FEF2F2' : '#FFFFFF',
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <CalendarIcon size={18} color="#0284C7" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: wiz.date ? '700' : '500',
                      color: wiz.date ? '#0F172A' : '#94A3B8',
                    }}
                    numberOfLines={1}
                  >
                    {wiz.date || (lang ? 'তারিখ নির্বাচন করুন' : 'Select service date')}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' }}>
                  <Text style={{ fontSize: 14 }}>📅</Text>
                </View>
              </TouchableOpacity>
              {errors.serviceDate ? (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                  ⚠️ {errors.serviceDate}
                </Text>
              ) : (wiz.date || '').trim() && isValidFlightDate(wiz.date) ? (
                <Text style={{ color: '#059669', fontSize: 11, marginTop: 4, fontWeight: '700' }}>
                  ✓ {lang ? 'বৈধ তারিখ' : 'Valid date'}
                </Text>
              ) : null}
            </View>

            {/* 6. Passengers (EditText input) */}
            <View style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                {lang ? 'যাত্রী সংখ্যা *' : 'Passengers *'}
              </Text>
              <View
                style={{
                  height: 48,
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <UserIcon size={18} color="#0284C7" />
                <TextInput
                  style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' }}
                  value={wiz.passengersText !== undefined ? String(wiz.passengersText) : String(wiz.a || 1)}
                  keyboardType="numeric"
                  maxLength={1}
                  onChangeText={v => {
                    const raw = v.replace(/\D/g, '');
                    const parsed = parseInt(raw, 10);
                    const clamped = isNaN(parsed) || parsed < 1 ? 1 : Math.min(9, parsed);
                    setWiz(c => ({
                      ...c,
                      passengersText: raw ? String(clamped) : '',
                      a: clamped,
                    }));
                  }}
                  placeholder={lang ? 'যাত্রী সংখ্যা (১-৯)' : 'Number of passengers (1-9)'}
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {Number(wiz.a || 1) >= 9 && (
                <Text style={{ color: '#D97706', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                  ⚠️ {lang ? 'সর্বোচ্চ ৯ জন যাত্রী নির্বাচন করা যাবে। ১০ বা ততোধিক যাত্রীর জন্য গ্রুপ বুকিংয়ে যোগাযোগ করুন।' : 'Max 9 passengers per booking. For 10+, contact group protocol.'}
                </Text>
              )}
            </View>
          </View>

          {/* Card 2.5: Additional Services (Optional) */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'অতিরিক্ত সেবাসমূহ (ঐচ্ছিক)' : 'Additional Services (Optional)'}
              </Text>
              {(wiz.addons || []).length > 0 && (
                <View style={{ backgroundColor: '#0284C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                    {(wiz.addons || []).length} {lang ? 'টি যুক্ত' : 'added'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              {lang ? 'আপনার ভ্রমণের সুবিধার্থে যেকোনো অতিরিক্ত সেবা যোগ করুন' : 'Select extra services to assist your airport journey'}
            </Text>

            <View style={{ gap: 8 }}>
              {ADDONS.map(addon => {
                const isSelected = (wiz.addons || []).includes(addon.id);
                const assetImg = addon.image || getAddonAsset(addon.id);

                return (
                  <View
                    key={addon.id}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#0284C7' : '#F1F5F9',
                      backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                      padding: 10,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        setWiz(prev => {
                          const current = prev.addons || [];
                          const next = current.includes(addon.id)
                            ? current.filter(x => x !== addon.id)
                            : [...current, addon.id];
                          return { ...prev, addons: next };
                        });
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          backgroundColor: isSelected ? '#E0F2FE' : '#F8FAFC',
                          borderWidth: 1,
                          borderColor: isSelected ? '#BAE6FD' : '#E2E8F0',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                        }}
                      >
                        {assetImg ? (
                          <Image source={assetImg} style={{ width: 30, height: 30 }} resizeMode="contain" />
                        ) : (
                          <Text style={{ fontSize: 20 }}>{addon.ic || '✨'}</Text>
                        )}
                      </View>

                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? '#0369A1' : '#0F172A' }}>
                          {addon.n[lang ? 1 : 0] || addon.n[0]}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                          {addon.d[lang ? 1 : 0] || addon.d[0]}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7', marginTop: 2 }}>
                          {addon.p != null
                            ? `${addon.p} ${lang ? 'টাকা' : 'Tk'}${addon.priceUnit === 'bag' ? ` / ${lang ? 'ব্যাগ' : 'bag'}` : addon.priceUnit === 'person' ? ` / ${lang ? 'জন' : 'person'}` : ''}`
                            : (lang ? 'অনুরোধ সাপেক্ষে' : 'On Request')}
                        </Text>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          backgroundColor: isSelected ? '#0284C7' : '#F0F9FF',
                          borderWidth: 1,
                          borderColor: isSelected ? '#0284C7' : '#BAE6FD',
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSelected ? '#FFFFFF' : '#0284C7' }}>
                          {isSelected ? (lang ? '✓ যুক্ত' : '✓ Added') : (lang ? '+ যোগ' : '+ Add')}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Stepper for Luggage Wrapping */}
                    {isSelected && addon.id === 'wrap' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#BAE6FD', gap: 8 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#0369A1' }}>
                          {lang ? 'ব্যাগের সংখ্যা:' : 'Bags:'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 6 }}>
                          <TouchableOpacity
                            onPress={() => {
                              const curr = Math.max(1, Number(wiz.addonDetails?.wrap?.bags || 1) - 1);
                              setWiz(p => ({ ...p, addonDetails: { ...p.addonDetails, wrap: { ...(p.addonDetails?.wrap || {}), bags: curr } } }));
                            }}
                            style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#E0F2FE', borderTopLeftRadius: 5, borderBottomLeftRadius: 5 }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>-</Text>
                          </TouchableOpacity>
                          <Text style={{ paddingHorizontal: 8, fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
                            {wiz.addonDetails?.wrap?.bags || 1}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              const curr = Math.min(10, Number(wiz.addonDetails?.wrap?.bags || 1) + 1);
                              setWiz(p => ({ ...p, addonDetails: { ...p.addonDetails, wrap: { ...(p.addonDetails?.wrap || {}), bags: curr } } }));
                            }}
                            style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#E0F2FE', borderTopRightRadius: 5, borderBottomRightRadius: 5 }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0284C7', marginLeft: 'auto' }}>
                          = {(Number(wiz.addonDetails?.wrap?.bags || 1) * 400)} {lang ? 'টাকা' : 'Tk'}
                        </Text>
                      </View>
                    )}

                    {/* Stepper for Wheelchair */}
                    {isSelected && addon.id === 'wheel' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#BAE6FD', gap: 8 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#0369A1' }}>
                          {lang ? 'হুইলচেয়ার প্রয়োজন:' : 'Pax:'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 6 }}>
                          <TouchableOpacity
                            onPress={() => {
                              const curr = Math.max(1, Number(wiz.addonDetails?.wheel?.count || 1) - 1);
                              setWiz(p => ({ ...p, addonDetails: { ...p.addonDetails, wheel: { ...(p.addonDetails?.wheel || {}), count: curr } } }));
                            }}
                            style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#E0F2FE', borderTopLeftRadius: 5, borderBottomLeftRadius: 5 }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>-</Text>
                          </TouchableOpacity>
                          <Text style={{ paddingHorizontal: 8, fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
                            {wiz.addonDetails?.wheel?.count || 1}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              const curr = Math.min(5, Number(wiz.addonDetails?.wheel?.count || 1) + 1);
                              setWiz(p => ({ ...p, addonDetails: { ...p.addonDetails, wheel: { ...(p.addonDetails?.wheel || {}), count: curr } } }));
                            }}
                            style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#E0F2FE', borderTopRightRadius: 5, borderBottomRightRadius: 5 }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0284C7', marginLeft: 'auto' }}>
                          = {(Number(wiz.addonDetails?.wheel?.count || 1) * 300)} {lang ? 'টাকা' : 'Tk'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Card 3: Price summary */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>
              {lang ? 'মূল্য সারাংশ' : 'Price summary'}
            </Text>

            {/* Adults line */}
            {wiz.onlyAddons ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13.5, color: '#047857', fontWeight: '700' }}>
                  ✨ {lang ? 'প্রোটোকল প্যাকেজ (মওকুফ)' : 'Protocol Package (Waived)'}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#047857' }}>
                  ৳ 0
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13.5, color: '#475569' }}>
                  {wiz.pkg?.n ? wiz.pkg.n[lang ? 1 : 0] : (lang ? 'স্ট্যান্ডার্ড' : 'Standard')} • {pricingData.adults} {lang ? 'জন প্রাপ্তবয়স্ক' : 'Adult(s)'}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>
                  ৳ {pricingData.adultCharge}
                </Text>
              </View>
            )}

            {/* Children line if any */}
            {pricingData.children > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13.5, color: '#475569' }}>
                  👶 {pricingData.children} {lang ? 'জন শিশু (২০% ছাড়)' : 'Child (-20%)'}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>
                  ৳ {pricingData.childCharge}
                </Text>
              </View>
            )}

            {/* Elderly line if any */}
            {pricingData.elderly > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13.5, color: '#475569' }}>
                  🧓 {pricingData.elderly} {lang ? 'জন প্রবীণ (১০% ছাড়)' : 'Senior (-10%)'}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>
                  ৳ {pricingData.elderlyCharge}
                </Text>
              </View>
            )}

            {/* Group volume discount if applied */}
            {pricingData.groupDiscountAmount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13.5, color: '#059669', fontWeight: '600' }}>
                  🏷️ {lang ? `গ্রুপ বুকিং ছাড় (${pricingData.groupDiscountPercent}%)` : `Group Discount (${pricingData.groupDiscountPercent}%)`}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#059669' }}>
                  - ৳ {pricingData.groupDiscountAmount}
                </Text>
              </View>
            )}

            {/* Extra Protocol Staff */}
            {pricingData.extraStaffCharge > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13.5, color: '#475569' }}>
                  🧑‍✈️ {pricingData.extraStaffCount} {lang ? 'জন অতিরিক্ত প্রোটোকল সহকারী' : 'Extra Protocol Staff'}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>
                  ৳ {pricingData.extraStaffCharge}
                </Text>
              </View>
            )}

            {/* Dedicated VIP Staff */}
            {pricingData.dedicatedStaffCharge > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13.5, color: '#475569' }}>
                  🎖️ {lang ? 'ডেডিকেটেড ভিআইপি অফিসার' : 'Dedicated VIP Officer'}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>
                  ৳ {pricingData.dedicatedStaffCharge}
                </Text>
              </View>
            )}

            {/* Add-on services */}
            {pricingData.addonLines && pricingData.addonLines.map(addon => {
              const asset = getAddonAsset(addon.id);
              return (
                <View key={addon.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                    {asset ? (
                      <Image source={asset} style={{ width: 18, height: 18, borderRadius: 3, marginRight: 6 }} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: 13.5, color: '#475569', marginRight: 4 }}>＋</Text>
                    )}
                    <Text style={{ fontSize: 13.5, color: '#475569' }}>
                      {Array.isArray(addon.name) ? addon.name[lang ? 1 : 0] : addon.id} {addon.quantity > 1 ? `(${addon.quantity})` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>
                    {addon.amount != null ? `৳ ${addon.amount}` : (lang ? 'কোট প্রয়োজন' : 'Quote Req.')}
                  </Text>
                </View>
              );
            })}

            {/* Airport transfer vehicle */}
            {pricingData.hasVehicleTransfer && pricingData.vehicleCharge > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                  <Image source={getAddonAsset('transfer')} style={{ width: 18, height: 18, borderRadius: 3, marginRight: 6 }} resizeMode="contain" />
                  <Text style={{ fontSize: 13.5, color: '#475569' }}>
                    {lang ? 'ট্রান্সফার গাড়ি' : 'Airport Vehicle'} ({pricingData.vehicleConfig ? (Array.isArray(pricingData.vehicleConfig.name) ? pricingData.vehicleConfig.name[lang ? 1 : 0] : pricingData.vehicleConfig.name) : pricingData.vehicleCategory})
                  </Text>
                </View>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>
                  ৳ {pricingData.vehicleCharge}
                </Text>
              </View>
            )}

            {/* Peak hour surcharge if applicable */}
            {pricingData.peakSurchargeAmount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13.5, color: '#D97706' }}>
                  🌙 {lang ? `নাইট/পিক আওয়ার চার্জ (${pricingData.peakSurchargePercent}%)` : `Peak Hour Surcharge (${pricingData.peakSurchargePercent}%)`}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#D97706' }}>
                  ৳ {pricingData.peakSurchargeAmount}
                </Text>
              </View>
            )}

            {/* Airport surcharge if applicable */}
            {pricingData.airportSurcharge > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13.5, color: '#475569' }}>
                  🛫 {lang ? 'বিমানবন্দর লোকেশন চার্জ' : 'Airport Regional Surcharge'}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>
                  ৳ {pricingData.airportSurcharge}
                </Text>
              </View>
            )}

            {/* Platform Booking Fee */}
            {pricingData.platformFee > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13.5, color: '#64748B' }}>
                  ⚙️ {lang ? 'প্ল্যাটফর্ম সার্ভিস ফি' : 'Platform Service Fee'}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#475569' }}>
                  ৳ {pricingData.platformFee}
                </Text>
              </View>
            )}

            {/* Government VAT */}
            {pricingData.vatAmount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13.5, color: '#64748B' }}>
                  🏛️ {lang ? `সরকারি ভ্যাট (${pricingData.vatPercent}%)` : `Govt VAT (${pricingData.vatPercent}%)`}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#475569' }}>
                  ৳ {pricingData.vatAmount}
                </Text>
              </View>
            )}

            <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 }} />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                {lang ? 'মোট প্রদেয়' : 'Total payable'}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0284C7' }}>
                ৳ {totalAmount} {lang ? 'টাকা' : 'Tk'}
              </Text>
            </View>
          </View>

          {/* Card 4: Earn 50 points */}
          <View
            style={{
              backgroundColor: '#FFFBEB',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: '#FDE68A',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <GiftIcon size={24} color="#D97706" />
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#B45309' }}>
                  {lang ? '৫০ পয়েন্ট পাবেন' : 'Earn 50 points'}
                </Text>
                <Text style={{ fontSize: 12, color: '#78350F', marginTop: 2 }}>
                  {lang ? 'সেবা সম্পন্ন হওয়ার পর যোগ হবে।' : 'Added after your service is completed.'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: '#92400E' }}>
              {lang ? 'নমুনা পয়েন্ট রেট' : 'Sample points rate'}
            </Text>
          </View>

          {/* Card 5: Cancellation policy */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowCancellationPolicy(true)}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <DocumentIcon size={18} color="#64748B" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                {lang ? 'বাতিলকরণ নীতি' : 'Cancellation policy'}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Checkbox: Terms agreement */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAgreedPolicy(!agreedPolicy);
              if (errors.agreedPolicy) setErrors(e => ({ ...e, agreedPolicy: null }));
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: errors.agreedPolicy ? 6 : 18,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                backgroundColor: agreedPolicy ? '#0284C7' : '#FFFFFF',
                borderWidth: 1.5,
                borderColor: errors.agreedPolicy ? '#EF4444' : agreedPolicy ? '#0284C7' : '#94A3B8',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {agreedPolicy && (
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>✓</Text>
              )}
            </View>
            <Text style={{ fontSize: 13, color: errors.agreedPolicy ? '#DC2626' : '#334155', flex: 1, flexWrap: 'wrap' }}>
              {lang ? 'আমি ' : 'I agree to the '}
              <Text
                style={{ color: '#0284C7', textDecorationLine: 'underline', fontWeight: '700' }}
                onPress={() => (setComplianceModalTab ? setComplianceModalTab('terms') : setShowCancellationPolicy(true))}
              >
                {lang ? 'শর্তাবলী' : 'Terms & Conditions'}
              </Text>
              {lang ? ', ' : ', '}
              <Text
                style={{ color: '#0284C7', textDecorationLine: 'underline', fontWeight: '700' }}
                onPress={() => (setComplianceModalTab ? setComplianceModalTab('privacy') : null)}
              >
                {lang ? 'প্রাইভেসি' : 'Privacy Policy'}
              </Text>
              {lang ? ' ও ' : ' & '}
              <Text
                style={{ color: '#0284C7', textDecorationLine: 'underline', fontWeight: '700' }}
                onPress={() => (setComplianceModalTab ? setComplianceModalTab('refund') : setShowCancellationPolicy(true))}
              >
                {lang ? 'রিফান্ড নীতিমালায় (৭-১০ দিন)' : 'Refund Policy (7-10 Days)'}
              </Text>
              {lang ? ' সম্মত।' : '.'}
            </Text>
          </TouchableOpacity>
          {errors.agreedPolicy ? (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 14, fontWeight: '600' }}>
              {errors.agreedPolicy}
            </Text>
          ) : null}

          {/* Sticky Bottom Actions */}
          <Text
            style={{
              fontSize: 12,
              color: '#64748B',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {lang ? 'পরবর্তী: পেমেন্ট অপশন নির্বাচন' : 'Next: review payment options'}
          </Text>
          {/* Validation Summary Alert */}
          {Object.keys(errors).length > 0 && (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#EF4444',
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626' }}>
                ⚠️ {lang ? 'পেমেন্টে এগিয়ে যাওয়ার আগে লাল চিহ্নিত তথ্যগুলো পূরণ করুন:' : 'Please complete all required fields marked in red:'}
              </Text>
              {errors.flightNumber && (
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 3 }}>
                  • {lang ? 'ফ্লাইট নম্বর: ' : 'Flight: '}{errors.flightNumber}
                </Text>
              )}
              {errors.serviceDate && (
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                  • {lang ? 'সেবার তারিখ: ' : 'Date: '}{errors.serviceDate}
                </Text>
              )}
              {errors.leadName && (
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                  • {lang ? 'আপনার নাম: ' : 'Name: '}{errors.leadName}
                </Text>
              )}
              {errors.leadPhone && (
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                  • {lang ? 'মোবাইল নম্বর: ' : 'Phone: '}{errors.leadPhone}
                </Text>
              )}
              {errors.agreedPolicy && (
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                  • {errors.agreedPolicy}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContinueToPayment}
            style={{
              backgroundColor: '#0284C7',
              height: 50,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
              shadowColor: '#0284C7',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
              {lang ? 'পেমেন্টে এগিয়ে যান →' : 'Continue to Payment →'}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
            {lang ? 'আপনার বুকিং এখনও নিশ্চিত হয়নি।' : 'Your booking is not confirmed yet.'}
          </Text>
        </>
      )}

      {/* Passport Scan / OCR Modal */}
      <PassportOcrModal
        visible={showPassportOcr}
        onClose={() => setShowPassportOcr(false)}
        lang={lang}
        onScanComplete={data => {
          if (ocrTarget === 'lead') {
            if (wiz.bookingForSomeoneElse) {
              setWiz(c => ({
                ...c,
                passengerName: data.name,
                passportNumber: data.passportNumber,
                nationality: data.nationality,
              }));
              if (errors.passengerName) setErrors(e => ({ ...e, passengerName: null }));
            } else {
              setWiz(c => ({
                ...c,
                name: data.name,
                passportNumber: data.passportNumber,
                nationality: data.nationality,
              }));
              if (errors.leadName) setErrors(e => ({ ...e, leadName: null }));
            }
          } else {
            const idx = typeof ocrTarget === 'number' ? ocrTarget : parseInt(String(ocrTarget).replace('copax_', ''), 10);
            if (!isNaN(idx)) {
              const updated = [...(wiz.coPassengers || [])];
              while (updated.length <= idx) {
                updated.push({ name: '', passportNumber: '', nationality: '', notes: '' });
              }
              updated[idx] = {
                ...updated[idx],
                name: data.name,
                passportNumber: data.passportNumber,
                nationality: data.nationality,
              };
              setWiz(c => ({ ...c, coPassengers: updated }));
              if (errors[`coPassenger_${idx}_name`]) {
                setErrors(e => ({ ...e, [`coPassenger_${idx}_name`]: null }));
              }
            }
          }
        }}
      />
    </>
  );
}

