# Field Report Workflow Simplification — Final Report

## Target workflow

`TẠO → LƯU → XEM → SỬA → XÓA`

Daily và Weekly trong form Field đều lưu dưới dạng `DRAFT`. Người dùng không còn phải đi qua submit/approval để hoàn tất việc nhập báo cáo. Approval/submit vẫn tồn tại cho dữ liệu lịch sử, API v1, dashboard và các màn hình tương thích.

## UI changes

- Nút chính đổi thành `Lưu` / `Lưu thay đổi`.
- Bỏ nút gửi trong normal create/edit dialog.
- DRAFT hiển thị `Đã lưu` thay cho `Nháp` ở status label chính.
- Detail DRAFT chỉ còn xem, sửa, in và xóa; không hiển thị Gửi/Duyệt/Từ chối.
- Status counters mới phản ánh issue/operational work, không giả lập approval queue.
- Daily empty state cho phép lưu trước, bổ sung khối lượng sau.

## Compatibility

Các status `SUBMITTED`, `APPROVED`, `REJECTED`, `REVISION_REQUESTED`, `LOCKED`, `CANCELLED`, các action server và endpoint approval/submit được giữ nguyên. Weekly public action `createWeeklyReportFromApprovedDailyReports` cũng được giữ tên để không phá call site/API contract cũ.

## Runtime evidence

QA Admin tạo Daily không có work line thành công, thấy `Đã lưu`, mở menu có `Sửa báo cáo`, mở detail không có approval action. Weekly trùng kỳ hiện hữu trả về detail hiện hữu thay vì tạo bản ghi thứ hai.

