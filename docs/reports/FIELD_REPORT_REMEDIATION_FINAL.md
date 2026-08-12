# Field Report Remediation — Final Report

Ngày: 2026-08-12  
Phạm vi: `/reports/field`, API SiteReport, weekly aggregation, attachment storage, QA fixture DB.

## Kết luận

**CONDITIONAL PASS.** Luồng Field mới đã được triển khai theo `TẠO → LƯU → XEM → SỬA → XÓA`; không tạo approval mới trong normal Field UI. Các enum/status, API approval/submit, dashboard, notification, export và schema hiện hữu được giữ nguyên để tương thích lịch sử.

## Đã xử lý

- Daily rỗng được lưu `DRAFT`; lưu lại và sửa được.
- UI hiển thị `DRAFT` là `Đã lưu`, với các thẻ nghiệp vụ `Có phát sinh`, `Cần xử lý`, `Khẩn cấp`.
- Weekly duplicate trả về kết quả có cấu trúc và mở báo cáo tuần hiện hữu.
- Weekly source mặc định gồm các daily đang active ở trạng thái đã lưu và trạng thái lịch sử phù hợp; không đổi tên public function cũ.
- SAVE với zero progress line không còn throw; các progress entry active cũ được reconcile/cancel trong transaction.
- Attachment upload đi qua storage abstraction dùng chung, đọc tương thích path legacy; có delete attachment, retry từng file và `accept` đúng whitelist.
- Supervision banner dựa trên `canEditPolicy`, phân biệt read-only với reviewer/admin có quyền hiệu chỉnh.
- Không thêm migration, không đổi schema, không rewrite dữ liệu production.

## Kiểm chứng

- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS; Next.js 16.2.7 compile/type-check/static generation PASS.
- Lint phạm vi file thay đổi: PASS, không có error.
- Test tự động: 2 test Field stats + 2 test Supervision workflow: **4/4 PASS**.
- Runtime QA trên DB cô lập: empty Daily save, edit/save, weekly duplicate redirect, upload 1 photo, remove photo đều PASS. Hai Daily QA do remediation tạo đã soft-delete sau kiểm thử; fixture/audit records có trước không đụng tới.

## Giới hạn còn lại

Fixture `QA_FIXTURE_PROJ_A` không có work item khả dụng nên chưa thể chứng minh bằng mutation runtime việc nhập một dòng quantity dương và đối chiếu trực tiếp FieldProgress. Code path SAVE reconciliation đã được triển khai; cần bổ sung fixture work item riêng trong một QA run tiếp theo nếu cần bằng chứng end-to-end cho quantity.

