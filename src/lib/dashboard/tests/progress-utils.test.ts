import { describe, expect, it } from "vitest";
import { getProgressHealth, getProjectProgressStatus, PROJECT_PROGRESS_STATUS_POLICY } from "../progress-utils";

describe("project progress status policy", () => {
  it("distinguishes a meaningful lead from on-track progress", () => {
    expect(getProjectProgressStatus(74, 70)).toBe("AHEAD");
    expect(getProjectProgressStatus(71, 70)).toBe("ON_TRACK");
    expect(PROJECT_PROGRESS_STATUS_POLICY.aheadVariancePercent).toBe(2);
  });

  it("keeps the existing health buckets compatible with portfolio counts", () => {
    expect(getProgressHealth(74, 70)).toBe("ON_TRACK");
    expect(getProgressHealth(65, 70)).toBe("AT_RISK");
    expect(getProgressHealth(55, 70)).toBe("DELAYED");
    expect(getProgressHealth(null, 70)).toBe("NO_DATA");
  });
});
