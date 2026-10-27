import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { AIRPORT_SPEED_DIAL_DIRECTORY } from '../services/airportOperationsService';

export default function AirportEmergencyDialModal({
  visible,
  onClose,
  lang = 0,
}) {
  if (!visible) return null;

  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`).catch(err => {
        console.warn('Call error:', err);
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 520,
            maxHeight: '85%',
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#EFF6FF',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 20 }}>📞</Text>
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'এয়ারপোর্ট জরুরি ডিরেক্টরি ও স্পিড ডায়াল' : 'Airport Station Speed Dial'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  {lang ? 'টার্মিনাল অপারেশন ও ইন্টারকম ডেস্ক' : 'Terminal Operations & Intercom Desk'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F1F5F9',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#64748B', fontSize: 16, fontWeight: '800' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Contact Directory List */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ gap: 10 }}>
              {AIRPORT_SPEED_DIAL_DIRECTORY.map((contact) => (
                <View
                  key={contact.id}
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: '#E2E8F0',
                    padding: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: contact.color,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{contact.icon}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
                        {lang ? contact.titleBn : contact.titleEn}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: contact.color }}>
                          {contact.extension}
                        </Text>
                        <Text style={{ fontSize: 10.5, color: '#94A3B8' }}>•</Text>
                        <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                          {contact.available}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleCall(contact.phone)}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: contact.color,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      shadowColor: contact.color,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>📞</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>
                      {lang ? 'কল করুন' : 'Call'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Bottom Notice */}
          <View
            style={{
              backgroundColor: '#FEF3C7',
              borderRadius: 10,
              padding: 10,
              marginTop: 14,
              borderWidth: 1,
              borderColor: '#FDE68A',
            }}
          >
            <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600', textAlign: 'center' }}>
              🛡️ {lang
                ? 'জরুরি পরিস্থিতিতে ডিউটি ম্যানেজার অথবা মেডিকেল সেন্টারে অবিলম্বে যোগাযোগ করুন।'
                : 'For emergencies, contact Duty Manager or Airport Medical Center immediately.'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

