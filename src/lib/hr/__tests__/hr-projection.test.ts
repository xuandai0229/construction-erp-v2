import { describe, expect, it } from "vitest";
import { SensitiveFieldPolicy } from "@prisma/client";
import { projectEmployeeForDetail, projectEmployeeForList } from "../hr-projection";

const employee = {
  id: "employee-1",
  code: "NV-2026-0001",
  fullName: "Nguyễn Văn A",
  gender: "MALE",
  dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
  phoneNumber: "0900000000",
  personalEmail: "employee@example.com",
  joinedDate: new Date("2026-01-01T00:00:00.000Z"),
  resignedDate: null,
  status: "ACTIVE",
  identityNumberEncrypted: JSON.stringify({ ciphertext: "secret" }),
  identityNumberBlindIndex: "blind-index-secret",
  identityNumberLastDigits: "8899",
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  orgAssignments: [{
    isPrimary: true,
    endDate: null,
    organizationUnit: { name: "Phòng Kỹ thuật", code: "KT" },
    position: { title: "Kỹ sư", code: "KS" },
  }],
  user: { id: "user-1", name: "Nguyễn Văn A", email: "employee@example.com" },
};

describe("HR employee projections", () => {
  it("removes contact fields and secrets from BASIC_ONLY list output", () => {
    const result = projectEmployeeForList(employee, SensitiveFieldPolicy.BASIC_ONLY);
    expect(result.phoneNumber).toBeNull();
    expect(result.personalEmail).toBeNull();
    expect(result.userEmail).toBe("e***@example.com");
    expect(result).not.toHaveProperty("identityNumberEncrypted");
    expect(result).not.toHaveProperty("identityNumberBlindIndex");
  });

  it("returns contact fields only for CONTACT policy", () => {
    const result = projectEmployeeForList(employee, SensitiveFieldPolicy.CONTACT);
    expect(result.phoneNumber).toBe("0900000000");
    expect(result.personalEmail).toBe("employee@example.com");
    expect(result.userEmail).toBe("employee@example.com");
  });

  it("masks identity numbers in detail output", () => {
    const result = projectEmployeeForDetail(employee, SensitiveFieldPolicy.BASIC_ONLY);
    expect(result.maskedIdentityNumber).toBe("********8899");
    expect(result).not.toHaveProperty("identityNumberEncrypted");
    expect(result).not.toHaveProperty("identityNumberBlindIndex");
  });
});
