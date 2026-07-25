import { describe, expect, it } from "vitest";
import { getWeeklyWorkflowTarget } from "./workflow";

describe("supervision weekly workflow", () => {
  it("allows only the defined status transitions", () => {
    expect(getWeeklyWorkflowTarget("DRAFT", "SUBMIT")).toBe("SUBMITTED");
    expect(getWeeklyWorkflowTarget("REVISION_REQUIRED", "SUBMIT")).toBe("SUBMITTED");
    expect(getWeeklyWorkflowTarget("SUBMITTED", "APPROVE")).toBe("APPROVED");
    expect(getWeeklyWorkflowTarget("APPROVED", "LOCK")).toBe("LOCKED");
  });

  it("rejects stale or duplicate transitions", () => {
    expect(getWeeklyWorkflowTarget("SUBMITTED", "SUBMIT")).toBeNull();
    expect(getWeeklyWorkflowTarget("DRAFT", "APPROVE")).toBeNull();
    expect(getWeeklyWorkflowTarget("LOCKED", "REQUEST_REVISION")).toBeNull();
  });
});
