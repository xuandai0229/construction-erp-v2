import fs from 'fs';
import path from 'path';

interface Item {
  file: string;
  matches: string[];
}

const inventory: Item[] = JSON.parse(fs.readFileSync('artifacts/safety-search-inventory.json', 'utf-8'));

export interface CategorizedItem {
  stt: number;
  path: string;
  categoryType: string;
  matches: string;
  onlySafety: boolean;
  shared: boolean;
  action: 'DELETE' | 'MODIFY' | 'KEEP' | 'REVIEW_REQUIRED';
  reason: string;
}

const categorized: CategorizedItem[] = [];

let stt = 1;

for (const item of inventory) {
  const f = item.file;
  const matchesStr = item.matches.join(', ');

  // 1. Official source templates -> KEEP
  if (f.startsWith('docs/official-templates/')) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'N. Template nguồn chính thức',
      matches: matchesStr,
      onlySafety: true,
      shared: false,
      action: 'KEEP',
      reason: 'Biểu mẫu Word nguồn chính thức của chủ hệ thống - Bắt buộc giữ nguyên'
    });
    continue;
  }

  // 2. Backup artifacts -> KEEP
  if (f.startsWith('artifacts/pre-safety-cleanup')) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'L. Spec/report/artifact',
      matches: matchesStr,
      onlySafety: false,
      shared: true,
      action: 'KEEP',
      reason: 'File backup patch/untracked dự phòng dọn dẹp'
    });
    continue;
  }

  // 3. Supervision module files -> KEEP
  if (f.toLowerCase().includes('supervision')) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'O. Thành phần dùng chung / Supervision module',
      matches: matchesStr,
      onlySafety: false,
      shared: true,
      action: 'KEEP',
      reason: 'Phân hệ Giám sát Supervision - Bắt buộc giữ nguyên 100%'
    });
    continue;
  }

  // 4. Shared system files with safety references -> MODIFY
  if (
    f === 'prisma/schema.prisma' ||
    f === 'src/components/layout/sidebar.tsx' ||
    f === 'src/components/layout/mobile-bottom-nav.tsx' ||
    f === 'src/lib/prisma.ts' ||
    f === 'src/lib/roles/role-workspace-policy.ts' ||
    f === 'src/lib/roles/role-permissions.ts' ||
    f === 'src/lib/roles/role-definitions.ts'
  ) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: f.includes('prisma') ? 'G. Prisma model/enum' : f.includes('roles') ? 'F. Permission và role mapping' : 'M. Navigation/menu/breadcrumb',
      matches: matchesStr,
      onlySafety: false,
      shared: true,
      action: 'MODIFY',
      reason: 'File dùng chung toàn hệ thống - Chỉ gỡ tham chiếu Safety cũ'
    });
    continue;
  }

  // 5. Specific Safety UI routes -> DELETE
  if (f.startsWith('src/app/(dashboard)/safety-inspection/')) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'B. Route UI',
      matches: matchesStr,
      onlySafety: true,
      shared: false,
      action: 'DELETE',
      reason: 'UI Route Safety triển khai sai hướng'
    });
    continue;
  }

  // 6. Specific Safety APIs -> DELETE
  if (f.startsWith('src/app/api/safety-inspection/')) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'C. API/Route Handler/server action',
      matches: matchesStr,
      onlySafety: true,
      shared: false,
      action: 'DELETE',
      reason: 'API Handler Safety triển khai sai'
    });
    continue;
  }

  // 7. Specific Safety UI components -> DELETE
  if (f.startsWith('src/components/safety-inspection/')) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'D. Component giao diện',
      matches: matchesStr,
      onlySafety: true,
      shared: false,
      action: 'DELETE',
      reason: 'UI Component Safety triển khai sai'
    });
    continue;
  }

  // 8. Specific Safety domain/lib -> DELETE
  if (f.startsWith('src/lib/safety-inspection/')) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'E. Domain/service/transaction',
      matches: matchesStr,
      onlySafety: true,
      shared: false,
      action: 'DELETE',
      reason: 'Domain service / transaction / tests Safety triển khai sai'
    });
    continue;
  }

  // 9. Specific Safety migrations -> DELETE
  if (
    f.startsWith('prisma/migrations/20260730150000_add_safety_inspection_slice1') ||
    f.startsWith('prisma/migrations/20260730190000_add_safety_checklist_v1_metadata') ||
    f.startsWith('prisma/migrations/20260730220000_add_safety_operational_checklist_and_finding_sequence')
  ) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'H. Migration',
      matches: matchesStr,
      onlySafety: true,
      shared: false,
      action: 'DELETE',
      reason: 'Migration Safety chưa phát hành production'
    });
    continue;
  }

  // 10. Specific Safety reference data -> DELETE
  if (f.startsWith('prisma/reference-data/safety-')) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'I. Reference data/checklist',
      matches: matchesStr,
      onlySafety: true,
      shared: false,
      action: 'DELETE',
      reason: 'Reference data checklist Safety cũ'
    });
    continue;
  }

  // 11. Specific Safety specs & previous slice reports -> DELETE
  if (f.startsWith('specs/002-safety-inspection-workflow/')) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'L. Spec/report/artifact sinh ra từ lần làm sai',
      matches: matchesStr,
      onlySafety: true,
      shared: false,
      action: 'DELETE',
      reason: 'Spec và báo cáo Lát 1, 1.5, 2A, 2A.5 triển khai sai'
    });
    continue;
  }

  // 12. Artifacts created during previous wrong safety implementation -> DELETE
  if (f.startsWith('artifacts/safety-inspection-template-analysis/')) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'L. Spec/report/artifact sinh ra từ lần làm sai',
      matches: matchesStr,
      onlySafety: true,
      shared: false,
      action: 'DELETE',
      reason: 'Artifact runtime và manifest của đợt làm sai'
    });
    continue;
  }

  // 13. Shared tools, skills, agent config, docs, storage -> KEEP
  if (
    f.startsWith('docs/qa/') ||
    f.startsWith('docs/architectural-principles.md') ||
    f.startsWith('src/lib/storage/') ||
    f.startsWith('.agents/') ||
    f.startsWith('.specify/') ||
    f.startsWith('tmp/')
  ) {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'O. Thành phần dùng chung',
      matches: matchesStr,
      onlySafety: false,
      shared: true,
      action: 'KEEP',
      reason: 'Tài liệu QA/Kiến trúc/Skill dùng từ safety theo nghĩa an toàn hệ thống/môi trường'
    });
    continue;
  }

  // 14. Shared root or src files that mention safety generically (e.g., AGENTS.md) -> KEEP
  if (f.endsWith('.md') || f === 'prisma/seed.ts' || f === 'src/lib/auth.ts' || f === 'src/server/actions.ts') {
    categorized.push({
      stt: stt++,
      path: f,
      categoryType: 'O. Thành phần dùng chung',
      matches: matchesStr,
      onlySafety: false,
      shared: true,
      action: 'KEEP',
      reason: 'File dùng chung chứa từ safety theo nghĩa chung'
    });
    continue;
  }

  // Fallback -> REVIEW_REQUIRED
  categorized.push({
    stt: stt++,
    path: f,
    categoryType: 'Cần xem xét',
    matches: matchesStr,
    onlySafety: false,
    shared: true,
    action: 'REVIEW_REQUIRED',
    reason: 'Chưa đủ điều kiện khẳng định 100% thuộc Safety'
  });
}

fs.writeFileSync('artifacts/safety-inventory-classified.json', JSON.stringify(categorized, null, 2));

const counts = {
  DELETE: categorized.filter(x => x.action === 'DELETE').length,
  MODIFY: categorized.filter(x => x.action === 'MODIFY').length,
  KEEP: categorized.filter(x => x.action === 'KEEP').length,
  REVIEW_REQUIRED: categorized.filter(x => x.action === 'REVIEW_REQUIRED').length,
};

console.log('Final Categorization Counts:', counts);
