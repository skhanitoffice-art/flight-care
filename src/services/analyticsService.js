/**
 * Flight Care - Privacy-Compliant Google Analytics 4 (GA4) Tracking Service
 * Follows SEO Audit Guidelines:
 * - Tracks Form Start, Booking Submit, Booking Confirmed, Call Click, WhatsApp Click
 * - ZERO Sensitive PII: Strictly NO Passport, NO National ID, NO Plain Contact details sent to GA4.
 */

import { Platform } from 'react-native';

const GA_MEASUREMENT_ID = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GA_MEASUREMENT_ID) || 'G-FLIGHTCARE1';

export const trackEvent = (eventName, params = {}) => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Clean params: ensure NO sensitive PII is ever transmitted
      const safeParams = {};
      const forbiddenKeys = ['passport', 'passNumber', 'nid', 'nationalId', 'email', 'phone', 'passengerPhone'];

      for (const [key, value] of Object.entries(params)) {
        if (!forbiddenKeys.some(fb => key.toLowerCase().includes(fb.toLowerCase()))) {
          safeParams[key] = value;
        }
      }

      // 1. Google Analytics gtag()
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, safeParams);
      }

      // 2. dataLayer fallback
      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push({
          event: eventName,
          ...safeParams
        });
      }
    }
  } catch (e) {
    // Fail silently in production to never break user booking experience
  }
};

export const trackFormStart = (serviceType = 'meet_and_greet') => {
  trackEvent('booking_form_start', {
    service_type: serviceType,
    page_location: typeof window !== 'undefined' ? window.location.href : 'flightcaresbd.com'
  });
};

export const trackBookingSubmit = (serviceType = 'meet_and_greet', step = 'payment') => {
  trackEvent('booking_submit', {
    service_type: serviceType,
    booking_step: step
  });
};

export const trackBookingSuccess = (bookingData = {}) => {
  const safeData = {
    transaction_id: bookingData.id || bookingData.bookingCode || 'BOOKING',
    value: Number(bookingData.amount || bookingData.totalAmount || 0),
    currency: 'BDT',
    package_name: bookingData.packageChoice || bookingData.pkg?.id || 'standard',
    passenger_count: Number(bookingData.passengers || bookingData.passengerCount || 1)
  };
  // Trigger both GA4 canonical conversion events
  trackEvent('booking_confirmed', safeData);
  trackEvent('booking_submit_success', safeData);
};

export const trackCallClick = (phoneNumber = '+8801347570000') => {
  trackEvent('phone_call_click', {
    phone_number: phoneNumber,
    source: 'web_cta'
  });
  trackEvent('call_hotline_click', {
    phone_number: phoneNumber,
    source: 'web_cta'
  });
};

export const trackWhatsAppClick = (targetNumber = '8801347570001', label = 'FrontDesk') => {
  trackEvent('whatsapp_click', {
    target_number: targetNumber,
    contact_label: label
  });
};
