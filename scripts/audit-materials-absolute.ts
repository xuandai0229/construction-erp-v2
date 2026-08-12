import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const n = (value: { toString(): string } | number) => Number(value);
const stockStatus = (stock: number, minimum: number) => stock < 0 ? "negative" : stock === 0 ? "out" : minimum > 0 && stock <= minimum ? "low" : "healthy";
const movementSign = (type: string) => type === "EXPORT" || type === "TRANSFER" ? -1 : 1;

async function main() {
  const [projects, items, stocks, movements, proposals] = await Promise.all([
    prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, status: true, deletedAt: true } }),
    prisma.materialItem.findMany({ include: { project: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.projectMaterialStock.findMany({ include: { project: { select: { id: true, name: true } }, materialItem: true }, orderBy: { createdAt: "asc" } }),
    prisma.materialMovement.findMany({ include: { project: { select: { id: true, name: true } }, materialItem: { include: { project: { select: { id: true, name: true } } } } }, orderBy: { createdAt: "asc" } }),
    prisma.materialProposal.findMany({ include: { project: { select: { id: true, name: true, deletedAt: true } }, requestedBy: { select: { id: true, name: true, role: true } }, items: { include: { materialItem: { select: { id: true, projectId: true, name: true, unit: true } } } }, approvals: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const projectMatrix = projects.map((project) => {
    const projectItems = items.filter((item) => item.projectId === project.id);
    const projectStocks = stocks.filter((stock) => stock.projectId === project.id);
    const projectMovements = movements.filter((movement) => movement.projectId === project.id);
    const projectProposals = proposals.filter((proposal) => proposal.projectId === project.id);
    return { projectId: project.id, projectCode: project.code, projectName: project.name, status: project.status, materialItems: projectItems.length, stockRows: projectStocks.length, stockQuantity: projectStocks.reduce((sum, stock) => sum + n(stock.stock), 0), movements: projectMovements.length, proposals: projectProposals.length, proposalItems: projectProposals.reduce((sum, proposal) => sum + proposal.items.length, 0), hasAnyMaterialData: Boolean(projectItems.length || projectStocks.length || projectMovements.length || projectProposals.length) };
  });

  const stockReconciliation = stocks.map((stock) => {
    const related = movements.filter((movement) => movement.projectId === stock.projectId && movement.materialItemId === stock.materialItemId);
    const importTotal = related.filter((movement) => movement.type === "IMPORT").reduce((sum, movement) => sum + n(movement.quantity), 0);
    const returnTotal = related.filter((movement) => movement.type === "RETURN").reduce((sum, movement) => sum + n(movement.quantity), 0);
    const exportTotal = related.filter((movement) => movement.type === "EXPORT").reduce((sum, movement) => sum + n(movement.quantity), 0);
    const transferTotal = related.filter((movement) => movement.type === "TRANSFER").reduce((sum, movement) => sum + n(movement.quantity), 0);
    const recalculatedFromMovements = importTotal + returnTotal - exportTotal - transferTotal;
    const storedStock = n(stock.stock);
    return { stockId: stock.id, projectId: stock.projectId, projectName: stock.project.name, materialItemId: stock.materialItemId, materialCode: stock.materialItem.code, materialName: stock.materialItem.name, unit: stock.materialItem.unit, storedStock, minStockLevel: n(stock.minStockLevel), totalImport: importTotal, totalReturn: returnTotal, totalExport: exportTotal, totalTransfer: transferTotal, recalculatedFromMovements, differenceWithoutOpeningBalance: storedStock - recalculatedFromMovements, impliedOpeningBalance: storedStock - recalculatedFromMovements, status: stockStatus(storedStock, n(stock.minStockLevel)), movementIds: related.map((movement) => movement.id) };
  });

  const relationMismatches = movements.filter((movement) => movement.projectId !== movement.materialItem.projectId).map((movement) => ({ movementId: movement.id, movementProjectId: movement.projectId, materialProjectId: movement.materialItem.projectId, materialItemId: movement.materialItemId }));
  const stockMismatches = stocks.filter((stock) => stock.projectId !== stock.materialItem.projectId).map((stock) => ({ stockId: stock.id, stockProjectId: stock.projectId, materialProjectId: stock.materialItem.projectId, materialItemId: stock.materialItemId }));
  const proposalCrossProject = proposals.flatMap((proposal) => proposal.items.filter((item) => item.materialItem && item.materialItem.projectId !== proposal.projectId).map((item) => ({ proposalId: proposal.id, proposalProjectId: proposal.projectId, materialItemId: item.materialItemId, materialProjectId: item.materialItem!.projectId })));

  const duplicateStockRows = Object.entries(stocks.reduce<Record<string, string[]>>((acc, stock) => { const key = `${stock.projectId}:${stock.materialItemId}`; (acc[key] ||= []).push(stock.id); return acc; }, {})).filter(([, ids]) => ids.length > 1);
  const byCode = Object.entries(items.reduce<Record<string, typeof items>>((acc, item) => { (acc[item.code] ||= []).push(item); return acc; }, {})).filter(([, group]) => group.length > 1).map(([code, group]) => ({ code, rows: group.map((item) => ({ id: item.id, projectId: item.projectId, projectName: item.project.name, name: item.name, unit: item.unit, manufacturer: item.manufacturer, origin: item.origin, description: item.description })) }));
  const byName = Object.entries(items.reduce<Record<string, typeof items>>((acc, item) => { (acc[item.name] ||= []).push(item); return acc; }, {})).filter(([, group]) => group.length > 1).map(([name, group]) => ({ name, rows: group.map((item) => ({ id: item.id, projectId: item.projectId, projectName: item.project.name, code: item.code, unit: item.unit, manufacturer: item.manufacturer, origin: item.origin, description: item.description })) }));

  const output = {
    database: { provider: "PostgreSQL via DATABASE_URL", readOnlyAudit: true },
    totals: { projects: projects.length, activePortfolioProjects: projects.filter((project) => ["PLANNING", "ACTIVE", "ON_HOLD"].includes(project.status)).length, materialItems: items.length, stockRows: stocks.length, stockQuantity: stocks.reduce((sum, stock) => sum + n(stock.stock), 0), movements: movements.length, proposals: proposals.length, proposalItems: proposals.reduce((sum, proposal) => sum + proposal.items.length, 0) },
    projectMatrix,
    conservation: { materialItems: projectMatrix.reduce((sum, row) => sum + row.materialItems, 0), stockRows: projectMatrix.reduce((sum, row) => sum + row.stockRows, 0), movements: projectMatrix.reduce((sum, row) => sum + row.movements, 0), proposals: projectMatrix.reduce((sum, row) => sum + row.proposals, 0), proposalItems: projectMatrix.reduce((sum, row) => sum + row.proposalItems, 0) },
    movements: movements.map((movement) => ({ id: movement.id, projectId: movement.projectId, projectName: movement.project.name, materialItemId: movement.materialItemId, materialName: movement.materialItem.name, unit: movement.materialItem.unit, materialProjectId: movement.materialItem.projectId, type: movement.type, quantity: n(movement.quantity), movementDate: movement.movementDate, createdAt: movement.createdAt, notes: movement.notes })),
    proposals: proposals.map((proposal) => ({ id: proposal.id, proposalNo: proposal.proposalNo, projectId: proposal.projectId, projectName: proposal.project.name, projectNameSnapshot: proposal.projectNameSnapshot, projectDeletedAt: proposal.project.deletedAt, requestedBy: proposal.requestedBy, proposalDate: proposal.proposalDate, requiredDeliveryDate: proposal.requiredDeliveryDate, createdAt: proposal.createdAt, updatedAt: proposal.updatedAt, status: proposal.status, items: proposal.items.map((item) => ({ id: item.id, materialItemId: item.materialItemId, materialName: item.materialName, unit: item.unit, actualQuantity: n(item.actualQuantity), materialProjectId: item.materialItem?.projectId ?? null })), approvals: proposal.approvals.map((approval) => ({ stage: approval.stage, status: approval.status, approverId: approval.approverId, decidedAt: approval.decidedAt })) })),
    relations: { movementMaterialProjectMismatch: relationMismatches, stockMaterialProjectMismatch: stockMismatches, proposalItemCrossProject: proposalCrossProject, duplicateStockRows, orphanByForeignKey: "Schema foreign keys require Project/MaterialItem; database-level orphan check is represented by relation includes and returned nulls." },
    stockReconciliation,
    negativeStocks: stockReconciliation.filter((row) => row.storedStock < 0),
    lowStock: stockReconciliation.map((row) => ({ projectId: row.projectId, projectName: row.projectName, materialItemId: row.materialItemId, materialName: row.materialName, storedStock: row.storedStock, minStockLevel: row.minStockLevel, dbStatus: row.status })),
    identity: { sameCode: byCode, sameName: byName },
  };
  if (process.argv.includes("summary")) {
    console.log(JSON.stringify({
      totals: output.totals,
      projectMatrix: output.projectMatrix.filter((row) => row.hasAnyMaterialData),
      proposalDistribution: proposals.map((proposal) => ({ id: proposal.id, proposalNo: proposal.proposalNo, projectId: proposal.projectId, projectName: proposal.project.name, requestedBy: proposal.requestedBy, projectNameSnapshot: proposal.projectNameSnapshot, requiredDeliveryDate: proposal.requiredDeliveryDate, status: proposal.status, createdAt: proposal.createdAt, itemCount: proposal.items.length, isCancelled: proposal.status === "CANCELLED" })),
      integrityCounts: { movementMaterialProjectMismatch: relationMismatches.length, stockMaterialProjectMismatch: stockMismatches.length, proposalItemCrossProject: proposalCrossProject.length, duplicateStockRows: duplicateStockRows.length, negativeStocks: output.negativeStocks.length },
      stockMismatches: stockReconciliation.filter((row) => row.differenceWithoutOpeningBalance !== 0),
      lowStatusCounts: output.lowStock.reduce<Record<string, number>>((acc, row) => { acc[row.dbStatus] = (acc[row.dbStatus] || 0) + 1; return acc; }, {}),
      sameCodeWithDifferentUnit: byCode.filter((row) => new Set(row.rows.map((item) => item.unit)).size > 1),
      movementLedger: output.movements,
    }, null, 2));
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); await pool.end(); });
