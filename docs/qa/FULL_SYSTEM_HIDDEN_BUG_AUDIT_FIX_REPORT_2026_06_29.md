# FULL SYSTEM HIDDEN BUG AUDIT & FIX REPORT - 2026-06-29

## 1. Đã phát hiện gì?
Hệ thống tồn tại nhiều lỗ hổng phân quyền cấp công trình (cross-project mutations) và lỗi logic nghiệp vụ nghiêm trọng. Cụ thể:
- **CRITICAL**: Hàm báo cáo tuần không kiểm tra quyền truy cập theo dự án, cho phép truy cập chéo. Đồng bộ trạng thái duyệt (Approval) sang các bản ghi gốc (Payment, Contract) không ràng buộc record gốc phải thuộc chung dự án với phê duyệt.
- **HIGH**: Các hàm thao tác trên bảng khối lượng gốc (sửa, xóa, batch) cập nhật dữ liệu qua id đơn lẻ mà không check dự án. Xóa hạng mục (soft delete) không kiểm tra xem khối lượng tương ứng đã được duyệt hay chưa.
- **MEDIUM**: Không thực thi giới hạn file size, không validate số âm/NaN chặt chẽ ở một số báo cáo, lưu trạng thái mặc định của báo cáo ngày là `APPROVED`.

## 2. Đã sửa gì?
- Vá lỗ hổng quyền truy cập báo cáo tuần bằng cách bổ sung logic xác thực user project IDs.
- Củng cố tính toàn vẹn dữ liệu trong tính năng Yêu cầu phê duyệt: Xác minh chặt chẽ nguồn (source record) phải thuộc cùng `projectId` với yêu cầu duyệt.
- Chặn các thay đổi chéo dự án trong Bảng khối lượng (Field Progress). Bổ sung điều kiện chặn thao tác xóa khi khối lượng (entry) của nó đã ở trạng thái `SUBMITTED` hoặc `APPROVED`.

## 3. File đã thay đổi
1. `src/app/(dashboard)/reports/actions.ts`: Cập nhật `getWeeklyReportPreview` để ràng buộc quyền.
2. `src/app/(dashboard)/approvals/actions.ts`: Cập nhật `syncSourceOnApprovalTx` bổ sung kiểm tra quyền sở hữu cross-record.
3. `src/app/(dashboard)/projects/[id]/field-progress/actions.ts`: Thêm các logic check `before.projectId` và trạng thái entries để chặn cập nhật/xóa không hợp lệ.

## 4. Command đã chạy và kết quả
- `npx prisma validate`: PASS
- `npx prisma generate`: PASS
- `npx tsc --noEmit`: PASS (Không lỗi Type)
- `npm run build`: PASS (Hoàn thành trong ~9.6s cho TypeScript, 4.4s build Turbopack).

## 5. Rủi ro còn lại
- Trạng thái của Daily Entry vẫn được hardcode thành `APPROVED` sau khi lưu (cần quyết định nghiệp vụ trước khi sửa).
- Lỗi nhập số âm/NaN trong Request Vật tư và Báo cáo chưa có filter đầu vào chặt chẽ.
- Cấu hình kích thước file upload vẫn chưa áp dụng triệt để ở API.
- Trace warning của Turbopack liên quan đến `dynamic require` trong API attachment, có thể gây lỗi route lúc runtime ở production.

## 6. Việc cần user tự test thủ công
- Cố tình đăng nhập và thử tạo Báo cáo tuần cho dự án không có quyền, xem thông báo từ chối.
- Xóa thử một hạng mục công việc (trong Bảng khối lượng) đã có báo cáo ngày được duyệt, kỳ vọng nhận lỗi: "Không thể xóa hạng mục đã có khối lượng được trình duyệt hoặc phê duyệt".
- Duyệt thanh toán và theo dõi log báo lỗi nếu cố tình trỏ thanh toán sang source ID của dự án khác.

## 7. Git status cuối
```
M  src/app/(dashboard)/approvals/actions.ts
M  src/app/(dashboard)/projects/[id]/field-progress/actions.ts
M  src/app/(dashboard)/reports/actions.ts
```
