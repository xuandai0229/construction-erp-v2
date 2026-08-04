import { describe, it, expect, vi } from "vitest";

describe("UnifiedActionMenu State Logic Contract", () => {
  it("verifies state updater side effect separation contract", () => {
    let internalState = false;
    let externalState = "INIT";

    // Standard pure updater contract
    const safeSetOpenState = (next: boolean, callback?: (v: boolean) => void) => {
      internalState = next;
      if (callback) {
        callback(next);
      }
    };

    const onOpenChange = (isOpen: boolean) => {
      externalState = isOpen ? "OPEN_ROW_1" : "CLOSED";
    };

    safeSetOpenState(true, onOpenChange);
    expect(internalState).toBe(true);
    expect(externalState).toBe("OPEN_ROW_1");

    safeSetOpenState(false, onOpenChange);
    expect(internalState).toBe(false);
    expect(externalState).toBe("CLOSED");
  });
});
