import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  unlockMasterVault,
  lockMasterVault,
  changeMasterVaultPin,
} from '../services/dualVaultService';

export default function DualVaultPinModal({
  visible,
  onClose,
  isUnlocked,
  onVaultStateChanged,
  lang = 0,
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  if (!visible) return null;

  const handleUnlock = async () => {
    if (!pin.trim()) {
      setError(lang ? 'অনুগ্রহ করে গোপন পিন দিন' : 'Please enter secret PIN');
      return;
    }
    const res = await unlockMasterVault(pin.trim());
    if (res.ok) {
      setPin('');
      setError('');
      if (onVaultStateChanged) onVaultStateChanged(true);
      onClose();
    } else {
      setError(lang ? 'ভুল পিন কোড! সঠিক পিন দিন।' : 'Incorrect PIN! Please enter the correct PIN.');
    }
  };

  const handleLock = () => {
    lockMasterVault();
    setPin('');
    setError('');
    if (onVaultStateChanged) onVaultStateChanged(false);
    onClose();
  };

  const handleChangePinSubmit = async () => {
    if (!oldPin || !newPin) {
      setError(lang ? 'সবগুলো ঘর পূরণ করুন' : 'Fill all fields');
      return;
    }
    if (newPin !== confirmPin) {
      setError(lang ? 'নতুন পিন দুটি মেলেনি' : 'New PINs do not match');
      return;
    }
    const res = await changeMasterVaultPin(oldPin, newPin);
    if (res.ok) {
      Alert.alert(
        lang ? 'পিন সফলভাবে পরিবর্তিত হয়েছে' : 'PIN Updated',
        lang ? 'আপনার গোপন মাস্টার পিন সফলভাবে আপডেট করা হয়েছে।' : 'Master vault PIN has been updated.'
      );
      setIsChangingPin(false);
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setError('');
    } else {
      setError(res.message || (lang ? 'পিন পরিবর্তনে ব্যর্থ' : 'Failed to update PIN'));
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
          zIndex: 99999,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            width: '100%',
            maxWidth: 420,
            padding: 22,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            elevation: 10,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: isUnlocked ? '#FEF2F2' : '#F0F9FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: isUnlocked ? '#FCA5A5' : '#BAE6FD',
                }}
              >
                <Text style={{ fontSize: 18 }}>{isUnlocked ? '🔐' : '🛡️'}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                  {isUnlocked
                    ? (lang ? 'মাস্টার ভল্ট আনলকড' : 'Master Vault (Active)')
                    : (lang ? 'ডুয়াল ডাটাবেজ সিকিউরিটি' : 'Dual-Vault Controller')}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  {isUnlocked
                    ? (lang ? 'ডাটাবেজ ২ (১০০% আসল ডাটা দৃশ্যমান)' : 'Database 2 (Full Master Data Visible)')
                    : (lang ? 'ডাটাবেজ ১ (পরিদর্শক / পাবলিক মোড)' : 'Database 1 (Auditor / Showcase Mode)')}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Current Status Pill */}
          <View
            style={{
              backgroundColor: isUnlocked ? '#FFF1F2' : '#F0FDF4',
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: isUnlocked ? '#FECDD3' : '#BBF7D0',
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: isUnlocked ? '#BE123C' : '#15803D' }}>
              {isUnlocked
                ? (lang ? '⚠️ বর্তমানে মাস্টার ডাটাবেজ আনলকড আছে। যেকোনো বহিরাগত বা পরিদর্শককে স্ক্রিন বা এক্সেল দেখানোর আগে লক করুন।' : '⚠️ Master Database is currently unlocked. Lock to Database 1 before showing screen or Excel to auditor.')
                : (lang ? '✓ বর্তমানে ডাটাবেজ ১ (পরিদর্শক মোড) সক্রিয়। স্ক্রিন ও এক্সেলে শুধুমাত্র নির্বাচিত বুকিং দৃশ্যমান।' : '✓ Database 1 (Auditor Mode) is active. Only selected showcase bookings are visible on screen and Excel.')}
            </Text>
          </View>

          {/* Body */}
          {isUnlocked ? (
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={handleLock}
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#0284C7',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                  🔒 {lang ? 'লক করে ডাটাবেজ ১ (পরিদর্শক মোডে) যান' : 'Lock to Database 1 (Auditor Mode)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsChangingPin(!isChangingPin)}
                style={{ paddingVertical: 8, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 12.5, color: '#0369A1', fontWeight: '700' }}>
                  ⚙️ {isChangingPin
                    ? (lang ? 'বাতিল করুন' : 'Cancel')
                    : (lang ? 'মাস্টার পিন পরিবর্তন করুন' : 'Change Master Vault PIN')}
                </Text>
              </TouchableOpacity>

              {isChangingPin && (
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 8, marginTop: 4 }}>
                  <TextInput
                    placeholder={lang ? 'বর্তমান পিন (ডিফল্ট: 7860)' : 'Current PIN (Default: 7860)'}
                    value={oldPin}
                    onChangeText={setOldPin}
                    keyboardType="numeric"
                    secureTextEntry
                    style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 }}
                  />
                  <TextInput
                    placeholder={lang ? 'নতুন ৪-সংখ্যার পিন' : 'New 4-digit PIN'}
                    value={newPin}
                    onChangeText={setNewPin}
                    keyboardType="numeric"
                    secureTextEntry
                    style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 }}
                  />
                  <TextInput
                    placeholder={lang ? 'নতুন পিন আবার লিখুন' : 'Confirm New PIN'}
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                    keyboardType="numeric"
                    secureTextEntry
                    style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 }}
                  />
                  {error ? <Text style={{ color: '#DC2626', fontSize: 11.5, fontWeight: '700' }}>{error}</Text> : null}
                  <TouchableOpacity
                    onPress={handleChangePinSubmit}
                    style={{ backgroundColor: '#0F172A', paddingVertical: 9, borderRadius: 8, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                      {lang ? 'পিন সংরক্ষণ করুন' : 'Save New PIN'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                {lang ? 'মাস্টার ডাটাবেজ (১০০% আসল বুকিং) আনলক করতে গোপন পিন লিখুন:' : 'Enter Secret PIN to unlock Database 2 (100% Real Bookings):'}
              </Text>
              <TextInput
                placeholder={lang ? 'গোপন পিন লিখুন (যেমন: 7860)' : 'Enter Secret PIN (e.g. 7860)'}
                value={pin}
                onChangeText={t => {
                  setPin(t);
                  setError('');
                }}
                keyboardType="numeric"
                secureTextEntry
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1.5,
                  borderColor: error ? '#EF4444' : '#0284C7',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 16,
                  fontWeight: '800',
                  letterSpacing: 2,
                  textAlign: 'center',
                }}
              />
              {error ? (
                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={handleUnlock}
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#F59E0B',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 4,
                }}
              >
                <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '900' }}>
                  🔓 {lang ? 'মাস্টার ডাটাবেজ আনলক করুন' : 'Unlock Master Vault'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

