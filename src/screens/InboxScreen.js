import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { s } from '../styles/styles';
import { C } from '../constants/theme';
import { classifyNotification } from '../utils/helpers';
import ScreenHeaderBar from '../components/ScreenHeaderBar';

export default function InboxScreen({
  pagePadding,
  lang,
  t,
  notifications = [],
  userRole = 'guest',
  notificationFilter,
  setNotificationFilter,
  notificationsLoading,
  notificationsError,
  notificationReadBusyIds = [],
  markingAllNotificationsRead,
  markNotificationRead,
  markAllNotificationsRead,
  customerSession,
  loadCustomerNotifications,
  notify,
  requestPushPermission,
  setTab,
  onBack,
}) {
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeCategory, setComposeCategory] = useState('announcement');
  const [composeSendSms, setComposeSendSms] = useState(false);
  const [composeRecipientPhone, setComposeRecipientPhone] = useState('');
  const [composeError, setComposeError] = useState('');
  const [composeSuccess, setComposeSuccess] = useState('');
  const [pushStatus, setPushStatus] = useState('default');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(window.Notification.permission);
    }
  }, []);

  const handleEnablePush = async () => {
    if (typeof requestPushPermission === 'function') {
      const granted = await requestPushPermission();
      setPushStatus(granted ? 'granted' : 'denied');
      if (granted && typeof notify === 'function') {
        notify(
          lang ? '🔔 পুশ নোটিফিকেশন সক্রিয় হয়েছে!' : '🔔 Push Notifications Enabled!',
          lang ? 'এখন থেকে সকল ফ্লাইট ও বুকিং আপডেট তাৎক্ষণিক পাবেন।' : 'You will now receive instant flight and booking updates.',
          'announcement'
        );
      }
    }
  };

  const handleSendCustomNotification = () => {
    setComposeError('');
    setComposeSuccess('');
    if (!composeTitle.trim()) {
      setComposeError(lang ? 'নোটিফিকেশনের শিরোনাম লিখুন।' : 'Title is required.');
      return;
    }
    if (!composeBody.trim()) {
      setComposeError(lang ? 'নোটিফিকেশনের বার্তা লিখুন।' : 'Message body is required.');
      return;
    }

    if (typeof notify === 'function') {
      notify(composeTitle.trim(), composeBody.trim(), composeCategory, {
        sendSms: composeSendSms,
        recipientPhone: composeRecipientPhone.trim() || null,
      });
    }

    setComposeSuccess(lang ? 'নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!' : 'Notification sent successfully!');
    setTimeout(() => {
      setShowComposeModal(false);
      setComposeTitle('');
      setComposeBody('');
      setComposeSuccess('');
      setComposeError('');
    }, 1200);
  };

  const handleApplyPreset = (title, body, category) => {
    setComposeTitle(title);
    setComposeBody(body);
    setComposeCategory(category);
  };

  const displayText = value =>
    Array.isArray(value)
      ? value[lang] || value[0] || ''
      : value && typeof value === 'object'
        ? value[lang ? 'bn' : 'en'] || value.en || value.bn || ''
        : String(value || '');

  const channelLabel = channel =>
    typeof channel === 'string'
      ? channel
      : [channel.channel || channel.name, channel.status || channel.delivery_status]
          .filter(Boolean)
          .join(': ');

  // Adaptive tabs: Passengers & guests only see passenger categories; internal staff/managers see their authorized tabs
  const categories = React.useMemo(() => {
    const list = [
      ['all', t('inboxAll')],
      ['booking', t('inboxBookings')],
      ['service', t('inboxServices')],
    ];

    if (userRole === 'staff') {
      list.push(['staff_duty', lang ? 'প্রোটোকল অফিসার' : 'Protocol Officer']);
    } else if (userRole === 'manager') {
      list.push(['manager_alert', lang ? 'ম্যানেজার এলার্ট' : 'Manager Alerts']);
    } else if (userRole === 'super_admin') {
      list.push(['admin_alert', lang ? 'সুপার এডমিন' : 'Super Admin']);
      list.push(['manager_alert', lang ? 'ম্যানেজার এলার্ট' : 'Manager Alerts']);
    }

    list.push(
      ['payment', t('inboxPayments')],
      ['announcement', t('inboxAnnouncements')],
      ['promotion', t('inboxPromotions')]
    );
    return list;
  }, [userRole, lang, t]);

  const unreadCount = notifications.filter(item => !item.read).length;

  const categoryLabel = category => {
    const entry = categories.find(([key]) => key === category);
    if (entry) return entry[1];
    if (category === 'staff_duty') return lang ? 'প্রোটোকল অফিসার' : 'Protocol Officer';
    if (category === 'manager_alert') return lang ? 'ম্যানেজার এলার্ট' : 'Manager Alert';
    if (category === 'admin_alert') return lang ? 'সুপার এডমিন' : 'Super Admin';
    return t('inboxAnnouncements');
  };

  const categoryIcon = category =>
    ({
      booking: '🎫',
      payment: '💳',
      service: '🛫',
      staff_duty: '🧑‍✈️',
      manager_alert: '👔',
      admin_alert: '👑',
      announcement: '📢',
      promotion: '🎁',
    }[category] || '🔔');

  const notificationDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString(lang ? 'bn-BD' : 'en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
  };

  const visibleNotifications =
    notificationFilter === 'all'
      ? notifications
      : notifications.filter(
          item =>
            (item.category || classifyNotification(item.type || item.event_type)) === notificationFilter ||
            item.targetRole === notificationFilter
        );

  return (
    <ScrollView contentContainerStyle={{ padding: pagePadding, paddingBottom: 90 }}>
      {/* Top Navigation Back Bar */}
      <ScreenHeaderBar
        title={lang ? 'ইনবক্স ও নোটিফিকেশন' : 'Inbox & Alerts'}
        subtitle={lang ? 'ফ্লাইট ও সার্ভিসের সকল বার্তা' : 'Flight & service notifications'}
        onBack={onBack || (() => setTab && setTab('home'))}
        onHome={() => setTab && setTab('home')}
        lang={lang}
      />

      {/* Header and Actions */}
      <View style={s.managerHeader}>
        <View style={s.inboxHeading}>
          <View>
            <Text style={s.h2}>{t('notifications')}</Text>
            <Text style={s.inboxSubtitle}>
              {t('unreadNotifications').replace('{count}', String(unreadCount))}
            </Text>
          </View>
          <View style={[s.inboxActions, { flexWrap: 'wrap', gap: 8 }]}>
            {/* Compose / Broadcast Button - Manager & Super Admin ONLY */}
            {(userRole === 'manager' || userRole === 'super_admin') && (
              <TouchableOpacity
                onPress={() => setShowComposeModal(true)}
                style={[s.primaryButton, { paddingVertical: 8, paddingHorizontal: 14 }]}
              >
                <Text style={[s.primaryButtonText, { fontSize: 13 }]}>
                  {lang ? '✉️ নতুন নোটিফিকেশন পাঠান' : '✉️ Send Notification'}
                </Text>
              </TouchableOpacity>
            )}

            {unreadCount > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('markAllNotificationsRead')}
                disabled={markingAllNotificationsRead}
                onPress={markAllNotificationsRead}
                style={[s.inboxActionButton, markingAllNotificationsRead && s.managerDisabled]}
              >
                <Text style={s.inboxActionText}>
                  {markingAllNotificationsRead ? '…' : t('markAllNotificationsRead')}
                </Text>
              </TouchableOpacity>
            ) : null}
            {customerSession?.token ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('refreshNotifications')}
                disabled={notificationsLoading}
                onPress={loadCustomerNotifications}
              >
                <Text style={s.link}>{notificationsLoading ? '…' : '↻'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* Browser Push Permission Enable Banner */}
      {Platform.OS === 'web' && pushStatus !== 'granted' && (
        <View
          style={{
            backgroundColor: '#EFF6FF',
            borderColor: '#BFDBFE',
            borderWidth: 1,
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E3A8A' }}>
              {lang ? '🔔 ব্রাউজার পুশ নোটিফিকেশন সক্রিয় নেই' : '🔔 Push Notifications are Disabled'}
            </Text>
            <Text style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>
              {lang
                ? 'ফ্লাইট ডিলে বা প্রোটোকল অফিসারের আগমন সরাসরি স্ক্রিনে দেখতে পারমিশন দিন।'
                : 'Enable alerts to get instant popup notifications for flight updates and arrivals.'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleEnablePush}
            style={{
              backgroundColor: '#2563EB',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>
              {lang ? 'সক্রিয় করুন' : 'Enable Now'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.notificationFilters}
      >
        {categories.map(([category, label]) => (
          <TouchableOpacity
            key={category}
            style={[s.staffFilter, notificationFilter === category && s.staffFilterActive]}
            onPress={() => setNotificationFilter(category)}
          >
            <Text
              style={[
                s.staffFilterText,
                notificationFilter === category && s.staffFilterTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {notificationsError ? (
        <Text style={s.managerError}>{notificationsError}</Text>
      ) : null}
      {notificationsLoading ? <Text style={s.muted}>…</Text> : null}
      {!visibleNotifications.length && !notificationsLoading ? (
        <Text style={s.muted}>
          {notificationFilter === 'all'
            ? t('noNotifications')
            : t('noNotificationsInCategory')}
        </Text>
      ) : null}

      {/* Notifications List */}
      {visibleNotifications.map(item => {
        const category =
          item.category || classifyNotification(item.type || item.event_type);
        return (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${categoryLabel(category)}: ${displayText(item.title)}`}
            accessibilityState={{ disabled: notificationReadBusyIds.includes(item.id) }}
            style={[s.notificationCard, !item.read && s.notificationUnread]}
            onPress={() => markNotificationRead(item)}
          >
            <View style={s.notificationCardHeader}>
              <View
                style={[
                  s.notificationCategoryIcon,
                  s[`notificationCategory_${category}`],
                ]}
              >
                <Text style={s.notificationCategoryEmoji}>{categoryIcon(category)}</Text>
              </View>
              <View style={s.notificationContent}>
                <View style={s.notificationTitleRow}>
                  <Text style={s.notificationTitle}>{displayText(item.title)}</Text>
                  {!item.read ? <View style={s.unreadDot} /> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  <Text style={s.notificationCategoryLabel}>{categoryLabel(category)}</Text>
                  {item.targetRole && (
                    <View
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        borderRadius: 6,
                        backgroundColor:
                          item.targetRole === 'super_admin'
                            ? '#FEF3C7'
                            : item.targetRole === 'manager'
                            ? '#EDE9FE'
                            : item.targetRole === 'staff'
                            ? '#E0F2FE'
                            : '#DCFCE7',
                        borderWidth: 1,
                        borderColor:
                          item.targetRole === 'super_admin'
                            ? '#FDE68A'
                            : item.targetRole === 'manager'
                            ? '#DDD6FE'
                            : item.targetRole === 'staff'
                            ? '#BAE6FD'
                            : '#BBF7D0',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color:
                            item.targetRole === 'super_admin'
                              ? '#B45309'
                              : item.targetRole === 'manager'
                              ? '#6D28D9'
                              : item.targetRole === 'staff'
                              ? '#0284C7'
                              : '#15803D',
                        }}
                      >
                        {item.targetRole === 'super_admin'
                          ? (lang ? '👑 সুপার এডমিন' : '👑 Super Admin')
                          : item.targetRole === 'manager'
                          ? (lang ? '👔 ম্যানেজার' : '👔 Manager')
                          : item.targetRole === 'staff'
                          ? (lang ? '🧑‍✈️ প্রোটোকল অফিসার' : '🧑‍✈️ Protocol Officer')
                          : (lang ? '👤 যাত্রী' : '👤 Passenger')}
                      </Text>
                    </View>
                  )}
                  {item.step && (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#475569' }}>
                        {String(item.step).toUpperCase().replace(/_/g, ' ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Text style={s.notificationBody}>{displayText(item.body)}</Text>
            {item.created_at ? (
              <Text style={s.notificationMeta}>{notificationDate(item.created_at)}</Text>
            ) : null}
            {Array.isArray(item.channels) && item.channels.length ? (
              <Text style={s.notificationMeta}>
                {t('notificationChannels')}:{' '}
                {item.channels.map(channelLabel).filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}

      {/* Compose Notification Modal */}
      <Modal
        visible={showComposeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComposeModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxWidth: 540, width: '92%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={s.h2}>{lang ? '✉️ নতুন নোটিফিকেশন পাঠান' : '✉️ Send New Notification'}</Text>
              <TouchableOpacity onPress={() => setShowComposeModal(false)}>
                <Text style={{ fontSize: 20, color: '#64748B', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.muted, { marginBottom: 12 }]}>
              {lang
                ? 'ব্রাউজার পুশ, অ্যাপ ইনবক্স ও ফায়ারবেস ক্লাউডে তাৎক্ষণিক নোটিফিকেশন সম্প্রচার করুন।'
                : 'Broadcast notifications to browser push, app inbox, and Firebase cloud database.'}
            </Text>

            {/* Quick Templates */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6 }}>
              {lang ? '⚡ দ্রুত টেমপ্লেট নির্বাচন করুন:' : '⚡ Quick Templates:'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() =>
                  handleApplyPreset(
                    lang ? '✈️ ফ্লাইট আপডেট: BG-084 সময়মতো অবতরণ করেছে' : '✈️ Flight Update: BG-084 Landed On Time',
                    lang ? 'আপনার প্রোটোকল টিম টার্মিনাল ১ এর ভিআইপি ক্যানোপিতে অপেক্ষমান।' : 'Protocol team is standby at Terminal 1 VIP canopy.',
                    'service'
                  )
                }
                style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 8, marginRight: 8 }}
              >
                <Text style={{ fontSize: 11, color: '#334155' }}>✈️ {lang ? 'ফ্লাইট আপডেট' : 'Flight Update'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  handleApplyPreset(
                    lang ? '🎁 উৎসব অফার: সকল সার্ভিসে ১৫% ডিসকাউন্ট!' : '🎁 Festival Offer: 15% Off All Services!',
                    lang ? 'প্রোমো কোড EIDVIP ব্যবহার করে আজই বুকিং নিশ্চিত করুন।' : 'Use promo code EIDVIP for exclusive airport discounts.',
                    'promotion'
                  )
                }
                style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginRight: 8 }}
              >
                <Text style={{ fontSize: 11, color: '#92400E' }}>🎁 {lang ? 'প্রমোশন অফার' : 'Promo Offer'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  handleApplyPreset(
                    lang ? '📢 শাহজালাল বিমানবন্দর: টার্মিনাল ৩ লাউঞ্জ এখন সচল' : '📢 HSIA: Terminal 3 VIP Lounge Now Active',
                    lang ? 'আমাদের বিশেষ মিট অ্যান্ড গ্রিট প্যাকেজের সাথে উপভোগ করুন এক্সক্লুসিভ লাউঞ্জ সুবিধা।' : 'Enjoy premier luxury lounge access with Meet & Greet.',
                    'announcement'
                  )
                }
                style={{ backgroundColor: '#E0F2FE', padding: 8, borderRadius: 8, marginRight: 8 }}
              >
                <Text style={{ fontSize: 11, color: '#0369A1' }}>📢 {lang ? 'জরুরি ঘোষণা' : 'Announcement'}</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Inputs */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B', marginBottom: 4 }}>
              {lang ? 'শিরোনাম (Title)' : 'Notification Title'}
            </Text>
            <TextInput
              style={[s.input, { marginBottom: 10 }]}
              placeholder={lang ? 'যেমন: ফ্লাইট শিডিউল আপডেট' : 'e.g. Flight Schedule Update'}
              value={composeTitle}
              onChangeText={setComposeTitle}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B', marginBottom: 4 }}>
              {lang ? 'বার্তা (Message Body)' : 'Notification Body'}
            </Text>
            <TextInput
              style={[s.input, { height: 70, textAlignVertical: 'top', marginBottom: 10 }]}
              placeholder={lang ? 'নোটিফিকেশনের বিস্তারিত লিখুন…' : 'Write detailed notification message…'}
              multiline
              value={composeBody}
              onChangeText={setComposeBody}
            />

            {/* Category Picker */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B', marginBottom: 4 }}>
              {lang ? 'বিভাগ (Category)' : 'Category'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {['announcement', 'promotion', 'service', 'booking', 'payment'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setComposeCategory(cat)}
                  style={{
                    backgroundColor: composeCategory === cat ? C.primary : '#F1F5F9',
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 11, color: composeCategory === cat ? '#FFFFFF' : '#475569', fontWeight: 'bold' }}>
                    {categoryIcon(cat)} {categoryLabel(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {composeError ? <Text style={[s.managerError, { marginBottom: 8 }]}>{composeError}</Text> : null}
            {composeSuccess ? (
              <Text style={{ color: '#059669', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
                ✓ {composeSuccess}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setShowComposeModal(false)}
                style={[s.authSecondaryButton, { paddingVertical: 10, paddingHorizontal: 16 }]}
              >
                <Text style={s.authSecondaryButtonText}>{lang ? 'বাতিল' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendCustomNotification}
                style={[s.primaryButton, { paddingVertical: 10, paddingHorizontal: 20 }]}
              >
                <Text style={s.primaryButtonText}>{lang ? '🚀 নোটিফিকেশন পাঠান' : '🚀 Send Notification'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
