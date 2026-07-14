import "dotenv/config";
import { assertSafeQaDatabase } from "./qa/assert-safe-qa-database";
import { createSafeQaPrismaClient } from "./qa/create-safe-qa-prisma-client";

async function main() {
  const safety = await assertSafeQaDatabase();
  if (!safety.safe || !process.env.QA_DATABASE_URL) throw new Error("QA safety guard chưa đạt; không chạy cleanup.");
  const { prisma, close } = createSafeQaPrismaClient(process.env.QA_DATABASE_URL);
  try {
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
  } finally {
    await close();
  }
}

main().catch(() => {
  console.error("QA pagination cleanup failed.");
  process.exitCode = 1;
});
