import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { VISA_ON_ARRIVAL_DOCUMENTS } from '../constants/data';
import { compressImage } from '../utils/imageCompressor';

/**
 * VisaOnArrivalUploadSection
 *
 * Dedicated interactive card for the "Visa On Arrival" service.
 * Displays:
 * 1. $50 USD Airport counter fee notice + 1500 Tk FlightCare charge
 * 2. Passenger count adjustment
 * 3. 4 Mandatory document uploads (Invitation Letter, Return Ticket, Hotel Booking, Passport Copy)
 * 4. Document preview modal / viewer
 */
export default function VisaOnArrivalUploadSection({
  lang = 1,
  visaDetails = {},
  onUpdateVisaDetails,
  readOnly = false,
  containerStyle = {},
}) {
  const isBn = lang === 1;
  const [previewDoc, setPreviewDoc] = useState(null);
  const [uploadingKey, setUploadingKey] = useState(null);

  const currentCount = Math.max(1, Number(visaDetails?.count || 1));

  const handleCountChange = delta => {
    if (readOnly || !onUpdateVisaDetails) return;
    const nextCount = Math.max(1, Math.min(20, currentCount + delta));
    onUpdateVisaDetails({
      ...visaDetails,
      count: nextCount,
    });
  };

  const handlePickFile = docKey => {
    if (readOnly || !onUpdateVisaDetails) return;
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert(
        isBn ? 'ডকুমেন্ট আপলোড' : 'Document Upload',
        isBn
          ? 'ওয়েব ব্রাউজার থেকে ফাইল সিলেক্ট করুন।'
          : 'Please select a file using the web browser.'
      );
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,application/pdf';
    input.style.display = 'none';

    input.onchange = async e => {
      const file = e.target?.files?.[0];
      if (!file) {
        if (input.parentNode) input.parentNode.removeChild(input);
        return;
      }

      // Max 5MB check
      if (file.size > 5 * 1024 * 1024) {
        const msg = isBn
          ? 'ফাইলের সাইজ ৫ মেগাবাইটের (5MB) কম হতে হবে।'
          : 'File size must be less than 5MB.';
        if (typeof window !== 'undefined') window.alert(msg);
        else Alert.alert(isBn ? 'ফাইল সাইজ বেশি' : 'File Too Large', msg);
        if (input.parentNode) input.parentNode.removeChild(input);
        return;
      }

      setUploadingKey(docKey);

      try {
        let finalDataUrl = null;
        const isImage = file.type.startsWith('image/');

        if (isImage) {
          // Compress image to save quota & avoid large uploads
          try {
            finalDataUrl = await compressImage(file, {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 0.82,
            });
          } catch (compressErr) {
            console.warn('Image compression fallback to FileReader:', compressErr);
          }
        }

        if (!finalDataUrl) {
          // Fallback or PDF: Read via FileReader
          finalDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = ev => resolve(ev.target?.result);
            reader.onerror = err => reject(err);
            reader.readAsDataURL(file);
          });
        }

        const docRecord = {
          name: file.name,
          size: file.size,
          type: file.type || (isImage ? 'image/jpeg' : 'application/pdf'),
          dataUrl: finalDataUrl,
          uploadedAt: new Date().toISOString(),
        };

        onUpdateVisaDetails({
          ...visaDetails,
          [docKey]: docRecord,
        });
      } catch (err) {
        console.error('File upload error:', err);
        const failMsg = isBn
          ? 'ফাইল আপলোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
          : 'Failed to upload document. Please try again.';
        if (typeof window !== 'undefined') window.alert(failMsg);
        else Alert.alert('Error', failMsg);
      } finally {
        setUploadingKey(null);
        if (input.parentNode) input.parentNode.removeChild(input);
      }
    };

    document.body.appendChild(input);
    input.click();
  };

  const handleRemoveFile = docKey => {
    if (readOnly || !onUpdateVisaDetails) return;
    onUpdateVisaDetails({
      ...visaDetails,
      [docKey]: null,
    });
  };

  const handleViewFile = doc => {
    if (!doc) return;
    if (doc.dataUrl) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const isPdf = doc.type?.includes('pdf') || doc.name?.toLowerCase().endsWith('.pdf');
        if (isPdf) {
          const w = window.open('');
          if (w) {
            w.document.write(
              `<iframe src="${doc.dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`
            );
            return;
          }
        }
      }
      setPreviewDoc(doc);
    } else {
      Alert.alert(isBn ? 'ডকুমেন্ট' : 'Document', doc.name || 'Attached file');
    }
  };

  // Calculate uploaded documents count
  const uploadedCount = (VISA_ON_ARRIVAL_DOCUMENTS || []).filter(
    d => Boolean(visaDetails?.[d.key]?.name || visaDetails?.[d.key]?.dataUrl)
  ).length;
  const allUploaded = uploadedCount === 4;

  const formatFileSize = bytes => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View
      style={[
        {
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: '#BAE6FD',
          padding: 14,
          marginTop: 10,
        },
        containerStyle,
      ]}
    >
      {/* 1. Official Notice & Fee Banner */}
      <View
        style={{
          backgroundColor: '#FFFBEB',
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: '#FDE68A',
          padding: 12,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Text style={{ fontSize: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
            {isBn
              ? 'অন-অ্যারাইভাল ভিসা সংক্রান্ত জরুরি নির্দেশনা ও সরকারি ফি'
              : 'Visa On Arrival Official Guidelines & Airport Fee Notice'}
          </Text>
        </View>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 12, color: '#78350F', lineHeight: 18 }}>
            💵 <Text style={{ fontWeight: '800', color: '#B45309' }}>
              {isBn ? 'সরকারি ভিসা ফি:' : 'Govt Visa Fee:'}
            </Text>{' '}
            {isBn
              ? 'জনপ্রতি $50 USD (পঞ্চাশ ডলার) যাত্রীকে বিমানবন্দরে ইমিগ্রেশন/ব্যাংক কাউন্টারে সরাসরি জমা দিতে হবে।'
              : '$50 USD per passenger must be paid directly by the passenger at the airport immigration / counter.'}
          </Text>

          <Text style={{ fontSize: 12, color: '#78350F', lineHeight: 18 }}>
            💼 <Text style={{ fontWeight: '800', color: '#B45309' }}>
              {isBn ? 'ফ্লাইটকেয়ার সার্ভিস চার্জ:' : 'FlightCare Service Charge:'}
            </Text>{' '}
            {isBn
              ? 'জনপ্রতি ১,৫০০ টাকা (ডকুমেন্ট প্রি-চেক, এন্ট্রি ভেরিফিকেশন ও এয়ারপোর্ট গ্রাউন্ড সাপোর্ট)।'
              : '৳1,500 per passenger (document pre-check, clearance guidance & protocol assistance).'}
          </Text>

          <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '700', marginTop: 2, lineHeight: 17 }}>
            📋 {isBn
              ? 'আবশ্যিক ডকুমেন্টস: নিচের ৪টি ডকুমেন্ট অবশ্যই সংযুক্ত (Attach) করতে হবে।'
              : 'Mandatory Documents: All 4 documents below must be attached to proceed.'}
          </Text>
        </View>
      </View>

      {/* 2. Passenger Counter & Total Service Charge */}
      {!readOnly && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F0F9FF',
            padding: 10,
            borderRadius: 10,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#BAE6FD',
          }}
        >
          <View>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0369A1' }}>
              👤 {isBn ? 'ভিসা যাত্রীর সংখ্যা:' : 'Visa Passengers:'}
            </Text>
            <Text style={{ fontSize: 11, color: '#0284C7', marginTop: 1 }}>
              ৳ ১,৫০০ x {currentCount} ={' '}
              <Text style={{ fontWeight: '800' }}>৳ {1500 * currentCount}</Text>
              <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '700' }}>
                {' '}(+ ${50 * currentCount} USD {isBn ? 'এয়ারপোর্টে প্রদেয়' : 'at airport'})
              </Text>
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              onPress={() => handleCountChange(-1)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#E2E8F0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>-</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0284C7', minWidth: 20, textAlign: 'center' }}>
              {currentCount}
            </Text>
            <TouchableOpacity
              onPress={() => handleCountChange(1)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#0284C7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. Progress Status Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          paddingHorizontal: 2,
        }}
      >
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E293B' }}>
          📎 {isBn ? 'আবশ্যিক ডকুমেন্ট সংযুক্তি' : 'Mandatory Document Attachments'}
        </Text>
        <View
          style={{
            backgroundColor: allUploaded ? '#DCFCE7' : '#FEF3C7',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: allUploaded ? '#86EFAC' : '#FDE68A',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: allUploaded ? '#15803D' : '#B45309',
            }}
          >
            {allUploaded
              ? isBn
                ? '✓ ৪/৪টি আপলোড সম্পন্ন'
                : '✓ 4/4 Uploaded'
              : isBn
              ? `${uploadedCount}/৪টি আপলোড করা হয়েছে`
              : `${uploadedCount}/4 Uploaded`}
          </Text>
        </View>
      </View>

      {/* 4. 4 Mandatory Document Cards */}
      <View style={{ gap: 8 }}>
        {(VISA_ON_ARRIVAL_DOCUMENTS || []).map(doc => {
          const docFile = visaDetails?.[doc.key];
          const hasFile = Boolean(docFile && (docFile.name || docFile.dataUrl));
          const isUploading = uploadingKey === doc.key;

          return (
            <View
              key={doc.key}
              style={{
                backgroundColor: hasFile ? '#F0FDF4' : '#F8FAFC',
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: hasFile ? '#86EFAC' : '#E2E8F0',
                padding: 10,
              }}
            >
              {/* Header: Icon, Name, Mandatory Tag */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Text style={{ fontSize: 16 }}>{doc.icon || '📄'}</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                    {isBn ? doc.labelBn : doc.labelEn}
                  </Text>
                  <View
                    style={{
                      backgroundColor: hasFile ? '#DCFCE7' : '#FEE2E2',
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9.5,
                        fontWeight: '800',
                        color: hasFile ? '#166534' : '#DC2626',
                      }}
                    >
                      {hasFile
                        ? isBn
                          ? '✓ সংযুক্ত'
                          : '✓ Attached'
                        : isBn
                        ? '* আবশ্যিক'
                        : '* Mandatory'}
                    </Text>
                  </View>
                </View>

                {/* Status or Upload Action */}
                {!hasFile && !readOnly && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isUploading}
                    onPress={() => handlePickFile(doc.key)}
                    style={{
                      backgroundColor: '#0284C7',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                      {isUploading
                        ? isBn
                          ? 'আপলোড হচ্ছে...'
                          : 'Uploading...'
                        : isBn
                        ? '＋ ফাইল যোগ করুন'
                        : '＋ Upload File'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Subtitle / Hint */}
              {!hasFile && (
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 3, marginLeft: 22 }}>
                  {isBn ? doc.descBn : doc.descEn}
                </Text>
              )}

              {/* Uploaded File Info Card */}
              {hasFile && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 6,
                    paddingTop: 6,
                    borderTopWidth: 1,
                    borderTopColor: '#DCFCE7',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 13 }}>
                      {docFile.type?.includes('pdf') || docFile.name?.toLowerCase().endsWith('.pdf')
                        ? '📕'
                        : '🖼️'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontSize: 11.5, fontWeight: '700', color: '#166534' }}
                        numberOfLines={1}
                      >
                        {docFile.name || (isBn ? 'সংযুক্ত ডকুমেন্ট' : 'Attached Document')}
                      </Text>
                      {docFile.size ? (
                        <Text style={{ fontSize: 10, color: '#65A30D' }}>
                          {formatFileSize(docFile.size)}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {/* View Button */}
                    <TouchableOpacity
                      onPress={() => handleViewFile(docFile)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#86EFAC',
                        paddingHorizontal: 8,
                        paddingVertical: 3.5,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#15803D' }}>
                        👁️ {isBn ? 'দেখুন' : 'View'}
                      </Text>
                    </TouchableOpacity>

                    {/* Change / Replace Button */}
                    {!readOnly && (
                      <TouchableOpacity
                        onPress={() => handlePickFile(doc.key)}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                          paddingHorizontal: 8,
                          paddingVertical: 3.5,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569' }}>
                          🔄 {isBn ? 'বদলান' : 'Change'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Remove Button */}
                    {!readOnly && (
                      <TouchableOpacity
                        onPress={() => handleRemoveFile(doc.key)}
                        style={{
                          backgroundColor: '#FEE2E2',
                          paddingHorizontal: 7,
                          paddingVertical: 3.5,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#DC2626' }}>
                          ✕
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Lightbox / Modal for Previewing Document Images */}
      {previewDoc && (
        <Modal
          visible={Boolean(previewDoc)}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewDoc(null)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 600,
                maxHeight: '90%',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E2E8F0',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                    {previewDoc.name || 'Document Preview'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    {formatFileSize(previewDoc.size)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPreviewDoc(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#E2E8F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#334155' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Preview Body */}
              <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
                {previewDoc.type?.startsWith('image/') || previewDoc.dataUrl?.startsWith('data:image') ? (
                  <Image
                    source={{ uri: previewDoc.dataUrl }}
                    style={{ width: '100%', height: 380 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{ padding: 24, alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 48 }}>📕</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                      {previewDoc.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
                      {isBn
                        ? 'এটি একটি পিডিএফ (PDF) ডকুমেন্ট। ব্রাউজারের নতুন উইন্ডোতে দেখতে পারেন।'
                        : 'This is a PDF document. You can open and view it in a new window.'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

