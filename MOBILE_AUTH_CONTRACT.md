# MOBILE AUTHENTICATION CONTRACT & ADAPTER SPECIFICATION

**System:** `construction-erp-v2`  
**Status:** `READY` (Dual-Mode Web Cookie + Mobile Bearer Session Adapter)  
**Date:** August 12, 2026  

---

## 1. Executive Strategy

`construction-erp-v2` supports a **Dual-Mode Session Architecture**:

1. **Web Dashboard Clients:** Authenticates via HTTP-Only `auth_session` cookies.
2. **Mobile App Clients (React Native / Flutter / iOS / Android):** Authenticates via `Authorization: Bearer <session_token>` header or `x-session-token` header.

Both authentication modes utilize the exact same cryptographic session token signed via HMAC SHA-256 (`src/lib/session-token.ts`), ensuring zero duplication of authentication state or logic.

---

## 2. Token Lifetime & Security Controls

- **Token Format:** Base64Url Payload + Base64Url HMAC SHA-256 Signature (`<payload>.<signature>`)
- **Max Age:** 7 Days (604,800 seconds)
- **Rotation / Invalidation:** Credential Versioning bound to `user.updatedAt`. Updating user password/status invalidates all issued session tokens immediately.
- **Storage Recommendation for Mobile:**
  - **iOS:** Keychain via `react-native-keychain` / `flutter_secure_storage`
  - **Android:** EncryptedSharedPreferences (KeyStore)

---

## 3. Mobile Authentication API Endpoints

### 3.1 Mobile Login (`POST /api/v1/auth/login`)
- **Request Body:**
  ```json
  {
    "email": "user@construction.local",
    "password": "password123"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJ1c2VySWQiOiJj...",
      "expiresAt": "2026-08-19T10:00:00.000Z",
      "user": {
        "id": "usr_123",
        "email": "user@construction.local",
        "name": "Nguyễn Văn A",
        "role": "PROJECT_MANAGER"
      }
    }
  }
  ```

### 3.2 Mobile Session Request Header
For all subsequent requests to `/api/v1/**`:
```http
Authorization: Bearer eyJ1c2VySWQiOiJj...
```
Or:
```http
x-session-token: eyJ1c2VySWQiOiJj...
```

### 3.3 Current User Info (`GET /api/v1/me`)
- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "usr_123",
      "email": "user@construction.local",
      "name": "Nguyễn Văn A",
      "role": "PROJECT_MANAGER",
      "assignedProjects": [
        {
          "id": "prj_456",
          "name": "Chung cư Sunrise Tower",
          "role": "PROJECT_MANAGER"
        }
      ]
    }
  }
  ```

### 3.4 Mobile Logout (`POST /api/v1/auth/logout`)
- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Đã đăng xuất thành công."
    }
  }
  ```
