import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log("=== KIỂM TRA BẢO VỆ TRẠNG THÁI THANH TOÁN (STATIC AUDIT) ===\n");
  
  const actionPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'accounting', 'actions.ts');
  const code = fs.readFileSync(actionPath, 'utf-8');

  const hasAssertEditableDef = code.includes('function assertPaymentEditable(status: string)');
  const hasAssertDeletableDef = code.includes('function assertPaymentDeletable(status: string)');
  const hasEditableCall = code.includes('assertPaymentEditable(pr.status);');
  const hasDeletableCall = code.includes('assertPaymentDeletable(pr.status);');

  console.log(`- Định nghĩa assertPaymentEditable: ${hasAssertEditableDef ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Định nghĩa assertPaymentDeletable: ${hasAssertDeletableDef ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Gọi assertPaymentEditable trong update: ${hasEditableCall ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Gọi assertPaymentDeletable trong delete: ${hasDeletableCall ? '✅ CÓ' : '❌ KHÔNG'}`);

  if (hasAssertEditableDef && hasAssertDeletableDef && hasEditableCall && hasDeletableCall) {
    console.log("\n✅ STATIC VERIFICATION PASS: Logic chặn update/delete an toàn.");
  } else {
    console.log("\n❌ STATIC VERIFICATION FAIL: Hàm xóa chưa chặn đề nghị thanh toán liên kết.");
    process.exit(1);
  }
}

main();
