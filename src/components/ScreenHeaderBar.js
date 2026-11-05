import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Universal Screen Top Header Bar with prominent Back button, Notification icon and Home shortcut
 */
export default function ScreenHeaderBar({
  title,
  subtitle,
  onBack,
  lang = 0,
  backLabel,
  showHome = true,
  onHome,
  rightAction = null,
  showNotifications = true,
  onNotifications,
  unreadCount = 0,
}) {
  const isBn = lang === 1;
  const defaultBackLabel = isBn ? 'ফিরে যান' : 'Back';
  const [localUnread, setLocalUnread] = useState(unreadCount);
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('@flightcare_notifications')
      .then(raw => {
        if (!active || !raw) return;
        try {
          const list = JSON.parse(raw);
          const count = (list || []).filter(n => !n.read).length;
          setLocalUnread(count);
        } catch {}
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [unreadCount]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: isMobile ? 8 : 10,
        marginBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: isMobile ? 8 : 12,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      {/* 1. Left Back Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onBack}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: isMobile ? 4 : 6,
          backgroundColor: '#F1F5F9',
          paddingVertical: isMobile ? 6 : 7,
          paddingHorizontal: isMobile ? 9 : 12,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#CBD5E1',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        accessibilityRole="button"
        accessibilityLabel={backLabel || defaultBackLabel}
      >
        <Text style={{ fontSize: isMobile ? 15 : 16, color: '#0284C7', fontWeight: '900', lineHeight: 18 }}>←</Text>
        <Text style={{ fontSize: isMobile ? 12 : 13, fontWeight: '700', color: '#1E293B' }}>
          {backLabel || defaultBackLabel}
        </Text>
      </TouchableOpacity>

      {/* 2. Center Title & Subtitle */}
      {title ? (
        <View style={{ flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: isMobile ? 4 : 8, overflow: 'hidden' }}>
          <Text
            style={{ fontSize: isMobile ? 13.5 : 15, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{ fontSize: isMobile ? 10 : 11, color: '#64748B', marginTop: 1, textAlign: 'center' }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* 3. Right Action, Notification Bell & Home Shortcut */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: isMobile ? 6 : 8, flexShrink: 0 }}>
        {showNotifications && (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              if (typeof onNotifications === 'function') {
                onNotifications();
              } else if (typeof onHome === 'function') {
                onHome('inbox');
              } else if (typeof window !== 'undefined' && window.location) {
                window.location.hash = '#/inbox';
              }
            }}
            style={{
              width: isMobile ? 32 : 34,
              height: isMobile ? 32 : 34,
              borderRadius: 10,
              backgroundColor: localUnread > 0 ? '#EFF6FF' : '#F8FAFC',
              borderWidth: 1.5,
              borderColor: localUnread > 0 ? '#38BDF8' : '#CBD5E1',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: 'pointer',
            }}
            accessibilityRole="button"
            accessibilityLabel={isBn ? 'নোটিফিকেশন' : 'Notifications'}
          >
            <Text style={{ fontSize: 16 }}>🔔</Text>
            {localUnread > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 3,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' }}>
                  {localUnread > 99 ? '99+' : localUnread}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {rightAction ? (
          rightAction
        ) : showHome ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => (typeof onHome === 'function' ? onHome('home') : onBack ? onBack() : null)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: '#F0F9FF',
              borderWidth: 1,
              borderColor: '#BAE6FD',
              cursor: 'pointer',
            }}
            accessibilityRole="button"
            accessibilityLabel={isBn ? 'হোম' : 'Home'}
          >
            <Text style={{ fontSize: 12 }}>🏠</Text>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0284C7' }}>
              {isBn ? 'হোম' : 'Home'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 10 }} />
        )}
      </View>
    </View>
  );
}

