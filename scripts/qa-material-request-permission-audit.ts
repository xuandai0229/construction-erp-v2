import prisma from '../src/lib/prisma';
import assert from 'assert';
import { getMaterialPermissions } from '../src/lib/materials/materials-permissions';

async function run() {
  console.log("Running qa-material-request-permission-audit...");

  // 1. Check Manager permissions
  const managerPerms = getMaterialPermissions("STAFF", "PROJECT_MANAGER");
  assert.strictEqual(managerPerms.canApproveRequest, true, "Manager should be able to approve request");
  
  // 2. Check Admin permissions
  const adminPerms = getMaterialPermissions("ADMIN", null);
  assert.strictEqual(adminPerms.canApproveRequest, true, "Admin should be able to approve request");

  // 3. Check Staff without role permissions
  const staffPerms = getMaterialPermissions("STAFF", "STAFF");
  assert.strictEqual(staffPerms.canApproveRequest, false, "Staff should NOT be able to approve request");

  console.log("Permission audit passed!");
}

run().catch(console.error).finally(() => prisma.$disconnect());
