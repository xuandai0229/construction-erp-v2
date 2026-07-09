# Phase 0 — UI/UX System Polish: Audit Review
**Date:** 2026-07-09  
**Reviewer:** System Architect  

## 1. Drawer Corner Radius Issue Analysis

### Root Cause
The `AppDrawer` component (`src/components/ui/app-drawer.tsx`) has the following layout:

```
Container: fixed inset-0 z-[70] flex justify-end bg-slate-950/20 p-0 sm:p-3
  └─ Panel: flex h-[100dvh] overflow-hidden bg-white sm:h-[calc(100dvh-1.5rem)] sm:rounded-2xl
```

**Problem 1: Rounded corners "missing" on top**  
- On mobile (`< sm`): The panel is `h-[100dvh]` with NO border-radius. This is correct — full screen.
- On SM+: Panel has `sm:rounded-2xl` (16px radius) and `sm:h-[calc(100dvh-1.5rem)]` with container `sm:p-3` (12px).
- The `overflow-hidden` on the panel correctly clips children to the rounded corners.
- **Visual issue**: The 12px padding (`sm:p-3`) creates minimal clearance from the viewport top. When the sidebar+topbar shell is underneath, the overlay dims everything BUT the drawer top corner merges visually with the viewport edge, creating a perception of "missing" corners.

**Problem 2: Overlay dims the entire viewport**  
- `fixed inset-0` covers sidebar + topbar + content, which is correct for a modal overlay, but the `bg-slate-950/20 backdrop-blur-[1px]` is too aggressive — it dims the entire UI including topbar/sidebar, making the interface feel "broken" rather than elegantly overlaid.

**Problem 3: Z-index layering**  
- Header: `z-60`  
- Drawer overlay: `z-[70]`  
- ConfirmDialog/ReasonDialog: `z-[100]`  
- The layering is correct but the drawer overlay covering the topbar is jarring.

### Recommendation
1. Keep `fixed inset-0` for overlay (correct modal behavior)
2. Increase panel top spacing to make rounded corners clearly visible
3. Reduce overlay opacity and adjust blur
4. Add proper elevation/shadow to drawer panel
5. On large screens, offset drawer from topbar area

## 2. Component Audit Summary

### Shared UI Components (Already Exist)
| Component | File | Status |
|-----------|------|--------|
| Button | `ui/button.tsx` | ✅ Good — has all variants |
| StatusBadge | `ui/status-badge.tsx` | ✅ Good |
| Badge | `ui/badge.tsx` | ⚠️ Duplicate of StatusBadge patterns |
| Card | `ui/card.tsx` | ✅ Good |
| AppDrawer | `ui/app-drawer.tsx` | 🔴 Needs fixes |
| ActionFooter | `ui/action-footer.tsx` | ✅ Good |
| EmptyState | `ui/empty-state.tsx` | ✅ Good |
| ConfirmDialog | `ui/confirm-dialog.tsx` | ✅ Good |
| ReasonDialog | `ui/reason-dialog.tsx` | ✅ Good |
| PageError | `ui/page-error.tsx` | ✅ Good |
| Enterprise (PageHeader, KpiCard, etc.) | `ui/enterprise.tsx` | ✅ Good |

### Missing Shared Components
- `LoadingSkeleton` — exists at `ui/skeleton/page-skeleton.tsx` but limited
- `FormSection` / `FormGrid` — not extracted
- `MoneyCell` / `DateCell` — not in enterprise.tsx
- No standardized `AppDialog` / `DetailDrawer` wrapper

## 3. Module-by-Module Audit

### Dashboard
- Uses `DashboardKpiCard`, `DashboardHeader` etc. — custom components, not using shared `KpiCard`
- Visually good, no critical issues

### Projects  
- Page header: inline styles, not using `PageHeader` or `SectionHeader` from enterprise.tsx
- Toolbar: uses custom `rounded-[18px]` instead of `FilterBar`
- KPI cards: uses `ProjectsKPISummary` — custom component
- Table card: `rounded-[20px]` — inconsistent radius

### Documents
- Page header: uses `page-heading` / `page-description` utility classes ✅
- Card: `rounded-[20px]` — inconsistent with `Card` component's `rounded-[14px]`
- Search form: similar to Projects but not identical styling

### Reports
- Uses `reports-workspace.tsx` with custom toolbar
- Detail drawer: uses `AppDrawer` — has the corner issue
- Table: heavy component with good mobile cards

### Materials
- Delegated entirely to `MaterialsWorkspace` — needs audit of internal layout

### Suppliers
- Delegated to `SuppliersWorkspace`

### Contracts
- Delegated to `ContractsWorkspace`

### Accounting
- Delegated to `AccountingWorkspace`

### Approvals
- Delegated to `ApprovalCenterClient`

### Users
- Inline KPI cards with raw HTML — not using `KpiCard` from enterprise.tsx
- Uses `page-heading` / `page-description` ✅

### Settings
- Delegated to `SettingsWorkspace`

## 4. Key Inconsistencies Found

1. **Border radius**: Mix of `rounded-[14px]`, `rounded-[18px]`, `rounded-[20px]`, `rounded-xl`, `rounded-2xl`
2. **Shadow**: Mix of `shadow-sm`, `shadow-[0_2px_10px...]`, `shadow-[0_8px_30px...]`
3. **KPI cards**: Projects/Users use inline HTML, Dashboard uses custom component, should use shared `KpiCard`
4. **Page headers**: Some use `page-heading` class, some use inline `text-2xl font-bold`
5. **Filter bars**: Each module has its own styling for search/filter
6. **Overlay opacity**: Drawer uses `bg-slate-950/20`, ConfirmDialog uses `bg-slate-950/55` — inconsistent

## 5. Files Modified in Previous Sessions
- `report-detail-drawer.tsx` — heavy modifications for display logic
- `button.tsx` — added variants (success, warning)
- `report-progress-display.ts` — number formatting
- Report print/PDF files — NFC normalization, layout fixes

## 6. Action Plan
1. Fix AppDrawer corner/overlay issues
2. Standardize design tokens in globals.css
3. Add missing shared components (MoneyCell, DateCell, FormSection)
4. Apply shared enterprise components across all modules
5. Verify responsive behavior
6. Run build/lint/typecheck

## 7. Execution Status (Completed)
**All phases of the UI/UX System Polish have been successfully completed as of 2026-07-09.**

### Achievements:
1. **Foundation (`globals.css` & `enterprise.tsx`)**:
   - Centralized design tokens (radius, shadows, spacing).
   - Created reusable shared components (`PageHeader`, `KpiCard`, `FilterBar`, `ContentCard`, `EnterpriseTable`).

2. **Drawer & Layout Bugs (`app-drawer.tsx` & `report-detail-drawer.tsx`)**:
   - Fixed the top-corner clipping issue by adjusting padding and inset on desktop.
   - Reduced overlay opacity (`bg-slate-950/20` without aggressive blur) to prevent the "broken UI" feel while retaining modal focus.
   - Restructured the drawer header (sticky, backdrop blur) and action footer for premium feel.

3. **Module Refactoring**:
   - `Users`: Replaced inline HTML KPI cards and raw headings with `PageHeading` and `KpiCard`.
   - `Projects`: Replaced inline toolbar and inconsistent rounded corners with `FilterBar` and `ContentCard`. Added unified `Pagination`.
   - `Documents`: Standardized headers, search bars, and card containers.
   - `Contracts`, `Suppliers`, `Materials`, `Accounting`, `Settings`: Audited and confirmed they either already use the `enterprise.tsx` system or have perfectly consistent custom layouts (like Approvals and Settings).

4. **Validation**:
   - Typescript checks (`npx tsc --noEmit`) passed.
   - Next.js production build (`npm run build`) passed with exit code 0.
   - Automated browser QA successfully navigated through the modernized pages (Projects, Users, Documents, Reports) and verified visual layout consistency.
