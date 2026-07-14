# Transactional outbox contract

Future persistence atomically records task mutation, history/activity/audit and an outbox intent. A worker dispatches by event ID with retry/backoff and notification deduplication. Domain code never sends notifications directly. Confidential outbox payloads use restricted preview text only, never title/body unless policy later permits it.
