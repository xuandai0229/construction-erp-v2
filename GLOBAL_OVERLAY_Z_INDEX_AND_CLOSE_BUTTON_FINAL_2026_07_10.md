# Global Overlay Z-Index and Close Button Final Audit (July 10, 2026)

## 1. Objective
Standardize the modal, drawer, and confirm dialog stacking behavior across the ERP application to eliminate overlay conflicts, and deploy a system-wide unified `CloseButton` component.

## 2. Global Z-Index Hierarchy Established
To ensure layers are stacked predictably across the application, the following system-wide Z-index rules have been strictly applied:

| Component Type         | Z-Index Value | Use Case / Rationale                                               |
|------------------------|---------------|--------------------------------------------------------------------|
| **Sticky Headers/Nav** | `z-10` ~ `z-50` | Standard page layouts, sticky toolbars.                          |
| **AppDrawers**         | `z-[70]`      | Side slide-out panels (Material Details, Stock Details, etc).      |
| **Modals / Dialogs**   | `z-[90]`      | Action Forms (Transactions, Reports, Suppliers, Contracts).        |
| **Preview Modals**     | `z-[100]`     | Image/Report Print Preview dialogs that sit above standard forms.  |
| **Confirm / Reason**   | `z-[110]`     | Final destruct / confirm actions that must sit at the highest tier. |

## 3. "Close-First, Open-Later" Architecture
To prevent unexpected rendering issues (such as Modals mounting behind active Drawers), we've implemented the **"Close-First, Open-Later"** transition pattern when transferring control from a Drawer to a Dialog:

- **Before:** Firing a transaction from the Drawer attempted to render a `z-50` Modal on top of a `z-[70]` Drawer, leading to the Modal getting obscured.
- **After (Resolved in `materials-stock-table.tsx`):** Drawer triggers programmatically unmount the drawer first, then utilize a `setTimeout` (`150ms`) to cleanly initialize the Modal.
- This creates a smooth visual flow and guarantees the Dialog assumes front-stage control with proper dark overlays.

## 4. `CloseButton` Unification
All `lucide-react` `X` icon variations have been successfully migrated to use the centralized `@/components/ui/close-button.tsx` component.
- **Design Tokens:** Follows strict `danger` (red bg) and `neutral` (slate bg) tones for visual consistency.
- **Benefits:** Accessible hit-areas (44px equivalent), standardized hover/focus states, and complete elimination of scattered `button className="..."` bloat.

### Audited and Migrated Files:
- `src/components/suppliers/supplier-form-dialog.tsx`
- `src/components/suppliers/supplier-detail-drawer.tsx`
- `src/components/materials/stock-detail-drawer.tsx`
- `src/components/materials/transaction-form-dialog.tsx`
- `src/components/materials/transaction-detail-drawer.tsx`
- `src/components/material-request/material-request-form.tsx`
- `src/components/material-request/material-request-detail.tsx`
- `src/components/materials/material-detail-drawer.tsx`
- `src/components/materials/material-form-dialog.tsx`
- `src/components/contracts/contract-detail-drawer.tsx`
- `src/components/contracts/contract-form-dialog.tsx`
- `src/components/reports/create-report-dialog.tsx`
- `src/components/reports/site-report-gallery-dialog.tsx`
- `src/components/reports/create-dialog/selected-work-card.tsx`
- `src/components/dashboard/executive/project-time-progress-drawer.tsx`

## 5. Build Status
- Build: `npm run build` completed successfully.
- Codebase Health: Types and lints have remained stable after replacing imports.

## 6. QA Status
- Modals correctly obscure the UI in 1440x900 screens.
- Mobile overlays stretch across `100dvh` predictably with `CloseButton` providing easily reachable touch targets.
- Confirm Dialogs (`z-[110]`) safely hover over Material Request forms (`z-[90]`).

**Status:** PASS. Ready for Production.
