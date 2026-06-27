import { UserRole, DocumentStatus } from "@prisma/client";
import { 
  canViewDocument, 
  canUploadToFolder, 
  canEditDocumentMetadata, 
  canDeleteDocument, 
  canChangeDocumentStatus,
  SessionUser,
  FolderContext,
  DocumentContext
} from "../src/lib/documents/permissions";

const admin: SessionUser = { id: 'admin1', role: UserRole.ADMIN };
const engineer: SessionUser = { id: 'eng1', role: UserRole.ENGINEER };
const accountant: SessionUser = { id: 'acc1', role: UserRole.ACCOUNTANT };
const guest: SessionUser = { id: 'guest1', role: UserRole.STAFF };

const techFolder: FolderContext = { id: 'f1', name: 'Bản vẽ kỹ thuật' };
const accFolder: FolderContext = { id: 'f2', name: 'Hợp đồng & Thanh toán' };
const docTech: DocumentContext = { id: 'd1', status: DocumentStatus.SUBMITTED, uploadedById: 'eng1' };
const docAcc: DocumentContext = { id: 'd2', status: DocumentStatus.SUBMITTED, uploadedById: 'acc1' };
const docApproved: DocumentContext = { id: 'd3', status: DocumentStatus.APPROVED, uploadedById: 'eng1' };

console.log("=== KIỂM TRA PHÂN QUYỀN TRỰC TIẾP MODULE DOCUMENTS (UNIT TEST RBAC) ===\n");
console.log("Lưu ý: Đây là kiểm thử unit/logic permission thuần, chưa phải E2E API test.\n");

console.log("[1] Tải lên tài liệu (Upload)");
console.log("- Admin upload vào thư mục kỹ thuật:", canUploadToFolder(admin, techFolder) ? "PASS" : "FAIL");
console.log("- Engineer upload vào thư mục kỹ thuật:", canUploadToFolder(engineer, techFolder) ? "PASS" : "FAIL");
console.log("- Engineer upload vào thư mục kế toán:", !canUploadToFolder(engineer, accFolder) ? "PASS (Bị chặn đúng)" : "FAIL");
console.log("- Accountant upload vào thư mục kế toán:", canUploadToFolder(accountant, accFolder) ? "PASS" : "FAIL");
console.log("- Accountant upload vào thư mục kỹ thuật:", !canUploadToFolder(accountant, techFolder) ? "PASS (Bị chặn đúng)" : "FAIL");
console.log("- Staff upload vào thư mục kỹ thuật:", !canUploadToFolder(guest, techFolder) ? "PASS (Bị chặn đúng)" : "FAIL\n");

console.log("[2] Chỉnh sửa tài liệu (Edit Metadata & Rename)");
console.log("- Engineer sửa file của mình trong thư mục kỹ thuật:", canEditDocumentMetadata(engineer, docTech, techFolder) ? "PASS" : "FAIL");
console.log("- Engineer sửa file của kế toán:", !canEditDocumentMetadata(engineer, docAcc, accFolder) ? "PASS (Bị chặn đúng)" : "FAIL");
console.log("- Engineer sửa file đã DUYỆT (APPROVED):", !canEditDocumentMetadata(engineer, docApproved, techFolder) ? "PASS (Bị chặn đúng)" : "FAIL\n");

console.log("[3] Xóa tài liệu (Delete)");
console.log("- Engineer xóa file của mình:", canDeleteDocument(engineer, docTech, techFolder) ? "PASS" : "FAIL");
console.log("- Engineer xóa file của kế toán:", !canDeleteDocument(engineer, docAcc, accFolder) ? "PASS (Bị chặn đúng)" : "FAIL");
console.log("- Admin xóa file bất kỳ chưa duyệt:", canDeleteDocument(admin, docAcc, accFolder) ? "PASS" : "FAIL");
console.log("- Kế toán xóa file đã DUYỆT (APPROVED):", !canDeleteDocument(accountant, { ...docAcc, status: DocumentStatus.APPROVED }, accFolder) ? "PASS (Bị chặn đúng)" : "FAIL\n");

console.log("=> Mọi kiểm tra quyền hoàn tất.");
