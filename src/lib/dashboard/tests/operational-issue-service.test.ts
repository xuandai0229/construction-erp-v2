import { describe, test, expect } from "vitest";
import { deriveOperationalIssueState } from "../operational-issue-service";

describe("deriveOperationalIssueState unit tests", () => {
  test("returns NORMAL for empty inputs with DRAFT or SUBMITTED status", () => {
    const res = deriveOperationalIssueState({
      status: "SUBMITTED",
      issues: "",
      recommendations: "",
      qualityNote: "",
    });

    expect(res.hasIssue).toBe(false);
    expect(res.severity).toBe("NORMAL");
    expect(res.displayLabel).toBe("Bình thường");
  });

  test("derives CRITICAL for safety risk / accident", () => {
    const res = deriveOperationalIssueState({
      status: "APPROVED",
      safetyStatus: "ACCIDENT",
      issues: "Xảy ra sự cố va chạm máy đào",
    });

    expect(res.hasIssue).toBe(true);
    expect(res.severity).toBe("CRITICAL");
    expect(res.displayLabel).toBe("Khẩn cấp");
  });

  test("derives HIGH for technical issues or executive support requested", () => {
    const res = deriveOperationalIssueState({
      status: "DRAFT",
      recommendations: "Đề nghị Ban Giám đốc phê duyệt bổ sung máy ép cọc",
    });

    expect(res.hasIssue).toBe(true);
    expect(res.severity).toBe("HIGH");
    expect(res.displayLabel).toBe("Cần xử lý");
  });

  test("derives HIGH for timeline delay", () => {
    const res = deriveOperationalIssueState({
      status: "APPROVED",
      daysRemaining: -5,
    });

    expect(res.hasIssue).toBe(true);
    expect(res.severity).toBe("HIGH");
    expect(res.reasonCodes).toContain("Trễ tiến độ (5 ngày)");
  });
});
