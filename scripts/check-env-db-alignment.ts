import dotenv from "dotenv";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

async function checkEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filePath} does not exist.`);
    return;
  }
  const envConfig = dotenv.parse(fs.readFileSync(filePath));
  const dbUrl = envConfig.DATABASE_URL;
  if (!dbUrl) {
    console.log(`File ${filePath} has no DATABASE_URL.`);
    return;
  }

  process.env.DATABASE_URL = dbUrl;
  try {
    const prismaClient = new PrismaClient();
    const result: any = await prismaClient.$queryRaw`SELECT current_database() as db_name, current_user as db_user;`;
    console.log(`[${filePath}] Connected OK: DB_NAME = ${result[0]?.db_name}, DB_USER = ${result[0]?.db_user}`);
    await prismaClient.$disconnect();
  } catch (err: any) {
    console.log(`[${filePath}] Connection error: ${err.message}`);
  }
}

async function main() {
  console.log("=== CHECKING RUNTIME DB ALIGNMENT ACROSS ENV FILES ===");
  await checkEnvFile(".env.local");
  await checkEnvFile(".env.hr-qa.local");
}

main().catch(console.error);
