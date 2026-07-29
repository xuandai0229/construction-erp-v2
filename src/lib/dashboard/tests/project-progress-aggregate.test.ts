import { describe, expect, it } from "vitest";
import {
  calculateProjectActualProgress,
  deriveCompletenessCategory,
  type ProjectProgressEntryInput,
  type ProjectProgressItemInput,
} from "../project-progress-aggregate";

const projectId = "project-a";
const asOf = new Date("2026-07-29T23:59:59.999Z");

function item(overrides: Partial<ProjectProgressItemInput> = {}): ProjectProgressItemInput {
  return {
    id: "work-1",
    projectId,
    itemType: "WORK",
    designQuantity: 100,
    deletedAt: null,
    ...overrides,
  };
}

function entry(overrides: Partial<ProjectProgressEntryInput> = {}): ProjectProgressEntryInput {
  return {
    id: "entry-1",
    projectId,
    itemId: "work-1",
    quantity: 25,
    status: "APPROVED",
    entryDate: new Date("2026-07-28T08:00:00.000Z"),
    approvedAt: new Date("2026-07-28T09:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

describe("calculateProjectActualProgress", () => {
  it("uses only approved, non-deleted, in-scope entries and keeps the raw over-design percentage", () => {
    const result = calculateProjectActualProgress({
      projectId,
      asOf,
      items: [item(), item({ id: "work-2", designQuantity: 100 })],
      entries: [
        entry({ quantity: 120 }),
        entry({ id: "draft", itemId: "work-2", status: "DRAFT", quantity: 50 }),
        entry({ id: "submitted", itemId: "work-2", status: "SUBMITTED", quantity: 40 }),
        entry({ id: "revision", itemId: "work-2", status: "REVISION_REQUESTED", quantity: 30 }),
        entry({ id: "cancelled", itemId: "work-2", status: "CANCELLED", quantity: 20 }),
        entry({ id: "deleted", itemId: "work-2", quantity: 20, deletedAt: new Date() }),
        entry({ id: "foreign-project", projectId: "project-b", itemId: "work-2", quantity: 20 }),
        entry({ id: "future", itemId: "work-2", quantity: 20, entryDate: new Date("2026-07-30T00:00:00.000Z") }),
      ],
    });

    expect(result.totalDesignQuantity).toBe(200);
    expect(result.approvedActualQuantity).toBe(120);
    expect(result.actualProgressPercent).toBe(60);
    expect(result.actualProgressDataStatus).toBe("AVAILABLE");
    expect(result.warnings).toContain("ACTUAL_EXCEEDS_DESIGN_FOR_ITEM");
  });

  it("does not turn no approved entry into a fabricated 0 percent", () => {
    const result = calculateProjectActualProgress({
      projectId,
      asOf,
      items: [item()],
      entries: [entry({ status: "DRAFT" }), entry({ id: "submitted", status: "SUBMITTED" })],
    });

    expect(result.actualProgressPercent).toBeNull();
    expect(result.actualProgressDataStatus).toBe("NO_APPROVED_ENTRIES");
    expect(result.totalDesignQuantity).toBe(100);
    expect(deriveCompletenessCategory(20, result.actualProgressPercent)).toBe("MISSING_ACTUAL");
  });

  it("returns zero only when an approved zero-quantity entry provides a valid actual-data basis", () => {
    const result = calculateProjectActualProgress({
      projectId,
      asOf,
      items: [item()],
      entries: [entry({ quantity: 0 })],
    });

    expect(result.actualProgressPercent).toBe(0);
    expect(result.actualProgressDataStatus).toBe("AVAILABLE");
  });

  it("identifies missing or invalid design quantities without calculating a percentage", () => {
    const missing = calculateProjectActualProgress({ projectId, asOf, items: [item({ designQuantity: null })], entries: [entry()] });
    const zero = calculateProjectActualProgress({ projectId, asOf, items: [item({ designQuantity: 0 })], entries: [entry()] });
    const invalidEntry = calculateProjectActualProgress({ projectId, asOf, items: [item()], entries: [entry({ quantity: -1 })] });

    expect(missing.actualProgressDataStatus).toBe("MISSING_DESIGN_QUANTITY");
    expect(missing.actualProgressPercent).toBeNull();
    expect(zero.actualProgressDataStatus).toBe("MISSING_DESIGN_QUANTITY");
    expect(invalidEntry.actualProgressDataStatus).toBe("INVALID_QUANTITY");
  });

  it("deduplicates repeated source records by entry id and reports no progress items distinctly", () => {
    const duplicate = entry({ id: "same-entry", quantity: 10 });
    const result = calculateProjectActualProgress({ projectId, asOf, items: [item()], entries: [duplicate, duplicate] });
    const noItems = calculateProjectActualProgress({ projectId, asOf, items: [], entries: [] });

    expect(result.approvedActualQuantity).toBe(10);
    expect(noItems.actualProgressDataStatus).toBe("NO_PROGRESS_ITEMS");
    expect(noItems.actualProgressPercent).toBeNull();
  });
});

describe("deriveCompletenessCategory", () => {
  it.each([
    [10, 20, "COMPLETE"],
    [null, 20, "MISSING_PLAN"],
    [10, null, "MISSING_ACTUAL"],
    [null, null, "MISSING_BOTH"],
  ] as const)("partitions planned=%s actual=%s as %s", (planned, actual, expected) => {
    expect(deriveCompletenessCategory(planned, actual)).toBe(expected);
  });
});
