import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  const hash = await bcrypt.hash("123456", 10);
  await prisma.user.updateMany({
    where: { email: "daicongtu2910@gmail.com" },
    data: { password: hash }
  });
  console.log("Password updated");
  
  await prisma.$disconnect();
  await pool.end();
}

main();
