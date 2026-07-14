# Migration recovery options

## Option 1 — Recover original source artifact

Obtain the exact three `migration.sql` files from the author machine, original repository, CI artifact, deployment package or unpushed commit. Verify byte-for-byte SHA-256 against the successful ledger values before restoring. This is the only option that preserves the existing ledger without a new environment.

## Option 2 — New-environment baseline

Do not run this option now. It needs explicit approval, a new QA/clone database, backup, full census of tables/columns/enums/indexes/FKs/uniques/checks/views/functions/triggers/extensions, reviewed baseline SQL, replay test, cutover and rollback plan. Existing Development/QA/Production ledger must not be edited.

## Risks and required human input

Source recovery depends on an external owner providing original bytes. A baseline changes operational history and requires a human owner to approve scope, source census and cutover. The agent has not selected either option.
