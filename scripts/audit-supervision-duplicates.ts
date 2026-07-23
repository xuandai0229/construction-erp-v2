import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Auditing Supervision Weekly Entries for suspicious duplicates or test data...");
  const suspiciousEntries = await prisma.supervisionWeeklyEntry.findMany({
    where: {
      OR: [
        { inspectionContent: { startsWith: "qDa" } },
        { inspectionContent: { equals: "q" } },
        { inspectionContent: { contains: "Khảo sát móng bổ sung" } },
        { result: { startsWith: "qDa" } },
        { result: { equals: "q" } },
        { commanderProposal: { startsWith: "qDa" } },
        { commanderProposal: { equals: "q" } },
      ]
    },
    include: {
      dossier: { select: { reportNumber: true } }
    }
  });

  console.log(`Found ${suspiciousEntries.length} suspicious entries.`);
  for (const entry of suspiciousEntries) {
    console.log(`- Dossier: ${entry.dossier.reportNumber || entry.dossierId}, Type: ${entry.documentType}, Date: ${entry.entryDate.toISOString()}, Content: ${entry.inspectionContent}, Result: ${entry.result}, Proposal: ${entry.commanderProposal}`);
  }

  const suspiciousObservations = await prisma.supervisionWeeklyObservation.findMany({
    where: {
      OR: [
        { content: { startsWith: "qDa" } },
        { content: { equals: "q" } },
        { content: { startsWith: "qBo" } },
        { content: { startsWith: "qDay" } },
      ]
    },
    include: {
      dossier: { select: { reportNumber: true } }
    }
  });

  console.log(`Found ${suspiciousObservations.length} suspicious observations.`);
  for (const obs of suspiciousObservations) {
    console.log(`- Dossier: ${obs.dossier.reportNumber || obs.dossierId}, Category: ${obs.category}, Content: ${obs.content}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
