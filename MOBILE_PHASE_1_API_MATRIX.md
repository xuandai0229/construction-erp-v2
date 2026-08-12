# CONSTRUCTION-ERP-V2 — MOBILE PHASE 1 API CONSUMPTION MATRIX

| Screen / Flow | HTTP Method | Endpoint | Auth Required | Runtime Test Proof | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Login Flow** | `POST` | `/api/v1/auth/login` | Public | Valid credentials return 200 & Bearer token | **CERTIFIED PASS** |
| **Invalid Login** | `POST` | `/api/v1/auth/login` | Public | Invalid password returns 401 Unauthorized | **CERTIFIED PASS** |
| **User Profile** | `GET` | `/api/v1/me` | Bearer Token | Returns user profile & role | **CERTIFIED PASS** |
| **Projects List** | `GET` | `/api/v1/projects` | Bearer Token | Returns array of assigned real projects | **CERTIFIED PASS** |
| **Project Dashboard**| `GET` | `/api/v1/projects/{id}/dashboard` | Bearer Token | Returns real metrics (`totalWbsItems`, `totalDailyLogs`,...) | **CERTIFIED PASS** |
| **Logout & Revocation**| `POST` | `/api/v1/auth/logout` | Bearer Token | Revokes session on server, subsequent `/me` returns 401 | **CERTIFIED PASS** |
