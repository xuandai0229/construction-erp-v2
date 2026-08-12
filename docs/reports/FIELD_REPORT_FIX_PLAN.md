# Field Report — Fix Plan (Implementation Not Performed)

This is a sequenced plan only. No application code, schema, workflow or real data was changed during the audit.

## Phase 0 — Product decisions

### F0.1 Choose daily draft rule

Decision required:

- Rule A: empty daily draft is valid; work line required only for submit; or
- Rule B: daily draft requires work line; change UI/helper/button wording accordingly.

Acceptance: one written rule consumed by product, frontend, server action and tests.

### F0.2 Define weekly duplicate behavior

Keep the duplicate guard, but decide whether the response should offer “open existing” or “edit existing”. Do not silently create a second weekly report.

## Phase 1 — P1 contract correction

1. Align `CreateReportDialog` button state, client validation and `createSiteReport` server validation.
2. Add tests for daily empty draft, daily empty submit, daily with line draft and daily with line submit.
3. Ensure the toast/error identifies whether failure happened before report creation or during upload.
4. Verify no partial row or orphan file is produced.

Exit criteria: QA reproduction from FR-001 has the intended outcome and DB assertion.

## Phase 2 — Error observability and upload UX

1. Give duplicate weekly errors a structured error code and open-existing CTA.
2. Surface attachment response category: auth/scope/status/validation/storage.
3. Add `accept` to the generic file input or revise helper copy to match server whitelist.
4. Keep server extension/magic-byte validation as the security boundary.
5. Log correlation ID/report ID without logging secrets or absolute sensitive paths.

Exit criteria: support can distinguish create failure, duplicate guard, rejected file and storage failure from one browser report.

## Phase 3 — Supervision permission UX

1. Compute `canEdit`/`canReview` from effective policy in the editor presentation model.
2. Show read-only banner only when effective edit permission is false.
3. Keep server-side `canEditSupervisionWeeklyDossier` checks unchanged until role matrix tests pass.
4. Add runtime tests for owner, reviewer/admin and non-authorized viewer.

Exit criteria: banner, enabled controls and server response agree for each representative role.

## Phase 4 — Storage hardening

1. Decide whether report attachments remain local or move behind the existing storage abstraction.
2. Make the report upload path honor the chosen volume/config contract consistently.
3. Add startup/readiness checks for storage directory, free space and write permission.
4. Add retrieval tests for missing file, path traversal, soft-deleted report and wrong project scope.
5. Define backup/retention/cleanup policy for soft-deleted reports and orphan files.

Exit criteria: single-node and intended deployment topology both pass write/read/rollback tests.

## Phase 5 — Workflow simplification decision gate

Do not remove approval before the impact document is accepted by owners of field progress, dashboard, notification, API and audit/history. If simplified workflow is approved, implement compatibility mapping and a dual-read migration plan before changing status semantics.

## Verification matrix

| Test | Expected |
|---|---|
| Daily draft, no line | Matches F0.1 decision |
| Daily submit, no line | Always blocked with actionable message |
| Weekly duplicate | Structured duplicate response; no upload attempt |
| Weekly draft + 2 photos | 2 DB rows, 2 files, detail renders |
| Invalid extension/magic bytes | 400 with rejected files; no partial persistence |
| Submitted/approved attachment | Blocked by policy with explicit status reason |
| Unauthorized project | 403; no file/DB mutation |
| Soft-deleted report | Not listed; attachment endpoint refuses |
| Supervision Admin reviewer | Banner and controls reflect effective policy |
| Production build | TypeScript, lint, build and route smoke pass |

## Rollout safety

- Use QA fixture project and isolated DB for mutation tests.
- Preserve existing user worktree changes; no reset/checkout.
- Do not bulk-seed or rewrite historical report rows.
- Capture before/after counts for SiteReport, SiteReportAttachment, audit logs and physical storage.
- Release FR-001 separately from any approval/workflow migration.
