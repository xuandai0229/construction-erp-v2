# Data Model: Cán bộ giám sát công trình

## User role

- Existing `User.role` receives additive value `CONSTRUCTION_SUPERVISOR`.
- It remains a system role, not a project role.
- It does not create `ProjectMember` rows and does not use `SupervisionScope`, which remains specific to `SUPERVISION_HEAD`.

## Derived authorization scopes

- `ALL_PROJECTS_OPERATIONAL_READ_ONLY`: computed from current role for read queries only.
- `SUPERVISION_WEEKLY_AUTHOR`: computed from current role and used with ownership/state checks.
- Neither scope is stored per project.

## Weekly dossier ownership

- `createdById` is authoritative ownership.
- Multiple authors may each have a dossier for the same week; uniqueness stays `(createdById, weekStart, version)`.
- A dossier is not owned by one project. Project references live on child rows.

## Weekly state transitions

```text
DRAFT --SUBMIT--> SUBMITTED
SUBMITTED --REQUEST_REVISION (reviewer only)--> REVISION_REQUIRED
REVISION_REQUIRED --SUBMIT (owner only)--> SUBMITTED
SUBMITTED --APPROVE (reviewer only)--> APPROVED
APPROVED --LOCK (reviewer only)--> LOCKED
```

For `CONSTRUCTION_SUPERVISOR`:

- edit: owner and status DRAFT or REVISION_REQUIRED;
- submit/resubmit: owner and matching editable status;
- preview: any readable dossier;
- export/print: owner, except LOCKED is view-only;
- review/approve/reject/request revision/lock/unlock: always false.

## Row integrity

- Every supplied persisted row ID must already belong to the dossier being saved.
- Referenced project must be in the actor's read scope.
- Referenced category/work item must exist, belong to the selected project and maintain the correct parent relationship.
- Save replaces only child rows of the dossier; it never updates Project, WBS, field progress, material, task, document or approval sources.

## Tenant boundary

No tenant entity or foreign key exists in the current schema. Deployment/database is the tenant boundary. This feature adds no misleading partial tenant model.
