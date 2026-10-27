import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { triggerFileDownload, BACKUP_STORAGE_KEYS } from '../../services/dataBackupService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SMS_PROVIDERS,
  getSmsGatewayConfig,
  saveSmsGatewayConfig,
  sendLiveSms,
} from '../../services/smsGateway';

export default function AdminNotificationsTab({
  notifications = [],
  setNotifications,
  sendNotification,
  managerSession,
  lang = 0,
  s = {},
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('announcement'); // 'announcement' | 'flight_alert' | 'security' | 'promo'
  const [targetAudience, setTargetAudience] = useState('all'); // 'all' | 'staff' | 'vip'
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // SMS Gateway Configuration State
  const [smsProvider, setSmsProvider] = useState(SMS_PROVIDERS.SIMULATED);
  const [smsApiKey, setSmsApiKey] = useState('');
  const [smsSenderId, setSmsSenderId] = useState('FlightCare');
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [smsConfigSavedNotice, setSmsConfigSavedNotice] = useState('');

  useEffect(() => {
    getSmsGatewayConfig().then((cfg) => {
      if (cfg) {
        setSmsProvider(cfg.provider || SMS_PROVIDERS.SIMULATED);
        setSmsApiKey(cfg.apiKey || '');
        setSmsSenderId(cfg.senderId || 'FlightCare');
      }
    });
  }, []);

  const handleSaveSmsConfig = async () => {
    const success = await saveSmsGatewayConfig({
      provider: smsProvider,
      apiKey: smsApiKey.trim(),
      senderId: smsSenderId.trim() || 'FlightCare',
    });
    if (success) {
      setSmsConfigSavedNotice(lang ? 'এসএমএস গেটওয়ে কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে!' : 'SMS Gateway configuration saved successfully!');
      setTimeout(() => setSmsConfigSavedNotice(''), 4500);
    }
  };

  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      setErrorMsg(lang ? 'অনুগ্রহ করে টেস্ট করার জন্য একটি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)' : 'Please enter a test mobile number (e.g. 017XXXXXXXX)');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    setTestSending(true);
    setTestResult(null);
    try {
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const res = await sendLiveSms({
        to: testPhone.trim(),
        message: `[Flight Care] আপনার ওটিপি ভেরিফিকেশন টেস্ট কোড: ${otpCode}। সিস্টেম সফলভাবে সংযুক্ত রয়েছে।`,
        otp: otpCode,
        title: 'Gateway Live Test',
      });
      setTestResult(res);
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTestSending(false);
    }
  };

  const handleSendBroadcast = () => {
    if (!title.trim() || !body.trim()) {
      setErrorMsg(lang ? 'অনুগ্রহ করে শিরোনাম ও বার্তার বিবরণ লিখুন।' : 'Please enter notification title and message.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const newNotification = {
      id: `NOTIF-${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      category,
      targetAudience,
      read: false,
      source: 'manager_broadcast',
      senderEmail: managerSession?.user?.email || 'admin@flightcare.app',
      created_at: new Date().toISOString(),
    };

    if (sendNotification) {
      sendNotification(title.trim(), body.trim(), category, { targetUserId: targetAudience });
    } else if (setNotifications) {
      setNotifications(curr => {
        const updated = [newNotification, ...curr];
        AsyncStorage.setItem(BACKUP_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    }

    setTitle('');
    setBody('');
    setNotice(lang ? 'ব্রডকাস্ট নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!' : 'Broadcast notification dispatched successfully!');
    setTimeout(() => setNotice(''), 4500);
  };

  const handleExportNotificationsCsv = () => {
    const headers = ['ID', 'Title', 'Message', 'Category', 'Target', 'Sent At', 'Read'];
    const rows = (notifications || []).map(n => [
      `"${n.id || ''}"`,
      `"${(n.title || '').replace(/"/g, '""')}"`,
      `"${(n.body || '').replace(/"/g, '""')}"`,
      `"${n.category || 'general'}"`,
      `"${n.targetAudience || 'all'}"`,
      `"${n.created_at || ''}"`,
      n.read ? 'Yes' : 'No',
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    triggerFileDownload(`FlightCare_Notifications_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8;');
  };

  const handleClearNotifications = () => {
    const confirmMsg = lang ? 'আপনি কি সব নোটিফিকেশন মুছে ফেলতে চান?' : 'Are you sure you want to clear all notification logs?';
    const doClear = () => {
      if (setNotifications) {
        setNotifications([]);
        AsyncStorage.setItem(BACKUP_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([])).catch(() => {});
      }
      setNotice(lang ? 'নোটিফিকেশন তালিকা মুছে ফেলা হয়েছে।' : 'Notification logs cleared.');
      setTimeout(() => setNotice(''), 3000);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) doClear();
    } else {
      Alert.alert('Clear Notifications', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: doClear },
      ]);
    }
  };

  return (
    <View style={[s.pagePanel, { paddingBottom: 24 }]}>
      {notice ? (
        <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#A7F3D0' }}>
          <Text style={{ color: '#065F46', fontWeight: '700', fontSize: 13 }}>✓ {notice}</Text>
        </View>
      ) : null}

      {errorMsg ? (
        <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#FECACA' }}>
          <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 13 }}>⚠️ {errorMsg}</Text>
        </View>
      ) : null}

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
            <Text style={s.pageTitle}>{lang ? 'নোটিফিকেশন ও ব্রডকাস্ট সেন্টার' : 'Notifications & Broadcast Center'}</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#64748B', marginTop: -4 }}>
            {lang ? 'গ্রাহক ও প্রোটোকল অফিসারদের গুরুত্বপূর্ণ নোটিশ ব্রডকাস্ট করুন এবং সিস্টেম লগ পর্যবেক্ষণ করুন' : 'Broadcast operational alerts and review notification dispatch logs'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleExportNotificationsCsv}
          style={{
            backgroundColor: '#0284C7',
            paddingVertical: 9,
            paddingHorizontal: 16,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 14, color: '#FFFFFF' }}>⬇</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
            {lang ? 'লগ CSV ডাউনলোড' : 'Export Logs (CSV)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 1. Broadcast Composer Card */}
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#CBD5E1', marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Text style={{ fontSize: 18 }}>📢</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
            {lang ? 'নতুন ব্রডকাস্ট বা নোটিফিকেশন পাঠান' : 'Send New Broadcast Notification'}
          </Text>
        </View>

        {/* Category & Audience Selectors */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              {lang ? 'ক্যাটাগরি:' : 'Category:'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {[
                ['announcement', lang ? 'ঘোষণা' : 'Announcement'],
                ['flight_alert', lang ? 'ফ্লাইট অ্যালার্ট' : 'Flight Alert'],
                ['security', lang ? 'নিরাপত্তা' : 'Security'],
                ['promo', lang ? 'অফার / প্রোমো' : 'Promotion'],
              ].map(([k, lbl]) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setCategory(k)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: category === k ? '#0284C7' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: category === k ? '#0284C7' : '#CBD5E1',
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: category === k ? '#FFFFFF' : '#334155' }}>
                    {lbl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 200 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              {lang ? 'প্রাপক / টার্গেট অডিয়েন্স:' : 'Target Audience:'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {[
                ['all', lang ? 'সকল ব্যবহারকারী' : 'All Users'],
                ['staff', lang ? 'শুধুমাত্র স্টাফ' : 'Officers Only'],
                ['vip', lang ? 'ভিআইপি গ্রাহক' : 'VIP Passengers'],
              ].map(([k, lbl]) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setTargetAudience(k)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: targetAudience === k ? '#059669' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: targetAudience === k ? '#059669' : '#CBD5E1',
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: targetAudience === k ? '#FFFFFF' : '#334155' }}>
                    {lbl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Inputs */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={lang ? 'নোটিফিকেশন শিরোনাম (যেমন: টার্মিনাল ১ প্রবেশদ্বারে ট্রাফিক আপডেট)' : 'Notification Title (e.g., Terminal 1 Gate Protocol Advisory)'}
          placeholderTextColor="#94A3B8"
          style={{
            backgroundColor: '#F8FAFC',
            borderWidth: 1.5,
            borderColor: '#CBD5E1',
            borderRadius: 10,
            padding: 10,
            fontSize: 13,
            color: '#0F172A',
            marginBottom: 10,
          }}
        />

        <TextInput
          multiline
          numberOfLines={3}
          value={body}
          onChangeText={setBody}
          placeholder={lang ? 'বার্তার বিস্তারিত বিবরণ লিখুন...' : 'Enter message details...'}
          placeholderTextColor="#94A3B8"
          style={{
            backgroundColor: '#F8FAFC',
            borderWidth: 1.5,
            borderColor: '#CBD5E1',
            borderRadius: 10,
            padding: 10,
            fontSize: 13,
            color: '#0F172A',
            height: 70,
            textAlignVertical: 'top',
            marginBottom: 12,
          }}
        />

        <TouchableOpacity
          onPress={handleSendBroadcast}
          style={{
            backgroundColor: '#0284C7',
            paddingVertical: 11,
            borderRadius: 10,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 16 }}>🚀</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
            {lang ? 'ব্রডকাস্ট নোটিফিকেশন পাঠান' : 'Dispatch Broadcast'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. SMS Gateway & OTP Configuration Card */}
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#CBD5E1', marginBottom: 20 }}>
        {smsConfigSavedNotice ? (
          <View style={{ backgroundColor: '#ECFDF5', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#A7F3D0' }}>
            <Text style={{ color: '#065F46', fontWeight: '700', fontSize: 12.5 }}>✓ {smsConfigSavedNotice}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: 18 }}>📱</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
            {lang ? 'এসএমএস গেটওয়ে ও ওটিপি কনফিগারেশন' : 'SMS Gateway & OTP Verification Setup'}
          </Text>
        </View>
        <Text style={{ fontSize: 12.5, color: '#64748B', marginBottom: 14 }}>
          {lang
            ? 'বাংলাদেশি টেলিকম গেটওয়ে (Greenweb BD / SSL Wireless / BulkSMS BD) দিয়ে গ্রাহক ও প্রোটোকল অফিসারের মোবাইলে লাইভ SMS পাঠান'
            : 'Configure Bangladesh telecom SMS gateways for live customer login & officer handover OTPs'}
        </Text>

        {/* Gateway Provider Selection */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
          {lang ? 'গেটওয়ে প্রোভাইডার নির্বাচন করুন:' : 'Select Gateway Provider:'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {[
            [SMS_PROVIDERS.GREENWEB_BD, 'Greenweb BD (api.greenweb.com.bd)'],
            [SMS_PROVIDERS.BULKSMS_BD, 'BulkSMS BD (bulksmsbd.net)'],
            [SMS_PROVIDERS.SSL_WIRELESS, 'SSL Wireless (SMS Plus)'],
            [SMS_PROVIDERS.SIMULATED, lang ? 'অফলাইন ডেমো সিমুলেটর' : 'Simulated (Demo Test)'],
          ].map(([pKey, pLabel]) => (
            <TouchableOpacity
              key={pKey}
              onPress={() => setSmsProvider(pKey)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor: smsProvider === pKey ? '#0284C7' : '#F8FAFC',
                borderWidth: 1.5,
                borderColor: smsProvider === pKey ? '#0284C7' : '#E2E8F0',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: smsProvider === pKey ? '#FFFFFF' : '#334155' }}>
                {pLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Provider Credentials Inputs (Hidden for Simulated) */}
        {smsProvider !== SMS_PROVIDERS.SIMULATED && (
          <View style={{ gap: 10, marginBottom: 14, backgroundColor: '#F8FAFC', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <View>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                {lang ? 'গেটওয়ে এপিআই কি / টোকেন (API Key / Token):' : 'Gateway API Key / Token:'}
              </Text>
              <TextInput
                value={smsApiKey}
                onChangeText={setSmsApiKey}
                placeholder="e.g. 10427103847xxxxxxxxxxxxxx"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 8,
                  padding: 8,
                  fontSize: 12.5,
                  color: '#0F172A',
                }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                {lang ? 'প্রেরক আইডি / সেন্ডার আইডি (Sender ID / Masking):' : 'Sender ID / Masking Name:'}
              </Text>
              <TextInput
                value={smsSenderId}
                onChangeText={setSmsSenderId}
                placeholder="FlightCare or 88096xxxxxxxx"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 8,
                  padding: 8,
                  fontSize: 12.5,
                  color: '#0F172A',
                }}
              />
              <Text style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 3 }}>
                {lang ? '* নন-মাস্কিং এর ক্ষেত্রে প্রোভাইডারের ডিফল্ট সেন্ডার আইডি থাকবে' : '* Non-masking uses provider default sender number'}
              </Text>
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={handleSaveSmsConfig}
            style={{
              backgroundColor: '#059669',
              paddingVertical: 9,
              paddingHorizontal: 16,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 14 }}>💾</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
              {lang ? 'সেটিংস সংরক্ষণ করুন' : 'Save SMS Gateway Settings'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Test Section */}
        <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E293B', marginBottom: 6 }}>
            ⚡ {lang ? 'লাইভ ওটিপি টেস্ট SMS পাঠান:' : 'Send Live Test OTP SMS:'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={testPhone}
              onChangeText={setTestPhone}
              placeholder={lang ? 'মোবাইল নম্বর লিখুন (017XXXXXXXX)' : 'Enter phone (017XXXXXXXX)'}
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              style={{
                flex: 1,
                backgroundColor: '#F8FAFC',
                borderWidth: 1.2,
                borderColor: '#CBD5E1',
                borderRadius: 8,
                padding: 9,
                fontSize: 12.5,
                color: '#0F172A',
              }}
            />
            <TouchableOpacity
              onPress={handleSendTestSms}
              disabled={testSending}
              style={{
                backgroundColor: '#0284C7',
                paddingVertical: 9,
                paddingHorizontal: 16,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 14 }}>📲</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                {testSending ? (lang ? 'পাঠানো হচ্ছে...' : 'Sending...') : (lang ? 'টেস্ট SMS পাঠান' : 'Send Test SMS')}
              </Text>
            </TouchableOpacity>
          </View>

          {testResult && (
            <View
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 8,
                backgroundColor: testResult.ok ? '#F0FDF4' : '#FEF2F2',
                borderWidth: 1,
                borderColor: testResult.ok ? '#BBF7D0' : '#FECACA',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: testResult.ok ? '#166534' : '#991B1B' }}>
                {testResult.ok
                  ? `✓ ${lang ? 'এসএমএস সফলভাবে প্রেরিত হয়েছে' : 'SMS successfully dispatched'} [প্রোভাইডার: ${testResult.provider}]`
                  : `⚠️ ${lang ? 'এসএমএস প্রেরণে ত্রুটি' : 'Dispatch Failed'}: ${testResult.error || testResult.gatewayResponse || 'Unknown'}`}
              </Text>
              {testResult.simulated && (
                <Text style={{ fontSize: 11, color: '#1E40AF', marginTop: 4 }}>
                  ℹ️ {lang ? `সিমুলেটর মোড সক্রিয়: টেস্ট ওটিপি কোড হলো: ${testResult.otpCode}` : `Simulated Mode Active. Test OTP Code: ${testResult.otpCode}`}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* 3. Notification Logs List */}
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>📋</Text>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
              {lang ? 'নোটিফিকেশন লগ ইতিহাস' : 'Dispatched Notification Logs'}
            </Text>
            <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1' }}>{notifications.length}</Text>
            </View>
          </View>

          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearNotifications}>
              <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>
                {lang ? 'সব মুছুন' : 'Clear All'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ gap: 8 }}>
          {notifications.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10 }}>
              <Text style={{ color: '#64748B', fontSize: 13 }}>
                {lang ? 'কোনো নোটিফিকেশন লগ নেই।' : 'No notifications found in dispatch log.'}
              </Text>
            </View>
          ) : (
            notifications.map((n, idx) => (
              <View
                key={n.id || idx}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{n.title}</Text>
                    <View style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569' }}>
                        {n.category || 'general'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#475569', lineHeight: 17 }}>{n.body}</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

