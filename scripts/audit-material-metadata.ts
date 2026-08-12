import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const [materials, stockCount, movementCount, proposalCount, proposalItemCount] = await Promise.all([
    prisma.materialItem.findMany({
      select: {
        id: true,
        projectId: true,
        code: true,
        name: true,
        unit: true,
        group: true,
        manufacturer: true,
        origin: true,
      },
      orderBy: [{ projectId: "asc" }, { code: "asc" }],
    }),
    prisma.projectMaterialStock.count(),
    prisma.materialMovement.count(),
    prisma.materialProposal.count(),
    prisma.materialProposalItem.count(),
  ]);

  const legacyGroupDistribution = Array.from(
    materials.reduce((counts, material) => {
      const key = material.group ?? "__NULL__";
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()).entries(),
  ).map(([value, count]) => ({ value, count }));

  console.log(JSON.stringify({
    audit: "material-metadata-post-additive-migration",
    materialItemCount: materials.length,
    stockCount,
    movementCount,
    proposalCount,
    proposalItemCount,
    legacyGroupDistribution,
    materials: materials.map((material) => ({
      ...material,
      group: material.group,
      manufacturer: material.manufacturer,
      origin: material.origin,
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
