# Báo cáo triển khai Lát 1 — Guardrail, Data Model, Domain và RBAC Core

## Kết luận

**PASS có điều kiện.**

- Static gate: PASS.
- Unit test: PASS, 27/27.
- Integration trên database QA cô lập: PASS; toàn bộ fixture đã được xóa theo ID manifest.
- Production: **NO-GO**. Không chạy migration, seed hoặc fixture trên production.
- Điều kiện còn lại: QA đang có hai migration cũ chưa áp dụng nên migration mới chỉ được chạy bằng chính file SQL trên QA để kiểm thử runtime, chưa được ghi nhận trong `_prisma_migrations` bằng `migrate deploy`. Cần xử lý lịch sử migration QA trước khi diễn tập deployment theo chuỗi đầy đủ.
- Đây không phải trạng thái hoàn thành toàn phân hệ. UI, upload runtime, offline, GPS, giọng nói, Word/PDF, dashboard, notification và approval UI thuộc các lát sau.

## Bằng chứng Git

Trước khi tạo nhánh:

```text
git branch --show-current
main

git log -5 --oneline
25ee30c don
fe9cc96 don_pate42
43acecf don_pate41
6fdb794 chore: clean generated artifacts and legacy scratch files
3dcb577 Don_12
```

Nhánh thực tế sau khi chuyển:

```text
codex/002-safety-inspection-workflow
```

Các thay đổi discovery chưa commit đã tồn tại trước Lát 1 được giữ nguyên; không reset hoặc ghi đè.

## Template V1 đã khóa

Manifest: `artifacts/safety-inspection-template-analysis/template-manifest.json`.

| Loại | File nguồn | SHA-256 nguồn | Byte | DOCX export / SHA-256 | Trang |
|---|---|---|---:|---|---:|
| `WEEKLY_PLAN` | `KẾ HOẠCH KIỂM TRA ATLĐ. PCCC, VSMT CÔNG TRÌNH         .doc` | `723EEEBEB93B6DBFE49688BB7FAF1414FF1E5602160D9AAA055E1D5E460F50E3` | 69.120 | `ke-hoach-kiem-tra.docx` / `1B925CC6863097FC66F643091DE1B10210942E42172323ED5CF93EB26E7D7361` | 5 |
| `WEEKLY_SELF_ASSESSMENT_REPORT` | `2. BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA AT, VSLĐ.doc` | `3C334F384CADB52B8BCF058F9F1592DE3689F771FC600E4A91936115E820272E` | 67.072 | `bao-cao-tu-danh-gia.docx` / `6C6998A61C8B5ECE04CDD3016C7A8D2A961BF8609915BC3743EA9C7F90ADA10C` | 3 |

Snapshot UTC: `2026-07-30T01:48:27Z`. V1 active và ghi rõ phải giữ nguyên lỗi chính tả, “Nơi nhân”, “Công việc ngày” cùng footer/số trang không nhất quán. Hai file `.doc` nguồn không bị sửa.

## Schema và migration additive

Migration mới:

```text
prisma/migrations/20260730150000_add_safety_inspection_slice1/migration.sql
```

Nội dung:

- 15 enum `Safety*`.
- 22 model/bảng `Safety*`, gồm các model bắt buộc và `SafetyIdempotency`.
- 22 câu `CREATE TABLE`; không có câu lệnh bắt đầu bằng `DROP`, `TRUNCATE` hoặc `DELETE`.
- Không chứa tên `Supervision`; không sửa migration cũ.
- Mọi FK lịch sử/nghiệp vụ dùng `ON DELETE RESTRICT`.
- Plan/report đa công trình dùng `SafetyInspectionPlanProject` và `SafetyWeeklyReportProject`, có FK, unique composite và index theo project.
- Collaborator dùng `SafetyInspectionScheduleCollaborator`; không lưu ID người dùng trong JSON.
- Nội dung checklist dự kiến dùng `SafetyInspectionScheduleChecklistItem`; ghi chú tự do nằm ở `plannedFreeText`.
- Số văn bản dùng `documentYear`, `sequenceNumber`, `documentNumber` và unique `(documentYear, sequenceNumber)`. Repository chưa có organization/tenant phù hợp nên không tự tạo tenant mới.
- `SafetyFindingStatus` không có `OVERDUE`; quá hạn chỉ đi qua `isSafetyFindingOverdue`.
- Idempotency unique theo `(actorId, aggregateType, aggregateId, clientMutationId)`.

Diff hiện tại của `prisma/schema.prisma` so với HEAD: **684 dòng thêm, 0 dòng xóa**. Kiểm tra diff không có dòng `Supervision*` bị thêm/xóa.

## Mapping role code thật

Nguồn: enum `UserRole`, `ProjectRole` trong Prisma và `src/lib/roles/role-registry.ts`. Không thêm role mới.

| Vai trò nghiệp vụ | Role code hiện hữu | Quyền Safety cốt lõi |
|---|---|---|
| Cán bộ ATLĐ/HSE | `ProjectRole.HSE`; `UserRole.SUPERVISION_HEAD` cho phạm vi được gán | lập/sửa plan, bắt đầu/hoàn tất session, tạo/cập nhật finding, reinspection, lập/sửa report, evidence |
| Ban chỉ huy/chỉ huy trưởng | `UserRole.CHIEF_COMMANDER`; `PROJECT_MANAGER`, `SITE_COMMANDER`, `CHIEF_COMMANDER`, `ASSISTANT_COMMANDER` | xem, gửi khắc phục, xem/tải evidence; không có quyền quyết định reinspection |
| Phòng kỹ thuật/trưởng bộ phận | `UserRole.MANAGER`; `ProjectRole.QA_QC` | xem, review plan/report, xem evidence |
| Ban Giám đốc | `DIRECTOR`, `DEPUTY_DIRECTOR` | xem, duyệt plan/report, xem evidence |
| Quản trị viên | `ADMIN` | xem và quản lý template; không tự có quyền sửa finding/nghiệp vụ |
| Giám sát hiện trường | `CONSTRUCTION_SUPERVISOR` | xem trong scope và xem evidence |

Scope công trình được tính từ server context/membership. Không tin role/project gửi từ client.

## Domain, transaction và guard

- Múi giờ nghiệp vụ cố định `Asia/Ho_Chi_Minh`; timestamp lưu UTC.
- Tuần chuẩn Thứ Hai–Chủ nhật; kỳ ngoại lệ bắt buộc có lý do.
- Plan/report locked không sửa được.
- `NOT_APPLICABLE` bắt buộc lý do.
- `FAIL` tạo finding trong cùng transaction.
- Một item chỉ có một result trong session.
- Result/finding/action/evidence phải cùng project với nguồn.
- Chỉ reinspection `ACCEPT_COMPLETION` được hoàn tất finding.
- Policy độc lập chặn người gửi khắc phục tự kiểm tra lại.
- Gia hạn tạo reinspection/audit và cập nhật hạn hiệu lực trong cùng transaction.
- Retry cùng mutation trả lại kết quả cũ, không tạo result/finding lặp; khác request hash bị từ chối.
- Đồng bộ scope project của plan/report từ schedule/entry nằm trong transaction.
- Guard riêng `assertCanViewSafetyEvidence`, `assertCanUploadSafetyEvidence`, `assertCanDeleteSafetyEvidence`; repository truy vết evidence → finding/action → project trước khi áp scope membership và permission; không dựa vào `canViewDocument` và không tạo storage URL công khai.
- Không có `any`, user/project hard-code hoặc mock quyền trong production code.

## File tạo/sửa trong Lát 1

Tạo:

- `artifacts/safety-inspection-template-analysis/template-manifest.json`
- `artifacts/safety-inspection-template-analysis/slice1-integration-fixture-manifest.json`
- `prisma/migrations/20260730150000_add_safety_inspection_slice1/migration.sql`
- `scripts/qa/safety-inspection-slice1.integration.ts`
- `src/lib/safety-inspection/`: 11 file domain/guard/transaction và năm file unit test.
- `specs/002-safety-inspection-workflow/tasks.md`
- báo cáo này.

Sửa:

- `prisma/schema.prisma` — chỉ thêm relation Safety vào model dùng chung và thêm enum/model Safety.
- `specs/002-safety-inspection-workflow/data-model.md` — bỏ `OVERDUE` persisted, bổ sung relation đa công trình/collaborator/checklist/idempotency và quy tắc số văn bản.

## Kết quả lệnh kiểm tra

| Lệnh | Kết quả |
|---|---|
| `npx prisma format` | PASS |
| `npx prisma validate` | PASS — schema valid |
| `npx prisma generate` | PASS — Prisma Client 7.8.0 |
| `npx tsc --noEmit` | PASS |
| `npx vitest run src/lib/safety-inspection/__tests__` | PASS — 5 files, 27 tests |
| `npx tsx scripts/qa/assert-safe-qa-database.ts` | PASS — QA `construction_erp_v2_qa_e2e_20260723`, host `127.0.0.1`; khác database cấu hình chính |
| `npx tsx scripts/qa/safety-inspection-slice1.integration.ts` | PASS — 6/6 assertion; cleanup true |

`prisma migrate status` trên QA báo ba migration pending:

```text
20260727170000_add_executive_weekly_report
20260728110000_remove_executive_weekly_reports
20260730150000_add_safety_inspection_slice1
```

Vì có hai migration ngoài phạm vi đang pending, không chạy `migrate deploy`. Chính file SQL mới được áp dụng bằng `prisma db execute` trên QA cô lập để kiểm thử runtime; không dùng reset/wipe và không chạm production.

## Kết quả integration

Run ID: `safety-slice1-0e5cb385-63f4-4acb-9141-2eb77ffeb2c7`.

- Plan có hai project: PASS.
- Tạo schedule/session và lưu PASS/N/A/FAIL: PASS.
- FAIL tạo finding cùng transaction: PASS.
- Retry cùng `clientMutationId` không tạo trùng: PASS.
- Cross-project invariant rollback, không để lại result: PASS.
- Corrective action và gửi kết quả: PASS.
- Reinspection reject không hoàn thành finding: PASS.
- Reinspection accept mới hoàn thành finding: PASS.
- Report project relation đồng bộ từ entry: PASS.
- Cleanup toàn bộ fixture theo ID manifest: PASS (`cleanupCompleted: true`).

## Thay đổi so với data-model discovery

1. Bỏ `OVERDUE` khỏi vòng đời; dùng selector dẫn xuất duy nhất.
2. Thêm relation scope đa công trình cho plan/report.
3. Thay collaborator IDs JSON bằng relation user và snapshot hiển thị.
4. Tách checklist dự kiến có cấu trúc khỏi ghi chú tự do.
5. Thay unique số văn bản toàn cục bằng year/sequence composite.
6. Tách idempotency thành primitive/bảng riêng theo actor + aggregate + mutation.
7. Evidence dùng guard ATLĐ riêng, truy scope project ở backend.
8. Bổ sung transaction optimistic version, audit và đồng bộ relation project.

## Vấn đề chuyển sang Lát 2

- Hợp nhất lịch sử migration QA để có thể diễn tập `migrate deploy` theo đúng thứ tự và ghi registry.
- Gắn permission/transaction service vào server boundary thực tế khi tạo API.
- Thiết kế route evidence trả stream hoặc signed URL ngắn hạn sau guard.
- Thêm approval runtime, notification, upload, offline/outbox và UI theo đúng lát tương ứng.
- Chưa triển khai xuất Word/PDF hoặc golden document; production tiếp tục NO-GO.
