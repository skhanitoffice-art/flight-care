import { DEFAULT_BOOKING_WORKFLOW, ADDONS, DEFAULT_PRICING_CONFIG, VISA_ON_ARRIVAL_DOCUMENTS } from '../constants/data';

export const bilingual = value => (
  Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value, value]
      : [value?.en || '', value?.bn || value?.en || '']
);

export const convertBnDigitsToEn = value =>
  String(value || '').replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));

export const isValidPassengerName = value => {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (trimmed.length < 2) return false;
  // Strictly reject numbers and special symbols (e.g. John123#, Alex@, etc.)
  if (/[0-9!@#$%^&*()_+=\[\]{};:"\\|<>/?~`€£¥₹]/.test(trimmed)) return false;
  // Allow Unicode letters (English, Bengali, etc.), spaces, dots, hyphens, and apostrophes
  return /^[\p{L}\s.'-]+$/u.test(trimmed);
};

export const extractLocalPhoneDigits = (fullPhone, countryCode = '+880') => {
  if (!fullPhone) return '';
  let str = convertBnDigitsToEn(String(fullPhone))
    .replace(/undefined/gi, '')
    .replace(/null/gi, '')
    .trim();
  const cleanCC = (countryCode || '+880').replace(/\D/g, '');
  if (cleanCC) {
    str = str.replace(new RegExp(`^(?:\\+?${cleanCC}|00${cleanCC})\\s*`, 'i'), '');
  }
  const escapedCC = (countryCode || '+880').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  str = str.replace(new RegExp(`^${escapedCC}\\s*`, 'i'), '');
  return str.replace(/\D/g, '');
};

export const sanitizePhoneNumber = (value, countryCode = '+880') => {
  if (!value) return '';
  let str = convertBnDigitsToEn(String(value))
    .replace(/undefined/gi, '')
    .replace(/null/gi, '')
    .trim();
  const ccStr = (countryCode || '').replace(/\D/g, '');
  if (ccStr) {
    str = str.replace(new RegExp(`^(?:\\+?${ccStr}|00${ccStr})\\s*`, 'i'), '');
  }
  // Strip leading 0s (e.g. 01712... becomes 1712...)
  str = str.replace(/^0+/, '');
  // Keep only digits
  return str.replace(/\D/g, '');
};

export const isValidMobileNumber = value => {
  if (!value) return false;
  const str = String(value).replace(/undefined/gi, '').replace(/null/gi, '').trim();
  const normalized = convertBnDigitsToEn(str);
  if (/[a-zA-Z\u0980-\u09E5\u09F0-\u09FF]/.test(normalized)) return false;
  if (!/^\+?[0-9\s()-]+$/.test(normalized)) return false;
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

export const isValidEmailAddress = value => {
  if (!value) return false;
  const trimmed = String(value).trim();
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(trimmed);
};
export const isValidEmail = isValidEmailAddress;

export const isValidFlightNumber = value => {
  if (!value) return false;
  const cleaned = String(value).trim();
  return /^(?:[A-Za-z]{2,3}|[A-Za-z][0-9]|[0-9][A-Za-z])[\s-]?[0-9]{1,4}$/i.test(cleaned);
};

export const isValidPassportNumber = value => {
  if (!value) return true;
  const cleaned = String(value).trim().replace(/[\s-]+/g, '');
  if (!cleaned) return true;
  return /^[A-Za-z0-9]{5,15}$/.test(cleaned);
};

export const isValidTicketOrPnr = value => {
  if (!value) return true;
  const cleaned = String(value).trim().replace(/[\s-]+/g, '');
  if (!cleaned) return true;
  return /^[A-Za-z0-9-]{5,20}$/.test(cleaned);
};

export const normalizeService = service => {
  const id = service.id ?? service.slug;
  if (!id) return null;
  const category = String(service.category || service.type || service.cat || '').toLowerCase();
  const steps = service.steps || service.operational_steps || service.s || [];
  return {
    id: String(id),
    cat: category === 'arr' || category.startsWith('arrival') ? 'arr' : (category === 'transit' ? 'transit' : 'dep'),
    ic: service.icon || service.emoji || service.ic || '✈️',
    n: bilingual(service.name || service.title || service.n),
    d: bilingual(service.description || service.d),
    s: steps.map(step => bilingual(step.label || step.name || step)),
    serviceCategory: service.serviceCategory || service.service_category || (
      String(id).includes('wheel') || String(id).includes('medical')
        ? 'special_care'
        : String(id).includes('wrap')
        ? 'baggage_porter'
        : String(id).includes('pickup')
        ? 'transport'
        : String(id).includes('fast')
        ? 'fast_track'
        : String(id).includes('lounge') || String(id).includes('cip')
        ? 'vip_lounge'
        : 'meet_greet'
    ),
    availability: service.availability || {
      airports: ['ALL'],
      hours: '24/7',
      leadTime: 'Instant',
      terminals: ['ALL'],
    },
  };
};

export const normalizeManagerService = (service, index) => {
  const normalized = normalizeService(service);
  if (!normalized) return null;
  return {
    key: String(service.id ?? service.slug ?? service.key ?? `service-${index}`),
    ...normalized,
    active: service.active !== false && service.is_active !== false,
    serviceCategory: service.serviceCategory || service.service_category || normalized.serviceCategory || 'meet_greet',
    availability: service.availability || normalized.availability || {
      airports: ['ALL'],
      hours: '24/7',
      leadTime: 'Instant',
      terminals: ['ALL'],
    },
  };
};

export const normalizeCustomerBooking = booking => {
  const payment = booking.payment || booking.latest_payment || booking.payments?.[0] || {};
  const id = booking.id ?? booking.booking_id;
  const status = String(booking.status ?? booking.booking_status ?? 'pending').toLowerCase();
  const refundStatus = String(booking.refund_status ?? payment.refund_status ?? '').toLowerCase();
  const rawPaymentStatus = String(booking.payment_status ?? booking.paymentStatus ?? payment.status ?? 'pending').toLowerCase();
  return {
    ...booking,
    id: String(id),
    status,
    paymentStatus: ['refunded', 'partially_refunded'].includes(refundStatus) ? refundStatus : rawPaymentStatus,
    refundStatus,
    amount: booking.amount ?? booking.total_amount ?? payment.amount ?? null,
    paymentRecordId: booking.payment_record_id ?? payment.id ?? payment.reference ?? null,
    paymentId: booking.payment_id ?? payment.payment_id ?? booking.paymentId ?? null,
    paymentUrl: booking.payment_url ?? booking.paymentUrl ?? null,
    workflow: booking.status_workflow || booking.workflow || null,
    statusHistory: booking.status_history || booking.statusHistory || [],
    cancelled: booking.cancelled === true || status === 'cancelled',
  };
};

export const classifyNotification = value => {
  const type = String(value || '').toLowerCase().replace(/[- ]/g, '_');
  if (type.includes('promotion') || type.includes('promo') || type.includes('marketing')) return 'promotion';
  if (type.includes('announcement') || type.includes('important')) return 'announcement';
  if (type.includes('payment') || type.includes('refund')) return 'payment';
  if (type.includes('service') || type.includes('staff') || type.includes('assignment')) return 'service';
  if (type.includes('booking') || type.includes('cancel')) return 'booking';
  return 'announcement';
};

export const normalizeCustomerNotification = notification => ({
  ...notification,
  id: String(notification.id ?? notification.notification_id ?? `notification-${Date.now()}`),
  title: bilingual(notification.title || notification.subject || ''),
  body: bilingual(notification.body || notification.message || notification.description || ''),
  read: notification.read === true || notification.is_read === true || Boolean(notification.read_at),
  channels: notification.channels || notification.delivery_channels || [],
  category: classifyNotification(notification.category || notification.type || notification.event_type),
  source: 'server',
});

export const normalizeWorkflowStages = stages => (Array.isArray(stages) ? stages : []).map((stage, index) => ({
  key: String(stage.key ?? stage.status ?? `stage-${index}`).trim().toLowerCase(),
  label: bilingual(stage.label || stage.name || stage.key || stage.status || ''),
  bucket: ['completed', 'cancelled'].includes(stage.bucket) ? stage.bucket : 'upcoming',
})).filter(stage => stage.key);

export const canonicalBookingStatus = status => {
  const normalized = String(status || '').toLowerCase().replace(/-/g, '_');
  if (['pending', 'pending_payment'].includes(normalized)) return 'payment_pending';
  if (['paid', 'booking_confirmed'].includes(normalized)) return 'confirmed';
  if (['assigned'].includes(normalized)) return 'staff_assigned';
  if (['in_progress', 'service_in_progress'].includes(normalized)) return 'service_started';
  if (['complete', 'service_completed'].includes(normalized)) return 'completed';
  if (normalized === 'canceled') return 'cancelled';
  return normalized;
};

export const bookingWorkflowBucket = (booking, fallbackWorkflow) => {
  const status = canonicalBookingStatus(booking.status);
  if (booking.cancelled === true || status === 'cancelled' || status === 'canceled') return 'cancelled';
  const workflow = normalizeWorkflowStages(booking.workflow).length ? normalizeWorkflowStages(booking.workflow) : fallbackWorkflow || DEFAULT_BOOKING_WORKFLOW;
  const stage = workflow.find(item => item.key === status);
  if (stage) return stage.bucket;
  if (['completed', 'complete', 'service_completed'].includes(status) || booking.status === 4) return 'completed';
  return 'upcoming';
};

export const isBookingCompleted = (booking, workflow) => bookingWorkflowBucket(booking, workflow) === 'completed';

export const isBookingCancelled = booking => booking.cancelled === true || ['cancelled', 'canceled'].includes(String(booking.status || '').toLowerCase());

export const isPastFlightDate = value => {
  if (!value) return false;
  const normalized = convertBnDigitsToEn(String(value).trim()).replace(/\//g, '-');
  const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(normalized);
  if (match) {
    const [, day, month, year] = match.map(Number);
    const date = new Date(year, month - 1, day, 23, 59, 59);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }
  return false;
};

export const isValidFlightDate = (value, allowPast = false) => {
  if (!value) return false;
  const normalized = convertBnDigitsToEn(String(value).trim()).replace(/\//g, '-');
  const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(normalized);
  if (match) {
    const [, day, month, year] = match.map(Number);
    if (year < 2024 || year > 2040) return false;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return false;
    }
    if (!allowPast) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return false;
    }
    return true;
  }
  const parsed = Date.parse(value);
  if (isNaN(parsed)) return false;
  if (!allowPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(parsed) < today) return false;
  }
  return true;
};

export const isValidFlightTime = value => {
  if (!value) return false;
  const normalized = convertBnDigitsToEn(String(value).trim());
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalized);
};

export const parsePickerDate = (value, mode) => {
  const now = new Date();
  if (mode === 'time') {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    if (match) now.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return now;
  }
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return now;
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
};

export const formatPickerDate = (date, mode) => mode === 'time'
  ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  : `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;

export const toWebDateValue = value => {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
};

export const fromWebDateValue = value => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
};

export const buildPassengerDetails = (counts, existing = []) => [
  ['adult', counts.a, 1], ['child', counts.c, 0], ['elderly', counts.e, 0],
].flatMap(([type, count, primaryCount]) => Array.from({ length: Math.max(0, count - primaryCount) }, (_, index) => {
  const id = `${type}-${index + primaryCount + 1}`;
  return existing.find(passenger => passenger.id === id) || { id, type, name: '', assistanceNotes: '' };
}));

export const buildStaffingContext = wizard => ({
  airport_code: wizard.airport,
  service_id: wizard.svc?.id || null,
  service_category: wizard.dir === 'arr' ? 'arrival' : 'departure',
  service_type: wizard.dir === 'arr' ? 'arrival_protocol' : 'departure_protocol',
  passenger_count: { adults: wizard.a, children: wizard.c, elderly: wizard.e, total: wizard.a + wizard.c + wizard.e },
  special_assistance: {
    wheelchair: wizard.svc?.id === 'wheel' || wizard.addons.includes('wheel'),
    medical: wizard.svc?.id === 'medical' || wizard.addons.includes('medical'),
    medical_services: wizard.addonDetails.medical.services,
    notes: [
      ...(wizard.passengerDetails || []).map(passenger => passenger.assistanceNotes.trim()),
      ...wizard.addons.map(id => wizard.addonDetails[id]?.notes?.trim() || ''),
    ].filter(Boolean),
  },
});

export const normalizeAddon = addon => {
  const id = String(addon.id ?? addon.slug ?? '');
  if (!id) return null;
  const fallback = ADDONS.find(item => item.id === id);
  const hasPrice = Object.prototype.hasOwnProperty.call(addon, 'price') || Object.prototype.hasOwnProperty.call(addon, 'p');
  const configuredPrice = addon.price ?? addon.p;
  return {
    ...fallback,
    id,
    ic: addon.icon || fallback?.ic || '＋',
    n: bilingual(addon.name || fallback?.n || id),
    d: bilingual(addon.description || fallback?.d || ''),
    p: hasPrice ? (configuredPrice == null ? null : Number(configuredPrice)) : fallback?.p ?? null,
    priceUnit: addon.price_unit || fallback?.priceUnit || 'quote',
    vehicleCategories: addon.vehicle_categories || fallback?.vehicleCategories || [],
    vehiclePrices: addon.vehicle_prices || fallback?.vehiclePrices || {},
    medicalServices: addon.medical_services || fallback?.medicalServices || [],
    active: addon.active !== false && addon.is_active !== false,
  };
};

export const normalizeManagerAddon = (addon, index) => {
  const normalized = normalizeAddon(addon);
  return normalized ? { key: String(addon.id ?? addon.slug ?? `addon-${index}`), ...normalized } : null;
};

export const createAddonDetails = () => ({
  wheel: { notes: '', count: 1 },
  transfer: { pickup: true, dropoff: false, vehicle_category: 'sedan' },
  wrap: { bags: 1 },
  visa: { notes: '', count: 1, invitationLetter: null, returnTicket: null, hotelBooking: null, passportCopy: null },
  visa_on_arrival: { notes: '', count: 1, invitationLetter: null, returnTicket: null, hotelBooking: null, passportCopy: null },
  print: { notes: '', count: 1 },
  photocopy: { notes: '', count: 1 },
  money: { notes: '' },
  hotel: { destination: '', notes: '' },
  food: { notes: '' },
  medical: { services: [], notes: '' },
  tour: { city: '', language: '', notes: '' },
  security: { notes: '' },
  lounge: { notes: '' },
});

export const calculateBookingPricing = (w = {}, addonCatalog = ADDONS, pricingConfig = DEFAULT_PRICING_CONFIG) => {
  const cfg = pricingConfig || DEFAULT_PRICING_CONFIG;
  const adults = Number(w.a >= 0 ? w.a : (w.passengers?.adults ?? 1));
  const children = Number(w.c >= 0 ? w.c : (w.passengers?.children ?? 0));
  const elderly = Number(w.e >= 0 ? w.e : (w.passengers?.elderly ?? 0));
  const passengerCount = Math.max(1, adults + children + elderly);

  // 1. Service Package Base
  const isOnlyAddons = Boolean(w.onlyAddons || w.pkg?.id === 'addons_only');
  const pkgId = isOnlyAddons ? 'addons_only' : (w.pkg?.id || 'economy');
  const pkgCfg = cfg.packages?.[pkgId] || {
    id: pkgId,
    name: w.pkg?.n || ['Standard', 'স্ট্যান্ডার্ড'],
    basePrice: Number(w.pkg?.p || 0),
  };
  const basePrice = isOnlyAddons ? 0 : Number(pkgCfg.basePrice ?? w.pkg?.p ?? 500);

  // 2. Passenger Multipliers & Rates
  const adultMultiplier = Number(cfg.passengerRules?.adultMultiplier ?? 1.0);
  const childMultiplier = Number(cfg.passengerRules?.childMultiplier ?? 0.8);
  const elderlyMultiplier = Number(cfg.passengerRules?.elderlyMultiplier ?? 0.9);

  const adultRate = Math.round(basePrice * adultMultiplier);
  const childRate = Math.round(basePrice * childMultiplier);
  const elderlyRate = Math.round(basePrice * elderlyMultiplier);

  const adultCharge = adults * adultRate;
  const childCharge = children * childRate;
  const elderlyCharge = elderly * elderlyRate;
  const passengerSubtotal = adultCharge + childCharge + elderlyCharge;

  // Group Volume Discount Tier
  const discountTiers = cfg.passengerRules?.groupDiscountTiers || [];
  const matchedTier = discountTiers.find(t => passengerCount >= t.minPax && passengerCount <= t.maxPax);
  const groupDiscountPercent = Number(matchedTier?.discountPercent || 0);
  const groupDiscountAmount = groupDiscountPercent > 0 ? Math.round((passengerSubtotal * groupDiscountPercent) / 100) : 0;
  const netPassengerCharge = Math.max(0, passengerSubtotal - groupDiscountAmount);

  // 3. Number of Protocol Staff
  const includedPaxRatio = Number(cfg.staffRules?.includedPaxPerStaff || 3);
  const includedStaffCount = isOnlyAddons ? 0 : Math.max(1, Math.ceil(passengerCount / includedPaxRatio));
  const customStaff = w.staffCount ?? (w.extraStaff != null ? includedStaffCount + Number(w.extraStaff) : (w.staffAllocation?.required_staff || includedStaffCount));
  const assignedStaffCount = isOnlyAddons ? 0 : Math.max(includedStaffCount, Number(customStaff) || includedStaffCount);
  const extraStaffCount = isOnlyAddons ? 0 : Math.max(0, assignedStaffCount - includedStaffCount);
  const extraStaffRate = Number(cfg.staffRules?.additionalStaffRate || 500);
  const extraStaffCharge = extraStaffCount * extraStaffRate;

  const isDedicatedStaff = isOnlyAddons ? false : Boolean(w.dedicatedStaff || w.dedicatedVipStaff);
  const dedicatedStaffRate = Number(cfg.staffRules?.dedicatedVipStaffRate || 800);
  const dedicatedStaffCharge = isDedicatedStaff ? dedicatedStaffRate : 0;
  const totalStaffCharge = isOnlyAddons ? 0 : (extraStaffCharge + dedicatedStaffCharge);

  // 4. Additional Services (Add-ons)
  const selectedAddons = Array.isArray(w.addons) ? w.addons : [];
  const addonLines = selectedAddons
    .filter(id => id !== 'transfer')
    .map(id => {
      const addonCfg = cfg.additionalServices?.[id];
      const catalogItem = (addonCatalog || ADDONS).find(item => item.id === id) || ADDONS.find(item => item.id === id);
      const name = addonCfg?.name || catalogItem?.n || [id, id];
      const configuredPrice = addonCfg?.price ?? catalogItem?.p;
      const unitPrice = configuredPrice == null ? null : Number(configuredPrice);

      let quantity = 1;
      if (id === 'wrap') {
        quantity = Math.max(1, Number(w.addonDetails?.wrap?.bags) || 1);
      } else if (id === 'wheel') {
        quantity = Math.max(1, Number(w.addonDetails?.wheel?.count) || 1);
      } else if (id === 'lounge') {
        quantity = Number(w.addonDetails?.lounge?.count) || passengerCount;
      } else if (id === 'print') {
        quantity = Math.max(1, Number(w.addonDetails?.print?.count) || 1);
      } else if (id === 'photocopy') {
        quantity = Math.max(1, Number(w.addonDetails?.photocopy?.count) || 1);
      } else if (id === 'visa' || id === 'visa_on_arrival') {
        quantity = Math.max(1, Number(w.addonDetails?.visa?.count || w.addonDetails?.visa_on_arrival?.count) || passengerCount);
      }

      const amount = unitPrice == null ? null : unitPrice * quantity;
      return {
        id,
        name,
        quantity,
        unitPrice,
        amount,
        unit: addonCfg?.unit || catalogItem?.priceUnit || 'request',
      };
    });

  const totalAddonsCharge = addonLines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const quoteRequired = addonLines.some(line => line.amount == null);

  // 5. Vehicle Type (Airport Transfers)
  // Only include vehicle transfer IF the user explicitly selected 'transfer' in addons
  const hasVehicleTransfer = selectedAddons.includes('transfer');
  let vehicleCategory = 'sedan';
  let vehicleConfig = null;
  let vehicleCharge = 0;
  let isBothWays = false;

  if (hasVehicleTransfer) {
    vehicleCategory = String(w.addonDetails?.transfer?.vehicle_category || w.vehicleType || 'sedan').toLowerCase();
    vehicleConfig = cfg.vehicleRates?.[vehicleCategory] || cfg.vehicleRates?.sedan || {
      id: 'sedan',
      name: ['Sedan', 'সেডান'],
      basePrice: 1200,
    };
    isBothWays = Boolean(w.addonDetails?.transfer?.pickup && w.addonDetails?.transfer?.dropoff);
    const baseVehiclePrice = Number(vehicleConfig.basePrice || 1200);
    vehicleCharge = Math.round(baseVehiclePrice * (isBothWays ? 1.9 : 1.0));
  }

  // 6. Other Business Rules
  // A. Airport Surcharges
  const rawAirportCode = (typeof w.airport === 'object' ? w.airport?.code : w.airport) || 'DAC';
  const airportSurcharge = 0;

  // B. Peak Hour Surcharges
  const isPeakHour = false;
  const peakSurchargePercent = 0;
  const peakSurchargeAmount = 0;

  // C. Platform Fee (Only if explicitly configured)
  const platformFee = Number(cfg.businessRules?.platformFee || 0);

  // Pre-tax Subtotal (Only what was actually booked)
  const preTaxSubtotal =
    netPassengerCharge +
    totalStaffCharge +
    totalAddonsCharge +
    vehicleCharge +
    platformFee;

  // D. Government VAT / Tax (All package prices are final and inclusive, 0 extra tax unless configured)
  const vatPercent = Number(cfg.businessRules?.vatPercent || 0);
  const vatAmount = vatPercent > 0 ? Math.round((preTaxSubtotal * vatPercent) / 100) : 0;

  // Gross Total
  const grossTotal = preTaxSubtotal + vatAmount;

  // E. Promotional / Manual Discount
  const proposedDiscount = Number(w.discount?.amount ?? w.discount_amount ?? 0);
  const discountAmount = Number.isFinite(proposedDiscount) ? Math.min(Math.max(0, proposedDiscount), grossTotal) : 0;
  const discountedTotal = Math.max(0, grossTotal - discountAmount);

  // F. Minimum Booking Charge Floor (not applied to standalone add-ons)
  const minAmountFloor = isOnlyAddons ? 0 : Number(cfg.businessRules?.minimumBookingAmount || 0);
  const finalTotal = minAmountFloor > 0 ? Math.max(discountedTotal, minAmountFloor) : discountedTotal;
  const minFloorApplied = minAmountFloor > 0 && discountedTotal < minAmountFloor;

  return {
    passengerCount,
    adults,
    children,
    elderly,
    pkg: pkgCfg,
    basePrice,
    adultMultiplier,
    childMultiplier,
    elderlyMultiplier,
    adultRate,
    childRate,
    elderlyRate,
    adultCharge,
    childCharge,
    elderlyCharge,
    passengerSubtotal,
    groupDiscountPercent,
    groupDiscountAmount,
    netPassengerCharge,
    protocolCharge: netPassengerCharge, // for backward compatibility
    includedStaffCount,
    assignedStaffCount,
    extraStaffCount,
    extraStaffRate,
    extraStaffCharge,
    isDedicatedStaff,
    dedicatedStaffRate,
    dedicatedStaffCharge,
    totalStaffCharge,
    addonLines,
    totalAddonsCharge,
    hasVehicleTransfer,
    vehicleCategory,
    vehicleConfig,
    isBothWays,
    vehicleCharge,
    airportCode: rawAirportCode,
    airportSurcharge,
    isPeakHour,
    peakSurchargePercent,
    peakSurchargeAmount,
    platformFee,
    subtotal: preTaxSubtotal,
    preTaxSubtotal,
    vatPercent,
    vatAmount,
    grossTotal,
    discountAmount,
    minAmountFloor,
    minFloorApplied,
    finalTotal,
    total: quoteRequired ? null : finalTotal,
    quoteRequired,
    currency: cfg.currency || 'BDT',
    currencySymbol: cfg.currencySymbol || '৳',
  };
};

export const pricingBreakdown = (w = {}, addonCatalog = ADDONS, pricingConfig = DEFAULT_PRICING_CONFIG) =>
  calculateBookingPricing(w, addonCatalog, pricingConfig);

export const total = (w = {}, addonCatalog = ADDONS, pricingConfig = DEFAULT_PRICING_CONFIG) =>
  calculateBookingPricing(w, addonCatalog, pricingConfig).total;

/**
 * Validates a credit/debit card number using the standard Luhn checksum algorithm (Mod 10).
 */
export const validateLuhnCardNumber = cardNumber => {
  if (!cardNumber) return false;
  const digits = String(cardNumber).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

/**
 * Validates card expiry format (MM/YY) and ensures the expiration date is not in the past.
 */
export const isCardExpiryValid = expiry => {
  if (!expiry) return false;
  const clean = String(expiry).trim();
  const match = /^(\d{2})\/(\d{2})$/.exec(clean);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = parseInt(`20${match[2]}`, 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  if (year > currentYear + 25) return false;
  return true;
};

/**
 * Validates a discount coupon / promo code and returns discount amounts or specific failure reasons.
 */
export const validatePromoCode = (code, subtotal = 1000) => {
  if (!code) return { valid: false, reason: 'empty', message: 'Please enter a promo code', messageBn: 'অনুগ্রহ করে প্রোমো কোড লিখুন' };
  const clean = String(code).trim().toUpperCase();

  // Known expired promotional campaigns
  const EXPIRED_CODES = ['NEWYEAR2024', 'SUMMER2024', 'EID2023', 'RAMADAN2024', 'FC2023', 'PROMO2024'];
  if (EXPIRED_CODES.includes(clean)) {
    return {
      valid: false,
      reason: 'expired',
      message: `Promo code '${clean}' has expired on 31 Dec 2024`,
      messageBn: `⚠️ '${clean}' কুপনটির মেয়াদ উত্তীর্ণ হয়েছে (Expired)`,
    };
  }

  const PROMO_CODES = {
    FLIGHT100: { discount: 100, minAmount: 500, label: '৳100 Promo Discount' },
    EIDVIP: { discount: 200, minAmount: 1000, label: '৳200 Special Eid Discount' },
    WELCOME50: { discount: 50, minAmount: 500, label: '৳50 Welcome Coupon' },
    CARE10: { percent: 10, minAmount: 500, label: '10% Service Discount' },
  };

  const promo = PROMO_CODES[clean];
  if (!promo) {
    return {
      valid: false,
      reason: 'not_found',
      message: `Invalid promo code '${clean}'. Try: FLIGHT100, EIDVIP, WELCOME50`,
      messageBn: `⚠️ '${clean}' কুপনটি পাওয়া যায়নি। সঠিক কোড দিন (যেমন: FLIGHT100, EIDVIP)`,
    };
  }

  if (subtotal < promo.minAmount) {
    return {
      valid: false,
      reason: 'min_spend',
      message: `Minimum booking of ৳${promo.minAmount} required for '${clean}'`,
      messageBn: `⚠️ '${clean}' কোডের জন্য সর্বনিম্ন ৳${promo.minAmount} বুকিং প্রয়োজন (বর্তমান: ৳${subtotal})`,
    };
  }

  const discountAmount = promo.percent ? Math.round((subtotal * promo.percent) / 100) : promo.discount;
  return {
    valid: true,
    code: clean,
    discount: discountAmount,
    label: promo.label,
    messageBn: `✓ '${clean}' কোড সফলভাবে যোগ হয়েছে (-৳${discountAmount} ছাড়)`,
    message: `✓ '${clean}' applied successfully (-৳${discountAmount} off)`,
  };
};

/**
 * Generates calendar reminder details, Google Calendar URL, and universal ICS file content.
 */
export const getCalendarEventData = (booking, isBn = false) => {
  const bookingId = booking?.id || booking?.confirmedId || 'FC-PENDING';
  const flightNumber = (booking?.flight?.number || booking?.fno || 'FLIGHT').toUpperCase();
  const rawDate = booking?.flight?.date || booking?.date || '';
  const airport = booking?.airportName || (isBn ? 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা' : 'Hazrat Shahjalal Int Airport, Dhaka');
  const isDep = booking?.dir === 'dep';

  let eventDate = new Date();
  if (rawDate) {
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(rawDate.trim());
    if (match) {
      eventDate = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    } else {
      const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawDate.trim());
      if (isoMatch) {
        eventDate = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
      }
    }
  }

  // Meeting time: For departure, 3 hours before flight (e.g. 15:00); for arrival, arrival time (e.g. 12:00)
  const startHour = isDep ? 15 : 12;
  const startMinute = 0;
  const startDate = new Date(eventDate);
  startDate.setHours(startHour, startMinute, 0, 0);

  const endDate = new Date(startDate);
  endDate.setHours(startHour + 2, startMinute, 0, 0);

  const pad = n => String(n).padStart(2, '0');
  const formatUtc = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

  const startUtc = formatUtc(startDate);
  const endUtc = formatUtc(endDate);

  const title = isBn
    ? `🛫 ফ্লাইট কেয়ার: ${flightNumber} এয়ারপোর্ট প্রোটোকল সার্ভিস (${isDep ? 'প্রস্থান' : 'আগমন'})`
    : `🛫 Flight Care: ${flightNumber} Airport Protocol Service (${isDep ? 'Departure' : 'Arrival'})`;

  const meetingTimeStr = isDep
    ? (isBn ? 'ফ্লাইটের ৩ ঘণ্টা পূর্বে (প্রস্থান ক্যানোপি গেট)' : '3 hours prior to departure (Gate Canopy)')
    : (isBn ? 'ফ্লাইট অবতরণের সময় (অ্যারাইভাল গেট)' : 'At flight arrival time (Arrival Lounge/Gate)');

  const passengerName = booking?.passengerName || booking?.name || 'Passenger';
  const description = isBn
    ? `ফ্লাইট কেয়ার এয়ারপোর্ট প্রোটোকল ও ভিআইপি অ্যাসিস্ট্যান্স\nবুকিং রেফারেন্স: #${bookingId}\nযাত্রী: ${passengerName}\nফ্লাইট নম্বর: ${flightNumber}\nতারিখ: ${rawDate || 'N/A'}\nসাক্ষাতের সময়: ${meetingTimeStr}\nস্থান: ${airport}\n২৪/৭ হেল্পলাইন: +880 1712-345678\nলাইভ ট্র্যাকিং: https://flightcare.app/track/${bookingId}`
    : `Flight Care Airport Protocol & Ground Concierge Assistance\nBooking Ref: #${bookingId}\nPassenger: ${passengerName}\nFlight: ${flightNumber}\nDate: ${rawDate || 'N/A'}\nMeeting Time: ${meetingTimeStr}\nLocation: ${airport}\n24/7 Hotline: +880 1712-345678\nLive Track Officer: https://flightcare.app/track/${bookingId}`;

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startUtc}/${endUtc}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(airport)}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flight Care Technologies//Airport Protocol Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:flightcare-${bookingId}-${Date.now()}@flightcare.app`,
    `SUMMARY:${title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${airport.replace(/\n/g, ' ')}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT180M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Flight Care Airport Protocol Meeting',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return {
    title,
    location: airport,
    description,
    meetingTimeStr,
    googleUrl,
    icsContent,
    startDate,
    endDate,
  };
};




export const validateVisaOnArrivalDocs = (details = {}) => {
  const visaData = details.visa_on_arrival || details.visa || {};
  const missing = [];
  (VISA_ON_ARRIVAL_DOCUMENTS || []).forEach(doc => {
    const val = visaData[doc.key];
    const hasDoc = val && (typeof val === 'string' ? val.trim().length > 0 : Boolean(val.name || val.dataUrl));
    if (!hasDoc) {
      missing.push(doc);
    }
  });
  return {
    isValid: missing.length === 0,
    missing,
  };
};
