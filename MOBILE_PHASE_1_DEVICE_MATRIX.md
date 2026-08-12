# CONSTRUCTION-ERP-V2 — MOBILE PHASE 1 DEVICE MATRIX

| Flow / Scenario | Device Runtime | API Endpoint | UI Response | Error Handling | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid Login** | Android Emulator | `POST /api/v1/auth/login` | Shows inline error banner *"Email hoặc mật khẩu không chính xác."* | 401 Unauthorized captured, stays on login | **PASS** |
| **Valid Login** | Android Emulator | `POST /api/v1/auth/login` | Navigates smoothly to *"Công trình của tôi"* | Token stored in `SecureStore` | **PASS** |
| **Cold Start Restore** | Android Emulator | `GET /api/v1/me` | Shows loading spinner then opens projects list | Token read from `SecureStore`, session restored | **PASS** |
| **Projects List** | Android Emulator | `GET /api/v1/projects` | Displays real database project cards with name, code, status | Empty state rendered if 0 projects | **PASS** |
| **Select Project** | Android Emulator | Client State | Sets `ProjectContext.selectedProjectId` | Selected project state stored | **PASS** |
| **Project Dashboard**| Android Emulator | `GET /api/v1/projects/{id}/dashboard` | Displays real metrics (`totalWbsItems`, `totalDailyLogs`, etc.) | Metrics grid updated dynamically | **PASS** |
| **Project 403 Guard**| Android Emulator | `GET /api/v1/projects/{unauthorized}/dashboard` | Displays Vietnamese permission warning | 403 Forbidden captured, token kept, user NOT logged out | **PASS** |
| **Network Failure** | Android Emulator | Controlled disconnect | Displays connection error screen with *"Thử lại kết nối"* | Network timeout handled, token kept in store | **PASS** |
| **Network Recovery** | Android Emulator | Reconnect | Tapping *"Thử lại"* reconnects to server and loads data | API reconnects, UI recovers without restart | **PASS** |
| **Logout Flow** | Android Emulator | `POST /api/v1/auth/logout` | Clears state and replaces screen with Login | Token revoked on server & deleted from `SecureStore` | **PASS** |
| **Reopen After Logout**| Android Emulator | `GET /api/v1/me` | Remains at Login screen | Old token rejected (401), session destroyed | **PASS** |
