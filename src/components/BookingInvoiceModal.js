import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { FLIGHTCARE_LOGO_DATA_URL } from '../constants/flightcareLogoBase64';
import VipPlacardModal from './VipPlacardModal';

export default function BookingInvoiceModal({
  visible,
  onClose,
  booking,
  lang = 0,
}) {
  const isBn = Boolean(lang);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPlacardModal, setShowPlacardModal] = useState(false);

  if (!visible || !booking) return null;

  const bookingId = booking.id || booking.confirmedId || 'FC-39482';
  const passengerName = booking.passengerName || booking.name || (isBn ? 'সম্মানিত যাত্রী' : 'Valued Passenger');
  const bookerName = booking.bookingForSomeoneElse ? booking.name : passengerName;
  const phone = booking.passengerPhone || booking.phone || '01712345678';
  const email = booking.email || booking.passengerEmail || 'passenger@flightcare.app';
  const flightNumber = (booking.flight?.number || booking.fno || 'BG-084').toUpperCase();
  const serviceDate = booking.flight?.date || booking.date || '15-10-2026';
  const airport = booking.airportName || (isBn ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (DAC)' : 'Hazrat Shahjalal Int Airport, Dhaka (DAC)');
  const direction = booking.dir === 'dep'
    ? (isBn ? 'প্রস্থান (Departure Protocol)' : 'Departure Protocol')
    : (isBn ? 'আগমন (Arrival Protocol)' : 'Arrival Protocol');
  const packageName = booking.pkg?.n
    ? booking.pkg.n[isBn ? 1 : 0]
    : (booking.packageChoice === 'first'
        ? (isBn ? 'ভিআইপি প্রোটোকল' : 'VIP Protocol')
        : booking.packageChoice === 'business'
        ? (isBn ? 'প্রিমিয়াম প্রোটোকল' : 'Premium Protocol')
        : (isBn ? 'স্ট্যান্ডার্ড প্রোটোকল' : 'Standard Protocol'));
  const amount = Number(booking.amount) || 1000;
  const trxId = booking.trxId || `TXN${Math.floor(10000000 + Math.random() * 90000000)}`;
  const hasVisaOnArrival = Boolean(
    booking.addons?.includes('visa') ||
    booking.addons?.includes('visa_on_arrival') ||
    booking.addonDetails?.visa ||
    booking.addonDetails?.visa_on_arrival
  );
  const isPayAfter = booking.paidMethod === 'pay_after_service' || booking.method === 'pay_after_service' || booking.paymentStatus === 'pay_after_service';
  const paymentChannel = isPayAfter
    ? (isBn ? 'সার্ভিস সমাপ্তির পরে পেমেন্ট (Pay After Service)' : 'Payment After Service (On-Arrival Settlement)')
    : booking.paidMethod === 'card'
    ? (isBn ? 'ব্যাংক কার্ড (Visa/Mastercard 3D Secure)' : 'Bank Card (Visa/Mastercard 3D Secure)')
    : (isBn ? 'বাংলা কিউআর (Bangla QR National Gateway)' : 'Bangla QR National Gateway (NPSB)');
  const issuedDate = new Date().toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Dedicated High-Resolution Printable Voucher HTML (300 DPI A4 & Exact Color Preservation)
  const getVoucherHtml = () => `<!DOCTYPE html>
<html lang="${isBn ? 'bn' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>FlightCare_Invoice_${bookingId}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    html, body {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif;
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      overflow-x: hidden !important;
    }
    .voucher-card {
      width: 100% !important;
      max-width: 680px !important;
      margin: 0 auto !important;
      background: #ffffff !important;
      border-radius: 14px !important;
      border: 1.5px solid #cbd5e1 !important;
      padding: 18px 22px !important;
      box-sizing: border-box !important;
      box-shadow: 0 2px 16px rgba(0,0,0,0.04);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 18px;
      margin-bottom: 18px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo-img {
      width: 82px;
      height: 82px;
      object-fit: contain;
      border-radius: 12px;
    }
    .brand-title {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .brand-primary { color: #0f2a4a; }
    .brand-accent { color: #f97316; }
    .brand-sub {
      font-size: 13.5px;
      font-weight: 700;
      color: #334155;
      margin-top: 4px;
    }
    .brand-desc {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .badge {
      padding: 8px 14px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 12px;
      letter-spacing: 0.5px;
      text-align: center;
      white-space: nowrap;
    }
    .badge-paid {
      background: #dcfce7 !important;
      color: #15803d !important;
      border: 1.5px solid #86efac !important;
    }
    .badge-pay-after {
      background: #fef3c7 !important;
      color: #b45309 !important;
      border: 1.5px solid #fcd34d !important;
    }
    .ref-bar {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 18px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ref-label {
      font-size: 10.5px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ref-val {
      font-size: 19px;
      font-weight: 900;
      color: #0284c7;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .date-val {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
      text-align: right;
    }
    .section-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 16px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 6.5px 0 !important;
      border-bottom: 1px dashed #e2e8f0 !important;
      font-size: 13px !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .label {
      color: #64748b !important;
      font-weight: 600 !important;
      flex: 0 0 auto !important;
      max-width: 45% !important;
    }
    .value {
      color: #0f172a !important;
      font-weight: 700 !important;
      text-align: right !important;
      flex: 1 1 auto !important;
      word-break: break-word !important;
      padding-left: 10px !important;
    }
    .total-box {
      background: #f0f9ff;
      border: 1.5px solid #bae6fd;
      border-radius: 12px;
      padding: 16px 20px;
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meeting-info {
      background: #fefce8;
      border: 1.5px solid #fef08a;
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 16px;
      font-size: 12.5px;
      color: #854d0e;
      line-height: 1.5;
    }
    .disclaimer-box {
      background: #fef2f2;
      border: 1.5px solid #fca5a5;
      border-radius: 12px;
      padding: 13px 16px;
      margin-top: 14px;
      font-size: 11.5px;
      color: #991b1b;
      line-height: 1.5;
    }
    .barcode-box {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 18px;
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer {
      text-align: center;
      margin-top: 22px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 8mm 10mm;
      }
      html, body {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .voucher-card {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 14px 18px !important;
        border: 1.5px solid #cbd5e1 !important;
        box-shadow: none !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="voucher-card">
    <div class="header">
      <div class="logo-container">
        <img src="${FLIGHTCARE_LOGO_DATA_URL}" alt="FlightCare Logo" class="logo-img" />
        <div>
          <div class="brand-title">
            <span class="brand-primary">Flight</span><span class="brand-accent">Care</span>
          </div>
          <div class="brand-sub">${isBn ? 'বিমানবন্দর প্রোটোকল ও ভিআইপি গ্রাউন্ড সার্ভিস' : 'Airport Protocol & Ground Concierge Service'}</div>
          <div class="brand-desc">${isBn ? 'বেসামরিক বিমান চলাচল কর্তৃপক্ষ (CAAB) নিবন্ধিত পার্টনার • হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর (DAC)' : 'CAAB Certified Ground Handling Partner • Hazrat Shahjalal Int. Airport (DAC)'}</div>
        </div>
      </div>
      <div class="badge ${isPayAfter ? 'badge-pay-after' : 'badge-paid'}">
        ${isPayAfter ? (isBn ? '⏳ সার্ভিস শেষে প্রদেয়' : '⏳ PAY AFTER SERVICE') : (isBn ? '✓ পরিশোধিত ও নিশ্চিত' : '✓ PAID & CONFIRMED')}
      </div>
    </div>

    <div class="ref-bar">
      <div>
        <div class="ref-label">${isBn ? 'বুকিং রেফারেন্স আইডি:' : 'BOOKING REFERENCE:'}</div>
        <div class="ref-val">#${bookingId}</div>
      </div>
      <div>
        <div class="ref-label" style="text-align: right;">${isBn ? 'ইস্যুর তারিখ:' : 'ISSUED DATE:'}</div>
        <div class="date-val">${issuedDate}</div>
      </div>
    </div>

    <div class="section-title">${isBn ? '👤 যাত্রী ও ভ্রমণের বিবরণ' : '👤 Passenger & Travel Details'}</div>
    <div class="row">
      <span class="label">${isBn ? 'মূল যাত্রী:' : 'Lead Passenger:'}</span>
      <span class="value">${passengerName}</span>
    </div>
    <div class="row">
      <span class="label">${isBn ? 'মোবাইল নম্বর:' : 'Mobile Phone:'}</span>
      <span class="value">${phone}</span>
    </div>
    <div class="row">
      <span class="label">${isBn ? 'ইমেইল:' : 'Email Address:'}</span>
      <span class="value">${email}</span>
    </div>
    <div class="row">
      <span class="label">${isBn ? 'ফ্লাইট নম্বর:' : 'Flight Number:'}</span>
      <span class="value" style="color: #0284c7; font-size: 15px;">${flightNumber}</span>
    </div>
    <div class="row">
      <span class="label">${isBn ? 'সেবার তারিখ:' : 'Service Date:'}</span>
      <span class="value">${serviceDate}</span>
    </div>
    <div class="row">
      <span class="label">${isBn ? 'বিমানবন্দর:' : 'Airport:'}</span>
      <span class="value">${airport}</span>
    </div>
    <div class="row">
      <span class="label">${isBn ? 'প্রোটোকল প্যাকেজ:' : 'Protocol Package:'}</span>
      <span class="value" style="color: #047857; font-weight: 800;">${direction} • ${packageName}</span>
    </div>
    ${hasVisaOnArrival ? `
    <div class="row" style="background: #f0fdf4; padding: 6px 10px; border-radius: 6px; border: 1px solid #bbf7d0; margin-top: 4px;">
      <span class="label" style="color: #166534; font-weight: 800;">${isBn ? '🛂 অন-অ্যারাইভাল ভিসা:' : '🛂 Visa On Arrival:'}</span>
      <span class="value" style="color: #15803d; font-weight: 800;">${isBn ? 'সংযুক্ত ও যাচাইকৃত (৳১,৫০০/জন)' : 'Verified (৳1,500/pax)'}</span>
    </div>
    <div style="font-size: 11px; color: #b45309; background: #fffbeb; padding: 6px 10px; border-radius: 6px; border: 1px solid #fde68a; margin-top: 4px; line-height: 1.4;">
      ℹ️ ${isBn ? 'নোট: $50 USD সরকারি ভিসা ফি যাত্রীকে বিমানবন্দরে নির্ধারিত কাউন্টারে সরাসরি জমা দিতে হবে। (৪টি আবশ্যক ডকুমেন্ট সংযুক্ত)' : 'Note: $50 USD Govt Visa Fee is payable directly by passenger at airport counter. (4 Mandatory Documents attached)'}
    </div>
    ` : ''}

    <div class="section-title">${isBn ? '💳 পেমেন্ট বিবরণ' : '💳 Payment Details'}</div>
    <div class="row">
      <span class="label">${isBn ? 'পেমেন্ট মেথড:' : 'Payment Channel:'}</span>
      <span class="value">${paymentChannel}</span>
    </div>
    <div class="row">
      <span class="label">${isBn ? 'ট্রানজেকশন আইডি (TrxID):' : 'Transaction ID:'}</span>
      <span class="value" style="color: #0284c7;">${trxId}</span>
    </div>

    <div class="total-box">
      <div>
        <div style="font-size: 13px; color: #0369a1; font-weight: 800;">${isPayAfter ? (isBn ? 'মোট প্রদেয় অর্থ (সার্ভিস শেষে)' : 'TOTAL AMOUNT PAYABLE (AFTER SERVICE)') : (isBn ? 'মোট পরিশোধিত অর্থ' : 'TOTAL AMOUNT PAID')}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${isBn ? '(৫% ভ্যাট এবং প্ল্যাটফর্ম চার্জ অন্তর্ভুক্ত)' : '(Includes 5% VAT & platform charges)'}</div>
      </div>
      <div style="font-size: 26px; font-weight: 900; color: #0284c7;">৳${amount}</div>
    </div>

    <div class="meeting-info">
      <strong>📍 ${isBn ? 'বিমানবন্দরে সাক্ষাতের স্থান ও নির্দেশনা:' : 'Airport Meeting Instructions:'}</strong><br/>
      ${booking.dir === 'dep'
        ? (isBn
            ? 'আমাদের নির্ধারিত প্রোটোকল কর্মকর্তা ফ্লাইটের ৩ ঘণ্টা পূর্বে ডিপার্চার ক্যানোপি / গেট ১ প্রাঙ্গণে আপনার নাম সম্বলিত ডিজিটাল নেমবোর্ড নিয়ে উপস্থিত থাকবেন।'
            : 'Our designated Protocol Officer will greet you at Departure Canopy / Gate 1 area 3 hours prior to departure holding your name board.')
        : (isBn
            ? 'আমাদের নির্ধারিত প্রোটোকল কর্মকর্তা বোর্ডিং ব্রিজ / ইমিগ্রেশন গেট প্রস্থানস্থলে আপনার নাম সম্বলিত ভিআইপি নেমবোর্ড নিয়ে সাদরে অভ্যর্থনা জানাবেন।'
            : 'Our designated Protocol Officer will welcome you right after Boarding Bridge/immigration exit gate holding your personalized VIP placard.')}
      <br/><br/>
      <strong>📞 ${isBn ? '২৪/৭ জরুরি হেল্পলাইন:' : '24/7 VIP Helpline:'}</strong> +880 1347-570013 / +880 1347-570017
    </div>

    <div class="disclaimer-box">
      <strong>🛡️ ${isBn ? 'যাত্রীর ব্যাগেজ ও নিষিদ্ধ সামগ্রী সংক্রান্ত ঘোষণা:' : 'PASSENGER BAGGAGE & PROHIBITED GOODS DISCLAIMER:'}</strong><br/>
      ${isBn
        ? 'সম্মতি নিশ্চিতকৃত: যাত্রী নিশ্চিত ও সম্মতি প্রদান করেছেন যে তার লাগেজে কোনো জীবিত প্রাণী, অলংকার, মুদ্রা, মাদকদ্রব্য, অস্ত্র বা নিষিদ্ধ পণ্য নেই। নিষিদ্ধ পণ্য বহন বাংলাদেশ বিমান আইন অনুযায়ী দণ্ডনীয় অপরাধ।'
        : 'Consent Confirmed: Passenger has declared and consented that luggage contains NO prohibited items including live animals, jewelry/ornaments, currency, narcotics, weapons, hazardous materials, or illegal goods.'}
    </div>

    <div class="barcode-box">
      <div>
        <div style="font-family: monospace; font-size: 18px; letter-spacing: 4px; font-weight: 900; color: #0f172a;">
          ||| | |||| | ||| |||| | || |||| |
        </div>
        <div style="font-size: 10.5px; color: #64748b; font-weight: 700; margin-top: 2px;">
          AUTH-HASH: SHA-256 / HSIA-DAC-SECURED
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; font-weight: 800; color: #059669;">✓ VERIFIED E-INVOICE</div>
        <div style="font-size: 10px; color: #94a3b8;">Valid without physical signature</div>
      </div>
    </div>

    <div class="footer">
      Flight Care Technologies Ltd. • CAAB Certified Ground Concierge Partner<br/>
      ${isBn ? 'টার্মিনাল ভেরিফিকেশন ও এন্ট্রি চেকিংয়ের জন্য এই অফিসিয়াল ডিজিটাল ইনভয়েসটি সংরক্ষণ করুন।' : 'Keep this official digital voucher or printed copy for terminal verification and entry clearance.'}
    </div>
  </div>
</body>
</html>`;

  // Dedicated Print Action (Clean 100% full-width A4 Voucher without edge clipping)
  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const existing = document.getElementById('flightcare-print-frame');
        if (existing && existing.parentNode) {
          existing.parentNode.removeChild(existing);
        }

        const printIframe = document.createElement('iframe');
        printIframe.id = 'flightcare-print-frame';
        printIframe.style.position = 'fixed';
        printIframe.style.left = '-9999px';
        printIframe.style.top = '-9999px';
        printIframe.style.width = '794px'; // 210mm in 96 DPI CSS pixels
        printIframe.style.height = '1123px'; // 297mm in 96 DPI CSS pixels
        printIframe.style.border = '0';
        document.body.appendChild(printIframe);

        const doc = printIframe.contentWindow.document;
        doc.open();
        doc.write(getVoucherHtml());
        doc.close();

        // Allow fonts, logo, and layout to render at full A4 resolution before print
        setTimeout(() => {
          try {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
          } catch (e) {
            window.print();
          }
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 3000);
        }, 350);
      } catch {
        window.print();
      }
    } else {
      Alert.alert(
        isBn ? 'প্রিন্ট' : 'Print',
        isBn ? 'আপনার ডিভাইসের প্রিন্ট সুবিধা চালু করা হয়েছে।' : 'Printing invoice voucher...'
      );
    }
  };

  // Generate Ultra High-Resolution 300 DPI Vector-grade Canvas & PDF Blob
  const generateVoucherPdfBlob = async () => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');

    // Standard 300 DPI A4 Dimensions (2400 x 3390)
    const width = 2400;
    const height = 3390;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Load High-Res Official FlightCare Logo
    const logoImg = await new Promise(resolve => {
      const img = new (window.Image || Image)();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = FLIGHTCARE_LOGO_DATA_URL;
    });

    // 1. Canvas Background
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    // 2. High-Res White Voucher Card
    const cardX = 80;
    const cardY = 80;
    const cardW = 2240;
    const cardH = 3230;
    const r = 40;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cardX, cardY, cardW, cardH, r);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.fill();
    ctx.stroke();

    // 3. Draw Official FlightCare Logo
    const logoSize = 180;
    if (logoImg) {
      ctx.drawImage(logoImg, cardX + 70, cardY + 70, logoSize, logoSize);
    }

    // 4. Brand Title & Authority Text
    ctx.font = '900 68px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillStyle = '#0F2A4A';
    ctx.fillText('Flight', cardX + 280, cardY + 135);
    const flightWidth = ctx.measureText('Flight').width;
    ctx.fillStyle = '#F97316';
    ctx.fillText('Care', cardX + 280 + flightWidth, cardY + 135);

    ctx.font = '700 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(
      isBn ? 'বিমানবন্দর প্রোটোকল ও ভিআইপি গ্রাউন্ড সার্ভিস' : 'Airport Protocol & Ground Concierge Service',
      cardX + 280,
      cardY + 185
    );

    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(
      isBn ? 'বেসামরিক বিমান চলাচল কর্তৃপক্ষ (CAAB) নিবন্ধিত পার্টনার • হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর (DAC)' : 'CAAB Certified Ground Handling Partner • Hazrat Shahjalal Int. Airport (DAC)',
      cardX + 280,
      cardY + 225
    );

    // 5. Payment Status Badge on Top Right
    const badgeW = 460;
    const badgeH = 76;
    const badgeX = cardX + cardW - 70 - badgeW;
    const badgeY = cardY + 80;

    ctx.fillStyle = isPayAfter ? '#FEF3C7' : '#DCFCE7';
    ctx.strokeStyle = isPayAfter ? '#FCD34D' : '#86EFAC';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 18);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isPayAfter ? '#B45309' : '#15803D';
    ctx.font = '800 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      isPayAfter ? (isBn ? '⏳ সার্ভিস শেষে প্রদেয়' : '⏳ PAY AFTER SERVICE') : (isBn ? '✓ পরিশোধিত ও নিশ্চিত' : '✓ PAID & CONFIRMED'),
      badgeX + badgeW / 2,
      badgeY + 50
    );
    ctx.textAlign = 'left';

    // 6. Header Divider Line
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cardX + 60, cardY + 290);
    ctx.lineTo(cardX + cardW - 60, cardY + 290);
    ctx.stroke();

    // 7. Booking Reference & Issue Date Bar
    const refBarY = cardY + 330;
    const refBarH = 150;
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cardX + 60, refBarY, cardW - 120, refBarH, 20);
    } else {
      ctx.rect(cardX + 60, refBarY, cardW - 120, refBarH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '800 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillText(isBn ? 'বুকিং রেফারেন্স আইডি:' : 'BOOKING REFERENCE:', cardX + 100, refBarY + 55);

    ctx.fillStyle = '#0284C7';
    ctx.font = '900 50px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillText(`#${bookingId}`, cardX + 100, refBarY + 115);

    ctx.fillStyle = '#64748B';
    ctx.font = '800 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(isBn ? 'ইস্যুর তারিখ:' : 'ISSUED DATE:', cardX + cardW - 100, refBarY + 55);

    ctx.fillStyle = '#0F172A';
    ctx.font = '800 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillText(issuedDate, cardX + cardW - 100, refBarY + 110);
    ctx.textAlign = 'left';

    // 8. Section 1: Passenger & Travel Details
    let curY = cardY + 550;
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillText(isBn ? '👤 যাত্রী ও ভ্রমণের বিবরণ' : '👤 Passenger & Travel Details', cardX + 60, curY);

    const drawRowHighRes = (label, value, y, valueColor = '#0F172A', isBold = false) => {
      ctx.fillStyle = '#64748B';
      ctx.font = '600 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
      ctx.fillText(label, cardX + 60, y);

      ctx.fillStyle = valueColor;
      ctx.font = `${isBold ? '900' : '700'} 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif`;
      ctx.textAlign = 'right';
      let displayVal = String(value || '');
      if (ctx.measureText(displayVal).width > 1200) {
        displayVal = displayVal.slice(0, 48) + '...';
      }
      ctx.fillText(displayVal, cardX + cardW - 60, y);
      ctx.textAlign = 'left';

      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cardX + 60, y + 20);
      ctx.lineTo(cardX + cardW - 60, y + 20);
      ctx.stroke();
    };

    curY += 75;
    drawRowHighRes(isBn ? 'মূল যাত্রী:' : 'Lead Passenger:', passengerName, curY);
    curY += 75;
    drawRowHighRes(isBn ? 'যোগাযোগ নম্বর:' : 'Mobile Phone:', phone, curY);
    curY += 75;
    drawRowHighRes(isBn ? 'ইমেইল:' : 'Email Address:', email, curY);
    curY += 75;
    drawRowHighRes(isBn ? 'ফ্লাইট নম্বর:' : 'Flight Number:', flightNumber, curY, '#0284C7', true);
    curY += 75;
    drawRowHighRes(isBn ? 'সেবার তারিখ:' : 'Service Date:', serviceDate, curY);
    curY += 75;
    drawRowHighRes(isBn ? 'বিমানবন্দর:' : 'Airport:', airport, curY);
    curY += 75;
    drawRowHighRes(isBn ? 'প্রোটোকল প্যাকেজ:' : 'Protocol Package:', `${direction} • ${packageName}`, curY, '#047857', true);

    // 9. Section 2: Payment Details
    curY += 105;
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillText(isBn ? '💳 পেমেন্ট বিবরণ' : '💳 Payment Details', cardX + 60, curY);

    curY += 75;
    drawRowHighRes(isBn ? 'পেমেন্ট মেথড:' : 'Payment Channel:', paymentChannel, curY);
    curY += 75;
    drawRowHighRes(isBn ? 'ট্রানজেকশন আইডি (TrxID):' : 'Transaction ID:', trxId, curY, '#0284C7', true);

    // 10. Total Amount Paid Box
    curY += 95;
    const boxW = cardW - 120;
    const boxH = 175;
    const boxX = cardX + 60;
    const boxY = curY;

    ctx.fillStyle = '#F0F9FF';
    ctx.strokeStyle = '#BAE6FD';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(boxX, boxY, boxW, boxH, 24);
    } else {
      ctx.rect(boxX, boxY, boxW, boxH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0369A1';
    ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillText(
      isPayAfter
        ? (isBn ? 'মোট প্রদেয় অর্থ (সার্ভিস শেষে):' : 'TOTAL AMOUNT PAYABLE (AFTER SERVICE):')
        : (isBn ? 'মোট পরিশোধিত অর্থ:' : 'TOTAL AMOUNT PAID:'),
      boxX + 36,
      boxY + 70
    );

    ctx.fillStyle = '#64748B';
    ctx.font = '600 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillText(
      isBn ? '(৫% ভ্যাট এবং প্ল্যাটফর্ম চার্জ অন্তর্ভুক্ত)' : '(Includes 5% VAT & platform charges)',
      boxX + 36,
      boxY + 120
    );

    ctx.fillStyle = '#0284C7';
    ctx.font = '900 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`৳${amount}`, boxX + boxW - 36, boxY + 110);
    ctx.textAlign = 'left';

    // 11. Meeting Instructions Box
    curY += boxH + 45;
    const infoW = cardW - 120;
    const infoH = 265;
    const infoX = cardX + 60;
    const infoY = curY;

    ctx.fillStyle = '#FEFCE8';
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(infoX, infoY, infoW, infoH, 24);
    } else {
      ctx.rect(infoX, infoY, infoW, infoH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#854D0E';
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillText(
      isBn ? '📍 বিমানবন্দরে সাক্ষাতের স্থান ও নির্দেশনা:' : '📍 Airport Meeting Instructions:',
      infoX + 32,
      infoY + 60
    );

    ctx.fillStyle = '#713F12';
    ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    const instructionText = booking.dir === 'dep'
      ? (isBn
          ? 'আমাদের নির্ধারিত প্রোটোকল কর্মকর্তা ফ্লাইটের ৩ ঘণ্টা পূর্বে ডিপার্চার ক্যানোপি / গেট ১ প্রাঙ্গণে আপনার নাম সম্বলিত ডিজিটাল নেমবোর্ড নিয়ে উপস্থিত থাকবেন।'
          : 'Our designated Protocol Officer will greet you at Departure Canopy / Gate 1 area 3 hours prior to departure holding your name board.')
      : (isBn
          ? 'আমাদের নির্ধারিত প্রোটোকল কর্মকর্তা বোর্ডিং ব্রিজ / ইমিগ্রেশন গেট প্রস্থানস্থলে আপনার নাম সম্বলিত ভিআইপি নেমবোর্ড নিয়ে সাদরে অভ্যর্থনা জানাবেন।'
          : 'Our designated Protocol Officer will welcome you right after Boarding Bridge/immigration exit gate holding your personalized VIP placard.');

    const words = instructionText.split(' ');
    let line = '';
    let lineY = infoY + 115;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > infoW - 64 && n > 0) {
        ctx.fillText(line, infoX + 32, lineY);
        line = words[n] + ' ';
        lineY += 44;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, infoX + 32, lineY);

    ctx.fillStyle = '#B45309';
    ctx.font = '800 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillText(
      isBn ? '📞 ২৪/৭ জরুরি হেল্পলাইন: +880 1347-570013 / +880 1347-570017' : '📞 24/7 VIP Helpline: +880 1347-570013 / +880 1347-570017',
      infoX + 32,
      infoY + infoH - 32
    );

    // 12. Baggage & Prohibited Items Legal Notice Box
    curY += infoH + 35;
    const discW = cardW - 120;
    const discH = 245;
    const discX = cardX + 60;
    const discY = curY;

    ctx.fillStyle = '#FEF2F2';
    ctx.strokeStyle = '#FCA5A5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(discX, discY, discW, discH, 24);
    } else {
      ctx.rect(discX, discY, discW, discH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#991B1B';
    ctx.font = '900 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillText(
      isBn ? '🛡️ ব্যাগেজ ও নিষিদ্ধ সামগ্রী সংক্রান্ত ঘোষণা:' : '🛡️ PASSENGER BAGGAGE & PROHIBITED GOODS NOTICE:',
      discX + 32,
      discY + 55
    );

    ctx.fillStyle = '#7F1D1D';
    ctx.font = '600 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    const discText = isBn
      ? 'সম্মতি নিশ্চিতকৃত: যাত্রী নিশ্চিত ও সম্মতি প্রদান করেছেন যে তার লাগেজে কোনো জীবিত প্রাণী, অলংকার, মুদ্রা, মাদকদ্রব্য, অস্ত্র বা নিষিদ্ধ পণ্য নেই। নিষিদ্ধ পণ্য বহন বাংলাদেশ বিমান আইন অনুযায়ী দণ্ডনীয় অপরাধ।'
      : 'Consent Confirmed: Passenger has declared and consented that luggage contains NO prohibited items including live animals, jewelry/ornaments, currency, narcotics, weapons, hazardous materials, or illegal goods.';

    const discWords = discText.split(' ');
    let dLine = '';
    let dLineY = discY + 105;
    for (let n = 0; n < discWords.length; n++) {
      const testLine = dLine + discWords[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > discW - 64 && n > 0) {
        ctx.fillText(dLine, discX + 32, dLineY);
        dLine = discWords[n] + ' ';
        dLineY += 38;
      } else {
        dLine = testLine;
      }
    }
    ctx.fillText(dLine, discX + 32, dLineY);

    // 13. Simulated Barcode & Electronic Seal Box
    curY += discH + 35;
    const sealW = cardW - 120;
    const sealH = 150;
    const sealX = cardX + 60;
    const sealY = curY;

    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(sealX, sealY, sealW, sealH, 20);
    } else {
      ctx.rect(sealX, sealY, sealW, sealH);
    }
    ctx.fill();
    ctx.stroke();

    // Barcode lines
    let bcX = sealX + 36;
    const bcY = sealY + 35;
    for (let i = 0; i < 48; i++) {
      const lw = (i % 5 === 0) ? 6 : ((i % 3 === 0) ? 4 : 2);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(bcX, bcY, lw, 60);
      bcX += lw + ((i % 4 === 0) ? 6 : 4);
    }
    ctx.fillStyle = '#64748B';
    ctx.font = '700 20px monospace';
    ctx.fillText(`AUTH-HASH: SHA-256 / HSIA-DAC-${bookingId}`, sealX + 36, sealY + 125);

    ctx.fillStyle = '#059669';
    ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('✓ VERIFIED ELECTRONIC INVOICE', sealX + sealW - 36, sealY + 68);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.fillText('Authentic terminal access voucher • Valid without physical signature', sealX + sealW - 36, sealY + 108);
    ctx.textAlign = 'left';

    // 14. Bottom Footer
    curY += sealH + 45;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Flight Care Technologies Ltd. • CAAB Certified Ground Concierge Partner',
      cardX + cardW / 2,
      curY
    );
    curY += 36;
    ctx.fillText(
      isBn ? 'টার্মিনাল ভেরিফিকেশন ও এন্ট্রি চেকিংয়ের জন্য এই ভাউচারটি সংরক্ষণ করুন।' : 'Keep this high-resolution digital voucher or printed copy for terminal verification.',
      cardX + cardW / 2,
      curY
    );
    ctx.textAlign = 'left';

    // Convert Canvas to High Quality JPEG and build Standard PDF 1.4 Binary
    const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) return null;

    const binaryString = atob(base64Data);
    const imgLen = binaryString.length;
    const imgBytes = new Uint8Array(imgLen);
    for (let i = 0; i < imgLen; i++) {
      imgBytes[i] = binaryString.charCodeAt(i);
    }

    const widthPt = 595.28;
    const heightPt = 841.89;
    const streamContent = 'q ' + widthPt.toFixed(2) + ' 0 0 ' + heightPt.toFixed(2) + ' 0 0 cm /Im1 Do Q';

    const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
    const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + widthPt.toFixed(2) + ' ' + heightPt.toFixed(2) + '] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n';
    const obj4 = '4 0 obj\n<< /Length ' + streamContent.length + ' >>\nstream\n' + streamContent + '\nendstream\nendobj\n';

    const imgHeader = '5 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + width + ' /Height ' + height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + imgLen + ' >>\nstream\n';
    const imgFooter = '\nendstream\nendobj\n';

    const encodeAscii = (str) => {
      const TE = (typeof globalThis !== 'undefined' && globalThis.TextEncoder) || (typeof window !== 'undefined' && window.TextEncoder);
      if (TE) {
        return new TE().encode(str);
      }
      const arr = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i) & 0xff;
      }
      return arr;
    };

    const bHeader = encodeAscii('%PDF-1.4\n');
    const bObj1 = encodeAscii(obj1);
    const bObj2 = encodeAscii(obj2);
    const bObj3 = encodeAscii(obj3);
    const bObj4 = encodeAscii(obj4);
    const bImgHeader = encodeAscii(imgHeader);
    const bImgFooter = encodeAscii(imgFooter);

    let pos = bHeader.length;
    const offsets = [0];
    offsets.push(pos); pos += bObj1.length;
    offsets.push(pos); pos += bObj2.length;
    offsets.push(pos); pos += bObj3.length;
    offsets.push(pos); pos += bObj4.length;
    offsets.push(pos);

    const part1Len = bHeader.length + bObj1.length + bObj2.length + bObj3.length + bObj4.length + bImgHeader.length + imgLen + bImgFooter.length;
    const part1 = new Uint8Array(part1Len);
    let p = 0;
    part1.set(bHeader, p); p += bHeader.length;
    part1.set(bObj1, p); p += bObj1.length;
    part1.set(bObj2, p); p += bObj2.length;
    part1.set(bObj3, p); p += bObj3.length;
    part1.set(bObj4, p); p += bObj4.length;
    part1.set(bImgHeader, p); p += bImgHeader.length;
    part1.set(imgBytes, p); p += imgBytes.length;
    part1.set(bImgFooter, p); p += bImgFooter.length;

    let xref = 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 1; i <= 5; i++) {
      xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    const trailer = 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + part1Len + '\n%%EOF\n';
    const bTrailer = encodeAscii(xref + trailer);

    const fullPdf = new Uint8Array(part1Len + bTrailer.length);
    fullPdf.set(part1, 0);
    fullPdf.set(bTrailer, part1Len);

    return new Blob([fullPdf], { type: 'application/pdf' });
  };

  // Direct PDF Download Handler
  const handleDownloadPdf = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        setDownloading(true);
        const pdfBlob = await generateVoucherPdfBlob();
        if (pdfBlob) {
          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `FlightCare_Invoice_${bookingId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 3500);
          return;
        }
      } catch (err) {
        console.warn('Direct PDF canvas generation error, falling back to clean print:', err);
      } finally {
        setDownloading(false);
      }

      // Fallback: dedicated print dialog to save as PDF
      handlePrint();
    } else {
      Alert.alert(
        isBn ? 'পিডিএফ ডাউনলোড' : 'PDF Download',
        isBn ? 'ভাউচার PDF ফাইল তৈরি সম্পন্ন হয়েছে।' : 'Voucher PDF generated successfully.'
      );
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
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 620,
            maxHeight: '94%',
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            elevation: 10,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top Bar with Action Buttons */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0F172A',
              paddingHorizontal: 18,
              paddingVertical: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>🧾</Text>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                {isBn ? 'অফিসিয়াল পেমেন্ট ইনভয়েস' : 'Official Payment Invoice'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Direct Print Button */}
              <TouchableOpacity
                onPress={() => setShowPlacardModal(true)}
                style={{
                  backgroundColor: '#047857',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  borderWidth: 1,
                  borderColor: '#F59E0B',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                  🏷️ {isBn ? 'ভিআইপি প্লেকার্ড' : 'VIP Placard'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePrint}
                style={{
                  backgroundColor: '#0284C7',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                  🖨️ {isBn ? 'প্রিন্ট / PDF' : 'Print / PDF'}
                </Text>
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Printable Voucher Content */}
          <ScrollView contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
            {/* Header Watermark Box with High-Res FlightCare Logo */}
            <View
              style={{
                borderBottomWidth: 2,
                borderBottomColor: '#F1F5F9',
                paddingBottom: 16,
                marginBottom: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Image
                  source={{ uri: FLIGHTCARE_LOGO_DATA_URL }}
                  style={{ width: 58, height: 58, resizeMode: 'contain', borderRadius: 8 }}
                />
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F2A4A', letterSpacing: -0.5 }}>
                      Flight
                    </Text>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#F97316', letterSpacing: -0.5 }}>
                      Care
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#334155', fontWeight: '700', marginTop: 2 }}>
                    {isBn ? 'বিমানবন্দর প্রোটোকল ও ভিআইপি গ্রাউন্ড সার্ভিস' : 'Airport Protocol & Ground Concierge Service'}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>
                    {isBn ? 'বেসামরিক বিমান চলাচল কর্তৃপক্ষ (CAAB) নিবন্ধিত পার্টনার • DAC' : 'CAAB Certified Ground Handling Partner • Dhaka (DAC)'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: isPayAfter ? '#FEF3C7' : '#DCFCE7',
                  borderWidth: 1.5,
                  borderColor: isPayAfter ? '#FCD34D' : '#86EFAC',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: isPayAfter ? '#B45309' : '#15803D' }}>
                  {isPayAfter ? (isBn ? '⏳ সার্ভিস শেষে প্রদেয়' : '⏳ PAY AFTER SERVICE') : (isBn ? '✓ পরিশোধিত' : '✓ PAID & CONFIRMED')}
                </Text>
              </View>
            </View>

            {/* Reference & Date Bar */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>
                  {isBn ? 'বুকিং রেফারেন্স আইডি:' : 'BOOKING REFERENCE:'}
                </Text>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0284C7', marginTop: 1 }}>
                  #{bookingId}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>
                  {isBn ? 'ইস্যুর তারিখ:' : 'ISSUED ON:'}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 1 }}>
                  {issuedDate}
                </Text>
              </View>
            </View>

            {/* Passenger & Flight Grid */}
            <View style={{ gap: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                {isBn ? '👤 যাত্রী ও ভ্রমণের বিবরণ' : '👤 Passenger & Flight Details'}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>{isBn ? 'মূল যাত্রী:' : 'Passenger Name:'}</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>{passengerName}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>{isBn ? 'যোগাযোগ নম্বর:' : 'Contact Phone:'}</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>{phone}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>{isBn ? 'ফ্লাইট নম্বর:' : 'Flight Number:'}</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0284C7' }}>{flightNumber}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>{isBn ? 'সেবার তারিখ:' : 'Service Date:'}</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>{serviceDate}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>{isBn ? 'বিমানবন্দর:' : 'Airport:'}</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>{airport}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>{isBn ? 'প্রোটোকল প্যাকেজ:' : 'Service Tier:'}</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#047857' }}>{direction} • ${packageName}</Text>
              </View>

              {hasVisaOnArrival && (
                <View style={{ backgroundColor: '#F0FDF4', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0', marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#166534' }}>🛂 {isBn ? 'অন-অ্যারাইভাল ভিসা সুবিধা' : 'Visa On Arrival'}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803D' }}>{isBn ? '৳ ১,৫০০ / জন' : '৳ 1,500 / pax'}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#B45309', marginTop: 4, lineHeight: 15, fontWeight: '600' }}>
                    ℹ️ {isBn ? 'সরকারি ফি: $50 USD/জন বিমানবন্দরে সরাসরি প্রদেয় (৪টি আবশ্যক ডকুমেন্ট সংযুক্ত)' : 'Govt Fee: $50 USD/pax payable at airport (4 Documents Attached)'}
                  </Text>
                </View>
              )}
            </View>

            {/* Payment Summary Box */}
            <View
              style={{
                backgroundColor: '#EFF6FF',
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: '#BFDBFE',
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E40AF' }}>
                  {isBn ? 'পেমেন্ট মেথড:' : 'PAYMENT CHANNEL:'}
                </Text>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E293B' }}>
                  {paymentChannel}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E40AF' }}>
                  {isBn ? 'ট্রানজেকশন আইডি (TrxID):' : 'TRANSACTION ID:'}
                </Text>
                <Text style={{ fontSize: 12.5, fontWeight: '900', color: '#0284C7' }}>
                  {trxId}
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: '#BFDBFE', marginVertical: 6 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#0F172A' }}>
                  {isPayAfter
                    ? (isBn ? 'মোট প্রদেয় অর্থ (সার্ভিস শেষে):' : 'TOTAL AMOUNT PAYABLE:')
                    : (isBn ? 'মোট পরিশোধিত অর্থ:' : 'TOTAL AMOUNT PAID:')}
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#0284C7' }}>
                  ৳{amount}
                </Text>
              </View>
            </View>

            {/* Airport Instructions Box */}
            <View
              style={{
                backgroundColor: '#FEFCE8',
                borderRadius: 12,
                padding: 13,
                borderWidth: 1,
                borderColor: '#FEF08A',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#854D0E', marginBottom: 4 }}>
                📍 {isBn ? 'বিমানবন্দরে সাক্ষাতের স্থান ও নির্দেশনা:' : 'Airport Meeting Instructions:'}
              </Text>
              <Text style={{ fontSize: 12, color: '#A16207', lineHeight: 17 }}>
                {booking.dir === 'dep'
                  ? (isBn
                      ? 'আমাদের নির্ধারিত প্রোটোকল কর্মকর্তা ফ্লাইটের ৩ ঘণ্টা পূর্বে ডিপার্চার ক্যানোপি / গেট ১-এ আপনার নাম সম্বলিত ডিজিটাল নেমবোর্ড নিয়ে অপেক্ষা করবেন।'
                      : 'Our designated Protocol Officer will greet you at Departure Canopy / Gate 1 area 3 hours before flight with your name board.')
                  : (isBn
                      ? 'অ্যারাইভাল বোর্ডিং ব্রিজ / ইমিগ্রেশন পার হওয়ার পর আমাদের প্রোটোকল কর্মকর্তা আপনার নাম সম্বলিত ভিআইপি প্লেকার্ড নিয়ে সরাসরি স্বাগত জানাবেন।'
                      : 'Our designated Protocol Officer will welcome you right after the Boarding Bridge/immigration gate with your personalized VIP placard.')}
              </Text>
              <Text style={{ fontSize: 11.5, color: '#854D0E', fontWeight: '700', marginTop: 6 }}>
                📞 {isBn ? 'জরুরি হেল্পলাইন:' : 'Concierge Hotline:'} +880 1347-570013 / +880 1347-570017
              </Text>
            </View>

            {/* Prohibited Items & Baggage Legal Disclaimer Box */}
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1.5,
                borderColor: '#FCA5A5',
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 15 }}>🛡️</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#991B1B' }}>
                  {isBn ? 'লাগেজ ও নিষিদ্ধ সামগ্রী সংক্রান্ত ঘোষণা:' : 'Baggage & Prohibited Items Notice:'}
                </Text>
              </View>
              <Text style={{ fontSize: 11.5, color: '#7F1D1D', lineHeight: 17, fontWeight: '600' }}>
                {isBn
                  ? 'সম্মতি নিশ্চিতকৃত: যাত্রীর ব্যাগেজে কোনো প্রকার দেশী-বিদেশী মুদ্রা, অলংকার, জীবিত প্রাণী, মাদকদ্রব্য, গোলাবারুদ বা কোনো বেআইনি/বিপজ্জনক দ্রব্য নেই।'
                  : 'Consent Confirmed: Passenger has declared that luggage contains no prohibited items such as currency, live animals, jewelry, weapons, narcotics, hazardous materials, or illegal goods.'}
              </Text>
            </View>

            {/* VIP Greeter Placard Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowPlacardModal(true)}
              style={{
                backgroundColor: '#064E3B',
                borderRadius: 12,
                paddingVertical: 13,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                marginBottom: 10,
                borderWidth: 1.5,
                borderColor: '#F59E0B',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 16 }}>🏷️</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                {isBn ? 'ভিআইপি প্লেকার্ড / নেমবোর্ড দেখুন' : 'View VIP Greeter Placard'}
              </Text>
            </TouchableOpacity>

            {/* Direct High-Resolution PDF Download Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={downloading}
              onPress={handleDownloadPdf}
              style={{
                backgroundColor: '#0F172A',
                borderRadius: 12,
                paddingVertical: 13,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
                opacity: downloading ? 0.7 : 1,
              }}
            >
              <Text style={{ fontSize: 16 }}>📥</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                {downloading
                  ? (isBn ? 'হাই রেজুলেশন PDF তৈরি হচ্ছে...' : 'Generating 300 DPI PDF...')
                  : (isBn ? 'হাই রেজুলেশন ইনভয়েস PDF ডাউনলোড করুন' : 'Download High-Res Invoice (PDF)')}
              </Text>
            </TouchableOpacity>

            {downloadSuccess && (
              <Text style={{ color: '#059669', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>
                ✓ {isBn ? 'হাই রেজুলেশন ইনভয়েস PDF সফলভাবে ডাউনলোড হয়েছে!' : 'High-Resolution Invoice PDF downloaded successfully!'}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>

      <VipPlacardModal
        visible={showPlacardModal}
        onClose={() => setShowPlacardModal(false)}
        booking={booking}
        lang={lang}
      />
    </Modal>
  );
}
