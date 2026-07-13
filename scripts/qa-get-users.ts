import { Client } from "pg";

const qaUrlStr = process.env.QA_DATABASE_URL;

async function main() {
  const client = new Client({ connectionString: qaUrlStr });
  await client.connect();
  const res = await client.query('SELECT email, role FROM "User"');
  console.log(res.rows);
  await client.end();
}
main();
