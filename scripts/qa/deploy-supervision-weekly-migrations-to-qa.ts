import "dotenv/config";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";

function runPrisma(args: string[], qaUrl: string) {
  const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: qaUrl,
    },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`prisma ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function main() {
  const safety = assertSafeQaDatabase();
  const qaUrl = process.env.QA_DATABASE_URL;
  if (!qaUrl) throw new Error("QA_DATABASE_URL is required");

  console.log(JSON.stringify({
    safe: true,
    target: safety.qaDatabase,
    operation: "prisma migrate deploy",
  }, null, 2));

  runPrisma(["migrate", "deploy"], qaUrl);
  runPrisma(["migrate", "status"], qaUrl);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unknown QA migration deployment failure");
  process.exitCode = 1;
}
