import { describe, it, expect } from "vitest";
import {
  sanitizeAuditData,
  sanitizeOrganizationUnitAudit,
  sanitizePositionAudit,
  sanitizeManagerAssignmentAudit,
  sanitizeEmployeeTransferAudit,
} from "@/lib/audit-sanitizer";

describe("Audit Data Sanitizer & Allowlist Enforcement", () => {
  it("strips out sensitive identity numbers, phone numbers, and secrets using general sanitizer", () => {
    const rawData = {
      employeeId: "emp_123",
      organizationUnitId: "unit_456",
      identityNumber: "012345678901",
      phoneNumber: "0912345678",
      personalEmail: "test@example.com",
      decisionNo: "QD-101",
      password: "my-password",
      secret: "super-secret-token",
    };

    const clean = sanitizeAuditData(rawData) as Record<string, unknown>;

    expect(clean.employeeId).toBe("emp_123");
    expect(clean.password).toBe("[REDACTED]");
    expect(clean.secret).toBe("[REDACTED]");
  });

  it("strictly enforces allowlist on Employee Transfer payload (stripping PII, ciphertext, and unlisted fields)", () => {
    const rawPayload = {
      employeeId: "emp_999",
      previousOrganizationUnitId: "unit_A",
      newOrganizationUnitId: "unit_B",
      previousPositionId: "pos_1",
      newPositionId: "pos_2",
      effectiveDate: "2026-08-04",
      decisionNumber: "QD-TRANS-01",
      result: "SUCCESS",
      // Forbidden PII & Secrets
      fullName: "Nguyễn Văn Biến Động",
      phoneNumber: "0900000000",
      phone: "0900000000",
      personalEmail: "hacker@test.com",
      identityNumberEncrypted: "CIPHERTEXT_ABC_123",
      identityNumberBlindIndex: "BLIND_INDEX_XYZ",
      identityNumberLastDigits: "1234",
      address: "123 Street",
      password: "secret_password",
      token: "jwt_token_here",
      secret: "api_secret",
      unlistedNewField: "should_be_omitted",
      prismaEntityFullObject: { id: "123", dummy: true },
    };

    const clean = sanitizeEmployeeTransferAudit(rawPayload);

    // Verify allowed fields present
    expect(clean).toEqual({
      employeeId: "emp_999",
      previousOrganizationUnitId: "unit_A",
      newOrganizationUnitId: "unit_B",
      previousPositionId: "pos_1",
      newPositionId: "pos_2",
      effectiveDate: "2026-08-04",
      decisionNumber: "QD-TRANS-01",
      result: "SUCCESS",
    });

    // Verify PII & unlisted fields stripped
    expect(clean).not.toHaveProperty("fullName");
    expect(clean).not.toHaveProperty("phoneNumber");
    expect(clean).not.toHaveProperty("phone");
    expect(clean).not.toHaveProperty("personalEmail");
    expect(clean).not.toHaveProperty("identityNumberEncrypted");
    expect(clean).not.toHaveProperty("identityNumberBlindIndex");
    expect(clean).not.toHaveProperty("identityNumberLastDigits");
    expect(clean).not.toHaveProperty("address");
    expect(clean).not.toHaveProperty("password");
    expect(clean).not.toHaveProperty("token");
    expect(clean).not.toHaveProperty("secret");
    expect(clean).not.toHaveProperty("unlistedNewField");
    expect(clean).not.toHaveProperty("prismaEntityFullObject");
  });

  it("strictly enforces allowlist on Organization Unit audit payload", () => {
    const rawPayload = {
      id: "unit_123",
      code: "PB-KT",
      name: "Phòng Kế toán",
      parentId: "unit_root",
      orderIndex: 1,
      isActive: true,
      description: "Phòng kế toán tổng hợp",
      result: "CREATED",
      // Unlisted / PII fields
      createdByUserName: "Admin User",
      internalNotes: "Confidential note",
      userList: [{ name: "An" }],
    };

    const clean = sanitizeOrganizationUnitAudit(rawPayload);

    expect(clean).toEqual({
      id: "unit_123",
      code: "PB-KT",
      name: "Phòng Kế toán",
      parentId: "unit_root",
      orderIndex: 1,
      isActive: true,
      description: "Phòng kế toán tổng hợp",
      result: "CREATED",
    });
    expect(clean).not.toHaveProperty("createdByUserName");
    expect(clean).not.toHaveProperty("internalNotes");
    expect(clean).not.toHaveProperty("userList");
  });

  it("strictly enforces allowlist on Manager Assignment audit payload", () => {
    const rawPayload = {
      id: "mgr_assign_1",
      organizationUnitId: "unit_100",
      employeeId: "emp_200",
      startDate: "2026-08-01",
      endDate: null,
      isPrimary: true,
      decisionNo: "QD-MGR-01",
      result: "SUCCESS",
      // PII fields
      employeeFullName: "Trần Văn Quản Lý",
      employeePhone: "0988888888",
    };

    const clean = sanitizeManagerAssignmentAudit(rawPayload);

    expect(clean).toEqual({
      id: "mgr_assign_1",
      organizationUnitId: "unit_100",
      employeeId: "emp_200",
      startDate: "2026-08-01",
      endDate: null,
      isPrimary: true,
      decisionNo: "QD-MGR-01",
      result: "SUCCESS",
    });
    expect(clean).not.toHaveProperty("employeeFullName");
    expect(clean).not.toHaveProperty("employeePhone");
  });
});
