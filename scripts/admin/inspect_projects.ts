import { prisma } from "./db_client";

async function main() {
  const projects = await prisma.project.findMany({
    orderBy: { code: "asc" },
  });

  console.log(`TOTAL PROJECTS FOUND: ${projects.length}\n`);

  console.log("| Index | ID | Code | Name | Status | Location |");
  console.log("|---|---|---|---|---|---|");
  projects.forEach((p, idx) => {
    console.log(`| ${idx + 1} | \`${p.id}\` | ${p.code} | ${p.name} | ${p.status} | ${p.location || "N/A"} |`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
