import { describe, it, expect } from "vitest";
import { parseLocalizedNumber, parseSupervisionQuantityInput, calculateSupervisionVariance } from "./quantity";

describe("parseLocalizedNumber", () => {
  it("should parse simple integers", () => {
    expect(parseLocalizedNumber("120")).toBe(120);
    expect(parseLocalizedNumber("-5")).toBe(-5);
  });

  it("should parse decimals with comma", () => {
    expect(parseLocalizedNumber("120,5")).toBe(120.5);
    expect(parseLocalizedNumber("0,25")).toBe(0.25);
    expect(parseLocalizedNumber("-0,25")).toBe(-0.25);
  });

  it("should parse decimals with dot", () => {
    expect(parseLocalizedNumber("120.5")).toBe(120.5);
    expect(parseLocalizedNumber("0.25")).toBe(0.25);
  });

  it("should parse thousands separators correctly (Vietnamese layout)", () => {
    expect(parseLocalizedNumber("1.200,5")).toBe(1200.5);
    expect(parseLocalizedNumber("1.200")).toBe(1200); // 3 digits after dot -> grouping
    expect(parseLocalizedNumber("1.200.000")).toBe(1200000);
  });

  it("should parse thousands separators correctly (International layout)", () => {
    expect(parseLocalizedNumber("1,200.5")).toBe(1200.5);
    expect(parseLocalizedNumber("1,200")).toBe(1200); // 3 digits after comma -> grouping
    expect(parseLocalizedNumber("1,200,000")).toBe(1200000);
  });

  it("should not confuse 1,2 as 1200", () => {
    expect(parseLocalizedNumber("1,2")).toBe(1.2);
  });
});

describe("parseSupervisionQuantityInput", () => {
  it("should parse value and unit aliases", () => {
    expect(parseSupervisionQuantityInput("120 m3")).toMatchObject({ numericValue: 120, unitLabel: "m³" });
    expect(parseSupervisionQuantityInput("120m3")).toMatchObject({ numericValue: 120, unitLabel: "m³" });
    expect(parseSupervisionQuantityInput("120 m^3")).toMatchObject({ numericValue: 120, unitLabel: "m³" });
    expect(parseSupervisionQuantityInput("120 m³")).toMatchObject({ numericValue: 120, unitLabel: "m³" });
    expect(parseSupervisionQuantityInput("100 m2")).toMatchObject({ numericValue: 100, unitLabel: "m²" });
    expect(parseSupervisionQuantityInput("2 tan")).toMatchObject({ numericValue: 2, unitLabel: "tấn" });
    expect(parseSupervisionQuantityInput("1,5 tấn")).toMatchObject({ numericValue: 1.5, unitLabel: "tấn" });
    expect(parseSupervisionQuantityInput("1.200,5 m3")).toMatchObject({ numericValue: 1200.5, unitLabel: "m³" });
  });

  it("should fallback to text if parsing fails", () => {
    expect(parseSupervisionQuantityInput("khoảng 120")).toMatchObject({ mode: "TEXT", textValue: "khoảng 120" });
  });
});

describe("calculateSupervisionVariance", () => {
  it("should calculate difference if units match", () => {
    expect(calculateSupervisionVariance({ value: 123, unitCode: "CUBIC_METER" }, { value: 120, unitCode: "CUBIC_METER" })).toBe(-3);
    expect(calculateSupervisionVariance({ value: 100, unitCode: "SQUARE_METER" }, { value: 95, unitCode: "SQUARE_METER" })).toBe(-5);
    expect(calculateSupervisionVariance({ value: 2, unitCode: "TON" }, { value: 1.5, unitCode: "TON" })).toBe(-0.5);
  });

  it("should return null if units mismatch", () => {
    expect(calculateSupervisionVariance({ value: 50, unitCode: "SQUARE_METER" }, { value: 40, unitCode: "KILOGRAM" })).toBeNull();
  });
});
