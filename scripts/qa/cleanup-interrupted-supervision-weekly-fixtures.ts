import "dotenv/config";
import prisma from "../../src/lib/prisma";

const interruptedFixtureIds = [
  "cmrsqudqb0000i0wk1ts3n838",
  "cmrsqudqd0001i0wkxnyhq73l",
];

async function main() {
  const fixtures = await prisma.project.findMany({
    where: { id: { in: interruptedFixtureIds } },
    select: { id: true, code: true, description: true, deletedAt: true },
  });

  if (
    fixtures.length !== interruptedFixtureIds.length ||
    fixtures.some(
      (project) =>
        project.deletedAt ||
        !project.code.startsWith("QA-SWR-1784522873598-") ||
        project.description !== "QA-SUPERVISION-RESULT-TABLE temporary fixture",
    )
  ) {
    throw new Error("Cleanup stopped: fixture identity did not match the interrupted QA run.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const scopeLinks = await tx.supervisionScopeProject.deleteMany({
      where: { projectId: { in: interruptedFixtureIds } },
    });
    const projects = await tx.project.updateMany({
      where: { id: { in: interruptedFixtureIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { removedScopeLinks: scopeLinks.count, softDeletedProjects: projects.count };
  });

  console.log(JSON.stringify(result));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "QA fixture cleanup failed.");
    process.exitCode = 1;
  });
