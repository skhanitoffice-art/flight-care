# Flight Care - Android Application Guide (Quasar & Capacitor)

This guide explains how to package and build the **Flight Care** mobile application for Android using **Quasar** and **Capacitor**.

---

## 📱 Architecture Overview

1. **Core Web Bundle (`dist/`)**:
   - The React Native / Web application is exported into optimized HTML, JavaScript, and asset bundles inside `dist/`.
2. **Capacitor Android Shell (`android/`)**:
   - Capacitor wraps the `dist/` bundle inside a native Android Web View (`BridgeActivity`) with native hardware bridge plugins:
     - Push & Local Notifications (`@capacitor/push-notifications`)
     - Android Status Bar & Splash Screen
     - Native Deep Links & Intent Filters (`flightcare://`) for bKash PGW return flows.
3. **Quasar Compatibility (`quasar.config.js`)**:
   - The project includes Quasar configuration for hybrid and PWA deployment.

---

## 🚀 Quick Start (Building the Android App)

### Step 1: Export Web Bundle
Run the Expo web export command to generate the production assets:
```bash
npm run export:web
# or: npx expo export -p web --output-dir dist
```

### Step 2: Sync Assets to Android
Sync the exported assets to the native Android directory:
```bash
npx cap sync android
```

### Step 3: Open in Android Studio or Compile APK
- **To open in Android Studio:**
  ```bash
  npx cap open android
  ```
  Then click **Build > Build Bundle(s) / APK(s) > Build APK(s)** in Android Studio.

- **Or compile directly from the command line:**
  ```bash
  cd android
  ./gradlew assembleDebug
  ```
  The generated APK will be located at:
  `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 💳 bKash Payment Gateway Deep Linking

The Android Manifest (`android/app/src/main/AndroidManifest.xml`) is configured with the `flightcare://` URL scheme:
- When the bKash payment gateway completes a transaction, it redirects back to `flightcare://payment/bkash/callback?trxId=...` which seamlessly brings the user back into the Flight Care app with real-time confirmation.

---

## 🔔 Communication & Push Notifications

The Android app is configured with `POST_NOTIFICATIONS` permission to receive real-time updates for:
- bKash payment receipts
- Protocol staff dispatch alerts & meeting points
- Service milestone progression
- Booking cancellation & refunds

