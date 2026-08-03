import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  const projects = await prisma.project.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      location: true,
      investor: true,
      budget: true,
      startDate: true,
      endDate: true,
      status: true,
      plannedDurationRaw: true,
      plannedDurationValue: true,
      plannedDurationUnit: true,
      sourceMetadata: true,
      members: {
        where: { role: "CHIEF_COMMANDER", isActive: true, deletedAt: null },
        select: { user: { select: { name: true } } },
      },
    },
  });

  console.log(`TOTAL PROJECTS: ${projects.length}`);
  for (const p of projects) {
    const meta = p.sourceMetadata as any;
    const commander = p.members[0]?.user.name || "Chưa phân công";
    const unit = meta?.unit ? ` · ${meta.unit}` : "";
    console.log(`[${p.code}] ${p.name} | Loc: ${p.location || meta?.area || 'N/A'} | Cmd: ${commander}${unit}`);
  }
}

main().finally(() => prisma.$disconnect());
