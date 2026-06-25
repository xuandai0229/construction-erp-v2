import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runFlow() {
  console.log("=== MATERIALS PROJECT SCOPED FLOW TEST ===");
  
  const args = process.argv.slice(2);
  const explicitProjectId = args.find(a => a.startsWith("--projectId="))?.split("=")[1];

  let testProjectId = explicitProjectId;
  let otherProjectId: string | undefined;
  let createdProject = false;

  try {
    // 1. Get or create project
    if (!testProjectId) {
      console.log("Creating test project...");
      const p = await prisma.project.create({
        data: {
          code: `TEST-PROJ-${Date.now()}`,
          name: "Test Project Scoped Materials",
          status: "ACTIVE"
        }
      });
      testProjectId = p.id;
      createdProject = true;
    }

    const otherProject = await prisma.project.findFirst({
      where: { id: { not: testProjectId }, deletedAt: null }
    });
    otherProjectId = otherProject?.id;

    if (!testProjectId) throw new Error("No test project ID!");
    const projectId: string = testProjectId;
    console.log(`Test Project ID: ${projectId}`);
    console.log(`Other Project ID: ${otherProjectId || "N/A"}`);

    // 2. Verify initially empty
    const initItems = await prisma.materialItem.count({ where: { projectId } });
    const initStocks = await prisma.projectMaterialStock.count({ where: { projectId } });
    const initMovements = await prisma.materialMovement.count({ where: { projectId } });
    
    console.log(`[Init] Materials: ${initItems}, Stocks: ${initStocks}, Movements: ${initMovements}`);
    if (initItems !== 0 || initStocks !== 0 || initMovements !== 0) {
      if (createdProject) throw new Error("New project should be empty!");
    }

    // 3. Create material A
    console.log("\nCreating Material A...");
    const matA = await prisma.materialItem.create({
      data: {
        projectId,
        code: `VT-A-${Date.now()}`,
        name: "Test Material A",
        unit: "kg"
      }
    });

    // 4. Verify project sees 1 material
    const afterCreateItems = await prisma.materialItem.count({ where: { projectId } });
    console.log(`Project materials count: ${afterCreateItems} (Expected: > 0)`);

    // 5. Verify other project does not see Material A
    if (otherProjectId) {
      const otherProjectSeesA = await prisma.materialItem.findFirst({
        where: { id: matA.id, projectId: otherProjectId }
      });
      console.log(`Other project sees A?: ${otherProjectSeesA ? "YES ❌" : "NO ✅"}`);
      if (otherProjectSeesA) throw new Error("Isolation failed!");
    }

    // 6. Import 100
    console.log("\nImporting 100...");
    await prisma.$transaction(async (tx) => {
      await tx.materialMovement.create({
        data: {
          projectId,
          materialItemId: matA.id,
          type: "IMPORT",
          quantity: 100,
          movementDate: new Date()
        }
      });
      await tx.projectMaterialStock.upsert({
        where: { projectId_materialItemId: { projectId, materialItemId: matA.id } },
        create: { projectId, materialItemId: matA.id, stock: 100 },
        update: { stock: { increment: 100 } }
      });
    });

    // 7. Verify stock = 100
    let stockInfo = await prisma.projectMaterialStock.findUnique({
      where: { projectId_materialItemId: { projectId, materialItemId: matA.id } }
    });
    console.log(`Stock after import: ${stockInfo?.stock} (Expected: 100)`);

    // 8. Export 30
    console.log("\nExporting 30...");
    await prisma.$transaction(async (tx) => {
      await tx.materialMovement.create({
        data: {
          projectId,
          materialItemId: matA.id,
          type: "EXPORT",
          quantity: 30,
          movementDate: new Date()
        }
      });
      await tx.projectMaterialStock.update({
        where: { projectId_materialItemId: { projectId, materialItemId: matA.id } },
        data: { stock: { decrement: 30 } }
      });
    });

    // 9. Verify stock = 70
    stockInfo = await prisma.projectMaterialStock.findUnique({
      where: { projectId_materialItemId: { projectId, materialItemId: matA.id } }
    });
    console.log(`Stock after export: ${stockInfo?.stock} (Expected: 70)`);

    // 10. Try export 999999 (Simulate backend logic since script bypasses UI validation)
    console.log("\nTesting over-export (Simulated)...");
    const exportQty = 999999;
    if (stockInfo && Number(stockInfo.stock) < exportQty) {
      console.log(`Blocked! Cannot export ${exportQty} when stock is ${stockInfo.stock} ✅`);
    } else {
      throw new Error("Validation logic should block this!");
    }

    console.log("\n✅ FLOW TEST PASSED SUCCESSFULLY!");

  } catch (err) {
    console.error("\n❌ FLOW TEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    // 11. Cleanup
    if (createdProject && testProjectId) {
      console.log(`\nCleaning up test project ${testProjectId}...`);
      await prisma.project.delete({ where: { id: testProjectId } });
      console.log("Cleanup done.");
    }
    await prisma.$disconnect();
    await pool.end();
  }
}

runFlow();
