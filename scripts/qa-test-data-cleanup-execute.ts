import prisma from "../src/lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");

  console.log(`Starting Safe Test Data Cleanup... Mode: ${isExecute ? "EXECUTE" : "DRY-RUN"}`);

  const resultsPath = path.join(process.cwd(), "docs", "qa", "test-data-cleanup-dry-run-results.json");
  if (!fs.existsSync(resultsPath)) {
    throw new Error("test-data-cleanup-dry-run-results.json not found! Run dry-run phase first.");
  }

  const dryRunData = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
  const { projects: safeProjects, materialRequests: safeMRs } = dryRunData.safeToCleanup;

  const validProjectIds: string[] = [];
  const validMRIds: string[] = [];
  const skippedProjectIds: string[] = [];
  const skippedMRIds: string[] = [];

  // Validate Projects
  for (const p of safeProjects) {
    const dbProject = await prisma.project.findUnique({ where: { id: p.id } });
    if (dbProject && (dbProject.code.startsWith("QA_UAT_") || dbProject.code.startsWith("QA_RBAC_") || dbProject.name.startsWith("QA_UAT_") || dbProject.name.startsWith("QA_RBAC_"))) {
      validProjectIds.push(p.id);
    } else {
      console.warn(`WARNING: Project ${p.id} no longer matches rules or was deleted.`);
      skippedProjectIds.push(p.id);
    }
  }

  // Validate MaterialRequests
  for (const mr of safeMRs) {
    const dbMR = await prisma.materialRequest.findUnique({ where: { id: mr.id } });
    if (dbMR && dbMR.requestNo.startsWith("TEST_CRUD_MR_")) {
      validMRIds.push(mr.id);
    } else {
      console.warn(`WARNING: MR ${mr.id} no longer matches rules or was deleted.`);
      skippedMRIds.push(mr.id);
    }
  }

  console.log(`To delete: ${validProjectIds.length} projects, ${validMRIds.length} MRs.`);

  if (isExecute) {
    console.log("EXECUTING CLEANUP...");
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Delete standalone MaterialRequests
        if (validMRIds.length > 0) {
          await tx.materialRequestItem.deleteMany({ where: { materialRequestId: { in: validMRIds } } });
          await tx.materialRequest.deleteMany({ where: { id: { in: validMRIds } } });
        }

        // 2. Delete Safe Projects (cascade will handle child records, except we need to delete orphan audit logs)
        if (validProjectIds.length > 0) {
          // Manually deleting AuditLogs associated with these projects
          await tx.auditLog.deleteMany({ where: { projectId: { in: validProjectIds } } });
          await tx.project.deleteMany({ where: { id: { in: validProjectIds } } });
        }
      }, {
        maxWait: 5000, 
        timeout: 20000 
      });

      console.log("Cleanup executed successfully.");
      console.log(`Deleted Project IDs: ${validProjectIds.join(", ")}`);
      console.log(`Deleted MR IDs: ${validMRIds.join(", ")}`);

    } catch (e) {
      console.error("Cleanup failed. Transaction rolled back.", e);
      throw e;
    }
  } else {
    console.log("DRY RUN: No data was deleted. Run with --execute to perform deletion.");
  }
}

main().finally(() => prisma.$disconnect());
