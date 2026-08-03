import "dotenv/config";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { UserRole } from "@prisma/client";

function secret() {
  return `A!a9${randomBytes(48).toString("base64url")}`;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to derive the local E2E endpoint");
  const primary = new URL(process.env.DATABASE_URL);
  const e2e = new URL(process.env.DATABASE_URL);
  e2e.pathname = "/construction_erp_v2_settings_e2e_20260803";

  const lines = [
    `PRIMARY_DATABASE_URL=${primary.toString()}`,
    `DATABASE_URL=${e2e.toString()}`,
    `QA_DATABASE_URL=${e2e.toString()}`,
    `STORAGE_ROOT=${path.resolve(process.cwd(), "storage_e2e_release")}`,
    `AUTH_SECRET=${secret()}`,
    "SETTINGS_AUDIT_ENVIRONMENT=QA",
    "SETTINGS_AUDIT_SOURCE=USER_INTERFACE",
    ...Object.values(UserRole).map((role) => `SETTINGS_E2E_PASSWORD_${role}=${secret()}`),
  ];

  await writeFile(path.resolve(process.cwd(), ".env.e2e.local"), `${lines.join("\n")}\n`, { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify({ created: true, file: ".env.e2e.local", roleSecrets: Object.values(UserRole).length, valuesPrinted: false }));
}

main().catch((error) => {
  console.error("SETTINGS_E2E_SECRET_PROVISION_FAILED:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
