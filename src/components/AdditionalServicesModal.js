import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { ADDONS, ADDON_ASSETS, getAddonAsset } from '../constants/data';
import { CheckBadge } from './Icons';
import VisaOnArrivalUploadSection from './VisaOnArrivalUploadSection';
import { validateVisaOnArrivalDocs } from '../utils/helpers';

export default function AdditionalServicesModal({
  visible,
  onClose,
  lang = 0,
  selectedAddons = [],
  setSelectedAddons,
  addonDetails = {},
  setAddonDetails,
  onProceedBooking,
  flightNumber = '',
  serviceDate = '',
}) {
  const isBn = lang === 1;
  const { width: winWidth } = useWindowDimensions();
  const isWideModal = winWidth >= 520;

  // Local draft state so user can select/tweak before applying
  const [localSelected, setLocalSelected] = useState(selectedAddons || []);
  const [localDetails, setLocalDetails] = useState(addonDetails || {});
  const [hoveredCardId, setHoveredCardId] = useState(null);

  useEffect(() => {
    if (visible) {
      setLocalSelected(selectedAddons || []);
      setLocalDetails(addonDetails || {});
    }
  }, [visible, selectedAddons, addonDetails]);

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

  // Calculate Subtotal for local selections
  const calculateSubtotal = () => {
    let fixedTotal = 0;
    let hasQuote = false;

    localSelected.forEach(id => {
      const item = ADDONS.find(a => a.id === id);
      if (!item) return;

      if (id === 'wrap') {
        const bags = Math.max(1, Number(localDetails.wrap?.bags || 1));
        fixedTotal += (item.p || 400) * bags;
      } else if (id === 'wheel') {
        const count = Math.max(1, Number(localDetails.wheel?.count || 1));
        fixedTotal += (item.p || 300) * count;
      } else if (id === 'print') {
        const count = Math.max(1, Number(localDetails.print?.count || 1));
        fixedTotal += (item.p || 100) * count;
      } else if (id === 'photocopy') {
        const count = Math.max(1, Number(localDetails.photocopy?.count || 1));
        fixedTotal += (item.p || 50) * count;
      } else if (id === 'visa' || id === 'visa_on_arrival') {
        const count = Math.max(1, Number(localDetails.visa?.count || localDetails.visa_on_arrival?.count || 1));
        fixedTotal += (item.p || 1500) * count;
      } else if (item.p != null) {
        fixedTotal += item.p;
      } else {
        hasQuote = true;
      }
    });

    return { fixedTotal, hasQuote };
  };

  const { fixedTotal, hasQuote } = calculateSubtotal();

  const handleSaveAndClose = () => {
    if (setSelectedAddons) setSelectedAddons(localSelected);
    if (setAddonDetails) setAddonDetails(localDetails);
    onClose();
  };

  const handleProceed = () => {
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
    onClose();
    if (onProceedBooking) {
      onProceedBooking(localSelected, localDetails);
    }
  };

  const handleOnlyAdditionalServices = () => {
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
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(
          isBn
            ? 'অনুগ্রহ করে প্রথমে অন্তত একটি অতিরিক্ত সার্ভিস নির্বাচন করুন।'
            : 'Please select at least one additional service first.'
        );
      } else {
        Alert.alert(
          isBn ? 'সার্ভিস নির্বাচন করুন' : 'Select Services',
          isBn
            ? 'অনুগ্রহ করে প্রথমে অন্তত একটি অতিরিক্ত সার্ভিস নির্বাচন করুন।'
            : 'Please select at least one additional service first.'
        );
      }
      return;
    }
    if (setSelectedAddons) setSelectedAddons(localSelected);
    if (setAddonDetails) setAddonDetails(localDetails);
    onClose();
    if (onProceedBooking) {
      onProceedBooking(localSelected, localDetails, { onlyAddons: true });
    }
  };

  const handleClearAll = () => {
    setLocalSelected([]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Image
                source={require('../../assets/pkg_additional.webp')}
                style={{ width: 28, height: 28, resizeMode: 'contain' }}
              />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.title}>
                  {isBn ? 'অতিরিক্ত সেবাসমূহ' : 'Additional Services'}
                </Text>
                {localSelected.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{localSelected.length}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.subtitle}>
                {isBn
                  ? 'আপনার পছন্দসই সেবা নির্বাচন করে সরাসরি বুকিং করুন'
                  : 'Select your needed services and book with your flight'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Service Items List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            style={{ maxHeight: 460 }}
          >
            {ADDONS.map(addon => {
              const isSelected = localSelected.includes(addon.id);
              const isHovered = hoveredCardId === addon.id;
              const assetImage = addon.image || getAddonAsset(addon.id);

              return (
                <View
                  key={addon.id}
                  // @ts-ignore
                  onMouseEnter={() => setHoveredCardId(addon.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  style={[
                    styles.serviceCard,
                    isSelected && styles.serviceCardActive,
                    Platform.OS === 'web' && isHovered && {
                      borderColor: '#0284C7',
                      transform: 'translateY(-3px) scale(1.02)',
                      boxShadow: '0 12px 20px -3px rgba(2, 132, 199, 0.18)',
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleService(addon.id)}
                    style={styles.serviceRow}
                  >
                    {/* Icon Asset from assets/ */}
                    <View
                      style={[
                        styles.iconContainer,
                        isSelected && styles.iconContainerActive,
                        Platform.OS === 'web' && isHovered && {
                          backgroundColor: '#BAE6FD',
                          borderColor: '#0284C7',
                          transform: 'scale(1.18) rotate(-7deg)',
                        },
                      ]}
                    >
                      {assetImage ? (
                        <Image
                          source={assetImage}
                          style={styles.serviceImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={{ fontSize: 24 }}>{addon.ic || '✨'}</Text>
                      )}
                    </View>

                    {/* Service Name & Description */}
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.serviceName, (isSelected || isHovered) && styles.serviceNameActive]}>
                        {addon.n[lang] || addon.n[0]}
                      </Text>
                      <Text
                        style={[styles.serviceDesc, isHovered && { color: '#334155' }]}
                        numberOfLines={isHovered ? undefined : 2}
                      >
                        {addon.d[lang] || addon.d[0]}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Text style={[styles.priceTag, (isSelected || isHovered) && styles.priceTagActive]}>
                          {addon.p != null
                            ? `${addon.p} ${isBn ? 'টাকা' : 'Tk'}${addon.priceUnit === 'bag' ? ` / ${isBn ? 'ব্যাগ' : 'bag'}` : addon.priceUnit === 'person' ? ` / ${isBn ? 'জন' : 'person'}` : ''}`
                            : isBn
                            ? 'অনুরোধ সাপেক্ষে'
                            : 'On Request'}
                        </Text>
                      </View>
                    </View>

                    {/* Toggle / Add Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => toggleService(addon.id)}
                      style={[
                        styles.toggleBtn,
                        isSelected && styles.toggleBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleBtnText,
                          isSelected && styles.toggleBtnTextActive,
                        ]}
                      >
                        {isSelected
                          ? isBn
                            ? '✓ যুক্ত হয়েছে'
                            : '✓ Added'
                          : isBn
                          ? '+ যোগ করুন'
                          : '+ Add'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* Quantity & Extra Options for selected services */}
                  {isSelected && addon.id === 'wrap' && (
                    <View style={styles.subOptionBox}>
                      <Text style={styles.subOptionLabel}>
                        {isBn ? 'ব্যাগের সংখ্যা:' : 'Luggage bags:'}
                      </Text>
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity
                          onPress={() => updateQuantity('wrap', 'bags', -1, 1, 10)}
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>
                          {localDetails.wrap?.bags || 1} {isBn ? 'টি' : 'bag(s)'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => updateQuantity('wrap', 'bags', 1, 1, 10)}
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.subOptionCost}>
                        = {(Number(localDetails.wrap?.bags || 1) * 400)} {isBn ? 'টাকা' : 'Tk'}
                      </Text>
                    </View>
                  )}

                  {isSelected && addon.id === 'wheel' && (
                    <View style={styles.subOptionBox}>
                      <Text style={styles.subOptionLabel}>
                        {isBn ? 'হুইলচেয়ার প্রয়োজন:' : 'Wheelchair pax:'}
                      </Text>
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity
                          onPress={() => updateQuantity('wheel', 'count', -1, 1, 5)}
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>
                          {localDetails.wheel?.count || 1} {isBn ? 'জন' : 'pax'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => updateQuantity('wheel', 'count', 1, 1, 5)}
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.subOptionCost}>
                        = {(Number(localDetails.wheel?.count || 1) * 300)} {isBn ? 'টাকা' : 'Tk'}
                      </Text>
                    </View>
                  )}

                  {isSelected && addon.id === 'print' && (
                    <View style={styles.subOptionBox}>
                      <Text style={styles.subOptionLabel}>
                        {isBn ? 'ডকুমেন্ট প্রিন্ট সেট:' : 'Print sets:'}
                      </Text>
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity
                          onPress={() => updateQuantity('print', 'count', -1, 1, 10)}
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>
                          {localDetails.print?.count || 1} {isBn ? 'সেট' : 'set'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => updateQuantity('print', 'count', 1, 1, 10)}
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.subOptionCost}>
                        = {(Number(localDetails.print?.count || 1) * 100)} {isBn ? 'টাকা' : 'Tk'}
                      </Text>
                    </View>
                  )}

                  {isSelected && addon.id === 'photocopy' && (
                    <View style={styles.subOptionBox}>
                      <Text style={styles.subOptionLabel}>
                        {isBn ? 'ফটোকপি কপি/সেট:' : 'Photocopy sets:'}
                      </Text>
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity
                          onPress={() => updateQuantity('photocopy', 'count', -1, 1, 20)}
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>
                          {localDetails.photocopy?.count || 1} {isBn ? 'কপি' : 'copy'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => updateQuantity('photocopy', 'count', 1, 1, 20)}
                          style={styles.stepperBtn}
                        >
                          <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.subOptionCost}>
                        = {(Number(localDetails.photocopy?.count || 1) * 50)} {isBn ? 'টাকা' : 'Tk'}
                      </Text>
                    </View>
                  )}

                  {isSelected && addon.id === 'transfer' && (
                    <View style={[styles.subOptionBox, { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
                      <Text style={styles.subOptionLabel}>
                        {isBn ? 'গাড়ির ধরন নির্বাচন করুন:' : 'Select Vehicle Category:'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        {[
                          { id: 'sedan', label: isBn ? 'সেডান (১-৩ জন)' : 'Sedan (1-3 Pax)' },
                          { id: 'suv', label: isBn ? 'SUV (৪-৫ জন)' : 'SUV (4-5 Pax)' },
                          { id: 'microbus', label: isBn ? 'মাইক্রোবাস (৬-১০ জন)' : 'Microbus (6-10)' },
                        ].map(veh => {
                          const isVehSel = (localDetails.transfer?.vehicle_category || 'sedan') === veh.id;
                          return (
                            <TouchableOpacity
                              key={veh.id}
                              onPress={() => updateVehicleCategory(veh.id)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                                backgroundColor: isVehSel ? '#0284C7' : '#E2E8F0',
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '700', color: isVehSel ? '#FFFFFF' : '#334155' }}>
                                {veh.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Summary & Booking Action Bar */}
          <View style={styles.footer}>
            <View style={styles.summaryBar}>
              <View>
                <Text style={styles.summaryCount}>
                  {isBn
                    ? `নির্বাচিত সেবা: ${localSelected.length}টি`
                    : `Selected: ${localSelected.length} service(s)`}
                </Text>
                <Text style={styles.summaryTotal}>
                  {isBn ? 'অতিরিক্ত খরচ: ' : 'Add-on Total: '}
                  <Text style={{ fontWeight: '800', color: '#0284C7' }}>
                    {fixedTotal > 0 ? `৳ ${fixedTotal}` : '৳ ০'}
                  </Text>
                  {hasQuote && (
                    <Text style={{ fontSize: 11.5, color: '#D97706', fontWeight: '600' }}>
                      {fixedTotal > 0 ? (isBn ? ' + অনুরোধ সাপেক্ষে' : ' + On Request') : (isBn ? ' (অনুরোধ সাপেক্ষে)' : ' (On Request)')}
                    </Text>
                  )}
                </Text>
              </View>

              {localSelected.length > 0 && (
                <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>
                    {isBn ? 'সব মুছুন' : 'Clear all'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Action Buttons */}
            <View style={[styles.actionBtnRow, { flexDirection: isWideModal ? 'row' : 'column', gap: 8 }]}>
              {/* Secondary Actions Row (or inline on wide screens) */}
              <View style={{ flexDirection: 'row', flex: isWideModal ? 2 : undefined, gap: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSaveAndClose}
                  style={styles.saveCloseBtn}
                >
                  <Text style={styles.saveCloseBtnText} numberOfLines={1}>
                    {isBn ? 'সংরক্ষণ ও বন্ধ' : 'Save & Close'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleOnlyAdditionalServices}
                  style={styles.onlyAddonsBtn}
                >
                  <Text style={styles.onlyAddonsBtnText} numberOfLines={1}>
                    {isBn ? 'শুধুমাত্র অতিরিক্ত সার্ভিস' : 'Only Additional Services'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleProceed}
                style={[styles.primaryBookBtn, isWideModal ? { flex: 1.35 } : { width: '100%' }]}
              >
                <Text style={styles.primaryBookBtnText} numberOfLines={1}>
                  {localSelected.length > 0
                    ? isBn
                      ? `বুকিংয়ে এগিয়ে যান (${localSelected.length}) →`
                      : `Proceed to Book (${localSelected.length}) →`
                    : isBn
                    ? 'এখনই বুক করুন →'
                    : 'Book Now →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxWidth: 500,
    width: '100%',
    maxHeight: '88%',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  title: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '800',
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    padding: 10,
    marginBottom: 10,
    transition: 'all 0.2s',
  },
  serviceCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  iconContainerActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  serviceImage: {
    width: 34,
    height: 34,
  },
  serviceName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceNameActive: {
    color: '#0369A1',
  },
  serviceDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  priceTag: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  priceTagActive: {
    color: '#0369A1',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  subOptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#BAE6FD',
    gap: 8,
  },
  subOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
  },
  stepperValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    paddingHorizontal: 8,
  },
  subOptionCost: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    marginLeft: 'auto',
  },
  footer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  summaryCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryTotal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 1,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveCloseBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  saveCloseBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  onlyAddonsBtn: {
    flex: 1.35,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  onlyAddonsBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  primaryBookBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryBookBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

