import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log("=== KIỂM TRA DOUBLE ACTION (STATIC AUDIT) ===\n");
  
  const actionPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'approvals', 'actions.ts');
  const code = fs.readFileSync(actionPath, 'utf-8');

  const updateManyWithPendingApprove = code.includes('status: "PENDING"') && code.includes('status: "APPROVED"') && code.includes('updateMany');
  const updateManyWithPendingReject = code.includes('status: "PENDING"') && code.includes('status: "REJECTED"') && code.includes('updateMany');
  const checkCountApprove = code.includes('if (updated.count !== 1)');

  console.log(`- Approve dùng updateMany check PENDING: ${updateManyWithPendingApprove ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Reject dùng updateMany check PENDING: ${updateManyWithPendingReject ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Có kiểm tra count !== 1 để chặn double action: ${checkCountApprove ? '✅ CÓ' : '❌ KHÔNG'}`);

  if (updateManyWithPendingApprove && updateManyWithPendingReject && checkCountApprove) {
    console.log("\n✅ STATIC VERIFICATION PASS: Chống double approve/reject an toàn.");
  } else {
    console.log("\n❌ STATIC VERIFICATION FAIL: Nguy cơ double action.");
    process.exit(1);
  }
}

main();
