import "dotenv/config";
import { execSync } from "child_process";

const qaUrlStr = process.env.QA_DATABASE_URL;
const devUrlStr = process.env.DATABASE_URL;

if (!qaUrlStr) {
  console.error("FAIL: QA_DATABASE_URL is not set.");
  process.exit(1);
}

try {
  const qaUrl = new URL(qaUrlStr);
  const devUrl = new URL(devUrlStr || "");

  if (qaUrl.protocol !== "postgresql:" && qaUrl.protocol !== "postgres:") {
    console.error("FAIL: URL is not PostgreSQL.");
    process.exit(1);
  }

  const dbName = qaUrl.pathname.replace("/", "");
  if (!dbName.includes("qa") && !dbName.includes("test") && !dbName.includes("ci") && !dbName.includes("sandbox")) {
    console.error("FAIL: Database name must contain qa, test, ci, or sandbox.");
    process.exit(1);
  }

  const qaFingerprint = `${qaUrl.hostname}:${qaUrl.port}/${dbName}`;
  const devFingerprint = `${devUrl.hostname}:${devUrl.port}/${devUrl.pathname.replace("/", "")}`;

  if (qaFingerprint === devFingerprint) {
    console.error("FAIL: QA fingerprint is the same as dev fingerprint.");
    process.exit(1);
  }

  console.log(`PASS: Safety guard checks passed.`);
  console.log(`QA Database Host: ${qaUrl.hostname}`);
  console.log(`QA Database Port: ${qaUrl.port || 5432}`);
  console.log(`QA Database Name: ${dbName}`);
  
  console.log("Running Prisma migrate deploy on QA database...");
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: qaUrlStr, // Override just for Prisma
    },
  });
  console.log("Migration completed successfully.");
  process.exit(0);
} catch (e: any) {
  console.error(`FAIL: ${e.message}`);
  process.exit(1);
}
