import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import prisma from "../../src/lib/prisma";

const SOURCE_ID = "1RQMU9no_Q52i5Nt6HyVr7YUNbPLsd37PlhUgBjrRwyM";

async function main() {
  const projects = await prisma.project.findMany({
    where: { externalSourceKey: { not: null } },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      investor: true,
      location: true,
      status: true,
      startDate: true,
      endDate: true,
      budget: true,
      plannedDurationValue: true,
      plannedDurationUnit: true,
      plannedDurationRaw: true,
      externalSource: true,
      externalSourceKey: true,
      sourceMetadata: true,
    },
  });

  const projectIds = projects.map((project) => project.id);
  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: [{ projectId: "asc" }, { userId: "asc" }],
    select: {
      id: true,
      projectId: true,
      userId: true,
      role: true,
      assignedById: true,
      isActive: true,
      deletedAt: true,
    },
  });

  const userIds = [...new Set(projectMembers.map((member) => member.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    orderBy: { email: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      deletedAt: true,
    },
  });

  const database = await prisma.$queryRaw<Array<{ database: string; host: string | null; port: number | null }>>`
    SELECT current_database() AS database, inet_server_addr()::text AS host, inet_server_port() AS port
  `;
  const snapshot = {
    createdAt: new Date().toISOString(),
    source: { spreadsheetId: SOURCE_ID, projectCount: projects.length },
    database: database[0] ?? null,
    counts: {
      projects: projects.length,
      users: users.length,
      projectMembers: projectMembers.length,
    },
    projects,
    users,
    projectMembers,
  };

  const dir = path.join(process.cwd(), "docs", "qa", "reconciliation-snapshots");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `source-state-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(JSON.stringify({ file, database: snapshot.database, counts: snapshot.counts }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
