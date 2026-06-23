# Reports R3a Server Locks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close critical server-side write paths for reports, attachments, approved field progress, and immutable document states without migrations or storage cleanup.

**Architecture:** Put fail-closed status rules in small pure policy modules, then make every mutation endpoint call those rules. Report transitions use conditional `updateMany` operations inside transactions so state changes and AuditLog writes are atomic. A standalone R3a script exercises pure policy rules and database-level transition helpers with clearly prefixed UAT records.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7, PostgreSQL, Node.js/tsx.

---

### Task 1: Shared report workflow policy

**Files:**
- Create: `src/lib/reports/report-workflow-policy.ts`
- Create: `scripts/test-reports-r3a-server-locks.ts`

- [ ] Write assertions for every `SiteReportStatus`, including fail-closed unknown values.
- [ ] Run the script and verify it fails because the policy module does not exist.
- [ ] Implement the minimal pure policy helpers.
- [ ] Re-run the script and verify the policy assertions pass.

### Task 2: Report transitions and AuditLog

**Files:**
- Modify: `src/app/(dashboard)/reports/actions.ts`
- Extend test: `scripts/test-reports-r3a-server-locks.ts`

- [ ] Add database-level tests for allowed and rejected transitions.
- [ ] Verify the new tests fail against the current read-then-update behavior/helper absence.
- [ ] Make create + AuditLog transactional and set `submittedAt` for direct submit.
- [ ] Replace submit/approve/reject updates with conditional status updates and conflict errors.
- [ ] Re-run transition and AuditLog tests.

### Task 3: Attachment upload lock and audit

**Files:**
- Modify: `src/app/api/reports/[reportId]/attachments/route.ts`
- Extend test: `scripts/test-reports-r3a-server-locks.ts`

- [ ] Assert attachment write permission only for DRAFT and REJECTED.
- [ ] Implement the shared policy guard in the route.
- [ ] Write `SITE_REPORT_ATTACHMENT_ADDED` in the same DB transaction as attachment metadata creation.
- [ ] Verify blocked status behavior and audit payload.

### Task 4: Approved field progress lock

**Files:**
- Create: `src/lib/field-progress/entry-workflow-policy.ts`
- Modify: `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts`
- Extend test: `scripts/test-reports-r3a-server-locks.ts`

- [ ] Write failing tests that approved entries cannot update or soft-delete.
- [ ] Implement fail-closed guard before building Prisma operations.
- [ ] Preserve current new-entry status behavior to avoid broad workflow redesign.
- [ ] Re-run tests for approved and non-approved entries.

### Task 5: Document immutable status and transitions

**Files:**
- Modify: `src/lib/documents/permissions.ts`
- Modify: `src/app/(dashboard)/documents/actions.ts`
- Extend test: `scripts/test-reports-r3a-server-locks.ts`

- [ ] Write failing tests for APPROVED/ARCHIVED/SUPERSEDED immutability.
- [ ] Write failing tests for the explicit document transition matrix.
- [ ] Block rename, metadata edit, and delete for immutable states for every role.
- [ ] Validate transitions and require rejection reasons.
- [ ] Re-run document tests.

### Task 6: Verification and report

**Files:**
- Create: `docs/qa/REPORTS_R3A_CRITICAL_SERVER_SIDE_LOCK_HOTFIX_REPORT.md`

- [ ] Run `npx tsx --env-file=.env scripts/test-reports-r3a-server-locks.ts`.
- [ ] Run direct HTTP/browser smoke where session tooling permits.
- [ ] Run Prisma validate/generate, TypeScript, scoped ESLint, and production build separately.
- [ ] Record exact results, remaining risks, and safety confirmations.
- [ ] Confirm no migration, storage cleanup, data deletion, commit, push, or DB reset occurred.
