import { formatReportNumber, normalizeReportNumber } from "./report-number";
import { describe, it, expect } from "vitest";

describe("report-number", () => {
  it("formats empty report numbers", () => {
    expect(formatReportNumber(null)).toBe("Số: ……./………");
    expect(formatReportNumber(undefined)).toBe("Số: ……./………");
    expect(formatReportNumber("")).toBe("Số: ……./………");
    expect(formatReportNumber("   ")).toBe("Số: ……./………");
  });

  it("formats valid report numbers", () => {
    expect(formatReportNumber("KH-2026/015")).toBe("Số: KH-2026/015");
    expect(formatReportNumber(" Số: KH-2026/015 ")).toBe("Số: KH-2026/015");
    expect(formatReportNumber("Số:KH-2026/015")).toBe("Số: KH-2026/015");
  });
});
