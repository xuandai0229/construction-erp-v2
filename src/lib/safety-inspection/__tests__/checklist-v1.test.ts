import { describe, expect, it } from "vitest";
import {
  SAFETY_CHECKLIST_V1,
  SAFETY_CHECKLIST_V1_HASH,
  hashSafetyChecklistDefinition,
} from "../checklist-v1";

describe("Safety checklist chính thức V1", () => {
  it("có hash canonical ổn định và code/version chính thức", () => {
    expect(SAFETY_CHECKLIST_V1.code).toBe("SAFETY_COMPANY_V1");
    expect(SAFETY_CHECKLIST_V1.version).toBe(1);
    expect(hashSafetyChecklistDefinition(SAFETY_CHECKLIST_V1)).toBe(
      SAFETY_CHECKLIST_V1_HASH,
    );
    expect(SAFETY_CHECKLIST_V1_HASH).toMatch(/^[a-f0-9]{64}$/);
  });

  it("giữ đủ 20 mục báo cáo và mapping nguồn cho mọi item", () => {
    const items = SAFETY_CHECKLIST_V1.sections.flatMap((section) =>
      section.items.map((item) => ({ ...item, sectionCode: section.code })),
    );
    const reportNumbers = new Set(
      items
        .filter((item) => item.sourceDocument === "WEEKLY_REPORT")
        .flatMap((item) => item.reportItemNumbers),
    );

    expect([...reportNumbers].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(new Set(items.map((item) => item.code)).size).toBe(items.length);
    expect(items.length).toBeGreaterThanOrEqual(70);
    for (const item of items) {
      expect(item.sourceText.trim()).not.toBe("");
      expect(item.normalizedLabel.trim()).not.toBe("");
      expect(item.sourceReference.trim()).not.toBe("");
      expect(item.constructionTypes.length).toBeGreaterThan(0);
      expect(item.sectionCode.trim()).not.toBe("");
    }
  });
});
