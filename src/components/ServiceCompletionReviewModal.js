import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { addOfficerReview } from '../services/officerService';
import { dispatchStaffNotification, STAFF_NOTIFICATION_TYPES } from '../services/communication';
import { dispatchBookingLifecycleNotifications } from '../services/notificationService';
import { saveBookingToFirestore } from '../services/firebaseSyncService';
import { findFamilyMember } from '../services/flightCareFamilyService';

export default function ServiceCompletionReviewModal({
  visible,
  onClose,
  booking,
  onReviewSubmitted,
  lang = 0,
}) {
  const isBn = Boolean(lang);
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState([
    isBn ? '⏱️ সময়নিষ্ঠতা' : '⏱️ Punctual',
    isBn ? '🤝 অত্যন্ত বিনয়ী ও আন্তরিক' : '🤝 Courteous & Polite',
  ]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!visible || !booking) return null;

  // Resolve assigned officer details
  const officerId =
    booking.staffId ||
    booking.leadStaffId ||
    booking.assignedStaff?.id ||
    'FC-PO-001';

  const familyOfficer = findFamilyMember(officerId) || findFamilyMember(booking.assignedStaff?.badgeNo) || null;

  const officerName =
    familyOfficer?.name ||
    booking.staff ||
    booking.assignedStaff?.name ||
    (isBn ? 'প্রোটোকল কনসিয়ার্জ অফিসার' : 'Protocol Concierge Officer');

  const officerNameBn =
    familyOfficer?.nameBn ||
    officerName;

  const officerRole =
    familyOfficer?.role ||
    booking.assignedStaff?.role ||
    (isBn ? 'সিনিয়র প্রোটোকল অফিসার' : 'Senior Protocol Officer');

  const officerBadge =
    familyOfficer?.badgeNo ||
    booking.assignedStaff?.badgeNo ||
    officerId ||
    'FC-PO-001';

  const officerPhoto =
    familyOfficer?.photo ||
    booking.assignedStaff?.avatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

  const passengerName =
    booking.passengerName ||
    booking.customer ||
    (booking.passengers && booking.passengers[0]?.name) ||
    (isBn ? 'সম্মানিত যাত্রী' : 'Valued Passenger');

  const flightNumber =
    booking.flight?.number ||
    booking.flightNumber ||
    booking.fno ||
    'Flight';

  const quickTags = [
    isBn ? '⏱️ সময়নিষ্ঠতা' : '⏱️ Punctual',
    isBn ? '🤝 অত্যন্ত বিনয়ী ও আন্তরিক' : '🤝 Courteous & Polite',
    isBn ? '🧳 দ্রুত লাগেজ সহায়তা' : '🧳 Luggage Care',
    isBn ? '⚡ ফাস্ট-ট্র্যাক ইমিগ্রেশন' : '⚡ Fast-Track Clearance',
    isBn ? '🛡️ নিরাপদ এস্কর্ট' : '🛡️ Safe Escort',
    isBn ? '♿ চমৎকার বিশেষ যত্ন' : '♿ Special Care',
  ];

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const getRatingFeedbackLabel = (score) => {
    switch (score) {
      case 5:
        return isBn ? '🌟 অসাধারণ ও আন্তরিক অভিজ্ঞতা! (৫/৫)' : '🌟 Outstanding & Courteous Experience! (5/5)';
      case 4:
        return isBn ? '⭐ খুব ভালো ও দায়িত্বশীল সেবা (৪/৫)' : '⭐ Very Good & Responsible Service (4/5)';
      case 3:
        return isBn ? '⭐ মোটামুটি সন্তোষজনক (৩/৫)' : '⭐ Satisfactory Service (3/5)';
      case 2:
        return isBn ? '⭐ কিছুটা ঘাটতি ছিল (২/৫)' : '⭐ Needs Improvement (2/5)';
      default:
        return isBn ? '⭐ অসন্তোষজনক অভিজ্ঞতা (১/৫)' : '⭐ Unsatisfactory Experience (1/5)';
    }
  };

  const handleSubmitReview = async () => {
    setIsSubmitting(true);

    const fullComment = [
      selectedTags.length > 0 ? selectedTags.join(', ') : '',
      comment.trim(),
    ]
      .filter(Boolean)
      .join(' — ');

    const reviewPayload = {
      reviewerName: passengerName,
      rating,
      comment: fullComment || (isBn ? 'অত্যন্ত চমৎকার ও দায়িত্বশীল প্রোটোকল সেবা!' : 'Exceptional protocol service!'),
      commentBn: fullComment || 'অত্যন্ত চমৎকার ও দায়িত্বশীল প্রোটোকল সেবা!',
      commentEn: fullComment || 'Exceptional protocol service!',
      flight: flightNumber,
      serviceType: booking.serviceName || booking.serviceCategory || (isBn ? 'ভিআইপি এয়ারপোর্ট প্রোটোকল' : 'VIP Airport Protocol'),
      verifiedPassenger: true,
      bookingId: booking.id,
      submittedAt: new Date().toISOString(),
    };

    try {
      // 1. Add review to officer profile database (both for staff ID and badge)
      await addOfficerReview(officerBadge, reviewPayload);
      if (officerId !== officerBadge) {
        await addOfficerReview(officerId, reviewPayload);
      }
    } catch (e) {
      console.warn('Error in addOfficerReview:', e);
    }

    try {
      // 2. Dispatch real-time notification to the Protocol Officer!
      await dispatchStaffNotification({
        staffId: officerBadge,
        staffName: isBn ? officerNameBn : officerName,
        type: STAFF_NOTIFICATION_TYPES.CUSTOMER_REVIEW,
        bookingId: booking.id,
        passengerName,
        flight: flightNumber,
        rating,
        comment: fullComment,
        lang,
      });
    } catch (e) {
      console.warn('Error dispatching staff review notification:', e);
    }

    try {
      // 3. Update booking document in Firestore
      // 4. Universal 4-Role Notification (Passenger, Officer, Manager, Super Admin)
      dispatchBookingLifecycleNotifications({
        stage: 'customer_review',
        booking,
        staff: familyOfficer,
        extra: { rating, comment: fullComment },
        lang,
      }).catch(() => {});

      await saveBookingToFirestore({
        ...booking,
        customerRating: rating,
        customerFeedback: fullComment,
        ratedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Error saving booking rating to Firestore:', e);
    }

    setIsSubmitting(false);
    setIsSuccess(true);

    if (typeof onReviewSubmitted === 'function') {
      onReviewSubmitted(booking.id, {
        rating,
        comment: fullComment,
        officerBadge,
      });
    }

    // Auto-close after showing success state
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 2000);
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
            borderWidth: 1.5,
            borderColor: '#FDE047',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Header Banner */}
          <View
            style={{
              backgroundColor: '#0F172A',
              paddingVertical: 18,
              paddingHorizontal: 20,
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: '#1E293B',
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#1E293B',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
                borderWidth: 1.5,
                borderColor: '#F59E0B',
              }}
            >
              <Text style={{ fontSize: 24 }}>🎉</Text>
            </View>

            <Text
              style={{
                fontSize: 18,
                fontWeight: '900',
                color: '#F8FAFC',
                textAlign: 'center',
              }}
            >
              {isBn ? 'আপনার প্রোটোকল সেবা সফলভাবে সম্পন্ন হয়েছে!' : 'Service Completed Successfully!'}
            </Text>
            <Text
              style={{
                fontSize: 12.5,
                color: '#94A3B8',
                textAlign: 'center',
                marginTop: 4,
                lineHeight: 18,
              }}
            >
              {isBn
                ? 'সম্মানিত যাত্রী, আপনার দায়িত্বপ্রাপ্ত প্রোটোকল অফিসারের সেবার মান কেমন ছিল? অনুগ্রহ করে একটি রিভিউ প্রদান করুন।'
                : 'Valued Passenger, how was your protocol concierge experience? Please leave a verified review.'}
            </Text>
          </View>

          {isSuccess ? (
            <View style={{ padding: 36, alignItems: 'center' }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: '#22C55E',
                  marginBottom: 14,
                }}
              >
                <Text style={{ fontSize: 30 }}>✓</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#166534', textAlign: 'center' }}>
                {isBn ? 'রিভিউ সফলভাবে গৃহীত হয়েছে!' : 'Review Submitted Successfully!'}
              </Text>
              <Text style={{ fontSize: 13, color: '#4B5563', textAlign: 'center', marginTop: 6 }}>
                {isBn
                  ? 'আপনার মূল্যবান মতামতের জন্য ধন্যবাদ। এটি প্রোটোকল অফিসারের প্রোফাইলে যুক্ত হয়েছে।'
                  : 'Thank you for your valuable feedback. It has been added to the officer profile.'}
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 18, gap: 14 }}
              style={{ maxHeight: Platform.OS === 'web' ? '75vh' : 500 }}
            >
              {/* Officer Card */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Image
                  source={{ uri: officerPhoto }}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    borderWidth: 2,
                    borderColor: '#F59E0B',
                    backgroundColor: '#E2E8F0',
                  }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>
                      {isBn ? officerNameBn : officerName}
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#DCFCE7',
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>
                        ✓ {isBn ? 'অফিসিয়াল' : 'Official'}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                    {officerRole} • {officerBadge}
                  </Text>

                  <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '700', marginTop: 2 }}>
                    ✈️ {flightNumber} • #{booking.id}
                  </Text>
                </View>
              </View>

              {/* 5-Star Selector */}
              <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                  {isBn ? 'আপনার স্টার রেটিং নির্বাচন করুন:' : 'Select Star Rating:'}
                </Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      activeOpacity={0.7}
                      style={{ padding: 4 }}
                    >
                      <Text
                        style={{
                          fontSize: 34,
                          transform: [{ scale: star <= rating ? 1.05 : 0.95 }],
                          opacity: star <= rating ? 1 : 0.25,
                        }}
                      >
                        ⭐
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    fontWeight: '800',
                    color: rating >= 4 ? '#B45309' : rating >= 3 ? '#0284C7' : '#DC2626',
                    textAlign: 'center',
                  }}
                >
                  {getRatingFeedbackLabel(rating)}
                </Text>
              </View>

              {/* Quick Tags Section */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                  {isBn ? 'বিশেষ অভিজ্ঞতা কেমন ছিল? (ট্যাগ চাপুন):' : 'What stood out? (Tap tags):'}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {quickTags.map((tag, idx) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        onPress={() => toggleTag(tag)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: isSelected ? '#FEF3C7' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: isSelected ? '#F59E0B' : '#E2E8F0',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11.5,
                            fontWeight: isSelected ? '800' : '600',
                            color: isSelected ? '#92400E' : '#475569',
                          }}
                        >
                          {tag} {isSelected ? '✓' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Comment Input */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 }}>
                  {isBn ? 'অফিসারের জন্য প্রশংসাসূচক বার্তা (ঐচ্ছিক):' : 'Comments & Feedback (Optional):'}
                </Text>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder={
                    isBn
                      ? 'অফিসারের ব্যবহার, কাজের গতি বা বিশেষ কোনো অভিজ্ঞতা সম্পর্কে লিখুন...'
                      : 'Write about the officer’s professionalism, assistance, or experience...'
                  }
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 12.5,
                    color: '#0F172A',
                    minHeight: 70,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              {/* Verification Assurance note */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#ECFDF5',
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#A7F3D0',
                }}
              >
                <Text style={{ fontSize: 12 }}>🛡️</Text>
                <Text style={{ fontSize: 11, color: '#065F46', flex: 1, fontWeight: '600' }}>
                  {isBn
                    ? 'এটি একজন ভেরিফাইড প্যাসেঞ্জার রিভিউ হিসেবে অফিসারের অফিশিয়াল প্রোফাইলে সংরক্ষিত হবে।'
                    : 'This verified passenger review will be published to the officer’s official airport profile.'}
                </Text>
              </View>

              {/* Actions Row */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>
                    {isBn ? 'পরে দিবো' : 'Skip for now'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={isSubmitting}
                  onPress={handleSubmitReview}
                  style={{
                    flex: 2,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: '#10B981',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 15 }}>⭐</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#FFFFFF' }}>
                        {isBn ? 'রিভিউ সাবমিট করুন' : 'Submit Review'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

