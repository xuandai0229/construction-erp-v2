import prisma from "../src/lib/prisma";

async function main() {
  console.log("Running qa-material-request-cross-tab-linkage...");
  
  const project = await prisma.project.findFirst();
  const user = await prisma.user.findFirst();
  if (!project || !user) throw new Error("No project or user found");

  await prisma.materialRequestItem.deleteMany({
    where: { materialRequest: { requestNo: { startsWith: 'QA-CROSS-' } } }
  });
  await prisma.materialRequest.deleteMany({
    where: { requestNo: { startsWith: 'QA-CROSS-' } }
  });

  const req = await prisma.materialRequest.create({
    data: {
      project: { connect: { id: project.id } },
      requestedBy: { connect: { id: user.id } },
      requestNo: `QA-CROSS-${Date.now()}`,
      status: "APPROVED",
      requestDate: new Date(),
      items: {
        create: [{ materialName: "QA Gạch xây", unit: "viên", requestedQuantity: 1000 }]
      }
    },
    include: { items: true }
  });

  // Verify no movement is created
  const movements = await prisma.materialMovement.findMany({ where: { materialRequestId: req.id } });
  if (movements.length > 0) throw new Error("Movements should not be created automatically!");
  
  console.log("Cross-tab linkage test passed.");
  await prisma.materialRequestItem.deleteMany({ where: { materialRequestId: req.id } });
  await prisma.materialRequest.delete({ where: { id: req.id } });
}

main().catch(console.error);
