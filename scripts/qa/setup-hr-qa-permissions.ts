import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.hr-qa.local" });

async function setupHrQaUser() {
  const qaDbUrl = process.env.QA_DATABASE_URL;
  if (!qaDbUrl) throw new Error("QA_DATABASE_URL is missing in .env.hr-qa.local");

  const parsedQa = new URL(qaDbUrl);
  const qaUser = parsedQa.username;
  const qaPass = parsedQa.password;
  const qaDb = parsedQa.pathname.replace(/^\//, "");

  const adminClient = new Client({ connectionString: process.env.DATABASE_URL });
  await adminClient.connect();

  console.log(`Setting password and DB-level connection privileges for ${qaUser}...`);
  await adminClient.query(`ALTER USER ${qaUser} WITH PASSWORD '${qaPass}';`);
  await adminClient.query(`GRANT CONNECT ON DATABASE ${qaDb} TO ${qaUser};`);

  // Revoke connect on other databases to enforce least privilege
  try {
    await adminClient.query(`REVOKE CONNECT ON DATABASE construction_erp_v2_dev FROM ${qaUser};`);
  } catch (e) {
    console.warn("Revoke dev connect warning:", e);
  }
  try {
    await adminClient.query(`REVOKE CONNECT ON DATABASE construction_erp_v2_settings_e2e_20260803 FROM ${qaUser};`);
  } catch (e) {
    console.warn("Revoke settings connect warning:", e);
  }

  await adminClient.end();

  console.log(`Setting schema & table-level least privileges inside ${qaDb}...`);
  const devUrl = new URL(process.env.DATABASE_URL!);
  const qaAdminUrl = `postgresql://${devUrl.username}:${devUrl.password}@${devUrl.host}/${qaDb}`;
  const qaAdminClient = new Client({ connectionString: qaAdminUrl });
  await qaAdminClient.connect();

  await qaAdminClient.query(`GRANT USAGE ON SCHEMA public TO ${qaUser};`);
  await qaAdminClient.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${qaUser};`);
  await qaAdminClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${qaUser};`);
  await qaAdminClient.query(`REVOKE CREATE ON SCHEMA public FROM ${qaUser};`);

  await qaAdminClient.end();
  console.log(`${qaUser} permissions successfully configured!`);
}

setupHrQaUser().catch(console.error);
