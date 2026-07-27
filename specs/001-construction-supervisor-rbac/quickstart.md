# Validation Quickstart

## Static and policy validation

```powershell
npx prisma validate
npx prisma generate
npx vitest run <scoped policy and weekly tests>
npx tsc --noEmit
npx eslint <changed source and test files>
npm run build
```

Expected: every command exits zero. This is necessary but not sufficient for GO.

## Safe runtime prerequisites

1. Set `QA_DATABASE_URL` to an isolated PostgreSQL database.
2. Run the QA safety guard and verify host, port and database name differ from `DATABASE_URL`.
3. Apply only the new additive migration to QA.
4. Create fixtures with prefix `QA-CONSTRUCTION-SUPERVISOR-RBAC-` and record exact IDs in a manifest.
5. Start the application against QA and use real authenticated sessions.

If any prerequisite is unavailable, do not mutate a database and mark runtime evidence BLOCKED.

## Runtime scenarios

1. New role sees all projects without membership and sees a newly created project after refresh.
2. Direct source mutations for projects, reports, progress, materials, tasks, documents and approvals return deny with unchanged DB snapshots.
3. Role creates and edits own DRAFT weekly dossier, exports it, submits it, cannot edit SUBMITTED, can edit/resubmit REVISION_REQUIRED.
4. Role views another author's dossier but cannot update/delete/export/review/lock it.
5. Cross-dossier row ID, invalid project ID, stale lock version and repeated submit are denied without extra revision.
6. Revoke role, refresh session and prove all-project view and weekly create disappear while old dossier remains.
7. Capture required desktop/tablet/mobile screenshots and direct request/DB before-after evidence.

## Cleanup

Read the fixture manifest, verify the same QA fingerprint, dry-run exact IDs, delete only those IDs in one transaction, query the same IDs again and preserve cleanup evidence. Never use a broad name filter.
