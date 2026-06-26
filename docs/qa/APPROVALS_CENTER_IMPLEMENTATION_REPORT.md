# Báo cáo triển khai Trung tâm Phê duyệt (Approval Center)

## 1. Hiện trạng ban đầu
- Màn `/approvals` chỉ là một trang placeholder đơn giản với tiêu đề "Phê duyệt" và Empty State "Không có yêu cầu chờ duyệt".
- Thiếu cấu trúc lưu trữ tập trung: Hệ thống chưa có model chung cho mọi luồng phê duyệt, khiến việc thiết lập một "Approval Center" gặp khó khăn.

## 2. Phương án đã chọn
- **Model ApprovalRequest mới**: Thiết lập model chung `ApprovalRequest` cho tất cả các loại phê duyệt (Thanh toán, Vật tư, Hợp đồng, Báo cáo, Phát sinh, Khác) giúp dễ dàng tập trung quản lý.
- **Thiết kế tối giản và hiệu quả**: Giao diện hướng đến trải nghiệm người dùng hiện đại, đồng bộ phong cách với module kế toán/thanh toán. Sử dụng Client Component cho tương tác mượt mà và Server Actions để đảm bảo an ninh, bảo mật cấp độ cơ sở dữ liệu.
- **Loại bỏ Native Dialogs**: Hoàn toàn sử dụng các Custom UI Dialogs (ConfirmDialog, ReasonDialog) để thay thế `window.alert`, `window.confirm`, `window.prompt`.

## 3. Các file đã sửa/thêm
- `prisma/schema.prisma` (Cập nhật schema `ApprovalRequest`, thêm enum)
- `src/app/(dashboard)/approvals/page.tsx` (Xây dựng trang chính, truyền data DTO)
- `src/app/(dashboard)/approvals/actions.ts` (Server Actions: Lấy danh sách, duyệt, từ chối, hủy)
- `src/app/(dashboard)/approvals/components/approval-center-client.tsx` (Giao diện chính Client, xử lý sự kiện, filter, table, dashboard)
- `src/lib/approvals/approval-dto.ts` (Đảm bảo an toàn Type, xử lý Date/Decimal cho Client)
- `src/lib/approvals/approval-permissions.ts` (RBAC Logic chi tiết theo Project/Role)
- `scripts/seed-approvals-uat.ts` (Script tạo dữ liệu UAT an toàn)
- `scripts/qa-approvals.ts` (Script kiểm thử nghiệp vụ và phân quyền)

## 4. Nghiệp vụ đã hỗ trợ
- **List & Filter**: Danh sách chi tiết, có thể lọc theo trạng thái, mức ưu tiên, loại yêu cầu, và công trình. Tích hợp thanh tìm kiếm thông minh.
- **Dashboard**: Tóm tắt (Summary Card) hiển thị số lượng Chờ duyệt, Quá hạn, Đã duyệt, Từ chối, Tổng giá trị chờ duyệt.
- **Detail (Xem chi tiết)**: Drawer mượt mà hiển thị đầy đủ thông tin, trạng thái quá hạn, chi tiết nguồn, ghi chú.
- **Approve (Duyệt)**: Dialog xác nhận, lưu thông tin người duyệt và thời gian, chuyển trạng thái `APPROVED`.
- **Reject (Từ chối)**: Bắt buộc nhập lý do (tối thiểu 10 ký tự), cập nhật `REJECTED`.
- **Cancel (Hủy)**: Hủy mềm yêu cầu khi đang ở trạng thái `PENDING`. Người tạo hoặc Admin có quyền thao tác.

## 5. Phân quyền RBAC Server-Side
- Admin, Giám đốc, Quản lý: Xem tất cả.
- Kế toán: Xem tất cả yêu cầu loại `PAYMENT` (Thanh toán).
- Project Manager/Site Commander: Xem và Duyệt/Từ chối yêu cầu thuộc công trình phụ trách.
- Người tạo (Requester): Xem được yêu cầu mình tạo, được quyền Hủy (Cancel) nhưng không được tự Duyệt (Approve).
- User ngoài dự án: Không thấy bất kỳ thông tin nào, server block fetch dữ liệu trái phép.

## 6. DTO Decimal/Date an toàn
- Sử dụng `serializeApprovalRequest` để tự động map `Decimal` của Prisma thành `number` thuần (hoặc string nếu vượt giới hạn JS).
- Convert `Date` thành chuỗi `ISO` ở Server trước khi gửi qua ranh giới Server/Client.
- Khắc phục triệt để các lỗi serialize phổ biến trong Next.js App Router liên quan đến Prisma objects.

## 7. Dữ liệu UAT Seed
- Số lượng: Tạo 12 yêu cầu với prefix `UAT-APR-`.
- Các loại trạng thái: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `PENDING` (Quá hạn).
- Các loại yêu cầu: Thanh toán, Vật tư, Hợp đồng, Báo cáo, Phát sinh.
- Kiểm tra tính biệt lập dữ liệu (Project scope) trên 2 dự án UAT khác nhau.

## 8. Kết quả QA Script
- ✅ `Admin xem được tất cả`
- ✅ `User thuộc công trình xem được yêu cầu công trình mình`
- ✅ `User không thuộc công trình không xem được`
- ✅ `PENDING duyệt được bởi người có quyền`
- ✅ `Người tạo không tự duyệt được, trừ Admin`
- ✅ `Reject không lý do bị chặn`
- ✅ `APPROVED / REJECTED / CANCELLED không duyệt lại được`
- ✅ `Cancel chỉ áp dụng PENDING`
- ✅ `Soft delete không hard delete`
- ✅ `Decimal/Date DTO an toàn`
- ✅ `Dashboard summary tính đúng theo dữ liệu UAT`

## 9. Build Result
- ✅ TSC Type-Check: Passed hoàn toàn.
- ✅ Next.js Build: Thành công, không có cảnh báo hay lỗi nghiêm trọng.
- Không còn Native Browser Dialogs nào lọt qua.

## 10. Rủi ro/Khía cạnh cần hoàn thiện (Backlog)
- **File đính kèm**: MVP hiện tại chưa hỗ trợ đính kèm/xem file gốc trực tiếp trên modal Phê duyệt. (Có thể xem qua reference sourceId ở module gốc).
- **Phê duyệt nhiều cấp**: Hệ thống hiện tại theo mô hình "1 cấp duyệt" cho MVP. Phê duyệt chuỗi (Workflow) sẽ cần nâng cấp schema và logic chuyển bước.
- **Tích hợp sâu**: Cần nối thẳng action Approve/Reject ngược lại module nguồn thay vì chỉ đổi trạng thái Request (ví dụ tự động đổi status Hợp đồng khi Request được Approve).

## 11. Kết luận
- **Trạng thái**: `GO`
- Hệ thống Phê duyệt đã sẵn sàng cho giai đoạn kiểm thử tiếp theo. Các yêu cầu về bảo mật dữ liệu, cách ly dự án (Project Isolation) và UX/UI đều được đáp ứng trọn vẹn, không lỗi.
