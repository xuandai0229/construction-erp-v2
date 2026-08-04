import { describe, it, expect } from "vitest";
import { buildSupervisionExportFilename } from "../export-filename";

describe("buildSupervisionExportFilename", () => {
  it("builds correct filename for RESULT document with current week range", () => {
    const filename = buildSupervisionExportFilename({
      reportNumber: "BC-01",
      weekStart: "2026-08-03",
      weekEnd: "2026-08-09",
      documentType: "RESULT",
      extension: "docx",
    });
    expect(filename).toBe("Bao-cao-ket-qua-tuan_03-08-2026_09-08-2026.docx");
  });

  it("builds correct filename for NEXT_WEEK_PLAN document using next week range when provided", () => {
    const filename = buildSupervisionExportFilename({
      reportNumber: "BC-01",
      weekStart: "2026-08-03",
      weekEnd: "2026-08-09",
      nextWeekStart: "2026-08-10",
      nextWeekEnd: "2026-08-16",
      documentType: "NEXT_WEEK_PLAN",
      extension: "pdf",
    });
    expect(filename).toBe("Ke-hoach-kiem-tra-tuan-sau_10-08-2026_16-08-2026.pdf");
  });

  it("calculates next week date range when nextWeekStart is not explicitly set", () => {
    const filename = buildSupervisionExportFilename({
      reportNumber: "BC-01",
      weekStart: "2026-08-03",
      weekEnd: "2026-08-09",
      documentType: "NEXT_WEEK_PLAN",
      extension: "docx",
    });
    expect(filename).toBe("Ke-hoach-kiem-tra-tuan-sau_10-08-2026_16-08-2026.docx");
  });

  it("handles month boundary crossing correctly for NEXT_WEEK_PLAN", () => {
    const filename = buildSupervisionExportFilename({
      reportNumber: "BC-02",
      weekStart: "2026-08-25",
      weekEnd: "2026-08-31",
      documentType: "NEXT_WEEK_PLAN",
      extension: "pdf",
    });
    expect(filename).toBe("Ke-hoach-kiem-tra-tuan-sau_01-09-2026_07-09-2026.pdf");
  });

  it("handles year boundary crossing correctly for NEXT_WEEK_PLAN", () => {
    const filename = buildSupervisionExportFilename({
      reportNumber: "BC-52",
      weekStart: "2026-12-28",
      weekEnd: "2027-01-03",
      documentType: "NEXT_WEEK_PLAN",
      extension: "docx",
    });
    expect(filename).toBe("Ke-hoach-kiem-tra-tuan-sau_04-01-2027_10-01-2027.docx");
  });
});
