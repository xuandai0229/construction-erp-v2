import { buildWeeklyDocumentModel } from "./document-model";
import { describe, it, expect } from "vitest";

describe("document-model", () => {
  it("preserves blank metadata instead of inventing document values", () => {
    const model = buildWeeklyDocumentModel({
      id: "blank-metadata",
      reportNumber: null,
      weekStart: "2026-07-20",
      weekEnd: "2026-07-26",
      nextWeekStart: "2026-07-27",
      nextWeekEnd: "2026-08-02",
      place: null,
      recipientName: null,
      recipientTitle: null,
      creator: null,
      entries: [],
      observations: [],
      transitions: [],
      quantities: [],
      progressRows: [],
    }, "RESULT");

    expect(model.metadata.place).toBe("");
    expect(model.metadata.recipientName).toBe("");
    expect(model.metadata.recipientTitle).toBe("");
    expect(model.metadata.creatorName).toBe("");
  });

  it("keeps a category-only legacy row in the canonical schedule", () => {
    const model = buildWeeklyDocumentModel({
      id: "category-only",
      reportNumber: null,
      weekStart: "2026-07-20",
      weekEnd: "2026-07-26",
      nextWeekStart: "2026-07-27",
      nextWeekEnd: "2026-08-02",
      place: null,
      recipientName: null,
      recipientTitle: null,
      creator: null,
      entries: [{
        id: "entry-1",
        documentType: "RESULT",
        entryDate: "2026-07-20",
        shift: "MORNING",
        sortOrder: 0,
        categoryItemId: "category-1",
        categoryNameSnapshot: null,
        manualCategoryName: null,
        projectNameSnapshot: null,
        locationNameSnapshot: null,
        workItemNameSnapshot: null,
        manualText: null,
        manualLocation: null,
        manualProjectName: null,
        manualWorkItemName: null,
        inspectionContent: null,
        result: null,
        commanderProposal: null,
      }],
      observations: [],
      transitions: [],
      quantities: [],
      progressRows: [],
    } as any, "RESULT");

    expect(model.schedule[0].shifts.MORNING).toHaveLength(1);
  });

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
