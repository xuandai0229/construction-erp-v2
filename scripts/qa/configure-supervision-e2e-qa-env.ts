import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { parse } from "dotenv";
import { SUPERVISION_E2E_QA_DATABASE } from "./create-isolated-qa-database";
import { evaluateQaDatabaseSafety } from "./assert-safe-qa-database";

const envPath = path.join(process.cwd(), ".env");
const original = fs.readFileSync(envPath, "utf8");
const values = parse(original);
const rawDatabaseUrl = values.DATABASE_URL;

if (!rawDatabaseUrl) throw new Error("DATABASE_URL is missing from .env");

const qaUrl = new URL(rawDatabaseUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(qaUrl.hostname.toLowerCase())) {
  throw new Error("Refusing to configure an automatically-created QA database on a remote host");
}
qaUrl.pathname = `/${SUPERVISION_E2E_QA_DATABASE}`;

const safety = evaluateQaDatabaseSafety({
  DATABASE_URL: rawDatabaseUrl,
  QA_DATABASE_URL: qaUrl.toString(),
});
if (!safety.safe) throw new Error(safety.reason);

const qaLine = `QA_DATABASE_URL="${qaUrl.toString()}"`;
let next = /^QA_DATABASE_URL=.*$/m.test(original)
  ? original.replace(/^QA_DATABASE_URL=.*$/m, qaLine)
  : original.replace(/^DATABASE_URL=.*$/m, (databaseLine) => `${databaseLine}\n${qaLine}`);

if (!/^QA_SUPERVISION_E2E_PASSWORD=.*$/m.test(next)) {
  const password = randomBytes(24).toString("base64url");
  next = `${next.trimEnd()}\nQA_SUPERVISION_E2E_PASSWORD="${password}"\n`;
}

if (next !== original) {
  const temporaryPath = `${envPath}.qa-e2e.tmp`;
  fs.writeFileSync(temporaryPath, next, { encoding: "utf8", flag: "wx" });
  fs.renameSync(temporaryPath, envPath);
}

console.log(JSON.stringify({
  configured: true,
  qaCredentialConfigured: true,
  productionDatabase: safety.productionDatabase,
  qaDatabase: safety.qaDatabase,
}, null, 2));
