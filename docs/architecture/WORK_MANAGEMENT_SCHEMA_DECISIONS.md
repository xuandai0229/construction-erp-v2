# Work Management schema decisions (no migration)

- Current scope is single-tenant: Task core uses `User`, without `companyId`; RBAC roles are not JobPositions.
- Department, JobPosition and EmploymentProfile are additive and nullable/backfilled under a later reviewed migration.
- Participant/history is authoritative as described in `WORK_MANAGEMENT_ASSIGNMENT_SOURCE_OF_TRUTH.md`.
- Task state is split into lifecycle, acceptance, execution condition, review, handover and derived deadline condition. Waiting reason is attached to blocked execution, not lifecycle proliferation.
- Task, comment, attachment link, responsibility and delegation will use soft delete where business history requires it. `AuditLog` is generic audit; immutable `TaskActivity` is business timeline.
- Future constraints: exactly one effective primary assignment, non-overlapping history/handover, progress 0–100, date ordering, submission version, dependency/parent acyclicity, task code uniqueness.
- Future indexes: assignee, assigner, reviewer, project, lifecycle/review, due date, confidentiality, parent, activity timeline and handover.
- When a Company model exists, only reviewed system-wide uniques become tenant composite uniques after controlled backfill; this is not a multi-tenant claim.

No `schema.prisma` change or migration directory is created by this decision record.
