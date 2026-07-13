import prisma from '../src/lib/prisma';
import assert from 'assert';

async function run() {
  console.log("Running qa-material-request-approve-to-catalog...");
  
  const project = await prisma.project.create({
    data: { name: "QA Approve Catalog", code: `QA-CAT-${Date.now()}` }
  });
  
  const user = await prisma.user.create({
    data: { name: "QA User", email: `qa-cat-${Date.now()}@test.com`, password: "password123", role: "ADMIN" }
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
          { materialName: "Thép D12", unit: "Kg", requestedQuantity: 500 }
        ]
      }
    },
    include: { items: true }
  });

  // Simulate approve action
  await prisma.$transaction(async (tx) => {
    await tx.materialRequest.update({ where: { id: request.id }, data: { status: "APPROVED" } });
    for (const item of request.items) {
      const newCode = `VT-${Date.now().toString().slice(-6)}`;
      const newMat = await tx.materialItem.create({
        data: {
          projectId: project.id,
          code: newCode,
          name: item.materialName,
          unit: item.unit,
          description: `[CREATED_FROM_REQUEST:${request.id}]`,
        }
      });
      await tx.projectMaterialStock.create({
        data: { projectId: project.id, materialItemId: newMat.id, stock: 0 }
      });
      await tx.materialRequestItem.update({
        where: { id: item.id },
        data: { materialCode: newCode }
      });
    }
  });

  // Verify
  const mats = await prisma.materialItem.findMany({ where: { projectId: project.id } });
  assert.strictEqual(mats.length, 1, "Should create 1 material item");
  assert.strictEqual(mats[0].description, `[CREATED_FROM_REQUEST:${request.id}]`);

  const stocks = await prisma.projectMaterialStock.findMany({ where: { materialItemId: mats[0].id } });
  assert.strictEqual(stocks.length, 1, "Should create 1 stock record");
  assert.strictEqual(Number(stocks[0].stock), 0, "Stock should be 0");

  console.log("Approve to catalog logic works!");
  
  await prisma.project.delete({ where: { id: project.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

run().catch(console.error).finally(() => prisma.$disconnect());
