# Work Management Main Product Phase 1 Ledger

| Item | Status | Evidence |
|---|---|---|
| MP-01 Current-system map | DONE | Current system map records real session, RBAC, scope and missing task persistence/UI. |
| MP-02 Schema decision | DONE | Additive schema and migration created; current schema has no Company entity, so tenancy is project-scoped. |
| MP-03 Persistence | DONE | V2 baseline plus additive Work Management migration deployed to a fresh isolated QA database; real Prisma lifecycle persistence passed. |
| MP-04 Authorization/scope | DONE | Session, active project membership, actor relation and scope composition are used in the server product composition. |
| MP-05 Service integration | DONE | Existing `CoreTaskExecutor` is composed by the product adapter; no second executor exists. |
| MP-06 API/server actions | DONE | Authenticated task list/create/action routes are compiled into the Next application. |
| MP-07 UI integration | DONE | `/tasks` dashboard route and sidebar navigation are compiled; project switch refreshes server data and clears selection. |
| MP-08 CREATE/ASSIGN | DONE | Fresh-QA product composition persisted CREATE_DRAFT and ASSIGN and reloaded both projection/history state. |
| MP-09 ACCEPT/START/PROGRESS | DONE | Fresh-QA product composition persisted ACCEPT, START and UPDATE_PROGRESS. |
| MP-10 SUBMIT/REVIEW | DONE | Fresh-QA product composition persisted SUBMIT, REQUEST_CHANGES, resubmission and APPROVE_RESULT. |
| MP-11 Completion | DONE | Fresh-QA product composition persisted CONFIRM_COMPLETION and the completed projection. |
| MP-12 Project isolation | DONE | Direct product mutation for an outsider is denied; same idempotency key in another project creates an independent task. |
| MP-13 Reload persistence | DONE | The integration script reloads `WorkTask`, action timeline, outbox and idempotency rows after the lifecycle. |
| MP-14 Concurrency/idempotency | DONE | Scoped composite idempotency identity, replay and stale-version non-mutation are exercised against Prisma. |
| MP-15 Integration tests | DONE | Fresh V2 QA deploy and real Prisma product-composition lifecycle script pass. |
| MP-16 Browser acceptance | DONE | Production QA browser flow passed: real login, task UI create/reload, lifecycle, outsider denial, project switch, 10 action rows and 43 outbox messages. |
| MP-17 Regression/build | DONE | Prisma validate/generate, Work Management regression (1291 pass), TypeScript and production build pass. |
| MP-18 Final product gate | DONE | Migration V2, persisted lifecycle, production QA browser acceptance, regression and build evidence pass. Existing database cutover remains NOT EXECUTED. |
