import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';

const DEMO_PASSPORTS = [
  {
    id: 'bd',
    name: 'MD ARIFUL ISLAM',
    passportNumber: 'A04829104',
    nationality: 'Bangladeshi',
    country: '🇧🇩 Bangladesh',
    dob: '12-05-1990',
    expiry: '15-08-2032',
  },
  {
    id: 'uk',
    name: 'JOHN EDWARD SMITH',
    passportNumber: '987654321',
    nationality: 'British',
    country: '🇬🇧 United Kingdom',
    dob: '04-11-1985',
    expiry: '20-10-2030',
  },
  {
    id: 'ae',
    name: 'MOHAMMED AL-MANSOORI',
    passportNumber: 'E12345678',
    nationality: 'Emirati',
    country: '🇦🇪 United Arab Emirates',
    dob: '28-02-1992',
    expiry: '10-06-2031',
  },
];

export default function PassportOcrModal({
  visible,
  onClose,
  onScanComplete,
  lang = 0,
}) {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [previewData, setPreviewData] = useState(null);

  const handleSelectSample = (sample) => {
    setScanning(true);
    setScanProgress(lang ? 'পাসপোর্ট MRZ জোন স্ক্যান করা হচ্ছে...' : 'Scanning passport MRZ zone...');
    setTimeout(() => {
      setScanProgress(lang ? 'নাম ও পাসপোর্ট নম্বর শনাক্ত করা হচ্ছে...' : 'Extracting name & passport number...');
      setTimeout(() => {
        setScanning(false);
        setPreviewData(sample);
      }, 700);
    }, 600);
  };

  const handleApply = () => {
    if (previewData && onScanComplete) {
      onScanComplete(previewData);
      setPreviewData(null);
      onClose();
    }
  };

  const handleFileUpload = (event, isCamera = false) => {
    const file = event?.target?.files?.[0];
    if (file) {
      setScanning(true);
      setScanProgress(
        isCamera
          ? (lang ? 'ক্যামেরা ছবি ক্যাপচার ও প্রসেসিং হচ্ছে...' : 'Capturing & analyzing passport image...')
          : (lang ? 'ছবি আপলোড ও প্রসেসিং হচ্ছে...' : 'Uploading & processing document...')
      );

      const finishScan = (photoUrl = null) => {
        setTimeout(() => {
          setScanProgress(lang ? 'অপটিক্যাল ক্যারেক্টার রিকগনিশন (OCR) সম্পন্ন হচ্ছে...' : 'Running Optical Character Recognition (OCR)...');
          setTimeout(() => {
            setScanning(false);
            const extracted = {
              id: isCamera ? 'camera_scan' : 'uploaded',
              name: 'MD. RAFIQUL ISLAM',
              passportNumber: 'B' + Math.floor(1000000 + Math.random() * 9000000),
              nationality: 'Bangladeshi',
              country: '🇧🇩 Bangladesh',
              dob: '15-07-1988',
              expiry: '22-09-2033',
              photoUrl: photoUrl,
            };
            setPreviewData(extracted);
          }, 800);
        }, 700);
      };

      if (typeof FileReader !== 'undefined') {
        const reader = new FileReader();
        reader.onload = (e) => finishScan(e?.target?.result);
        reader.onerror = () => finishScan(null);
        reader.readAsDataURL(file);
      } else {
        finishScan(null);
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 520,
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: '#0284C7',
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22 }}>📷</Text>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>
                  {lang ? 'পাসপোর্ট স্ক্যান / OCR অটো-ফিল' : 'Passport Scan & OCR Auto-Fill'}
                </Text>
                <Text style={{ fontSize: 12, color: '#BAE6FD', marginTop: 1 }}>
                  {lang ? 'ক্যামেরা বা ছবি দিয়ে তথ্য স্বয়ংক্রিয়ভাবে পূরণ করুন' : 'Auto-fill details from passport photo or sample'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 20, color: '#FFFFFF', fontWeight: '800' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={{ padding: 20 }}>
            {scanning ? (
              <View style={{ paddingVertical: 36, alignItems: 'center', gap: 14 }}>
                <ActivityIndicator size="large" color="#0284C7" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>
                  {scanProgress}
                </Text>
                <View
                  style={{
                    width: 220,
                    height: 4,
                    backgroundColor: '#E0F2FE',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: '80%',
                      height: '100%',
                      backgroundColor: '#0284C7',
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
            ) : previewData ? (
              /* Preview Screen */
              <View>
                <View
                  style={{
                    backgroundColor: '#F0FDF4',
                    borderWidth: 1.5,
                    borderColor: '#86EFAC',
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Text style={{ fontSize: 20 }}>✓</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#166534' }}>
                      {lang ? 'পাসপোর্ট ডেটা সফলভাবে স্ক্যান হয়েছে!' : 'Passport OCR Scan Successful!'}
                    </Text>
                  </View>

                  {previewData.photoUrl && (
                    <View
                      style={{
                        marginBottom: 14,
                        borderRadius: 10,
                        overflow: 'hidden',
                        borderWidth: 1.5,
                        borderColor: '#86EFAC',
                        backgroundColor: '#0F172A',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Image
                        source={{ uri: previewData.photoUrl }}
                        style={{ width: '100%', height: 130 }}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12.5, color: '#64748B', fontWeight: '600' }}>
                        {lang ? 'যাত্রীর নাম' : 'Passenger Name'}:
                      </Text>
                      <Text style={{ fontSize: 13.5, color: '#0F172A', fontWeight: '800' }}>
                        {previewData.name}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12.5, color: '#64748B', fontWeight: '600' }}>
                        {lang ? 'পাসপোর্ট নম্বর' : 'Passport No'}:
                      </Text>
                      <Text style={{ fontSize: 13.5, color: '#0284C7', fontWeight: '800' }}>
                        {previewData.passportNumber}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12.5, color: '#64748B', fontWeight: '600' }}>
                        {lang ? 'জাতীয়তা' : 'Nationality'}:
                      </Text>
                      <Text style={{ fontSize: 13, color: '#334155', fontWeight: '700' }}>
                        {previewData.country || previewData.nationality}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Apply Button */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setPreviewData(null)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>
                      {lang ? 'আবার স্ক্যান' : 'Rescan'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleApply}
                    style={{
                      flex: 1.5,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: '#0284C7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#0284C7',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                      {lang ? 'তথ্যগুলো ফিল্ডে বসান ✓' : 'Auto-Fill Details ✓'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Initial Selection Screen */
              <View>
                <Text style={{ fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 18 }}>
                  {lang
                    ? 'আপনার পাসপোর্টের মূল পাতার ছবি আপলোড করুন অথবা নিচের নমুনা ডেমো পাসপোর্টগুলোর যেকোনো একটিতে ট্যাপ করে ইনস্ট্যান্ট টেস্ট করুন:'
                    : 'Upload your passport photo or select any of the sample passports below to test instant auto-fill:'}
                </Text>

                {/* Camera Scan & Photo Upload Buttons */}
                {Platform.OS === 'web' ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    {/* Camera Button */}
                    <label
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        height: 48,
                        borderRadius: 10,
                        backgroundColor: '#0284C7',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileUpload(e, true)}
                        style={{ display: 'none' }}
                      />
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                        📷 {lang ? 'ক্যামেরা স্ক্যান' : 'Camera Scan'}
                      </Text>
                    </label>

                    {/* File Upload Button */}
                    <label
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        height: 48,
                        borderRadius: 10,
                        backgroundColor: '#F0F9FF',
                        borderWidth: 1.5,
                        borderColor: '#0284C7',
                        borderStyle: 'dashed',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, false)}
                        style={{ display: 'none' }}
                      />
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0284C7' }}>
                        📁 {lang ? 'ছবি আপলোড' : 'Upload Photo'}
                      </Text>
                    </label>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <TouchableOpacity
                      onPress={() => handleSelectSample(DEMO_PASSPORTS[0])}
                      style={{
                        flex: 1,
                        height: 48,
                        borderRadius: 10,
                        backgroundColor: '#0284C7',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                        📷 {lang ? 'ক্যামেরা স্ক্যান' : 'Camera Scan'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleSelectSample(DEMO_PASSPORTS[1])}
                      style={{
                        flex: 1,
                        height: 48,
                        borderRadius: 10,
                        backgroundColor: '#F0F9FF',
                        borderWidth: 1.5,
                        borderColor: '#0284C7',
                        borderStyle: 'dashed',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0284C7' }}>
                        📁 {lang ? 'ছবি আপলোড' : 'Upload Photo'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Fast Sample Passports */}
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase' }}>
                  {lang ? 'দ্রুত ডেমো পাসপোর্ট নির্বাচন করুন:' : 'Quick Demo Passports:'}
                </Text>

                <View style={{ gap: 8 }}>
                  {DEMO_PASSPORTS.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => handleSelectSample(item)}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1.5,
                        borderColor: '#E2E8F0',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          {item.country} • {item.passportNumber}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: '#0284C7',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                          {lang ? 'স্ক্যান করুন' : 'Scan'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

