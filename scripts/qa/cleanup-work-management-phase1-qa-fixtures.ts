import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import prisma from "@/lib/prisma";

const prefix = "WM-PHASE1-QA-";

async function main(): Promise<void> {
  const projects = await prisma.project.findMany({ where: { code: { startsWith: prefix } }, select: { id: true, code: true } });
  const users = await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true, email: true } });
  const manifest = { generatedAt: new Date().toISOString(), prefix, projects, users };
  await mkdir(join(process.cwd(), "tmp", "qa"), { recursive: true });
  await writeFile(join(process.cwd(), "tmp", "qa", "work-management-phase1-cleanup-manifest.json"), JSON.stringify(manifest, null, 2));
  const projectIds = projects.map((project) => project.id);
  const userIds = users.map((user) => user.id);
  if (projectIds.length > 0) {
    await prisma.workTask.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectMember.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }
  if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  process.stdout.write(JSON.stringify({ cleanedProjects: projectIds.length, cleanedUsers: userIds.length }) + "\n");
}

void main().finally(async () => prisma.$disconnect());
