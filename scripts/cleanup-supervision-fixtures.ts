import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  const databaseUrl = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl || !databaseUrl.includes("qa")) {
    console.error("This script MUST be run on a QA database (URL must contain 'qa').");
    process.exit(1);
  }

  console.log("Looking for QA fixture dossiers...");
  const fixtureDossiers = await prisma.supervisionWeeklyDossier.findMany({
    where: {
      OR: [
        { reportNumber: { startsWith: "QA-NWP-" } },
        { reportNumber: { startsWith: "QA-" } },
        // identify by typical QA fixture strings if any
      ]
    },
    include: {
      entries: true,
      observations: true,
      transitions: true,
      quantities: true,
      progressRows: true,
      shiftSelections: true,
    }
  });

  if (fixtureDossiers.length === 0) {
    console.log("No fixture dossiers found.");
    return;
  }

  for (const dossier of fixtureDossiers) {
    console.log(`--- Manifest for Dossier ${dossier.id} (${dossier.reportNumber}) ---`);
    console.log(`Entries: ${dossier.entries.length}`);
    console.log(`Observations: ${dossier.observations.length}`);
    console.log(`Transitions: ${dossier.transitions.length}`);
    console.log(`Quantities: ${dossier.quantities.length}`);
    console.log(`Progress Rows: ${dossier.progressRows.length}`);
    console.log(`Shift Selections: ${dossier.shiftSelections.length}`);
    
    // DRY RUN
    // actually, we will delete them
    await prisma.$transaction(async (tx) => {
      await tx.supervisionWeeklyEntry.deleteMany({ where: { dossierId: dossier.id } });
      await tx.supervisionWeeklyObservation.deleteMany({ where: { dossierId: dossier.id } });
      await tx.supervisionWeeklyTransition.deleteMany({ where: { dossierId: dossier.id } });
      await tx.supervisionWeeklyQuantity.deleteMany({ where: { dossierId: dossier.id } });
      await tx.supervisionWeeklyProgress.deleteMany({ where: { dossierId: dossier.id } });
      await tx.supervisionWeeklyShiftSelection.deleteMany({ where: { dossierId: dossier.id } });
      await tx.supervisionWeeklyRevision.deleteMany({ where: { dossierId: dossier.id } });
      await tx.supervisionWeeklyDossier.delete({ where: { id: dossier.id } });
    });
    console.log(`Deleted dossier ${dossier.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
