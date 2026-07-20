import "dotenv/config";
import prisma from "../../src/lib/prisma";

async function main() {
  const [
    dossiers,
    activeQaDossiers,
    activeQaProjects,
    entries,
    quantities,
    transitions,
    progressRows,
    observations,
    legacyObservationGroups,
  ] = await Promise.all([
    prisma.supervisionWeeklyDossier.count(),
    prisma.supervisionWeeklyDossier.count({
      where: {
        deletedAt: null,
        reportNumber: { startsWith: "QA-SUPERVISION-RESULT-TABLE" },
      },
    }),
    prisma.project.findMany({
      where: {
        deletedAt: null,
        OR: [
          { code: { startsWith: "QA-SWR-" } },
          { description: { contains: "QA-SUPERVISION-RESULT-TABLE temporary fixture" } },
        ],
      },
      select: { id: true, code: true, name: true, description: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.supervisionWeeklyEntry.count({ where: { documentType: "RESULT" } }),
    prisma.supervisionWeeklyQuantity.count(),
    prisma.supervisionWeeklyTransition.count(),
    prisma.supervisionWeeklyProgress.count(),
    prisma.supervisionWeeklyObservation.count({ where: { documentType: "RESULT" } }),
    prisma.supervisionWeeklyObservation.groupBy({
      by: ["category"],
      where: { documentType: "RESULT" },
      _count: { _all: true },
      orderBy: { category: "asc" },
    }),
  ]);
  console.log(
    JSON.stringify({
      dossiers,
      activeQaDossiers,
      activeQaProjects: activeQaProjects.length,
      activeQaProjectDetails: activeQaProjects,
      resultEntries: entries,
      quantities,
      transitions,
      progressRows,
      resultObservations: observations,
      legacyObservationGroups,
    }),
  );
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Read-only result data audit failed.");
    process.exitCode = 1;
  });
