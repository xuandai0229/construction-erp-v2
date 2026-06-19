import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/construction_erp";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const paginationProjects = await prisma.project.findMany({
    where: { code: { startsWith: "QA_TEST_PAGINATION_" } }
  });

  const projectIds = paginationProjects.map(p => p.id);

  if (projectIds.length > 0) {
    await prisma.documentFolder.deleteMany({
      where: { projectId: { in: projectIds } }
    });

    await prisma.projectMember.deleteMany({
        where: { projectId: { in: projectIds } }
    });

    await prisma.auditLog.deleteMany({
      where: { projectId: { in: projectIds } }
    });

    await prisma.project.deleteMany({
      where: { id: { in: projectIds } }
    });
  }

  console.log(`Cleaned up ${paginationProjects.length} QA_TEST_PAGINATION_ projects.`);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
