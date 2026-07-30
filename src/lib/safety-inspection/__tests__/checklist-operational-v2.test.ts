import { describe, expect, it } from "vitest";
import {
  SAFETY_OPERATIONAL_CHECKLIST_V2,
  SAFETY_OPERATIONAL_CHECKLIST_V2_HASH,
  analyzeOperationalChecklistV2,
  hashSafetyOperationalChecklistDefinition,
} from "../checklist-operational-v2";

describe("Checklist operational V2", () => {
  it("có hash canonical ổn định và là version additive", () => {
    expect(SAFETY_OPERATIONAL_CHECKLIST_V2.code).toBe("SAFETY_COMPANY_V1");
    expect(SAFETY_OPERATIONAL_CHECKLIST_V2.version).toBe(2);
    expect(
      hashSafetyOperationalChecklistDefinition(
        SAFETY_OPERATIONAL_CHECKLIST_V2,
      ),
    ).toBe(SAFETY_OPERATIONAL_CHECKLIST_V2_HASH);
  });

  it("bảo toàn 55 dòng kế hoạch, đủ 20 category và không dùng RP làm câu hỏi", () => {
    const analysis = analyzeOperationalChecklistV2();
    expect(analysis.planSourceCount).toBe(55);
    expect(analysis.missingPlanSourceCodes).toEqual([]);
    expect(analysis.unknownSourceCodes).toEqual([]);
    expect(analysis.reportCategoryNumbers).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(analysis.duplicateOperationalConcepts).toEqual([]);
    expect(
      SAFETY_OPERATIONAL_CHECKLIST_V2.sections
        .flatMap((section) => section.items)
        .some((item) => item.code.startsWith("RP-")),
    ).toBe(false);
  });

  it("giữ Công việc ngày để truy nguyên nhưng không chấm điểm hoặc chặn phiên", () => {
    const category = SAFETY_OPERATIONAL_CHECKLIST_V2.reportCategories.find(
      (candidate) => candidate.sourceNumber === 8,
    );
    expect(category?.sourceText).toBe("8. Công việc ngày");
    expect(category?.requiresBusinessClarification).toBe(true);
    expect(category?.mappingItemCodes).toEqual([]);
    expect(category?.blocksCompletion).toBe(false);
    expect(category?.isScored).toBe(false);
  });
});
