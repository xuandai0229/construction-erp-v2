# Báo cáo Chỉ huy trưởng — Deep System Audit

Ngày audit: 2026-08-12  
Phạm vi: runtime hiện tại của `/reports/field`, luồng tạo/sửa/xem/submit/approve/reject, upload attachment, RBAC, DB/storage và đối chiếu với `/reports/weekly-inspection`.  
Chế độ: audit only. Không sửa application code, schema, workflow, dữ liệu 21 công trình thật hay seed dữ liệu hàng loạt.

## 1. Kết luận điều hành

Hệ thống không có một lỗi “upload/storage hỏng toàn cục”. Luồng upload ảnh đã chạy end-to-end trong database QA cô lập: tạo báo cáo tuần nháp, chọn 2 ảnh, lưu, ghi 2 dòng `SiteReportAttachment`, ghi file vào `storage/site-reports/<reportId>/`, rồi hiển thị lại 2 ảnh trong drawer chi tiết.

Defect đã tái hiện rõ nhất là hợp đồng giữa UI và server của báo cáo ngày:

> UI bật `Lưu nháp` khi đã chọn công trình nhưng chưa có dòng công việc; helper còn nói có thể lưu nháp trước và bổ sung khối lượng sau. Khi bấm lưu, Server Action từ chối với “Báo cáo ngày cần ít nhất 1 dòng công việc”.

Đây là lỗi P1 cho use case “lưu tối thiểu để bổ sung sau” vì người dùng không thể hoàn thành thao tác mà UI đang quảng cáo. Nó không phải lỗi DB: QA database không sinh row sau lần thử thất bại.

Các kết luận khác:

- Query listing/counters loại đúng `deletedAt != null`; dev DB có 1 report DAILY đã soft-delete nên UI 0 là nhất quán với policy hiện tại.
- Attachment pipeline có guard trạng thái, project access, permission `reports.update`, extension whitelist, magic-byte validation, giới hạn 10 ảnh/5 file, transaction DB và rollback file khi transaction lỗi.
- Supervision Weekly có workflow trưởng thành hơn nhưng UX không nhất quán: Admin được policy cho sửa, trong khi editor hiện banner “chỉ có quyền xem” vì UI suy ra từ `isOwner`.
- Không nên xoá approval/submit khỏi Field Report trong một bước: trạng thái đang được dùng bởi approval queue/dashboard, notification, field-progress sync, history, API v1, export và permission checks.

## 2. Bằng chứng đã thực hiện

### Runtime dev — không mutation

- Server hiện tại: `http://127.0.0.1:3001`; tài khoản Admin QA.
- `/reports/field`, `?tab=daily`, `?tab=weekly` đều render; scope toàn hệ thống hiển thị 21 công trình; counters 0/0/0/0.
- Mở form, đổi project scope, chọn công trình và chọn ảnh đều hoạt động; preview ảnh render; không có browser error/warning.
- Không bấm lưu trên DB dev để tránh tạo dữ liệu.
- `/reports/weekly-inspection` render 1 dossier thật, action menu có sửa/xem trước/PDF/DOCX/xóa; mở editor không ghi dữ liệu.

### Runtime QA — mutation được giới hạn trong fixture

- Server riêng: `http://127.0.0.1:3002`, DB `construction_erp_v2_qa`.
- Fixture project dùng: `QA_FIXTURE_PROJ_A`; fixture project B đã soft-delete để phục vụ kiểm tra scope.
- Daily không có work line: nút `Lưu nháp` enabled, click → alert lỗi; collector xác nhận không có `SiteReport` mới.
- Weekly nháp: chọn `Tuần này` → lưu thành công; DB có report WEEKLY/DRAFT, `lineCount=0`, `attachmentCount=0`.
- Weekly evidence: chọn 2 PNG → lưu một tuần QA khác → DB có `attachmentCount=2`, file vật lý tồn tại, drawer hiển thị “Ảnh tiêu biểu (2)”.
- QA artifacts được tạo có chủ đích trong fixture; không phải dữ liệu production/dev.

### DB/storage read-only

Collector: `scratch/field-report-readonly-audit.ts` (SELECT only).

- Dev: 21 project ACTIVE; 1 SiteReport DAILY/DRAFT đã có `deletedAt`, không có attachment; 15 dossier supervision DRAFT.
- QA trước test: không có SiteReport/attachment; có project A granted và project B forbidden/soft-deleted.
- QA sau test: 2 SiteReport WEEKLY/DRAFT trên project A; một report có 2 attachment PHOTO; storage có 2 PNG với kích thước khớp metadata.
- Không đọc/ghi secrets, không dump connection string vào báo cáo.

### Quality baseline

| Kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS; Next 16.2.7, route `/reports/field`, attachment API và supervision routes đều được build |

## 3. Runtime topology và data flow

```text
CreateReportDialog
  ├─ daily → createSiteReport(payload, draft)
  └─ weekly → createWeeklyReportFromApprovedDailyReports(input)
        ↓ reportId
  ├─ POST /api/reports/[reportId]/attachments (PHOTO)
  ├─ POST /api/reports/[reportId]/attachments (FILE)
  └─ submitSiteReport(reportId) nếu người dùng gửi

List/counters → getSiteReportsPage → where.deletedAt = null
Detail/media → GET /api/reports/attachments/[attachmentId]
Approval → SUBMITTED → APPROVED/REJECTED → field-progress sync + audit history
```

Điểm quan trọng: upload chỉ có thể xảy ra sau khi create trả `reportId`. Nếu create fail vì validation hoặc duplicate weekly period, upload không được gọi; người dùng sẽ thấy như “upload không thành công” dù storage endpoint chưa hề được thực thi.

## 4. Findings chính

### FR-001 — Daily draft contract mismatch — P1 — confirmed

Evidence:

- `src/components/reports/create-report-dialog.tsx:223-229,295,619` chỉ buộc work line cho submit nhưng helper nói draft có thể lưu trước.
- `src/components/reports/reports-workspace.tsx:227-243` lại return sớm nếu DAILY không có work line, không phân biệt draft/submit.
- `src/app/(dashboard)/reports/actions.ts:316-362` server cũng reject DAILY rỗng.
- QA runtime tái hiện alert và không tạo row.

Root cause: ba lớp contract không cùng một business rule: button state, client pre-validation và server validation.

Impact: không thể tạo draft “khung” để bổ sung hiện trường sau; người dùng phải nhập work line ngay cả khi chỉ muốn lưu thông tin chung.

### FR-002 — Weekly duplicate period surfaced as generic failure path — P2 — confirmed behavior

`createWeeklyReportFromApprovedDailyReports` kiểm tra report tuần đã tồn tại và throw. Khi thử tạo weekly cùng project/cùng kỳ QA, dev log ghi rõ duplicate. Đây là business guard hợp lý, nhưng UI chưa biến nó thành trạng thái/CTA dễ hiểu; người dùng đang ở form có preview ảnh nhưng create fail trước upload.

Impact: dễ chẩn đoán nhầm là lỗi upload. Cần phân biệt “kỳ đã tồn tại” với “file bị reject” trong telemetry/toast và hướng người dùng mở report hiện hữu.

### FR-003 — Supervision editor permission banner mismatch — P2/P3 — confirmed UX inconsistency

`src/lib/supervision-weekly/permissions.ts:29-64` cho ADMIN quyền edit. Runtime Admin mở dossier do user khác tạo: banner nói “Bạn chỉ có quyền xem” nhưng `Lưu báo cáo` vẫn enabled. Server action vẫn kiểm tra `canEditSupervisionWeeklyDossier`, vì vậy chưa có bằng chứng authorization bypass.

Root cause: UI banner dựa trên `!isOwner`, còn policy cho phép reviewer/admin sửa.

### FR-004 — Attachment pipeline is status-gated, not storage-broken — confirmed design

`POST /api/reports/[reportId]/attachments` yêu cầu report tồn tại, chưa soft-delete, project access, `reports.update`, status DRAFT/REJECTED/REVISION_REQUESTED, file hợp lệ, và giới hạn cumulative. QA end-to-end đạt; lỗi cần được phân loại theo guard cụ thể.

### FR-005 — File input UI không giới hạn extension ở client — P3 — confirmed UX gap

`attachments-card.tsx` có `accept="image/*"` cho ảnh nhưng input tài liệu không có `accept`. Server whitelist chặt hơn. Đây không phải lỗ hổng vì server vẫn validate extension/magic bytes, nhưng UX cho phép chọn file rồi mới bị reject; helper text cũng không phản ánh `.zip/.rar` được server cho phép.

### FR-006 — Soft-deleted report không xuất hiện list — expected behavior

Dev raw DB có một SiteReport đã soft-delete. `getSiteReportsPage` dùng `deletedAt:null` ở report và project; UI 0 là đúng. Không coi đây là counter mismatch.

## 5. RBAC/workflow summary

Field policy hiện tại:

- Create: ADMIN, DIRECTOR, DEPUTY_DIRECTOR, CHIEF_COMMANDER, MANAGER, ENGINEER và phải có project access.
- Content writable: DRAFT, REJECTED, REVISION_REQUESTED.
- Submit: owner của report; construction supervisor là source read-only.
- Approve/reject: high-level role, report SUBMITTED, project access.
- Attachment: cùng nhóm writable status; delete report là soft-delete.
- Progress sync chạy theo SAVE/SUBMIT/APPROVE/REJECT/CANCEL.

Supervision Weekly:

- Readers: SUPERVISION_HEAD, CONSTRUCTION_SUPERVISOR, ADMIN, DIRECTOR, DEPUTY_DIRECTOR.
- Authors: ADMIN, SUPERVISION_HEAD, CONSTRUCTION_SUPERVISOR, DIRECTOR, DEPUTY_DIRECTOR.
- Reviewers: ADMIN, DIRECTOR, DEPUTY_DIRECTOR.
- Server-side edit/delete/transition đều có permission check; không được suy ra quyền từ banner UI.

## 6. Rủi ro và giới hạn audit

- Không chạy matrix login cho tất cả fixture role vì credential hiện hành không được giả định từ source; static policy + Admin runtime + QA fixtures được dùng làm bằng chứng. Đây là gap verification, không phải kết luận mọi role đều pass.
- Không gọi trực tiếp mutation API ngoài UI; upload được kiểm chứng qua file chooser/UI.
- Không approve/reject/delete QA artifacts vì mục tiêu là audit-only và tránh thêm mutation không cần thiết.
- Production-scale concurrency, object-storage migration, antivirus scanning và cross-node storage chưa được load test.

## 7. Verdict

Hệ thống có nền tảng persistence/RBAC/upload tốt hơn cảm nhận từ lỗi UI hiện tại. Ưu tiên trước mắt là thống nhất contract daily draft và phân loại lỗi create/duplicate/upload. Approval không nên bị loại bỏ ngay; cần một transitional compatibility plan như tài liệu `FIELD_REPORT_WORKFLOW_SIMPLIFICATION_IMPACT.md`.
