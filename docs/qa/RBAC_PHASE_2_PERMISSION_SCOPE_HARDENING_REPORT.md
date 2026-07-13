# RBAC Phase 2 — Permission và Project Scope Hardening

Ngày: 13/07/2026 (ICT)  
Kết luận tổng: **PASS có điều kiện. RBAC toàn hệ thống: CHƯA PASS. Runtime cross-project: CHƯA XÁC MINH.**

## 1. Phân loại trạng thái

| Hạng mục | Kết luận |
| --- | --- |
| Nhãn ADMIN/DIRECTOR | PASS (Phase 1) |
| KPI role Users | PASS (Phase 1 + nhãn KPI Phase 2) |
| Loại coupling System Role → Project Role | PASS |
| Approvals scope ACCOUNTANT/MANAGER | PASS module cụ thể |
| Payment actions scope | PASS module cụ thể |
| Users project-role explicit validation | PASS module cụ thể |
| Documents download/load-more/upload | PASS endpoint cụ thể |
| Report attachment/history endpoint | PASS endpoint cụ thể |
| Global search/notification scope | PASS server action cụ thể |
| Audit page policy | PASS page guard, CHƯA PASS audit service/export |
| RBAC toàn hệ thống | CHƯA PASS |
| Runtime cross-project access | CHƯA XÁC MINH |

## 2. Central permission registry

Đã thêm:

- `src/lib/permissions/permission-types.ts`: toàn bộ permission key và result shape.
- `src/lib/permissions/permission-registry.ts`: policy theo system role/project role, scope và source policy.
- `src/lib/permissions/project-scope.ts`: lấy `ProjectMember` active.
- `src/lib/permissions/permission-resolver.ts`: trả `allowed`, `scope`, `reason`, `sourcePolicy`, `membership`; `assertPermission` chặn mutation.

Registry có các nhóm permission bắt buộc: Users, Projects, Documents, Reports, Materials, Contracts, Payments, Approvals, Suppliers, Audit và Settings. `ADMIN` vẫn kế thừa quyền nghiệp vụ global legacy theo từng permission có `sourcePolicy` rõ, không còn là suy luận ẩn. `settings.system` chỉ ADMIN; `settings.company` được company-wide roles.

## 3. Policy ACCOUNTANT và MANAGER

| Policy | Trước | Sau |
| --- | --- | --- |
| ACCOUNTANT xem PAYMENT approval | `canViewApproval` cho phép global chỉ theo type PAYMENT | Bị loại bỏ; `approvals.view` yêu cầu membership ProjectMember active, trừ company-wide. |
| ACCOUNTANT tạo PAYMENT approval | `assertCanCreateApproval` return trước, không membership | Gọi resolver `approvals.create`; không membership bị từ chối. |
| MANAGER xem/tạo approval | Có trong `isHighLevelViewRole` của actions nhưng không company-wide trong RBAC | Không còn global role; phải là member của project. |
| ACCOUNTANT payment request | Đã list/action theo project ở Accounting nhưng không policy chung | Payment actions gọi resolver; ACCOUNTANT chỉ có create/update/mark paid khi membership non-VIEWER. |

Các thay đổi ở `src/lib/approvals/approval-permissions.ts` và `src/app/(dashboard)/approvals/actions.ts`. Quyền duyệt cuối cùng vẫn kết hợp resolver `approvals.decide` và policy request type cũ, nên không mở quyền duyệt cho role project không phù hợp.

## 4. ADMIN nghiệp vụ còn lại

ADMIN hiện **vẫn** có global permissions cho reports approve/reject, materials, contracts, payments review/approve, approvals decide và User management. Đây là hành vi legacy được giữ để tránh hồi quy nghiệp vụ; registry gắn `sourcePolicy` cho từng quyền để Phase 3 có thể tách `settings.system`/technical administration khỏi business authority. Không khẳng định ADMIN đã bị loại khỏi nghiệp vụ.

UI danh sách approver chưa được refactor toàn bộ để loại ADMIN mặc định, do chưa có selector approver dùng chung. Không thêm policy UI giả khi server vẫn kế thừa quyền legacy.

## 5. Project role explicit validation

`src/app/(dashboard)/users/actions.ts` nay:

- `getExplicitProjectRole` trả lỗi tiếng Việt nếu membership mới thiếu role.
- `createUser` validate từng project role trước transaction.
- `updateUser` không thay đổi role membership khi chỉ đổi system role.
- Reactivate membership giữ `existingRecord.role` nếu caller không gửi role mới.
- `assignProjectToUser` không còn parameter default `VIEWER`; thiếu role trả lỗi.

`UserManagementClient` yêu cầu chọn project role trong create/edit/quick assign, không tự điền VIEWER. Chưa chạy fixture mutation trên QA DB; static test xác minh không còn fallback code.

## 6. KPI Users

`src/app/(dashboard)/users/page.tsx` đổi `Tổng tài khoản` thành **Tài khoản hiện hành** vì query KPI loại `deletedAt != null`. Dòng giải thích nêu rõ KPI toàn hệ thống, các role KPI gồm locked nhưng chưa ngừng sử dụng, và “Đang hoạt động” chỉ `isActive=true && deletedAt=null`. Không thay số hardcode.

## 7. Audit log policy

- Model `AuditLog` có user/project/action/entity/beforeData/afterData/IP/userAgent (`prisma/schema.prisma:838+`).
- User actions log create/update/reset/lock/assign/unassign/deactivate/restore; users role/project membership changes có audit record. Approval, Documents, Reports, Projects và Settings cũng ghi audit ở nhiều mutation.
- `/audit` trước đó là placeholder, không query AuditLog và không guard direct URL. Nay page cần `audit.view_global`, hiện chỉ ADMIN.
- Registry có `audit.view_global`, `audit.view_project`, `audit.export`. Chưa có audit list/export service để migrate; không tuyên bố audit module hoàn chỉnh.
- `beforeData/afterData` là JSON text và có thể chứa dữ liệu nghiệp vụ. Không phát hiện password hash trong helper `writeAuditLog`, nhưng chưa có redaction policy tập trung: rủi ro còn lại.

## 8. Endpoint export/download/notification đã audit

| Endpoint/action | Session | Project scope | Record guard | Phase 2 |
| --- | --- | --- | --- | --- |
| `/api/documents/[documentId]/download` | Có | Có | Document lookup + resolver documents.download | Đã migrate |
| `/api/documents/load-more` | Có | Có | Query luôn projectId + resolver documents.view | Đã migrate |
| `/api/documents/upload` | Có | Có | Folder/project + resolver documents.upload + folder policy | Đã migrate |
| `/api/reports/attachments/[attachmentId]` | Có | Có | Attachment→report + resolver reports.view | Đã migrate |
| `/api/reports/[reportId]/attachments` | Có | Có | Report lookup + resolver reports.update | Đã migrate |
| `/api/reports/[reportId]/history` | Có | Có | Report lookup + action history check + resolver reports.view | Đã migrate |
| `searchSystem` | Có | Có | selected project now validated against accessible IDs | Đã migrate |
| `markGlobalNotificationRead` | Có | Có nếu projectId | Per-user notification ledger + projects.view | Đã migrate |
| PDF/Excel/CSV generic | Conditional/unknown | Conditional/unknown | Chưa có common export endpoint/registry integration | Chưa migrate |
| Audit export | Không có service | N/A | N/A | Chưa migrate |

Đoán ID của document/report attachment/history sau migration phải qua membership/global policy trước khi data/file được trả. Đây là bằng chứng static/server-code, không phải runtime QA evidence.

## 9. Modules đã và chưa migrate

| Module | Status |
| --- | --- |
| Approvals | PASS module cụ thể: list/create/decision/detail dùng least-privilege scope. |
| Payments | PASS module cụ thể: mutation dùng resolver, list đã scope project từ trước. |
| Users | PASS module cụ thể: action permission resolver + project role explicit. |
| Documents APIs | PASS endpoint cụ thể. Document action helpers đầy đủ chưa migrate resolver toàn bộ. |
| Reports APIs | PASS endpoint cụ thể. Report workflow/export service chưa migrate toàn bộ. |
| Materials | CHƯA migrate resolver; helper cũ giữ nguyên. |
| Contracts | CHƯA migrate resolver; helper cũ giữ nguyên. |
| Settings | CHƯA migrate resolver; policy category cũ giữ nguyên. |
| Audit log service/export | CHƯA migrate. |

## 10. Cross-project test

Không có DB QA cô lập được cung cấp. Đã tạo `scripts/qa-rbac-phase2-cross-project-qa.ts`; script luôn **SKIPPED/BLOCKED** khi không có `QA_DATABASE_URL` và không được chạy trong task này để không tạo fixture trên dữ liệu hiện có. Do đó không có tuyên bố PASS runtime.

Fixture cần chạy trong Phase QA: User A/B, Accountant A, Manager A, Project A/B và payment/approval/document/report ở mỗi project; kiểm tra list/detail/update/delete/approve/export/download/attachment/history/notification từ B. Kỳ vọng 403 hoặc not-found an toàn, không lộ metadata.

## 11. Static verification

`npx tsx scripts/qa-rbac-phase2-static.ts` PASS 10/10:

- Registry có keys bắt buộc.
- ACCOUNTANT PAYMENT và MANAGER không còn global approval.
- Create/decision Approval gọi resolver.
- Users không còn default VIEWER; reactivate giữ role cũ.
- Global search và notification validate scope.

Static test không đủ để xác minh runtime/DB isolation.

## 12. File sửa trong Phase 2

- `src/lib/permissions/permission-types.ts` (mới)
- `src/lib/permissions/permission-registry.ts` (mới)
- `src/lib/permissions/project-scope.ts` (mới)
- `src/lib/permissions/permission-resolver.ts` (mới)
- `src/lib/approvals/approval-permissions.ts`
- `src/app/(dashboard)/approvals/actions.ts`
- `src/app/(dashboard)/accounting/actions.ts`
- `src/app/(dashboard)/users/actions.ts`
- `src/components/users/user-management-client.tsx`
- `src/app/(dashboard)/users/page.tsx`
- `src/app/(dashboard)/audit/page.tsx`
- Documents/Reports API routes, `global-search.ts`, `notifications.ts`
- `scripts/qa-rbac-phase2-static.ts` (mới)
- `scripts/qa-rbac-phase2-cross-project-qa.ts` (mới, chưa chạy)
- `docs/qa/FULL_SYSTEM_PERMISSION_MATRIX.md`
- báo cáo này

## 13. Dữ liệu, migration và test

- Migration: **không**.
- Schema: **không đổi**.
- Seed: **không chạy**.
- Dữ liệu hiện có: **không sửa/xóa**.
- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npx tsc --noEmit`: PASS.
- ESLint phạm vi file sửa: PASS, 0 warning/error.
- `npm run build`: PASS; còn 1 cảnh báo Turbopack có sẵn về dynamic filesystem tracing ở local storage route Reports, không thuộc RBAC scope.

## 14. Rủi ro và Phase 3

1. ADMIN business authority còn legacy global.
2. Materials/Contracts/Reports/Documents server actions chưa dùng resolver toàn bộ.
3. Audit log redaction/read/export policy chưa có service hoàn chỉnh.
4. Export PDF/Excel/CSV chưa có common authorization layer.
5. Chưa có test runtime với QA DB.

Phase 3 nên migrate từng module còn lại sang resolver, trả capabilities server-side vào UI, bổ sung audit redaction/export service và dựng QA DB integration suite. Không cần migration database cho các bước code-first này; chỉ cân nhắc schema Role/Permission/Delegation/Session revocation sau khi policy business được phê duyệt.
