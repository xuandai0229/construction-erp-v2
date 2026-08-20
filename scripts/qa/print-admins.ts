import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      deletedAt: true,
    },
  });

  console.log("ALL ADMIN ACCOUNTS IN RUNTIME DATABASE:");
  console.table(admins);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
