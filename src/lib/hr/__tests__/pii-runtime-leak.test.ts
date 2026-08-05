import { describe, it, expect } from "vitest";
import { projectEmployeeForList, projectEmployeeForDetail } from "../hr-projection";
import { SensitiveFieldPolicy } from "@prisma/client";
import { sanitizeEmployeeTransferAudit, sanitizeOrganizationUnitAudit } from "../../audit-sanitizer";

describe("PII Runtime Leak Protection & Audit Sanitization", () => {
  const mockRawEmployee = {
    id: "emp-123",
    code: "NV-2026-0001",
    fullName: "Nguyen Van A",
    gender: "MALE",
    status: "ACTIVE",
    joinedDate: new Date("2026-01-01"),
    resignedDate: null,
    phoneNumber: "0901234567",
    personalEmail: "nguyenvana@gmail.com",
    identityNumberEncrypted: "v1:IV_STRING:TAG_STRING:CIPHERTEXT_STRING",
    identityNumberBlindIndex: "HMAC_BLIND_INDEX_VALUE",
    identityNumberLastDigits: "5678",
    encryptionKeyVersion: 1,
    userId: "user-123",
    user: { id: "user-123", email: "usera@company.com", name: "Nguyen Van A" },
    orgAssignments: [
      {
        isPrimary: true,
        endDate: null,
        organizationUnit: { code: "NS", name: "Phòng Nhân Sự" },
        position: { title: "Chuyên Viên" },
      },
    ],
  };

  it("projectEmployeeForList MUST NOT contain any raw PII encryption fields", () => {
    const listDto: any = projectEmployeeForList(mockRawEmployee, SensitiveFieldPolicy.CONTACT);

    expect(listDto.identityNumberEncrypted).toBeUndefined();
    expect(listDto.identityNumberBlindIndex).toBeUndefined();
    expect(listDto.encryptionKeyVersion).toBeUndefined();
    expect(listDto.ciphertext).toBeUndefined();
    expect(listDto.authTag).toBeUndefined();
    expect(listDto.iv).toBeUndefined();

    // Verify allowed fields
    expect(listDto.code).toBe("NV-2026-0001");
    expect(listDto.fullName).toBe("Nguyen Van A");
  });

  it("projectEmployeeForDetail MUST NOT contain raw encryption fields and MUST produce masked identity string", () => {
    const detailDto: any = projectEmployeeForDetail(mockRawEmployee, SensitiveFieldPolicy.CONTACT);

    expect(detailDto.identityNumberEncrypted).toBeUndefined();
    expect(detailDto.identityNumberBlindIndex).toBeUndefined();
    expect(detailDto.encryptionKeyVersion).toBeUndefined();
    expect(detailDto.ciphertext).toBeUndefined();

    expect(detailDto.maskedIdentityNumber).toBe("********5678");
  });

  it("AuditSanitizer MUST redact plaintext identity numbers from audit logs", () => {
    const rawAuditPayload = {
      id: "assign-1",
      employeeId: "emp-123",
      identityNumber: "012345678901",
      identityNumberEncrypted: "v1:IV:TAG:CIPHERTEXT",
    };

    const sanitized: any = sanitizeEmployeeTransferAudit(rawAuditPayload);
    const jsonString = JSON.stringify(sanitized);

    expect(jsonString).not.toContain("012345678901");
    expect(jsonString).not.toContain("v1:IV:TAG:CIPHERTEXT");
  });
});
