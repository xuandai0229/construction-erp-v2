import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  const d = await prisma.supervisionWeeklyDossier.findUnique({ where: { id: "cmrsmuc5l0000r4wk7fhqp8gn" } });
  console.log("Dossier exists:", !!d);
}

main().catch(console.error).finally(() => prisma.$disconnect());
