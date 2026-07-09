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
  });

  for (const project of projects) {
    console.log("Cleaning up project:", project.id);
    await prisma.fieldProgressEntry.deleteMany({ where: { projectId: project.id } });
    await prisma.siteReportLine.deleteMany({ where: { projectId: project.id } });
    await prisma.siteReport.deleteMany({ where: { projectId: project.id } });
    await prisma.fieldProgressItem.deleteMany({ where: { projectId: project.id } });
    await prisma.fieldProgressTemplate.deleteMany({ where: { projectId: project.id } });
    await prisma.auditLog.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });
  }
  console.log("Cleanup done.");
}

main().finally(() => prisma.$disconnect());
