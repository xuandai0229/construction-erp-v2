import fs from "fs";
import path from "path";
import prisma from "../src/lib/prisma";

type Finding = {
  code: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  count: number;
  details: unknown[];
};

const materialStatuses = new Set([
  "DRAFT",
  "REQUESTED",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "PROCESSING",
  "ISSUED",
  "RECEIVED",
  "CANCELLED",
]);

const fieldEntryStatuses = new Set([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REVISION_REQUESTED",
  "CANCELLED",
]);

function isUtcMidnight(date: Date) {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

function pushFinding(findings: Finding[], finding: Omit<Finding, "count">) {
  findings.push({
    ...finding,
    count: finding.details.length,
  });
}

async function main() {
  console.log("=== FIELD MATERIAL FULL SYSTEM AUDIT (READ-ONLY) ===");

  const findings: Finding[] = [];

  const entries = await prisma.fieldProgressEntry.findMany({
    where: { deletedAt: null },
    include: {
      item: {
        select: {
          id: true,
          workContent: true,
          designQuantity: true,
          deletedAt: true,
        },
      },
    },
    orderBy: [{ itemId: "asc" }, { entryDate: "asc" }],
  });

  const duplicateEntryMap = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = `${entry.itemId}|${entry.entryDate.toISOString()}`;
    duplicateEntryMap.set(key, [...(duplicateEntryMap.get(key) || []), entry]);
  }
  pushFinding(findings, {
    code: "FP_DUPLICATE_ACTIVE_ENTRY_ITEM_DATE",
    severity: "CRITICAL",
    details: Array.from(duplicateEntryMap.entries())
      .filter(([, grouped]) => grouped.length > 1)
      .map(([key, grouped]) => ({
        key,
        count: grouped.length,
        ids: grouped.map((entry) => entry.id),
      })),
  });

  pushFinding(findings, {
    code: "FP_ENTRY_LINKED_TO_SOFT_DELETED_ITEM",
    severity: "HIGH",
    details: entries
      .filter((entry) => entry.item.deletedAt !== null)
      .map((entry) => ({
        entryId: entry.id,
        itemId: entry.itemId,
        entryDate: entry.entryDate.toISOString(),
        workContent: entry.item.workContent,
      })),
  });

  pushFinding(findings, {
    code: "FP_NEGATIVE_QUANTITY",
    severity: "HIGH",
    details: entries
      .filter((entry) => Number(entry.quantity) < 0)
      .map((entry) => ({
        entryId: entry.id,
        itemId: entry.itemId,
        quantity: Number(entry.quantity),
        entryDate: entry.entryDate.toISOString(),
      })),
  });

  pushFinding(findings, {
    code: "FP_ENTRY_DATE_NOT_UTC_MIDNIGHT",
    severity: "MEDIUM",
    details: entries
      .filter((entry) => !isUtcMidnight(entry.entryDate))
      .map((entry) => ({
        entryId: entry.id,
        itemId: entry.itemId,
        entryDate: entry.entryDate.toISOString(),
      })),
  });

  pushFinding(findings, {
    code: "FP_STATUS_OUTSIDE_ENUM",
    severity: "CRITICAL",
    details: entries
      .filter((entry) => !fieldEntryStatuses.has(entry.status))
      .map((entry) => ({
        entryId: entry.id,
        status: entry.status,
      })),
  });

  const activeItems = await prisma.fieldProgressItem.findMany({
    where: { deletedAt: null, itemType: "WORK" },
    include: {
      entries: { where: { deletedAt: null } },
      materialRequestItems: { where: { deletedAt: null }, select: { id: true, materialRequestId: true } },
    },
  });

  pushFinding(findings, {
    code: "FP_ACTIVE_ITEM_APPROVED_OVER_DESIGN",
    severity: "MEDIUM",
    details: activeItems
      .map((item) => {
        const designQuantity = Number(item.designQuantity || 0);
        const approvedQuantity = item.entries
          .filter((entry) => entry.status === "APPROVED")
          .reduce((sum, entry) => sum + Number(entry.quantity), 0);

        return {
          itemId: item.id,
          workContent: item.workContent,
          designQuantity,
          approvedQuantity,
          overBy: approvedQuantity - designQuantity,
        };
      })
      .filter((item) => item.designQuantity > 0 && item.approvedQuantity > item.designQuantity),
  });

  const requests = await prisma.materialRequest.findMany({
    where: { deletedAt: null },
    include: {
      project: { select: { id: true, deletedAt: true } },
      items: {
        where: { deletedAt: null },
        include: {
          fieldProgressItem: {
            select: {
              id: true,
              workContent: true,
              deletedAt: true,
            },
          },
        },
      },
    },
    orderBy: { requestNo: "asc" },
  });

  const requestNoMap = new Map<string, string[]>();
  for (const request of requests) {
    requestNoMap.set(request.requestNo, [...(requestNoMap.get(request.requestNo) || []), request.id]);
  }

  pushFinding(findings, {
    code: "MR_DUPLICATE_REQUEST_NO",
    severity: "CRITICAL",
    details: Array.from(requestNoMap.entries())
      .filter(([, ids]) => ids.length > 1)
      .map(([requestNo, ids]) => ({ requestNo, count: ids.length, ids })),
  });

  pushFinding(findings, {
    code: "MR_REQUEST_MISSING_OR_SOFT_DELETED_PROJECT",
    severity: "CRITICAL",
    details: requests
      .filter((request) => !request.project || request.project.deletedAt !== null)
      .map((request) => ({
        requestId: request.id,
        requestNo: request.requestNo,
        projectId: request.projectId,
      })),
  });

  pushFinding(findings, {
    code: "MR_STATUS_OUTSIDE_ENUM",
    severity: "CRITICAL",
    details: requests
      .filter((request) => !materialStatuses.has(request.status))
      .map((request) => ({
        requestId: request.id,
        requestNo: request.requestNo,
        status: request.status,
      })),
  });

  pushFinding(findings, {
    code: "MR_REQUEST_WITHOUT_ACTIVE_ITEMS",
    severity: "HIGH",
    details: requests
      .filter((request) => request.items.length === 0)
      .map((request) => ({
        requestId: request.id,
        requestNo: request.requestNo,
      })),
  });

  const materialItems = requests.flatMap((request) =>
    request.items.map((item) => ({
      ...item,
      requestNo: request.requestNo,
      requestStatus: request.status,
    })),
  );

  pushFinding(findings, {
    code: "MR_ITEM_MISSING_REQUIRED_FIELDS",
    severity: "HIGH",
    details: materialItems
      .filter((item) => !item.materialRequestId || !item.materialName?.trim())
      .map((item) => ({
        itemId: item.id,
        requestNo: item.requestNo,
        materialRequestId: item.materialRequestId,
        materialName: item.materialName,
      })),
  });

  pushFinding(findings, {
    code: "MR_ITEM_NEGATIVE_OR_ZERO_REQUESTED_QUANTITY",
    severity: "HIGH",
    details: materialItems
      .filter((item) => Number(item.requestedQuantity) <= 0)
      .map((item) => ({
        itemId: item.id,
        requestNo: item.requestNo,
        materialName: item.materialName,
        requestedQuantity: Number(item.requestedQuantity),
      })),
  });

  pushFinding(findings, {
    code: "MR_ITEM_NEGATIVE_ISSUED_OR_RECEIVED",
    severity: "HIGH",
    details: materialItems
      .filter((item) => Number(item.issuedQuantity) < 0 || Number(item.receivedQuantity) < 0)
      .map((item) => ({
        itemId: item.id,
        requestNo: item.requestNo,
        materialName: item.materialName,
        issuedQuantity: Number(item.issuedQuantity),
        receivedQuantity: Number(item.receivedQuantity),
      })),
  });

  pushFinding(findings, {
    code: "MR_ITEM_REMAINING_QUANTITY_MISMATCH",
    severity: "MEDIUM",
    details: materialItems
      .map((item) => {
        const requestedQuantity = Number(item.requestedQuantity);
        const receivedQuantity = Number(item.receivedQuantity);
        const storedRemainingQuantity = Number(item.remainingQuantity);
        const expectedRemainingQuantity = Math.max(0, requestedQuantity - receivedQuantity);

        return {
          itemId: item.id,
          requestNo: item.requestNo,
          materialName: item.materialName,
          requestedQuantity,
          receivedQuantity,
          storedRemainingQuantity,
          expectedRemainingQuantity,
          delta: storedRemainingQuantity - expectedRemainingQuantity,
        };
      })
      .filter((item) => Math.abs(item.delta) > 0.0001),
  });

  pushFinding(findings, {
    code: "MR_ITEM_RECEIVED_OVER_REQUESTED",
    severity: "MEDIUM",
    details: materialItems
      .filter((item) => Number(item.receivedQuantity) > Number(item.requestedQuantity))
      .map((item) => ({
        itemId: item.id,
        requestNo: item.requestNo,
        materialName: item.materialName,
        requestedQuantity: Number(item.requestedQuantity),
        receivedQuantity: Number(item.receivedQuantity),
      })),
  });

  pushFinding(findings, {
    code: "MR_ITEM_LINKED_TO_SOFT_DELETED_FIELD_PROGRESS_ITEM",
    severity: "MEDIUM",
    details: materialItems
      .filter((item) => item.fieldProgressItemId && item.fieldProgressItem?.deletedAt !== null)
      .map((item) => ({
        itemId: item.id,
        requestNo: item.requestNo,
        fieldProgressItemId: item.fieldProgressItemId,
        workContent: item.fieldProgressItem?.workContent,
      })),
  });

  const summary = {
    auditedAt: new Date().toISOString(),
    fieldProgress: {
      activeEntries: entries.length,
      activeWorkItems: activeItems.length,
    },
    materialRequests: {
      activeRequests: requests.length,
      activeItems: materialItems.length,
    },
    findingCount: findings.reduce((sum, finding) => sum + finding.count, 0),
    criticalFindingCount: findings
      .filter((finding) => finding.severity === "CRITICAL")
      .reduce((sum, finding) => sum + finding.count, 0),
  };

  const report = { summary, findings };
  const reportPath = path.join(process.cwd(), "docs", "qa", "FIELD_MATERIAL_FULL_SYSTEM_AUDIT.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(summary, null, 2));
  console.table(
    findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      count: finding.count,
    })),
  );
  console.log(`Audit JSON saved: ${reportPath}`);

  if (summary.criticalFindingCount > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Full system audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
