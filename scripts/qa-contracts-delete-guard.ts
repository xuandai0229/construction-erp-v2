import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log("=== KIỂM TRA ĐIỀU KIỆN XÓA HỢP ĐỒNG (STATIC AUDIT) ===\n");
  
  const actionPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'contracts', 'actions.ts');
  const code = fs.readFileSync(actionPath, 'utf-8');

  // Kiểm tra khối _count trong deleteContract
  const deleteFuncMatch = code.match(/export async function deleteContract[\s\S]*?\n}/);
  if (!deleteFuncMatch) {
    console.log("❌ Không tìm thấy hàm deleteContract.");
    return;
  }
  
  const deleteCode = deleteFuncMatch[0];

  const hasPaymentPlansInclude = deleteCode.includes('paymentPlans: true');
  const hasPaymentRequestsInclude = deleteCode.includes('paymentRequests: true');

  console.log(`- Include paymentPlans trong _count: ${hasPaymentPlansInclude ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Include paymentRequests trong _count: ${hasPaymentRequestsInclude ? '✅ CÓ' : '❌ KHÔNG'}`);

  const checksPaymentPlans = deleteCode.includes('contract._count.paymentPlans > 0');
  const checksPaymentRequests = deleteCode.includes('contract._count.paymentRequests > 0');

  console.log(`- Điều kiện chặn xóa khi có paymentPlans: ${checksPaymentPlans ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Điều kiện chặn xóa khi có paymentRequests: ${checksPaymentRequests ? '✅ CÓ' : '❌ KHÔNG'}`);

  if (hasPaymentRequestsInclude && checksPaymentRequests) {
    console.log("\n✅ STATIC VERIFICATION PASS: Logic chặn xóa đã an toàn, hợp đồng có đề nghị thanh toán không thể bị xóa.");
  } else {
    console.log("\n❌ STATIC VERIFICATION FAIL: Hàm xóa chưa chặn đề nghị thanh toán liên kết.");
  }
}

main();
