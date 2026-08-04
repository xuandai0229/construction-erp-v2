import { PrismaClient, EmployeeStatus } from "@prisma/client";
import { generateNextEmployeeCode } from "./employee-code-generator";
import {
  encryptIdentityNumber,
  generateIdentityBlindIndex,
  serializeEnvelope,
  maskIdentityNumber,
  normalizeIdentityNumber,
} from "./pii-encryption";

export interface CreateEmployeeInput {
  fullName: string;
  joinedDate: Date;
  userId?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | null;
  phoneNumber?: string | null;
  personalEmail?: string | null;
  status?: EmployeeStatus;
  identityNumber?: string | null;
  createdById?: string | null;
}

export interface UpdateEmployeeInput {
  fullName?: string;
  gender?: string | null;
  dateOfBirth?: Date | null;
  phoneNumber?: string | null;
  personalEmail?: string | null;
  status?: EmployeeStatus;
  identityNumber?: string | null;
  resignedDate?: Date | null;
  updatedById?: string | null;
}

type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
type PrismaLike = PrismaClient | PrismaTransactionClient;

/**
 * Creates a new Employee with atomic code generation, PII encryption, and audit log.
 */
export async function createEmployee(
  prisma: PrismaLike,
  input: CreateEmployeeInput
) {
  let identityNumberEncrypted: string | null = null;
  let identityNumberBlindIndex: string | null = null;
  let identityNumberLastDigits: string | null = null;

  if (input.identityNumber) {
    const normalized = normalizeIdentityNumber(input.identityNumber);
    const blindIndex = generateIdentityBlindIndex(normalized);

    // Check unique blind index
    const existing = await prisma.employee.findUnique({
      where: { identityNumberBlindIndex: blindIndex },
    });
    if (existing) {
      throw new Error("An employee with this identity number already exists");
    }

    const envelope = encryptIdentityNumber(normalized);
    identityNumberEncrypted = serializeEnvelope(envelope);
    identityNumberBlindIndex = blindIndex;
    identityNumberLastDigits = normalized.slice(-4);
  }

  const executeCreate = async (tx: PrismaTransactionClient) => {
    const code = await generateNextEmployeeCode(tx);

    const employee = await tx.employee.create({
      data: {
        code,
        userId: input.userId || null,
        fullName: input.fullName.trim(),
        gender: input.gender || null,
        dateOfBirth: input.dateOfBirth || null,
        phoneNumber: input.phoneNumber || null,
        personalEmail: input.personalEmail || null,
        joinedDate: input.joinedDate,
        status: input.status || EmployeeStatus.ACTIVE,
        identityNumberEncrypted,
        identityNumberBlindIndex,
        identityNumberLastDigits,
        createdById: input.createdById || null,
      },
    });

    if (input.createdById) {
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: employee.id,
          changeType: "EMPLOYEE_CREATED",
          performedById: input.createdById,
          reason: "Initial employee creation",
          details: {
            code: employee.code,
            status: employee.status,
            maskedIdentity: input.identityNumber ? maskIdentityNumber(input.identityNumber) : null,
          },
        },
      });
    }

    return employee;
  };

  if (!("$transaction" in prisma)) {
    return executeCreate(prisma);
  }

  return (prisma as PrismaClient).$transaction(executeCreate);
}

/**
 * Updates Employee profile and records audit history.
 */
export async function updateEmployee(
  prisma: PrismaLike,
  employeeId: string,
  input: UpdateEmployeeInput
) {
  const current = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!current) {
    throw new Error(`Employee with ID ${employeeId} not found`);
  }

  let identityNumberEncrypted: string | undefined = undefined;
  let identityNumberBlindIndex: string | undefined = undefined;
  let identityNumberLastDigits: string | undefined = undefined;

  if (input.identityNumber !== undefined) {
    if (input.identityNumber === null || input.identityNumber === "") {
      identityNumberEncrypted = null as any;
      identityNumberBlindIndex = null as any;
      identityNumberLastDigits = null as any;
    } else {
      const normalized = normalizeIdentityNumber(input.identityNumber);
      const blindIndex = generateIdentityBlindIndex(normalized);

      const existing = await prisma.employee.findFirst({
        where: {
          identityNumberBlindIndex: blindIndex,
          NOT: { id: employeeId },
        },
      });
      if (existing) {
        throw new Error("An employee with this identity number already exists");
      }

      const envelope = encryptIdentityNumber(normalized);
      identityNumberEncrypted = serializeEnvelope(envelope);
      identityNumberBlindIndex = blindIndex;
      identityNumberLastDigits = normalized.slice(-4);
    }
  }

  const executeUpdate = async (tx: PrismaTransactionClient) => {
    const updated = await tx.employee.update({
      where: { id: employeeId },
      data: {
        fullName: input.fullName !== undefined ? input.fullName.trim() : undefined,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        phoneNumber: input.phoneNumber,
        personalEmail: input.personalEmail,
        status: input.status,
        resignedDate: input.resignedDate,
        identityNumberEncrypted,
        identityNumberBlindIndex,
        identityNumberLastDigits,
        updatedById: input.updatedById,
      },
    });

    if (input.updatedById) {
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: updated.id,
          changeType: "EMPLOYEE_PROFILE_UPDATED",
          performedById: input.updatedById,
          reason: "Employee profile updated",
          details: {
            updatedFields: Object.keys(input).filter((k) => k !== "updatedById"),
          },
        },
      });
    }

    return updated;
  };

  if (!("$transaction" in prisma)) {
    return executeUpdate(prisma);
  }

  return (prisma as PrismaClient).$transaction(executeUpdate);
}

/**
 * Searches an employee by plaintext identity number via HMAC Blind Index.
 */
export async function findEmployeeByIdentityNumber(
  prisma: PrismaLike,
  identityNumber: string
) {
  const normalized = normalizeIdentityNumber(identityNumber);
  const blindIndex = generateIdentityBlindIndex(normalized);

  return prisma.employee.findUnique({
    where: { identityNumberBlindIndex: blindIndex },
  });
}
