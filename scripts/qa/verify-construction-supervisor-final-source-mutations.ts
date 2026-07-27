import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { createTemporaryReferenceSet, encodeReply } from "next/dist/compiled/react-server-dom-webpack/client.node";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient, verifyQaPrismaFingerprint } from "./create-safe-qa-prisma-client";

const origin = "http://127.0.0.1:3100";
const artifactDirectory = path.resolve("artifacts/construction-supervisor-final");
const manifestPath = path.join(artifactDirectory, "fixture-manifest-20260727.json");
const evidencePath = path.join(artifactDirectory, "source-mutation-direct-request-evidence-20260727.json");
const referenceManifestPath = path.resolve(".next-construction-supervisor-final/dev/server/server-reference-manifest.json");

async function login(email: string, password: string) {
  const response = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (response.status !== 200 || !cookie) throw new Error(`QA login failed: HTTP ${response.status}`);
  return cookie;
}

async function main() {
  const safety = assertSafeQaDatabase();
  const qaUrl = process.env.QA_DATABASE_URL;
  const password = process.env.QA_SUPERVISION_E2E_PASSWORD;
  if (!qaUrl || !password) throw new Error("QA environment is incomplete");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  let actionEntries: Array<[string, { exportedName?: string }]> = [];
  const actionId = (name: string) => {
    const match = actionEntries.find(([, value]) => value.exportedName === name);
    if (!match) throw new Error(`Compiled server action not found: ${name}`);
    return match[0];
  };

  const officer = manifest.users.OFFICER_A;
  const projectA = manifest.projects.A as string;
  const reportDraft = manifest.reports.draftA as string;
  const reportSubmitted = manifest.reports.submittedB as string;
  const materialItem = manifest.materials.items.A as string;
  const approval = manifest.approvals.A as string;
  const template = manifest.templates.A as string;
  const progressItem = manifest.fieldProgressItems.workA as string;
  const { prisma, close } = createSafeQaPrismaClient(qaUrl);

  try {
    await verifyQaPrismaFingerprint(prisma, safety.qaDatabase);
    const cookie = await login(officer.email, password);
    for (const route of ["/projects", "/reports", "/materials", "/approvals", `/projects/${projectA}/field-progress`]) {
      const warmup = await fetch(`${origin}${route}`, { headers: { Cookie: cookie } });
      if (warmup.status !== 200) throw new Error(`QA warmup failed for ${route}: HTTP ${warmup.status}`);
      await warmup.arrayBuffer();
    }
    const references = JSON.parse(fs.readFileSync(referenceManifestPath, "utf8"));
    actionEntries = Object.entries(references.node as Record<string, { exportedName?: string }>);
    const material = await prisma.materialItem.findUniqueOrThrow({ where: { id: materialItem } });
    const approvalRow = await prisma.approvalRequest.findUniqueOrThrow({ where: { id: approval } });

    const snapshot = async () => ({
      projects: await prisma.project.findMany({
        where: { id: { in: Object.values(manifest.projects) } },
        select: { id: true, code: true, name: true, status: true, deletedAt: true, updatedAt: true },
        orderBy: { id: "asc" },
      }),
      projectCount: await prisma.project.count(),
      reports: await prisma.siteReport.findMany({
        where: { id: { in: Object.values(manifest.reports) } },
        select: { id: true, status: true, summary: true, deletedAt: true, updatedAt: true },
        orderBy: { id: "asc" },
      }),
      reportCount: await prisma.siteReport.count(),
      reportLineCount: await prisma.siteReportLine.count({
        where: { siteReportId: { in: Object.values(manifest.reports) } },
      }),
      materials: await prisma.materialItem.findMany({
        where: { id: { in: Object.values(manifest.materials.items) } },
        select: { id: true, code: true, name: true, unit: true, isActive: true, updatedAt: true },
        orderBy: { id: "asc" },
      }),
      materialCount: await prisma.materialItem.count(),
      stocks: await prisma.projectMaterialStock.findMany({
        where: { id: { in: Object.values(manifest.materials.stocks) } },
        select: { id: true, stock: true, minStockLevel: true, lastUpdated: true },
        orderBy: { id: "asc" },
      }),
      movementCount: await prisma.materialMovement.count(),
      approvals: await prisma.approvalRequest.findMany({
        where: { id: { in: Object.values(manifest.approvals) } },
        select: { id: true, status: true, title: true, deletedAt: true, updatedAt: true, decidedAt: true },
        orderBy: { id: "asc" },
      }),
      approvalCount: await prisma.approvalRequest.count(),
      progressItems: await prisma.fieldProgressItem.findMany({
        where: { id: { in: Object.values(manifest.fieldProgressItems) } },
        select: { id: true, code: true, workContent: true, designQuantity: true, deletedAt: true, updatedAt: true },
        orderBy: { id: "asc" },
      }),
      progressItemCount: await prisma.fieldProgressItem.count(),
      progressEntryCount: await prisma.fieldProgressEntry.count({
        where: { id: { in: Object.values(manifest.fieldProgressEntries) } },
      }),
    });

    const cases: Array<Record<string, unknown>> = [];
    async function runCase(input: {
      name: string;
      module: string;
      action: string;
      route: string;
      args: unknown[];
    }) {
      const before = await snapshot();
      const startedAt = new Date();
      const body = await encodeReply(input.args, { temporaryReferences: createTemporaryReferenceSet() });
      const response = await fetch(`${origin}${input.route}`, {
        method: "POST",
        headers: {
          Accept: "text/x-component",
          Cookie: cookie,
          Origin: origin,
          "next-action": actionId(input.action),
        },
        body,
        redirect: "manual",
      });
      const responseText = await response.text();
      const after = await snapshot();
      const audits = await prisma.auditLog.findMany({
        where: {
          userId: officer.id,
          createdAt: { gte: startedAt },
          action: { in: ["SOURCE_MUTATION_DENIED", "AUTHORIZATION_DENIED"] },
        },
        orderBy: { createdAt: "asc" },
      });
      const databaseUnchanged = JSON.stringify(before) === JSON.stringify(after);
      const returnedFile = Boolean(response.headers.get("content-disposition"));
      const deniedSignal = response.status >= 400
        || /không có quyền|permission|denied|error|digest/i.test(responseText)
        || audits.length > 0;
      const result = {
        ...input,
        principal: "QA-CS-OFFICER-A",
        resourceIds: {
          projectId: projectA,
          reportDraft,
          reportSubmitted,
          materialItem,
          approval,
          progressItem,
        },
        response: {
          status: response.status,
          contentType: response.headers.get("content-type"),
          returnedFile,
          bodyBytes: Buffer.byteLength(responseText),
          deniedSignal,
        },
        dbBefore: before,
        dbAfter: after,
        databaseUnchanged,
        auditEvents: audits,
        pass: databaseUnchanged && !returnedFile && deniedSignal && audits.length > 0,
      };
      cases.push(result);
      console.log(`${result.pass ? "PASS" : "FAIL"} ${input.name} HTTP ${response.status} audit=${audits.length}`);
    }

    const projectForm = new FormData();
    projectForm.set("code", `${manifest.prefix}DENIED-PROJECT`);
    projectForm.set("name", `${manifest.prefix}DENIED-PROJECT`);
    projectForm.set("status", "ACTIVE");
    await runCase({ name: "Project create", module: "Project", action: "createProject", route: "/projects", args: [null, projectForm] });
    await runCase({ name: "Project update", module: "Project", action: "updateProject", route: `/projects/${projectA}/edit`, args: [projectA, null, projectForm] });
    await runCase({ name: "Project delete", module: "Project", action: "deleteProject", route: `/projects/${projectA}`, args: [projectA] });

    const reportInput = {
      projectId: projectA,
      type: "DAILY",
      date: "2026-09-08",
      time: "07:00",
      summary: `${manifest.prefix}DENIED-REPORT`,
      workLines: [{ workContent: `${manifest.prefix}DENIED-WORK`, quantityToday: 1, unit: "m" }],
    };
    await runCase({ name: "Field report create", module: "Field report", action: "createSiteReport", route: "/reports", args: [reportInput, true] });
    await runCase({ name: "Field report update", module: "Field report", action: "updateSiteReport", route: "/reports", args: [reportDraft, reportInput] });
    await runCase({ name: "Field report submit", module: "Field report", action: "submitSiteReport", route: "/reports", args: [reportDraft] });
    await runCase({ name: "Field report approve", module: "Field report", action: "approveSiteReport", route: "/reports", args: [reportSubmitted, "DENIED"] });
    await runCase({ name: "Field report reject", module: "Field report", action: "rejectSiteReport", route: "/reports", args: [reportSubmitted, "DENIED"] });
    await runCase({ name: "Field report delete", module: "Field report", action: "softDeleteSiteReport", route: "/reports", args: [reportDraft] });

    await runCase({
      name: "Material create",
      module: "Material",
      action: "createMaterialItem",
      route: "/materials",
      args: [{ projectId: projectA, code: `${manifest.prefix}DENIED-MAT`, name: "Denied material", unit: "kg" }],
    });
    await runCase({
      name: "Material update",
      module: "Material",
      action: "updateMaterialItem",
      route: "/materials",
      args: [materialItem, { code: material.code, name: `${material.name}-DENIED`, unit: material.unit }],
    });
    await runCase({ name: "Material delete", module: "Material", action: "deleteMaterialItem", route: "/materials", args: [materialItem] });
    await runCase({
      name: "Material import",
      module: "Material",
      action: "createMaterialTransaction",
      route: "/materials",
      args: [{ projectId: projectA, materialItemId: materialItem, type: "IMPORT", quantity: 1, movementDate: new Date("2026-09-08T00:00:00Z") }],
    });
    await runCase({
      name: "Material export",
      module: "Material",
      action: "createMaterialTransaction",
      route: "/materials",
      args: [{ projectId: projectA, materialItemId: materialItem, type: "EXPORT", quantity: 1, movementDate: new Date("2026-09-08T00:00:00Z") }],
    });

    await runCase({
      name: "Approval create",
      module: "Approval",
      action: "createApprovalRequest",
      route: "/approvals",
      args: [{ projectId: projectA, title: `${manifest.prefix}DENIED-APPROVAL`, type: "OTHER", priority: "NORMAL" }],
    });
    await runCase({
      name: "Approval update",
      module: "Approval",
      action: "updateApprovalRequest",
      route: "/approvals",
      args: [{ id: approval, projectId: projectA, title: `${approvalRow.title}-DENIED`, priority: approvalRow.priority }],
    });
    await runCase({ name: "Approval approve", module: "Approval", action: "approveApprovalRequest", route: "/approvals", args: [approval, "DENIED"] });
    await runCase({ name: "Approval reject", module: "Approval", action: "rejectApprovalRequest", route: "/approvals", args: [approval, "DENIED"] });
    await runCase({ name: "Approval cancel", module: "Approval", action: "cancelApprovalRequest", route: "/approvals", args: [approval] });
    await runCase({ name: "Approval delete", module: "Approval", action: "softDeleteApprovalRequest", route: "/approvals", args: [approval] });

    const progressData = { itemType: "WORK", code: "DENIED", workContent: `${manifest.prefix}DENIED-PROGRESS`, designQuantity: 1, unit: "m" };
    await runCase({ name: "Quantity/progress create", module: "Quantity/progress/WBS", action: "createItem", route: `/projects/${projectA}/field-progress`, args: [template, projectA, progressData] });
    await runCase({ name: "Quantity/progress update", module: "Quantity/progress/WBS", action: "updateItem", route: `/projects/${projectA}/field-progress`, args: [progressItem, projectA, progressData] });
    await runCase({ name: "Quantity/progress delete", module: "Quantity/progress/WBS", action: "deleteItem", route: `/projects/${projectA}/field-progress`, args: [progressItem, projectA] });
    await runCase({ name: "Quantity/progress batch update", module: "Quantity/progress/WBS", action: "batchUpdateItems", route: `/projects/${projectA}/field-progress`, args: [projectA, [{ id: progressItem, ...progressData }]] });

    const failed = cases.filter((item) => !item.pass);
    const evidence = {
      status: failed.length === 0 ? "PASS" : "FAIL",
      testedAt: new Date().toISOString(),
      databaseFingerprint: safety.qaDatabase,
      principal: { id: officer.id, username: officer.username, role: "CONSTRUCTION_SUPERVISOR" },
      summary: { total: cases.length, passed: cases.length - failed.length, failed: failed.length },
      cases,
    };
    fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ evidencePath, ...evidence.summary, status: evidence.status }, null, 2));
    if (failed.length > 0) process.exitCode = 1;
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
