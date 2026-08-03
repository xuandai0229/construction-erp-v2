# FULL SYSTEM OVERLAY INTERACTION INVENTORY

**Repository**: `construction-erp-v2`  
**Date**: August 1, 2026  
**Scope**: Full System Non-Modal & Modal Floating Surface Audit

---

## 1. Floating Surface Hierarchy & Z-Index Scale

To prevent arbitrary `z-[9999]` conflicts, the platform uses a standardized semantic z-index hierarchy configured in `globals.css`:

```
Page Content (z-0)
  └─ Sticky Table Headers (z-10)
      └─ Sticky Headers / Navbars (z-40)
          └─ Non-Modal Dropdowns (z-50)
              └─ Non-Modal Popovers (z-55)
                  └─ Tooltips & Overflow Text (z-60)
                      └─ App Drawers (z-80)
                          └─ Modals & Dialogs (z-100)
                              └─ Toasts & Notifications (z-110)
```

---

## 2. Complete Inventory Table

| Route / Module | Component | Surface Type | Render Target | Outside Dismissal | Escape Listener | Viewport Collision | Z-Index Layer | Mobile Surface | Compliance Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Global Header** | `GlobalProjectContextSwitcher` | Context Combobox | React Portal (`document.body`) | Pointerdown (Capture) | Yes | Viewport Reposition | `z-dropdown` (50) | Bottom Sheet Sheet | `PASS` |
| **Global Header** | `GlobalSearchCommand` | Search Command Palette | React Portal (`document.body`) | Pointerdown (Capture) | Yes | Centered Modal | `z-dialog` (100) | Mobile Fullscreen | `PASS` |
| **Global Header** | `NotificationsPanel` | Notification Dropdown | React Portal (`document.body`) | Pointerdown (Capture) | Yes | Right Alignment | `z-popover` (55) | Full Width Dropdown | `PASS` |
| **Global Header** | `UserNavMenu` | User Account Dropdown | React Portal (`document.body`) | Pointerdown (Capture) | Yes | Right Alignment | `z-dropdown` (50) | Full Width Dropdown | `PASS` |
| **`/users`** | `AssignedProjectsPopover` | Projects Popover | Relative / Portal | Pointerdown (Capture) | Yes | Internal Scroll / Flip | `z-popover` (55) | Expanded Card | `PASS` |
| **`/users`** | `UserActionsMenu` | Row Action Menu | Relative / Portal | Pointerdown (Capture) | Yes | Shift Top/Bottom | `z-dropdown` (50) | Card Action Bar | `PASS` |
| **`/users`** | `CreateUserModal` | Form Dialog | Fixed Backdrop | Backdrop Click | Yes | Centered Viewport | `z-dialog` (100) | Fullscreen Modal | `PASS` |
| **`/users`** | `EditUserModal` | Form Dialog | Fixed Backdrop | Backdrop Click | Yes | Centered Viewport | `z-dialog` (100) | Fullscreen Modal | `PASS` |
| **`/users`** | `UserDetailDrawer` | Detail Drawer | Fixed Slide Right | Backdrop Click | Yes | Right Viewport | `z-drawer` (80) | Fullscreen Drawer | `PASS` |
| **`/projects`** | `ProjectActionMenu` | Row Action Menu | Relative / Portal | Pointerdown (Capture) | Yes | Shift Top/Bottom | `z-dropdown` (50) | Card Action Bar | `PASS` |
| **`/supervision/weekly`** | `WeeklyReportActionMenu` | Action Menu | Relative / Portal | Pointerdown (Capture) | Yes | Shift Top/Bottom | `z-dropdown` (50) | Card Action Bar | `PASS` |
| **`/reports/safety`** | `SafetyReportActionMenu` | Action Menu | Relative / Portal | Pointerdown (Capture) | Yes | Shift Top/Bottom | `z-dropdown` (50) | Card Action Bar | `PASS` |
| **Shared UI** | `EnterpriseCombobox` | Searchable Combobox | Relative / Portal | Pointerdown (Capture) | Yes | Flip Top/Bottom | `z-dropdown` (50) | Bottom Sheet | `PASS` |
| **Shared UI** | `EditableCombobox` | Free-text Combobox | Relative / Portal | Pointerdown (Capture) | Yes | Flip Top/Bottom | `z-dropdown` (50) | Bottom Sheet | `PASS` |
| **Shared UI** | `UnifiedActionMenu` | Generic Action Menu | Relative / Portal | Pointerdown (Capture) | Yes | Viewport Shift | `z-dropdown` (50) | Action Sheet | `PASS` |
| **Shared UI** | `ConfirmDialog` | Confirmation Dialog | Fixed Backdrop | Backdrop Click | Yes | Centered Viewport | `z-dialog` (100) | Bottom Sheet | `PASS` |
| **Shared UI** | `SmartOverflowText` | Text Hover Tooltip | Fixed / Absolute | Pointer-events-none | N/A | Reposition Top | `z-tooltip` (60) | Hidden on Touch | `PASS` |

---

## 3. Interaction Contract Validation

1. **Single Active Non-Modal Overlay**:
   * Opening any non-modal overlay dispatches a global event (`CustomEvent("app-overlay-open", { detail: { id } })`).
   * All other active non-modal overlays automatically close upon receiving this event.
2. **Non-swallowing Click Dismissal**:
   * Pointerdown capture phase listener closes active overlays when clicking outside, without calling `e.stopPropagation()`.
   * Clicking a new trigger closes the previous overlay and opens the new trigger in **1 single click**.
3. **Escape Key Handling**:
   * Global listener closes the topmost active floating layer without clearing page input states.
4. **Route Transition Dismissal**:
   * Changing Next.js pathname automatically triggers overlay cleanup.
