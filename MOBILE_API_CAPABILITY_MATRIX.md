# CONSTRUCTION-ERP-V2 — MOBILE API CAPABILITY MATRIX & COVERAGE RECONCILIATION

## 1. MOBILE APPS SCOPE & PHILOSOPHY
The `construction-erp-v2` mobile application targets **Field Engineers, Site Commanders, and Mobile Approvers**.
Core administrative functions (such as creating new projects, modifying company organizational units, or executing database seed scripts) remain **Web-Only Internal Operations**.

---

## 2. RECONCILED MOBILE CAPABILITY MATRIX

| Mobile Feature | Required API Endpoint | Implemented | Read Support | Write Support | Runtime Test Status | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `POST /api/v1/auth/login` | Yes | N/A | Yes | PASS (200, Token returned) | **MOBILE READY** |
| **Session Revocation** | `POST /api/v1/auth/logout` | Yes | N/A | Yes | PASS (200, Token revoked) | **MOBILE READY** |
| **User Profile** | `GET /api/v1/me` | Yes | Yes | N/A | PASS (200, Scoped Projects) | **MOBILE READY** |
| **Project Directory** | `GET /api/v1/projects` | Yes | Yes | Web Only | PASS (200, Paginated) | **MOBILE READY** |
| **Project Detail** | `GET /api/v1/projects/[id]` | Yes | Yes | Web Only | PASS (200, Scoped) | **MOBILE READY** |
| **Project Personnel** | `GET /api/v1/projects/[id]/personnel` | Yes | Yes | Web Only | PASS (200) | **MOBILE READY** |
| **Project Members** | `GET /api/v1/projects/[id]/members` | Yes | Yes | Web Only | PASS (200) | **MOBILE READY** |
| **Project Dashboard** | `GET /api/v1/projects/[id]/dashboard` | Yes | Yes | N/A | PASS (200) | **MOBILE READY** |
| **WBS Structure** | `GET /api/v1/projects/[id]/wbs` | Yes | Yes | Web Only | PASS (200) | **MOBILE READY** |
| **Daily Progress List** | `GET /api/v1/projects/[id]/progress/daily` | Yes | Yes | N/A | PASS (200) | **MOBILE READY** |
| **Daily Progress Entry** | `POST /api/v1/projects/[id]/progress/daily` | Yes | N/A | Yes | PASS (200) | **MOBILE READY** |
| **Site Reports List** | `GET /api/v1/reports` | Yes | Yes | N/A | PASS (200) | **MOBILE READY** |
| **Create Site Report** | `POST /api/v1/reports` | Yes | N/A | Yes | PASS (200) | **MOBILE READY** |
| **Report Workflow** | `POST /api/v1/reports/[id]/submit`, `approve`, `reject` | Yes | N/A | Yes | PASS (200) | **MOBILE READY** |
| **Materials Stock** | `GET /api/v1/projects/[id]/materials` | Yes | Yes | Web Only | PASS (200) | **MOBILE READY** |
| **Material Proposals** | `GET /api/v1/material-proposals` | Yes | Yes | N/A | PASS (200) | **MOBILE READY** |
| **Create Proposal** | `POST /api/v1/material-proposals` | Yes | N/A | Yes | PASS (200) | **MOBILE READY** |
| **Proposal Workflow** | `POST /api/v1/material-proposals/[id]/approve`, `reject` | Yes | N/A | Yes | PASS (200) | **MOBILE READY** |
| **Approvals Center** | `GET /api/v1/approvals` | Yes | Yes | N/A | PASS (200) | **MOBILE READY** |
| **Approval Actions** | `POST /api/v1/approvals/[id]/approve`, `reject` | Yes | N/A | Yes | PASS (200) | **MOBILE READY** |
| **Notifications** | `GET /api/v1/notifications`, `POST read-all` | Yes | Yes | Yes | PASS (200) | **MOBILE READY** |
| **Global Search** | `GET /api/v1/search` | Yes | Yes | N/A | PASS (200) | **MOBILE READY** |
| **Supervision Dossiers**| `GET /api/v1/supervision/weekly` | Yes | Yes | N/A | PASS (200) | **MOBILE READY** |
| **Safety Plans & Self-Assessments** | `/api/reports/safety/**` | Yes | Yes | Yes | PASS (200, Secured) | **LEGACY COMPATIBLE** |
| **Document Upload & Download** | `/api/documents/**` | Yes | Yes | Yes | PASS (200, Secured) | **LEGACY COMPATIBLE** |

---

## 3. FINAL MOBILE COVERAGE SCORE

$$\text{MOBILE API COVERAGE} = \frac{25}{25} \text{ Required Capabilities} = 100\%$$

*Note*: Administrative mutations (Project creation, WBS schema alterations, User role management) are deliberately classified as **WEB ONLY INTERNAL** and excluded from the Mobile API requirement denominator.
