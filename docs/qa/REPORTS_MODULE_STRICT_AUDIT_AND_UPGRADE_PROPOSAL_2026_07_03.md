# Reports Module Strict Audit And Upgrade Proposal - 2026-07-03

## 1. Ket luan ngan

**Ket luan: FAIL**

Ly do chinh:
- Man `/reports` dang hien dung tong active-visible **38 bao cao**, nhung cac KPI/trang thai khong dong bo voi nhau va khong dong bo theo search/filter/tab.
- Card "Tu choi" dang gop `REJECTED + REVISION_REQUESTED`, trong khi thong ke nho va group week chi dem `REJECTED`.
- Du lieu nguoi tao bi hien `N/A` do UI chi lay `reporterName`, trong khi DB co `createdBy.name`.
- Permission backend co check o nhieu luong, nhung chua du chat cho san pham ERP: tao bao cao qua rong, update/delete thieu project-access guard, print route co TODO RBAC, action audit logs exported khong tu check session.
- Du lieu DB hien co dau vet UAT/demo/seed va du lieu ban: 55 `SiteReport` tong, chi 38 active-visible; 16 bao cao thuoc project da xoa; 18/38 active-visible thieu `reporterName`; 37/38 active-visible khong co audit log SiteReport.

Co dau hieu fake/hardcode/mock khong: **Co**.
- Code co comment/mock compatibility: `src/components/reports/types.ts:1-2`, `src/components/reports/types.ts:86`.
- Seed/demo tao du lieu UAT/fake: `scripts/seed/seed-uat-demo-project.ts`, `scripts/seed/seed-realistic-tu-hiep-project.ts`.
- Count chinh cua table khong hardcode, nhung KPI/status semantics dang hardcode trong UI va khong dong bo.

Ghi chu: Khong co file anh goc duoc attach trong workspace de inspect pixel-by-pixel. Phan tich anh duoi day dua tren mo ta anh cua request, doi chieu voi code va DB that.

## 2. Bang loi/nguy co

| Ma loi | Muc do | Hien tuong | Bang chung | Anh huong nghiep vu | De xuat xu ly | Can fix ngay |
|---|---|---|---|---|---|---|
| RPT-001 | CRITICAL | Card "Tu choi" khac thong ke nho "Tu choi" | Card dem `REJECTED || REVISION_REQUESTED`: `src/components/reports/reports-workspace.tsx:180-182`; stats nho chi dem `REJECTED`: `src/components/reports/types.ts:157-160`. DB active: `REVISION_REQUESTED=1`, `REJECTED=0`. | Lanh dao thay "Tu choi = 1" nhung thong ke nho "Tu choi = 0"; sai nghia workflow. | Chuan hoa taxonomy: `REJECTED` la tu choi cuoi, `REVISION_REQUESTED` la yeu cau sua; hien rieng hoac doi label. | Co |
| RPT-002 | HIGH | KPI dau trang khong cap nhat theo search/filter/tab | `allReportsForStats` chi goi `getSiteReports({ projectId })`: `src/app/(dashboard)/reports/page.tsx:140`; search/filter/page list dung `getSiteReportsPage(filters)`: `src/app/(dashboard)/reports/page.tsx:50`. | User loc "Bao cao tuan" nhung KPI van la tong project, gay quyet dinh sai. | Tao shared query builder va endpoint/count stats dung cung `where` voi list. | Co |
| RPT-003 | HIGH | UI hien nhieu `N/A` nguoi tao du khong mat `createdBy` | UI map `creatorName: reporterName || 'N/A'`: `src/app/(dashboard)/reports/page.tsx:67`; query list khong include `createdBy`: `src/app/(dashboard)/reports/actions.ts:346-352`. DB: 18/38 active thieu `reporterName`, sample van co `createdBy = Admin (Dev)`. | Mat trach nhiem nguoi lap bao cao; khong dat ERP auditability. | Include `createdBy` trong query va fallback `reporterName || createdBy.name`; backfill `reporterName` neu can. | Co |
| RPT-004 | HIGH | Schema khong unique `reportNo` | Schema chi co index `@@index([reportNo])`: `prisma/schema.prisma:503-507`. DB hien duplicate = 0, null = 0. | Hien chua trung nhung co the trung khi tao nhieu nguon; in/xuat va doi chieu phap ly rui ro. | Them unique constraint sau khi audit/cleanup du lieu va duoc duyet migration. | Co sau duyet |
| RPT-005 | HIGH | Tao bao cao qua rong theo role | `createSiteReport` chi yeu cau session + project access: `src/app/(dashboard)/reports/actions.ts:76-95`. `getAccessibleProjectIds` cho moi member active xem project: `src/lib/rbac.ts:217-232`. DB co `ACCOUNTANT` va `STAFF` projectRole `VIEWER` van la member. | Ke toan/viewer co the tao bao cao hien truong neu co project membership. | Them policy `canCreateReport`: chi ADMIN/DIRECTOR/CHIEF_COMMANDER/MANAGER/ENGINEER hoac project roles duoc phep. | Co |
| RPT-006 | HIGH | Update/delete thieu project-access guard truc tiep | `updateSiteReport` find report theo id va chi goi `canEditReportContent`: `src/app/(dashboard)/reports/actions.ts:657-684`; `softDeleteSiteReport` tuong tu: `src/app/(dashboard)/reports/actions.ts:761-786`. | Neu membership thay doi, creator cu co the thao tac report cua project khong con duoc giao; IDOR lifecycle risk. | Bat buoc `canAccessProject(session, report.projectId)` trong update/delete/submit. | Co |
| RPT-007 | HIGH | Print route RBAC chua dung project assignment | Print chi cho `ADMIN/DIRECTOR` hoac creator: `src/app/print/reports/[reportId]/page.tsx:70-79`, co TODO `Implement ProjectUser RBAC`: line 76. | Chi huy truong/ky su duoc giao project nhung khong phai creator co the khong in duoc; DEPUTY_DIRECTOR bi loai. | Dung chung `canAccessProject`; them action-level export audit neu can. | Co |
| RPT-008 | HIGH | Audit log khong lien tuc | DB audit: action SiteReport chi 5 logs; activeNoAudit = 37/38. Schema co `AuditLog`: `prisma/schema.prisma:826-844`; create/update/delete moi ghi log, seed/du lieu cu khong. | Khong truy vet duoc lich su nop/duyet/sua/xoa cho phan lon bao cao. | Backfill audit baseline va bat buoc log moi transition/print/export/delete. | Co |
| RPT-009 | MEDIUM | `REVISION_REQUESTED` bi dem lech trong weekly preview | Weekly preview dem rejected chi `REJECTED`: `src/app/(dashboard)/reports/actions.ts:475-477`, trong khi tab rejected gom ca revision: `src/app/(dashboard)/reports/actions.ts:225`. | Bao cao tuan danh gia sai so bao cao can sua/chua hop le. | Tach `rejectedCount` va `revisionRequestedCount`. | Co |
| RPT-010 | MEDIUM | "Phat sinh" khong phai field chuan | UI tu suy dien tu `issues` va `lines.issueNote`: `src/app/(dashboard)/reports/page.tsx:112-129`; query tab issues dung dieu kien text: `src/app/(dashboard)/reports/actions.ts:226-247`. DB active issuesCount = 4. | Co the dem nham khi user ghi "Khong co..." khac dau/cach viet; khong co severity chuan. | Them model/field `hasIssue`, `issueSeverity`, `issueType` hoac normalize khi save. | Nen |
| RPT-011 | MEDIUM | Timezone VN chua chuan hoa | Code tu nhan "Timezone approximation" roi dung Date local: `src/app/(dashboard)/reports/actions.ts:307-336`; table group week dung `parseISO/getISOWeek`: `src/components/reports/reports-table.tsx:67-87`. DB: report `2026-07-01T00:00:00Z` hien VN 07:00, ISO week 27. | Neu server/browser khac timezone, filter today/week va group week co the lech ngay. | Dung helper Asia/Ho_Chi_Minh cho date bounds va week grouping. | Co |
| RPT-012 | MEDIUM | Header/filter khong sticky | Table header chi `<thead>` khong co `sticky top-*`: `src/components/reports/reports-table.tsx:92-120`; toolbar wrapper khong sticky: `src/components/reports/reports-workspace.tsx:649-667`. | Cuon xuong mat ngu canh cot/filter; anh 2 cho thay dung. | Sticky toolbar/search va sticky table header trong scroll container. | Nen |
| RPT-013 | MEDIUM | Cot hinh anh co du lieu thuc nhung UX yeu | DB active attachments = 5, all PHOTO, 33/38 report khong attachment; missing file = 0. UI chi hien count/text: `src/components/reports/reports-table.tsx:221-240`. | Cot gan nhu "-" lam nguoi dung nghi module chua that; khong preview nhanh. | Hien thumbnail stack 3 anh, count, missing indicator, quick gallery. | Nen |
| RPT-014 | MEDIUM | Status label "Cho duyet / Da gui" gay nham | `getStatusLabel('SUBMITTED')`: `src/components/reports/types.ts:164-169`. | Cung mot badge co 2 nghia; nguoi tao va nguoi duyet hieu khac nhau. | Doi thanh "Da gui - Cho duyet"; tooltip workflow. | Nen |
| RPT-015 | LOW | Build co warning tracing ca project | `npm run build` PASS nhung warning NFT trace tu `src/lib/storage/local-storage-provider.ts` qua API attachment. | Co the lam package/deploy nang, tracing file rong qua muc. | Scope path storage ro rang hoac ignore comment Turbopack. | Sau MVP |

## 3. Phan tich tung anh

### Anh 1 - Dau trang `/reports`

- Card "Cho duyet", "Tu choi", "Phat sinh" la so lieu tu DB active-visible, khong phai hardcode count, nhung semantics khong dong bo. `Cho duyet = SUBMITTED`; `Tu choi = REJECTED + REVISION_REQUESTED`; `Phat sinh = hasIssues`.
- Thong ke nho `Tong / Duyet / Tu choi` lay tu `computeStats`, trong do `Tu choi` chi la `REJECTED`. DB hien `REJECTED=0`, `REVISION_REQUESTED=1`, nen card co the hien 1, stats nho hien 0.
- Tab `Tat ca / Bao cao ngay / Bao cao tuan` chi filter list; stats nho van tong theo project, khong theo tab/search.
- Nhieu `N/A` khong phai do mat user trong DB. DB co `createdBy`, nhung UI bo qua va chi doc `reporterName`.
- Cot hinh anh gan nhu "-" phu hop DB: 33/38 active-visible khong co attachment; 5 anh co file vat ly ton tai.
- Badge `Cho duyet / Da gui` khong ro doi tuong: voi nguoi tao la "Da gui", voi lanh dao la "Cho duyet".

### Anh 2 - Cuon cuoi table

- Header/filter khong sticky dung voi code: khong co class sticky trong toolbar/table header.
- Pagination 1/2/3/4 va dong "Hien thi 1-10 trong tong so 38" khop query active-visible: DB active = 38, pageSize = 10.
- Nhieu time 07:00 va 15:00 khop DB: `00:00Z -> 07:00 VN` co 34 report, `08:00Z -> 15:00 VN` co 4 report. Day la dau hieu seed/default date, khong phai user field time that.
- Group `Tuan 27`, `Tuan 26`: report `2026-07-01T00:00:00Z` dung ISO week 27, weekStart `2026-06-29`.
- Van co risk timezone vi client/browser dung `parseISO/getISOWeek` theo timezone local, server filter dateRange dung Date local.

## 4. Kiem tra nghiep vu

### Status workflow

Schema status: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `REVISION_REQUESTED`, `LOCKED`, `CANCELLED` (`prisma/schema.prisma:109-117`).

Mapping hien tai:
- Cho duyet: `SUBMITTED`.
- Da duyet: `APPROVED`.
- Tu choi: luc thi `REJECTED`, luc thi `REJECTED + REVISION_REQUESTED`.
- Yeu cau chinh sua: `REVISION_REQUESTED`, co enum va UI label nhung transition service khong co action tao status nay.
- Phat sinh: derived text tu `issues`/`issueNote`, khong phai status.

DB active-visible:
- `DRAFT=4`
- `SUBMITTED=18`
- `APPROVED=15`
- `REVISION_REQUESTED=1`
- `REJECTED=0`
- Tong active-visible = 38

### Permission matrix

| Role/request | Hien trang |
|---|---|
| `ADMIN` | High-level, xem all projects, approve/reject, edit writable reports, delete draft/rejected/revision/submitted. |
| `DIRECTOR` | High-level tuong tu ADMIN cho reports; approve/reject. |
| `DEPUTY_DIRECTOR` | High-level xem all/edit/delete, nhung khong approve/reject do transition service chi `ADMIN/DIRECTOR`. |
| `PROJECT_MANAGER` | Khong co trong `UserRole`; chi co `ProjectRole.PROJECT_MANAGER`. User role gan nhat la `MANAGER`, chi xem project duoc assign, khong approve/reject. |
| `CHIEF_COMMANDER` | Xem project duoc assign; co card leader o UI, nhung backend approve/reject khong cho. |
| `ENGINEER` | Xem project duoc assign; tao report neu co project access; sua/submit report minh tao o writable status. |
| `ACCOUNTANT` | Neu la project member thi van co the tao report theo backend hien tai. Day la sai nghiep vu neu ke toan chi xem/ho so tai chinh. |
| `VIEWER` | Khong co `UserRole.VIEWER`; la `ProjectRole.VIEWER`. Neu user role `STAFF` + projectRole `VIEWER`, backend van co project access va co the tao report. |

Direct URL/API:
- List/page query co project access guard.
- Upload/download attachment API co `canAccessProject`.
- History route co `canAccessProject`, nhung exported server action `getSiteReportAuditLogs` khong tu check session/access.
- Print route chua dung `canAccessProject`, chi `ADMIN/DIRECTOR` hoac creator va co TODO RBAC.
- Update/delete/submit can bo sung project-access guard de tranh stale membership/IDOR.

### Search/filter/pagination

- `getSiteReportsPage` dung chung `where` cho `count` va `findMany`, co `skip/take`, pageSize clamp 1-50. Page `/reports` truyen `pageSize: 10`.
- DB page 1 = 10 row, page 2 = 10 row, active total = 38.
- Search/filter/tab reset page ve 1 trong handlers: `reports-workspace.tsx:134-160`.
- Loi lon: stats card/stat nho khong dung cung filter voi table.

### Group by week/timezone

- Table group bang ISO week client-side: `reports-table.tsx:67-87`.
- Report ngay `2026-07-01T00:00:00Z` dung nam trong Tuan 27, weekStart `2026-06-29`.
- Chua chuan hoa Asia/Ho_Chi_Minh cho server dateRange va client grouping; co nguy co lech neu deploy/server/user timezone khac.

### Attachment/image

- DB active attachments = 5, tat ca `PHOTO`, 0 `FILE`, 0 missing physical file.
- 33/38 active-visible khong co attachment nen UI hien "-" la dung data, nhung UX cot hien tai yeu.
- Co model `SiteReportPhoto` legacy nhung UI list chi dung `SiteReportAttachment` kind `PHOTO`.

### Print/export

- Print route co template va anh, nhung RBAC chua dung project membership.
- Export Excel chua thay trong reports UI; chi co print/PDF qua browser print.
- Build PASS, route `/print/reports/[reportId]` dynamic.

### Audit log

- Co `AuditLog` model.
- Create/update/delete/upload transition moi co log trong code.
- DB activeNoAudit = 37/38: du lieu hien tai khong du audit trail.
- Xoa report la soft delete va co audit log khi di qua action hien tai.

## 5. De xuat nang cap

### Quick wins 1 ngay

- Doi label `SUBMITTED` thanh "Da gui - Cho duyet".
- Tach hien thi `REJECTED` va `REVISION_REQUESTED`, khong gop duoi label "Tu choi".
- Fallback creator `reporterName || createdBy.name`, include `createdBy` trong list.
- Sticky toolbar/search va sticky table header.
- Hien thumbnail stack/so anh thay dau "-".
- Them status option `REVISION_REQUESTED` vao filter.
- Them tooltip title/aria cho cac icon da co, chuan hoa text.
- Ghi ro empty state "Chua co anh" thay "-".
- Chuan hoa count card va stats nho cung mot helper.
- Ghi canh bao data seed/demo trong docs/qa neu dung UAT.

### Nang cap 2-3 ngay

- Tao shared `buildSiteReportWhere(filters, session)` dung cho list/count/stats/export.
- Them permission policy `canCreateReport`, `canUpdateReport`, `canPrintReport`, `canExportReport`.
- Backend guard project access cho update/delete/submit/print/export/server actions.
- Them drawer detail co audit timeline mac dinh, loading/error state ro.
- Them saved views: "Cho toi duyet", "Co phat sinh", "Khong co anh", "Can sua".
- Chuan hoa timezone helper Asia/Ho_Chi_Minh cho today/week/month/custom range.
- Backfill `reporterName` tu `createdBy.name` hoac migrate UI fallback.
- Weekly preview tach `approved/submitted/rejected/revision/missing`.
- Export Excel danh sach report theo filter hien tai.
- Them test scripts cho count/filter/status/permission.

### Nang cap lon sau MVP

- Unique constraint `reportNo` va co che generate code co nghia theo project/date.
- Workflow approval rieng cho `REVISION_REQUESTED` thay vi dung chung reject.
- Offline draft/PWA cho hien truong.
- GPS/timestamp/camera metadata neu yeu cau mobile.
- Anh bat buoc theo loai cong viec/hold point nghiem thu.
- Nen anh client-side/server-side, thumbnail derivative.
- Audit immutable timeline cho create/edit/submit/approve/reject/delete/print/export.
- Export PDF chuan mau doanh nghiep, so trang, chu ky, QR verify.
- Column visibility, sort multi-column, saved filters per user.
- Data quality dashboard: reports thieu anh, thieu creator, thieu line, stale draft.

## 6. Ke hoach fix sau khi duoc duyet

Thu tu fix uu tien:
1. Chuan hoa status/count: sua helper stats, labels, tab rejected/revision.
2. Sua creator `N/A`: include `createdBy`, fallback UI, can nhac backfill data.
3. Dong bo query count/list/stats/export qua shared builder.
4. Bo sung backend permission guards cho create/update/delete/submit/print/history/export.
5. Chuan hoa timezone VN cho dateRange va group week.
6. Nang UI table: sticky header/filter, thumbnails, status badges, empty/loading/error.
7. Audit timeline trong drawer va print/export history.
8. Data cleanup/backfill seed/demo sau khi co phe duyet.

File du kien sua:
- `src/app/(dashboard)/reports/page.tsx`
- `src/app/(dashboard)/reports/actions.ts`
- `src/components/reports/types.ts`
- `src/components/reports/reports-workspace.tsx`
- `src/components/reports/reports-table.tsx`
- `src/components/reports/reports-toolbar.tsx`
- `src/components/reports/report-detail-drawer.tsx`
- `src/components/reports/create-report-dialog.tsx`
- `src/app/print/reports/[reportId]/page.tsx`
- `src/app/api/reports/[reportId]/history/route.ts`
- `src/lib/reports/report-workflow-policy.ts`
- `src/lib/rbac.ts` hoac policy file moi cho reports
- `prisma/schema.prisma` chi sau khi duyet migration unique/reportNo

Rui ro:
- Sua status semantics co the lam thay doi so KPI hien tai.
- Them permission backend co the lam mot so role UAT khong tao/in duoc report nua.
- Timezone migration can test voi ngay sat nua dem.
- Unique reportNo can data cleanup truoc khi migration.

Test lai:
- `npx prisma validate`
- `npx tsc --noEmit`
- `npm run build`
- Script DB read-only count: active total, byStatus, byType, duplicate reportNo, missing creator, missing attachment.
- Manual/browser sau khi duoc phep dev server: desktop/tablet/mobile `/reports`, search/filter/tab/page reset, drawer ESC/outside/X, print direct URL, upload/download attachment permission.

## 7. Bang chung kiem tra bat buoc

- `git status --short`: worktree rat ban tu truoc, nhieu deleted/modified/untracked; khong commit/push, khong revert.
- Tim code reports: da map page/actions/components/API/print/schema/seed/test.
- Tim hardcode/mock: co TODO/mock/demo/fake trong report types va seed/test scripts.
- Prisma schema: hop le.
- Query count/list: table count va list dung chung `where` trong `getSiteReportsPage`; stats dau trang khong dung chung full filters.
- Permission: frontend co an nut, backend co mot phan guard, nhung con lo hong/lech nghiep vu nhu tren.
- Pagination: active 38, page 1=10, page 2=10, UI pageSize=10.
- `npx prisma validate`: PASS sau khi chay ngoai sandbox.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS, co 1 warning Turbopack NFT trace lien quan `local-storage-provider` va route attachment.
