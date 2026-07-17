# WM-06/WM-07 Slice C ledger

| ID | Item | Status | Files | Commands | Evidence | Blocker |
|---|---|---|---|---|---|---|
| C-01 | Worktree and B2 frozen baseline | DONE | B2 frozen baseline | git status/hash-object | Dirty B2 worktree preserved; baseline recorded. | None |
| C-02 | Mandatory ledger reconciliation | DONE | mandatory ledger | ledger review | Main rows were reconciled before Slice C. | None |
| C-03 | Registry and actor-policy inspection | DONE | registry/actor policy | rg/tests | Registry is the policy source for all five actions. | None |
| C-04 | Handover state model | DONE | executor/types/workflow | tsc/tests | Separate handover axis supports pending, approved, rejected, effective. | None |
| C-05 | Handover request history model | DONE | executor/effects | handover tests | Immutable append-only request records and generations. | None |
| C-06 | Handover decision history model | DONE | executor/effects | handover tests | ACCEPTED/REJECTED/APPROVED decisions append independently. | None |
| C-07 | Handover execution history model | DONE | executor/effects | handover tests | EXECUTE appends immutable execution record. | None |
| C-08 | Active handover currentness model | DONE | executor | handover tests | Resolver rejects missing, stale, cross-task, mismatched, rejected, ambiguous records. | None |
| C-09 | Receiver eligibility and project access | DONE | executor | handover tests | Eligibility port checks active/project access before begin. | None |
| C-10 | Shared executor extension | DONE | core-task-executor | all WM tests | Shared executor/deferred transaction pipeline extended; no second executor. | None |
| C-11 | Executable transition policies | DONE | workflow/transition policies | workflow tests | Terminal generations may request again; ordered accept/approve/execute policy. | None |
| C-12 | REQUEST_HANDOVER behavior | DONE | executor/tests | handover tests | Request preserves assignee, appends generation and request intent. | None |
| C-13 | ACCEPT_HANDOVER behavior | DONE | executor/tests | handover tests | Receiver-only accept appends decision and moves to approval. | None |
| C-14 | REJECT_HANDOVER behavior | DONE | executor/tests | handover tests | Reject closes projection and preserves prior generation. | None |
| C-15 | APPROVE_HANDOVER behavior | DONE | executor/tests | handover tests | Ordered approval appends decision with separation guard. | None |
| C-16 | EXECUTE_HANDOVER behavior | DONE | executor/tests | handover tests | System/privileged execution transfers assignee only after approval. | None |
| C-17 | Assignment mutation atomicity | DONE | executor/effects | handover tests | Execute stages assignment and execution intents in the same transaction. | None |
| C-18 | B1/B2 history preservation | DONE | executor/tests | handover tests | Submission/review/completion/archive histories deep-equal across all actions. | None |
| C-19 | Separation of duties | DONE | executor/tests | handover tests | Independent policy blocks source/receiver approval; receiver relation is server-side. | None |
| C-20 | Privileged-scope non-bypass | DONE | actor policy/tests | handover tests | Receiver relation cannot be bypassed by unrelated project scope. | None |
| C-21 | SYSTEM execution policy | DONE | actor policy/executor | handover tests | Registered SYSTEM execution bypass is explicitly tested. | None |
| C-22 | Typed handover intents | DONE | core-task-effects | tsc/handover tests | Required request/decision/execution effect arrays and typed payloads. | None |
| C-23 | Transaction rollback matrix | DONE | executor/tests | handover tests | Five rollback cases restore aggregate/effects/completion. | None |
| C-24 | Idempotency replay matrix | DONE | executor/tests | handover tests | Five exact replays create no ID, effect, or transaction. | None |
| C-25 | Idempotency conflict matrix | DONE | executor/tests | handover tests | Actor/company/task/fingerprint plus real command conflicts for 5/5 actions. | None |
| C-26 | Strict-schema matrix | DONE | schemas/tests | handover tests | Server-owned handover fields reject before lookup/inspect/begin. | None |
| C-27 | Authorization matrix | DONE | registry/executor/tests | handover tests | Permission/scope/relation/confidential/version policies covered. | None |
| C-28 | Current/stale/cross-task matrix | DONE | resolver/tests | handover tests | Currentness resolver is fail-closed. | None |
| C-29 | Exact state/effect/error matrix | DONE | executor/tests | handover tests | Five actions assert state, typed intents, events, audits and errors. | None |
| C-30 | No-mutation matrix | DONE | executor/tests | handover tests | All denials assert zero UoW/effects/ID/begin where applicable. | None |
| C-31 | Single-clock and immutability | DONE | executor/tests | handover tests | Five 1-clock immutable-input cases pass. | None |
| C-32 | Multi-generation handover | DONE | executor/tests | handover tests | Reject generation 1 then request generation 2 preserves history. | None |
| C-33 | Completion/handover integration | DONE | executor/tests | B1/C tests | Pending handover remains a completion guard; completion history preserved. | None |
| C-34 | Closure/archive integration | DONE | executor/tests | B2/C tests | Archive/restore history remains untouched through handover actions. | None |
| C-35 | Slice A regression | DONE | Slice A tests | tsx --test | 50 pass, 0 fail, 0 skipped. | None |
| C-36 | Slice B1 regression | DONE | B1 tests | tsx --test | 26 pass, 0 fail, 0 skipped. | None |
| C-37 | Slice B2 regression | DONE | B2 tests | tsx --test | 134 pass, 0 fail, 0 skipped. | None |
| C-38 | Workflow regression | DONE | workflow tests | tsx --test | 12 pass, 0 fail, 0 skipped. | None |
| C-39 | Registry regression | DONE | registry tests | tsx --test | 614 pass, 0 fail, 0 skipped. | None |
| C-40 | All Work Management | DONE | all tests | tsx --test | 1044 pass, 0 fail, 0 skipped. | None |
| C-41 | Scoped lint | DONE | changed source/tests | eslint | Exit 0, no warnings. | None |
| C-42 | Scoped TypeScript | DONE | work-management | tsc -p | Exit 0. | None |
| C-43 | Global TypeScript | DONE | repository | tsc --noEmit | Exit 0. | None |
| C-44 | Final audit | DONE | code/tests/docs | diff/test audit | Exact behavior, security, preservation and regression evidence complete. | None |
| C-45 | Final report | DONE | Slice C report | report creation | Final report records exact runner evidence. | None |
| C-46 | Frozen Slice C baseline | DONE | Slice C frozen baseline | hash-object | Final source/test hashes recorded. | None |
| C-47 | WM-06/WM-07 closure | DONE | mandatory ledger | full verification | All 25 registered actions have executable behavior and exact tests. | None |
