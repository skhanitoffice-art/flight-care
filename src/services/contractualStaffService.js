// src/services/contractualStaffService.js
// Flight Care Enterprise - Contractual Employees Daily Payment & Advance Ledger

import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFirestoreDoc, getFirestoreCollection, deleteFirestoreDoc } from './firebase';

export const CONTRACTUAL_STAFF_STORAGE_KEY = '@flightcare_contractual_employees_v1';

export const DEFAULT_DAILY_RATE = 1000; // ৳1,000 BDT per day

/**
 * Initial seed database of contractual employees
 */
export const DEFAULT_CONTRACTUAL_EMPLOYEES = [
  {
    id: 'CE-101',
    name: 'মো: রফিকুল ইসলাম',
    nameEn: 'Md. Rafiqul Islam',
    phone: '+8801711223344',
    nid: '19882691234567890',
    airport: 'DAC',
    station: 'হযরত শাহজালাল বিমানবন্দর (টার্মিনাল ১)',
    role: 'টার্মিনাল হেল্পার ও লাগেজ সাপোর্ট',
    dailyRate: 1000,
    contractStartDate: '2026-10-01',
    status: 'active',
    paidTillDate: '2026-10-25', // 12 days advance from Oct 13
    totalAdvancePaid: 25000,
    notes: 'নিয়মিত ও দায়িত্বশীল কর্মী। টার্মিনাল ১ আগমনী জোনে দায়িত্ব পালন করেন।',
    paymentHistory: [
      {
        id: 'PAY-CE-1001',
        date: '2026-10-01',
        amount: 15000,
        days: 15,
        period: '01 Oct 2026 - 15 Oct 2026',
        method: 'bKash',
        trxId: 'BK9X245190',
        collectedBy: 'Sohel Tanvir (Manager)',
        note: 'চুক্তি শুরুর প্রাথমিক ১৫ দিনের অগ্রিম পেমেন্ট',
      },
      {
        id: 'PAY-CE-1002',
        date: '2026-10-11',
        amount: 10000,
        days: 10,
        period: '16 Oct 2026 - 25 Oct 2026',
        method: 'Cash',
        trxId: 'CASH-REC-8841',
        collectedBy: 'Sohel Tanvir (Manager)',
        note: 'পরবর্তী ১০ দিনের অগ্রিম পেমেন্ট',
      },
    ],
  },
  {
    id: 'CE-102',
    name: 'আব্দুল করিম',
    nameEn: 'Abdul Karim',
    phone: '+8801819334455',
    nid: '19902699876543210',
    airport: 'DAC',
    station: 'হযরত শাহজালাল বিমানবন্দর (টার্মিনাল ২)',
    role: 'লাগেজ হ্যান্ডলার ও ট্রলি এসাইনমেন্ট',
    dailyRate: 1000,
    contractStartDate: '2026-10-05',
    status: 'active',
    paidTillDate: '2026-10-13', // Paid till today!
    totalAdvancePaid: 9000,
    notes: 'টার্মিনাল ২ ডিপারচার জোনে কাজ করেন।',
    paymentHistory: [
      {
        id: 'PAY-CE-1003',
        date: '2026-10-05',
        amount: 9000,
        days: 9,
        period: '05 Oct 2026 - 13 Oct 2026',
        method: 'Cash',
        trxId: 'CASH-REC-8842',
        collectedBy: 'Sohel Tanvir (Manager)',
        note: '৯ দিনের দৈনিক পেমেন্ট পরিশোধ।',
      },
    ],
  },
  {
    id: 'CE-103',
    name: 'জাহিদুল হাসান',
    nameEn: 'Zahidul Hassan',
    phone: '+8801912445566',
    nid: '19922695544332211',
    airport: 'DAC',
    station: 'ভিআইপি পার্কিং ও কার শাটল',
    role: 'ভিআইপি শাটল ড্রাইভার (কন্ট্রাক্ট)',
    dailyRate: 1000,
    contractStartDate: '2026-09-20',
    status: 'active',
    paidTillDate: '2026-10-11', // 2 days overdue
    totalAdvancePaid: 22000,
    notes: 'গত ২ দিনের পেমেন্ট বকেয়া রয়েছে (৳২,০০০)।',
    paymentHistory: [
      {
        id: 'PAY-CE-1004',
        date: '2026-09-20',
        amount: 22000,
        days: 22,
        period: '20 Sep 2026 - 11 Oct 2026',
        method: 'Bank',
        trxId: 'IBBL-TRX-5519',
        collectedBy: 'Sohel Tanvir (Manager)',
        note: 'প্রাথমিক ২২ দিনের পেমেন্ট।',
      },
    ],
  },
  {
    id: 'CE-104',
    name: 'তারেক মাহমুদ',
    nameEn: 'Tarek Mahmud',
    phone: '+8801615556677',
    nid: '19952691122334455',
    airport: 'DAC',
    station: 'টার্মিনাল ১ ক্যানোপি এরিয়া',
    role: 'যাত্রী দিকনির্দেশনা ও হুইলচেয়ার সাপোর্ট',
    dailyRate: 1000,
    contractStartDate: '2026-10-10',
    status: 'active',
    paidTillDate: '2026-11-10', // 1 month advance!
    totalAdvancePaid: 32000,
    notes: '১ মাসের সম্পূর্ণ অগ্রিম পেমেন্ট জমা দিয়েছেন।',
    paymentHistory: [
      {
        id: 'PAY-CE-1005',
        date: '2026-10-10',
        amount: 32000,
        days: 32,
        period: '10 Oct 2026 - 10 Nov 2026',
        method: 'bKash',
        trxId: 'BK9X998811',
        collectedBy: 'Sohel Tanvir (Manager)',
        note: '১ মাস ও অতিরিক্ত ২ দিনের অগ্রিম পেমেন্ট জমা।',
      },
    ],
  },
];

/**
 * Format a Date object to YYYY-MM-DD
 */
export const formatDateYMD = (date) => {
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Add N days to a YYYY-MM-DD date string
 */
export const addDaysToYMD = (ymdStr, daysToAdd) => {
  const base = ymdStr ? new Date(ymdStr) : new Date();
  const res = new Date(base.getTime() + Number(daysToAdd) * 24 * 60 * 60 * 1000);
  return formatDateYMD(res);
};

/**
 * Calculate dynamic balance status for an employee based on today's date
 */
export const calculateEmployeeFinancialStatus = (employee) => {
  if (!employee) return { status: 'unknown', statusLabelBn: 'অজানা', statusLabelEn: 'Unknown', advanceDays: 0, overdueDays: 0, dueAmount: 0 };

  const todayStr = formatDateYMD(new Date());
  const today = new Date(todayStr + 'T00:00:00');
  const paidTillStr = employee.paidTillDate || employee.contractStartDate || todayStr;
  const paidTill = new Date(paidTillStr + 'T00:00:00');

  const diffMs = paidTill.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const rate = Number(employee.dailyRate) || DEFAULT_DAILY_RATE;

  if (diffDays > 0) {
    return {
      status: 'advance',
      statusColor: '#16A34A',
      statusBg: '#DCFCE7',
      statusBorder: '#BBF7D0',
      statusLabelBn: `অগ্রিম পরিশোধিত (+${diffDays} দিন)`,
      statusLabelEn: `Advance Paid (+${diffDays} days)`,
      advanceDays: diffDays,
      overdueDays: 0,
      dueAmount: 0,
      paidTillDate: paidTillStr,
    };
  } else if (diffDays === 0) {
    return {
      status: 'due_today',
      statusColor: '#D97706',
      statusBg: '#FEF3C7',
      statusBorder: '#FDE68A',
      statusLabelBn: 'আজকের পেমেন্ট বাকি (৳১,০০০)',
      statusLabelEn: 'Due Today (৳1,000)',
      advanceDays: 0,
      overdueDays: 0,
      dueAmount: rate,
      paidTillDate: paidTillStr,
    };
  } else {
    const overdueDays = Math.abs(diffDays);
    const dueAmount = overdueDays * rate;
    return {
      status: 'overdue',
      statusColor: '#DC2626',
      statusBg: '#FEE2E2',
      statusBorder: '#FECACA',
      statusLabelBn: `বকেয়া (${overdueDays} দিন - ৳${dueAmount.toLocaleString()})`,
      statusLabelEn: `Overdue (${overdueDays} days - ৳${dueAmount.toLocaleString()})`,
      advanceDays: 0,
      overdueDays,
      dueAmount,
      paidTillDate: paidTillStr,
    };
  }
};

/**
 * Retrieve all contractual employees
 */
export async function getContractualEmployees() {
  try {
    const raw = await AsyncStorage.getItem(CONTRACTUAL_STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Contractual Staff] Error reading AsyncStorage:', err);
  }

  // Try fetching from Cloud Firestore
  try {
    const cloud = await getFirestoreCollection('contractual_employees');
    if (cloud.ok && Array.isArray(cloud.items) && cloud.items.length > 0) {
      await AsyncStorage.setItem(CONTRACTUAL_STAFF_STORAGE_KEY, JSON.stringify(cloud.items));
      return cloud.items;
    }
  } catch {}

  // Seed default items
  try {
    await AsyncStorage.setItem(CONTRACTUAL_STAFF_STORAGE_KEY, JSON.stringify(DEFAULT_CONTRACTUAL_EMPLOYEES));
    // Asynchronously seed cloud
    DEFAULT_CONTRACTUAL_EMPLOYEES.forEach(emp => {
      saveFirestoreDoc('contractual_employees', emp.id, emp).catch(() => {});
    });
  } catch {}

  return DEFAULT_CONTRACTUAL_EMPLOYEES;
}

/**
 * Save all contractual employees to storage and cloud
 */
export async function saveContractualEmployees(list) {
  try {
    await AsyncStorage.setItem(CONTRACTUAL_STAFF_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[Contractual Staff] Error saving to AsyncStorage:', err);
  }
  return true;
}

/**
 * Add a new contractual employee
 */
export async function addContractualEmployee(employeeData) {
  const currentList = await getContractualEmployees();
  const nextNum = currentList.length + 101;
  const newId = `CE-${Date.now().toString().slice(-4) || nextNum}`;

  const todayStr = formatDateYMD(new Date());
  const dailyRate = Number(employeeData.dailyRate) || DEFAULT_DAILY_RATE;
  const advanceDays = Number(employeeData.initialAdvanceDays) || 0;
  const initialAmount = advanceDays * dailyRate;

  let paidTillDate = employeeData.contractStartDate || todayStr;
  const paymentHistory = [];

  if (advanceDays > 0) {
    paidTillDate = addDaysToYMD(paidTillDate, advanceDays);
    paymentHistory.push({
      id: `PAY-CE-${Date.now()}`,
      date: todayStr,
      amount: initialAmount,
      days: advanceDays,
      period: `${todayStr} - ${paidTillDate}`,
      method: employeeData.initialPaymentMethod || 'Cash',
      trxId: employeeData.initialTrxId || `INIT-${Math.floor(1000 + Math.random() * 9000)}`,
      collectedBy: employeeData.collectedBy || 'Administrator',
      note: 'চুক্তি স্বাক্ষরের সময় প্রাথমিক অগ্রিম পেমেন্ট',
    });
  }

  const newEmployee = {
    id: newId,
    name: employeeData.name.trim(),
    nameEn: employeeData.nameEn ? employeeData.nameEn.trim() : employeeData.name.trim(),
    phone: employeeData.phone.trim(),
    nid: employeeData.nid ? employeeData.nid.trim() : '',
    airport: employeeData.airport || 'DAC',
    station: employeeData.station || 'হযরত শাহজালাল বিমানবন্দর',
    role: employeeData.role || 'টার্মিনাল সাপোর্ট ও অ্যাসিস্ট্যান্ট',
    dailyRate,
    contractStartDate: employeeData.contractStartDate || todayStr,
    status: 'active',
    paidTillDate,
    totalAdvancePaid: initialAmount,
    notes: employeeData.notes ? employeeData.notes.trim() : '',
    paymentHistory,
    createdAt: new Date().toISOString(),
  };

  const updatedList = [newEmployee, ...currentList];
  await saveContractualEmployees(updatedList);

  // Sync to Cloud Firestore
  try {
    await saveFirestoreDoc('contractual_employees', newId, newEmployee);
  } catch {}

  return newEmployee;
}

/**
 * Record a new advance / daily payment for an employee
 */
export async function recordContractualPayment(employeeId, {
  days = 1,
  amount = 1000,
  method = 'Cash',
  trxId = '',
  collectedBy = 'Administrator',
  note = '',
}) {
  const currentList = await getContractualEmployees();
  const empIndex = currentList.findIndex(e => e.id === employeeId);
  if (empIndex === -1) return { ok: false, error: 'Employee not found' };

  const emp = currentList[empIndex];
  const numDays = Number(days) || 1;
  const numAmount = Number(amount) || (numDays * (emp.dailyRate || DEFAULT_DAILY_RATE));
  const todayStr = formatDateYMD(new Date());

  // Determine starting date for new payment
  // If current paidTillDate is in the future, extend from that date
  // If current paidTillDate is in the past, extend from paidTillDate or today
  let baseDate = emp.paidTillDate ? emp.paidTillDate : todayStr;
  if (new Date(baseDate) < new Date(todayStr)) {
    // Overdue case: start adding days from their overdue paidTillDate
    baseDate = emp.paidTillDate;
  }

  const newPaidTillDate = addDaysToYMD(baseDate, numDays);
  const paymentRecord = {
    id: `PAY-CE-${Date.now()}`,
    date: todayStr,
    amount: numAmount,
    days: numDays,
    period: `${baseDate} - ${newPaidTillDate}`,
    method,
    trxId: trxId.trim() || `REC-${Math.floor(100000 + Math.random() * 900000)}`,
    collectedBy,
    note: note.trim() || `${numDays} দিনের দৈনিক পেমেন্ট (৳${numAmount.toLocaleString()})`,
    timestamp: new Date().toISOString(),
  };

  const updatedEmp = {
    ...emp,
    paidTillDate: newPaidTillDate,
    totalAdvancePaid: (Number(emp.totalAdvancePaid) || 0) + numAmount,
    paymentHistory: [paymentRecord, ...(emp.paymentHistory || [])],
    updatedAt: new Date().toISOString(),
  };

  currentList[empIndex] = updatedEmp;
  await saveContractualEmployees(currentList);

  // Sync to Cloud Firestore
  try {
    await saveFirestoreDoc('contractual_employees', updatedEmp.id, updatedEmp);
  } catch {}

  return { ok: true, employee: updatedEmp, payment: paymentRecord };
}

/**
 * Update employee details
 */
export async function updateContractualEmployee(employeeId, updates) {
  const currentList = await getContractualEmployees();
  const empIndex = currentList.findIndex(e => e.id === employeeId);
  if (empIndex === -1) return { ok: false, error: 'Employee not found' };

  const updatedEmp = {
    ...currentList[empIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  currentList[empIndex] = updatedEmp;
  await saveContractualEmployees(currentList);

  try {
    await saveFirestoreDoc('contractual_employees', updatedEmp.id, updatedEmp);
  } catch {}

  return { ok: true, employee: updatedEmp };
}

/**
 * Delete a contractual employee
 */
export async function deleteContractualEmployee(employeeId) {
  const currentList = await getContractualEmployees();
  const filtered = currentList.filter(e => e.id !== employeeId);
  await saveContractualEmployees(filtered);

  try {
    await deleteFirestoreDoc('contractual_employees', employeeId);
  } catch {}

  return true;
}

