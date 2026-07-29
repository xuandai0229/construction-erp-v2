import { describe, expect, it } from "vitest";
import { groupEntriesByItemAndDate } from "@/lib/field-progress";
import { buildFieldProgressRollupTree } from "@/lib/field-progress/rollup";
import { calculateProjectActualProgress } from "../project-progress-aggregate";

describe("Dashboard actual-progress parity with field-progress summary rollup", () => {
  it("returns the same approved cumulative quantity/design ratio as the summary", () => {
    const projectId = "project-parity";
    const entries = [
      { id: "entry-1", projectId, itemId: "work-1", quantity: 20, status: "APPROVED", entryDate: new Date("2026-07-27T08:00:00.000Z"), approvedAt: new Date("2026-07-27T09:00:00.000Z"), deletedAt: null },
      { id: "entry-2", projectId, itemId: "work-2", quantity: 30, status: "APPROVED", entryDate: new Date("2026-07-28T08:00:00.000Z"), approvedAt: new Date("2026-07-28T09:00:00.000Z"), deletedAt: null },
    ];
    const items = [
      { id: "work-1", projectId, itemType: "WORK", sortOrder: 1, designQuantity: 100, deletedAt: null },
      { id: "work-2", projectId, itemType: "WORK", sortOrder: 2, designQuantity: 100, deletedAt: null },
    ];

    const dashboard = calculateProjectActualProgress({
      projectId,
      asOf: new Date("2026-07-29T23:59:59.999Z"),
      items,
      entries,
    });
    const { itemTree } = buildFieldProgressRollupTree({
      items,
      groupedEntries: groupEntriesByItemAndDate(entries),
      cumulativeBeforeMap: {},
      dynamicDates: [new Date("2026-07-27T00:00:00.000Z"), new Date("2026-07-28T00:00:00.000Z")],
    });
    const summaryDesignQuantity = itemTree.reduce((total, item) => total + item.designQty, 0);
    const summaryActualQuantity = itemTree.reduce((total, item) => total + item.cumulative, 0);

    expect(dashboard.totalDesignQuantity).toBe(summaryDesignQuantity);
    expect(dashboard.approvedActualQuantity).toBe(summaryActualQuantity);
    expect(dashboard.actualProgressPercent).toBe((summaryActualQuantity / summaryDesignQuantity) * 100);
  });
});
