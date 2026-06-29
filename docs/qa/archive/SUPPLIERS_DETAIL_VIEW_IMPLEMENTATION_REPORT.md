# Suppliers - Detail View Implementation Report

**Ngày:** 2026-06-26
**Module:** Nhà cung cấp & thầu phụ (`/suppliers`)

---

## 1. Mục đích và Quyết định Thiết kế

**Vì sao cần Detail View?**
Màn hình Suppliers đã hỗ trợ xem danh sách cơ bản và Sửa/Xóa. Tuy nhiên, các user có quyền `canView` (như STAFF, ENGINEER) không thể xem toàn bộ thông tin chi tiết (ví dụ: ngày tạo/cập nhật, hoặc số lượng hợp đồng, email chi tiết nếu bảng quá hẹp) do cột action bị ẩn hoặc không có cách nào tương tác. Detail View mang lại trải nghiệm chuyên nghiệp, an toàn, giúp user xem thông tin mà không cần mở form Edit.

**Quyết định UX: Right Drawer / Bottom Sheet**
- **Desktop:** Mở Drawer bên phải (rộng 480px). Cách tiếp cận này giúp user vừa giữ được bối cảnh danh sách ở phía sau, vừa xem chi tiết rất rõ ràng mà không bị chuyển trang.
- **Mobile:** Sử dụng Bottom Sheet/Dialog vuốt lên từ dưới (`slide-in-from-bottom`), tận dụng tối đa không gian màn hình nhỏ mà không làm hẹp bề ngang.

**Quyết định Data Backend:**
- Thay vì viết một Server Action `getSupplierDetail()` mới đi kèm với nhiều query phức tạp, hiện tại Detail View được **render dựa trên dữ liệu List hiện có** (qua object `SupplierDto`).
- `contractCount` được lấy trực tiếp từ dữ liệu list. Việc include thêm hợp đồng (Contract relations) vào action lúc này là chưa cần thiết vì module Hợp đồng chưa phát triển chi tiết, dùng List data là giải pháp tối ưu về performance, tiết kiệm round-trip API cho MVP.

---

## 2. Thông tin hiển thị trong Detail

- **Header:** Tên đối tác (to, rõ ràng), Badge chứa Mã đối tác và Trạng thái hợp đồng ("Có hợp đồng" / "Chưa có hợp đồng").
- **Thông tin liên hệ:** Người liên hệ, Số điện thoại, Email.
- **Thông tin pháp lý:** Mã số thuế, Địa chỉ.
- **Hợp đồng liên kết:** Hiển thị Số lượng hợp đồng (hoặc thông báo "Chưa có hợp đồng").
- **Metadata:** Ngày tạo, Cập nhật lần cuối.
- **Missing value fallback:** Sử dụng `—` nếu trường dữ liệu bị rỗng.

---

## 3. RBAC & Bảo mật cho Detail View

- **`canView`:** Mọi user có quyền truy cập vào route `/suppliers` đều có thể click vào tên đối tác (hoặc icon Mắt) để mở Detail View.
- **`canUpdate`:** User có quyền update sẽ thấy nút "Sửa" hiển thị phía dưới cùng của Drawer. Click vào sẽ đóng Drawer và mở Dialog sửa.
- **`canDelete`:** User có quyền delete sẽ thấy nút "Xóa" hiển thị phía dưới cùng của Drawer. Nếu đối tác đã có hợp đồng, nút "Xóa" sẽ bị disable và có tooltip giải thích (kế thừa protection policy của hệ thống).
- User `view-only` (STAFF/ENGINEER) sẽ chỉ thấy các thông tin chi tiết. Nút Action (Sửa/Xóa) sẽ bị ẩn hoàn toàn trong Footer của Drawer.

---

## 4. Các File thay đổi và tạo mới

- **Tạo mới:** `src/components/suppliers/supplier-detail-drawer.tsx`
- **Sửa đổi:** `src/components/suppliers/suppliers-workspace.tsx`
  - Thêm Icon `Eye` (lucide-react).
  - Tên đối tác trong Table Desktop và Mobile Card chuyển thành `<button>` có hiệu ứng hover để mở Drawer.
  - Hành động Xem (`Eye`) luôn luôn hiển thị cho mọi user, không còn phụ thuộc vào `hasActions`.
  - Tích hợp `SupplierDetailDrawer` vào Workspace.

---

## 5. Kết quả QA & Build

**QA Script (`scripts/qa-suppliers-crud-rbac.ts`)**
- Chạy toàn bộ 20 tests.
- Kết quả: **20 PASS / 0 FAIL**. Server logic và RBAC hoàn toàn không bị thay đổi hay phá vỡ.

**Kiểm tra TypeScript & Build**
- `npx tsc --noEmit` -> PASS (0 errors)
- `npm run build` -> PASS (Exit code 0)

---

## 6. Hạn chế còn lại

1. **Thiếu các trường phân loại (Schema Limitations):** Chưa có các badge phân loại "Nhà cung cấp" hay "Thầu phụ" do schema prisma chưa có field `type`, `status` và `serviceCategory`. Tương lai khi mở rộng schema, Drawer sẽ được thêm khu vực Badge.
2. **Chi tiết Hợp đồng (Contract Detail):** Drawer hiện tại chỉ báo số lượng hợp đồng. Khi Module Hợp đồng được triển khai, có thể tạo Action gọi danh sách Hợp đồng liên kết cụ thể (Mã HĐ, Trạng thái) và hiển thị thành danh sách có thể click được bên trong Drawer này.

---

## 7. Kết luận

**Chức năng Detail View đã đủ để test thủ công chưa?**
- **Đã đủ và hoàn thiện cho MVP.** Giao diện hiện đại, responsive mượt mà trên cả Mobile và Desktop. RBAC được tuân thủ nghiêm ngặt từ UI đến Backend. Hệ thống sẵn sàng cho việc trải nghiệm thủ công.
