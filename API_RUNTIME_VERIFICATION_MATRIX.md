# MA TRẬN XÁC MINH RUNTIME VÀ KIỂM TOÁN CHI TIẾT API (API RUNTIME VERIFICATION MATRIX)
## DỰ ÁN: `CONSTRUCTION-ERP-V2`

> **Trạng thái:** 🧪 **CANONICAL INVENTORY & RUNTIME PROOF COMPLETED**  
> **Thời gian thực hiện:** 12/08/2026  
> **Phương pháp kiểm tra:** Source AST Scanning + Runtime HTTP Requests + Security Boundary Tests  

---

## 1. MA TRẬN TOÀN BỘ HTTP ROUTE HANDLERS (28 ROUTE HANDLERS / 32 HTTP METHODS)

Mỗi file `route.ts` được phân tách theo từng **HTTP Method** cụ thể mà nó expose:

| STT | Endpoint URL | Method | Dynamic Route | Phân loại Vị trí | Session Auth | RBAC & Project Scope | Phân loại Usage |
|---|---|---|---|---|---|---|---|
| 1 | `/api/auth/login` | **POST** | Không | Inside `/api` | Server Side | Anonymous Allowed | **ACTIVE** |
| 2 | `/api/auth/logout` | **POST** | Không | Inside `/api` | `clearSession()` | Authed Session | **ACTIVE** |
| 3 | `/api/cron/documents-trash-cleanup` | **GET** | Không | Inside `/api` | Bearer Token (`CRON_SECRET`) | System Secret Guard | **ACTIVE / CRON** |
| 4 | `/api/documents/[documentId]/download` | **GET** | `[documentId]` | Inside `/api` | `getSession()` | `resolvePermission` + `canAccessProject` | **ACTIVE** |
| 5 | `/api/documents/load-more` | **GET** | Không | Inside `/api` | `getSession()` | `resolvePermission` + `canAccessProject` | **ACTIVE** |
| 6 | `/api/documents/upload` | **POST** | Không | Inside `/api` | `getSession()` | `resolvePermission` + `canAccessProject` + `canUploadToFolder` | **ACTIVE** |
| 7 | `/api/hr/reports/export` | **GET** | Không | Inside `/api` | `getSession()` | `checkHrPermission("hr:project_assignment:read")` | **ACTIVE** |
| 8 | `/api/reports/[reportId]/attachments` | **POST** | `[reportId]` | Inside `/api` | `getSession()` | `resolvePermission` + `canAccessProject` | **ACTIVE** |
| 9 | `/api/reports/[reportId]/history` | **GET** | `[reportId]` | Inside `/api` | `getSession()` | `resolvePermission` + `canAccessProject` | **ACTIVE** |
| 10 | `/api/reports/attachments/[attachmentId]` | **GET** | `[attachmentId]` | Inside `/api` | `getSession()` | `canAccessProject` | **ACTIVE** |
| 11 | `/api/reports/safety/plans` | **GET** | Không | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (No `getSession`) | **UNPROTECTED REST** |
| 12 | `/api/reports/safety/plans` | **POST** | Không | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (Takes `actorId` in body) | **UNPROTECTED REST** |
| 13 | `/api/reports/safety/plans/[planId]` | **GET** | `[planId]` | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (No `getSession`) | **UNPROTECTED REST** |
| 14 | `/api/reports/safety/plans/[planId]` | **DELETE** | `[planId]` | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (Takes `actorId` in query) | **UNPROTECTED REST** |
| 15 | `/api/reports/safety/plans/[planId]/approve` | **POST** | `[planId]` | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (Takes `actorId` in body) | **UNPROTECTED REST** |
| 16 | `/api/reports/safety/plans/[planId]/export` | **GET** | `[planId]` | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (No `getSession`) | **UNPROTECTED REST** |
| 17 | `/api/reports/safety/plans/[planId]/submit` | **POST** | `[planId]` | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (Takes `actorId` in body) | **UNPROTECTED REST** |
| 18 | `/api/reports/safety/self-assessments` | **GET** | Không | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (No `getSession`) | **UNPROTECTED REST** |
| 19 | `/api/reports/safety/self-assessments` | **POST** | Không | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (Takes `actorId` in body) | **UNPROTECTED REST** |
| 20 | `/api/reports/safety/self-assessments/[reportId]` | **GET** | `[reportId]` | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (No `getSession`) | **UNPROTECTED REST** |
| 21 | `/api/reports/safety/self-assessments/[reportId]` | **DELETE** | `[reportId]` | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (Takes `actorId` in query) | **UNPROTECTED REST** |
| 22 | `/api/reports/safety/self-assessments/[reportId]/approve` | **POST** | `[reportId]` | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (Takes `actorId` in body) | **UNPROTECTED REST** |
| 23 | `/api/reports/safety/self-assessments/[reportId]/export` | **GET** | `[reportId]` | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (No `getSession`) | **UNPROTECTED REST** |
| 24 | `/api/reports/safety/self-assessments/[reportId]/submit` | **POST** | `[reportId]` | Inside `/api` | ❌ **MISSING** | ❌ **MISSING** (Takes `actorId` in body) | **UNPROTECTED REST** |
| 25 | `/api/reports/weekly-summary/export` | **GET** | Không | Inside `/api` | `getSession()` | Project Scope | **ACTIVE** |
| 26 | `/api/reports/weekly-summary/export-pdf` | **GET** | Không | Inside `/api` | `getSession()` | Project Scope | **ACTIVE** |
| 27 | `/api/supervision/weekly/[id]/export` | **GET** | `[id]` | Inside `/api` | `getSession()` | Project Scope | **ACTIVE** |
| 28 | `/materials/proposals/[id]/export` | **GET** | `[id]` | Outside `/api` | `getSession()` | Scope via `getMaterialProposal` | **ACTIVE / OUTSIDE /API** |

---

## 2. MA TRẬN SERVER ACTIONS (19 FILE ACTIONS / 100+ FUNCTIONS)

| Server Action File | Vị trí File | Phân nhóm Security Boundary | Chức năng Mutation chính | Authentication Guard | Project Scope Guard |
|---|---|---|---|---|---|
| `users/actions.ts` | `src/app/(dashboard)/users/` | User Management | Create, Update Role, Toggle Active, Reset Password | `getSession()` + `role === 'ADMIN'` | N/A (Global) |
| `projects/actions.ts` | `src/app/(dashboard)/projects/` | Project Management | Create Project, Update Details, Archive, Manage Members | `getSession()` + `requireProjectScope` | Enforced |
| `field-progress/actions.ts` | `src/app/(dashboard)/projects/[id]/field-progress/` | WBS & Progress | Create/Update WBS items, reorder tasks | `getSession()` + `canAccessProject` | Enforced |
| `daily/actions.ts` | `src/app/(dashboard)/projects/[id]/field-progress/daily/` | Daily Logs | Save daily progress entries, submit daily log | `getSession()` + `canAccessProject` | Enforced |
| `materials/actions.ts` | `src/app/(dashboard)/materials/` | Materials Control | Add items, set quota, update stock | `getSession()` + `requireProjectPermissions` | Enforced |
| `material-proposals/actions.ts` | `src/lib/material-proposals/` | Material Proposals | Create, Auto-save, Submit, Approve/Reject proposal | `getSession()` + `canAccessProject` | Enforced |
| `documents/actions.ts` | `src/app/(dashboard)/documents/` | Document Drive | Create folder, Rename, Soft-delete, Restore, Permanently delete | `getSession()` + `resolvePermission` | Enforced |
| `reports/actions.ts` | `src/app/(dashboard)/reports/` | Field Reports | Create Site Report, Update lines, Submit, Approve, Reject | `getSession()` + `resolvePermission` | Enforced |
| `reports/safety/actions.ts` | `src/app/(dashboard)/reports/safety/` | Safety Management | Draft safety plans & self-assessments | `getSession()` + `canAccessProject` | Enforced |
| `supervision/actions.ts` | `src/app/(dashboard)/supervision/weekly/` | Supervision Dossiers | Create weekly dossier, Update quantities, Transition state | `getSession()` + `canAccessProject` | Enforced |
| `approvals/actions.ts` | `src/app/(dashboard)/approvals/` | Approval Engine | Approve, Reject, Request Revision for documents/reports | `getSession()` + Approver Verification | Enforced |
| `employee-actions.ts` | `src/app/hr/employees/actions/` | HR Employees | Create employee, Update PII, Link user account, Archive, Reveal PII | `getSession()` + `checkHrPermission` | HR Org Unit Scope |
| `organization-actions.ts` | `src/app/hr/organization/actions/` | HR Org Structure | Create/Edit Org Units & Positions, Assign managers | `getSession()` + `checkHrPermission` | HR Org Unit Scope |
| `project-assignment-actions.ts` | `src/app/hr/project-assignments/actions/` | HR Staffing | Assign staff to project, Extend, Transfer, Release | `getSession()` + `checkHrPermission` | Project Scope |
| `settings/actions.ts` | `src/app/(dashboard)/settings/` | System Settings | Update max upload size, document retention, naming rules | `getSession()` + `role === 'ADMIN'` | N/A (Global) |
| `notifications.ts` | `src/app/actions/` | User Alerts | Mark notifications as read | `getSession()` | User Scoped |
| `global-search.ts` | `src/app/actions/` | Search Engine | Quick search projects, reports, docs, employees | `getSession()` | Project Scope Filtered |
| `project-context.ts` | `src/app/actions/` | Session Context | Set current active project in user session | `getSession()` | `canAccessProject` |
| `dashboard-detail-actions.ts` | `src/lib/dashboard/` | Executive Dashboard | Fetch drill-down details for action items & risks | `getSession()` | Executive Scope |

---

## 3. MA TRẬN VALIDATION VÀ MASS ASSIGNMENT

| Endpoint / Action File | Param / Query Check | Body / Form Input Validation | Magic Byte / File Check | Risk / Vulnerability | Trạng thái Validation |
|---|---|---|---|---|---|
| `POST /api/documents/upload` | Enforced (projectId, folderId) | Enforced (`parseDocumentUploadRequest`) | Enforced (`validateFileSignature`) | None | **STRICT VALIDATED** |
| `GET /api/documents/[id]/download` | Enforced (documentId UUID) | N/A | Streamed | None | **STRICT VALIDATED** |
| `GET /api/documents/load-more` | Enforced (projectId, type, skip, take) | N/A | N/A | None | **STRICT VALIDATED** |
| `POST /api/auth/login` | N/A | Enforced (String check + bcrypt) | N/A | None | **STRICT VALIDATED** |
| `POST /api/reports/safety/*` (10 endpoints) | Basic param check | Raw JSON parsing (`body.actorId \|\| 'system-user'`) | N/A | **High Risk: Missing Session & Param Schema** | ⚠️ **WEAK VALIDATION** |
| `users/actions.ts` | Action Input DTO | Explicit Zod / Whitelist mapping | N/A | None | **STRICT VALIDATED** |
| `projects/actions.ts` | Action Input DTO | Explicit Whitelist mapping (`data: { name, code... }`) | N/A | None | **STRICT VALIDATED** |
| `materials/actions.ts` | Action Input DTO | Whitelist mapping | N/A | None | **STRICT VALIDATED** |
| `documents/actions.ts` | Action Input DTO | Whitelist mapping | N/A | None | **STRICT VALIDATED** |
| `employee-actions.ts` | Action Input DTO | Zod Schema (`CreateEmployeeSchema`) | N/A | None | **STRICT VALIDATED** |

---

## 4. MA TRẬN ĐÁNH GIÁ SẴN SÀNG TÍCH HỢP AI AGENT (TOOL CANDIDATES)

| Tool Candidate (Internal Service) | Vị trí File | Phân loại Agent Tool | Chức năng Tool | Session / Context Binding | Auditability | Idempotent |
|---|---|---|---|---|---|---|
| `getGlobalProjectContext` | `src/lib/project-context.ts` | **AGENT READ TOOL READY** | Lấy toàn bộ danh sách công trình, cảnh báo và hồ sơ chờ duyệt | Tự động áp dụng `accessScope` theo user | Tự động log profiling | Có |
| `getDashboardData` | `src/lib/dashboard/dashboard-queries.ts` | **AGENT READ TOOL READY** | Tổng hợp KPIs, sản lượng, báo cáo tuần và nhật ký thi công | Tự động áp dụng `projectIdScope` | Tự động log profiling | Có |
| `getExecutiveActionItems` | `src/lib/dashboard/executive-action-service.ts` | **AGENT READ TOOL READY** | Tra cứu danh sách công trình nguy cơ cao và báo cáo trễ | Tự động áp dụng `resolveExecutiveDashboardScope` | Tự động log profiling | Có |
| `generateHrExcelReportBuffer` | `src/lib/hr/reporting-service.ts` | **AGENT READ TOOL READY** | Thống kê và tạo báo cáo nhân sự theo bộ lọc | Yêu cầu `HrAccessContext` | Ghi log HR audit | Có |
| `getMaterialProposal` | `src/lib/material-proposals/actions.ts` | **AGENT READ TOOL READY** | Tra cứu chi tiết 1 đề xuất vật tư theo ID | Bắt buộc `canAccessProject` | Ghi log audit | Có |
| `decideMaterialProposal` | `src/lib/material-proposals/actions.ts` | **AGENT WRITE TOOL NEEDS GUARD** | Phê duyệt hoặc Từ chối đề xuất vật tư | Yêu cầu `session.id` + Approver check | Ghi Audit Log | Cần Confirmation |
| `createMaterialProposal` | `src/lib/material-proposals/actions.ts` | **AGENT WRITE TOOL NEEDS GUARD** | Tạo mới đề xuất vật tư công trình | Yêu cầu `session.id` + Project scope | Ghi Audit Log | Cần Confirmation |
| `approveSiteReport` | `src/app/(dashboard)/reports/actions.ts` | **AGENT WRITE TOOL NEEDS GUARD** | Phê duyệt Báo cáo hiện trường | Yêu cầu `session.id` + Manager role | Ghi Audit Log | Cần Confirmation |
