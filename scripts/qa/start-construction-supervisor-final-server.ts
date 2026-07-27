import { spawn } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";

const values = config({ path: ".env" }).parsed ?? {};
const qaDatabaseUrl = values.QA_DATABASE_URL;
if (!qaDatabaseUrl) throw new Error("QA_DATABASE_URL is required");
const safety = assertSafeQaDatabase({ ...process.env, ...values });

const artifactDirectory = join(process.cwd(), "artifacts", "construction-supervisor-final", "server");
mkdirSync(artifactDirectory, { recursive: true });
const stdout = openSync(join(artifactDirectory, "qa-server.stdout.log"), "w");
const stderr = openSync(join(artifactDirectory, "qa-server.stderr.log"), "w");
const nextCli = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const foreground = process.argv.includes("--foreground");

const child = spawn(process.execPath, [nextCli, "dev", "-p", "3100"], {
  cwd: process.cwd(),
  detached: !foreground,
  windowsHide: true,
  stdio: foreground ? "inherit" : ["ignore", stdout, stderr],
  env: {
    ...process.env,
    ...values,
    DATABASE_URL: qaDatabaseUrl,
    QA_DATABASE_URL: qaDatabaseUrl,
    SUPERVISION_PDF_RENDER_ORIGIN: "http://127.0.0.1:3100",
    NEXT_DIST_DIR: ".next-construction-supervisor-final",
    PORT: "3100",
  },
});

console.log(JSON.stringify({ started: true, pid: child.pid, origin: "http://127.0.0.1:3100", databaseFingerprint: safety.qaDatabase }, null, 2));
if (foreground) {
  child.once("error", (error) => { console.error(error); process.exitCode = 1; });
  child.once("exit", (code) => { if (code !== 0) process.exitCode = code ?? 1; });
} else {
  child.unref();
}
