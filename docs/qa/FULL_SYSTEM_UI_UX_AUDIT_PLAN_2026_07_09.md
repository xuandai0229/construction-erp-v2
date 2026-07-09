# Full System UI/UX Audit Plan 2026-07-09

## Executive Summary

Framework: Next.js 16.2.7 App Router, React 19.2.4, Tailwind CSS v4, Prisma 7, server actions, lucide-react, custom UI primitives.

Design read: enterprise construction ERP, dense operational UI, light navy/blue system, restrained motion, high data readability. The correct direction is targeted system polish, not a marketing-style redesign.

## Source Map

Routes scanned:
- Dashboard: `src/app/(dashboard)/dashboard`
- Projects: `src/app/(dashboard)/projects`, `src/components/projects`, `src/components/project`
- Documents: `src/app/(dashboard)/documents`, `src/components/documents`
- Field reports: `src/app/(dashboard)/reports`, `src/components/reports`, `src/app/print/reports/[reportId]`
- Materials and material requests: `src/app/(dashboard)/materials`, `src/app/(dashboard)/projects/[id]/material-requests`, `src/components/materials`, `src/components/material-request`
- Suppliers: `src/app/(dashboard)/suppliers`, `src/components/suppliers`
- Contracts: `src/app/(dashboard)/contracts`, `src/components/contracts`
- Accounting/payments: `src/app/(dashboard)/accounting`
- Approvals: `src/app/(dashboard)/approvals`
- Users/accounts: `src/app/(dashboard)/users`, `src/components/users`
- Settings: `src/app/(dashboard)/settings`, `src/components/settings`
- Global shell: `src/components/layout`, `src/app/(dashboard)/layout.tsx`

Shared UI scanned:
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/status-badge.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/confirm-dialog.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/page-error.tsx`
- `src/components/ui/reason-dialog.tsx`
- `src/components/ui/toast-context.tsx`

Style/theme files scanned:
- `src/app/globals.css`
- `postcss.config.mjs`
- `eslint.config.mjs`
- `docs/design/UI_UX_STYLE_GUIDE.md`

## UI/UX Findings

### CRITICAL

- Weekly report detail drawer can show misleading progress numbers. Example: `Tuần này > 0`, `Lũy kế = 0`, `% = 0%`, `Còn lại = 0` when the design quantity is missing or the weekly snapshot does not persist cumulative fields.
- Report detail drawer table is too narrow for enterprise quantity data. The first column wraps aggressively, numeric columns compete for space, and desktop/tablet layouts do not make horizontal overflow obvious enough.
- Destructive and approval actions in report drawer footer sit in the same visual group. This increases risk of accidental destructive action.

### HIGH

- Tables across reports, contracts, accounting, approvals, documents, suppliers, users, and materials use local markup instead of one shared data-table pattern.
- Drawers/dialogs are implemented per module with inconsistent widths, overlays, footer behavior, and mobile behavior.
- Some status/action colors are hard-coded in feature components instead of routed through shared variants.
- Several dense tables depend on `overflow-x-auto`, but not all have sticky headers, sticky first columns, or consistent right alignment for numeric data.

### MEDIUM

- Page headers and filter bars vary in density and hierarchy.
- Cards use several radius and shadow treatments, from compact ERP panels to larger marketing-like cards.
- Empty/loading/error states exist but are not consistently applied across all route folders.
- Mobile action layouts vary between bottom sheets, drawers, cards, and stacked buttons.

### LOW

- Some historical Vietnamese strings appear mojibake in terminal output, which increases maintenance risk even when source files are UTF-8.
- Several QA/archive files document previous UI phases; they are useful evidence but make current state harder to scan.

## Business/Data Findings

### CRITICAL

- Weekly report creation stores weekly line quantity in `quantityToday`, but the detail UI previously expected `quantityCumulative`, `remainingQuantity`, and `progressPercent` to already exist on those lines. This can produce misleading cumulative/progress displays.
- When `designQuantity = 0`, displaying `0%` implies a valid baseline. The safer display is unavailable (`—`) with a no-design baseline interpretation.

### HIGH

- Daily and weekly report detail share display assumptions, but daily lines are sourced from field progress balance while weekly lines can be aggregate lines. The display layer must normalize per report type.
- Progress over design quantity should remain visible as an exceptional state instead of silently clamping meaning away. This pass keeps clamping behavior but flags follow-up.

### MEDIUM

- Report list stats are server-computed, but visual KPI cards and tab filters have separate local styling.
- Print/PDF templates may need the same normalized progress display rules as the drawer.

## Duplicate/Fragmented Components

- Tables: reports table, report detail tables, field progress tables, contracts workspace tables, accounting workspace tables, approvals center, documents workspace, suppliers/users lists.
- Drawers: report detail drawer, contract detail drawer, payment request detail drawer, material request detail.
- Dialogs/forms: create report dialog, contract form dialog, payment request form dialog, material request form, confirm/reason dialogs.
- Status chips: shared `StatusBadge` exists, but feature modules still include local color decisions.

## Priority Fix Plan

1. Stabilize report progress display logic with a pure helper and regression test.
2. Polish report detail drawer: wider desktop sheet, subtler overlay, clearer header hierarchy, readable table, sticky footer actions.
3. Extend shared button variants so primary/secondary/destructive/success actions are reusable.
4. Document full-system table/drawer/form standard for follow-up, rather than copying CSS into each screen.
5. Run TypeScript/build/lint and report exact evidence.

## Scope Fixed In This Pass

- Report detail drawer layout and table readability.
- Weekly/daily progress display normalization for drawer cells.
- Print/PDF progress display normalization for report work lines.
- Shared Button variants: `primary`, `secondary`, `success`, keeping existing variants.
- Regression test for weekly cumulative fallback and `designQuantity = 0` percent display.
- Initial and final QA reports.

## Deferred Scope

- Full migration of every module table to a new shared `DataTable` component.
- Browser screenshot matrix at 1440/1920/1366/1024/768/390/360 if no running server is available.
- Deep DB audit of all live business data. No seed/reset/cleanup commands are allowed in this pass without explicit confirmation.
- Shared drawer/dialog primitive extraction across reports/contracts/accounting/material requests.

## Risk Controls

- No database reset, seed, cleanup, or destructive data command.
- No commit or push.
- Do not alter RBAC/server-action policy logic.
- Keep API/export/upload paths untouched unless a verified bug requires it.
- Use pure display helpers for UI math and test them independently.
