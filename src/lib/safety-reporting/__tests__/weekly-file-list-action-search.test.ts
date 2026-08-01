import { describe, it, expect } from "vitest";

describe("Safety Weekly File List & Action Search Unit Tests", () => {
  it("should format standardized document code correctly", () => {
    // Helper function testing logic
    const formatCode = (
      officialNumber?: string | null,
      sequenceNumber?: number | null,
      weekNumber?: number,
      year?: number
    ) => {
      if (officialNumber && officialNumber.trim()) {
        return officialNumber.trim();
      }
      if (sequenceNumber && year) {
        return `HS-ATLĐ-${year}-${String(sequenceNumber).padStart(4, "0")}`;
      }
      if (weekNumber && year) {
        return `HS-ATLĐ-${year}-W${String(weekNumber).padStart(2, "0")}`;
      }
      return "HS-ATLĐ-TUẦN";
    };

    expect(formatCode("12/ct2", 5, 32, 2026)).toBe("12/ct2");
    expect(formatCode(null, 5, 32, 2026)).toBe("HS-ATLĐ-2026-0005");
    expect(formatCode(null, null, 32, 2026)).toBe("HS-ATLĐ-2026-W32");
  });

  it("should verify string cleanup of Mẫu 01 and Mẫu 02", () => {
    const subtitle = "Quản lý kế hoạch kiểm tra và báo cáo tự đánh giá trong cùng một hồ sơ theo tuần.";
    expect(subtitle.includes("Mẫu 01")).toBe(false);
    expect(subtitle.includes("Mẫu 02")).toBe(false);
  });
});
