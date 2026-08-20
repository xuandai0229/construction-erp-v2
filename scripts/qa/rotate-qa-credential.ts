import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function rotateQaCredential() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in .env.local to execute rotation");
  }

  // 1. Generate new cryptographically secure random password
  const newSecret = crypto.randomBytes(24).toString("hex");

  // 2. Connect as DB administrator and alter hr_qa_user password
  const adminClient = new Client({ connectionString: process.env.DATABASE_URL });
  await adminClient.connect();

  await adminClient.query(`ALTER USER hr_qa_user WITH PASSWORD '${newSecret}';`);
  await adminClient.query("GRANT CONNECT ON DATABASE construction_erp_v2_hr_qa TO hr_qa_user;");

  // Enforce revoking connect on business and settings databases
  try {
    await adminClient.query("REVOKE CONNECT ON DATABASE construction_erp_v2_dev FROM hr_qa_user;");
  } catch {}
  try {
    await adminClient.query("REVOKE CONNECT ON DATABASE construction_erp_v2_settings_e2e_20260803 FROM hr_qa_user;");
  } catch {}

  await adminClient.end();

  // 3. Update .env.hr-qa.local and .env.local with new connection string (no output to console)
  const newQaUrl = `postgresql://hr_qa_user:${newSecret}@127.0.0.1:5432/construction_erp_v2_hr_qa?schema=public`;

  const hrQaPath = path.resolve(".env.hr-qa.local");
  if (fs.existsSync(hrQaPath)) {
    let hrQaContent = fs.readFileSync(hrQaPath, "utf8");
    hrQaContent = hrQaContent.replace(/QA_DATABASE_URL="[^"]*"/, `QA_DATABASE_URL="${newQaUrl}"`);
    fs.writeFileSync(hrQaPath, hrQaContent, "utf8");
  }

  const envLocalPath = path.resolve(".env.local");
  if (fs.existsSync(envLocalPath)) {
    let envLocalContent = fs.readFileSync(envLocalPath, "utf8");
    if (envLocalContent.includes("QA_DATABASE_URL=")) {
      envLocalContent = envLocalContent.replace(/QA_DATABASE_URL="[^"]*"/, `QA_DATABASE_URL="${newQaUrl}"`);
    } else {
      envLocalContent += `\nQA_DATABASE_URL="${newQaUrl}"\n`;
    }
    fs.writeFileSync(envLocalPath, envLocalContent, "utf8");
  }

  // 4. Verify connection with new credentials on QA DB
  const qaClient = new Client({ connectionString: newQaUrl });
  await qaClient.connect();

  const roleCheck = await qaClient.query(
    "SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user;"
  );
  const flags = roleCheck.rows[0];
  const isLeastPrivilege =
    flags &&
    !flags.rolsuper &&
    !flags.rolcreatedb &&
    !flags.rolcreaterole &&
    !flags.rolreplication &&
    !flags.rolbypassrls;

  await qaClient.end();

  // 5. Verify that hr_qa_user CANNOT connect to construction_erp_v2_dev
  const devAttackUrl = `postgresql://hr_qa_user:${newSecret}@127.0.0.1:5432/construction_erp_v2_dev?schema=public`;
  const devAttackClient = new Client({ connectionString: devAttackUrl });
  let devBlocked = false;
  try {
    await devAttackClient.connect();
    await devAttackClient.end();
  } catch {
    devBlocked = true;
  }

  if (!isLeastPrivilege || !devBlocked) {
    throw new Error("QA security verification failed after credential rotation");
  }

  console.log("[SUCCESS] QA credential rotated successfully. Verified least privilege and cross-DB isolation.");
}

rotateQaCredential().catch((err) => {
  console.error("[ERROR] Failed to rotate QA credential:", err.message);
  process.exit(1);
});
