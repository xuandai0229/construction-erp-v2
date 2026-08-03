import { describe, expect, it } from "vitest";
import {
  companyProfileSchema,
  documentPolicySchema,
  normalizeAllowedExtensions,
} from "./settings-validation";

describe("Settings validation contract", () => {
  it("normalizes and de-duplicates configured extensions", () => {
    expect(normalizeAllowedExtensions(" PDF, .docx, pdf,  XLSX ")).toBe("pdf, docx, xlsx");
  });

  it("requires a company name but permits blank optional tax and hotline fields", () => {
    expect(companyProfileSchema.safeParse({ companyName: "", taxCode: "", hotline: "" }).success).toBe(false);
    expect(companyProfileSchema.safeParse({ companyName: "Công ty Xây dựng", taxCode: "", hotline: "" }).success).toBe(true);
  });

  it("limits the upload policy to an enforceable positive size and extensions", () => {
    expect(documentPolicySchema.safeParse({ maxUploadSizeMb: 0, allowedExtensions: "pdf", enforceNamingConvention: true, autoVersioning: true }).success).toBe(false);
    expect(documentPolicySchema.safeParse({ maxUploadSizeMb: 101, allowedExtensions: "pdf", enforceNamingConvention: true, autoVersioning: true }).success).toBe(false);
    const parsed = documentPolicySchema.parse({ maxUploadSizeMb: "50", allowedExtensions: "PDF, .docx, pdf", enforceNamingConvention: true, autoVersioning: true });
    expect(parsed).toMatchObject({ maxUploadSizeMb: 50, allowedExtensions: "pdf, docx" });
  });
});
