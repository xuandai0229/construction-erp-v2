# WM-13/WM-14 Transactional Outbox Ledger

| ID | Gate | Status | Evidence |
|---|---|---|---|
| OBX-01 | Worktree baseline | DONE | Preserved existing dirty worktree; no schema/migration operation. |
| OBX-02 | Typed-effect inventory | DONE | `OUTBOX_EFFECT_FAMILIES` enumerates all 20 `CoreTaskEffects` families. |
| OBX-03 | Runtime envelope validation | DONE | `validateWorkManagementOutboxMessage` and batch validator reject invalid/cloning-unsafe envelopes. |
| OBX-04 | Committed store and exact rollback | DONE | `exact batch rollback removes only the owning transaction batch`. |
| OBX-05 | Transaction stage lifecycle | DONE | Closed-stage and duplicate-ID tests use stable outbox error codes. |
| OBX-06 | Shared executor integration | DONE | Shared executor maps trusted typed effects and stages outbox messages after aggregate/effects staging. |
| OBX-07 | Existing UoW composition | DONE | `InMemoryCoreTaskUnitOfWork.run` is the actual process-local composition used through the shared `CoreTaskUnitOfWork` port by executor and integration suites. |
| OBX-08 | No visibility before commit | DONE | `staged completion remains IN_PROGRESS until final commit` observes zero committed messages in the real UoW callback. |
| OBX-09 | Successful publication | DONE | Five action scenarios commit typed-effect messages through executor/UoW/store. |
| OBX-10 | Outbox publication failure | DONE | `outbox publication failure rolls back aggregate effects and idempotency completion, then permits one retry and replay`. |
| OBX-11 | Idempotency publication failure | DONE | `idempotency completion publication failure rolls back only its exact outbox batch and preserves unrelated committed messages`. |
| OBX-12 | Replay, conflict and retry | DONE | Concrete five-slice replay/conflict table plus retry assertions leave committed batches unchanged on replay/conflict. |
| OBX-13 | Defensive cloning | DONE | Mapping, staging and committed-read tests mutate nested payloads without changing committed state. |
| OBX-14 | Five representative actions | DONE | CREATE_DRAFT, ASSIGN, CONFIRM_COMPLETION, ARCHIVE and EXECUTE_HANDOVER each execute through the shared path. |
| OBX-15 | 25-action decision matrix | DONE | `all twenty-five registered actions have one explicit mapper decision`. |
| OBX-16 | Focused outbox/UoW tests | DONE | Required command including `*outbox*.test.ts`, `*unit-of-work*.test.ts`, executor integration and finalization tests: 53 pass, 0 fail, 0 skipped. |
| OBX-17 | Full Work Management regression | DONE | `npx tsx --test src/lib/work-management/tests/*.test.ts`: 1160 pass, 0 fail, 0 skipped. |
| OBX-18 | Lint, TypeScript, diff check | DONE | Scoped lint, scoped/global TypeScript and `git diff --check` exited 0. |
| OBX-19 | Final report | DONE | `WORK_MANAGEMENT_WM13_WM14_OUTBOX_FINAL_REPORT.md` created with scope/limits. |
| OBX-20 | Frozen baseline | DONE | `WORK_MANAGEMENT_WM13_WM14_OUTBOX_FROZEN_BASELINE.md` records protected hashes and regressions. |
| OBX-21 | WM-13 closure | DONE | Process-local transactional outbox gate satisfied. |
| OBX-22 | WM-14 closure | DONE | Exact transaction verification gate satisfied. |
| OBX-23 | Payload runtime shape | DONE | `clone-safe non-record payloads fail closed at the outbox boundary`. |
| OBX-24 | Execution-batch consistency | DONE | Aggregate/action/correlation/idempotency/version mismatch cases fail `TASK_OUTBOX_BATCH_INVALID` without input mutation. |
| OBX-25 | Successful batch sealing | DONE | Sealed batch tokens cannot rollback; eight successful seals leave zero open rollback records. |
| OBX-26 | Publication error semantics | DONE | Controlled publication failure returns `TASK_OUTBOX_PUBLICATION_FAILED`, distinct from lifecycle/duplicate/validation errors. |
| OBX-27 | Actual UoW composition | DONE | `InMemoryCoreTaskUnitOfWork.run` stages outbox, publishes, rolls back exact token, publishes idempotency completion, then seals token. |
| OBX-28 | Final hardening closure | DONE | 53 focused pass; 1160 all-WM pass; lint/typecheck/diff check pass. |
| OBX-29 | Deterministic post-staging barrier | DONE | `afterStagingBeforeFinalization` is called after staging and before mutex acquisition. |
| OBX-30 | Same-version staged-writer proof | DONE | Both ASSIGN writers are observed staged and IN_PROGRESS before release; one exact winner commits. |
| OBX-31 | Concurrent CREATE full-resource proof | DONE | Both CREATE_DRAFT operations stage before release; winner task/effects/outbox/idempotency is asserted. |
| OBX-32 | Prior unrelated commit preservation | DONE | T1 stages, T2 commits Task B, then T1 fails; Task B/effects/outbox/idempotency deep-equal committed snapshot. |
| OBX-33 | Commit-time stale-CAS proof | DONE | T1 and T2 stage from V; T2 commits V+1 before T1 finalizes and T1 fails `TASK_CONCURRENCY_CONFLICT`. |
| OBX-34 | Deterministic atomic visibility | DONE | `beforeVisibleCommit` signal proves pre-commit snapshot, then release proves fully committed snapshot without timer scheduling. |
| OBX-35 | Idempotency publication error semantics | DONE | Controlled completion publication failure is `TASK_IDEMPOTENCY_PUBLICATION_FAILED`; resources rollback and retry/replay pass. |
| OBX-36 | Focused UoW gate | DONE | Focused command explicitly includes all `*unit-of-work*.test.ts` files. |
| OBX-37 | Final test-evidence closure | DONE | Deterministic audit has no `setTimeout`, `setImmediate`, `sleep`, `any`, `as any`, or `as never` in UoW tests. |

Commands: `npx tsx --test src/lib/work-management/tests/*outbox*.test.ts src/lib/work-management/tests/*unit-of-work*.test.ts src/lib/work-management/tests/in-memory-idempotency-executor-integration.test.ts src/lib/work-management/tests/in-memory-idempotency-transaction-finalization.test.ts`; `npx tsx --test src/lib/work-management/tests/*.test.ts`; `npx eslint` on changed outbox source/tests; `npx tsc -p tsconfig.work-management.json`; `npx tsc --noEmit`; `git diff --check`.

Blocker: None for process-local behavior. Schema remains **NO-GO**; database outbox, dispatcher/worker and exactly-once delivery are not implemented or claimed.
