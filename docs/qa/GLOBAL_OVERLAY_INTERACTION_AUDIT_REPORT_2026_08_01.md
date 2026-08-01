# BÁO CÁO CẢI TỔ VÀ HOÀN THIỆN CHUẨN TƯƠNG TÁC THÀNH PHẦN NỔI (GLOBAL OVERLAY INTERACTION AUDIT REPORT)

**Ngày báo cáo:** 01/08/2026  
**Dự án:** `construction-erp-v2`  
**KẾT LUẬN HIỆN TẠI:** **NO-GO — CHƯA HOÀN THÀNH TOÀN BỘ HỆ THỐNG**

---

## I. TỔNG QUAN PHẠM VI VÀ KHOẢNG CÁCH MIGRATION

1. **Tổng số route phát hiện trong hệ thống (`src/app`):** 44 routes
2. **Tổng số overlay instance phát hiện:** 533 instances
3. **Số instance đã đạt chuẩn primitive mới:** 38 instances
4. **Số instance chưa migrate / chưa kiểm chứng runtime:** 495 instances
5. **Tỷ lệ hoàn thành thực tế:** **7.13%** (38/533)

> [!WARNING]
> **ĐÁNH GIÁ CHẤT LƯỢNG HỆ THỐNG:**  
> Hệ thống hiện tại **CHƯA ĐẠT CHUẨN GO PRODUCTION**. Đã hoàn thành refactor và chuẩn hóa tương tác portal/single-click cho `SafetyWeeklyFileWorkspace` (`/reports/safety/weekly-files/[weeklyFileId]`), loại bỏ hoàn toàn `useState` menu cục bộ và `e.stopPropagation()`. Cần tiếp tục triển khai migrate 495 instances còn lại trên 10 sóng (Waves) phát triển và chạy test suite toàn diện.

---

## II. THÔNG TIN TIẾN ĐỘ THỰC HIỆN ROUTE ĐẠI DIỆN: `/reports/safety/weekly-files/[weeklyFileId]`

### 1. Các component đã refactor:
- **`SafetyWeeklyFileWorkspace` (`src/components/safety/safety-weekly-file-workspace.tsx`):**
  - Chuyển dropdown "Xem trước" (Preview Plan/Assessment) sang `UnifiedActionMenu` tích hợp `GlobalOverlayProvider`.
  - Chuyển 3-dots action menu ("Xóa hồ sơ") sang `UnifiedActionMenu`.
  - Chuyển hộp thoại xác nhận xóa sang `ConfirmDialog` với cơ chế bảo vệ modal nguy hiểm (không thể đóng khi bấm backdrop, chỉ đóng qua nút Hủy / Esc).
  - Chuẩn hóa tabindex (0 / -1) và điều hướng phím mũi tên Left/Right trên bộ chuyển Tab "Kế hoạch kiểm tra" / "Báo cáo tự đánh giá".

### 2. Kết quả kiểm thử tương tác (Interaction Standards Checklist):
- [x] **Chuyển menu 1-click (Single-Click Switching):** Khi đang mở menu 3-dots hoặc Xem trước, bấm sang nút Xem trước / Dự án / Thông báo thì menu cũ đóng ngay lập tức và menu mới mở ra song song trong 1 cú click.
- [x] **Đóng khi bấm ngoài (Click-Outside Dismissal):** Bấm ra ngoài khu vực trống trên màn hình, menu đang mở lập tức đóng lại mà không gây delay hay nuốt event.
- [x] **Đóng bằng phím Escape:** Nhấn phím `Escape` khi menu đang mở, menu lập tức đóng và con trỏ focus quay về trigger button.
- [x] **Bảo vệ Modal nguy hiểm (Dangerous Action Protection):** Modal xác nhận xóa hồ sơ tuần (`ConfirmDialog`) bắt buộc tương tác trực tiếp, ngăn chặn việc vô tình đóng modal khi bấm nhầm backdrop.

---

## III. MA TRẬN TEST VÀ BẰNG CHỨNG (EVIDENCE MATRIX)

- **Inventory Đầy Đủ:** `docs/qa/GLOBAL_OVERLAY_COMPLETE_INVENTORY_2026_08_01.md`
- **Route Manifest:** `docs/qa/GLOBAL_OVERLAY_ROUTE_MANIFEST_2026_08_01.md`
- **Migration Gap Report:** `docs/qa/GLOBAL_OVERLAY_MIGRATION_GAP_REPORT_2026_08_01.md`
- **Chi tiết Kịch bản E2E:** `scripts/qa/overlay-safety-weekly-file-detail-e2e.spec.ts`
- **Thư Mục Bằng Chứng:** `docs/qa/evidence/global-overlay-2026-08-01/`

---

## IV. KẾ HOẠCH BỨC PHÁ CHO CÁC SÓNG TIẾP THEO

1. Migrate các module còn lại (`/materials`, `/approvals`, `/users`, `/settings`, `/projects`, `/dashboard`).
2. Xây dựng và thực thi các Playwright E2E suite theo từng module:
   - `scripts/qa/overlay-dashboard-e2e.spec.ts`
   - `scripts/qa/overlay-projects-e2e.spec.ts`
   - `scripts/qa/overlay-reports-e2e.spec.ts`
   - `scripts/qa/overlay-safety-e2e.spec.ts`
   - `scripts/qa/overlay-documents-e2e.spec.ts`
   - `scripts/qa/overlay-materials-e2e.spec.ts`
   - `scripts/qa/overlay-approvals-e2e.spec.ts`
   - `scripts/qa/overlay-accounts-settings-e2e.spec.ts`
3. Cập nhật bằng chứng chi tiết đến khi tỷ lệ hoàn thành đạt 100% (Gap = 0).
