import { getVaultSecret } from './securityVault.js';
// src/services/firebase.js
// Flight Care Enterprise Firebase Configuration, Auth & Real-Time Firestore Bridge

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

/**
 * Official Firebase Cloud Project Credentials
 * Project: FlightCare (flightcare-db2eb)
 */
export const FIREBASE_CONFIG = {
  apiKey: getVaultSecret('FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: "flightcare-db2eb.firebaseapp.com",
  projectId: "flightcare-db2eb",
  storageBucket: "flightcare-db2eb.appspot.com",
  messagingSenderId: "703627497643",
  appId: "1:703627497643:web:700e6121a70a37ae1327ee"
};

export const isFirebaseConfigured = () => {
  return Boolean(FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.projectId === "flightcare-db2eb");
};

// Initialize Firebase App
let firebaseApp;
if (getApps().length === 0) {
  firebaseApp = initializeApp(FIREBASE_CONFIG);
} else {
  firebaseApp = getApp();
}

// Initialize Firestore & Auth
export const firestoreDb = getFirestore(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);
export { firebaseApp };

// -----------------------------------------------------------------------------
// FIREBASE AUTHENTICATION HELPERS
// -----------------------------------------------------------------------------

/**
 * Sign in user with Email and Password
 */
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
    return { ok: true, user: userCredential.user };
  } catch (error) {
    return { ok: false, error: error.message, code: error.code };
  }
};

/**
 * Register new user with Email and Password
 */
export const registerWithEmail = async (email, password, displayName = '') => {
  try {
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
    return { ok: true, user: userCredential.user };
  } catch (error) {
    return { ok: false, error: error.message, code: error.code };
  }
};

/**
 * Sign in anonymously (for instant guest reservation flow)
 */
export const loginAnonymously = async () => {
  try {
    const userCredential = await signInAnonymously(firebaseAuth);
    return { ok: true, user: userCredential.user };
  } catch (error) {
    return { ok: false, error: error.message, code: error.code };
  }
};

/**
 * Sign out current user
 */
export const logoutFirebase = async () => {
  try {
    await signOut(firebaseAuth);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

/**
 * Subscribe to Firebase Auth state changes
 */
export const onFirebaseAuthStateChanged = (callback) => {
  return onAuthStateChanged(firebaseAuth, callback);
};

/**
 * Get current Firebase user
 */
export const getFirebaseCurrentUser = () => {
  return firebaseAuth?.currentUser || null;
};

// -----------------------------------------------------------------------------
// FIRESTORE REAL-TIME & CRUD HELPERS
// -----------------------------------------------------------------------------

/**
 * Subscribe to a Firestore collection with real-time onSnapshot updates
 * Returns an unsubscribe function.
 */
export const subscribeCollection = (collectionName, onUpdate, onError, constraints = []) => {
  try {
    const colRef = collection(firestoreDb, collectionName);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (onUpdate) onUpdate(items);
      },
      (err) => {
        console.warn(`[Firebase Firestore] Error subscribing to ${collectionName}:`, err.message);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn(`[Firebase Firestore] Failed to initialize subscription for ${collectionName}:`, err.message);
    return () => {};
  }
};

/**
 * Subscribe to a single Firestore document in real-time
 */
export const subscribeDoc = (collectionName, docId, onUpdate, onError) => {
  if (!docId) return () => {};
  try {
    const docRef = doc(firestoreDb, collectionName, String(docId));
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          if (onUpdate) onUpdate({ id: docSnap.id, ...docSnap.data(), exists: true });
        } else {
          if (onUpdate) onUpdate({ id: docSnap.id, exists: false });
        }
      },
      (err) => {
        console.warn(`[Firebase Firestore] Error subscribing to doc ${collectionName}/${docId}:`, err.message);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn(`[Firebase Firestore] Failed to initialize doc subscription for ${collectionName}/${docId}:`, err.message);
    return () => {};
  }
};

/**
 * Save or merge a document in Firestore
 */
export const saveFirestoreDoc = async (collectionName, docId, data, merge = true) => {
  if (!docId) return { ok: false, error: 'Document ID is required' };
  try {
    const docRef = doc(firestoreDb, collectionName, String(docId));
    await setDoc(docRef, {
      ...data,
      cloudUpdatedAt: serverTimestamp(),
    }, { merge });
    return { ok: true, id: String(docId) };
  } catch (error) {
    console.warn(`[Firebase Firestore] Error saving doc ${collectionName}/${docId}:`, error.message);
    return { ok: false, error: error.message };
  }
};

/**
 * Update an existing document in Firestore
 */
export const updateFirestoreDoc = async (collectionName, docId, updates) => {
  if (!docId) return { ok: false, error: 'Document ID is required' };
  try {
    const docRef = doc(firestoreDb, collectionName, String(docId));
    await updateDoc(docRef, {
      ...updates,
      cloudUpdatedAt: serverTimestamp(),
    });
    return { ok: true, id: String(docId) };
  } catch (error) {
    console.warn(`[Firebase Firestore] Error updating doc ${collectionName}/${docId}:`, error.message);
    return { ok: false, error: error.message };
  }
};

/**
 * Get a single document once from Firestore
 */
export const getFirestoreDoc = async (collectionName, docId) => {
  if (!docId) return { ok: false, error: 'Document ID is required' };
  try {
    const docRef = doc(firestoreDb, collectionName, String(docId));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ok: true, exists: true, data: { id: snap.id, ...snap.data() } };
    }
    return { ok: true, exists: false, data: null };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

/**
 * Get an entire collection once from Firestore
 */
export const getFirestoreCollection = async (collectionName, constraints = []) => {
  try {
    const colRef = collection(firestoreDb, collectionName);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
    const snap = await getDocs(q);
    const items = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    return { ok: true, items };
  } catch (error) {
    return { ok: false, error: error.message, items: [] };
  }
};

/**
 * Delete a document from Firestore
 */
export const deleteFirestoreDoc = async (collectionName, docId) => {
  if (!docId) return { ok: false, error: 'Document ID is required' };
  try {
    const docRef = doc(firestoreDb, collectionName, String(docId));
    await deleteDoc(docRef);
    return { ok: true, id: String(docId) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

/**
 * Universal Firestore REST API helper (Redundant Fallback)
 */
export const firestoreRestRequest = async (path, method = 'GET', body = null) => {
  if (!isFirebaseConfigured()) {
    return { ok: false, reason: 'not_configured', message: 'Firebase credentials not configured yet' };
  }

  const projectId = FIREBASE_CONFIG.projectId;
  const keyParam = FIREBASE_CONFIG.apiKey ? `?key=${FIREBASE_CONFIG.apiKey}` : '';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}${keyParam}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, error: errData?.error?.message || 'Firestore REST request failed' };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};
