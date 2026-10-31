import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { ADDONS, ADDON_ASSETS, getAddonAsset } from '../../constants/data';
import ScreenHeaderBar from '../../components/ScreenHeaderBar';
import { CheckBadge } from '../../components/Icons';
import VisaOnArrivalUploadSection from '../../components/VisaOnArrivalUploadSection';
import { validateVisaOnArrivalDocs } from '../../utils/helpers';

export default function AdditionalServicesScreen({
  lang = 1,
  selectedAddons = [],
  setSelectedAddons,
  addonDetails = {},
  setAddonDetails,
  onProceedBooking,
  flightNumber = '',
  serviceDate = '',
  onBack,
  pagePadding = 16,
  responsive = {},
}) {
  const isBn = lang === 1;
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 768 || Boolean(responsive?.isWide);

  const [localSelected, setLocalSelected] = useState(selectedAddons || []);
  const [localDetails, setLocalDetails] = useState(addonDetails || {});
  const [hoveredCardId, setHoveredCardId] = useState(null);

  const toggleService = id => {
    setLocalSelected(prev => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const updateQuantity = (id, field, delta, min = 1, max = 20) => {
    setLocalDetails(prev => {
      const currentVal = Number(prev[id]?.[field] || 1);
      const newVal = Math.max(min, Math.min(max, currentVal + delta));
      return {
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          [field]: newVal,
        },
      };
    });
  };

  const updateVehicleCategory = category => {
    setLocalDetails(prev => ({
      ...prev,
      transfer: {
        ...(prev.transfer || {}),
        vehicle_category: category,
      },
    }));
  };

  const handleApplyAndBack = () => {
    if (setSelectedAddons) setSelectedAddons(localSelected);
    if (setAddonDetails) setAddonDetails(localDetails);
    if (onBack) onBack();
  };

  const handleBookNow = () => {
    if (localSelected.includes('visa') || localSelected.includes('visa_on_arrival')) {
      const { isValid, missing } = validateVisaOnArrivalDocs(localDetails);
      if (!isValid) {
        const msg = isBn
          ? `অন-অ্যারাইভাল ভিসা সুবিধার জন্য ৪টি আবশ্যক ডকুমেন্ট সংযুক্ত করা বাধ্যতামূলক:\n\n• ${missing.map(m => m.labelBn).join('\n• ')}\n\nঅনুগ্রহ করে সবকটি ডকুমেন্ট আপলোড করে সম্পন্ন করুন।`
          : `All 4 mandatory documents are required for Visa On Arrival:\n\n• ${missing.map(m => m.labelEn).join('\n• ')}\n\nPlease attach all required documents to proceed.`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert(isBn ? 'আবশ্যক ডকুমেন্ট সংযুক্ত করুন' : 'Mandatory Documents Required', msg);
        }
        return;
      }
    }
    if (setSelectedAddons) setSelectedAddons(localSelected);
    if (setAddonDetails) setAddonDetails(localDetails);
    if (onProceedBooking) {
      onProceedBooking(localSelected, localDetails);
    } else if (onBack) {
      onBack();
    }
  };

  const handleTakeOnlyAdditionalService = () => {
    if (localSelected.includes('visa') || localSelected.includes('visa_on_arrival')) {
      const { isValid, missing } = validateVisaOnArrivalDocs(localDetails);
      if (!isValid) {
        const msg = isBn
          ? `অন-অ্যারাইভাল ভিসা সুবিধার জন্য ৪টি আবশ্যক ডকুমেন্ট সংযুক্ত করা বাধ্যতামূলক:\n\n• ${missing.map(m => m.labelBn).join('\n• ')}\n\nঅনুগ্রহ করে সবকটি ডকুমেন্ট আপলোড করে সম্পন্ন করুন।`
          : `All 4 mandatory documents are required for Visa On Arrival:\n\n• ${missing.map(m => m.labelEn).join('\n• ')}\n\nPlease attach all required documents to proceed.`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert(isBn ? 'আবশ্যক ডকুমেন্ট সংযুক্ত করুন' : 'Mandatory Documents Required', msg);
        }
        return;
      }
    }
    if (localSelected.length === 0) {
      const msg = isBn
        ? 'অনুগ্রহ করে প্রথমে অন্তত একটি অতিরিক্ত সার্ভিস নির্বাচন করুন।'
        : 'Please select at least one additional service first.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert(isBn ? 'সার্ভিস নির্বাচন করুন' : 'Select Service', msg);
      }
      return;
    }
    if (setSelectedAddons) setSelectedAddons(localSelected);
    if (setAddonDetails) setAddonDetails(localDetails);
    if (onProceedBooking) {
      onProceedBooking(localSelected, localDetails, { onlyAddons: true });
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Universal Back Navigation Bar */}
      <View style={{ paddingHorizontal: pagePadding, paddingTop: 10 }}>
        <ScreenHeaderBar
          title={isBn ? 'অতিরিক্ত সার্ভিসসমূহ' : 'Additional Airport Services'}
          subtitle={
            isBn
              ? 'আপনার প্রয়োজন অনুযায়ী যেকোনো বিশেষ সেবা বুক করুন'
              : 'Select any special assistance service to add to your booking'
          }
          onBack={handleApplyAndBack}
          lang={lang}
          backLabel={isBn ? 'ফিরে যান' : 'Back'}
          showHome={true}
          onHome={handleApplyAndBack}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: pagePadding,
          paddingBottom: isWide ? 110 : 160,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Card */}
        <View
          style={{
            backgroundColor: '#F0F9FF',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1.5,
            borderColor: '#BAE6FD',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#BAE6FD',
            }}
          >
            <Image
              source={require('../../../assets/pkg_additional.webp')}
              style={{ width: 36, height: 36, resizeMode: 'contain' }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0369A1' }}>
              {isBn ? 'প্রয়োজনীয় অতিরিক্ত সুবিধাসমূহ' : 'Essential Assistance Services'}
            </Text>
            <Text style={{ fontSize: 12.5, color: '#475569', marginTop: 2, lineHeight: 18 }}>
              {isBn
                ? 'হুইলচেয়ার, লাগেজ র‍্যাপিং, গাড়ি ভাড়া, ভিসা ও ফটোকপিসহ সব ধরনের সেবা এক ক্লিকে বুক করুন'
                : 'Wheelchair, luggage wrapping, car rental, visa support & print services in 1-tap'}
            </Text>
          </View>
        </View>

        {/* Counter Pill */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
            {isBn
              ? `মোট ${ADDONS.length}টি বিশেষ সেবা উপলব্ধ`
              : `${ADDONS.length} Specialized Services Available`}
          </Text>
          <View
            style={{
              backgroundColor: localSelected.length > 0 ? '#0284C7' : '#E2E8F0',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: localSelected.length > 0 ? '#FFFFFF' : '#64748B',
              }}
            >
              {isBn
                ? `${localSelected.length}টি সার্ভিস নির্বাচিত`
                : `${localSelected.length} Selected`}
            </Text>
          </View>
        </View>

        {/* 8 Additional Service Cards */}
        <View style={{ gap: 12 }}>
          {ADDONS.map(addon => {
            const isSelected = localSelected.includes(addon.id);
            const isHovered = hoveredCardId === addon.id;
            const assetSource = getAddonAsset(addon.id);

            return (
              <TouchableOpacity
                key={addon.id}
                activeOpacity={0.88}
                onPress={() => toggleService(addon.id)}
                // @ts-ignore
                onMouseEnter={() => setHoveredCardId(addon.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                style={{
                  backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: isSelected ? '#0284C7' : (isHovered ? '#0284C7' : '#E2E8F0'),
                  padding: 14,
                  shadowColor: isSelected ? '#0284C7' : '#0F172A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isSelected ? 0.12 : (isHovered ? 0.15 : 0.04),
                  shadowRadius: isHovered ? 12 : 6,
                  elevation: isHovered ? 4 : 2,
                  ...(Platform.OS === 'web'
                    ? {
                        cursor: 'pointer',
                        transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
                        boxShadow: isHovered
                          ? '0 16px 24px -4px rgba(2, 132, 199, 0.2), 0 6px 10px -4px rgba(2, 132, 199, 0.1)'
                          : 'none',
                      }
                    : {}),
                }}
              >
                {/* Header Row: Icon, Title, Checkbox, Price */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 14,
                      backgroundColor: isHovered ? '#BAE6FD' : (isSelected ? '#E0F2FE' : '#F1F5F9'),
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: isHovered ? '#0284C7' : (isSelected ? '#BAE6FD' : '#E2E8F0'),
                      ...(Platform.OS === 'web'
                        ? {
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            transform: isHovered ? 'scale(1.18) rotate(-7deg)' : 'scale(1) rotate(0deg)',
                          }
                        : {}),
                    }}
                  >
                    {assetSource ? (
                      <Image
                        source={assetSource}
                        style={{ width: 40, height: 40, resizeMode: 'contain' }}
                      />
                    ) : (
                      <Text style={{ fontSize: 28 }}>{addon.icon || '✨'}</Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          fontSize: 15.5,
                          fontWeight: '800',
                          color: (isSelected || isHovered) ? '#0284C7' : '#0F172A',
                        }}
                      >
                        {isBn ? addon.n[1] : addon.n[0]}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 12.5,
                        color: isHovered ? '#334155' : '#64748B',
                        marginTop: 2,
                        lineHeight: 18,
                      }}
                      numberOfLines={isHovered ? undefined : 2}
                    >
                      {isBn ? addon.d[1] : addon.d[0]}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '800',
                        color: addon.p != null ? '#0284C7' : '#D97706',
                      }}
                    >
                      {addon.p != null
                        ? `৳${addon.p}`
                        : isBn
                        ? 'অনুরোধে'
                        : 'On Request'}
                    </Text>
                    {addon.priceUnit && (
                      <Text style={{ fontSize: 10, color: '#94A3B8' }}>
                        {addon.priceUnit}
                      </Text>
                    )}

                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isSelected ? '#0284C7' : '#CBD5E1',
                        backgroundColor: isSelected ? '#0284C7' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 6,
                      }}
                    >
                      {isSelected && (
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontWeight: '900',
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Interactive Customization Controls when Selected */}
                {isSelected && (
                  <View
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: '#F1F5F9',
                    }}
                  >
                    {/* 1. Luggage Wrapping Bag Counter */}
                    {addon.id === 'wrap' && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#F8FAFC',
                          padding: 10,
                          borderRadius: 10,
                        }}
                      >
                        <Text
                          style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}
                        >
                          🎒 {isBn ? 'লাগেজের সংখ্যা:' : 'Number of Bags:'}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => updateQuantity('wrap', 'bags', -1, 1, 10)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: '#E2E8F0',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: '800',
                                color: '#0F172A',
                              }}
                            >
                              -
                            </Text>
                          </TouchableOpacity>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: '800',
                              color: '#0284C7',
                              minWidth: 20,
                              textAlign: 'center',
                            }}
                          >
                            {localDetails.wrap?.bags || 1}
                          </Text>
                          <TouchableOpacity
                            onPress={() => updateQuantity('wrap', 'bags', 1, 1, 10)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: '#0284C7',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: '800',
                                color: '#FFFFFF',
                              }}
                            >
                              +
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* 2. Wheelchair Assistance Count & Needs */}
                    {addon.id === 'wheel' && (
                      <View
                        style={{
                          backgroundColor: '#F8FAFC',
                          padding: 10,
                          borderRadius: 10,
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text
                            style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}
                          >
                            🦽 {isBn ? 'হুইলচেয়ারের সংখ্যা:' : 'Wheelchair count:'}
                          </Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 12,
                            }}
                          >
                            <TouchableOpacity
                              onPress={() => updateQuantity('wheel', 'count', -1, 1, 5)}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: '#E2E8F0',
                                alignItems: 'center',
                                justifyCenter: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 18,
                                  fontWeight: '800',
                                  color: '#0F172A',
                                  textAlign: 'center',
                                }}
                              >
                                -
                              </Text>
                            </TouchableOpacity>
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: '800',
                                color: '#0284C7',
                                minWidth: 20,
                                textAlign: 'center',
                              }}
                            >
                              {localDetails.wheel?.count || 1}
                            </Text>
                            <TouchableOpacity
                              onPress={() => updateQuantity('wheel', 'count', 1, 1, 5)}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: '#0284C7',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 18,
                                  fontWeight: '800',
                                  color: '#FFFFFF',
                                  textAlign: 'center',
                                }}
                              >
                                +
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <TextInput
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            fontSize: 12.5,
                            color: '#0F172A',
                          }}
                          placeholder={
                            isBn
                              ? 'রোগী/যাত্রীর শারীরিক অবস্থা বা নির্দেশনা (যদি থাকে)'
                              : 'Medical condition or specific instructions (optional)'
                          }
                          value={localDetails.wheel?.notes || ''}
                          onChangeText={notes =>
                            setLocalDetails(prev => ({
                              ...prev,
                              wheel: { ...(prev.wheel || {}), notes },
                            }))
                          }
                        />
                      </View>
                    )}

                    {/* 3. Rent a Car Vehicle Type Picker */}
                    {addon.id === 'transfer' && (
                      <View
                        style={{
                          backgroundColor: '#F8FAFC',
                          padding: 10,
                          borderRadius: 10,
                          gap: 6,
                        }}
                      >
                        <Text
                          style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}
                        >
                          🚘 {isBn ? 'গাড়ির ক্যাটাগরি:' : 'Vehicle Category:'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {[
                            { id: 'sedan', label: isBn ? 'সেডান' : 'Sedan' },
                            { id: 'suv', label: isBn ? 'এসইউভি' : 'SUV' },
                            { id: 'hiace', label: isBn ? 'হাইয়েস' : 'HiAce' },
                            { id: 'noah', label: isBn ? 'নোয়া' : 'Noah' },
                          ].map(v => {
                            const isVehicleActive =
                              (localDetails.transfer?.vehicle_category || 'sedan') ===
                              v.id;
                            return (
                              <TouchableOpacity
                                key={v.id}
                                onPress={() => updateVehicleCategory(v.id)}
                                style={{
                                  flex: 1,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  backgroundColor: isVehicleActive
                                    ? '#0284C7'
                                    : '#FFFFFF',
                                  borderWidth: 1,
                                  borderColor: isVehicleActive
                                    ? '#0284C7'
                                    : '#CBD5E1',
                                  alignItems: 'center',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: '700',
                                    color: isVehicleActive ? '#FFFFFF' : '#334155',
                                  }}
                                >
                                  {v.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* 4. Document Print & Photocopy Page Counter */}
                    {(addon.id === 'print' || addon.id === 'photocopy') && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#F8FAFC',
                          padding: 10,
                          borderRadius: 10,
                        }}
                      >
                        <Text
                          style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}
                        >
                          📄 {isBn ? 'পৃষ্ঠা সংখ্যা:' : 'Number of Pages:'}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => updateQuantity(addon.id, 'count', -1, 1, 50)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: '#E2E8F0',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: '800',
                                color: '#0F172A',
                                textAlign: 'center',
                              }}
                            >
                              -
                            </Text>
                          </TouchableOpacity>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: '800',
                              color: '#0284C7',
                              minWidth: 20,
                              textAlign: 'center',
                            }}
                          >
                            {localDetails[addon.id]?.count || 1}
                          </Text>
                          <TouchableOpacity
                            onPress={() => updateQuantity(addon.id, 'count', 1, 1, 50)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: '#0284C7',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: '800',
                                color: '#FFFFFF',
                                textAlign: 'center',
                              }}
                            >
                              +
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          paddingHorizontal: pagePadding,
          paddingVertical: 12,
          borderTopWidth: 1.5,
          borderTopColor: '#E2E8F0',
          ...(Platform.OS === 'web'
            ? { boxShadow: '0 -4px 18px rgba(15, 23, 42, 0.08)' }
            : { elevation: 8 }),
        }}
      >
        {isWide ? (
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            {/* Take Only Additional Service (Light Button, Small Text) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleTakeOnlyAdditionalService}
              style={{
                flex: 1,
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                borderWidth: 1,
                borderColor: '#CBD5E1',
              }}
            >
              <Text style={{ fontSize: 13 }}>✨</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569' }}>
                Take Only Additional Service
              </Text>
              {localSelected.length > 0 && (
                <View style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#334155' }}>
                    {localSelected.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Proceed to Book (Large Prominent Green Button, Big Text) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleBookNow}
              style={{
                flex: 1.5,
                backgroundColor: '#059669',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                borderWidth: 1,
                borderColor: '#047857',
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 }}>
                {isBn ? 'বুকিং এগিয়ে নিন →' : 'Proceed to Book →'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {/* Primary Large Prominent Green Button: Proceed to Book */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleBookNow}
              style={{
                width: '100%',
                backgroundColor: '#059669',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                borderWidth: 1,
                borderColor: '#047857',
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 }}>
                {isBn ? 'বুকিং এগিয়ে নিন →' : 'Proceed to Book →'}
              </Text>
            </TouchableOpacity>

            {/* Secondary Light Button: Take Only Additional Service (Small Text) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleTakeOnlyAdditionalService}
              style={{
                width: '100%',
                backgroundColor: '#F8FAFC',
                borderRadius: 10,
                paddingVertical: 9,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                borderWidth: 1,
                borderColor: '#CBD5E1',
              }}
            >
              <Text style={{ fontSize: 12 }}>✨</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569' }}>
                Take Only Additional Service
              </Text>
              {localSelected.length > 0 ? (
                <View style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#334155' }}>
                    {localSelected.length}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

