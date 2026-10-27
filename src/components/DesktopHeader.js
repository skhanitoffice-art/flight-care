import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { FlightCareBrandLogo, UserIcon, BellIcon } from './Icons';

export default function DesktopHeader({
  lang = 0,
  setLang,
  customerSession,
  setTab,
  tab,
  setWiz,
  setDetail,
  mode = 'home', // 'home' | 'wizard' | 'confirmation' | 'nav'
  onPressSignIn,
  setShowServicesModal,
  airport,
  setShowAirportModal,
  onPressOfficers,
  navigateToSubPage,
  notifications = [],
  unreadCount: propUnreadCount,
}) {
  const isHome = mode === 'home' || mode === 'nav';
  const isConfirm = mode === 'confirmation';
  const unreadCount = propUnreadCount != null ? propUnreadCount : (notifications || []).filter(n => !n.read).length;

  return (
    <View
      style={{
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 1200,
          paddingHorizontal: 24,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo on Left */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (setWiz) setWiz(null);
            if (setDetail) setDetail(null);
            if (setTab) setTab('home');
          }}
        >
          <FlightCareBrandLogo size={42} />
        </TouchableOpacity>

        {/* Center / Navigation Links */}
        {isHome && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, marginLeft: 28 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (setWiz) setWiz(null);
                if (setDetail) setDetail(null);
                if (setTab) setTab('home');
              }}
            >
              <Text style={{ fontSize: 14.5, fontWeight: tab === 'home' ? '700' : '600', color: tab === 'home' ? '#0284C7' : '#1E293B' }}>
                {lang ? 'হোম' : 'Home'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (navigateToSubPage) {
                  navigateToSubPage('additional_services');
                } else if (setShowServicesModal) {
                  setShowServicesModal(true);
                }
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: '#1E293B' }}>
                {lang ? 'সার্ভিস' : 'Services'}
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B' }}>▾</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (navigateToSubPage) {
                  navigateToSubPage('compare_packages');
                }
              }}
            >
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: '#1E293B' }}>
                {lang ? 'প্যাকেজের তুলনা' : 'Packages'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (setWiz) setWiz(null);
                if (setTab) setTab('bookings');
              }}
            >
              <Text style={{ fontSize: 14.5, fontWeight: tab === 'bookings' ? '700' : '600', color: tab === 'bookings' ? '#0284C7' : '#1E293B' }}>
                {lang ? 'আমার বুকিংস' : 'My Bookings'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (setWiz) setWiz(null);
                if (setTab) setTab('help');
              }}
            >
              <Text style={{ fontSize: 14.5, fontWeight: tab === 'help' ? '700' : '600', color: tab === 'help' ? '#0284C7' : '#1E293B' }}>
                {lang ? 'সাপোর্ট' : 'Support'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Right Section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginLeft: 'auto' }}>
          {isConfirm && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginRight: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  if (setWiz) setWiz(null);
                  if (setTab) setTab('bookings');
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>
                  {lang ? 'আমার বুকিংস' : 'My Bookings'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (setWiz) setWiz(null);
                  if (setTab) setTab('help');
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>
                  {lang ? 'সাপোর্ট' : 'Support'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Language Switcher: EN | বাংলা */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={() => setLang && setLang(0)}>
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: lang === 0 ? '800' : '500',
                  color: lang === 0 ? '#0F172A' : '#64748B',
                }}
              >
                EN
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 13, color: '#94A3B8' }}>|</Text>
            <TouchableOpacity onPress={() => setLang && setLang(1)}>
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: lang === 1 ? '800' : '500',
                  color: lang === 1 ? '#0F172A' : '#64748B',
                }}
              >
                বাংলা
              </Text>
            </TouchableOpacity>
          </View>

          {/* Top Universal Notification Bell Icon */}
          <TouchableOpacity
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={lang ? 'নোটিফিকেশন' : 'Notifications'}
            onPress={() => {
              if (setWiz) setWiz(null);
              if (setDetail) setDetail(null);
              if (setTab) setTab('inbox');
            }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: unreadCount > 0 ? '#EFF6FF' : '#F8FAFC',
              borderWidth: 1.5,
              borderColor: unreadCount > 0 ? '#38BDF8' : '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: 'pointer',
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
            }}
          >
            <BellIcon size={19} color="#0F2A4A" />
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Sign In / Account Profile Button (Accessible Across All Desktop Tabs) */}
          {Boolean(setTab || onPressSignIn) && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (onPressSignIn) onPressSignIn();
                else if (setTab) setTab('profile');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: customerSession ? '#0284C7' : '#CBD5E1',
                backgroundColor: customerSession ? '#F0F9FF' : '#FFFFFF',
              }}
            >
              <UserIcon size={16} color={customerSession ? '#0284C7' : '#0F172A'} />
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: customerSession ? '#0284C7' : '#0F172A' }}>
                {customerSession?.user?.name
                  ? customerSession.user.name.split(' ')[0]
                  : lang === 1
                  ? 'সাইন ইন'
                  : 'Sign In'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
