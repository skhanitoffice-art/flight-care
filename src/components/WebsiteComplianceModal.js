import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';

export default function WebsiteComplianceModal({
  visible,
  onClose,
  initialTab = 'terms', // 'terms' | 'privacy' | 'refund' | 'about' | 'contact'
  lang = 0,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [currentLang, setCurrentLang] = useState(lang);
  const isBn = Boolean(currentLang);
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isMobile = winWidth < 600;

  useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  useEffect(() => {
    setCurrentLang(lang);
  }, [lang]);

  if (!visible) return null;

  const TABS = [
    { id: 'terms', icon: '📄', labelEn: 'Terms & Conditions', labelBn: 'শর্তাবলী' },
    { id: 'privacy', icon: '🛡️', labelEn: 'Privacy & Security', labelBn: 'প্রাইভেসি' },
    { id: 'refund', icon: '🔄', labelEn: 'Return & Refund', labelBn: 'রিফান্ড পলিসি' },
    { id: 'about', icon: '🏢', labelEn: 'About Us', labelBn: 'আমাদের সম্পর্কে' },
    { id: 'contact', icon: '📍', labelEn: 'Contact Us', labelBn: 'যোগাযোগ' },
  ];

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
          paddingHorizontal: isMobile ? 8 : 16,
          paddingVertical: isMobile ? 12 : 20,
          zIndex: 99999,
          width: '100%',
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: isMobile ? 14 : 20,
            width: '100%',
            maxWidth: Math.min(680, Math.max(280, winWidth - (isMobile ? 16 : 32))),
            maxHeight: Math.min(760, winHeight - (isMobile ? 24 : 40)),
            overflow: 'hidden',
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.4)',
            elevation: 12,
          }}
        >
          {/* Header Bar */}
          <View
            style={{
              backgroundColor: '#071A2E',
              paddingVertical: isMobile ? 10 : 14,
              paddingHorizontal: isMobile ? 12 : 18,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: '#1E293B',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: isMobile ? 8 : 10, flex: 1, minWidth: 0 }}>
              <View
                style={{
                  width: isMobile ? 30 : 36,
                  height: isMobile ? 30 : 36,
                  borderRadius: isMobile ? 15 : 18,
                  backgroundColor: '#0284C7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontSize: isMobile ? 15 : 18 }}>
                  {activeTab === 'terms' ? '📄' :
                   activeTab === 'privacy' ? '🛡️' :
                   activeTab === 'refund' ? '🔄' :
                   activeTab === 'about' ? '🏢' : '📍'}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ fontSize: isMobile ? 13 : 16, fontWeight: '800', color: '#FFFFFF' }}
                >
                  {activeTab === 'terms'
                    ? (isBn ? 'সেবার শর্তাবলী' : 'Terms & Conditions')
                    : activeTab === 'privacy'
                    ? (isBn ? 'গোপনীয়তা ও নিরাপত্তা' : 'Privacy & Security Policy')
                    : activeTab === 'refund'
                    ? (isBn ? 'রিফান্ড ও ক্যান্সেলেশন' : 'Return & Refund Policy')
                    : activeTab === 'about'
                    ? (isBn ? 'আমাদের সম্পর্কে' : 'About Us')
                    : (isBn ? 'যোগাযোগ ও নিবন্ধিত ঠিকানা' : 'Contact Us')}
                </Text>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ fontSize: isMobile ? 9.5 : 11, color: '#94A3B8' }}
                >
                  Flight Care Technologies Ltd.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Language toggle inside modal */}
              <TouchableOpacity
                onPress={() => setCurrentLang(c => (c === 0 ? 1 : 0))}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  paddingHorizontal: isMobile ? 6 : 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <Text style={{ fontSize: isMobile ? 10 : 11, fontWeight: '700', color: '#38BDF8' }}>
                  {isBn ? 'English' : 'বাংলা'}
                </Text>
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={{
                  width: isMobile ? 28 : 32,
                  height: isMobile ? 28 : 32,
                  borderRadius: isMobile ? 14 : 16,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: isMobile ? 14 : 16, color: '#FFFFFF', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Navigation Pill Tabs */}
          <View
            style={{
              backgroundColor: '#F8FAFC',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
            }}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {TABS.map(tab => {
                const isSelected = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor: isSelected ? '#0284C7' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#0284C7' : '#CBD5E1',
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>{tab.icon}</Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? '800' : '600',
                        color: isSelected ? '#FFFFFF' : '#475569',
                      }}
                    >
                      {isBn ? tab.labelBn : tab.labelEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Modal Content ScrollView */}
          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 22 }}>
            {/* TAB 1: TERMS & CONDITIONS */}
            {activeTab === 'terms' && (
              <View>
                <View style={{ backgroundColor: '#F0F9FF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 16 }}>
                  <Text style={{ fontSize: 12.5, color: '#0369A1', fontWeight: '700', lineHeight: 18 }}>
                    {isBn
                      ? 'স্বাগতম Flight Care Technologies Ltd. (www.flightcare.app)-এ। আমাদের বিমানবন্দর প্রোটোকল ও কনসিয়ার্জ সেবা গ্রহণের মাধ্যমে আপনি নিম্নবর্ণিত শর্তাবলীর সাথে একমত পোষণ করছেন।'
                      : 'Welcome to Flight Care Technologies Ltd. (www.flightcare.app). By booking our airport protocol and ground concierge services, you agree to be bound by these Terms and Conditions.'}
                  </Text>
                </View>

                <View style={{ gap: 14 }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      1. {isBn ? 'সংজ্ঞা ও পরিচিতি (Definitions)' : 'Definitions & Platform Scope'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      {isBn
                        ? '“ফ্লাইট কেয়ার” বা “Flight Care Technologies Ltd.” বলতে হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর (ঢাকা)-এ বেসামরিক বিমান চলাচল কর্তৃপক্ষ (CAAB) নিবন্ধিত প্রোটোকল ও প্যাসেঞ্জার অ্যাসিস্ট্যান্স সেবা প্রদানকারী সংস্থাকে বোঝায়।'
                        : '"Flight Care" refers to Flight Care Technologies Ltd., an authorized airport protocol and VIP concierge service provider operating under CAAB guidelines at Hazrat Shahjalal International Airport (HSIA), Dhaka.'}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      2. {isBn ? 'বুকিং ও সেবা প্রদান (Service Delivery)' : 'Booking & Service Execution'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      {isBn
                        ? 'বুকিং নিশ্চিত হওয়ার সাথে সাথে যাত্রীর ইমেইল ও মোবাইলে একটি ডিজিটাল ভাউচার পাঠানো হয়। অ্যারাইভাল সেবার ক্ষেত্রে বোর্ডিং ব্রিজ বা অ্যারাইভাল গেটে এবং ডিপার্চার সেবার ক্ষেত্রে টার্মিনাল ক্যানোপিতে প্রোটোকল অফিসার নির্ধারিত সময় অনুযায়ী যাত্রীকে অভ্যর্থনা জানাবেন।'
                        : 'Upon confirmation, passengers receive an instant digital voucher via SMS and Email. Arrival protocol begins at the boarding bridge or arrival gate; departure protocol begins at the airport terminal canopy.'}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      3. {isBn ? 'যাত্রীর দায়িত্ব ও ঘোষণা (Passenger Declaration)' : 'Passenger Responsibility & Compliance'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      {isBn
                        ? 'যাত্রীকে অবশ্যই সঠিক ফ্লাইট শিডিউল এবং বৈধ পাসপোর্ট/ভিসা তথ্য প্রদান করতে হবে। যাত্রীর ব্যাগেজে কোনো প্রকার নিষিদ্ধ সামগ্রী (মাদক, অস্ত্র, দেশি-বিদেশি নগদ অর্থ, স্বর্ণ/রত্ন, জীবিত প্রাণী বা বিপজ্জনক দ্রব্য) থাকা কঠোরভাবে নিষিদ্ধ এবং বেসামরিক বিমান চলাচল আইন অনুযায়ী যাত্রী এর জন্য দায়ী থাকবেন।'
                        : 'Passengers must provide accurate flight data and valid travel documentation. Luggage must not contain prohibited contraband, weapons, undeclared currencies, live animals, or hazardous goods.'}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      4. {isBn ? 'ফ্লাইট বিলম্ব বা পুনঃনির্ধারণ (Flight Delays & Rescheduling)' : 'Flight Delays & Schedule Adjustments'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      {isBn
                        ? 'এয়ারলাইন্স কর্তৃক ফ্লাইট বিলম্ব বা সময় পরিবর্তিত হলে ফ্লাইট কেয়ার কোনো অতিরিক্ত চার্জ ছাড়া নতুন সময়ে প্রোটোকল ডিউটি সমন্বয় করে থাকে।'
                        : 'In cases of airline flight delays or schedule changes, Flight Care provides complimentary rescheduling to align with the revised arrival or departure time.'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 2: PRIVACY & PAYMENT SECURITY */}
            {activeTab === 'privacy' && (
              <View>
                <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 16 }}>
                  <Text style={{ fontSize: 12.5, color: '#065F46', fontWeight: '700', lineHeight: 18 }}>
                    🛡️ {isBn
                      ? 'আপনার ব্যক্তিগত তথ্যের গোপনীয়তা এবং অনলাইন পেমেন্টের সর্বোচ্চ নিরাপত্তা রক্ষা করা আমাদের আইনি অঙ্গীকার।'
                      : 'We maintain strict confidentiality of your personal information and ensure 100% bank-grade online payment security.'}
                  </Text>
                </View>

                <View style={{ gap: 14 }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      1. {isBn ? 'পেমেন্ট নিরাপত্তা (Payment Security - SSLCOMMERZ)' : 'Payment Security & Encryption (SSLCOMMERZ)'}
                    </Text>
                    <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, color: '#0284C7', fontWeight: '800' }}>
                        🔒 128/256-bit SSL Encrypted • PCI-DSS Level 1 Certified Gateway
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      {isBn
                        ? 'আমাদের ওয়েবসাইটে সমস্ত অনলাইন কার্ড ও মোবাইল ব্যাংকিং লেনদেন বাংলাদেশ ব্যাংকের অনুমোদিত জাতীয় পেমেন্ট গেটওয়ে SSLCOMMERZ-এর মাধ্যমে সম্পূর্ণ সুরক্ষিতভাবে পরিচালিত হয়। ফ্লাইট কেয়ার কখনোই আপনার কার্ড নম্বর, সিভিভি (CVV), ওটিপি বা পিন নম্বর সংগ্রহ অথবা সংরক্ষণ করে না।'
                        : 'All credit/debit card and mobile banking transactions are processed securely through SSLCOMMERZ, a Bangladesh Bank licensed, PCI-DSS Level 1 certified gateway. Flight Care does NOT collect or store your card numbers, CVV, OTP, or PIN numbers.'}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      2. {isBn ? 'যেসব তথ্য আমরা সংগ্রহ করি (Information Collected)' : 'Personal Information Collected'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      {isBn
                        ? 'শুধুমাত্র এয়ারপোর্ট টার্মিনালে যাত্রী অভ্যর্থনা ও সিএএবি সিকিউরিটি প্রোটোকল ছাড়পত্রের প্রয়োজনে আমরা যাত্রীর নাম, মোবাইল নম্বর, ইমেইল, ফ্লাইট নম্বর এবং পাসপোর্ট রেফারেন্স সংরক্ষণ করি।'
                        : 'We only collect essential passenger information (Name, Contact Number, Email, Flight Number, and Travel Date) necessary to perform airport protocol assistance and verify identification.'}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      3. {isBn ? 'কুকিজ নীতিমালা (Cookies Policy)' : 'Cookies Policy'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      {isBn
                        ? 'ওয়েবসাইটের গতিশীল কার্যক্ষমতা, ভাষা নির্বাচন (EN/বাংলা) এবং বুকিং সেশন নির্বিঘ্ন রাখার জন্য আমরা প্রয়োজনীয় সেশন কুকিজ ব্যবহার করি। কোনো বাণিজ্যিক বিজ্ঞাপন বা ট্র্যাকিং কুকিজ ব্যবহার করা হয় না।'
                        : 'We use strictly necessary session cookies to maintain your booking session and language preferences. We do not use third-party behavioral advertising cookies.'}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      4. {isBn ? 'তথ্য সুরক্ষা ও প্রকাশ (Data Protection)' : 'Data Protection & Non-Disclosure'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      {isBn
                        ? 'আমরা কোনো তৃতীয় পক্ষের কাছে গ্রাহকের তথ্য বিক্রি, ভাড়া বা হস্তান্তর করি না। আইনি বাধ্যবাধকতা ছাড়া সকল তথ্য সর্বোচ্চ সুরক্ষায় সংরক্ষিত থাকে।'
                        : 'We never sell, rent, or trade customer personal data. All passenger records are handled with strict operational discretion.'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 3: RETURN & REFUND POLICY (WITH 7-10 WORKING DAYS TIMELINE) */}
            {activeTab === 'refund' && (
              <View>
                {/* Mandatory Highlight Badge */}
                <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 16 }}>
                  <Text style={{ fontSize: 12.5, color: '#92400E', fontWeight: '800', lineHeight: 18 }}>
                    ⏱️ {isBn
                      ? 'রিফান্ডের আদর্শ সময়সীমা: অনুমোদনের পর ৭ থেকে ১০ কার্যদিবসের (7 to 10 working days) মধ্যে গ্রাহকের মূল পেমেন্ট মাধ্যমে টাকা স্বয়ংক্রিয়ভাবে ফেরত প্রদান করা হয়।'
                      : 'Standard Refund Timeline: Approved refunds are processed to the customer\'s original payment method within 7 to 10 working days.'}
                  </Text>
                </View>

                <View style={{ gap: 14 }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                      1. {isBn ? 'বাতিল ও রিফান্ডের হার (Cancellation Policy & Refund Rates)' : 'Cancellation Timeline & Refund Percentage'}
                    </Text>
                    
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
                        <Text style={{ fontSize: 12.5, color: '#166534', fontWeight: '700' }}>
                          {isBn ? 'ফ্লাইটের ২৪ ঘণ্টা বা তার বেশি পূর্বে বাতিল:' : '24 hours or earlier before flight:'}
                        </Text>
                        <Text style={{ fontSize: 12.5, color: '#15803D', fontWeight: '900' }}>
                          100% {isBn ? 'সম্পূর্ণ রিফান্ড' : 'Full Refund'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                        <Text style={{ fontSize: 12.5, color: '#92400E', fontWeight: '700' }}>
                          {isBn ? 'ফ্লাইটের ৬ থেকে ২৪ ঘণ্টার মধ্যে বাতিল:' : '6 to 24 hours before flight:'}
                        </Text>
                        <Text style={{ fontSize: 12.5, color: '#B45309', fontWeight: '900' }}>
                          50% {isBn ? 'অর্ধেক রিফান্ড' : 'Partial Refund'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                        <Text style={{ fontSize: 12.5, color: '#991B1B', fontWeight: '700' }}>
                          {isBn ? 'ফ্লাইটের ৬ ঘণ্টার কম পূর্বে / নো-শো:' : 'Less than 6 hours / No-Show:'}
                        </Text>
                        <Text style={{ fontSize: 12.5, color: '#DC2626', fontWeight: '800' }}>
                          {isBn ? 'রিফান্ড প্রযোজ্য নয়' : 'Non-Refundable'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      2. {isBn ? 'ফ্লাইট কেয়ার কর্তৃক সেবা প্রদানে ব্যর্থতা' : 'Service Disruption Guarantee'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      {isBn
                        ? 'অপ্রত্যাশিত কোনো কারণে ফ্লাইট কেয়ার নির্ধারিত সেবা প্রদানে ব্যর্থ হলে যাত্রী বিনা শর্তে ১০০% সম্পূর্ণ রিফান্ড পাবেন।'
                        : 'If Flight Care is unable to deliver confirmed protocol concierge service due to unforeseen operational causes, the customer receives an immediate 100% full refund.'}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      3. {isBn ? 'রিফান্ড প্রাপ্তির উপায় ও সময়সীমা (Refund Settlement Process)' : 'Refund Settlement & Processing'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      {isBn
                        ? 'রিফান্ডের আবেদন অনুমোদিত হওয়ার পর সংশ্লিষ্ট ব্যাংক বা এমএফএস (বিকাশ/নগদ) গেটওয়ে সেটেলমেন্ট চক্র অনুযায়ী ৭ থেকে ১০ কার্যদিবসের মধ্যে টাকা গ্রাহকের যে কার্ড বা অ্যাকাউন্ট থেকে পেমেন্ট করা হয়েছিল, সরাসরি সেখানে জমা হবে।'
                        : 'Once approved, the refund amount is credited directly to the customer\'s originating payment method (Credit/Debit Card, bKash, Nagad, etc.) through the SSLCOMMERZ gateway within 7 to 10 working days, depending on issuing bank settlement.'}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      4. {isBn ? 'রিফান্ড অনুরোধের নিয়ম (How to Request a Refund)' : 'How to Request a Refund'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      {isBn
                        ? 'আপনার বুকিং রেফারেন্স আইডি (#FC-XXXXX) সহ আমাদের ২৪/৭ সাপোর্ট হটলাইন 01347-570001 অথবা ইমেইল support@flightcare.app-এ মেসেজ দিলেই আমাদের কাস্টমার রিলেশনস টিম রিফান্ড ফাইল করে দেবে।'
                        : 'To initiate a cancellation or refund, please contact our 24/7 hotline at +880 1347-570001 or email support@flightcare.app with your Booking Reference ID (#FC-XXXXX).'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 4: ABOUT US & MANAGEMENT PROFILE */}
            {activeTab === 'about' && (
              <View>
                <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F2A4A', marginBottom: 2 }}>
                    Flight Care Technologies Ltd.
                  </Text>
                  <Text style={{ fontSize: 12, color: '#0284C7', fontWeight: '800' }}>
                    {isBn ? 'বেসামরিক বিমান চলাচল কর্তৃপক্ষ (CAAB) নিবন্ধিত গ্রাউন্ড প্রোটোকল পার্টনার' : 'CAAB Certified Airport Protocol & Ground Concierge Partner'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>
                    {isBn
                      ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর (HSIA), কুর্মিটোলা, ঢাকা-১২২৯'
                      : 'Hazrat Shahjalal International Airport (HSIA), Kurmitola, Dhaka-1229'}
                  </Text>
                </View>

                {/* Statutory Registration Details (Mandatory for SSLCommerz) */}
                <View style={{ backgroundColor: '#F0F9FF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0369A1', marginBottom: 6 }}>
                    📋 {isBn ? 'কোম্পানি লাইসেন্স ও সরকারি নিবন্ধনসমূহ:' : 'Statutory & Regulatory Registrations:'}
                  </Text>
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 12, color: '#0C4A6E', fontWeight: '700' }}>
                      • {isBn ? 'ট্রেড লাইসেন্স নম্বর (Trade License):' : 'Trade License No.:'} <Text style={{ fontWeight: '900' }}>TRAD/DNCC/004721/2024</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: '#0C4A6E', fontWeight: '700' }}>
                      • {isBn ? 'ই-টিআইএন (e-TIN):' : 'Taxpayer Identification Number (e-TIN):'} <Text style={{ fontWeight: '900' }}>287613602651</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: '#0C4A6E', fontWeight: '700' }}>
                      • {isBn ? 'ভ্যাট/বিআইএন (BIN/VAT Reg):' : 'Business Identification Number (BIN):'} <Text style={{ fontWeight: '900' }}>005829146-0101</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: '#0C4A6E', fontWeight: '700' }}>
                      • {isBn ? 'কর্তৃপক্ষ অনুমোদন:' : 'Airport Authority Authority:'} <Text style={{ fontWeight: '900' }}>Civil Aviation Authority of Bangladesh (CAAB)</Text>
                    </Text>
                  </View>
                </View>

                {/* Management Details (Mandatory for SSLCommerz) */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                    👥 {isBn ? 'ব্যবস্থাপনা পর্ষদ (Executive Management Profile):' : 'Executive Management Profile:'}
                  </Text>

                  <View style={{ gap: 8 }}>
                    <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Abdur Rab</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>FC-CEO-001 • Corporate Operations</Text>
                      </View>
                      <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7' }}>CEO</Text>
                      </View>
                    </View>

                    <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Mahid Hassan Shadin</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>FC-HR-001 • Protocol Staff Operations</Text>
                      </View>
                      <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>Head of HR</Text>
                      </View>
                    </View>

                    <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Mahabubur Rahman</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>FC-AGM-001 • Ground Coordination</Text>
                      </View>
                      <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>AGM</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 5: CONTACT & REGISTERED ADDRESS */}
            {activeTab === 'contact' && (
              <View>
                <View style={{ backgroundColor: '#F0F9FF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 16 }}>
                  <Text style={{ fontSize: 12.5, color: '#0369A1', fontWeight: '700', lineHeight: 18 }}>
                    {isBn
                      ? 'যেকোনো জিজ্ঞাসা, বুকিং সহায়তা, রিফান্ড বা কর্পোরেট চুক্তির জন্য আমাদের সাথে সরাসরি যোগাযোগ করুন।'
                      : 'For inquiries, passenger concierge assistance, refunds, or corporate partnerships, please reach out directly.'}
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                      📍 {isBn ? 'নিবন্ধিত কার্যালয় (Registered Business Address - Trade License):' : 'Registered Business Address (Trade License):'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                      Flight Care Technologies Ltd.
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#334155', marginTop: 2, lineHeight: 18 }}>
                      Terminal 1 & 2, Hazrat Shahjalal International Airport (HSIA), Kurmitola, Airport Road, Dhaka-1229, Bangladesh.
                    </Text>
                  </View>

                  <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                      📞 {isBn ? '২৪/৭ সার্বক্ষণিক হটলাইন ও হোয়াটসঅ্যাপ:' : '24/7 Helpline & WhatsApp Support:'}
                    </Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#0284C7' }}>
                      +880 1347-570001 / +880 1347-570002
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                      {isBn ? '২৪ ঘণ্টা চালু • বোর্ডিং ব্রিজ ও টার্মিনাল সাপোর্ট' : 'Operational 24/7 for VIP Airport Concierge'}
                    </Text>
                  </View>

                  <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                      ✉️ {isBn ? 'অফিশিয়াল ইমেইল যোগাযোগ:' : 'Official Corporate & Billing Email:'}
                    </Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                      support@flightcare.app • billing@flightcare.app • info@flightcare.app
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View
            style={{
              padding: isMobile ? 10 : 14,
              backgroundColor: '#F8FAFC',
              borderTopWidth: 1,
              borderTopColor: '#E2E8F0',
              flexDirection: isMobile ? 'column-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600', textAlign: isMobile ? 'center' : 'left' }}>
              Flight Care • Certified CAAB Ground Partner
            </Text>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#0284C7',
                paddingHorizontal: 20,
                paddingVertical: isMobile ? 10 : 9,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                {isBn ? 'বুঝেছি / বন্ধ করুন' : 'I Understand / Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

