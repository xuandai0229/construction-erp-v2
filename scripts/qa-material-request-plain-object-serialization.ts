import prisma from "../src/lib/prisma";
import { getApprovedProposalSummaryByMaterial } from "../src/app/actions/material-request";

async function main() {
  console.log("Running qa-material-request-plain-object-serialization...");
  const project = await prisma.project.findFirst();
  if (!project) throw new Error("No project found");

  const materials = await prisma.materialItem.findMany({ where: { projectId: project.id }, take: 1 });
  if (materials.length === 0) {
    console.log("No materials, skipping object check.");
    return;
  }

  const result = await getApprovedProposalSummaryByMaterial(project.id, materials[0].id);
  
  if (result) {
    const jsonStr = JSON.stringify(result);
    const parsed = JSON.parse(jsonStr);
    
    // Check if result contains Date or Decimal objects
    if (result.latestApprovedRequest && result.latestApprovedRequest.createdAt instanceof Date) {
      throw new Error("Found Date object in summary");
    }
    if (result.relatedRequests.some((r: any) => typeof r.requestedQuantity === "object")) {
      throw new Error("Found Decimal object in summary");
    }
  }

  console.log("Plain object serialization test passed.");
}

main().catch(console.error);
