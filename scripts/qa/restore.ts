import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseDbUrl, PG_BIN, loadCutoverEnv } from "./cutover-rehearsal-lib";

const { sourceUrl } = loadCutoverEnv();
const dbConfig = parseDbUrl(sourceUrl);
const dumpPath = "D:\\construction-erp-v2\\.local-audit-quarantine\\cutover_backup_1784260867773.dump";

const pgRestorePath = "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe";
const args = ["--clean", "--if-exists", "-d", dbConfig.database, dumpPath];
const env = { ...process.env, PGHOST: dbConfig.host, PGPORT: dbConfig.port, PGUSER: dbConfig.user, PGPASSWORD: dbConfig.password };

console.log("Restoring...");
const result = spawnSync(pgRestorePath, args, { stdio: "inherit", env });
console.log("Exit code:", result.status);
