# Assignment source of truth

## Decision

The future persistent source of truth is `TaskParticipant` plus effective-dated `TaskAssigneeHistory`, not `ProjectMember`, RBAC role or a mutable `Task.primaryAssigneeId` alone.

- An active `TaskParticipant(role=PRIMARY_ASSIGNEE)` identifies the only current primary assignee.
- `TaskAssigneeHistory` records the closed prior assignment and the new effective assignment in the same transaction.
- Reviewer and approver are active participants with their respective roles; their denormalized IDs, if added for queries, are projections that must be transactionally consistent with participant rows.
- `ProjectMember` only gates access to project-scoped tasks. It must never be written as an assignee.
- A collaborator is never promoted to primary by read logic. A handover changes history only at its effective time.

The current pure `TaskSnapshot.primaryAssigneeId` is an input projection used to evaluate policy. It is not a second persistence authority.
