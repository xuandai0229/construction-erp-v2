import { join, resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Client } from "pg";

const PG_BIN = process.env.PG_BIN || "C:\\Program Files\\PostgreSQL\\16\\bin";

export function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

export function fail(msg: string): never {
  throw new Error(msg);
}

export function parseDbUrl(url: string) {
  const u = new URL(url);
  return { host: u.hostname, port: u.port || "5432", user: u.username, password: u.password, database: u.pathname.slice(1) };
}

export function loadCutoverEnv(): { sourceUrl: string; rehearsalBaseUrl: string } {
  const envPath = resolve(process.cwd(), ".env.cutover.local");
  if (!existsSync(envPath)) fail(".env.cutover.local not found");
  const content = readFileSync(envPath, "utf-8");
  const vars: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      const k = line.substring(0, eqIdx).trim();
      let v = line.substring(eqIdx + 1).trim();
      if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.substring(1, v.length - 1);
      }
      vars[k] = v;
    }
  }
  const sourceUrl = vars["CUTOVER_SOURCE_DATABASE_URL"];
  const rehearsalBaseUrl = vars["CUTOVER_REHEARSAL_DATABASE_URL"];
  if (!sourceUrl) fail("CUTOVER_SOURCE_DATABASE_URL missing");
  if (!rehearsalBaseUrl) fail("CUTOVER_REHEARSAL_DATABASE_URL missing");
  return { sourceUrl, rehearsalBaseUrl };
}

export async function databaseExists(dbConfig: ReturnType<typeof parseDbUrl>, dbName: string): Promise<boolean> {
  const client = new Client({
    host: dbConfig.host, port: parseInt(dbConfig.port || "5432", 10),
    user: dbConfig.user, password: dbConfig.password, database: "postgres",
  });
  try {
    await client.connect();
    const r = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    return r.rowCount! > 0;
  } finally {
    await client.end();
  }
}

export async function createDatabase(dbConfig: ReturnType<typeof parseDbUrl>, dbName: string): Promise<void> {
  const client = new Client({
    host: dbConfig.host, port: parseInt(dbConfig.port || "5432", 10),
    user: dbConfig.user, password: dbConfig.password, database: "postgres",
  });
  try {
    await client.connect();
    await client.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await client.end();
  }
}

export async function exportSnapshot(dbConfig: ReturnType<typeof parseDbUrl>): Promise<{ client: Client; snapshotId: string }> {
  const client = new Client({
    host: dbConfig.host,
    port: parseInt(dbConfig.port || "5432", 10),
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
  });
  await client.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const r = await client.query("SELECT pg_export_snapshot() AS id");
  return { client, snapshotId: r.rows[0].id };
}

export async function getSourceManifest(client: Client): Promise<{ table: string; count: number }[]> {
  const tables = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  const manifest: { table: string; count: number }[] = [];
  for (const row of tables.rows) {
    const r = await client.query(`SELECT count(*)::int AS c FROM "${row.tablename}"`);
    manifest.push({ table: row.tablename, count: r.rows[0].c });
  }
  return manifest;
}

export function pgDump(dbConfig: ReturnType<typeof parseDbUrl>, outputPath: string, extraArgs: string[] = []): { exitCode: number; version: string; stderr: string } {
  const pgDumpPath = join(PG_BIN, "pg_dump.exe");
  const version = execSync(`"${pgDumpPath}" --version`, { encoding: "utf-8" }).trim();
  const args = ["--format=custom", "--no-owner", "--no-privileges", `--file=${outputPath}`, ...extraArgs];
  const env = { ...process.env, PGHOST: dbConfig.host, PGPORT: dbConfig.port, PGUSER: dbConfig.user, PGPASSWORD: dbConfig.password, PGDATABASE: dbConfig.database };
  const result = spawnSync(pgDumpPath, args, { encoding: "utf-8", timeout: 300_000, env });
  return { exitCode: result.status ?? 1, version, stderr: result.stderr || "" };
}

export function pgDumpDataOnly(dbConfig: ReturnType<typeof parseDbUrl>, outputPath: string, excludeTables: string[], extraArgs: string[] = []): number {
  const pgDumpPath = join(PG_BIN, "pg_dump.exe");
  const args = ["--data-only", "--column-inserts", "--disable-triggers", "--no-owner", "--no-privileges", `--file=${outputPath}`, ...excludeTables.flatMap(t => ["--exclude-table", `"${t}"`]), ...extraArgs];
  const env = { ...process.env, PGHOST: dbConfig.host, PGPORT: dbConfig.port, PGUSER: dbConfig.user, PGPASSWORD: dbConfig.password, PGDATABASE: dbConfig.database };
  const result = spawnSync(pgDumpPath, args, { encoding: "utf-8", timeout: 600_000, env });
  return result.status ?? 1;
}

export function pgRestoreList(dumpPath: string): boolean {
  const pgRestorePath = join(PG_BIN, "pg_restore.exe");
  const result = spawnSync(pgRestorePath, ["--list", dumpPath], { encoding: "utf-8", timeout: 60_000 });
  return result.status === 0 && result.stdout.length > 0;
}

export function prismaMigrateDeploy(dbConfig: ReturnType<typeof parseDbUrl>, rawUrl: string): { exitCode: number } {
  const env = { ...process.env, DATABASE_URL: rawUrl };
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], { encoding: "utf-8", timeout: 120_000, env, cwd: process.cwd(), shell: true });
  return { exitCode: result.status ?? 1 };
}

export function prismaMigrateStatus(dbConfig: ReturnType<typeof parseDbUrl>, rawUrl: string): { exitCode: number } {
  const env = { ...process.env, DATABASE_URL: rawUrl };
  const result = spawnSync("npx", ["prisma", "migrate", "status"], { encoding: "utf-8", timeout: 60_000, env, cwd: process.cwd(), shell: true });
  return { exitCode: result.status ?? 1 };
}

export function prismaMigrateDiff(rawUrl: string): { exitCode: number } {
  const env = { ...process.env, DATABASE_URL: rawUrl };
  const result = spawnSync("npx", ["prisma", "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"], { encoding: "utf-8", timeout: 60_000, env, cwd: process.cwd(), shell: true });
  return { exitCode: result.status ?? 1 }; // 0: no diff
}

export function psqlExec(dbConfig: ReturnType<typeof parseDbUrl>, sqlFile: string): { exitCode: number; stderr: string } {
  const psqlPath = join(PG_BIN, "psql.exe");
  const env = { ...process.env, PGHOST: dbConfig.host, PGPORT: dbConfig.port, PGUSER: dbConfig.user, PGPASSWORD: dbConfig.password, PGDATABASE: dbConfig.database };
  const result = spawnSync(psqlPath, ["--file", sqlFile, "--set", "ON_ERROR_STOP=1"], { encoding: "utf-8", timeout: 600_000, env });
  return { exitCode: result.status ?? 1, stderr: result.stderr || "" };
}

export async function validateForeignKeys(client: Client): Promise<{ total: number; checked: number; orphans: number; queryFailures: number }> {
  const fks = await client.query(`
    SELECT con.conname AS fk_name, src_cl.relname AS src_table, array_agg(src_att.attname::text ORDER BY u.attposition) AS src_cols, tgt_cl.relname AS tgt_table, array_agg(tgt_att.attname::text ORDER BY u.attposition) AS tgt_cols
    FROM pg_constraint con JOIN pg_class src_cl ON con.conrelid = src_cl.oid JOIN pg_namespace ns ON src_cl.relnamespace = ns.oid JOIN pg_class tgt_cl ON con.confrelid = tgt_cl.oid CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS u(src_attnum, tgt_attnum, attposition) JOIN pg_attribute src_att ON src_att.attrelid = con.conrelid AND src_att.attnum = u.src_attnum JOIN pg_attribute tgt_att ON tgt_att.attrelid = con.confrelid AND tgt_att.attnum = u.tgt_attnum
    WHERE con.contype = 'f' AND ns.nspname = 'public' GROUP BY con.conname, src_cl.relname, tgt_cl.relname
  `);
  let totalOrphans = 0;
  let queryFailures = 0;
  for (const fk of fks.rows) {
    const joinCond = fk.src_cols.map((c: string, i: number) => `s."${c}" = t."${fk.tgt_cols[i]}"`).join(" AND ");
    const nullCheck = fk.src_cols.map((c: string) => `s."${c}" IS NOT NULL`).join(" AND ");
    const q = `SELECT count(*)::int AS cnt FROM "${fk.src_table}" s LEFT JOIN "${fk.tgt_table}" t ON ${joinCond} WHERE (${nullCheck}) AND t."${fk.tgt_cols[0]}" IS NULL`;
    try {
      const r = await client.query(q);
      totalOrphans += r.rows[0].cnt;
    } catch { queryFailures++; }
  }
  return { total: fks.rowCount!, checked: fks.rowCount! - queryFailures, orphans: totalOrphans, queryFailures };
}

export async function validateConstraints(client: Client): Promise<{ pkDuplicates: number; uniqueFailures: number; uniqueChecked: number; notNullViolations: number }> {
  let pkDuplicates = 0;
  const pks = await client.query(`
    SELECT i.relname AS index_name, t.relname AS table_name, string_agg('"' || a.attname || '"', ',' ORDER BY c.key) AS cols FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid JOIN pg_class t ON t.oid = x.indrelid JOIN pg_namespace n ON n.oid = t.relnamespace CROSS JOIN LATERAL unnest(x.indkey) WITH ORDINALITY AS c(col, key) JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.col WHERE x.indisprimary = true AND n.nspname = 'public' GROUP BY i.relname, t.relname
  `);
  for (const pk of pks.rows) {
    try {
      const r = await client.query(`SELECT count(*)::int AS cnt FROM (SELECT ${pk.cols} FROM "${pk.table_name}" GROUP BY ${pk.cols} HAVING count(*) > 1) sub`);
      pkDuplicates += r.rows[0].cnt;
    } catch {}
  }

  let uniqueFailures = 0;
  let uniqueChecked = 0;
  const uqs = await client.query(`
    SELECT i.relname AS index_name, t.relname AS table_name, string_agg('"' || a.attname || '"', ',' ORDER BY c.key) AS cols, string_agg('"' || a.attname || '" IS NOT NULL', ' AND ' ORDER BY c.key) AS not_nulls, x.indisunique, x.indpred, x.indexprs FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid JOIN pg_class t ON t.oid = x.indrelid JOIN pg_namespace n ON n.oid = t.relnamespace CROSS JOIN LATERAL unnest(x.indkey) WITH ORDINALITY AS c(col, key) JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.col WHERE x.indisunique = true AND x.indisprimary = false AND n.nspname = 'public' GROUP BY i.relname, t.relname, x.indisunique, x.indpred, x.indexprs
  `);
  for (const uq of uqs.rows) {
    if (uq.indpred || uq.indexprs) continue; // Skip partial/expression indexes for this count
    try {
      const r = await client.query(`SELECT count(*)::int AS cnt FROM (SELECT ${uq.cols} FROM "${uq.table_name}" WHERE ${uq.not_nulls} GROUP BY ${uq.cols} HAVING count(*) > 1) sub`);
      uniqueFailures += r.rows[0].cnt;
      uniqueChecked++;
    } catch { uniqueFailures++; }
  }

  let notNullViolations = 0;
  const nnCols = await client.query(`SELECT c.table_name, c.column_name FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.is_nullable = 'NO' AND c.table_name NOT LIKE '_prisma%'`);
  for (const col of nnCols.rows) {
    try {
      const r = await client.query(`SELECT count(*)::int AS cnt FROM "${col.table_name}" WHERE "${col.column_name}" IS NULL`);
      notNullViolations += r.rows[0].cnt;
    } catch {}
  }
  return { pkDuplicates, uniqueFailures, uniqueChecked, notNullViolations };
}

export async function validateEnums(srcClient: Client, tgtClient: Client): Promise<{ types: number; labels: number; mismatches: number }> {
  const getEnums = async (c: Client) => {
    const r = await c.query(`SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' ORDER BY t.typname, e.enumsortorder`);
    const map = new Map<string, string[]>();
    for (const row of r.rows) {
      if (!map.has(row.typname)) map.set(row.typname, []);
      map.get(row.typname)!.push(row.enumlabel);
    }
    return map;
  };
  const src = await getEnums(srcClient);
  const tgt = await getEnums(tgtClient);
  let mismatches = 0;
  let labels = 0;
  for (const [typ, srcLabels] of src.entries()) {
    const tgtLabels = tgt.get(typ);
    if (!tgtLabels || srcLabels.join(",") !== tgtLabels.join(",")) mismatches++;
    else labels += tgtLabels.length;
  }
  return { types: tgt.size, labels, mismatches };
}

export async function validateSequences(client: Client): Promise<{ count: number; status: string }> {
  const r = await client.query(`SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`);
  if (r.rowCount === 0) return { count: 0, status: "NOT APPLICABLE" };
  for (const seq of r.rows) {
    await client.query(`SELECT last_value FROM "${seq.sequence_name}"`);
  }
  // Sequence validation needs owning table verification to be "PROVEN" instead of "PASS"
  // But without deep parsing of dependencies, it is UNPROVEN if there are sequences and we don't fully check nextval safety against max id.
  return { count: r.rowCount!, status: "UNPROVEN" };
}

export async function getTableContentHash(client: Client, tableName: string): Promise<string> {
  const pks = await client.query(`
    SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = '"${tableName}"'::regclass AND i.indisprimary ORDER BY a.attname
  `);
  let orderClause = "";
  if (pks.rowCount! > 0) orderClause = "ORDER BY " + pks.rows.map(r => `"${r.attname}"`).join(", ");
  
  const cols = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY column_name
  `, [tableName]);
  
  if (cols.rowCount === 0) return "";
  const selectCols = cols.rows.map(c => `"${c.column_name}"::text`).join(", ");
  const r = await client.query(`SELECT row_to_json(t)::text AS js FROM (SELECT ${selectCols} FROM "${tableName}" ${orderClause}) t`);
  const hash = createHash("sha256");
  for (const row of r.rows) {
    hash.update(row.js);
  }
  return hash.digest("hex");
}

export function transformApprovalRequest(sourceRow: any): any {
  throw new Error("APPROVALREQUEST_MAPPING_UNPROVEN: No safe mapping for entityType/entityId exists for legacy records without a business decision.");
}
