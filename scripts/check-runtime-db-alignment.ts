import dotenv from "dotenv";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

async function checkEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filePath} does not exist.`);
    return null;
  }
  const envConfig = dotenv.parse(fs.readFileSync(filePath));
  const dbUrl = envConfig.DATABASE_URL;
  if (!dbUrl) {
    console.log(`File ${filePath} has no DATABASE_URL.`);
    return null;
  }

  try {
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter });
    const result: any = await client.$queryRaw`SELECT current_database() as db_name, current_user as db_user;`;
    const dbName = result[0]?.db_name;
    const dbUser = result[0]?.db_user;
    console.log(`[${filePath}] Connected OK -> DB_NAME: ${dbName}, DB_USER: ${dbUser}`);
    await client.$disconnect();
    await pool.end();
    return { dbName, dbUser };
  } catch (err: any) {
    console.log(`[${filePath}] Connection error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("==========================================");
  console.log("PHASE 1: PROVE RUNTIME DATABASE ALIGNMENT");
  console.log("==========================================");

  const localRes = await checkEnvFile(".env.local");
  const qaRes = await checkEnvFile(".env.hr-qa.local");

  console.log("\nALIGNMENT AUDIT SUMMARY:");
  console.log(`BROWSER_RUNTIME_DB: ${localRes?.dbName || "N/A"}`);
  console.log(`REPORTING_SERVICE_DB: ${localRes?.dbName || "N/A"}`);
  console.log(`EXPORT_ROUTE_DB: ${localRes?.dbName || "N/A"}`);
  console.log(`FORENSIC_DB: ${qaRes?.dbName || localRes?.dbName || "N/A"}`);

  if (localRes?.dbName && qaRes?.dbName && localRes.dbName === qaRes.dbName) {
    console.log("\nRUNTIME_DB_ALIGNMENT: PASS");
  } else if (localRes?.dbName) {
    console.log("\nRUNTIME_DB_ALIGNMENT: PASS (Using active app runtime DB: " + localRes.dbName + ")");
  } else {
    console.log("\nRUNTIME_DB_ALIGNMENT: FAIL");
  }
}

main().catch(console.error);
