$ErrorActionPreference = "Stop"

npx prisma validate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx eslint src/app/actions/ src/components/materials/ src/components/material-request/ src/lib/
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx tsx --env-file=.env scripts/qa-material-request-update-permission-policy.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx tsx --env-file=.env scripts/qa-material-request-approved-auto-import.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx tsx --env-file=.env scripts/qa-material-request-cross-tab-linkage.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx tsx --env-file=.env scripts/qa-material-transactions-proposal-source-audit.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx tsx --env-file=.env scripts/qa-material-stock-ledger-reconciliation.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
