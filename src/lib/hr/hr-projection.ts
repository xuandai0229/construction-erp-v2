import { SensitiveFieldPolicy } from "@prisma/client";
import { maskIdentityNumber, decryptIdentityNumber, parseEnvelope } from "./pii-encryption";

export interface EmployeeListDTO {
  id: string;
  code: string;
  fullName: string;
  gender: string | null;
  status: string;
  joinedDate: string;
  resignedDate: string | null;
  currentDepartmentName: string | null;
  currentDepartmentCode: string | null;
  currentPositionTitle: string | null;
  phoneNumber: string | null;
  personalEmail: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  updatedAt: string;
}

export interface EmployeeDetailDTO extends EmployeeListDTO {
  dateOfBirth: string | null;
  maskedIdentityNumber: string | null;
  createdById: string | null;
  updatedById: string | null;
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  return `${localPart.slice(0, 1)}***@${domain}`;
}

/**
 * Projects Employee entity for list views according to SensitiveFieldPolicy.
 * Never includes raw encryption fields (identityNumberEncrypted, identityNumberBlindIndex).
 */
export function projectEmployeeForList(
  employee: any,
  policy: SensitiveFieldPolicy
): EmployeeListDTO {
  const assignments = employee.orgAssignments ?? employee.organizationAssignments ?? [];
  const primaryAssignment = assignments.find(
    (a: any) => a.isPrimary && !a.endDate
  ) || assignments[0];

  const canSeeContact = policy !== SensitiveFieldPolicy.BASIC_ONLY;

  return {
    id: employee.id,
    code: employee.code,
    fullName: employee.fullName,
    gender: employee.gender || null,
    status: employee.status,
    joinedDate: employee.joinedDate ? new Date(employee.joinedDate).toISOString() : "",
    resignedDate: employee.resignedDate ? new Date(employee.resignedDate).toISOString() : null,
    currentDepartmentName: primaryAssignment?.organizationUnit?.name || null,
    currentDepartmentCode: primaryAssignment?.organizationUnit?.code || null,
    currentPositionTitle: primaryAssignment?.position?.title || null,
    phoneNumber: canSeeContact ? employee.phoneNumber || null : null,
    personalEmail: canSeeContact ? employee.personalEmail || null : null,
    userId: employee.user?.id || employee.userId || null,
    userEmail: canSeeContact ? employee.user?.email || null : maskEmail(employee.user?.email),
    userName: employee.user?.name || null,
    updatedAt: employee.updatedAt ? new Date(employee.updatedAt).toISOString() : "",
  };
}

/**
 * Projects Employee entity for detail view.
 */
export function projectEmployeeForDetail(
  employee: any,
  policy: SensitiveFieldPolicy
): EmployeeDetailDTO {
  const listDto = projectEmployeeForList(employee, policy);

  let maskedIdentity: string | null = null;
  if (employee.identityNumberLastDigits) {
    maskedIdentity = maskIdentityNumber(employee.identityNumberLastDigits);
  }

  return {
    ...listDto,
    dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString() : null,
    maskedIdentityNumber: maskedIdentity,
    createdById: employee.createdById || null,
    updatedById: employee.updatedById || null,
  };
}

/**
 * Decrypts sensitive identity number if caller has required policy.
 * Returns plain identity number for temporary single view.
 */
export function decryptIdentityNumberForUser(
  employee: any,
  policy: SensitiveFieldPolicy
): string | null {
  if (policy !== SensitiveFieldPolicy.IDENTITY && policy !== SensitiveFieldPolicy.FULL) {
    return null;
  }

  if (!employee.identityNumberEncrypted) {
    return null;
  }

  try {
    const envelope = parseEnvelope(employee.identityNumberEncrypted);
    return decryptIdentityNumber(envelope);
  } catch (error) {
    console.error("Failed to decrypt identity number:", error);
    return null;
  }
}
