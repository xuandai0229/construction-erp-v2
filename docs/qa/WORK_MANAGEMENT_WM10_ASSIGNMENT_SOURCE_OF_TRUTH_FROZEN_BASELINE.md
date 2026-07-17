# WM-10 Assignment Source of Truth Frozen Baseline

## Contract

- Current operational projection: `CoreTaskAggregate.primaryAssigneeId`.
- Provenance only: `assignedById`.
- Post-creation writers: `ASSIGN`, `EXECUTE_HANDOVER`.
- Frozen creation initialization: not supported; `CREATE_DRAFT` creates an unassigned draft.
- Explicit non-sources: ProjectMember/project membership, creator, assigned-by, participants, reviewer, approver, active handover receiver, staged assignment intents, handover execution intents, notification recipients, privileged actors, and SYSTEM actors.
- No fallback: missing assignment is `UNASSIGNED`; an assignee-required business operation throws `TASK_ASSIGNMENT_REQUIRED`; malformed projections throw `TASK_ASSIGNMENT_PROJECTION_INVALID`.

## Protected files

| File | Final hash | Purpose | Future constraint |
|---|---|---|---|
| `application/assignment-source-of-truth.ts` | `c7a9f7518997bf04361dcb259b7cdceb44486aa4` | Canonical resolver and write policy | No fallback source may be introduced. |
| `application/core-task-executor.ts` | `06f6e6c4979481d536d554ccc251eda35ad867cd` | Uses resolver for assignment, handover and effect semantic reads | Preserve 25-action behavior and authority whitelist. |
| `permissions/scope-evaluator.ts` | `ef09827fb1c7eb58dbdec362f520e3e0401ea25c` | Canonical primary-assignee relation | Participants cannot substitute the projection. |
| `application/services.ts` | `91c41bec2a4ce3c26820870a6d4262f4485138de` | Legacy application scope policy reads resolver | Preserve fail-closed behavior. |
| `tests/assignment-source-of-truth.test.ts` | `608d0b050b755276b24aa688b86f48c0d505925d` | No-fallback and invalid-projection matrix | Do not weaken named candidate-source cases. |
| `tests/assignment-mutation-authority.test.ts` | `30da6a02b567fe6c7ad9b944ba88d3192f3a5f8f` | 25-action mutation whitelist | Only two post-creation writers remain true. |
| `tests/core-task-executor.test.ts` | `f2984923959c9310b453346d256ea27b085edea6` | Frozen CREATE_DRAFT initialization assertion | A client-provided `primaryAssigneeId` must not initialize the projection. |

## Required regression

`npx tsx --test src/lib/work-management/tests/*assignment-source*.test.ts src/lib/work-management/tests/*assignment-mutation*.test.ts`

`npx tsx --test src/lib/work-management/tests/*handover*.test.ts`

`npx tsx --test src/lib/work-management/tests/*in-memory-idempotency*.test.ts`

`npx tsx --test src/lib/work-management/tests/*.test.ts`

`npx tsc -p tsconfig.work-management.json`

`npx tsc --noEmit`

WM-11 may later add append-only assignment history from committed intents. It must not add another current-assignee source, weaken the resolver, or expand the writer whitelist. Schema remains **NO-GO**.
