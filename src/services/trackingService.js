import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_STAFF_ROSTER } from '../constants/data';

const TRACKING_STORAGE_KEY = '@flightcare_live_tracking_sessions_v1';

// Standard Airport GPS Center Coordinates
export const AIRPORT_GPS_CENTERS = {
  DAC: { lat: 23.8433, lng: 90.4000, name: 'Hazrat Shahjalal International Airport, Dhaka' },
  CGP: { lat: 22.2496, lng: 91.8133, name: 'Shah Amanat International Airport, Chattogram' },
  ZYL: { lat: 24.9632, lng: 91.8668, name: 'Osmani International Airport, Sylhet' },
  CXB: { lat: 21.4522, lng: 91.9639, name: "Cox's Bazar International Airport" },
};

// Indoor Checkpoints & Airport Zones with realistic coordinates relative to DAC
export const AIRPORT_CHECKPOINTS = [
  {
    id: 'boarding bridge_gate5',
    zone: 'Airside',
    type: 'arrival',
    labelEn: 'Boarding Bridge Gate 5',
    labelBn: 'বোর্ডিং ব্রিজ গেট ৫ (বোর্ডিং ব্রিজ)',
    lat: 23.8448,
    lng: 90.3986,
    icon: '🛬',
    descriptionEn: 'Aircraft boarding bridge exit door',
    descriptionBn: 'উড়োজাহাজের বোর্ডিং ব্রিজ এক্সিট ডোর',
  },
  {
    id: 'boarding bridge_gate3',
    zone: 'Airside',
    type: 'arrival',
    labelEn: 'Boarding Bridge Gate 3',
    labelBn: 'বোর্ডিং ব্রিজ গেট ৩',
    lat: 23.8445,
    lng: 90.3989,
    icon: '🛬',
    descriptionEn: 'Terminal 1 Boarding Bridge gate',
    descriptionBn: 'টার্মিনাল ১ বোর্ডিং ব্রিজ গেট',
  },
  {
    id: 'health_transit_desk',
    zone: 'Airside',
    type: 'arrival',
    labelEn: 'Health & Transit Desk',
    labelBn: 'স্বাস্থ্য ও ট্রানজিট হেল্প ডেস্ক',
    lat: 23.8441,
    lng: 90.3992,
    icon: '🩺',
    descriptionEn: 'Before arrival immigration corridor',
    descriptionBn: 'ইমিগ্রেশন প্রবেশদ্বারের পূর্ববর্তী করিডোর',
  },
  {
    id: 'immigration_arrival_hall',
    zone: 'Airside',
    type: 'arrival',
    labelEn: 'Arrival Immigration Hall',
    labelBn: 'আগমন ইমিগ্রেশন হল (কাউন্টার ৮-১২)',
    lat: 23.8437,
    lng: 90.3996,
    icon: '🛂',
    descriptionEn: 'Primary passport control counters',
    descriptionBn: 'প্রধান পাসপোর্ট নিয়ন্ত্রণ কাউন্টার',
  },
  {
    id: 'baggage_belt4',
    zone: 'Arrivals',
    type: 'arrival',
    labelEn: 'Baggage Claim (Belt 4)',
    labelBn: 'লাগেজ বেল্ট ৪ (ব্যাগেজ এলাকা)',
    lat: 23.8431,
    lng: 90.4005,
    icon: '🧳',
    descriptionEn: 'International baggage carousel area',
    descriptionBn: 'আন্তর্জাতিক লাগেজ বেল্ট চত্বর',
  },
  {
    id: 'baggage_belt2',
    zone: 'Arrivals',
    type: 'arrival',
    labelEn: 'Baggage Claim (Belt 2)',
    labelBn: 'লাগেজ বেল্ট ২',
    lat: 23.8433,
    lng: 90.4002,
    icon: '🧳',
    descriptionEn: 'Near oversized luggage collection',
    descriptionBn: 'হেভি লাগেজ কালেকশন পয়েন্টের নিকটে',
  },
  {
    id: 'customs_green_channel',
    zone: 'Landside',
    type: 'arrival',
    labelEn: 'Customs Clearance (Green Channel)',
    labelBn: 'কাস্টমস গ্রিন চ্যানেল বহির্গমন',
    lat: 23.8426,
    lng: 90.4011,
    icon: '🛃',
    descriptionEn: 'Exit scan & declaration channel',
    descriptionBn: 'লাগেজ স্ক্যান ও কাস্টমস বহির্গমন',
  },
  {
    id: 'arrival_concourse_lounge',
    zone: 'Landside',
    type: 'both',
    isMeetingPoint: true,
    labelEn: 'Arrival Concourse (Main Meeting Point)',
    labelBn: 'আগমন কনকোর্স হল (প্রধান সাক্ষাৎ স্থান)',
    lat: 23.8421,
    lng: 90.4017,
    icon: '🤝',
    descriptionEn: 'Designated Flight Care meet & greet lounge',
    descriptionBn: 'ফ্লাইট কেয়ার নির্ধারিত অভ্যর্থনা লাউঞ্জ',
  },
  {
    id: 'canopy_vip_parking',
    zone: 'Ground',
    type: 'arrival',
    labelEn: 'Canopy & VIP Car Parking',
    labelBn: 'ক্যানোপি ও ভিআইপি পার্কিং এলাকা',
    lat: 23.8415,
    lng: 90.4024,
    icon: '🚗',
    descriptionEn: 'Driveway lane 2 & vehicle pickup zone',
    descriptionBn: 'ড্রাইভওয়ে লেন ২ ও পিক-আপ এলাকা',
  },
  {
    id: 'departure_curb_dropoff',
    zone: 'Landside',
    type: 'departure',
    labelEn: 'Departure Curb & Drop-off (Gate 3)',
    labelBn: 'ডিপারচার ড্রপ-অফ পয়েন্ট (গেট ৩)',
    lat: 23.8418,
    lng: 90.3976,
    icon: '🚙',
    descriptionEn: 'Terminal 1 departure drive-in entrance',
    descriptionBn: 'টার্মিনাল ১ বহির্গমন প্রবেশ ড্রাইভওয়ে',
  },
  {
    id: 'departure_entry_gate',
    zone: 'Landside',
    type: 'departure',
    isMeetingPoint: true,
    labelEn: 'Departure Security Entry Gate 3',
    labelBn: 'ডিপারচার প্রবেশ সিকিউরিটি গেট ৩',
    lat: 23.8424,
    lng: 90.3983,
    icon: '🚪',
    descriptionEn: 'Police & security passport check entrance',
    descriptionBn: 'পুলিশ ও সিকিউরিটি পাসপোর্ট পরীক্ষণ ফটক',
  },
  {
    id: 'checkin_counter_row',
    zone: 'Terminal',
    type: 'departure',
    labelEn: 'Check-in Counters (Row C - Biman/Emirates)',
    labelBn: 'এয়ারলাইন চেক-ইন কাউন্টার (রো সি)',
    lat: 23.8429,
    lng: 90.3990,
    icon: '🎟️',
    descriptionEn: 'Luggage drop & boarding pass hall',
    descriptionBn: 'লাগেজ ড্রপ ও বোর্ডিং পাস হল',
  },
  {
    id: 'balaka_vip_lounge',
    zone: 'Airside',
    type: 'both',
    labelEn: 'Balaka Executive VIP Lounge',
    labelBn: 'বলাকা এক্সিকিউটিভ ভিআইপি লাউঞ্জ',
    lat: 23.8439,
    lng: 90.4009,
    icon: '👑',
    descriptionEn: 'Terminal 1 Level 2 VIP Lounge',
    descriptionBn: 'টার্মিনাল ১ লেভেল ২ ভিআইপি লাউঞ্জ',
  },
  {
    id: 'departure_boarding_gate8',
    zone: 'Airside',
    type: 'departure',
    labelEn: 'Departure Boarding Gate 8',
    labelBn: 'ডিপারচার বোর্ডিং গেট ৮',
    lat: 23.8447,
    lng: 90.3999,
    icon: '🛫',
    descriptionEn: 'Final departure holding area',
    descriptionBn: 'চূড়ান্ত ডিপারচার হোল্ডিং এলাকা',
  },
];

// Haversine formula to compute distance in meters between two lat/lng coordinates
export function computeDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Compute walking ETA in minutes based on average airport walking speed ~ 1.2 m/s
export function computeWalkingEtaMinutes(distanceMeters) {
  if (!distanceMeters || distanceMeters <= 5) return 0;
  const walkingSpeedMetersPerMin = 75; // ~1.25 m/s
  const minutes = Math.ceil(distanceMeters / walkingSpeedMetersPerMin);
  return Math.max(1, minutes);
}

// In-memory sessions store
const sessionsCache = new Map();
const listeners = new Map(); // bookingId -> Set of callbacks

export function subscribeToTrackingUpdates(bookingId, callback) {
  if (!bookingId || typeof callback !== 'function') return () => {};
  const idStr = String(bookingId);
  if (!listeners.has(idStr)) {
    listeners.set(idStr, new Set());
  }
  listeners.get(idStr).add(callback);
  return () => {
    listeners.get(idStr)?.delete(callback);
  };
}

function notifyTrackingListeners(bookingId, session) {
  const idStr = String(bookingId);
  if (listeners.has(idStr)) {
    listeners.get(idStr).forEach(cb => {
      try {
        cb(session);
      } catch (e) {
        console.error('Error in tracking update callback:', e);
      }
    });
  }
}

// Initialize or retrieve a tracking session for a booking
export function getOrCreateTrackingSession(booking, staffOverride = null) {
  if (!booking) return null;
  const bookingId = String(booking.id || booking.booking_id || 'FC-DEMO-001');

  if (sessionsCache.has(bookingId)) {
    const existing = sessionsCache.get(bookingId);
    // Refresh calculations
    const dist = computeDistanceMeters(
      existing.officer.location.lat,
      existing.officer.location.lng,
      existing.passenger.location.lat,
      existing.passenger.location.lng
    );
    existing.distanceMeters = dist;
    existing.etaMinutes = computeWalkingEtaMinutes(dist);
    return existing;
  }

  // Determine direction
  const isDep =
    booking.dir === 'dep' ||
    String(booking.serviceCategory || '').toLowerCase().includes('dep') ||
    String(booking.category || '').toLowerCase().includes('dep');

  // Default checkpoints based on direction
  const initialOfficerCp = isDep
    ? AIRPORT_CHECKPOINTS.find(c => c.id === 'departure_entry_gate')
    : AIRPORT_CHECKPOINTS.find(c => c.id === 'arrival_concourse_lounge') || AIRPORT_CHECKPOINTS[0];

  const initialPassengerCp = isDep
    ? AIRPORT_CHECKPOINTS.find(c => c.id === 'departure_curb_dropoff')
    : AIRPORT_CHECKPOINTS.find(c => c.id === 'boarding bridge_gate5') || AIRPORT_CHECKPOINTS[0];

  const meetingPointCp = isDep
    ? AIRPORT_CHECKPOINTS.find(c => c.id === 'departure_entry_gate')
    : AIRPORT_CHECKPOINTS.find(c => c.id === 'arrival_concourse_lounge');

  // Look up staff
  const staffMember =
    staffOverride ||
    (DEFAULT_STAFF_ROSTER || []).find(
      s => s.id === booking.assignedStaff?.id || s.id === booking.staffId || s.name === booking.assignedStaff?.name
    ) ||
    DEFAULT_STAFF_ROSTER[0];

  const initialDistance = computeDistanceMeters(
    initialOfficerCp.lat,
    initialOfficerCp.lng,
    initialPassengerCp.lat,
    initialPassengerCp.lng
  );

  const session = {
    bookingId,
    direction: isDep ? 'departure' : 'arrival',
    flightNumber: booking.flight?.number || booking.fno || booking.flight_number || 'BG-084',
    flightDate: booking.flight?.date || booking.date || booking.flight_date || 'Today',
    packageName: booking.package?.name || booking.pkg?.t || 'Premium',
    status: booking.status === 'service_started' ? 'in_progress' : 'assigned',
    meetingPoint: {
      id: meetingPointCp.id,
      nameEn: meetingPointCp.labelEn,
      nameBn: meetingPointCp.labelBn,
      lat: meetingPointCp.lat,
      lng: meetingPointCp.lng,
    },
    officer: {
      id: staffMember.id,
      name: staffMember.name,
      role: staffMember.role,
      phone: staffMember.phone,
      email: staffMember.email,
      rating: staffMember.rating || 4.9,
      completedServices: staffMember.completedServices || 142,
      battery: 89,
      status: 'en_route', // 'at_station' | 'en_route' | 'at_meeting_point' | 'with_passenger'
      badgeNumber: staffMember.badgeNumber || `CAAB-FC-${String(staffMember.id || '892').replace(/[^0-9]/g, '') || '892'}`,
      avatarUrl: staffMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      uniformDescEn: 'Navy Blue Suit & Blazer • Gold Flight Care Lapel Pin • Official Yellow CAAB Protocol Pass',
      uniformDescBn: 'নেভি ব্লু স্যুট ও ব্লেজার • গোল্ড ফ্লাইট কেয়ার ল্যাপেল পিন • সিভিল এভিয়েশন সিকিউরিটি পাস',
      verificationStatus: 'CAAB Verified Protocol Staff',
      meetingPlacardText: (booking.passengerName || booking.name || booking.customer?.name || 'Valued Passenger').toUpperCase(),
      location: {
        lat: initialOfficerCp.lat,
        lng: initialOfficerCp.lng,
        checkpointId: initialOfficerCp.id,
        checkpointNameEn: initialOfficerCp.labelEn,
        checkpointNameBn: initialOfficerCp.labelBn,
        accuracy: 'GPS High Precision (±3m)',
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    },
    passenger: {
      name: booking.passengerName || booking.name || booking.customer?.name || 'Valued Passenger',
      phone: booking.passengerPhone || booking.phone || booking.customer?.phone || '+880 1700 000000',
      isSharingLocation: true,
      battery: 76,
      location: {
        lat: initialPassengerCp.lat,
        lng: initialPassengerCp.lng,
        checkpointId: initialPassengerCp.id,
        checkpointNameEn: initialPassengerCp.labelEn,
        checkpointNameBn: initialPassengerCp.labelBn,
        accuracy: 'GPS Precision (±5m)',
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    },
    distanceMeters: initialDistance,
    etaMinutes: computeWalkingEtaMinutes(initialDistance),
    pings: [],
    history: [
      {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        textEn: `Officer ${staffMember.name} assigned to flight ${booking.fno || 'BG-084'}`,
        textBn: `কর্মকর্তা ${staffMember.name} ফ্লাইট ${booking.fno || 'BG-084'}-এর জন্য নিযুক্ত হয়েছেন`,
      },
    ],
  };

  sessionsCache.set(bookingId, session);
  return session;
}

// Update Officer's live location and checkpoint
export function updateOfficerLocation(bookingId, { lat, lng, checkpointId, status = null }) {
  const session = sessionsCache.get(String(bookingId));
  if (!session) return null;

  const cp = AIRPORT_CHECKPOINTS.find(c => c.id === checkpointId);
  const targetLat = lat != null ? lat : cp ? cp.lat : session.officer.location.lat;
  const targetLng = lng != null ? lng : cp ? cp.lng : session.officer.location.lng;

  session.officer.location = {
    lat: targetLat,
    lng: targetLng,
    checkpointId: checkpointId || session.officer.location.checkpointId,
    checkpointNameEn: cp ? cp.labelEn : session.officer.location.checkpointNameEn,
    checkpointNameBn: cp ? cp.labelBn : session.officer.location.checkpointNameBn,
    accuracy: 'GPS High Precision (±2m)',
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };

  if (status) {
    session.officer.status = status;
  }

  const dist = computeDistanceMeters(
    session.officer.location.lat,
    session.officer.location.lng,
    session.passenger.location.lat,
    session.passenger.location.lng
  );
  session.distanceMeters = dist;
  session.etaMinutes = computeWalkingEtaMinutes(dist);

  if (dist <= 15 && session.officer.status !== 'with_passenger') {
    session.officer.status = 'with_passenger';
    session.history.push({
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      textEn: `Officer and passenger met successfully (Distance: ${dist}m)`,
      textBn: `অফিসার ও যাত্রীর সাক্ষাৎ সম্পন্ন হয়েছে (দূরত্ব: ${dist} মিটার)`,
    });
  }

  notifyTrackingListeners(bookingId, session);
  return session;
}

// Update Passenger's live location and checkpoint
export function updatePassengerLocation(bookingId, { lat, lng, checkpointId, isSharingLocation = true }) {
  const session = sessionsCache.get(String(bookingId));
  if (!session) return null;

  const cp = AIRPORT_CHECKPOINTS.find(c => c.id === checkpointId);
  const targetLat = lat != null ? lat : cp ? cp.lat : session.passenger.location.lat;
  const targetLng = lng != null ? lng : cp ? cp.lng : session.passenger.location.lng;

  session.passenger.isSharingLocation = isSharingLocation;
  session.passenger.location = {
    lat: targetLat,
    lng: targetLng,
    checkpointId: checkpointId || session.passenger.location.checkpointId,
    checkpointNameEn: cp ? cp.labelEn : session.passenger.location.checkpointNameEn,
    checkpointNameBn: cp ? cp.labelBn : session.passenger.location.checkpointNameBn,
    accuracy: 'GPS High Precision (±4m)',
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };

  const dist = computeDistanceMeters(
    session.officer.location.lat,
    session.officer.location.lng,
    session.passenger.location.lat,
    session.passenger.location.lng
  );
  session.distanceMeters = dist;
  session.etaMinutes = computeWalkingEtaMinutes(dist);

  notifyTrackingListeners(bookingId, session);
  return session;
}

// Send a quick ping or greeting between passenger and officer
export function sendTrackingPing(bookingId, fromRole, message = null) {
  const session = sessionsCache.get(String(bookingId));
  if (!session) return null;

  const pingTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const newPing = {
    id: `ping-${Date.now()}`,
    from: fromRole, // 'passenger' | 'officer' | 'manager'
    message:
      message ||
      (fromRole === 'passenger'
        ? '👋 Passenger pinged: "I am ready at my location!"'
        : '👋 Officer pinged: "I am here in uniform, looking for you!"'),
    time: pingTime,
  };

  session.pings.unshift(newPing);
  if (session.pings.length > 10) session.pings.pop();

  session.history.unshift({
    timestamp: pingTime,
    textEn: `${fromRole === 'passenger' ? 'Passenger' : 'Officer'} sent location ping`,
    textBn: `${fromRole === 'passenger' ? 'যাত্রী' : 'অফিসার'} লোকেশন পিং পাঠিয়েছেন`,
  });

  notifyTrackingListeners(bookingId, session);
  return session;
}

// Simulation helper: moves officer one step closer to passenger
export function stepSimulationCloser(bookingId) {
  const session = sessionsCache.get(String(bookingId));
  if (!session) return null;

  const oLat = session.officer.location.lat;
  const oLng = session.officer.location.lng;
  const pLat = session.passenger.location.lat;
  const pLng = session.passenger.location.lng;

  // Move 20% closer
  const newLat = oLat + (pLat - oLat) * 0.25;
  const newLng = oLng + (pLng - oLng) * 0.25;

  return updateOfficerLocation(bookingId, { lat: newLat, lng: newLng });
}

// Get all active sessions for Admin / Manager view
export function getAllActiveTrackingSessions(bookings = []) {
  // Ensure sessions for any confirmed or assigned bookings
  (bookings || []).forEach(b => {
    if (!sessionsCache.has(String(b.id))) {
      getOrCreateTrackingSession(b);
    }
  });

  // If no sessions, provide a demo active session
  if (sessionsCache.size === 0) {
    const demoBooking = {
      id: 'FC-LIVE-882',
      fno: 'BG-084',
      date: 'Today',
      name: 'Rahim Chowdhury',
      phone: '+880 1711 223344',
      dir: 'arr',
      status: 'service_started',
      assignedStaff: DEFAULT_STAFF_ROSTER[0],
    };
    getOrCreateTrackingSession(demoBooking);
  }

  return Array.from(sessionsCache.values());
}

// ==========================================
// GOOGLE MAPS PLATFORM INTEGRATION HELPERS
// ==========================================

const GOOGLE_MAPS_KEY_STORAGE = '@flightcare_google_maps_api_key';

let inMemoryGoogleMapsKey =
  (typeof process !== 'undefined' && process.env && (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY)) || '';

export async function getGoogleMapsApiKey() {
  try {
    const saved = await AsyncStorage.getItem(GOOGLE_MAPS_KEY_STORAGE);
    if (saved) return saved;
  } catch {}
  return inMemoryGoogleMapsKey;
}

export async function setGoogleMapsApiKey(key) {
  inMemoryGoogleMapsKey = (key || '').trim();
  try {
    if (inMemoryGoogleMapsKey) {
      await AsyncStorage.setItem(GOOGLE_MAPS_KEY_STORAGE, inMemoryGoogleMapsKey);
    } else {
      await AsyncStorage.removeItem(GOOGLE_MAPS_KEY_STORAGE);
    }
  } catch {}
  return inMemoryGoogleMapsKey;
}

// Generate Google Maps Deep Link URL for direct mobile/web navigation
export function getGoogleMapsNavigationUrl(originLat, originLng, destLat, destLng, travelMode = 'walking') {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=${travelMode}`;
}

// Generate Google Maps Search / Pin URL
export function getGoogleMapsPinUrl(lat, lng, label = '') {
  const query = label ? encodeURIComponent(`${label} (${lat},${lng})`) : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

// Generate Google Maps Embed iframe URL
export function getGoogleMapsEmbedUrl({ lat, lng, apiKey = '', zoom = 17, mapType = 'm', lang = 'en' }) {
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${lat},${lng}&zoom=${zoom}&maptype=${mapType === 'k' ? 'satellite' : 'roadmap'}&language=${lang}`;
  }
  // Fallback universal embed URL
  return `https://maps.google.com/maps?q=${lat},${lng}&t=${mapType}&z=${zoom}&hl=${lang}&output=embed`;
}

// Generate Google Maps Directions Embed URL
export function getGoogleMapsDirectionsEmbedUrl({ originLat, originLng, destLat, destLng, apiKey = '', mode = 'walking', lang = 'en' }) {
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(apiKey)}&origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=${mode}&language=${lang}`;
  }
  return `https://maps.google.com/maps?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&hl=${lang}&output=embed`;
}

// ==========================================
// BATTERY OPTIMIZATION & ADAPTIVE POLLING
// ==========================================

// Calculate adaptive polling rate based on distance to optimize battery consumption
export function getAdaptivePollingInterval(distanceMeters) {
  if (distanceMeters == null) return 15000;
  // If passenger and officer are within 200m: 3 seconds for precise terminal rendezvous
  if (distanceMeters < 200) return 3000;
  // If further away: 15 seconds to conserve mobile battery
  return 15000;
}

// Request real Geolocation from device/browser
export async function requestDeviceGeolocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      success: false,
      errorType: 'unsupported',
      message: 'Geolocation is not supported by this device or browser',
    };
  }

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        resolve({
          success: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ? `±${Math.round(pos.coords.accuracy)}m` : 'GPS High Precision',
        });
      },
      err => {
        let errorType = 'unknown';
        if (err.code === 1) errorType = 'denied';
        else if (err.code === 2) errorType = 'unavailable';
        else if (err.code === 3) errorType = 'timeout';

        resolve({
          success: false,
          errorType,
          code: err.code,
          message: err.message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  });
}



