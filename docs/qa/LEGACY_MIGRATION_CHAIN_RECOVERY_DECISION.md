# Legacy Migration Chain Recovery Decision

> **SUPERSEDED BY CONTROLLED MIGRATION HISTORY V2 DECISION.** This document remains immutable historical evidence. The approved active path is documented in `DATABASE_MIGRATION_V2_REBASELINE_REPORT.md`.

## Decision

**LEGACY MIGRATION CHAIN RECOVERY: BLOCKED.**

Blocker: **Original applied migration artifacts and checksums cannot be recovered.**

The affected migrations are `20260713154208_phase2_schema`, `20260713155300_phase3_quality_safety_schema`, and `20260713173000_remove_redundant_structure_module`.

## Why reconstruction is prohibited

Each affected migration has a finished historical QA ledger row but no recoverable original SQL artifact. The recovery rules therefore require the original byte-identical artifact; creating new SQL under the same migration name would change an applied checksum and manufacture migration history.

The missing `SystemSetting` creation migration is separately reproducible from adjacent schema commits, but adding it cannot make the chain trustworthy while the three applied artifacts remain unrecovered. It is deliberately not reconstructed in this worktree.

## Required evidence to unblock

One of the following must provide each original file:

- the migration author's repository or unpushed commit;
- CI/deployment artifact archive;
- source backup; or
- another environment containing the exact artifact.

For each recovered file, compute SHA-256 and require an exact match to the finished ledger checksum before restoring it byte-for-byte. Only then may a fresh, newly created QA database be used for `prisma migrate deploy`.

## Explicit non-actions

- No historical SQL was changed or reconstructed.
- No `_prisma_migrations` row was edited.
- No migration was skipped, resolved, reset, or applied manually.
- The partially migrated QA database is not reused.
- The existing local database remains untouched.
