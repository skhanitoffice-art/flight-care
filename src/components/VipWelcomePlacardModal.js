import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
} from 'react-native';

export default function VipWelcomePlacardModal({
  visible,
  onClose,
  booking,
  lang = 0,
}) {
  const [isHighContrast, setIsHighContrast] = useState(false);

  if (!visible || !booking) return null;

  const passengerName = (
    booking.customer ||
    booking.passengerName ||
    booking.guest_name ||
    'VALUED PASSENGER'
  ).toUpperCase();

  const flightNumber = (booking.fno || booking.flight?.number || 'FLIGHT').toUpperCase();
  const airline = booking.airline || booking.flight?.airline || 'International Airline';
  const airportCode = booking.airport?.code || booking.airport || 'DAC';
  const terminal = booking.terminal || booking.flight?.terminal || 'Terminal 1';
  const gate = booking.gate || booking.flight?.gate || 'Gate / Bridge';
  const direction = booking.direction || (booking.service_category === 'departure' ? 'departure' : 'arrival');
  const serviceTitle = booking.package || booking.pkg?.t || 'VIP Airport Protocol';

  const isArrival = direction === 'arrival';

  // High contrast mode (Pure Black & Golden Yellow for distant readability)
  const bgColor = isHighContrast ? '#000000' : '#0B192C';
  const cardBorder = isHighContrast ? '#F59E0B' : '#D4AF37';
  const nameColor = isHighContrast ? '#FBBF24' : '#FFFFFF';
  const subColor = isHighContrast ? '#FDE68A' : '#94A3B8';

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
          backgroundColor: 'rgba(0, 0, 0, 0.88)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 620,
            backgroundColor: bgColor,
            borderRadius: 24,
            borderWidth: 3,
            borderColor: cardBorder,
            padding: 24,
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 24,
            elevation: 12,
            position: 'relative',
          }}
        >
          {/* Top Operational Action Bar */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.12)',
            }}
          >
            <TouchableOpacity
              onPress={() => setIsHighContrast(!isHighContrast)}
              style={{
                backgroundColor: isHighContrast ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 13 }}>💡</Text>
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '700',
                  color: isHighContrast ? '#000000' : '#E2E8F0',
                }}
              >
                {isHighContrast
                  ? (lang ? 'স্বাভাবিক মোড' : 'Normal Theme')
                  : (lang ? 'উচ্চ উজ্জ্বলতা মোড (High Contrast)' : 'High Contrast')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Luxury VIP Brand Header */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                paddingHorizontal: 16,
                paddingVertical: 5,
                borderRadius: 30,
                borderWidth: 1,
                borderColor: 'rgba(212, 175, 55, 0.4)',
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 14 }}>👑</Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '900',
                  color: '#FBBF24',
                  letterSpacing: 1.5,
                }}
              >
                FLIGHT CARE · VIP PROTOCOL GUEST
              </Text>
            </View>

            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: subColor,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {isArrival
                ? (lang ? '✈️ স্বাগতম / WELCOME TO BANGLADESH' : '✈️ WELCOME TO BANGLADESH')
                : (lang ? '🛫 শুভ যাত্রা / BON VOYAGE' : '🛫 BON VOYAGE · DEPARTURE PROTOCOL')}
            </Text>
          </View>

          {/* MAIN PASSENGER NAME (Extra Large & Bold for Airport Visibility) */}
          <View
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 18,
              paddingVertical: 28,
              paddingHorizontal: 16,
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: 'rgba(212, 175, 55, 0.25)',
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: '900',
                color: nameColor,
                textAlign: 'center',
                letterSpacing: 1.2,
                lineHeight: 40,
              }}
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {passengerName}
            </Text>

            <View
              style={{
                height: 3,
                width: 80,
                backgroundColor: '#F59E0B',
                borderRadius: 2,
                marginTop: 14,
                marginBottom: 12,
              }}
            />

            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: '#38BDF8',
                letterSpacing: 0.5,
              }}
            >
              {serviceTitle}
            </Text>
          </View>

          {/* Flight & Gate Details Grid */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 10,
              marginBottom: 18,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10.5, color: subColor, textTransform: 'uppercase', fontWeight: '700' }}>
                {lang ? 'ফ্লাইট' : 'Flight'}
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFFFFF', marginTop: 2 }}>
                {flightNumber}
              </Text>
              <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{airline}</Text>
            </View>

            <View style={{ width: 1, height: 35, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10.5, color: subColor, textTransform: 'uppercase', fontWeight: '700' }}>
                {lang ? 'টার্মিনাল' : 'Terminal'}
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFFFFF', marginTop: 2 }}>
                {terminal}
              </Text>
              <Text style={{ fontSize: 11, color: '#34D399', fontWeight: '700', marginTop: 1 }}>
                📍 {gate}
              </Text>
            </View>

            <View style={{ width: 1, height: 35, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10.5, color: subColor, textTransform: 'uppercase', fontWeight: '700' }}>
                {lang ? 'বিমানবন্দর' : 'Airport'}
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#FBBF24', marginTop: 2 }}>
                {airportCode}
              </Text>
              <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                ID: {String(booking.id || '').slice(-6)}
              </Text>
            </View>
          </View>

          {/* Operational Instructions for Officer */}
          <View
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              padding: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.3)',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 11.5,
                color: '#FDE68A',
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              📱 {lang
                ? 'বোর্ডিং ব্রিজের গেট বা লাউঞ্জের প্রবেশদ্বারে ফোনটি উঁচু করে ধরুন যাতে দূর থেকে যাত্রী দেখতে পান।'
                : 'Hold up this tablet / mobile screen at the boarding bridge gate exit for the passenger.'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

