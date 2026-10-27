import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { PROTOCOL_OFFICER_RANKS } from '../services/officerService';

/**
 * ProtocolRanksModal
 * Displays the complete 10-Tier Protocol Officer Ranking System & Point Ladder
 */
export default function ProtocolRanksModal({
  visible,
  onClose,
  lang = 1, // 0 = EN, 1 = BN
  currentOfficer = null,
  currentRankLevel = null,
}) {
  const activeLevel = currentRankLevel || currentOfficer?.points?.rankLevel || currentOfficer?.rankLevel || null;

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
          padding: 12,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 620,
            maxHeight: '90%',
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header Bar */}
          <View
            style={{
              backgroundColor: '#0F2A4A',
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>🎖️</Text>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang === 1
                    ? 'প্রোটোকল অফিসার ১০টি র‍্যাংক কাঠামো'
                    : 'Protocol Officer 10-Tier Rank System'}
                </Text>
              </View>
              <Text style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 3 }}>
                {lang === 1
                  ? 'অর্জিত পয়েন্ট ও পারফরম্যান্সের ভিত্তিতে অফিসিয়াল পদমর্যাদা'
                  : 'Official Rank Progression based on Earned Points & Performance'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Points Formula Overview Box */}
          <View
            style={{
              backgroundColor: '#F8FAFC',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F2A4A', marginBottom: 4 }}>
              📊 {lang === 1 ? 'পয়েন্ট অর্জনের ৬টি প্রধান ফ্যাক্টর:' : 'Points Calculation Breakdown:'}
            </Text>
            <Text style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
              {lang === 1
                ? '• সম্পন্ন সার্ভিস (×১০)  • স্টার রেটিং (×১০০)  • সময়নিষ্ঠতা (×১০)\n• যাত্রী সন্তুষ্টি (×১০)  • ভেরিফাইড রিভিউ (×৫০)  • বিশেষ দক্ষতা (×৫০)'
                : '• Services Completed (×10)  • Star Rating (×100)  • Punctuality (×10)\n• Passenger Satisfaction (×10)  • Verified Reviews (×50)  • Skills (×50)'}
            </Text>
          </View>

          {/* Ranks Ladder Scroll */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {PROTOCOL_OFFICER_RANKS.map(rank => {
              const isCurrent = activeLevel === rank.rankLevel;
              return (
                <View
                  key={rank.rankId}
                  style={{
                    backgroundColor: isCurrent ? rank.bgColor : '#FFFFFF',
                    borderRadius: 14,
                    borderWidth: isCurrent ? 2 : 1,
                    borderColor: isCurrent ? rank.color : '#E2E8F0',
                    padding: 14,
                    position: 'relative',
                    shadowColor: rank.color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isCurrent ? 0.15 : 0.04,
                    shadowRadius: 6,
                    elevation: isCurrent ? 3 : 1,
                  }}
                >
                  {isCurrent && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -9,
                        right: 14,
                        backgroundColor: rank.color,
                        paddingHorizontal: 9,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                        ✓ {lang === 1 ? 'বর্তমান র‍্যাংক' : 'Current Rank'}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Left: Rank Badge Icon & Name */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: rank.bgColor,
                          borderWidth: 1.5,
                          borderColor: rank.borderColor,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>{rank.badgeIcon}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <View
                            style={{
                              backgroundColor: rank.color,
                              paddingHorizontal: 6,
                              paddingVertical: 1.5,
                              borderRadius: 5,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>
                              {lang === 1 ? `র‍্যাংক ${rank.rankLevel}` : `Rank ${rank.rankLevel}`}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                            {lang === 1 ? rank.nameBn : rank.nameEn}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          {lang === 1 ? rank.nameEn : rank.nameBn}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Points Bracket Chip */}
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <View
                        style={{
                          backgroundColor: rank.bgColor,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: rank.borderColor,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '900', color: rank.color }}>
                          {rank.maxPoints
                            ? `${rank.minPoints.toLocaleString()} - ${rank.maxPoints.toLocaleString()}`
                            : `${rank.minPoints.toLocaleString()}+`} {lang === 1 ? 'পয়েন্ট' : 'pts'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#EAB308', marginTop: 3 }}>
                        {'★'.repeat(Math.floor(rank.stars))}
                        {rank.stars % 1 !== 0 ? '½' : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Perks / Duty Responsibilities */}
                  <View
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: isCurrent ? 'rgba(0,0,0,0.06)' : '#F1F5F9',
                    }}
                  >
                    <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                      <Text style={{ fontWeight: '700', color: rank.color }}>
                        {lang === 1 ? 'দায়িত্ব ও সুবিধা: ' : 'Responsibilities: '}
                      </Text>
                      {lang === 1 ? rank.perksBn : rank.perksEn}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer Close Button */}
          <View
            style={{
              padding: 14,
              borderTopWidth: 1,
              borderTopColor: '#E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#0F2A4A',
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                {lang === 1 ? 'বন্ধ করুন' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

