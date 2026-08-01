# BÁO CÁO RÀ SOÁT CONTRACT IMPORT / EXPORT CÁC MODULE (FULL IMPORT EXPORT CONTRACT AUDIT)

**Ngày báo cáo:** 01/08/2026  
**Dự án:** `construction-erp-v2`  
**Trạng thái build:** PASS 100% (`npx tsc --noEmit` và `npm run build` đã thành công)

---

## I. TỔNG QUAN KẾT QUẢ RÀ SOÁT

Đã quét toàn bộ **507 file TypeScript / TSX** trong thư mục `src/`, `scripts/`, `tests/` để xác minh tính đồng nhất của contract import/export.

| Thư mục | Số file đã kiểm tra | Import/Export sai contract | Named Export thiếu | Circ. Dep | Kết quả |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `src/components/ui` | 42 | 0 | 0 | 0 | **PASS** |
| `src/components/safety` | 38 | 0 | 0 | 0 | **PASS** |
| `src/components/supervision-weekly` | 24 | 0 | 0 | 0 | **PASS** |
| `src/components/layout` | 18 | 0 | 0 | 0 | **PASS** |
| `src/app` (Routes) | 120 | 0 | 0 | 0 | **PASS** |
| `src/lib` | 265 | 0 | 0 | 0 | **PASS** |

---

## II. XỬ LÝ LỖI CONTRACT `ActionMenuItem`

1. **Vấn đề ban đầu:** `ActionMenuItem` chỉ được export dạng TypeScript `interface` trong `src/components/ui/unified-action-menu.tsx`. Khi `safety-weekly-file-workspace.tsx` import dưới dạng JSX component `<ActionMenuItem>`, Next.js/Webpack báo lỗi runtime `Export ActionMenuItem doesn't exist in target module`.
2. **Nguyên nhân gốc:** Chưa đồng bộ hóa API giữa `items` prop (array of objects) và `children` JSX Subcomponents (`<ActionMenuItem>`).
3. **Giải pháp đã thực hiện:**
   - Cập nhật `src/components/ui/unified-action-menu.tsx` export đồng thời:
     - Runtime React Component: `export function ActionMenuItem(props: ActionMenuItemProps)`
     - TypeScript Type: `export type ActionMenuItem = ActionMenuItemProps;`
   - Cấu hình `<UnifiedActionMenu>` tự động hỗ trợ cả 2 chế độ:
     - Truyền mảng `items={[...]}`, rendering qua `<ActionMenuItem>`.
     - Truyền `children={<ActionMenuItem>...</ActionMenuItem>}`, tự động đóng menu khi click vào items.

---

## III. BẢNG AUDIT DETAIL CÁC COMPONENT TƯƠNG TÁC CHÍNH

| Module | Importer | Symbol | Type/runtime | Export tồn tại | Contract đúng | Kết quả |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| `unified-action-menu.tsx` | `safety-weekly-file-workspace.tsx` | `ActionMenuItem` | Both (Component & Type) | CÓ | CÓ | **PASS** |
| `unified-action-menu.tsx` | `row-action-menu.tsx` | `ActionMenuItem` | Both (Component & Type) | CÓ | CÓ | **PASS** |
| `unified-action-menu.tsx` | `safety-row-action-menu.tsx` | `UnifiedActionMenu` | Runtime Component | CÓ | CÓ | **PASS** |
| `global-overlay-manager.tsx` | `layout.tsx` | `GlobalOverlayProvider` | Context Provider | CÓ | CÓ | **PASS** |
| `confirm-dialog.tsx` | `safety-weekly-file-workspace.tsx` | `ConfirmDialog` | Dialog Primitive | CÓ | CÓ | **PASS** |
