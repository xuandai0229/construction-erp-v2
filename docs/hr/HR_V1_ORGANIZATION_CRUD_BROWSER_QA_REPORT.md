# HR V1 — Organization & Position Real Browser CRUD Remediation Report

**Repository**: `D:\construction-erp-v2`  
**Current Status**: `HR ORGANIZATION CRUD — PASS`  
**Baseline SHA**: `f884fab7a0dcc5e7860d898815783afedaaf539d`  

---

## 1. Executive Summary & Root Cause Matrix

| Operational Component | Root Cause Identified | Remediation Implemented | Browser QA Verdict |
|---|---|---|---|
| **Unit Create** | `parentId` empty string (`""`) vs `null` type mismatch in form submission; searchParam `create=1` state desync. | Added `React.useEffect` form synchronization in `UnitFormDialog` and sanitized payload parameters before server action execution. | `PASS` |
| **Unit Edit** | State desync when switching between create/edit nodes in detail panel. | Added automatic input field resetting on dialog toggle and edit node target updates. | `PASS` |
| **Unit Deactivate** | Semantic visual bug using `Trash2` icon for soft deactivation instead of power status icon. | Replaced icon with `<PowerOff>` and preserved core unit lock protection for `BGD`, `PKT`, `KTTTC`. | `PASS` |
| **Unit Reactivate** | Missing UI reactivate workflow button in tree view detail panel for inactive nodes. | Integrated `reactivateOrgUnitAction` with `<RotateCcw>` icon in unit detail panel. | `PASS` |
| **Position Create** | Page header CTA included redundant `+` text alongside `<Plus>` icon (`[Plus Icon] + Thêm...`). | Removed `+` prefix from text (`DOUBLE_PLUS_COUNT=0`). | `PASS` |
| **Position Edit** | Modal field hydration desync on position re-edits. | Explicit state re-hydration handlers implemented for title/description update modal. | `PASS` |
| **Position Deactivate** | Semantic visual bug using `Trash2` icon for soft deactivation. | Replaced icon with `<PowerOff>` and verified backend `validatePositionDeactivation` active workforce guard. | `PASS` |
| **Position Reactivate** | Lack of visual reactivate action for deactivated position table rows. | Integrated `reactivatePositionAction` with `<RotateCcw>` icon button in position rows. | `PASS` |
| **Tree Selection Visibility** | Selected node detail panel remained visible for collapsed hidden sub-tree descendants. | Updated `toggleExpand` to detect descendant selection and automatically shift selection to ancestor node upon collapse. | `PASS` |

---

## 2. Invariants & Headcount Verification

```
CURRENT_WORKFORCE: 29
TREE_COMPANY_HEADCOUNT: 29
CHART_COMPANY_HEADCOUNT: 29

DIRECT_BGD: 4
DIRECT_HCNS: 4
DIRECT_KTTTC: 3
DIRECT_PKT: 14
DIRECT_ATCL: 4
SUBTREE_PKT: 18

DOUBLE_PLUS_COUNT: 0
QA_ORG_REMAINING: 0
QA_POSITION_REMAINING: 0
CONSOLE_ERRORS: 0
FAILED_REQUESTS: 0
PAGE_HORIZONTAL_OVERFLOW: 0
```

---

## 3. Position Drill-Down & Parity Table

| Position Code | Title | Active Workforce Count | Drill-Down Employee Filter | Status |
|---|---|---|---|---|
| `KT` | Trưởng Phòng Kỹ thuật | 0 | 0 | `PASS` |
| `GD` | Giám đốc | 3 | 3 | `PASS` |
| `TP` | Trưởng phòng | 5 | 5 | `PASS` |
| `CHT` | Chỉ huy trưởng công trình | 2 | 2 | `PASS` |
| `PCHT` | Phó Chỉ huy trưởng | 2 | 2 | `PASS` |
| `KSXD` | Kỹ sư xây dựng | 6 | 6 | `PASS` |
| `KSMEP` | Kỹ sư MEP | 2 | 2 | `PASS` |
| `KSAT` | Kỹ sư An toàn (HSE) | 3 | 3 | `PASS` |
| `QS` | Kỹ sư Đấu thầu & QS | 2 | 2 | `PASS` |
| `CVNS` | Chuyên viên Nhân sự | 2 | 2 | `PASS` |
| `KTV` | Kế toán viên | 2 | 2 | `PASS` |
