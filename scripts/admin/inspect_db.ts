import { prisma } from "./db_client";

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, code: true, name: true, status: true, location: true },
    orderBy: { code: "asc" },
  });
  console.log(`\n=== 21 PROTECTED REAL PROJECTS (${projects.length}) ===`);
  console.table(projects);

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true },
    orderBy: { email: "asc" },
  });
  console.log(`\n=== USERS IN SYSTEM (${users.length}) ===`);
  console.table(users);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
