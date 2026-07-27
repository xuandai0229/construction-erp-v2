# Cán bộ giám sát công trình — Báo cáo RBAC cuối cùng

Ngày kiểm tra: 2026-07-27  
Repository: `construction-erp-v2`  
Nhánh làm việc: `main`  
Vai trò kỹ thuật: `CONSTRUCTION_SUPERVISOR`

## 1. Kết luận điều hành

**NO-GO cho production tại thời điểm báo cáo.** Phần triển khai code, migration additive, policy test, typecheck, lint và production build đã đạt. Chưa được phép triển khai vì repository hiện là single-tenant theo deployment/database, không có khóa `tenantId`, `organizationId` hoặc `companyId`; do đó không thể tạo bằng chứng Tenant A/Tenant B trong cùng hệ thống. Bộ kiểm thử authenticated runtime, direct-request, năm viewport, export file, revocation và cleanup fixture riêng cho role mới cũng chưa được thực hiện đầy đủ. Theo tiêu chí bắt buộc, thiếu bất kỳ bằng chứng runtime nào phải kết luận NO-GO.

## 2. Yêu cầu nghiệp vụ đã chốt

- Xem toàn bộ công trình hiện tại và tương lai trong cùng doanh nghiệp ở chế độ chỉ đọc.
- Không cần và không tự sinh `ProjectMember`.
- Chỉ riêng weekly author được tạo, nhập, lưu/autosave, sửa own `DRAFT`/`REVISION_REQUIRED`, preview, xuất/in own dossier, submit và resubmit.
- Không xóa dossier, không sửa dossier người khác, không sửa dữ liệu nguồn.
- Không review, approve, reject, request revision, lock hoặc unlock.
- Không cross-tenant và mọi quyền phải được kiểm tra tại server.

## 3. Kiến trúc phân quyền trước khi sửa

`User.role` dùng enum `UserRole`; phạm vi project thông thường đi qua `ProjectMember`, còn ADMIN/DIRECTOR/DEPUTY_DIRECTOR nằm trong nhóm company-wide. Permission framework gồm registry/resolver, RBAC helpers và policy theo module. `SUPERVISION_HEAD` có scope riêng. Schema không có entity doanh nghiệp/tenant: `User`, `Project` và `SupervisionWeeklyDossier` không mang tenant key. Điểm yếu đối với yêu cầu mới là khái niệm “xem mọi project” trước đó gắn chặt với nhóm quản trị; nếu thêm role vào nhóm đó sẽ vô tình cấp quyền ghi.

## 4. Kiến trúc sau khi sửa

- Role riêng `CONSTRUCTION_SUPERVISOR`, không alias/kế thừa `SUPERVISION_HEAD`.
- Scope `ALL_PROJECT_OPERATIONAL_READ` tách khỏi `COMPANY_WIDE_ROLES` và `canManageProjects`.
- Registry chỉ cấp global read cho project/document/report/material/approval; mutation và source download giữ deny-by-default.
- Weekly có policy tập trung theo capability + owner + state.
- Server actions/export route gọi policy; UI chỉ phản ánh kết quả và không phải hàng rào duy nhất.
- State machine giữ nguyên: `DRAFT -> SUBMITTED`, `SUBMITTED -> REVISION_REQUIRED -> SUBMITTED`, `SUBMITTED -> APPROVED -> LOCKED` do reviewer hiện hữu thực hiện.

## 5. Ma trận quyền đầy đủ

| Module | Resource/action | Scope | Expected/implemented |
|---|---|---|---|
| Project | list/detail/view | toàn deployment | Allow, không membership |
| Project | create/update/delete/member assignment | mọi project | Deny |
| Field report | view draft/history/content | toàn deployment | Allow |
| Field report | create/update/submit/export/review/lock | mọi report | Deny |
| Progress/quantity/WBS | view | toàn deployment | Allow |
| Progress/quantity/WBS | update/approve/lock | mọi project | Deny |
| Material | view | toàn deployment | Allow |
| Material | create/import/export/request/update/approve/receive/issue | mọi project | Deny |
| Task | view | toàn deployment | Allow (`task.view.companywide`) |
| Task | create/edit/assign/status/delete | mọi task | Deny |
| Document | metadata/content preview | toàn deployment | Allow |
| Document | upload/update/delete/download/share | mọi document | Deny |
| Approval | list/detail/view | toàn deployment | Allow |
| Approval | create/decide/approve/reject | mọi approval | Deny |
| Weekly | list/read/preview | mọi dossier readable | Allow |
| Weekly | create | own dossier | Allow |
| Weekly | edit/save/autosave | own DRAFT/REVISION_REQUIRED | Allow |
| Weekly | submit/resubmit | own DRAFT/REVISION_REQUIRED | Allow |
| Weekly | Word/PDF/print | own non-LOCKED | Allow |
| Weekly | update/delete/export/print | dossier người khác | Deny; preview only |
| Weekly | delete | kể cả own draft | Deny |
| Weekly | review/approve/reject/request revision/lock/unlock | mọi dossier | Deny |
| Users/settings/audit admin | mọi action | global | Deny |

## 6. Danh sách file đã đọc

- Schema/config: `prisma/schema.prisma`, `prisma.config.ts`, `package.json`, `.env` qua guard không lộ secret.
- Policy/RBAC: `src/lib/rbac.ts`, `rbac-rules.ts`, `permissions.ts`, `permissions/**`, module policy files, role registry, auth/session.
- Routes/actions/API: project, report, material, approval, task, document và supervision weekly actions/routes.
- UI: project, report, task, document, user-management và weekly components/pages.
- Tests/scripts/docs: weekly tests hiện hữu, QA safety/fixture scripts, Next.js 16 authentication/data-security/route-handler/form guides, SpecKit artifacts.

## 7. Danh sách file đã sửa

| Nhóm/file | Vấn đề cũ | Thay đổi và ảnh hưởng | Test bảo vệ |
|---|---|---|---|
| `prisma/schema.prisma` | thiếu role | thêm enum value, không đổi model | Prisma validate/build |
| `src/lib/rbac.ts`, `rbac-rules.ts`, `permissions/project-scope.ts` | read-all đồng nghĩa high-level | tách operational read khỏi manage | policy matrix |
| `src/lib/permissions/permission-registry.ts`, `permissions.ts` | thiếu grants read | thêm đúng read grants, mutation không đổi | 26 deny/allow cases |
| role registry + user actions/UI | không thể gán role | thêm metadata/validation; không tự membership | typecheck/build |
| material/approval/progress/report/task/document policies | scope hoặc control chưa nhận role | view-only theo module; document preview tách download | policy matrix/build |
| navigation/dashboard/module UI | chưa có read-only representation | menu/nhãn/banner, ẩn controls ghi | build; runtime còn thiếu |
| weekly permissions/actions/export | ownership/state chưa biết role mới | policy tập trung, author-scoped duplicate, row guard, export ownership, audit | weekly policy tests |
| weekly editor/list | controls suy luận chưa đủ | capability server-derived, other-owner banner, đóng delete | build; runtime còn thiếu |

## 8. Danh sách file đã tạo

- `prisma/migrations/20260727120000_add_construction_supervisor_role/migration.sql`: migration enum additive.
- `src/lib/permissions/construction-supervisor-policy.test.ts`: ma trận read/source-mutation denial.
- `src/lib/supervision-weekly/permissions.test.ts`: ownership/state/export/review/delete denial.
- `specs/001-construction-supervisor-rbac/*`: spec, plan, research, data model, contract, quickstart, tasks và checklist.
- Báo cáo này: kết quả, giới hạn và release gate.

## 9. Database và migration

- Schema impact: chỉ thêm `CONSTRUCTION_SUPERVISOR` vào `UserRole`.
- SQL: `ALTER TYPE "UserRole" ADD VALUE 'CONSTRUCTION_SUPERVISOR';`.
- QA deploy: PASS, chỉ migration `20260727120000_add_construction_supervisor_role` được áp dụng lên DB QA `construction_erp_v2_qa_e2e_20260723` tại `127.0.0.1:5432` sau khi guard xác nhận khác DB ứng dụng.
- Application deploy: **không thực hiện**.
- Data impact: không backfill, không membership, không dossier/source mutation.
- Backup: cần backup trước production migration.
- Rollback: rollback application/ngừng assign role; không xóa enum value bằng SQL phá hủy.

## 10. Quyền toàn bộ công trình

Trước đây query dùng company-wide hoặc tập ID membership. Sau sửa, `getAccessibleProjectIds` trả `null` cho operational-read role, nghĩa là không thêm điều kiện `id in (...)`; `canManageProjects` vẫn false. Project mới tự xuất hiện vì scope được tính động và không snapshot membership. Thu hồi role có hiệu lực ở request kế tiếp vì `getSession()` đọc lại role/current active state từ DB. Tenant filter không thể thêm vì schema không có tenant key; ranh giới hiện tại là database/deployment.

## 11. Quyền từng module

- Công trình: xem list/detail/KPI; không tạo/sửa/xóa/gán thành viên.
- Báo cáo hiện trường: xem toàn bộ kể cả draft; không tạo/sửa/lưu/gửi/export/duyệt.
- Khối lượng và tiến độ: xem; không update/approve/lock.
- Vật tư: xem; không create/import/export/request/update/approve/receive/issue.
- Nhiệm vụ: companywide read; không action.
- Tài liệu: xem/preview; không upload/update/delete/download/share.
- Phê duyệt: xem; không tạo hoặc quyết định.
- Tài chính: repository không có permission tài chính chi tiết độc lập trong registry được audit; không mở thêm quyền.
- Kiểm tra & kế hoạch tuần: read all; author workflow của chính mình theo state; không reviewer capability.

## 12. Quyền weekly author

Create, own draft, save/autosave, submit, sửa `REVISION_REQUIRED`, resubmit, preview và own export/print được policy cho phép. Word/PDF dùng chung loader export đã có, nay bắt buộc ownership và non-LOCKED. Dossier người khác chỉ read/preview. Delete luôn deny. `SUBMITTED`, `APPROVED`, `LOCKED` không edit/autosave. Review và lock capability chỉ nằm ở ADMIN/DIRECTOR/DEPUTY_DIRECTOR, không ở role mới.

## 13. Server/API evidence

| Entry point | Principal | Expected | Actual evidence | Status |
|---|---|---|---|---|
| project server actions | role mới | mutation deny | `canManageProjects=false`; unit policy deny | Code PASS / runtime BLOCKED |
| work-management executors | role mới | view only | chỉ `task.view.companywide` | Code PASS / runtime BLOCKED |
| document download route | role mới | preview allow, download deny | route chọn `documents.view` khi `preview=true`, ngược lại `documents.download` | Code PASS / runtime BLOCKED |
| weekly save/transition | role mới | owner/state guard | centralized policy + optimistic `lockVersion` updateMany | Code PASS / runtime BLOCKED |
| weekly export route | role mới | own non-LOCKED only | loader gọi export policy; denial trả 403 | Code PASS / runtime BLOCKED |

Không đánh PASS runtime: chưa có authenticated request trace và DB before/after riêng cho role mới.

## 14. Cross-project và cross-tenant

Cross-project A/B được thiết kế bằng global operational read và row/project relationship validation; không cần membership. Direct URL/API vẫn đi qua project/read or module mutation policy. Cross-dossier row ID bị so với tập row ID hiện hữu của dossier và bị từ chối trước transaction. Tenant A/B **BLOCKED** vì không có tenant model; không thể tạo Tenant B hợp lệ trong cùng QA DB mà không giả mạo kiến trúc.

## 15. UI/UX evidence

Menu project/document/material/report/supervision/approval hiển thị; controls tạo/sửa/xóa nguồn bị ẩn theo server-derived role/capability. Report/task có banner chỉ xem; weekly editor hiển thị “Hồ sơ do … — Bạn chỉ có quyền xem” cho dossier người khác. Delete weekly của role mới bị ẩn. Chưa có screenshot 1440×900, 1280×800, 1024×768, 768×1024 và 390×844; mobile overflow và dialog/menu vì vậy là **BLOCKED runtime**. Screenshot path: không có artifact mới, không được khai PASS.

## 16. Audit log

User create/update đã ghi before/after role qua audit hiện hữu. Weekly ghi create, update draft, view, preview, export, submit/resubmit và workflow transition; denied read được ghi không đồng bộ. Secret/password/file content không được ghi. Chưa có runtime proof cho role revocation, denied mutation và conflict events; các denial ngoài weekly vẫn phụ thuộc audit của từng module và chưa đồng nhất. Đây là rủi ro còn mở.

## 17. Test matrix

| Test | Expected | Actual | Evidence | Status |
|---|---|---|---|---|
| Global read permissions | allow không membership | 5/5 allow, GLOBAL | Vitest | PASS |
| Source mutations/download | deny | toàn bộ cases deny | Vitest | PASS |
| Own DRAFT/REVISION_REQUIRED edit+submit | allow | đúng policy | Vitest | PASS |
| Own submitted/approved/locked edit | deny | đúng policy | Vitest | PASS |
| Other dossier update/delete/submit/export | deny | đúng policy | Vitest | PASS |
| Own draft delete | deny | đúng policy | Vitest | PASS |
| Review capability | deny | false | Vitest | PASS |
| Own non-locked export / locked deny | đúng matrix | đúng policy | Vitest | PASS |
| Authenticated direct API + DB before/after | deny/no mutation | chưa chạy | không có trace | BLOCKED |
| Tenant B/direct-ID | no disclosure | không có tenant model | schema evidence | BLOCKED |
| UI five viewports | no forbidden action/overflow | chưa chạy | không có screenshots | BLOCKED |
| Revocation | next request loses grants | chưa chạy runtime | auth code review only | BLOCKED |

## 18. Regression

- Prisma validate: PASS (2026-07-27).
- Prisma generate: PASS (2026-07-27).
- TypeScript `npx tsc --noEmit`: PASS.
- Scoped ESLint: PASS, 0 errors; 47 warnings trong phạm vi rộng, chủ yếu unused tồn tại sẵn.
- Vitest: PASS, 3 files và 50/50 tests sau khi thêm deny xóa own draft, role regression, row-ID injection và document model regression.
- Next production build: PASS, Next.js 16.2.7; một warning NFT tracing từ local storage provider, không phát sinh bởi role này.
- Smoke routes/authenticated role regression: BLOCKED vì chưa tạo fixture runtime riêng.

## 19. Cleanup

Không tạo fixture dữ liệu cho role mới; do đó exact fixture IDs: `[]`, fixture đã xóa: `[]`, số fixture còn lại: `0`. DB ứng dụng không bị mutation. DB QA chỉ bị tác động bởi migration enum additive; không có business row nào được tạo/xóa trong đợt kiểm tra này.

## 20. Rủi ro còn lại

1. Không có tenant key nên không chứng minh được cùng-tenant/cross-tenant ở tầng row.
2. Chưa có authenticated runtime/direct-request/DB-diff evidence.
3. Chưa có export Word/PDF artifact và visual inspection cho role mới.
4. Chưa có screenshot/responsive/a11y matrix năm viewport.
5. Audit denied/conflict chưa thống nhất ở mọi module.
6. Scope thay đổi xuyên nhiều module; unit policy không thay thế regression của tất cả vai trò hiện hữu.
7. Build còn warning NFT tracing hiện hữu cần được theo dõi riêng.

## 21. Khuyến nghị triển khai

Chưa deploy production. Trước rollout cần backup, apply migration trên staging/QA cô lập, chạy authenticated E2E/direct API/DB-diff/export/five-viewports/revocation và có quyết định rõ rằng mỗi deployment/database chính là một tenant hoặc bổ sung tenant model trong feature riêng. Nên dùng feature flag hoặc rollout nhóm nhỏ sau khi gate runtime xanh; không tự động cấp role hàng loạt.

## 22. Evidence index

- Report: `docs/qa/CONSTRUCTION_SUPERVISOR_GLOBAL_READONLY_AND_WEEKLY_AUTHOR_RBAC_FINAL_REPORT.md`.
- Spec artifacts: `specs/001-construction-supervisor-rbac/`.
- Unit evidence: `src/lib/permissions/construction-supervisor-policy.test.ts`, `src/lib/supervision-weekly/permissions.test.ts`.
- Migration: `prisma/migrations/20260727120000_add_construction_supervisor_role/migration.sql`.
- Logs/output: terminal results ghi Prisma/typecheck/lint/Vitest/build trong phiên Codex này; chưa xuất thành JSON độc lập.
- Screenshots: không có; BLOCKED.
- Fixture manifest: không có vì không tạo fixture.
- Cleanup evidence: exact IDs `[]`, remaining `0`, application DB untouched.
