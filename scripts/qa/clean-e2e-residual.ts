import { Client } from "pg";
require("dotenv").config();

async function main() {
  const mainUrl = process.env.DATABASE_URL;
  if (!mainUrl) return;
  const e2eUrl = mainUrl.replace("construction_erp_v2_qa", "construction_erp_v2_settings_e2e_20260803");

  const client = new Client({ connectionString: e2eUrl });
  await client.connect();

  const docs = await client.query(`SELECT id, "originalName" FROM "Document";`);
  console.log("Documents in E2E DB:", docs.rows);
  const res = await client.query(`DELETE FROM "Document";`);
  console.log(`Deleted ${res.rowCount} E2E test documents.`);
  await client.end();
}

main();
