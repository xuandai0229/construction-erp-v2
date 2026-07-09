import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  const users = await prisma.user.findMany({ select: { email: true } });
  console.log("Users:", users);
  
  await prisma.$disconnect();
  await pool.end();
}

main();
