import assert from "node:assert/strict";
import test from "node:test";

import {
  formatProgressPercentDisplay,
  normalizeReportProgressLine,
} from "./report-progress-display";

test("weekly line falls back to before plus this week when cumulative snapshot is missing", () => {
  const line = normalizeReportProgressLine({
    reportType: "WEEKLY",
    designQuantity: 0,
    quantityBefore: 0,
    quantityToday: 80,
    quantityCumulative: 0,
    remainingQuantity: 0,
    progressPercent: 0,
  });

  assert.equal(line.quantityCumulative, 80);
  assert.equal(line.remainingQuantity, null);
  assert.equal(line.progressPercent, null);
});

test("zero design quantity displays percent as unavailable instead of zero percent", () => {
  assert.equal(formatProgressPercentDisplay(null), "—");
  assert.equal(formatProgressPercentDisplay(0), "0%");
  assert.equal(formatProgressPercentDisplay(12.5), "12,5%");
});
