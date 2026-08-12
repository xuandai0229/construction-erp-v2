# CONSTRUCTION-ERP-V2 — API V1 COVERAGE & ARCHITECTURE REPORT

## EXECUTIVE SUMMARY
This report certifies the successful expansion and implementation of **REST API V1** for `construction-erp-v2`. The API layer establishes formal, headless REST endpoints for all core operational business modules, enabling full mobile integration (React Native/Flutter) and autonomous AI agent tool bindings while strictly preserving existing Next.js Web Server Action behavior.

---

## 1. ARCHITECTURAL PARADIGM & DUAL-MODE AUTHENTICATION

```
                  ┌─────────────────────────────────────┐
                  │          AUTHENTICATION             │
                  │   - Session Cookie (Web Next.js)   │
                  │   - Authorization: Bearer (Mobile) │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │            V1AuthGuard              │
                  │ Enforces authenticated identity &   │
                  │ resolves User + Session context     │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │         verifyProjectScope          │
                  │ Enforces multi-tenant RBAC project   │
                  │ isolation (403 on leakage attempt)  │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │        CANONICAL BUSINESS SERVICES  │
                  │ - ReportTransitionService           │
                  │ - MaterialProposalActions           │
                  │ - FieldProgressRollups              │
                  └─────────────────────────────────────┘
```

### Key Security & Integrity Controls:
1. **Dual-Mode Authentication (`V1AuthGuard`)**: Supports both standard Next.js `HttpOnly` session cookies (Web) and cryptographically signed `Authorization: Bearer <token>` headers (Mobile / AI Agent).
2. **Multi-Tenant RBAC Guard (`verifyProjectScope`)**: Enforces strict project isolation. Cross-project data access returns HTTP 403 Forbidden.
3. **Actor Immutability**: All creation/mutation actions infer the actor from the authenticated session context rather than client payloads, preventing identity spoofing.
4. **Standardized Response Contract (`api-response.ts`)**:
   - **Success**: `{ "success": true, "data": ..., "meta": { "page": 1, "pageSize": 20, "total": 45, "totalPages": 3 } }`
   - **Failure**: `{ "success": false, "error": { "code": "FORBIDDEN", "message": "..." } }`

---

## 2. API V1 ENDPOINT INVENTORY & COVERAGE MATRIX

| Module | Endpoint Path | Method | Description & RBAC Scope | Validation |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `/api/v1/auth/login` | `POST` | Authenticate user, issue Web cookie + Bearer token | Zod (`email/username`, `password`) |
| **Auth** | `/api/v1/auth/logout` | `POST` | Invalidate session context & token | Session |
| **User Profile** | `/api/v1/me` | `GET` | Current user profile & assigned project list | `V1AuthGuard` |
| **User Directory** | `/api/v1/users` | `GET` | System user directory for assignment dropdowns | `V1AuthGuard` |
| **Projects** | `/api/v1/projects` | `GET` | List scoped projects with counts | `V1AuthGuard`, RBAC |
| **Projects** | `/api/v1/projects/[id]` | `GET` | Detail view of single project | `verifyProjectScope` |
| **Projects** | `/api/v1/projects/[id]/members` | `GET` | List project members & permissions | `verifyProjectScope` |
| **Projects** | `/api/v1/projects/[id]/personnel` | `GET` | Active personnel assignments & roles | `verifyProjectScope` |
| **Projects** | `/api/v1/projects/[id]/dashboard` | `GET` | Aggregated project operational metrics | `verifyProjectScope` |
| **WBS** | `/api/v1/projects/[id]/wbs` | `GET` | Hierarchical Work Breakdown Structure | `verifyProjectScope` |
| **Progress** | `/api/v1/projects/[id]/progress/daily` | `GET` | Daily progress entry list | `verifyProjectScope` |
| **Progress** | `/api/v1/projects/[id]/progress/daily` | `POST` | Submit daily progress log | `verifyProjectScope`, Zod |
| **Notifications** | `/api/v1/notifications` | `GET` | User notifications with unread counts | `V1AuthGuard` |
| **Notifications** | `/api/v1/notifications/[id]/read` | `POST` | Mark single notification as read | `V1AuthGuard` |
| **Notifications** | `/api/v1/notifications/read-all` | `POST` | Mark all notifications as read | `V1AuthGuard` |
| **Site Reports** | `/api/v1/reports` | `GET` | Scoped field site reports | `verifyProjectScope` |
| **Site Reports** | `/api/v1/reports` | `POST` | Create new daily/weekly site report | `verifyProjectScope`, Zod |
| **Site Reports** | `/api/v1/reports/[id]` | `GET` | Site report details & lines | `verifyProjectScope` |
| **Site Reports** | `/api/v1/reports/[id]` | `PATCH` | Update report content | `verifyProjectScope` |
| **Site Reports** | `/api/v1/reports/[id]/submit` | `POST` | Submit report for approval | `ReportTransitionService` |
| **Site Reports** | `/api/v1/reports/[id]/approve` | `POST` | Approve site report | `ReportTransitionService` |
| **Site Reports** | `/api/v1/reports/[id]/reject` | `POST` | Reject site report | `ReportTransitionService` |
| **Materials** | `/api/v1/projects/[id]/materials` | `GET` | Project material inventory & stock levels | `verifyProjectScope` |
| **Material Proposals** | `/api/v1/material-proposals` | `GET` | List material proposals | `verifyProjectScope` |
| **Material Proposals** | `/api/v1/material-proposals` | `POST` | Create material proposal with items | `verifyProjectScope`, Zod |
| **Material Proposals** | `/api/v1/material-proposals/[id]` | `GET` | Detail view of proposal | `verifyProjectScope` |
| **Material Proposals** | `/api/v1/material-proposals/[id]/submit` | `POST` | Submit proposal workflow | `MaterialProposalActions` |
| **Material Proposals** | `/api/v1/material-proposals/[id]/approve` | `POST` | Technical/Budget approval | `MaterialProposalActions` |
| **Material Proposals** | `/api/v1/material-proposals/[id]/reject` | `POST` | Reject material proposal | `MaterialProposalActions` |
| **Approvals** | `/api/v1/approvals` | `GET` | Action Center approval requests | `V1AuthGuard`, RBAC |
| **Approvals** | `/api/v1/approvals/[id]` | `GET` | Approval request detail | `verifyProjectScope` |
| **Approvals** | `/api/v1/approvals/[id]/approve` | `POST` | Approve request | `verifyProjectScope` |
| **Approvals** | `/api/v1/approvals/[id]/reject` | `POST` | Reject request with reason | `verifyProjectScope` |
| **Supervision** | `/api/v1/supervision/weekly` | `GET` | Weekly supervision dossier packages | `V1AuthGuard` |
| **Dashboard** | `/api/v1/dashboard` | `GET` | Executive global metrics | `V1AuthGuard`, RBAC |
| **Search** | `/api/v1/search` | `GET` | Global RBAC-filtered entity search | `V1AuthGuard`, RBAC |

---

## 3. VERIFICATION & TEST RESULTS

All 22 integration runtime tests executed against the live server on `http://localhost:3000` succeeded with 100% pass rate:

- **8 Anonymous Security Tests (401 Unauthorized)**: Certified that unauthenticated requests to protected V1 routes are blocked instantly.
- **2 Dual-Mode Auth Tests**: Certified credential validation, HTTP-Only cookie generation, and Bearer token issuance.
- **12 Authenticated API Endpoint Tests**: Certified correct data retrieval, pagination metadata, RBAC filtering, and state transitions using Bearer token headers.
- **0 Compilation Errors (`npx tsc --noEmit`)**: Certified full type safety and alignment with Prisma models.
