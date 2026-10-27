import React from 'react';
import { View, ScrollView } from 'react-native';
import OfficerProfileModal from '../../components/OfficerProfileModal';
import ScreenHeaderBar from '../../components/ScreenHeaderBar';

export default function OfficerProfileScreen({
  officerId = 'st-1',
  lang = 1,
  onBack,
  onBookOfficer,
  pagePadding = 16,
}) {
  const isBn = lang === 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingHorizontal: pagePadding, paddingTop: 10 }}>
        <ScreenHeaderBar
          title={isBn ? 'প্রোটোকল অফিসার প্রোফাইল' : 'Protocol Officer Profile'}
          subtitle={
            isBn
              ? 'অফিসার পরিচিতি, রেটিং, র‌্যাংক ও ডিজিটাল আইডি কার্ড'
              : 'Officer credentials, badge, performance score & ID card'
          }
          onBack={onBack}
          lang={lang}
          backLabel={isBn ? 'ফিরে যান' : 'Back'}
          showHome={true}
          onHome={onBack}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: pagePadding, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <OfficerProfileModal
          visible={true}
          isInline={true}
          onClose={onBack}
          officerId={officerId}
          lang={lang}
          onBookOfficer={onBookOfficer}
        />
      </ScrollView>
    </View>
  );
}
