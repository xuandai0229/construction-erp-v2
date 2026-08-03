import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { UserRole } from "@prisma/client";
import { validateDatabaseSafety } from "./assert-safe-database-audit";

dotenv.config({ path: ".env.e2e.local", override: true });

async function main() {
  const qaUrl = process.env.QA_DATABASE_URL;
  const primaryUrl = process.env.PRIMARY_DATABASE_URL;
  validateDatabaseSafety(qaUrl, primaryUrl);
  if (!qaUrl) throw new Error("QA_DATABASE_URL is required");

  const pool = new Pool({ connectionString: qaUrl });
  let updated = 0;
  try {
    for (const role of Object.values(UserRole)) {
      const password = process.env[`SETTINGS_E2E_PASSWORD_${role}`];
      if (!password || password.length < 20) throw new Error(`Missing strong environment secret for ${role}`);
      const hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE role = $2::"UserRole" AND email ILIKE 'settings_e2e_%'`,
        [hash, role],
      );
      updated += result.rowCount ?? 0;
    }
  } finally {
    await pool.end();
  }
  console.log(JSON.stringify({ rotatedAccounts: updated, roleSecretsShared: false, valuesPrinted: false }));
}

main().catch((error) => {
  console.error("SETTINGS_E2E_CREDENTIAL_ROTATION_FAILED:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
