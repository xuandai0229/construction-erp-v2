import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runAudit() {
  console.log("=== MATERIALS DB SYNC AUDIT ===");

  const args = process.argv.slice(2);
  const isRepair = args.includes("--repair");
  const projectIdArg = args.find(a => a.startsWith("--projectId="));
  const targetProjectId = projectIdArg ? projectIdArg.split("=")[1] : null;

  try {
    const projects = await prisma.project.findMany({
      where: targetProjectId ? { id: targetProjectId } : { deletedAt: null },
      select: { id: true, code: true }
    });

    if (projects.length === 0) {
      console.log("No projects found to audit.");
      return;
    }

    let mismatchCount = 0;
    let totalStockRows = 0;
    let totalMovementRows = 0;
    let negativeStocksCount = 0;
    let movementsWithoutStockCount = 0;
    const tableData: any[] = [];

    for (const project of projects) {
      const stocks = await prisma.projectMaterialStock.findMany({
        where: { projectId: project.id },
        include: { materialItem: true }
      });
      totalStockRows += stocks.length;

      const movements = await prisma.materialMovement.findMany({
        where: { projectId: project.id },
        orderBy: { movementDate: "asc" }
      });
      totalMovementRows += movements.length;

      // Map to group movements by material
      const movementsByMaterial = new Map<string, typeof movements>();
      for (const m of movements) {
        if (!movementsByMaterial.has(m.materialItemId)) {
          movementsByMaterial.set(m.materialItemId, []);
        }
        movementsByMaterial.get(m.materialItemId)!.push(m);
      }

      // Check each stock
      for (const stock of stocks) {
        const matsMovements = movementsByMaterial.get(stock.materialItemId) || [];
        
        let calculatedStock = 0;
        for (const m of matsMovements) {
          const qty = Number(m.quantity);
          if (m.type === "IMPORT" || m.type === "RETURN") {
            calculatedStock += qty;
          } else if (m.type === "EXPORT" || m.type === "TRANSFER") {
            calculatedStock -= qty;
          } else if (m.type === "ADJUSTMENT") {
            // Depending on how adjustment is stored (negative or positive), assume quantity is the exact adjustment change
            // But if it's absolute, logic differs. Assuming relative for now.
            calculatedStock += qty; 
          }
        }

        const actualStock = Number(stock.stock);
        if (actualStock < 0) negativeStocksCount++;

        const diff = actualStock - calculatedStock;
        const isMismatch = Math.abs(diff) > 0.0001;

        if (isMismatch) mismatchCount++;

        tableData.push({
          Project: project.code,
          "Material Code": stock.materialItem.code,
          "Name": stock.materialItem.name.substring(0, 20),
          "DB Stock": actualStock.toFixed(2),
          "Calculated": calculatedStock.toFixed(2),
          "Diff": diff.toFixed(2),
          "Status": isMismatch ? "❌ MISMATCH" : "✅ OK"
        });

        if (isMismatch && isRepair) {
          console.log(`[REPAIR] Fixing ${stock.materialItem.code} in ${project.code}. Previous: ${actualStock}, New: ${calculatedStock}`);
          await prisma.projectMaterialStock.update({
            where: { id: stock.id },
            data: { stock: calculatedStock }
          });
        }
      }

      // Check if there are movements without a stock row
      for (const [materialId, mList] of Array.from(movementsByMaterial.entries())) {
        const hasStock = stocks.some(s => s.materialItemId === materialId);
        if (!hasStock && mList.length > 0) {
          const material = await prisma.materialItem.findUnique({ where: { id: materialId }});
          let calculatedStock = 0;
          for (const m of mList) {
            const qty = Number(m.quantity);
            if (m.type === "IMPORT" || m.type === "RETURN") calculatedStock += qty;
            else if (m.type === "EXPORT" || m.type === "TRANSFER") calculatedStock -= qty;
            else if (m.type === "ADJUSTMENT") calculatedStock += qty;
          }
          
          mismatchCount++;
          movementsWithoutStockCount++;
          tableData.push({
            Project: project.code,
            "Material Code": material?.code || "UNKNOWN",
            "Name": (material?.name || "MISSING").substring(0, 20),
            "DB Stock": "MISSING",
            "Calculated": calculatedStock.toFixed(2),
            "Diff": "N/A",
            "Status": "❌ NO ROW"
          });

          if (isRepair) {
            console.log(`[REPAIR] Creating missing stock row for ${material?.code} in ${project.code}. Value: ${calculatedStock}`);
            await prisma.projectMaterialStock.create({
              data: {
                projectId: project.id,
                materialItemId: materialId,
                stock: calculatedStock,
                minStockLevel: 0
              }
            });
          }
        }
      }
    }

    console.table(tableData);

    console.log(`\n=== AUDIT SUMMARY ===`);
    console.log(`Projects audited: ${projects.length}`);
    console.log(`Total stock rows: ${totalStockRows}`);
    console.log(`Total movement rows: ${totalMovementRows}`);
    console.log(`Negative stocks: ${negativeStocksCount}`);
    console.log(`Movements without stock row: ${movementsWithoutStockCount}`);
    console.log(`Total Mismatches: ${mismatchCount}`);

    if (mismatchCount > 0 && !isRepair) {
      console.log(`\nRun with --repair --projectId=<id> to automatically fix these mismatches.`);
      process.exitCode = 1;
    }

  } catch (error) {
    console.error("Audit failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runAudit();
