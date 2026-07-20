import "dotenv/config";
import prisma from "../../src/lib/prisma";

async function main() {
  const [projects, locationCounts, fieldCounts, wbsCount, taskCount, fieldSamples, locationSamples, wbsSamples] = await Promise.all([
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.projectLocationNode.groupBy({ by: ["nodeType"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.fieldProgressItem.groupBy({ by: ["itemType"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.wBSItem.count({ where: { deletedAt: null } }),
    prisma.workTask.count(),
    prisma.fieldProgressItem.findMany({
      where: { deletedAt: null },
      select: { id: true, projectId: true, parentId: true, level: true, itemType: true, code: true, categoryName: true, workContent: true },
      orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }],
      take: 20,
    }),
    prisma.projectLocationNode.findMany({
      where: { deletedAt: null },
      select: { id: true, projectId: true, parentId: true, level: true, nodeType: true, code: true, name: true },
      orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }],
      take: 20,
    }),
    prisma.wBSItem.findMany({
      where: { deletedAt: null },
      select: { id: true, projectId: true, parentId: true, code: true, name: true },
      orderBy: [{ projectId: "asc" }, { code: "asc" }],
      take: 20,
    }),
  ]);

  console.log(JSON.stringify({ projects, locationCounts, fieldCounts, wbsCount, taskCount, fieldSamples, locationSamples, wbsSamples }, null, 2));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Read-only source domain audit failed.");
    process.exitCode = 1;
  });
