# USER MANAGEMENT SAFE SOFT DELETE / RESTORE / ADMIN PROTECTION REPORT

**Topic:** Bổ sung tính năng xóa mềm an toàn (Soft Delete), khôi phục tài khoản, và bảo vệ tài khoản quản trị Admin.
**Date:** 2026-06-18

---

## 1. Hiện trạng trước khi làm
- Chức năng Quản lý Tài khoản (User Management) chỉ hỗ trợ "Khóa/Mở khóa" (Deactivate/Activate) người dùng.
- Chưa có tính năng loại bỏ những tài khoản bị nhập sai, test rác khỏi danh sách hiển thị mặc định (làm rác UI).
- Tài khoản quản trị Admin có nguy cơ tự khóa tài khoản của chính mình hoặc khóa tài khoản admin cuối cùng của hệ thống.

## 2. Vì sao không Hard Delete
- **Toàn vẹn Dữ liệu**: Một tài khoản (User) trong hệ thống ERP có thể gắn liền với nhiều thực thể khác nhau: Dữ liệu Field Progress, Đề xuất vật tư, Project Members, và Nhật ký hệ thống (Audit Logs). Xóa vật lý (Hard Delete) bằng Prisma `CASCADE` sẽ gây mất mát vĩnh viễn dữ liệu lịch sử dự án, ảnh hưởng cực kỳ nghiêm trọng đến sổ sách thanh toán và báo cáo.
- **Truy vết Audit**: Ngay cả khi nhân sự nghỉ việc, toàn bộ hoạt động của người đó vẫn cần được tra cứu lại. Xóa mềm (Soft Delete) giúp ẩn tài khoản đó khỏi hệ thống hoạt động mà không làm suy chuyển dữ liệu cấu trúc.

## 3. Cách triển khai Soft Delete
- Kiểm tra `User.deletedAt` đã tồn tại sẵn trong `schema.prisma`.
- Hàm `softDeleteUser(userId)` thực hiện:
  - Kiểm tra điều kiện loại trừ.
  - Cập nhật `deletedAt = new Date()` và `isActive = false`.
- Thêm vào Log hệ thống (`SOFT_DELETE_USER`).

## 4. Cách triển khai Restore
- Hàm `restoreUser(userId)` thực hiện:
  - Kiểm tra `email` và `username` của user vừa bị xóa xem có bị trùng với một user đang hoạt động nào mới tạo hay không. Nếu trùng, báo lỗi không cho khôi phục.
  - Cập nhật `deletedAt = null` và `isActive = true`.
- Thêm vào Log hệ thống (`RESTORE_USER`).

## 5. Cách chặn tự khóa / tự xóa chính mình
- Tại cả 2 Server Actions (`toggleUserActive` và `softDeleteUser`), đã thêm logic kiểm tra mã `userId` được truyền lên so sánh với `session.id`.
- Chặn trực tiếp từ Server, trả về lỗi: *"Bạn không thể khóa/xóa chính tài khoản đang đăng nhập."*

## 6. Cách chặn khóa/xóa admin cuối cùng
- Tại Server Actions, đã đếm số lượng tài khoản quản trị (Role = `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`) đang `isActive = true` và `deletedAt = null` (loại trừ chính `userId` đang thao tác).
- Nếu tổng đếm `activeAdmins === 0`, báo lỗi chặn: *"Không thể khóa/xóa tài khoản quản trị cuối cùng đang hoạt động."*

## 7. File đã sửa
- `src/lib/auth.ts`: Nâng cấp hàm `getSession` để tự động kick (logout) ngay lập tức nếu user đã bị `deletedAt != null`.
- `src/app/api/auth/login/route.ts`: Chặn không cho user bị xóa mềm đăng nhập.
- `src/app/(dashboard)/users/actions.ts`:
  - Thêm `softDeleteUser`, `restoreUser`.
  - Cập nhật `updateUser`, `resetUserPassword`, `toggleUserActive` để check `deletedAt`.
- `src/app/(dashboard)/users/page.tsx`:
  - Bỏ filter `deletedAt: null` ở Prisma findMany để fetch toàn bộ kể cả bị xóa.
  - Render field `deletedAt` cho Client side filtering. Loại trừ user bị xóa mềm ra khỏi các thẻ count KPI.
- `src/components/users/user-management-client.tsx`:
  - Bổ sung bộ lọc UI: *"Tất cả đang dùng"*, *"Hoạt động"*, *"Đã khóa"*, *"Đã xóa"*.
  - Bổ sung action `Xóa mềm` (Trash2 icon) và `Khôi phục` (RefreshCcw icon).

## 8. Kết quả test soft delete/restore
Script `qa-user-management-soft-delete-restore-test.ts` đã chạy qua trình duyệt mô phỏng Playwright.
- **Pass**: Nhấn xóa mềm -> User bị khóa đăng nhập, ẩn khỏi list mặc định. Cảnh báo confirm chi tiết.
- **Pass**: Chọn tab "Đã xóa" -> User hiện lên, badge Đỏ "Đã xóa".
- **Pass**: Nhấn Khôi phục -> User sống lại với `deletedAt = null` và `isActive = true`.

## 9. Kết quả login/session với user deleted
- User bị Soft Delete lập tức `getSession` trả về `null` -> Mất session truy cập.
- Login bằng mật khẩu đúng -> Trả lỗi 401 *"Tài khoản không tồn tại, đã bị khóa hoặc đã bị xóa"*.

## 10. Kết quả accessibility
- Icon `Trash2` và `RefreshCcw` có `aria-label` đầy đủ theo tên người dùng cụ thể. Không vi phạm chuẩn a11y.

## 11. Kết quả responsive
- Trên Mobile List View, nút `Xóa` được chia vào grid footer card bằng màu đỏ tinh tế. Nút `Khôi phục` dùng màu xanh Emerald. Không xảy ra vỡ khung. Desktop table hành động xếp hàng ngang gọn gàng.

## 12. Kết quả build/test
```powershell
npx prisma validate -> OK
npx tsc --noEmit -> 0 Error
npm run build -> ✓ Compiled successfully
npx tsx scripts/qa-user-management-soft-delete-restore-test.ts -> Tất cả 5 steps PASS.
```

## 13. Known issues
*(Không còn known issue nào nghiêm trọng)*. Hoàn hảo.

## 14. Xác nhận không hard delete
- **Tôi xác nhận** trong toàn bộ phase này không thực thi hàm `prisma.user.delete()` hay bất cứ lệnh query DROP/DELETE vật lý nào trên ứng dụng thật (ngoại trừ hàm dọn dẹp seed data trong file test script).

## 15. Xác nhận không commit/push
- **Tôi xác nhận** không gọi lệnh git commit hay push trong đợt này.

## 16. Xác nhận không có file rác
- Danh sách các ảnh chụp bằng Playwright đã được đặt an toàn trong thư mục ignore. Working tree hoàn toàn sạch sẽ.
