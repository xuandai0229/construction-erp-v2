/**
 * HR Module - Phase 1 Core Foundation
 * Barrel index for all HR domain services.
 */

// PII Encryption
export {
  normalizeIdentityNumber,
  encryptIdentityNumber,
  decryptIdentityNumber,
  generateIdentityBlindIndex,
  maskIdentityNumber,
  serializeEnvelope,
  deserializeEnvelope,
  type PiiEncryptionEnvelope,
} from "./pii-encryption";

// Employee Code Generator
export {
  getCurrentVietnamYear,
  formatEmployeeCode,
  generateNextEmployeeCode,
  generateEmployeeCodeWithRetry,
} from "./employee-code-generator";

// Employee Service
export {
  createEmployee,
  updateEmployee,
  findEmployeeByIdentityNumber,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "./employee-service";

// Organization Service
export {
  createOrganizationUnit,
  validateOrgUnitHierarchy,
  assignEmployeeToOrganization,
  type CreateOrgUnitInput,
  type AssignEmployeeOrgInput,
} from "./organization-service";

// Project Assignment Service
export {
  createProjectAssignment,
  releaseEmployeeFromProject,
  type CreateAssignmentInput,
} from "./project-assignment-service";

// Permission Service
export {
  CANONICAL_HR_PERMISSIONS,
  seedHrPermissions,
  resolveUserHrPermission,
  type HrPermissionCheckResult,
  type PermissionCheckContext,
} from "./permission-service";
