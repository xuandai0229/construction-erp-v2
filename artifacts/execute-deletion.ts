import fs from 'fs';
import path from 'path';

const deleteFiles = [
  // 1. UI Routes
  "src/app/(dashboard)/safety-inspection/layout.tsx",
  "src/app/(dashboard)/safety-inspection/page.tsx",
  "src/app/(dashboard)/safety-inspection/reports/page.tsx",
  "src/app/(dashboard)/safety-inspection/reports/new/page.tsx",
  "src/app/(dashboard)/safety-inspection/reports/[reportId]/page.tsx",
  "src/app/(dashboard)/safety-inspection/sessions/page.tsx",
  "src/app/(dashboard)/safety-inspection/sessions/new/page.tsx",
  "src/app/(dashboard)/safety-inspection/sessions/[sessionId]/page.tsx",
  "src/app/(dashboard)/safety-inspection/findings/page.tsx",
  "src/app/(dashboard)/safety-inspection/findings/[findingId]/page.tsx",
  "src/app/(dashboard)/safety-inspection/re-inspections/page.tsx",

  // 2. API Routes
  "src/app/api/safety-inspection/collaborators/route.ts",
  "src/app/api/safety-inspection/dashboard/route.ts",
  "src/app/api/safety-inspection/projects/route.ts",
  "src/app/api/safety-inspection/reports/route.ts",
  "src/app/api/safety-inspection/reports/[reportId]/route.ts",
  "src/app/api/safety-inspection/sessions/route.ts",
  "src/app/api/safety-inspection/sessions/[sessionId]/route.ts",

  // 3. Components
  "src/components/safety-inspection/safety-dashboard-client.tsx",
  "src/components/safety-inspection/safety-finding-form.tsx",
  "src/components/safety-inspection/safety-finding-list-client.tsx",
  "src/components/safety-inspection/safety-reinspection-client.tsx",
  "src/components/safety-inspection/safety-report-form.tsx",
  "src/components/safety-inspection/safety-report-hub-client.tsx",
  "src/components/safety-inspection/safety-session-detail-client.tsx",
  "src/components/safety-inspection/safety-session-form.tsx",
  "src/components/safety-inspection/safety-session-list-client.tsx",

  // 4. Domain / Lib / Transactions
  "src/lib/safety-inspection/idempotency.ts",
  "src/lib/safety-inspection/idempotency-cleaner.ts",
  "src/lib/safety-inspection/idempotency-cleaner.test.ts",
  "src/lib/safety-inspection/permissions.ts",
  "src/lib/safety-inspection/read-service.ts",
  "src/lib/safety-inspection/reinspection.ts",
  "src/lib/safety-inspection/report-service.ts",
  "src/lib/safety-inspection/session-list-service.ts",
  "src/lib/safety-inspection/template-service.ts",
  "src/lib/safety-inspection/template-transactions.ts",
  "src/lib/safety-inspection/transactions.ts",
  "src/lib/safety-inspection/types.ts",
  "src/lib/safety-inspection/ui-labels.ts",
  "src/lib/safety-inspection/week.ts",
  "src/lib/safety-inspection/client-api.ts",
  "src/lib/safety-inspection/__tests__/api-boundary.test.ts",
  "src/lib/safety-inspection/__tests__/checklist-operational-v2.test.ts",
  "src/lib/safety-inspection/__tests__/checklist-v1.test.ts",
  "src/lib/safety-inspection/__tests__/finding-domain.test.ts",
  "src/lib/safety-inspection/__tests__/hardening-domain.test.ts",
  "src/lib/safety-inspection/__tests__/http-boundary.test.ts",
  "src/lib/safety-inspection/__tests__/idempotency.test.ts",
  "src/lib/safety-inspection/__tests__/inspection-domain.test.ts",
  "src/lib/safety-inspection/__tests__/lat2b-ui.test.ts",
  "src/lib/safety-inspection/__tests__/lat2b1-regression.test.ts",
  "src/lib/safety-inspection/__tests__/lat2b2-report-regression.test.ts",
  "src/lib/safety-inspection/__tests__/permissions.test.ts",
  "src/lib/safety-inspection/__tests__/report-category-projection.test.ts",
  "src/lib/safety-inspection/__tests__/week.test.ts",

  // 5. Migrations (unreleased on prod)
  "prisma/migrations/20260730150000_add_safety_inspection_slice1/migration.sql",
  "prisma/migrations/20260730190000_add_safety_checklist_v1_metadata/migration.sql",
  "prisma/migrations/20260730220000_add_safety_operational_checklist_and_finding_sequence/migration.sql",

  // 6. Reference Data
  "prisma/reference-data/safety-checklist-company-v1.json",
  "prisma/reference-data/safety-checklist-company-operational-v2.json",

  // 7. Test / QA scripts specific to wrong safety implementation
  "scripts/qa/safety-inspection-slice15.integration.ts",
  "scripts/qa/safety-migration-rehearsal.ts",
  "scripts/qa/safety-slice2a-http.integration.ts",
  "scripts/safety/bootstrap-safety-checklist-v1.ts",
  "scripts/safety/generate-checklist-v1-artifacts.ts",

  // 8. Legacy specs and artifacts from wrong safety implementation
  "specs/002-safety-inspection-workflow/checklist-v1-matrix.md",
  "specs/002-safety-inspection-workflow/data-model.md",
  "specs/002-safety-inspection-workflow/plan.md",
  "specs/002-safety-inspection-workflow/quickstart.md",
  "specs/002-safety-inspection-workflow/research.md",
  "specs/002-safety-inspection-workflow/slice-1-report.md",
  "specs/002-safety-inspection-workflow/slice-1.5-report.md",
  "specs/002-safety-inspection-workflow/slice-2a-report.md",
  "specs/002-safety-inspection-workflow/slice-2a.5-report.md",
  "specs/002-safety-inspection-workflow/spec.md",
  "specs/002-safety-inspection-workflow/tasks.md",
  "specs/002-safety-inspection-workflow/checklists/requirements.md",
  "specs/002-safety-inspection-workflow/contracts/safety-inspection-api.md",
  "artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia-1.png",
  "artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia-2.png",
  "artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia-3.png",
  "artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia.docx",
  "artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia.pdf",
  "artifacts/safety-inspection-template-analysis/checklist-v1-manifest.json",
  "artifacts/safety-inspection-template-analysis/full-schema-sql-for-safety-extraction.sql",
  "artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra-1.png",
  "artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra-2.png",
  "artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra-3.png",
  "artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra-4.png",
  "artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra-5.png",
  "artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra.docx",
  "artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra.pdf",
  "artifacts/safety-inspection-template-analysis/safety-checklist-operational-v2-manifest.json",
  "artifacts/safety-inspection-template-analysis/safety-checklist-operational-v2-matrix.md",
  "artifacts/safety-inspection-template-analysis/slice1-integration-fixture-manifest.json",
  "artifacts/safety-inspection-template-analysis/slice1.5-integration-manifest.json",
  "artifacts/safety-inspection-template-analysis/slice1.5-migration-rehearsal-manifest.json",
  "artifacts/safety-inspection-template-analysis/slice2a-runtime-request-manifest.json",
  "artifacts/safety-inspection-template-analysis/slice2a5-runtime-request-manifest.json",
  "artifacts/safety-inspection-template-analysis/template-manifest.json"
];

let deletedCount = 0;
for (const relPath of deleteFiles) {
  const fullPath = path.resolve(relPath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    deletedCount++;
  }
}

// Clean up empty directories created by deletions
const dirsToClean = [
  "src/app/(dashboard)/safety-inspection/reports/new",
  "src/app/(dashboard)/safety-inspection/reports/[reportId]",
  "src/app/(dashboard)/safety-inspection/reports",
  "src/app/(dashboard)/safety-inspection/sessions/new",
  "src/app/(dashboard)/safety-inspection/sessions/[sessionId]",
  "src/app/(dashboard)/safety-inspection/sessions",
  "src/app/(dashboard)/safety-inspection/findings/[findingId]",
  "src/app/(dashboard)/safety-inspection/findings",
  "src/app/(dashboard)/safety-inspection/re-inspections",
  "src/app/(dashboard)/safety-inspection",
  "src/app/api/safety-inspection/collaborators",
  "src/app/api/safety-inspection/dashboard",
  "src/app/api/safety-inspection/projects",
  "src/app/api/safety-inspection/reports/[reportId]",
  "src/app/api/safety-inspection/reports",
  "src/app/api/safety-inspection/sessions/[sessionId]",
  "src/app/api/safety-inspection/sessions",
  "src/app/api/safety-inspection",
  "src/components/safety-inspection",
  "src/lib/safety-inspection/__tests__",
  "src/lib/safety-inspection",
  "prisma/migrations/20260730150000_add_safety_inspection_slice1",
  "prisma/migrations/20260730190000_add_safety_checklist_v1_metadata",
  "prisma/migrations/20260730220000_add_safety_operational_checklist_and_finding_sequence",
  "scripts/safety",
  "specs/002-safety-inspection-workflow/checklists",
  "specs/002-safety-inspection-workflow/contracts",
  "specs/002-safety-inspection-workflow",
  "artifacts/safety-inspection-template-analysis"
];

for (const d of dirsToClean) {
  const fullDir = path.resolve(d);
  if (fs.existsSync(fullDir)) {
    try {
      const contents = fs.readdirSync(fullDir);
      if (contents.length === 0) {
        fs.rmdirSync(fullDir);
      }
    } catch (e) {}
  }
}

console.log(`Successfully deleted ${deletedCount} files from allowlist.`);
