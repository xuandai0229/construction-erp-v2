# Báo cáo Lát 2A.5 — Hợp nhất checklist và API nguyên tử

## 1. Kết luận

**PASS Lát 2A.5.** Production tiếp tục **NO-GO** và toàn phân hệ chưa được tuyên bố hoàn thành. Không có UI, Word/PDF, upload runtime, offline, GPS hoặc ghi âm trong lát này.

## 2. Git và migration

- Nhánh: `codex/002-safety-inspection-workflow`.
- Baseline đầu vào: `0a833e9`.
- Commit implementation: `c462834` (`feat(safety): unify checklist semantics and atomic API`).
- Migration additive: `20260730220000_add_safety_operational_checklist_and_finding_sequence`.
- SHA-256 migration mới: `e0e5b1f67a92aa130f51ba4dec43f46baa89d30079b2972fc42f76e93584eba2`.
- Migration Lát 1 vẫn giữ SHA-256 `7eb1d6a11ce056f9fc1f3c066e60698462e20af269c4507b9a4dd9464b7a5815`.
- Không sửa migration đã phát hành; không có `DROP`, `TRUNCATE`, `DELETE` hoặc thay đổi bảng `Supervision*`.

Migration mới thêm `SafetyChecklistItemSource`, `SafetyReportCategory`, `SafetyReportCategoryItem`, `SafetyFindingSequence`, cờ `isRequired`/`isScored` và `SafetyFinding.localReference`. Tất cả FK lịch sử dùng `ON DELETE RESTRICT`.

## 3. Checklist operational V2

- Code/version: `SAFETY_COMPANY_V1` / `2`.
- Canonical SHA-256: `30d9e389f74677bfc9592b2fc32799f6fccd80ceca397a98d0e90cf937d18c54`.
- Nguồn V1 bất biến: `93d6ceb42aab613effe277aaf78b5552b3616609e70465d7364bd81c99554470`.
- 5 section, 38 operational item, 20 report category.
- Bao phủ đủ 55/55 dòng kế hoạch; thiếu nguồn `[]`; mã nguồn không biết `[]`.
- 20/20 số category báo cáo; không có operational item mang code `RP-*`.
- Nhãn operational sau chuẩn hóa không trùng; mỗi kết quả được nhập một lần rồi có thể chiếu tới nhiều category.
- Bootstrap dùng advisory lock `SAFETY_COMPANY_V1:OPERATIONAL`, từ chối cùng code/version khác hash, giữ V1 để audit, chỉ kích hoạt một version và ghi audit.

Ma trận đầy đủ: `artifacts/safety-inspection-template-analysis/safety-checklist-operational-v2-matrix.md`. Manifest: `artifacts/safety-inspection-template-analysis/safety-checklist-operational-v2-manifest.json`.

### 20 category và mapping

| Category | Operational item nguồn |
|---|---|
| RP-001 | OP-PPE-001 |
| RP-002 | OP-HEIGHT-001, OP-HEIGHT-004, OP-HEIGHT-005 |
| RP-003 | OP-ACCESS-001 |
| RP-004 | OP-HEIGHT-002 |
| RP-005 | OP-HEIGHT-003 |
| RP-006 | OP-HEIGHT-005, OP-HEIGHT-006, OP-EXC-001, OP-EXC-002 |
| RP-007 | OP-FIRE-001 |
| RP-008 | Không mapping; chờ làm rõ nghiệp vụ |
| RP-009 | OP-MACH-001..004 |
| RP-010 | OP-ACCESS-002 |
| RP-011 | OP-ENV-001 |
| RP-012 | OP-FIRE-002 |
| RP-013 | OP-SIGN-001 |
| RP-014 | OP-ELEC-004, OP-ENV-002, OP-SIGN-001 |
| RP-015 | OP-ELEC-001..005 |
| RP-016 | OP-DOC-001, 002, 003, 005, 006, 008, 009 |
| RP-017 | OP-DOC-006, OP-DOC-007, OP-MGMT-001 |
| RP-018 | OP-MGMT-002 |
| RP-019 | OP-DOC-004, OP-MGMT-003 |
| RP-020 | OP-OTHER-001 |

`8. Công việc ngày` giữ nguyên tuyệt đối trong `sourceText`; đặt `requiresBusinessClarification=true`, `isScored=false`, `blocksCompletion=false`, mapping rỗng và nhãn UI nêu rõ đang chờ xác nhận. Nội dung này không tham gia chấm điểm và không chặn hoàn tất phiên.

## 4. Aggregate schedule nguyên tử

Các route schedule gọi đúng một trong ba service: `createConfiguredSafetySchedule`, `updateConfiguredSafetySchedule`, `cancelConfiguredSafetySchedule`. Mỗi service dùng một serializable transaction cho:

- schedule và optimistic version;
- collaborator có membership đang hoạt động đúng project;
- checklist selection thuộc operational V2 và construction type;
- `SafetyInspectionPlanProject` scope;
- một receipt idempotency cho toàn aggregate;
- audit cùng correlation/client mutation ID.

Không còn route gọi chuỗi `mutate → configure` hoặc receipt `:config`. Test runtime chứng minh checklist sai và collaborator ngoài scope đều rollback schedule, configuration, scope và plan version; retry trả cùng schedule; hai PATCH cùng version cho đúng một `200` và một `409`.

Approval đa công trình kiểm tra tập envelope khớp toàn bộ project trước khi quyết định. Test cố ý làm thiếu một envelope trả `409`; Safety aggregate và envelope còn lại vẫn `PENDING`, sau đó khôi phục mới duyệt được toàn bộ.

## 5. Mã finding server-side

Payload public loại `finding.code`, dùng strict schema và chỉ nhận `localReference` tùy chọn. `SafetyFindingSequence` cấp số bằng `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING`, không dùng `count`. Format hiện tại được tách trong generator: `ATLD-{businessYear}-{sequence 6 chữ số}` theo năm nghiệp vụ Asia/Ho_Chi_Minh.

Runtime tạo hai finding nhận hai mã khác nhau đúng `ATLD-2026-000001` dạng cấu hình; retry cùng mutation trả nguyên `findingCodes` từ receipt, không cấp số hoặc tạo finding trùng. Client gửi `code` bị từ chối `400`.

## 6. HTTP boundary và Route Handler

Helper chung xử lý actor server-side, correlation ID, same-origin, parse JSON có giới hạn 256 KiB và error DTO an toàn. Kết quả runtime:

- JSON sai cú pháp/body trống: `400`.
- Content-Type không phải `application/json`: `415`.
- Payload vượt giới hạn: `413`.
- Cross-origin mutation: `403`.
- Same-origin mutation hợp lệ: PASS.
- Không trả stack, Prisma code hoặc database detail.

Catch-all 426 dòng đã bị xóa. Next.js 16 build nhận 18 route tài nguyên dưới `checklists`, `plans`, `schedules`, `sessions` và `findings`; dynamic route params dùng `Promise` theo tài liệu `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.

## 7. Projection báo cáo

`projectSafetyReportCategories()` chiếu operational result sang 20 category và giữ `resultIds`/`findingIds` để truy nguyên. Thứ tự ưu tiên phản ánh FAIL nhưng vẫn giữ số PASS, N/A và NOT_INSPECTED riêng; category có thể nhận nhiều item và một item có thể đóng góp nhiều category. `Công việc ngày` trả `CLARIFICATION_REQUIRED` nhưng `blocksCompletion=false`.

## 8. Kết quả kiểm thử

- `npx prisma format`: PASS.
- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npx tsc --noEmit`: PASS.
- `npx vitest run src/lib/safety-inspection`: PASS, 11 files / 61 tests.
- Safety scoped lint: PASS, không warning/error.
- QA script lint với `--no-ignore`: PASS.
- `npm run build`: PASS; Next.js 16 nhận đầy đủ route mới.
- `git diff --check`: PASS.
- Rehearsal run cuối: `3605a340-2016-4857-8778-5f91bf119a5e`.
- Database tạm: `construction_erp_v2_qa_safety_migration_rehearsal_3605a34020`; đã drop sau suite.
- `prisma migrate deploy`: PASS, đủ 16 migration theo thứ tự.
- `prisma migrate status`: PASS, database up to date.
- Integration/concurrency: PASS, `stderr` rỗng.
- HTTP/security: PASS, 30 requests, toàn bộ assertion true, `stderr` rỗng.
- Warning `pg client.query()` đã được loại bằng query tuần tự trong interactive transaction và bỏ batch transaction array.

Runtime manifest: `artifacts/safety-inspection-template-analysis/slice2a5-runtime-request-manifest.json`. Rehearsal/cleanup manifest: `artifacts/safety-inspection-template-analysis/slice1.5-migration-rehearsal-manifest.json`.

## 9. Drift và an toàn database

- `safetySchemaDriftClean=true`.
- `repositorySchemaDriftClean=false`, `rawExitCode=2`.
- Safety allowlist chỉ có đúng `SafetyChecklistTemplate_one_active_per_code` và `SafetyDocumentTemplate_one_active_per_type`.
- `unexpectedDifferences=[]`.
- Repository legacy drift: **REPOSITORY LEGACY DRIFT — NGOÀI PHẠM VI SAFETY — PRODUCTION RELEASE BLOCKER**.
- Rehearsal chỉ dùng QA nguồn `construction_erp_v2_qa_e2e_20260723` để tạo database tạm có tên guard. `DATABASE_URL` chính được fingerprint là mục tiêu khác và không nhận migration/fixture. Không in password, không reset/wipe, không `migrate deploy` production.

## 10. Vấn đề còn lại trước UI

- Production vẫn NO-GO do repository-wide legacy drift và chưa có release approval.
- Năm cảnh báo build legacy về filesystem tracing trong report/storage ngoài phạm vi Safety vẫn còn; build PASS nhưng cần xử lý ở luồng riêng trước production release.
- Chưa có UI, upload/evidence runtime route, offline, GPS, voice, notification runtime hoặc Word/PDF theo đúng phạm vi.
- Quy tắc số finding của công ty chưa được phê duyệt; generator đã tách để đổi format mà không đổi khóa dữ liệu.
- `Công việc ngày` vẫn chờ chủ hệ thống xác nhận nghiệp vụ.

Không có thay đổi file/model/migration `Supervision*` trong Lát 2A.5.
