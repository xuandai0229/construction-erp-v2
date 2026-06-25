import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runIsolationAudit() {
  const args = process.argv.slice(2);
  const projectIdArg = args.find(a => a.startsWith("--projectId="));
  const projectId = projectIdArg ? projectIdArg.split("=")[1] : null;

  if (!projectId) {
    console.error("❌ MUST provide --projectId=<id> to run isolation audit.");
    process.exit(1);
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, code: true, name: true }
    });

    if (!project) {
      console.error(`Project ${projectId} not found.`);
      return;
    }

    const totalGlobalMaterials = await prisma.materialItem.count();
    const stocks = await prisma.projectMaterialStock.findMany({
      where: { projectId },
      include: { materialItem: true }
    });
    
    const activeStocks = stocks.filter(s => Number(s.stock) > 0);
    const negativeStocks = stocks.filter(s => Number(s.stock) < 0);

    const movements = await prisma.materialMovement.findMany({
      where: { projectId },
      orderBy: { movementDate: "desc" }
    });

    const now = new Date();
    const thisMonthMovements = movements.filter(m => {
      const d = new Date(m.movementDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const allMovementsInDb = await prisma.materialMovement.count();
    const movementsWithoutProject = await prisma.materialMovement.count({
      where: { projectId: { in: ["", null as any] } } // Technically schema requires projectId, but good to check
    }).catch(() => 0); // Catch if schema doesn't allow null

    // Check old demo data without prefix DEMO-
    const OLD_DEMO_CODES = ["THEP-D10", "THEP-D16", "CAT-V", "DA-1X2", "XM-PCB40"];
    const oldDemoData = await prisma.materialItem.findMany({
      where: { code: { in: OLD_DEMO_CODES } }
    });

    console.log(`\nPROJECT: ${project.name} (${project.code})`);
    console.log(`Global MaterialItem count: ${totalGlobalMaterials}`);
    console.log(`ProjectMaterialStock count: ${stocks.length}`);
    console.log(`ProjectMaterialStock stock > 0: ${activeStocks.length}`);
    console.log(`MaterialMovement count: ${movements.length}`);
    console.log(`MaterialMovement this month: ${thisMonthMovements.length}`);
    
    if (negativeStocks.length > 0) {
      console.log(`⚠️ WARNING: Found ${negativeStocks.length} stocks with negative values.`);
    }

    if (movementsWithoutProject > 0) {
      console.log(`⚠️ WARNING: Found ${movementsWithoutProject} movements without a projectId in DB!`);
    }

    if (oldDemoData.length > 0) {
      console.log(`\n⚠️ WARNING: Found ${oldDemoData.length} old demo materials without DEMO- prefix!`);
      console.log(`Please run cleanup logic for these manually or ignore if they are real data.`);
    }

    if (stocks.length === 0 && movements.length === 0) {
      console.log(`\nThis project has no material stock/movement yet. UI must not present global dictionary as project data.`);
    } else {
      console.log(`\n--- Project Stocks ---`);
      console.table(stocks.map(s => ({
        Material: s.materialItem.code,
        Stock: Number(s.stock),
        MinStock: Number(s.minStockLevel)
      })));

      console.log(`\n--- Project Movements (Recent 10) ---`);
      console.table(movements.slice(0, 10).map(m => ({
        Date: m.movementDate.toISOString().split("T")[0],
        Type: m.type,
        Quantity: Number(m.quantity)
      })));
    }

  } catch (error) {
    console.error("Audit failed:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runIsolationAudit();
