# Database Migration V2 Existing Database Cutover Plan

**NOT EXECUTED.** Existing databases remain outside this change.

1. Obtain explicit owner approval and a verified backup.
2. Repeat authoritative catalog/schema parity against the database to be cut over.
3. Verify the immutable V2 baseline SQL hash and approved active-history manifest.
4. Only for an already-existing schema proven equal to the baseline, execute the approved `migrate resolve --applied 0_baseline_v2_existing_product_schema` procedure.
5. Deploy the additive Work Management migration afterwards.
6. Verify `migrate status`, schema parity, rollback/escalation readiness, and application acceptance.

No local, production, or staging database was resolved or migrated in this worktree.
