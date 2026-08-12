# CONSTRUCTION-ERP-V2 — MOBILE PHASE 1 ARCHITECTURE SPECIFICATION

## 1. TECHNOLOGY BASELINE & VERSIONS
- **Mobile Framework**: React Native `0.86.2`
- **Application Platform**: Expo SDK `57.0.12`
- **Router**: Expo Router `57.0.12` (File-based navigation)
- **Language**: TypeScript `6.0.3`
- **Secure Storage**: `expo-secure-store` `57.0.0`
- **Node Environment**: v20.x

---

## 2. FOLDER STRUCTURE & ARCHITECTURE SEPARATION

```
mobile/
├── app/                        # Expo Router Pages & Navigation Stack
│   ├── _layout.tsx              # Root Layout & Auth Guard Navigation Machine
│   ├── (auth)/
│   │   ├── _layout.tsx          # Public Auth Group Stack
│   │   └── login.tsx            # Login Screen
│   └── (app)/
│       ├── _layout.tsx          # Authenticated App Stack & Header Bar
│       ├── projects/
│       │   ├── index.tsx        # Projects List Screen ("Công trình của tôi")
│       │   └── [projectId].tsx  # Project Home / Dashboard Screen
│       └── profile/
│           └── index.tsx        # User Profile & Logout Screen
│
├── src/
│   ├── api/                     # Central HTTP Layer
│   │   ├── client.ts            # Central API Client (Timeout, Headers, 401/403/5xx Handling)
│   │   ├── types.ts             # Shared API Response Envelope Contracts
│   │   ├── auth-api.ts          # Auth Services (Login, Logout, Me)
│   │   └── projects-api.ts      # Projects & Dashboard Services
│   │
│   ├── auth/                    # Auth Domain State & Storage
│   │   ├── auth-context.tsx     # Auth Context Provider (BOOTSTRAPPING | UNAUTHENTICATED | AUTHENTICATED | ERROR)
│   │   ├── auth-types.ts        # User Profile & Auth State Interfaces
│   │   └── secure-token.ts      # Platform-safe SecureStore Abstraction
│   │
│   ├── project/                 # Project Scope Domain Context
│   │   ├── project-context.tsx  # Selected Project State Provider
│   │   └── project-types.ts     # Project & Metrics Interfaces
│   │
│   └── constants/               # Global Configuration & Vietnamese Mappings
│       ├── config.ts            # EXPO_PUBLIC_API_ORIGIN & API_V1_BASE_URL
│       └── role-labels.ts       # Technical Role to Vietnamese Label Translation
│
├── .env.example
├── .env.local
└── package.json
```

---

## 3. AUTHENTICATION & SECURE TOKEN MANAGEMENT
1. **Token Storage**: Handled exclusively via `expo-secure-store` in `src/auth/secure-token.ts`. Zero use of `AsyncStorage` or `localStorage` for tokens.
2. **Auth State Machine**:
   - `BOOTSTRAPPING`: Checking `getToken()` & validating session with `/api/v1/me`.
   - `UNAUTHENTICATED`: User directed to Login screen.
   - `AUTHENTICATED`: Session active, user directed to Projects list.
   - `ERROR`: Server or network unreachable on startup (Token retained, Retry option provided).

---

## 4. ERROR HANDLING & HTTP POLICIES
- **HTTP 401 (Unauthorized)**: Clears token via `deleteToken()`, resets Auth Context state, redirects to Login screen.
- **HTTP 403 (Forbidden)**: Displays Vietnamese permission warning. Does **NOT** logout user or clear token.
- **HTTP 5xx (Server Error)**: Displays user-friendly Vietnamese message ("Hệ thống đang gặp sự cố. Vui lòng thử lại sau.").
- **Network Error / Timeout**: AbortController triggers after 15s timeout. **DOES NOT CLEAR VALID TOKEN**. Displays connection retry banner.
