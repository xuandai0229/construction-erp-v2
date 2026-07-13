import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.QA_DATABASE_URL });
  await client.connect();

  try {
    await client.query('UPDATE "User" SET "isActive" = true, "deletedAt" = NULL WHERE email IN ($1, $2)', ['tayho.admin@seed.local', 'tayho.accountant@seed.local']);
    console.log("Updated users to be active");
  } catch (e: any) {
    console.error("Error: ", e.message);
  } finally {
    await client.end();
  }
}
main();
