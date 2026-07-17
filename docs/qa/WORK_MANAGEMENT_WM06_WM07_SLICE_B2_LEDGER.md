# WM-06/WM-07 Slice B2 ledger

| ID | Item | Status | Files | Commands | Evidence | Blocker |
|---|---|---|---|---|---|---|
| B2-01 | Worktree and frozen baseline | DONE | B1 frozen baseline; B2 handoff | git status/hash-object | Existing dirty files preserved; HEAD `ec72335`. | None |
| B2-02 | Existing lifecycle/archive code inspection | DONE | registry/workflow/executor | Get-Content/rg | Shared registry, executor and transition policies reused. | None |
| B2-03 | Closure state model | DONE | domain/types; core-task-executor | tsc | Reopen/cancel projections and archive generation/state snapshot are server-owned. | None |
| B2-04 | Closure history model | DONE | core-task-executor | closure-lifecycle test | Reopen, cancellation, archive and restore records are append-only. Archive records remain immutable. | None |
| B2-05 | Archive snapshot model | DONE | domain/types; executor | closure-lifecycle test | The active archive record is the RESTORE source of truth; the projection is validated only as a checked cache. | None |
| B2-06 | Shared executor extension | DONE | core-task-executor | all WM tests | Existing executor has additive B2 action branch; no second pipeline. | None |
| B2-07 | Executable transition policies | DONE | workflow; transition-policies | workflow/all WM tests | Archive/cancel/restore errors are stable; restore is policy-directed. | None |
| B2-08 | REOPEN behavior | DONE | executor/tests | closure-lifecycle test | Typed intent, reason/history, B1 preservation. | None |
| B2-09 | CANCEL behavior | DONE | executor/tests | closure-lifecycle test | Reason/history and stable already-cancelled guard. | None |
| B2-10 | ARCHIVE behavior | DONE | executor/tests | closure-lifecycle test | Generation, active archive projection and server snapshot. | None |
| B2-11 | RESTORE behavior | DONE | executor/tests | closure-lifecycle test | Restores exact pre-archive state and closes active archive. | None |
| B2-12 | B1 history preservation | DONE | executor/tests | closure-lifecycle test | Submission/review arrays deep-equal through B2 actions. | None |
| B2-13 | Completion-history preservation | DONE | executor/tests | closure-lifecycle test | Completion history remains append-only. REOPEN clears current completion projection while preserving prior completion records. ARCHIVE and RESTORE preserve applicable completion state and history. | None |
| B2-14 | Archive generation/currentness | DONE | executor/tests | closure-lifecycle test | Generation increments only after restore; stale/missing snapshot fails closed. | None |
| B2-15 | Typed closure intents | DONE | core-task-effects; executor | tsc/tests | Reopen/cancellation/archive/restore typed intent arrays emitted. | None |
| B2-16 | Transaction atomicity | DONE | executor/tests | closure-lifecycle test | All four action staging failures roll back aggregate/effects/completion. | None |
| B2-17 | Idempotency boundary integration | DONE | verification matrix tests | `B2 idempotency identity conflicts alter exactly one field`; `B2 real valid-command fingerprint conflicts and exact replay controls`; `B2 idempotency in-progress and begin-order matrices are side-effect free` | Each action has actor-only, company-only, task-only, fingerprint-only, real command-fingerprint conflict, exact replay, IN_PROGRESS, and begin-failure/no-ID proof. | None |
| B2-18 | Authorization matrix | DONE | verification matrix tests | `B2 authorization matrix uses each registered action policy` | REOPEN/CANCEL/ARCHIVE/RESTORE each have named permission, scope, relation, and confidentiality denials. | None |
| B2-19 | Exact state/effect/error matrix | DONE | closure and verification tests | B2 executor + matrix runner | Exact state/effect/error coverage plus four expected-version conflicts. | None |
| B2-20 | No-mutation matrix | DONE | verification matrix tests | authorization/version/strict-schema/idempotency matrix tests | Each denial asserts unchanged aggregate, zero UoW/effects/IDs; strict schema additionally proves zero `inspect`; conflict/replay denials prove zero begin. | None |
| B2-21 | Rollback matrix | DONE | tests | closure-lifecycle test | REOPEN/CANCEL/ARCHIVE/RESTORE each have named rollback subtest. | None |
| B2-22 | Replay matrix | DONE | tests | closure-lifecycle test | REOPEN/CANCEL/ARCHIVE/RESTORE each have named replay subtest. | None |
| B2-23 | Single-clock and immutability | DONE | tests | closure-lifecycle test | Four named clock/immutability subtests. | None |
| B2-24 | Slice A regression | DONE | Slice A tests | tsx --test | 50 pass, 0 fail, 0 skipped. | None |
| B2-25 | B1 regression | DONE | result-review tests | tsx --test | 26 pass, 0 fail, 0 skipped. | None |
| B2-26 | Workflow regression | DONE | workflow tests | tsx --test | 8 pass, 0 fail, 0 skipped. | None |
| B2-27 | Registry regression | DONE | registry tests | tsx --test | 614 pass, 0 fail, 0 skipped. | None |
| B2-28 | Scoped lint | DONE | B2 changed source/test files | eslint | Exit 0. | None |
| B2-29 | Scoped TypeScript | DONE | work-management | tsc -p tsconfig.work-management.json | Exit 0. | None |
| B2-30 | Global TypeScript | DONE | repository | tsc --noEmit | Exit 0. | None |
| B2-31 | Final audit | DONE | code/tests/ledger | B2/B1/A/workflow/registry/all-WM/lint/tsc | Core correctness plus exact single-field identity conflict, real canonical command-fingerprint, exact replay, strict-schema-before-inspect, authorization, version, IN_PROGRESS and begin-before-ID matrices pass. | None |
| B2-32 | Final report | DONE | B2 correctness closure report | report creation | Report records 134 B2 and 887 all-WM runner tests, corrected false-positive evidence, and exact named test traceability. | None |
