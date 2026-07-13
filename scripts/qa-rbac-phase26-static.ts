import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const harness = readFileSync("scripts/qa-rbac-phase2-cross-project-qa.ts", "utf8");
const qaClient = readFileSync("scripts/qa/create-safe-qa-prisma-client.ts", "utf8");
const guard = readFileSync("scripts/qa/assert-safe-qa-database.ts", "utf8");
const search = readFileSync("src/app/actions/global-search.ts", "utf8");
assert.ok(!/from\s+["'][^"']*src\/lib\/prisma/.test(harness), "QA harness must not import app Prisma singleton");
assert.ok(!/process\.env\.DATABASE_URL/.test(harness), "QA harness must not use DATABASE_URL");
assert.ok(/createSafeQaPrismaClient\(process\.env\.QA_DATABASE_URL\)/.test(harness), "QA harness must explicitly pin Prisma to QA_DATABASE_URL");
assert.ok(/new PrismaClient\(\{ adapter: new PrismaPg\(pool\) \}\)/.test(qaClient), "QA Prisma must use an explicit QA adapter");
assert.ok(!/src\/lib\/prisma/.test(qaClient), "QA client helper must not import app singleton");
assert.ok(/current_database\(\)/.test(guard) && /inet_server_addr/.test(guard), "guard must fingerprint live databases");
assert.ok(/ALLOW_QA_RBAC_MUTATIONS/.test(guard) && /QA_RBAC_SENTINEL/.test(guard), "guard must require two operator confirmations");
assert.ok(/projectId: \{ in: accessibleProjectIds \}/.test(search), "search must constrain records before querying");
assert.ok(/accessibleProjectIds === null \? \{\} : \{ projectId: \{ in: accessibleProjectIds \} \}/.test(search), "search with no selected project must use accessible IDs or no global records");
console.log("PASS: QA harness uses an explicit QA Prisma client and guard fingerprints.");
