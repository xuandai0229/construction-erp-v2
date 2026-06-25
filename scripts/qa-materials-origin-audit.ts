import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runAudit() {
  console.log("=== MATERIALS ORIGIN AUDIT ===");
  const LEGACY_CODES = ["THEP-D10", "THEP-D16", "CAT-V", "DA-1X2", "XM-PCB40"];

  try {
    const materials = await prisma.materialItem.findMany({
      where: { code: { in: LEGACY_CODES } },
      include: {
        projectStocks: { include: { project: true } },
        movements: { include: { project: true } }
      }
    });

    if (materials.length === 0) {
      console.log("No legacy demo materials found.");
      return;
    }

    let allSafe = true;

    for (const mat of materials) {
      console.log(`\n--- Material: ${mat.code} ---`);
      console.log(`ID: ${mat.id}`);
      console.log(`Name: ${mat.name}`);
      console.log(`Created At: ${mat.createdAt}`);
      console.log(`Updated At: ${mat.updatedAt}`);
      console.log(`Has DEMO- prefix?: ${mat.code.startsWith("DEMO-") ? "Yes" : "No"}`);
      
      const stockProjects = Array.from(new Set(mat.projectStocks.map(s => s.project.code)));
      const movementProjects = Array.from(new Set(mat.movements.map(m => m.project.code)));

      console.log(`Has stocks in projects: ${stockProjects.length > 0 ? stockProjects.join(", ") : "None"}`);
      console.log(`Has movements in projects: ${movementProjects.length > 0 ? movementProjects.join(", ") : "None"}`);
      
      const isUsed = stockProjects.length > 0 || movementProjects.length > 0;
      console.log(`Is actively used?: ${isUsed ? "Yes" : "No"}`);
      
      const isSafeToCleanup = !isUsed;
      console.log(`Safe to cleanup?: ${isSafeToCleanup ? "Yes" : "No"}`);

      if (!isSafeToCleanup) allSafe = false;
    }

    console.log(`\n=== SUMMARY ===`);
    if (allSafe) {
      console.log("All 5 legacy codes are safe to clean up (no real stocks/movements found).");
      console.log("To clean them up, you can run the cleanup script.");
    } else {
      console.log("WARNING: Some legacy codes are actively used in projects. Cannot blindly cleanup.");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runAudit();
