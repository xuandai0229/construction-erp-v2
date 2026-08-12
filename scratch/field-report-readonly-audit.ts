import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const connectionString = process.env.AUDIT_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("AUDIT_DATABASE_URL or DATABASE_URL is required");

const pool = new Pool({ connectionString });

async function main() {
  const database = await pool.query<{ db: string; host: string; port: number }>(
    "select current_database() as db, inet_server_addr()::text as host, inet_server_port() as port",
  );
  const projects = await pool.query(
    'select "id", "code", "name", "status", "deletedAt" from "Project" order by "code"',
  );
  const reportCounts = await pool.query(
    'select "projectId", "type", "status", count(*)::int as count from "SiteReport" group by "projectId", "type", "status" order by "projectId", "type", "status"',
  );
  const reportIntegrity = await pool.query(
    'select r."id", r."reportNo", r."projectId", p."code" as "projectCode", r."type", r."status", r."reportDate", r."weekStartDate", r."weekEndDate", r."createdById", r."createdAt", r."updatedAt", r."deletedAt", (select count(*)::int from "SiteReportAttachment" a where a."reportId" = r."id") as "attachmentCount", (select count(*)::int from "SiteReportLine" l where l."siteReportId" = r."id" and l."deletedAt" is null) as "lineCount" from "SiteReport" r join "Project" p on p."id" = r."projectId" order by r."createdAt" desc',
  );
  const supervisionCounts = await pool.query(
    'select "status", count(*)::int as count from "SupervisionWeeklyDossier" group by "status" order by "status"',
  );
  const attachmentIntegrity = await pool.query(
    'select a."id", a."reportId", a."kind", a."fileName", a."storagePath", a."mimeType", a."sizeBytes", r."projectId", r."status" from "SiteReportAttachment" a join "SiteReport" r on r."id" = a."reportId" order by a."createdAt" desc',
  );
  console.log(JSON.stringify({ database: database.rows[0], projects: projects.rows, reportCounts: reportCounts.rows, reportIntegrity: reportIntegrity.rows, supervisionCounts: supervisionCounts.rows, attachmentIntegrity: attachmentIntegrity.rows }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}).finally(() => pool.end());
