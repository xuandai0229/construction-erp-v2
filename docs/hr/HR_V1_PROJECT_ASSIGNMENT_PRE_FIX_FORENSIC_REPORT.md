# HR V1 — PROJECT ASSIGNMENT / ĐIỀU ĐỘNG CÔNG TRÌNH
# PRE-FIX FORENSIC AUDIT & DEFECT REGISTER REPORT

**Repository**: `D:\construction-erp-v2`  
**Audited Route**: `/hr/project-assignments`  
**Baseline SHA**: `f9ecef3a1f0e695423fe05cbddfc5d00916ebf2f`  
**Database**: `construction_erp_dev`  
**Environment**: `DEVELOPMENT / STAGING`  
**Working Tree**: `CLEAN`  

---

## 1. READ-ONLY DATABASE FORENSIC METRICS

| Metric Name | Value | Description / Status |
| :--- | :---: | :--- |
| `TOTAL_ASSIGNMENTS` | **15** | Total records in `EmployeeProjectAssignment` |
| `ACTIVE_ASSIGNMENTS` | **15** | All 15 records have `status = 'ACTIVE'` |
| `ENDED_ASSIGNMENTS` | **0** | `RELEASED` or `COMPLETED` records count |
| `FUTURE_ASSIGNMENTS` | **0** | Records with `startDate > today` |
| `OPEN_ENDED_ASSIGNMENTS` | **15** | Records with `expectedEndDate = null` |
| `DISTINCT_EMPLOYEES` | **13** | Unique employees assigned across projects |
| `DISTINCT_PROJECTS` | **3** | Active construction projects with assigned personnel |
| `MULTI_PROJECT_EMPLOYEES` | **2** | Employees with multiple active project assignments (Lý Thanh Hằng, Mai Xuân Thắng) |
| `OVERALLOCATED_EMPLOYEES` | **0** | Employees exceeding 100% total capacity |
| `PROJECT_PERSONNEL_ROLE_COUNT` | **3** | Total role records in `ProjectPersonnelRole` catalog |
| `TECHNICAL_ROLE_RECORDS` | **3** | Technical fixture roles with QA timestamp names (`ppr_*_HR_PHASE_*`) |
| `TECHNICAL_ASSIGNMENTS` | **15** | Assignments referencing QA fixture roles |
| `ORPHAN_ASSIGNMENTS` | **0** | Foreign key orphan check |

---

## 2. PRE-FIX DEFECT REGISTER

### DEFECT PA-01: Master Data QA Role Contamination
* **DEFECT_ID**: `PA-01`
* **SEVERITY**: `P1`
* **AREA**: Master Data / `ProjectPersonnelRole`
* **EXPECTED**: Standard construction ERP project roles ("Chỉ huy trưởng", "Giám sát trưởng", "Kỹ sư công trình", etc.).
* **ACTUAL**: Catalog contains 3 technical roles (`ppr_pm_HR_PHASE_4_5_3_1786066551066_fd2a9bcc`, etc.) titled `"Chỉ huy trưởng QA HR_PHASE_4_5_3_..."`.
* **DB_EVIDENCE**: `SELECT id, code, name FROM "ProjectPersonnelRole";` returned 3 records with `HR_PHASE_4_5_3` timestamp suffixes.
* **CODE_EVIDENCE**: `scripts/hr/seed-realistic-demo-data.ts` lines 210-231 reused existing active roles instead of seeding clean domain roles.
* **RUNTIME_EVIDENCE**: All 15 project assignment rows in `/hr/project-assignments` display role `"Chỉ huy trưởng QA HR_PHASE_4_5_3_1786066551066_fd2a9bcc"`.
* **ROOT_CAUSE**: Automated test script from Phase 4.5.3 created fixture roles in dev database; seed script step 3 skipped clean role creation because `findMany()` returned `length > 0`.
* **PROPOSED_FIX**: Create standard roles (`CHT`, `KSGS`, `CBAT`, `CBVT`), re-link all 15 active assignments transactionally to corresponding standard roles, and clean up the 3 technical fixture roles.
* **RISK**: Low (relational reference update within transaction).
* **STATUS**: `OPEN / P1`

---

### DEFECT PA-02: Source Organization Unit Historical Semantics Gap
* **DEFECT_ID**: `PA-02`
* **SEVERITY**: `P2`
* **AREA**: Schema & DTO / Historical Provenance
* **EXPECTED**: Table column `"Đơn vị nguồn"` displays the employee's department at the time of assignment creation.
* **ACTUAL**: UI displays employee's *current* primary department (`record.employee.orgAssignments[0]`). If employee transfers department, historical project assignment displays the *new* department.
* **DB_EVIDENCE**: `EmployeeProjectAssignment` table lacks `sourceOrgUnitId` or snapshot fields.
* **CODE_EVIDENCE**: `src/lib/hr/project-assignment-dto.ts` lines 80-81 dynamically resolves current primary unit.
* **RUNTIME_EVIDENCE**: Changing employee department in `/hr/organization` changes department name shown in past project assignments table.
* **ROOT_CAUSE**: Schema design did not snapshot `sourceOrgUnitId` or org unit details on `EmployeeProjectAssignment` creation.
* **PROPOSED_FIX**: Add additive nullable columns `sourceOrgUnitId`, `sourceOrgUnitCodeSnapshot`, `sourceOrgUnitNameSnapshot` to `EmployeeProjectAssignment`. Populate snapshot upon creation/transfer, and backfill existing data from `EmployeeOrganizationAssignment` active at  `startDate`.
* **RISK**: Low (additive migration, non-breaking).
* **STATUS**: `OPEN / P2`

---

### DEFECT PA-03: Open-Ended Assignment Action & Extend Validation Defect
* **DEFECT_ID**: `PA-03`
* **SEVERITY**: `P1`
* **AREA**: Workflow / State Machine / Validation
* **EXPECTED**:
  1. Open-ended assignments (`expectedEndDate = null`) should NOT display "Gia hạn điều động". They should display "Thiết lập ngày dự kiến kết thúc".
  2. For finite assignments, `newExpectedEndDate` MUST be strictly greater than existing `expectedEndDate`.
* **ACTUAL**:
  1. Open-ended assignments display "Gia hạn điều động" and set `expectedEndDate` upon save.
  2. For finite assignments, `extendProjectAssignment` in backend only checks `validateEffectiveDateRange(current.startDate, input.newExpectedEndDate)` without checking `newExpectedEndDate > current.expectedEndDate`.
* **DB_EVIDENCE**: `EmployeeProjectAssignment` table has `expectedEndDate` nullable.
* **CODE_EVIDENCE**: `src/components/hr/project-assignments/project-assignment-table.tsx` renders `<button onClick={onExtend}>Gia hạn điều động</button>` for all active assignments regardless of `expectedEndDate`. `src/lib/hr/project-assignment-service.ts` line 209 missing `gt(expectedEndDate)` validation.
* **RUNTIME_EVIDENCE**: Users can select an earlier date in "Gia hạn" modal and shorten the assignment duration.
* **ROOT_CAUSE**: Missing state-machine branching for `expectedEndDate == null` vs `!= null`, and missing comparison check against `current.expectedEndDate`.
* **PROPOSED_FIX**:
  1. Branch action menu: If `expectedEndDate == null`, render "Thiết lập ngày dự kiến kết thúc" (calls `setExpectedEndDateAction`). If `expectedEndDate != null`, render "Gia hạn điều động".
  2. Enforce `newExpectedEndDate > existingExpectedEndDate` in backend `extendProjectAssignment`.
* **RISK**: Low.
* **STATUS**: `OPEN / P1`

---

### DEFECT PA-04: Release Action EndReason Semantics
* **DEFECT_ID**: `PA-04`
* **SEVERITY**: `P2`
* **AREA**: Workflow / UI Semantics
* **EXPECTED**: Releasing an open-ended assignment (`expectedEndDate = null`) should not default to `EARLY_RELEASE` ("Rút nhân sự sớm trước dự kiến") because no expected end date existed.
* **ACTUAL**: `ReleaseAssignmentDialog` initializes `endReason` state to `EmployeeProjectAssignmentEndReason.EARLY_RELEASE`.
* **DB_EVIDENCE**: Enum `EmployeeProjectAssignmentEndReason` includes `COMPLETED`, `EARLY_RELEASE`, `PROJECT_TRANSFER`, `ROLE_TRANSFER`, `ALLOCATION_CHANGE`.
* **CODE_EVIDENCE**: `src/components/hr/project-assignments/release-assignment-dialog.tsx` line 26 hardcodes `EARLY_RELEASE` default state.
* **RUNTIME_EVIDENCE**: Clicking "Rút nhân sự" on any assignment defaults dropdown to "Rút nhân sự sớm trước dự kiến".
* **ROOT_CAUSE**: Hardcoded state initialization in UI dialog without inspecting assignment `expectedEndDate`.
* **PROPOSED_FIX**: Dynamically set default `endReason` to `COMPLETED` if `expectedEndDate == null`, or `EARLY_RELEASE` if `expectedEndDate != null` and `releaseDate < expectedEndDate`.
* **RISK**: Low.
* **STATUS**: `OPEN / P2`

---

### DEFECT PA-05: Create Assignment Form Decision Support & Allocation Preview
* **DEFECT_ID**: `PA-05`
* **SEVERITY**: `P2`
* **AREA**: UX / Decision Support
* **EXPECTED**: Selecting an employee in `CreateAssignmentDialog` shows a compact summary of employee's current department, position, active projects, current total allocation %, remaining capacity %, and live preview of new allocation total.
* **ACTUAL**: Combobox only shows employee code, name, and primary department. User cannot see current total allocation or remaining capacity until submission fails.
* **DB_EVIDENCE**: N/A
* **CODE_EVIDENCE**: `src/components/hr/project-assignments/create-assignment-dialog.tsx` lines 50-60 combo options only include static text.
* **RUNTIME_EVIDENCE**: User must guess or check another tab to see if employee has available capacity before assigning.
* **ROOT_CAUSE**: Employee form options array passed to dialog lacks active assignment summary data.
* **PROPOSED_FIX**: Enhance `AssignmentFormOptionEmployee` DTO to include `currentTotalAllocation`, `activeProjectCount`, `activeAssignmentsSummary`. Render decision support preview card in `CreateAssignmentDialog` when an employee is selected.
* **RISK**: Low.
* **STATUS**: `OPEN / P2`

---

### DEFECT PA-06: Date Format Presentation Inconsistency
* **DEFECT_ID**: `PA-06`
* **SEVERITY**: `P3`
* **AREA**: UI / Presentation
* **EXPECTED**: Human-readable Vietnamese date format `dd/MM/yyyy` throughout tables, drawers, dialog summaries, and timeline histories.
* **ACTUAL**: Table displays `YYYY-MM-DD` (e.g., `2026-05-09`).
* **DB_EVIDENCE**: Stored as UTC timestamp / date.
* **CODE_EVIDENCE**: `project-assignment-dto.ts` formats dates via `formatVietnamDateOnly` which returned `YYYY-MM-DD`.
* **RUNTIME_EVIDENCE**: Screen displays `2026-05-09` instead of `09/05/2026`.
* **ROOT_CAUSE**: `formatVietnamDateOnly` returned `YYYY-MM-DD` (ISO format).
* **PROPOSED_FIX**: Create `formatVietnamDisplayDate` helper returning `dd/MM/yyyy` for display layers while retaining ISO format `YYYY-MM-DD` for form input values and DTO serialization.
* **RISK**: Low.
* **STATUS**: `OPEN / P3`

---

### DEFECT PA-07: Project Name Readability & Truncation
* **DEFECT_ID**: `PA-07`
* **SEVERITY**: `P3`
* **AREA**: UX / Table Layout
* **EXPECTED**: Long project names (e.g., "Kế hoạch lựa chọn nhà thầu thực hiện nhiệm vụ quản lý bảo trì kết cấu hạ tầng giao thông đường bộ...") should be truncated to 2 lines (`line-clamp-2`) with hover tooltip showing full name and project code badge.
* **ACTUAL**: Uses single line `truncate` on `max-w-[180px]`, cutting off long project titles abruptly.
* **DB_EVIDENCE**: N/A
* **CODE_EVIDENCE**: `project-assignment-table.tsx` line 138 has `truncate max-w-[180px]`.
* **RUNTIME_EVIDENCE**: Project column renders "Kế hoạch lựa chọn nhà..." without clear hover details.
* **ROOT_CAUSE**: Rigid single-line truncation CSS class.
* **PROPOSED_FIX**: Replace `truncate` with `line-clamp-2 max-w-[220px] text-xs leading-snug`, show compact project code badge, and add title/popover tooltip.
* **RISK**: Low.
* **STATUS**: `OPEN / P3`

---

### DEFECT PA-08: Transfer / Role Change Modal Viewport Overflow
* **DEFECT_ID**: `PA-08`
* **SEVERITY**: `P2`
* **AREA**: UI / Modal Responsiveness
* **EXPECTED**: Modal fits within 1366x768 viewport without pushing primary submit buttons off-screen. Sticky footer and internal scrollable body.
* **ACTUAL**: Form container lacked max-height boundary relative to viewport height.
* **DB_EVIDENCE**: N/A
* **CODE_EVIDENCE**: `transfer-assignment-dialog.tsx` form container had `overflow-y-auto` but lacked explicit max-height cap for laptop viewports.
* **RUNTIME_EVIDENCE**: On 768px height screen, the footer buttons were pushed down requiring full dialog scroll.
* **ROOT_CAUSE**: Uncapped dialog body height in `HrDialogShell`.
* **PROPOSED_FIX**: Apply `max-h-[calc(85vh-80px)] overflow-y-auto` to dialog content body and ensure sticky footer.
* **RISK**: Low.
* **STATUS**: `OPEN / P2`

---

## 3. SUMMARY OF PRE-FIX AUDIT DEFECTS

* **P0 Defects**: `0`
* **P1 Defects**: `2` (`PA-01` Technical QA Role Contamination, `PA-03` Extend/Open-ended State Machine & Date Validation)
* **P2 Defects**: `4` (`PA-02` Source Org Snapshot, `PA-04` Release Reason Default, `PA-05` Allocation Decision Support, `PA-08` Modal Viewport Height)
* **P3 Defects**: `2` (`PA-06` Date Format Presentation, `PA-07` Project Name Readability)

---

## 4. PRE-FIX AUDIT VERDICT

```
TECHNICAL_ROLE_RECORDS: 3 (FAIL - P1)
TECHNICAL_ASSIGNMENTS: 15 (FAIL - P1)
SOURCE_ORG_HISTORICAL_SEMANTICS: SEMANTIC_MISMATCH (P2)
FINITE_EXTEND_VALIDATION: FAIL (P1)
OPEN_ENDED_ACTION_SEMANTICS: FAIL (P1)
RELEASE_REASON_SEMANTICS: SEMANTIC_WARNING (P2)
ALLOCATION_UI_DECISION_SUPPORT: INSUFFICIENT (P2)
ALLOCATION_ENGINE: PASS
ALLOCATION_OVERRIDE_RBAC_RUNTIME: PASS
DATE_FILTER_SEMANTICS: PASS
PROJECT_NAME_READABILITY: NEEDS_IMPROVEMENT (P3)
CHANGE_MODAL_SCROLL: NEEDS_IMPROVEMENT (P2)
ACTION_STATE_MATRIX: NEEDS_BRANCHING (P1)
HISTORY_RUNTIME: PASS
EXACT_DUPLICATE_ASSIGNMENTS: 0 (PASS)
UNEXPECTED_OVERLAPS: 0 (PASS)
HR_ASSIGNMENT_AUTO_PROJECTMEMBER: NO (PASS)
HR_ASSIGNMENT_AUTO_ACCESSGRANT: NO (PASS)
RBAC_RUNTIME: PASS
IDOR_RUNTIME: PASS
DB_INTEGRITY: PASS

STATUS: PRE-FIX FORENSIC REPORT COMPLETE — READY FOR PHASE B & PHASE C REMEDIATION
```
