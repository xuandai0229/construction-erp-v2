import prisma from '../src/lib/prisma';
import assert from 'assert';

async function run() {
  console.log("Running qa-material-request-approve-merge-existing...");
  
  const project = await prisma.project.create({
    data: { name: "QA Merge", code: `QA-MRG-${Date.now()}` }
  });
  
  const user = await prisma.user.create({
    data: { name: "QA User", email: `qa-mrg-${Date.now()}@test.com`, password: "password123", role: "ADMIN" }
  });

  // Existing material
  const existingMat = await prisma.materialItem.create({
    data: {
      projectId: project.id,
      code: "VT-EXISTING",
      name: "Cát Xây Dựng",
      unit: "Khối"
    }
  });

  const request = await prisma.materialRequest.create({
    data: {
      projectId: project.id,
      requestNo: `REQ-${Date.now()}`,
      requestDate: new Date(),
      requestedById: user.id,
      status: "SUBMITTED",
      items: {
        create: [
          { materialName: "Cát xây dựng  ", unit: " Khối ", requestedQuantity: 50 }
        ]
      }
    },
    include: { items: true }
  });

  // Simulate approve action with merge logic
  await prisma.$transaction(async (tx) => {
    await tx.materialRequest.update({ where: { id: request.id }, data: { status: "APPROVED" } });
    
    for (const item of request.items) {
      const normalizedName = item.materialName.trim().toLowerCase().replace(/\s+/g, ' ');
      const normalizedUnit = item.unit.trim().toLowerCase().replace(/\s+/g, ' ');

      const existingMaterials = await tx.materialItem.findMany({ where: { projectId: project.id } });
      const matchedMaterial = existingMaterials.find(m => 
        m.name.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedName &&
        m.unit.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedUnit
      );

      assert(matchedMaterial, "Should match existing material");
      assert.strictEqual(matchedMaterial.id, existingMat.id);

      await tx.materialRequestItem.update({
        where: { id: item.id },
        data: { materialCode: matchedMaterial.code }
      });
    }
  });

  const updatedReqItem = await prisma.materialRequestItem.findFirst({ where: { materialRequestId: request.id } });
  assert.strictEqual(updatedReqItem?.materialCode, "VT-EXISTING");

  console.log("Merge logic passed!");
  
  await prisma.project.delete({ where: { id: project.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

run().catch(console.error).finally(() => prisma.$disconnect());
