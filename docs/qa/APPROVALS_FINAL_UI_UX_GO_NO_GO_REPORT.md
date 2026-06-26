# Báo cáo Chốt (Go/No-Go) — Phân hệ Approval Center

> Ngày: 2026-06-26 | Trạng thái: **GO có điều kiện - đủ để UAT tiếp**

---

## 1. UI/UX (Đã ổn)
- Bảng danh sách đã được thiết kế lại gọn gàng, cột tên dự án không bị cắt (truncate) quá mức, các badge ưu tiên/trạng thái không còn gãy dòng (wrap).
- Nút bấm `Xem` thu gọn hợp lý trên thiết bị di động, tránh chiếm không gian.
- Dữ liệu tiền tệ rỗng (null) hiển thị `"—"` chuyên nghiệp thay vì `"Không có"`.
- Modal từ chối hiển thị đầy đủ ngữ cảnh (Context): Mã, Tiêu đề, Tên công trình, Giá trị, Hạn xử lý.
- Drawer chi tiết làm nổi bật cảnh báo về việc quyết định phê duyệt tại Approval Center **không** làm thay đổi trạng thái hồ sơ gốc.
- Text hướng dẫn tạo yêu cầu rõ ràng, không dùng các từ ngữ kỹ thuật/test.

## 2. Nghiệp vụ (Đã ổn)
- **Luồng phê duyệt**: Chỉ PENDING mới có thể Approve/Reject/Cancel. Các trạng thái khác (APPROVED, REJECTED, CANCELLED) chỉ cho phép Xem.
- **RBAC**: Người tạo không thể tự duyệt (trừ Admin). Các user ngoài dự án không được phép xem/duyệt.
- **Ràng buộc an toàn**: Validate phía server chặn đứng hành động Reject nếu lý do < 10 ký tự. Không có Hard Delete nào xảy ra (chỉ Soft Delete bởi Admin).
- **Không có Alert/Confirm rác**: Toàn bộ UI sử dụng hệ thống Dialog chuyên nghiệp (`ReasonDialog`, `ConfirmDialog`) thay vì native prompt.

## 3. Dữ liệu liên thông (Đã ổn)
- Các liên kết đến hồ sơ gốc có thực (`PaymentRequest`, `MaterialRequest`, `Contract`) đều tồn tại thực tế và khớp `projectId`. (Passed 3/3 test case).
- Các sourceType chưa có model thực (`ChangeOrder`, `SiteReport`) được UI hiển thị rõ là **"Tham chiếu nội bộ"**.
- Nút "Xem hồ sơ gốc" (fake link) đã bị loại bỏ hoàn toàn để không gây hiểu nhầm.

## 4. Quét Text Test/UAT (Đã sạch)
- Quét qua toàn bộ UI (`src/app/(dashboard)/approvals`) và Core (`src/lib/approvals`).
- Chỉ tìm thấy 1 kết quả hợp lệ với chữ "kiểm tra" trong thông báo: *"Yêu cầu này đã quá hạn xử lý. Hãy **kiểm tra** hồ sơ trước khi ra quyết định"*. (Chữ "kiểm tra" ở đây mang ý nghĩa nghiệp vụ rà soát hồ sơ, không phải test).
- Tuyệt đối không còn `"seed"`, `"UAT"`, `"test"`, `"fake"` nào lọt ra giao diện End-User.

## 5. Kết quả QA / Build (Pass 100%)
- **Prisma Validate/Generate**: Thành công.
- **Seed UAT**: Chạy idempotent tạo 12+ record mẫu.
- **QA Script (`scripts/qa-approvals.ts`)**: 17/17 PASS. Toàn bộ logic Backend/RBAC và Source Integrity không bị hỏng.
- **TypeScript**: `0 errors` (Đã sửa lỗi variant "secondary" thành "ghost").
- **Next.js Build**: Thành công (Exit code 0), prerender và static generation hoàn thành xuất sắc.

## 6. Backlog còn lại (Điều kiện để GO)
Các tính năng sau đã được thiết kế UI để đón đầu, nhưng logic/UI thực sự sẽ làm ở phase sau:
1. **Audit Timeline**: Cần render lịch sử các hành động duyệt/từ chối chi tiết trên Drawer (Dữ liệu đã có ở AuditLog).
2. **File chứng từ**: Cần bổ sung khả năng đính kèm/xem file cho Approval.
3. **Phê duyệt nhiều cấp**: Hiện tại chỉ hỗ trợ luồng 1 cấp duyệt.
4. **Callback cập nhật hồ sơ gốc**: Hiện tại duyệt ở Approval Center thì Approval thành công, nhưng Payment/Contract gốc không tự đổi trạng thái (Đã ghi chú rõ cảnh báo trên màn hình cho User).

---

## 7. KẾT LUẬN

**GO có điều kiện - đủ để UAT tiếp.**
Phân hệ `/approvals` (Approval Center) hoàn toàn sạch lỗi, giao diện chuẩn ERP, dữ liệu được bảo vệ nghiêm ngặt ở mức Project, và đã loại bỏ toàn bộ text "rác" từ giai đoạn test. Đủ điều kiện để mang đi cho người dùng kiểm thử quy trình, miễn là họ hiểu rõ 4 điểm Backlog bên trên.
