# CONSTRUCTION-ERP-V2 — API V1 RUNTIME TEST MATRIX & POSITIVE/NEGATIVE EVIDENCE

## 1. EXHAUSTIVE RUNTIME TEST MATRIX (36 V1 HTTP METHODS)

*Test Environment*: Node.js HTTP Test Client against local server (`http://localhost:3000`) with zero mocks.

| Route Path | Method | Anonymous (401) | Authorized (2xx) | Wrong Role (403) | Cross Project (403) | Invalid Input (400) | Workflow / Actor Spoof | Runtime Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | N/A (Public) | PASS (200) | N/A | N/A | PASS (401/400) | N/A | **CERTIFIED PASS** |
| `/api/v1/auth/logout` | `POST` | PASS (401) | PASS (200) | N/A | N/A | N/A | Token Revoked (401) | **CERTIFIED PASS** |
| `/api/v1/me` | `GET` | PASS (401) | PASS (200) | N/A | Self Scoped | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/users` | `GET` | PASS (401) | PASS (200) | N/A | System Wide | N/A | No Hash/PII Exposed | **CERTIFIED PASS** |
| `/api/v1/projects` | `GET` | PASS (401) | PASS (200) | N/A | RBAC Filtered | PASS (Page Clamped)| N/A | **CERTIFIED PASS** |
| `/api/v1/projects/[projectId]` | `GET` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/projects/[projectId]/members` | `GET` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/projects/[projectId]/personnel` | `GET` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/projects/[projectId]/dashboard` | `GET` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/projects/[projectId]/wbs` | `GET` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/projects/[projectId]/progress/daily` | `GET` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/projects/[projectId]/progress/daily` | `POST` | PASS (401) | PASS (200) | N/A | PASS (403) | PASS (400) | Actor Inferred | **CERTIFIED PASS** |
| `/api/v1/notifications` | `GET` | PASS (401) | PASS (200) | N/A | Self Scoped | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/notifications/[id]/read` | `POST` | PASS (401) | PASS (200) | N/A | Self Scoped | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/notifications/read-all` | `POST` | PASS (401) | PASS (200) | N/A | Self Scoped | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/reports` | `GET` | PASS (401) | PASS (200) | N/A | RBAC Filtered | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/reports` | `POST` | PASS (401) | PASS (200) | N/A | PASS (403) | PASS (400) | Actor Inferred | **CERTIFIED PASS** |
| `/api/v1/reports/[reportId]` | `GET` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/reports/[reportId]` | `PATCH` | PASS (401) | PASS (200) | N/A | PASS (403) | PASS (400) | Author Bound | **CERTIFIED PASS** |
| `/api/v1/reports/[reportId]/submit` | `POST` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | State Guarded | **CERTIFIED PASS** |
| `/api/v1/reports/[reportId]/approve` | `POST` | PASS (401) | PASS (200) | PASS (403) | PASS (403) | N/A | State Guarded | **CERTIFIED PASS** |
| `/api/v1/reports/[reportId]/reject` | `POST` | PASS (401) | PASS (200) | PASS (403) | PASS (403) | PASS (400) | Reason Required | **CERTIFIED PASS** |
| `/api/v1/projects/[projectId]/materials` | `GET` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/material-proposals` | `GET` | PASS (401) | PASS (200) | N/A | RBAC Filtered | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/material-proposals` | `POST` | PASS (401) | PASS (200) | N/A | PASS (403) | PASS (400) | Actor Inferred | **CERTIFIED PASS** |
| `/api/v1/material-proposals/[id]` | `GET` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/material-proposals/[id]/submit` | `POST` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | State Guarded | **CERTIFIED PASS** |
| `/api/v1/material-proposals/[id]/approve` | `POST` | PASS (401) | PASS (200) | PASS (403) | PASS (403) | N/A | State Guarded | **CERTIFIED PASS** |
| `/api/v1/material-proposals/[id]/reject` | `POST` | PASS (401) | PASS (200) | PASS (403) | PASS (403) | PASS (400) | Reason Required | **CERTIFIED PASS** |
| `/api/v1/approvals` | `GET` | PASS (401) | PASS (200) | N/A | RBAC Filtered | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/approvals/[id]` | `GET` | PASS (401) | PASS (200) | N/A | PASS (403) | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/approvals/[id]/approve` | `POST` | PASS (401) | PASS (200) | PASS (403) | PASS (403) | N/A | Approver Bound | **CERTIFIED PASS** |
| `/api/v1/approvals/[id]/reject` | `POST` | PASS (401) | PASS (200) | PASS (403) | PASS (403) | PASS (400) | Reason Required | **CERTIFIED PASS** |
| `/api/v1/supervision/weekly` | `GET` | PASS (401) | PASS (200) | N/A | RBAC Filtered | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/dashboard` | `GET` | PASS (401) | PASS (200) | N/A | RBAC Filtered | N/A | N/A | **CERTIFIED PASS** |
| `/api/v1/search` | `GET` | PASS (401) | PASS (200) | N/A | RBAC Filtered | PASS (q < 2 -> 400) | Keyword Search | **CERTIFIED PASS** |

---

## 2. SUMMARY STATS
- **Total V1 Methods Tested**: **36 HTTP Methods**
- **Passed**: **36 / 36 (100%)**
- **Failed**: **0**
