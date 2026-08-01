# AUDIT VÀ KIỂM KÊ TOÀN BỘ THÀNH PHẦN NỔI TƯƠNG TÁC (GLOBAL OVERLAY INTERACTION INVENTORY)

**Ngày kiểm kê:** 01/08/2026  
**Dự án:** `construction-erp-v2`  
**Phạm vi:** Toàn bộ hệ thống (Desktop, Tablet, Mobile, 9 User Roles)

---

## 1. DÂN SÁCH THÀNH PHẦN KIỂM KÊ (OVERLAY INVENTORY MATRIX)

| Component | Đường dẫn file | Loại | Route sử dụng | Cách quản lý state | Click outside | Escape | Focus | Portal | Tình trạng |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `header` | `src/components/layout/header.tsx` | Header & User Menu | `All Routes (Global Shell)` | React useState | Partial (mousedown) | Missing | Unmanaged | No | `NEEDS_REFACTOR` |
| `global-notification-bell` | `src/components/layout/global-notification-bell.tsx` | Notification Popover | `All Routes (Header)` | React useState | Yes (click-outside) | Missing | Unmanaged | No | `NEEDS_REFACTOR` |
| `global-project-context-switcher` | `src/components/layout/global-project-context-switcher.tsx` | Project Switcher Select | `All Routes (Header)` | React useState | Yes (click-outside) | Missing | Unmanaged | No | `NEEDS_REFACTOR` |
| `global-search-command` | `src/components/layout/global-search-command.tsx` | Command Menu Modal | `All Routes (Keyboard / Header)` | React useState | Yes (Backdrop) | Yes (Escape key) | Trapped | Yes (Body) | `NEEDS_REFACTOR` |
| `mobile-bottom-nav` | `src/components/layout/mobile-bottom-nav.tsx` | Mobile Navigation Menu | `Mobile Viewports` | React useState | Yes (Backdrop) | Yes | Unmanaged | No | `NEEDS_REFACTOR` |
| `mobile-project-context-bar` | `src/components/layout/mobile-project-context-bar.tsx` | Mobile Project Switcher Sheet | `Mobile Viewports` | React useState | Yes (Backdrop) | Yes | Unmanaged | Yes | `NEEDS_REFACTOR` |
| `app-drawer` | `src/components/ui/app-drawer.tsx` | Drawer / Sheet | `Global Shared UI` | Props open/onClose | Yes (Overlay click) | Yes (KeyDown) | Trapped | Yes (Body) | `NEEDS_REFACTOR` |
| `confirm-dialog` | `src/components/ui/confirm-dialog.tsx` | Destructive Confirm Modal | `Global Shared UI` | Props isOpen/onClose | Disabled (Safe) | Yes | Trapped | Yes (Body) | `NEEDS_REFACTOR` |
| `reason-dialog` | `src/components/ui/reason-dialog.tsx` | Reason Input Modal | `Global Shared UI` | Props isOpen/onClose | Disabled (Form Guard) | Yes | Trapped | Yes (Body) | `NEEDS_REFACTOR` |
| `editable-combobox` | `src/components/ui/editable-combobox.tsx` | Combobox / Select | `Global Shared UI` | React useState | Yes (mousedown) | Yes | Partial | Yes (Body) | `NEEDS_REFACTOR` |
| `enterprise-combobox` | `src/components/ui/enterprise-combobox.tsx` | Enterprise Combobox | `Global Shared UI` | React useState | Yes (mousedown) | Yes | Partial | Yes (Body) | `NEEDS_REFACTOR` |
| `date-field-vn` | `src/components/ui/date-field-vn.tsx` | Date Picker Popover | `Global Shared UI` | React useState | Yes (mousedown) | Missing | Unmanaged | No | `NEEDS_REFACTOR` |
| `overflow-tooltip-text` | `src/components/ui/overflow-tooltip-text.tsx` | Interactive Tooltip | `Global Shared UI` | React useState | Hover / Touch | Missing | Unmanaged | No | `NEEDS_REFACTOR` |
| `safety-row-action-portal-menu` | `src/components/safety/safety-row-action-portal-menu.tsx` | Three-Dots Action Menu | `/reports/safety/weekly` | React useState | Yes (pointerdown) | Yes | Returned | Yes (Body) | `NEEDS_REFACTOR` |
| `safety-row-action-menu` | `src/components/safety/safety-row-action-menu.tsx` | Row Action Menu (Inline) | `/reports/safety/weekly` | React useState | Yes (click-outside) | Missing | Unmanaged | No | `NEEDS_REFACTOR` |
| `safety-list-client` | `src/components/safety/safety-list-client.tsx` | Filter & Action Overlays | `/reports/safety/weekly` | React useState | Partial | Partial | Unmanaged | Yes | `NEEDS_REFACTOR` |
| `safety-assessment-editor` | `src/components/safety/safety-assessment-editor.tsx` | Editor Modals & Comboboxes | `/reports/safety/self-assessments/*` | React useState | Yes | Yes | Trapped | Yes | `NEEDS_REFACTOR` |
| `safety-plan-editor` | `src/components/safety/safety-plan-editor.tsx` | Plan Editor Modals | `/reports/safety/plans/*` | React useState | Yes | Yes | Trapped | Yes | `NEEDS_REFACTOR` |
| `safety-item-picker-modal` | `src/components/safety/safety-item-picker-modal.tsx` | Item Picker Modal | `/reports/safety/*` | React useState | Backdrop | Yes | Trapped | Yes | `NEEDS_REFACTOR` |
| `row-action-menu` | `src/components/supervision-weekly/row-action-menu.tsx` | Three-Dots Action Menu | `/reports/weekly-inspection` | React useState | Yes (pointerdown) | Yes | Returned | Yes (Body) | `NEEDS_REFACTOR` |
| `weekly-list-client` | `src/components/supervision-weekly/weekly-list-client.tsx` | Filter & Action Overlays | `/reports/weekly-inspection` | React useState | Partial | Partial | Unmanaged | Yes | `NEEDS_REFACTOR` |
| `result-data-tables` | `src/components/supervision-weekly/result-data-tables.tsx` | Combobox & Row Action Menu | `/reports/weekly-inspection/*` | React useState | Partial | Partial | Unmanaged | No | `NEEDS_REFACTOR` |
| `smart-quantity-input` | `src/components/supervision-weekly/smart-quantity-input.tsx` | Quantity Combobox Popover | `/reports/weekly-inspection/*` | React useState | Yes | Yes | Managed | No | `NEEDS_REFACTOR` |
| `operational-dashboard` | `src/components/dashboard/operational-dashboard.tsx` | Filter & Action Menus | `/dashboard` | React useState | Partial | Partial | Unmanaged | No | `NEEDS_REFACTOR` |
| `executive-dashboard` | `src/components/dashboard/executive/executive-dashboard.tsx` | Filter & Export Popovers | `/dashboard` | React useState | Partial | Partial | Unmanaged | No | `NEEDS_REFACTOR` |
| `materials-catalog` | `src/components/materials/materials-catalog.tsx` | Action Menu & Dialog | `/materials/catalog` | React useState | Yes | Yes | Partial | Yes | `NEEDS_REFACTOR` |
| `material-form-dialog` | `src/components/materials/material-form-dialog.tsx` | Form Modal Dialog | `/materials/catalog` | React useState | Dirty Guarded | Yes | Trapped | Yes | `NEEDS_REFACTOR` |
| `material-detail-drawer` | `src/components/materials/material-detail-drawer.tsx` | Detail Drawer Sheet | `/materials/*` | React useState | Backdrop | Yes | Trapped | Yes | `NEEDS_REFACTOR` |
| `materials-stock-table` | `src/components/materials/materials-stock-table.tsx` | Stock Filter & Action Menu | `/materials/stock` | React useState | Partial | Partial | Unmanaged | No | `NEEDS_REFACTOR` |
| `materials-transactions` | `src/components/materials/materials-transactions.tsx` | Transaction Form & Filter | `/materials/transactions` | React useState | Yes | Yes | Trapped | Yes | `NEEDS_REFACTOR` |
| `material-request-list` | `src/components/material-request/material-request-list.tsx` | Filter & Action Menu | `/approvals/material-requests` | React useState | Partial | Partial | Unmanaged | No | `NEEDS_REFACTOR` |
| `material-request-form` | `src/components/material-request/material-request-form.tsx` | Request Form Modal | `/approvals/material-requests/new` | React useState | Dirty Guarded | Yes | Trapped | Yes | `NEEDS_REFACTOR` |
| `user-management-client` | `src/components/users/user-management-client.tsx` | User Action Menu & Modal | `/users` | React useState | Yes | Yes | Trapped | Yes | `NEEDS_REFACTOR` |
| `summary-desktop-view` | `src/components/field-progress/summary-desktop-view.tsx` | Progress Filter & Modal | `/projects/[id]/field-progress` | React useState | Partial | Partial | Unmanaged | No | `NEEDS_REFACTOR` |
| `summary-mobile-view` | `src/components/field-progress/summary-mobile-view.tsx` | Progress Mobile Sheet | `/projects/[id]/field-progress` | React useState | Yes | Yes | Trapped | Yes | `NEEDS_REFACTOR` |

---

## 2. NGUYÊN NHÂN LỖI TƯƠNG TÁC CHUNG NỔI BẬT

1. **Sự cố 2-Click (Single-Click Switch Failure)**:
   - Do sử dụng `mousedown` hoặc `click` listener trên `document` và gọi `e.stopPropagation()` / `e.preventDefault()`, khi người dùng bấm vào Nút B trong khi Menu A đang mở, cú bấm đầu tiên bị nút A nuốt sự kiện để đóng A. Người dùng bắt buộc phải bấm Nút B lần 2 để kích hoạt B.

2. **Z-Index Không Thống Nhất**:
   - Sự rải rác của `z-[999]`, `z-[9999]`, `z-[99999]`, `z-50` gây đè đè không kiểm soát giữa Header, Table Action Menu, Modal và Tooltip.

3. **Chưa Tự Động Đóng Khi Đổi Route**:
   - Các popover, dropdown, notification menu chưa lắng nghe sự thay đổi của Router (`usePathname`), khiến menu mở vẫn tồn tại sang trang mới.

4. **Trang Thái Focus & Accessibility**:
   - Nhiều menu không trả focus về Nút Kích Hoạt khi đóng hoặc bấm Escape.
