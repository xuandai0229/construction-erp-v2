# Báo cáo Lát 1.5 — Migration rehearsal và gia cố domain core

## 1. Kết luận

**PASS Lát 1.5. Production tiếp tục NO-GO.**

Toàn bộ chuỗi 14 migration đã triển khai thành công trên database QA sạch bằng `prisma migrate deploy`; registry sạch, không còn migration pending và không có drift Safety chưa giải thích. Unit test, integration test và concurrency test đều đạt. Lát này không triển khai UI, API public, upload runtime hoặc xuất Word/PDF, và không phải kết luận hoàn thành toàn phân hệ.

## 2. Git và quyết định migration

- Nhánh thực tế: `codex/002-safety-inspection-workflow`.
- HEAD tại thời điểm kiểm tra: `25ee30c` (`don`).
- Migration Safety là file untracked, chưa commit/chia sẻ và chưa được ghi vào registry migration bên ngoài QA cô lập.
- Quyết định: tái tạo chính migration chưa phát hành `20260730150000_add_safety_inspection_slice1`; không tạo migration hardening thứ hai.
- SHA-256 migration cuối: `7eb1d6a11ce056f9fc1f3c066e60698462e20af269c4507b9a4dd9464b7a5815`.
- Không reset, ghi đè hoặc commit các thay đổi discovery có trước.

## 3. Database QA migration rehearsal

- Nguồn kết nối QA dùng để tạo database: `127.0.0.1:5432/construction_erp_v2_qa_e2e_20260723`.
- Database rehearsal sạch: `127.0.0.1:5432/construction_erp_v2_qa_safety_migration_rehearsal_7dc002eb1c`.
- Database cấu hình chính được guard nhận diện: `127.0.0.1:5432/construction_erp_v2_qa`.
- Guard chỉ in host, port và database name; không in mật khẩu.
- Database rehearsal có tên QA rõ ràng, khác database cấu hình chính và được xóa sau khi hoàn tất.
- Không dùng `prisma migrate resolve`, không reset/wipe database chính và không thao tác production.

### Kết quả `prisma migrate deploy`

Exit code: `0`. Cả 14 migration được áp dụng theo đúng thứ tự:

1. `0_baseline_v2_existing_product_schema`
2. `20260716090000_work_management_main_product_phase1`
3. `20260717000000_approval_request_legacy_compatibility`
4. `20260717120000_supervision_head_weekly`
5. `20260720143000_supervision_weekly_rebuild`
6. `20260720150000_supervision_weekly_result_tables`
7. `20260720170000_supervision_weekly_input_ux`
8. `20260720183000_supervision_weekly_direct_entry`
9. `20260720195000_supervision_weekly_category_work_split`
10. `20260723120000_supervision_weekly_verification_fields_reconcile`
11. `20260727120000_add_construction_supervisor_role`
12. `20260727170000_add_executive_weekly_report`
13. `20260728110000_remove_executive_weekly_reports`
14. `20260730150000_add_safety_inspection_slice1`

Hai migration legacy pending ban đầu đã được áp dụng trước migration Safety như yêu cầu.

### Kết quả `prisma migrate status`

Exit code: `0`.

```text
14 migrations found in prisma/migrations
Database schema is up to date!
```

### Kết quả schema drift

Lệnh:

```text
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

Raw exit code là `2`, nhưng parser kiểm soát cho kết quả `unexpectedDriftEntities=[]`; không có drift Safety chưa giải thích:

- Hai khác biệt Safety được chủ động giữ lại là partial unique index `SafetyChecklistTemplate_one_active_per_code` và `SafetyDocumentTemplate_one_active_per_type`. Prisma DSL không biểu diễn partial unique index nên diff đề nghị bỏ chúng; catalog DB xác nhận hai index tồn tại đúng.
- Các khác biệt `Supervision*` là drift legacy có trước, nằm ngoài phạm vi và bị cấm sửa trong lát này.

Vì vậy `schemaDiffClean=true` theo tiêu chí “không có drift ngoài khác biệt được giải thích”, không phải tuyên bố raw diff exit code bằng 0.

## 4. Schema diff và ràng buộc database

- Session hỗ trợ nguồn có lịch hoặc đột xuất: `scheduleId`/`planId` nullable, `checklistTemplateId` bắt buộc, `unplannedReason` bắt buộc khi không có lịch.
- `SafetyInspectionResult` có quan hệ một-nhiều với `SafetyFinding`; bỏ unique trên `inspectionResultId`, thêm index thường.
- `SafetyFinding.originalDueAt` là hạn ban đầu; `effectiveDueAt` là nguồn chuẩn duy nhất để tính quá hạn.
- `SafetyCorrectiveAction.requestedDueAtSnapshot` chỉ là snapshot bất biến.
- Evidence và report entry dùng cancel/void có lý do, actor, thời gian và version; không hard-delete.
- Bổ sung partial unique index bảo đảm một template active theo `code`/`templateType`.
- Bổ sung check constraint cho khoảng tuần, sequence dương, nguồn session, lý do N/A, tọa độ, cancel coherence, hạn hiệu lực và `completedAt` chỉ đi cùng `COMPLETED`.
- Migration additive, không có `DROP`, `TRUNCATE` hoặc `DELETE`; không chứa thay đổi `Supervision*`.

## 5. Domain và state transition

### Lưu kết quả kiểm tra

- Boundary chỉ truyền `SafetyServerActor` lấy từ session và DB; payload công khai không nhận `actorId`, role, permission hoặc project scope.
- Chỉ session `DRAFT`/`IN_PROGRESS` được sửa; `COMPLETED`/`CANCELLED` bị chặn.
- Checklist item phải thuộc template active/locked hợp lệ của session và selection của schedule nếu có.
- Kiểm tra optimistic version cho session và result.
- `NOT_APPLICABLE` yêu cầu lý do sau `trim`.
- `FAIL` hỗ trợ một hoặc nhiều findings trong cùng transaction và không thể lưu nếu không có finding.
- Không thể đổi `FAIL` thành `PASS`/`NOT_APPLICABLE` âm thầm khi đã có finding; không xóa finding.
- Session đột xuất bắt buộc lý do, project scope và permission `safety.inspection.unplanned`; mọi tạo session có audit.

### Idempotency race

- Khóa advisory theo actor + mutation ID trong transaction `ReadCommitted`.
- Receipt lưu request hash và immutable `resultData`.
- Retry cùng mutation ID/hash replay trực tiếp từ `resultData`, không truy vấn aggregate có thể đã đổi.
- Cùng mutation ID nhưng khác hash bị từ chối an toàn.
- Xử lý `P2002`/`P2034` thành lỗi nghiệp vụ tiếng Việt, không lộ lỗi unique thô.

### Reinspection matrix

- `ACCEPT_COMPLETION`: chỉ từ finding `WAITING_REINSPECTION` + action `SUBMITTED`; conclusion bắt buộc; chuyển finding `COMPLETED`, set `completedAt`, action `ACCEPTED`.
- `REJECT_REWORK`: yêu cầu conclusion/reason; chuyển finding `IN_REMEDIATION`, action `REWORK_REQUIRED`, xóa `completedAt`.
- `EXTEND_DUE_DATE`: finding chưa hoàn thành/hủy; ngày mới lớn hơn `effectiveDueAt`; lưu previous/new due và reason; cập nhật hạn trong cùng transaction.
- `ESCALATE_SEVERITY`: chỉ tăng theo `REMINDER < MEDIUM < SERIOUS < IMMEDIATE_DANGER`.
- `SUSPEND_WORK`: cần permission `safety.work.suspend` và reason; set `workSuspended`, finding `IN_REMEDIATION`, action `REWORK_REQUIRED`.
- Tất cả transition kiểm tra finding version và action version, ghi reinspection/audit/idempotency trong cùng transaction.

Policy kiểm tra độc lập được server tính từ actor, finding, action và người gửi khắc phục; không nhận `independentReviewRequired` từ client.

## 6. Permission và evidence authorization

- Bổ sung permission: `safety.session.reopen`, `safety.finding.correct_result`, `safety.work.suspend`, `safety.evidence.cancel`, `safety.inspection.unplanned`.
- Mapping dùng role code thật của repository; không tạo role mới và không cấp mặc định các quyền nhạy cảm cho `ADMIN`.
- Evidence trace đầy đủ: evidence → finding → action → document → project.
- Guard xác minh project của evidence, finding, action và document đồng nhất.
- Upload của BCH/chỉ huy yêu cầu assignee hoặc đơn vị được giao, không chỉ membership chung; finding/action phải ở trạng thái cho phép.
- View/download trả lỗi không phân biệt “không tồn tại” với “không có quyền”; không trả storage URL.
- Delete được thay bằng cancel/void có lý do và audit; chặn void evidence đã dùng trong reinspection hoặc report khóa.

## 7. Đồng bộ project scope

- Create/update/cancel schedule và reconcile `SafetyInspectionPlanProject` chạy trong cùng `prisma.$transaction`.
- Create/update/cancel report entry và reconcile `SafetyWeeklyReportProject` chạy trong cùng transaction.
- Không xóa scope nếu vẫn còn schedule/entry active khác cùng project.
- Scope thay đổi có audit.
- Integration test ép lỗi trong sync và xác nhận mutation nguồn rollback, không xuất hiện trạng thái scope trung gian sai.

## 8. Kết quả kiểm thử

| Hạng mục | Kết quả |
|---|---|
| `npx prisma format` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS — Prisma Client 7.8.0 |
| `npx tsc --noEmit` | PASS |
| `npx vitest run src/lib/safety-inspection` | PASS — 6 file, 47 test |
| Migration deploy QA sạch | PASS — 14/14 |
| Migration status | PASS — up to date |
| Integration/concurrency | PASS — 17/17 assertion |
| `git diff --check` | PASS |

Integration đã xác minh: active template cạnh tranh, scope rollback/retention, idempotency replay và hash mismatch, optimistic conflict, nhiều findings/result, chặn FAIL→PASS, chặn sửa completed session, policy độc lập server-side, reinspection matrix, evidence cross-project/document/assignment/state, DB constraints và report scope rollback.

Có một deprecation warning từ thư viện `pg` khi integration cố ý tạo truy vấn cạnh tranh trên cùng client; không làm thất bại test và không phải lỗi migration/domain.

## 9. Artifact và cleanup manifest

- `artifacts/safety-inspection-template-analysis/slice1.5-migration-rehearsal-manifest.json`: output đầy đủ của deploy/status/diff, migration checksum, constraint/index và cleanup.
- `artifacts/safety-inspection-template-analysis/slice1.5-integration-manifest.json`: fixture ID, 17 assertion và kết quả cleanup.
- Cleanup: `DATABASE_REHEARSAL_DROP`; database rehearsal đã được xóa (`databaseDropped=true`).

## 10. Bằng chứng không tác động production

- Guard xác nhận database rehearsal có dấu hiệu QA và khác database cấu hình chính.
- Chỉ tạo/xóa database rehearsal riêng; không chạy reset, wipe, migrate deploy hoặc fixture trên production.
- Không có dòng legacy `Supervision*` bị sửa; migration Safety không chứa `Supervision`.
- Không triển khai UI, public API, runtime upload, offline, GPS, voice hoặc Word/PDF trong lát này.

## 11. Vấn đề còn lại trước Lát 2

- Production vẫn NO-GO; chưa được phép triển khai migration lên production.
- Drift legacy `Supervision*` cần một công việc riêng có phê duyệt; không được hòa giải trong feature Safety.
- Prisma chưa biểu diễn partial unique index, nên quy trình drift tiếp tục cần allowlist có kiểm soát cho hai index Safety.
- Cần giữ server boundary theo đúng trusted-actor/resource-state pattern khi xây API ở lát sau.
- Upload/stream/signed URL runtime, UI, offline và tài liệu Word/PDF chưa thuộc phạm vi và chưa được triển khai.
