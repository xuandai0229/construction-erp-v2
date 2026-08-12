import assert from "node:assert/strict";
import { test } from "vitest";
import { computeReportStats } from "../reports/report-stats";

test("counts saved Field reports by operational issue state", () => {
  const stats = computeReportStats([
    { status: "DRAFT", issues: "", recommendations: "" },
    { status: "DRAFT", issues: "Thiếu vật tư", recommendations: "" },
    { status: "DRAFT", issues: "Khẩn cấp: dừng thi công", recommendations: "" },
  ]);

  assert.equal(stats.total, 3);
  assert.equal(stats.draft, 3);
  assert.equal(stats.issues, 2);
  assert.equal(stats.needsAction, 2);
  assert.equal(stats.urgent, 1);
  assert.equal(stats.pending, 0);
});

test("does not treat an explicit no-issue note as an issue", () => {
  const stats = computeReportStats([
    { status: "DRAFT", issues: "Không có", recommendations: "Theo dõi" },
    { status: "DRAFT", issues: "", lines: [{ issueNote: "Không có" }] },
  ]);

  assert.equal(stats.issues, 0);
  assert.equal(stats.needsAction, 0);
  assert.equal(stats.urgent, 0);
});
