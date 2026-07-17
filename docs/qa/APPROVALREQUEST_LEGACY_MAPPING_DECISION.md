# APPROVALREQUEST LEGACY MAPPING DECISION

## I. Source & Target Schema Context
- **Source schema**: Legacy `ApprovalRequest` contains `sourceType`, `sourceId`, and `approverId`.
- **Target schema**: V2 `ApprovalRequest` enforces `entityType`, `entityId`, and `decidedById`.
- **Git History**: Legacy code used `sourceType`/`sourceId` for polymorhic relations. However, V2 enforces strong NOT NULL constraints on `entityType`/`entityId`.

## II. Read-Only Inventory of Legacy Rows

The source database contains 2 rows in the `ApprovalRequest` table:

| Row | type | status | sourceType present | sourceId present | approverId present | requesterId present | projectId present |
|---:|---|---|---:|---:|---:|---:|---:|
| 1 | METHOD_STATEMENT | APPROVED | NO | NO | NO | YES | YES |
| 2 | QUALITY | PENDING | NO | NO | NO | YES | YES |

**Findings**:
1. Both rows have `sourceType` and `sourceId` as `null` or missing.
2. Both rows lack an `approverId`.
3. Because they lack any source identifiers, they are orphaned from any business entity and cannot be safely mapped to a specific `entityType` or `entityId`.

## III. Exact Field Mapping Matrix

| Target field | Source field | Rule | Evidence | Decision |
|---|---|---|---|---|
| id | id | SAME_COLUMN | Schema match | PROVEN |
| projectId | projectId | SAME_COLUMN | Schema match | PROVEN |
| title | title | SAME_COLUMN | Schema match | PROVEN |
| status | status | SAME_COLUMN | Schema match | PROVEN |
| type | type | SAME_COLUMN | Schema match | PROVEN |
| priority | priority | SAME_COLUMN | Schema match | PROVEN |
| dueDate | dueDate | SAME_COLUMN | Schema match | PROVEN |
| requesterId | requesterId | SAME_COLUMN | Schema match | PROVEN |
| decidedById | approverId | PROVEN_RENAME | Migration history mapping | PROVEN |
| decidedAt | decidedAt | SAME_COLUMN | Schema match | PROVEN |
| decisionNote| decisionNote | SAME_COLUMN | Schema match | PROVEN |
| entityType | sourceType | UNPROVEN | Missing in source data | UNPROVEN |
| entityId | sourceId | UNPROVEN | Missing in source data | UNPROVEN |
| createdAt | createdAt | SAME_COLUMN | Schema match | PROVEN |
| updatedAt | updatedAt | SAME_COLUMN | Schema match | PROVEN |
| deletedAt | deletedAt | SAME_COLUMN | Schema match | PROVEN |
| code | code | SAME_COLUMN | Schema match | PROVEN |

## IV. Decision Gate

**Decision**: HUMAN_BUSINESS_DECISION_REQUIRED

**Rationale**: The 2 legacy rows in the source database do not contain any `sourceType` or `sourceId` references. Without these references, it is technically impossible to accurately infer the required `entityType` and `entityId` for the V2 schema. Since I cannot arbitrarily invent business relationships or decide to drop these rows without formal business approval, a human business decision is required on whether to patch these rows with specific entity data, or formally declare them obsolete so they can be dropped during cutover.
