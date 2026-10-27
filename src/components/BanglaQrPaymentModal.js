import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Image,
  Linking,
} from 'react-native';
import {
  BANGLA_QR_CONFIG,
  generateBanglaQrData,
  verifyBanglaQrPayment,
  simulateIncomingBanglaQrIpn,
  subscribeToPaymentWebhook,
} from '../services/paymentGateway';
import { BanglaQrBadge, BanglaQrLogo, CheckCircleIcon } from './Icons';

export default function BanglaQrPaymentModal({
  visible,
  onClose,
  onSuccess,
  booking,
  lang = 0,
}) {
  const isBn = Boolean(lang);
  const amount = Number(booking?.amount) || 0;
  const bookingId = booking?.id || 'FC-PENDING';
  const passengerName = booking?.passengerName || booking?.name || (isBn ? 'যাত্রী' : 'Passenger');
  const flightNumber = booking?.flight?.number || booking?.fno || '';

  // Active Tab: 'qr' (Scan & Pay), 'apps' (Pay via App on same mobile), 'help' (Guide)
  const [activeTab, setActiveTab] = useState('qr');

  // Step: 1 = Payment Pending, 2 = Success Money Receipt
  const [step, setStep] = useState(1);

  // Dynamic QR state
  const [qrData, setQrData] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(900); // 15 mins default
  const [selectedApp, setSelectedApp] = useState(null);

  // Verification state
  const [manualTrx, setManualTrx] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const lastVerifyClickRef = useRef(0);

  // Initialize or re-generate Dynamic Bangla QR on open
  useEffect(() => {
    if (visible) {
      setStep(1);
      setActiveTab('qr');
      setManualTrx('');
      setError('');
      setIsVerifying(false);
      setVerificationResult(null);
      setSelectedApp(null);
      setCopiedField(null);

      const generated = generateBanglaQrData(bookingId, amount);
      setQrData(generated);
      setSecondsLeft(generated.expiresInSeconds || 900);
    }
  }, [visible, bookingId, amount]);

  // Expiration countdown
  useEffect(() => {
    let timer = null;
    if (visible && secondsLeft > 0 && step === 1) {
      timer = setInterval(() => {
        setSecondsLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible, secondsLeft, step]);

  // Listen to IPN Webhook for automatic instant confirmation
  useEffect(() => {
    if (!visible) return;
    const unsubscribe = subscribeToPaymentWebhook(event => {
      if (String(event.bookingId) === String(bookingId) && event.status === 'Verified') {
        setVerificationResult({
          trxId: event.trxId,
          paymentId: event.paymentId,
          amount: event.amount,
          channel: event.channel || 'Bangla QR',
          verifiedAt: event.receivedAt,
          gatewayResponse: { gateway: 'BANGLA_QR_NPSB' },
        });
        setStep(2); // Show official receipt
      }
    });
    return () => {
      unsubscribe();
    };
  }, [visible, bookingId]);

  const formatTimer = sec => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Copy to clipboard helper
  const handleCopy = (text, fieldName) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  // Manual Transaction ID Verification with Debounce
  const handleManualVerify = async () => {
    const now = Date.now();
    if (now - lastVerifyClickRef.current < 1500 || isVerifying) return; // 1.5s Debounce
    lastVerifyClickRef.current = now;

    const clean = String(manualTrx || '').trim();
    const isValidTrxFormat = /^[A-Za-z0-9]{6,16}$/.test(clean);
    if (!clean || !isValidTrxFormat) {
      setError(
        isBn
          ? 'অনুগ্রহ করে সঠিক Transaction ID (TrxID) লিখুন (৬-১৬ অক্ষরের ইংরেজি বর্ণ ও সংখ্যা, যেমন: BK9X28104)।'
          : 'Please enter a valid Transaction ID (TrxID) with 6-16 alphanumeric characters (e.g. BK9X28104).'
      );
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const channelName = selectedApp
        ? `${selectedApp.name} (বাংলা কিউআর)`
        : 'Bangla QR (বাংলা কিউআর)';

      const res = await verifyBanglaQrPayment({
        trxId: clean,
        bookingId,
        expectedAmount: amount,
        channel: channelName,
        paymentId: `PAY-${clean}`,
      });

      if (!res.ok) {
        setError(res.message || (isBn ? 'পেমেন্ট যাচাই ব্যর্থ হয়েছে।' : 'Payment verification failed.'));
        setIsVerifying(false);
        return;
      }

      setVerificationResult(res.data);
      setIsVerifying(false);
      setStep(2); // Go to official receipt
    } catch {
      setError(isBn ? 'সার্ভার যোগাযোগে ত্রুটি ঘটেছে।' : 'Server communication error.');
      setIsVerifying(false);
    }
  };

  // Demo IPN Trigger for instant live testing with Debounce
  const handleSimulateIpn = async () => {
    const now = Date.now();
    if (now - lastVerifyClickRef.current < 1500 || isVerifying) return;
    lastVerifyClickRef.current = now;

    setIsVerifying(true);
    setError('');
    try {
      const channelName = selectedApp ? `${selectedApp.name} (Bangla QR)` : 'Bangla QR (NPSB)';
      await simulateIncomingBanglaQrIpn(bookingId, amount, channelName);
      // Webhook listener above will automatically catch and transition to step 2!
      setIsVerifying(false);
    } catch {
      setIsVerifying(false);
      setError(isBn ? 'সিমুলেশন ব্যর্থ হয়েছে' : 'Simulation failed');
    }
  };

  // Launch App on same mobile
  const handleLaunchApp = async app => {
    setSelectedApp(app);
    // Copy merchant number to clipboard for quick paste in app
    handleCopy(BANGLA_QR_CONFIG.MERCHANT_NUMBER, 'merchant');
    if (app.scheme) {
      try {
        if (Platform.OS !== 'web') {
          const supported = await Linking.canOpenURL(app.scheme);
          if (supported) {
            await Linking.openURL(app.scheme);
            return;
          }
        }
      } catch {}
    }
    setError(
      isBn
        ? `মার্চেন্ট নম্বর (${BANGLA_QR_CONFIG.MERCHANT_NUMBER}) কপি হয়েছে। ${app.nameBn || app.name} অ্যাপে রেফারেন্স #${bookingId} ও ৳${amount} দিয়ে পেমেন্ট করুন এবং প্রাপ্ত TrxID নিচে দিন।`
        : `Merchant number (${BANGLA_QR_CONFIG.MERCHANT_NUMBER}) copied. Pay ৳${amount} with ref #${bookingId} via ${app.name} and enter received TrxID below.`
    );
  };

  // Confirm and finish payment flow
  const handleFinalSuccess = () => {
    if (typeof onSuccess === 'function' && verificationResult) {
      onSuccess({
        trxId: verificationResult.trxId,
        paymentId: verificationResult.paymentId,
        amount: verificationResult.amount,
        wallet: selectedApp?.name || 'Bangla QR',
        channel: verificationResult.channel || 'Bangla QR',
      });
    }
    onClose();
  };

  // Print receipt
  const handlePrintReceipt = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
      window.print();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 14,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 520,
            maxHeight: '94%',
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            elevation: 10,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top Brand Banner: Bangladesh Bank "বাংলা QR" Theme */}
          <View
            style={{
              background: 'linear-gradient(135deg, #005F43 0%, #064E3B 70%, #022C22 100%)',
              backgroundColor: '#064E3B',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 3,
              borderBottomColor: '#10B981',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <BanglaQrLogo size={38} />
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 19, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 }}>
                      {isBn ? 'বাংলা কিউআর পেমেন্ট' : 'Bangla QR Payment'}
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#10B981',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#064E3B' }}>
                        NPSB BB
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#A7F3D0', fontWeight: '600', marginTop: 1 }}>
                    {isBn ? 'একটি কিউআর, সকল পেমেন্ট • বাংলাদেশ ব্যাংক' : 'One QR, All Payments • Bangladesh Bank'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Booking & Payable Amount Strip */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginTop: 14,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.12)',
              }}
            >
              <View>
                <Text style={{ fontSize: 11, color: '#A7F3D0', fontWeight: '600' }}>
                  {isBn ? 'বুকিং রেফারেন্স:' : 'Booking Ref:'} <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>#{bookingId}</Text>
                </Text>
                <Text style={{ fontSize: 12, color: '#E2E8F0', fontWeight: '600', marginTop: 2 }}>
                  {passengerName} {flightNumber ? `• ${flightNumber}` : ''}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: '#A7F3D0', fontWeight: '600' }}>
                  {isBn ? 'পরিশোধের পরিমাণ' : 'Payable Amount'}
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#34D399' }}>
                  ৳ {amount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* STEP 1: PAYMENT PENDING */}
          {step === 1 && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18 }}>
              {/* Tab Selector */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#F1F5F9',
                  borderRadius: 12,
                  padding: 4,
                  marginBottom: 16,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setActiveTab('qr')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 9,
                    alignItems: 'center',
                    backgroundColor: activeTab === 'qr' ? '#FFFFFF' : 'transparent',
                    boxShadow: activeTab === 'qr' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: activeTab === 'qr' ? '800' : '600',
                      color: activeTab === 'qr' ? '#065F46' : '#64748B',
                    }}
                  >
                    {isBn ? '📷 কিউআর স্ক্যান ও পে' : '📷 Scan & Pay'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setActiveTab('apps')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 9,
                    alignItems: 'center',
                    backgroundColor: activeTab === 'apps' ? '#FFFFFF' : 'transparent',
                    boxShadow: activeTab === 'apps' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: activeTab === 'apps' ? '800' : '600',
                      color: activeTab === 'apps' ? '#065F46' : '#64748B',
                    }}
                  >
                    {isBn ? '📱 অ্যাপে সরাসরি পে' : '📱 Pay via App'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setActiveTab('help')}
                  style={{
                    flex: 0.8,
                    paddingVertical: 8,
                    borderRadius: 9,
                    alignItems: 'center',
                    backgroundColor: activeTab === 'help' ? '#FFFFFF' : 'transparent',
                    boxShadow: activeTab === 'help' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: activeTab === 'help' ? '800' : '600',
                      color: activeTab === 'help' ? '#065F46' : '#64748B',
                    }}
                  >
                    {isBn ? '❓ নিয়মাবলি' : '❓ Guide'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {Boolean(error) && (
                <View
                  style={{
                    backgroundColor: '#FEF2F2',
                    borderColor: '#FECACA',
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '700' }}>⚠️ {error}</Text>
                </View>
              )}

              {/* TAB 1: QR SCAN & PAY */}
              {activeTab === 'qr' && (
                <View style={{ alignItems: 'center' }}>
                  {/* QR Card Container */}
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: '#10B981',
                      padding: 14,
                      alignItems: 'center',
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
                      width: '100%',
                      maxWidth: 320,
                    }}
                  >
                    {/* Merchant & EMVCo Tag Info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#065F46' }}>
                        {BANGLA_QR_CONFIG.MERCHANT_NAME}
                      </Text>
                    </View>

                    {/* QR Code Image */}
                    {qrData?.qrImageUrl ? (
                      <View
                        style={{
                          width: 240,
                          height: 240,
                          backgroundColor: '#FFFFFF',
                          borderRadius: 12,
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        <Image
                          source={{ uri: qrData.qrImageUrl }}
                          style={{ width: 236, height: 236 }}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <View style={{ width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#059669" />
                      </View>
                    )}

                    {/* Expiry Countdown Timer */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: secondsLeft < 120 ? '#FEF2F2' : '#F0FDF4',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        marginTop: 12,
                        borderWidth: 1,
                        borderColor: secondsLeft < 120 ? '#FCA5A5' : '#BBF7D0',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: secondsLeft < 120 ? '#DC2626' : '#047857' }}>
                        ⏱️ {isBn ? 'কিউআর মেয়াদ বাকি:' : 'QR Expires in:'} {formatTimer(secondsLeft)}
                      </Text>
                    </View>

                    {secondsLeft === 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          const refreshed = generateBanglaQrData(bookingId, amount);
                          setQrData(refreshed);
                          setSecondsLeft(refreshed.expiresInSeconds);
                        }}
                        style={{
                          marginTop: 10,
                          backgroundColor: '#059669',
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                          🔄 {isBn ? 'নতুন কোড তৈরি করুন' : 'Refresh QR Code'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Direct App Launch Quick Buttons for Mobile */}
                    <View style={{ marginTop: 14, width: '100%', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '700', marginBottom: 8 }}>
                        {isBn ? '📱 মোবাইল থেকে সরাসরি অ্যাপে পেমেন্ট করুন:' : '📱 Paying from this phone? Open app directly:'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10, width: '100%', justifyContent: 'center' }}>
                        {BANGLA_QR_CONFIG.SUPPORTED_APPS.filter(a => a.id === 'bkash' || a.id === 'nagad').map(app => (
                          <TouchableOpacity
                            key={app.id}
                            activeOpacity={0.8}
                            onPress={() => handleLaunchApp(app)}
                            style={{
                              flex: 1,
                              maxWidth: 180,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              backgroundColor: app.color,
                              paddingVertical: 9,
                              paddingHorizontal: 12,
                              borderRadius: 10,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                              {app.id === 'bkash' ? '⚡ ' : '🔥 '}
                              {isBn ? `${app.nameBn} অ্যাপ` : `Open ${app.name}`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Interoperable Apps Row */}
                  <View style={{ marginTop: 16, width: '100%' }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: '#64748B',
                        textAlign: 'center',
                        marginBottom: 10,
                      }}
                    >
                      {isBn
                        ? 'যেকোনো ব্যাংক বা মোবাইল ব্যাংকিং অ্যাপ দিয়ে স্ক্যান করুন:'
                        : 'Scan using any Bank or MFS app:'}
                    </Text>

                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      {BANGLA_QR_CONFIG.SUPPORTED_APPS.map(app => (
                        <View
                          key={app.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#F8FAFC',
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            gap: 5,
                          }}
                        >
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: app.color,
                            }}
                          />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E293B' }}>
                            {isBn ? app.nameBn : app.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Manual Transaction ID Input Box */}
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 14,
                      padding: 14,
                      marginTop: 18,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                      {isBn ? 'পেমেন্ট সম্পন্ন হয়েছে? TrxID দিন:' : 'Completed payment? Enter TrxID:'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#64748B', marginBottom: 10 }}>
                      {isBn
                        ? 'আপনার পেমেন্ট অ্যাপের কনফার্মেশন এসএমএস থেকে TrxID লিখুন'
                        : 'Enter TrxID from your payment SMS/App receipt'}
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        value={manualTrx}
                        onChangeText={t => setManualTrx(t.toUpperCase())}
                        placeholder={isBn ? 'যেমন: BK9X28104' : 'e.g. BK9X28104'}
                        placeholderTextColor="#94A3B8"
                        style={{
                          flex: 1,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: '#CBD5E1',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          height: 44,
                          fontSize: 14,
                          fontWeight: '800',
                          color: '#0F172A',
                          letterSpacing: 1,
                        }}
                      />

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleManualVerify}
                        disabled={isVerifying}
                        style={{
                          backgroundColor: '#059669',
                          borderRadius: 10,
                          paddingHorizontal: 16,
                          height: 44,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: isVerifying ? 0.7 : 1,
                        }}
                      >
                        {isVerifying ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                            {isBn ? 'যাচাই করুন' : 'Verify'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Instant Demo Simulation Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSimulateIpn}
                    disabled={isVerifying}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: '#ECFDF5',
                      borderWidth: 1,
                      borderColor: '#A7F3D0',
                      borderRadius: 10,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      marginTop: 14,
                      width: '100%',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#047857' }}>
                      ⚡ {isBn ? 'রিয়েল-টাইম পেমেন্ট টেস্ট করুন (Demo Webhook/IPN)' : 'Test Real-Time Payment (Demo IPN)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* TAB 2: PAY VIA APP (Same-Mobile Checkout) */}
              {activeTab === 'apps' && (
                <View>
                  <View
                    style={{
                      backgroundColor: '#EFF6FF',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                    }}
                  >
                    <Text style={{ fontSize: 12.5, color: '#1E40AF', fontWeight: '700' }}>
                      💡{' '}
                      {isBn
                        ? 'আপনি একই মোবাইলে বুকিং ও পেমেন্ট করলে নিচে আপনার কাঙ্ক্ষিত অ্যাপ সিলেক্ট করুন:'
                        : 'If booking and paying on the same device, select your preferred app below:'}
                    </Text>
                  </View>

                  {/* Merchant Account Details Copy Box */}
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 10 }}>
                      {isBn ? 'মার্চেন্ট পেমেন্ট তথ্য:' : 'Merchant Payment Details:'}
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        {isBn ? 'মার্চেন্ট নম্বর:' : 'Merchant Number:'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleCopy(BANGLA_QR_CONFIG.MERCHANT_NUMBER, 'merchant')}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                          {BANGLA_QR_CONFIG.MERCHANT_NUMBER}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: copiedField === 'merchant' ? '#059669' : '#0284C7' }}>
                          {copiedField === 'merchant' ? (isBn ? '✓ কপি হয়েছে' : '✓ Copied') : (isBn ? 'কপি' : 'Copy')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        {isBn ? 'রেফারেন্স / বুকিং নং:' : 'Reference / Booking ID:'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleCopy(bookingId, 'booking')}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                          #{bookingId}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: copiedField === 'booking' ? '#059669' : '#0284C7' }}>
                          {copiedField === 'booking' ? (isBn ? '✓ কপি হয়েছে' : '✓ Copied') : (isBn ? 'কপি' : 'Copy')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* App Grid */}
                  <View style={{ gap: 10 }}>
                    {BANGLA_QR_CONFIG.SUPPORTED_APPS.map(app => {
                      const isSelected = selectedApp?.id === app.id;
                      return (
                        <TouchableOpacity
                          key={app.id}
                          activeOpacity={0.8}
                          onPress={() => handleLaunchApp(app)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                            borderRadius: 12,
                            padding: 12,
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#10B981' : '#E2E8F0',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: app.color,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15 }}>
                                {app.name.charAt(0)}
                              </Text>
                            </View>

                            <View>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                                {isBn ? app.nameBn : app.name}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>
                                {app.type === 'MFS'
                                  ? (isBn ? 'মোবাইল ফিন্যান্সিয়াল সার্ভিস' : 'Mobile Financial Service')
                                  : (isBn ? 'ব্যাংকিং ও কার্ড সার্ভিস' : 'Internet Banking & Card')}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={{
                              backgroundColor: isSelected ? '#10B981' : '#F1F5F9',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '800',
                                color: isSelected ? '#FFFFFF' : '#475569',
                              }}
                            >
                              {isBn ? 'পে করুন ›' : 'Pay ›'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Manual TrxID section inside Apps tab */}
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 14,
                      padding: 14,
                      marginTop: 18,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                      {isBn ? 'অ্যাপে পেমেন্ট শেষে TrxID দিন:' : 'Enter TrxID after paying via App:'}
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        value={manualTrx}
                        onChangeText={t => setManualTrx(t.toUpperCase())}
                        placeholder={isBn ? 'যেমন: 71A90B23' : 'e.g. 71A90B23'}
                        placeholderTextColor="#94A3B8"
                        style={{
                          flex: 1,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: '#CBD5E1',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          height: 44,
                          fontSize: 14,
                          fontWeight: '800',
                          color: '#0F172A',
                          letterSpacing: 1,
                        }}
                      />

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleManualVerify}
                        disabled={isVerifying}
                        style={{
                          backgroundColor: '#059669',
                          borderRadius: 10,
                          paddingHorizontal: 16,
                          height: 44,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isVerifying ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                            {isBn ? 'যাচাই করুন' : 'Verify'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 3: HELP & GUIDE */}
              {activeTab === 'help' && (
                <View>
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 14,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      gap: 14,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#065F46' }}>
                      {isBn ? 'বাংলা কিউআর (Bangla QR) এর সুবিধা:' : 'Benefits of Bangla QR:'}
                    </Text>

                    <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20 }}>
                      {isBn
                        ? '১. বাংলাদেশ ব্যাংক নির্দেশিত জাতীয় একক কিউআর পেমেন্ট ব্যবস্থা।'
                        : '1. National interoperable QR payment standard mandated by Bangladesh Bank.'}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20 }}>
                      {isBn
                        ? '২. আলাদা আলাদা কিউআরের প্রয়োজন নেই—বিকাশ, নগদ, রকেট, সেলফিন বা যেকোনো ব্যাংকের অ্যাপ থেকে এক কিউআর কোডেই পেমেন্ট করা যায়।'
                        : '2. No need for separate QRs. Works seamlessly across bKash, Nagad, Rocket, CellFin, and all commercial bank apps.'}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20 }}>
                      {isBn
                        ? '৩. পেমেন্ট সফল হওয়ার সাথে সাথেই সার্ভারে স্বয়ংক্রিয়ভাবে বুকিং নিশ্চিত হয় এবং ক্যাশ রশিদ পাওয়া যায়।'
                        : '3. Instant booking confirmation upon payment with automated electronic money receipt.'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* STEP 2: VERIFIED OFFICIAL MONEY RECEIPT */}
          {step === 2 && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#ECFDF5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  borderWidth: 2,
                  borderColor: '#A7F3D0',
                }}
              >
                <CheckCircleIcon size={38} color="#059669" />
              </View>

              <Text style={{ fontSize: 20, fontWeight: '900', color: '#065F46', textAlign: 'center' }}>
                {isBn ? 'পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!' : 'Payment Verified & Successful!'}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 18 }}>
                {isBn
                  ? 'বাংলা কিউআর (NPSB) এর মাধ্যমে আপনার পেমেন্ট নিশ্চিত করা হয়েছে।'
                  : 'Your payment has been settled via Bangla QR (NPSB).'}
              </Text>

              {/* Official Receipt Card */}
              <View
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: '#10B981',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.1)',
                  marginBottom: 18,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10, marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {isBn ? 'সার্ভিস প্রোভাইডার:' : 'Service Provider:'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                    Flight Care Protocol Ltd.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {isBn ? 'বুকিং রেফারেন্স:' : 'Booking Ref:'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7' }}>
                    #{bookingId}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {isBn ? 'ট্রানজেকশন আইডি (TrxID):' : 'Transaction ID (TrxID):'}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#059669', letterSpacing: 0.5 }}>
                    {verificationResult?.trxId || manualTrx || 'BQR82910482'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {isBn ? 'পেমেন্ট মাধ্যম:' : 'Payment Method:'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#064E3B' }}>
                    {verificationResult?.channel || 'Bangla QR (বাংলা কিউআর)'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {isBn ? 'পরিশোধিত টাকা:' : 'Amount Paid:'}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#059669' }}>
                    ৳ {amount.toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                    {isBn ? 'স্ট্যাটাস:' : 'Status:'}
                  </Text>
                  <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                      PAID / VERIFIED ✓
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ width: '100%', gap: 10 }}>
                {Platform.OS === 'web' && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handlePrintReceipt}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: '#F1F5F9',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 12,
                      height: 46,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155' }}>
                      🖨️ {isBn ? 'রশিদ প্রিন্ট / সংরক্ষণ করুন' : 'Print / Save Receipt'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleFinalSuccess}
                  style={{
                    backgroundColor: '#059669',
                    borderRadius: 12,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                    {isBn ? '✓ বুকিং নিশ্চিতকরণে এগিয়ে যান' : '✓ Proceed to Booking Confirmation'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

