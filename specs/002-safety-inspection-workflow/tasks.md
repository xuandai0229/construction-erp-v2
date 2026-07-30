# Tasks: Lát 1 — Guardrail, Data Model, Domain và RBAC Core

**Phạm vi**: Chỉ Lát 1 đã được chủ hệ thống phê duyệt. Không gồm UI, upload runtime, offline outbox, GPS, ghi âm, Word/PDF runtime, dashboard, notification hoặc approval UI.

## Phase 1: Guardrail

- [x] T001 Xác minh nhánh/worktree và lưu bằng chứng Git trong báo cáo Lát 1 tại `specs/002-safety-inspection-workflow/slice-1-report.md`
- [x] T002 Khóa hai template V1 bằng SHA-256 và metadata thật trong `artifacts/safety-inspection-template-analysis/template-manifest.json`
- [x] T003 Xác minh role enum, project scope và lập mapping code thật trong `src/lib/safety-inspection/permissions.ts`

## Phase 2: Tests trước triển khai

- [x] T004 [P] [US1] Viết test tuần, ngoại lệ tuần và lịch ngoài kỳ trong `src/lib/safety-inspection/__tests__/week.test.ts`
- [x] T005 [P] [US1] Viết test plan/session/result/checklist invariants trong `src/lib/safety-inspection/__tests__/inspection-domain.test.ts`
- [x] T006 [P] [US2] Viết test finding, gia hạn, kiểm tra lại và overdue dẫn xuất trong `src/lib/safety-inspection/__tests__/finding-domain.test.ts`
- [x] T007 [P] [US3] Viết test report lock, role mapping, cross-project và evidence guard trong `src/lib/safety-inspection/__tests__/permissions.test.ts`
- [x] T008 [P] [US1] Viết test idempotency key và retry mutation trong `src/lib/safety-inspection/__tests__/idempotency.test.ts`

## Phase 3: Prisma foundation

- [x] T009 Tạo enums/models/relation/index additive trong `prisma/schema.prisma`
- [x] T010 Tạo migration additive mới trong `prisma/migrations/20260730150000_add_safety_inspection_slice1/migration.sql`
- [x] T011 Xác minh migration không sửa/xóa model hoặc bảng `Supervision*` trong `prisma/migrations/20260730150000_add_safety_inspection_slice1/migration.sql`

## Phase 4: Domain và RBAC core

- [x] T012 [P] [US1] Triển khai types, timezone/week và plan/result invariants trong `src/lib/safety-inspection/types.ts`, `src/lib/safety-inspection/week.ts`, `src/lib/safety-inspection/inspection-domain.ts`
- [x] T013 [P] [US2] Triển khai finding transitions, reinspection, extension và selector overdue trong `src/lib/safety-inspection/finding-domain.ts`
- [x] T014 [P] [US3] Triển khai permission matrix thật và evidence guards trong `src/lib/safety-inspection/permissions.ts`, `src/lib/safety-inspection/evidence-permissions.ts`
- [x] T015 [P] [US1] Triển khai idempotency/audit primitives trong `src/lib/safety-inspection/idempotency.ts`, `src/lib/safety-inspection/audit.ts`
- [x] T016 [US3] Xuất public domain API ổn định tại `src/lib/safety-inspection/index.ts`

## Phase 5: Validation

- [x] T017 Chạy `npx prisma format`, `npx prisma validate`, `npx prisma generate`
- [x] T018 Chạy unit test tập trung và `npx tsc --noEmit`
- [x] T019 Kiểm tra `DATABASE_URL` đã che bí mật; chỉ chạy integration khi tên DB thể hiện QA/test/ci/sandbox và ghi kết quả trong `specs/002-safety-inspection-workflow/slice-1-report.md`
- [x] T020 Đối chiếu git diff, xác nhận không đổi `Supervision*`, hoàn tất báo cáo Lát 1 tại `specs/002-safety-inspection-workflow/slice-1-report.md`

## Dependencies

- T001–T003 chặn mọi thay đổi schema.
- T004–T008 phải tồn tại và thất bại đúng nguyên nhân trước T009–T016.
- T009 hoàn thành trước T010; T012–T016 dựa trên enum/invariant chốt ở T009.
- T017–T020 chỉ chạy sau khi domain/schema hoàn tất.

## Cổng chấp nhận

- Prisma validate, TypeScript và unit test phải PASS.
- Migration chỉ additive, không có `DROP`, `TRUNCATE`, `DELETE` hoặc thay đổi bảng `Supervision*`.
- `OVERDUE` không tồn tại trong `SafetyFindingStatus`.
- Scope đa công trình dùng relation/FK thật.
- Evidence permission không dựa vào `canViewDocument`.
- Nếu không có QA DB an toàn, trạng thái tối đa là `PASS STATIC / DATABASE RUNTIME BLOCKED`.

## Lát 1.5 — Migration rehearsal và gia cố domain core

### Phase 6: Guardrail và test đỏ

- [x] T021 Lưu bằng chứng Git/migration chưa phát hành và quyết định chỉnh migration Lát 1 trong `specs/002-safety-inspection-workflow/slice-1.5-report.md`
- [x] T022 [P] Viết unit test session đột xuất, result nhiều finding, FAIL→PASS, version và template/checklist scope
- [x] T023 [P] Viết unit test transition reinspection, severity, gia hạn, completedAt và permission đình chỉ
- [x] T024 [P] Viết unit test evidence trace qua Document, assignment/state và cancel/void
- [x] T025 Viết integration/concurrency test cho idempotency, active template và scope transaction rollback

### Phase 7: Schema và domain hardening

- [x] T026 Sửa schema additive trước phát hành: unplanned session, result→findings, due snapshot, evidence void, report-entry cancel và constraint
- [x] T027 Tái tạo migration Safety chưa commit với partial unique/check constraints; không đổi `Supervision*`
- [x] T028 Gia cố `saveInspectionResultWithFinding` bằng trusted actor, state/version, multi-finding và advisory-lock idempotency
- [x] T029 Gia cố reinspection bằng policy server-side, matrix duy nhất và optimistic version cho finding/action
- [x] T030 Tạo transaction service schedule/report-entry đồng bộ project scope và audit
- [x] T031 Gia cố evidence authorization/mutation và activation template cạnh tranh an toàn

### Phase 8: Rehearsal và validation

- [x] T032 Tạo database QA sạch có tên `safety_migration_rehearsal`, chạy toàn bộ `prisma migrate deploy`
- [x] T033 Xác minh `prisma migrate status` sạch và `prisma migrate diff` không drift
- [x] T034 Chạy Prisma format/validate/generate, TypeScript và unit test
- [x] T035 Chạy integration/concurrency suite trên QA sạch và cleanup theo manifest
- [x] T036 Xác minh không tác động production/`Supervision*`, chạy post-hook và hoàn tất báo cáo Lát 1.5

## Lát 2A — Baseline, checklist chính thức và server boundary/API core

### Phase 9: Baseline và test đỏ

- [x] T037 Đóng băng Lát 1/1.5 thành checkpoint Git tách discovery, domain/schema và QA evidence
- [x] T038 Chạy Prisma/TypeScript/Vitest/build/lint baseline và loại bỏ warning concurrency `pg`
- [x] T039 [P] Viết unit test canonical checklist/hash/bootstrap, error mapping và actor permission
- [x] T040 [P] Viết unit test DTO filtering, plan đa công trình và approval adapter
- [x] T041 Viết HTTP integration/security test cho auth, scope, tampering, version và idempotency

### Phase 10: Reference data và boundary

- [x] T042 Tạo canonical checklist `SAFETY_COMPANY_V1`, ma trận nguồn, manifest SHA-256 và migration metadata additive
- [x] T043 Tạo bootstrap checklist V1 idempotent, hash-safe, single-active và audit
- [x] T044 Tách báo cáo drift thành Safety scoped/repository wide với allowlist object chính xác
- [x] T045 Tạo `getSafetyServerActorContext()` server-only từ session/user/membership thật
- [x] T046 Tạo Safety error model, correlation log và response DTO an toàn
- [x] T047 Tạo DTO query/filter cho plan đa công trình theo phương án filtered visibility
- [x] T048 Tạo ApprovalRequest adapter hẹp, Safety aggregate là nguồn trạng thái chính

### Phase 11: API core

- [x] T049 Tạo Route Handler checklist active và plan list/create/detail/update/schedule/collaborator/checklist selection
- [x] T050 Tạo Route Handler submit/review/approve plan theo permission/state/version
- [x] T051 Tạo Route Handler session scheduled/unplanned/read/result/complete
- [x] T052 Tạo Route Handler finding list/detail/assign/remediation/reinspection

### Phase 12: QA và bàn giao

- [x] T053 Chạy bootstrap/reference data và HTTP security/concurrency suite trên QA sạch, lưu manifest không chứa secret
- [x] T054 Chạy Prisma/TypeScript/Vitest/lint/build/diff cuối và xác minh không đổi `Supervision*`
- [x] T055 Tạo checkpoint Lát 2A và hoàn tất `slice-2a-report.md`

## Lát 2A.5 — Hợp nhất ngữ nghĩa checklist và tính nguyên tử API

### Phase 13: Baseline và test đỏ

- [x] T056 Xác minh worktree sạch, checksum migration/template/checklist V1 và đọc Route Handler guide Next.js 16
- [x] T057 [P] Viết test canonical operational V2, bảo toàn 55 nguồn, đủ 20 category và không trùng ngữ nghĩa
- [x] T058 [P] Viết test projection 20 nhóm báo cáo, gồm trạng thái hỗn hợp và `Công việc ngày`
- [x] T059 [P] Viết test parser JSON/content-type/body-limit và same-origin
- [x] T060 Viết integration/concurrency test schedule aggregate và mã finding server-side

### Phase 14: Schema và reference data additive

- [x] T061 Thêm migration additive cho source mapping, report category/mapping và sequence mã finding
- [x] T062 Tạo canonical operational checklist V2 và manifest SHA-256
- [x] T063 Tạo bootstrap V2 có advisory lock, hash guard, single-active và audit

### Phase 15: Domain và Route Handler

- [x] T064 Tạo projection tổng hợp report category từ result/finding nguồn
- [x] T065 Tạo aggregate transaction create/update/cancel schedule gồm cấu hình/scope/idempotency/audit
- [x] T066 Sinh finding code server-side concurrency-safe và loại `code` khỏi payload public
- [x] T067 Tạo helper Route Handler chung cho actor/parser/same-origin/error/correlation
- [x] T068 Tách catch-all thành Route Handler theo tài nguyên, không lặp logic quyền
- [x] T069 Bổ sung test approval envelope rollback nguyên tử

### Phase 16: QA và bàn giao

- [x] T070 Chạy bootstrap/reference data, HTTP security và concurrency suite trên QA sạch qua guard
- [x] T071 Chạy Prisma/TypeScript/Vitest/lint/build/diff/drift và xác minh không đổi `Supervision*`
- [x] T072 Commit Lát 2A.5 và hoàn tất `slice-2a.5-report.md`
