import { describe, expect, it } from "vitest";
import { projectSafetyReportCategories } from "../report-category-projection";

describe("Projection nhóm báo cáo ATLĐ", () => {
  const categories = [
    {
      code: "RP-001",
      sourceNumber: 1,
      sourceText: "1. Bảo hộ",
      normalizedLabel: "Bảo hộ",
      requiresBusinessClarification: false,
      blocksCompletion: true,
      isScored: true,
      itemCodes: ["OP-A", "OP-B"],
    },
    {
      code: "RP-008",
      sourceNumber: 8,
      sourceText: "8. Công việc ngày",
      normalizedLabel: "Nội dung theo mẫu đang chờ xác nhận",
      requiresBusinessClarification: true,
      blocksCompletion: false,
      isScored: false,
      itemCodes: [],
    },
  ] as const;

  it("không che PASS khi cùng category có FAIL và giữ finding nguồn", () => {
    const projected = projectSafetyReportCategories(categories, [
      {
        resultId: "result-pass",
        itemCode: "OP-A",
        status: "PASS",
        findingIds: [],
      },
      {
        resultId: "result-fail",
        itemCode: "OP-B",
        status: "FAIL",
        findingIds: ["finding-1", "finding-2"],
      },
    ]);
    expect(projected[0]).toMatchObject({
      status: "FAIL",
      passCount: 1,
      failCount: 1,
      resultIds: ["result-pass", "result-fail"],
      findingIds: ["finding-1", "finding-2"],
    });
  });

  it("xử lý N/A rõ và Công việc ngày không block", () => {
    const projected = projectSafetyReportCategories(categories, [
      {
        resultId: "result-na",
        itemCode: "OP-A",
        status: "NOT_APPLICABLE",
        findingIds: [],
      },
      {
        resultId: "result-not-inspected",
        itemCode: "OP-B",
        status: "NOT_INSPECTED",
        findingIds: [],
      },
    ]);
    expect(projected[0].status).toBe("INCOMPLETE");
    expect(projected[0].notApplicableCount).toBe(1);
    expect(projected[1]).toMatchObject({
      status: "CLARIFICATION_REQUIRED",
      blocksCompletion: false,
    });
  });
});
