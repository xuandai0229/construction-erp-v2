import { UserRole, DocumentStatus } from "@prisma/client";

export type SessionUser = {
  id: string;
  role: UserRole;
  // Bỏ qua project roles vì Phase này làm chung hệ thống
};

export type DocumentContext = {
  id: string;
  status: DocumentStatus;
  uploadedById: string;
};

export type FolderContext = {
  id: string;
  name: string;
};

const ACCOUNTING_FOLDERS = [
  "01. Hợp đồng",
  "03. Dự toán",
  "05. Hóa đơn",
  "06. Thanh toán"
];

const ENGINEERING_FOLDERS = [
  "02. Bản vẽ",
  "04. Nghiệm thu",
  "07. Hình ảnh hiện trường",
  "08. Báo cáo ngày"
];

const FULL_ACCESS_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR
];

function isAccountant(role: UserRole) {
  return role === UserRole.ACCOUNTANT;
}

function isEngineerOrManager(role: UserRole) {
  const engineerRoles: UserRole[] = [
    UserRole.CHIEF_COMMANDER,
    UserRole.MANAGER,
    UserRole.ENGINEER
  ];
  return engineerRoles.includes(role);
}

export function canViewDocument(user: SessionUser, document: DocumentContext) {
  // Phase này mọi role đều xem được nếu có session hợp lệ
  return true;
}

export function canDownloadDocument(user: SessionUser, document: DocumentContext) {
  return true;
}

export function canUploadToFolder(user: SessionUser, folder: FolderContext) {
  if (FULL_ACCESS_ROLES.includes(user.role)) return true;

  if (isAccountant(user.role)) {
    return ACCOUNTING_FOLDERS.some(f => folder.name.includes(f));
  }

  if (isEngineerOrManager(user.role)) {
    return ENGINEERING_FOLDERS.some(f => folder.name.includes(f));
  }

  return false;
}

export function canEditDocumentMetadata(user: SessionUser, document: DocumentContext, folder: FolderContext) {
  if (FULL_ACCESS_ROLES.includes(user.role)) return true;

  // Nếu là file đã APPROVED, chỉ FULL_ACCESS_ROLES mới được sửa
  if (document.status === DocumentStatus.APPROVED) return false;

  // Với ENGINEER, chỉ được sửa file của mình
  if (user.role === UserRole.ENGINEER && document.uploadedById !== user.id) {
    return false;
  }

  // Quản lý kỹ thuật hoặc kỹ sư sửa trong thư mục kỹ thuật
  if (isEngineerOrManager(user.role)) {
    return ENGINEERING_FOLDERS.some(f => folder.name.includes(f));
  }

  // Kế toán sửa trong thư mục kế toán
  if (isAccountant(user.role)) {
    return ACCOUNTING_FOLDERS.some(f => folder.name.includes(f));
  }

  return false;
}

export function canChangeDocumentStatus(user: SessionUser, document: DocumentContext) {
  if (FULL_ACCESS_ROLES.includes(user.role)) return true;

  // Quản lý được phép duyệt/từ chối
  if (user.role === UserRole.MANAGER || user.role === UserRole.CHIEF_COMMANDER) {
    return true;
  }
  
  // ENGINEER và ACCOUNTANT không được tự đổi status duyệt
  return false;
}

export function canDeleteDocument(user: SessionUser, document: DocumentContext, folder: FolderContext) {
  if (FULL_ACCESS_ROLES.includes(user.role)) return true;

  // Không ai được xóa file APPROVED ngoại trừ cấp lãnh đạo
  if (document.status === DocumentStatus.APPROVED) return false;

  // Chỉ cho xóa file của chính mình
  if (document.uploadedById !== user.id) return false;

  if (isAccountant(user.role)) {
    return ACCOUNTING_FOLDERS.some(f => folder.name.includes(f));
  }

  if (isEngineerOrManager(user.role)) {
    return ENGINEERING_FOLDERS.some(f => folder.name.includes(f));
  }

  return false;
}

export function canRenameDocument(user: SessionUser, document: DocumentContext, folder: FolderContext) {
  // Rename tương đương với edit metadata
  return canEditDocumentMetadata(user, document, folder);
}

export function canRenameFolder(user: SessionUser, folder: FolderContext) {
  // Chỉ lãnh đạo được đổi tên thư mục gốc
  return FULL_ACCESS_ROLES.includes(user.role);
}

export function canDeleteFolder(user: SessionUser, folder: FolderContext) {
  // Chỉ lãnh đạo được xóa thư mục
  return FULL_ACCESS_ROLES.includes(user.role);
}
