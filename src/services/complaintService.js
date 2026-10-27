/**
 * Flight Care - Passenger Complaint & Grievance Redressal Service
 * যাত্রী অভিযোগ গ্রহণ ও দ্রুত সমাধান ব্যবস্থাপনা
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OPERATIONS_STORAGE_KEYS,
  getIncidentLogs,
  saveIncidentLogs,
} from './airportOperationsService';
import { firestoreDb } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { dispatchStaffNotification, STAFF_NOTIFICATION_TYPES } from './communication';

export const COMPLAINTS_STORAGE_KEY = '@flightcare_passenger_complaints';

// 1. Complaint Categories
export const COMPLAINT_CATEGORIES = [
  {
    key: 'officer_conduct',
    nameBn: 'প্রোটোকল অফিসারের আচরণ বা অদক্ষতা',
    nameEn: 'Protocol Officer Conduct / Demeanor',
    icon: '👔',
    badge: 'Officer Conduct',
  },
  {
    key: 'delay_punctuality',
    nameBn: 'সময়নিষ্ঠতা ও অযাচিত বিলম্ব',
    nameEn: 'Punctuality & Airport Delay',
    icon: '⏱️',
    badge: 'Delay Issue',
  },
  {
    key: 'baggage_handling',
    nameBn: 'লাগেজ পরিচালনা, ক্ষতিসাধন বা নিখোঁজ',
    nameEn: 'Baggage Handling & Lost/Damaged Luggage',
    icon: '🧳',
    badge: 'Baggage Issue',
  },
  {
    key: 'immigration_customs',
    nameBn: 'ইমিগ্রেশন ও কাস্টমস সহায়তা সমস্যা',
    nameEn: 'Immigration & Customs Assistance',
    icon: '🛂',
    badge: 'Immigration/Customs',
  },
  {
    key: 'payment_billing',
    nameBn: 'পেমেন্ট, বিলিং ও রিফান্ড সংক্রান্ত',
    nameEn: 'Payment, Billing & Refund Dispute',
    icon: '💳',
    badge: 'Billing/Refund',
  },
  {
    key: 'lounge_service',
    nameBn: 'ভিআইপি লাউঞ্জ সুবিধা ও আতিথেয়তা',
    nameEn: 'VIP Lounge Facility & Hospitality',
    icon: '🛋️',
    badge: 'Lounge Service',
  },
  {
    key: 'other',
    nameBn: 'অন্যান্য বিশেষ অভিযোগ / পরামর্শ',
    nameEn: 'Other Operational Grievance / Feedback',
    icon: '📝',
    badge: 'Other',
  },
];

// 2. Urgency Levels
export const URGENCY_LEVELS = [
  {
    key: 'NORMAL',
    labelBn: 'সাধারণ (২৪ ঘণ্টার মধ্যে সমাধান)',
    labelEn: 'Normal (Within 24 Hours)',
    badgeBn: 'সাধারণ',
    badgeEn: 'Normal',
    color: '#0284C7',
    bg: '#E0F2FE',
    border: '#BAE6FD',
  },
  {
    key: 'HIGH',
    labelBn: 'জরুরি (০২ ঘণ্টার মধ্যে পদক্ষেপ)',
    labelEn: 'High Priority (Within 2 Hours)',
    badgeBn: 'জরুরি',
    badgeEn: 'High',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
  },
  {
    key: 'URGENT',
    labelBn: 'অতি জরুরি / লাইভ এয়ারপোর্ট সংকট (১৫-৩০ মিনিট)',
    labelEn: 'Critical / Airport Live Issue (15-30 Mins)',
    badgeBn: 'অতি জরুরি',
    badgeEn: 'Urgent',
    color: '#DC2626',
    bg: '#FEE2E2',
    border: '#FECACA',
  },
];

// 3. Helper to generate Ticket ID
export function generateComplaintTicketId() {
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `FC-TKT-2026-${random4}`;
}

// 4. Retrieve Passenger Complaints stored in this device
export async function getPassengerComplaints() {
  try {
    const raw = await AsyncStorage.getItem(COMPLAINTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn('Error reading passenger complaints:', e.message);
  }
  return [];
}

// 5. Save Passenger Complaint locally
export async function savePassengerComplaints(list) {
  try {
    await AsyncStorage.setItem(COMPLAINTS_STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.warn('Error saving passenger complaints:', e.message);
    return false;
  }
}

// 6. Submit a New Passenger Complaint
export async function submitPassengerComplaint(formData = {}) {
  const ticketId = generateComplaintTicketId();
  const now = new Date();

  const selectedCategory = COMPLAINT_CATEGORIES.find(c => c.key === formData.category) || COMPLAINT_CATEGORIES[0];
  const selectedUrgency = URGENCY_LEVELS.find(u => u.key === formData.urgency) || URGENCY_LEVELS[0];

  const complaintRecord = {
    id: ticketId,
    ticketId,
    bookingId: formData.bookingId?.trim() || `BK-${String(Date.now()).slice(-4)}`,
    passengerName: formData.passengerName?.trim() || 'Passenger',
    phone: formData.phone?.trim() || '',
    email: formData.email?.trim() || '',
    flightNumber: (formData.flightNumber || 'FLIGHT').trim().toUpperCase(),
    travelDate: formData.travelDate || now.toISOString().slice(0, 10),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    category: selectedCategory.key,
    categoryNameBn: selectedCategory.nameBn,
    categoryNameEn: selectedCategory.nameEn,
    urgency: selectedUrgency.key,
    priority: selectedUrgency.key === 'URGENT' ? 'HIGH' : selectedUrgency.key,
    officerName: formData.officerName?.trim() || 'Duty Team',
    baggageTag: formData.baggageTag?.trim() || '',
    pirNumber: formData.baggageTag?.trim() || `DAC-TKT-${ticketId.slice(-4)}`,
    description: formData.description?.trim() || '',
    notes: formData.description?.trim() || '',
    status: 'open', // 'open' | 'in_progress' | 'resolved'
    source: 'passenger_portal',
    resolutionNotes: '',
    assignedDutyOfficer: 'Duty Manager (DAC Hub)',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // Step A: Save to local passenger device cache
  try {
    const existing = await getPassengerComplaints();
    const updated = [complaintRecord, ...existing];
    await savePassengerComplaints(updated);
  } catch (err) {
    console.warn('Failed to save to local complaints cache:', err);
  }

  // Step B: Inject into Airport Operations Incidents log so Managers immediately see it in AdminIncidentsTab
  try {
    const incidents = await getIncidentLogs();
    const incidentEntry = {
      id: ticketId,
      bookingId: complaintRecord.bookingId,
      passengerName: complaintRecord.passengerName,
      flightNumber: complaintRecord.flightNumber,
      date: complaintRecord.travelDate,
      time: complaintRecord.time,
      type: complaintRecord.category === 'baggage_handling' ? 'lost_baggage' : 'flight_disruption',
      typeNameEn: `Passenger Grievance: ${complaintRecord.categoryNameEn}`,
      typeNameBn: `যাত্রী অভিযোগ: ${complaintRecord.categoryNameBn}`,
      priority: complaintRecord.priority,
      status: 'open',
      assignedOfficer: 'Airport Duty Manager',
      pirNumber: complaintRecord.pirNumber,
      bagDescription: complaintRecord.baggageTag ? `Tag: ${complaintRecord.baggageTag}` : 'N/A',
      notes: `[Passenger Grievance Ticket #${ticketId}]\nPhone: ${complaintRecord.phone}\nEmail: ${complaintRecord.email || 'N/A'}\nOfficer Mentioned: ${complaintRecord.officerName || 'N/A'}\nDetails: ${complaintRecord.description}`,
      resolutionNotes: '',
      contactPhone: complaintRecord.phone,
      contactEmail: complaintRecord.email,
      source: 'passenger_portal',
      complaintCategory: complaintRecord.category,
      createdAt: complaintRecord.createdAt,
      updatedAt: complaintRecord.updatedAt,
    };
    const nextIncidents = [incidentEntry, ...incidents];
    await saveIncidentLogs(nextIncidents);
  } catch (err) {
    console.warn('Failed to sync to incident logs:', err);
  }

  // Step C: Push to Firestore Cloud Database ('complaints' collection)
  try {
    if (firestoreDb) {
      const complaintRef = doc(firestoreDb, 'complaints', ticketId);
      await setDoc(complaintRef, complaintRecord, { merge: true });
    }
  } catch (cloudErr) {
    console.warn('Firestore cloud sync for complaint failed (offline fallback active):', cloudErr.message);
  }

  // Step D: Broadcast notification to operations team
  try {
    await dispatchStaffNotification({
      staffId: 'DUTY_MANAGER_ROOM',
      staffName: 'Duty Manager',
      type: STAFF_NOTIFICATION_TYPES.SYSTEM_ALERT,
      bookingId: complaintRecord.bookingId,
      passengerName: complaintRecord.passengerName,
      flight: complaintRecord.flightNumber,
      rating: 1,
      comment: `[Grievance Ticket #${ticketId}] ${complaintRecord.categoryNameBn} - ${complaintRecord.description}`,
      lang: 1,
    });
  } catch (notifyErr) {
    console.warn('Failed to dispatch staff alert for complaint:', notifyErr);
  }

  return {
    success: true,
    ticket: complaintRecord,
    ticketId,
  };
}

// 7. Track Complaint by Ticket ID
export async function trackComplaintStatus(ticketId) {
  if (!ticketId) return null;
  const cleanId = ticketId.trim().toUpperCase();

  // Check 1: In local device complaints
  const localList = await getPassengerComplaints();
  const foundLocal = localList.find(c => c.id.toUpperCase() === cleanId || c.ticketId?.toUpperCase() === cleanId);

  // Check 2: In incident logs (which Duty Managers update)
  const incidentList = await getIncidentLogs();
  const foundIncident = incidentList.find(i => i.id.toUpperCase() === cleanId);

  if (foundIncident) {
    return {
      ...(foundLocal || {}),
      id: foundIncident.id,
      ticketId: foundIncident.id,
      passengerName: foundIncident.passengerName,
      flightNumber: foundIncident.flightNumber,
      status: foundIncident.status, // 'open' | 'in_progress' | 'resolved'
      resolutionNotes: foundIncident.resolutionNotes || (foundLocal?.resolutionNotes || ''),
      updatedAt: foundIncident.updatedAt || foundLocal?.updatedAt,
      priority: foundIncident.priority,
      categoryNameBn: foundLocal?.categoryNameBn || foundIncident.typeNameBn,
      categoryNameEn: foundLocal?.categoryNameEn || foundIncident.typeNameEn,
      description: foundLocal?.description || foundIncident.notes,
    };
  }

  if (foundLocal) {
    return foundLocal;
  }

  // Check 3: Firestore Cloud fetch
  try {
    if (firestoreDb) {
      const docRef = doc(firestoreDb, 'complaints', cleanId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
    }
  } catch (e) {
    console.warn('Error fetching ticket from Firestore:', e.message);
  }

  return null;
}

