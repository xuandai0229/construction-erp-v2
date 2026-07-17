# WM-13/WM-14 Outbox Frozen Baseline

## Process-local composition

Exact file: `src/lib/work-management/infrastructure/in-memory-core-task-unit-of-work.ts`  
Exact symbol: `InMemoryCoreTaskUnitOfWork.run`  
Final hash: `e968000f59c7920cf090aa1d934aae2c57fcc5f1`

Successful finalization order: executor stages aggregate mutation, typed effects, outbox batch and idempotency completion; `run` publishes outbox, applies aggregate/effects, publishes idempotency completion, then calls `sealCommittedBatch`.

Rollback order: discard completion; rollback the exact published outbox token if one exists; otherwise discard the transaction-local stage; restore aggregate/effect snapshots. No operation follows successful idempotency publication except token sealing.

## Protected files

| File | Final hash | Purpose |
|---|---|---|
| `application/core-task-outbox.ts` | `77baf560614038f5e9f7b8f60a40d80afaba0fb0` | Typed mapper; payload and execution-batch runtime validation |
| `application/core-task-executor.ts` | `9e6597911ff5180f56bba0dac7caeb20229b0e44` | Shared executor staging integration |
| `application/core-task-ports.ts` | `751de3b606d2d956b6e6a452137746f7c53612e7` | Transaction-scoped outbox port |
| `application/core-task-effects.ts` | `23db66efd7a067e7d9add15370063bd492661c72` | Trusted typed-effect source |
| `application/action-registry.ts` | `58bc84ad5f4207f58d196c6ca03883c7e346afb4` | Canonical registered-action policy |
| `errors/codes.ts` | `c18ca33c05ab794aaba80cbb5b8b514db0ab1ba3` | Stable outbox and idempotency-publication error codes |
| `infrastructure/in-memory-outbox.ts` | `780a9828b2e4f6700ec3cc61871acac4c4d08486` | Committed store, exact rollback and sealing |
| `infrastructure/in-memory-outbox-transaction.ts` | `84aad137aa987c891f611b1f63ae44edd13de952` | Transaction-local outbox stage |
| `infrastructure/in-memory-core-task-unit-of-work.ts` | `e968000f59c7920cf090aa1d934aae2c57fcc5f1` | Actual composition, deterministic post-staging/pre-visibility hooks |
| `infrastructure/in-memory-idempotency-transaction.ts` | `3148e74f1b4aa807420147571e755f82ae1a0aae` | Transaction-scoped completion publication semantics |
| `tests/outbox-mapping.test.ts` | `c88e94c1b1765d86fad6f1d1b3578f1499ec3d46` | Payload/batch/action mapping proof |
| `tests/outbox-transaction.test.ts` | `461571121fd8307ffde77a8a39ed06680fd529bb` | Stage, exact rollback and sealing proof |
| `tests/in-memory-idempotency-executor-integration.test.ts` | `2777a923104db662f921faae58aeb9c0dff0b48f` | Executor + actual UoW integration proof |
| `tests/in-memory-idempotency-transaction-finalization.test.ts` | `2524772f0a4e991c0fc3086763f586856a2ff6a3` | Completion finalization proof |
| `tests/in-memory-core-task-unit-of-work-concurrency.test.ts` | `9c8a4b0f6e679ec17b9ea27f7e4cec73b2823547` | Deterministic concurrency, stale-CAS and atomic-visibility proof |

Frozen test contract: deterministic barriers only; timer-based race orchestration is forbidden. Same-version writers must both stage before finalization. The unrelated transaction must commit before the failing transaction finalizes. Focused gate must include all `*unit-of-work*.test.ts` files.

Required regression commands: focused outbox/UoW suite (`*outbox*.test.ts`, `*unit-of-work*.test.ts`, executor integration and finalization), all Work Management tests, scoped/global TypeScript and `git diff --check`.

Process-local transactional staging is implemented. Database outbox and dispatcher/worker are not implemented. Exactly-once delivery is not claimed. Schema remains **NO-GO**.
