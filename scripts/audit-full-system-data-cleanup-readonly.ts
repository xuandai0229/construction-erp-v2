import 'dotenv/config';
import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

const DEMO_PATTERNS = [
  'demo', 'test', 'sample', 'fake', 'mock', 'uat', 'seed', 'dev', 'tmp', 'temp',
  'old', 'backup', 'copy', 'trash', 'dummy', 'example', 'lorem',
  'dự án mẫu', 'công trình mẫu', 'admin dev', 'n/a', 'không xác định', 'deleted', 'archive'
];

function resolveStoragePath(dbPath: string): { resolved: string | null, reason: string, candidates: string[] } {
  if (!dbPath) return { resolved: null, reason: 'Empty path', candidates: [] };
  const cleanPath = dbPath.replace(/^[\/\\]/, '');
  const candidates = [
    path.resolve(process.cwd(), cleanPath),
    path.resolve(process.cwd(), 'storage', cleanPath),
    path.resolve(process.cwd(), 'public/uploads', cleanPath)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return { resolved: c, reason: 'Found', candidates };
    }
  }
  return { resolved: null, reason: 'All candidates missing', candidates };
}

function normalizePath(p: string): string {
  return path.resolve(p).toLowerCase().replace(/\\/g, '/');
}

async function scanFileSystem(dir: string, fileList: any[]) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      await scanFileSystem(fullPath, fileList);
    } else {
      const stats = fs.statSync(fullPath);
      fileList.push({
        path: fullPath,
        size: stats.size,
        modifiedTime: stats.mtime.toISOString(),
        name: file
      });
    }
  }
}

async function main() {
  console.log('Starting PHASE 3 REDO FULL SYSTEM AUDIT...');

  const manifest: any = {
    runDate: new Date().toISOString(),
    dryRun: true,
    keepProjects: [],
    manualReviewProjects: [],
    deleteCandidatesEmptyOnly: [],
    doNotTouch: [],
    fileStorage: {
      referencedFiles: [],
      referencedFilesFound: [],
      referencedFilesMissing: [],
      orphanPhysicalFiles: [],
      keepProjectPhysicalFiles: [],
      qaTestArtifactFiles: [],
      unsafeFiles: [],
      quarantineCandidates: []
    },
    sourceArtifacts: {
      seedScripts: [],
      testScripts: [],
      qaDocs: [],
      archiveCandidates: []
    },
    inputRequirements: {
      modules: []
    }
  };

  // 1. Projects Inventory
  const projects = await prisma.project.findMany({
    include: {
      _count: {
        select: {
          members: true, wbsItems: true, documentFolders: true, documents: true,
          siteReports: true, siteReportLines: true, contracts: true, paymentPlans: true,
          paymentRecords: true, paymentRequests: true, materialRequests: true,
          materialMovements: true, projectMaterialStocks: true, approvalRequests: true,
          notifications: true, fieldProgressTemplates: true, fieldProgressItems: true,
          fieldProgressEntries: true, fieldMaterialRequests: true,
        }
      }
    }
  });

  const keepWhitelist = ['HN-TH-2026-001', 'HN-TQH-2026-002'];
  const keepProjectIds: string[] = [];

  for (const p of projects) {
    const counts = p._count;
    const hasData = Object.values(counts).some(v => v > 0);
    const blockers = Object.entries(counts).filter(([k, v]) => v > 0).map(([k, v]) => `${k}:${v}`);
    const isDemo = DEMO_PATTERNS.some(pat => p.name.toLowerCase().includes(pat) || p.code.toLowerCase().includes(pat));
    
    let rec = 'MANUAL_REVIEW';
    if (keepWhitelist.includes(p.code)) {
      rec = 'KEEP';
      keepProjectIds.push(p.id);
    } else if (!hasData && (!!p.deletedAt || isDemo || p.status !== 'ACTIVE')) {
      rec = 'DELETE_CANDIDATE_EMPTY_ONLY';
    } else if (hasData) {
      rec = 'MANUAL_REVIEW';
    }

    const projData = {
      id: p.id, code: p.code, name: p.name, status: p.status, deletedAt: p.deletedAt,
      counts, blockers, isDemoSuspect: isDemo, recommendation: rec
    };

    if (rec === 'KEEP') manifest.keepProjects.push(projData);
    else if (rec === 'MANUAL_REVIEW') manifest.manualReviewProjects.push(projData);
    else if (rec === 'DELETE_CANDIDATE_EMPTY_ONLY') manifest.deleteCandidatesEmptyOnly.push(projData);
    else manifest.doNotTouch.push(projData);
  }

  // 2. File Storage Inventory
  const dbDocs = await prisma.document.findMany({ select: { id: true, storagePath: true, projectId: true } });
  const dbAttachments = await prisma.siteReportAttachment.findMany({ select: { id: true, storagePath: true, reportId: true } });
  
  const allDbFiles = [
    ...dbDocs.map(d => ({ type: 'Document', path: d.storagePath, id: d.id, projectId: d.projectId })),
    ...dbAttachments.map(a => ({ type: 'Attachment', path: a.storagePath, id: a.id }))
  ];

  manifest.fileStorage.referencedFiles = allDbFiles;
  const resolvedDbPathsSet = new Set<string>();

  for (const dbf of allDbFiles) {
    const resolution = resolveStoragePath(dbf.path);
    if (resolution.resolved) {
      manifest.fileStorage.referencedFilesFound.push({
        ...dbf,
        resolvedPhysicalPath: resolution.resolved,
        matchConfidence: 'HIGH'
      });
      resolvedDbPathsSet.add(normalizePath(resolution.resolved));
    } else {
      manifest.fileStorage.referencedFilesMissing.push({
        ...dbf,
        missingReason: resolution.reason,
        candidates: resolution.candidates
      });
    }
  }

  const uploadDirs = ['public/uploads', 'uploads', 'storage', '.storage'].map(d => path.join(process.cwd(), d));
  const physicalFiles: any[] = [];
  
  for (const dir of uploadDirs) {
    await scanFileSystem(dir, physicalFiles);
  }

  for (const pf of physicalFiles) {
    const normPf = normalizePath(pf.path);
    if (resolvedDbPathsSet.has(normPf)) {
      continue; // Already mapped to DB
    }

    // It's not in DB
    const isKeepProject = keepWhitelist.some(kw => pf.path.includes(kw)) || keepProjectIds.some(id => pf.path.includes(id));
    const isQaTest = pf.path.match(/QA_E2E_PROJ|test|uat-upload-fixtures|qa-realistic|size-test|codex/i) || pf.name.match(/QA_E2E_PROJ|test|uat-upload-fixtures|qa-realistic|size-test|codex/i);
    const isSuspiciousProjId = pf.path.match(/123|ct_01|TH-1234|cmqp/);
    const isLarge = pf.size > 10 * 1024 * 1024; // 10MB

    const orphanData = { ...pf, projectCodeOrFolder: 'unknown', reason: 'Not in DB' };

    if (isKeepProject) {
      manifest.fileStorage.keepProjectPhysicalFiles.push(orphanData);
    } else if (isQaTest || isLarge) {
      orphanData.risk = isLarge ? 'MEDIUM' : 'LOW';
      manifest.fileStorage.qaTestArtifactFiles.push(orphanData);
      manifest.fileStorage.quarantineCandidates.push({
        ...orphanData, action: 'MANUAL_APPROVE_QUARANTINE', approvedForQuarantine: false, confirmedByUser: false
      });
    } else if (isSuspiciousProjId) {
      manifest.fileStorage.orphanPhysicalFiles.push(orphanData);
      manifest.fileStorage.quarantineCandidates.push({
        ...orphanData, risk: 'LOW', action: 'MANUAL_APPROVE_QUARANTINE', approvedForQuarantine: false, confirmedByUser: false
      });
    } else {
      manifest.fileStorage.orphanPhysicalFiles.push(orphanData);
      manifest.fileStorage.quarantineCandidates.push({
        ...orphanData, risk: 'LOW', action: 'MANUAL_APPROVE_QUARANTINE', approvedForQuarantine: false, confirmedByUser: false
      });
    }
  }

  // 3. Input Requirements (Baseline Checklist - Not automated scan)
  console.log('NOTE: inputRequirements are a baseline checklist derived from schema/domain knowledge, not an automated UI/AST scan.');
  manifest.inputRequirements.modules = [
    {
      moduleKey: "dashboard", route: "/dashboard", models: ["Project", "Notification", "AuditLog"],
      requiredFields: [], recommendedFields: [], relationsRequired: ["Project.id"],
      minimumDataToAvoidEmptyUI: ["1 ACTIVE Project"],
      professionalDemoData: ["5 projects, 20 notifications, 50 audit logs"],
      rolesRequired: ["ADMIN", "MANAGER"], filesNeeded: [], testSteps: ["View dashboard", "Check charts"], riskIfMissing: ["Empty charts"],
      sourceEvidence: { note: "Baseline logic derived from src/app/dashboard/page.tsx dependencies" }
    },
    {
      moduleKey: "settings", route: "/settings", models: ["SystemSetting"],
      requiredFields: ["companyName", "taxCode", "timezone", "currency"], recommendedFields: ["hotline"], relationsRequired: [],
      minimumDataToAvoidEmptyUI: ["1 SystemSetting record"], professionalDemoData: ["1 fully populated SystemSetting"],
      rolesRequired: ["ADMIN"], filesNeeded: [], testSteps: ["Update settings", "Check PDF exports"], riskIfMissing: ["PDF generation fails"],
      sourceEvidence: { note: "Baseline logic derived from src/app/settings/page.tsx dependencies" }
    },
    {
      moduleKey: "users", route: "/users", models: ["User"],
      requiredFields: ["email", "password", "name", "role"], recommendedFields: ["phone", "avatar"], relationsRequired: [],
      minimumDataToAvoidEmptyUI: ["1 ADMIN"], professionalDemoData: ["5 users across 4 roles"],
      rolesRequired: ["ADMIN"], filesNeeded: [], testSteps: ["Login as different roles"], riskIfMissing: ["Cannot assign members to projects"],
      sourceEvidence: { note: "Baseline logic derived from Prisma schema User model" }
    },
    {
      moduleKey: "projects", route: "/projects", models: ["Project", "ProjectMember"],
      requiredFields: ["code", "name", "status"], recommendedFields: ["investor", "location", "startDate"], relationsRequired: ["ProjectMember -> User"],
      minimumDataToAvoidEmptyUI: ["1 ACTIVE Project, 1 Member"], professionalDemoData: ["3 projects, 5 members each"],
      rolesRequired: ["MANAGER", "ADMIN"], filesNeeded: [], testSteps: ["Open project list"], riskIfMissing: ["All other modules empty"],
      sourceEvidence: { note: "Baseline logic derived from src/app/projects/page.tsx dependencies" }
    },
    {
      moduleKey: "wbs", route: "/projects/[id]/wbs", models: ["WBSItem"],
      requiredFields: ["projectId", "code", "name", "unit"], recommendedFields: ["designQuantity", "parentId"], relationsRequired: ["Project.id"],
      minimumDataToAvoidEmptyUI: ["3 WBSItems"], professionalDemoData: ["20 WBSItems nested"],
      rolesRequired: ["ENGINEER", "MANAGER"], filesNeeded: [], testSteps: ["View WBS tree"], riskIfMissing: ["Cannot create site reports"],
      sourceEvidence: { note: "Baseline logic derived from schema.prisma WBSItem" }
    },
    {
      moduleKey: "documents", route: "/documents", models: ["DocumentFolder", "Document"],
      requiredFields: ["projectId", "name (Folder)", "originalName (Doc)", "storagePath (Doc)"], recommendedFields: ["documentType"], relationsRequired: ["Project.id", "User.id"],
      minimumDataToAvoidEmptyUI: ["1 Folder"], professionalDemoData: ["5 Folders, 10 Documents"],
      rolesRequired: ["ANY"], filesNeeded: ["1 PDF", "1 JPG"], testSteps: ["Upload doc", "View doc"], riskIfMissing: ["Document workspace empty"],
      sourceEvidence: { note: "Baseline logic derived from Document Management module" }
    },
    {
      moduleKey: "dailyReports", route: "/reports", models: ["SiteReport", "SiteReportLine"],
      requiredFields: ["projectId", "reportDate", "createdById"], recommendedFields: ["weatherCondition"], relationsRequired: ["Project.id", "User.id", "WBSItem.id"],
      minimumDataToAvoidEmptyUI: ["1 Report, 1 Line"], professionalDemoData: ["10 Reports over 10 days, 5 lines each"],
      rolesRequired: ["ENGINEER", "SITE_COMMANDER"], filesNeeded: ["Site photos"], testSteps: ["Create report", "Approve report"], riskIfMissing: ["Weekly reports will be empty"],
      sourceEvidence: { note: "Baseline logic derived from src/app/reports/page.tsx" }
    },
    {
      moduleKey: "weeklyReports", route: "/reports/weekly", models: ["SiteReport"],
      requiredFields: ["projectId", "weekStartDate"], recommendedFields: [], relationsRequired: ["Project.id"],
      minimumDataToAvoidEmptyUI: ["1 Weekly Report"], professionalDemoData: ["4 Weekly Reports aggregated"],
      rolesRequired: ["MANAGER"], filesNeeded: [], testSteps: ["Generate weekly report"], riskIfMissing: ["Aggregation functions crash if no daily reports exist"],
      sourceEvidence: { note: "Baseline logic derived from Weekly Report generator" }
    },
    {
      moduleKey: "materials", route: "/materials", models: ["MaterialItem", "ProjectMaterialStock"],
      requiredFields: ["code", "name", "unit"], recommendedFields: ["group"], relationsRequired: ["Project.id"],
      minimumDataToAvoidEmptyUI: ["3 MaterialItems"], professionalDemoData: ["20 MaterialItems, stocked"],
      rolesRequired: ["STOREKEEPER", "MANAGER"], filesNeeded: [], testSteps: ["View stock"], riskIfMissing: ["Cannot create material requests"],
      sourceEvidence: { note: "Baseline logic derived from MaterialItem schema" }
    },
    {
      moduleKey: "materialRequests", route: "/materials/requests", models: ["MaterialRequest", "MaterialRequestItem"],
      requiredFields: ["projectId", "requestNo", "requestedById"], recommendedFields: ["neededDate"], relationsRequired: ["Project.id", "MaterialItem.id"],
      minimumDataToAvoidEmptyUI: ["1 Request"], professionalDemoData: ["5 Requests across statuses"],
      rolesRequired: ["ENGINEER", "MANAGER"], filesNeeded: [], testSteps: ["Request materials"], riskIfMissing: ["Empty request list"],
      sourceEvidence: { note: "Baseline logic derived from Material request workflow" }
    },
    {
      moduleKey: "suppliers", route: "/suppliers", models: ["Supplier"],
      requiredFields: ["code", "name"], recommendedFields: ["taxCode"], relationsRequired: [],
      minimumDataToAvoidEmptyUI: ["1 Supplier"], professionalDemoData: ["5 Suppliers"],
      rolesRequired: ["ACCOUNTANT"], filesNeeded: [], testSteps: ["View suppliers"], riskIfMissing: ["Cannot create contracts"],
      sourceEvidence: { note: "Baseline logic derived from Supplier schema" }
    },
    {
      moduleKey: "contracts", route: "/contracts", models: ["Contract"],
      requiredFields: ["projectId", "contractNo", "name", "type", "value"], recommendedFields: ["supplierId"], relationsRequired: ["Project.id", "Supplier.id"],
      minimumDataToAvoidEmptyUI: ["1 Contract"], professionalDemoData: ["3 Contracts"],
      rolesRequired: ["ACCOUNTANT"], filesNeeded: [], testSteps: ["View contracts"], riskIfMissing: ["Cannot create payment plans"],
      sourceEvidence: { note: "Baseline logic derived from Contract schema" }
    },
    {
      moduleKey: "payments", route: "/payments", models: ["PaymentPlan", "PaymentRequest", "PaymentRecord"],
      requiredFields: ["projectId", "amount"], recommendedFields: ["contractId"], relationsRequired: ["Project.id", "Contract.id"],
      minimumDataToAvoidEmptyUI: ["1 Plan, 1 Request"], professionalDemoData: ["5 Plans, 3 Requests, 1 Record"],
      rolesRequired: ["ACCOUNTANT", "MANAGER"], filesNeeded: [], testSteps: ["Create request"], riskIfMissing: ["Empty finance UI"],
      sourceEvidence: { note: "Baseline logic derived from Payments workflow" }
    },
    {
      moduleKey: "approvals", route: "/approvals", models: ["ApprovalRequest"],
      requiredFields: ["code", "projectId", "title", "requesterId", "type"], recommendedFields: ["amount"], relationsRequired: ["Project.id", "User.id"],
      minimumDataToAvoidEmptyUI: ["1 ApprovalRequest"], professionalDemoData: ["10 ApprovalRequests"],
      rolesRequired: ["ANY"], filesNeeded: [], testSteps: ["Approve request"], riskIfMissing: ["Empty approval inbox"],
      sourceEvidence: { note: "Baseline logic derived from ApprovalRequest schema" }
    }
  ];

  fs.mkdirSync(path.join(process.cwd(), 'docs/qa'), { recursive: true });
  fs.writeFileSync(
    path.join(process.cwd(), 'docs/qa/data-cleanup-manifest-redo-2026-07-03.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('PHASE 3 AUDIT REDO complete.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
