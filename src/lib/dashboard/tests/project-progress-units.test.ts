import { describe, expect, it } from "vitest";
import { summarizeProjectProgressUnits } from "../project-progress-units";

describe("summarizeProjectProgressUnits", () => {
  it("allows raw totals only when every valid item uses one unit", () => {
    expect(summarizeProjectProgressUnits([
      { designQuantity: 100, unit: "m²" },
      { designQuantity: 25.5, unit: "m²" },
    ])).toEqual({ status: "SINGLE_UNIT", unit: "m²", distinctUnitCount: 1, units: ["m²"] });
  });

  it("marks mixed units instead of implying they can be summed", () => {
    const result = summarizeProjectProgressUnits([
      { designQuantity: 100, unit: "m²" },
      { designQuantity: 25, unit: "m³" },
    ]);

    expect(result.status).toBe("MIXED_UNITS");
    expect(result.unit).toBeNull();
    expect(result.units).toEqual(["m²", "m³"]);
  });

  it("marks a missing unit and ignores items without a valid design quantity", () => {
    expect(summarizeProjectProgressUnits([
      { designQuantity: 10, unit: null },
      { designQuantity: null, unit: "kg" },
      { designQuantity: 0, unit: "m" },
    ])).toMatchObject({ status: "MISSING_UNIT", unit: null, distinctUnitCount: 0 });
  });
});
