import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log("=== KIỂM TRA LIMIT HỢP ĐỒNG (STATIC AUDIT) ===\n");
  
  const actionPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'accounting', 'actions.ts');
  const code = fs.readFileSync(actionPath, 'utf-8');

  const hasAssertLimitDef = code.includes('function assertContractPaymentLimit');
  const hasAssertLimitInCreate = code.includes('await assertContractPaymentLimit({ contractId, totalAmount });');
  const hasAssertLimitInUpdate = code.includes('await assertContractPaymentLimit({ contractId, totalAmount, excludePaymentRequestId: id });');

  console.log(`- Định nghĩa assertContractPaymentLimit: ${hasAssertLimitDef ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Gọi trong createPaymentRequest: ${hasAssertLimitInCreate ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Gọi trong updatePaymentRequest (có exclude): ${hasAssertLimitInUpdate ? '✅ CÓ' : '❌ KHÔNG'}`);

  if (hasAssertLimitDef && hasAssertLimitInCreate && hasAssertLimitInUpdate) {
    console.log("\n✅ STATIC VERIFICATION PASS: Logic chặn vượt hợp đồng an toàn.");
  } else {
    console.log("\n❌ STATIC VERIFICATION FAIL: Hàm xóa chưa chặn đề nghị thanh toán liên kết.");
    process.exit(1);
  }
}

main();
