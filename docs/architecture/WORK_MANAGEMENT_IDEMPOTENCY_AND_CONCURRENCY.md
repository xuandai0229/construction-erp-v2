# Idempotency and concurrency contract

Every mutating command carries a client-observed `expectedVersion`; the client never supplies a next version. The future persistence adapter must use a conditional update (`id` + `version`) in a transaction and return `TASK_CONCURRENCY_CONFLICT` on zero rows affected.

The commands Assign, Submit, Approve, Complete and Execute Handover may carry a request-scoped `idempotencyKey`. The namespace is `work-management:<action>:<request-id>` and must be stored/unique only by the future server-side adapter; it is not a free-form global client key. Notifications use the same event identity to deduplicate delivery.

This document is a contract only. No idempotency persistence has been created while migration gates are blocked.
