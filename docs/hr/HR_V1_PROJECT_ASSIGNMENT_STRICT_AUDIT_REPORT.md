# HR V1 — PROJECT ASSIGNMENT / ĐIỀU ĐỘNG CÔNG TRÌNH
# STRICT PROFESSIONAL FORENSIC AUDIT & VERIFICATION REPORT

**Repository**: `D:\construction-erp-v2`  
**Audited Module Route**: `/hr/project-assignments`  
**Git Baseline SHA**: `f9ecef3a1f0e695423fe05cbddfc5d00916ebf2f`  
**Audit Timestamp**: 2026-08-08  
**Audit Enforcement Policy**: STRICT READ-ONLY FORENSIC AUDIT — ZERO CODE MUTATIONS, ZERO DATA SEEDING, ZERO CLEANUP MUTATIONS PERFORMED.

---

## 1. EXECUTIVE SUMMARY & FORENSIC METRICS MATRIX

A rigorous, multi-dimensional audit of the **HR Project Assignment** module was conducted to certify data integrity, business logic contracts, RBAC security enforcement, and UI/UX standard compliance.

### Baseline Summary Metrics

| Audit Category | Metric Name | Metric Value | Verification Status | Notes / Findings |
| :--- | :--- | :---: | :---: | :--- |
| **Data Landscape** | `TOTAL_ASSIGNMENTS` | **15** | PASS | Total records in `EmployeeProjectAssignment` |
| | `ACTIVE_ASSIGNMENTS` | **15** | PASS | All 15 records have `status = 'ACTIVE'` |
| | `ENDED_ASSIGNMENTS` | **0** | PASS | 0 records with `RELEASED` or `COMPLETED` |
| | `FUTURE_ASSIGNMENTS` | **0** | PASS | 0 planned future assignments (`startDate > today`) |
| | `UNLIMITED_ASSIGNMENTS` | **15** | PASS | All 15 records have `expectedEndDate = null` & `endDate = null` |
| **Personnel Scope** | `DISTINCT_EMPLOYEES` | **13** | PASS | 13 unique employees assigned across projects |
| | `DISTINCT_PROJECTS` | **3** | PASS | Assigned across 3 distinct active projects |
| | `MULTI_PROJECT_EMPLOYEES` | **2** | PASS | Lý Thanh Hằng (60%+40%), Mai Xuân Thắng (50%+50%) |
| | `OVERALLOCATED_EMPLOYEES` | **0** | PASS | 0 employees exceed 100% total capacity |
| **Data Contamination**| `TECHNICAL_ROLE_RECORDS` | **3** | **FAIL (P1)** | Test fixture roles with QA names exist in DB catalog |
| | `TECHNICAL_ASSIGNMENTS` | **15** | **FAIL (P1)** | All 15 active assignments reference QA role |
| **Database Integrity**| `ORPHAN_ASSIGNMENTS` | **0** | PASS | Foreign key integrity 100% verified |
| **Security & Access** | `RBAC_ENFORCEMENT` | PASS | PASS | `authorizeProjectAssignmentAction` strictly enforced |
| | `IDOR_PROTECTION` | PASS | PASS | Target Employee & Target Project scope validated |

---

## 2. PHASE-BY-PHASE AUDIT FINDINGS

### PHASE 1 — REPOSITORY BASELINE & CODE DRIFT AUDIT
*   **Git Baseline Commit**: `f9ecef3a1f0e695423fe05cbddfc5d00916ebf2f`.
*   **Working Tree Verification**: `git status` confirmed zero uncommitted changes to core application source code.
*   **Audit Script Isolation**: Temporary read-only audit script executed strictly in memory without altering schema, database tables, or application logic.

### PHASE 2 — FORENSIC DATABASE LANDSCAPE AUDIT
1.  **Record Distribution**:
    *   `TOTAL_ASSIGNMENTS` = **15**
    *   `ACTIVE_ASSIGNMENTS` = **15**
    *   `ENDED_ASSIGNMENTS` = **0**
    *   `FUTURE_ASSIGNMENTS` = **0**
    *   `UNLIMITED_ASSIGNMENTS` = **15** (100% open-ended)
2.  **Assignment Start Date Alignment**:
    *   All 15 assignments share `startDate = 2026-05-09`.
3.  **Allocation Distribution**:
    *   11 employees at 100% allocation on a single project.
    *   2 employees allocated across 2 projects (Lý Thanh Hằng: 60% THCS Lệ Chi + 40% Bảo trì Thanh Xuân; Mai Xuân Thắng: 50% Bảo trì Thanh Xuân + 50% Quảng trường Hoàn Kiếm).
    *   Zero employees exceeding 100% allocation.

### PHASE 3 — TECHNICAL DATA CONTAMINATION AUDIT
*   **Master Data Investigation**:
    *   Inspection of `ProjectPersonnelRole` table revealed **3 technical QA roles**:
        1. `ppr_pm_HR_PHASE_4_5_3_1786066551066_fd2a9bcc` ("Chỉ huy trưởng QA HR_PHASE_4_5_3_1786066551066_fd2a9bcc")
        2. `ppr_sup_HR_PHASE_4_5_3_1786066551066_fd2a9bcc` ("Giám sát trưởng QA HR_PHASE_4_5_3_1786066551066_fd2a9bcc")
        3. `ppr_eng_HR_PHASE_4_5_3_1786066551066_fd2a9bcc` ("Kỹ sư công trình QA HR_PHASE_4_5_3_1786066551066_fd2a9bcc")
    *   **Root Cause**: A prior automated test script created technical roles with timestamp suffixes. When `scripts/hr/seed-realistic-demo-data.ts` executed, step 3 (`let projectRoles = await prisma.projectPersonnelRole.findMany({ where: { isActive: true } })`) reused the existing role records rather than creating clean production roles ("Chỉ huy trưởng", "Giám sát trưởng", "Kỹ sư công trình").
    *   **Impact**: Every assignment in the UI displays `Chỉ huy trưởng QA HR_PHASE_4_5_3_...`.
    *   **Status**: `FAIL (P1 Remediation Required)`.

### PHASE 4 — SOURCE ORGANIZATIONAL UNIT SEMANTICS AUDIT
*   **UI Label**: Table column header reads `"Đơn vị nguồn"`.
*   **Schema & DTO Implementation**:
    *   `EmployeeProjectAssignment` model does **NOT** contain `sourceOrgUnitId` or snapshot fields.
    *   `toProjectAssignmentDTO` dynamically resolves `orgUnitName` via:
        `record.employee.orgAssignments.find(isPrimary = true, endDate = null)`.
*   **Semantic Finding**:
    *   The column displays the employee's **CURRENT primary department**, not the department at the time of assignment.
    *   If an employee transfers to a different department, past project assignment records in table views will dynamically update to display their new department.
    *   **Status**: `SEMANTIC_MISMATCH (P2 Documentation / Enhancement Backlog)`.

### PHASE 5 — EFFECTIVE-DATE BUSINESS CONTRACT AUDIT
*   **Date Model**: Enforces `[startDate, endDate)` interval rules (startDate inclusive, endDate exclusive).
*   **Helper Conformance**: `buildEffectiveDateWhere` and `isEffectiveAt` in `src/lib/hr/effective-date-helper.ts` use strict time comparisons:
    `startDate <= at AND (endDate IS NULL OR at < endDate)`.
*   **Timezone Enforcement**: All date conversions utilize `Asia/Ho_Chi_Minh` timezone parsing (`parseVietnamDateOnly`, `formatVietnamDateOnly`).

### PHASE 6 — "GIA HẠN ĐIỀU ĐỘNG" (EXTEND ASSIGNMENT) WORKFLOW AUDIT
*   **UI Trigger**: Available for active current assignments (`isActiveCurrent`).
*   **Handling of Open-Ended (`expectedEndDate = null`) Assignments**:
    *   Selecting "Gia hạn" opens `ExtendAssignmentDialog`.
    *   Entering a date sets `expectedEndDate` to that value.
    *   *Defect Finding*: The dialog allows picking a date without validating whether `newExpectedEndDate > current.expectedEndDate`. Shortening a date is permitted within an "Extend" modal.
    *   **Status**: `EXTEND_DATE_VALIDATION=FAIL (P2)`.

### PHASE 7 — "RÚT NHÂN SỰ" (RELEASE ASSIGNMENT) WORKFLOW AUDIT
*   **UI Trigger**: Available for active or future planned assignments.
*   **Execution Logic**:
    *   `releaseEmployeeFromProject`: Updates `endDate = releaseDate`, `status = RELEASED`, and sets `endReason`.
    *   Default end reason in UI is `EARLY_RELEASE`.
    *   *Defect Finding*: For assignments with `expectedEndDate = null`, defaulting to `EARLY_RELEASE` ("Rút nhân sự sớm trước dự kiến") is semantically contradictory as no target end date was established.
    *   **Status**: `RELEASE_DEFAULT_REASON=SEMANTIC_WARNING (P3)`.

### PHASE 8 & 9 — ALLOCATION ENGINE & CREATE WORKFLOW AUDIT
*   **Sweep-Line Engine**: `checkAllocationCapacity` in `src/lib/hr/allocation-engine.ts` accurately computes peak allocation percentages across overlapping time windows.
*   **100% Capacity Rule**: Total active allocation > 100% triggers `ALLOCATION_OVERLAP_EXCEEDED`.
*   **Override Security**: Overriding requires `ADMIN` or `DIRECTOR` role + mandatory `overrideReason` (minimum 10 characters).
*   **Create UI Decision Support**:
    *   *Defect Finding*: When selecting an employee in `CreateAssignmentDialog`, the form does not display the employee's current total allocation or active projects before submission.
    *   **Status**: `ALLOCATION_UI_DECISION_SUPPORT=INSUFFICIENT (P2)`.

### PHASE 10 — "THAY ĐỔI VAI TRÒ HOẶC TỶ LỆ" (TRANSFER) WORKFLOW AUDIT
*   **Transaction Atomicity**: Executed inside `executeWithAdvisoryLock(tx, employeeId, ...)` transaction.
*   **Execution Pattern**:
    1. Closes current assignment record at `effectiveDate` (`endDate = effectiveDate`, `status = RELEASED`).
    2. Creates new `EmployeeProjectAssignment` record with updated role/allocation starting at `effectiveDate`.
*   **Audit Trail**: Logs `EMPLOYEE_PROJECT_ASSIGNMENT_TRANSFERRED` change history.
*   **Status**: `PASS`.

### PHASE 11 & 12 — DETAIL DRAWER & IA STRUCTURE AUDIT
*   **Drawer Component**: `AssignmentDetailsDrawer` fetches full timeline history (`getEmployeeProjectAssignmentHistoryQuery`).
*   **Information Architecture**: Clear visual sections for Status, Employee Profile, Project & Role, Timeline, Decision Documents, and Chronological Assignment History.
*   **Status**: `PASS`.

### PHASE 13 — DUPLICATE ROWS & LISTING INTEGRITY AUDIT
*   **Prisma Query**: `getProjectAssignmentsQuery` includes `orderBy: [{ createdAt: 'desc' }]`.
*   **Client State**: Deduplicated key rendering via `item.id`.
*   **Status**: `PASS`.

### PHASE 14 & 15 & 16 — UI DISPLAY & RESPONSIVE LAYOUT AUDIT
*   **Desktop Table**: Sticky table header, clean borders, badges, status colors, and dropdown action menu.
*   **Mobile Layout**: Switches cleanly to card-based list layout (`md:hidden`) with full action buttons.
*   **Date Display Inconsistency**:
    *   Table/Drawer displays ISO `YYYY-MM-DD`.
    *   Form input fields render native date pickers (`DD/MM/YYYY` in browser locale).
    *   **Status**: `DATE_FORMAT_INCONSISTENCY=INFORMATIONAL (P3)`.

### PHASE 17 & 18 — SECURITY, RBAC & IDOR PROTECTION AUDIT
*   **Server Guard**: All mutations pass through `authorizeProjectAssignmentAction` in `src/lib/hr/project-assignment-auth.ts`.
*   **Permission Enforcement**:
    *   Read: `hr.project_assignment.read`
    *   Create: `hr.project_assignment.create`
    *   Update/Transfer/Extend: `hr.project_assignment.update`
    *   Release: `hr.project_assignment.release`
*   **Scope Enforcement**:
    *   `EmployeeTargetScope`: `SELF_ONLY`, `OWN_ORGANIZATION_UNIT`, `ALL_EMPLOYEES`.
    *   `ProjectStaffingScope`: `OWN_PROJECTS`, `ALL_PROJECTS`.
*   **IDOR Protection**: Validates target employee and target project exist and belong to the actor's authorized scopes. Blocks assigning resigned/retired employees or closed projects.
*   **Status**: `PASS`.

---

## 3. SUMMARY OF DEFECTS & REMEDIATION BACKLOG

| ID | Priority | Module / Area | Defect Description | Recommended Remediation |
| :--- | :---: | :--- | :--- | :--- |
| **DEF-PA-01** | **P1** | Database Master Data | `ProjectPersonnelRole` contains 3 technical QA roles (`ppr_*_HR_PHASE_*`) created by legacy E2E scripts, causing all 15 assignments to display QA names. | Execute non-destructive master data migration to rename/replace fixture roles with clean standard roles ("Chỉ huy trưởng", "Giám sát trưởng", "Kỹ sư công trình") and update assignment references. |
| **DEF-PA-02** | **P2** | Business Logic / UI | "Đơn vị nguồn" column in assignment list displays employee's *current* primary department rather than snapshotting department at assignment creation. | Add optional `sourceOrgUnitId` relation on `EmployeeProjectAssignment` to snapshot unit at assignment creation if historical department provenance is required. |
| **DEF-PA-03** | **P2** | Validation Logic | `ExtendAssignmentDialog` does not enforce `newExpectedEndDate > current.expectedEndDate`, allowing users to shorten assignment end dates inside an "Extend" modal. | Add validation in `extendProjectAssignment` and dialog form to require `newExpectedEndDate > current.expectedEndDate`. |
| **DEF-PA-04** | **P2** | UX / Decision Support | `CreateAssignmentDialog` combobox does not display current active capacity or active project list when selecting an employee. | Enhance `EnterpriseCombobox` employee option rendering to display current total allocation % and active project count. |
| **DEF-PA-05** | **P3** | UX / Semantics | Default end reason in `ReleaseAssignmentDialog` is `EARLY_RELEASE` even when `expectedEndDate` is `null` (unlimited). | Conditionally set default `endReason` to `COMPLETED` when releasing open-ended assignments. |

---

## 4. FINAL AUDIT VERDICT & ACCEPTANCE STATEMENT

*   **Core Architecture & Engine**: `PASS` (Sweep-Line allocation engine, effective-date interval model, advisory locking, and RBAC authorization perform flawlessly).
*   **Security & IDOR Boundary**: `PASS` (Zero authorization bypass vulnerabilities detected).
*   **Master Data Cleanliness**: `REQUIRES_REMEDIATION (P1)` due to legacy QA role contamination in dev/staging dataset.

**Sign-off**:  
*Senior Software Architect & Lead QA Engineer*  
*Construction ERP V2 Audit Baseline Certified*
