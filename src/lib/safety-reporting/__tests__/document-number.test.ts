import { describe, it, expect } from "vitest";
import {
  parseOfficialDocumentNumber,
  formatOfficialDocumentNumber,
  handleOfficialDocumentNumberPaste,
} from "../document-number";

describe("Safety Official Document Number Utility (12/ct2)", () => {
  it("parses valid 12/ct2 and 15/KH-KT canonical strings", () => {
    const res1 = parseOfficialDocumentNumber("12/ct2");
    expect(res1).toEqual({ numberPart: "12", symbolPart: "ct2", isValid: true });

    const res2 = parseOfficialDocumentNumber("15/KH-KT");
    expect(res2).toEqual({ numberPart: "15", symbolPart: "KH-KT", isValid: true });
  });

  it("handles empty or null strings gracefully", () => {
    expect(parseOfficialDocumentNumber("")).toEqual({ numberPart: "", symbolPart: "", isValid: true });
    expect(parseOfficialDocumentNumber(null)).toEqual({ numberPart: "", symbolPart: "", isValid: true });
  });

  it("detects invalid strings with multiple slashes or non-digit number parts", () => {
    const res1 = parseOfficialDocumentNumber("12//ct2");
    expect(res1.isValid).toBe(false);

    const res2 = parseOfficialDocumentNumber("abc/ct2");
    expect(res2.isValid).toBe(false);
  });

  it("formats numberPart and symbolPart into canonical 12/ct2 string", () => {
    expect(formatOfficialDocumentNumber("12", "ct2")).toBe("12/ct2");
    expect(formatOfficialDocumentNumber("15", "KH-KT")).toBe("15/KH-KT");
    expect(formatOfficialDocumentNumber("", "")).toBe("");
  });

  it("parses pasted full strings correctly", () => {
    expect(handleOfficialDocumentNumberPaste("12/ct2")).toEqual({ numberPart: "12", symbolPart: "ct2" });
    expect(handleOfficialDocumentNumberPaste("15/KH-KT")).toEqual({ numberPart: "15", symbolPart: "KH-KT" });
    expect(handleOfficialDocumentNumberPaste("123")).toEqual({ numberPart: "123", symbolPart: "" });
  });
});
