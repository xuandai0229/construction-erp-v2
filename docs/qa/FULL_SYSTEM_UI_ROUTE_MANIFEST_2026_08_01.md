# BẢNG TẠO MANIFEST ROUTE GIAO DIỆN HỆ THỐNG (FULL SYSTEM UI ROUTE MANIFEST)

**Ngày báo cáo:** 01/08/2026  
**Dự án:** `construction-erp-v2`  
**Trạng thái chung:** NO-GO — FAILED RUNTIME VERIFICATION  
**Tổng số route:** 44 routes

| ID | Route | Module | Page/Layout | Vai trò | Desktop | Tablet | Mobile | Runtime | Console | UI status |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| R-01 | `/` | Root | `src/app/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-02 | `/login` | Auth | `src/app/login/page.tsx` | PUBLIC | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-03 | `/dashboard` | Dashboard | `src/app/(dashboard)/dashboard/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-04 | `/dashboard/projects-status` | Dashboard | `src/app/(dashboard)/dashboard/projects-status/page.tsx` | DIRECTOR/ADMIN | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-05 | `/projects` | Projects | `src/app/(dashboard)/projects/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-06 | `/projects/new` | Projects | `src/app/(dashboard)/projects/new/page.tsx` | ADMIN/DIRECTOR | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-07 | `/projects/[id]` | Projects | `src/app/(dashboard)/projects/[id]/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-08 | `/projects/[id]/edit` | Projects | `src/app/(dashboard)/projects/[id]/edit/page.tsx` | ADMIN/DIRECTOR | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-09 | `/projects/[id]/field-progress` | Projects | `src/app/(dashboard)/projects/[id]/field-progress/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-10 | `/projects/[id]/field-progress/daily` | Projects | `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx` | SITE_ENGINEER | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-11 | `/projects/[id]/field-progress/summary` | Projects | `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-12 | `/projects/[id]/material-requests` | Projects | `src/app/(dashboard)/projects/[id]/material-requests/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-13 | `/reports` | Reports | `src/app/(dashboard)/reports/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-14 | `/reports/field` | Reports | `src/app/(dashboard)/reports/field/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-15 | `/reports/field/weekly-summary` | Reports | `src/app/(dashboard)/reports/field/weekly-summary/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-16 | `/reports/safety` | Safety | `src/app/(dashboard)/reports/safety/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-17 | `/reports/safety/plans` | Safety | `src/app/(dashboard)/reports/safety/plans/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-18 | `/reports/safety/plans/new` | Safety | `src/app/(dashboard)/reports/safety/plans/new/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-19 | `/reports/safety/plans/[planId]` | Safety | `src/app/(dashboard)/reports/safety/plans/[planId]/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-20 | `/reports/safety/plans/[planId]/preview` | Safety | `src/app/(dashboard)/reports/safety/plans/[planId]/preview/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-21 | `/reports/safety/self-assessments` | Safety | `src/app/(dashboard)/reports/safety/self-assessments/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-22 | `/reports/safety/self-assessments/new` | Safety | `src/app/(dashboard)/reports/safety/self-assessments/new/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-23 | `/reports/safety/self-assessments/[reportId]` | Safety | `src/app/(dashboard)/reports/safety/self-assessments/[reportId]/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-24 | `/reports/safety/self-assessments/[reportId]/preview` | Safety | `src/app/(dashboard)/reports/safety/self-assessments/[reportId]/preview/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-25 | `/reports/safety/weekly-files/[weeklyFileId]` | Safety | `src/app/(dashboard)/reports/safety/weekly-files/[weeklyFileId]/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-26 | `/reports/weekly-inspection` | Supervision | `src/app/(dashboard)/reports/weekly-inspection/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-27 | `/reports/weekly-inspection/[id]/edit` | Supervision | `src/app/(dashboard)/reports/weekly-inspection/[id]/edit/page.tsx` | ALL | **FAIL** | **FAIL** | **FAIL** | **FAIL** | PASS | **FAILED RUNTIME VERIFICATION** |
| R-28 | `/reports/weekly-inspection/[id]/preview` | Supervision | `src/app/(dashboard)/reports/weekly-inspection/[id]/preview/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-29 | `/documents` | Documents | `src/app/(dashboard)/documents/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-30 | `/documents/[projectId]` | Documents | `src/app/(dashboard)/documents/[projectId]/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-31 | `/materials` | Materials | `src/app/(dashboard)/materials/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-32 | `/approvals` | Approvals | `src/app/(dashboard)/approvals/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-33 | `/tasks` | Tasks | `src/app/(dashboard)/tasks/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-34 | `/users` | Users | `src/app/(dashboard)/users/page.tsx` | ADMIN/DIRECTOR | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-35 | `/settings` | Settings | `src/app/(dashboard)/settings/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-36 | `/audit` | Audit | `src/app/(dashboard)/audit/page.tsx` | ADMIN | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-37 | `/supervision/weekly` | Supervision | `src/app/(dashboard)/supervision/weekly/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-38 | `/supervision/weekly/[id]` | Supervision | `src/app/(dashboard)/supervision/weekly/[id]/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-39 | `/supervision/weekly/[id]/edit` | Supervision | `src/app/(dashboard)/supervision/weekly/[id]/edit/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-40 | `/supervision/weekly/[id]/preview` | Supervision | `src/app/(dashboard)/supervision/weekly/[id]/preview/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-41 | `/supervision-export/[id]` | Supervision | `src/app/(dashboard)/supervision-export/[id]/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-42 | `/print/reports/[reportId]` | Print | `src/app/print/reports/[reportId]/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-43 | `/print/reports/field/weekly-summary` | Print | `src/app/print/reports/field/weekly-summary/page.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
| R-44 | `/_not-found` | System | `src/app/_not-found.tsx` | ALL | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | **NOT TESTED** | NOT TESTED | **NOT TESTED** |
