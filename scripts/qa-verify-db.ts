import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:dev_rotated_secret_pass_2026_x7!@127.0.0.1:5432/construction_erp_v2_dev?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== DB POST-MIGRATION VERIFICATION ===");
  console.log("MaterialProposal count:", await prisma.materialProposal.count());
  console.log("MaterialProposalItem count:", await prisma.materialProposalItem.count());
  console.log("MaterialProposalApproval count:", await prisma.materialProposalApproval.count());
  console.log("MaterialItem count:", await prisma.materialItem.count());
  console.log("ProjectMaterialStock count:", await prisma.projectMaterialStock.count());
  console.log("MaterialMovement count:", await prisma.materialMovement.count());
  console.log("Project count:", await prisma.project.count());
  console.log("ProjectMember count:", await prisma.projectMember.count());
  console.log("ApprovalRequest count:", await prisma.approvalRequest.count());
  console.log("SiteReport count:", await prisma.siteReport.count());
  console.log("Document count:", await prisma.document.count());

  const indexCheck = await prisma.$queryRaw`
    SELECT indexname, indexdef FROM pg_indexes 
    WHERE tablename = 'MaterialProposalApproval' AND indexname = 'MaterialProposalApproval_one_pending_key';
  `;
  console.log("Partial unique index check:", JSON.stringify(indexCheck, null, 2));

  console.log("=== VERIFICATION COMPLETE ===");
}

main().catch((err) => {
  console.error("DB Verification failed:", err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
