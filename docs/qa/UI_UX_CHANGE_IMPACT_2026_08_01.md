# BÁO CÁO PHẠM VI BẮT ĐẦU CẢI TỔ UI/UX VÀ RỦI RO GIAO DIỆN (UI UX CHANGE IMPACT REPORT)

**Ngày báo cáo:** 01/08/2026  
**Dự án:** `construction-erp-v2`  
**Trạng thái kiểm tra:** NO-GO (Đang tiến hành rà soát, tái hiện và sửa lỗi UI/UX trên toàn bộ 44 route)

---

## I. MA TRẬN FILE ĐÃ ĐƯỢC KHOÁ VÀ PHÂN TÍCH RỦI RO UI/UX

| File | Loại thay đổi | Route ảnh hưởng | Rủi ro giao diện | Rủi ro nghiệp vụ | Đã runtime test |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `src/components/layout/global-project-context-switcher.tsx` | Modified | All Routes (`Header`) | Panel lệch vị trí, z-index, text chồng nhau, mobile layout | Sai project selection | **Đang refactor** |
| `src/components/layout/header.tsx` | Modified | All Routes (`Header`) | Backdrop modal tìm kiếm, notification bell, sticky header | Nuốt event click | **Đang refactor** |
| `src/components/supervision-weekly/*` | Modified | `/reports/weekly-inspection/*`, `/supervision/weekly/*` | Toolbar nổi giữa bảng, row height quá lớn, whitespace | Mất dữ liệu báo cáo | **Đang refactor** |
| `src/components/safety/safety-weekly-file-workspace.tsx` | Modified | `/reports/safety/weekly-files/[id]` | Tab navigation, A4 preview spacing | Sai format in ấn | **PASS mẫu** |
| `src/components/ui/unified-action-menu.tsx` | Modified | All Routes | Portal z-index, viewport flip, single-click | Action menu không mở | **PASS mẫu** |
| `src/components/ui/confirm-dialog.tsx` | Modified | All Dialogs | Modal backdrop pointer events | Vô tình đóng modal | **PASS mẫu** |
| `src/components/ui/app-drawer.tsx` | Modified | All Drawers | Drawer z-index layer 3, scroll container | Drawer bị che | **PASS mẫu** |
| `src/components/ui/editable-combobox.tsx` | Modified | All Forms | Combobox dropdown truncation | Sai giá trị chọn | **PASS mẫu** |
| `src/app/layout.tsx` | Modified | All Routes | App shell z-index stacking context | Root overflow | **PASS mẫu** |

---

## II. KẾ HOẠCH THỰC THI CHUẨN HÓA UI/UX THEO SÓNG (BATCHES)

1. **Batch 1 (Global Shell):** Refactor `GlobalProjectContextSwitcher`, Header Search Modal, Notification Bell, Mobile Navigation.
2. **Batch 2 (Weekly Supervision & Safety Reports Editor):** Sửa Toolbar nổi giữa bảng, tối ưu padding/density table row, line-height và date 2099 audit.
3. **Batch 3 (Dashboard & Analytics):** Chuẩn hóa KPI cards, grid spacing, visual charts.
4. **Batch 4 (Projects & Materials & Documents):** Refactor data tables, filters, forms, responsive viewports.
