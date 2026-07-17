# Database Migration V2 Legacy Archive Manifest

Legacy active history was moved unchanged to `prisma/migrations_legacy_archive_20260716/`; it is no longer read by Prisma deploy.

| Migration family | Archive state | Recovery state |
|---|---|---|
| Historical migrations through `20260713153000_phase1_structure_wbs_lbs` | Preserved byte-for-byte | Historical evidence retained |
| `20260713154208_phase2_schema` | Directory retained with original missing-artifact evidence | APPLIED_ELSEWHERE_UNKNOWN; ORIGINAL ARTIFACT UNAVAILABLE; NOT RECONSTRUCTED |
| `20260713155300_phase3_quality_safety_schema` | Directory retained with original missing-artifact evidence | APPLIED_ELSEWHERE_UNKNOWN; ORIGINAL ARTIFACT UNAVAILABLE; NOT RECONSTRUCTED |
| `20260713173000_remove_redundant_structure_module` | Directory retained with original missing-artifact evidence | APPLIED_ELSEWHERE_UNKNOWN; ORIGINAL ARTIFACT UNAVAILABLE; NOT RECONSTRUCTED |
| `migration_lock.toml` and `000_drift_resolution.sql` | Preserved in archive | Not part of active V2 deploy |

No historical migration SQL was edited, renamed, checksum-forged, reconstructed under its old name, or marked in `_prisma_migrations`.
