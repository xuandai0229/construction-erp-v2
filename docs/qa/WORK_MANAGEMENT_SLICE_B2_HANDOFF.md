# Work Management Slice B2 handoff

## Frozen B1 contracts

- `APPROVE_RESULT` changes review to `RESULT_APPROVED`; it does not complete a task.
- Submission and review-decision histories are append-only; only the current submission may be reviewed.
- Review/approval/completion relations are resolved by the server context and privileged scope does not bypass relation-only actions.
- Completion requires an approved current submission and all typed readiness guards.

## B2 may extend additively

- `src/lib/work-management/application/core-task-executor.ts`
- `src/lib/work-management/application/core-task-effects.ts`
- `src/lib/work-management/application/core-task-idempotency.ts`
- `src/lib/work-management/application/core-task-ports.ts`
- `src/lib/work-management/domain/types.ts`
- `src/lib/work-management/domain/workflow.ts`
- `src/lib/work-management/domain/transition-policies.ts`
- `src/lib/work-management/validation/schemas.ts`
- `src/lib/work-management/errors/codes.ts`

Each extension must use the existing shared pipeline and preserve all existing Slice A/B1 semantics.

## B2 must not alter semantic contracts

- `src/lib/work-management/application/result-review-invariants.ts`
- The 12 Slice A actions or four Slice B1 actions.
- Submission append-only and review-decision append-only history.
- `APPROVE_RESULT` being distinct from completion and the completion-readiness guards.
- Relation-required actor policies, idempotency isolation, transaction rollback, or typed B1 effects.
- Confidentiality guards, existing error-code meanings, or existing state-axis meanings.
- B1 closure assertions and frozen B1 contracts.

## Required B1 regressions

```powershell
npx tsx --test src/lib/work-management/tests/*result-review*.test.ts
npx tsx --test src/lib/work-management/tests/core-task-executor.test.ts src/lib/work-management/tests/core-task-transition.test.ts src/lib/work-management/tests/core-task-idempotency-boundary.test.ts
npx tsx --test src/lib/work-management/tests/workflow.test.ts
npx tsx --test src/lib/work-management/tests/action-registry.test.ts src/lib/work-management/tests/action-registry-security.test.ts src/lib/work-management/tests/action-registry-semantics.test.ts
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
- Cross-task and stale submission identifiers currently fail closed in the application layer. Future API adapters must not reveal whether a foreign submission identifier exists; external error mapping must preserve non-enumerability.
