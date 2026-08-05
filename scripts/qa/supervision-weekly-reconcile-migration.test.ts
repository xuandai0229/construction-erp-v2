import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";

const migrationPath = join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260723120000_supervision_weekly_verification_fields_reconcile",
  "migration.sql",
);

const sql = readFileSync(migrationPath, "utf8");
const normalized = sql.replace(/\s+/g, " ").trim();

test("reconcile migration is additive and limited to the four nullable text columns", () => {
  assert.doesNotMatch(
    normalized,
    /\b(DROP|RENAME|DELETE|UPDATE|TRUNCATE|DEFAULT|NOT\s+NULL)\b/i,
  );

  assert.deepEqual(
    [...normalized.matchAll(/ALTER TABLE "([^"]+)"/g)].map((match) => match[1]),
    ["SupervisionWeeklyTransition", "SupervisionWeeklyQuantity"],
  );

  assert.deepEqual(
    [...normalized.matchAll(/ADD COLUMN IF NOT EXISTS "([^"]+)" TEXT/g)].map(
      (match) => match[1],
    ),
    [
      "verificationMode",
      "varianceReason",
      "verificationMode",
      "varianceReason",
    ],
  );

  assert.equal((normalized.match(/ADD COLUMN IF NOT EXISTS/g) ?? []).length, 4);
  assert.equal((normalized.match(/ALTER TABLE/g) ?? []).length, 2);
  assert.equal((normalized.match(/;/g) ?? []).length, 2);
});
