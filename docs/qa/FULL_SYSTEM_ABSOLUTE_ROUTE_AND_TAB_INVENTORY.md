# FULL SYSTEM ABSOLUTE ROUTE AND TAB INVENTORY

Ngày audit: 2026-08-11. Phạm vi: `src/app/**`, `src/components/**`, `src/features/**` nếu có. Đây là inventory được derive từ filesystem hiện tại; report cũ không được dùng làm nguồn chính.

## Tổng kết định lượng

| Chỉ số | Verified hiện tại |
|---|---:|
| Filesystem page files | 64 |
| Filesystem route handlers (`route.ts`) | 24 |
| Filesystem layouts | 4 |
| Filesystem loading/error/not-found artifacts | 24 |
| Tổng route UI page surfaces | 64 |
| Runtime route surfaces đã load thành công | 1 (`/login`) |
| Runtime route surfaces attempted nhưng không usable | 1 (`/` redirect/login) |
| Protected route surfaces runtime tested | 0 |
| Tab keys/interactive tab surfaces static-discovered | 26 |
| Tab surfaces runtime clicked | 0 |
| Desktop variants static-present | 64 route surfaces có responsive classes/branches trong codebase; chưa runtime verify |
| Mobile variants static-present | 14 component/file surfaces có `mobile`, `md:hidden`, `hidden md:` hoặc responsive branch; chưa runtime verify |

`/login` được load và inspected. Root route `/` được requested nhưng redirect về `/login`; không có authenticated session. Không tính API handlers là page route trong các tỷ lệ route UI.

## Route inventory từ filesystem

### Core/dashboard

`/`, `/login`, `/dashboard`, `/dashboard/actions`, `/dashboard/projects-status`, `/audit`, `/approvals`, `/users`, `/settings`.

### Projects

`/projects`, `/projects/new`, `/projects/[id]`, `/projects/[id]/edit`, `/projects/[id]/field-progress`, `/projects/[id]/field-progress/daily`, `/projects/[id]/field-progress/summary`, `/projects/[id]/material-requests`.

### Documents

`/documents`, `/documents/[projectId]`.

### Materials

`/materials`, `/materials/proposals/new`, `/materials/proposals/[id]`, `/materials/proposals/[id]/preview`, `/materials/proposals/[id]/print`.

### Reports

`/reports`, `/reports/field`, `/reports/field/weekly-summary`, `/reports/weekly-inspection`, `/reports/weekly-inspection/[id]/edit`, `/reports/weekly-inspection/[id]/preview`, `/reports/safety`, `/reports/safety/plans`, `/reports/safety/plans/new`, `/reports/safety/plans/[planId]`, `/reports/safety/plans/[planId]/preview`, `/reports/safety/self-assessments`, `/reports/safety/self-assessments/new`, `/reports/safety/self-assessments/[reportId]`, `/reports/safety/self-assessments/[reportId]/preview`, `/reports/safety/weekly-files/[weeklyFileId]`.

### Supervision

`/supervision/weekly`, `/supervision/weekly/[id]`, `/supervision/weekly/[id]/edit`, `/supervision/weekly/[id]/preview`.

### HR

`/hr`, `/hr/alerts`, `/hr/certificates`, `/hr/contracts`, `/hr/employees`, `/hr/employees/new`, `/hr/employees/[employeeId]`, `/hr/employees/[employeeId]/edit`, `/hr/organization`, `/hr/organization/units`, `/hr/organization/positions`, `/hr/organization/chart`, `/hr/organization/managers`, `/hr/project-assignments`, `/hr/reports`, `/hr/test-idor`.

### Print/export UI pages

`/print/reports/[reportId]`, `/print/reports/field/weekly-summary`, `/proposal-export/[id]`, `/supervision-export/[id]`.

### API route handlers

24 `route.ts` files were found under `/api`, covering auth, documents, HR export, reports, safety plan/self-assessment workflows, weekly summary, and supervision export. They are separately inventoried and not silently counted as UI screens.

## Tab inventory

| Route/surface | Key | Label/source surface | Component | Visible by role | Record list/actions |
|---|---|---|---|---|---|
| `/materials` | `overview` | Tổng quan | `materials-workspace.tsx` / `MaterialsOverview` | `canView` | cards; no row menu verified |
| `/materials` | `catalog` | Danh mục vật tư | `MaterialsCatalog` | `canView` | list/table; inline/material actions present in source |
| `/materials` | `stock` | Tồn kho | `MaterialsStockTable` | `canView` | table; action source present |
| `/materials` | `requests` | Đề xuất vật tư | `MaterialProposalList` | `canView` | record menu |
| `/materials` | `transactions` | Nhập / Xuất | `MaterialsTransactions` | `canViewTransactions` | table; action source present |
| `/hr` workspace | `overview` | Tổng quan | `HrWorkspaceTabs` | navigation/RBAC | no record list at tab shell |
| `/hr` workspace | `employees` | Nhân sự | `HrWorkspaceTabs` / employee table | navigation/RBAC | record menu |
| `/hr` workspace | `organization` | Phòng ban & Chức danh | `HrWorkspaceTabs` | navigation/RBAC | nested tabs |
| `/hr` workspace | `assignments` | Điều động công trình | `HrWorkspaceTabs` | navigation/RBAC | record menu |
| `/hr` workspace | `reports` | Báo cáo | `HrWorkspaceTabs` | navigation/RBAC | report table/actions |
| `/hr/organization` | `units` | Phòng ban | `OrganizationSubTabs` | HR permission | record/config actions |
| `/hr/organization` | `positions` | Chức danh | `OrganizationSubTabs` | HR permission | record menu |
| `/hr/organization` | `chart` | Sơ đồ tổ chức | `OrganizationSubTabs` | HR permission | tree actions/config |
| `/reports` | `all` | Tất cả | `ReportsWorkspace` | report permission | record menu |
| `/reports` | `daily` | Báo cáo ngày | `ReportsWorkspace` | report permission | record menu |
| `/reports` | `weekly` | Báo cáo tuần | `ReportsWorkspace` | aggregate permission for some content | record menu/summary |
| `/approvals` | `PENDING` | Cần xử lý | `approval-center-client.tsx` | approval permission | approve/reject/view |
| `/approvals` | `RESOLVED` | Đã xử lý | same | approval permission | view |
| `/approvals` | `ALL` | Tất cả | same | approval permission | view |
| `/reports/safety` and weekly file | `PLAN` | Kế hoạch kiểm tra | safety workspace | safety permission | workflow actions |
| `/reports/safety` and weekly file | `ASSESSMENT` | Báo cáo tự đánh giá | safety workspace | safety permission | workflow actions |
| employee detail | `info` | Thông tin | `employee-detail-view.tsx` | employee access | detail actions |
| employee detail | `projects` | Công trình | same | employee access | list/actions |
| employee detail | `documents` | Tài liệu | same | employee access | document actions |
| employee detail | `history` | Lịch sử | same | employee access | history list |
| report create dialog | `result` | Kết quả | `weekly-report-form.tsx` | form permission | form, not record secondary |
| report create dialog | `plan` | Kế hoạch | same | form permission | form |
| report create dialog | `notes` | Ghi chú | same | form permission | form |

## Unverified areas

All protected routes, every tab click, action menu geometry, pointer gates, active-row transitions, scroll/clipping/z-index, mobile/tablet viewport behavior, role switching, IDOR quick check, and link destinations remain `UNVERIFIED` because the runtime session could not authenticate and the app backend returned connection failure.

