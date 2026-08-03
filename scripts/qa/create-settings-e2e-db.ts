import "dotenv/config";
import { Client } from "pg";
import { validateE2eDatabaseCreation, maskDatabaseUrl } from "./qa-db-guard-utils";

export async function createSettingsE2eDb(
  adminUrlInput?: string,
  targetDbNameInput?: string,
  confirmCreateInput?: string | boolean
) {
  const adminUrl = adminUrlInput || process.env.E2E_DATABASE_ADMIN_URL;
  const targetDbName = targetDbNameInput || process.env.E2E_DATABASE_NAME;
  const confirmCreate = confirmCreateInput ?? process.env.CONFIRM_CREATE_E2E_DATABASE;

  const validation = validateE2eDatabaseCreation(adminUrl, targetDbName, confirmCreate);
  if (!validation.valid) {
    throw new Error(`[CREATE_E2E_DB_REJECTED] ${validation.reason}`);
  }

  const maskedAdminUrl = maskDatabaseUrl(adminUrl!);
  console.log(`[CREATE_E2E_DB] Connecting to admin instance safely: ${maskedAdminUrl}`);

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    const dbName = validation.dbName;
    const existing = await client.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [dbName]
    );

    if (existing.rows[0]?.exists) {
      console.log(JSON.stringify({ database: dbName, created: false, message: "Database already exists" }));
      return { database: dbName, created: false };
    }

    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(JSON.stringify({ database: dbName, created: true, message: "Database created successfully" }));
    return { database: dbName, created: true };
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1]?.endsWith("create-settings-e2e-db.ts")) {
  createSettingsE2eDb().catch((err) => {
    console.error("CREATE_SETTINGS_E2E_DB_FAILED:", err.message);
    process.exitCode = 1;
  });
}
