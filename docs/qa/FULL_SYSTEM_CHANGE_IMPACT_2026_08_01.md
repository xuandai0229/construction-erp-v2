# BÁO CÁO TOÀN BỘ PHẠM VI VÀ ẢNH HƯỞNG THAY ĐỔI (FULL SYSTEM CHANGE IMPACT REPORT)

**Ngày báo cáo:** 01/08/2026  
**Dự án:** `construction-erp-v2`  
**Trạng thái kiểm tra:** KO-GO (Đang xử lý lỗi contract và rà soát lại toàn bộ hệ thống)

---

## I. DANH SÁCH FILE ĐÃ THAY ĐỔI VÀ PHÂN TÍCH RỦI RO

| File | Loại thay đổi | Component/API bị ảnh hưởng | Nơi sử dụng | Rủi ro | Đã kiểm tra |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `src/components/ui/unified-action-menu.tsx` | File mới | `UnifiedActionMenu`, `ActionMenuItem` | Row action menus, workspace menus, header menus | Contract mismatch (Missing runtime export `ActionMenuItem`) | **ĐANG SỬA GỐC** |
| `src/components/ui/global-overlay-manager.tsx` | File mới | `GlobalOverlayProvider`, `useClickOutside` | `src/app/layout.tsx`, interactive overlays | Z-index conflict, event propagation | Đã static check |
| `src/components/safety/safety-weekly-file-workspace.tsx` | Modified | `SafetyWeeklyFileWorkspace` | `/reports/safety/weekly-files/[weeklyFileId]` | Contract import error với `ActionMenuItem` | **ĐANG SỬA GỐC** |
| `src/components/supervision-weekly/row-action-menu.tsx` | Modified | `RowActionMenu` | Weekly inspection tables | Type vs runtime import of `ActionMenuItem` | Cần rà soát contract |
| `src/components/safety/safety-row-action-menu.tsx` | Modified | `SafetyRowActionMenu` | Safety tables | Migrated sang UnifiedActionMenu | Cần rà soát contract |
| `src/components/safety/safety-row-action-portal-menu.tsx` | Modified | `SafetyRowActionPortalMenu` | Safety list client table | Migrated sang UnifiedActionMenu | Cần rà soát contract |
| `src/components/layout/global-notification-bell.tsx` | Modified | `GlobalNotificationBell` | Header | Portal notification dropdown | Cần check runtime |
| `src/components/layout/global-project-context-switcher.tsx` | Modified | `GlobalProjectContextSwitcher` | Header | Project context dropdown | Cần check runtime |
| `src/components/layout/header.tsx` | Modified | `Header` | Layout root | Header overlays | Cần check runtime |
| `src/components/ui/app-drawer.tsx` | Modified | `AppDrawer` | Side drawers | Drawer z-index & focus | Cần check runtime |
| `src/components/ui/confirm-dialog.tsx` | Modified | `ConfirmDialog` | Confirmation modals | Danger modal backdrop protection | Cần check runtime |
| `src/components/ui/editable-combobox.tsx` | Modified | `EditableCombobox` | Form comboboxes | Outside click & focus | Cần check runtime |
| `src/app/layout.tsx` | Modified | `RootLayout` | App root | Provider initialization | Cần check runtime |
| `src/app/login/page.tsx` | Modified | `LoginPage` | `/login` | Auth session expired handling | Cần check runtime |
| `src/app/api/auth/login/route.ts` | Modified | Auth API | `/api/auth/login` | Session token creation | Cần check runtime |
| `scripts/qa/global-setup.ts` | Modified | Playwright Setup | E2E test suite | Reuse existing auth session | Handled |
| `src/lib/safety-reporting/__tests__/weekly-file-consolidation.test.ts` | Modified | Unit Test | Safety tests | Consolidation logic assertions | Handled |
| `tsconfig.json` | Modified | TS Config | Build / Typecheck | Include test files | Handled |

---

## II. KẾ HOẠCH SỬA LỖI TỔNG THỂ
1. Chuẩn hóa contract `ActionMenuItem` và `UnifiedActionMenu` trong `src/components/ui/unified-action-menu.tsx`.
2. Hỗ trợ cả 2 kiểu dùng: `items` prop array và `children` JSX subcomponents.
3. Export cả TypeScript `interface ActionMenuItemProps` / `type ActionMenuItem` VÀ runtime component `export function ActionMenuItem`.
4. Rà soát lại tất cả các nơi import `UnifiedActionMenu` và `ActionMenuItem`.
5. Chạy `npx tsc --noEmit` và `npm run build` để đảm bảo build PASS 100%.
6. Thực thi runtime validation và Playwright E2E suite.
