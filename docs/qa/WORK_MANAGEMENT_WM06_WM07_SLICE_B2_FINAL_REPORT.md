# WM-06B2/WM-07B2 Closure Lifecycle Report

## 1. Conclusion

Slice B2 status: **DONE**. The shared executor executes REOPEN, CANCEL, ARCHIVE, and RESTORE with Action Registry policy, transaction staging, and the existing idempotency boundary. The final idempotency-integrity reconciliation also passed: each synthetic conflict changes exactly one identity field, real valid command changes produce a canonical fingerprint conflict, and strict schemas reject before idempotency inspection. Schema status remains **NO-GO**; no Prisma/schema/database operation occurred.

## 2. Implemented behavior

- REOPEN records an append-only reopen record and typed intent, returns the task to executable work, and preserves submission/review/completion history.
- CANCEL records cancellation actor/time/reason without deleting result history.
- ARCHIVE captures a server-derived pre-archive state snapshot, creates an active archive ID and monotonic generation, and emits an archive intent without a notification.
- RESTORE accepts no target state from the client. It requires the current archive record and trusted snapshot, restores that exact state, closes the archive record, and emits a restore intent.

## 3. Security and invariants

Strict schemas reject server-owned metadata. Permission, scope, actor relation, confidentiality, expected version, lifecycle, snapshot currentness, and policy checks run before transactional mutation. Denials leave aggregate storage, effects, and idempotency completion unchanged.

## 4. History preservation

`submissions`, `reviewDecisions`, completion metadata, and prior archive records are retained. Tests prove the old archive record remains after restore and a second archive creates generation 2 rather than overwriting generation 1.

## 5. Test evidence

| Suite | Runner tests | Pass | Fail | Skip |
|---|---:|---:|---:|---:|
| Slice B2 closure lifecycle | 134 | 134 | 0 | 0 |
| Slice A regression | 50 | 50 | 0 | 0 |
| Slice B1 regression | 26 | 26 | 0 | 0 |
| Workflow regression | 8 | 8 | 0 | 0 |
| Registry regression | 614 | 614 | 0 | 0 |
| All Work Management | 887 | 887 | 0 | 0 |

Named B2 matrix coverage includes four invalid-lifecycle cases; permission/scope/relation/version/malicious metadata denial; four rollback cases; four replay cases; four single-clock/immutability cases; actor-only/company-only/task-only/fingerprint-only conflicts (4/4 each); real command-fingerprint conflicts (4/4); exact replays (4/4); and strict-schema-before-inspect proof.

## 6. Commands run

```text
npx tsx --test src/lib/work-management/tests/*closure-lifecycle*.test.ts
npx tsx --test src/lib/work-management/tests/result-review-executor.test.ts
npx tsx --test src/lib/work-management/tests/core-task-executor.test.ts src/lib/work-management/tests/core-task-transition.test.ts src/lib/work-management/tests/core-task-idempotency-boundary.test.ts
npx tsx --test src/lib/work-management/tests/workflow.test.ts
npx tsx --test src/lib/work-management/tests/action-registry.test.ts src/lib/work-management/tests/action-registry-security.test.ts src/lib/work-management/tests/action-registry-semantics.test.ts
npx tsx --test src/lib/work-management/tests/*.test.ts
npx eslint src/lib/work-management/tests/closure-lifecycle-executor.test.ts src/lib/work-management/tests/closure-lifecycle-verification-matrix.test.ts src/lib/work-management/tests/workflow.test.ts
npx tsc -p tsconfig.work-management.json
npx tsc --noEmit
```

Every command exited 0.

## 7. Files changed

- `src/lib/work-management/application/core-task-executor.ts`
- `src/lib/work-management/application/core-task-effects.ts`
- `src/lib/work-management/domain/types.ts`
- `src/lib/work-management/domain/workflow.ts`
- `src/lib/work-management/errors/codes.ts`
- `src/lib/work-management/tests/closure-lifecycle-executor.test.ts`
- `src/lib/work-management/tests/closure-lifecycle-verification-matrix.test.ts`
- `docs/qa/WORK_MANAGEMENT_WM06_WM07_SLICE_B2_LEDGER.md`
- `docs/qa/WORK_MANAGEMENT_WM06_WM07_SLICE_B2_FINAL_REPORT.md`

## 8. Overall ledger boundary

WM-06 and WM-07 remain **PENDING** overall: Slice A, B1 and B2 are DONE; Slice C handover actions remain. WM-08/WM-09 were not started. No B2 follow-on scope was implemented.
