import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, validateNewPassword } from "./password-policy";

describe("first-login password policy", () => {
  it("accepts a strong password and rejects incomplete passwords", () => {
    expect(validateNewPassword("Strong!Pass9")).toBeNull();
    expect(validateNewPassword("short1A!")).toContain("10");
    expect(validateNewPassword("alllowercase9!")).toContain("chữ hoa");
    expect(validateNewPassword("ALLUPPERCASE9!")).toContain("chữ thường");
    expect(validateNewPassword("NoNumberHere!")).toContain("chữ số");
    expect(validateNewPassword("NoSpecialHere9")).toContain("đặc biệt");
  });

  it("generates unique values that satisfy the same policy", () => {
    const first = generateTemporaryPassword();
    const second = generateTemporaryPassword();
    expect(first).not.toBe(second);
    expect(validateNewPassword(first)).toBeNull();
    expect(validateNewPassword(second)).toBeNull();
  });
});
