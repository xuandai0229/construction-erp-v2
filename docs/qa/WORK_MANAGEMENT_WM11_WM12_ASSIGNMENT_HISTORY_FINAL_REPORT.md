# WM-11/WM-12 Assignment History Aggregate & Tests Report

## 1. Conclusion

WM-11: DONE. WM-12: DONE. The assignment-history aggregate is pure application code; schema, migrations, database mutation, APIs and UI were not changed. Schema remains **NO-GO**.

## 2. Source of truth and boundary

`Task.primaryAssigneeId` is the sole current assignee projection. `assignedById` is provenance only. `TaskParticipant`, ProjectMember, reviewer, approver, delegation and handover-request projections never act as a fallback assignee source. Assignment history is append-only audit evidence, not a resolver.

## 3. Aggregate implementation

`application/assignment-history.ts` supplies `TaskAssignmentHistoryRecord`, validation, next-generation calculation and append-only creation. Each record has identity, task ID, generation, prior/current assignee, assigning actor, source action, optional handover ID, reason and effective time.

Validation fails closed with stable `TASK_ASSIGNMENT_HISTORY_*` errors for duplicate IDs, task mismatch, non-positive/gapped generation, broken chains, invalid source/linkage and projection mismatch. A legacy task may have a non-null `primaryAssigneeId` with no history; its first audited reassignment appends generation one without fabricating a bootstrap event.

## 4. Writer policy

Only `ASSIGN` and `EXECUTE_HANDOVER` call `appendAssignmentHistoryRecord` in the shared executor. ASSIGN records the trusted actor as `assignedById`. EXECUTE_HANDOVER records the effective SYSTEM actor and the active handover ID. The remaining 23 registered actions preserve history exactly.

## 5. Exact test traceability

| Concern | Exact test |
|---|---|
| legacy first tracked change | `legacy assigned projection appends the first tracked reassignment without fabricating bootstrap history` |
| initial ASSIGN | `initial ASSIGN appends generation one from null to the validated assignee` |
| immutable reassignment | `reassignment appends one immutable history record and advances generation` |
| no resolver fallback | `assignment history never replaces the primary-assignee projection` |
| malformed records | `malformed assignment history fails closed before mutation` (15 named Node subtests) |
| malformed load before mutation | `malformed assignment history fails closed before idempotency begin or transaction mutation` |
| concurrent writers | `two competing ASSIGN commands commit one append-only generation and reject the stale writer` |
| ASSIGN exact record | `all twelve Slice A actions save exact policy state and typed effects` / `ASSIGN: success` |
| handover exact record | `APPROVE_HANDOVER and EXECUTE_HANDOVER transfer the assignee atomically only at execution` |
| handover non-writers | `handover pre-execution actions preserve assignment history` |
| B1 preservation | `SUBMIT appends immutable submission and does not approve or complete`; `REQUEST_CHANGES records append-only review decision and preserves submission`; `APPROVE_RESULT records approval without completion`; `CONFIRM_COMPLETION completes only current approved submission with readiness` |
| B2 preservation | `REOPEN creates append-only closure history while retaining B1 result and completion history`; `CANCEL records reason without destroying result history`; `ARCHIVE and RESTORE preserve the trusted pre-archive state and append generations` |
| replay/rollback/retry | idempotency tests `Slice A ASSIGN replay and conflict`, `Slice A ASSIGN abort then retry`, and `Slice A ASSIGN post-complete rollback` |

## 6. Test results

| Suite | Runner-reported tests | Pass | Fail | Skipped |
|---|---:|---:|---:|---:|
| Assignment-history focused | 20 | 20 | 0 | 0 |
| WM-10 source of truth | 15 | 15 | 0 | 0 |
| Idempotency | 38 | 38 | 0 | 0 |
| Slice A | 52 | 52 | 0 | 0 |
| Slice B1 | 26 | 26 | 0 | 0 |
| Slice B2 | 134 | 134 | 0 | 0 |
| Slice C | 154 | 154 | 0 | 0 |
| Workflow | 12 | 12 | 0 | 0 |
| Registry | 614 | 614 | 0 | 0 |
| All Work Management | 1122 | 1122 | 0 | 0 |

Commands run with exit code 0:

```text
npx tsx --test src/lib/work-management/tests/*assignment-history*.test.ts
npx tsx --test src/lib/work-management/tests/assignment-source-of-truth.test.ts
npx tsx --test src/lib/work-management/tests/*in-memory-idempotency*.test.ts
npx tsx --test src/lib/work-management/tests/core-task-executor.test.ts src/lib/work-management/tests/core-task-transition.test.ts src/lib/work-management/tests/core-task-idempotency-boundary.test.ts
npx tsx --test src/lib/work-management/tests/result-review-executor.test.ts
npx tsx --test src/lib/work-management/tests/*closure-lifecycle*.test.ts
npx tsx --test src/lib/work-management/tests/handover-executor.test.ts src/lib/work-management/tests/handover-history-integrity.test.ts src/lib/work-management/tests/handover-integration.test.ts
npx tsx --test src/lib/work-management/tests/workflow.test.ts
npx tsx --test src/lib/work-management/tests/action-registry.test.ts src/lib/work-management/tests/action-registry-security.test.ts src/lib/work-management/tests/action-registry-semantics.test.ts
npx tsx --test src/lib/work-management/tests/*.test.ts
npx eslint <changed WM files>
npx tsc -p tsconfig.work-management.json
npx tsc --noEmit
```

## 7. Files changed

- `src/lib/work-management/application/assignment-history.ts`
- `src/lib/work-management/application/core-task-executor.ts`
- `src/lib/work-management/errors/codes.ts`
- assignment-history tests and affected Slice A/B1/B2/C fixtures/regressions
- WM-11/WM-12 ledger, frozen baseline and this report

## 8. Final audit

`rg` confirmed the only executor append calls are the ASSIGN and EXECUTE_HANDOVER behavior branches. `git diff --check` passed. No production or QA database command was run. No migration, schema, API, UI, commit or push was performed.
