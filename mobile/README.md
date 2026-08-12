# CONSTRUCTION-ERP-V2 — MOBILE APPLICATION (PHASE 1)

This repository contains the mobile application for **Construction ERP V2**, built with **React Native**, **Expo SDK 57**, **Expo Router**, and **TypeScript**.

---

## 1. PREREQUISITES
- Node.js v20.x or later
- npm or yarn
- Expo Go app on physical device OR Android Studio (Android Emulator) / Xcode (iOS Simulator)
- `construction-erp-v2` backend running at `http://localhost:3000` (or accessible local IP)

---

## 2. ENVIRONMENT SETUP
Create `.env.local` inside the `mobile/` directory:

```bash
# For Android Emulator:
EXPO_PUBLIC_API_ORIGIN=http://10.0.2.2:3000

# For Local Web Dev / iOS Simulator:
EXPO_PUBLIC_API_ORIGIN=http://127.0.0.1:3000

# For Physical Device on LAN:
EXPO_PUBLIC_API_ORIGIN=http://192.168.x.x:3000
```

---

## 3. INSTALLATION & RUNNING

```bash
# Navigate to mobile app directory
cd mobile

# Install dependencies
npm install

# Check TypeScript & Expo health
npx tsc --noEmit
npx expo-doctor

# Start Expo Development Server
npm start

# Run directly on Android Emulator
npm run android

# Run on iOS Simulator (macOS required)
npm run ios
```

---

## 4. PHASE 1 SCOPE
- **Foundation**: Expo SDK 57, Expo Router, TypeScript, Expo SecureStore.
- **Authentication**: Login with credentials, secure Bearer token storage, server token revocation on logout.
- **User Session**: Fetching user profile via `/api/v1/me`.
- **Project Selection**: Fetching real projects assigned to the user via `/api/v1/projects`.
- **Project Dashboard**: Displaying real operational metrics via `/api/v1/projects/{projectId}/dashboard`.

---

## 5. SECURITY & TOKEN STORAGE
- Bearer tokens are stored exclusively using `expo-secure-store` (`src/auth/secure-token.ts`).
- No sensitive keys or tokens are stored in `AsyncStorage`, `localStorage`, or global state.
