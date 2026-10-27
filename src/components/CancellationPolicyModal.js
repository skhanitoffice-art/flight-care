import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';

// Clock outline icon
const ClockIcon = ({ size = 18, color = '#0284C7' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size - 3, color }}>🕒</Text>;
};

// Gear/Settings Icon
const GearIcon = ({ size = 18, color = '#0F172A' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size - 3, color }}>⚙️</Text>;
};

// Credit card icon
const CardLineIcon = ({ size = 18, color = '#1E293B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size - 3, color }}>💳</Text>;
};

// Alert circle icon
const AlertCircleIcon = ({ size = 18, color = '#D97706' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size - 3, color }}>⚠️</Text>;
};

// Info icon
const InfoIcon = ({ size = 15, color = '#64748B' }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    );
  }
  return <Text style={{ fontSize: size - 3, color }}>ℹ️</Text>;
};

export default function CancellationPolicyModal({
  visible,
  onClose,
  lang = 0,
  onPressHelp,
}) {
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
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {/* Backdrop touch to close */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            paddingVertical: 20,
            paddingHorizontal: 22,
            maxWidth: 460,
            width: '100%',
            maxHeight: '92%',
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.18,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
            {/* 1. Header with Title & Close button */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 18.5,
                  fontWeight: '800',
                  color: '#0F172A',
                  flex: 1,
                  paddingRight: 10,
                }}
              >
                {lang ? 'বুকিং বাতিল ও রিফান্ড নীতিমালা' : 'Booking Cancellation & Refund Policy'}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Badge: প্রস্তাবিত খসড়া */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <View
                style={{
                  backgroundColor: '#FEF3C7',
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#B45309' }}>
                  {lang ? 'প্রস্তাবিত খসড়া' : 'Proposed Draft'}
                </Text>
              </View>
            </View>

            {/* 3. Subtitle */}
            <Text
              style={{
                fontSize: 12.5,
                color: '#475569',
                marginBottom: 14,
                lineHeight: 18,
              }}
            >
              {lang
                ? 'সময়সীমা নির্ধারিত সেবা শুরুর সময় থেকে গণনা হবে।'
                : 'Timelines will be counted from the scheduled service start time.'}
            </Text>

            {/* 4. Timeline Rows (Image 3 rows) */}
            {/* Row 1: ২৪ ঘণ্টা বা তার আগে -> ১০০% রিফান্ড */}
            <View
              style={{
                backgroundColor: '#F0F9FF',
                borderRadius: 10,
                paddingVertical: 9,
                paddingHorizontal: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0F2FE',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: '#E0F2FE',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ClockIcon size={16} color="#0284C7" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', flex: 1 }}>
                  {lang ? '২৪ ঘণ্টা বা তার আগে' : '24 hours or earlier'}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#DCFCE7',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803D' }}>
                  {lang ? '১০০% রিফান্ড' : '100% Refund'}
                </Text>
              </View>
            </View>

            {/* Row 2: ৬ ঘণ্টা থেকে ২৪ ঘণ্টার কম আগে -> ৫০% রিফান্ড */}
            <View
              style={{
                backgroundColor: '#F0F9FF',
                borderRadius: 10,
                paddingVertical: 9,
                paddingHorizontal: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0F2FE',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: '#E0F2FE',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ClockIcon size={16} color="#0284C7" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', flex: 1 }}>
                  {lang ? '৬ ঘণ্টা থেকে ২৪ ঘণ্টার কম আগে' : '6 to <24 hours before'}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#FEF3C7',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>
                  {lang ? '৫০% রিফান্ড' : '50% Refund'}
                </Text>
              </View>
            </View>

            {/* Row 3: ৬ ঘণ্টার কম আগে -> রিফান্ড প্রযোজ্য নয় */}
            <View
              style={{
                backgroundColor: '#F0F9FF',
                borderRadius: 10,
                paddingVertical: 9,
                paddingHorizontal: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                borderWidth: 1,
                borderColor: '#E0F2FE',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: '#E0F2FE',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ClockIcon size={16} color="#0284C7" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', flex: 1 }}>
                  {lang ? '৬ ঘণ্টার কম আগে' : 'Less than 6 hours before'}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#FEE2E2',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#B91C1C' }}>
                  {lang ? 'রিফান্ড প্রযোজ্য নয়' : 'No Refund'}
                </Text>
              </View>
            </View>

            {/* 5. বিশেষ পরিস্থিতি Section */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <GearIcon size={18} color="#0F172A" />
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'বিশেষ পরিস্থিতি' : 'Special Circumstances'}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 12.5,
                  color: '#334155',
                  lineHeight: 18,
                  marginBottom: 8,
                  paddingLeft: 26,
                }}
              >
                {lang
                  ? 'Flight Care সেবা দিতে না পারলে সম্পূর্ণ রিফান্ড।'
                  : 'Full refund if Flight Care is unable to provide scheduled service.'}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  paddingLeft: 6,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#FEF3C7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#B45309' }}>!</Text>
                </View>
                <Text
                  style={{
                    fontSize: 12.5,
                    color: '#334155',
                    lineHeight: 18,
                    flex: 1,
                  }}
                >
                  {lang
                    ? 'ফ্লাইট বাতিল বা সময় পরিবর্তন হলে সেবা শুরুর আগে আমাদের জানান।'
                    : 'If flight is cancelled or rescheduled, please notify us before service starts.'}
                </Text>
              </View>
            </View>

            {/* 5.1 লাগেজ ও নিষিদ্ধ পণ্যের বাধ্যতামূলক নীতিমালা (Baggage & Prohibited Items Policy) */}
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#FCA5A5',
                padding: 12,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 16 }}>🛡️</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#991B1B' }}>
                  {lang
                    ? 'লাগেজ ও নিষিদ্ধ পণ্যের নীতিমালা (বাধ্যতামূলক)'
                    : 'Luggage & Prohibited Items Policy (Mandatory)'}
                </Text>
              </View>

              <Text style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 18, marginBottom: 8, fontWeight: '600' }}>
                {lang
                  ? 'যাত্রীর ব্যাগেজ/মালের মধ্যে নিম্নোক্ত কোনো প্রকার পণ্য বা সামগ্রী বহন করা সম্পূর্ণভাবে নিষিদ্ধ এবং আইনত দণ্ডনীয় অপরাধ:'
                  : 'Passengers are strictly prohibited from carrying any of the following items in luggage:'}
              </Text>

              <View style={{ gap: 4, paddingLeft: 4, marginBottom: 8 }}>
                <Text style={{ fontSize: 11.5, color: '#991B1B', lineHeight: 16 }}>
                  • {lang ? '❌ জীবিত প্রাণী (পাখি, পশু বা অন্য কোনো প্রাণী)' : '❌ Live Animals (Pets, birds, reptiles, etc.)'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#991B1B', lineHeight: 16 }}>
                  • {lang ? '❌ অলংকার (স্বর্ণ, রৌপ্য ও মূল্যবান রত্ন)' : '❌ Jewelry (Gold, silver, diamonds, bullion)'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#991B1B', lineHeight: 16 }}>
                  • {lang ? '❌ দেশী-বিদেশী মুদ্রা (টাকা, ডলার বা নগদ অর্থ)' : '❌ Currency (Domestic or foreign cash/currencies)'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#991B1B', lineHeight: 16 }}>
                  • {lang ? '❌ মাদকদ্রব্য ও নেশাজাতীয় দ্রব্য' : '❌ Narcotics & Controlled Substances'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#991B1B', lineHeight: 16 }}>
                  • {lang ? '❌ গোলাবারুদ, অস্ত্র ও বিস্ফোরক সামগ্রী' : '❌ Firearms, Ammunition & Explosives'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#991B1B', lineHeight: 16 }}>
                  • {lang ? '❌ বিপজ্জনক ও দাহ্য পদার্থ বা রাসায়নিক' : '❌ Hazardous, Flammable Materials or Chemicals'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#991B1B', lineHeight: 16 }}>
                  • {lang ? '❌ কোনো ধরনের বেআইনি ও রাষ্ট্রীয়ভাবে নিষিদ্ধ পণ্য' : '❌ Any Illegal Contraband or Prohibited Goods'}
                </Text>
              </View>

              <Text style={{ fontSize: 11, color: '#B91C1C', fontStyle: 'italic', lineHeight: 15 }}>
                {lang
                  ? 'বুকিং সম্পন্ন করার পূর্বে যাত্রীকে নিশ্চিত করতে হবে যে তার বা সঙ্গীদের লাগেজে এর কোনোটি নেই। বিমানবন্দর নিরাপত্তা স্ক্রিনিংয়ে নিষিদ্ধ পণ্য পাওয়া গেলে তার সম্পূর্ণ দায় যাত্রীর।'
                  : 'Passengers must consent that luggage contains none of these items. Full legal liability rests with the passenger under CAAB regulations.'}
              </Text>
            </View>

            {/* 6. রিফান্ডের প্রস্তাবিত সময় Box */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 10,
              }}
            >
              <CardLineIcon size={18} color="#1E293B" />
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '700',
                  color: '#1E293B',
                  flex: 1,
                  lineHeight: 17,
                }}
              >
                {lang
                  ? 'রিফান্ডের প্রস্তাবিত সময়: অনুমোদনের পর ৭-১০ কর্মদিবস।'
                  : 'Estimated refund time: 7-10 working days after approval.'}
              </Text>
            </View>

            {/* 7. চূড়ান্ত অনুমোদনের পর এই নীতিমালা কার্যকর হবে */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 16,
                paddingHorizontal: 2,
              }}
            >
              <InfoIcon size={14} color="#64748B" />
              <Text style={{ fontSize: 11.5, color: '#64748B', flex: 1 }}>
                {lang
                  ? 'চূড়ান্ত অনুমোদনের পর এই নীতিমালা কার্যকর হবে।'
                  : 'This policy will take effect upon final management approval.'}
              </Text>
            </View>

            {/* 8. Main Action Button: বুঝেছি */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClose}
              style={{
                backgroundColor: '#0284C7',
                height: 46,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#0284C7',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15.5, fontWeight: '800' }}>
                {lang ? 'বুঝেছি' : 'Got It'}
              </Text>
            </TouchableOpacity>

            {/* 9. Sublink: সহায়তা নিন */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                if (onPressHelp) onPressHelp();
              }}
              style={{ paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0284C7' }}>
                {lang ? 'সহায়তা নিন' : 'Get Help'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

