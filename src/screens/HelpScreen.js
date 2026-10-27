import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { s } from '../styles/styles';
import { FAQ } from '../constants/data';
import { SUPPORT_PHONE, SUPPORT_EMAIL } from '../constants/theme';
import ScreenHeaderBar from '../components/ScreenHeaderBar';

export default function HelpScreen({
  pagePadding,
  lang,
  t,
  supportCategory,
  setSupportCategory,
  supportSearch,
  setSupportSearch,
  openFaqId,
  setOpenFaqId,
  setTab,
  onBack,
}) {
  const categoryLabels = {
    booking: t('supportBooking'),
    payment: t('supportPayment'),
    cancellation: t('supportCancellation'),
    refund: t('supportRefund'),
    general: t('supportGeneral'),
  };
  const categories = [['all', t('supportAll')], ...Object.entries(categoryLabels)];
  const quickHelp = [
    { category: 'booking', icon: '🎫', label: t('supportBooking') },
    { category: 'payment', icon: '💳', label: t('supportPayment') },
    { category: 'cancellation', icon: '↩', label: t('supportCancellation') },
  ];

  const searchTerm = supportSearch.trim().toLocaleLowerCase();
  const visibleFaq = FAQ.filter(item => {
    const matchesCategory = supportCategory === 'all' || item.category === supportCategory;
    const matchesSearch =
      !searchTerm ||
      [item.question, item.answer]
        .flat()
        .join(' ')
        .toLocaleLowerCase()
        .includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  const supportPhoneDigits = SUPPORT_PHONE.replace(/\D/g, '');
  const whatsappUrl =
    supportPhoneDigits.length >= 7
      ? `https://wa.me/${supportPhoneDigits}?text=${encodeURIComponent(
          'Hello, I need FlightCare support.'
        )}`
      : '';
  const emailUrl = SUPPORT_EMAIL
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('FlightCare support')}`
    : '';

  const openContact = async url => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('supportContactUnavailable'));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: pagePadding, paddingBottom: 115 }}>
      {/* Top Navigation Back Bar */}
      <ScreenHeaderBar
        title={lang === 1 ? 'সাহায্য ও সাপোর্ট' : 'Help & Support'}
        subtitle={lang === 1 ? 'প্রশ্নোত্তর ও সার্বক্ষণিক কাস্টমার কেয়ার' : 'FAQs & 24/7 customer care'}
        onBack={onBack || (() => setTab && setTab('home'))}
        onHome={() => setTab && setTab('home')}
        lang={lang}
      />

      {/* Support Hero Banner */}
      <View style={s.supportHero}>
        <Text style={s.supportHeroIcon}>✦</Text>
        <Text style={s.supportHeroTitle}>{t('supportTitle')}</Text>
        <Text style={s.supportHeroBody}>{t('supportIntro')}</Text>
      </View>

      {/* Direct Contact Panel */}
      <View style={s.supportContactPanel}>
        <Text style={s.widgetTitle}>{t('contactSupport')}</Text>
        <Text style={s.supportContactHint}>{t('contactSupportHint')}</Text>
        {whatsappUrl ? (
          <TouchableOpacity
            accessibilityRole="link"
            style={s.supportContactAction}
            onPress={() => openContact(whatsappUrl)}
          >
            <Text style={s.supportContactIcon}>◉</Text>
            <Text style={s.supportContactText}>
              {t('wa')} · {SUPPORT_PHONE}
            </Text>
            <Text style={s.searchResultArrow}>›</Text>
          </TouchableOpacity>
        ) : null}
        {emailUrl ? (
          <TouchableOpacity
            accessibilityRole="link"
            style={s.supportContactAction}
            onPress={() => openContact(emailUrl)}
          >
            <Text style={s.supportContactIcon}>✉</Text>
            <Text style={s.supportContactText}>
              {t('supportEmail')} · {SUPPORT_EMAIL}
            </Text>
            <Text style={s.searchResultArrow}>›</Text>
          </TouchableOpacity>
        ) : null}
        {!whatsappUrl && !emailUrl ? (
          <Text style={s.supportContactUnavailable}>
            {t('supportContactUnavailable')}
          </Text>
        ) : null}
      </View>

      {/* Quick Help Actions */}
      <Text style={s.supportSectionTitle}>{t('supportQuickHelp')}</Text>
      <View style={s.supportQuickActions}>
        {quickHelp.map(item => (
          <TouchableOpacity
            key={item.category}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={[
              s.supportQuickAction,
              supportCategory === item.category && s.supportQuickActionActive,
            ]}
            onPress={() => {
              setSupportCategory(item.category);
              setSupportSearch('');
              setOpenFaqId(`${item.category}-0`);
            }}
          >
            <Text style={s.supportQuickIcon}>{item.icon}</Text>
            <Text style={s.supportQuickLabel}>{item.label}</Text>
            <Text style={s.searchResultArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search and Category Filter */}
      <Text style={s.supportSectionTitle}>{t('supportAll')}</Text>
      <View style={s.supportSearchWrap}>
        <Text style={s.supportSearchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel={t('supportSearchFaq')}
          style={s.supportSearch}
          placeholder={t('supportSearchFaq')}
          placeholderTextColor="#758397"
          value={supportSearch}
          onChangeText={setSupportSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {supportSearch ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('supportClearSearch')}
            onPress={() => setSupportSearch('')}
          >
            <Text style={s.supportClearSearch}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.supportCategories}>
        {categories.map(([category, label]) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: supportCategory === category }}
            key={category}
            style={[
              s.staffFilter,
              supportCategory === category && s.staffFilterActive,
            ]}
            onPress={() => setSupportCategory(category)}
          >
            <Text
              style={[
                s.staffFilterText,
                supportCategory === category && s.staffFilterTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.supportResultCount}>
        {visibleFaq.length === 1
          ? t('supportOneQuestion')
          : t('supportQuestionCount').replace('{count}', String(visibleFaq.length))}
      </Text>

      {!visibleFaq.length ? (
        <Text style={s.supportEmpty}>{t('supportNoFaq')}</Text>
      ) : null}

      {/* FAQ Accordion List */}
      {visibleFaq.map((item, index) => {
        const id = `${item.category}-${index}`;
        const expanded = openFaqId === id;
        return (
          <TouchableOpacity
            key={id}
            accessibilityRole="button"
            accessibilityLabel={item.question[lang]}
            accessibilityState={{ expanded }}
            style={s.supportFaq}
            onPress={() => setOpenFaqId(expanded ? '' : id)}
          >
            <View style={s.supportFaqHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.supportFaqCategory}>
                  {categoryLabels[item.category]}
                </Text>
                <Text style={s.supportFaqQuestion}>{item.question[lang]}</Text>
              </View>
              <Text style={s.supportFaqToggle}>{expanded ? '−' : '+'}</Text>
            </View>
            {expanded ? (
              <Text style={s.supportFaqAnswer}>{item.answer[lang]}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
      {/* Statutory Business Info & Registered Address */}
      <View
        style={{
          marginTop: 20,
          backgroundColor: '#0F172A',
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: '#334155',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 }}>
          Flight Care Technologies Ltd.
        </Text>
        <Text style={{ fontSize: 11, color: '#94A3B8', lineHeight: 16 }}>
          📍 {lang === 1 ? 'নিবন্ধিত কার্যালয়:' : 'Registered Office:'} Terminal 1 & 2, Hazrat Shahjalal International Airport (HSIA), Kurmitola, Dhaka-1229, Bangladesh.
        </Text>
        <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 4 }}>
          CAAB Certified Ground Concierge Partner • Verified SSLCommerz Merchant
        </Text>
      </View>
    </ScrollView>
  );
}

