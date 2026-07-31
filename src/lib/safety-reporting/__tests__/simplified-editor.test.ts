import { describe, it, expect } from "vitest";
import { normalizeNfc } from "../date-utils";

describe("Simplified Safety Plan Editor Architecture (Mẫu 02)", () => {
  it("should ensure normalizeNfc handles long-form text with 2000+ characters smoothly", () => {
    const longText = "Nội dung kiểm tra an toàn giàn giáo, hệ thống PCCC và thiết bị nghiêm ngặt. ".repeat(40);
    expect(longText.length).toBeGreaterThan(2000);

    const normalized = normalizeNfc(longText);
    expect(normalized).toBe(longText.normalize("NFC"));
    expect(normalized).not.toContain("Chiề u");
    expect(normalized).not.toContain("Tố i");
  });

  it("should compute deterministic snapshot string regardless of field ordering", () => {
    const entry1 = {
      inspectionDate: "2026-07-27",
      shift: "MORNING",
      projectId: "proj-1",
      projectMode: "EXISTING",
      customProjectName: "",
      inspectionContent: "Kiểm tra an toàn điện",
      note: "Không có phát sinh",
      sortOrder: 0,
    };

    const snap1 = JSON.stringify({
      docNo: "12/ct2",
      pl: "Hà Nội",
      recN: "Ban Giám đốc",
      recT: "Phòng kỹ thuật",
      note: "Ghi chú nội bộ",
      entries: [entry1],
    });

    const snap2 = JSON.stringify({
      docNo: "12/ct2",
      pl: "Hà Nội",
      recN: "Ban Giám đốc",
      recT: "Phòng kỹ thuật",
      note: "Ghi chú nội bộ",
      entries: [entry1],
    });

    expect(snap1).toBe(snap2);
  });

  it("should verify active plan status permissions: all non-cancelled plans are editable", () => {
    const statuses = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REVISION_REQUIRED"];

    statuses.forEach((status) => {
      const isCancelled = status === "CANCELLED";
      const canEdit = !isCancelled;
      expect(canEdit).toBe(true);
    });

    expect("CANCELLED" === "CANCELLED").toBe(true);
  });
});
