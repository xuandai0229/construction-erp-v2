import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:123456@127.0.0.1:5432/construction_erp_v2?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
  console.log("Starting QA: Material Delete Sync");

  // 1. Create a mock project
  const project = await prisma.project.create({
    data: {
      name: "QA Sync Test Project",
      code: `QA-SYNC-${Date.now()}`,
    },
  });
  console.log(`Created Project: ${project.id}`);

  // 2. Create a material
  const material = await prisma.materialItem.create({
    data: {
      projectId: project.id,
      code: `MOCK-MAT-${Date.now()}`,
      name: "Mock Material For Delete",
      unit: "KG",
      isActive: true,
    },
  });
  console.log(`Created Material: ${material.id}`);

  // 3. Create a stock and transaction to ensure soft delete instead of hard delete
  await prisma.projectMaterialStock.create({
    data: {
      projectId: project.id,
      materialItemId: material.id,
      stock: 100,
      minStockLevel: 10,
    },
  });

  const tx = await prisma.materialMovement.create({
    data: {
      projectId: project.id,
      materialItemId: material.id,
      type: "IMPORT",
      quantity: 100,
      movementDate: new Date(),
      notes: "Mock import to prevent hard delete",
    },
  });
  console.log(`Created Transaction: ${tx.id}`);

  // 4. Archive/Soft-delete the material (simulate deleteMaterialItem from actions.ts)
  await prisma.materialItem.update({
    where: { id: material.id },
    data: { isActive: false },
  });
  console.log(`Soft deleted Material: ${material.id}`);

  // 5. Query Catalog (active only)
  const catalogCount = await prisma.materialItem.count({
    where: { projectId: project.id, isActive: true },
  });
  if (catalogCount > 0) {
    throw new Error("FAIL: Material is still active in Catalog query");
  }

  // 6. Query Stock (active only)
  const stockCount = await prisma.projectMaterialStock.count({
    where: { projectId: project.id, materialItem: { isActive: true } },
  });
  if (stockCount > 0) {
    throw new Error("FAIL: Material is still active in Stock query");
  }

  // 7. Query Transactions
  const allTx = await prisma.materialMovement.findMany({
    where: { projectId: project.id },
    include: { materialItem: true },
  });
  
  if (allTx.length !== 1) {
    throw new Error("FAIL: Transaction missing");
  }

  const foundTx = allTx[0];
  if (foundTx.materialItem.isActive) {
    throw new Error("FAIL: Transaction material is active (expected false)");
  }
  
  console.log("PASS: Soft deleted material correctly excluded from Catalog and Stock, but marked as inactive in Transactions.");

  // Cleanup
  await prisma.materialMovement.deleteMany({ where: { projectId: project.id } });
  await prisma.projectMaterialStock.deleteMany({ where: { projectId: project.id } });
  await prisma.materialItem.deleteMany({ where: { projectId: project.id } });
  await prisma.project.delete({ where: { id: project.id } });

  console.log("Cleanup complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
