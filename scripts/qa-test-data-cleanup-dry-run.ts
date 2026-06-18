import prisma from "../src/lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Starting Safe Test Data Cleanup Dry-Run...");

  const safeToCleanup = {
    projects: [] as any[],
    materialRequests: [] as any[],
    users: [] as any[],
    documentFolders: [] as any[],
  };

  const needsConfirmation = {
    projects: [] as any[],
    materialRequests: [] as any[],
    fieldProgressEntries: [] as any[],
    auditLogs: [] as any[],
    documentFolders: [] as any[],
  };

  const keep = {
    users: [] as any[],
    projects: [] as any[],
  };

  // --- USERS ---
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { projectMembers: true, auditLogs: true, materialRequests: true }
      }
    }
  });

  const safeUserEmails = ["qa-soft-delete@construction.local", "qa-commander-rc@construction.local"];
  const keepUserEmails = ["admin@construction.local", "director@construction.local", "deputy@construction.local", "commander1@construction.local", "commander2@construction.local"];

  for (const user of users) {
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      deletedAt: user.deletedAt,
      projectMembersCount: user._count.projectMembers,
      auditLogsCount: user._count.auditLogs,
      materialRequestsCount: user._count.materialRequests,
    };

    if (safeUserEmails.includes(user.email)) {
      safeToCleanup.users.push(userData);
    } else if (keepUserEmails.some(e => user.email.startsWith(e.split('@')[0]))) {
      keep.users.push(userData);
    } else {
      keep.users.push(userData); // By default, keep other users unless explicitly identified as test.
    }
  }

  // --- PROJECTS ---
  const projects = await prisma.project.findMany({
    include: {
      _count: {
        select: {
          fieldProgressTemplates: true,
          fieldProgressItems: true,
          fieldProgressEntries: true,
          materialRequests: true,
          documentFolders: true,
          documents: true,
          members: true,
        }
      }
    }
  });

  const safePrefixes = ["QA_UAT_", "QA_RBAC_", "QA_RC_", "TEST_"];
  const needsConfKeywords = ["UAT", "Test", "test", "CT0011", "ct_01"];

  const projectIdsSafe = new Set<string>();

  for (const proj of projects) {
    const projData = {
      id: proj.id,
      code: proj.code,
      name: proj.name,
      deletedAt: proj.deletedAt,
      createdAt: proj.createdAt,
      fieldProgressTemplatesCount: proj._count.fieldProgressTemplates,
      fieldProgressItemsCount: proj._count.fieldProgressItems,
      fieldProgressEntriesCount: proj._count.fieldProgressEntries,
      materialRequestsCount: proj._count.materialRequests,
      materialRequestItemsCount: 0, // Will calculate separately if needed, simplified here
      documentFoldersCount: proj._count.documentFolders,
      documentsCount: proj._count.documents,
      projectMembersCount: proj._count.members,
      auditLogsCount: await prisma.auditLog.count({ where: { projectId: proj.id } })
    };

    const isSafe = safePrefixes.some(p => proj.code.includes(p) || proj.name.includes(p));
    const isNeedsConf = needsConfKeywords.some(k => proj.code.includes(k) || proj.name.includes(k));

    if (isSafe) {
      safeToCleanup.projects.push(projData);
      projectIdsSafe.add(proj.id);
    } else if (isNeedsConf) {
      needsConfirmation.projects.push({ ...projData, reason: "Contains test keywords but lacks explicit QA_ prefix" });
    } else {
      keep.projects.push(projData);
    }
  }

  // --- MATERIAL REQUESTS ---
  const mRequests = await prisma.materialRequest.findMany({
    include: {
      _count: { select: { items: true } },
      project: { select: { name: true } }
    }
  });

  for (const mr of mRequests) {
    const mrData = {
      id: mr.id,
      requestNo: mr.requestNo,
      projectId: mr.projectId,
      projectName: mr.project.name,
      status: mr.status,
      itemsCount: mr._count.items,
      createdAt: mr.createdAt
    };

    if (mr.requestNo.startsWith("TEST_CRUD_MR_") || mr.requestNo.startsWith("QA_") || mr.requestNo.startsWith("TEST_")) {
      safeToCleanup.materialRequests.push(mrData);
    } else if (!projectIdsSafe.has(mr.projectId) && (mr.note?.toLowerCase().includes("test"))) {
      needsConfirmation.materialRequests.push({ ...mrData, reason: "On real project but note contains 'test'" });
    }
  }

  // --- DOCUMENT FOLDERS ---
  const folders = await prisma.documentFolder.findMany({
    include: { project: { select: { name: true } } }
  });

  for (const folder of folders) {
    const folderData = {
      id: folder.id,
      name: folder.name,
      projectId: folder.projectId,
      projectName: folder.project.name,
    };

    const isTestFolder = folder.name === "SubFolder Test" || folder.name.startsWith("QA_") || folder.name.startsWith("TEST_");
    
    if (isTestFolder) {
      if (projectIdsSafe.has(folder.projectId)) {
        safeToCleanup.documentFolders.push(folderData);
      } else {
        needsConfirmation.documentFolders.push({ ...folderData, reason: "Test folder on a real/demo project" });
      }
    }
  }

  // --- FIELD PROGRESS ENTRIES ---
  const entries = await prisma.fieldProgressEntry.findMany({
    where: {
      OR: [
        { note: { contains: "test", mode: "insensitive" } },
        { issueNote: { contains: "test", mode: "insensitive" } },
        { proposalNote: { contains: "test", mode: "insensitive" } }
      ]
    },
    include: { project: { select: { name: true } } }
  });

  for (const entry of entries) {
    if (!projectIdsSafe.has(entry.projectId)) {
      needsConfirmation.fieldProgressEntries.push({
        id: entry.id,
        projectId: entry.projectId,
        projectName: entry.project.name,
        quantity: entry.quantity,
        note: entry.note,
        reason: "Test entry on a real/demo project"
      });
    }
  }

  // --- AUDIT LOGS ---
  const orphanLogs = await prisma.auditLog.count({
    where: { projectId: { not: null, notIn: projects.map(p => p.id) } }
  });
  if (orphanLogs > 0) {
    needsConfirmation.auditLogs.push({ count: orphanLogs, reason: "AuditLogs with unknown or deleted projectId" });
  }

  const results = {
    summary: {
      safeToCleanup: {
        projects: safeToCleanup.projects.length,
        materialRequests: safeToCleanup.materialRequests.length,
        users: safeToCleanup.users.length,
        documentFolders: safeToCleanup.documentFolders.length,
      },
      needsConfirmation: {
        projects: needsConfirmation.projects.length,
        materialRequests: needsConfirmation.materialRequests.length,
        fieldProgressEntries: needsConfirmation.fieldProgressEntries.length,
        documentFolders: needsConfirmation.documentFolders.length,
        auditLogs: needsConfirmation.auditLogs.length,
      },
      keep: {
        projects: keep.projects.length,
        users: keep.users.length,
      }
    },
    safeToCleanup,
    needsConfirmation,
    keep,
    risks: [
      "Hard deleting projects will cascade delete associated items (WBS, Entries, Documents, MaterialRequests).",
      "Ensure real projects are not accidentally classified as safe."
    ],
    generatedAt: new Date().toISOString(),
    databaseNameMasked: "postgresql://***:***@127.0.0.1:5432/construction_erp_v2"
  };

  const outputDir = path.join(process.cwd(), "docs", "qa");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "test-data-cleanup-dry-run-results.json"), JSON.stringify(results, null, 2));

  console.log("Dry-run completed successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
