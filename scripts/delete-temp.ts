import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  await prisma.$transaction(async (tx) => {
    const dossierId = "cmrsmuc5l0000r4wk7fhqp8gn";
    await tx.supervisionWeeklyEntry.deleteMany({ where: { dossierId } });
    await tx.supervisionWeeklyObservation.deleteMany({ where: { dossierId } });
    await tx.supervisionWeeklyTransition.deleteMany({ where: { dossierId } });
    await tx.supervisionWeeklyQuantity.deleteMany({ where: { dossierId } });
    await tx.supervisionWeeklyProgress.deleteMany({ where: { dossierId } });
    await tx.supervisionWeeklyShiftSelection.deleteMany({ where: { dossierId } });
    await tx.supervisionWeeklyRevision.deleteMany({ where: { dossierId } });
    await tx.supervisionWeeklyDossier.deleteMany({ where: { id: dossierId } });
  });
  console.log('Deleted cmrsmuc5l0000r4wk7fhqp8gn');
}

main().catch(console.error).finally(() => prisma.$disconnect());
