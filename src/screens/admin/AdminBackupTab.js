import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  exportFullSystemBackup,
  exportBookingsToCsv,
  exportStaffRosterToCsv,
  exportPaymentsToCsv,
  validateAndInspectBackup,
  executeRestoreOperation,
  triggerFileDownload,
  BACKUP_STORAGE_KEYS,
} from '../../services/dataBackupService';
import { logSecurityEvent } from '../../services/security';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  seedInitialPlatformData,
  exportFullDatabaseBackup,
} from '../../services/firebaseSyncService';
import { FIREBASE_CONFIG, isFirebaseConfigured } from '../../services/firebase';
import DualVaultPinModal from '../../components/DualVaultPinModal';
import {
  isMasterVaultUnlocked,
  getShowcaseBookingIds,
  filterBookingsByVaultMode,
  exportDualVaultBookingsCsv,
  lockMasterVault,
  registerVaultTriggerClick,
} from '../../services/dualVaultService';

export default function AdminBackupTab({
  bookings = [],
  setBookings,
  allPlatformBookings = [],
  setAllPlatformBookings,
  staffRoster = [],
  setStaffRoster,
  managedAirports = [],
  setManagedAirports,
  pricingConfig = null,
  setPricingConfig,
  serviceCatalog = [],
  setServiceCatalog,
  notifications = [],
  setNotifications,
  customerPaymentHistory = [],
  setCustomerPaymentHistory,
  managerSession,
  lang = 0,
  s = {},
  resetAirports,
  resetPricingConfig,
  resetManagerServicesToDefault,
}) {
  const [activeSubTab, setActiveSubTab] = useState('export'); // 'export' | 'import' | 'defaults'
  const [jsonInputText, setJsonInputText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [inspectionResult, setInspectionResult] = useState(null);
  const [importMode, setImportMode] = useState('merge'); // 'merge' | 'replace'
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastBackupTime, setLastBackupTime] = useState(null);
  const [lastRestoreTime, setLastRestoreTime] = useState(null);

  // Dual-Vault Database State
  const [isMasterVaultActive, setIsMasterVaultActive] = useState(isMasterVaultUnlocked());
  const [showcaseBookingIds, setShowcaseBookingIds] = useState([]);
  const [showVaultPinModal, setShowVaultPinModal] = useState(false);

  const handleVaultAccessClick = () => {
    registerVaultTriggerClick({
      isUnlocked: isMasterVaultActive,
      onTrigger: () => setShowVaultPinModal(true),
      onNotice: (msg) => {
        showSuccess(msg);
      },
      lang,
    });
  };

  const fileInputRef = useRef(null);

  // Load last backup & restore timestamps & dual vault state
  useEffect(() => {
    getShowcaseBookingIds().then(ids => {
      setShowcaseBookingIds(ids || []);
    });
    setIsMasterVaultActive(isMasterVaultUnlocked());

    AsyncStorage.getItem(BACKUP_STORAGE_KEYS.LAST_BACKUP).then(val => {
      if (val) setLastBackupTime(new Date(val).toLocaleString());
    }).catch(() => {});

    AsyncStorage.getItem(BACKUP_STORAGE_KEYS.LAST_RESTORE).then(val => {
      if (val) setLastRestoreTime(new Date(val).toLocaleString());
    }).catch(() => {});
  }, []);

  const allMasterBookings = (allPlatformBookings && allPlatformBookings.length > 0) ? allPlatformBookings : bookings;
  const effectiveBookings = filterBookingsByVaultMode(allMasterBookings, isMasterVaultActive, showcaseBookingIds);
  const totalBookingsCount = effectiveBookings.length;
  const showcaseCount = filterBookingsByVaultMode(allMasterBookings, false, showcaseBookingIds).length;

  const showSuccess = (msg) => {
    setNotice(msg);
    setErrorMessage('');
    setTimeout(() => setNotice(''), 5000);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setNotice('');
    setTimeout(() => setErrorMessage(''), 6000);
  };

  // Full System Export
  const handleExportFullSystem = async () => {
    try {
      setIsProcessing(true);
      await new Promise(r => setTimeout(r, 80));

      const effectiveBookings = (allPlatformBookings && allPlatformBookings.length > 0)
        ? allPlatformBookings
        : bookings;

      const dataSources = {
        bookings: effectiveBookings,
        staffRoster,
        managedAirports,
        pricingConfig,
        serviceCatalog,
        notifications,
        payments: customerPaymentHistory,
      };

      const res = exportFullSystemBackup(dataSources, managerSession?.user?.email || 'admin@flightcare.app');
      setLastBackupTime(new Date().toLocaleString());

      logSecurityEvent({
        action: 'DATA_BACKUP_EXPORTED',
        actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
        details: `Exported full system backup containing ${effectiveBookings.length} bookings, ${staffRoster.length} staff, ${managedAirports.length} airports`,
        severity: 'INFO',
        status: 'SUCCESS',
      });

      showSuccess(lang ? `সম্পূর্ণ সিস্টেম ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে (${res.filename})` : `Full system backup downloaded successfully (${res.filename})`);
    } catch (err) {
      showError(err.message || 'Export failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy Full JSON to Clipboard
  const handleCopyJsonToClipboard = () => {
    try {
      const effectiveBookings = (allPlatformBookings && allPlatformBookings.length > 0)
        ? allPlatformBookings
        : bookings;

      const dataSources = {
        bookings: effectiveBookings,
        staffRoster,
        managedAirports,
        pricingConfig,
        serviceCatalog,
        notifications,
        payments: customerPaymentHistory,
        managerEmail: managerSession?.user?.email || 'admin@flightcare.app',
      };

      const payload = {
        app: 'FlightCare',
        exportedAt: new Date().toISOString(),
        exportedBy: managerSession?.user?.email || 'admin@flightcare.app',
        data: dataSources,
      };

      const str = JSON.stringify(payload, null, 2);
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(str);
        showSuccess(lang ? 'ব্যাকআপ JSON ক্লিপবোর্ডে কপি করা হয়েছে!' : 'Backup JSON copied to clipboard!');
      } else {
        Alert.alert('Backup JSON', 'JSON payload ready.');
      }
    } catch (e) {
      showError('Failed to copy JSON.');
    }
  };

  // Export Bookings CSV (Dual-Vault aware)
  const handleExportBookingsCsv = (forceMode = null) => {
    const mode = forceMode || (isMasterVaultActive ? 'master' : 'auditor');
    const targetList = mode === 'master'
      ? allMasterBookings
      : filterBookingsByVaultMode(allMasterBookings, false, showcaseBookingIds);

    exportDualVaultBookingsCsv(targetList, mode);
    showSuccess(
      lang
        ? (mode === 'master'
            ? `মাস্টার বুকিং এক্সেল ডাউনলোড হয়েছে (${targetList.length} টি আসল বুকিং)`
            : `পরিদর্শক বুকিং এক্সেল ডাউনলোড হয়েছে (${targetList.length} টি বুকিং)`)
        : `Exported ${targetList.length} bookings (${mode === 'master' ? 'Master Secret Database' : 'Auditor / Showcase Database'})`
    );
  };

  // Export Staff CSV
  const handleExportStaffCsv = () => {
    exportStaffRosterToCsv(staffRoster);
    showSuccess(lang ? `প্রোটোকল অফিসার তালিকা CSV ফাইল ডাউনলোড হয়েছে (${staffRoster.length} জন)` : `Exported ${staffRoster.length} staff officers to CSV`);
  };

  // Export Payments CSV
  const handleExportPaymentsCsv = () => {
    exportPaymentsToCsv(customerPaymentHistory);
    showSuccess(lang ? `পেমেন্ট ট্রানজেকশন তালিকা CSV ফাইল ডাউনলোড হয়েছে (${customerPaymentHistory.length} টি)` : `Exported ${customerPaymentHistory.length} payments to CSV`);
  };

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Cloud Seed & Synchronize
  const handleSeedFirebaseCloud = async () => {
    try {
      setIsCloudSyncing(true);
      const res = await seedInitialPlatformData();
      if (res.ok) {
        showSuccess(lang ? `ফায়ারবেস ক্লাউড সফলভাবে ইনিশিয়ালাইজ ও সিঙ্ক হয়েছে! (${res.message})` : `Firebase Cloud Synced! (${res.message})`);
      } else {
        showError(res.message || 'Firebase sync failed');
      }
    } catch (e) {
      showError(e.message || 'Cloud sync error');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Download Cloud JSON Backup
  const handleDownloadCloudBackup = async () => {
    try {
      setIsCloudSyncing(true);
      const backupData = await exportFullDatabaseBackup();
      const filename = `flightcare-cloud-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const jsonStr = JSON.stringify(backupData, null, 2);
      triggerFileDownload(jsonStr, filename, 'application/json');
      showSuccess(lang ? `ক্লাউড ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে (${filename})` : `Cloud backup downloaded (${filename})`);
    } catch (e) {
      showError(e.message || 'Cloud backup failed');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Handle HTML5 File Selection
  const handleWebFileSelect = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setJsonInputText(content);
      const inspection = validateAndInspectBackup(content);
      setInspectionResult(inspection);
      if (!inspection.isValid) {
        showError(inspection.error || 'Invalid backup file');
      } else {
        showSuccess(lang ? `ফাইল যাচাই সফল! ${inspection.summary.bookingsCount || 0} টি বুকিং, ${inspection.summary.staffCount || 0} জন স্টাফ চিহ্নিত হয়েছে।` : `Validation successful: ${inspection.summary.bookingsCount || 0} bookings, ${inspection.summary.staffCount || 0} staff found.`);
      }
    };
    reader.onerror = () => {
      showError('Failed to read file.');
    };
    reader.readAsText(file);
  };

  // Validate Pasted JSON Input
  const handleValidatePastedJson = () => {
    if (!jsonInputText.trim()) {
      showError(lang ? 'অনুগ্রহ করে ব্যাকআপ JSON পেস্ট করুন বা ফাইল সিলেক্ট করুন।' : 'Please paste backup JSON or select a file.');
      return;
    }
    const inspection = validateAndInspectBackup(jsonInputText);
    setInspectionResult(inspection);
    if (!inspection.isValid) {
      showError(inspection.error || 'Invalid JSON format');
    } else {
      showSuccess(lang ? 'ব্যাকআপ ফরম্যাট যাচাই সম্পন্ন হয়েছে! নিচে নিশ্চিত করুন।' : 'Backup structure verified! Confirm restore below.');
    }
  };

  // Execute Restore Operation
  const handleExecuteRestore = async () => {
    if (!inspectionResult || !inspectionResult.isValid) {
      showError(lang ? 'প্রথমে ব্যাকআপ ডাটা যাচাই করুন।' : 'Please validate backup data first.');
      return;
    }

    const confirmMsg = importMode === 'replace'
      ? (lang
          ? 'সতর্কতা: "সম্পূর্ণ প্রতিস্থাপন" মোডে বর্তমান ডাটার পরিবর্তে ব্যাকআপ ডাটা সেট হবে। আপনি কি নিশ্চিত?'
          : 'WARNING: "Full Overwrite" will replace current database with backup. Are you sure?')
      : (lang
          ? 'আপনি কি ব্যাকআপ ডাটা বর্তমান ডাটার সাথে মার্জ/সংযুক্ত করতে চান?'
          : 'Do you want to merge and restore this backup data?');

    const executeAction = async () => {
      try {
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 100));

        const currentData = {
          bookings: (allPlatformBookings && allPlatformBookings.length > 0) ? allPlatformBookings : bookings,
          staffRoster,
          managedAirports,
          pricingConfig,
          serviceCatalog,
          notifications,
          payments: customerPaymentHistory,
        };

        const restoreResult = await executeRestoreOperation({
          parsedData: inspectionResult.parsedData,
          mode: importMode,
          currentData,
        });

        // Apply state updates across app
        if (restoreResult.updatedBookings) {
          if (setAllPlatformBookings) setAllPlatformBookings(restoreResult.updatedBookings);
          if (setBookings) setBookings(restoreResult.updatedBookings);
        }
        if (restoreResult.updatedStaff && setStaffRoster) {
          setStaffRoster(restoreResult.updatedStaff);
        }
        if (restoreResult.updatedAirports && setManagedAirports) {
          setManagedAirports(restoreResult.updatedAirports);
        }
        if (restoreResult.updatedPricing && setPricingConfig) {
          setPricingConfig(restoreResult.updatedPricing);
        }
        if (restoreResult.updatedServices && setServiceCatalog) {
          setServiceCatalog(restoreResult.updatedServices);
        }
        if (restoreResult.updatedNotifications && setNotifications) {
          setNotifications(restoreResult.updatedNotifications);
        }
        if (restoreResult.updatedPayments && setCustomerPaymentHistory) {
          setCustomerPaymentHistory(restoreResult.updatedPayments);
        }

        const nowStr = new Date().toLocaleString();
        setLastRestoreTime(nowStr);

        logSecurityEvent({
          action: 'DATA_BACKUP_RESTORED',
          actor: { email: managerSession?.user?.email || 'admin@flightcare.app', role: 'manager' },
          details: `Restored ${importMode} backup with ${restoreResult.stats.bookingsRestored} bookings, ${restoreResult.stats.staffRestored} staff, ${restoreResult.stats.airportsRestored} airports`,
          severity: 'WARNING',
          status: 'SUCCESS',
        });

        // Reset inputs
        setJsonInputText('');
        setSelectedFileName('');
        setInspectionResult(null);

        showSuccess(
          lang
            ? `ডাটা সফলভাবে ইমপোর্ট ও রিস্টোর করা হয়েছে! (বুকিং: ${restoreResult.stats.bookingsRestored}, স্টাফ: ${restoreResult.stats.staffRestored}, বিমানবন্দর: ${restoreResult.stats.airportsRestored})`
            : `Data restored successfully! (${restoreResult.stats.bookingsRestored} bookings, ${restoreResult.stats.staffRestored} staff, ${restoreResult.stats.airportsRestored} airports)`
        );
      } catch (err) {
        showError(err.message || 'Restore execution failed.');
      } finally {
        setIsProcessing(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        await executeAction();
      }
    } else {
      Alert.alert(
        lang ? 'ডাটা রিস্টোর নিশ্চিতকরণ' : 'Confirm Data Restore',
        confirmMsg,
        [
          { text: lang ? 'বাতিল' : 'Cancel', style: 'cancel' },
          { text: lang ? 'রিস্টোর করুন' : 'Restore', style: 'destructive', onPress: executeAction },
        ]
      );
    }
  };

  return (
    <View style={[s.pagePanel, { paddingBottom: 30 }]}>
      {/* Notice & Error Banners */}
      {notice ? (
        <View style={{ backgroundColor: '#ECFDF5', padding: 14, borderRadius: 12, marginBottom: 14, borderWidth: 1.5, borderColor: '#A7F3D0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#065F46', fontSize: 13.5, fontWeight: '700', flex: 1 }}>✓ {notice}</Text>
          <TouchableOpacity onPress={() => setNotice('')}>
            <Text style={{ color: '#065F46', fontWeight: '800', fontSize: 16, paddingLeft: 8 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={{ backgroundColor: '#FEF2F2', padding: 14, borderRadius: 12, marginBottom: 14, borderWidth: 1.5, borderColor: '#FECACA', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#991B1B', fontSize: 13.5, fontWeight: '700', flex: 1 }}>⚠️ {errorMessage}</Text>
          <TouchableOpacity onPress={() => setErrorMessage('')}>
            <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 16, paddingLeft: 8 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Header & Sub-tab Bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 22 }}>💾</Text>
            <Text style={s.pageTitle}>{lang ? 'ডাটা ব্যাকআপ ও ইমপোর্ট/রিস্টোর' : 'Data Backup & Import / Restore'}</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#64748B', marginTop: -4 }}>
            {lang ? 'সম্পূর্ণ প্ল্যাটফর্ম ডাটা এক্সপোর্ট করুন এবং পরবর্তীতে যে কোনো সময় ফাইল থেকে রিস্টোর করুন' : 'Export full platform data and restore from backup file anytime'}
          </Text>
        </View>

        {/* Sub-tab pills */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
          {[
            ['export', lang ? 'এক্সপোর্ট (Export)' : 'Export Data', '📤'],
            ['import', lang ? 'ইমপোর্ট (Import)' : 'Import & Restore', '📥'],
            ['defaults', lang ? 'ডিফল্ট রিসেট' : 'Factory Reset', '🔄'],
            ['cloud', lang ? 'ফায়ারবেস ক্লাউড' : 'Firebase Cloud', '🔥'],
          ].map(([tabKey, tabLabel, icon]) => {
            const active = activeSubTab === tabKey;
            return (
              <TouchableOpacity
                key={tabKey}
                onPress={() => setActiveSubTab(tabKey)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  backgroundColor: active ? '#0284C7' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13 }}>{icon}</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#FFFFFF' : '#475569' }}>
                  {tabLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Current System Health & Database Stats Banner */}
      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            📊 {lang ? 'বর্তমান ডাটাবেজ পরিসংখ্যান' : 'Live Database Statistics'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {lastBackupTime && (
              <Text style={{ fontSize: 11.5, color: '#0369A1', fontWeight: '600' }}>
                🕒 {lang ? 'সর্বশেষ ব্যাকআপ:' : 'Last Backup:'} {lastBackupTime}
              </Text>
            )}
            {lastRestoreTime && (
              <Text style={{ fontSize: 11.5, color: '#D97706', fontWeight: '600' }}>
                🕒 {lang ? 'সর্বশেষ রিস্টোর:' : 'Last Restore:'} {lastRestoreTime}
              </Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: lang ? 'বুকিং' : 'Bookings', count: totalBookingsCount, icon: '🎫', color: '#0284C7', bg: '#F0F9FF' },
            { label: lang ? 'প্রোটোকল স্টাফ' : 'Staff Officers', count: staffRoster.length, icon: '🧑‍✈️', color: '#059669', bg: '#ECFDF5' },
            { label: lang ? 'বিমানবন্দর' : 'Airports', count: managedAirports.length, icon: '🛫', color: '#7C3AED', bg: '#F5F3FF' },
            { label: lang ? 'সার্ভিসসমূহ' : 'Services', count: serviceCatalog.length, icon: '🧭', color: '#D97706', bg: '#FFFBEB' },
            { label: lang ? 'পেমেন্ট রেকর্ড' : 'Payments', count: customerPaymentHistory.length, icon: '💳', color: '#0F766E', bg: '#F0FDFA' },
            { label: lang ? 'নোটিফিকেশন' : 'Notifications', count: notifications.length, icon: '🔔', color: '#E11D48', bg: '#FFF1F2' },
          ].map((item, idx) => (
            <View key={idx} style={{ flex: 1, minWidth: 105, padding: 10, borderRadius: 10, backgroundColor: item.bg, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
              <Text style={{ fontSize: 16 }}>{item.icon}</Text>
              <Text style={{ fontSize: 15, fontWeight: '900', color: item.color, marginTop: 2 }}>{item.count}</Text>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ======================================================== */}
      {/* SUB-TAB 1: EXPORT CENTER                                 */}
      {/* ======================================================== */}
      {activeSubTab === 'export' && (
        <View style={{ gap: 16 }}>
          {/* Dual-Vault Database Controller Bar */}
          <View
            style={{
              backgroundColor: isMasterVaultActive ? '#FFF1F2' : '#F0FDF4',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1.5,
              borderColor: isMasterVaultActive ? '#FECDD3' : '#BBF7D0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isMasterVaultActive ? '#FFE4E6' : '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: isMasterVaultActive ? '#FDA4AF' : '#86EFAC',
                }}
              >
                <Text style={{ fontSize: 18 }}>{isMasterVaultActive ? '🔐' : '🛡️'}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: isMasterVaultActive ? '#9F1239' : '#166534' }}>
                  {isMasterVaultActive
                    ? (lang ? 'ডাটাবেজ ২: মাস্টার সিক্রেট ভল্ট সক্রিয় (১০০% আসল ডাটা)' : 'Database 2: Master Secret Vault (100% Real Data)')
                    : (lang ? 'ডাটাবেজ ১: পরিদর্শক / পাবলিক মোড সক্রিয়' : 'Database 1: Auditor / Showcase Mode Active')}
                </Text>
                <Text style={{ fontSize: 11.5, color: isMasterVaultActive ? '#BE123C' : '#15803D' }}>
                  {isMasterVaultActive
                    ? (lang ? `মোট আসল বুকিং: ${allMasterBookings.length} টি • পরিদর্শক দেখবে: ${showcaseCount} টি` : `Total Master: ${allMasterBookings.length} • Showcase Visible: ${showcaseCount}`)
                    : (lang ? `দৃশ্যমান বুকিং: ${showcaseCount} টি • বাকি সকল গোপন ডাটা ১০০% সুরক্ষিত ও হাইড করা` : `Visible Bookings: ${showcaseCount} • All master data strictly hidden`)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isMasterVaultActive ? (
                <TouchableOpacity
                  onPress={() => {
                    lockMasterVault();
                    setIsMasterVaultActive(false);
                    showSuccess(lang ? 'পরিদর্শক মোডে লক করা হয়েছে' : 'Locked to Auditor Mode');
                  }}
                  style={{
                    backgroundColor: '#0284C7',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                    🔒 {lang ? 'পরিদর্শক মোডে লক করুন' : 'Lock to Auditor Mode'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleVaultAccessClick}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: 'transparent',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#94A3B8' }}>
                    db
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Main Full Backup Download Card */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 2, borderColor: '#0284C7', shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>💾</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'সম্পূর্ণ সিস্টেম ব্যাকআপ ফাইল (.json)' : 'Full System Backup (.json)'}
                </Text>
                <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                  {lang
                    ? 'বুকিং, প্রোটোকল অফিসার, বিমানবন্দর, প্যাকেজ মূল্য, সার্ভিস ও পেমেন্ট রেকর্ড সহ সব ডাটার পূর্ণ ব্যাকআপ'
                    : 'Complete snapshot: all bookings, officers, airports, pricing configs, services, and payments'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <TouchableOpacity
                disabled={isProcessing}
                onPress={handleExportFullSystem}
                style={{
                  flex: 1,
                  minWidth: 200,
                  backgroundColor: '#0284C7',
                  paddingVertical: 13,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={{ fontSize: 16, color: '#FFFFFF' }}>⬇</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                      {lang ? 'সম্পূর্ণ ব্যাকআপ ডাউনলোড করুন (.json)' : 'Download Full Backup (.json)'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCopyJsonToClipboard}
                style={{
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  backgroundColor: '#F8FAFC',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>📋</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                  {lang ? 'JSON কপি করুন' : 'Copy JSON'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Individual Entity Exports Grid */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
              📑 {lang ? 'নির্দিষ্ট টেবিল এক্সপোর্ট (CSV / স্প্রেডশিট)' : 'Export Individual Collections (CSV)'}
            </Text>
            <Text style={{ fontSize: 12.5, color: '#64748B', marginBottom: 14 }}>
              {lang ? 'এক্সেল বা গুগল শিটে বিশ্লেষণের জন্য আলাদা টেবিল এক্সপোর্ট করুন' : 'Export specific data tables for Excel, Google Sheets, or reporting'}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {/* Export Bookings CSV (Dual-Vault aware) */}
              {isMasterVaultActive ? (
                <>
                  <TouchableOpacity
                    onPress={() => handleExportBookingsCsv('auditor')}
                    style={{
                      flex: 1,
                      minWidth: 200,
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: '#F0F9FF',
                      borderWidth: 1.5,
                      borderColor: '#BAE6FD',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>👁️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0369A1' }}>
                        {lang ? '১. পরিদর্শক এক্সেল (Showcase CSV)' : '1. Auditor Excel (Showcase)'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#0284C7' }}>
                        {showcaseCount} {lang ? 'টি নির্বাচিত বুকিং' : 'curated bookings'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, color: '#0284C7', fontWeight: '900' }}>⬇</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleExportBookingsCsv('master')}
                    style={{
                      flex: 1,
                      minWidth: 200,
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: '#FFF1F2',
                      borderWidth: 1.5,
                      borderColor: '#FECDD3',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>🔐</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#BE123C' }}>
                        {lang ? '২. মাস্টার এক্সেল (All Master CSV)' : '2. Master Excel (All Data)'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#E11D48' }}>
                        {allMasterBookings.length} {lang ? 'টি আসল বুকিং (১০০%)' : 'all real bookings'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, color: '#BE123C', fontWeight: '900' }}>⬇</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={() => handleExportBookingsCsv('auditor')}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: '#F0F9FF',
                    borderWidth: 1.5,
                    borderColor: '#BAE6FD',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>🎫</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0369A1' }}>
                      {lang ? 'বুকিং তালিকা CSV' : 'Export Bookings (CSV)'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#0284C7' }}>
                      {showcaseCount} {lang ? 'টি বুকিং রেকর্ড' : 'booking records'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, color: '#0284C7', fontWeight: '900' }}>⬇</Text>
                </TouchableOpacity>
              )}

              {/* Export Staff CSV */}
              <TouchableOpacity
                onPress={handleExportStaffCsv}
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: '#ECFDF5',
                  borderWidth: 1.5,
                  borderColor: '#A7F3D0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 24 }}>🧑‍✈️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#065F46' }}>
                    {lang ? 'অফিসার রোস্টার CSV' : 'Export Officers (CSV)'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#059669' }}>
                    {staffRoster.length} {lang ? 'জন অফিসার তথ্য' : 'protocol officers'}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: '#059669', fontWeight: '900' }}>⬇</Text>
              </TouchableOpacity>

              {/* Export Payments CSV */}
              <TouchableOpacity
                onPress={handleExportPaymentsCsv}
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: '#F0FDFA',
                  borderWidth: 1.5,
                  borderColor: '#99F6E4',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 24 }}>💳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F766E' }}>
                    {lang ? 'পেমেন্ট হিস্ট্রি CSV' : 'Export Payments (CSV)'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#0D9488' }}>
                    {customerPaymentHistory.length} {lang ? 'টি লেনদেন রেকর্ড' : 'payment records'}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: '#0D9488', fontWeight: '900' }}>⬇</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: IMPORT & RESTORE CENTER                       */}
      {/* ======================================================== */}
      {activeSubTab === 'import' && (
        <View style={{ gap: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#CBD5E1' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>📥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  {lang ? 'ব্যাকআপ ফাইল থেকে ডাটা ইমপোর্ট করুন' : 'Import Data from Backup File'}
                </Text>
                <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                  {lang ? 'পূর্বের কোনো FlightCare ব্যাকআপ ফাইল (.json) সিলেক্ট করুন অথবা নিচে JSON টেক্সট পেস্ট করুন' : 'Select a previously exported .json backup file or paste JSON content below'}
                </Text>
              </View>
            </View>

            {/* Hidden HTML5 File Input for Web */}
            {Platform.OS === 'web' && (
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleWebFileSelect}
              />
            )}

            {/* File Upload Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web' && fileInputRef.current) {
                    fileInputRef.current.click();
                  } else {
                    Alert.alert('File Picker', 'Please paste the backup JSON into the box below.');
                  }
                }}
                style={{
                  backgroundColor: '#F1F5F9',
                  borderWidth: 1.5,
                  borderColor: '#0284C7',
                  borderStyle: 'dashed',
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 18 }}>📂</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0284C7' }}>
                  {selectedFileName ? selectedFileName : (lang ? 'ব্যাকআপ ফাইল নির্বাচন করুন (.json)' : 'Choose Backup File (.json)')}
                </Text>
              </TouchableOpacity>

              {selectedFileName ? (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedFileName('');
                    setJsonInputText('');
                    setInspectionResult(null);
                  }}
                  style={{ padding: 6 }}
                >
                  <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>✕ {lang ? 'ক্লিয়ার' : 'Clear'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Direct JSON Paste Area */}
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              {lang ? 'অথবা সরাসরি JSON কোড পেস্ট করুন:' : 'Or paste JSON content directly:'}
            </Text>
            <TextInput
              multiline
              numberOfLines={6}
              value={jsonInputText}
              onChangeText={(txt) => {
                setJsonInputText(txt);
                setInspectionResult(null);
              }}
              placeholder={lang ? '{"app": "FlightCare", "data": { ... }}' : '{"app": "FlightCare", "data": { ... }}'}
              placeholderTextColor="#94A3B8"
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1.5,
                borderColor: '#CBD5E1',
                borderRadius: 12,
                padding: 12,
                fontSize: 12,
                fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
                color: '#0F172A',
                height: 120,
                textAlignVertical: 'top',
              }}
            />

            {/* Validate Button */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={handleValidatePastedJson}
                style={{
                  backgroundColor: '#0F172A',
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>🔍</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  {lang ? 'ব্যাকআপ যাচাই করুন' : 'Validate & Inspect'}
                </Text>
              </TouchableOpacity>

              {jsonInputText ? (
                <TouchableOpacity
                  onPress={() => {
                    setJsonInputText('');
                    setSelectedFileName('');
                    setInspectionResult(null);
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#F1F5F9' }}
                >
                  <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>{lang ? 'মুছে ফেলুন' : 'Clear'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Inspection Preview Card */}
            {inspectionResult && inspectionResult.isValid && (
              <View style={{ marginTop: 16, backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#86EFAC' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Text style={{ fontSize: 18 }}>✓</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#166534' }}>
                    {lang ? 'বৈধ ব্যাকআপ ফাইল চিহ্নিত হয়েছে!' : 'Valid Backup Recognized!'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BBF7D0' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>
                      🎫 {lang ? 'বুকিং:' : 'Bookings:'} {inspectionResult.summary?.bookingsCount || 0}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BBF7D0' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>
                      🧑‍✈️ {lang ? 'স্টাফ:' : 'Staff:'} {inspectionResult.summary?.staffCount || 0}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BBF7D0' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>
                      🛫 {lang ? 'বিমানবন্দর:' : 'Airports:'} {inspectionResult.summary?.airportsCount || 0}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BBF7D0' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>
                      🧭 {lang ? 'সার্ভিস:' : 'Services:'} {inspectionResult.summary?.servicesCount || 0}
                    </Text>
                  </View>
                </View>

                {/* Import Mode Radio Selection */}
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                  {lang ? 'ইমপোর্ট পদ্ধতি নির্বাচন করুন:' : 'Select Restore Strategy:'}
                </Text>
                <View style={{ gap: 8, marginBottom: 14 }}>
                  <TouchableOpacity
                    onPress={() => setImportMode('merge')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: importMode === 'merge' ? '#DCFCE7' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: importMode === 'merge' ? '#16A34A' : '#CBD5E1',
                    }}
                  >
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: importMode === 'merge' ? '#16A34A' : '#94A3B8', alignItems: 'center', justifyContent: 'center' }}>
                      {importMode === 'merge' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#16A34A' }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                        {lang ? 'সংযুক্ত / মার্জ করুন (Merge - রিকমেন্ডেড)' : 'Merge & Append (Recommended)'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#475569' }}>
                        {lang ? 'বর্তমান ডাটা সংরক্ষিত থাকবে, নতুন আইটেম যুক্ত হবে এবং ম্যাচিং আইডি আপডেট হবে।' : 'Keeps existing records, updates matching IDs, and adds new records.'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setImportMode('replace')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: importMode === 'replace' ? '#FEE2E2' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: importMode === 'replace' ? '#DC2626' : '#CBD5E1',
                    }}
                  >
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: importMode === 'replace' ? '#DC2626' : '#94A3B8', alignItems: 'center', justifyContent: 'center' }}>
                      {importMode === 'replace' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#991B1B' }}>
                        {lang ? 'সম্পূর্ণ প্রতিস্থাপন (Full Overwrite / Replace)' : 'Full Overwrite / Replace'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#7F1D1D' }}>
                        {lang ? 'বর্তমান সব ডাটা মুছে ব্যাকআপ ফাইলের ডাটা সম্পূর্ণরূপে প্রতিস্থাপিত হবে।' : 'Completely replaces the database with the backup file data.'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Final Execute Restore Button */}
                <TouchableOpacity
                  disabled={isProcessing}
                  onPress={handleExecuteRestore}
                  style={{
                    backgroundColor: importMode === 'replace' ? '#DC2626' : '#16A34A',
                    paddingVertical: 13,
                    borderRadius: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 16, color: '#FFFFFF' }}>🚀</Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                        {lang ? 'ডাটা রিস্টোর নিশ্চিত করুন' : 'Confirm & Execute Restore'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: FACTORY DEFAULTS RESET                        */}
      {/* ======================================================== */}
      {activeSubTab === 'defaults' && (
        <View style={{ gap: 14 }}>
          <View style={{ backgroundColor: '#FFFBEB', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#FDE68A' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 24 }}>🔄</Text>
              <View>
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#92400E' }}>
                  {lang ? 'সিস্টেম ডিফল্ট ডাটা রিসেট' : 'Reset to System Factory Defaults'}
                </Text>
                <Text style={{ fontSize: 12.5, color: '#B45309' }}>
                  {lang ? 'কনফিগারেশন মিসম্যাচ হলে নির্দিষ্ট সেকশন সিস্টেমের মূল ডিফল্ট মানে ফিরিয়ে আনুন' : 'Restore standard system settings if any configuration needs reset'}
                </Text>
              </View>
            </View>

            <View style={{ gap: 10, marginTop: 12 }}>
              {/* Reset Airports */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>🛫 {lang ? 'বিমানবন্দর কনফিগারেশন রিসেট' : 'Reset Airports Configuration'}</Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B' }}>DAC, CGP, ZYL, CXB সহ মূল ৮টি বিমানবন্দর রিস্টোর করে</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (resetAirports) {
                      resetAirports();
                      showSuccess(lang ? 'বিমানবন্দর সেটিংস ডিফল্টে রিসেট করা হয়েছে!' : 'Airports reset to factory defaults.');
                    }
                  }}
                  style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#B45309' }}>{lang ? 'রিসেট' : 'Reset'}</Text>
                </TouchableOpacity>
              </View>

              {/* Reset Pricing */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>৳ {lang ? 'মূল্য নির্ধারণ রিসেট' : 'Reset Pricing Configuration'}</Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B' }}>স্ট্যান্ডার্ড, বিজনেস ও ভিআইপি প্যাকেজের মূল রেট রিস্টোর করে</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (resetPricingConfig) {
                      resetPricingConfig();
                      showSuccess(lang ? 'মূল্য নির্ধারণ ডিফল্টে রিসেট করা হয়েছে!' : 'Pricing reset to factory defaults.');
                    }
                  }}
                  style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#B45309' }}>{lang ? 'রিসেট' : 'Reset'}</Text>
                </TouchableOpacity>
              </View>

              {/* Reset Services */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>🧭 {lang ? 'সার্ভিস ক্যাটালগ রিসেট' : 'Reset Service Catalog'}</Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B' }}>আগমণ ও প্রস্থান প্রোটোকলের স্ট্যান্ডার্ড সার্ভিস রিস্টোর করে</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (resetManagerServicesToDefault) {
                      resetManagerServicesToDefault();
                      showSuccess(lang ? 'সার্ভিস ক্যাটালগ ডিফল্টে রিসেট করা হয়েছে!' : 'Services reset to factory defaults.');
                    }
                  }}
                  style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#B45309' }}>{lang ? 'রিসেট' : 'Reset'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
      {/* ======================================================== */}
      {/* SUB-TAB 4: FIREBASE CLOUD REAL-TIME DATABASE             */}
      {/* ======================================================== */}
      {activeSubTab === 'cloud' && (
        <View style={{ gap: 16 }}>
          <View style={{ backgroundColor: '#F0FDF4', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#86EFAC' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 26 }}>🔥</Text>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#166534' }}>
                    {lang ? 'গুগল ফায়ারবেস ক্লাউড কানেকশন (লাইভ)' : 'Google Firebase Cloud Connection (Live)'}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#15803D' }}>
                    Project ID: {FIREBASE_CONFIG.projectId} • Region: default • 2-Way Realtime Sync Active
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#4ADE80' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' }} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>
                  {isFirebaseConfigured() ? 'LIVE CONNECTED' : 'CONFIGURED'}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20, marginBottom: 16 }}>
              {lang
                ? 'ওয়েবসাইট এবং মোবাইল অ্যাপের সকল বুকিং, ইউজার প্রোফাইল, বিমানবন্দর এবং প্রোটোকল অফিসার ডাটা স্বয়ংক্রিয়ভাবে ক্লাউড ফায়ারস্টোর ডাটাবেজের সাথে সিঙ্ক হয়। আপনি চাইলে নিচে থেকে সম্পূর্ণ ডাটা সিঙ্ক ও ইনিশিয়ালাইজ করতে পারেন।'
                : 'All reservations, user profiles, airport statuses, and protocol officers are synced in real-time with Google Cloud Firestore. You can seed initial platform datasets or export cloud snapshots below.'}
            </Text>

            {/* Live Collection Tiles */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {[
                { title: lang ? 'বুকিংস' : 'Bookings', count: totalBookingsCount, col: 'bookings', icon: '🎫' },
                { title: lang ? 'বিমানবন্দর' : 'Airports', count: managedAirports?.length || 8, col: 'managed_airports', icon: '🛫' },
                { title: lang ? 'প্রোটোকল স্টাফ' : 'Staff Roster', count: staffRoster?.length || 8, col: 'staff_roster', icon: '🧑‍✈️' },
                { title: lang ? 'সার্ভিসসমূহ' : 'Services', count: serviceCatalog?.length || 11, col: 'airport_services', icon: '🧭' },
              ].map((col, idx) => (
                <View key={idx} style={{ flex: 1, minWidth: 130, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 18 }}>{col.icon}</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#166534' }}>{col.count}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{col.title}</Text>
                  <Text style={{ fontSize: 10, color: '#64748B' }}>/{col.col}</Text>
                </View>
              ))}
            </View>

            {/* Cloud Actions */}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <TouchableOpacity
                disabled={isCloudSyncing}
                onPress={handleSeedFirebaseCloud}
                style={{
                  flex: 1,
                  minWidth: 220,
                  backgroundColor: '#16A34A',
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isCloudSyncing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={{ fontSize: 16, color: '#FFFFFF' }}>🚀</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                      {lang ? 'ক্লাউড সিঙ্ক ও ইনিশিয়ালাইজ (Seed / Sync)' : 'Seed & Sync to Cloud'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isCloudSyncing}
                onPress={handleDownloadCloudBackup}
                style={{
                  flex: 1,
                  minWidth: 220,
                  backgroundColor: '#0284C7',
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 16, color: '#FFFFFF' }}>☁️</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  {lang ? 'ক্লাউড ব্যাকআপ ডাউনলোড (Export Snapshot)' : 'Export Cloud Snapshot'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Dual Vault PIN Controller Modal */}
      <DualVaultPinModal
        visible={showVaultPinModal}
        onClose={() => setShowVaultPinModal(false)}
        isUnlocked={isMasterVaultActive}
        onVaultStateChanged={(unlocked) => {
          setIsMasterVaultActive(unlocked);
          getShowcaseBookingIds().then(ids => setShowcaseBookingIds(ids || []));
        }}
        lang={lang}
      />
    </View>
  );
}

