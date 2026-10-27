import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import {
  TabHomeIcon,
  TabBookingsIcon,
  TabSupportIcon,
  TabProfileIcon,
} from './Icons';

export default function MobileTabs({
  tab,
  setTab,
  setDetail,
  setWiz,
  t,
  responsive,
  customerSession,
  loadCustomerNotifications,
  lang = 0,
}) {
  const tabs = [
    { key: 'home', Icon: TabHomeIcon, label: lang === 1 ? 'হোম' : 'Home' },
    { key: 'bookings', Icon: TabBookingsIcon, label: lang === 1 ? 'বুকিংস' : 'Bookings' },
    { key: 'help', Icon: TabSupportIcon, label: lang === 1 ? 'সাপোর্ট' : 'Support' },
    { key: 'profile', Icon: TabProfileIcon, label: lang === 1 ? 'প্রোফাইল' : 'Profile' },
  ];

  return (
    <View
      dataSet={{ flightcareFixedNav: 'true' }}
      {...(Platform.OS === 'web' ? { className: 'flightcare-mobile-nav-fixed' } : {})}
      style={{
        position: Platform.OS === 'web' ? 'fixed' : 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        zIndex: 99999,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 20,
        ...(Platform.OS === 'web'
          ? {
              boxShadow: '0 -2px 14px rgba(15, 23, 42, 0.10)',
              transform: 'translate3d(0, 0, 0)',
              WebkitTransform: 'translate3d(0, 0, 0)',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
            }
          : {
              paddingBottom: 6,
            }),
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 480,
          height: 62,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: 8,
        }}
      >
        {tabs.map(({ key, Icon, label }) => {
          const isActive = tab === key;
          const color = isActive ? '#0284C7' : '#64748B';
          const iconSize = 22;

          return (
            <TouchableOpacity
              key={key} 
              activeOpacity={0.8} 
              style={{ 
                flex: 1,
                maxWidth: 100,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 5,
                position: 'relative',
                ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
              }}
              onPress={() => {
                setTab(key);
                setDetail(null);
                setWiz(null);
              }}
            >
              <View style={{ height: 26, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={iconSize} color={color} />
              </View>
              <Text
                style={{
                  fontSize: 11,
                  marginTop: 2,
                  color,
                  fontWeight: isActive ? '700' : '500',
                  letterSpacing: -0.2,
                }}
              >
                {label}
              </Text>
              {isActive && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -3,
                    width: 32,
                    height: 3,
                    backgroundColor: '#0284C7',
                    borderRadius: 2,
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
