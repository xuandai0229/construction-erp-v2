# KỊCH BẢN KIỂM THỬ GIAO DIỆN SAU KHI WIPE (BROWSER QA CHECKLIST)
Ngày tạo: 2026-07-03
Trạng thái: APP TRẮNG (BLANK APP)

Sau khi hệ thống được Wipe (Live Run) và Verify tự động thành công (đếm bằng 0), Tester/Developer BẮT BUỘC phải thực hiện kịch bản test giao diện này để đảm bảo App không bị crash vì thiếu dữ liệu lõi.

## Điều kiện tiên quyết:
- Đã chạy thành công `scripts/wipe-business-data-to-blank-app.ts`.
- File `business-data-wipe-execution-result-2026-07-03.json` trả về `verificationStatus: PASS`.
- SystemSetting vẫn tồn tại.
- Ít nhất 1 tài khoản Admin vẫn tồn tại.

---

## 1. Login & Auth
- [ ] Mở trình duyệt ẩn danh, truy cập `/login`.
- [ ] Form đăng nhập hiển thị bình thường.
- [ ] Đăng nhập bằng tài khoản Admin (đã được cấu hình trong `protectedUsers`).
- [ ] Đăng nhập thành công, không văng lỗi 500, điều hướng vào `/dashboard`.

## 2. Dashboard Empty State
- [ ] Truy cập `/dashboard`.
- [ ] Giao diện hiển thị bình thường (Không bị màn hình trắng/crash).
- [ ] Các biểu đồ (nếu có) hiển thị trạng thái "Chưa có dữ liệu" (No data) hoặc hiển thị rỗng, không văng lỗi Javascript Console.
- [ ] API trả về mảng rỗng `[]` thay vì lỗi `500 Internal Server Error`.

## 3. Projects Empty State
- [ ] Truy cập `/projects`.
- [ ] Hiển thị danh sách trống.
- [ ] Nút "Tạo công trình mới" (Create Project) hoạt động và mở form bình thường.

## 4. Reports Empty State
- [ ] Truy cập `/reports` (Daily Reports).
- [ ] Không crash khi không có dữ liệu công trình/báo cáo.
- [ ] Truy cập `/reports/weekly`.
- [ ] Giao diện "Chưa có báo cáo" hiển thị chuẩn, không văng lỗi Array undefined.

## 5. Documents Empty State
- [ ] Truy cập `/documents`.
- [ ] Giao diện quản lý tài liệu hiển thị bình thường. Folder/File list rỗng.

## 6. Materials
- [ ] Truy cập `/materials` (Vật tư danh mục).
- [ ] Nếu đã chọn wipe danh mục, bảng hiển thị rỗng. Nếu chọn giữ, bảng hiển thị các vật tư mẫu.
- [ ] Truy cập `/materials/inventory` (Tồn kho).
- [ ] Không crash, hiển thị rỗng.

## 7. Contracts & Payments
- [ ] Truy cập `/contracts`. Không crash.
- [ ] Truy cập `/payments`. Không crash.

## 8. Approvals
- [ ] Truy cập `/approvals`.
- [ ] Giao diện hiển thị các tab rỗng, không crash.

## 9. Settings
- [ ] Truy cập `/settings`.
- [ ] Thông tin hệ thống (SystemSetting) hiển thị đúng tên công ty (Vì model này được giữ lại).
- [ ] Chuyển sang tab Users: Hiển thị tối thiểu tài khoản Admin hiện tại.

## 10. Console & Network Check
- [ ] Mở DevTools (F12).
- [ ] Tab Console: Không có lỗi đỏ (TypeError, Undefined, Unhandled Promise Rejection).
- [ ] Tab Network: Không có API nào trả về HTTP 500 khi load các trang rỗng.

**Nếu toàn bộ Checklist được tích Xanh (Pass) -> Hệ thống App Trắng đạt tiêu chuẩn để bàn giao hoặc bắt đầu seed dữ liệu mới.**
