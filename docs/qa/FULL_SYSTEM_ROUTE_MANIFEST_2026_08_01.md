# MANIFEST BẢNG ĐÁNH GIÁ VÀ TRẠNG THÁI BUILD TẤT CẢ 44 ROUTE (FULL SYSTEM ROUTE MANIFEST)

**Ngày báo cáo:** 01/08/2026  
**Dự án:** `construction-erp-v2`  
**Tổng số route:** 44 routes  
**Build status:** PASS 100% (`npm run build` thành công)

---

| STT | Route | File triển khai | Vai trò truy cập | Loại dữ liệu | Build Status | Runtime Status | Lỗi Console | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| 1 | `/` | `src/app/page.tsx` | ALL | Redirect / Session | **PASS** | PASS | Không | **PASS** |
| 2 | `/login` | `src/app/login/page.tsx` | PUBLIC | Auth Form | **PASS** | PASS | Không | **PASS** |
| 3 | `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | ALL | Executive Stats | **PASS** | PASS | Không | **PASS** |
| 4 | `/dashboard/projects-status` | `src/app/(dashboard)/dashboard/projects-status/page.tsx` | DIRECTOR/ADMIN | Project Status Matrix | **PASS** | PASS | Không | **PASS** |
| 5 | `/projects` | `src/app/(dashboard)/projects/page.tsx` | ALL | Project List | **PASS** | PASS | Không | **PASS** |
| 6 | `/projects/new` | `src/app/(dashboard)/projects/new/page.tsx` | ADMIN/DIRECTOR | Create Form | **PASS** | PASS | Không | **PASS** |
| 7 | `/projects/[id]` | `src/app/(dashboard)/projects/[id]/page.tsx` | ALL | Project Detail | **PASS** | PASS | Không | **PASS** |
| 8 | `/projects/[id]/edit` | `src/app/(dashboard)/projects/[id]/edit/page.tsx` | ADMIN/DIRECTOR | Edit Form | **PASS** | PASS | Không | **PASS** |
| 9 | `/projects/[id]/field-progress` | `src/app/(dashboard)/projects/[id]/field-progress/page.tsx` | ALL | Progress Overview | **PASS** | PASS | Không | **PASS** |
| 10 | `/projects/[id]/field-progress/daily` | `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx` | SITE_ENGINEER | Daily Log | **PASS** | PASS | Không | **PASS** |
| 11 | `/projects/[id]/field-progress/summary` | `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx` | ALL | Summary Matrix | **PASS** | PASS | Không | **PASS** |
| 12 | `/projects/[id]/material-requests` | `src/app/(dashboard)/projects/[id]/material-requests/page.tsx` | ALL | Material Requests | **PASS** | PASS | Không | **PASS** |
| 13 | `/reports` | `src/app/(dashboard)/reports/page.tsx` | ALL | Report Hub | **PASS** | PASS | Không | **PASS** |
| 14 | `/reports/field` | `src/app/(dashboard)/reports/field/page.tsx` | ALL | Field Inspection List | **PASS** | PASS | Không | **PASS** |
| 15 | `/reports/field/weekly-summary` | `src/app/(dashboard)/reports/field/weekly-summary/page.tsx` | ALL | Weekly Inspection Summary | **PASS** | PASS | Không | **PASS** |
| 16 | `/reports/safety` | `src/app/(dashboard)/reports/safety/page.tsx` | ALL | Safety Dossier Hub | **PASS** | PASS | Không | **PASS** |
| 17 | `/reports/safety/plans` | `src/app/(dashboard)/reports/safety/plans/page.tsx` | ALL | Safety Plans List | **PASS** | PASS | Không | **PASS** |
| 18 | `/reports/safety/plans/new` | `src/app/(dashboard)/reports/safety/plans/new/page.tsx` | ALL | New Safety Plan Form | **PASS** | PASS | Không | **PASS** |
| 19 | `/reports/safety/plans/[planId]` | `src/app/(dashboard)/reports/safety/plans/[planId]/page.tsx` | ALL | Safety Plan Detail | **PASS** | PASS | Không | **PASS** |
| 20 | `/reports/safety/plans/[planId]/preview` | `src/app/(dashboard)/reports/safety/plans/[planId]/preview/page.tsx` | ALL | Plan A4 Print Preview | **PASS** | PASS | Không | **PASS** |
| 21 | `/reports/safety/self-assessments` | `src/app/(dashboard)/reports/safety/self-assessments/page.tsx` | ALL | Self Assessment List | **PASS** | PASS | Không | **PASS** |
| 22 | `/reports/safety/self-assessments/new` | `src/app/(dashboard)/reports/safety/self-assessments/new/page.tsx` | ALL | New Self Assessment Form | **PASS** | PASS | Không | **PASS** |
| 23 | `/reports/safety/self-assessments/[reportId]` | `src/app/(dashboard)/reports/safety/self-assessments/[reportId]/page.tsx` | ALL | Assessment Detail | **PASS** | PASS | Không | **PASS** |
| 24 | `/reports/safety/self-assessments/[reportId]/preview` | `src/app/(dashboard)/reports/safety/self-assessments/[reportId]/preview/page.tsx` | ALL | Assessment A4 Preview | **PASS** | PASS | Không | **PASS** |
| 25 | `/reports/safety/weekly-files/[weeklyFileId]` | `src/app/(dashboard)/reports/safety/weekly-files/[weeklyFileId]/page.tsx` | ALL | Weekly File Workspace | **PASS** | PASS | Không | **PASS** |
| 26 | `/reports/weekly-inspection` | `src/app/(dashboard)/reports/weekly-inspection/page.tsx` | ALL | Supervision Reports List | **PASS** | PASS | Không | **PASS** |
| 27 | `/reports/weekly-inspection/[id]/edit` | `src/app/(dashboard)/reports/weekly-inspection/[id]/edit/page.tsx` | ALL | Supervision Report Editor | **PASS** | PASS | Không | **PASS** |
| 28 | `/reports/weekly-inspection/[id]/preview` | `src/app/(dashboard)/reports/weekly-inspection/[id]/preview/page.tsx` | ALL | Supervision Print Preview | **PASS** | PASS | Không | **PASS** |
| 29 | `/documents` | `src/app/(dashboard)/documents/page.tsx` | ALL | Document Management System | **PASS** | PASS | Không | **PASS** |
| 30 | `/documents/[projectId]` | `src/app/(dashboard)/documents/[projectId]/page.tsx` | ALL | Project Document Folder | **PASS** | PASS | Không | **PASS** |
| 31 | `/materials` | `src/app/(dashboard)/materials/page.tsx` | ALL | Material Inventory Hub | **PASS** | PASS | Không | **PASS** |
| 32 | `/approvals` | `src/app/(dashboard)/approvals/page.tsx` | ALL | Approval Center | **PASS** | PASS | Không | **PASS** |
| 33 | `/tasks` | `src/app/(dashboard)/tasks/page.tsx` | ALL | Task Center | **PASS** | PASS | Không | **PASS** |
| 34 | `/users` | `src/app/(dashboard)/users/page.tsx` | ADMIN/DIRECTOR | User & RBAC Management | **PASS** | PASS | Không | **PASS** |
| 35 | `/settings` | `src/app/(dashboard)/settings/page.tsx` | ALL | Account & System Settings | **PASS** | PASS | Không | **PASS** |
| 36 | `/audit` | `src/app/(dashboard)/audit/page.tsx` | ADMIN | System Audit Logs | **PASS** | PASS | Không | **PASS** |
| 37 | `/supervision/weekly` | `src/app/(dashboard)/supervision/weekly/page.tsx` | ALL | Supervision Hub | **PASS** | PASS | Không | **PASS** |
| 38 | `/supervision/weekly/[id]` | `src/app/(dashboard)/supervision/weekly/[id]/page.tsx` | ALL | Supervision Detail | **PASS** | PASS | Không | **PASS** |
| 39 | `/supervision/weekly/[id]/edit` | `src/app/(dashboard)/supervision/weekly/[id]/edit/page.tsx` | ALL | Supervision Editor | **PASS** | PASS | Không | **PASS** |
| 40 | `/supervision/weekly/[id]/preview` | `src/app/(dashboard)/supervision/weekly/[id]/preview/page.tsx` | ALL | Supervision Preview | **PASS** | PASS | Không | **PASS** |
| 41 | `/supervision-export/[id]` | `src/app/(dashboard)/supervision-export/[id]/page.tsx` | ALL | Supervision Export | **PASS** | PASS | Không | **PASS** |
| 42 | `/print/reports/[reportId]` | `src/app/print/reports/[reportId]/page.tsx` | ALL | Print Field Report | **PASS** | PASS | Không | **PASS** |
| 43 | `/print/reports/field/weekly-summary` | `src/app/print/reports/field/weekly-summary/page.tsx` | ALL | Print Summary Report | **PASS** | PASS | Không | **PASS** |
