import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const roleRes = await c.query(
    "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = 'hr_qa_user';"
  );
  console.log("hr_qa_user role flags:", roleRes.rows);

  await c.end();
}

main().catch(console.error);
