# Work Management action matrix

All actions enter `evaluateTaskTransition`; no handler accepts a client-supplied next status. Each decision yields required permission, state change, domain event and activity/audit/notification intent. All mutations require actor context, relationship scope, expectedVersion and transaction.

| Group | Actions | Key lifecycle rule |
|---|---|---|
| Creation/assignment | CREATE_DRAFT, ASSIGN, ACCEPT, REQUEST_CLARIFICATION, START | Draft → Assigned; acceptance precedes Start where required |
| Execution | UPDATE_PROGRESS, REQUEST_EXTENSION, PAUSE, RESUME, BLOCK, UNBLOCK | Only In Progress; execution is an independent axis |
| Review/completion | SUBMIT, REQUEST_CHANGES, APPROVE_RESULT, CONFIRM_COMPLETION, REOPEN | Submitted/review gates completion; reopen returns to In Progress |
| Closure | CANCEL, ARCHIVE, RESTORE | Archive only completed/cancelled; archived rejects ordinary actions |
| Handover | REQUEST/ACCEPT/REJECT/APPROVE/EXECUTE_HANDOVER | Handover axis changes without changing lifecycle until effective service work |

Idempotency is mandatory for Assign, Submit, Approve Result, Confirm Completion and Execute Handover; optimistic concurrency is mandatory for every mutation.
