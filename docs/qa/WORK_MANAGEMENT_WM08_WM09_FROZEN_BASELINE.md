# WM-08/WM-09 In-Memory Idempotency Frozen Baseline

## Frozen source and tests

| File | Final hash | Purpose |
|---|---|---|
| `application/core-task-idempotency.ts` | `6374c606f29417a5559d9ad83cc570e53d1926fb` | Existing port, canonical fingerprint, shared identity equality. |
| `application/core-task-executor.ts` | `1671cd73e6ecd488f6906d3872948509359172c0` | Reuses the shared identity equality function; action semantics unchanged. |
| `errors/codes.ts` | `1035ab1396b96f5f100c8cd6354332b1a87a7051` | Additive stable lifecycle errors. |
| `infrastructure/in-memory-idempotency.ts` | `45974ad2b182396c6b9f747f1fcda50155740f30` | Process-local in-memory state machine. |
| `infrastructure/in-memory-idempotency-transaction.ts` | `4844bba1a17906db65e48d1f361ae2d99fb64546` | Transaction-scoped completion staging and final publication. |
| `tests/in-memory-idempotency-state.test.ts` | `4724c9bfad219fd6a260728f2da7354cd332766b` | State/lifecycle ownership tests. |
| `tests/in-memory-idempotency-concurrency.test.ts` | `c978b0fe960f6410697a00fa95c8ee9685785b90` | Atomic and identity-isolation tests. |
| `tests/in-memory-idempotency-immutability.test.ts` | `ee1066e1aa50c2de2954eee98bc467e9de373e66` | Defensive-cloning tests. |
| `tests/in-memory-idempotency-executor-integration.test.ts` | `3641b7ead4dc1cd057afe38d33d19cb9fa76eeaf` | In-memory UoW composition that calls `completion.publish()` after staged task/effect finalization; Slice A/B1/B2/C integration, rollback, and retry tests. |
| `tests/in-memory-idempotency-transaction-finalization.test.ts` | `7ba0788f35760e2f34d7840d8cee502deef468aa` | Completion staging, publication, and unrelated-record rollback tests. |

## Frozen semantics

Storage lookup uses the raw idempotency `key`. Reservation identity is exactly `key`, `action`, `actorId`, `companyId`, `taskId`, `projectId`, and `fingerprint`. A same-key identity mismatch conflicts; an exact completed identity replays an independent clone. `begin` is process-local atomic because it contains no await between Map lookup and write. `abort` removes only an exact IN_PROGRESS reservation and never removes a completed record.

This class is not distributed-safe, has no TTL, and has no database, Prisma, Redis, worker, or lock behavior. Schema remains **NO-GO**.

## Transaction finalization

A transaction-scoped completion is not a committed replay record. The executor's existing `transaction.idempotency.complete` call stages a cloned completion locally. The in-memory unit-of-work composition publishes that completion only after aggregate and effects finalization succeeds. A rollback discards the stage and permits the matching IN_PROGRESS reservation to be aborted and retried. A committed completed record remains immutable and cannot be deleted by abort.

## Required regressions

`npx tsx --test src/lib/work-management/tests/*in-memory-idempotency*.test.ts`  
`npx tsx --test src/lib/work-management/tests/*.test.ts`  
`npx tsc -p tsconfig.work-management.json`  
`npx tsc --noEmit`

Future work may extend adapters additively only when it preserves the frozen identity, lookup-key, inspect, begin, complete, abort, replay, conflict, cloning, and rollback semantics.
