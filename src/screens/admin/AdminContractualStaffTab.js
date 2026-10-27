// src/screens/admin/AdminContractualStaffTab.js
// Flight Care Enterprise - Contractual Employees Daily Payment & Advance Management

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import {
  getContractualEmployees,
  addContractualEmployee,
  recordContractualPayment,
  updateContractualEmployee,
  deleteContractualEmployee,
  calculateEmployeeFinancialStatus,
  formatDateYMD,
  addDaysToYMD,
  DEFAULT_DAILY_RATE,
} from '../../services/contractualStaffService';

export default function AdminContractualStaffTab({
  managerSession,
  lang = 0,
  s = {},
}) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'advance' | 'due_today' | 'overdue' | 'inactive'
  const [stationFilter, setStationFilter] = useState('all');
  const [notice, setNotice] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Selected employee for payment / history / edit
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Payment Form State
  const [payDaysPreset, setPayDaysPreset] = useState(7); // 1 | 7 | 15 | 30 | 60 | 'custom'
  const [payCustomDays, setPayCustomDays] = useState('7');
  const [payMethod, setPayMethod] = useState('Cash'); // 'Cash' | 'bKash' | 'Bank' | 'Nagad'
  const [payTrxId, setPayTrxId] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payCollector, setPayCollector] = useState(managerSession?.user?.name || 'Administrator');

  // Add Employee Form State
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addNid, setAddNid] = useState('');
  const [addAirport, setAddAirport] = useState('DAC');
  const [addStation, setAddStation] = useState('হযরত শাহজালাল বিমানবন্দর');
  const [addRole, setAddRole] = useState('টার্মিনাল হেল্পার ও লাগেজ সাপোর্ট');
  const [addDailyRate, setAddDailyRate] = useState('1000');
  const [addContractStartDate, setAddContractStartDate] = useState(formatDateYMD(new Date()));
  const [addInitialDays, setAddInitialDays] = useState('0');
  const [addInitialMethod, setAddInitialMethod] = useState('Cash');
  const [addNotes, setAddNotes] = useState('');

  // Edit Employee Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNid, setEditNid] = useState('');
  const [editAirport, setEditAirport] = useState('DAC');
  const [editStation, setEditStation] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDailyRate, setEditDailyRate] = useState('1000');
  const [editStatus, setEditStatus] = useState('active');
  const [editNotes, setEditNotes] = useState('');

  // Load employees
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await getContractualEmployees();
      setEmployees(data || []);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  // Enrich employees with computed balance & status
  const enrichedEmployees = useMemo(() => {
    return employees.map((emp) => {
      const fin = calculateEmployeeFinancialStatus(emp);
      return {
        ...emp,
        financial: fin,
      };
    });
  }, [employees]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = enrichedEmployees.length;
    const advanceList = enrichedEmployees.filter(e => e.financial.status === 'advance');
    const dueTodayList = enrichedEmployees.filter(e => e.financial.status === 'due_today');
    const overdueList = enrichedEmployees.filter(e => e.financial.status === 'overdue');

    const totalOverdueAmount = overdueList.reduce((acc, e) => acc + (e.financial.dueAmount || 0), 0);
    const totalAdvanceDays = advanceList.reduce((acc, e) => acc + (e.financial.advanceDays || 0), 0);

    // Calculate today's total collected payments
    const todayStr = formatDateYMD(new Date());
    let todayCollected = 0;
    enrichedEmployees.forEach(e => {
      (e.paymentHistory || []).forEach(p => {
        if (p.date === todayStr) {
          todayCollected += Number(p.amount) || 0;
        }
      });
    });

    return {
      total,
      advanceCount: advanceList.length,
      dueTodayCount: dueTodayList.length,
      overdueCount: overdueList.length,
      totalOverdueAmount,
      totalAdvanceDays,
      todayCollected,
    };
  }, [enrichedEmployees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return enrichedEmployees.filter((emp) => {
      // 1. Status Filter
      if (activeFilter === 'advance' && emp.financial.status !== 'advance') return false;
      if (activeFilter === 'due_today' && emp.financial.status !== 'due_today') return false;
      if (activeFilter === 'overdue' && emp.financial.status !== 'overdue') return false;
      if (activeFilter === 'inactive' && emp.status !== 'inactive' && emp.status !== 'suspended') return false;

      // 2. Station Filter
      if (stationFilter !== 'all' && emp.airport !== stationFilter) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (emp.name || '').toLowerCase().includes(q) || (emp.nameEn || '').toLowerCase().includes(q);
        const matchPhone = (emp.phone || '').includes(q);
        const matchId = (emp.id || '').toLowerCase().includes(q);
        const matchStation = (emp.station || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchId && !matchStation) return false;
      }

      return true;
    });
  }, [enrichedEmployees, activeFilter, stationFilter, searchQuery]);

  // Handle Open Payment Modal
  const handleOpenPayment = (emp) => {
    setSelectedEmp(emp);
    setPayDaysPreset(7);
    setPayCustomDays('7');
    setPayMethod('Cash');
    setPayTrxId('');
    setPayNote('');
    setPayCollector(managerSession?.user?.name || 'Administrator');
    setShowPaymentModal(true);
  };

  // Handle Submit Payment
  const handleSubmitPayment = async () => {
    if (!selectedEmp) return;
    const days = Number(payCustomDays) || 1;
    if (days <= 0) {
      Alert.alert('ভুল তথ্য', 'অনুগ্রহ করে কমপক্ষে ১ দিন বা তদূর্ধ্ব ইনপুট দিন।');
      return;
    }
    const rate = Number(selectedEmp.dailyRate) || DEFAULT_DAILY_RATE;
    const amount = days * rate;

    const res = await recordContractualPayment(selectedEmp.id, {
      days,
      amount,
      method: payMethod,
      trxId: payTrxId,
      collectedBy: payCollector,
      note: payNote,
    });

    if (res.ok) {
      await loadEmployees();
      setShowPaymentModal(false);
      showToast(
        lang
          ? `✓ ${selectedEmp.name}-এর ${days} দিনের পেমেন্ট (৳${amount.toLocaleString()}) সফলভাবে জমা হয়েছে! নতুন মেয়াদ: ${res.employee.paidTillDate} পর্যন্ত।`
          : `✓ Payment of ৳${amount.toLocaleString()} (${days} days) recorded for ${selectedEmp.name}! Extended till ${res.employee.paidTillDate}.`
      );
    }
  };

  // Handle Open Add Employee Modal
  const handleOpenAdd = () => {
    setAddName('');
    setAddPhone('');
    setAddNid('');
    setAddAirport('DAC');
    setAddStation('হযরত শাহজালাল বিমানবন্দর');
    setAddRole('টার্মিনাল হেল্পার ও লাগেজ সাপোর্ট');
    setAddDailyRate('1000');
    setAddContractStartDate(formatDateYMD(new Date()));
    setAddInitialDays('0');
    setAddInitialMethod('Cash');
    setAddNotes('');
    setShowAddModal(true);
  };

  // Handle Submit Add Employee
  const handleSubmitAdd = async () => {
    if (!addName.trim()) {
      Alert.alert('ভুল তথ্য', 'এমপ্লয়ির নাম পূরণ করা আবশ্যক।');
      return;
    }
    if (!addPhone.trim()) {
      Alert.alert('ভুল তথ্য', 'মোবাইল নম্বর পূরণ করা আবশ্যক।');
      return;
    }

    const newEmp = await addContractualEmployee({
      name: addName,
      phone: addPhone,
      nid: addNid,
      airport: addAirport,
      station: addStation,
      role: addRole,
      dailyRate: Number(addDailyRate) || DEFAULT_DAILY_RATE,
      contractStartDate: addContractStartDate,
      initialAdvanceDays: Number(addInitialDays) || 0,
      initialPaymentMethod: addInitialMethod,
      notes: addNotes,
      collectedBy: managerSession?.user?.name || 'Administrator',
    });

    await loadEmployees();
    setShowAddModal(false);
    showToast(
      lang
        ? `✓ নতুন কন্ট্রাকচুয়াল এমপ্লয়ি ${newEmp.name} (#${newEmp.id}) সফলভাবে তালিকায় যুক্ত হয়েছে!`
        : `✓ New contractual employee ${newEmp.name} (#${newEmp.id}) added successfully!`
    );
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (emp) => {
    setSelectedEmp(emp);
    setEditName(emp.name || '');
    setEditPhone(emp.phone || '');
    setEditNid(emp.nid || '');
    setEditAirport(emp.airport || 'DAC');
    setEditStation(emp.station || '');
    setEditRole(emp.role || '');
    setEditDailyRate(String(emp.dailyRate || DEFAULT_DAILY_RATE));
    setEditStatus(emp.status || 'active');
    setEditNotes(emp.notes || '');
    setShowEditModal(true);
  };

  // Handle Submit Edit
  const handleSubmitEdit = async () => {
    if (!selectedEmp) return;
    const res = await updateContractualEmployee(selectedEmp.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      nid: editNid.trim(),
      airport: editAirport,
      station: editStation.trim(),
      role: editRole.trim(),
      dailyRate: Number(editDailyRate) || DEFAULT_DAILY_RATE,
      status: editStatus,
      notes: editNotes.trim(),
    });

    if (res.ok) {
      await loadEmployees();
      setShowEditModal(false);
      showToast(lang ? '✓ এমপ্লয়ির তথ্য সফলভাবে আপডেট হয়েছে!' : '✓ Employee information updated successfully!');
    }
  };

  // Handle Delete Employee
  const handleDelete = (emp) => {
    const confirmMsg = lang
      ? `আপনি কি নিশ্চিত যে "${emp.name}" (#${emp.id})-কে কন্ট্রাকচুয়াল তালিকা থেকে মুছে ফেলতে চান?`
      : `Are you sure you want to remove ${emp.name} (#${emp.id}) from the contractual staff roster?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        deleteContractualEmployee(emp.id).then(() => {
          loadEmployees();
          showToast(lang ? 'এমপ্লয়ি মুছে ফেলা হয়েছে।' : 'Employee removed.');
        });
      }
    } else {
      Alert.alert(lang ? 'নিশ্চিতকরণ' : 'Confirm', confirmMsg, [
        { text: lang ? 'বাতিল' : 'Cancel', style: 'cancel' },
        {
          text: lang ? 'মুছুন' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteContractualEmployee(emp.id);
            await loadEmployees();
            showToast(lang ? 'এমপ্লয়ি মুছে ফেলা হয়েছে।' : 'Employee removed.');
          },
        },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Top Banner Notice */}
      {notice ? (
        <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 14 }}>
          <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700' }}>{notice}</Text>
        </View>
      ) : null}

      {/* Header Section */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 24 }}>🤝</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>
              {lang ? 'কন্ট্রাকচুয়াল এমপ্লয়ি ও দৈনিক পেমেন্ট লেজার' : 'Contractual Staff Daily Payment Ledger'}
            </Text>
          </View>
          <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
            {lang
              ? 'চুক্তিভিত্তিক কর্মী ব্যবস্থাপনা • দৈনিক ১,০০০ টাকা ফি • অগ্রিম ও বকেয়া স্বয়ংক্রিয় হিসাব'
              : 'Contractual Staff Management • ৳1,000/day daily fee • Advance & Overdue automated ledger'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={loadEmployees}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: '#F1F5F9',
              borderWidth: 1,
              borderColor: '#CBD5E1',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 13 }}>🔄</Text>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569' }}>
              {lang ? 'রিফ্রেশ' : 'Refresh'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenAdd}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: '#0284C7',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              shadowColor: '#0284C7',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '900' }}>＋</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
              {lang ? 'নতুন এমপ্লয়ি যোগ করুন' : 'Add New Employee'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4 Summary KPI Cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        {/* Metric 1: Total Employees */}
        <View style={{ flex: 1, minWidth: 160, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '700' }}>{lang ? 'মোট কন্ট্রাকচুয়াল কর্মী' : 'Total Employees'}</Text>
            <Text style={{ fontSize: 20 }}>👥</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 6 }}>
            {metrics.total} <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}>{lang ? 'জন' : 'staff'}</Text>
          </Text>
          <Text style={{ fontSize: 11, color: '#0284C7', marginTop: 4, fontWeight: '600' }}>
            {lang ? 'দৈনিক রেট: ৳১,০০০ / দিন' : 'Fixed Rate: ৳1,000 / day'}
          </Text>
        </View>

        {/* Metric 2: Today's Collected Payments */}
        <View style={{ flex: 1, minWidth: 160, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#BAE6FD', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#0369A1', fontWeight: '700' }}>{lang ? 'আজ সংগৃহীত পেমেন্ট' : 'Collected Today'}</Text>
            <Text style={{ fontSize: 20 }}>💵</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#0284C7', marginTop: 6 }}>
            ৳{metrics.todayCollected.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '600' }}>
            {lang ? `আজকের আদায়কৃত অর্থ` : `Revenue collected today`}
          </Text>
        </View>

        {/* Metric 3: Advance Paid Staff */}
        <View style={{ flex: 1, minWidth: 160, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#BBF7D0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>{lang ? 'অগ্রিম পরিশোধিত' : 'Advance Paid'}</Text>
            <Text style={{ fontSize: 20 }}>🟢</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#16A34A', marginTop: 6 }}>
            {metrics.advanceCount} <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}>{lang ? 'জন' : 'staff'}</Text>
          </Text>
          <Text style={{ fontSize: 11, color: '#16A34A', marginTop: 4, fontWeight: '600' }}>
            {lang ? `মোট +${metrics.totalAdvanceDays} দিন অগ্রিম জমা` : `Total +${metrics.totalAdvanceDays} days prepaid`}
          </Text>
        </View>

        {/* Metric 4: Overdue Balance */}
        <View style={{ flex: 1, minWidth: 160, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: metrics.overdueCount > 0 ? '#FECACA' : '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: metrics.overdueCount > 0 ? '#DC2626' : '#64748B', fontWeight: '700' }}>{lang ? 'বকেয়া হিসাব' : 'Overdue Balance'}</Text>
            <Text style={{ fontSize: 20 }}>🔴</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: metrics.overdueCount > 0 ? '#DC2626' : '#0F172A', marginTop: 6 }}>
            ৳{metrics.totalOverdueAmount.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 11, color: metrics.overdueCount > 0 ? '#DC2626' : '#64748B', marginTop: 4, fontWeight: '600' }}>
            {lang ? `${metrics.overdueCount} জন কর্মীর পেমেন্ট বকেয়া` : `${metrics.overdueCount} staff with overdue fees`}
          </Text>
        </View>
      </View>

      {/* Filter Tabs & Search Controls */}
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
            {[
              ['all', lang ? `সকল কর্মী (${metrics.total})` : `All (${metrics.total})`],
              ['advance', lang ? `🟢 অগ্রিম পরিশোধিত (${metrics.advanceCount})` : `🟢 Advance (${metrics.advanceCount})`],
              ['due_today', lang ? `🟡 আজ বাকি (${metrics.dueTodayCount})` : `🟡 Due Today (${metrics.dueTodayCount})`],
              ['overdue', lang ? `🔴 বকেয়া (${metrics.overdueCount})` : `🔴 Overdue (${metrics.overdueCount})`],
            ].map(([tabKey, tabLabel]) => {
              const isSel = activeFilter === tabKey;
              return (
                <TouchableOpacity
                  key={tabKey}
                  onPress={() => setActiveFilter(tabKey)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: isSel ? '#0284C7' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: isSel ? '#0284C7' : '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: isSel ? '800' : '600', color: isSel ? '#FFFFFF' : '#475569' }}>
                    {tabLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Search Input */}
          <View style={{ minWidth: 260, flex: 1, maxWidth: 360 }}>
            <TextInput
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                fontSize: 12.5,
              }}
              placeholder={lang ? '🔍 নাম, ফোন, আইডি বা বিমানবন্দর খুঁজুন...' : '🔍 Search by name, phone, ID, airport...'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      {/* Contractual Employees List */}
      <View style={{ gap: 12 }}>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#64748B' }}>{lang ? 'লোড হচ্ছে...' : 'Loading...'}</Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📭</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
              {lang ? 'কোনো কন্ট্রাকচুয়াল এমপ্লয়ি পাওয়া যায়নি' : 'No contractual employees found'}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              {lang ? 'নতুন নাম যোগ করতে উপরের বাটনে ক্লিক করুন।' : 'Click the button above to add a new employee.'}
            </Text>
          </View>
        ) : (
          filteredEmployees.map((emp) => {
            const fin = emp.financial;
            const historyCount = (emp.paymentHistory || []).length;
            const lastPayment = historyCount > 0 ? emp.paymentHistory[0] : null;

            return (
              <View
                key={emp.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: fin.statusBorder || '#E2E8F0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                {/* Top Row: Basic Info & Status Badge */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#BAE6FD' }}>
                      <Text style={{ fontSize: 20 }}>👷</Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                          {emp.name}
                        </Text>
                        <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>
                            {emp.id}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        {emp.role} • 📍 {emp.station || emp.airport} • 📞 {emp.phone}
                      </Text>
                    </View>
                  </View>

                  {/* Financial Status Badge */}
                  <View style={{ backgroundColor: fin.statusBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: fin.statusBorder, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fin.statusColor }} />
                    <Text style={{ fontSize: 12, fontWeight: '900', color: fin.statusColor }}>
                      {fin.statusLabelBn}
                    </Text>
                  </View>
                </View>

                {/* Middle Row: Ledger & Financial Cards */}
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginVertical: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <View style={{ flex: 1, minWidth: 120 }}>
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{lang ? 'দৈনিক রেট' : 'Daily Fee'}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                      ৳{(emp.dailyRate || DEFAULT_DAILY_RATE).toLocaleString()} / {lang ? 'দিন' : 'day'}
                    </Text>
                  </View>

                  <View style={{ flex: 1.3, minWidth: 150 }}>
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{lang ? 'পরিশোধিত মেয়াদ' : 'Paid Till Date'}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: fin.statusColor, marginTop: 2 }}>
                      📅 {emp.paidTillDate || 'N/A'} {lang ? 'পর্যন্ত' : ''}
                    </Text>
                  </View>

                  <View style={{ flex: 1.2, minWidth: 130 }}>
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{lang ? 'সর্বমোট পরিশোধ' : 'Total Paid'}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0284C7', marginTop: 2 }}>
                      ৳{(emp.totalAdvancePaid || 0).toLocaleString()} ({historyCount} {lang ? 'বার' : 'txns'})
                    </Text>
                  </View>

                  {lastPayment && (
                    <View style={{ flex: 1.5, minWidth: 160 }}>
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{lang ? 'সর্বশেষ পেমেন্ট' : 'Last Payment'}</Text>
                      <Text style={{ fontSize: 12, color: '#334155', fontWeight: '700', marginTop: 2 }}>
                        ৳{lastPayment.amount.toLocaleString()} ({lastPayment.method}) • {lastPayment.date}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Notes if any */}
                {emp.notes ? (
                  <Text style={{ fontSize: 11.5, color: '#64748B', fontStyle: 'italic', marginBottom: 10 }}>
                    📝 {emp.notes}
                  </Text>
                ) : null}

                {/* Bottom Row: Actions */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedEmp(emp);
                      setShowHistoryModal(true);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: '#F1F5F9',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>📜</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                      {lang ? 'পেমেন্ট হিস্ট্রি ও স্টেটমেন্ট' : 'Statement'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenEdit(emp)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>✏️</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                      {lang ? 'এডিট' : 'Edit'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(emp)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: '#FEE2E2',
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>🗑️</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenPayment(emp)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: '#16A34A',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      shadowColor: '#16A34A',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#FFFFFF' }}>💳</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                      {lang ? '+ পেমেন্ট গ্রহণ / এডভান্স' : '+ Collect Payment'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ============================================================== */}
      {/* MODAL 1: ADVANCE / DAILY PAYMENT COLLECTION MODAL             */}
      {/* ============================================================== */}
      <Modal
        visible={showPaymentModal && !!selectedEmp}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 14 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '92%', overflow: 'hidden', borderWidth: 1.5, borderColor: '#CBD5E1' }}>
            {selectedEmp && (
              <>
                {/* Header */}
                <View style={{ backgroundColor: '#0F2A4A', paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18 }}>💳</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFFFFF' }}>
                        {lang ? 'দৈনিক / এডভান্স পেমেন্ট গ্রহণ' : 'Collect Daily / Advance Payment'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#93C5FD' }}>
                        {selectedEmp.name} (#{selectedEmp.id}) • দৈনিক ফি: ৳{(selectedEmp.dailyRate || DEFAULT_DAILY_RATE).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={{ padding: 6 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
                  {/* Preset Day Buttons (1 Day, 7 Days, 15 Days, 30 Days / 1 Month, 60 Days / 2 Months) */}
                  <View>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E293B', marginBottom: 8 }}>
                      {lang ? 'পেমেন্টের মেয়াদ নির্বাচন করুন (কুইক অপশন):' : 'Select Payment Duration (Quick Presets):'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {[
                        [1, lang ? '১ দিন (৳১,০০০)' : '1 Day (৳1k)'],
                        [7, lang ? '৭ দিন / ১ সপ্তাহ (৳৭,০০০)' : '7 Days / 1 Wk (৳7k)'],
                        [15, lang ? '১৫ দিন / অর্ধমাস (৳১৫,০০০)' : '15 Days (৳15k)'],
                        [30, lang ? '৩০ দিন / ১ মাস (৳৩০,০০০)' : '30 Days / 1 Mo (৳30k)'],
                        [60, lang ? '৬০ দিন / ২ মাস (৳৬০,০০০)' : '60 Days / 2 Mo (৳60k)'],
                      ].map(([presetDays, presetLabel]) => {
                        const isSel = Number(payCustomDays) === presetDays;
                        return (
                          <TouchableOpacity
                            key={presetDays}
                            onPress={() => setPayCustomDays(String(presetDays))}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 10,
                              backgroundColor: isSel ? '#0284C7' : '#F8FAFC',
                              borderWidth: 1.5,
                              borderColor: isSel ? '#0284C7' : '#CBD5E1',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '700', color: isSel ? '#FFFFFF' : '#334155' }}>
                              {presetLabel}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Custom Days Input */}
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                        {lang ? 'দিনের সংখ্যা (কাস্টম):' : 'Number of Days (Custom):'}
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: '#F8FAFC',
                          borderWidth: 1.5,
                          borderColor: '#CBD5E1',
                          borderRadius: 10,
                          padding: 10,
                          fontSize: 14,
                          fontWeight: '800',
                          color: '#0F172A',
                        }}
                        keyboardType="number-pad"
                        value={payCustomDays}
                        onChangeText={setPayCustomDays}
                        placeholder="যেমন: ৭ বা ৩০"
                      />
                    </View>

                    <View style={{ flex: 1.2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                        {lang ? 'মোট প্রদেয় অর্থ (টাকা):' : 'Total Amount (BDT):'}
                      </Text>
                      <View style={{ backgroundColor: '#F0F9FF', borderWidth: 1.5, borderColor: '#BAE6FD', borderRadius: 10, padding: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0284C7' }}>
                          ৳{((Number(payCustomDays) || 0) * (selectedEmp.dailyRate || DEFAULT_DAILY_RATE)).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Future Projection Box */}
                  {(() => {
                    const days = Number(payCustomDays) || 0;
                    const baseDate = selectedEmp.paidTillDate || formatDateYMD(new Date());
                    const projectedTillDate = addDaysToYMD(baseDate, days);
                    return (
                      <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0', gap: 3 }}>
                        <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '800' }}>
                          📈 {lang ? 'পেমেন্ট জমার পর নতুন হিসাব:' : 'Projected Balance After Payment:'}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#047857' }}>
                          • {lang ? 'বর্তমান পরিশোধিত মেয়াদ:' : 'Current Paid Till:'} {selectedEmp.paidTillDate || 'N/A'}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#047857', fontWeight: '700' }}>
                          • {lang ? 'নতুন পরিশোধিত মেয়াদ হবে:' : 'New Extended Paid Till:'} {projectedTillDate} ({lang ? `+${days} দিন বৃদ্ধি` : `+${days} days added`})
                        </Text>
                      </View>
                    );
                  })()}

                  {/* Payment Channel / Method */}
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                      {lang ? 'পেমেন্ট মাধ্যম:' : 'Payment Method:'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {['Cash', 'bKash', 'Bank', 'Nagad'].map((m) => (
                        <TouchableOpacity
                          key={m}
                          onPress={() => setPayMethod(m)}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: payMethod === m ? '#0F172A' : '#F1F5F9',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '800', color: payMethod === m ? '#FFFFFF' : '#475569' }}>
                            {m === 'Cash' ? (lang ? '💵 নগদ' : 'Cash') : m === 'bKash' ? '📱 বিকাশ' : m === 'Bank' ? '🏦 ব্যাংক' : '📲 নগদ'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Transaction ID / Memo Reference */}
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                      {lang ? 'ট্রানজেকশন আইডি / ভাউচার রেফারেন্স (ঐচ্ছিক):' : 'Transaction ID / Receipt Memo:'}
                    </Text>
                    <TextInput
                      style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 12.5 }}
                      placeholder="যেমন: BK9X2233 বা CASH-101"
                      value={payTrxId}
                      onChangeText={setPayTrxId}
                    />
                  </View>

                  {/* Notes / Remarks */}
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                      {lang ? 'মন্তব্য বা কালেকশন নোট:' : 'Collection Note / Remarks:'}
                    </Text>
                    <TextInput
                      style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 12.5 }}
                      placeholder="যেমন: অক্টোবর মাসের অগ্রিম পেমেন্ট"
                      value={payNote}
                      onChangeText={setPayNote}
                    />
                  </View>

                  {/* Buttons */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => setShowPaymentModal(false)}
                      style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>{lang ? 'বাতিল' : 'Cancel'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSubmitPayment}
                      style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#16A34A' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                        ✓ {lang ? 'পেমেন্ট নিশ্চিত করুন' : 'Confirm Payment'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: ADD NEW CONTRACTUAL EMPLOYEE                         */}
      {/* ============================================================== */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 14 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: '92%', overflow: 'hidden', borderWidth: 1.5, borderColor: '#CBD5E1' }}>
            <View style={{ backgroundColor: '#0284C7', paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>👷</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF' }}>
                  {lang ? 'নতুন কন্ট্রাকচুয়াল এমপ্লয়ি যুক্ত করুন' : 'Add New Contractual Employee'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={{ padding: 6 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'এমপ্লয়ির পূর্ণ নাম *' : 'Full Name *'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }}
                    placeholder="যেমন: মো: রফিকুল ইসলাম"
                    value={addName}
                    onChangeText={setAddName}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'মোবাইল নম্বর *' : 'Phone Number *'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }}
                    placeholder="+88017XXXXXXXX"
                    keyboardType="phone-pad"
                    value={addPhone}
                    onChangeText={setAddPhone}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'জাতীয় পরিচয়পত্র / পাসপোর্ট নম্বর' : 'NID / Passport'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }}
                    placeholder="NID নম্বর"
                    value={addNid}
                    onChangeText={setAddNid}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'দৈনিক রেট (টাকা)' : 'Daily Rate (BDT)'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#F0F9FF', borderWidth: 1.5, borderColor: '#BAE6FD', borderRadius: 8, padding: 9, fontSize: 13, fontWeight: '800', color: '#0369A1' }}
                    keyboardType="number-pad"
                    value={addDailyRate}
                    onChangeText={setAddDailyRate}
                    placeholder="1000"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'বিমানবন্দর ও স্টেশন' : 'Airport / Station'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }}
                    placeholder="হযরত শাহজালাল বিমানবন্দর"
                    value={addStation}
                    onChangeText={setAddStation}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                    {lang ? 'দায়িত্ব ও কাজের ধরন' : 'Role / Duties'}
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }}
                    placeholder="টার্মিনাল হেল্পার / লাগেজ সাপোর্ট"
                    value={addRole}
                    onChangeText={setAddRole}
                  />
                </View>
              </View>

              {/* Initial Advance Days */}
              <View style={{ backgroundColor: '#F0FDF4', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534', marginBottom: 4 }}>
                  {lang ? 'চুক্তির সাথে প্রাথমিক অগ্রিম পেমেন্ট (ঐচ্ছিক):' : 'Initial Advance Payment (Optional):'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#15803D' }}>{lang ? 'অগ্রিম দিন সংখ্যা:' : 'Advance Days:'}</Text>
                    <TextInput
                      style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 8, padding: 8, fontSize: 13, fontWeight: '800' }}
                      placeholder="0"
                      keyboardType="number-pad"
                      value={addInitialDays}
                      onChangeText={setAddInitialDays}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#15803D' }}>{lang ? 'মোট টাকা:' : 'Amount:'}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#16A34A', marginTop: 4 }}>
                      ৳{((Number(addInitialDays) || 0) * (Number(addDailyRate) || 1000)).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Notes */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                  {lang ? 'বিশেষ মন্তব্য / রেফারেন্স:' : 'Notes / Remarks:'}
                </Text>
                <TextInput
                  style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }}
                  placeholder="রেফারেন্স বা বিশেষ নির্দেশনা"
                  value={addNotes}
                  onChangeText={setAddNotes}
                />
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>{lang ? 'বাতিল' : 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmitAdd}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#0284C7' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                    ✓ {lang ? 'তালিকায় যোগ করুন' : 'Add Employee'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: EDIT CONTRACTUAL EMPLOYEE                            */}
      {/* ============================================================== */}
      <Modal
        visible={showEditModal && !!selectedEmp}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 14 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: '92%', overflow: 'hidden', borderWidth: 1.5, borderColor: '#CBD5E1' }}>
            {selectedEmp && (
              <>
                <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF' }}>
                    {lang ? 'এমপ্লয়ি তথ্য এডিট করুন' : 'Edit Employee Details'} (#{selectedEmp.id})
                  </Text>
                  <TouchableOpacity onPress={() => setShowEditModal(false)} style={{ padding: 6 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>{lang ? 'নাম' : 'Name'}</Text>
                      <TextInput style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }} value={editName} onChangeText={setEditName} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>{lang ? 'মোবাইল' : 'Phone'}</Text>
                      <TextInput style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }} value={editPhone} onChangeText={setEditPhone} />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>{lang ? 'দৈনিক রেট (টাকা)' : 'Daily Rate (BDT)'}</Text>
                      <TextInput style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }} value={editDailyRate} onChangeText={setEditDailyRate} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>{lang ? 'স্ট্যাটাস' : 'Status'}</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {['active', 'suspended', 'inactive'].map((st) => (
                          <TouchableOpacity
                            key={st}
                            onPress={() => setEditStatus(st)}
                            style={{
                              flex: 1,
                              paddingVertical: 7,
                              borderRadius: 6,
                              backgroundColor: editStatus === st ? '#0284C7' : '#F1F5F9',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: editStatus === st ? '#FFFFFF' : '#475569' }}>
                              {st === 'active' ? (lang ? 'সক্রিয়' : 'Active') : st === 'suspended' ? (lang ? 'স্থগিত' : 'Suspended') : (lang ? 'নিষ্ক্রিয়' : 'Inactive')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>{lang ? 'দায়িত্ব ও পদবি' : 'Role / Duties'}</Text>
                    <TextInput style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }} value={editRole} onChangeText={setEditRole} />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>{lang ? 'স্টেশন / বিমানবন্দর' : 'Station / Location'}</Text>
                    <TextInput style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }} value={editStation} onChangeText={setEditStation} />
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>{lang ? 'মন্তব্য' : 'Notes'}</Text>
                    <TextInput style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 9, fontSize: 13 }} value={editNotes} onChangeText={setEditNotes} />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => setShowEditModal(false)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>{lang ? 'বাতিল' : 'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSubmitEdit} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#0284C7' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>✓ {lang ? 'সেভ করুন' : 'Save Changes'}</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: PAYMENT STATEMENT & OFFICIAL MONEY RECEIPT MODAL     */}
      {/* ============================================================== */}
      <Modal
        visible={showHistoryModal && !!selectedEmp}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 14 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 660, maxHeight: '92%', overflow: 'hidden', borderWidth: 1.5, borderColor: '#CBD5E1' }}>
            {selectedEmp && (
              <>
                <View style={{ backgroundColor: '#0F2A4A', paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF' }}>
                      📜 {lang ? 'পেমেন্ট লেজার ও রসিদ স্টেটমেন্ট' : 'Payment Ledger & Statement'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#93C5FD' }}>
                      {selectedEmp.name} (#{selectedEmp.id}) • {selectedEmp.phone}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={{ padding: 6 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
                  {/* Summary Bar */}
                  <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>{lang ? 'সর্বমোট আদায়কৃত ফি:' : 'Total Lifetime Paid:'}</Text>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#0284C7', marginTop: 2 }}>
                        ৳{(selectedEmp.totalAdvancePaid || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>{lang ? 'মেয়াদ পর্যন্ত পরিশোধিত:' : 'Current Valid Till:'}</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#16A34A', marginTop: 2 }}>
                        📅 {selectedEmp.paidTillDate || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* Transactions Table */}
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 6 }}>
                    {lang ? 'সকল লেনদেনের তালিকা:' : 'Transaction History:'}
                  </Text>

                  {(!selectedEmp.paymentHistory || selectedEmp.paymentHistory.length === 0) ? (
                    <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', padding: 20 }}>
                      {lang ? 'কোনো পেমেন্ট রেকর্ড নেই।' : 'No payment records found.'}
                    </Text>
                  ) : (
                    selectedEmp.paymentHistory.map((item, idx) => (
                      <View
                        key={item.id || idx}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 12,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          gap: 6,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                                +{item.days} {lang ? 'দিন' : 'days'}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>
                              ৳{(item.amount || 0).toLocaleString()}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#64748B' }}>
                            📅 {item.date}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 12, color: '#334155' }}>
                          • {lang ? 'কভার করা সময়কাল:' : 'Period:'} <Text style={{ fontWeight: '700' }}>{item.period || 'N/A'}</Text>
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748B' }}>
                          • {lang ? 'পদ্ধতি:' : 'Method:'} {item.method} • TrxID: {item.trxId || 'N/A'} • {lang ? 'সংগ্রাহক:' : 'Collector:'} {item.collectedBy}
                        </Text>
                        {item.note ? (
                          <Text style={{ fontSize: 11.5, color: '#475569', fontStyle: 'italic', backgroundColor: '#F8FAFC', padding: 6, borderRadius: 6 }}>
                            "{item.note}"
                          </Text>
                        ) : null}
                      </View>
                    ))
                  )}

                  {/* Close */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                    <TouchableOpacity
                      onPress={() => setShowHistoryModal(false)}
                      style={{ paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8, backgroundColor: '#0F172A' }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>{lang ? 'বন্ধ করুন' : 'Close'}</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

