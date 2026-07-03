# Reports Module Phase 1 Fix Report - 2026-07-03

## 1. Kết luận

**PASS CÓ ĐIỀU KIỆN**

Phase 1 đã sửa các lỗi nghiệp vụ chính của màn `/reports`: count/card/stats/table dùng cùng semantics, `REJECTED` không còn bị gộp với `REVISION_REQUESTED`, creator không còn fallback `N/A` khi DB có `createdBy`, server actions/API/print/history đã có guard quyền theo report/project, date range và group tuần dùng timezone Việt Nam.

Điều kiện còn lại: chưa chạy browser visual/responsive vì yêu cầu không chạy `npm run dev`. Build production đã pass; còn 1 warning Turbopack về dynamic filesystem trace ở storage route, không thuộc scope reports Phase 1.

## 2. Danh sách lỗi đã fix

| Mã | Trạng thái | Kết quả Phase 1 |
|---|---|---|
| RPT-001 | Fixed | Card/stats/table dùng `computeReportStats` và `pageData.stats` từ cùng query filter. |
| RPT-002 | Fixed | `REJECTED` chỉ tính từ chối; `REVISION_REQUESTED` tách riêng. |
| RPT-003 | Fixed | `SUBMITTED` label runtime đổi thành "Đã gửi - Chờ duyệt". |
| RPT-004 | Fixed | Query list include `createdBy id/name/email/role`; creator fallback dùng `reporterName -> createdBy.name -> email -> không xác định`. |
| RPT-005 | Fixed | `createSiteReport` check role + project access; ACCOUNTANT/VIEWER không được tạo. |
| RPT-006 | Fixed | `submit/approve/reject/update/delete` check session, report tồn tại, project access, status, policy role. |
| RPT-007 | Fixed | Print route check `canPrintReport` + project access trước khi fetch audit logs. |
| RPT-008 | Fixed | History API/action check session + project access + `canViewReportHistory`. |
| RPT-009 | Fixed | Date range today/week/month/custom dùng Asia/Ho_Chi_Minh. |
| RPT-010 | Fixed | Week grouping table dùng helper VN; 2026-07-01 nằm Tuần 27: 2026-06-29 - 2026-07-05. |
| RPT-011 | Fixed | Pagination giữ `pageSize=10`; count/stats không bị tính theo page hiện tại. |
| RPT-012 | Fixed | Toolbar/filter reset page về 1 khi đổi search/filter/tab. |
| RPT-013 | Fixed một phần | Sticky toolbar và sticky table header đã thêm; chưa browser screenshot responsive. |
| RPT-014 | Fixed một phần | Cột ảnh không còn dấu `-`; hiện "Chưa có ảnh" hoặc count ảnh/file. Thumbnail thật nâng cao chuyển Phase 2. |
| RPT-015 | Fixed một phần | Delete đã có confirm UI sẵn và backend policy; audit log immutable đầy đủ chuyển Phase 2. |

## 3. File đã sửa

- `src/app/(dashboard)/reports/actions.ts`
- `src/app/(dashboard)/reports/page.tsx`
- `src/app/print/reports/[reportId]/page.tsx`
- `src/components/reports/types.ts`
- `src/components/reports/reports-workspace.tsx`
- `src/components/reports/reports-toolbar.tsx`
- `src/components/reports/reports-table.tsx`
- `src/lib/reports/report-workflow-policy.ts`
- `src/lib/reports/report-transition-service.ts`
- `src/lib/reports/report-stats.ts`
- `src/lib/reports/report-timezone.ts`
- `scripts/qa-reports-phase1-verify.ts`

## 4. Trước / Sau

### Count

Trước: table active-visible 38 nhưng card "Từ chối" có thể gộp `REJECTED + REVISION_REQUESTED`, còn thống kê nhỏ chỉ đếm `REJECTED`.

Sau: QA script đọc DB thật:

- Active visible total: `38`
- `DRAFT=4`
- `SUBMITTED=18`
- `APPROVED=15`
- `REJECTED=0`
- `REVISION_REQUESTED=1`
- `issues=4`
- `approvalRate=39`

### Status

Trước: `REJECTED` và `REVISION_REQUESTED` bị gộp trong một số card/filter.

Sau:

- Chờ duyệt = `SUBMITTED`
- Đã duyệt = `APPROVED`
- Từ chối = `REJECTED`
- Yêu cầu chỉnh sửa = `REVISION_REQUESTED`
- Nháp = `DRAFT`
- Phát sinh = report có `issues` meaningful hoặc `lines.issueNote`

### Creator N/A

Trước: 18/38 report active có `reporterName=null` nhưng DB có `createdBy`; UI hiện `N/A`.

Sau: QA script kiểm `18` report thiếu `reporterName` nhưng có `createdBy`, không còn fallback ra `N/A`.

### Permission

Trước: tạo report chỉ cần project access; print route có TODO RBAC; audit action thiếu guard.

Sau: policy dùng chung:

- `canCreateReport`
- `canUpdateReport`
- `canDeleteReport`
- `canSubmitReport`
- `canApproveReport`
- `canRejectReport`
- `canPrintReport`
- `canExportReport`
- `canViewReportHistory`

QA policy evidence:

- DIRECTOR/ADMIN/ENGINEER được tạo theo rule.
- ACCOUNTANT/VIEWER không được tạo.
- Direct access ngoài project bị chặn với print/history.
- Creator không được update approved report.
- Director không được delete approved report.

### UI

Trước: toolbar/header không sticky, cột ảnh dấu `-`, status ambiguous.

Sau:

- Toolbar search/filter sticky.
- Table header sticky.
- Cột ảnh hiển thị "Chưa có ảnh" hoặc số ảnh/file.
- `SUBMITTED` runtime label: "Đã gửi - Chờ duyệt".
- Toolbar có filter `REVISION_REQUESTED`.
- Action buttons giữ `title`/`aria-label`.

## 5. Kết quả lệnh

### `npx prisma validate`

PASS.

```
The schema at prisma\schema.prisma is valid
```

### `npx tsc --noEmit`

PASS.

### `npm run build`

PASS.

Ghi chú: build còn 1 warning Turbopack về dynamic filesystem trace từ `src/lib/storage/local-storage-provider.ts` qua route attachment; không fail build và nằm ngoài Phase 1.

### `npx tsx scripts/qa-reports-phase1-verify.ts`

PASS.

Key evidence:

```json
{
  "activeVisibleTotal": 38,
  "dbStatusCounts": {
    "SUBMITTED": 18,
    "APPROVED": 15,
    "REVISION_REQUESTED": 1,
    "DRAFT": 4
  },
  "stats": {
    "total": 38,
    "rejected": 0,
    "revisionRequested": 1,
    "needsAction": 19,
    "issues": 4
  }
}
```

Timezone checks PASS:

- 2026-06-29 -> Tuần 27: 2026-06-29 - 2026-07-05
- 2026-07-01 -> Tuần 27: 2026-06-29 - 2026-07-05
- 2026-07-05 -> Tuần 27: 2026-06-29 - 2026-07-05
- 2026-07-06 -> Tuần 28: 2026-07-06 - 2026-07-12

## 6. Rủi ro còn lại

- Chưa chạy browser visual vì không được chạy dev server; sticky/responsive cần xác nhận bằng ảnh ở Phase 1.1 hoặc Phase 2.
- Một số text tiếng Việt trong codebase gốc vẫn có mojibake, không xử lý lan rộng trong Phase 1.
- Attachment business rule chưa bắt buộc ảnh theo loại công việc; hiện chỉ hiển thị rõ trạng thái ảnh.
- Audit log hiện có nhưng chưa phải immutable audit timeline đầy đủ.
- Export PDF/Excel nâng cao chưa làm; print route đã siết quyền.

## 7. Chuyển Phase 2

- Unique `reportNo` migration nếu cần rule cứng cấp DB.
- Cleanup/backfill DB cho `reporterName`, text mojibake, dữ liệu seed/demo nếu được duyệt.
- Offline/GPS/PWA cho hiện trường.
- Export PDF/Excel nâng cao.
- Audit immutable đầy đủ và approval timeline trong detail drawer.
- Browser responsive QA bằng Playwright/dev server sau khi được phép chạy localhost.
