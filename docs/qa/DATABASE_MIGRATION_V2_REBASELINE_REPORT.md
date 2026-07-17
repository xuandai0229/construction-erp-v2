# Database Migration V2 Re-baseline Report

## Conclusion

**MIGRATION HISTORY V2 RE-BASELINE: DONE.** Legacy artifact recovery is superseded by the approved controlled V2 history; it is not represented as a recovery of historic checksums.

## Safety and source

- Existing source database: read only, not mutated.
- Fresh isolated QA target: `127.0.0.1:5432/construction_erp_v2_qa_baseline_v2_runtime_20260716` (masked, QA-named).
- QA safety guard: PASS.
- Existing-database baseline resolve: NOT EXECUTED.

## Active deploy

`prisma migrate deploy` applied the V2 baseline and the additive Work Management migration. Follow-up status: 2 applied, 0 failed, 0 pending. Schema parity with `prisma/schema.prisma`: PASS.

## Runtime evidence after deploy

`scripts/qa/work-management-main-product-phase1-runtime.ts` used the real Prisma adapter, product composition and CoreTaskExecutor on the fresh QA database. It persisted and reloaded CREATE_DRAFT, ASSIGN, ACCEPT, START, UPDATE_PROGRESS, SUBMIT, REQUEST_CHANGES, resubmission, APPROVE_RESULT and CONFIRM_COMPLETION in exact order; it also verified scoped idempotency replay, same-key cross-project isolation, unauthorized direct mutation denial and stale-version non-mutation. Output: `PASS`, 10 action rows and 43 persisted outbox messages. The script cleans only its generated fixture IDs.

## Explicit non-claims

No existing database cutover or database migration history forgery was performed here. The production-server browser runner was attempted only against the isolated QA environment but timed out before assertions; it was stopped and fixtures were cleaned. Browser/API acceptance remains Main Product Phase 1 work, not a migration-V2 blocker.
