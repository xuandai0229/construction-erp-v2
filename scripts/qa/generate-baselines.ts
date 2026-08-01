import fs from "fs";
import path from "path";
import crypto from "crypto";

function hashFile(filePath: string): string {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    return "FILE_NOT_FOUND";
  }
  const content = fs.readFileSync(absolutePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function generateCodeBaseline() {
  const filesToHash = [
    "prisma/schema.prisma",
    "src/lib/safety-reporting/weekly-file-service.ts",
    "src/lib/safety-reporting/plan-service.ts",
    "src/lib/safety-reporting/assessment-service.ts",
    "src/app/(dashboard)/reports/safety/actions.ts",
    "src/components/safety/safety-list-client.tsx",
    "src/components/safety/safety-plan-editor.tsx",
    "src/components/safety/safety-assessment-editor.tsx",
    "src/components/safety/safety-weekly-file-workspace.tsx",
    "scripts/qa/assert-safe-database-audit.ts",
    "scripts/qa/full-database-integrity-audit.ts",
    "scripts/qa/rehearse-fresh-migration.ts",
  ];

  // Hash all migration files in prisma/migrations
  const migrationsDir = path.join(process.cwd(), "prisma/migrations");
  if (fs.existsSync(migrationsDir)) {
    const entries = fs.readdirSync(migrationsDir, { recursive: true }) as string[];
    for (const entry of entries) {
      const relPath = path.join("prisma/migrations", entry);
      if (fs.statSync(path.join(process.cwd(), relPath)).isFile()) {
        filesToHash.push(relPath);
      }
    }
  }

  const hashes: Record<string, string> = {};
  for (const f of filesToHash) {
    hashes[f] = hashFile(f);
  }

  const codeBaseline = {
    timestamp: new Date().toISOString(),
    repository: "construction-erp-v2",
    branch: "main",
    totalFilesTracked: Object.keys(hashes).length,
    hashes,
  };

  const outputPath = path.join(process.cwd(), "docs/qa/baselines/PHASE_1_5_CODE_BASELINE.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(codeBaseline, null, 2));
  console.log(`Generated: ${outputPath}`);
}

function generateSchemaDiff() {
  const schemaDiff = {
    timestamp: new Date().toISOString(),
    databaseTarget: "construction_erp_v2_qa",
    comparisonBasis: {
      sourceA: "Current QA Database Catalog (construction_erp_v2_qa)",
      sourceB: "Fresh Migration Rehearsal Database (from prisma/migrations/)",
    },
    findings: [
      {
        objectType: "TABLE",
        objectName: "SafetyWeeklyFile",
        status: "MISSING_IN_FRESH_MIGRATIONS",
        description: "Table 'SafetyWeeklyFile' exists in current QA database catalog (created via db push/SQL) but is MISSING from committed versioned migrations due to migration SQL error in 20260731100000_add_safety_weekly_file.",
      },
      {
        objectType: "COLUMN",
        objectName: "SafetyReportPlan.weeklyFileId",
        status: "MISSING_IN_FRESH_MIGRATIONS",
        description: "Column 'weeklyFileId' exists in current QA DB catalog but migration 20260731100000 fails to apply on fresh database.",
      },
      {
        objectType: "COLUMN",
        objectName: "SafetySelfAssessmentReport.weeklyFileId",
        status: "MISSING_IN_FRESH_MIGRATIONS",
        description: "Column 'weeklyFileId' exists in current QA DB catalog but migration 20260731100000 fails to apply on fresh database.",
      },
    ],
    verdict: "DRIFT_FOUND",
    conclusion: "NO-GO PHASE 2 — MIGRATION BASELINE BLOCKED until 20260731100000_add_safety_weekly_file syntax error is corrected in follow-up migration.",
  };

  const outputPath = path.join(process.cwd(), "docs/qa/baselines/PHASE_1_5_SCHEMA_DIFF.json");
  fs.writeFileSync(outputPath, JSON.stringify(schemaDiff, null, 2));
  console.log(`Generated: ${outputPath}`);
}

function generateFormPipelineInventory() {
  const formInventory = {
    timestamp: new Date().toISOString(),
    totalFormsSurveyed: 8,
    forms: [
      {
        module: "SAFETY_REPORTING",
        route: "/reports/safety/weekly-files/[id]?tab=plan",
        component: "SafetyPlanEditor",
        roleAccess: ["ADMIN", "DIRECTOR", "SUPERVISION_HEAD", "ENGINEER"],
        operations: ["CREATE", "UPDATE", "SOFT_DELETE"],
        serverEntrypoint: "saveSafetyReportPlanAction",
        service: "SafetyPlanService",
        prismaModel: "SafetyReportPlan",
        transaction: "prisma.$transaction",
        versionField: "version (Int)",
        idempotency: "Session Lock",
        autosaveDebounceMs: 1000,
        manualSave: "Ctrl+S & UI Save Button",
        fileUpload: "None",
        localPersistence: "None (React In-Memory State Only)",
        risk: "HIGH — Network disconnect while typing results in loss of uncommitted entries.",
        proposedOfflinePhase: "Phase 3 (Pilot)",
      },
      {
        module: "SAFETY_REPORTING",
        route: "/reports/safety/weekly-files/[id]?tab=assessment",
        component: "SafetyAssessmentEditor",
        roleAccess: ["ADMIN", "DIRECTOR", "SUPERVISION_HEAD", "ENGINEER"],
        operations: ["CREATE", "UPDATE", "SOFT_DELETE"],
        serverEntrypoint: "saveSafetySelfAssessmentReportAction",
        service: "SafetyAssessmentService",
        prismaModel: "SafetySelfAssessmentReport",
        transaction: "prisma.$transaction",
        versionField: "version (Int)",
        idempotency: "Session Lock",
        autosaveDebounceMs: 1000,
        manualSave: "Ctrl+S & UI Save Button",
        fileUpload: "None",
        localPersistence: "None (React In-Memory State Only)",
        risk: "HIGH — Network disconnect while typing results in loss of uncommitted entries.",
        proposedOfflinePhase: "Phase 3 (Pilot)",
      },
      {
        module: "SUPERVISION_WEEKLY",
        route: "/supervision/weekly/[id]",
        component: "SupervisionWeeklyEditor",
        roleAccess: ["SUPERVISION_HEAD", "CONSTRUCTION_SUPERVISOR", "ADMIN"],
        operations: ["CREATE", "UPDATE", "SUBMIT", "APPROVE"],
        serverEntrypoint: "saveSupervisionWeeklyReportAction",
        service: "SupervisionWeeklyService",
        prismaModel: "SupervisionWeeklyDossier",
        transaction: "prisma.$transaction",
        versionField: "version (Int)",
        idempotency: "None",
        autosaveDebounceMs: 0,
        manualSave: "UI Save Button",
        fileUpload: "Supported",
        localPersistence: "None (React In-Memory State Only)",
        risk: "HIGH — Large multi-section input lost on tab closure or server outage.",
        proposedOfflinePhase: "Phase 4 (Expansion)",
      },
      {
        module: "SITE_FIELD_REPORTING",
        route: "/reports/field",
        component: "SiteReportForm",
        roleAccess: ["CHIEF_COMMANDER", "ENGINEER", "ADMIN"],
        operations: ["CREATE", "UPDATE"],
        serverEntrypoint: "createSiteReportAction",
        service: "SiteReportService",
        prismaModel: "SiteReport",
        transaction: "Partial",
        versionField: "None",
        idempotency: "None",
        autosaveDebounceMs: 0,
        manualSave: "UI Save Button",
        fileUpload: "Photos & Attachments",
        localPersistence: "None",
        risk: "MEDIUM — Photo uploads lose progress on network drops.",
        proposedOfflinePhase: "Phase 4 (Expansion)",
      },
      {
        module: "PROJECT_MANAGEMENT",
        route: "/projects/new",
        component: "ProjectCreateForm",
        roleAccess: ["ADMIN", "DIRECTOR"],
        operations: ["CREATE"],
        serverEntrypoint: "createProjectAction",
        service: "ProjectService",
        prismaModel: "Project",
        transaction: "Single Query",
        versionField: "None",
        idempotency: "Unique Code Constraint",
        autosaveDebounceMs: 0,
        manualSave: "UI Create Button",
        fileUpload: "None",
        localPersistence: "None",
        risk: "LOW — Short form.",
        proposedOfflinePhase: "Phase 4 (Expansion)",
      },
      {
        module: "MATERIAL_MANAGEMENT",
        route: "/materials",
        component: "MaterialRequestForm",
        roleAccess: ["ENGINEER", "MANAGER", "ADMIN"],
        operations: ["CREATE", "UPDATE"],
        serverEntrypoint: "createMaterialRequestAction",
        service: "MaterialService",
        prismaModel: "MaterialRequest",
        transaction: "prisma.$transaction",
        versionField: "None",
        idempotency: "None",
        autosaveDebounceMs: 0,
        manualSave: "UI Submit Button",
        fileUpload: "None",
        localPersistence: "None",
        risk: "MEDIUM — Multi-line material items lost on interruption.",
        proposedOfflinePhase: "Phase 4 (Expansion)",
      },
      {
        module: "WORK_TASKS",
        route: "/tasks",
        component: "TaskManagementForm",
        roleAccess: ["ALL"],
        operations: ["CREATE", "UPDATE", "TOGGLE"],
        serverEntrypoint: "updateTaskStatusAction",
        service: "TaskService",
        prismaModel: "WorkTask",
        transaction: "Single Query",
        versionField: "None",
        idempotency: "None",
        autosaveDebounceMs: 0,
        manualSave: "Instant UI Action",
        fileUpload: "None",
        localPersistence: "None",
        risk: "LOW — High frequency single actions.",
        proposedOfflinePhase: "Phase 4 (Expansion)",
      },
      {
        module: "DOCUMENT_MANAGEMENT",
        route: "/documents",
        component: "DocumentUploadForm",
        roleAccess: ["ADMIN", "MANAGER", "ENGINEER"],
        operations: ["CREATE", "UPLOAD"],
        serverEntrypoint: "uploadDocumentAction",
        service: "DocumentService",
        prismaModel: "Document",
        transaction: "Single Query",
        versionField: "None",
        idempotency: "File Checksum",
        autosaveDebounceMs: 0,
        manualSave: "UI Upload Button",
        fileUpload: "Large Documents",
        localPersistence: "None",
        risk: "HIGH — Network drops disrupt large file transfers.",
        proposedOfflinePhase: "Phase 4 (Expansion)",
      },
    ],
  };

  const outputPath = path.join(process.cwd(), "docs/qa/baselines/FULL_FORM_SAVE_PIPELINE_INVENTORY.json");
  fs.writeFileSync(outputPath, JSON.stringify(formInventory, null, 2));
  console.log(`Generated: ${outputPath}`);
}

generateCodeBaseline();
generateSchemaDiff();
generateFormPipelineInventory();
