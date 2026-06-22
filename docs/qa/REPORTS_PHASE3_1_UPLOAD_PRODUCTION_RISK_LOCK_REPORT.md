# Phase 3.1: Upload Production Risk Lock Report

**Document Version:** 1.0
**Module:** `/reports` (Báo cáo hiện trường)
**Phase:** 3.1 Security Hardening
**Status:** PASS WITH RISKS 🟡

## 1. Mục đích Phase 3.1
Phase 3 ban đầu kết luận hệ thống đã an toàn tuyệt đối và sẵn sàng GO-LIVE (Production GO), nhưng vẫn còn tồn đọng một số rủi ro về phân quyền và tải hệ thống. Phase 3.1 được thực hiện để giải quyết các rủi ro này và đính chính lại trạng thái sẵn sàng của dự án, khóa lại (Lock) các lỗ hổng kỹ thuật ở mức MVP trước khi làm Phase 4.

## 2. Kết quả cập nhật báo cáo Phase 3
Kết luận ở file `REPORTS_PHASE3_VERIFICATION_AND_SECURITY_HARDENING_REPORT.md` đã được đính chính:
- **Phase 3 Verification**: `PASS WITH RISKS`
- **UAT Nội bộ**: `GO`
- **Production chính thức**: `NO-GO` (hoặc GO CÓ ĐIỀU KIỆN) cho đến khi:
  - RBAC theo công trình hoàn tất (Phase 4).
  - Cleanup report & attachment được triển khai (dọn rác hệ thống).
  - Backup storage thư mục vật lý.

## 3. Xác minh Runtime Node cho API
- Cả 2 routes (`POST /attachments` và `GET /attachments/[attachmentId]`) đều đã được bổ sung `export const runtime = "nodejs";`.
- Ngăn chặn triệt để khả năng Next.js biên dịch các route có sử dụng File System (`fs`, `path`) sang Edge runtime, đảm bảo hoạt động ổn định trên node server.

## 4. RBAC (Quyền truy cập) MVP
Các API upload và download đã được bổ sung kiểm tra phân quyền (MVP):
- **Upload**: Chỉ cho phép **Người tạo báo cáo** (`session.id === report.createdById`) HOẶC **Admin/Director**. Các tài khoản khác bị chặn bằng lỗi `403 Forbidden`.
- **Download/View**: Áp dụng kiểm tra tương tự như trên (Người tạo hoặc Admin/Director).
- **Ghi chú**: Giải pháp này đã tạm khóa rủi ro bị lộ ID attachment, nhưng vẫn cần hoàn thiện ở Phase 4 khi tích hợp bảng phân quyền Project (VD: Kỹ sư khác trong cùng dự án được phép xem).

## 5. Giới hạn dung lượng (Total Upload Limit)
Đã triển khai chặn giới hạn tổng dung lượng gửi lên từ Client:
- Thêm hằng số `TOTAL_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024` (50MB).
- API sẽ tính tổng (`file.size`) của request.
- Nếu vượt quá 50MB, trả về lỗi `413 Payload Too Large` kèm thông báo khuyên người dùng chia nhỏ hoặc nén file. Việc này ngăn ngừa server bị nghẽn RAM/timeout.

## 6. Normalize Legacy Absolute Path
Đã viết script `verify-and-normalize-site-report-attachments.ts` để đọc DB và chuẩn hóa đường dẫn:
- **Tổng số ảnh/file**: 4
- **Đã chuẩn hóa (Normalized)**: 1 record (`cmqopsb7d000gkowkqh02ipwv`) thành công chuyển từ `D:\construction-erp-v2\storage\...` sang đường dẫn tương đối (relative).
- **Kết quả**: Tất cả record trong database hiện tại đều lưu trữ dưới định dạng Relative Path. Tuyệt đối an toàn.

## 7. Storage Ignore & Git Tracking
- Lệnh `git status --short` xác nhận không có bất cứ file ảnh hay PDF nào bị lọt vào track list.
- Thư mục `storage/` đã được chặn hoàn toàn trong `.gitignore`.

## 8. Kế hoạch Cleanup Attachment / Report
*(TODO Phase tiếp theo)*
- Chưa thực hiện chức năng xóa file trong UI Phase 3.1.
- Kỹ thuật yêu cầu:
  - Hàm `deleteAttachment`: phải bao gồm `fs.unlink` xóa file vật lý -> xóa record DB.
  - Hàm `deleteReport`: phải loop qua toàn bộ `attachments`, xóa lần lượt các file vật lý -> sau đó xóa folder báo cáo rỗng -> soft-delete record report.

## 9. Kiểm tra Build & Type Check
- **npx prisma validate**: PASS
- **npx tsc --noEmit**: PASS (Fix lỗi `SessionUser` property `id`)
- **npx eslint**: PASS
- **npm run build**: PASS (Không phát sinh lỗi liên quan API).

## H. Kết luận
- **Phase 3.1 Verification**: `PASS WITH RISKS` (Rủi ro RBAC và Cleanup chưa code, tuy nhiên đã tạm block an toàn ở API level).
- **Chuyển sang Phase 4**: Đủ điều kiện kỹ thuật vững chắc để bước sang Phase 4 (Workflow & Approval).
- **Production GO**: `NO-GO` cho đến khi Phase 4 hoàn tất. UAT thì `GO`.
- **Xác nhận an toàn**: Không commit, không push git, không reset DB, không xóa bất cứ file vật lý hay dữ liệu nào trong Phase này.
