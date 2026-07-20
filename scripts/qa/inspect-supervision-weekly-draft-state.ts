import "dotenv/config";
import prisma from "../../src/lib/prisma";

async function main() {
  const dossierId = process.argv[2];
  if (!dossierId) throw new Error("Thiếu dossierId cần kiểm tra.");

  const dossier = await prisma.supervisionWeeklyDossier.findUnique({
    where: { id: dossierId },
    select: {
      id: true,
      status: true,
      lockVersion: true,
      updatedAt: true,
      _count: {
        select: {
          entries: true,
          shiftSelections: true,
          transitions: true,
          quantities: true,
          progressRows: true,
        },
      },
    },
  });

  console.log(JSON.stringify(dossier, null, 2));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Không thể kiểm tra bản nháp.");
    process.exitCode = 1;
  });
