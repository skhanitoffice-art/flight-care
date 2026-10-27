import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { s } from '../styles/styles';
import { StandardPkgIcon, PremiumPkgIcon, VipPkgIcon } from './Icons';

export default function ServiceGrid({
  cat,
  serviceCatalog = [],
  setDetail,
  startBooking,
  responsive,
  lang = 0,
}) {
  const packageCards = [
    {
      key: 'standard',
      label: 'Standard',
      labelBn: 'স্ট্যান্ডার্ড',
      icon: '🛫',
      image: require('../../assets/pkg_standard.webp'),
      packageId: 'economy',
      price: lang ? '৫০০ টাকা' : '500 Tk',
      priceColor: '#0284C7',
      bg: '#FFFFFF',
      border: '#38BDF8',
      shadow: '#0284C7',
    },
    {
      key: 'premium',
      label: 'Premium',
      labelBn: 'প্রিমিয়াম',
      icon: '💎',
      image: require('../../assets/pkg_premium.webp'),
      packageId: 'business',
      price: lang ? '১০০০ টাকা' : '1000 Tk',
      priceColor: '#7C3AED',
      bg: '#FFFFFF',
      border: '#A78BFA',
      shadow: '#7C3AED',
    },
    {
      key: 'vip',
      label: 'VIP',
      labelBn: 'ভিআইপি',
      icon: '👑',
      image: require('../../assets/pkg_vip.webp'),
      packageId: 'first',
      price: lang ? '১৫০০ টাকা' : '1500 Tk',
      priceColor: '#D97706',
      bg: '#FFFFFF',
      border: '#FBBF24',
      shadow: '#D97706',
    },
    {
      key: 'extra',
      label: 'Additional Service',
      labelBn: 'এডিশনাল সার্ভিস',
      icon: '⏰',
      image: require('../../assets/pkg_additional.webp'),
      price: null,
      priceColor: null,
      bg: '#FFFFFF',
      border: '#F43F5E',
      shadow: '#E11D48',
    },
  ];

  return (
    <View style={s.serviceGrid}>
      {packageCards.map(item => (
        <TouchableOpacity
          key={`${cat}-${item.key}`}
          style={[
            s.packageOption,
            responsive.isWide && s.packageCard3D,
            responsive.isWide && {
              paddingVertical: 14,
              paddingHorizontal: 8,
            },
            !responsive.isWide && { marginBottom: 2 },
          ]}
          activeOpacity={0.75}
          {...(responsive.isWide && Platform.OS === 'web' ? { className: 'flightcare-hover-lift' } : {})}
          onPress={() => {
            const firstService = serviceCatalog.find(service => service.cat === cat) || null;
            if (item.key === 'extra' || item.key === 'another') {
              if (firstService) setDetail(firstService);
              return;
            }
            const packageId =
              item.packageId ||
              (item.key === 'standard'
                ? 'economy'
                : item.key === 'premium'
                  ? 'business'
                  : item.key === 'vip'
                    ? 'first'
                    : 'economy');
            startBooking(firstService || null, [], packageId, cat);
          }}
        >
          {/* Icon Wrap */}
          <View
            style={[
              s.packageCardIconWrap,
              {
                backgroundColor: item.bg,
                borderColor: item.border,
                shadowColor: item.shadow,
                width: responsive.iconSize,
                height: responsive.iconSize,
                borderRadius: responsive.iconRadius,
                marginBottom: !responsive.isWide ? 5 : 10,
                overflow: 'hidden',
              },
            ]}
            {...(responsive.isWide && Platform.OS === 'web' ? { className: 'package-card-icon-wrap' } : {})}
          >
            {item.key === 'standard' ? (
              <StandardPkgIcon size={Math.round(responsive.iconSize * 0.65)} color="#0284C7" />
            ) : item.key === 'premium' ? (
              <PremiumPkgIcon size={Math.round(responsive.iconSize * 0.65)} color="#2563EB" />
            ) : item.key === 'vip' ? (
              <VipPkgIcon size={Math.round(responsive.iconSize * 0.65)} color="#D97706" />
            ) : item.image ? (
              <Image
                source={item.image}
                style={{
                  width: '92%',
                  height: '92%',
                }}
                resizeMode="contain"
              />
            ) : (
              <Text style={[s.packageCardEmoji, { fontSize: responsive.emojiSize }]}>
                {item.icon}
              </Text>
            )}
          </View>

          {/* Title / Label */}
          <Text
            style={[
              responsive.isWide ? s.packageCardTitle : s.packageOptionLabel,
              { fontSize: responsive.labelSize, textAlign: 'center' },
              !responsive.isWide && {
                minHeight: item.price ? 16 : 32,
                marginTop: 1,
              },
            ]}
            numberOfLines={responsive.isWide ? 1 : item.price ? 1 : 2}
          >
            {lang ? item.labelBn : item.label}
          </Text>

          {/* Price - Standard: ৫০০ টাকা, Premium: ১০০০ টাকা, VIP: ১৫০০ টাকা (Both PC Web & Mobile) */}
          {item.price ? (
            <Text
              style={[
                s.packageCardPrice,
                {
                  fontSize: responsive.isWide
                    ? Math.max(13, responsive.labelSize - 1)
                    : responsive.isCompact
                      ? 10
                      : 11,
                  color: item.priceColor || '#0284C7',
                  marginTop: responsive.isWide ? 4 : 2,
                },
              ]}
              numberOfLines={1}
            >
              {item.price}
            </Text>
          ) : responsive.isWide ? (
            <View style={{ height: Math.max(13, responsive.labelSize - 1) + 4 }} />
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}
