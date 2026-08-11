# FULL SYSTEM ACTION MENU DUPLICATE REGISTER

**Date:** 2026-08-11  
**Phase:** B — Full System Runtime Action Menu Re-Audit  

---

## Duplicate Detection Methodology

For each component containing UnifiedActionMenu:

1. Check if desktop/mobile responsive branches exist
2. If YES: check if both branches render UnifiedActionMenu 
3. If YES: check if they share the same controlled `open` state
4. If YES: **PROVEN DUPLICATE** (Portal escapes display:none)

---

## Component-Level Analysis

### 1. weekly-list-client.tsx — PROVEN → FIXED

| Property | Value |
|----------|-------|
| Desktop branch | `hidden sm:block` (line 709) |
| Mobile branch | `block sm:hidden` (line 962) |
| Desktop menu | UnifiedActionMenu at line 848 |
| Mobile menu | UnifiedActionMenu at line 1014 |
| Shared state (before fix) | `activeActionRowId` |
| Root cause | Both `open={activeActionRowId === row.id}`, Portal escapes `display:none` |
| Fix | Split into `desktopActiveRowId` and `mobileActiveRowId` |
| Duplicate Risk | **PROVEN → FIXED** |

### 2. project-list-client.tsx — NONE

| Property | Value |
|----------|-------|
| Desktop branch | `hidden lg:block` (line 56) |
| Mobile branch | `lg:hidden` (line 184) |
| Desktop menu | UnifiedActionMenu at line 138 |
| Mobile menu | **NONE** — uses Link buttons only |
| Duplicate Risk | **NONE** |

### 3. user-management-client.tsx — NONE

| Property | Value |
|----------|-------|
| Desktop branch | `hidden lg:block` (line 664) |
| Mobile branch | `lg:hidden` (line 901) |
| Desktop menu | UnifiedActionMenu at line 812 |
| Mobile menu | **NONE** — uses direct buttons (Xem, Sửa, Gán CT) |
| Duplicate Risk | **NONE** |

### 4. reports-table.tsx — NONE

| Property | Value |
|----------|-------|
| Desktop/Mobile split | NO — single table view |
| Menu | UnifiedActionMenu at line 267 |
| Duplicate Risk | **NONE** |

### 5. safety-list-client.tsx — NONE

| Property | Value |
|----------|-------|
| Desktop branch | `hidden sm:block` (line 373) |
| Mobile branch | `block sm:hidden` (line 534) |
| Desktop menu | SafetyRowActionPortalMenu (uncontrolled) |
| Mobile menu | SafetyRowActionPortalMenu (uncontrolled, independent instance) |
| Shared controlled state | NO — each instance manages own state |
| Duplicate Risk | **NONE** |

### 6. employee-data-table.tsx — NONE

| Property | Value |
|----------|-------|
| Desktop branch | `hidden lg:block` (line 311) |
| Mobile branch | `lg:hidden` (line 482) |
| Desktop menu | UnifiedActionMenu at line 439 (uncontrolled) |
| Mobile menu | **NONE** — uses Link button only |
| Duplicate Risk | **NONE** |

### 7. safety-weekly-file-workspace.tsx — NONE

| Property | Value |
|----------|-------|
| Has two UnifiedActionMenu | YES (plan + assessment) |
| Same record? | NO — different data sections |
| Duplicate Risk | **NONE** |

### 8. All other components (materials-ui.tsx, position-management-client.tsx, unit-manager-management-client.tsx, project-assignment-table.tsx, row-action-menu.tsx, safety-row-action-menu.tsx, safety-row-action-portal-menu.tsx) — NONE

Each uses UnifiedActionMenu as independent per-row instances with no desktop/mobile branch conflict.

---

## Static Detector Summary

| Component | Responsive Split | Both Branches Have Menu | Shared Controlled State | Duplicate Risk |
|-----------|-----------------|------------------------|------------------------|----------------|
| weekly-list-client.tsx | YES | YES | WAS YES → NOW FIXED | PROVEN → FIXED |
| project-list-client.tsx | YES | NO | N/A | NONE |
| user-management-client.tsx | YES | NO | N/A | NONE |
| reports-table.tsx | NO | N/A | N/A | NONE |
| safety-list-client.tsx | YES | YES (but uncontrolled) | NO | NONE |
| employee-data-table.tsx | YES | NO | N/A | NONE |
| All others | NO | N/A | N/A | NONE |

---

## Conclusion

- **1 duplicate menu bug found** (weekly-list-client.tsx)
- **1 duplicate menu bug fixed** (separate desktop/mobile open state)
- **0 remaining duplicate risks** in the system
