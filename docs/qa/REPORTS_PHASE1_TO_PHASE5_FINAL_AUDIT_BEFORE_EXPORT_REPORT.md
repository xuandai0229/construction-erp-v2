# REPORTS PHASE 1 → PHASE 5 FINAL SYSTEM AUDIT BEFORE EXPORT PDF

**Module:** `/reports` — Báo cáo hiện trường  
**Audit date:** 2026-06-22  
**Scope:** Code, Prisma schema/migrations, database, local storage, UI, QA reports, test/build và browser smoke trước Phase 6  
**Final verdict:** **FAIL — chưa đạt audit gate để sang Phase 6**

## A. Executive Summary

Phần nền dữ liệu, lưu report thật, attachment storage, workflow server actions và thuật toán tổng hợp tuần đều có code thật. Database hiện tại giữ được dữ liệu Phase 1–5: 17 reports, 4 attachments, 7 AuditLog; migration foundation đã apply; file vật lý khớp DB.

Tuy nhiên, audit phát hiện các sai lệch quan trọng:

1. `reportNo` chỉ có index thường, không có unique constraint như báo cáo Phase 1 đã khẳng định.
2. UI không truyền `currentUser.role`, vì vậy nút Approve/Reject trong drawer không thể xuất hiện ở code hiện tại.
3. Hàm preview tuần tồn tại nhưng dialog không render nút/bảng preview. `weeklyPreview` không thể được set từ UI, nên tạo weekly report bị chặn.
4. ESLint hiện **FAIL với 9 errors và 17 warnings**.
5. History API chỉ check session, không check creator/admin/project access; role trong timeline vẫn hardcode `"User"`.
6. Weekly duplicate chỉ chặn ở application layer, không có DB unique constraint và vẫn có race window.
7. Các script UAT Phase 4/5 chủ yếu thao tác Prisma trực tiếp, không chứng minh đầy đủ server actions/session/UI như báo cáo cũ mô tả.
8. Browser smoke không hoàn tất do in-app browser gặp `ERR_TOO_MANY_REDIRECTS`; không được tính Browser PASS.

**UAT nội bộ:** **NO-GO** cho Phase 6 tại thời điểm audit.  
**Production:** **NO-GO**.  
**Điều kiện mở gate Phase 6:** sửa regression role/approval UI, khôi phục weekly preview UI, làm sạch ESLint, bổ sung authorization cho history/project actions, rồi chạy lại browser UAT.

## B. Phase-by-phase verification

| Phase | Mục tiêu | Trạng thái báo cáo cũ | Kết quả audit thật | Đánh giá |
| ----- | -------- | --------------------- | ------------------ | -------- |
| Phase 1 | Data model/backend foundation | PASS, đủ sang Phase 2 | Schema và migration có thật, migration đã apply, test report còn tồn tại. Nhưng `reportNo` không unique như báo cáo khẳng định; validation còn mỏng. | PASS WITH RISKS |
| Phase 2 | UI đọc/ghi DB thật | PASS/GO | List, KPI, table, drawer và create form dùng DB/server action thật; mock constants đã xóa. Date filter không có logic; selected work item không được gửi/lưu relation. | PASS WITH RISKS |
| Phase 3 | Upload ảnh/file thật | PASS WITH RISKS | API/storage/metadata/magic bytes/50MB/RBAC MVP có thật; 4/4 file khớp DB. Một số báo cáo cũ còn ghi 200MB và Production GO sai. | PASS WITH RISKS |
| Phase 4 | Approval workflow | PASS/Manual UAT PASS | Server actions và AuditLog có thật. UI hiện không nhận role nên Approve/Reject không render; history authorization thiếu; script UAT không gọi actions thật. | FAIL |
| Phase 5 | Weekly aggregation | PASS WITH RISKS/Browser UAT PASS | Backend aggregation có thật và chỉ cộng APPROVED DAILY. Nhưng weekly preview UI không được render, create weekly từ UI bị chặn; dedup không có DB constraint; script UAT không kiểm thử action thật. | FAIL |

## C. Code/file verification

| Khu vực | File | Kết quả | Ghi chú |
| ------- | ---- | ------- | ------- |
| Reports page | `src/app/(dashboard)/reports/page.tsx` | PARTIAL | Đọc DB thật; mapping attachment/lines thật. Không truyền `session.role` xuống workspace. |
| Server actions | `src/app/(dashboard)/reports/actions.ts` | PARTIAL | Có CRUD/workflow/weekly thật nhưng thiếu project-level authorization, Zod/schema validation và atomic transition guard. |
| Upload API | `src/app/api/reports/[reportId]/attachments/route.ts` | PASS WITH RISKS | Node runtime, auth, MVP RBAC, status lock, magic bytes, limits, rollback, relative path. |
| Attachment view/download | `src/app/api/reports/attachments/[attachmentId]/route.ts` | PASS WITH RISKS | Auth/RBAC/no-cache/sanitize có thật; root containment dùng `startsWith`, chưa phải canonical relative-path check mạnh nhất. |
| History API | `src/app/api/reports/[reportId]/history/route.ts` | FAIL | Chỉ check session; không check quyền report. Role timeline hardcode `"User"`. |
| Workspace | `src/components/reports/reports-workspace.tsx` | PARTIAL | Dữ liệu DB thật, action thật, refresh thật. Date filter state không được áp dụng. |
| Create dialog | `src/components/reports/create-report-dialog.tsx` | FAIL | Daily/upload UI có thật; weekly preview handler tồn tại nhưng không được render/call. |
| Table/mobile | `reports-table.tsx`, `reports-mobile-cards.tsx` | PASS WITH RISKS | Daily/weekly phân biệt được; PDF vẫn đúng là placeholder Phase 6. |
| Detail drawer | `report-detail-drawer.tsx` | FAIL | DB attachment/history thật, daily/weekly khác nhau; approval buttons không xuất hiện do thiếu role prop. |
| Gallery | `site-report-gallery-dialog.tsx` | PASS | Dùng attachment URL thật. |
| Types | `src/components/reports/types.ts` | PARTIAL | Không còn mock constants; còn comment/type legacy và status union không bao phủ toàn bộ Prisma enum. |
| Audit script | `scripts/reports-final-audit-phase1-to-5.ts` | PASS | Chỉ đọc DB/disk, không update/delete/create dữ liệu. |

### Git status

Trước khi audit, `git status --short` không có output: worktree sạch.

Sau khi audit:

| Trạng thái | File | Phạm vi |
| ---------- | ---- | ------- |
| `??` | `scripts/reports-final-audit-phase1-to-5.ts` | Script audit read-only được yêu cầu |
| `??` | `docs/qa/REPORTS_PHASE1_TO_PHASE5_FINAL_AUDIT_BEFORE_EXPORT_REPORT.md` | Báo cáo audit được yêu cầu |

- Không có file modified từ trước audit.
- Không có migration mới.
- Không có file storage bị Git track; `git ls-files storage` rỗng và `.gitignore` chặn `/storage/`.
- Không có file ngoài scope Reports bị sửa.
- `prisma generate`, `tsc` và build chỉ tạo/cập nhật artifact ignored trong `node_modules`, `.next`, `*.tsbuildinfo`.

## D. Schema/migration verification

### Schema

| Model/enum | Kết quả | Ghi chú |
| ---------- | ------- | ------- |
| `SiteReport` | Có đủ nền Phase 1–5 | Có type, dates, weather, content, workflow fields, creator/approver, relations. |
| `SiteReportLine` | Có đủ nền aggregation | Có `fieldProgressItemId`, fallback text fields, quantities, area, unit, sort order. `quantityToday` là non-null Decimal. |
| `SiteReportAttachment` | Đủ cho upload local | Có kind, names, MIME, size, `storagePath`, relation cascade. |
| `AuditLog` | Có thể lưu workflow | Có user/project/action/entity/before/after/time; không có relation trực tiếp tới SiteReport. |
| `SiteReportStatus` | Có | `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `REVISION_REQUESTED`, `LOCKED`, `CANCELLED`. |
| `SiteReportType` | Có | `DAILY`, `WEEKLY`. |
| `WeatherCondition` | Có | Đủ các enum hiện dùng. |
| `SiteReportAttachmentKind` | Có | `PHOTO`, `FILE`. |
| Relations | Có | Project/User/WBSItem/FieldProgressItem được khai báo. |

### Migration

- Migration `20260622025729_add_site_reports_foundation` tồn tại và DB ghi nhận `finished_at`, không rollback.
- Migration foundation không có `DROP TABLE`/`DROP COLUMN`; chỉ drop/re-add FK của `wbsItemId`, add columns/table/index/FK.
- Migration lịch sử `20260608082919_add_site_progress_reports` có nhiều `DROP COLUMN` và warning data loss. Đây không phải migration foundation Phase 1, nhưng là rủi ro lịch sử cần lưu hồ sơ.
- `reportNo` là `NOT NULL DEFAULT gen_random_uuid()::text`, nhưng chỉ có:

  `CREATE INDEX "SiteReport_reportNo_idx" ...`

  Không có `CREATE UNIQUE INDEX` và schema không có `@unique`.
- Không có unique constraint/index cho `projectId + weekStartDate + weekEndDate` của weekly report.

### Technical debt schema

- `SiteReportPhoto` legacy tồn tại song song với `SiteReportAttachment`.
- Các legacy fields `weather`, `manpowerCount`, `equipmentNote`, `generalNote` còn tồn tại.
- `publicUrl` chưa dùng trong local-storage flow.
- Không có source linkage từ weekly line về daily source reports; chỉ lưu note text.
- `reportNo` vẫn là UUID kỹ thuật, chưa phải mã nghiệp vụ.

**Có cần migration mới chỉ để làm Phase 6 PDF:** Không bắt buộc.  
**Có cần migration/DB constraint trước Production:** Có, nên khóa uniqueness cho `reportNo` và weekly project/week sau khi thiết kế xử lý dữ liệu trùng/race. Audit này không tạo migration.

## E. Backend/API verification

| Function/API | Session | Quyền | Validate | Ghi DB/Audit | Revalidate | Rủi ro |
| ------------ | ------- | ----- | -------- | ------------ | ---------- | ------ |
| `getActiveProjects` | Không | Không | N/A | Read DB | Không | Lộ danh sách project qua server action nếu gọi trực tiếp. |
| `getProjectWorkItems` | Không | Không | Chỉ projectId | Read DB | Không | Không project access check. |
| `getSiteReports` | Có | MVP creator/admin | Filter enum | Read DB | N/A | ADMIN/DIRECTOR toàn cục; chưa project-level. |
| `createSiteReport` | Có | Không check project access | Chỉ project/date và line count; không Zod/range/enum chặt | Create report + lines | Có | Không set `submittedAt`/AuditLog khi tạo thẳng SUBMITTED; double submit tạo record mới; selected work-item relation bị mất. |
| `submitSiteReport` | Có | Creator | Chặn ngoài DRAFT/REJECTED | Transaction update + AuditLog | Có | Read-then-update có race; update không kèm status predicate. |
| `approveSiteReport` | Có | ADMIN/DIRECTOR | Chỉ SUBMITTED | Transaction update + AuditLog | Có | Race transition tương tự; note optional đúng yêu cầu. |
| `rejectSiteReport` | Có | ADMIN/DIRECTOR | Reason non-empty, chỉ SUBMITTED | Transaction update + AuditLog | Có | Race transition tương tự. |
| `getSiteReportAuditLogs` | Không tự check | Không | reportId | Read AuditLog | N/A | Khi gọi qua history route chỉ có auth, không report authorization. |
| `getWeeklyReportPreview` | Có | Không check project access | Không validate date order/range | Read DB | N/A | Duplicate check application-only; missingDays tính ngày có bất kỳ DAILY status nào. |
| `createWeeklyReportFromApprovedDailyReports` | Có | Không check project access | Có approvedCount > 0 | Create weekly/lines; AuditLog nếu SUBMITTED | **Không** | Không `revalidatePath`; duplicate race do thiếu DB unique; `any` cho weather. |

### Weekly logic

- Query có `type: "DAILY"` nên không lấy WEEKLY vào tổng hợp.
- Query lấy tất cả DAILY trong range để đếm status, sau đó chỉ `approvedReports` được aggregate.
- DRAFT không vào `approvedCount/pendingCount/rejectedCount`; SUBMITTED vào pending; REJECTED vào rejected.
- Group key đúng: `fieldProgressItemId`, fallback `workName || workContent + unit + area`.
- `quantityToday` DB non-null; `Number(line.quantityToday || 0)` vẫn xử lý phòng thủ.
- Có `approvedCount`, `pendingCount`, `rejectedCount`, `missingDays`.
- Chống trùng có hai lần check ở application/transaction, nhưng không atomic trước concurrent requests.

### Attachment APIs

| Kiểm tra | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| `runtime = "nodejs"` | PASS | Cả POST và GET. |
| Session | PASS | 401 nếu chưa đăng nhập. |
| MVP RBAC | PASS WITH RISKS | Creator hoặc ADMIN/DIRECTOR; chưa project membership. |
| Approved/Locked upload block | PASS | Trả 403. |
| Extension/type/size/count | PASS | Whitelist extension, 10MB/photo, 20MB/file, 10 photos, 5 files. |
| Total request size | PASS | 50MB mỗi request. UI gửi photo/file thành hai request riêng. |
| Magic bytes | PASS | JPEG/PNG/WebP/PDF/ZIP-based/OLE/RAR. |
| Relative storage path | PASS | Record hiện tại đều relative. |
| Absolute path leak | PASS | Upload response không trả `storagePath`. |
| Rollback cleanup | PASS WITH RISKS | Best-effort unlink/deleteMany khi vòng ghi lỗi. |
| Path traversal | PASS WITH RISKS | Chặn `..`; containment nên dùng `path.relative` thay vì chỉ `startsWith`. |
| Content-Disposition | PASS | Có sanitize filename; photo inline, file attachment. |
| Cache headers | PASS | `private, no-store, max-age=0`. |

## F. Frontend/UI verification

| Hạng mục | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| List reports DB thật | PASS | Server page gọi `getSiteReports`. |
| KPI/table/search/type/status/project filter | PASS WITH RISKS | Dùng array DB thật; dateRange UI không lọc dữ liệu. |
| Daily create DB thật | PASS WITH RISKS | Gọi action thật và refresh. Không gửi `wbsItemId/fieldProgressItemId/area`; time không được ghép vào reportDate. |
| Creator hardcode | PASS | Dùng session name, không còn `creatorName: "Admin"` trong source. |
| Upload thật | PASS | Sau create gọi POST API cho photos/files. |
| Gallery/attachments | PASS | Dùng attachment IDs/API thật. |
| Daily/weekly display | PASS | Table/mobile/drawer phân biệt type. |
| Approval history | PASS WITH RISKS | Fetch DB thật; role vẫn mock `"User"` và API thiếu authorization. |
| Action buttons theo role/status | **FAIL** | Page/workspace không truyền role; Approve/Reject condition luôn false. |
| Approved upload/edit lock | PASS WITH RISKS | API chặn upload; UI không có edit/upload-existing flow ở mọi status. |
| Weekly preview | **FAIL** | Handler tồn tại nhưng không có nút/bảng render; `loadingPreview` và handler bị ESLint báo unused. |
| Weekly create | **FAIL từ UI** | Validation bắt buộc `weeklyPreview`, nhưng UI không thể tạo preview. Backend action vẫn tồn tại. |
| Mobile | STATIC PASS WITH RISKS | Có card layout; browser responsive smoke không hoàn tất. |
| Text “phase sau” | ACCEPTED | Chỉ còn ở nút Download/PDF, phù hợp vì Phase 6 chưa làm. |

## G. DB integrity verification

Script đã chạy:

`npx tsx --env-file=.env scripts/reports-final-audit-phase1-to-5.ts`

| Chỉ số | Giá trị | Đánh giá |
| ------ | ------: | -------- |
| Tổng reports | 17 | Có dữ liệu thật |
| DAILY | 16 | Có |
| WEEKLY | 1 | Có |
| DRAFT | 3 | Có |
| SUBMITTED | 7 | Có |
| APPROVED | 7 | Có |
| REJECTED | 0 | Không có hiện tại |
| LOCKED | 0 | Không có hiện tại |
| Attachments | 4 | 3 PHOTO, 1 FILE |
| `reportNo` null/empty | 0 | PASS dữ liệu hiện tại |
| Duplicate `reportNo` groups | 0 | PASS dữ liệu hiện tại, nhưng DB không khóa unique |
| Absolute `storagePath` | 0 | PASS |
| Path traversal storagePath | 0 | PASS |
| Missing attachment file on disk | 0 | PASS |
| DB/disk size mismatch | 0 | PASS |
| Hard orphan attachment | 0 | PASS |
| Attachment thuộc soft-deleted report | 0 | PASS |
| Disk file không có DB record | 0 | PASS |
| Report AuditLog | 7 | Có workflow evidence |
| Phase 1 `TEST-REPORT-001` | 1 | Còn tồn tại: `cmqomn34d0000k4wkmnkfty7w` |
| Phase 2.1 UAT marker | 2 | Còn dữ liệu test |
| Duplicate weekly project/week groups | 0 | PASS dữ liệu hiện tại, chưa có DB constraint |
| Weekly không có lines | 0 | PASS |
| Weekly usable date range | 1 | Có |
| Approved daily trong weekly window | 2 | 4 daily lines → 3 weekly lines, phù hợp aggregation structural |

Không thể chứng minh lineage tuyệt đối giữa weekly lines và daily source vì schema không lưu source report IDs.

## H. QA reports consistency check

| File báo cáo | Có tồn tại | Có mâu thuẫn | Cần sửa không | Ghi chú |
| ------------ | ---------- | ------------ | ------------- | ------- |
| `REPORTS_PHASE1_DATA_MODEL_BACKEND_FOUNDATION_REPORT.md` | Có | Có | Có | Ghi `reportNo` có Unique Index; thực tế chỉ index thường. |
| `REPORTS_PHASE1_VERIFICATION_AND_RISK_LOCK_REPORT.md` | Có | Có | Có | Ghi `@unique` phát huy hiệu quả; schema/DB không có unique. |
| `REPORTS_PHASE2_UI_DB_INTEGRATION_REPORT.md` | Có | Nhẹ | Có thể cập nhật | Nội dung lịch sử đúng phần lớn; các phần “chưa làm” đã lỗi thời sau Phase 3–5. |
| `REPORTS_PHASE2_VERIFICATION_UAT_REPORT.md` | Có | Nhẹ | Có thể cập nhật | Ghi Browser PASS nhưng audit hiện tại không tái xác minh được; hardcode creator đã được Phase 2.1 sửa. |
| `REPORTS_PHASE2_1_PRE_PHASE3_HARDENING_REPORT.md` | Có | Có theo hiện trạng | Có | Ghi codebase/ESLint sạch; hiện ESLint Reports FAIL do thay đổi Phase sau. |
| `REPORTS_PHASE3_FILE_UPLOADS_REPORT.md` | Có | Có | Có | Ghi tối đa 200MB/lần; hiện API là 50MB/request. |
| `REPORTS_PHASE3_VERIFICATION_AND_SECURITY_HARDENING_REPORT.md` | Có | Có nội bộ | **Có** | Đầu file ghi Production đạt, cuối file NO-GO; còn ghi 200MB và “user login bất kỳ” trái RBAC MVP hiện tại. |
| `REPORTS_PHASE3_1_UPLOAD_PRODUCTION_RISK_LOCK_REPORT.md` | Có | Ít | Có thể giữ | Đã đính chính 50MB, creator/admin RBAC và Production NO-GO; nhưng không sửa trực tiếp file Phase 3 nên mâu thuẫn liên-file vẫn còn. |
| `REPORTS_PHASE4_APPROVAL_WORKFLOW_REPORT.md` | Có | Có | Có | Backend đúng phần lớn; UI role regression làm nút duyệt/từ chối không render. |
| `REPORTS_PHASE4_VERIFICATION_REAL_UAT_REPORT.md` | Có | Có | Có | Script được gọi là Server Action UAT nhưng thực tế update Prisma trực tiếp và bypass session/actions. |
| `REPORTS_PHASE4_1_REAL_BROWSER_UAT_LOCK_REPORT.md` | Có | Có nội bộ | Có | Bảng test ghi Browser PASS nhưng kết luận ghi `NOT FULLY VERIFIED`. |
| `REPORTS_PHASE4_2_MANUAL_BROWSER_UAT_CONFIRMATION_REPORT.md` | Có | Có với code hiện tại | Có | Manual PASS không còn khớp regression thiếu role prop. |
| `REPORTS_PHASE5_WEEKLY_AGGREGATION_REPORT.md` | Có | Có | **Có** | Ghi preview UI tồn tại/PASS 100%; source hiện không render preview. Script không test actual action và không tạo SUBMITTED/REJECTED cases. |
| `REPORTS_PHASE5_1_WEEKLY_AGGREGATION_VERIFICATION_UAT_REPORT.md` | Có | Có | **Có** | Ghi Browser UAT preview PASS và “sẵn sàng 100% Phase 6”; trái code hiện tại. Không ghi/chạy ESLint trong mục test. |

Không thiếu file nào trong danh sách audit.

## I. Test/build results

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx prisma validate` | PASS | Schema load thành công. |
| `npx prisma generate` | PASS | Prisma Client v7.8.0 generated. |
| `npx tsc --noEmit` | PASS | Chạy lại sau khi sửa type của script audit. |
| `npx eslint "src/components/reports/" "src/app/(dashboard)/reports/" "src/lib/"` | **FAIL** | 9 errors, 17 warnings. Reports có `no-explicit-any`, `set-state-in-effect`, unused weekly preview handler/state. |
| `npm run build` | PASS WITH WARNING | Build exit 0; Turbopack warning whole-project trace từ attachment route/filesystem path. |
| `npx tsx --env-file=.env scripts/reports-final-audit-phase1-to-5.ts` | PASS | Read-only; số liệu DB/storage ở mục G. |

Các script `verify-site-report-approval-workflow.ts` và `verify-weekly-report-aggregation.ts` không được chạy lại trong audit vì chúng tạo/update dữ liệu thật và không cleanup, trái mục tiêu read-only của đợt kiểm tra này.

### Browser smoke

| Kiểm tra | Kết quả |
| -------- | ------- |
| HTTP `/reports` | 307 redirect `/login` khi không có session |
| HTTP `/login` | 200 |
| In-app browser `/reports` | `ERR_TOO_MANY_REDIRECTS` |
| List/daily/weekly/gallery/history/filter/preview/F5/console | **NOT VERIFIED** |

Không báo Browser PASS.

## J. Rủi ro còn lại trước Phase 6

1. **Approval UI regression — HIGH:** thiếu `currentUser.role`, Admin/Director không thấy nút duyệt/từ chối.
2. **Weekly preview/create UI regression — HIGH:** preview handler không được render; weekly create từ UI bị khóa.
3. **Project-level RBAC chưa hoàn chỉnh — HIGH:** actions/project data/history chưa dùng ProjectMember access.
4. **History authorization — HIGH:** user login có thể query history report nếu biết ID.
5. **Weekly unique constraint DB chưa có — HIGH:** application check có race condition.
6. **`reportNo` unique constraint DB chưa có — MEDIUM/HIGH:** báo cáo cũ mô tả sai.
7. **ESLint FAIL — HIGH cho quality gate:** 9 errors.
8. **Backup storage chưa làm — HIGH Production.**
9. **Cleanup attachment/report chưa làm — MEDIUM/HIGH.**
10. **FieldProgress sync chưa làm — nghiệp vụ còn hở.**
11. **Source lineage weekly→daily chưa có — auditability hạn chế.**
12. **Browser UAT hiện tại chưa xác minh — HIGH trước release.**
13. **Export PDF chưa làm — đúng phạm vi Phase 6.**

Với các rủi ro nền và regression trên, **Production NO-GO**.

## K. Quyết định Go/No-Go

- **Có được sang Phase 6 Export PDF ngay không:** **NO-GO**.
- **Điều kiện bắt buộc trước khi mở Phase 6:**
  1. Truyền role thật xuống Reports UI và xác minh Approve/Reject.
  2. Khôi phục/render weekly preview và xác minh create weekly từ UI.
  3. Sửa ESLint errors trong Reports.
  4. Bổ sung report authorization cho history và project access cho actions liên quan.
  5. Chạy lại browser smoke/UAT với session hợp lệ.
- **UAT nội bộ:** **NO-GO** tại audit gate hiện tại.
- **Production:** **NO-GO**.

DB constraint cho uniqueness và storage backup/cleanup có thể được lập kế hoạch riêng, nhưng phải được ghi nhận là điều kiện Production; không được tiếp tục mô tả hệ thống là “100% ready”.

## L. Xác nhận an toàn

- Không commit.
- Không push.
- Không reset database.
- Không xóa dữ liệu cũ.
- Không chạy script cleanup/normalization.
- Không tạo migration mới.
- Không làm Phase 6 Export PDF.
- Chỉ tạo một script audit read-only và file báo cáo tổng hợp này.
