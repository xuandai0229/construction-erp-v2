# WM-10 Assignment Source of Truth Ledger

| ID | Item | Status | Files | Commands | Evidence | Blocker |
|---|---|---|---|---|---|---|
| AST-01 | Worktree and frozen baseline | DONE | WM-10 ledger; protected source/tests | `git status`, `git diff`, `git hash-object` | `main` at `ec72335`; existing dirty worktree preserved. | None |
| AST-02 | WM-08/09 documentation reconciliation | DONE | WM08/09 ledger, report, frozen baseline | `Get-Content`, regression | Final frozen count recorded as 1079; publication composition is inventoried. | None |
| AST-03 | Repository-wide assignment usage audit | DONE | WM-10 final report | `rg primaryAssigneeId`, `rg assignedById`, `rg activeHandoverReceiverId`, `rg ProjectMember` | Every runtime use is classified; no suspicious fallback remains. | None |
| AST-04 | Current assignment projection contract | DONE | assignment-source-of-truth.ts | WM-10 tests | `primaryAssigneeId` is the sole current projection. | None |
| AST-05 | Assignment provenance contract | DONE | assignment-source-of-truth.ts | WM-10 tests | `assignedById` is preserved as provenance, never read as assignee. | None |
| AST-06 | Creation initialization authority | DONE | core-task-executor.ts; assignment policy | core-task regression | Frozen `CREATE_DRAFT` creates `primaryAssigneeId: null`; initialization unsupported. | None |
| AST-07 | Post-creation mutation authority | DONE | assignment-source-of-truth.ts | mutation-authority test | Whitelist is exactly ASSIGN and EXECUTE_HANDOVER. | None |
| AST-08 | ASSIGN write authority | DONE | core-task-executor.ts | core-task regression | ASSIGN writes canonical projection and trusted `assignedById`. | None |
| AST-09 | EXECUTE_HANDOVER write authority | DONE | core-task-executor.ts | handover regression | EXECUTE_HANDOVER alone transfers from canonical source to receiver. | None |
| AST-10 | Handover pre-execution non-mutation | DONE | handover-executor.test.ts | handover regression | Request/accept/reject/approve preserve projection; execution transfers it. | None |
| AST-11 | ProjectMember boundary | DONE | assignment-source-of-truth.test.ts | WM-10 tests | Project/project-member evidence resolves UNASSIGNED when projection is null. | None |
| AST-12 | Participant boundary | DONE | scope-evaluator.ts; WM-10 tests | WM-10 tests | PRIMARY_ASSIGNEE participant role cannot bypass projection. | None |
| AST-13 | Reviewer/approver boundary | DONE | WM-10 tests | WM-10 tests | Reviewer/approver remain distinct relations, not assignment fallback. | None |
| AST-14 | Creator/assignedBy boundary | DONE | WM-10 tests | WM-10 tests | Creator and assigner evidence both resolve UNASSIGNED without projection. | None |
| AST-15 | Assignment-intent boundary | DONE | core-task-effects.ts; WM-10 tests | WM-10 tests | Staged assignment intent is not read by resolver. | None |
| AST-16 | Handover-intent boundary | DONE | core-task-effects.ts; WM-10 tests | WM-10 tests | Handover records/effects are not fallback reads. | None |
| AST-17 | Workload read boundary | DONE | domain/workload.ts | usage audit | Workload has no primary-assignee fallback or ownership reader. | None |
| AST-18 | Authorization relation boundary | DONE | scope-evaluator.ts; services.ts | WM-10 tests; permissions regression | Primary relation uses canonical resolver; creator/reviewer/approver remain explicit authorization relations. | None |
| AST-19 | No-fallback resolver | DONE | assignment-source-of-truth.ts | assignment-source-of-truth.test.ts | Resolver reads only `primaryAssigneeId`; no DB, scopes, effects, or participant lookup. | None |
| AST-20 | Missing-assignment policy | DONE | assignment-source-of-truth.ts | named lifecycle matrix | Read returns UNASSIGNED; assignee-required operation throws TASK_ASSIGNMENT_REQUIRED. | None |
| AST-21 | Invalid-projection policy | DONE | assignment-source-of-truth.ts; errors/codes.ts | malformed projection test | Empty, whitespace, number, and malformed provenance fail TASK_ASSIGNMENT_PROJECTION_INVALID. | None |
| AST-22 | Mutation-whitelist tests | DONE | assignment-mutation-authority.test.ts | WM-10 tests | All 25 actions checked; exactly two allowed post-creation writers. | None |
| AST-23 | No-fallback tests | DONE | assignment-source-of-truth.test.ts | WM-10 tests | Eleven candidate source boundaries are named and proven. | None |
| AST-24 | ASSIGN integration | DONE | core-task-executor.test.ts | Slice A regression | `assign emits exact history and all structured eligibility failures are stable and non-mutating`. | None |
| AST-25 | EXECUTE_HANDOVER integration | DONE | handover-executor.test.ts | Slice C regression | `APPROVE_HANDOVER and EXECUTE_HANDOVER transfer the assignee atomically only at execution`. | None |
| AST-26 | Rollback preservation | DONE | handover-executor.test.ts; idempotency integration tests | Slice C/idempotency regression | `EXECUTE_HANDOVER rollback` and post-complete rollback retain original projection. | None |
| AST-27 | Replay preservation | DONE | handover-executor.test.ts; idempotency integration tests | Slice C/idempotency regression | `EXECUTE_HANDOVER replay` and concrete-store replay prevent duplicate transfer. | None |
| AST-28 | Idempotency conflict preservation | DONE | handover-executor.test.ts | Slice C regression | EXECUTE_HANDOVER exact identity conflict matrix preserves task/effects. | None |
| AST-29 | Post-complete finalization preservation | DONE | in-memory-idempotency-executor-integration.test.ts | idempotency regression | Slice C post-complete rollback then retry/replay preserves atomic assignment transfer. | None |
| AST-30 | Cross-slice history preservation | DONE | handover-executor.test.ts | Slice C regression | `handover actions preserve B1 and B2 histories while changing only handover projections`. | None |
| AST-31 | Slice A regression | DONE | core-task executor tests | `tsx --test core-task-*` | 50 pass, 0 fail, 0 skipped. | None |
| AST-32 | Slice B1 regression | DONE | result-review tests | `tsx --test *result-review*` | 26 pass, 0 fail, 0 skipped. | None |
| AST-33 | Slice B2 regression | DONE | closure lifecycle tests | `tsx --test *closure-lifecycle*` | 134 pass, 0 fail, 0 skipped. | None |
| AST-34 | Slice C regression | DONE | handover tests | `tsx --test *handover*` | 153 pass, 0 fail, 0 skipped. | None |
| AST-35 | Idempotency regression | DONE | in-memory idempotency tests | `tsx --test *in-memory-idempotency*` | 35 pass, 0 fail, 0 skipped. | None |
| AST-36 | Workflow regression | DONE | workflow.test.ts | `tsx --test workflow.test.ts` | 12 pass, 0 fail, 0 skipped. | None |
| AST-37 | Registry regression | DONE | action registry tests | `tsx --test action-registry*` | 614 pass, 0 fail, 0 skipped. | None |
| AST-38 | All Work Management | DONE | all WM tests | `tsx --test tests/*.test.ts` | 1096 pass, 0 fail, 0 skipped. | None |
| AST-39 | Scoped lint | DONE | changed source/tests | `npx eslint ...` | Exit 0; no warnings after `_action` cleanup. | None |
| AST-40 | Scoped TypeScript | DONE | work-management | `npx tsc -p tsconfig.work-management.json` | Exit 0. | None |
| AST-41 | Global TypeScript | DONE | repository | `npx tsc --noEmit` | Exit 0. | None |
| AST-42 | Final usage audit | DONE | WM-10 report | final `rg` audit | Business semantic reads use resolver; remaining direct fields are writes, validation, effects, fixtures, or display. | None |
| AST-43 | Final report | DONE | WM-10 final report | report review | Exact traceability and command evidence recorded. | None |
| AST-44 | Frozen baseline | DONE | WM-10 frozen baseline | `git hash-object` | Resolver, executor, policy, scope evaluator and tests locked. | None |
| AST-45 | WM-10 closure | DONE | mandatory ledger; WM-10 artifacts | full verification | All contract, audit, regression, lint, and type gates pass; WM-11/WM-12 untouched. | None |
