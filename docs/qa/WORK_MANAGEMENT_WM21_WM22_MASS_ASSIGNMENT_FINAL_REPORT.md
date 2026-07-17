# WM-21/WM-22 Mass-assignment final report

WM-21 provides exact structural mass-assignment protection for public Work Management mutation boundaries. WM-22 verifies unknown/server-owned field, prototype, accessor, symbol, immutability and regression behavior.

| Boundary | Exact allowed keys | Evidence |
|---|---|---|
| ResponsibilityAssignment ASSIGN/REPLACE | snapshot, id, responsibilityCode, responsibleUserId, actorId, at, reason? | `assignment commands reject unknown own fields and server-owned lifecycle fields` |
| ResponsibilityAssignment REVOKE | snapshot, assignmentId, actorId, at, reason? | exact-object guard |
| Delegation REQUEST | snapshot, id, delegateUserId, actorId, requestedAt, startsAt, expiresAt, reason? | decision reason test |
| Delegation ACCEPT/EXPIRE | snapshot, delegationId, actorId, at | `delegation accept and expire style commands reject reason injection` |
| Collaboration INVITE | snapshot, id, collaboratorUserId, actorId, at, reason? | ownership injection test |
| Collaboration ACCEPT | snapshot, collaborationId, actorId, at | reason injection test |

Exact object validation uses `Reflect.ownKeys`, own property descriptors, plain-object prototypes and rejects symbols, accessors, inherited keys, dangerous keys and unknown fields without invoking getters.

Focused mass-assignment: 8 pass. All Work Management: 1291 pass. Patch-scoped diff passes. Full-worktree diff reports only unrelated UI whitespace in Documents, Reports and Materials components, an external WM-28 warning.

Authorization, trusted snapshot loading and persistence remain **DEFERRED**. Structural unknown-field rejection is **IMPLEMENTED**. Schema is **NO-GO**.
