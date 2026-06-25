import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== MATERIALS CRUD FLOW TEST ===");

  // 1. Setup a test project
  const project = await prisma.project.create({
    data: {
      name: "CRUD Test Project",
      code: "CRUD-" + Date.now(),
      status: "ACTIVE",
    },
  });
  console.log(`Created test project: ${project.id}`);

  try {
    // 2. Create a material
    let material = await prisma.materialItem.create({
      data: {
        projectId: project.id,
        code: "TEST-MAT-01",
        name: "Test Material 01",
        unit: "kg",
        group: "TEST",
        isActive: true,
      },
    });
    console.log(`Created material: ${material.id} (${material.code})`);

    // 3. Update material (full edit including unit)
    material = await prisma.materialItem.update({
      where: { id: material.id },
      data: { name: "Test Material 01 Updated", unit: "bao" },
    });
    console.log(`Updated material name to: ${material.name}, unit to: ${material.unit}`);

    // 4. Create stock and movement (Import 100)
    await prisma.projectMaterialStock.create({
      data: {
        projectId: project.id,
        materialItemId: material.id,
        stock: 100,
        minStockLevel: 10,
      },
    });
    await prisma.materialMovement.create({
      data: {
        projectId: project.id,
        materialItemId: material.id,
        type: "IMPORT",
        quantity: 100,
        movementDate: new Date(),
      },
    });
    console.log(`Imported 100 bao. Stock is now 100.`);

    // 5. Update unit again after import (should succeed)
    material = await prisma.materialItem.update({
      where: { id: material.id },
      data: { unit: "tấn" },
    });
    console.log(`Updated unit to: ${material.unit} even with movements.`);

    // 6. Export 30
    await prisma.projectMaterialStock.update({
      where: { projectId_materialItemId: { projectId: project.id, materialItemId: material.id } },
      data: { stock: 70 },
    });
    await prisma.materialMovement.create({
      data: {
        projectId: project.id,
        materialItemId: material.id,
        type: "EXPORT",
        quantity: 30,
        movementDate: new Date(),
      },
    });
    console.log(`Exported 30 tấn. Stock is now 70.`);

    // 7. Delete directly (simulating the action logic)
    await prisma.$transaction([
      prisma.materialMovement.deleteMany({
        where: { materialItemId: material.id, projectId: material.projectId },
      }),
      prisma.projectMaterialStock.deleteMany({
        where: { materialItemId: material.id, projectId: material.projectId },
      }),
      prisma.materialItem.delete({
        where: { id: material.id },
      }),
    ]);
    console.log(`Deleted material directly with all related data.`);

    // 8. Assert DB that movement and stock are gone
    const finalMovCount = await prisma.materialMovement.count({
      where: { materialItemId: material.id },
    });
    const finalStockCount = await prisma.projectMaterialStock.count({
      where: { materialItemId: material.id },
    });
    const finalItemCount = await prisma.materialItem.count({
      where: { id: material.id },
    });

    console.log(`Final material count: ${finalItemCount} (Expected: 0)`);
    console.log(`Final stock count: ${finalStockCount} (Expected: 0)`);
    console.log(`Final movement count: ${finalMovCount} (Expected: 0)`);

    if (finalItemCount === 0 && finalStockCount === 0 && finalMovCount === 0) {
      console.log("✅ CRUD FLOW TEST PASSED SUCCESSFULLY!");
    } else {
      console.log("❌ TEST FAILED: Orphan data found.");
    }

  } catch (error) {
    console.error("❌ TEST FAILED:", error);
  } finally {
    // Cleanup
    await prisma.materialMovement.deleteMany({ where: { projectId: project.id } });
    await prisma.projectMaterialStock.deleteMany({ where: { projectId: project.id } });
    await prisma.materialItem.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });
    console.log("Cleaned up test data.");
    await prisma.$disconnect();
  }
}

main();
