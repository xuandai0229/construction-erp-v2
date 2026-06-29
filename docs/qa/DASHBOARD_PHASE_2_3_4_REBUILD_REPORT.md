# DASHBOARD PHASE 2/3/4 REBUILD REPORT

## 1. Ket luan

- Trang thai: PASS CO DIEU KIEN.
- Dashboard `/dashboard` da duoc lam lai thanh dashboard tong quan he thong dung Server Component.
- Dashboard moi dung du lieu that tu Prisma schema hien co, khong dung fake/mock KPI.
- RBAC duoc ap dung server-side qua `requireAuth`, `getAccessibleProjectIds`, va helper dashboard permissions.
- Khoi tai chinh/hop dong/thanh toan chi query va render cho role co quyen: `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `ACCOUNTANT`.
- Responsive da xu ly theo mobile 1 cot, tablet 2 cot, desktop grid 12 cot/4 KPI cot.
- `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`, va `npm run build` deu pass.

Dieu kien con lai: chua chay `npm run dev` va chua chup anh responsive vi user yeu cau khong can chay dev server; user se test giao dien thu cong.

## 2. Dashboard moi da lam gi

- Thay route dashboard cu bang route gon, chi goi `getDashboardData()` va render cac component dashboard moi.
- Tach query va RBAC ra `src/lib/dashboard`.
- Tach UI thanh cac component trong `src/components/dashboard`.
- Them `loading.tsx` skeleton va `error.tsx` fallback cho dashboard.
- Bo query cu trong page dung `createdAt` cho khoi luong hom nay; logic moi dung `FieldProgressEntry.entryDate`.

## 3. File da sua/tao

Da sua:

- `src/app/(dashboard)/dashboard/page.tsx`

Da tao:

- `src/app/(dashboard)/dashboard/loading.tsx`
- `src/app/(dashboard)/dashboard/error.tsx`
- `src/components/dashboard/dashboard-header.tsx`
- `src/components/dashboard/dashboard-kpi-card.tsx`
- `src/components/dashboard/dashboard-kpi-grid.tsx`
- `src/components/dashboard/dashboard-action-list.tsx`
- `src/components/dashboard/dashboard-project-overview.tsx`
- `src/components/dashboard/dashboard-finance-summary.tsx`
- `src/components/dashboard/dashboard-recent-documents.tsx`
- `src/components/dashboard/dashboard-recent-site-reports.tsx`
- `src/components/dashboard/dashboard-activity-timeline.tsx`
- `src/components/dashboard/dashboard-empty-state.tsx`
- `src/lib/dashboard/dashboard-permissions.ts`
- `src/lib/dashboard/dashboard-formatters.ts`
- `src/lib/dashboard/dashboard-queries.ts`
- `src/lib/dashboard/dashboard-helpers.test.ts`
- `docs/qa/DASHBOARD_PHASE_2_3_4_REBUILD_REPORT.md`

## 4. Logic du lieu tung block

| Khu vuc dashboard | Muc dich | Role duoc xem | Nguon du lieu | Logic loc quyen | Can tao/sua file |
| --- | --- | --- | --- | --- | --- |
| Header thong minh | Chao user, role, gio Viet Nam, filter thoi gian, quick actions | Tat ca user da dang nhap | Session/RBAC | Render action theo permission va project scope | `dashboard-header.tsx`, `dashboard-queries.ts` |
| KPI tong quan | Doc nhanh so cong trinh, bao cao, tai lieu, nhap khoi luong, can chu y | Tat ca user theo scope; high-level xem scope cong ty | `Project`, `SiteReport`, `Document`, `FieldProgressEntry`, `ApprovalRequest` | Tat ca query loc `accessibleProjectIds` tru high-level scope all | `dashboard-kpi-grid.tsx`, `dashboard-kpi-card.tsx`, `dashboard-queries.ts` |
| Can xu ly ngay | Gom viec uu tien can xu ly | Tat ca user theo scope; payment chi role tai chinh | `ApprovalRequest`, `PaymentRequest`, `Project`, `SiteReport`, `MaterialRequest`, `FieldMaterialRequest` | Project-scope; payment query chi khi co finance permission | `dashboard-action-list.tsx`, `dashboard-queries.ts` |
| Tong quan tien do cong trinh | Xem tinh trang WBS, entry gan day, % hoan thanh | Tat ca user theo project access | `Project`, `FieldProgressItem`, `FieldProgressEntry` | Project-scope bang `getAccessibleProjectIds` | `dashboard-project-overview.tsx`, `dashboard-queries.ts` |
| Tai chinh/hop dong/thanh toan | Tong gia tri hop dong, pending payment, thanh toan gan day | `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `ACCOUNTANT` | `Contract`, `PaymentRequest`, `PaymentRecord` | Server khong query neu khong co finance permission; van loc project scope | `dashboard-finance-summary.tsx`, `dashboard-permissions.ts`, `dashboard-queries.ts` |
| Tai lieu moi | File moi upload | Tat ca user theo project access | `Document`, `Project`, `User` | Project-scope | `dashboard-recent-documents.tsx`, `dashboard-queries.ts` |
| Bao cao hien truong gan day | Bao cao moi, co van de/da duyet | Tat ca user theo project access | `SiteReport`, `Project`, `User` | Project-scope | `dashboard-recent-site-reports.tsx`, `dashboard-queries.ts` |
| Hoat dong gan day | Timeline hoat dong | Tat ca user theo scope; finance activity chi role tai chinh | `AuditLog`; fallback tu `Document`, `SiteReport`, `FieldProgressEntry`, `ApprovalRequest`, `PaymentRequest` | Project-scope; khong dua payment vao fallback neu khong co finance permission | `dashboard-activity-timeline.tsx`, `dashboard-queries.ts` |
| Loading/Error | Trang thai cho va fallback loi | Tat ca user | Next route conventions | Khong query them | `loading.tsx`, `error.tsx` |

## 5. RBAC

- `requireAuth()` chay o server trong route `/dashboard`.
- `getDashboardProjectScope()` dung `getAccessibleProjectIds(session)`.
- `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR` duoc xem dashboard company-wide.
- User thuong chi xem du lieu co `projectId` nam trong danh sach accessible.
- `ACCOUNTANT` duoc xem finance dashboard nhung van loc theo project scope de tranh mo rong du lieu ngoai phan quyen cong trinh.
- `CHIEF_COMMANDER`, `ENGINEER`, `STAFF` khong query `Contract`, `PaymentRequest`, `PaymentRecord` vi `getFinanceSummary()` chi duoc goi sau check `canViewFinanceDashboard`.
- Approval block render theo `canViewApprovalDashboard`.

## 6. Tai chinh/hop dong khong lo quyen

- `canViewFinanceDashboard()` nam trong `src/lib/dashboard/dashboard-permissions.ts`.
- `getDashboardData()` chi goi `getFinanceSummary()` neu `canViewFinanceDashboard(session.role)` la true.
- Activity fallback chi them `PaymentRequest` vao timeline khi user co finance permission.
- Component finance khong nhan du lieu neu server khong query, nen khong co tinh huong an UI sau khi da lay du lieu nhay cam.

## 7. Tien do va Field Progress Summary

- Dashboard doc `FieldProgressItem` va `FieldProgressEntry` theo project.
- Rollup dung lai `groupEntriesByItemAndDate()` va `buildFieldProgressRollupTree()` tu `src/lib/field-progress/rollup.ts`.
- Ty le hoan thanh lay tu root item cua rollup, khong tu tinh cong thuc rieng trong UI.
- Khoi luong hom nay dung `entryDate` va `todayWorkDate()`, khong dung `createdAt`.
- Canh bao project gom: chua thiet lap WBS, chua co nhap lieu gan day, co nguy co tre theo ngay ket thuc, dang on.

## 8. Timezone/ngay nghiep vu

- Dung helper co san `todayWorkDate()` va `getWorkDateRange()` tu `src/lib/work-date.ts`.
- Ngay hien thi format `dd/MM/yyyy`, ngay gio format `dd/MM/yyyy HH:mm`.
- Dashboard khong tu tru/cong timezone thu cong.

## 9. Responsive

- KPI grid: `grid-cols-1`, `sm:grid-cols-2`, `xl:grid-cols-4`.
- Main layout: mobile 1 cot, desktop `lg:grid-cols-12`.
- Project overview dung card/list responsive, khong ep table rong tren mobile.
- Card dung nen sang, border/shadow nhe, text chinh `slate-950`/`slate-700`, khong dung text quan trong mau qua nhat.
- Khong tao scroll ngang toan trang; route dung `overflow-x-hidden`, danh sach dung wrap/min-width an toan.

## 10. Empty/loading/error state

- Empty state dung `DashboardEmptyState`.
- Moi block co thong diep rong rieng: khong co viec can xu ly, chua co du lieu tien do, chua co tai lieu, chua co bao cao, chua co hoat dong.
- Loading dashboard co skeleton header, KPI, main grid, side panels.
- Error dashboard la client boundary, dung `unstable_retry()` theo Next docs hien tai va link quay ve `/projects`.

## 11. Lenh da chay

- `git status --short`
- `npx tsc --noEmit --pretty false`
- `npx prisma validate`
- `npx prisma generate`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --stat`

Luu y: `npx prisma validate` va `npx prisma generate` can chay lai ngoai sandbox vi sandbox chan network den Prisma binaries.

## 12. Ket qua test/build

- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS, generated Prisma Client v7.8.0.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS.

Build co 1 warning Turbopack khong thuoc dashboard:

- `next.config.ts` trace qua `src/lib/storage/local-storage-provider.ts` va `src/app/api/reports/attachments/[attachmentId]/route.ts`.

## 13. Rui ro con lai

- Chua test UI bang browser tai cac breakpoint 360/390/430/768/1366/1920 vi khong chay dev server theo yeu cau.
- `ACCOUNTANT` hien dang bi loc finance theo project access. Neu nghiep vu yeu cau ke toan xem toan bo tai chinh cong ty, can chot lai permission voi owner.
- ActivityLog co the chua day du du lieu; dashboard da fallback tu bang nghiep vu hien co.
- Neu du lieu WBS/Field Progress qua lon, co the can toi uu batch/limit them cho `getProjectOverview()`.

## 14. Huong dan test thu cong

1. Dang nhap role `ADMIN`, `DIRECTOR`, hoac `DEPUTY_DIRECTOR`, vao `/dashboard`.
2. Kiem tra KPI tong quan, can xu ly ngay, phan approval, finance, tai lieu, bao cao, activity.
3. Dang nhap `ACCOUNTANT`, vao `/dashboard`, kiem tra finance hien dung va du lieu van theo pham vi cong trinh duoc gan.
4. Dang nhap `CHIEF_COMMANDER`, `ENGINEER`, hoac `STAFF`, vao `/dashboard`, xac nhan khong thay block tai chinh/hop dong/thanh toan.
5. Kiem tra user chi thuoc mot cong trinh khong thay tai lieu, bao cao, tien do, activity cua cong trinh khac.
6. Kiem tra mobile 360/390/430: KPI 1 cot, main layout 1 cot, khong scroll ngang toan trang.
7. Kiem tra `/projects/[id]/field-progress/summary` va dashboard: % tien do phai khop vi dashboard dung chung rollup helper.
