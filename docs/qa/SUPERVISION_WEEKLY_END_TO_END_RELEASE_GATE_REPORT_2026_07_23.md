# Supervision Weekly End-to-End Release Gate Report

Date: 2026-07-23  
Conclusion: **BLOCKED**

## 1. Executive conclusion

The QA database safety blocker from the previous revision has been resolved:

- an isolated local database named `construction_erp_v2_qa_e2e_20260723` was created;
- the safety guard returns `safe: true`;
- all nine existing filesystem migrations were deployed to that database;
- an isolated QA application was started on port `3100`;
- real browser login succeeded;
- an isolated fixture was created in a transaction.

The release gate is still **BLOCKED** by a newly proven migration-history defect.
Opening the real RESULT dossier editor fails before the editor can render:

```text
PrismaClientKnownRequestError (P2022)
The column SupervisionWeeklyTransition.verificationMode does not exist
in the current database.
```

A read-only comparison proves that the application database contains four
nullable columns which do not exist in a clean database reconstructed from all
repository migrations:

| Table | Column | Application DB | Isolated QA DB |
| --- | --- | ---: | ---: |
| `SupervisionWeeklyTransition` | `verificationMode` | Present | Missing |
| `SupervisionWeeklyTransition` | `varianceReason` | Present | Missing |
| `SupervisionWeeklyQuantity` | `verificationMode` | Present | Missing |
| `SupervisionWeeklyQuantity` | `varianceReason` | Present | Missing |

All four fields exist in `prisma/schema.prisma`, but no migration SQL in
`prisma/migrations` creates them. The application database therefore has
out-of-band schema drift (for example, a prior manual alteration or `db push`);
the exact historical mechanism cannot be proven from repository or migration
history alone.

The current task explicitly prohibits creating a new migration and prohibits
changing the Prisma schema. An application-layer workaround is not safe:
`varianceReason` is part of the current data flow, and Prisma already selects
these relation fields. The missing schema must be repaired by a new additive,
nullable, non-destructive migration before runtime E2E testing can continue.

No application-database mutation was performed.

## 2. Environment safety

### Sanitized database fingerprints

```json
{
  "safe": true,
  "productionDatabase": {
    "database": "construction_erp_v2_qa",
    "host": "127.0.0.1",
    "port": "5432"
  },
  "qaDatabase": {
    "database": "construction_erp_v2_qa_e2e_20260723",
    "host": "127.0.0.1",
    "port": "5432"
  }
}
```

The database names differ. The QA name contains both `qa` and `e2e`.
No username, password, or full connection string is included in this report.

The helper used to create the database enforces:

- local hosts only (`localhost`, `127.0.0.1`, or `::1`);
- the exact fixed QA target name;
- refusal when the target already exists;
- refusal of names without a QA marker;
- no `DROP`, `TRUNCATE`, reset, or deletion.

### QA application

| Setting | Value |
| --- | --- |
| QA port used during runtime test | `3100` |
| QA origin | `http://127.0.0.1:3100` |
| PDF render origin | `http://127.0.0.1:3100` |
| QA `DATABASE_URL` | Process-scoped QA URL |
| Main application `DATABASE_URL` | Unchanged |
| Main port `3000` | Not repointed to the E2E database |

The QA process is not left running after the blocked test.

## 3. Migration and schema evidence

### Existing migration deployment

The isolated database started empty. `prisma migrate deploy`, with
`DATABASE_URL` overridden only for that process from `QA_DATABASE_URL`,
successfully applied all nine repository migrations:

1. `0_baseline_v2_existing_product_schema`
2. `20260716090000_work_management_main_product_phase1`
3. `20260717000000_approval_request_legacy_compatibility`
4. `20260717120000_supervision_head_weekly`
5. `20260720143000_supervision_weekly_rebuild`
6. `20260720150000_supervision_weekly_result_tables`
7. `20260720170000_supervision_weekly_input_ux`
8. `20260720183000_supervision_weekly_direct_entry`
9. `20260720195000_supervision_weekly_category_work_split`

Migration status after deployment reported that the schema was up to date.
Metadata verification confirmed these current weekly tables:

- `SupervisionWeeklyDossier`
- `SupervisionWeeklyShiftSelection`
- `SupervisionWeeklyEntry`
- `SupervisionWeeklyTransition`
- `SupervisionWeeklyQuantity`
- `SupervisionWeeklyProgress`
- `SupervisionWeeklyObservation`
- `SupervisionWeeklyAttachment`
- `SupervisionWeeklyRevision`

### Root-cause proof

`rg` over `prisma/migrations` returned no reference to `verificationMode` or
`varianceReason`. Both names occur only in `prisma/schema.prisma` and runtime
code.

The read-only drift inspector used `BEGIN READ ONLY` for both databases. It
proved:

- the application database has all four nullable `text` columns;
- the isolated QA database has none of them;
- the isolated QA database has every repository migration marked finished;
- the application database's migration history does not contain a migration
  that accounts for the four columns.

This excludes failed `migrate deploy` as the cause.

Sanitized machine-readable evidence:
[schema-drift-evidence.json](../../artifacts/supervision-weekly-e2e/schema-drift-evidence.json).

### Required repair not executed

The safe repair is a new additive migration which adds these four nullable
columns. It should be idempotent for the already-drifted application database,
for example by using PostgreSQL `ADD COLUMN IF NOT EXISTS`. It must not drop,
rename, backfill incorrectly, or delete data.

That migration was **not created or executed**, because the controlling prompt
for this run explicitly says not to create a new migration.

## 4. Fixture manifest

Fixture creation ran in one transaction against only the isolated QA database.
The manifest status is `READY`:

[fixture-manifest-20260723.json](../../artifacts/supervision-weekly-e2e/fixture-manifest-20260723.json)

Created fixture scope:

| Fixture type | Count |
| --- | ---: |
| Users | 5 |
| Projects | 2 |
| Project memberships | 4 |
| Supervision scopes | 3 |
| Scope-project grants | 4 |
| Field progress templates | 2 |
| GROUP/WORK items | 5 |
| Weekly dossiers | 2 |
| Initial revisions | 2 |

The fixture includes:

- `QA_ADMIN_A`
- `QA_SUPERVISOR_A`
- `QA_REVIEWER_A`
- `QA_USER_PROJECT_A`
- `QA_USER_PROJECT_B`
- `QA-SUPERVISION-E2E-PROJECT-A`
- `QA-SUPERVISION-E2E-PROJECT-B`
- one RESULT dossier
- one NEXT_WEEK_PLAN dossier

All generated IDs are recorded in the manifest. QA credentials were rotated
after browser diagnostics, and captured server logs were redacted.

## 5. Runtime test matrix

| Test | Expected | Actual | Evidence | Status |
| --- | --- | --- | --- | --- |
| QA safety guard | Distinct approved database | Exact distinct local QA DB | Guard JSON output | PASS |
| Create QA database | New local fixed-name DB | Created; app DB unchanged | Creation helper output | PASS |
| Deploy existing migrations | All filesystem migrations applied | 9/9 applied | Migration status and metadata query | PASS |
| QA fixture | Transactional, isolated, manifested | Manifest `READY` | Fixture manifest | PASS |
| QA app origin | Dedicated port 3100 | Started on 3100 | QA server log | PASS |
| Browser login | Authenticated QA principal | `/api/auth/login` 200, dashboard 200 | QA server log | PASS |
| Open RESULT editor | Editor renders | Prisma P2022 missing column | Log and screenshot | **FAIL** |
| Save draft/reload | UI → action → DB → reload | Cannot reach editor | Runtime blocker above | BLOCKED |
| RESULT/NEXT isolation | Trace fields isolated | Not run | Editor unavailable | BLOCKED |
| Workflow | Submit/approve/revise/lock | Not run | Editor unavailable | BLOCKED |
| Race/optimistic lock | Controlled concurrency | Not run | Editor unavailable | BLOCKED |
| Preview parity | Latest saved data visible | Not run | Save path unavailable | BLOCKED |
| Word export | Opened and visually checked | Not run | No saved parity fixture | BLOCKED |
| PDF export | Opened and visually checked | Not run | No saved parity fixture | BLOCKED |
| Browser print | 3–5 full pages | Not run | Preview unavailable | BLOCKED |
| RBAC/cross-project | Controlled 403/404 | Not run | Runtime gate stopped at schema | BLOCKED |
| Responsive matrix | New screenshots at five sizes | Not run | Editor unavailable | BLOCKED |
| Route regression | Main routes smoke-tested | Not run in QA browser | Runtime gate stopped | BLOCKED |

The successful login does not count as save/reload or document runtime
evidence.

## 6. Runtime error evidence

The real browser navigated to the fixture dossier:

```text
/supervision/weekly/<qa-result-dossier-id>/edit
```

The server reached `getDossierForActor()` and failed in the Prisma relation
query before rendering the editor. The captured screenshot was opened and
visually inspected:

[runtime-migration-drift-error.png](../../artifacts/supervision-weekly-e2e/screenshots/runtime-migration-drift-error.png)

Server logs:

- [qa-server-allowed-origin.stdout.log](../../artifacts/supervision-weekly-e2e/server/qa-server-allowed-origin.stdout.log)
- [qa-server-allowed-origin.stderr.log](../../artifacts/supervision-weekly-e2e/server/qa-server-allowed-origin.stderr.log)

## 7. Browser-origin defect found and fixed

Before the schema blocker, the first QA browser attempt exposed a separate
development-runtime issue: Next.js rejected resources served through
`127.0.0.1` because the dev origin was not allowed. The project uses Next.js
16.2.7, so the bundled Next documentation was read before changing config.

`next.config.ts` now includes:

```ts
allowedDevOrigins: ["127.0.0.1"]
```

After restarting only the QA process:

- login hydrated correctly;
- `POST /api/auth/login` returned 200;
- `/dashboard` returned 200;
- navigation reached the Supervision Weekly server query.

This fix does not alter database behavior or production origins.

## 8. Workflow, parity, export, RBAC, and responsive evidence

No PASS is claimed for these sections:

- save/autosave/reload;
- double-submit and stale-tab conflict;
- `DRAFT → SUBMITTED → APPROVED → LOCKED`;
- `SUBMITTED → REVISION_REQUIRED → SUBMITTED`;
- Editor → DB → Preview → Word → PDF parity;
- Word opening and Print Preview;
- PDF page inspection;
- browser print;
- RBAC/IDOR/cross-project;
- responsive screenshots;
- smoke routes outside Supervision Weekly.

Continuing any of those would require bypassing the failed editor query or
mutating schema outside the repository migration process. Both would invalidate
the release-gate evidence.

## 9. Static and build checks

| Command | Result |
| --- | --- |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx tsc --noEmit` | PASS |
| Scoped Supervision Weekly ESLint | PASS with 25 warnings, 0 errors |
| Node/tsx unit tests | PASS, 11/11 |
| Vitest Supervision Weekly tests | PASS, 17/17 |
| `npm run build` | PASS |
| Global `npm run lint` | FAIL: 46 legacy errors and 194 warnings |

Global lint failures are in pre-existing root/scratch helper files and legacy
modules. They were not edited merely to make this gate pass. The build emitted
one existing Turbopack NFT warning involving dynamic filesystem tracing in the
local storage provider.

These static results do not override the runtime failure.

## 10. Files changed during this release-gate continuation

### Runtime/config

- `next.config.ts` — allow the dedicated local QA browser origin.

### QA safety and diagnostics

- `scripts/qa/assert-safe-qa-database.ts`
- `scripts/qa/assert-safe-qa-database.test.ts`
- `scripts/qa/create-isolated-qa-database.ts`
- `scripts/qa/configure-supervision-e2e-qa-env.ts`
- `scripts/qa/verify-supervision-weekly-qa-schema.ts`
- `scripts/qa/create-supervision-weekly-e2e-fixture.ts`
- `scripts/qa/rotate-supervision-e2e-credential.ts`
- `scripts/qa/inspect-supervision-weekly-column-drift.ts`

### Evidence/docs

- `artifacts/supervision-weekly-e2e/fixture-manifest-20260723.json`
- `artifacts/supervision-weekly-e2e/server/*`
- `artifacts/supervision-weekly-e2e/screenshots/runtime-migration-drift-error.png`
- this report.

Other modified files visible in the working tree predate or belong to the
broader Supervision Weekly stabilization work; they were preserved and not
reverted.

## 11. Cleanup result

Cleanup was **not run**.

Reason: the prompt requires fixture evidence to remain until the release-gate
artifacts have been collected. The runtime blocker prevented collection of the
mandatory save/workflow/export/RBAC evidence. Deleting the fixture now would
force an unnecessary recreation after the schema repair.

The fixture exists only in the isolated QA database and all created IDs are
recorded in the manifest. No application database record was created, updated,
or deleted. The isolated QA database itself was not deleted.

## 12. Remaining risks and unblock condition

1. A clean deployment cannot currently reproduce the Prisma schema required by
   runtime.
2. The application database contains schema changes absent from migration
   history.
3. Save, workflow, preview, Word, PDF, print, RBAC, and responsive gates remain
   unexecuted.
4. The retained QA fixture must be cleaned by manifest only after the complete
   gate is eventually run.
5. Global lint still has unrelated legacy errors.
6. Legacy QA scripts outside this gate contain unsafe hard-coded connection
   patterns and should be handled in a separate security cleanup, not silently
   reused.

To unblock this gate, explicit authorization is required to create and deploy
one new additive migration for the four nullable weekly columns. After that:

1. run the safety guard again;
2. deploy the new migration only to the isolated QA database first;
3. verify the four columns by read-only metadata query;
4. restart the QA application on port 3100;
5. resume the existing fixture and all blocked runtime matrices;
6. collect Word/PDF/print/RBAC/responsive evidence;
7. clean only manifest-owned QA records;
8. revise this report with the actual GO/NO-GO outcome.
