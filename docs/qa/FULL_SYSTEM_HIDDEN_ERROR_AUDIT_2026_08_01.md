# BÁO CÁO RÀ SOÁT VÀ NGHỆM THU LỖI NGẦM HỆ THỐNG (FULL SYSTEM HIDDEN ERROR AUDIT)

**Ngày báo cáo:** 01/08/2026  
**Dự án:** `construction-erp-v2`  
**Trạng thái kiểm tra:** HOÀN THÀNH - KHÔNG PHÁT HIỆN LỖI NGẦM TRONG PHẠM VI XÁC THỰC BẰNG CHỨNG

---

## I. TỔNG QUAN DANH MỤC LỖI NGẦM ĐÃ KIỂM TRA

| ID | Danh mục lỗi ngầm | Hiện tượng tiềm ẩn | Cách thức kiểm tra | Kết quả |
| :---: | :--- | :--- | :--- | :---: |
| **HE-01** | Event Swallowing | `e.stopPropagation()` làm hỏng click-outside | Audit mã nguồn primitive components | **Đã xử lý 100%** |
| **HE-02** | Ref Access in Render | React useRef accessed directly during render | ESLint rules (`react-hooks/refs`) & build | **Đã xử lý 100%** |
| **HE-03** | Missing Export | Named import không tồn tại ở target module | `npx tsc --noEmit` & `npm run build` | **Đã xử lý 100%** |
| **HE-04** | Hydration Mismatch | Dữ liệu SSR khác với CSR | Dynamic import & guard window/document | **PASS** |
| **HE-05** | Double Submit | Bấm nút Submit liên tục làm duplicate dữ liệu | State pending & disabling buttons | **PASS** |
| **HE-06** | Dangerous Backdrop Close | Modal xác nhận xóa bị đóng im lặng khi bấm backdrop | `ConfirmDialog` danger backdrop protection | **PASS** |
| **HE-07** | Cross-Project Access | Người dùng xem/sửa công trình không có quyền | RBAC scoping trong Server Actions & Services | **PASS** |
| **HE-08** | Stale Session Token | Cookie hết hạn nhưng UI không chuyển hướng | Middleware auth check & login reason params | **PASS** |

---

## II. CHI TIẾT CÁC LỖI ĐÃ XỬ LÝ VÀ PHÓNG VỆ

### 1. Lỗi Contract `ActionMenuItem` (HE-03)
- **Root cause:** Component `UnifiedActionMenu` chỉ export `ActionMenuItem` dưới dạng type interface, gây lỗi build/runtime khi importer gọi dạng JSX component.
- **Fix:** Đã export đồng thời cả `ActionMenuItem` Component và `ActionMenuItem` Type/Interface trong `src/components/ui/unified-action-menu.tsx`.

### 2. Lỗi Ref Access During Render (HE-02)
- **Root cause:** Hàm helper `renderTrigger()` trong `unified-action-menu.tsx` truy cập `triggerRef.current` trong quá trình render.
- **Fix:** Đã chuyển `triggerRef` sang bọc thẻ `div` trực tiếp trong JSX return block.
