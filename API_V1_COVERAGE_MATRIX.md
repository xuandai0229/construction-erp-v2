# API V1 COVERAGE MATRIX

**Target System:** `construction-erp-v2`  
**Phase:** Full API V1 Coverage & Optimization  
**Date:** August 12, 2026  

---

## 1. System-Wide Business Capabilities & API V1 Decisions

| Business Capability | Existing HTTP API | Server Action | Business Service | Mobile Need | AI Need | Decision | Target Endpoint Namespace |
|---|---|---|---|---|---|---|---|
| **Authentication & Session** | `/api/auth/login`, `/api/auth/logout` | Yes | `src/lib/auth.ts`, `session-token.ts` | HIGH | LOW | `OPTIMIZE` | `/api/v1/auth/*` |
| **Current User Profile** | None | Yes | `src/lib/auth.ts` | HIGH | MEDIUM | `CREATE API` | `/api/v1/me` |
| **User Directory** | None | Yes | Prisma User model | MEDIUM | LOW | `CREATE API` | `/api/v1/users` |
| **Projects Core** | None | Yes | `src/lib/project-context.ts`, `project-status.ts` | HIGH | HIGH | `CREATE API` | `/api/v1/projects` |
| **Project Members** | None | Yes | `src/lib/permissions/project-scope.ts` | HIGH | MEDIUM | `CREATE API` | `/api/v1/projects/:projectId/members` |
| **Project Personnel** | None | Yes | `src/lib/hr/project-assignment-service.ts` | HIGH | MEDIUM | `CREATE API` | `/api/v1/projects/:projectId/personnel` |
| **Executive / Project Dashboard** | None | Yes | `src/lib/dashboard/*` | HIGH | HIGH | `CREATE API` | `/api/v1/dashboard`, `/api/v1/projects/:id/dashboard` |
| **WBS / Work Items** | None | Yes | `src/lib/field-progress.ts` | HIGH | HIGH | `CREATE API` | `/api/v1/projects/:projectId/wbs` |
| **Daily Field Progress** | None | Yes | `src/lib/field-progress/` | HIGH | HIGH | `CREATE API` | `/api/v1/projects/:projectId/progress/daily` |
| **Field Reports** | None | Yes | `src/lib/reports/*` | HIGH | HIGH | `CREATE API` | `/api/v1/reports` |
| **Report Attachments** | `/api/reports/[id]/attachments` | Yes | `src/lib/reports/attachment-service.ts` | HIGH | LOW | `OPTIMIZE` | `/api/v1/reports/:id/attachments` |
| **Safety Reporting** | `/api/reports/safety/**` | Yes | `src/lib/safety-reporting/*` | HIGH | HIGH | `READY` | `/api/reports/safety/**` (Hardened) |
| **Supervision Dossiers** | `/api/supervision/weekly/[id]/export` | Yes | `src/lib/supervision-weekly/*` | MEDIUM | HIGH | `CREATE API` | `/api/v1/supervision/weekly` |
| **Material Catalog & Stock** | None | Yes | `src/lib/materials/*` | HIGH | HIGH | `CREATE API` | `/api/v1/projects/:projectId/materials` |
| **Material Proposals** | None | Yes | `src/lib/material-proposals/*` | HIGH | HIGH | `CREATE API` | `/api/v1/material-proposals` |
| **Approvals Action Center** | None | Yes | `src/lib/approvals/*` | HIGH | HIGH | `CREATE API` | `/api/v1/approvals` |
| **Document Management** | `/api/documents/**` | Yes | `src/lib/documents/*` | HIGH | MEDIUM | `OPTIMIZE` | `/api/documents/**`, `/api/v1/documents` |
| **HR Employee Management** | `/api/hr/reports/export` | Yes | `src/lib/hr/*` | LOW | LOW | `INTERNAL ONLY` | Server Actions / Web Dashboard |
| **HR Organization Hierarchy** | None | Yes | `src/lib/hr/organization-service.ts` | LOW | LOW | `INTERNAL ONLY` | Server Actions / Web Dashboard |
| **Notifications** | None | Yes | `src/lib/notifications/*` | HIGH | MEDIUM | `CREATE API` | `/api/v1/notifications` |
| **Global Search** | None | Yes | Multi-entity query service | HIGH | HIGH | `CREATE API` | `/api/v1/search` |
| **System Settings** | None | Yes | `src/lib/settings/*` | LOW | LOW | `INTERNAL ONLY` | Web Settings Page |
| **Audit Logs** | None | Yes | `src/lib/audit.ts` | LOW | LOW | `INTERNAL ONLY` | `/audit` Page |
| **Helper Functions (Formatting)** | None | No | `src/lib/utils.ts`, `date-utils.ts` | LOW | LOW | `INTERNAL ONLY` | Non-API Helper Module |

---

## 2. Decision Categories Summary

- **`READY`**: 1 Capability (Safety Reporting API - Hardened in prior step)
- **`OPTIMIZE`**: 3 Capabilities (Authentication, Report Attachments, Document Management)
- **`CREATE API`**: 14 Capabilities (Me, Users, Projects, Members, Personnel, Dashboard, WBS, Daily Progress, Field Reports, Supervision, Materials, Material Proposals, Approvals, Notifications, Global Search)
- **`INTERNAL ONLY`**: 6 Capabilities (HR Employees, HR Org, HR Assignments, Settings, Audit Logs, Pure Helpers)
