# HR V1 — Organization & Position Final Functional QA Report

**Repository**: `D:\construction-erp-v2`  
**Certification Status**: `PASS`  
**Baseline SHA**: `f9e813f1de4364576f87db5b52b63ba2d25cf3c0`  

---

## 1. Executive Summary & Verification Matrix

| Metric / Guard | Contract / Standard | Actual Result | Status |
|---|---|---|---|
| `CURRENT_WORKFORCE` | Active + Probation employees | `29` | `PASS` |
| `TREE_COMPANY_HEADCOUNT` | Total unique workforce | `29` | `PASS` |
| `CHART_COMPANY_HEADCOUNT` | Shared recursive total | `29` | `PASS` |
| `HEADCOUNT_PARITY` | `TREE == CHART == WORKFORCE` | `PASS` | `PASS` |
| `DIRECT_UNIT_SUM` | Sum of direct unit headcounts | `29` | `PASS` |
| `POSITION_COUNT_PARITY_FAILURES` | `TABLE_COUNT == FILTER_COUNT` | `0` | `PASS` |
| `POSITION_HEADCOUNT_CLICK` | Drill-down link via `positionId` | `PASS` | `PASS` |
| `ZERO_POSITION_COUNT_UX` | Non-interactive text for `0 NV` | `PASS` | `PASS` |
| `CREATE_UNIT_RUNTIME` | UI/Action unit creation | `PASS` | `PASS` |
| `EDIT_UNIT_RUNTIME` | UI/Action unit update | `PASS` | `PASS` |
| `DEACTIVATE_UNIT_RUNTIME` | Deactivate 0-workforce unit | `PASS` | `PASS` |
| `REACTIVATE_UNIT_RUNTIME` | Reactivate inactive unit | `PASS` | `PASS` |
| `CORE_UNIT_PROTECTION` | Backend guard for `BGD`, `PKT`, `KTTTC` | `PASS` | `PASS` |
| `CREATE_POSITION_RUNTIME` | UI/Action position creation | `PASS` | `PASS` |
| `EDIT_POSITION_RUNTIME` | UI/Action position update | `PASS` | `PASS` |
| `DEACTIVATE_POSITION_RUNTIME` | Deactivate 0-workforce position | `PASS` | `PASS` |
| `REACTIVATE_POSITION_RUNTIME` | Reactivate inactive position | `PASS` | `PASS` |
| `ACTIVE_POSITION_PROTECTION` | Block position deactivation if >0 NV | `PASS` | `PASS` |
| `NO_HARD_DELETE` | Preserve historical records | `PASS` | `PASS` |

---

## 2. Headcount Invariants & Breakdown

```
CURRENT_WORKFORCE: 29
TREE_COMPANY_HEADCOUNT: 29
CHART_COMPANY_HEADCOUNT: 29

DIRECT_BGD: 4
DIRECT_HCNS: 4
DIRECT_KTTTC: 3
DIRECT_PKT: 14
DIRECT_ATCL: 4

DIRECT_UNIT_SUM: 29
SUBTREE_PKT: 18 (PKT 14 + ATCL 4)
```

---

## 3. Position Drill-Down & Count Parity Table

| Position Code | Title | Table Count | Employee Filter Result | Status | Link Interaction |
|---|---|---|---|---|---|
| `KT` | Trưởng Phòng Kỹ thuật | 0 NV | 0 | `PASS` | Non-interactive text (`0 nhân sự`) |
| `GD` | Giám đốc | 3 NV | 3 | `PASS` | Clickable link (`/hr/employees?positionId=...`) |
| `TP` | Trưởng phòng | 5 NV | 5 | `PASS` | Clickable link (`/hr/employees?positionId=...`) |
| `CHT` | Chỉ huy trưởng công trình | 2 NV | 2 | `PASS` | Clickable link (`/hr/employees?positionId=...`) |
| `PCHT` | Phó Chỉ huy trưởng | 2 NV | 2 | `PASS` | Clickable link (`/hr/employees?positionId=...`) |
| `KSXD` | Kỹ sư xây dựng | 6 NV | 6 | `PASS` | Clickable link (`/hr/employees?positionId=...`) |
| `KSMEP` | Kỹ sư MEP | 2 NV | 2 | `PASS` | Clickable link (`/hr/employees?positionId=...`) |
| `KSAT` | Kỹ sư An toàn (HSE) | 3 NV | 3 | `PASS` | Clickable link (`/hr/employees?positionId=...`) |
| `QS` | Kỹ sư Đấu thầu & QS | 2 NV | 2 | `PASS` | Clickable link (`/hr/employees?positionId=...`) |
| `CVNS` | Chuyên viên Nhân sự | 2 NV | 2 | `PASS` | Clickable link (`/hr/employees?positionId=...`) |
| `KTV` | Kế toán viên | 2 NV | 2 | `PASS` | Clickable link (`/hr/employees?positionId=...`) |
