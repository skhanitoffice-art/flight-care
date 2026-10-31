// src/services/placardService.js
// Flight Care Enterprise - VIP Airport Protocol Placard Maker & Audit History Service

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  saveFirestoreDoc,
  deleteFirestoreDoc,
  getFirestoreCollection,
  isFirebaseConfigured,
} from './firebase.js';

export const PLACARD_STORAGE_KEY = 'flightcare_placard_history_v1';
export const FIRESTORE_COLLECTION_PLACARDS = 'placard_history';

// Sample baseline history with exact reference structure matching HSIA operational placards
const INITIAL_SAMPLE_PLACARDS = [
  {
    id: 'PLC-1730370000001',
    passengerName: 'MR. ISHAUJHYAODS',
    serviceDate: '29-10-2026',
    rawDate: '2026-10-29',
    flightNumber: 'XY-312',
    createdBy: {
      id: 'mgr_sonia',
      name: 'Sonia Akter',
      email: 'sonia.manager@flightcaresbd.com',
      role: 'manager',
      roleTitle: 'Operations Manager',
    },
    createdAt: '2026-10-29T10:15:00.000Z',
    createdAtFormatted: '29 Oct 2026, 10:15 AM',
  },
  {
    id: 'PLC-1730362800002',
    passengerName: 'DR. MD. KAMAL UDDIN',
    serviceDate: '31-10-2026',
    rawDate: '2026-10-31',
    flightNumber: 'EK-582',
    createdBy: {
      id: 'admin_user',
      name: 'Super Admin',
      email: 'skhanitoffice@gmail.com',
      role: 'admin',
      roleTitle: 'Super Admin',
    },
    createdAt: '2026-10-31T07:20:00.000Z',
    createdAtFormatted: '31 Oct 2026, 07:20 AM',
  },
  {
    id: 'PLC-1730276400003',
    passengerName: 'MR. ANISUR RAHMAN',
    serviceDate: '31-10-2026',
    rawDate: '2026-10-31',
    flightNumber: 'BG-084',
    createdBy: {
      id: 'mgr_sonia',
      name: 'Sonia Akter',
      email: 'sonia.manager@flightcaresbd.com',
      role: 'manager',
      roleTitle: 'Operations Manager',
    },
    createdAt: '2026-10-31T09:15:00.000Z',
    createdAtFormatted: '31 Oct 2026, 09:15 AM',
  },
];

/**
 * Standardize passenger name with proper honorific prefix
 */
export function formatPlacardName(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'VALUED PASSENGER';
  const trimmed = rawName.trim();
  let formatted = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  const honorifics = [
    'mr.', 'mr ', 'mrs.', 'mrs ', 'ms.', 'ms ', 'md.', 'md ',
    'dr.', 'dr ', 'engr.', 'engr ', 'barrister', 'advocate',
    'prof.', 'professor', 'begum', 'alhaj', 'haji'
  ];

  const hasPrefix = honorifics.some(h => lower.startsWith(h));
  if (!hasPrefix) {
    formatted = `MR. ${formatted}`;
  }
  return formatted;
}

/**
 * Format flight number to clean uppercase (e.g. XY-312, BG-084)
 */
export function formatPlacardFlight(rawFlight) {
  if (!rawFlight || typeof rawFlight !== 'string') return 'XY-312';
  const clean = rawFlight.replace(/^FLIGHT[:\s]*/i, '').trim().toUpperCase();
  return clean || 'XY-312';
}

/**
 * Format service date to exact DD-MM-YYYY (e.g. "29-10-2026") matching official reference
 */
export function formatPlacardDate(rawDate) {
  if (!rawDate) {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${day}-${mm}-${today.getFullYear()}`;
  }

  const str = String(rawDate).trim();

  // If already in DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // If in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // If in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  }

  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}-${mm}-${d.getFullYear()}`;
    }
    return str;
  } catch {
    return str;
  }
}

/**
 * Format timestamp to human readable date & time
 */
export function formatPlacardDateTime(dateObj = new Date()) {
  try {
    const d = new Date(dateObj);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${mon} ${yr}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } catch {
    return new Date().toLocaleString();
  }
}

/**
 * Retrieve all Placard records from local storage & Firestore
 */
export async function getPlacardHistory() {
  try {
    const raw = await AsyncStorage.getItem(PLACARD_STORAGE_KEY);
    let list = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }

    if (!Array.isArray(list) || list.length === 0) {
      list = [...INITIAL_SAMPLE_PLACARDS];
      await AsyncStorage.setItem(PLACARD_STORAGE_KEY, JSON.stringify(list));
    }

    // Background sync from Firestore if connected
    if (isFirebaseConfigured()) {
      getFirestoreCollection(FIRESTORE_COLLECTION_PLACARDS)
        .then(async remoteItems => {
          if (Array.isArray(remoteItems) && remoteItems.length > 0) {
            const map = new Map();
            list.forEach(item => { if (item.id) map.set(item.id, item); });
            remoteItems.forEach(item => { if (item.id) map.set(item.id, item); });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            );
            await AsyncStorage.setItem(PLACARD_STORAGE_KEY, JSON.stringify(merged));
          }
        })
        .catch(() => {});
    }

    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch (err) {
    console.warn('[placardService] getPlacardHistory error:', err?.message);
    return [...INITIAL_SAMPLE_PLACARDS];
  }
}

/**
 * Save newly generated placard record into history
 */
export async function savePlacardRecord({
  passengerName,
  serviceDate,
  flightNumber,
  managerSession,
}) {
  try {
    const formattedName = formatPlacardName(passengerName);
    const formattedFlight = formatPlacardFlight(flightNumber);
    const formattedDate = formatPlacardDate(serviceDate);
    const now = new Date();

    const isManagerRole = managerSession?.user?.role === 'manager';
    const creatorName = managerSession?.user?.name || (isManagerRole ? 'Sonia Akter' : 'Super Admin');
    const creatorEmail = managerSession?.user?.email || (isManagerRole ? 'sonia.manager@flightcaresbd.com' : 'skhanitoffice@gmail.com');
    const creatorRole = managerSession?.user?.role || (isManagerRole ? 'manager' : 'admin');
    const roleTitle = isManagerRole ? 'Operations Manager' : 'Super Admin';

    const newRecord = {
      id: `PLC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      passengerName: formattedName,
      serviceDate: formattedDate,
      rawDate: serviceDate || new Date().toISOString().split('T')[0],
      flightNumber: formattedFlight,
      createdBy: {
        id: managerSession?.user?.id || 'admin_user',
        name: creatorName,
        email: creatorEmail,
        role: creatorRole,
        roleTitle,
      },
      createdAt: now.toISOString(),
      createdAtFormatted: formatPlacardDateTime(now),
    };

    const currentList = await getPlacardHistory();
    const updatedList = [newRecord, ...currentList.filter(item => item.id !== newRecord.id)];

    await AsyncStorage.setItem(PLACARD_STORAGE_KEY, JSON.stringify(updatedList));

    if (isFirebaseConfigured()) {
      saveFirestoreDoc(FIRESTORE_COLLECTION_PLACARDS, newRecord.id, newRecord).catch(() => {});
    }

    return newRecord;
  } catch (err) {
    console.warn('[placardService] savePlacardRecord error:', err?.message);
    return null;
  }
}

/**
 * Delete a specific placard history record (Super Admin only)
 */
export async function deletePlacardRecord(id) {
  try {
    const currentList = await getPlacardHistory();
    const updatedList = currentList.filter(item => item.id !== id);
    await AsyncStorage.setItem(PLACARD_STORAGE_KEY, JSON.stringify(updatedList));

    if (isFirebaseConfigured()) {
      deleteFirestoreDoc(FIRESTORE_COLLECTION_PLACARDS, id).catch(() => {});
    }
    return updatedList;
  } catch (err) {
    console.warn('[placardService] deletePlacardRecord error:', err?.message);
    return [];
  }
}

/**
 * Clear all placard history (Super Admin only)
 */
export async function clearAllPlacardHistory() {
  try {
    await AsyncStorage.setItem(PLACARD_STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch (err) {
    console.warn('[placardService] clearAllPlacardHistory error:', err?.message);
    return [];
  }
}

/**
 * Export Placard generation audit history as CSV for Super Admin
 */
export function exportPlacardHistoryCsv(records = [], lang = 0) {
  if (!records || records.length === 0) return;

  const isBn = Boolean(lang);
  const headers = isBn
    ? ['প্লেকার্ড আইডি', 'যাত্রীর নাম', 'সার্ভিস তারিখ', 'ফ্লাইট নম্বর', 'তৈরি করেছেন (অফিসার)', 'অফিসার পদবী', 'অফিসার ইমেইল', 'তৈরির সময়']
    : ['Placard ID', 'Passenger Name', 'Service Date', 'Flight Number', 'Created By (Officer)', 'Officer Role', 'Officer Email', 'Creation Timestamp'];

  const rows = records.map(r => [
    `"${r.id || ''}"`,
    `"${(r.passengerName || '').replace(/"/g, '""')}"`,
    `"${r.serviceDate || ''}"`,
    `"${r.flightNumber || ''}"`,
    `"${(r.createdBy?.name || '').replace(/"/g, '""')}"`,
    `"${r.createdBy?.roleTitle || r.createdBy?.role || ''}"`,
    `"${r.createdBy?.email || ''}"`,
    `"${r.createdAtFormatted || r.createdAt || ''}"`,
  ]);

  const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows.map(row => row.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FlightCare_Placard_History_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Pixel-Perfect High-Resolution HTML5 Canvas Placard Generator & Image Downloader (1024x724 A4)
 * Matching reference image: MR. ISHAUJHYAODS, FLIGHT: XY-312, DATE: 29-10-2026
 */
export function downloadPlacardImage({
  passengerName,
  flightNumber,
  serviceDate,
  onSuccess,
}) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  try {
    const formattedName = formatPlacardName(passengerName);
    const cleanFlight = formatPlacardFlight(flightNumber);
    const formattedDate = formatPlacardDate(serviceDate);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 724;
    const ctx = canvas.getContext('2d');

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = '/placard_template.png';

    const renderCanvas = () => {
      // 1. Draw Template Artwork
      ctx.drawImage(img, 0, 0, 1024, 724);

      // 2. Draw Passenger Name (Matching reference exact style: dark forest green #012B14, Impact font)
      ctx.fillStyle = '#012B14';
      let canvasNameSize = 128;
      ctx.font = `900 ${canvasNameSize}px 'Impact', 'Montserrat', 'Arial Black', sans-serif`;
      const maxNameWidth = 940;
      const measuredW = ctx.measureText(formattedName).width;
      if (measuredW > maxNameWidth) {
        canvasNameSize = Math.floor(canvasNameSize * (maxNameWidth / measuredW));
      }
      canvasNameSize = Math.max(48, canvasNameSize);
      ctx.font = `900 ${canvasNameSize}px 'Impact', 'Montserrat', 'Arial Black', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formattedName, 512, 380);

      // 3. Center Gold Vertical Divider Bar at x=511, y=460..514
      ctx.fillStyle = '#CAA048';
      ctx.fillRect(511, 460, 2, 54);

      // 4. Airplane Icon + FLIGHT text (Exact positions from reference image)
      const planeImg = new window.Image();
      planeImg.crossOrigin = 'anonymous';
      planeImg.src = '/placard_plane_icon.png';

      // 5. Calendar Icon + DATE text (Exact positions from reference image)
      const calImg = new window.Image();
      calImg.crossOrigin = 'anonymous';
      calImg.src = '/placard_cal_icon.png';

      const drawFinal = () => {
        // Airplane icon at x=217, y=467, w=42, h=31
        try {
          ctx.drawImage(planeImg, 217, 467, 42, 31);
        } catch {}
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#012B14';
        ctx.font = `800 12px sans-serif`;
        ctx.fillText('FLIGHT:', 275, 470);
        ctx.font = `900 30px 'Impact', 'Arial Black', sans-serif`;
        ctx.fillText(cleanFlight, 275, 508);

        // Calendar icon at x=537, y=465, w=30, h=34
        try {
          ctx.drawImage(calImg, 537, 465, 30, 34);
        } catch {}
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#012B14';
        ctx.font = `800 12px sans-serif`;
        ctx.fillText('DATE:', 586, 470);
        ctx.font = `900 30px 'Impact', 'Arial Black', sans-serif`;
        ctx.fillText(formattedDate, 586, 508);

        // Export high-res PNG download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const safeName = formattedName.replace(/[^a-zA-Z0-9]/g, '_');
        const safeFlight = cleanFlight.replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `FlightCare_Placard_${safeFlight}_${safeName}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (typeof onSuccess === 'function') onSuccess();
      };

      let loadedCount = 0;
      const markLoaded = () => {
        loadedCount += 1;
        if (loadedCount >= 2) drawFinal();
      };
      planeImg.onload = markLoaded;
      calImg.onload = markLoaded;
      planeImg.onerror = markLoaded;
      calImg.onerror = markLoaded;
      setTimeout(() => {
        if (loadedCount < 2) drawFinal();
      }, 350);
    };

    img.onload = renderCanvas;
    img.onerror = () => {
      img.src = './placard_template.png';
    };
  } catch (err) {
    console.warn('[placardService] downloadPlacardImage notice:', err);
  }
}

/**
 * Direct High-Resolution Print Window with CSS A4 Landscape
 * Matching exact dimensions and positioning from reference artwork
 */
export function printPlacardDirect({
  passengerName,
  flightNumber,
  serviceDate,
  onSuccess,
}) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  try {
    const formattedName = formatPlacardName(passengerName);
    const cleanFlight = formatPlacardFlight(flightNumber);
    const formattedDate = formatPlacardDate(serviceDate);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Flight Care VIP Placard - ${formattedName} (${cleanFlight})</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #FFFFFF;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .placard-container {
            position: relative;
            width: 1024px;
            height: 724px;
            max-width: 100vw;
            max-height: 100vh;
          }
          .bg-image {
            width: 100%;
            height: 100%;
            display: block;
          }
          .name-overlay {
            position: absolute;
            top: 52.5%;
            left: 4%;
            width: 92%;
            text-align: center;
            transform: translateY(-50%);
            font-family: 'Impact', 'Montserrat', 'Arial Black', sans-serif;
            font-size: ${formattedName.length > 25 ? '76px' : formattedName.length > 20 ? '94px' : formattedName.length > 15 ? '112px' : '128px'};
            font-weight: 900;
            color: #012B14;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            white-space: nowrap;
          }
          .flight-date-overlay {
            position: absolute;
            top: 67.2%;
            left: 5%;
            width: 90%;
            transform: translateY(-50%);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .info-group {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .plane-icon {
            width: 42px;
            height: 31px;
            object-fit: contain;
          }
          .cal-icon {
            width: 30px;
            height: 34px;
            object-fit: contain;
          }
          .info-text {
            display: flex;
            flex-direction: column;
            text-align: left;
          }
          .info-label {
            font-family: sans-serif;
            font-size: 12px;
            font-weight: 800;
            color: #012B14;
            line-height: 1.1;
          }
          .info-val {
            font-family: 'Impact', 'Arial Black', sans-serif;
            font-size: 29px;
            font-weight: 900;
            color: #012B14;
            line-height: 1.1;
            letter-spacing: 0.5px;
          }
          .gold-divider-bar {
            width: 2px;
            height: 52px;
            background-color: #CAA048;
            margin: 0 32px;
          }
        </style>
      </head>
      <body>
        <div class="placard-container">
          <img src="/placard_template.png" class="bg-image" onload="window.print(); setTimeout(() => window.close(), 1000);" />
          <div class="name-overlay">${formattedName}</div>
          <div class="flight-date-overlay">
            <div class="info-group">
              <img src="/placard_plane_icon.png" class="info-icon plane-icon" />
              <div class="info-text">
                <span class="info-label">FLIGHT:</span>
                <span class="info-val">${cleanFlight}</span>
              </div>
            </div>
            <div class="gold-divider-bar"></div>
            <div class="info-group">
              <img src="/placard_cal_icon.png" class="info-icon cal-icon" />
              <div class="info-text">
                <span class="info-label">DATE:</span>
                <span class="info-val">${formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();

    if (typeof onSuccess === 'function') onSuccess();
  } catch (err) {
    console.warn('[placardService] printPlacardDirect notice:', err);
  }
}
