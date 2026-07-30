# Báo cáo Lát 2A — Baseline, checklist chính thức và API core

## 1. Kết luận

**PASS Lát 2A. Production tiếp tục NO-GO.**

Baseline Lát 1/1.5 đã được đóng băng, build production PASS, checklist V1 có hash ổn định và bootstrap idempotent, HTTP security suite chạy trên database QA sạch PASS. Lát này không triển khai UI hoàn chỉnh, Word/PDF, upload runtime, offline, GPS hoặc ghi âm.

## 2. Git baseline và commit

- Nhánh: `codex/002-safety-inspection-workflow`.
- Baseline discovery/template: `78a500a`.
- Baseline schema/domain: `8a600ab`.
- Baseline QA/rehearsal: `3b15dbe`.
- Triển khai Lát 2A: `7d3c48c`.
- Migration Lát 1 giữ nguyên SHA-256 `7eb1d6a11ce056f9fc1f3c066e60698462e20af269c4507b9a4dd9464b7a5815`.
- Checksum hai file nguồn và hai DOCX export đều khớp `template-manifest.json`.

## 3. Checklist chính thức V1

- Code/version: `SAFETY_COMPANY_V1` / `1`.
- SHA-256 canonical JSON: `93d6ceb42aab613effe277aaf78b5552b3616609e70465d7364bd81c99554470`.
- 7 section, 75 item.
- Bao phủ 55 dòng nguồn kế hoạch và đủ 20/20 mục báo cáo; các mục trùng được giữ bằng item code riêng và mapping `reportItemNumbers`.
- `sourceText` giữ nguyên lỗi/chữ gốc; `normalizedLabel` chỉ phục vụ UI.
- Migration additive: `20260730190000_add_safety_checklist_v1_metadata`.
- Bootstrap khóa bằng advisory lock, cùng code/version khác hash bị chặn, lần chạy lại không tạo trùng, chỉ một version active và có `SafetyAuditLog`.
- CLI bootstrap chỉ cho QA đã qua guard và yêu cầu actor thật qua `SAFETY_BOOTSTRAP_ACTOR_ID`.

Artifact:

- `prisma/reference-data/safety-checklist-company-v1.json`
- `artifacts/safety-inspection-template-analysis/checklist-v1-manifest.json`
- `specs/002-safety-inspection-workflow/checklist-v1-matrix.md`

## 4. Server actor resolver

`getSafetyServerActorContext()` là resolver `server-only` duy nhất:

- Đọc session cookie thật bằng `getSession()`.
- Session được đối chiếu user active/chưa xóa trong DB.
- Đọc system role, membership/project role và project scope từ DB.
- Permission được tính theo role thật cho từng project.
- Sinh/kiểm tra `correlationId`.
- Payload client không thể cấp `actorId`, role, permission, scope hoặc policy độc lập.

`ADMIN` chỉ có `safety.view` và `safety.template.manage`; không tự có quyền sửa finding.

## 5. Quy tắc plan đa công trình

Chọn phương án A: DTO plan được lọc schedule server-side.

- Actor toàn công ty xem toàn bộ.
- Actor scope hạn chế chỉ nhận schedule, collaborator và checklist thuộc project được phép.
- Không trả tổng số schedule/project ẩn.
- Khi bị lọc trả `scopeLimited=true` và nhãn `Nội dung được giới hạn theo quyền.`
- Detail/mutation trực tiếp ngoài scope trả cùng lỗi an toàn, không xác nhận resource có tồn tại.

## 6. Error model

Các mã đã triển khai:

- `SAFETY_UNAUTHENTICATED`
- `SAFETY_FORBIDDEN_OR_NOT_FOUND`
- `SAFETY_VALIDATION_FAILED`
- `SAFETY_STATE_CONFLICT`
- `SAFETY_VERSION_CONFLICT`
- `SAFETY_IDEMPOTENCY_CONFLICT`
- `SAFETY_RESOURCE_LOCKED`
- `SAFETY_TEMPLATE_UNAVAILABLE`
- `SAFETY_INTERNAL_ERROR`

Response chỉ chứa mã, thông điệp tiếng Việt và correlation ID. HTTP tests xác nhận không lộ stack, Prisma `P2002/P2034` hoặc database detail. Log nội bộ có correlation ID.

## 7. Route/API

Route Handler Next.js 16: `src/app/api/safety-inspection/[...segments]/route.ts`.

| Method | Route |
|---|---|
| GET | `/api/safety-inspection/checklists/active` |
| GET/POST | `/api/safety-inspection/plans` |
| GET/PATCH | `/api/safety-inspection/plans/:planId` |
| POST | `/api/safety-inspection/plans/:planId/schedules` |
| PATCH | `/api/safety-inspection/schedules/:scheduleId` |
| POST | `/api/safety-inspection/schedules/:scheduleId/cancel` |
| POST | `/api/safety-inspection/plans/:planId/submit` |
| POST | `/api/safety-inspection/plans/:planId/review` |
| POST | `/api/safety-inspection/schedules/:scheduleId/start` |
| POST | `/api/safety-inspection/sessions/unplanned` |
| GET | `/api/safety-inspection/sessions/:sessionId` |
| POST | `/api/safety-inspection/sessions/:sessionId/results` |
| POST | `/api/safety-inspection/sessions/:sessionId/complete` |
| GET | `/api/safety-inspection/findings` |
| GET | `/api/safety-inspection/findings/:findingId` |
| POST | `/api/safety-inspection/findings/:findingId/assign` |
| POST | `/api/safety-inspection/findings/:findingId/remediation` |
| POST | `/api/safety-inspection/findings/:findingId/reinspect` |

Payload được parse bằng Zod; route không mutation Prisma trực tiếp mà gọi application/domain service.

## 8. Approval adapter

- `ApprovalRequest` type `SAFETY` là envelope theo từng project của plan.
- `SafetyInspectionPlan.status` là nguồn trạng thái chính.
- Submit/approve/return cập nhật aggregate, envelope, `SafetyApprovalHistory` và audit cùng transaction.
- HTTP integration xác nhận hai envelope theo plan đa công trình cùng theo trạng thái `APPROVED`; không có nguồn trạng thái thứ hai.

## 9. Build và test

| Cổng | Kết quả |
|---|---|
| `npx prisma format` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS — Prisma 7.8.0 |
| `npx tsc --noEmit` | PASS |
| `npx vitest run src/lib/safety-inspection` | PASS — 8 file, 53 test |
| Safety scoped lint | PASS |
| QA runner lint | PASS |
| `npm run build` | PASS |
| Migration deploy/status QA sạch | PASS |
| HTTP/API/security | PASS — 19 request, 17 assertion |
| `git diff --check` | PASS |

Build còn một NFT warning legacy từ `next.config.ts` → `local-storage-provider.ts` → report attachment route, không phát sinh từ Safety và không làm build thất bại. Warning `pg` concurrency đã được loại bỏ bằng Prisma client/pool riêng cho từng nhánh cạnh tranh.

HTTP suite xác minh: unauthenticated, actor tampering, list/detail/mutation chéo project, filtered plan DTO, checklist ngoài template, nhiều findings cho FAIL, concurrent idempotency replay, concurrent version conflict, completed session lock, role duyệt thật, ADMIN không sửa finding, approval envelope invariant, audit correlation ID và không lộ lỗi nội bộ.

## 10. Schema drift

- `safetySchemaDriftClean=true`.
- `repositorySchemaDriftClean=false`.
- `rawExitCode=2`.
- `allowedDifferences` đúng hai object:
  - `SafetyChecklistTemplate_one_active_per_code`
  - `SafetyDocumentTemplate_one_active_per_type`
- `unexpectedDifferences=[]`.
- Legacy status: **REPOSITORY LEGACY DRIFT — NGOÀI PHẠM VI SAFETY — PRODUCTION RELEASE BLOCKER**.

Không sửa `Supervision*`.

## 11. QA và production safety

- Database rehearsal cuối: `construction_erp_v2_qa_safety_migration_rehearsal_c3c8f46d63`.
- Guard xác minh database QA khác `DATABASE_URL` chính, không in password.
- Toàn bộ migration được deploy bằng `prisma migrate deploy`.
- Database rehearsal đã được xóa (`databaseDropped=true`).
- Không reset/wipe, không migrate/fixture production.
- Runtime request manifest không chứa cookie, token hoặc password.

## 12. Việc còn lại trước UI

- Production vẫn NO-GO do chưa phê duyệt deploy và repository legacy drift.
- Chưa có UI hoàn chỉnh, upload evidence runtime, notification, offline/GPS/voice hoặc Word/PDF.
- Lát UI phải tiếp tục dùng DTO đã lọc và không gọi Prisma trực tiếp.
- Cần thiết kế màn nhập hiện trường/mobile dựa trên API hiện có ở lát tiếp theo.
