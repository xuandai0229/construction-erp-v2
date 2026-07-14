# WM-06A/WM-07A Slice A final verification report

## 1. Kết luận

**Slice A Final Verification Gate: DONE.** Twelve Slice A actions are verified; Slice B/C, WM-08 and schema persistence were not started.

## 2. Worktree baseline

Branch `main`, HEAD `08828aa don_pate35`; the existing unrelated dirty worktree was preserved.

## 3. Protected foundation hashes

| File | Before | After | Match |
|---|---|---|---|
| workload.ts | 9b5b126a073c28e13e186c96188be6d032d094f6 | same | YES |
| workload.test.ts | 03d95cfc204a6f0cb7b81f47a0251f00e518974d | same | YES |
| action-registry.ts | 58bc84ad5f4207f58d196c6ca03883c7e346afb4 | same | YES |
| actor-policy.ts | 8cea7fbf204076abaac6607cc20200ed657643d1 | same | YES |
| registry tests (3) | c72d2499 / 266d9c88 / 6cf24461 | same | YES |

## 4. Controlled files changed

`core-task-executor.ts` changed from `9d6fff…` to `b323b7…`: mandatory transition resolver, replay identity check, typed action payloads, execution history and separation-of-duties. `transition-policies.ts` (`06adb0…`) and `workflow.ts` (`503c1d…`) remain unchanged in this verification pass. The 25-action mapping is unchanged.

## 5. Transition authority audit

Transition policy is the sole executor authority: **YES**. The executor owns a mandatory `transitionPolicies` resolver and calls its `policy.evaluate` result.

## 6. Transition bypass search

`rg` found no `evaluateTaskTransition` or `transitionEvaluator` in the executor: **NO direct bypass**.

## 7. Action/policy mismatch behavior

Policy mismatch, policy denial, missing next state, and incompatible event intent fail closed with `TASK_INVALID_TRANSITION`. The custom-policy test proves the executor persists the returned custom next state.

## 8. Idempotency identity and isolation

Identity includes normalized key, action, actor ID, company ID (`null` in current single-tenant mode), target task ID, target project ID, and SHA-256 fingerprint. Replay identity must exactly equal the request.

## 9. Canonical fingerprint

PASS: sorted object keys and Date ISO values generate stable fingerprints; changed parsed payload changes the fingerprint.

## 10. Replay/conflict/in-progress behavior

REPLAY, CONFLICT and IN_PROGRESS are PASS. Cross-actor, cross-company and cross-target replay identities return `TASK_IDEMPOTENCY_CONFLICT` without save/effect staging.

## 11. Idempotency lifecycle

PASS: normalized key → inspect → guards → begin → transactional complete; failed transaction invokes abort while preserving the original transaction error.

## 12. Transaction-scoped Unit of Work

Task create/save, effects/history staging, and completion are transaction-context operations only.

## 13. Repository rollback evidence

PASS: compare-and-save conflict and staging/completion failure restore the aggregate. Create staging failure removes the new task.

## 14. Effects/history rollback evidence

PASS: staged effects and all embedded history intents return to the snapshot after each failure.

## 15. Idempotency rollback evidence

PASS: completion is absent after conflict, staging failure, completion failure, and create failure.

## 16. CREATE_DRAFT project authorization

PASS: personal, accessible project, missing project (`TASK_PROJECT_NOT_FOUND`) and inaccessible project (`TASK_PROJECT_ACCESS_REQUIRED`) are exact tested cases.

## 17. CREATE_DRAFT confidentiality

PASS: NORMAL requires no special access; RESTRICTED/CONFIDENTIAL/EXECUTIVE deny without access and persist correctly when allowed.

## 18. CREATE_DRAFT field mapping

The strict schema maps existing fields `title`, `description`, `projectId`, `priority`, `currentDueAt`, and `confidentiality`; event/audit payload includes title, project and confidentiality.

## 19. ASSIGN eligibility

PASS: eligible, inactive, not-found, not-assignable, and project-access decisions have stable distinct codes and no mutation on failure.

## 20. ASSIGN separation of duties

PASS: duplicate primary, independent-reviewer conflict and approver conflict are blocked; assignment intent records previous/new assignee, actor, reason and timestamps.

## 21. Typed effects

PASS: public event/activity/audit/notification contracts use unions, not unconstrained strings.

## 22. Action payload matrix

All 12 actions assert event/activity/audit type and required payload keys. Payloads include lifecycle/execution/progress/deadline/assignee data according to the action.

## 23. PAUSE/RESUME history

PASS: `executionHistoryIntents` records previous/new execution, reason, actor and timestamp; denied actions create none.

## 24. BLOCK/UNBLOCK blocker identity

PASS: active aggregate ID, blocker intent, event payload and activity payload agree; unblock resolves the prior ID and clears projection.

## 25. Single-clock evidence

PASS: a clock returning different values is invoked exactly once per execute path tested.

## 26. Input immutability

PASS: frozen current state/actor and cloned raw command remain unchanged; returned aggregate and nested state are distinct references.

## 27. Exact state matrix

12/12: CREATE_DRAFT, ASSIGN, ACCEPT, REQUEST_CLARIFICATION, START, UPDATE_PROGRESS, REQUEST_EXTENSION, CHANGE_DEADLINE, PAUSE, RESUME, BLOCK, UNBLOCK.

## 28. Exact effect matrix

12/12: each success asserts exact event, activity, audit, notification policy and required payload keys.

## 29. Exact error matrix

12/12: invalid lifecycle/duplicate paths assert stable errors; authorization, scope, confidential, concurrency, assignment and idempotency errors have dedicated cases.

## 30. No-mutation matrix

12/12: all invalid lifecycle/duplicate paths assert no save/effect/completion; authorization and invariant denial tests assert no begin.

## 31. Test counts

Slice command: 14 top-level tests, 36 Node subtests, 50 reported tests; pass 50, fail 0, skip 0. Semantic cases include 12 success, 12 lifecycle/duplicate, six guard classes, atomicity failures, project/confidentiality, assignment reasons, identity isolation, payload/history, clock and immutability.

## 32. Registry regression tests

PASS.

## 33. Scoped lint

PASS, exit 0.

## 34. Scoped TypeScript

PASS, exit 0.

## 35. Global TypeScript

PASS, exit 0.

## 36. Files created/modified

`application/core-task-executor.ts`, `core-task-effects.ts`, `core-task-idempotency.ts`, `core-task-ports.ts`, `validation/schemas.ts`, `errors/codes.ts`, Slice A tests and QA ledgers/reports.

## 37. Slice ledger update

A-04 and A-06 through A-21, A-26, A-27 are DONE with this evidence; no Slice ledger item is PENDING.

## 38. Main ledger update

WM-06 and WM-07 remain PENDING overall; Slice A is DONE.

## 39. Remaining Slice B/C work

Result/closure and handover actions are intentionally not started.

## 40. Schema status

NO-GO. No Prisma schema, migration, database mutation, API or UI work was performed.

## Command evidence

```text
npx tsx --test src/lib/work-management/tests/core-task-executor.test.ts src/lib/work-management/tests/core-task-transition.test.ts src/lib/work-management/tests/core-task-idempotency-boundary.test.ts
npx tsx --test src/lib/work-management/tests/action-registry.test.ts src/lib/work-management/tests/action-registry-security.test.ts src/lib/work-management/tests/action-registry-semantics.test.ts
npx tsx --test src/lib/work-management/tests/*.test.ts
npx eslint [all changed Slice A files]
npx tsc -p tsconfig.work-management.json
npx tsc --noEmit
```
