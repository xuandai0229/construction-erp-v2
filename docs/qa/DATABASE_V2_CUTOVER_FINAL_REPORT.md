ApprovalRequest:
decision: BUSINESS_APPROVED_EXCLUSION_AND_ARCHIVE
source rows: 2
approved exclusions: 2
unapproved rows: 0
archive exists: PASS
archive checksum: PASS
archive Git tracked: NO
row-hash guard: PASS
target rows: 0
reconciliation: PASS

Work Management source guard:
WorkTask: 0
WorkTaskAction: 0
WorkTaskOutboxMessage: 0
WorkTaskIdempotency: 0

Content parity:
copied tables: 27
checked: 27
pass: 27
fail: 0

Authenticated smoke:
authenticated: YES
routes: 7
pass: 7
fail: 0

Work Management E2E:
status: PASS
actions: 10
exact action order: PASS
outbox: 43
final state: COMPLETED
project isolation: PASS
outsider denial: PASS
fixture cleanup: PASS
remaining fixtures: 0
server cleanup: PASS
port released: PASS

Production server:
root PID exited: PASS
descendants exited: PASS
port released: PASS

Integrity:
FK: PASS
PK: PASS
unique indexes: PASS
not-null: PASS
enums: FAIL
sequences: NOT_APPLICABLE

Regression:
tests: 1291
pass: 1291
fail: 0
skipped: 0

Build/type/lint/diff:
Prisma validate: PASS
Prisma generate: PASS
TSC scoped: PASS
TSC global: PASS
Build: PASS
Lint: PASS
Diff: NOT_EXECUTED

Credential rotation required:
YES

Source environment represented:
construction_erp_v2_qa

Database V2 Cutover Rehearsal:
FAILED

Actual cutover readiness:
BLOCKED

Actual cutover:
NOT EXECUTED
