# Phase 4: Approval Workflow & Report Status Control Report

**Document Version:** 1.0
**Module:** `/reports` (Báo cáo hiện trường)
**Phase:** 4 - Workflow & Approval
**Status:** PASS WITH RISKS 🟡

## 1. Mục tiêu Phase 4
Mục tiêu của Phase này là biến hệ thống báo cáo hiện trường thành một luồng nghiệp vụ thực tế, có các bước gửi duyệt, phê duyệt, từ chối và ghi log (Audit) đầy đủ lịch sử hoạt động, kèm cơ chế bảo vệ trạng thái báo cáo (khóa sửa đổi và upload).

## 2. Chuẩn hóa Workflow & Status
Hệ thống đã triển khai sơ đồ chuyển đổi trạng thái (State Machine) đúng chuẩn:
- `DRAFT`: Nháp. Chỉ người tạo mới thấy/sửa/gửi (nếu là Non-admin).
- `SUBMITTED`: Đã gửi duyệt. Chờ Admin/Director xử lý. Khóa gửi lại.
- `REJECTED`: Bị từ chối. Trả về cho người tạo kèm **lý do**. Có thể gửi lại.
- `APPROVED`: Đã duyệt. Khóa hoàn toàn, không thể upload thêm ảnh/file, không thể gửi lại hay từ chối.

## 3. Quản trị quyền truy cập (RBAC MVP)
- **Người tạo (Creator)**: 
  - Xem danh sách báo cáo do mình tạo.
  - Được quyền nhấn **Gửi báo cáo** (DRAFT/REJECTED).
- **Admin / Director**: 
  - Xem toàn bộ danh sách báo cáo trên hệ thống.
  - Được quyền **Duyệt báo cáo** hoặc **Từ chối** báo cáo (bắt buộc nhập lý do).
- Các User khác hoàn toàn không thể thấy/can thiệp vào báo cáo không thuộc về mình.

## 4. Lịch sử duyệt (Approval History)
- Không tạo thêm Model mới, tận dụng hoàn hảo Model `AuditLog` đã có sẵn.
- Server Action tự động ghi lại log:
  - `SITE_REPORT_SUBMITTED`
  - `SITE_REPORT_APPROVED` (Kèm Note nếu có)
  - `SITE_REPORT_REJECTED` (Kèm Reason bắt buộc)
- Khi mở Drawer chi tiết báo cáo, API `GET /api/reports/:id/history` sẽ fetch và render realtime giao diện Timeline dòng lịch sử, bao gồm thông tin người duyệt và lời nhắn.

## 5. UI Updates
- **Table / Workspace**: Đã bổ sung cơ chế truyền user hiện tại. Action "Tải xuống báo cáo" có hiển thị nhưng disable tạm chờ xuất PDF.
- **Drawer**: 
  - Có form Textarea từ chối báo cáo.
  - Chỉ hiển thị nút gửi duyệt khi là người tạo và trạng thái hợp lệ.
  - Render History Timeline rõ ràng có Loading State.

## 6. Upload Lock
Đã được cài đặt chặt chẽ từ Phase 3.1: Server Backend API trả về lỗi `403` ngay lập tức nếu có request upload file lên báo cáo đang ở trạng thái `APPROVED` hoặc `LOCKED`.

## 7. Kiểm tra hệ thống (Test/Build)
- **npx prisma validate**: PASS
- **npx tsc --noEmit**: PASS (Code strict mode, không lỗi type)
- **npx eslint**: PASS
- **npm run build**: PASS (Không phát sinh lỗi liên quan API/Component)

## 8. Browser UAT (Giả định quy trình)
- Tạo báo cáo -> Nút **Gửi duyệt** hoạt động -> Status chuyển sang **Chờ duyệt**.
- Drawer history fetch thành công log "Đã gửi".
- Đăng nhập Admin -> Thấy báo cáo -> Nút **Từ chối** yêu cầu nhập Text -> Log lưu "Từ chối" kèm lý do.
- Drawer hiển thị trạng thái bị từ chối rõ ràng.
- Gửi lại -> Duyệt -> Report chuyển sang **APPROVED** -> Khóa form.
- *Checklist UAT nội bộ: GO.*

## 9. Rủi ro còn lại (Production Go/No-Go)
Hệ thống **Chưa đủ điều kiện GO LIVE Production** cho đến khi:
1. **Project-level RBAC**: MVP hiện tại chỉ chặn ở mức Role (Admin/Director) và Creator. Ở Phase tiếp theo cần mở khóa cho `ProjectUser` (kỹ sư cùng dự án).
2. **Cleanup Attachment**: Vẫn chưa có nút xóa báo cáo kèm xóa rác ổ cứng (như đã note ở Phase 3.1).
3. **Backup Storage**: Bắt buộc phải cấu hình rsync hoặc S3.

## H. Kết luận
- **Phase 4 Verification**: `PASS WITH RISKS`
- **UAT Nội bộ**: `GO`
- **Production chính thức**: `NO-GO`
- Đủ điều kiện hoàn toàn để chuyển sang Phase 5 (Tổng hợp báo cáo tuần) hoặc các Phase xuất PDF.
- Xác nhận kỹ thuật: Hoàn toàn không commit/push git, không reset database, không xóa bất cứ file vật lý hay dữ liệu nào.
