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

const ACCOUNTING_FOLDER_KEYWORDS = [
  "hop dong",
  "phap ly",
  "phu luc",
  "bao lanh",
  "bao hiem",
  "du toan",
  "hoa don",
  "chung tu",
  "bao gia",
  "thanh toan",
  "quyet toan",
  "tam ung",
  "ho so thanh toan",
];

const ENGINEERING_FOLDER_KEYWORDS = [
  "ban ve",
  "thiet ke",
  "kien truc",
  "ket cau",
  "mep",
  "pccc",
  "shopdrawing",
  "nghiem thu",
  "vat lieu",
  "vat tu",
  "phieu nhap",
  "phieu xuat",
  "hinh anh",
  "tien do",
  "bao cao",
  "hien truong",
  "su co",
  "an toan",
];

const FULL_ACCESS_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR
];

const IMMUTABLE_DOCUMENT_STATUSES: DocumentStatus[] = [
  DocumentStatus.APPROVED,
  DocumentStatus.ARCHIVED,
  DocumentStatus.SUPERSEDED,
];

export function isDocumentContentLocked(status: DocumentStatus) {
  return IMMUTABLE_DOCUMENT_STATUSES.includes(status);
}

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

function normalizeFolderName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/^\d+[\s.]+/, "")
    .toLowerCase()
    .trim();
}

function folderMatches(name: string, keywords: string[]) {
  const normalized = normalizeFolderName(name);
  return keywords.some((keyword) => normalized.includes(keyword));
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
    return folderMatches(folder.name, ACCOUNTING_FOLDER_KEYWORDS);
  }

  if (isEngineerOrManager(user.role)) {
    return folderMatches(folder.name, ENGINEERING_FOLDER_KEYWORDS);
  }

  return false;
}

export function canEditDocumentMetadata(user: SessionUser, document: DocumentContext, folder: FolderContext) {
  if (isDocumentContentLocked(document.status)) return false;

  if (FULL_ACCESS_ROLES.includes(user.role)) return true;

  // Với ENGINEER, chỉ được sửa file của mình
  if (user.role === UserRole.ENGINEER && document.uploadedById !== user.id) {
    return false;
  }

  // Quản lý kỹ thuật hoặc kỹ sư sửa trong thư mục kỹ thuật
  if (isEngineerOrManager(user.role)) {
    return folderMatches(folder.name, ENGINEERING_FOLDER_KEYWORDS);
  }

  // Kế toán sửa trong thư mục kế toán
  if (isAccountant(user.role)) {
    return folderMatches(folder.name, ACCOUNTING_FOLDER_KEYWORDS);
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

export function isValidDocumentStatusTransition(
  current: DocumentStatus,
  next: DocumentStatus,
): boolean {
  const allowedTransitions: Partial<Record<DocumentStatus, DocumentStatus[]>> = {
    DRAFT: [DocumentStatus.SUBMITTED],
    SUBMITTED: [DocumentStatus.APPROVED, DocumentStatus.REJECTED],
    REJECTED: [DocumentStatus.SUBMITTED],
  };

  return allowedTransitions[current]?.includes(next) ?? false;
}

export function canDeleteDocument(user: SessionUser, document: DocumentContext, folder: FolderContext) {
  if (isDocumentContentLocked(document.status)) return false;

  if (FULL_ACCESS_ROLES.includes(user.role)) return true;

  // Chỉ cho xóa file của chính mình
  if (document.uploadedById !== user.id) return false;

  if (isAccountant(user.role)) {
    return folderMatches(folder.name, ACCOUNTING_FOLDER_KEYWORDS);
  }

  if (isEngineerOrManager(user.role)) {
    return folderMatches(folder.name, ENGINEERING_FOLDER_KEYWORDS);
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
