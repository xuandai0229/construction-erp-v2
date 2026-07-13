import prisma from "@/lib/prisma";

async function main() {
  const isApply = process.argv.includes("--apply");

  console.log("=== MATERIAL REQUEST REPAIR SCRIPT ===");
  console.log(`Mode: ${isApply ? "APPLY (Will modify data)" : "DRY-RUN (No changes)"}\n`);

  // Find approved requests that have no corresponding movement
  const approvedRequests = await prisma.materialRequest.findMany({
    where: { status: "APPROVED", deletedAt: null },
    include: {
      items: true,
      movements: true,
      project: true,
    }
  });

  const requestsToRepair = approvedRequests.filter(
    req => req.movements.length === 0 && req.items.length > 0
  );

  if (requestsToRepair.length === 0) {
    console.log("No requests need repair. All approved requests have movements.");
    return;
  }

  for (const req of requestsToRepair) {
    for (const item of req.items) {
      // Find material item by code or name
      let material = null;
      if (item.materialCode) {
        material = await prisma.materialItem.findFirst({
          where: { projectId: req.projectId, code: item.materialCode }
        });
      }
      if (!material) {
        material = await prisma.materialItem.findFirst({
          where: { projectId: req.projectId, name: item.materialName }
        });
      }

      if (!material) {
        console.log(`[WARNING] Request ${req.requestNo}: Material '${item.materialName}' not found in catalog. Skipping.`);
        continue;
      }

      const stockRecord = await prisma.projectMaterialStock.findUnique({
        where: { projectId_materialItemId: { projectId: req.projectId, materialItemId: material.id } }
      });

      const currentStock = Number(stockRecord?.stock || 0);
      const qty = Number(item.requestedQuantity);
      const expectedStock = currentStock + qty;

      console.log(`[REPAIR TARGET] Request: ${req.requestNo} | Material: ${material.name} (${material.code})`);
      console.log(`  Quantity to import: +${qty} ${item.unit}`);
      console.log(`  Stock update: ${currentStock} -> ${expectedStock}`);

      if (isApply) {
        await prisma.$transaction(async (tx) => {
          // 1. Upsert stock
          await tx.projectMaterialStock.upsert({
            where: { projectId_materialItemId: { projectId: req.projectId, materialItemId: material!.id } },
            update: { stock: { increment: qty }, lastUpdated: new Date() },
            create: {
              projectId: req.projectId,
              materialItemId: material!.id,
              stock: qty,
              minStockLevel: 0
            }
          });

          // 2. Create movement
          await tx.materialMovement.create({
            data: {
              projectId: req.projectId,
              materialItemId: material!.id,
              materialRequestId: req.id,
              materialRequestItemId: item.id,
              type: "IMPORT",
              quantity: qty,
              movementDate: new Date(),
              notes: "Nhập kho từ đề xuất vật tư (Backfill)",
              materialCodeSnapshot: material!.code,
              materialNameSnapshot: material!.name,
              unitSnapshot: material!.unit
            }
          });

          // 3. Update received quantity
          await tx.materialRequestItem.update({
            where: { id: item.id },
            data: { receivedQuantity: item.requestedQuantity }
          });
        });
        console.log(`  [OK] Repaired successfully.\n`);
      } else {
        console.log(`  [DRY RUN] Would repair.\n`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
