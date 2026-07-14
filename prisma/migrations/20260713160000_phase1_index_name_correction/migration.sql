-- Generated from `prisma migrate diff` against QA after the Phase 1 migration.
-- PostgreSQL truncated the original identifiers at its 63-byte limit. Rename
-- them to Prisma's deterministic names without changing index definitions.

ALTER INDEX "FieldProgressItemAssignment_fieldProgressItemId_projectMemberId" RENAME TO "FieldProgressItemAssignment_fieldProgressItemId_projectMemb_key";
ALTER INDEX "FieldProgressItemLocation_fieldProgressItemId_locationNodeId_ke" RENAME TO "FieldProgressItemLocation_fieldProgressItemId_locationNodeI_key";
