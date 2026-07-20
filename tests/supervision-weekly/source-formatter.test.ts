import assert from "node:assert/strict";
import test from "node:test";
import { formatSupervisionInspectionSource, formatSupervisionProjectAndWorkItem, hasMeaningfulSupervisionProject } from "../../src/lib/supervision-weekly/source-formatter";

test("formats structured source without empty separators", () => {
  assert.equal(formatSupervisionInspectionSource({ projectNameSnapshot: "Nhà điều hành", locationNameSnapshot: "Khối A > Tầng 3", workItemNameSnapshot: "Cốt thép dầm sàn", manualLocation: "Trục A-D" }), "Nhà điều hành - Khối A > Tầng 3 - Cốt thép dầm sàn - Trục A-D");
  assert.equal(formatSupervisionInspectionSource({ manualText: "Kho vật tư tạm" }), "Kho vật tư tạm");
});

test("formats direct project and work item without changing legacy rows", () => {
  assert.equal(formatSupervisionProjectAndWorkItem({ manualProjectName: "Công trình ngoài danh mục", manualWorkItemName: "Thép dầm trục A-D" }), "Công trình ngoài danh mục - Thép dầm trục A-D");
  assert.equal(formatSupervisionProjectAndWorkItem({ projectNameSnapshot: "Nhà điều hành", manualWorkItemName: "Khu vực mái" }), "Nhà điều hành - Khu vực mái");
  assert.equal(formatSupervisionProjectAndWorkItem({ manualText: "Dữ liệu lịch sử chỉ có display text" }), "Dữ liệu lịch sử chỉ có display text");
  assert.equal(hasMeaningfulSupervisionProject({ manualProjectName: "Công trình nhập tay" }), true);
  assert.equal(hasMeaningfulSupervisionProject({ manualWorkItemName: "Chỉ có hạng mục" }), false);
});
