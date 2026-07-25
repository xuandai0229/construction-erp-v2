import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient } from "./create-safe-qa-prisma-client";

const usernames = [
  "QA_ADMIN_A",
  "QA_SUPERVISOR_A",
  "QA_REVIEWER_A",
  "QA_USER_PROJECT_A",
  "QA_USER_PROJECT_B",
] as const;

async function main() {
  assertSafeQaDatabase();
  const qaDatabaseUrl = process.env.QA_DATABASE_URL;
  if (!qaDatabaseUrl) throw new Error("QA_DATABASE_URL is required");

  const password = randomBytes(32).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);
  const { prisma, close } = createSafeQaPrismaClient(qaDatabaseUrl);
  try {
    const result = await prisma.user.updateMany({
      where: { username: { in: [...usernames] }, name: { startsWith: "QA-SUPERVISION-E2E-" } },
      data: { password: passwordHash },
    });
    if (result.count !== usernames.length) {
      throw new Error(`Expected to rotate ${usernames.length} QA users, rotated ${result.count}`);
    }
  } finally {
    await close();
  }

  const envPath = path.join(process.cwd(), ".env");
  const original = fs.readFileSync(envPath, "utf8");
  if (!/^QA_SUPERVISION_E2E_PASSWORD=.*$/m.test(original)) {
    throw new Error("QA_SUPERVISION_E2E_PASSWORD is missing from .env");
  }
  const next = original.replace(
    /^QA_SUPERVISION_E2E_PASSWORD=.*$/m,
    `QA_SUPERVISION_E2E_PASSWORD="${password}"`,
  );
  const temporaryPath = `${envPath}.qa-credential.tmp`;
  fs.writeFileSync(temporaryPath, next, { encoding: "utf8", flag: "wx" });
  fs.renameSync(temporaryPath, envPath);

  console.log(JSON.stringify({ rotated: true, users: usernames.length }));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown credential rotation failure");
  process.exitCode = 1;
});
