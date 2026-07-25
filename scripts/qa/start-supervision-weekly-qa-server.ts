import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

const values = config({ path: ".env" }).parsed ?? {};
const qaDatabaseUrl = values.QA_DATABASE_URL;
if (!qaDatabaseUrl) throw new Error("QA_DATABASE_URL is required");

const artifactDirectory = join(
  process.cwd(),
  "artifacts",
  "supervision-weekly-e2e",
  "server",
);
const stdout = openSync(join(artifactDirectory, "qa-server-final-run.stdout.log"), "w");
const stderr = openSync(join(artifactDirectory, "qa-server-final-run.stderr.log"), "w");
const nextCli = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextCli, "dev", "-p", "3100"], {
  cwd: process.cwd(),
  detached: true,
  windowsHide: true,
  stdio: ["ignore", stdout, stderr],
  env: {
    ...process.env,
    ...values,
    DATABASE_URL: qaDatabaseUrl,
    QA_DATABASE_URL: qaDatabaseUrl,
    SUPERVISION_PDF_RENDER_ORIGIN: "http://127.0.0.1:3100",
    NEXT_DIST_DIR: ".next-qa",
    PORT: "3100",
  },
});

child.unref();
console.log(JSON.stringify({
  started: true,
  pid: child.pid,
  origin: "http://127.0.0.1:3100",
}));
