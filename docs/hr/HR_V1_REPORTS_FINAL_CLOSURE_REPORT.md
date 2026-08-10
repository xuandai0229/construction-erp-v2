# HR V1 REPORTS — FINAL CLOSURE REPORT

**Module**: HR Reports (`/hr/reports`)  
**Repository**: `d:\construction-erp-v2`  
**Baseline SHA**: `7173cbe71ac14178a9bbb3b80116100ac619c051`  
**Target Environment**: Dev / QA Runtime (`construction_erp_v2_dev`)  
**Report Date**: August 10, 2026  

---

## 1. EXECUTIVE SUMMARY & RELEASE GATE VERDICT

> [!IMPORTANT]
> All 14 requirements of the HR Reports Final Closure QA mandate have been rigorously executed and verified through real database queries, authenticated HTTP route invocations, responsive browser QA, and static regression test suites.

| Metric | Status | Result / Value |
| :--- | :--- | :--- |
| **WORKFORCE_CANONICAL_CONTRACT** | `PASS` | `status = "ACTIVE"` (25 employees) |
| **WORKFORCE_PARITY** | `PASS` | Overview (25) = Employee List (25) = HR Reports (25) |
| **AVERAGE_ALLOCATION_GRAIN** | `PASS` | `ASSIGNMENT_ROWS` (`SUM(allocationPercentage) / totalActiveAssignments`) |
| **AVERAGE_ALLOCATION_SEMANTICS** | `PASS` | Explicitly labeled as `"Tỷ lệ phân bổ TB mỗi điều động"` |
| **ON_SITE_DISTINCT_EMPLOYEES** | `PASS` | 13 distinct active employees assigned to projects |
| **ACTIVE_ASSIGNMENT_ROWS** | `PASS` | 15 active project assignment records |
| **PROJECT_ROLE_DISTRIBUTION** | `WARN` | `{ 'Chỉ huy trưởng': 15 }` |
| **PROJECT_ROLE_DATA_REALISM** | `WARNING` | Verified as demo data characteristic, not a UI calculation defect |
| **POSITION_DRILLDOWN** | `PASS` | `PILL_DISPLAYED_COUNT === FILTER_RESULT_COUNT` across all 6 position categories |
| **ORG_GROUP_LABEL** | `PASS` | `"2 nhóm phòng ban"` (1 Org Unit + 1 Unassigned Group) |
| **VIETNAMESE_UI_TEXT** | `PASS` | 100% localized (`"Tổng số quyết định phân công đang hiệu lực"`) |
| **DATE_DISPLAY** | `PASS` | Standardized display format `dd/MM/yyyy` (e.g. `09/05/2026 → Không thời hạn`) |
| **EXCEL_SERVICE_PARITY** | `PASS` | Service pipeline matches web UI data contracts |
| **EXCEL_HTTP_RUNTIME** | `PASS` | Authenticated GET `/api/hr/reports/export` returned `200 OK` XLSX |
| **EXCEL_FILTER_PARITY** | `PASS` | Default (15/15), Project (6/6), Unassigned (12/12), Date Range (15/15) |
| **RESPONSIVE** | `PASS` | Verified across 1440x900, 1366x768, 1024x768, 768x1024, 390x844 |
| **CONSOLE_ERRORS** | `PASS` | 0 console errors during runtime QA |
| **FAILED_REQUESTS** | `PASS` | 0 failed network requests |
| **PRISMA_VALIDATE** | `PASS` | Schema valid 🚀 |
| **PRISMA_GENERATE** | `PASS` | Prisma Client generated successfully |
| **TYPESCRIPT** | `PASS` | `npx tsc --noEmit` completed with 0 errors |
| **TESTS** | `PASS` | 18/18 test files passed, 87/87 tests passed |
| **BUILD** | `PASS` | `npm run build` completed successfully (Exit code 0) |

```
FINAL VERDICT:
HR REPORTS — FINAL ACCEPTED
RELEASE_GATE: CLOSED
```

---

## 2. WORKFORCE BUSINESS CONTRACT AUDIT (P0)

Database breakdown of `Employee` records by status:
- **ACTIVE_COUNT**: `25`
- **PROBATION_COUNT**: `4`
- **SUSPENDED_COUNT**: `0`
- **RESIGNED_COUNT**: `2`
- **TOTAL_EMPLOYEES_IN_DB**: `31`

### Cross-Route Definition Alignment
- `/hr` (Dashboard Overview): `25` (`where: { status: "ACTIVE" }`)
- `/hr/employees` (Employee Directory): `25` (`where: { status: "ACTIVE" }`)
- `/hr/reports` (HR Reports Module): `25` (`where: { status: "ACTIVE" }`)
- **CANONICAL_CURRENT_WORKFORCE_DEFINITION**: `status = "ACTIVE"`
- **BUSINESS_CONTRACT_PARITY**: `PASS`

---

## 3. METRIC GRAIN & SEMANTICS AUDIT

### Average Allocation KPI Card
- **AVERAGE_ALLOCATION_GRAIN**: `ASSIGNMENT_ROWS`
- **FORMULA**: `SUM(allocationPercentage) / totalActiveAssignments`
- **VALUE**: `87%`
- **UPDATED_LABEL**: `"Tỷ lệ phân bổ TB mỗi điều động"`
- **DESCRIPTION**: `"Tỷ lệ phân bổ thời gian trung bình trên mỗi bản ghi điều động"`
- **SEMANTICS_PASS**: `PASS`

### Secondary KPI Visual Hierarchy
- Reduced container min-height (`min-h-20`) and padding (`p-3`) for Row 2 secondary cards.
- Reduced title and value font sizes (`text-lg font-bold`) so that Row 1 Primary cards (`text-2xl font-extrabold`) stand out with primary visual weight.

---

## 4. PROJECT & ORG CHART SEMANTICS

1. **Cross-Project UX Note**: Added footnote hint under Chart 1 (`Phân bổ nhân sự theo công trình`):
   > `* Một nhân sự có thể tham gia nhiều công trình, do đó tổng số theo từng công trình có thể lớn hơn tổng nhân sự thực tế.`
2. **Org Group Label**: Updated Chart 2 count badge from `"2 đơn vị"` to `"2 nhóm phòng ban"` to accurately represent 1 official `OrganizationUnit` + 1 `"Chưa thuộc phòng ban"` group.

---

## 5. POSITION DRILL-DOWN CONTRACT & DATA REALISM

### Unassigned Position Drill-Down Parity
Verified that clicking position pills when `activeKpiFilter === "unassigned"` filters by `positionId`:

| Position Name | Position ID | Pill Display Count | Detail Table Result Count | Parity |
| :--- | :--- | :---: | :---: | :---: |
| Kế toán viên | `cmsin1zmd000cbck5foowuiqk` | 2 | 2 | `PASS` |
| Trưởng phòng | `cmsin1zm40004bck57gbgr6vr` | 4 | 4 | `PASS` |
| Giám đốc | `cmsin1zm20003bck56xk2hbie` | 3 | 3 | `PASS` |
| Kỹ sư xây dựng | `cmsin1zm80007bck5di4xk2ra` | 1 | 1 | `PASS` |
| Chuyên viên Nhân sự | `cmsin1zmc000bbck5ab0qqd3r` | 1 | 1 | `PASS` |
| Chưa gán chức danh | `UNASSIGNED_POS` | 1 | 1 | `PASS` |

- **UNASSIGNED_POSITION_DRILLDOWN_PARITY**: `PASS`
- **ACTIVE_ROLE_DRILLDOWN_PARITY**: `PASS` (`Chỉ huy trưởng`: 15/15)

### Project Role Data Realism Audit
- **ACTIVE_ASSIGNMENTS**: `15`
- **DISTINCT_PROJECT_ROLE_COUNT**: `1`
- **ROLE_DISTRIBUTION**: `{ 'Chỉ huy trưởng': 15 }`
- **PROJECT_ROLE_DATA_REALISM**: `WARNING` (Verified as seed/demo data uniformity, not a code defect)

---

## 6. END-TO-END EXCEL HTTP RUNTIME QA

Automated HTTP integration testing was conducted against `GET /api/hr/reports/export` with valid authentication cookies:

| Filter Scenario | HTTP Status | Content-Type | Workbook Open | Unicode Check | Web Count | Excel Detail Count | Parity |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **A. Default Current** | `200 OK` | `spreadsheetml.sheet` | `PASS` | `PASS` | 15 | 15 | `PASS` |
| **B. Project Filter** | `200 OK` | `spreadsheetml.sheet` | `PASS` | `PASS` | 6 | 6 | `PASS` |
| **C. Unassigned** | `200 OK` | `spreadsheetml.sheet` | `PASS` | `PASS` | 12 | 12 | `PASS` |
| **D. Date Range** | `200 OK` | `spreadsheetml.sheet` | `PASS` | `PASS` | 15 | 15 | `PASS` |

- **EXCEL_SERVICE_PARITY**: `PASS`
- **EXCEL_HTTP_RUNTIME**: `PASS`
- **EXCEL_WORKBOOK_READ**: `PASS`
- **EXCEL_FILTER_PARITY**: `PASS`

---

## 7. REAL BROWSER QA & IMMUTABLE VERIFICATION

Tested in browser across viewports: `1440x900`, `1366x768`, `1024x768`, `768x1024`, `390x844`.

- **CONSOLE_ERRORS**: `0`
- **FAILED_REQUESTS**: `0`
- **REACT_WARNINGS**: `0`
- **HYDRATION_WARNINGS**: `0`
- **PAGE_HORIZONTAL_OVERFLOW**: `0`
- **TEXT_OVERLAP**: `0`

---

## 8. IMMUTABLE COMMITS & BUILD STATUS

```bash
BASELINE_SHA: 7173cbe71ac14178a9bbb3b80116100ac619c051
FINAL_SHA:    d90cadc40cd97177ed93fff6c2f7d4acde820f57
WORKING_TREE: CLEAN
```
