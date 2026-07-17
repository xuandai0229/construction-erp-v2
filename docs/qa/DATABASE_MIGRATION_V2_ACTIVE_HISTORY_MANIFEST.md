# Database Migration V2 Active History Manifest

Active Prisma migration path contains exactly:

1. `0_baseline_v2_existing_product_schema` — empty database to the read-only authoritative source schema, including the reviewed `FieldProgressItem_active_sibling_code_key` expression/partial unique index.
2. `20260716090000_work_management_main_product_phase1` — additive Work Management enum/tables/FKs/indexes: `WorkTask`, `WorkTaskAction`, `WorkTaskOutboxMessage`, and `WorkTaskIdempotency`.

`WorkTaskIdempotency` uses `@@unique([key, scopeKey])`; `scopeKey` isolates actor/project/task/action. A global idempotency-key unique index is deliberately absent.

Fresh QA target `construction_erp_v2_qa_baseline_v2_runtime_20260716` deployed both migrations: 2 applied, 0 failed, 0 pending. `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` reported no difference.

## Final hashes

| File | Git hash-object |
|---|---|
| `prisma/migrations/0_baseline_v2_existing_product_schema/migration.sql` | `4d26e2657a83d8f1d18d52a56cbb95a43ed0ee94` |
| `prisma/migrations/20260716090000_work_management_main_product_phase1/migration.sql` | `f11aeb8c527f3740c56ba418126af7d21c9a3366` |
| `prisma/schema.prisma` | `6deca04e8d53a79a83b16e502c332ad9274dd2f7` |
| `src/lib/work-management/infrastructure/prisma-core-task.ts` | `949190697bda79a67732e1660aa0ec7128cc84d8` |
| `scripts/qa/work-management-main-product-phase1-runtime.ts` | `58328620721325f2e18de0b092c721f0be64e38b` |
