# MOBILE PHASE 2 — DEVICE MATRIX

## 1. RUNTIME DEVICE SPECIFICATION
- **DEVICE_TYPE**: Android Emulator
- **DEVICE_MODEL**: Pixel 6 Pro (AVD)
- **ANDROID_VERSION**: Android 14.0 (API 34)
- **EXPO_RUNTIME**: Expo SDK 52 (React Native 0.76.7)
- **BACKEND_CONNECTION_MODE**: Native Host Bridge (`http://10.0.2.2:3000/api/v1` / `http://localhost:3000/api/v1`)

---

## 2. COMPONENT DEVICE MATRIX

| Flow Step | Android UI Element | API Endpoint | DB Table | Web View Path | Result |
|---|---|---|---|---|---|
| **WBS Load** | `ProgressMainScreen` (Tab: WBS) | `GET /projects/{id}/wbs` | `WbsItem` | `/projects/{id}` | **PASS** |
| **WBS Expand** | ExpandToggleBtn (`▶ / ▼`) | Client state | N/A | N/A | **PASS** |
| **Select Leaf** | `recordActionBtn` | Navigation params | N/A | N/A | **PASS** |
| **Daily Form Load** | `NewDailyProgressScreen` | Fetch daily items | `FieldProgressTemplate` | `/projects/{id}/field-progress/daily` | **PASS** |
| **Valid Entry Submit** | `submitBtn` (quantity=22.75) | `POST /projects/{id}/progress/daily` | `FieldProgressEntry` | `/projects/{id}/field-progress/daily` | **PASS** |
| **Decimal Normalization** | Input `22,75` -> `22.75` | Payload `22.75` | Numeric `22.75` | Format `22,75 m³` | **PASS** |
| **Invalid Quantity Guard** | Alert banner (`-10`) | Blocked locally (0 req) | 0 records | Unchanged | **PASS** |
| **Double Tap Lock** | Disabled button + spinner | 1 active HTTP request | 1 DB record | 1 row | **PASS** |
| **History Feed Sync** | `ProgressMainScreen` (Tab: History) | `GET /projects/{id}/progress/daily` | `FieldProgressEntry` | Unchanged | **PASS** |
| **Unauthenticated Request** | Auth Token empty | 401 Unauthorized | 0 records | Unchanged | **PASS** |
