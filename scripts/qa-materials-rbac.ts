import { UserRole, ProjectRole } from '@prisma/client';
import { getMaterialPermissions } from '../src/lib/materials/materials-permissions';

function main() {
  console.log("=== KIỂM TRA LOGIC RBAC MATERIALS ===");

  const admin = getMaterialPermissions('ADMIN');
  console.log(`\n- ADMIN: canImport=${admin.canImport}, canExport=${admin.canExport} (Kỳ vọng: true, true)`);

  const director = getMaterialPermissions('DIRECTOR', null);
  console.log(`- DIRECTOR (no project): canView=${director.canView} (Kỳ vọng: false)`);
  
  const accountant = getMaterialPermissions('ACCOUNTANT', 'SUPERVISOR');
  console.log(`- Kế toán (ACCOUNTANT + SUPERVISOR): canImport=${accountant.canImport}, canExport=${accountant.canExport} (Kỳ vọng: true, true nhưng hiện tại là false)`);

  const storekeeper = getMaterialPermissions('STAFF', 'SUPERVISOR');
  console.log(`- Thủ kho (STAFF + SUPERVISOR): canImport=${storekeeper.canImport}, canExport=${storekeeper.canExport} (Kỳ vọng: true, true nhưng hiện tại là false)`);

  const chief = getMaterialPermissions('CHIEF_COMMANDER', 'CHIEF_COMMANDER');
  console.log(`- Chỉ huy trưởng: canImport=${chief.canImport}, canExport=${chief.canExport} (Kỳ vọng: true, true)`);

  const engineer = getMaterialPermissions('ENGINEER', 'QA_QC');
  console.log(`- Kỹ sư: canImport=${engineer.canImport} (Kỳ vọng: false hoặc true tùy thiết kế)`);
}

main();
