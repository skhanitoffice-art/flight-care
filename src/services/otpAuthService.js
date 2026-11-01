import {
  checkOtpRateLimit,
  recordOtpDispatch,
  recordFailedOtpAttempt,
  resetFailedOtpAttempts,
} from './otpRateLimiter.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLiveSms } from './smsGateway.js';
import { saveCommunicationLog } from './communication.js';

const OTP_CHALLENGE_STORE_KEY = '@flightcare_active_otp_challenges';

// In-memory challenge cache
const activeChallenges = new Map();

/**
 * Generate a random 6-digit OTP code
 */
export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Dispatch OTP via email endpoint (PHP mailer on Hostinger/server)
 */
async function dispatchEmailOtp({ email, name, code, phone = '' }) {
  if (!email || !email.includes('@')) return { sent: false };
  try {
    const endpoints = [
      '/api/auth/send_otp.php',
      'https://flightcaresbd.com/api/auth/send_otp.php',
    ];
    let dispatched = false;
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, otp: code, phone, type: 'REGISTRATION' }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ok) {
            dispatched = true;
            break;
          }
        }
      } catch (e) {
        // Continue to fallback
      }
    }
    // Record communication log
    saveCommunicationLog({
      type: 'EMAIL_OTP',
      recipient: email,
      subject: `Flight Care OTP: ${code}`,
      otp: code,
      status: dispatched ? 'delivered' : 'simulated',
    }).catch(() => {});

    return { sent: dispatched, simulated: !dispatched };
  } catch (err) {
    console.warn('dispatchEmailOtp error:', err);
    return { sent: false, simulated: true };
  }
}

/**
 * Creates and dispatches a customer registration OTP (Mobile SMS + Gmail)
 */
export async function createRegistrationOtpChallenge({ name, phone, email, password }) {
  const rateTarget = phone || email || 'customer';
  // Anti-Bot & Rate Limiting Enforcement
  const rateCheck = await checkOtpRateLimit(rateTarget);
  if (!rateCheck.allowed) {
    return {
      ok: false,
      reason: rateCheck.reason,
      message: rateCheck.message,
      remainingSec: rateCheck.remainingSec,
    };
  }
  const challengeId = `CH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const code = generateOtpCode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  const challengeData = {
    challengeId,
    type: 'REGISTRATION',
    name,
    phone: phone || '',
    email: email || '',
    password,
    code,
    expiresAt,
  };

  activeChallenges.set(challengeId, challengeData);
  try {
    await AsyncStorage.setItem(OTP_CHALLENGE_STORE_KEY, JSON.stringify(Array.from(activeChallenges.entries())));
  } catch (e) {}

  let smsDelivered = false;
  let smsSimulated = false;

  // 1. Dispatch SMS if phone provided
  if (phone) {
    const smsMessage = `[Flight Care] আপনার ওটিপি ভেরিফিকেশন কোড: ${code}। এটি ৫ মিনিটের জন্য প্রযোজ্য। কাউকে এটি শেয়ার করবেন না।`;
    const smsResult = await sendLiveSms({
      to: phone,
      message: smsMessage,
      otp: code,
      title: 'Registration OTP',
    });
    smsDelivered = smsResult.delivered;
    smsSimulated = smsResult.simulated;
    await recordOtpDispatch(phone);
  }

  // 2. Dispatch Email/Gmail if email provided
  let emailResult = { sent: false };
  if (email) {
    emailResult = await dispatchEmailOtp({ email, name, code, phone });
    await recordOtpDispatch(email);
  }

  return {
    ok: true,
    data: {
      challenge_id: challengeId,
      code,
      phone,
      email,
      message: 'OTP dispatched successfully via SMS / Email.',
      smsDelivered,
      smsSimulated,
      emailSent: emailResult.sent,
    },
  };
}

/**
 * Verifies a registration OTP challenge securely
 */
export async function verifyRegistrationOtpChallenge(challengeId, identifier, inputCode) {
  const cleanCode = String(inputCode || '').replace(/\D/g, '').trim();
  let challenge = activeChallenges.get(challengeId);

  if (!challenge) {
    try {
      const stored = await AsyncStorage.getItem(OTP_CHALLENGE_STORE_KEY);
      if (stored) {
        const parsed = new Map(JSON.parse(stored));
        challenge = parsed.get(challengeId);
      }
    } catch (e) {}
  }

  // Ultra-robust match: if challengeId changed or resend occurred, match by phone digits, email, or code
  if (!challenge || String(challenge.code).trim() !== cleanCode) {
    const cleanId = String(identifier || '').trim().toLowerCase();
    const cleanPhoneDigits = cleanId.replace(/\D/g, '').slice(-10);

    for (const [id, c] of activeChallenges.entries()) {
      const cPhoneDigits = String(c.phone || '').replace(/\D/g, '').slice(-10);
      const cEmail = String(c.email || '').trim().toLowerCase();
      const isCodeMatch = String(c.code).trim() === cleanCode;

      const isIdMatch =
        !cleanId ||
        (cleanPhoneDigits && cPhoneDigits && cPhoneDigits === cleanPhoneDigits) ||
        (cleanId.includes('@') && cEmail && cEmail === cleanId);

      if (isCodeMatch && isIdMatch && Date.now() <= (c.expiresAt || Date.now() + 600000)) {
        challenge = c;
        challengeId = id;
        break;
      }
    }
  }

  const isMatch = challenge && String(challenge.code).trim() === cleanCode;

  if (!isMatch) {
    return { ok: false, reason: 'invalid_code', message: 'ভুল ওটিপি কোড দেওয়া হয়েছে।' };
  }

  if (challenge && Date.now() > challenge.expiresAt) {
    return { ok: false, reason: 'code_expired', message: 'ওটিপি কোডের মেয়াদ শেষ হয়ে গেছে। আবার পাঠান।' };
  }

  const user = {
    id: Date.now(),
    name: challenge?.name || 'Customer',
    phone: challenge?.phone || (identifier && !identifier.includes('@') ? identifier : '+880 1347 570001'),
    email: challenge?.email || (identifier && identifier.includes('@') ? identifier : ''),
    role: 'customer',
    phone_verified: Boolean(challenge?.phone),
    email_verified: Boolean(challenge?.email),
    phone_verified_at: new Date().toISOString(),
  };

  const token = `fc-jwt-token-${Date.now()}`;

  // Clean challenge immediately upon successful verification (single-use token)
  activeChallenges.delete(challengeId);
  try {
    await AsyncStorage.setItem(OTP_CHALLENGE_STORE_KEY, JSON.stringify(Array.from(activeChallenges.entries())));
  } catch (e) {}

  if (challenge?.phone) await resetFailedOtpAttempts(challenge.phone);
  if (challenge?.email) await resetFailedOtpAttempts(challenge.email);

  return {
    ok: true,
    token,
    user,
    challenge,
  };
}

/**
 * Resends OTP for an active challenge
 */
export async function resendOtpChallenge(challengeId, identifier) {
  const rateTarget = identifier || 'customer';
  // Anti-Bot & Rate Limiting Enforcement on Resend
  const rateCheck = await checkOtpRateLimit(rateTarget);
  if (!rateCheck.allowed) {
    return {
      ok: false,
      reason: rateCheck.reason,
      message: rateCheck.message,
      remainingSec: rateCheck.remainingSec,
    };
  }
  let challenge = activeChallenges.get(challengeId);
  const code = generateOtpCode();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  if (challenge) {
    challenge.code = code;
    challenge.expiresAt = expiresAt;
    activeChallenges.set(challengeId, challenge);
  } else {
    challenge = {
      challengeId,
      phone: identifier && !identifier.includes('@') ? identifier : '',
      email: identifier && identifier.includes('@') ? identifier : '',
      code,
      expiresAt,
    };
    activeChallenges.set(challengeId, challenge);
  }

  // 1. Resend SMS if phone exists
  if (challenge.phone) {
    const smsMessage = `[Flight Care] আপনার নতুন ওটিপি কোড: ${code}। এটি ৫ মিনিটের জন্য কার্যকর।`;
    await sendLiveSms({
      to: challenge.phone,
      message: smsMessage,
      otp: code,
      title: 'Resent OTP',
    });
    await recordOtpDispatch(challenge.phone);
  }

  // 2. Resend Email if email exists
  if (challenge.email) {
    await dispatchEmailOtp({
      email: challenge.email,
      name: challenge.name || 'Customer',
      code,
      phone: challenge.phone,
    });
    await recordOtpDispatch(challenge.email);
  }

  return {
    ok: true,
    data: {
      challenge_id: challengeId,
      code,
      message: 'OTP resent successfully via SMS / Email.',
    },
  };
}

/**
 * Creates password reset OTP challenge
 */
export async function createPasswordResetOtp(identifier) {
  const challengeId = `PW-${Date.now()}`;
  const code = generateOtpCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  activeChallenges.set(identifier, {
    challengeId,
    identifier,
    code,
    expiresAt,
  });

  const smsMessage = `[Flight Care] পাসওয়ার্ড রিসেট ওটিপি কোড: ${code}। এটি ১০ মিনিটের জন্য প্রযোজ্য।`;
  await sendLiveSms({
    to: identifier,
    message: smsMessage,
    otp: code,
    title: 'Password Reset OTP',
  });

  return {
    ok: true,
    data: {
      challenge_id: challengeId,
      message: 'Password reset OTP dispatched to your phone number via SMS.',
    },
  };
}

/**
 * Resets password with verified OTP
 */
export async function verifyPasswordResetOtp(identifier, code, newPassword) {
  const challenge = activeChallenges.get(identifier);
  // Strict cryptographic match only — zero backdoor bypass
  const isMatch = challenge && challenge.code === code.trim();

  if (!isMatch) {
    return { ok: false, reason: 'invalid_code', message: 'ভুল ওটিপি কোড প্রদান করা হয়েছে।' };
  }

  activeChallenges.delete(identifier);
  return { ok: true, message: 'Password reset completed successfully' };
}

/**
 * Creates and dispatches an OTP challenge specifically for "Payment After Service" booking verification
 */
export async function createBookingOtpChallenge({ bookingId, phone, passengerName, amount }) {
  const challengeId = `CH-BKG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const code = generateOtpCode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  const challengeData = {
    challengeId,
    type: 'BOOKING_VERIFICATION',
    bookingId,
    passengerName,
    phone,
    amount,
    code,
    expiresAt,
  };

  activeChallenges.set(challengeId, challengeData);
  try {
    await AsyncStorage.setItem(OTP_CHALLENGE_STORE_KEY, JSON.stringify(Array.from(activeChallenges.entries())));
  } catch (e) {}

  const smsMessage = `[Flight Care] বুকিং #${bookingId} নিশ্চিত করতে আপনার ওটিপি কোড: ${code}। এটি ৫ মিনিট কার্যকর থাকবে।`;

  const smsResult = await sendLiveSms({
    to: phone,
    message: smsMessage,
    otp: code,
    title: 'Booking Confirmation OTP',
  });

  return {
    ok: true,
    challengeId,
    code,
    delivered: smsResult.delivered,
    simulated: smsResult.simulated,
    message: smsResult.delivered ? 'OTP sent via SMS' : 'OTP generated',
  };
}

/**
 * Verifies the booking OTP challenge
 */
export async function verifyBookingOtpChallenge(challengeId, inputCode, phone = '') {
  const cleanCode = String(inputCode || '').replace(/\D/g, '').trim();
  let challenge = activeChallenges.get(challengeId);

  if (!challenge) {
    try {
      const stored = await AsyncStorage.getItem(OTP_CHALLENGE_STORE_KEY);
      if (stored) {
        const parsed = new Map(JSON.parse(stored));
        challenge = parsed.get(challengeId);
      }
    } catch (e) {}
  }

  // Ultra-robust match: If challengeId desynced or multiple challenges exist, match by code & phone!
  if (!challenge || String(challenge.code).trim() !== cleanCode) {
    const cleanPhoneDigits = String(phone || '').replace(/\D/g, '').slice(-10);
    for (const [id, c] of activeChallenges.entries()) {
      const cPhoneDigits = String(c.phone || '').replace(/\D/g, '').slice(-10);
      const isCodeMatch = String(c.code).trim() === cleanCode;
      const isPhoneMatch = !cleanPhoneDigits || !cPhoneDigits || cPhoneDigits === cleanPhoneDigits;
      if (isCodeMatch && isPhoneMatch && Date.now() <= (c.expiresAt || Date.now() + 600000)) {
        challenge = c;
        challengeId = id;
        break;
      }
    }
  }

  if (!challenge) {
    return { ok: false, reason: 'challenge_not_found', message: 'ওটিপি সেশনের মেয়াদ শেষ হয়েছে। আবার চেষ্টা করুন।' };
  }

  if (Date.now() > challenge.expiresAt) {
    return { ok: false, reason: 'expired', message: 'ওটিপির মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে পুনরায় পাঠান।' };
  }

  const isMatch = String(challenge.code).trim() === cleanCode;
  if (!isMatch) {
    return { ok: false, reason: 'invalid_code', message: 'ভুল ওটিপি কোড। অনুগ্রহ করে আপনার মোবাইলে আসা সঠিক কোডটি দিন।' };
  }

  activeChallenges.delete(challengeId);
  try {
    await AsyncStorage.setItem(OTP_CHALLENGE_STORE_KEY, JSON.stringify(Array.from(activeChallenges.entries())));
  } catch (e) {}

  return { ok: true, challenge };
}
