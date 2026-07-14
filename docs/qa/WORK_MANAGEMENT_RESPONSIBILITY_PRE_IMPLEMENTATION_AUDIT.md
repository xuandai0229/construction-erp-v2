# Audit trước triển khai — Điều hành công việc & Trách nhiệm nhân sự

Ngày audit: 2026-07-14  
Trạng thái: **NO-GO cho migration/schema; GO có điều kiện cho thiết kế và mã thuần không chạm schema.**

## 1. Kiến trúc hiện tại

- Framework: Next.js 16.2.7, App Router, React 19, TypeScript và Prisma 7.
- Xác thực: cookie HTTP-only `auth_session`; session tải lại User đang active và chưa soft-delete trong `src/lib/auth.ts`.
- Dữ liệu: PostgreSQL qua Prisma adapter `pg`; Prisma schema hiện có User, Project, ProjectMember, báo cáo, khối lượng, vật tư, tài liệu, phê duyệt, thông báo và AuditLog.
- Phân quyền: registry theo action tại `src/lib/permissions/permission-types.ts` và `permission-registry.ts`; resolver server-side dùng `assertPermission`. Phạm vi project dựa trên ProjectMember active (`isActive`, `leftAt`, `deletedAt`).
- UI: table, dialog/drawer, toast, empty/loading/error state đã có convention trong các component dự án, báo cáo, tài liệu và vật tư.
- Ngày/giờ: lưu `DateTime` Prisma; một số workflow ngày làm việc dùng helper `src/lib/date/work-date`.
- Soft delete: đã áp dụng nhất quán cho User, Project, ApprovalRequest, Document, Field Progress; AuditLog không có mutation UI công khai.
- Concurrency: Approval Center dùng conditional `updateMany` theo status; schema chưa có version cho nghiệp vụ Task.

## 2. Phạm vi dữ liệu và quyền hiện có

| Năng lực hiện có | Có thể tái sử dụng | Giới hạn đối với phân hệ mới |
|---|---|---|
| User | Có, làm đối tượng người tham gia | Không có hồ sơ Employee riêng, chức danh hay trạng thái nghỉ việc nghiệp vụ |
| ProjectMember | Có, để kiểm tra nhiệm vụ thuộc công trình | Không phải phân công trách nhiệm hoặc assignee Task |
| AuditLog | Có, cho event audit tổng quát | Thiếu task scope, correlation ID, immutability guard và trường lịch sử trách nhiệm hiệu lực |
| Notification | Có, cho in-app notification | Chưa có event, deduplication, reminder/escalation cấu hình cho Task |
| Document/storage | Có, không lưu binary DB | Cần bảng liên kết Task–Document và server-side permission check |
| ApprovalRequest | Có thể tích hợp submission cần phê duyệt | Không thay thế reviewer/approver/participant/history của Task |
| SiteReport / FieldProgressItem | Chỉ có thể liên kết tham chiếu | Không được dùng làm Task hay gán người phụ trách công việc thi công |

## 3. Kết quả rà soát trùng lặp

Quét source và Prisma theo các từ khóa `task`, `assignment`, `responsibility`, `duty`, `delegation`, `handover`, `workload`, `assignee`, `reviewer`, `watcher`, `department`, `position`, `employee`, `termination`, `recurring`, `template`.

- Không có model hoặc route quản lý Task, TaskParticipant, TaskAssigneeHistory, ResponsibilityAssignment, JobPosition, Delegation, Handover hay Workload.
- `FieldProgressTemplate` chỉ là mẫu khối lượng thi công; không được tái sử dụng làm task template nhân sự.
- `ProjectMember.assignedById` là lịch sử gán thành viên công trình; không biểu đạt người giao nhiệm vụ, người chịu trách nhiệm chính hay bàn giao.
- `DashboardActionItem` là DTO hiển thị dashboard, không phải model Task.
- `ApprovalRequest` xử lý yêu cầu phê duyệt theo Project; không đáp ứng lifecycle tiếp nhận, tiến độ, submission hoặc xác nhận hoàn thành của nhiệm vụ.

## 4. Thiếu hụt bắt buộc cần được giải quyết

1. Không có `companyId`/Company model. Hệ thống hiện đơn tenant; không thể tuyên bố kiểm soát multi-tenant bằng server guard khi chưa có tenant data model.
2. Không có Department, JobPosition hay Employee. Scope giao việc theo phòng ban/chức danh và luồng nghỉ việc chưa thể triển khai đúng nghiệp vụ.
3. Không có dữ liệu lịch sử trách nhiệm theo hiệu lực, bàn giao, ủy quyền hoặc task dependency.
4. Không có permission task-scoped; không được thêm một quyền tổng quát `manageTasks`.
5. Không có migration ledger sạch để tạo hoặc apply migration mới an toàn.

## 5. Rủi ro migration và dữ liệu

- `npx prisma migrate status` đang báo P3015: các thư mục migration Structure/phase tồn tại nhưng thiếu `migration.sql`.
- Census read-only trước đó: Development còn ba bảng Structure với 0 record; QA không có các bảng này. Cả hai ledger đều ghi nhận migration Structure lịch sử nhưng local source thiếu artifact tương ứng.
- Theo quy tắc an toàn đã được phê duyệt, không sửa hay tự tái tạo migration lịch sử đã áp dụng, không `prisma db push`, không apply production.
- Vì vậy, không thể tạo/apply migration additive cho Task một cách có kiểm chứng cho đến khi khôi phục nguyên vẹn các migration SQL từ source of truth và `migrate status` sạch trên QA.

## 6. Kiến trúc mục tiêu đề xuất

Sau khi migration ledger được khôi phục, triển khai tuần tự các nhóm model riêng:

1. Foundation: JobPosition, PositionResponsibility, ResponsibilityAssignment, Delegation.
2. Task core: Task, TaskParticipant, TaskAssigneeHistory, TaskChecklistItem, TaskDependency, TaskProgressUpdate, TaskSubmission.
3. Collaboration: TaskComment, TaskAttachment, TaskLink, TaskActivityLog.
4. Handover and workload: WorkHandover, WorkHandoverItem, workload query/service.

Các invariant bắt buộc ở service + DB:

- Một primary assignee đang hiệu lực cho mỗi Task tại một thời điểm.
- Không sửa trực tiếp người phụ trách; đóng lịch sử cũ và mở lịch sử mới trong transaction.
- Không tự xác nhận hoàn thành task của chính mình khi workflow yêu cầu reviewer độc lập.
- Không hard-delete task đã giao/nhận/gửi kết quả/bình luận.
- Chặn cycle parent/child và dependency.
- Mọi server action xác minh session, task visibility, project scope (nếu có), participant/scope, permission cụ thể, status và optimistic version.

## 7. Permission và phạm vi đề xuất

Không thêm `manageTasks`. Bổ sung action-specific permissions sau khi schema ready: `tasks.view`, `tasks.create`, `tasks.assign`, `tasks.update`, `tasks.submit`, `tasks.verify`, `tasks.confirm`, `tasks.handover`, `responsibilities.view`, `responsibilities.assign`, `delegations.create`, `delegations.revoke`.

Phase đầu phải giới hạn công ty đơn tenant hiện tại và ghi rõ hạn chế này. Không được mô phỏng company scope bằng một giá trị hard-code. Nhiệm vụ project-scoped phải kiểm tra ProjectMember active; task confidential phải dùng participant/explicit privileged policy server-side.

## 8. Tích hợp dự kiến

- Project detail: tab `Nhiệm vụ`, không thay thế Field Progress, Site Report hoặc cấu trúc hạng mục.
- User profile: tab `Công việc & Trách nhiệm`, chỉ sau khi có Employee/position scope tối thiểu.
- Notification: reuse bảng Notification, tạo idempotency key/service riêng cho reminder và escalation.
- AuditLog: ghi event tổng quát, đồng thời TaskActivityLog bất biến cho lịch sử nghiệp vụ.
- Document: TaskAttachment chỉ liên kết Document đã được kiểm tra quyền, không lộ storage key.
- Approval Center: chỉ liên kết TaskSubmission khi cần phê duyệt; không thay thế workflow xác nhận của task.

## 9. Kế hoạch triển khai và rollback

1. Khôi phục migration SQL historical theo source of truth; review SHA/nội dung; chạy `prisma migrate status` trên QA. Không tự suy đoán nội dung file.
2. Tạo migration additive Phase 1; review SQL và apply QA bằng `prisma migrate deploy` sau QA guard/backup.
3. Thêm permissions, pure validation/workflow services và unit tests.
4. Tạo Task core, integration/RBAC/IDOR/concurrency tests rồi UI CRUD.
5. Thêm handover/delegation/workload sau khi core đã có audit trail.
6. Tích hợp Notification, Project, User, Dashboard và E2E.

Rollback: migration mới chỉ additive; feature flags/routes mới không thay đổi route/model hiện hữu. Nếu QA phát hiện sai, dừng rollout và dùng compensating migration mới sau backup/census; không sửa migration đã apply.

## 10. File dự kiến tạo/sửa sau GO

- `prisma/schema.prisma` và một migration additive mới.
- `src/lib/tasks/*`, `src/lib/responsibilities/*`, `src/lib/delegations/*`.
- Permission types/registry/policies.
- Route/pages/components dưới `src/app/(dashboard)/work-management/*`.
- Các tab Project/User, notification service, audit adapter.
- Unit, database integration, RBAC/IDOR, workflow, concurrency và Playwright tests.

## 11. Giả định sử dụng

- Hệ thống hiện là single-tenant; company-level rules chưa có dữ liệu để enforce.
- User là thực thể người dùng duy nhất hiện có; Employee/Department/JobPosition phải được bổ sung bằng schema riêng, không suy diễn từ role.
- QA database tồn tại và safety guard tên database đã pass, nhưng mutation schema bị chặn bởi migration ledger thiếu artifact.
- Thay đổi chưa commit trong worktree thuộc các nhiệm vụ khác phải được giữ nguyên.
