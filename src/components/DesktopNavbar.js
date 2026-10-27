import React from 'react';
import { View, Text, TouchableOpacity, Platform, Linking, Image } from 'react-native';
import { s } from '../styles/styles';
import { SUPPORT_PHONE } from '../constants/theme';

export default function DesktopNavbar({
  tab,
  setTab,
  setDetail,
  setWiz,
  airport,
  lang,
  setLang,
  t,
  notifications = [],
  customerSession,
  loadCustomerNotifications,
  onPressAirport,
}) {
  const unreadCount = notifications.filter(item => !item.read).length;

  const navItems = [
    ['home', '🏠', t('home')],
    ['bookings', '🎫', t('bookings')],
    ['inbox', '🔔', t('inbox')],
    ['help', '💬', t('help')],
    ['profile', '👤', t('profile')],
  ];

  return (
    <View
      style={s.desktopNavBar}
      {...(Platform.OS === 'web' ? { className: 'flightcare-glass' } : {})}
    >
      {/* Brand & Airport */}
      <View style={s.desktopNavBrand}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (setWiz) setWiz(null);
            if (setDetail) setDetail(null);
            if (setTab) setTab('home');
          }}
          style={{ marginRight: 10 }}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 44, height: 44, resizeMode: 'contain' }}
          />
        </TouchableOpacity>
        <View>
          <Text style={s.desktopBrandTitle}>FlightCare Concierge</Text>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}
            onPress={onPressAirport}
            accessibilityRole="button"
            accessibilityLabel={lang ? 'বিমানবন্দর পরিবর্তন করুন' : 'Change airport'}
          >
            <View
              style={
                Platform.OS === 'web'
                  ? {}
                  : { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981', marginRight: 5 }
              }
              {...(Platform.OS === 'web' ? { className: 'flightcare-live-dot' } : {})}
            />
            <Text style={s.desktopBrandSubtitle}>
              {airport.code} · {(airport.shortName || airport.name)[lang]} ▾
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Pills */}
      <View style={s.desktopNavLinks}>
        {navItems.map(([k, icon, label]) => {
          const active = tab === k;
          return (
            <TouchableOpacity
              key={k}
              style={[s.desktopNavPill, active && s.desktopNavPillActive]}
              {...(Platform.OS === 'web' ? { className: 'flightcare-nav-pill-3d' } : {})}
              onPress={() => {
                setTab(k);
                setDetail(null);
                setWiz(null);
                if (k === 'inbox' && customerSession && loadCustomerNotifications) {
                  loadCustomerNotifications();
                }
              }}
            >
              <Text style={[s.desktopNavPillIcon, active && s.desktopNavPillIconActive]}>{icon}</Text>
              <Text style={[s.desktopNavPillText, active && s.desktopNavPillTextActive]}>{label}</Text>
              {k === 'inbox' && unreadCount > 0 && (
                <View style={s.desktopNavBadge}>
                  <Text style={s.desktopNavBadgeText}>{Math.min(99, unreadCount)}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Actions (Support Helpline + Language Toggle) */}
      <View style={s.desktopNavActions}>
        <TouchableOpacity
          style={s.desktopSupportPill}
          accessibilityRole="button"
          accessibilityLabel={lang ? '২৪/৭ সাপোর্ট হেল্পলাইন' : '24/7 Helpline'}
          {...(Platform.OS === 'web' ? { className: 'flightcare-nav-pill-3d' } : {})}
          onPress={() => {
            if (SUPPORT_PHONE) Linking.openURL(`tel:${SUPPORT_PHONE}`);
          }}
        >
          <Text style={{ fontSize: 14 }}>📞</Text>
          <Text style={s.desktopSupportText}>
            {lang ? '২৪/৭ হেল্পলাইন' : '24/7 Support'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.langButton3D}
          accessibilityRole="button"
          accessibilityLabel={lang ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
          {...(Platform.OS === 'web' ? { className: 'flightcare-nav-pill-3d' } : {})}
          onPress={() => setLang(current => (current === 0 ? 1 : 0))}
        >
          <Text style={s.langText3D}>{lang ? '🌐 English' : '🌐 বাংলা'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
