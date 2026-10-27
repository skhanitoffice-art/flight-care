// scripts/seedFirebaseData.js
// Flight Care Autonomous Firebase Firestore Seeder
// Run with: node scripts/seedFirebaseData.js

const https = require('https');

// Enter your Firebase credentials here or via environment variables
const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'flightcare-db2eb';
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '';

if (!FIREBASE_API_KEY) {
  console.log('-----------------------------------------------------------');
  console.log('⚠️  NOTICE: Please supply your Firebase API Key to seed live:');
  console.log('   Example: $env:EXPO_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY" ; node scripts/seedFirebaseData.js');
  console.log('-----------------------------------------------------------\n');
}

const toFirestoreFields = obj => {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(item => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return { integerValue: String(item) };
            if (typeof item === 'object') return { mapValue: toFirestoreFields(item) };
            return { stringValue: String(item) };
          })
        }
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: toFirestoreFields(value) };
    }
  }
  return { fields };
};

const sendFirestoreRequest = (docPath, data) => {
  return new Promise((resolve, reject) => {
    if (!FIREBASE_API_KEY) {
      resolve({ skipped: true, reason: 'missing_key' });
      return;
    }
    const payload = JSON.stringify(toFirestoreFields(data));
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}?key=${FIREBASE_API_KEY}`;

    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, data: JSON.parse(body || '{}') });
        } else {
          resolve({ ok: false, status: res.statusCode, error: body });
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(payload);
    req.end();
  });
};

const SERVICES = [
  { id: 'bb2car', nameEn: 'Boarding Bridge to Car (Arrival)', nameBn: 'বোর্ডিং ব্রিজ থেকে গাড়ি (আগমন)', price: 2500, icon: '🛬' },
  { id: 'imm2car', nameEn: 'Immigration to Car (Arrival)', nameBn: 'ইমিগ্রেশন থেকে গাড়ি (আগমন)', price: 2000, icon: '🛂' },
  { id: 'gate2bb', nameEn: 'Entry Gate to Boarding Bridge (Departure)', nameBn: 'এন্ট্রি গেট থেকে বোর্ডিং ব্রিজ (প্রস্থান)', price: 2500, icon: '🛫' },
  { id: 'gate2imm', nameEn: 'Entry Gate to Immigration (Departure)', nameBn: 'এন্ট্রি গেট থেকে ইমিগ্রেশন (প্রস্থান)', price: 1800, icon: '🛃' },
  { id: 'wheel', nameEn: 'Wheelchair Assistance', nameBn: 'হুইলচেয়ার সেবা', price: 800, icon: '🦽' },
  { id: 'medical', nameEn: 'Medical Assistance & Ambulance', nameBn: 'মেডিকেল সহায়তা ও অ্যাম্বুলেন্স', price: 5000, icon: '🩺' },
  { id: 'wrap', nameEn: 'Luggage Wrapping', nameBn: 'লাগেজ র‍্যাপিং', price: 400, icon: '🧳' },
  { id: 'pickup', nameEn: 'Rent a Car / Airport Transfer', nameBn: 'গাড়ি ভাড়া ও ট্রান্সফার', price: 3500, icon: '🚘' },
  { id: 'vip_lounge', nameEn: 'VIP Lounge Protocol', nameBn: 'ভিআইপি লাউঞ্জ প্রোটোকল', price: 4000, icon: '🛋️' },
  { id: 'fast_track', nameEn: 'Fast-track Priority Clearance', nameBn: 'ফাস্ট-ট্র্যাক প্রায়োরিটি ক্লিয়ারেন্স', price: 3000, icon: '⚡' },
  { id: 'print_docs', nameEn: 'Document Print & Photocopy', nameBn: 'ডকুমেন্ট প্রিন্ট ও ফটোকপি', price: 150, icon: '🖨️' },
];

const PROMOS = [
  { code: 'FLIGHT100', type: 'flat', value: 100, minAmount: 1000, maxDiscount: 100, active: true },
  { code: 'EIDVIP', type: 'percentage', value: 15, minAmount: 2000, maxDiscount: 500, active: true },
  { code: 'WELCOME50', type: 'flat', value: 50, minAmount: 500, maxDiscount: 50, active: true },
  { code: 'CARE10', type: 'percentage', value: 10, minAmount: 1500, maxDiscount: 300, active: true },
];

async function runSeed() {
  console.log(`Starting Firestore Seeder for project: [${FIREBASE_PROJECT_ID}]...`);

  let countServices = 0;
  for (const s of SERVICES) {
    const res = await sendFirestoreRequest(`airport_services/${s.id}`, {
      ...s,
      activeAirports: ['DAC', 'CGP', 'ZYL', 'CXB'],
      isActive: true,
      updatedAt: new Date().toISOString()
    });
    if (res.ok) countServices++;
  }
  console.log(`✓ Processed ${SERVICES.length} airport services (Uploaded: ${countServices})`);

  let countPromos = 0;
  for (const p of PROMOS) {
    const res = await sendFirestoreRequest(`promo_codes/${p.code}`, {
      ...p,
      updatedAt: new Date().toISOString()
    });
    if (res.ok) countPromos++;
  }
  console.log(`✓ Processed ${PROMOS.length} promo codes (Uploaded: ${countPromos})`);

  console.log('\n✅ Seeding process completed successfully!');
}

runSeed().catch(console.error);

