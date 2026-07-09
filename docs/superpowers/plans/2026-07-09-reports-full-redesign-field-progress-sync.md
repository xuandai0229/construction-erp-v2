# Reports Full Redesign + Field Progress Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Reports and Field Progress share a trustworthy quantity source, then redesign daily/weekly report UI and print/export surfaces around that data contract.

**Architecture:** Keep `FieldProgressEntry` as the single operational quantity ledger, with `SiteReportLine` as report snapshot/history. Use `volume-balance.ts` as the only balance calculator and pass its fields through server actions into UI/print without client-side recomputation.

**Tech Stack:** Next.js App Router 16.2.7, React 19, Prisma 7, PostgreSQL, TypeScript, PowerShell, tsx QA scripts.

---

### Task 1: Confirm Existing Core Sync State

**Files:**
- Read: `docs/qa/REPORTS_AND_FIELD_PROGRESS_FULL_AUDIT_2026_07_09.md`
- Read: `docs/qa/REPORTS_FIELD_PROGRESS_CORE_SYNC_FIX_2026_07_09.md`
- Read: `docs/qa/REPORTS_FIELD_PROGRESS_CORE_SYNC_PHASE_2A1_VERIFICATION_2026_07_09.md`
- Read: `prisma/schema.prisma`
- Read: `src/lib/field-progress/volume-balance.ts`
- Read: `src/lib/reports/report-progress-sync.ts`

- [ ] Verify current dirty changes are understood and not reverted.
- [ ] Check whether source columns, date-bounded balance, delete/reject rollback, and project context fixes are already present.
- [ ] Run or inspect existing QA script before adding new tests.

### Task 2: Add Red Tests For Missing Behavior

**Files:**
- Create/Modify: `scripts/qa-reports-full-redesign-sync.ts`

- [ ] Add test for WorkPicker payload fields: design, cumulativeBeforeDate, todayQuantity, cumulativeAfterDate, remainingAtDate, approved/submitted/draft/pending totals.
- [ ] Add test for weekly aggregation snapshots: before-week, in-week, end-week, remaining, percent, days with quantity.
- [ ] Add test for print/detail serialization preserving quantity snapshot fields.
- [ ] Run script and verify it fails on missing fields before implementation.

### Task 3: Complete Balance Contract

**Files:**
- Modify: `src/lib/field-progress/volume-balance.ts`
- Modify: `src/app/(dashboard)/reports/actions.ts`
- Modify: `src/components/reports/types.ts`

- [ ] Extend `VolumeBalanceResult` with explicit `designQuantity`, `todayQuantity`, `approvedQuantity`, `draftQuantity`, `submittedQuantity`, `pendingQuantity`, `status`.
- [ ] Return the same contract from `getProjectWorkItems`.
- [ ] Stop using misleading UI-only names as the canonical backend contract.
- [ ] Run the QA script and verify balance tests pass.

### Task 4: Standardize Report Line DTOs

**Files:**
- Modify: `src/app/(dashboard)/reports/page.tsx`
- Modify: `src/components/reports/types.ts`
- Modify: `src/components/reports/report-detail-drawer.tsx`
- Modify: `src/components/reports/report-print-template.tsx`
- Modify: `src/app/print/reports/[reportId]/page.tsx`

- [ ] Map `designQuantity`, `quantityBefore`, `quantityCumulative`, `progressPercent`, `remainingQuantity`, category/code/source metadata to client DTO.
- [ ] Show the full daily quantity table in detail drawer.
- [ ] Show the full quantity table in print template for daily and weekly.
- [ ] Run the QA script and TypeScript.

### Task 5: Rebuild Weekly Summary Data

**Files:**
- Modify: `src/app/(dashboard)/reports/actions.ts`
- Modify: `src/components/reports/create-dialog/weekly-report-form.tsx`
- Modify: `src/components/reports/report-detail-drawer.tsx`
- Modify: `src/components/reports/report-print-template.tsx`

- [ ] Make `getWeeklyReportSummary` aggregate by `fieldProgressItemId`.
- [ ] Compute `quantityBeforeWeek`, `quantityInWeek`, `quantityToDate`, `remainingQuantity`, `progressPercent`, `dates`.
- [ ] Create weekly report lines with `fieldProgressItemId`, `designQuantity`, `quantityBefore`, `quantityCumulative`, `progressPercent`.
- [ ] Add previous/current/next/custom week controls and next-week plan section.
- [ ] Run weekly QA test.

### Task 6: Reports UI Polish

**Files:**
- Modify: `src/components/reports/create-report-dialog.tsx`
- Modify: `src/components/reports/create-dialog/work-picker.tsx`
- Modify: `src/components/reports/create-dialog/selected-work-card.tsx`
- Modify: `src/components/reports/create-dialog/general-info-card.tsx`
- Modify: `src/components/reports/reports-workspace.tsx`

- [ ] Improve WorkPicker table/mobile layout and split active/approved/pending quantities.
- [ ] Add dirty-form aware outside-click close behavior.
- [ ] Add sticky action footer and clearer validation.
- [ ] Keep UI restrained and dashboard-appropriate.

### Task 7: Field Progress Positioning

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx`
- Modify: `src/components/field-progress/daily-entry-table.tsx`
- Modify: `src/components/project/project-module-tabs.tsx`

- [ ] Keep the tab, but label it as tracking/technical adjustment rather than primary site input.
- [ ] Show source warning: Reports are the preferred field source.
- [ ] Keep report-sourced approved rows locked.

### Task 8: Verification and Final QA Report

**Files:**
- Create: `docs/qa/REPORTS_FULL_REDESIGN_AND_FIELD_PROGRESS_SYNC_FIX_2026_07_09.md`

- [ ] Run `npx prisma validate`.
- [ ] Run `npx prisma generate` if schema changed or Prisma client needs refresh.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
- [ ] Run Reports/Field Progress QA scripts.
- [ ] Write final report with changed files, data formula, statuses counted, test output, risks, and browser retest guide.
