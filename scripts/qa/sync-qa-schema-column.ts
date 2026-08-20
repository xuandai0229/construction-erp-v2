import dotenv from "dotenv";
import path from "node:path";
import { Pool } from "pg";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function sync() {
  const qaUrl = process.env.QA_DATABASE_URL;
  if (!qaUrl) {
    console.log("No QA_DATABASE_URL found");
    return;
  }

  const pool = new Pool({ connectionString: qaUrl });
  try {
    await pool.query(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP WITH TIME ZONE;
    `);
    console.log("Successfully ensured mustChangePassword and passwordChangedAt columns on QA_DATABASE_URL");
  } catch (err: any) {
    console.error("Error syncing QA column:", err.message);
  } finally {
    await pool.end();
  }
}

sync();
