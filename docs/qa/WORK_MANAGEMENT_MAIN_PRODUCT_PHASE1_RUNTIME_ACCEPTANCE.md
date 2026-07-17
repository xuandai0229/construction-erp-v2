# Work Management Main Product Phase 1 — Runtime Acceptance

## Status

DONE on isolated production QA browser acceptance.

The approved controlled V2 migration history deployed on a fresh isolated QA database: 2 applied, 0 failed and 0 pending, with Prisma schema parity passing. The source/local database remains read only and untouched.

`scripts/qa/work-management-main-product-phase1-runtime.ts` then seeded only run-manifest fixtures, used the real Prisma adapter and single `CoreTaskExecutor` composition, and removed those fixture IDs in `finally`. It persisted/reloaded CREATE_DRAFT, ASSIGN, ACCEPT, START, UPDATE_PROGRESS, SUBMIT, REQUEST_CHANGES, resubmission, APPROVE_RESULT and CONFIRM_COMPLETION. It observed 10 ordered action-history records and 43 outbox messages, plus idempotency replay, cross-project same-key isolation, outsider denial and a stale-version no-mutation check.

Production build is PASS. The corrected production QA browser flow passed with real Manager/Assignee login, `/tasks` UI creation/reload, authenticated action requests, outsider denial, project switching, final completion and persisted action/outbox checks. The runner-owned process tree is stopped in `finally` and fixtures are run-manifest scoped.

The timeout is diagnosed in `WORK_MANAGEMENT_PHASE1_BROWSER_TIMEOUT_DIAGNOSIS.md`. The runner now has HTTP readiness and process-tree cleanup; browser acceptance must be rerun from a fresh `WM-PHASE1-E2E-` fixture before changing this status.

## Tenant contract

- Company scope: **NOT APPLICABLE IN CURRENT SCHEMA**.
- Tenant boundary: **PROJECT**.
- Server-owned project scope: `ProjectMember` / existing RBAC.
- Existing local database mutated: **NO**.

## Migration decision

Legacy recovery is superseded by controlled migration history V2. See `DATABASE_MIGRATION_V2_REBASELINE_REPORT.md`; no historic checksum was forged and no existing database was cut over.
