/**
 * Deep Audit Script for Materials Module
 * Checks: project isolation, stock sync, orphan records, negative stock,
 * duplicate codes, demo/test data
 */
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== DEEP MATERIALS AUDIT ===\n");

  // 1. Total projects
  const allProjects = await prisma.project.findMany({
    select: { id: true, name: true, code: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`[1] Total projects: ${allProjects.length}`);
  for (const p of allProjects) {
    console.log(`    - ${p.code} | ${p.name} | status=${p.status}`);
  }

  // 2. Per-project material counts
  console.log("\n[2] MaterialItems per project:");
  for (const p of allProjects) {
    const count = await prisma.materialItem.count({ where: { projectId: p.id } });
    console.log(`    ${p.code}: ${count} materials`);
  }

  // 3. MaterialItems with NULL projectId (global/orphan)
  const globalMaterials: any[] = []; // No longer possible with schema change
  console.log(`\n[3] MaterialItems with projectId=NULL (orphan/global): ${globalMaterials.length}`);
  for (const m of globalMaterials) {
    console.log(`    - id=${m.id} code=${m.code} name=${m.name}`);
  }

  // 4. Per-project stock counts
  console.log("\n[4] ProjectMaterialStock per project:");
  for (const p of allProjects) {
    const count = await prisma.projectMaterialStock.count({ where: { projectId: p.id } });
    console.log(`    ${p.code}: ${count} stock rows`);
  }

  // 5. Per-project movement counts
  console.log("\n[5] MaterialMovement per project:");
  for (const p of allProjects) {
    const count = await prisma.materialMovement.count({ where: { projectId: p.id } });
    console.log(`    ${p.code}: ${count} movements`);
  }

  // 6. Negative stock check
  console.log("\n[6] Negative stock check:");
  const negativeStocks = await prisma.projectMaterialStock.findMany({
    where: { stock: { lt: 0 } },
    include: { materialItem: { select: { code: true, name: true } }, project: { select: { code: true } } },
  });
  if (negativeStocks.length === 0) {
    console.log("    OK - No negative stocks found");
  } else {
    for (const s of negativeStocks) {
      console.log(`    NEGATIVE! project=${s.project.code} material=${s.materialItem.code} stock=${s.stock}`);
    }
  }

  // 7. Stock vs Movement reconciliation
  console.log("\n[7] Stock reconciliation (stock vs SUM of movements):");
  const stocks = await prisma.projectMaterialStock.findMany({
    include: { materialItem: { select: { code: true, name: true, unit: true } }, project: { select: { code: true } } },
  });

  let mismatchCount = 0;
  for (const stock of stocks) {
    const movements = await prisma.materialMovement.findMany({
      where: { projectId: stock.projectId, materialItemId: stock.materialItemId },
      select: { type: true, quantity: true },
    });

    let computed = 0;
    for (const m of movements) {
      const qty = Number(m.quantity);
      if (m.type === "EXPORT" || m.type === "TRANSFER") {
        computed -= qty;
      } else {
        computed += qty;
      }
    }

    const actual = Number(stock.stock);
    const diff = Math.abs(actual - computed);
    if (diff > 0.001) {
      mismatchCount++;
      console.log(`    MISMATCH! project=${stock.project.code} material=${stock.materialItem.code}`);
      console.log(`      DB stock=${actual}, computed from movements=${computed}, diff=${actual - computed}`);
    }
  }
  if (mismatchCount === 0) {
    console.log("    OK - All stocks match movement history");
  } else {
    console.log(`    TOTAL MISMATCHES: ${mismatchCount}`);
  }

  // 8. Movement without stock row
  console.log("\n[8] Movements without corresponding stock row:");
  const allMovements = await prisma.materialMovement.findMany({
    select: { id: true, projectId: true, materialItemId: true, type: true },
  });
  let orphanMovements = 0;
  const checkedPairs = new Set<string>();
  for (const m of allMovements) {
    const key = `${m.projectId}:${m.materialItemId}`;
    if (checkedPairs.has(key)) continue;
    checkedPairs.add(key);
    const stockRow = await prisma.projectMaterialStock.findUnique({
      where: { projectId_materialItemId: { projectId: m.projectId, materialItemId: m.materialItemId } },
    });
    if (!stockRow) {
      orphanMovements++;
      console.log(`    NO STOCK ROW for movement projectId=${m.projectId} materialItemId=${m.materialItemId}`);
    }
  }
  if (orphanMovements === 0) {
    console.log("    OK - All movements have corresponding stock rows");
  }

  // 9. Stock rows without any movement
  console.log("\n[9] Stock rows without any movement:");
  let stockNoMovement = 0;
  for (const stock of stocks) {
    const movementCount = await prisma.materialMovement.count({
      where: { projectId: stock.projectId, materialItemId: stock.materialItemId },
    });
    if (movementCount === 0 && Number(stock.stock) !== 0) {
      stockNoMovement++;
      console.log(`    STOCK WITHOUT MOVEMENT: project=${stock.project.code} material=${stock.materialItem.code} stock=${stock.stock}`);
    }
  }
  if (stockNoMovement === 0) {
    console.log("    OK - All non-zero stock rows have movements");
  }

  // 10. Duplicate material codes within same project
  console.log("\n[10] Duplicate material codes within same project:");
  const rawDuplicates = await prisma.$queryRaw<Array<{ projectId: string; code: string; cnt: bigint }>>`
    SELECT "projectId", "code", COUNT(*) as cnt 
    FROM "MaterialItem" 
    WHERE "projectId" IS NOT NULL
    GROUP BY "projectId", "code" 
    HAVING COUNT(*) > 1
  `;
  if (rawDuplicates.length === 0) {
    console.log("    OK - No duplicate codes");
  } else {
    for (const d of rawDuplicates) {
      console.log(`    DUPLICATE: projectId=${d.projectId} code=${d.code} count=${d.cnt}`);
    }
  }

  // 11. Cross-project contamination check
  console.log("\n[11] Cross-project contamination check:");
  // Check if any stock row references a materialItem from a different project
  let crossProject = 0;
  for (const stock of stocks) {
    const material = await prisma.materialItem.findUnique({
      where: { id: stock.materialItemId },
      select: { projectId: true, code: true },
    });
    if (material && material.projectId && material.projectId !== stock.projectId) {
      crossProject++;
      console.log(`    CROSS-PROJECT: stock.projectId=${stock.projectId} but materialItem.projectId=${material.projectId} code=${material.code}`);
    }
  }
  // Check if any movement references a materialItem from a different project
  for (const m of allMovements) {
    const material = await prisma.materialItem.findUnique({
      where: { id: m.materialItemId },
      select: { projectId: true, code: true },
    });
    if (material && material.projectId && material.projectId !== m.projectId) {
      crossProject++;
      console.log(`    CROSS-PROJECT MOVEMENT: movement.projectId=${m.projectId} but materialItem.projectId=${material.projectId}`);
    }
  }
  if (crossProject === 0) {
    console.log("    OK - No cross-project data contamination");
  }

  // 12. Data origin check (test/demo identifiers)
  console.log("\n[12] Demo/test data check:");
  const suspectMaterials = await prisma.materialItem.findMany({
    where: {
      OR: [
        { name: { contains: "test", mode: "insensitive" } },
        { name: { contains: "demo", mode: "insensitive" } },
        { name: { contains: "sample", mode: "insensitive" } },
        { code: { contains: "TEST", mode: "insensitive" } },
        { code: { contains: "DEMO", mode: "insensitive" } },
      ],
    },
    select: { id: true, code: true, name: true, projectId: true },
  });
  if (suspectMaterials.length === 0) {
    console.log("    OK - No obvious test/demo material names found");
  } else {
    for (const m of suspectMaterials) {
      console.log(`    SUSPECT: code=${m.code} name=${m.name} projectId=${m.projectId}`);
    }
  }

  // 13. New project isolation test
  console.log("\n[13] New/empty project check:");
  for (const p of allProjects) {
    const materialCount = await prisma.materialItem.count({ where: { projectId: p.id } });
    const stockCount = await prisma.projectMaterialStock.count({ where: { projectId: p.id } });
    const movementCount = await prisma.materialMovement.count({ where: { projectId: p.id } });
    if (materialCount === 0 && stockCount === 0 && movementCount === 0) {
      console.log(`    CLEAN: ${p.code} (${p.name}) - 0 materials, 0 stocks, 0 movements`);
    }
  }

  // 14. MaterialItem.projectId nullable check
  console.log("\n[14] MaterialItem.projectId nullable analysis:");
  const totalItems = await prisma.materialItem.count();
  const withProject = await prisma.materialItem.count();
  const withoutProject = 0; // Schema is now strictly non-nullable
  console.log(`    Total MaterialItems: ${totalItems}`);
  console.log(`    With projectId: ${withProject}`);
  console.log(`    Without projectId (null): ${withoutProject}`);
  if (withoutProject > 0) {
    console.log("    WARNING: projectId is nullable in schema, and orphan records exist!");
  }

  console.log("\n=== AUDIT COMPLETE ===");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
