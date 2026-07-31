import fs from 'fs';
import path from 'path';

interface Item {
  file: string;
  matches: string[];
}

const inventory: Item[] = JSON.parse(fs.readFileSync('artifacts/safety-search-inventory.json', 'utf-8'));

// Categorize files
const deleteList: string[] = [];
const modifyList: string[] = [];
const keepList: string[] = [];
const reviewRequiredList: string[] = [];

for (const item of inventory) {
  const f = item.file;

  // Official source templates and requirements -> KEEP
  if (f.startsWith('docs/official-templates/')) {
    keepList.push(f + ' (Official Word templates / manifests)');
    continue;
  }

  // Backup patch / untracked backup files -> KEEP
  if (f.startsWith('artifacts/pre-safety-cleanup')) {
    keepList.push(f + ' (Safety backup patch)');
    continue;
  }

  // Supervision module files -> KEEP 100%
  if (f.toLowerCase().includes('supervision')) {
    keepList.push(f + ' (Supervision module)');
    continue;
  }

  // Shared system files modified to support safety -> MODIFY
  if (
    f === 'prisma/schema.prisma' ||
    f === 'src/components/layout/sidebar.tsx' ||
    f === 'src/components/layout/mobile-bottom-nav.tsx' ||
    f === 'src/lib/prisma.ts' ||
    f === 'src/lib/roles/role-workspace-policy.ts' ||
    f === 'src/lib/roles/role-permissions.ts' ||
    f === 'src/lib/roles/role-definitions.ts'
  ) {
    modifyList.push(f + ' (Shared file with Safety references)');
    continue;
  }

  // Specific Safety UI, API, Components, Lib, Specs, Reference Data -> DELETE
  if (
    f.startsWith('src/app/(dashboard)/safety-inspection/') ||
    f.startsWith('src/app/api/safety-inspection/') ||
    f.startsWith('src/components/safety-inspection/') ||
    f.startsWith('src/lib/safety-inspection/') ||
    f.startsWith('specs/002-safety-inspection-workflow/') ||
    f.startsWith('prisma/reference-data/safety-') ||
    f.startsWith('prisma/migrations/20260730150000_add_safety_inspection_slice1') ||
    f.startsWith('prisma/migrations/20260730190000_add_safety_checklist_v1_metadata') ||
    f.startsWith('prisma/migrations/20260730220000_add_safety_operational_checklist_and_finding_sequence') ||
    f.startsWith('artifacts/safety-inspection-template-analysis/')
  ) {
    deleteList.push(f);
    continue;
  }

  // QA docs or generic docs mentioning safety as a generic word (e.g. "Safety check", "DATA_SAFETY_AUDIT") -> KEEP
  if (f.startsWith('docs/qa/') || f.startsWith('docs/architectural-principles.md') || f.startsWith('src/lib/storage/')) {
    keepList.push(f + ' (System doc / generic code referring to safety as concept)');
    continue;
  }

  // Default to review required
  reviewRequiredList.push(f);
}

console.log(`Delete count: ${deleteList.length}`);
console.log(`Modify count: ${modifyList.length}`);
console.log(`Keep count: ${keepList.length}`);
console.log(`Review Required count: ${reviewRequiredList.length}`);

fs.writeFileSync('artifacts/categorized-inventory.json', JSON.stringify({
  deleteList,
  modifyList,
  keepList,
  reviewRequiredList
}, null, 2));
