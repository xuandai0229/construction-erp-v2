import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log("=== KIỂM TRA ĐỒNG BỘ MODULE GỐC (STATIC AUDIT) ===\n");
  
  const actionPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'approvals', 'actions.ts');
  const code = fs.readFileSync(actionPath, 'utf-8');

  const hasSyncDef = code.includes('function syncSourceOnApprovalTx');
  const hasSyncInApprove = code.includes('syncSourceOnApprovalTx(tx, approval, actor.id, "APPROVED"');
  const hasSyncInReject = code.includes('syncSourceOnApprovalTx(tx, approval, actor.id, "REJECTED"');
  const hasPaymentSync = code.includes('case "PAYMENT":') && code.includes('tx.paymentRequest.update');
  const hasContractSync = code.includes('case "CONTRACT":') && code.includes('tx.contract.update');
  const hasMaterialSync = code.includes('case "MATERIAL":') && code.includes('tx.materialRequest.update');
  const hasReportSync = code.includes('case "REPORT":') && code.includes('tx.siteReport.update');

  const hasSourceGuard = code.includes('throw new Error("Không thể duyệt vì yêu cầu phê duyệt không có bản ghi gốc để đồng bộ.");');
  const hasUnsupportedGuard = code.includes('throw new Error("Loại phê duyệt này chưa hỗ trợ đồng bộ tự động. Vui lòng xử lý ở phân hệ gốc.");');
  const hasPaymentRejectReason = code.includes('rejectedReason: note ?? undefined');

  console.log(`- Có helper syncSourceOnApprovalTx: ${hasSyncDef ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Gọi sync trong Approve: ${hasSyncInApprove ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Gọi sync trong Reject: ${hasSyncInReject ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Hỗ trợ sync PAYMENT: ${hasPaymentSync ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Hỗ trợ sync CONTRACT: ${hasContractSync ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Hỗ trợ sync MATERIAL: ${hasMaterialSync ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Hỗ trợ sync REPORT: ${hasReportSync ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Không cho phép thiếu sourceId: ${hasSourceGuard ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Có thông báo loại chưa hỗ trợ: ${hasUnsupportedGuard ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- Payment Reject có ghi nhận lý do: ${hasPaymentRejectReason ? '✅ CÓ' : '❌ KHÔNG'}`);

  if (hasSyncDef && hasSyncInApprove && hasSyncInReject && hasPaymentSync && hasSourceGuard && hasUnsupportedGuard && hasPaymentRejectReason) {
    console.log("\n✅ STATIC VERIFICATION PASS: Logic đồng bộ module gốc đã được nhúng an toàn.");
  } else {
    console.log("\n❌ STATIC VERIFICATION FAIL: Thiếu logic đồng bộ hoặc bảo mật chưa đủ.");
    process.exit(1);
  }
}

main();
