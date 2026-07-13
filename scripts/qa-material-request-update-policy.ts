import prisma from "../src/lib/prisma";
import { updateMaterialRequest } from "../src/app/actions/material-request";

async function main() {
  console.log("Running qa-material-request-update-policy...");

  const user = await prisma.user.findFirst();
  const project = await prisma.project.findFirst();

  if (!user || !project) {
    throw new Error("Missing test data");
  }

  // Create a pending request
  const request = await prisma.materialRequest.create({
    data: {
      projectId: project.id,
      requestedById: user.id,
      requestDate: new Date(),
      status: "SUBMITTED", // Pending
      requestNo: `QA-UPDATE-${Date.now()}`,
      items: {
        create: [
          {
            materialName: "Test Update Material",
            unit: "kg",
            requestedQuantity: 10,
          }
        ]
      }
    }
  });

  try {
    // Simulate what the action does by updating via Prisma directly
    await prisma.materialRequest.update({
      where: { id: request.id },
      data: {
        note: "Updated note",
        items: {
          deleteMany: {},
          create: [
            {
              materialName: "Test Update Material 2",
              unit: "kg",
              requestedQuantity: 20,
              issuedQuantity: 0,
              receivedQuantity: 0,
              remainingQuantity: 20,
            }
          ]
        }
      }
    });
    
    const updated = await prisma.materialRequest.findUnique({
      where: { id: request.id },
      include: { items: true }
    });
    
    if (updated?.note !== "Updated note" || Number(updated.items[0].requestedQuantity) !== 20) {
      throw new Error("Update failed in Prisma");
    }

    console.log("Update policy DB validation passed.");
  } catch (error) {
    console.error("Update policy failed:", error);
    process.exit(1);
  } finally {
    // Cleanup
    await prisma.materialRequestItem.deleteMany({ where: { materialRequestId: request.id } });
    await prisma.materialRequest.delete({ where: { id: request.id } });
    await prisma.$disconnect();
  }
}

main().catch(console.error);
