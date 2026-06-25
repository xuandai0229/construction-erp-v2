import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { applyMaterialMovement } from "../src/lib/materials/ledger";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isCleanup = args.includes("--cleanup");
const projectIdArg = args.find(a => a.startsWith("--projectId="));
const projectId = projectIdArg ? projectIdArg.split("=")[1] : null;

if (!projectId) {
  console.error("❌ MUST provide --projectId=<id> to run or cleanup demo data.");
  process.exit(1);
}

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_MATERIALS = [
  { code: "DEMO-THEP-D10", name: "Thép D10 (Demo)", unit: "kg", group: "Thép", description: "Thép cuộn D10 Hòa Phát" },
  { code: "DEMO-THEP-D16", name: "Thép D16 (Demo)", unit: "Cây", group: "Thép", description: "Thép vằn D16" },
  { code: "DEMO-XM-PCB40", name: "Xi măng PCB40 (Demo)", unit: "Bao", group: "Xi măng", description: "Xi măng Bỉm Sơn PCB40" },
  { code: "DEMO-CAT-V", name: "Cát vàng (Demo)", unit: "m3", group: "Vật liệu rời", description: "Cát vàng đổ bê tông" },
  { code: "DEMO-DA-1X2", name: "Đá 1x2 (Demo)", unit: "m3", group: "Vật liệu rời", description: "Đá 1x2 trộn bê tông" },
];

async function runDemoSeed() {
  console.log("=== SEEDING MATERIALS DEMO DATA ===");

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId! },
      select: { id: true, code: true, name: true }
    });

    if (!project) {
      throw new Error(`No project found with id ${projectId}`);
    }
    console.log(`[1] Selected Project: ${project.name} (${project.code})`);

    // Create materials
    const createdMaterials: { id: string; code: string }[] = [];
    for (const mat of DEMO_MATERIALS) {
      const created = await prisma.materialItem.upsert({
        where: { projectId_code: { projectId: project.id, code: mat.code } },
        update: mat,
        create: { ...mat, projectId: project.id },
      });
      createdMaterials.push(created);
    }
    console.log(`[2] Seeded 5 materials.`);

    // Helper to get mat by code
    const getMatId = (code: string) => createdMaterials.find(m => m.code === code)!.id;

    // Seed Import Transactions to setup stocks
    console.log(`[3] Seeding Initial Imports...`);
    await prisma.$transaction(async (tx) => {
      // 1. Đủ hàng (Healthy): Cát vàng (Tồn 100, min 20)
      await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: getMatId("CAT-V"),
        type: "IMPORT",
        quantity: 100,
        movementDate: new Date(Date.now() - 5 * 86400000), // 5 days ago
        notes: "Nhập cát vàng đầu kỳ",
        minStockLevel: 20
      });

      // 2. Đủ hàng (Healthy): Thép D16 (Tồn 500, min 100)
      await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: getMatId("THEP-D16"),
        type: "IMPORT",
        quantity: 500,
        movementDate: new Date(Date.now() - 4 * 86400000),
        notes: "Nhập lô thép D16",
        minStockLevel: 100
      });

      // 3. Sắp hết (Low): Xi măng (Nhập 200, Xuất 180 -> Tồn 20, min 50)
      await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: getMatId("XM-PCB40"),
        type: "IMPORT",
        quantity: 200,
        movementDate: new Date(Date.now() - 3 * 86400000),
        notes: "Nhập lô xi măng",
        minStockLevel: 50
      });

      await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: getMatId("XM-PCB40"),
        type: "EXPORT",
        quantity: 180,
        movementDate: new Date(Date.now() - 2 * 86400000),
        notes: "Xuất đổ bê tông sàn tầng 1"
      });

      // 4. Hết hàng (Out): Thép D10 (Nhập 1000, Xuất 1000 -> Tồn 0, min 200)
      await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: getMatId("THEP-D10"),
        type: "IMPORT",
        quantity: 1000,
        movementDate: new Date(Date.now() - 10 * 86400000),
        notes: "Nhập lô thép cuộn",
        minStockLevel: 200
      });

      await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: getMatId("THEP-D10"),
        type: "EXPORT",
        quantity: 1000,
        movementDate: new Date(Date.now() - 1 * 86400000),
        notes: "Xuất dùng hết làm thép đai"
      });

      // 5. Đá 1x2: Chỉ setup tồn kho ban đầu (chưa phát sinh nhập xuất thật mà nhập trực tiếp lúc setup)
      await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: getMatId("DA-1X2"),
        type: "IMPORT",
        quantity: 50,
        movementDate: new Date(),
        notes: "Nhập mới đá 1x2",
        minStockLevel: 10
      });
    });

    console.log(`[4] Successfully seeded stocks and transactions.`);
    console.log("=== DEMO DATA READY ===");
  } catch (error) {
    console.error("Failed to seed demo data:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Cleanup function if user runs with --cleanup
async function runCleanup() {
  console.log("=== CLEANING UP DEMO DATA ===");
  if (isDryRun) {
    console.log("[DRY RUN] Would delete demo materials and related data.");
    return;
  }
  try {
    const materials = await prisma.materialItem.findMany({ where: { code: { startsWith: "DEMO-" } } });
    const matIds = materials.map(m => m.id);

    if (matIds.length > 0) {
      await prisma.materialMovement.deleteMany({ where: { materialItemId: { in: matIds }, projectId: projectId! } });
      await prisma.projectMaterialStock.deleteMany({ where: { materialItemId: { in: matIds }, projectId: projectId! } });
      // Only delete materialItem if no other projects have stocks for it, but for demo, just delete if we created it.
      await prisma.materialItem.deleteMany({ where: { code: { startsWith: "DEMO-" } } });
      console.log(`Deleted ${matIds.length} demo materials and their associated stocks/movements for project ${projectId}.`);
    } else {
      console.log("No demo materials found to clean up.");
    }
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (isCleanup) {
  runCleanup();
} else {
  if (isDryRun) {
    console.log("[DRY RUN] Would seed demo data for project:", projectId);
  } else {
    runDemoSeed();
  }
}
