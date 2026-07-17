# WM-13/WM-14 Transactional Outbox Final Report

## Conclusion

**WM-13 Final Hardening Gate: DONE**

**WM-14 Final Gap Verification Gate: DONE**

**WM-13 Final Gate: DONE**

**WM-14 Final Gate: DONE**

A process-local transactional outbox is integrated into the existing shared task executor and its existing Unit-of-Work composition. On successful non-replay execution, trusted typed effects are mapped, staged, and committed with aggregate/effect/idempotency completion. Failure rolls back the exact committed batch and releases the idempotency reservation for retry.

## Implemented boundary

- Runtime envelope/batch validation, unique message IDs, contiguous per-execution sequence and clone-safe payloads.
- Transaction-local `OPEN` / `PUBLISHED` / `DISCARDED` stage lifecycle.
- Token-owned committed-batch rollback: a failed transaction removes only its own batch.
- Shared executor maps only typed effects, never raw client commands; replay, validation, authorization, workflow and concurrency denials do not map or stage messages.
- The concrete UoW composes task mutation, typed effects, outbox publication and idempotency completion with rollback.

## Exact verification

Focused command:

```text
npx tsx --test src/lib/work-management/tests/*outbox*.test.ts src/lib/work-management/tests/in-memory-idempotency-executor-integration.test.ts
```

Runner summary: **37 tests, 37 pass, 0 fail, 0 skipped**.

Hardening runner summary: **42 tests, 42 pass, 0 fail, 0 skipped**.

Final deterministic focused summary: **53 tests, 53 pass, 0 fail, 0 skipped**.

Named integration evidence includes:

- `outbox publication failure rolls back aggregate effects and idempotency completion, then permits one retry and replay`
- `idempotency completion publication failure rolls back only its exact outbox batch and preserves unrelated committed messages`
- `exact batch rollback removes only the owning transaction batch`
- `staged completion remains IN_PROGRESS until final commit`
- `all twenty-five registered actions have one explicit mapper decision`
- `clone-safe non-record payloads fail closed at the outbox boundary`
- `execution batch consistency fails closed without mutating input`
- `successful Unit-of-Work finalization seals its outbox rollback token`
- `actual process-local Unit-of-Work composition seals outbox rollback metadata after success`

Representative executor/UoW scenarios cover CREATE_DRAFT, ASSIGN, CONFIRM_COMPLETION, ARCHIVE and EXECUTE_HANDOVER; each has successful commit, replay/no additional message and a transaction failure/retry path in the concrete integration suite.

## Regression and quality gates

- All Work Management: `npx tsx --test src/lib/work-management/tests/*.test.ts` → **1160 pass, 0 fail, 0 skipped**.
- Scoped lint → exit 0.
- Scoped TypeScript → exit 0.
- Global TypeScript → exit 0.
- `git diff --check` → exit 0.

## Scope limits

Process-local transactional staging: implemented. The actual composition is `InMemoryCoreTaskUnitOfWork.run`: stage aggregate/effects/outbox/idempotency completion; publish outbox; apply aggregate/effects; publish idempotency completion; seal token. On failure it discards completion, rolls back the exact published outbox token, then restores aggregate/effects snapshots.

Database outbox: not implemented. Dispatcher/worker: not implemented. Exactly-once delivery: not claimed. Schema is **NO-GO** and was not changed.

## Deterministic test orchestration

Previous concurrency tests used timing fallback and did not prove every intended interleaving deterministically. Final tests use explicit barriers and inspect task, effects, outbox and idempotency resources for both winner and loser.

## Post-staging pre-finalization barrier

`afterStagingBeforeFinalization(transactionId)` runs after all resources are staged and before finalization mutex acquisition. It is process-local test support, not an application port.

## Same-version staged writers

Both writers stage from version V and remain `IN_PROGRESS` before release. One commits V+1; the loser fails `TASK_CONCURRENCY_CONFLICT` and leaves no effects, outbox batch or completed idempotency record.

## Concurrent CREATE resource isolation

Two CREATE_DRAFT operations for one ID both stage before release. The winner alone owns the created task, effect batch, outbox execution batch and completed idempotency key.

## T1 stage, T2 commit, T1 fail

The test pauses T1 after staging Task A, permits T2 to fully commit Task B, then fails T1. Task B, its effects, outbox messages and completed idempotency record are deep-equal before and after T1 failure.

## Commit-time stale-CAS proof

T1 and T2 stage from the same version. T2 finalizes first; T1 then fails at commit-time revalidation and cannot restore its stale projection.

## Atomic visibility without scheduling guesses

`beforeVisibleCommit` gives a deterministic pre-apply snapshot. After explicit release, task/effects/outbox/idempotency become visible together. There is no timer or `setImmediate` orchestration.

## Idempotency-publication error semantics

`TASK_IDEMPOTENCY_PUBLICATION_FAILED` identifies controlled process-local completion publication failure. It is distinct from stale CAS and identity conflict, and rollback/retry/replay are asserted.

## Focused UoW regression

```text
npx tsx --test src/lib/work-management/tests/*outbox*.test.ts src/lib/work-management/tests/*unit-of-work*.test.ts src/lib/work-management/tests/in-memory-idempotency-executor-integration.test.ts src/lib/work-management/tests/in-memory-idempotency-transaction-finalization.test.ts
```

Result: 53 pass, 0 fail, 0 skipped.

## Final test-evidence closure

WM-13 Final Test-Evidence Gate: **DONE**. WM-14 Deterministic Concurrency Verification Gate: **DONE**. No timeout-based race orchestration or `any` escape exists in the UoW closure tests.
