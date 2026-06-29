# USER MANAGEMENT EDIT / DETAIL / LOCK CONFIRM REPORT
**Topic:** Bổ sung Detail, Edit, Confirm Lock và hoàn thiện UX/UI
**Date:** 2026-06-18

---

## 1. Vấn đề phát hiện từ audit trước
- Hoàn toàn thiếu màn hình Xem chi tiết và Sửa thông tin tài khoản. Tạo xong nếu sai email, name hay role thì không thể sửa.
- Nút Khóa/Mở khóa click là thực thi ngay, không có xác nhận (confirm dialog), rất dễ bấm nhầm và gây ảnh hưởng nghiêm trọng đến user đang sử dụng.
- Người dùng có thể hiểu nhầm hệ thống sẽ tự động gửi Email OTP hay SMS, trong khi thực tế hệ thống không tích hợp SMTP.
- Ô "Ghi chú" trong form tạo tài khoản gây khó hiểu (thực chất chỉ là ghi chú cho việc gán công trình).

## 2. File đã sửa
- `src/app/(dashboard)/users/actions.ts`: Cập nhật hàm `updateUser` để hỗ trợ sync (gán/gỡ) các `projectIds` và `note` trong cùng một transaction.
- `src/components/users/user-management-client.tsx`:
  - Thêm Modal Chi tiết tài khoản (`detailUser`).
  - Thêm Modal Sửa thông tin tài khoản (`editUser`).
  - Thêm nút Xem (Eye icon) và Sửa (Edit icon) vào cột thao tác Desktop và Mobile Card.
  - Sửa `handleToggleActive` để hiển thị `window.confirm`.
  - Cập nhật wording form tạo và form sửa: "Ghi chú gán công trình", "Hệ thống không gửi email thật".
- `scripts/qa-user-management-edit-detail-test.ts`: Tạo script tự động hóa Playwright để test các case UI vừa làm.

## 3. Cách thêm chi tiết tài khoản
- Sử dụng state `detailUser` lưu thông tin người dùng được chọn.
- Modal Chi tiết hiển thị dạng Read-Only: Họ tên, Tên đăng nhập, Email, SĐT, Role Badge, Status Badge, Ngày tạo, và danh sách các công trình được gán dạng list/chip. Mật khẩu hash hoàn toàn được ẩn đi (đảm bảo bảo mật).

## 4. Cách thêm sửa tài khoản
- Sử dụng state `editUser` và hàm `openEdit` để fill dữ liệu hiện tại vào form sửa.
- Tận dụng hàm `updateUser` phía Server Action để thực hiện thao tác update trong Database (bao gồm cả việc xóa project assignment cũ và tạo assignment mới).
- Modal Sửa có đầy đủ ID, `name`, và `htmlFor` label nhằm hỗ trợ tốt nhất cho Accessibility.

## 5. Cách confirm khóa/mở khóa
- Hàm `handleToggleActive` được cập nhật thêm native `confirm()`. 
- Khi nhấn Khóa, hệ thống sẽ hiện cảnh báo: "Bạn có chắc chắn muốn khóa tài khoản này không? Người dùng sẽ không thể đăng nhập sau khi bị khóa. Dữ liệu cũ vẫn được giữ nguyên."

## 6. Cách làm rõ email không gửi thật
- Trong form Tạo và Sửa, dưới ô nhập Email được bổ sung label phụ (`text-slate-500`): *"Dùng để đăng nhập. Hệ thống không gửi email thật."*
- Dưới ô nhập Mật khẩu bổ sung: *"Vui lòng gửi MK thủ công cho người dùng."*
- Label Số điện thoại được đổi thành *"Số điện thoại liên hệ"*, kèm ghi chú nhỏ *"Chưa xác minh OTP."*

## 7. Cách xử lý ghi chú
- Đổi label từ "Ghi chú" thành **"Ghi chú gán công trình"**.
- Cả trong modal Tạo và modal Sửa, ô input này CHỈ được hiển thị (conditional render) khi admin có chọn ít nhất 1 công trình. Nếu không chọn công trình, ô này sẽ tự động ẩn đi, tránh gây bối rối cho người dùng.

## 8. Xác nhận không làm hard delete
- Tuyệt đối không có tính năng xóa vĩnh viễn (Hard Delete). 
- Các Action chỉ bao gồm Lock/Unlock (tương đương với Soft Disable/Deactivate).

## 9. Kết quả test nghiệp vụ
- **Mở modal chi tiết**: Modal hiển thị đủ dữ liệu, KHÔNG hiển thị passwordHash.
- **Mở modal sửa**: Giao diện điền đúng dữ liệu, Submit thành công và update xuống DB, list được refresh.
- **Validate Email/Username**: Bắt lỗi đúng theo Server Action (không được trùng).
- **Khóa tài khoản**: Cảnh báo Lock confirm hiển thị, dismiss/accept hoạt động đúng luồng.

## 10. Kết quả accessibility
- **PASS**. Toàn bộ Form có label `htmlFor` match với `id` của input.
- Các nút icon thao tác (Eye, Edit, Lock, Key, Delete Project X) đều có `aria-label` hoặc `title` rõ ràng (ví dụ: `aria-label="Sửa thông tin tài khoản admin"`).

## 11. Kết quả responsive
- **PASS**. Trên Desktop, table rộng, dễ quan sát các icon trên cùng 1 hàng ngang.
- Trên Mobile, List view dạng Card xổ dọc, hiển thị tốt, các action button (Xem, Sửa, Khóa, Đổi MK) chia đều thành 4 button text rộng vừa với ngón tay. Modal có `overflow-y-auto` cuộn mượt.

## 12. Kết quả build/test
- **`npx prisma validate`**: OK (schema is valid).
- **`npx prisma generate`**: OK.
- **`npx tsc --noEmit`**: 0 errors.
- **`npm run build`**: Thành công.
- **Playwright Test Scripts (`scripts/qa-user-management-edit-detail-test.ts` & Other QA Scripts)**: Tất cả đều xanh (PASS).

## 13. Known issues nếu còn
- (Minor): Hiện tại admin đăng nhập vẫn có thể tự Khóa tài khoản của chính mình nếu không có Admin khác. (Có thể chặn khóa admin cuối cùng ở phase sau).

## 14. Xác nhận không commit/push
- Tôi xác nhận **KHÔNG** chạy bất kỳ lệnh `git commit` hay `git push` nào trong phase này.

## 15. Xác nhận không có file rác trong Git
- Chạy kiểm tra `git ls-files --others --exclude-standard | Select-String "storageState|clear-material|..."` trả về kết quả trống.
- Các file rác (log, ảnh screenshots Playwright) đều đã bị ignore.
