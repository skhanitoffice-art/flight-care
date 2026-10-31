import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import {
  VAULT_ROLES,
  DEFAULT_ADMIN_PIN,
  DEFAULT_MANAGER_PIN,
  getActiveVaultRole,
  unlockVault,
  lockMasterVault,
  changeVaultPin,
  getAuditorExcelConfig,
  setAuditorExcelConfig,
  DEFAULT_EXCEL_CONFIG,
  setVaultRoleDirectly,
} from '../services/dualVaultService';

export default function DualVaultPinModal({
  visible,
  onClose,
  activeRole: propRole,
  isUnlocked,
  onVaultStateChanged,
  lang = 0,
}) {
  const currentRole = propRole || getActiveVaultRole() || (isUnlocked ? VAULT_ROLES.ADMIN : VAULT_ROLES.AUDITOR);
  const [selectedTargetRole, setSelectedTargetRole] = useState(VAULT_ROLES.MANAGER); // Default target tab when locked
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [changeRole, setChangeRole] = useState(VAULT_ROLES.MANAGER);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [excelConfig, setExcelConfig] = useState(DEFAULT_EXCEL_CONFIG);

  useEffect(() => {
    if (visible) {
      getAuditorExcelConfig().then(cfg => {
        if (cfg) setExcelConfig(cfg);
      });
      setError('');
      setPin('');
      setIsChangingPin(false);
    }
  }, [visible]);

  if (!visible) return null;

  const isRoleActive = currentRole !== VAULT_ROLES.AUDITOR;
  const isManagerActive = currentRole === VAULT_ROLES.MANAGER;
  const isAdminActive = currentRole === VAULT_ROLES.ADMIN;

  const handleUnlock = async (overrideRole = null) => {
    if (!pin.trim()) {
      setError(lang ? 'অনুগ্রহ করে গোপন পিন কোড লিখুন' : 'Please enter secret PIN');
      return;
    }
    const target = overrideRole || selectedTargetRole;
    // Attempt unlock with auto-detection or target role
    const res = await unlockVault(pin.trim(), target);
    if (res.ok) {
      setPin('');
      setError('');
      if (onVaultStateChanged) onVaultStateChanged(res.role, true);
      onClose();
    } else {
      // Fallback try without role constraint (auto-detect)
      const resAuto = await unlockVault(pin.trim(), null);
      if (resAuto.ok) {
        setPin('');
        setError('');
        if (onVaultStateChanged) onVaultStateChanged(resAuto.role, true);
        onClose();
      } else {
        setError(res.message || (lang ? 'ভুল পিন কোড! সঠিক পিন দিন।' : 'Incorrect PIN! Please enter the correct PIN.'));
      }
    }
  };

  const handleLock = () => {
    lockMasterVault();
    setPin('');
    setError('');
    if (onVaultStateChanged) onVaultStateChanged(VAULT_ROLES.AUDITOR, false);
    onClose();
  };

  const handleSwitchToManagerDirectly = () => {
    setVaultRoleDirectly(VAULT_ROLES.MANAGER);
    if (onVaultStateChanged) onVaultStateChanged(VAULT_ROLES.MANAGER, true);
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
    const res = await changeVaultPin({ role: changeRole, oldPin, newPin });
    if (res.ok) {
      const roleTitle = changeRole === VAULT_ROLES.ADMIN
        ? (lang ? 'সুপার এডমিন ভল্ট' : 'Super Admin Vault')
        : (lang ? 'ম্যানেজার ভল্ট' : 'Manager Vault');
      Alert.alert(
        lang ? 'পিন সফলভাবে সংরক্ষিত হয়েছে' : 'PIN Updated',
        lang ? `${roleTitle}-এর গোপন পিন সফলভাবে আপডেট করা হয়েছে।` : `${roleTitle} secret PIN has been updated.`
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
            borderRadius: 20,
            width: '100%',
            maxWidth: 460,
            maxHeight: '92%',
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
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isAdminActive ? '#FEF2F2' : isManagerActive ? '#EFF6FF' : '#F8FAFC',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: isAdminActive ? '#FCA5A5' : isManagerActive ? '#93C5FD' : '#CBD5E1',
                }}
              >
                <Text style={{ fontSize: 20 }}>
                  {isAdminActive ? '👑' : isManagerActive ? '💼' : '🛡️'}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                  {isAdminActive
                    ? (lang ? 'সুপার এডমিন মাস্টার ভল্ট' : 'Super Admin Master Vault')
                    : isManagerActive
                    ? (lang ? 'ম্যানেজার ভল্ট (বিগত ২ দিন)' : 'Manager Vault (Last 2 Days)')
                    : (lang ? 'ডুয়াল-ভল্ট কন্ট্রোলার' : 'Dual-Vault Controller')}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  {isAdminActive
                    ? (lang ? '১০০% আসল আজীবন ডাটাবেজ সক্রিয়' : '100% Lifetime Database Active')
                    : isManagerActive
                    ? (lang ? 'বিগত ২ দিনের সকল রেকর্ড সক্রিয়' : 'Rolling 48 Hours Data Active')
                    : (lang ? 'ডাটাবেজ ১ (পরিদর্শক / পাবলিক মোড)' : 'Database 1 (Auditor / Showcase Mode)')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{ padding: 6, borderRadius: 8, backgroundColor: '#F1F5F9' }}
            >
              <Text style={{ fontSize: 16, color: '#64748B', fontWeight: '800' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {/* Status Pill */}
            <View
              style={{
                backgroundColor: isAdminActive
                  ? '#FFF1F2'
                  : isManagerActive
                  ? '#F0F9FF'
                  : '#F0FDF4',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1.5,
                borderColor: isAdminActive
                  ? '#FECDD3'
                  : isManagerActive
                  ? '#BAE6FD'
                  : '#BBF7D0',
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '800',
                  color: isAdminActive
                    ? '#BE123C'
                    : isManagerActive
                    ? '#0369A1'
                    : '#15803D',
                }}
              >
                {isAdminActive
                  ? (lang
                      ? '👑 সুপার এডমিন মাস্টার ভল্ট সক্রিয়। সর্বকালের ১০০% আসল রেকর্ড দৃশ্যমান।'
                      : '👑 Super Admin Master Vault active. 100% all-time platform records visible.')
                  : isManagerActive
                  ? (lang
                      ? '💼 ম্যানেজার ভল্ট সক্রিয়। বিগত ২ দিনের (আজ ও গতকালের) সকল রেকর্ড ও রিপোর্ট দৃশ্যমান।'
                      : '💼 Manager Vault active. All bookings and reports from the last 2 days visible.')
                  : (lang
                      ? '🛡️ বর্তমানে অডিটর মোড (DB-1) সক্রিয়। শুধুমাত্র নির্বাচিত বা ডেমো বুকিং দৃশ্যমান।'
                      : '🛡️ Auditor Mode (DB-1) is active. Only showcase bookings are visible on screen & CSV.')}
              </Text>
            </View>

            {/* UNLOCKED STATE ACTIONS */}
            {isRoleActive ? (
              <View style={{ gap: 10 }}>
                {/* Switch between vaults or lock */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {isAdminActive ? (
                    <TouchableOpacity
                      onPress={handleSwitchToManagerDirectly}
                      activeOpacity={0.85}
                      style={{
                        flex: 1,
                        backgroundColor: '#0284C7',
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                        💼 {lang ? 'ম্যানেজার ভল্টে যান (২ দিন)' : 'Switch to Manager Vault'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        // Switch from manager to super admin by prompting for super admin PIN
                        setSelectedTargetRole(VAULT_ROLES.ADMIN);
                        handleLock();
                      }}
                      activeOpacity={0.85}
                      style={{
                        flex: 1,
                        backgroundColor: '#7C3AED',
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                        👑 {lang ? 'সুপার এডমিন ভল্ট খুলুন' : 'Unlock Super Admin'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={handleLock}
                    activeOpacity={0.85}
                    style={{
                      flex: 1,
                      backgroundColor: '#E11D48',
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                      🔒 {lang ? 'নিরাপদ লক করুন (DB-1)' : 'Lock Vault (DB-1)'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* SUPER ADMIN ONLY: 1st Excel Service Stripper Controls */}
                {isAdminActive && (
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      gap: 8,
                      marginTop: 2,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>🧹</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                          {lang ? '১ম দর্শক এক্সেলশীট ফিল্টার (Stealth Controls)' : '1st Excel Service Stripper Controls'}
                        </Text>
                        <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                          {lang
                            ? '১ম এক্সেল হতে যা-ই ফিল্টার করবেন, মাস্টার এক্সেলে ১০০% সব কিছু অক্ষত থাকবে।'
                            : 'Items stripped here are 100% preserved in Super Admin Excel.'}
                        </Text>
                      </View>
                    </View>

                    {/* Toggle 1: Strip Package and Service columns */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={async () => {
                        const next = await setAuditorExcelConfig({ omitServiceColumns: !excelConfig.omitServiceColumns });
                        setExcelConfig({ ...next });
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: excelConfig.omitServiceColumns ? '#EFF6FF' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: excelConfig.omitServiceColumns ? '#93C5FD' : '#CBD5E1',
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 6 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#1E293B' }}>
                          {lang ? '১. সার্ভিস ও প্যাকেজ কলাম পুরোপুরি বাদ দিন' : '1. Omit Package & Service columns'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15 }}>{excelConfig.omitServiceColumns ? '✅' : '⬜'}</Text>
                    </TouchableOpacity>

                    {/* Toggle 2: Exclude VIP bookings */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={async () => {
                        const next = await setAuditorExcelConfig({ excludeVipFromExcel1: !excelConfig.excludeVipFromExcel1 });
                        setExcelConfig({ ...next });
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: excelConfig.excludeVipFromExcel1 ? '#EFF6FF' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: excelConfig.excludeVipFromExcel1 ? '#93C5FD' : '#CBD5E1',
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 6 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#1E293B' }}>
                          {lang ? '২. ভিআইপি (VIP First Class) বুকিং বাদ দিন' : '2. Exclude VIP First Class bookings'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15 }}>{excelConfig.excludeVipFromExcel1 ? '✅' : '⬜'}</Text>
                    </TouchableOpacity>

                    {/* Toggle 3: Exclude Business bookings */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={async () => {
                        const next = await setAuditorExcelConfig({ excludeBusinessFromExcel1: !excelConfig.excludeBusinessFromExcel1 });
                        setExcelConfig({ ...next });
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: excelConfig.excludeBusinessFromExcel1 ? '#EFF6FF' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: excelConfig.excludeBusinessFromExcel1 ? '#93C5FD' : '#CBD5E1',
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 6 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#1E293B' }}>
                          {lang ? '৩. বিজনেস (Business Protocol) বুকিং বাদ দিন' : '3. Exclude Business Protocol bookings'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15 }}>{excelConfig.excludeBusinessFromExcel1 ? '✅' : '⬜'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* PIN Management Section */}
                <TouchableOpacity
                  onPress={() => {
                    setIsChangingPin(!isChangingPin);
                    setChangeRole(isAdminActive ? VAULT_ROLES.ADMIN : VAULT_ROLES.MANAGER);
                  }}
                  style={{ paddingVertical: 6, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 12, color: '#0369A1', fontWeight: '800' }}>
                    ⚙️ {isChangingPin
                      ? (lang ? 'বাতিল করুন' : 'Cancel PIN Change')
                      : (lang ? 'ভল্ট পিন পরিবর্তন করুন' : 'Change Vault PIN')}
                  </Text>
                </TouchableOpacity>

                {isChangingPin && (
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      gap: 8,
                    }}
                  >
                    {/* Role toggle for PIN change */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                      <TouchableOpacity
                        onPress={() => setChangeRole(VAULT_ROLES.MANAGER)}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          borderRadius: 6,
                          backgroundColor: changeRole === VAULT_ROLES.MANAGER ? '#0284C7' : '#E2E8F0',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: changeRole === VAULT_ROLES.MANAGER ? '#FFFFFF' : '#475569' }}>
                          💼 {lang ? 'ম্যানেজার পিন' : 'Manager PIN'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setChangeRole(VAULT_ROLES.ADMIN)}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          borderRadius: 6,
                          backgroundColor: changeRole === VAULT_ROLES.ADMIN ? '#7C3AED' : '#E2E8F0',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: changeRole === VAULT_ROLES.ADMIN ? '#FFFFFF' : '#475569' }}>
                          👑 {lang ? 'সুপার এডমিন পিন' : 'Super Admin PIN'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      placeholder={changeRole === VAULT_ROLES.ADMIN
                        ? (lang ? 'বর্তমান পিন (ডিফল্ট: 7860)' : 'Current PIN (Default: 7860)')
                        : (lang ? 'বর্তমান পিন (ডিফল্ট: 2440)' : 'Current PIN (Default: 2440)')}
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
              /* LOCKED STATE: TABBED DUAL VAULT UNLOCK */
              <View style={{ gap: 12 }}>
                {/* 2 Vault Choice Cards */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {/* Manager Vault Card */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedTargetRole(VAULT_ROLES.MANAGER);
                      setError('');
                    }}
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: selectedTargetRole === VAULT_ROLES.MANAGER ? '#0284C7' : '#E2E8F0',
                      backgroundColor: selectedTargetRole === VAULT_ROLES.MANAGER ? '#F0F9FF' : '#F8FAFC',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 22, marginBottom: 2 }}>💼</Text>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '900',
                        color: selectedTargetRole === VAULT_ROLES.MANAGER ? '#0369A1' : '#334155',
                        textAlign: 'center',
                      }}
                    >
                      {lang ? 'ম্যানেজার ভল্ট' : 'Manager Vault'}
                    </Text>
                    <View
                      style={{
                        backgroundColor: selectedTargetRole === VAULT_ROLES.MANAGER ? '#BAE6FD' : '#E2E8F0',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#0369A1' }}>
                        {lang ? 'বিগত ২ দিনের ডাটা' : 'Last 2 Days Data'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                      {lang ? 'পিন: 2440' : 'PIN: 2440'}
                    </Text>
                  </TouchableOpacity>

                  {/* Super Admin Master Vault Card */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedTargetRole(VAULT_ROLES.ADMIN);
                      setError('');
                    }}
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: selectedTargetRole === VAULT_ROLES.ADMIN ? '#7C3AED' : '#E2E8F0',
                      backgroundColor: selectedTargetRole === VAULT_ROLES.ADMIN ? '#FAF5FF' : '#F8FAFC',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 22, marginBottom: 2 }}>👑</Text>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '900',
                        color: selectedTargetRole === VAULT_ROLES.ADMIN ? '#6D28D9' : '#334155',
                        textAlign: 'center',
                      }}
                    >
                      {lang ? 'সুপার এডমিন ভল্ট' : 'Super Admin Vault'}
                    </Text>
                    <View
                      style={{
                        backgroundColor: selectedTargetRole === VAULT_ROLES.ADMIN ? '#DDD6FE' : '#E2E8F0',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#6D28D9' }}>
                        {lang ? '১০০% সকল রেকর্ড' : '100% All-Time'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                      {lang ? 'পিন: 7860' : 'PIN: 7860'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* PIN Input Instruction */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', textAlign: 'center' }}>
                  {selectedTargetRole === VAULT_ROLES.MANAGER
                    ? (lang
                        ? 'ম্যানেজার ভল্ট (বিগত ২ দিনের ডাটা) আনলক করতে পিন দিন:'
                        : 'Enter Manager PIN to view last 2 days data:')
                    : (lang
                        ? 'সুপার এডমিন মাস্টার ভল্ট (১০০% আজীবন ডাটা) আনলক করতে পিন দিন:'
                        : 'Enter Super Admin PIN to view 100% all-time data:')}
                </Text>

                <TextInput
                  placeholder={
                    selectedTargetRole === VAULT_ROLES.MANAGER
                      ? (lang ? 'ম্যানেজার পিন (যেমন: 2440)' : 'Enter Manager PIN (e.g. 2440)')
                      : (lang ? 'সুপার এডমিন পিন (যেমন: 7860)' : 'Enter Super Admin PIN (e.g. 7860)')
                  }
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
                    borderColor: error
                      ? '#EF4444'
                      : selectedTargetRole === VAULT_ROLES.ADMIN
                      ? '#7C3AED'
                      : '#0284C7',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 18,
                    fontWeight: '800',
                    letterSpacing: 4,
                    textAlign: 'center',
                  }}
                />

                {error ? (
                  <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                    {error}
                  </Text>
                ) : null}

                {/* Quick Unlock Button */}
                <TouchableOpacity
                  onPress={() => handleUnlock()}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: selectedTargetRole === VAULT_ROLES.ADMIN ? '#7C3AED' : '#0284C7',
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>
                    🔓 {selectedTargetRole === VAULT_ROLES.ADMIN
                      ? (lang ? 'সুপার এডমিন ভল্ট আনলক করুন' : 'Unlock Super Admin Vault')
                      : (lang ? 'ম্যানেজার ভল্ট আনলক করুন' : 'Unlock Manager Vault')}
                  </Text>
                </TouchableOpacity>

                {/* Helpful Guidance */}
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 10.5, color: '#64748B', lineHeight: 15, textAlign: 'center' }}>
                    💡 {lang
                      ? 'টিপস: যেকোনো ঘরে সরাসরি ২৪৪০ লিখলে ম্যানেজার ভল্ট এবং ৭৮৬০ লিখলে সুপার এডমিন ভল্ট আনলক হবে।'
                      : 'Tip: Entering 2440 unlocks Manager Vault (2 days) and 7860 unlocks Super Admin Vault (all-time).'}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
