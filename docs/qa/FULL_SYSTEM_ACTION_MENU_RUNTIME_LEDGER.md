# FULL SYSTEM ACTION MENU RUNTIME LEDGER

**Date:** 2026-08-11  
**Phase:** B — Full System Runtime Action Menu Re-Audit  

---

## Action Surface Inventory

| # | Route | Component | Menu Type | Desktop/Mobile Split | Controlled State | Duplicate Risk | Menu Test |
|---|-------|-----------|-----------|---------------------|-----------------|----------------|-----------|
| 1 | /reports/weekly-inspection | weekly-list-client.tsx | UnifiedActionMenu (children) | YES (sm breakpoint) | Separate (FIXED) | FIXED | RUNTIME PASS |
| 2 | /projects | project-list-client.tsx | UnifiedActionMenu (items) | YES (lg breakpoint) | Desktop only | NONE | SOURCE PASS |
| 3 | /users | user-management-client.tsx | UnifiedActionMenu (items) | YES (lg breakpoint) | Desktop only | NONE | SOURCE PASS |
| 4 | /reports/field | reports-table.tsx | UnifiedActionMenu (items) | NO (single view) | N/A | NONE | SOURCE PASS |
| 5 | /reports/safety | safety-list-client.tsx | SafetyRowActionPortalMenu | YES (sm breakpoint) | Each independent | NONE | SOURCE PASS |
| 6 | /reports/safety/weekly-files/[id] | safety-weekly-file-workspace.tsx | UnifiedActionMenu x2 | NO (plan + assessment) | Independent | NONE | SOURCE PASS |
| 7 | /materials (catalog) | materials-ui.tsx | MaterialRowActionMenu | NO | Uncontrolled | NONE | SOURCE PASS |
| 8 | /materials (proposals) | material-proposal-list.tsx | UnifiedActionMenu | NO | Per-instance | NONE | SOURCE PASS |
| 9 | /hr/employees | employee-data-table.tsx | UnifiedActionMenu | YES (lg breakpoint) | Desktop only | NONE | SOURCE PASS |
| 10 | /hr/organization/positions | position-management-client.tsx | UnifiedActionMenu | NO | Per-instance | NONE | SOURCE PASS |
| 11 | /hr/organization/managers | unit-manager-management-client.tsx | UnifiedActionMenu | NO | Per-instance | NONE | SOURCE PASS |
| 12 | /hr/project-assignments | project-assignment-table.tsx | UnifiedActionMenu | NO | Controlled | NONE | SOURCE PASS |
| 13 | Layout header | header.tsx | UnifiedActionMenu | NO | N/A (user menu) | NONE | N/A |
| 14 | Weekly edit (row actions) | row-action-menu.tsx | UnifiedActionMenu (items) | NO | Per-instance | NONE | SOURCE PASS |
| 15 | Safety row actions | safety-row-action-menu.tsx | UnifiedActionMenu (items) | NO | Per-instance | NONE | SOURCE PASS |
| 16 | Safety portal menu | safety-row-action-portal-menu.tsx | UnifiedActionMenu (items) | NO | Per-instance | NONE | SOURCE PASS |
| 17 | Documents workspace | document-workspace.tsx | Custom context menu | NO | Custom | N/A (not UnifiedActionMenu) | SOURCE PASS |

---

## Route Load Tests

| # | Route | Load | Has Action Menu | Notes |
|---|-------|------|-----------------|-------|
| 1 | /dashboard | PASS | NO | KPI dashboard, no record actions |
| 2 | /projects | PASS | YES | Table with ⋯ menus (desktop), cards with links (mobile) |
| 3 | /projects/[id] | PASS | YES | Project detail with custom context menu |
| 4 | /documents | PASS | NO | Document workspace with custom context menu |
| 5 | /reports | PASS | NO | Reports workspace picker |
| 6 | /reports/weekly-inspection | PASS | YES | RUNTIME VERIFIED — 1 menu only after fix |
| 7 | /reports/field | PASS | YES | reports-table.tsx single view |
| 8 | /reports/safety | PASS | YES | SafetyRowActionPortalMenu |
| 9 | /materials | PASS | YES | Tab-based with MaterialRowActionMenu |
| 10 | /approvals | PASS | NO | Approval workflow, no record-level action menus |
| 11 | /users | PASS | YES | Desktop UnifiedActionMenu, mobile direct buttons |
| 12 | /settings | PASS | NO | Settings page |
| 13 | /hr | PASS | NO | HR dashboard |
| 14 | /hr/employees | PASS | YES | Desktop UnifiedActionMenu, mobile Link buttons |
| 15 | /hr/organization | PASS | NO | Organization landing |
| 16 | /hr/organization/units | PASS | NO | Org units management |
| 17 | /hr/organization/positions | PASS | YES | UnifiedActionMenu per position |
| 18 | /hr/organization/managers | PASS | YES | UnifiedActionMenu per manager |
| 19 | /hr/organization/chart | PASS | NO | Org chart visualization |
| 20 | /hr/project-assignments | PASS | YES | UnifiedActionMenu per assignment |
| 21 | /hr/reports | PASS | NO | HR reports |

---

## Duplicate Risk Classification

### Category A: Record-Level Secondary Action — STANDARDIZED
All 16 action surfaces use UnifiedActionMenu with Portal rendering, pointer, and overlay management.

### Category B: Primary Page Action (CREATE/SAVE) — KEPT
- Tạo hồ sơ tuần mới (weekly-inspection)
- Tạo hồ sơ ATLĐ (safety)
- Thêm tài khoản (users)
- Thêm nhân viên (hr/employees)

### Category C: Input Popover/Combobox — NOT ACTION MENU
- ProjectPopoverPortal (weekly-list-client.tsx)
- ProjectAssignmentCell hover tooltip (employee-data-table.tsx)
- Global project context switcher (header)

### Category D: Navigation Menu — OUT OF SCOPE
- Sidebar navigation
- Tab navigation (Materials, HR)

### Category E: Mobile Representation — STANDARDIZED
- weekly-list-client.tsx: Fixed (separate state)
- Others: Mobile uses Link buttons or independent menus

---

## Summary Counts

| Metric | Count |
|--------|-------|
| Total action surfaces identified | 17 |
| Using UnifiedActionMenu | 16 |
| Custom context menu | 1 (documents) |
| Desktop/Mobile split with menu | 5 |
| Duplicate risk PROVEN | 1 (weekly-inspection) |
| Duplicate risk FIXED | 1 (weekly-inspection) |
| Duplicate risk remaining | 0 |
