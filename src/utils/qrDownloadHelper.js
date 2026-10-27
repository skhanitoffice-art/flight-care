/**
 * Flight Care - Protocol Officer & Staff QR Code Download Helper
 * প্রোটোকল অফিসার ও ষ্টাফ কিউআর কোড ডাউনলোড সার্ভিস
 */

import { Platform, Linking, Alert } from 'react-native';

/**
 * Clean string for safe file names
 */
function sanitizeFileName(str) {
  return String(str || 'officer')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/__+/g, '_')
    .slice(0, 40);
}

/**
 * Downloads high-resolution QR code image (PNG)
 * Supports two modes:
 *  - 'qr_only': Standalone clean 600x600 QR Code PNG
 *  - 'badge_card': Full Branded Official ID Pass Badge with QR Code PNG
 */
export async function downloadOfficerQrCode({
  member,
  verificationUrl,
  qrImageUrl,
  mode = 'qr_only',
  lang = 1,
}) {
  const isBn = lang === 1;
  const safeName = sanitizeFileName(member?.name || member?.nameBn || 'Officer');
  const badgeId = member?.badgeNo || member?.id || 'FC-PO';
  const targetUrl = verificationUrl || `https://flightcaresbd.com/?familyMember=${encodeURIComponent(badgeId)}`;

  let highResQrUrl = qrImageUrl;
  if (highResQrUrl && highResQrUrl.includes('size=350x350')) {
    highResQrUrl = highResQrUrl.replace('size=350x350', 'size=600x600');
  } else if (!highResQrUrl) {
    highResQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&format=png&data=${encodeURIComponent(targetUrl)}`;
  }

  // 1. WEB PLATFORM IMPLEMENTATION
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (mode === 'qr_only') {
      try {
        const response = await fetch(highResQrUrl, { mode: 'cors' });
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const fileName = `FlightCare_QR_${safeName}_${badgeId}.png`;
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500);
        return { success: true, fileName };
      } catch (err) {
        console.warn('Direct fetch QR download failed, trying canvas fallback:', err);
        return downloadViaCanvas(highResQrUrl, `FlightCare_QR_${safeName}_${badgeId}.png`);
      }
    } else {
      // mode === 'badge_card': Draw complete VIP ID Badge with QR on HTML5 Canvas
      return generateAndDownloadBadgeCanvas(member, targetUrl, highResQrUrl, safeName, badgeId, isBn);
    }
  }

  // 2. NATIVE MOBILE IMPLEMENTATION (Fallback)
  try {
    await Linking.openURL(highResQrUrl);
    return { success: true, fileName: 'High-Res QR Opened' };
  } catch (nativeErr) {
    Alert.alert(
      isBn ? 'কিউআর কোড ডাউনলোড' : 'Download QR Code',
      isBn
        ? `কিউআর কোড লিংক: ${highResQrUrl}`
        : `QR Code Image Link: ${highResQrUrl}`
    );
    return { success: false, error: nativeErr.message };
  }
}

/**
 * Fallback download via HTML5 Canvas
 */
function downloadViaCanvas(imageUrl, fileName) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 600;
        canvas.height = img.height || 600;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500);
            resolve({ success: true, fileName });
          } else {
            window.open(imageUrl, '_blank');
            resolve({ success: false });
          }
        }, 'image/png');
      } catch (e) {
        window.open(imageUrl, '_blank');
        resolve({ success: false });
      }
    };
    img.onerror = () => {
      window.open(imageUrl, '_blank');
      resolve({ success: false });
    };
    img.src = imageUrl;
  });
}

/**
 * Generates an official 640x960 printable VIP ID Pass Badge with QR Code
 */
function generateAndDownloadBadgeCanvas(member, targetUrl, qrImageUrl, safeName, badgeId, isBn) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 940;
    const ctx = canvas.getContext('2d');

    // 1. Background Fill (Card)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Card Header Navy Banner
    ctx.fillStyle = '#071A2E';
    ctx.fillRect(0, 0, canvas.width, 160);

    // Gold Wave Trim
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, 160, canvas.width, 6);

    // Brand Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FLIGHT CARE AVIATION', canvas.width / 2, 60);

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('AIRPORT PROTOCOL & VIP CONCIERGE SERVICES', canvas.width / 2, 90);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px sans-serif';
    ctx.fillText('Hazrat Shahjalal International Airport, Dhaka (HSIA)', canvas.width / 2, 118);

    // 3. Officer Details Section
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 24px sans-serif';
    const memberName = (isBn ? member.nameBn || member.name : member.name) || 'Protocol Officer';
    ctx.fillText(memberName, canvas.width / 2, 215);

    ctx.fillStyle = '#0284C7';
    ctx.font = 'bold 16px sans-serif';
    const memberRank = (isBn ? member.rankBn || member.rank : member.rank) || 'Protocol Officer';
    ctx.fillText(memberRank, canvas.width / 2, 245);

    // Badge Pill
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(170, 265, 300, 36);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(170, 265, 300, 36);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`ID: ${badgeId} • SERIAL: #${member.serial || '1'}`, canvas.width / 2, 289);

    // 4. Instructions above QR
    ctx.fillStyle = '#64748B';
    ctx.font = '13px sans-serif';
    ctx.fillText(
      isBn ? 'কর্মকর্তার বিস্তারিত প্রোফাইল দেখতে কিউআর কোডটি স্ক্যান করুন' : 'Scan QR code with smartphone to verify credentials',
      canvas.width / 2,
      340
    );

    // 5. Load and Draw High-Res QR Code Image
    const qrImg = new window.Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.onload = () => {
      // QR Box Outer Frame
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(145, 370, 350, 350);
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 3;
      ctx.strokeRect(145, 370, 350, 350);

      // Draw QR Image inside
      ctx.drawImage(qrImg, 160, 385, 320, 320);

      // 6. Security Seal Badge
      ctx.fillStyle = '#ECFDF5';
      ctx.fillRect(145, 740, 350, 38);
      ctx.strokeStyle = '#A7F3D0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(145, 740, 350, 38);

      ctx.fillStyle = '#065F46';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('🛡️ CAAB & HSIA VERIFIED OFFICIAL IDENTITY', canvas.width / 2, 764);

      // 7. Footer License / Validity
      ctx.fillStyle = '#071A2E';
      ctx.fillRect(0, 860, canvas.width, 80);

      ctx.fillStyle = '#FCD34D';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`LICENSE NO: ${member.licenseNo || 'CAAB-PASS-842'} • VALID THRU 2027`, canvas.width / 2, 895);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px monospace';
      ctx.fillText(targetUrl, canvas.width / 2, 920);

      // Export Canvas to PNG
      canvas.toBlob((blob) => {
        if (blob) {
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          const fileName = `FlightCare_ID_Pass_QR_${safeName}_${badgeId}.png`;
          a.href = blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500);
          resolve({ success: true, fileName });
        } else {
          resolve({ success: false });
        }
      }, 'image/png');
    };

    qrImg.onerror = () => {
      console.warn('Failed to load QR image on canvas, downloading pure QR fallback');
      downloadViaCanvas(qrImageUrl, `FlightCare_QR_${safeName}_${badgeId}.png`).then(resolve);
    };

    qrImg.src = qrImageUrl;
  });
}

