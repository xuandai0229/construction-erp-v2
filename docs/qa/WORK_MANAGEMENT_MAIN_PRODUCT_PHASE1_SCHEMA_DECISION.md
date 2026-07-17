# Work Management Main Product Phase 1 — Schema Decision

Schema change required: YES — MINIMAL ADDITIVE MIGRATION CREATED.

| Need | Existing schema | Decision |
|---|---|---|
| Task identity, project ownership, creator, current assignee, status, deadline, progress, version | Missing | Add `WorkTask` projection with canonical aggregate snapshot. |
| Assignment/lifecycle/progress/result/review/completion history | Missing | Persist append-only CoreTask typed effects in `WorkTaskAction`; aggregate snapshot retains exact history records. |
| Transactional outbox messages | Missing | Add `WorkTaskOutboxMessage`. |
| Idempotency identity/replay result | Missing | Add `WorkTaskIdempotency`. |
| Company ownership | No company model exists in the ERP schema | Keep trusted `companyId = null`; project ownership is the real tenant boundary. |

Migration: `prisma/migrations/20260716090000_work_management_main_product_phase1/migration.sql`.

It is additive and has not been applied. The isolated QA database was created and received the ordered chain until a pre-existing legacy migration-chain defect stopped deployment before this migration. No reset, `db push`, or mutation was run against the existing local database.
