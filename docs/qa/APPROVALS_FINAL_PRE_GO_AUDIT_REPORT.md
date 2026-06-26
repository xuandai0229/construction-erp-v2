# Báo cáo Audit trước khi GO - Approval Center (Final Pre-Go Audit)

## 1. Hiện trạng sau khi làm lại code
Màn hình Phê duyệt đã được làm lại từ đầu với schema `ApprovalRequest` độc lập, tập trung, dễ quản lý.
UI được tối giản, ứng dụng các thẻ Tóm tắt (Summary Card), danh sách rõ ràng, với chức năng xem chi tiết dạng Drawer mượt mà. Đã tích hợp đầy đủ phân quyền RBAC dựa trên Server Actions.

## 2. Các lỗi cũ đã được kiểm tra và ngăn chặn triệt để
- **Không còn Native Dialog**: Kết quả quét `window.alert`, `confirm`, `prompt` qua toàn bộ mã nguồn `src` đều không phát hiện lỗi nào.
- **DTO Decimal/Date an toàn**: Prisma Decimal đã được parse sang Number qua `serializeApprovalRequest`. Thời gian Date được tự động convert sang chuỗi chuẩn ISO an toàn, ngăn chặn Next.js error "Only plain objects...".
- **Action hiển thị đúng trạng thái**: Chỉ các Approval ở trạng thái `PENDING` mới cho phép hiện các Action Duyệt/Từ chối/Hủy.
- **Không có dropdown rối mắt**: Các thao tác được đặt gọn gàng, sử dụng các button trực tiếp thay vì dropdown nhiều tầng.
- **Phân quyền và Bypass**: Đã chặn truy cập chéo bằng cách đối chiếu chính xác `projectRole`. Backend Server Action tự động xác thực qua Project ID.

## 3. Dữ liệu liên thông (Source Data Linking)
- Hiện tại có 3 loại chứng từ liên thông được test và liên kết trực tiếp (PaymentRequest, MaterialRequest, Contract). Dữ liệu này được đối chiếu thông qua hàm `validateSource` ở Backend để đảm bảo `sourceId` là tồn tại thật và có `projectId` khớp với yêu cầu phê duyệt.
- Có tổng cộng 3 Source (từ UAT seed) thực sự tồn tại bản ghi thật trong database gốc.
- Các liên kết được hỗ trợ text điều hướng thân thiện trên UI Detail Drawer như: "Mở tại Thanh toán", "Mở tại Hợp đồng", "Mở tại Vật tư".
- Đối với các module chưa có/dữ liệu khuyết thì hiện text fallback an toàn "Chưa có màn chi tiết hồ sơ gốc", không gây crash UI.

## 4. Phân quyền RBAC và Project Scope
- Admin: Bypass xem/duyệt mọi dự án.
- Project Manager/Site Commander: Quản lý đúng theo projectId được cấp.
- Account / Engineer / Requester: Chỉ có thể xem hoặc khởi tạo đúng yêu cầu, tuyệt đối không được tự duyệt yêu cầu của bản thân, Server Action chặn gắt gao.

## 5. Kết quả QA Script
- Kịch bản test `scripts/qa-approvals.ts` đã cập nhật tính năng Source Integrity Check.
- Toàn bộ các test rules chạy passed `100%`. Kiểm định rõ ràng 3 UAT data (Payment, Material, Contract) đã đối chiếu thành công sang Record gốc.

## 6. Kết quả TypeScript và Build
- Lệnh `npx tsc --noEmit` hoàn tất, không báo lỗi.
- Lệnh `npm run build` hoàn thành build các page, phân trang rõ ràng SSG/SSR.

## 7. Lỗi còn lại
- Hiện không còn lỗi block. Trong tương lai (Phase sau) có thể cân nhắc biến các "Text trạng thái" thành các "Clickable Hyperlinks" thực sự trỏ sang từng Drawer/Modal cụ thể của các module gốc.

## 8. Kết luận
**GO - Màn Phê duyệt đã đủ ổn định để UAT tiếp.**
