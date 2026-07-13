import prisma from "../src/lib/prisma";

async function runTest() {
  console.log("=== STARTING TRANSACTIONS PROPOSAL SOURCE AUDIT ===\n");

  const projects = await prisma.project.findMany({ select: { id: true } });
  
  if (projects.length === 0) {
    console.log("[SKIP] No projects found.");
    return;
  }

  let globalPass = true;

  for (const project of projects) {
    console.log(`\n--- Auditing Project: ${project.id} ---`);
    
    // 1. Quét tất cả MaterialMovement IMPORT có materialRequestId
    const movements = await prisma.materialMovement.findMany({
      where: {
        projectId: project.id,
        type: "IMPORT",
        materialRequestId: { not: null }
      },
      include: {
        materialRequest: {
          include: {
            requestedBy: true
          }
        }
      }
    });

    console.log(`Found ${movements.length} IMPORT movements with materialRequestId.`);

    for (const movement of movements) {
      let pass = true;
      if (!movement.materialRequestItemId) {
        console.log(`[FAIL] Movement ${movement.id}: Missing materialRequestItemId`);
        pass = false;
      }
      
      if (!movement.materialRequest?.requestNo?.startsWith("MR-")) {
        console.log(`[FAIL] Movement ${movement.id}: Invalid or missing requestNo MR- format`);
        pass = false;
      }

      if (!movement.materialRequest?.requestedBy?.name) {
        console.log(`[FAIL] Movement ${movement.id}: Missing createdBy/requestedBy name. Got 'Chưa ghi nhận'.`);
        pass = false;
      }
      
      // Simulate DTO Mapping
      const dtoSource = movement.materialRequest ? `Đề xuất vật tư ${movement.materialRequest.requestNo}` : null;
      if (!dtoSource?.startsWith("Đề xuất vật tư MR-")) {
         console.log(`[FAIL] Movement ${movement.id}: DTO Source does not match "Đề xuất vật tư MR-..."`);
         pass = false;
      }
      
      if (!pass) globalPass = false;
    }

    // 2. Các request APPROVED có receivedQuantity khớp tổng movement IMPORT liên quan.
    const approvedRequests = await prisma.materialRequest.findMany({
      where: {
        projectId: project.id,
        status: "APPROVED"
      },
      include: {
        items: true,
        movements: true
      }
    });

    for (const req of approvedRequests) {
      for (const item of req.items) {
        // Tỉnh tổng movement import của item này
        const totalImported = req.movements
          .filter(m => m.materialRequestItemId === item.id && m.type === "IMPORT")
          .reduce((sum, m) => sum + Number(m.quantity), 0);
        
        if (Number(item.receivedQuantity || 0) !== totalImported) {
           console.log(`[FAIL] Request ${req.requestNo} Item ${item.materialCode}: receivedQuantity (${item.receivedQuantity}) != totalImported (${totalImported})`);
           globalPass = false;
        }
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  if (globalPass) {
    console.log("All auto-import linkage tests PASS.");
  } else {
    console.log("Some auto-import linkage tests FAILED.");
    process.exit(1);
  }
}

runTest()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
