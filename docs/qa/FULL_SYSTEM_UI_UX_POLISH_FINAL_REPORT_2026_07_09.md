# Full System UI/UX Polish Final Report 2026-07-09

## 1. Summary

This pass performed a static full-system UI/UX audit and implemented a scoped high-priority fix for the weekly field report detail drawer and progress display logic.

Main outcome: weekly report detail and print/PDF output now avoid the misleading pattern where `Tuần này > 0` but `Lũy kế`, `Còn lại`, and `%` still look like valid zeros. The drawer is wider, lighter, easier to scan, and uses clearer action hierarchy.

## 2. Screens/Modules Audited

- Dashboard / overview
- Projects and project detail
- Documents
- Field reports: daily reports, weekly reports, detail drawer, print route, approval actions
- Field progress daily/summary screens
- Materials and material requests
- Suppliers
- Contracts
- Accounting/payments
- Approvals
- Users/accounts
- Settings
- Global shell: sidebar, header/topbar, project context, search, notifications
- Shared UI: button, card, badge/status badge, confirm dialog, empty state, toast, error/loading files

Audit plan file:
- `docs/qa/FULL_SYSTEM_UI_UX_AUDIT_PLAN_2026_07_09.md`

## 3. Files Changed

- `src/lib/reports/report-progress-display.ts`
  - Added pure display normalization for report progress quantity, cumulative, remaining, and percent.
- `src/lib/reports/report-progress-display.test.ts`
  - Added regression tests for weekly cumulative fallback and unavailable percent when design quantity is missing.
- `src/components/reports/report-detail-drawer.tsx`
  - Polished overlay, drawer width, header hierarchy, content background, table scroll/sticky behavior, footer action hierarchy.
  - Routed displayed quantity/progress cells through the new normalization helper.
  - Added `Chưa có TK` visual warning when design quantity is missing.
- `src/app/print/reports/[reportId]/page.tsx`
  - Mapped design/before/cumulative/remaining/percent line snapshots into print data.
- `src/components/reports/report-print-template.tsx`
  - Routed print/PDF quantity and progress cells through the same normalization helper.
- `src/components/ui/button.tsx`
  - Added reusable `primary`, `secondary`, and `success` variants while keeping existing variants.
- `docs/qa/FULL_SYSTEM_UI_UX_AUDIT_PLAN_2026_07_09.md`
  - Initial Phase 0 audit/plan.
- `docs/qa/FULL_SYSTEM_UI_UX_POLISH_FINAL_REPORT_2026_07_09.md`
  - This final evidence report.

Note: the worktree already had many uncommitted changes before this pass in reports/field-progress/QA files. Those were not reverted.

## 4. UI/UX Changes

- Drawer overlay changed from flat dim to a subtler dark overlay with slight blur.
- Drawer width increased on desktop (`lg:max-w-5xl`) so report tables have breathing room.
- Header now has stronger report code hierarchy and wraps metadata instead of truncating aggressively.
- Report content area uses a light ERP surface with a framed work-summary section.
- Work table now has:
  - horizontal scroll,
  - minimum width,
  - sticky header,
  - sticky first column,
  - right-aligned numeric columns,
  - clearer weekly/daily quantity labels.
- Footer now distinguishes:
  - primary actions: submit/approve,
  - secondary actions: close/print/edit,
  - destructive action: delete.
- Mobile card view now keeps the key quantity prominent and shows normalized supporting metrics.

## 5. Data/Logic Fixes

- Added display normalization rule:
  - For weekly reports, if cumulative snapshot is missing/zero but `Tuần này` or `Trước` is positive, display cumulative as `Trước + Tuần này`.
- Added design quantity rule:
  - If `TK = 0` or missing, `Còn lại` and `%` display as `—`, not `0` / `0%`.
  - A `Chưa có TK` badge is shown to make the state explicit.
- Print/PDF now uses the same normalized display logic as the drawer and receives the needed line snapshots from the print route.
- Kept server actions, RBAC, approval transitions, upload APIs, and database schema untouched in this pass. The print route was changed only to pass existing line snapshot fields into the print template.

## 6. Deferred / Needs Confirmation

- Full migration of every module table/drawer/modal to a single shared component system is still pending.
- Deep live DB audit was not run because the request forbids seed/reset/destructive data operations without confirmation.
- Browser screenshot matrix was not run because no existing running UI server was confirmed, and this pass did not start `npm run dev`.
- Existing full-repo lint failures outside the touched files need cleanup or ignore configuration.

## 7. Verification

Commands run:

- `npx tsx src/lib/reports/report-progress-display.test.ts`
  - PASS: 2 tests passed.
  - First attempt required escalation because sandbox blocked `tsx`/esbuild child process spawn with `EPERM`.
- `npx tsc --noEmit`
  - PASS.
- `npm run build`
  - PASS.
  - Warning remains: Turbopack/NFT trace warning through `src/lib/storage/local-storage-provider.ts` and reports attachment route.
- `npx eslint src/components/reports/report-detail-drawer.tsx src/components/ui/button.tsx src/lib/reports/report-progress-display.ts src/lib/reports/report-progress-display.test.ts`
  - PASS.
- `npx eslint src/app/print/reports/[reportId]/page.tsx src/components/reports/report-print-template.tsx src/components/reports/report-detail-drawer.tsx src/components/ui/button.tsx src/lib/reports/report-progress-display.ts src/lib/reports/report-progress-display.test.ts`
  - PASS.
- `npm run lint`
  - FAIL: full repo lint has pre-existing errors in `patch.js`, `scratch/*.js`, `src/lib/storage/local-storage-provider.ts`, and `prefer-const` errors in accounting/contracts actions. The touched files pass targeted lint.

## 8. Before / After

Before:
- Weekly detail drawer felt heavy and narrow.
- Table columns were cramped, first column wrapped too much, and important numbers could look contradictory.
- `TK = 0`, `Tuần này = 80`, `Lũy kế = 0`, `Còn lại = 0`, `% = 0%` could be presented as if valid.
- Footer mixed print/close/delete/reject/approve actions in one dense cluster.

After:
- Drawer is wider with a calmer overlay and stronger hierarchy.
- Work table scrolls horizontally, has sticky header/first column, and numeric cells are easier to scan.
- `Tuần này = 80` with missing cumulative now displays cumulative as `80` for weekly display.
- Missing design quantity shows `Chưa có TK`, `Còn lại = —`, `% = —`.
- Print/PDF output follows the same display rules.
- Footer uses clearer primary/secondary/destructive button variants.

## 9. Remaining Risks

- Because there were many pre-existing uncommitted changes, this report only claims the files listed above.
- Full lint is still not clean across the repository.
- No live browser screenshots were captured in this pass.
- A deeper business decision is needed for over-design progress and whether weekly reports should persist design/before/cumulative snapshots at creation time, not only normalize at display time.

## 10. Conclusion

PASS CÓ ĐIỀU KIỆN.

The high-priority weekly report drawer UI and misleading progress display issue were addressed with tests. TypeScript and build pass. Targeted lint for changed files passes. Full repo lint remains blocked by unrelated existing errors.
