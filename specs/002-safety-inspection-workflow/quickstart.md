# Kịch bản xác minh end-to-end

## Điều kiện trước

1. Có dữ liệu công trình thực/fixture cô lập và tài khoản ở các vai trò Cán bộ ATLĐ, BCH, Trưởng bộ phận, Ban giám đốc, Quản trị viên.
2. Có hai template Word đã hash/được duyệt; không đưa dữ liệu demo vào môi trường production.
3. Có cơ chế dọn cleanup fixture chạy sau test; không dùng hard-delete dữ liệu thật.

## Kịch bản chính

1. Cán bộ ATLĐ lập kế hoạch cho tuần Thứ Hai–Chủ nhật, thêm hai công trình vào cùng một buổi, gửi duyệt và nhận trạng thái đã duyệt.
2. Bắt đầu lịch tại công trình A trên viewport điện thoại; đánh dấu đạt, N/A có lý do và chưa đạt có ảnh/yêu cầu/hạn; refresh/mất mạng rồi đồng bộ lại, không mất draft hoặc tạo finding đôi.
3. BCH công trình A chỉ xem được finding A, gửi ảnh sau khắc phục. Tài khoản công trình B bị từ chối ở UI, URL, action/API và tải evidence A.
4. Cán bộ ATLĐ kiểm tra lại: một finding chấp thuận hoàn thành, một finding yêu cầu làm lại và một finding gia hạn. Xác nhận số liệu status, overdue và completedAt đúng.
5. Tạo báo cáo tuần. Xác minh một dòng/mỗi session-công trình actual, narrative system/override/audit đầy đủ, report locked không patch được.
6. Xuất Word/PDF bằng dataset golden. Render toàn bộ trang, so sánh baseline/overlay với mẫu gốc, lưu `page-count`, sai lệch vùng và kết luận PASS/FAIL.

## Cổng release

- Unit: tuần, lifecycle, overdue, aggregate, mapping template.
- Integration: plan → session → finding → remediation → reinspection → report → approval → export.
- RBAC: mọi vai trò, cross-project URL/API/evidence, report locked, self-approval.
- E2E: desktop/tablet/mobile, refresh, offline/retry, nhiều ảnh, nội dung dài, nhiều công trình một buổi.
- Documents: Word mở được trên Microsoft Word/WPS; PDF render không thiếu tiếng Việt, không vỡ bảng/tràn lề; không có PASS nếu golden report chưa đạt.
