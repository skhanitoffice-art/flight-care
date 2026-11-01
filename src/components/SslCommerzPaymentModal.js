import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { initiateSslCommerzPayment } from '../services/paymentGateway';
import { SslCommerzLogo, LockIcon } from './Icons';

export default function SslCommerzPaymentModal({
  visible,
  onClose,
  booking,
  lang = 0,
}) {
  const isBn = Boolean(lang);
  const amount = Number(booking?.amount) || 0;
  const bookingId = booking?.id || 'FC-PENDING';
  const passengerName = booking?.passengerName || booking?.name || (isBn ? 'সম্মানিত যাত্রী' : 'Passenger');
  const flightNumber = booking?.flight?.number || booking?.fno || '';
  const serviceDate = booking?.flight?.date || booking?.date || '';

  // status: 'connecting' | 'redirecting' | 'error'
  const [status, setStatus] = useState('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [gatewayUrl, setGatewayUrl] = useState('');
  const redirectTimerRef = useRef(null);

  const startInitiation = async () => {
    if (!booking) return;
    setStatus('connecting');
    setErrorMessage('');
    setGatewayUrl('');

    // 1. Save pending booking locally so return URL can restore and confirm it
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('@flightcare/pending_ssl_booking', JSON.stringify(booking));
      }
    } catch {}

    // 2. Call live backend initiation endpoint
    try {
      const res = await initiateSslCommerzPayment({
        bookingId,
        amount,
        customerName: passengerName,
        customerPhone: booking?.passengerPhone || booking?.phone || '',
        customerEmail: booking?.passengerEmail || booking?.email || '',
        packageName: booking?.packageName || 'Standard Protocol',
      });

      if (res.ok && (res.gatewayUrl || res.GatewayPageURL)) {
        const targetUrl = res.gatewayUrl || res.GatewayPageURL;
        setGatewayUrl(targetUrl);
        setStatus('redirecting');

        // Automatically redirect to official SSLCommerz Gateway
        redirectTimerRef.current = setTimeout(() => {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.href = targetUrl;
          } else {
            Linking.openURL(targetUrl);
          }
        }, 600);
      } else {
        setStatus('error');
        setErrorMessage(
          res.error || (isBn ? 'এসএসএল কমার্স গেটওয়ে সেশন তৈরি করতে ব্যর্থ হয়েছে।' : 'Could not create SSLCOMMERZ gateway session.')
        );
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err?.message || (isBn ? 'গেটওয়ে সার্ভারে যোগাযোগ করতে সমস্যা হয়েছে।' : 'Failed to connect to gateway server.')
      );
    }
  };

  useEffect(() => {
    if (visible && booking) {
      startInitiation();
    } else {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      setStatus('connecting');
      setErrorMessage('');
      setGatewayUrl('');
    }
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [visible, booking]);

  const handleManualProceed = () => {
    if (!gatewayUrl) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = gatewayUrl;
    } else {
      Linking.openURL(gatewayUrl);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.78)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            width: '100%',
            maxWidth: 520,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35,
            shadowRadius: 28,
            elevation: 12,
          }}
        >
          {/* Header Bar: SSLCOMMERZ Official Theme */}
          <View
            style={{
              backgroundColor: '#072B56',
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 3,
              borderBottomColor: '#2563EB',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SslCommerzLogo size={36} />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.3 }}>
                    SSLCOMMERZ
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#10B981',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>
                      LIVE GATEWAY
                    </Text>
                  </View>
                </View>
                <Text style={{ color: '#93C5FD', fontSize: 11, fontWeight: '600' }}>
                  Store: flightcaresbd • ID: flightcaresbd0live
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Booking Summary Box */}
          <View
            style={{
              backgroundColor: '#F8FAFC',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '700' }}>
                {isBn ? 'বুকিং রেফারেন্স' : 'Booking Reference'}: <Text style={{ color: '#0F172A', fontWeight: '900' }}>#{bookingId}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#334155', fontWeight: '700', marginTop: 2 }}>
                ✈️ {passengerName} {flightNumber ? `• ${flightNumber}` : ''} {serviceDate ? `(${serviceDate})` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                {isBn ? 'পরিশোধযোগ্য বিল' : 'Payable Amount'}
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#0284C7' }}>
                ৳{amount.toLocaleString('en-US')}
              </Text>
            </View>
          </View>

          {/* Body Content */}
          <View style={{ padding: 24, alignItems: 'center' }}>
            {status === 'connecting' && (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator size="large" color="#0284C7" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}>
                  {isBn
                    ? 'অফিসিয়াল SSLCOMMERZ সিকিউর গেটওয়েতে সংযোগ করা হচ্ছে...'
                    : 'Connecting to SSLCOMMERZ Official Payment Gateway...'}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 19, maxWidth: 420 }}>
                  {isBn
                    ? 'অনুগ্রহ করে অপেক্ষা করুন, আপনাকে নিরাপদ ব্যাংক ও মোবাইল ব্যাংকিং পোর্টালে নিয়ে যাওয়া হচ্ছে।'
                    : 'Please wait a moment while your secure live payment session is being generated...'}
                </Text>
              </View>
            )}

            {status === 'redirecting' && (
              <View style={{ alignItems: 'center', width: '100%', paddingVertical: 12 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#ECFDF5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                    borderWidth: 2,
                    borderColor: '#10B981',
                  }}
                >
                  <Text style={{ fontSize: 26 }}>🔐</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#065F46', textAlign: 'center' }}>
                  {isBn ? 'গেটওয়ে সেশন সফলভাবে তৈরি হয়েছে!' : 'Secure Gateway Session Ready!'}
                </Text>
                <Text style={{ fontSize: 13, color: '#475569', textAlign: 'center', marginTop: 6, marginBottom: 18, lineHeight: 19 }}>
                  {isBn
                    ? 'আপনাকে স্বয়ংক্রিয়ভাবে SSLCOMMERZ-এর সুরক্ষিত পেজে রিডাইরেক্ট করা হচ্ছে। স্বয়ংক্রিয়ভাবে না হলে নিচের বাটনে ক্লিক করুন।'
                    : 'Redirecting you to the official SSLCOMMERZ portal for bKash, Cards, and Net Banking. Click below if not redirected automatically.'}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={handleManualProceed}
                  style={{
                    backgroundColor: '#10B981',
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    borderRadius: 14,
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 5,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 }}>
                    {isBn ? `৳${amount.toLocaleString('en-US')} পেমেন্ট করতে ক্লিক করুন →` : `Click here to Pay ৳${amount.toLocaleString('en-US')} on SSLCOMMERZ →`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {status === 'error' && (
              <View style={{ alignItems: 'center', width: '100%', paddingVertical: 12 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#FEF2F2',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                    borderWidth: 2,
                    borderColor: '#EF4444',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>⚠️</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#991B1B', textAlign: 'center' }}>
                  {isBn ? 'গেটওয়ে সংযোগে ত্রুটি' : 'Gateway Connection Failed'}
                </Text>
                <Text style={{ fontSize: 13, color: '#7F1D1D', textAlign: 'center', marginTop: 6, marginBottom: 18, lineHeight: 18 }}>
                  {errorMessage}
                </Text>

                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#475569', fontSize: 14, fontWeight: '700' }}>
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={startInitiation}
                    style={{
                      flex: 2,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: '#0284C7',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                      {isBn ? 'পুনরায় চেষ্টা করুন' : 'Retry Connection'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Supported Real Channels Bar */}
            <View
              style={{
                marginTop: 20,
                width: '100%',
                backgroundColor: '#F8FAFC',
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' }}>
                {isBn ? 'সাপোর্টেড রিয়েল পেমেন্ট মেথডসমূহ' : 'Supported Official Payment Methods'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
                {['bKash', 'Nagad', 'Rocket', 'Upay', 'Visa', 'Mastercard', 'AMEX', 'DBBL Nexus', 'City Touch', 'BRAC Astha', 'IBBL', 'EBL'].map(name => (
                  <View
                    key={name}
                    style={{
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Security Guarantee Badges */}
            <View
              style={{
                marginTop: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <LockIcon size={12} color="#10B981" />
                <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>
                  256-Bit SSL Encrypted
                </Text>
              </View>
              <Text style={{ color: '#CBD5E1' }}>•</Text>
              <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>
                PCI-DSS Level 1
              </Text>
              <Text style={{ color: '#CBD5E1' }}>•</Text>
              <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>
                Bangladesh Bank Approved
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
