import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

require("dotenv").config();

const BACKUP_DIR = join(process.cwd(), "docs/qa/backups/phase07");
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

const PG_DUMP = `"C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe"`;

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is missing in environment");
  }

  // Parse connection info safely
  const urlObj = new URL(dbUrl);
  const host = urlObj.hostname;
  const port = urlObj.port || "5432";
  const dbName = urlObj.pathname.replace(/^\//, "");
  const schema = urlObj.searchParams.get("schema") || "public";
  const username = urlObj.username;
  const password = urlObj.password;

  console.log(`[Backup Info] Host: ${host}, Port: ${port}, DB: ${dbName}, Schema: ${schema}, User: ${username.substring(0, 2)}***`);

  const envVars = { ...process.env, PGPASSWORD: password };

  // 1. Full database dump
  const fullDumpPath = join(BACKUP_DIR, "database-full-before-forensic-20260803.sql");
  console.log("Generating full database dump...");
  execSync(`${PG_DUMP} -h ${host} -p ${port} -U ${username} -d ${dbName} --clean --if-exists -f "${fullDumpPath}"`, {
    env: envVars,
    stdio: "pipe",
  });
  console.log(`Full dump saved to ${fullDumpPath}`);

  // 2. Schema-only dump
  const schemaDumpPath = join(BACKUP_DIR, "database-schema-before-forensic-20260803.sql");
  console.log("Generating schema-only dump...");
  execSync(`${PG_DUMP} -h ${host} -p ${port} -U ${username} -d ${dbName} --schema-only --clean --if-exists -f "${schemaDumpPath}"`, {
    env: envVars,
    stdio: "pipe",
  });
  console.log(`Schema dump saved to ${schemaDumpPath}`);

  // 3. Data-only JSON exports using pg Client
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log("Exporting JSON data for key tables...");
  const prismaMigrations = await client.query(`SELECT * FROM "_prisma_migrations" ORDER BY started_at ASC;`);
  writeFileSync(join(BACKUP_DIR, "prisma-migrations-before-forensic.json"), JSON.stringify(prismaMigrations.rows, null, 2), "utf-8");

  const systemSetting = await client.query(`SELECT * FROM "SystemSetting";`);
  writeFileSync(join(BACKUP_DIR, "system-setting-before-forensic.json"), JSON.stringify(systemSetting.rows, null, 2), "utf-8");

  const users = await client.query(`SELECT * FROM "User";`);
  writeFileSync(join(BACKUP_DIR, "users-before-forensic.json"), JSON.stringify(users.rows, null, 2), "utf-8");

  const projects = await client.query(`SELECT * FROM "Project";`);
  writeFileSync(join(BACKUP_DIR, "projects-before-forensic.json"), JSON.stringify(projects.rows, null, 2), "utf-8");

  const projectMembers = await client.query(`SELECT * FROM "ProjectMember";`);
  writeFileSync(join(BACKUP_DIR, "project-members-before-forensic.json"), JSON.stringify(projectMembers.rows, null, 2), "utf-8");

  const auditLogs = await client.query(`SELECT * FROM "AuditLog";`);
  writeFileSync(join(BACKUP_DIR, "audit-logs-before-forensic.json"), JSON.stringify(auditLogs.rows, null, 2), "utf-8");

  const notifications = await client.query(`SELECT * FROM "Notification";`);
  writeFileSync(join(BACKUP_DIR, "notifications-before-forensic.json"), JSON.stringify(notifications.rows, null, 2), "utf-8");

  const approvalRequests = await client.query(`SELECT * FROM "ApprovalRequest";`);
  writeFileSync(join(BACKUP_DIR, "approval-requests-before-forensic.json"), JSON.stringify(approvalRequests.rows, null, 2), "utf-8");

  // 4. Manifest of database objects
  console.log("Generating database object manifest...");
  const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name;`, [schema]);
  const enums = await client.query(`SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = $1 AND t.typtype = 'e' ORDER BY typname;`, [schema]);
  const indexes = await client.query(`SELECT indexname, tablename FROM pg_indexes WHERE schemaname = $1 ORDER BY indexname;`, [schema]);
  const constraints = await client.query(`SELECT conname, conrelid::regclass::text as tablename FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = $1 ORDER BY conname;`, [schema]);
  const sequences = await client.query(`SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = $1 ORDER BY sequence_name;`, [schema]);
  const triggers = await client.query(`SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = $1 ORDER BY trigger_name;`, [schema]);
  const views = await client.query(`SELECT table_name FROM information_schema.views WHERE table_schema = $1 ORDER BY table_name;`, [schema]);

  const manifest = {
    timestamp: new Date().toISOString(),
    database: dbName,
    schema: schema,
    tables: tables.rows,
    enums: enums.rows,
    indexes: indexes.rows,
    constraints: constraints.rows,
    sequences: sequences.rows,
    triggers: triggers.rows,
    views: views.rows,
  };
  writeFileSync(join(BACKUP_DIR, "database-object-manifest-before-forensic.json"), JSON.stringify(manifest, null, 2), "utf-8");

  await client.end();
  console.log("[Backup Successful] All forensic backups created in docs/qa/backups/phase07/");
}

main().catch((err) => {
  console.error("[Backup Failed]", err);
  process.exit(1);
});
