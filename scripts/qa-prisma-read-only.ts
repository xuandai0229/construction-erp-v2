import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

async function main() {
  const connectionString = `${process.env.DATABASE_URL}`
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const users = await prisma.user.findMany();
    console.log(`PASS: Found ${users.length} users via Prisma.`);

    const projects = await prisma.project.findMany();
    console.log(`PASS: Found ${projects.length} projects via Prisma.`);

    const materials = await prisma.materialItem.findMany();
    console.log(`PASS: Found ${materials.length} material items via Prisma.`);

    const docs = await prisma.document.findMany();
    console.log(`PASS: Found ${docs.length} documents via Prisma.`);
    
    console.log("PASS: Prisma Client query executed successfully without enum or relation errors.");
  } catch (error: any) {
    console.error("FAIL: Prisma Query failed: " + error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
