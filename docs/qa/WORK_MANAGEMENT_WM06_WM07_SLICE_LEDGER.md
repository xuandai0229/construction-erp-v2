# WM-06/WM-07 Slice A ledger

| ID | Item | Status | Files | Commands | Evidence | Blocker |
|---|---|---|---|---|---|---|
| A-01 | Worktree and protected-file baseline | DONE | ledger | git status/hash-object | `main`, `08828aa`; seven protected hashes captured. | None |
| A-02 | Existing application code inspection | DONE | executor, registry, workflow, ports, tests | Get-Content/rg | Reused the sole Action Registry and actor policy. | None |
| A-03 | Aggregate/application state model | DONE | core-task-executor.ts | scoped tests | Immutable aggregate holds state axes, version, deadline, assignee and blocker projection. | None |
| A-04 | Command execution pipeline | DONE | core-task-executor.ts | Slice A final tests | Strict parse → normalized identity inspect → guards → mandatory executable policy resolver → begin → atomic transaction; no direct evaluator bypass. | None |
| A-05 | Authorization pipeline | DONE | core-task-executor.ts | core task tests | Permission, server scope, relation and confidentiality guards precede begin/save. | None |
| A-06 | CREATE_DRAFT behavior | DONE | executor, schemas, tests | Slice A final tests | Project existence/access, NORMAL/RESTRICTED/CONFIDENTIAL/EXECUTIVE policy, strict field mapping and transactional creation are exact-tested. | None |
| A-07 | ASSIGN behavior | DONE | executor/tests | Slice A final tests | Structured not-found/inactive/project/reviewer/approver/not-assignable outcomes and full previous/new assignment intent are exact-tested. | None |
| A-08 | ACCEPT behavior | DONE | executor/policy | core task tests | Primary-assignee policy transition and typed effects. | None |
| A-09 | REQUEST_CLARIFICATION behavior | DONE | executor | core task tests | Keeps assignee/deadline and produces clarification intent. | None |
| A-10 | START behavior | DONE | executor/policy | core task tests | Uses executable policy result. | None |
| A-11 | UPDATE_PROGRESS behavior | DONE | executor | core task tests | Rejects regression and does not complete merely at 100%. | None |
| A-12 | REQUEST_EXTENSION behavior | DONE | executor | core task tests | Request intent only; deadline/history unchanged. | None |
| A-13 | CHANGE_DEADLINE behavior | DONE | executor | core task tests | Reasoned deadline history has old/new values and trusted actor/time. | None |
| A-14 | PAUSE behavior | DONE | executor/policy | core task tests | Policy changes execution only; reason captured in typed activity payload. | None |
| A-15 | RESUME behavior | DONE | executor/policy | core task tests | Only paused tasks return to active and retain progress/deadline. | None |
| A-16 | BLOCK behavior | DONE | executor | core task tests | Generates stable blocker ID and open blocker intent. | None |
| A-17 | UNBLOCK behavior | DONE | executor | core task tests | Closes exactly the current blocker ID without resetting progress. | None |
| A-18 | Side-effect intents | DONE | effects/executor/tests | Slice A final tests | Typed event/activity/audit/notification payload matrix plus execution history and blocker identity propagation pass. | None |
| A-19 | Repository and transaction test doubles | DONE | ports/executor test | Slice A final tests | Snapshot UoW restores task/effect/history/completion state for conflict, staging, completion and create-staging failure. | None |
| A-20 | Behavior test matrix | DONE | core task tests | `npx tsx --test ...` | 12 success + 12 invalid-transition/duplicate cases; exact effects/state assertions. | None |
| A-21 | No-mutation-on-denial tests | DONE | core task executor test | core task tests | Permission/scope/relation/confidentiality/version/eligibility deny before begin/save/effect. | None |
| A-22 | Scoped lint | DONE | changed Slice A files | `npx eslint ...` | Exit code 0. | None |
| A-23 | Scoped TypeScript | DONE | Work Management | `npx tsc -p tsconfig.work-management.json` | Exit code 0. | None |
| A-24 | Global TypeScript | DONE | repository | `npx tsc --noEmit` | Exit code 0. | None |
| A-25 | Protected-file hash verification | DONE | seven protected files | git hash-object | Before/after all match. | None |
| A-26 | Final slice audit | DONE | executor/tests/verification report | all final commands | Transition, identity isolation, transaction rollback, create/assign, typed payload, history, clock and immutability gates PASS. | None |
| A-27 | Slice execution report | DONE | final verification report | report review | Final verification report records commands, hashes, test counts and all gate outcomes. | None |
