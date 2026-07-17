# Database Migration V2 Authoritative Schema Audit

## Decision

**AUTHORITATIVE BASELINE SOURCE: CURRENT LOCAL DATABASE.** The source was read only. Its masked endpoint is `127.0.0.1:5432/construction_erp_v2_qa`; it was not migrated, resolved, reset, patched, or otherwise mutated.

## Catalog evidence

- 29 tables (including `_prisma_migrations`), 417 columns, 124 enum values, 359 constraints and 135 indexes were inspected.
- Required legacy objects include `SystemSetting`, `User`, `Project` and `ProjectMember`.
- The source has no `WorkTask`, `WorkTaskAction`, `WorkTaskOutboxMessage`, or `WorkTaskIdempotency`; these remain an additive Phase 1 concern.
- Extensions: `plpgsql` only. Views, materialized views, triggers and application-required functions: none.
- The one Prisma-unrepresented object is the source expression/partial unique index `FieldProgressItem_active_sibling_code_key`. It is appended verbatim to the V2 baseline migration after Prisma-generated SQL.

## Reconciliation

The temporary introspected datamodel is `tmp/qa/migration-v2-baseline-source.prisma`. Comparison with `prisma/schema.prisma` showed the Work Management tables/enums/indexes/FKs as the intended additive delta. No existing Work Management table was silently folded into the baseline.
