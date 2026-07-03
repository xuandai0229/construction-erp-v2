call npx tsx scripts/qa-field-progress-write-path-test.ts
call npx tsx scripts/qa-field-progress-rollup-test.ts
call npx tsx scripts/qa-work-date-logic-test.ts
call npx tsx scripts/qa-field-progress-volume-guard-test.ts
call npx tsx -r dotenv/config scripts/qa-field-progress-uat-integration.ts
call npx tsc --noEmit
call npm run build
