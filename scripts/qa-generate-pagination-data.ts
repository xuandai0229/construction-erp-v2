import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/construction_erp";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  for (let i = 1; i <= 16; i++) {
    const code = `QA_TEST_PAGINATION_${i.toString().padStart(3, '0')}`;
    await prisma.project.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: `QA Pagination Project ${i}`,
        status: "ACTIVE"
      }
    });
  }
  console.log("Created 16 QA_TEST_PAGINATION_ projects.");
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
