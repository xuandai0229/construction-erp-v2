# HR V1 REPORTS — REMEDIATION & UX ACCEPTANCE REPORT

**Module**: HR Reports (`/hr/reports`)  
**Repository**: `d:\construction-erp-v2`  
**Baseline SHA**: `7173cbe71ac14178a9bbb3b80116100ac619c051`  
**Target Environment**: Dev / QA Runtime (`construction_erp_v2_dev`)  
**Report Date**: August 10, 2026  

---

## 1. SECURITY & CREDENTIAL STATUS

> [!IMPORTANT]
> Database credentials were previously printed in raw terminal logs during past audit cycles. No credentials or secrets are printed in this report.

| Security Check | Status | Details |
| :--- | :--- | :--- |
| **PREVIOUS_DB_CREDENTIALS_EXPOSED** | `YES` | Credentials appeared in past terminal logs |
| **CREDENTIAL_ROTATION_REQUIRED** | `YES` | Mandatory rotation flagged for production environment |
| **LOG_REDACTION_VERIFIED** | `YES` | Zero secrets or raw connection strings in audit output |

---

## 2. RUNTIME DATABASE & CANONICAL METRIC ALIGNMENT

```
Browser Next.js App ---> construction_erp_v2_dev (Port 5432)
Reporting Service  ---> construction_erp_v2_dev (Port 5432)
Audit Verification ---> construction_erp_v2_dev (Port 5432)
```

| Metric Scope | Direct DB Query | Reporting Service | Parity Status |
| :--- | :---: | :---: | :---: |
| **Overview Active Workforce** | 25 | 25 | **PASS** |
| **Employee List Active Workforce** | 25 | 25 | **PASS** |
| **HR Report Active Workforce** | 25 | 25 | **PASS** |

`CANONICAL_WORKFORCE_PARITY`: **PASS**

---

## 3. DEFECT RESOLUTION & AUDIT MATRIX

| Defect ID | Severity | Problem Description | Remediation Applied | Status |
| :--- | :---: | :--- | :--- | :---: |
| **DEF-REP-01** | **P0** | Detail table showed all historical records while KPIs counted active items only. | Refactored `getHrReportDetailsTable` to default to `status = ACTIVE` and current effective date scope. | **RESOLVED** |
| **DEF-REP-02** | **P1** | Project distribution displayed confusing raw allocation sums (e.g. `250%`). | Changed display to `X nhân sự · TB Y% phân bổ` using `averageAllocation`. | **RESOLVED** |
| **DEF-REP-03** | **P1** | Clicking role pills in "Unassigned" mode queried `projectRoleId` with `positionId`. | Differentiated unassigned role context; pill click now filters by `searchQuery` (position title). | **RESOLVED** |
| **DEF-REP-04** | **P1** | Long project names broke table cell widths on mobile/tablet viewports. | Applied `line-clamp-2`, fixed column max-widths, and popover tooltips. | **RESOLVED** |
| **DEF-REP-05** | **P2** | Hydration warning logged for `antigravity-scroll-lock`. | Re-verified clean browser runtime. Classified as test harness artifact. | **FALSE_POSITIVE** |
| **DEF-REP-06** | **P1** | Org Unit distribution counted assignment rows instead of distinct employees. | Updated `getHrReportCharts` to aggregate unique `Set<employeeId>` per Org Unit. | **RESOLVED** |

---

## 7. EXCEL EXPORT RUNTIME VERIFICATION (PHASE 13)

| Scenario | Test Case Description | Web Filter Count | Excel Row Count | Verification Status |
| :--- | :--- | :---: | :---: | :---: |
| **Scenario A** | Default / Current Report | 15 | 15 | **PASS** |
| **Scenario B** | Project Filter (`projectId`) | 6 | 6 | **PASS** |
| **Scenario C** | Unassigned KPI Filter (`kpiFilter=unassigned`) | 12 | 12 | **PASS** |
| **Scenario D** | Date Range Filter (`dateStart` / `dateEnd`) | 15 | 15 | **PASS** |

`EXCEL_EXPORT_VERIFICATION_RESULT`: **PASS**

---

## 5. UI/UX & INFORMATION ARCHITECTURE REDESIGN

1. **KPI Hierarchy (Phase 8)**:
   - **4 Primary Risk/Headcount Cards**: `Nhân sự tại công trình`, `Nhân sự chưa điều động`, `Sắp kết thúc trong 30 ngày`, `Vượt 100% phân bổ`.
   - **4 Secondary Compact Cards**: Operational metrics and clear available capacity indicators.
2. **Filter Simplification (Phase 9)**:
   - **4 Core Visible Filters**: Search input, Searchable Project Combobox, Assignment Status, Date Range.
   - **Collapsible Advanced Bar**: Org Unit & Project Role filters auto-expand when active.
3. **Analytics Focus (Phase 10)**:
   - **2 Main Charts**: `Phân bổ nhân sự theo công trình` (Average allocation %) and `Cơ cấu nhân sự theo đơn vị` (Distinct headcount).
   - **2 Compact Sub-panels**: Status breakdown & Role/Position drill-down pills.

---

## 6. FINAL ACCEPTANCE GATE

```
[✓] DB Runtime Parity: VERIFIED
[✓] Canonical Workforce Parity: PASS (25 = 25 = 25)
[✓] Defect Remediation: 100% RESOLVED / VERIFIED
[✓] Excel Export Parity: 100% PASS (4/4 Scenarios Match)
[✓] Layout & Responsiveness: 0 Horizontal Overflow
```

**FINAL_ACCEPTANCE_STATUS**: `PASS`  
**RELEASE_GATE**: `CLOSED`  
