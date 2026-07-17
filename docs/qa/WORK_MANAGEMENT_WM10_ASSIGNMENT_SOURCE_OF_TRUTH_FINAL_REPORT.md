# WM-10 ASSIGNMENT SOURCE OF TRUTH FINAL REPORT

## 1. Kết luận

**WM-10 Final Gate: DONE.** `CoreTaskAggregate.primaryAssigneeId` is the sole current operational assignment projection. `assignedById` is provenance only. Post-creation mutation authority is restricted to `ASSIGN` and `EXECUTE_HANDOVER`; the frozen `CREATE_DRAFT` contract creates an unassigned draft.

## 2. Worktree baseline

Branch: `main`. HEAD: `ec72335 don_pate36`. The pre-existing dirty worktree was preserved without reset, clean, stash, restore, commit, or push.

## 3. WM-08/09 reconciliation

The idempotency ledger distinguishes the pre-finalization 1068-pass count from the final frozen 1079-pass count. The transaction-finalization report now states: registered action/domain semantics changed **NO**; idempotency transaction-infrastructure changed **YES**. The frozen inventory includes the in-memory UoW composition that calls `completion.publish()` after task/effect finalization.

## 4. Frozen baseline

See `WORK_MANAGEMENT_WM10_ASSIGNMENT_SOURCE_OF_TRUTH_FROZEN_BASELINE.md`. Resolver and protecting tests are hash-recorded.

## 5. Repository-wide usage audit

| File / symbol | Category | Allowed | Reason / outcome |
|---|---|---:|---|
| `assignment-source-of-truth.ts` / resolver | CURRENT_READ | YES | Reads only `primaryAssigneeId`; validates malformed runtime projection. |
| `core-task-executor.ts` / ASSIGN | POST_CREATION_WRITE | YES | Validated, trusted server mutation. |
| `core-task-executor.ts` / EXECUTE_HANDOVER | POST_CREATION_WRITE | YES | Transfers only after current canonical source is checked. |
| `core-task-executor.ts` / CREATE_DRAFT | INITIALIZATION_WRITE | YES | Frozen initialization is `null`, not an assignee. |
| `core-task-executor.ts` / payloads | EFFECT_ONLY | YES | Uses resolver where a current-assignee semantic is emitted. |
| `scope-evaluator.ts` / `isPrimaryAssignee` | AUTHORIZATION_RELATION | YES | Now uses canonical resolver; removed participant fallback. |
| `services.ts` / OWN scope | AUTHORIZATION_RELATION | YES | Now resolves canonical assignment. |
| `invariants.ts` / primary helpers | VALIDATION_ONLY | YES | Test-only invariant validation, never a reader fallback. |
| `workload.ts` | NOT_ASSIGNMENT_SOURCE | YES | No primary-assignee ownership read exists. |
| Project membership references | ELIGIBILITY_ONLY / AUTHORIZATION_RELATION | YES | Project access evidence only; no runtime assignee source. |
| tests and fixtures | TEST_FIXTURE | YES | Not production decision paths. |

Final search found **0 suspicious fallback** usages.

## 6. Current assignment projection

`resolveCurrentTaskAssignment(task)` in `src/lib/work-management/application/assignment-source-of-truth.ts` returns either `ASSIGNED` with the exact `primaryAssigneeId`, or `UNASSIGNED` with `null`. It does not query persistence, scopes, eligibility, participant lists, handover receiver state, effects, or notification recipients.

## 7. Assignment provenance

`assignedById` remains output metadata describing the server actor that made the current projection. It cannot populate `assigneeId`.

## 8. Initialization authority

The frozen `CREATE_DRAFT` implementation sets `primaryAssigneeId: null`. `canInitializePrimaryAssignee("CREATE_DRAFT")` is false; no strict schema or idempotency fingerprint changed.

Exact Slice A assertion: `create validates project access and confidentiality without losing parsed fields` verifies that a client-provided `primaryAssigneeId` still yields `primaryAssigneeId: null` and `assignedById: null`.

## 9. Post-creation write authority

`canMutatePrimaryAssignee` returns true only for `ASSIGN` and `EXECUTE_HANDOVER`, across the entire 25-action `TASK_ACTIONS` list.

## 10. Canonical resolver

The resolver is pure. It uses `TASK_ASSIGNMENT_REQUIRED` for an assignee-required operation with an unassigned projection and `TASK_ASSIGNMENT_PROJECTION_INVALID` for empty, whitespace-only, non-string, or malformed provenance values.

## 11. No-fallback policy

Creator, assigned-by, participant, reviewer, approver, ProjectMember evidence, active handover receiver, staged assignment intent, handover execution intent, privileged actor, and SYSTEM actor all resolve to `UNASSIGNED` when `primaryAssigneeId` is null.

## 12. Missing-assignment policy

For DRAFT, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, and ARCHIVED snapshots, the resolver may report `UNASSIGNED`; it makes no lifecycle assumption. A caller needing an assignee uses `requireCurrentTaskAssignee` and fails closed.

## 13. Invalid-projection policy

Empty, whitespace-only, numeric runtime projection and malformed `assignedById` produce exact `TASK_ASSIGNMENT_PROJECTION_INVALID` errors; no trim-based substitution occurs.

## 14. ASSIGN authority

Existing Slice A integration test `assign emits exact history and all structured eligibility failures are stable and non-mutating` proves trusted actor provenance, eligibility, effect staging, and no mutation on denial. The executor now obtains the previous assignment through the resolver.

## 15. EXECUTE_HANDOVER authority

`resolveActiveHandover` verifies the request source against `requireCurrentTaskAssignee`; a mismatch returns `TASK_HANDOVER_SOURCE_CHANGED`. Existing Slice C test `APPROVE_HANDOVER and EXECUTE_HANDOVER transfer the assignee atomically only at execution` proves transfer only occurs at execution.

## 16. Handover pre-execution preservation

`REQUEST_HANDOVER appends generation one without transferring the assignee`, plus the ACCEPT/REJECT/APPROVE handover tests, preserve `primaryAssigneeId` until execution.

## 17. ProjectMember boundary

Named WM-10 subtest: `ProjectMember evidence is not assignment fallback`.

## 18. Participant boundary

Named WM-10 subtests: `participant is not assignment fallback` and `participant role cannot bypass the canonical primary-assignee relation`.

## 19. Reviewer/approver boundary

Named WM-10 subtests: `reviewer is not assignment fallback` and `approver is not assignment fallback`.

## 20. Creator/assignedBy boundary

Named WM-10 subtests: `creator is not assignment fallback` and `assignedBy is provenance and not assignment fallback`.

## 21. Effect-intent boundary

Named WM-10 subtests: `assignment intent is not assignment fallback` and `handover execution intent is not assignment fallback`.

## 22. Workload consumer audit

The workload calculator accepts workload-task inputs; it neither reads `primaryAssigneeId` nor falls back from collaborator/project membership.

## 23. Authorization consumer audit

`isPrimaryAssignee` and the legacy own-scope check use the canonical resolver. Reviewer, approver, creator, and assigned-by remain explicitly named authorization relations rather than assignment projections.

## 24. Mutation whitelist

Exact test: `only ASSIGN and EXECUTE_HANDOVER may mutate primaryAssigneeId after creation` checks all 25 actions.

## 25. Rollback

Exact regression: `EXECUTE_HANDOVER rollback`; concrete-store `Slice C EXECUTE_HANDOVER post-complete rollback`. Both retain the original projection and prevent effects/replay publication on failure.

## 26. Replay

Exact regression: `EXECUTE_HANDOVER replay`; concrete-store `Slice C EXECUTE_HANDOVER replay and conflict`. Replay does not transfer twice.

## 27. Idempotency conflict

Exact regression group `handover idempotency conflicts isolate identity fields and real commands` includes `EXECUTE_HANDOVER` actor, company, task, fingerprint and real-command conflicts.

## 28. Transaction finalization

`four slices discard staged completion on final commit failure, retry once, and replay` includes `Slice C EXECUTE_HANDOVER post-complete rollback`, where `completion.publish()` happens only after final task/effect commit.

## 29. Cross-slice preservation

Exact test: `handover actions preserve B1 and B2 histories while changing only handover projections`; it deep-compares submission, review, completion, reopen, cancellation, archive, restore, deadline, progress and blocker state.

## 30. Exact traceability matrix

| Invariant | Exact test name |
|---|---|
| primary projection | `primaryAssigneeId is the sole current assignment projection` |
| creator / assignedBy not fallback | `creator is not assignment fallback`; `assignedBy is provenance and not assignment fallback` |
| participant / reviewer / approver not fallback | respective named subtests in `each non-projection candidate remains non-assignment evidence` |
| ProjectMember not source | `ProjectMember evidence is not assignment fallback` |
| receiver not source pre-execution | `active handover receiver is not assignment fallback before execution` |
| ASSIGN authority | `assign emits exact history and all structured eligibility failures are stable and non-mutating` |
| EXECUTE_HANDOVER authority | `APPROVE_HANDOVER and EXECUTE_HANDOVER transfer the assignee atomically only at execution` |
| pre-execution preservation | `REQUEST_HANDOVER appends generation one without transferring the assignee` |
| rollback / replay / finalization | `EXECUTE_HANDOVER rollback`; `EXECUTE_HANDOVER replay`; `Slice C EXECUTE_HANDOVER post-complete rollback` |

## 31. WM-10 test results

`npx tsx --test ...*assignment-source* ...*assignment-mutation*`: **17 pass, 0 fail, 0 skipped**.

## 32–39. Regression results

- Idempotency: 35 pass, 0 fail, 0 skipped.
- Slice C: 153 pass, 0 fail, 0 skipped.
- Slice B2: 134 pass, 0 fail, 0 skipped.
- Slice B1: 26 pass, 0 fail, 0 skipped.
- Slice A: 50 pass, 0 fail, 0 skipped.
- Workflow: 12 pass, 0 fail, 0 skipped.
- Registry: 614 pass, 0 fail, 0 skipped.
- All Work Management: **1096 pass, 0 fail, 0 skipped**.

## 40–42. Static verification

`npx eslint` over all changed WM-10 source/tests: exit 0, no warnings. `npx tsc -p tsconfig.work-management.json`: exit 0. `npx tsc --noEmit`: exit 0.

## 43. Files modified

- `src/lib/work-management/application/assignment-source-of-truth.ts`
- `src/lib/work-management/application/core-task-executor.ts`
- `src/lib/work-management/application/services.ts`
- `src/lib/work-management/permissions/scope-evaluator.ts`
- `src/lib/work-management/errors/codes.ts`
- `src/lib/work-management/tests/assignment-source-of-truth.test.ts`
- `src/lib/work-management/tests/assignment-mutation-authority.test.ts`
- WM-08/09 reconciliation and WM-10 QA artifacts.

## 44. Hash verification

The WM-10 frozen baseline records final hashes for resolver, executor, scope evaluator, legacy service and new test matrices. Existing protected slices were regression-tested; no schema, migration, database, API, or UI file was changed.

## 45–46. WM-10 ledger and closure

All AST-01 through AST-45 are DONE; no PENDING or BLOCKED item remains. **WM-10 Final Gate: DONE.**

## 47. Remaining WM-11/WM-12

Not started. Future append-only assignment history may materialize committed intents but must not create a competing current read source.

## 48. Schema status

**NO-GO.** No Prisma schema, migration, or database mutation occurred.
