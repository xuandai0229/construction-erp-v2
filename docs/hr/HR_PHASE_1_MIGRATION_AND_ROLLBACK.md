# HR Phase 1 — Migration & Rollback Guide

## Migration Details
- **Migration Name**: `20260804100000_init_hr_core_foundation`
- **Type**: Strictly Additive SQL Migration
- **Execution Command**: `npx prisma migrate deploy`

## Validation & Reproducibility
- Automated schema replay test script: `scripts/qa/phase1-schema-replay.ts`
- Verified schema 100% identical when replayed from clean scratch database.

## Rollback Procedure
If rollback is required:
```sql
DROP TABLE IF EXISTS "EmployeeCodeSequence" CASCADE;
DROP TABLE IF EXISTS "EmployeeChangeHistory" CASCADE;
DROP TABLE IF EXISTS "UserAccessGrant" CASCADE;
DROP TABLE IF EXISTS "HrPermissionDefinition" CASCADE;
DROP TABLE IF EXISTS "EmployeeProjectAssignment" CASCADE;
DROP TABLE IF EXISTS "ProjectPersonnelRole" CASCADE;
DROP TABLE IF EXISTS "OrganizationUnitManagerAssignment" CASCADE;
DROP TABLE IF EXISTS "EmployeeOrganizationAssignment" CASCADE;
DROP TABLE IF EXISTS "Employee" CASCADE;
DROP TABLE IF EXISTS "Position" CASCADE;
DROP TABLE IF EXISTS "OrganizationUnit" CASCADE;
DROP TYPE IF EXISTS "EmployeeProjectAssignmentStatus";
DROP TYPE IF EXISTS "SensitiveFieldPolicy";
DROP TYPE IF EXISTS "HrDataScope";
DROP TYPE IF EXISTS "GrantEffect";
DROP TYPE IF EXISTS "EmployeeStatus";
```
- Existing `User` and `Project` records remain unaffected due to additive foreign keys with `ON DELETE SET NULL / RESTRICT`.
