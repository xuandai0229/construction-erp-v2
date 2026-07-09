import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const projects = await prisma.project.findMany({
    where: { code: { startsWith: "QA-PLAN-" } },
    include: {
      siteReports: true,
      fieldProgressEntries: true,
    }
  });

  if (projects.length === 0) {
    console.log("✅ No QA projects found. DB is clean.");
  } else {
    console.error("❌ Found QA projects:");
    console.error(JSON.stringify(projects, null, 2));
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
