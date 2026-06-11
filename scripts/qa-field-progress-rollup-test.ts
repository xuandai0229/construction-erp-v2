import { buildFieldProgressRollupTree } from "../src/lib/field-progress/rollup";

const mockItems = [
  { id: "group-a", itemType: "GROUP", parentId: null, categoryName: "GROUP A", sortOrder: 1 },
  { id: "work-a1", itemType: "WORK", parentId: "group-a", workContent: "WORK A1", designQuantity: 100, sortOrder: 2 },
  { id: "work-a2", itemType: "WORK", parentId: "group-a", workContent: "WORK A2", designQuantity: 200, sortOrder: 3 },
  { id: "group-b", itemType: "GROUP", parentId: null, categoryName: "GROUP B", sortOrder: 4 },
  { id: "group-b1", itemType: "GROUP", parentId: "group-b", categoryName: "GROUP B1", sortOrder: 5 },
  { id: "work-b11", itemType: "WORK", parentId: "group-b1", workContent: "WORK B1.1", designQuantity: 50, sortOrder: 6 },
  { id: "group-c", itemType: "GROUP", parentId: null, categoryName: "GROUP C", sortOrder: 7 },
  { id: "work-c1", itemType: "WORK", parentId: "group-c", workContent: "WORK C1", designQuantity: 10, sortOrder: 8 },
];

const mockCumulativeBeforeMap: Record<string, number> = {
  "work-a1": 20,
  "work-a2": 30,
  "work-b11": 5,
};

const mockGroupedEntries: Record<string, Record<string, any[]>> = {
  "work-a1": {
    "2026-06-10": [{ quantity: 10 }]
  },
  "work-a2": {
    "2026-06-10": [{ quantity: 20 }]
  },
  "work-b11": {
    "2026-06-10": [{ quantity: 10 }]
  }
};

const dynamicDates = [new Date("2026-06-10")];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

function assertNoInvalidNumbers(items: any[]) {
  for (const item of items) {
    const values = [item.designQty, item.cumulativeBefore, item.periodTotal, item.cumulative, ...Object.values(item.dayTotals)];
    for (const value of values) {
      assert(typeof value === "number", `${item.id}: value must be numeric`);
      assert(Number.isFinite(value), `${item.id}: value cannot be NaN or Infinity`);
    }
  }
}

function runTest() {
  const { itemTree, displayItems } = buildFieldProgressRollupTree({
    items: mockItems,
    groupedEntries: mockGroupedEntries,
    cumulativeBeforeMap: mockCumulativeBeforeMap,
    dynamicDates,
  });

  const flatResult: Record<string, any> = {};
  const traverse = (node: any) => {
    flatResult[node.id] = node;
    for (const child of node.children || []) {
      traverse(child);
    }
  };

  itemTree.forEach(traverse);

  const groupA = flatResult["group-a"];
  const groupB = flatResult["group-b"];
  const groupB1 = flatResult["group-b1"];
  const workC1 = flatResult["work-c1"];

  assert(groupA.designQty === 300, "Group A design quantity should be 300");
  assert(groupA.cumulativeBefore === 50, "Group A cumulativeBefore should be 50");
  assert(groupA.periodTotal === 30, "Group A periodTotal should be 30");
  assert(groupA.cumulative === 80, "Group A cumulative should be 80");
  assert((groupA.cumulative / groupA.designQty * 100).toFixed(2) === "26.67", "Group A percent should be 26.67%");

  assert(groupB1.designQty === 50, "Group B1 design quantity should be 50");
  assert(groupB1.cumulativeBefore === 5, "Group B1 cumulativeBefore should be 5");
  assert(groupB1.periodTotal === 10, "Group B1 periodTotal should be 10");
  assert(groupB1.cumulative === 15, "Group B1 cumulative should be 15");
  assert((groupB1.cumulative / groupB1.designQty * 100).toFixed(2) === "30.00", "Group B1 percent should be 30%");

  assert(groupB.designQty === 50, "Group B design quantity should be 50");
  assert(groupB.cumulativeBefore === 5, "Group B cumulativeBefore should be 5");
  assert(groupB.periodTotal === 10, "Group B periodTotal should be 10");
  assert(groupB.cumulative === 15, "Group B cumulative should be 15");
  assert((groupB.cumulative / groupB.designQty * 100).toFixed(2) === "30.00", "Group B percent should be 30%");

  assert(workC1.dayTotals["2026-06-10"] === 0, "Work with no entries should have dayTotals date=0");
  assert(workC1.cumulative === 0, "Work with no entries should have cumulative 0");

  assert(displayItems[0].id === "group-a", "Display items should start with group-a");
  assert(displayItems[1].id === "work-a1" && displayItems[1].displayLevel === 1, "work-a1 should be child of group-a with displayLevel 1");
  assert(displayItems[2].id === "work-a2" && displayItems[2].displayLevel === 1, "work-a2 should be child of group-a with displayLevel 1");
  assert(displayItems[3].id === "group-b" && displayItems[3].displayLevel === 0, "group-b should be top-level");
  assert(displayItems[4].id === "group-b1" && displayItems[4].displayLevel === 1, "group-b1 should be child of group-b with displayLevel 1");
  assert(displayItems[5].id === "work-b11" && displayItems[5].displayLevel === 2, "work-b11 should be child of group-b1 with displayLevel 2");

  assertNoInvalidNumbers(displayItems);

  console.log("ROLLUP TEST PASSED");
  console.table([
    { case: "Group A", expected: "designQty=300, cumulativeBefore=50, periodTotal=30, cumulative=80, % = 26.67", actual: `designQty=${groupA.designQty}, cumulativeBefore=${groupA.cumulativeBefore}, periodTotal=${groupA.periodTotal}, cumulative=${groupA.cumulative}, %=${(groupA.cumulative / groupA.designQty * 100).toFixed(2)}` },
    { case: "Group B1", expected: "designQty=50, cumulativeBefore=5, periodTotal=10, cumulative=15, % = 30.00", actual: `designQty=${groupB1.designQty}, cumulativeBefore=${groupB1.cumulativeBefore}, periodTotal=${groupB1.periodTotal}, cumulative=${groupB1.cumulative}, %=${(groupB1.cumulative / groupB1.designQty * 100).toFixed(2)}` },
    { case: "Group B", expected: "designQty=50, cumulativeBefore=5, periodTotal=10, cumulative=15, % = 30.00", actual: `designQty=${groupB.designQty}, cumulativeBefore=${groupB.cumulativeBefore}, periodTotal=${groupB.periodTotal}, cumulative=${groupB.cumulative}, %=${(groupB.cumulative / groupB.designQty * 100).toFixed(2)}` },
  ]);
}

runTest();
