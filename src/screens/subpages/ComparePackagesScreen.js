import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { PKGS } from '../../constants/data';
import ScreenHeaderBar from '../../components/ScreenHeaderBar';
import { StandardPkgIcon, PremiumPkgIcon, VipPkgIcon } from '../../components/Icons';

export default function ComparePackagesScreen({
  lang = 1,
  selectedPackage = 'business',
  onSelectPackage,
  onBack,
  pagePadding = 16,
  navigateToSubPage,
}) {
  const isBn = lang === 1;
  const { width: winWidth } = useWindowDimensions();
  const isMobile = winWidth < 768;

  const handleChoose = pkgId => {
    if (onSelectPackage) onSelectPackage(pkgId);
    if (onBack) onBack();
  };

  const packageComparisonFeatures = [
    {
      icon: '👤',
      name: 'Meet & Greet at Gate / Terminal',
      nameBn: 'গেট বা টার্মিনালে স্বাগত ও গ্রহণ (Meet & Greet)',
      standard: true,
      premium: true,
      vip: true,
    },
    {
      icon: '🧳',
      name: 'Baggage Assistance & Handling',
      nameBn: 'ব্যাগেজ ট্রলি ও মালামাল পরিবহন সহায়তা',
      standard: true,
      premium: true,
      vip: true,
    },
    {
      icon: '👮',
      name: 'Immigration & Customs Guidance',
      nameBn: 'ইমিগ্রেশন ও কাস্টমস দিকনির্দেশনা ও সহায়তা',
      standard: false,
      premium: true,
      vip: true,
    },
    {
      icon: '📋',
      name: 'Check-in & Boarding Pass Assistance',
      nameBn: 'এয়ারলাইন চেক-ইন ও বোর্ডিং পাস সহায়তা',
      standard: true,
      premium: true,
      vip: true,
    },
    {
      icon: '⏩',
      name: 'Fast-track Priority Clearance',
      nameBn: 'ফাস্ট-ট্র্যাক অগ্রাধিকার ক্লিয়ারেন্স',
      standard: false,
      premium: true,
      vip: true,
    },
    {
      icon: '👮',
      name: 'Dedicated 1-on-1 Protocol Officer',
      nameBn: 'নির্ধারিত ১-জন ডেডিকেটেড প্রোটোকল অফিসার',
      standard: false,
      premium: true,
      vip: true,
    },
    {
      icon: '✈️',
      name: 'VIP Protocol up to Boarding Bridge / Aerobridge',
      nameBn: 'বোর্ডিং ব্রিজ / এরোব্রিজ পর্যন্ত ভিআইপি প্রোটোকল সহায়তা',
      standard: false,
      premium: false,
      vip: true,
    },
    {
      icon: '📍',
      name: 'Live Real-time GPS Radar Tracking',
      nameBn: 'লাইভ রিয়েল-টাইম জিপিএস ও রাডার ট্র্যাকিং',
      standard: true,
      premium: true,
      vip: true,
    },
    {
      icon: '🎖️',
      name: 'Highest VIP Protocol Priority',
      nameBn: 'সর্বোচ্চ ভিআইপি প্রোটোকল অগ্রাধিকার',
      standard: false,
      premium: false,
      vip: true,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Universal Back Navigation Bar */}
      <View style={{ paddingHorizontal: pagePadding, paddingTop: 10 }}>
        <ScreenHeaderBar
          title={isBn ? 'প্যাকেজ সমূহের তুলনা' : 'Compare Service Packages'}
          subtitle={
            isBn
              ? 'আপনার প্রয়োজন অনুযায়ী সেরা প্যাকেজটি বেছে নিন'
              : 'Choose the best airport assistance package for your travel needs'
          }
          onBack={onBack}
          lang={lang}
          backLabel={isBn ? 'ফিরে যান' : 'Back'}
          showHome={true}
          onHome={onBack}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: pagePadding,
          paddingBottom: 40,
          maxWidth: 1140,
          width: '100%',
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Package Summary Cards Row */}
        <View style={{ gap: 14, marginBottom: 24 }}>
          {PKGS.map(pkg => {
            const isCurrent = selectedPackage === pkg.id;
            const isPopular = pkg.id === 'business';
            const isVip = pkg.id === 'first';

            const scopeText =
              pkg.id === 'economy'
                ? (isBn ? '(বোর্ডিং পাস পর্যন্ত)' : '(Up to Boarding Pass)')
                : pkg.id === 'business'
                ? (isBn ? '(ইমিগ্রেশন পর্যন্ত)' : '(Up to Immigration)')
                : (isBn ? '(বোর্ডিং ব্রিজ / এরোব্রিজ পর্যন্ত)' : '(Up to Boarding Bridge / Aerobridge)');

            return (
              <View
                key={pkg.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  padding: 16,
                  borderWidth: 2,
                  borderColor: isCurrent
                    ? '#0284C7'
                    : isPopular
                    ? '#93C5FD'
                    : '#E2E8F0',
                  shadowColor: isCurrent ? '#0284C7' : '#0F172A',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: isCurrent ? 0.1 : 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                      {pkg.id === 'economy' && <StandardPkgIcon size={34} color="#0284C7" />}
                      {pkg.id === 'business' && <PremiumPkgIcon size={34} color="#2563EB" />}
                      {pkg.id === 'first' && <VipPkgIcon size={34} color="#D97706" />}
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                          {isBn ? pkg.n[1] : pkg.n[0]}
                        </Text>

                        {/* Scope Limit Tag matching Image 2 */}
                        <View
                          style={{
                            backgroundColor:
                              pkg.id === 'economy'
                                ? '#EAF8F1'
                                : pkg.id === 'business'
                                ? '#EBF5FB'
                                : '#FEF9E7',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor:
                              pkg.id === 'economy'
                                ? '#00875A'
                                : pkg.id === 'business'
                                ? '#0065B3'
                                : '#C87D00',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color:
                                pkg.id === 'economy'
                                  ? '#00875A'
                                  : pkg.id === 'business'
                                  ? '#0065B3'
                                  : '#C87D00',
                            }}
                          >
                            {scopeText}
                          </Text>
                        </View>

                        {isPopular && (
                          <View
                            style={{
                              backgroundColor: '#E0F2FE',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 12,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '800',
                                color: '#0284C7',
                              }}
                            >
                              ★ {isBn ? 'জনপ্রিয়' : 'Popular'}
                            </Text>
                          </View>
                        )}
                        {isVip && (
                          <View
                            style={{
                              backgroundColor: '#FEF3C7',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 12,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '800',
                                color: '#D97706',
                              }}
                            >
                              💎 {isBn ? 'ভিআইপি' : 'VIP'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 3 }}>
                        {isBn ? pkg.d[1] : pkg.d[0]}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', flexShrink: 0, paddingLeft: 10 }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#0284C7' }}>
                      ৳{pkg.p}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                      {isBn ? 'প্রতি যাত্রী' : 'per passenger'}
                    </Text>
                  </View>
                </View>

                {/* Select Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleChoose(pkg.id)}
                  style={{
                    backgroundColor: isCurrent ? '#059669' : '#0284C7',
                    paddingVertical: 11,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 4,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                    {isCurrent
                      ? (isBn ? '✓ বর্তমানে নির্বাচিত' : '✓ Currently Selected')
                      : (isBn ? 'এই প্যাকেজটি বেছে নিন' : 'Select This Package')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Feature Comparison Table matching Image 2 */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#CBD5E1',
            overflow: 'hidden',
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <ScrollView horizontal={isMobile} showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: isMobile ? 650 : '100%', width: '100%' }}>
              {/* Header Row: Standard (Green), Premium (Blue), VIP (Gold) */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'stretch',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {/* Left Title Cell */}
                <View
                  style={{
                    flex: 2.6,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 24, marginRight: 2 }}>📊</Text>
                    <View>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: '900',
                          color: '#0F172A',
                          letterSpacing: -0.2,
                        }}
                      >
                        {isBn ? 'প্যাকেজ অনুযায়ী সেবা বিবরণ' : 'Package Feature Breakdown'}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontWeight: '700',
                          color: '#64748B',
                          marginTop: 2,
                        }}
                      >
                        {isBn ? 'সব সুবিধা ও প্যাকেজের তুলনা' : 'Compare all benefits and features'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Standard Header (Green) */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#00875A',
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    marginHorizontal: 1,
                  }}
                >
                  <StandardPkgIcon size={24} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900', textAlign: 'center', marginTop: 4 }}>
                    {isBn ? 'স্ট্যান্ডার্ড' : 'Standard'}
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: 11.5, fontWeight: '600', marginTop: 2, textAlign: 'center' }}>
                    {isBn ? '(বোর্ডিং পাস পর্যন্ত)' : '(Up to Boarding Pass)'}
                  </Text>
                </View>

                {/* Premium Header (Blue) */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#0065B3',
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    marginHorizontal: 1,
                  }}
                >
                  <PremiumPkgIcon size={24} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900', textAlign: 'center', marginTop: 4 }}>
                    {isBn ? 'প্রিমিয়াম' : 'Premium'}
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: 11.5, fontWeight: '600', marginTop: 2, textAlign: 'center' }}>
                    {isBn ? '(ইমিগ্রেশন পর্যন্ত)' : '(Up to Immigration)'}
                  </Text>
                </View>

                {/* VIP Header (Gold) */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#C87D00',
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    marginHorizontal: 1,
                  }}
                >
                  <VipPkgIcon size={24} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900', textAlign: 'center', marginTop: 4 }}>
                    {isBn ? 'ভিআইপি' : 'VIP'}
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: 11.5, fontWeight: '600', marginTop: 2, textAlign: 'center' }}>
                    {isBn ? '(বোর্ডিং ব্রিজ / এরোব্রিজ পর্যন্ত)' : '(Up to Boarding Bridge / Aerobridge)'}
                  </Text>
                </View>
              </View>

              {/* Price / Sub-header Row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderBottomWidth: 1.5,
                  borderBottomColor: '#E2E8F0',
                  borderTopWidth: 1,
                  borderTopColor: '#F1F5F9',
                }}
              >
                <View
                  style={{
                    flex: 2.6,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#64748B' }}>
                    {isBn ? 'সেবা / সুবিধা' : 'Feature / Service'}
                  </Text>
                </View>

                {/* Standard Price */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#EAF8F1',
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderLeftWidth: 1,
                    borderLeftColor: '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#00875A' }}>
                    500 Tk
                  </Text>
                </View>

                {/* Premium Price */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#EBF5FB',
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderLeftWidth: 1,
                    borderLeftColor: '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#0065B3' }}>
                    1000 Tk
                  </Text>
                </View>

                {/* VIP Price */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FEF9E7',
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderLeftWidth: 1,
                    borderLeftColor: '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#C87D00' }}>
                    1500 Tk
                  </Text>
                </View>
              </View>

              {/* Table Data Rows */}
              {packageComparisonFeatures.map((row, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderBottomWidth: idx === packageComparisonFeatures.length - 1 ? 0 : 1,
                    borderBottomColor: '#EEF2F6',
                    backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
                  }}
                >
                  {/* Left Column: Icon + Name */}
                  <View
                    style={{
                      flex: 2.6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 11,
                      paddingHorizontal: 16,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: '#F1F5F9',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{row.icon}</Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: '#1E293B',
                        flex: 1,
                        lineHeight: 18,
                      }}
                    >
                      {isBn ? row.nameBn : row.name}
                    </Text>
                  </View>

                  {/* Standard Column */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: '#F4FBF7',
                      paddingVertical: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderLeftWidth: 1,
                      borderLeftColor: '#E2E8F0',
                      alignSelf: 'stretch',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '900',
                        color: row.standard ? '#00875A' : '#94A3B8',
                      }}
                    >
                      {row.standard ? '✓' : '—'}
                    </Text>
                  </View>

                  {/* Premium Column */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: '#F5F9FD',
                      paddingVertical: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderLeftWidth: 1,
                      borderLeftColor: '#E2E8F0',
                      alignSelf: 'stretch',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '900',
                        color: row.premium ? '#00875A' : '#94A3B8',
                      }}
                    >
                      {row.premium ? '✓' : '—'}
                    </Text>
                  </View>

                  {/* VIP Column */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: '#FCFBF4',
                      paddingVertical: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderLeftWidth: 1,
                      borderLeftColor: '#E2E8F0',
                      alignSelf: 'stretch',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '900',
                        color: row.vip ? '#00875A' : '#94A3B8',
                      }}
                    >
                      {row.vip ? '✓' : '—'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Additional Services Card (Unified Brand Logo) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (navigateToSubPage) {
              navigateToSubPage('additional_services');
            } else if (onBack) {
              onBack();
            }
          }}
          style={{
            marginTop: 20,
            marginBottom: 20,
            backgroundColor: '#F0F9FF',
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: '#BAE6FD',
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#0284C7',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#BAE6FD',
              marginRight: 12,
            }}
          >
            <Image
              source={require('../../../assets/pkg_additional.webp')}
              style={{ width: 32, height: 32, resizeMode: 'contain' }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
              {isBn ? 'অতিরিক্ত সেবাসমূহ' : 'Additional services'}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              {isBn ? 'প্রয়োজনীয় অতিরিক্ত সহায়তা দেখুন ও বুক করুন' : 'Explore extra assistance & book'}
            </Text>
          </View>
          <Text style={{ fontSize: 18, color: '#0284C7', fontWeight: '800', marginLeft: 8 }}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
