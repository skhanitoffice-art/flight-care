import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Image } from 'react-native';
import WebsiteComplianceModal from './WebsiteComplianceModal';

export default function DesktopFooter({
  lang = 0,
  setLang,
  setTab,
  setWiz,
  setShowServicesModal,
}) {
  const [complianceTab, setComplianceTab] = useState(null);

  return (
    <View
      style={{
        width: '100%',
        backgroundColor: '#071A2E',
        position: 'relative',
        overflow: 'hidden',
        marginTop: 'auto',
      }}
    >
      {/* Decorative Gold Wave Stroke at Top */}
      {Platform.OS === 'web' && (
        <svg
          width="100%"
          height="14"
          viewBox="0 0 1200 14"
          fill="none"
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '14px' }}
        >
          <path
            d="M0 10 Q300 2 600 7 T1200 5"
            stroke="#F59E0B"
            strokeWidth="2"
            fill="none"
            opacity="0.8"
          />
        </svg>
      )}

      {/* Row 1: Brand & Primary Navigation */}
      <View
        style={{
          width: '100%',
          maxWidth: 1200,
          marginHorizontal: 'auto',
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Brand Logo & Slogan */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 32, height: 32, resizeMode: 'contain' }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.3px' }}>
              FlightCare
            </Text>
            <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>•</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B' }}>Fly VIP</Text>
          </View>
        </View>

        {/* Primary Nav Links */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={() => {
              if (setShowServicesModal) setShowServicesModal(true);
            }}
          >
            <Text style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: '500' }}>
              {lang ? 'সার্ভিসসমূহ' : 'Services'}
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 11, color: '#334155' }}>|</Text>

          <TouchableOpacity
            onPress={() => {
              if (setWiz) setWiz(null);
              if (setTab) setTab('bookings');
            }}
          >
            <Text style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: '500' }}>
              {lang ? 'আমার বুকিংস' : 'My Bookings'}
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 11, color: '#334155' }}>|</Text>

          <TouchableOpacity
            onPress={() => {
              if (setWiz) setWiz(null);
              if (setTab) setTab('help');
            }}
          >
            <Text style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: '500' }}>
              {lang ? 'সাপোর্ট' : 'Support'}
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 11, color: '#334155' }}>|</Text>

          <TouchableOpacity
            onPress={() => {
              if (setWiz) setWiz(null);
              if (setTab) setTab('manager');
            }}
          >
            <Text style={{ fontSize: 12.5, color: '#F59E0B', fontWeight: '700' }}>
              🛡️ {lang ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}
            </Text>
          </TouchableOpacity>

          {setLang && (
            <>
              <Text style={{ fontSize: 11, color: '#334155' }}>|</Text>
              <TouchableOpacity onPress={() => setLang(0)}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: lang === 0 ? '800' : '500',
                    color: lang === 0 ? '#38BDF8' : '#94A3B8',
                  }}
                >
                  EN
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 10, color: '#334155' }}>/</Text>
              <TouchableOpacity onPress={() => setLang(1)}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: lang === 1 ? '800' : '500',
                    color: lang === 1 ? '#38BDF8' : '#94A3B8',
                  }}
                >
                  বাংলা
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Row 2: Mandatory Website Policies & Compliance Bar (SSLCommerz Requirement) */}
      <View
        style={{
          width: '100%',
          maxWidth: 1200,
          marginHorizontal: 'auto',
          paddingHorizontal: 24,
          paddingVertical: 8,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.06)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <TouchableOpacity onPress={() => setComplianceTab('terms')} activeOpacity={0.75} style={{ paddingVertical: 2 }}>
          <Text style={{ fontSize: 11.5, color: '#CBD5E1', fontWeight: '600' }}>
            {lang ? 'সেবার শর্তাবলী (Terms & Conditions)' : 'Terms & Conditions'}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 10, color: '#475569' }}>•</Text>

        <TouchableOpacity onPress={() => setComplianceTab('privacy')} activeOpacity={0.75} style={{ paddingVertical: 2 }}>
          <Text style={{ fontSize: 11.5, color: '#CBD5E1', fontWeight: '600' }}>
            {lang ? 'গোপনীয়তা ও নিরাপত্তা (Privacy Policy)' : 'Privacy Policy'}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 10, color: '#475569' }}>•</Text>

        <TouchableOpacity onPress={() => setComplianceTab('refund')} activeOpacity={0.75} style={{ paddingVertical: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 11.5, color: '#38BDF8', fontWeight: '700' }}>
              {lang ? 'রিফান্ড ও ক্যান্সেলেশন (Return & Refund Policy)' : 'Return & Refund Policy'}
            </Text>
            <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 0.8, borderColor: '#F59E0B', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
              <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#F59E0B' }}>
                7-10 Days
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={{ fontSize: 10, color: '#475569' }}>•</Text>

        <TouchableOpacity onPress={() => setComplianceTab('about')} activeOpacity={0.75} style={{ paddingVertical: 2 }}>
          <Text style={{ fontSize: 11.5, color: '#CBD5E1', fontWeight: '600' }}>
            {lang ? 'আমাদের সম্পর্কে (About Us)' : 'About Us & Management'}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 10, color: '#475569' }}>•</Text>

        <TouchableOpacity onPress={() => setComplianceTab('contact')} activeOpacity={0.75} style={{ paddingVertical: 2 }}>
          <Text style={{ fontSize: 11.5, color: '#CBD5E1', fontWeight: '600' }}>
            {lang ? 'যোগাযোগ ও নিবন্ধিত ঠিকানা (Contact Us)' : 'Contact Us'}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 10, color: '#475569' }}>•</Text>

        <TouchableOpacity onPress={() => setComplianceTab('license')} activeOpacity={0.75} style={{ paddingVertical: 2 }}>
          <Text style={{ fontSize: 11.5, color: '#FCD34D', fontWeight: '700' }}>
            📜 {lang ? 'ট্রেড লাইসেন্স (Trade License)' : 'Trade License'}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 10, color: '#475569' }}>•</Text>

        <TouchableOpacity onPress={() => setComplianceTab('tin')} activeOpacity={0.75} style={{ paddingVertical: 2 }}>
          <Text style={{ fontSize: 11.5, color: '#38BDF8', fontWeight: '700' }}>
            📋 {lang ? 'টিআইএন সনদ (TIN Copy)' : 'TIN Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Row 3: Official SSLCommerz Payment Gateway Trust Banner (Compact & Elegant) */}
      <View
        style={{
          width: '100%',
          maxWidth: 1200,
          marginHorizontal: 'auto',
          paddingHorizontal: 24,
          paddingVertical: 8,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.06)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {lang ? 'অনুমোদিত পেমেন্ট গেটওয়ে:' : 'We Accept & Secured By:'}
          </Text>
          <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', borderWidth: 1, borderColor: '#38BDF8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#38BDF8' }}>
              PCI-DSS Level 1 Encrypted
            </Text>
          </View>
        </View>

        {/* Crisp SSLCommerz Graphic Banner */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
            maxWidth: 400,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
          }}
        >
          <Image
            source={require('../../assets/sslcommerz_banner.png')}
            style={{
              width: '100%',
              height: 26,
              resizeMode: 'contain',
            }}
          />
        </View>
      </View>

      {/* Row 4: Statutory Registration & Registered Business Address */}
      <View
        style={{
          width: '100%',
          maxWidth: 1200,
          marginHorizontal: 'auto',
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 16,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.06)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <View style={{ flex: 1, minWidth: 280 }}>
          <Text style={{ fontSize: 11.5, color: '#F8FAFC', fontWeight: '800' }}>
            Flight Care Technologies Ltd.
          </Text>
          <Text style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 3 }}>
            📍 {lang ? 'নিবন্ধিত কার্যালয়: টার্মিনাল ১ ও ২, হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর (HSIA), কুর্মিটোলা, ঢাকা-১২২৯' : 'Registered Office: Terminal 1 & 2, Hazrat Shahjalal International Airport (HSIA), Kurmitola, Dhaka-1229'}
          </Text>

          {/* Trade License & TIN Badges */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setComplianceTab('license')}
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 4,
                borderWidth: 0.8,
                borderColor: 'rgba(245, 158, 11, 0.35)',
              }}
            >
              <Text style={{ fontSize: 10, color: '#FDE68A', fontWeight: '600' }}>
                📜 {lang ? 'ট্রেড লাইসেন্স:' : 'Trade License:'} <Text style={{ color: '#F59E0B', fontWeight: '800' }}>TRAD/DNCC/004721/2024</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setComplianceTab('tin')}
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 4,
                borderWidth: 0.8,
                borderColor: 'rgba(56, 189, 248, 0.35)',
              }}
            >
              <Text style={{ fontSize: 10, color: '#BAE6FD', fontWeight: '600' }}>
                📋 {lang ? 'ই-টিআইএন:' : 'e-TIN:'} <Text style={{ color: '#38BDF8', fontWeight: '800' }}>287613602651</Text>
              </Text>
            </TouchableOpacity>

            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 4,
                borderWidth: 0.8,
                borderColor: 'rgba(255, 255, 255, 0.12)',
              }}
            >
              <Text style={{ fontSize: 10, color: '#CBD5E1', fontWeight: '600' }}>
                🏢 {lang ? 'বিআইএন:' : 'BIN/VAT:'} <Text style={{ color: '#E2E8F0', fontWeight: '800' }}>005829146-0101</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, color: '#CBD5E1', fontWeight: '700' }}>
              📞 {lang ? '২৪/৭ সাপোর্ট:' : '24/7 Helpline:'}
            </Text>
            <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '900' }}>
              +880 1347-570001
            </Text>
            <Text style={{ fontSize: 10, color: '#475569' }}>|</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>
              +880 1347-570002
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>
            {lang ? 'বেসামরিক বিমান চলাচল কর্তৃপক্ষ (CAAB) নিবন্ধিত' : 'CAAB Certified Protocol Concierge'} • © 2026 Flight Care
          </Text>
        </View>
      </View>

      {/* Full Compliance Details Modal (Opens instantly when clicking any footer policy) */}
      <WebsiteComplianceModal
        visible={!!complianceTab}
        initialTab={complianceTab || 'terms'}
        onClose={() => setComplianceTab(null)}
        lang={lang}
      />
    </View>
  );
}
