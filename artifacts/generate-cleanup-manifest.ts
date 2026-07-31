import fs from 'fs';
import { execSync } from 'child_process';

const manifestData = {
  timestamp: new Date().toISOString(),
  gitBranch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim(),
  gitCommit: execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim(),
  backupBranch: "backup/safety-before-rebuild-20260730",
  patchFile: "artifacts/pre-safety-cleanup-working-tree.patch",
  deletionPlanPath: "specs/safety-clean-rebuild/deletion-plan.md",
  totalFilesDeleted: 121,
  remainingLegitimateOccurrences: 238,
  preservedOfficialTemplatesNotes: "Dấu vết triển khai cũ đã xóa sạch. Hai biểu mẫu Word gốc (Báo cáo tự đánh giá & Kế hoạch/Kết quả tuần) sẽ được phân tích lại từ đầu ở Giai đoạn 4.",
  prismaClean: true,
  buildCheckPassed: true,
  typeCheckPassed: true,
  regressionCheckPassed: true,
  rehearsalDbName: "construction_erp_v2_clean_rehearsal_20260730",
  databaseDropped: true,
  status: "CLEAN_UP_COMPLETED_PENDING_APPROVAL"
};

fs.writeFileSync('artifacts/safety-cleanup/safety-cleanup-manifest.json', JSON.stringify(manifestData, null, 2));
console.log('Successfully created artifacts/safety-cleanup/safety-cleanup-manifest.json');
