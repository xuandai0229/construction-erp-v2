# Legacy Migration Chain Provenance Audit

> **SUPERSEDED BY CONTROLLED MIGRATION HISTORY V2 DECISION.** This audit remains historical evidence; it was not edited to simulate recovery of missing artifacts.

## Scope and safeguards

This audit used Git history/object reads and read-only `_prisma_migrations` queries only. It did not run `migrate resolve`, `db push`, `migrate dev`, reset, or a mutation against the existing local database.

## Migration evidence

| Migration | Repository artifact | Historical ledger evidence | Provenance decision |
|---|---|---|---|
| `20260709000000_add_unique_source_entry` | Present and tracked | Existing local DB finished; checksum `91424eac48a5d774564de8c1b4bb81000826638046e0ba41d3b4d81be5ba6f3d` matches the current file | Applied artifact protected; no change permitted. |
| `20260713154208_phase2_schema` | Missing: neither directory nor `migration.sql` exists; not tracked | QA ledger has a finished row with checksum `734950976b78fa8325465c158283b58e1759b4b0bb4a903e9593842a15ae5c42` after two rolled-back attempts with different checksums | **APPLIED_ELSEWHERE_UNKNOWN** |
| `20260713155300_phase3_quality_safety_schema` | Missing: neither directory nor `migration.sql` exists; not tracked | QA ledger has a finished row with checksum `657b5760f7dfd7b331637acb1fe06ce69ab6a5836108314fffeb7c05cc894c78` | **APPLIED_ELSEWHERE_UNKNOWN** |
| `20260713173000_remove_redundant_structure_module` | Missing: neither directory nor `migration.sql` exists; not tracked | QA ledger has a finished row with checksum `f638ad1effaab7a24b7e1f440e10561f7024b5aff56ed03db1fbea3ed8d4deae` | **APPLIED_ELSEWHERE_UNKNOWN** |

## Searches completed

- `git log --all --full-history --name-status -- prisma/migrations` found no source path for the three missing artifacts.
- `git ls-files --stage` confirms no missing artifact is tracked.
- Reachable refs are `main` and `origin/main`; no tag or alternate branch contains the files.
- The all-object checksum scan documented in `MIGRATION_HISTORY_RECOVERY_EVIDENCE.md` examined 4,306 blobs with zero read errors and found no blob matching any of the three finished checksums.
- The current local database was queried read-only. It confirms the protected applied checksum for `20260709000000_add_unique_source_entry` and its live `SystemSetting` table; it has no rows for the three missing names. The historical QA ledger above remains evidence that the missing SQL was applied elsewhere.

## SystemSetting origin

`SystemSetting` first appears in commit `3c58025a3e6638b9bd22573156fb113fcc0fd175`; its parent lacks the model and the commit contains no migration. This is `NEVER_COMMITTED` as a migration artifact. It explains the fresh-database failure at the later `20260709000000_add_unique_source_entry` migration, but it does not authorize rewriting the three applied, missing historical migrations.

## Conclusion

The exact original artifacts and checksums for three historically applied migrations cannot be recovered from the repository, its reachable refs, or its local Git object database. Their semantics cannot be inferred safely from the current schema or database.
