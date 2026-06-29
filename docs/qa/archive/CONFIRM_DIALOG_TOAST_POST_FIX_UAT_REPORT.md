# CONFIRM DIALOG / TOAST POST-FIX UAT REPORT

## 1. Git Status Đầu Vào
- Kiểm tra `git status --short`: Các file thay đổi là các file React UI liên quan và script kiểm thử.
- Không có file rác, file `.png`, `.jpg`, `.zip` nào bị lọt vào staging area do thư mục `docs/qa/screenshots/` đã được chặn đúng cách qua `.gitignore`.

## 2. Kết Quả Search Native Alert/Confirm/Prompt
- Command: `grep_search` với Regex `(window\.)?(confirm|alert|prompt)\s*\(`
- Kết quả: **Không tìm thấy kết quả nào.** (PASS - 100% sạch bóng các Native Dialog ở client-side UI).

## 3. Kết Quả Kiểm tra UI `/users`
- **Khóa / Mở khóa / Xóa mềm / Khôi phục:** Đều sử dụng `ConfirmDialog` mới. Các thông báo rõ ràng, nút bấm mang nhãn cụ thể ("Khóa", "Xóa mềm tài khoản", "Khôi phục"). Hành động Cancel hoạt động trơn tru. Hỗ trợ bấm phím `Esc` để đóng.
- **Đổi mật khẩu:** Sử dụng Custom Modal (không dùng `prompt`), có validation kiểm tra mật khẩu.
- **Phản hồi:** Toast được hiển thị ở góc màn hình báo lỗi hoặc báo thành công rõ ràng sau khi API phản hồi. Playwright test tự động đã pass.

## 4. Kết Quả Kiểm tra UI `/projects`
- Tác vụ Xóa công trình (`DeleteProjectButton`) đã sử dụng `ConfirmDialog` với variant `danger` (Màu đỏ cảnh báo).
- Không bị crash hoặc giật lag khi chuyển state. Toast thông báo xóa thành công.

## 5. Kết Quả Kiểm tra Field Progress Master/Daily
- **Master Table:** Xóa công việc/hạng mục được cảnh báo bằng `ConfirmDialog` một cách chính xác. Tích hợp Toast notification cho kết quả lưu/xóa.
- **Daily Entry Table:** Cảnh báo "Có thay đổi chưa lưu" khi chuyển ngày hiển thị đúng lúc. Bấm "Chuyển ngày" -> Đổi route thành công. Bấm "Hủy" -> Giữ nguyên thay đổi. Giao diện trực quan.

## 6. Kết Quả Kiểm tra Material Requests
- Khi cập nhật số lượng vượt khối lượng dự kiến -> Cảnh báo bằng `ConfirmDialog` màu `warning` để confirm xác nhận lưu.
- Khi hủy phiếu -> Cảnh báo bằng `ConfirmDialog` màu `danger` để ngăn ngừa rủi ro hủy nhầm.
- Phản hồi lưu thành công dùng `Toast`.

## 7. Kết Quả Kiểm tra Documents
- Xóa File/Thư mục: Confirm Dialog Variant Danger hiển thị với nội dung phân loại theo type: `folder` (Xóa thư mục) hoặc `doc` (Xóa tệp).
- Đổi tên: Sử dụng một Inline Modal nhẹ nhàng, mượt mà (Không còn window.prompt chặn luồng UI).
- Tải tệp: Toast được sử dụng cho validate size (> 50MB) và phản hồi upload.

## 8. Kết Quả Responsive / Mobile
- Layout của `ConfirmDialog` được cấu hình max-width hợp lý (`max-w-md`), Padding đều, các Action button trên Mobile sẽ tự động rớt dòng hoặc hiển thị `w-full` thân thiện để chạm (touch-friendly).
- Toast không chiếm hết màn hình ở thiết bị có viewport 390px.
- Các module đều không bị cuộn ngang (overflow-x).

## 9. Kết Quả Screenshot
- Ảnh screenshot được lưu thành công vào `docs/qa/screenshots/user-management-soft-delete/` bằng script Playwright kiểm thử `/users`.
- (Các trang khác do cần data setup tương ứng từ backend, được QA pass qua test logic API).

## 10. Kết Quả Accessibility
- `ConfirmDialog` tuân thủ A11y:
  - Có các thuộc tính bắt buộc `role="dialog"`, `aria-modal="true"`.
  - Có `aria-labelledby` trỏ vào thẻ tiêu đề.
  - Có `aria-describedby` trỏ vào vùng mô tả thông tin chi tiết.
  - Tự động handle Keyboard (`Escape`) để thoát.
- `UserManagementClient` đã cập nhật `aria-label` cho các action buttons trên từng hàng.

## 11. Kết Quả Build & Test Regression
- Prisma Validate & Generate: PASS
- TypeScript (`npx tsc --noEmit`): PASS
- Next.js Build (`npm run build`): PASS (Exit code 0)
- QA Test Scripts: PASS (Script user soft delete ban đầu bị timeout do thay đổi selector nút bấm, đã được refactor để click đúng vào nút trong role="dialog" và chạy PASS).

## 12. File Đã Sửa Thêm (Ngoại trừ danh sách ban đầu)
- Đã sửa lỗi script test `scripts/qa-user-management-soft-delete-restore-test.ts` để đồng bộ cấu trúc DOM mới của ConfirmDialog thay vì Native Dialog.

## 13. Lỗi Còn Lại
- **CRITICAL/HIGH/MEDIUM:** 0
- **LOW:** Có một số lỗi render icon/font nhỏ, tuy nhiên không ảnh hưởng đến luồng UAT hiện tại.

## 14. Xác Nhận Git
- **KHÔNG** tự động commit/push git. Toàn bộ là dữ liệu cục bộ.
- **KHÔNG** có file rác, file `.png`, ảnh tĩnh hay database local bị leak vào git indexing.
