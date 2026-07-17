# WM-11/WM-12 Assignment History Ledger

All items are pure application/test work; database schema remains NO-GO.

| ID | Item | Status | Files | Commands | Evidence | Blocker |
|---|---|---|---|---|---|---|
| AH-01 | Worktree baseline | DONE | Ledger | git status/branch/log/diff/worktree | Preserved dirty worktree; no reset/clean/stash | None |
| AH-02 | Frozen WM-10 contract | DONE | assignment-source-of-truth.ts | WM-10 regression | primaryAssigneeId remains sole current projection | None |
| AH-03 | Existing history-pattern audit | DONE | executor/effects/history modules | rg history audit | Existing histories are append-only; assignment history matches pattern | None |
| AH-04 | Assignment-history record contract | DONE | application/assignment-history.ts | scoped tsc | Typed id, task, generation, actors, source/link, reason, time | None |
| AH-05 | Assignment-history aggregate contract | DONE | application/assignment-history.ts | aggregate tests | Snapshot validates record sequence and current projection | None |
| AH-06 | Append-only invariant | DONE | assignment-history.ts | aggregate tests | Helper returns a new array and never updates prior records | None |
| AH-07 | Record identity invariant | DONE | assignment-history.ts | integrity tests | Non-empty unique IDs required | None |
| AH-08 | Task ownership invariant | DONE | assignment-history.ts | integrity tests | Foreign task record returns TASK_ASSIGNMENT_HISTORY_TASK_MISMATCH | None |
| AH-09 | Generation invariant | DONE | assignment-history.ts | integrity tests | Ordered positive integer generations start at one | None |
| AH-10 | Chain continuity invariant | DONE | assignment-history.ts | integrity tests | previousAssigneeId must equal preceding newAssigneeId | None |
| AH-11 | Source-action invariant | DONE | assignment-history.ts | integrity tests | Only ASSIGN and EXECUTE_HANDOVER are accepted | None |
| AH-12 | Source-handover invariant | DONE | assignment-history.ts | integrity tests | ASSIGN has null link; execution requires valid handover link | None |
| AH-13 | Projection/history consistency | DONE | assignment-history.ts/executor | integrity/executor tests | Last history owner must equal primaryAssigneeId | None |
| AH-14 | Legacy bootstrap policy | DONE | assignment-history.ts | aggregate tests | Existing projection with empty history appends first audited change; no fabricated bootstrap | None |
| AH-15 | ASSIGN append behavior | DONE | core-task-executor.ts | Slice A tests | Initial ASSIGN appends exact generation-one record | None |
| AH-16 | ASSIGN reassign behavior | DONE | core-task-executor.ts | aggregate/executor tests | Reassignment appends immutable next generation | None |
| AH-17 | ASSIGN no-op policy | DONE | executor/validation | Slice A regression | Existing ASSIGN guards reject invalid/no-op paths before mutation | None |
| AH-18 | EXECUTE_HANDOVER append behavior | DONE | core-task-executor.ts | Slice C tests | Only effective execution appends and changes projection | None |
| AH-19 | Handover linkage | DONE | core-task-executor.ts | handover-executor test | Record links exact active handover ID and SYSTEM actor | None |
| AH-20 | Non-writer action preservation | DONE | executor + slice tests | A/B1/B2/C regressions | All 23 non-writers preserve history; request/accept/reject/approve handover do not append | None |
| AH-21 | ProjectMember boundary | DONE | assignment-source-of-truth.ts | WM-10 regression | ProjectMember is not an assignment/history source | None |
| AH-22 | Participant/reviewer/approver boundary | DONE | assignment-source-of-truth.ts | WM-10 regression | Participants, reviewer and approver cannot become assignee/history writers | None |
| AH-23 | Replay protection | DONE | idempotency integration | idempotency regression | ASSIGN replay produces no second record | None |
| AH-24 | Idempotency conflict protection | DONE | idempotency integration | idempotency regression | Identity conflicts do not append history | None |
| AH-25 | Transaction rollback | DONE | executor/UoW tests | executor/idempotency tests | Failed CAS/staging restores projection and history | None |
| AH-26 | Post-complete rollback | DONE | transaction idempotency tests | idempotency regression | Finalization failure publishes neither replay nor history mutation | None |
| AH-27 | Retry after rollback | DONE | idempotency integration tests | idempotency regression | Aborted reservation permits one clean retry | None |
| AH-28 | Concurrency conflict | DONE | core-task-executor.test.ts | Slice A regression | Two competing ASSIGN commands commit exactly one generation | None |
| AH-29 | History immutability | DONE | aggregate tests | assignment-history tests | Prior record deep-equal after append | None |
| AH-30 | Input immutability | DONE | core executor tests | Slice A regression | Aggregate/command/actor remain immutable | None |
| AH-31 | Cross-slice preservation | DONE | B1/B2/C tests | focused regressions | B1/B2 preserve history; C pre-execution preserves it | None |
| AH-32 | WM-10 regression | DONE | assignment-source tests | tsx --test assignment-source-of-truth.test.ts | 15 pass, 0 fail, 0 skipped | None |
| AH-33 | Idempotency regression | DONE | in-memory idempotency tests | tsx --test *in-memory-idempotency*.test.ts | 38 pass, 0 fail, 0 skipped | None |
| AH-34 | Slice A regression | DONE | core task tests | Slice A command | 52 pass, 0 fail, 0 skipped | None |
| AH-35 | Slice B1 regression | DONE | result review tests | tsx --test result-review-executor.test.ts | 26 pass, 0 fail, 0 skipped | None |
| AH-36 | Slice B2 regression | DONE | closure lifecycle tests | tsx --test *closure-lifecycle*.test.ts | 134 pass, 0 fail, 0 skipped | None |
| AH-37 | Slice C regression | DONE | handover tests | Slice C command | 154 pass, 0 fail, 0 skipped | None |
| AH-38 | Workflow regression | DONE | workflow tests | tsx --test workflow.test.ts | 12 pass, 0 fail, 0 skipped | None |
| AH-39 | Registry regression | DONE | registry tests | registry command | 614 pass, 0 fail, 0 skipped | None |
| AH-40 | All Work Management | DONE | all WM tests | tsx --test tests/*.test.ts | 1122 pass, 0 fail, 0 skipped | None |
| AH-41 | Scoped lint | DONE | changed WM files | npx eslint changed files | Exit 0 | None |
| AH-42 | Scoped TypeScript | DONE | tsconfig.work-management.json | npx tsc -p tsconfig.work-management.json | Exit 0 | None |
| AH-43 | Global TypeScript | DONE | tsconfig.json | npx tsc --noEmit | Exit 0 | None |
| AH-44 | Final audit | DONE | executor/history/tests | rg + git diff --check | Writers are ASSIGN and EXECUTE_HANDOVER only; whitespace check clean | None |
| AH-45 | Final report | DONE | final report | report review | Commands, files, results and NO-GO boundary recorded | None |
| AH-46 | Frozen baseline | DONE | frozen baseline | git hash-object | Hashes and mandatory regression set recorded | None |
| AH-47 | WM-11 closure | DONE | aggregate/executor/docs | all commands above | Aggregate behavior verified without persistence | None |
| AH-48 | WM-12 closure | DONE | tests/docs | all commands above | 20 focused assignment-history tests and full regression pass | None |

| AH-49 | First-record source binding | DONE | assignment-history.ts/tests | focused tests | previousAssigneeId exactly matches pre-mutation primaryAssigneeId, including legacy empty history | None |
| AH-50 | Defensive record clone | DONE | assignment-history.ts | focused tests | appended record object is isolated from caller mutation | None |
| AH-51 | Defensive Date clone | DONE | assignment-history.ts | focused tests | appended effectiveAt Date is isolated from caller mutation | None |
| AH-52 | Runtime reason validation | DONE | assignment-history.ts/integrity tests | focused tests | number and object reasons fail closed | None |
| AH-53 | Cross-writer concurrency | DONE | handover-executor.test.ts | Slice C/full regression | ASSIGN vs EXECUTE_HANDOVER commits one generation; stale CAS fails | None |
| AH-54 | SYSTEM execution provenance | DONE | handover-executor.test.ts | Slice C/full regression | history/event/activity/audit record SYSTEM actor ID | None |
| AH-55 | Privileged execution provenance | DONE | handover-executor.test.ts | Slice C/full regression | history/event/activity/audit record exact privileged human actor ID | None |
| AH-56 | EXECUTE_HANDOVER finalization-history assertion | DONE | idempotency integration test | idempotency/full regression | failed final commit preserves history; retry appends once; replay appends none | None |
| AH-57 | WM-10 count reconciliation | DONE | source/mutation tests | full WM-10 scoped command | 17 pass = 15 source tests + 2 mutation-authority tests | None |
