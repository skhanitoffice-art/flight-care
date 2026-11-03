import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Linking,
  Clipboard,
} from 'react-native';

export const OFFICIAL_ARRIVAL_CARDS = [
  {
    id: 'sg',
    serial: 1,
    country: 'Singapore',
    countryBn: 'সিঙ্গাপুর',
    flag: '🇸🇬',
    title: 'SG Arrival Card',
    titleBn: 'এসজি অ্যারাইভাল কার্ড (SGAC)',
    url: 'https://eservices.ica.gov.sg/sgarrivalcard/',
    authority: 'ICA (Immigration & Checkpoints Authority Singapore)',
    authorityBn: 'ইমিগ্রেশন অ্যান্ড চেকপয়েন্টস অথরিটি সিঙ্গাপুর',
    region: 'asia',
    notes: 'Submit online within 3 days prior to your arrival in Singapore.',
    notesBn: 'সিঙ্গাপুর পৌঁছানোর সর্বোচ্চ ৩ দিন আগে অনলাইনে সাবমিট করতে হবে।',
  },
  {
    id: 'my',
    serial: 2,
    country: 'Malaysia',
    countryBn: 'মালয়েশিয়া',
    flag: '🇲🇾',
    title: 'Digital Arrival Card (MDAC)',
    titleBn: 'মালয়েশিয়া ডিজিটাল অ্যারাইভাল কার্ড (MDAC)',
    url: 'https://imigresen-online.imi.gov.my/mdac/main',
    authority: 'Jabatan Imigresen Malaysia',
    authorityBn: 'মালয়েশিয়া ইমিগ্রেশন বিভাগ',
    region: 'asia',
    notes: 'Mandatory online registration within 3 days before arrival.',
    notesBn: 'মালয়েশিয়ায় পৌঁছানোর ৩ দিন আগে পূরণ করা সকল যাত্রীর জন্য আবশ্যক।',
  },
  {
    id: 'th',
    serial: 3,
    country: 'Thailand',
    countryBn: 'থাইল্যান্ড',
    flag: '🇹🇭',
    title: 'Digital Arrival Card (TDAC)',
    titleBn: 'থাইল্যান্ড ডিজিটাল অ্যারাইভাল কার্ড (TDAC)',
    url: 'https://tdac.immigration.go.th/',
    authority: 'Immigration Bureau Thailand',
    authorityBn: 'থাইল্যান্ড অভিবাসন ব্যুরো',
    region: 'asia',
    notes: 'Official electronic entry card system for Thailand immigration.',
    notesBn: 'থাইল্যান্ড ভ্রমণের জন্য সরকারি ডিজিটাল আগমন কার্ড।',
  },
  {
    id: 'in',
    serial: 4,
    country: 'India',
    countryBn: 'ভারত',
    flag: '🇮🇳',
    title: 'e-Arrival Card',
    titleBn: 'ই-অ্যারাইভাল কার্ড ভারত',
    url: 'https://indianvisaonline.gov.in/earrival/',
    authority: 'Bureau of Immigration, Govt. of India',
    authorityBn: 'ভারত সরকার ইমিগ্রেশন ব্যুরো',
    region: 'asia',
    notes: 'Electronic arrival declaration form for inbound international passengers.',
    notesBn: 'ভারতে আগত আন্তর্জাতিক যাত্রীদের অনলাইন অ্যারাইভাল কার্ড।',
  },
  {
    id: 'id',
    serial: 5,
    country: 'Indonesia',
    countryBn: 'ইন্দোনেশিয়া',
    flag: '🇮🇩',
    title: 'All Indonesia',
    titleBn: 'অল ইন্দোনেশিয়া অ্যারাইভাল ও কাস্টমস',
    url: 'https://allindonesia.imigrasi.go.id/',
    authority: 'Directorate General of Immigration Indonesia',
    authorityBn: 'ইন্দোনেশিয়া অভিবাসন অধিদপ্তর',
    region: 'asia',
    notes: 'Official integrated immigration & customs entry declaration.',
    notesBn: 'ইন্দোনেশিয়ায় প্রবেশের জন্য অফিসিয়াল ইমিগ্রেশন ও কাস্টমস ডিক্লেয়ারেশন।',
  },
  {
    id: 'ph',
    serial: 6,
    country: 'Philippines',
    countryBn: 'ফিলিপাইন',
    flag: '🇵🇭',
    title: 'eTravel Declaration',
    titleBn: 'ই-ট্রাভেল ফিলিপাইন',
    url: 'https://etravel.gov.ph/',
    authority: 'Bureau of Immigration Philippines',
    authorityBn: 'ফিলিপাইন ব্যুরো অফ ইমিগ্রেশন',
    region: 'asia',
    notes: 'Mandatory arrival declaration within 72 hours prior to arrival.',
    notesBn: 'ফিলিপাইন পৌঁছানোর ৭২ ঘণ্টার মধ্যে পূরণ করা বাধ্যতামূলক।',
  },
  {
    id: 'mv',
    serial: 7,
    country: 'Maldives',
    countryBn: 'মালদ্বীপ',
    flag: '🇲🇻',
    title: 'IMUGA Traveller Declaration',
    titleBn: 'ইমুগা ট্রাভেলার ডিক্লেয়ারেশন মালদ্বীপ',
    url: 'https://imuga.immigration.gov.mv/traveller',
    authority: 'Maldives Immigration',
    authorityBn: 'মালদ্বীপ ইমিগ্রেশন সার্ভিসেস',
    region: 'asia',
    notes: 'Must be filled online within 96 hours before flight departure/arrival.',
    notesBn: 'মালদ্বীপে ফ্লাইট যাত্রার ৯৬ ঘণ্টার মধ্যে অনলাইনে জমা দিতে হবে।',
  },
  {
    id: 'kr',
    serial: 8,
    country: 'South Korea',
    countryBn: 'দক্ষিণ কোরিয়া',
    flag: '🇰🇷',
    title: 'e-Arrival Card',
    titleBn: 'ই-অ্যারাইভাল কার্ড দক্ষিণ কোরিয়া',
    url: 'https://www.e-arrivalcard.go.kr/',
    authority: 'Korea Immigration Service',
    authorityBn: 'কোরিয়া ইমিগ্রেশন সার্ভিস',
    region: 'asia',
    notes: 'Official electronic arrival card for entering South Korea.',
    notesBn: 'দক্ষিণ কোরিয়ায় প্রবেশের জন্য সরকারি ইলেকট্রনিক আগমন কার্ড।',
  },
  {
    id: 'kh',
    serial: 9,
    country: 'Cambodia',
    countryBn: 'কম্বোডিয়া',
    flag: '🇰🇭',
    title: 'Cambodia e-Arrival',
    titleBn: 'কম্বোডিয়া ই-অ্যারাইভাল কার্ড',
    url: 'https://arrival.gov.kh/',
    authority: 'General Department of Immigration Cambodia',
    authorityBn: 'কম্বোডিয়া অভিবাসন সাধারণ অধিদপ্তর',
    region: 'asia',
    notes: 'Integrated electronic arrival, customs, and health declaration.',
    notesBn: 'কম্বোডিয়া সরকারি ইলেকট্রনিক আগমন ও কাস্টমস ডিক্লেয়ারেশন।',
  },
  {
    id: 'tw',
    serial: 10,
    country: 'Taiwan',
    countryBn: 'তাইওয়ান',
    flag: '🇹🇼',
    title: 'Arrival Card (TWAC)',
    titleBn: 'তাইওয়ান অনলাইন অ্যারাইভাল কার্ড (TWAC)',
    url: 'https://twac.immigration.gov.tw/',
    authority: 'National Immigration Agency Taiwan',
    authorityBn: 'জাতীয় অভিবাসন সংস্থা তাইওয়ান',
    region: 'asia',
    notes: 'Fill online before passing through passport inspection counter.',
    notesBn: 'পাসপোর্ট কন্ট্রোল কাউন্টারে পৌঁছানোর পূর্বে অনলাইনে পূরণ করতে হবে।',
  },
  {
    id: 'bn',
    serial: 11,
    country: 'Brunei',
    countryBn: 'ব্রুনাই',
    flag: '🇧🇳',
    title: 'E-Arrival Card',
    titleBn: 'ব্রুনাই ই-অ্যারাইভাল কার্ড',
    url: 'https://www.imm.gov.bn/',
    authority: 'Department of Immigration & National Registration Brunei',
    authorityBn: 'ব্রুনাই ইমিগ্রেশন ও ন্যাশনাল রেজিস্ট্রেশন বিভাগ',
    region: 'asia',
    notes: 'Mandatory electronic registration for arriving foreign travellers.',
    notesBn: 'ব্রুনাই প্রবেশকারী সকল বিদেশি যাত্রীদের জন্য আবশ্যকীয় রেজিস্ট্রেশন।',
  },
  {
    id: 'la',
    serial: 12,
    country: 'Laos',
    countryBn: 'লাওস',
    flag: '🇱🇦',
    title: 'Lao Digital Immigration Form (LDIF)',
    titleBn: 'লাওস ডিজিটাল ইমিগ্রেশন ফর্ম (LDIF)',
    url: 'https://www.immigration.gov.la/',
    authority: 'Department of Immigration Laos',
    authorityBn: 'লাওস অভিবাসন বিভাগ',
    region: 'asia',
    notes: 'Official Lao government digital arrival declaration portal.',
    notesBn: 'লাওস সরকারি ডিজিটাল আগমন ডিক্লেয়ারেশন পোর্টাল।',
  },
  {
    id: 'cn',
    serial: 13,
    country: 'China',
    countryBn: 'চীন',
    flag: '🇨🇳',
    title: 'China Arrival Card',
    titleBn: 'চীন অ্যারাইভাল কার্ড',
    url: 'https://en.nia.gov.cn/',
    authority: 'National Immigration Administration (NIA) China',
    authorityBn: 'ন্যাশনাল ইমিগ্রেশন অ্যাডমিনিস্ট্রেশন চীন',
    region: 'asia',
    notes: 'Foreigners entry & border inspection arrival declaration.',
    notesBn: 'চীন প্রবেশের জন্য বিদেশি ভ্রমণকারীদের বর্ডার ইন্সপেকশন কার্ড।',
  },
  {
    id: 'lk',
    serial: 14,
    country: 'Sri Lanka',
    countryBn: 'শ্রীলঙ্কা',
    flag: '🇱🇰',
    title: 'Sri Lanka Arrival Card',
    titleBn: 'শ্রীলঙ্কা অনলাইন অ্যারাইভাল কার্ড',
    url: 'https://eservices.immigration.gov.lk/',
    authority: 'Department of Immigration & Emigration Sri Lanka',
    authorityBn: 'শ্রীলঙ্কা অভিবাসন ও প্রবাসন বিভাগ',
    region: 'asia',
    notes: 'Submit online within 3 days prior to your arrival in Sri Lanka.',
    notesBn: 'শ্রীলঙ্কা পৌঁছানোর ৩ দিন আগে অনলাইনে সাবমিট করুন।',
  },
  {
    id: 'jp',
    serial: 15,
    country: 'Japan',
    countryBn: 'জাপান',
    flag: '🇯🇵',
    title: 'Visit Japan Web',
    titleBn: 'ভিজিট জাপান ওয়েব (ইমিগ্রেশন ও কাস্টমস)',
    url: 'https://www.digital.go.jp/en/policies/visit_japan_web',
    authority: 'Digital Agency / Immigration Services Agency of Japan',
    authorityBn: 'ডিজিটাল এজেন্সি ও ইমিগ্রেশন সার্ভিসেস জাপান',
    region: 'asia',
    notes: 'Fast-track immigration, customs clearance, and entry QR codes.',
    notesBn: 'জাপানে দ্রুত ইমিগ্রেশন ও কাস্টমস ক্লিয়ারেন্স কিউআর কোড।',
  },
  {
    id: 'au',
    serial: 16,
    country: 'Australia',
    countryBn: 'অস্ট্রেলিয়া',
    flag: '🇦🇺',
    title: 'Incoming Passenger Card (IPC)',
    titleBn: 'ইনকামিং প্যাসেঞ্জার কার্ড অস্ট্রেলিয়া',
    url: 'https://immi.homeaffairs.gov.au/entering-and-leaving-australia/crossing-the-border',
    authority: 'Department of Home Affairs Australia',
    authorityBn: 'অস্ট্রেলিয়া হোম অ্যাফেয়ার্স বিভাগ',
    region: 'oceania',
    notes: 'Official customs, biosecurity & passenger arrival clearance declaration.',
    notesBn: 'অস্ট্রেলিয়া বর্ডার কাস্টমস ও বায়োসিকিউরিটি অ্যারাইভাল কার্ড।',
  },
  {
    id: 'nz',
    serial: 17,
    country: 'New Zealand',
    countryBn: 'নিউজিল্যান্ড',
    flag: '🇳🇿',
    title: 'New Zealand Traveller Declaration (NZTD)',
    titleBn: 'নিউজিল্যান্ড ট্রাভেলার ডিক্লেয়ারেশন (NZTD)',
    url: 'https://www.travellerdeclaration.govt.nz/',
    authority: 'New Zealand Customs Service',
    authorityBn: 'নিউজিল্যান্ড কাস্টমস সার্ভিস',
    region: 'oceania',
    notes: 'Complete digital declaration within 24 hours of flight departure to NZ.',
    notesBn: 'নিউজিল্যান্ড ফ্লাইটের ২৪ ঘণ্টার মধ্যে অনলাইনে সম্পন্ন করুন।',
  },
  {
    id: 'cu',
    serial: 18,
    country: 'Cuba',
    countryBn: 'কিউবা',
    flag: '🇨🇺',
    title: 'D’Viajeros',
    titleBn: 'ডিভিয়াজেরোস ডিজিটাল ফর্ম কিউবা',
    url: 'https://www.dviajeros.mitrans.gob.cu/',
    authority: 'Ministry of Transport & Customs of Cuba',
    authorityBn: 'কিউবা পরিবহন ও কাস্টমস মন্ত্রণালয়',
    region: 'americas',
    notes: 'Mandatory online form within 48 hours prior to boarding your flight.',
    notesBn: 'কিউবা ফ্লাইটে ওঠার ৪৮ ঘণ্টার মধ্যে পূরণ করা বাধ্যতামূলক।',
  },
  {
    id: 'bb',
    serial: 19,
    country: 'Barbados',
    countryBn: 'বার্বাডোজ',
    flag: '🇧🇧',
    title: 'Online Immigration and Customs Form',
    titleBn: 'অনলাইন ইমিগ্রেশন ও কাস্টমস ফর্ম বার্বাডোজ',
    url: 'https://immigration.gov.bb/pages/visitor.aspx',
    authority: 'Barbados Immigration Department',
    authorityBn: 'বার্বাডোজ ইমিগ্রেশন ডিপার্টমেন্ট',
    region: 'americas',
    notes: 'Submit within 72 hours of travel to Barbados.',
    notesBn: 'বার্বাডোজ ভ্রমণের ৭২ ঘণ্টার মধ্যে সাবমিট করুন।',
  },
  {
    id: 'lc',
    serial: 20,
    country: 'Saint Lucia',
    countryBn: 'সেন্ট লুসিয়া',
    flag: '🇱🇨',
    title: 'Electronic Immigration Form',
    titleBn: 'ইলেকট্রনিক ইমিগ্রেশন ফর্ম সেন্ট লুসিয়া',
    url: 'https://travelform.gov.lc/',
    authority: 'Government of Saint Lucia',
    authorityBn: 'সেন্ট লুসিয়া সরকার',
    region: 'americas',
    notes: 'Official electronic entry form for all visitors to Saint Lucia.',
    notesBn: 'সেন্ট লুসিয়া ভ্রমণকারী সকল যাত্রীর জন্য সরকারি ডিজিটাল এন্ট্রি কার্ড।',
  },
];

export default function ArrivalCardsModal({
  visible = true,
  onClose,
  lang = 0,
  embedded = false,
}) {
  const isBn = Boolean(lang);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRegion, setActiveRegion] = useState('all'); // 'all' | 'asia' | 'oceania' | 'americas'
  const [copiedId, setCopiedId] = useState(null);

  const filteredCards = OFFICIAL_ARRIVAL_CARDS.filter(item => {
    // Region filter
    if (activeRegion !== 'all' && item.region !== activeRegion) {
      return false;
    }
    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.country.toLowerCase().includes(q) ||
      item.countryBn.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.titleBn.toLowerCase().includes(q) ||
      item.authority.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q)
    );
  });

  const handleOpenUrl = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    });
  };

  const handleCopyUrl = (item) => {
    if (!item?.url) return;
    try {
      Clipboard.setString(item.url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  if (!embedded && !visible) return null;

  const content = (
    <View
      style={
        embedded
          ? {
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#CBD5E1',
            }
          : {
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 760,
              maxHeight: '92%',
              overflow: 'hidden',
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 25,
              elevation: 10,
            }
      }
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: '#0284C7',
          paddingVertical: 18,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderColor: '#0369A1',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22 }}>🛂</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
              {isBn ? 'আন্তর্জাতিক এ্যারাইভাল কার্ড পোর্টাল' : 'International Arrival Cards Portal'}
            </Text>
            <Text style={{ color: '#E0F2FE', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
              {isBn ? '২০টি দেশের অফিশিয়াল সরকারি ইমিগ্রেশন ডিরেক্টরি' : 'Official Government Digital Immigration Directory'}
            </Text>
          </View>
        </View>

        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

          {/* Search & Region Filter Bar */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 10,
              backgroundColor: '#F8FAFC',
              borderBottomWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            {/* Search Input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#CBD5E1',
                paddingHorizontal: 12,
                height: 44,
                marginBottom: 10,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#0F172A',
                  outlineStyle: 'none',
                }}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={isBn ? 'দেশের নাম বা কার্ড লিখে খুঁজুন (যেমন: Singapore, Malaysia)...' : 'Search by country or card name (e.g. Singapore, Malaysia)...'}
                placeholderTextColor="#94A3B8"
              />
              {searchQuery.trim().length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Filter Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[
                { id: 'all', label: isBn ? `সকল দেশ (${OFFICIAL_ARRIVAL_CARDS.length})` : `All (${OFFICIAL_ARRIVAL_CARDS.length})` },
                { id: 'asia', label: isBn ? 'এশিয়া (১৫)' : 'Asia (15)' },
                { id: 'oceania', label: isBn ? 'ওশেনিয়া (২)' : 'Oceania (2)' },
                { id: 'americas', label: isBn ? 'আমেরিকা ও ক্যারিবীয় (৩)' : 'Americas & Caribbean (3)' },
              ].map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveRegion(tab.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: activeRegion === tab.id ? '#0284C7' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: activeRegion === tab.id ? '#0284C7' : '#CBD5E1',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: activeRegion === tab.id ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Cards List */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18, gap: 12 }}
            showsVerticalScrollIndicator
          >
            {filteredCards.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#475569' }}>
                  {isBn ? 'কোনো অ্যারাইভাল কার্ডের তথ্য পাওয়া যায়নি' : 'No arrival cards found matching your query'}
                </Text>
                <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                  {isBn ? 'সঠিক দেশের নাম লিখে পুনরায় চেষ্টা করুন' : 'Try searching with a different country name'}
                </Text>
              </View>
            ) : (
              filteredCards.map((item, idx) => (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: '#E2E8F0',
                    padding: 14,
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                  }}
                >
                  {/* Top Row: Serial, Flag, Country Name & Authority */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                      <Text style={{ fontSize: 28, lineHeight: 32 }}>{item.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                            {item.serial}. {isBn ? item.countryBn : item.country}
                          </Text>
                          <View
                            style={{
                              backgroundColor: '#F0FDF4',
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: '#BBF7D0',
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#166534' }}>
                              ✓ {isBn ? 'ভেরিফায়েড পোর্টাল' : 'Official Portal'}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0284C7', marginTop: 2 }}>
                          {isBn ? item.titleBn : item.title}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
                          🏛️ {isBn ? item.authorityBn : item.authority}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Travel Instructions / Advisory */}
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 8,
                      padding: 9,
                      marginTop: 10,
                      borderLeftWidth: 3,
                      borderLeftColor: '#0284C7',
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#334155', fontWeight: '600' }}>
                      ℹ️ {isBn ? item.notesBn : item.notes}
                    </Text>
                  </View>

                  {/* Action Buttons: Open Official Link & Copy Link */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 8,
                      marginTop: 12,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: '#F1F5F9',
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleCopyUrl(item)}
                      activeOpacity={0.75}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: copiedId === item.id ? '#DCFCE7' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: copiedId === item.id ? '#86EFAC' : '#E2E8F0',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: copiedId === item.id ? '#166534' : '#475569',
                        }}
                      >
                        {copiedId === item.id ? (isBn ? '✓ কপি হয়েছে' : '✓ Copied') : (isBn ? '📋 কপি লিংক' : '📋 Copy Link')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleOpenUrl(item.url)}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: '#0284C7',
                        shadowColor: '#0284C7',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                        {isBn ? 'অফিসিয়াল পোর্টালে যান ↗' : 'Open Portal ↗'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer Notice */}
          <View
            style={{
              paddingVertical: 12,
              paddingHorizontal: 18,
              backgroundColor: '#F1F5F9',
              borderTopWidth: 1,
              borderColor: '#E2E8F0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
              🔒 {isBn ? 'ফ্লাইট কেয়ার কর্তৃক যাচাইকৃত সরকারি ও ইমিগ্রেশন ডিরেক্টরি' : 'Flight Care Verified Official Immigration Links'}
            </Text>
            {onClose ? (
              <TouchableOpacity onPress={onClose}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284C7' }}>
                  {isBn ? 'বন্ধ করুন' : 'Close'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
  );

  if (embedded) {
    return content;
  }

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
          padding: Platform.OS === 'web' ? 20 : 12,
        }}
      >
        {content}
      </View>
    </Modal>
  );
}
