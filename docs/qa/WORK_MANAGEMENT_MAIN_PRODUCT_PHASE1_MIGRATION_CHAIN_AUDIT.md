# Work Management Main Product Phase 1 — Migration Chain Audit

## Result

**BLOCKED.** The repository cannot safely deploy its full Prisma history to a fresh database. This is a legacy-history blocker, not a Work Management schema defect.

## Fresh QA attempt

The isolated QA safety guard accepted a distinct local target at `127.0.0.1:5432/construction_erp_v2_qa_phase1_20260716`. The existing `DATABASE_URL` database was not mutated.

`prisma migrate deploy` applied the first 14 migrations and then failed at `20260709000000_add_unique_source_entry` with PostgreSQL `42P01`: `SystemSetting` did not exist. The QA database now has 14 finished rows, one failed row, and nine pending migrations; it must not be reused for another recovery attempt.

## Current migration inventory

| Order | Migration | SQL present | Git tracked | Fresh-chain status |
|---:|---|---|---|---|
| 15 | `20260709000000_add_unique_source_entry` | Yes | Yes | Fails because it alters `SystemSetting` before any recorded migration creates it. |
| 19 | `20260713154208_phase2_schema` | **No directory or SQL artifact** | No | Historical finished checksum exists; original artifact is missing. |
| 20 | `20260713155300_phase3_quality_safety_schema` | **No directory or SQL artifact** | No | Historical finished checksum exists; original artifact is missing. |
| 23 | `20260713173000_remove_redundant_structure_module` | **No directory or SQL artifact** | No | Historical finished checksum exists; original artifact is missing. |
| 24 | `20260716090000_work_management_main_product_phase1` | Yes | Untracked Phase 1 patch | Not reached. |

## SystemSetting provenance

`model SystemSetting` was introduced by commit `3c58025a3e6638b9bd22573156fb113fcc0fd175` (`don_pate10`). That commit changed only `prisma/schema.prisma`; it did not add a migration artifact. Its parent has no `SystemSetting` model. The later, applied `20260709000000_add_unique_source_entry` migration assumes the table already exists and has repository SHA-256 `2796a5a0288edb7874c6510ac504b3f2a7d6fff76445bb8426b32e1a4304b535`, matching the existing database checksum `91424eac48a5d774564de8c1b4bb81000826638046e0ba41d3b4d81be5ba6f3d`.

No applied historical migration file was changed.

## Decision

No migration SQL was reconstructed, no migration directory was removed, and no migration metadata was edited. Recovery cannot proceed until the original byte-identical artifacts for the three historically applied migrations are supplied and checksum-verified. See `LEGACY_MIGRATION_CHAIN_PROVENANCE_AUDIT.md` and `LEGACY_MIGRATION_CHAIN_RECOVERY_DECISION.md`.
