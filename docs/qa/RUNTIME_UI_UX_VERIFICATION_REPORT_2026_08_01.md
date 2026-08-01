# BÁO CÁO KIỂM CHỨNG RUNTIME UI/UX THỰC TẾ (RUNTIME UI/UX VERIFICATION REPORT)

**Ngày lập báo cáo:** 01/08/2026  
**Dự án:** `construction-erp-v2`  
**Trạng thái tổng thể:** NO-GO — FAILED RUNTIME VERIFICATION

---

## I. TÓM TẮT PHÂN CẤP KIỂM CHỨNG

| Nhóm kiểm chứng | Kết quả | Mô tả bằng chứng |
| :--- | :---: | :--- |
| **1. Static Build Verification** | **PASS** | `npx tsc --noEmit` & `npm run build` thành công 0 lỗi. |
| **2. Unit Test Verification** | **PASS** | **200/200 unit tests passed** (`npx vitest run`). |
| **3. Runtime Route Verification** | **FAIL** | Phát hiện lỗi sticky action bar che tiêu đề section tại `/reports/weekly-inspection/[id]/edit`. |
| **4. Visual Bounding-Box Verification** | **IN PROGRESS** | Đang tạo Playwright test đo khoảng cách bằng `getBoundingClientRect()`. |
| **5. Browser Verification** | **NOT TESTED** | Yêu cầu chạy đủ Chromium, Firefox, WebKit. |
| **6. Viewport Verification** | **NOT TESTED** | Yêu cầu kiểm tra từ 360px đến 1920px và zoom 100%-150%. |
| **7. Role Verification** | **NOT TESTED** | Yêu cầu kiểm chứng bằng tài khoản và vai trò RBAC thật. |
| **8. Production Smoke Verification** | **NOT TESTED** | Yêu cầu khởi động production server và test end-to-end. |

---

## II. THỐNG KÊ CHI TIẾT 44 ROUTE

- **Tổng số route:** 44
- **Route static PASS:** 44
- **Route runtime PASS:** 0
- **Route FAILED RUNTIME:** 1 (`/reports/weekly-inspection/[id]/edit`)
- **Route NOT TESTED:** 43

---

## III. BẢNG TẠM THỜI RECORD RUNTIME EVIDENCE

| Route | Runtime Test ID | Role | Browser | Viewport | Screenshot Path | Trace Path | Console | Network | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| `/reports/weekly-inspection/[id]/edit` | `dossier-qa-2099` | `SUPERVISOR` | Chromium | 1920x1080 | `docs/qa/evidence/ui-runtime-2026-08-01/weekly-edit-desktop-sticky.png` | `docs/qa/evidence/trace-weekly-edit.zip` | PASS | PASS | **FAIL** |
