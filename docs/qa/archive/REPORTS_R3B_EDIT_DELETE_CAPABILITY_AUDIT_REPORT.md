# R3B - REPORT EDIT / DELETE / WITHDRAW / CANCEL CAPABILITY AUDIT REPORT

## A. Executive Summary
- **Edit/delete hiện có hay chưa:** Hoàn toàn chưa có.
- **Có nên sửa ngay không:** Không. Cần review kỹ UI/UX và logic audit trước khi làm.
- **Thiếu lớn nhất là gì:** Thiếu Server Action và UI để sửa (`Edit`) và xóa (`Delete`) báo cáo. Người dùng không có cách nào sửa lỗi sai sau khi tạo nháp.
- **Có được sang R3b implementation không:** Sẵn sàng. Rất cần thiết.
- **Production GO/NO-GO:** **NO-GO**. Hệ thống không thể đưa vào thực tế nếu không có cơ chế sửa/xóa cơ bản cho báo cáo DRAFT.

## B. UI audit
| Status / Role | Xem chi tiết | In/Xuất PDF | Gửi duyệt | Duyệt | Từ chối | Sửa | Xóa | Thu hồi | Hủy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **DRAFT** | Có | Có | Có | Không | Không | ❌ Thiếu | ❌ Thiếu | Không | ❌ Thiếu |
| **SUBMITTED** | Có | Có | Không | Có (Admin) | Có (Admin) | Không | Không | ❌ Thiếu | Không |
| **REJECTED** | Có | Có | Có | Không | Không | ❌ Thiếu | ❌ Thiếu | Không | ❌ Thiếu |
| **APPROVED** | Có | Có | Không | Không | Không | Không | Không | Không | Không |

## C. Backend audit
Các server actions hiện tại trong `src/app/(dashboard)/reports/actions.ts`:
- `createSiteReport` (Có)
- `submitSiteReport` (Có)
- `approveSiteReport` (Có)
- `rejectSiteReport` (Có)
- `createWeeklyReportFromApprovedDailyReports` (Có)
- **`updateSiteReport`** (❌ Thiếu)
- **`deleteSiteReport` / `softDelete`** (❌ Thiếu)
- **`withdrawSiteReport`** (❌ Thiếu)
- **`cancelSiteReport`** (❌ Thiếu)

## D. Policy audit
Theo `src/lib/reports/report-workflow-policy.ts`:
- `canEditReportContent`: Cho phép `DRAFT`, `REJECTED` (Có logic, chưa có UI/API).
- `canSoftDeleteReport`: Cho phép `DRAFT`, `REJECTED` (Có logic, chưa có UI/API).

**Đề xuất ma trận quyền:**
| Status | Sửa nội dung | Upload ảnh/file | Xóa mềm | Gửi duyệt | Thu hồi | Hủy | Duyệt/Từ chối |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **DRAFT** | Người tạo | Người tạo | Người tạo/Admin | Người tạo | - | Người tạo/Admin | - |
| **SUBMITTED** | - | - | - | - | Người tạo | - | Admin/Director |
| **REJECTED** | Người tạo | Người tạo | Người tạo/Admin | Người tạo | - | Người tạo/Admin | - |
| **APPROVED** | Khóa tuyệt đối | Khóa tuyệt đối | - | - | - | - | - |
| **CANCELLED** | Khóa | Khóa | - | - | - | - | - |

## E. Data readiness
Kết quả audit qua script (Dữ liệu DB hiện tại):
- Tổng reports: **27**
- DRAFT: **7**
- SUBMITTED: **8**
- REJECTED: **1**
- APPROVED: **11**
- Số báo cáo WEEKLY: **2**
- Báo cáo có `deletedAt != null`: **0**
- Test/rác: **0**
- Báo cáo thiếu nội dung/dòng: **0**
- Attachment DB thiếu file vật lý: **25/29** (Orphan do test data seed)
- AuditLog cho create/submit/attachment: **Có**, nhưng chưa có cho sửa/xóa.

## F. Gaps
- **Critical:** Thiếu API / UI Edit & Delete cho DRAFT/REJECTED reports.
- **High:** Thiếu tính năng Withdraw cho báo cáo SUBMITTED nếu gửi nhầm.
- **Medium:** Thiếu AuditLog cho hành động cập nhật chi tiết.
- **Low:** Cleanup storage vật lý (File mồ côi khi soft delete DB).

## G. Recommended implementation plan
- **R3b.1 — Edit Draft/Rejected Report:** Cho phép gọi form tạo nhưng load data hiện có để sửa và submit lại.
- **R3b.2 — Soft Delete Draft/Rejected Report:** Thêm nút xóa, gọi `softDelete` và cập nhật field `deletedAt`. Không xóa file vật lý lúc này.
- **R3b.3 — Withdraw Submitted Report:** Thêm chức năng thu hồi (chuyển về `DRAFT`).
- **R3b.4 — Cancel Report:** Status schema đã có `CANCELLED`. Bổ sung API/UI hủy báo cáo mà không cần xóa.

## H. Risks
- **Xóa nhầm dữ liệu thật:** Tính năng delete cần có confirm rõ ràng. Soft delete giúp khôi phục dễ dàng.
- **AuditLog thiếu:** Việc edit cần capture snapshot khác biệt (old/new value).
- **File storage orphan:** Khi update/xóa report có xóa file, dễ dẫn đến file không được map.
- **Approved report phải khóa tuyệt đối:** Back-end validation cần strict ở bước update, tránh sửa report đã APPROVED.
- **Weekly report edit:** Phức tạp hơn vì liên quan đến query daily data, nên ưu tiên edit Daily trước.

## I. Conclusion
- Việc thiếu Edit/Delete là rủi ro lớn nhất về mặt UX hiện tại.
- Sẽ bắt tay vào làm Edit và Soft Delete (R3b.1 và R3b.2) trước tiên trong phase tiếp theo.

## J. Confirmation
- [x] Không sửa code.
- [x] Không sửa DB.
- [x] Không xóa dữ liệu.
- [x] Không tạo migration.
- [x] Không commit/push.
