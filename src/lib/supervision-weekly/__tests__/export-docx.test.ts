import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";

vi.mock("@/lib/settings/company-profile", () => ({
  getCompanyProfile: vi.fn().mockResolvedValue({ companyName: "CÔNG TY CỔ PHẦN XÂY DỰNG VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI" })
}));

import { exportSupervisionWeeklyDocx } from "../export-docx";
import type { SupervisionWeeklyPrintDto } from "../print-types";

const mockDossier: SupervisionWeeklyPrintDto = {
  id: "test-dossier-1",
  reportNumber: "BCGS-W-2026-01",
  status: "DRAFT",
  recipientName: "Ban Giám đốc",
  recipientTitle: "Phòng kỹ thuật",
  weekStart: "2026-08-03",
  weekEnd: "2026-08-09",
  nextWeekStart: "2026-08-10",
  nextWeekEnd: "2026-08-16",
  place: "Hà Nội",
  issueDate: "2026-08-03",
  createdAt: "2026-08-03T08:00:00.000Z",
  creator: { id: "user-1", name: "Nguyễn Văn A" },
  entries: [],
  transitions: [],
  quantities: [],
  progressRows: [],
  observations: [],
};

describe("exportSupervisionWeeklyDocx XML assertions", () => {
  it("generates a valid non-zero DOCX buffer", async () => {
    const buffer = await exportSupervisionWeeklyDocx(mockDossier, "RESULT");
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("sets vi-VN language in word/styles.xml and document.xml", async () => {
    const buffer = await exportSupervisionWeeklyDocx(mockDossier, "RESULT");
    const zip = await JSZip.loadAsync(buffer);
    const stylesXml = await zip.file("word/styles.xml")?.async("string");
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(stylesXml).toBeDefined();
    expect(documentXml).toBeDefined();
    expect(stylesXml).toContain('w:lang w:val="vi-VN"');
  });

  it("enforces STT column width = 850 dxa in document.xml", async () => {
    const buffer = await exportSupervisionWeeklyDocx(mockDossier, "RESULT");
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toBeDefined();
    expect(documentXml).toContain('w:w="850"');
    expect(documentXml).toContain('w:val="center"');
  });

  it("uses w:tblLayout w:type=\"fixed\" for all tables", async () => {
    const buffer = await exportSupervisionWeeklyDocx(mockDossier, "RESULT");
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toBeDefined();
    expect(documentXml).toContain('<w:tblLayout w:type="fixed"/>');
  });

  it("renders WordWritingLines tables for empty sections in NEXT_WEEK_PLAN", async () => {
    const buffer = await exportSupervisionWeeklyDocx(mockDossier, "NEXT_WEEK_PLAN");
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toBeDefined();
    expect(documentXml).toContain('w:val="dotted"');
  });
});
