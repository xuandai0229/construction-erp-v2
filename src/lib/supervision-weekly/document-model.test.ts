import { buildWeeklyDocumentModel } from "./document-model";
import { describe, it, expect } from "vitest";

describe("document-model", () => {
  it("always returns 4 items for recommendations in NEXT_WEEK_PLAN", () => {
    const mockDossier: any = {
      id: "mock123",
      reportNumber: null,
      weekStart: "2026-07-20",
      weekEnd: "2026-07-26",
      nextWeekStart: "2026-07-27",
      nextWeekEnd: "2026-08-02",
      place: "Hà Nội",
      observations: [
        { documentType: "NEXT_WEEK_PLAN", category: "Bổ sung nhân lực, thiết bị; thay thế đội ngũ yếu kém, không đạt yêu cầu về kỹ thuật, mỹ thuật", content: "Test content 1" },
        { documentType: "NEXT_WEEK_PLAN", category: "Xử lý phát sinh kỹ thuật, phát sinh vật liệu", content: "Test content 3" }
      ],
      entries: [],
      transitions: [],
      quantities: [],
      progressRows: [],
    };

    const model = buildWeeklyDocumentModel(mockDossier, "NEXT_WEEK_PLAN");
    
    expect(model.recommendations).toHaveLength(4);
    
    // Check item 1
    expect(model.recommendations[0].order).toBe(1);
    expect(model.recommendations[0].content).toBe("Test content 1");
    expect(model.recommendations[0].isEmpty).toBe(false);

    // Check item 2 (empty)
    expect(model.recommendations[1].order).toBe(2);
    expect(model.recommendations[1].content).toBe("");
    expect(model.recommendations[1].isEmpty).toBe(true);

    // Check item 3
    expect(model.recommendations[2].order).toBe(3);
    expect(model.recommendations[2].content).toBe("Test content 3");
    expect(model.recommendations[2].isEmpty).toBe(false);

    // Check item 4 (empty)
    expect(model.recommendations[3].order).toBe(4);
    expect(model.recommendations[3].content).toBe("");
    expect(model.recommendations[3].isEmpty).toBe(true);
  });
});
