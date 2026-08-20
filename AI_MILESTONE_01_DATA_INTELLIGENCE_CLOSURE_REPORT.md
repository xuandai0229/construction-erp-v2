# AI MILESTONE 01 — Data Intelligence Closure Report

**Ngày đánh giá:** 2026-08-20
**Repository:** `construction-erp-v2`
**Phạm vi:** DATA LINEAGE AUDIT — toàn bộ module nghiệp vụ
**Phương pháp:** Read-only DB audit + full source code trace + schema analysis

---

## 1. Executive Summary

```text
HOW MUCH REAL ERP DATA EXISTS?
─────────────────────────────────────────────────
Projects:                  21 (real operational data)
Project Members:           18 (real — all CHIEF_COMMANDER)
Employees:                 12 (real — 11 linked to User accounts)
HR Project Assignments:    18 (real — mapping employees → projects)
Organization Units:         3 (real)
Positions:                  7 (real, 3 active)
Users:                     15 (real)
Audit Logs:             1,712 (real system activity)
System Settings:            1 (real)
Field Progress Templates:   1 (real — CT-2026-0021, empty)

EVERYTHING ELSE:            0 records

HOW MUCH AI CURRENTLY SEES?
─────────────────────────────────────────────────
AI correctly reads:
  ✓ 21 Projects (identity, status, dates, deadlines)
  ✓ 7 projects with endDate → overdue/deadline logic
  ✓ CT-2026-0009 overdue 51 days
  ✓ Project membership counts

AI correctly reports as empty:
  ✓ WBS = 0
  ✓ Field Progress = 0
  ✓ Site Reports = 0
  ✓ Material Stock = 0
  ✓ Approvals = 0

WHAT DATA WAS HIDDEN / MISWIRED?
─────────────────────────────────────────────────
NONE.
AI is NOT missing any hidden data source.
All zero-record domains are genuinely empty in the database.

WHAT DATA TRULY DOES NOT EXIST?
─────────────────────────────────────────────────
ALL operational/field data:
  WBS, Site Reports, Field Progress Entries,
  Material Stock/Movement, Approvals, Documents,
  Supervision Dossiers, Safety Reports, Notifications
```

**Verdict: Trường hợp B — Dữ liệu nghiệp vụ thật sự chưa được nhập.**

AI không bỏ sót bất kỳ nguồn dữ liệu nào. Hệ thống ERP có schema phong phú, module UI đầy đủ, business logic mạnh — nhưng chưa có operational data vì chưa có quy trình nhập liệu thực tế từ công trường.

---

## 2. Complete Data Lineage Matrix

### 2.1 Project Identity & Schedule

```text
UI: Dashboard → Project Overview cards
    Projects → Project list & detail
API: dashboard-queries.ts → getDashboardData()
Service: getProjectAccessScope() → projectScopeWhere()
         calculatePlannedProgress(startDate, endDate, today)
         getDaysRemaining(endDate, todayStart)
Prisma: Project { id, code, name, status, startDate, endDate, ... }
DB: "Project" table
    21 records, all ACTIVE
    7 have endDate → overdue/timeline logic works
    14 have no endDate → NO_DEADLINE

AI Tool: get_my_projects → queries Project directly ✓
         get_project_summary → queries Project directly ✓
AI reuses: same deadline/overdue formula ✓
```

### 2.2 Dashboard → Project Health / Overdue

```text
UI: Dashboard KPIs + Project Overview + Action Items
API: dashboard-queries.ts (line 384-397)
     executive-action-service.ts (line 104-129)
Service:
  getDaysRemaining(endDate, todayStart)
  → daysRemaining < 0 → "Trễ tiến độ"
  → priority: HIGH
  → riskItems pushed

  calculateProjectActualProgress(projectId, asOf, items, entries)
  → reads FieldProgressItem (WORK type) + FieldProgressEntry (APPROVED)
  → ratio: approvedActualQuantity / totalDesignQuantity * 100

  calculatePlannedProgress(startDate, endDate, today)
  → linear time-based planned %

  getProgressHealth(actual, planned)
  → variance-based: ON_TRACK / AT_RISK / DELAYED / NO_DATA

  deriveOperationalIssueState(input)
  → safety keywords, recommendations, quality, variance

Prisma: Project.endDate → overdue days
        FieldProgressItem + FieldProgressEntry → actual %
        SiteReport.issues/recommendations → issue state
DB: Only Project.endDate has real data.
    FieldProgressItem = 0, FieldProgressEntry = 0 → NO_DATA
    SiteReport = 0 → no issue state

AI Tool: get_project_summary → uses SAME calculateProjectActualProgress() ✓
         Correctly reports NO_PROGRESS_ITEMS ✓
```

### 2.3 Field Progress (Khối lượng thực hiện)

```text
UI: /projects/[id]/field-progress
    /projects/[id]/field-progress/daily
API: field-progress.ts, rollup.ts, volume-balance.ts
Service:
  FieldProgressTemplate → defines a "bảng khối lượng"
  FieldProgressItem (WORK/GROUP/NOTE) → work items in template
  FieldProgressEntry → daily quantity entries with approval workflow
    status: DRAFT → SUBMITTED → APPROVED
  volume-balance.ts → computes cumulative quantities
  rollup.ts → aggregates child items to parents

Prisma Models:
  FieldProgressTemplate: 1 record (CT-2026-0021, empty)
  FieldProgressItem: 0
  FieldProgressEntry: 0
  FieldProgressItemAssignment: 0
  FieldProgressItemLocation: 0

DB Reality: Template structure exists for one project but
            no work items have been defined, no entries recorded.
            Progress % = null for all 21 projects.

AI Tool: get_project_summary → queries FieldProgressItem/Entry ✓
         Correctly computes NO_PROGRESS_ITEMS ✓
```

### 2.4 Site Reports (Nhật ký thi công)

```text
UI: /reports → Site report list
    /reports/field/[id] → Report detail
    SiteReport has rich schema:
      summary, issues, recommendations, labor, equipment, quality
      weather, GPS, photos, attachments
    SiteReportLine → individual work items per report
      workContent, quantityToday, quantityBefore, quantityCumulative,
      progressPercent, issueNote, proposalNote
    Report workflow: DRAFT → SUBMITTED → APPROVED

API: reports/actions.ts (62KB — full CRUD)
Service:
  report-create-service.ts → creates reports
  report-transition-service.ts → workflow state machine
  report-progress-sync.ts → syncs report lines → FieldProgressEntry
  report-progress-display.ts → display formatters
  report-workflow-policy.ts → role-based transition rules
  weekly-company-summary.ts → weekly aggregation
  weekly-progress-summary.ts → progress from reports

Prisma Models:
  SiteReport: 0
  SiteReportLine: 0
  SiteReportPhoto: 0
  SiteReportAttachment: 0

DB Reality: ZERO records.
            Module fully implemented in code.
            No reports have been created by any user.

AI Tool: get_latest_field_reports → queries SiteReport correctly ✓
         Returns NO_FIELD_REPORTS ✓

IMPORTANT FINDING:
  report-progress-sync.ts creates FieldProgressEntry FROM SiteReportLine
  → sourceType = 'SITE_REPORT'
  This means site reports ARE the primary data entry point for progress.
  When users create reports with lines → progress entries auto-generated.
```

### 2.5 Material Management

```text
UI: /materials → Material management
    /materials/proposals → Material proposals
    /projects/[id]/material-requests → Field material requests
API: materials/actions.ts (34KB — full CRUD)
Service:
  MaterialItem → project-scoped material catalog
  MaterialProposal → purchase proposals with 2-stage approval
  MaterialMovement → IMPORT/EXPORT/TRANSFER/RETURN
  ProjectMaterialStock → real-time stock per project per material
  FieldMaterialRequest → field-initiated urgent requests

Prisma Models:
  MaterialItem: 0
  MaterialProposal: 0
  MaterialProposalItem: 0
  MaterialProposalApproval: 0
  MaterialMovement: 0
  ProjectMaterialStock: 0
  FieldMaterialRequest: 0
  FieldMaterialRequestItem: 0

DB Reality: ZERO records across entire material domain.
            Full module with proposals, 2-stage approval, movements exists.

AI Tool: get_project_material_summary → queries ProjectMaterialStock ✓
         Correctly refuses to use MaterialItem catalog as stock ✓
         Returns NO_MATERIAL_STOCK_DATA ✓
```

### 2.6 Approvals

```text
UI: /approvals → Approval center
API: approvals/actions.ts (18KB)
Service:
  ApprovalRequest → generic approval with type/priority/status
  Types: MATERIAL, REPORT, VOLUME, INSPECTION, PLAN, DRAWING,
         METHOD_STATEMENT, SAFETY, QUALITY, SITE_ISSUE, CHANGE_ORDER, OTHER
  Workflow: PENDING → APPROVED/REJECTED/CANCELLED

Prisma: ApprovalRequest: 0

AI Tool: get_pending_items → queries ApprovalRequest.PENDING
         + SiteReport.SUBMITTED ✓
         Returns NO_PENDING_ITEMS_IN_SUPPORTED_DOMAINS ✓
```

### 2.7 Documents

```text
UI: /documents/[projectId] → Project document management
API: documents/actions.ts (22KB)
Service:
  DocumentFolder → project-scoped folder hierarchy
  Document → file metadata + storage + workflow
    status: DRAFT → SUBMITTED → APPROVED → ARCHIVED
    version tracking, hash dedup, field progress linking

Prisma: DocumentFolder: 0, Document: 0

AI: Not in 5-tool allowlist (correct — DATA_UNAVAILABLE refusal)
```

### 2.8 Supervision Module

```text
UI: /supervision/weekly → Weekly supervision dossiers

Two systems:
A. LEGACY (marked "đã bị gỡ khỏi runtime")
   SupervisionWeeklyPackage + children: ALL 0 records
B. NEW Weekly Dossier
   SupervisionWeeklyDossier + children: ALL 0 records

Service: supervision-weekly/ module (20+ files)
  Full workflow: DRAFT → SUBMITTED → APPROVED → LOCKED

AI: Not in 5-tool allowlist (correct for AI-01 scope)
```

### 2.9 Safety Reporting (ATLĐ · PCCC · VSMT)

```text
UI: /reports/safety
Service: safety-reporting/ (16 files)
  SafetyReportPlan → inspection plans
  SafetySelfAssessmentReport → assessments
  SafetyWeeklyFile → groups plan + assessment
  Includes DOCX/PDF generation, official document numbering

Prisma: ALL 0 records (7 models)

AI: Outside 5-tool allowlist → SECURITY_REFUSAL (correct)
```

### 2.10 HR Module

```text
UI: /hr → HR management
DB Reality: ONLY MODULE WITH REAL OPERATIONAL DATA
  Employee: 12 (11 linked to Users)
  EmployeeProjectAssignment: 18 (mapping employees → projects)
  OrganizationUnit: 3
  Position: 7 (3 active)
  EmployeeOrganizationAssignment: 1

AI: Not in scope (HR data sensitive — correct refusal)
```

### 2.11 WBS / Location Nodes

```text
WBSItem: 0 — hierarchy schema exists, zero data
ProjectLocationNode: 0 — spatial hierarchy ready, zero data
```

---

## 3. Domain Classification A/B/C/D/E

| Domain | Class | Records | AI Connected? |
| --- | --- | ---: | --- |
| Project Identity | **A** | 21 | ✓ |
| Project Schedule (endDate) | **A** | 7 with endDate | ✓ |
| Project Members | **A** | 18 | ✓ |
| HR / Employees | **A** (not AI-exposed) | 12/18/3/7 | N/A |
| Audit Trail | **A** (not AI-exposed) | 1,712 | N/A |
| System Settings | **A** | 1 | ✓ |
| Field Progress | **D** | 1 template, 0 items | ✓ (correct NO_DATA) |
| Site Reports | **D** | 0 | ✓ (correct NO_DATA) |
| WBS | **D** | 0 | N/A |
| Material Catalog | **D** | 0 | ✓ (correct NO_DATA) |
| Material Stock/Movement | **D** | 0 | ✓ (correct NO_DATA) |
| Material Proposals | **D** | 0 | N/A |
| Approval Requests | **D** | 0 | ✓ (correct NO_DATA) |
| Documents | **D** | 0 | N/A |
| Supervision (New) | **D** | 0 | N/A |
| Supervision (Legacy) | **D** | 0 | N/A |
| Safety Reporting | **D** | 0 | N/A |
| Location Nodes | **D** | 0 | N/A |
| Notifications | **D** | 0 | N/A |
| Field Material Requests | **D** | 0 | N/A |

```text
A — DATA EXISTS, AI USES CORRECTLY:     6 domains
B — DATA EXISTS, AI NOT CONNECTED:      0 domains
C — DATA EXISTS, QUALITY INSUFFICIENT:  0 domains
D — MODULE EXISTS, NO RECORDS:         14 domains
E — DOMAIN NOT IMPLEMENTED:             0 domains
```

> **Không có domain nào thuộc nhóm B.** AI đã nối đúng tất cả nguồn có data.

---

## 4. Business Rules Reused

| Rule | Dashboard | AI | Same? |
| --- | --- | --- | --- |
| Overdue days | `getDaysRemaining()` | `get_project_summary` L161 | ✓ Same |
| Actual progress | `calculateProjectActualProgress()` | **Imported from same module** | ✓ Exact same |
| Planned progress | `calculatePlannedProgress()` | Dashboard only | N/A |
| Health status | `getProgressHealth()` | Not in AI | Acceptable |
| Issue state | `deriveOperationalIssueState()` | Not in AI | Acceptable |

`get_project_summary` line 3:
```typescript
import { calculateProjectActualProgress } from "@/lib/dashboard/project-progress-aggregate";
```

---

## 5. AI Tools Corrected

```text
TOOLS REQUIRING CORRECTION: 0
All 5 tools correctly wired. Gate A already fixed P0 semantics.
```

---

## 6. Data Quality Contracts

**Project:** authoritative=Project table, freshness=updatedAt, flags=SOME_PROJECTS_MISSING_DEADLINE

**Progress:** authoritative=FieldProgressEntry(APPROVED), required=designQuantity>0, flags=NO_PROGRESS_ITEMS

**Reports:** authoritative=SiteReport+Lines, required=summary OR issues OR lines, flags=NO_FIELD_REPORTS

**Stock:** authoritative=ProjectMaterialStock (NOT catalog), required=stock>=0, flags=NO_MATERIAL_STOCK_DATA

---

## 7. Daily Briefing Before/After

No change. AI was already reading all available data correctly. The bottleneck is data entry, not wiring.

---

## 8. Golden-30 Before/After

```text
BEFORE:  13 PASS / 17 PARTIAL / 0 FAIL
AFTER:   13 PASS / 17 PARTIAL / 0 FAIL
REASON:  No new data source discovered. All 17 PARTIAL = BLOCKED_BY_DATA.
```

---

## 9. Key Discovery: SiteReport → FieldProgressEntry Pipeline

```text
SiteReport (APPROVED)
  └── SiteReportLine { quantityToday, progressPercent }
        ↓ report-progress-sync.ts
  FieldProgressEntry { sourceType='SITE_REPORT', quantity }
```

**Một nhật ký thi công = field report + progress data + issues cho AI.**

---

## 10. 13 Final Answers

1. **Progress data:** Không tồn tại. FieldProgressEntry=0. Source chính: SiteReportLine sync.
2. **WBS:** Không tồn tại. WBSItem=0.
3. **Site/weekly reports:** Không tồn tại. SiteReport=0, SupervisionWeeklyDossier=0.
4. **Material stock:** Không tồn tại. Toàn bộ chain=0.
5. **Pending workflows:** 12 approval types supported, 0 pending. AI covers 2/12 (declared).
6. **Safety/quality:** Không tồn tại. Module hoàn chỉnh, 0 data.
7. **Dashboard overdue:** `executive-action-service.ts` L104 → Project.endDate → daysRemaining<0. Same formula as AI.
8. **AI bỏ sót source:** **KHÔNG.** Đã verify toàn bộ schema/service.
9. **AI query sai source:** **KHÔNG.** Gate A fixed all P0s.
10. **Domain không có data:** 14 domains class D.
11. **User cần nhập:** Ưu tiên 1: Nhật ký thi công → auto-creates progress. Ưu tiên 2: Bảng khối lượng. Ưu tiên 3: Vật tư.
12. **Golden-30 sau audit:** 0 tăng (13 PASS giữ nguyên). Đúng — không có data mới.
13. **Blocker lớn nhất:** `BLOCKED_BY_OPERATIONAL_DATA` — quy trình vận hành chưa tạo data.

---

## 11. Final Verdict

```text
DATA INTELLIGENCE CLOSURE: COMPLETE

FINDING: Trường hợp B
  Dữ liệu nghiệp vụ thật sự chưa được nhập.
  AI không bỏ sót source nào.
  14 domains chờ operational data.
  6 domains đang work correctly.

NEXT STEP: Operator decides between:
  1. Start real ERP operations (site reports, progress, materials)
  2. Pilot with 1 project (CT-2026-0009) + real sample data

DO NOT: seed fake data, build RAG, add Write Agent, activate Gate B
```

**STOP.** Chờ Operator review.
