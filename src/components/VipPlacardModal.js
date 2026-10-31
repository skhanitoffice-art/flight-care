import { formatPlacardDate } from '../services/placardService';
// src/components/VipPlacardModal.js
// Flight Care Enterprise - VIP Airport Protocol Placard / Greeter Nameboard Modal

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';

const PLACARD_TEMPLATE_IMAGE = require('../../assets/placard_template.png');
const PLACARD_PLANE_ICON = require('../../assets/placard_plane_icon.png');
const PLACARD_CAL_ICON = require('../../assets/placard_cal_icon.png');

export default function VipPlacardModal({
  visible,
  onClose,
  booking,
  lang = 0,
}) {
  const isBn = Boolean(lang);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!visible || !booking) return null;

  // 1. Extract and Format Passenger Name
  const rawName = (booking.passengerName || booking.name || (isBn ? 'সম্মানিত যাত্রী' : 'VALUED PASSENGER')).trim();
  let formattedName = rawName.toUpperCase();
  const lowerName = rawName.toLowerCase();
  if (
    !lowerName.startsWith('mr.') &&
    !lowerName.startsWith('mr ') &&
    !lowerName.startsWith('mrs.') &&
    !lowerName.startsWith('ms.') &&
    !lowerName.startsWith('md.') &&
    !lowerName.startsWith('md ') &&
    !lowerName.startsWith('dr.') &&
    !lowerName.startsWith('engr.') &&
    !lowerName.startsWith('barrister') &&
    !lowerName.startsWith('advocate') &&
    !lowerName.startsWith('begum')
  ) {
    formattedName = `MR. ${formattedName}`;
  }

  // 2. Extract and Format Flight Number
  const rawFlight = booking.flight?.number || booking.flightNumber || booking.fno || 'EK 582';
  const cleanFlight = String(rawFlight).replace(/^FLIGHT[:\s]*/i, '').trim().toUpperCase();

  // 3. Extract and Format Service Date (Exact DD-MM-YYYY e.g. 29-10-2026)
  const rawDate = booking.flightDate || booking.serviceDate || booking.date || booking.flight_date || '';
  const formattedDate = formatPlacardDate(rawDate);

  // Responsive Placard Sizing
  const isMobile = windowWidth < 768;
  const cardMaxWidth = isFullscreen ? windowWidth : Math.min(windowWidth - 32, 880);
  const cardMaxHeight = isFullscreen ? windowHeight : windowHeight * 0.75;

  // 1024 x 724 aspect ratio = ~1.414 (standard A4 landscape)
  let cardWidth = cardMaxWidth;
  let cardHeight = cardWidth * (724 / 1024);
  if (cardHeight > cardMaxHeight) {
    cardHeight = cardMaxHeight;
    cardWidth = cardHeight * (1024 / 724);
  }

  // Dynamic Font Sizing - Maximize Passenger Name Scale to match reference artwork
  const scaleRatio = cardWidth / 1024;
  let baseNameSize = Math.round(138 * scaleRatio); // ~118px on desktop (880w), ~50px on mobile
  if (formattedName.length > 25) {
    baseNameSize = Math.round(baseNameSize * 0.58);
  } else if (formattedName.length > 20) {
    baseNameSize = Math.round(baseNameSize * 0.70);
  } else if (formattedName.length > 15) {
    baseNameSize = Math.round(baseNameSize * 0.84);
  }
  const nameFontSize = Math.max(22, baseNameSize);
  const flightFontSize = Math.max(12, Math.min(26, Math.round(cardWidth * 0.029)));

  // Generate High-Res Canvas Image for Download
  const handleDownloadPlacard = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 724;
        const ctx = canvas.getContext('2d');

        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = '/placard_template.png';

        const renderCanvas = () => {
          ctx.drawImage(img, 0, 0, 1024, 724);

          // 1. Draw Passenger Name - Maximum Large Scale matching reference design
          ctx.fillStyle = '#012B14';
          let canvasNameSize = 138;
          ctx.font = `900 ${canvasNameSize}px 'Impact', 'Montserrat', 'Arial Black', sans-serif`;
          const maxNameWidth = 940;
          const measuredW = ctx.measureText(formattedName).width;
          if (measuredW > maxNameWidth) {
            canvasNameSize = Math.floor(canvasNameSize * (maxNameWidth / measuredW));
          }
          canvasNameSize = Math.max(50, canvasNameSize);
          ctx.font = `900 ${canvasNameSize}px 'Impact', 'Montserrat', 'Arial Black', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(formattedName, 512, 382);

          // 2. Draw Center Gold Divider Line at x=512
          ctx.fillStyle = '#CAA048';
          ctx.fillRect(511, 458, 2, 54);

          // 3. Draw Flight & Date Info with Icons
          const planeImg = new window.Image();
          planeImg.crossOrigin = 'anonymous';
          planeImg.src = '/placard_plane_icon.png';

          const calImg = new window.Image();
          calImg.crossOrigin = 'anonymous';
          calImg.src = '/placard_cal_icon.png';

          const drawFinal = () => {
            // Left: Plane Icon + FLIGHT: + flight number
            try {
              ctx.drawImage(planeImg, 215, 465, 46, 36);
            } catch {}
            ctx.textAlign = 'left';
            ctx.fillStyle = '#012B14';
            ctx.font = `800 13px sans-serif`;
            ctx.fillText('FLIGHT:', 275, 466);
            ctx.fillStyle = '#012B14';
            ctx.font = `900 30px 'Impact', 'Arial Black', 'Montserrat', sans-serif`;
            ctx.fillText(cleanFlight, 275, 502);

            // Right: Calendar Icon + DATE: + date text
            try {
              ctx.drawImage(calImg, 535, 463, 34, 38);
            } catch {}
            ctx.textAlign = 'left';
            ctx.fillStyle = '#012B14';
            ctx.font = `800 13px sans-serif`;
            ctx.fillText('DATE:', 585, 466);
            ctx.fillStyle = '#012B14';
            ctx.font = `900 29px 'Impact', 'Arial Black', 'Montserrat', sans-serif`;
            ctx.fillText(formattedDate, 585, 502);

            // 4. Trigger Instant Download
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const safeName = formattedName.replace(/[^a-zA-Z0-9]/g, '_');
            link.download = `FlightCare_Placard_${cleanFlight}_${safeName}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setDownloadSuccess(true);
            setTimeout(() => setDownloadSuccess(false), 3000);
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
        console.warn('Placard download notice:', err);
      }
    }
  };

  // High-Resolution Print Window with CSS A4 Landscape
  const handlePrintPlacard = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
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
                top: 52.8%;
                left: 3%;
                width: 94%;
                text-align: center;
                transform: translateY(-50%);
                font-family: 'Impact', 'Montserrat', 'Arial Black', sans-serif;
                font-size: ${formattedName.length > 25 ? '78px' : formattedName.length > 20 ? '96px' : formattedName.length > 15 ? '116px' : '138px'};
                font-weight: 900;
                color: #012B14;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                white-space: nowrap;
              }
              .flight-date-overlay {
                position: absolute;
                top: 67%;
                left: 6%;
                width: 88%;
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
              .info-icon {
                height: 38px;
                object-fit: contain;
              }
              .info-text {
                display: flex;
                flex-direction: column;
                text-align: left;
              }
              .info-label {
                font-family: sans-serif;
                font-size: 13px;
                font-weight: 800;
                color: #012B14;
                letter-spacing: 0.8px;
              }
              .info-val {
                font-family: 'Impact', 'Arial Black', 'Montserrat', sans-serif;
                font-size: 30px;
                font-weight: 900;
                color: #012B14;
                letter-spacing: 0.5px;
              }
              .gold-divider-bar {
                width: 2px;
                height: 48px;
                background-color: #CAA048;
                margin: 0 24px;
              }
            </style>
          </head>
          <body>
            <div class="placard-container">
              <img src="/placard_template.png" class="bg-image" onload="window.print(); setTimeout(() => window.close(), 1000);" />
              <div class="name-overlay">${formattedName}</div>
              <div class="flight-date-overlay">
                <div class="info-group">
                  <img src="/placard_plane_icon.png" class="info-icon" />
                  <div class="info-text">
                    <span class="info-label">FLIGHT:</span>
                    <span class="info-val">${cleanFlight}</span>
                  </div>
                </div>
                <div class="gold-divider-bar"></div>
                <div class="info-group">
                  <img src="/placard_cal_icon.png" class="info-icon" />
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
      } catch (err) {
        console.warn('Print error:', err);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: isFullscreen ? '#020617' : 'rgba(15, 23, 42, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: isFullscreen ? 0 : 16,
        }}
      >
        {/* Fullscreen Overlay Header / Controls */}
        {!isFullscreen && (
          <View
            style={{
              width: '100%',
              maxWidth: cardMaxWidth,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: '#FEF3C7',
                  borderWidth: 1.5,
                  borderColor: '#F59E0B',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 20 }}>🏷️</Text>
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>
                  {isBn ? 'ভিআইপি এয়ারপোর্ট প্লেকার্ড / নেমবোর্ড' : 'VIP Airport Greeter Placard'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#94A3B8' }}>
                  {isBn
                    ? 'বোর্ডিং ব্রিজ ও অ্যারাইভাল গেটে যাত্রীকে রিসিভ করার অফিশিয়াল সাইন'
                    : 'Official meet & greet sign for Boarding Bridge & arrival gates'}
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* The Exact Placard Card Container */}
        <View
          style={{
            width: cardWidth,
            height: cardHeight,
            position: 'relative',
            backgroundColor: '#FFFFFF',
            borderRadius: isFullscreen ? 0 : 8,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            elevation: 10,
          }}
        >
          {/* Base Designer Artwork (Logo, Welcome to Bangladesh, Water Lily, Monument, Ribbons) */}
          <Image
            source={PLACARD_TEMPLATE_IMAGE}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            resizeMode="contain"
          />

          {/* Dynamic Passenger Name Overlay - Maximum Bold Condensed Scale */}
          <View
            style={{
              position: 'absolute',
              top: '52.8%',
              left: '3%',
              right: '3%',
              transform: [{ translateY: -nameFontSize * 0.52 }],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
              style={{
                color: '#012B14',
                fontSize: nameFontSize,
                fontWeight: '900',
                fontFamily: Platform.select({
                  web: "'Impact', 'Montserrat', 'Arial Black', sans-serif",
                  default: 'sans-serif',
                }),
                textAlign: 'center',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {formattedName}
            </Text>
          </View>

          {/* Dynamic Flight Number & Date Section Overlay */}
          <View
            style={{
              position: 'absolute',
              top: '67%',
              left: '6%',
              right: '6%',
              transform: [{ translateY: -flightFontSize }],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Flight Block */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.max(6, Math.round(cardWidth * 0.012)) }}>
              <Image
                source={PLACARD_PLANE_ICON}
                style={{
                  width: Math.max(22, Math.round(cardWidth * 0.045)),
                  height: Math.max(17, Math.round(cardWidth * 0.045 * (58 / 75))),
                  resizeMode: 'contain',
                }}
              />
              <View>
                <Text
                  style={{
                    color: '#012B14',
                    fontSize: Math.max(9, Math.round(cardWidth * 0.013)),
                    fontWeight: '800',
                    letterSpacing: 0.8,
                  }}
                >
                  FLIGHT:
                </Text>
                <Text
                  style={{
                    color: '#012B14',
                    fontSize: Math.max(13, Math.round(cardWidth * 0.03)),
                    fontWeight: '900',
                    fontFamily: Platform.select({
                      web: "'Impact', 'Arial Black', 'Montserrat', sans-serif",
                      default: 'sans-serif',
                    }),
                    letterSpacing: 0.5,
                  }}
                >
                  {cleanFlight}
                </Text>
              </View>
            </View>

            {/* Vertical Gold Divider Bar */}
            <View
              style={{
                width: 2,
                height: Math.max(26, Math.round(cardWidth * 0.048)),
                backgroundColor: '#CAA048',
                marginHorizontal: Math.max(12, Math.round(cardWidth * 0.024)),
              }}
            />

            {/* Date Block */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.max(6, Math.round(cardWidth * 0.012)) }}>
              <Image
                source={PLACARD_CAL_ICON}
                style={{
                  width: Math.max(18, Math.round(cardWidth * 0.035)),
                  height: Math.max(20, Math.round(cardWidth * 0.035 * (58 / 52))),
                  resizeMode: 'contain',
                }}
              />
              <View>
                <Text
                  style={{
                    color: '#012B14',
                    fontSize: Math.max(9, Math.round(cardWidth * 0.013)),
                    fontWeight: '800',
                    letterSpacing: 0.8,
                  }}
                >
                  DATE:
                </Text>
                <Text
                  style={{
                    color: '#012B14',
                    fontSize: Math.max(13, Math.round(cardWidth * 0.029)),
                    fontWeight: '900',
                    fontFamily: Platform.select({
                      web: "'Impact', 'Arial Black', 'Montserrat', sans-serif",
                      default: 'sans-serif',
                    }),
                    letterSpacing: 0.5,
                  }}
                >
                  {formattedDate}
                </Text>
              </View>
            </View>
          </View>

          {/* Exit Fullscreen Float Button */}
          {isFullscreen && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsFullscreen(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                zIndex: 99,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>✕ {isBn ? 'ফুলস্ক্রিন বন্ধ' : 'Exit Fullscreen'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Toolbar Below Placard */}
        {!isFullscreen && (
          <View
            style={{
              width: '100%',
              maxWidth: cardMaxWidth,
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              marginTop: 14,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 8, width: isMobile ? '100%' : 'auto' }}>
              {/* Fullscreen Mode Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setIsFullscreen(true)}
                style={{
                  flex: isMobile ? 1 : 0,
                  backgroundColor: '#0284C7',
                  paddingHorizontal: 16,
                  height: 44,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 16 }}>📱</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  {isBn ? 'ফুল স্ক্রিন মোড' : 'Fullscreen'}
                </Text>
              </TouchableOpacity>

              {/* Print Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePrintPlacard}
                style={{
                  flex: isMobile ? 1 : 0,
                  backgroundColor: '#0F172A',
                  paddingHorizontal: 16,
                  height: 44,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
              >
                <Text style={{ fontSize: 16 }}>🖨️</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  {isBn ? 'প্রিন্ট করুন' : 'Print Placard'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Download HD Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleDownloadPlacard}
              style={{
                width: isMobile ? '100%' : 'auto',
                backgroundColor: downloadSuccess ? '#059669' : '#047857',
                paddingHorizontal: 20,
                height: 44,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 16 }}>{downloadSuccess ? '✓' : '⬇️'}</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                {downloadSuccess
                  ? (isBn ? 'ডাউনলোড সম্পন্ন!' : 'Downloaded!')
                  : (isBn ? 'এইচডি প্লেকার্ড ডাউনলোড' : 'Download HD Placard')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
