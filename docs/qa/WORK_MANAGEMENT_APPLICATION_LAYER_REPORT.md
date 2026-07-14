# Work Management application layer report

The application layer has no Prisma import and no runtime API/UI. It defines command contracts, actor context, repository/transaction/document/notification/audit ports, domain events and a transaction-oriented `TaskApplicationService`.

The service receives actor context separately from commands, checks action permission before compare-and-save, expresses `expectedVersion` conflicts, and emits activity/audit/notification intents only after a successful save. Persistence adapters remain intentionally absent.

Test evidence: `src/lib/work-management/tests/application-services.test.ts` has 5 passing unit tests for transaction invocation, denied permission/scope without mutation, stale version conflict and failed compare-and-save conflict.
