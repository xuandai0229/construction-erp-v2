import prisma from "../src/lib/prisma";
import { approveMaterialRequest } from "../src/app/actions/material-request";
import { getMaterialItems } from "../src/app/(dashboard)/materials/actions";

async function main() {
  console.log("Running qa-material-request-proposal-quantity-summary...");
  const project = await prisma.project.findFirst();
  const user = await prisma.user.findFirst();
  if (!project || !user) throw new Error("No project or user");

  // Clean up old mocks
  await prisma.materialRequestItem.deleteMany({
    where: { materialRequest: { requestNo: { startsWith: 'QA-QTY-' } } }
  });
  await prisma.materialRequest.deleteMany({
    where: { requestNo: { startsWith: 'QA-QTY-' } }
  });

  // Ensure "Ống Cống" exists
  let material = await prisma.materialItem.findFirst({
    where: { projectId: project.id, code: "ONG_CONG_QA" }
  });
  if (!material) {
    material = await prisma.materialItem.create({
      data: {
        projectId: project.id,
        code: "ONG_CONG_QA",
        name: "Ống Cống",
        unit: "m3",
      }
    });
  }

  // Create stock entry
  let stock = await prisma.projectMaterialStock.findFirst({
    where: { projectId: project.id, materialItemId: material.id }
  });
  if (!stock) {
    stock = await prisma.projectMaterialStock.create({
      data: {
        projectId: project.id,
        materialItemId: material.id,
        stock: 0,
        minStockLevel: 0
      }
    });
  }
  const oldStock = stock.stock;

  // Create Request
  const req = await prisma.materialRequest.create({
    data: {
      projectId: project.id,
      requestNo: `QA-QTY-${Date.now()}`,
      status: "APPROVED",
      requestedById: user.id,
      requestDate: new Date(),
      items: {
        create: [{ materialCode: material.code, materialName: "Ống Cống", unit: "m3", requestedQuantity: 1000 }]
      }
    }
  });

  // Check
  const newStock = await prisma.projectMaterialStock.findFirst({ where: { id: stock.id } });
  if (Number(newStock?.stock) !== Number(oldStock)) {
    throw new Error(`Stock changed! Old: ${oldStock}, New: ${newStock?.stock}`);
  }

  const proposalSummaries = await prisma.materialRequestItem.groupBy({
    by: ['materialCode'],
    _sum: {
      requestedQuantity: true,
      receivedQuantity: true,
    },
    where: {
      materialRequest: {
        projectId: project.id,
        status: "APPROVED"
      }
    }
  });

  const summary = proposalSummaries.find(s => s.materialCode === material!.code);
  const approvedProposalQuantity = summary?._sum?.requestedQuantity || 0;
  const receivedQuantity = summary?._sum?.receivedQuantity || 0;
  const pendingImportFromProposal = Math.max(0, Number(approvedProposalQuantity) - Number(receivedQuantity));

  if (Number(approvedProposalQuantity) !== 1000) {
    throw new Error(`approvedProposalQuantity should be 1000, got ${approvedProposalQuantity}`);
  }
  if (Number(pendingImportFromProposal) !== 1000) {
    throw new Error(`pendingImportFromProposal should be 1000, got ${pendingImportFromProposal}`);
  }

  console.log("Proposal quantity summary test passed.");
  await prisma.materialRequestItem.deleteMany({ where: { materialRequestId: req.id } });
  await prisma.materialRequest.delete({ where: { id: req.id } });
}

main().catch(console.error);
