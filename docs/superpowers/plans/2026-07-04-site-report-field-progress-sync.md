# Site Report Field Progress Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make daily site report quantity lines come from `FieldProgressItem` and sync submitted/approved report lines into `FieldProgressEntry` without duplicate daily quantities.

**Architecture:** `FieldProgressItem` remains the baseline catalog. `SiteReportLine` stores the field user's declared daily quantity and snapshot fields. A new report progress sync service writes one active `FieldProgressEntry` per project/date/item in a transaction and report transitions call it.

**Tech Stack:** Next.js 16 App Router Server Functions, React client components, Prisma 7, PostgreSQL, TypeScript, `tsx` QA scripts.

---

### Task 1: RED QA Script

**Files:**
- Create: `scripts/qa-report-progress-sync.ts`

- [ ] Write a QA script that loads project `CT-TAYHO-2026-001`, creates deterministic QA draft reports and lines tagged with `QA_REPORT_PROGRESS_SYNC_2026_07_04`, verifies draft does not create active approved progress entries, then expects submit/approve/reject/duplicate/over-design/RBAC helper behavior from the service.
- [ ] Run `npx tsx scripts/qa-report-progress-sync.ts` and confirm it fails because `src/lib/reports/report-progress-sync.ts` does not exist yet or sync behavior is missing.

### Task 2: Sync Service

**Files:**
- Create: `src/lib/reports/report-progress-sync.ts`
- Modify: `src/lib/reports/report-transition-service.ts`

- [ ] Implement `syncSiteReportProgressEntries` to read a daily `SiteReport` with `SiteReportLine.fieldProgressItemId`, validate item ownership/template, compute approved cumulative quantity, block over-design, and create/update one `FieldProgressEntry` per project/date/item.
- [ ] Store report provenance in `FieldProgressEntry.note` using a structured marker because schema has no source columns.
- [ ] On submit set entries to `SUBMITTED`; on approve set to `APPROVED`; on reject set own entries to `REVISION_REQUESTED`; on cancel/delete set own entries to `CANCELLED`.
- [ ] Call the service inside submit/approve/reject transition transactions so report status and daily quantity sync are atomic.

### Task 3: Report Actions And Line Snapshots

**Files:**
- Modify: `src/app/(dashboard)/reports/actions.ts`

- [ ] Make `getProjectWorkItems` return field progress picker metadata: category, code, unit, design quantity, approved cumulative, same-day pending quantity, remaining quantity, and status.
- [ ] Validate daily report work lines use `fieldProgressItemId` from the selected project instead of free-form-only work content.
- [ ] Create/update `SiteReportLine` with `fieldProgressItemId`, `designQuantity`, `quantityBefore`, `quantityCumulative`, `progressPercent`, `issueNote`, and `proposalNote`.
- [ ] When editing a report that has already produced progress entries, sync/cancel old own entries safely and prevent overwriting approved entries from another report.

### Task 4: Reports UI

**Files:**
- Modify: `src/components/reports/types.ts`
- Modify: `src/components/reports/reports-workspace.tsx`
- Modify: `src/components/reports/create-report-dialog.tsx`

- [ ] Add `fieldProgressItemId` and progress snapshot fields to client report line types.
- [ ] Preserve those fields in create/update payloads.
- [ ] Replace free-form daily quantity entry with a searchable/pickable baseline-work selector, showing design quantity, approved cumulative, today's pending quantity, remaining quantity, and over-limit warnings.
- [ ] Keep mobile layout as card stack and desktop as a clearer dense form surface.
- [ ] Add unsaved-change confirmation before closing the dialog.

### Task 5: Daily Progress Guardrails

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts`
- Modify: `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx`
- Modify: `src/components/field-progress/daily-entry-table.tsx`

- [ ] Rename the screen copy to "Khối lượng theo ngày" and make it clear report-synced entries are the primary source.
- [ ] Block manual writes by viewer/accountant/staff-like users.
- [ ] Do not let manual daily entry overwrite a report-sourced approved entry.
- [ ] Show a source badge/link when the provenance marker exists; document that legacy rows without marker cannot be proven without a migration.

### Task 6: Verification And Report

**Files:**
- Create: `docs/qa/SITE_REPORT_FIELD_PROGRESS_SYNC_UX_ANALYSIS_AND_FIX_REPORT_2026_07_04.md`

- [ ] Run `npx prisma validate`.
- [ ] Run `npx prisma generate`.
- [ ] Run `npx tsx scripts/qa-report-progress-sync.ts`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Write the QA report with actual command outcomes, changed files, remaining risks, and manual test checklist.
