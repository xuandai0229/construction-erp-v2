# WM-06A/WM-07A SLICE A CORRECTNESS HARDENING REPORT

## 1. Kết luận

Slice A hardening: FAILED.

Implemented and verified: required idempotency key, stable `TASK_COMMAND_INVALID`, single captured clock for non-create actions, executable use of resolved policy metadata via the injected transition evaluator boundary, create target context input, progress regression rejection, extension/deadline range checks, title/description mapping, and stable blocker identity.

## 2. Worktree baseline

Branch `main`, HEAD `08828aa don_pate35`; no forbidden Git/database operation occurred.

## 3. Protected foundation hashes

All eight protected hashes match the recorded baseline. Protected foundation files modified: NO.

## 4. Defects identified

The remaining defects are transaction-scoped repository rollback and the incomplete idempotency lifecycle (canonical fingerprint, inspect/begin/replay/conflict/in-progress). They prevent a truthful DONE.

## 5. Registry-driven policy execution

Registry idempotency, actor, scope, notification and concurrency metadata continue to be read by the executor. Missing required idempotency key rejected: YES.

## 6. Transition policy execution

Transition policy result actually used: YES through the injected transition evaluator boundary. The protected transition foundation still supplies metadata rather than an executable evaluator.

## 7. Idempotency boundary

Key enforcement and integration hook exist. Idempotency fingerprint: FAILED; full inspect/begin/complete/abort lifecycle is not implemented.

## 8. Transaction-scoped Unit of Work

FAILED: current UoW has staging counters but does not expose transaction-scoped repository state for real snapshot rollback.

## 9. Real rollback evidence

Transaction rollback restores repository: NO. Transaction rollback restores effects: only fake staging state. Transaction rollback prevents idempotency completion: not fully proven.

## 10. CREATE_DRAFT target authorization

Create target-project authorization: PARTIAL. Executor now passes project ID to the scope port; test double does not yet prove server project membership policies.

## 11. CREATE_DRAFT data mapping

Title and description are retained in the aggregate; project ID and deadline are mapped.

## 12. ASSIGN correctness

Eligibility and duplicate assignee checks exist; complete project/reviewer/approver conflict proof remains incomplete.

## 13. UPDATE_PROGRESS policy

Progress regression rejects with `TASK_PROGRESS_INVALID`; 100% does not complete task.

## 14. REQUEST_EXTENSION policy

Requested deadline must be future and later than current deadline; current deadline is unchanged.

## 15. CHANGE_DEADLINE policy

Reason and changed-date checks are enforced; history intent uses actor and captured timestamp.

## 16. PAUSE/RESUME history

State transitions are covered; dedicated pause/resume typed history intent remains incomplete.

## 17. BLOCK/UNBLOCK blocker identity

Block generates namespaced stable blocker ID; unblock requires and clears active blocker ID.

## 18. Typed effects

FAILED: effect envelopes still use string fields rather than all requested domain/activity/audit union contracts and action payloads.

## 19. Validation and stable error codes

Validation errors separated from access errors: YES (`TASK_COMMAND_INVALID`).

## 20. Single-clock execution

Non-create execution captures clock once. CREATE path still requires further refactoring to prove the same rule end-to-end.

## 21. Input immutability

Next aggregate is cloned; complete deep-freeze coverage remains incomplete.

## 22. Expanded behavior matrix

12 action success/invalid cases, authorization/invariant cases and rollback counter cases pass, but the full requested exact-state/effect/error matrix is incomplete.

## 23. No-mutation-on-denial evidence

Repository save and staged effects remain zero for current tested denial paths; all-store snapshot proof is incomplete.

## 24. Idempotency boundary tests

Missing key and validation paths are tested; replay/conflict/in-progress/canonical fingerprint tests are incomplete.

## 25. Test results

Slice tests: 36 pass, 0 fail, 0 skip. All Work Management: 712 pass, 0 fail, 0 skip.

## 26. Scoped lint

PASS.

## 27. Scoped TypeScript

PASS.

## 28. Global TypeScript

PASS.

## 29. Files created/modified

`application/core-task-executor.ts`, `tests/core-task-executor.test.ts`, `errors/codes.ts`, Slice Ledger, this report.

## 30. Slice ledger update

A-19, A-26 and A-27 are FAILED with concrete evidence; no item is falsely marked DONE for the incomplete hardening scope.

## 31. Main ledger update

WM-06 overall: PENDING — Slice A has initial implementation plus partial correctness fixes. WM-07 overall: PENDING — Slice A tests expanded but hardening is not complete.

## 32. Remaining Slice B/C work

SUBMIT through RESTORE started: NO. Handover started: NO. WM-08 implementation started: NO.

## 33. Schema status

Schema: NO-GO.
