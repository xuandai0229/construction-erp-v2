# Work Management Main Product Phase 1 — Current System Map

## Audit result

| Area | Status | Evidence |
|---|---|---|
| Session resolver | EXISTS_AND_USED | `src/lib/auth.ts` resolves the signed-in active user from the HTTP-only session cookie. |
| RBAC and project scope | EXISTS_AND_USED | `src/lib/rbac.ts` and `ProjectMember` enforce active project access. |
| Project switch context | EXISTS_AND_USED | `src/lib/project-context.ts` resolves URL/cookie project selection and accessible projects. |
| Prisma task model | MISSING | `schema.prisma` previously contained no Task/WorkTask model. |
| CoreTaskExecutor | EXISTS_BUT_NOT_CONNECTED | `src/lib/work-management/application/core-task-executor.ts` was only composed with in-memory adapters in tests. |
| Repository/UoW | EXISTS_BUT_NOT_CONNECTED | Core ports and in-memory UoW existed; no Prisma implementation was present. |
| Idempotency/outbox | EXISTS_BUT_NOT_CONNECTED | Process-local implementations existed; no persisted product boundary existed. |
| Task list/detail/create UI | MISSING | Dashboard had no `/tasks` route or Work Management navigation. |
| API/server mutation boundary | MISSING | No authenticated Work Management route existed. |
| Existing UI data | EXISTS_AND_USED | Projects, reports, documents, materials and approvals use Prisma-backed dashboard routes; Work Management did not. |

## Canonical product path implemented by this phase

`Authenticated request -> strict action schema -> server session context -> Prisma aggregate/history load -> project/RBAC/actor-policy checks -> CoreTaskExecutor -> Prisma transaction for projection, action history, outbox and idempotency -> sanitized JSON -> route refresh`.

Client-provided task state, actor IDs, company IDs, histories, effects and responsibility snapshots are never authoritative. Trusted aggregate snapshots are loaded server-side.
