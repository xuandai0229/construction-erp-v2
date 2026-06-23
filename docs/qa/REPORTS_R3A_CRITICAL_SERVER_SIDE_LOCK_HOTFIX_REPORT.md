# REPORTS_R3A_CRITICAL_SERVER_SIDE_LOCK_HOTFIX_REPORT

## A. Executive Summary

- **R3a Status:** PASS WITH RISKS (Có tồn đọng dữ liệu test tự động chưa được dọn dẹp).
- **Đã khóa được gì:** 
  - Khóa tạo report sai trạng thái. 
  - Khóa upload attachment sau khi report đã được SUBMITTED, APPROVED, CANCELLED.
  - Khóa cập nhật/xóa mềm khối lượng công việc (FieldProgress) đã được duyệt (APPROVED).
  - Khóa đổi tên, cập nhật nội dung, xóa tài liệu (Document) đã được APPROVED, ARCHIVED, SUPERSEDED.
  - Ngăn AuditLog rác khi upload file bị lỗi thông qua single database transaction.
- **Chưa khóa được gì:**
  - Quy trình FieldProgress tạo mới vẫn hardcode trạng thái APPROVED (limitation từ hệ thống cũ chưa được thay đổi ở R3a).
- **Có tạo migration không:** Không.
- **Có sửa dữ liệu không:** Không. (Lưu ý: script test tự động đã sinh ra dữ liệu test nhưng chưa tự cleanup).
- **Production GO/NO-GO:** NO-GO (Dành cho production, vẫn phải đợi các phase R1, R2, R4, R5 hoàn thành).

## B. Files changed

| File Path | Mục đích |
| --- | --- |
| `src/lib/reports/report-create-service.ts` | Hoàn thiện `createSiteReportWithAudit` với logic strict tạo report theo transaction và tự sinh AuditLog. |
| `src/app/(dashboard)/reports/actions.ts` | Áp dụng `createSiteReportWithAudit` vào `createSiteReport` và chuẩn hóa AuditLog. |
| `src/app/api/reports/[reportId]/attachments/route.ts` | Refactor attachment upload để ghi toàn bộ file vật lý trước, sau đó dùng một single transaction để lưu database và AuditLog nhằm tránh rác AuditLog khi lỗi. |
| `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts` | Kiểm tra logic khóa FieldProgress, xác nhận hệ thống đã bảo vệ bằng `assertFieldProgressEntryWritable`. |

## C. Policy matrix implemented

| Report Status | Được phép Edit | Được phép Upload | Submit | Approve/Reject |
| --- | --- | --- | --- | --- |
| **DRAFT** | Có | Có | Có | Không |
| **SUBMITTED** | Không | Không | Không | Có |
| **REJECTED** | Có | Có | Có | Không |
| **APPROVED** | Không | Không | Không | Không |
| **CANCELLED** | Không | Không | Không | Không |
| **LOCKED** | Không | Không | Không | Không |

## D. Report create/transition guard

- **create:** Fail-closed nếu trạng thái khác DRAFT hoặc SUBMITTED.
- **submit/approve/reject:** Sử dụng các service chuyển đổi trạng thái nghiêm ngặt (Transition Service). Update db dựa vào `status` hiện tại để tránh race condition, tự rollback nếu report đã bị đổi trạng thái bởi người khác. Reject yêu cầu bắt buộc có reason.
- **AuditLog:** Ghi log `SITE_REPORT_CREATED`, `SITE_REPORT_SUBMITTED`, v.v... cùng transaction.

## E. Attachment guard

- **Status upload được:** DRAFT, REJECTED.
- **Status bị chặn:** SUBMITTED, APPROVED, CANCELLED, LOCKED.
- **AuditLog attachment add:** Được sinh ra bên trong single transaction sau khi tất cả file vật lý đã ghi xong.
- **Rollback xử lý thế nào:** Xóa file vật lý đã ghi nếu có lỗi xảy ra. Do chưa commit database transaction, không sinh ra `SiteReportAttachment` thừa và đặc biệt không sinh ra `AuditLog` thừa.

## F. FieldProgress guard

- **Approved entry update bị chặn chưa:** Đã chặn. Lỗi trả về: "Khối lượng đã duyệt không thể sửa/xóa."
- **Approved entry soft-delete bị chặn chưa:** Đã chặn. (Chặn trước khi thực hiện update `quantity = 0`).
- **Limitation về new entry status:** Chức năng nhập số liệu mới vẫn tiếp tục hardcode sang trạng thái `APPROVED` ngay khi tạo mới. R3a chỉ khóa những record cũ đã APPROVED tồn tại trong hệ thống. Để đổi mới hoàn toàn cần thay đổi workflow ở giai đoạn sau.

## G. Document guard

- **Đã xử lý rename/update/delete/status transition chưa:** Đã xử lý đầy đủ thông qua các hàm `canEditDocumentMetadata`, `canRenameDocument`, `canDeleteDocument`, và `isValidDocumentStatusTransition`. Trạng thái APPROVED/ARCHIVED/SUPERSEDED đều bị vô hiệu hóa chỉnh sửa. Transition reject có bắt buộc reason.
- **Tính đầy đủ:** Document lock FULLY IMPLEMENTED (Không partial).

## H. AuditLog result

| Action Event | Hành động sinh log |
| --- | --- |
| `SITE_REPORT_CREATED` | Khi tạo report mới. |
| `SITE_REPORT_SUBMITTED` | Khi user gửi report / hoặc tạo báo cáo với trạng thái SUBMITTED ngay từ đầu. |
| `SITE_REPORT_APPROVED` | Khi admin/manager duyệt báo cáo. |
| `SITE_REPORT_REJECTED` | Khi admin/manager từ chối báo cáo. |
| `SITE_REPORT_ATTACHMENT_ADDED` | Khi một file đính kèm được thêm thành công vào report. |

## I. Test results

- **Script test result:** PASS (100% test cases `npx tsx scripts/test-reports-r3a-server-locks.ts`).
- **Browser smoke result:** PASS (Browser subagent đã xác nhận khóa upload khi SUBMITTED/APPROVED và render đúng màn hình In/Xuất PDF).
- **Direct API/action result:** PASS.
- **Build result:** PASS (`npm run build` thành công, không lỗi).

## J. Risks remaining

Các rủi ro tồn đọng bắt buộc phải lưu ý cho các phase sau:
1. **R1 UX chưa làm:** Giao diện người dùng cho các thông báo và trạng thái chưa tối ưu.
2. **R2 weekly source linkage chưa làm:** Báo cáo tuần chưa có liên kết chặt chẽ với dữ liệu gốc của ngày.
3. **R3b edit/delete/withdraw/cancel UI chưa làm:** Giao diện cho phép chỉnh sửa, xóa, thu hồi, hủy báo cáo cần được phát triển bổ sung.
4. **R4 Project-level RBAC chưa làm:** Hiện tại hệ thống phân quyền mới chỉ xử lý ở mức vai trò (Role), chưa khóa quyền theo từng dự án (ProjectUser).
5. **R5 cleanup storage chưa làm:** Chưa xử lý xóa file rác. 
6. **DB/storage mismatch chưa cleanup:** Những file đã lưu trong ổ đĩa nhưng mất db record do quá trình dev chưa được dọn dẹp.
7. **FieldProgress new-entry workflow:** Các công việc khai báo khối lượng vẫn giữ hành vi tự động nhảy `APPROVED` thay vì đi qua workflow trình duyệt.

## K. Go/No-Go

- **UAT nội bộ GO/NO-GO:** GO
- **Production NO-GO:** Cần fix nốt các Phase R1, R2, R4, R5 trước khi thực sự Go-live lên Production.

## L. Xác nhận

- Tuyệt đối KHÔNG commit.
- Tuyệt đối KHÔNG push.
- Tuyệt đối KHÔNG reset DB.
- Tuyệt đối KHÔNG cleanup storage.
- Tuyệt đối KHÔNG xóa dữ liệu.
- Tuyệt đối KHÔNG tạo migration (không có migration nào được thêm vào).
