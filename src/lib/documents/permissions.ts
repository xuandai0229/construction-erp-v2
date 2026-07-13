import { DocumentStatus, ProjectRole, UserRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  role: UserRole;
  projectRole?: ProjectRole | null;
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
  UserRole.DEPUTY_DIRECTOR,
];

const IMMUTABLE_DOCUMENT_STATUSES: DocumentStatus[] = [
  DocumentStatus.APPROVED,
  DocumentStatus.ARCHIVED,
  DocumentStatus.SUPERSEDED,
];

export function isDocumentContentLocked(status: DocumentStatus) {
  return IMMUTABLE_DOCUMENT_STATUSES.includes(status);
}

function isProjectViewer(user: SessionUser) {
  return user.projectRole === ProjectRole.VIEWER;
}

function isAccountant(role: UserRole) {
  return role === UserRole.ACCOUNTANT;
}

function isEngineerOrManager(role: UserRole) {
  const engineerRoles: UserRole[] = [
    UserRole.CHIEF_COMMANDER,
    UserRole.MANAGER,
    UserRole.ENGINEER,
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

export function canViewDocument(_user: SessionUser, _document: DocumentContext) {
  return true;
}

export function canDownloadDocument(_user: SessionUser, _document: DocumentContext) {
  return true;
}

export function canCreateFolder(user: SessionUser) {
  if (FULL_ACCESS_ROLES.includes(user.role)) return true;
  if (isProjectViewer(user)) return false;
  return Boolean(user.projectRole);
}

export function canUploadToFolder(user: SessionUser, folder: FolderContext) {
  if (FULL_ACCESS_ROLES.includes(user.role)) return true;
  if (isProjectViewer(user)) return false;

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
  if (isProjectViewer(user)) return false;

  if (user.role === UserRole.ENGINEER && document.uploadedById !== user.id) {
    return false;
  }

  if (isEngineerOrManager(user.role)) {
    return folderMatches(folder.name, ENGINEERING_FOLDER_KEYWORDS);
  }

  if (isAccountant(user.role)) {
    return folderMatches(folder.name, ACCOUNTING_FOLDER_KEYWORDS);
  }

  return false;
}

export function canChangeDocumentStatus(user: SessionUser, _document: DocumentContext) {
  if (FULL_ACCESS_ROLES.includes(user.role)) return true;
  if (isProjectViewer(user)) return false;
  return user.role === UserRole.MANAGER || user.role === UserRole.CHIEF_COMMANDER;
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
  if (isProjectViewer(user)) return false;

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
  return canEditDocumentMetadata(user, document, folder);
}

export function canRenameFolder(user: SessionUser, _folder: FolderContext) {
  if (isProjectViewer(user)) return false;
  return FULL_ACCESS_ROLES.includes(user.role);
}

export function canDeleteFolder(user: SessionUser, _folder: FolderContext) {
  if (isProjectViewer(user)) return false;
  return FULL_ACCESS_ROLES.includes(user.role);
}
