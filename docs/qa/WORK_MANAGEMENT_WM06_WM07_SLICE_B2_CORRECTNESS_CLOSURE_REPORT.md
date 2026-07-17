# WM-06B2/WM-07B2 Correctness Closure Report

## 1. Conclusion

**Slice B2 Idempotency Matrix Integrity Gate: DONE.**

**Slice B2 Final Verification Matrix Gate: DONE.**

**Slice B2 Final Closure Verification Gate: DONE.** The four B2 actions remain REOPEN, CANCEL, ARCHIVE, and RESTORE. Slice C and WM-08/WM-09 were not started. Schema remains **NO-GO**.

## 2. Corrected defects

- `completionHistory` is append-only. `CONFIRM_COMPLETION` appends a record while preserving the current completion projection.
- `REOPEN` clears only current `completedById`, `completedAt`, and `completionSubmissionId`; it retains completion/submission/review history, progress, deadline, and assignee.
- An active archive record is the restore source of truth. The projection is a checked cache: missing, foreign, stale, malformed, or mismatched snapshots fail closed.
- Archive records are immutable; RESTORE appends `restoreHistory` instead of mutating an archive record.
- Lifecycle-bearing intents use `TaskLifecycle`; B2 effect arrays are required.
- RESTORE now uses the explicit `RESTORE_ACTIVE_ARCHIVE` transition target rather than exposing DRAFT as a fake persistable target.
- B2 mutations run through deferred persistence after `idempotency.begin`; guard failures do not enter mutation staging or generate B2 IDs.

## 3. Exact evidence

| Action | Success/state/effects | Error/no mutation | Rollback/replay/immutability |
|---|---|---|---|
| REOPEN | `REOPEN creates append-only closure history while retaining B1 result and completion history` | `REOPEN invalid lifecycle` | `REOPEN rollback`, `REOPEN replay`, `REOPEN clock and immutability` |
| CANCEL | `CANCEL records reason without destroying result history` | `CANCEL invalid lifecycle` | `CANCEL rollback`, `CANCEL replay`, `CANCEL clock and immutability` |
| ARCHIVE | `ARCHIVE and RESTORE preserve the trusted pre-archive state and append generations` | `ARCHIVE invalid lifecycle`; `archive currentness fails closed for missing, foreign, stale, malformed, and projection-mismatched records` | `ARCHIVE rollback`, `ARCHIVE replay`, `ARCHIVE clock and immutability` |
| RESTORE | `ARCHIVE and RESTORE preserve the trusted pre-archive state and append generations` | `RESTORE invalid lifecycle`; archive-currentness test | `RESTORE rollback`, `RESTORE replay`, `RESTORE clock and immutability` |

`Complete, reopen, and complete again separates the current projection from append-only completion history` proves two immutable completion records, with the current projection pointing to the second submission.

## 4. Direct workflow proof

`B2 direct lifecycle policies reject invalid source states and never expose a fake restore state` proves REOPEN, CANCEL, ARCHIVE, and RESTORE policy behavior. RESTORE declares `RESTORE_ACTIVE_ARCHIVE` and has no fabricated `nextState`.

## 5. Verification results

| Suite | Tests | Pass | Fail | Skipped |
|---|---:|---:|---:|---:|
| B2 closure lifecycle (core + verification) | 134 | 134 | 0 | 0 |
| B1 regression | 26 | 26 | 0 | 0 |
| Slice A regression | 50 | 50 | 0 | 0 |
| Workflow | 8 | 8 | 0 | 0 |
| Registry | 614 | 614 | 0 | 0 |
| All Work Management | 887 | 887 | 0 | 0 |

Scoped lint, `tsc -p tsconfig.work-management.json`, and `tsc --noEmit` all exited 0.

## 5a. Final verification matrices and idempotency integrity reconciliation

The matrix runner reports **110 tests, 110 pass, 0 fail, 0 skipped**. Together with the original closure suite, the B2 glob reports **134 tests, 134 pass, 0 fail, 0 skipped**.

The previous 16 synthetic identity-conflict cases were invalid evidence: their stored identities differed in `key`, `projectId`, and fingerprint in addition to the named field. They were corrected, not hidden: each replacement now receives the incoming `IdempotencyRequest` and changes exactly one field while asserting that every other identity field is equal. The fake records `inspects` and `lastInspectedRequest`, so strict schema rejection is proven to happen before inspection.

| Matrix | REOPEN | CANCEL | ARCHIVE | RESTORE |
|---|---:|---:|---:|---:|
| Authorization: permission/scope/relation/confidential | 4/4 | 4/4 | 4/4 | 4/4 |
| Expected version | PASS | PASS | PASS | PASS |
| Strict schema: four metadata groups | 4/4 | 4/4 | 4/4 | 4/4 |
| Identity conflict: actor/company/task/fingerprint | 4/4 | 4/4 | 4/4 | 4/4 |
| Real valid-command fingerprint conflict | 1/1 | 1/1 | 1/1 | 1/1 |
| Exact identity replay control | 1/1 | 1/1 | 1/1 | 1/1 |
| Idempotency IN_PROGRESS | PASS | PASS | PASS | PASS |
| Begin failure generates no ID | PASS | PASS | PASS | PASS |

Every denial asserts its exact stable code and zero unit-of-work runs, effects, IDs, and mutation. The exact named tests are in `closure-lifecycle-verification-matrix.test.ts`:

- `B2 authorization matrix uses each registered action policy`
- `B2 expected-version matrix rejects before begin and ID generation`
- `B2 strict-schema matrix rejects all four server-owned metadata groups before inspect`
- `B2 strict-schema security fields are individually rejected before inspect`
- `B2 idempotency identity conflicts alter exactly one field`
- `B2 real valid-command fingerprint conflicts and exact replay controls`
- `B2 idempotency in-progress and begin-order matrices are side-effect free`

The individual strict-schema cases cover every listed server-owned field, including all RESTORE fields (`actorId`, `restoredById`, `restoredAt`, archive identifiers/generation, target state fields, snapshot/history fields, and completion fields). Every strict parse denial asserts `TASK_COMMAND_INVALID`, `inspects = 0`, zero lookup/begin/ID/unit-of-work activity, and an unchanged aggregate.

## 6. Files changed

- `src/lib/work-management/tests/closure-lifecycle-verification-matrix.test.ts`
- `docs/qa/WORK_MANAGEMENT_WM06_WM07_SLICE_B2_LEDGER.md`
- `docs/qa/WORK_MANAGEMENT_MANDATORY_EXECUTION_LEDGER.md`
- `docs/qa/WORK_MANAGEMENT_WM06_WM07_SLICE_B2_CORRECTNESS_CLOSURE_REPORT.md`

Application behavior was not modified for this integrity reconciliation.

## 7. Remaining work

WM-06 and WM-07 stay PENDING overall solely for Slice C handover behavior/tests. No database, Prisma, schema, migration, API, UI, commit, or push operation occurred.
