# CONSTRUCTION-ERP-V2 — CANONICAL API INVENTORY & RECONCILIATION

## 1. EXACT ROUTE & HTTP METHOD METRICS (SOURCE OF TRUTH)

*Scanning Methodology*: Absolute AST & Filesystem analysis of `src/app/**/route.ts` as of August 12, 2026.

- **Total `route.ts` files**: **56 files**
  - **REST API V1 (`/api/v1/**`)**: **32 files**
  - **Legacy API (`/api/**`)**: **23 files**
  - **Outside `/api` (`/(dashboard)/**`)**: **1 file** (`/(dashboard)/materials/proposals/[id]/export/route.ts`)
- **Total Exposed HTTP Methods**: **64 HTTP Methods**
  - **V1 (`/api/v1/**`)**: **36 HTTP Methods** (GET: 20, POST: 15, PATCH: 1, PUT: 0, DELETE: 0)
  - **Legacy (`/api/**` + outside)**: **28 HTTP Methods** (GET: 16, POST: 10, DELETE: 2, PUT: 0, PATCH: 0)

---

## 2. CANONICAL INVENTORY MATRIX

| STT | Module | Route | Method | Read/Write | Auth | Permission | Project Scope | Validation | Mobile Need | Runtime Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Auth | `/api/v1/auth/login` | POST | Write | Public | None | N/A | Zod | REQUIRED | PASS (200) |
| 2 | Auth | `/api/v1/auth/logout` | POST | Write | Bearer/Cookie | Authenticated | N/A | None | REQUIRED | PASS (200) |
| 3 | User Profile | `/api/v1/me` | GET | Read | Bearer/Cookie | Authenticated | Self Scope | None | REQUIRED | PASS (200) |
| 4 | User Directory | `/api/v1/users` | GET | Read | Bearer/Cookie | Authenticated | System Wide | Query | OPTIONAL | PASS (200) |
| 5 | Projects | `/api/v1/projects` | GET | Read | Bearer/Cookie | Authenticated | RBAC Scoped | Query | REQUIRED | PASS (200) |
| 6 | Projects | `/api/v1/projects/[projectId]` | GET | Read | Bearer/Cookie | Project Member | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 7 | Projects | `/api/v1/projects/[projectId]/members` | GET | Read | Bearer/Cookie | Project Member | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 8 | Projects | `/api/v1/projects/[projectId]/personnel` | GET | Read | Bearer/Cookie | Project Member | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 9 | Projects | `/api/v1/projects/[projectId]/dashboard` | GET | Read | Bearer/Cookie | Project Member | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 10 | WBS | `/api/v1/projects/[projectId]/wbs` | GET | Read | Bearer/Cookie | Project Member | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 11 | Progress | `/api/v1/projects/[projectId]/progress/daily` | GET | Read | Bearer/Cookie | Project Member | `verifyProjectScope` | Query | REQUIRED | PASS (200) |
| 12 | Progress | `/api/v1/projects/[projectId]/progress/daily` | POST | Write | Bearer/Cookie | Site Engineer/PM | `verifyProjectScope` | Zod | REQUIRED | PASS (200) |
| 13 | Notifications | `/api/v1/notifications` | GET | Read | Bearer/Cookie | Authenticated | Self Scope | Query | REQUIRED | PASS (200) |
| 14 | Notifications | `/api/v1/notifications/[id]/read` | POST | Write | Bearer/Cookie | Authenticated | Self Scope | Route Param | REQUIRED | PASS (200) |
| 15 | Notifications | `/api/v1/notifications/read-all` | POST | Write | Bearer/Cookie | Authenticated | Self Scope | None | REQUIRED | PASS (200) |
| 16 | Site Reports | `/api/v1/reports` | GET | Read | Bearer/Cookie | Authenticated | `verifyProjectScope` | Query | REQUIRED | PASS (200) |
| 17 | Site Reports | `/api/v1/reports` | POST | Write | Bearer/Cookie | Site Engineer/PM | `verifyProjectScope` | Zod | REQUIRED | PASS (200) |
| 18 | Site Reports | `/api/v1/reports/[reportId]` | GET | Read | Bearer/Cookie | Project Member | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 19 | Site Reports | `/api/v1/reports/[reportId]` | PATCH | Write | Bearer/Cookie | Report Author | `verifyProjectScope` | Zod | REQUIRED | PASS (200) |
| 20 | Site Reports | `/api/v1/reports/[reportId]/submit` | POST | Write | Bearer/Cookie | Report Author | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 21 | Site Reports | `/api/v1/reports/[reportId]/approve` | POST | Write | Bearer/Cookie | Site Commander/PM | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 22 | Site Reports | `/api/v1/reports/[reportId]/reject` | POST | Write | Bearer/Cookie | Site Commander/PM | `verifyProjectScope` | Zod | REQUIRED | PASS (200) |
| 23 | Materials | `/api/v1/projects/[projectId]/materials` | GET | Read | Bearer/Cookie | Project Member | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 24 | Proposals | `/api/v1/material-proposals` | GET | Read | Bearer/Cookie | Authenticated | `verifyProjectScope` | Query | REQUIRED | PASS (200) |
| 25 | Proposals | `/api/v1/material-proposals` | POST | Write | Bearer/Cookie | Site Engineer/PM | `verifyProjectScope` | Zod | REQUIRED | PASS (200) |
| 26 | Proposals | `/api/v1/material-proposals/[id]` | GET | Read | Bearer/Cookie | Project Member | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 27 | Proposals | `/api/v1/material-proposals/[id]/submit` | POST | Write | Bearer/Cookie | Author/PM | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 28 | Proposals | `/api/v1/material-proposals/[id]/approve` | POST | Write | Bearer/Cookie | Approver Role | `verifyProjectScope` | Zod | REQUIRED | PASS (200) |
| 29 | Proposals | `/api/v1/material-proposals/[id]/reject` | POST | Write | Bearer/Cookie | Approver Role | `verifyProjectScope` | Zod | REQUIRED | PASS (200) |
| 30 | Approvals | `/api/v1/approvals` | GET | Read | Bearer/Cookie | Authenticated | RBAC Scoped | Query | REQUIRED | PASS (200) |
| 31 | Approvals | `/api/v1/approvals/[id]` | GET | Read | Bearer/Cookie | Authenticated | `verifyProjectScope` | Route Param | REQUIRED | PASS (200) |
| 32 | Approvals | `/api/v1/approvals/[id]/approve` | POST | Write | Bearer/Cookie | Authorized Approver | `verifyProjectScope` | Zod | REQUIRED | PASS (200) |
| 33 | Approvals | `/api/v1/approvals/[id]/reject` | POST | Write | Bearer/Cookie | Authorized Approver | `verifyProjectScope` | Zod | REQUIRED | PASS (200) |
| 34 | Supervision | `/api/v1/supervision/weekly` | GET | Read | Bearer/Cookie | Authenticated | RBAC Scoped | Query | REQUIRED | PASS (200) |
| 35 | Dashboard | `/api/v1/dashboard` | GET | Read | Bearer/Cookie | Executive/Admin | Portfolio Scope | Query | OPTIONAL | PASS (200) |
| 36 | Search | `/api/v1/search` | GET | Read | Bearer/Cookie | Authenticated | RBAC Scoped | Query (min 2) | REQUIRED | PASS (200) |

---

## 3. BUSINESS CAPABILITIES CLASSIFICATION

- **Auth**: `FULL API` (Login, Logout)
- **Me**: `FULL API` (Profile, Scoped Assignments)
- **Projects**: `READ API ONLY` (Project Mutations are `WEB INTERNAL`)
- **Project Members**: `READ API ONLY` (Member Management is `WEB ONLY`)
- **Project Personnel**: `READ API ONLY` (Allocation setup is `WEB ONLY`)
- **WBS**: `READ API ONLY` (WBS Tree setup is `WEB ONLY`)
- **Daily Progress**: `FULL API` (Read entries, Write field progress)
- **Site Reports**: `FULL API` (Read, Create, Edit, Submit, Approve, Reject)
- **Materials Stock**: `READ API ONLY` (Catalog/Stock adjustments are `WEB ONLY`)
- **Material Proposals**: `FULL API` (Read, Create, Submit, Approve, Reject)
- **Approvals**: `FULL API` (Read pending requests, Approve, Reject)
- **Supervision**: `READ API ONLY` (Supervision weekly dossier read)
- **Notifications**: `FULL API` (List, Mark Read, Read All)
- **Search**: `FULL API` (RBAC-filtered keyword search)
- **Safety**: `LEGACY API RETAINED — MOBILE COMPATIBLE` (Plans & Self-Assessments under `/api/reports/safety/**`)
- **Documents & Attachments**: `LEGACY API RETAINED — MOBILE COMPATIBLE` (`/api/documents/**`, `/api/reports/attachments/[attachmentId]`)
- **HR Employee Admin**: `INTERNAL ONLY` (Web Admin)
- **Audit & Settings**: `INTERNAL ONLY` (Web Admin)
