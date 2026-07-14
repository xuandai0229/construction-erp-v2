# Work Management Slice B2 handoff

## Frozen B1 contracts

- `APPROVE_RESULT` changes review to `RESULT_APPROVED`; it does not complete a task.
- Submission and review-decision histories are append-only; only the current submission may be reviewed.
- Review/approval/completion relations are resolved by the server context and privileged scope does not bypass relation-only actions.
- Completion requires an approved current submission and all typed readiness guards.

## Shared files B2 may extend

- `src/lib/work-management/application/core-task-executor.ts`
- `src/lib/work-management/domain/workflow.ts`
- `src/lib/work-management/tests/result-review-executor.test.ts` only for regression-compatible shared helpers.

## Files B2 must not semantically alter

- `src/lib/work-management/application/result-review-invariants.ts`
- B1 B1 closure assertions and frozen B1 contracts.

## Required B1 regressions

```powershell
npx tsx --test src/lib/work-management/tests/*result-review*.test.ts
npx tsx --test src/lib/work-management/tests/core-task-executor.test.ts src/lib/work-management/tests/core-task-transition.test.ts src/lib/work-management/tests/core-task-idempotency-boundary.test.ts
npx tsx --test src/lib/work-management/tests/*.test.ts
```

## B2 actions

- `REOPEN`
- `CANCEL`
- `ARCHIVE`
- `RESTORE`

## Initial risks and invariants

- Preserve append-only B1 histories and completed metadata.
- Archive/restore must preserve a valid pre-archive lifecycle state.
- Cancellation and reopening must never bypass B1 authorization, expected-version, idempotency, or transaction semantics.
