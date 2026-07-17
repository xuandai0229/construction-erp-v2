# Work Management Main Product Phase 1 — Route/Data Matrix

| Route | Data source | Server-owned checks | Reload behavior |
|---|---|---|---|
| `/tasks` | `WorkTask` projection plus `WorkTaskAction` timeline | Session and accessible `ProjectMember` projects | Server component reloads current project and “my tasks” query. |
| `GET /api/work-management/tasks` | `WorkTask` projection | Session and accessible project IDs | Returns only projects in server scope. |
| `POST /api/work-management/tasks/create` | `CoreTaskExecutor` + Prisma UoW | Session, project access, permission, strict create schema, idempotency key | Creates projection, action/effects, outbox and completion atomically. |
| `POST /api/work-management/tasks/:id/actions` | `CoreTaskExecutor` + Prisma UoW | Session, task load, scope, permission, actor relation, state, expected version, idempotency key | Returns sanitized result; client refreshes list/detail. |
