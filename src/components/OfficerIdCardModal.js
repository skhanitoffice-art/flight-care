import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { generateOfficerQrData, calculateOfficerPoints } from '../services/officerService';
import { downloadOfficerQrCode } from '../utils/qrDownloadHelper';

export default function OfficerIdCardModal({
  visible,
  onClose,
  officer,
  lang = 0,
  onViewWebProfile,
}) {
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState('');

  if (!officer) return null;

  const pointsData = officer.points || calculateOfficerPoints(officer);
  const badgeId = officer.badgeNo || officer.id || "FC-PO-001";
  const qrData = generateOfficerQrData(badgeId);
  const officerName = lang ? (officer.nameBn || officer.name) : officer.name;
  const officerRole = lang ? (officer.roleBn || officer.role) : officer.role;
  const airportName = lang ? (officer.airportFullNameBn || `${officer.airport} বিমানবন্দর`) : (officer.airportFullNameEn || `${officer.airport} Airport`);
  const stationName = lang ? (officer.stationBn || officer.station) : (officer.station || `${officer.airport} Terminal`);

  const handleCopyLink = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(qrData.verificationUrl);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    } else {
      Alert.alert(
        lang ? 'লিঙ্ক কপি হয়েছে' : 'Link Copied',
        qrData.verificationUrl
      );
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
      window.print();
    } else {
      Alert.alert(
        lang ? 'প্রিন্ট' : 'Print',
        lang ? 'আইডি কার্ড প্রিন্ট করার জন্য ব্রাউজারের প্রিন্ট অপশন ব্যবহার করুন।' : 'Use browser print dialog to print ID card.'
      );
    }
  };

  const handleDownloadQr = async (mode = 'qr_only') => {
    setDownloadingQr(true);
    try {
      const res = await downloadOfficerQrCode({
        member: officer,
        verificationUrl: qrData.verificationUrl,
        qrImageUrl: qrData.qrImageUrl,
        mode,
        lang,
      });
      if (res?.success) {
        setDownloadNotice(lang ? '✓ কিউআর কোড সফলভাবে ডাউনলোড হয়েছে!' : '✓ QR Code downloaded successfully!');
        setTimeout(() => setDownloadNotice(''), 3500);
      }
    } catch (e) {
      console.warn('Officer QR download error:', e);
    } finally {
      setDownloadingQr(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 480,
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Top Modal Navigation Bar */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 14,
              backgroundColor: '#0F172A',
              borderBottomWidth: 1,
              borderBottomColor: '#1E293B',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>🪪</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                {lang ? 'প্রোটোকল অফিসার অফিসিয়াল আইডি কার্ড' : 'Official Protocol Officer ID Card'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#334155',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
            {/* Lanyard Slot Hole Simulation */}
            <View
              style={{
                width: 50,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#CBD5E1',
                marginBottom: 12,
              }}
            />

            {/* PHYSICAL ID BADGE CONTAINER */}
            <View
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                borderWidth: 2,
                borderColor: '#0284C7',
                overflow: 'hidden',
                shadowColor: '#0284C7',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              {/* ID Card Top Header */}
              <View
                style={{
                  backgroundColor: '#0284C7',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Image
                    source={require('../../assets/logo.png')}
                    style={{ width: 34, height: 34, resizeMode: 'contain', backgroundColor: '#FFFFFF', borderRadius: 17 }}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '900',
                      color: '#FFFFFF',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    FLIGHT CARE AVIATION
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#BAE6FD',
                    marginTop: 2,
                    letterSpacing: 0.3,
                  }}
                >
                  AIRPORT PROTOCOL & VIP CONCIERGE SERVICES
                </Text>
              </View>

              {/* Security Strip */}
              <View
                style={{
                  height: 4,
                  backgroundColor: '#F59E0B',
                  width: '100%',
                }}
              />

              {/* ID Card Body */}
              <View style={{ padding: 18, alignItems: 'center' }}>
                {/* Photo and Badge Number */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%', marginBottom: 16 }}>
                  {/* Avatar Frame with Security Glow */}
                  <View
                    style={{
                      width: 86,
                      height: 86,
                      borderRadius: 43,
                      borderWidth: 3,
                      borderColor: '#0284C7',
                      backgroundColor: '#E0F2FE',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#0284C7',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    {(officer.photo || (typeof officer.avatar === 'string' && (officer.avatar.startsWith('http') || officer.avatar.startsWith('data:image')))) ? (
                      <Image
                        source={{ uri: officer.photo || officer.avatar }}
                        style={{ width: '100%', height: '100%', borderRadius: 43 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 44 }}>
                        {officer.role?.includes('VIP') ? '⭐' : officer.role?.includes('Medical') ? '🩺' : officer.role?.includes('Wheelchair') ? '🦽' : '🧑‍✈️'}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 19, fontWeight: '900', color: '#0F172A' }}>
                      {officerName}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284C7', marginTop: 2 }}>
                      {officerRole}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 6,
                        backgroundColor: '#F1F5F9',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>
                        ID: <Text style={{ color: '#0F172A' }}>{badgeId}</Text>
                      </Text>
                      {officer.bloodGroup && (
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>
                          • {officer.bloodGroup}
                        </Text>
                      )}
                    </View>

                    {/* Official 10-Rank & Earned Points Badge on ID Card */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        marginTop: 6,
                        backgroundColor: pointsData.tierBgColor || '#FEF3C7',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: pointsData.tierBadgeColor || '#FDE68A',
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Text style={{ fontSize: 11 }}>{pointsData.rankIcon || '🏆'}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: pointsData.tierBadgeColor || '#92400E' }}>
                        {lang
                          ? (pointsData.rank?.shortBn || `র‍্যাংক ${pointsData.rankLevel}`)
                          : (pointsData.rank?.shortEn || `Rank ${pointsData.rankLevel}`)}
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748B' }}>
                        • {pointsData.totalPoints.toLocaleString()} {lang ? 'পয়েন্ট' : 'pts'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Duty Airport & Station Info Card */}
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 10,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginBottom: 16,
                    gap: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13 }}>📍</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A', flex: 1 }}>
                      {airportName}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13 }}>🚪</Text>
                    <Text style={{ fontSize: 12, color: '#475569', flex: 1 }}>
                      {stationName}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13 }}>⏰</Text>
                    <Text style={{ fontSize: 12, color: '#475569', flex: 1 }}>
                      {lang ? 'ডিউটি শিফট:' : 'Shift:'} {officer.shift}
                    </Text>
                  </View>
                </View>

                {/* SCANNABLE QR CODE SECTION */}
                <View
                  style={{
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: '#CBD5E1',
                    width: '100%',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>
                    {lang ? 'স্ক্যান করুন — অফিসার ভেরিফিকেশন ও রিভিউ' : 'SCAN TO VERIFY CREDENTIALS & REVIEWS'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 10, textAlign: 'center' }}>
                    {lang
                      ? 'ক্যামেরা দিয়ে স্ক্যান করলে ওয়েবসাইট থেকে অফিসারের সকল তথ্য, সার্ভিস সংখ্যা ও রিভিউ প্রদর্শিত হবে।'
                      : 'Scan with smartphone camera to view complete profile, total services & passenger reviews.'}
                  </Text>

                  {/* High-Resolution Dynamic QR Code Image */}
                  <View
                    style={{
                      padding: 8,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: '#0284C7',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 6,
                    }}
                  >
                    <Image
                      source={{ uri: qrData.qrImageUrl }}
                      style={{ width: 170, height: 170 }}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Verification URL Pill */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 10,
                      backgroundColor: '#ECFDF5',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#A7F3D0',
                    }}
                  >
                    <Text style={{ fontSize: 11 }}>🛡️</Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#065F46' }}>
                      {lang ? 'ফ্লাইট কেয়ার অফিশিয়ালি ভেরিফাইড' : 'Flight Care Officially Verified'}
                    </Text>
                  </View>

                  {/* Clickable / Copyable URL Box */}
                  <TouchableOpacity
                    onPress={handleCopyLink}
                    style={{
                      width: '100%',
                      backgroundColor: '#F8FAFC',
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      marginTop: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: '#0284C7',
                        fontWeight: '700',
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      🔗 {qrData.verificationUrl}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '800' }}>
                      {copiedNotice ? (lang ? '✓ কপি হয়েছে' : '✓ Copied') : (lang ? 'কপি' : 'Copy')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ID Card Bottom Footer Details */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: '100%',
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#F1F5F9',
                  }}
                >
                  <Text style={{ fontSize: 10.5, color: '#94A3B8' }}>
                    Pass: {officer.licenseNo || 'CAAB-PASS-842'}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: '700' }}>
                    Valid: 31-12-2027
                  </Text>
                </View>
              </View>
            </View>

            {/* Download Notice Feedback */}
            {downloadNotice ? (
              <View style={{ width: '100%', backgroundColor: '#ECFDF5', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0', marginTop: 12 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#065F46', textAlign: 'center' }}>
                  {downloadNotice}
                </Text>
              </View>
            ) : null}

            {/* Quick Actions Bar */}
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 14,
                justifyContent: 'center',
              }}
            >
              {/* Button: Download QR Code (PNG) */}
              <TouchableOpacity
                onPress={() => handleDownloadQr('qr_only')}
                disabled={downloadingQr}
                style={{
                  flex: 1,
                  minWidth: 140,
                  backgroundColor: '#0284C7',
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  shadowColor: '#0284C7',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
              >
                {downloadingQr ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={{ fontSize: 14 }}>📥</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                      {lang ? 'কিউআর ডাউনলোড' : 'Download QR'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Button: Download ID Pass Badge (PNG) */}
              <TouchableOpacity
                onPress={() => handleDownloadQr('badge_card')}
                disabled={downloadingQr}
                style={{
                  flex: 1,
                  minWidth: 140,
                  backgroundColor: '#065F46',
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  shadowColor: '#065F46',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 14 }}>🖪</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                  {lang ? 'আইডি পাস ডাউনলোড' : 'Download ID Card'}
                </Text>
              </TouchableOpacity>

              {/* Button: View Web Profile */}
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  if (typeof onViewWebProfile === 'function') {
                    onViewWebProfile(officer);
                  }
                }}
                style={{
                  backgroundColor: '#0F2A4A',
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>🌐</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                  {lang ? 'প্রোফাইল' : 'Profile'}
                </Text>
              </TouchableOpacity>

              {/* Button: Print ID Card */}
              <TouchableOpacity
                onPress={handlePrint}
                style={{
                  backgroundColor: '#F1F5F9',
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
              >
                <Text style={{ fontSize: 14 }}>🖨️</Text>
                <Text style={{ color: '#334155', fontSize: 12, fontWeight: '800' }}>
                  {lang ? 'প্রিন্ট' : 'Print'}
                </Text>
              </TouchableOpacity>

              {/* Button: Copy Verification Link */}
              <TouchableOpacity
                onPress={handleCopyLink}
                style={{
                  backgroundColor: copiedNotice ? '#ECFDF5' : '#F8FAFC',
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: copiedNotice ? '#A7F3D0' : '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 14 }}>{copiedNotice ? '✓' : '🔗'}</Text>
                <Text
                  style={{
                    color: copiedNotice ? '#059669' : '#475569',
                    fontSize: 12,
                    fontWeight: '800',
                  }}
                >
                  {copiedNotice
                    ? (lang ? 'কপি হয়েছে!' : 'Copied!')
                    : (lang ? 'লিঙ্ক' : 'Link')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

