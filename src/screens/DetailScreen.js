import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { s } from '../styles/styles';
import { C } from '../constants/theme';
import { getAddonAsset } from '../constants/data';
import ScreenHeaderBar from '../components/ScreenHeaderBar';

export default function DetailScreen({
  detail,
  setDetail,
  pagePadding,
  lang,
  t,
  startBooking,
}) {
  if (!detail) return null;

  const isBn = lang === 1;
  const isDep = detail.cat === 'dep';
  const categoryLabel = isDep
    ? (isBn ? '🛫 প্রস্থান প্রোটোকল (Departure Protocol)' : '🛫 Departure Protocol')
    : (isBn ? '🛬 আগমন প্রোটোকল (Arrival Protocol)' : '🛬 Arrival Protocol');

  const leadTime = detail.availability?.leadTime || (isBn ? 'তাৎক্ষণিক' : 'Instant');
  const serviceHours = detail.availability?.hours || '24/7';

  return (
    <ScrollView contentContainerStyle={{ padding: pagePadding, paddingBottom: 60 }}>
      {/* Top Navigation Back Bar */}
      <ScreenHeaderBar
        title={detail.title || (isBn ? 'সার্ভিস বিবরণী' : 'Service Details')}
        subtitle={categoryLabel}
        onBack={() => setDetail(null)}
        onHome={() => setDetail(null)}
        lang={lang}
      />

      {/* Main Service Hero Card */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1.5,
          borderColor: '#E2E8F0',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          marginBottom: 18,
        }}
      >
        {/* Category & Availability Badges */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0369A1' }}>
              {categoryLabel}
            </Text>
          </View>
          <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#15803D' }}>
              🟢 {isBn ? 'সক্রিয় সার্ভিস' : 'Available'}
            </Text>
          </View>
        </View>

        {/* Icon & Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#F0F9FF',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#BAE6FD',
            }}
          >
            {getAddonAsset(detail.id) || detail.image ? (
              <Image source={getAddonAsset(detail.id) || detail.image} style={{ width: 36, height: 36, resizeMode: 'contain' }} />
            ) : (
              <Text style={{ fontSize: 28 }}>{detail.ic}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>
              {detail.n[lang]}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              ⏰ {serviceHours} • ⚡ {leadTime} {isBn ? 'নিশ্চিতকরণ' : 'Confirmation'}
            </Text>
          </View>
        </View>

        {/* Description */}
        {detail.d && (
          <Text style={{ fontSize: 13.5, color: '#334155', lineHeight: 22, marginTop: 4 }}>
            {detail.d[lang]}
          </Text>
        )}
      </View>

      {/* Inclusions Checklist Section */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1.5,
          borderColor: '#E2E8F0',
          marginBottom: 18,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 14 }}>
          {isBn ? '✓ সার্ভিসে যা যা অন্তর্ভুক্ত রয়েছে' : '✓ What Is Included in This Service'}
        </Text>

        <View style={{ gap: 10 }}>
          {(detail.s || []).map((step, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                backgroundColor: '#F8FAFC',
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#F1F5F9',
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '800' }}>✓</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: '#1E293B', fontWeight: '600', lineHeight: 20 }}>
                {step[lang]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Trust & Guarantee Info Card */}
      <View
        style={{
          backgroundColor: '#F0FDF4',
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: '#BBF7D0',
          marginBottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 26 }}>🛡️</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#166534' }}>
            {isBn ? 'ফ্লাইট কেয়ার প্রিমিয়াম নিশ্চয়তা' : 'Flight Care Premium Assurance'}
          </Text>
          <Text style={{ fontSize: 12, color: '#15803D', marginTop: 2, lineHeight: 18 }}>
            {isBn
              ? 'বিমানবন্দরের ডেডিকেটেড গ্রাউন্ড প্রোটোকল টিম এবং রিয়েল-টাইম লাইভ ট্র্যাকিং রাডার সহ নিশ্চিত স্বস্তি।'
              : 'Dedicated on-ground protocol officers and live GPS radar tracking for guaranteed convenience.'}
          </Text>
        </View>
      </View>

      {/* Prominent Action Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={{
          backgroundColor: '#0284C7',
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          shadowColor: '#0284C7',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
        }}
        onPress={() => {
          startBooking(detail);
          setDetail(null);
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
          🚀 {isBn ? 'এই প্রোটোকল সার্ভিসটি বুক করুন ›' : 'Book This Protocol Service ›'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
